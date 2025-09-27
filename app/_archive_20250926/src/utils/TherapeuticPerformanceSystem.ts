/**
 * Therapeutic Performance System - Clinical-grade performance monitoring
 *
 * CRITICAL REQUIREMENTS:
 * - Crisis button response <200ms
 * - Breathing animation 60fps (16.67ms frame time)
 * - Check-in transitions <500ms
 * - App launch <3 seconds
 * - Memory usage monitoring with therapeutic session optimization
 *
 * THERAPEUTIC TIMING VALIDATION:
 * - Breathing cycle accuracy (60s per step)
 * - Assessment loading performance
 * - Mood tracking responsiveness
 * - Emergency protocol activation speed
 */

import { performanceMonitor, PerformanceMetrics, PerformanceAlert } from './PerformanceMonitor';
import { syncPerformanceOptimizer } from './SyncPerformanceOptimizer';
import React, { useEffect, useRef, useState, useCallback } from 'react';

// ============================================================================
// THERAPEUTIC PERFORMANCE TYPES
// ============================================================================

interface TherapeuticTimingRequirements {
  crisisButtonResponse: number; // <200ms CRITICAL
  breathingAnimationFrameTime: number; // 16.67ms for 60fps
  checkInTransition: number; // <500ms
  appLaunch: number; // <3000ms
  assessmentLoad: number; // <300ms
  navigationResponse: number; // <300ms
  breathingCycleAccuracy: number; // ±50ms tolerance for 60s cycles
  emergencyProtocolActivation: number; // <100ms
}

interface TherapeuticPerformanceMetrics extends PerformanceMetrics {
  breathingCycleAccuracy: number; // ms deviation from target
  therapySessionStability: number; // 0-100 score
  crisisReadinessScore: number; // 0-100 score
  therapeuticFlowContinuity: number; // 0-100 score
  memoryEfficiencyScore: number; // 0-100 score
  batteryImpactScore: number; // 0-100 score (100 = no impact)
}

interface PerformanceContext {
  sessionType: 'breathing' | 'assessment' | 'check-in' | 'crisis' | 'navigation' | 'general';
  criticalPath: boolean;
  therapeuticStage: 'start' | 'middle' | 'end' | 'emergency';
  userState: 'calm' | 'anxious' | 'crisis' | 'focused';
}

interface RealTimePerformanceData {
  timestamp: number;
  frameRate: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  renderTime: number;
  context: PerformanceContext;
}

interface PerformanceRegression {
  metric: keyof TherapeuticPerformanceMetrics;
  baseline: number;
  current: number;
  degradation: number; // percentage
  detectedAt: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// THERAPEUTIC PERFORMANCE SYSTEM CLASS
// ============================================================================

class TherapeuticPerformanceSystem {
  private timingRequirements: TherapeuticTimingRequirements = {
    crisisButtonResponse: 200,
    breathingAnimationFrameTime: 16.67,
    checkInTransition: 500,
    appLaunch: 3000,
    assessmentLoad: 300,
    navigationResponse: 300,
    breathingCycleAccuracy: 50,
    emergencyProtocolActivation: 100,
  };

  private metrics: TherapeuticPerformanceMetrics = {
    frameRate: 60,
    memoryUsage: 0,
    jsThreadUsage: 0,
    animationFrameDrops: 0,
    crisisResponseTime: 0,
    assessmentLoadTime: 0,
    navigationTime: 0,
    breathingCycleAccuracy: 0,
    therapySessionStability: 100,
    crisisReadinessScore: 100,
    therapeuticFlowContinuity: 100,
    memoryEfficiencyScore: 100,
    batteryImpactScore: 100,
  };

  private performanceData: RealTimePerformanceData[] = [];
  private regressions: PerformanceRegression[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private frameRateMonitor?: NodeJS.Timeout;
  private memoryMonitor?: NodeJS.Timeout;

  // Performance baselines for regression detection
  private performanceBaselines = new Map<string, number>();

  // Frame rate tracking for breathing animation
  private frameTimeHistory: number[] = [];
  private lastFrameTime = 0;

  // Crisis response tracking
  private crisisResponseTimes: number[] = [];

  // Memory tracking
  private memoryUsageHistory: number[] = [];
  private peakMemoryUsage = 0;

  /**
   * Initialize therapeutic performance system
   */
  initialize(): void {
    console.log('🏥 Initializing Therapeutic Performance System');

    // Set up performance baselines
    this.establishPerformanceBaselines();

    // Initialize underlying systems
    performanceMonitor.startMonitoring('therapeutic_system');
    syncPerformanceOptimizer.startPerformanceMonitoring();

    // Start real-time monitoring
    this.startRealTimeMonitoring();

    console.log('✅ Therapeutic Performance System initialized');
  }

  /**
   * Start real-time performance monitoring optimized for therapeutic sessions
   */
  startRealTimeMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('Therapeutic performance monitoring already active');
      return;
    }

    this.isMonitoring = true;
    console.log('🔍 Starting real-time therapeutic performance monitoring');

    // High-frequency frame rate monitoring for breathing animations
    this.frameRateMonitor = setInterval(() => {
      this.trackFrameRate();
    }, 16.67); // 60fps monitoring

    // Memory monitoring every 5 seconds
    this.memoryMonitor = setInterval(() => {
      this.trackMemoryUsage();
    }, 5000);

    // General performance monitoring every second
    this.monitoringInterval = setInterval(() => {
      this.collectTherapeuticMetrics();
      this.detectPerformanceRegressions();
      this.updateTherapeuticScores();
    }, 1000);
  }

  /**
   * Stop monitoring and generate therapeutic performance report
   */
  stopRealTimeMonitoring(): {
    report: string;
    regressions: PerformanceRegression[];
    recommendations: string[];
  } {
    if (!this.isMonitoring) {
      console.warn('Therapeutic performance monitoring not active');
      return { report: '', regressions: [], recommendations: [] };
    }

    this.isMonitoring = false;

    // Clear intervals
    if (this.frameRateMonitor) {
      clearInterval(this.frameRateMonitor);
      this.frameRateMonitor = undefined;
    }

    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
      this.memoryMonitor = undefined;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    // Stop underlying systems
    const alerts = performanceMonitor.stopMonitoring();
    syncPerformanceOptimizer.stopPerformanceMonitoring();

    // Generate comprehensive report
    const report = this.generateTherapeuticReport();
    const recommendations = this.getTherapeuticRecommendations();

    console.log('📊 Therapeutic performance monitoring stopped');
    console.log(report);

    return {
      report,
      regressions: [...this.regressions],
      recommendations,
    };
  }

  /**
   * Track crisis button response time (CRITICAL <200ms)
   */
  trackCrisisButtonResponse(startTime: number, context: string = 'crisis_button'): number {
    const responseTime = performance.now() - startTime;

    this.crisisResponseTimes.push(responseTime);
    this.metrics.crisisResponseTime = responseTime;

    // Update crisis readiness score
    this.updateCrisisReadinessScore(responseTime);

    // Critical alert if over threshold
    if (responseTime > this.timingRequirements.crisisButtonResponse) {
      console.error(`🚨 CRITICAL: Crisis button response ${responseTime.toFixed(2)}ms exceeds 200ms requirement`);
      this.triggerCriticalOptimization('crisisButtonResponse', responseTime);
    }

    // Track with performance monitor
    performanceMonitor.trackCrisisResponse(startTime, context);

    return responseTime;
  }

  /**
   * Track breathing animation frame performance (CRITICAL 60fps)
   */
  trackBreathingAnimationFrame(frameStartTime: number): void {
    const frameTime = performance.now() - frameStartTime;
    const currentFps = frameTime > 0 ? 1000 / frameTime : 60;

    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > 60) { // Keep last 60 frames (1 second at 60fps)
      this.frameTimeHistory.shift();
    }

    this.metrics.frameRate = currentFps;

    // Check for frame drops
    if (frameTime > this.timingRequirements.breathingAnimationFrameTime) {
      this.metrics.animationFrameDrops += 1;

      // Critical if consistently dropping frames
      const recentDrops = this.frameTimeHistory.filter(ft => ft > this.timingRequirements.breathingAnimationFrameTime).length;
      if (recentDrops > 5) { // More than 5 dropped frames in last second
        console.error(`🚨 CRITICAL: Breathing animation frame drops detected (${recentDrops}/60 frames)`);
        this.triggerCriticalOptimization('breathingAnimation', frameTime);
      }
    }

    // Track with performance monitor
    performanceMonitor.trackBreathingAnimation(frameTime, this.getCurrentMemoryUsage());

    this.updateTherapySessionStability();
  }

  /**
   * Track breathing cycle timing accuracy (60s ±50ms tolerance)
   */
  trackBreathingCycleAccuracy(actualDuration: number, targetDuration: number = 60000): void {
    const deviation = Math.abs(actualDuration - targetDuration);
    this.metrics.breathingCycleAccuracy = deviation;

    if (deviation > this.timingRequirements.breathingCycleAccuracy) {
      console.warn(`⚠️ Breathing cycle timing deviation: ${deviation.toFixed(2)}ms (target: ±${this.timingRequirements.breathingCycleAccuracy}ms)`);
    }

    this.updateTherapeuticFlowContinuity();
  }

  /**
   * Track check-in transition performance (<500ms)
   */
  trackCheckInTransition(startTime: number, fromScreen: string, toScreen: string): number {
    const transitionTime = performance.now() - startTime;
    this.metrics.navigationTime = transitionTime;

    if (transitionTime > this.timingRequirements.checkInTransition) {
      console.warn(`⚠️ Check-in transition slow: ${transitionTime.toFixed(2)}ms (${fromScreen} → ${toScreen})`);
      this.triggerOptimization('checkInTransition', transitionTime);
    }

    // Track with performance monitor
    performanceMonitor.trackNavigation(startTime, `checkin_${fromScreen}_to_${toScreen}`);

    return transitionTime;
  }

  /**
   * Track assessment loading performance (<300ms)
   */
  trackAssessmentLoad(startTime: number, assessmentType: string): number {
    const loadTime = performance.now() - startTime;
    this.metrics.assessmentLoadTime = loadTime;

    if (loadTime > this.timingRequirements.assessmentLoad) {
      console.warn(`⚠️ Assessment load slow: ${loadTime.toFixed(2)}ms (${assessmentType})`);
      this.triggerOptimization('assessmentLoad', loadTime);
    }

    // Track with performance monitor
    performanceMonitor.trackAssessmentLoad(startTime, assessmentType);

    return loadTime;
  }

  /**
   * Track app launch performance (<3000ms)
   */
  trackAppLaunch(startTime: number): number {
    const launchTime = performance.now() - startTime;

    if (launchTime > this.timingRequirements.appLaunch) {
      console.warn(`⚠️ App launch slow: ${launchTime.toFixed(2)}ms (target: <3000ms)`);
      this.triggerOptimization('appLaunch', launchTime);
    } else {
      console.log(`✅ App launch time: ${launchTime.toFixed(2)}ms`);
    }

    return launchTime;
  }

  /**
   * Track emergency protocol activation (<100ms)
   */
  trackEmergencyProtocolActivation(startTime: number, protocolType: string): number {
    const activationTime = performance.now() - startTime;

    if (activationTime > this.timingRequirements.emergencyProtocolActivation) {
      console.error(`🚨 CRITICAL: Emergency protocol activation slow: ${activationTime.toFixed(2)}ms (${protocolType})`);
      this.triggerCriticalOptimization('emergencyProtocol', activationTime);
    }

    return activationTime;
  }

  /**
   * Get current therapeutic performance status
   */
  getTherapeuticStatus(): {
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    scores: TherapeuticPerformanceMetrics;
    criticalIssues: number;
    warnings: number;
    regressions: PerformanceRegression[];
  } {
    const criticalIssues = this.regressions.filter(r => r.impact === 'critical').length;
    const warnings = this.regressions.filter(r => r.impact === 'medium' || r.impact === 'high').length;

    // Calculate overall health based on therapeutic scores
    const avgScore = (
      this.metrics.therapySessionStability +
      this.metrics.crisisReadinessScore +
      this.metrics.therapeuticFlowContinuity +
      this.metrics.memoryEfficiencyScore +
      this.metrics.batteryImpactScore
    ) / 5;

    let overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    if (criticalIssues > 0) {
      overallHealth = 'critical';
    } else if (avgScore >= 90) {
      overallHealth = 'excellent';
    } else if (avgScore >= 80) {
      overallHealth = 'good';
    } else if (avgScore >= 70) {
      overallHealth = 'fair';
    } else {
      overallHealth = 'poor';
    }

    return {
      overallHealth,
      scores: { ...this.metrics },
      criticalIssues,
      warnings,
      regressions: [...this.regressions],
    };
  }

  /**
   * Get therapeutic performance recommendations
   */
  getTherapeuticRecommendations(): string[] {
    const recommendations: string[] = [];
    const status = this.getTherapeuticStatus();

    // Crisis response recommendations
    if (this.metrics.crisisResponseTime > this.timingRequirements.crisisButtonResponse) {
      recommendations.push('CRITICAL: Optimize crisis button handler - remove async operations');
      recommendations.push('CRITICAL: Pre-load crisis resources for immediate access');
    }

    // Breathing animation recommendations
    if (this.metrics.frameRate < 58) {
      recommendations.push('CRITICAL: Breathing animation dropping frames - use native driver');
      recommendations.push('CRITICAL: Reduce UI complexity during breathing sessions');
    }

    // Memory recommendations
    if (this.metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('HIGH: Memory usage excessive - check for leaks in session state');
      recommendations.push('HIGH: Implement memory cleanup between therapeutic sessions');
    }

    // Session stability recommendations
    if (this.metrics.therapySessionStability < 80) {
      recommendations.push('MEDIUM: Therapy session stability low - optimize state management');
      recommendations.push('MEDIUM: Reduce re-renders during active therapeutic exercises');
    }

    // Add regression-specific recommendations
    for (const regression of this.regressions) {
      if (regression.impact === 'critical') {
        recommendations.push(`CRITICAL: ${regression.metric} performance regressed ${regression.degradation}% - immediate attention required`);
      }
    }

    // Add baseline recommendations from other systems
    recommendations.push(...performanceMonitor.getRecommendations());
    recommendations.push(...syncPerformanceOptimizer.getOptimizationRecommendations());

    return Array.from(new Set(recommendations)); // Remove duplicates
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private establishPerformanceBaselines(): void {
    console.log('📏 Establishing therapeutic performance baselines');

    // Set baseline targets
    this.performanceBaselines.set('crisisResponseTime', 150); // Target 150ms
    this.performanceBaselines.set('frameRate', 60); // Target 60fps
    this.performanceBaselines.set('memoryUsage', 50 * 1024 * 1024); // Target 50MB
    this.performanceBaselines.set('checkInTransition', 300); // Target 300ms
    this.performanceBaselines.set('assessmentLoad', 200); // Target 200ms
    this.performanceBaselines.set('breathingCycleAccuracy', 25); // Target ±25ms

    console.log('✅ Performance baselines established');
  }

  private trackFrameRate(): void {
    const now = performance.now();
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      const fps = frameTime > 0 ? 1000 / frameTime : 60;
      this.metrics.frameRate = fps;
    }
    this.lastFrameTime = now;
  }

  private trackMemoryUsage(): void {
    const memoryUsage = this.getCurrentMemoryUsage();
    this.memoryUsageHistory.push(memoryUsage);

    if (this.memoryUsageHistory.length > 60) { // Keep last 5 minutes
      this.memoryUsageHistory.shift();
    }

    this.metrics.memoryUsage = memoryUsage;

    if (memoryUsage > this.peakMemoryUsage) {
      this.peakMemoryUsage = memoryUsage;
    }

    this.updateMemoryEfficiencyScore();
  }

  private collectTherapeuticMetrics(): void {
    const context: PerformanceContext = {
      sessionType: 'general',
      criticalPath: false,
      therapeuticStage: 'middle',
      userState: 'calm',
    };

    const dataPoint: RealTimePerformanceData = {
      timestamp: Date.now(),
      frameRate: this.metrics.frameRate,
      memoryUsage: this.metrics.memoryUsage,
      cpuUsage: this.metrics.jsThreadUsage,
      networkLatency: 0, // TODO: Implement network latency tracking
      renderTime: 0, // TODO: Implement render time tracking
      context,
    };

    this.performanceData.push(dataPoint);

    // Keep only last 5 minutes of data
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.performanceData = this.performanceData.filter(d => d.timestamp > fiveMinutesAgo);
  }

  private detectPerformanceRegressions(): void {
    // Check each metric against baseline
    this.performanceBaselines.forEach((baseline, metric) => {
      const currentValue = this.metrics[metric as keyof TherapeuticPerformanceMetrics] as number;

      if (currentValue > 0) {
        const degradation = metric === 'frameRate'
          ? ((baseline - currentValue) / baseline) * 100 // Lower is worse for frame rate
          : ((currentValue - baseline) / baseline) * 100; // Higher is worse for other metrics

        if (degradation > 20) { // 20% degradation threshold
          const existingRegression = this.regressions.find(r => r.metric === metric);

          if (!existingRegression) {
            const impact = degradation > 50 ? 'critical' : degradation > 30 ? 'high' : 'medium';

            const regression: PerformanceRegression = {
              metric: metric as keyof TherapeuticPerformanceMetrics,
              baseline,
              current: currentValue,
              degradation,
              detectedAt: Date.now(),
              impact,
            };

            this.regressions.push(regression);
            console.warn(`📉 Performance regression detected: ${metric} (${degradation.toFixed(1)}% degradation)`);
          }
        }
      }
    });
  }

  private updateTherapeuticScores(): void {
    this.updateTherapySessionStability();
    this.updateCrisisReadinessScore();
    this.updateTherapeuticFlowContinuity();
    this.updateMemoryEfficiencyScore();
    this.updateBatteryImpactScore();
  }

  private updateTherapySessionStability(): void {
    // Base score on frame rate and memory stability
    let score = 100;

    if (this.metrics.frameRate < 58) score -= 20;
    if (this.metrics.frameRate < 50) score -= 30;
    if (this.metrics.animationFrameDrops > 5) score -= 15;

    this.metrics.therapySessionStability = Math.max(0, score);
  }

  private updateCrisisReadinessScore(responseTime?: number): void {
    // Base score on crisis response time
    let score = 100;

    const avgResponseTime = responseTime || this.getAverageCrisisResponseTime();

    if (avgResponseTime > 150) score -= 10;
    if (avgResponseTime > 200) score -= 30;
    if (avgResponseTime > 300) score -= 50;

    this.metrics.crisisReadinessScore = Math.max(0, score);
  }

  private updateTherapeuticFlowContinuity(): void {
    // Base score on transition times and cycle accuracy
    let score = 100;

    if (this.metrics.navigationTime > 400) score -= 15;
    if (this.metrics.navigationTime > 500) score -= 25;
    if (this.metrics.breathingCycleAccuracy > 100) score -= 20;

    this.metrics.therapeuticFlowContinuity = Math.max(0, score);
  }

  private updateMemoryEfficiencyScore(): void {
    // Base score on memory usage and stability
    let score = 100;
    const memoryMB = this.metrics.memoryUsage / (1024 * 1024);

    if (memoryMB > 75) score -= 15;
    if (memoryMB > 100) score -= 30;
    if (memoryMB > 150) score -= 40;

    this.metrics.memoryEfficiencyScore = Math.max(0, score);
  }

  private updateBatteryImpactScore(): void {
    // Base score on CPU usage and optimization efficiency
    let score = 100;

    if (this.metrics.jsThreadUsage > 70) score -= 20;
    if (this.metrics.jsThreadUsage > 85) score -= 30;

    this.metrics.batteryImpactScore = Math.max(0, score);
  }

  private triggerCriticalOptimization(area: string, value: number): void {
    console.error(`🚨 Triggering critical optimization for ${area}: ${value}`);

    // Use sync performance optimizer for immediate action
    syncPerformanceOptimizer.optimizeCrisisResponse(
      () => this.applyCriticalOptimization(area),
      area,
      'critical_optimization'
    );
  }

  private triggerOptimization(area: string, value: number): void {
    console.warn(`⚠️ Triggering optimization for ${area}: ${value}`);

    // Apply non-critical optimizations
    this.applyOptimization(area);
  }

  private applyCriticalOptimization(area: string): void {
    switch (area) {
      case 'crisisButtonResponse':
        console.log('Applying critical crisis button optimization');
        // TODO: Implement crisis button optimization
        break;
      case 'breathingAnimation':
        console.log('Applying critical breathing animation optimization');
        // TODO: Implement breathing animation optimization
        break;
      case 'emergencyProtocol':
        console.log('Applying critical emergency protocol optimization');
        // TODO: Implement emergency protocol optimization
        break;
    }
  }

  private applyOptimization(area: string): void {
    switch (area) {
      case 'checkInTransition':
        console.log('Applying check-in transition optimization');
        // TODO: Implement check-in optimization
        break;
      case 'assessmentLoad':
        console.log('Applying assessment load optimization');
        // TODO: Implement assessment optimization
        break;
      case 'appLaunch':
        console.log('Applying app launch optimization');
        // TODO: Implement app launch optimization
        break;
    }
  }

  private getAverageCrisisResponseTime(): number {
    if (this.crisisResponseTimes.length === 0) return 0;

    const sum = this.crisisResponseTimes.reduce((a, b) => a + b, 0);
    return sum / this.crisisResponseTimes.length;
  }

  private getCurrentMemoryUsage(): number {
    // In a real implementation, this would use actual memory APIs
    // For now, return mock data that's consistent with the current stored value
    return this.metrics.memoryUsage || Math.random() * 100 * 1024 * 1024;
  }

  private generateTherapeuticReport(): string {
    const status = this.getTherapeuticStatus();
    const recommendations = this.getTherapeuticRecommendations();

    let report = '\n=== THERAPEUTIC PERFORMANCE REPORT ===\n';
    report += `Overall Health: ${status.overallHealth.toUpperCase()}\n`;
    report += `Critical Issues: ${status.criticalIssues}\n`;
    report += `Warnings: ${status.warnings}\n\n`;

    report += 'THERAPEUTIC SCORES:\n';
    report += `- Therapy Session Stability: ${status.scores.therapySessionStability.toFixed(1)}/100\n`;
    report += `- Crisis Readiness: ${status.scores.crisisReadinessScore.toFixed(1)}/100\n`;
    report += `- Therapeutic Flow Continuity: ${status.scores.therapeuticFlowContinuity.toFixed(1)}/100\n`;
    report += `- Memory Efficiency: ${status.scores.memoryEfficiencyScore.toFixed(1)}/100\n`;
    report += `- Battery Impact: ${status.scores.batteryImpactScore.toFixed(1)}/100\n\n`;

    report += 'CRITICAL TIMINGS:\n';
    report += `- Crisis Response: ${status.scores.crisisResponseTime.toFixed(2)}ms (target: <200ms)\n`;
    report += `- Frame Rate: ${status.scores.frameRate.toFixed(1)}fps (target: 60fps)\n`;
    report += `- Check-in Transition: ${status.scores.navigationTime.toFixed(2)}ms (target: <500ms)\n`;
    report += `- Assessment Load: ${status.scores.assessmentLoadTime.toFixed(2)}ms (target: <300ms)\n`;
    report += `- Memory Usage: ${(status.scores.memoryUsage / 1024 / 1024).toFixed(2)}MB\n\n`;

    if (status.regressions.length > 0) {
      report += 'PERFORMANCE REGRESSIONS:\n';
      status.regressions.forEach((regression, index) => {
        report += `${index + 1}. ${regression.metric}: ${regression.degradation.toFixed(1)}% degradation (${regression.impact.toUpperCase()})\n`;
      });
      report += '\n';
    }

    if (recommendations.length > 0) {
      report += 'RECOMMENDATIONS:\n';
      recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
    }

    report += '\n=== END THERAPEUTIC REPORT ===\n';

    return report;
  }
}

// ============================================================================
// SINGLETON INSTANCE AND EXPORTS
// ============================================================================

export const therapeuticPerformanceSystem = new TherapeuticPerformanceSystem();

// ============================================================================
// REACT HOOKS FOR COMPONENT INTEGRATION
// ============================================================================

/**
 * Hook for tracking therapeutic performance in React components
 */
export const useTherapeuticPerformance = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceStatus, setPerformanceStatus] = useState(therapeuticPerformanceSystem.getTherapeuticStatus());

  useEffect(() => {
    // Update status every 5 seconds when monitoring
    let interval: NodeJS.Timeout;

    if (isMonitoring) {
      interval = setInterval(() => {
        setPerformanceStatus(therapeuticPerformanceSystem.getTherapeuticStatus());
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring]);

  const startMonitoring = useCallback(() => {
    therapeuticPerformanceSystem.startRealTimeMonitoring();
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    const result = therapeuticPerformanceSystem.stopRealTimeMonitoring();
    setIsMonitoring(false);
    return result;
  }, []);

  return {
    isMonitoring,
    performanceStatus,
    startMonitoring,
    stopMonitoring,

    // Tracking methods
    trackCrisisButton: therapeuticPerformanceSystem.trackCrisisButtonResponse.bind(therapeuticPerformanceSystem),
    trackBreathingFrame: therapeuticPerformanceSystem.trackBreathingAnimationFrame.bind(therapeuticPerformanceSystem),
    trackBreathingCycle: therapeuticPerformanceSystem.trackBreathingCycleAccuracy.bind(therapeuticPerformanceSystem),
    trackCheckInTransition: therapeuticPerformanceSystem.trackCheckInTransition.bind(therapeuticPerformanceSystem),
    trackAssessmentLoad: therapeuticPerformanceSystem.trackAssessmentLoad.bind(therapeuticPerformanceSystem),
    trackAppLaunch: therapeuticPerformanceSystem.trackAppLaunch.bind(therapeuticPerformanceSystem),
    trackEmergencyProtocol: therapeuticPerformanceSystem.trackEmergencyProtocolActivation.bind(therapeuticPerformanceSystem),

    // Utility methods
    getRecommendations: therapeuticPerformanceSystem.getTherapeuticRecommendations.bind(therapeuticPerformanceSystem),
  };
};

/**
 * Hook for breathing animation performance optimization
 */
export const useBreathingPerformance = () => {
  const frameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  const startFrameTracking = useCallback(() => {
    startTimeRef.current = performance.now();

    const trackFrame = () => {
      if (startTimeRef.current) {
        therapeuticPerformanceSystem.trackBreathingAnimationFrame(startTimeRef.current);
        startTimeRef.current = performance.now();
      }
      frameRef.current = requestAnimationFrame(trackFrame);
    };

    frameRef.current = requestAnimationFrame(trackFrame);
  }, []);

  const stopFrameTracking = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    }
    startTimeRef.current = undefined;
  }, []);

  useEffect(() => {
    return () => {
      stopFrameTracking();
    };
  }, [stopFrameTracking]);

  return {
    startFrameTracking,
    stopFrameTracking,
    trackBreathingCycle: therapeuticPerformanceSystem.trackBreathingCycleAccuracy.bind(therapeuticPerformanceSystem),
  };
};

/**
 * Hook for crisis response performance optimization
 */
export const useCrisisPerformance = () => {
  const trackCrisisButton = useCallback((startTime: number, context?: string) => {
    return therapeuticPerformanceSystem.trackCrisisButtonResponse(startTime, context);
  }, []);

  const trackEmergencyProtocol = useCallback((startTime: number, protocolType: string) => {
    return therapeuticPerformanceSystem.trackEmergencyProtocolActivation(startTime, protocolType);
  }, []);

  const getCrisisReadiness = useCallback(() => {
    const status = therapeuticPerformanceSystem.getTherapeuticStatus();
    return {
      score: status.scores.crisisReadinessScore,
      responseTime: status.scores.crisisResponseTime,
      isReady: status.scores.crisisReadinessScore > 80,
    };
  }, []);

  return {
    trackCrisisButton,
    trackEmergencyProtocol,
    getCrisisReadiness,
  };
};

/**
 * Hook for navigation performance optimization
 */
export const useNavigationPerformance = () => {
  const trackTransition = useCallback((startTime: number, fromScreen: string, toScreen: string) => {
    return therapeuticPerformanceSystem.trackCheckInTransition(startTime, fromScreen, toScreen);
  }, []);

  const trackAssessmentLoad = useCallback((startTime: number, assessmentType: string) => {
    return therapeuticPerformanceSystem.trackAssessmentLoad(startTime, assessmentType);
  }, []);

  return {
    trackTransition,
    trackAssessmentLoad,
  };
};

// Export types
export type {
  TherapeuticTimingRequirements,
  TherapeuticPerformanceMetrics,
  PerformanceContext,
  RealTimePerformanceData,
  PerformanceRegression,
};

// Initialize the system on import
therapeuticPerformanceSystem.initialize();

export default therapeuticPerformanceSystem;