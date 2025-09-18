/**
 * FullMind Website - Analytics Hooks
 * Custom React hooks for analytics and performance monitoring
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { analytics } from '@/lib/analytics';
import { type AnalyticsEvent } from '@/types/api';

// ============================================================================
// PAGE VIEW TRACKING HOOK
// ============================================================================

/**
 * Automatically tracks page views with clinical-grade accuracy
 */
export function usePageTracking(): void {
  const router = useRouter();
  const previousPath = useRef<string>('');

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // Avoid duplicate tracking for the same page
      if (url !== previousPath.current) {
        analytics.trackPageView(url, document.title);
        previousPath.current = url;
      }
    };

    // Track initial page load
    if (typeof window !== 'undefined') {
      handleRouteChange(window.location.pathname);
    }

    // Note: Next.js App Router doesn't have router events like Pages Router
    // This would need to be handled differently in production
    // For now, we track on component mount which works for static generation
  }, [router]);
}

// ============================================================================
// EVENT TRACKING HOOKS
// ============================================================================

/**
 * Hook for tracking user interactions with clinical precision
 */
export function useEventTracking() {
  const trackEvent = useCallback((
    name: string,
    category: AnalyticsEvent['category'],
    properties?: Record<string, string | number | boolean>
  ) => {
    analytics.trackEvent({
      name,
      category,
      properties: {
        ...properties,
        // Add contextual information
        page_url: typeof window !== 'undefined' ? window.location.pathname : '',
        timestamp: new Date().toISOString()
      }
    });
  }, []);

  const trackButtonClick = useCallback((buttonText: string, location: string) => {
    analytics.trackButtonClick(buttonText, location);
  }, []);

  const trackFormSubmission = useCallback((formType: string, success: boolean) => {
    analytics.trackFormSubmission(formType, success);
  }, []);

  const trackError = useCallback((errorType: string, errorMessage: string, location: string) => {
    analytics.trackError(errorType, errorMessage, location);
  }, []);

  const trackEngagement = useCallback((action: string, element: string, value?: number) => {
    trackEvent('user_engagement', 'engagement', {
      action,
      element,
      value,
      engagement_time: Date.now()
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackButtonClick,
    trackFormSubmission,
    trackError,
    trackEngagement
  };
}

// ============================================================================
// CLINICAL INTERACTION TRACKING
// ============================================================================

/**
 * Specialized tracking for mental health interactions
 * Ensures privacy compliance while capturing therapeutic engagement
 */
export function useClinicalTracking() {
  const { trackEvent } = useEventTracking();

  const trackAssessmentStart = useCallback((assessmentType: 'PHQ9' | 'GAD7') => {
    trackEvent('assessment_started', 'interaction', {
      assessment_type: assessmentType,
      clinical_interaction: true
    });
  }, [trackEvent]);

  const trackAssessmentComplete = useCallback((
    assessmentType: 'PHQ9' | 'GAD7',
    score: number,
    duration: number
  ) => {
    // Note: Individual scores are NOT sent to analytics for privacy
    trackEvent('assessment_completed', 'conversion', {
      assessment_type: assessmentType,
      score_range: getScoreRange(score, assessmentType), // Generalized range only
      completion_time: duration,
      clinical_interaction: true
    });
  }, [trackEvent]);

  const trackCrisisResourceAccess = useCallback((resourceType: string) => {
    // Critical for understanding crisis intervention usage
    trackEvent('crisis_resource_accessed', 'interaction', {
      resource_type: resourceType,
      priority: 'high',
      clinical_interaction: true
    });
  }, [trackEvent]);

  const trackBreathingSession = useCallback((duration: number, completed: boolean) => {
    trackEvent('breathing_session', completed ? 'conversion' : 'interaction', {
      session_duration: duration,
      completed,
      therapeutic_activity: true
    });
  }, [trackEvent]);

  const trackMoodEntry = useCallback((entryType: 'quick' | 'detailed') => {
    // Track engagement without revealing mood data
    trackEvent('mood_entry', 'interaction', {
      entry_type: entryType,
      therapeutic_activity: true
    });
  }, [trackEvent]);

  return {
    trackAssessmentStart,
    trackAssessmentComplete,
    trackCrisisResourceAccess,
    trackBreathingSession,
    trackMoodEntry
  };
}

// Helper function to generalize scores for privacy
function getScoreRange(score: number, type: 'PHQ9' | 'GAD7'): string {
  const ranges = {
    PHQ9: [
      [0, 4, 'minimal'],
      [5, 9, 'mild'],
      [10, 14, 'moderate'],
      [15, 19, 'moderately-severe'],
      [20, 27, 'severe']
    ],
    GAD7: [
      [0, 4, 'minimal'],
      [5, 9, 'mild'],
      [10, 14, 'moderate'],
      [15, 21, 'severe']
    ]
  };

  const typeRanges = ranges[type];
  for (const [min, max, label] of typeRanges) {
    if (score >= min && score <= max) {
      return label as string;
    }
  }
  
  return 'unknown';
}

// ============================================================================
// PERFORMANCE MONITORING HOOKS
// ============================================================================

/**
 * Hook for monitoring component performance with clinical standards
 */
export function usePerformanceMonitoring(componentName: string) {
  const mountTime = useRef<number>(Date.now());
  const { trackEvent } = useEventTracking();

  useEffect(() => {
    const startTime = mountTime.current;
    
    return () => {
      const renderTime = Date.now() - startTime;
      
      // Track slow-rendering components (>100ms mount time)
      if (renderTime > 100) {
        trackEvent('slow_component_render', 'error', {
          component_name: componentName,
          render_time: renderTime,
          performance_issue: true
        });
      }
    };
  }, [componentName, trackEvent]);

  const trackComponentError = useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    trackEvent('component_error', 'error', {
      component_name: componentName,
      error_message: error.message.substring(0, 100),
      error_stack: error.stack?.substring(0, 200),
      component_stack: errorInfo?.componentStack?.substring(0, 200)
    });
  }, [componentName, trackEvent]);

  return {
    trackComponentError
  };
}

// ============================================================================
// ACCESSIBILITY TRACKING HOOKS
// ============================================================================

/**
 * Tracks accessibility interactions for compliance monitoring
 */
export function useAccessibilityTracking() {
  const { trackEvent } = useEventTracking();

  const trackScreenReaderUsage = useCallback(() => {
    // Detect screen reader usage (approximate)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      trackEvent('accessibility_feature_used', 'interaction', {
        feature_type: 'screen_reader',
        accessibility_interaction: true
      });
    }
  }, [trackEvent]);

  const trackKeyboardNavigation = useCallback((element: string) => {
    trackEvent('keyboard_navigation', 'interaction', {
      element,
      accessibility_interaction: true,
      input_method: 'keyboard'
    });
  }, [trackEvent]);

  const trackHighContrastUsage = useCallback(() => {
    if (typeof window !== 'undefined') {
      const hasHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      if (hasHighContrast) {
        trackEvent('accessibility_preference', 'interaction', {
          preference_type: 'high_contrast',
          accessibility_interaction: true
        });
      }
    }
  }, [trackEvent]);

  const trackReducedMotionUsage = useCallback(() => {
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        trackEvent('accessibility_preference', 'interaction', {
          preference_type: 'reduced_motion',
          accessibility_interaction: true
        });
      }
    }
  }, [trackEvent]);

  return {
    trackScreenReaderUsage,
    trackKeyboardNavigation,
    trackHighContrastUsage,
    trackReducedMotionUsage
  };
}

// ============================================================================
// FORM ANALYTICS HOOKS
// ============================================================================

/**
 * Comprehensive form interaction tracking for conversion optimization
 */
export function useFormAnalytics(formName: string) {
  const [formStartTime, setFormStartTime] = useState<number | null>(null);
  const { trackEvent, trackFormSubmission } = useEventTracking();

  const trackFormStart = useCallback(() => {
    const startTime = Date.now();
    setFormStartTime(startTime);
    
    trackEvent('form_started', 'interaction', {
      form_name: formName,
      form_interaction: true
    });
  }, [formName, trackEvent]);

  const trackFieldFocus = useCallback((fieldName: string) => {
    trackEvent('form_field_focus', 'interaction', {
      form_name: formName,
      field_name: fieldName,
      form_interaction: true
    });
  }, [formName, trackEvent]);

  const trackFieldError = useCallback((fieldName: string, errorMessage: string) => {
    trackEvent('form_field_error', 'error', {
      form_name: formName,
      field_name: fieldName,
      error_message: errorMessage.substring(0, 100),
      form_interaction: true
    });
  }, [formName, trackEvent]);

  const trackFormComplete = useCallback((success: boolean, errorMessage?: string) => {
    const completionTime = formStartTime ? Date.now() - formStartTime : 0;
    
    trackFormSubmission(formName, success);
    
    trackEvent('form_completed', success ? 'conversion' : 'error', {
      form_name: formName,
      completion_time: completionTime,
      success,
      error_message: errorMessage?.substring(0, 100),
      form_interaction: true
    });
  }, [formName, formStartTime, trackEvent, trackFormSubmission]);

  const trackFormAbandonment = useCallback((lastField: string) => {
    const timeSpent = formStartTime ? Date.now() - formStartTime : 0;
    
    trackEvent('form_abandoned', 'interaction', {
      form_name: formName,
      last_field: lastField,
      time_spent: timeSpent,
      form_interaction: true
    });
  }, [formName, formStartTime, trackEvent]);

  return {
    trackFormStart,
    trackFieldFocus,
    trackFieldError,
    trackFormComplete,
    trackFormAbandonment
  };
}

// ============================================================================
// CONSENT MANAGEMENT HOOK
// ============================================================================

/**
 * Hook for managing analytics consent with GDPR compliance
 */
export function useAnalyticsConsent() {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);

  useEffect(() => {
    // Check stored consent on mount
    if (typeof window !== 'undefined') {
      const storedConsent = localStorage.getItem('fullmind-analytics-consent');
      setHasConsent(storedConsent === 'true');
    }
  }, []);

  const grantConsent = useCallback(() => {
    analytics.setConsent(true);
    setHasConsent(true);
  }, []);

  const revokeConsent = useCallback(() => {
    analytics.setConsent(false);
    setHasConsent(false);
  }, []);

  const isConsentRequired = useCallback(() => {
    // Check if user is in EU (simplified check)
    if (typeof window !== 'undefined' && 'Intl' in window) {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const euTimezones = [
        'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome',
        'Europe/Madrid', 'Europe/Amsterdam', 'Europe/Vienna', 'Europe/Prague'
        // Add more EU timezones as needed
      ];
      return euTimezones.some(tz => timezone.includes(tz));
    }
    return true; // Default to requiring consent for safety
  }, []);

  return {
    hasConsent,
    grantConsent,
    revokeConsent,
    isConsentRequired: isConsentRequired()
  };
}