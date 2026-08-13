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
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createSupabasePinnedFetch,
  validatePinningConfiguration,
} from '../security/pinned-fetch';
import { createSecureStoreSessionAdapter } from './secureStoreSessionAdapter';
import { env } from '@/core/config/env';
import { useConsentStore } from '@/core/stores/consentStore';

// Environment configuration
const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
// The project's publishable (or legacy anon) key — whichever the new
// Supabase project hands out. supabase-js doesn't care which.
const SUPABASE_KEY = env.EXPO_PUBLIC_SUPABASE_KEY;

// Storage keys.
// INFRA-260: USER_ID / DEVICE_ID identity keys removed — identity is now the
// Supabase anonymous session (persisted in expo-secure-store via the chunking
// adapter), not a device-hash row id cached in AsyncStorage.
const STORAGE_KEYS = {
  LAST_SYNC: '@being/supabase/last_sync',
  OFFLINE_QUEUE: '@being/supabase/offline_queue',
  CRISIS_ANALYTICS_QUEUE: '@being/supabase/crisis_analytics_queue',
} as const;

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

// Service configuration
interface SupabaseServiceConfig {
  circuitBreaker: CircuitBreakerConfig;
  retryAttempts: number;
  retryDelayMs: number;
  offlineQueueSize: number;
  analyticsFlushSize: number;
  analyticsFlushIntervalMs: number;
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
  private sessionId: string;
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
    this.sessionId = this.generateSessionId();
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
   */
  private async ensureClient(): Promise<void> {
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
      await this.ensureAnonymousSession();
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
   * true rather than merely asserted: `processOfflineQueue` stays gated, backups stay
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
   */
  private async ensureAnonymousSession(): Promise<void> {
    try {
      const { data: existing } = await this.client!.auth.getSession();
      let user = existing.session?.user ?? null;

      if (!user) {
        const { data, error } = await this.client!.auth.signInAnonymously();
        if (error) throw error;
        user = data.user ?? null;
      }

      this.userId = user?.id ?? null;
      if (this.userId) {
        logSecurity('[SupabaseService] Anonymous session established', 'low');
      }
    } catch (error) {
      // Non-fatal: degrade to offline queues; a later flush retries the session.
      this.userId = null;
      logSecurity('[SupabaseService] Anonymous session not yet established (will retry)', 'medium', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate session ID (rotated daily for privacy)
   */
  private generateSessionId(): string {
    return generateSessionId();
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
      session_id: this.sessionId,
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
        session_id: this.sessionId,
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
      if (!this.userId) {
        await this.ensureAnonymousSession();
        if (!this.userId) return;
      }

      const pending = [...this.crisisAnalyticsQueue];
      const rows: AnalyticsEvent[] = pending.map((e) => ({
        user_id: this.userId!,
        event_type: e.event_type,
        properties: e.properties,
        session_id: e.session_id,
      }));

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
        // Drop the flushed prefix; keep anything enqueued during the flight.
        this.crisisAnalyticsQueue = this.crisisAnalyticsQueue.slice(pending.length);
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

      // Normal boot: nothing in memory yet, so adopt what is on disk.
      if (this.crisisAnalyticsQueue.length === 0) {
        this.crisisAnalyticsQueue = persisted;
        return;
      }

      // DEBUG-335: `initialize()` is lazy (it runs on Cloud Backup, not at boot), so a
      // detection can fire BEFORE this load. A blind assign would drop that live event
      // from the sole crisis audit sink. Merge instead, de-duplicating on a composite
      // identity so a repeated load cannot double-count, and keeping disk entries first
      // to preserve chronology.
      const identity = (e: any): string =>
        `${e?.session_id}|${e?.enqueued_at}|${e?.event_type}|${JSON.stringify(e?.properties)}`;
      const inMemory = new Set(this.crisisAnalyticsQueue.map(identity));
      const recovered = persisted.filter((e: any) => !inMemory.has(identity(e)));
      if (recovered.length === 0) return;

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
   * Process offline queue when connectivity is restored
   */
  async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0 || !this.isInitialized) return;

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

    // Save updated queue
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(this.offlineQueue));
  }

  /**
   * Setup app state listener for background/foreground sync
   */
  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground, process offline queue + retry crisis telemetry
        this.processOfflineQueue();
        void this.flushCrisisAnalytics();
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
   * Data-subject right to erasure (INFRA-260 PR3): delete the server-side account.
   *
   * Invokes the `delete-account` edge function, which (service-role) hard-deletes
   * the caller's auth.users row; the FK ON DELETE CASCADE removes every uid-keyed
   * row (encrypted_backups, analytics_events, subscriptions, subscription_events).
   * On success the local session is torn down so the next boot mints a fresh
   * anonymous identity rather than reusing a deleted uid.
   *
   * Returns true if the server account was erased (or there was none to erase).
   * Returns false on failure WITHOUT tearing down the session — the caller must
   * NOT proceed to wipe local data if the server copy still exists. The caller
   * pairs a true result with SecureStorageService.clearAllWellnessData({
   * deleteMasterKey: true }) for the on-device half of erasure.
   */
  async deleteAccount(): Promise<boolean> {
    // No established session → no server-side account exists to erase.
    if (!this.client || !this.userId) {
      return true;
    }

    try {
      // The client's session JWT is auto-attached; the function reads auth.uid()
      // from it and deletes only that principal.
      const { data, error } = await this.client.functions.invoke<{ success?: boolean }>(
        'delete-account',
        { body: {} },
      );
      if (error || !data?.success) {
        logError(
          LogCategory.SYSTEM,
          '[SupabaseService] Account deletion failed',
          error instanceof Error ? error : new Error(String(error ?? 'no success flag')),
        );
        return false;
      }

      // Server data gone — clear the local session (removes the secure-store
      // session chunks) so we don't reuse the now-deleted uid.
      await this.client.auth.signOut();
      this.userId = null;
      logSecurity('[SupabaseService] Account erased (server cascade + session cleared)', 'low');
      return true;
    } catch (error) {
      logError(
        LogCategory.SYSTEM,
        '[SupabaseService] Account deletion error',
        error instanceof Error ? error : new Error(String(error)),
      );
      return false;
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
export default supabaseService;