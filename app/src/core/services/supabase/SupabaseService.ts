/**
 * Supabase Service - Anonymous Cloud Storage for Encrypted Backups
 *
 * LEGAL COMPLIANCE:
 * - Stores only client-encrypted blobs (no plaintext wellness data server-side)
 * - Anonymous Supabase auth sessions only (no PII; no email/phone)
 * - No BAA required — Being is not a HIPAA covered entity
 *
 * IDENTITY (INFRA-260 / MAINT-226 T0b):
 * - A real Supabase anonymous session (`signInAnonymously`) is established at boot,
 *   persisted in expo-secure-store (Keychain/Keystore) via the chunking adapter —
 *   NOT AsyncStorage. `auth.uid()` is therefore a non-null per-user principal on
 *   every request, and all RLS policies key on it. `userId` is the session user id
 *   (== auth.uid()), no longer a device-hash-derived row id.
 *
 * FEATURES:
 * - Anonymous authentication
 * - Encrypted blob storage/retrieval
 * - Privacy-preserving analytics
 * - Circuit breaker for resilience
 *
 * PERFORMANCE:
 * - Non-blocking (doesn't impact crisis detection)
 * - Offline queue support
 * - Configurable retry strategy
 */


import { logSecurity, logError, LogCategory } from '../logging';
import { generateSessionId } from '@/core/utils/id';
import { createClient, isAuthApiError, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createSupabasePinnedFetch,
  validatePinningConfiguration,
} from '../security/pinned-fetch';
import {
  createSecureStoreSessionAdapter,
  readPersistedSession,
  removePersistedSession,
  supabaseAuthStorageKey,
} from './secureStoreSessionAdapter';
import { env } from '@/core/config/env';
import { useConsentStore } from '@/core/stores/consentStore';
import { registerErasureReset } from '@/core/services/privacy/erasureResetRegistry';
import {
  LAST_BACKUP_KEY,
  PENDING_BACKUP_DELETE_KEY,
  isBackupConsentWithdrawal,
  isConsentHydration,
} from './backupWithdrawal';

// Environment configuration
const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
// The project's publishable (or legacy anon) key — whichever the new
// Supabase project hands out. supabase-js doesn't care which.
const SUPABASE_KEY = env.EXPO_PUBLIC_SUPABASE_KEY;

// Storage keys.
// INFRA-260: USER_ID / DEVICE_ID identity keys removed — identity is now the
// Supabase anonymous session (persisted in expo-secure-store via the chunking
// adapter), not a device-hash row id cached in AsyncStorage.
/**
 * DEBUG-413 — the instant the backlog-suppression fix shipped, in epoch ms (UTC).
 *
 * Crisis events queued STRICTLY BEFORE this are dropped at load rather than flushed.
 *
 * WHY AN ABSOLUTE INSTANT AND NOT A RELATIVE AGE. The semantic wanted is precisely
 * "enqueued by a build that predates this fix", which is a fixed point in time. A
 * relative rule ("drop anything older than N days") reads as the safer, more general
 * choice and is the opposite: it would keep discarding legitimately-late vital-interest
 * events forever, contradicting the never-drop invariant the whole enqueue design rests
 * on. This constant fires once per device and then never matches again.
 *
 * WHY DROPPING IS THE RIGHT CALL HERE (founder decision, /b-batch 2026-08-14). Until
 * DEBUG-409 landed, `flushCrisisAnalytics` early-returned on `!this.client` for every
 * device that had not opened Profile → Cloud Backup, so essentially every crisis event
 * ever emitted is still sitting queued — `public.analytics_events` held exactly ONE row,
 * of any type, ever. But `enqueued_at` is captured and then DROPPED by the flush
 * projection, and `created_at` defaults to `NOW()`, so flushing that backlog stamps
 * months-old events with today's date. At this volume (pre-launch: founder devices plus a
 * small TestFlight cohort, and a mix dominated by synthetic QA triggering rather than
 * real distress) the backlog has no evidentiary value and actively poisons what it would
 * inform — it seeds the INFRA-219 alerter's 7-day trailing baseline with dev-generated
 * events and puts a false spike in `crisis_detection_daily`.
 *
 * The alternative — carrying `enqueued_at` through as a real event time — is the better
 * long-term shape and is deliberately NOT done here: it is a schema change against the
 * single shared live project with no down-migration, in the same risk class INFRA-379 is
 * currently parked over.
 *
 * KNOWN RESIDUAL, filed rather than silently absorbed: this fixes the one-time backlog
 * and leaves the underlying `NOW()` behaviour intact, so a post-fix device that is
 * offline for three weeks still stamps three-week-old crises with today's date.
 */
export const PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS = Date.UTC(2026, 7, 14);

/**
 * DEBUG-413 — is a persisted crisis row from a build that carries the fix?
 *
 * A row exactly AT the cutoff is KEPT: the boundary belongs to the fix, and dropping it
 * would discard an event a fixed build could have enqueued in that same millisecond.
 *
 * An UNDATABLE row (missing / null / non-numeric / NaN `enqueued_at`) is treated as
 * pre-fix and dropped. This is unreachable in practice — `git log -S enqueued_at` bottoms
 * out at the same commit that introduced `trackCrisisDetection` (INFRA-214), so no build
 * ever wrote a crisis row without it — but the fallback direction matters: a row that
 * cannot be shown to be post-fix cannot be shown to be safe to stamp with `NOW()`, which
 * is the entire failure this suppression exists to prevent. Note `NaN >= x` is false, so
 * NaN would fall the right way regardless; the explicit test is there so the intent
 * survives a future refactor rather than resting on an IEEE-754 accident.
 */
function isPostFixCrisisEvent(e: any): boolean {
  const t = e?.enqueued_at;
  if (typeof t !== 'number' || !Number.isFinite(t)) return false;
  return t >= PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS;
}

/**
 * ECMA-262 maximum time value. Beyond it `new Date(n).toISOString()` throws RangeError,
 * and `Number.isFinite` does NOT exclude it — 1e20 is perfectly finite.
 */
const MAX_TIME_VALUE_MS = 8.64e15;

/**
 * DEBUG-541 — the UTC day a queued crisis event was DETECTED.
 *
 * Reads the SAME `enqueued_at` that `isPostFixCrisisEvent` above reads, with no second
 * clock read. That is a correctness constraint, not tidiness: if the two ever diverged, an
 * event could survive the DEBUG-413 cutoff while projecting a date from before it, and
 * `min(detected_on)` would stop being bounded by the cutoff that suppression enforces.
 *
 * TOTAL BY CONSTRUCTION. This runs inside the flush projection, so a throw here would take
 * out the whole batch insert — the sole crisis audit sink — for every event in it. A value
 * that cannot be used yields `null` and the caller OMITS the property; the server then
 * falls back to the ingest date. Never a placeholder, and never a dropped event.
 *
 * (`utcDateString` is declared later in this module but is a hoisted function declaration,
 * and this is only ever called at flush time, so the ordering is safe.)
 */
export function crisisDetectedOn(enqueuedAt: unknown): string | null {
  if (typeof enqueuedAt !== 'number' || !Number.isFinite(enqueuedAt)) return null;
  if (Math.abs(enqueuedAt) > MAX_TIME_VALUE_MS) return null;
  return utcDateString(enqueuedAt);
}

const STORAGE_KEYS = {
  LAST_SYNC: '@being/supabase/last_sync',
  OFFLINE_QUEUE: '@being/supabase/offline_queue',
  CRISIS_ANALYTICS_QUEUE: '@being/supabase/crisis_analytics_queue',
  PENDING_BACKUP_DELETE: PENDING_BACKUP_DELETE_KEY,
} as const;

/** DEBUG-764: a withdrawal's server-backup delete not yet confirmed. `uid: null` = resolve at execution. */
interface PendingBackupDelete {
  uid: string | null;
  requestedAt: number;
}

// Circuit breaker configuration
interface CircuitBreakerConfig {
  threshold: number;        // Failures before opening circuit
  timeout: number;         // Cooldown period in ms
  monitorWindow: number;   // Time window for failure counting
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

// Backup data interface
interface EncryptedBackup {
  id: string;
  user_id: string;
  encrypted_data: string;
  checksum: string;
  version: number;
  created_at: string;
}

// Analytics event interface (no PHI)
interface AnalyticsEvent {
  id?: string;
  user_id: string;
  event_type: string;
  properties: Record<string, any>;
  session_id: string;
  created_at?: string;
}

export type AuthenticatedClientResult =
  | { ok: true; client: SupabaseClient; userId: string }
  | { ok: false; reason: 'client_unavailable' | 'no_session' };

// Service configuration
interface SupabaseServiceConfig {
  circuitBreaker: CircuitBreakerConfig;
  retryAttempts: number;
  retryDelayMs: number;
  offlineQueueSize: number;
  analyticsFlushSize: number;
  analyticsFlushIntervalMs: number;
}

/**
 * INFRA-568 — session_id rotation.
 *
 * The shape the DATABASE enforces, mirrored here so the client and the schema agree
 * by construction. `CONSTRAINT session_id_format CHECK (session_id ~
 * '^session_[0-9]{4}-[0-9]{2}-[0-9]{2}_[a-z0-9]+$')` is live on `analytics_events`
 * (`supabase/migrations/20260523000000_base_schema.sql:109`, verified byte-identical
 * against the running project).
 *
 * WHY THE FORMAT IS THE HIGH-SEVERITY SURFACE, NOT THE DATE. `flushCrisisAnalytics`
 * inserts the batch as ONE multi-row `insert(rows)`. A single malformed `session_id`
 * aborts the entire statement with 23514, `result.success` is false, the whole queue is
 * RETAINED, and every later flush re-sends the same poisoned batch — and that call
 * passes `bypassCircuitBreaker: true`, so nothing ever opens to stop the loop. The
 * vital-interest crisis sink would stall permanently and silently. Hence: validate
 * before assigning, and never return a non-conforming string.
 *
 * Note the `+` quantifier — a zero-length suffix is a REJECTION, not a truncation.
 *
 * These live here rather than in `core/utils/id.ts` on the `crisis` ruling for
 * INFRA-568: that module also exports `generateComponentId` / `generateUUID` /
 * `generateTimestampedId`, so hosting a crisis-path predicate there would drag shared
 * UI primitives onto a Protected Path and charge a sim build to every UI-id edit.
 * `generateSessionId()` is left byte-identical, which preserves its already-verified
 * conformance to the constraint above.
 */
const SESSION_ID_FORMAT = /^session_(\d{4}-\d{2}-\d{2})_([a-z0-9]+)$/;

/**
 * Idle gap after which a new engagement is considered to have begun.
 *
 * NOT inherited from analytics folklore: INFRA-542's `SINCE_LAST_ACTIVE_BUCKETS` splits
 * at exactly `5m_30m` / `30m_24h`, so this product already treats a gap longer than 30
 * minutes as a different visit. Aligning keeps a Supabase `session_id` and a PostHog
 * `since_last_active` bucket telling the same story. It is a stated convention, not an
 * empirical fit — there is no session-length distribution to fit against.
 */
export const SESSION_ID_IDLE_MS = 30 * 60 * 1000;

/**
 * `YYYY-MM-DD` for an instant, in **UTC**.
 *
 * UTC is load-bearing. `analytics_events.created_at` is `TIMESTAMPTZ DEFAULT NOW()` and
 * both operator views group by `DATE_TRUNC('day', created_at)`, which is UTC. A
 * device-local prefix would recreate the exact `session_id` vs `created_at` disagreement
 * this rotation exists to remove, for every user west of UTC — and would pass on UTC CI
 * while failing on a developer's machine.
 */
export function utcDateString(nowMs: number = Date.now()): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/**
 * The date component of a session id, or `null` if it does not match the shape the
 * database enforces. Returns `null` rather than salvaging a near-miss: coercing a
 * malformed id into something date-shaped would let it survive to the insert.
 */
export function sessionIdDate(sessionId: string): string | null {
  const match = SESSION_ID_FORMAT.exec(sessionId ?? '');
  return match ? match[1]! : null;
}

/**
 * Whether a session id must be replaced before it is written again.
 *
 * TWO INDEPENDENT CLAUSES — neither subsumes the other:
 *   1. UTC DATE BOUNDARY — a row's session date must agree with its own `created_at`.
 *      Without this, a process alive across midnight stamps rows with yesterday's prefix.
 *   2. IDLE GAP — without this, a "session" is an artifact of how long the process
 *      happened to stay alive, and a backgrounded-for-a-week app still emits one session
 *      per calendar day it wakes in.
 *
 * A malformed id is stale (it cannot be written at all) and so is a future-dated one
 * (the clock moved backwards under us). Strictly greater-than on the idle comparison, so
 * a gap of exactly the threshold does not rotate.
 */
export function isSessionIdStale(
  sessionId: string,
  lastUseAtMs: number,
  nowMs: number = Date.now(),
): boolean {
  const embedded = sessionIdDate(sessionId);
  if (embedded === null) return true;
  if (embedded !== utcDateString(nowMs)) return true;
  return nowMs - lastUseAtMs > SESSION_ID_IDLE_MS;
}

/** DEBUG-764: a corrupt record keeps the delete intent and resolves the uid at execution. */
function parsePendingBackupDelete(raw: string | null): PendingBackupDelete | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw);
    if (value && typeof value === 'object') {
      const uid = typeof value.uid === 'string' && value.uid.length > 0 ? value.uid : null;
      const requestedAt = typeof value.requestedAt === 'number' ? value.requestedAt : 0;
      return { uid, requestedAt };
    }
  } catch {
    // fall through
  }
  return { uid: null, requestedAt: 0 };
}

class SupabaseService {
  private client: SupabaseClient | null = null;
  // INFRA-260: the Supabase anonymous session user id (== auth.uid() server-side).
  private userId: string | null = null;
  private circuitBreaker: CircuitBreakerState;
  private offlineQueue: any[] = [];
  private analyticsQueue: AnalyticsEvent[] = [];
  /**
   * INFRA-214 T3: durable vital-interest crisis-detection telemetry queue.
   * Persisted to AsyncStorage at fire-time so a crisis event survives restart and
   * does NOT depend on the lazily network-provisioned userId. Kept SEPARATE from
   * `offlineQueue` so a backlog of backup ops can never evict a crisis safety event.
   */
  private crisisAnalyticsQueue: Array<{
    event_type: string;
    properties: Record<string, any>;
    session_id: string;
    enqueued_at: number;
  }> = [];
  /**
   * DEBUG-335: serializes EVERY write to CRISIS_ANALYTICS_QUEUE — the enqueue write,
   * the post-flush truncation write, and the startup-load merge. `null` means idle.
   * Without one chain, two writers can serialize different snapshots concurrently and
   * the older one can land last, erasing an event from the sole crisis audit sink.
   */
  private crisisPersistTail: Promise<void> | null = null;
  /** DEBUG-335: a durable write failed; retry it on the next flush rather than lose it. */
  private crisisPersistDirty = false;
  /**
   * Bumped when an erasure drops the queue (DEBUG-704). A flush that snapshotted
   * `pending` under an older epoch must not truncate the queue on success: every
   * entry now in it was enqueued after the erasure, for the fresh identity, and
   * `slice(pending.length)` would silently drop them.
   *
   * DEBUG-715: also the erasure marker a mint checks before assigning `userId`.
   */
  private crisisQueueEpoch = 0;
  /**
   * DEBUG-409: single-flight guard for client construction. `null` means idle.
   *
   * Load-bearing, not defensive polish. Once a client can be created off the crisis
   * path, the boot bootstrap and a concurrently-firing detection would otherwise BOTH
   * call `createClient`. Two SupabaseClients sharing `createSecureStoreSessionAdapter()`
   * both run `autoRefreshToken` against one rotating refresh-token chain and revoke each
   * other's session — auth.uid() goes null mid-session, the exact failure the INFRA-260
   * comment below warns about. Exactly one construction, ever.
   */
  private clientInitPromise: Promise<void> | null = null;
  /**
   * DEBUG-409: re-entrancy guard for flushCrisisAnalytics.
   *
   * There was none, and until this item there did not need to be: `!this.client`
   * returned early for essentially every user, so concurrency was unreachable. With a
   * client on the default path THREE flush sites overlap routinely — initialize()'s,
   * the per-detection one, and the AppState-active one. Each snapshots `pending` and
   * then truncates with `slice(pending.length)`, which both duplicates rows server-side
   * AND discards events enqueued during a concurrent flight.
   */
  private crisisFlushInFlight: Promise<void> | null = null;
  /**
   * DEBUG-715: single-flight for every anonymous-session mint made AFTER construction —
   * the crisis flush's `!userId` fallback and getAuthenticatedClient(). `null` means idle.
   *
   * auth-js `signInAnonymously` takes no lock, so two lanes that each find no session
   * both reach /signup: two accounts, `userId` set to whichever answers last, the crisis
   * rows and a purchase bound to different identities. Every such mint joins this one.
   */
  private sessionMintInFlight: Promise<void> | null = null;
  /**
   * DEBUG-715: deleteAccount() calls in progress. While non-zero, getAuthenticatedClient()
   * never mints and answers `no_session` — a purchase must not create, or bind to, the
   * identity being erased.
   */
  private deletionsInFlight = 0;
  /**
   * DEBUG-764: the withdrawal delete awaiting server confirmation, mirrored to
   * PENDING_BACKUP_DELETE. `loaded` is false until the disk copy has been read once.
   */
  private pendingBackupDelete: PendingBackupDelete | null = null;
  private pendingBackupDeleteLoaded = false;
  /** DEBUG-764: single-flight for drainPendingBackupDelete(). `null` means idle. */
  private backupDeleteInFlight: Promise<boolean> | null = null;
  /** DEBUG-764: told after a confirmed delete (CloudBackupService drops its in-memory hash). */
  private serverBackupDeletedListener: (() => void) | null = null;
  private sessionId: string;
  /** INFRA-568 — last instant `session_id` was WRITTEN, driving the idle clause. */
  private lastSessionUseMs: number = Date.now();
  private analyticsFlushTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  // INFRA-214 T4: keys whose numeric values are wellness-derived and must be severity-bucketed
  // before transmission (closes the "only score/result was bucketed" hole). Operational keys
  // (size_mb, duration_ms, operation_count, …) do not match and pass through.
  private static readonly CLINICAL_NUMERIC_KEY = /score|result|phq|gad|severity|ideation|suicid/i;

  private readonly config: SupabaseServiceConfig = {
    circuitBreaker: {
      threshold: 5,
      timeout: 60000, // 1 minute
      monitorWindow: 300000, // 5 minutes
    },
    retryAttempts: 3,
    retryDelayMs: 1000,
    offlineQueueSize: 100,
    analyticsFlushSize: 10,
    analyticsFlushIntervalMs: 30000, // 30 seconds
  };

  constructor() {
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed',
    };
    // Guarded: this class is instantiated at MODULE SCOPE
    // (`export const supabaseService = new SupabaseService()`), so an unguarded throw
    // here takes the whole module — and with it the crisis telemetry path — down at
    // import time. Routed through the same validated-with-fallback mint as every
    // rotation rather than being a second, differently-guarded call site.
    this.lastSessionUseMs = Date.now();
    this.sessionId = this.mintSessionId('');
    this.setupAppStateListener();
  }

  /**
   * DEBUG-409 — construct the Supabase client, at most once, reading NO consent state.
   *
   * The bug this exists to fix: `flushCrisisAnalytics` early-returned on `!this.client`,
   * `this.client` was assigned only inside `initialize()`, and `initialize()`'s only
   * callers sat inside `initializeCloudServices()` — whose module-scope eager call is
   * gated on `canPerformOperation('cloud_sync')`, evaluated at module-load time when
   * `consentStatus` is still `'loading'`. The predicate is therefore necessarily false
   * and never re-runs, so the eager init was dead code in every build and a client
   * existed only for a user who had opened Profile → Cloud Backup. The crisis audit
   * trail — CLAUDE.md's "audit-logged" Safety Fact — did not exist for anyone else.
   *
   * NOT a consent read, deliberately (AC2). The vital-interest basis in
   * `docs/legal/lia-crisis-telemetry.md` (GDPR Art. 6(1)(d)/9(2)(c)) is consent-
   * independent by design; MAINT-173's gate governs backups and sync, which are a
   * different processing purpose and stay exactly as strict — see index.ts.
   *
   * REJECTED ALTERNATIVES, recorded so they are not re-derived:
   *  - Subscribe to consent hydration and re-run the MAINT-173 gate. Fails outright:
   *    the default device has `cloudSyncEnabled: false`, so the gate is false AFTER
   *    hydration too and no client is ever created.
   *  - A separate crisis-only client. Two clients sharing the secure-store session
   *    adapter both auto-refresh against one rotating refresh-token chain and revoke
   *    each other; auth.uid() goes null mid-session.
   *  - Removing the index.ts gate. That also eagerly starts cloudBackupService and the
   *    AppState background auto-backup handler for non-consenting users — a far wider
   *    egress reversal than the compliance ruling covers.
   *
   * The `await Promise.resolve()` is a hard requirement, not a stylistic yield:
   * `handleCrisisDetection` is awaited by answerQuestion/completeAssessment under a
   * STRICT <200ms CI gate, so construction must never execute inside the synchronous
   * `trackCrisisDetection` frame.
   *
   * DEBUG-704 — `mint: false` restores a persisted session but never signs in
   * anonymously. Only `deleteAccount()` passes it: the deletion path must never create
   * the account it is asked to erase. It applies to the construction this call starts; a
   * caller that joins a construction already in flight gets that one's choice, which is
   * why the crisis flush keeps its own `!userId` mint fallback and why `deleteAccount()`
   * checks the restored uid against the persisted one rather than trusting `userId`.
   */
  private async ensureClient({ mint = true }: { mint?: boolean } = {}): Promise<void> {
    if (this.client) return;
    if (this.clientInitPromise) return this.clientInitPromise;

    this.clientInitPromise = (async () => {
      await Promise.resolve(); // never construct on the caller's synchronous tick
      if (this.client) return;

      if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error('Supabase configuration missing. Check environment variables.');
      }

      const pinningValidation = validatePinningConfiguration();
      if (!pinningValidation.valid) {
        logSecurity(
          '[SupabaseService] SSL pinning configuration issues detected',
          'high',
          { errors: pinningValidation.errors }
        );
      }

      // Create client with the application-layer fetch wrapper.
      // INFRA-231 (MAINT-226/T0b): native TLS certificate pinning is NOT yet
      // implemented — real pinning is deferred to a separate tranche. This
      // wrapper performs standard OS-validated HTTPS only and does NOT provide
      // pin-based MITM protection, so we no longer claim it does here.
      this.client = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          // INFRA-260: a real anonymous session must persist + auto-refresh.
          // Without autoRefresh the access JWT expires (~1h) and the client
          // silently reverts to the unauthenticated `anon` role → auth.uid()
          // goes NULL → every RLS-protected query starts failing mid-session.
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          // Persist the session JWT/refresh token in expo-secure-store
          // (Keychain/Keystore) via the chunking adapter — never AsyncStorage.
          storage: createSecureStoreSessionAdapter(),
        },
        global: {
          // Application-layer fetch wrapper (OS-validated HTTPS; no pin
          // validation performed yet). Data classification defaults to
          // 'METADATA' — override per-request if needed.
          fetch: createSupabasePinnedFetch('METADATA'),
        },
      });

      // Establish (or restore) the anonymous session BEFORE anything that writes —
      // crisis telemetry flushes into analytics_events under auth.uid() RLS and
      // needs a non-null principal to satisfy WITH CHECK.
      await this.ensureAnonymousSession({ mint });
    })();

    try {
      await this.clientInitPromise;
    } finally {
      // Cleared so a failed construction can be retried on a later flush; the
      // durable queue means nothing is lost in the meantime.
      this.clientInitPromise = null;
    }
  }

  /**
   * DEBUG-409 — provision the crisis-telemetry lane at boot, and NOTHING else.
   *
   * Deliberately does NOT set `isInitialized`. That is what keeps AC2 structurally
   * true rather than merely asserted: `processOfflineQueue` stays gated on
   * `isInitialized` (and, since DEBUG-756, on cloud_sync consent), backups stay
   * gated in CloudBackupService, `trackEvent` keeps its own `cloud_sync` check, and
   * `forceSync` keeps its defence-in-depth gate in index.ts. The vital-interest lane
   * provisions a client to deliver `crisis_detected` and touches no other egress.
   *
   * The empty-queue precondition is the whole compliance argument for lazy-over-eager:
   * an install whose user never crosses a crisis threshold never opens a backend
   * session at all, so the marginal privacy cost is bounded to devices that actually
   * recorded a vital-interest event. AC6's recovery of shipped-device backlogs is the
   * same code path — no separate flush-on-upgrade mechanism is needed.
   *
   * Fully wrapped: this runs on the boot path and must never throw into it.
   */
  async initializeCrisisTelemetry(): Promise<void> {
    try {
      await this.loadCrisisAnalyticsQueue();
      if (this.crisisAnalyticsQueue.length === 0) return;
      await this.ensureClient();
      void this.flushCrisisAnalytics();
    } catch (error) {
      logSecurity('[SupabaseService] crisis telemetry bootstrap failed', 'medium', { error });
    }
  }

  /**
   * Initialize Supabase service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // DEBUG-409: client construction + anonymous session now live in ensureClient(),
      // so there is still exactly ONE createClient site and the cloud-sync path here is
      // behaviourally identical — but the crisis flush can reach it too.
      await this.ensureClient();

      // Setup analytics flushing
      this.setupAnalyticsTimer();

      // Load offline queue
      await this.loadOfflineQueue();

      // INFRA-214 T3: load any crisis-detection telemetry enqueued before this run
      // and reconcile/flush it now that the session (and thus userId == auth.uid())
      // exists. If the session could not be established, the flush no-ops and the
      // events stay durably queued for a later attempt (never dropped).
      await this.loadCrisisAnalyticsQueue();
      void this.flushCrisisAnalytics();

      this.isInitialized = true;
      logSecurity('[SupabaseService] Initialized', 'low', { userId: this.userId });

    } catch (error) {
      logError(LogCategory.SYSTEM, '[SupabaseService] Initialization failed:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Establish or restore the anonymous Supabase auth session (INFRA-260 / MAINT-226 T0b).
   *
   * Replaces the legacy device-hash identity. The session (access JWT + refresh
   * token) is persisted by the secure-store chunking adapter; on a returning
   * device `getSession()` restores it, otherwise `signInAnonymously()` mints a
   * fresh one. `this.userId` is set to the session user id, which IS `auth.uid()`
   * server-side — so every RLS policy keys on a non-null per-user principal.
   *
   * Failure is non-fatal: a network-offline first run leaves `userId` null, the
   * service degrades to its offline queues (backups + the durable crisis queue),
   * and a later flush / AppState-active retry establishes the session. We must NOT
   * throw here — initialization continuing is what keeps the offline-first
   * never-drop guarantees intact.
   *
   * DEBUG-704: `mint: false` (deletion only) skips `signInAnonymously`, leaving `userId`
   * null when nothing could be restored.
   *
   * DEBUG-715: `epoch` is the `crisisQueueEpoch` the caller captured before this await. If
   * an erasure bumped it meanwhile, the result is discarded and `userId` is left alone: a
   * session read before the Keychain removal is the ERASED identity, and assigning it
   * would resurrect it.
   */
  private async ensureAnonymousSession({
    mint = true,
    epoch,
  }: { mint?: boolean; epoch?: number } = {}): Promise<void> {
    const erasedMeanwhile = () => epoch !== undefined && epoch !== this.crisisQueueEpoch;
    try {
      const { data: existing } = await this.client!.auth.getSession();
      let user = existing.session?.user ?? null;

      if (!user && mint) {
        const { data, error } = await this.client!.auth.signInAnonymously();
        if (error) throw error;
        user = data.user ?? null;
      }

      if (erasedMeanwhile()) {
        logSecurity('[SupabaseService] Session result discarded: account erased while it was in flight', 'medium');
        return;
      }
      this.userId = user?.id ?? null;
      if (this.userId) {
        logSecurity('[SupabaseService] Anonymous session established', 'low');
      }
    } catch (error) {
      // Non-fatal: degrade to offline queues; a later flush retries the session.
      if (!erasedMeanwhile()) this.userId = null;
      logSecurity('[SupabaseService] Anonymous session not yet established (will retry)', 'medium', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * DEBUG-715 — mint an anonymous session through the one shared single-flight.
   *
   * Callers re-check `this.userId` after the await; this never rejects.
   *
   * A construction still in flight is joined first: ensureClient() assigns `this.client`
   * BEFORE it establishes the session, so a later ensureClient() caller returns early with
   * `userId` still null while that construction may itself be minting. Without the join,
   * that caller would mint a second account beside it.
   *
   * The epoch is captured before the mint await (see ensureAnonymousSession).
   */
  private mintSessionOnce(): Promise<void> {
    if (this.sessionMintInFlight) return this.sessionMintInFlight;

    const flight = (async () => {
      const constructing = this.clientInitPromise;
      if (constructing) {
        try {
          await constructing;
        } catch {
          // A failed construction leaves no client; the check below handles it.
        }
      }
      if (this.userId || !this.client) return;
      await this.ensureAnonymousSession({ mint: true, epoch: this.crisisQueueEpoch });
    })();

    this.sessionMintInFlight = flight;
    const clear = () => {
      if (this.sessionMintInFlight === flight) this.sessionMintInFlight = null;
    };
    flight.then(clear, clear);
    return flight;
  }

  /**
   * Mint a session id that is GUARANTEED to satisfy `SESSION_ID_FORMAT`. Total: never
   * throws, never returns a non-conforming string.
   *
   * The guard is about THROWING, not about latency. `generateRandomString` calls into
   * expo-crypto, and this runs inside `trackCrisisDetection`'s synchronous frame whose
   * `catch` is a DROP — its body is only `logSecurity`, and the queue `push` is the first
   * statement in the try — so an unguarded throw here means the crisis event is never
   * enqueued, never persisted and never flushed. That is total silent loss on the sole
   * vital-interest crisis audit sink: a failure mode strictly more severe than the stale
   * date this change exists to fix.
   *
   * DEGRADATION LADDER:
   *   1. A fresh crypto mint, validated.
   *   2. Re-date the PRIOR id's crypto suffix, so the date claim becomes correct while
   *      the suffix keeps its crypto provenance.
   *   3. A conforming sentinel. Deliberately NOT `Math.random()` — `core/utils/id.ts`
   *      exists to replace Math.random ID generation — and deliberately not an empty or
   *      trimmed suffix, which would be rejected by the CHECK and poison the batch.
   *      A shared constant reduces distinctness rather than increasing it, and it is
   *      greppable in the table as "the crypto-failure path fired".
   */
  private mintSessionId(previous: string): string {
    try {
      const candidate = generateSessionId();
      if (SESSION_ID_FORMAT.test(candidate)) return candidate;
    } catch {
      // fall through to the degradation ladder
    }
    try {
      const prior = SESSION_ID_FORMAT.exec(previous ?? '');
      if (prior) {
        const redated = `session_${utcDateString()}_${prior[2]!}`;
        if (SESSION_ID_FORMAT.test(redated)) return redated;
      }
      const sentinel = `session_${utcDateString()}_cryptofallback`;
      if (SESSION_ID_FORMAT.test(sentinel)) return sentinel;
    } catch {
      // fall through
    }
    return SESSION_ID_FORMAT.test(previous ?? '') ? previous : 'session_1970-01-01_cryptofallback';
  }

  /**
   * The session id to WRITE, rotating first if it has gone stale (INFRA-568).
   *
   * Called from exactly two places — the `session_id:` expression in `trackEvent` and in
   * `trackCrisisDetection`. Nothing else reads `this.sessionId`.
   *
   * ROTATION HAPPENS AT ENQUEUE, NEVER AT FLUSH. `flushCrisisAnalytics` keeps
   * `session_id: e.session_id` from the persisted row. Re-stamping there would break the
   * durable queue's composite identity (`${session_id}|${enqueued_at}|${event_type}|…`),
   * so an in-memory copy would no longer match its own disk copy, the DEBUG-335 merge
   * would classify one event as two, and the crisis row would be inserted TWICE. It would
   * also relabel an offline backlog with the drain-day's session.
   *
   * The idle clock advances on BOTH paths deliberately. A "session" here means one
   * contiguous engagement with the app by one install, and an ops write is evidence of
   * engagement just as a crisis write is. In practice `trackEvent` returns early on
   * `!this.userId` and on `canPerformOperation('cloud_sync') === false` — the default —
   * so on nearly every install this clock is driven by the crisis path alone.
   */
  private currentSessionId(): string {
    const now = Date.now();
    try {
      if (isSessionIdStale(this.sessionId, this.lastSessionUseMs, now)) {
        this.sessionId = this.mintSessionId(this.sessionId);
      }
    } catch {
      // Keep the last-known-good value. Never let telemetry bookkeeping throw into
      // the crisis frame.
    }
    this.lastSessionUseMs = now;
    return this.sessionId;
  }

  /**
   * Check if circuit breaker allows operation
   */
  private canAttemptOperation(): boolean {
    const now = Date.now();

    switch (this.circuitBreaker.state) {
      case 'closed':
        return true;

      case 'open':
        // Check if timeout period has passed
        if (now - this.circuitBreaker.lastFailureTime > this.config.circuitBreaker.timeout) {
          this.circuitBreaker.state = 'half-open';
          return true;
        }
        return false;

      case 'half-open':
        return true;

      default:
        return true;
    }
  }

  /**
   * Record operation success/failure for circuit breaker
   */
  private recordOperationResult(success: boolean): void {
    const now = Date.now();

    if (success) {
      if (this.circuitBreaker.state === 'half-open') {
        // Recovery successful, close circuit
        this.circuitBreaker.state = 'closed';
        this.circuitBreaker.failures = 0;
      }
    } else {
      this.circuitBreaker.failures++;
      this.circuitBreaker.lastFailureTime = now;

      // Open circuit if threshold exceeded
      if (this.circuitBreaker.failures >= this.config.circuitBreaker.threshold) {
        this.circuitBreaker.state = 'open';
      }
    }
  }

  /**
   * Execute operation with circuit breaker and retry logic
   */
  private async executeWithResilience<T>(
    operation: () => Promise<T>,
    operationName: string,
    // DEBUG-409: opt out of the SHARED circuit breaker. Used only by the vital-interest
    // crisis flush, so an unrelated run of cloud-backup failures cannot open the breaker
    // and silence the crisis audit sink. Bypassing means neither consulting the breaker
    // nor recording into it, so crisis failures also stay out of the backup budget.
    opts?: { bypassCircuitBreaker?: boolean }
  ): Promise<{ success: boolean; data?: T; error?: Error }> {
    const useBreaker = !opts?.bypassCircuitBreaker;

    if (useBreaker && !this.canAttemptOperation()) {
      return {
        success: false,
        error: new Error(`Circuit breaker open for ${operationName}`)
      };
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await operation();
        if (useBreaker) this.recordOperationResult(true);
        return { success: true, data: result };

      } catch (error) {
        lastError = error as Error;
        logSecurity(`[SupabaseService] ${operationName} attempt ${attempt} failed:`, 'medium', { error });

        if (attempt < this.config.retryAttempts) {
          await this.sleep(this.config.retryDelayMs * attempt);
        }
      }
    }

    if (useBreaker) this.recordOperationResult(false);
    return { success: false, error: lastError || new Error('Unknown error') };
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Save encrypted backup to cloud
   */
  async saveBackup(encryptedData: string, checksum: string, version: number = 1): Promise<boolean> {
    // DEBUG-756: no upload, and no enqueue, without cloud_sync consent. Refusing BEFORE the
    // enqueue branches matters: a refusal that queued would re-create the queue that
    // processOfflineQueue just dropped, and inside that loop would duplicate the op it is
    // iterating on every foreground.
    if (!this.hasCloudSyncConsent()) {
      logSecurity('[SupabaseService] saveBackup skipped — cloud_sync consent absent', 'low');
      return false;
    }

    // DEBUG-764: a withdrawal's delete lands before any new upload. Not enqueued on failure:
    // CloudBackupService re-creates the backup once the delete is confirmed.
    if (!(await this.drainPendingBackupDelete())) {
      logSecurity('[SupabaseService] saveBackup deferred — pending backup delete unconfirmed', 'low');
      return false;
    }

    if (!this.isInitialized || !this.client || !this.userId) {
      logSecurity('[SupabaseService] Not initialized, queuing backup for later', 'low');
      this.queueOfflineOperation('saveBackup', { encryptedData, checksum, version });
      return false;
    }

    const result = await this.executeWithResilience(async () => {
      const resp: any = await this.client!
        .from('encrypted_backups')
        .upsert({
          user_id: this.userId,
          encrypted_data: encryptedData,
          checksum,
          version,
          // DEBUG-274: size_bytes is NOT NULL (CHECK <= 10MB). Omitting it failed every
          // write "null value in column size_bytes violates not-null constraint" — a
          // latent bug only reachable once the auth.uid() write path went live (INFRA-260).
          size_bytes: encryptedData.length,
        }, {
          // DEBUG-275: conflict on user_id (one_backup_per_user UNIQUE), not the PK.
          // Without this, each call mints a fresh id → always INSERT → the 2nd backup
          // violates one_backup_per_user. Keyed on user_id, a repeat backup UPDATEs.
          onConflict: 'user_id',
        });
      // DEBUG-255: supabase-js RESOLVES with { error } for most failures (RLS
      // denial, PostgREST errors, constraint violations) rather than throwing.
      // executeWithResilience keys success off NOT throwing, so surface a
      // resolved error as a retryable failure — otherwise a failed backup is
      // reported as success, last_sync is written, and the op is never queued.
      // (Same guard flushCrisisAnalytics/getBackup already use.)
      if (resp?.error) throw resp.error;
      return resp;
    }, 'saveBackup');

    if (!result.success) {
      logError(LogCategory.SYSTEM, '[SupabaseService] Backup failed:', result.error instanceof Error ? result.error : new Error(String(result.error)));
      this.queueOfflineOperation('saveBackup', { encryptedData, checksum, version });
      return false;
    }

    // Update last sync time
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    return true;
  }

  /**
   * Retrieve encrypted backup from cloud
   */
  async getBackup(): Promise<EncryptedBackup | null> {
    // DEBUG-764: never read back (or restore) a backup the user has asked to delete.
    if (!(await this.drainPendingBackupDelete())) return null;

    if (!this.isInitialized || !this.client || !this.userId) {
      logSecurity('[SupabaseService] Not initialized, cannot retrieve backup', 'low');
      return null;
    }

    const result = await this.executeWithResilience(async () => {
      const { data, error } = await this.client!
        .from('encrypted_backups')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    }, 'getBackup');

    if (!result.success) {
      logError(LogCategory.SYSTEM, '[SupabaseService] Get backup failed:', result.error instanceof Error ? result.error : new Error(String(result.error)));
      return null;
    }

    return result.data || null;
  }

  /**
   * Track analytics event (privacy-preserving)
   */
  async trackEvent(
    eventType: string,
    properties: Record<string, any> = {}
  ): Promise<void> {
    if (!this.userId) {
      logSecurity('[SupabaseService] Cannot track event without user ID', 'low');
      return;
    }

    // INFRA-214 T4/T5: trackEvent carries OPERATIONAL telemetry (backup/sync bookkeeping) —
    // a side-effect of the cloud-sync service the user enabled, not product analytics. Gate on
    // `cloud_sync` consent (the matching legal basis; also honors universal opt-out / GPC), per
    // the T5 compliance ruling. Product analytics go to PostHog (consent-gated there); the
    // vital-interest crisis-detection event uses the separate trackCrisisDetection() bypass.
    if (!useConsentStore.getState().canPerformOperation('cloud_sync')) {
      return;
    }

    // Sanitize properties to ensure no PHI
    const sanitizedProperties = this.sanitizeAnalyticsProperties(properties);

    const event: AnalyticsEvent = {
      user_id: this.userId,
      event_type: eventType,
      properties: sanitizedProperties,
      session_id: this.currentSessionId(),
    };

    this.analyticsQueue.push(event);

    // Flush if queue is full
    if (this.analyticsQueue.length >= this.config.analyticsFlushSize) {
      await this.flushAnalytics();
    }
  }

  /**
   * Sanitize analytics properties to remove any potential PHI
   */
  private sanitizeAnalyticsProperties(properties: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(properties)) {
      // Allow only safe property types
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        // INFRA-214 T4: bucket any CLINICALLY-named numeric (not just `score`/`result`), so a
        // raw PHQ-9/GAD-7 value can't leak through a key like `phq9_total` or `severity`.
        // Operational numerics (size_mb, duration_ms, operation_count, …) are NOT clinical and
        // pass through normally. Shared invariant: no raw PHQ/GAD integer leaves the device.
        if (SupabaseService.CLINICAL_NUMERIC_KEY.test(key)) {
          if (typeof value === 'number') {
            sanitized[`${key}_bucket`] = this.scoreToSeverityBucket(value, key);
          }
          // A clinically-named string/boolean (already a bucket/label) passes through.
          else {
            sanitized[key] = value;
          }
        } else {
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  }

  /**
   * Convert scores to privacy-preserving severity buckets
   */
  private scoreToSeverityBucket(score: number, scoreType: string): string {
    if (scoreType.toLowerCase().includes('phq')) {
      if (score < 5) return 'minimal';
      if (score < 10) return 'mild';
      if (score < 15) return 'moderate';
      if (score < 20) return 'moderate_severe';
      return 'severe';
    }

    if (scoreType.toLowerCase().includes('gad')) {
      if (score < 5) return 'minimal';
      if (score < 10) return 'mild';
      if (score < 15) return 'moderate';
      return 'severe';
    }

    // Generic bucketing
    if (score < 5) return 'low';
    if (score < 15) return 'medium';
    return 'high';
  }

  /**
   * Flush analytics queue to database
   */
  private async flushAnalytics(): Promise<void> {
    if (this.analyticsQueue.length === 0 || !this.client) return;

    const eventsToFlush = [...this.analyticsQueue];
    this.analyticsQueue = [];

    const result = await this.executeWithResilience(async () => {
      const resp: any = await this.client!
        .from('analytics_events')
        .insert(eventsToFlush);
      // DEBUG-255: surface a resolved { error } as a retryable failure (see
      // saveBackup) so a failed flush re-queues the events below instead of
      // silently dropping them.
      if (resp?.error) throw resp.error;
      return resp;
    }, 'flushAnalytics');

    if (!result.success) {
      logError(LogCategory.SYSTEM, '[SupabaseService] Analytics flush failed:', result.error instanceof Error ? result.error : new Error(String(result.error)));
      // Put events back in queue (with size limit)
      this.analyticsQueue = eventsToFlush.concat(this.analyticsQueue)
        .slice(0, this.config.offlineQueueSize);
    }
  }

  /**
   * DEBUG-218: coerce a required crisis-telemetry categorical field. A missing/empty
   * value degrades to an explicit 'unknown' sentinel + a high-severity log (queryable
   * degradation) rather than silently coercing to the literal "undefined". The
   * vital-interest event is still emitted — never dropped on a field-validation miss.
   */
  private requireCrisisField(value: string | undefined | null, field: string): string {
    if (value === undefined || value === null || value === '') {
      logSecurity('[SupabaseService] crisis telemetry missing required field', 'high', { field });
      return 'unknown';
    }
    return String(value);
  }

  /**
   * INFRA-214 T3 — Vital-interest crisis-detection telemetry.
   *
   * Fire-and-forget: synchronous durable enqueue + best-effort async flush. NEVER
   * awaited by and NEVER throws into the crisis-intervention path. The payload is
   * already bucketed + PII-free (caller passes only the trigger category, a severity
   * bucket and booleans — never a raw PHQ-9/GAD-7 score or Q9 value). Enqueued
   * durably regardless of analytics consent or userId provisioning (vital-interests
   * basis), so a first-run/offline crisis is not silently dropped.
   */
  trackCrisisDetection(telemetry: {
    trigger_type: string;
    severity_bucket: string;
    intervention_surfaced: boolean;
    assessment_type: string;
  }): void {
    try {
      // Explicit allow-list — NEVER spread the detection object (it carries the raw
      // triggerValue / score). Only the four bucketed/categorical fields below.
      this.crisisAnalyticsQueue.push({
        event_type: 'crisis_detected',
        properties: {
          trigger_type: String(telemetry.trigger_type),
          // DEBUG-218: degrade a missing field to an explicit 'unknown' sentinel + a
          // high-severity log instead of String(undefined) → the literal "undefined".
          severity_bucket: this.requireCrisisField(telemetry.severity_bucket, 'severity_bucket'),
          intervention_surfaced: Boolean(telemetry.intervention_surfaced),
          assessment_type: this.requireCrisisField(telemetry.assessment_type, 'assessment_type'),
        },
        session_id: this.currentSessionId(),
        enqueued_at: Date.now(),
      });
      // Durable persist immediately (own key — never evicted by the ops queue).
      // DEBUG-335: goes through the serialized chain so a concurrent truncation write
      // cannot clobber it, and a failed write is retried instead of silently swallowed.
      void this.persistCrisisQueue();
      // Best-effort flush now; never awaited, never throws out of here.
      void this.flushCrisisAnalytics();
    } catch (error) {
      // Telemetry must never affect the crisis flow. Record locally so a future
      // dashboard gap is explainable from on-device records.
      logSecurity('[SupabaseService] crisis telemetry enqueue failed', 'medium', { error });
    }
  }

  /**
   * DEBUG-335 — the single serialization point for CRISIS_ANALYTICS_QUEUE writes.
   *
   * Two properties matter and they pull in opposite directions:
   *
   *  - The write must be ISSUED in the same synchronous step as the enqueue, because
   *    `handleCrisisDetection` is awaited by `answerQuestion`/`completeAssessment` and
   *    that span is measured by the strict <200ms `Performance regression` gate. Hence
   *    the idle fast path below: when nothing is in flight, `run()` is invoked directly
   *    and its `AsyncStorage.setItem(...)` call is evaluated before this method returns.
   *  - Writes must be TOTALLY ORDERED, because the flush truncation write and an
   *    enqueue write both serialize the whole queue. Hence the chain when one is
   *    already in flight.
   *
   * `run()` re-serializes the LIVE queue at write time rather than capturing a snapshot,
   * so a queued write always persists current truth and self-heals a previous failure.
   * The returned promise NEVER rejects — `trackCrisisDetection` is fire-and-forget and a
   * rejection would surface as an unhandled rejection on the crisis path.
   */
  private persistCrisisQueue(): Promise<void> {
    const run = async (): Promise<void> => {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEYS.CRISIS_ANALYTICS_QUEUE,
          JSON.stringify(this.crisisAnalyticsQueue)
        );
        this.crisisPersistDirty = false;
      } catch (error) {
        // Do NOT rethrow: mark dirty so the next flush retries. Losing the event is
        // worse than writing it twice — this is the only crisis audit sink.
        this.crisisPersistDirty = true;
        logSecurity(
          '[SupabaseService] crisis telemetry persist failed — retained for retry',
          'high',
          { error }
        );
      }
    };

    const tail = this.crisisPersistTail === null ? run() : this.crisisPersistTail.then(run);
    this.crisisPersistTail = tail;
    // Identity-guard the reset so a settling link cannot clear a newer tail.
    void tail.then(() => {
      if (this.crisisPersistTail === tail) this.crisisPersistTail = null;
    });
    return tail;
  }

  /**
   * Reconcile + flush durably-queued crisis-detection telemetry to analytics_events.
   * user_id is resolved at flush time; if not yet provisioned (first-run/offline) or
   * the client is unavailable, the events stay durably queued for a later attempt.
   */
  private async flushCrisisAnalytics(): Promise<void> {
    // DEBUG-335: retry a previously-failed durable write BEFORE the early returns
    // below. An offline or unprovisioned device returns early every time, so a retry
    // placed after these guards would never run — the first-run case DEBUG-305 made
    // critical by removing the local duplicate record.
    if (this.crisisPersistDirty) void this.persistCrisisQueue();

    if (this.crisisAnalyticsQueue.length === 0) return;

    // INFRA-411: the Maestro safety gate runs a Release binary carrying REAL Supabase
    // config (INFRA-383) and boots with cloudSyncEnabled: true from the e2e seed, so
    // once a client exists on the default path the four detection-triggering flows
    // would write real crisis_detected rows into production analytics_events — the
    // table the FEAT-129 operator views read and the INFRA-219 alerter keys on.
    // Suppress at the egress boundary rather than filtering downstream: filtering
    // would need a migration against the single shared live project.
    //
    // Costs no coverage. Every flow launches with clearState/clearKeychain, so the
    // gate can never verify delivery or reconciliation anyway; end-to-end proof is
    // INFRA-412's attended measurement against a normal Release build.
    //
    // Read at call time, NOT hoisted to a module-scope const like e2eSeed.ts's
    // SEED_ACTIVE — this must stay togglable per test. Exact-string compare, never
    // a truthiness check: only the inlined build constant may take this path.
    if (env.EXPO_PUBLIC_E2E_SEED_ONBOARDED === 'true') return; // events retained, never sent

    // DEBUG-409: COALESCE, don't drop. Three flush sites now overlap routinely —
    // initialize()'s, the per-detection one, and the AppState-active one. Running two
    // concurrently corrupts the queue: each snapshots `pending` and then truncates with
    // slice(pending.length), duplicating rows server-side AND discarding whatever was
    // enqueued mid-flight.
    //
    // But a late caller must not simply return. The in-flight flush may have been doomed
    // when it started (no client, no session yet) while the caller now has what it needs,
    // so dropping the request strands the queue until some later trigger. Instead: await
    // the flight, then take ONE more pass if work remains. Each caller adds at most one
    // pass, so this cannot spin.
    //
    // Placed AFTER the dirty-retry so the DEBUG-335 durable-write retry still runs on
    // every call, including ones that coalesce or are suppressed.
    const inFlight = this.crisisFlushInFlight;
    if (inFlight) {
      await inFlight;
      if (this.crisisAnalyticsQueue.length === 0) return; // the flight drained it
      // Re-read the field rather than testing the narrowed one: after the await the
      // compiler still believes the original is non-null, which would make this check
      // dead code (TS2801). A DIFFERENT promise here means another caller already took
      // the follow-up pass, so this one has nothing left to do.
      const next = this.crisisFlushInFlight;
      if (next && next !== inFlight) return;
    }

    const flight = (async () => {
      // DEBUG-409: provision the client if this is the first crisis on this install.
      // Reads no consent state; see ensureClient(). Placed AFTER the empty-queue return
      // above, so an install that never records a crisis never opens a backend session.
      await this.ensureClient();

      if (!this.client) return; // reconcile on a later flush

      // INFRA-260: crisis telemetry inserts into analytics_events under auth.uid()
      // RLS (WITH CHECK user_id = auth.uid()). If the session wasn't established at
      // boot (offline first run), try once more now — this runs off the crisis path
      // (fire-and-forget), never blocking detection. Still no session → retain &
      // retry later (AppState-active / next flush); the durable queue means the
      // event is never dropped.
      //
      // DEBUG-715: through the shared mint single-flight, so a concurrent purchase
      // verification cannot mint a second identity beside this one.
      if (!this.userId) {
        await this.mintSessionOnce();
        if (!this.userId) return;
      }

      const pending = [...this.crisisAnalyticsQueue];
      const epoch = this.crisisQueueEpoch;
      const rows: AnalyticsEvent[] = pending.map((e) => {
        // DEBUG-541: project the detection day HERE, at flush, never at enqueue.
        //
        // Three reasons it has to be this seam. (1) The on-disk queue format stays put, so
        // the DEBUG-335 composite dedup identity (`session_id|enqueued_at|event_type|
        // properties`) is byte-stable — projecting at enqueue would make an in-memory copy
        // stop matching its own disk copy, and the merge would insert the crisis row TWICE.
        // (2) Events ALREADY queued on existing installs gain `detected_on` retroactively,
        // which is most of the point. (3) Two live suites pin the exact four-key set on the
        // emitter's arguments (journalCrisisScan, crisisTelemetryFields.regression) and stay
        // green by construction — an enqueue-time projection would red them, and "fix the
        // test" would be the wrong move.
        const detectedOn = crisisDetectedOn(e.enqueued_at);
        return {
          user_id: this.userId!,
          event_type: e.event_type,
          // A NEW object when the day is usable. Never mutate `e.properties` — that object
          // IS the persisted queue entry, and mutating it would change the dedup identity
          // of an event still sitting on disk.
          properties: detectedOn ? { ...e.properties, detected_on: detectedOn } : e.properties,
          session_id: e.session_id,
        };
      });

      const result = await this.executeWithResilience(
        async () => {
          const resp: any = await this.client!.from('analytics_events').insert(rows);
          // executeWithResilience keys success off throwing, so surface a Supabase
          // error response as a retryable failure rather than a false success.
          if (resp?.error) throw resp.error;
          return resp;
        },
        'flushCrisisAnalytics',
        // DEBUG-409: the crisis sink does NOT share the cloud-backup failure budget.
        // One circuitBreaker instance serves saveBackup/getBackup/flushAnalytics too,
        // and 5 failures in 5 minutes opens it — so without this, a run of backup
        // failures would silence the vital-interest audit trail for repeated 60s
        // windows. Retries still apply; only the shared breaker is bypassed.
        { bypassCircuitBreaker: true }
      );

      if (result.success) {
        // Drop the flushed prefix; keep anything enqueued during the flight. If an
        // erasure dropped the queue mid-flight, the prefix is already gone and what
        // remains belongs to the fresh identity — keep all of it (DEBUG-704).
        if (epoch === this.crisisQueueEpoch) {
          this.crisisAnalyticsQueue = this.crisisAnalyticsQueue.slice(pending.length);
        }
        // DEBUG-335: through the same chain as the enqueue write. A raw setItem here
        // races an in-flight enqueue write and can resurrect an already-flushed event.
        await this.persistCrisisQueue();
      } else {
        // Retained for retry. Escalate to the local audit/security log so the gap is visible.
        logSecurity(
          '[SupabaseService] crisis telemetry flush failed — retained for retry',
          'medium',
          { pending: pending.length }
        );
      }
    })();

    this.crisisFlushInFlight = flight;
    try {
      await flight;
    } finally {
      this.crisisFlushInFlight = null;
    }
  }

  /**
   * Load durably-persisted crisis-detection telemetry on startup.
   */
  private async loadCrisisAnalyticsQueue(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CRISIS_ANALYTICS_QUEUE);
      if (!data) return;
      const persisted = JSON.parse(data);
      if (!Array.isArray(persisted)) return;

      // DEBUG-413 — drop the pre-fix backlog HERE, at adoption, before either branch
      // below. Doing it at adoption rather than at flush time is deliberate: a suppressed
      // row never enters the in-memory queue at all, so no later flush path, retry or
      // merge can resurrect it. Filtering at flush would leave the rows on disk, re-read
      // on every boot, one code path away from being sent.
      const kept = persisted.filter(isPostFixCrisisEvent);
      const suppressed = persisted.length - kept.length;
      if (suppressed > 0) {
        const ages = persisted
          .filter((e: any) => !isPostFixCrisisEvent(e))
          .map((e: any) => (typeof e?.enqueued_at === 'number' ? e.enqueued_at : null))
          .filter((n: number | null): n is number => n !== null);
        logSecurity('[SupabaseService] pre-fix crisis backlog suppressed', 'high', {
          suppressed,
          kept: kept.length,
          oldestEnqueuedAt: ages.length ? Math.min(...ages) : null,
          newestEnqueuedAt: ages.length ? Math.max(...ages) : null,
          undatable: suppressed - ages.length,
        });
      }

      // Normal boot: nothing in memory yet, so adopt what is on disk.
      if (this.crisisAnalyticsQueue.length === 0) {
        this.crisisAnalyticsQueue = kept;
        // DEBUG-413: persist the drop even though this branch otherwise returns without
        // writing. Without it the suppression is not one-shot — the same backlog is
        // re-read and re-suppressed on every boot forever, and a single future code path
        // that adopts before filtering would send it.
        if (suppressed > 0) void this.persistCrisisQueue();
        return;
      }

      // DEBUG-335: `initialize()` is lazy (it runs on Cloud Backup, not at boot), so a
      // detection can fire BEFORE this load. A blind assign would drop that live event
      // from the sole crisis audit sink. Merge instead, de-duplicating on a composite
      // identity so a repeated load cannot double-count, and keeping disk entries first
      // to preserve chronology.
      //
      // DEBUG-413: merges `kept`, never `persisted`. The in-memory event is post-fix by
      // construction (it was enqueued by the running build), so suppression can only ever
      // remove disk rows — it must not reach the live event this branch exists to protect.
      const identity = (e: any): string =>
        `${e?.session_id}|${e?.enqueued_at}|${e?.event_type}|${JSON.stringify(e?.properties)}`;
      const inMemory = new Set(this.crisisAnalyticsQueue.map(identity));
      const recovered = kept.filter((e: any) => !inMemory.has(identity(e)));
      if (recovered.length === 0) {
        // Same reasoning as the early return above: nothing to recover, but if we dropped
        // rows the disk copy is now stale and must be rewritten.
        if (suppressed > 0) void this.persistCrisisQueue();
        return;
      }

      this.crisisAnalyticsQueue = [...recovered, ...this.crisisAnalyticsQueue];
      void this.persistCrisisQueue();
    } catch (error) {
      logSecurity('[SupabaseService] Failed to load crisis telemetry queue', 'medium', { error });
    }
  }

  /**
   * Setup analytics timer for periodic flushing
   */
  private setupAnalyticsTimer(): void {
    // INFRA-177: Skip interval setup in test environment to prevent Jest
    // worker hang from unguarded timers (INFRA-144/175 pattern).
    if (process.env.NODE_ENV === 'test') return;

    this.analyticsFlushTimer = setInterval(
      () => this.flushAnalytics(),
      this.config.analyticsFlushIntervalMs
    );
  }

  /**
   * Queue operation for offline processing
   */
  private queueOfflineOperation(operation: string, data: any): void {
    if (this.offlineQueue.length >= this.config.offlineQueueSize) {
      // Remove oldest operation
      this.offlineQueue.shift();
    }

    this.offlineQueue.push({
      operation,
      data,
      timestamp: Date.now(),
    });

    // Save to persistent storage
    AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(this.offlineQueue));
  }

  /**
   * Load offline queue from storage
   */
  private async loadOfflineQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      if (queueData) {
        this.offlineQueue = JSON.parse(queueData);
      }
    } catch (error) {
      logSecurity('[SupabaseService] Failed to load offline queue:', 'medium', { error });
      this.offlineQueue = [];
    }
  }

  /**
   * DEBUG-698 — drop the in-memory backup retry queue at account erasure.
   *
   * The erasure sweep removes `@being/supabase/offline_queue` (SWEPT_EXACT_KEYS), but
   * `queueOfflineOperation`, `processOfflineQueue` and `cleanup` each re-serialise this
   * whole array to that key, so the next one would restore every pre-erasure op. This
   * and the list entry land and stay together. Synchronous, no I/O, and touches
   * nothing else: the crisis queue's erasure is `teardownErasedSession`'s, not this.
   */
  resetOfflineQueueForErasure(): void {
    this.offlineQueue = [];
    // DEBUG-764: the pending delete holds the erased uid; its key is on SWEPT_EXACT_KEYS.
    // Marked loaded so no later drain re-reads a disk copy the sweep is about to remove.
    this.pendingBackupDelete = null;
    this.pendingBackupDeleteLoaded = true;
  }

  /** DEBUG-764: CloudBackupService registers here to drop its change-detection hash. */
  setServerBackupDeletedListener(listener: () => void): void {
    this.serverBackupDeletedListener = listener;
  }

  /**
   * DEBUG-764 — cloud-backup consent was withdrawn (backupWithdrawal.ts states when): delete
   * the server copy. Reads no consent (R3) and never throws into the consent store's set().
   *
   * Queued pre-withdrawal snapshots are dropped, so none can replay after a re-grant; the
   * filtered queue is written to disk because before initialize() it is not in memory and
   * loadOfflineQueue would restore it. The record is persisted BEFORE the attempt, so a
   * process killed mid-request still retries; a failed write leaves the memory copy driving
   * this process's retries.
   */
  async requestBackupDeletion(): Promise<void> {
    this.offlineQueue = this.offlineQueue.filter((op) => op?.operation !== 'saveBackup');

    let uid = this.userId;
    if (!uid) {
      try {
        uid = (await readPersistedSession(supabaseAuthStorageKey(SUPABASE_URL))).uid;
      } catch {
        uid = null; // resolved from the restored session at execution
      }
    }
    // Join a drain already running for an older record, then run one for this one.
    if (this.backupDeleteInFlight) await this.backupDeleteInFlight;
    this.pendingBackupDelete = { uid, requestedAt: Date.now() };
    this.pendingBackupDeleteLoaded = true;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_BACKUP_DELETE, JSON.stringify(this.pendingBackupDelete));
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(this.offlineQueue));
    } catch (error) {
      logSecurity('[SupabaseService] pending backup delete not persisted', 'medium', { error });
    }
    await this.drainPendingBackupDelete();
  }

  /**
   * DEBUG-764 — execute the pending delete, if any. Resolves true when nothing is pending or
   * the server confirmed; false when it must be retried. Never rejects.
   *
   * Retried at consent hydration and on every foreground until confirmed, with no cap (R3).
   * Through executeWithResilience WITH the shared breaker — never bypassCircuitBreaker, which
   * is the crisis flush's alone — so a failing delete can never gate crisis delivery.
   */
  drainPendingBackupDelete(): Promise<boolean> {
    if (this.backupDeleteInFlight) return this.backupDeleteInFlight;
    const flight = this.runPendingBackupDelete().catch((error) => {
      logSecurity('[SupabaseService] pending backup delete failed — retained for retry', 'medium', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    });
    this.backupDeleteInFlight = flight;
    const clear = () => {
      if (this.backupDeleteInFlight === flight) this.backupDeleteInFlight = null;
    };
    flight.then(clear, clear);
    return flight;
  }

  private async runPendingBackupDelete(): Promise<boolean> {
    if (!this.pendingBackupDeleteLoaded) {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_BACKUP_DELETE);
      if (!this.pendingBackupDeleteLoaded) {
        this.pendingBackupDelete = parsePendingBackupDelete(raw);
        this.pendingBackupDeleteLoaded = true;
      }
    }
    const pending = this.pendingBackupDelete;
    if (!pending) return true;
    // The account cascade (deleteAccount) removes the row; a request now could also reach
    // for the identity being erased.
    if (this.deletionsInFlight > 0) return false;

    // R4: never mint to delete. No session in memory and none persisted: nothing to delete.
    if (!this.userId) {
      const persisted = await readPersistedSession(supabaseAuthStorageKey(SUPABASE_URL));
      if (!persisted.present) return this.clearPendingBackupDelete(pending);
      await this.ensureClient({ mint: false });
    }
    const uid = this.userId;
    const client = this.client;
    if (!uid || !client || this.deletionsInFlight > 0) return false;
    if (pending.uid && pending.uid !== uid) {
      logSecurity('[SupabaseService] pending backup delete belongs to another identity — cleared', 'medium');
      return this.clearPendingBackupDelete(pending);
    }

    const result = await this.executeWithResilience(async () => {
      const resp: any = await client.from('encrypted_backups').delete().eq('user_id', uid);
      // DEBUG-255: a resolved { error } is a failure. Zero rows deleted is success.
      if (resp?.error) throw resp.error;
      return resp;
    }, 'deleteBackup');
    if (!result.success) return false;

    await this.clearPendingBackupDelete(pending);
    // A re-grant must upload a fresh backup, not skip it as unchanged.
    await AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
    await AsyncStorage.removeItem(LAST_BACKUP_KEY);
    try {
      this.serverBackupDeletedListener?.();
    } catch (error) {
      logSecurity('[SupabaseService] backup-deleted listener failed', 'low', { error });
    }
    logSecurity('[SupabaseService] Server backup deleted after consent withdrawal', 'low', {
      pendingForMs: Date.now() - pending.requestedAt,
    });
    return true;
  }

  /** Clears only the record it was handed: a newer withdrawal's record stays. Returns true. */
  private async clearPendingBackupDelete(record: PendingBackupDelete): Promise<boolean> {
    if (this.pendingBackupDelete !== record) return true;
    this.pendingBackupDelete = null;
    await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_BACKUP_DELETE);
    return true;
  }

  /**
   * DEBUG-756 — cloud_sync consent, read at the moment of the cloud act. Never throws: it is
   * reached from the AppState listener, beside the crisis-telemetry retry.
   */
  private hasCloudSyncConsent(): boolean {
    try {
      return useConsentStore.getState().canPerformOperation('cloud_sync');
    } catch {
      return false;
    }
  }

  /**
   * DEBUG-756 — what consent says to do with the queued backups right now (compliance ruling):
   * - 'hold' while consent is still 'loading': unknown is not a withdrawal, and a cold-start
   *   foreground can land before hydration - dropping then would erase a consenting user's
   *   queue on every boot. A failed read also holds (no upload, no drop).
   * - 'drop' on definitive absence (cloud_sync off, Universal Opt-Out, revoked, any other
   *   non-valid status): privacy policy §9 says opt-out "immediately suppresses" the backup,
   *   and nothing is kept for a purpose the user withdrew from. Dropping loses nothing - the
   *   queue is a retry buffer, and CloudBackupService re-creates a fresh backup once consent
   *   is valid again, so holding would only replay a pre-withdrawal snapshot. Same
   *   emit/hold/purge shape as DEBUG-686's analytics disposition.
   * - 'process' when consent is valid.
   * A plain `=== 'loading'` check, deliberately: suites that mock the store with only
   * `canPerformOperation` must still read as process-or-drop.
   */
  private offlineQueueDisposition(): 'process' | 'hold' | 'drop' {
    try {
      const consent = useConsentStore.getState();
      if (consent.consentStatus === 'loading') return 'hold';
      return consent.canPerformOperation('cloud_sync') ? 'process' : 'drop';
    } catch {
      return 'hold';
    }
  }

  /**
   * Process offline queue when connectivity is restored
   */
  async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0 || !this.isInitialized) return;

    // DEBUG-756: decided ONCE, before the loop. A mid-loop withdrawal makes saveBackup refuse
    // without re-queuing, so the item stays and the next pass drops it.
    const disposition = this.offlineQueueDisposition();
    if (disposition === 'hold') return;

    if (disposition === 'drop') {
      logSecurity('[SupabaseService] cloud_sync consent absent — dropping queued backups', 'low', {
        droppedOperations: this.offlineQueue.length,
      });
      this.offlineQueue = [];
    }

    logSecurity('[SupabaseService] Processing offline queue', 'low', {
      pendingOperations: this.offlineQueue.length,
    });

    const processedOperations: number[] = [];

    for (let i = 0; i < this.offlineQueue.length; i++) {
      const { operation, data } = this.offlineQueue[i];

      try {
        switch (operation) {
          case 'saveBackup':
            const success = await this.saveBackup(data.encryptedData, data.checksum, data.version);
            if (success) processedOperations.push(i);
            break;

          default:
            logSecurity('Unknown offline operation', 'low', {
              operation
            });
            processedOperations.push(i); // Remove unknown operations
        }
      } catch (error) {
        logError(LogCategory.SYSTEM, `[SupabaseService] Failed to process offline operation ${operation}:`, error instanceof Error ? error : new Error(String(error)));
      }
    }

    // Remove processed operations (in reverse order to maintain indices)
    for (let i = processedOperations.length - 1; i >= 0; i--) {
      this.offlineQueue.splice(processedOperations[i]!, 1);
    }

    // Save updated queue (a drop persists '[]' here, so loadOfflineQueue cannot restore it)
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(this.offlineQueue));
  }

  /**
   * Setup app state listener for background/foreground sync
   */
  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground, process offline queue + retry crisis telemetry.
        // The consent gate lives INSIDE processOfflineQueue (DEBUG-756), never here: the
        // crisis retry is vital-interest and runs whatever the consent state.
        void this.processOfflineQueue().catch((error) => {
          logSecurity('[SupabaseService] Failed to process offline queue:', 'medium', { error });
        });
        void this.flushCrisisAnalytics();
        // DEBUG-764: AFTER the crisis flush and separately guarded: a rejection or synchronous
        // throw from the backup-delete retry cannot escape this handler or precede the flush.
        try {
          void this.drainPendingBackupDelete().catch((error) => {
            logSecurity('[SupabaseService] Pending backup delete retry failed:', 'medium', { error });
          });
        } catch (error) {
          logSecurity('[SupabaseService] Pending backup delete retry threw:', 'medium', { error });
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // DEBUG-335: the ONLY point where the real-device kill window actually narrows.
        // iOS grants time on `background`, so re-issue the durable write before the OS
        // can reclaim the process. Everything else in this fix is JS-side bookkeeping —
        // no JS change can make a native AsyncStorage write commit sooner.
        void this.persistCrisisQueue();
      }
    });
  }

  /**
   * Get service status and statistics
   */
  getStatus(): {
    isInitialized: boolean;
    userId: string | null;
    circuitBreakerState: string;
    offlineQueueSize: number;
    analyticsQueueSize: number;
    lastSyncTime: string | null;
  } {
    return {
      isInitialized: this.isInitialized,
      userId: this.userId,
      circuitBreakerState: this.circuitBreaker.state,
      offlineQueueSize: this.offlineQueue.length,
      analyticsQueueSize: this.analyticsQueue.length,
      lastSyncTime: AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC) as any,
    };
  }

  /**
   * Get the underlying Supabase client for direct invocations like
   * `functions.invoke(...)`. Returns null if the service isn't initialized.
   * Most callers should use the dedicated public methods on this class
   * (saveBackup, getBackup, etc.); this escape hatch exists for cases like
   * edge-function invocations where the caller needs the client's session
   * JWT auto-attached.
   */
  getClient(): SupabaseClient | null {
    return this.client;
  }

  /**
   * DEBUG-715 — a client that carries a per-user session, for a caller that must act AS
   * the user (receipt verification), without bringing up anything else.
   *
   * Why it exists: `getClient()` returns null unless something else already built the
   * client, and that happens only on a crisis flush or a Cloud Backup visit — so receipt
   * verification failed for every other user (the old guard read `getStatus().userId`,
   * set by the same two paths).
   *
   * What it does: ensureClient({ mint }) — the one createClient site, single-flight
   * (DEBUG-409) — then, if no session was restored and `mint` is true, mints one through
   * the shared mint single-flight. Founder ruling 2026-10-04: a user-initiated purchase or
   * restore of a real transaction MAY create the anonymous identity. Only receipt
   * verification passes `mint: true`.
   *
   * What it never does: set `isInitialized`, start the analytics timer, load the offline
   * or crisis queues, flush, process the offline queue, start backup, read consent, or
   * pass through executeWithResilience / the shared circuit breaker. Backup and sync stay
   * behind MAINT-173's gate exactly as before; this provisions an identity, nothing more.
   *
   * During deleteAccount() it answers `no_session` and never mints (DEBUG-704: the
   * deletion path must never create the account it is erasing). Never throws.
   */
  async getAuthenticatedClient({ mint }: { mint: boolean }): Promise<AuthenticatedClientResult> {
    if (this.deletionsInFlight > 0) return { ok: false, reason: 'no_session' };
    try {
      await this.ensureClient({ mint });
    } catch {
      return { ok: false, reason: 'client_unavailable' };
    }
    const client = this.client;
    if (!client) return { ok: false, reason: 'client_unavailable' };

    // Also covers joining an in-flight mint:false construction, whose choice a joiner gets.
    if (!this.userId && mint && this.deletionsInFlight === 0) {
      await this.mintSessionOnce();
    }

    const userId = this.userId;
    if (!userId || this.deletionsInFlight > 0) return { ok: false, reason: 'no_session' };
    return { ok: true, client, userId };
  }

  /**
   * Data-subject right to erasure (INFRA-260 PR3; corrected DEBUG-704).
   *
   * Invokes the `delete-account` edge function, which (service-role) hard-deletes
   * the caller's auth.users row; the FK ON DELETE CASCADE removes every uid-keyed
   * row (encrypted_backups, analytics_events, subscriptions, subscription_events).
   *
   * Returns `true` ONLY when the server account is confirmed erased, or provably never
   * existed. Returns `false` for "unconfirmed" — the caller must NOT wipe local data,
   * and the session is kept so a retry can reach the server. The caller pairs `true`
   * with SecureStorageService.clearAllWellnessData({ deleteMasterKey: true }).
   *
   * DEBUG-704 — what decides "is there an account?" is the session auth-js PERSISTED,
   * not whether this run happened to build a client. The old fast path
   * (`!this.client || !this.userId → true`) reported erasure with no network call for
   * every account holder who deleted in a run that built no client, and never removed
   * the session, so the next client build restored the "deleted" uid.
   *
   *  1. Probe the Keychain strictly. Nothing persisted and nothing in memory → no
   *     account exists → `true`, with no client built and no session minted (DEBUG-409:
   *     an install that never crossed a threshold never opens a backend session). A
   *     probe that throws, or a session that is present but unidentifiable → `false`.
   *  2. Build/restore the client with `mint: false` — never `signInAnonymously` here; an
   *     offline, expired session would otherwise mint a NEW account and delete that.
   *  3. The live session must exist and belong to the persisted uid, else `false`.
   *  4. Invoke. On any failure, reconcile with `auth.getUser(<that access token>)`: ONLY
   *     an `AuthApiError` with code `user_not_found` for the caller's own sub counts as
   *     erased (a retry after a timed-out-but-successful erasure). Anything else → `false`.
   *  5. On confirmation, tear the session down without waiting on the network
   *     (`teardownErasedSession`).
   *
   * DEBUG-715: for the whole call getAuthenticatedClient() refuses to mint, and a mint
   * already in flight is awaited before step 1 so the probe sees the identity it creates.
   */
  async deleteAccount(): Promise<boolean> {
    // DEBUG-715: for the whole call, getAuthenticatedClient() refuses to mint. A counter, not
    // a boolean, so an overlapping second request cannot clear the first one's flag.
    this.deletionsInFlight += 1;
    try {
      // DEBUG-715: a mint already in flight would otherwise land AFTER the probe below
      // reported "no account", and the identity it creates would survive the erasure.
      // Waiting lets the probe see it, so it is erased with the rest. Never rejects.
      if (this.sessionMintInFlight) await this.sessionMintInFlight;

      let persisted: { present: boolean; uid: string | null };
      try {
        persisted = await readPersistedSession(supabaseAuthStorageKey(SUPABASE_URL));
      } catch (error) {
        logSecurity('[SupabaseService] Account deletion: session probe failed — unconfirmed', 'high', {
          error: error instanceof Error ? error.message : String(error),
        });
        return false;
      }

      if (!persisted.present && !this.userId) {
        // Nothing persisted and no session in memory: no server account exists to erase.
        return true;
      }
      if (persisted.present && !persisted.uid) {
        logSecurity('[SupabaseService] Account deletion: persisted session unreadable — unconfirmed', 'high');
        return false;
      }
      if (persisted.uid && this.userId && persisted.uid !== this.userId) {
        logSecurity('[SupabaseService] Account deletion: persisted and live identities differ — unconfirmed', 'high');
        return false;
      }
      const expectedUid = persisted.uid ?? this.userId;

      try {
        await this.ensureClient({ mint: false });
      } catch (error) {
        logSecurity('[SupabaseService] Account deletion: client unavailable — unconfirmed', 'high', {
          error: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
      const client = this.client;
      if (!client) return false;

      let accessToken: string;
      try {
        const { data, error } = await client.auth.getSession();
        const session = data?.session ?? null;
        if (error || !session?.access_token || session.user?.id !== expectedUid) {
          logSecurity('[SupabaseService] Account deletion: session not verifiable — unconfirmed', 'medium', {
            error: error ? error.message : session ? 'identity mismatch' : 'no session',
          });
          return false;
        }
        accessToken = session.access_token;
      } catch (error) {
        logSecurity('[SupabaseService] Account deletion: session check failed — unconfirmed', 'medium', {
          error: error instanceof Error ? error.message : String(error),
        });
        return false;
      }

      // Stop the background refresher for the duration, so it cannot rotate or re-persist
      // the session while it is being erased. Restarted below if erasure is unconfirmed.
      try {
        await client.auth.stopAutoRefresh();
      } catch {
        // Best-effort; a refresh racing the erasure fails once the user is gone.
      }

      let confirmed = false;
      try {
        // The session JWT is auto-attached; the function reads the gateway-verified `sub`
        // and deletes only that principal.
        const { data, error } = await client.functions.invoke<{ success?: boolean }>(
          'delete-account',
          { body: {} },
        );
        confirmed = !error && data?.success === true;
        if (!confirmed) {
          logError(
            LogCategory.SYSTEM,
            '[SupabaseService] Account deletion request failed — reconciling',
            error instanceof Error ? error : new Error(String(error ?? 'no success flag')),
          );
        }
      } catch (error) {
        logError(
          LogCategory.SYSTEM,
          '[SupabaseService] Account deletion request error — reconciling',
          error instanceof Error ? error : new Error(String(error)),
        );
      }

      if (!confirmed) {
        confirmed = await this.isAccountAlreadyErased(client, accessToken);
      }

      if (!confirmed) {
        try {
          await client.auth.startAutoRefresh();
        } catch {
          // Best-effort; getSession still refreshes an expired token on demand.
        }
        return false;
      }

      await this.teardownErasedSession(client);
      logSecurity('[SupabaseService] Account erased (server cascade confirmed, session removed)', 'low');
      return true;
    } finally {
      this.deletionsInFlight -= 1;
    }
  }

  /**
   * DEBUG-704 — convergent retry. After a request that erased the account but whose
   * reply was lost, the retry's `admin.deleteUser` finds no user and the function
   * answers 500. Ask GoTrue directly with the same access token: it looks the JWT's
   * `sub` up BEFORE the session and answers 403 `user_not_found` when it is gone
   * (supabase/auth `maybeLoadUserOrSession`). That, and only that, confirms erasure —
   * `bad_jwt`, `session_not_found`, a network failure or a live user are all unconfirmed.
   */
  private async isAccountAlreadyErased(client: SupabaseClient, accessToken: string): Promise<boolean> {
    try {
      const { data, error } = await client.auth.getUser(accessToken);
      if (error && isAuthApiError(error) && error.code === 'user_not_found') {
        logSecurity('[SupabaseService] Account deletion: user already erased (user_not_found)', 'low');
        return true;
      }
      logSecurity('[SupabaseService] Account deletion: erasure not confirmed', 'medium', {
        error: error ? (error.code ?? error.message) : data?.user ? 'user still exists' : 'no user',
      });
      return false;
    } catch (error) {
      logSecurity('[SupabaseService] Account deletion: reconciliation failed', 'medium', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * DEBUG-704 — make the erased identity unrecoverable on this device, without ever
   * waiting on the network.
   *
   * auth-js `signOut` returns `{ error }` on a transport failure and then SKIPS its own
   * session removal, so it cannot be the control. Instead:
   *  - `userId` is cleared and every crisis event queued under the erased identity is
   *    dropped, synchronously, before any await. Events enqueued after this point stay
   *    and flush under the fresh identity the next flush mints. The dirty flag is reset
   *    so a retry write cannot resurrect the dropped events; the disk copy is swept by
   *    the local wipe (`SWEPT_EXACT_KEYS`).
   *  - the persisted session is removed directly from the Keychain (one retry). If both
   *    attempts fail the server erasure still stands, so this still returns normally.
   *  - `signOut({ scope: 'local' })` runs fire-and-forget to clear auth-js's own state,
   *    after the removal, so it has no token to send. Never awaited.
   * The client object is kept: the next crisis flush finds no session and mints a new one.
   */
  private async teardownErasedSession(client: SupabaseClient): Promise<void> {
    this.userId = null;
    this.crisisAnalyticsQueue = [];
    this.crisisQueueEpoch += 1;
    this.crisisPersistDirty = false;

    const key = supabaseAuthStorageKey(SUPABASE_URL);
    try {
      await removePersistedSession(key);
    } catch {
      try {
        await removePersistedSession(key);
      } catch (error) {
        logSecurity('[SupabaseService] Erased session could not be removed from secure store', 'high', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    try {
      void client.auth.signOut({ scope: 'local' }).catch(() => {
        // The session is already removed above; a failed local sign-out changes nothing.
      });
    } catch {
      // A synchronous throw from signOut must not turn a confirmed erasure into a failure.
    }
  }

  /**
   * Cleanup service (call on app shutdown)
   */
  async cleanup(): Promise<void> {
    if (this.analyticsFlushTimer) {
      clearInterval(this.analyticsFlushTimer);
      this.analyticsFlushTimer = null;
    }

    // Flush remaining analytics
    await this.flushAnalytics();

    // Save offline queue
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(this.offlineQueue));
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();

// DEBUG-698: also covers deleteAccount()'s no-account early return, which tears nothing down.
registerErasureReset('supabaseService', () => supabaseService.resetOfflineQueueForErasure());

// DEBUG-764: delete the server backup on a cloud-backup consent withdrawal, and retry a pending
// delete once consent hydrates. Module scope, never the constructor; guarded because suites
// mock the store without `subscribe`, and a throw here would take down this module — and the
// crisis audit sink with it — at import. The listener never throws into the store's set().
try {
  if (typeof useConsentStore?.subscribe === 'function') {
    useConsentStore.subscribe((next, prev) => {
      try {
        if (isBackupConsentWithdrawal(prev, next)) {
          void supabaseService.requestBackupDeletion().catch((error) => {
            logSecurity('[SupabaseService] Backup delete on withdrawal failed', 'medium', { error });
          });
        } else if (isConsentHydration(prev, next)) {
          void supabaseService.drainPendingBackupDelete();
        }
      } catch (error) {
        logSecurity('[SupabaseService] Consent listener failed', 'medium', { error });
      }
    });
  }
} catch (error) {
  logSecurity('[SupabaseService] Consent subscription not installed', 'medium', { error });
}

export default supabaseService;