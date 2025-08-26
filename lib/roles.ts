// lib/roles.ts
export type Role = "owner" | "admin" | "editor" | "viewer";

export interface Permission {
  can_invite_members: boolean;
  can_access_billing: boolean;
  can_delete_workspace: boolean;
  can_edit_content: boolean;
  can_manage_projects: boolean;
  can_view_analytics: boolean;
  can_export_reports: boolean;
  can_manage_templates: boolean;
}

// Base permissions by role
export const ROLE_PERMISSIONS: Record<Role, Permission> = {
  owner: {
    can_invite_members: true,
    can_access_billing: true,
    can_delete_workspace: true,
    can_edit_content: true,
    can_manage_projects: true,
    can_view_analytics: true,
    can_export_reports: true,
    can_manage_templates: true,
  },
  admin: {
    can_invite_members: true,
    can_access_billing: false, // Only owners can access billing
    can_delete_workspace: false, // Only owners can delete workspace
    can_edit_content: true,
    can_manage_projects: true,
    can_view_analytics: true,
    can_export_reports: true,
    can_manage_templates: true,
  },
  editor: {
    can_invite_members: false, // Only owners and admins can invite
    can_access_billing: false,
    can_delete_workspace: false,
    can_edit_content: true,
    can_manage_projects: true,
    can_view_analytics: false,
    can_export_reports: true,
    can_manage_templates: false,
  },
  viewer: {
    can_invite_members: false,
    can_access_billing: false,
    can_delete_workspace: false,
    can_edit_content: false, // Viewers can only view
    can_manage_projects: false,
    can_view_analytics: false,
    can_export_reports: false,
    can_manage_templates: false,
  },
};

// Permission override type for manual adjustments
export interface PermissionOverride {
  [key: string]: boolean;
}

// Helper functions
export const hasPermission = (
  role: Role, 
  permission: keyof Permission, 
  overrides?: PermissionOverride
): boolean => {
  // Check overrides first
  if (overrides && overrides[permission] !== undefined) {
    return overrides[permission];
  }
  
  // Fall back to role-based permissions
  return ROLE_PERMISSIONS[role][permission];
};

export const canEdit = (role: Role, overrides?: PermissionOverride) => 
  hasPermission(role, 'can_edit_content', overrides);

export const isAdmin = (role: Role) => ["owner", "admin"].includes(role);

export const canInviteMembers = (role: Role, overrides?: PermissionOverride) =>
  hasPermission(role, 'can_invite_members', overrides);

export const canManageWorkspace = (role: Role) => ["owner", "admin"].includes(role);

// For new signups - they become owners of their own workspace
export const getDefaultRoleForNewUser = (): Role => "owner";

// For invites - default to editor unless specified
export const getDefaultRoleForInvite = (): Role => "editor";

// Check if user can perform action on another user
export const canManageUser = (currentRole: Role, targetRole: Role): boolean => {
  if (currentRole === "owner") return true;
  if (currentRole === "admin") return targetRole !== "owner";
  return false;
};

// Get available roles a user can assign
export const getAssignableRoles = (currentRole: Role): Role[] => {
  switch (currentRole) {
    case "owner":
      return ["admin", "editor", "viewer"];
    case "admin":
      return ["editor", "viewer"];
    default:
      return [];
  }
};

// Role hierarchy for display
export const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

export const getRoleLevel = (role: Role): number => ROLE_HIERARCHY[role];

// Permission descriptions for UI
export const PERMISSION_DESCRIPTIONS: Record<keyof Permission, string> = {
  can_invite_members: "Invite new members to workspace",
  can_access_billing: "Access billing and subscription settings",
  can_delete_workspace: "Delete entire workspace",
  can_edit_content: "Create and edit reports/projects",
  can_manage_projects: "Create, edit, and delete projects",
  can_view_analytics: "View workspace analytics and insights",
  can_export_reports: "Export reports in various formats",
  can_manage_templates: "Create and edit report templates",
};

// Role descriptions for UI
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Full access to everything including billing and workspace deletion",
  admin: "Can manage members and content, but cannot access billing or delete workspace", 
  editor: "Can create and edit content, but cannot invite members or access admin settings",
  viewer: "Can only view content, cannot edit or create anything",
};
