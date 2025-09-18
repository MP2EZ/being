/**
 * Being. Website - Utility Functions
 * Clinical-grade utility functions with type safety
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ============================================================================
// STYLING & CLASS UTILITIES
// ============================================================================

/**
 * Combines class names with Tailwind CSS class merging
 * Essential for component composition with proper CSS precedence
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ============================================================================
// TYPE VALIDATION & GUARDS
// ============================================================================

/**
 * Type-safe email validation with clinical-grade reliability
 */
export function isValidEmail(email: string): email is string & { __brand: 'EmailAddress' } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
}

/**
 * Validates phone number format (US-focused but extensible)
 */
export function isValidPhoneNumber(phone: string): phone is string & { __brand: 'PhoneNumber' } {
  const phoneRegex = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
}

/**
 * URL validation with protocol requirement for security
 */
export function isValidURL(url: string): url is string & { __brand: 'URL' } {
  try {
    const urlObject = new URL(url);
    return ['http:', 'https:'].includes(urlObject.protocol);
  } catch {
    return false;
  }
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Capitalizes the first letter of each word
 * Useful for proper name formatting
 */
export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Sanitizes string input to prevent XSS attacks
 * Essential for healthcare applications
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>"/\\&]/g, '') // Remove potentially dangerous characters
    .trim()
    .slice(0, 1000); // Limit length to prevent abuse
}

/**
 * Generates a URL-friendly slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// ============================================================================
// DATE & TIME UTILITIES
// ============================================================================

/**
 * Formats date in a healthcare-appropriate format
 * Consistent with medical record standards
 */
export function formatDate(date: Date, options?: {
  includeTime?: boolean;
  format?: 'short' | 'medium' | 'long';
}): string {
  const { includeTime = false, format = 'medium' } = options || {};

  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: format === 'short' ? 'numeric' : format === 'medium' ? 'short' : 'long',
    day: 'numeric',
  };

  if (includeTime) {
    dateOptions.hour = 'numeric';
    dateOptions.minute = '2-digit';
    dateOptions.timeZoneName = 'short';
  }

  return new Intl.DateTimeFormat('en-US', dateOptions).format(date);
}

/**
 * Gets relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, seconds] of Object.entries(intervals)) {
    const interval = Math.floor(diffInSeconds / seconds);
    if (interval >= 1) {
      return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
    }
  }

  return 'Just now';
}

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

/**
 * Debounces function execution for performance optimization
 * Critical for search inputs and API calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttles function execution to limit call frequency
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ============================================================================
// ACCESSIBILITY UTILITIES
// ============================================================================

/**
 * Generates accessible IDs for form elements and ARIA relationships
 */
export function generateId(prefix: string = 'fm'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Checks if user prefers reduced motion (respects accessibility preferences)
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true; // SSR safety
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Calculates color contrast ratio for accessibility compliance
 */
export function getContrastRatio(color1: string, color2: string): number {
  // Simplified implementation - production should use more robust color parsing
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Safely parses JSON with error handling
 */
export function safeJsonParse<T = unknown>(
  json: string,
  fallback: T
): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Creates error messages safe for user display
 * Prevents sensitive information exposure
 */
export function createSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Only expose safe, user-friendly error messages
    const safeMessages = [
      'Network error',
      'Validation error',
      'Not found',
      'Unauthorized',
      'Server error'
    ];
    
    for (const safe of safeMessages) {
      if (error.message.toLowerCase().includes(safe.toLowerCase())) {
        return error.message;
      }
    }
  }
  
  // Generic safe message for unknown errors
  return 'An unexpected error occurred. Please try again or contact support.';
}

// ============================================================================
// CLINICAL & HEALTHCARE UTILITIES
// ============================================================================

/**
 * Validates assessment scores are within valid ranges
 */
export function validateAssessmentScore(score: number, type: 'PHQ9' | 'GAD7'): boolean {
  const ranges = {
    PHQ9: [0, 27],
    GAD7: [0, 21]
  };
  
  const [min, max] = ranges[type];
  return Number.isInteger(score) && score >= min && score <= max;
}

/**
 * Determines crisis threshold based on assessment scores
 */
export function isCrisisScore(score: number, type: 'PHQ9' | 'GAD7'): boolean {
  const thresholds = {
    PHQ9: 20, // Severe depression threshold
    GAD7: 15  // Severe anxiety threshold
  };
  
  return score >= thresholds[type];
}

// ============================================================================
// BROWSER & ENVIRONMENT UTILITIES
// ============================================================================

/**
 * Safely checks if code is running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Gets viewport dimensions safely
 */
export function getViewportSize(): { width: number; height: number } {
  if (!isBrowser()) {
    return { width: 1920, height: 1080 }; // Default for SSR
  }
  
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

/**
 * Detects if user is on mobile device
 */
export function isMobileDevice(): boolean {
  if (!isBrowser()) return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// ============================================================================
// CONSTANTS FOR CLINICAL APPLICATIONS
// ============================================================================

export const CLINICAL_CONSTANTS = {
  MAX_INPUT_LENGTH: 1000,
  MIN_PASSWORD_LENGTH: 8,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  CRISIS_HOTLINE: '988',
  EMERGENCY: '911',
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
} as const;

export const ACCESSIBILITY_CONSTANTS = {
  MIN_CONTRAST_AA: 4.5,
  MIN_CONTRAST_AAA: 7,
  MIN_TOUCH_TARGET: 44, // pixels
  MAX_READING_LEVEL: 8, // grade level
} as const;

export const PERFORMANCE_CONSTANTS = {
  MAX_LCP: 2500, // milliseconds
  MAX_FID: 100,  // milliseconds
  MAX_CLS: 0.1,  // score
  DEBOUNCE_SEARCH: 300, // milliseconds
  THROTTLE_SCROLL: 100, // milliseconds
} as const;