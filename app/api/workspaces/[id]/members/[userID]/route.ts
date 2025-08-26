// app/api/workspaces/[id]/members/route.ts - Enhanced version
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serve";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email, role = 'viewer' } = await req.json();
    
    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!['owner', 'admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if current user has permission to add members
    const { data: currentUserMembership } = await supa
      .from("workspace_memberships")
      .select("role")
      .eq("workspace_id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!currentUserMembership) {
      return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 });
    }

    if (!['owner', 'admin'].includes(currentUserMembership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Admins cannot invite owners
    if (currentUserMembership.role === 'admin' && role === 'owner') {
      return NextResponse.json({ error: "Cannot invite owners" }, { status: 403 });
    }

    // For now, we'll assume the email corresponds to an existing user
    // In a production app, you'd want to implement a proper invitation system
    const { data: invitedUser } = await supa
      .from("profiles")
      .select("id")
      .eq("id", email) // This is simplified - you'd typically search by actual email
      .single();

    if (!invitedUser) {
      return NextResponse.json({ error: "User not found. They need to create an account first." }, { status: 404 });
    }

    // Check if user is already a member
    const { data: existingMembership } = await supa
      .from("workspace_memberships")
      .select("*")
      .eq("workspace_id", params.id)
      .eq("user_id", invitedUser.id)
      .single();

    if (existingMembership) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }

    // Add the user to the workspace
    const { error } = await supa
      .from("workspace_memberships")
      .insert({ 
        workspace_id: params.id, 
        user_id: invitedUser.id, 
        role 
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// app/api/workspaces/[id]/route.ts - Add DELETE method
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serve";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is a member
    const { data: membership } = await supa
      .from("workspace_memberships")
      .select("role")
      .eq("workspace_id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 });
    }

    // Get workspace details
    const { data: workspace, error } = await supa
      .from("workspaces")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ workspace, userRole: membership.role });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if current user is the owner
    const { data: membership } = await supa
      .from("workspace_memberships")
      .select("role")
      .eq("workspace_id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: "Only workspace owners can delete workspaces" }, { status: 403 });
    }

    // Delete workspace (cascading deletes will handle memberships, projects, etc.)
    const { error } = await supa
      .from("workspaces")
      .delete()
      .eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// app/api/workspaces/route.ts - Enhanced version
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
