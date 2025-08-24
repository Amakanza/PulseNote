"use client";
import { useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";

export default function SignIn() {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [msg,setMsg]=useState("");
  async function handle() {
    const supa = supabaseClient();
    const { error } = await supa.auth.signInWithPassword({ email, password });
    setMsg(error ? error.message : "Signed in, redirecting...");
    if (!error) window.location.href = "/";
  }
  return (
    <div className="panel p-6 max-w-sm mx-auto space-y-3">
      <h1 className="text-xl font-semibold">Sign in to PulseNote</h1>
      <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button className="btn btn-primary" onClick={handle}>Sign in</button>
      <p className="small">{msg}</p>
    <div className="text-center">
        <a href="/signup" className="text-sm text-emerald-600 hover:underline">
          Don't have an account? Sign up
        </a>
</div>
    </div>
  );
}
