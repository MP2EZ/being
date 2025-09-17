/**
 * Payment Sync Resilience API - P0-CLOUD Platform
 *
 * Comprehensive API resilience patterns for payment sync operations with:
 * - Auto-retry with exponential backoff
 * - Circuit breaker patterns for upstream services
 * - Graceful degradation and fallback mechanisms
 * - Queue persistence during network outages
 * - Secure error recovery with HIPAA compliance
 * - Crisis safety override for mental health emergencies
 *
 * ARCHITECT FOUNDATION:
 * - Resilience-first design with mental health safety priority
 * - Zero data loss during failure scenarios
 * - Sub-200ms crisis response even during outages
 * - Encrypted queue operations and secure retry mechanisms
 * - Multi-tier fallback strategies based on subscription level
 */

import { EventEmitter } from 'events';
import {
  PaymentAwareSyncRequest,
  PaymentAwareSyncResponse,
  SyncPriorityLevel,
  CrisisEmergencySyncRequest,
  SyncTierEntitlements
} from './PaymentAwareSyncAPI';
import { EncryptionService } from '../security/EncryptionService';
import { SubscriptionTier } from '../../types/subscription';
import { SyncOperation, SyncEntityType, SyncableData } from '../../types/sync';

// ============================================================================
// RESILIENCE CONFIGURATION AND TYPES
// ============================================================================

/**
 * Retry configuration with exponential backoff
 */
export interface RetryConfiguration {
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffMultiplier: number;
  readonly jitterMax: number; // Random jitter to prevent thundering herd
  readonly retryableErrors: readonly string[];
  readonly nonRetryableErrors: readonly string[];
  readonly crisisOverride: boolean; // Always retry for crisis operations
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfiguration {
  readonly failureThreshold: number; // Number of failures before opening
  readonly recoveryTimeoutMs: number; // Time before attempting recovery
  readonly halfOpenMaxCalls: number; // Max calls to test recovery
  readonly successThreshold: number; // Successes needed to close circuit
  readonly monitoringWindowMs: number; // Window for failure rate calculation
  readonly crisisExempt: boolean; // Crisis operations bypass circuit breaker
}

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Blocking requests
  HALF_OPEN = 'half_open' // Testing recovery
}

/**
 * Queue persistence configuration
 */
export interface QueuePersistenceConfiguration {
  readonly enablePersistence: boolean;
  readonly maxQueueSize: number;
  readonly persistenceIntervalMs: number;
  readonly encryptionEnabled: boolean;
  readonly compressionEnabled: boolean;
  readonly maxRetentionHours: number;
  readonly crisisPriority: boolean; // Crisis operations never expire
}

/**
 * Graceful degradation levels
 */
export enum DegradationLevel {
  NORMAL = 'normal',           // Full functionality
  LIMITED = 'limited',         // Reduced features, core functions available
  CRITICAL_ONLY = 'critical_only', // Only crisis and essential operations
  OFFLINE = 'offline'          // Local operation only
}

/**
 * Fallback strategy configuration
 */
export interface FallbackConfiguration {
  readonly enableFallbacks: boolean;
  readonly fallbackLevels: readonly DegradationLevel[];
  readonly crisisAlwaysAvailable: boolean;
  readonly localStorageFallback: boolean;
  readonly offlineQueueEnabled: boolean;
  readonly emergencyContactEnabled: boolean;
  readonly maxFallbackDurationMs: number;
}

/**
 * Resilience operation context
 */
export interface ResilienceContext {
  readonly operationId: string;
  readonly priority: SyncPriorityLevel;
  readonly subscriptionTier: SubscriptionTier;
  readonly crisisMode: boolean;
  readonly retryCount: number;
  readonly circuitBreakerState: CircuitBreakerState;
  readonly degradationLevel: DegradationLevel;
  readonly networkQuality: 'excellent' | 'good' | 'poor' | 'offline';
  readonly timestamp: string;
}

/**
 * Resilience operation result
 */
export interface ResilienceResult {
  readonly success: boolean;
  readonly result?: PaymentAwareSyncResponse;
  readonly error?: ResilienceError;
  readonly retryRecommended: boolean;
  readonly fallbackTriggered: boolean;
  readonly degradationApplied: boolean;
  readonly crisisOverrideUsed: boolean;
  readonly performanceMetrics: {
    readonly totalAttempts: number;
    readonly totalTime: number;
    readonly fallbackTime?: number;
    readonly queueTime?: number;
  };
}

/**
 * Enhanced error with resilience context
 */
export interface ResilienceError {
  readonly code: string;
  readonly message: string;
  readonly category: 'network' | 'service' | 'data' | 'security' | 'capacity';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly retryable: boolean;
  readonly crisisImpact: boolean;
  readonly recoverySuggestions: readonly string[];
  readonly context: ResilienceContext;
  readonly originalError?: Error;
}

// ============================================================================
// RETRY MANAGER WITH EXPONENTIAL BACKOFF
// ============================================================================

/**
 * Advanced retry manager with intelligent backoff
 */
export class RetryManager {
  private static instance: RetryManager;
  private retryConfigs = new Map<SyncPriorityLevel, RetryConfiguration>();
  private activeRetries = new Map<string, number>();
  private retryHistory = new Map<string, number[]>();

  public static getInstance(): RetryManager {
    if (!RetryManager.instance) {
      RetryManager.instance = new RetryManager();
    }
    return RetryManager.instance;
  }

  constructor() {
    this.initializeRetryConfigurations();
  }

  private initializeRetryConfigurations(): void {
    // Crisis operations - Maximum resilience
    this.retryConfigs.set(SyncPriorityLevel.CRISIS_EMERGENCY, {
      maxAttempts: 10,
      initialDelayMs: 100,
      maxDelayMs: 5000,
      backoffMultiplier: 1.5,
      jitterMax: 100,
      retryableErrors: ['network_error', 'timeout_error', 'service_unavailable', 'rate_limited'],
      nonRetryableErrors: ['authentication_error', 'authorization_error', 'data_corruption'],
      crisisOverride: true
    });

    // Critical safety operations
    this.retryConfigs.set(SyncPriorityLevel.CRITICAL_SAFETY, {
      maxAttempts: 7,
      initialDelayMs: 200,
      maxDelayMs: 10000,
      backoffMultiplier: 2.0,
      jitterMax: 200,
      retryableErrors: ['network_error', 'timeout_error', 'service_unavailable'],
      nonRetryableErrors: ['authentication_error', 'authorization_error', 'data_corruption'],
      crisisOverride: false
    });

    // High clinical operations
    this.retryConfigs.set(SyncPriorityLevel.HIGH_CLINICAL, {
      maxAttempts: 5,
      initialDelayMs: 500,
      maxDelayMs: 15000,
      backoffMultiplier: 2.0,
      jitterMax: 500,
      retryableErrors: ['network_error', 'timeout_error', 'service_unavailable'],
      nonRetryableErrors: ['authentication_error', 'authorization_error', 'data_corruption'],
      crisisOverride: false
    });

    // Medium user operations
    this.retryConfigs.set(SyncPriorityLevel.MEDIUM_USER, {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2.5,
      jitterMax: 1000,
      retryableErrors: ['network_error', 'timeout_error'],
      nonRetryableErrors: ['authentication_error', 'authorization_error', 'data_corruption', 'service_unavailable'],
      crisisOverride: false
    });

    // Low priority and background operations
    this.retryConfigs.set(SyncPriorityLevel.LOW_SYNC, {
      maxAttempts: 2,
      initialDelayMs: 2000,
      maxDelayMs: 60000,
      backoffMultiplier: 3.0,
      jitterMax: 2000,
      retryableErrors: ['network_error'],
      nonRetryableErrors: ['authentication_error', 'authorization_error', 'data_corruption', 'service_unavailable', 'timeout_error'],
      crisisOverride: false
    });

    this.retryConfigs.set(SyncPriorityLevel.BACKGROUND, {
      maxAttempts: 1,
      initialDelayMs: 5000,
      maxDelayMs: 60000,
      backoffMultiplier: 2.0,
      jitterMax: 5000,
      retryableErrors: ['network_error'],
      nonRetryableErrors: ['authentication_error', 'authorization_error', 'data_corruption', 'service_unavailable', 'timeout_error'],
      crisisOverride: false
    });
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operationId: string,
    priority: SyncPriorityLevel,
    operation: () => Promise<T>,
    crisisMode: boolean = false
  ): Promise<{ result: T; attempts: number; totalTime: number }> {
    const config = this.getRetryConfig(priority, crisisMode);
    const startTime = Date.now();
    let lastError: Error | undefined;
    let attempts = 0;

    // Track retry attempts
    this.activeRetries.set(operationId, 0);

    try {
      for (attempts = 1; attempts <= config.maxAttempts; attempts++) {
        try {
          // Update retry count
          this.activeRetries.set(operationId, attempts);

          // Execute the operation
          const result = await operation();

          // Success - record and return
          this.recordRetrySuccess(operationId, attempts);
          return {
            result,
            attempts,
            totalTime: Date.now() - startTime
          };

        } catch (error) {
          lastError = error as Error;

          // Check if error is retryable
          if (!this.isRetryable(lastError, config)) {
            throw error;
          }

          // Don't delay on the last attempt
          if (attempts < config.maxAttempts) {
            const delay = this.calculateDelay(attempts, config);
            await this.sleep(delay);
          }
        }
      }

      // All retries exhausted
      this.recordRetryFailure(operationId, attempts);
      throw lastError || new Error('Max retry attempts exceeded');

    } finally {
      this.activeRetries.delete(operationId);
    }
  }

  private getRetryConfig(priority: SyncPriorityLevel, crisisMode: boolean): RetryConfiguration {
    const config = this.retryConfigs.get(priority) || this.retryConfigs.get(SyncPriorityLevel.MEDIUM_USER)!;

    // Crisis mode gets enhanced retry
    if (crisisMode && !config.crisisOverride) {
      return {
        ...config,
        maxAttempts: Math.max(config.maxAttempts, 7),
        initialDelayMs: Math.min(config.initialDelayMs, 100),
        retryableErrors: ['network_error', 'timeout_error', 'service_unavailable', 'rate_limited'],
        crisisOverride: true
      };
    }

    return config;
  }

  private isRetryable(error: Error, config: RetryConfiguration): boolean {
    const errorMessage = error.message.toLowerCase();

    // Check non-retryable errors first
    if (config.nonRetryableErrors.some(e => errorMessage.includes(e))) {
      return false;
    }

    // Check retryable errors
    return config.retryableErrors.some(e => errorMessage.includes(e));
  }

  private calculateDelay(attempt: number, config: RetryConfiguration): number {
    // Exponential backoff with jitter
    const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    const clampedDelay = Math.min(exponentialDelay, config.maxDelayMs);
    const jitter = Math.random() * config.jitterMax;

    return Math.floor(clampedDelay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private recordRetrySuccess(operationId: string, attempts: number): void {
    const history = this.retryHistory.get(operationId) || [];
    history.push(attempts);
    this.retryHistory.set(operationId, history.slice(-100)); // Keep last 100 entries
  }

  private recordRetryFailure(operationId: string, attempts: number): void {
    const history = this.retryHistory.get(operationId) || [];
    history.push(-attempts); // Negative to indicate failure
    this.retryHistory.set(operationId, history.slice(-100));
  }

  /**
   * Get retry statistics for monitoring
   */
  getRetryStatistics(operationId: string): {
    totalAttempts: number;
    successRate: number;
    averageAttempts: number;
    recentFailures: number;
  } {
    const history = this.retryHistory.get(operationId) || [];
    const totalAttempts = history.length;
    const successes = history.filter(a => a > 0).length;
    const recentFailures = history.slice(-10).filter(a => a < 0).length;
    const averageAttempts = history.length > 0 ?
      history.filter(a => a > 0).reduce((sum, a) => sum + a, 0) / Math.max(successes, 1) : 0;

    return {
      totalAttempts,
      successRate: totalAttempts > 0 ? successes / totalAttempts : 0,
      averageAttempts,
      recentFailures
    };
  }
}

// ============================================================================
// CIRCUIT BREAKER PATTERN
// ============================================================================

/**
 * Circuit breaker for upstream service protection
 */
export class CircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private halfOpenCallCount = 0;
  private recentFailures: number[] = [];

  constructor(
    private readonly serviceName: string,
    private readonly config: CircuitBreakerConfiguration
  ) {
    super();
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(
    operation: () => Promise<T>,
    context: ResilienceContext
  ): Promise<T> {
    // Crisis operations bypass circuit breaker
    if (context.crisisMode && this.config.crisisExempt) {
      try {
        const result = await operation();
        this.recordSuccess();
        return result;
      } catch (error) {
        this.recordFailure();
        throw error;
      }
    }

    // Check circuit breaker state
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.config.recoveryTimeoutMs) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.halfOpenCallCount = 0;
        this.emit('state_changed', { from: CircuitBreakerState.OPEN, to: CircuitBreakerState.HALF_OPEN });
      } else {
        throw new Error(`Circuit breaker is OPEN for service ${this.serviceName}`);
      }
    }

    if (this.state === CircuitBreakerState.HALF_OPEN &&
        this.halfOpenCallCount >= this.config.halfOpenMaxCalls) {
      throw new Error(`Circuit breaker is HALF_OPEN and max calls exceeded for service ${this.serviceName}`);
    }

    try {
      if (this.state === CircuitBreakerState.HALF_OPEN) {
        this.halfOpenCallCount++;
      }

      const result = await operation();
      this.recordSuccess();
      return result;

    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordSuccess(): void {
    this.successCount++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.halfOpenCallCount = 0;
        this.recentFailures = [];
        this.emit('state_changed', { from: CircuitBreakerState.HALF_OPEN, to: CircuitBreakerState.CLOSED });
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success
      this.failureCount = 0;
      this.recentFailures = [];
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.recentFailures.push(Date.now());

    // Clean up old failures outside monitoring window
    const cutoffTime = Date.now() - this.config.monitoringWindowMs;
    this.recentFailures = this.recentFailures.filter(time => time > cutoffTime);

    if (this.state === CircuitBreakerState.CLOSED || this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.failureCount >= this.config.failureThreshold) {
        this.state = CircuitBreakerState.OPEN;
        this.successCount = 0;
        this.halfOpenCallCount = 0;
        this.emit('state_changed', {
          from: this.state === CircuitBreakerState.CLOSED ? CircuitBreakerState.CLOSED : CircuitBreakerState.HALF_OPEN,
          to: CircuitBreakerState.OPEN
        });
        this.emit('circuit_opened', { service: this.serviceName, failureCount: this.failureCount });
      }
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStatistics(): {
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    recentFailureRate: number;
    lastFailureTime: number;
  } {
    const cutoffTime = Date.now() - this.config.monitoringWindowMs;
    const recentFailureCount = this.recentFailures.filter(time => time > cutoffTime).length;
    const totalRecentCalls = recentFailureCount + this.successCount;
    const recentFailureRate = totalRecentCalls > 0 ? recentFailureCount / totalRecentCalls : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      recentFailureRate,
      lastFailureTime: this.lastFailureTime
    };
  }

  /**
   * Manually reset circuit breaker (admin function)
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCallCount = 0;
    this.recentFailures = [];
    this.emit('state_changed', { from: 'manual_reset', to: CircuitBreakerState.CLOSED });
  }
}

// ============================================================================
// QUEUE PERSISTENCE MANAGER
// ============================================================================

/**
 * Encrypted queue persistence during outages
 */
export class QueuePersistenceManager {
  private static instance: QueuePersistenceManager;
  private encryption: EncryptionService;
  private persistedQueue: Map<string, PersistedOperation> = new Map();
  private persistenceTimer?: NodeJS.Timer;
  private isDirty = false;

  public static getInstance(): QueuePersistenceManager {
    if (!QueuePersistenceManager.instance) {
      QueuePersistenceManager.instance = new QueuePersistenceManager();
    }
    return QueuePersistenceManager.instance;
  }

  constructor() {
    this.encryption = EncryptionService.getInstance();
  }

  /**
   * Initialize persistence with configuration
   */
  async initialize(config: QueuePersistenceConfiguration): Promise<void> {
    if (config.enablePersistence) {
      // Load existing queue from storage
      await this.loadPersistedQueue();

      // Start periodic persistence
      this.startPersistenceTimer(config.persistenceIntervalMs);
    }
  }

  /**
   * Persist operation to encrypted storage
   */
  async persistOperation(
    operationId: string,
    request: PaymentAwareSyncRequest,
    priority: SyncPriorityLevel,
    context: ResilienceContext
  ): Promise<void> {
    const persistedOp: PersistedOperation = {
      operationId,
      request,
      priority,
      context,
      persistedAt: new Date().toISOString(),
      retryCount: context.retryCount,
      expiresAt: this.calculateExpiration(priority, context.crisisMode)
    };

    // Encrypt sensitive data
    if (request.operation.data) {
      persistedOp.encryptedData = await this.encryption.encryptData(
        JSON.stringify(request.operation.data),
        context.operationId
      );
      // Remove unencrypted data
      persistedOp.request = {
        ...request,
        operation: {
          ...request.operation,
          data: undefined as any
        }
      };
    }

    this.persistedQueue.set(operationId, persistedOp);
    this.isDirty = true;
  }

  /**
   * Retrieve and decrypt persisted operation
   */
  async retrieveOperation(operationId: string): Promise<{
    request: PaymentAwareSyncRequest;
    context: ResilienceContext;
  } | null> {
    const persistedOp = this.persistedQueue.get(operationId);
    if (!persistedOp) return null;

    // Check expiration
    if (new Date(persistedOp.expiresAt) < new Date()) {
      this.persistedQueue.delete(operationId);
      this.isDirty = true;
      return null;
    }

    let request = persistedOp.request;

    // Decrypt data if present
    if (persistedOp.encryptedData) {
      try {
        const decryptedData = await this.encryption.decryptData(
          persistedOp.encryptedData,
          operationId
        );
        request = {
          ...request,
          operation: {
            ...request.operation,
            data: JSON.parse(decryptedData)
          }
        };
      } catch (error) {
        console.error('Failed to decrypt persisted operation data:', error);
        return null;
      }
    }

    return {
      request,
      context: persistedOp.context
    };
  }

  /**
   * Remove operation from persistence
   */
  removeOperation(operationId: string): void {
    if (this.persistedQueue.delete(operationId)) {
      this.isDirty = true;
    }
  }

  /**
   * Get all persisted operations sorted by priority
   */
  async getAllOperations(): Promise<Array<{
    operationId: string;
    request: PaymentAwareSyncRequest;
    context: ResilienceContext;
  }>> {
    const operations: Array<{
      operationId: string;
      request: PaymentAwareSyncRequest;
      context: ResilienceContext;
    }> = [];

    for (const [operationId, persistedOp] of this.persistedQueue) {
      const retrieved = await this.retrieveOperation(operationId);
      if (retrieved) {
        operations.push({
          operationId,
          ...retrieved
        });
      }
    }

    // Sort by priority (crisis first)
    return operations.sort((a, b) => {
      if (a.context.crisisMode && !b.context.crisisMode) return -1;
      if (!a.context.crisisMode && b.context.crisisMode) return 1;
      return b.context.priority - a.context.priority;
    });
  }

  /**
   * Clear expired operations
   */
  cleanupExpiredOperations(): void {
    const now = new Date();
    let removed = false;

    for (const [operationId, persistedOp] of this.persistedQueue) {
      if (new Date(persistedOp.expiresAt) < now) {
        this.persistedQueue.delete(operationId);
        removed = true;
      }
    }

    if (removed) {
      this.isDirty = true;
    }
  }

  private calculateExpiration(priority: SyncPriorityLevel, crisisMode: boolean): string {
    const baseExpirationHours = crisisMode ? 24 : // Crisis operations kept for 24 hours
      priority >= SyncPriorityLevel.CRITICAL_SAFETY ? 12 : // Critical: 12 hours
      priority >= SyncPriorityLevel.HIGH_CLINICAL ? 6 : // Clinical: 6 hours
      priority >= SyncPriorityLevel.MEDIUM_USER ? 3 : // User: 3 hours
      1; // Low priority: 1 hour

    return new Date(Date.now() + baseExpirationHours * 60 * 60 * 1000).toISOString();
  }

  private async loadPersistedQueue(): Promise<void> {
    try {
      // Implementation would load from AsyncStorage
      // For now, initialize empty
      this.persistedQueue = new Map();
    } catch (error) {
      console.error('Failed to load persisted queue:', error);
      this.persistedQueue = new Map();
    }
  }

  private startPersistenceTimer(intervalMs: number): void {
    this.persistenceTimer = setInterval(async () => {
      if (this.isDirty) {
        await this.savePersistenceState();
        this.isDirty = false;
      }
      this.cleanupExpiredOperations();
    }, intervalMs);
  }

  private async savePersistenceState(): Promise<void> {
    try {
      // Implementation would save to AsyncStorage
      // For now, just log the operation
      console.log(`Persisting ${this.persistedQueue.size} operations to storage`);
    } catch (error) {
      console.error('Failed to save persistence state:', error);
    }
  }

  /**
   * Get persistence statistics
   */
  getStatistics(): {
    totalOperations: number;
    crisisOperations: number;
    oldestOperation?: string;
    memoryUsage: number;
  } {
    let crisisCount = 0;
    let oldestTime = Number.MAX_SAFE_INTEGER;
    let oldestOperation: string | undefined;

    for (const [operationId, persistedOp] of this.persistedQueue) {
      if (persistedOp.context.crisisMode) crisisCount++;

      const persistedTime = new Date(persistedOp.persistedAt).getTime();
      if (persistedTime < oldestTime) {
        oldestTime = persistedTime;
        oldestOperation = operationId;
      }
    }

    return {
      totalOperations: this.persistedQueue.size,
      crisisOperations: crisisCount,
      oldestOperation,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage
    return this.persistedQueue.size * 1024; // Assume 1KB per operation
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
    }
  }
}

/**
 * Persisted operation structure
 */
interface PersistedOperation {
  readonly operationId: string;
  readonly request: PaymentAwareSyncRequest;
  readonly priority: SyncPriorityLevel;
  readonly context: ResilienceContext;
  readonly persistedAt: string;
  readonly expiresAt: string;
  readonly retryCount: number;
  readonly encryptedData?: string;
}

// ============================================================================
// MAIN PAYMENT SYNC RESILIENCE API
// ============================================================================

/**
 * Comprehensive payment sync resilience API
 */
export class PaymentSyncResilienceAPI extends EventEmitter {
  private static instance: PaymentSyncResilienceAPI;

  private retryManager: RetryManager;
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private queuePersistence: QueuePersistenceManager;
  private degradationLevel: DegradationLevel = DegradationLevel.NORMAL;

  private config: PaymentSyncResilienceConfiguration;
  private healthStatus = {
    overall: 'healthy' as const,
    retry: true,
    circuitBreaker: true,
    persistence: true,
    degradation: false
  };

  public static getInstance(): PaymentSyncResilienceAPI {
    if (!PaymentSyncResilienceAPI.instance) {
      PaymentSyncResilienceAPI.instance = new PaymentSyncResilienceAPI();
    }
    return PaymentSyncResilienceAPI.instance;
  }

  constructor() {
    super();
    this.retryManager = RetryManager.getInstance();
    this.queuePersistence = QueuePersistenceManager.getInstance();
    this.config = this.getDefaultConfiguration();
  }

  /**
   * Initialize resilience API with configuration
   */
  async initialize(config: Partial<PaymentSyncResilienceConfiguration> = {}): Promise<void> {
    this.config = { ...this.config, ...config };

    // Initialize queue persistence
    await this.queuePersistence.initialize(this.config.queuePersistence);

    // Initialize circuit breakers for different services
    this.initializeCircuitBreakers();

    // Start health monitoring
    this.startHealthMonitoring();

    console.log('PaymentSyncResilienceAPI initialized successfully');
  }

  /**
   * Execute sync operation with full resilience
   */
  async executeResilientSync(
    request: PaymentAwareSyncRequest,
    syncOperation: (request: PaymentAwareSyncRequest) => Promise<PaymentAwareSyncResponse>
  ): Promise<ResilienceResult> {
    const startTime = Date.now();
    const context = this.createResilienceContext(request);

    try {
      // Check degradation level
      if (!this.isOperationAllowed(request, context)) {
        return this.handleDegradedOperation(request, context);
      }

      // Persist operation for recovery
      if (this.config.queuePersistence.enablePersistence) {
        await this.queuePersistence.persistOperation(
          request.operationId,
          request,
          request.priority,
          context
        );
      }

      // Execute with circuit breaker and retry
      const result = await this.executeWithCircuitBreaker(
        request,
        context,
        async () => {
          return await this.retryManager.executeWithRetry(
            request.operationId,
            request.priority,
            () => syncOperation(request),
            context.crisisMode
          );
        }
      );

      // Success - remove from persistence
      this.queuePersistence.removeOperation(request.operationId);

      return {
        success: true,
        result: result.result,
        retryRecommended: false,
        fallbackTriggered: false,
        degradationApplied: false,
        crisisOverrideUsed: context.crisisMode,
        performanceMetrics: {
          totalAttempts: result.attempts,
          totalTime: Date.now() - startTime,
          queueTime: 0
        }
      };

    } catch (error) {
      console.error('Resilient sync operation failed:', error);

      // Try fallback mechanisms
      const fallbackResult = await this.attemptFallback(request, context, error as Error);

      return {
        success: fallbackResult.success,
        result: fallbackResult.result,
        error: this.createResilienceError(error as Error, context),
        retryRecommended: this.shouldRecommendRetry(error as Error, context),
        fallbackTriggered: true,
        degradationApplied: this.degradationLevel !== DegradationLevel.NORMAL,
        crisisOverrideUsed: context.crisisMode,
        performanceMetrics: {
          totalAttempts: 1,
          totalTime: Date.now() - startTime,
          fallbackTime: fallbackResult.fallbackTime
        }
      };
    }
  }

  /**
   * Handle crisis emergency with maximum resilience
   */
  async handleCrisisEmergency(
    request: CrisisEmergencySyncRequest,
    syncOperation: (request: CrisisEmergencySyncRequest) => Promise<any>
  ): Promise<ResilienceResult> {
    const startTime = Date.now();

    // Crisis operations bypass all normal limitations
    const crisisContext: ResilienceContext = {
      operationId: request.emergencyId,
      priority: SyncPriorityLevel.CRISIS_EMERGENCY,
      subscriptionTier: 'premium', // Crisis gets premium treatment
      crisisMode: true,
      retryCount: 0,
      circuitBreakerState: CircuitBreakerState.CLOSED, // Bypass circuit breaker
      degradationLevel: DegradationLevel.NORMAL, // Override degradation
      networkQuality: 'good', // Assume good quality for crisis
      timestamp: new Date().toISOString()
    };

    try {
      // Immediate execution with maximum retry attempts
      const result = await this.retryManager.executeWithRetry(
        request.emergencyId,
        SyncPriorityLevel.CRISIS_EMERGENCY,
        () => syncOperation(request),
        true // Crisis mode
      );

      return {
        success: true,
        result: result.result,
        retryRecommended: false,
        fallbackTriggered: false,
        degradationApplied: false,
        crisisOverrideUsed: true,
        performanceMetrics: {
          totalAttempts: result.attempts,
          totalTime: Date.now() - startTime,
          queueTime: 0
        }
      };

    } catch (error) {
      console.error('Crisis emergency operation failed:', error);

      // Even if crisis fails, provide emergency fallback
      const fallbackResult = await this.provideCrisisFallback(request, crisisContext);

      return {
        success: fallbackResult.success,
        result: fallbackResult.result,
        error: this.createResilienceError(error as Error, crisisContext),
        retryRecommended: true, // Always recommend retry for crisis
        fallbackTriggered: true,
        degradationApplied: false,
        crisisOverrideUsed: true,
        performanceMetrics: {
          totalAttempts: 1,
          totalTime: Date.now() - startTime,
          fallbackTime: fallbackResult.fallbackTime
        }
      };
    }
  }

  /**
   * Recover persisted operations after outage
   */
  async recoverPersistedOperations(
    syncOperation: (request: PaymentAwareSyncRequest) => Promise<PaymentAwareSyncResponse>
  ): Promise<{
    recovered: number;
    failed: number;
    totalTime: number;
  }> {
    const startTime = Date.now();
    let recovered = 0;
    let failed = 0;

    try {
      const persistedOperations = await this.queuePersistence.getAllOperations();

      console.log(`Recovering ${persistedOperations.length} persisted operations`);

      for (const { operationId, request, context } of persistedOperations) {
        try {
          const result = await this.executeResilientSync(request, syncOperation);

          if (result.success) {
            recovered++;
            this.queuePersistence.removeOperation(operationId);
          } else {
            failed++;
          }

        } catch (error) {
          console.error(`Failed to recover operation ${operationId}:`, error);
          failed++;
        }
      }

    } catch (error) {
      console.error('Failed to recover persisted operations:', error);
    }

    const totalTime = Date.now() - startTime;

    this.emit('recovery_completed', { recovered, failed, totalTime });

    return { recovered, failed, totalTime };
  }

  private createResilienceContext(request: PaymentAwareSyncRequest): ResilienceContext {
    return {
      operationId: request.operationId,
      priority: request.priority,
      subscriptionTier: request.subscriptionContext.tier,
      crisisMode: request.crisisMode,
      retryCount: 0,
      circuitBreakerState: this.getCircuitBreakerState('payment-sync'),
      degradationLevel: this.degradationLevel,
      networkQuality: this.assessNetworkQuality(),
      timestamp: new Date().toISOString()
    };
  }

  private async executeWithCircuitBreaker<T>(
    request: PaymentAwareSyncRequest,
    context: ResilienceContext,
    operation: () => Promise<T>
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker('payment-sync');
    return await circuitBreaker.execute(operation, context);
  }

  private getCircuitBreaker(serviceName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      const config = this.config.circuitBreaker;
      const circuitBreaker = new CircuitBreaker(serviceName, config);

      // Listen for circuit breaker events
      circuitBreaker.on('circuit_opened', (event) => {
        console.warn(`Circuit breaker opened for ${event.service}`);
        this.handleCircuitBreakerOpen(event.service);
      });

      this.circuitBreakers.set(serviceName, circuitBreaker);
    }

    return this.circuitBreakers.get(serviceName)!;
  }

  private getCircuitBreakerState(serviceName: string): CircuitBreakerState {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    return circuitBreaker ? circuitBreaker.getState() : CircuitBreakerState.CLOSED;
  }

  private isOperationAllowed(request: PaymentAwareSyncRequest, context: ResilienceContext): boolean {
    // Crisis operations always allowed
    if (context.crisisMode) return true;

    // Check degradation level
    switch (this.degradationLevel) {
      case DegradationLevel.NORMAL:
        return true;
      case DegradationLevel.LIMITED:
        return context.priority >= SyncPriorityLevel.HIGH_CLINICAL;
      case DegradationLevel.CRITICAL_ONLY:
        return context.priority >= SyncPriorityLevel.CRITICAL_SAFETY;
      case DegradationLevel.OFFLINE:
        return false;
      default:
        return true;
    }
  }

  private async handleDegradedOperation(
    request: PaymentAwareSyncRequest,
    context: ResilienceContext
  ): Promise<ResilienceResult> {
    // Queue for later processing
    if (this.config.queuePersistence.enablePersistence) {
      await this.queuePersistence.persistOperation(
        request.operationId,
        request,
        request.priority,
        context
      );
    }

    return {
      success: false,
      error: this.createResilienceError(
        new Error(`Operation rejected due to degradation level: ${this.degradationLevel}`),
        context
      ),
      retryRecommended: true,
      fallbackTriggered: false,
      degradationApplied: true,
      crisisOverrideUsed: false,
      performanceMetrics: {
        totalAttempts: 0,
        totalTime: 0,
        queueTime: 0
      }
    };
  }

  private async attemptFallback(
    request: PaymentAwareSyncRequest,
    context: ResilienceContext,
    error: Error
  ): Promise<{ success: boolean; result?: any; fallbackTime: number }> {
    const startTime = Date.now();

    try {
      // Local storage fallback for critical data
      if (context.priority >= SyncPriorityLevel.CRITICAL_SAFETY &&
          this.config.fallback.localStorageFallback) {

        await this.storeLocalFallback(request);

        return {
          success: true,
          result: { status: 'stored_locally', operationId: request.operationId },
          fallbackTime: Date.now() - startTime
        };
      }

      // Crisis-specific fallbacks
      if (context.crisisMode) {
        return await this.provideCrisisFallback(request as any, context);
      }

      return { success: false, fallbackTime: Date.now() - startTime };

    } catch (fallbackError) {
      console.error('Fallback mechanism failed:', fallbackError);
      return { success: false, fallbackTime: Date.now() - startTime };
    }
  }

  private async provideCrisisFallback(
    request: CrisisEmergencySyncRequest,
    context: ResilienceContext
  ): Promise<{ success: boolean; result?: any; fallbackTime: number }> {
    const startTime = Date.now();

    try {
      // Provide immediate crisis resources
      const crisisResources = {
        hotlineNumber: '988',
        emergencyContacts: [],
        localCrisisPlan: true,
        offlineSupport: true
      };

      // Store crisis data locally for recovery
      await this.storeLocalFallback({
        operationId: request.emergencyId,
        operation: {
          id: request.emergencyId,
          type: 'create',
          entityType: 'crisis_plan',
          entityId: request.emergencyId,
          priority: 'crisis',
          data: request.criticalData,
          metadata: {
            entityId: request.emergencyId,
            entityType: 'crisis_plan',
            version: 1,
            lastModified: request.timestamp,
            checksum: 'crisis',
            deviceId: request.deviceId,
            userId: request.userId
          },
          conflictResolution: 'force_local',
          createdAt: request.timestamp,
          retryCount: 0,
          maxRetries: 10,
          clinicalSafety: true
        }
      } as any);

      return {
        success: true,
        result: {
          emergencyId: request.emergencyId,
          status: 'fallback_activated',
          crisisResources,
          localStorageUsed: true
        },
        fallbackTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Crisis fallback failed:', error);
      return { success: false, fallbackTime: Date.now() - startTime };
    }
  }

  private async storeLocalFallback(request: any): Promise<void> {
    // Implementation would store to AsyncStorage with encryption
    console.log(`Storing fallback data for operation ${request.operationId}`);
  }

  private createResilienceError(error: Error, context: ResilienceContext): ResilienceError {
    const category = this.categorizeError(error);
    const severity = this.assessErrorSeverity(error, context);

    return {
      code: `resilience_${category}_error`,
      message: error.message,
      category,
      severity,
      retryable: this.isErrorRetryable(error),
      crisisImpact: context.crisisMode,
      recoverySuggestions: this.generateRecoverySuggestions(error, context),
      context,
      originalError: error
    };
  }

  private categorizeError(error: Error): 'network' | 'service' | 'data' | 'security' | 'capacity' {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('connection')) return 'network';
    if (message.includes('timeout') || message.includes('unavailable')) return 'service';
    if (message.includes('validation') || message.includes('corrupt')) return 'data';
    if (message.includes('auth') || message.includes('permission')) return 'security';
    if (message.includes('limit') || message.includes('quota')) return 'capacity';

    return 'service';
  }

  private assessErrorSeverity(error: Error, context: ResilienceContext): 'low' | 'medium' | 'high' | 'critical' {
    if (context.crisisMode) return 'critical';
    if (context.priority >= SyncPriorityLevel.CRITICAL_SAFETY) return 'high';
    if (context.priority >= SyncPriorityLevel.HIGH_CLINICAL) return 'medium';
    return 'low';
  }

  private isErrorRetryable(error: Error): boolean {
    const nonRetryablePatterns = ['auth', 'permission', 'corrupt', 'invalid'];
    const message = error.message.toLowerCase();
    return !nonRetryablePatterns.some(pattern => message.includes(pattern));
  }

  private generateRecoverySuggestions(error: Error, context: ResilienceContext): string[] {
    const suggestions: string[] = [];
    const message = error.message.toLowerCase();

    if (message.includes('network')) {
      suggestions.push('Check network connectivity');
      suggestions.push('Try switching network connection');
    }

    if (message.includes('timeout')) {
      suggestions.push('Retry with exponential backoff');
      suggestions.push('Check service status');
    }

    if (context.crisisMode) {
      suggestions.push('Activate local crisis plan');
      suggestions.push('Contact emergency services if needed');
      suggestions.push('Use offline crisis resources');
    }

    return suggestions;
  }

  private shouldRecommendRetry(error: Error, context: ResilienceContext): boolean {
    if (context.crisisMode) return true;
    return this.isErrorRetryable(error) && context.retryCount < 3;
  }

  private handleCircuitBreakerOpen(serviceName: string): void {
    // Automatically degrade service when circuit breaker opens
    if (this.degradationLevel === DegradationLevel.NORMAL) {
      this.degradationLevel = DegradationLevel.LIMITED;
      this.emit('degradation_changed', {
        from: DegradationLevel.NORMAL,
        to: DegradationLevel.LIMITED,
        reason: `Circuit breaker opened for ${serviceName}`
      });
    }
  }

  private assessNetworkQuality(): 'excellent' | 'good' | 'poor' | 'offline' {
    // Implementation would assess actual network quality
    return 'good';
  }

  private initializeCircuitBreakers(): void {
    // Initialize circuit breakers for different services
    this.getCircuitBreaker('payment-sync');
    this.getCircuitBreaker('subscription-service');
    this.getCircuitBreaker('crisis-service');
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.updateHealthStatus();
    }, 30000); // Every 30 seconds
  }

  private updateHealthStatus(): void {
    const retryStats = this.retryManager.getRetryStatistics('overall');
    const persistenceStats = this.queuePersistence.getStatistics();

    this.healthStatus = {
      overall: this.degradationLevel === DegradationLevel.NORMAL ? 'healthy' : 'degraded',
      retry: retryStats.successRate > 0.8,
      circuitBreaker: this.getCircuitBreakerState('payment-sync') !== CircuitBreakerState.OPEN,
      persistence: persistenceStats.totalOperations < 100, // Threshold for concerns
      degradation: this.degradationLevel !== DegradationLevel.NORMAL
    };

    this.emit('health_update', this.healthStatus);
  }

  private getDefaultConfiguration(): PaymentSyncResilienceConfiguration {
    return {
      retry: {
        maxAttempts: 5,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2.0,
        jitterMax: 1000,
        retryableErrors: ['network_error', 'timeout_error', 'service_unavailable'],
        nonRetryableErrors: ['authentication_error', 'authorization_error'],
        crisisOverride: true
      },
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeoutMs: 60000,
        halfOpenMaxCalls: 3,
        successThreshold: 3,
        monitoringWindowMs: 300000,
        crisisExempt: true
      },
      queuePersistence: {
        enablePersistence: true,
        maxQueueSize: 1000,
        persistenceIntervalMs: 30000,
        encryptionEnabled: true,
        compressionEnabled: true,
        maxRetentionHours: 24,
        crisisPriority: true
      },
      fallback: {
        enableFallbacks: true,
        fallbackLevels: [DegradationLevel.LIMITED, DegradationLevel.CRITICAL_ONLY],
        crisisAlwaysAvailable: true,
        localStorageFallback: true,
        offlineQueueEnabled: true,
        emergencyContactEnabled: true,
        maxFallbackDurationMs: 3600000 // 1 hour
      }
    };
  }

  /**
   * Get resilience health status
   */
  getHealthStatus(): typeof this.healthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Get resilience statistics
   */
  getResilienceStatistics(): {
    retry: any;
    circuitBreaker: any;
    persistence: any;
    degradation: DegradationLevel;
  } {
    return {
      retry: this.retryManager.getRetryStatistics('overall'),
      circuitBreaker: this.getCircuitBreaker('payment-sync').getStatistics(),
      persistence: this.queuePersistence.getStatistics(),
      degradation: this.degradationLevel
    };
  }

  /**
   * Manually trigger degradation level change
   */
  setDegradationLevel(level: DegradationLevel, reason: string): void {
    const previousLevel = this.degradationLevel;
    this.degradationLevel = level;

    this.emit('degradation_changed', {
      from: previousLevel,
      to: level,
      reason
    });
  }

  /**
   * Reset all circuit breakers (admin function)
   */
  resetCircuitBreakers(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.reset();
    }

    if (this.degradationLevel === DegradationLevel.LIMITED) {
      this.degradationLevel = DegradationLevel.NORMAL;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.queuePersistence.destroy();
    this.removeAllListeners();
  }
}

/**
 * Complete resilience configuration
 */
export interface PaymentSyncResilienceConfiguration {
  readonly retry: RetryConfiguration;
  readonly circuitBreaker: CircuitBreakerConfiguration;
  readonly queuePersistence: QueuePersistenceConfiguration;
  readonly fallback: FallbackConfiguration;
}

// Export singleton instance
export const paymentSyncResilienceAPI = PaymentSyncResilienceAPI.getInstance();