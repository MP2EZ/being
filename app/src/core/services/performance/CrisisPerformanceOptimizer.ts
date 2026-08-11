/**
 * Crisis Performance Metrics Recorder
 *
 * WHAT THIS IS NOW: a passive recorder of crisis-detection timing metrics.
 * It measures nothing itself and scores nothing — callers hand it a duration.
 *
 * WHAT IT NO LONGER IS: a scorer. See the MAINT-398 tombstone below.
 */


import { logError, LogCategory } from '../logging';
import { DeviceEventEmitter } from 'react-native';

// Performance monitoring interface
interface PerformanceMetrics {
  crisisDetectionTime: number;
  scoringTime: number;
  interventionTime: number;
  totalResponseTime: number;
}

interface CrisisOptimizationConfig {
  enablePrecomputation: boolean;
  enableWorkerThreads: boolean;
  enableCaching: boolean;
  alertThresholdMs: number;
  targetResponseTimeMs: number;
}

/**
 * Crisis performance metrics recorder
 */
export class CrisisPerformanceOptimizer {
  private static config: CrisisOptimizationConfig = {
    enablePrecomputation: true,
    enableWorkerThreads: false, // Disabled for React Native compatibility
    enableCaching: true,
    alertThresholdMs: 50,
    targetResponseTimeMs: 50
  };

  private static performanceHistory: PerformanceMetrics[] = [];
  private static alertCount = 0;

  // DELETED (DEBUG-314): `triggerOptimizedEmergencyResponse`, its private
  // `showCrisisAlert`, and `logCrisisInterventionOptimized` lived here and
  // dialed 988/741741/911 through bare `Linking.openURL`.
  //
  // They were deleted rather than converted to `openCrisisUrl` because
  // `triggerOptimizedEmergencyResponse` had ZERO callers anywhere in src/ or
  // __tests__/, and the other two were reachable only from it. Converting dead
  // code would have preserved a second copy of the exact alert copy FEAT-283
  // extracted `crisisAlert.ts` to deduplicate — and an allowlisted, guarded
  // duplicate reads as endorsement, so the next person adds a caller.
  //
  // The copy had already drifted structurally from canonical: it was
  // `cancelable: false` *with* an `onDismiss` resolver, giving it a dismiss
  // path canonical deliberately does not have. `logCrisisInterventionOptimized`
  // also wrote `crisis_${assessmentId}` as plaintext JSON to a bare AsyncStorage
  // key matching no erasure prefix — a second latent writer of the DEBUG-305
  // erasure-orphan family.
  //
  // `Alert` and `Linking` went with them. This module no longer dials or alerts
  // at all, which is why it needs no entry in the crisis-dial guard's allowlist.

  // DELETED (MAINT-398): `detectCrisisOptimized`, `OptimizedScoringService`
  // (`fastCalculatePHQ9Score` / `fastCalculateGAD7Score`), `ScoringCache`, the
  // `PHQ9_CRISIS_LOOKUP` / `GAD7_CRISIS_LOOKUP` tables, and
  // `precomputeCrisisThresholds` (plus its module-load invocation) lived here.
  //
  // Together they were a SECOND implementation of PHQ-9 suicidal-ideation and
  // score-tier crisis detection, parallel to canonical `detectCrisis`
  // (features/crisis/types/safety.ts). They were removed rather than
  // consolidated because the whole consumer chain was unreachable:
  // `useAssessmentPerformance` was imported only by `AssessmentIntegrationExample`,
  // a demo component with zero importers of its own.
  //
  // The two paths had ALREADY diverged, and every divergence failed toward
  // under-detection. Measured by a parity harness run against both scorers
  // before deletion (29 cases, 5 disagreements — full table in the MAINT-398
  // PR body):
  //
  //   - PHQ-9 total 15–19, Q9=0: canonical raises `phq9_moderate_severe_score`;
  //     the optimizer returned NULL. Its lookup table was {20..27}, so it never
  //     received the DEBUG-229 / MAINT-226 Decision E support-tier fix. A
  //     straight false negative on "≥15 = support resources offered."
  //   - PHQ-9 total ≥20, Q9=0: canonical raises `phq9_severe_score`; the
  //     optimizer emitted `phq9_moderate_severe_score`. That value is absent
  //     from `validateCrisisDetection`'s valid-trigger allowlist AND is the
  //     exact value `isInterventionTier` treats as "support tier, not
  //     intervention" — so an active-intervention case was routed to the
  //     support tier.
  //   - Malformed input (wrong answer count): canonical throws and the caller
  //     sees it; the optimizer's catch swallowed everything into `return null`,
  //     making a scoring FAILURE indistinguishable from "no crisis". On a
  //     zero-false-negative path it failed OPEN.
  //   - Q9>0 additionally hardcoded `triggerValue = 1` where canonical carries
  //     the real `totalScore`.
  //
  // Do not reintroduce a second scorer. PHQ-9 / GAD-7 threshold logic has
  // exactly one home — `detectCrisis` in features/crisis/types/safety.ts — and
  // `crisis-thresholds.test.ts` now carries a structural guard that fails if
  // scoring reappears outside the allowlisted canonical files.

  /**
   * Performance metrics recording
   */
  static recordPerformanceMetric(metric: PerformanceMetrics): void {
    this.performanceHistory.push(metric);

    // Keep only last 100 metrics
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }

    if (metric.totalResponseTime > this.config.alertThresholdMs) {
      this.handlePerformanceAlert(metric.totalResponseTime, 'crisis_detection');
    }

    // Emit performance event for real-time monitoring
    DeviceEventEmitter.emit('performance_metric_recorded', metric);
  }

  /**
   * Performance alert handling
   */
  private static handlePerformanceAlert(duration: number, operation: string): void {
    this.alertCount++;

    logError(LogCategory.SYSTEM, `PERFORMANCE ALERT: ${operation} took ${duration}ms (target: <${this.config.alertThresholdMs}ms)`);

    // Emit alert for external monitoring
    DeviceEventEmitter.emit('performance_alert', {
      operation,
      duration,
      target: this.config.alertThresholdMs,
      alertCount: this.alertCount,
      timestamp: Date.now()
    });

    // Critical performance degradation handling
    if (duration > this.config.alertThresholdMs * 2) {
      logError(LogCategory.SYSTEM, `CRITICAL PERFORMANCE DEGRADATION: ${operation} is severely slow`);
    }
  }

  /**
   * Performance optimization configuration
   */
  static configureOptimizations(config: Partial<CrisisOptimizationConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('Crisis performance optimizer configured:', this.config);
  }

  /**
   * Get current performance statistics
   */
  static getPerformanceStats(): {
    averageCrisisDetection: number;
    averageScoring: number;
    averageIntervention: number;
    averageTotal: number;
    alertCount: number;
    recentMetrics: PerformanceMetrics[];
  } {
    if (this.performanceHistory.length === 0) {
      return {
        averageCrisisDetection: 0,
        averageScoring: 0,
        averageIntervention: 0,
        averageTotal: 0,
        alertCount: this.alertCount,
        recentMetrics: []
      };
    }

    const metrics = this.performanceHistory;
    const count = metrics.length;

    return {
      averageCrisisDetection: metrics.reduce((sum, m) => sum + m.crisisDetectionTime, 0) / count,
      averageScoring: metrics.reduce((sum, m) => sum + m.scoringTime, 0) / count,
      averageIntervention: metrics.reduce((sum, m) => sum + m.interventionTime, 0) / count,
      averageTotal: metrics.reduce((sum, m) => sum + m.totalResponseTime, 0) / count,
      alertCount: this.alertCount,
      recentMetrics: metrics.slice(-10) // Last 10 metrics
    };
  }

  /**
   * Reset performance tracking
   */
  static resetPerformanceTracking(): void {
    this.performanceHistory = [];
    this.alertCount = 0;
    console.log('Crisis performance tracking reset');
  }
}

export default CrisisPerformanceOptimizer;
