// app/api/workspaces/[id]/members/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serve";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { user_id, role = 'viewer' } = await req.json();
    
    if (!user_id || !user_id.trim()) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (!['owner', 'admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Use the function instead of direct INSERT
    const { data, error } = await supa.rpc('manage_workspace_membership', {
      p_workspace_id: params.id,
      p_target_user_id: user_id,
      p_role: role,
      p_action: 'insert'
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
