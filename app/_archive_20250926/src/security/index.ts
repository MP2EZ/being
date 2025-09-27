/**
 * Security Foundations Index
 *
 * Centralized export of all security utilities for the Being. MBCT app.
 * Provides easy access to comprehensive security features while maintaining
 * strict separation of concerns and clinical data protection.
 */

// Core security foundations
export { SecurityFoundations, SecurityErrorType } from './core/SecurityFoundations';
export type { SecurityIncident } from './core/SecurityFoundations';

// Security monitoring hooks
export {
  useSecurityMonitoring,
  useClinicalDataSecurity,
  useAppStateSecurity,
  useSecureInput
} from './hooks/SecurityMonitoringHooks';

export type {
  SecurityMonitoringConfig,
  SecurityMetrics
} from './hooks/SecurityMonitoringHooks';

// Secure context factory
export {
  createSecureContext,
  createClinicalAssessmentContext,
  createPersonalDataContext,
  createSystemContext,
  createCrisisPlanContext,
  ContextSecurityUtils
} from './context/SecureContextFactory';

export type {
  SecureContextConfig,
  SecureContextProviderProps
} from './context/SecureContextFactory';

// Input validation middleware
export { inputValidationMiddleware } from './middleware/InputValidationMiddleware';
export type {
  ValidationRule,
  ValidationContext,
  ValidationResult
} from './middleware/InputValidationMiddleware';

// Enhanced error boundary (re-export)
export {
  ErrorBoundary,
  NavigationErrorBoundary,
  AssessmentErrorBoundary,
  CrisisErrorBoundary,
  TherapeuticErrorBoundary,
  DataErrorBoundary
} from '../components/error/ErrorBoundary';

export type {
  ErrorSeverity,
  ErrorContext,
  ErrorDetails
} from '../components/error/ErrorBoundary';

// Security types (re-export for convenience)
export {
  DataSensitivity,
  EncryptionError,
  KeyManagementError
} from '../types/security';

export type {
  EncryptedData,
  PlaintextData,
  EncryptionResult,
  EncryptionMetadata,
  SecureEncryptionService,
  EncryptionStatus
} from '../types/security';

/**
 * Main Security API - Recommended usage patterns
 */
export const BeingSecurityAPI = {
  // Core utilities
  Foundation: SecurityFoundations,

  // Clinical data protection
  Clinical: {
    encrypt: SecurityFoundations.encryptClinical,
    decrypt: SecurityFoundations.decryptClinical,
    createContext: createClinicalAssessmentContext,
    createCrisisContext: createCrisisPlanContext
  },

  // Input validation and sanitization
  Input: {
    validate: inputValidationMiddleware.validateInput.bind(inputValidationMiddleware),
    sanitize: inputValidationMiddleware.sanitizeInput.bind(inputValidationMiddleware),
    registerRule: inputValidationMiddleware.registerRule.bind(inputValidationMiddleware)
  },

  // Memory and performance security
  Memory: {
    register: SecurityFoundations.registerMemoryOp,
    unregister: SecurityFoundations.unregisterMemoryOp,
    cleanup: SecurityFoundations.MemoryManager.forceCleanup,
    stats: SecurityFoundations.MemoryManager.getMemoryStats
  },

  // Incident reporting and monitoring
  Incidents: {
    report: SecurityFoundations.handleIncident,
    getRecent: SecurityFoundations.ErrorBoundary.getRecentIncidents,
    getHealth: SecurityFoundations.ErrorBoundary.getSecurityHealth
  },

  // Secure component creation
  Components: {
    createSecureService: SecurityFoundations.createSecureService,
    createSecureAsync: SecurityFoundations.createSecureAsync,
    createSecureContext: createSecureContext
  }
} as const;

/**
 * Quick setup utilities for common security patterns
 */
export const SecurityQuickSetup = {
  /**
   * Initialize security for clinical context
   */
  initializeClinicalSecurity: () => {
    console.log('[SECURITY] Initializing clinical security context');
    // This would set up clinical-specific security monitoring
    return {
      context: createClinicalAssessmentContext,
      encrypt: SecurityFoundations.encryptClinical,
      validate: (data: any) => inputValidationMiddleware.validateInput(
        data,
        'clinical_data',
        {
          sensitivity: DataSensitivity.CLINICAL,
          operation: 'create',
          source: 'user_input',
          sessionId: 'clinical_session'
        }
      )
    };
  },

  /**
   * Initialize security for general app context
   */
  initializeAppSecurity: () => {
    console.log('[SECURITY] Initializing general app security');
    return {
      personalContext: createPersonalDataContext,
      systemContext: createSystemContext,
      validate: (data: any, type: string = 'user_input') => inputValidationMiddleware.validateInput(
        data,
        type,
        {
          sensitivity: DataSensitivity.PERSONAL,
          operation: 'create',
          source: 'user_input',
          sessionId: 'app_session'
        }
      )
    };
  },

  /**
   * Initialize crisis security protocols
   */
  initializeCrisisSecurity: () => {
    console.log('[SECURITY] Initializing crisis security protocols');
    return {
      context: createCrisisPlanContext,
      encrypt: SecurityFoundations.encryptClinical,
      errorBoundary: CrisisErrorBoundary,
      validate: (data: any) => inputValidationMiddleware.validateInput(
        data,
        'crisis_data',
        {
          sensitivity: DataSensitivity.CLINICAL,
          operation: 'create',
          source: 'user_input',
          sessionId: 'crisis_session'
        }
      )
    };
  }
} as const;

/**
 * Security configuration constants
 */
export const SecurityConstants = {
  // Validation timeouts
  VALIDATION_TIMEOUT: 5000,
  ENCRYPTION_TIMEOUT: 10000,
  MEMORY_CLEANUP_INTERVAL: 30000,

  // Rate limiting
  MAX_VALIDATIONS_PER_MINUTE: 100,
  MAX_ENCRYPTION_OPS_PER_MINUTE: 50,

  // Memory thresholds
  HIGH_MEMORY_THRESHOLD: 100, // MB
  CRITICAL_MEMORY_THRESHOLD: 200, // MB

  // Clinical data limits
  MAX_CLINICAL_DATA_SIZE: 5000, // characters
  MAX_ASSESSMENT_RESPONSES: 9, // PHQ-9 max
  MAX_CRISIS_PLAN_SIZE: 10000, // characters

  // Security monitoring
  INCIDENT_BUFFER_SIZE: 100,
  CRITICAL_INCIDENT_THRESHOLD: 5,
  MONITORING_INTERVAL: 5000 // ms
} as const;

/**
 * Development utilities (only available in __DEV__)
 */
export const SecurityDevUtils = __DEV__ ? {
  // Test incident reporting
  testIncident: () => SecurityFoundations.handleIncident(
    new Error('Test security incident'),
    SecurityErrorType.DATA_VALIDATION_ERROR,
    'dev_test',
    { severity: 'low', actionTaken: 'testing' }
  ),

  // Clear all caches and logs
  clearSecurityData: () => {
    inputValidationMiddleware.clearCache();
    SecurityFoundations.MemoryManager.forceCleanup();
    console.log('[DEV] Security data cleared');
  },

  // Get detailed security status
  getDetailedStatus: async () => {
    const health = SecurityFoundations.ErrorBoundary.getSecurityHealth();
    const memory = SecurityFoundations.MemoryManager.getMemoryStats();
    const validation = inputValidationMiddleware.getValidationStats();

    return {
      health,
      memory,
      validation,
      timestamp: new Date().toISOString()
    };
  }
} : undefined;

// Default export for convenience
export default BeingSecurityAPI;