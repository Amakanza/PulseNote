// components/ReportEditor.tsx - Updated with Header
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
import { ChevronDown, ChevronUp, FileText, Copy, Save } from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";
import Header from "./Header";

export default function ReportEditor({ initialHTML }: { initialHTML: string }) {
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState("Feedback_Report");
  const [inputText, setInputText] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const sessionFileName = sessionStorage.getItem("report:fileName");
    if (sessionFileName) setFileName(sessionFileName);

    // Load the original input text from session storage
    const savedInput = sessionStorage.getItem("report:input");
    if (savedInput) setInputText(savedInput);

    // Get current user
    const getUser = async () => {
      const supa = supabaseClient();
      const { data: { user } } = await supa.auth.getUser();
      setUser(user);
    };
    getUser();
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

  const saveSession = useCallback(() => {
    const html = editor?.getHTML() || "";
    sessionStorage.setItem("report:html", html);
    sessionStorage.setItem("report:fileName", fileName);
  }, [editor, fileName]);

  const saveToLibrary = useCallback(async () => {
    if (!user) {
      alert("Please sign in to save reports");
      return;
    }

    setSaving(true);
    try {
      const html = editor?.getHTML() || "";
      const supa = supabaseClient();

      // Get user's personal workspace or create one
      let { data: memberships } = await supa
        .from('workspace_memberships')
        .select('workspace_id, workspace:workspaces(name)')
        .eq('user_id', user.id)
        .eq('role', 'owner');

      let workspaceId;
      if (memberships && memberships.length > 0) {
        // Use first owned workspace
        workspaceId = memberships[0].workspace_id;
      } else {
        // Create personal workspace
        const { data: newWorkspace } = await supa
          .from('workspaces')
          .insert({ name: 'My Reports' })
          .select()
          .single();
        
        if (newWorkspace) {
          workspaceId = newWorkspace.id;
        }
      }

      if (!workspaceId) {
        throw new Error("Could not create workspace");
      }

      // Generate title from content or use filename
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const textContent = tempDiv.textContent || '';
      const title = fileName || textContent.slice(0, 50).trim() || 'Untitled Report';

      // Save the report
      const { data: project, error } = await supa
        .from('projects')
        .insert({
          workspace_id: workspaceId,
          title,
          content: html,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Optionally redirect to the saved report
      // window.location.href = `/report/${project.id}`;

    } catch (e: any) {
      alert(e.message || "Failed to save report");
    } finally {
      setSaving(false);
    }
  }, [editor, fileName, user]);

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

  const copyInputText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inputText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inputText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [inputText]);

  const getInputLineCount = () => {
    return inputText ? inputText.split(/\r?\n/).length : 0;
  };

  const getInputCharCount = () => {
    return inputText.length;
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header 
        title="Report Editor" 
        subtitle="Edit and format your clinical reports"
        actions={
          <div className="flex items-center gap-2">
            {user && (
              <button 
                className={`btn ${saveSuccess ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                onClick={saveToLibrary}
                disabled={saving}
                aria-label="Save to reports library"
              >
                {saving ? "Saving..." : saveSuccess ? "✓ Saved!" : (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    Save Report
                  </>
                )}
              </button>
            )}
            
            <button 
              className="btn btn-primary" 
              onClick={exportDocx} 
              disabled={downloading}
              aria-label="Download as DOCX"
            >
              {downloading ? "Creating…" : "Download DOCX"}
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        {/* Main Editor Panel */}
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
                onClick={saveSession}
                aria-label="Save to sessionStorage"
              >
                Save Draft
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
                  onBlur={saveSession}
                />
                <span className="small text-slate-500">.docx</span>
              </div>
            </div>
          </div>

          {/* Editor area */}
          <div className="p-4 md:p-8">
            <div className="prose">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        {/* Save to Library Call-to-Action */}
        {user && !saveSuccess && (
          <div className="panel p-6 bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-slate-900 mb-1">Save to Your Reports Library</h3>
                <p className="text-sm text-slate-600">
                  Save this report to access it later and share with your team.
                </p>
              </div>
              <button 
                className="btn btn-primary flex items-center gap-2"
                onClick={saveToLibrary}
                disabled={saving}
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Report"}
              </button>
            </div>
          </div>
        )}

        {/* Sign in prompt for non-authenticated users */}
        {!user && (
          <div className="panel p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-slate-900 mb-1">Sign in to Save Reports</h3>
                <p className="text-sm text-slate-600">
                  Create an account to save your reports and access them from anywhere.
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  className="btn"
                  onClick={() => window.location.href = '/signin'}
                >
                  Sign In
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => window.location.href = '/signup'}
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rest of the component remains the same... */}
        {/* Collapsible Original Input Section */}
        {inputText && (
          <div className="panel overflow-hidden">
            {/* Header */}
            <div 
              className="flex items-center justify-between p-4 bg-slate-50 border-b cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={() => setShowInput(!showInput)}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-600" />
                <div>
                  <h3 className="font-medium text-slate-900">Original Input</h3>
                  <p className="text-sm text-slate-600">
                    {getInputLineCount()} lines • {getInputCharCount()} characters
                    {!showInput && " • Click to expand"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showInput && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyInputText();
                    }}
                    className={`btn btn-sm flex items-center gap-2 ${
                      copySuccess ? 'bg-green-100 text-green-700' : ''
                    }`}
                    title="Copy original input to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </button>
                )}
                {showInput ? (
                  <ChevronUp className="w-5 h-5 text-slate-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-600" />
                )}
              </div>
            </div>

            {/* Collapsible Content */}
            {showInput && (
              <div className="p-4 bg-white">
                <div className="bg-slate-50 rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Raw Input Text
                    </label>
                    <div className="text-xs text-slate-500">
                      This is what was originally entered or extracted from images
                    </div>
                  </div>
                  <div className="relative">
                    <textarea
                      value={inputText}
                      readOnly
                      className="w-full h-64 p-3 bg-white border border-slate-200 rounded-md font-mono text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="No original input found"
                    />
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={copyInputText}
                        className={`btn btn-sm p-2 ${
                          copySuccess 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-white hover:bg-slate-50'
                        }`}
                        title="Copy to clipboard"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Help Text */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Compare with your report:</strong> Use this original input to verify your edited report 
                    captures all the important details from the raw clinical notes or extracted text.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state when no input available */}
        {!inputText && (
          <div className="panel p-6 text-center bg-slate-50">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">
              No original input found. Go to the <a href="/" className="text-emerald-600 hover:text-emerald-700 underline">home page</a> to 
              input clinical notes or upload images first.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
