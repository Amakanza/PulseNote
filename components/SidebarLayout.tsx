// components/SidebarLayout.tsx - Debug version
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
  const [showSidebar, setShowSidebar] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const pathname = usePathname();

  useEffect(() => {
    checkUser();
  }, [pathname]);

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

  const checkUser = async () => {
    try {
      console.log('🔍 Checking user authentication...');
      console.log('📍 Current pathname:', pathname);
      
      const supa = supabaseClient();
      const { data: { user }, error } = await supa.auth.getUser();
      
      console.log('👤 User data:', user);
      console.log('❌ Auth error:', error);
      
      setUser(user);
      
      const authPages = ['/signin', '/signup', '/accept-invite'];
      const isAuthPage = authPages.some(page => pathname.startsWith(page));
      
      console.log('🚪 Is auth page:', isAuthPage);
      console.log('✅ Should show sidebar:', !!user && !isAuthPage);
      
      setShowSidebar(!!user && !isAuthPage);
    } catch (error) {
      console.error('💥 Error checking user:', error);
      setUser(null);
      setShowSidebar(false);
    } finally {
      setLoading(false);
      console.log('✅ User check complete');
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  console.log('🎨 Render state:', {
    loading,
    showSidebar,
    user: !!user,
    pathname,
    isCollapsed,
    isMobile
  });

  if (loading) {
    return (
      <div className="flex h-screen">
        <div className="w-64 bg-gray-100 animate-pulse flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
        <div className="flex-1 bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">Loading content...</div>
        </div>
      </div>
    );
  }

  if (!showSidebar) {
    console.log('🚫 Not showing sidebar - rendering full width');
    return <div className="w-full h-screen">{children}</div>;
  }

  console.log('✅ Showing sidebar layout');

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Debug Info */}
      <div className="fixed top-4 left-4 z-50 bg-black text-white p-2 rounded text-xs">
        User: {user?.email || 'None'} | Sidebar: {showSidebar ? 'On' : 'Off'}
      </div>
      
      {/* Sidebar */}
      <div className={`${isMobile && isCollapsed ? 'hidden' : ''}`}>
        <Sidebar 
          isCollapsed={isCollapsed} 
          onToggleCollapse={toggleSidebar}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
        
        <div className="flex-1 overflow-auto main-content">
          {children}
        </div>
      </div>
      
      {isMobile && !isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </div>
  );
}
