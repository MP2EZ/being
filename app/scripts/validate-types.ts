/**
 * TypeScript Validation Script for Clinical Accuracy
 * 
 * This script performs comprehensive type checking to ensure
 * clinical data integrity and prevent runtime errors that
 * could affect user safety.
 */

import {
  Assessment,
  PHQ9Answers,
  GAD7Answers,
  PHQ9Score,
  GAD7Score,
  AssessmentID,
  CheckInID,
  CLINICAL_CONSTANTS,
  isPHQ9Assessment,
  isGAD7Assessment,
  createAssessmentID,
  createISODateString,
} from '../src/types/clinical';

import {
  isValidPHQ9Answers,
  isValidGAD7Answers,
  calculatePHQ9Score,
  calculateGAD7Score,
  requiresCrisisIntervention,
} from '../src/utils/validation';

// Test Data for Type Validation
const validPHQ9Answers: PHQ9Answers = [0, 1, 2, 3, 0, 1, 2, 3, 0] as const;
const validGAD7Answers: GAD7Answers = [0, 1, 2, 3, 0, 1, 2] as const;

const crisisPHQ9Answers: PHQ9Answers = [3, 3, 3, 3, 3, 3, 3, 3, 2] as const;
const suicidalIdeationPHQ9: PHQ9Answers = [1, 1, 1, 1, 1, 1, 1, 1, 1] as const;

interface ValidationResult {
  test: string;
  passed: boolean;
  error?: string;
  details?: any;
}

class TypeValidationSuite {
  private results: ValidationResult[] = [];

  // Test Clinical Type Safety
  testClinicalTypes(): void {
    console.log('🏥 Testing Clinical Type Safety...\n');

    // Test PHQ-9 Answer Validation
    this.runTest('PHQ-9 Valid Answers', () => {
      const isValid = isValidPHQ9Answers(validPHQ9Answers);
      if (!isValid) throw new Error('Valid PHQ-9 answers rejected');
      return { answers: validPHQ9Answers };
    });

    this.runTest('PHQ-9 Invalid Answers (wrong count)', () => {
      const invalidAnswers = [0, 1, 2, 3]; // Only 4 answers instead of 9
      const isValid = isValidPHQ9Answers(invalidAnswers);
      if (isValid) throw new Error('Invalid PHQ-9 answers accepted');
      return { rejected: invalidAnswers };
    });

    this.runTest('PHQ-9 Invalid Answers (out of range)', () => {
      const invalidAnswers = [0, 1, 2, 3, 4, 1, 2, 3, 0]; // Answer 4 is invalid
      const isValid = isValidPHQ9Answers(invalidAnswers);
      if (isValid) throw new Error('Out-of-range PHQ-9 answers accepted');
      return { rejected: invalidAnswers };
    });

    // Test GAD-7 Answer Validation
    this.runTest('GAD-7 Valid Answers', () => {
      const isValid = isValidGAD7Answers(validGAD7Answers);
      if (!isValid) throw new Error('Valid GAD-7 answers rejected');
      return { answers: validGAD7Answers };
    });

    this.runTest('GAD-7 Invalid Answers (wrong count)', () => {
      const invalidAnswers = [0, 1, 2, 3, 0, 1]; // Only 6 answers instead of 7
      const isValid = isValidGAD7Answers(invalidAnswers);
      if (isValid) throw new Error('Invalid GAD-7 answers accepted');
      return { rejected: invalidAnswers };
    });

    // Test Score Calculations
    this.runTest('PHQ-9 Score Calculation', () => {
      const score = calculatePHQ9Score(validPHQ9Answers);
      const expectedScore = validPHQ9Answers.reduce((sum, answer) => sum + answer, 0);
      if (score !== expectedScore) {
        throw new Error(`Score mismatch: expected ${expectedScore}, got ${score}`);
      }
      return { score, expectedScore };
    });

    this.runTest('GAD-7 Score Calculation', () => {
      const score = calculateGAD7Score(validGAD7Answers);
      const expectedScore = validGAD7Answers.reduce((sum, answer) => sum + answer, 0);
      if (score !== expectedScore) {
        throw new Error(`Score mismatch: expected ${expectedScore}, got ${score}`);
      }
      return { score, expectedScore };
    });
  }

  // Test Crisis Detection
  testCrisisDetection(): void {
    console.log('🚨 Testing Crisis Detection Logic...\n');

    this.runTest('PHQ-9 High Score Crisis Detection', () => {
      const score = calculatePHQ9Score(crisisPHQ9Answers);
      const assessment: Assessment = {
        type: 'phq9',
        answers: crisisPHQ9Answers,
        score,
        severity: 'severe',
        id: createAssessmentID('phq9'),
        completedAt: createISODateString(new Date().toISOString()),
        context: 'clinical',
        requiresCrisisIntervention: true,
      };

      const needsCrisis = requiresCrisisIntervention(assessment);
      if (!needsCrisis) {
        throw new Error('High PHQ-9 score should trigger crisis intervention');
      }

      if (score < CLINICAL_CONSTANTS.PHQ9.CRISIS_THRESHOLD) {
        throw new Error(`Score ${score} should exceed crisis threshold ${CLINICAL_CONSTANTS.PHQ9.CRISIS_THRESHOLD}`);
      }

      return { score, needsCrisis, threshold: CLINICAL_CONSTANTS.PHQ9.CRISIS_THRESHOLD };
    });

    this.runTest('PHQ-9 Suicidal Ideation Detection', () => {
      const score = calculatePHQ9Score(suicidalIdeationPHQ9);
      const assessment: Assessment = {
        type: 'phq9',
        answers: suicidalIdeationPHQ9,
        score,
        severity: 'mild',
        id: createAssessmentID('phq9'),
        completedAt: createISODateString(new Date().toISOString()),
        context: 'clinical',
        requiresCrisisIntervention: true,
      };

      const needsCrisis = requiresCrisisIntervention(assessment);
      if (!needsCrisis) {
        throw new Error('Suicidal ideation should trigger crisis intervention regardless of total score');
      }

      const suicidalAnswer = suicidalIdeationPHQ9[CLINICAL_CONSTANTS.PHQ9.SUICIDAL_IDEATION_QUESTION];
      if (suicidalAnswer < 1) {
        throw new Error('Test data error: suicidal ideation answer should be >= 1');
      }

      return { 
        score, 
        needsCrisis, 
        suicidalAnswer,
        questionIndex: CLINICAL_CONSTANTS.PHQ9.SUICIDAL_IDEATION_QUESTION 
      };
    });

    this.runTest('Low Score No Crisis', () => {
      const lowAnswers: PHQ9Answers = [0, 0, 1, 0, 0, 1, 0, 0, 0] as const;
      const score = calculatePHQ9Score(lowAnswers);
      const assessment: Assessment = {
        type: 'phq9',
        answers: lowAnswers,
        score,
        severity: 'minimal',
        id: createAssessmentID('phq9'),
        completedAt: createISODateString(new Date().toISOString()),
        context: 'clinical',
        requiresCrisisIntervention: false,
      };

      const needsCrisis = requiresCrisisIntervention(assessment);
      if (needsCrisis) {
        throw new Error('Low PHQ-9 score should not trigger crisis intervention');
      }

      return { score, needsCrisis };
    });
  }

  // Test Type Guards and Discriminated Unions
  testTypeGuards(): void {
    console.log('🔒 Testing Type Guards and Discriminated Unions...\n');

    this.runTest('PHQ-9 Assessment Type Guard', () => {
      const assessment: Assessment = {
        type: 'phq9',
        answers: validPHQ9Answers,
        score: calculatePHQ9Score(validPHQ9Answers),
        severity: 'mild',
        id: createAssessmentID('phq9'),
        completedAt: createISODateString(new Date().toISOString()),
        context: 'clinical',
        requiresCrisisIntervention: false,
      };

      if (!isPHQ9Assessment(assessment)) {
        throw new Error('PHQ-9 assessment type guard failed');
      }

      if (isGAD7Assessment(assessment)) {
        throw new Error('PHQ-9 assessment incorrectly identified as GAD-7');
      }

      // TypeScript should now know this is a PHQ-9 assessment
      const phq9Specific = assessment.severity; // Should include 'moderately severe'
      
      return { type: assessment.type, severity: phq9Specific };
    });

    this.runTest('GAD-7 Assessment Type Guard', () => {
      const score = calculateGAD7Score(validGAD7Answers);
      const assessment: Assessment = {
        type: 'gad7',
        answers: validGAD7Answers,
        score,
        severity: 'mild',
        id: createAssessmentID('gad7'),
        completedAt: createISODateString(new Date().toISOString()),
        context: 'clinical',
        requiresCrisisIntervention: false,
      };

      if (!isGAD7Assessment(assessment)) {
        throw new Error('GAD-7 assessment type guard failed');
      }

      if (isPHQ9Assessment(assessment)) {
        throw new Error('GAD-7 assessment incorrectly identified as PHQ-9');
      }

      return { type: assessment.type };
    });
  }

  // Test ID Generation and Validation
  testIDGeneration(): void {
    console.log('🏷️ Testing ID Generation and Validation...\n');

    this.runTest('Assessment ID Generation', () => {
      const phq9Id = createAssessmentID('phq9');
      const gad7Id = createAssessmentID('gad7');

      if (!phq9Id.startsWith('assessment_phq9_')) {
        throw new Error('PHQ-9 ID format incorrect');
      }

      if (!gad7Id.startsWith('assessment_gad7_')) {
        throw new Error('GAD-7 ID format incorrect');
      }

      return { phq9Id, gad7Id };
    });

    this.runTest('ISO Date String Creation', () => {
      const now = new Date().toISOString();
      const isoDate = createISODateString(now);
      
      if (isoDate !== now) {
        throw new Error('ISO date string creation failed');
      }

      return { isoDate };
    });

    this.runTest('Invalid ISO Date Rejection', () => {
      try {
        createISODateString('invalid-date');
        throw new Error('Invalid date should have been rejected');
      } catch (error) {
        if (error instanceof Error && error.message === 'Invalid date should have been rejected') {
          throw error;
        }
        // Expected error - test passes
        return { rejected: 'invalid-date' };
      }
    });
  }

  // Test Constants and Thresholds
  testConstants(): void {
    console.log('📊 Testing Clinical Constants...\n');

    this.runTest('PHQ-9 Constants Validation', () => {
      const constants = CLINICAL_CONSTANTS.PHQ9;
      
      if (constants.QUESTION_COUNT !== 9) {
        throw new Error(`PHQ-9 should have 9 questions, got ${constants.QUESTION_COUNT}`);
      }

      if (constants.CRISIS_THRESHOLD !== 20) {
        throw new Error(`PHQ-9 crisis threshold should be 20, got ${constants.CRISIS_THRESHOLD}`);
      }

      if (constants.SUICIDAL_IDEATION_QUESTION !== 8) {
        throw new Error(`PHQ-9 suicidal ideation question should be index 8, got ${constants.SUICIDAL_IDEATION_QUESTION}`);
      }

      return constants;
    });

    this.runTest('GAD-7 Constants Validation', () => {
      const constants = CLINICAL_CONSTANTS.GAD7;
      
      if (constants.QUESTION_COUNT !== 7) {
        throw new Error(`GAD-7 should have 7 questions, got ${constants.QUESTION_COUNT}`);
      }

      if (constants.CRISIS_THRESHOLD !== 15) {
        throw new Error(`GAD-7 crisis threshold should be 15, got ${constants.CRISIS_THRESHOLD}`);
      }

      return constants;
    });

    this.runTest('Emergency Constants', () => {
      const constants = CLINICAL_CONSTANTS.CRISIS;
      
      if (constants.EMERGENCY_NUMBER !== '988') {
        throw new Error(`Emergency number should be '988', got '${constants.EMERGENCY_NUMBER}'`);
      }

      if (constants.MAX_RESPONSE_TIME_MS !== 200) {
        throw new Error(`Max response time should be 200ms, got ${constants.MAX_RESPONSE_TIME_MS}ms`);
      }

      return constants;
    });
  }

  // Utility method to run individual tests
  private runTest(testName: string, testFn: () => any): void {
    try {
      const details = testFn();
      this.results.push({
        test: testName,
        passed: true,
        details,
      });
      console.log(`✅ ${testName}`);
      if (details) {
        console.log(`   Details: ${JSON.stringify(details)}`);
      }
    } catch (error) {
      this.results.push({
        test: testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log(`❌ ${testName}`);
      console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    console.log('');
  }

  // Run all tests
  runAllTests(): void {
    console.log('🧪 TypeScript Clinical Accuracy Validation\n');
    console.log('============================================\n');

    this.testClinicalTypes();
    this.testCrisisDetection();
    this.testTypeGuards();
    this.testIDGeneration();
    this.testConstants();

    this.printSummary();
  }

  // Print test summary
  private printSummary(): void {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log('\n============================================\n');
    console.log('📋 Test Summary');
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%\n`);

    if (failed > 0) {
      console.log('🚨 CRITICAL: Type safety failures detected!');
      console.log('These failures could lead to clinical inaccuracies.\n');
      
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`❌ ${result.test}: ${result.error}`);
      });
      
      process.exit(1);
    } else {
      console.log('🎉 ALL TESTS PASSED - Clinical type safety validated!');
      console.log('TypeScript configuration is ready for production use.\n');
    }
  }
}

// Run the validation suite
if (require.main === module) {
  const validator = new TypeValidationSuite();
  validator.runAllTests();
}