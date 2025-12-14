/**
 * LOGGING SERVICE EXPORTS - Production Safe
 *
 * USAGE GUIDELINES:
 * - Always use logger methods instead of logPerformance
 * - Never log PHI, user IDs, assessment scores, or session data
 * - Use appropriate log categories for filtering
 * - Include context for debugging but sanitize all data
 *
 * MIGRATION EXAMPLE:
 * Before: console.log('User assessment completed:', result);
 * After:  logger.assessment('Assessment completed', { type: 'PHQ-9', questionCount: 9 });
 */

export {
  ProductionLogger,
  logger,
  LogLevel,
  LogCategory
} from './ProductionLogger';

/**
 * CONVENIENCE METHODS - Quick Access
 */
import { logger, LogCategory } from './ProductionLogger';

/**
 * Crisis logging with safety guarantees
 */
export const logCrisis = (message: string, context?: {
  detectionTime?: number;
  interventionType?: 'display' | 'modal' | 'redirect';
  severity?: 'moderate' | 'high' | 'critical' | 'emergency';
}) => {
  logger.crisis(message, context);
};

/**
 * Performance logging without PHI
 */
export const logPerformance = (operation: string, duration: number, metadata?: {
  threshold?: number;
  target?: number;
  category?: 'render' | 'network' | 'storage' | 'computation';
} & Record<string, any>) => {
  logger.performance(operation, duration, metadata);
};

/**
 * Assessment logging with sanitized context
 */
export const logAssessment = (event: string, context?: {
  type?: 'PHQ-9' | 'GAD-7' | 'custom';
  questionCount?: number;
  completionTime?: number;
  flow?: 'onboarding' | 'checkin' | 'standalone';
}) => {
  logger.assessment(event, context);
};

/**
 * Security event logging
 */
export const logSecurity = (event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: {
  component?: string;
  action?: string;
  result?: 'success' | 'failure' | 'blocked';
} & Record<string, any>) => {
  logger.security(event, severity, context);
};

/**
 * Authentication logging without credentials
 */
export const logAuth = (event: string, context?: {
  method?: 'biometric' | 'password' | 'token';
  result?: 'success' | 'failure' | 'timeout';
  duration?: number;
}) => {
  logger.info(LogCategory.AUTH, event, context);
};

/**
 * Analytics logging with privacy protection
 */
export const logAnalytics = (event: string, context?: {
  category?: string;
  duration?: number;
  result?: 'success' | 'failure';
}) => {
  logger.info(LogCategory.ANALYTICS, event, context);
};

/**
 * Sync operation logging
 */
export const logSync = (event: string, context?: {
  direction?: 'upload' | 'download' | 'bidirectional';
  duration?: number;
  size?: number; // bytes
  result?: 'success' | 'failure' | 'partial';
}) => {
  logger.info(LogCategory.SYNC, event, context);
};

/**
 * Accessibility logging
 */
export const logAccessibility = (event: string, context?: {
  feature?: 'screenReader' | 'voiceOver' | 'highContrast' | 'largeFonts';
  action?: 'enabled' | 'disabled' | 'triggered';
  duration?: number;
}) => {
  logger.info(LogCategory.ACCESSIBILITY, event, context);
};

/**
 * System/App lifecycle logging
 */
export const logSystem = (event: string, context?: {
  state?: 'active' | 'background' | 'inactive';
  duration?: number;
  memory?: number; // MB
}) => {
  logger.info(LogCategory.SYSTEM, event, context);
};

/**
 * ERROR LOGGING SHORTCUTS
 */
export const logError = (category: LogCategory, message: string, error?: Error) => {
  const context = error ? {
    errorName: error.name,
    errorMessage: error.message,
    stackTrace: error.stack?.split('\n').slice(0, 5).join('\n') // Limited stack trace
  } : undefined;

  logger.error(category, message, context);
};

/**
 * DEVELOPMENT HELPERS
 */
export const logDebug = (category: LogCategory, message: string, context?: any) => {
  logger.debug(category, message, context);
};

/**
 * MIGRATION HELPER - Console.log Replacement
 *
 * Use this during migration to identify areas that need proper categorization
 */
export const logUncategorized = (message: string, context?: any) => {
  logger.warn(LogCategory.SYSTEM, `[UNCATEGORIZED] ${message}`, context);
};

/**
 * AUDIT AND MAINTENANCE
 */
export const getLogAuditTrail = () => {
  return logger.getAuditTrail();
};

export const clearLogAuditTrail = async () => {
  await logger.clearAuditTrail();
};

export const emergencyLoggerShutdown = (reason: string) => {
  logger.emergencyShutdown(reason);
};

/**
 * INFRA-61: Rate limiter statistics
 */
export const getRateLimiterStats = () => {
  return logger.getRateLimiterStats();
};

/**
 * INFRA-61: Enable log encryption
 */
export const enableLogEncryption = async (encryptionService: any) => {
  await logger.enableEncryption(encryptionService);
};

/**
 * INFRA-61: Disable log encryption
 */
export const disableLogEncryption = () => {
  logger.disableEncryption();
};

/**
 * INFRA-61: External Error Reporting
 */
export {
  ExternalErrorReporter,
  externalErrorReporter,
  reportExternalError,
  killExternalReporting,
  isExternalReportingActive,
} from './ExternalErrorReporter';

/**
 * INFRA-61: Initialize external error reporting
 */
export const initializeExternalReporting = async (dsn?: string) => {
  const { externalErrorReporter } = await import('./ExternalErrorReporter');
  return externalErrorReporter.initialize(dsn);
};