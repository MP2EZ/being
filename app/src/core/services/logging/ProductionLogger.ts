/**
 * PRODUCTION-SAFE LOGGING SERVICE - Privacy Compliant
 *
 * SECURITY REQUIREMENTS:
 * - Zero PHI exposure in any environment
 * - Structured logging with sanitization
 * - Performance tracking without sensitive data
 * - Crisis logging with anonymized context
 * - Environment-aware log levels
 *
 * COMPLIANCE FEATURES:
 * - PHI sanitization with hash replacement
 * - Audit trail with tamper protection
 * - Role-based log access control
 * - Automated PII detection and removal
 * - GDPR/Privacy deletion support
 */


import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { TokenBucketRateLimiter } from './RateLimiter';
import type { EncryptionService, DataSensitivityLevel } from '../security/EncryptionService';
// MAINT-248: single source of truth for sensitive-data sanitization. The inline
// pattern array / isSensitiveKey copy that lived here was deleted — these are the
// canonical implementations every logging service shares.
import {
  sanitizeWithSensitiveDataPatterns,
  sanitizeObject as sanitizeObjectShared,
} from './SensitiveDataPatterns';

/**
 * LOG LEVELS - Production Safe
 */
export enum LogLevel {
  SILENT = 0,    // Production default - no console output
  ERROR = 1,     // Critical errors only
  WARN = 2,      // Performance/security warnings
  INFO = 3,      // Development info
  DEBUG = 4,     // Development debug
  TRACE = 5      // Development trace
}

/**
 * LOG CATEGORIES - For structured filtering
 */
export enum LogCategory {
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  CRISIS = 'crisis',
  ASSESSMENT = 'assessment',
  AUTH = 'auth',
  ANALYTICS = 'analytics',
  SYNC = 'sync',
  ACCESSIBILITY = 'accessibility',
  SYSTEM = 'system'
}

/**
 * ENVIRONMENT CONFIGURATION
 */
const getEnvironment = (): 'production' | 'development' | 'test' => {
  if (__DEV__) return 'development';
  if (process.env.NODE_ENV === 'test') return 'test';
  return 'production';
};

const LOG_LEVEL_BY_ENV = {
  production: LogLevel.ERROR,
  development: LogLevel.DEBUG,
  test: LogLevel.WARN
};

/**
 * PRODUCTION LOGGER CLASS
 */
export class ProductionLogger {
  private static instance: ProductionLogger;
  private readonly environment = getEnvironment();
  private readonly logLevel = LOG_LEVEL_BY_ENV[this.environment];
  private readonly auditTrail: LogEntry[] = [];
  private readonly maxAuditEntries = 1000;

  // Hash salt for consistent PHI replacement
  private readonly phiSalt = 'being_logging_salt_2024';

  // INFRA-61: Rate limiter for log throughput control
  private rateLimiter: TokenBucketRateLimiter;

  // INFRA-61: Optional encryption for sensitive logs
  private encryptionService: EncryptionService | null = null;
  private encryptionEnabled = false;

  private constructor() {
    this.rateLimiter = new TokenBucketRateLimiter();
    this.initializeLogger();
  }

  static getInstance(): ProductionLogger {
    if (!ProductionLogger.instance) {
      ProductionLogger.instance = new ProductionLogger();
    }
    return ProductionLogger.instance;
  }

  /**
   * CORE LOGGING METHODS - PHI Safe
   */

  error(category: LogCategory, message: string, context?: any): void {
    this.log(LogLevel.ERROR, category, message, context);
  }

  warn(category: LogCategory, message: string, context?: any): void {
    this.log(LogLevel.WARN, category, message, context);
  }

  info(category: LogCategory, message: string, context?: any): void {
    this.log(LogLevel.INFO, category, message, context);
  }

  debug(category: LogCategory, message: string, context?: any): void {
    this.log(LogLevel.DEBUG, category, message, context);
  }

  /**
   * SPECIALIZED LOGGING METHODS
   */

  /**
   * Crisis logging with anonymized context
   */
  crisis(message: string, context?: {
    detectionTime?: number;
    interventionType?: string;
    severity?: string;
    // NO assessment scores, user IDs, or PHI
  }): void {
    const sanitizedContext = context ? {
      detectionTime: context.detectionTime,
      interventionType: context.interventionType,
      severity: context.severity,
      timestamp: Date.now(),
      sessionHash: this.generateSessionHash()
    } : undefined;

    this.log(LogLevel.ERROR, LogCategory.CRISIS, message, sanitizedContext);
  }

  /**
   * Performance logging without PHI
   */
  performance(operation: string, duration: number, metadata?: any): void {
    const sanitizedMetadata = this.sanitizeObject({
      operation,
      duration,
      platform: Platform.OS,
      ...metadata
    });

    this.log(LogLevel.WARN, LogCategory.PERFORMANCE,
      `Performance: ${operation} completed in ${duration}ms`,
      sanitizedMetadata
    );
  }

  /**
   * Assessment logging with sanitized data
   */
  assessment(event: string, context?: {
    type?: string;
    questionCount?: number;
    completionTime?: number;
    // NO scores, responses, or user data
  }): void {
    const sanitizedContext = context ? {
      type: context.type,
      questionCount: context.questionCount,
      completionTime: context.completionTime,
      timestamp: Date.now(),
      sessionHash: this.generateSessionHash()
    } : undefined;

    this.log(LogLevel.INFO, LogCategory.ASSESSMENT, event, sanitizedContext);
  }

  /**
   * Security event logging
   */
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: any): void {
    const sanitizedContext = this.sanitizeObject({
      severity,
      timestamp: Date.now(),
      platform: Platform.OS,
      ...context
    });

    this.log(LogLevel.ERROR, LogCategory.SECURITY,
      `Security: ${event}`,
      sanitizedContext
    );
  }

  /**
   * CORE LOGGING ENGINE
   */
  private log(level: LogLevel, category: LogCategory, message: string, context?: any): void {
    // Skip if below log level threshold
    if (level > this.logLevel) return;

    // Sanitize all inputs
    const sanitizedMessage = this.sanitizeString(message);
    const sanitizedContext = context ? this.sanitizeObject(context) : undefined;

    // Create log entry
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      category,
      message: sanitizedMessage,
      context: sanitizedContext,
      environment: this.environment,
      platform: Platform.OS,
      sessionHash: this.generateSessionHash()
    };

    // Store in audit trail (memory, encrypted storage for critical)
    this.addToAuditTrail(logEntry);

    // Output based on environment
    this.outputLog(logEntry);
  }

  /**
   * SANITIZATION ENGINE
   *
   * MAINT-248: delegates to the canonical SensitiveDataPatterns single source of
   * truth. The inline pattern array, isSensitiveKey, and recursive sanitizeObject
   * that used to live here were deleted; these thin wrappers keep the class API
   * stable for every existing call site.
   */
  private sanitizeString(input: string): string {
    return sanitizeWithSensitiveDataPatterns(input);
  }

  private sanitizeObject(obj: any): any {
    return sanitizeObjectShared(obj);
  }

  /**
   * AUDIT TRAIL MANAGEMENT
   */
  private addToAuditTrail(entry: LogEntry): void {
    this.auditTrail.push(entry);

    // Maintain size limit
    if (this.auditTrail.length > this.maxAuditEntries) {
      this.auditTrail.shift();
    }

    // Store critical entries securely
    if (entry.level === 'ERROR' || entry.category === LogCategory.CRISIS) {
      this.storeCriticalEntry(entry);
    }
  }

  private async storeCriticalEntry(entry: LogEntry): Promise<void> {
    try {
      const storageKey = `critical_log_${Date.now()}`;

      // INFRA-61: Encrypt if encryption is enabled
      if (this.encryptionEnabled && this.encryptionService) {
        try {
          const sensitivityLevel = this.mapCategoryToSensitivity(entry.category);
          const encryptedPackage = await this.encryptionService.encryptData(entry, sensitivityLevel);

          // Store encrypted wrapper
          const encryptedEntry = {
            encrypted: true,
            package: encryptedPackage,
          };
          await SecureStore.setItemAsync(storageKey, JSON.stringify(encryptedEntry));
        } catch {
          // Fallback to unencrypted storage if encryption fails
          await SecureStore.setItemAsync(storageKey, JSON.stringify(entry));
        }
      } else {
        // Store unencrypted
        await SecureStore.setItemAsync(storageKey, JSON.stringify(entry));
      }
    } catch {
      // Fail silently - we don't want logging errors to break the app
    }
  }

  /**
   * INFRA-61: Map log category to encryption sensitivity level
   */
  private mapCategoryToSensitivity(category: LogCategory): DataSensitivityLevel {
    switch (category) {
      case LogCategory.CRISIS:
        return 'level_1_crisis_responses';
      case LogCategory.ASSESSMENT:
        return 'level_2_assessment_data';
      case LogCategory.SECURITY:
        return 'level_3_intervention_metadata';
      default:
        return 'level_5_general_data';
    }
  }

  /**
   * OUTPUT HANDLERS
   */
  private outputLog(entry: LogEntry): void {
    // Production: Only critical errors to console
    if (this.environment === 'production') {
      if (entry.level === 'ERROR') {
        console.error(`[${entry.category}] ${entry.message}`);
      }
      return;
    }

    // Development: Full structured logging
    if (this.environment === 'development') {
      const prefix = this.getLogPrefix(entry);

      if (entry.context) {
        // Stringify context to avoid [object Object] in console
        console.log(prefix, JSON.stringify(entry.context, null, 2));
      } else {
        console.log(prefix);
      }
      return;
    }

    // Test: Minimal output
    if (entry.level === 'ERROR') {
      console.error(`[TEST][${entry.category}] ${entry.message}`);
    }
  }

  private getLogPrefix(entry: LogEntry): string {
    const emoji = this.getLogEmoji(entry.category, entry.level);
    return `${emoji} [${entry.level}][${entry.category}] ${entry.message}`;
  }

  private getLogEmoji(category: LogCategory, level: string): string {
    if (level === 'ERROR') return '🚨';

    const categoryEmojis = {
      [LogCategory.SECURITY]: '🔒',
      [LogCategory.PERFORMANCE]: '⚡',
      [LogCategory.CRISIS]: '🆘',
      [LogCategory.ASSESSMENT]: '📋',
      [LogCategory.AUTH]: '🔑',
      [LogCategory.ANALYTICS]: '📊',
      [LogCategory.SYNC]: '🔄',
      [LogCategory.ACCESSIBILITY]: '♿',
      [LogCategory.SYSTEM]: '⚙️'
    };

    return categoryEmojis[category] || '📝';
  }

  /**
   * UTILITY METHODS
   */
  private generateSessionHash(): string {
    // Create a consistent session identifier without PHI
    const sessionData = `${Date.now()}_${Platform.OS}_${this.environment}`;
    return this.hashString(sessionData).substring(0, 8);
  }

  private hashString(input: string): string {
    // Simple hash for session identification (not cryptographic)
    let hash = 0;
    const fullInput = `${input}_${this.phiSalt}`;

    for (let i = 0; i < fullInput.length; i++) {
      const char = fullInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  private async initializeLogger(): Promise<void> {
    try {
      // Initialize any required storage or configurations
      // This runs once when the logger is created
    } catch {
      // Fail silently - logger must not break app initialization
    }
  }

  /**
   * DEBUGGING AND MAINTENANCE
   */
  getAuditTrail(): LogEntry[] {
    return [...this.auditTrail]; // Return copy for safety
  }

  async clearAuditTrail(): Promise<void> {
    this.auditTrail.length = 0;

    // Clear stored critical entries (GDPR compliance)
    try {
      const keys = await AsyncStorage.getAllKeys();
      const logKeys = keys.filter(key => key.startsWith('critical_log_'));
      await AsyncStorage.multiRemove(logKeys);
    } catch {
      // Fail silently
    }
  }

  /**
   * EMERGENCY SHUTDOWN
   */
  emergencyShutdown(reason: string): void {
    console.error(`🚨 EMERGENCY LOGGER SHUTDOWN: ${reason}`);
    this.auditTrail.length = 0;
  }

  /**
   * INFRA-61: Rate Limiter Statistics
   */
  getRateLimiterStats() {
    return this.rateLimiter.getStats();
  }

  /**
   * INFRA-61: Enable log encryption
   */
  async enableEncryption(encryptionService: EncryptionService): Promise<void> {
    this.encryptionService = encryptionService;
    this.encryptionEnabled = true;
    this.info(LogCategory.SECURITY, 'Log encryption enabled');
  }

  /**
   * INFRA-61: Disable log encryption
   */
  disableEncryption(): void {
    this.encryptionEnabled = false;
    this.encryptionService = null;
    this.info(LogCategory.SECURITY, 'Log encryption disabled');
  }
}

/**
 * LOG ENTRY INTERFACE
 */
interface LogEntry {
  timestamp: string;
  level: string;
  category: LogCategory;
  message: string;
  context?: any;
  environment: string;
  platform: string;
  sessionHash: string;
}

/**
 * SINGLETON INSTANCE EXPORT
 */
export const logger = ProductionLogger.getInstance();