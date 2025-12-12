/**
 * Assessment Store Action Types - Comprehensive Type Safety
 * Zustand store actions with strict typing and crisis safety constraints
 * Supports PHQ≥20, GAD≥15 automatic crisis intervention
 */

import type {
  AssessmentType,
  AssessmentResponse,
  AssessmentSession,
  AssessmentProgress,
  PHQ9Result,
  GAD7Result,
  CrisisDetection,
  CrisisIntervention,
  AssessmentAnswer
} from './index';

/**
 * Base Action Interface
 * All store actions must extend this for consistency
 */
export interface BaseAssessmentAction {
  /** Timestamp when action was dispatched */
  timestamp: number;
  /** Session ID for action tracking */
  sessionId: string;
  /** User ID (encrypted) */
  userId?: string;
}

/**
 * Assessment Lifecycle Actions
 */

export interface StartAssessmentAction extends BaseAssessmentAction {
  type: 'START_ASSESSMENT';
  payload: {
    assessmentType: AssessmentType;
    context: 'standalone' | 'onboarding' | 'checkin';
    /** Optional session ID override */
    customSessionId?: string;
    /** Whether to continue previous incomplete session */
    continueSession?: boolean;
  };
}

export interface AnswerQuestionAction extends BaseAssessmentAction {
  type: 'ANSWER_QUESTION';
  payload: {
    questionId: string;
    response: AssessmentResponse;
    /** Whether this answer changed from previous */
    isChange?: boolean;
    /** Response time in milliseconds */
    responseTimeMs: number;
  };
}

export interface NavigateQuestionAction extends BaseAssessmentAction {
  type: 'NAVIGATE_QUESTION';
  payload: {
    direction: 'next' | 'previous' | 'jump';
    targetIndex: number;
    /** Current index before navigation */
    fromIndex: number;
  };
}

export interface CompleteAssessmentAction extends BaseAssessmentAction {
  type: 'COMPLETE_ASSESSMENT';
  payload: {
    result: PHQ9Result | GAD7Result;
    /** Total time taken for assessment (ms) */
    totalTimeMs: number;
    /** Whether assessment was completed normally vs interrupted */
    completionType: 'normal' | 'interrupted' | 'crisis_triggered';
  };
}

export interface ResetAssessmentAction extends BaseAssessmentAction {
  type: 'RESET_ASSESSMENT';
  payload: {
    /** Whether to preserve answers for retry */
    preserveAnswers?: boolean;
    /** Reason for reset */
    reason: 'user_initiated' | 'error' | 'timeout' | 'crisis_intervention';
  };
}

/**
 * Crisis Intervention Actions - CRITICAL SAFETY
 */

export interface TriggerCrisisInterventionAction extends BaseAssessmentAction {
  type: 'TRIGGER_CRISIS_INTERVENTION';
  payload: {
    detection: CrisisDetection;
    /** REQUIRED: Must be <200ms from trigger */
    responseTimeMs: number;
    /** Auto-trigger vs manual trigger */
    triggerSource: 'auto_phq9_score' | 'auto_gad7_score' | 'auto_phq9_suicidal' | 'manual_override';
    /** Assessment state when crisis was triggered */
    assessmentSnapshot: AssessmentProgress;
  };
}

export interface UpdateCrisisInterventionAction extends BaseAssessmentAction {
  type: 'UPDATE_CRISIS_INTERVENTION';
  payload: {
    interventionId: string;
    updates: Partial<CrisisIntervention>;
    /** What was updated */
    updateType: 'contact_support' | 'acknowledge_resources' | 'safety_plan_reviewed' | 'dismissed_safely';
  };
}

export interface ResolveCrisisInterventionAction extends BaseAssessmentAction {
  type: 'RESOLVE_CRISIS_INTERVENTION';
  payload: {
    interventionId: string;
    resolution: 'support_contacted' | 'safety_plan_completed' | 'professional_referral' | 'user_safe';
    /** Total intervention duration (ms) */
    interventionDurationMs: number;
    /** Follow-up required */
    requiresFollowUp: boolean;
  };
}

/**
 * Session Management Actions
 */

export interface SaveSessionAction extends BaseAssessmentAction {
  type: 'SAVE_SESSION';
  payload: {
    session: AssessmentSession;
    /** Whether to encrypt sensitive data */
    encrypt: boolean;
    /** Storage location preference */
    storageLocation: 'local' | 'secure' | 'both';
  };
}

export interface LoadSessionAction extends BaseAssessmentAction {
  type: 'LOAD_SESSION';
  payload: {
    sessionId: string;
    /** Whether session was successfully loaded */
    success: boolean;
    session?: AssessmentSession;
    /** Error if load failed */
    error?: string;
  };
}

export interface DeleteSessionAction extends BaseAssessmentAction {
  type: 'DELETE_SESSION';
  payload: {
    sessionId: string;
    /** Reason for deletion */
    reason: 'user_requested' | 'expired' | 'data_cleanup' | 'privacy_request';
    /** Whether deletion was successful */
    success: boolean;
  };
}

/**
 * Analytics and Monitoring Actions
 */

export interface TrackAssessmentEventAction extends BaseAssessmentAction {
  type: 'TRACK_ASSESSMENT_EVENT';
  payload: {
    eventType: 'question_viewed' | 'answer_selected' | 'progress_updated' | 'assessment_paused' | 'assessment_resumed';
    eventData: Record<string, unknown>;
    /** Whether event contains sensitive data */
    containsSensitiveData: boolean;
  };
}

export interface RecordPerformanceMetricAction extends BaseAssessmentAction {
  type: 'RECORD_PERFORMANCE_METRIC';
  payload: {
    metricType: 'render_time' | 'response_time' | 'navigation_time' | 'crisis_response_time';
    value: number;
    unit: 'ms' | 'fps' | 'bytes';
    /** Performance threshold violation */
    isViolation?: boolean;
  };
}

/**
 * Error Handling Actions
 */

export interface HandleAssessmentErrorAction extends BaseAssessmentAction {
  type: 'HANDLE_ASSESSMENT_ERROR';
  payload: {
    error: Error;
    errorType: 'validation' | 'storage' | 'calculation' | 'navigation' | 'crisis_system';
    /** Whether error is recoverable */
    isRecoverable: boolean;
    /** Recovery strategy */
    recoveryStrategy?: 'retry' | 'reset' | 'fallback' | 'escalate';
    /** Whether error affects crisis safety */
    affectsCrisisSafety: boolean;
  };
}

/**
 * Union of All Assessment Actions
 */
export type AssessmentAction = 
  | StartAssessmentAction
  | AnswerQuestionAction
  | NavigateQuestionAction
  | CompleteAssessmentAction
  | ResetAssessmentAction
  | TriggerCrisisInterventionAction
  | UpdateCrisisInterventionAction
  | ResolveCrisisInterventionAction
  | SaveSessionAction
  | LoadSessionAction
  | DeleteSessionAction
  | TrackAssessmentEventAction
  | RecordPerformanceMetricAction
  | HandleAssessmentErrorAction;

/**
 * Store State Shape
 */
export interface AssessmentStoreState {
  /** Current active session */
  currentSession: AssessmentSession | null;
  /** Active crisis intervention */
  activeCrisisIntervention: CrisisIntervention | null;
  /** Recent assessment results (encrypted) */
  recentResults: Array<PHQ9Result | GAD7Result>;
  /** Performance metrics */
  performanceMetrics: {
    averageResponseTime: number;
    crisisResponseTimes: number[];
    renderPerformance: number[];
  };
  /** Error state */
  error: {
    hasError: boolean;
    errorMessage?: string;
    errorType?: string;
    isRecoverable?: boolean;
  };
  /** Loading states */
  loading: {
    startingAssessment: boolean;
    savingProgress: boolean;
    calculatingResults: boolean;
    triggeringCrisis: boolean;
  };
}

/**
 * Store Actions Interface
 */
export interface AssessmentStoreActions {
  // Assessment Lifecycle
  startAssessment: (type: AssessmentType, context?: string) => Promise<void>;
  answerQuestion: (questionId: string, response: AssessmentResponse) => Promise<void>;
  navigateToQuestion: (index: number) => void;
  completeAssessment: () => Promise<PHQ9Result | GAD7Result>;
  resetAssessment: (preserveAnswers?: boolean) => void;
  
  // Crisis Intervention - CRITICAL SAFETY
  triggerCrisisIntervention: (detection: CrisisDetection) => Promise<void>;
  updateCrisisIntervention: (updates: Partial<CrisisIntervention>) => void;
  resolveCrisisIntervention: (resolution: string) => Promise<void>;
  
  // Session Management
  saveSession: (encrypt?: boolean) => Promise<void>;
  loadSession: (sessionId: string) => Promise<AssessmentSession | null>;
  deleteSession: (sessionId: string) => Promise<boolean>;
  
  // Utilities
  validateAssessmentData: () => boolean;
  calculateScore: (answers: AssessmentAnswer[], type: AssessmentType) => number;
  checkCrisisThresholds: (score: number, type: AssessmentType, answers?: AssessmentAnswer[]) => CrisisDetection | null;
  
  // Performance Monitoring
  recordPerformanceMetric: (type: string, value: number) => void;
  getPerformanceReport: () => Record<string, number>;
  
  // Error Handling
  handleError: (error: Error, context: string) => void;
  clearError: () => void;
  recoverFromError: () => Promise<boolean>;
}

/**
 * Action Creator Type Helpers
 */
export type AssessmentActionCreator<T extends AssessmentAction> = (
  payload: T['payload']
) => T;

export type AssessmentThunkAction<T = void> = (
  get: () => AssessmentStoreState,
  set: (partial: Partial<AssessmentStoreState>) => void
) => Promise<T> | T;

/**
 * Crisis Safety Type Guards
 */
export function isCrisisAction(action: AssessmentAction): action is TriggerCrisisInterventionAction | UpdateCrisisInterventionAction | ResolveCrisisInterventionAction {
  return action.type.includes('CRISIS');
}

export function requiresCrisisValidation(action: AssessmentAction): boolean {
  return action.type === 'COMPLETE_ASSESSMENT' || 
         action.type === 'ANSWER_QUESTION' ||
         action.type === 'TRIGGER_CRISIS_INTERVENTION';
}

/**
 * Store Configuration Constants
 */
export const ASSESSMENT_STORE_CONFIG = {
  /** Maximum number of recent results to store */
  MAX_RECENT_RESULTS: 50,
  /** Session timeout in milliseconds */
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  /** Crisis intervention timeout (must respond within) */
  CRISIS_INTERVENTION_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
  /** Performance metric retention period */
  PERFORMANCE_RETENTION_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  /** Auto-save interval */
  AUTO_SAVE_INTERVAL_MS: 10 * 1000, // 10 seconds
} as const;