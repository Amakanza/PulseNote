// app/api/templates/generate/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serve";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { templateId, data, filename } = await req.json();
    
    const supa = supabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get template metadata
    const { data: template, error: templateError } = await supa
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Download template file
    const { data: fileBuffer, error: downloadError } = await supa.storage
      .from('templates')
      .download(template.file_path);

    if (downloadError) {
      return NextResponse.json({ error: "Failed to download template" }, { status: 500 });
    }

    // Generate document from template
    const zip = new PizZip(await fileBuffer.arrayBuffer());
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Render with data
    doc.render(data);

    // Get the generated buffer
    const generatedBuffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    // Return as downloadable file
    return new NextResponse(new Uint8Array(generatedBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename || 'generated-report'}.docx"`
      }
    });

  } catch (error: any) {
    console.error('Template generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
