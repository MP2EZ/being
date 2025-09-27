/**
 * Therapeutic Performance Validator - MBCT Timing Precision Monitoring
 * Enhanced for React Native New Architecture Phase 4.3B
 *
 * Validates therapeutic effectiveness through performance metrics with
 * integration to NewArchitecturePerformanceMonitor for comprehensive tracking.
 *
 * CRITICAL REQUIREMENTS:
 * - ±50ms timing accuracy for breathing cycles (MBCT compliance)
 * - 60fps maintenance during 180-second therapeutic sessions
 * - <200ms crisis response times
 * - Memory leak prevention during extended sessions
 * - New Architecture TurboModules & Fabric renderer optimization validation
 *
 * PERFORMANCE TARGETS (POST-MIGRATION):
 * - Touch Response Time: <150ms average (25% improvement)
 * - Breathing Animation FPS: >58fps average (20% improvement)
 * - Crisis Button Response: <200ms average (60% improvement)
 * - Assessment Navigation: <300ms between screens (40% improvement)
 */

import { performanceMonitor } from './PerformanceMonitor';
import { useNewArchitecturePerformance } from './NewArchitecturePerformanceMonitor';

interface TherapeuticPerformanceMetrics {
  breathingTimingAccuracy: number; // ±ms deviation from target
  animationFrameRate: number; // fps during therapeutic sessions
  crisisResponseTime: number; // ms from interaction to response
  memoryUsageStability: boolean; // no leaks during extended sessions
  gestureLatency: number; // ms from touch to feedback
  therapeuticEffectiveness: 'optimal' | 'acceptable' | 'concerning' | 'critical';
  // New Architecture enhancements
  turboModulesEfficiency: number; // % efficiency of TurboModule calls
  fabricRendererHealth: number; // % health of Fabric renderer
  pressableOptimization: number; // % improvement from TouchableOpacity migration
  newArchitectureCompliance: boolean; // Overall New Architecture performance compliance
}

interface TherapeuticSession {
  sessionId: string;
  sessionType: 'breathing' | 'emotion_selection' | 'assessment' | 'crisis';
  startTime: number;
  duration: number;
  targetDuration?: number;
  participantId?: string;
}

interface TimingValidationResult {
  isValid: boolean;
  deviation: number;
  context: string;
  recommendations: string[];
  severity: 'info' | 'warning' | 'error' | 'critical';
}

interface PerformanceValidationSuite {
  breathingPrecision: TimingValidationResult;
  animationPerformance: TimingValidationResult;
  crisisResponseTiming: TimingValidationResult;
  memoryManagement: TimingValidationResult;
  overallTherapeuticEffectiveness: TimingValidationResult;
}

class TherapeuticPerformanceValidator {
  private sessions: Map<string, TherapeuticSession> = new Map();
  private timingMeasurements: Map<string, number[]> = new Map();
  private memoryBaseline: number = 0;
  private isValidating: boolean = false;
  // New Architecture integration
  private newArchMonitor: any = null;
  private newArchSessionMap: Map<string, string> = new Map(); // Maps therapeutic sessionId to newArch sessionId

  // MBCT-specific performance thresholds
  private readonly THERAPEUTIC_THRESHOLDS = {
    BREATHING_TIMING_TOLERANCE: 50, // ±50ms for breathing cycles
    MIN_FRAME_RATE: 58, // 58fps minimum (allowing 2fps tolerance)
    MAX_CRISIS_RESPONSE: 200, // 200ms maximum crisis response
    MAX_GESTURE_LATENCY: 150, // 150ms maximum gesture latency
    MEMORY_GROWTH_LIMIT: 20 * 1024 * 1024, // 20MB maximum growth
    SESSION_DURATION_TOLERANCE: 1000, // ±1s for 3-minute sessions
  } as const;

  /**
   * Start therapeutic session validation with New Architecture integration
   */
  startSessionValidation(sessionConfig: Omit<TherapeuticSession, 'startTime'>): string {
    const sessionId = `${sessionConfig.sessionType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: TherapeuticSession = {
      ...sessionConfig,
      sessionId,
      startTime: performance.now(),
    };

    this.sessions.set(sessionId, session);
    this.timingMeasurements.set(sessionId, []);

    // Initialize memory baseline
    if (this.memoryBaseline === 0) {
      this.memoryBaseline = this.estimateMemoryUsage();
    }

    // Start performance monitoring for this session
    performanceMonitor.startMonitoring(`therapeutic_${sessionConfig.sessionType}`);

    // Integrate with New Architecture monitoring
    if (this.newArchMonitor) {
      const newArchSessionId = this.newArchMonitor.startTherapeuticSession(sessionConfig.sessionType);
      this.newArchSessionMap.set(sessionId, newArchSessionId);
      console.log(`🚀 New Architecture monitoring linked: ${newArchSessionId}`);
    }

    console.log(`🎯 Therapeutic validation started: ${sessionId}`);
    return sessionId;
  }

  /**
   * Initialize New Architecture integration
   */
  initializeNewArchitectureIntegration(newArchMonitor: any): void {
    this.newArchMonitor = newArchMonitor;
    console.log('🔗 New Architecture integration initialized');
  }

  /**
   * Validate breathing timing precision (CRITICAL for MBCT)
   */
  validateBreathingTiming(sessionId: string, expectedDuration: number, actualDuration: number): TimingValidationResult {
    const deviation = Math.abs(actualDuration - expectedDuration);
    const measurements = this.timingMeasurements.get(sessionId) || [];
    measurements.push(deviation);
    this.timingMeasurements.set(sessionId, measurements);

    // Calculate cumulative timing accuracy
    const averageDeviation = measurements.reduce((sum, dev) => sum + dev, 0) / measurements.length;
    const maxDeviation = Math.max(...measurements);

    let severity: TimingValidationResult['severity'] = 'info';
    let recommendations: string[] = [];

    if (maxDeviation > this.THERAPEUTIC_THRESHOLDS.BREATHING_TIMING_TOLERANCE) {
      severity = 'critical';
      recommendations.push('CRITICAL: Breathing timing exceeds MBCT therapeutic tolerance');
      recommendations.push('Switch to worklet-based timing architecture');
      recommendations.push('Eliminate JavaScript intervals during breathing sessions');
    } else if (averageDeviation > this.THERAPEUTIC_THRESHOLDS.BREATHING_TIMING_TOLERANCE * 0.5) {
      severity = 'warning';
      recommendations.push('Breathing timing approaching therapeutic limits');
      recommendations.push('Optimize animation worklet configuration');
    }

    return {
      isValid: maxDeviation <= this.THERAPEUTIC_THRESHOLDS.BREATHING_TIMING_TOLERANCE,
      deviation: maxDeviation,
      context: `Breathing session ${sessionId}: avg=${averageDeviation.toFixed(2)}ms, max=${maxDeviation.toFixed(2)}ms`,
      recommendations,
      severity,
    };
  }

  /**
   * Validate crisis response timing (CRITICAL for safety)
   */
  validateCrisisResponse(sessionId: string, responseTime: number): TimingValidationResult {
    const isValid = responseTime <= this.THERAPEUTIC_THRESHOLDS.MAX_CRISIS_RESPONSE;
    let severity: TimingValidationResult['severity'] = 'info';
    let recommendations: string[] = [];

    if (responseTime > this.THERAPEUTIC_THRESHOLDS.MAX_CRISIS_RESPONSE) {
      severity = 'critical';
      recommendations.push('CRITICAL: Crisis response time exceeds safety requirements');
      recommendations.push('Optimize crisis button Pressable configuration');
      recommendations.push('Remove async operations from crisis flow');
      recommendations.push('Implement crisis-optimized haptic feedback');
    } else if (responseTime > this.THERAPEUTIC_THRESHOLDS.MAX_CRISIS_RESPONSE * 0.75) {
      severity = 'warning';
      recommendations.push('Crisis response approaching safety limits');
      recommendations.push('Review crisis interaction architecture');
    }

    // Record for performance monitoring
    performanceMonitor.recordEvent('crisisResponseTime', responseTime, sessionId);

    return {
      isValid,
      deviation: responseTime,
      context: `Crisis response: ${responseTime.toFixed(2)}ms`,
      recommendations,
      severity,
    };
  }

  /**
   * Validate animation frame rate during therapeutic sessions
   */
  validateAnimationPerformance(sessionId: string, frameRate: number, duration: number): TimingValidationResult {
    const isValid = frameRate >= this.THERAPEUTIC_THRESHOLDS.MIN_FRAME_RATE;
    let severity: TimingValidationResult['severity'] = 'info';
    let recommendations: string[] = [];

    if (frameRate < this.THERAPEUTIC_THRESHOLDS.MIN_FRAME_RATE) {
      if (frameRate < 45) {
        severity = 'critical';
        recommendations.push('CRITICAL: Animation frame rate severely impacting therapeutic experience');
        recommendations.push('Immediate worklet optimization required');
        recommendations.push('Reduce UI complexity during breathing sessions');
      } else {
        severity = 'warning';
        recommendations.push('Animation frame rate affecting therapeutic smoothness');
        recommendations.push('Optimize animation easing functions');
        recommendations.push('Enable native driver for all animations');
      }
    }

    // Record animation performance
    performanceMonitor.recordEvent('frameRate', frameRate, sessionId);

    return {
      isValid,
      deviation: this.THERAPEUTIC_THRESHOLDS.MIN_FRAME_RATE - frameRate,
      context: `Animation performance: ${frameRate.toFixed(1)}fps over ${duration.toFixed(0)}ms`,
      recommendations,
      severity,
    };
  }

  /**
   * Validate gesture latency for anxiety-adaptive interactions
   */
  validateGestureLatency(sessionId: string, latency: number, isAnxietyAdaptive: boolean): TimingValidationResult {
    const threshold = isAnxietyAdaptive
      ? this.THERAPEUTIC_THRESHOLDS.MAX_GESTURE_LATENCY * 1.5 // Higher tolerance for anxiety adaptations
      : this.THERAPEUTIC_THRESHOLDS.MAX_GESTURE_LATENCY;

    const isValid = latency <= threshold;
    let severity: TimingValidationResult['severity'] = 'info';
    let recommendations: string[] = [];

    if (latency > threshold) {
      severity = isAnxietyAdaptive ? 'warning' : 'error';
      recommendations.push(`Gesture latency exceeds ${isAnxietyAdaptive ? 'anxiety-adaptive' : 'standard'} therapeutic requirements`);
      recommendations.push('Optimize Pressable configuration for therapeutic interactions');
      recommendations.push('Review animation coordination timing');
    }

    return {
      isValid,
      deviation: latency,
      context: `Gesture latency: ${latency.toFixed(2)}ms (${isAnxietyAdaptive ? 'anxiety-adaptive' : 'standard'})`,
      recommendations,
      severity,
    };
  }

  /**
   * Validate memory management during extended sessions
   */
  validateMemoryManagement(sessionId: string): TimingValidationResult {
    const currentMemory = this.estimateMemoryUsage();
    const memoryGrowth = currentMemory - this.memoryBaseline;
    const isValid = memoryGrowth <= this.THERAPEUTIC_THRESHOLDS.MEMORY_GROWTH_LIMIT;

    let severity: TimingValidationResult['severity'] = 'info';
    let recommendations: string[] = [];

    if (memoryGrowth > this.THERAPEUTIC_THRESHOLDS.MEMORY_GROWTH_LIMIT) {
      severity = 'critical';
      recommendations.push('CRITICAL: Memory growth exceeds limits for extended sessions');
      recommendations.push('Check for animation cleanup in therapeutic components');
      recommendations.push('Implement memory cleanup intervals');
      recommendations.push('Review shared value lifecycle management');
    } else if (memoryGrowth > this.THERAPEUTIC_THRESHOLDS.MEMORY_GROWTH_LIMIT * 0.7) {
      severity = 'warning';
      recommendations.push('Memory growth approaching session limits');
      recommendations.push('Optimize animation cleanup strategies');
    }

    return {
      isValid,
      deviation: memoryGrowth,
      context: `Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB from baseline`,
      recommendations,
      severity,
    };
  }

  /**
   * Complete session validation and generate comprehensive report
   */
  completeSessionValidation(sessionId: string): PerformanceValidationSuite {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const endTime = performance.now();
    const actualDuration = endTime - session.startTime;

    // Stop performance monitoring
    const alerts = performanceMonitor.stopMonitoring();

    // Validate session duration if target was specified
    let breathingPrecision: TimingValidationResult;
    if (session.targetDuration) {
      breathingPrecision = this.validateBreathingTiming(
        sessionId,
        session.targetDuration,
        actualDuration
      );
    } else {
      breathingPrecision = {
        isValid: true,
        deviation: 0,
        context: 'No target duration specified',
        recommendations: [],
        severity: 'info',
      };
    }

    // Aggregate performance data from monitoring
    const status = performanceMonitor.getStatus();

    const animationPerformance = this.validateAnimationPerformance(
      sessionId,
      status.metrics.frameRate,
      actualDuration
    );

    const crisisResponseTiming = this.validateCrisisResponse(
      sessionId,
      status.metrics.crisisResponseTime || 0
    );

    const memoryManagement = this.validateMemoryManagement(sessionId);

    // Calculate overall therapeutic effectiveness
    const criticalIssues = [breathingPrecision, animationPerformance, crisisResponseTiming, memoryManagement]
      .filter(result => result.severity === 'critical').length;

    const warningIssues = [breathingPrecision, animationPerformance, crisisResponseTiming, memoryManagement]
      .filter(result => result.severity === 'warning').length;

    let overallEffectiveness: TimingValidationResult['severity'] = 'info';
    let overallRecommendations: string[] = [];

    if (criticalIssues > 0) {
      overallEffectiveness = 'critical';
      overallRecommendations.push('CRITICAL: Session has issues affecting therapeutic effectiveness');
      overallRecommendations.push('Immediate optimization required before therapeutic use');
    } else if (warningIssues > 1) {
      overallEffectiveness = 'warning';
      overallRecommendations.push('Multiple performance concerns affecting session quality');
      overallRecommendations.push('Optimization recommended for optimal therapeutic experience');
    }

    const overallTherapeuticEffectiveness: TimingValidationResult = {
      isValid: criticalIssues === 0,
      deviation: criticalIssues + warningIssues,
      context: `Session ${sessionId}: ${criticalIssues} critical, ${warningIssues} warnings`,
      recommendations: overallRecommendations,
      severity: overallEffectiveness,
    };

    // Cleanup session data
    this.sessions.delete(sessionId);
    this.timingMeasurements.delete(sessionId);

    const validationSuite: PerformanceValidationSuite = {
      breathingPrecision,
      animationPerformance,
      crisisResponseTiming,
      memoryManagement,
      overallTherapeuticEffectiveness,
    };

    this.logValidationReport(sessionId, validationSuite);

    return validationSuite;
  }

  /**
   * Get real-time therapeutic performance metrics with New Architecture data
   */
  getTherapeuticMetrics(sessionId: string): TherapeuticPerformanceMetrics {
    const session = this.sessions.get(sessionId);
    const measurements = this.timingMeasurements.get(sessionId) || [];
    const status = performanceMonitor.getStatus();

    const breathingTimingAccuracy = measurements.length > 0
      ? Math.max(...measurements)
      : 0;

    // Get New Architecture metrics if available
    let turboModulesEfficiency = 0;
    let fabricRendererHealth = 0;
    let pressableOptimization = 0;
    let newArchitectureCompliance = false;

    if (this.newArchMonitor) {
      const newArchSessionId = this.newArchSessionMap.get(sessionId);
      if (newArchSessionId) {
        const newArchMetrics = this.newArchMonitor.getDashboard();
        turboModulesEfficiency = newArchMetrics.optimizationEffectiveness;
        fabricRendererHealth = newArchMetrics.performanceScore;

        // Calculate Pressable optimization based on touch response improvement
        const touchResponse = this.newArchMonitor.fabricRendererMetrics.pressableResponseTime;
        const baseline = 175; // Pre-migration baseline
        pressableOptimization = Math.max(0, ((baseline - touchResponse) / baseline) * 100);

        // Check overall New Architecture compliance
        newArchitectureCompliance = newArchMetrics.overallHealth === 'excellent' || newArchMetrics.overallHealth === 'good';
      }
    }

    let therapeuticEffectiveness: TherapeuticPerformanceMetrics['therapeuticEffectiveness'] = 'optimal';

    if (breathingTimingAccuracy > this.THERAPEUTIC_THRESHOLDS.BREATHING_TIMING_TOLERANCE ||
        status.metrics.frameRate < 45 ||
        status.metrics.crisisResponseTime > this.THERAPEUTIC_THRESHOLDS.MAX_CRISIS_RESPONSE ||
        !newArchitectureCompliance) {
      therapeuticEffectiveness = 'critical';
    } else if (breathingTimingAccuracy > this.THERAPEUTIC_THRESHOLDS.BREATHING_TIMING_TOLERANCE * 0.5 ||
               status.metrics.frameRate < this.THERAPEUTIC_THRESHOLDS.MIN_FRAME_RATE ||
               status.metrics.crisisResponseTime > this.THERAPEUTIC_THRESHOLDS.MAX_CRISIS_RESPONSE * 0.75 ||
               turboModulesEfficiency < 70) {
      therapeuticEffectiveness = 'concerning';
    } else if (status.warnings > 0 || fabricRendererHealth < 80) {
      therapeuticEffectiveness = 'acceptable';
    }

    return {
      breathingTimingAccuracy,
      animationFrameRate: status.metrics.frameRate,
      crisisResponseTime: status.metrics.crisisResponseTime,
      memoryUsageStability: status.metrics.memoryUsage < this.memoryBaseline + this.THERAPEUTIC_THRESHOLDS.MEMORY_GROWTH_LIMIT,
      gestureLatency: status.metrics.navigationTime, // Approximation
      therapeuticEffectiveness,
      turboModulesEfficiency,
      fabricRendererHealth,
      pressableOptimization,
      newArchitectureCompliance,
    };
  }

  private estimateMemoryUsage(): number {
    // In a real implementation, this would use platform-specific memory APIs
    // For now, return a simulation that can be overridden
    return 50 * 1024 * 1024; // 50MB baseline
  }

  private logValidationReport(sessionId: string, suite: PerformanceValidationSuite): void {
    console.log(`\n🎯 THERAPEUTIC PERFORMANCE VALIDATION REPORT`);
    console.log(`Session: ${sessionId}`);
    console.log(`=====================================`);

    Object.entries(suite).forEach(([category, result]) => {
      const icon = result.severity === 'critical' ? '🚨' :
                   result.severity === 'error' ? '⚠️' :
                   result.severity === 'warning' ? '⚡' : '✅';

      console.log(`${icon} ${category}: ${result.isValid ? 'PASS' : 'FAIL'}`);
      console.log(`   ${result.context}`);

      if (result.recommendations.length > 0) {
        result.recommendations.forEach(rec => {
          console.log(`   → ${rec}`);
        });
      }
      console.log('');
    });

    console.log(`=====================================\n`);
  }
}

// Export singleton instance
export const therapeuticValidator = new TherapeuticPerformanceValidator();

// Export types
export type {
  TherapeuticPerformanceMetrics,
  TherapeuticSession,
  TimingValidationResult,
  PerformanceValidationSuite,
};

// React hook for components
export const useTherapeuticValidation = () => {
  return {
    startValidation: (config: Omit<TherapeuticSession, 'startTime'>) =>
      therapeuticValidator.startSessionValidation(config),

    validateBreathingTiming: (sessionId: string, expected: number, actual: number) =>
      therapeuticValidator.validateBreathingTiming(sessionId, expected, actual),

    validateCrisisResponse: (sessionId: string, responseTime: number) =>
      therapeuticValidator.validateCrisisResponse(sessionId, responseTime),

    validateAnimation: (sessionId: string, frameRate: number, duration: number) =>
      therapeuticValidator.validateAnimationPerformance(sessionId, frameRate, duration),

    validateGesture: (sessionId: string, latency: number, isAnxietyAdaptive: boolean) =>
      therapeuticValidator.validateGestureLatency(sessionId, latency, isAnxietyAdaptive),

    completeValidation: (sessionId: string) =>
      therapeuticValidator.completeSessionValidation(sessionId),

    getMetrics: (sessionId: string) =>
      therapeuticValidator.getTherapeuticMetrics(sessionId),
  };
};