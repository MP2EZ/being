/**
 * Assessment Navigation Parameter Types
 * Comprehensive type definitions for React Navigation with assessment flows
 * Supports crisis intervention routing and safety constraints
 */

import { 
  AssessmentType, 
  PHQ9Result, 
  GAD7Result, 
  CrisisDetection, 
  CrisisIntervention,
  AssessmentSession 
} from '../index';

/**
 * Root Assessment Stack Parameters
 * Main navigation stack for assessment flow
 */
export type AssessmentStackParamList = {
  /** Assessment entry/home screen */
  AssessmentHome: {
    /** Context from which assessment was started */
    context?: 'standalone' | 'onboarding' | 'checkin';
    /** Previous assessment results for context */
    previousResults?: Array<PHQ9Result | GAD7Result>;
    /** Whether this is a retry attempt */
    isRetry?: boolean;
  };

  /** Assessment selection screen */
  AssessmentSelection: {
    /** Available assessment types */
    availableTypes: AssessmentType[];
    /** Recommended assessment based on context */
    recommended?: AssessmentType;
    /** Context for selection */
    context: 'standalone' | 'onboarding' | 'checkin';
  };

  /** PHQ-9 Assessment Screen */
  PHQ9Assessment: {
    /** Session ID for continuation */
    sessionId?: string;
    /** Context in which assessment is taken */
    context: 'standalone' | 'onboarding' | 'checkin';
    /** Starting question index (for continuation) */
    startIndex?: number;
    /** Pre-filled answers (for retry/continuation) */
    prefilledAnswers?: Record<string, number>;
    /** Whether crisis intervention is already active */
    crisisActive?: boolean;
  };

  /** GAD-7 Assessment Screen */
  GAD7Assessment: {
    /** Session ID for continuation */
    sessionId?: string;
    /** Context in which assessment is taken */
    context: 'standalone' | 'onboarding' | 'checkin';
    /** Starting question index (for continuation) */
    startIndex?: number;
    /** Pre-filled answers (for retry/continuation) */
    prefilledAnswers?: Record<string, number>;
    /** Whether crisis intervention is already active */
    crisisActive?: boolean;
  };

  /** Assessment Results Screen */
  AssessmentResults: {
    /** Assessment type that was completed */
    type: AssessmentType;
    /** Complete assessment result */
    result: PHQ9Result | GAD7Result;
    /** Session ID for tracking */
    sessionId: string;
    /** Whether to show detailed breakdown */
    showDetails?: boolean;
    /** Next action recommendation */
    nextAction?: 'crisis_intervention' | 'continue_onboarding' | 'return_home' | 'repeat_assessment';
    /** Context for appropriate messaging */
    context: 'standalone' | 'onboarding' | 'checkin';
  };

  /** Crisis Intervention Screen - CRITICAL SAFETY */
  CrisisIntervention: {
    /** Crisis detection that triggered intervention */
    detection: CrisisDetection;
    /** Current intervention state */
    intervention?: CrisisIntervention;
    /** Assessment result that triggered crisis */
    triggeringResult: PHQ9Result | GAD7Result;
    /** Session ID for tracking */
    sessionId: string;
    /** Whether intervention can be dismissed */
    canDismiss: boolean;
    /** Emergency contact override */
    emergencyContactOverride?: {
      name: string;
      phone: string;
      relationship: string;
    };
    /** Return route after intervention */
    returnRoute?: keyof AssessmentStackParamList;
  };

  /** Safety Resources Screen */
  SafetyResources: {
    /** How user arrived at resources */
    source: 'crisis_intervention' | 'assessment_results' | 'direct_access';
    /** Crisis context if applicable */
    crisisContext?: CrisisDetection;
    /** User's location for local resources */
    userLocation?: {
      latitude: number;
      longitude: number;
      city?: string;
      state?: string;
    };
  };

  /** Assessment History Screen */
  AssessmentHistory: {
    /** Date range for history */
    dateRange?: {
      start: Date;
      end: Date;
    };
    /** Filter by assessment type */
    filterType?: AssessmentType;
    /** Whether to show crisis episodes */
    includeCrisisEpisodes?: boolean;
    /** Sort order */
    sortOrder?: 'newest' | 'oldest' | 'score_high' | 'score_low';
  };

  /** Progress Tracking Screen */
  ProgressTracking: {
    /** Assessment results for tracking */
    results: Array<PHQ9Result | GAD7Result>;
    /** Time period for progress view */
    timePeriod: 'week' | 'month' | 'quarter' | 'year';
    /** Goal tracking if applicable */
    goals?: {
      targetScore: number;
      targetDate: Date;
      assessmentType: AssessmentType;
    };
  };
};

/**
 * Modal Navigation Parameters
 * For overlays and modal screens
 */
export type AssessmentModalParamList = {
  /** Crisis Alert Modal - Cannot be dismissed */
  CrisisAlert: {
    detection: CrisisDetection;
    /** Required response time (ms) */
    responseTimeRequirement: number;
    /** Emergency actions available */
    emergencyActions: Array<{
      id: string;
      label: string;
      action: 'call_988' | 'call_emergency' | 'contact_support' | 'safety_plan';
    }>;
  };

  /** Assessment Pause Modal */
  AssessmentPause: {
    /** Current session to pause */
    session: AssessmentSession;
    /** Pause reason */
    reason?: 'user_initiated' | 'system_timeout' | 'interruption';
    /** Whether answers can be saved */
    canSaveProgress: boolean;
  };

  /** Score Explanation Modal */
  ScoreExplanation: {
    /** Assessment type for appropriate explanation */
    assessmentType: AssessmentType;
    /** User's score */
    score: number;
    /** Severity level */
    severity: string;
    /** Whether to show therapeutic guidance */
    showTherapeuticGuidance: boolean;
  };

  /** Privacy Notice Modal */
  PrivacyNotice: {
    /** Context for privacy notice */
    context: 'first_assessment' | 'data_sharing' | 'crisis_intervention';
    /** Whether acceptance is required */
    requiresAcceptance: boolean;
  };
};

/**
 * Tab Navigation Parameters
 * For assessment-related tabs
 */
export type AssessmentTabParamList = {
  /** Current Assessment Tab */
  CurrentAssessment: undefined;

  /** Assessment History Tab */
  History: {
    /** Default filter */
    defaultFilter?: AssessmentType;
  };

  /** Progress Tab */
  Progress: {
    /** Default time period */
    defaultPeriod?: 'week' | 'month' | 'quarter';
  };

  /** Resources Tab */
  Resources: {
    /** Show crisis resources prominently */
    highlightCrisisResources?: boolean;
  };
};

/**
 * Navigation State Types
 */
export interface AssessmentNavigationState {
  /** Current route name */
  routeName: keyof AssessmentStackParamList;
  /** Navigation parameters */
  params: AssessmentStackParamList[keyof AssessmentStackParamList];
  /** Navigation history for back button */
  history: Array<{
    routeName: keyof AssessmentStackParamList;
    timestamp: number;
  }>;
  /** Whether crisis intervention is blocking navigation */
  crisisNavigationBlock: boolean;
}

/**
 * Navigation Guards and Constraints
 */
export interface AssessmentNavigationGuards {
  /** Routes that require crisis safety check */
  crisisSafetyRoutes: Array<keyof AssessmentStackParamList>;
  /** Routes that cannot be accessed during crisis */
  crisisBlockedRoutes: Array<keyof AssessmentStackParamList>;
  /** Routes that require session validation */
  sessionRequiredRoutes: Array<keyof AssessmentStackParamList>;
  /** Routes that require authentication */
  authRequiredRoutes: Array<keyof AssessmentStackParamList>;
}

/**
 * Navigation Timing Requirements
 */
export interface AssessmentNavigationTiming {
  /** Maximum navigation time between routes (ms) */
  maxNavigationTime: number;
  /** Crisis intervention navigation must be <200ms */
  crisisNavigationMaxTime: number;
  /** Timeout for route transitions */
  routeTransitionTimeout: number;
}

/**
 * Navigation Events
 */
export type AssessmentNavigationEvent = 
  | {
      type: 'NAVIGATE_TO_ASSESSMENT';
      payload: {
        assessmentType: AssessmentType;
        context: string;
        timestamp: number;
      };
    }
  | {
      type: 'CRISIS_NAVIGATION_TRIGGERED';
      payload: {
        detection: CrisisDetection;
        fromRoute: string;
        timestamp: number;
        responseTime: number;
      };
    }
  | {
      type: 'ASSESSMENT_COMPLETED';
      payload: {
        result: PHQ9Result | GAD7Result;
        nextRoute: string;
        timestamp: number;
      };
    }
  | {
      type: 'NAVIGATION_BLOCKED';
      payload: {
        blockedRoute: string;
        reason: 'crisis_active' | 'session_invalid' | 'auth_required';
        timestamp: number;
      };
    };

/**
 * Type Guards for Navigation Parameters
 */
export function isCrisisNavigationParams(
  params: unknown
): params is AssessmentStackParamList['CrisisIntervention'] {
  return (
    typeof params === 'object' &&
    params !== null &&
    'detection' in params &&
    'triggeringResult' in params
  );
}

export function isAssessmentParams(
  params: unknown
): params is AssessmentStackParamList['PHQ9Assessment'] | AssessmentStackParamList['GAD7Assessment'] {
  return (
    typeof params === 'object' &&
    params !== null &&
    'context' in params
  );
}

export function requiresCrisisCheck(routeName: keyof AssessmentStackParamList): boolean {
  const crisisSafetyRoutes: Array<keyof AssessmentStackParamList> = [
    'AssessmentResults',
    'CrisisIntervention',
    'SafetyResources'
  ];
  return crisisSafetyRoutes.includes(routeName);
}

/**
 * Navigation Utilities
 */
export interface AssessmentNavigationUtils {
  /** Get safe navigation route based on crisis state */
  getSafeNavigationRoute: (
    targetRoute: keyof AssessmentStackParamList,
    crisisState: CrisisIntervention | null
  ) => keyof AssessmentStackParamList;

  /** Validate navigation parameters */
  validateNavigationParams: (
    routeName: keyof AssessmentStackParamList,
    params: unknown
  ) => boolean;

  /** Get crisis-appropriate navigation options */
  getCrisisNavigationOptions: (
    detection: CrisisDetection
  ) => Array<{
    routeName: keyof AssessmentStackParamList;
    params: unknown;
    priority: 'high' | 'medium' | 'low';
  }>;
}

/**
 * Navigation Performance Requirements
 */
export const ASSESSMENT_NAVIGATION_CONSTRAINTS = {
  /** Maximum time for any navigation (ms) */
  MAX_NAVIGATION_TIME_MS: 500,
  /** Crisis navigation must be immediate */
  CRISIS_NAVIGATION_MAX_TIME_MS: 200,
  /** Assessment start navigation timeout */
  ASSESSMENT_START_TIMEOUT_MS: 1000,
  /** Modal display time requirement */
  MODAL_DISPLAY_MAX_TIME_MS: 300,
} as const;

/**
 * Export all navigation types
 */
export type AssessmentNavigationParamList = 
  & AssessmentStackParamList 
  & AssessmentModalParamList 
  & AssessmentTabParamList;