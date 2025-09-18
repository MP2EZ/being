/**
 * Zustand Store Types - Type-Safe State Management
 * 
 * Ensures type safety across all store operations with strict
 * validation for clinical data and crisis intervention flows.
 */

import {
  Assessment,
  PHQ9Answers,
  GAD7Answers,
  PHQ9Score,
  GAD7Score,
  AssessmentID,
  CheckInID,
  ClinicalCalculations,
} from './clinical';

import { CheckIn, UserProfile, CrisisPlan } from '../types';
import { DataSensitivity } from './security';

// Base Store Interface with Error Handling
interface BaseStore {
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly lastUpdated: string | null;
}

// Assessment Store Types - Critical for Clinical Accuracy
export interface AssessmentStore extends BaseStore, ClinicalCalculations {
  // State
  readonly assessments: readonly Assessment[];
  readonly currentAssessment: CurrentAssessment | null;
  
  // Actions - Type-safe operations
  readonly loadAssessments: () => Promise<void>;
  readonly startAssessment: <T extends 'phq9' | 'gad7'>(
    type: T, 
    context?: 'onboarding' | 'standalone' | 'clinical'
  ) => void;
  
  // Answer Management - Prevents Invalid Responses
  readonly answerQuestion: <T extends 'phq9' | 'gad7'>(
    answer: T extends 'phq9' ? PHQ9Answers[number] : GAD7Answers[number]
  ) => void;
  
  readonly goToPreviousQuestion: () => void;
  readonly saveAssessment: () => Promise<void>;
  readonly completeAssessment: () => void;
  readonly clearCurrentAssessment: () => void;
  
  // Queries - Type-safe data retrieval
  readonly getAssessmentsByType: <T extends 'phq9' | 'gad7'>(
    type: T
  ) => Promise<Array<Assessment & { type: T }>>;
  
  readonly getLatestAssessment: <T extends 'phq9' | 'gad7'>(
    type: T
  ) => Promise<(Assessment & { type: T }) | null>;
  
  // Computed Properties
  readonly isAssessmentComplete: () => boolean;
  readonly getCurrentProgress: () => AssessmentProgress;
  readonly getCrisisRisk: () => CrisisRisk;
}

// Current Assessment State - Type-safe based on assessment type
export type CurrentAssessment = 
  | {
      readonly type: 'phq9';
      readonly answers: Partial<PHQ9Answers>;
      readonly currentQuestion: number;
      readonly context: 'onboarding' | 'standalone' | 'clinical';
      readonly config: PHQ9Config;
    }
  | {
      readonly type: 'gad7';
      readonly answers: Partial<GAD7Answers>;
      readonly currentQuestion: number;
      readonly context: 'onboarding' | 'standalone' | 'clinical';
      readonly config: GAD7Config;
    };

// Assessment Configuration Types
export interface PHQ9Config {
  readonly type: 'phq9';
  readonly questions: readonly AssessmentQuestion[];
  readonly scoringThresholds: PHQ9ScoringThresholds;
}

export interface GAD7Config {
  readonly type: 'gad7';
  readonly questions: readonly AssessmentQuestion[];
  readonly scoringThresholds: GAD7ScoringThresholds;
}

export interface AssessmentQuestion {
  readonly id: number;
  readonly text: string;
  readonly options: readonly AssessmentOption[];
}

export interface AssessmentOption {
  readonly value: 0 | 1 | 2 | 3;
  readonly text: string;
}

export interface PHQ9ScoringThresholds {
  readonly minimal: 4;
  readonly mild: 9;
  readonly moderate: 14;
  readonly moderatelySevere: 19;
  readonly severe: 27;
}

export interface GAD7ScoringThresholds {
  readonly minimal: 4;
  readonly mild: 9;
  readonly moderate: 14;
  readonly severe: 21;
}

// Check-in Store Types
export interface CheckInStore extends BaseStore {
  // State
  readonly checkIns: readonly CheckIn[];
  readonly currentCheckIn: CurrentCheckIn | null;
  
  // Actions
  readonly loadCheckIns: () => Promise<void>;
  readonly startCheckIn: (type: 'morning' | 'midday' | 'evening') => void;
  readonly updateCurrentCheckIn: <T extends CheckIn['type']>(
    updates: Partial<CheckInData<T>>
  ) => void;
  readonly saveCheckIn: () => Promise<void>;
  readonly skipCheckIn: (reason: string) => Promise<void>;
  readonly clearCurrentCheckIn: () => void;
  
  // Queries
  readonly getRecentCheckIns: (days?: number) => Promise<readonly CheckIn[]>;
  readonly getTodayCheckIns: () => Promise<readonly CheckIn[]>;
  readonly getCheckInsByType: <T extends CheckIn['type']>(
    type: T,
    days?: number
  ) => Promise<readonly Array<CheckIn & { type: T }>>;
  
  // Computed Properties
  readonly getCheckInProgress: () => CheckInProgress;
  readonly getStreaks: () => CheckInStreaks;
}

// Current Check-in State - Type-safe based on check-in type
export type CurrentCheckIn = 
  | {
      readonly type: 'morning';
      readonly data: Partial<MorningCheckInData>;
      readonly currentStep: number;
      readonly startedAt: string;
    }
  | {
      readonly type: 'midday';
      readonly data: Partial<MiddayCheckInData>;
      readonly currentStep: number;
      readonly startedAt: string;
    }
  | {
      readonly type: 'evening';
      readonly data: Partial<EveningCheckInData>;
      readonly currentStep: number;
      readonly startedAt: string;
    };

// Type-safe Check-in Data based on type
export type CheckInData<T extends CheckIn['type']> = 
  T extends 'morning' 
    ? MorningCheckInData
    : T extends 'midday'
    ? MiddayCheckInData
    : T extends 'evening'
    ? EveningCheckInData
    : never;

export interface MorningCheckInData {
  readonly bodyAreas?: readonly string[];
  readonly emotions?: readonly string[];
  readonly thoughts?: readonly string[];
  readonly sleepQuality?: number;
  readonly energyLevel?: number;
  readonly anxietyLevel?: number;
  readonly todayValue?: string;
  readonly intention?: string;
  readonly dreams?: string;
}

export interface MiddayCheckInData {
  readonly currentEmotions?: readonly string[];
  readonly breathingCompleted?: boolean;
  readonly pleasantEvent?: string;
  readonly unpleasantEvent?: string;
  readonly currentNeed?: string;
  readonly stressLevel?: number;
}

export interface EveningCheckInData {
  readonly dayHighlight?: string;
  readonly dayChallenge?: string;
  readonly dayEmotions?: readonly string[];
  readonly gratitude1?: string;
  readonly gratitude2?: string;
  readonly gratitude3?: string;
  readonly dayLearning?: string;
  readonly tensionAreas?: readonly string[];
  readonly releaseNote?: string;
  readonly sleepIntentions?: readonly string[];
  readonly tomorrowFocus?: string;
  readonly lettingGo?: string;
}

// User Store Types
export interface UserStore extends BaseStore {
  // State
  readonly user: UserProfile | null;
  readonly onboardingCompleted: boolean;
  
  // Actions
  readonly loadUser: () => Promise<void>;
  readonly saveUser: (user: UserProfile) => Promise<void>;
  readonly updateUserPreferences: (preferences: Partial<UserProfile['preferences']>) => Promise<void>;
  readonly updateNotificationSettings: (notifications: Partial<UserProfile['notifications']>) => Promise<void>;
  readonly completeOnboarding: () => Promise<void>;
  readonly clearUser: () => Promise<void>;
  
  // Queries
  readonly isOnboardingRequired: () => boolean;
  readonly getUserPreferences: () => UserProfile['preferences'] | null;
  readonly getNotificationSettings: () => UserProfile['notifications'] | null;
}

// Crisis Store Types - High Priority for Safety
export interface CrisisStore extends BaseStore {
  // State
  readonly crisisPlan: CrisisPlan | null;
  readonly isInCrisis: boolean;
  readonly crisisHistory: readonly CrisisEvent[];
  
  // Actions
  readonly loadCrisisPlan: () => Promise<void>;
  readonly saveCrisisPlan: (plan: CrisisPlan) => Promise<void>;
  readonly updateCrisisPlan: (updates: Partial<CrisisPlan>) => Promise<void>;
  readonly activateCrisis: (trigger: CrisisTrigger) => Promise<void>;
  readonly deactivateCrisis: () => Promise<void>;
  readonly logCrisisEvent: (event: CrisisEvent) => Promise<void>;
  
  // Emergency Operations - Must be < 200ms response time
  readonly emergencyCall: (number: '988' | '741741') => Promise<void>;
  readonly emergencyContact: (contactId: string) => Promise<void>;
  readonly accessSafetyPlan: () => Promise<void>;
  
  // Queries
  readonly hasCrisisPlan: () => boolean;
  readonly getEmergencyContacts: () => readonly CrisisPlan['contacts']['trustedFriends'];
  readonly getCopingStrategies: () => readonly string[];
}

// Progress and Analytics Types
export interface AssessmentProgress {
  readonly current: number;
  readonly total: number;
  readonly percentage: number;
  readonly canProceed: boolean;
  readonly canGoBack: boolean;
}

export interface CheckInProgress {
  readonly current: number;
  readonly total: number;
  readonly percentage: number;
  readonly estimatedTimeRemaining: number; // milliseconds
  readonly completedSteps: readonly string[];
}

export interface CheckInStreaks {
  readonly current: number;
  readonly longest: number;
  readonly thisWeek: number;
  readonly thisMonth: number;
}

// Crisis Detection and Management
export interface CrisisRisk {
  readonly level: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  readonly score: number;
  readonly factors: readonly CrisisRiskFactor[];
  readonly recommendedActions: readonly string[];
  readonly requiresImmediateAttention: boolean;
}

export interface CrisisRiskFactor {
  readonly type: 'phq9_score' | 'gad7_score' | 'suicidal_ideation' | 'pattern_change';
  readonly severity: 'low' | 'moderate' | 'high' | 'critical';
  readonly description: string;
  readonly value: number | string;
}

export type CrisisTrigger = 
  | { type: 'assessment'; assessmentId: AssessmentID; score: PHQ9Score | GAD7Score }
  | { type: 'manual'; reason: string }
  | { type: 'pattern'; description: string };

export interface CrisisEvent {
  readonly id: string;
  readonly timestamp: string;
  readonly trigger: CrisisTrigger;
  readonly actions: readonly CrisisAction[];
  readonly resolved: boolean;
  readonly duration?: number; // milliseconds
}

export interface CrisisAction {
  readonly type: 'emergency_call' | 'contact_reached' | 'coping_strategy' | 'safety_plan';
  readonly timestamp: string;
  readonly details: string;
  readonly success: boolean;
}

// Store Validation Types
export interface StoreValidation<T> {
  readonly validateState: (state: T) => ValidationResult;
  readonly validateAction: (action: string, payload: unknown) => ValidationResult;
  readonly validateQuery: (query: string, params: unknown) => ValidationResult;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
}

export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly severity: 'error' | 'critical';
  readonly code?: string;
}

export interface ValidationWarning {
  readonly field: string;
  readonly message: string;
  readonly recommendation?: string;
}

// Performance Monitoring for Stores
export interface StorePerformanceMetrics {
  readonly actionDuration: number;
  readonly queryDuration: number;
  readonly stateSize: number;
  readonly lastUpdate: string;
  readonly operationCount: number;
}

// Store Migration Types
export interface StoreMigration {
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly description: string;
  readonly migrate: (oldState: unknown) => unknown;
  readonly validate: (newState: unknown) => boolean;
}

// Type Guards for Store State
export const isAssessmentStore = (store: unknown): store is AssessmentStore => {
  return (
    typeof store === 'object' &&
    store !== null &&
    'assessments' in store &&
    'calculateScore' in store
  );
};

export const isCheckInStore = (store: unknown): store is CheckInStore => {
  return (
    typeof store === 'object' &&
    store !== null &&
    'checkIns' in store &&
    'startCheckIn' in store
  );
};

export const isCrisisStore = (store: unknown): store is CrisisStore => {
  return (
    typeof store === 'object' &&
    store !== null &&
    'crisisPlan' in store &&
    'activateCrisis' in store
  );
};

// Store Constants
export const STORE_CONSTANTS = {
  ASSESSMENT: {
    MAX_RETRIES: 3,
    TIMEOUT_MS: 10000,
    AUTO_SAVE_INTERVAL_MS: 30000,
  },
  CHECKIN: {
    MAX_DURATION_HOURS: 2,
    AUTO_SAVE_INTERVAL_MS: 15000,
    MAX_STORED_SESSIONS: 10,
  },
  CRISIS: {
    MAX_RESPONSE_TIME_MS: 200,
    EMERGENCY_TIMEOUT_MS: 5000,
    AUTO_DEACTIVATE_HOURS: 24,
  },
  PERFORMANCE: {
    MAX_ACTION_TIME_MS: 1000,
    MAX_QUERY_TIME_MS: 500,
    MAX_STATE_SIZE_MB: 10,
  },
} as const;