// components/SidebarLayout.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    checkUser();
    
    // Check mobile screen size
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const checkUser = async () => {
    try {
      const supa = supabaseClient();
      const { data: { user } } = await supa.auth.getUser();
      setUser(user);
      
      // Hide sidebar on auth pages
      const isAuthPage = window.location.pathname.includes('/signin') || 
                        window.location.pathname.includes('/signup') ||
                        window.location.pathname.includes('/accept-invite');
      
      setShowSidebar(!!user && !isAuthPage);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!showSidebar || !user) {
    return <div className="w-full min-h-screen">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className={`${isMobile && isCollapsed ? 'hidden' : ''}`}>
        <Sidebar 
          isCollapsed={isCollapsed && !isMobile} 
          onToggleCollapse={toggleSidebar}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with Toggle Button */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle Button */}
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title={isCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              {isCollapsed || (isMobile && isCollapsed) ? (
                <Menu className="w-5 h-5 text-slate-600" />
              ) : (
                <X className="w-5 h-5 text-slate-600" />
              )}
            </button>
            
            {/* App Logo/Title (when sidebar is collapsed) */}
            {(isCollapsed || isMobile) && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-emerald-600 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-xs">P</span>
                </div>
                <span className="font-semibold text-slate-900">PulseNote</span>
              </div>
            )}
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.href = '/'}
              className="btn btn-primary btn-sm"
            >
              New Report
            </button>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto main-content">
          {children}
        </div>
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {isMobile && !isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </div>
  );
}
