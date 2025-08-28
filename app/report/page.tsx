// Add these imports at the top of app/report/page.tsx
import Tutorial from "../../components/Tutorial";
import { reportEditorTutorialSteps } from "../../lib/tutorialSteps";

// Add this inside your ReportPage component:
return (
  <div className="space-y-6">
    <Tutorial
      steps={reportEditorTutorialSteps}
      showOnFirstVisit={true}
      autoStart={false}
    />
    
    <section className="panel p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Report editor</h1>
        <button 
          className="btn" 
          onClick={() => (window as any).startPulseNoteTutorial?.()}
          title="Take editor tour"
        >
          📚 Editor Tutorial
        </button>
      </div>
    </section>
    <ReportEditor initialHTML={initialHtml} />
  </div>
);
