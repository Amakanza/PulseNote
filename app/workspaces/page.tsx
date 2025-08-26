"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, Settings, Users, FileText, Crown, Shield, Edit3, Eye } from "lucide-react";

type WorkspaceRow = {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
};

type MembershipRow = {
  workspace_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  added_at: string;
  // Supabase may return the relation as an array; handle both.
  workspace: WorkspaceRow | WorkspaceRow[] | null;
};

type WorkspaceMembership = {
  workspace_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  added_at: string;
  workspace: {
    id: string;
    name: string;
    created_at: string;
    created_by: string;
  };
};

type CreateWorkspaceForm = {
  name: string;
};

export default function WorkspacesPage() {
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateWorkspaceForm>({ name: "" });
  const router = useRouter();

  useEffect(() => {
    loadWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadWorkspaces = async () => {
    try {
      const supa = supabaseClient();
      const { data: { user } } = await supa.auth.getUser();

      if (!user) {
        router.push('/signin?redirectedFrom=/workspaces');
        return;
      }

      // Keep this select simple; we'll normalize the relation shape below.
      const { data, error } = await supa
        .from('workspace_memberships')
        .select(`
          workspace_id,
          role,
          added_at,
          workspace:workspaces (
            id, name, created_at, created_by
          )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false })
        .returns<MembershipRow[]>();

      if (error) throw error;

      const normalized: WorkspaceMembership[] = (data ?? [])
        .map((row) => {
          const ws = Array.isArray(row.workspace) ? row.workspace[0] : row.workspace;
          if (!ws) return null;
          return {
            workspace_id: row.workspace_id,
            role: row.role,
            added_at: row.added_at,
            workspace: {
              id: ws.id,
              name: ws.name,
              created_at: ws.created_at,
              created_by: ws.created_by,
            },
          };
        })
        .filter((x): x is WorkspaceMembership => Boolean(x));

      setMemberships(normalized);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!createForm.name.trim()) return;

    setCreating(true);
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createForm.name.trim() })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      await loadWorkspaces();
      setShowCreateForm(false);
      setCreateForm({ name: "" });
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

  const canManageWorkspace = (role: string) => {
    return ['owner', 'admin'].includes(role);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading workspaces...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Workspaces</h1>
            <p className="text-slate-600 mt-1">
              Collaborate with your team on reports and projects
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Workspace
          </button>
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

      {/* Create Workspace Form */}
      {showCreateForm && (
        <section className="panel p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Create New Workspace</h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateForm({ name: "" });
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Workspace name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ name: e.target.value })}
                className="input flex-1"
                disabled={creating}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
              />
              <button
                onClick={handleCreateWorkspace}
                disabled={!createForm.name.trim() || creating}
                className="btn btn-primary"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Workspaces Grid */}
      {memberships.length === 0 ? (
        <section className="panel p-12 text-center">
          <div className="text-slate-400 mb-4">
            <Users className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600">No workspaces yet</h3>
            <p className="text-sm text-slate-500 mt-2">
              Create your first workspace to start collaborating with your team
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Workspace
          </button>
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memberships.map((membership) => (
            <div key={membership.workspace_id} className="panel p-6 hover:shadow-md transition-shadow">
              <div className="space-y-4">
                {/* Workspace Header */}
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900 text-lg truncate">
                      {membership.workspace.name}
                    </h3>
                    <span className={getRoleBadge(membership.role)}>
                      {getRoleIcon(membership.role)}
                      {membership.role}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    Created {new Date(membership.workspace.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Workspace Stats */}
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>Team</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>Projects</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => router.push(`/workspaces/${membership.workspace_id}/projects`)}
                    className="btn flex-1 text-sm"
                  >
                    Open
                  </button>
                  {canManageWorkspace(membership.role) && (
                    <button
                      onClick={() => router.push(`/workspaces/${membership.workspace_id}/settings`)}
                      className="btn text-sm p-2"
                      title="Workspace settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Quick Actions */}
      <section className="panel p-6 bg-gradient-to-r from-emerald-50 to-sky-50">
        <div className="text-center">
          <h3 className="font-medium text-slate-900 mb-2">Need help getting started?</h3>
        <p className="text-sm text-slate-600 mb-4">
            Workspaces help you organize your team's reports and collaborate more effectively
          </p>
          <div className="flex justify-center gap-3">
            <button className="btn btn-sm">
              View Guide
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary btn-sm"
            >
              Create First Workspace
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
