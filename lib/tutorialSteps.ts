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
    title: 'Welcome to the Report Editor',
    content: 'This is where you can edit and format your clinical reports. Click anywhere in the editor to start typing.',
    position: 'bottom' as const
  },
  {
    target: 'button[aria-label="Toggle bold"]',
    title: 'Text Formatting',
    content: 'Use these buttons to format your text. Make important findings bold or italic.',
    position: 'bottom' as const
  },
  {
    target: 'button[aria-label="Set heading 1"]',
    title: 'Document Structure',
    content: 'Use headings to organize your report into clear sections like Assessment, Treatment, and Recommendations.',
    position: 'bottom' as const
  },
  {
    target: 'button[aria-label="Save to reports library"]',
    title: 'Save Your Work',
    content: 'Save your report to your library to access it later and share with your team.',
    position: 'bottom' as const
  }
];

export const reportViewerTutorialSteps = [
  {
    target: '.prose',
    title: 'Report Content',
    content: 'This is your saved report content. You can view the full formatted report here.',
    position: 'top' as const
  },
  {
    target: 'button:has(.lucide-edit)',
    title: 'Edit Report',
    content: 'Click this button to edit your report using the rich text editor.',
    position: 'bottom' as const
  },
  {
    target: 'button:has(.lucide-download)',
    title: 'Download Report',
    content: 'Export your report as a Word document for sharing or printing.',
    position: 'bottom' as const
  },
  {
    target: 'button:has(.lucide-share)',
    title: 'Share Report',
    content: 'Share your report with colleagues or copy the link to send to others.',
    position: 'bottom' as const
  }
];

export const workspacesTutorialSteps = [
  {
    target: 'button:has(.lucide-plus)',
    title: 'Create Workspace',
    content: 'Create a new workspace to collaborate with your team on clinical reports and projects.',
    position: 'bottom' as const
  },
  {
    target: '.panel:has(h3)',
    title: 'Your Workspaces',
    content: 'View and manage your workspaces here. Each workspace can have multiple team members with different permission levels.',
    position: 'top' as const
  },
  {
    target: 'button:has(.lucide-settings)',
    title: 'Workspace Settings',
    content: 'Manage workspace settings, invite team members, and control access permissions.',
    position: 'left' as const
  }
];
