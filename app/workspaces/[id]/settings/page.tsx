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

  const canChangeRole = (targetRole: UserRole, memberRole: UserRole) => {
    if (currentUserRole === 'owner') return true;
    if (currentUserRole === 'admin') {
      return memberRole !== 'owner' && targetRole !== 'owner';
    }
    return false;
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
            <div cla
