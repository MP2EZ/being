/**
 * FullMind Website - Shared Constants
 * Constants shared between website and React Native app for ecosystem consistency
 */

// ============================================================================
// BRAND & DESIGN SYSTEM CONSTANTS
// ============================================================================

/**
 * Theme variants matching React Native app themes
 * Ensures visual consistency across web and mobile
 */
export const THEME_VARIANTS = {
  MORNING: {
    primary: '#FF9F43',
    success: '#E8863A',
    name: 'morning' as const,
    time: 'morning' as const
  },
  MIDDAY: {
    primary: '#40B5AD',
    success: '#2C8A82',
    name: 'midday' as const,
    time: 'midday' as const
  },
  EVENING: {
    primary: '#4A7C59',
    success: '#2D5016',
    name: 'evening' as const,
    time: 'evening' as const
  }
} as const;

/**
 * Typography scale matching React Native app
 */
export const TYPOGRAPHY = {
  FONT_FAMILIES: {
    SANS: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
    MONO: ['var(--font-geist-mono)', 'Menlo', 'monospace']
  },
  FONT_SIZES: {
    XS: '0.75rem',    // 12px
    SM: '0.875rem',   // 14px
    BASE: '1rem',     // 16px
    LG: '1.125rem',   // 18px
    XL: '1.25rem',    // 20px
    '2XL': '1.5rem',  // 24px
    '3XL': '1.875rem', // 30px
    '4XL': '2.25rem',  // 36px
    '5XL': '3rem'      // 48px
  },
  LINE_HEIGHTS: {
    TIGHT: 1.2,
    NORMAL: 1.5,
    RELAXED: 1.6
  }
} as const;

/**
 * Spacing scale matching React Native app
 */
export const SPACING = {
  XS: 4,   // 4px
  SM: 8,   // 8px
  MD: 16,  // 16px
  LG: 24,  // 24px
  XL: 32,  // 32px
  '2XL': 48, // 48px
  '3XL': 64, // 64px
  '4XL': 80  // 80px
} as const;

// ============================================================================
// CLINICAL & HEALTHCARE CONSTANTS
// ============================================================================

/**
 * Assessment constants matching React Native app
 */
export const ASSESSMENTS = {
  PHQ9: {
    TITLE: 'PHQ-9 Depression Assessment',
    QUESTION_COUNT: 9,
    MAX_SCORE: 27,
    CRISIS_THRESHOLD: 20,
    SEVERITY_RANGES: {
      MINIMAL: [0, 4],
      MILD: [5, 9],
      MODERATE: [10, 14],
      MODERATELY_SEVERE: [15, 19],
      SEVERE: [20, 27]
    }
  },
  GAD7: {
    TITLE: 'GAD-7 Anxiety Assessment',
    QUESTION_COUNT: 7,
    MAX_SCORE: 21,
    CRISIS_THRESHOLD: 15,
    SEVERITY_RANGES: {
      MINIMAL: [0, 4],
      MILD: [5, 9],
      MODERATE: [10, 14],
      SEVERE: [15, 21]
    }
  }
} as const;

/**
 * MBCT practice constants
 */
export const MBCT_PRACTICES = {
  BREATHING_SPACE: {
    TITLE: '3-Minute Breathing Space',
    DURATION: 180, // 3 minutes in seconds
    STEPS: [
      { name: 'Awareness', duration: 60 },
      { name: 'Gathering', duration: 60 },
      { name: 'Widening', duration: 60 }
    ]
  },
  BODY_SCAN: {
    TITLE: 'Body Scan Meditation',
    DURATION: 1200, // 20 minutes
    DIFFICULTY: 'intermediate'
  },
  MINDFUL_MOVEMENT: {
    TITLE: 'Mindful Movement',
    DURATION: 900, // 15 minutes
    DIFFICULTY: 'beginner'
  }
} as const;

/**
 * Crisis resources matching app configuration
 */
export const CRISIS_RESOURCES = {
  NATIONAL_SUICIDE_PREVENTION: {
    NUMBER: '988',
    NAME: 'National Suicide Prevention Lifeline',
    AVAILABLE: '24/7',
    LANGUAGES: ['English', 'Spanish']
  },
  CRISIS_TEXT_LINE: {
    NUMBER: '741741',
    NAME: 'Crisis Text Line',
    AVAILABLE: '24/7',
    TYPE: 'text'
  },
  EMERGENCY: {
    NUMBER: '911',
    NAME: 'Emergency Services',
    TYPE: 'emergency'
  }
} as const;

// ============================================================================
// PERFORMANCE & ACCESSIBILITY CONSTANTS
// ============================================================================

/**
 * Performance thresholds for clinical-grade UX
 */
export const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals (matching mobile performance requirements)
  LCP: 2000,  // Largest Contentful Paint - 2s (stricter than mobile for web)
  FID: 50,    // First Input Delay - 50ms (stricter than mobile)
  CLS: 0.1,   // Cumulative Layout Shift
  TTFB: 500,  // Time to First Byte
  FCP: 1500,  // First Contentful Paint

  // Bundle sizes (clinical apps need fast loading)
  MAX_BUNDLE_SIZE: 250 * 1024,      // 250KB JavaScript
  MAX_CSS_SIZE: 50 * 1024,          // 50KB CSS
  MAX_IMAGE_SIZE_PER_PAGE: 500 * 1024, // 500KB images per page

  // Critical user interactions (matching app responsiveness)
  BUTTON_RESPONSE: 100,  // Button press response time (ms)
  FORM_VALIDATION: 200,  // Form validation response time (ms)
  SEARCH_DEBOUNCE: 300,  // Search input debounce (ms)
  ANIMATION_DURATION: 200 // Standard animation duration (ms)
} as const;

/**
 * Accessibility standards for mental health users
 */
export const ACCESSIBILITY_STANDARDS = {
  // WCAG compliance levels
  WCAG_LEVEL: 'AA' as const,
  
  // Color contrast ratios
  CONTRAST_RATIOS: {
    NORMAL_TEXT: 4.5,    // WCAG AA for normal text
    LARGE_TEXT: 3.0,     // WCAG AA for large text
    UI_COMPONENTS: 3.0   // WCAG AA for UI components
  },

  // Touch targets (following mobile guidelines)
  MIN_TOUCH_TARGET: 44,  // Minimum touch target size (px)
  
  // Reading level for mental health content
  MAX_READING_LEVEL: 8,  // 8th grade reading level
  
  // Focus management
  FOCUS_VISIBLE_WIDTH: 2,  // Focus ring width (px)
  FOCUS_OFFSET: 2,         // Focus ring offset (px)

  // Motion preferences
  ANIMATION_DURATION_REDUCED: 50, // Reduced animation duration (ms)
  PARALLAX_DISABLED: true         // Disable parallax for reduced motion
} as const;

// ============================================================================
// API & DATA CONSTANTS
// ============================================================================

/**
 * API configuration constants
 */
export const API_CONFIG = {
  TIMEOUTS: {
    DEFAULT: 10000,    // 10 seconds default timeout
    CRITICAL: 5000,    // 5 seconds for critical operations
    UPLOADS: 30000     // 30 seconds for file uploads
  },
  
  RETRY_CONFIG: {
    MAX_ATTEMPTS: 3,
    BACKOFF_FACTOR: 2,
    INITIAL_DELAY: 1000  // 1 second initial delay
  },

  RATE_LIMITS: {
    CONTACT_FORM: 5,     // 5 submissions per hour
    NEWSLETTER: 3,       // 3 signups per hour
    API_CALLS: 100       // 100 API calls per minute
  }
} as const;

/**
 * Data validation constants
 */
export const VALIDATION = {
  EMAIL: {
    MAX_LENGTH: 254,  // RFC 5321 limit
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  
  PHONE: {
    PATTERN: /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/
  },
  
  TEXT_INPUT: {
    MAX_LENGTH: 1000,   // Prevent abuse
    MIN_LENGTH: 1
  },
  
  MESSAGE: {
    MAX_LENGTH: 5000,   // Contact form messages
    MIN_LENGTH: 10
  }
} as const;

// ============================================================================
// FEATURE FLAGS & ENVIRONMENT
// ============================================================================

/**
 * Feature flags for gradual rollout
 */
export const FEATURE_FLAGS = {
  ANALYTICS_ENABLED: true,
  PERFORMANCE_MONITORING: true,
  A11Y_ANNOUNCEMENTS: true,
  CRISIS_CHAT_WIDGET: false,      // Coming in Phase 2
  THERAPIST_PORTAL: false,        // Coming in Phase 3
  MULTILINGUAL_SUPPORT: false,    // Coming in Phase 4
  DARK_MODE: false               // Coming in Phase 2
} as const;

/**
 * Environment-specific constants
 */
export const ENVIRONMENT = {
  DEVELOPMENT: {
    API_BASE_URL: 'http://localhost:3001',
    ANALYTICS_DEBUG: true,
    PERFORMANCE_BUDGET_STRICT: false
  },
  
  STAGING: {
    API_BASE_URL: 'https://staging-api.fullmind.app',
    ANALYTICS_DEBUG: false,
    PERFORMANCE_BUDGET_STRICT: true
  },
  
  PRODUCTION: {
    API_BASE_URL: 'https://api.fullmind.app',
    ANALYTICS_DEBUG: false,
    PERFORMANCE_BUDGET_STRICT: true
  }
} as const;

// ============================================================================
// CONTENT & LOCALIZATION CONSTANTS
// ============================================================================

/**
 * Content constants matching app copy
 */
export const CONTENT = {
  CRISIS_DISCLAIMER: 'If you are experiencing a mental health emergency, please call 988 or 911 immediately.',
  
  PRIVACY_NOTICE: 'Your privacy is our priority. We use clinical-grade security to protect your mental health data.',
  
  CLINICAL_DISCLAIMER: 'FullMind is not a replacement for professional mental health treatment. Please consult with a healthcare provider.',
  
  ACCESSIBILITY_STATEMENT: 'FullMind is committed to digital accessibility for people with disabilities.',
  
  DATA_RETENTION_NOTICE: 'Your assessment data is encrypted and stored securely. You can delete your data at any time.'
} as const;

/**
 * Error messages matching app experience
 */
export const ERROR_MESSAGES = {
  NETWORK: 'Network connection lost. Please check your internet connection and try again.',
  VALIDATION: 'Please check the information you entered and try again.',
  SERVER: 'Something went wrong on our end. Please try again in a few moments.',
  RATE_LIMIT: 'Too many requests. Please wait a moment before trying again.',
  UNAUTHORIZED: 'Session expired. Please refresh the page and try again.',
  NOT_FOUND: 'The requested resource could not be found.',
  MAINTENANCE: 'FullMind is temporarily unavailable for maintenance. Please try again shortly.'
} as const;

/**
 * Success messages matching app tone
 */
export const SUCCESS_MESSAGES = {
  FORM_SUBMITTED: 'Thank you for reaching out. We\'ll get back to you within 24 hours.',
  NEWSLETTER_SUBSCRIBED: 'Welcome! You\'ll receive updates about FullMind\'s clinical features.',
  WAITLIST_JOINED: 'You\'re on the list! We\'ll notify you when FullMind becomes available.',
  CONTACT_SENT: 'Your message has been sent. Our team will respond soon.',
  FEEDBACK_SUBMITTED: 'Thank you for your feedback. It helps us improve FullMind.'
} as const;

// ============================================================================
// INTEGRATION HELPERS
// ============================================================================

/**
 * Helper functions for React Native integration
 */
export const INTEGRATION_HELPERS = {
  /**
   * Get current theme based on time of day (matching app logic)
   */
  getCurrentTheme: (): keyof typeof THEME_VARIANTS => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'MORNING';
    if (hour >= 12 && hour < 18) return 'MIDDAY';
    return 'EVENING';
  },

  /**
   * Format assessment score for display (matching app formatting)
   */
  formatAssessmentScore: (score: number, type: 'PHQ9' | 'GAD7'): {
    score: number;
    severity: string;
    isCrisis: boolean;
  } => {
    const assessment = ASSESSMENTS[type];
    const isCrisis = score >= assessment.CRISIS_THRESHOLD;
    
    let severity = 'unknown';
    Object.entries(assessment.SEVERITY_RANGES).forEach(([key, [min, max]]) => {
      if (score >= min && score <= max) {
        severity = key.toLowerCase().replace('_', '-');
      }
    });

    return { score, severity, isCrisis };
  },

  /**
   * Get crisis resource by type (matching app configuration)
   */
  getCrisisResource: (type: 'phone' | 'text' | 'emergency') => {
    switch (type) {
      case 'phone': return CRISIS_RESOURCES.NATIONAL_SUICIDE_PREVENTION;
      case 'text': return CRISIS_RESOURCES.CRISIS_TEXT_LINE;
      case 'emergency': return CRISIS_RESOURCES.EMERGENCY;
      default: return CRISIS_RESOURCES.NATIONAL_SUICIDE_PREVENTION;
    }
  }
} as const;

// ============================================================================
// TYPE EXPORTS FOR ECOSYSTEM CONSISTENCY
// ============================================================================

export type ThemeVariant = keyof typeof THEME_VARIANTS;
export type AssessmentType = keyof typeof ASSESSMENTS;
export type CrisisResourceType = keyof typeof CRISIS_RESOURCES;
export type PerformanceMetric = keyof typeof PERFORMANCE_THRESHOLDS;
export type ValidationField = keyof typeof VALIDATION;