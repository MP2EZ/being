/**
 * Type-Safe Performance Monitoring System - Phase 4.3B Implementation
 *
 * Comprehensive TypeScript interfaces for healthcare-compliant performance monitoring
 * with crisis response SLA enforcement and therapeutic effectiveness validation.
 *
 * CRITICAL TYPE SAFETY REQUIREMENTS:
 * - Crisis response monitoring types must enforce <200ms SLA
 * - Therapeutic timing types must validate ±50ms MBCT compliance
 * - Clinical accuracy types must ensure 100% calculation validation
 * - Performance overhead types must limit to <5% impact
 *
 * HEALTHCARE COMPLIANCE TYPING:
 * - All crisis interactions must be type-safe with guaranteed response times
 * - Therapeutic session types must enforce MBCT compliance
 * - Clinical assessment types must maintain 100% accuracy validation
 * - Memory management types must support extended therapeutic sessions
 */

import { Brand, DurationMs, UnixTimestamp, ISODateString, Percentage } from './core';
import { CrisisSeverity, RiskLevel } from './core';

// ============================================================================
// CORE PERFORMANCE MONITORING FOUNDATIONS
// ============================================================================

/**
 * Performance SLA constraint with type-level enforcement
 */
export type PerformanceSLA<T extends number> = Brand<T, 'PerformanceSLA'>;

/**
 * Crisis response timing - MUST be under 200ms
 */
export type CrisisResponseTime = PerformanceSLA<number> & {
  readonly _constraint: 'CRISIS_MAX_200MS';
};

/**
 * Therapeutic timing accuracy - MUST be within ±50ms of target
 */
export type TherapeuticTimingAccuracy = Brand<number, 'TherapeuticTiming'> & {
  readonly _constraint: 'MBCT_TOLERANCE_50MS';
};

/**
 * Performance overhead constraint - MUST be under 5%
 */
export type PerformanceOverhead = Percentage & {
  readonly _constraint: 'MAX_5_PERCENT';
};

/**
 * Memory usage with leak detection
 */
export type MemoryUsage = Brand<number, 'MemoryBytes'> & {
  readonly _metadata: {
    baseline: number;
    growthRate: number;
    leakDetected: boolean;
  };
};

/**
 * Frame rate with therapeutic requirements
 */
export type FrameRate = Brand<number, 'FPS'> & {
  readonly _constraint: 'MIN_58_FPS_THERAPEUTIC';
};

// ============================================================================
// PERFORMANCE MONITORING COORDINATOR TYPES
// ============================================================================

/**
 * Performance monitoring priority levels
 */
export type PerformanceMonitoringPriority =
  | 'crisis'        // Immediate response required
  | 'therapeutic'   // MBCT compliance monitoring
  | 'clinical'      // Assessment accuracy tracking
  | 'general'       // Standard app performance
  | 'background';   // Low-priority optimization

/**
 * Performance metric categories for healthcare applications
 */
export type PerformanceMetricCategory =
  | 'crisis_response'
  | 'therapeutic_timing'
  | 'clinical_accuracy'
  | 'memory_management'
  | 'battery_optimization'
  | 'animation_stability'
  | 'touch_responsiveness'
  | 'network_reliability';

/**
 * Performance alert levels with healthcare-appropriate escalation
 */
export type PerformanceAlertLevel =
  | 'info'          // General performance information
  | 'warning'       // Performance degradation detected
  | 'error'         // SLA violation occurred
  | 'critical'      // Crisis response compromised
  | 'emergency';    // Immediate intervention required

/**
 * Core performance metric with healthcare context
 */
export interface PerformanceMetric {
  readonly id: string;
  readonly category: PerformanceMetricCategory;
  readonly priority: PerformanceMonitoringPriority;
  readonly timestamp: UnixTimestamp;
  readonly value: number;
  readonly unit: string;
  readonly target?: number;
  readonly threshold: {
    readonly warning: number;
    readonly error: number;
    readonly critical: number;
  };
  readonly healthcareContext: {
    readonly isCrisisCritical: boolean;
    readonly isTherapeuticRelevant: boolean;
    readonly isClinicalAccuracy: boolean;
    readonly requiresImmedateAction: boolean;
  };
}

/**
 * Performance monitoring session with therapeutic context
 */
export interface PerformanceMonitoringSession {
  readonly sessionId: string;
  readonly startTime: UnixTimestamp;
  readonly endTime?: UnixTimestamp;
  readonly sessionType: 'crisis' | 'therapeutic' | 'clinical' | 'general';
  readonly priority: PerformanceMonitoringPriority;
  readonly metrics: ReadonlyArray<PerformanceMetric>;
  readonly alerts: ReadonlyArray<PerformanceAlert>;
  readonly slaViolations: ReadonlyArray<SLAViolation>;
  readonly therapeuticContext?: {
    readonly sessionType: 'breathing' | 'assessment' | 'checkin' | 'mindfulness';
    readonly mbctCompliance: boolean;
    readonly timingAccuracy: TherapeuticTimingAccuracy;
    readonly effectivenessScore: Percentage;
  };
  readonly crisisContext?: {
    readonly responseTime: CrisisResponseTime;
    readonly slaCompliant: boolean;
    readonly escalationRequired: boolean;
    readonly emergencyProtocolActivated: boolean;
  };
}

/**
 * Performance alert with healthcare-appropriate severity
 */
export interface PerformanceAlert {
  readonly id: string;
  readonly level: PerformanceAlertLevel;
  readonly category: PerformanceMetricCategory;
  readonly timestamp: UnixTimestamp;
  readonly message: string;
  readonly metric: PerformanceMetric;
  readonly actionRequired: boolean;
  readonly healthcareImpact: {
    readonly affectsCrisisResponse: boolean;
    readonly affectsTherapeuticOutcome: boolean;
    readonly affectsClinicalAccuracy: boolean;
    readonly userSafetyRisk: RiskLevel;
  };
  readonly resolutionStrategy?: {
    readonly immediate: string[];
    readonly shortTerm: string[];
    readonly longTerm: string[];
  };
}

/**
 * SLA violation tracking with crisis safety
 */
export interface SLAViolation {
  readonly id: string;
  readonly timestamp: UnixTimestamp;
  readonly slaType: 'crisis_response' | 'therapeutic_timing' | 'clinical_accuracy' | 'general_performance';
  readonly target: number;
  readonly actual: number;
  readonly severity: CrisisSeverity;
  readonly impact: {
    readonly userExperience: RiskLevel;
    readonly therapeuticEffectiveness: RiskLevel;
    readonly crisisSafety: RiskLevel;
    readonly clinicalAccuracy: RiskLevel;
  };
  readonly resolutionRequired: boolean;
  readonly escalationTriggered: boolean;
}

// ============================================================================
// HEALTHCARE COMPLIANCE MONITOR TYPES
// ============================================================================

/**
 * Healthcare compliance monitoring framework
 */
export interface HealthcareComplianceMonitor {
  readonly monitorId: string;
  readonly complianceType: 'mbct' | 'crisis_safety' | 'clinical_accuracy' | 'accessibility';
  readonly isActive: boolean;
  readonly complianceLevel: 'full' | 'partial' | 'violation' | 'critical_failure';
  readonly lastValidation: UnixTimestamp;
  readonly violations: ReadonlyArray<ComplianceViolation>;
  readonly recommendations: ReadonlyArray<ComplianceRecommendation>;
}

/**
 * Compliance violation with healthcare context
 */
export interface ComplianceViolation {
  readonly id: string;
  readonly timestamp: UnixTimestamp;
  readonly violationType: 'timing' | 'accuracy' | 'safety' | 'accessibility' | 'data_integrity';
  readonly severity: 'minor' | 'moderate' | 'severe' | 'critical';
  readonly description: string;
  readonly healthcareImpact: {
    readonly patientSafety: RiskLevel;
    readonly therapeuticOutcome: RiskLevel;
    readonly clinicalAccuracy: RiskLevel;
    readonly regulatoryCompliance: RiskLevel;
  };
  readonly resolutionStatus: 'pending' | 'in_progress' | 'resolved' | 'escalated';
  readonly requiredActions: ReadonlyArray<string>;
}

/**
 * Compliance recommendation with actionable guidance
 */
export interface ComplianceRecommendation {
  readonly id: string;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly category: 'performance' | 'safety' | 'accuracy' | 'accessibility';
  readonly recommendation: string;
  readonly implementationSteps: ReadonlyArray<string>;
  readonly expectedBenefit: string;
  readonly implementationEffort: 'minimal' | 'moderate' | 'significant' | 'major';
  readonly healthcareJustification: string;
}

// ============================================================================
// REAL-TIME ANALYTICS ENGINE TYPES
// ============================================================================

/**
 * Real-time analytics configuration
 */
export interface RealTimeAnalyticsConfig {
  readonly enableCrisisMonitoring: boolean;
  readonly enableTherapeuticTracking: boolean;
  readonly enableClinicalValidation: boolean;
  readonly enableMemoryMonitoring: boolean;
  readonly samplingRate: Percentage;
  readonly alertThresholds: {
    readonly crisis: CrisisResponseTime;
    readonly therapeutic: TherapeuticTimingAccuracy;
    readonly memory: MemoryUsage;
    readonly frameRate: FrameRate;
  };
  readonly aggregationWindow: DurationMs;
  readonly retentionPeriod: DurationMs;
}

/**
 * Real-time analytics engine
 */
export interface RealTimeAnalyticsEngine {
  readonly engineId: string;
  readonly isRunning: boolean;
  readonly config: RealTimeAnalyticsConfig;
  readonly currentMetrics: ReadonlyMap<string, PerformanceMetric>;
  readonly recentAlerts: ReadonlyArray<PerformanceAlert>;
  readonly activeViolations: ReadonlyArray<SLAViolation>;
  readonly healthcareCompliance: ReadonlyMap<string, HealthcareComplianceMonitor>;
}

/**
 * Analytics processing result
 */
export interface AnalyticsProcessingResult {
  readonly timestamp: UnixTimestamp;
  readonly processedMetrics: number;
  readonly generatedAlerts: number;
  readonly detectedViolations: number;
  readonly processingLatency: DurationMs;
  readonly healthStatus: 'healthy' | 'degraded' | 'critical';
  readonly recommendations: ReadonlyArray<string>;
}

// ============================================================================
// OBSERVER/DECORATOR/STRATEGY PATTERN TYPES
// ============================================================================

/**
 * Performance observer interface with healthcare context
 */
export interface PerformanceObserver {
  readonly observerId: string;
  readonly category: PerformanceMetricCategory;
  readonly isActive: boolean;
  onMetricUpdate(metric: PerformanceMetric): Promise<void>;
  onAlert(alert: PerformanceAlert): Promise<void>;
  onViolation(violation: SLAViolation): Promise<void>;
  getHealthcareContext(): HealthcareContext;
}

/**
 * Healthcare context for performance monitoring
 */
export interface HealthcareContext {
  readonly isCrisisSession: boolean;
  readonly isTherapeuticSession: boolean;
  readonly isClinicalSession: boolean;
  readonly requiresHighAccuracy: boolean;
  readonly requiresLowLatency: boolean;
  readonly requiresMemoryStability: boolean;
  readonly patientSafetyLevel: RiskLevel;
}

/**
 * Performance decorator for healthcare compliance
 */
export interface PerformanceDecorator {
  readonly decoratorId: string;
  readonly decoratorType: 'crisis_safety' | 'therapeutic_compliance' | 'clinical_accuracy';
  decorate<T>(component: T, context: HealthcareContext): T & HealthcareCompliantComponent;
  validateCompliance(metrics: ReadonlyArray<PerformanceMetric>): ComplianceValidationResult;
}

/**
 * Healthcare compliant component interface
 */
export interface HealthcareCompliantComponent {
  readonly healthcareMetadata: {
    readonly isCrisisSafe: boolean;
    readonly isTherapeuticEffective: boolean;
    readonly isClinicallyAccurate: boolean;
    readonly complianceLevel: 'full' | 'partial' | 'none';
  };
  validatePerformance(): Promise<ComplianceValidationResult>;
}

/**
 * Compliance validation result
 */
export interface ComplianceValidationResult {
  readonly isCompliant: boolean;
  readonly complianceScore: Percentage;
  readonly violations: ReadonlyArray<ComplianceViolation>;
  readonly recommendations: ReadonlyArray<ComplianceRecommendation>;
  readonly healthcareImpact: {
    readonly safetyRisk: RiskLevel;
    readonly therapeuticRisk: RiskLevel;
    readonly accuracyRisk: RiskLevel;
  };
}

/**
 * Performance monitoring strategy interface
 */
export interface PerformanceMonitoringStrategy {
  readonly strategyId: string;
  readonly strategyType: 'crisis_response' | 'therapeutic_optimization' | 'clinical_validation';
  readonly priority: PerformanceMonitoringPriority;
  shouldMonitor(context: HealthcareContext): boolean;
  getMonitoringConfig(context: HealthcareContext): RealTimeAnalyticsConfig;
  processMetrics(metrics: ReadonlyArray<PerformanceMetric>): Promise<AnalyticsProcessingResult>;
  generateRecommendations(results: AnalyticsProcessingResult): ReadonlyArray<ComplianceRecommendation>;
}

// ============================================================================
// TURBOSTORE MANAGER INTEGRATION TYPES
// ============================================================================

/**
 * TurboStore performance metrics
 */
export interface TurboStorePerformanceMetrics {
  readonly storeId: string;
  readonly operationType: 'read' | 'write' | 'subscribe' | 'unsubscribe' | 'batch';
  readonly operationLatency: DurationMs;
  readonly memoryImpact: MemoryUsage;
  readonly isHealthcareData: boolean;
  readonly isCrisisCritical: boolean;
  readonly encryptionOverhead?: DurationMs;
  readonly compressionRatio?: Percentage;
  readonly cacheHitRate?: Percentage;
}

/**
 * TurboModule monitoring interface
 */
export interface TurboModuleMonitor {
  readonly moduleId: string;
  readonly moduleName: string;
  readonly isActive: boolean;
  readonly performanceMetrics: TurboStorePerformanceMetrics;
  readonly healthcareCompliance: {
    readonly dataSafety: boolean;
    readonly encryptionEnabled: boolean;
    readonly auditingEnabled: boolean;
    readonly accessControlEnabled: boolean;
  };
  trackOperation(operation: TurboStoreOperation): Promise<void>;
  validateCompliance(): Promise<ComplianceValidationResult>;
  getPerformanceReport(): TurboStorePerformanceReport;
}

/**
 * TurboStore operation tracking
 */
export interface TurboStoreOperation {
  readonly operationId: string;
  readonly timestamp: UnixTimestamp;
  readonly storeId: string;
  readonly operationType: TurboStorePerformanceMetrics['operationType'];
  readonly dataSize: number;
  readonly isHealthcareData: boolean;
  readonly encryptionRequired: boolean;
  readonly startTime: UnixTimestamp;
  readonly endTime?: UnixTimestamp;
  readonly success: boolean;
  readonly error?: string;
}

/**
 * TurboStore performance report
 */
export interface TurboStorePerformanceReport {
  readonly reportId: string;
  readonly generatedAt: UnixTimestamp;
  readonly timeWindow: {
    readonly start: UnixTimestamp;
    readonly end: UnixTimestamp;
  };
  readonly metrics: {
    readonly totalOperations: number;
    readonly averageLatency: DurationMs;
    readonly memoryEfficiency: Percentage;
    readonly errorRate: Percentage;
    readonly complianceScore: Percentage;
  };
  readonly healthcareMetrics: {
    readonly crisisResponseTimes: ReadonlyArray<CrisisResponseTime>;
    readonly therapeuticAccuracy: ReadonlyArray<TherapeuticTimingAccuracy>;
    readonly clinicalDataIntegrity: boolean;
    readonly encryptionOverhead: Percentage;
  };
  readonly recommendations: ReadonlyArray<string>;
  readonly violations: ReadonlyArray<SLAViolation>;
}

// ============================================================================
// MIGRATION VALIDATION TYPES
// ============================================================================

/**
 * Migration performance baseline
 */
export interface MigrationPerformanceBaseline {
  readonly baselineId: string;
  readonly capturedAt: UnixTimestamp;
  readonly preMigrationMetrics: {
    readonly touchResponseTime: DurationMs;
    readonly animationFrameRate: FrameRate;
    readonly crisisResponseTime: CrisisResponseTime;
    readonly memoryUsage: MemoryUsage;
    readonly batteryImpact: Percentage;
  };
  readonly targetMetrics: {
    readonly touchResponseImprovement: Percentage; // Target: 25%
    readonly animationFrameImprovement: Percentage; // Target: 20%
    readonly crisisResponseImprovement: Percentage; // Target: 60%
    readonly memoryOptimization: Percentage; // Target: 15%
    readonly batteryOptimization: Percentage; // Target: 10%
  };
}

/**
 * Migration validation result
 */
export interface MigrationValidationResult {
  readonly validationId: string;
  readonly validatedAt: UnixTimestamp;
  readonly baseline: MigrationPerformanceBaseline;
  readonly currentMetrics: MigrationPerformanceBaseline['preMigrationMetrics'];
  readonly achievements: {
    readonly touchResponseAchieved: boolean;
    readonly animationFrameAchieved: boolean;
    readonly crisisResponseAchieved: boolean;
    readonly memoryOptimizationAchieved: boolean;
    readonly batteryOptimizationAchieved: boolean;
  };
  readonly overallMigrationSuccess: boolean;
  readonly improvementPercentages: {
    readonly touchResponse: Percentage;
    readonly animationFrame: Percentage;
    readonly crisisResponse: Percentage;
    readonly memoryUsage: Percentage;
    readonly batteryImpact: Percentage;
  };
  readonly healthcareImpact: {
    readonly therapeuticEffectivenessImproved: boolean;
    readonly crisisSafetyImproved: boolean;
    readonly clinicalAccuracyMaintained: boolean;
    readonly accessibilityMaintained: boolean;
  };
  readonly recommendations: ReadonlyArray<string>;
}

/**
 * Migration benefits validation framework
 */
export interface MigrationBenefitsValidator {
  readonly validatorId: string;
  readonly validationType: 'performance' | 'healthcare' | 'compliance' | 'user_experience';
  validateMigrationBenefits(baseline: MigrationPerformanceBaseline): Promise<MigrationValidationResult>;
  generateComprehensiveReport(): Promise<MigrationComprehensiveReport>;
  trackRegressions(): Promise<ReadonlyArray<PerformanceRegression>>;
}

/**
 * Performance regression tracking
 */
export interface PerformanceRegression {
  readonly regressionId: string;
  readonly detectedAt: UnixTimestamp;
  readonly metric: PerformanceMetricCategory;
  readonly beforeValue: number;
  readonly afterValue: number;
  readonly degradationPercentage: Percentage;
  readonly severity: 'minor' | 'moderate' | 'severe' | 'critical';
  readonly healthcareImpact: {
    readonly affectsCrisisResponse: boolean;
    readonly affectsTherapeuticOutcome: boolean;
    readonly affectsClinicalAccuracy: boolean;
  };
  readonly resolutionStrategy: string;
  readonly estimatedResolutionTime: DurationMs;
}

/**
 * Comprehensive migration report
 */
export interface MigrationComprehensiveReport {
  readonly reportId: string;
  readonly generatedAt: UnixTimestamp;
  readonly migrationPhase: 'pre' | 'during' | 'post' | 'validation';
  readonly overallSuccess: boolean;
  readonly performanceImprovements: ReadonlyArray<MigrationValidationResult>;
  readonly healthcareCompliance: ReadonlyArray<ComplianceValidationResult>;
  readonly regressionAnalysis: ReadonlyArray<PerformanceRegression>;
  readonly userExperienceImpact: {
    readonly overallImprovement: Percentage;
    readonly therapeuticEffectivenessChange: Percentage;
    readonly crisisSafetyChange: Percentage;
    readonly accessibilityChange: Percentage;
  };
  readonly recommendations: {
    readonly immediate: ReadonlyArray<string>;
    readonly shortTerm: ReadonlyArray<string>;
    readonly longTerm: ReadonlyArray<string>;
  };
  readonly executiveSummary: string;
}

// ============================================================================
// TYPE GUARDS AND VALIDATORS
// ============================================================================

/**
 * Type guard for crisis response time validation
 */
export function isCrisisResponseTime(value: number): value is CrisisResponseTime {
  return value >= 0 && value <= 200;
}

/**
 * Type guard for therapeutic timing accuracy
 */
export function isTherapeuticTimingAccuracy(value: number): value is TherapeuticTimingAccuracy {
  return Math.abs(value) <= 50;
}

/**
 * Type guard for performance overhead validation
 */
export function isPerformanceOverhead(value: number): value is PerformanceOverhead {
  return value >= 0 && value <= 5;
}

/**
 * Type guard for healthcare context validation
 */
export function isHealthcareContext(context: any): context is HealthcareContext {
  return (
    typeof context === 'object' &&
    typeof context.isCrisisSession === 'boolean' &&
    typeof context.isTherapeuticSession === 'boolean' &&
    typeof context.isClinicalSession === 'boolean' &&
    typeof context.patientSafetyLevel === 'string'
  );
}

/**
 * Type guard for performance metric validation
 */
export function isPerformanceMetric(metric: any): metric is PerformanceMetric {
  return (
    typeof metric === 'object' &&
    typeof metric.id === 'string' &&
    typeof metric.category === 'string' &&
    typeof metric.priority === 'string' &&
    typeof metric.value === 'number' &&
    typeof metric.healthcareContext === 'object'
  );
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create crisis response time with validation
 */
export function createCrisisResponseTime(value: number): CrisisResponseTime {
  if (!isCrisisResponseTime(value)) {
    throw new Error(`Crisis response time must be ≤200ms, got ${value}ms`);
  }
  return value as CrisisResponseTime;
}

/**
 * Create therapeutic timing accuracy with validation
 */
export function createTherapeuticTimingAccuracy(value: number): TherapeuticTimingAccuracy {
  if (!isTherapeuticTimingAccuracy(value)) {
    throw new Error(`Therapeutic timing must be within ±50ms, got ${value}ms`);
  }
  return value as TherapeuticTimingAccuracy;
}

/**
 * Create performance overhead with validation
 */
export function createPerformanceOverhead(value: number): PerformanceOverhead {
  if (!isPerformanceOverhead(value)) {
    throw new Error(`Performance overhead must be ≤5%, got ${value}%`);
  }
  return value as PerformanceOverhead;
}

/**
 * Create healthcare context
 */
export function createHealthcareContext(
  isCrisisSession: boolean,
  isTherapeuticSession: boolean,
  isClinicalSession: boolean,
  patientSafetyLevel: RiskLevel
): HealthcareContext {
  return {
    isCrisisSession,
    isTherapeuticSession,
    isClinicalSession,
    requiresHighAccuracy: isClinicalSession,
    requiresLowLatency: isCrisisSession,
    requiresMemoryStability: isTherapeuticSession || isClinicalSession,
    patientSafetyLevel,
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Performance monitoring constants with healthcare requirements
 */
export const PERFORMANCE_MONITORING_CONSTANTS = {
  // Crisis response requirements
  CRISIS_RESPONSE_MAX_MS: 200,
  CRISIS_BUTTON_ACCESS_MAX_MS: 100,
  EMERGENCY_CALL_LATENCY_MAX_MS: 500,

  // Therapeutic timing requirements
  BREATHING_TIMING_TOLERANCE_MS: 50,
  MINDFULNESS_TIMING_TOLERANCE_MS: 100,
  THERAPEUTIC_SESSION_MAX_MEMORY_MB: 50,

  // Clinical accuracy requirements
  ASSESSMENT_CALCULATION_MAX_MS: 10,
  CLINICAL_DATA_INTEGRITY_THRESHOLD: 100, // 100% accuracy required

  // Performance overhead limits
  MONITORING_OVERHEAD_MAX_PERCENT: 5,
  MEMORY_MONITORING_OVERHEAD_MAX_PERCENT: 2,
  CPU_MONITORING_OVERHEAD_MAX_PERCENT: 3,

  // Frame rate requirements
  THERAPEUTIC_ANIMATION_MIN_FPS: 58,
  CRISIS_ANIMATION_MIN_FPS: 60,
  BREATHING_CIRCLE_TARGET_FPS: 60,

  // Memory management
  MEMORY_LEAK_DETECTION_THRESHOLD_MB: 10,
  THERAPEUTIC_SESSION_MEMORY_LIMIT_MB: 30,
  CRISIS_SESSION_MEMORY_LIMIT_MB: 20,

  // Alert thresholds
  PERFORMANCE_ALERT_RETENTION_HOURS: 24,
  SLA_VIOLATION_ESCALATION_COUNT: 3,
  CRITICAL_ALERT_IMMEDIATE_ESCALATION: true,

  // Migration validation targets
  MIGRATION_TOUCH_RESPONSE_IMPROVEMENT_TARGET: 25, // %
  MIGRATION_ANIMATION_IMPROVEMENT_TARGET: 20, // %
  MIGRATION_CRISIS_RESPONSE_IMPROVEMENT_TARGET: 60, // %
  MIGRATION_MEMORY_OPTIMIZATION_TARGET: 15, // %
  MIGRATION_BATTERY_OPTIMIZATION_TARGET: 10, // %
} as const;

/**
 * Healthcare compliance levels
 */
export const HEALTHCARE_COMPLIANCE_LEVELS = {
  FULL_COMPLIANCE: 'full',
  PARTIAL_COMPLIANCE: 'partial',
  COMPLIANCE_VIOLATION: 'violation',
  CRITICAL_FAILURE: 'critical_failure',
} as const;

/**
 * Performance monitoring priorities
 */
export const PERFORMANCE_PRIORITIES = {
  CRISIS: 'crisis',
  THERAPEUTIC: 'therapeutic',
  CLINICAL: 'clinical',
  GENERAL: 'general',
  BACKGROUND: 'background',
} as const;

/**
 * Type-safe performance monitoring system
 */
export type PerformanceMonitoringTypes = {
  PerformanceMetric: PerformanceMetric;
  PerformanceAlert: PerformanceAlert;
  SLAViolation: SLAViolation;
  HealthcareComplianceMonitor: HealthcareComplianceMonitor;
  RealTimeAnalyticsEngine: RealTimeAnalyticsEngine;
  PerformanceObserver: PerformanceObserver;
  TurboModuleMonitor: TurboModuleMonitor;
  MigrationValidationResult: MigrationValidationResult;
};