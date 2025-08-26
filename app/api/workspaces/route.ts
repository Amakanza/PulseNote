// app/api/workspaces/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serve";

export async function GET() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get user's workspace memberships with workspace details
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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ memberships: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
    }

    // Create workspace
    const { data: workspace, error: workspaceError } = await supa
      .from("workspaces")
      .insert({ name: name.trim(), created_by: user.id })
      .select()
      .single();

    if (workspaceError) {
      return NextResponse.json({ error: workspaceError.message }, { status: 400 });
    }

    // Make creator the owner
    const { error: membershipError } = await supa
      .from("workspace_memberships")
      .insert({ 
        workspace_id: workspace.id, 
        user_id: user.id, 
        role: "owner" 
      });

    if (membershipError) {
      // If membership creation fails, clean up the workspace
      await supa.from("workspaces").delete().eq("id", workspace.id);
      return NextResponse.json({ error: membershipError.message }, { status: 400 });
    }

    return NextResponse.json({ workspace });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
