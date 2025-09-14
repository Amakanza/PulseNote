// components/Tutorial.tsx - Responsive and mobile-friendly version
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
  const [isMobile, setIsMobile] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const contextualTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isStartingRef = useRef(false);

  // Check mobile and window size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if user has seen tutorial before
  useEffect(() => {
    const seen = localStorage.getItem('pulsenote-tutorial-completed') === 'true';
    setHasSeenTutorial(seen);
    
    if (!seen && showOnFirstVisit && autoStart && !isStartingRef.current) {
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

    const timeoutsRef = contextualTimeouts.current;

    const setupContextualTriggers = () => {
      steps.forEach((step, index) => {
        if (!step.contextualTrigger) return;

        let element = document.querySelector(step.target) as HTMLElement;
        
        if (!element) {
          if (step.target.includes('button')) {
            const buttons = document.querySelectorAll('button');
            element = Array.from(buttons).find(btn => 
              btn.textContent?.toLowerCase().includes(step.target.toLowerCase().replace('button:', ''))
            ) as HTMLElement;
          }
          
          if (!element && (step.target.startsWith('.') || step.target.startsWith('#'))) {
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

          timeoutsRef.set(step.target, timeoutId);
        };

        const clearTrigger = () => {
          const timeoutId = timeoutsRef.get(step.target);
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutsRef.delete(step.target);
          }
        };

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

        element.setAttribute('data-tutorial-target', step.target);
      });
    };

    const timer = setTimeout(setupContextualTriggers, 1000);

    return () => {
      clearTimeout(timer);
      timeoutsRef.forEach(clearTimeout);
      timeoutsRef.clear();
      
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
      
      if (!element) {
        if (targetSelector.includes('button')) {
          const buttons = document.querySelectorAll('button');
          element = Array.from(buttons).find(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            const targetText = targetSelector.toLowerCase().replace(/button.*:/g, '').trim();
            return text.includes(targetText);
          }) as HTMLElement;
        }
        
        if (!element) {
          element = document.querySelector(`[aria-label*="${targetSelector.replace(/[#.\[\]]/g, '')}"]`) as HTMLElement;
        }
        
        if (!element) {
          element = document.querySelector(`[title*="${targetSelector.replace(/[#.\[\]]/g, '')}"]`) as HTMLElement;
        }
      }
      
      setHighlightedElement(element);
      
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
        
        setTimeout(() => {
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
    if (!highlightedElement) return { top: 50, left: 50, position: 'bottom' };
    
    const rect = highlightedElement.getBoundingClientRect();
    const tooltipWidth = isMobile ? Math.min(280, window.innerWidth - 40) : 320;
    const tooltipHeight = 200; // Estimated height
    const padding = 20;
    
    let position = steps[currentStep]?.position || 'bottom';
    let top, left;
    
    // Calculate initial position
    switch (position) {
      case 'top':
        top = rect.top - tooltipHeight - 10;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = rect.bottom + 10;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - 10;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + 10;
        break;
      default:
        top = rect.bottom + 10;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
    }
    
    // Adjust if tooltip goes off screen
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Horizontal adjustments
    if (left < padding) {
      left = padding;
      if (position === 'left') {
        position = 'right';
        left = rect.right + 10;
        if (left + tooltipWidth > viewportWidth - padding) {
          position = 'bottom';
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          top = rect.bottom + 10;
        }
      }
    } else if (left + tooltipWidth > viewportWidth - padding) {
      left = viewportWidth - tooltipWidth - padding;
      if (position === 'right') {
        position = 'left';
        left = rect.left - tooltipWidth - 10;
        if (left < padding) {
          position = 'bottom';
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          top = rect.bottom + 10;
        }
      }
    }
    
    // Vertical adjustments
    if (top < padding) {
      if (position === 'top') {
        position = 'bottom';
        top = rect.bottom + 10;
      } else {
        top = padding;
      }
    } else if (top + tooltipHeight > viewportHeight - padding) {
      if (position === 'bottom') {
        position = 'top';
        top = rect.top - tooltipHeight - 10;
        if (top < padding) {
          top = padding;
          position = 'bottom';
        }
      } else {
        top = viewportHeight - tooltipHeight - padding;
      }
    }
    
    // Final boundary check
    left = Math.max(padding, Math.min(viewportWidth - tooltipWidth - padding, left));
    top = Math.max(padding, Math.min(viewportHeight - tooltipHeight - padding, top));
    
    return { top, left, position, width: tooltipWidth };
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

  const tooltipData = getTooltipPosition();
  const highlightStyle = getHighlightStyle();

  return (
    <>
      {/* Dark overlay */}
      <div 
        ref={overlayRef}
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        style={{ zIndex: 9998 }}
      />
      
      {/* Highlight box */}
      {highlightedElement && (
        <div
          className="fixed border-2 border-emerald-500 rounded-lg shadow-lg bg-emerald-500 bg-opacity-10 transition-all duration-300 pointer-events-none"
          style={{
            top: `${highlightStyle.top}px`,
            left: `${highlightStyle.left}px`,
            width: `${highlightStyle.width}px`,
            height: `${highlightStyle.height}px`,
            zIndex: 9999,
          }}
        />
      )}
      
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed transition-all duration-300"
        style={{
          top: `${tooltipData.top}px`,
          left: `${tooltipData.left}px`,
          width: `${tooltipData.width}px`,
          zIndex: 10000,
        }}
      >
        <div className="bg-white rounded-lg shadow-xl border relative">
          {/* Arrow based on position */}
          {tooltipData.position === 'bottom' && (
            <div 
              className="absolute w-4 h-4 bg-white border-l border-t rotate-45"
              style={{
                top: '-8px',
                left: highlightedElement ? 
                  `${Math.max(16, Math.min(tooltipData.width - 32, highlightedElement.getBoundingClientRect().left + highlightedElement.getBoundingClientRect().width / 2 - tooltipData.left))}px` : 
                  '50%',
                transform: highlightedElement ? 'none' : 'translateX(-50%)'
              }}
            />
          )}
          {tooltipData.position === 'top' && (
            <div 
              className="absolute w-4 h-4 bg-white border-r border-b rotate-45"
              style={{
                bottom: '-8px',
                left: highlightedElement ? 
                  `${Math.max(16, Math.min(tooltipData.width - 32, highlightedElement.getBoundingClientRect().left + highlightedElement.getBoundingClientRect().width / 2 - tooltipData.left))}px` : 
                  '50%',
                transform: highlightedElement ? 'none' : 'translateX(-50%)'
              }}
            />
          )}
          {tooltipData.position === 'right' && (
            <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-l border-b rotate-45" />
          )}
          {tooltipData.position === 'left' && (
            <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-r border-t rotate-45" />
          )}

          {/* Content */}
          <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
            {/* Close button */}
            <button
              onClick={() => endTutorial(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="pr-8 mb-4">
              <h3 className={`font-semibold text-gray-900 ${isMobile ? 'text-base' : 'text-lg'} mb-2`}>
                {steps[currentStep]?.title}
              </h3>
              <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'} leading-relaxed`}>
                {steps[currentStep]?.content}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <div className="flex space-x-2">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className={`flex items-center space-x-1 px-2 py-1 ${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                >
                  <ChevronLeft size={isMobile ? 14 : 16} />
                  <span>Prev</span>
                </button>
                <button
                  onClick={skipTutorial}
                  className={`flex items-center space-x-1 px-2 py-1 ${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 hover:text-gray-800 transition-colors`}
                >
                  <SkipForward size={isMobile ? 14 : 16} />
                  <span>Skip</span>
                </button>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>
                  {currentStep + 1} of {steps.length}
                </span>
                <button
                  onClick={nextStep}
                  className={`flex items-center space-x-1 px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 ${isMobile ? 'text-xs' : 'text-sm'} transition-colors`}
                >
                  <span>{currentStep === steps.length - 1 ? 'Finish' : 'Next'}</span>
                  {currentStep < steps.length - 1 && <ChevronRight size={isMobile ? 14 : 16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Tutorial;
