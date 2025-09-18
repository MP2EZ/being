/**
 * Payment Store for FullMind MBCT App
 *
 * Zustand-based state management for payment operations with:
 * - Crisis-safe payment state management
 * - HIPAA-compliant payment data handling
 * - Offline payment tracking with sync
 * - Subscription management with therapeutic continuity
 * - Integration with existing FullMind state architecture
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  PaymentState,
  PaymentActions,
  PaymentConfig,
  CustomerData,
  CustomerResult,
  PaymentMethodData,
  PaymentMethodResult,
  PaymentIntentData,
  PaymentIntentResult,
  SubscriptionPlan,
  SubscriptionResult,
  PaymentError,
  CrisisPaymentOverride
} from '../types/payment';
import { paymentAPIService } from '../services/cloud/PaymentAPIService';
import { encryptionService } from '../services/security/EncryptionService';
import { WebhookEvent, BillingEventResult } from '../services/cloud/BillingEventHandler';

/**
 * Payment Store State with Crisis Safety Integration
 */
interface PaymentStoreState extends PaymentState, PaymentActions {
  // Internal state management
  _lastSyncTime: string | null;
  _pendingSyncs: string[];
  _offlineQueue: any[];
  _performanceMetrics: {
    paymentSuccessRate: number;
    averageProcessingTime: number;
    crisisOverrideCount: number;
    lastErrorTime: string | null;
  };

  // Enhanced webhook processing state
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
  _webhookQueue: Map<string, any>;
  _webhookEventHandlers: Map<string, Function>;
  _stateUpdateQueue: Map<string, any>;
  _gracePeriodManager: Map<string, any>;

  // Process management
  _realTimeUpdateInterval: NodeJS.Timeout | null;
  _gracePeriodMonitorInterval: NodeJS.Timeout | null;
  _monitoringInterval: NodeJS.Timeout | null;

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

  // Real-time update methods
  isDuplicateStateUpdate: (event: WebhookEvent) => boolean;
  queueRealTimeStateUpdate: (event: WebhookEvent) => Promise<void>;
  processRealTimeUpdate: (stateUpdate: any) => Promise<void>;
  processQueuedRealTimeUpdates: () => Promise<void>;

  // Grace period management
  isGracePeriodEvent: (eventType: string) => boolean;
  handleGracePeriodWebhook: (event: WebhookEvent, result: any) => Promise<void>;
  getGracePeriodReason: (eventType: string) => string;

  // Therapeutic messaging
  sendTherapeuticWebhookMessage: (event: WebhookEvent, result: any) => Promise<void>;
  generateTherapeuticMessage: (eventType: string, context: any) => any;
  storeTherapeuticMessage: (userId: string, message: any) => Promise<void>;

  // Enhanced cleanup
  cleanupWebhookResources: () => Promise<void>;
}

/**
 * Crisis-Safe Payment Store Configuration
 */
const STORAGE_CONFIG = {
  name: 'fullmind-payment-store',
  storage: createJSONStorage(() => ({
    getItem: async (name: string): Promise<string | null> => {
      try {
        const encryptedData = await AsyncStorage.getItem(name);
        if (!encryptedData) return null;

        // Decrypt payment data using system-level encryption (not PHI)
        const parsedData = JSON.parse(encryptedData);
        const decryptedData = await encryptionService.decryptData(parsedData, 'SYSTEM');
        return JSON.stringify(decryptedData);
      } catch (error) {
        console.error('Payment store getItem failed:', error);
        return null;
      }
    },
    setItem: async (name: string, value: string): Promise<void> => {
      try {
        // Encrypt payment data before storage
        const parsedValue = JSON.parse(value);
        const encryptedData = await encryptionService.encryptData(
          parsedValue,
          'SYSTEM',
          { paymentData: true, pciCompliant: true }
        );
        await AsyncStorage.setItem(name, JSON.stringify(encryptedData));
      } catch (error) {
        console.error('Payment store setItem failed:', error);
        // Don't throw - payment failures should not break app
      }
    },
    removeItem: async (name: string): Promise<void> => {
      try {
        await AsyncStorage.removeItem(name);
      } catch (error) {
        console.error('Payment store removeItem failed:', error);
      }
    }
  })),
  partialize: (state: PaymentStoreState) => ({
    // Only persist non-sensitive payment data
    customer: state.customer ? {
      ...state.customer,
      // Remove sensitive fields
      email: undefined,
      defaultPaymentMethod: undefined
    } : null,
    availablePlans: state.availablePlans,
    activeSubscription: state.activeSubscription ? {
      ...state.activeSubscription,
      // Keep only essential subscription info
      paymentMethodId: undefined,
      latestInvoice: undefined
    } : null,
    crisisMode: state.crisisMode,
    _lastSyncTime: state._lastSyncTime,
    _performanceMetrics: state._performanceMetrics
  }),
  version: 1,
  migrate: (persistedState: any, version: number) => {
    // Handle payment store migrations safely
    if (version === 0) {
      return {
        ...persistedState,
        crisisMode: false,
        _performanceMetrics: {
          paymentSuccessRate: 0,
          averageProcessingTime: 0,
          crisisOverrideCount: 0,
          lastErrorTime: null
        }
      };
    }
    return persistedState;
  }
};

/**
 * Crisis-Integrated Payment Store
 */
export const usePaymentStore = create<PaymentStoreState>()(
  persist(
    (set, get) => ({
      // Initial State
      customer: null,
      paymentMethods: [],
      activeSubscription: null,
      availablePlans: [],
      currentPaymentIntent: null,
      paymentInProgress: false,
      lastPaymentError: null,
      crisisMode: false,
      crisisOverride: null,
      securityValidated: false,
      showPaymentSheet: false,
      showSubscriptionSelector: false,
      showPaymentHistory: false,
      loadingCustomer: false,
      loadingPaymentMethods: false,
      loadingSubscription: false,
      loadingPlans: false,

      // Internal state
      _lastSyncTime: null,
      _pendingSyncs: [],
      _offlineQueue: [],
      _performanceMetrics: {
        paymentSuccessRate: 0,
        averageProcessingTime: 0,
        crisisOverrideCount: 0,
        lastErrorTime: null
      },

      // Enhanced webhook processing state - initialized with default configuration
      _webhookConfig: {
        processingTimeoutMs: 5000,
        crisisTimeoutMs: 200,
        maxRetryAttempts: 3,
        retryDelayMs: 1000,
        batchSize: 5,
        enableMetrics: true,
        enableStateSync: true,
        gracePeriodDays: 7,
        therapeuticMessaging: true,
        realTimeUpdates: true,
        stateDeduplication: true
      },
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
      _webhookQueue: new Map<string, any>(),
      _webhookEventHandlers: new Map<string, Function>(),
      _stateUpdateQueue: new Map<string, any>(),
      _gracePeriodManager: new Map<string, any>(),

      // Process management
      _realTimeUpdateInterval: null,
      _gracePeriodMonitorInterval: null,
      _monitoringInterval: null,

      /**
       * Initialization Actions
       */
      initializePayments: async (config: PaymentConfig) => {
        try {
          console.log('Initializing payment store...');

          // Initialize payment API service
          await paymentAPIService.initialize(config);

          // Load available plans immediately
          const plans = await paymentAPIService.getAvailablePlans();
          set({ availablePlans: plans });

          // Validate security configuration
          const securityValidated = paymentAPIService.isInitialized();
          set({ securityValidated });

          // Check for existing crisis mode
          const currentUser = await get().getCurrentUser();
          if (currentUser) {
            const crisisStatus = await paymentAPIService.getCrisisStatus(currentUser.id);
            if (crisisStatus) {
              set({
                crisisMode: true,
                crisisOverride: crisisStatus
              });
              console.log('Crisis mode detected on payment initialization');
            }
          }

          console.log('Payment store initialized successfully');

        } catch (error) {
          console.error('Payment store initialization failed:', error);

          // Enable crisis mode if initialization fails
          set({
            crisisMode: true,
            lastPaymentError: {
              type: 'authentication_error',
              code: 'initialization_failed',
              message: 'Payment system temporarily unavailable',
              retryable: true,
              crisisImpact: 'degraded',
              userMessage: 'Payment features temporarily limited, but all therapeutic features remain available for your safety.'
            } as PaymentError
          });
        }
      },

      /**
       * Customer Management Actions
       */
      loadCustomer: async (userId: string) => {
        const state = get();
        if (state.loadingCustomer) return;

        set({ loadingCustomer: true, lastPaymentError: null });

        try {
          // Crisis mode handling
          if (state.crisisMode) {
            const crisisCustomer: CustomerResult = {
              customerId: `crisis_${userId}`,
              userId,
              email: 'crisis@fullmind.app',
              name: 'Emergency Access',
              created: new Date().toISOString()
            };
            set({ customer: crisisCustomer, loadingCustomer: false });
            return;
          }

          // Try to find existing customer first
          let customer: CustomerResult | null = null;
          try {
            customer = await paymentAPIService.getCustomer(`user_${userId}`);
          } catch (error) {
            console.log('Customer not found, will create when needed');
          }

          set({ customer, loadingCustomer: false });

        } catch (error) {
          console.error('Load customer failed:', error);
          state.handlePaymentError(error);
          set({ loadingCustomer: false });
        }
      },

      createCustomer: async (customerData: CustomerData) => {
        const state = get();
        set({ loadingCustomer: true, lastPaymentError: null });

        try {
          const customer = await paymentAPIService.createCustomer(customerData);
          set({ customer, loadingCustomer: false });

          // Update performance metrics
          const metrics = state._performanceMetrics;
          set({
            _performanceMetrics: {
              ...metrics,
              paymentSuccessRate: (metrics.paymentSuccessRate + 1) / 2
            }
          });

        } catch (error) {
          console.error('Create customer failed:', error);
          state.handlePaymentError(error);
          set({ loadingCustomer: false });
        }
      },

      updateCustomerInfo: async (updates: Partial<CustomerData>) => {
        const state = get();
        const { customer } = state;

        if (!customer) {
          throw new Error('No customer loaded');
        }

        try {
          const updatedCustomer = await paymentAPIService.updateCustomer(customer.customerId, updates);
          set({ customer: updatedCustomer });

        } catch (error) {
          console.error('Update customer failed:', error);
          state.handlePaymentError(error);
        }
      },

      /**
       * Payment Method Actions
       */
      loadPaymentMethods: async () => {
        const state = get();
        const { customer, loadingPaymentMethods } = state;

        if (loadingPaymentMethods || !customer) return;

        set({ loadingPaymentMethods: true, lastPaymentError: null });

        try {
          // Crisis mode - provide empty methods (bypass payment processing)
          if (state.crisisMode) {
            set({ paymentMethods: [], loadingPaymentMethods: false });
            return;
          }

          const paymentMethods = await paymentAPIService.listPaymentMethods(customer.customerId);
          set({ paymentMethods, loadingPaymentMethods: false });

        } catch (error) {
          console.error('Load payment methods failed:', error);
          state.handlePaymentError(error);
          set({ loadingPaymentMethods: false });
        }
      },

      addPaymentMethod: async (paymentMethodData: PaymentMethodData) => {
        const state = get();
        const { customer, crisisMode } = state;

        if (!customer) {
          throw new Error('No customer loaded');
        }

        set({ lastPaymentError: null });

        try {
          const paymentMethod = await paymentAPIService.createPaymentMethod(
            paymentMethodData,
            customer.customerId,
            crisisMode
          );

          // Add to current list
          const updatedMethods = [...state.paymentMethods, paymentMethod];
          set({ paymentMethods: updatedMethods });

          // Set as default if it's the first payment method
          if (state.paymentMethods.length === 0) {
            await state.setDefaultPaymentMethod(paymentMethod.paymentMethodId);
          }

        } catch (error) {
          console.error('Add payment method failed:', error);
          state.handlePaymentError(error);
        }
      },

      removePaymentMethod: async (paymentMethodId: string) => {
        const state = get();

        try {
          await paymentAPIService.deletePaymentMethod(paymentMethodId);

          // Remove from current list
          const updatedMethods = state.paymentMethods.filter(
            pm => pm.paymentMethodId !== paymentMethodId
          );
          set({ paymentMethods: updatedMethods });

        } catch (error) {
          console.error('Remove payment method failed:', error);
          state.handlePaymentError(error);
        }
      },

      setDefaultPaymentMethod: async (paymentMethodId: string) => {
        const state = get();
        const { customer } = state;

        if (!customer) {
          throw new Error('No customer loaded');
        }

        try {
          await paymentAPIService.setDefaultPaymentMethod(customer.customerId, paymentMethodId);

          // Update customer record
          const updatedCustomer = {
            ...customer,
            defaultPaymentMethod: paymentMethodId
          };
          set({ customer: updatedCustomer });

          // Update payment methods list
          const updatedMethods = state.paymentMethods.map(pm => ({
            ...pm,
            isDefault: pm.paymentMethodId === paymentMethodId
          }));
          set({ paymentMethods: updatedMethods });

        } catch (error) {
          console.error('Set default payment method failed:', error);
          state.handlePaymentError(error);
        }
      },

      /**
       * Subscription Management Actions
       */
      loadSubscription: async () => {
        const state = get();
        if (state.loadingSubscription) return;

        set({ loadingSubscription: true, lastPaymentError: null });

        try {
          // Crisis mode - provide emergency subscription
          if (state.crisisMode) {
            const crisisSubscription: SubscriptionResult = {
              subscriptionId: `crisis_sub_${Date.now()}`,
              customerId: state.customer?.customerId || 'crisis_customer',
              status: 'active',
              currentPeriodStart: new Date().toISOString(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              cancelAtPeriodEnd: false,
              plan: {
                planId: 'crisis_access',
                name: 'Emergency Access',
                description: 'Crisis therapeutic access',
                amount: 0,
                currency: 'usd',
                interval: 'month',
                features: [
                  'Full MBCT access during crisis',
                  'Crisis support tools',
                  'Emergency contacts',
                  '988 hotline integration',
                  'Therapeutic continuity guarantee'
                ]
              }
            };
            set({ activeSubscription: crisisSubscription, loadingSubscription: false });
            return;
          }

          // This would fetch active subscription from API
          // For now, set to null - subscription will be created when needed
          set({ activeSubscription: null, loadingSubscription: false });

        } catch (error) {
          console.error('Load subscription failed:', error);
          state.handlePaymentError(error);
          set({ loadingSubscription: false });
        }
      },

      createSubscription: async (planId: string, paymentMethodId?: string, trialDays?: number) => {
        const state = get();
        const { customer, crisisMode } = state;

        if (!customer) {
          throw new Error('No customer loaded');
        }

        set({ lastPaymentError: null });

        try {
          const subscription = await paymentAPIService.createSubscription(
            customer.customerId,
            planId,
            paymentMethodId,
            trialDays,
            crisisMode
          );

          set({ activeSubscription: subscription });

          // Update performance metrics
          const metrics = state._performanceMetrics;
          set({
            _performanceMetrics: {
              ...metrics,
              paymentSuccessRate: (metrics.paymentSuccessRate + 1) / 2
            }
          });

        } catch (error) {
          console.error('Create subscription failed:', error);
          state.handlePaymentError(error);
        }
      },

      updateSubscription: async (updates: Partial<SubscriptionResult>) => {
        const state = get();
        const { activeSubscription } = state;

        if (!activeSubscription) {
          throw new Error('No active subscription');
        }

        try {
          const updatedSubscription = await paymentAPIService.updateSubscription(
            activeSubscription.subscriptionId,
            updates
          );
          set({ activeSubscription: updatedSubscription });

        } catch (error) {
          console.error('Update subscription failed:', error);
          state.handlePaymentError(error);
        }
      },

      cancelSubscription: async (atPeriodEnd = true) => {
        const state = get();
        const { activeSubscription } = state;

        if (!activeSubscription) {
          throw new Error('No active subscription');
        }

        try {
          const canceledSubscription = await paymentAPIService.cancelSubscription(
            activeSubscription.subscriptionId,
            atPeriodEnd
          );
          set({ activeSubscription: canceledSubscription });

        } catch (error) {
          console.error('Cancel subscription failed:', error);
          state.handlePaymentError(error);
        }
      },

      reactivateSubscription: async () => {
        const state = get();
        const { activeSubscription } = state;

        if (!activeSubscription) {
          throw new Error('No subscription to reactivate');
        }

        try {
          const reactivatedSubscription = await paymentAPIService.reactivateSubscription(
            activeSubscription.subscriptionId
          );
          set({ activeSubscription: reactivatedSubscription });

        } catch (error) {
          console.error('Reactivate subscription failed:', error);
          state.handlePaymentError(error);
        }
      },

      /**
       * Payment Processing Actions
       */
      createPaymentIntent: async (paymentData: PaymentIntentData) => {
        const state = get();
        const { crisisMode } = state;

        set({ paymentInProgress: true, lastPaymentError: null });

        try {
          const paymentIntent = await paymentAPIService.createPaymentIntent(paymentData, crisisMode);
          set({ currentPaymentIntent: paymentIntent, paymentInProgress: false });

        } catch (error) {
          console.error('Create payment intent failed:', error);
          state.handlePaymentError(error);
          set({ paymentInProgress: false });
        }
      },

      confirmPayment: async (paymentMethodId?: string) => {
        const state = get();
        const { currentPaymentIntent } = state;

        if (!currentPaymentIntent) {
          throw new Error('No payment intent to confirm');
        }

        set({ paymentInProgress: true, lastPaymentError: null });

        try {
          const startTime = Date.now();
          const confirmedIntent = await paymentAPIService.confirmPaymentIntent(
            currentPaymentIntent.paymentIntentId,
            paymentMethodId
          );

          const processingTime = Date.now() - startTime;

          set({
            currentPaymentIntent: confirmedIntent,
            paymentInProgress: false
          });

          // Update performance metrics
          const metrics = state._performanceMetrics;
          set({
            _performanceMetrics: {
              ...metrics,
              paymentSuccessRate: (metrics.paymentSuccessRate + 1) / 2,
              averageProcessingTime: (metrics.averageProcessingTime + processingTime) / 2
            }
          });

        } catch (error) {
          console.error('Confirm payment failed:', error);
          state.handlePaymentError(error);
          set({ paymentInProgress: false });
        }
      },

      handlePaymentError: (error: any) => {
        const state = get();

        // Create payment error object
        const paymentError: PaymentError = {
          type: error.type || 'api_error',
          code: error.code || 'unknown',
          message: error.message || 'Payment processing failed',
          retryable: error.retryable !== false,
          crisisImpact: state.crisisMode ? 'none' : (error.crisisImpact || 'degraded'),
          userMessage: state.crisisMode
            ? 'Payment temporarily unavailable, but all therapeutic features remain accessible for your safety.'
            : (error.userMessage || 'Payment processing temporarily unavailable. Please try again in a few moments.')
        };

        set({
          lastPaymentError: paymentError,
          _performanceMetrics: {
            ...state._performanceMetrics,
            lastErrorTime: new Date().toISOString()
          }
        });

        console.error('Payment error handled:', paymentError);
      },

      clearPaymentError: () => {
        set({ lastPaymentError: null });
      },

      /**
       * ==========================================================================
       * ENHANCED WEBHOOK EVENT PROCESSING - REAL-TIME STATE MANAGEMENT
       * ==========================================================================
       */

      /**
       * Initialize enhanced webhook processing with BillingEventHandler integration
       */
      initializeWebhookProcessing: async () => {
        const state = get();

        try {
          console.log('Initializing enhanced webhook processing with BillingEventHandler integration...');

          // Import and initialize BillingEventHandler
          const { billingEventHandler } = await import('../services/cloud/BillingEventHandler');

          // Initialize with webhook secret from payment config
          const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'development_webhook_secret';
          await billingEventHandler.initialize(webhookSecret, {
            crisisTimeoutMs: state._webhookConfig.crisisTimeoutMs,
            enableAuditLogging: true,
            maxRetryAttempts: state._webhookConfig.maxRetryAttempts,
            gracePeriodDays: state._webhookConfig.gracePeriodDays
          });

          // Register webhook event handlers
          state.registerWebhookHandlers();

          // Set up integration with BillingEventHandler
          state.setupBillingEventHandlerIntegration(billingEventHandler);

          // Initialize metrics tracking
          set({
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
            }
          });

          // Start real-time update processor
          state.startRealTimeUpdateProcessor();

          // Start grace period monitor
          state.startGracePeriodMonitor();

          console.log('Enhanced webhook processing initialized successfully with BillingEventHandler');

        } catch (error) {
          console.error('Webhook processing initialization failed:', error);
          throw error;
        }
      },

      /**
       * Set up integration with BillingEventHandler for seamless webhook processing
       */
      setupBillingEventHandlerIntegration: (billingEventHandler: any) => {
        const state = get();

        try {
          // Create webhook processing bridge
          const originalProcessWebhook = billingEventHandler.processWebhook.bind(billingEventHandler);

          // Enhance with payment store integration
          billingEventHandler.processWebhook = async (payload: string, signature: string, timestamp: string, crisisMode = false) => {
            const startTime = Date.now();

            try {
              // Process through BillingEventHandler first
              const result = await originalProcessWebhook(payload, signature, timestamp, crisisMode);

              // If successful, update payment store state
              if (result.processed && result.subscriptionUpdate) {
                await state.handleBillingEventResult(result);
              }

              return result;

            } catch (error) {
              console.error('Integrated webhook processing failed:', error);

              // Crisis safety fallback through payment store
              if (crisisMode || state.crisisMode) {
                return await state.handleCrisisWebhookFailure(JSON.parse(payload), Date.now() - startTime);
              }

              throw error;
            }
          };

          console.log('BillingEventHandler integration configured successfully');

        } catch (error) {
          console.error('BillingEventHandler integration setup failed:', error);
        }
      },

      /**
       * Handle billing event result and update payment store state
       */
      handleBillingEventResult: async (result: BillingEventResult) => {
        const state = get();

        try {
          const { subscriptionUpdate, crisisOverride, processingTime } = result;

          // Update subscription state if provided
          if (subscriptionUpdate) {
            await state.updateSubscriptionStateFromBilling(subscriptionUpdate);
          }

          // Handle crisis override activation
          if (crisisOverride) {
            await state.handleCrisisOverrideFromBilling(result);
          }

          // Update performance metrics
          const metrics = state._webhookMetrics;
          set({
            _webhookMetrics: {
              ...metrics,
              totalProcessed: metrics.totalProcessed + 1,
              averageProcessingTime: Math.round((metrics.averageProcessingTime + processingTime) / 2),
              lastEventProcessed: new Date().toISOString(),
              crisisOverrides: crisisOverride ? metrics.crisisOverrides + 1 : metrics.crisisOverrides
            }
          });

          console.log(`Billing event result handled: ${result.eventType}`);

        } catch (error) {
          console.error('Billing event result handling failed:', error);
        }
      },

      /**
       * Update subscription state from billing event result
       */
      updateSubscriptionStateFromBilling: async (subscriptionUpdate: any) => {
        const state = get();

        try {
          const { subscriptionId, status, tier, gracePeriod } = subscriptionUpdate;

          // Update active subscription if it matches
          if (state.activeSubscription?.subscriptionId === subscriptionId) {
            set({
              activeSubscription: {
                ...state.activeSubscription,
                status: status as any
              }
            });
          }

          // Update subscription state
          set({
            subscriptionState: {
              ...state.subscriptionState,
              subscriptionId,
              status,
              tier: { id: tier, name: state.mapTierToName(tier) },
              gracePeriod: gracePeriod ? {
                active: true,
                daysRemaining: state._webhookConfig.gracePeriodDays,
                reason: 'Billing event triggered grace period',
                therapeuticContinuity: true
              } : state.subscriptionState?.gracePeriod,
              lastUpdated: new Date().toISOString()
            }
          });

          // Update feature access based on new state
          const newFeatureAccess = state.calculateFeatureAccessFromTier(tier, gracePeriod);
          set({ featureAccess: newFeatureAccess });

          console.log(`Subscription state updated from billing: ${tier} (gracePeriod: ${gracePeriod})`);

        } catch (error) {
          console.error('Subscription state update from billing failed:', error);
        }
      },

      /**
       * Handle crisis override activation from billing events
       */
      handleCrisisOverrideFromBilling: async (result: BillingEventResult) => {
        const state = get();

        try {
          if (!state.crisisMode) {
            await state.enableCrisisMode(`Billing event crisis override: ${result.eventType}`);
          }

          // Ensure all therapeutic features remain accessible
          set({
            featureAccess: {
              therapeuticContent: true,
              crisisTools: true,
              emergencyContacts: true,
              hotlineAccess: true,
              assessments: true,
              breathingExercises: true,
              premiumFeatures: true
            }
          });

          console.log(`Crisis override handled from billing event: ${result.eventType}`);

        } catch (error) {
          console.error('Crisis override handling from billing failed:', error);
        }
      },

      /**
       * Calculate feature access from subscription tier
       */
      calculateFeatureAccessFromTier: (tier: string, gracePeriod: boolean) => {
        // Crisis features always available
        const baseAccess = {
          crisisTools: true,
          emergencyContacts: true,
          hotlineAccess: true
        };

        // During grace period, maintain previous access level
        if (gracePeriod) {
          return {
            ...baseAccess,
            therapeuticContent: true,
            assessments: true,
            breathingExercises: true,
            premiumFeatures: false // Conservative during grace period
          };
        }

        // Tier-based access
        switch (tier) {
          case 'premium':
            return {
              ...baseAccess,
              therapeuticContent: true,
              assessments: true,
              breathingExercises: true,
              premiumFeatures: true
            };
          case 'basic':
            return {
              ...baseAccess,
              therapeuticContent: true,
              assessments: true,
              breathingExercises: true,
              premiumFeatures: false
            };
          case 'crisis_access':
            return {
              ...baseAccess,
              therapeuticContent: true,
              assessments: true,
              breathingExercises: true,
              premiumFeatures: true // Full access during crisis
            };
          default:
            return {
              ...baseAccess,
              therapeuticContent: false,
              assessments: true, // Basic assessments always available
              breathingExercises: false,
              premiumFeatures: false
            };
        }
      },

      /**
       * Map tier ID to display name
       */
      mapTierToName: (tierId: string): string => {
        const tierNames: Record<string, string> = {
          'premium': 'Premium MBCT',
          'basic': 'Basic MBCT',
          'crisis_access': 'Crisis Support',
          'none': 'No Subscription'
        };
        return tierNames[tierId] || 'Unknown Tier';
      },

      /**
       * Start real-time update processor for immediate state reflection
       */
      startRealTimeUpdateProcessor: () => {
        const processUpdates = async () => {
          const state = get();
          try {
            await state.processQueuedRealTimeUpdates();
          } catch (error) {
            console.error('Real-time update processing failed:', error);
          }
        };

        // Process updates every 2 seconds for responsiveness
        const intervalId = setInterval(processUpdates, 2000);

        // Store interval for cleanup
        set({ _realTimeUpdateInterval: intervalId });

        console.log('Real-time update processor started');
      },

      /**
       * Start grace period monitor for automatic management
       */
      startGracePeriodMonitor: () => {
        const monitorGracePeriods = async () => {
          const state = get();
          try {
            await state.checkAndUpdateGracePeriods();
          } catch (error) {
            console.error('Grace period monitoring failed:', error);
          }
        };

        // Check grace periods every 30 minutes
        const intervalId = setInterval(monitorGracePeriods, 30 * 60 * 1000);

        // Store interval for cleanup
        set({ _gracePeriodMonitorInterval: intervalId });

        console.log('Grace period monitor started');
      },

      /**
       * Check and update all active grace periods
       */
      checkAndUpdateGracePeriods: async () => {
        const state = get();

        try {
          const now = Date.now();
          let gracePeriodUpdated = false;

          // Check all grace period entries
          for (const [id, gracePeriod] of state._gracePeriodManager.entries()) {
            const endTime = new Date(gracePeriod.endDate).getTime();

            if (now >= endTime && gracePeriod.active) {
              // Grace period has expired
              gracePeriod.active = false;
              gracePeriod.expiredAt = new Date().toISOString();
              gracePeriodUpdated = true;

              console.log(`Grace period expired: ${id}`);

              // Update subscription state if this was the active grace period
              if (state.subscriptionState?.gracePeriod?.active) {
                set({
                  subscriptionState: {
                    ...state.subscriptionState,
                    gracePeriod: {
                      ...state.subscriptionState.gracePeriod,
                      active: false,
                      daysRemaining: 0
                    }
                  }
                });

                // Recalculate feature access without grace period
                const newFeatureAccess = state.calculateFeatureAccessFromTier(
                  state.subscriptionState.tier?.id || 'none',
                  false
                );
                set({ featureAccess: newFeatureAccess });
              }
            } else if (gracePeriod.active) {
              // Update days remaining
              const daysRemaining = Math.max(0, Math.ceil((endTime - now) / (24 * 60 * 60 * 1000)));
              if (gracePeriod.daysRemaining !== daysRemaining) {
                gracePeriod.daysRemaining = daysRemaining;
                gracePeriodUpdated = true;

                // Update subscription state
                if (state.subscriptionState?.gracePeriod?.active) {
                  set({
                    subscriptionState: {
                      ...state.subscriptionState,
                      gracePeriod: {
                        ...state.subscriptionState.gracePeriod,
                        daysRemaining
                      }
                    }
                  });
                }
              }
            }
          }

          if (gracePeriodUpdated) {
            console.log('Grace periods updated');
          }

        } catch (error) {
          console.error('Grace period check and update failed:', error);
        }
      },

      /**
       * Register all webhook event handlers
       */
      registerWebhookHandlers: () => {
        const state = get();
        const handlers = state._webhookEventHandlers;

        // Subscription lifecycle handlers
        handlers.set('customer.subscription.created', state.handleSubscriptionCreatedWebhook);
        handlers.set('customer.subscription.updated', state.handleSubscriptionUpdatedWebhook);
        handlers.set('customer.subscription.deleted', state.handleSubscriptionDeletedWebhook);
        handlers.set('customer.subscription.trial_will_end', state.handleTrialEndingWebhook);

        // Payment event handlers
        handlers.set('payment_intent.succeeded', state.handlePaymentSucceededWebhook);
        handlers.set('payment_intent.payment_failed', state.handlePaymentFailedWebhook);
        handlers.set('invoice.payment_succeeded', state.handleInvoicePaymentSucceededWebhook);
        handlers.set('invoice.payment_failed', state.handleInvoicePaymentFailedWebhook);

        // Customer event handlers
        handlers.set('customer.created', state.handleCustomerCreatedWebhook);
        handlers.set('customer.updated', state.handleCustomerUpdatedWebhook);

        // Payment method handlers
        handlers.set('payment_method.attached', state.handlePaymentMethodAttachedWebhook);
        handlers.set('payment_method.detached', state.handlePaymentMethodDetachedWebhook);

        console.log(`Registered ${handlers.size} webhook event handlers`);
      },

      /**
       * Enhanced webhook event processing with crisis safety and real-time state updates
       */
      updateSubscriptionFromWebhook: async (event: WebhookEvent): Promise<BillingEventResult> => {
        const state = get();
        const startTime = Date.now();

        try {
          // CRISIS SAFETY CHECK - Always prioritize crisis events with <200ms processing
          const isCrisisEvent = state.isCrisisWebhookEvent(event.type);
          const effectiveCrisisMode = state.crisisMode || isCrisisEvent;

          // Check for duplicate event processing (state deduplication)
          if (state._webhookConfig.stateDeduplication && state.isDuplicateStateUpdate(event)) {
            console.log(`Skipping duplicate webhook event: ${event.id}`);
            return state.createDefaultWebhookResult(event, Date.now() - startTime);
          }

          // If crisis event, use fast processing path
          if (effectiveCrisisMode) {
            return await state.processCrisisWebhookEvent(event, startTime);
          }

          // Validate event structure
          if (!state.validateWebhookEvent(event)) {
            throw new Error(`Invalid webhook event structure: ${event.type}`);
          }

          // Queue state update for real-time processing
          if (state._webhookConfig.realTimeUpdates) {
            await state.queueRealTimeStateUpdate(event);
          }

          // Get appropriate handler
          const handler = state._webhookEventHandlers.get(event.type);
          if (!handler) {
            console.warn(`No handler registered for webhook event: ${event.type}`);
            return state.createDefaultWebhookResult(event, Date.now() - startTime);
          }

          // Process event with timeout protection
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Webhook processing timeout')), state._webhookConfig.processingTimeoutMs);
          });

          const processingPromise = handler(event);
          const result = await Promise.race([processingPromise, timeoutPromise]);

          // Update webhook processing metrics
          const processingTime = Date.now() - startTime;
          state.updateWebhookMetrics(event.type, processingTime, true);

          // Handle grace period management
          if (state.isGracePeriodEvent(event.type)) {
            await state.handleGracePeriodWebhook(event, result);
          }

          // Trigger state synchronization if needed
          if (state._webhookConfig.enableStateSync) {
            state.triggerStateSync(event).catch(console.error);
          }

          // Send therapeutic messaging if configured
          if (state._webhookConfig.therapeuticMessaging) {
            state.sendTherapeuticWebhookMessage(event, result).catch(console.error);
          }

          return {
            processed: true,
            eventId: event.id,
            eventType: event.type,
            processingTime,
            crisisOverride: false,
            subscriptionUpdate: result.subscriptionUpdate || state.extractSubscriptionUpdate(event)
          };

        } catch (error) {
          console.error('Enhanced webhook processing failed:', error);

          const processingTime = Date.now() - startTime;
          state.updateWebhookMetrics(event.type, processingTime, false);

          // Crisis safety fallback - if ANY webhook fails during crisis, maintain access
          if (state.crisisMode || state.isCrisisWebhookEvent(event.type)) {
            return await state.handleCrisisWebhookFailure(event, processingTime);
          }

          // Queue for retry if not crisis event
          await state.queueWebhookForRetry(event, error);
          throw error;
        }
      },

      /**
       * Process crisis webhook event with <200ms guarantee
       */
      processCrisisWebhookEvent: async (event: WebhookEvent, startTime: number): Promise<BillingEventResult> => {
        const state = get();

        try {
          // Crisis events MUST complete within 200ms - use timeout race
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Crisis webhook timeout')), state._webhookConfig.crisisTimeoutMs);
          });

          // Create crisis-safe processing promise
          const crisisProcessingPromise = state.processCrisisEventImmediate(event);

          // Race against timeout
          const result = await Promise.race([crisisProcessingPromise, timeoutPromise]);

          const processingTime = Date.now() - startTime;

          // Verify we met the crisis timing requirement
          if (processingTime > state._webhookConfig.crisisTimeoutMs) {
            console.warn(`Crisis webhook exceeded time limit: ${processingTime}ms > ${state._webhookConfig.crisisTimeoutMs}ms`);
          }

          // Update crisis metrics
          state.updateWebhookMetrics(event.type, processingTime, true, true);

          return {
            processed: true,
            eventId: event.id,
            eventType: event.type,
            processingTime,
            crisisOverride: true,
            subscriptionUpdate: {
              subscriptionId: event.data.object.id || 'crisis_subscription',
              status: 'active',
              tier: 'crisis_access',
              gracePeriod: true
            }
          };

        } catch (error) {
          console.error('Crisis webhook processing failed, using emergency fallback:', error);

          // Emergency fallback - ALWAYS provide access during crisis
          return await state.createEmergencyCrisisResult(event, Date.now() - startTime);
        }
      },

      /**
       * Process crisis event with immediate state updates
       */
      processCrisisEventImmediate: async (event: WebhookEvent) => {
        const state = get();

        // Enable crisis mode if not already active
        if (!state.crisisMode) {
          await state.enableCrisisMode(`crisis_webhook_${event.type}`);
        }

        // Immediate state update for crisis continuity
        switch (event.type) {
          case 'customer.subscription.deleted':
          case 'payment_intent.payment_failed':
          case 'invoice.payment_failed':
            // Maintain therapeutic access during payment/subscription issues
            set({
              subscriptionState: {
                ...state.subscriptionState,
                status: 'active',
                tier: { id: 'crisis_access', name: 'Crisis Access' },
                gracePeriod: {
                  active: true,
                  daysRemaining: 30,
                  reason: `Crisis protection: ${event.type}`,
                  therapeuticContinuity: true
                },
                lastUpdated: new Date().toISOString()
              },
              featureAccess: {
                therapeuticContent: true,
                crisisTools: true,
                emergencyContacts: true,
                hotlineAccess: true,
                assessments: true,
                breathingExercises: true,
                premiumFeatures: true
              }
            });
            break;

          default:
            // Default crisis handling - ensure access is maintained
            break;
        }

        return { subscriptionUpdate: state.subscriptionState };
      },

      /**
       * Check if webhook event is crisis-related
       */
      isCrisisWebhookEvent: (eventType: string): boolean => {
        const crisisEventTypes = [
          'customer.subscription.deleted',
          'customer.subscription.past_due',
          'payment_intent.payment_failed',
          'invoice.payment_failed',
          'payment_method.failed'
        ];
        return crisisEventTypes.includes(eventType);
      },

      /**
       * Validate webhook event structure
       */
      validateWebhookEvent: (event: WebhookEvent): boolean => {
        return !!(
          event &&
          event.id &&
          event.type &&
          event.data &&
          event.data.object &&
          typeof event.created === 'number'
        );
      },

      /**
       * Update webhook processing metrics
       */
      updateWebhookMetrics: (eventType: string, processingTime: number, success: boolean, crisis = false) => {
        const state = get();
        const metrics = state._webhookMetrics;

        const updatedMetrics = {
          totalProcessed: metrics.totalProcessed + 1,
          crisisProcessed: metrics.crisisProcessed + (crisis ? 1 : 0),
          averageProcessingTime: Math.round((metrics.averageProcessingTime + processingTime) / 2),
          lastEventProcessed: new Date().toISOString(),
          processingFailures: metrics.processingFailures + (success ? 0 : 1),
          stateUpdates: metrics.stateUpdates + (success ? 1 : 0)
        };

        set({ _webhookMetrics: updatedMetrics });

        // Update overall performance metrics
        set({
          _performanceMetrics: {
            ...state._performanceMetrics,
            averageProcessingTime: updatedMetrics.averageProcessingTime,
            paymentSuccessRate: success
              ? Math.min(state._performanceMetrics.paymentSuccessRate + 0.05, 1.0)
              : Math.max(state._performanceMetrics.paymentSuccessRate - 0.1, 0.0)
          }
        });
      },

      /**
       * Extract subscription update information from webhook event
       */
      extractSubscriptionUpdate: (event: WebhookEvent) => {
        const state = get();
        const { data } = event;

        return {
          userId: data.object.metadata?.userId,
          subscriptionId: data.object.id,
          status: data.object.status || 'unknown',
          tier: state.mapStripePlanToTier(data.object.items?.data[0]?.price?.lookup_key),
          gracePeriod: data.object.status === 'past_due'
        };
      },

      /**
       * Create default webhook result for unhandled events
       */
      createDefaultWebhookResult: (event: WebhookEvent, processingTime: number): BillingEventResult => {
        return {
          processed: true,
          eventId: event.id,
          eventType: event.type,
          processingTime,
          subscriptionUpdate: {
            subscriptionId: event.data.object.id || 'unknown',
            status: 'unchanged',
            tier: 'unknown'
          }
        };
      },

      /**
       * Handle crisis webhook failure with emergency access
       */
      handleCrisisWebhookFailure: async (event: WebhookEvent, processingTime: number): Promise<BillingEventResult> => {
        const state = get();

        // Emergency crisis mode activation
        if (!state.crisisMode) {
          await state.enableCrisisMode('webhook_emergency_failure');
        }

        return {
          processed: true,
          eventId: event.id,
          eventType: event.type,
          processingTime,
          crisisOverride: true,
          subscriptionUpdate: {
            subscriptionId: 'emergency_access',
            status: 'active',
            tier: 'crisis_access',
            gracePeriod: true
          },
          error: {
            code: 'CRISIS_WEBHOOK_FAILURE',
            message: 'Webhook processing failed during crisis - emergency access granted',
            retryable: false
          }
        };
      },

      /**
       * Create emergency crisis result for ultimate failsafe
       */
      createEmergencyCrisisResult: async (event: WebhookEvent, processingTime: number): Promise<BillingEventResult> => {
        return {
          processed: true,
          eventId: event.id || `emergency_${Date.now()}`,
          eventType: event.type || 'emergency_fallback',
          processingTime,
          crisisOverride: true,
          subscriptionUpdate: {
            subscriptionId: 'emergency_failsafe',
            status: 'active',
            tier: 'crisis_access',
            gracePeriod: true
          }
        };
      },

      /**
       * Queue webhook for retry processing
       */
      queueWebhookForRetry: async (event: WebhookEvent, error: any) => {
        const state = get();

        try {
          const retryItem = {
            id: `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            eventId: event.id,
            eventType: event.type,
            payload: JSON.stringify(event),
            attempts: 1,
            maxAttempts: state._webhookConfig.maxRetryAttempts,
            error: error.message,
            scheduledAt: new Date().toISOString(),
            nextRetryAt: new Date(Date.now() + state._webhookConfig.retryDelayMs).toISOString()
          };

          state._webhookQueue.set(retryItem.id, retryItem);
          console.log(`Webhook queued for retry: ${event.type} (attempt 1)`);

        } catch (queueError) {
          console.error('Failed to queue webhook for retry:', queueError);
        }
      },

      /**
       * Check if webhook event is a duplicate state update
       */
      isDuplicateStateUpdate: (event: WebhookEvent): boolean => {
        const state = get();
        const deduplicationKey = `${event.type}_${event.data.object.id}_${event.created}`;

        if (state._stateUpdateQueue.has(deduplicationKey)) {
          return true;
        }

        // Track this event for deduplication (with 5-minute TTL)
        state._stateUpdateQueue.set(deduplicationKey, {
          timestamp: Date.now(),
          eventId: event.id
        });

        // Cleanup old entries
        setTimeout(() => {
          state._stateUpdateQueue.delete(deduplicationKey);
        }, 5 * 60 * 1000);

        return false;
      },

      /**
       * Queue real-time state update for immediate processing
       */
      queueRealTimeStateUpdate: async (event: WebhookEvent) => {
        const state = get();

        try {
          const updateId = `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const stateUpdate = {
            id: updateId,
            eventId: event.id,
            eventType: event.type,
            timestamp: new Date().toISOString(),
            subscriptionId: event.data.object.id,
            priority: state.isCrisisWebhookEvent(event.type) ? 'crisis' : 'normal',
            processed: false
          };

          state._stateUpdateQueue.set(updateId, stateUpdate);

          // Process immediately for crisis events
          if (stateUpdate.priority === 'crisis') {
            await state.processRealTimeUpdate(stateUpdate);
          }

          console.log(`Real-time state update queued: ${event.type}`);

        } catch (error) {
          console.error('Failed to queue real-time state update:', error);
        }
      },

      /**
       * Process real-time state update with immediate UI reflection
       */
      processRealTimeUpdate: async (stateUpdate: any) => {
        const state = get();

        try {
          // Immediate state updates for subscription changes
          if (stateUpdate.eventType.includes('subscription')) {
            // Update subscription state immediately
            const currentSubscription = state.activeSubscription;
            if (currentSubscription && currentSubscription.subscriptionId === stateUpdate.subscriptionId) {
              // Trigger immediate re-fetch of subscription status
              await state.syncSubscriptionState();
            }
          }

          // Immediate feature access updates
          if (stateUpdate.eventType.includes('payment') || stateUpdate.eventType.includes('invoice')) {
            // Clear feature cache for immediate refresh
            state.featureGateCache?.clear();
            set({ lastFeatureCheck: 0 });
          }

          // Mark as processed
          stateUpdate.processed = true;
          stateUpdate.processedAt = new Date().toISOString();

          // Update metrics
          set({
            _webhookMetrics: {
              ...state._webhookMetrics,
              realTimeUpdatesProcessed: state._webhookMetrics.realTimeUpdatesProcessed + 1
            }
          });

          console.log(`Real-time state update processed: ${stateUpdate.eventType}`);

        } catch (error) {
          console.error('Real-time state update processing failed:', error);
        }
      },

      /**
       * Check if event should trigger grace period handling
       */
      isGracePeriodEvent: (eventType: string): boolean => {
        const gracePeriodEvents = [
          'customer.subscription.deleted',
          'payment_intent.payment_failed',
          'invoice.payment_failed',
          'customer.subscription.past_due'
        ];
        return gracePeriodEvents.includes(eventType);
      },

      /**
       * Handle grace period activation from webhook events
       */
      handleGracePeriodWebhook: async (event: WebhookEvent, result: any) => {
        const state = get();

        try {
          const userId = event.data.object.metadata?.userId || 'unknown';
          const subscriptionId = event.data.object.id;

          // Create grace period entry
          const gracePeriodId = `grace_${Date.now()}_${userId}`;
          const gracePeriodEnd = new Date(Date.now() + state._webhookConfig.gracePeriodDays * 24 * 60 * 60 * 1000);

          const gracePeriodEntry = {
            id: gracePeriodId,
            userId,
            subscriptionId,
            eventType: event.type,
            startDate: new Date().toISOString(),
            endDate: gracePeriodEnd.toISOString(),
            reason: state.getGracePeriodReason(event.type),
            active: true,
            therapeuticContinuity: true,
            featureAccess: {
              therapeuticContent: true,
              crisisTools: true,
              emergencyContacts: true,
              hotlineAccess: true,
              assessments: true,
              breathingExercises: true,
              premiumFeatures: false // Conservative during grace period
            }
          };

          // Store grace period entry
          state._gracePeriodManager.set(gracePeriodId, gracePeriodEntry);

          // Update subscription state with grace period
          set({
            subscriptionState: {
              ...state.subscriptionState,
              gracePeriod: {
                active: true,
                daysRemaining: state._webhookConfig.gracePeriodDays,
                endDate: gracePeriodEnd.toISOString(),
                reason: gracePeriodEntry.reason,
                therapeuticContinuity: true
              }
            },
            featureAccess: gracePeriodEntry.featureAccess
          });

          // Update metrics
          set({
            _webhookMetrics: {
              ...state._webhookMetrics,
              gracePeriodActivations: state._webhookMetrics.gracePeriodActivations + 1
            }
          });

          console.log(`Grace period activated: ${gracePeriodId} (${state._webhookConfig.gracePeriodDays} days)`);

        } catch (error) {
          console.error('Grace period webhook handling failed:', error);
        }
      },

      /**
       * Get therapeutic reason for grace period activation
       */
      getGracePeriodReason: (eventType: string): string => {
        const reasonMap: Record<string, string> = {
          'customer.subscription.deleted': 'Subscription cancelled - maintaining therapeutic continuity',
          'payment_intent.payment_failed': 'Payment processing issue - your wellness journey continues',
          'invoice.payment_failed': 'Billing issue - therapeutic access maintained during resolution',
          'customer.subscription.past_due': 'Payment reminder - all therapeutic features remain available'
        };

        return reasonMap[eventType] || 'Temporary access provided for therapeutic continuity';
      },

      /**
       * Send therapeutic messaging based on webhook events
       */
      sendTherapeuticWebhookMessage: async (event: WebhookEvent, result: any) => {
        const state = get();

        try {
          const userId = event.data.object.metadata?.userId;
          if (!userId) return;

          const messageContext = {
            eventType: event.type,
            subscriptionId: event.data.object.id,
            timestamp: new Date().toISOString(),
            crisisMode: state.crisisMode,
            gracePeriodActive: state.subscriptionState?.gracePeriod?.active
          };

          // Generate therapeutic message based on event type
          const message = state.generateTherapeuticMessage(event.type, messageContext);

          if (message) {
            // Store message for UI display (non-blocking)
            await state.storeTherapeuticMessage(userId, message);
            console.log(`Therapeutic message sent for ${event.type}`);
          }

        } catch (error) {
          console.error('Therapeutic messaging failed:', error);
          // Non-blocking - don't fail webhook processing
        }
      },

      /**
       * Generate therapeutic message based on webhook event
       */
      generateTherapeuticMessage: (eventType: string, context: any): any => {
        const messages: Record<string, any> = {
          'customer.subscription.created': {
            title: 'Welcome to Your Mindful Journey',
            message: 'Your subscription is active! Take a moment to breathe and explore your therapeutic tools.',
            type: 'success',
            therapeuticTone: true
          },
          'customer.subscription.deleted': {
            title: 'Mindful Transition',
            message: 'Your subscription has been cancelled, but your crisis support and safety features remain fully available. Your wellbeing comes first.',
            type: 'info',
            therapeuticTone: true,
            gracePeriodInfo: true
          },
          'payment_intent.payment_failed': {
            title: 'Payment Pause, Wellness Continues',
            message: 'We couldn\'t process your payment right now. Take a deep breath - all your therapeutic features remain available during our grace period.',
            type: 'warning',
            therapeuticTone: true,
            gracePeriodInfo: true
          },
          'invoice.payment_failed': {
            title: 'Billing Update Needed',
            message: 'Your payment needs attention, but your therapeutic journey continues uninterrupted. Update when you\'re ready.',
            type: 'warning',
            therapeuticTone: true,
            gracePeriodInfo: true
          }
        };

        const baseMessage = messages[eventType];
        if (!baseMessage) return null;

        return {
          ...baseMessage,
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: context.timestamp,
          crisisMode: context.crisisMode,
          gracePeriodActive: context.gracePeriodActive,
          dismissible: true,
          therapeuticSupport: true
        };
      },

      /**
       * Store therapeutic message for UI display
       */
      storeTherapeuticMessage: async (userId: string, message: any) => {
        try {
          // Store message in encrypted format
          const encryptedMessage = await encryptionService.encryptData(
            message,
            'SYSTEM',
            { therapeuticMessage: true, userNotification: true }
          );

          // Store in AsyncStorage with TTL
          const messageKey = `therapeutic_message_${message.id}`;
          await AsyncStorage.setItem(messageKey, JSON.stringify({
            ...encryptedMessage,
            userId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          }));

          console.log(`Therapeutic message stored: ${message.id}`);

        } catch (error) {
          console.error('Therapeutic message storage failed:', error);
        }
      },

      /**
       * Trigger state synchronization after webhook processing
       */
      triggerStateSync: async (event: WebhookEvent) => {
        const state = get();

        try {
          // Sync subscription state if subscription-related event
          if (event.type.startsWith('customer.subscription.')) {
            await state.syncSubscriptionState();
          }

          // Sync feature access if payment-related event
          if (event.type.includes('payment') || event.type.includes('invoice')) {
            const subscriptionStatus = await state.getSubscriptionStatusDetailed();
            await state.updateFeatureAccessFromSubscription(subscriptionStatus);
          }

          // Clear feature cache to ensure fresh data
          state.featureGateCache?.clear();
          set({ lastFeatureCheck: 0 });

          // Process queued real-time updates
          await state.processQueuedRealTimeUpdates();

          console.log(`State sync triggered for webhook: ${event.type}`);

        } catch (error) {
          console.error('State sync failed after webhook:', error);
          // Non-blocking - don't fail webhook processing
        }
      },

      /**
       * Process all queued real-time updates
       */
      processQueuedRealTimeUpdates: async () => {
        const state = get();

        try {
          const pendingUpdates = Array.from(state._stateUpdateQueue.values())
            .filter(update => !update.processed)
            .sort((a, b) => {
              // Process crisis updates first
              if (a.priority === 'crisis' && b.priority !== 'crisis') return -1;
              if (b.priority === 'crisis' && a.priority !== 'crisis') return 1;
              return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            });

          for (const update of pendingUpdates) {
            await state.processRealTimeUpdate(update);
          }

          console.log(`Processed ${pendingUpdates.length} queued real-time updates`);

        } catch (error) {
          console.error('Queued real-time updates processing failed:', error);
        }
      },

      /**
       * ==========================================================================
       * INDIVIDUAL WEBHOOK EVENT HANDLERS - SPECIALIZED PROCESSING
       * ==========================================================================
       */

      /**
       * Handle subscription created webhook with therapeutic onboarding
       */
      handleSubscriptionCreatedWebhook: async (event: WebhookEvent) => {
        const state = get();
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        try {
          // Extract subscription details
          const subscriptionUpdate = {
            subscriptionId: subscription.id,
            status: subscription.status,
            tier: state.mapStripePlanToTier(subscription.items?.data[0]?.price?.lookup_key),
            trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
            gracePeriod: false,
            lastUpdated: new Date().toISOString()
          };

          // Update subscription state
          set({
            subscriptionState: {
              ...state.subscriptionState,
              ...subscriptionUpdate
            },
            activeSubscription: {
              subscriptionId: subscription.id,
              customerId: subscription.customer,
              status: subscription.status,
              currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
              currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              plan: {
                planId: subscription.items?.data[0]?.price?.lookup_key || 'unknown',
                name: subscription.items?.data[0]?.price?.nickname || 'Subscription',
                description: `${subscription.items?.data[0]?.price?.recurring?.interval} subscription`,
                amount: subscription.items?.data[0]?.price?.unit_amount / 100,
                currency: subscription.items?.data[0]?.price?.currency,
                interval: subscription.items?.data[0]?.price?.recurring?.interval,
                features: []
              }
            }
          });

          // Update feature access based on new subscription
          const newFeatureAccess = state.calculateFeatureAccess({ subscription, tier: subscriptionUpdate.tier });
          set({ featureAccess: newFeatureAccess });

          // Log therapeutic milestone
          if (userId) {
            await state.logTherapeuticEvent('subscription_created', {
              subscriptionId: subscription.id,
              tier: subscriptionUpdate.tier,
              isTrialing: subscription.status === 'trialing',
              therapeuticJourney: 'subscription_started'
            });
          }

          console.log('Subscription created from webhook:', subscriptionUpdate);
          return { subscriptionUpdate };

        } catch (error) {
          console.error('Subscription created webhook processing failed:', error);
          throw error;
        }
      },

      /**
       * Handle subscription updated webhook with state synchronization
       */
      handleSubscriptionUpdatedWebhook: async (event: WebhookEvent) => {
        const state = get();
        const subscription = event.data.object;
        const previousAttributes = event.data.previous_attributes;
        const userId = subscription.metadata?.userId;

        try {
          // Extract subscription details
          const subscriptionUpdate = {
            subscriptionId: subscription.id,
            status: subscription.status,
            tier: state.mapStripePlanToTier(subscription.items?.data[0]?.price?.lookup_key),
            trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
            gracePeriod: subscription.status === 'past_due',
            lastUpdated: new Date().toISOString()
          };

          // Check for important status changes
          const statusChanged = previousAttributes?.status && previousAttributes.status !== subscription.status;
          const planChanged = previousAttributes?.items &&
            previousAttributes.items.data[0]?.price?.id !== subscription.items?.data[0]?.price?.id;

          // Update subscription state
          set({
            subscriptionState: {
              ...state.subscriptionState,
              ...subscriptionUpdate
            }
          });

          // Handle specific status transitions
          if (statusChanged) {
            await state.handleSubscriptionStatusTransition(
              subscription,
              previousAttributes.status,
              subscription.status
            );
          }

          // Handle plan changes
          if (planChanged) {
            await state.handleSubscriptionPlanChange(subscription, previousAttributes);
          }

          // Update feature access
          const newFeatureAccess = state.calculateFeatureAccess({ subscription, tier: subscriptionUpdate.tier });
          set({ featureAccess: newFeatureAccess });

          // Log therapeutic event for significant changes
          if (userId && (statusChanged || planChanged)) {
            await state.logTherapeuticEvent('subscription_updated', {
              subscriptionId: subscription.id,
              oldStatus: previousAttributes?.status,
              newStatus: subscription.status,
              statusChanged,
              planChanged,
              therapeuticContinuity: true
            });
          }

          console.log('Subscription updated from webhook:', subscriptionUpdate);
          return { subscriptionUpdate };

        } catch (error) {
          console.error('Subscription updated webhook processing failed:', error);
          throw error;
        }
      },

      handleSubscriptionDeletedWebhook: async (event: WebhookEvent) => {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        // Activate grace period for canceled subscription
        const gracePeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        set({
          subscriptionState: {
            subscriptionId: subscription.id,
            status: 'canceled',
            tier: 'free',
            trialEnd: null,
            currentPeriodEnd: null,
            gracePeriod: true,
            gracePeriodEnd,
            lastUpdated: new Date().toISOString()
          }
        });

        console.log('Subscription canceled via webhook, grace period activated until:', gracePeriodEnd);
      },

      handleTrialEndingWebhook: async (event: WebhookEvent) => {
        const subscription = event.data.object;
        const state = get();

        // Check if crisis mode should extend trial
        if (state.crisisMode) {
          console.log('Trial ending during crisis mode, extending trial');
          // Note: Actual trial extension would be handled by the subscription manager
          return;
        }

        // Update trial countdown
        const trialEnd = new Date(subscription.trial_end * 1000);
        const daysRemaining = Math.ceil((trialEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

        set({
          trialState: {
            ...state.trialState,
            active: true,
            daysRemaining,
            endingNotification: daysRemaining <= 3
          }
        });

        console.log(`Trial ending in ${daysRemaining} days`);
      },

      handlePaymentSucceededWebhook: async (event: WebhookEvent) => {
        const paymentIntent = event.data.object;
        const state = get();

        // Clear any payment errors
        set({ lastPaymentError: null });

        // If we were in grace period, remove it
        if (state.subscriptionState?.gracePeriod) {
          set({
            subscriptionState: {
              ...state.subscriptionState,
              gracePeriod: false,
              gracePeriodEnd: null
            }
          });
        }

        // Update payment success metrics
        set({
          _performanceMetrics: {
            ...state._performanceMetrics,
            paymentSuccessRate: Math.min(state._performanceMetrics.paymentSuccessRate + 0.2, 1.0)
          }
        });

        console.log('Payment succeeded via webhook:', paymentIntent.id);
      },

      handlePaymentFailedWebhook: async (event: WebhookEvent) => {
        const paymentIntent = event.data.object;
        const state = get();

        // Activate grace period for payment failure
        await state.activateGracePeriodFromWebhook(paymentIntent.customer || 'unknown');

        // Create therapeutic error message
        const paymentError: PaymentError = {
          type: 'payment_failed',
          code: paymentIntent.last_payment_error?.code || 'card_declined',
          message: paymentIntent.last_payment_error?.message || 'Payment was declined',
          retryable: true,
          crisisImpact: 'none', // Payment failures don't affect crisis features
          userMessage: 'Your payment couldn\'t be processed right now. We\'ve given you a grace period - all your therapeutic features remain available. Take a mindful breath and try again when you\'re ready.'
        };

        set({ lastPaymentError: paymentError });

        console.log('Payment failed via webhook, grace period activated');
      },

      activateGracePeriodFromWebhook: async (customerId: string) => {
        const state = get();
        const gracePeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        set({
          subscriptionState: {
            ...state.subscriptionState,
            gracePeriod: true,
            gracePeriodEnd,
            status: 'grace_period'
          }
        });

        console.log(`Grace period activated for customer ${customerId} until ${gracePeriodEnd}`);
      },

      syncWebhookState: async (events: WebhookEvent[]) => {
        const state = get();

        try {
          // Process events in chronological order
          const sortedEvents = events.sort((a, b) => a.created - b.created);

          for (const event of sortedEvents) {
            await state.updateSubscriptionFromWebhook(event);
          }

          // Update sync timestamp
          set({
            _lastSyncTime: new Date().toISOString()
          });

          console.log(`Synced ${events.length} webhook events`);

        } catch (error) {
          console.error('Webhook state sync failed:', error);
          // Don't throw - allow partial sync
        }
      },

      /**
       * Crisis Management Actions - CRITICAL for user safety
       */
      enableCrisisMode: async (reason: string) => {
        const state = get();

        try {
          console.log(`Enabling crisis mode in payment store: ${reason}`);

          const currentUser = await state.getCurrentUser();
          if (!currentUser) {
            throw new Error('No user context for crisis mode');
          }

          // Enable crisis mode in payment API
          const crisisOverride = await paymentAPIService.enableCrisisMode(
            currentUser.id,
            currentUser.device_id || 'unknown',
            reason
          );

          set({
            crisisMode: true,
            crisisOverride,
            lastPaymentError: null, // Clear any payment errors during crisis
            _performanceMetrics: {
              ...state._performanceMetrics,
              crisisOverrideCount: state._performanceMetrics.crisisOverrideCount + 1
            }
          });

          // Provide emergency subscription access
          await state.loadSubscription();

          console.log('Crisis mode enabled successfully in payment store');

        } catch (error) {
          console.error('Crisis mode enablement failed:', error);

          // CRITICAL: Even if API fails, enable local crisis mode
          set({
            crisisMode: true,
            crisisOverride: {
              crisisSessionId: `emergency_${Date.now()}`,
              userId: 'emergency_user',
              deviceId: 'emergency_device',
              overrideReason: 'emergency_access',
              overrideType: 'full_access',
              granted: new Date().toISOString(),
              expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              auditTrail: {
                triggerEvent: reason,
                safetyScore: 100,
                accessGranted: ['all_therapeutic_features', 'crisis_tools', 'emergency_contacts']
              }
            },
            lastPaymentError: null
          });

          console.log('Emergency crisis mode enabled locally');
        }
      },

      disableCrisisMode: async () => {
        const state = get();
        const { crisisOverride } = state;

        if (!crisisOverride) return;

        try {
          await paymentAPIService.disableCrisisMode(crisisOverride.crisisSessionId);

          set({
            crisisMode: false,
            crisisOverride: null
          });

          // Reload normal payment state
          const currentUser = await state.getCurrentUser();
          if (currentUser) {
            await state.loadCustomer(currentUser.id);
            await state.loadPaymentMethods();
            await state.loadSubscription();
          }

          console.log('Crisis mode disabled successfully');

        } catch (error) {
          console.error('Crisis mode disable failed:', error);
          // Don't prevent disabling crisis mode locally
          set({
            crisisMode: false,
            crisisOverride: null
          });
        }
      },

      /**
       * UI Actions
       */
      showPaymentSheet: () => {
        set({ showPaymentSheet: true });
      },

      hidePaymentSheet: () => {
        set({ showPaymentSheet: false });
      },

      showSubscriptionSelector: () => {
        set({ showSubscriptionSelector: true });
      },

      hideSubscriptionSelector: () => {
        set({ showSubscriptionSelector: false });
      },

      /**
       * Enhanced cleanup for webhook resources and background processes
       */
      cleanupWebhookResources: async () => {
        const state = get();

        try {
          console.log('Cleaning up webhook resources and background processes...');

          // Clear all intervals
          if (state._realTimeUpdateInterval) {
            clearInterval(state._realTimeUpdateInterval);
          }
          if (state._gracePeriodMonitorInterval) {
            clearInterval(state._gracePeriodMonitorInterval);
          }
          if (state._monitoringInterval) {
            clearInterval(state._monitoringInterval);
          }

          // Process remaining queued updates before cleanup
          await state.processQueuedRealTimeUpdates();

          // Clear all state maps
          state._webhookQueue.clear();
          state._webhookEventHandlers.clear();
          state._stateUpdateQueue.clear();
          state._gracePeriodManager.clear();

          // Reset interval references
          set({
            _realTimeUpdateInterval: null,
            _gracePeriodMonitorInterval: null,
            _monitoringInterval: null
          });

          console.log('Webhook resources cleanup completed');

        } catch (error) {
          console.error('Webhook resources cleanup failed:', error);
        }
      },

      /**
       * Cleanup Actions
       */
      reset: () => {
        const state = get();

        // Clean up webhook resources first
        state.cleanupWebhookResources().catch(console.error);

        set({
          customer: null,
          paymentMethods: [],
          activeSubscription: null,
          currentPaymentIntent: null,
          paymentInProgress: false,
          lastPaymentError: null,
          crisisMode: false,
          crisisOverride: null,
          securityValidated: false,
          showPaymentSheet: false,
          showSubscriptionSelector: false,
          showPaymentHistory: false,
          loadingCustomer: false,
          loadingPaymentMethods: false,
          loadingSubscription: false,
          loadingPlans: false,
          _pendingSyncs: [],
          _offlineQueue: [],
          // Reset webhook metrics but keep configuration
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
          }
        });
      },

      clearSensitiveData: () => {
        set({
          paymentMethods: [],
          currentPaymentIntent: null,
          lastPaymentError: null
        });
      },

      // Helper method to get current user (would integrate with auth store)
      getCurrentUser: async () => {
        // This would integrate with your auth store/service
        // For now, return mock user data
        return {
          id: 'current_user_id',
          email: 'user@example.com',
          device_id: 'current_device_id'
        };
      },

      /**
       * ==========================================================================
       * DAY 17 PHASE 2: SUBSCRIPTION MANAGER INTEGRATION & FEATURE GATES
       * ==========================================================================
       */

      // Enhanced subscription integration with SubscriptionManager
      subscriptionManager: null as any,
      paymentAwareFeatureGates: null as any,

      // Feature gate selectors (memoized for performance)
      featureAccess: {
        therapeuticContent: true,
        crisisTools: true,
        emergencyContacts: true,
        hotlineAccess: true,
        assessments: true,
        breathingExercises: false,
        premiumFeatures: false
      },

      // Real-time subscription state
      subscriptionState: null as any,
      featureGateCache: new Map(),
      lastFeatureCheck: 0,
      trialCountdown: null as any,

      /**
       * Initialize enhanced subscription management with feature gates
       */
      initializeSubscriptionManager: async () => {
        try {
          console.log('Initializing subscription manager integration...');

          // Import managers dynamically to avoid circular dependencies
          const { subscriptionManager } = await import('../services/cloud/SubscriptionManager');
          const { paymentAwareFeatureGates } = await import('../services/cloud/PaymentAwareFeatureGates');

          // Initialize managers
          await subscriptionManager.initialize();
          await paymentAwareFeatureGates.initialize();

          // Store references
          set({
            subscriptionManager: subscriptionManager,
            paymentAwareFeatureGates: paymentAwareFeatureGates
          });

          // Load initial subscription state
          await get().syncSubscriptionState();

          // Set up real-time feature access monitoring
          get().setupFeatureAccessMonitoring();

          console.log('Subscription manager integration initialized');

        } catch (error) {
          console.error('Subscription manager initialization failed:', error);

          // Initialize with crisis safety fallbacks
          await get().initializeEmergencySubscriptionState();
        }
      },

      /**
       * Get comprehensive subscription status with <500ms response
       */
      getSubscriptionStatusDetailed: async () => {
        const state = get();
        const startTime = Date.now();

        try {
          const currentUser = await state.getCurrentUser();

          // Crisis mode bypass - immediate response
          if (state.crisisMode) {
            return {
              tier: 'crisis_access',
              features: ['all_therapeutic_features', 'crisis_support', 'emergency_access'],
              trial: null,
              gracePeriod: null,
              nextBilling: undefined,
              recommendations: [],
              featureAccess: {
                therapeuticContent: true,
                crisisTools: true,
                emergencyContacts: true,
                hotlineAccess: true,
                assessments: true,
                breathingExercises: true,
                premiumFeatures: true
              },
              responseTime: Date.now() - startTime
            };
          }

          // Use SubscriptionManager for detailed status
          if (state.subscriptionManager) {
            const subscriptionStatus = await state.subscriptionManager.getSubscriptionStatus();
            const recommendations = await state.subscriptionManager.getRecommendations(currentUser.id);

            // Update feature access based on subscription
            await state.updateFeatureAccessFromSubscription(subscriptionStatus);

            const responseTime = Date.now() - startTime;
            if (responseTime > 500) {
              console.warn(`Subscription status took ${responseTime}ms (target: <500ms)`);
            }

            return {
              tier: subscriptionStatus.tier?.id || 'none',
              features: subscriptionStatus.features.available,
              trial: subscriptionStatus.trial,
              gracePeriod: subscriptionStatus.gracePeriod,
              nextBilling: subscriptionStatus.current?.currentPeriodEnd,
              recommendations: recommendations.reasons,
              featureAccess: state.featureAccess,
              responseTime
            };
          }

          // Fallback to existing API integration
          const status = await paymentAPIService.getSubscriptionStatus(currentUser.id);
          const recommendations = await paymentAPIService.getSubscriptionRecommendations(currentUser.id);
          const featureAccess = state.calculateFeatureAccess(status);

          const responseTime = Date.now() - startTime;
          return {
            ...status,
            recommendations: recommendations.reasons,
            featureAccess,
            responseTime
          };

        } catch (error) {
          console.error('Get detailed subscription status failed:', error);

          // Emergency fallback with therapeutic access
          return {
            tier: 'emergency_access',
            features: ['crisis_support', 'emergency_access', 'therapeutic_core'],
            trial: null,
            gracePeriod: null,
            nextBilling: undefined,
            recommendations: ['Contact support for assistance'],
            featureAccess: {
              therapeuticContent: true, // Emergency access
              crisisTools: true,
              emergencyContacts: true,
              hotlineAccess: true,
              assessments: true,
              breathingExercises: true,
              premiumFeatures: false
            },
            responseTime: Date.now() - startTime
          };
        }
      },

      /**
       * Fast feature access check with <100ms response and caching
       */
      checkFeatureAccess: async (featureId: string) => {
        const state = get();
        const startTime = Date.now();

        try {
          // Crisis features always granted - immediate response
          const crisisFeatures = ['crisis_detection', 'emergency_contacts', 'hotline_988', 'safety_planning'];
          if (crisisFeatures.includes(featureId)) {
            return {
              granted: true,
              reason: 'Crisis feature - always available',
              responseTime: Date.now() - startTime,
              crisisOverride: true,
              therapeuticImpact: 'none'
            };
          }

          // Crisis mode override - all features granted
          if (state.crisisMode) {
            return {
              granted: true,
              reason: 'Crisis mode - all therapeutic features available',
              responseTime: Date.now() - startTime,
              crisisOverride: true,
              therapeuticImpact: 'none'
            };
          }

          // Check cache first (performance optimization)
          const cacheKey = `${featureId}_${Date.now() - (Date.now() % 60000)}`; // 1-minute cache buckets
          const cached = state.featureGateCache.get(cacheKey);
          if (cached && (Date.now() - state.lastFeatureCheck) < 60000) { // 1 minute TTL
            return {
              ...cached,
              responseTime: Date.now() - startTime,
              cacheHit: true
            };
          }

          // Use PaymentAwareFeatureGates if available
          if (state.paymentAwareFeatureGates) {
            const currentUser = await state.getCurrentUser();
            const context = {
              userId: currentUser.id,
              deviceId: currentUser.device_id || 'unknown',
              sessionId: state.session?.sessionId || 'anonymous',
              crisisMode: state.crisisMode,
              offlineMode: !navigator.onLine,
              subscriptionTier: state.subscriptionState?.tier?.id,
              featureFlagsEnabled: true,
              therapeuticSession: true
            };

            const result = await state.paymentAwareFeatureGates.checkFeatureAccess(featureId, context);

            // Cache result for performance
            state.featureGateCache.set(cacheKey, result);
            set({ lastFeatureCheck: Date.now() });

            return result;
          }

          // Fallback to basic feature access check
          const subscriptionStatus = await state.getSubscriptionStatusDetailed();
          const granted = subscriptionStatus.features.includes(featureId) ||
                         state.featureAccess.crisisTools;

          const result = {
            granted,
            reason: granted
              ? `Feature available with ${subscriptionStatus.tier} subscription`
              : `Feature requires upgrade from ${subscriptionStatus.tier}`,
            responseTime: Date.now() - startTime,
            crisisOverride: state.crisisMode,
            therapeuticImpact: granted ? 'none' : 'minimal'
          };

          // Cache result
          state.featureGateCache.set(cacheKey, result);
          set({ lastFeatureCheck: Date.now() });

          return result;

        } catch (error) {
          console.error('Feature access check failed:', error);

          // Emergency fallback - grant therapeutic features
          return {
            granted: true,
            reason: 'Emergency fallback - therapeutic continuity maintained',
            responseTime: Date.now() - startTime,
            crisisOverride: true,
            therapeuticImpact: 'none'
          };
        }
      },

      /**
       * Update feature access state from subscription
       */
      updateFeatureAccessFromSubscription: async (subscriptionState: any) => {
        const state = get();

        try {
          // Crisis mode override
          if (state.crisisMode) {
            set({
              featureAccess: {
                therapeuticContent: true,
                crisisTools: true,
                emergencyContacts: true,
                hotlineAccess: true,
                assessments: true,
                breathingExercises: true,
                premiumFeatures: true
              },
              subscriptionState
            });
            return;
          }

          // Update based on subscription tier and features
          const newFeatureAccess = {
            therapeuticContent: subscriptionState.features.available.includes('core_mbct_practices'),
            crisisTools: true, // Always available
            emergencyContacts: true, // Always available
            hotlineAccess: true, // Always available
            assessments: subscriptionState.features.available.includes('phq9_assessment'),
            breathingExercises: subscriptionState.features.available.includes('breathing_exercises'),
            premiumFeatures: subscriptionState.tier?.id === 'premium'
          };

          set({
            featureAccess: newFeatureAccess,
            subscriptionState
          });

          // Clear feature cache when subscription changes
          state.featureGateCache.clear();

        } catch (error) {
          console.error('Feature access update failed:', error);
        }
      },

      /**
       * Sync subscription state from remote sources
       */
      syncSubscriptionState: async () => {
        const state = get();

        try {
          if (!state.subscriptionManager) {
            return;
          }

          // Get latest subscription state
          const subscriptionStatus = await state.subscriptionManager.getSubscriptionStatus();

          // Update feature access
          await state.updateFeatureAccessFromSubscription(subscriptionStatus);

          // Update trial countdown if applicable
          if (subscriptionStatus.trial?.active) {
            set({
              trialCountdown: {
                daysRemaining: subscriptionStatus.trial.daysRemaining,
                endDate: subscriptionStatus.trial.endDate,
                extended: subscriptionStatus.trial.extended,
                extensionReason: subscriptionStatus.trial.extensionReason
              }
            });
          }

          console.log('Subscription state synced successfully');

        } catch (error) {
          console.error('Subscription state sync failed:', error);
        }
      },

      /**
       * Set up real-time feature access monitoring
       */
      setupFeatureAccessMonitoring: () => {
        // Monitor subscription changes every 5 minutes
        const monitoringInterval = setInterval(async () => {
          const state = get();

          // Skip if in crisis mode (uses override)
          if (state.crisisMode) {
            return;
          }

          try {
            await state.syncSubscriptionState();
          } catch (error) {
            console.error('Feature access monitoring failed:', error);
          }
        }, 5 * 60 * 1000); // 5 minutes

        // Store interval for cleanup
        set({ _monitoringInterval: monitoringInterval });
      },

      /**
       * Initialize emergency subscription state for crisis safety
       */
      initializeEmergencySubscriptionState: async () => {
        console.log('Initializing emergency subscription state...');

        set({
          featureAccess: {
            therapeuticContent: true,
            crisisTools: true,
            emergencyContacts: true,
            hotlineAccess: true,
            assessments: true,
            breathingExercises: true,
            premiumFeatures: false // Conservative for emergency
          },
          subscriptionState: {
            current: null,
            tier: null,
            trial: null,
            gracePeriod: null,
            features: {
              available: ['crisis_detection', 'emergency_contacts', 'phq9_assessment', 'gad7_assessment'],
              restricted: [],
              crisisOverride: ['crisis_detection', 'emergency_contacts', 'hotline_988']
            },
            lastSyncTime: new Date().toISOString(),
            offlineMode: true,
            crisisMode: false
          }
        });

        console.log('Emergency subscription state initialized');
      },

      // Internal state management
      _monitoringInterval: null as any,

      /**
       * Start trial with MBCT-compliant onboarding
       */
      startMindfulTrial: async (trialDays = 21) => {
        const state = get();
        set({ loadingSubscription: true, lastPaymentError: null });

        try {
          const currentUser = await state.getCurrentUser();

          // Create customer data for trial
          const customerData: CustomerData = {
            userId: currentUser.id,
            email: currentUser.email,
            name: 'Mindful Explorer', // Placeholder
            metadata: {
              appUserId: currentUser.id,
              deviceId: currentUser.device_id,
              registrationDate: new Date().toISOString(),
              therapeuticConsent: true,
              crisisContactConsent: true
            }
          };

          // Activate trial through API
          const trialSubscription = await paymentAPIService.activateTrial(
            currentUser.id,
            customerData,
            trialDays
          );

          // Update local state
          set({
            activeSubscription: trialSubscription,
            loadingSubscription: false
          });

          // Log therapeutic onboarding
          await state.logTherapeuticEvent('trial_started', {
            trialDays,
            mindfulOnboarding: true,
            therapeuticJourney: 'beginning'
          });

          console.log(`${trialDays}-day mindful trial started successfully`);

        } catch (error) {
          console.error('Mindful trial start failed:', error);
          state.handlePaymentError(error);
          set({ loadingSubscription: false });
        }
      },

      /**
       * Convert trial to paid with non-pressured messaging
       */
      convertTrialToPaid: async (planId: string, paymentMethodId?: string) => {
        const state = get();
        const { activeSubscription } = state;

        if (!activeSubscription) {
          throw new Error('No active trial to convert');
        }

        set({ lastPaymentError: null });

        try {
          console.log(`Converting trial to ${planId} with mindful transition`);

          // Convert through API
          const paidSubscription = await paymentAPIService.convertTrialToPaid(
            activeSubscription.subscriptionId,
            planId,
            paymentMethodId
          );

          // Update local state
          set({ activeSubscription: paidSubscription });

          // Log therapeutic milestone
          await state.logTherapeuticEvent('trial_converted', {
            fromPlan: 'trial',
            toPlan: planId,
            therapeuticMilestone: true,
            mindfulUpgrade: true
          });

          console.log('Trial converted to paid subscription with therapeutic continuity');

        } catch (error) {
          console.error('Trial conversion failed:', error);
          state.handlePaymentError(error);
        }
      },

      /**
       * Handle payment failure with grace period support
       */
      handleSubscriptionPaymentFailure: async (errorDetails: {
        code: string;
        message: string;
        declineCode?: string;
        retryable: boolean;
      }) => {
        const state = get();
        const { activeSubscription } = state;

        if (!activeSubscription) {
          console.warn('No active subscription for payment failure handling');
          return;
        }

        try {
          console.log('Handling subscription payment failure with therapeutic continuity');

          // Handle through API
          const result = await paymentAPIService.handlePaymentFailure(
            activeSubscription.subscriptionId,
            errorDetails
          );

          // Update state to reflect grace period
          if (result.gracePeriodActivated) {
            const updatedSubscription = {
              ...activeSubscription,
              status: 'past_due' as const,
              // Add grace period metadata
              gracePeriod: {
                active: true,
                daysRemaining: result.gracePeriodDays,
                reason: `Payment issue: ${errorDetails.code}`,
                therapeuticContinuity: result.therapeuticContinuity
              }
            };

            set({ activeSubscription: updatedSubscription });

            // Clear payment error - grace period provides continuity
            set({ lastPaymentError: null });

            // Log therapeutic support
            await state.logTherapeuticEvent('grace_period_activated', {
              errorCode: errorDetails.code,
              gracePeriodDays: result.gracePeriodDays,
              therapeuticContinuity: result.therapeuticContinuity,
              supportiveTransition: true
            });

            console.log(`Grace period activated: ${result.gracePeriodDays} days with therapeutic continuity`);
          }

        } catch (error) {
          console.error('Payment failure handling failed:', error);

          // Emergency fallback - maintain therapeutic access
          await state.enableCrisisMode('Payment system failure - maintaining therapeutic access');
        }
      },

      /**
       * Get subscription recommendations with therapeutic messaging
       */
      getPersonalizedRecommendations: async () => {
        const state = get();

        try {
          const currentUser = await state.getCurrentUser();
          const recommendations = await paymentAPIService.getSubscriptionRecommendations(currentUser.id);

          return {
            ...recommendations,
            therapeuticContext: true,
            mindfulMessaging: true,
            crisisSafetyNote: 'Crisis support and safety features are always available regardless of subscription level.'
          };

        } catch (error) {
          console.error('Get personalized recommendations failed:', error);

          // Safe fallback recommendations
          return {
            recommended: {
              planId: 'basic',
              name: 'Basic MBCT',
              description: 'Essential mindfulness tools for your therapeutic journey',
              amount: 9.99,
              currency: 'usd',
              interval: 'month' as const,
              features: ['Core MBCT practices', 'Basic insights', 'Crisis support']
            },
            current: null,
            reasons: ['Start your mindful journey with essential features'],
            therapeuticBenefits: [
              'Core mindfulness practices for mental wellness',
              'Crisis support always available for your safety',
              'Progress tracking for therapeutic growth'
            ],
            pricing: {
              monthly: 9.99,
              annual: 99.99,
              savings: 19.89
            },
            mindfulUpgradeMessage: 'Take the next step in your mindfulness journey with features designed to support your therapeutic growth.',
            therapeuticContext: true,
            mindfulMessaging: true,
            crisisSafetyNote: 'Crisis support and safety features are always available regardless of subscription level.'
          };
        }
      },

      /**
       * Cancel subscription with retention and therapeutic support
       */
      cancelSubscriptionMindfully: async (reason: string) => {
        const state = get();
        const { activeSubscription } = state;

        if (!activeSubscription) {
          throw new Error('No active subscription to cancel');
        }

        try {
          console.log(`Processing mindful subscription cancellation: ${reason}`);

          // Cancel through API with retention flow
          const result = await paymentAPIService.cancelSubscriptionWithRetention(
            activeSubscription.subscriptionId,
            reason
          );

          if (!result.canceled && result.retentionOffer) {
            // Store retention offer for user consideration
            set({
              retentionOffer: result.retentionOffer,
              showRetentionDialog: true
            });

            console.log('Retention offer presented for mindful consideration');
            return {
              canceled: false,
              retentionOffered: true,
              offer: result.retentionOffer,
              message: 'We understand your needs may change. Consider this supportive option for your journey.'
            };
          }

          // Subscription was canceled
          set({
            activeSubscription: null,
            retentionOffer: null,
            showRetentionDialog: false
          });

          // Log therapeutic transition
          await state.logTherapeuticEvent('subscription_canceled', {
            reason,
            therapeuticTransition: 'supported',
            crisisAccessMaintained: result.therapeuticContinuity.crisisAccess,
            dataRetention: result.therapeuticContinuity.dataRetention
          });

          return {
            canceled: true,
            retentionOffered: false,
            therapeuticContinuity: result.therapeuticContinuity,
            message: 'Your therapeutic journey continues. Crisis support and safety features remain available.'
          };

        } catch (error) {
          console.error('Mindful cancellation failed:', error);
          state.handlePaymentError(error);
          throw error;
        }
      },

      /**
       * Helper methods for enhanced subscription management
       */
      calculateFeatureAccess: (subscriptionStatus: any) => {
        const defaultAccess = {
          therapeuticContent: false,
          crisisTools: true, // Always available
          emergencyContacts: true, // Always available
          hotlineAccess: true, // Always available
          assessments: true, // Basic assessments always available
          breathingExercises: false,
          premiumFeatures: false
        };

        if (!subscriptionStatus.subscription) {
          return defaultAccess;
        }

        const { tier, features } = subscriptionStatus;

        return {
          therapeuticContent: features.includes('core_mbct'),
          crisisTools: true,
          emergencyContacts: true,
          hotlineAccess: true,
          assessments: true,
          breathingExercises: features.includes('core_mbct'),
          premiumFeatures: tier === 'premium'
        };
      },

      logTherapeuticEvent: async (eventType: string, data: Record<string, any>) => {
        try {
          const eventData = {
            eventId: `therapeutic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            type: eventType,
            therapeuticContext: true,
            data
          };

          // Store therapeutic event for analytics
          const encryptedEvent = await encryptionService.encryptData(
            eventData,
            'SYSTEM',
            { therapeuticData: true, auditLog: true }
          );

          await SecureStore.setItemAsync(
            `therapeutic_event_${eventData.eventId}`,
            JSON.stringify(encryptedEvent)
          );

        } catch (error) {
          console.error('Therapeutic event logging failed:', error);
          // Don't fail operations due to logging issues
        }
      },

      // State management for retention flow
      retentionOffer: null,
      showRetentionDialog: false,

      acceptRetentionOffer: async () => {
        const state = get();
        const { retentionOffer, activeSubscription } = state;

        if (!retentionOffer || !activeSubscription) {
          return;
        }

        try {
          // Apply retention offer through API
          // This would be implemented based on offer type
          console.log(`Applying retention offer: ${retentionOffer.type}`);

          set({
            retentionOffer: null,
            showRetentionDialog: false
          });

          await state.logTherapeuticEvent('retention_offer_accepted', {
            offerType: retentionOffer.type,
            therapeuticSupport: true
          });

        } catch (error) {
          console.error('Retention offer acceptance failed:', error);
          state.handlePaymentError(error);
        }
      },

      declineRetentionOffer: async () => {
        const state = get();
        const { activeSubscription } = state;

        set({
          retentionOffer: null,
          showRetentionDialog: false,
          activeSubscription: null
        });

        if (activeSubscription) {
          await state.logTherapeuticEvent('retention_offer_declined', {
            proceededWithCancellation: true,
            therapeuticTransition: 'respected'
          });
        }

        console.log('Retention offer declined - proceeding with mindful cancellation');
      }
    }),
    STORAGE_CONFIG
  )
);

/**
 * Enhanced Payment Store Selectors with Subscription Manager Integration
 */
export const paymentSelectors = {
  // Crisis-aware subscription status with enhanced tiers
  getSubscriptionStatus: (state: PaymentStoreState) => {
    if (state.crisisMode) return 'crisis_access';
    if (state.subscriptionState?.current?.status) {
      return state.subscriptionState.current.status;
    }
    return state.activeSubscription?.status || 'none';
  },

  // Enhanced subscription tier detection
  getSubscriptionTier: (state: PaymentStoreState) => {
    if (state.crisisMode) return 'crisis_access';
    if (state.subscriptionState?.tier) {
      return state.subscriptionState.tier.id;
    }
    if (state.activeSubscription?.plan.planId) {
      return state.activeSubscription.plan.planId;
    }
    return 'none';
  },

  // Payment method availability with crisis consideration
  getAvailablePaymentMethods: (state: PaymentStoreState) => {
    if (state.crisisMode) return []; // No payment methods needed in crisis
    return state.paymentMethods.filter(pm => pm.metadata.verificationStatus === 'verified');
  },

  // Enhanced crisis-safe feature access with caching
  getFeatureAccess: (state: PaymentStoreState) => {
    // Crisis mode - all features available
    if (state.crisisMode) {
      return {
        therapeuticContent: true,
        crisisTools: true,
        emergencyContacts: true,
        hotlineAccess: true,
        assessments: true,
        breathingExercises: true,
        premiumFeatures: true,
        cloudSync: true,
        advancedInsights: true
      };
    }

    // Return cached feature access if available
    if (state.featureAccess) {
      return state.featureAccess;
    }

    // Fallback logic for legacy subscriptions
    const subscription = state.activeSubscription;
    if (!subscription || subscription.status !== 'active') {
      return {
        therapeuticContent: false,
        crisisTools: true, // Always available
        emergencyContacts: true, // Always available
        hotlineAccess: true, // Always available
        assessments: true, // Basic assessments always available
        breathingExercises: false,
        premiumFeatures: false,
        cloudSync: false,
        advancedInsights: false
      };
    }

    // Active subscription fallback
    const isPremium = subscription.plan.planId === 'premium';
    return {
      therapeuticContent: true,
      crisisTools: true,
      emergencyContacts: true,
      hotlineAccess: true,
      assessments: true,
      breathingExercises: true,
      premiumFeatures: isPremium,
      cloudSync: isPremium,
      advancedInsights: isPremium
    };
  },

  // Fast feature access check (selector version for components)
  canAccessFeature: (state: PaymentStoreState, featureId: string) => {
    // Crisis features always available
    const crisisFeatures = ['crisis_detection', 'emergency_contacts', 'hotline_988', 'safety_planning'];
    if (crisisFeatures.includes(featureId)) {
      return true;
    }

    // Crisis mode - all features available
    if (state.crisisMode) {
      return true;
    }

    // Check subscription state features if available
    if (state.subscriptionState?.features) {
      return state.subscriptionState.features.available.includes(featureId) ||
             state.subscriptionState.features.crisisOverride.includes(featureId);
    }

    // Fallback to feature access mapping
    const featureAccess = state.featureAccess || paymentSelectors.getFeatureAccess(state);
    const featureMap: Record<string, boolean> = {
      'phq9_assessment': featureAccess.assessments,
      'gad7_assessment': featureAccess.assessments,
      'breathing_exercises': featureAccess.breathingExercises,
      'core_mbct_practices': featureAccess.therapeuticContent,
      'cloud_sync': featureAccess.cloudSync || false,
      'advanced_insights': featureAccess.advancedInsights || false,
      'premium_features': featureAccess.premiumFeatures
    };

    return featureMap[featureId] || false;
  },

  // Trial information with countdown
  getTrialInfo: (state: PaymentStoreState) => {
    // Check subscription manager trial state first
    if (state.trialCountdown) {
      return state.trialCountdown;
    }

    // Fallback to subscription trial info
    if (state.activeSubscription?.status === 'trialing') {
      const trialEnd = state.activeSubscription.trialEnd;
      if (trialEnd) {
        const daysRemaining = Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        return {
          active: true,
          daysRemaining: Math.max(0, daysRemaining),
          endDate: trialEnd,
          extended: false
        };
      }
    }

    return null;
  },

  // Grace period information
  getGracePeriodInfo: (state: PaymentStoreState) => {
    if (state.subscriptionState?.gracePeriod?.active) {
      return state.subscriptionState.gracePeriod;
    }
    return null;
  },

  // Error handling with crisis awareness
  getPaymentErrorForUser: (state: PaymentStoreState) => {
    if (state.crisisMode && state.lastPaymentError) {
      return {
        ...state.lastPaymentError,
        userMessage: 'Payment features are temporarily limited, but all therapeutic and safety features remain fully accessible.',
        crisisImpact: 'none' as const
      };
    }
    return state.lastPaymentError;
  },

  // Enhanced performance metrics
  getPerformanceMetrics: (state: PaymentStoreState) => ({
    ...state._performanceMetrics,
    crisisModeEnabled: state.crisisMode,
    hasActiveSubscription: !!(state.subscriptionState?.current || state.activeSubscription),
    subscriptionTier: paymentSelectors.getSubscriptionTier(state),
    paymentMethodsCount: state.paymentMethods.length,
    featureCacheSize: state.featureGateCache?.size || 0,
    lastFeatureCheck: state.lastFeatureCheck || 0,
    subscriptionManagerActive: !!state.subscriptionManager
  }),

  // Subscription recommendations
  getNeedsUpgrade: (state: PaymentStoreState, featureId: string) => {
    if (state.crisisMode) return false; // No upgrades needed in crisis

    const hasAccess = paymentSelectors.canAccessFeature(state, featureId);
    if (hasAccess) return false;

    const currentTier = paymentSelectors.getSubscriptionTier(state);
    return currentTier === 'none' || currentTier === 'trial';
  },

  // Sync status information
  getSyncStatus: (state: PaymentStoreState) => ({
    lastSync: state.subscriptionState?.lastSyncTime || null,
    offlineMode: state.subscriptionState?.offlineMode || !navigator.onLine,
    syncEnabled: !!state.subscriptionManager,
    monitoringActive: !!state._monitoringInterval
  }),

  // Enhanced webhook processing status
  getWebhookStatus: (state: PaymentStoreState) => ({
    metrics: state._webhookMetrics,
    config: state._webhookConfig,
    queueSize: state._webhookQueue?.size || 0,
    stateUpdateQueueSize: state._stateUpdateQueue?.size || 0,
    gracePeriodCount: state._gracePeriodManager?.size || 0,
    realTimeUpdatesActive: !!state._realTimeUpdateInterval,
    gracePeriodMonitorActive: !!state._gracePeriodMonitorInterval
  }),

  // Grace period information with detailed status
  getGracePeriodStatus: (state: PaymentStoreState) => {
    const gracePeriodInfo = state.subscriptionState?.gracePeriod;
    if (!gracePeriodInfo?.active) return null;

    return {
      ...gracePeriodInfo,
      totalActivePeriods: state._gracePeriodManager?.size || 0,
      therapeuticContinuityEnabled: gracePeriodInfo.therapeuticContinuity,
      daysRemainingFormatted: gracePeriodInfo.daysRemaining === 1
        ? '1 day remaining'
        : `${gracePeriodInfo.daysRemaining} days remaining`
    };
  },

  // Real-time update status
  getRealTimeUpdateStatus: (state: PaymentStoreState) => ({
    enabled: state._webhookConfig.realTimeUpdates,
    processingInterval: !!state._realTimeUpdateInterval,
    totalProcessed: state._webhookMetrics.realTimeUpdatesProcessed,
    queueSize: Array.from(state._stateUpdateQueue?.values() || [])
      .filter(update => !update.processed).length,
    lastUpdateTime: state._webhookMetrics.lastEventProcessed
  })
};

/**
 * Enhanced Payment Store Hooks for Component Integration
 */
export const usePaymentActions = () => {
  const store = usePaymentStore();
  return {
    // Core payment actions
    initializePayments: store.initializePayments,
    loadCustomer: store.loadCustomer,
    createCustomer: store.createCustomer,
    loadPaymentMethods: store.loadPaymentMethods,
    addPaymentMethod: store.addPaymentMethod,
    createSubscription: store.createSubscription,

    // Enhanced subscription actions
    initializeSubscriptionManager: store.initializeSubscriptionManager,
    syncSubscriptionState: store.syncSubscriptionState,
    checkFeatureAccess: store.checkFeatureAccess,
    updateFeatureAccessFromSubscription: store.updateFeatureAccessFromSubscription,

    // Enhanced webhook actions
    initializeWebhookProcessing: store.initializeWebhookProcessing,
    updateSubscriptionFromWebhook: store.updateSubscriptionFromWebhook,
    cleanupWebhookResources: store.cleanupWebhookResources,

    // Trial management
    startMindfulTrial: store.startMindfulTrial,
    convertTrialToPaid: store.convertTrialToPaid,
    handleSubscriptionPaymentFailure: store.handleSubscriptionPaymentFailure,
    cancelSubscriptionMindfully: store.cancelSubscriptionMindfully,

    // Crisis management
    enableCrisisMode: store.enableCrisisMode,
    disableCrisisMode: store.disableCrisisMode,

    // UI actions
    showPaymentSheet: store.showPaymentSheet,
    hidePaymentSheet: store.hidePaymentSheet,
    showSubscriptionSelector: store.showSubscriptionSelector,
    hideSubscriptionSelector: store.hideSubscriptionSelector
  };
};

export const usePaymentStatus = () => {
  const store = usePaymentStore();
  return {
    // Basic status
    subscriptionStatus: paymentSelectors.getSubscriptionStatus(store),
    subscriptionTier: paymentSelectors.getSubscriptionTier(store),
    featureAccess: paymentSelectors.getFeatureAccess(store),
    paymentError: paymentSelectors.getPaymentErrorForUser(store),

    // Enhanced subscription information
    trialInfo: paymentSelectors.getTrialInfo(store),
    gracePeriodInfo: paymentSelectors.getGracePeriodInfo(store),
    syncStatus: paymentSelectors.getSyncStatus(store),

    // Enhanced webhook processing status
    webhookStatus: paymentSelectors.getWebhookStatus(store),
    gracePeriodStatus: paymentSelectors.getGracePeriodStatus(store),
    realTimeUpdateStatus: paymentSelectors.getRealTimeUpdateStatus(store),

    // Loading states
    isLoading: store.loadingCustomer || store.loadingSubscription || store.paymentInProgress,
    crisisMode: store.crisisMode,

    // Performance metrics
    performanceMetrics: paymentSelectors.getPerformanceMetrics(store)
  };
};

export const useFeatureAccess = (featureId?: string) => {
  const store = usePaymentStore();

  return {
    // Feature access status
    canAccessFeature: (feature: string) => paymentSelectors.canAccessFeature(store, feature),
    hasAccess: featureId ? paymentSelectors.canAccessFeature(store, featureId) : null,
    needsUpgrade: featureId ? paymentSelectors.getNeedsUpgrade(store, featureId) : false,

    // Feature access information
    featureAccess: paymentSelectors.getFeatureAccess(store),
    checkFeatureAccess: store.checkFeatureAccess,

    // Subscription context
    subscriptionTier: paymentSelectors.getSubscriptionTier(store),
    crisisMode: store.crisisMode,
    trialActive: !!paymentSelectors.getTrialInfo(store)?.active,

    // Performance
    cacheSize: store.featureGateCache?.size || 0,
    lastCheck: store.lastFeatureCheck
  };
};

export const useSubscriptionManagement = () => {
  const store = usePaymentStore();

  return {
    // Subscription state
    subscriptionState: store.subscriptionState,
    trialCountdown: store.trialCountdown,

    // Subscription actions
    getSubscriptionStatusDetailed: store.getSubscriptionStatusDetailed,
    startMindfulTrial: store.startMindfulTrial,
    convertTrialToPaid: store.convertTrialToPaid,
    getPersonalizedRecommendations: store.getPersonalizedRecommendations,
    cancelSubscriptionMindfully: store.cancelSubscriptionMindfully,

    // Grace period management
    handleSubscriptionPaymentFailure: store.handleSubscriptionPaymentFailure,
    gracePeriodInfo: paymentSelectors.getGracePeriodInfo(store),

    // Retention flow
    retentionOffer: store.retentionOffer,
    showRetentionDialog: store.showRetentionDialog,
    acceptRetentionOffer: store.acceptRetentionOffer,
    declineRetentionOffer: store.declineRetentionOffer,

    // State management
    syncSubscriptionState: store.syncSubscriptionState,
    subscriptionManager: store.subscriptionManager,
    paymentAwareFeatureGates: store.paymentAwareFeatureGates
  };
};

export const useCrisisPaymentSafety = () => {
  const store = usePaymentStore();
  return {
    // Crisis state
    crisisMode: store.crisisMode,
    crisisOverride: store.crisisOverride,

    // Crisis actions
    enableCrisisMode: store.enableCrisisMode,
    disableCrisisMode: store.disableCrisisMode,

    // Crisis-safe feature access
    featureAccess: paymentSelectors.getFeatureAccess(store),
    canAccessFeature: (feature: string) => paymentSelectors.canAccessFeature(store, feature),

    // Emergency state
    subscriptionState: store.subscriptionState,
    initializeEmergencySubscriptionState: store.initializeEmergencySubscriptionState,

    // Performance and safety metrics
    performanceMetrics: paymentSelectors.getPerformanceMetrics(store),
    syncStatus: paymentSelectors.getSyncStatus(store)
  };
};

// Specialized hook for trial management
export const useTrialManagement = () => {
  const store = usePaymentStore();
  const trialInfo = paymentSelectors.getTrialInfo(store);

  return {
    // Trial state
    trialActive: !!trialInfo?.active,
    trialInfo,
    daysRemaining: trialInfo?.daysRemaining || 0,
    trialExtended: trialInfo?.extended || false,

    // Trial actions
    startMindfulTrial: store.startMindfulTrial,
    convertTrialToPaid: store.convertTrialToPaid,

    // Trial countdown component data
    showCountdown: !!trialInfo?.active && trialInfo.daysRemaining <= 7,
    countdownMessage: trialInfo?.active
      ? `${trialInfo.daysRemaining} days remaining in your mindful exploration`
      : null,

    // Conversion recommendations
    getPersonalizedRecommendations: store.getPersonalizedRecommendations,
    subscriptionTier: paymentSelectors.getSubscriptionTier(store)
  };
};

// Enhanced hook for webhook processing and real-time state management
export const useWebhookProcessing = () => {
  const store = usePaymentStore();

  return {
    // Webhook processing status
    webhookStatus: paymentSelectors.getWebhookStatus(store),
    realTimeUpdateStatus: paymentSelectors.getRealTimeUpdateStatus(store),
    gracePeriodStatus: paymentSelectors.getGracePeriodStatus(store),

    // Webhook actions
    initializeWebhookProcessing: store.initializeWebhookProcessing,
    updateSubscriptionFromWebhook: store.updateSubscriptionFromWebhook,
    cleanupWebhookResources: store.cleanupWebhookResources,

    // Grace period management
    gracePeriodManager: store._gracePeriodManager,
    checkAndUpdateGracePeriods: store.checkAndUpdateGracePeriods,

    // Real-time updates
    processRealTimeUpdate: store.processRealTimeUpdate,
    processQueuedRealTimeUpdates: store.processQueuedRealTimeUpdates,

    // Performance metrics
    webhookMetrics: store._webhookMetrics,
    averageProcessingTime: store._webhookMetrics.averageProcessingTime,
    crisisEventsProcessed: store._webhookMetrics.crisisProcessed,
    totalEventsProcessed: store._webhookMetrics.totalProcessed,

    // Configuration
    webhookConfig: store._webhookConfig,
    gracePeriodDays: store._webhookConfig.gracePeriodDays,
    crisisTimeoutMs: store._webhookConfig.crisisTimeoutMs
  };
};

// Grace period monitoring hook for UI components
export const useGracePeriodMonitoring = () => {
  const store = usePaymentStore();
  const gracePeriodStatus = paymentSelectors.getGracePeriodStatus(store);

  return {
    // Grace period state
    gracePeriodActive: !!gracePeriodStatus?.active,
    gracePeriodStatus,
    daysRemaining: gracePeriodStatus?.daysRemaining || 0,
    daysRemainingFormatted: gracePeriodStatus?.daysRemainingFormatted || null,
    therapeuticContinuity: gracePeriodStatus?.therapeuticContinuityEnabled || false,

    // Grace period actions
    checkAndUpdateGracePeriods: store.checkAndUpdateGracePeriods,
    gracePeriodManager: store._gracePeriodManager,

    // Therapeutic messaging for grace period
    gracePeriodReason: gracePeriodStatus?.reason || null,
    showGracePeriodBanner: !!gracePeriodStatus?.active && gracePeriodStatus.daysRemaining <= 3,

    // Feature access during grace period
    featureAccess: paymentSelectors.getFeatureAccess(store),
    maintainedAccess: gracePeriodStatus?.active
      ? ['therapeuticContent', 'assessments', 'breathingExercises', 'crisisTools']
      : [],

    // Metrics
    totalActivePeriods: gracePeriodStatus?.totalActivePeriods || 0,
    gracePeriodActivations: store._webhookMetrics.gracePeriodActivations
  };
};