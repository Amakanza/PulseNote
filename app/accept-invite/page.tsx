"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";

export default function AcceptInvitePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'processing'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No invite token provided');
      return;
    }
    handleInviteAcceptance();
  }, [token]);

  const handleInviteAcceptance = async () => {
    try {
      setStatus('processing');
      
      const supa = supabaseClient();
      const { data: { user } } = await supa.auth.getUser();
      
      if (!user) {
        const returnUrl = encodeURIComponent(window.location.href);
        router.push(`/signin?returnUrl=${returnUrl}`);
        return;
      }

      const response = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setStatus('success');
        setMessage(data.message || 'Successfully joined workspace!');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to accept invite');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'An error occurred');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Processing invite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            {status === 'success' ? (
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            ) : (
              <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            )}
            
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {status === 'success' ? 'Invite Accepted!' : 'Invite Error'}
            </h1>
            
            <p className="text-slate-600 mb-6">{message}</p>

            <div className="space-y-3">
              {status === 'success' && (
                <button
                  onClick={() => router.push('/workspaces')}
                  className="w-full btn btn-primary"
                >
                  Go to Workspaces
                </button>
              )}
              
              <button
                onClick={() => router.push('/workspaces')}
                className="w-full btn flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Workspaces
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
