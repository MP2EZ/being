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