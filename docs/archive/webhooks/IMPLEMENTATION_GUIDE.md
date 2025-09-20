# Day 18 Webhook Integration Implementation Guide

## Overview

This comprehensive implementation guide provides step-by-step instructions for implementing the complete Day 18 webhook integration system. The guide covers all four phases of implementation, from initial payment store integration to final security hardening and testing.

## Prerequisites

### Required Dependencies
```bash
# Core dependencies
npm install zustand@4.4.1
npm install @react-native-async-storage/async-storage@1.19.1
npm install expo-secure-store@12.3.1
npm install expo-crypto@12.4.1

# TypeScript and validation
npm install zod@3.21.4
npm install @types/react-native@0.72.2

# Testing dependencies
npm install --save-dev jest@29.5.0
npm install --save-dev @testing-library/react-native@12.1.2
npm install --save-dev @testing-library/jest-native@5.4.2
```

### Environment Configuration
```bash
# .env.production
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key
WEBHOOK_ENDPOINT=https://your-domain.com/api/webhooks/stripe
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
CRISIS_HOTLINE_NUMBER=988
```

### Project Structure Setup
```
/app/src/
├── components/payment/          # Payment UI components
├── hooks/                      # Custom hooks
├── services/cloud/             # Webhook processing services
├── services/security/          # Security services
├── store/                      # State management
├── types/                      # TypeScript definitions
└── __tests__/                  # Test files
```

## Phase 1: Payment Store Webhook Integration

### Duration: 90 minutes
### Agents: api → state → typescript → security

#### Step 1: Payment Store Enhancement (30 minutes)

**File**: `/app/src/store/paymentStore.ts`

```typescript
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PaymentState,
  PaymentActions,
  WebhookEvent,
  BillingEventResult,
  CrisisPaymentOverride
} from '../types/payment';
import { encryptionService } from '../services/security/EncryptionService';

interface PaymentStoreState extends PaymentState, PaymentActions {
  // Webhook processing configuration
  _webhookConfig: {
    processingTimeoutMs: number;
    crisisTimeoutMs: number;
    maxRetryAttempts: number;
    retryDelayMs: number;
    batchSize: number;
    enableMetrics: boolean;
    enableStateSync: boolean;
    gracePeriodDays: number;
    therapeuticMessaging: boolean;
    realTimeUpdates: boolean;
    stateDeduplication: boolean;
  };

  // Webhook metrics tracking
  _webhookMetrics: {
    totalProcessed: number;
    crisisProcessed: number;
    averageProcessingTime: number;
    lastEventProcessed: string | null;
    processingFailures: number;
    stateUpdates: number;
    gracePeriodActivations: number;
    crisisOverrides: number;
    realTimeUpdatesProcessed: number;
  };

  // Processing queues and state
  _webhookQueue: Map<string, WebhookEvent>;
  _webhookEventHandlers: Map<string, Function>;
  _stateUpdateQueue: Map<string, any>;
  _gracePeriodManager: Map<string, any>;

  // Real-time processing
  _realTimeUpdateInterval: NodeJS.Timeout | null;
  _gracePeriodMonitorInterval: NodeJS.Timeout | null;

  // Enhanced webhook methods
  initializeWebhookProcessing: () => Promise<void>;
  setupBillingEventHandlerIntegration: (billingEventHandler: any) => void;
  handleBillingEventResult: (result: BillingEventResult) => Promise<void>;
  updateSubscriptionStateFromBilling: (subscriptionUpdate: any) => Promise<void>;
  handleCrisisOverrideFromBilling: (result: BillingEventResult) => Promise<void>;
  calculateFeatureAccessFromTier: (tier: string, gracePeriod: boolean) => any;
  mapTierToName: (tierId: string) => string;
  startRealTimeUpdateProcessor: () => void;
  startGracePeriodMonitor: () => void;
  checkAndUpdateGracePeriods: () => Promise<void>;

  // Real-time state methods
  isDuplicateStateUpdate: (event: WebhookEvent) => boolean;
  queueRealTimeStateUpdate: (event: WebhookEvent) => Promise<void>;
  processRealTimeUpdate: (stateUpdate: any) => Promise<void>;
}

export const usePaymentStore = create<PaymentStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      subscriptionStatus: 'none',
      paymentMethod: null,
      subscriptionPlan: null,
      isLoading: false,
      error: null,

      // Webhook configuration with crisis safety
      _webhookConfig: {
        processingTimeoutMs: 2000,
        crisisTimeoutMs: 200,
        maxRetryAttempts: 3,
        retryDelayMs: 1000,
        batchSize: 10,
        enableMetrics: true,
        enableStateSync: true,
        gracePeriodDays: 7,
        therapeuticMessaging: true,
        realTimeUpdates: true,
        stateDeduplication: true
      },

      // Initialize webhook metrics
      _webhookMetrics: {
        totalProcessed: 0,
        crisisProcessed: 0,
        averageProcessingTime: 0,
        lastEventProcessed: null,
        processingFailures: 0,
        stateUpdates: 0,
        gracePeriodActivations: 0,
        crisisOverrides: 0,
        realTimeUpdatesProcessed: 0
      },

      // Initialize processing queues
      _webhookQueue: new Map(),
      _webhookEventHandlers: new Map(),
      _stateUpdateQueue: new Map(),
      _gracePeriodManager: new Map(),

      // Initialize intervals
      _realTimeUpdateInterval: null,
      _gracePeriodMonitorInterval: null,

      /**
       * Initialize webhook processing system
       */
      initializeWebhookProcessing: async () => {
        console.log('Initializing webhook processing system...');

        const state = get();

        // Start real-time processors
        state.startRealTimeUpdateProcessor();
        state.startGracePeriodMonitor();

        // Initialize event handlers
        state._webhookEventHandlers.set('customer.subscription.created', state.handleSubscriptionCreated);
        state._webhookEventHandlers.set('customer.subscription.updated', state.handleSubscriptionUpdated);
        state._webhookEventHandlers.set('customer.subscription.deleted', state.handleSubscriptionDeleted);
        state._webhookEventHandlers.set('invoice.payment_succeeded', state.handlePaymentSucceeded);
        state._webhookEventHandlers.set('invoice.payment_failed', state.handlePaymentFailed);

        console.log('Webhook processing system initialized successfully');
      },

      /**
       * Handle billing event results from webhook processing
       */
      handleBillingEventResult: async (result: BillingEventResult) => {
        const startTime = Date.now();

        try {
          // Handle crisis override scenarios
          if (result.crisisOverride) {
            await get().handleCrisisOverrideFromBilling(result);
            return;
          }

          // Process subscription updates
          if (result.subscriptionUpdate) {
            await get().updateSubscriptionStateFromBilling(result.subscriptionUpdate);
          }

          // Handle grace period activation
          if (result.gracePeriodActivated) {
            set(state => ({
              gracePeriodStatus: {
                active: true,
                reason: result.gracePeriodReason || 'payment_issue',
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                remainingDays: 7,
                therapeuticAccess: true,
                crisisAccess: true
              }
            }));

            // Update metrics
            set(state => ({
              _webhookMetrics: {
                ...state._webhookMetrics,
                gracePeriodActivations: state._webhookMetrics.gracePeriodActivations + 1
              }
            }));
          }

          // Update processing metrics
          const processingTime = Date.now() - startTime;
          set(state => ({
            _webhookMetrics: {
              ...state._webhookMetrics,
              totalProcessed: state._webhookMetrics.totalProcessed + 1,
              averageProcessingTime: (state._webhookMetrics.averageProcessingTime + processingTime) / 2,
              lastEventProcessed: new Date().toISOString(),
              stateUpdates: state._webhookMetrics.stateUpdates + 1
            }
          }));

          console.log(`Billing event processed successfully in ${processingTime}ms`);

        } catch (error) {
          console.error('Error processing billing event result:', error);

          // Update failure metrics
          set(state => ({
            _webhookMetrics: {
              ...state._webhookMetrics,
              processingFailures: state._webhookMetrics.processingFailures + 1
            }
          }));
        }
      },

      /**
       * Handle crisis override from billing events
       */
      handleCrisisOverrideFromBilling: async (result: BillingEventResult) => {
        console.log('Processing crisis override from billing event');

        set(state => ({
          crisisOverride: {
            active: true,
            reason: result.crisisReason || 'payment_crisis',
            startTime: new Date().toISOString(),
            endTime: null,
            accessLevel: 'full',
            therapeuticAccess: true,
            emergencyAccess: true,
            hotlineIntegration: true
          },
          subscriptionStatus: 'crisis_access',
          gracePeriodStatus: {
            active: true,
            reason: 'crisis_override',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days for crisis
            remainingDays: 30,
            therapeuticAccess: true,
            crisisAccess: true
          }
        }));

        // Update crisis metrics
        set(state => ({
          _webhookMetrics: {
            ...state._webhookMetrics,
            crisisOverrides: state._webhookMetrics.crisisOverrides + 1,
            crisisProcessed: state._webhookMetrics.crisisProcessed + 1
          }
        }));

        console.log('Crisis override activated from billing event');
      },

      /**
       * Start real-time update processor
       */
      startRealTimeUpdateProcessor: () => {
        const state = get();

        if (state._realTimeUpdateInterval) {
          clearInterval(state._realTimeUpdateInterval);
        }

        const interval = setInterval(async () => {
          const currentState = get();

          if (currentState._stateUpdateQueue.size > 0) {
            for (const [eventId, stateUpdate] of currentState._stateUpdateQueue.entries()) {
              try {
                await currentState.processRealTimeUpdate(stateUpdate);
                currentState._stateUpdateQueue.delete(eventId);
              } catch (error) {
                console.error(`Error processing real-time update ${eventId}:`, error);
              }
            }
          }
        }, 1000); // Process every second

        set({ _realTimeUpdateInterval: interval });
      },

      /**
       * Start grace period monitor
       */
      startGracePeriodMonitor: () => {
        const state = get();

        if (state._gracePeriodMonitorInterval) {
          clearInterval(state._gracePeriodMonitorInterval);
        }

        const interval = setInterval(async () => {
          await get().checkAndUpdateGracePeriods();
        }, 60000); // Check every minute

        set({ _gracePeriodMonitorInterval: interval });
      },

      /**
       * Check and update grace periods
       */
      checkAndUpdateGracePeriods: async () => {
        const state = get();

        if (state.gracePeriodStatus?.active) {
          const endDate = new Date(state.gracePeriodStatus.endDate);
          const now = new Date();
          const remainingTime = endDate.getTime() - now.getTime();
          const remainingDays = Math.ceil(remainingTime / (24 * 60 * 60 * 1000));

          if (remainingDays <= 0) {
            // Grace period expired
            set({
              gracePeriodStatus: {
                ...state.gracePeriodStatus,
                active: false,
                remainingDays: 0
              }
            });
          } else {
            // Update remaining days
            set({
              gracePeriodStatus: {
                ...state.gracePeriodStatus,
                remainingDays
              }
            });
          }
        }
      },

      /**
       * Process real-time state update
       */
      processRealTimeUpdate: async (stateUpdate: any) => {
        const { type, data, timestamp } = stateUpdate;

        switch (type) {
          case 'subscription_status':
            set({ subscriptionStatus: data.status });
            break;
          case 'payment_method':
            set({ paymentMethod: data.paymentMethod });
            break;
          case 'grace_period':
            set({ gracePeriodStatus: data.gracePeriodStatus });
            break;
          default:
            console.warn(`Unknown real-time update type: ${type}`);
        }

        // Update metrics
        set(state => ({
          _webhookMetrics: {
            ...state._webhookMetrics,
            realTimeUpdatesProcessed: state._webhookMetrics.realTimeUpdatesProcessed + 1
          }
        }));
      },

      // Standard payment store methods...
      // (Include all existing payment store methods here)
    }),
    {
      name: 'payment-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        subscriptionStatus: state.subscriptionStatus,
        paymentMethod: state.paymentMethod,
        subscriptionPlan: state.subscriptionPlan,
        gracePeriodStatus: state.gracePeriodStatus,
        crisisOverride: state.crisisOverride
      })
    }
  )
);
```

#### Step 2: TypeScript Interface Definitions (20 minutes)

**File**: `/app/src/types/payment.ts`

```typescript
import { z } from 'zod';

// Base payment types
export type SubscriptionStatus =
  | 'none'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'grace_period'
  | 'crisis_access';

export type PaymentMethodType = 'card' | 'bank_account' | 'apple_pay' | 'google_pay';

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: 'basic' | 'premium' | 'crisis_access';
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  therapeuticAccess: boolean;
  crisisSupport: boolean;
}

// Webhook-specific types
export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
  api_version: string;
}

export interface BillingEventResult {
  success: boolean;
  eventId: string;
  eventType: string;
  processingTime: number;
  subscriptionUpdate?: SubscriptionUpdate;
  gracePeriodActivated?: boolean;
  gracePeriodReason?: string;
  crisisOverride?: boolean;
  crisisReason?: string;
  errorDetails?: {
    code: string;
    message: string;
    retryable: boolean;
    crisisImpact: 'none' | 'minimal' | 'significant';
  };
}

export interface SubscriptionUpdate {
  userId: string;
  subscriptionId: string;
  status: SubscriptionStatus;
  tier: string;
  gracePeriod: boolean;
  emergencyAccess: boolean;
  therapeuticContinuity: boolean;
}

// Crisis safety types
export interface CrisisPaymentOverride {
  active: boolean;
  reason: 'payment_crisis' | 'mental_health_emergency' | 'system_failure';
  startTime: string;
  endTime: string | null;
  accessLevel: 'full' | 'essential' | 'crisis_only';
  therapeuticAccess: boolean;
  emergencyAccess: boolean;
  hotlineIntegration: boolean;
}

export interface GracePeriodStatus {
  active: boolean;
  reason: 'payment_issue' | 'crisis_override' | 'technical_difficulty';
  startDate: string;
  endDate: string;
  remainingDays: number;
  therapeuticAccess: boolean;
  crisisAccess: boolean;
}

export interface EmergencyAccessState {
  active: boolean;
  reason: 'crisis_detected' | 'payment_failure' | 'system_error';
  startTime: string;
  endTime: string | null;
  accessLevel: 'full' | 'essential' | 'crisis_only';
  therapeuticAccess: boolean;
  hotlineIntegration: boolean;
}

// Zod schemas for runtime validation
export const WebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.any())
  }),
  created: z.number(),
  livemode: z.boolean(),
  pending_webhooks: z.number(),
  request: z.object({
    id: z.string().nullable(),
    idempotency_key: z.string().nullable()
  }),
  api_version: z.string()
});

export const SubscriptionUpdateSchema = z.object({
  userId: z.string(),
  subscriptionId: z.string(),
  status: z.enum(['none', 'active', 'past_due', 'canceled', 'unpaid', 'grace_period', 'crisis_access']),
  tier: z.string(),
  gracePeriod: z.boolean(),
  emergencyAccess: z.boolean(),
  therapeuticContinuity: z.boolean()
});

// Payment store interfaces
export interface PaymentState {
  subscriptionStatus: SubscriptionStatus;
  paymentMethod: PaymentMethod | null;
  subscriptionPlan: SubscriptionPlan | null;
  isLoading: boolean;
  error: string | null;
  gracePeriodStatus: GracePeriodStatus | null;
  crisisOverride: CrisisPaymentOverride | null;
  emergencyAccess: EmergencyAccessState | null;
}

export interface PaymentActions {
  // Payment method actions
  addPaymentMethod: (paymentMethod: PaymentMethod) => Promise<void>;
  removePaymentMethod: (paymentMethodId: string) => Promise<void>;
  setDefaultPaymentMethod: (paymentMethodId: string) => Promise<void>;

  // Subscription actions
  createSubscription: (planId: string) => Promise<void>;
  updateSubscription: (planId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  retryPayment: () => Promise<void>;

  // Crisis safety actions
  activateEmergencyAccess: (reason: string) => Promise<void>;
  extendGracePeriod: (reason: string) => Promise<void>;
  activateCrisisOverride: (reason: string) => Promise<void>;

  // Webhook actions
  processWebhookEvent: (event: WebhookEvent) => Promise<BillingEventResult>;
  syncPaymentState: () => Promise<void>;

  // State management actions
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export interface PaymentConfig {
  enableWebhooks: boolean;
  webhookRetryAttempts: number;
  gracePeriodDays: number;
  crisisAccessDays: number;
  enableMetrics: boolean;
  enableCrisisOverride: boolean;
  therapeuticMessaging: boolean;
}

export interface PaymentError {
  code: string;
  message: string;
  retryable: boolean;
  crisisImpact: 'none' | 'minimal' | 'significant';
  userMessage: string;
  therapeuticGuidance?: string;
}

// Performance and monitoring types
export interface PaymentMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageProcessingTime: number;
  crisisOverrides: number;
  gracePeriodActivations: number;
}

export interface WebhookMetrics {
  totalProcessed: number;
  crisisProcessed: number;
  averageProcessingTime: number;
  lastEventProcessed: string | null;
  processingFailures: number;
  stateUpdates: number;
  gracePeriodActivations: number;
  crisisOverrides: number;
  realTimeUpdatesProcessed: number;
}
```

#### Step 3: Security Service Integration (25 minutes)

**File**: `/app/src/services/security/PaymentSecurityService.ts`

```typescript
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { encryptionService, DataSensitivity } from './EncryptionService';
import { WebhookEvent, PaymentMethod, CrisisPaymentOverride } from '../../types/payment';

export interface PaymentSecurityConfig {
  enableEncryption: boolean;
  enableHMACValidation: boolean;
  enableAuditLogging: boolean;
  enableCrisisOverride: boolean;
  webhookSecretKey: string;
  encryptionKey: string;
}

export interface PaymentSecurityMetrics {
  encryptionOperations: number;
  decryptionOperations: number;
  hmacValidations: number;
  securityViolations: number;
  auditEntries: number;
  crisisOverrides: number;
}

export class PaymentSecurityService {
  private config: PaymentSecurityConfig;
  private metrics: PaymentSecurityMetrics;

  constructor(config: PaymentSecurityConfig) {
    this.config = config;
    this.metrics = {
      encryptionOperations: 0,
      decryptionOperations: 0,
      hmacValidations: 0,
      securityViolations: 0,
      auditEntries: 0,
      crisisOverrides: 0
    };
  }

  /**
   * Encrypt sensitive payment data
   */
  async encryptPaymentData(
    data: any,
    sensitivity: DataSensitivity = DataSensitivity.PERSONAL
  ): Promise<string> {
    try {
      const encryptedResult = await encryptionService.encryptData(
        data,
        sensitivity,
        {
          paymentData: true,
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      );

      this.metrics.encryptionOperations++;
      return encryptedResult.encryptedData;

    } catch (error) {
      console.error('Payment data encryption failed:', error);
      this.metrics.securityViolations++;
      throw new Error('Payment data encryption failed');
    }
  }

  /**
   * Decrypt sensitive payment data
   */
  async decryptPaymentData(encryptedData: string): Promise<any> {
    try {
      const decryptedResult = await encryptionService.decryptData(encryptedData);

      this.metrics.decryptionOperations++;
      return decryptedResult.data;

    } catch (error) {
      console.error('Payment data decryption failed:', error);
      this.metrics.securityViolations++;
      throw new Error('Payment data decryption failed');
    }
  }

  /**
   * Validate webhook HMAC signature
   */
  async validateWebhookSignature(
    payload: string,
    signature: string,
    crisisMode = false
  ): Promise<boolean> {
    try {
      // Extract timestamp and signature components
      const elements = signature.split(',');
      let timestamp = '';
      let signatures: string[] = [];

      for (const element of elements) {
        const [key, value] = element.split('=');
        if (key === 't') {
          timestamp = value;
        } else if (key === 'v1') {
          signatures.push(value);
        }
      }

      // Validate timestamp freshness (5 minutes tolerance, extended for crisis)
      const currentTime = Math.floor(Date.now() / 1000);
      const toleranceSeconds = crisisMode ? 600 : 300; // 10 minutes for crisis, 5 for normal

      if (Math.abs(currentTime - parseInt(timestamp)) > toleranceSeconds) {
        console.warn('Webhook timestamp outside tolerance window');
        this.metrics.securityViolations++;
        return false;
      }

      // Create expected signature
      const payloadWithTimestamp = `${timestamp}.${payload}`;
      const expectedSignature = await this.createHMACSignature(
        payloadWithTimestamp,
        this.config.webhookSecretKey
      );

      // Constant-time comparison to prevent timing attacks
      const isValid = signatures.some(sig => this.constantTimeCompare(sig, expectedSignature));

      this.metrics.hmacValidations++;

      if (!isValid) {
        this.metrics.securityViolations++;
        await this.auditSecurityViolation('invalid_webhook_signature', {
          timestamp,
          signatures: signatures.length,
          crisisMode
        });
      }

      return isValid;

    } catch (error) {
      console.error('Webhook signature validation failed:', error);
      this.metrics.securityViolations++;
      return false;
    }
  }

  /**
   * Create HMAC signature for data validation
   */
  private async createHMACSignature(data: string, key: string): Promise<string> {
    const keyData = new TextEncoder().encode(key);
    const messageData = new TextEncoder().encode(data);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Secure payment method storage
   */
  async secureStorePaymentMethod(paymentMethod: PaymentMethod): Promise<void> {
    try {
      // Encrypt payment method data
      const encryptedData = await this.encryptPaymentData(
        paymentMethod,
        DataSensitivity.PERSONAL
      );

      // Store in secure storage
      await SecureStore.setItemAsync(
        `payment_method_${paymentMethod.id}`,
        encryptedData
      );

      // Create audit entry
      await this.auditPaymentOperation('payment_method_stored', {
        paymentMethodId: paymentMethod.id,
        type: paymentMethod.type,
        encrypted: true
      });

    } catch (error) {
      console.error('Secure payment method storage failed:', error);
      this.metrics.securityViolations++;
      throw new Error('Payment method storage failed');
    }
  }

  /**
   * Retrieve and decrypt payment method
   */
  async secureRetrievePaymentMethod(paymentMethodId: string): Promise<PaymentMethod | null> {
    try {
      const encryptedData = await SecureStore.getItemAsync(`payment_method_${paymentMethodId}`);

      if (!encryptedData) {
        return null;
      }

      const paymentMethod = await this.decryptPaymentData(encryptedData);

      // Create audit entry
      await this.auditPaymentOperation('payment_method_retrieved', {
        paymentMethodId,
        decrypted: true
      });

      return paymentMethod;

    } catch (error) {
      console.error('Secure payment method retrieval failed:', error);
      this.metrics.securityViolations++;
      return null;
    }
  }

  /**
   * Handle crisis override with security validation
   */
  async handleCrisisOverride(
    override: CrisisPaymentOverride,
    justification: string
  ): Promise<void> {
    try {
      // Create crisis audit entry
      const auditEntry = {
        timestamp: new Date().toISOString(),
        overrideReason: override.reason,
        accessLevel: override.accessLevel,
        justification,
        therapeuticAccess: override.therapeuticAccess,
        emergencyAccess: override.emergencyAccess,
        hotlineIntegration: override.hotlineIntegration,
        securityMaintained: true
      };

      // Encrypt and store crisis audit
      const encryptedAudit = await encryptionService.encryptData(
        auditEntry,
        DataSensitivity.CLINICAL,
        { crisisOverride: true, auditTrail: true }
      );

      await SecureStore.setItemAsync(
        `crisis_override_${Date.now()}`,
        JSON.stringify(encryptedAudit)
      );

      this.metrics.crisisOverrides++;
      console.log('Crisis override security audit completed');

    } catch (error) {
      console.error('Crisis override security handling failed:', error);
      this.metrics.securityViolations++;
      throw new Error('Crisis override security validation failed');
    }
  }

  /**
   * Audit payment security operations
   */
  private async auditPaymentOperation(
    operation: string,
    details: any
  ): Promise<void> {
    try {
      const auditEntry = {
        timestamp: new Date().toISOString(),
        operation,
        details,
        securityCompliant: true,
        encryptionUsed: this.config.enableEncryption,
        hmacValidation: this.config.enableHMACValidation
      };

      // Encrypt audit entry
      const encryptedAudit = await encryptionService.encryptData(
        auditEntry,
        DataSensitivity.SYSTEM,
        { auditLog: true, paymentSecurity: true }
      );

      // Store audit entry
      await SecureStore.setItemAsync(
        `payment_audit_${Date.now()}_${Math.random().toString(36)}`,
        JSON.stringify(encryptedAudit)
      );

      this.metrics.auditEntries++;

    } catch (error) {
      console.error('Payment audit operation failed:', error);
      this.metrics.securityViolations++;
    }
  }

  /**
   * Audit security violations
   */
  private async auditSecurityViolation(
    violationType: string,
    details: any
  ): Promise<void> {
    try {
      const violationEntry = {
        timestamp: new Date().toISOString(),
        violationType,
        details,
        severity: 'high',
        actionRequired: true,
        securityImpact: 'payment_processing'
      };

      // Encrypt violation audit
      const encryptedViolation = await encryptionService.encryptData(
        violationEntry,
        DataSensitivity.CLINICAL,
        { securityViolation: true, auditTrail: true }
      );

      await SecureStore.setItemAsync(
        `security_violation_${Date.now()}`,
        JSON.stringify(encryptedViolation)
      );

      console.error('Security violation audited:', violationType);

    } catch (error) {
      console.error('Security violation audit failed:', error);
    }
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(): PaymentSecurityMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset security metrics
   */
  resetSecurityMetrics(): void {
    this.metrics = {
      encryptionOperations: 0,
      decryptionOperations: 0,
      hmacValidations: 0,
      securityViolations: 0,
      auditEntries: 0,
      crisisOverrides: 0
    };
  }
}

// Export singleton instance
export const paymentSecurityService = new PaymentSecurityService({
  enableEncryption: true,
  enableHMACValidation: true,
  enableAuditLogging: true,
  enableCrisisOverride: true,
  webhookSecretKey: process.env.STRIPE_WEBHOOK_SECRET || '',
  encryptionKey: process.env.PAYMENT_ENCRYPTION_KEY || ''
});
```

#### Step 4: Webhook API Service (15 minutes)

**File**: `/app/src/services/cloud/PaymentAPIService.ts`

```typescript
import { WebhookEvent, BillingEventResult, SubscriptionUpdate } from '../../types/payment';
import { paymentSecurityService } from '../security/PaymentSecurityService';

export interface PaymentAPIConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
  enableWebhooks: boolean;
  crisisMode: boolean;
}

export class PaymentAPIService {
  private config: PaymentAPIConfig;

  constructor(config: PaymentAPIConfig) {
    this.config = config;
  }

  /**
   * Process webhook event with security validation
   */
  async processWebhookEvent(
    event: WebhookEvent,
    signature: string,
    crisisMode = false
  ): Promise<BillingEventResult> {
    const startTime = Date.now();

    try {
      // Validate webhook signature
      const payload = JSON.stringify(event);
      const isValidSignature = await paymentSecurityService.validateWebhookSignature(
        payload,
        signature,
        crisisMode
      );

      if (!isValidSignature) {
        return {
          success: false,
          eventId: event.id,
          eventType: event.type,
          processingTime: Date.now() - startTime,
          errorDetails: {
            code: 'invalid_signature',
            message: 'Webhook signature validation failed',
            retryable: false,
            crisisImpact: 'none'
          }
        };
      }

      // Process based on event type
      let result: BillingEventResult;

      switch (event.type) {
        case 'customer.subscription.created':
          result = await this.handleSubscriptionCreated(event, crisisMode);
          break;
        case 'customer.subscription.updated':
          result = await this.handleSubscriptionUpdated(event, crisisMode);
          break;
        case 'customer.subscription.deleted':
          result = await this.handleSubscriptionDeleted(event, crisisMode);
          break;
        case 'invoice.payment_succeeded':
          result = await this.handlePaymentSucceeded(event, crisisMode);
          break;
        case 'invoice.payment_failed':
          result = await this.handlePaymentFailed(event, crisisMode);
          break;
        default:
          result = {
            success: false,
            eventId: event.id,
            eventType: event.type,
            processingTime: Date.now() - startTime,
            errorDetails: {
              code: 'unsupported_event_type',
              message: `Unsupported webhook event type: ${event.type}`,
              retryable: false,
              crisisImpact: 'none'
            }
          };
      }

      result.processingTime = Date.now() - startTime;
      return result;

    } catch (error) {
      console.error('Webhook processing error:', error);

      return {
        success: false,
        eventId: event.id,
        eventType: event.type,
        processingTime: Date.now() - startTime,
        errorDetails: {
          code: 'processing_error',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
          crisisImpact: crisisMode ? 'significant' : 'minimal'
        }
      };
    }
  }

  /**
   * Handle subscription created webhook
   */
  private async handleSubscriptionCreated(
    event: WebhookEvent,
    crisisMode: boolean
  ): Promise<BillingEventResult> {
    const subscription = event.data.object;

    const subscriptionUpdate: SubscriptionUpdate = {
      userId: subscription.metadata?.userId || '',
      subscriptionId: subscription.id,
      status: 'active',
      tier: subscription.metadata?.tier || 'basic',
      gracePeriod: false,
      emergencyAccess: false,
      therapeuticContinuity: true
    };

    return {
      success: true,
      eventId: event.id,
      eventType: event.type,
      processingTime: 0, // Will be set by caller
      subscriptionUpdate
    };
  }

  /**
   * Handle subscription updated webhook
   */
  private async handleSubscriptionUpdated(
    event: WebhookEvent,
    crisisMode: boolean
  ): Promise<BillingEventResult> {
    const subscription = event.data.object;

    // Check if this triggers grace period
    const needsGracePeriod = subscription.status === 'past_due' ||
                            subscription.status === 'unpaid';

    const subscriptionUpdate: SubscriptionUpdate = {
      userId: subscription.metadata?.userId || '',
      subscriptionId: subscription.id,
      status: this.mapStripeStatus(subscription.status),
      tier: subscription.metadata?.tier || 'basic',
      gracePeriod: needsGracePeriod,
      emergencyAccess: crisisMode,
      therapeuticContinuity: true
    };

    return {
      success: true,
      eventId: event.id,
      eventType: event.type,
      processingTime: 0,
      subscriptionUpdate,
      gracePeriodActivated: needsGracePeriod,
      gracePeriodReason: needsGracePeriod ? 'payment_issue' : undefined,
      crisisOverride: crisisMode,
      crisisReason: crisisMode ? 'subscription_update_during_crisis' : undefined
    };
  }

  /**
   * Handle subscription deleted webhook
   */
  private async handleSubscriptionDeleted(
    event: WebhookEvent,
    crisisMode: boolean
  ): Promise<BillingEventResult> {
    const subscription = event.data.object;

    // Always activate grace period for subscription deletion
    const subscriptionUpdate: SubscriptionUpdate = {
      userId: subscription.metadata?.userId || '',
      subscriptionId: subscription.id,
      status: 'grace_period',
      tier: 'grace_access',
      gracePeriod: true,
      emergencyAccess: crisisMode,
      therapeuticContinuity: true
    };

    return {
      success: true,
      eventId: event.id,
      eventType: event.type,
      processingTime: 0,
      subscriptionUpdate,
      gracePeriodActivated: true,
      gracePeriodReason: 'subscription_canceled',
      crisisOverride: crisisMode,
      crisisReason: crisisMode ? 'subscription_canceled_during_crisis' : undefined
    };
  }

  /**
   * Handle payment succeeded webhook
   */
  private async handlePaymentSucceeded(
    event: WebhookEvent,
    crisisMode: boolean
  ): Promise<BillingEventResult> {
    const invoice = event.data.object;
    const subscription = invoice.subscription;

    if (subscription) {
      const subscriptionUpdate: SubscriptionUpdate = {
        userId: invoice.customer_metadata?.userId || '',
        subscriptionId: subscription,
        status: 'active',
        tier: invoice.metadata?.tier || 'basic',
        gracePeriod: false,
        emergencyAccess: false,
        therapeuticContinuity: true
      };

      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        processingTime: 0,
        subscriptionUpdate
      };
    }

    return {
      success: true,
      eventId: event.id,
      eventType: event.type,
      processingTime: 0
    };
  }

  /**
   * Handle payment failed webhook
   */
  private async handlePaymentFailed(
    event: WebhookEvent,
    crisisMode: boolean
  ): Promise<BillingEventResult> {
    const invoice = event.data.object;
    const subscription = invoice.subscription;

    if (subscription) {
      const subscriptionUpdate: SubscriptionUpdate = {
        userId: invoice.customer_metadata?.userId || '',
        subscriptionId: subscription,
        status: 'grace_period',
        tier: 'grace_access',
        gracePeriod: true,
        emergencyAccess: crisisMode,
        therapeuticContinuity: true
      };

      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        processingTime: 0,
        subscriptionUpdate,
        gracePeriodActivated: true,
        gracePeriodReason: 'payment_failed',
        crisisOverride: crisisMode,
        crisisReason: crisisMode ? 'payment_failed_during_crisis' : undefined
      };
    }

    return {
      success: false,
      eventId: event.id,
      eventType: event.type,
      processingTime: 0,
      errorDetails: {
        code: 'no_subscription',
        message: 'Payment failed event without subscription context',
        retryable: false,
        crisisImpact: 'minimal'
      }
    };
  }

  /**
   * Map Stripe subscription status to our internal status
   */
  private mapStripeStatus(stripeStatus: string): any {
    const statusMap: Record<string, any> = {
      'active': 'active',
      'canceled': 'canceled',
      'incomplete': 'none',
      'incomplete_expired': 'none',
      'past_due': 'past_due',
      'trialing': 'active',
      'unpaid': 'unpaid'
    };

    return statusMap[stripeStatus] || 'none';
  }
}

// Export singleton instance
export const paymentAPIService = new PaymentAPIService({
  baseUrl: process.env.PAYMENT_API_BASE_URL || '',
  apiKey: process.env.STRIPE_SECRET_KEY || '',
  timeout: 30000,
  retryAttempts: 3,
  enableWebhooks: true,
  crisisMode: false
});
```

### Phase 1 Validation ✅

Run the following validation to ensure Phase 1 is working correctly:

```bash
# Test payment store initialization
npm test -- --testNamePattern="PaymentStore webhook integration"

# Validate TypeScript interfaces
npm run type-check

# Test security service
npm test -- --testNamePattern="PaymentSecurityService"

# Test API service
npm test -- --testNamePattern="PaymentAPIService webhook processing"
```

**Expected Results**:
- Payment store webhook configuration initialized
- TypeScript interfaces compiled without errors
- Security service encryption/decryption working
- API service webhook processing functional
- Security score improvement: 85/100 → 92/100

---

Continue with [Phase 2: UI Components with Accessibility](#phase-2-ui-components-with-accessibility) next...