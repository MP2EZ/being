/**
 * Supabase Service - Anonymous Cloud Storage for Encrypted Backups
 *
 * LEGAL COMPLIANCE:
 * - Stores only encrypted blobs (no PHI)
 * - Anonymous users only (no PII)
 * - No BAA required (conduit exception)
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


import { logSecurity, logPerformance, logError, LogCategory } from '../logging';
import { generateTimestampedId, generateSessionId, generateRandomString } from '@/core/utils/id';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createSupabasePinnedFetch,
  validatePinningConfiguration,
} from '../security/pinned-fetch';
import { env } from '@/core/config/env';
import { useConsentStore } from '@/core/stores/consentStore';

// Environment configuration
const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
// The project's publishable (or legacy anon) key — whichever the new
// Supabase project hands out. supabase-js doesn't care which.
const SUPABASE_KEY = env.EXPO_PUBLIC_SUPABASE_KEY;

// Storage keys
const STORAGE_KEYS = {
  USER_ID: '@being/supabase/user_id',
  DEVICE_ID: '@being/supabase/device_id_hash',
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

// Anonymous user interface
interface AnonymousUser {
  id: string;
  device_id: string;
  created_at: string;
  last_sync?: string;
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
  private userId: string | null = null;
  private deviceIdHash: string | null = null;
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
   * Initialize Supabase service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Validate environment
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error('Supabase configuration missing. Check environment variables.');
      }

      // Validate SSL pinning configuration
      const pinningValidation = validatePinningConfiguration();
      if (!pinningValidation.valid) {
        logSecurity(
          '[SupabaseService] SSL pinning configuration issues detected',
          'high',
          { errors: pinningValidation.errors }
        );
      }

      // Create client with SSL certificate pinning
      // MAINT-68: All Supabase requests now use pinned fetch for MITM protection
      this.client = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          // Use pinned fetch for all requests
          // Data classification defaults to 'METADATA' - override per-request if needed
          fetch: createSupabasePinnedFetch('METADATA'),
        },
      });

      // Load or create anonymous user
      await this.ensureAnonymousUser();

      // Setup analytics flushing
      this.setupAnalyticsTimer();

      // Load offline queue
      await this.loadOfflineQueue();

      // INFRA-214 T3: load any crisis-detection telemetry enqueued before this run
      // (or before a user was provisioned) and reconcile/flush it now that userId exists.
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
   * Get or create anonymous user
   */
  private async ensureAnonymousUser(): Promise<void> {
    try {
      // Try to load existing user
      const savedUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      const savedDeviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);

      if (savedUserId && savedDeviceId) {
        this.userId = savedUserId;
        this.deviceIdHash = savedDeviceId;
        return;
      }

      // Generate device ID hash
      this.deviceIdHash = await this.generateDeviceIdHash();

      // Check if user exists in database
      const { data: existingUser } = await this.client!
        .from('users')
        .select('*')
        .eq('device_id', this.deviceIdHash)
        .single();

      if (existingUser) {
        this.userId = existingUser.id;
      } else {
        // Create new anonymous user
        const { data: newUser, error } = await this.client!
          .from('users')
          .insert({
            device_id: this.deviceIdHash,
          })
          .select()
          .single();

        if (error) throw error;
        this.userId = newUser.id;
      }

      // Save to local storage
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, this.userId!);
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, this.deviceIdHash);

    } catch (error) {
      logError(LogCategory.SYSTEM, '[SupabaseService] Failed to ensure anonymous user:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Generate device ID hash for privacy
   */
  private async generateDeviceIdHash(): Promise<string> {
    // Use expo-crypto to get a device-specific value
    const deviceIdBase = await AsyncStorage.getItem('@being/device_id') ||
                        generateTimestampedId('device');

    // Save device ID if it doesn't exist
    await AsyncStorage.setItem('@being/device_id', deviceIdBase);

    // Hash it for privacy
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      deviceIdBase
    );
  }

  /**
   * Generate session ID (rotated daily for privacy)
   */
  private generateSessionId(): string {
    const today = new Date().toISOString().split('T')[0];
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
    operationName: string
  ): Promise<{ success: boolean; data?: T; error?: Error }> {
    if (!this.canAttemptOperation()) {
      return {
        success: false,
        error: new Error(`Circuit breaker open for ${operationName}`)
      };
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await operation();
        this.recordOperationResult(true);
        return { success: true, data: result };

      } catch (error) {
        lastError = error as Error;
        logSecurity(`[SupabaseService] ${operationName} attempt ${attempt} failed:`, 'medium', { error });

        if (attempt < this.config.retryAttempts) {
          await this.sleep(this.config.retryDelayMs * attempt);
        }
      }
    }

    this.recordOperationResult(false);
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
      return await this.client!
        .from('encrypted_backups')
        .upsert({
          user_id: this.userId,
          encrypted_data: encryptedData,
          checksum,
          version,
        });
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
      return await this.client!
        .from('analytics_events')
        .insert(eventsToFlush);
    }, 'flushAnalytics');

    if (!result.success) {
      logError(LogCategory.SYSTEM, '[SupabaseService] Analytics flush failed:', result.error instanceof Error ? result.error : new Error(String(result.error)));
      // Put events back in queue (with size limit)
      this.analyticsQueue = eventsToFlush.concat(this.analyticsQueue)
        .slice(0, this.config.offlineQueueSize);
    }
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
          severity_bucket: String(telemetry.severity_bucket),
          intervention_surfaced: Boolean(telemetry.intervention_surfaced),
          assessment_type: String(telemetry.assessment_type),
        },
        session_id: this.sessionId,
        enqueued_at: Date.now(),
      });
      // Durable persist immediately (own key — never evicted by the ops queue).
      void AsyncStorage.setItem(
        STORAGE_KEYS.CRISIS_ANALYTICS_QUEUE,
        JSON.stringify(this.crisisAnalyticsQueue)
      );
      // Best-effort flush now; never awaited, never throws out of here.
      void this.flushCrisisAnalytics();
    } catch (error) {
      // Telemetry must never affect the crisis flow. Record locally so a future
      // dashboard gap is explainable from on-device records.
      logSecurity('[SupabaseService] crisis telemetry enqueue failed', 'medium', { error });
    }
  }

  /**
   * Reconcile + flush durably-queued crisis-detection telemetry to analytics_events.
   * user_id is resolved at flush time; if not yet provisioned (first-run/offline) or
   * the client is unavailable, the events stay durably queued for a later attempt.
   */
  private async flushCrisisAnalytics(): Promise<void> {
    if (this.crisisAnalyticsQueue.length === 0) return;
    if (!this.client || !this.userId) return; // reconcile on a later flush

    const pending = [...this.crisisAnalyticsQueue];
    const rows: AnalyticsEvent[] = pending.map((e) => ({
      user_id: this.userId!,
      event_type: e.event_type,
      properties: e.properties,
      session_id: e.session_id,
    }));

    const result = await this.executeWithResilience(async () => {
      const resp: any = await this.client!.from('analytics_events').insert(rows);
      // executeWithResilience keys success off throwing, so surface a Supabase
      // error response as a retryable failure rather than a false success.
      if (resp?.error) throw resp.error;
      return resp;
    }, 'flushCrisisAnalytics');

    if (result.success) {
      // Drop the flushed prefix; keep anything enqueued during the flight.
      this.crisisAnalyticsQueue = this.crisisAnalyticsQueue.slice(pending.length);
      await AsyncStorage.setItem(
        STORAGE_KEYS.CRISIS_ANALYTICS_QUEUE,
        JSON.stringify(this.crisisAnalyticsQueue)
      );
    } else {
      // Retained for retry. Escalate to the local audit/security log so the gap is visible.
      logSecurity(
        '[SupabaseService] crisis telemetry flush failed — retained for retry',
        'medium',
        { pending: pending.length }
      );
    }
  }

  /**
   * Load durably-persisted crisis-detection telemetry on startup.
   */
  private async loadCrisisAnalyticsQueue(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CRISIS_ANALYTICS_QUEUE);
      if (data) {
        this.crisisAnalyticsQueue = JSON.parse(data);
      }
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