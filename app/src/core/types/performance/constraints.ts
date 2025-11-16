/**
 * Performance-Constrained Types - Enhanced Timing Validation
 * Comprehensive type definitions for performance-critical operations
 * 
 * PERFORMANCE REQUIREMENTS:
 * - Crisis detection: <200ms (CRITICAL - life safety requirement)
 * - Assessment calculations: <300ms (clinical accuracy timing)
 * - Component renders: <16ms (60fps requirement)
 * - State updates: <5ms for crisis, <10ms for standard
 * - Encryption operations: <50ms (security + usability)
 * - Network requests: <2000ms with timeout handling
 * - Memory usage: <100MB total app, <10MB per component tree
 * 
 * MONITORING REQUIREMENTS:
 * - Real-time performance tracking
 * - Automatic violation detection and response
 * - Performance regression testing support
 * - Crisis scenario performance guarantees
 * - Accessibility performance compliance
 */

/**
 * Performance Timing Categories
 */
export type PerformanceTimingCategory = 
  | 'crisis_critical'      // <200ms - Crisis detection and intervention
  | 'clinical_required'    // <300ms - Clinical calculations and scoring
  | 'user_interactive'     // <100ms - User input response
  | 'render_critical'      // <16ms - Component render cycles
  | 'state_critical'       // <5ms - Crisis state updates
  | 'state_standard'       // <10ms - Standard state updates
  | 'encryption_required'  // <50ms - Security operations
  | 'network_timeout'      // <2000ms - Network operations
  | 'background_processing' // <5000ms - Background tasks
  | 'initialization'       // <1000ms - App/component startup
  | 'accessibility'        // <100ms - Screen reader, navigation
  | 'biometric_auth';      // <200ms - Biometric authentication

/**
 * Performance Constraint Definition
 */
export interface PerformanceConstraint {
  /** Constraint name */
  name: string;
  /** Performance category */
  category: PerformanceTimingCategory;
  /** Maximum allowed time (ms) */
  maxTimeMs: number;
  /** Warning threshold (ms) */
  warningThresholdMs: number;
  /** Critical threshold (ms) */
  criticalThresholdMs: number;
  /** Whether this constraint is enforced in production */
  enforceInProduction: boolean;
  /** Whether violations should be logged */
  logViolations: boolean;
  /** Whether violations should trigger alerts */
  alertOnViolation: boolean;
  /** Description of the constraint */
  description: string;
  /** Impact of violating this constraint */
  violationImpact: ConstraintViolationImpact;
  /** Remediation strategies */
  remediationStrategies: string[];
}

/**
 * Constraint Violation Impact
 */
export type ConstraintViolationImpact = 
  | 'user_experience'      // Affects user experience
  | 'clinical_safety'      // Affects clinical accuracy or safety
  | 'crisis_safety'        // Affects crisis intervention effectiveness
  | 'accessibility'        // Affects accessibility compliance
  | 'security'             // Affects security posture
  | 'compliance'           // Affects regulatory compliance
  | 'system_stability'     // Affects system stability
  | 'data_integrity';      // Affects data accuracy

/**
 * Performance Metric
 */
export interface PerformanceMetric {
  /** Metric name */
  name: string;
  /** Metric category */
  category: PerformanceTimingCategory;
  /** Current value */
  value: number;
  /** Unit of measurement */
  unit: 'ms' | 'mb' | 'fps' | 'percent' | 'count';
  /** Timestamp when measured */
  timestamp: number;
  /** Associated constraint */
  constraint?: PerformanceConstraint;
  /** Whether metric violates constraint */
  violatesConstraint: boolean;
  /** Violation severity */
  violationSeverity?: 'warning' | 'critical' | 'emergency';
  /** Context information */
  context: PerformanceContext;
  /** Trend information */
  trend: PerformanceTrend;
}

/**
 * Performance Context
 */
export interface PerformanceContext {
  /** Operation being performed */
  operation: string;
  /** User ID (for user-specific metrics) */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Component name (for render metrics) */
  componentName?: string;
  /** Crisis context */
  crisisContext?: {
    crisisActive: boolean;
    severityLevel: string;
    interventionActive: boolean;
  };
  /** Device context */
  deviceContext: {
    platform: 'ios' | 'android';
    deviceType: 'phone' | 'tablet';
    osVersion: string;
    appVersion: string;
    availableMemoryMB: number;
    batteryLevel?: number;
    networkType?: 'wifi' | 'cellular' | 'offline';
  };
  /** Load context */
  loadContext: {
    currentUsers: number;
    systemLoad: number;
    memoryPressure: 'low' | 'medium' | 'high' | 'critical';
    backgroundTasks: number;
  };
}

/**
 * Performance Trend
 */
export interface PerformanceTrend {
  /** Trend direction */
  direction: 'improving' | 'stable' | 'degrading' | 'critical';
  /** Trend confidence (0-100) */
  confidence: number;
  /** Trend rate (change per hour) */
  changeRate: number;
  /** Historical data points */
  historicalData: Array<{
    timestamp: number;
    value: number;
  }>;
  /** Predicted future value */
  prediction?: {
    timestamp: number;
    predictedValue: number;
    confidenceInterval: [number, number];
  };
}

/**
 * Performance Violation
 */
export interface PerformanceViolation {
  /** Violation ID */
  id: string;
  /** Constraint that was violated */
  constraint: PerformanceConstraint;
  /** Actual performance metric */
  actualMetric: PerformanceMetric;
  /** Violation timestamp */
  timestamp: number;
  /** Violation severity */
  severity: 'warning' | 'critical' | 'emergency';
  /** Violation duration (ms) */
  durationMs: number;
  /** Impact assessment */
  impact: ViolationImpactAssessment;
  /** Automatic response taken */
  automaticResponse?: PerformanceResponse;
  /** Manual response required */
  requiresManualResponse: boolean;
  /** Violation resolved */
  resolved: boolean;
  /** Resolution timestamp */
  resolvedAt?: number;
  /** Resolution method */
  resolutionMethod?: string;
}

/**
 * Violation Impact Assessment
 */
export interface ViolationImpactAssessment {
  /** Users affected */
  usersAffected: number;
  /** Operations affected */
  operationsAffected: string[];
  /** Estimated impact score (0-100) */
  impactScore: number;
  /** Business impact */
  businessImpact: 'minimal' | 'moderate' | 'significant' | 'severe';
  /** Safety impact */
  safetyImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  /** User experience impact */
  uxImpact: 'minor' | 'noticeable' | 'frustrating' | 'blocking';
}

/**
 * Performance Response
 */
export interface PerformanceResponse {
  /** Response ID */
  id: string;
  /** Response type */
  type: PerformanceResponseType;
  /** Response triggered at */
  triggeredAt: number;
  /** Response actions taken */
  actions: PerformanceAction[];
  /** Response effectiveness */
  effectiveness: 'effective' | 'partial' | 'ineffective' | 'unknown';
  /** Response completion time */
  completionTimeMs: number;
  /** Follow-up required */
  followUpRequired: boolean;
}

/**
 * Performance Response Types
 */
export type PerformanceResponseType = 
  | 'optimize_immediately'     // Immediate optimization
  | 'reduce_functionality'     // Temporary feature reduction
  | 'increase_resources'       // Resource allocation increase
  | 'cache_optimization'       // Cache strategy adjustment
  | 'background_processing'    // Move operations to background
  | 'user_notification'        // Notify user of degradation
  | 'failsafe_mode'           // Activate failsafe operations
  | 'emergency_optimization'   // Crisis scenario optimization
  | 'graceful_degradation'    // Planned performance reduction
  | 'system_restart';         // Restart components/services

/**
 * Performance Action
 */
export interface PerformanceAction {
  /** Action type */
  type: string;
  /** Action timestamp */
  timestamp: number;
  /** Action parameters */
  parameters: Record<string, any>;
  /** Action result */
  result: 'success' | 'failure' | 'partial';
  /** Action duration */
  durationMs: number;
  /** Action impact */
  impact: string;
}

/**
 * Timing Validator
 */
export interface TimingValidator {
  /** Validate operation timing */
  validateTiming: (
    operation: string, 
    actualTimeMs: number, 
    category: PerformanceTimingCategory
  ) => TimingValidationResult;
  
  /** Start timing measurement */
  startTiming: (operation: string, context: PerformanceContext) => TimingHandle;
  
  /** Stop timing measurement */
  stopTiming: (handle: TimingHandle) => PerformanceMetric;
  
  /** Register constraint violation */
  registerViolation: (violation: PerformanceViolation) => Promise<void>;
  
  /** Get performance statistics */
  getStatistics: (timeRangeMs: number) => PerformanceStatistics;
}

/**
 * Timing Validation Result
 */
export interface TimingValidationResult {
  /** Validation passed */
  passed: boolean;
  /** Constraint that was checked */
  constraint: PerformanceConstraint;
  /** Actual timing */
  actualTimeMs: number;
  /** Allowed timing */
  allowedTimeMs: number;
  /** Violation severity (if any) */
  violationSeverity?: 'warning' | 'critical' | 'emergency';
  /** Recommended actions */
  recommendations: string[];
}

/**
 * Timing Handle
 */
export interface TimingHandle {
  /** Handle ID */
  id: string;
  /** Operation name */
  operation: string;
  /** Start timestamp */
  startTime: number;
  /** Performance context */
  context: PerformanceContext;
  /** Associated constraint */
  constraint?: PerformanceConstraint;
}

/**
 * Performance Statistics
 */
export interface PerformanceStatistics {
  /** Time range covered */
  timeRangeMs: number;
  /** Total operations measured */
  totalOperations: number;
  /** Operations by category */
  operationsByCategory: Record<PerformanceTimingCategory, number>;
  /** Average timings by category */
  averageTimings: Record<PerformanceTimingCategory, number>;
  /** P95 timings by category */
  p95Timings: Record<PerformanceTimingCategory, number>;
  /** P99 timings by category */
  p99Timings: Record<PerformanceTimingCategory, number>;
  /** Violation counts */
  violationCounts: Record<PerformanceTimingCategory, number>;
  /** Most violated constraints */
  mostViolatedConstraints: Array<{
    constraint: PerformanceConstraint;
    violationCount: number;
  }>;
  /** Performance trends */
  trends: Record<PerformanceTimingCategory, PerformanceTrend>;
}

/**
 * Memory Performance Types
 */
export interface MemoryConstraint {
  /** Constraint name */
  name: string;
  /** Maximum memory usage (MB) */
  maxMemoryMB: number;
  /** Warning threshold (MB) */
  warningThresholdMB: number;
  /** Critical threshold (MB) */
  criticalThresholdMB: number;
  /** Scope of memory constraint */
  scope: 'app_total' | 'component_tree' | 'single_component' | 'store_state' | 'cache';
  /** Cleanup strategy */
  cleanupStrategy: MemoryCleanupStrategy;
}

/**
 * Memory Cleanup Strategy
 */
export type MemoryCleanupStrategy = 
  | 'lru_eviction'         // Least recently used eviction
  | 'size_based'           // Remove largest items first
  | 'age_based'            // Remove oldest items first
  | 'priority_based'       // Remove low priority items first
  | 'garbage_collection'   // Force garbage collection
  | 'component_unmount'    // Unmount non-essential components
  | 'cache_clear'          // Clear caches
  | 'state_compression';   // Compress state data

/**
 * Memory Usage Metric
 */
export interface MemoryUsageMetric {
  /** Current memory usage (MB) */
  currentUsageMB: number;
  /** Peak memory usage (MB) */
  peakUsageMB: number;
  /** Available memory (MB) */
  availableMemoryMB: number;
  /** Memory pressure level */
  pressureLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Garbage collection frequency */
  gcFrequency: number;
  /** Memory leaks detected */
  leaksDetected: MemoryLeak[];
  /** Last measurement timestamp */
  timestamp: number;
}

/**
 * Memory Leak Detection
 */
export interface MemoryLeak {
  /** Leak identifier */
  id: string;
  /** Component/module with leak */
  source: string;
  /** Estimated leak rate (MB/hour) */
  leakRateMBPerHour: number;
  /** Leak confidence (0-100) */
  confidence: number;
  /** First detected */
  firstDetected: number;
  /** Last measured */
  lastMeasured: number;
  /** Severity level */
  severity: 'minor' | 'moderate' | 'major' | 'critical';
}

/**
 * Network Performance Types
 */
export interface NetworkConstraint {
  /** Constraint name */
  name: string;
  /** Maximum request time (ms) */
  maxRequestTimeMs: number;
  /** Retry strategy */
  retryStrategy: NetworkRetryStrategy;
  /** Timeout configuration */
  timeouts: NetworkTimeouts;
  /** Offline handling */
  offlineHandling: OfflineStrategy;
}

/**
 * Network Retry Strategy
 */
export interface NetworkRetryStrategy {
  /** Maximum retry attempts */
  maxRetries: number;
  /** Retry delay strategy */
  delayStrategy: 'fixed' | 'exponential' | 'linear';
  /** Base delay (ms) */
  baseDelayMs: number;
  /** Maximum delay (ms) */
  maxDelayMs: number;
  /** Retry conditions */
  retryConditions: string[];
}

/**
 * Network Timeouts
 */
export interface NetworkTimeouts {
  /** Connection timeout (ms) */
  connectionTimeoutMs: number;
  /** Request timeout (ms) */
  requestTimeoutMs: number;
  /** Response timeout (ms) */
  responseTimeoutMs: number;
  /** Crisis timeout (ms) - shortened for emergency operations */
  crisisTimeoutMs: number;
}

/**
 * Offline Strategy
 */
export type OfflineStrategy = 
  | 'cache_only'           // Use cached data only
  | 'queue_requests'       // Queue requests for when online
  | 'offline_mode'         // Switch to offline functionality
  | 'graceful_degradation' // Reduce functionality gracefully
  | 'emergency_mode';      // Maintain crisis functionality only

/**
 * Crisis Performance Requirements
 */
export interface CrisisPerformanceRequirements {
  /** Crisis detection timing */
  detectionConstraints: {
    maxDetectionTimeMs: 200;
    maxAssessmentProcessingMs: 100;
    maxScoreCalculationMs: 50;
    maxThresholdCheckMs: 10;
  };
  
  /** Crisis intervention timing */
  interventionConstraints: {
    maxInterventionDisplayMs: 200;
    maxResourceLoadingMs: 500;
    maxEmergencyContactMs: 100;
    max988ConnectionMs: 5000;
  };
  
  /** Crisis button timing */
  buttonConstraints: {
    maxButtonResponseMs: 100;
    maxHapticFeedbackMs: 50;
    maxVisualFeedbackMs: 16;
    maxAudioFeedbackMs: 100;
  };
  
  /** Crisis accessibility timing */
  accessibilityConstraints: {
    maxScreenReaderMs: 100;
    maxVoiceGuidanceMs: 200;
    maxHighContrastMs: 50;
    maxFontScalingMs: 30;
  };
}

/**
 * Performance Monitoring Service
 */
export interface PerformanceMonitoringService {
  /** Monitor operation performance */
  monitorOperation: <T>(
    operation: string,
    category: PerformanceTimingCategory,
    fn: () => Promise<T>,
    context: PerformanceContext
  ) => Promise<T>;
  
  /** Record custom metric */
  recordMetric: (metric: PerformanceMetric) => void;
  
  /** Check constraints */
  checkConstraints: (operation: string, timeMs: number) => PerformanceViolation[];
  
  /** Get real-time statistics */
  getRealTimeStats: () => PerformanceStatistics;
  
  /** Enable crisis mode */
  enableCrisisMode: () => void;
  
  /** Disable crisis mode */
  disableCrisisMode: () => void;
  
  /** Force optimization */
  forceOptimization: (type: PerformanceResponseType) => Promise<void>;
}

/**
 * Predefined Performance Constraints
 */
export const PERFORMANCE_CONSTRAINTS: Record<string, PerformanceConstraint> = {
  CRISIS_DETECTION: {
    name: 'Crisis Detection',
    category: 'crisis_critical',
    maxTimeMs: 200,
    warningThresholdMs: 150,
    criticalThresholdMs: 180,
    enforceInProduction: true,
    logViolations: true,
    alertOnViolation: true,
    description: 'Crisis detection must complete within 200ms for life safety',
    violationImpact: 'crisis_safety',
    remediationStrategies: [
      'Optimize assessment calculation algorithms',
      'Pre-cache crisis thresholds',
      'Use dedicated crisis detection thread',
      'Implement progressive enhancement'
    ]
  },
  
  CLINICAL_CALCULATION: {
    name: 'Clinical Calculation',
    category: 'clinical_required',
    maxTimeMs: 300,
    warningThresholdMs: 200,
    criticalThresholdMs: 250,
    enforceInProduction: true,
    logViolations: true,
    alertOnViolation: true,
    description: 'Clinical calculations must maintain accuracy within time constraints',
    violationImpact: 'clinical_safety',
    remediationStrategies: [
      'Optimize scoring algorithms',
      'Pre-calculate common scenarios',
      'Use lookup tables for complex calculations',
      'Implement calculation caching'
    ]
  },
  
  COMPONENT_RENDER: {
    name: 'Component Render',
    category: 'render_critical',
    maxTimeMs: 16,
    warningThresholdMs: 12,
    criticalThresholdMs: 14,
    enforceInProduction: true,
    logViolations: true,
    alertOnViolation: false,
    description: 'Component renders must maintain 60fps',
    violationImpact: 'user_experience',
    remediationStrategies: [
      'Optimize render cycles',
      'Use React.memo for expensive components',
      'Implement virtualization for lists',
      'Reduce component complexity'
    ]
  },
  
  CRISIS_STATE_UPDATE: {
    name: 'Crisis State Update',
    category: 'state_critical',
    maxTimeMs: 5,
    warningThresholdMs: 3,
    criticalThresholdMs: 4,
    enforceInProduction: true,
    logViolations: true,
    alertOnViolation: true,
    description: 'Crisis state updates must be immediate',
    violationImpact: 'crisis_safety',
    remediationStrategies: [
      'Optimize Zustand store operations',
      'Use atomic state updates',
      'Pre-allocate crisis state objects',
      'Minimize state transformation complexity'
    ]
  },
  
  ENCRYPTION_OPERATION: {
    name: 'Encryption Operation',
    category: 'encryption_required',
    maxTimeMs: 50,
    warningThresholdMs: 30,
    criticalThresholdMs: 40,
    enforceInProduction: true,
    logViolations: true,
    alertOnViolation: true,
    description: 'Encryption operations must balance security and performance',
    violationImpact: 'security',
    remediationStrategies: [
      'Use hardware-accelerated encryption',
      'Optimize key derivation',
      'Implement encryption caching',
      'Use streaming encryption for large data'
    ]
  },
  
  BIOMETRIC_AUTH: {
    name: 'Biometric Authentication',
    category: 'biometric_auth',
    maxTimeMs: 200,
    warningThresholdMs: 150,
    criticalThresholdMs: 180,
    enforceInProduction: true,
    logViolations: true,
    alertOnViolation: true,
    description: 'Biometric authentication must be responsive, especially in crisis',
    violationImpact: 'user_experience',
    remediationStrategies: [
      'Pre-warm biometric systems',
      'Implement fallback authentication',
      'Optimize biometric processing',
      'Cache authentication state appropriately'
    ]
  }
} as const;

/**
 * Memory Constraints
 */
export const MEMORY_CONSTRAINTS: Record<string, MemoryConstraint> = {
  APP_TOTAL: {
    name: 'Total App Memory',
    maxMemoryMB: 100,
    warningThresholdMB: 80,
    criticalThresholdMB: 90,
    scope: 'app_total',
    cleanupStrategy: 'lru_eviction'
  },
  
  COMPONENT_TREE: {
    name: 'Component Tree Memory',
    maxMemoryMB: 10,
    warningThresholdMB: 8,
    criticalThresholdMB: 9,
    scope: 'component_tree',
    cleanupStrategy: 'component_unmount'
  },
  
  STORE_STATE: {
    name: 'Store State Memory',
    maxMemoryMB: 20,
    warningThresholdMB: 15,
    criticalThresholdMB: 18,
    scope: 'store_state',
    cleanupStrategy: 'state_compression'
  }
} as const;

/**
 * Crisis Performance Requirements
 */
export const CRISIS_PERFORMANCE: CrisisPerformanceRequirements = {
  detectionConstraints: {
    maxDetectionTimeMs: 200,
    maxAssessmentProcessingMs: 100,
    maxScoreCalculationMs: 50,
    maxThresholdCheckMs: 10
  },
  interventionConstraints: {
    maxInterventionDisplayMs: 200,
    maxResourceLoadingMs: 500,
    maxEmergencyContactMs: 100,
    max988ConnectionMs: 5000
  },
  buttonConstraints: {
    maxButtonResponseMs: 100,
    maxHapticFeedbackMs: 50,
    maxVisualFeedbackMs: 16,
    maxAudioFeedbackMs: 100
  },
  accessibilityConstraints: {
    maxScreenReaderMs: 100,
    maxVoiceGuidanceMs: 200,
    maxHighContrastMs: 50,
    maxFontScalingMs: 30
  }
} as const;