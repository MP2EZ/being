/**
 * Navigation Type Definitions
 * Centralized type definitions for React Navigation
 */

import { NavigatorScreenParams } from '@react-navigation/native';

// Root Stack Navigator types
export type RootStackParamList = {
  Onboarding: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  CheckInFlow: {
    type: 'morning' | 'midday' | 'evening';
  };
  AssessmentFlow: {
    type: 'phq9' | 'gad7';
  };
  CrisisPlan: undefined;
};

// Main Tab Navigator types
export type MainTabParamList = {
  Home: undefined;
  Exercises: undefined;
  Insights: undefined;
  Profile: undefined;
};

// Flow-specific navigation types
export type CheckInFlowParamList = {
  CheckInFlow: {
    type: 'morning' | 'midday' | 'evening';
  };
};

// Navigation prop types for screens
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}