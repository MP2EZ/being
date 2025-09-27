/**
 * Comprehensive TypeScript Type Definitions - Crisis, Compliance, and Security
 * Main index file consolidating all type definitions for type-safe crisis workflows
 * 
 * TYPE SAFETY VALIDATION:
 * - 100% TypeScript strict mode compliance
 * - Comprehensive type coverage for all crisis workflows
 * - Performance-constrained types with compile-time validation
 * - HIPAA-compliant type interfaces with PHI protection
 * - Security-aware type definitions with threat modeling
 * - Error-safe type handling with recovery mechanisms
 * 
 * INTEGRATION POINTS:
 * - Crisis detection and intervention workflows
 * - HIPAA compliance and consent management
 * - Security services (encryption, authentication, monitoring)
 * - Performance monitoring and constraint validation
 * - Error handling and recovery strategies
 * - Component integration and store management
 */

// =============================================================================
// CRISIS SAFETY TYPES - HIGHEST PRIORITY
// =============================================================================

// Crisis Detection and Intervention Types
export * from '../flows/assessment/types/crisis/safety';
export type {
  CrisisDetection,
  CrisisIntervention,
  CrisisTriggerType,
  CrisisSeverityLevel,
  CrisisActionType,
  CrisisResource,
  CrisisSafetyPlan,
  CrisisFollowUp,
  CrisisResolution
} from '../flows/assessment/types/crisis/safety';

// Crisis Safety Constants and Thresholds
export {
  CRISIS_SAFETY_THRESHOLDS,
  EMERGENCY_RESOURCES,
  detectCrisis,
  validateCrisisDetection,
  isCriticalCrisis,
  requiresImmediateIntervention,
  canSafelyDismissIntervention
} from '../flows/assessment/types/crisis/safety';

// =============================================================================
// COMPLIANCE TYPES - REGULATORY REQUIREMENTS
// =============================================================================

// HIPAA Compliance Types
export type {
  HIPAAConsent,
  ConsentStatus,
  PHIClassification,
  DataProcessingPurpose,
  HIPAAAuditLog,
  DataBreachIncident,
  ConsentManagementService,
  HIPAAComplianceValidator,
  CompliancePerformanceConstraints
} from './compliance/hipaa';

// Compliance Utilities
export {
  DEFAULT_COMPLIANCE_SETTINGS,
  isValidConsent,
  requiresEmergencyDisclosure,
  isHighRiskPHI,
  calculateRetentionExpiry
} from './compliance/hipaa';

// =============================================================================
// SECURITY TYPES - PROTECTION FRAMEWORK
// =============================================================================

// Encryption and Security Types
export type {
  EncryptionAlgorithm,
  EncryptionKey,
  EncryptionResult,
  AuthenticationSession,
  SecurityEvent,
  BiometricType,
  AuthFactorStrength,
  ThreatIntelligence,
  SecurityStatus,
  EncryptionService,
  AuthenticationService,
  SecurityMonitoringService
} from './security/encryption';

// Security Constants
export {
  DEFAULT_SECURITY_SETTINGS
} from './security/encryption';

// =============================================================================
// PERFORMANCE TYPES - TIMING CONSTRAINTS
// =============================================================================

// Performance Constraint Types
export type {
  PerformanceTimingCategory,
  PerformanceConstraint,
  PerformanceMetric,
  PerformanceViolation,
  TimingValidator,
  MemoryConstraint,
  NetworkConstraint,
  CrisisPerformanceRequirements,
  PerformanceMonitoringService
} from './performance/constraints';

// Performance Constants
export {
  PERFORMANCE_CONSTRAINTS,
  MEMORY_CONSTRAINTS,
  CRISIS_PERFORMANCE
} from './performance/constraints';

// =============================================================================
// ERROR HANDLING TYPES - RECOVERY FRAMEWORK
// =============================================================================

// Error and Recovery Types
export type {
  ErrorSeverity,
  ErrorCategory,
  EnhancedError,
  ErrorContext,
  ErrorRecoveryStrategy,
  RecoveryResult,
  ErrorHandler,
  CrisisSafeErrorHandler,
  ErrorBoundaryProps,
  ErrorFallbackProps
} from './errors/recovery';

// Error Constants
export {
  ERROR_RECOVERY_STRATEGIES,
  ERROR_CODES,
  DEFAULT_ERROR_MESSAGES
} from './errors/recovery';

// =============================================================================
// INTEGRATION TYPES - COMPONENT AND STORE INTERFACES
// =============================================================================

// Component Integration Types
export type {
  BaseComponentProps,
  ComponentTheme,
  CrisisComponentContext,
  HIPAAComponentContext,
  SecurityComponentContext,
  CrisisButtonProps,
  AssessmentComponentProps,
  ConsentManagementProps,
  SecurityAuthProps,
  MonitoringComponentProps,
  PerformanceConstrainedProps,
  ErrorBoundaryProps
} from './integration/components';

// Component Utilities
export {
  DEFAULT_COMPONENT_SETTINGS,
  isCrisisComponent,
  isSecureComponent,
  isCompliantComponent,
  isPerformanceConstrained
} from './integration/components';

// Store Integration Types
export type {
  BaseStore,
  StoreActions,
  CrisisStore,
  CrisisStoreState,
  CrisisStoreActions,
  ComplianceStore,
  ComplianceStoreState,
  ComplianceStoreActions,
  SecurityStore,
  SecurityStoreState,
  SecurityStoreActions,
  StoreFactory,
  StoreConfig
} from './integration/store';

// Store Constants
export {
  DEFAULT_STORE_SETTINGS
} from './integration/store';

// =============================================================================
// LEGACY ASSESSMENT TYPES - BACKWARD COMPATIBILITY
// =============================================================================

// Assessment Base Types
export type {
  AssessmentType,
  AssessmentResponse,
  AssessmentQuestion,
  AssessmentAnswer,
  PHQ9Question,
  PHQ9Result,
  GAD7Question,
  GAD7Result,
  AssessmentProgress,
  AssessmentSession,
  AssessmentActions,
  AssessmentStackParamList
} from '../flows/assessment/types';

// Assessment Constants
export {
  ASSESSMENT_RESPONSE_LABELS,
  CRISIS_THRESHOLDS
} from '../flows/assessment/types';

// Assessment Questions
export {
  PHQ9_QUESTIONS,
  GAD7_QUESTIONS,
  ASSESSMENT_INSTRUCTIONS,
  SEVERITY_INTERPRETATIONS
} from '../flows/assessment/types/questions';

// =============================================================================
// TYPE SAFETY VALIDATION UTILITIES
// =============================================================================

/**
 * Type Safety Validators
 * Compile-time and runtime validation utilities
 */

/**
 * Crisis Workflow Type Validation
 * Ensures type safety across all crisis detection and intervention workflows
 */
export interface CrisisWorkflowTypeValidation {
  /** Validate crisis detection types */
  validateCrisisDetection: (detection: any) => detection is CrisisDetection;
  
  /** Validate crisis intervention types */
  validateCrisisIntervention: (intervention: any) => intervention is CrisisIntervention;
  
  /** Validate crisis button props */
  validateCrisisButtonProps: (props: any) => props is CrisisButtonProps;
  
  /** Validate crisis store state */
  validateCrisisStoreState: (state: any) => state is CrisisStoreState;
  
  /** Validate performance constraints for crisis operations */
  validateCrisisPerformance: (
    operation: string, 
    timeMs: number
  ) => Promise<boolean>;
}

/**
 * Compliance Type Validation
 * Ensures HIPAA compliance across all data handling operations
 */
export interface ComplianceTypeValidation {
  /** Validate HIPAA consent types */
  validateHIPAAConsent: (consent: any) => consent is HIPAAConsent;
  
  /** Validate PHI classification */
  validatePHIClassification: (data: any, classification: PHIClassification) => boolean;
  
  /** Validate consent management props */
  validateConsentProps: (props: any) => props is ConsentManagementProps;
  
  /** Validate compliance store state */
  validateComplianceState: (state: any) => state is ComplianceStoreState;
  
  /** Validate audit log entries */
  validateAuditLog: (log: any) => log is HIPAAAuditLog;
}

/**
 * Security Type Validation
 * Ensures security requirements across all authentication and encryption
 */
export interface SecurityTypeValidation {
  /** Validate authentication session */
  validateAuthSession: (session: any) => session is AuthenticationSession;
  
  /** Validate encryption key */
  validateEncryptionKey: (key: any) => key is EncryptionKey;
  
  /** Validate security event */
  validateSecurityEvent: (event: any) => event is SecurityEvent;
  
  /** Validate security auth props */
  validateSecurityProps: (props: any) => props is SecurityAuthProps;
  
  /** Validate security store state */
  validateSecurityState: (state: any) => state is SecurityStoreState;
}

/**
 * Performance Type Validation
 * Ensures performance constraints are met across all operations
 */
export interface PerformanceTypeValidation {
  /** Validate performance constraint */
  validatePerformanceConstraint: (constraint: any) => constraint is PerformanceConstraint;
  
  /** Validate performance metric */
  validatePerformanceMetric: (metric: any) => metric is PerformanceMetric;
  
  /** Validate timing category compliance */
  validateTimingCompliance: (
    category: PerformanceTimingCategory,
    actualTimeMs: number
  ) => Promise<boolean>;
  
  /** Validate memory constraints */
  validateMemoryConstraints: (usageMB: number) => Promise<boolean>;
}

/**
 * Error Type Validation
 * Ensures proper error handling and recovery across all workflows
 */
export interface ErrorTypeValidation {
  /** Validate enhanced error */
  validateEnhancedError: (error: any) => error is EnhancedError;
  
  /** Validate error recovery strategy */
  validateRecoveryStrategy: (strategy: any) => strategy is ErrorRecoveryStrategy;
  
  /** Validate error context */
  validateErrorContext: (context: any) => context is ErrorContext;
  
  /** Validate crisis-safe error handling */
  validateCrisisSafeHandling: (error: EnhancedError) => Promise<boolean>;
}

/**
 * Integration Type Validation
 * Ensures proper component and store integration
 */
export interface IntegrationTypeValidation {
  /** Validate base component props */
  validateBaseProps: (props: any) => props is BaseComponentProps;
  
  /** Validate component theme */
  validateComponentTheme: (theme: any) => theme is ComponentTheme;
  
  /** Validate store configuration */
  validateStoreConfig: (config: any) => config is StoreConfig<any, any>;
  
  /** Validate store actions */
  validateStoreActions: (actions: any) => actions is StoreActions<any>;
}

/**
 * Master Type Validation Interface
 * Comprehensive validation across all type categories
 */
export interface MasterTypeValidation extends 
  CrisisWorkflowTypeValidation,
  ComplianceTypeValidation, 
  SecurityTypeValidation,
  PerformanceTypeValidation,
  ErrorTypeValidation,
  IntegrationTypeValidation {
  
  /** Validate complete crisis workflow */
  validateCompleteWorkflow: (
    assessment: PHQ9Result | GAD7Result,
    userId: string
  ) => Promise<WorkflowValidationResult>;
  
  /** Validate type safety across all systems */
  validateSystemTypeSafety: () => Promise<SystemValidationResult>;
  
  /** Generate type coverage report */
  generateTypeCoverageReport: () => TypeCoverageReport;
}

/**
 * Workflow Validation Result
 */
export interface WorkflowValidationResult {
  /** Validation passed */
  valid: boolean;
  
  /** Crisis detection validation */
  crisisDetection: {
    valid: boolean;
    responseTimeMs: number;
    constraintsMet: boolean;
  };
  
  /** Compliance validation */
  compliance: {
    valid: boolean;
    consentValid: boolean;
    auditCompliant: boolean;
    phiProtected: boolean;
  };
  
  /** Security validation */
  security: {
    valid: boolean;
    authenticated: boolean;
    encrypted: boolean;
    threatLevel: string;
  };
  
  /** Performance validation */
  performance: {
    valid: boolean;
    constraintsMet: boolean;
    responseTimeMs: number;
    memoryUsageMB: number;
  };
  
  /** Error handling validation */
  errorHandling: {
    valid: boolean;
    recoveryStrategiesAvailable: boolean;
    crisisSafetyMaintained: boolean;
  };
  
  /** Violations found */
  violations: string[];
  
  /** Recommendations */
  recommendations: string[];
}

/**
 * System Validation Result
 */
export interface SystemValidationResult {
  /** Overall system type safety */
  overallValid: boolean;
  
  /** Type coverage percentage */
  typeCoverage: number;
  
  /** Strict mode compliance */
  strictModeCompliant: boolean;
  
  /** Performance constraint compliance */
  performanceCompliant: boolean;
  
  /** Security requirement compliance */
  securityCompliant: boolean;
  
  /** HIPAA compliance */
  hipaaCompliant: boolean;
  
  /** Crisis safety compliance */
  crisisSafetyCompliant: boolean;
  
  /** System-wide violations */
  systemViolations: Array<{
    type: string;
    severity: ErrorSeverity;
    description: string;
    remediation: string;
  }>;
  
  /** Type safety score (0-100) */
  typeSafetyScore: number;
}

/**
 * Type Coverage Report
 */
export interface TypeCoverageReport {
  /** Report timestamp */
  timestamp: number;
  
  /** Total types defined */
  totalTypes: number;
  
  /** Types with strict typing */
  strictTypedCount: number;
  
  /** Coverage by category */
  coverageByCategory: {
    crisis: number;
    compliance: number;
    security: number;
    performance: number;
    errors: number;
    integration: number;
  };
  
  /** Missing type definitions */
  missingTypes: string[];
  
  /** Type complexity analysis */
  complexityAnalysis: {
    simpleTypes: number;
    complexTypes: number;
    utilityTypes: number;
    genericTypes: number;
  };
  
  /** Recommendations for improvement */
  recommendations: string[];
}

/**
 * Type Safety Constants
 */
export const TYPE_SAFETY_CONFIG = {
  /** Strict mode enforcement */
  STRICT_MODE_REQUIRED: true,
  
  /** Performance validation thresholds */
  PERFORMANCE_THRESHOLDS: {
    MAX_TYPE_CHECK_TIME_MS: 100,
    MAX_COMPILATION_TIME_MS: 30000,
    MAX_TYPE_MEMORY_MB: 200
  },
  
  /** Type coverage requirements */
  COVERAGE_REQUIREMENTS: {
    MIN_OVERALL_COVERAGE: 95,
    MIN_CRISIS_COVERAGE: 100,
    MIN_COMPLIANCE_COVERAGE: 100,
    MIN_SECURITY_COVERAGE: 100
  },
  
  /** Validation intervals */
  VALIDATION_INTERVALS: {
    CONTINUOUS_VALIDATION_MS: 5000,
    COMPREHENSIVE_CHECK_MS: 300000,
    COVERAGE_REPORT_MS: 3600000
  }
} as const;

/**
 * Default Export - Main Type Safety Interface
 */
export default {
  // Type validators
  validators: {} as MasterTypeValidation,
  
  // Configuration
  config: TYPE_SAFETY_CONFIG,
  
  // Utility functions
  utils: {
    isCrisisWorkflow: (workflow: any): boolean => {
      return workflow && typeof workflow === 'object' && 
             'crisisDetection' in workflow;
    },
    
    isTypeSafe: (obj: any, validator: (obj: any) => boolean): boolean => {
      try {
        return validator(obj);
      } catch (error) {
        return false;
      }
    },
    
    validatePerformanceConstraint: (
      operation: string, 
      timeMs: number, 
      constraint: PerformanceConstraint
    ): boolean => {
      return timeMs <= constraint.maxTimeMs;
    }
  }
} as const;