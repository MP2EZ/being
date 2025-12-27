/**
 * PRODUCTION ERROR MONITORING SERVICE
 * Week 4 Phase 1c - Critical Production Infrastructure
 *
 * SAFETY-CRITICAL ERROR MONITORING:
 * - Real-time error aggregation without PHI exposure
 * - Crisis escalation for mental health safety events
 * - Intelligent alerting with severity classification
 * - Production error tracking with privacy compliance
 *
 * MONITORING PRIORITIES:
 * - Crisis detection failures (immediate escalation)
 * - Authentication/security failures (high priority)
 * - Sync operation failures (medium priority)
 * - Analytics errors (low priority, batch processing)
 *
 * COMPLIANCE FEATURES:
 * - Zero PHI in error reports
 * - Privacy-compliant error aggregation
 * - Privacy-preserving error classification
 * - Secure audit trail integration
 */

import { logError, logSecurity, logCrisis, LogCategory } from '../logging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Error Severity Classification
export enum ErrorSeverity {
  LOW = 1,      // UI glitches, minor performance issues
  MEDIUM = 2,   // Sync failures, non-critical service issues
  HIGH = 3,     // Authentication failures, security events
  CRITICAL = 4, // Crisis detection failures, data corruption
  EMERGENCY = 5 // System-wide failures, safety-critical events
}

// Error Categories for Production Monitoring
export enum ErrorCategory {
  CRISIS_DETECTION = 'crisis_detection',
  AUTHENTICATION = 'authentication',
  SYNC_OPERATION = 'sync_operation',
  ANALYTICS = 'analytics',
  NETWORK = 'network',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  UI_RENDERING = 'ui_rendering',
  DATA_CORRUPTION = 'data_corruption'
}

// Error Event Structure
interface ErrorEvent {
  id: string;
  timestamp: number;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  context: {
    component?: string;
    operation?: string;
    userAgent?: string;
    platform?: string;
    version?: string;
  };
  fingerprint: string; // For error grouping/deduplication
  count: number;       // How many times this error occurred
}

// Alert Configuration
interface AlertConfig {
  enabled: boolean;
  threshold: number;        // Number of occurrences
  timeWindow: number;       // Time window in milliseconds
  cooldown: number;         // Cooldown period between alerts
  escalation: boolean;      // Whether to escalate after repeated occurrences
}

// Monitoring Configuration
interface MonitoringConfig {
  enabled: boolean;
  maxErrorEvents: number;
  batchSize: number;
  flushInterval: number;    // milliseconds
  alertConfigs: Record<ErrorCategory, AlertConfig>;
}

/**
 * PRODUCTION ERROR MONITORING SERVICE
 */
export class ErrorMonitoringService {
  private static instance: ErrorMonitoringService;
  private errorEvents: ErrorEvent[] = [];
  private alertHistory: Map<string, number> = new Map(); // fingerprint -> last alert time
  private isInitialized: boolean = false;
  private flushTimer: NodeJS.Timeout | null = null;

  private readonly config: MonitoringConfig = {
    enabled: process.env.NODE_ENV === 'production',
    maxErrorEvents: 500,
    batchSize: 50,
    flushInterval: 30000, // 30 seconds

    // Alert Configuration by Category
    alertConfigs: {
      [ErrorCategory.CRISIS_DETECTION]: {
        enabled: true,
        threshold: 1,     // Any crisis detection failure is critical
        timeWindow: 60000, // 1 minute
        cooldown: 300000,  // 5 minutes
        escalation: true
      },
      [ErrorCategory.AUTHENTICATION]: {
        enabled: true,
        threshold: 3,     // 3 auth failures
        timeWindow: 300000, // 5 minutes
        cooldown: 600000,  // 10 minutes
        escalation: true
      },
      [ErrorCategory.SYNC_OPERATION]: {
        enabled: true,
        threshold: 5,     // 5 sync failures
        timeWindow: 600000, // 10 minutes
        cooldown: 900000,  // 15 minutes
        escalation: false
      },
      [ErrorCategory.SECURITY]: {
        enabled: true,
        threshold: 1,     // Any security event
        timeWindow: 60000, // 1 minute
        cooldown: 300000,  // 5 minutes
        escalation: true
      },
      [ErrorCategory.ANALYTICS]: {
        enabled: true,
        threshold: 10,    // 10 analytics failures
        timeWindow: 1800000, // 30 minutes
        cooldown: 1800000,   // 30 minutes
        escalation: false
      },
      [ErrorCategory.NETWORK]: {
        enabled: true,
        threshold: 10,    // 10 network failures
        timeWindow: 600000, // 10 minutes
        cooldown: 900000,  // 15 minutes
        escalation: false
      },
      [ErrorCategory.PERFORMANCE]: {
        enabled: true,
        threshold: 20,    // 20 performance issues
        timeWindow: 900000, // 15 minutes
        cooldown: 1800000, // 30 minutes
        escalation: false
      },
      [ErrorCategory.UI_RENDERING]: {
        enabled: true,
        threshold: 15,    // 15 UI issues
        timeWindow: 900000, // 15 minutes
        cooldown: 1800000, // 30 minutes
        escalation: false
      },
      [ErrorCategory.DATA_CORRUPTION]: {
        enabled: true,
        threshold: 1,     // Any data corruption
        timeWindow: 60000, // 1 minute
        cooldown: 300000,  // 5 minutes
        escalation: true
      }
    }
  };

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): ErrorMonitoringService {
    if (!ErrorMonitoringService.instance) {
      ErrorMonitoringService.instance = new ErrorMonitoringService();
    }
    return ErrorMonitoringService.instance;
  }

  /**
   * Initialize the error monitoring service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Start periodic flushing
      this.flushTimer = setInterval(() => {
        this.flushErrorEvents();
      }, this.config.flushInterval);

      this.isInitialized = true;

      logSecurity('Error monitoring service initialized', 'low', {
        component: 'error_monitoring',
        config: {
          enabled: this.config.enabled,
          batchSize: this.config.batchSize,
          flushInterval: this.config.flushInterval
        }
      });

    } catch (error) {
      logError(LogCategory.SECURITY, 'Failed to initialize error monitoring', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Track an error event with automatic severity and alerting
   */
  async trackError(
    category: ErrorCategory,
    message: string,
    error?: Error,
    context?: any
  ): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const severity = this.classifyErrorSeverity(category, error);
      const fingerprint = this.generateErrorFingerprint(category, message, error);

      // Check if we have this error already
      const existingError = this.errorEvents.find(e => e.fingerprint === fingerprint);

      if (existingError) {
        // Update existing error count
        existingError.count++;
        existingError.timestamp = Date.now();
      } else {
        // Create new error event
        const errorEvent: ErrorEvent = {
          id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          category,
          severity,
          message: this.sanitizeErrorMessage(message),
          context: this.sanitizeErrorContext(context),
          fingerprint,
          count: 1
        };

        this.errorEvents.push(errorEvent);

        // Maintain buffer size
        if (this.errorEvents.length > this.config.maxErrorEvents) {
          this.errorEvents = this.errorEvents.slice(-this.config.maxErrorEvents);
        }
      }

      // Check for alerting
      await this.checkAndTriggerAlerts(category, fingerprint);

      // Log the error through our secure logging system
      this.logErrorEvent(category, severity, message, error, context);

    } catch (monitoringError) {
      // Fail silently to prevent monitoring errors from breaking the app
      logError(LogCategory.SECURITY, 'Error monitoring tracking failed', monitoringError instanceof Error ? monitoringError : undefined);
    }
  }

  /**
   * Classify error severity based on category and content
   */
  private classifyErrorSeverity(category: ErrorCategory, error?: Error): ErrorSeverity {
    // Crisis detection failures are always critical
    if (category === ErrorCategory.CRISIS_DETECTION) {
      return ErrorSeverity.CRITICAL;
    }

    // Data corruption is always critical
    if (category === ErrorCategory.DATA_CORRUPTION) {
      return ErrorSeverity.CRITICAL;
    }

    // Security events are high priority
    if (category === ErrorCategory.SECURITY) {
      return ErrorSeverity.HIGH;
    }

    // Authentication failures are high priority
    if (category === ErrorCategory.AUTHENTICATION) {
      return ErrorSeverity.HIGH;
    }

    // Check error message/stack for critical keywords
    const errorText = (error?.message + ' ' + error?.stack || '').toLowerCase();
    const criticalKeywords = ['crash', 'corruption', 'breach', 'unauthorized', 'phq-9', 'gad-7', 'suicidal'];

    if (criticalKeywords.some(keyword => errorText.includes(keyword))) {
      return ErrorSeverity.CRITICAL;
    }

    // Network and sync issues are medium
    if ([ErrorCategory.NETWORK, ErrorCategory.SYNC_OPERATION].includes(category)) {
      return ErrorSeverity.MEDIUM;
    }

    // Performance and UI issues are low
    if ([ErrorCategory.PERFORMANCE, ErrorCategory.UI_RENDERING].includes(category)) {
      return ErrorSeverity.LOW;
    }

    // Default to medium
    return ErrorSeverity.MEDIUM;
  }

  /**
   * Generate error fingerprint for grouping/deduplication
   */
  private generateErrorFingerprint(category: ErrorCategory, message: string, error?: Error): string {
    const components = [
      category,
      this.sanitizeErrorMessage(message),
      error?.name || 'Unknown',
      // First line of stack trace (without line numbers for grouping)
      error?.stack?.split('\n')[1]?.replace(/:\d+:\d+/g, ':XX:XX') || 'NoStack'
    ];

    // Simple hash for fingerprinting
    const combined = components.join('|');
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Sanitize error message to remove PHI
   */
  private sanitizeErrorMessage(message: string): string {
    // Use our existing logging sanitization patterns
    let sanitized = message;

    // Remove common PHI patterns
    const phiPatterns = [
      /user[_-]?id[:\s]*[a-zA-Z0-9-]+/gi,
      /score[:\s]*\d+/gi,
      /token[:\s]*[a-zA-Z0-9\.\-_]+/gi,
      /session[_-]?id[:\s]*[a-zA-Z0-9-]+/gi,
      /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi
    ];

    phiPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    return sanitized;
  }

  /**
   * Sanitize error context to remove PHI
   */
  private sanitizeErrorContext(context: any): any {
    if (!context) return {};

    const sanitized: any = {
      platform: context.platform || process.env['EXPO_PLATFORM'] || 'unknown',
      timestamp: Date.now(),
      version: context.version || 'unknown'
    };

    // Add safe context properties
    if (context.component) sanitized.component = context.component;
    if (context.operation) sanitized.operation = context.operation;
    if (context.duration) sanitized.duration = context.duration;

    return sanitized;
  }

  /**
   * Check if alerts should be triggered
   */
  private async checkAndTriggerAlerts(category: ErrorCategory, fingerprint: string): Promise<void> {
    const alertConfig = this.config.alertConfigs[category];
    if (!alertConfig.enabled) return;

    const now = Date.now();
    const lastAlertTime = this.alertHistory.get(fingerprint) || 0;

    // Check cooldown
    if (now - lastAlertTime < alertConfig.cooldown) return;

    // Count recent errors with this fingerprint
    const recentErrors = this.errorEvents.filter(e =>
      e.fingerprint === fingerprint &&
      (now - e.timestamp) <= alertConfig.timeWindow
    );

    const totalCount = recentErrors.reduce((sum, e) => sum + e.count, 0);

    if (totalCount >= alertConfig.threshold) {
      await this.triggerAlert(category, fingerprint, totalCount, recentErrors[0]!);
      this.alertHistory.set(fingerprint, now);
    }
  }

  /**
   * Trigger alert for error threshold breach
   */
  private async triggerAlert(
    category: ErrorCategory,
    fingerprint: string,
    count: number,
    errorEvent: ErrorEvent
  ): Promise<void> {
    try {
      const alertMessage = `${category.toUpperCase()} Alert: ${count} occurrences of error`;

      // Log the alert
      logSecurity(alertMessage, this.mapSeverityToThreatLevel(errorEvent.severity), {
        component: 'error_monitoring',
        category,
        count,
        fingerprint: fingerprint.substring(0, 8),
        severity: ErrorSeverity[errorEvent.severity]
      });

      // For critical and emergency errors, create user alerts
      if (errorEvent.severity >= ErrorSeverity.CRITICAL) {
        await this.createCriticalAlert(category, errorEvent);
      }

      // Store alert in audit trail
      await this.storeAlertEvent(category, fingerprint, count, errorEvent);

    } catch (error) {
      logError(LogCategory.SECURITY, 'Failed to trigger error alert', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Create critical alert for high-severity errors
   */
  private async createCriticalAlert(category: ErrorCategory, errorEvent: ErrorEvent): Promise<void> {
    // For crisis detection failures, log as crisis event
    if (category === ErrorCategory.CRISIS_DETECTION) {
      logCrisis('Crisis detection system failure detected', {
        severity: 'critical',
        interventionType: 'modal' as any,
        detectionTime: Date.now() - errorEvent.timestamp
      });
    }

    // In development, show alert to developer
    if (__DEV__) {
      Alert.alert(
        'Critical System Error',
        `${category} error detected. Check error monitoring for details.`,
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Map error severity to security threat level
   */
  private mapSeverityToThreatLevel(severity: ErrorSeverity): 'low' | 'medium' | 'high' | 'critical' {
    switch (severity) {
      case ErrorSeverity.EMERGENCY:
      case ErrorSeverity.CRITICAL:
        return 'critical';
      case ErrorSeverity.HIGH:
        return 'high';
      case ErrorSeverity.MEDIUM:
        return 'medium';
      case ErrorSeverity.LOW:
      default:
        return 'low';
    }
  }

  /**
   * Log error event through secure logging system
   */
  private logErrorEvent(
    category: ErrorCategory,
    severity: ErrorSeverity,
    message: string,
    error?: Error,
    context?: any
  ): void {
    const logContext = {
      category,
      severity: ErrorSeverity[severity],
      errorName: error?.name,
      ...this.sanitizeErrorContext(context)
    };

    // Use appropriate logging category
    const logCategory = this.mapErrorCategoryToLogCategory(category);
    logError(logCategory, this.sanitizeErrorMessage(message), error);
  }

  /**
   * Map error category to log category
   */
  private mapErrorCategoryToLogCategory(category: ErrorCategory): LogCategory {
    switch (category) {
      case ErrorCategory.CRISIS_DETECTION:
        return LogCategory.CRISIS;
      case ErrorCategory.AUTHENTICATION:
        return LogCategory.AUTH;
      case ErrorCategory.SYNC_OPERATION:
        return LogCategory.SYNC;
      case ErrorCategory.ANALYTICS:
        return LogCategory.ANALYTICS;
      case ErrorCategory.SECURITY:
        return LogCategory.SECURITY;
      case ErrorCategory.PERFORMANCE:
        return LogCategory.PERFORMANCE;
      default:
        return LogCategory.SYSTEM;
    }
  }

  /**
   * Store alert event in audit trail
   */
  private async storeAlertEvent(
    category: ErrorCategory,
    fingerprint: string,
    count: number,
    errorEvent: ErrorEvent
  ): Promise<void> {
    try {
      const alertEntry = {
        timestamp: Date.now(),
        type: 'error_alert',
        category,
        severity: ErrorSeverity[errorEvent.severity],
        count,
        fingerprint: fingerprint.substring(0, 8), // Truncated for privacy
        message: errorEvent.message
      };

      await AsyncStorage.setItem(
        `error_alert_${Date.now()}`,
        JSON.stringify(alertEntry)
      );

    } catch (error) {
      // Fail silently
    }
  }

  /**
   * Flush error events (for batching/storage)
   */
  private async flushErrorEvents(): Promise<void> {
    if (this.errorEvents.length === 0) return;

    try {
      const eventsToFlush = this.errorEvents.slice(0, this.config.batchSize);

      // In production, you would send these to your monitoring service
      // For now, we'll log the summary
      const summary = {
        totalEvents: eventsToFlush.length,
        criticalEvents: eventsToFlush.filter(e => e.severity >= ErrorSeverity.CRITICAL).length,
        categories: eventsToFlush.reduce((acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      logSecurity('Error monitoring batch flush', 'low', {
        component: 'error_monitoring',
        action: 'batch_flush',
        summary
      });

      // Remove flushed events
      this.errorEvents = this.errorEvents.slice(this.config.batchSize);

    } catch (error) {
      logError(LogCategory.SECURITY, 'Error monitoring flush failed', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Get error monitoring status and statistics
   */
  getMonitoringStatus(): {
    isEnabled: boolean;
    isInitialized: boolean;
    activeErrors: number;
    alertsInLastHour: number;
    criticalErrors: number;
  } {
    const now = Date.now();
    const lastHour = 60 * 60 * 1000;

    return {
      isEnabled: this.config.enabled,
      isInitialized: this.isInitialized,
      activeErrors: this.errorEvents.length,
      alertsInLastHour: Array.from(this.alertHistory.values()).filter(time =>
        now - time <= lastHour
      ).length,
      criticalErrors: this.errorEvents.filter(e =>
        e.severity >= ErrorSeverity.CRITICAL
      ).length
    };
  }

  /**
   * Emergency shutdown
   */
  async emergencyShutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flushErrorEvents();

    this.errorEvents = [];
    this.alertHistory.clear();
    this.isInitialized = false;

    logSecurity('Error monitoring emergency shutdown', 'critical', {
      component: 'error_monitoring',
      reason: 'emergency_shutdown'
    });
  }
}

// Export singleton instance
export const errorMonitoringService = ErrorMonitoringService.getInstance();

// Convenience functions for easy error tracking
export const trackError = (
  category: ErrorCategory,
  message: string,
  error?: Error,
  context?: any
) => errorMonitoringService.trackError(category, message, error, context);

// Specialized error tracking functions
export const trackCrisisError = (message: string, error?: Error, context?: any) =>
  trackError(ErrorCategory.CRISIS_DETECTION, message, error, context);

export const trackAuthError = (message: string, error?: Error, context?: any) =>
  trackError(ErrorCategory.AUTHENTICATION, message, error, context);

export const trackSyncError = (message: string, error?: Error, context?: any) =>
  trackError(ErrorCategory.SYNC_OPERATION, message, error, context);

export const trackAnalyticsError = (message: string, error?: Error, context?: any) =>
  trackError(ErrorCategory.ANALYTICS, message, error, context);

export const trackSecurityError = (message: string, error?: Error, context?: any) =>
  trackError(ErrorCategory.SECURITY, message, error, context);

export const trackPerformanceError = (message: string, error?: Error, context?: any) =>
  trackError(ErrorCategory.PERFORMANCE, message, error, context);

export default ErrorMonitoringService;