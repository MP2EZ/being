/**
 * Clinical Services Index - Type-Safe Clinical Calculation & Timing Services
 *
 * This module exports all certified clinical services with zero-tolerance
 * type safety for PHQ-9/GAD-7 assessments and therapeutic timing.
 *
 * CRITICAL: These services enforce 100% clinical accuracy and must be used
 * for all clinical calculations in the application.
 */

// Clinical Calculation Service - Certified for 100% scoring accuracy
export {
  ClinicalCalculationService,
  clinicalCalculator
} from './ClinicalCalculationService';

// Therapeutic Timing Service - Precision timing for clinical effectiveness
export {
  TherapeuticTimingService,
  therapeuticTimer
} from './TherapeuticTimingService';

// Re-export clinical types for convenience
export type {
  ValidatedPHQ9Score,
  ValidatedGAD7Score,
  ValidatedSeverity,
  CrisisDetected,
  SuicidalIdeationDetected,
  ValidatedBreathingDuration,
  ValidatedTotalSession,
  ValidatedCrisisResponse,
  TherapeuticFrameRate,
  FrameTimingMs,
  ClinicalCalculationCertified,
  TherapeuticTimingCertified,
  ClinicalValidationState,
  ClinicallyValidatedProps,
  ValidatedAssessmentQuestionProps,
  ValidatedScoreDisplayProps,
  ValidatedCrisisAlertProps,
  ValidatedTherapeuticCheckIn,
  ValidatedBreathingSession
} from '../../types/clinical-type-safety';

/**
 * Clinical Service Initialization & Validation
 *
 * This function validates that all clinical services are properly
 * initialized and meet accuracy requirements before use.
 */
export const initializeClinicalServices = (): {
  calculationService: ClinicalCalculationService;
  timingService: TherapeuticTimingService;
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  try {
    // Test clinical calculation accuracy
    const calculationTestPassed = clinicalCalculator.runClinicalAccuracyTest();
    if (!calculationTestPassed) {
      errors.push('Clinical calculation service failed accuracy tests');
    }

    // Test therapeutic timing accuracy
    const timingMeetsClinical = therapeuticTimer.meetsClinicalStandards();
    if (!timingMeetsClinical) {
      errors.push('Therapeutic timing service does not meet clinical standards');
    }

    return {
      calculationService: clinicalCalculator,
      timingService: therapeuticTimer,
      isValid: errors.length === 0,
      errors
    };

  } catch (error) {
    errors.push(`Clinical services initialization failed: ${error.message}`);
    return {
      calculationService: clinicalCalculator,
      timingService: therapeuticTimer,
      isValid: false,
      errors
    };
  }
};

/**
 * Clinical Services Health Check
 *
 * Performs comprehensive validation of all clinical services
 * for use in production health monitoring.
 */
export const performClinicalHealthCheck = (): {
  status: 'healthy' | 'degraded' | 'critical';
  checks: Array<{
    service: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    details?: any;
  }>;
  timestamp: string;
} => {
  const checks: Array<{
    service: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    details?: any;
  }> = [];

  // Check clinical calculation service
  try {
    const calculationAccuracy = clinicalCalculator.runClinicalAccuracyTest();
    checks.push({
      service: 'ClinicalCalculationService',
      status: calculationAccuracy ? 'pass' : 'fail',
      message: calculationAccuracy
        ? 'All clinical calculations are accurate'
        : 'Clinical calculation accuracy test failed',
      details: {
        validationState: clinicalCalculator.getValidationState()
      }
    });
  } catch (error) {
    checks.push({
      service: 'ClinicalCalculationService',
      status: 'fail',
      message: `Clinical calculation service error: ${error.message}`,
      details: { error: error.message }
    });
  }

  // Check therapeutic timing service
  try {
    const timingMeetsClinical = therapeuticTimer.meetsClinicalStandards();
    const performanceMetrics = therapeuticTimer.getPerformanceMetrics();

    checks.push({
      service: 'TherapeuticTimingService',
      status: timingMeetsClinical ? 'pass' : 'warn',
      message: timingMeetsClinical
        ? 'Therapeutic timing meets clinical standards'
        : 'Therapeutic timing performance below optimal',
      details: {
        performanceMetrics,
        report: therapeuticTimer.generateTimingReport()
      }
    });
  } catch (error) {
    checks.push({
      service: 'TherapeuticTimingService',
      status: 'fail',
      message: `Therapeutic timing service error: ${error.message}`,
      details: { error: error.message }
    });
  }

  // Determine overall status
  const failures = checks.filter(check => check.status === 'fail');
  const warnings = checks.filter(check => check.status === 'warn');

  let status: 'healthy' | 'degraded' | 'critical';
  if (failures.length > 0) {
    status = 'critical';
  } else if (warnings.length > 0) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  return {
    status,
    checks,
    timestamp: new Date().toISOString()
  };
};

/**
 * Emergency Clinical Service Reset
 *
 * Resets all clinical services to a known good state.
 * Use only in emergency situations or during testing.
 */
export const emergencyResetClinicalServices = (): {
  success: boolean;
  message: string;
} => {
  try {
    // Reset timing service metrics
    therapeuticTimer.resetMetrics();

    // Verify services after reset
    const healthCheck = performClinicalHealthCheck();

    if (healthCheck.status === 'critical') {
      return {
        success: false,
        message: 'Clinical services could not be restored to healthy state'
      };
    }

    return {
      success: true,
      message: 'Clinical services successfully reset and validated'
    };

  } catch (error) {
    return {
      success: false,
      message: `Emergency reset failed: ${error.message}`
    };
  }
};

// Development mode validation
if (__DEV__) {
  const initialization = initializeClinicalServices();
  if (!initialization.isValid) {
    console.error('CRITICAL: Clinical services initialization failed:', initialization.errors);
  } else {
    console.log('✅ Clinical services initialized and validated');
  }

  // Perform initial health check
  const healthCheck = performClinicalHealthCheck();
  console.log('Clinical services health check:', healthCheck.status);

  if (healthCheck.status !== 'healthy') {
    console.warn('Clinical services health check warnings/failures:',
      healthCheck.checks.filter(c => c.status !== 'pass')
    );
  }
}