// components/TutorialButton.tsx - Reusable tutorial trigger button
"use client";

import { HelpCircle, Play } from "lucide-react";

interface TutorialButtonProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'icon' | 'text';
  className?: string;
  title?: string;
}

export default function TutorialButton({ 
  size = 'sm', 
  variant = 'button',
  className = '',
  title = 'Take the tutorial'
}: TutorialButtonProps) {
  
  const handleClick = () => {
    if (typeof window !== 'undefined' && (window as any).startPulseNoteTutorial) {
      (window as any).startPulseNoteTutorial();
    } else {
      console.warn('Tutorial not available on this page');
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2', 
    lg: 'text-base px-4 py-3'
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        className={`inline-flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors ${sizeClasses[size]} ${className}`}
        title={title}
      >
        <HelpCircle className="w-4 h-4" />
      </button>
    );
  }

  if (variant === 'text') {
    return (
      <button
        onClick={handleClick}
        className={`text-emerald-600 hover:text-emerald-700 underline ${className}`}
        title={title}
      >
        Take Tutorial
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`btn ${sizeClasses[size]} bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 flex items-center gap-2 ${className}`}
      title={title}
    >
      <Play className="w-3 h-3" />
      Tutorial
    </button>
  );
}
