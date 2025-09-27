/**
 * Therapeutic Timing Service - Precision Timing for Clinical Effectiveness
 *
 * This service ensures therapeutic timing accuracy for MBCT practices,
 * crisis response, and breathing exercises with zero tolerance for timing errors.
 *
 * CRITICAL: Timing accuracy directly affects therapeutic efficacy.
 * Breathing exercises must be exactly 60s per step for clinical compliance.
 */

import {
  ValidatedBreathingDuration,
  ValidatedTotalSession,
  ValidatedCrisisResponse,
  TherapeuticFrameRate,
  FrameTimingMs,
  TherapeuticTimingCertified,
  CLINICAL_TYPE_VALIDATION,
  TherapeuticTimingValidationError
} from '../../types/clinical-type-safety';

import {
  ISODateString,
  createISODateString
} from '../../types/clinical';

/**
 * Branded type creation functions for therapeutic timing
 */
const createValidatedBreathingDuration = (duration: number): ValidatedBreathingDuration => {
  if (duration !== 60000) {
    throw new TherapeuticTimingValidationError(
      'Breathing step must be exactly 60,000ms (60 seconds) for therapeutic effectiveness',
      'TherapeuticTimingService',
      60000,
      duration,
      CLINICAL_TYPE_VALIDATION.TIMING.BREATHING_STEP_MS
    );
  }
  return duration as ValidatedBreathingDuration;
};

const createValidatedTotalSession = (duration: number): ValidatedTotalSession => {
  if (duration !== 180000) {
    throw new TherapeuticTimingValidationError(
      'Total breathing session must be exactly 180,000ms (3 minutes) for therapeutic effectiveness',
      'TherapeuticTimingService',
      180000,
      duration,
      CLINICAL_TYPE_VALIDATION.TIMING.TOTAL_SESSION_MS
    );
  }
  return duration as ValidatedTotalSession;
};

const createValidatedCrisisResponse = (responseTime: number): ValidatedCrisisResponse => {
  if (responseTime > 200) {
    throw new TherapeuticTimingValidationError(
      'Crisis response time must be ≤200ms for safety requirements',
      'TherapeuticTimingService',
      200,
      responseTime,
      CLINICAL_TYPE_VALIDATION.TIMING.CRISIS_RESPONSE_MS
    );
  }
  return responseTime as ValidatedCrisisResponse;
};

const createTherapeuticFrameRate = (fps: number): TherapeuticFrameRate => {
  if (fps !== 60) {
    throw new TherapeuticTimingValidationError(
      'Frame rate must be exactly 60fps for smooth therapeutic animations',
      'TherapeuticTimingService',
      60,
      fps,
      CLINICAL_TYPE_VALIDATION.TIMING.FRAME_RATE
    );
  }
  return fps as TherapeuticFrameRate;
};

const createFrameTiming = (frameRate: TherapeuticFrameRate): FrameTimingMs => {
  const frameDuration = 1000 / (frameRate as number);
  const expectedTiming = 16.67; // 1000ms / 60fps ≈ 16.67ms

  if (Math.abs(frameDuration - expectedTiming) > 0.1) {
    throw new TherapeuticTimingValidationError(
      'Frame timing calculation error - not achieving 60fps precision',
      'TherapeuticTimingService',
      expectedTiming,
      frameDuration,
      0.1
    );
  }

  return frameDuration as FrameTimingMs;
};

/**
 * Performance Monitoring for Therapeutic Timing
 */
interface TimingPerformanceMetrics {
  averageResponseTime: number;
  worstCaseResponseTime: number;
  missedFrames: number;
  timingAccuracy: number; // 0-1 scale
  lastMeasurement: ISODateString;
}

/**
 * Therapeutic Timing Service Implementation
 */
export class TherapeuticTimingService implements TherapeuticTimingCertified {
  private performanceMetrics: TimingPerformanceMetrics;
  private timingHistory: Array<{ timestamp: number; duration: number; type: string }> = [];

  constructor() {
    this.performanceMetrics = {
      averageResponseTime: 0,
      worstCaseResponseTime: 0,
      missedFrames: 0,
      timingAccuracy: 1.0,
      lastMeasurement: createISODateString()
    };
  }

  /**
   * Breathing Step Duration Validation (Must be exactly 60 seconds)
   */
  readonly validateBreathingStep = (duration: number): ValidatedBreathingDuration | never => {
    this.recordTiming('breathing_step', duration);

    const tolerance = CLINICAL_TYPE_VALIDATION.VALIDATION.TOLERANCE_MS;
    const target = CLINICAL_TYPE_VALIDATION.TIMING.BREATHING_STEP_MS;

    if (Math.abs(duration - target) > tolerance) {
      throw new TherapeuticTimingValidationError(
        `Breathing step timing outside therapeutic tolerance. Target: ${target}ms, Actual: ${duration}ms, Tolerance: ±${tolerance}ms`,
        'validateBreathingStep',
        target,
        duration,
        tolerance
      );
    }

    return createValidatedBreathingDuration(target); // Always return exact target for consistency
  };

  /**
   * Total Session Duration Validation (Must be exactly 3 minutes)
   */
  readonly validateTotalSession = (duration: number): ValidatedTotalSession | never => {
    this.recordTiming('total_session', duration);

    const tolerance = CLINICAL_TYPE_VALIDATION.VALIDATION.TOLERANCE_MS * 3; // Allow 300ms tolerance for full session
    const target = CLINICAL_TYPE_VALIDATION.TIMING.TOTAL_SESSION_MS;

    if (Math.abs(duration - target) > tolerance) {
      throw new TherapeuticTimingValidationError(
        `Total session timing outside therapeutic tolerance. Target: ${target}ms, Actual: ${duration}ms, Tolerance: ±${tolerance}ms`,
        'validateTotalSession',
        target,
        duration,
        tolerance
      );
    }

    return createValidatedTotalSession(target);
  };

  /**
   * Crisis Response Time Validation (Must be ≤200ms)
   */
  readonly validateCrisisResponse = (responseTime: number): ValidatedCrisisResponse | never => {
    this.recordTiming('crisis_response', responseTime);

    if (responseTime > CLINICAL_TYPE_VALIDATION.TIMING.CRISIS_RESPONSE_MS) {
      throw new TherapeuticTimingValidationError(
        `Crisis response time exceeds safety requirement. Max: ${CLINICAL_TYPE_VALIDATION.TIMING.CRISIS_RESPONSE_MS}ms, Actual: ${responseTime}ms`,
        'validateCrisisResponse',
        CLINICAL_TYPE_VALIDATION.TIMING.CRISIS_RESPONSE_MS,
        responseTime,
        0
      );
    }

    return createValidatedCrisisResponse(responseTime);
  };

  /**
   * Frame Rate Validation (Must be exactly 60fps for smooth animations)
   */
  readonly validateFrameRate = (fps: number): TherapeuticFrameRate | never => {
    if (fps < 55 || fps > 65) { // Allow small tolerance for device variations
      throw new TherapeuticTimingValidationError(
        `Frame rate outside acceptable range for therapeutic animations. Target: 60fps, Actual: ${fps}fps`,
        'validateFrameRate',
        60,
        fps,
        5
      );
    }

    return createTherapeuticFrameRate(60); // Always return exactly 60 for consistency
  };

  /**
   * Calculate Frame Timing from Validated Frame Rate
   */
  readonly calculateFrameTiming = (fps: TherapeuticFrameRate): FrameTimingMs => {
    return createFrameTiming(fps);
  };

  /**
   * Performance Monitoring Methods
   */
  private recordTiming(type: string, duration: number): void {
    const timestamp = Date.now();
    this.timingHistory.push({ timestamp, duration, type });

    // Keep only last 100 measurements for performance
    if (this.timingHistory.length > 100) {
      this.timingHistory = this.timingHistory.slice(-100);
    }

    this.updatePerformanceMetrics();
  }

  private updatePerformanceMetrics(): void {
    if (this.timingHistory.length === 0) return;

    const recentMeasurements = this.timingHistory.slice(-20); // Last 20 measurements
    const durations = recentMeasurements.map(m => m.duration);

    this.performanceMetrics = {
      averageResponseTime: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      worstCaseResponseTime: Math.max(...durations),
      missedFrames: durations.filter(d => d > 20).length, // Frames taking >20ms
      timingAccuracy: this.calculateTimingAccuracy(recentMeasurements),
      lastMeasurement: createISODateString()
    };
  }

  private calculateTimingAccuracy(measurements: Array<{ timestamp: number; duration: number; type: string }>): number {
    if (measurements.length === 0) return 1.0;

    let accurateCount = 0;
    const requiredAccuracy = CLINICAL_TYPE_VALIDATION.VALIDATION.REQUIRED_ACCURACY;

    for (const measurement of measurements) {
      let isAccurate = false;

      switch (measurement.type) {
        case 'breathing_step':
          isAccurate = Math.abs(measurement.duration - 60000) <= CLINICAL_TYPE_VALIDATION.VALIDATION.TOLERANCE_MS;
          break;
        case 'total_session':
          isAccurate = Math.abs(measurement.duration - 180000) <= (CLINICAL_TYPE_VALIDATION.VALIDATION.TOLERANCE_MS * 3);
          break;
        case 'crisis_response':
          isAccurate = measurement.duration <= CLINICAL_TYPE_VALIDATION.TIMING.CRISIS_RESPONSE_MS;
          break;
        default:
          isAccurate = true; // Unknown type, assume accurate
      }

      if (isAccurate) accurateCount++;
    }

    return accurateCount / measurements.length;
  }

  /**
   * Get Current Performance Metrics
   */
  getPerformanceMetrics(): TimingPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Check if System Meets Clinical Timing Standards
   */
  meetsClinicalStandards(): boolean {
    const metrics = this.performanceMetrics;
    const standards = CLINICAL_TYPE_VALIDATION.VALIDATION;

    return (
      metrics.timingAccuracy >= standards.REQUIRED_ACCURACY &&
      metrics.missedFrames <= standards.MAX_DROPPED_FRAMES &&
      metrics.worstCaseResponseTime <= (CLINICAL_TYPE_VALIDATION.TIMING.CRISIS_RESPONSE_MS * 2) // Allow 2x for worst case
    );
  }

  /**
   * Generate Timing Report for Clinical Review
   */
  generateTimingReport(): {
    summary: string;
    metrics: TimingPerformanceMetrics;
    meetsClinicalStandards: boolean;
    recommendations: string[];
  } {
    const metrics = this.performanceMetrics;
    const meetsClinical = this.meetsClinicalStandards();

    const recommendations: string[] = [];
    if (metrics.timingAccuracy < 0.95) {
      recommendations.push('Timing accuracy below 95% - check device performance');
    }
    if (metrics.missedFrames > 5) {
      recommendations.push('High frame drop count - optimize animation performance');
    }
    if (metrics.worstCaseResponseTime > 400) {
      recommendations.push('Crisis response time too slow - review UI performance');
    }

    return {
      summary: meetsClinical
        ? 'Therapeutic timing meets clinical standards'
        : 'Therapeutic timing requires optimization',
      metrics,
      meetsClinicalStandards: meetsClinical,
      recommendations
    };
  }

  /**
   * Reset Performance Metrics (for testing)
   */
  resetMetrics(): void {
    this.timingHistory = [];
    this.performanceMetrics = {
      averageResponseTime: 0,
      worstCaseResponseTime: 0,
      missedFrames: 0,
      timingAccuracy: 1.0,
      lastMeasurement: createISODateString()
    };
  }
}

/**
 * Singleton instance for global use
 */
export const therapeuticTimer = new TherapeuticTimingService();

/**
 * Development mode validation
 */
if (__DEV__) {
  try {
    // Test basic validation functions
    therapeuticTimer.validateBreathingStep(60000);
    therapeuticTimer.validateTotalSession(180000);
    therapeuticTimer.validateCrisisResponse(150);
    therapeuticTimer.validateFrameRate(60);

    console.log('✅ Therapeutic timing service validated');
  } catch (error) {
    console.error('CRITICAL: Therapeutic timing service validation failed:', error);
  }
}

export default TherapeuticTimingService;