import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createServerClient } from "@supabase/ssr"; // or your auth helper

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { workspaceId, email, role = "viewer" } = await req.json();
  const lower = email.toLowerCase();

  // 1) Is this user already in profiles?
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", lower)
    .maybeSingle();

  if (profile?.id) {
    // Add membership immediately
    const { error: insErr } = await supabaseAdmin
      .from("workspace_memberships")
      .insert({ workspace_id: workspaceId, user_id: profile.id, role });
    if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
    return NextResponse.json({ ok: true, immediate: true });
  }

  // 2) Create invite token
  const { data: tokenData, error: tokenErr } = await supabaseAdmin.rpc(
    "create_workspace_invite",
    { p_workspace: workspaceId, p_email: lower, p_role: role }
  );
  if (tokenErr) return NextResponse.json({ ok: false, error: tokenErr.message }, { status: 400 });

  const token = tokenData as string;

  // 3) Generate Supabase "invite" link and email it
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email: lower,
    options: {
      // user will sign up (or sign in) then be redirected here
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/accept-invite?token=${token}`
    }
  });

  if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, immediate: false });
}
