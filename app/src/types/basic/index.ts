/**
 * Core Types - Essential App Foundation
 *
 * Minimal essential types for basic app functionality.
 * Designed to avoid circular dependencies and property descriptor conflicts.
 *
 * CRITICAL: Keep this module under 100 lines for maintainability
 */

// === BASIC APP TYPES ===

/**
 * Basic screen identifiers for simple navigation
 */
export type AppScreen =
  | 'home'
  | 'checkin'
  | 'breathing'
  | 'assessment'
  | 'crisis';

/**
 * Basic mood states for check-in functionality
 */
export type MoodState =
  | 'calm'
  | 'happy'
  | 'neutral'
  | 'sad'
  | 'anxious';

/**
 * Basic component props interface
 */
export interface BaseProps {
  readonly children?: React.ReactNode;
  readonly style?: any;
  readonly testID?: string;
}

/**
 * Basic navigation state for simple screen management
 */
export interface BasicNavigationState {
  readonly currentScreen: AppScreen;
  readonly previousScreen?: AppScreen;
  readonly canGoBack: boolean;
}

/**
 * Basic user interaction events
 */
export type UserAction =
  | 'screen_change'
  | 'mood_selection'
  | 'crisis_button_press'
  | 'breathing_start'
  | 'assessment_start';

/**
 * Basic app configuration
 */
export interface AppConfig {
  readonly version: string;
  readonly environment: 'development' | 'production';
  readonly features: {
    readonly crisis: boolean;
    readonly assessment: boolean;
    readonly breathing: boolean;
  };
}

/**
 * Basic error structure
 */
export interface AppError {
  readonly code: string;
  readonly message: string;
  readonly timestamp: number;
}

// === TYPE GUARDS ===

/**
 * Check if value is a valid app screen
 */
export function isAppScreen(value: unknown): value is AppScreen {
  return typeof value === 'string' &&
    ['home', 'checkin', 'breathing', 'assessment', 'crisis'].includes(value);
}

/**
 * Check if value is a valid mood state
 */
export function isMoodState(value: unknown): value is MoodState {
  return typeof value === 'string' &&
    ['calm', 'happy', 'neutral', 'sad', 'anxious'].includes(value);
}

// === CONSTANTS ===

/**
 * Core app constants
 */
export const CORE_CONSTANTS = {
  SCREENS: {
    HOME: 'home' as const,
    CHECKIN: 'checkin' as const,
    BREATHING: 'breathing' as const,
    ASSESSMENT: 'assessment' as const,
    CRISIS: 'crisis' as const,
  },

  MOODS: {
    CALM: 'calm' as const,
    HAPPY: 'happy' as const,
    NEUTRAL: 'neutral' as const,
    SAD: 'sad' as const,
    ANXIOUS: 'anxious' as const,
  },

  TIMING: {
    BREATHING_DURATION: 180000, // 3 minutes in milliseconds
    CRISIS_RESPONSE_MAX: 3000,  // 3 seconds max for crisis button
  },
} as const;

// === RE-EXPORTS ===

// Re-export types from other core modules
export type * from './navigation';
export type * from './user';