import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serve";

// GET /api/workspaces -> list my memberships + workspace details
export async function GET() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supa
    .from("workspace_memberships")
    .select(`
      workspace_id,
      role,
      added_at,
      workspace:workspaces(id, name, created_at, created_by)
    `)
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ memberships: data });
}

// POST /api/workspaces -> create a new workspace (trigger makes you OWNER)
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
  }

  // created_by defaults to auth.uid() via SQL; trigger inserts OWNER membership
  const { data, error } = await supa
    .from("workspaces")
    .insert({ name: name.trim() })
    .select("id, name, created_at, created_by")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ workspace: data });
}
