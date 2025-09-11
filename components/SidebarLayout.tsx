// components/SidebarLayout.tsx - Public sidebar accessible to everyone
"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import Sidebar from './Sidebar';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const pathname = usePathname();

  // Check for mobile on mount and resize
  useEffect(() => {
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

  // Check user authentication
  useEffect(() => {
    const checkUser = async () => {
      try {
        const supa = supabaseClient();
        const { data: { user }, error } = await supa.auth.getUser();
        
        setUser(user);
      } catch (error) {
        console.error('Error checking user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth state changes
    const supa = supabaseClient();
    const { data: { subscription } } = supa.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        checkUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Always show sidebar layout - no authentication required
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className={`${isMobile && isCollapsed ? 'hidden' : ''}`}>
        <Sidebar 
          isCollapsed={isCollapsed} 
          onToggleCollapse={toggleSidebar}
          user={user}
          loading={loading}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        {isMobile && (
          <div className="bg-white border-b border-slate-200 p-4 flex md:hidden">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">P</span>
                </div>
                <span className="font-semibold text-slate-900">PulseNote</span>
              </div>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 hover:bg-slate-100 rounded-lg"
                type="button"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto main-content">
          {children}
        </div>
      </div>
      
      {/* Mobile Overlay */}
      {isMobile && !isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </div>
  );
}
