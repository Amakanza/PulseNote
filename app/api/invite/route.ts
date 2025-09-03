// app/api/invite/route.ts - Fixed version with email
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

// Simple email function using Supabase's built-in email (if configured)
async function sendInviteEmail({
  email,
  inviterName,
  workspaceName,
  role,
  inviteUrl
}: {
  email: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteUrl: string;
}) {
  // For now, we'll use Supabase's auth invite with custom redirect
  // This requires your Supabase project to have email configured
  try {
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteUrl,
      data: {
        workspace_name: workspaceName,
        inviter_name: inviterName,
        role: role
      }
    });

    if (error) {
      console.error("Supabase email invite error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
}

export async function POST(req: Request) {
  try {
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

    // Validate role enum
    const validRoles = ['owner', 'admin', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ ok: false, error: "Invalid role" }, { status: 400 });
    }

    const lower = email.toLowerCase();

    // 1) Check if user already exists
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", lower)
      .maybeSingle();

    if (profile?.id) {
      // User exists - check if already in workspace
      const { data: existingMembership } = await supabaseAdmin
        .from("workspace_memberships")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", profile.id)
        .maybeSingle();

      if (existingMembership) {
        return NextResponse.json({ ok: false, error: "User is already a member of this workspace" }, { status: 400 });
      }

      // Add membership immediately with proper enum casting
      const { error: insErr } = await supabaseAdmin
        .rpc('sql', {
          query: `
            INSERT INTO workspace_memberships (workspace_id, user_id, role) 
            VALUES ($1, $2, $3::user_role)
          `,
          params: [workspaceId, profile.id, role]
        });
      
      if (insErr) {
        console.error("Error adding existing user to workspace:", insErr);
        return NextResponse.json({ ok: false, error: "Failed to add user to workspace" }, { status: 400 });
      }
      
      return NextResponse.json({ 
        ok: true, 
        immediate: true,
        message: `${lower} has been added to the workspace as ${role}`
      });
    }

    // 2) User doesn't exist - create invite token
    const { data: tokenData, error: tokenErr } = await supabaseAdmin.rpc(
      "create_workspace_invite_v2",
      { 
        p_workspace: workspaceId, 
        p_email: lower, 
        p_role: role,
        p_invited_by: user.id
      }
    );
    
    if (tokenErr) {
      console.error("Error creating workspace invite:", tokenErr);
      return NextResponse.json({ ok: false, error: tokenErr.message }, { status: 400 });
    }

    const token = tokenData as string;

    // 3) Get workspace and inviter details
    const { data: workspace } = await supabaseAdmin
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .single();

    const { data: inviterProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/accept-invite?token=${token}`;
    
    // 4) Send email
    const emailSent = await sendInviteEmail({
      email: lower,
      inviterName: inviterProfile?.full_name || user.email || 'Someone',
      workspaceName: workspace?.name || 'Workspace',
      role: role,
      inviteUrl: inviteUrl
    });

    if (!emailSent) {
      // Log details for manual sending
      console.log("=== MANUAL INVITE (Email Failed) ===");
      console.log(`To: ${lower}`);
      console.log(`From: ${inviterProfile?.full_name || user.email}`);
      console.log(`Workspace: ${workspace?.name}`);
      console.log(`Role: ${role}`);
      console.log(`Invite URL: ${inviteUrl}`);
      console.log("===================================");

      return NextResponse.json({ 
        ok: true, 
        immediate: false,
        message: `Invitation created but email failed to send. Please share this link manually: ${inviteUrl}`,
        inviteUrl: inviteUrl
      });
    }

    return NextResponse.json({ 
      ok: true, 
      immediate: false,
      message: `Invitation sent to ${lower}`
    });

  } catch (error: any) {
    console.error("Invite error:", error);
    return NextResponse.json({ ok: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
