"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Plus, 
  Settings, 
  FileText, 
  Calendar,
  User,
  Crown,
  Shield,
  Edit3,
  Eye
} from "lucide-react";

type Workspace = {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
};

type Project = {
  id: string;
  workspace_id: string;
  title: string;
  created_by: string;
  created_at: string;
  creator_profile?: {
    full_name: string;
  };
};

type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

interface WorkspaceProjectsProps {
  params: { id: string };
}

export default function WorkspaceProjects({ params }: WorkspaceProjectsProps) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  
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

      // Check user's role in this workspace
      const { data: membershipData, error: membershipError } = await supa
        .from('workspace_memberships')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membershipData) {
        router.push('/workspaces');
        return;
      }

      // 1. Get projects first
      const { data: projectsData, error: projectsError } = await supa
        .from('projects')
        .select('id, workspace_id, title, created_by, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // 2. Get creator profiles separately if projects exist
      let projectsWithCreators = projectsData || [];
      if (projectsData && projectsData.length > 0) {
        const creatorIds = [...new Set(projectsData.map(p => p.created_by))];
        const { data: profiles } = await supa
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorIds);

        // 3. Merge the data
        projectsWithCreators = projectsData.map(project => ({
          ...project,
          creator_profile: profiles?.find(p => p.id === project.created_by)
        }));
      }

      setWorkspace(workspaceData);
      setCurrentUserRole(membershipData.role);
      setProjects(projectsWithCreators);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canCreateProjects = () => {
    return currentUserRole && ['owner', 'admin', 'editor'].includes(currentUserRole);
  };

  const canManageWorkspace = () => {
    return currentUserRole && ['owner', 'admin'].includes(currentUserRole);
  };

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) return;
    
    setCreating(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newProjectTitle.trim() })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      await loadWorkspaceData();
      setShowCreateForm(false);
      setNewProjectTitle("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
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
        <div className="text-slate-600">Loading workspace...</div>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/workspaces')}
              className="btn p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{workspace.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-slate-600">Projects</span>
                {currentUserRole && (
                  <span className={getRoleBadge(currentUserRole)}>
                    {getRoleIcon(currentUserRole)}
                    {currentUserRole}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {canCreateProjects() && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            )}
            {canManageWorkspace() && (
              <button
                onClick={() => router.push(`/workspaces/${workspaceId}/settings`)}
                className="btn flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            )}
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

      {/* Create Project Form */}
      {showCreateForm && (
        <section className="panel p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Create New Project</h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewProjectTitle("");
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ×
              </button>
            </div>
            
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Project title"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                className="input flex-1"
                disabled={creating}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              />
              <button
                onClick={handleCreateProject}
                disabled={!newProjectTitle.trim() || creating}
                className="btn btn-primary"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <section className="panel p-12 text-center">
          <div className="text-slate-400 mb-4">
            <FileText className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600">No projects yet</h3>
            <p className="text-sm text-slate-500 mt-2">
              {canCreateProjects() 
                ? "Create your first project to start organizing reports"
                : "Projects will appear here when team members create them"
              }
            </p>
          </div>
          {canCreateProjects() && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </button>
          )}
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="panel p-6 hover:shadow-md transition-shadow">
              <div className="space-y-4">
                {/* Project Header */}
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg truncate">
                    {project.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                    <User className="w-4 h-4" />
                    <span>{project.creator_profile?.full_name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Project Actions */}
                <div className="pt-2 border-t border-slate-200">
                  <button
                    onClick={() => router.push(`/workspaces/${workspaceId}/projects/${project.id}`)}
                    className="btn w-full text-sm"
                  >
                    Open Project
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Workspace Info */}
      <section className="panel p-6 bg-gradient-to-r from-emerald-50 to-sky-50">
        <div className="text-center">
          <h3 className="font-medium text-slate-900 mb-2">Workspace Overview</h3>
          <div className="flex justify-center gap-6 text-sm text-slate-600">
            <div>
              <span className="font-medium">{projects.length}</span>
              <span className="ml-1">Project{projects.length !== 1 ? 's' : ''}</span>
            </div>
            <div>
              <span className="font-medium">Team</span>
              <span className="ml-1">Collaboration</span>
            </div>
            <div>
              <span className="font-medium">Your Role:</span>
              <span className="ml-1 capitalize">{currentUserRole}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
