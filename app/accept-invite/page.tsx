"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

// Component that uses useSearchParams - wrapped in Suspense
function AcceptInviteContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const acceptInvite = async () => {
      try {
        const token = searchParams.get('token');
        
        if (!token) {
          setStatus('error');
          setMessage('Invalid invitation link - no token provided');
          return;
        }

        // Check if user is authenticated
        const supa = supabaseClient();
        const { data: { user } } = await supa.auth.getUser();

        if (!user) {
          // Redirect to signin with the current URL as redirect target
          const currentUrl = window.location.href;
          router.push(`/signin?redirectedFrom=${encodeURIComponent(currentUrl)}`);
          return;
        }

        // Accept the invitation
        const response = await fetch('/api/invite/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (data.ok) {
          setStatus('success');
          setMessage(data.message || 'Successfully joined the workspace!');
          
          // Redirect to workspaces after a delay
          setTimeout(() => {
            router.push('/workspaces');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to accept invitation');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'An unexpected error occurred');
      }
    };

    acceptInvite();
  }, [searchParams, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-sky-50">
        <div className="panel p-8 max-w-md w-full mx-4 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Processing Invitation</h1>
          <p className="text-slate-600">Please wait while we process your invitation...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-sky-50">
        <div className="panel p-8 max-w-md w-full mx-4 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Welcome to the Team!</h1>
          <p className="text-slate-600 mb-6">{message}</p>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/workspaces')}
              className="btn btn-primary w-full"
            >
              Go to Workspaces
            </button>
            <button
              onClick={() => router.push('/')}
              className="btn w-full"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-sky-50">
      <div className="panel p-8 max-w-md w-full mx-4 text-center">
        <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Invitation Error</h1>
        <p className="text-slate-600 mb-6">{message}</p>
        
        <div className="space-y-3">
          <button
            onClick={() => router.push('/workspaces')}
            className="btn btn-primary w-full"
          >
            Go to Workspaces
          </button>
          <button
            onClick={() => router.push('/signin')}
            className="btn w-full"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }
}

// Loading fallback for Suspense
function AcceptInviteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-sky-50">
      <div className="panel p-8 max-w-md w-full mx-4 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Loading</h1>
        <p className="text-slate-600">Preparing invitation...</p>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<AcceptInviteLoading />}>
      <AcceptInviteContent />
    </Suspense>
  );
}
