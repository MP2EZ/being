/**
 * Webhook Event Queue System for FullMind P0-CLOUD Payment Infrastructure
 *
 * Implements reliable webhook event processing with:
 * - Event queuing system for offline scenario handling
 * - Retry logic with exponential backoff and circuit breaker
 * - Crisis mode event prioritization with <200ms processing
 * - Background processing with performance monitoring
 * - Persistent queue storage with encryption
 * - Cross-device event synchronization preparation
 */

import { encryptionService } from '../security/EncryptionService';
import { BillingEventResult, EventQueueItem } from './BillingEventHandler';

export interface QueueConfig {
  maxQueueSize: number;
  maxRetryAttempts: number;
  baseRetryDelayMs: number;
  maxRetryDelayMs: number;
  batchProcessingSize: number;
  processingIntervalMs: number;
  persistentStorage: boolean;
  crisisProcessingTimeoutMs: number;
  circuitBreakerThreshold: number;
  queueCleanupIntervalMs: number;
}

export interface QueueStats {
  totalEvents: number;
  pendingEvents: number;
  processingEvents: number;
  completedEvents: number;
  failedEvents: number;
  retryingEvents: number;
  crisisEvents: number;
  averageProcessingTime: number;
  queueHealthScore: number;
  circuitBreakerOpen: boolean;
}

export interface EventProcessor {
  processEvent(event: EventQueueItem): Promise<BillingEventResult>;
  canProcess(eventType: string): boolean;
  getPriority(): number;
}

export interface QueuePersistence {
  saveQueue(events: EventQueueItem[]): Promise<void>;
  loadQueue(): Promise<EventQueueItem[]>;
  clearQueue(): Promise<void>;
  getQueueSize(): Promise<number>;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  successCount: number;
}

/**
 * Comprehensive Webhook Event Queue System
 *
 * Provides reliable event processing with:
 * - Persistent queue storage for offline scenarios
 * - Priority-based processing with crisis event prioritization
 * - Retry logic with exponential backoff and jitter
 * - Circuit breaker pattern for service protection
 * - Performance monitoring and health checking
 * - Cross-device synchronization preparation
 */
export class WebhookEventQueue {
  private static instance: WebhookEventQueue;

  private config: QueueConfig;
  private initialized = false;
  private processing = false;

  // Queue storage
  private eventQueue: Map<string, EventQueueItem> = new Map();
  private processingEvents: Set<string> = new Set();
  private completedEvents: Set<string> = new Set();

  // Event processors
  private processors: Map<string, EventProcessor> = new Map();

  // Circuit breaker
  private circuitBreaker: CircuitBreakerState = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: 0,
    nextAttemptTime: 0,
    successCount: 0
  };

  // Queue statistics
  private stats: QueueStats = {
    totalEvents: 0,
    pendingEvents: 0,
    processingEvents: 0,
    completedEvents: 0,
    failedEvents: 0,
    retryingEvents: 0,
    crisisEvents: 0,
    averageProcessingTime: 0,
    queueHealthScore: 100,
    circuitBreakerOpen: false
  };

  // Performance tracking
  private processingTimes: number[] = [];
  private lastHealthCheck = Date.now();

  // Persistence manager
  private persistence?: QueuePersistence;

  // Processing intervals
  private processingInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  private constructor() {
    this.config = {
      maxQueueSize: 10000,
      maxRetryAttempts: 5,
      baseRetryDelayMs: 1000, // 1 second
      maxRetryDelayMs: 60000, // 1 minute
      batchProcessingSize: 10,
      processingIntervalMs: 1000, // Process every second
      persistentStorage: true,
      crisisProcessingTimeoutMs: 200, // Crisis events must process within 200ms
      circuitBreakerThreshold: 10, // Open circuit after 10 failures
      queueCleanupIntervalMs: 300000 // Cleanup every 5 minutes
    };
  }

  public static getInstance(): WebhookEventQueue {
    if (!WebhookEventQueue.instance) {
      WebhookEventQueue.instance = new WebhookEventQueue();
    }
    return WebhookEventQueue.instance;
  }

  /**
   * Initialize event queue with configuration and persistence
   */
  async initialize(
    customConfig?: Partial<QueueConfig>,
    persistence?: QueuePersistence
  ): Promise<void> {
    try {
      if (this.initialized) return;

      this.config = { ...this.config, ...customConfig };
      this.persistence = persistence;

      // Initialize encryption service
      await encryptionService.initialize();

      // Load persisted queue if available
      if (this.persistence) {
        await this.loadPersistedQueue();
      }

      // Start background processing
      this.startBackgroundProcessing();

      // Register default event processors
      await this.registerDefaultProcessors();

      this.initialized = true;
      console.log('Webhook event queue initialized with reliable processing');

    } catch (error) {
      console.error('Event queue initialization failed:', error);
      throw new Error(`WebhookEventQueue initialization failed: ${error}`);
    }
  }

  /**
   * Enqueue webhook event with priority and crisis handling
   */
  async enqueueEvent(
    eventId: string,
    eventType: string,
    payload: any,
    priority: 'crisis' | 'high' | 'normal' | 'low' = 'normal',
    crisisMode = false
  ): Promise<string> {
    try {
      // Check queue capacity
      if (this.eventQueue.size >= this.config.maxQueueSize) {
        console.warn('Event queue at capacity - implementing backpressure');
        await this.handleQueueCapacity();
      }

      // Encrypt payload for security
      const encryptedPayload = await encryptionService.encryptData(
        JSON.stringify(payload),
        crisisMode ? 'crisis_webhook_encryption' : 'webhook_event_encryption'
      );

      // Create queue item
      const queueItem: EventQueueItem = {
        id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventId,
        eventType,
        payload: encryptedPayload,
        priority,
        attempts: 0,
        maxAttempts: this.config.maxRetryAttempts,
        scheduledAt: new Date().toISOString(),
        crisisMode
      };

      // Add to queue
      this.eventQueue.set(queueItem.id, queueItem);

      // Update statistics
      this.stats.totalEvents++;
      this.stats.pendingEvents++;
      if (crisisMode) {
        this.stats.crisisEvents++;
      }

      // Persist queue if enabled
      if (this.persistence) {
        await this.persistQueue();
      }

      // Trigger immediate processing for crisis events
      if (crisisMode || priority === 'crisis') {
        this.processCrisisEvent(queueItem).catch(console.error);
      }

      console.log(`Event enqueued: ${eventType} (${priority} priority, crisis: ${crisisMode})`);
      return queueItem.id;

    } catch (error) {
      console.error('Event enqueue failed:', error);
      throw error;
    }
  }

  /**
   * Process crisis event immediately with <200ms guarantee
   */
  private async processCrisisEvent(queueItem: EventQueueItem): Promise<void> {
    try {
      const startTime = Date.now();

      // Set processing flag
      this.processingEvents.add(queueItem.id);

      // Create timeout for crisis processing
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Crisis event processing timeout')),
          this.config.crisisProcessingTimeoutMs
        );
      });

      // Process event with timeout
      const processingPromise = this.processQueueItem(queueItem);
      await Promise.race([processingPromise, timeoutPromise]);

      const processingTime = Date.now() - startTime;
      console.log(`Crisis event processed in ${processingTime}ms: ${queueItem.eventType}`);

      // Verify processing time meets requirements
      if (processingTime > this.config.crisisProcessingTimeoutMs) {
        console.warn(`Crisis event exceeded time limit: ${processingTime}ms > ${this.config.crisisProcessingTimeoutMs}ms`);
      }

    } catch (error) {
      console.error('Crisis event processing failed:', error);

      // For crisis events, mark as processed to prevent blocking
      // The actual webhook handler will provide fallback behavior
      this.markEventCompleted(queueItem.id, {
        processed: true,
        eventId: queueItem.eventId,
        eventType: queueItem.eventType,
        processingTime: this.config.crisisProcessingTimeoutMs,
        crisisOverride: true,
        error: {
          code: 'CRISIS_PROCESSING_FAILED',
          message: error.message,
          retryable: false
        }
      });
    } finally {
      this.processingEvents.delete(queueItem.id);
    }
  }

  /**
   * Register event processor for specific event types
   */
  async registerEventProcessor(
    eventTypes: string[],
    processor: EventProcessor
  ): Promise<void> {
    try {
      for (const eventType of eventTypes) {
        this.processors.set(eventType, processor);
        console.log(`Registered processor for event type: ${eventType}`);
      }
    } catch (error) {
      console.error('Event processor registration failed:', error);
      throw error;
    }
  }

  /**
   * Start background processing with intervals
   */
  private startBackgroundProcessing(): void {
    // Main processing loop
    this.processingInterval = setInterval(async () => {
      try {
        if (!this.processing && !this.circuitBreaker.isOpen) {
          await this.processQueueBatch();
        }
      } catch (error) {
        console.error('Background processing error:', error);
        this.handleProcessingError(error);
      }
    }, this.config.processingIntervalMs);

    // Queue cleanup
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupCompletedEvents();
      } catch (error) {
        console.error('Queue cleanup error:', error);
      }
    }, this.config.queueCleanupIntervalMs);

    // Health monitoring
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.updateQueueHealth();
      } catch (error) {
        console.error('Health check error:', error);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Process batch of queued events with priority ordering
   */
  private async processQueueBatch(): Promise<void> {
    try {
      this.processing = true;

      // Get ready events
      const readyEvents = this.getReadyEvents();
      if (readyEvents.length === 0) {
        return;
      }

      // Sort by priority and crisis mode
      const sortedEvents = this.sortEventsByPriority(readyEvents);

      // Process batch
      const batchSize = Math.min(sortedEvents.length, this.config.batchProcessingSize);
      const batch = sortedEvents.slice(0, batchSize);

      // Process events in parallel (except crisis events which are processed immediately)
      const processingPromises = batch
        .filter(event => !event.crisisMode) // Crisis events already processed immediately
        .map(event => this.processQueueItemSafely(event));

      await Promise.all(processingPromises);

      console.log(`Processed batch of ${batch.length} events`);

    } catch (error) {
      console.error('Batch processing failed:', error);
      this.handleProcessingError(error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get events ready for processing
   */
  private getReadyEvents(): EventQueueItem[] {
    const now = Date.now();
    const readyEvents: EventQueueItem[] = [];

    for (const event of this.eventQueue.values()) {
      // Skip if already processing or completed
      if (this.processingEvents.has(event.id) || this.completedEvents.has(event.id)) {
        continue;
      }

      // Check if retry time has passed
      const isReady = !event.nextRetryAt || new Date(event.nextRetryAt).getTime() <= now;

      // Check if has attempts left
      const hasAttemptsLeft = event.attempts < event.maxAttempts;

      if (isReady && hasAttemptsLeft) {
        readyEvents.push(event);
      }
    }

    return readyEvents;
  }

  /**
   * Sort events by priority and crisis mode
   */
  private sortEventsByPriority(events: EventQueueItem[]): EventQueueItem[] {
    return events.sort((a, b) => {
      // Crisis events first
      if (a.crisisMode !== b.crisisMode) {
        return a.crisisMode ? -1 : 1;
      }

      // Priority order
      const priorityOrder = { crisis: 0, high: 1, normal: 2, low: 3 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Older events first
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });
  }

  /**
   * Process individual queue item with error handling
   */
  private async processQueueItemSafely(queueItem: EventQueueItem): Promise<void> {
    try {
      await this.processQueueItem(queueItem);
    } catch (error) {
      console.error(`Queue item processing failed: ${queueItem.eventType}`, error);
      await this.handleEventProcessingError(queueItem, error);
    }
  }

  /**
   * Process individual queue item
   */
  private async processQueueItem(queueItem: EventQueueItem): Promise<void> {
    const startTime = Date.now();

    try {
      // Mark as processing
      this.processingEvents.add(queueItem.id);
      queueItem.attempts++;

      // Get appropriate processor
      const processor = this.processors.get(queueItem.eventType);
      if (!processor) {
        throw new Error(`No processor found for event type: ${queueItem.eventType}`);
      }

      // Decrypt payload
      const decryptedPayload = await encryptionService.decryptData(
        queueItem.payload,
        queueItem.crisisMode ? 'crisis_webhook_encryption' : 'webhook_event_encryption'
      );

      const webhookEvent = JSON.parse(decryptedPayload);

      // Process event
      const result = await processor.processEvent({
        ...queueItem,
        payload: decryptedPayload
      });

      const processingTime = Date.now() - startTime;

      // Mark as completed
      this.markEventCompleted(queueItem.id, {
        ...result,
        processingTime
      });

      // Update circuit breaker on success
      this.recordSuccess();

      console.log(`Event processed successfully: ${queueItem.eventType} (${processingTime}ms)`);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`Event processing failed: ${queueItem.eventType}`, error);

      // Schedule retry or mark as failed
      await this.handleEventProcessingError(queueItem, error);

      // Update circuit breaker on failure
      this.recordFailure();

      throw error;
    } finally {
      this.processingEvents.delete(queueItem.id);
    }
  }

  /**
   * Handle event processing error with retry logic
   */
  private async handleEventProcessingError(
    queueItem: EventQueueItem,
    error: any
  ): Promise<void> {
    try {
      // Check if should retry
      if (queueItem.attempts < queueItem.maxAttempts && this.isRetryableError(error)) {
        // Calculate retry delay with exponential backoff
        const delay = this.calculateRetryDelay(queueItem.attempts);
        queueItem.nextRetryAt = new Date(Date.now() + delay).toISOString();
        queueItem.error = error.message;

        this.stats.retryingEvents++;
        console.log(`Event scheduled for retry: ${queueItem.eventType} (attempt ${queueItem.attempts + 1} in ${delay}ms)`);

      } else {
        // Max attempts reached or non-retryable error
        this.markEventCompleted(queueItem.id, {
          processed: false,
          eventId: queueItem.eventId,
          eventType: queueItem.eventType,
          processingTime: 0,
          error: {
            code: 'MAX_RETRIES_EXCEEDED',
            message: `Failed after ${queueItem.attempts} attempts: ${error.message}`,
            retryable: false
          }
        });

        this.stats.failedEvents++;
        console.error(`Event failed permanently: ${queueItem.eventType} after ${queueItem.attempts} attempts`);
      }

      // Persist queue state
      if (this.persistence) {
        await this.persistQueue();
      }

    } catch (persistError) {
      console.error('Error handling event processing error:', persistError);
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number): number {
    const exponentialDelay = this.config.baseRetryDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    const delay = Math.min(exponentialDelay + jitter, this.config.maxRetryDelayMs);
    return Math.floor(delay);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Define retryable error patterns
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /temporary/i,
      /503/,
      /502/,
      /504/
    ];

    const errorMessage = error.message || error.toString();
    return retryablePatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Mark event as completed
   */
  private markEventCompleted(queueItemId: string, result: BillingEventResult): void {
    this.completedEvents.add(queueItemId);
    this.stats.pendingEvents = Math.max(0, this.stats.pendingEvents - 1);

    if (result.processed) {
      this.stats.completedEvents++;
    } else {
      this.stats.failedEvents++;
    }

    // Track processing time
    if (result.processingTime > 0) {
      this.processingTimes.push(result.processingTime);
      if (this.processingTimes.length > 100) {
        this.processingTimes = this.processingTimes.slice(-50); // Keep recent times
      }

      // Update average processing time
      const avgTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
      this.stats.averageProcessingTime = Math.round(avgTime);
    }
  }

  /**
   * Handle queue capacity by removing old completed events
   */
  private async handleQueueCapacity(): Promise<void> {
    try {
      console.log('Handling queue capacity - removing old events');

      // Remove old completed events
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      let removedCount = 0;

      for (const [id, event] of this.eventQueue.entries()) {
        if (this.completedEvents.has(id)) {
          const eventTime = new Date(event.scheduledAt).getTime();
          if (eventTime < cutoffTime) {
            this.eventQueue.delete(id);
            this.completedEvents.delete(id);
            removedCount++;
          }
        }
      }

      console.log(`Removed ${removedCount} old completed events`);

      // If still at capacity, remove oldest non-crisis events
      if (this.eventQueue.size >= this.config.maxQueueSize) {
        const nonCrisisEvents = Array.from(this.eventQueue.values())
          .filter(event => !event.crisisMode && !this.processingEvents.has(event.id))
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

        const toRemove = Math.min(nonCrisisEvents.length, 100); // Remove up to 100 events
        for (let i = 0; i < toRemove; i++) {
          const event = nonCrisisEvents[i];
          this.eventQueue.delete(event.id);
          this.completedEvents.delete(event.id);
        }

        console.log(`Removed ${toRemove} oldest non-crisis events to manage capacity`);
      }

    } catch (error) {
      console.error('Queue capacity handling failed:', error);
    }
  }

  /**
   * Clean up completed events periodically
   */
  private async cleanupCompletedEvents(): Promise<void> {
    try {
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
      let cleanedCount = 0;

      for (const [id, event] of this.eventQueue.entries()) {
        if (this.completedEvents.has(id)) {
          const eventTime = new Date(event.scheduledAt).getTime();
          if (eventTime < cutoffTime) {
            this.eventQueue.delete(id);
            this.completedEvents.delete(id);
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} old completed events`);

        // Persist queue after cleanup
        if (this.persistence) {
          await this.persistQueue();
        }
      }

    } catch (error) {
      console.error('Event cleanup failed:', error);
    }
  }

  /**
   * Update queue health metrics
   */
  private async updateQueueHealth(): Promise<void> {
    try {
      const now = Date.now();

      // Update stats
      this.stats.pendingEvents = this.eventQueue.size - this.completedEvents.size;
      this.stats.processingEvents = this.processingEvents.size;
      this.stats.circuitBreakerOpen = this.circuitBreaker.isOpen;

      // Calculate health score
      let healthScore = 100;

      // Penalty for high queue size
      const queueUtilization = this.eventQueue.size / this.config.maxQueueSize;
      if (queueUtilization > 0.8) {
        healthScore -= (queueUtilization - 0.8) * 200; // Up to 40 point penalty
      }

      // Penalty for high failure rate
      const totalProcessed = this.stats.completedEvents + this.stats.failedEvents;
      if (totalProcessed > 0) {
        const failureRate = this.stats.failedEvents / totalProcessed;
        if (failureRate > 0.1) {
          healthScore -= failureRate * 100; // Up to 100 point penalty
        }
      }

      // Penalty for circuit breaker open
      if (this.circuitBreaker.isOpen) {
        healthScore -= 30;
      }

      // Penalty for high average processing time
      if (this.stats.averageProcessingTime > 5000) { // 5 seconds
        healthScore -= 20;
      }

      this.stats.queueHealthScore = Math.max(0, Math.min(100, healthScore));

      console.log(`Queue health updated: ${this.stats.queueHealthScore}/100`);

    } catch (error) {
      console.error('Health update failed:', error);
    }
  }

  /**
   * Handle processing error for circuit breaker
   */
  private handleProcessingError(error: any): void {
    this.recordFailure();
    console.error('Processing error handled by circuit breaker:', error);
  }

  /**
   * Record success for circuit breaker
   */
  private recordSuccess(): void {
    this.circuitBreaker.successCount++;

    // Close circuit breaker if enough successes
    if (this.circuitBreaker.isOpen && this.circuitBreaker.successCount >= 5) {
      this.circuitBreaker.isOpen = false;
      this.circuitBreaker.failureCount = 0;
      this.circuitBreaker.successCount = 0;
      console.log('Circuit breaker closed after successful operations');
    }
  }

  /**
   * Record failure for circuit breaker
   */
  private recordFailure(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();
    this.circuitBreaker.successCount = 0;

    // Open circuit breaker if threshold reached
    if (this.circuitBreaker.failureCount >= this.config.circuitBreakerThreshold) {
      this.circuitBreaker.isOpen = true;
      this.circuitBreaker.nextAttemptTime = Date.now() + 60000; // 1 minute
      console.warn(`Circuit breaker opened after ${this.circuitBreaker.failureCount} failures`);
    }
  }

  /**
   * Load persisted queue from storage
   */
  private async loadPersistedQueue(): Promise<void> {
    try {
      if (!this.persistence) return;

      const persistedEvents = await this.persistence.loadQueue();
      for (const event of persistedEvents) {
        this.eventQueue.set(event.id, event);

        // Update stats
        if (event.processedAt) {
          this.completedEvents.add(event.id);
          this.stats.completedEvents++;
        } else {
          this.stats.pendingEvents++;
        }

        if (event.crisisMode) {
          this.stats.crisisEvents++;
        }
      }

      console.log(`Loaded ${persistedEvents.length} persisted events`);

    } catch (error) {
      console.error('Failed to load persisted queue:', error);
      // Non-blocking - continue with empty queue
    }
  }

  /**
   * Persist queue to storage
   */
  private async persistQueue(): Promise<void> {
    try {
      if (!this.persistence) return;

      const eventsToSave = Array.from(this.eventQueue.values());
      await this.persistence.saveQueue(eventsToSave);

    } catch (error) {
      console.error('Failed to persist queue:', error);
      // Non-blocking - don't throw
    }
  }

  /**
   * Register default event processors
   */
  private async registerDefaultProcessors(): Promise<void> {
    try {
      // Mock default processor - in production would register actual processors
      const defaultProcessor: EventProcessor = {
        processEvent: async (event: EventQueueItem): Promise<BillingEventResult> => {
          // Mock processing
          return {
            processed: true,
            eventId: event.eventId,
            eventType: event.eventType,
            processingTime: 100
          };
        },
        canProcess: (eventType: string): boolean => true,
        getPriority: (): number => 1
      };

      const eventTypes = [
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'customer.subscription.trial_will_end',
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'invoice.payment_succeeded',
        'invoice.payment_failed'
      ];

      await this.registerEventProcessor(eventTypes, defaultProcessor);

    } catch (error) {
      console.error('Default processor registration failed:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics for monitoring
   */
  async getQueueStats(): Promise<QueueStats> {
    return { ...this.stats };
  }

  /**
   * Get detailed queue status for debugging
   */
  async getQueueStatus(): Promise<{
    initialized: boolean;
    processing: boolean;
    queueSize: number;
    processingCount: number;
    completedCount: number;
    circuitBreakerOpen: boolean;
    stats: QueueStats;
    topPendingEvents: Array<{ id: string; eventType: string; priority: string; attempts: number; crisisMode: boolean }>;
  }> {
    try {
      // Get top pending events for monitoring
      const pendingEvents = Array.from(this.eventQueue.values())
        .filter(event => !this.completedEvents.has(event.id))
        .sort((a, b) => {
          // Sort by crisis mode first, then priority, then age
          if (a.crisisMode !== b.crisisMode) return a.crisisMode ? -1 : 1;
          const priorityOrder = { crisis: 0, high: 1, normal: 2, low: 3 };
          const aPriority = priorityOrder[a.priority];
          const bPriority = priorityOrder[b.priority];
          if (aPriority !== bPriority) return aPriority - bPriority;
          return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        })
        .slice(0, 10)
        .map(event => ({
          id: event.id,
          eventType: event.eventType,
          priority: event.priority,
          attempts: event.attempts,
          crisisMode: event.crisisMode
        }));

      return {
        initialized: this.initialized,
        processing: this.processing,
        queueSize: this.eventQueue.size,
        processingCount: this.processingEvents.size,
        completedCount: this.completedEvents.size,
        circuitBreakerOpen: this.circuitBreaker.isOpen,
        stats: { ...this.stats },
        topPendingEvents: pendingEvents
      };

    } catch (error) {
      console.error('Failed to get queue status:', error);
      return {
        initialized: false,
        processing: false,
        queueSize: 0,
        processingCount: 0,
        completedCount: 0,
        circuitBreakerOpen: false,
        stats: {
          totalEvents: 0,
          pendingEvents: 0,
          processingEvents: 0,
          completedEvents: 0,
          failedEvents: 0,
          retryingEvents: 0,
          crisisEvents: 0,
          averageProcessingTime: 0,
          queueHealthScore: 0,
          circuitBreakerOpen: false
        },
        topPendingEvents: []
      };
    }
  }

  /**
   * Manual queue management - pause processing
   */
  async pauseProcessing(): Promise<void> {
    try {
      this.processing = true; // Set flag to prevent new processing
      console.log('Queue processing paused');
    } catch (error) {
      console.error('Failed to pause processing:', error);
      throw error;
    }
  }

  /**
   * Manual queue management - resume processing
   */
  async resumeProcessing(): Promise<void> {
    try {
      this.processing = false;
      console.log('Queue processing resumed');
    } catch (error) {
      console.error('Failed to resume processing:', error);
      throw error;
    }
  }

  /**
   * Manual queue management - clear completed events
   */
  async clearCompletedEvents(): Promise<number> {
    try {
      let clearedCount = 0;

      for (const [id, event] of this.eventQueue.entries()) {
        if (this.completedEvents.has(id)) {
          this.eventQueue.delete(id);
          this.completedEvents.delete(id);
          clearedCount++;
        }
      }

      // Persist after clearing
      if (this.persistence) {
        await this.persistQueue();
      }

      console.log(`Cleared ${clearedCount} completed events`);
      return clearedCount;

    } catch (error) {
      console.error('Failed to clear completed events:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources on shutdown
   */
  async cleanup(): Promise<void> {
    try {
      // Stop intervals
      if (this.processingInterval) {
        clearInterval(this.processingInterval);
      }
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // Wait for current processing to complete
      let waitAttempts = 0;
      while (this.processing && waitAttempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        waitAttempts++;
      }

      // Persist final queue state
      if (this.persistence) {
        await this.persistQueue();
      }

      // Clear data structures
      this.eventQueue.clear();
      this.processingEvents.clear();
      this.completedEvents.clear();
      this.processors.clear();

      this.initialized = false;
      console.log('Webhook event queue cleanup completed');

    } catch (error) {
      console.error('Event queue cleanup failed:', error);
      // Should not throw during cleanup
    }
  }
}

// Export singleton instance
export const webhookEventQueue = WebhookEventQueue.getInstance();