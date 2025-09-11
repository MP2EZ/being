/**
 * Migration Validation Types for FullMind MBCT App
 * 
 * Comprehensive validation framework for SQLite migration and Calendar integration
 * with clinical-grade testing requirements and therapeutic continuity guarantees.
 */

import { Assessment, CheckIn, CrisisPlan, UserProfile } from '../types';
import {
  SQLiteSecurityConfig,
  SQLiteMigrationState,
  SQLiteAssessmentRecord,
  TherapeuticProgressMetrics
} from './sqlite';
import {
  CalendarUserPreferences,
  PrivacySafeCalendarEvent,
  CalendarIntegrationStatus
} from './calendar';

// Migration Validation Framework
export interface MigrationValidationSuite {
  readonly sqliteValidation: SQLiteMigrationValidation;
  readonly calendarValidation: CalendarIntegrationValidation;
  readonly crossFeatureValidation: CrossFeatureValidation;
  readonly clinicalSafetyValidation: ClinicalSafetyValidation;
  readonly performanceValidation: PerformanceValidation;
}

// SQLite Migration Validation
export interface SQLiteMigrationValidation {
  // Pre-migration validation
  readonly validateMigrationReadiness: () => Promise<MigrationReadinessReport>;
  readonly validateDataIntegrity: (data: MigrationDataSet) => Promise<DataIntegrityReport>;
  readonly validateEncryptionCapabilities: () => Promise<EncryptionCapabilityReport>;
  
  // During migration validation
  readonly validateMigrationProgress: (progress: any) => Promise<ProgressValidationResult>;
  readonly validateBatchIntegrity: (batch: any[]) => Promise<BatchValidationResult>;
  readonly validatePerformanceThresholds: (metrics: any) => Promise<PerformanceValidationResult>;
  
  // Post-migration validation
  readonly validateMigrationCompleteness: () => Promise<CompletenessValidationReport>;
  readonly validateEncryptionIntegrity: () => Promise<EncryptionValidationReport>;
  readonly validateQueryPerformance: () => Promise<QueryPerformanceReport>;
  readonly validateClinicalDataAccuracy: () => Promise<ClinicalDataValidationReport>;
}

// Calendar Integration Validation
export interface CalendarIntegrationValidation {
  // Privacy validation
  readonly validatePrivacyCompliance: (event: PrivacySafeCalendarEvent) => Promise<PrivacyValidationResult>;
  readonly validatePHIExposurePrevention: (events: PrivacySafeCalendarEvent[]) => Promise<PHIExposureReport>;
  readonly validateCrossAppSecurity: () => Promise<CrossAppSecurityReport>;
  
  // Permission validation
  readonly validatePermissionHandling: () => Promise<PermissionValidationResult>;
  readonly validateGracefulDegradation: () => Promise<DegradationValidationReport>;
  readonly validateFallbackMechanisms: () => Promise<FallbackValidationReport>;
  
  // Functional validation
  readonly validateEventCreation: (template: any) => Promise<EventCreationValidationResult>;
  readonly validateSchedulingAccuracy: (schedule: any) => Promise<SchedulingValidationReport>;
  readonly validateTherapeuticTiming: () => Promise<TherapeuticTimingReport>;
}

// Cross-Feature Validation
export interface CrossFeatureValidation {
  readonly validateFeatureCoordination: () => Promise<FeatureCoordinationReport>;
  readonly validateAnalyticsAccuracy: (userId: string) => Promise<AnalyticsAccuracyReport>;
  readonly validateHabitFormationMetrics: (userId: string) => Promise<HabitFormationValidationReport>;
  readonly validateTherapeuticInsights: (userId: string) => Promise<TherapeuticInsightsValidationReport>;
}

// Clinical Safety Validation
export interface ClinicalSafetyValidation {
  readonly validateEmergencyAccess: () => Promise<EmergencyAccessReport>;
  readonly validateCrisisDataProtection: () => Promise<CrisisDataProtectionReport>;
  readonly validateTherapeuticContinuity: () => Promise<TherapeuticContinuityReport>;
  readonly validateAssessmentDataIntegrity: () => Promise<AssessmentDataIntegrityReport>;
  readonly validateClinicalAccuracy: () => Promise<ClinicalAccuracyReport>;
}

// Performance Validation
export interface PerformanceValidation {
  readonly validateMigrationPerformance: () => Promise<MigrationPerformanceReport>;
  readonly validateCalendarPerformance: () => Promise<CalendarPerformanceReport>;
  readonly validateAnalyticsPerformance: () => Promise<AnalyticsPerformanceReport>;
  readonly validateMemoryUsage: () => Promise<MemoryUsageReport>;
  readonly validateBatteryImpact: () => Promise<BatteryImpactReport>;
}

// Validation Report Types

// Migration Readiness
export interface MigrationReadinessReport {
  readonly ready: boolean;
  readonly requirements: readonly {
    readonly requirement: string;
    readonly met: boolean;
    readonly details: string;
  }[];
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
  readonly estimatedMigrationTime: number; // milliseconds
  readonly recommendedActions: readonly string[];
}

// Data Integrity
export interface DataIntegrityReport {
  readonly valid: boolean;
  readonly totalRecords: number;
  readonly validatedRecords: number;
  readonly corruptedRecords: readonly {
    readonly recordId: string;
    readonly recordType: 'assessment' | 'checkin' | 'crisis_plan' | 'user_profile';
    readonly corruptionType: string;
    readonly severity: 'low' | 'medium' | 'high' | 'critical';
    readonly recoverable: boolean;
  }[];
  readonly missingData: readonly {
    readonly expectedField: string;
    readonly affectedRecords: number;
    readonly impact: 'none' | 'minimal' | 'moderate' | 'severe';
  }[];
  readonly recommendations: readonly string[];
}

// Encryption Capability
export interface EncryptionCapabilityReport {
  readonly supported: boolean;
  readonly algorithm: string;
  readonly hardwareBackedKeystore: boolean;
  readonly keychainAccess: boolean;
  readonly performanceMetrics: {
    readonly encryptionSpeedMbps: number;
    readonly decryptionSpeedMbps: number;
    readonly keyGenerationTimeMs: number;
  };
  readonly limitations: readonly string[];
}

// Privacy Validation Result
export interface PrivacyValidationResult {
  readonly compliant: boolean;
  readonly violations: readonly {
    readonly type: 'phi_exposure' | 'clinical_data' | 'cross_app_leak' | 'unauthorized_access';
    readonly severity: 'warning' | 'error' | 'critical';
    readonly field: string;
    readonly actualValue: string;
    readonly expectedPattern: string;
    readonly remediation: string;
  }[];
  readonly privacyScore: number; // 0-100
  readonly recommendations: readonly string[];
}

// PHI Exposure Report
export interface PHIExposureReport {
  readonly exposureDetected: boolean;
  readonly riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  readonly potentialExposures: readonly {
    readonly eventId: string;
    readonly field: string;
    readonly suspiciousContent: string;
    readonly riskScore: number; // 0-100
    readonly automaticallySanitized: boolean;
  }[];
  readonly preventiveMeasures: readonly string[];
  readonly auditRequired: boolean;
}

// Clinical Data Validation
export interface ClinicalDataValidationReport {
  readonly accurate: boolean;
  readonly totalAssessments: number;
  readonly validatedAssessments: number;
  readonly accuracyTests: readonly {
    readonly testName: string;
    readonly passed: boolean;
    readonly expectedValue: any;
    readonly actualValue: any;
    readonly tolerance: number;
    readonly criticalForSafety: boolean;
  }[];
  readonly scoringAccuracy: {
    readonly phq9Accuracy: number; // Percentage
    readonly gad7Accuracy: number; // Percentage
    readonly thresholdDetectionAccuracy: number; // Percentage
    readonly crisisDetectionAccuracy: number; // Percentage
  };
  readonly discrepancies: readonly {
    readonly assessmentId: string;
    readonly discrepancyType: 'scoring_error' | 'threshold_miscalculation' | 'data_corruption';
    readonly severity: 'low' | 'medium' | 'high' | 'critical';
    readonly correctionRequired: boolean;
  }[];
}

// Emergency Access Report
export interface EmergencyAccessReport {
  readonly accessible: boolean;
  readonly responseTime: number; // milliseconds
  readonly crisisDataAvailable: boolean;
  readonly emergencyContactsAccessible: boolean;
  readonly safetyPlanAccessible: boolean;
  readonly fallbackMechanismsActive: boolean;
  readonly testResults: readonly {
    readonly testScenario: string;
    readonly passed: boolean;
    readonly responseTimeMs: number;
    readonly maxAcceptableTimeMs: number;
    readonly criticalFailure: boolean;
  }[];
  readonly recommendations: readonly string[];
}

// Therapeutic Continuity Report
export interface TherapeuticContinuityReport {
  readonly maintained: boolean;
  readonly coreCapabilities: readonly {
    readonly capability: 'assessment_completion' | 'check_in_recording' | 'crisis_detection' | 'progress_tracking';
    readonly available: boolean;
    readonly performanceLevel: 'full' | 'degraded' | 'fallback' | 'unavailable';
    readonly alternativesAvailable: readonly string[];
  }[];
  readonly continuityScore: number; // 0-100
  readonly impactAssessment: {
    readonly userExperienceImpact: 'none' | 'minimal' | 'moderate' | 'significant' | 'severe';
    readonly therapeuticEffectivenessImpact: 'none' | 'minimal' | 'moderate' | 'significant';
    readonly clinicalSafetyImpact: 'none' | 'minimal' | 'moderate' | 'high' | 'critical';
  };
  readonly mitigationActions: readonly string[];
}

// Performance Reports
export interface MigrationPerformanceReport {
  readonly withinThresholds: boolean;
  readonly totalMigrationTime: number; // milliseconds
  readonly maxAcceptableTime: number; // milliseconds
  readonly memoryUsage: {
    readonly peakUsageMb: number;
    readonly averageUsageMb: number;
    readonly maxAcceptableMb: number;
  };
  readonly storageImpact: {
    readonly originalSizeMb: number;
    readonly finalSizeMb: number;
    readonly compressionRatio: number;
  };
  readonly performanceIssues: readonly {
    readonly issue: string;
    readonly severity: 'low' | 'medium' | 'high';
    readonly impact: string;
    readonly recommendation: string;
  }[];
}

export interface CalendarPerformanceReport {
  readonly withinThresholds: boolean;
  readonly averageEventCreationTime: number; // milliseconds
  readonly maxAcceptableCreationTime: number; // milliseconds
  readonly permissionRequestTime: number; // milliseconds
  readonly syncLatency: number; // milliseconds
  readonly failureRate: number; // 0-1
  readonly batteryImpact: 'minimal' | 'low' | 'moderate' | 'high';
  readonly optimizationOpportunities: readonly string[];
}

// Validation Test Cases
export interface ValidationTestCase {
  readonly testId: string;
  readonly testName: string;
  readonly category: 'migration' | 'calendar' | 'analytics' | 'clinical_safety' | 'performance';
  readonly priority: 'critical' | 'high' | 'medium' | 'low';
  readonly description: string;
  readonly prerequisites: readonly string[];
  readonly execute: () => Promise<ValidationTestResult>;
  readonly cleanup: () => Promise<void>;
}

export interface ValidationTestResult {
  readonly testId: string;
  readonly passed: boolean;
  readonly executionTime: number; // milliseconds
  readonly details: {
    readonly expectedOutcome: any;
    readonly actualOutcome: any;
    readonly variance?: number;
    readonly withinTolerance: boolean;
  };
  readonly issues: readonly {
    readonly severity: 'info' | 'warning' | 'error' | 'critical';
    readonly message: string;
    readonly recommendation?: string;
  }[];
  readonly metrics?: Record<string, number>;
}

// Migration Data Set for Testing
export interface MigrationDataSet {
  readonly users: readonly UserProfile[];
  readonly assessments: readonly Assessment[];
  readonly checkIns: readonly CheckIn[];
  readonly crisisPlans: readonly CrisisPlan[];
  readonly partialSessions: readonly any[];
  readonly metadata: {
    readonly totalRecords: number;
    readonly createdDateRange: { start: string; end: string };
    readonly dataVersion: string;
    readonly includesSyntheticData: boolean;
  };
}

// Validation Configuration
export interface ValidationConfig {
  readonly testSuites: readonly ('migration' | 'calendar' | 'analytics' | 'clinical_safety' | 'performance')[];
  readonly testPriorities: readonly ('critical' | 'high' | 'medium' | 'low')[];
  readonly failureThresholds: {
    readonly criticalTestFailures: number; // Max allowed critical test failures
    readonly highPriorityFailures: number; // Max allowed high priority failures
    readonly overallSuccessRate: number; // Minimum success rate (0-1)
  };
  readonly performanceThresholds: {
    readonly migrationTimeMs: number;
    readonly calendarResponseTimeMs: number;
    readonly analyticsQueryTimeMs: number;
    readonly memoryUsageMb: number;
  };
  readonly clinicalSafetyThresholds: {
    readonly emergencyAccessTimeMs: number;
    readonly assessmentAccuracyPercentage: number;
    readonly continuityScoreMinimum: number;
  };
}

// Validation Suite Implementation
export interface ValidationSuiteExecutor {
  readonly executeValidationSuite: (
    config: ValidationConfig,
    testData?: MigrationDataSet
  ) => Promise<ValidationSuiteResult>;
  
  readonly executeSpecificTests: (
    testIds: readonly string[]
  ) => Promise<ValidationTestResult[]>;
  
  readonly generateValidationReport: (
    results: ValidationSuiteResult
  ) => Promise<ValidationReport>;
  
  readonly validateContinuousSafety: () => Promise<ContinuousSafetyReport>;
}

export interface ValidationSuiteResult {
  readonly executionId: string;
  readonly executedAt: string;
  readonly totalTests: number;
  readonly passedTests: number;
  readonly failedTests: number;
  readonly criticalFailures: number;
  readonly overallSuccessRate: number;
  readonly executionTime: number; // milliseconds
  readonly testResults: readonly ValidationTestResult[];
  readonly summary: {
    readonly migrationValidation: 'passed' | 'failed' | 'not_executed';
    readonly calendarValidation: 'passed' | 'failed' | 'not_executed';
    readonly clinicalSafetyValidation: 'passed' | 'failed' | 'not_executed';
    readonly performanceValidation: 'passed' | 'failed' | 'not_executed';
  };
  readonly recommendations: readonly string[];
  readonly blockers: readonly string[];
}

export interface ValidationReport {
  readonly reportId: string;
  readonly generatedAt: string;
  readonly executiveSummary: {
    readonly migrationReady: boolean;
    readonly calendarIntegrationReady: boolean;
    readonly clinicalSafetyMaintained: boolean;
    readonly performanceAcceptable: boolean;
    readonly overallRecommendation: 'proceed' | 'proceed_with_cautions' | 'do_not_proceed';
  };
  readonly detailedFindings: ValidationSuiteResult;
  readonly riskAssessment: {
    readonly highRiskItems: readonly string[];
    readonly mitigationStrategies: readonly string[];
    readonly contingencyPlans: readonly string[];
  };
  readonly nextSteps: readonly string[];
}

export interface ContinuousSafetyReport {
  readonly monitoringActive: boolean;
  readonly lastCheck: string;
  readonly safetyMetrics: {
    readonly emergencyAccessResponse: number; // milliseconds
    readonly assessmentAccuracy: number; // percentage
    readonly therapeuticContinuity: number; // 0-100 score
    readonly privacyCompliance: number; // 0-100 score
  };
  readonly alerts: readonly {
    readonly alertType: 'performance_degradation' | 'safety_threshold_breach' | 'privacy_violation' | 'clinical_accuracy_issue';
    readonly severity: 'info' | 'warning' | 'error' | 'critical';
    readonly message: string;
    readonly detectedAt: string;
    readonly actionRequired: boolean;
  }[];
  readonly trends: {
    readonly improvingMetrics: readonly string[];
    readonly decliningMetrics: readonly string[];
    readonly stableMetrics: readonly string[];
  };
}

// Constants for validation thresholds
export const VALIDATION_CONSTANTS = {
  THRESHOLDS: {
    MIGRATION_MAX_TIME_MS: 300000, // 5 minutes
    CALENDAR_MAX_RESPONSE_MS: 1000, // 1 second
    EMERGENCY_ACCESS_MAX_MS: 200, // 200ms for crisis access
    ASSESSMENT_ACCURACY_MIN: 99.5, // 99.5% accuracy required
    CONTINUITY_SCORE_MIN: 95, // 95/100 continuity score minimum
    MEMORY_USAGE_MAX_MB: 150, // 150MB maximum memory usage
    SUCCESS_RATE_MIN: 0.95, // 95% minimum test success rate
  },
  
  TEST_DATA: {
    MIN_ASSESSMENT_SAMPLES: 100, // Minimum assessments for validation
    MIN_CHECKIN_SAMPLES: 500, // Minimum check-ins for validation
    MIN_USER_SAMPLES: 10, // Minimum user profiles for validation
    SYNTHETIC_DATA_PERCENTAGE: 0.3, // 30% synthetic data allowed
  },
  
  CLINICAL_SAFETY: {
    PHQ9_SCORING_TOLERANCE: 0, // Zero tolerance for PHQ-9 scoring errors
    GAD7_SCORING_TOLERANCE: 0, // Zero tolerance for GAD-7 scoring errors
    CRISIS_DETECTION_ACCURACY_MIN: 100, // 100% accuracy for crisis detection
    EMERGENCY_PROTOCOLS_UPTIME: 99.99, // 99.99% uptime for emergency protocols
  }
} as const;

// Type Guards
export const isValidationTestResult = (result: unknown): result is ValidationTestResult => {
  return (
    typeof result === 'object' &&
    result !== null &&
    'testId' in result &&
    'passed' in result &&
    'executionTime' in result &&
    'details' in result &&
    'issues' in result
  );
};

export const isValidationSuiteResult = (result: unknown): result is ValidationSuiteResult => {
  return (
    typeof result === 'object' &&
    result !== null &&
    'executionId' in result &&
    'totalTests' in result &&
    'passedTests' in result &&
    'testResults' in result &&
    'summary' in result
  );
};