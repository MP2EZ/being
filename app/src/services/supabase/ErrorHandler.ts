/**
 * Cloud Sync Error Handler
 *
 * COMPREHENSIVE ERROR MANAGEMENT:
 * - User-friendly error messages
 * - Automatic retry strategies
 * - Error categorization and reporting
 * - Recovery recommendations
 *
 * ERROR CATEGORIES:
 * - Network errors (connectivity, timeout)
 * - Authentication errors (anonymous auth issues)
 * - Data errors (corruption, encryption failures)
 * - Configuration errors (missing env vars)
 * - Service errors (Supabase outages)
 *
 * RECOVERY STRATEGIES:
 * - Exponential backoff retry
 * - Circuit breaker protection
 * - Offline queue management
 * - User-guided recovery
 */


import { logSecurity, logPerformance, logError, LogCategory } from '../logging';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Error categories
export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  DATA_CORRUPTION = 'data_corruption',
  ENCRYPTION = 'encryption',
  CONFIGURATION = 'configuration',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  QUOTA_EXCEEDED = 'quota_exceeded',
  PERMISSION_DENIED = 'permission_denied',
  UNKNOWN = 'unknown',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',         // Recoverable, no user action needed
  MEDIUM = 'medium',   // May need user action
  HIGH = 'high',       // Requires user attention
  CRITICAL = 'critical', // Blocks functionality
}

// Recovery strategies
export enum RecoveryStrategy {
  RETRY_AUTOMATICALLY = 'retry_automatically',
  RETRY_WITH_BACKOFF = 'retry_with_backoff',
  RETRY_MANUALLY = 'retry_manually',
  RESET_SERVICE = 'reset_service',
  CONTACT_SUPPORT = 'contact_support',
  IGNORE = 'ignore',
}

// Enhanced error interface
export interface EnhancedCloudError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  originalError: Error;
  message: string;
  userMessage: string;
  timestamp: number;
  context: Record<string, any>;
  recoveryStrategy: RecoveryStrategy;
  recoveryActions: string[];
  retryable: boolean;
  retryCount: number;
  maxRetries: number;
}

// Error statistics
interface ErrorStats {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  lastErrorTime: number;
  recoverySuccessRate: number;
}

class CloudSyncErrorHandler {
  private errorHistory: EnhancedCloudError[] = [];
  private readonly maxHistorySize = 100;
  private readonly storageKey = '@being/cloud_sync/error_history';

  constructor() {
    this.loadErrorHistory();
  }

  /**
   * Process and enhance an error
   */
  async handleError(
    error: Error | unknown,
    context: Record<string, any> = {}
  ): Promise<EnhancedCloudError> {
    const originalError = error instanceof Error ? error : new Error(String(error));

    // Generate unique error ID
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Categorize error
    const category = this.categorizeError(originalError);

    // Determine severity
    const severity = this.determineSeverity(category, originalError);

    // Determine recovery strategy
    const { strategy, actions } = this.determineRecoveryStrategy(category, originalError);

    // Create enhanced error
    const enhancedError: EnhancedCloudError = {
      id: errorId,
      category,
      severity,
      originalError,
      message: originalError.message,
      userMessage: this.createUserMessage(category, originalError),
      timestamp: Date.now(),
      context,
      recoveryStrategy: strategy,
      recoveryActions: actions,
      retryable: this.isRetryable(category, originalError),
      retryCount: 0,
      maxRetries: this.getMaxRetries(category),
    };

    // Add to history
    this.addToHistory(enhancedError);

    // Log for development
    logSecurity('[CloudSyncError]', {
      id: errorId,
      category,
      severity,
      message: originalError.message,
      context,
    });

    // Track analytics (non-blocking)
    this.trackErrorAnalytics(enhancedError).catch(() => {
      // Ignore analytics failures
    });

    return enhancedError;
  }

  /**
   * Categorize error by type and message
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Network errors
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      name.includes('networkerror')
    ) {
      return ErrorCategory.NETWORK;
    }

    // Authentication errors
    if (
      message.includes('auth') ||
      message.includes('unauthorized') ||
      message.includes('token') ||
      message.includes('anonymous')
    ) {
      return ErrorCategory.AUTHENTICATION;
    }

    // Data corruption
    if (
      message.includes('corrupt') ||
      message.includes('checksum') ||
      message.includes('integrity') ||
      message.includes('invalid json')
    ) {
      return ErrorCategory.DATA_CORRUPTION;
    }

    // Encryption errors
    if (
      message.includes('encrypt') ||
      message.includes('decrypt') ||
      message.includes('key') ||
      message.includes('cipher')
    ) {
      return ErrorCategory.ENCRYPTION;
    }

    // Configuration errors
    if (
      message.includes('config') ||
      message.includes('environment') ||
      message.includes('missing') ||
      message.includes('supabase_url')
    ) {
      return ErrorCategory.CONFIGURATION;
    }

    // Service unavailable
    if (
      message.includes('service unavailable') ||
      message.includes('server error') ||
      message.includes('503') ||
      message.includes('502')
    ) {
      return ErrorCategory.SERVICE_UNAVAILABLE;
    }

    // Quota exceeded
    if (
      message.includes('quota') ||
      message.includes('limit') ||
      message.includes('too many requests') ||
      message.includes('429')
    ) {
      return ErrorCategory.QUOTA_EXCEEDED;
    }

    // Permission denied
    if (
      message.includes('permission') ||
      message.includes('forbidden') ||
      message.includes('403')
    ) {
      return ErrorCategory.PERMISSION_DENIED;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(category: ErrorCategory, error: Error): ErrorSeverity {
    switch (category) {
      case ErrorCategory.CONFIGURATION:
      case ErrorCategory.ENCRYPTION:
      case ErrorCategory.PERMISSION_DENIED:
        return ErrorSeverity.CRITICAL;

      case ErrorCategory.DATA_CORRUPTION:
      case ErrorCategory.SERVICE_UNAVAILABLE:
        return ErrorSeverity.HIGH;

      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.QUOTA_EXCEEDED:
        return ErrorSeverity.MEDIUM;

      case ErrorCategory.NETWORK:
        return ErrorSeverity.LOW;

      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  /**
   * Determine recovery strategy and actions
   */
  private determineRecoveryStrategy(
    category: ErrorCategory,
    error: Error
  ): { strategy: RecoveryStrategy; actions: string[] } {
    switch (category) {
      case ErrorCategory.NETWORK:
        return {
          strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
          actions: [
            'Check your internet connection',
            'Try again in a few moments',
            'Switch to WiFi if using cellular data',
          ],
        };

      case ErrorCategory.AUTHENTICATION:
        return {
          strategy: RecoveryStrategy.RESET_SERVICE,
          actions: [
            'Restart the app',
            'Clear app cache if problem persists',
            'Contact support if issue continues',
          ],
        };

      case ErrorCategory.DATA_CORRUPTION:
        return {
          strategy: RecoveryStrategy.RETRY_MANUALLY,
          actions: [
            'Try syncing again',
            'Check if backup is corrupted',
            'May need to create new backup',
          ],
        };

      case ErrorCategory.ENCRYPTION:
        return {
          strategy: RecoveryStrategy.CONTACT_SUPPORT,
          actions: [
            'Restart the app',
            'This may be a security issue',
            'Contact support for assistance',
          ],
        };

      case ErrorCategory.CONFIGURATION:
        return {
          strategy: RecoveryStrategy.CONTACT_SUPPORT,
          actions: [
            'App configuration issue',
            'Try updating the app',
            'Contact support if problem persists',
          ],
        };

      case ErrorCategory.SERVICE_UNAVAILABLE:
        return {
          strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
          actions: [
            'Cloud service is temporarily unavailable',
            'Try again in a few minutes',
            'Your data is safe locally',
          ],
        };

      case ErrorCategory.QUOTA_EXCEEDED:
        return {
          strategy: RecoveryStrategy.RETRY_MANUALLY,
          actions: [
            'Free tier limits reached',
            'Try again tomorrow',
            'Consider upgrading for more storage',
          ],
        };

      case ErrorCategory.PERMISSION_DENIED:
        return {
          strategy: RecoveryStrategy.CONTACT_SUPPORT,
          actions: [
            'Access permission issue',
            'Try restarting the app',
            'Contact support for assistance',
          ],
        };

      default:
        return {
          strategy: RecoveryStrategy.RETRY_MANUALLY,
          actions: [
            'An unexpected error occurred',
            'Try the operation again',
            'Contact support if problem persists',
          ],
        };
    }
  }

  /**
   * Create user-friendly error message
   */
  private createUserMessage(category: ErrorCategory, error: Error): string {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'Unable to connect to cloud backup. Please check your internet connection.';

      case ErrorCategory.AUTHENTICATION:
        return 'Cloud backup authentication failed. Please restart the app.';

      case ErrorCategory.DATA_CORRUPTION:
        return 'Backup data appears to be corrupted. You may need to create a new backup.';

      case ErrorCategory.ENCRYPTION:
        return 'Encryption error occurred. Your data remains secure. Please restart the app.';

      case ErrorCategory.CONFIGURATION:
        return 'Cloud backup is not properly configured. Please contact support.';

      case ErrorCategory.SERVICE_UNAVAILABLE:
        return 'Cloud backup service is temporarily unavailable. Please try again later.';

      case ErrorCategory.QUOTA_EXCEEDED:
        return 'Cloud storage limit reached. Please try again tomorrow.';

      case ErrorCategory.PERMISSION_DENIED:
        return 'Permission denied for cloud backup. Please contact support.';

      default:
        return 'An unexpected error occurred with cloud backup. Please try again.';
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(category: ErrorCategory, error: Error): boolean {
    const retryableCategories = [
      ErrorCategory.NETWORK,
      ErrorCategory.SERVICE_UNAVAILABLE,
      ErrorCategory.QUOTA_EXCEEDED,
    ];

    return retryableCategories.includes(category);
  }

  /**
   * Get maximum retry attempts for error category
   */
  private getMaxRetries(category: ErrorCategory): number {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 3;
      case ErrorCategory.SERVICE_UNAVAILABLE:
        return 2;
      case ErrorCategory.QUOTA_EXCEEDED:
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Add error to history
   */
  private addToHistory(error: EnhancedCloudError): void {
    this.errorHistory.unshift(error);

    // Maintain history size limit
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }

    // Save to storage (non-blocking)
    this.saveErrorHistory().catch(() => {
      // Ignore storage failures
    });
  }

  /**
   * Load error history from storage
   */
  private async loadErrorHistory(): Promise<void> {
    try {
      const historyData = await AsyncStorage.getItem(this.storageKey);
      if (historyData) {
        this.errorHistory = JSON.parse(historyData);
      }
    } catch (error) {
      logSecurity('Failed to load error history:', error);
      this.errorHistory = [];
    }
  }

  /**
   * Save error history to storage
   */
  private async saveErrorHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.storageKey,
        JSON.stringify(this.errorHistory.slice(0, 50)) // Save only recent errors
      );
    } catch (error) {
      logSecurity('Failed to save error history:', error);
    }
  }

  /**
   * Track error analytics (privacy-preserving)
   */
  private async trackErrorAnalytics(error: EnhancedCloudError): Promise<void> {
    try {
      // Only track error patterns, not sensitive details
      const analyticsData = {
        error_category: error.category,
        error_severity: error.severity,
        recovery_strategy: error.recoveryStrategy,
        retryable: error.retryable,
        // No user data or error messages
      };

      // Would integrate with analytics service here
      console.log('[Analytics] Error tracked:', analyticsData);

    } catch (error) {
      // Ignore analytics failures
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    const stats: ErrorStats = {
      totalErrors: this.errorHistory.length,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      lastErrorTime: 0,
      recoverySuccessRate: 0,
    };

    // Initialize counters
    Object.values(ErrorCategory).forEach(category => {
      stats.errorsByCategory[category] = 0;
    });

    Object.values(ErrorSeverity).forEach(severity => {
      stats.errorsBySeverity[severity] = 0;
    });

    // Calculate statistics
    for (const error of this.errorHistory) {
      stats.errorsByCategory[error.category]++;
      stats.errorsBySeverity[error.severity]++;

      if (error.timestamp > stats.lastErrorTime) {
        stats.lastErrorTime = error.timestamp;
      }
    }

    return stats;
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): EnhancedCloudError[] {
    return this.errorHistory.slice(0, limit);
  }

  /**
   * Clear error history
   */
  async clearErrorHistory(): Promise<void> {
    this.errorHistory = [];
    await AsyncStorage.removeItem(this.storageKey);
  }

  /**
   * Get recovery actions for an error
   */
  getRecoveryActions(errorId: string): string[] {
    const error = this.errorHistory.find(e => e.id === errorId);
    return error?.recoveryActions || [];
  }

  /**
   * Mark error as resolved
   */
  markErrorResolved(errorId: string): void {
    const errorIndex = this.errorHistory.findIndex(e => e.id === errorId);
    if (errorIndex !== -1) {
      // Add resolution metadata
      (this.errorHistory[errorIndex] as any).resolved = true;
      (this.errorHistory[errorIndex] as any).resolvedAt = Date.now();
    }
  }

  /**
   * Check if error should be shown to user
   */
  shouldShowError(error: EnhancedCloudError): boolean {
    // Don't show low severity errors immediately
    if (error.severity === ErrorSeverity.LOW) {
      return false;
    }

    // Don't show duplicate errors within 5 minutes
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const recentSimilarErrors = this.errorHistory.filter(e =>
      e.category === error.category &&
      e.timestamp > fiveMinutesAgo &&
      e.id !== error.id
    );

    return recentSimilarErrors.length === 0;
  }
}

// Export singleton instance
export const cloudErrorHandler = new CloudSyncErrorHandler();
export default cloudErrorHandler;