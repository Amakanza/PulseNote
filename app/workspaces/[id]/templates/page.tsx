// app/workspaces/[id]/templates/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { 
  FileText, 
  Plus, 
  Download, 
  Trash2, 
  Calendar,
  User,
  ArrowLeft,
  Upload
} from "lucide-react";
import TemplateUpload from "@/components/TemplateUpload";
import { TemplateForm } from "@/components/TemplateUpload";

interface Template {
  id: string;
  name: string;
  placeholders: string[];
  created_at: string;
  created_by: string;
  creator?: {
    full_name: string;
  };
}

interface WorkspaceTemplatesProps {
  params: { id: string };
}

export default function WorkspaceTemplates({ params }: WorkspaceTemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  
  const router = useRouter();
  const workspaceId = params.id;

  useEffect(() => {
    loadTemplates();
  }, [workspaceId]);

  const loadTemplates = async () => {
    try {
      const supa = supabaseClient();
      const { data: { user } } = await supa.auth.getUser();
      
      if (!user) {
        router.push('/signin');
        return;
      }

      // Check user role in workspace
      const { data: membership } = await supa
        .from('workspace_memberships')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        router.push('/workspaces');
        return;
      }

      setCurrentUserRole(membership.role);

      // Load templates - Fixed the query to properly join with profiles
      const { data: templatesData, error: templatesError } = await supa
        .from('templates')
        .select(`
          id,
          name,
          placeholders,
          created_at,
          created_by,
          profiles!templates_created_by_fkey(full_name)
        `)
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;

      // Transform the data to match our Template interface
      const transformedTemplates = (templatesData || []).map(template => ({
        id: template.id,
        name: template.name,
        placeholders: template.placeholders,
        created_at: template.created_at,
        created_by: template.created_by,
        creator: template.profiles ? { full_name: template.profiles.full_name } : undefined
      }));

      setTemplates(transformedTemplates);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (newTemplate: Template) => {
    setTemplates(prev => [newTemplate, ...prev]);
    setShowUpload(false);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const supa = supabaseClient();
      
      const { error } = await supa
        .from('templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const canManageTemplates = () => {
    return currentUserRole && ['owner', 'admin', 'editor'].includes(currentUserRole);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading templates...</div>
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
              onClick={() => router.push(`/workspaces/${workspaceId}/projects`)}
              className="btn p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Document Templates</h1>
              <p className="text-slate-600 mt-1">
                Upload Word templates and generate documents with custom data
              </p>
            </div>
          </div>
          
          {canManageTemplates() && (
            <button
              onClick={() => setShowUpload(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Upload Template
            </button>
          )}
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

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Upload New Template</h2>
                <button
                  onClick={() => setShowUpload(false)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  ×
                </button>
              </div>
              
              <TemplateUpload 
                workspaceId={workspaceId}
                onUploadComplete={handleUploadComplete}
              />
            </div>
          </div>
        </div>
      )}

      {/* Template Form Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Generate Document</h2>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  ×
                </button>
              </div>
              
              <TemplateForm 
                template={selectedTemplate}
                onGenerate={() => setSelectedTemplate(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <section className="panel p-12 text-center">
          <div className="text-slate-400 mb-4">
            <FileText className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600">No templates yet</h3>
            <p className="text-sm text-slate-500 mt-2">
              {canManageTemplates() 
                ? "Upload your first Word document template to get started"
                : "Templates will appear here when team members upload them"
              }
            </p>
          </div>
          {canManageTemplates() && (
            <button
              onClick={() => setShowUpload(true)}
              className="btn btn-primary"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload First Template
            </button>
          )}
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="panel p-6 hover:shadow-md transition-shadow">
              <div className="space-y-4">
                {/* Template Header */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    {canManageTemplates() && (
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-1 hover:bg-red-50 hover:text-red-600 rounded"
                        title="Delete template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-slate-900 text-lg truncate">
                    {template.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                    <User className="w-4 h-4" />
                    <span>{template.creator?.full_name || 'Unknown'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(template.created_at)}</span>
                  </div>
                </div>

                {/* Placeholders Info */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-slate-700 mb-2">
                    Placeholders ({template.placeholders.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {template.placeholders.slice(0, 3).map((placeholder) => (
                      <span 
                        key={placeholder}
                        className="inline-block px-2 py-1 bg-white rounded text-xs text-slate-600 border"
                      >
                        {placeholder}
                      </span>
                    ))}
                    {template.placeholders.length > 3 && (
                      <span className="inline-block px-2 py-1 bg-white rounded text-xs text-slate-500 border">
                        +{template.placeholders.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-200">
                  <button
                    onClick={() => setSelectedTemplate(template)}
                    className="btn w-full text-sm flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Generate Document
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Quick Guide */}
      <section className="panel p-6 bg-gradient-to-r from-blue-50 to-emerald-50">
        <div className="text-center">
          <h3 className="font-medium text-slate-900 mb-2">How to Use Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
            <div>
              <div className="font-medium mb-1">1. Create Template</div>
              <div>Design your document in Word with placeholders like {'{patient_name}'}</div>
            </div>
            <div>
              <div className="font-medium mb-1">2. Upload Template</div>
              <div>Upload your .docx file and we&apos;ll detect placeholders automatically</div>
            </div>
            <div>
              <div className="font-medium mb-1">3. Generate Documents</div>
              <div>Fill in the data fields and download personalized documents</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
