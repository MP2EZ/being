/**
 * FullMind Crisis Button Component
 * Mental health-specific crisis support button with accessibility compliance
 * Meets WCAG AA and mental health accessibility requirements (60x60px, <3s access)
 */

'use client';

import React from 'react';
import { useAccessibilityContext } from '@/contexts/AccessibilityContext';
import { cn } from '@/lib/utils';

interface CrisisButtonProps {
  position?: 'fixed' | 'inline';
  size?: 'standard' | 'large';
  className?: string;
  'data-testid'?: string;
}

export const CrisisButton: React.FC<CrisisButtonProps> = ({
  position = 'fixed',
  size = 'standard',
  className,
  'data-testid': testId,
}) => {
  const { announceToScreenReader } = useAccessibilityContext();

  const handleCrisisHelp = () => {
    // Announce to screen reader immediately
    announceToScreenReader('Connecting to crisis support - 988 Suicide and Crisis Lifeline', 'assertive');
    
    // Direct phone call for mobile devices
    if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Mobile')) {
      window.location.href = 'tel:988';
    } else {
      // For desktop, open new window with crisis resources
      window.open('tel:988', '_self');
    }

    // Analytics tracking (non-blocking)
    try {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'crisis_button_clicked', {
          event_category: 'crisis_intervention',
          event_label: 'emergency_access',
          value: 1
        });
      }
    } catch (error) {
      // Silently fail - don't block crisis access
      console.warn('Analytics tracking failed for crisis button');
    }
  };

  const buttonClasses = cn(
    // Base styling
    'flex items-center justify-center',
    'bg-clinical-warning text-white rounded-full shadow-strong',
    'transition-all duration-200 ease-in-out',
    'focus:outline-none focus:ring-4 focus:ring-clinical-warning/50',
    'hover:bg-clinical-warning/90 active:scale-95',
    
    // Position styling
    position === 'fixed' && 'fixed bottom-4 right-4 z-50',
    position === 'inline' && 'relative',
    
    // Size styling (mental health accessibility requires 60x60px minimum)
    size === 'standard' && 'min-w-[60px] min-h-[60px] w-[60px] h-[60px]',
    size === 'large' && 'min-w-[80px] min-h-[80px] w-[80px] h-[80px]',
    
    // Custom classes
    className
  );

  return (
    <button
      id="crisis-help-button"
      type="button"
      className={buttonClasses}
      onClick={handleCrisisHelp}
      aria-label="Emergency mental health crisis support - Call 988 suicide and crisis lifeline - Available 24/7"
      data-testid={testId || 'crisis-help-button'}
      // High tabindex to ensure it's easily accessible
      tabIndex={0}
    >
      {/* Phone icon */}
      <svg 
        className={cn(
          'text-white',
          size === 'standard' ? 'w-6 h-6' : 'w-8 h-8'
        )}
        fill="currentColor" 
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
      </svg>
      
      {/* Screen reader text */}
      <span className="sr-only">
        Crisis Support - Call 988 - Available 24/7 - Free and confidential emotional support
      </span>
    </button>
  );
};

// Crisis Modal Component for desktop users
interface CrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CrisisModal: React.FC<CrisisModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crisis-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 
          id="crisis-modal-title"
          className="text-xl font-bold text-clinical-warning mb-4"
        >
          Crisis Support Available
        </h2>
        
        <div className="space-y-4">
          <div className="p-4 bg-clinical-warning/10 rounded-lg">
            <h3 className="font-semibold text-clinical-warning mb-2">
              988 Suicide & Crisis Lifeline
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Free and confidential emotional support 24/7
            </p>
            <a 
              href="tel:988"
              className="inline-flex items-center px-4 py-2 bg-clinical-warning text-white rounded-md hover:bg-clinical-warning/90 focus:ring-2 focus:ring-clinical-warning/50"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              Call 988 Now
            </a>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">
              Crisis Text Line
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Text HOME to 741741
            </p>
            <a 
              href="sms:741741?body=HOME"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/50"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              Send Text
            </a>
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-gray-500/50"
        >
          Close
        </button>
      </div>
    </div>
  );
};