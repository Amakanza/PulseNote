// app/api/workspaces/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serve";

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data:{ user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  const { data, error } = await supa.from("workspaces").insert({ name, created_by: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Make creator owner
  await supa.from("workspace_memberships").insert({ workspace_id: data.id, user_id: user.id, role: "owner" });
  return NextResponse.json({ workspace: data });
}
