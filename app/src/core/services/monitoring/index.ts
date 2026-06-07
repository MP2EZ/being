/**
 * MONITORING SERVICES BARREL
 *
 * Re-exports:
 * - Error tracking trackers (live, used by deployment / resilience / analytics)
 * - Crisis monitoring service (live, activated from App.tsx)
 * - Logging facades for integrated monitoring
 *
 * Note: Sentry is the dashboard surface; local logging is the dev-time signal.
 * Sentry init lives in `ExternalErrorReporter.ts` and is wired from `App.tsx`.
 *
 * USAGE:
 * import { errorMonitoringService, trackCrisisError, trackSyncError } from '@/core/services/monitoring';
 */

// Core Error Monitoring Service — re-export
export {
  ErrorMonitoringService,
  errorMonitoringService,
  ErrorSeverity,
  ErrorCategory
} from './ErrorMonitoringService';

// Convenience error tracking functions
export {
  trackError,
  trackCrisisError,
  trackAuthError,
  trackSyncError,
  trackAnalyticsError,
  trackSecurityError,
  trackPerformanceError
} from './ErrorMonitoringService';

// Re-export logging for integrated monitoring
export {
  logError,
  logSecurity,
  logCrisis,
  logPerformance,
  LogCategory
} from '../logging';

// Crisis monitoring service — activated from App.tsx for safety oversight
export {
  crisisMonitoringService,
  initializeCrisisMonitoring
} from './CrisisMonitoringService';

export type {
  CrisisMonitoringMetrics,
  CrisisAlert
} from './CrisisMonitoringService';
