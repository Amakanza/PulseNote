// app/page.tsx - Clean version without debug
"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import ImageUploadOCR from "../components/ImageUploadOCR";
import Header from "../components/Header";

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
    return data.html;
  }

  async function handleAnalyze() {
    if (!raw.trim()) return;
    setError(null); 
    setLoading(true);
    try {
      sessionStorage.setItem("report:input", raw);
      const msgs = await parse(raw);
      await draft(msgs);
    } catch (e: any) { 
      setError(e.message); 
    } finally { 
      setLoading(false); 
    }
  }

  function handleClear() {
    setRaw(""); 
    setPreviewHtml(""); 
    setError(null);
    sessionStorage.removeItem("report:input");
    sessionStorage.removeItem("report:html");
    sessionStorage.removeItem("report:analysis");
  }

  function handleUploadClick() { 
    fileInputRef.current?.click(); 
  }
  
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; 
    if (!file) return;
    const text = await file.text(); 
    setRaw(text); 
    setTimeout(handleAnalyze, 50);
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
        body: JSON.stringify({ html: sessionStorage.getItem("report:html"), filename: "Clinical_Report" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); 
      a.href = url; 
      a.download = "Clinical_Report.docx"; 
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { 
      alert(e.message || "Export failed"); 
    }
  }

  // Handle OCR text extraction
  const handleTextExtracted = (extractedText: string) => {
    if (extractedText.trim()) {
      const newText = raw.trim() ? `${raw}\n\n${extractedText}` : extractedText;
      setRaw(newText);
      setTimeout(() => {
        handleAnalyze();
      }, 100);
    }
  };

  const lines = raw ? raw.split(/\r?\n/).length : 0;
  const chars = raw.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header 
        title="Create New Report" 
        subtitle="Transform clinical notes into professional reports"
        actions={
          <button 
            className="btn" 
            onClick={gotoEditor} 
            title="Open rich text editor"
            disabled={!raw.trim() && !previewHtml}
          >
            Open Editor
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Image Upload Section */}
        <section className="panel p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Upload or Capture Images</h3>
            <p className="text-sm text-slate-600">Upload images containing text or capture photos to automatically extract text content.</p>
          </div>
          <ImageUploadOCR 
            onTextExtracted={handleTextExtracted} 
            disabled={loading}
          />
        </section>

        {/* Main Workspace */}
        <section className="panel overflow-hidden">
          <div className="grid lg:grid-cols-12 gap-0 min-h-[70vh]">
            {/* Input Column */}
            <div className="lg:col-span-5 border-r border-slate-200">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
                <div className="text-sm font-semibold text-slate-700">Clinical Notes Input</div>
                <div className="text-xs text-slate-500">{lines} lines • {chars} chars</div>
              </div>
              <div className="p-4 h-full">
                <textarea
                  className="w-full h-[calc(70vh-80px)] p-3 border border-slate-200 rounded-lg resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder={`[12/08/24, 09:14] Patient: Experiencing pain in lower back...
[12/08/24, 09:15] Physio: ROM assessment shows limited flexion...

Or upload/capture images with text above to automatically extract content here.`}
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                />
                <p className="text-xs mt-2 text-slate-500">
                  Tip: Paste clinical notes, upload images with text, or type patient observations.
                </p>
              </div>
            </div>

            {/* Actions Column */}
            <div className="lg:col-span-2 border-r border-slate-200 bg-emerald-50/30">
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
                  title="Upload text file"
                >
                  📁 Upload File
                </button>
                
                <button 
                  className="w-full btn btn-primary" 
                  onClick={handleAnalyze} 
                  disabled={!raw.trim() || loading}
                  title="Generate physiotherapy report"
                >
                  {loading ? "⏳ Analyzing..." : "▶️ Generate Report"}
                </button>
                
                <button 
                  className="w-full btn bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200" 
                  onClick={gotoEditor} 
                  disabled={!raw.trim() && !previewHtml}
                  title="Open rich text editor"
                >
                  📝 Open Editor
                </button>
                
                <button 
                  className="w-full btn bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200" 
                  onClick={exportDocx} 
                  disabled={!previewHtml}
                  title="Download Word document"
                >
                  📄 Export DOCX
                </button>
                
                <button 
                  className="w-full btn bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200" 
                  onClick={handleClear} 
                  disabled={!raw && !previewHtml}
                  title="Clear all data"
                >
                  🗑️ Clear All
                </button>
                
                {error && (
                  <div className="w-full p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 text-center">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Preview Column */}
            <div className="lg:col-span-5">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
                <div className="text-sm font-semibold text-slate-700">Report Preview</div>
                <div className="text-xs text-slate-500">{previewHtml ? "✅ Ready" : "⏳ Pending"}</div>
              </div>
              <div className="p-4 h-[calc(70vh-60px)] overflow-y-auto">
                {!previewHtml ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-center">
                    <div>
                      <div className="text-4xl mb-4">🏥</div>
                      <div className="text-sm">Click <strong>Generate Report</strong> to create a professional clinical report</div>
                      <div className="text-xs text-slate-500 mt-2">Patient details, assessments, and clinical findings will appear here</div>
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
          <div className="lg:hidden">
            <div className="space-y-4 p-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">Clinical Notes</label>
                  <div className="text-xs text-slate-500">{lines} lines • {chars} chars</div>
                </div>
                <textarea
                  className="w-full h-40 p-3 border border-slate-200 rounded-lg resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Paste clinical notes or use image upload above..."
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                />
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
                  {loading ? "⏳" : "▶️ Generate"}
                </button>
                <button 
                  className="btn btn-sm" 
                  onClick={gotoEditor} 
                  disabled={!raw.trim() && !previewHtml}
                >
                  📝 Editor
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
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Report Preview</label>
                  <div 
                    className="prose prose-sm max-w-none border border-slate-200 rounded-lg p-3 bg-white" 
                    dangerouslySetInnerHTML={{ __html: previewHtml }} 
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="panel p-6 bg-gradient-to-r from-emerald-50 to-sky-50 text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Ready to Edit Your Report?</h3>
          <p className="text-slate-600 mb-4">
            Use the rich text editor to customize your report, add formatting, and save it to your library.
          </p>
          <button 
            className="btn btn-primary" 
            onClick={gotoEditor}
            disabled={!raw.trim() && !previewHtml}
          >
            Open Report Editor
          </button>
        </section>
      </div>
    </div>
  );
}
