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
    const saved = sessionStorage.getItem("report:input");
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
    sessionStorage.setItem("report:html", data.html);
    sessionStorage.setItem("report:analysis", JSON.stringify(data.analysisJSON ?? {}));
    setPreviewHtml(data.html);
  }

  async function handleAnalyze() {
    if (!raw.trim()) return;
    setError(null); setLoading(true);
    try {
      sessionStorage.setItem("report:input", raw);
      const msgs = await parse(raw);
      await draft(msgs);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function handleClear() {
    setRaw(""); setPreviewHtml(""); setError(null);
    sessionStorage.removeItem("report:input");
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
        body: JSON.stringify({ html: sessionStorage.getItem("report:html"), filename: "Feedback_Report" }),
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
            <h2 className="text-xl font-semibold tracking-tight">Clinical notes → Report</h2>
            <p className="small mt-1 text-slate-600">Paste chat on the left, actions in the middle, live draft on the right.</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button className="btn" onClick={gotoEditor} title="Open the rich editor">Open Editor</button>
            <button className="btn btn-primary" onClick={exportDocx} title="Download as .docx">Download DOCX</button>
          </div>
        </div>
      </section>

      {/* Workbench - Desktop 3-column layout */}
      <section className="panel overflow-hidden">
        <div className="hidden md:grid md:grid-cols-12 gap-0 min-h-[70vh]">
          {/* LEFT COLUMN */}
          <div className="col-span-5 border-r border-slate-200">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/60">
              <div className="text-sm font-semibold text-slate-700">Input</div>
              <div className="text-xs text-slate-500">{lines} lines • {chars} chars</div>
            </div>
            <div className="p-4 h-full">
              <textarea
                className="w-full h-[calc(70vh-80px)] p-3 border border-slate-200 rounded-lg resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={`[12/08/24, 09:14] AJ: Great service!\n[12/08/24, 09:15] Lina: Delivery was late…`}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
              />
              <p className="text-xs mt-2 text-slate-500">Tip: Paste an exported chat or any free-form feedback.</p>
            </div>
          </div>

          {/* CENTER COLUMN */}
          <div className="col-span-2 border-r border-slate-200 bg-emerald-50/30">
            <div className="flex items-center justify-center px-4 py-3 border-b bg-emerald-100/50">
              <div className="text-sm font-semibold text-slate-700">Actions</div>
            </div>
            <div className="flex flex-col items-center justify-center h-[calc(70vh-60px)] p-4 space-y-3">
              <input 
                ref={fileInputRef} 
                type="file" 
                accept=".txt,.log,.csv,.json" 
                className="hidden" 
                onChange={handleFileChange} 
              />
              
              <button 
                className="w-full btn bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300" 
                onClick={handleUploadClick} 
                title="Upload file"
              >
                📁 Upload
              </button>
              
              <button 
                className="w-full btn btn-primary" 
                onClick={handleAnalyze} 
                disabled={!raw.trim() || loading}
                title="Parse and generate draft"
              >
                {loading ? "⏳ Analyzing..." : "▶️ Analyze"}
              </button>
              
              <button 
                className="w-full btn bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200" 
                onClick={gotoEditor} 
                disabled={!previewHtml}
                title="Open rich text editor"
              >
                ✏️ Edit
              </button>
              
              <button 
                className="w-full btn bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200" 
                onClick={exportDocx} 
                disabled={!previewHtml}
                title="Download Word document"
              >
                📄 DOCX
              </button>
              
              <button 
                className="w-full btn bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200" 
                onClick={handleClear} 
                disabled={!raw && !previewHtml}
                title="Clear all data"
              >
                🗑️ Clear
              </button>
              
              {error && (
                <div className="w-full p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 text-center">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="col-span-5">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/60">
              <div className="text-sm font-semibold text-slate-700">Draft Preview</div>
              <div className="text-xs text-slate-500">{previewHtml ? "✅ Ready" : "⏳ Pending"}</div>
            </div>
            <div className="p-4 h-[calc(70vh-60px)] overflow-y-auto">
              {!previewHtml ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-center">
                  <div>
                    <div className="text-4xl mb-4">📝</div>
                    <div className="text-sm">Click <strong>Analyze</strong> to generate a draft preview</div>
                  </div>
                </div>
              ) : (
                <div 
                  className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-p:text-slate-600" 
                  dangerouslySetInnerHTML={{ __html: previewHtml }} 
                />
              )}
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          <div className="space-y-4 p-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">Input</label>
                <div className="text-xs text-slate-500">{lines} lines • {chars} chars</div>
              </div>
              <textarea
                className="w-full h-40 p-3 border border-slate-200 rounded-lg resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={`[12/08/24, 09:14] AJ: Great service!\n[12/08/24, 09:15] Lina: Delivery was late…`}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
              />
              <p className="text-xs mt-1 text-slate-500">Tip: Paste an exported chat or any free-form feedback.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <input 
                ref={fileInputRef} 
                type="file" 
                accept=".txt,.log,.csv,.json" 
                className="hidden" 
                onChange={handleFileChange} 
              />
              <button className="btn btn-sm" onClick={handleUploadClick}>📁 Upload</button>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={handleAnalyze} 
                disabled={!raw.trim() || loading}
              >
                {loading ? "⏳" : "▶️ Analyze"}
              </button>
              <button 
                className="btn btn-sm" 
                onClick={gotoEditor} 
                disabled={!previewHtml}
              >
                ✏️ Edit
              </button>
              <button 
                className="btn btn-sm" 
                onClick={exportDocx} 
                disabled={!previewHtml}
              >
                📄 DOCX
              </button>
              <button 
                className="btn btn-sm" 
                onClick={handleClear} 
                disabled={!raw && !previewHtml}
              >
                🗑️ Clear
              </button>
            </div>

            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                {error}
              </div>
            )}

            {previewHtml && (
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Draft Preview</label>
                <div 
                  className="prose prose-sm max-w-none border border-slate-200 rounded-lg p-3 bg-white" 
                  dangerouslySetInnerHTML={{ __html: previewHtml }} 
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
