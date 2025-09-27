/**
 * CrisisResponseMonitor - Performance monitoring for crisis-critical actions
 * CRITICAL: Ensures crisis response times meet <200ms safety requirement
 */

import { Alert } from 'react-native';

export interface CrisisPerformanceMetrics {
  actionName: string;
  responseTime: number;
  timestamp: number;
  withinThreshold: boolean;
}

export class CrisisResponseMonitor {
  private static readonly RESPONSE_TIME_THRESHOLD = 200; // ms - critical safety requirement
  private static readonly MAX_CRISIS_TIMEOUT = 200; // ms - absolute maximum
  private static performanceLog: CrisisPerformanceMetrics[] = [];

  /**
   * Execute crisis-critical action with guaranteed performance monitoring
   */
  static async executeCrisisAction<T>(
    actionName: string,
    action: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();

    try {
      // Set strict timeout to guarantee max response time
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Crisis action timeout')), this.MAX_CRISIS_TIMEOUT)
      );

      const result = await Promise.race([action(), timeoutPromise]);

      const responseTime = performance.now() - startTime;
      this.logCrisisPerformance(actionName, responseTime, startTime);

      return result;
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.logCrisisPerformance(actionName, responseTime, startTime);

      // Immediate fallback for any failures
      this.triggerEmergencyFallback(actionName);
      throw error;
    }
  }

  /**
   * Monitor synchronous crisis action performance
   */
  static monitorSyncCrisisAction(actionName: string, startTime: number): number {
    const responseTime = performance.now() - startTime;
    this.logCrisisPerformance(actionName, responseTime, startTime);
    return responseTime;
  }

  /**
   * Log crisis action performance for safety analysis
   */
  private static logCrisisPerformance(
    actionName: string,
    responseTime: number,
    startTime: number
  ): void {
    const withinThreshold = responseTime <= this.RESPONSE_TIME_THRESHOLD;

    const metrics: CrisisPerformanceMetrics = {
      actionName,
      responseTime,
      timestamp: startTime,
      withinThreshold
    };

    this.performanceLog.push(metrics);

    // Log violations for immediate investigation
    if (!withinThreshold) {
      console.error(
        `🚨 CRISIS SAFETY VIOLATION: ${actionName} took ${responseTime.toFixed(2)}ms (threshold: ${this.RESPONSE_TIME_THRESHOLD}ms)`
      );

      // In development, alert on violations for immediate attention
      if (__DEV__) {
        console.warn(
          `Crisis response time violation detected. This is a safety-critical issue.`
        );
      }
    }

    // Keep only recent performance data
    if (this.performanceLog.length > 100) {
      this.performanceLog = this.performanceLog.slice(-50);
    }
  }

  /**
   * Immediate fallback when crisis actions fail or timeout
   */
  private static triggerEmergencyFallback(actionName: string): void {
    // Synchronous emergency UI update - no async delays
    Alert.alert(
      'Crisis Support Available',
      'If you need immediate help:\n\n• Call 988 (Crisis Lifeline)\n• Call 911 (Emergency)\n• Go to nearest emergency room',
      [{ text: 'OK' }]
    );
  }

  /**
   * Get crisis performance analytics for safety validation
   */
  static getCrisisPerformanceReport(): {
    totalActions: number;
    violationRate: number;
    averageResponseTime: number;
    recentViolations: CrisisPerformanceMetrics[];
  } {
    const totalActions = this.performanceLog.length;
    const violations = this.performanceLog.filter(m => !m.withinThreshold);

    return {
      totalActions,
      violationRate: totalActions > 0 ? (violations.length / totalActions) * 100 : 0,
      averageResponseTime: totalActions > 0
        ? this.performanceLog.reduce((sum, m) => sum + m.responseTime, 0) / totalActions
        : 0,
      recentViolations: violations.slice(-10)
    };
  }

  /**
   * Reset performance monitoring (for testing)
   */
  static resetPerformanceLog(): void {
    this.performanceLog = [];
  }

  /**
   * Check if system is meeting crisis performance requirements
   */
  static isCrisisPerformanceHealthy(): boolean {
    const report = this.getCrisisPerformanceReport();
    return report.violationRate < 5; // Allow max 5% violation rate
  }
}

export default CrisisResponseMonitor;