"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CreateWorkspaceButton() {
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      alert("Please sign in first.");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("workspaces")
      .insert({ name: "My Team" });
    if (error) alert(error.message);
    else alert("Workspace created!");
    setLoading(false);
  };

  return (
    <button onClick={handleCreate} disabled={loading} className="btn">
      {loading ? "Creating..." : "Create Workspace"}
    </button>
  );
}
