// app/api/auth/totp/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { TOTPService } from "@/lib/auth/totp";
import { AuditLogger } from "@/lib/audit";

export const runtime = "nodejs";

// Enable TOTP
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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { action, secret, token } = await req.json();

    switch (action) {
      case 'generate':
        const newSecret = TOTPService.generateSecret();
        const qrCodeUrl = await TOTPService.generateQRCodeUrl(user.email!, newSecret);
        
        return NextResponse.json({
          secret: newSecret,
          qrCodeUrl
        });

      case 'enable':
        if (!secret || !token) {
          return NextResponse.json({ error: "Secret and token are required" }, { status: 400 });
        }

        const enableResult = await TOTPService.enableTOTP(user.id, secret, token);
        
        if (enableResult.success) {
          await AuditLogger.log({
            actorUserId: user.id,
            workspaceId: 'system',
            action: 'auth.totp_enabled',
            targetType: 'user',
            targetId: user.id,
            ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown'
          });
        }

        return NextResponse.json(enableResult);

      case 'disable':
        const disableResult = await TOTPService.disableTOTP(user.id);
        
        if (disableResult.success) {
          await AuditLogger.log({
            actorUserId: user.id,
            workspaceId: 'system',
            action: 'auth.totp_disabled',
            targetType: 'user',
            targetId: user.id,
            ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown'
          });
        }

        return NextResponse.json(disableResult);

      case 'status':
        const status = await TOTPService.getTOTPStatus(user.id);
        return NextResponse.json(status);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error: any) {
    console.error("TOTP error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
