/**
 * Simple Clinical Assessment Test
 * Basic validation of clinical testing setup
 */

import { describe, test, expect } from '@jest/globals';

// Test the clinical validation functions from setup
import {
  validatePHQ9Score,
  validateGAD7Score,
  isCrisisThreshold,
} from '../setup';

describe('Clinical Assessment Basic Validation', () => {
  describe('PHQ-9 Score Validation', () => {
    test('validates valid PHQ-9 scores', () => {
      expect(validatePHQ9Score(0)).toBe(true);
      expect(validatePHQ9Score(14)).toBe(true);
      expect(validatePHQ9Score(27)).toBe(true);
    });

    test('rejects invalid PHQ-9 scores', () => {
      expect(validatePHQ9Score(-1)).toBe(false);
      expect(validatePHQ9Score(28)).toBe(false);
      expect(validatePHQ9Score(0.5)).toBe(false);
    });
  });

  describe('GAD-7 Score Validation', () => {
    test('validates valid GAD-7 scores', () => {
      expect(validateGAD7Score(0)).toBe(true);
      expect(validateGAD7Score(10)).toBe(true);
      expect(validateGAD7Score(21)).toBe(true);
    });

    test('rejects invalid GAD-7 scores', () => {
      expect(validateGAD7Score(-1)).toBe(false);
      expect(validateGAD7Score(22)).toBe(false);
      expect(validateGAD7Score(10.5)).toBe(false);
    });
  });

  describe('Crisis Threshold Detection', () => {
    test('detects PHQ-9 crisis threshold correctly', () => {
      expect(isCrisisThreshold(19, 'PHQ9')).toBe(false);
      expect(isCrisisThreshold(20, 'PHQ9')).toBe(true);
      expect(isCrisisThreshold(27, 'PHQ9')).toBe(true);
    });

    test('detects GAD-7 crisis threshold correctly', () => {
      expect(isCrisisThreshold(14, 'GAD7')).toBe(false);
      expect(isCrisisThreshold(15, 'GAD7')).toBe(true);
      expect(isCrisisThreshold(21, 'GAD7')).toBe(true);
    });
  });

  describe('Custom Matchers', () => {
    test('clinical accuracy matcher works', () => {
      expect(15).toBeClinicallyAccurate(15, 0.001);
      expect(14.999).toBeClinicallyAccurate(15, 0.001);
    });

    test('crisis threshold matcher works', () => {
      expect({ score: 20, type: 'PHQ9' as const }).toTriggerCrisisThreshold();
      expect({ score: 15, type: 'GAD7' as const }).toTriggerCrisisThreshold();
    });
  });
});