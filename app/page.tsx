"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { timestamp?: string; sender?: string; message: string };

export default function HomePage() {
  const [raw, setRaw] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("report:input");
    if (saved) setRaw(saved);
  }, []);

  async function parse(rawText: string): Promise<Msg[]> {
    const res = await fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Parse failed");
    return data.messages;
  }

  async function draft(messages: Msg[]) {
    const res = await fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, templateId: "default" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Draft failed");
    localStorage.setItem("report:html", data.html);
    localStorage.setItem("report:analysis", JSON.stringify(data.analysisJSON ?? {}));
    setPreviewHtml(data.html);
  }

  async function handleAnalyze() {
    if (!raw.trim()) return;
    setError(null); setLoading(true);
    try {
      localStorage.setItem("report:input", raw);
      const msgs = await parse(raw);
      await draft(msgs);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function handleClear() {
    setRaw(""); setPreviewHtml(""); setError(null);
    localStorage.removeItem("report:input");
  }

  function handleUploadClick() { fileInputRef.current?.click(); }
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text(); setRaw(text); setTimeout(handleAnalyze, 50);
  }

  async function gotoEditor() {
    if (!previewHtml && raw.trim()) await handleAnalyze();
    window.location.href = "/report";
  }

  async function exportDocx() {
    try {
      if (!previewHtml) await handleAnalyze();
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: localStorage.getItem("report:html"), filename: "Feedback_Report" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); 
      a.href = url; 
      a.download = "Feedback_Report.docx"; 
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { alert(e.message || "Export failed"); }
  }

  const lines = raw ? raw.split(/\r?\n/).length : 0;
  const chars = raw.length;

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <section className="panel p-4 md:p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">WhatsApp → Report</h2>
            <p className="small mt-1 text-slate-600">Paste chat on the left, actions in the middle, live draft on the right.</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button className="btn" onClick={gotoEditor} title="Open the rich editor">Open Editor</button>
            <button className="btn btn-primary" onClick={exportDocx} title="Download as .docx">Download DOCX</button>
          </div>
        </div>
      </section>

      {/* Workbench */}
      <section className="panel overflow-hidden">
        <div className="grid grid-cols-12 gap-0">
          {/* LEFT */}
          <div className="col-span-12 md:col-span-5 border-r">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50/60">
              <div className="text-sm font-semibold text-slate-700">Input</div>
              <div className="small text-slate-500">{lines} lines • {chars} chars</div>
            </div>
            <div className="p-3">
              <textarea
                className="textarea font-mono/5 h-[52vh] md:h-[70vh]"
                placeholder={`[12/08/24, 09:14] AJ: Great service!\n[12/08/24, 09:15] Lina: Delivery was late…`}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
              />
              <p className="small mt-2 text-slate-500">Tip: Paste an exported chat or any free-form feedback.</p>
            </div>
          </div>

          {/* CENTER */}
          <div className="hidden md:flex md:col-span-2 items-center justify-center">
            <div className="flex flex-col gap-3 py-4">
              <input ref={fileInputRef} type="file" accept=".txt,.log,.csv,.json" className="hidden" onChange={handleFileChange} />
              <button className="btn" onClick={handleUploadClick} title="Upload .txt">⬆️ Upload</button>
              
              <div className="flex flex-wrap items-center gap-3">
                <button disabled={!raw || loading} onClick={handleAnalyze} className="btn btn-primary h-10 px-4">
                  {loading ? "Analyzing..." : "Analyze & Draft"}
                </button>
                {error && <span className="text-red-600 text-sm">{error}</span>}
              </div>
              
              <button className="btn" onClick={gotoEditor} disabled={!previewHtml} title="Open editor">✏️ Edit</button>
              <button className="btn" onClick={exportDocx} disabled={!previewHtml} title="Download docx">⬇️ DOCX</button>
              <button className="btn" onClick={handleClear} disabled={!raw && !previewHtml} title="Clear panes">🧹 Clear</button>
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-span-12 md:col-span-5">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50/60">
              <div className="text-sm font-semibold text-slate-700">Draft Preview</div>
              <div className="small text-slate-500">{previewHtml ? "Ready" : "—"}</div>
            </div>
            <div className="p-3">
              {!previewHtml ? (
                <div className="text-slate-400 text-sm">Click <strong>Analyze</strong> to generate a draft preview.</div>
              ) : (
                <div className="prose" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Bottom actions (mobile) */}
      <div className="md:hidden flex flex-wrap items-center justify-end gap-2">
        <button className="btn" onClick={handleAnalyze} disabled={!raw || loading}>{loading ? "…" : "Analyze"}</button>
        <button className="btn" onClick={gotoEditor} disabled={!previewHtml}>Edit</button>
        <button className="btn btn-primary" onClick={exportDocx} disabled={!previewHtml}>Download DOCX</button>
        <button className="btn" onClick={handleClear} disabled={!raw && !previewHtml}>Clear</button>
      </div>
    </div>
  );
}
