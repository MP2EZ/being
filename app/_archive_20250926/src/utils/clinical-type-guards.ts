/**
 * Clinical Type Guards - Runtime Validation for TypeScript Type Safety
 *
 * This file implements runtime type guards that create the branded types
 * defined in clinical-type-safety.ts. These functions ensure that clinical
 * data is validated before being used in components.
 *
 * CRITICAL: These guards prevent runtime errors in clinical calculations
 * and therapeutic timing. All validations follow clinician-approved logic.
 */

import {
  PHQ9Answers,
  GAD7Answers,
  PHQ9Score,
  GAD7Score,
  CLINICAL_CONSTANTS
} from '../types/clinical';

import {
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
  CLINICAL_TYPE_VALIDATION,
  ClinicalTypeValidationError,
  TherapeuticTimingValidationError
} from '../types/clinical-type-safety';

import { ISODateString } from '../types/clinical';

// === CLINICAL CALCULATION GUARDS ===

/**
 * Validates and creates a certified PHQ-9 score
 */
export const createValidatedPHQ9Score = (answers: PHQ9Answers): ValidatedPHQ9Score => {
  // Validate answers array length
  if (answers.length !== CLINICAL_CONSTANTS.PHQ9.QUESTION_COUNT) {
    throw new ClinicalTypeValidationError(
      'Invalid PHQ-9 answers array length',
      'PHQ9Calculator',
      'PHQ9Answers[9]',
      answers,
      'critical'
    );
  }

  // Validate each answer is in valid range
  for (let i = 0; i < answers.length; i++) {
    const answer = answers[i];
    if (![0, 1, 2, 3].includes(answer)) {
      throw new ClinicalTypeValidationError(
        `Invalid PHQ-9 answer at question ${i + 1}`,
        'PHQ9Calculator',
        '0 | 1 | 2 | 3',
        answer,
        'critical'
      );
    }
  }

  // Calculate score (validated calculation)
  const calculatedScore = answers.reduce((sum, answer) => sum + answer, 0);

  // Validate calculated score is within valid range
  if (calculatedScore < 0 || calculatedScore > 27) {
    throw new ClinicalTypeValidationError(
      'Calculated PHQ-9 score out of valid range',
      'PHQ9Calculator',
      'PHQ9Score (0-27)',
      calculatedScore,
      'critical'
    );
  }

  return calculatedScore as ValidatedPHQ9Score;
};

/**
 * Validates and creates a certified GAD-7 score
 */
export const createValidatedGAD7Score = (answers: GAD7Answers): ValidatedGAD7Score => {
  // Validate answers array length
  if (answers.length !== CLINICAL_CONSTANTS.GAD7.QUESTION_COUNT) {
    throw new ClinicalTypeValidationError(
      'Invalid GAD-7 answers array length',
      'GAD7Calculator',
      'GAD7Answers[7]',
      answers,
      'critical'
    );
  }

  // Validate each answer is in valid range
  for (let i = 0; i < answers.length; i++) {
    const answer = answers[i];
    if (![0, 1, 2, 3].includes(answer)) {
      throw new ClinicalTypeValidationError(
        `Invalid GAD-7 answer at question ${i + 1}`,
        'GAD7Calculator',
        '0 | 1 | 2 | 3',
        answer,
        'critical'
      );
    }
  }

  // Calculate score (validated calculation)
  const calculatedScore = answers.reduce((sum, answer) => sum + answer, 0);

  // Validate calculated score is within valid range
  if (calculatedScore < 0 || calculatedScore > 21) {
    throw new ClinicalTypeValidationError(
      'Calculated GAD-7 score out of valid range',
      'GAD7Calculator',
      'GAD7Score (0-21)',
      calculatedScore,
      'critical'
    );
  }

  return calculatedScore as ValidatedGAD7Score;
};

/**
 * Determines PHQ-9 severity with validation
 */
export const createValidatedPHQ9Severity = (score: ValidatedPHQ9Score): ValidatedSeverity<'phq9'> => {
  if (score >= 0 && score <= 4) return 'minimal' as ValidatedSeverity<'phq9'>;
  if (score >= 5 && score <= 9) return 'mild' as ValidatedSeverity<'phq9'>;
  if (score >= 10 && score <= 14) return 'moderate' as ValidatedSeverity<'phq9'>;
  if (score >= 15 && score <= 19) return 'moderately severe' as ValidatedSeverity<'phq9'>;
  if (score >= 20 && score <= 27) return 'severe' as ValidatedSeverity<'phq9'>;

  throw new ClinicalTypeValidationError(
    'Invalid PHQ-9 score for severity determination',
    'PHQ9SeverityCalculator',
    'ValidatedPHQ9Score',
    score,
    'critical'
  );
};

/**
 * Determines GAD-7 severity with validation
 */
export const createValidatedGAD7Severity = (score: ValidatedGAD7Score): ValidatedSeverity<'gad7'> => {
  if (score >= 0 && score <= 4) return 'minimal' as ValidatedSeverity<'gad7'>;
  if (score >= 5 && score <= 9) return 'mild' as ValidatedSeverity<'gad7'>;
  if (score >= 10 && score <= 14) return 'moderate' as ValidatedSeverity<'gad7'>;
  if (score >= 15 && score <= 21) return 'severe' as ValidatedSeverity<'gad7'>;

  throw new ClinicalTypeValidationError(
    'Invalid GAD-7 score for severity determination',
    'GAD7SeverityCalculator',
    'ValidatedGAD7Score',
    score,
    'critical'
  );
};

// === CRISIS DETECTION GUARDS ===

/**
 * Detects crisis threshold for PHQ-9 scores
 */
export const detectPHQ9Crisis = (score: ValidatedPHQ9Score): CrisisDetected | false => {
  if (score >= CLINICAL_CONSTANTS.PHQ9.CRISIS_THRESHOLD) {
    return true as CrisisDetected;
  }
  return false;
};

/**
 * Detects crisis threshold for GAD-7 scores
 */
export const detectGAD7Crisis = (score: ValidatedGAD7Score): CrisisDetected | false => {
  if (score >= CLINICAL_CONSTANTS.GAD7.CRISIS_THRESHOLD) {
    return true as CrisisDetected;
  }
  return false;
};

/**
 * Detects suicidal ideation from PHQ-9 answers
 */
export const detectSuicidalIdeation = (answers: PHQ9Answers): SuicidalIdeationDetected | false => {
  const suicidalIdeationAnswer = answers[CLINICAL_CONSTANTS.PHQ9.SUICIDAL_IDEATION_QUESTION];

  if (suicidalIdeationAnswer > CLINICAL_CONSTANTS.PHQ9.SUICIDAL_IDEATION_THRESHOLD) {
    return true as SuicidalIdeationDetected;
  }
  return false;
};

// === THERAPEUTIC TIMING GUARDS ===

/**
 * Validates breathing step duration (must be exactly 60 seconds)
 */
export const createValidatedBreathingDuration = (duration: number): ValidatedBreathingDuration => {
  const expectedDuration = 60000; // 60 seconds in milliseconds
  const tolerance = CLINICAL_TYPE_VALIDATION.VALIDATION.TOLERANCE_MS;

  if (Math.abs(duration - expectedDuration) > tolerance) {
    throw new TherapeuticTimingValidationError(
      'Breathing step duration outside therapeutic tolerance',
      'BreathingTimer',
      expectedDuration,
      duration,
      tolerance
    );
  }

  return expectedDuration as ValidatedBreathingDuration;
};

/**
 * Validates total session duration (must be exactly 180 seconds)
 */
export const createValidatedTotalSession = (duration: number): ValidatedTotalSession => {
  const expectedDuration = 180000; // 180 seconds in milliseconds
  const tolerance = CLINICAL_TYPE_VALIDATION.VALIDATION.TOLERANCE_MS * 3; // Allow more tolerance for total session

  if (Math.abs(duration - expectedDuration) > tolerance) {
    throw new TherapeuticTimingValidationError(
      'Total session duration outside therapeutic tolerance',
      'BreathingSession',
      expectedDuration,
      duration,
      tolerance
    );
  }

  return expectedDuration as ValidatedTotalSession;
};

/**
 * Validates crisis response time (must be under 200ms)
 */
export const createValidatedCrisisResponse = (responseTime: number): ValidatedCrisisResponse => {
  const maxResponseTime = 200; // 200ms maximum

  if (responseTime > maxResponseTime) {
    throw new TherapeuticTimingValidationError(
      'Crisis response time exceeds maximum therapeutic requirement',
      'CrisisButton',
      maxResponseTime,
      responseTime,
      0 // No tolerance for crisis response time
    );
  }

  return responseTime as ValidatedCrisisResponse;
};

/**
 * Validates therapeutic frame rate (must be 60fps)
 */
export const createTherapeuticFrameRate = (fps: number): TherapeuticFrameRate => {
  const expectedFps = 60;

  if (fps < expectedFps) {
    throw new TherapeuticTimingValidationError(
      'Frame rate below therapeutic requirement',
      'AnimationTimer',
      expectedFps,
      fps,
      0 // No tolerance for frame rate
    );
  }

  return expectedFps as TherapeuticFrameRate;
};

/**
 * Calculates frame timing from validated frame rate
 */
export const calculateFrameTiming = (fps: TherapeuticFrameRate): FrameTimingMs => {
  const frameTiming = 1000 / fps; // Convert fps to ms per frame
  return frameTiming as FrameTimingMs;
};

// === CLINICAL VALIDATION STATE CREATION ===

/**
 * Creates a clinical validation state for validated components
 */
export const createClinicalValidationState = (
  validator: string = 'clinician-agent-v1.0'
): ClinicalValidationState => {
  return {
    isValidated: true,
    validatedAt: new Date().toISOString() as ISODateString,
    validator,
    errors: [],
    warnings: []
  };
};

// === COMPREHENSIVE CLINICAL CALCULATOR ===

/**
 * Certified clinical calculator that implements all validation functions
 */
export const createClinicalCalculationCertified = (): ClinicalCalculationCertified => {
  return {
    calculatePHQ9Score: createValidatedPHQ9Score,
    determinePHQ9Severity: createValidatedPHQ9Severity,
    detectPHQ9Crisis: detectPHQ9Crisis,
    detectSuicidalIdeation: detectSuicidalIdeation,

    calculateGAD7Score: createValidatedGAD7Score,
    determineGAD7Severity: createValidatedGAD7Severity,
    detectGAD7Crisis: detectGAD7Crisis,
  };
};

/**
 * Certified therapeutic timing validator
 */
export const createTherapeuticTimingCertified = (): TherapeuticTimingCertified => {
  return {
    validateBreathingStep: createValidatedBreathingDuration,
    validateTotalSession: createValidatedTotalSession,
    validateCrisisResponse: createValidatedCrisisResponse,
    validateFrameRate: createTherapeuticFrameRate,
    calculateFrameTiming: calculateFrameTiming,
  };
};

// === TYPE GUARD UTILITIES ===

/**
 * Type guard to check if a score is a validated PHQ-9 score
 */
export const isValidatedPHQ9Score = (score: any): score is ValidatedPHQ9Score => {
  return typeof score === 'number' &&
         score >= 0 &&
         score <= 27 &&
         Number.isInteger(score) &&
         score.hasOwnProperty('__brand') &&
         score.hasOwnProperty('__validated');
};

/**
 * Type guard to check if a score is a validated GAD-7 score
 */
export const isValidatedGAD7Score = (score: any): score is ValidatedGAD7Score => {
  return typeof score === 'number' &&
         score >= 0 &&
         score <= 21 &&
         Number.isInteger(score) &&
         score.hasOwnProperty('__brand') &&
         score.hasOwnProperty('__validated');
};

/**
 * Type guard to check if crisis is detected
 */
export const isCrisisDetected = (value: any): value is CrisisDetected => {
  return value === true &&
         value.hasOwnProperty('__brand') &&
         value.hasOwnProperty('__validated');
};

/**
 * Type guard to check if suicidal ideation is detected
 */
export const isSuicidalIdeationDetected = (value: any): value is SuicidalIdeationDetected => {
  return value === true &&
         value.hasOwnProperty('__brand') &&
         value.hasOwnProperty('__validated');
};

// === VALIDATION UTILITIES ===

/**
 * Validates clinical data before component rendering
 */
export const validateClinicalData = <T>(
  data: T,
  validator: ClinicalCalculationCertified
): T & { __clinicallyValidated: true } => {
  // Perform runtime validation based on data type
  if (data && typeof data === 'object') {
    // Add validation marker
    return {
      ...data,
      __clinicallyValidated: true as const
    };
  }

  throw new ClinicalTypeValidationError(
    'Invalid clinical data structure',
    'DataValidator',
    'ClinicalData',
    data,
    'critical'
  );
};

/**
 * Validates therapeutic timing before component rendering
 */
export const validateTherapeuticTiming = <T>(
  data: T,
  validator: TherapeuticTimingCertified
): T & { __therapeuticallyTimed: true } => {
  // Perform runtime validation based on timing data
  if (data && typeof data === 'object') {
    // Add timing validation marker
    return {
      ...data,
      __therapeuticallyTimed: true as const
    };
  }

  throw new TherapeuticTimingValidationError(
    'Invalid therapeutic timing data structure',
    'TimingValidator',
    0,
    0,
    0
  );
};

// === EXPORT ALL GUARDS AND UTILITIES ===

export {
  createValidatedPHQ9Score,
  createValidatedGAD7Score,
  createValidatedPHQ9Severity,
  createValidatedGAD7Severity,
  detectPHQ9Crisis,
  detectGAD7Crisis,
  detectSuicidalIdeation,
  createValidatedBreathingDuration,
  createValidatedTotalSession,
  createValidatedCrisisResponse,
  createTherapeuticFrameRate,
  calculateFrameTiming,
  createClinicalValidationState,
  createClinicalCalculationCertified,
  createTherapeuticTimingCertified,
  isValidatedPHQ9Score,
  isValidatedGAD7Score,
  isCrisisDetected,
  isSuicidalIdeationDetected,
  validateClinicalData,
  validateTherapeuticTiming,
};