/**
 * Being. Website - Performance & Monitoring Type Definitions
 * Clinical-grade performance monitoring with mental health UX requirements
 */

// ============================================================================
// CORE WEB VITALS & PERFORMANCE METRICS
// ============================================================================

export interface WebVitalsMetrics {
  readonly lcp: number; // Largest Contentful Paint (ms)
  readonly fid: number; // First Input Delay (ms)
  readonly cls: number; // Cumulative Layout Shift (score)
  readonly ttfb: number; // Time to First Byte (ms)
  readonly fcp: number; // First Contentful Paint (ms)
  readonly inp?: number; // Interaction to Next Paint (ms)
  readonly timestamp: Date;
  readonly url: string;
  readonly sessionId: string;
}

export interface PerformanceThresholds {
  readonly lcp: { good: number; needsImprovement: number; poor: number };
  readonly fid: { good: number; needsImprovement: number; poor: number };
  readonly cls: { good: number; needsImprovement: number; poor: number };
  readonly ttfb: { good: number; needsImprovement: number; poor: number };
  readonly fcp: { good: number; needsImprovement: number; poor: number };
}

export interface ClinicalPerformanceRequirements {
  readonly crisisButtonResponse: number; // Max 200ms
  readonly assessmentNavigation: number; // Max 300ms
  readonly formSubmission: number; // Max 500ms
  readonly pageLoadTime: number; // Max 2000ms
  readonly therapeuticContentLoad: number; // Max 1000ms
  readonly emergencyContactAccess: number; // Max 100ms
}

// ============================================================================
// RESOURCE LOADING & OPTIMIZATION
// ============================================================================

export interface ResourceLoadingMetrics {
  readonly totalResources: number;
  readonly loadedResources: number;
  readonly failedResources: number;
  readonly criticalResourcesLoaded: boolean;
  readonly therapeuticContentCached: boolean;
  readonly emergencyResourcesReady: boolean;
  readonly loadingTime: {
    readonly html: number;
    readonly css: number;
    readonly javascript: number;
    readonly images: number;
    readonly fonts: number;
    readonly clinicalContent: number;
  };
}

export interface CriticalResourcesStatus {
  readonly crisisHotlineNumbers: 'loaded' | 'loading' | 'failed';
  readonly therapeuticContent: 'loaded' | 'loading' | 'failed';
  readonly assessmentForms: 'loaded' | 'loading' | 'failed';
  readonly emergencyContacts: 'loaded' | 'loading' | 'failed';
  readonly safetyProtocols: 'loaded' | 'loading' | 'failed';
}

export interface AssetOptimization {
  readonly images: {
    readonly totalSize: number;
    readonly compressedSize: number;
    readonly webpSupported: boolean;
    readonly avifSupported: boolean;
    readonly lazyLoadingEnabled: boolean;
  };
  readonly fonts: {
    readonly totalSize: number;
    readonly woff2Supported: boolean;
    readonly fontDisplay: 'swap' | 'fallback' | 'optional';
    readonly clinicalAccessibilityFonts: boolean;
  };
  readonly scripts: {
    readonly totalSize: number;
    readonly gzippedSize: number;
    readonly moduleSupported: boolean;
    readonly criticalScriptsInline: boolean;
  };
}

// ============================================================================
// MEMORY & CPU MONITORING
// ============================================================================

export interface MemoryMetrics {
  readonly usedJSHeapSize: number;
  readonly totalJSHeapSize: number;
  readonly jsHeapSizeLimit: number;
  readonly memoryWarningThreshold: number;
  readonly clinicalDataMemoryUsage: number;
  readonly cacheMemoryUsage: number;
}

export interface CPUMetrics {
  readonly mainThreadBlocking: number; // ms of main thread blocking
  readonly longTasks: LongTask[];
  readonly frameRate: number; // fps
  readonly frameDrops: number;
  readonly therapeuticAnimationPerformance: number; // fps for breathing circles, etc.
}

export interface LongTask {
  readonly startTime: number;
  readonly duration: number;
  readonly scriptUrl?: string;
  readonly functionName?: string;
  readonly clinicalImpact: 'none' | 'low' | 'medium' | 'high';
}

// ============================================================================
// NETWORK & CONNECTIVITY
// ============================================================================

export interface NetworkMetrics {
  readonly connectionType: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'unknown';
  readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  readonly downlink: number; // Mbps
  readonly rtt: number; // ms
  readonly saveData: boolean;
  readonly networkQuality: 'poor' | 'good' | 'excellent';
  readonly offlineCapability: boolean;
}

export interface APIPerformanceMetrics {
  readonly endpoint: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly responseTime: number; // ms
  readonly statusCode: number;
  readonly retryCount: number;
  readonly cacheHit: boolean;
  readonly clinicalDataType?: 'assessment' | 'checkin' | 'crisis' | 'progress';
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface CDNPerformance {
  readonly provider: string;
  readonly region: string;
  readonly cacheHitRatio: number; // 0-1
  readonly averageResponseTime: number; // ms
  readonly errorRate: number; // 0-1
  readonly clinicalContentDelivery: boolean;
}

// ============================================================================
// USER EXPERIENCE METRICS
// ============================================================================

export interface UXMetrics {
  readonly pageLoadPerception: 'fast' | 'moderate' | 'slow';
  readonly interactionResponsiveness: 'excellent' | 'good' | 'poor';
  readonly visualStability: 'stable' | 'moderate' | 'unstable';
  readonly accessibilityPerformance: AccessibilityPerformance;
  readonly therapeuticUXQuality: TherapeuticUXMetrics;
}

export interface AccessibilityPerformance {
  readonly screenReaderPerformance: number; // ms to announce content
  readonly keyboardNavigationDelay: number; // ms between focus changes
  readonly highContrastRenderTime: number; // ms to apply high contrast
  readonly textScalingPerformance: number; // ms to scale text
  readonly colorBlindnessSupport: boolean;
  readonly motionReducedMode: boolean;
}

export interface TherapeuticUXMetrics {
  readonly breathingCircleAccuracy: number; // timing accuracy %
  readonly assessmentFormFlow: number; // ms between question transitions
  readonly crisisButtonAccessibility: number; // ms to reach from any page
  readonly therapeuticContentEngagement: number; // seconds spent with content
  readonly stressReductionUX: boolean; // calm, non-overwhelming interface
  readonly clinicalTrustIndicators: boolean; // professional appearance maintained
}

export interface InteractionMetrics {
  readonly timeToInteractive: number; // ms
  readonly firstInputDelay: number; // ms
  readonly clickToNavigate: number; // ms from click to navigation
  readonly formSubmissionTime: number; // ms from submit to response
  readonly searchResponseTime: number; // ms to show search results
  readonly clinicalFormAccuracy: number; // % of successful submissions
}

// ============================================================================
// ERROR MONITORING & RELIABILITY
// ============================================================================

export interface ErrorMetrics {
  readonly jsErrors: JSError[];
  readonly networkErrors: NetworkError[];
  readonly renderErrors: RenderError[];
  readonly clinicalFlowErrors: ClinicalError[];
  readonly errorRate: number; // 0-1
  readonly criticalErrorRate: number; // 0-1
}

export interface JSError {
  readonly message: string;
  readonly filename?: string;
  readonly lineno?: number;
  readonly colno?: number;
  readonly stack?: string;
  readonly timestamp: Date;
  readonly url: string;
  readonly userAgent: string;
  readonly clinicalImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  readonly recoverable: boolean;
}

export interface NetworkError {
  readonly url: string;
  readonly method: string;
  readonly statusCode: number;
  readonly statusText: string;
  readonly responseTime: number;
  readonly retryAttempts: number;
  readonly timestamp: Date;
  readonly clinicalEndpoint: boolean;
  readonly emergencyResource: boolean;
}

export interface RenderError {
  readonly componentName: string;
  readonly errorBoundary?: string;
  readonly errorMessage: string;
  readonly stackTrace: string;
  readonly timestamp: Date;
  readonly recoveryAction: 'reload' | 'fallback' | 'retry' | 'escalate';
  readonly clinicalComponent: boolean;
}

export interface ClinicalError {
  readonly type: 'assessment-failure' | 'crisis-button-failure' | 'data-sync-failure' | 'validation-error';
  readonly severity: 'warning' | 'error' | 'critical';
  readonly message: string;
  readonly context: Record<string, unknown>;
  readonly userImpact: 'none' | 'minor' | 'moderate' | 'severe';
  readonly recoveryRequired: boolean;
  readonly escalationRequired: boolean;
  readonly timestamp: Date;
}

// ============================================================================
// PERFORMANCE BUDGETS & MONITORING
// ============================================================================

export interface PerformanceBudget {
  readonly pageSize: {
    readonly total: number; // KB
    readonly html: number; // KB
    readonly css: number; // KB
    readonly javascript: number; // KB
    readonly images: number; // KB
    readonly fonts: number; // KB
  };
  readonly loadingTime: {
    readonly initial: number; // ms
    readonly interactive: number; // ms
    readonly complete: number; // ms
  };
  readonly thirdPartyScripts: {
    readonly maxSize: number; // KB
    readonly maxCount: number;
    readonly allowedDomains: string[];
  };
}

export interface PerformanceAlert {
  readonly id: string;
  readonly type: 'threshold-exceeded' | 'budget-exceeded' | 'error-spike' | 'availability-issue';
  readonly severity: 'info' | 'warning' | 'critical';
  readonly message: string;
  readonly metric: string;
  readonly value: number;
  readonly threshold: number;
  readonly timestamp: Date;
  readonly clinicalImpact: boolean;
  readonly actionRequired: boolean;
}

export interface PerformanceReport {
  readonly reportId: string;
  readonly timeframe: {
    readonly start: Date;
    readonly end: Date;
  };
  readonly summary: {
    readonly averageLoadTime: number;
    readonly errorRate: number;
    readonly userSatisfaction: number; // 0-1
    readonly clinicalFlowSuccess: number; // 0-1
  };
  readonly metrics: {
    readonly webVitals: WebVitalsMetrics[];
    readonly userExperience: UXMetrics[];
    readonly errors: ErrorMetrics[];
    readonly performance: ResourceLoadingMetrics[];
  };
  readonly recommendations: PerformanceRecommendation[];
}

export interface PerformanceRecommendation {
  readonly id: string;
  readonly category: 'loading' | 'rendering' | 'network' | 'accessibility' | 'clinical';
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly title: string;
  readonly description: string;
  readonly expectedImpact: 'minor' | 'moderate' | 'significant';
  readonly implementationEffort: 'low' | 'medium' | 'high';
  readonly clinicalBenefit: boolean;
}

// ============================================================================
// REAL-TIME MONITORING & ALERTING
// ============================================================================

export interface RealTimeMonitoring {
  readonly enabled: boolean;
  readonly updateInterval: number; // ms
  readonly alerting: AlertingConfig;
  readonly clinicalPriority: boolean;
  readonly emergencyEscalation: boolean;
}

export interface AlertingConfig {
  readonly performanceThresholds: PerformanceThresholds;
  readonly errorRateThreshold: number; // 0-1
  readonly availabilityThreshold: number; // 0-1
  readonly clinicalFlowThreshold: number; // 0-1
  readonly emergencyResponseTime: number; // minutes
  readonly escalationChain: string[];
}

export interface HealthCheck {
  readonly timestamp: Date;
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly responseTime: number; // ms
  readonly availability: number; // 0-1
  readonly services: ServiceHealth[];
  readonly clinicalSystemsOperational: boolean;
}

export interface ServiceHealth {
  readonly name: string;
  readonly status: 'up' | 'down' | 'degraded';
  readonly responseTime: number; // ms
  readonly errorRate: number; // 0-1
  readonly lastCheck: Date;
  readonly clinicalCritical: boolean;
}

// ============================================================================
// A/B TESTING & OPTIMIZATION
// ============================================================================

export interface PerformanceExperiment {
  readonly id: string;
  readonly name: string;
  readonly hypothesis: string;
  readonly variations: ExperimentVariation[];
  readonly metrics: string[];
  readonly clinicalSafetyApproved: boolean;
  readonly startDate: Date;
  readonly endDate?: Date;
  readonly status: 'draft' | 'running' | 'completed' | 'paused';
}

export interface ExperimentVariation {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly trafficAllocation: number; // 0-1
  readonly performanceImpact: 'positive' | 'neutral' | 'negative';
  readonly clinicalSafetyValidated: boolean;
}

export interface ExperimentResult {
  readonly experimentId: string;
  readonly variationId: string;
  readonly metrics: {
    readonly loadTime: number;
    readonly conversionRate: number;
    readonly errorRate: number;
    readonly userSatisfaction: number;
    readonly clinicalFlowSuccess: number;
  };
  readonly significance: number; // 0-1
  readonly sampleSize: number;
  readonly clinicalOutcome: 'beneficial' | 'neutral' | 'concerning';
}

// ============================================================================
// SYNTHETIC MONITORING
// ============================================================================

export interface SyntheticMonitoring {
  readonly enabled: boolean;
  readonly frequency: number; // minutes
  readonly locations: string[];
  readonly scenarios: SyntheticScenario[];
  readonly clinicalFlowTesting: boolean;
}

export interface SyntheticScenario {
  readonly id: string;
  readonly name: string;
  readonly steps: SyntheticStep[];
  readonly expectedDuration: number; // ms
  readonly criticalUserJourney: boolean;
  readonly clinicalWorkflow: boolean;
}

export interface SyntheticStep {
  readonly action: 'navigate' | 'click' | 'type' | 'wait' | 'assert';
  readonly target: string;
  readonly value?: string;
  readonly timeout: number; // ms
  readonly clinicalValidation: boolean;
}

export interface SyntheticResult {
  readonly scenarioId: string;
  readonly timestamp: Date;
  readonly duration: number; // ms
  readonly success: boolean;
  readonly steps: SyntheticStepResult[];
  readonly screenshots?: string[];
  readonly clinicalFlowValidated: boolean;
}

export interface SyntheticStepResult {
  readonly stepIndex: number;
  readonly duration: number; // ms
  readonly success: boolean;
  readonly error?: string;
  readonly screenshot?: string;
}

// ============================================================================
// PERFORMANCE ANALYTICS & INSIGHTS
// ============================================================================

export interface PerformanceInsights {
  readonly timeframe: 'hour' | 'day' | 'week' | 'month';
  readonly trends: PerformanceTrend[];
  readonly anomalies: PerformanceAnomaly[];
  readonly opportunities: OptimizationOpportunity[];
  readonly clinicalImpactAnalysis: ClinicalImpactAnalysis;
}

export interface PerformanceTrend {
  readonly metric: string;
  readonly direction: 'improving' | 'stable' | 'declining';
  readonly changePercent: number;
  readonly significance: 'low' | 'medium' | 'high';
  readonly dataPoints: TrendDataPoint[];
}

export interface TrendDataPoint {
  readonly timestamp: Date;
  readonly value: number;
  readonly sampleSize: number;
}

export interface PerformanceAnomaly {
  readonly id: string;
  readonly metric: string;
  readonly detectedAt: Date;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly possibleCauses: string[];
  readonly clinicalImpact: boolean;
  readonly autoResolved: boolean;
}

export interface OptimizationOpportunity {
  readonly id: string;
  readonly category: 'loading' | 'rendering' | 'caching' | 'compression' | 'clinical';
  readonly title: string;
  readonly description: string;
  readonly potentialImpact: {
    readonly loadTime: number; // ms improvement
    readonly scoreImprovement: number;
    readonly userExperience: 'minor' | 'moderate' | 'significant';
  };
  readonly implementationEffort: 'low' | 'medium' | 'high';
  readonly clinicalBenefit: boolean;
}

export interface ClinicalImpactAnalysis {
  readonly performanceToEngagement: number; // correlation coefficient
  readonly loadTimeToCompletion: number; // correlation coefficient
  readonly errorRateToAbandonment: number; // correlation coefficient
  readonly therapeuticUXEffectiveness: number; // 0-1 score
  readonly accessibilityPerformanceImpact: number; // 0-1 score
}

// ============================================================================
// TYPE GUARDS & UTILITIES
// ============================================================================

export function isPerformanceCritical(metric: string, value: number, thresholds: PerformanceThresholds): boolean {
  switch (metric) {
    case 'lcp':
      return value > thresholds.lcp.poor;
    case 'fid':
      return value > thresholds.fid.poor;
    case 'cls':
      return value > thresholds.cls.poor;
    default:
      return false;
  }
}

export function isClinicalFlowAffected(error: ClinicalError): boolean {
  return error.type === 'assessment-failure' || 
         error.type === 'crisis-button-failure' ||
         error.severity === 'critical';
}

export function requiresImmediateEscalation(alert: PerformanceAlert): boolean {
  return alert.severity === 'critical' && alert.clinicalImpact;
}

export function calculatePerformanceScore(metrics: WebVitalsMetrics, thresholds: PerformanceThresholds): number {
  const lcpScore = metrics.lcp <= thresholds.lcp.good ? 100 : 
                   metrics.lcp <= thresholds.lcp.needsImprovement ? 75 : 25;
  const fidScore = metrics.fid <= thresholds.fid.good ? 100 : 
                   metrics.fid <= thresholds.fid.needsImprovement ? 75 : 25;
  const clsScore = metrics.cls <= thresholds.cls.good ? 100 : 
                   metrics.cls <= thresholds.cls.needsImprovement ? 75 : 25;
  
  return Math.round((lcpScore + fidScore + clsScore) / 3);
}

// ============================================================================
// PERFORMANCE CONSTANTS
// ============================================================================

export const PERFORMANCE_CONSTANTS = {
  CLINICAL_THRESHOLDS: {
    CRISIS_BUTTON_MAX_RESPONSE: 200, // ms
    ASSESSMENT_NAVIGATION_MAX: 300, // ms
    PAGE_LOAD_MAX: 2000, // ms
    EMERGENCY_ACCESS_MAX: 100, // ms
  },
  WEB_VITALS_THRESHOLDS: {
    lcp: { good: 2500, needsImprovement: 4000, poor: 4000 },
    fid: { good: 100, needsImprovement: 300, poor: 300 },
    cls: { good: 0.1, needsImprovement: 0.25, poor: 0.25 },
    ttfb: { good: 800, needsImprovement: 1800, poor: 1800 },
    fcp: { good: 1800, needsImprovement: 3000, poor: 3000 },
  },
  MONITORING_INTERVALS: {
    REAL_TIME_UPDATE: 5000, // 5 seconds
    HEALTH_CHECK: 30000, // 30 seconds
    SYNTHETIC_MONITORING: 300000, // 5 minutes
    REPORT_GENERATION: 3600000, // 1 hour
  },
} as const;