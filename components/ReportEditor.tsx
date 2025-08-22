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
    const saved = localStorage.getItem("report:fileName");
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
      Placeholder.configure({ placeholder: "Start writing or paste your content…" }),
    ],
    content: initialHTML || "<h1>Feedback Report</h1>",
    editorProps: {
      attributes: { class: "prose focus:outline-none min-h-[520px]" },
    },
  });

  const saveLocal = useCallback(() => {
    const html = editor?.getHTML() || "";
    localStorage.setItem("report:html", html);
    localStorage.setItem("report:fileName", fileName);
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

  return (
    <div className="panel overflow-hidden">
      {/* Sticky + scrollable toolbar */}
      <div className="sticky top-[72px] z-10 bg-white/80 backdrop-blur border-b overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max px-3 py-2">
          <button className="btn" onClick={() => editor?.chain().focus().toggleBold().run()}>Bold</button>
          <button className="btn" onClick={() => editor?.chain().focus().toggleItalic().run()}>Italic</button>
          <button className="btn" onClick={() => editor?.chain().focus().toggleBulletList().run()}>Bullets</button>
          <button className="btn" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>Numbers</button>
          <button className="btn" onClick={() => editor?.chain().focus().setHeading({ level: 1 }).run()}>H1</button>
          <button className="btn" onClick={() => editor?.chain().focus().setHeading({ level: 2 }).run()}>H2</button>
          <button className="btn" onClick={() => editor?.chain().focus().setHeading({ level: 3 }).run()}>H3</button>

          <div className="flex-1" />

          {/* File name input */}
          <div className="flex items-center gap-2">
            <label className="label">File name</label>
            <input
              className="input w-40"
              placeholder="Feedback_Report"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onBlur={saveLocal}
            />
            <span className="small text-slate-500">.docx</span>
          </div>

          <button className="btn" onClick={saveLocal}>Save</button>
          <button className="btn" onClick={exportHTML}>Export HTML</button>
          <button className="btn btn-primary" onClick={exportDocx} disabled={downloading}>
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
