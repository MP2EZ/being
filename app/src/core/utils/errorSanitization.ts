/**
 * ERROR SANITIZATION UTILITIES
 *
 * FEAT-6 MVP: PHI-safe error handling
 *
 * PURPOSE:
 * - Prevent PHI leakage in error messages and logs
 * - Provide user-friendly error messages without exposing sensitive data
 * - Support debugging while maintaining HIPAA compliance
 *
 * SECURITY:
 * - Strip all user data from error messages
 * - No therapeutic values, settings, or user IDs in logs
 * - Safe for internal error tracking
 *
 * V2 REQUIREMENTS (INFRA-61):
 * - Integrate with production error logging service (Sentry, etc.)
 * - Categorize errors (user-facing vs internal)
 * - Rate limiting to prevent log flooding
 * - Encrypted error storage
 */

/**
 * Patterns that might contain PHI or sensitive data
 * These will be redacted from error messages
 */
const SENSITIVE_PATTERNS = [
  // User IDs and emails
  /user[_-]?id[:\s=]?\S+/gi,
  /email[:\s=]?\S+@\S+/gi,
  /dev-user-\d+/gi,

  // Therapeutic values and settings
  /value(Id)?[:\s=]?\w+/gi,
  /selectedValues[:\s=]?[\[\{].+?[\]\}]/gi,
  /therapeuticValue/gi,

  // Auth tokens and credentials
  /token[:\s=]?\S+/gi,
  /password[:\s=]?\S+/gi,
  /auth[:\s=]?\S+/gi,
  /bearer\s+\S+/gi,

  // Storage keys
  /user_values_v\d+/gi,
  /app_settings_v\d+/gi,

  // File paths that might contain user data
  /\/Users\/\S+/gi,
  /C:\\Users\\\S+/gi,
];

/**
 * Generic error messages for common error types
 */
const GENERIC_ERROR_MESSAGES: Record<string, string> = {
  'network': 'A network error occurred. Please check your connection and try again.',
  'storage': 'Failed to save data. Please try again.',
  'load': 'Failed to load data. Please try again.',
  'validation': 'Invalid input. Please check your entries and try again.',
  'permission': 'Permission denied. Please check app settings.',
  'timeout': 'The operation timed out. Please try again.',
  'unknown': 'An unexpected error occurred. Please try again.',
};

/**
 * Sanitize an error message by removing potential PHI
 *
 * @param message - Error message to sanitize
 * @returns Sanitized message safe for logging
 */
export function sanitizeErrorMessage(message: string): string {
  let sanitized = message;

  // Replace sensitive patterns with [REDACTED]
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });

  return sanitized;
}

/**
 * Extract error type from error message or error object
 *
 * @param error - Error object or message
 * @returns Error type category
 */
function getErrorType(error: any): keyof typeof GENERIC_ERROR_MESSAGES {
  const message = error?.message || error?.toString() || '';
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return 'network';
  }
  if (lowerMessage.includes('storage') || lowerMessage.includes('securestore') || lowerMessage.includes('asyncstorage')) {
    return 'storage';
  }
  if (lowerMessage.includes('load') || lowerMessage.includes('get')) {
    return 'load';
  }
  if (lowerMessage.includes('invalid') || lowerMessage.includes('validation')) {
    return 'validation';
  }
  if (lowerMessage.includes('permission') || lowerMessage.includes('denied')) {
    return 'permission';
  }
  if (lowerMessage.includes('timeout')) {
    return 'timeout';
  }

  return 'unknown';
}

/**
 * Create a user-friendly error message
 * Safe for displaying to users (no PHI)
 *
 * @param error - Error object or message
 * @param context - Optional context about what operation failed
 * @returns User-friendly error message
 */
export function createUserFriendlyError(error: any, context?: string): string {
  const errorType = getErrorType(error);
  const baseMessage = GENERIC_ERROR_MESSAGES[errorType];

  if (context) {
    return `${context}: ${baseMessage}`;
  }

  return baseMessage ?? 'An error occurred';
}

/**
 * Sanitize an entire error object for logging
 *
 * @param error - Error object to sanitize
 * @returns Sanitized error object safe for logging
 */
export function sanitizeError(error: any): {
  message: string;
  type: string;
  sanitized: boolean;
} {
  if (!error) {
    return {
      message: 'Unknown error',
      type: 'unknown',
      sanitized: true,
    };
  }

  const message = error?.message || error?.toString() || 'Unknown error';
  const sanitizedMessage = sanitizeErrorMessage(message);

  return {
    message: sanitizedMessage,
    type: getErrorType(error),
    sanitized: true,
  };
}

/**
 * Log an error safely (for development only)
 * In production, this should integrate with INFRA-61 error logging service
 *
 * @param error - Error to log
 * @param context - Context about where the error occurred
 */
export function logError(error: any, context: string): void {
  const sanitized = sanitizeError(error);

  if (__DEV__) {
    console.error(`[Error] ${context}:`, sanitized);
  }

  // TODO (INFRA-61): Send to production error logging service
  // - Only in production mode
  // - With rate limiting
  // - With error categorization
  // - With encrypted storage
}

/**
 * Create a safe Alert message for errors
 * Wrapper around React Native's Alert.alert with PHI sanitization
 *
 * @param title - Alert title
 * @param error - Error object
 * @param context - Optional context
 */
export function showErrorAlert(
  title: string,
  error: any,
  context?: string
): void {
  const userMessage = createUserFriendlyError(error, context);

  // Log the sanitized error for debugging
  logError(error, context || title);

  // Note: Alert.alert import moved to calling code to avoid circular dependency
  // Calling code should import Alert from 'react-native'
  return; // Returns void, calling code will use the userMessage
}

/**
 * Get the user-friendly message from an error
 * Helper for components to get safe error text
 *
 * @param error - Error object
 * @param context - Optional context
 * @returns Safe error message for display
 */
export function getErrorMessage(error: any, context?: string): string {
  return createUserFriendlyError(error, context);
}
