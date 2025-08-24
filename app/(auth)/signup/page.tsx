"use client";
import { useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function handleSignUp() {
    const supa = supabaseClient();
    const { error } = await supa.auth.signUp({ email, password });
    setMsg(error ? error.message : "Check your email to confirm your account!");
  }

  return (
    <div className="panel p-6 max-w-sm mx-auto space-y-3">
      <h1 className="text-xl font-semibold">Sign up for PulseNote</h1>
      <input
        className="input"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="input"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="btn btn-primary" onClick={handleSignUp}>
        Sign up
      </button>
      <p className="small">{msg}</p>
    </div>
  );
}
