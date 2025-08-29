// lib/tutorialSteps.ts
export const homePageTutorialSteps = [
  {
    target: '#text-input-area',
    title: 'Input Clinical Notes',
    content: 'Paste your clinical notes, chat exports, or type directly here. This is where you enter the raw text that will be processed into a structured physiotherapy report.',
    position: 'right' as const,
    contextualTrigger: {
      event: 'focus' as const,
      delay: 2000
    }
  },
  {
    target: '#image-upload-section',
    title: 'Upload or Capture Images',
    content: 'Upload images containing text or capture photos with your camera. The OCR system will automatically extract text content from these images for processing.',
    position: 'bottom' as const,
    contextualTrigger: {
      event: 'hover' as const,
      delay: 1500
    }
  },
  {
    target: '#analyze-button',
    title: 'Analyze & Generate Draft',
    content: 'Click here to process your input and generate a structured physiotherapy report. The AI will parse your notes and create professional documentation with patient details, assessments, and recommendations.',
    position: 'left' as const,
    contextualTrigger: {
      event: 'hover' as const,
      delay: 1000
    }
  },
  {
    target: '#draft-preview',
    title: 'Preview Your Report',
    content: 'Review the generated report here. The AI extracts patient details, clinical assessments, and creates a professional format ready for further editing or direct use in medical records.',
    position: 'left' as const
  },
  {
    target: 'a[href="/report"]',
    title: 'Rich Text Editor',
    content: 'Open the full editor to refine your report with formatting tools, tables, and professional styling options. Perfect for adding final touches or customizing the layout.',
    position: 'bottom' as const,
    contextualTrigger: {
      event: 'hover' as const,
      delay: 1000
    }
  },
  {
    target: '#export-docx-button',
    title: 'Export as Word Document',
    content: 'Download your completed report as a professional Word document (.docx) ready for printing, sharing with colleagues, or adding to patient medical records.',
    position: 'left' as const,
    contextualTrigger: {
      event: 'hover' as const,
      delay: 1000
    }
  },
  {
    target: 'a[href="/workspaces"]',
    title: 'Workspaces',
    content: 'Organize your work in collaborative workspaces. Share reports with team members, manage projects together, and maintain organized clinical documentation across your practice.',
    position: 'bottom' as const,
    contextualTrigger: {
      event: 'hover' as const,
      delay: 1500
    }
  },
  {
    target: '#clear-button',
    title: 'Start Over',
    content: 'Clear all data and start fresh with new clinical notes or a different patient case. This resets both input and generated content.',
    position: 'left' as const
  }
];

export const reportEditorTutorialSteps = [
  {
    target: '.ProseMirror',
    title: 'Rich Text Editor',
    content: 'Edit your physiotherapy report with full formatting capabilities. You can modify text, add headings, create tables, and structure your clinical documentation professionally.',
    position: 'top' as const,
    contextualTrigger: {
      event: 'focus' as const,
      delay: 1000
    }
  },
  {
    target: 'button:contains("Bold")',
    title: 'Formatting Tools',
    content: 'Use these formatting tools to make your report professional. Bold important clinical findings, create lists for treatment plans, and add headings for better organization.',
    position: 'bottom' as const,
    contextualTrigger: {
      event: 'hover' as const,
      delay: 1000
    }
  },
  {
    target: 'input[id="fileName"]',
    title: 'Set File Name',
    content: 'Customize your report filename before downloading. Include patient details, dates, or case numbers for easy identification in your filing system.',
    position: 'bottom' as const
  },
  {
    target: 'button:contains("Download DOCX")',
    title: 'Download Professional Report',
    content: 'Export your completed physiotherapy report as a Word document ready for medical records, insurance submissions, or sharing with referring physicians.',
    position: 'left' as const,
    contextualTrigger: {
      event: 'hover' as const,
      delay: 1000
    }
  }
];
