/**
 * Type-Safe Monitoring Implementation Types - Phase 4.3B Implementation
 *
 * Comprehensive TypeScript interfaces for implementing the performance monitoring system
 * with healthcare compliance, crisis safety, and therapeutic effectiveness validation.
 *
 * IMPLEMENTATION REQUIREMENTS:
 * - Type-safe monitoring interfaces for all monitoring components
 * - Healthcare compliance types ensuring crisis safety and therapeutic effectiveness
 * - Performance analytics types with real-time validation
 * - Integration types for seamless Phase 4.3A compatibility
 * - Migration validation types with comprehensive benefit analysis
 */

import { Brand, DurationMs, UnixTimestamp, ISODateString, Percentage, MemoryBytes } from './core';
import { CrisisSeverity, RiskLevel, HIPAACompliance } from './core';
import {
  PerformanceMetric,
  PerformanceAlert,
  SLAViolation,
  HealthcareComplianceMonitor,
  RealTimeAnalyticsEngine,
  PerformanceObserver,
  HealthcareContext,
  PerformanceMonitoringPriority,
  PerformanceMetricCategory,
  CrisisResponseTime,
  TherapeuticTimingAccuracy
} from './performance-monitoring-types';
import {
  TurboStoreOperation,
  TurboModuleMonitoringDashboard,
  CalculationTurboModuleOperation,
  CrisisOptimizationStrategy
} from './turbo-module-performance-types';

// ============================================================================
// MONITORING COORDINATOR IMPLEMENTATION TYPES
// ============================================================================

/**
 * Performance monitoring coordinator - central orchestration interface
 */
export interface PerformanceMonitoringCoordinator {
  readonly coordinatorId: string;
  readonly isActive: boolean;
  readonly startTime: UnixTimestamp;
  readonly configuration: MonitoringCoordinatorConfig;
  readonly activeMonitors: ReadonlyMap<string, PerformanceMonitor>;
  readonly healthcareComplianceMonitors: ReadonlyMap<string, HealthcareComplianceMonitor>;
  readonly realTimeEngine: RealTimeAnalyticsEngine;
  readonly alertManager: AlertManager;
  readonly slaManager: SLAManager;

  // Core coordination methods
  initialize(config: MonitoringCoordinatorConfig): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;

  // Monitor management
  registerMonitor(monitor: PerformanceMonitor): Promise<void>;
  unregisterMonitor(monitorId: string): Promise<void>;
  getMonitor(monitorId: string): PerformanceMonitor | null;
  getAllMonitors(): ReadonlyArray<PerformanceMonitor>;

  // Healthcare compliance coordination
  registerComplianceMonitor(monitor: HealthcareComplianceMonitor): Promise<void>;
  validateHealthcareCompliance(): Promise<HealthcareComplianceResult>;
  getComplianceStatus(): HealthcareComplianceStatus;

  // Real-time analytics coordination
  processMetric(metric: PerformanceMetric): Promise<void>;
  generateAlert(alert: PerformanceAlert): Promise<void>;
  recordSLAViolation(violation: SLAViolation): Promise<void>;

  // Integration methods
  integrateWithTurboModules(dashboard: TurboModuleMonitoringDashboard): Promise<void>;
  integrateWithTherapeuticValidator(validator: TherapeuticPerformanceValidator): Promise<void>;
  integrateWithCrisisMonitor(monitor: CrisisResponseMonitor): Promise<void>;

  // Reporting and analytics
  generatePerformanceReport(): Promise<PerformanceReport>;
  getHealthcareMetrics(): Promise<HealthcareMetrics>;
  getDashboardData(): Promise<MonitoringDashboardData>;
}

/**
 * Monitoring coordinator configuration
 */
export interface MonitoringCoordinatorConfig {
  readonly enableCrisisMonitoring: boolean;
  readonly enableTherapeuticTracking: boolean;
  readonly enableClinicalValidation: boolean;
  readonly enableMemoryMonitoring: boolean;
  readonly enablePerformanceOptimization: boolean;
  readonly samplingRate: Percentage;
  readonly reportingInterval: DurationMs;
  readonly alertRetentionPeriod: DurationMs;
  readonly healthcareComplianceMode: 'strict' | 'standard' | 'permissive';
  readonly crisisResponseSLA: CrisisResponseTime;
  readonly therapeuticTimingTolerance: TherapeuticTimingAccuracy;
  readonly memoryLeakThreshold: MemoryBytes;
  readonly storageSettings: MonitoringStorageConfig;
  readonly integrationSettings: MonitoringIntegrationConfig;
}

/**
 * Monitoring storage configuration
 */
export interface MonitoringStorageConfig {
  readonly enablePersistence: boolean;
  readonly storageBackend: 'memory' | 'asyncstorage' | 'file' | 'cloud';
  readonly encryptionEnabled: boolean;
  readonly compressionEnabled: boolean;
  readonly retentionPeriod: DurationMs;
  readonly maxStorageSize: MemoryBytes;
  readonly auditLoggingEnabled: boolean;
  readonly hipaaCompliance: HIPAACompliance;
}

/**
 * Monitoring integration configuration
 */
export interface MonitoringIntegrationConfig {
  readonly turboModuleIntegration: boolean;
  readonly therapeuticValidatorIntegration: boolean;
  readonly crisisMonitorIntegration: boolean;
  readonly realTimeAnalyticsIntegration: boolean;
  readonly cloudSyncIntegration: boolean;
  readonly webhookIntegration: boolean;
  readonly externalAPIsIntegration: boolean;
}

// ============================================================================
// PERFORMANCE MONITOR IMPLEMENTATIONS
// ============================================================================

/**
 * Core performance monitor interface
 */
export interface PerformanceMonitor {
  readonly monitorId: string;
  readonly monitorType: PerformanceMetricCategory;
  readonly priority: PerformanceMonitoringPriority;
  readonly isActive: boolean;
  readonly configuration: PerformanceMonitorConfig;
  readonly metrics: ReadonlyArray<PerformanceMetric>;
  readonly alerts: ReadonlyArray<PerformanceAlert>;
  readonly healthcareContext: HealthcareContext;

  // Core monitoring methods
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  reset(): Promise<void>;

  // Metric collection
  collectMetric(): Promise<PerformanceMetric>;
  processMetric(metric: PerformanceMetric): Promise<void>;
  validateMetric(metric: PerformanceMetric): boolean;

  // Alert generation
  checkAlertConditions(metric: PerformanceMetric): Promise<PerformanceAlert[]>;
  generateAlert(alertLevel: string, message: string): PerformanceAlert;

  // Healthcare compliance
  validateHealthcareCompliance(): Promise<boolean>;
  getHealthcareMetrics(): Promise<HealthcareMonitorMetrics>;

  // Reporting
  getStatus(): PerformanceMonitorStatus;
  generateReport(): Promise<PerformanceMonitorReport>;
}

/**
 * Performance monitor configuration
 */
export interface PerformanceMonitorConfig {
  readonly samplingInterval: DurationMs;
  readonly alertThresholds: AlertThresholds;
  readonly healthcareRequirements: HealthcareRequirements;
  readonly retentionPolicy: RetentionPolicy;
  readonly validationRules: ValidationRules;
}

/**
 * Alert thresholds for different levels
 */
export interface AlertThresholds {
  readonly info: number;
  readonly warning: number;
  readonly error: number;
  readonly critical: number;
  readonly emergency: number;
}

/**
 * Healthcare requirements for monitoring
 */
export interface HealthcareRequirements {
  readonly requiresCrisisSafety: boolean;
  readonly requiresTherapeuticCompliance: boolean;
  readonly requiresClinicalAccuracy: boolean;
  readonly requiresAccessibilityCompliance: boolean;
  readonly requiresHIPAACompliance: boolean;
  readonly requiresAuditLogging: boolean;
  readonly patientSafetyLevel: RiskLevel;
}

/**
 * Data retention policy
 */
export interface RetentionPolicy {
  readonly metricsRetentionPeriod: DurationMs;
  readonly alertsRetentionPeriod: DurationMs;
  readonly reportsRetentionPeriod: DurationMs;
  readonly auditLogsRetentionPeriod: DurationMs;
  readonly enableCompression: boolean;
  readonly enableArchiving: boolean;
}

/**
 * Validation rules for metrics
 */
export interface ValidationRules {
  readonly minValue?: number;
  readonly maxValue?: number;
  readonly allowedRange?: [number, number];
  readonly precision?: number;
  readonly customValidators?: ReadonlyArray<ValidationRule>;
}

/**
 * Custom validation rule
 */
export interface ValidationRule {
  readonly ruleId: string;
  readonly description: string;
  readonly validator: (value: any) => boolean;
  readonly errorMessage: string;
  readonly severity: 'warning' | 'error' | 'critical';
}

// ============================================================================
// SPECIALIZED MONITOR IMPLEMENTATIONS
// ============================================================================

/**
 * Crisis response monitor for <200ms SLA enforcement
 */
export interface CrisisResponseMonitor extends PerformanceMonitor {
  readonly monitorType: 'crisis_response';
  readonly crisisResponseSLA: CrisisResponseTime;
  readonly violationCount: number;
  readonly lastViolationTime?: UnixTimestamp;

  // Crisis-specific methods
  trackCrisisButtonPress(startTime: UnixTimestamp): Promise<void>;
  validateCrisisResponseTime(responseTime: DurationMs): boolean;
  recordSLAViolation(responseTime: DurationMs): Promise<void>;
  getCrisisComplianceRate(): Percentage;
  getEmergencyMetrics(): Promise<EmergencyMetrics>;

  // Emergency escalation
  triggerEmergencyEscalation(violation: SLAViolation): Promise<void>;
  validateEmergencyProtocols(): Promise<boolean>;
}

/**
 * Therapeutic performance monitor for MBCT compliance
 */
export interface TherapeuticPerformanceMonitor extends PerformanceMonitor {
  readonly monitorType: 'therapeutic_timing';
  readonly therapeuticSessions: ReadonlyArray<TherapeuticSession>;
  readonly mbctCompliance: boolean;
  readonly timingAccuracy: TherapeuticTimingAccuracy;

  // Therapeutic-specific methods
  startTherapeuticSession(sessionType: TherapeuticSessionType): Promise<string>;
  updateTherapeuticSession(sessionId: string, metrics: TherapeuticSessionMetrics): Promise<void>;
  completeTherapeuticSession(sessionId: string): Promise<TherapeuticSession>;
  validateBreathingTiming(target: DurationMs, actual: DurationMs): boolean;
  getMBCTComplianceMetrics(): Promise<MBCTComplianceMetrics>;

  // Therapeutic effectiveness
  calculateTherapeuticEffectiveness(session: TherapeuticSession): TherapeuticEffectiveness;
  validateTherapeuticOutcome(session: TherapeuticSession): boolean;
}

/**
 * Clinical accuracy monitor for 100% calculation validation
 */
export interface ClinicalAccuracyMonitor extends PerformanceMonitor {
  readonly monitorType: 'clinical_accuracy';
  readonly accuracyRequirement: Percentage; // Must be 100%
  readonly calculationHistory: ReadonlyArray<ClinicalCalculation>;
  readonly validationResults: ReadonlyArray<ClinicalValidationResult>;

  // Clinical-specific methods
  validateClinicalCalculation(calculation: ClinicalCalculation): Promise<ClinicalValidationResult>;
  trackAssessmentAccuracy(assessmentType: 'phq9' | 'gad7', calculation: ClinicalCalculation): Promise<void>;
  verifyDataIntegrity(data: ClinicalData): Promise<boolean>;
  getClinicalAccuracyMetrics(): Promise<ClinicalAccuracyMetrics>;

  // Audit and compliance
  generateAuditTrail(calculation: ClinicalCalculation): Promise<AuditTrail>;
  validateRegulatoryCompliance(): Promise<boolean>;
}

/**
 * Memory performance monitor for leak detection and optimization
 */
export interface MemoryPerformanceMonitor extends PerformanceMonitor {
  readonly monitorType: 'memory_management';
  readonly memoryBaseline: MemoryBytes;
  readonly currentMemoryUsage: MemoryBytes;
  readonly memoryGrowthRate: number; // bytes/second
  readonly leakDetected: boolean;

  // Memory-specific methods
  establishBaseline(): Promise<void>;
  trackMemoryUsage(): Promise<void>;
  detectMemoryLeaks(): Promise<ReadonlyArray<MemoryLeak>>;
  analyzeMemoryPatterns(): Promise<MemoryAnalysis>;
  getMemoryOptimizationRecommendations(): Promise<ReadonlyArray<MemoryOptimizationRecommendation>>;

  // Therapeutic session memory tracking
  trackTherapeuticSessionMemory(sessionId: string): Promise<void>;
  validateSessionMemoryStability(sessionId: string): Promise<boolean>;
}

// ============================================================================
// ALERT MANAGEMENT TYPES
// ============================================================================

/**
 * Alert manager for healthcare-appropriate alert handling
 */
export interface AlertManager {
  readonly managerId: string;
  readonly isActive: boolean;
  readonly activeAlerts: ReadonlyArray<PerformanceAlert>;
  readonly alertHistory: ReadonlyArray<PerformanceAlert>;
  readonly escalationRules: ReadonlyArray<AlertEscalationRule>;

  // Alert processing
  processAlert(alert: PerformanceAlert): Promise<void>;
  escalateAlert(alert: PerformanceAlert): Promise<void>;
  resolveAlert(alertId: string): Promise<void>;
  suppressAlert(alertId: string, duration: DurationMs): Promise<void>;

  // Alert routing
  routeAlert(alert: PerformanceAlert): Promise<AlertDestination[]>;
  notifyHealthcareStakeholders(alert: PerformanceAlert): Promise<void>;
  logAuditEntry(alert: PerformanceAlert): Promise<void>;

  // Configuration
  updateEscalationRules(rules: ReadonlyArray<AlertEscalationRule>): Promise<void>;
  configureNotificationChannels(channels: ReadonlyArray<NotificationChannel>): Promise<void>;
}

/**
 * Alert escalation rule
 */
export interface AlertEscalationRule {
  readonly ruleId: string;
  readonly alertCategory: PerformanceMetricCategory;
  readonly alertLevel: string;
  readonly escalationDelay: DurationMs;
  readonly escalationTarget: AlertDestination;
  readonly healthcareRequirements: {
    readonly requiresImmediateEscalation: boolean;
    readonly requiresHealthcareTeamNotification: boolean;
    readonly requiresRegulatoryNotification: boolean;
  };
  readonly conditions: ReadonlyArray<EscalationCondition>;
}

/**
 * Alert destination for routing
 */
export interface AlertDestination {
  readonly destinationId: string;
  readonly destinationType: 'email' | 'sms' | 'webhook' | 'dashboard' | 'audit_log' | 'regulatory_system';
  readonly address: string;
  readonly enabled: boolean;
  readonly healthcareRole?: 'clinician' | 'administrator' | 'compliance_officer' | 'it_support';
}

/**
 * Escalation condition
 */
export interface EscalationCondition {
  readonly conditionId: string;
  readonly conditionType: 'time_based' | 'count_based' | 'severity_based' | 'healthcare_impact';
  readonly threshold: number;
  readonly operator: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  readonly timeWindow?: DurationMs;
}

/**
 * Notification channel configuration
 */
export interface NotificationChannel {
  readonly channelId: string;
  readonly channelType: 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'teams';
  readonly isEnabled: boolean;
  readonly configuration: NotificationChannelConfig;
  readonly healthcareCompliance: {
    readonly hipaaCompliant: boolean;
    readonly encryptionRequired: boolean;
    readonly auditLoggingEnabled: boolean;
  };
}

/**
 * Notification channel configuration
 */
export interface NotificationChannelConfig {
  readonly endpoint?: string;
  readonly apiKey?: string;
  readonly template?: string;
  readonly retryPolicy?: RetryPolicy;
  readonly rateLimit?: RateLimit;
  readonly encryption?: EncryptionConfig;
}

// ============================================================================
// SLA MANAGEMENT TYPES
// ============================================================================

/**
 * SLA manager for healthcare performance requirements
 */
export interface SLAManager {
  readonly managerId: string;
  readonly isActive: boolean;
  readonly slaDefinitions: ReadonlyArray<SLADefinition>;
  readonly activeViolations: ReadonlyArray<SLAViolation>;
  readonly complianceHistory: ReadonlyArray<SLAComplianceRecord>;

  // SLA monitoring
  evaluateSLA(slaId: string, metric: PerformanceMetric): Promise<SLAEvaluationResult>;
  recordViolation(violation: SLAViolation): Promise<void>;
  resolveViolation(violationId: string): Promise<void>;
  getComplianceRate(slaId: string, timeWindow: TimeWindow): Promise<Percentage>;

  // Healthcare-specific SLA management
  validateCrisisResponseSLA(responseTime: DurationMs): Promise<boolean>;
  validateTherapeuticTimingSLA(timing: TherapeuticTimingAccuracy): Promise<boolean>;
  validateClinicalAccuracySLA(accuracy: Percentage): Promise<boolean>;

  // Reporting
  generateSLAReport(timeWindow: TimeWindow): Promise<SLAReport>;
  getHealthcareSLAMetrics(): Promise<HealthcareSLAMetrics>;
}

/**
 * SLA definition with healthcare context
 */
export interface SLADefinition {
  readonly slaId: string;
  readonly slaName: string;
  readonly slaType: 'crisis_response' | 'therapeutic_timing' | 'clinical_accuracy' | 'general_performance';
  readonly metricCategory: PerformanceMetricCategory;
  readonly targetValue: number;
  readonly operator: 'less_than' | 'greater_than' | 'equals' | 'within_range';
  readonly tolerance?: number;
  readonly timeWindow: DurationMs;
  readonly healthcareRequirements: {
    readonly isCrisisCritical: boolean;
    readonly isTherapeuticRelevant: boolean;
    readonly isClinicalAccuracyRequired: boolean;
    readonly patientSafetyImpact: RiskLevel;
  };
  readonly violationEscalation: AlertEscalationRule;
}

/**
 * SLA evaluation result
 */
export interface SLAEvaluationResult {
  readonly evaluationId: string;
  readonly timestamp: UnixTimestamp;
  readonly slaDefinition: SLADefinition;
  readonly metric: PerformanceMetric;
  readonly complianceStatus: 'compliant' | 'violation' | 'warning';
  readonly actualValue: number;
  readonly targetValue: number;
  readonly deviation: number;
  readonly healthcareImpact: {
    readonly affectsCrisisResponse: boolean;
    readonly affectsTherapeuticOutcome: boolean;
    readonly affectsClinicalAccuracy: boolean;
    readonly patientSafetyRisk: RiskLevel;
  };
}

/**
 * SLA compliance record
 */
export interface SLAComplianceRecord {
  readonly recordId: string;
  readonly timestamp: UnixTimestamp;
  readonly slaId: string;
  readonly complianceRate: Percentage;
  readonly timeWindow: TimeWindow;
  readonly violationCount: number;
  readonly totalEvaluations: number;
  readonly healthcareMetrics: {
    readonly crisisResponseCompliance: Percentage;
    readonly therapeuticTimingCompliance: Percentage;
    readonly clinicalAccuracyCompliance: Percentage;
  };
}

// ============================================================================
// HEALTHCARE COMPLIANCE TYPES
// ============================================================================

/**
 * Healthcare compliance result
 */
export interface HealthcareComplianceResult {
  readonly resultId: string;
  readonly timestamp: UnixTimestamp;
  readonly overallCompliance: boolean;
  readonly complianceScore: Percentage;
  readonly crisisResponseCompliance: boolean;
  readonly therapeuticComplianceScore: Percentage;
  readonly clinicalAccuracyCompliance: boolean;
  readonly accessibilityCompliance: boolean;
  readonly hipaaCompliance: boolean;
  readonly violations: ReadonlyArray<ComplianceViolation>;
  readonly recommendations: ReadonlyArray<ComplianceRecommendation>;
}

/**
 * Healthcare compliance status
 */
export interface HealthcareComplianceStatus {
  readonly statusId: string;
  readonly lastUpdated: UnixTimestamp;
  readonly isCompliant: boolean;
  readonly complianceLevel: 'full' | 'partial' | 'non_compliant' | 'under_review';
  readonly activeViolations: number;
  readonly riskLevel: RiskLevel;
  readonly nextReviewDate: UnixTimestamp;
  readonly certificationStatus: 'valid' | 'expired' | 'pending' | 'revoked';
}

/**
 * Compliance violation
 */
export interface ComplianceViolation {
  readonly violationId: string;
  readonly timestamp: UnixTimestamp;
  readonly violationType: 'timing' | 'accuracy' | 'safety' | 'accessibility' | 'privacy' | 'regulatory';
  readonly severity: 'minor' | 'moderate' | 'severe' | 'critical';
  readonly description: string;
  readonly affectedComponent: string;
  readonly healthcareImpact: {
    readonly patientSafety: RiskLevel;
    readonly therapeuticOutcome: RiskLevel;
    readonly clinicalAccuracy: RiskLevel;
    readonly regulatoryCompliance: RiskLevel;
  };
  readonly resolutionStatus: 'open' | 'in_progress' | 'resolved' | 'deferred';
  readonly resolutionDeadline?: UnixTimestamp;
  readonly assignedTo?: string;
}

/**
 * Compliance recommendation
 */
export interface ComplianceRecommendation {
  readonly recommendationId: string;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly category: 'performance' | 'safety' | 'accuracy' | 'accessibility' | 'regulatory';
  readonly title: string;
  readonly description: string;
  readonly implementationSteps: ReadonlyArray<string>;
  readonly expectedBenefit: string;
  readonly estimatedEffort: 'minimal' | 'moderate' | 'significant' | 'major';
  readonly implementationDeadline?: UnixTimestamp;
  readonly healthcareJustification: string;
  readonly regulatoryReferences?: ReadonlyArray<string>;
}

// ============================================================================
// REPORTING AND ANALYTICS TYPES
// ============================================================================

/**
 * Performance report with healthcare context
 */
export interface PerformanceReport {
  readonly reportId: string;
  readonly generatedAt: UnixTimestamp;
  readonly reportType: 'summary' | 'detailed' | 'healthcare_compliance' | 'regulatory';
  readonly timeWindow: TimeWindow;
  readonly executiveSummary: string;
  readonly performanceMetrics: PerformanceReportMetrics;
  readonly healthcareMetrics: HealthcareMetrics;
  readonly complianceStatus: HealthcareComplianceStatus;
  readonly recommendations: ReadonlyArray<ComplianceRecommendation>;
  readonly actionItems: ReadonlyArray<ActionItem>;
}

/**
 * Performance report metrics
 */
export interface PerformanceReportMetrics {
  readonly overallPerformanceScore: Percentage;
  readonly crisisResponseMetrics: CrisisResponseMetrics;
  readonly therapeuticPerformanceMetrics: TherapeuticPerformanceMetrics;
  readonly clinicalAccuracyMetrics: ClinicalAccuracyMetrics;
  readonly memoryPerformanceMetrics: MemoryPerformanceMetrics;
  readonly slaComplianceMetrics: SLAComplianceMetrics;
  readonly alertSummary: AlertSummary;
}

/**
 * Healthcare metrics aggregation
 */
export interface HealthcareMetrics {
  readonly patientSafetyScore: Percentage;
  readonly therapeuticEffectivenessScore: Percentage;
  readonly clinicalAccuracyScore: Percentage;
  readonly accessibilityComplianceScore: Percentage;
  readonly hipaaComplianceScore: Percentage;
  readonly regulatoryComplianceScore: Percentage;
  readonly riskAssessment: RiskAssessment;
  readonly improvementAreas: ReadonlyArray<ImprovementArea>;
}

/**
 * Time window for analysis
 */
export interface TimeWindow {
  readonly start: UnixTimestamp;
  readonly end: UnixTimestamp;
  readonly duration: DurationMs;
  readonly intervalSize?: DurationMs;
}

/**
 * Risk assessment
 */
export interface RiskAssessment {
  readonly overallRisk: RiskLevel;
  readonly patientSafetyRisk: RiskLevel;
  readonly therapeuticOutcomeRisk: RiskLevel;
  readonly clinicalAccuracyRisk: RiskLevel;
  readonly regulatoryComplianceRisk: RiskLevel;
  readonly riskFactors: ReadonlyArray<RiskFactor>;
  readonly mitigationStrategies: ReadonlyArray<MitigationStrategy>;
}

/**
 * Improvement area identification
 */
export interface ImprovementArea {
  readonly areaId: string;
  readonly category: PerformanceMetricCategory;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly currentPerformance: Percentage;
  readonly targetPerformance: Percentage;
  readonly improvementPotential: Percentage;
  readonly estimatedTimeline: DurationMs;
  readonly requiredResources: ReadonlyArray<string>;
  readonly healthcareBenefit: string;
}

/**
 * Action item for implementation
 */
export interface ActionItem {
  readonly itemId: string;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly category: 'immediate' | 'short_term' | 'long_term';
  readonly title: string;
  readonly description: string;
  readonly assignee?: string;
  readonly dueDate?: UnixTimestamp;
  readonly estimatedEffort: 'minimal' | 'moderate' | 'significant' | 'major';
  readonly healthcareImpact: string;
  readonly successCriteria: ReadonlyArray<string>;
  readonly dependencies: ReadonlyArray<string>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Risk factor identification
 */
export interface RiskFactor {
  readonly factorId: string;
  readonly description: string;
  readonly likelihood: 'low' | 'medium' | 'high';
  readonly impact: RiskLevel;
  readonly category: 'technical' | 'operational' | 'regulatory' | 'clinical';
}

/**
 * Mitigation strategy
 */
export interface MitigationStrategy {
  readonly strategyId: string;
  readonly description: string;
  readonly targetRisk: RiskFactor;
  readonly effectiveness: Percentage;
  readonly implementationCost: 'low' | 'medium' | 'high';
  readonly timeline: DurationMs;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  readonly maxRetries: number;
  readonly backoffStrategy: 'linear' | 'exponential' | 'fixed';
  readonly initialDelay: DurationMs;
  readonly maxDelay: DurationMs;
  readonly retryConditions: ReadonlyArray<string>;
}

/**
 * Rate limiting configuration
 */
export interface RateLimit {
  readonly requestsPerSecond: number;
  readonly burstSize: number;
  readonly windowSize: DurationMs;
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  readonly algorithm: string;
  readonly keySize: number;
  readonly enableInTransit: boolean;
  readonly enableAtRest: boolean;
}

/**
 * Monitoring dashboard data aggregation
 */
export interface MonitoringDashboardData {
  readonly dashboardId: string;
  readonly lastUpdated: UnixTimestamp;
  readonly systemHealth: SystemHealth;
  readonly performanceSummary: PerformanceSummary;
  readonly healthcareMetrics: HealthcareMetrics;
  readonly alertSummary: AlertSummary;
  readonly slaStatus: SLAStatus;
  readonly activeIssues: ReadonlyArray<SystemIssue>;
  readonly recommendations: ReadonlyArray<string>;
}

/**
 * System health overview
 */
export interface SystemHealth {
  readonly overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  readonly performanceScore: Percentage;
  readonly availabilityScore: Percentage;
  readonly reliabilityScore: Percentage;
  readonly healthcareComplianceScore: Percentage;
  readonly lastHealthCheck: UnixTimestamp;
}

/**
 * Performance summary aggregation
 */
export interface PerformanceSummary {
  readonly averageResponseTime: DurationMs;
  readonly peakResponseTime: DurationMs;
  readonly throughput: number;
  readonly errorRate: Percentage;
  readonly availabilityUptime: Percentage;
  readonly memoryUsage: MemoryBytes;
  readonly cpuUtilization: Percentage;
}

/**
 * Alert summary for dashboard
 */
export interface AlertSummary {
  readonly totalActiveAlerts: number;
  readonly criticalAlerts: number;
  readonly errorAlerts: number;
  readonly warningAlerts: number;
  readonly recentAlerts: ReadonlyArray<PerformanceAlert>;
  readonly alertTrend: 'increasing' | 'stable' | 'decreasing';
}

/**
 * SLA status overview
 */
export interface SLAStatus {
  readonly overallCompliance: Percentage;
  readonly crisisResponseCompliance: Percentage;
  readonly therapeuticTimingCompliance: Percentage;
  readonly clinicalAccuracyCompliance: Percentage;
  readonly activeViolations: number;
  readonly violationTrend: 'improving' | 'stable' | 'degrading';
}

/**
 * System issue tracking
 */
export interface SystemIssue {
  readonly issueId: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly category: 'performance' | 'availability' | 'compliance' | 'security';
  readonly description: string;
  readonly detectedAt: UnixTimestamp;
  readonly status: 'open' | 'investigating' | 'resolved' | 'deferred';
  readonly healthcareImpact: RiskLevel;
  readonly estimatedResolutionTime?: DurationMs;
}

/**
 * Type-safe monitoring implementation system
 */
export type MonitoringImplementationTypes = {
  PerformanceMonitoringCoordinator: PerformanceMonitoringCoordinator;
  PerformanceMonitor: PerformanceMonitor;
  CrisisResponseMonitor: CrisisResponseMonitor;
  TherapeuticPerformanceMonitor: TherapeuticPerformanceMonitor;
  ClinicalAccuracyMonitor: ClinicalAccuracyMonitor;
  MemoryPerformanceMonitor: MemoryPerformanceMonitor;
  AlertManager: AlertManager;
  SLAManager: SLAManager;
  PerformanceReport: PerformanceReport;
  HealthcareMetrics: HealthcareMetrics;
  MonitoringDashboardData: MonitoringDashboardData;
};