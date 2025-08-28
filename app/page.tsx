"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Tutorial from "../../components/Tutorial";
import { reportEditorTutorialSteps } from "../../lib/tutorialSteps";

const ReportEditor = dynamic(()=>import("../../components/ReportEditor"), { ssr: false });

export default function ReportPage() {
  const [initialHtml, setInitialHtml] = useState<string>("");
  
  useEffect(()=>{
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

  return (
    <div className="space-y-6">
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
          <button 
            className="btn" 
            onClick={() => {
              if (typeof window !== 'undefined' && (window as any).startPulseNoteTutorial) {
                (window as any).startPulseNoteTutorial();
              }
            }}
            title="Take editor tour"
          >
            📚 Editor Tutorial
          </button>
        </div>
      </section>
      <ReportEditor initialHTML={initialHtml} />
    </div>
  );
}
