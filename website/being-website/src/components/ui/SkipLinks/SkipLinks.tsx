/**
 * Being. Skip Links Component
 * WCAG AA compliant skip navigation for keyboard users
 * Mental health-specific skip links including crisis resources
 */

'use client';

import React from 'react';
import { useAccessibilityContext } from '@/contexts/AccessibilityContext';
import { cn } from '@/lib/utils';

interface SkipLinksProps {
  className?: string;
  'data-testid'?: string;
}

export const SkipLinks: React.FC<SkipLinksProps> = ({
  className,
  'data-testid': testId,
}) => {
  const { announceToScreenReader } = useAccessibilityContext();

  const handleSkipLinkFocus = (target: string) => {
    announceToScreenReader(`Skip link focused: ${target}`, 'polite');
  };

  const handleSkipLinkActivate = (targetId: string, description: string) => {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      // Focus the target element
      targetElement.focus();
      // Scroll into view smoothly
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest' 
      });
      // Announce to screen reader
      announceToScreenReader(`Skipped to ${description}`, 'assertive');
    } else {
      announceToScreenReader(`Skip target not found: ${description}`, 'assertive');
    }
  };

  const skipLinks = [
    {
      id: 'main-content',
      href: '#main-content',
      label: 'Skip to main content',
      description: 'main content area',
      priority: 'high',
      className: 'skip-link'
    },
    {
      id: 'crisis-resources',
      href: '#crisis-resources',
      label: 'Skip to crisis resources',
      description: 'emergency crisis support',
      priority: 'critical',
      className: 'skip-link bg-clinical-warning text-white'
    },
    {
      id: 'navigation',
      href: '#navigation',
      label: 'Skip to navigation',
      description: 'site navigation menu',
      priority: 'medium',
      className: 'skip-link'
    },
    {
      id: 'footer',
      href: '#footer',
      label: 'Skip to footer',
      description: 'footer information and links',
      priority: 'low',
      className: 'skip-link'
    }
  ];

  return (
    <nav
      aria-label="Skip navigation links"
      className={cn(
        'skip-navigation',
        // Hide by default, show on focus
        'sr-only focus-within:not-sr-only',
        'fixed top-0 left-0 z-[9999]',
        'flex flex-col gap-1',
        className
      )}
      data-testid={testId || 'skip-links'}
    >
      {skipLinks.map((link) => (
        <a
          key={link.id}
          href={link.href}
          className={cn(
            // Base skip link styling from Tailwind config
            'skip-link',
            // Custom styling based on priority
            link.priority === 'critical' && 'bg-clinical-warning text-white font-bold',
            link.priority === 'high' && 'bg-clinical-safe text-white',
            link.priority === 'medium' && 'bg-primary-500 text-white',
            link.priority === 'low' && 'bg-gray-700 text-white',
            // Enhanced focus for accessibility
            'focus:ring-4 focus:ring-offset-2',
            link.priority === 'critical' && 'focus:ring-clinical-warning/50',
            link.priority === 'high' && 'focus:ring-clinical-safe/50',
            'transition-all duration-200'
          )}
          onFocus={() => handleSkipLinkFocus(link.label)}
          onClick={(e) => {
            e.preventDefault();
            handleSkipLinkActivate(link.id, link.description);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSkipLinkActivate(link.id, link.description);
            }
          }}
        >
          {link.label}
          {link.priority === 'critical' && (
            <span className="ml-2" aria-hidden="true">🚨</span>
          )}
        </a>
      ))}
      
      {/* Additional keyboard shortcuts info */}
      <div 
        className="skip-link bg-gray-800 text-white text-xs px-3 py-1"
        role="region"
        aria-label="Keyboard shortcuts"
      >
        <span className="sr-only">Available keyboard shortcuts: </span>
        <span aria-label="Alt+C for crisis help">Alt+C: Crisis</span>
        <span className="mx-2">|</span>
        <span aria-label="Alt+S for main content">Alt+S: Main</span>
      </div>
    </nav>
  );
};

// Hook for programmatic skip link functionality
export const useSkipNavigation = () => {
  const { announceToScreenReader } = useAccessibilityContext();

  const skipToElement = (elementId: string, description?: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      // Make element focusable if it isn't already
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '-1');
      }
      
      // Focus and scroll
      element.focus();
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest' 
      });
      
      // Announce
      if (description) {
        announceToScreenReader(`Navigated to ${description}`, 'assertive');
      }
      
      return true;
    }
    return false;
  };

  const skipToMain = () => skipToElement('main-content', 'main content');
  const skipToCrisis = () => skipToElement('crisis-resources', 'crisis resources');
  const skipToNavigation = () => skipToElement('navigation', 'navigation menu');

  return {
    skipToElement,
    skipToMain,
    skipToCrisis,
    skipToNavigation
  };
};