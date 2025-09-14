// lib/tutorialSteps.ts - Updated with working selectors
export const homePageTutorialSteps = [
  {
    target: 'textarea[placeholder*="clinical notes"]',
    title: 'Input Clinical Notes',
    content: 'Paste your clinical notes, chat exports, or type directly here. This is where you enter the raw text that will be processed into a structured physiotherapy report.',
    position: 'right' as const,
    contextualTrigger: {
      event: 'focus' as const,
      delay: 2000
    }
  },
  {
    target: 'button:has(.lucide-upload)',
    title: 'Upload Images',
    content: 'Upload images containing text or capture photos with your camera. The OCR system will automatically extract text content from these images for processing.',
    position: 'bottom' as const,
    contextualTrigger: {
      event: 'hover' as const,
      delay: 1500
    }
  },
  {
    target: 'button[title*="Generate"]',
    title: 'Analyze & Generate Draft',
    content: 'Click here to process your input and generate a structured physiotherapy report. The AI will parse your notes and create professional documentation with patient details, assessments, and recommendations.',
    position: 'left' as const,
    contextualTrigger: {
      event: 'hover' as const,
      delay: 1000
    }
  },
  {
    target: '.prose',
    title: 'Preview Your Report',
    content: 'Review the generated report here. The AI extracts patient details, clinical assessments, and creates a professional format ready for further editing or direct use in medical records.',
    position: 'left' as const
  },
  {
    target: 'button[title*="Open rich text editor"]',
    title: 'Rich Text Editor',
    content: 'Open the full editor to refine your report with formatting tools, tables, and professional styling options. Perfect for adding final touches or customizing the layout.',
    position: 'bottom' as const,
    contextualTrigger: {
      event: 'hover' as const,
      delay: 1000
    }
  },
  {
    target: 'button[title*="Download Word document"]',
    title: 'Export as Word Document',
    content: 'Download your completed report as a professional Word document (.docx) ready for printing, sharing with colleagues, or adding to patient medical records.',
    position: 'left' as const,
    contextualTrigger: {
      event: 'hover' as const,
      delay: 1000
    }
  }
];

export const reportEditorTutorialSteps = [
  {
    target: '.prose',
    title: 'Welcome to the Editor',
    content: 'Edit your report with full formatting. Click anywhere to start typing and use the toolbar for styling.',
    position: 'bottom' as const
  },
  {
    target: 'button:contains("Bold")',
    title: 'Format Text',
    content: 'Use these tools to format your text. Make clinical findings bold, create lists, and add structure.',
    position: 'bottom' as const
  },
  {
    target: 'button:contains("H1")',
    title: 'Add Headings',
    content: 'Organize your report with headings like Assessment, Treatment, and Recommendations.',
    position: 'bottom' as const
  },
  {
    target: 'button:contains("Save Report")',
    title: 'Save Your Work',
    content: 'Save to your library to access later and share with your team. Sign in to enable this feature.',
    position: 'bottom' as const
  }
];

export const reportViewerTutorialSteps = [
  {
    target: '.prose',
    title: 'Your Report',
    content: 'View your complete formatted report. All patient details and clinical findings are organized professionally.',
    position: 'top' as const
  },
  {
    target: 'button:has(.lucide-edit)',
    title: 'Edit Report',
    content: 'Click to edit this report using the rich text editor with formatting tools.',
    position: 'bottom' as const
  },
  {
    target: 'button:has(.lucide-download)',
    title: 'Download',
    content: 'Export as Word document for printing, sharing, or adding to medical records.',
    position: 'bottom' as const
  },
  {
    target: 'button:has(.lucide-share)',
    title: 'Share',
    content: 'Share with colleagues or copy the link to send to team members.',
    position: 'bottom' as const
  }
];

export const workspacesTutorialSteps = [
  {
    target: 'button:has(.lucide-plus)',
    title: 'Create Workspace',
    content: 'Create workspaces to collaborate with your team on clinical reports and projects.',
    position: 'bottom' as const
  },
  {
    target: '.panel:has(h3)',
    title: 'Your Workspaces',
    content: 'View and manage workspaces. Each can have multiple team members with different permissions.',
    position: 'top' as const
  },
  {
    target: 'button:has(.lucide-settings)',
    title: 'Workspace Settings',
    content: 'Manage settings, invite team members, and control access permissions.',
    position: 'left' as const
  }
];
