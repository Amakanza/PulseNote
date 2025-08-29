import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ ok: false, error: "Token is required" }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (k) => cookieStore.get(k)?.value } }
    );

    // Must be logged in here
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    // Use the new accept_workspace_invite_v2 function
    const { data, error } = await supabase.rpc("accept_workspace_invite_v2", { p_token: token });
    
    if (error) {
      console.error("Error accepting invite:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    // The function returns JSON with success/error info
    if (data && typeof data === 'object' && 'success' in data) {
      if (data.success) {
        return NextResponse.json({ ok: true, message: data.message });
      } else {
        return NextResponse.json({ ok: false, error: data.error }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Accept invite error:", error);
    return NextResponse.json({ ok: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
