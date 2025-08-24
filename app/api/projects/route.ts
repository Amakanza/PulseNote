// app/api/projects/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serve";

export async function GET() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supa.from("projects")
    .select("id,title,workspace_id,created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ projects: data });
}
