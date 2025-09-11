/**
 * Jest Custom Matchers for Clinical Accuracy Testing
 * 
 * CRITICAL: Custom matchers for validating clinical assessment accuracy
 * These matchers ensure 100% precision in PHQ-9/GAD-7 scoring and crisis detection
 * 
 * Used throughout clinical test suites to validate therapeutic data integrity
 */

import { Assessment } from '../../src/types';
import { CRISIS_THRESHOLDS } from '../../src/utils/validation';

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchPHQ9Score(answers: number[]): R;
      toMatchGAD7Score(answers: number[]): R;
      toRequireCrisisIntervention(): R;
      toBeValidPHQ9Assessment(): R;
      toBeValidGAD7Assessment(): R;
      toHaveCorrectSeverityLevel(expectedSeverity: string): R;
    }
  }
}

/**
 * Validates PHQ-9 score calculation accuracy
 */
expect.extend({
  toMatchPHQ9Score(received: number, answers: number[]) {
    if (!Array.isArray(answers) || answers.length !== 9) {
      return {
        message: () => `Expected answers to be array of 9 numbers, got: ${answers}`,
        pass: false,
      };
    }

    // Validate answer range (0-3 for PHQ-9)
    const invalidAnswers = answers.filter((answer, index) => 
      typeof answer !== 'number' || answer < 0 || answer > 3
    );
    
    if (invalidAnswers.length > 0) {
      return {
        message: () => `Invalid PHQ-9 answers: all values must be 0-3, found invalid: ${invalidAnswers}`,
        pass: false,
      };
    }

    const expectedScore = answers.reduce((sum, answer) => sum + answer, 0);
    const pass = received === expectedScore;

    if (pass) {
      return {
        message: () => `Expected PHQ-9 score ${received} not to equal calculated score ${expectedScore}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected PHQ-9 score ${received} to equal calculated score ${expectedScore}. Answers: [${answers.join(', ')}]`,
        pass: false,
      };
    }
  },
});

/**
 * Validates GAD-7 score calculation accuracy
 */
expect.extend({
  toMatchGAD7Score(received: number, answers: number[]) {
    if (!Array.isArray(answers) || answers.length !== 7) {
      return {
        message: () => `Expected answers to be array of 7 numbers, got: ${answers}`,
        pass: false,
      };
    }

    // Validate answer range (0-3 for GAD-7)
    const invalidAnswers = answers.filter((answer, index) => 
      typeof answer !== 'number' || answer < 0 || answer > 3
    );
    
    if (invalidAnswers.length > 0) {
      return {
        message: () => `Invalid GAD-7 answers: all values must be 0-3, found invalid: ${invalidAnswers}`,
        pass: false,
      };
    }

    const expectedScore = answers.reduce((sum, answer) => sum + answer, 0);
    const pass = received === expectedScore;

    if (pass) {
      return {
        message: () => `Expected GAD-7 score ${received} not to equal calculated score ${expectedScore}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected GAD-7 score ${received} to equal calculated score ${expectedScore}. Answers: [${answers.join(', ')}]`,
        pass: false,
      };
    }
  },
});

/**
 * Validates crisis intervention requirement
 */
expect.extend({
  toRequireCrisisIntervention(received: Assessment) {
    if (!received || typeof received !== 'object') {
      return {
        message: () => `Expected assessment object, got: ${received}`,
        pass: false,
      };
    }

    const { type, answers, score } = received;
    let requiresCrisis = false;
    let reason = '';

    if (type === 'phq9') {
      // Check suicidal ideation (Q9 > 0)
      if (answers && answers.length >= 9 && answers[8] > 0) {
        requiresCrisis = true;
        reason = `Suicidal ideation detected (Q9 = ${answers[8]})`;
      }
      // Check severe depression threshold
      else if (score >= CRISIS_THRESHOLDS.PHQ9_SEVERE) {
        requiresCrisis = true;
        reason = `Severe depression threshold exceeded (score: ${score} >= ${CRISIS_THRESHOLDS.PHQ9_SEVERE})`;
      }
    } else if (type === 'gad7') {
      // Check severe anxiety threshold
      if (score >= CRISIS_THRESHOLDS.GAD7_SEVERE) {
        requiresCrisis = true;
        reason = `Severe anxiety threshold exceeded (score: ${score} >= ${CRISIS_THRESHOLDS.GAD7_SEVERE})`;
      }
    }

    if (requiresCrisis) {
      return {
        message: () => `Expected assessment NOT to require crisis intervention. ${reason}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected assessment to require crisis intervention. Score: ${score}, Type: ${type}`,
        pass: false,
      };
    }
  },
});

/**
 * Validates PHQ-9 assessment structure and data
 */
expect.extend({
  toBeValidPHQ9Assessment(received: Assessment) {
    if (!received || typeof received !== 'object') {
      return {
        message: () => `Expected assessment object, got: ${received}`,
        pass: false,
      };
    }

    const errors: string[] = [];

    // Check required fields
    if (received.type !== 'phq9') {
      errors.push(`Expected type 'phq9', got '${received.type}'`);
    }

    if (!Array.isArray(received.answers) || received.answers.length !== 9) {
      errors.push(`Expected 9 answers, got ${received.answers?.length || 0}`);
    }

    // Validate answer range
    if (received.answers) {
      received.answers.forEach((answer, index) => {
        if (typeof answer !== 'number' || answer < 0 || answer > 3) {
          errors.push(`Invalid answer at Q${index + 1}: ${answer} (must be 0-3)`);
        }
      });
    }

    // Validate score
    if (received.answers && received.score !== undefined) {
      const expectedScore = received.answers.reduce((sum, val) => sum + val, 0);
      if (received.score !== expectedScore) {
        errors.push(`Score mismatch: expected ${expectedScore}, got ${received.score}`);
      }
    }

    // Validate severity
    const validSeverities = ['minimal', 'mild', 'moderate', 'moderately severe', 'severe'];
    if (received.severity && !validSeverities.includes(received.severity)) {
      errors.push(`Invalid severity: ${received.severity}`);
    }

    const pass = errors.length === 0;

    return {
      message: () => pass 
        ? `Expected PHQ-9 assessment to be invalid`
        : `PHQ-9 assessment validation failed: ${errors.join(', ')}`,
      pass,
    };
  },
});

/**
 * Validates GAD-7 assessment structure and data
 */
expect.extend({
  toBeValidGAD7Assessment(received: Assessment) {
    if (!received || typeof received !== 'object') {
      return {
        message: () => `Expected assessment object, got: ${received}`,
        pass: false,
      };
    }

    const errors: string[] = [];

    // Check required fields
    if (received.type !== 'gad7') {
      errors.push(`Expected type 'gad7', got '${received.type}'`);
    }

    if (!Array.isArray(received.answers) || received.answers.length !== 7) {
      errors.push(`Expected 7 answers, got ${received.answers?.length || 0}`);
    }

    // Validate answer range
    if (received.answers) {
      received.answers.forEach((answer, index) => {
        if (typeof answer !== 'number' || answer < 0 || answer > 3) {
          errors.push(`Invalid answer at Q${index + 1}: ${answer} (must be 0-3)`);
        }
      });
    }

    // Validate score
    if (received.answers && received.score !== undefined) {
      const expectedScore = received.answers.reduce((sum, val) => sum + val, 0);
      if (received.score !== expectedScore) {
        errors.push(`Score mismatch: expected ${expectedScore}, got ${received.score}`);
      }
    }

    // Validate severity
    const validSeverities = ['minimal', 'mild', 'moderate', 'severe'];
    if (received.severity && !validSeverities.includes(received.severity)) {
      errors.push(`Invalid severity: ${received.severity}`);
    }

    const pass = errors.length === 0;

    return {
      message: () => pass 
        ? `Expected GAD-7 assessment to be invalid`
        : `GAD-7 assessment validation failed: ${errors.join(', ')}`,
      pass,
    };
  },
});

/**
 * Validates severity level matches score
 */
expect.extend({
  toHaveCorrectSeverityLevel(received: Assessment, expectedSeverity: string) {
    if (!received || typeof received !== 'object') {
      return {
        message: () => `Expected assessment object, got: ${received}`,
        pass: false,
      };
    }

    const { type, score, severity } = received;
    let correctSeverity = '';

    if (type === 'phq9') {
      if (score <= 4) correctSeverity = 'minimal';
      else if (score <= 9) correctSeverity = 'mild';
      else if (score <= 14) correctSeverity = 'moderate';
      else if (score <= 19) correctSeverity = 'moderately severe';
      else correctSeverity = 'severe';
    } else if (type === 'gad7') {
      if (score <= 4) correctSeverity = 'minimal';
      else if (score <= 9) correctSeverity = 'mild';
      else if (score <= 14) correctSeverity = 'moderate';
      else correctSeverity = 'severe';
    }

    const severityMatches = severity === expectedSeverity;
    const severityCorrect = correctSeverity === expectedSeverity;
    const pass = severityMatches && severityCorrect;

    if (!severityMatches) {
      return {
        message: () => `Expected severity '${expectedSeverity}', got '${severity}'`,
        pass: false,
      };
    }

    if (!severityCorrect) {
      return {
        message: () => `Expected severity '${expectedSeverity}' but score ${score} indicates '${correctSeverity}' for ${type.toUpperCase()}`,
        pass: false,
      };
    }

    return {
      message: () => `Expected severity NOT to be '${expectedSeverity}'`,
      pass: true,
    };
  },
});

export {};