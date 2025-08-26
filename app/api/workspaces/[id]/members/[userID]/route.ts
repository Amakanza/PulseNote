// app/api/workspaces/[id]/members/[userId]/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serve";

// Update member role
export async function PATCH(
  req: Request, 
  { params }: { params: { id: string; userId: string } }
) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { role } = await req.json();
    
    if (!role || !['owner', 'admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if current user has permission to change roles
    const { data: currentUserMembership } = await supa
      .from("workspace_memberships")
      .select("role")
      .eq("workspace_id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!currentUserMembership) {
      return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 });
    }

    // Only owners and admins can change roles
    if (!['owner', 'admin'].includes(currentUserMembership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Admins cannot promote to owner or modify other owners
    if (currentUserMembership.role === 'admin') {
      const { data: targetMember } = await supa
        .from("workspace_memberships")
        .select("role")
        .eq("workspace_id", params.id)
        .eq("user_id", params.userId)
        .single();

      if (targetMember?.role === 'owner' || role === 'owner') {
        return NextResponse.json({ error: "Cannot modify owner roles" }, { status: 403 });
      }
    }

    // Update the member's role
    const { error } = await supa
      .from("workspace_memberships")
      .update({ role })
      .eq("workspace_id", params.id)
      .eq("user_id", params.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Remove member from workspace
export async function DELETE(
  req: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if current user has permission to remove members
    const { data: currentUserMembership } = await supa
      .from("workspace_memberships")
      .select("role")
      .eq("workspace_id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!currentUserMembership) {
      return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 });
    }

    // Only owners and admins can remove members
    if (!['owner', 'admin'].includes(currentUserMembership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Check target member's role
    const { data: targetMember } = await supa
      .from("workspace_memberships")
      .select("role")
      .eq("workspace_id", params.id)
      .eq("user_id", params.userId)
      .single();

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Cannot remove owners, admins cannot remove other admins
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: "Cannot remove workspace owner" }, { status: 403 });
    }

    if (currentUserMembership.role === 'admin' && targetMember.role === 'admin') {
      return NextResponse.json({ error: "Cannot remove other admins" }, { status: 403 });
    }

    // Remove the member
    const { error } = await supa
      .from("workspace_memberships")
      .delete()
      .eq("workspace_id", params.id)
      .eq("user_id", params.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
