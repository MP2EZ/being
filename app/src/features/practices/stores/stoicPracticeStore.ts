/**
 * STOIC PRACTICE STORE (Zustand + Encryption)
 *
 * Core state management for Stoic Mindfulness practice tracking.
 * Uses Zustand for reactive state + SecureStore for AES-256 encryption.
 *
 * Philosopher-validated (9.7/10 rating) - Tracks:
 * - Domain progress (work, relationships, adversity)
 * - Virtue instances (successes) and challenges (struggles)
 * - Practice streaks and total days
 *
 * FEAT-45: Updated to 5-principle framework (2025-10-29)
 * Principle repertoire thresholds adjusted: 12 principles → 5 principles
 *
 * NON-NEGOTIABLES:
 * - All virtue/challenge data encrypted at rest (SecureStore)
 * - Self-compassion required in VirtueChallenge
 * - Balanced examination (instances + challenges)
 * - Privacy-first: No analytics on virtue content
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md (v1.1 LOCKED)
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import { generateInternalId } from '@/core/utils/id';
import { getIsoWeekStart } from '@/core/utils/isoWeek';
import { logError, LogCategory } from '@/core/services/logging';
import type {
  CardinalVirtue,
  PracticeDomain,
  StoicPrinciple,
  VirtueInstance,
  VirtueChallenge,
  DomainProgress,
} from '@/features/practices/types/stoic';

// ──────────────────────────────────────────────────────────────────────────────
// STORE STATE INTERFACE
// ──────────────────────────────────────────────────────────────────────────────

// Check-in completion tracking for daily check-ins
// Used by Home screen to display faded appearance for completed check-ins
// FEAT-133: Added 'learn' for Learn module practice engagements
// FEAT-298 slice 2: Added 'daily' for the single daily ritual. ADDITIVE — the three
// time-of-day members are deliberately NOT dropped. Preserving them is what preserves
// history by construction: every record already on disk stays valid under this union, so
// the migration never has to rewrite a stored value (see migratePersistedBlob below).
// The eventual target shape is 'daily' | 'learn', reached only after slice 6 retires the
// three flows; 'learn' (FEAT-133) is orthogonal to the ritual and survives regardless.
export type CheckInType = 'morning' | 'midday' | 'evening' | 'learn' | 'daily';

export interface CheckInCompletion {
  type: CheckInType;
  completedAt: Date;
  date: string; // YYYY-MM-DD format for easy daily comparison
}

/**
 * Principle Engagement Tracking (FEAT-28: Insights Dashboard)
 *
 * Records when a user engages with a Stoic principle during check-in flows.
 * Used by InsightsScreen to show principle engagement patterns over time.
 *
 * Engagement types — these track TENSE (when the engagement stands relative to the day),
 * not the mechanism by which a principle was chosen (FEAT-298 slice 3 clarification):
 * - 'selected': PROSPECTIVE focus — morning flow, or a morning-tensed daily loop. The
 *   loop brings all five principles to focus rather than picking one from a menu; the
 *   recorded fact is that the engagement was forward-looking.
 * - 'applied': PRESENT engagement with live material — midday flow, or a flat daily loop.
 * - 'reflected': RETROSPECTIVE review — evening flow, or an evening-tensed daily loop.
 * - 'practiced': User completed a practice exercise in Learn module (FEAT-133). Reserved
 *   for in-app education — never reused by a practice flow, so the exported vocabulary can
 *   always tell education from lived practice.
 */
export type PrincipleEngagementType = 'selected' | 'applied' | 'reflected' | 'practiced';

export interface PrincipleEngagement {
  principle: StoicPrinciple;
  flowType: CheckInType;
  engagementType: PrincipleEngagementType;
  date: string;  // YYYY-MM-DD format for aggregation
  timestamp: Date;
}

/**
 * Weekly Reflection (FEAT-194)
 *
 * One free-text reflection per ISO week, captured from the Weekly
 * Reflection card on the Insights tab. Replaces FEAT-53's standalone
 * weekly-review feature. Anchored on Seneca, Letters 84: "for deepening,
 * not catching up. Daily practice remains the work."
 *
 * Anti-scope (do not extend this shape):
 *   - No frequency counts, no principle suggestions, no algorithmic prompts.
 *   - The card must never show principle-engagement data as input to a choice.
 */
export interface WeeklyReflection {
  id: string;
  weekStartIso: string; // 'YYYY-MM-DD' Monday of the ISO week (local-tz)
  text: string;
  savedAt: string; // ISO datetime string
}

export interface StoicPracticeState {
  // Developmental tracking
  practiceStartDate: Date | null;
  totalPracticeDays: number;
  currentStreak: number;
  longestStreak: number;

  // Virtue tracking (encrypted at rest)
  virtueInstances: VirtueInstance[];
  virtueChallenges: VirtueChallenge[];

  // Domain progress (work, relationships, adversity)
  domainProgress: {
    work: DomainProgress;
    relationships: DomainProgress;
    adversity: DomainProgress;
  };

  // Daily check-in completion tracking (last 90 days for Insights Dashboard)
  checkInCompletions: CheckInCompletion[];

  // Principle engagement tracking (FEAT-28: Insights Dashboard)
  // Records which principles users engage with during check-in flows
  principleEngagements: PrincipleEngagement[];

  // Weekly reflections (FEAT-194: Weekly Reflection card on Insights)
  // One free-text entry per ISO week; upserted on re-save in the same week.
  weeklyReflections: WeeklyReflection[];

  // Loading state
  isLoading: boolean;

  // Actions
  addVirtueInstance: (instance: Omit<VirtueInstance, 'id' | 'timestamp'>) => Promise<void>;
  addVirtueChallenge: (challenge: Omit<VirtueChallenge, 'id' | 'timestamp'>) => Promise<void>;
  updateStreak: (newStreak: number) => void;
  incrementPracticeDays: () => Promise<void>;
  setPracticeStartDate: (date: Date) => void;
  getVirtueInstancesByDomain: (domain: PracticeDomain) => VirtueInstance[];
  getVirtueInstancesByVirtue: (virtue: CardinalVirtue) => VirtueInstance[];
  getRecentVirtueInstances: (days: number) => VirtueInstance[];
  // Check-in completion tracking (for home screen faded appearance)
  markCheckInComplete: (type: CheckInType) => Promise<void>;
  isCheckInCompletedToday: (type: CheckInType) => boolean;
  // Principle engagement tracking (FEAT-28: Insights Dashboard)
  recordPrincipleEngagement: (
    principle: StoicPrinciple,
    flowType: CheckInType,
    engagementType: PrincipleEngagementType
  ) => Promise<void>;
  getPrincipleEngagements: (days: number) => PrincipleEngagement[];
  getCheckInHistory: (days: number) => CheckInCompletion[];
  // Weekly reflection (FEAT-194) - upsert by current ISO week
  addWeeklyReflection: (text: string) => Promise<void>;
  getWeeklyReflectionForWeek: (weekStartIso: string) => WeeklyReflection | undefined;
  loadPersistedState: () => Promise<void>;
  persistState: () => Promise<void>;
  resetStore: () => Promise<void>;
}

// ──────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────────────────────────────────────

const SECURE_STORE_KEY = 'stoic_practice_state';

// ──────────────────────────────────────────────────────────────────────────────
// INITIAL STATE
// ──────────────────────────────────────────────────────────────────────────────

const initialDomainProgress: DomainProgress = {
  domain: 'work',
  practiceInstances: 0,
  principlesApplied: [],
  lastPracticeDate: null,
};

const getInitialState = (): Omit<StoicPracticeState, 'isLoading' | 'addVirtueInstance' | 'addVirtueChallenge' | 'updateStreak' | 'incrementPracticeDays' | 'setPracticeStartDate' | 'getVirtueInstancesByDomain' | 'getVirtueInstancesByVirtue' | 'getRecentVirtueInstances' | 'markCheckInComplete' | 'isCheckInCompletedToday' | 'recordPrincipleEngagement' | 'getPrincipleEngagements' | 'getCheckInHistory' | 'addWeeklyReflection' | 'getWeeklyReflectionForWeek' | 'loadPersistedState' | 'persistState' | 'resetStore'> => ({
  practiceStartDate: null,
  totalPracticeDays: 0,
  currentStreak: 0,
  longestStreak: 0,
  virtueInstances: [],
  virtueChallenges: [],
  checkInCompletions: [],
  principleEngagements: [],
  weeklyReflections: [],
  domainProgress: {
    work: { ...initialDomainProgress, domain: 'work' },
    relationships: { ...initialDomainProgress, domain: 'relationships' },
    adversity: { ...initialDomainProgress, domain: 'adversity' },
  },
});

// ──────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Generate unique ID for virtue instances/challenges
 */
const generateId = (): string => {
  return generateInternalId();
};

/**
 * Update domain progress when virtue instance is added
 */
const updateDomainProgressForInstance = (
  domainProgress: StoicPracticeState['domainProgress'],
  domain: PracticeDomain,
  principleApplied: string | null
): StoicPracticeState['domainProgress'] => {
  const currentProgress = domainProgress[domain];

  // Add principle if not already applied in this domain
  const principlesApplied = principleApplied && !currentProgress.principlesApplied.includes(principleApplied)
    ? [...currentProgress.principlesApplied, principleApplied]
    : currentProgress.principlesApplied;

  return {
    ...domainProgress,
    [domain]: {
      ...currentProgress,
      practiceInstances: currentProgress.practiceInstances + 1,
      principlesApplied,
      lastPracticeDate: new Date(),
    },
  };
};

/**
 * Format a Date as YYYY-MM-DD in the LOCAL timezone.
 * Single source of truth for date-stamping AND retention cutoffs so the
 * two never disagree (MAINT-242: a prior UTC-based cutoff drifted one day
 * ahead of these local stamps in non-UTC zones near midnight, pruning
 * records that were exactly 90 local days old).
 */
const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 * Used for check-in completion tracking
 */
const getTodayString = (): string => toLocalDateString(new Date());

/**
 * Compute the 90-day retention cutoff as a LOCAL-tz YYYY-MM-DD string.
 * MUST use the same local basis as getTodayString() (see toLocalDateString).
 */
const getRetentionCutoffString = (): string => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  return toLocalDateString(cutoffDate);
};

/**
 * Clean up old check-in completions (keep last 90 days)
 * Extended retention for Insights Dashboard (FEAT-28) - supports Week/Month/Quarter views
 * Storage impact: ~3KB/user (negligible)
 */
const cleanOldCheckInCompletions = (completions: CheckInCompletion[]): CheckInCompletion[] => {
  const cutoffString = getRetentionCutoffString();

  return completions.filter(completion => cutoffString && completion.date >= cutoffString);
};

/**
 * Clean up old principle engagements (keep last 90 days)
 * FEAT-28: Insights Dashboard requires 90-day retention for Quarter view
 * Storage impact: ~5KB/user (negligible, encrypted)
 */
const cleanOldPrincipleEngagements = (engagements: PrincipleEngagement[]): PrincipleEngagement[] => {
  const cutoffString = getRetentionCutoffString();

  return engagements.filter(engagement => cutoffString && engagement.date >= cutoffString);
};

// ──────────────────────────────────────────────────────────────────────────────
// DEBOUNCED PERSISTENCE (audit PERF-01 paydown)
//
// Pre-paydown: every check-in completion / virtue instance / engagement
// triggered a synchronous full-state JSON.stringify + SecureStore.setItemAsync
// write — 50-200ms+ on Android, growing linearly with retention. On the
// crisis/check-in <500ms transition budget that's a visible stall.
//
// Strategy: collapse mutation bursts into a single trailing-edge write.
// State updates remain synchronous (UI stays responsive); persistence
// batches over a 500ms quiet window. The latest state at flush time wins,
// so dropped intermediate writes don't lose data — they're just superseded.
//
// Safety: an AppState listener flushes pending writes on background/
// inactive transitions, so a backgrounded app doesn't lose the last
// 500ms of mutations. Force-quit during the window IS still a loss
// vector (no signal arrives), accepted as the cost of UI responsiveness.
// ──────────────────────────────────────────────────────────────────────────────

const PERSIST_DEBOUNCE_MS = 500;

let pendingPersistTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingPersistPromise: Promise<void> | null = null;

/** Unref the handle when running in Node (Jest) so a pending timer
 * doesn't keep the runtime alive past test completion. */
function unrefTimeout(handle: ReturnType<typeof setTimeout>): void {
  const h = handle as unknown as { unref?: () => void };
  if (typeof h.unref === 'function') h.unref();
}

/**
 * Schedule a debounced persist of the current store state. Multiple
 * calls within the window collapse into one write of the latest snapshot.
 * Errors are logged but never throw — persistence failure shouldn't
 * crash a mutation that already updated in-memory state.
 */
function schedulePersist(): void {
  if (pendingPersistTimeout) {
    clearTimeout(pendingPersistTimeout);
  }
  pendingPersistTimeout = setTimeout(() => {
    pendingPersistTimeout = null;
    const snapshot = useStoicPracticeStore.getState();
    pendingPersistPromise = persistToSecureStore(snapshot)
      .catch((err) => {
        logError(
          LogCategory.SYSTEM,
          'stoicPracticeStore.schedulePersist failed',
          err instanceof Error ? err : new Error(String(err))
        );
      })
      .finally(() => {
        pendingPersistPromise = null;
      });
  }, PERSIST_DEBOUNCE_MS);
  unrefTimeout(pendingPersistTimeout);
}

/**
 * Flush any pending debounced write immediately. Called by the AppState
 * listener on background/inactive transitions so the last 500ms of
 * mutations aren't lost when the user switches apps. Awaitable for
 * callers that want strict before-quit ordering (e.g., tests, lifecycle
 * cleanup).
 */
export async function flushStoicPracticePersist(): Promise<void> {
  if (pendingPersistTimeout) {
    clearTimeout(pendingPersistTimeout);
    pendingPersistTimeout = null;
    const snapshot = useStoicPracticeStore.getState();
    pendingPersistPromise = persistToSecureStore(snapshot);
  }
  if (pendingPersistPromise) {
    await pendingPersistPromise;
  }
}

/**
 * Current persisted schema version for the `stoic_practice_state` blob (FEAT-298 slice 2).
 *
 * Before this the blob carried NO version, so there was no way to express "these records
 * were written under the old model" — which is exactly what "preserve historical records"
 * needs. Blobs without a `version` key are treated as v0 (pre-versioning).
 *
 * Bump this ONLY together with a migration step in `migratePersistedBlob`.
 */
export const STOIC_PRACTICE_SCHEMA_VERSION = 1;

/**
 * Migrate a raw parsed blob forward to `STOIC_PRACTICE_SCHEMA_VERSION`.
 *
 * FORWARD-ONLY and ADDITIVE, and non-negotiably so (compliance pass, FEAT-298 slice 2):
 * rewriting a stored 'midday' into 'daily' would fabricate a record of an action the user
 * never took. That is a data-accuracy violation under the state privacy regimes in
 * docs/legal/regulatory-applicability.md, and it would corrupt any right-to-know / export
 * response. Records are therefore preserved verbatim; only the version stamp is added.
 *
 * v0 → v1 needs NO field transformation at all, because slice 2 widened `CheckInType`
 * additively — every value already on disk is still valid under the new union. That is the
 * point of the additive design, not an oversight: the cheapest migration is the one with
 * nothing to migrate. The mechanism exists so later slices have a versioned base to
 * migrate FROM.
 *
 * Idempotent by construction: gated on the stored version, never on shape-sniffing.
 */
const migratePersistedBlob = (parsed: any): any => {
  const storedVersion =
    typeof parsed.version === 'number' && Number.isFinite(parsed.version) ? parsed.version : 0;

  if (storedVersion >= STOIC_PRACTICE_SCHEMA_VERSION) {
    // Already current, or written by a NEWER build (the user downgraded). Migrating
    // backwards is undefined, so leave every record exactly as it is rather than guessing.
    return parsed;
  }

  // v0 → v1: stamp only. No record is read, rewritten, or filtered — including records
  // whose `type` this build does not recognise (forward-compat: they may come from a
  // future version, and dropping them would be silent data loss).
  return { ...parsed, version: STOIC_PRACTICE_SCHEMA_VERSION };
};

/**
 * Persist state to SecureStore (encrypted)
 */
const persistToSecureStore = async (state: Partial<StoicPracticeState>): Promise<void> => {
  try {
    const dataToStore = {
      version: STOIC_PRACTICE_SCHEMA_VERSION,
      practiceStartDate: state.practiceStartDate?.toISOString() ?? null,
      totalPracticeDays: state.totalPracticeDays,
      currentStreak: state.currentStreak,
      longestStreak: state.longestStreak,
      virtueInstances: state.virtueInstances?.map(vi => ({
        ...vi,
        timestamp: vi.timestamp.toISOString(),
      })) ?? [],
      virtueChallenges: state.virtueChallenges?.map(vc => ({
        ...vc,
        timestamp: vc.timestamp.toISOString(),
      })) ?? [],
      checkInCompletions: state.checkInCompletions?.map(c => ({
        ...c,
        completedAt: c.completedAt.toISOString(),
      })) ?? [],
      principleEngagements: state.principleEngagements?.map(pe => ({
        ...pe,
        timestamp: pe.timestamp.toISOString(),
      })) ?? [],
      weeklyReflections: state.weeklyReflections ?? [],
      domainProgress: {
        work: {
          ...state.domainProgress?.work,
          lastPracticeDate: state.domainProgress?.work.lastPracticeDate?.toISOString() ?? null,
        },
        relationships: {
          ...state.domainProgress?.relationships,
          lastPracticeDate: state.domainProgress?.relationships.lastPracticeDate?.toISOString() ?? null,
        },
        adversity: {
          ...state.domainProgress?.adversity,
          lastPracticeDate: state.domainProgress?.adversity.lastPracticeDate?.toISOString() ?? null,
        },
      },
    };

    await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(dataToStore));
  } catch (error) {
    console.error('Error persisting to SecureStore:', error);
    // Don't throw - allow state to update locally even if persistence fails
  }
};

/**
 * Load state from SecureStore
 */
const loadFromSecureStore = async (): Promise<Partial<StoicPracticeState> | null> => {
  try {
    const storedData = await SecureStore.getItemAsync(SECURE_STORE_KEY);
    if (!storedData) return null;

    const rawParsed = JSON.parse(storedData);

    // Migration runs in its OWN try/catch on purpose. If it fell through to the outer
    // catch below, a migration bug would return null — and null leaves the store at its
    // EMPTY initial state, which the very next schedulePersist() would write over the
    // user's good on-disk blob. That is real data loss, unlike the accepted swallow-on-
    // write in persistToSecureStore (where in-memory state is already correct and only the
    // write is delayed). On failure we fall back to the UNtransformed parse — never a
    // partially-transformed object — and leave the blob unstamped so it retries next load.
    let parsed: any;
    try {
      parsed = migratePersistedBlob(rawParsed);
    } catch (err) {
      logError(
        LogCategory.SYSTEM,
        'stoicPracticeStore schema migration failed; loading records unmigrated',
        err instanceof Error ? err : new Error(String(err))
      );
      parsed = rawParsed;
    }

    return {
      practiceStartDate: parsed.practiceStartDate ? new Date(parsed.practiceStartDate) : null,
      totalPracticeDays: parsed.totalPracticeDays,
      currentStreak: parsed.currentStreak,
      longestStreak: parsed.longestStreak,
      virtueInstances: parsed.virtueInstances?.map((vi: any) => ({
        ...vi,
        timestamp: new Date(vi.timestamp),
      })) ?? [],
      virtueChallenges: parsed.virtueChallenges?.map((vc: any) => ({
        ...vc,
        timestamp: new Date(vc.timestamp),
      })) ?? [],
      checkInCompletions: parsed.checkInCompletions?.map((c: any) => ({
        ...c,
        completedAt: new Date(c.completedAt),
      })) ?? [],
      principleEngagements: parsed.principleEngagements?.map((pe: any) => ({
        ...pe,
        timestamp: new Date(pe.timestamp),
      })) ?? [],
      weeklyReflections: parsed.weeklyReflections ?? [],
      domainProgress: {
        work: {
          ...parsed.domainProgress.work,
          lastPracticeDate: parsed.domainProgress.work.lastPracticeDate
            ? new Date(parsed.domainProgress.work.lastPracticeDate)
            : null,
        },
        relationships: {
          ...parsed.domainProgress.relationships,
          lastPracticeDate: parsed.domainProgress.relationships.lastPracticeDate
            ? new Date(parsed.domainProgress.relationships.lastPracticeDate)
            : null,
        },
        adversity: {
          ...parsed.domainProgress.adversity,
          lastPracticeDate: parsed.domainProgress.adversity.lastPracticeDate
            ? new Date(parsed.domainProgress.adversity.lastPracticeDate)
            : null,
        },
      },
    };
  } catch (error) {
    console.error('Error loading from SecureStore:', error);
    return null;
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// ZUSTAND STORE
// ──────────────────────────────────────────────────────────────────────────────

export const useStoicPracticeStore = create<StoicPracticeState>((set, get) => ({
  ...getInitialState(),
  isLoading: false,

  /**
   * Add a virtue instance (successful practice)
   */
  addVirtueInstance: async (instance: Omit<VirtueInstance, 'id' | 'timestamp'>) => {
    const state = get();

    const newInstance: VirtueInstance = {
      ...instance,
      id: generateId(),
      timestamp: new Date(),
    };

    const updatedDomainProgress = updateDomainProgressForInstance(
      state.domainProgress,
      instance.domain,
      instance.principleApplied
    );

    const newState = {
      virtueInstances: [...state.virtueInstances, newInstance],
      domainProgress: updatedDomainProgress,
    };

    set(newState);
    schedulePersist();
  },

  /**
   * Add a virtue challenge (struggle with practice)
   */
  addVirtueChallenge: async (challenge: Omit<VirtueChallenge, 'id' | 'timestamp'>) => {
    const state = get();

    const newChallenge: VirtueChallenge = {
      ...challenge,
      id: generateId(),
      timestamp: new Date(),
    };

    const newState = {
      virtueChallenges: [...state.virtueChallenges, newChallenge],
    };

    set(newState);
    schedulePersist();
  },

  /**
   * Update practice streak
   */
  updateStreak: (newStreak: number) => {
    const state = get();
    const longestStreak = Math.max(state.longestStreak, newStreak);

    set({
      currentStreak: newStreak,
      longestStreak,
    });
  },

  /**
   * Increment total practice days
   */
  incrementPracticeDays: async () => {
    const state = get();
    const newTotalDays = state.totalPracticeDays + 1;

    set({ totalPracticeDays: newTotalDays });
    schedulePersist();
  },

  /**
   * Set practice start date (when user first started Stoic practice)
   */
  setPracticeStartDate: (date: Date) => {
    set({ practiceStartDate: date });
  },

  /**
   * Get virtue instances by domain
   */
  getVirtueInstancesByDomain: (domain: PracticeDomain): VirtueInstance[] => {
    const state = get();
    return state.virtueInstances.filter(vi => vi.domain === domain);
  },

  /**
   * Get virtue instances by virtue
   */
  getVirtueInstancesByVirtue: (virtue: CardinalVirtue): VirtueInstance[] => {
    const state = get();
    return state.virtueInstances.filter(vi => vi.virtue === virtue);
  },

  /**
   * Get recent virtue instances (last N days)
   */
  getRecentVirtueInstances: (days: number): VirtueInstance[] => {
    const state = get();
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return state.virtueInstances.filter(vi => vi.timestamp >= cutoffDate);
  },

  /**
   * Load persisted state from SecureStore
   */
  loadPersistedState: async () => {
    set({ isLoading: true });

    const persistedState = await loadFromSecureStore();

    if (persistedState) {
      set({ ...persistedState, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  /**
   * Persist current state to SecureStore
   */
  persistState: async () => {
    const state = get();
    await persistToSecureStore(state);
  },

  /**
   * Mark a check-in as completed for today
   * Used by completion screens to track daily check-in progress
   */
  markCheckInComplete: async (type: CheckInType) => {
    const today = getTodayString();
    const now = new Date();
    const currentCompletions = get().checkInCompletions;

    // Remove any existing completion for this type today (handle re-completions)
    const filteredCompletions = currentCompletions.filter(
      c => !(c.type === type && c.date === today)
    );

    // Add new completion
    const newCompletion: CheckInCompletion = {
      type,
      completedAt: now,
      date: today,
    };

    // Clean old completions and add new one
    const updatedCompletions = cleanOldCheckInCompletions([...filteredCompletions, newCompletion]);

    set({ checkInCompletions: updatedCompletions });
    schedulePersist();
  },

  /**
   * Check if a specific check-in type was completed today
   * Used by Home screen to determine faded appearance
   */
  isCheckInCompletedToday: (type: CheckInType): boolean => {
    const today = getTodayString();
    const completions = get().checkInCompletions;
    return completions.some(c => c.type === type && c.date === today);
  },

  /**
   * Record a principle engagement (FEAT-28: Insights Dashboard)
   *
   * Called by flow completion handlers when user engages with a principle.
   * Engagement types:
   * - 'selected': Morning flow - user selected principle as focus
   * - 'applied': Midday/evening - user reported applying principle
   * - 'reflected': Evening - user reflected on principle practice
   */
  recordPrincipleEngagement: async (
    principle: StoicPrinciple,
    flowType: CheckInType,
    engagementType: PrincipleEngagementType
  ) => {
    const today = getTodayString();
    const now = new Date();
    const currentEngagements = get().principleEngagements;

    // Create new engagement record
    const newEngagement: PrincipleEngagement = {
      principle,
      flowType,
      engagementType,
      date: today,
      timestamp: now,
    };

    // Clean old engagements and add new one
    const updatedEngagements = cleanOldPrincipleEngagements([
      ...currentEngagements,
      newEngagement,
    ]);

    set({ principleEngagements: updatedEngagements });
    schedulePersist();
  },

  /**
   * Get principle engagements for last N days (FEAT-28: Insights Dashboard)
   * Used by InsightsScreen to display principle engagement patterns
   */
  getPrincipleEngagements: (days: number): PrincipleEngagement[] => {
    const engagements = get().principleEngagements;
    // Local-calendar decrement (DEBUG-259): match how records are stamped
    // (getTodayString → toLocalDateString) and the MAINT-242 retention
    // cutoff (getRetentionCutoffString). A UTC ms-window cutoff drifted one
    // day off the local `date` stamps near midnight in non-UTC zones.
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffString = toLocalDateString(cutoffDate);
    return engagements.filter(pe => cutoffString && pe.date >= cutoffString);
  },

  /**
   * Get check-in history for last N days (FEAT-28: Insights Dashboard)
   * Used by InsightsScreen to display daily check-in patterns (dot calendar)
   */
  getCheckInHistory: (days: number): CheckInCompletion[] => {
    const completions = get().checkInCompletions;
    // Local-calendar decrement (DEBUG-259): match how records are stamped
    // (getTodayString → toLocalDateString) and the MAINT-242 retention
    // cutoff (getRetentionCutoffString). A UTC ms-window cutoff drifted one
    // day off the local `date` stamps near midnight in non-UTC zones.
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffString = toLocalDateString(cutoffDate);
    return completions.filter(c => cutoffString && c.date >= cutoffString);
  },

  /**
   * Add or replace this week's reflection (FEAT-194)
   *
   * Upsert-by-current-ISO-week semantics: if a reflection already exists
   * for this week, replace its text + savedAt in place (same id). The
   * Edit affordance on the card calls this same action.
   */
  addWeeklyReflection: async (text: string) => {
    const weekStartIso = getIsoWeekStart();
    const savedAt = new Date().toISOString();
    const reflections = get().weeklyReflections;
    const existing = reflections.find(r => r.weekStartIso === weekStartIso);

    const updated: WeeklyReflection[] = existing
      ? reflections.map(r =>
          r.weekStartIso === weekStartIso ? { ...r, text, savedAt } : r
        )
      : [
          ...reflections,
          { id: generateId(), weekStartIso, text, savedAt },
        ];

    set({ weeklyReflections: updated });
    schedulePersist();
  },

  /**
   * Get the reflection (if any) for a given ISO-week-start string
   */
  getWeeklyReflectionForWeek: (weekStartIso: string): WeeklyReflection | undefined => {
    return get().weeklyReflections.find(r => r.weekStartIso === weekStartIso);
  },

  /**
   * Reset store to initial state
   */
  resetStore: async () => {
    try {
      await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    } catch (error) {
      console.error('Error clearing SecureStore:', error);
    }

    set({
      ...getInitialState(),
      isLoading: false,
    });
  },
}));

// Auto-load persisted state on first import
useStoicPracticeStore.getState().loadPersistedState();

// Flush pending debounced writes on app background/inactive so a
// backgrounded app doesn't lose the last ≤500ms of mutations (audit
// PERF-01 risk mitigation). Skipped in test env: NODE_ENV=test (Jest)
// would hold the listener registration forever and trigger open-handle
// warnings; tests exercise flushStoicPracticePersist() directly.
if (process.env['NODE_ENV'] !== 'test') {
  AppState.addEventListener('change', (nextState) => {
    if (nextState === 'background' || nextState === 'inactive') {
      flushStoicPracticePersist().catch(() => {
        // schedulePersist's catch already logged the underlying error;
        // swallow here so the lifecycle handler can't reject.
      });
    }
  });
}
