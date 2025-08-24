// app/api/workspaces/[id]/members/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serve";

export async function POST(req: Request, { params }: { params: { id: string }}) {
  const supa = supabaseServer();
  const { user_id, role } = await req.json(); // user_id is auth.users.id of colleague
  const { error } = await supa.from("workspace_memberships")
    .insert({ workspace_id: params.id, user_id, role });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
