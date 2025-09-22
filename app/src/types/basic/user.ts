/**
 * Core User Types - Essential User Data
 *
 * Minimal user types for basic app functionality.
 * Focus on essential user state without clinical data.
 */

import type { MoodState } from './index';

// === BASIC USER TYPES ===

/**
 * Basic user preferences for app behavior
 */
export interface UserPreferences {
  readonly theme: 'light' | 'dark' | 'system';
  readonly notifications: boolean;
  readonly sounds: boolean;
  readonly vibration: boolean;
}

/**
 * Basic user session information
 */
export interface UserSession {
  readonly sessionId: string;
  readonly startTime: number;
  readonly lastActivity: number;
  readonly isActive: boolean;
}

/**
 * Basic user interaction tracking
 */
export interface UserInteraction {
  readonly action: string;
  readonly screen: string;
  readonly timestamp: number;
  readonly duration?: number;
}

/**
 * Basic mood tracking entry
 */
export interface MoodEntry {
  readonly mood: MoodState;
  readonly timestamp: number;
  readonly notes?: string;
}

/**
 * Basic user state for app functionality
 */
export interface BasicUserState {
  readonly preferences: UserPreferences;
  readonly session: UserSession | null;
  readonly lastMoodEntry: MoodEntry | null;
  readonly isFirstTime: boolean;
}

// === TYPE GUARDS ===

/**
 * Check if preferences are valid
 */
export function isValidUserPreferences(prefs: unknown): prefs is UserPreferences {
  if (typeof prefs !== 'object' || !prefs) return false;

  const p = prefs as any;
  return ['light', 'dark', 'system'].includes(p.theme) &&
         typeof p.notifications === 'boolean' &&
         typeof p.sounds === 'boolean' &&
         typeof p.vibration === 'boolean';
}

/**
 * Check if mood entry is valid
 */
export function isValidMoodEntry(entry: unknown): entry is MoodEntry {
  if (typeof entry !== 'object' || !entry) return false;

  const e = entry as any;
  return ['calm', 'happy', 'neutral', 'sad', 'anxious'].includes(e.mood) &&
         typeof e.timestamp === 'number' &&
         e.timestamp > 0;
}

// === DEFAULTS ===

/**
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  notifications: true,
  sounds: true,
  vibration: true,
} as const;