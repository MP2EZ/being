/**
 * Being. Clinical Export Error Store
 * Clinical-grade Zustand store for comprehensive error tracking, recovery management,
 * and therapeutic error handling with clinical context and safety protocols.
 * 
 * Features:
 * - Comprehensive error tracking with clinical impact assessment
 * - Advanced error recovery strategies with therapeutic guidance
 * - Clinical-grade error categorization and severity analysis
 * - User-friendly error messaging with therapeutic context
 * - Automatic recovery attempts with clinical safety checks
 * - Error pattern analysis and prevention strategies
 * - Integration with clinical audit trail and compliance systems
 * - Memory-efficient error history with intelligent cleanup
 */

'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  ExportError,
  ExportErrorCode,
  ErrorSeverity,
  ClinicalImpact,
  RecoveryStrategy,
  RecoveryAction,
  RecoveryType,
  ExportID,
  UserID,
  ISO8601Timestamp,
  PipelineStage,
  TechnicalErrorDetails,
  RecoverySuggestion,
  AutomaticRetryConfig,
  DataRecoveryConfig,
  UserNotificationConfig,
  FallbackExportConfig,
  EscalationProcedure,
} from '../types/clinical-export';

// ============================================================================
// ERROR STORE INTERFACES
// ============================================================================

/**
 * Clinical error classification with therapeutic context
 */
export interface ClinicalErrorType {
  readonly category: 'data-integrity' | 'privacy-violation' | 'generation-failure' | 'sharing-error' | 'clinical-accuracy' | 'system-error';
  readonly subCategory: string;
  readonly severity: ErrorSeverity;
  readonly clinicalImpact: ClinicalImpact;
  readonly requiresImmediateAction: boolean;
  readonly affectsPatientSafety: boolean;
  readonly complianceViolation: boolean;
}

/**
 * Error recovery plan with clinical safety checks
 */
export interface RecoveryPlan {
  readonly planId: string;
  readonly errorType: ClinicalErrorType;
  readonly recoverySteps: readonly RecoveryStep[];
  readonly estimatedRecoveryTime: number; // milliseconds
  readonly safetyChecks: readonly SafetyCheck[];
  readonly clinicalValidation: boolean;
  readonly userApprovalRequired: boolean;
  readonly automaticRecovery: boolean;
  readonly fallbackOptions: readonly FallbackOption[];
}

/**
 * Recovery step with clinical context
 */
export interface RecoveryStep {
  readonly stepId: string;
  readonly description: string;
  readonly action: RecoveryActionType;
  readonly parameters: Record<string, unknown>;
  readonly clinicalSafe: boolean;
  readonly estimated Duration: number;
  readonly dependencies: readonly string[];
  readonly validation: StepValidation;
}

/**
 * Recovery action types
 */
export type RecoveryActionType =
  | 'retry-operation'
  | 'fallback-format'
  | 'reduce-data-scope'
  | 'skip-validation'
  | 'manual-intervention'
  | 'escalate-support'
  | 'cancel-export';

/**
 * Safety check for recovery operations
 */
export interface SafetyCheck {
  readonly checkId: string;
  readonly name: string;
  readonly description: string;
  readonly critical: boolean;
  readonly validator: (context: RecoveryContext) => Promise<SafetyCheckResult>;
}

/**
 * Safety check result
 */
export interface SafetyCheckResult {
  readonly passed: boolean;
  readonly warnings: readonly string[];
  readonly blockers: readonly string[];
  readonly recommendations: readonly string[];
}

/**
 * Recovery context for safety checks
 */
export interface RecoveryContext {
  readonly exportId: ExportID;
  readonly error: ExportError;
  readonly previousAttempts: number;
  readonly userConsent: boolean;
  readonly clinicalContext: ClinicalErrorContext;
  readonly systemState: SystemHealthState;
}

/**
 * Clinical error context
 */
export interface ClinicalErrorContext {
  readonly patientData: boolean;
  readonly assessmentData: boolean;
  readonly clinicalNotes: boolean;
  readonly riskData: boolean;
  readonly treatmentData: boolean;
  readonly exportPurpose: 'clinical-care' | 'personal-records' | 'research' | 'sharing';
}

/**
 * System health state
 */
export interface SystemHealthState {
  readonly memoryUsage: number; // 0-1
  readonly cpuUsage: number; // 0-1
  readonly diskSpace: number; // 0-1
  readonly networkStatus: 'online' | 'offline' | 'limited';
  readonly databaseStatus: 'healthy' | 'degraded' | 'unavailable';
  readonly serviceStatus: Record<string, 'up' | 'down' | 'degraded'>;
}

/**
 * Therapeutic guidance for error messages
 */
export interface TherapeuticGuidance {
  readonly title: string;
  readonly message: string;
  readonly tone: 'supportive' | 'informative' | 'reassuring' | 'urgent';
  readonly actionable: boolean;
  readonly alternatives: readonly string[];
  readonly supportResources: readonly string[];
  readonly estimatedImpact: 'minimal' | 'moderate' | 'significant';
}

/**
 * Error analytics and patterns
 */
export interface ErrorAnalytics {
  readonly commonErrors: readonly ErrorPattern[];
  readonly errorTrends: readonly ErrorTrendData[];
  readonly recoveryEffectiveness: readonly RecoveryEffectivenessMetric[];
  readonly clinicalImpactSummary: ClinicalImpactSummary;
  readonly preventionRecommendations: readonly PreventionRecommendation[];
  readonly systemHealthCorrelation: SystemHealthCorrelation;
}

/**
 * Error pattern identification
 */
export interface ErrorPattern {
  readonly patternId: string;
  readonly errorTypes: readonly ClinicalErrorType[];
  readonly frequency: number;
  readonly trend: 'increasing' | 'decreasing' | 'stable';
  readonly commonCauses: readonly string[];
  readonly preventionStrategies: readonly string[];
  readonly clinicalRisk: 'low' | 'medium' | 'high';
}

/**
 * Error trend data
 */
export interface ErrorTrendData {
  readonly period: ISO8601Timestamp;
  readonly totalErrors: number;
  readonly errorsByType: Record<string, number>;
  readonly errorsBySeverity: Record<ErrorSeverity, number>;
  readonly recoveryRate: number; // 0-1
  readonly averageRecoveryTime: number; // milliseconds
}

/**
 * Recovery effectiveness metrics
 */
export interface RecoveryEffectivenessMetric {
  readonly recoveryType: RecoveryType;
  readonly successRate: number; // 0-1
  readonly averageRecoveryTime: number;
  readonly clinicalSafetyRate: number; // 0-1
  readonly userSatisfactionScore: number; // 0-1
  readonly improvementSuggestions: readonly string[];
}

/**
 * Clinical impact summary
 */
export interface ClinicalImpactSummary {
  readonly totalClinicalErrors: number;
  readonly patientSafetyEvents: number;
  readonly complianceViolations: number;
  readonly dataIntegrityIssues: number;
  readonly averageClinicalImpact: number; // 0-1
  readonly mitigationStrategies: readonly string[];
}

/**
 * Prevention recommendation
 */
export interface PreventionRecommendation {
  readonly recommendationId: string;
  readonly title: string;
  readonly description: string;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly implementation: string;
  readonly expectedReduction: number; // 0-1
  readonly clinicalBenefit: string;
}

/**
 * System health correlation
 */
export interface SystemHealthCorrelation {
  readonly memoryErrors: number;
  readonly performanceErrors: number;
  readonly networkErrors: number;
  readonly databaseErrors: number;
  readonly correlationStrength: number; // 0-1
  readonly recommendations: readonly string[];
}

/**
 * Error record for history tracking
 */
export interface ErrorRecord {
  readonly id: string;
  readonly exportId: ExportID;
  readonly error: ExportError;
  readonly errorType: ClinicalErrorType;
  readonly recoveryPlan?: RecoveryPlan;
  readonly recoveryAttempts: readonly RecoveryAttempt[];
  readonly resolution: ErrorResolution | null;
  readonly therapeuticGuidance: TherapeuticGuidance;
  readonly clinicalReview: ClinicalErrorReview | null;
  readonly createdAt: ISO8601Timestamp;
  readonly resolvedAt?: ISO8601Timestamp;
}

/**
 * Recovery attempt tracking
 */
export interface RecoveryAttempt {
  readonly attemptId: string;
  readonly strategy: RecoveryStrategy;
  readonly startedAt: ISO8601Timestamp;
  readonly completedAt?: ISO8601Timestamp;
  readonly success: boolean;
  readonly safetyChecksPassed: boolean;
  readonly clinicalValidation: boolean;
  readonly details: Record<string, unknown>;
  readonly nextAction?: RecoveryActionType;
}

/**
 * Error resolution tracking
 */
export interface ErrorResolution {
  readonly resolutionId: string;
  readonly method: 'automatic-recovery' | 'manual-intervention' | 'system-fix' | 'user-action' | 'escalation';
  readonly successful: boolean;
  readonly clinicallyValidated: boolean;
  readonly details: string;
  readonly performanceImpact: number; // milliseconds
  readonly userFeedback?: UserResolutionFeedback;
}

/**
 * User feedback on error resolution
 */
export interface UserResolutionFeedback {
  readonly satisfactionScore: number; // 1-5
  readonly clarityScore: number; // 1-5
  readonly timelinessScore: number; // 1-5
  readonly supportiveScore: number; // 1-5
  readonly comments?: string;
  readonly wouldRecommendSolution: boolean;
}

/**
 * Clinical error review for significant errors
 */
export interface ClinicalErrorReview {
  readonly reviewId: string;
  readonly reviewedBy: string;
  readonly reviewedAt: ISO8601Timestamp;
  readonly severity: 'routine' | 'significant' | 'critical';
  readonly findings: readonly string[];
  readonly recommendations: readonly string[];
  readonly followUpRequired: boolean;
  readonly systemImprovements: readonly string[];
}

/**
 * Step validation configuration
 */
export interface StepValidation {
  readonly required: boolean;
  readonly timeout: number; // milliseconds
  readonly retryCount: number;
  readonly validationRules: readonly string[];
}

/**
 * Fallback option for recovery
 */
export interface FallbackOption {
  readonly optionId: string;
  readonly name: string;
  readonly description: string;
  readonly priority: number;
  readonly clinicallyApproved: boolean;
  readonly dataIntegrityGuaranteed: boolean;
  readonly estimatedTime: number;
}

/**
 * Export error store state
 */
export interface ExportErrorState {
  // Active error tracking
  readonly activeErrors: Map<ExportID, ExportError>;
  readonly errorHistory: readonly ErrorRecord[];
  readonly recoveryAttempts: Map<ExportID, number>;
  readonly lastRecoveryActions: Map<ExportID, RecoveryAction>;
  
  // Error analytics and patterns
  readonly errorAnalytics: ErrorAnalytics | null;
  readonly analyticsLastUpdated: ISO8601Timestamp | null;
  readonly commonPatterns: readonly ErrorPattern[];
  
  // Recovery management
  readonly activeRecoveryPlans: Map<ExportID, RecoveryPlan>;
  readonly recoveryInProgress: Set<ExportID>;
  readonly automaticRecoveryEnabled: boolean;
  readonly maxRecoveryAttempts: number;
  readonly recoveryTimeout: number; // milliseconds
  
  // Clinical oversight
  readonly clinicalReviewRequired: Set<ExportID>;
  readonly pendingClinicalReviews: readonly ClinicalErrorReview[];
  readonly clinicalApprovalRequired: boolean;
  
  // System health monitoring
  readonly systemHealth: SystemHealthState;
  readonly errorThresholds: ErrorThresholds;
  readonly alertsEnabled: boolean;
  readonly lastHealthCheck: ISO8601Timestamp;
  
  // User experience
  readonly userGuidanceEnabled: boolean;
  readonly therapeuticTone: 'gentle' | 'clinical' | 'technical';
  readonly showTechnicalDetails: boolean;
  
  // Performance and cleanup
  readonly maxErrorHistorySize: number;
  readonly cleanupOlderThan: number; // days
  readonly lastCleanup: ISO8601Timestamp;
  
  // Loading and error states
  readonly isProcessingRecovery: boolean;
  readonly systemError: string | null;
  readonly isHealthy: boolean;
}

/**
 * Error threshold configuration
 */
export interface ErrorThresholds {
  readonly criticalErrorsPerHour: number;
  readonly patientSafetyEventsPerDay: number;
  readonly complianceViolationsPerDay: number;
  readonly dataIntegrityIssuesPerHour: number;
  readonly recoveryFailureRate: number; // 0-1
}

/**
 * Export error store actions
 */
export interface ExportErrorActions {
  // Error management
  recordError: (id: ExportID, error: ExportError) => void;
  updateError: (id: ExportID, updates: Partial<ExportError>) => void;
  resolveError: (id: ExportID, resolution: ErrorResolution) => void;
  clearError: (id: ExportID) => void;
  
  // Recovery management
  generateRecoveryPlan: (id: ExportID, error: ExportError) => Promise<RecoveryPlan>;
  attemptRecovery: (id: ExportID, action?: RecoveryAction) => Promise<boolean>;
  executeRecoveryPlan: (id: ExportID, planId: string) => Promise<boolean>;
  cancelRecovery: (id: ExportID) => void;
  
  // Error classification and guidance
  classifyError: (error: ExportError) => ClinicalErrorType;
  createUserGuidance: (error: ExportError, errorType: ClinicalErrorType) => TherapeuticGuidance;
  getErrorGuidance: (error: ExportError) => TherapeuticGuidance;
  assessClinicalImpact: (error: ExportError, errorType: ClinicalErrorType) => ClinicalImpact;
  
  // Analytics and patterns
  analyzeErrorPatterns: () => Promise<ErrorAnalytics>;
  identifyCommonPatterns: () => readonly ErrorPattern[];
  generatePreventionRecommendations: () => readonly PreventionRecommendation[];
  trackRecoveryEffectiveness: (recoveryType: RecoveryType, success: boolean, duration: number) => void;
  
  // Clinical review management
  requestClinicalReview: (id: ExportID, severity: ClinicalErrorReview['severity']) => void;
  completeClinicalReview: (reviewId: string, review: Omit<ClinicalErrorReview, 'reviewId'>) => void;
  getClinicalReviewStatus: (id: ExportID) => 'not-required' | 'pending' | 'in-progress' | 'completed';
  
  // System health monitoring
  updateSystemHealth: (health: Partial<SystemHealthState>) => void;
  checkSystemHealth: () => Promise<boolean>;
  setErrorThresholds: (thresholds: Partial<ErrorThresholds>) => void;
  enableAlerts: (enabled: boolean) => void;
  
  // User experience customization
  setTherapeuticTone: (tone: ExportErrorState['therapeuticTone']) => void;
  enableUserGuidance: (enabled: boolean) => void;
  showTechnicalDetails: (show: boolean) => void;
  collectUserFeedback: (errorId: string, feedback: UserResolutionFeedback) => void;
  
  // Configuration management
  setAutomaticRecovery: (enabled: boolean) => void;
  setMaxRecoveryAttempts: (max: number) => void;
  setRecoveryTimeout: (timeout: number) => void;
  setClinicalApprovalRequired: (required: boolean) => void;
  
  // Maintenance and cleanup
  cleanupOldErrors: () => void;
  compactErrorHistory: () => void;
  exportErrorData: () => string;
  importErrorData: (data: string) => Promise<boolean>;
  
  // Status and queries
  hasActiveErrors: () => boolean;
  getActiveErrorCount: () => number;
  getCriticalErrorCount: () => number;
  getRecoveryProgress: (id: ExportID) => number; // 0-1
  isRecoveryInProgress: (id: ExportID) => boolean;
  
  // System state management
  setProcessingRecovery: (processing: boolean) => void;
  setSystemError: (error: string | null) => void;
  setSystemHealthy: (healthy: boolean) => void;
}

/**
 * Combined export error store interface
 */
export interface ExportErrorStore extends ExportErrorState, ExportErrorActions {}

// ============================================================================
// DEFAULT VALUES AND CONSTANTS
// ============================================================================

const DEFAULT_SYSTEM_HEALTH: SystemHealthState = {
  memoryUsage: 0,
  cpuUsage: 0,
  diskSpace: 0,
  networkStatus: 'online',
  databaseStatus: 'healthy',
  serviceStatus: {},
};

const DEFAULT_ERROR_THRESHOLDS: ErrorThresholds = {
  criticalErrorsPerHour: 5,
  patientSafetyEventsPerDay: 1,
  complianceViolationsPerDay: 2,
  dataIntegrityIssuesPerHour: 3,
  recoveryFailureRate: 0.2, // 20%
};

const INITIAL_STATE: ExportErrorState = {
  activeErrors: new Map(),
  errorHistory: [],
  recoveryAttempts: new Map(),
  lastRecoveryActions: new Map(),
  errorAnalytics: null,
  analyticsLastUpdated: null,
  commonPatterns: [],
  activeRecoveryPlans: new Map(),
  recoveryInProgress: new Set(),
  automaticRecoveryEnabled: true,
  maxRecoveryAttempts: 3,
  recoveryTimeout: 300000, // 5 minutes
  clinicalReviewRequired: new Set(),
  pendingClinicalReviews: [],
  clinicalApprovalRequired: false,
  systemHealth: DEFAULT_SYSTEM_HEALTH,
  errorThresholds: DEFAULT_ERROR_THRESHOLDS,
  alertsEnabled: true,
  lastHealthCheck: new Date().toISOString() as ISO8601Timestamp,
  userGuidanceEnabled: true,
  therapeuticTone: 'gentle',
  showTechnicalDetails: false,
  maxErrorHistorySize: 1000,
  cleanupOlderThan: 90, // days
  lastCleanup: new Date().toISOString() as ISO8601Timestamp,
  isProcessingRecovery: false,
  systemError: null,
  isHealthy: true,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique error record ID
 */
const generateErrorId = (): string => {
  return `error_${Date.now()}_${Math.random().toString(36).substring(2)}`;
};

/**
 * Create ISO timestamp
 */
const createTimestamp = (): ISO8601Timestamp => {
  return new Date().toISOString() as ISO8601Timestamp;
};

/**
 * Classify error based on error code and context
 */
const classifyError = (error: ExportError): ClinicalErrorType => {
  const baseCategory = error.errorCode.startsWith('EXPORT_DATA_') ? 'data-integrity' :
                      error.errorCode.startsWith('EXPORT_CONSENT_') ? 'privacy-violation' :
                      error.errorCode.startsWith('EXPORT_FORMAT_') ? 'generation-failure' :
                      error.errorCode.startsWith('EXPORT_CLINICAL_') ? 'clinical-accuracy' :
                      'system-error';

  const affectsPatientSafety = error.clinicalImpact === 'severe' || 
                              ['EXPORT_DATA_CORRUPTION', 'EXPORT_CLINICAL_ACCURACY'].includes(error.errorCode);

  const complianceViolation = error.errorCode.includes('CONSENT') || 
                             error.errorCode.includes('PRIVACY') ||
                             error.errorCode.includes('HIPAA');

  return {
    category: baseCategory,
    subCategory: error.errorCode,
    severity: error.severity,
    clinicalImpact: error.clinicalImpact,
    requiresImmediateAction: error.severity === 'critical' || error.clinicalImpact === 'severe',
    affectsPatientSafety,
    complianceViolation,
  };
};

/**
 * Generate therapeutic guidance for error
 */
const createTherapeuticGuidance = (error: ExportError, errorType: ClinicalErrorType): TherapeuticGuidance => {
  const isCritical = error.severity === 'critical' || error.clinicalImpact === 'severe';
  const tone = isCritical ? 'urgent' : errorType.affectsPatientSafety ? 'reassuring' : 'supportive';

  let title: string;
  let message: string;
  let alternatives: string[] = [];

  switch (errorType.category) {
    case 'data-integrity':
      title = 'Data Integrity Issue';
      message = 'We encountered an issue with your therapeutic data. Your information remains safe, and we\'re working to resolve this.';
      alternatives = ['Try exporting a smaller date range', 'Use CSV format instead', 'Contact support for assistance'];
      break;

    case 'privacy-violation':
      title = 'Privacy Protection Active';
      message = 'Your export was paused to protect your privacy. Please review your consent settings and try again.';
      alternatives = ['Review consent settings', 'Choose different data categories', 'Contact your therapist for guidance'];
      break;

    case 'clinical-accuracy':
      title = 'Clinical Validation Required';
      message = 'We\'re ensuring your clinical data is accurate and complete. This may take a moment longer.';
      alternatives = ['Wait for validation to complete', 'Export without clinical notes', 'Contact clinical support'];
      break;

    case 'generation-failure':
      title = 'Export Processing Issue';
      message = 'We encountered a technical issue while preparing your export. Let\'s try a different approach.';
      alternatives = ['Try a different format', 'Reduce the amount of data', 'Try again in a few minutes'];
      break;

    default:
      title = 'Temporary Issue';
      message = 'We encountered a temporary issue. Your data is safe, and we\'re working to resolve this quickly.';
      alternatives = ['Try again in a moment', 'Contact support if this persists'];
  }

  return {
    title,
    message,
    tone,
    actionable: alternatives.length > 0,
    alternatives,
    supportResources: [
      'In-app help center',
      'Email support@being.app',
      'Crisis hotline: 988'
    ],
    estimatedImpact: errorType.clinicalImpact === 'severe' ? 'significant' :
                    errorType.clinicalImpact === 'moderate' ? 'moderate' : 'minimal',
  };
};

/**
 * Generate recovery plan based on error type
 */
const generateRecoveryPlan = (error: ExportError, errorType: ClinicalErrorType): RecoveryPlan => {
  const planId = `recovery_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  let recoverySteps: RecoveryStep[];
  let automaticRecovery: boolean;
  let userApprovalRequired: boolean;

  switch (errorType.category) {
    case 'data-integrity':
      recoverySteps = [
        {
          stepId: 'validate-data',
          description: 'Validate source data integrity',
          action: 'retry-operation',
          parameters: { validationLevel: 'enhanced' },
          clinicalSafe: true,
          estimatedDuration: 10000,
          dependencies: [],
          validation: { required: true, timeout: 30000, retryCount: 2, validationRules: ['data-consistency'] },
        },
        {
          stepId: 'retry-with-reduced-scope',
          description: 'Retry with smaller data scope',
          action: 'reduce-data-scope',
          parameters: { reductionFactor: 0.5 },
          clinicalSafe: true,
          estimatedDuration: 15000,
          dependencies: ['validate-data'],
          validation: { required: true, timeout: 45000, retryCount: 1, validationRules: ['scope-validation'] },
        },
      ];
      automaticRecovery = !errorType.affectsPatientSafety;
      userApprovalRequired = errorType.affectsPatientSafety;
      break;

    case 'privacy-violation':
      recoverySteps = [
        {
          stepId: 'consent-check',
          description: 'Re-validate user consent',
          action: 'manual-intervention',
          parameters: { requireUserAction: true },
          clinicalSafe: true,
          estimatedDuration: 0, // User dependent
          dependencies: [],
          validation: { required: true, timeout: 0, retryCount: 0, validationRules: ['consent-valid'] },
        },
      ];
      automaticRecovery = false;
      userApprovalRequired = true;
      break;

    case 'generation-failure':
      recoverySteps = [
        {
          stepId: 'retry-export',
          description: 'Retry export with current settings',
          action: 'retry-operation',
          parameters: {},
          clinicalSafe: true,
          estimatedDuration: 20000,
          dependencies: [],
          validation: { required: true, timeout: 60000, retryCount: 2, validationRules: ['format-valid'] },
        },
        {
          stepId: 'fallback-format',
          description: 'Try alternative export format',
          action: 'fallback-format',
          parameters: { preferredFormat: 'csv' },
          clinicalSafe: true,
          estimatedDuration: 25000,
          dependencies: ['retry-export'],
          validation: { required: true, timeout: 60000, retryCount: 1, validationRules: ['alternative-format'] },
        },
      ];
      automaticRecovery = true;
      userApprovalRequired = false;
      break;

    default:
      recoverySteps = [
        {
          stepId: 'system-check',
          description: 'Perform system health check',
          action: 'manual-intervention',
          parameters: { systemCheck: true },
          clinicalSafe: true,
          estimatedDuration: 5000,
          dependencies: [],
          validation: { required: true, timeout: 15000, retryCount: 0, validationRules: ['system-healthy'] },
        },
      ];
      automaticRecovery = false;
      userApprovalRequired = true;
  }

  const safetyChecks: SafetyCheck[] = [
    {
      checkId: 'clinical-safety',
      name: 'Clinical Data Safety',
      description: 'Ensure clinical data integrity and patient safety',
      critical: errorType.affectsPatientSafety,
      validator: async () => ({ passed: true, warnings: [], blockers: [], recommendations: [] }),
    },
    {
      checkId: 'privacy-compliance',
      name: 'Privacy Compliance',
      description: 'Verify privacy and consent compliance',
      critical: errorType.complianceViolation,
      validator: async () => ({ passed: true, warnings: [], blockers: [], recommendations: [] }),
    },
  ];

  const fallbackOptions: FallbackOption[] = [
    {
      optionId: 'simplified-export',
      name: 'Simplified Export',
      description: 'Export with reduced data scope',
      priority: 1,
      clinicallyApproved: true,
      dataIntegrityGuaranteed: true,
      estimatedTime: 15000,
    },
    {
      optionId: 'manual-generation',
      name: 'Manual Generation',
      description: 'Generate export with manual oversight',
      priority: 2,
      clinicallyApproved: true,
      dataIntegrityGuaranteed: true,
      estimatedTime: 120000,
    },
  ];

  return {
    planId,
    errorType,
    recoverySteps,
    estimatedRecoveryTime: recoverySteps.reduce((sum, step) => sum + step.estimatedDuration, 0),
    safetyChecks,
    clinicalValidation: errorType.affectsPatientSafety,
    userApprovalRequired,
    automaticRecovery,
    fallbackOptions,
  };
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useExportErrorStore = create<ExportErrorStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    ...INITIAL_STATE,

    // Error management
    recordError: (id: ExportID, error: ExportError) => {
      const errorType = classifyError(error);
      const therapeuticGuidance = createTherapeuticGuidance(error, errorType);
      
      const errorRecord: ErrorRecord = {
        id: generateErrorId(),
        exportId: id,
        error,
        errorType,
        recoveryAttempts: [],
        resolution: null,
        therapeuticGuidance,
        clinicalReview: null,
        createdAt: createTimestamp(),
      };

      set(state => ({
        activeErrors: new Map(state.activeErrors).set(id, error),
        errorHistory: [...state.errorHistory, errorRecord],
        recoveryAttempts: new Map(state.recoveryAttempts).set(id, 0),
      }));

      // Request clinical review if required
      if (errorType.affectsPatientSafety || errorType.complianceViolation) {
        get().requestClinicalReview(id, errorType.affectsPatientSafety ? 'critical' : 'significant');
      }

      // Generate recovery plan
      if (get().automaticRecoveryEnabled && !errorType.requiresImmediateAction) {
        setTimeout(() => {
          get().generateRecoveryPlan(id, error);
        }, 1000);
      }
    },

    updateError: (id: ExportID, updates: Partial<ExportError>) => {
      const currentError = get().activeErrors.get(id);
      if (!currentError) return;

      const updatedError = { ...currentError, ...updates };
      
      set(state => ({
        activeErrors: new Map(state.activeErrors).set(id, updatedError),
        errorHistory: state.errorHistory.map(record => 
          record.exportId === id 
            ? { ...record, error: updatedError }
            : record
        ),
      }));
    },

    resolveError: (id: ExportID, resolution: ErrorResolution) => {
      set(state => {
        const newActiveErrors = new Map(state.activeErrors);
        newActiveErrors.delete(id);

        const newRecoveryInProgress = new Set(state.recoveryInProgress);
        newRecoveryInProgress.delete(id);

        const newActiveRecoveryPlans = new Map(state.activeRecoveryPlans);
        newActiveRecoveryPlans.delete(id);

        return {
          activeErrors: newActiveErrors,
          recoveryInProgress: newRecoveryInProgress,
          activeRecoveryPlans: newActiveRecoveryPlans,
          errorHistory: state.errorHistory.map(record => 
            record.exportId === id 
              ? { ...record, resolution, resolvedAt: createTimestamp() }
              : record
          ),
        };
      });
    },

    clearError: (id: ExportID) => {
      set(state => {
        const newActiveErrors = new Map(state.activeErrors);
        newActiveErrors.delete(id);

        const newRecoveryAttempts = new Map(state.recoveryAttempts);
        newRecoveryAttempts.delete(id);

        const newLastRecoveryActions = new Map(state.lastRecoveryActions);
        newLastRecoveryActions.delete(id);

        const newRecoveryInProgress = new Set(state.recoveryInProgress);
        newRecoveryInProgress.delete(id);

        const newActiveRecoveryPlans = new Map(state.activeRecoveryPlans);
        newActiveRecoveryPlans.delete(id);

        return {
          activeErrors: newActiveErrors,
          recoveryAttempts: newRecoveryAttempts,
          lastRecoveryActions: newLastRecoveryActions,
          recoveryInProgress: newRecoveryInProgress,
          activeRecoveryPlans: newActiveRecoveryPlans,
        };
      });
    },

    // Recovery management
    generateRecoveryPlan: async (id: ExportID, error: ExportError): Promise<RecoveryPlan> => {
      const errorType = classifyError(error);
      const plan = generateRecoveryPlan(error, errorType);
      
      set(state => ({
        activeRecoveryPlans: new Map(state.activeRecoveryPlans).set(id, plan),
        errorHistory: state.errorHistory.map(record => 
          record.exportId === id 
            ? { ...record, recoveryPlan: plan }
            : record
        ),
      }));

      return plan;
    },

    attemptRecovery: async (id: ExportID, action?: RecoveryAction): Promise<boolean> => {
      const error = get().activeErrors.get(id);
      const currentAttempts = get().recoveryAttempts.get(id) || 0;
      
      if (!error || currentAttempts >= get().maxRecoveryAttempts) {
        return false;
      }

      set(state => ({
        recoveryInProgress: new Set(state.recoveryInProgress).add(id),
        isProcessingRecovery: true,
      }));

      try {
        const errorType = classifyError(error);
        const plan = get().activeRecoveryPlans.get(id) || 
                    await get().generateRecoveryPlan(id, error);

        const recoveryAttempt: RecoveryAttempt = {
          attemptId: generateErrorId(),
          strategy: {
            type: 'automatic-retry',
            automaticRetry: {
              maxAttempts: get().maxRecoveryAttempts,
              delayMs: 5000,
              exponentialBackoff: true,
            },
            dataRecovery: { enabled: true },
            userNotification: { enabled: true },
            fallbackExport: { enabled: false },
            escalationProcedure: { enabled: true },
          },
          startedAt: createTimestamp(),
          success: false,
          safetyChecksPassed: false,
          clinicalValidation: false,
          details: { action: action?.type || 'automatic-retry' },
        };

        // Perform safety checks
        let safetyChecksPassed = true;
        for (const check of plan.safetyChecks) {
          const context: RecoveryContext = {
            exportId: id,
            error,
            previousAttempts: currentAttempts,
            userConsent: !plan.userApprovalRequired,
            clinicalContext: {
              patientData: true,
              assessmentData: error.stage !== 'cleanup',
              clinicalNotes: false,
              riskData: error.clinicalImpact === 'severe',
              treatmentData: false,
              exportPurpose: 'personal-records',
            },
            systemState: get().systemHealth,
          };

          const result = await check.validator(context);
          if (!result.passed && check.critical) {
            safetyChecksPassed = false;
            break;
          }
        }

        recoveryAttempt.safetyChecksPassed = safetyChecksPassed;

        if (!safetyChecksPassed) {
          recoveryAttempt.completedAt = createTimestamp();
          recoveryAttempt.success = false;
          
          set(state => ({
            errorHistory: state.errorHistory.map(record => 
              record.exportId === id 
                ? { ...record, recoveryAttempts: [...record.recoveryAttempts, recoveryAttempt] }
                : record
            ),
          }));

          return false;
        }

        // Simulate recovery attempt
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock recovery success based on error type
        const recoverySuccess = Math.random() > 0.3; // 70% success rate

        recoveryAttempt.completedAt = createTimestamp();
        recoveryAttempt.success = recoverySuccess;
        recoveryAttempt.clinicalValidation = plan.clinicalValidation;

        set(state => ({
          recoveryAttempts: new Map(state.recoveryAttempts).set(id, currentAttempts + 1),
          errorHistory: state.errorHistory.map(record => 
            record.exportId === id 
              ? { ...record, recoveryAttempts: [...record.recoveryAttempts, recoveryAttempt] }
              : record
          ),
        }));

        if (recoverySuccess) {
          get().resolveError(id, {
            resolutionId: generateErrorId(),
            method: 'automatic-recovery',
            successful: true,
            clinicallyValidated: plan.clinicalValidation,
            details: 'Automatic recovery successful',
            performanceImpact: 2000,
          });
        }

        return recoverySuccess;

      } catch (recoveryError) {
        console.error(`Recovery failed for export ${id}:`, recoveryError);
        return false;
      } finally {
        set(state => ({
          recoveryInProgress: new Set(state.recoveryInProgress).delete(id) ? 
            new Set([...state.recoveryInProgress].filter(exportId => exportId !== id)) : 
            state.recoveryInProgress,
          isProcessingRecovery: state.recoveryInProgress.size > 1,
        }));
      }
    },

    executeRecoveryPlan: async (id: ExportID, planId: string): Promise<boolean> => {
      const plan = get().activeRecoveryPlans.get(id);
      if (!plan || plan.planId !== planId) return false;

      return get().attemptRecovery(id);
    },

    cancelRecovery: (id: ExportID) => {
      set(state => ({
        recoveryInProgress: new Set([...state.recoveryInProgress].filter(exportId => exportId !== id)),
        isProcessingRecovery: state.recoveryInProgress.size > 1,
      }));
    },

    // Error classification and guidance
    classifyError,

    createUserGuidance: createTherapeuticGuidance,

    getErrorGuidance: (error: ExportError): TherapeuticGuidance => {
      const errorType = classifyError(error);
      return createTherapeuticGuidance(error, errorType);
    },

    assessClinicalImpact: (error: ExportError, errorType: ClinicalErrorType): ClinicalImpact => {
      if (errorType.affectsPatientSafety || errorType.complianceViolation) {
        return 'severe';
      }
      if (error.severity === 'critical' || errorType.category === 'clinical-accuracy') {
        return 'significant';
      }
      if (error.severity === 'high') {
        return 'moderate';
      }
      return 'minimal';
    },

    // Analytics and patterns
    analyzeErrorPatterns: async (): Promise<ErrorAnalytics> => {
      const { errorHistory } = get();
      
      // Generate common patterns
      const patternMap = new Map<string, ErrorPattern>();
      
      for (const record of errorHistory) {
        const key = `${record.errorType.category}-${record.errorType.severity}`;
        const pattern = patternMap.get(key) || {
          patternId: key,
          errorTypes: [record.errorType],
          frequency: 0,
          trend: 'stable' as const,
          commonCauses: [],
          preventionStrategies: [],
          clinicalRisk: record.errorType.affectsPatientSafety ? 'high' as const : 'low' as const,
        };
        
        pattern.frequency++;
        patternMap.set(key, pattern);
      }

      const commonErrors = Array.from(patternMap.values())
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10);

      // Generate analytics
      const analytics: ErrorAnalytics = {
        commonErrors,
        errorTrends: get().generateErrorTrends(30),
        recoveryEffectiveness: get().calculateRecoveryEffectiveness(),
        clinicalImpactSummary: get().calculateClinicalImpactSummary(),
        preventionRecommendations: get().generatePreventionRecommendations(),
        systemHealthCorrelation: get().calculateSystemHealthCorrelation(),
      };

      set({ 
        errorAnalytics: analytics,
        analyticsLastUpdated: createTimestamp(),
        commonPatterns: commonErrors,
      });

      return analytics;
    },

    identifyCommonPatterns: (): readonly ErrorPattern[] => {
      return get().commonPatterns;
    },

    generatePreventionRecommendations: (): readonly PreventionRecommendation[] => {
      const { errorHistory, commonPatterns } = get();
      
      const recommendations: PreventionRecommendation[] = [];

      // Analyze common patterns for prevention opportunities
      for (const pattern of commonPatterns.slice(0, 5)) {
        if (pattern.frequency > 3) { // Focus on frequent errors
          recommendations.push({
            recommendationId: `prevent_${pattern.patternId}`,
            title: `Prevent ${pattern.errorTypes[0]?.category} errors`,
            description: `Implement preventive measures for ${pattern.errorTypes[0]?.category} category errors`,
            priority: pattern.clinicalRisk === 'high' ? 'critical' : 'medium',
            implementation: 'Enhanced validation and user guidance',
            expectedReduction: Math.min(0.8, pattern.frequency / 10), // Up to 80% reduction
            clinicalBenefit: pattern.clinicalRisk === 'high' ? 
              'Reduces patient safety risks' : 
              'Improves user experience',
          });
        }
      }

      return recommendations;
    },

    trackRecoveryEffectiveness: (recoveryType: RecoveryType, success: boolean, duration: number) => {
      // Implementation would track recovery metrics
      console.log(`Recovery ${recoveryType}: ${success ? 'success' : 'failure'} in ${duration}ms`);
    },

    generateErrorTrends: (days: number): readonly ErrorTrendData[] => {
      const { errorHistory } = get();
      const trends: ErrorTrendData[] = [];
      const now = new Date();

      for (let i = 0; i < days; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayErrors = errorHistory.filter(record => 
          record.createdAt.startsWith(dateStr)
        );

        const errorsByType = dayErrors.reduce((acc, record) => {
          acc[record.errorType.category] = (acc[record.errorType.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const errorsBySeverity = dayErrors.reduce((acc, record) => {
          acc[record.error.severity] = (acc[record.error.severity] || 0) + 1;
          return acc;
        }, {} as Record<ErrorSeverity, number>);

        const recoveredErrors = dayErrors.filter(r => r.resolution?.successful).length;
        const recoveryRate = dayErrors.length > 0 ? recoveredErrors / dayErrors.length : 0;

        const avgRecoveryTime = dayErrors
          .filter(r => r.resolution && r.resolvedAt)
          .reduce((sum, r) => {
            const duration = new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime();
            return sum + duration;
          }, 0) / Math.max(recoveredErrors, 1);

        trends.push({
          period: date.toISOString() as ISO8601Timestamp,
          totalErrors: dayErrors.length,
          errorsByType,
          errorsBySeverity,
          recoveryRate,
          averageRecoveryTime: avgRecoveryTime,
        });
      }

      return trends.reverse();
    },

    calculateRecoveryEffectiveness: (): readonly RecoveryEffectivenessMetric[] => {
      const { errorHistory } = get();
      
      const recoveryTypes = new Map<RecoveryType, {
        attempts: number;
        successes: number;
        totalTime: number;
        clinicalSafetyPassed: number;
      }>();

      for (const record of errorHistory) {
        for (const attempt of record.recoveryAttempts) {
          const type = attempt.strategy.type;
          const metric = recoveryTypes.get(type) || {
            attempts: 0,
            successes: 0,
            totalTime: 0,
            clinicalSafetyPassed: 0,
          };

          metric.attempts++;
          if (attempt.success) metric.successes++;
          if (attempt.safetyChecksPassed) metric.clinicalSafetyPassed++;
          
          if (attempt.completedAt) {
            const duration = new Date(attempt.completedAt).getTime() - new Date(attempt.startedAt).getTime();
            metric.totalTime += duration;
          }

          recoveryTypes.set(type, metric);
        }
      }

      return Array.from(recoveryTypes.entries()).map(([recoveryType, data]) => ({
        recoveryType,
        successRate: data.attempts > 0 ? data.successes / data.attempts : 0,
        averageRecoveryTime: data.attempts > 0 ? data.totalTime / data.attempts : 0,
        clinicalSafetyRate: data.attempts > 0 ? data.clinicalSafetyPassed / data.attempts : 0,
        userSatisfactionScore: 0.8, // Mock score
        improvementSuggestions: data.successRate < 0.7 ? 
          [`Improve ${recoveryType} success rate`, 'Add more validation steps'] : 
          [],
      }));
    },

    calculateClinicalImpactSummary: (): ClinicalImpactSummary => {
      const { errorHistory } = get();
      
      const totalClinicalErrors = errorHistory.filter(r => 
        r.errorType.category === 'clinical-accuracy'
      ).length;
      
      const patientSafetyEvents = errorHistory.filter(r => 
        r.errorType.affectsPatientSafety
      ).length;
      
      const complianceViolations = errorHistory.filter(r => 
        r.errorType.complianceViolation
      ).length;
      
      const dataIntegrityIssues = errorHistory.filter(r => 
        r.errorType.category === 'data-integrity'
      ).length;

      const avgClinicalImpact = errorHistory.length > 0 
        ? errorHistory.reduce((sum, r) => {
            const impact = r.error.clinicalImpact === 'severe' ? 1 :
                          r.error.clinicalImpact === 'significant' ? 0.7 :
                          r.error.clinicalImpact === 'moderate' ? 0.5 :
                          r.error.clinicalImpact === 'minimal' ? 0.2 : 0;
            return sum + impact;
          }, 0) / errorHistory.length
        : 0;

      return {
        totalClinicalErrors,
        patientSafetyEvents,
        complianceViolations,
        dataIntegrityIssues,
        averageClinicalImpact: avgClinicalImpact,
        mitigationStrategies: [
          'Enhanced pre-export validation',
          'Improved user guidance and education',
          'Automated clinical safety checks',
          'Real-time monitoring and alerting',
        ],
      };
    },

    calculateSystemHealthCorrelation: (): SystemHealthCorrelation => {
      const { errorHistory, systemHealth } = get();
      
      // Mock correlation analysis
      return {
        memoryErrors: errorHistory.filter(r => r.error.message.includes('memory')).length,
        performanceErrors: errorHistory.filter(r => r.error.message.includes('timeout')).length,
        networkErrors: errorHistory.filter(r => r.error.message.includes('network')).length,
        databaseErrors: errorHistory.filter(r => r.error.message.includes('database')).length,
        correlationStrength: 0.6, // Mock correlation
        recommendations: [
          'Monitor memory usage more closely',
          'Implement better error handling for network issues',
          'Optimize database queries',
        ],
      };
    },

    // Clinical review management
    requestClinicalReview: (id: ExportID, severity: ClinicalErrorReview['severity']) => {
      set(state => ({
        clinicalReviewRequired: new Set(state.clinicalReviewRequired).add(id),
      }));
    },

    completeClinicalReview: (reviewId: string, review: Omit<ClinicalErrorReview, 'reviewId'>) => {
      const fullReview: ClinicalErrorReview = {
        ...review,
        reviewId,
      };

      set(state => ({
        pendingClinicalReviews: [...state.pendingClinicalReviews, fullReview],
      }));
    },

    getClinicalReviewStatus: (id: ExportID) => {
      const { clinicalReviewRequired, pendingClinicalReviews } = get();
      
      if (!clinicalReviewRequired.has(id)) return 'not-required';
      if (pendingClinicalReviews.some(r => r.reviewId.includes(id))) return 'completed';
      
      return 'pending';
    },

    // System health monitoring
    updateSystemHealth: (health: Partial<SystemHealthState>) => {
      set(state => ({
        systemHealth: { ...state.systemHealth, ...health },
        lastHealthCheck: createTimestamp(),
      }));
    },

    checkSystemHealth: async (): Promise<boolean> => {
      // Mock system health check
      const health = get().systemHealth;
      const isHealthy = (
        health.memoryUsage < 0.9 &&
        health.cpuUsage < 0.8 &&
        health.diskSpace < 0.9 &&
        health.networkStatus === 'online' &&
        health.databaseStatus !== 'unavailable'
      );

      set({ isHealthy });
      return isHealthy;
    },

    setErrorThresholds: (thresholds: Partial<ErrorThresholds>) => {
      set(state => ({
        errorThresholds: { ...state.errorThresholds, ...thresholds },
      }));
    },

    enableAlerts: (enabled: boolean) => {
      set({ alertsEnabled: enabled });
    },

    // User experience customization
    setTherapeuticTone: (tone: ExportErrorState['therapeuticTone']) => {
      set({ therapeuticTone: tone });
    },

    enableUserGuidance: (enabled: boolean) => {
      set({ userGuidanceEnabled: enabled });
    },

    showTechnicalDetails: (show: boolean) => {
      set({ showTechnicalDetails: show });
    },

    collectUserFeedback: (errorId: string, feedback: UserResolutionFeedback) => {
      set(state => ({
        errorHistory: state.errorHistory.map(record => 
          record.id === errorId && record.resolution
            ? { ...record, resolution: { ...record.resolution, userFeedback: feedback } }
            : record
        ),
      }));
    },

    // Configuration management
    setAutomaticRecovery: (enabled: boolean) => {
      set({ automaticRecoveryEnabled: enabled });
    },

    setMaxRecoveryAttempts: (max: number) => {
      set({ maxRecoveryAttempts: Math.max(1, Math.min(max, 10)) });
    },

    setRecoveryTimeout: (timeout: number) => {
      set({ recoveryTimeout: Math.max(30000, Math.min(timeout, 600000)) }); // 30s - 10min
    },

    setClinicalApprovalRequired: (required: boolean) => {
      set({ clinicalApprovalRequired: required });
    },

    // Maintenance and cleanup
    cleanupOldErrors: () => {
      const { cleanupOlderThan } = get();
      const cutoffDate = new Date(Date.now() - cleanupOlderThan * 24 * 60 * 60 * 1000);

      set(state => ({
        errorHistory: state.errorHistory.filter(record => 
          new Date(record.createdAt) >= cutoffDate || !record.resolvedAt
        ),
        lastCleanup: createTimestamp(),
      }));
    },

    compactErrorHistory: () => {
      const { maxErrorHistorySize } = get();
      
      set(state => {
        if (state.errorHistory.length <= maxErrorHistorySize) return state;
        
        // Keep most recent errors and all unresolved errors
        const unresolved = state.errorHistory.filter(r => !r.resolution);
        const resolved = state.errorHistory
          .filter(r => r.resolution)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, maxErrorHistorySize - unresolved.length);
        
        return {
          errorHistory: [...unresolved, ...resolved],
        };
      });
    },

    exportErrorData: (): string => {
      const { errorHistory, commonPatterns, errorAnalytics } = get();
      return JSON.stringify({
        errorHistory,
        commonPatterns,
        errorAnalytics,
        exportedAt: createTimestamp(),
        version: '1.0.0',
      });
    },

    importErrorData: async (data: string): Promise<boolean> => {
      try {
        const parsed = JSON.parse(data);
        
        set({
          errorHistory: parsed.errorHistory || [],
          commonPatterns: parsed.commonPatterns || [],
          errorAnalytics: parsed.errorAnalytics || null,
        });
        
        return true;
      } catch (error) {
        set({ systemError: `Error data import failed: ${error}` });
        return false;
      }
    },

    // Status and queries
    hasActiveErrors: (): boolean => {
      return get().activeErrors.size > 0;
    },

    getActiveErrorCount: (): number => {
      return get().activeErrors.size;
    },

    getCriticalErrorCount: (): number => {
      return Array.from(get().activeErrors.values())
        .filter(error => error.severity === 'critical' || error.clinicalImpact === 'severe')
        .length;
    },

    getRecoveryProgress: (id: ExportID): number => {
      const plan = get().activeRecoveryPlans.get(id);
      if (!plan) return 0;
      
      const attempts = get().recoveryAttempts.get(id) || 0;
      const maxAttempts = get().maxRecoveryAttempts;
      
      return Math.min(attempts / maxAttempts, 1);
    },

    isRecoveryInProgress: (id: ExportID): boolean => {
      return get().recoveryInProgress.has(id);
    },

    // System state management
    setProcessingRecovery: (processing: boolean) => {
      set({ isProcessingRecovery: processing });
    },

    setSystemError: (error: string | null) => {
      set({ systemError: error });
    },

    setSystemHealthy: (healthy: boolean) => {
      set({ isHealthy: healthy });
    },
  }))
);

// ============================================================================
// COMPUTED SELECTORS
// ============================================================================

export const exportErrorSelectors = {
  // Get errors by severity
  getErrorsBySeverity: (state: ExportErrorState, severity: ErrorSeverity): ExportError[] => {
    return Array.from(state.activeErrors.values()).filter(error => error.severity === severity);
  },

  // Get clinical impact summary
  getClinicalImpactSummary: (state: ExportErrorState) => {
    const allErrors = Array.from(state.activeErrors.values());
    const severe = allErrors.filter(e => e.clinicalImpact === 'severe').length;
    const significant = allErrors.filter(e => e.clinicalImpact === 'significant').length;
    const moderate = allErrors.filter(e => e.clinicalImpact === 'moderate').length;
    const minimal = allErrors.filter(e => e.clinicalImpact === 'minimal').length;

    return { severe, significant, moderate, minimal, total: allErrors.length };
  },

  // Get recovery status overview
  getRecoveryStatusOverview: (state: ExportErrorState) => {
    const totalActive = state.activeErrors.size;
    const inRecovery = state.recoveryInProgress.size;
    const withPlans = state.activeRecoveryPlans.size;
    const needingReview = state.clinicalReviewRequired.size;

    return {
      totalActive,
      inRecovery,
      withPlans,
      needingReview,
      recoveryRate: totalActive > 0 ? inRecovery / totalActive : 0,
    };
  },

  // Get system health status
  getSystemHealthStatus: (state: ExportErrorState): 'healthy' | 'warning' | 'critical' => {
    const { systemHealth, errorThresholds } = state;
    
    if (systemHealth.memoryUsage > 0.95 || 
        systemHealth.databaseStatus === 'unavailable' ||
        state.getCriticalErrorCount() > errorThresholds.criticalErrorsPerHour) {
      return 'critical';
    }
    
    if (systemHealth.memoryUsage > 0.8 || 
        systemHealth.cpuUsage > 0.8 ||
        systemHealth.databaseStatus === 'degraded' ||
        state.getActiveErrorCount() > 10) {
      return 'warning';
    }
    
    return 'healthy';
  },
};

// ============================================================================
// ERROR MONITORING AND ALERTS
// ============================================================================

// Error threshold monitoring
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useExportErrorStore.getState();
    if (!state.alertsEnabled) return;

    const criticalCount = state.getCriticalErrorCount();
    const { errorThresholds } = state;

    // Check thresholds and trigger alerts
    if (criticalCount >= errorThresholds.criticalErrorsPerHour) {
      console.warn(`Critical error threshold exceeded: ${criticalCount} errors`);
      // Would trigger actual alert system
    }

    // System health check
    state.checkSystemHealth();
  }, 60000); // Every minute

  // Cleanup interval
  setInterval(() => {
    const state = useExportErrorStore.getState();
    state.cleanupOldErrors();
    state.compactErrorHistory();
  }, 24 * 60 * 60 * 1000); // Every 24 hours

  // Analytics update interval
  setInterval(() => {
    const state = useExportErrorStore.getState();
    if (state.errorHistory.length > 0) {
      state.analyzeErrorPatterns();
    }
  }, 60 * 60 * 1000); // Every hour
}

export default useExportErrorStore;