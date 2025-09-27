/**
 * Assessment Components Index - DRD-FLOW-005
 * 
 * Export all reusable assessment components for use in:
 * - Standalone assessments (DRD-FLOW-005)
 * - Onboarding flow integration (DRD-FLOW-001)
 * - Check-in assessments
 * 
 * CLINICAL VALIDATION:
 * - All components validated for PHQ-9/GAD-7 accuracy
 * - Crisis intervention protocols integrated
 * - MBCT therapeutic styling applied
 * - WCAG AA accessibility compliance
 */

// Core Assessment Components
export { default as AssessmentQuestion } from './AssessmentQuestion';
export { default as AssessmentProgress } from './AssessmentProgress';
export { default as AssessmentIntroduction } from './AssessmentIntroduction';
export { default as AssessmentResults } from './AssessmentResults';

// Re-export types for convenience
export type {
  AssessmentQuestionProps,
  AssessmentProgressProps,
  AssessmentResultsProps,
  AssessmentType,
  AssessmentResponse,
  AssessmentQuestion as AssessmentQuestionType,
  AssessmentAnswer,
  PHQ9Result,
  GAD7Result,
  AssessmentProgress as AssessmentProgressType,
  AssessmentSession,
  CrisisDetection,
  CrisisIntervention,
} from '../types';

// Re-export constants for convenience
export {
  ASSESSMENT_RESPONSE_LABELS,
  CRISIS_THRESHOLDS,
} from '../types';

// Accessibility components
export * from '../../components/accessibility';