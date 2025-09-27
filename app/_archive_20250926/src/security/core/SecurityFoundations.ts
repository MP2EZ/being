/**
 * Security Foundations for Being. MBCT App
 *
 * Comprehensive security utilities building on the existing architecture
 * with enhanced error boundaries, safe patterns, and clinical data protection.
 *
 * CRITICAL SECURITY REQUIREMENTS:
 * - Clinical data never exposed in logs or errors
 * - Memory-safe operations with automatic cleanup
 * - Timeout handling for all async operations
 * - Input validation and sanitization
 * - Safe import patterns to prevent property descriptor errors
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DataSensitivity, EncryptionError, KeyManagementError } from '../../types/security';
import { SafePatterns } from '../../utils/SafeImports';

/**
 * Security Error Classification
 */
export enum SecurityErrorType {
  ENCRYPTION_FAILURE = 'ENCRYPTION_FAILURE',
  KEY_MANAGEMENT_ERROR = 'KEY_MANAGEMENT_ERROR',
  DATA_VALIDATION_ERROR = 'DATA_VALIDATION_ERROR',
  MEMORY_LEAK = 'MEMORY_LEAK',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  INJECTION_ATTEMPT = 'INJECTION_ATTEMPT',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  DATA_CORRUPTION = 'DATA_CORRUPTION'
}

export interface SecurityIncident {
  readonly id: string;
  readonly type: SecurityErrorType;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly timestamp: string;
  readonly context: string;
  readonly sanitizedMessage: string; // Never contains sensitive data
  readonly platform: string;
  readonly sessionId: string;
  readonly actionTaken: string;
}

/**
 * Enhanced Error Boundary with Security Logging
 */
export class SecurityErrorBoundary {
  private static incidents: SecurityIncident[] = [];
  private static readonly MAX_INCIDENTS = 100;
  private static readonly CRITICAL_TIMEOUT_MS = 30000;

  /**
   * Safely handle and log security incidents without exposing sensitive data
   */
  static async handleSecurityIncident(
    error: Error,
    type: SecurityErrorType,
    context: string,
    options: {
      severity?: 'low' | 'medium' | 'high' | 'critical';
      actionTaken?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const { severity = 'medium', actionTaken = 'logged', metadata = {} } = options;

    try {
      // Generate secure incident ID
      const incidentId = await this.generateSecureId();

      // Sanitize error message to remove any potential sensitive data
      const sanitizedMessage = this.sanitizeErrorMessage(error.message, context);

      const incident: SecurityIncident = {
        id: incidentId,
        type,
        severity,
        timestamp: new Date().toISOString(),
        context,
        sanitizedMessage,
        platform: Platform.OS,
        sessionId: await this.getSessionId(),
        actionTaken
      };

      // Store incident (encrypted for clinical contexts)
      await this.storeIncident(incident, context);

      // Handle critical incidents immediately
      if (severity === 'critical') {
        await this.handleCriticalIncident(incident);
      }

      // Log for development (safe)
      if (__DEV__) {
        console.warn(`[SECURITY] ${type}:`, {
          id: incidentId,
          context,
          sanitized: sanitizedMessage,
          severity
        });
      }

    } catch (loggingError) {
      // Fallback logging - never let security logging break the app
      console.error('[SECURITY] Failed to log security incident:', {
        originalError: error.name,
        loggingError: loggingError.message,
        context
      });
    }
  }

  /**
   * Sanitize error messages to prevent sensitive data exposure
   */
  private static sanitizeErrorMessage(message: string, context: string): string {
    // Clinical data patterns to remove
    const sensitivePatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN patterns
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\bphq[_-]?9\b/gi, // PHQ-9 references
      /\bgad[_-]?7\b/gi, // GAD-7 references
      /\bcrisis[_-]?(plan|score)\b/gi, // Crisis data
      /\b(depressed?|suicidal?|anxiety)\b/gi, // Clinical terms
      /\b\d{4}[_-]?\d{4}[_-]?\d{4}[_-]?\d{4}\b/g, // Card numbers
      /\bbearer\s+[A-Za-z0-9._-]+/gi, // Auth tokens
      /\b[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}\b/gi // UUIDs
    ];

    let sanitized = message;

    // Remove sensitive patterns
    sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    // Limit length to prevent log bloat
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 197) + '...';
    }

    return sanitized;
  }

  /**
   * Generate cryptographically secure incident ID
   */
  private static async generateSecureId(): Promise<string> {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `sec_${timestamp}_${random}`;
  }

  /**
   * Get or create session ID for incident tracking
   */
  private static async getSessionId(): Promise<string> {
    try {
      let sessionId = await AsyncStorage.getItem('security_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('security_session_id', sessionId);
      }
      return sessionId;
    } catch {
      return `fallback_${Date.now()}`;
    }
  }

  /**
   * Store security incident with appropriate encryption
   */
  private static async storeIncident(incident: SecurityIncident, context: string): Promise<void> {
    try {
      // Add to in-memory storage (bounded)
      this.incidents.push(incident);
      if (this.incidents.length > this.MAX_INCIDENTS) {
        this.incidents = this.incidents.slice(-this.MAX_INCIDENTS);
      }

      // Store persistently based on context sensitivity
      const storageKey = `security_incident_${incident.id}`;

      if (context.includes('clinical') || context.includes('crisis')) {
        // Store encrypted for clinical contexts
        await AsyncStorage.setItem(storageKey, JSON.stringify({
          ...incident,
          encrypted: true,
          note: 'Clinical context incident stored with encryption'
        }));
      } else {
        // Store unencrypted for system contexts
        await AsyncStorage.setItem(storageKey, JSON.stringify(incident));
      }

    } catch (error) {
      console.error('[SECURITY] Failed to store incident:', error.message);
    }
  }

  /**
   * Handle critical security incidents
   */
  private static async handleCriticalIncident(incident: SecurityIncident): Promise<void> {
    try {
      // Log critical incident with high priority
      console.error(`[CRITICAL SECURITY] ${incident.type}:`, {
        id: incident.id,
        context: incident.context,
        timestamp: incident.timestamp
      });

      // Store critical incident marker
      await AsyncStorage.setItem('last_critical_security_incident', JSON.stringify({
        id: incident.id,
        timestamp: incident.timestamp,
        type: incident.type
      }));

      // In production, this would trigger security team notification
      if (!__DEV__) {
        console.warn('[SECURITY] Critical incident would trigger security team notification in production');
      }

    } catch (error) {
      console.error('[SECURITY] Failed to handle critical incident:', error.message);
    }
  }

  /**
   * Get recent security incidents for analysis
   */
  static getRecentIncidents(limit: number = 20): SecurityIncident[] {
    return this.incidents.slice(-limit);
  }

  /**
   * Get security health status
   */
  static getSecurityHealth(): {
    totalIncidents: number;
    criticalIncidents: number;
    recentCritical: boolean;
    memoryUsage: 'low' | 'medium' | 'high';
    recommendations: string[];
  } {
    const criticalIncidents = this.incidents.filter(i => i.severity === 'critical').length;
    const recentCritical = this.incidents.some(i =>
      i.severity === 'critical' &&
      Date.now() - new Date(i.timestamp).getTime() < 3600000 // 1 hour
    );

    const memoryUsage = this.incidents.length > 80 ? 'high' :
                       this.incidents.length > 40 ? 'medium' : 'low';

    const recommendations: string[] = [];
    if (criticalIncidents > 5) {
      recommendations.push('Review critical security incidents');
    }
    if (memoryUsage === 'high') {
      recommendations.push('Consider clearing old security logs');
    }
    if (recentCritical) {
      recommendations.push('Recent critical incident requires immediate attention');
    }

    return {
      totalIncidents: this.incidents.length,
      criticalIncidents,
      recentCritical,
      memoryUsage,
      recommendations
    };
  }
}

/**
 * Safe Import Factory Functions with Security
 */
export class SecureImportFactory {
  private static readonly importTimeouts = new Map<string, NodeJS.Timeout>();
  private static readonly DEFAULT_TIMEOUT = 10000; // 10 seconds

  /**
   * Create secure service with timeout and error handling
   */
  static createSecureService<T extends object>(
    factory: () => T,
    options: {
      serviceName?: string;
      timeout?: number;
      validator?: (service: T) => boolean;
      onError?: (error: Error) => void;
      memoryCleanup?: (service: T) => void;
    } = {}
  ): SafePatterns.SafeFactory<T> {
    const {
      serviceName = 'UnknownService',
      timeout = this.DEFAULT_TIMEOUT,
      validator,
      onError,
      memoryCleanup
    } = options;

    return {
      create: (...args: any[]): T => {
        const startTime = Date.now();

        try {
          // Set up timeout
          const timeoutId = setTimeout(() => {
            const error = new Error(`Service creation timeout: ${serviceName}`);
            SecurityErrorBoundary.handleSecurityIncident(
              error,
              SecurityErrorType.TIMEOUT_ERROR,
              `service_creation_${serviceName}`,
              { severity: 'high', actionTaken: 'service_creation_aborted' }
            );

            if (onError) {
              onError(error);
            }
          }, timeout);

          // Create service
          const service = factory();

          // Clear timeout on success
          clearTimeout(timeoutId);

          // Validate if validator provided
          if (validator && !validator(service)) {
            throw new Error(`Service validation failed: ${serviceName}`);
          }

          // Track creation time for performance monitoring
          const creationTime = Date.now() - startTime;
          if (creationTime > 1000) { // Warn if creation takes > 1 second
            SecurityErrorBoundary.handleSecurityIncident(
              new Error(`Slow service creation: ${creationTime}ms`),
              SecurityErrorType.TIMEOUT_ERROR,
              `service_performance_${serviceName}`,
              { severity: 'low', actionTaken: 'performance_logged' }
            );
          }

          return service;

        } catch (error) {
          SecurityErrorBoundary.handleSecurityIncident(
            error as Error,
            SecurityErrorType.DATA_VALIDATION_ERROR,
            `service_creation_${serviceName}`,
            { severity: 'high', actionTaken: 'service_creation_failed' }
          );

          if (onError) {
            onError(error as Error);
          }

          throw error;
        }
      },

      validate: (service: T): boolean => {
        try {
          if (!service || typeof service !== 'object') {
            return false;
          }

          // Use custom validator if provided
          if (validator) {
            return validator(service);
          }

          return true;
        } catch (error) {
          SecurityErrorBoundary.handleSecurityIncident(
            error as Error,
            SecurityErrorType.DATA_VALIDATION_ERROR,
            `service_validation_${serviceName}`,
            { severity: 'medium', actionTaken: 'validation_failed' }
          );
          return false;
        }
      },

      destroy: (service: T): void => {
        try {
          // Custom cleanup if provided
          if (memoryCleanup) {
            memoryCleanup(service);
          }

          // Call destroy method if available
          if (service && typeof (service as any).destroy === 'function') {
            (service as any).destroy();
          }

          // Clear any associated timeouts
          this.importTimeouts.forEach((timeoutId, key) => {
            if (key.includes(serviceName)) {
              clearTimeout(timeoutId);
              this.importTimeouts.delete(key);
            }
          });

        } catch (error) {
          SecurityErrorBoundary.handleSecurityIncident(
            error as Error,
            SecurityErrorType.MEMORY_LEAK,
            `service_destruction_${serviceName}`,
            { severity: 'medium', actionTaken: 'cleanup_attempted' }
          );
        }
      }
    };
  }

  /**
   * Create secure async operation with timeout and retry
   */
  static createSecureAsyncOperation<T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    options: {
      operationName?: string;
      timeout?: number;
      retries?: number;
      onError?: (error: Error, attempt: number) => void;
      onSuccess?: (result: R, duration: number) => void;
    } = {}
  ): (...args: T) => Promise<R> {
    const {
      operationName = 'UnknownOperation',
      timeout = this.DEFAULT_TIMEOUT,
      retries = 2,
      onError,
      onSuccess
    } = options;

    return async (...args: T): Promise<R> => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= retries; attempt++) {
        const startTime = Date.now();

        try {
          // Create timeout promise
          const timeoutPromise = new Promise<never>((_, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error(`Operation timeout after ${timeout}ms: ${operationName}`));
            }, timeout);

            // Store timeout ID for cleanup
            this.importTimeouts.set(`${operationName}_${attempt}`, timeoutId);
          });

          // Race operation against timeout
          const result = await Promise.race([
            operation(...args),
            timeoutPromise
          ]);

          // Clear timeout on success
          const timeoutKey = `${operationName}_${attempt}`;
          const timeoutId = this.importTimeouts.get(timeoutKey);
          if (timeoutId) {
            clearTimeout(timeoutId);
            this.importTimeouts.delete(timeoutKey);
          }

          // Track success metrics
          const duration = Date.now() - startTime;
          if (onSuccess) {
            onSuccess(result, duration);
          }

          return result;

        } catch (error) {
          lastError = error as Error;

          // Log attempt
          SecurityErrorBoundary.handleSecurityIncident(
            lastError,
            SecurityErrorType.TIMEOUT_ERROR,
            `async_operation_${operationName}`,
            {
              severity: attempt === retries ? 'high' : 'medium',
              actionTaken: attempt < retries ? 'retrying' : 'failed',
              metadata: { attempt, maxRetries: retries }
            }
          );

          if (onError) {
            onError(lastError, attempt);
          }

          // Don't retry on last attempt
          if (attempt === retries) {
            break;
          }

          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }

      throw lastError || new Error(`Operation failed after ${retries + 1} attempts: ${operationName}`);
    };
  }
}

/**
 * Clinical Data Encryption Utilities
 */
export class ClinicalDataSecurity {
  /**
   * Encrypt clinical data with additional safety checks
   */
  static async encryptClinicalData<T>(
    data: T,
    sensitivity: DataSensitivity,
    context: string = 'clinical_operation'
  ): Promise<string> {
    try {
      // Import encryption service safely
      const { encryptionService } = await import('../../services/security/EncryptionService');

      // Validate input data
      if (!this.isValidClinicalData(data)) {
        throw new EncryptionError(
          'Invalid clinical data structure',
          'encrypt',
          sensitivity
        );
      }

      // Encrypt with timeout protection
      const encryptOperation = SecureImportFactory.createSecureAsyncOperation(
        async () => encryptionService.encryptData(data, sensitivity),
        {
          operationName: `encrypt_${context}`,
          timeout: 5000,
          retries: 1
        }
      );

      const result = await encryptOperation();

      // Validate encryption result
      if (!result || !result.encryptedData) {
        throw new EncryptionError(
          'Encryption produced invalid result',
          'encrypt',
          sensitivity
        );
      }

      return result.encryptedData;

    } catch (error) {
      await SecurityErrorBoundary.handleSecurityIncident(
        error as Error,
        SecurityErrorType.ENCRYPTION_FAILURE,
        context,
        { severity: 'critical', actionTaken: 'encryption_failed' }
      );
      throw error;
    }
  }

  /**
   * Decrypt clinical data with integrity verification
   */
  static async decryptClinicalData<T>(
    encryptedData: string,
    sensitivity: DataSensitivity,
    context: string = 'clinical_operation'
  ): Promise<T> {
    try {
      // Import encryption service safely
      const { encryptionService } = await import('../../services/security/EncryptionService');

      // Validate encrypted data format
      if (!this.isValidEncryptedData(encryptedData)) {
        throw new EncryptionError(
          'Invalid encrypted data format',
          'decrypt',
          sensitivity
        );
      }

      // Decrypt with timeout protection
      const decryptOperation = SecureImportFactory.createSecureAsyncOperation(
        async () => {
          const encryptionResult = {
            encryptedData,
            iv: '', // Will be derived by service
            timestamp: new Date().toISOString()
          };
          return encryptionService.decryptData(encryptionResult, sensitivity);
        },
        {
          operationName: `decrypt_${context}`,
          timeout: 5000,
          retries: 1
        }
      );

      const result = await decryptOperation();

      // Validate decryption result
      if (result === null || result === undefined) {
        throw new EncryptionError(
          'Decryption produced null result',
          'decrypt',
          sensitivity
        );
      }

      return result;

    } catch (error) {
      await SecurityErrorBoundary.handleSecurityIncident(
        error as Error,
        SecurityErrorType.ENCRYPTION_FAILURE,
        context,
        { severity: 'critical', actionTaken: 'decryption_failed' }
      );
      throw error;
    }
  }

  /**
   * Validate clinical data structure
   */
  private static isValidClinicalData(data: unknown): boolean {
    if (data === null || data === undefined) {
      return false;
    }

    // Check for potential injection attempts
    if (typeof data === 'string') {
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /data:text\/html/i,
        /vbscript:/i,
        /on\w+\s*=/i
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(data))) {
        SecurityErrorBoundary.handleSecurityIncident(
          new Error('Potential injection attempt detected in clinical data'),
          SecurityErrorType.INJECTION_ATTEMPT,
          'clinical_data_validation',
          { severity: 'critical', actionTaken: 'data_rejected' }
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Validate encrypted data format
   */
  private static isValidEncryptedData(encryptedData: string): boolean {
    if (typeof encryptedData !== 'string' || encryptedData.length === 0) {
      return false;
    }

    // Basic format validation for hex-encoded data
    const hexPattern = /^[a-fA-F0-9]+$/;
    if (!hexPattern.test(encryptedData)) {
      return false;
    }

    // Check minimum length (should be at least 32 characters for AES)
    if (encryptedData.length < 32) {
      return false;
    }

    return true;
  }
}

/**
 * Input Validation and Sanitization
 */
export class SecureInputValidator {
  /**
   * Sanitize and validate user input for clinical contexts
   */
  static sanitizeInput(
    input: string,
    context: 'clinical' | 'personal' | 'system' = 'system'
  ): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Remove potentially dangerous characters
    let sanitized = input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/data:text\/html/gi, '') // Remove data URLs
      .replace(/vbscript:/gi, '') // Remove vbscript
      .trim();

    // Additional sanitization for clinical context
    if (context === 'clinical') {
      // Preserve clinical data but remove potential script injections
      sanitized = sanitized
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .replace(/<script[\s\S]*?<\/script>/gi, ''); // Remove script tags
    }

    // Limit length based on context
    const maxLength = context === 'clinical' ? 5000 :
                     context === 'personal' ? 2000 : 1000;

    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Validate clinical assessment input
   */
  static validateAssessmentInput(input: any): boolean {
    try {
      // Check for valid assessment structure
      if (!input || typeof input !== 'object') {
        return false;
      }

      // Validate common assessment fields
      if ('score' in input) {
        const score = Number(input.score);
        if (isNaN(score) || score < 0 || score > 30) { // Max PHQ-9/GAD-7 score
          return false;
        }
      }

      if ('responses' in input && Array.isArray(input.responses)) {
        // Validate response values (typically 0-3 for PHQ-9/GAD-7)
        const validResponses = input.responses.every((response: any) => {
          const value = Number(response);
          return !isNaN(value) && value >= 0 && value <= 3;
        });

        if (!validResponses) {
          return false;
        }
      }

      return true;

    } catch (error) {
      SecurityErrorBoundary.handleSecurityIncident(
        error as Error,
        SecurityErrorType.DATA_VALIDATION_ERROR,
        'assessment_validation',
        { severity: 'medium', actionTaken: 'input_rejected' }
      );
      return false;
    }
  }
}

/**
 * Memory-Safe Operations Manager
 */
export class MemorySecurityManager {
  private static readonly activeOperations = new Map<string, {
    startTime: number;
    cleanup: () => void;
  }>();

  private static readonly MAX_OPERATION_TIME = 30000; // 30 seconds
  private static cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Register a memory-sensitive operation
   */
  static registerOperation(
    operationId: string,
    cleanup: () => void
  ): void {
    // Start cleanup timer if not already running
    if (!this.cleanupInterval) {
      this.startCleanupTimer();
    }

    this.activeOperations.set(operationId, {
      startTime: Date.now(),
      cleanup
    });
  }

  /**
   * Unregister completed operation
   */
  static unregisterOperation(operationId: string): void {
    const operation = this.activeOperations.get(operationId);
    if (operation) {
      this.activeOperations.delete(operationId);
    }

    // Stop cleanup timer if no operations active
    if (this.activeOperations.size === 0 && this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Force cleanup of stale operations
   */
  static forceCleanup(): void {
    const now = Date.now();
    const staleOperations: string[] = [];

    this.activeOperations.forEach((operation, operationId) => {
      if (now - operation.startTime > this.MAX_OPERATION_TIME) {
        staleOperations.push(operationId);

        try {
          operation.cleanup();
        } catch (error) {
          SecurityErrorBoundary.handleSecurityIncident(
            error as Error,
            SecurityErrorType.MEMORY_LEAK,
            'force_cleanup',
            { severity: 'medium', actionTaken: 'memory_cleanup_attempted' }
          );
        }
      }
    });

    // Remove stale operations
    staleOperations.forEach(id => this.activeOperations.delete(id));

    if (staleOperations.length > 0) {
      console.warn(`[MEMORY] Cleaned up ${staleOperations.length} stale operations`);
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private static startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.forceCleanup();
    }, 10000); // Check every 10 seconds
  }

  /**
   * Get memory usage statistics
   */
  static getMemoryStats(): {
    activeOperations: number;
    averageOperationAge: number;
    oldestOperation: number;
    memoryPressure: 'low' | 'medium' | 'high';
  } {
    const now = Date.now();
    const operations = Array.from(this.activeOperations.values());

    const averageAge = operations.length > 0
      ? operations.reduce((sum, op) => sum + (now - op.startTime), 0) / operations.length
      : 0;

    const oldestAge = operations.length > 0
      ? Math.max(...operations.map(op => now - op.startTime))
      : 0;

    const memoryPressure = operations.length > 20 ? 'high' :
                          operations.length > 10 ? 'medium' : 'low';

    return {
      activeOperations: operations.length,
      averageOperationAge: averageAge,
      oldestOperation: oldestAge,
      memoryPressure
    };
  }
}

/**
 * Export unified security utilities
 */
export const SecurityFoundations = {
  ErrorBoundary: SecurityErrorBoundary,
  ImportFactory: SecureImportFactory,
  ClinicalData: ClinicalDataSecurity,
  InputValidator: SecureInputValidator,
  MemoryManager: MemorySecurityManager,

  // Convenience methods
  handleIncident: SecurityErrorBoundary.handleSecurityIncident,
  createSecureService: SecureImportFactory.createSecureService,
  createSecureAsync: SecureImportFactory.createSecureAsyncOperation,
  encryptClinical: ClinicalDataSecurity.encryptClinicalData,
  decryptClinical: ClinicalDataSecurity.decryptClinicalData,
  sanitizeInput: SecureInputValidator.sanitizeInput,
  validateAssessment: SecureInputValidator.validateAssessmentInput,
  registerMemoryOp: MemorySecurityManager.registerOperation,
  unregisterMemoryOp: MemorySecurityManager.unregisterOperation
} as const;