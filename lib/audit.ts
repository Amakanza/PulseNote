// lib/audit.ts
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

export interface AuditLogEntry {
  id?: string;
  actorUserId: string;
  workspaceId: string;
  action: string;
  targetType: 'document' | 'user' | 'workspace' | 'membership' | 'invitation';
  targetId: string;
  oldValueHash?: string;
  newValueHash?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

export class AuditLogger {
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      const auditEntry = {
        ...entry,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      };

      // Store in database
      const { error } = await supabaseAdmin
        .from('audit_logs')
        .insert(auditEntry);

      if (error) {
        console.error('Failed to log audit entry:', error);
      }

      // Also log for real-time monitoring (without PII)
      console.log(`[AUDIT] ${entry.action} by ${AuditLogger.hashUserId(entry.actorUserId)} on ${entry.targetType}:${entry.targetId} in workspace ${entry.workspaceId}`);
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  static async getWorkspaceAuditLogs(
    workspaceId: string, 
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select(`
        *,
        actor:auth.users!audit_logs_actor_user_id_fkey(email)
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }

    return data || [];
  }

  static hashValue(value: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(value))
      .digest('hex')
      .substring(0, 16);
  }

  static hashUserId(userId: string): string {
    return crypto
      .createHash('sha256')
      .update(userId)
      .digest('hex')
      .substring(0, 8);
  }

  // Helper methods for common audit actions
  static async logWorkspaceChange(
    actorUserId: string,
    workspaceId: string,
    action: string,
    oldData?: any,
    newData?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.log({
      actorUserId,
      workspaceId,
      action: `workspace.${action}`,
      targetType: 'workspace',
      targetId: workspaceId,
      oldValueHash: oldData ? this.hashValue(oldData) : undefined,
      newValueHash: newData ? this.hashValue(newData) : undefined,
      ipAddress,
      userAgent
    });
  }

  static async logMembershipChange(
    actorUserId: string,
    workspaceId: string,
    targetUserId: string,
    action: string,
    oldRole?: string,
    newRole?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.log({
      actorUserId,
      workspaceId,
      action: `membership.${action}`,
      targetType: 'membership',
      targetId: targetUserId,
      oldValueHash: oldRole ? this.hashValue({ role: oldRole }) : undefined,
      newValueHash: newRole ? this.hashValue({ role: newRole }) : undefined,
      ipAddress,
      userAgent,
      metadata: { oldRole, newRole }
    });
  }

  static async logProjectChange(
    actorUserId: string,
    workspaceId: string,
    projectId: string,
    action: string,
    oldData?: any,
    newData?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.log({
      actorUserId,
      workspaceId,
      action: `project.${action}`,
      targetType: 'document',
      targetId: projectId,
      oldValueHash: oldData ? this.hashValue(oldData) : undefined,
      newValueHash: newData ? this.hashValue(newData) : undefined,
      ipAddress,
      userAgent
    });
  }
}
