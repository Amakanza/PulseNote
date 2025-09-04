// lib/dataRetention.ts
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { AuditLogger } from '@/lib/audit';
import { PrivacyLogger } from '@/lib/logging';

export class DataRetentionManager {
  static async purgeExpiredData(): Promise<void> {
    PrivacyLogger.info('Starting data retention purge');
    
    try {
      const workspaces = await this.getWorkspaceRetentionSettings();
      
      for (const workspace of workspaces) {
        await this.purgeWorkspaceData(workspace);
      }
      
      // Also purge expired invitations
      await this.purgeExpiredInvitations();
      
      // Clean up old sessions
      await this.purgeOldSessions();
      
      PrivacyLogger.info('Data retention purge completed');
    } catch (error) {
      PrivacyLogger.error('Data retention purge failed', error as Error);
      throw error;
    }
  }

  private static async purgeWorkspaceData(workspace: {
    id: string;
    retention_months: number;
  }): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - workspace.retention_months);

    try {
      // 1. Hard delete soft-deleted projects older than 30 days
      const softDeleteCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const { data: softDeletedProjects } = await supabaseAdmin
        .from('projects')
        .select('id, title')
        .eq('workspace_id', workspace.id)
        .not('deleted_at', 'is', null)
        .lt('deleted_at', softDeleteCutoff.toISOString());

      if (softDeletedProjects?.length) {
        const { error } = await supabaseAdmin
          .from('projects')
          .delete()
          .in('id', softDeletedProjects.map(p => p.id));

        if (error) throw error;

        await AuditLogger.log({
          actorUserId: 'system',
          workspaceId: workspace.id,
          action: 'data.purge_soft_deleted',
          targetType: 'document',
          targetId: 'bulk',
          ipAddress: 'system',
          userAgent: 'retention-service',
          metadata: { count: softDeletedProjects.length, type: 'soft_deleted' }
        });

        PrivacyLogger.info('Purged soft-deleted projects', {
          workspaceId: workspace.id,
          count: softDeletedProjects.length
        });
      }

      // 2. Soft delete projects older than retention period (unless archived)
      const { data: expiredProjects } = await supabaseAdmin
        .from('projects')
        .select('id, title')
        .eq('workspace_id', workspace.id)
        .is('deleted_at', null) // Not already deleted
        .lt('created_at', cutoffDate.toISOString())
        .neq('archived', true); // Don't delete archived projects

      if (expiredProjects?.length) {
        const now = new Date().toISOString();
        const { error } = await supabaseAdmin
          .from('projects')
          .update({ deleted_at: now })
          .in('id', expiredProjects.map(p => p.id));

        if (error) throw error;

        await AuditLogger.log({
          actorUserId: 'system',
          workspaceId: workspace.id,
          action: 'data.soft_delete_expired',
          targetType: 'document',
          targetId: 'bulk',
          ipAddress: 'system',
          userAgent: 'retention-service',
          metadata: { 
            count: expiredProjects.length,
            retention_months: workspace.retention_months,
            cutoff_date: cutoffDate.toISOString()
          }
        });

        PrivacyLogger.info('Soft-deleted expired projects', {
          workspaceId: workspace.id,
          count: expiredProjects.length,
          retentionMonths: workspace.retention_months
        });
      }

    } catch (error) {
      PrivacyLogger.error('Failed to purge workspace data', error as Error, {
        workspaceId: workspace.id
      });
      throw error;
    }
  }

  private static async purgeExpiredInvitations(): Promise<void> {
    try {
      const { data: expiredInvites } = await supabaseAdmin
        .from('workspace_invitations')
        .select('id, email, workspace_id')
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString());

      if (expiredInvites?.length) {
        const { error } = await supabaseAdmin
          .from('workspace_invitations')
          .update({ status: 'expired' })
          .in('id', expiredInvites.map(i => i.id));

        if (error) throw error;

        // Group by workspace for audit logging
        const byWorkspace = expiredInvites.reduce((acc, invite) => {
          if (!acc[invite.workspace_id]) acc[invite.workspace_id] = [];
          acc[invite.workspace_id].push(invite);
          return acc;
        }, {} as Record<string, typeof expiredInvites>);

        for (const [workspaceId, invites] of Object.entries(byWorkspace)) {
          await AuditLogger.log({
            actorUserId: 'system',
            workspaceId,
            action: 'invitation.expired',
            targetType: 'invitation',
            targetId: 'bulk',
            ipAddress: 'system',
            userAgent: 'retention-service',
            metadata: { count: invites.length }
          });
        }

        PrivacyLogger.info('Expired invitations updated', {
          count: expiredInvites.length
        });
      }
    } catch (error) {
      PrivacyLogger.error('Failed to purge expired invitations', error as Error);
    }
  }

  private static async purgeOldSessions(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days

      const { count } = await supabaseAdmin
        .from('user_sessions')
        .delete()
        .lt('last_active', cutoffDate.toISOString());

      if (count && count > 0) {
        PrivacyLogger.info('Purged old user sessions', { count });
      }
    } catch (error) {
      PrivacyLogger.error('Failed to purge old sessions', error as Error);
    }
  }

  private static async getWorkspaceRetentionSettings(): Promise<Array<{
    id: string;
    retention_months: number;
  }>> {
    const { data, error } = await supabaseAdmin
      .from('workspaces')
      .select('id, retention_months');

    if (error) {
      console.error('Failed to get workspace retention settings:', error);
      return [];
    }

    return (data || []).map(w => ({
      id: w.id,
      retention_months: w.retention_months || 12
    }));
  }

  // Manual purge for specific workspace (admin action)
  static async purgeWorkspaceNow(
    workspaceId: string, 
    actorUserId: string,
    options: {
      includeSoftDeleted?: boolean;
      includeArchived?: boolean;
      olderThanDays?: number;
    } = {}
  ): Promise<{ purgedCount: number }> {
    const cutoffDate = new Date();
    if (options.olderThanDays) {
      cutoffDate.setDate(cutoffDate.getDate() - options.olderThanDays);
    } else {
      cutoffDate.setMonth(cutoffDate.getMonth() - 12); // Default 12 months
    }

    let query = supabaseAdmin
      .from('projects')
      .select('id')
      .eq('workspace_id', workspaceId)
      .lt('created_at', cutoffDate.toISOString());

    if (!options.includeSoftDeleted) {
      query = query.is('deleted_at', null);
    }

    if (!options.includeArchived) {
      query = query.neq('archived', true);
    }

    const { data: projectsToPurge } = await query;

    if (projectsToPurge?.length) {
      const { error } = await supabaseAdmin
        .from('projects')
        .delete()
        .in('id', projectsToPurge.map(p => p.id));

      if (error) throw error;

      await AuditLogger.log({
        actorUserId,
        workspaceId,
        action: 'data.manual_purge',
        targetType: 'document',
        targetId: 'bulk',
        ipAddress: 'admin',
        userAgent: 'manual-purge',
        metadata: { 
          count: projectsToPurge.length,
          options,
          cutoff_date: cutoffDate.toISOString()
        }
      });

      return { purgedCount: projectsToPurge.length };
    }

    return { purgedCount: 0 };
  }
}

// Scheduled function (would be called by cron job or serverless function)
export async function scheduledPurge() {
  try {
    await DataRetentionManager.purgeExpiredData();
  } catch (error) {
    // Alert administrators
    console.error('Scheduled purge failed:', error);
    // In production, you'd send alerts via email, Slack, etc.
  }
}
