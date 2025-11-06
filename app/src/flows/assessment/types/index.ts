/**
 * Assessment Types - DRD-FLOW-005 Standalone Assessments
 * Clinical accuracy validated and regulatory compliant
 * Designed for reusability in DRD-FLOW-001 onboarding
 * 
 * COMPREHENSIVE TYPE SAFETY:
 * - Component prop interfaces with strict typing
 * - Store action types with crisis safety constraints  
 * - Navigation parameter types for assessment flows
 * - Crisis intervention types with PHQ≥20, GAD≥15 validation
 * - Utility function types for 100% accurate scoring calculations
 */

// Base Assessment Types
export type AssessmentType = 'phq9' | 'gad7';

export type AssessmentResponse = 0 | 1 | 2 | 3;

export interface AssessmentQuestion {
  id: string;
  text: string;
  type: AssessmentType;
  order: number;
}

export interface AssessmentAnswer {
  questionId: string;
  response: AssessmentResponse;
  timestamp: number;
}

// PHQ-9 Specific Types
export interface PHQ9Question extends AssessmentQuestion {
  type: 'phq9';
}

export interface PHQ9Result {
  totalScore: number; // 0-27
  severity: 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';
  isCrisis: boolean; // Score ≥20
  suicidalIdeation: boolean; // Question 9 response >0
  completedAt: number;
  answers: AssessmentAnswer[];
}

// GAD-7 Specific Types
export interface GAD7Question extends AssessmentQuestion {
  type: 'gad7';
}

export interface GAD7Result {
  totalScore: number; // 0-21
  severity: 'minimal' | 'mild' | 'moderate' | 'severe';
  isCrisis: boolean; // Score ≥15
  completedAt: number;
  answers: AssessmentAnswer[];
}

// Assessment State Types
export interface AssessmentProgress {
  type: AssessmentType;
  currentQuestionIndex: number;
  totalQuestions: number;
  startedAt: number;
  answers: AssessmentAnswer[];
  isComplete: boolean;
}

export interface AssessmentSession {
  id: string;
  type: AssessmentType;
  progress: AssessmentProgress;
  result?: PHQ9Result | GAD7Result;
  context: 'standalone' | 'onboarding' | 'checkin';
}

// Crisis Intervention Types - Re-export comprehensive types from crisis/safety.ts
// This avoids duplication and ensures all services use the complete type definitions
export type {
  CrisisDetection,
  CrisisIntervention,
  CrisisTriggerType,
  CrisisSeverityLevel,
} from './crisis/safety';

// Legacy Component Props (see components/props.ts for comprehensive)
export interface AssessmentQuestionProps {
  question: AssessmentQuestion;
  currentAnswer?: AssessmentResponse;
  onAnswer: (response: AssessmentResponse) => void;
  showProgress?: boolean;
  currentStep: number;
  totalSteps: number;
}

export interface AssessmentProgressProps {
  progress: AssessmentProgress;
  theme?: 'morning' | 'midday' | 'evening' | 'neutral';
}

export interface AssessmentResultsProps {
  result: PHQ9Result | GAD7Result;
  onComplete: () => void;
  showCrisisIntervention?: boolean;
}

// Legacy Store Actions (see store/actions.ts for comprehensive)
export interface AssessmentActions {
  startAssessment: (type: AssessmentType, context?: string) => void;
  answerQuestion: (questionId: string, response: AssessmentResponse) => void;
  completeAssessment: () => void;
  resetAssessment: () => void;
  triggerCrisisIntervention: (detection: CrisisDetection) => void;
}

// Legacy Navigation Types (see navigation/params.ts for comprehensive)
export type AssessmentStackParamList = {
  AssessmentHome: undefined;
  PHQ9Assessment: { context?: string };
  GAD7Assessment: { context?: string };
  AssessmentResults: {
    type: AssessmentType;
    result: PHQ9Result | GAD7Result;
  };
  CrisisIntervention: {
    detection: CrisisDetection;
  };
};

// Response Scale Labels (Clinically Validated)
export const ASSESSMENT_RESPONSE_LABELS = {
  0: "Not at all",
  1: "Several days",
  2: "More than half the days",
  3: "Nearly every day"
} as const;

// Crisis Thresholds (Clinically Validated - Updated 2025-01-27)
// DUAL-THRESHOLD SYSTEM:
// - PHQ-9 ≥15: Moderately severe depression (support recommended)
// - PHQ-9 ≥20: Severe depression (immediate intervention)
// - GAD-7 ≥15: Severe anxiety (immediate intervention)
export const CRISIS_THRESHOLDS = {
  PHQ9_MODERATE_SEVERE_THRESHOLD: 15,
  PHQ9_SEVERE_THRESHOLD: 20,
  PHQ9_CRISIS_SCORE: 15, // Primary crisis threshold (support recommended)
  GAD7_CRISIS_SCORE: 15,
  GAD7_SEVERE_THRESHOLD: 15,
  PHQ9_SUICIDAL_QUESTION_ID: 'phq9_9', // Question 9: Suicidal ideation
} as const;

// =============================================================================
// COMPREHENSIVE TYPE EXPORTS - DRD-FLOW-005 COMPLETE TYPE SAFETY
// =============================================================================

// Component Types - Enhanced with strict typing and performance constraints
export * from './components/props';

// Store Types - Comprehensive action types with crisis safety validation
export * from './store/actions';

// Navigation Types - Complete parameter types for all assessment flows
export * from './navigation/params';

// Crisis Safety Types - Enhanced safety constraints and intervention protocols
export * from './crisis/safety';

// Utility Types - 100% accurate scoring calculations with clinical validation
export * from './utils/scoring';