/**
 * Core Navigation Types - Essential Navigation
 *
 * Minimal navigation types for basic app functionality.
 * Focused on the simple string-based navigation used in App.tsx.
 */

import type { AppScreen } from './index';

// === BASIC NAVIGATION TYPES ===

/**
 * Simple navigation action for basic screen changes
 */
export interface NavigationAction {
  readonly type: 'NAVIGATE';
  readonly screen: AppScreen;
  readonly params?: Record<string, unknown>;
}

/**
 * Basic navigation context
 */
export interface NavigationContext {
  readonly currentScreen: AppScreen;
  readonly previousScreen?: AppScreen;
  readonly timestamp: number;
  readonly source: 'user' | 'system' | 'crisis';
}

/**
 * Simple screen transition information
 */
export interface ScreenTransition {
  readonly from: AppScreen;
  readonly to: AppScreen;
  readonly duration?: number;
  readonly animated?: boolean;
}

/**
 * Basic navigation state management
 */
export interface NavigationState {
  readonly current: AppScreen;
  readonly history: readonly AppScreen[];
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
}

// === TYPE GUARDS ===

/**
 * Check if a navigation action is valid
 */
export function isValidNavigationAction(action: unknown): action is NavigationAction {
  if (typeof action !== 'object' || !action) return false;

  const a = action as any;
  return a.type === 'NAVIGATE' &&
         typeof a.screen === 'string' &&
         ['home', 'checkin', 'breathing', 'assessment', 'crisis'].includes(a.screen);
}

// === NAVIGATION HELPERS ===

/**
 * Create a basic navigation action
 */
export function createNavigationAction(
  screen: AppScreen,
  params?: Record<string, unknown>
): NavigationAction {
  return {
    type: 'NAVIGATE',
    screen,
    params,
  };
}

/**
 * Create navigation context
 */
export function createNavigationContext(
  currentScreen: AppScreen,
  previousScreen?: AppScreen,
  source: 'user' | 'system' | 'crisis' = 'user'
): NavigationContext {
  return {
    currentScreen,
    previousScreen,
    timestamp: Date.now(),
    source,
  };
}