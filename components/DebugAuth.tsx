// components/DebugAuth.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

export default function DebugAuth() {
  const [status, setStatus] = useState('Checking...');
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      console.log('Testing Supabase connection...');
      
      // Test 1: Check if client initializes
      const supa = supabaseClient();
      console.log('Supabase client created:', supa);
      
      // Test 2: Check current user
      const { data: { user }, error } = await supa.auth.getUser();
      console.log('Auth check result:', { user, error });
      
      if (error) {
        setError(error.message);
        setStatus('Error checking auth');
      } else {
        setUser(user);
        setStatus(user ? 'User authenticated' : 'No user found');
      }
      
      // Test 3: Check environment variables
      console.log('Environment check:', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
      });
      
    } catch (err: any) {
      console.error('Connection test failed:', err);
      setError(err.message);
      setStatus('Connection failed');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-sm z-50">
      <h3 className="font-bold text-sm mb-2">Debug Info</h3>
      <div className="space-y-1 text-xs">
        <div><strong>Status:</strong> {status}</div>
        <div><strong>User:</strong> {user?.email || 'None'}</div>
        <div><strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}</div>
        <div><strong>Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}</div>
        {error && <div className="text-red-600"><strong>Error:</strong> {error}</div>}
      </div>
      <button 
        onClick={testConnection}
        className="mt-2 px-2 py-1 bg-blue-500 text-white text-xs rounded"
      >
        Retest
      </button>
    </div>
  );
}
