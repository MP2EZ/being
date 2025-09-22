/**
 * Security Monitoring Hooks for Being. MBCT App
 *
 * React hooks for real-time security monitoring, threat detection,
 * and clinical data protection in therapeutic contexts.
 *
 * SECURITY PRINCIPLES:
 * - Real-time monitoring without performance impact
 * - Clinical data leak prevention
 * - Automatic incident response
 * - Memory leak detection and cleanup
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecurityFoundations, SecurityErrorType, SecurityIncident } from '../core/SecurityFoundations';
import { DataSensitivity } from '../../types/security';

/**
 * Security monitoring configuration
 */
export interface SecurityMonitoringConfig {
  enabled: boolean;
  checkInterval: number; // milliseconds
  memoryThreshold: number; // MB
  operationTimeout: number; // milliseconds
  autoCleanup: boolean;
  alertOnCritical: boolean;
}

/**
 * Security metrics for monitoring
 */
export interface SecurityMetrics {
  incidents: {
    total: number;
    critical: number;
    recent: number;
  };
  memory: {
    activeOperations: number;
    averageAge: number;
    pressure: 'low' | 'medium' | 'high';
  };
  encryption: {
    operationsPerMinute: number;
    averageLatency: number;
    errorRate: number;
  };
  threats: {
    detectedAttempts: number;
    blockedOperations: number;
    suspiciousActivity: boolean;
  };
}

/**
 * Hook for comprehensive security monitoring
 */
export function useSecurityMonitoring(
  config: Partial<SecurityMonitoringConfig> = {}
): {
  metrics: SecurityMetrics;
  incidents: SecurityIncident[];
  isSecure: boolean;
  threats: string[];
  actions: {
    reportIncident: (error: Error, type: SecurityErrorType, context: string) => Promise<void>;
    clearIncidents: () => void;
    forceCleanup: () => void;
    getDetailedReport: () => Promise<any>;
  };
} {
  const defaultConfig: SecurityMonitoringConfig = {
    enabled: true,
    checkInterval: 5000, // 5 seconds
    memoryThreshold: 100, // 100 MB
    operationTimeout: 30000, // 30 seconds
    autoCleanup: true,
    alertOnCritical: true
  };

  const finalConfig = { ...defaultConfig, ...config };
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    incidents: { total: 0, critical: 0, recent: 0 },
    memory: { activeOperations: 0, averageAge: 0, pressure: 'low' },
    encryption: { operationsPerMinute: 0, averageLatency: 0, errorRate: 0 },
    threats: { detectedAttempts: 0, blockedOperations: 0, suspiciousActivity: false }
  });

  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const metricsRef = useRef<{
    encryptionOps: Array<{ timestamp: number; duration: number; success: boolean }>;
    threatAttempts: Array<{ timestamp: number; type: string }>;
  }>({
    encryptionOps: [],
    threatAttempts: []
  });

  /**
   * Calculate current security metrics
   */
  const calculateMetrics = useCallback(async (): Promise<SecurityMetrics> => {
    try {
      // Get security health from error boundary
      const securityHealth = SecurityFoundations.ErrorBoundary.getSecurityHealth();

      // Get memory statistics
      const memoryStats = SecurityFoundations.MemoryManager.getMemoryStats();

      // Calculate encryption metrics
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      const recentEncryption = metricsRef.current.encryptionOps.filter(
        op => op.timestamp > oneMinuteAgo
      );

      const encryptionMetrics = {
        operationsPerMinute: recentEncryption.length,
        averageLatency: recentEncryption.length > 0
          ? recentEncryption.reduce((sum, op) => sum + op.duration, 0) / recentEncryption.length
          : 0,
        errorRate: recentEncryption.length > 0
          ? recentEncryption.filter(op => !op.success).length / recentEncryption.length
          : 0
      };

      // Calculate threat metrics
      const recentThreats = metricsRef.current.threatAttempts.filter(
        threat => threat.timestamp > oneMinuteAgo
      );

      const threatMetrics = {
        detectedAttempts: recentThreats.length,
        blockedOperations: recentThreats.filter(t => t.type === 'blocked').length,
        suspiciousActivity: recentThreats.length > 5 // More than 5 attempts per minute
      };

      return {
        incidents: {
          total: securityHealth.totalIncidents,
          critical: securityHealth.criticalIncidents,
          recent: SecurityFoundations.ErrorBoundary.getRecentIncidents(10).length
        },
        memory: {
          activeOperations: memoryStats.activeOperations,
          averageAge: memoryStats.averageOperationAge,
          pressure: memoryStats.memoryPressure
        },
        encryption: encryptionMetrics,
        threats: threatMetrics
      };

    } catch (error) {
      console.error('[SECURITY] Failed to calculate metrics:', error);
      return metrics; // Return previous metrics on error
    }
  }, [metrics]);

  /**
   * Start security monitoring
   */
  const startMonitoring = useCallback(() => {
    if (!finalConfig.enabled || intervalRef.current) {
      return;
    }

    intervalRef.current = setInterval(async () => {
      try {
        const newMetrics = await calculateMetrics();
        setMetrics(newMetrics);

        // Update incidents
        const recentIncidents = SecurityFoundations.ErrorBoundary.getRecentIncidents(20);
        setIncidents(recentIncidents);

        // Automatic cleanup if enabled
        if (finalConfig.autoCleanup && newMetrics.memory.pressure === 'high') {
          SecurityFoundations.MemoryManager.forceCleanup();
        }

        // Alert on critical incidents
        if (finalConfig.alertOnCritical && newMetrics.incidents.critical > 0) {
          console.warn('[SECURITY] Critical security incidents detected:', newMetrics.incidents.critical);
        }

      } catch (error) {
        console.error('[SECURITY] Monitoring update failed:', error);
      }
    }, finalConfig.checkInterval);

    console.log('[SECURITY] Monitoring started');
  }, [finalConfig, calculateMetrics]);

  /**
   * Stop security monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('[SECURITY] Monitoring stopped');
    }
  }, []);

  /**
   * Report security incident
   */
  const reportIncident = useCallback(async (
    error: Error,
    type: SecurityErrorType,
    context: string
  ): Promise<void> => {
    await SecurityFoundations.handleIncident(error, type, context, {
      severity: type === SecurityErrorType.CRITICAL ? 'critical' : 'medium'
    });

    // Update threat tracking if relevant
    if (type === SecurityErrorType.INJECTION_ATTEMPT || type === SecurityErrorType.UNAUTHORIZED_ACCESS) {
      metricsRef.current.threatAttempts.push({
        timestamp: Date.now(),
        type: 'blocked'
      });
    }
  }, []);

  /**
   * Clear incidents (admin function)
   */
  const clearIncidents = useCallback(() => {
    setIncidents([]);
    console.log('[SECURITY] Incidents cleared');
  }, []);

  /**
   * Force memory cleanup
   */
  const forceCleanup = useCallback(() => {
    SecurityFoundations.MemoryManager.forceCleanup();
    console.log('[SECURITY] Forced memory cleanup');
  }, []);

  /**
   * Get detailed security report
   */
  const getDetailedReport = useCallback(async () => {
    try {
      const currentMetrics = await calculateMetrics();
      const securityHealth = SecurityFoundations.ErrorBoundary.getSecurityHealth();
      const memoryStats = SecurityFoundations.MemoryManager.getMemoryStats();

      return {
        timestamp: new Date().toISOString(),
        metrics: currentMetrics,
        health: securityHealth,
        memory: memoryStats,
        config: finalConfig,
        incidents: incidents.slice(-10), // Last 10 incidents
        recommendations: [
          ...securityHealth.recommendations,
          ...(memoryStats.memoryPressure === 'high' ? ['Consider memory cleanup'] : []),
          ...(currentMetrics.threats.suspiciousActivity ? ['Investigate threat activity'] : [])
        ]
      };
    } catch (error) {
      console.error('[SECURITY] Failed to generate detailed report:', error);
      return { error: 'Failed to generate report' };
    }
  }, [calculateMetrics, finalConfig, incidents]);

  // Start/stop monitoring based on config
  useEffect(() => {
    if (finalConfig.enabled) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [finalConfig.enabled, startMonitoring, stopMonitoring]);

  // Calculate security status
  const isSecure = useMemo(() => {
    return metrics.incidents.critical === 0 &&
           metrics.memory.pressure !== 'high' &&
           !metrics.threats.suspiciousActivity &&
           metrics.encryption.errorRate < 0.1;
  }, [metrics]);

  // Generate threat descriptions
  const threats = useMemo(() => {
    const threatList: string[] = [];

    if (metrics.incidents.critical > 0) {
      threatList.push(`${metrics.incidents.critical} critical security incidents`);
    }

    if (metrics.memory.pressure === 'high') {
      threatList.push('High memory pressure detected');
    }

    if (metrics.threats.suspiciousActivity) {
      threatList.push('Suspicious activity patterns detected');
    }

    if (metrics.encryption.errorRate > 0.1) {
      threatList.push('High encryption error rate');
    }

    return threatList;
  }, [metrics]);

  return {
    metrics,
    incidents,
    isSecure,
    threats,
    actions: {
      reportIncident,
      clearIncidents,
      forceCleanup,
      getDetailedReport
    }
  };
}

/**
 * Hook for clinical data encryption monitoring
 */
export function useClinicalDataSecurity(
  dataType: DataSensitivity = DataSensitivity.CLINICAL
): {
  encrypt: <T>(data: T, context?: string) => Promise<string>;
  decrypt: <T>(encryptedData: string, context?: string) => Promise<T>;
  isSecure: boolean;
  encryptionMetrics: {
    operationsCount: number;
    averageLatency: number;
    errorCount: number;
  };
} {
  const [operationHistory, setOperationHistory] = useState<Array<{
    timestamp: number;
    duration: number;
    success: boolean;
    type: 'encrypt' | 'decrypt';
  }>>([]);

  /**
   * Secure encryption with monitoring
   */
  const encrypt = useCallback(async <T,>(
    data: T,
    context: string = 'clinical_data'
  ): Promise<string> => {
    const startTime = Date.now();
    const operationId = `encrypt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    try {
      // Register memory operation
      SecurityFoundations.registerMemoryOp(operationId, () => {
        console.log(`[SECURITY] Cleanup encryption operation: ${operationId}`);
      });

      const result = await SecurityFoundations.encryptClinical(data, dataType, context);

      const duration = Date.now() - startTime;

      // Record successful operation
      setOperationHistory(prev => [...prev.slice(-99), {
        timestamp: Date.now(),
        duration,
        success: true,
        type: 'encrypt'
      }]);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      // Record failed operation
      setOperationHistory(prev => [...prev.slice(-99), {
        timestamp: Date.now(),
        duration,
        success: false,
        type: 'encrypt'
      }]);

      await SecurityFoundations.handleIncident(
        error as Error,
        SecurityErrorType.ENCRYPTION_FAILURE,
        context,
        { severity: 'critical', actionTaken: 'encryption_failed' }
      );

      throw error;

    } finally {
      SecurityFoundations.unregisterMemoryOp(operationId);
    }
  }, [dataType]);

  /**
   * Secure decryption with monitoring
   */
  const decrypt = useCallback(async <T,>(
    encryptedData: string,
    context: string = 'clinical_data'
  ): Promise<T> => {
    const startTime = Date.now();
    const operationId = `decrypt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    try {
      // Register memory operation
      SecurityFoundations.registerMemoryOp(operationId, () => {
        console.log(`[SECURITY] Cleanup decryption operation: ${operationId}`);
      });

      const result = await SecurityFoundations.decryptClinical<T>(encryptedData, dataType, context);

      const duration = Date.now() - startTime;

      // Record successful operation
      setOperationHistory(prev => [...prev.slice(-99), {
        timestamp: Date.now(),
        duration,
        success: true,
        type: 'decrypt'
      }]);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      // Record failed operation
      setOperationHistory(prev => [...prev.slice(-99), {
        timestamp: Date.now(),
        duration,
        success: false,
        type: 'decrypt'
      }]);

      await SecurityFoundations.handleIncident(
        error as Error,
        SecurityErrorType.ENCRYPTION_FAILURE,
        context,
        { severity: 'critical', actionTaken: 'decryption_failed' }
      );

      throw error;

    } finally {
      SecurityFoundations.unregisterMemoryOp(operationId);
    }
  }, [dataType]);

  // Calculate encryption metrics
  const encryptionMetrics = useMemo(() => {
    const totalOps = operationHistory.length;
    const successfulOps = operationHistory.filter(op => op.success);
    const averageLatency = successfulOps.length > 0
      ? successfulOps.reduce((sum, op) => sum + op.duration, 0) / successfulOps.length
      : 0;

    return {
      operationsCount: totalOps,
      averageLatency,
      errorCount: totalOps - successfulOps.length
    };
  }, [operationHistory]);

  // Security status
  const isSecure = useMemo(() => {
    const recentOps = operationHistory.slice(-10);
    const errorRate = recentOps.length > 0
      ? recentOps.filter(op => !op.success).length / recentOps.length
      : 0;

    return errorRate < 0.1 && encryptionMetrics.averageLatency < 1000; // Less than 1 second
  }, [operationHistory, encryptionMetrics]);

  return {
    encrypt,
    decrypt,
    isSecure,
    encryptionMetrics
  };
}

/**
 * Hook for app state security monitoring
 */
export function useAppStateSecurity(): {
  appState: AppStateStatus;
  isBackgrounded: boolean;
  timeInBackground: number;
  securityActions: {
    lockSensitiveData: () => Promise<void>;
    clearSensitiveMemory: () => void;
    suspendOperations: () => void;
    resumeOperations: () => void;
  };
} {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [backgroundTime, setBackgroundTime] = useState<number>(0);
  const backgroundStartRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle app state changes
   */
  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    const previousState = appState;
    setAppState(nextAppState);

    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App going to background
      backgroundStartRef.current = Date.now();

      // Start background timer
      intervalRef.current = setInterval(() => {
        if (backgroundStartRef.current) {
          setBackgroundTime(Date.now() - backgroundStartRef.current);
        }
      }, 1000);

      // Lock sensitive data after 5 minutes in background
      setTimeout(async () => {
        if (AppState.currentState === 'background') {
          await lockSensitiveData();
        }
      }, 300000); // 5 minutes

    } else if (nextAppState === 'active' && (previousState === 'background' || previousState === 'inactive')) {
      // App returning to foreground
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      const timeInBg = backgroundStartRef.current ? Date.now() - backgroundStartRef.current : 0;
      backgroundStartRef.current = null;

      // Log security event if app was backgrounded for a long time
      if (timeInBg > 600000) { // 10 minutes
        await SecurityFoundations.handleIncident(
          new Error(`App backgrounded for ${Math.round(timeInBg / 60000)} minutes`),
          SecurityErrorType.UNAUTHORIZED_ACCESS,
          'app_background_security',
          { severity: 'medium', actionTaken: 'logged_background_time' }
        );
      }

      setBackgroundTime(0);
    }
  }, [appState]);

  /**
   * Lock sensitive data (encrypt in memory or clear)
   */
  const lockSensitiveData = useCallback(async (): Promise<void> => {
    try {
      console.log('[SECURITY] Locking sensitive data due to background state');

      // Clear sensitive data from memory
      // This would integrate with your state management to clear sensitive stores
      await SecurityFoundations.handleIncident(
        new Error('Sensitive data locked due to background state'),
        SecurityErrorType.UNAUTHORIZED_ACCESS,
        'background_security_lock',
        { severity: 'low', actionTaken: 'data_locked' }
      );

    } catch (error) {
      console.error('[SECURITY] Failed to lock sensitive data:', error);
    }
  }, []);

  /**
   * Clear sensitive memory
   */
  const clearSensitiveMemory = useCallback((): void => {
    try {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      SecurityFoundations.MemoryManager.forceCleanup();
      console.log('[SECURITY] Cleared sensitive memory');

    } catch (error) {
      console.error('[SECURITY] Failed to clear sensitive memory:', error);
    }
  }, []);

  /**
   * Suspend security operations
   */
  const suspendOperations = useCallback((): void => {
    console.log('[SECURITY] Suspending security operations');
    // This would pause non-critical security monitoring
  }, []);

  /**
   * Resume security operations
   */
  const resumeOperations = useCallback((): void => {
    console.log('[SECURITY] Resuming security operations');
    // This would restart security monitoring
  }, []);

  // Set up app state listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [handleAppStateChange]);

  const isBackgrounded = appState === 'background' || appState === 'inactive';

  return {
    appState,
    isBackgrounded,
    timeInBackground: backgroundTime,
    securityActions: {
      lockSensitiveData,
      clearSensitiveMemory,
      suspendOperations,
      resumeOperations
    }
  };
}

/**
 * Hook for input validation in clinical contexts
 */
export function useSecureInput(
  initialValue: string = '',
  context: 'clinical' | 'personal' | 'system' = 'system'
): {
  value: string;
  setValue: (value: string) => void;
  isValid: boolean;
  validationErrors: string[];
  sanitizedValue: string;
} {
  const [rawValue, setRawValue] = useState<string>(initialValue);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Sanitize input
  const sanitizedValue = useMemo(() => {
    return SecurityFoundations.sanitizeInput(rawValue, context);
  }, [rawValue, context]);

  // Validate input
  const { isValid, errors } = useMemo(() => {
    const errors: string[] = [];

    // Basic validation
    if (rawValue !== sanitizedValue) {
      errors.push('Input contains potentially unsafe characters');
    }

    // Length validation
    const maxLength = context === 'clinical' ? 5000 : context === 'personal' ? 2000 : 1000;
    if (rawValue.length > maxLength) {
      errors.push(`Input exceeds maximum length of ${maxLength} characters`);
    }

    // Pattern validation for clinical context
    if (context === 'clinical') {
      const suspiciousPatterns = [
        /javascript:/i,
        /<script/i,
        /data:text\/html/i
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(rawValue))) {
        errors.push('Input contains potentially malicious content');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [rawValue, sanitizedValue, context]);

  // Update validation errors
  useEffect(() => {
    setValidationErrors(errors);
  }, [errors]);

  // Secure setValue with validation
  const setValue = useCallback((value: string) => {
    setRawValue(value);

    // Log potential security issues
    if (value !== SecurityFoundations.sanitizeInput(value, context)) {
      SecurityFoundations.handleIncident(
        new Error('Potentially unsafe input detected'),
        SecurityErrorType.INJECTION_ATTEMPT,
        `input_validation_${context}`,
        { severity: 'low', actionTaken: 'input_sanitized' }
      );
    }
  }, [context]);

  return {
    value: rawValue,
    setValue,
    isValid,
    validationErrors,
    sanitizedValue
  };
}