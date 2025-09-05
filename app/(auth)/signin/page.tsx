"use client";
import { useState, Suspense } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSignIn() {
    if (!email || !password) {
      setMsg("Please enter both email and password");
      return;
    }

    setLoading(true);
    setMsg("");
    
    try {
      const supa = supabaseClient();
      
      const { data, error } = await supa.auth.signInWithPassword({ 
        email: email.trim().toLowerCase(), 
        password 
      });
      
      if (error) {
        const errorMessage = error.message?.toLowerCase() || '';
        
        if (errorMessage.includes('invalid login credentials') || 
            errorMessage.includes('invalid email or password')) {
          setMsg("Invalid email or password. Please check your credentials and try again.");
        } else if (errorMessage.includes('email not confirmed') || 
                   errorMessage.includes('confirm your email')) {
          setMsg("Please confirm your email address before signing in. Check your inbox for a confirmation link.");
        } else if (errorMessage.includes('too many requests') || 
                   errorMessage.includes('rate limit')) {
          setMsg("Too many sign in attempts. Please wait a few minutes before trying again.");
        } else if (errorMessage.includes('network') || 
                   errorMessage.includes('fetch')) {
          setMsg("Network error. Please check your internet connection and try again.");
        } else if (errorMessage.includes('timeout')) {
          setMsg("Request timed out. Please try again.");
        } else {
          setMsg(error.message || "Sign in failed. Please try again.");
        }
        return;
      }
      
      if (!data?.user) {
        setMsg("Sign in completed but user data is missing. Please try again.");
        return;
      }
      
      setMsg("Signed in successfully! Redirecting...");
      
      // Get the redirect URL from query params, or default to home
      const redirectTo = searchParams.get("redirectedFrom") || "/";
      
      // Small delay to show success message
      setTimeout(() => {
        router.push(redirectTo);
      }, 1000);
      
    } catch (err: any) {
      if (err?.message?.includes('fetch') || 
          err?.message?.includes('network')) {
        setMsg("Network error. Please check your internet connection and try again.");
      } else {
        setMsg("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSignIn();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-sky-50">
      <div className="panel p-8 max-w-md w-full mx-4 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Welcome to PulseNote</h1>
          <p className="text-slate-600 mt-2">Sign in to your account</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="label block mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="input w-full"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="label block mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input w-full"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button 
            className="btn btn-primary w-full py-3" 
            onClick={handleSignIn}
            disabled={loading || !email || !password}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          {msg && (
            <div className={`p-3 rounded-md text-sm text-center ${
              msg.includes("successfully") || msg.includes("Redirecting") 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {msg}
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-slate-600">
            No account yet?{" "}
            <a 
              href="/signup" 
              className="text-emerald-600 hover:text-emerald-700 hover:underline font-medium"
            >
              Sign up here
            </a>
          </p>
        </div>

        <div className="text-center">
          <p className="text-xs text-slate-500">
            Having trouble signing in? Contact support
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
