/**
 * Session Resumption Types
 * FEAT-23: Session resumption for interrupted Stoic practice flows
 *
 * Enables users to resume interrupted daily practices (morning/midday/evening)
 * with philosopher-validated Stoic language emphasizing character over completion.
 *
 * NON-NEGOTIABLES:
 * - Sphere Sovereignty: Distinguish what user controls (showing up, quality) vs. doesn't (completion, interruptions)
 * - No completion pressure: Both resume and fresh start are equally virtuous choices
 * - Character over outcome: Focus on intention/presence, not completion status
 * - 24-hour TTL: Sessions auto-expire to prevent guilt accumulation
 */

/**
 * Flow type for daily Stoic practices
 */
export type FlowType = 'morning' | 'midday' | 'evening';

/**
 * Screen names by flow (for friendly display in resume modal)
 */
export type FlowScreenName =
  // Morning screens
  | 'Gratitude'
  | 'Intention'
  | 'Preparation'
  | 'PrincipleFocus'
  | 'PhysicalGrounding'
  | 'MorningCompletion'
  // Midday screens
  | 'ControlCheck'
  | 'Embodiment'
  | 'Reappraisal'
  | 'Affirmation'
  | 'MiddayCompletion'
  // Evening screens
  | 'VirtueReflection'
  | 'SenecaQuestions'
  | 'VirtueInstances'
  | 'VirtueChallenges'
  | 'Celebration'
  | 'Gratitude'
  | 'Tomorrow'
  | 'Lessons'
  | 'SelfCompassion'
  | 'SleepTransition'
  | 'EveningCompletion';

/**
 * Session metadata for resume modal display
 * Used to show user information about their interrupted session
 */
export interface SessionMetadata {
  flowType: FlowType;
  startedAt: number;         // Unix timestamp (ms) when session started
  lastSavedAt: number;       // Unix timestamp (ms) when session was last saved
  currentScreen: string;     // Screen name where user left off
  completed: boolean;        // Whether session was completed
  expiresAt: number;         // Unix timestamp (ms) when session expires (24hr from start)
}

/**
 * Complete session data for state restoration
 * Includes metadata + flow-specific state for resumption
 */
export interface SessionData extends SessionMetadata {
  // Flow-specific state (stored as JSON, encrypted)
  flowState?: Record<string, any> | undefined;  // Navigator-specific state (answers, progress, etc.)
}

/**
 * Session storage keys
 */
export const SESSION_STORAGE_KEYS = {
  MORNING: 'stoic_session_morning',
  MIDDAY: 'stoic_session_midday',
  EVENING: 'stoic_session_evening',
} as const;

/**
 * Session expiration time (24 hours in milliseconds)
 * After this time, sessions are automatically expired to prevent
 * accumulation of "incomplete" sessions that could create guilt
 */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
