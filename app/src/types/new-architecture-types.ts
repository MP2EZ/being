/**
 * Type-Safe React Native New Architecture Implementation
 * For Being. MBCT App - Clinical Accuracy Required
 *
 * This file provides type-safe interfaces for React Native New Architecture
 * features with clinical-grade accuracy requirements for mental health applications.
 *
 * CRITICAL: All performance metrics must maintain therapeutic timing standards:
 * - Crisis button response: <200ms
 * - Breathing animation: 60fps (16.67ms frame time)
 * - Assessment transitions: <300ms
 */

// === CORE NEW ARCHITECTURE DETECTION TYPES ===

export interface ArchitectureDetectionResult {
  readonly isNewArchitecture: boolean;
  readonly isFabric: boolean;
  readonly isTurboModules: boolean;
  readonly isHermes: boolean;
  readonly details: ArchitectureDetails;
  readonly performance: PerformanceMetrics;
  readonly clinicalCompliance: ClinicalComplianceCheck;
}

export interface ArchitectureDetails {
  readonly fabricUIManager: boolean;
  readonly turboModuleProxy: boolean;
  readonly hermesEngine: boolean;
  readonly reactNativeVersion: string;
  readonly expoVersion: string;
  readonly jsEngine: 'hermes' | 'jsc' | 'v8' | 'unknown';
  readonly platform: 'ios' | 'android' | 'web';
  readonly buildType: 'development' | 'production';
}

// === CLINICAL PERFORMANCE REQUIREMENTS ===

export interface ClinicalPerformanceRequirements {
  readonly crisisButtonResponseMs: 200;
  readonly assessmentTransitionMs: 300;
  readonly breathingAnimationFps: 60;
  readonly frameTimeMs: 16.67;
  readonly appLaunchMs: 2000;
  readonly checkInFlowMs: 500;
}

export interface PerformanceMetrics {
  readonly frameRate: number;
  readonly averageFrameTime: number;
  readonly droppedFrames: number;
  readonly memoryUsageMB: number;
  readonly cpuUsagePercent: number;
  readonly renderTime: number;
  readonly jsThreadUsage: number;
  readonly uiThreadUsage: number;
  readonly bridgeUsage: number;
  readonly meetsClinicalStandards: boolean;
}

// === CLINICAL COMPLIANCE VALIDATION ===

export interface ClinicalComplianceCheck {
  readonly crisisResponseReady: boolean;
  readonly assessmentAccuracy: boolean;
  readonly therapeuticTiming: boolean;
  readonly dataEncryption: boolean;
  readonly offlineCapability: boolean;
  readonly accessibilityCompliant: boolean;
  readonly overallCompliance: 'compliant' | 'warning' | 'non-compliant';
  readonly issues: readonly ComplianceIssue[];
}

export interface ComplianceIssue {
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly component: string;
  readonly description: string;
  readonly clinicalImpact: string;
  readonly mitigation: string;
}

// === NEW ARCHITECTURE FEATURE DETECTION ===

export interface NewArchitectureFeatures {
  readonly fabric: FabricFeatures;
  readonly turboModules: TurboModuleFeatures;
  readonly hermes: HermesFeatures;
  readonly codegen: CodegenFeatures;
}

export interface FabricFeatures {
  readonly enabled: boolean;
  readonly renderer: 'fabric' | 'legacy';
  readonly concurrentFeatures: boolean;
  readonly suspenseSupport: boolean;
  readonly synchronousStateUpdates: boolean;
  readonly performanceGains: PerformanceGains;
}

export interface TurboModuleFeatures {
  readonly enabled: boolean;
  readonly synchronousAccess: boolean;
  readonly codeSharing: boolean;
  readonly typeScriptSupport: boolean;
  readonly performanceImpact: PerformanceImpact;
}

export interface HermesFeatures {
  readonly enabled: boolean;
  readonly version: string;
  readonly bytecodeCaching: boolean;
  readonly staticAnalysis: boolean;
  readonly memoryOptimization: boolean;
  readonly startupTime: number;
}

export interface CodegenFeatures {
  readonly enabled: boolean;
  readonly typeSafety: boolean;
  readonly staticTyping: boolean;
  readonly compileTimeValidation: boolean;
}

// === PERFORMANCE ANALYSIS TYPES ===

export interface PerformanceGains {
  readonly renderingImprovement: number; // percentage
  readonly memoryReduction: number; // percentage
  readonly startupTimeImprovement: number; // percentage
  readonly frameRateStability: number; // 0-1 scale
}

export interface PerformanceImpact {
  readonly bridgeCallReduction: number; // percentage
  readonly serialization: 'none' | 'minimal' | 'significant';
  readonly threadUtilization: ThreadUtilization;
}

export interface ThreadUtilization {
  readonly jsThread: number; // 0-100 percentage
  readonly uiThread: number; // 0-100 percentage
  readonly backgroundThreads: number; // 0-100 percentage
}

// === DEPENDENCY COMPATIBILITY ANALYSIS ===

export interface DependencyCompatibility {
  readonly reactNative: DependencyCheck;
  readonly expo: DependencyCheck;
  readonly libraries: readonly LibraryCompatibility[];
  readonly overall: CompatibilityStatus;
}

export interface DependencyCheck {
  readonly version: string;
  readonly compatible: boolean;
  readonly newArchSupport: 'full' | 'partial' | 'none';
  readonly migrationRequired: boolean;
  readonly clinicalRisk: 'none' | 'low' | 'medium' | 'high';
}

export interface LibraryCompatibility {
  readonly name: string;
  readonly version: string;
  readonly newArchCompatible: boolean;
  readonly fabricSupport: boolean;
  readonly turboModuleSupport: boolean;
  readonly clinicallyRequired: boolean;
  readonly migrationPath: string | null;
  readonly riskAssessment: LibraryRisk;
}

export interface LibraryRisk {
  readonly level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly clinicalImpact: string;
  readonly mitigation: string;
  readonly timelineWeeks: number;
}

export type CompatibilityStatus = 'ready' | 'migration-needed' | 'incompatible';

// === GLOBAL TYPE DECLARATIONS ===

declare global {
  interface Global {
    nativeFabricUIManager?: unknown;
    __turboModuleProxy?: unknown;
  }
}

// === TYPE GUARDS FOR ARCHITECTURE DETECTION ===

export type ArchitectureTypeGuard<T> = (value: unknown) => value is T;

export const isNewArchitectureEnabled: ArchitectureTypeGuard<boolean> = (
  value: unknown
): value is boolean => {
  return typeof value === 'boolean' &&
         typeof (global as any).nativeFabricUIManager !== 'undefined';
};

export const isFabricRenderer: ArchitectureTypeGuard<boolean> = (
  value: unknown
): value is boolean => {
  return typeof value === 'boolean' &&
         !!(global as any).nativeFabricUIManager;
};

export const isTurboModulesEnabled: ArchitectureTypeGuard<boolean> = (
  value: unknown
): value is boolean => {
  return typeof value === 'boolean' &&
         !!(global as any).__turboModuleProxy;
};

export const isHermesEngine: ArchitectureTypeGuard<boolean> = (
  value: unknown
): value is boolean => {
  return typeof value === 'boolean' &&
         typeof HermesInternal === 'object' &&
         HermesInternal !== null;
};

// === CLINICAL VALIDATION INTERFACES ===

export interface ClinicalArchitectureValidator {
  readonly validateCrisisResponseTiming: (metrics: PerformanceMetrics) => boolean;
  readonly validateBreathingAnimation: (metrics: PerformanceMetrics) => boolean;
  readonly validateAssessmentTransitions: (metrics: PerformanceMetrics) => boolean;
  readonly validateDataSecurity: (features: NewArchitectureFeatures) => boolean;
  readonly validateOfflineCapability: (features: NewArchitectureFeatures) => boolean;
  readonly generateComplianceReport: (result: ArchitectureDetectionResult) => ClinicalComplianceReport;
}

export interface ClinicalComplianceReport {
  readonly timestamp: string;
  readonly architectureVersion: string;
  readonly clinicalRequirements: ClinicalRequirement[];
  readonly performanceBaselines: PerformanceBaseline[];
  readonly riskAssessment: ClinicalRiskAssessment;
  readonly recommendations: Recommendation[];
}

export interface ClinicalRequirement {
  readonly id: string;
  readonly description: string;
  readonly status: 'met' | 'partial' | 'not-met';
  readonly measuredValue: number;
  readonly requiredValue: number;
  readonly clinicalImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceBaseline {
  readonly metric: string;
  readonly currentValue: number;
  readonly targetValue: number;
  readonly tolerance: number;
  readonly therapeuticRelevance: string;
}

export interface ClinicalRiskAssessment {
  readonly overallRisk: 'low' | 'medium' | 'high' | 'critical';
  readonly riskFactors: RiskFactor[];
  readonly mitigationStrategies: MitigationStrategy[];
  readonly timelineRecommendation: string;
}

export interface RiskFactor {
  readonly category: 'performance' | 'compatibility' | 'security' | 'clinical';
  readonly description: string;
  readonly likelihood: 'low' | 'medium' | 'high';
  readonly impact: 'low' | 'medium' | 'high' | 'critical';
  readonly affectedFeatures: string[];
}

export interface MitigationStrategy {
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly implementation: string;
  readonly timeframe: string;
  readonly resourcesRequired: string[];
}

export interface Recommendation {
  readonly type: 'immediate' | 'short-term' | 'long-term';
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly rationale: string;
  readonly implementation: string;
  readonly expectedBenefit: string;
}

// === MIGRATION PATH TYPES ===

export interface MigrationPlan {
  readonly currentState: ArchitectureState;
  readonly targetState: ArchitectureState;
  readonly phases: MigrationPhase[];
  readonly timeline: MigrationTimeline;
  readonly riskMitigation: RiskMitigation;
}

export interface ArchitectureState {
  readonly fabricEnabled: boolean;
  readonly turboModulesEnabled: boolean;
  readonly hermesEnabled: boolean;
  readonly librariesCompatible: boolean;
  readonly clinicalValidation: boolean;
}

export interface MigrationPhase {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly dependencies: string[];
  readonly tasks: MigrationTask[];
  readonly validation: ValidationCriteria[];
  readonly rollbackPlan: string;
}

export interface MigrationTask {
  readonly id: string;
  readonly description: string;
  readonly category: 'code' | 'configuration' | 'testing' | 'validation';
  readonly estimatedHours: number;
  readonly clinicallyRequired: boolean;
  readonly riskLevel: 'low' | 'medium' | 'high';
}

export interface ValidationCriteria {
  readonly requirement: string;
  readonly testMethod: string;
  readonly acceptanceCriteria: string;
  readonly clinicalRelevance: string;
}

export interface MigrationTimeline {
  readonly totalWeeks: number;
  readonly phases: PhaseTimeline[];
  readonly criticalMilestones: Milestone[];
  readonly bufferWeeks: number;
}

export interface PhaseTimeline {
  readonly phaseId: string;
  readonly startWeek: number;
  readonly durationWeeks: number;
  readonly parallelPhases: string[];
}

export interface Milestone {
  readonly week: number;
  readonly description: string;
  readonly deliverables: string[];
  readonly clinicalSignOff: boolean;
}

export interface RiskMitigation {
  readonly preemptiveActions: string[];
  readonly contingencyPlans: ContingencyPlan[];
  readonly rollbackTriggers: string[];
  readonly communicationPlan: string;
}

export interface ContingencyPlan {
  readonly trigger: string;
  readonly action: string;
  readonly timeframe: string;
  readonly resources: string[];
  readonly clinicalImpact: string;
}

// === CONSTANTS ===

export const NEW_ARCHITECTURE_CONSTANTS = {
  CLINICAL_PERFORMANCE_THRESHOLDS: {
    CRISIS_RESPONSE_MS: 200,
    ASSESSMENT_TRANSITION_MS: 300,
    BREATHING_FPS: 60,
    FRAME_TIME_MS: 16.67,
    APP_LAUNCH_MS: 2000,
    CHECK_IN_FLOW_MS: 500,
  },
  COMPATIBILITY_VERSIONS: {
    REACT_NATIVE_MIN: '0.81.0',
    EXPO_MIN: '54.0.0',
    HERMES_MIN: '0.12.0',
  },
  RISK_TOLERANCE: {
    PERFORMANCE_DEGRADATION_MAX: 5, // percentage
    MEMORY_INCREASE_MAX: 10, // percentage
    FRAME_DROP_MAX: 3, // per second
  },
} as const;