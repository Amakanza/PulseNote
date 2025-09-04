// components/Sidebar.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { 
  Plus, 
  Search, 
  FileText, 
  Calendar, 
  User, 
  MoreHorizontal,
  Trash2,
  Edit2,
  Archive,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut
} from 'lucide-react';

interface Report {
  id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  workspace_id: string;
  workspace_name?: string;
  preview?: string;
}

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    loadUser();
    loadReports();
  }, []);

  const loadUser = async () => {
    const supa = supabaseClient();
    const { data: { user } } = await supa.auth.getUser();
    setUser(user);
  };

  const loadReports = async () => {
    try {
      const supa = supabaseClient();
      const { data: { user } } = await supa.auth.getUser();
      
      if (!user) return;

      // Get user's projects (reports) with workspace info
      const { data: projects, error } = await supa
        .from('projects')
        .select(`
          id,
          title,
          created_at,
          updated_at,
          workspace_id,
          workspace:workspaces(name),
          content
        `)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const reportsData: Report[] = (projects || []).map(project => ({
        id: project.id,
        title: project.title || 'Untitled Report',
        created_at: project.created_at,
        updated_at: project.updated_at,
        workspace_id: project.workspace_id,
        workspace_name: project.workspace?.name || 'Personal',
        preview: extractPreview(project.content)
      }));

      setReports(reportsData);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractPreview = (content: any): string => {
    if (!content) return '';
    
    // If content is HTML, extract text
    if (typeof content === 'string') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      return tempDiv.textContent?.slice(0, 100) || '';
    }
    
    // If content is JSON, extract meaningful text
    if (typeof content === 'object') {
      const text = Object.values(content).join(' ');
      return text.slice(0, 100);
    }
    
    return '';
  };

  const filteredReports = reports.filter(report => 
    report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.workspace_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewReport = () => {
    router.push('/');
  };

  const handleReportClick = (reportId: string) => {
    setSelectedReport(reportId);
    router.push(`/reports/${reportId}`);
  };

  const handleDeleteReport = async (reportId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const supa = supabaseClient();
      const { error } = await supa
        .from('projects')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      setReports(reports.filter(r => r.id !== reportId));
      setShowDropdown(null);
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };

  const handleRenameReport = async (reportId: string, newTitle: string) => {
    try {
      const supa = supabaseClient();
      const { error } = await supa
        .from('projects')
        .update({ title: newTitle, updated_at: new Date().toISOString() })
        .eq('id', reportId);

      if (error) throw error;

      setReports(reports.map(r => 
        r.id === reportId ? { ...r, title: newTitle } : r
      ));
    } catch (error) {
      console.error('Error renaming report:', error);
    }
  };

  const handleSignOut = async () => {
    const supa = supabaseClient();
    await supa.auth.signOut();
    router.push('/signin');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-16 h-screen bg-slate-900 text-white flex flex-col items-center py-4 border-r border-slate-700">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-slate-800 rounded-lg mb-4"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        
        <button
          onClick={handleNewReport}
          className="p-2 hover:bg-slate-800 rounded-lg mb-4"
          title="New Report"
        >
          <Plus className="w-5 h-5" />
        </button>
        
        <div className="flex-1" />
        
        {user && (
          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-sm font-medium">
            {user.email?.[0]?.toUpperCase()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-80 h-screen bg-slate-900 text-white flex flex-col border-r border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <span className="font-semibold">PulseNote</span>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-slate-800 rounded"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
        
        <button
          onClick={handleNewReport}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
        >
          <Plus className="w-4 h-4" />
          New Report
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-700">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 text-white pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Reports List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-slate-400">
            Loading reports...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-4 text-center text-slate-400">
            {searchQuery ? 'No reports found' : 'No reports yet'}
          </div>
        ) : (
          <div className="py-2">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                onClick={() => handleReportClick(report.id)}
                className={`group mx-2 mb-1 p-3 rounded-lg cursor-pointer transition-colors relative ${
                  selectedReport === report.id || pathname.includes(report.id)
                    ? 'bg-slate-700' 
                    : 'hover:bg-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <h3 className="font-medium text-sm truncate text-white">
                        {report.title}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <span>{report.workspace_name}</span>
                      <span>•</span>
                      <span>{formatDate(report.updated_at || report.created_at)}</span>
                    </div>
                    
                    {report.preview && (
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {report.preview}
                      </p>
                    )}
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDropdown(showDropdown === report.id ? null : report.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-600 rounded transition-opacity"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    
                    {showDropdown === report.id && (
                      <div className="absolute right-0 top-8 bg-slate-800 border border-slate-600 rounded-lg shadow-lg py-1 z-10 min-w-32">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newTitle = prompt('New title:', report.title);
                            if (newTitle && newTitle !== report.title) {
                              handleRenameReport(report.id, newTitle);
                            }
                            setShowDropdown(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-slate-700 flex items-center gap-2 text-sm"
                        >
                          <Edit2 className="w-3 h-3" />
                          Rename
                        </button>
                        <button
                          onClick={(e) => handleDeleteReport(report.id, e)}
                          className="w-full text-left px-3 py-1 hover:bg-slate-700 flex items-center gap-2 text-sm text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-slate-700">
        <div className="space-y-2">
          <button
            onClick={() => router.push('/workspaces')}
            className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-lg flex items-center gap-3 text-sm"
          >
            <User className="w-4 h-4" />
            Workspaces
          </button>
          
          <button
            onClick={() => router.push('/settings')}
            className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-lg flex items-center gap-3 text-sm"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          
          {user && (
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-xs">
                  {user.email?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm text-slate-300 truncate">
                  {user.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1 hover:bg-slate-800 rounded"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
