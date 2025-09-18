/**
 * FullMind Website - Accessibility Hook
 * Central accessibility management for WCAG AA compliance and mental health safety
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  AccessibilityPreferences, 
  AccessibilityContext,
  AriaAttributes,
  KeyboardNavigation,
  ACCESSIBILITY_CONSTANTS,
  MENTAL_HEALTH_ACCESSIBILITY
} from '@/types/accessibility';
import { generateId, prefersReducedMotion, getContrastRatio } from '@/lib/utils';

// ============================================================================
// ACCESSIBILITY PREFERENCES HOOK
// ============================================================================

export function useAccessibilityPreferences(): AccessibilityPreferences {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    reduceMotion: false,
    highContrast: false,
    largeText: false,
    screenReaderMode: false,
    keyboardOnlyMode: false,
    focusIndicatorEnhanced: false,
    simplifiedInterface: false,
    audioDescriptions: false,
  });

  useEffect(() => {
    // Check system preferences
    const updatePreferences = () => {
      setPreferences(prev => ({
        ...prev,
        reduceMotion: prefersReducedMotion(),
        highContrast: window.matchMedia('(prefers-contrast: high)').matches,
        // Check for stored user preferences
        largeText: localStorage.getItem('fm-large-text') === 'true',
        screenReaderMode: !!navigator.userAgent.match(/NVDA|JAWS|VoiceOver|TalkBack/i),
        keyboardOnlyMode: localStorage.getItem('fm-keyboard-only') === 'true',
        focusIndicatorEnhanced: localStorage.getItem('fm-enhanced-focus') === 'true',
        simplifiedInterface: localStorage.getItem('fm-simplified-ui') === 'true',
        audioDescriptions: localStorage.getItem('fm-audio-descriptions') === 'true',
      }));
    };

    updatePreferences();

    // Listen for system preference changes
    const mediaQueries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-contrast: high)'),
    ];

    mediaQueries.forEach(mq => {
      mq.addEventListener('change', updatePreferences);
    });

    return () => {
      mediaQueries.forEach(mq => {
        mq.removeEventListener('change', updatePreferences);
      });
    };
  }, []);

  return preferences;
}

// ============================================================================
// ARIA LIVE ANNOUNCEMENTS HOOK
// ============================================================================

export function useAriaLive() {
  const announceRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announceRef.current) return;

    // Clear previous announcements
    announceRef.current.textContent = '';
    
    // Use setTimeout to ensure screen readers notice the change
    setTimeout(() => {
      if (announceRef.current) {
        announceRef.current.setAttribute('aria-live', priority);
        announceRef.current.textContent = message;
      }
    }, 100);

    // Clear after announcement to avoid repetition
    setTimeout(() => {
      if (announceRef.current) {
        announceRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  const AriaLiveRegion = () => (
    <div
      ref={announceRef}
      aria-live="off"
      aria-atomic="true"
      className="sr-only"
      data-testid="aria-live-region"
    />
  );

  return { announce, AriaLiveRegion };
}

// ============================================================================
// KEYBOARD NAVIGATION HOOK
// ============================================================================

export function useKeyboardNavigation(options: KeyboardNavigation = { focusable: true }) {
  const elementRef = useRef<HTMLElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !options.focusable) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const handlers = options.keyHandlers;
      if (!handlers) return;

      switch (event.key) {
        case 'Enter':
          if (handlers.Enter) {
            event.preventDefault();
            handlers.Enter();
          }
          break;
        case ' ': // Space
          if (handlers.Space) {
            event.preventDefault();
            handlers.Space();
          }
          break;
        case 'Escape':
          if (handlers.Escape) {
            event.preventDefault();
            handlers.Escape();
          }
          break;
        case 'ArrowUp':
          if (handlers.ArrowUp) {
            event.preventDefault();
            handlers.ArrowUp();
          }
          break;
        case 'ArrowDown':
          if (handlers.ArrowDown) {
            event.preventDefault();
            handlers.ArrowDown();
          }
          break;
        case 'ArrowLeft':
          if (handlers.ArrowLeft) {
            event.preventDefault();
            handlers.ArrowLeft();
          }
          break;
        case 'ArrowRight':
          if (handlers.ArrowRight) {
            event.preventDefault();
            handlers.ArrowRight();
          }
          break;
      }
    };

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    element.addEventListener('keydown', handleKeyDown);
    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);

    // Set tabIndex if specified
    if (options.tabIndex !== undefined) {
      element.tabIndex = options.tabIndex;
    }

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }, [options]);

  return { elementRef, isFocused };
}

// ============================================================================
// FOCUS MANAGEMENT HOOK
// ============================================================================

export function useFocusManagement(returnFocusId?: string) {
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  }, []);

  const focusFirst = useCallback(() => {
    if (!containerRef.current) return;
    const firstFocusable = containerRef.current.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;
    firstFocusable?.focus();
  }, []);

  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (returnFocusId) {
      const element = document.getElementById(returnFocusId) as HTMLElement;
      element?.focus();
    } else if (previousFocusRef.current) {
      (previousFocusRef.current as HTMLElement)?.focus();
    }
  }, [returnFocusId]);

  return {
    containerRef,
    trapFocus,
    focusFirst,
    saveFocus,
    restoreFocus,
  };
}

// ============================================================================
// CRISIS ACCESS HOOK (Mental Health Specific)
// ============================================================================

export function useCrisisAccess() {
  const [accessTime, setAccessTime] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const startCrisisAccess = useCallback(() => {
    startTimeRef.current = performance.now();
    setAccessTime(0);
  }, []);

  const completeCrisisAccess = useCallback(() => {
    if (startTimeRef.current) {
      const endTime = performance.now();
      const totalTime = (endTime - startTimeRef.current) / 1000; // Convert to seconds
      setAccessTime(totalTime);

      // Log if access time exceeds acceptable limit
      if (totalTime > MENTAL_HEALTH_ACCESSIBILITY.MAX_CRISIS_STEPS) {
        console.warn(`Crisis access time exceeded limit: ${totalTime}s > ${MENTAL_HEALTH_ACCESSIBILITY.MAX_CRISIS_STEPS}s`);
      }

      startTimeRef.current = null;
    }
  }, []);

  const resetCrisisAccess = useCallback(() => {
    setAccessTime(null);
    startTimeRef.current = null;
  }, []);

  return {
    accessTime,
    startCrisisAccess,
    completeCrisisAccess,
    resetCrisisAccess,
    isAccessTimeExceeded: accessTime !== null && accessTime > MENTAL_HEALTH_ACCESSIBILITY.MAX_CRISIS_STEPS,
  };
}

// ============================================================================
// COLOR CONTRAST VALIDATION HOOK
// ============================================================================

export function useColorContrast(foreground: string, background: string) {
  const [contrastRatio, setContrastRatio] = useState<number>(0);
  const [isAACompliant, setIsAACompliant] = useState<boolean>(false);
  const [isAAACompliant, setIsAAACompliant] = useState<boolean>(false);

  useEffect(() => {
    const ratio = getContrastRatio(foreground, background);
    setContrastRatio(ratio);
    setIsAACompliant(ratio >= ACCESSIBILITY_CONSTANTS.CONTRAST_AA_NORMAL);
    setIsAAACompliant(ratio >= ACCESSIBILITY_CONSTANTS.CONTRAST_AAA_NORMAL);
  }, [foreground, background]);

  return {
    contrastRatio,
    isAACompliant,
    isAAACompliant,
    meetsWCAG: (level: 'AA' | 'AAA', textSize: 'normal' | 'large' = 'normal') => {
      if (level === 'AA') {
        return textSize === 'large' 
          ? contrastRatio >= ACCESSIBILITY_CONSTANTS.CONTRAST_AA_LARGE
          : contrastRatio >= ACCESSIBILITY_CONSTANTS.CONTRAST_AA_NORMAL;
      } else {
        return textSize === 'large'
          ? contrastRatio >= ACCESSIBILITY_CONSTANTS.CONTRAST_AAA_LARGE
          : contrastRatio >= ACCESSIBILITY_CONSTANTS.CONTRAST_AAA_NORMAL;
      }
    },
  };
}

// ============================================================================
// SKIP LINKS HOOK
// ============================================================================

export function useSkipLinks() {
  const skipLinksRef = useRef<HTMLDivElement>(null);
  const [skipLinks, setSkipLinks] = useState<Array<{ id: string; label: string; href: string }>>([]);

  const registerSkipLink = useCallback((id: string, label: string, href: string) => {
    setSkipLinks(prev => [
      ...prev.filter(link => link.id !== id),
      { id, label, href }
    ]);
  }, []);

  const unregisterSkipLink = useCallback((id: string) => {
    setSkipLinks(prev => prev.filter(link => link.id !== id));
  }, []);

  const SkipLinks = () => (
    <div 
      ref={skipLinksRef}
      className="skip-links"
      data-testid="skip-links"
    >
      {skipLinks.map(({ id, label, href }) => (
        <a
          key={id}
          href={href}
          className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:px-4 focus:py-2 focus:bg-clinical-safe focus:text-white focus:font-medium focus:rounded-br-md"
          onClick={(e) => {
            e.preventDefault();
            const target = document.getElementById(href.replace('#', ''));
            target?.focus();
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          {label}
        </a>
      ))}
    </div>
  );

  return {
    SkipLinks,
    registerSkipLink,
    unregisterSkipLink,
    skipLinksCount: skipLinks.length,
  };
}

// ============================================================================
// COMPREHENSIVE ACCESSIBILITY HOOK
// ============================================================================

export function useAccessibility(componentName?: string): AccessibilityContext {
  const preferences = useAccessibilityPreferences();
  const { announce, AriaLiveRegion } = useAriaLive();

  const updatePreferences = useCallback((newPreferences: Partial<AccessibilityPreferences>) => {
    Object.entries(newPreferences).forEach(([key, value]) => {
      localStorage.setItem(`fm-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, String(value));
    });
    
    // Announce preference changes to screen readers
    const changedPrefs = Object.entries(newPreferences)
      .map(([key, value]) => `${key}: ${value ? 'enabled' : 'disabled'}`)
      .join(', ');
    
    announce(`Accessibility preferences updated: ${changedPrefs}`, 'polite');
    
    // Force re-render by triggering a storage event
    window.dispatchEvent(new StorageEvent('storage'));
  }, [announce]);

  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announce(message, priority);
  }, [announce]);

  const capabilities = {
    supportsAriaLive: true, // Modern browsers support this
    supportsAriaExpanded: true,
    hasScreenReader: preferences.screenReaderMode || !!navigator.userAgent.match(/NVDA|JAWS|VoiceOver|TalkBack/i),
    hasKeyboardNavigation: preferences.keyboardOnlyMode,
  };

  // Log accessibility usage for debugging (in development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && componentName) {
      console.debug(`[Accessibility] ${componentName} initialized with preferences:`, preferences);
    }
  }, [componentName, preferences]);

  return {
    preferences,
    capabilities,
    updatePreferences,
    announceToScreenReader,
    AriaLiveRegion, // Include the component for rendering
  };
}

// ============================================================================
// ACCESSIBILITY TESTING UTILITIES
// ============================================================================

export function useAccessibilityTesting() {
  const checkContrastRatio = useCallback((foreground: string, background: string) => {
    const ratio = getContrastRatio(foreground, background);
    return {
      ratio,
      passesAA: ratio >= ACCESSIBILITY_CONSTANTS.CONTRAST_AA_NORMAL,
      passesAAA: ratio >= ACCESSIBILITY_CONSTANTS.CONTRAST_AAA_NORMAL,
    };
  }, []);

  const validateAriaAttributes = useCallback((element: HTMLElement) => {
    const issues: string[] = [];
    
    // Check for required ARIA attributes
    if (element.hasAttribute('aria-expanded') && !['true', 'false'].includes(element.getAttribute('aria-expanded') || '')) {
      issues.push('aria-expanded must be true or false');
    }
    
    if (element.hasAttribute('aria-pressed') && !['true', 'false', 'mixed'].includes(element.getAttribute('aria-pressed') || '')) {
      issues.push('aria-pressed must be true, false, or mixed');
    }
    
    // Check for redundant roles
    const tagRoleMap: Record<string, string> = {
      'button': 'button',
      'a': 'link',
      'input': 'textbox',
      'h1': 'heading',
      'h2': 'heading',
      'h3': 'heading',
      'h4': 'heading',
      'h5': 'heading',
      'h6': 'heading',
    };
    
    const implicitRole = tagRoleMap[element.tagName.toLowerCase()];
    const explicitRole = element.getAttribute('role');
    
    if (implicitRole && explicitRole === implicitRole) {
      issues.push(`Redundant role="${explicitRole}" on ${element.tagName.toLowerCase()}`);
    }
    
    return issues;
  }, []);

  const checkFocusManagement = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const issues: string[] = [];
    
    focusableElements.forEach((element, index) => {
      const htmlElement = element as HTMLElement;
      
      // Check for positive tabindex (anti-pattern)
      if (htmlElement.tabIndex > 0) {
        issues.push(`Element ${htmlElement.tagName.toLowerCase()} has positive tabindex (${htmlElement.tabIndex})`);
      }
      
      // Check for missing focus indicators
      const styles = getComputedStyle(htmlElement);
      if (styles.outline === 'none' && !styles.boxShadow.includes('focus')) {
        issues.push(`Element ${htmlElement.tagName.toLowerCase()} may be missing focus indicator`);
      }
    });
    
    return issues;
  }, []);

  return {
    checkContrastRatio,
    validateAriaAttributes,
    checkFocusManagement,
  };
}