// app/api/workspaces/[id]/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serve";

// Get workspace details
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is a member of this workspace
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
    const { data: workspace, error: workspaceError } = await supa
      .from("workspaces")
      .select("*")
      .eq("id", params.id)
      .single();

    if (workspaceError) {
      return NextResponse.json({ error: workspaceError.message }, { status: 400 });
    }

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Get member count
    const { count: memberCount } = await supa
      .from("workspace_memberships")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", params.id);

    // Get project count
    const { count: projectCount } = await supa
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", params.id);

    return NextResponse.json({ 
      workspace: {
        ...workspace,
        member_count: memberCount || 0,
        project_count: projectCount || 0
      },
      userRole: membership.role 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Update workspace details
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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

    // Check if current user has permission to update workspace
    const { data: membership } = await supa
      .from("workspace_memberships")
      .select("role")
      .eq("workspace_id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions to update workspace" }, { status: 403 });
    }

    // Update workspace
    const { data: workspace, error } = await supa
      .from("workspaces")
      .update({ name: name.trim() })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ workspace });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete workspace
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
      return NextResponse.json({ 
        error: "Only workspace owners can delete workspaces" 
      }, { status: 403 });
    }

    // Get workspace details first (for logging/audit purposes)
    const { data: workspace } = await supa
      .from("workspaces")
      .select("name, created_at")
      .eq("id", params.id)
      .single();

    // Delete workspace - this will cascade delete:
    // - workspace_memberships (due to ON DELETE CASCADE)
    // - projects (due to ON DELETE CASCADE)
    // - reports (via projects cascade)
    // - templates (due to ON DELETE CASCADE)
    const { error: deleteError } = await supa
      .from("workspaces")
      .delete()
      .eq("id", params.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    // Log the deletion (optional - for audit trail)
    console.log(`Workspace deleted: ${workspace?.name} (${params.id}) by user ${user.id}`);

    return NextResponse.json({ 
      success: true,
      message: `Workspace "${workspace?.name}" has been deleted`
    });
  } catch (error: any) {
    console.error("Error deleting workspace:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
