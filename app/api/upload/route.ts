// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serve";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const supa = supabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('template') as File;
    const name = formData.get('name') as string;
    const workspaceId = formData.get('workspaceId') as string;

    if (!file || !name) {
      return NextResponse.json({ error: "Template file and name are required" }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.docx')) {
      return NextResponse.json({ error: "Only .docx files are supported" }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract placeholders from the template
    const placeholders = extractPlaceholders(buffer);

    // Store template file and metadata
    const templateId = crypto.randomUUID();
    
    // Store file in Supabase Storage
    const { error: uploadError } = await supa.storage
      .from('templates')
      .upload(`${templateId}.docx`, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

    if (uploadError) {
      return NextResponse.json({ error: "Failed to upload template" }, { status: 500 });
    }

    // Save template metadata to database
    const { data: template, error: dbError } = await supa
      .from('templates')
      .insert({
        id: templateId,
        name,
        workspace_id: workspaceId,
        created_by: user.id,
        placeholders,
        file_path: `${templateId}.docx`
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: "Failed to save template metadata" }, { status: 500 });
    }

    return NextResponse.json({ 
      template: {
        id: template.id,
        name: template.name,
        placeholders
      }
    });

  } catch (error: any) {
    console.error('Template upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function extractPlaceholders(buffer: Buffer): string[] {
  try {
    const zip = new PizZip(buffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Get all placeholders using docxtemplater's internal parser
    const placeholders = new Set<string>();
    
    // Parse the document to find all {placeholder} patterns
    const content = zip.file("word/document.xml")?.asText() || "";
    const matches = content.match(/\{([^}]+)\}/g) || [];
    
    matches.forEach(match => {
      const placeholder = match.replace(/[{}]/g, '');
      if (placeholder && !placeholder.includes('#') && !placeholder.includes('/')) {
        placeholders.add(placeholder);
      }
    });

    return Array.from(placeholders).sort();
  } catch (error) {
    console.error('Error extracting placeholders:', error);
    return [];
  }
}
