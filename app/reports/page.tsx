// app/report/page.tsx - Updated with working tutorial
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Tutorial from "../../components/Tutorial";
import { reportEditorTutorialSteps } from "../../lib/tutorialSteps";

const ReportEditor = dynamic(() => import("../../components/ReportEditor"), { 
  ssr: false,
  loading: () => (
    <div className="panel p-8 min-h-[400px] flex items-center justify-center">
      <div className="text-slate-600">Loading editor...</div>
    </div>
  )
});

export default function ReportPage() {
  const [initialHtml, setInitialHtml] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    const saved = sessionStorage.getItem("report:html") || "<h1>Physiotherapy Report</h1><p>Start editing your clinical documentation...</p>";
    setInitialHtml(saved);
  }, []);

  // Tutorial handlers
  const handleTutorialComplete = () => {
    console.log('Report editor tutorial completed!');
  };

  const handleTutorialSkip = () => {
    console.log('Report editor tutorial skipped');
  };

  // Don't render anything until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div className="space-y-6">
        <section className="panel p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Report editor</h1>
          </div>
        </section>
        <div className="panel p-8 min-h-[400px] flex items-center justify-center">
          <div className="text-slate-600">Loading editor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Tutorial Component */}
      <Tutorial
        steps={reportEditorTutorialSteps}
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialSkip}
        showOnFirstVisit={true}
        autoStart={false}
      />

      <section className="panel p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Report Editor</h1>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-500">
              Edit and customize your report with rich formatting
            </div>
            <button 
              className="btn btn-sm" 
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).startPulseNoteTutorial) {
                  (window as any).startPulseNoteTutorial();
                }
              }}
              title="Take editor tour"
            >
              📚 Tutorial
            </button>
          </div>
        </div>
      </section>
      
      <ReportEditor initialHTML={initialHtml} />
    </div>
  );
}
