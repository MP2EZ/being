import { useAssessmentStore } from '../../src/features/assessment/stores/assessmentStore';
import { AssessmentResponse, AssessmentType } from '../../src/features/assessment/types';
import { AssessmentState } from '../../src/features/assessment/types';

/**
 * Create a set of PHQ-9 responses with predefined or specified scores
 *
 * @param scores Array of response scores (0-3) to generate PHQ-9 answers
 * @returns Array of PHQ-9 assessment responses
 */
export function createPHQ9Responses(scores: number[]): AssessmentResponse[] {
  // Ensure scores are valid (0-3)
  const validatedScores = scores.map(score =>
    Math.max(0, Math.min(3, Math.floor(score))) as AssessmentResponse
  );

  // Pad or trim to 9 questions
  const paddedScores = validatedScores.length === 9
    ? validatedScores
    : validatedScores.length > 9
      ? validatedScores.slice(0, 9)
      : [...validatedScores, ...new Array(9 - validatedScores.length).fill(0 as AssessmentResponse)];

  return paddedScores;
}

/**
 * Create a set of GAD-7 responses with predefined or specified scores
 *
 * @param scores Array of response scores (0-3) to generate GAD-7 answers
 * @returns Array of GAD-7 assessment responses
 */
export function createGAD7Responses(scores: number[]): AssessmentResponse[] {
  // Ensure scores are valid (0-3)
  const validatedScores = scores.map(score =>
    Math.max(0, Math.min(3, Math.floor(score))) as AssessmentResponse
  );

  // Pad or trim to 7 questions
  const paddedScores = validatedScores.length === 7
    ? validatedScores
    : validatedScores.length > 7
      ? validatedScores.slice(0, 7)
      : [...validatedScores, ...new Array(7 - validatedScores.length).fill(0 as AssessmentResponse)];

  return paddedScores;
}

/**
 * Wait for a minimal store update cycle (10ms)
 * Useful for async store state stabilization in tests
 *
 * @returns Promise that resolves after 10ms
 */
export async function waitForStoreUpdate(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 10));
}

/**
 * Reset the assessment store to its initial state
 * Clears all assessment data and resets to default configuration
 */
export function resetAssessmentStore(): void {
  const store = useAssessmentStore.getState();
  store.resetAssessment();
}

/**
 * Retrieve the current state of the assessment store
 *
 * @returns The current AssessmentState
 */
export function getAssessmentState(): AssessmentState {
  return useAssessmentStore.getState();
}

/**
 * Generate test responses that sum to a specific total score
 * Useful for precise scoring scenario testing
 *
 * @param targetScore Total desired assessment score
 * @param assessmentType Type of assessment (PHQ-9 or GAD-7)
 * @returns Array of assessment responses
 */
export function generateAnswersForScore(
  targetScore: number,
  assessmentType: 'phq9' | 'gad7'
): AssessmentResponse[] {
  const questionCount = assessmentType === 'phq9' ? 9 : 7;
  const answers: AssessmentResponse[] = new Array(questionCount).fill(0);
  let remainingScore = targetScore;

  for (let i = 0; i < questionCount && remainingScore > 0; i++) {
    const maxForQuestion = Math.min(remainingScore, 3);
    answers[i] = maxForQuestion as AssessmentResponse;
    remainingScore -= maxForQuestion;
  }

  return answers;
}