"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Heading from "@tiptap/extension-heading";
import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { useCallback, useEffect, useState } from "react";

export default function ReportEditor({ initialHTML }: { initialHTML: string }) {
  const [downloading, setDownloading] = useState(false);
  const [fileName, setFileName] = useState("Feedback_Report");

  useEffect(() => {
    const saved = sessionStorage.getItem("report:fileName");
    if (saved) setFileName(saved);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [1, 2, 3] }),
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ 
        placeholder: "Start writing or paste your content…" 
      }),
    ],
    content: initialHTML || "<h1>Feedback Report</h1>",
    editorProps: {
      attributes: { 
        class: "prose focus:outline-none min-h-[520px]" 
      },
    },
  });

  const saveLocal = useCallback(() => {
    const html = editor?.getHTML() || "";
    sessionStorage.setItem("report:html", html);
    sessionStorage.setItem("report:fileName", fileName);
  }, [editor, fileName]);

  const exportHTML = useCallback(() => {
    const html = editor?.getHTML() || "";
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName || "Feedback_Report"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [editor, fileName]);

  const exportDocx = useCallback(async () => {
    setDownloading(true);
    try {
      const html = editor?.getHTML() || "";
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, filename: fileName }),
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName || "Feedback_Report"}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || "Failed to export");
    } finally {
      setTimeout(() => setDownloading(false), 150);
    }
  }, [editor, fileName]);

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="panel overflow-hidden">
      {/* Sticky + scrollable toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b -mx-2 px-2 py-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <button 
            className="btn h-10 px-3" 
            onClick={() => editor.chain().focus().toggleBold().run()}
            aria-label="Toggle bold"
          >
            Bold
          </button>
          <button 
            className="btn h-10 px-3" 
            onClick={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Toggle italic"
          >
            Italic
          </button>
          <button 
            className="btn h-10 px-3" 
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            aria-label="Toggle bullet list"
          >
            Bullets
          </button>
          <button 
            className="btn h-10 px-3" 
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            aria-label="Toggle numbered list"
          >
            Numbers
          </button>
          <button 
            className="btn h-10 px-3" 
            onClick={() => editor.chain().focus().setHeading({ level: 1 }).run()}
            aria-label="Set heading 1"
          >
            H1
          </button>
          <button 
            className="btn h-10 px-3" 
            onClick={() => editor.chain().focus().setHeading({ level: 2 }).run()}
            aria-label="Set heading 2"
          >
            H2
          </button>
          <button 
            className="btn h-10 px-3" 
            onClick={() => editor.chain().focus().setHeading({ level: 3 }).run()}
            aria-label="Set heading 3"
          >
            H3
          </button>
          
          <div className="flex-1" />
          
          <button 
            className="btn h-10 px-3" 
            onClick={saveLocal}
            aria-label="Save to session storage"
          >
            Save
          </button>
          <button 
            className="btn btn-primary h-10 px-3" 
            onClick={exportHTML}
            aria-label="Export as HTML"
          >
            Export HTML
          </button>

          {/* File name input */}
          <div className="flex items-center gap-2">
            <label className="label" htmlFor="fileName">
              File name
            </label>
            <input
              id="fileName"
              className="input w-40"
              placeholder="Feedback_Report"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onBlur={saveLocal}
            />
            <span className="small text-slate-500">.docx</span>
          </div>

          <button 
            className="btn btn-primary" 
            onClick={exportDocx} 
            disabled={downloading}
            aria-label="Download as DOCX"
          >
            {downloading ? "Creating…" : "Download DOCX"}
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div className="p-4 md:p-8">
        <div className="prose">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
