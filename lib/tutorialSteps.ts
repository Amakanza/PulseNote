// lib/tutorialSteps.ts
export const homePageTutorialSteps = [
  {
    target: '#text-input-area', // Update this to match your actual textarea ID/class
    title: 'Input Clinical Notes',
    content: 'Paste your clinical notes, chat exports, or type directly here. This is where you enter the raw text that will be processed into a structured physiotherapy report.',
    position: 'right' as const,
    contextualTrigger: {
      event: 'focus' as const,
      delay: 2000
    }
  },
  {
    target: '#image-upload-section', // Update to match your image upload container
    title: 'Upload or Capture Images',
    content: 'Upload images containing text or capture photos with your camera. The OCR system will automatically extract text content from these images.',
    position: 'bottom' as const,
    contextualTrigger: {
      event: 'hover' as const,
      delay: 1500
    }
  },
  {
    target: '.btn.btn-primary', // Your analyze button - update selector
    title: 'Analyze & Generate Draft',
    content: 'Click here to process your input and generate a structured physiotherapy report. The AI will parse your notes and create professional documentation.',
    position: 'left' as const,
    contextualTrigger: {
      event: 'hover' as const,
      delay: 1000
    }
  },
  {
    target: '[class*="prose"]', // Your preview area - update selector
    title: 'Preview Your Report',
    content: 'Review the generated report here. The AI extracts patient details, assessments, and creates a professional format ready for further editing.',
    position: 'left' as const
  },
  {
    target: 'a[href="/report"]', // Your editor link
    title: 'Rich Text Editor',
    content: 'Open the full editor to refine your report with formatting tools, tables, and professional styling options.',
    position: 'bottom' as const,
    contextualTrigger: {
      event: 'hover' as const,
      delay: 1000
    }
  },
  {
    target: 'button[title*="docx"], button[title*="DOCX"]', // Your export button
    title: 'Export as Word Document',
    content: 'Download your completed report as a professional Word document ready for printing or sharing with colleagues.',
    position: 'left' as const,
    contextualTrigger: {
      event: 'hover' as const,
      delay: 1000
    }
  },
  {
    target: 'a[href="/workspaces"]', // Your workspace navigation
    title: 'Workspaces',
    content: 'Organize your work in collaborative workspaces. Share reports with team members and manage projects together.',
    position: 'bottom' as const,
    contextualTrigger: {
      event: 'hover' as const,
      delay: 1500
    }
  }
];

export const reportEditorTutorialSteps = [
  {
    target: '.ProseMirror', // TipTap editor content area
    title: 'Rich Text Editor',
    content: 'Edit your report with full formatting capabilities. You can modify text, add headings, and structure your clinical documentation.',
    position: 'top' as const,
    contextualTrigger: {
      event: 'focus' as const,
      delay: 1000
    }
  },
  {
    target: 'button[aria-label*="Bold"]', // Bold button in toolbar
    title: 'Formatting Tools',
    content: 'Use these formatting tools to make your report professional. Bold important findings, create lists, and add headings.',
    position: 'bottom' as const,
    contextualTrigger: {
      event: 'hover' as const,
      delay: 1000
    }
  },
  {
    target: 'input[id="fileName"]', // File name input
    title: 'Set File Name',
    content: 'Customize your report filename before downloading. Include patient details or case numbers for easy identification.',
    position: 'bottom' as const
  },
  {
    target: 'button[aria-label*="Download"]', // Download button
    title: 'Download Professional Report',
    content: 'Export your completed physiotherapy report as a Word document ready for medical records or patient sharing.',
    position: 'left' as const,
    contextualTrigger: {
      event: 'hover' as const,
      delay: 1000
    }
  }
];
