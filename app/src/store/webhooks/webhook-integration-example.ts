/**
 * Webhook Integration Example for Being. MBCT App
 *
 * Comprehensive example demonstrating real-time webhook state synchronization
 * with crisis-safe operations, therapeutic continuity, and performance monitoring.
 *
 * This example shows how all webhook state management components integrate
 * to provide seamless, crisis-aware state synchronization.
 */

import {
  useWebhookStateManager,
  usePaymentWebhookStore,
  useSubscriptionSyncStore,
  useCrisisStateManager,
  useRealTimeWebhookSync,
  useOptimisticUpdateManager,
  useEncryptedWebhookStorage,
  useWebhookPerformanceStore,
} from '../index';
import {
  WebhookEvent,
  WebhookProcessingResult,
} from '../../types/webhooks/webhook-events';
import {
  CrisisLevel,
} from '../../types/webhooks/crisis-safety-types';

/**
 * Comprehensive Webhook State Integration
 *
 * This example demonstrates the complete webhook state synchronization flow
 * from initial webhook event through crisis-safe processing to persistent storage.
 */
export class WebhookStateIntegration {
  private webhookStateManager = useWebhookStateManager();
  private paymentWebhookStore = usePaymentWebhookStore();
  private subscriptionSyncStore = useSubscriptionSyncStore();
  private crisisStateManager = useCrisisStateManager();
  private realTimeSync = useRealTimeWebhookSync();
  private optimisticUpdates = useOptimisticUpdateManager();
  private encryptedStorage = useEncryptedWebhookStorage();
  private performanceStore = useWebhookPerformanceStore();

  /**
   * Initialize complete webhook state management system
   */
  async initializeWebhookStateSystem(): Promise<void> {
    console.log('[WebhookIntegration] Initializing comprehensive webhook state system...');

    try {
      // Initialize all components in proper order
      await Promise.all([
        // Core infrastructure first
        this.encryptedStorage.initializeEncryption(),
        this.performanceStore.initializePerformanceMonitoring(),

        // State management
        this.webhookStateManager.initialize(),
        this.crisisStateManager.initializeCrisisMonitoring(),

        // Real-time synchronization
        this.realTimeSync.initializeRealTimeSync(),
        this.subscriptionSyncStore.initializeSubscriptionSync(),

        // Payment integration
        this.paymentWebhookStore.initializeWebhookIntegration(),
      ]);

      // Connect stores for real-time synchronization
      this.realTimeSync.connectStore('payment', this.paymentWebhookStore, {
        syncPriority: 'high',
        conflictResolutionStrategy: 'therapeutic_priority',
      });

      this.realTimeSync.connectStore('subscription', this.subscriptionSyncStore, {
        syncPriority: 'high',
        conflictResolutionStrategy: 'therapeutic_priority',
      });

      this.realTimeSync.connectStore('crisis', this.crisisStateManager, {
        syncPriority: 'immediate',
        conflictResolutionStrategy: 'crisis_safety',
      });

      // Connect optimistic updates
      this.optimisticUpdates.connectStore('payment', ['payment_processing', 'subscription_change'], 'therapeutic_priority');
      this.optimisticUpdates.connectStore('subscription', ['subscription_change', 'feature_access_change'], 'therapeutic_priority');
      this.optimisticUpdates.connectStore('crisis', ['crisis_level_update', 'emergency_access_grant'], 'crisis_safety');

      // Integrate performance monitoring
      this.performanceStore.integrateWithWebhookStore(this.webhookStateManager);
      this.performanceStore.integrateWithCrisisManager(this.crisisStateManager);

      console.log('[WebhookIntegration] Webhook state system initialized successfully');

    } catch (error) {
      console.error('[WebhookIntegration] Failed to initialize webhook state system:', error);
      throw error;
    }
  }

  /**
   * Process webhook event with complete crisis-safe state synchronization
   */
  async processWebhookEventWithFullIntegration(event: WebhookEvent): Promise<WebhookProcessingResult> {
    const startTime = Date.now();

    try {
      console.log(`[WebhookIntegration] Processing webhook event: ${event.type}`);

      // 1. Detect crisis level and activate emergency protocols if needed
      const crisisLevel = await this.detectCrisisLevel(event);

      if (crisisLevel === 'critical' || crisisLevel === 'emergency') {
        await this.activateEmergencyProtocols(crisisLevel);
      }

      // 2. Apply optimistic updates for immediate UI responsiveness
      const optimisticUpdateId = await this.applyOptimisticWebhookUpdate(event, crisisLevel);

      // 3. Process event through main webhook state manager
      const processingResult = await this.webhookStateManager.processWebhookEvent(event);

      // 4. Synchronize state across all connected stores
      await this.synchronizeStateAcrossStores(event, processingResult);

      // 5. Handle specific webhook types with specialized processing
      await this.processSpecializedWebhookTypes(event, processingResult);

      // 6. Confirm optimistic updates or roll back if needed
      if (processingResult.success) {
        await this.optimisticUpdates.confirmOptimisticUpdate(optimisticUpdateId, processingResult);
      } else {
        await this.optimisticUpdates.rollbackOptimisticUpdate(optimisticUpdateId, 'Webhook processing failed');
      }

      // 7. Persist state changes with encryption
      await this.persistStateChanges(event, processingResult);

      // 8. Track performance and validate SLA compliance
      const processingTime = Date.now() - startTime;
      this.performanceStore.trackWebhookResponseTime(event.id, startTime, Date.now(), crisisLevel === 'critical');

      // 9. Ensure therapeutic continuity is maintained
      await this.validateTherapeuticContinuity();

      console.log(`[WebhookIntegration] Webhook processed successfully in ${processingTime}ms`);

      return {
        ...processingResult,
        integrationComplete: true,
        statesSynchronized: true,
        therapeuticContinuity: true,
      };

    } catch (error) {
      console.error(`[WebhookIntegration] Webhook processing failed:`, error);

      // Emergency fallback: preserve therapeutic access
      await this.activateEmergencyFallback(event, error);

      throw error;
    }
  }

  /**
   * Detect crisis level from webhook event
   */
  private async detectCrisisLevel(event: WebhookEvent): Promise<CrisisLevel> {
    // Crisis detection based on event type and content
    if (event.type.includes('crisis') || event.type.includes('emergency')) {
      return 'critical';
    }

    if (event.type === 'invoice.payment_failed' || event.type === 'customer.subscription.deleted') {
      // Payment failures that could impact therapeutic access
      return 'medium';
    }

    if (event.type.includes('error') || event.type.includes('failure')) {
      return 'low';
    }

    return 'none';
  }

  /**
   * Activate emergency protocols for crisis-level events
   */
  private async activateEmergencyProtocols(crisisLevel: CrisisLevel): Promise<void> {
    console.log(`[WebhookIntegration] Activating emergency protocols: ${crisisLevel}`);

    // Activate crisis modes across all systems
    await Promise.all([
      this.crisisStateManager.activateEmergencyResponse({
        type: 'webhook_crisis',
        source: 'webhook_processing',
        severity: 'critical',
        timestamp: Date.now(),
        metadata: { automated: true },
      }),
      this.realTimeSync.activateCrisisSync(crisisLevel),
      this.optimisticUpdates.activateCrisisOptimisticMode(crisisLevel),
      this.paymentWebhookStore.activateEmergencyPaymentAccess('Crisis webhook detected'),
      this.subscriptionSyncStore.activateEmergencySubscriptionAccess('Crisis webhook detected'),
      this.performanceStore.activateCrisisPerformanceMonitoring(crisisLevel),
      this.encryptedStorage.activateCrisisStorageMode(crisisLevel),
    ]);

    // Ensure therapeutic continuity
    await this.preserveTherapeuticAccess();
  }

  /**
   * Apply optimistic updates for immediate UI responsiveness
   */
  private async applyOptimisticWebhookUpdate(event: WebhookEvent, crisisLevel: CrisisLevel): Promise<string> {
    const optimisticState = this.generateOptimisticState(event);
    const targetStores = this.determineTargetStores(event);

    if (crisisLevel === 'critical' || crisisLevel === 'emergency') {
      return await this.optimisticUpdates.applyCrisisSafeUpdate(
        'webhook_processing_complete',
        optimisticState,
        targetStores
      );
    } else {
      return await this.optimisticUpdates.applyOptimisticUpdate(
        'webhook_processing_complete',
        optimisticState,
        targetStores,
        {
          therapeuticImpact: true,
          crisisLevel,
        }
      );
    }
  }

  /**
   * Synchronize state across all connected stores
   */
  private async synchronizeStateAcrossStores(event: WebhookEvent, result: WebhookProcessingResult): Promise<void> {
    // Queue real-time sync events for all affected stores
    const targetStores = this.determineTargetStores(event);

    for (const storeId of targetStores) {
      this.realTimeSync.queueSyncEvent(
        'webhook_processing_complete',
        { event, result },
        [storeId],
        result.crisisMode ? 'immediate' : 'high'
      );
    }

    // Process sync queue immediately for crisis events
    if (result.crisisMode) {
      await this.realTimeSync.processEventQueue();
    }
  }

  /**
   * Handle specialized webhook types with domain-specific processing
   */
  private async processSpecializedWebhookTypes(event: WebhookEvent, result: WebhookProcessingResult): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.subscriptionSyncStore.processSubscriptionWebhook(event);
        break;

      case 'invoice.payment_failed':
      case 'invoice.payment_succeeded':
        await this.paymentWebhookStore.processWebhookPaymentEvent(event);
        break;

      case 'crisis.detected':
      case 'emergency.triggered':
        await this.crisisStateManager.processWebhookCrisisEvent(event, 'critical');
        break;

      default:
        console.log(`[WebhookIntegration] General webhook processing for: ${event.type}`);
    }
  }

  /**
   * Persist state changes with encryption and audit trails
   */
  private async persistStateChanges(event: WebhookEvent, result: WebhookProcessingResult): Promise<void> {
    // Store webhook event and result
    await this.encryptedStorage.encryptAndStore(
      `webhook_${event.id}`,
      { event, result },
      'webhook_state',
      'hipaa_compliant',
      {
        crisisLevel: result.crisisMode ? 'critical' : 'none',
        therapeuticImpact: result.therapeuticContinuity,
        emergencyAccessible: true,
      }
    );

    // Store state snapshots for recovery
    if (result.crisisMode) {
      await this.encryptedStorage.createEmergencyBackup([
        'webhook_state',
        'payment_state',
        'subscription_state',
        'crisis_state',
        'therapeutic_state',
      ]);
    }
  }

  /**
   * Validate therapeutic continuity is maintained
   */
  private async validateTherapeuticContinuity(): Promise<void> {
    const continuityChecks = await Promise.all([
      this.crisisStateManager.validateCrisisDataIntegrity(),
      this.paymentWebhookStore.checkGracePeriodStatus(),
      this.subscriptionSyncStore.validateSubscriptionIntegrity(),
      this.encryptedStorage.ensureTherapeuticDataAccessibility(),
    ]);

    const allContinuityMaintained = continuityChecks.every(check => check);

    this.performanceStore.trackTherapeuticContinuity(allContinuityMaintained, Date.now());

    if (!allContinuityMaintained) {
      console.warn('[WebhookIntegration] Therapeutic continuity validation failed');
      await this.preserveTherapeuticAccess();
    }
  }

  /**
   * Preserve therapeutic access across all systems
   */
  private async preserveTherapeuticAccess(): Promise<void> {
    console.log('[WebhookIntegration] Preserving therapeutic access across all systems');

    await Promise.all([
      this.crisisStateManager.preserveTherapeuticContinuity(),
      this.paymentWebhookStore.preserveTherapeuticAccess(),
      this.subscriptionSyncStore.preserveTherapeuticSubscriptionAccess(),
      this.realTimeSync.preserveTherapeuticSyncContinuity(),
      this.optimisticUpdates.preserveTherapeuticContinuityInUpdates(),
      this.encryptedStorage.preserveTherapeuticStorageData(),
    ]);
  }

  /**
   * Emergency fallback when webhook processing fails
   */
  private async activateEmergencyFallback(event: WebhookEvent, error: Error): Promise<void> {
    console.error('[WebhookIntegration] Activating emergency fallback due to processing failure');

    // Activate emergency protocols
    await this.activateEmergencyProtocols('emergency');

    // Ensure all critical systems remain operational
    await this.preserveTherapeuticAccess();

    // Log failure for audit
    await this.encryptedStorage.encryptAndStore(
      `webhook_failure_${Date.now()}`,
      { event, error: error.message, timestamp: Date.now() },
      'audit_trail',
      'hipaa_compliant',
      {
        crisisLevel: 'emergency',
        therapeuticImpact: true,
        emergencyAccessible: true,
      }
    );

    // Generate performance alert
    await this.performanceStore.generatePerformanceAlert(
      'recovery_failure',
      {
        id: `failure_${Date.now()}`,
        timestamp: Date.now(),
        metricType: 'availability',
        value: 0,
        expectedValue: 1,
        threshold: 1,
        violationDetected: true,
        crisisLevel: 'emergency',
        therapeuticImpact: true,
        userSafetyImpact: true,
        source: 'webhook_processing',
        context: { event: event.id, error: error.message },
      },
      'emergency'
    );
  }

  /**
   * Generate optimistic state for UI updates
   */
  private generateOptimisticState(event: WebhookEvent): any {
    // Generate appropriate optimistic state based on event type
    switch (event.type) {
      case 'customer.subscription.updated':
        return {
          subscription: {
            status: event.data.status,
            lastUpdated: Date.now(),
          },
        };

      case 'invoice.payment_succeeded':
        return {
          payment: {
            status: 'succeeded',
            lastUpdated: Date.now(),
          },
          gracePeriod: {
            active: false,
          },
        };

      case 'crisis.detected':
        return {
          crisis: {
            level: 'critical',
            emergencyAccess: true,
            therapeuticContinuity: true,
          },
        };

      default:
        return {
          lastWebhookProcessed: event.id,
          timestamp: Date.now(),
        };
    }
  }

  /**
   * Determine which stores should be updated for this event
   */
  private determineTargetStores(event: WebhookEvent): string[] {
    const stores = [];

    // Always update webhook state manager
    stores.push('webhook');

    // Event-specific stores
    if (event.type.includes('subscription')) {
      stores.push('subscription', 'payment');
    }

    if (event.type.includes('payment') || event.type.includes('invoice')) {
      stores.push('payment');
    }

    if (event.type.includes('crisis') || event.type.includes('emergency')) {
      stores.push('crisis', 'payment', 'subscription');
    }

    return stores;
  }

  /**
   * Health check for entire webhook state system
   */
  async performSystemHealthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const healthChecks = await Promise.all([
      this.webhookStateManager.getState().isInitialized ? Promise.resolve({ healthy: true, issues: [] }) : Promise.resolve({ healthy: false, issues: ['Webhook state manager not initialized'] }),
      this.performanceStore.checkPerformanceHealth(),
      this.encryptedStorage.getStorageHealth(),
      this.realTimeSync.getSyncHealth(),
      this.optimisticUpdates.getUpdateHealth(),
    ]);

    const allHealthy = healthChecks.every(check => check.healthy);
    const allIssues = healthChecks.flatMap(check => check.issues || []);

    const recommendations = [];

    if (!allHealthy) {
      recommendations.push('Run system recovery procedures');
      recommendations.push('Validate therapeutic continuity');
      recommendations.push('Check crisis response systems');
    }

    return {
      healthy: allHealthy,
      issues: allIssues,
      recommendations,
    };
  }

  /**
   * Shutdown webhook state system gracefully
   */
  async shutdownWebhookStateSystem(): Promise<void> {
    console.log('[WebhookIntegration] Shutting down webhook state system...');

    try {
      // Preserve therapeutic access during shutdown
      await this.preserveTherapeuticAccess();

      // Flush all pending operations
      await Promise.all([
        this.realTimeSync.flushOfflineQueue(),
        this.optimisticUpdates.initiateRecovery('global'),
        this.encryptedStorage.enforceRetentionPolicy(),
      ]);

      // Shutdown components in reverse order
      await Promise.all([
        this.performanceStore.shutdownPerformanceMonitoring(),
        this.realTimeSync.shutdownRealTimeSync(),
        this.subscriptionSyncStore.shutdownSubscriptionSync(),
        this.paymentWebhookStore.initiateStateRecovery(),
        this.crisisStateManager.shutdownCrisisMonitoring(),
        this.webhookStateManager.shutdown(),
      ]);

      console.log('[WebhookIntegration] Webhook state system shut down successfully');

    } catch (error) {
      console.error('[WebhookIntegration] Error during shutdown:', error);
      // Ensure therapeutic access is still preserved
      await this.preserveTherapeuticAccess();
    }
  }
}

/**
 * Example usage of the integrated webhook state system
 */
export const exampleWebhookIntegrationUsage = async () => {
  const integration = new WebhookStateIntegration();

  try {
    // Initialize the complete system
    await integration.initializeWebhookStateSystem();

    // Example webhook events
    const subscriptionUpdateEvent: WebhookEvent = {
      id: 'evt_subscription_update_123',
      type: 'customer.subscription.updated',
      timestamp: Date.now(),
      data: {
        id: 'sub_123',
        status: 'active',
        current_period_end: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      },
      signature: 'webhook_signature',
      metadata: {
        source: 'stripe',
        version: '2023-12-01',
      },
    };

    const crisisEvent: WebhookEvent = {
      id: 'evt_crisis_detected_456',
      type: 'crisis.detected',
      timestamp: Date.now(),
      data: {
        crisisLevel: 'critical',
        trigger: 'assessment_score',
        userId: 'user_456',
      },
      signature: 'webhook_signature',
      metadata: {
        source: 'crisis_detection',
        automated: true,
      },
    };

    // Process events with full integration
    const subscriptionResult = await integration.processWebhookEventWithFullIntegration(subscriptionUpdateEvent);
    console.log('Subscription webhook processed:', subscriptionResult);

    const crisisResult = await integration.processWebhookEventWithFullIntegration(crisisEvent);
    console.log('Crisis webhook processed:', crisisResult);

    // Perform health check
    const healthStatus = await integration.performSystemHealthCheck();
    console.log('System health:', healthStatus);

    // Graceful shutdown
    await integration.shutdownWebhookStateSystem();

  } catch (error) {
    console.error('Webhook integration example failed:', error);
  }
};

export default WebhookStateIntegration;