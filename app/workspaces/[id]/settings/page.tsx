"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Settings, 
  Users, 
  UserPlus, 
  Crown, 
  Shield, 
  Edit3, 
  Eye, 
  Trash2,
  AlertTriangle,
  Mail,
  Calendar,
  Building
} from "lucide-react";

type Workspace = {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
};

type WorkspaceMember = {
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  added_at: string;
  profile?: {
    full_name: string;
  };
};

type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

interface WorkspaceSettingsProps {
  params: { id: string };
}

export default function WorkspaceSettings({ params }: WorkspaceSettingsProps) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("viewer");
  const [inviting, setInviting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);
  
  const router = useRouter();
  const workspaceId = params.id;

  useEffect(() => {
    loadWorkspaceData();
  }, [workspaceId]);

  const loadWorkspaceData = async () => {
    try {
      const supa = supabaseClient();
      const { data: { user } } = await supa.auth.getUser();
      
      if (!user) {
        router.push('/signin');
        return;
      }

      // Load workspace details
      const { data: workspaceData, error: workspaceError } = await supa
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (workspaceError) throw workspaceError;

      // Load members first, then get profiles separately
      const { data: membersData, error: membersError } = await supa
        .from('workspace_memberships')
        .select('user_id, role, added_at')
        .eq('workspace_id', workspaceId)
        .order('added_at');

      if (membersError) throw membersError;

      // Get profiles for all members
      let membersWithProfiles: WorkspaceMember[] = membersData || [];
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id);
        const { data: profiles } = await supa
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        // Merge the data
        membersWithProfiles = membersData.map(member => ({
          ...member,
          profile: profiles?.find(p => p.id === member.user_id) 
            ? { full_name: profiles.find(p => p.id === member.user_id)!.full_name }
            : undefined
        }));
      }

      // Get current user's role
      const currentMember = membersWithProfiles.find(m => m.user_id === user.id);
      if (!currentMember) {
        router.push('/workspaces');
        return;
      }

      setWorkspace(workspaceData);
      setMembers(membersWithProfiles);
      setCurrentUserRole(currentMember.role);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canManageMembers = () => {
    return currentUserRole && ['owner', 'admin'].includes(currentUserRole);
  };

  const canDeleteWorkspace = () => {
    return currentUserRole === 'owner';
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    
    setInviting(true);
    setError(null);
    
    try {
      // First, try to find if user already exists by email
      const supa = supabaseClient();
      const { data: existingProfile } = await supa
        .from("profiles")
        .select("id")
        .eq("email", inviteEmail.trim().toLowerCase())
        .single();

      if (existingProfile) {
        // User exists - add them directly using our function
        const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            user_id: existingProfile.id,
            role: inviteRole 
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        await loadWorkspaceData();
        setShowInviteForm(false);
        setInviteEmail("");
        setInviteRole("viewer");
      } else {
        // User doesn't exist - send email invitation
        const response = await fetch('/api/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: workspaceId,
            email: inviteEmail.trim(),
            role: inviteRole
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        setShowInviteForm(false);
        setInviteEmail("");
        setInviteRole("viewer");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingMember(userId);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      await loadWorkspaceData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingMember(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setUpdatingMember(userId);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      await loadWorkspaceData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingMember(null);
    }
  };

  const handleDeleteWorkspace = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      router.push('/workspaces');
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'admin': return <Shield className="w-4 h-4 text-red-600" />;
      case 'editor': return <Edit3 className="w-4 h-4 text-blue-600" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-600" />;
      default: return <Eye className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const baseClasses = "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium";
    switch (role) {
      case 'owner': return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'admin': return `${baseClasses} bg-red-100 text-red-800`;
      case 'editor': return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'viewer': return `${baseClasses} bg-gray-100 text-gray-800`;
      default: return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading workspace settings...</div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Workspace not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="panel p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/workspaces')}
            className="btn p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-5 h-5 text-slate-600" />
              <h1 className="text-2xl font-bold text-slate-900">Workspace Settings</h1>
            </div>
            <p className="text-slate-600">{workspace.name}</p>
          </div>
        </div>
      </section>

      {/* Error Display */}
      {error && (
        <div className="panel p-4 bg-red-50 border-red-200">
          <p className="text-red-700 text-sm">{error}</p>
          <button 
            onClick={() => setError(null)} 
            className="text-red-600 hover:text-red-800 text-xs underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Workspace Details */}
      <section className="panel p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold">Workspace Details</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="label block mb-2">Workspace Name</label>
              <input
                type="text"
                value={workspace.name}
                disabled
                className="input w-full bg-gray-50"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-4 h-4" />
              <span>Created {new Date(workspace.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users className="w-4 h-4" />
              <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Members Management */}
      <section className="panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold">Members</h2>
          </div>
          {canManageMembers() && (
            <button
              onClick={() => setShowInviteForm(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </button>
          )}
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-emerald-900">Invite New Member</h3>
              <button
                onClick={() => setShowInviteForm(false)}
                className="text-emerald-600 hover:text-emerald-800"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Mail className="w-4 h-4" />
                </div>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="input flex-1 border border-slate-300 px-3 py-2 rounded-md"
                    disabled={inviting}
                    style={{ 
                    minWidth: '250px',
                    backgroundColor: 'white',
                    border: '1px solid #cbd5e1'
                    }}
                  />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="input"
                  disabled={inviting}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  {currentUserRole === 'owner' && <option value="admin">Admin</option>}
                </select>
                <button
                  onClick={handleInviteMember}
                  disabled={!inviteEmail.trim() || inviting}
                  className="btn btn-primary"
                >
                  {inviting ? 'Inviting...' : 'Invite'}
                </button>
              </div>
              <p className="text-xs text-emerald-600">
                An invitation email will be sent to this address. If they already have an account, they'll be added immediately.
              </p>
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.user_id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                  <span className="font-medium text-slate-600">
                    {member.profile?.full_name?.charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">
                    {member.profile?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-slate-500">
                    Added {new Date(member.added_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {canManageMembers() && member.role !== 'owner' ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.user_id, e.target.value as UserRole)}
                    disabled={updatingMember === member.user_id}
                    className="input text-sm"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    {currentUserRole === 'owner' && <option value="admin">Admin</option>}
                  </select>
                ) : (
                  <span className={getRoleBadge(member.role)}>
                    {getRoleIcon(member.role)}
                    {member.role}
                  </span>
                )}
                
                {canManageMembers() && member.role !== 'owner' && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    disabled={updatingMember === member.user_id}
                    className="btn btn-sm p-2 hover:bg-red-50 hover:text-red-600"
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Danger Zone */}
      {canDeleteWorkspace() && (
        <section className="panel p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-4 text-red-800">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Danger Zone</h2>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-red-700">
              Deleting this workspace is permanent and cannot be undone. All projects, reports, and member data will be lost.
            </p>
            
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Workspace
              </button>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-white border border-red-300 rounded-lg">
                <p className="text-sm text-red-800">
                  Are you sure? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteWorkspace}
                    disabled={deleting}
                    className="btn btn-sm bg-red-600 text-white hover:bg-red-700"
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
