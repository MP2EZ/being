/**
 * TurboModule Performance Integration Types - Phase 4.3B Implementation
 *
 * Type-safe interfaces for TurboStoreManager and TurboModule performance monitoring
 * with healthcare compliance and crisis safety validation.
 *
 * INTEGRATION WITH PHASE 4.3A TYPES:
 * - TurboStoreManager type integration with monitoring
 * - AsyncStorageTurboModule monitoring type interfaces
 * - CalculationTurboModule performance validation types
 * - Crisis-first optimization type validation
 *
 * TURBOMODULE PERFORMANCE REQUIREMENTS:
 * - Module call latency must be <10ms for crisis operations
 * - State update propagation must be <25ms for therapeutic operations
 * - AsyncStorage operations must be <100ms for clinical data
 * - Memory usage must be tracked with leak detection
 */

import { Brand, DurationMs, UnixTimestamp, Percentage, MemoryBytes } from './core';
import { CrisisResponseTime, TherapeuticTimingAccuracy, PerformanceOverhead } from './performance-monitoring-types';
import { HealthcareContext, PerformanceMetric, PerformanceAlert } from './performance-monitoring-types';

// ============================================================================
// TURBOMODULE CORE TYPES
// ============================================================================

/**
 * TurboModule call latency with healthcare constraints
 */
export type TurboModuleCallLatency = Brand<number, 'TurboModuleLatency'> & {
  readonly _constraint: 'CRISIS_MAX_10MS_THERAPEUTIC_MAX_25MS';
};

/**
 * TurboModule memory footprint tracking
 */
export type TurboModuleMemoryFootprint = MemoryBytes & {
  readonly _metadata: {
    moduleId: string;
    baseline: number;
    currentUsage: number;
    peakUsage: number;
    leakDetected: boolean;
  };
};

/**
 * TurboModule operation type classification
 */
export type TurboModuleOperationType =
  | 'crisis_data_read'      // Emergency data access
  | 'crisis_data_write'     // Emergency data storage
  | 'therapeutic_read'      // MBCT session data access
  | 'therapeutic_write'     // MBCT session data storage
  | 'clinical_calculation'  // PHQ-9/GAD-7 scoring
  | 'clinical_validation'   // Assessment data validation
  | 'general_storage'       // Standard app data
  | 'cache_operation'       // Performance optimization
  | 'encryption_operation'  // Security processing
  | 'compression_operation'; // Data optimization

/**
 * TurboModule performance tier
 */
export type TurboModulePerformanceTier =
  | 'critical'    // Crisis response modules (≤10ms)
  | 'high'        // Therapeutic modules (≤25ms)
  | 'standard'    // Clinical modules (≤50ms)
  | 'background'; // Non-critical modules (≤100ms)

// ============================================================================
// TURBOSTORE MANAGER INTEGRATION TYPES
// ============================================================================

/**
 * TurboStore operation with healthcare context
 */
export interface TurboStoreOperation {
  readonly operationId: string;
  readonly timestamp: UnixTimestamp;
  readonly moduleId: string;
  readonly operationType: TurboModuleOperationType;
  readonly performanceTier: TurboModulePerformanceTier;
  readonly dataSize: number;
  readonly startTime: UnixTimestamp;
  readonly endTime?: UnixTimestamp;
  readonly latency?: TurboModuleCallLatency;
  readonly success: boolean;
  readonly error?: string;
  readonly healthcareContext: HealthcareContext;
  readonly complianceMetadata: {
    readonly isHealthcareData: boolean;
    readonly requiresEncryption: boolean;
    readonly requiresAuditLog: boolean;
    readonly isCrisisCritical: boolean;
  };
}

/**
 * TurboStore performance metrics aggregation
 */
export interface TurboStorePerformanceMetrics {
  readonly storeId: string;
  readonly moduleId: string;
  readonly timeWindow: {
    readonly start: UnixTimestamp;
    readonly end: UnixTimestamp;
  };
  readonly operationCounts: ReadonlyMap<TurboModuleOperationType, number>;
  readonly averageLatencies: ReadonlyMap<TurboModuleOperationType, TurboModuleCallLatency>;
  readonly memoryMetrics: {
    readonly baseline: TurboModuleMemoryFootprint;
    readonly current: TurboModuleMemoryFootprint;
    readonly peak: TurboModuleMemoryFootprint;
    readonly growthRate: number; // bytes/second
    readonly leakDetected: boolean;
  };
  readonly errorRates: ReadonlyMap<TurboModuleOperationType, Percentage>;
  readonly complianceMetrics: {
    readonly crisisResponseCompliance: Percentage;
    readonly therapeuticTimingCompliance: Percentage;
    readonly clinicalAccuracyCompliance: Percentage;
    readonly encryptionCompliance: Percentage;
  };
}

/**
 * TurboStore health status
 */
export interface TurboStoreHealthStatus {
  readonly storeId: string;
  readonly lastUpdated: UnixTimestamp;
  readonly overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  readonly performanceScore: Percentage;
  readonly healthcareCompliance: boolean;
  readonly activeIssues: ReadonlyArray<TurboStoreIssue>;
  readonly recommendedActions: ReadonlyArray<string>;
  readonly slaViolations: ReadonlyArray<TurboStoreSLAViolation>;
}

/**
 * TurboStore issue tracking
 */
export interface TurboStoreIssue {
  readonly issueId: string;
  readonly timestamp: UnixTimestamp;
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly category: 'performance' | 'memory' | 'compliance' | 'security';
  readonly description: string;
  readonly affectedOperations: ReadonlyArray<TurboModuleOperationType>;
  readonly healthcareImpact: {
    readonly affectsCrisisResponse: boolean;
    readonly affectsTherapeuticOutcome: boolean;
    readonly affectsClinicalAccuracy: boolean;
  };
  readonly resolutionStrategy: string;
  readonly autoResolvable: boolean;
}

/**
 * TurboStore SLA violation
 */
export interface TurboStoreSLAViolation {
  readonly violationId: string;
  readonly timestamp: UnixTimestamp;
  readonly operationType: TurboModuleOperationType;
  readonly expectedLatency: TurboModuleCallLatency;
  readonly actualLatency: TurboModuleCallLatency;
  readonly violationPercentage: Percentage;
  readonly healthcareImpact: 'none' | 'minor' | 'moderate' | 'severe' | 'critical';
  readonly escalationRequired: boolean;
  readonly resolutionTime?: UnixTimestamp;
}

// ============================================================================
// ASYNCSTORAGE TURBOMODULE TYPES
// ============================================================================

/**
 * AsyncStorage TurboModule operation tracking
 */
export interface AsyncStorageTurboModuleOperation {
  readonly operationId: string;
  readonly operation: 'getItem' | 'setItem' | 'removeItem' | 'getAllKeys' | 'multiGet' | 'multiSet' | 'multiRemove';
  readonly key?: string;
  readonly keys?: ReadonlyArray<string>;
  readonly dataSize: number;
  readonly isHealthcareData: boolean;
  readonly encryptionRequired: boolean;
  readonly startTime: UnixTimestamp;
  readonly endTime?: UnixTimestamp;
  readonly latency?: DurationMs;
  readonly success: boolean;
  readonly error?: string;
  readonly cacheHit?: boolean;
  readonly compressionUsed?: boolean;
  readonly healthcareContext: HealthcareContext;
}

/**
 * AsyncStorage performance monitoring
 */
export interface AsyncStoragePerformanceMonitor {
  readonly monitorId: string;
  readonly isActive: boolean;
  readonly operations: ReadonlyArray<AsyncStorageTurboModuleOperation>;
  readonly metrics: {
    readonly averageReadLatency: DurationMs;
    readonly averageWriteLatency: DurationMs;
    readonly cacheHitRate: Percentage;
    readonly errorRate: Percentage;
    readonly storageUtilization: Percentage;
    readonly encryptionOverhead: DurationMs;
    readonly compressionRatio: Percentage;
  };
  readonly healthcareMetrics: {
    readonly crisisDataAccessTime: DurationMs;
    readonly therapeuticDataPersistenceTime: DurationMs;
    readonly clinicalDataIntegrityScore: Percentage;
    readonly auditLogCompleteness: Percentage;
  };
  trackOperation(operation: AsyncStorageTurboModuleOperation): Promise<void>;
  getPerformanceReport(): Promise<AsyncStoragePerformanceReport>;
  validateHealthcareCompliance(): Promise<boolean>;
}

/**
 * AsyncStorage performance report
 */
export interface AsyncStoragePerformanceReport {
  readonly reportId: string;
  readonly generatedAt: UnixTimestamp;
  readonly timeWindow: {
    readonly start: UnixTimestamp;
    readonly end: UnixTimestamp;
  };
  readonly summary: {
    readonly totalOperations: number;
    readonly successRate: Percentage;
    readonly averageLatency: DurationMs;
    readonly peakLatency: DurationMs;
    readonly storageEfficiency: Percentage;
  };
  readonly healthcareMetrics: {
    readonly crisisDataAccessCompliance: boolean;
    readonly therapeuticDataPersistenceCompliance: boolean;
    readonly clinicalDataIntegrityMaintained: boolean;
    readonly encryptionCompliance: boolean;
  };
  readonly recommendations: ReadonlyArray<string>;
  readonly issues: ReadonlyArray<TurboStoreIssue>;
}

// ============================================================================
// CALCULATION TURBOMODULE TYPES
// ============================================================================

/**
 * Clinical calculation operation types
 */
export type ClinicalCalculationType =
  | 'phq9_scoring'          // PHQ-9 depression assessment
  | 'gad7_scoring'          // GAD-7 anxiety assessment
  | 'crisis_threshold'      // Crisis detection algorithm
  | 'mood_trend_analysis'   // Mood pattern analysis
  | 'therapeutic_progress'  // MBCT progress calculation
  | 'risk_assessment'       // User risk level calculation
  | 'compliance_validation' // Data validation checks
  | 'anonymization'         // Data privacy processing
  | 'encryption_keygen'     // Security key generation
  | 'audit_hash_calc';      // Audit trail hashing

/**
 * Calculation TurboModule operation
 */
export interface CalculationTurboModuleOperation {
  readonly operationId: string;
  readonly calculationType: ClinicalCalculationType;
  readonly inputSize: number;
  readonly complexity: 'low' | 'medium' | 'high' | 'critical';
  readonly accuracyRequired: Percentage; // 100% for clinical calculations
  readonly startTime: UnixTimestamp;
  readonly endTime?: UnixTimestamp;
  readonly calculationLatency?: DurationMs;
  readonly memoryUsed: MemoryBytes;
  readonly result: {
    readonly success: boolean;
    readonly value?: number | string | object;
    readonly confidence: Percentage;
    readonly validated: boolean;
    readonly error?: string;
  };
  readonly healthcareContext: HealthcareContext;
  readonly auditTrail: {
    readonly inputHash: string;
    readonly outputHash: string;
    readonly algorithmVersion: string;
    readonly validationSteps: ReadonlyArray<string>;
  };
}

/**
 * Calculation performance validator
 */
export interface CalculationPerformanceValidator {
  readonly validatorId: string;
  readonly calculationType: ClinicalCalculationType;
  readonly isActive: boolean;
  readonly accuracyThreshold: Percentage;
  readonly latencyThreshold: DurationMs;
  readonly memoryThreshold: MemoryBytes;
  validateOperation(operation: CalculationTurboModuleOperation): Promise<CalculationValidationResult>;
  validateAccuracy(expected: any, actual: any): boolean;
  generatePerformanceReport(): Promise<CalculationPerformanceReport>;
}

/**
 * Calculation validation result
 */
export interface CalculationValidationResult {
  readonly validationId: string;
  readonly timestamp: UnixTimestamp;
  readonly operation: CalculationTurboModuleOperation;
  readonly accuracyValidation: {
    readonly passed: boolean;
    readonly expectedAccuracy: Percentage;
    readonly actualAccuracy: Percentage;
    readonly deviationFromTarget: number;
  };
  readonly performanceValidation: {
    readonly latencyWithinThreshold: boolean;
    readonly memoryWithinThreshold: boolean;
    readonly noMemoryLeaks: boolean;
  };
  readonly healthcareCompliance: {
    readonly clinicalAccuracyMaintained: boolean;
    readonly auditTrailComplete: boolean;
    readonly dataIntegrityVerified: boolean;
  };
  readonly issues: ReadonlyArray<CalculationIssue>;
  readonly recommendations: ReadonlyArray<string>;
}

/**
 * Calculation performance issue
 */
export interface CalculationIssue {
  readonly issueId: string;
  readonly severity: 'warning' | 'error' | 'critical';
  readonly type: 'accuracy' | 'performance' | 'compliance' | 'security';
  readonly description: string;
  readonly healthcareImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  readonly resolutionRequired: boolean;
  readonly resolutionStrategy?: string;
}

/**
 * Calculation performance report
 */
export interface CalculationPerformanceReport {
  readonly reportId: string;
  readonly generatedAt: UnixTimestamp;
  readonly calculationType: ClinicalCalculationType;
  readonly timeWindow: {
    readonly start: UnixTimestamp;
    readonly end: UnixTimestamp;
  };
  readonly metrics: {
    readonly totalCalculations: number;
    readonly accuracyRate: Percentage;
    readonly averageLatency: DurationMs;
    readonly memoryEfficiency: Percentage;
    readonly errorRate: Percentage;
  };
  readonly healthcareMetrics: {
    readonly clinicalAccuracyMaintained: boolean;
    readonly crisisDetectionReliability: Percentage;
    readonly therapeuticCalculationAccuracy: Percentage;
    readonly auditTrailCompleteness: Percentage;
  };
  readonly issues: ReadonlyArray<CalculationIssue>;
  readonly trends: {
    readonly accuracyTrend: 'improving' | 'stable' | 'degrading';
    readonly performanceTrend: 'improving' | 'stable' | 'degrading';
    readonly complianceTrend: 'improving' | 'stable' | 'degrading';
  };
  readonly recommendations: ReadonlyArray<string>;
}

// ============================================================================
// CRISIS-FIRST OPTIMIZATION TYPES
// ============================================================================

/**
 * Crisis optimization strategy
 */
export interface CrisisOptimizationStrategy {
  readonly strategyId: string;
  readonly strategyName: string;
  readonly priority: 'immediate' | 'high' | 'medium' | 'low';
  readonly targetLatency: CrisisResponseTime;
  readonly optimizationMethods: ReadonlyArray<CrisisOptimizationMethod>;
  readonly healthcareRequirements: {
    readonly maintainClinicalAccuracy: boolean;
    readonly maintainTherapeuticEffectiveness: boolean;
    readonly maintainDataIntegrity: boolean;
    readonly maintainAccessibility: boolean;
  };
  readonly expectedImprovement: Percentage;
  readonly implementationComplexity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Crisis optimization method
 */
export interface CrisisOptimizationMethod {
  readonly methodId: string;
  readonly methodName: string;
  readonly methodType: 'caching' | 'preloading' | 'compression' | 'algorithm' | 'memory' | 'threading';
  readonly targetOperations: ReadonlyArray<TurboModuleOperationType>;
  readonly expectedLatencyReduction: DurationMs;
  readonly memoryImpact: MemoryBytes;
  readonly cpuImpact: Percentage;
  readonly riskLevel: 'low' | 'medium' | 'high';
  readonly healthcareCompatible: boolean;
  readonly implementationSteps: ReadonlyArray<string>;
}

/**
 * Crisis performance optimization result
 */
export interface CrisisOptimizationResult {
  readonly optimizationId: string;
  readonly timestamp: UnixTimestamp;
  readonly strategy: CrisisOptimizationStrategy;
  readonly appliedMethods: ReadonlyArray<CrisisOptimizationMethod>;
  readonly performanceImpact: {
    readonly beforeLatency: CrisisResponseTime;
    readonly afterLatency: CrisisResponseTime;
    readonly improvementPercentage: Percentage;
    readonly targetAchieved: boolean;
  };
  readonly healthcareImpact: {
    readonly clinicalAccuracyMaintained: boolean;
    readonly therapeuticEffectivenessMaintained: boolean;
    readonly dataIntegrityMaintained: boolean;
    readonly accessibilityMaintained: boolean;
  };
  readonly systemImpact: {
    readonly memoryUsageChange: MemoryBytes;
    readonly cpuUsageChange: Percentage;
    readonly batteryImpactChange: Percentage;
    readonly storageUsageChange: MemoryBytes;
  };
  readonly regressionTests: ReadonlyArray<OptimizationRegressionTest>;
  readonly recommendations: ReadonlyArray<string>;
}

/**
 * Optimization regression test
 */
export interface OptimizationRegressionTest {
  readonly testId: string;
  readonly testName: string;
  readonly testType: 'performance' | 'functionality' | 'healthcare' | 'security';
  readonly passed: boolean;
  readonly actualValue: number;
  readonly expectedValue: number;
  readonly tolerance: number;
  readonly criticalFailure: boolean;
  readonly healthcareImplication?: string;
}

// ============================================================================
// TURBOMODULE MONITORING DASHBOARD TYPES
// ============================================================================

/**
 * TurboModule monitoring dashboard
 */
export interface TurboModuleMonitoringDashboard {
  readonly dashboardId: string;
  readonly lastUpdated: UnixTimestamp;
  readonly activeModules: ReadonlyArray<TurboModuleMonitoringEntry>;
  readonly systemHealth: {
    readonly overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    readonly performanceScore: Percentage;
    readonly healthcareCompliance: boolean;
    readonly crisisReadiness: boolean;
  };
  readonly alertSummary: {
    readonly criticalAlerts: number;
    readonly errorAlerts: number;
    readonly warningAlerts: number;
    readonly recentAlerts: ReadonlyArray<PerformanceAlert>;
  };
  readonly performanceSummary: {
    readonly averageLatency: TurboModuleCallLatency;
    readonly peakLatency: TurboModuleCallLatency;
    readonly memoryUsage: TurboModuleMemoryFootprint;
    readonly errorRate: Percentage;
    readonly throughput: number; // operations per second
  };
  readonly healthcareMetrics: {
    readonly crisisResponseCompliance: Percentage;
    readonly therapeuticTimingCompliance: Percentage;
    readonly clinicalAccuracyCompliance: Percentage;
    readonly dataIntegrityScore: Percentage;
  };
}

/**
 * TurboModule monitoring entry
 */
export interface TurboModuleMonitoringEntry {
  readonly moduleId: string;
  readonly moduleName: string;
  readonly moduleType: 'storage' | 'calculation' | 'networking' | 'ui' | 'security';
  readonly isActive: boolean;
  readonly healthStatus: 'healthy' | 'degraded' | 'critical' | 'offline';
  readonly performanceMetrics: TurboStorePerformanceMetrics;
  readonly healthcareCompliance: boolean;
  readonly lastActivity: UnixTimestamp;
  readonly activeOperations: number;
  readonly recentIssues: ReadonlyArray<TurboStoreIssue>;
}

// ============================================================================
// TYPE GUARDS AND VALIDATORS
// ============================================================================

/**
 * Type guard for TurboModule call latency
 */
export function isTurboModuleCallLatency(value: number, tier: TurboModulePerformanceTier): value is TurboModuleCallLatency {
  const thresholds = {
    critical: 10,    // Crisis operations
    high: 25,        // Therapeutic operations
    standard: 50,    // Clinical operations
    background: 100  // General operations
  };
  return value >= 0 && value <= thresholds[tier];
}

/**
 * Type guard for TurboStore operation validation
 */
export function isTurboStoreOperation(operation: any): operation is TurboStoreOperation {
  return (
    typeof operation === 'object' &&
    typeof operation.operationId === 'string' &&
    typeof operation.moduleId === 'string' &&
    typeof operation.operationType === 'string' &&
    typeof operation.performanceTier === 'string' &&
    typeof operation.healthcareContext === 'object'
  );
}

/**
 * Type guard for calculation operation validation
 */
export function isCalculationTurboModuleOperation(operation: any): operation is CalculationTurboModuleOperation {
  return (
    typeof operation === 'object' &&
    typeof operation.operationId === 'string' &&
    typeof operation.calculationType === 'string' &&
    typeof operation.accuracyRequired === 'number' &&
    operation.accuracyRequired === 100 // Clinical calculations require 100% accuracy
  );
}

/**
 * Type guard for healthcare compliance validation
 */
export function isTurboModuleHealthcareCompliant(metrics: TurboStorePerformanceMetrics): boolean {
  return (
    metrics.complianceMetrics.crisisResponseCompliance >= 95 &&
    metrics.complianceMetrics.therapeuticTimingCompliance >= 90 &&
    metrics.complianceMetrics.clinicalAccuracyCompliance === 100 &&
    metrics.complianceMetrics.encryptionCompliance === 100
  );
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create TurboModule call latency with tier validation
 */
export function createTurboModuleCallLatency(value: number, tier: TurboModulePerformanceTier): TurboModuleCallLatency {
  if (!isTurboModuleCallLatency(value, tier)) {
    const thresholds = { critical: 10, high: 25, standard: 50, background: 100 };
    throw new Error(`TurboModule latency for ${tier} tier must be ≤${thresholds[tier]}ms, got ${value}ms`);
  }
  return value as TurboModuleCallLatency;
}

/**
 * Create TurboStore operation with validation
 */
export function createTurboStoreOperation(
  operationId: string,
  moduleId: string,
  operationType: TurboModuleOperationType,
  performanceTier: TurboModulePerformanceTier,
  healthcareContext: HealthcareContext
): Omit<TurboStoreOperation, 'timestamp' | 'dataSize' | 'startTime' | 'success' | 'complianceMetadata'> {
  return {
    operationId,
    moduleId,
    operationType,
    performanceTier,
    healthcareContext,
  };
}

/**
 * Create calculation operation with accuracy validation
 */
export function createCalculationTurboModuleOperation(
  operationId: string,
  calculationType: ClinicalCalculationType,
  healthcareContext: HealthcareContext
): Omit<CalculationTurboModuleOperation, 'inputSize' | 'complexity' | 'startTime' | 'memoryUsed' | 'result' | 'auditTrail'> {
  return {
    operationId,
    calculationType,
    accuracyRequired: 100 as Percentage, // Clinical calculations require 100% accuracy
    healthcareContext,
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * TurboModule performance constants
 */
export const TURBO_MODULE_PERFORMANCE_CONSTANTS = {
  // Latency thresholds by tier
  CRITICAL_TIER_MAX_LATENCY_MS: 10,
  HIGH_TIER_MAX_LATENCY_MS: 25,
  STANDARD_TIER_MAX_LATENCY_MS: 50,
  BACKGROUND_TIER_MAX_LATENCY_MS: 100,

  // Memory thresholds
  MODULE_MEMORY_LEAK_THRESHOLD_MB: 5,
  MODULE_PEAK_MEMORY_LIMIT_MB: 20,
  CALCULATION_MEMORY_LIMIT_MB: 10,

  // Healthcare compliance requirements
  CRISIS_RESPONSE_COMPLIANCE_MIN: 95,   // %
  THERAPEUTIC_TIMING_COMPLIANCE_MIN: 90, // %
  CLINICAL_ACCURACY_REQUIRED: 100,      // %
  ENCRYPTION_COMPLIANCE_REQUIRED: 100,  // %

  // Performance monitoring
  MONITORING_OVERHEAD_MAX: 2,            // %
  ALERT_RETENTION_HOURS: 24,
  PERFORMANCE_REPORT_INTERVAL_MINUTES: 15,

  // AsyncStorage specific
  ASYNCSTORAGE_READ_TARGET_MS: 50,
  ASYNCSTORAGE_WRITE_TARGET_MS: 100,
  ASYNCSTORAGE_CACHE_HIT_TARGET: 80,     // %

  // Calculation specific
  PHQ9_CALCULATION_MAX_MS: 5,
  GAD7_CALCULATION_MAX_MS: 5,
  CRISIS_THRESHOLD_CALC_MAX_MS: 2,
  CALCULATION_ACCURACY_REQUIRED: 100,    // %
} as const;

/**
 * TurboModule operation priorities
 */
export const TURBO_MODULE_OPERATION_PRIORITIES = {
  CRISIS_DATA_READ: 'critical',
  CRISIS_DATA_WRITE: 'critical',
  THERAPEUTIC_READ: 'high',
  THERAPEUTIC_WRITE: 'high',
  CLINICAL_CALCULATION: 'high',
  CLINICAL_VALIDATION: 'high',
  GENERAL_STORAGE: 'standard',
  CACHE_OPERATION: 'background',
} as const;

/**
 * Healthcare compliance levels for TurboModules
 */
export const TURBO_MODULE_HEALTHCARE_COMPLIANCE = {
  FULL_COMPLIANCE: 'full',
  PARTIAL_COMPLIANCE: 'partial',
  NON_COMPLIANT: 'violation',
  CRITICAL_FAILURE: 'critical_failure',
} as const;

/**
 * Type-safe TurboModule performance system
 */
export type TurboModulePerformanceTypes = {
  TurboStoreOperation: TurboStoreOperation;
  TurboStorePerformanceMetrics: TurboStorePerformanceMetrics;
  AsyncStorageTurboModuleOperation: AsyncStorageTurboModuleOperation;
  CalculationTurboModuleOperation: CalculationTurboModuleOperation;
  CrisisOptimizationStrategy: CrisisOptimizationStrategy;
  TurboModuleMonitoringDashboard: TurboModuleMonitoringDashboard;
};