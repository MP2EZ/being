/**
 * Type-Safe Clinical Assessment Tests - Zero Tolerance Accuracy Validation
 *
 * This test suite validates all type-safe clinical assessment components
 * with 100% accuracy requirements for scoring, crisis detection, and timing.
 *
 * CRITICAL: All tests must pass for clinical safety validation.
 * Any test failure indicates potential clinical accuracy issues.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack
  }),
  useRoute: () => ({
    params: {
      type: 'phq9',
      score: 23,
      severity: 'severe',
      crisisDetected: true,
      crisisType: 'score_threshold',
      recommendations: ['Test recommendation'],
      validatedAt: '2024-01-15T10:00:00.000Z',
      validationState: {
        isValidated: true,
        validatedAt: '2024-01-15T10:00:00.000Z',
        validator: 'test',
        errors: [],
        warnings: []
      }
    }
  })
}));

// Mock Alert and Linking
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn()
  },
  Linking: {
    openURL: jest.fn(),
    canOpenURL: jest.fn()
  },
  Vibration: {
    vibrate: jest.fn()
  },
  Platform: {
    OS: 'ios'
  }
}));

// Clinical Services
import {
  ClinicalCalculationService,
  clinicalCalculator,
  TherapeuticTimingService,
  therapeuticTimer,
  initializeClinicalServices,
  performClinicalHealthCheck
} from '../../src/services/clinical';

import {
  PHQ9Answers,
  GAD7Answers,
  PHQ9Score,
  GAD7Score
} from '../../src/types/clinical';

import {
  ValidatedPHQ9Score,
  ValidatedGAD7Score,
  CrisisDetected,
  SuicidalIdeationDetected,
  ClinicalTypeValidationError,
  TherapeuticTimingValidationError
} from '../../src/types/clinical-type-safety';

// Test Components
import { TypeSafePHQ9Screen } from '../../src/screens/assessment/TypeSafePHQ9Screen';
import { TypeSafeGAD7Screen } from '../../src/screens/assessment/TypeSafeGAD7Screen';
import { TypeSafeAssessmentResultsScreen } from '../../src/screens/assessment/TypeSafeAssessmentResultsScreen';
import { TypeSafeCrisisInterventionScreen } from '../../src/screens/crisis/TypeSafeCrisisInterventionScreen';

describe('Clinical Calculation Service - Zero Tolerance Accuracy', () => {
  let calculator: ClinicalCalculationService;

  beforeEach(() => {
    calculator = new ClinicalCalculationService();
  });

  describe('PHQ-9 Calculations', () => {
    test('calculates PHQ-9 scores with 100% accuracy', () => {
      // Test minimum score
      const minAnswers: PHQ9Answers = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      const minScore = calculator.calculatePHQ9Score(minAnswers);
      expect(minScore).toBe(0);

      // Test maximum score
      const maxAnswers: PHQ9Answers = [3, 3, 3, 3, 3, 3, 3, 3, 3];
      const maxScore = calculator.calculatePHQ9Score(maxAnswers);
      expect(maxScore).toBe(27);

      // Test specific score calculation
      const testAnswers: PHQ9Answers = [2, 1, 3, 2, 1, 2, 3, 1, 2];
      const testScore = calculator.calculatePHQ9Score(testAnswers);
      expect(testScore).toBe(17); // Sum: 2+1+3+2+1+2+3+1+2 = 17
    });

    test('determines PHQ-9 severity levels accurately', () => {
      const minimalScore = calculator.calculatePHQ9Score([0, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(calculator.determinePHQ9Severity(minimalScore)).toBe('minimal');

      const mildScore = calculator.calculatePHQ9Score([1, 1, 1, 1, 1, 0, 0, 0, 0]);
      expect(calculator.determinePHQ9Severity(mildScore)).toBe('mild');

      const moderateScore = calculator.calculatePHQ9Score([2, 2, 2, 2, 2, 0, 0, 0, 0]);
      expect(calculator.determinePHQ9Severity(moderateScore)).toBe('moderate');

      const moderatelySevereScore = calculator.calculatePHQ9Score([2, 2, 2, 2, 2, 2, 2, 1, 0]);
      expect(calculator.determinePHQ9Severity(moderatelySevereScore)).toBe('moderately_severe');

      const severeScore = calculator.calculatePHQ9Score([3, 3, 3, 3, 3, 3, 2, 0, 0]);
      expect(calculator.determinePHQ9Severity(severeScore)).toBe('severe');
    });

    test('detects PHQ-9 crisis thresholds accurately', () => {
      // Below crisis threshold
      const nonCrisisScore = calculator.calculatePHQ9Score([2, 2, 2, 2, 2, 2, 2, 2, 1]); // Score: 19
      expect(calculator.detectPHQ9Crisis(nonCrisisScore)).toBe(false);

      // At crisis threshold
      const crisisScore = calculator.calculatePHQ9Score([3, 3, 3, 3, 3, 3, 2, 0, 0]); // Score: 20
      expect(calculator.detectPHQ9Crisis(crisisScore)).toBeTruthy();

      // Above crisis threshold
      const severeCrisisScore = calculator.calculatePHQ9Score([3, 3, 3, 3, 3, 3, 3, 3, 3]); // Score: 27
      expect(calculator.detectPHQ9Crisis(severeCrisisScore)).toBeTruthy();
    });

    test('detects suicidal ideation with zero false negatives', () => {
      // No suicidal ideation (Question 9 = 0)
      const noSuicidalAnswers: PHQ9Answers = [3, 3, 3, 3, 3, 3, 3, 3, 0];
      expect(calculator.detectSuicidalIdeation(noSuicidalAnswers)).toBe(false);

      // Suicidal ideation detected (Question 9 >= 1)
      const suicidalAnswers1: PHQ9Answers = [0, 0, 0, 0, 0, 0, 0, 0, 1];
      expect(calculator.detectSuicidalIdeation(suicidalAnswers1)).toBeTruthy();

      const suicidalAnswers2: PHQ9Answers = [0, 0, 0, 0, 0, 0, 0, 0, 2];
      expect(calculator.detectSuicidalIdeation(suicidalAnswers2)).toBeTruthy();

      const suicidalAnswers3: PHQ9Answers = [0, 0, 0, 0, 0, 0, 0, 0, 3];
      expect(calculator.detectSuicidalIdeation(suicidalAnswers3)).toBeTruthy();
    });

    test('throws validation errors for invalid PHQ-9 inputs', () => {
      // Invalid answer count
      expect(() => {
        calculator.calculatePHQ9Score([0, 1, 2] as any);
      }).toThrow(ClinicalTypeValidationError);

      // Invalid answer values
      expect(() => {
        calculator.calculatePHQ9Score([0, 1, 2, 3, 4, 1, 2, 3, 0] as any);
      }).toThrow(ClinicalTypeValidationError);

      expect(() => {
        calculator.calculatePHQ9Score([0, 1, 2, 3, -1, 1, 2, 3, 0] as any);
      }).toThrow(ClinicalTypeValidationError);
    });
  });

  describe('GAD-7 Calculations', () => {
    test('calculates GAD-7 scores with 100% accuracy', () => {
      // Test minimum score
      const minAnswers: GAD7Answers = [0, 0, 0, 0, 0, 0, 0];
      const minScore = calculator.calculateGAD7Score(minAnswers);
      expect(minScore).toBe(0);

      // Test maximum score
      const maxAnswers: GAD7Answers = [3, 3, 3, 3, 3, 3, 3];
      const maxScore = calculator.calculateGAD7Score(maxAnswers);
      expect(maxScore).toBe(21);

      // Test specific score calculation
      const testAnswers: GAD7Answers = [2, 1, 3, 2, 1, 2, 3];
      const testScore = calculator.calculateGAD7Score(testAnswers);
      expect(testScore).toBe(14); // Sum: 2+1+3+2+1+2+3 = 14
    });

    test('determines GAD-7 severity levels accurately', () => {
      const minimalScore = calculator.calculateGAD7Score([0, 0, 0, 0, 0, 0, 0]);
      expect(calculator.determineGAD7Severity(minimalScore)).toBe('minimal');

      const mildScore = calculator.calculateGAD7Score([1, 1, 1, 1, 1, 0, 0]);
      expect(calculator.determineGAD7Severity(mildScore)).toBe('mild');

      const moderateScore = calculator.calculateGAD7Score([2, 2, 2, 2, 2, 0, 0]);
      expect(calculator.determineGAD7Severity(moderateScore)).toBe('moderate');

      const severeScore = calculator.calculateGAD7Score([3, 3, 3, 3, 3, 0, 0]);
      expect(calculator.determineGAD7Severity(severeScore)).toBe('severe');
    });

    test('detects GAD-7 crisis thresholds accurately', () => {
      // Below crisis threshold
      const nonCrisisScore = calculator.calculateGAD7Score([2, 2, 2, 2, 2, 2, 2]); // Score: 14
      expect(calculator.detectGAD7Crisis(nonCrisisScore)).toBe(false);

      // At crisis threshold
      const crisisScore = calculator.calculateGAD7Score([3, 3, 3, 3, 3, 0, 0]); // Score: 15
      expect(calculator.detectGAD7Crisis(crisisScore)).toBeTruthy();

      // Above crisis threshold
      const severeCrisisScore = calculator.calculateGAD7Score([3, 3, 3, 3, 3, 3, 3]); // Score: 21
      expect(calculator.detectGAD7Crisis(severeCrisisScore)).toBeTruthy();
    });

    test('throws validation errors for invalid GAD-7 inputs', () => {
      // Invalid answer count
      expect(() => {
        calculator.calculateGAD7Score([0, 1, 2] as any);
      }).toThrow(ClinicalTypeValidationError);

      // Invalid answer values
      expect(() => {
        calculator.calculateGAD7Score([0, 1, 2, 3, 4, 1, 2] as any);
      }).toThrow(ClinicalTypeValidationError);
    });
  });

  test('passes comprehensive clinical accuracy test', () => {
    expect(calculator.runClinicalAccuracyTest()).toBe(true);
  });
});

describe('Therapeutic Timing Service - Precision Validation', () => {
  let timer: TherapeuticTimingService;

  beforeEach(() => {
    timer = new TherapeuticTimingService();
  });

  test('validates breathing step timing with zero tolerance', () => {
    // Exact timing should pass
    expect(() => timer.validateBreathingStep(60000)).not.toThrow();

    // Outside tolerance should throw
    expect(() => timer.validateBreathingStep(59000)).toThrow(TherapeuticTimingValidationError);
    expect(() => timer.validateBreathingStep(61000)).toThrow(TherapeuticTimingValidationError);
  });

  test('validates total session timing with therapeutic tolerance', () => {
    // Exact timing should pass
    expect(() => timer.validateTotalSession(180000)).not.toThrow();

    // Within tolerance should pass
    expect(() => timer.validateTotalSession(180200)).not.toThrow();

    // Outside tolerance should throw
    expect(() => timer.validateTotalSession(179000)).toThrow(TherapeuticTimingValidationError);
    expect(() => timer.validateTotalSession(181000)).toThrow(TherapeuticTimingValidationError);
  });

  test('validates crisis response timing for safety', () => {
    // Fast response should pass
    expect(() => timer.validateCrisisResponse(150)).not.toThrow();
    expect(() => timer.validateCrisisResponse(200)).not.toThrow();

    // Slow response should throw
    expect(() => timer.validateCrisisResponse(250)).toThrow(TherapeuticTimingValidationError);
  });

  test('validates frame rate for smooth therapeutic animations', () => {
    // Exact 60fps should pass
    expect(() => timer.validateFrameRate(60)).not.toThrow();

    // Near 60fps should pass (device variations)
    expect(() => timer.validateFrameRate(59)).not.toThrow();
    expect(() => timer.validateFrameRate(61)).not.toThrow();

    // Far from 60fps should throw
    expect(() => timer.validateFrameRate(30)).toThrow(TherapeuticTimingValidationError);
    expect(() => timer.validateFrameRate(120)).toThrow(TherapeuticTimingValidationError);
  });

  test('generates accurate timing reports', () => {
    // Record some timing measurements
    timer.validateBreathingStep(60000);
    timer.validateTotalSession(180000);
    timer.validateCrisisResponse(150);

    const report = timer.generateTimingReport();
    expect(report.summary).toBeDefined();
    expect(report.metrics).toBeDefined();
    expect(report.meetsClinicalStandards).toBe(true);
    expect(Array.isArray(report.recommendations)).toBe(true);
  });
});

describe('Clinical Services Integration', () => {
  test('initializes all clinical services successfully', () => {
    const initialization = initializeClinicalServices();
    expect(initialization.isValid).toBe(true);
    expect(initialization.errors).toHaveLength(0);
    expect(initialization.calculationService).toBeDefined();
    expect(initialization.timingService).toBeDefined();
  });

  test('performs comprehensive health check', () => {
    const healthCheck = performClinicalHealthCheck();
    expect(['healthy', 'degraded', 'critical']).toContain(healthCheck.status);
    expect(Array.isArray(healthCheck.checks)).toBe(true);
    expect(healthCheck.timestamp).toBeDefined();

    // Verify health check structure
    healthCheck.checks.forEach(check => {
      expect(check.service).toBeDefined();
      expect(['pass', 'fail', 'warn']).toContain(check.status);
      expect(check.message).toBeDefined();
    });
  });
});

describe('Type-Safe Assessment Screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TypeSafePHQ9Screen renders without errors', () => {
    const { getByText } = render(<TypeSafePHQ9Screen />);
    expect(getByText('PHQ-9 Depression Assessment')).toBeTruthy();
    expect(getByText('Question 1 of 9')).toBeTruthy();
  });

  test('TypeSafeGAD7Screen renders without errors', () => {
    const { getByText } = render(<TypeSafeGAD7Screen />);
    expect(getByText('GAD-7 Anxiety Assessment')).toBeTruthy();
    expect(getByText('Question 1 of 7')).toBeTruthy();
  });

  test('TypeSafeAssessmentResultsScreen renders with validated data', () => {
    const { getByText } = render(<TypeSafeAssessmentResultsScreen />);
    expect(getByText('Depression Assessment Results')).toBeTruthy();
    expect(getByText('Your Score')).toBeTruthy();
    expect(getByText('23')).toBeTruthy();
  });

  test('TypeSafeCrisisInterventionScreen renders crisis interface', () => {
    const mockRouteParams = {
      triggerType: 'score_threshold' as const,
      assessmentType: 'phq9' as const,
      crisisDetected: true as CrisisDetected,
      triggerTime: '2024-01-15T10:00:00.000Z' as const,
      validationState: {
        isValidated: true,
        validatedAt: '2024-01-15T10:00:00.000Z',
        validator: 'test',
        errors: [],
        warnings: []
      }
    };

    jest.mocked(require('@react-navigation/native').useRoute).mockReturnValue({
      params: mockRouteParams
    });

    const { getByText } = render(<TypeSafeCrisisInterventionScreen />);
    expect(getByText('Professional Support Recommended')).toBeTruthy();
    expect(getByText('🆘 Immediate Help')).toBeTruthy();
  });
});

describe('Crisis Detection Integration Tests', () => {
  test('PHQ-9 crisis scenario triggers proper response', async () => {
    const crisisAnswers: PHQ9Answers = [3, 3, 3, 3, 3, 3, 3, 3, 1]; // Score: 23, suicidal ideation
    const score = clinicalCalculator.calculatePHQ9Score(crisisAnswers);
    const crisisDetected = clinicalCalculator.detectPHQ9Crisis(score);
    const suicidalIdeation = clinicalCalculator.detectSuicidalIdeation(crisisAnswers);

    expect(score).toBe(23);
    expect(crisisDetected).toBeTruthy();
    expect(suicidalIdeation).toBeTruthy();
  });

  test('GAD-7 crisis scenario triggers proper response', async () => {
    const crisisAnswers: GAD7Answers = [3, 3, 3, 3, 3, 0, 0]; // Score: 15
    const score = clinicalCalculator.calculateGAD7Score(crisisAnswers);
    const crisisDetected = clinicalCalculator.detectGAD7Crisis(score);

    expect(score).toBe(15);
    expect(crisisDetected).toBeTruthy();
  });

  test('crisis response timing meets safety requirements', async () => {
    const startTime = Date.now();

    // Simulate crisis detection and response
    const crisisAnswers: PHQ9Answers = [3, 3, 3, 3, 3, 3, 3, 3, 1];
    const score = clinicalCalculator.calculatePHQ9Score(crisisAnswers);
    const crisisDetected = clinicalCalculator.detectPHQ9Crisis(score);

    const responseTime = Date.now() - startTime;

    // Crisis detection should be nearly instantaneous
    expect(responseTime).toBeLessThan(10);
    expect(crisisDetected).toBeTruthy();

    // Validate response time meets crisis standards
    expect(() => therapeuticTimer.validateCrisisResponse(responseTime)).not.toThrow();
  });
});

describe('Type Safety Validation', () => {
  test('prevents invalid clinical data from propagating', () => {
    // Invalid PHQ-9 score should be caught at compile time
    // These tests validate runtime type guards

    expect(() => {
      // @ts-expect-error - Testing runtime validation
      clinicalCalculator.calculatePHQ9Score([0, 1, 2] as PHQ9Answers);
    }).toThrow();

    expect(() => {
      // @ts-expect-error - Testing runtime validation
      clinicalCalculator.calculateGAD7Score([0, 1, 2] as GAD7Answers);
    }).toThrow();
  });

  test('ensures therapeutic timing precision', () => {
    // Timing validation should prevent imprecise therapeutic timing
    expect(() => {
      therapeuticTimer.validateBreathingStep(59999); // 1ms off
    }).toThrow(TherapeuticTimingValidationError);

    expect(() => {
      therapeuticTimer.validateTotalSession(179999); // 1ms off
    }).toThrow(TherapeuticTimingValidationError);
  });
});

describe('Performance & Reliability Tests', () => {
  test('clinical calculations are deterministic and fast', () => {
    const testAnswers: PHQ9Answers = [2, 1, 3, 2, 1, 2, 3, 1, 2];

    // Multiple calculations should give identical results
    const score1 = clinicalCalculator.calculatePHQ9Score(testAnswers);
    const score2 = clinicalCalculator.calculatePHQ9Score(testAnswers);
    const score3 = clinicalCalculator.calculatePHQ9Score(testAnswers);

    expect(score1).toBe(score2);
    expect(score2).toBe(score3);
    expect(score1).toBe(17);

    // Performance test - calculations should be fast
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      clinicalCalculator.calculatePHQ9Score(testAnswers);
    }
    const duration = Date.now() - start;

    // 1000 calculations should take less than 100ms
    expect(duration).toBeLessThan(100);
  });

  test('crisis detection is consistent under load', () => {
    const crisisAnswers: PHQ9Answers = [3, 3, 3, 3, 3, 3, 3, 3, 1];
    const nonCrisisAnswers: PHQ9Answers = [1, 1, 1, 1, 1, 1, 1, 1, 0];

    // Test consistency under repeated calls
    for (let i = 0; i < 100; i++) {
      const crisisScore = clinicalCalculator.calculatePHQ9Score(crisisAnswers);
      const nonCrisisScore = clinicalCalculator.calculatePHQ9Score(nonCrisisAnswers);

      expect(clinicalCalculator.detectPHQ9Crisis(crisisScore)).toBeTruthy();
      expect(clinicalCalculator.detectPHQ9Crisis(nonCrisisScore)).toBe(false);

      expect(clinicalCalculator.detectSuicidalIdeation(crisisAnswers)).toBeTruthy();
      expect(clinicalCalculator.detectSuicidalIdeation(nonCrisisAnswers)).toBe(false);
    }
  });
});