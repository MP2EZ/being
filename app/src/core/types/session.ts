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
 * Flow type for daily Stoic practices (the three time-of-day flows).
 *
 * FEAT-298 slice 1: re-exported from the canonical declaration rather than re-declared.
 */
export type { FlowType } from './practice-identity';
import type { PracticeIdentity } from './practice-identity';

/**
 * TWO TOKENS, ONE RITUAL — settled here so it is not re-derived (FEAT-298 slice 3b).
 *
 * The daily loop is named by two different strings on purpose, and the split is:
 *
 *   `'daily-loop'`  (`PracticeIdentity`)  → PRESENTATION + SESSION identity.
 *                                           Which practice surface is this? Drives
 *                                           theming (via `themeKeyFor`) and which session
 *                                           blob a resume reads. Never persisted as a record.
 *   `'daily'`       (`CheckInType`)       → PERSISTED RECORD vocabulary.
 *                                           What did the user actually complete? Written to
 *                                           `checkInCompletions` / `principleEngagements`
 *                                           and to the JSON export.
 *
 * Sessions are keyed by PRACTICE IDENTITY, not by record type: a session belongs to a
 * surface the user is standing in, which is exactly what `PracticeIdentity` names. That is
 * why `SessionMetadata.flowType` widened to `PracticeIdentity` rather than `FlowType`
 * gaining a member — widening `FlowType` would have leaked a session/presentation concern
 * into the union that types persisted check-in records.
 */

/**
 * Session TTL for the three legacy flows: a rolling 24 hours.
 */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * When a session expires (FEAT-298 slice 3b).
 *
 * The legacy flows keep the rolling 24h. The DAILY LOOP is day-bound: it expires at
 * `min(startedAt + 24h, next local midnight)`.
 *
 * Why the loop differs — this is a data-accuracy fix, not a preference. `CheckInCompletion`
 * is keyed to the LOCAL CALENDAR DAY (`date: 'YYYY-MM-DD'`), and `calculateDotState` reads
 * those days. Under a rolling TTL a session begun 22:00 and resumed 08:00 the next morning
 * is still "live", so completing it writes one `'daily'` record dated TODAY for work done
 * mostly YESTERDAY — and leaves yesterday's dot incomplete. That is precisely the
 * records-accuracy fabrication slice 2's era-aware calendar was built to prevent.
 *
 * A day-keyed ritual cannot outlive its day.
 */
export const computeSessionExpiry = (
  flowType: PracticeIdentity,
  startedAt: number
): number => {
  const rolling = startedAt + SESSION_TTL_MS;

  if (flowType !== 'daily-loop') return rolling;

  // Next local midnight after startedAt. setHours(24, ...) rolls to the following day and
  // is DST-correct because it operates in local time, unlike adding 86_400_000 ms.
  const nextMidnight = new Date(startedAt);
  nextMidnight.setHours(24, 0, 0, 0);

  return Math.min(rolling, nextMidnight.getTime());
};

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
  /** Which practice surface this session belongs to — see the token-split note above. */
  flowType: PracticeIdentity;
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
  // FEAT-298 slice 3b: the loop gets its OWN key. FEAT-291 skipped resumption precisely to
  // avoid colliding with Midday's session blob; a distinct key is what removes that
  // collision, so the local-accumulator workaround is no longer needed.
  DAILY_LOOP: 'stoic_session_daily_loop',
} as const;

// Session expiration lives at the top of this file (SESSION_TTL_MS +
// computeSessionExpiry). Sessions expire automatically to prevent accumulation of
// "incomplete" sessions that could create guilt.
