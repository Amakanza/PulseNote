// app/reports/[id]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { FileText, Download, Edit, Share, Calendar, User, Building } from 'lucide-react';
import dynamic from 'next/dynamic';

const ReportEditor = dynamic(() => import('@/components/ReportEditor'), { ssr: false });

interface Report {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  workspace_id: string;
  created_by: string;
  workspace?: {
    name: string;
  };
  creator?: {
    full_name: string;
  };
}

export default function ReportViewerPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;

  useEffect(() => {
    if (reportId) {
      loadReport();
    }
  }, [reportId]);

  const loadReport = async () => {
    try {
      const supa = supabaseClient();
      const { data: { user } } = await supa.auth.getUser();
      
      if (!user) {
        router.push('/signin');
        return;
      }

      const { data, error } = await supa
        .from('projects')
        .select(`
          *,
          workspace:workspaces(name),
          creator:profiles(full_name)
        `)
        .eq('id', reportId)
        .single();

      if (error) throw error;
      
      if (!data) {
        setError('Report not found');
        return;
      }

      setReport(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!report) return;
    
    setSaving(true);
    try {
      // Get the current content from session storage (where ReportEditor saves it)
      const currentContent = sessionStorage.getItem("report:html") || report.content;
      
      const supa = supabaseClient();
      const { error } = await supa
        .from('projects')
        .update({ 
          content: currentContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', report.id);

      if (error) throw error;

      setReport({ ...report, content: currentContent, updated_at: new Date().toISOString() });
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!report?.content) return;

    try {
      const response = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          html: report.content, 
          filename: report.title || 'Report'
        })
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title || 'Report'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-600">Loading report...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <FileText className="w-16 h-16 text-slate-400 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Report Not Found</h2>
        <p className="text-slate-600 mb-4">{error || 'This report may have been deleted or you may not have access to it.'}</p>
        <button 
          onClick={() => router.push('/')}
          className="btn btn-primary"
        >
          Create New Report
        </button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="h-screen flex flex-col">
        <div className="border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-slate-900">{report.title}</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="btn"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <ReportEditor 
            initialHTML={report.content || ''} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{report.title}</h1>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <Building className="w-4 h-4" />
                  <span>{report.workspace?.name || 'Personal'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{report.creator?.full_name || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Created {formatDate(report.created_at)}</span>
                </div>
                {report.updated_at && report.updated_at !== report.created_at && (
                  <div className="flex items-center gap-1">
                    <span>• Updated {formatDate(report.updated_at)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="btn flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDownload}
                className="btn flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => {
                  navigator.share && navigator.share({
                    title: report.title,
                    url: window.location.href
                  });
                }}
                className="btn flex items-center gap-2"
              >
                <Share className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div 
            className="prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: report.content || '<p>No content available</p>' }}
          />
        </div>
      </div>
    </div>
  );
}
