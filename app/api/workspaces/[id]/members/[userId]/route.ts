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

    // Use the function instead of direct UPDATE
    const { data, error } = await supa.rpc('manage_workspace_membership', {
      p_workspace_id: params.id,
      p_target_user_id: params.userId,
      p_role: role,
      p_action: 'update'
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 });
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
    // Use the function instead of direct DELETE
    const { data, error } = await supa.rpc('manage_workspace_membership', {
      p_workspace_id: params.id,
      p_target_user_id: params.userId,
      p_role: '', // Not needed for delete
      p_action: 'delete'
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
