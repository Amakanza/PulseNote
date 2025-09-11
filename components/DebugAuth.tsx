// components/DebugAuthStatus.tsx - Temporary component to debug auth issues
"use client";

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

export default function DebugAuthStatus() {
  const [authState, setAuthState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supa = supabaseClient();
        console.log('Supabase client:', supa);
        
        // Check current session
        const { data: session, error: sessionError } = await supa.auth.getSession();
        console.log('Session:', session, 'Error:', sessionError);
        
        // Check current user
        const { data: { user }, error: userError } = await supa.auth.getUser();
        console.log('User:', user, 'Error:', userError);
        
        setAuthState({
          session: session?.session,
          user,
          sessionError,
          userError,
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
        });
      } catch (error) {
        console.error('Auth check failed:', error);
        setAuthState({ error: error.message });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const supa = supabaseClient();
    const { data: { subscription } } = supa.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      checkAuth();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div>Checking auth...</div>;

  return (
    <div className="fixed bottom-4 left-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-md z-50">
      <h3 className="font-bold text-sm mb-2">Auth Debug Info</h3>
      <div className="space-y-1 text-xs">
        <div><strong>Has URL:</strong> {authState?.hasUrl ? 'Yes' : 'No'}</div>
        <div><strong>Has Key:</strong> {authState?.hasKey ? 'Yes' : 'No'}</div>
        <div><strong>URL:</strong> {authState?.url || 'Missing'}</div>
        <div><strong>Session:</strong> {authState?.session ? 'Active' : 'None'}</div>
        <div><strong>User:</strong> {authState?.user?.email || 'None'}</div>
        {authState?.sessionError && (
          <div className="text-red-600"><strong>Session Error:</strong> {authState.sessionError.message}</div>
        )}
        {authState?.userError && (
          <div className="text-red-600"><strong>User Error:</strong> {authState.userError.message}</div>
        )}
        {authState?.error && (
          <div className="text-red-600"><strong>Error:</strong> {authState.error}</div>
        )}
      </div>
    </div>
  );
}
