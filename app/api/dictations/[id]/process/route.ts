// app/api/dictations/[id]/process/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY! 
});

const CLINICAL_SYSTEM_PROMPT = `You are a clinical documentation assistant. Convert the provided transcript into a structured clinical note using STRICT JSON format.

Output must be valid JSON with these exact keys:
- note_type: string (e.g., "assessment", "progress_note", "evaluation")
- subjective: string (patient's reported symptoms, concerns, history)
- objective: string (measurable findings, observations, test results)
- assessment: string (clinical interpretation, diagnosis, condition status)
- plan: string (treatment plan, recommendations, follow-up)
- icd10_codes: array of strings (relevant ICD-10 codes if identifiable)
- red_flags: array of strings (urgent concerns or warning signs mentioned)
- follow_up: string (follow-up instructions or timeline)

Extract clinical information accurately from the transcript. If information is not available for a section, use an empty string or empty array as appropriate.`;

export async function POST(
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

    // Load dictation with ownership check via RLS
    const { data: dictation, error: dictationError } = await supabase
      .from('dictations')
      .select('id, status, transcript_text')
      .eq('id', dictationId)
      .single();

    if (dictationError || !dictation) {
      return NextResponse.json({ 
        error: "Dictation not found or access denied" 
      }, { status: 404 });
    }

    if (dictation.status !== 'done') {
      return NextResponse.json({ 
        error: `Cannot process dictation with status: ${dictation.status}` 
      }, { status: 400 });
    }

    if (!dictation.transcript_text?.trim()) {
      return NextResponse.json({ 
        error: "No transcript text available" 
      }, { status: 400 });
    }

    console.log('Processing dictation:', dictationId, 'Length:', dictation.transcript_text.length);

    // Call OpenAI to structure the clinical note
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: CLINICAL_SYSTEM_PROMPT 
        },
        { 
          role: "user", 
          content: `Transcript:\n"""${dictation.transcript_text}"""` 
        }
      ],
      temperature: 0,
      response_format: { type: "json_object" },
      max_tokens: 2000
    });

    const structuredContent = response.choices[0]?.message?.content;
    
    if (!structuredContent) {
      return NextResponse.json({ 
        error: "No response from AI processing" 
      }, { status: 500 });
    }

    let structuredJson;
    try {
      structuredJson = JSON.parse(structuredContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', structuredContent);
      return NextResponse.json({ 
        error: "Invalid JSON response from AI processing" 
      }, { status: 500 });
    }

    // Validate required fields
    const requiredFields = ['note_type', 'subjective', 'objective', 'assessment', 'plan'];
    const missingFields = requiredFields.filter(field => 
      !(field in structuredJson) || typeof structuredJson[field] !== 'string'
    );

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields, 'Response:', structuredJson);
      return NextResponse.json({ 
        error: `Invalid response structure - missing fields: ${missingFields.join(', ')}` 
      }, { status: 500 });
    }

    // Save structured output
    const { data: output, error: outputError } = await supabase
      .from('dictation_outputs')
      .insert({
        dictation_id: dictationId,
        model: 'gpt-4o-mini',
        result: structuredJson
      })
      .select()
      .single();

    if (outputError) {
      console.error('Failed to save dictation output:', outputError);
      return NextResponse.json({ 
        error: "Failed to save structured note" 
      }, { status: 500 });
    }

    console.log('Structured note saved:', output.id);

    return NextResponse.json({
      id: output.id,
      dictation_id: dictationId,
      result: structuredJson
    });

  } catch (error: any) {
    console.error('Dictation processing error:', error);
    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 });
  }
}
