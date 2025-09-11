// components/Sidebar.tsx - Public sidebar with auth buttons
"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { 
  Home, 
  FileText, 
  FolderOpen, 
  Users, 
  Settings, 
  Plus,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  LogIn,
  UserPlus,
  Menu
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  user: any;
  loading: boolean;
}

interface Report {
  id: string;
  title: string;
  created_at: string;
  workspace_name?: string;
}

export default function Sidebar({ isCollapsed, onToggleCollapse, user, loading }: SidebarProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user) {
      loadReports();
    } else {
      setReports([]);
    }
  }, [user]);

  const loadReports = async () => {
    if (!user) return;
    
    try {
      const supa = supabaseClient();
      const { data: reportsData } = await supa
        .from('projects')
        .select(`
          id,
          title,
          created_at,
          workspace:workspaces(name)
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (reportsData) {
        const formattedReports = reportsData.map(report => ({
          id: report.id,
          title: report.title,
          created_at: report.created_at,
          workspace_name: (report.workspace as any)?.name || 'Personal'
        }));
        setReports(formattedReports);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const handleSignOut = async () => {
    const supa = supabaseClient();
    await supa.auth.signOut();
    router.push('/');
  };

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const truncateTitle = (title: string, maxLength: number = 25) => {
    return title.length > maxLength ? `${title.substring(0, maxLength)}...` : title;
  };

  const getUserInitials = (email: string) => {
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase() + (name.charAt(1) || '').toUpperCase();
  };

  return (
    <div className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } h-full`}>
      {/* Header with Toggle and Auth */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-semibold text-slate-900">PulseNote</span>
          </div>
        )}
        
        {/* Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>

      {/* Auth Section - Only show when collapsed or for signed out users */}
      {(!user && !loading) && (
        <div className="p-2 border-b border-slate-200">
          {isCollapsed ? (
            <div className="space-y-2">
              <button
                onClick={() => router.push('/signin')}
                className="w-full p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Sign In"
              >
                <LogIn className="w-4 h-4 text-slate-600 mx-auto" />
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="w-full p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Sign Up"
              >
                <UserPlus className="w-4 h-4 text-slate-600 mx-auto" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => router.push('/signin')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 border border-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Sign Up
              </button>
            </div>
          )}
        </div>
      )}

      {/* User Info - Show when signed in */}
      {user && !isCollapsed && (
        <div className="p-4 border-b border-slate-200 bg-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {getUserInitials(user.email)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto sidebar-scrollbar">
        <nav className="p-2 space-y-1">
          {/* Main Navigation */}
          <div className={`${isCollapsed ? '' : 'mb-4'}`}>
            {!isCollapsed && (
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3 py-2">
                Main
              </div>
            )}
            
            <button
              onClick={() => router.push('/')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive('/') 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title={isCollapsed ? 'Home' : ''}
            >
              <Home className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span>Create Report</span>}
            </button>

            <button
              onClick={() => router.push('/report')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive('/report') 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title={isCollapsed ? 'Editor' : ''}
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span>Report Editor</span>}
            </button>

            {user && (
              <button
                onClick={() => router.push('/workspaces')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive('/workspaces') 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title={isCollapsed ? 'Workspaces' : ''}
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && <span>Workspaces</span>}
              </button>
            )}

            {/* Auth items for signed out users */}
            {!user && !loading && (
              <>
                <button
                  onClick={() => router.push('/signin')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive('/signin') 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title={isCollapsed ? 'Sign In' : ''}
                >
                  <LogIn className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && <span>Sign In</span>}
                </button>

                <button
                  onClick={() => router.push('/signup')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive('/signup') 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title={isCollapsed ? 'Sign Up' : ''}
                >
                  <UserPlus className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && <span>Sign Up</span>}
                </button>
              </>
            )}
          </div>

          {/* Recent Reports - Only for signed in users */}
          {user && !isCollapsed && reports.length > 0 && (
            <div className="mt-6">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3 py-2">
                Recent Reports
              </div>
              <div className="space-y-1">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => router.push(`/report/${report.id}`)}
                    className="w-full flex items-start gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors group"
                    title={report.title}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium truncate">
                        {truncateTitle(report.title)}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <FolderOpen className="w-3 h-3" />
                        {report.workspace_name}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(report.created_at)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {/* View All Reports */}
              <button
                onClick={() => router.push('/reports')}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 text-xs text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                <FolderOpen className="w-3 h-3" />
                View All Reports
              </button>
            </div>
          )}

          {/* Quick Actions - Only for signed in users */}
          {user && !isCollapsed && (
            <div className="mt-6">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3 py-2">
                Quick Actions
              </div>
              <button
                onClick={() => router.push('/')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <Plus className="w-4 h-4 flex-shrink-0" />
                New Report
              </button>
            </div>
          )}
        </nav>
      </div>

      {/* User Menu - Only for signed in users */}
      {user && (
        <div className="border-t border-slate-200 p-2">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
              title={isCollapsed ? user.email : ''}
            >
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-3 h-3 text-emerald-700" />
              </div>
              {!isCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium truncate">
                    {user.email?.split('@')[0] || 'User'}
                  </div>
                  <div className="text-xs text-slate-500">
                    Account Settings
                  </div>
                </div>
              )}
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className={`absolute bottom-full mb-2 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 ${
                isCollapsed ? 'left-16 w-48' : 'left-0 right-0'
              }`}>
                <div className="px-3 py-2 text-xs text-slate-500 border-b">
                  {user.email}
                </div>
                <button
                  onClick={() => {
                    router.push('/settings');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={() => {
                    handleSignOut();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collapsed state user menu overlay */}
      {isCollapsed && showUserMenu && (
        <div 
          className="fixed inset-0 z-30"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
}
