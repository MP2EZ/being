/**
 * React Native New Architecture Detection Utilities
 * Being. MBCT App - Clinical-Grade Architecture Validation
 *
 * These utilities provide type-safe detection and validation of React Native
 * New Architecture features with therapeutic performance requirements.
 *
 * CRITICAL: All detection must maintain 100% accuracy for therapeutic timing
 * and crisis response validation.
 */

import type {
  ArchitectureDetectionResult,
  PerformanceMetrics,
  ClinicalComplianceCheck,
  NewArchitectureFeatures,
  DependencyCompatibility,
  ClinicalPerformanceRequirements,
  LibraryCompatibility
} from '../types/new-architecture-types';

import { NEW_ARCHITECTURE_CONSTANTS } from '../types/new-architecture-types';

// === GLOBAL TYPE DECLARATIONS ===

declare global {
  interface Global {
    nativeFabricUIManager?: unknown;
    __turboModuleProxy?: unknown;
    HermesInternal?: unknown;
    performance?: Performance;
  }
}

// === CORE ARCHITECTURE TYPE GUARDS ===

export const isValidArchitectureDetectionResult = (
  value: unknown
): value is ArchitectureDetectionResult => {
  if (!value || typeof value !== 'object') return false;

  const result = value as Record<string, unknown>;

  return (
    typeof result.isNewArchitecture === 'boolean' &&
    typeof result.isFabric === 'boolean' &&
    typeof result.isTurboModules === 'boolean' &&
    typeof result.isHermes === 'boolean' &&
    isValidArchitectureDetails(result.details) &&
    isValidPerformanceMetrics(result.performance) &&
    isValidClinicalComplianceCheck(result.clinicalCompliance)
  );
};

export const isValidPerformanceMetrics = (
  value: unknown
): value is PerformanceMetrics => {
  if (!value || typeof value !== 'object') return false;

  const metrics = value as Record<string, unknown>;

  return (
    typeof metrics.frameRate === 'number' &&
    typeof metrics.averageFrameTime === 'number' &&
    typeof metrics.droppedFrames === 'number' &&
    typeof metrics.memoryUsageMB === 'number' &&
    typeof metrics.cpuUsagePercent === 'number' &&
    typeof metrics.renderTime === 'number' &&
    typeof metrics.jsThreadUsage === 'number' &&
    typeof metrics.uiThreadUsage === 'number' &&
    typeof metrics.bridgeUsage === 'number' &&
    typeof metrics.meetsClinicalStandards === 'boolean' &&
    metrics.frameRate >= 0 &&
    metrics.averageFrameTime >= 0 &&
    metrics.droppedFrames >= 0 &&
    metrics.memoryUsageMB >= 0 &&
    metrics.cpuUsagePercent >= 0 &&
    metrics.cpuUsagePercent <= 100
  );
};

export const isValidClinicalComplianceCheck = (
  value: unknown
): value is ClinicalComplianceCheck => {
  if (!value || typeof value !== 'object') return false;

  const compliance = value as Record<string, unknown>;

  return (
    typeof compliance.crisisResponseReady === 'boolean' &&
    typeof compliance.assessmentAccuracy === 'boolean' &&
    typeof compliance.therapeuticTiming === 'boolean' &&
    typeof compliance.dataEncryption === 'boolean' &&
    typeof compliance.offlineCapability === 'boolean' &&
    typeof compliance.accessibilityCompliant === 'boolean' &&
    (compliance.overallCompliance === 'compliant' ||
     compliance.overallCompliance === 'warning' ||
     compliance.overallCompliance === 'non-compliant') &&
    Array.isArray(compliance.issues)
  );
};

// === ARCHITECTURE FEATURE DETECTION ===

export const detectFabricRenderer = (): boolean => {
  try {
    // Check for Fabric UI Manager in global scope
    return !!(global as any)?.nativeFabricUIManager;
  } catch {
    return false;
  }
};

export const detectTurboModules = (): boolean => {
  try {
    // Check for TurboModule proxy in global scope
    return !!(global as any)?.__turboModuleProxy;
  } catch {
    return false;
  }
};

export const detectHermesEngine = (): boolean => {
  try {
    // Check for Hermes internal object
    return typeof HermesInternal === 'object' && HermesInternal !== null;
  } catch {
    return false;
  }
};

export const detectJSEngine = (): 'hermes' | 'jsc' | 'v8' | 'unknown' => {
  try {
    if (detectHermesEngine()) {
      return 'hermes';
    }

    // Check for JavaScriptCore
    if (typeof global !== 'undefined' && 'nativeLoggingHook' in global) {
      return 'jsc';
    }

    // Check for V8 (web/development)
    if (typeof window !== 'undefined' && 'chrome' in window) {
      return 'v8';
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
};

// === PERFORMANCE VALIDATION ===

export const validateClinicalPerformance = (
  metrics: PerformanceMetrics,
  requirements: ClinicalPerformanceRequirements = {
    crisisButtonResponseMs: NEW_ARCHITECTURE_CONSTANTS.CLINICAL_PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE_MS,
    assessmentTransitionMs: NEW_ARCHITECTURE_CONSTANTS.CLINICAL_PERFORMANCE_THRESHOLDS.ASSESSMENT_TRANSITION_MS,
    breathingAnimationFps: NEW_ARCHITECTURE_CONSTANTS.CLINICAL_PERFORMANCE_THRESHOLDS.BREATHING_FPS,
    frameTimeMs: NEW_ARCHITECTURE_CONSTANTS.CLINICAL_PERFORMANCE_THRESHOLDS.FRAME_TIME_MS,
    appLaunchMs: NEW_ARCHITECTURE_CONSTANTS.CLINICAL_PERFORMANCE_THRESHOLDS.APP_LAUNCH_MS,
    checkInFlowMs: NEW_ARCHITECTURE_CONSTANTS.CLINICAL_PERFORMANCE_THRESHOLDS.CHECK_IN_FLOW_MS
  }
): boolean => {
  const validations = [
    // Crisis button response validation
    validateCrisisResponseTiming(metrics, requirements.crisisButtonResponseMs),

    // Breathing animation smoothness
    validateBreathingAnimation(metrics, requirements.breathingAnimationFps),

    // Assessment transition speed
    validateAssessmentTransitions(metrics, requirements.assessmentTransitionMs),

    // Frame rate consistency
    validateFrameRateConsistency(metrics, requirements.frameTimeMs),

    // Memory usage within bounds
    validateMemoryUsage(metrics),

    // Overall performance standards
    metrics.meetsClinicalStandards
  ];

  return validations.every(validation => validation === true);
};

export const validateCrisisResponseTiming = (
  metrics: PerformanceMetrics,
  maxResponseTimeMs: number
): boolean => {
  // Crisis response must be under 200ms for therapeutic safety
  return metrics.renderTime <= maxResponseTimeMs;
};

export const validateBreathingAnimation = (
  metrics: PerformanceMetrics,
  targetFps: number
): boolean => {
  // Breathing animation must maintain 60fps for therapeutic effectiveness
  const fpsThreshold = targetFps * 0.95; // 5% tolerance
  return metrics.frameRate >= fpsThreshold && metrics.droppedFrames <= 3;
};

export const validateAssessmentTransitions = (
  metrics: PerformanceMetrics,
  maxTransitionMs: number
): boolean => {
  // Assessment transitions must be under 300ms for therapeutic flow
  return metrics.renderTime <= maxTransitionMs;
};

export const validateFrameRateConsistency = (
  metrics: PerformanceMetrics,
  targetFrameTimeMs: number
): boolean => {
  // Frame time should be consistent for smooth animations
  const tolerance = targetFrameTimeMs * 0.1; // 10% tolerance
  return Math.abs(metrics.averageFrameTime - targetFrameTimeMs) <= tolerance;
};

export const validateMemoryUsage = (metrics: PerformanceMetrics): boolean => {
  // Memory usage should be reasonable for mobile devices
  const maxMemoryMB = 512; // 512MB limit for clinical apps
  return metrics.memoryUsageMB <= maxMemoryMB;
};

// === DEPENDENCY COMPATIBILITY VALIDATION ===

export const validateDependencyCompatibility = (
  dependencies: Record<string, string>
): DependencyCompatibility => {
  const libraries: LibraryCompatibility[] = [];

  // Check critical dependencies for New Architecture compatibility
  const criticalDeps = [
    'react-native-keychain',
    'react-native-worklets',
    'react-native-worklets-core',
    '@stripe/stripe-react-native'
  ];

  criticalDeps.forEach(depName => {
    if (dependencies[depName]) {
      const compatibility = checkLibraryCompatibility(depName, dependencies[depName]);
      libraries.push(compatibility);
    }
  });

  const reactNativeCheck = validateReactNativeVersion(dependencies['react-native'] || '');
  const expoCheck = validateExpoVersion(dependencies['expo'] || '');

  const overallCompatible = libraries.every(lib => lib.newArchCompatible) &&
                           reactNativeCheck.compatible &&
                           expoCheck.compatible;

  return {
    reactNative: reactNativeCheck,
    expo: expoCheck,
    libraries,
    overall: overallCompatible ? 'ready' : 'migration-needed'
  };
};

const checkLibraryCompatibility = (
  name: string,
  version: string
): LibraryCompatibility => {
  // Define compatibility matrix for critical libraries
  const compatibilityMatrix: Record<string, {
    newArchSupport: string;
    fabricSupport: boolean;
    turboModuleSupport: boolean;
    minVersion: string;
  }> = {
    'react-native-keychain': {
      newArchSupport: '10.0.0',
      fabricSupport: true,
      turboModuleSupport: true,
      minVersion: '10.0.0'
    },
    'react-native-worklets': {
      newArchSupport: '0.5.0',
      fabricSupport: true,
      turboModuleSupport: false,
      minVersion: '0.5.1'
    },
    'react-native-worklets-core': {
      newArchSupport: '1.6.0',
      fabricSupport: true,
      turboModuleSupport: true,
      minVersion: '1.6.2'
    },
    '@stripe/stripe-react-native': {
      newArchSupport: '0.50.0',
      fabricSupport: true,
      turboModuleSupport: true,
      minVersion: '0.50.3'
    }
  };

  const compatibility = compatibilityMatrix[name];
  if (!compatibility) {
    return {
      name,
      version,
      newArchCompatible: false,
      fabricSupport: false,
      turboModuleSupport: false,
      clinicallyRequired: false,
      migrationPath: null,
      riskAssessment: {
        level: 'medium',
        description: 'Unknown compatibility status',
        clinicalImpact: 'Potential performance degradation',
        mitigation: 'Verify compatibility with vendor',
        timelineWeeks: 2
      }
    };
  }

  const isCompatible = compareVersions(version, compatibility.minVersion) >= 0;

  return {
    name,
    version,
    newArchCompatible: isCompatible,
    fabricSupport: compatibility.fabricSupport && isCompatible,
    turboModuleSupport: compatibility.turboModuleSupport && isCompatible,
    clinicallyRequired: ['react-native-keychain', '@stripe/stripe-react-native'].includes(name),
    migrationPath: isCompatible ? null : `Upgrade to ${compatibility.minVersion} or later`,
    riskAssessment: {
      level: isCompatible ? 'none' : (name.includes('stripe') ? 'high' : 'medium'),
      description: isCompatible ? 'Fully compatible' : 'Requires version upgrade',
      clinicalImpact: isCompatible ? 'None' : 'Potential performance or security issues',
      mitigation: isCompatible ? 'None required' : `Upgrade to version ${compatibility.minVersion}`,
      timelineWeeks: isCompatible ? 0 : 1
    }
  };
};

const validateReactNativeVersion = (version: string) => {
  const minVersion = NEW_ARCHITECTURE_CONSTANTS.COMPATIBILITY_VERSIONS.REACT_NATIVE_MIN;
  const compatible = compareVersions(version, minVersion) >= 0;

  return {
    version,
    compatible,
    newArchSupport: compatible ? 'full' as const : 'none' as const,
    migrationRequired: !compatible,
    clinicalRisk: compatible ? 'none' as const : 'high' as const
  };
};

const validateExpoVersion = (version: string) => {
  const minVersion = NEW_ARCHITECTURE_CONSTANTS.COMPATIBILITY_VERSIONS.EXPO_MIN;
  const compatible = compareVersions(version, minVersion) >= 0;

  return {
    version,
    compatible,
    newArchSupport: compatible ? 'full' as const : 'none' as const,
    migrationRequired: !compatible,
    clinicalRisk: compatible ? 'none' as const : 'medium' as const
  };
};

// === UTILITY FUNCTIONS ===

const compareVersions = (version1: string, version2: string): number => {
  const v1 = version1.replace(/[^0-9.]/g, '').split('.').map(Number);
  const v2 = version2.replace(/^[~^]/, '').replace(/[^0-9.]/g, '').split('.').map(Number);

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const a = v1[i] || 0;
    const b = v2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
};

const isValidArchitectureDetails = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false;

  const details = value as Record<string, unknown>;

  return (
    typeof details.fabricUIManager === 'boolean' &&
    typeof details.turboModuleProxy === 'boolean' &&
    typeof details.hermesEngine === 'boolean' &&
    typeof details.reactNativeVersion === 'string' &&
    typeof details.expoVersion === 'string' &&
    (details.jsEngine === 'hermes' ||
     details.jsEngine === 'jsc' ||
     details.jsEngine === 'v8' ||
     details.jsEngine === 'unknown') &&
    (details.platform === 'ios' ||
     details.platform === 'android' ||
     details.platform === 'web') &&
    (details.buildType === 'development' ||
     details.buildType === 'production')
  );
};

// === CLINICAL ARCHITECTURE VALIDATOR CLASS ===

export class ClinicalArchitectureValidator {
  private static instance: ClinicalArchitectureValidator;

  public static getInstance(): ClinicalArchitectureValidator {
    if (!ClinicalArchitectureValidator.instance) {
      ClinicalArchitectureValidator.instance = new ClinicalArchitectureValidator();
    }
    return ClinicalArchitectureValidator.instance;
  }

  public validateCrisisResponseTiming(metrics: PerformanceMetrics): boolean {
    return validateCrisisResponseTiming(metrics, NEW_ARCHITECTURE_CONSTANTS.CLINICAL_PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE_MS);
  }

  public validateBreathingAnimation(metrics: PerformanceMetrics): boolean {
    return validateBreathingAnimation(metrics, NEW_ARCHITECTURE_CONSTANTS.CLINICAL_PERFORMANCE_THRESHOLDS.BREATHING_FPS);
  }

  public validateAssessmentTransitions(metrics: PerformanceMetrics): boolean {
    return validateAssessmentTransitions(metrics, NEW_ARCHITECTURE_CONSTANTS.CLINICAL_PERFORMANCE_THRESHOLDS.ASSESSMENT_TRANSITION_MS);
  }

  public validateDataSecurity(features: NewArchitectureFeatures): boolean {
    // New Architecture provides better security through TurboModules
    return features.turboModules.enabled && features.hermes.enabled;
  }

  public validateOfflineCapability(features: NewArchitectureFeatures): boolean {
    // Fabric renderer improves offline performance
    return features.fabric.enabled;
  }

  public generateComplianceReport(result: ArchitectureDetectionResult) {
    const timestamp = new Date().toISOString();
    const architectureVersion = result.details.reactNativeVersion;

    const clinicalRequirements = [
      {
        id: 'crisis-response',
        description: 'Crisis button response time under 200ms',
        status: this.validateCrisisResponseTiming(result.performance) ? 'met' : 'not-met',
        measuredValue: result.performance.renderTime,
        requiredValue: 200,
        clinicalImpact: 'critical'
      },
      {
        id: 'breathing-animation',
        description: 'Breathing animation at 60fps with minimal frame drops',
        status: this.validateBreathingAnimation(result.performance) ? 'met' : 'not-met',
        measuredValue: result.performance.frameRate,
        requiredValue: 60,
        clinicalImpact: 'high'
      },
      {
        id: 'assessment-transitions',
        description: 'Assessment screen transitions under 300ms',
        status: this.validateAssessmentTransitions(result.performance) ? 'met' : 'not-met',
        measuredValue: result.performance.renderTime,
        requiredValue: 300,
        clinicalImpact: 'medium'
      }
    ] as const;

    const overallCompliance = clinicalRequirements.every(req => req.status === 'met');

    return {
      timestamp,
      architectureVersion,
      clinicalRequirements,
      performanceBaselines: [],
      riskAssessment: {
        overallRisk: overallCompliance ? 'low' : 'medium',
        riskFactors: [],
        mitigationStrategies: [],
        timelineRecommendation: overallCompliance ? 'Ready for deployment' : 'Requires optimization'
      },
      recommendations: []
    };
  }
}