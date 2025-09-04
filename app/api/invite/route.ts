// app/api/invite/route.ts - Enhanced with audit logging and rate limiting
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { withRateLimit } from "@/lib/rateLimit";
import { AuditLogger } from "@/lib/audit";
import { PrivacyLogger } from "@/lib/logging";

export const runtime = "nodejs";

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
  const startTime = Date.now();
  
  return withRateLimit(req, 'invite', async () => {
    try {
      const cookieStore = cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (k) => cookieStore.get(k)?.value } }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        PrivacyLogger.logRequest(req, startTime, 401);
        return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
      }

      const { workspaceId, email, role = "viewer" } = await req.json();
      
      if (!workspaceId || !email) {
        PrivacyLogger.logRequest(req, startTime, 400);
        return NextResponse.json({ ok: false, error: "Missing workspaceId or email" }, { status: 400 });
      }

      // Validate role enum
      const validRoles = ['owner', 'admin', 'editor', 'viewer'];
      if (!validRoles.includes(role)) {
        PrivacyLogger.logRequest(req, startTime, 400);
        return NextResponse.json({ ok: false, error: "Invalid role" }, { status: 400 });
      }

      const lower = email.toLowerCase();
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';

      // Check if user has permission to invite
      const { data: membership } = await supabaseAdmin
        .from("workspace_memberships")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .single();

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        await AuditLogger.log({
          actorUserId: user.id,
          workspaceId,
          action: 'invitation.denied',
          targetType: 'invitation',
          targetId: lower,
          ipAddress: ip,
          userAgent,
          metadata: { reason: 'insufficient_permissions', attempted_role: role }
        });

        PrivacyLogger.logRequest(req, startTime, 403);
        return NextResponse.json({ ok: false, error: "Insufficient permissions to invite users" }, { status: 403 });
      }

      // Check if user already exists
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
          PrivacyLogger.logRequest(req, startTime, 400);
          return NextResponse.json({ ok: false, error: "User is already a member of this workspace" }, { status: 400 });
        }

        // Add membership immediately
        const { error: insErr } = await supabaseAdmin
          .from('workspace_memberships')
          .insert({
            workspace_id: workspaceId,
            user_id: profile.id,
            role: role
          });
        
        if (insErr) {
          console.error("Error adding existing user to workspace:", insErr);
          PrivacyLogger.logRequest(req, startTime, 500);
          return NextResponse.json({ ok: false, error: "Failed to add user to workspace" }, { status: 500 });
        }

        // Log the addition
        await AuditLogger.logMembershipChange(
          user.id,
          workspaceId,
          profile.id,
          'added',
          undefined,
          role,
          ip,
          userAgent
        );
        
        PrivacyLogger.logRequest(req, startTime, 200);
        return NextResponse.json({ 
          ok: true, 
          immediate: true,
          message: `User has been added to the workspace as ${role}`
        });
      }

      // User doesn't exist - create invitation
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const { error: inviteError } = await supabaseAdmin
        .from('workspace_invitations')
        .insert({
          workspace_id: workspaceId,
          email: lower,
          role,
          token,
          invited_by: user.id,
          expires_at: expiresAt.toISOString()
        });

      if (inviteError) {
        console.error("Error creating invitation:", inviteError);
        PrivacyLogger.logRequest(req, startTime, 500);
        return NextResponse.json({ ok: false, error: inviteError.message }, { status: 500 });
      }

      // Get workspace and inviter details for email
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
      
      // Send email
      const emailSent = await sendInviteEmail({
        email: lower,
        inviterName: inviterProfile?.full_name || user.email || 'Someone',
        workspaceName: workspace?.name || 'Workspace',
        role: role,
        inviteUrl: inviteUrl
      });

      // Log the invitation
      await AuditLogger.log({
        actorUserId: user.id,
        workspaceId,
        action: 'invitation.created',
        targetType: 'invitation',
        targetId: lower,
        ipAddress: ip,
        userAgent,
        metadata: { 
          role, 
          emailSent,
          expiresAt: expiresAt.toISOString()
        }
      });

      if (!emailSent) {
        PrivacyLogger.warn('Email invitation failed to send', {
          userId: user.id,
          workspaceId,
          targetEmail: lower
        });

        return NextResponse.json({ 
          ok: true, 
          immediate: false,
          message: `Invitation created but email failed to send. Please share this link manually: ${inviteUrl}`,
          inviteUrl: inviteUrl
        });
      }

      PrivacyLogger.logRequest(req, startTime, 200);
      return NextResponse.json({ 
        ok: true, 
        immediate: false,
        message: `Invitation sent to ${lower}`
      });

    } catch (error: any) {
      PrivacyLogger.logRequest(req, startTime, 500, error);
      return NextResponse.json({ ok: false, error: error.message || "Internal server error" }, { status: 500 });
    }
  });
}
