import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // Get the current user to use as invited_by
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (k) => cookieStore.get(k)?.value } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const { workspaceId, email, role = "viewer" } = await req.json();
    
    if (!workspaceId || !email) {
      return NextResponse.json({ ok: false, error: "Missing workspaceId or email" }, { status: 400 });
    }

    const lower = email.toLowerCase();

    // 1) Is this user already in profiles?
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", lower)
      .maybeSingle();

    if (profile?.id) {
      // Add membership immediately using raw SQL for proper type casting
      const { error: insErr } = await supabaseAdmin.rpc('add_workspace_member', {
        p_workspace_id: workspaceId,
        p_user_id: profile.id,
        p_role: role
      });
      if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
      return NextResponse.json({ ok: true, immediate: true });
    }

    // 2) Create invite token - now including invited_by (using v2 function)
    const { data: tokenData, error: tokenErr } = await supabaseAdmin.rpc(
      "create_workspace_invite_v2",
      { 
        p_workspace: workspaceId, 
        p_email: lower, 
        p_role: role,
        p_invited_by: user.id  // Add the missing invited_by parameter
      }
    );
    
    if (tokenErr) {
      console.error("Error creating workspace invite:", tokenErr);
      return NextResponse.json({ ok: false, error: tokenErr.message }, { status: 400 });
    }

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
  } catch (error: any) {
    console.error("Invite error:", error);
    return NextResponse.json({ ok: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
