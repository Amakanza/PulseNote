diff --git a/app/api/export/docx/route.ts b/app/api/export/docx/route.ts
index b813e99ea565f327710330698d66035065b6810e..01340cf09d25f7c56f778f86464a281e842b6678 100644
--- a/app/api/export/docx/route.ts
+++ b/app/api/export/docx/route.ts
@@ -1,64 +1,63 @@
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
 
     // ⬇️ Dynamic import to keep it server-only
     const { default: htmlToDocx } = await import("html-to-docx");
 
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
 
     // Normalize to a Node Buffer
     const fileBuffer =
       out instanceof ArrayBuffer ? Buffer.from(new Uint8Array(out)) : Buffer.from(out as any);
 
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
+}
