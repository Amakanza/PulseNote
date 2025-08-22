// app/api/export/docx/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeFileName(name: string, fallback = "Feedback_Report") {
  const base = (name || "").trim() || fallback;
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

    // ✅ Dynamic import so TS doesn't need type defs at build time,
    // and the module loads only on the server.
    const { default: htmlToDocx }: any = await import("html-to-docx");

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

    const out = await htmlToDocx(htmlContent, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: false,
    });

    // Normalize to Node Buffer
    const fileBuffer =
      out instanceof ArrayBuffer ? Buffer.from(new Uint8Array(out)) : Buffer.from(out);

    const safeName = sanitizeFileName(filename);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName}"`,
      },
    });
  } catch (e: any) {
    return new NextResponse(`Export error: ${e?.stack || e?.message}`, { status: 500 });
  }
}
