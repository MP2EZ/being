#!/usr/bin/env node
/**
 * Debug Crisis Detection Errors
 */

// Test configuration
const VALIDATION_CONFIG = {
  PHQ9: {
    CRISIS_THRESHOLD: 20,
    SUICIDAL_IDEATION_QUESTION: 8, // 0-based index
    SUICIDAL_IDEATION_THRESHOLD: 1
  }
};

function requiresCrisisInterventionPHQ9(score, answers) {
  // Crisis if score ≥20 OR suicidal ideation (Question 9 ≥1)
  const scoreThreshold = score >= VALIDATION_CONFIG.PHQ9.CRISIS_THRESHOLD;
  const suicidalIdeation = answers[VALIDATION_CONFIG.PHQ9.SUICIDAL_IDEATION_QUESTION] >= VALIDATION_CONFIG.PHQ9.SUICIDAL_IDEATION_THRESHOLD;

  console.log(`Score: ${score}, Threshold: ${scoreThreshold}, Q9: ${answers[8]}, Suicidal: ${suicidalIdeation}, Crisis: ${scoreThreshold || suicidalIdeation}`);

  return scoreThreshold || suicidalIdeation;
}

// Test the failing combinations
const failingCombinations = [
  {
    answers: [1, 1, 1, 1, 1, 2, 2],
    expectedScore: 9,
    expectedSeverity: 'mild',
    expectsCrisis: false,
    description: 'Score 9 - mild boundary'
  },
  {
    answers: [1, 1, 2, 2, 2, 1, 1],
    expectedScore: 10,
    expectedSeverity: 'moderate',
    expectsCrisis: false,
    description: 'Score 10 - moderate threshold'
  },
  {
    answers: [2, 2, 2, 2, 2, 2, 2],
    expectedScore: 14,
    expectedSeverity: 'moderate',
    expectsCrisis: false,
    description: 'Score 14 - moderate boundary'
  },
  {
    answers: [2, 2, 2, 2, 2, 2, 3],
    expectedScore: 15,
    expectedSeverity: 'moderate',
    expectsCrisis: false,
    description: 'Score 15 - moderately severe threshold'
  },
  {
    answers: [2, 2, 2, 2, 2, 1, 2],
    expectedScore: 17,
    expectedSeverity: 'moderately severe',
    expectsCrisis: false,
    description: 'Score 17 - moderately severe'
  },
  {
    answers: [2, 2, 2, 2, 2, 2, 2, 2, 2],
    expectedScore: 18,
    expectedSeverity: 'moderately severe',
    expectsCrisis: false,
    description: 'Score 18 - just below crisis threshold'
  }
];

console.log('Testing failing combinations:');
console.log('='.repeat(50));

failingCombinations.forEach(combo => {
  console.log(`\n${combo.description}`);
  console.log(`Answers: [${combo.answers.join(', ')}]`);
  console.log(`Expected crisis: ${combo.expectsCrisis}`);

  // Ensure answers array has 9 elements for PHQ-9
  const phq9Answers = combo.answers.length === 9 ? combo.answers : [...combo.answers, ...new Array(9 - combo.answers.length).fill(0)];
  const actualScore = phq9Answers.reduce((sum, a) => sum + a, 0);
  const actualCrisis = requiresCrisisInterventionPHQ9(actualScore, phq9Answers);

  console.log(`Actual score: ${actualScore}, Actual crisis: ${actualCrisis}`);
  console.log(`Match expected: ${actualCrisis === combo.expectsCrisis ? '✅' : '❌'}`);
});