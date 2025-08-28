// Add these imports at the top of app/page.tsx
import Tutorial from "../components/Tutorial";
import { homePageTutorialSteps } from "../lib/tutorialSteps";

// Add this inside your HomePage component, right before the return statement:
const handleTutorialComplete = () => {
  console.log('Tutorial completed!');
  // Optional: Track analytics or show completion message
};

const handleTutorialSkip = () => {
  console.log('Tutorial skipped');
  // Optional: Track that user skipped
};

// In your JSX return, add this right after your opening div:
return (
  <div className="space-y-6">
    <Tutorial
      steps={homePageTutorialSteps}
      onComplete={handleTutorialComplete}
      onSkip={handleTutorialSkip}
      showOnFirstVisit={true}
      autoStart={false} // Set to true if you want it to auto-start for new users
    />
    
    {/* Rest of your existing JSX */}
    <section className="panel p-4 md:p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Clinical notes → Report</h2>
          <p className="small mt-1 text-slate-600">Paste chat, upload images with text, or capture photos to extract text and generate reports.</p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          {/* Add manual trigger button */}
          <button 
            className="btn" 
            onClick={() => (window as any).startPulseNoteTutorial?.()}
            title="Take guided tour"
          >
            📚 Tutorial
          </button>
          <button className="btn" onClick={gotoEditor} title="Open the rich editor">Open Editor</button>
          <button className="btn btn-primary" onClick={exportDocx} title="Download as .docx">Download DOCX</button>
        </div>
      </div>
    </section>
    
    {/* Your existing sections... */}
  </div>
);
