import { NextResponse } from "next/server";
import htmlToDocx from "html-to-docx";

export const runtime = "nodejs";

function sanitizeFileName(name: string, fallback = "Feedback_Report") {
  const base = (name || "").trim() || fallback;
  // remove illegal characters: \ / : * ? " < > | and control chars
  let safe = base.replace(/[\\/:*?"<>|\x00-\x1F]/g, "").slice(0, 80);
  if (!safe) safe = fallback;
  if (!safe.toLowerCase().endsWith(".docx")) safe += ".docx";
  return safe;
}

export async function POST(req: Request) {
  try {
    const { html, filename } = await req.json();
    if (!html || typeof html !== "string") {
      return NextResponse.json({ error: "html is required" }, { status: 400 });
    }

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
  h1 { font-size: 20pt; margin: 0 0 8pt; }
  h2 { font-size: 14pt; margin: 14pt 0 6pt; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #bbb; padding: 6px; vertical-align: top; }
</style>
</head>
<body>${html}</body>
</html>`;

    const fileBuffer = await htmlToDocx(htmlContent, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: false,
    });

    const safeName = sanitizeFileName(filename);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName}"`,
      },
    });
  } catch (e: any) {
    return new NextResponse(`Export error: ${e?.stack || e?.message}`, { status: 500 });
  }
}
