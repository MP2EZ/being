/**
 * Navigation Types for Widget Integration
 * Enhanced navigation types with widget-specific parameters and type safety
 */

import { CheckInType } from './widget';

// Root Stack Parameter List
export type RootStackParamList = {
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
  ForgotPassword: {
    email?: string;
  };
  OnboardingIntroduction: undefined;

  // Check-in flow
  CheckInFlow: {
    type: CheckInType;
    resumeSession?: boolean;
    fromWidget?: boolean;
    timestamp?: string;
    initialScreen?: string;
  };

  // Assessment flow
  AssessmentFlow: {
    type: 'phq9' | 'gad7';
    context: 'onboarding' | 'standalone' | 'clinical';
    resumeSession?: boolean;
    fromWidget?: boolean;
    timestamp?: string;
  };

  // Crisis intervention
  CrisisIntervention: {
    trigger: CrisisTriggerInfo;
    fromScreen?: string;
    emergencyMode?: boolean;
    timestamp?: string;
  };

  // Settings and other screens
  Settings: undefined;
  Profile: undefined;
  Privacy: undefined;
  About: undefined;
};

// Crisis trigger information
export interface CrisisTriggerInfo {
  type: 'automatic' | 'manual' | 'assessment';
  reason: string;
  assessmentScore?: number;
  assessmentType?: 'phq9' | 'gad7';
  metadata?: {
    widgetAccess?: boolean;
    emergencyContact?: boolean;
    immediateIntervention?: boolean;
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