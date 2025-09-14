// app/api/dictations/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY! 
});

export async function POST(req: Request) {
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

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const durationSec = parseInt(formData.get('durationSec') as string || '0');
    const patientId = formData.get('patientId') as string | null;
    const vendor = formData.get('vendor') as string || 'openai';

    if (!audioFile) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
    }

    // Validate file size (10MB limit)
    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio file too large (max 10MB)" }, { status: 400 });
    }

    // Generate unique storage path
    const dictationId = crypto.randomUUID();
    const fileName = `${dictationId}.webm`;
    const storagePath = `audio/${user.id}/${fileName}`;

    console.log('Uploading audio file:', { 
      fileName, 
      size: audioFile.size, 
      type: audioFile.type 
    });

    // Convert File to ArrayBuffer then to Uint8Array for Supabase
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBytes = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(storagePath, audioBytes, {
        contentType: audioFile.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ 
        error: `Failed to upload audio: ${uploadError.message}` 
      }, { status: 500 });
    }

    // Insert dictation record with status 'processing'
    const { data: dictation, error: insertError } = await supabase
      .from('dictations')
      .insert({
        id: dictationId,
        clinician_id: user.id,
        patient_id: patientId,
        storage_path: storagePath,
        duration_sec: durationSec,
        vendor,
        status: 'processing'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      // Clean up uploaded file
      await supabase.storage.from('audio').remove([storagePath]);
      return NextResponse.json({ 
        error: `Failed to create dictation record: ${insertError.message}` 
      }, { status: 500 });
    }

    console.log('Created dictation record:', dictation.id);

    // Create signed URL for OpenAI access
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('audio')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Signed URL error:', signedUrlError);
      await updateDictationStatus(supabase, dictationId, 'failed', 'Failed to create signed URL');
      return NextResponse.json({ 
        error: "Failed to create audio access URL" 
      }, { status: 500 });
    }

    // Process transcription in background
    processTranscription(dictationId, signedUrlData.signedUrl, audioFile.type)
      .catch(error => {
        console.error('Background transcription error:', error);
      });

    return NextResponse.json({ 
      id: dictationId, 
      status: 'processing' 
    });

  } catch (error: any) {
    console.error('Dictation API error:', error);
    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 });
  }
}

async function processTranscription(
  dictationId: string, 
  audioUrl: string, 
  mimeType: string
): Promise<void> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
      },
    }
  );

  try {
    console.log('Starting transcription for:', dictationId);

    // Download the audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioFile = new File([audioBuffer], "audio.webm", { type: mimeType });

    console.log('Downloaded audio file, size:', audioBuffer.byteLength);

    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
      response_format: "verbose_json",
      temperature: 0
    });

    console.log('Transcription completed:', {
      text_length: transcription.text?.length || 0,
      duration: transcription.duration
    });

    const transcriptText = transcription.text || "";

    if (!transcriptText.trim()) {
      await updateDictationStatus(supabase, dictationId, 'failed', 'No speech detected in audio');
      return;
    }

    // Update dictation with results
    const { error: updateError } = await supabase
      .from('dictations')
      .update({
        status: 'done',
        transcript: transcription as any,
        transcript_text: transcriptText,
        updated_at: new Date().toISOString()
      })
      .eq('id', dictationId);

    if (updateError) {
      console.error('Failed to update dictation:', updateError);
      await updateDictationStatus(supabase, dictationId, 'failed', 'Failed to save transcription');
      return;
    }

    console.log('Transcription saved successfully for:', dictationId);

  } catch (error: any) {
    console.error('Transcription processing error:', error);
    await updateDictationStatus(
      supabase, 
      dictationId, 
      'failed', 
      `Transcription failed: ${error.message}`
    );
  }
}

async function updateDictationStatus(
  supabase: any, 
  dictationId: string, 
  status: string, 
  error?: string
): Promise<void> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  };

  if (error) {
    updateData.error = error;
  }

  const { error: updateError } = await supabase
    .from('dictations')
    .update(updateData)
    .eq('id', dictationId);

  if (updateError) {
    console.error('Failed to update dictation status:', updateError);
  }
}
