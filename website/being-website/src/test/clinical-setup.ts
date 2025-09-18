/**
 * Clinical Testing Setup
 * Specialized setup for clinical accuracy and therapeutic data testing
 */

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { 
  validatePHQ9Score,
  validateGAD7Score,
  isCrisisThreshold,
} from './setup';

// ============================================================================
// CLINICAL TESTING CONSTANTS
// ============================================================================

export const CLINICAL_TEST_CONSTANTS = {
  ACCURACY_REQUIREMENT: 0.999, // 99.9%
  PHQ9_CRISIS_THRESHOLD: 20,
  GAD7_CRISIS_THRESHOLD: 15,
  PHQ9_MAX_SCORE: 27,
  GAD7_MAX_SCORE: 21,
  ASSESSMENT_TOLERANCE: 0.001,
} as const;

// ============================================================================
// CLINICAL TEST SETUP
// ============================================================================

beforeAll(() => {
  console.log('🏥 Starting Clinical Accuracy Tests');
  console.log(`Required Accuracy: ${CLINICAL_TEST_CONSTANTS.ACCURACY_REQUIREMENT * 100}%`);
  
  // Validate test constants
  expect(CLINICAL_TEST_CONSTANTS.PHQ9_CRISIS_THRESHOLD).toBe(20);
  expect(CLINICAL_TEST_CONSTANTS.GAD7_CRISIS_THRESHOLD).toBe(15);
  
  // Initialize clinical validation tracking
  (global as any).__clinicalTestResults = {
    totalTests: 0,
    passedTests: 0,
    clinicalAccuracy: [],
    assessmentValidations: [],
    crisisDetections: [],
  };
});

beforeEach(() => {
  // Reset clinical test state
  (global as any).__currentTestAccuracy = 1.0;
});

afterEach(() => {
  // Track test results for clinical compliance
  const results = (global as any).__clinicalTestResults;
  results.totalTests++;
  
  if ((global as any).__currentTestAccuracy >= CLINICAL_TEST_CONSTANTS.ACCURACY_REQUIREMENT) {
    results.passedTests++;
  }
});

afterAll(() => {
  const results = (global as any).__clinicalTestResults;
  const overallAccuracy = results.passedTests / results.totalTests;
  
  console.log('\n🏥 Clinical Testing Results:');
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`Passed: ${results.passedTests}`);
  console.log(`Overall Accuracy: ${(overallAccuracy * 100).toFixed(3)}%`);
  
  // Enforce clinical accuracy requirement
  expect(overallAccuracy).toBeGreaterThanOrEqual(CLINICAL_TEST_CONSTANTS.ACCURACY_REQUIREMENT);
});

// ============================================================================
// CLINICAL TEST UTILITIES
// ============================================================================

export function trackClinicalAccuracy(testName: string, accuracy: number) {
  const results = (global as any).__clinicalTestResults;
  results.clinicalAccuracy.push({ testName, accuracy });
  (global as any).__currentTestAccuracy = Math.min((global as any).__currentTestAccuracy, accuracy);
}

export function validateAllPHQ9Scores(): boolean {
  let totalAccuracy = 0;
  const scores = [];
  
  for (let score = 0; score <= CLINICAL_TEST_CONSTANTS.PHQ9_MAX_SCORE; score++) {
    const isValid = validatePHQ9Score(score);
    const isCrisis = isCrisisThreshold(score, 'PHQ9');
    const expectedCrisis = score >= CLINICAL_TEST_CONSTANTS.PHQ9_CRISIS_THRESHOLD;
    
    const accuracy = (isValid && (isCrisis === expectedCrisis)) ? 1.0 : 0.0;
    scores.push({ score, isValid, isCrisis, expectedCrisis, accuracy });
    totalAccuracy += accuracy;
  }
  
  const overallAccuracy = totalAccuracy / (CLINICAL_TEST_CONSTANTS.PHQ9_MAX_SCORE + 1);
  trackClinicalAccuracy('PHQ9_Complete_Validation', overallAccuracy);
  
  return overallAccuracy === 1.0;
}

export function validateAllGAD7Scores(): boolean {
  let totalAccuracy = 0;
  const scores = [];
  
  for (let score = 0; score <= CLINICAL_TEST_CONSTANTS.GAD7_MAX_SCORE; score++) {
    const isValid = validateGAD7Score(score);
    const isCrisis = isCrisisThreshold(score, 'GAD7');
    const expectedCrisis = score >= CLINICAL_TEST_CONSTANTS.GAD7_CRISIS_THRESHOLD;
    
    const accuracy = (isValid && (isCrisis === expectedCrisis)) ? 1.0 : 0.0;
    scores.push({ score, isValid, isCrisis, expectedCrisis, accuracy });
    totalAccuracy += accuracy;
  }
  
  const overallAccuracy = totalAccuracy / (CLINICAL_TEST_CONSTANTS.GAD7_MAX_SCORE + 1);
  trackClinicalAccuracy('GAD7_Complete_Validation', overallAccuracy);
  
  return overallAccuracy === 1.0;
}

export function generateClinicalTestReport() {
  const results = (global as any).__clinicalTestResults;
  
  return {
    summary: {
      totalTests: results.totalTests,
      passedTests: results.passedTests,
      overallAccuracy: results.passedTests / results.totalTests,
      clinicalCompliance: results.passedTests / results.totalTests >= CLINICAL_TEST_CONSTANTS.ACCURACY_REQUIREMENT,
    },
    clinicalAccuracy: results.clinicalAccuracy,
    assessmentValidations: results.assessmentValidations,
    crisisDetections: results.crisisDetections,
  };
}