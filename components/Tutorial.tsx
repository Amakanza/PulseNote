// components/Tutorial.tsx - Fixed version
import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';

interface TutorialStep {
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  contextualTrigger?: {
    event: 'hover' | 'focus' | 'click';
    delay?: number;
  };
}

interface TutorialProps {
  steps: TutorialStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  autoStart?: boolean;
  showOnFirstVisit?: boolean;
}

const Tutorial: React.FC<TutorialProps> = ({
  steps,
  onComplete,
  onSkip,
  autoStart = false,
  showOnFirstVisit = true
}) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contextualTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isStartingRef = useRef(false);

  // Check if user has seen tutorial before
  useEffect(() => {
    const seen = localStorage.getItem('pulsenote-tutorial-completed') === 'true';
    setHasSeenTutorial(seen);
    
    if (!seen && showOnFirstVisit && autoStart && !isStartingRef.current) {
      // Small delay to let the page render
      isStartingRef.current = true;
      setTimeout(() => {
        setIsActive(true);
        isStartingRef.current = false;
      }, 1500);
    }
  }, [autoStart, showOnFirstVisit]);

  // Set up contextual triggers
  useEffect(() => {
    if (hasSeenTutorial || isActive || steps.length === 0) return;

    const setupContextualTriggers = () => {
      steps.forEach((step, index) => {
        if (!step.contextualTrigger) return;

        // Try multiple selectors for better element finding
        let element = document.querySelector(step.target) as HTMLElement;
        
        // If direct selector fails, try alternative approaches
        if (!element) {
          // Try finding by text content for buttons
          if (step.target.includes('button')) {
            const buttons = document.querySelectorAll('button');
            element = Array.from(buttons).find(btn => 
              btn.textContent?.toLowerCase().includes(step.target.toLowerCase().replace('button:', ''))
            ) as HTMLElement;
          }
          
          // Try finding by partial class or id
          if (!element && step.target.startsWith('.') || step.target.startsWith('#')) {
            const selector = step.target.slice(1);
            element = document.querySelector(`[class*="${selector}"]`) as HTMLElement ||
                     document.querySelector(`[id*="${selector}"]`) as HTMLElement;
          }
        }

        if (!element) {
          console.warn(`Tutorial: Could not find element for target "${step.target}"`);
          return;
        }

        const handleTrigger = () => {
          const timeoutId = setTimeout(() => {
            if (!isActive && !isStartingRef.current) {
              setCurrentStep(index);
              setIsActive(true);
            }
          }, step.contextualTrigger?.delay || 1500);

          contextualTimeouts.current.set(step.target, timeoutId);
        };

        const clearTrigger = () => {
          const timeoutId = contextualTimeouts.current.get(step.target);
          if (timeoutId) {
            clearTimeout(timeoutId);
            contextualTimeouts.current.delete(step.target);
          }
        };

        // Clean up any existing listeners
        element.removeEventListener('mouseenter', handleTrigger);
        element.removeEventListener('mouseleave', clearTrigger);
        element.removeEventListener('focus', handleTrigger);
        element.removeEventListener('blur', clearTrigger);
        element.removeEventListener('click', handleTrigger);

        switch (step.contextualTrigger.event) {
          case 'hover':
            element.addEventListener('mouseenter', handleTrigger);
            element.addEventListener('mouseleave', clearTrigger);
            break;
          case 'focus':
            element.addEventListener('focus', handleTrigger);
            element.addEventListener('blur', clearTrigger);
            break;
          case 'click':
            element.addEventListener('click', handleTrigger);
            break;
        }

        // Store reference for cleanup
        element.setAttribute('data-tutorial-target', step.target);
      });
    };

    // Setup after a short delay to ensure elements are rendered
    const timer = setTimeout(setupContextualTriggers, 1000);

    return () => {
      clearTimeout(timer);
      // Clear all contextual timeouts
      contextualTimeouts.current.forEach(clearTimeout);
      contextualTimeouts.current.clear();
      
      // Remove event listeners
      document.querySelectorAll('[data-tutorial-target]').forEach(element => {
        const target = element.getAttribute('data-tutorial-target');
        if (target) {
          const step = steps.find(s => s.target === target);
          if (step?.contextualTrigger) {
            element.removeEventListener('mouseenter', () => {});
            element.removeEventListener('mouseleave', () => {});
            element.removeEventListener('focus', () => {});
            element.removeEventListener('blur', () => {});
            element.removeEventListener('click', () => {});
          }
        }
      });
    };
  }, [steps, hasSeenTutorial, isActive]);

  const startTutorial = () => {
    if (steps.length === 0) {
      console.warn('Tutorial: No steps provided');
      return;
    }
    setIsActive(true);
    setCurrentStep(0);
  };

  const endTutorial = (completed = false) => {
    setIsActive(false);
    setCurrentStep(0);
    setHighlightedElement(null);
    
    if (completed) {
      localStorage.setItem('pulsenote-tutorial-completed', 'true');
      setHasSeenTutorial(true);
      onComplete?.();
    } else {
      onSkip?.();
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      endTutorial(true);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTutorial = () => {
    endTutorial(false);
  };

  // Find and highlight target element
  useEffect(() => {
    if (isActive && steps[currentStep]) {
      const targetSelector = steps[currentStep].target;
      let element = document.querySelector(targetSelector) as HTMLElement;
      
      // Enhanced element finding logic
      if (!element) {
        // Try alternative selectors
        if (targetSelector.includes('button')) {
          const buttons = document.querySelectorAll('button');
          element = Array.from(buttons).find(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            const targetText = targetSelector.toLowerCase().replace(/button.*:/g, '').trim();
            return text.includes(targetText);
          }) as HTMLElement;
        }
        
        // Try by aria-label
        if (!element) {
          element = document.querySelector(`[aria-label*="${targetSelector.replace(/[#.\[\]]/g, '')}"]`) as HTMLElement;
        }
        
        // Try by title
        if (!element) {
          element = document.querySelector(`[title*="${targetSelector.replace(/[#.\[\]]/g, '')}"]`) as HTMLElement;
        }
      }
      
      setHighlightedElement(element);
      
      if (element) {
        // Scroll element into view smoothly
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
        
        // Add a small delay to ensure scrolling completes
        setTimeout(() => {
          // Ensure element is still in view after any layout changes
          const rect = element.getBoundingClientRect();
          if (rect.top < 0 || rect.bottom > window.innerHeight || 
              rect.left < 0 || rect.right > window.innerWidth) {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'center'
            });
          }
        }, 300);
      } else {
        console.warn(`Tutorial: Could not find element for target "${targetSelector}"`);
      }
    }
  }, [isActive, currentStep, steps]);

  const getTooltipPosition = () => {
    if (!highlightedElement) return { top: 50, left: 50 };
    
    const rect = highlightedElement.getBoundingClientRect();
    const position = steps[currentStep]?.position || 'bottom';
    
    let top, left;
    
    switch (position) {
      case 'top':
        top = rect.top - 10;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + 10;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - 10;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + 10;
        break;
      default:
        top = rect.bottom + 10;
        left = rect.left + rect.width / 2;
    }
    
    // Ensure tooltip stays within viewport
    const padding = 20;
    top = Math.max(padding, Math.min(window.innerHeight - 200, top));
    left = Math.max(padding, Math.min(window.innerWidth - 320, left));
    
    return { top, left };
  };

  const getHighlightStyle = () => {
    if (!highlightedElement) return { display: 'none' };
    
    const rect = highlightedElement.getBoundingClientRect();
    return {
      top: rect.top - 4,
      left: rect.left - 4,
      width: rect.width + 8,
      height: rect.height + 8,
    };
  };

  // Expose startTutorial globally for manual triggers
  useEffect(() => {
    (window as any).startPulseNoteTutorial = startTutorial;
    return () => {
      delete (window as any).startPulseNoteTutorial;
    };
  }, [steps]);

  if (!isActive || steps.length === 0) return null;

  const tooltipPosition = getTooltipPosition();
  const highlightStyle = getHighlightStyle();

  return (
    <>
      {/* Dark overlay */}
      <div 
        ref={overlayRef}
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
      />
      
      {/* Highlight box */}
      {highlightedElement && (
        <div
          className="fixed z-50 border-2 border-emerald-500 rounded-lg shadow-lg bg-emerald-500 bg-opacity-10 transition-all duration-300 pointer-events-none"
          style={{
            top: `${highlightStyle.top}px`,
            left: `${highlightStyle.left}px`,
            width: `${highlightStyle.width}px`,
            height: `${highlightStyle.height}px`,
          }}
        />
      )}
      
      {/* Tooltip */}
      <div
        className="fixed z-50 transition-all duration-300"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          transform: 'translate(-50%, 0)',
        }}
      >
        <div className="bg-white rounded-lg shadow-xl border max-w-sm p-4 relative">
          {/* Arrow based on position */}
          {steps[currentStep]?.position === 'bottom' && (
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-l border-t rotate-45" />
          )}
          {steps[currentStep]?.position === 'top' && (
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-r border-b rotate-45" />
          )}
          {steps[currentStep]?.position === 'right' && (
            <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-l border-b rotate-45" />
          )}
          {steps[currentStep]?.position === 'left' && (
            <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-r border-t rotate-45" />
          )}

          {/* Close button */}
          <button
            onClick={() => endTutorial(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>

          {/* Content */}
          <div className="pr-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              {steps[currentStep]?.title}
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              {steps[currentStep]?.content}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>
              <button
                onClick={skipTutorial}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <SkipForward size={16} />
                <span>Skip</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-xs text-gray-500">
                {currentStep + 1} of {steps.length}
              </span>
              <button
                onClick={nextStep}
                className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm transition-colors"
              >
                <span>{currentStep === steps.length - 1 ? 'Finish' : 'Next'}</span>
                {currentStep < steps.length - 1 && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Tutorial;
