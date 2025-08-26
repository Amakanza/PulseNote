// hooks/usePermissions.ts
import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { Role, hasPermission, Permission, PermissionOverride } from '@/lib/roles';

interface UserPermissions {
  role: Role | null;
  permissions: Partial<Permission>;
  overrides?: PermissionOverride;
  loading: boolean;
  error: string | null;
}

export const useWorkspacePermissions = (workspaceId: string): UserPermissions => {
  const [state, setState] = useState<UserPermissions>({
    role: null,
    permissions: {},
    overrides: undefined,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const supa = supabaseClient();
        const { data: { user } } = await supa.auth.getUser();
        
        if (!user) {
          setState(prev => ({ ...prev, loading: false, error: 'Not authenticated' }));
          return;
        }

        // Get user's role in this workspace
        const { data: membership, error } = await supa
          .from('workspace_memberships')
          .select('role, permissions_override')
          .eq('workspace_id', workspaceId)
          .eq('user_id', user.id)
          .single();

        if (error) {
          setState(prev => ({ ...prev, loading: false, error: error.message }));
          return;
        }

        if (!membership) {
          setState(prev => ({ ...prev, loading: false, error: 'Not a member of this workspace' }));
          return;
        }

        const role = membership.role as Role;
        const overrides = membership.permissions_override as PermissionOverride | undefined;

        // Calculate actual permissions
        const permissions: Partial<Permission> = {
          can_invite_members: hasPermission(role, 'can_invite_members', overrides),
          can_access_billing: hasPermission(role, 'can_access_billing', overrides),
          can_delete_workspace: hasPermission(role, 'can_delete_workspace', overrides),
          can_edit_content: hasPermission(role, 'can_edit_content', overrides),
          can_manage_projects: hasPermission(role, 'can_manage_projects', overrides),
          can_view_analytics: hasPermission(role, 'can_view_analytics', overrides),
          can_export_reports: hasPermission(role, 'can_export_reports', overrides),
          can_manage_templates: hasPermission(role, 'can_manage_templates', overrides),
        };

        setState({
          role,
          permissions,
          overrides,
          loading: false,
          error: null,
        });

      } catch (err: any) {
        setState(prev => ({ ...prev, loading: false, error: err.message }));
      }
    };

    if (workspaceId) {
      fetchPermissions();
    }
  }, [workspaceId]);

  return state;
};

// Global permissions for users (outside of workspaces)
export const useGlobalPermissions = () => {
  const [state, setState] = useState<UserPermissions>({
    role: null,
    permissions: {},
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchGlobalPermissions = async () => {
      try {
        const supa = supabaseClient();
        const { data: { user } } = await supa.auth.getUser();
        
        if (!user) {
          setState(prev => ({ ...prev, loading: false, error: 'Not authenticated' }));
          return;
        }

        // For now, all authenticated users are "owners" of their own data
        // You can extend this later with a global roles table
        const role: Role = 'owner';
        
        const permissions: Partial<Permission> = {
          can_invite_members: hasPermission(role, 'can_invite_members'),
          can_access_billing: hasPermission(role, 'can_access_billing'),
          can_delete_workspace: hasPermission(role, 'can_delete_workspace'),
          can_edit_content: hasPermission(role, 'can_edit_content'),
          can_manage_projects: hasPermission(role, 'can_manage_projects'),
          can_view_analytics: hasPermission(role, 'can_view_analytics'),
          can_export_reports: hasPermission(role, 'can_export_reports'),
          can_manage_templates: hasPermission(role, 'can_manage_templates'),
        };

        setState({
          role,
          permissions,
          loading: false,
          error: null,
        });

      } catch (err: any) {
        setState(prev => ({ ...prev, loading: false, error: err.message }));
      }
    };

    fetchGlobalPermissions();
  }, []);

  return state;
};
