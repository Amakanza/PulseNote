"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { User, LogOut, Settings } from "lucide-react";

export default function UserMenu() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const supa = supabaseClient();
      const { data: { user } } = await supa.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  const handleSignOut = async () => {
    const supa = supabaseClient();
    await supa.auth.signOut();
    router.push('/');
  };

  if (loading) return <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse"></div>;

  if (!user) {
    return (
      <div className="flex items-center gap-4">
        <a href="/signin" className="hover:text-slate-900">Sign In</a>
        <a href="/signup" className="hover:text-slate-900">Sign Up</a>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100"
      >
        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-emerald-700" />
        </div>
        <span className="text-sm font-medium text-slate-700">
          {user.email?.split('@')[0]}
        </span>
      </button>

      {showMenu && (
        <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
          <div className="px-3 py-2 text-xs text-slate-500 border-b">
            {user.email}
          </div>
          <button
            onClick={() => router.push('/workspaces')}
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
          >
            My Workspaces
          </button>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
