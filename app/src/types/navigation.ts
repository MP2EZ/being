/**
 * Navigation Type Definitions - Enhanced for Clinical Safety
 * Type-safe navigation with crisis intervention priority routing
 */

import { NavigatorScreenParams } from '@react-navigation/native';
import { AssessmentID, CheckInID, PHQ9Score, GAD7Score } from './clinical';

// Root Stack Navigator types - Crisis routes have priority
export type RootStackParamList = {
  // Emergency Routes - Always accessible
  CrisisIntervention: CrisisInterventionParams;
  EmergencyContacts: EmergencyContactParams;
  
  // Standard App Flow
  Onboarding: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  
  // Check-in Flow - Type-safe parameters
  CheckInFlow: CheckInFlowParams;
  
  // Assessment Flow - Clinical accuracy required
  AssessmentFlow: AssessmentFlowParams;
  AssessmentResults: AssessmentResultsParams;
  
  // Crisis Management
  CrisisPlan: CrisisPlanParams;
  SafetyPlan: undefined;
  
  // Settings and Profile
  Settings: undefined;
  PrivacySettings: undefined;
  DataExport: undefined;
};

// Crisis Navigation Parameters - Highest Priority
export interface CrisisInterventionParams {
  readonly trigger: CrisisTrigger;
  readonly assessmentId?: AssessmentID;
  readonly fromScreen: string;
  readonly emergencyMode?: boolean;
}

export interface EmergencyContactParams {
  readonly contactType: 'hotline' | 'personal' | 'professional';
  readonly urgency: 'low' | 'moderate' | 'high' | 'critical';
}

// Check-in Flow Parameters - Type-safe for therapeutic accuracy
export interface CheckInFlowParams {
  readonly type: 'morning' | 'midday' | 'evening';
  readonly resumeSession?: boolean;
  readonly sessionId?: CheckInID;
  readonly startStep?: number;
}

// Assessment Flow Parameters - Clinical data integrity
export interface AssessmentFlowParams {
  readonly type: 'phq9' | 'gad7';
  readonly context: 'onboarding' | 'standalone' | 'clinical';
  readonly resumeSession?: boolean;
  readonly assessmentId?: AssessmentID;
}

export interface AssessmentResultsParams {
  readonly assessmentId: AssessmentID;
  readonly type: 'phq9' | 'gad7';
  readonly score: PHQ9Score | GAD7Score;
  readonly severity: string;
  readonly requiresCrisisIntervention: boolean;
  readonly completedAt: string;
  
  // Include answers for suicidal ideation check
  readonly answers?: readonly number[];
  readonly suicidalIdeation?: boolean;
}

// Crisis Plan Parameters
export interface CrisisPlanParams {
  readonly mode: 'view' | 'edit' | 'create';
  readonly urgency?: 'preventive' | 'active_crisis';
}

// Crisis Trigger Types
export type CrisisTrigger = 
  | { readonly type: 'assessment'; readonly score: PHQ9Score | GAD7Score; readonly assessmentType: 'phq9' | 'gad7' }
  | { readonly type: 'suicidal_ideation'; readonly assessmentId: AssessmentID }
  | { readonly type: 'manual'; readonly reason: string }
  | { readonly type: 'pattern_detection'; readonly description: string };

// Main Tab Navigator types
export type MainTabParamList = {
  Home: undefined;
  CheckIn: CheckInTabParams;
  Progress: undefined;
  Resources: undefined;
  Profile: undefined;
};

export interface CheckInTabParams {
  readonly highlightType?: 'morning' | 'midday' | 'evening';
  readonly showProgress?: boolean;
}

// Screen-specific parameter types
export type CheckInStackParamList = {
  // Morning Flow
  MorningBodyScan: CheckInStepParams;
  MorningEmotions: CheckInStepParams;
  MorningThoughts: CheckInStepParams;
  MorningEnergy: CheckInStepParams;
  MorningValues: CheckInStepParams;
  MorningDreams: CheckInStepParams;
  
  // Midday Flow
  MiddayEmotions: CheckInStepParams;
  MiddayBreathing: CheckInStepParams;
  MiddayEvents: CheckInStepParams;
  
  // Evening Flow
  EveningReview: CheckInStepParams;
  EveningGratitude: CheckInStepParams;
  EveningLearning: CheckInStepParams;
  EveningTension: CheckInStepParams;
  EveningSleep: CheckInStepParams;
};

export interface CheckInStepParams {
  readonly sessionId: CheckInID;
  readonly stepIndex: number;
  readonly totalSteps: number;
  readonly canSkip: boolean;
  readonly timeRemaining?: number; // milliseconds
}

export type AssessmentStackParamList = {
  AssessmentIntro: AssessmentIntroParams;
  AssessmentQuestion: AssessmentQuestionParams;
  AssessmentResults: AssessmentResultsParams;
  AssessmentComplete: AssessmentCompleteParams;
};

export interface AssessmentIntroParams {
  readonly type: 'phq9' | 'gad7';
  readonly context: 'onboarding' | 'standalone' | 'clinical';
  readonly isFollowUp?: boolean;
}

export interface AssessmentQuestionParams {
  readonly assessmentId: AssessmentID;
  readonly questionIndex: number;
  readonly totalQuestions: number;
  readonly canGoBack: boolean;
  readonly answers: readonly number[];
}

export interface AssessmentCompleteParams {
  readonly assessmentId: AssessmentID;
  readonly showCelebration: boolean;
  readonly nextSteps?: readonly string[];
}

// Navigation State Types
export interface NavigationState {
  readonly currentRoute: keyof RootStackParamList;
  readonly previousRoute?: keyof RootStackParamList;
  readonly navigationHistory: readonly string[];
  readonly crisisMode: boolean;
  readonly emergencyAccess: boolean;
}

// Navigation Guards for Clinical Safety
export interface NavigationGuard {
  readonly canNavigate: (
    from: keyof RootStackParamList,
    to: keyof RootStackParamList,
    params?: any
  ) => Promise<boolean>;
  readonly requiresConfirmation: (route: keyof RootStackParamList) => boolean;
  readonly isEmergencyRoute: (route: keyof RootStackParamList) => boolean;
}

// Performance Constraints for Critical Navigation
export interface NavigationPerformance {
  readonly maxRouteChangeTime: 200; // milliseconds for crisis routes
  readonly standardRouteChangeTime: 500; // milliseconds for normal routes
  readonly emergencyRouteTimeout: 3000; // milliseconds before fallback
}

// Navigation Event Types
export type NavigationEvent = 
  | { readonly type: 'route_change'; readonly from: string; readonly to: string; readonly timestamp: string }
  | { readonly type: 'crisis_navigation'; readonly trigger: CrisisTrigger; readonly timestamp: string }
  | { readonly type: 'emergency_access'; readonly contactType: string; readonly timestamp: string }
  | { readonly type: 'session_timeout'; readonly sessionType: string; readonly timestamp: string };

// Type Guards for Navigation Parameters
export const isCrisisInterventionParams = (params: any): params is CrisisInterventionParams => {
  return params && typeof params === 'object' && 'trigger' in params && 'fromScreen' in params;
};

export const isAssessmentResultsParams = (params: any): params is AssessmentResultsParams => {
  return (
    params &&
    typeof params === 'object' &&
    'assessmentId' in params &&
    'type' in params &&
    'score' in params &&
    'requiresCrisisIntervention' in params
  );
};

export const isEmergencyRoute = (route: keyof RootStackParamList): boolean => {
  return ['CrisisIntervention', 'EmergencyContacts', 'SafetyPlan'].includes(route);
};

// Navigation Constants
export const NAVIGATION_CONSTANTS = {
  CRISIS_ROUTES: ['CrisisIntervention', 'EmergencyContacts', 'SafetyPlan'] as const,
  PERFORMANCE: {
    CRISIS_ROUTE_MAX_TIME_MS: 200,
    STANDARD_ROUTE_MAX_TIME_MS: 500,
    EMERGENCY_TIMEOUT_MS: 3000,
  },
  SESSION: {
    MAX_CHECKIN_TIME_MINUTES: 120,
    MAX_ASSESSMENT_TIME_MINUTES: 30,
    IDLE_TIMEOUT_MINUTES: 15,
  },
} as const;

// Navigation prop types for screens - Enhanced type safety
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

// Utility types for navigation
export type NavigationParamsFor<T extends keyof RootStackParamList> = RootStackParamList[T];

export type NavigationPropsFor<T extends keyof RootStackParamList> = {
  readonly route: { readonly params: NavigationParamsFor<T> };
  readonly navigation: {
    readonly navigate: <K extends keyof RootStackParamList>(
      screen: K,
      params?: NavigationParamsFor<K>
    ) => void;
    readonly goBack: () => void;
    readonly canGoBack: () => boolean;
  };
};