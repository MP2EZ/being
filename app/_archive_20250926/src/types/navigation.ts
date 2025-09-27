/**
 * Navigation Types - React Navigation v6 with TypeScript
 *
 * Type-safe navigation for the Being. MBCT app with strict mode compliance
 * and crisis intervention route safety.
 *
 * CRITICAL: Navigation types must prevent invalid route transitions
 * during crisis situations and ensure emergency access.
 */

import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp, BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp, NavigationState, PartialState } from '@react-navigation/native';

import type {
  UserID,
  SessionID,
  ISODateString,
  CrisisSeverity,
  DurationMs,
  DeepReadonly,
} from './core';
import type { Assessment, AssessmentID, PHQ9Score, GAD7Score } from './clinical';
import { CheckInType } from './widget';

// === ROUTE PARAMETER TYPES ===

/**
 * Root navigation parameter list
 */
export type RootStackParamList = {
  // Authentication flow
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: { email?: string };

  // Onboarding flow
  Onboarding: undefined;
  OnboardingPersonalization: undefined;
  OnboardingAssessment: { assessmentType: 'phq9' | 'gad7' };
  OnboardingComplete: undefined;

  // Main app flow
  MainTabs: undefined;

  // Main app navigation
  Main: {
    screen?: string;
    params?: {
      fromWidget?: boolean;
      timestamp?: string;
      reset?: boolean;
    };
  };

  // Home screen
  Home: {
    fromWidget?: boolean;
    timestamp?: string;
  };

  // Authentication screens
  Authentication: undefined;
  SignIn: {
    returnTo?: string;
    emergencyMode?: boolean;
    migrationContext?: string;
  };
  SignUp: {
    returnTo?: string;
    migrationContext?: string;
    inviteCode?: string;
  };
  OnboardingIntroduction: undefined;

  // Crisis flow - Emergency access from any screen
  CrisisButton: {
    trigger: 'manual' | 'assessment' | 'pattern';
    severity?: CrisisSeverity;
    assessmentId?: AssessmentID;
    score?: PHQ9Score | GAD7Score;
  };
  CrisisIntervention: {
    crisisId: string;
    severity: CrisisSeverity;
    trigger: string;
    fromScreen?: string;
    emergencyMode?: boolean;
    timestamp?: string;
  };
  EmergencyContacts: {
    crisisId?: string;
    urgent?: boolean;
  };
  SafetyPlan: {
    crisisId?: string;
    mode: 'view' | 'edit' | 'crisis';
  };

  // Assessment flow
  AssessmentSelection: undefined;
  Assessment: {
    type: 'phq9' | 'gad7';
    context: 'onboarding' | 'standalone' | 'clinical';
    sessionId?: SessionID;
  };
  AssessmentFlow: {
    type: 'phq9' | 'gad7';
    context: 'onboarding' | 'standalone' | 'clinical';
    resumeSession?: boolean;
    fromWidget?: boolean;
    timestamp?: string;
  };
  AssessmentResults: {
    assessmentId: AssessmentID;
    showCrisisIntervention?: boolean;
  };

  // Check-in flow
  CheckInFlow: {
    type: CheckInType;
    resumeSession?: boolean;
    fromWidget?: boolean;
    timestamp?: string;
    initialScreen?: string;
  };

  // Standalone screens
  Settings: undefined;
  Profile: undefined;
  Privacy: undefined;
  Support: undefined;
  About: undefined;

  // Modal screens
  CrisisModal: {
    visible: boolean;
    severity: CrisisSeverity;
    crisisId: string;
  };
  AssessmentModal: {
    assessmentId: AssessmentID;
    readonly: boolean;
  };
};

/**
 * Main tab navigation parameter list
 */
export type MainTabParamList = {
  Home: undefined;
  CheckIn: {
    type?: 'morning' | 'midday' | 'evening';
    autoStart?: boolean;
  };
  Practice: {
    sessionType?: 'breathing' | 'body_scan' | 'mindful_movement';
    duration?: DurationMs;
  };
  Progress: {
    timeframe?: 'week' | 'month' | 'quarter';
    showDetails?: boolean;
  };
  Resources: {
    category?: 'crisis' | 'therapeutic' | 'educational';
    searchQuery?: string;
  };
};

/**
 * Check-in flow parameter list
 */
export type CheckInStackParamList = {
  CheckInHome: undefined;
  CheckInFlow: {
    type: 'morning' | 'midday' | 'evening';
    step?: number;
    sessionId?: SessionID;
  };
  CheckInComplete: {
    checkInId: string;
    type: 'morning' | 'midday' | 'evening';
    showSummary?: boolean;
  };
};

/**
 * Practice flow parameter list
 */
export type PracticeStackParamList = {
  PracticeHome: undefined;
  BreathingExercise: {
    duration: DurationMs;
    variant?: 'basic' | 'guided' | 'advanced';
    sessionId?: SessionID;
  };
  BodyScan: {
    duration: DurationMs;
    guided?: boolean;
    sessionId?: SessionID;
  };
  MindfulMovement: {
    type: 'gentle' | 'walking' | 'stretching';
    duration: DurationMs;
    sessionId?: SessionID;
  };
  PracticeComplete: {
    practiceId: string;
    type: string;
    duration: DurationMs;
    quality?: number;
  };
};

/**
 * Settings flow parameter list
 */
export type SettingsStackParamList = {
  SettingsHome: undefined;
  Preferences: undefined;
  Notifications: undefined;
  Privacy: undefined;
  Security: undefined;
  DataExport: undefined;
  AccountManagement: undefined;
  CrisisPlanSetup: {
    mode: 'create' | 'edit';
    planId?: string;
  };
  EmergencyContactsSetup: undefined;
};

// === NAVIGATION PROP TYPES ===

/**
 * Root stack navigation prop
 */
export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * Main tab navigation prop
 */
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;

/**
 * Check-in stack navigation prop
 */
export type CheckInStackNavigationProp = NativeStackNavigationProp<CheckInStackParamList>;

/**
 * Practice stack navigation prop
 */
export type PracticeStackNavigationProp = NativeStackNavigationProp<PracticeStackParamList>;

/**
 * Settings stack navigation prop
 */
export type SettingsStackNavigationProp = NativeStackNavigationProp<SettingsStackParamList>;

/**
 * Composite navigation prop for screens that need access to multiple navigators
 */
export type CompositeNavigationProps = CompositeNavigationProp<
  MainTabNavigationProp,
  RootStackNavigationProp
>;

// === SCREEN PROP TYPES ===

/**
 * Root stack screen props
 */
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

/**
 * Main tab screen props
 */
export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;

/**
 * Check-in stack screen props
 */
export type CheckInStackScreenProps<T extends keyof CheckInStackParamList> =
  NativeStackScreenProps<CheckInStackParamList, T>;

/**
 * Practice stack screen props
 */
export type PracticeStackScreenProps<T extends keyof PracticeStackParamList> =
  NativeStackScreenProps<PracticeStackParamList, T>;

/**
 * Settings stack screen props
 */
export type SettingsStackScreenProps<T extends keyof SettingsStackParamList> =
  NativeStackScreenProps<SettingsStackParamList, T>;

// === ROUTE PROP TYPES ===

/**
 * Root stack route prop
 */
export type RootStackRouteProp<T extends keyof RootStackParamList> =
  RouteProp<RootStackParamList, T>;

/**
 * Main tab route prop
 */
export type MainTabRouteProp<T extends keyof MainTabParamList> =
  RouteProp<MainTabParamList, T>;

/**
 * Check-in stack route prop
 */
export type CheckInStackRouteProp<T extends keyof CheckInStackParamList> =
  RouteProp<CheckInStackParamList, T>;

/**
 * Practice stack route prop
 */
export type PracticeStackRouteProp<T extends keyof PracticeStackParamList> =
  RouteProp<PracticeStackParamList, T>;

/**
 * Settings stack route prop
 */
export type SettingsStackRouteProp<T extends keyof SettingsStackParamList> =
  RouteProp<SettingsStackParamList, T>;

// Crisis trigger information
export interface CrisisTriggerInfo {
  readonly type: 'automatic' | 'manual' | 'assessment';
  readonly reason: string;
  readonly assessmentScore?: number;
  readonly assessmentType?: 'phq9' | 'gad7';
  readonly metadata?: {
    readonly widgetAccess?: boolean;
    readonly emergencyContact?: boolean;
    readonly immediateIntervention?: boolean;
  };
}

// Navigation parameters for widget deep links
export interface WidgetNavigationParams {
  fromWidget: true;
  timestamp: string;
  widgetType?: 'ios' | 'android';
  widgetId?: string;
}

// Enhanced navigation params with widget support
export interface CheckInNavigationParams extends WidgetNavigationParams {
  type: CheckInType;
  resumeSession: boolean;
  sessionId?: string;
  progressPercentage?: number;
}

export interface CrisisNavigationParams extends WidgetNavigationParams {
  trigger: CrisisTriggerInfo;
  emergencyMode: true;
  priority: 'high' | 'critical';
}

export interface AssessmentNavigationParams extends WidgetNavigationParams {
  type: 'phq9' | 'gad7';
  context: 'standalone';
  resumeSession: false;
}

// Navigation context for tracking user flows
export interface NavigationContext {
  source: NavigationSource;
  timestamp: string;
  sessionId?: string;
  userAction?: string;
  metadata?: Record<string, any>;
}

export type NavigationSource =
  | 'app_launch'
  | 'widget_tap'
  | 'notification'
  | 'deep_link'
  | 'manual_navigation'
  | 'crisis_trigger'
  | 'assessment_completion';

// Type guards for navigation parameters
export function isWidgetNavigation(params: any): params is WidgetNavigationParams {
  return params && params.fromWidget === true && typeof params.timestamp === 'string';
}

export function isCheckInNavigation(params: any): params is CheckInNavigationParams {
  return (
    isWidgetNavigation(params) &&
    ['morning', 'midday', 'evening'].includes(params.type) &&
    typeof params.resumeSession === 'boolean'
  );
}

export function isCrisisNavigation(params: any): params is CrisisNavigationParams {
  return (
    isWidgetNavigation(params) &&
    params.trigger &&
    params.emergencyMode === true
  );
}

export function isAssessmentNavigation(params: any): params is AssessmentNavigationParams {
  return (
    isWidgetNavigation(params) &&
    ['phq9', 'gad7'].includes(params.type) &&
    params.context === 'standalone'
  );
}

// Authentication-specific navigation types
export interface AuthNavigationParams {
  returnTo?: string;
  emergencyMode?: boolean;
  migrationContext?: string;
  performanceRequirements?: AuthPerformanceRequirements;
}

export interface AuthPerformanceRequirements {
  readonly crisisResponseTime: number; // <200ms for crisis scenarios
  readonly standardResponseTime: number; // <2000ms for standard auth
  readonly biometricResponseTime: number; // <1000ms for biometric auth
  readonly networkTimeout: number; // Network operation timeout
  readonly measurePerformance: boolean; // Whether to track performance metrics
}

// Authentication state integration for navigation
export interface NavigationAuthState {
  readonly isAuthenticated: boolean;
  readonly sessionType: 'anonymous' | 'authenticated' | 'emergency';
  readonly authMethod?: string;
  readonly canAccessCrisisFeatures: boolean;
  readonly canAccessCloudFeatures: boolean;
  readonly requiresBiometricSetup: boolean;
  readonly migrationAvailable: boolean;
  readonly lastAuthTime?: number;
  readonly performanceMetrics?: AuthNavigationPerformanceMetrics;
}

export interface AuthNavigationPerformanceMetrics {
  readonly lastSignInTime: number;
  readonly averageSignInTime: number;
  readonly crisisResponseTimes: readonly number[];
  readonly biometricResponseTimes: readonly number[];
  readonly networkLatencies: readonly number[];
  readonly authErrors: readonly AuthNavigationError[];
}

export interface AuthNavigationError {
  readonly timestamp: string;
  readonly errorCode: string;
  readonly screen: string;
  readonly method: string;
  readonly duration: number;
  readonly resolved: boolean;
}

// Type guards for authentication navigation
export function isAuthNavigation(params: any): params is AuthNavigationParams {
  return params && (
    typeof params.returnTo === 'string' ||
    typeof params.emergencyMode === 'boolean' ||
    typeof params.migrationContext === 'string'
  );
}

export function requiresCrisisPerformance(params: any): boolean {
  return params?.emergencyMode === true ||
         params?.performanceRequirements?.crisisResponseTime < 200;
}

// === TYPE GUARDS ===

/**
 * Check if a route is a crisis route
 */
export const isCrisisRoute = (routeName: keyof RootStackParamList): boolean => {
  const crisisRoutes: readonly (keyof RootStackParamList)[] = [
    'CrisisButton',
    'CrisisIntervention',
    'EmergencyContacts',
    'SafetyPlan',
    'CrisisModal',
  ];
  return crisisRoutes.includes(routeName);
};

/**
 * Check if a route requires authentication
 */
export const requiresAuthentication = (routeName: keyof RootStackParamList): boolean => {
  const publicRoutes: readonly (keyof RootStackParamList)[] = [
    'Welcome',
    'Login',
    'Register',
    'ForgotPassword',
  ];
  return !publicRoutes.includes(routeName);
};

/**
 * Check if a route is accessible during crisis
 */
export const isAccessibleDuringCrisis = (routeName: keyof RootStackParamList): boolean => {
  const allowedRoutes: readonly (keyof RootStackParamList)[] = [
    'CrisisButton',
    'CrisisIntervention',
    'EmergencyContacts',
    'SafetyPlan',
    'CrisisModal',
    'Settings', // For emergency contact editing
    'Support', // For additional resources
  ];
  return allowedRoutes.includes(routeName);
};

// === CONSTANTS ===

/**
 * Navigation constants
 */
export const NAVIGATION_CONSTANTS = {
  ANIMATION: {
    DURATION_SHORT: 200 as DurationMs,
    DURATION_MEDIUM: 300 as DurationMs,
    DURATION_LONG: 500 as DurationMs,
    CRISIS_TRANSITION_DURATION: 100 as DurationMs, // Fast for emergency
  },

  PERFORMANCE: {
    MAX_TRANSITION_TIME: 500 as DurationMs,
    CRISIS_MAX_RESPONSE_TIME: 200 as DurationMs,
    MEMORY_WARNING_THRESHOLD: 50 * 1024 * 1024, // 50MB
  },

  CRISIS: {
    EMERGENCY_ROUTES: [
      'CrisisButton',
      'CrisisIntervention',
      'EmergencyContacts',
      'SafetyPlan',
    ] as const,

    ALLOWED_DURING_CRISIS: [
      'CrisisButton',
      'CrisisIntervention',
      'EmergencyContacts',
      'SafetyPlan',
      'CrisisModal',
      'Settings',
      'Support',
    ] as const,
  },

  STACK_LIMITS: {
    MAX_STACK_DEPTH: 10,
    CRISIS_STACK_LIMIT: 3, // Keep navigation simple during crisis
  },
} as const;

// === DECLARATION MERGING ===

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}