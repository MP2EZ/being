/**
 * Assessment Store Exports
 * DRD-FLOW-005 Production-Ready Implementation
 */

export { useAssessmentStore, default as useAssessmentStore } from './assessmentStore';
export type {
  AssessmentStoreState,
  AssessmentStoreActions
} from './assessmentStore';

// Re-export types for convenience
export type {
  AssessmentType,
  AssessmentResponse,
  AssessmentQuestion,
  AssessmentAnswer,
  AssessmentProgress,
  AssessmentSession,
  PHQ9Result,
  GAD7Result,
  CrisisDetection,
  CrisisIntervention,
  AssessmentQuestionProps,
  AssessmentProgressProps,
  AssessmentResultsProps,
  AssessmentStackParamList
} from '../types/index';

export {
  ASSESSMENT_RESPONSE_LABELS,
  CRISIS_THRESHOLDS
} from '../types/index';