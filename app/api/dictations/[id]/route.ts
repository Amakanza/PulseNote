// app/api/dictations/[id]/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { 
        cookies: { 
          get: (k) => cookieStore.get(k)?.value 
        } 
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const dictationId = params.id;

    // Fetch dictation with user ownership check via RLS
    const { data: dictation, error } = await supabase
      .from('dictations')
      .select('id, status, transcript_text, transcript, error, duration_sec, created_at')
      .eq('id', dictationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Dictation not found" }, { status: 404 });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!dictation) {
      return NextResponse.json({ error: "Dictation not found" }, { status: 404 });
    }

    // Return status and transcript data
    return NextResponse.json({
      id: dictation.id,
      status: dictation.status,
      transcript_text: dictation.transcript_text,
      transcript: dictation.transcript,
      error: dictation.error,
      duration_sec: dictation.duration_sec,
      created_at: dictation.created_at
    });

  } catch (error: any) {
    console.error('Dictation status API error:', error);
    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 });
  }
}
