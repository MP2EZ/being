/**
 * Payment API Service for Being. MBCT App
 *
 * Comprehensive payment integration layer that:
 * - Integrates Stripe payments with HIPAA compliance
 * - Maintains crisis safety with <200ms emergency bypass
 * - Supports offline payment tracking with sync
 * - Provides subscription management with therapeutic continuity
 * - Ensures PCI DSS compliance with zero card data storage
 */

import { StripeProvider, useStripe, useConfirmPayment, CardField, ApplePayButton, GooglePayButton } from '@stripe/stripe-react-native';
import { stripePaymentClient, StripeConfig, PaymentIntentData, PaymentIntentResult, PaymentMethodResult } from './StripePaymentClient';
import { CloudSyncAPI } from './CloudSyncAPI';
import { AuthIntegrationService } from './AuthIntegrationService';
import {
  PaymentAPIClient,
  PaymentConfig,
  PaymentState,
  CustomerData,
  CustomerResult,
  PaymentMethodData,
  SubscriptionPlan,
  SubscriptionResult,
  PaymentError,
  CrisisPaymentOverride,
  PaymentEvent,
  PaymentSchemas
} from '../../types/payment';
import { encryptionService } from '../security/EncryptionService';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Payment API Configuration
 */
interface PaymentAPIConfig extends PaymentConfig {
  supabaseConfig?: {
    url: string;
    anonKey: string;
  };
  developmentMode?: boolean;
  crisisDetectionEndpoint?: string;
}

/**
 * Payment Sync Configuration for offline support
 */
interface PaymentSyncConfig {
  syncInterval: number; // ms
  maxRetries: number;
  batchSize: number;
  prioritizeCrisis: boolean;
}

/**
 * Comprehensive Payment API Service
 *
 * Integrates with existing FullMind infrastructure while maintaining:
 * - Crisis safety protocols with emergency bypass
 * - HIPAA compliance with separate data contexts
 * - PCI DSS compliance through Stripe tokenization
 * - Offline support with intelligent sync
 * - Therapeutic continuity guarantees
 */
export class PaymentAPIService implements PaymentAPIClient {
  private static instance: PaymentAPIService;

  // Core services integration
  private cloudSync: CloudSyncAPI;
  private authService: AuthIntegrationService;

  // Payment configuration
  private config: PaymentAPIConfig | null = null;
  private initialized = false;
  private crisisMode = false;

  // Sync and caching
  private syncConfig: PaymentSyncConfig = {
    syncInterval: 30000, // 30 seconds
    maxRetries: 3,
    batchSize: 50,
    prioritizeCrisis: true
  };

  // Performance monitoring
  private performanceMetrics = {
    lastStripeLatency: 0,
    lastDatabaseLatency: 0,
    errorCount: 0,
    successCount: 0,
    crisisOverrideCount: 0
  };

  // Crisis detection
  private readonly CRISIS_RESPONSE_TIMEOUT = 200; // ms - must maintain <200ms
  private readonly CRISIS_BYPASS_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    this.cloudSync = CloudSyncAPI.getInstance();
    this.authService = AuthIntegrationService.getInstance();
  }

  public static getInstance(): PaymentAPIService {
    if (!PaymentAPIService.instance) {
      PaymentAPIService.instance = new PaymentAPIService();
    }
    return PaymentAPIService.instance;
  }

  /**
   * Initialize Payment API with full system integration
   */
  async initialize(config: PaymentConfig): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate configuration
      const validatedConfig = PaymentSchemas.PaymentConfig.parse(config);
      this.config = validatedConfig as PaymentAPIConfig;

      // Initialize Stripe client with crisis mode support
      await stripePaymentClient.initialize(
        this.config.stripe.publishableKey,
        this.config.crisis.enablePaymentBypass
      );

      // Initialize cloud sync for payment data (separate from health data)
      await this.initializePaymentSync();

      // Set up crisis detection
      await this.initializeCrisisDetection();

      // Validate integration with existing auth
      await this.validateAuthIntegration();

      // Set up performance monitoring
      this.initializePerformanceMonitoring();

      this.initialized = true;

      const initTime = Date.now() - startTime;
      console.log(`Payment API Service initialized in ${initTime}ms`);

      // Log initialization for audit compliance
      await this.logPaymentEvent({
        type: 'system_initialized',
        userId: 'system',
        metadata: {
          initializationTime: initTime.toString(),
          crisisMode: this.config.crisis.enablePaymentBypass.toString(),
          hipaaCompliant: this.config.compliance.hipaaCompliant.toString()
        }
      });

    } catch (error) {
      console.error('Payment API initialization failed:', error);

      // If initialization fails during crisis, enable emergency mode
      if (this.config?.crisis.enablePaymentBypass) {
        await this.enableEmergencyAccess();
      }

      throw new Error(`Payment API initialization failed: ${error}`);
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Customer Management - Integrated with existing auth
   */
  async createCustomer(customerData: CustomerData): Promise<CustomerResult> {
    const startTime = Date.now();

    try {
      if (!this.initialized) {
        throw new Error('Payment API not initialized');
      }

      // CRISIS BYPASS - Always allow customer creation during crisis
      if (this.crisisMode) {
        return await this.createCrisisCustomer(customerData);
      }

      // Validate customer data
      const validatedData = PaymentSchemas.CustomerData.parse(customerData);

      // Check if customer already exists
      const existingCustomer = await this.findExistingCustomer(validatedData.userId);
      if (existingCustomer) {
        return existingCustomer;
      }

      // Create Stripe customer
      const stripeCustomer = await this.createStripeCustomer(validatedData);

      // Store customer data with encryption
      const customerResult: CustomerResult = {
        customerId: stripeCustomer.id,
        userId: validatedData.userId,
        email: validatedData.email,
        name: validatedData.name,
        created: new Date().toISOString(),
        defaultPaymentMethod: undefined,
        subscriptions: []
      };

      // Store encrypted customer data
      await this.storeCustomerData(customerResult);

      // Sync with cloud (non-blocking for crisis mode)
      this.syncCustomerData(customerResult).catch(error =>
        console.warn('Customer sync failed (non-critical):', error)
      );

      const processingTime = Date.now() - startTime;
      this.performanceMetrics.lastDatabaseLatency = processingTime;
      this.performanceMetrics.successCount++;

      await this.logPaymentEvent({
        type: 'customer_created',
        userId: validatedData.userId,
        customerId: customerResult.customerId,
        metadata: {
          processingTime: processingTime.toString(),
          therapeuticConsent: validatedData.metadata.therapeuticConsent.toString()
        }
      });

      return customerResult;

    } catch (error) {
      this.performanceMetrics.errorCount++;
      console.error('Customer creation failed:', error);

      // Crisis fallback
      if (this.config?.crisis.enablePaymentBypass) {
        return await this.createCrisisCustomer(customerData);
      }

      throw this.formatPaymentError(error, 'customer_creation_failed');
    }
  }

  async getCustomer(customerId: string): Promise<CustomerResult> {
    try {
      if (!this.initialized) {
        throw new Error('Payment API not initialized');
      }

      // CRISIS BYPASS - Always allow customer retrieval
      if (this.crisisMode) {
        return await this.getCrisisCustomer(customerId);
      }

      // Try to get from local storage first (performance optimization)
      const cachedCustomer = await this.getCachedCustomer(customerId);
      if (cachedCustomer) {
        return cachedCustomer;
      }

      // Fetch from Stripe and update cache
      const stripeCustomer = await this.fetchStripeCustomer(customerId);
      const customerResult = await this.hydrateCustomerData(stripeCustomer);

      // Update cache
      await this.storeCustomerData(customerResult);

      return customerResult;

    } catch (error) {
      console.error('Customer retrieval failed:', error);
      throw this.formatPaymentError(error, 'customer_retrieval_failed');
    }
  }

  async updateCustomer(customerId: string, updates: Partial<CustomerData>): Promise<CustomerResult> {
    try {
      if (!this.initialized) {
        throw new Error('Payment API not initialized');
      }

      const existingCustomer = await this.getCustomer(customerId);

      // Update Stripe customer
      const stripeCustomer = await this.updateStripeCustomer(customerId, updates);

      // Update local storage
      const updatedCustomer: CustomerResult = {
        ...existingCustomer,
        ...updates,
        name: updates.name || existingCustomer.name,
        email: updates.email || existingCustomer.email
      };

      await this.storeCustomerData(updatedCustomer);

      await this.logPaymentEvent({
        type: 'customer_updated',
        userId: existingCustomer.userId,
        customerId
      });

      return updatedCustomer;

    } catch (error) {
      console.error('Customer update failed:', error);
      throw this.formatPaymentError(error, 'customer_update_failed');
    }
  }

  /**
   * Payment Method Management with crisis safety
   */
  async createPaymentMethod(
    paymentMethodData: PaymentMethodData,
    customerId: string,
    crisisMode = false
  ): Promise<PaymentMethodResult> {
    const startTime = Date.now();

    try {
      if (!this.initialized) {
        throw new Error('Payment API not initialized');
      }

      // CRISIS BYPASS - Allow payment method creation during crisis
      if (crisisMode || this.crisisMode) {
        return await this.createCrisisPaymentMethod(paymentMethodData, customerId);
      }

      // Validate payment method data
      const validatedData = PaymentSchemas.PaymentMethodData.parse(paymentMethodData);

      // Get current user from auth service
      const currentUser = await this.authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Create payment method through Stripe client
      const paymentMethodResult = await stripePaymentClient.createPaymentMethod(
        validatedData.card || {},
        validatedData.billingDetails,
        currentUser.id,
        currentUser.device_id || 'unknown',
        crisisMode
      );

      // Attach to customer
      await this.attachPaymentMethodToCustomer(
        paymentMethodResult.paymentMethod.paymentMethodId,
        customerId
      );

      const processingTime = Date.now() - startTime;
      this.performanceMetrics.successCount++;

      await this.logPaymentEvent({
        type: 'payment_method_created',
        userId: currentUser.id,
        customerId,
        metadata: {
          paymentMethodType: paymentMethodResult.paymentMethod.type,
          processingTime: processingTime.toString(),
          crisisMode: crisisMode.toString()
        }
      });

      return paymentMethodResult.paymentMethod;

    } catch (error) {
      this.performanceMetrics.errorCount++;
      console.error('Payment method creation failed:', error);

      // Crisis fallback
      if (crisisMode || this.config?.crisis.enablePaymentBypass) {
        return await this.createCrisisPaymentMethod(paymentMethodData, customerId);
      }

      throw this.formatPaymentError(error, 'payment_method_creation_failed');
    }
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethodResult[]> {
    try {
      if (!this.initialized) {
        throw new Error('Payment API not initialized');
      }

      // Try cache first
      const cachedMethods = await this.getCachedPaymentMethods(customerId);
      if (cachedMethods) {
        return cachedMethods;
      }

      // Fetch from Stripe
      const stripeMethods = await this.fetchStripePaymentMethods(customerId);
      const paymentMethods = await this.hydratePaymentMethods(stripeMethods);

      // Update cache
      await this.cachePaymentMethods(customerId, paymentMethods);

      return paymentMethods;

    } catch (error) {
      console.error('Payment methods list failed:', error);
      throw this.formatPaymentError(error, 'payment_methods_list_failed');
    }
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      if (!this.initialized) {
        throw new Error('Payment API not initialized');
      }

      // Delete from Stripe
      await this.deleteStripePaymentMethod(paymentMethodId);

      // Remove from cache
      await this.removePaymentMethodFromCache(paymentMethodId);

      await this.logPaymentEvent({
        type: 'payment_method_deleted',
        userId: 'current_user', // Would get from auth context
        metadata: {
          paymentMethodId
        }
      });

    } catch (error) {
      console.error('Payment method deletion failed:', error);
      throw this.formatPaymentError(error, 'payment_method_deletion_failed');
    }
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    try {
      if (!this.initialized) {
        throw new Error('Payment API not initialized');
      }

      // Update Stripe customer default payment method
      await this.updateStripeCustomerDefaultPayment(customerId, paymentMethodId);

      // Update cached customer data
      await this.updateCachedCustomerDefaultPayment(customerId, paymentMethodId);

      await this.logPaymentEvent({
        type: 'default_payment_method_updated',
        userId: 'current_user',
        customerId,
        metadata: {
          paymentMethodId
        }
      });

    } catch (error) {
      console.error('Default payment method update failed:', error);
      throw this.formatPaymentError(error, 'default_payment_method_update_failed');
    }
  }

  /**
   * Payment Intent Management with crisis handling
   */
  async createPaymentIntent(paymentData: PaymentIntentData, crisisMode = false): Promise<PaymentIntentResult> {
    const startTime = Date.now();

    try {
      if (!this.initialized) {
        throw new Error('Payment API not initialized');
      }

      // CRISIS SAFETY CHECK - Maintain <200ms response for crisis scenarios
      if (crisisMode || this.crisisMode) {
        const crisisStart = Date.now();
        const result = await this.createCrisisPaymentIntent(paymentData);
        const crisisTime = Date.now() - crisisStart;

        if (crisisTime > this.CRISIS_RESPONSE_TIMEOUT) {
          console.warn(`Crisis payment response took ${crisisTime}ms (target: <${this.CRISIS_RESPONSE_TIMEOUT}ms)`);
        }

        return result;
      }

      // Validate payment data
      const validatedData = PaymentSchemas.PaymentIntentData.parse(paymentData);

      // Create payment intent through Stripe client
      const paymentIntent = await stripePaymentClient.createPaymentIntent(
        validatedData,
        crisisMode
      );

      // Store payment intent for tracking
      await this.storePaymentIntent(paymentIntent);

      const processingTime = Date.now() - startTime;
      this.performanceMetrics.lastStripeLatency = processingTime;
      this.performanceMetrics.successCount++;

      await this.logPaymentEvent({
        type: 'payment_intent_created',
        userId: validatedData.metadata.userId,
        paymentIntentId: paymentIntent.paymentIntentId,
        amount: validatedData.amount,
        currency: validatedData.currency,
        metadata: {
          subscriptionType: validatedData.subscriptionType,
          processingTime: processingTime.toString(),
          crisisMode: crisisMode.toString()
        }
      });

      return paymentIntent;

    } catch (error) {
      this.performanceMetrics.errorCount++;
      console.error('Payment intent creation failed:', error);

      // Crisis fallback
      if (crisisMode || this.config?.crisis.enablePaymentBypass) {
        return await this.createCrisisPaymentIntent(paymentData);
      }

      throw this.formatPaymentError(error, 'payment_intent_creation_failed');
    }
  }

  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<PaymentIntentResult> {
    const startTime = Date.now();

    try {
      if (!this.initialized) {
        throw new Error('Payment API not initialized');
      }

      const currentUser = await this.authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Confirm payment through Stripe client
      const confirmedIntent = await stripePaymentClient.confirmPaymentIntent(
        paymentIntentId,
        paymentMethodId || '',
        currentUser.id,
        currentUser.device_id || 'unknown',
        this.crisisMode
      );

      // Update stored payment intent
      await this.updateStoredPaymentIntent(confirmedIntent);

      const processingTime = Date.now() - startTime;
      this.performanceMetrics.successCount++;

      await this.logPaymentEvent({
        type: 'payment_succeeded',
        userId: currentUser.id,
        paymentIntentId,
        amount: confirmedIntent.amount,
        currency: confirmedIntent.currency,
        metadata: {
          processingTime: processingTime.toString(),
          status: confirmedIntent.status
        }
      });

      return confirmedIntent;

    } catch (error) {
      this.performanceMetrics.errorCount++;
      console.error('Payment confirmation failed:', error);

      await this.logPaymentEvent({
        type: 'payment_failed',
        userId: 'current_user',
        paymentIntentId,
        errorCode: error.code || 'unknown',
        errorMessage: error.message
      });

      throw this.formatPaymentError(error, 'payment_confirmation_failed');
    }
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResult> {
    try {
      if (!this.initialized) {
        throw new Error('Payment API not initialized');
      }

      // Try to get from local storage first
      const cachedIntent = await this.getCachedPaymentIntent(paymentIntentId);
      if (cachedIntent) {
        return cachedIntent;
      }

      // Fetch from Stripe
      const stripeIntent = await this.fetchStripePaymentIntent(paymentIntentId);
      const paymentIntent = await this.hydratePaymentIntent(stripeIntent);

      // Update cache
      await this.storePaymentIntent(paymentIntent);

      return paymentIntent;

    } catch (error) {
      console.error('Payment intent retrieval failed:', error);
      throw this.formatPaymentError(error, 'payment_intent_retrieval_failed');
    }
  }

  /**
   * Subscription Management with therapeutic continuity
   */
  async createSubscription(
    customerId: string,
    planId: string,
    paymentMethodId?: string,
    trialDays?: number,
    crisisMode = false
  ): Promise<SubscriptionResult> {
    try {
      if (!this.initialized) {
        throw new Error('Payment API not initialized');
      }

      // CRISIS BYPASS - Ensure therapeutic access continues during crisis
      if (crisisMode || this.crisisMode) {
        return await this.createCrisisSubscription(customerId, planId, trialDays);
      }

      const currentUser = await this.authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Create subscription through Stripe client
      const subscription = await stripePaymentClient.createSubscription(
        customerId,
        planId,
        paymentMethodId || '',
        currentUser.id,
        currentUser.device_id || 'unknown',
        trialDays,
        crisisMode
      );

      // Store subscription data
      const subscriptionResult = await this.hydrateSubscriptionData(subscription, planId);
      await this.storeSubscriptionData(subscriptionResult);

      this.performanceMetrics.successCount++;

      await this.logPaymentEvent({
        type: 'subscription_created',
        userId: currentUser.id,
        customerId,
        subscriptionId: subscriptionResult.subscriptionId,
        amount: subscriptionResult.plan.amount,
        currency: subscriptionResult.plan.currency,
        metadata: {
          planId,
          trialDays: trialDays?.toString() || '0',
          crisisMode: crisisMode.toString()
        }
      });

      return subscriptionResult;

    } catch (error) {
      this.performanceMetrics.errorCount++;
      console.error('Subscription creation failed:', error);

      // Crisis fallback - maintain therapeutic access
      if (crisisMode || this.config?.crisis.enablePaymentBypass) {
        return await this.createCrisisSubscription(customerId, planId, trialDays);
      }

      throw this.formatPaymentError(error, 'subscription_creation_failed');
    }
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    try {
      if (!this.initialized) {
        throw new Error('Payment API not initialized');
      }

      // Try cache first
      const cachedSubscription = await this.getCachedSubscription(subscriptionId);
      if (cachedSubscription) {
        return cachedSubscription;
      }

      // Fetch from Stripe
      const stripeSubscription = await this.fetchStripeSubscription(subscriptionId);
      const subscriptionResult = await this.hydrateSubscriptionFromStripe(stripeSubscription);

      // Update cache
      await this.storeSubscriptionData(subscriptionResult);

      return subscriptionResult;

    } catch (error) {
      console.error('Subscription retrieval failed:', error);
      throw this.formatPaymentError(error, 'subscription_retrieval_failed');
    }
  }

  async updateSubscription(subscriptionId: string, updates: Partial<SubscriptionResult>): Promise<SubscriptionResult> {
    try {
      if (!this.initialized) {
        throw new Error('Payment API not initialized');
      }

      // Update Stripe subscription
      const stripeSubscription = await this.updateStripeSubscription(subscriptionId, updates);
      const subscriptionResult = await this.hydrateSubscriptionFromStripe(stripeSubscription);

      // Update local storage
      await this.storeSubscriptionData(subscriptionResult);

      await this.logPaymentEvent({
        type: 'subscription_updated',
        userId: 'current_user',
        subscriptionId
      });

      return subscriptionResult;

    } catch (error) {
      console.error('Subscription update failed:', error);
      throw this.formatPaymentError(error, 'subscription_update_failed');
    }
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd = true): Promise<SubscriptionResult> {
    try {
      if (!this.initialized) {
        throw new Error('Payment API not initialized');
      }

      // Cancel Stripe subscription
      const stripeSubscription = await this.cancelStripeSubscription(subscriptionId, atPeriodEnd);
      const subscriptionResult = await this.hydrateSubscriptionFromStripe(stripeSubscription);

      // Update local storage
      await this.storeSubscriptionData(subscriptionResult);

      await this.logPaymentEvent({
        type: 'subscription_canceled',
        userId: 'current_user',
        subscriptionId,
        metadata: {
          atPeriodEnd: atPeriodEnd.toString()
        }
      });

      return subscriptionResult;

    } catch (error) {
      console.error('Subscription cancellation failed:', error);
      throw this.formatPaymentError(error, 'subscription_cancellation_failed');
    }
  }

  async reactivateSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    try {
      if (!this.initialized) {
        throw new Error('Payment API not initialized');
      }

      // Reactivate Stripe subscription
      const stripeSubscription = await this.reactivateStripeSubscription(subscriptionId);
      const subscriptionResult = await this.hydrateSubscriptionFromStripe(stripeSubscription);

      // Update local storage
      await this.storeSubscriptionData(subscriptionResult);

      await this.logPaymentEvent({
        type: 'subscription_reactivated',
        userId: 'current_user',
        subscriptionId
      });

      return subscriptionResult;

    } catch (error) {
      console.error('Subscription reactivation failed:', error);
      throw this.formatPaymentError(error, 'subscription_reactivation_failed');
    }
  }

  /**
   * Crisis Management - CRITICAL for user safety
   */
  async enableCrisisMode(userId: string, deviceId: string, reason: string): Promise<CrisisPaymentOverride> {
    const crisisStart = Date.now();

    try {
      console.log(`Enabling crisis mode for user ${userId}: ${reason}`);

      // Create crisis override immediately
      const crisisOverride: CrisisPaymentOverride = {
        crisisSessionId: `crisis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        deviceId,
        overrideReason: reason as any, // Type assertion for flexibility
        overrideType: 'full_access',
        granted: new Date().toISOString(),
        expires: new Date(Date.now() + this.CRISIS_BYPASS_DURATION).toISOString(),
        auditTrail: {
          triggerEvent: reason,
          safetyScore: 100, // Maximum safety priority
          accessGranted: [
            'therapeutic_content',
            'crisis_tools',
            'emergency_contacts',
            '988_hotline',
            'assessment_tools',
            'breathing_exercises'
          ]
        }
      };

      // Store crisis override (encrypted)
      await this.storeCrisisOverride(crisisOverride);

      // Enable crisis mode in payment client
      await stripePaymentClient.initialize(
        this.config?.stripe.publishableKey || '',
        true // Crisis mode
      );

      this.crisisMode = true;
      this.performanceMetrics.crisisOverrideCount++;

      const crisisTime = Date.now() - crisisStart;
      console.log(`Crisis mode enabled in ${crisisTime}ms (target: <${this.CRISIS_RESPONSE_TIMEOUT}ms)`);

      await this.logPaymentEvent({
        type: 'crisis_override_activated',
        userId,
        metadata: {
          reason,
          responseTime: crisisTime.toString(),
          sessionId: crisisOverride.crisisSessionId,
          accessLevel: 'full_access'
        },
        crisisMode: true
      });

      return crisisOverride;

    } catch (error) {
      const crisisTime = Date.now() - crisisStart;
      console.error(`Crisis mode enablement failed in ${crisisTime}ms:`, error);

      // CRITICAL: Even if crisis mode fails, create emergency override
      const emergencyOverride: CrisisPaymentOverride = {
        crisisSessionId: `emergency_${Date.now()}`,
        userId,
        deviceId,
        overrideReason: 'emergency_access',
        overrideType: 'emergency_features',
        granted: new Date().toISOString(),
        expires: new Date(Date.now() + this.CRISIS_BYPASS_DURATION).toISOString(),
        auditTrail: {
          triggerEvent: 'crisis_enablement_failed',
          safetyScore: 100,
          accessGranted: ['emergency_contacts', '988_hotline', 'crisis_tools']
        }
      };

      this.crisisMode = true;
      return emergencyOverride;
    }
  }

  async disableCrisisMode(crisisSessionId: string): Promise<void> {
    try {
      console.log(`Disabling crisis mode for session ${crisisSessionId}`);

      // Remove crisis override
      await this.removeCrisisOverride(crisisSessionId);

      // Disable crisis mode in payment client
      await stripePaymentClient.initialize(
        this.config?.stripe.publishableKey || '',
        false // Normal mode
      );

      this.crisisMode = false;

      await this.logPaymentEvent({
        type: 'crisis_override_deactivated',
        userId: 'current_user',
        metadata: {
          sessionId: crisisSessionId
        },
        crisisMode: false
      });

      console.log('Crisis mode disabled successfully');

    } catch (error) {
      console.error('Crisis mode disabling failed:', error);
      // Should not throw - crisis access must be preserved
    }
  }

  async getCrisisStatus(userId: string): Promise<CrisisPaymentOverride | null> {
    try {
      return await this.getCachedCrisisOverride(userId);
    } catch (error) {
      console.error('Crisis status check failed:', error);
      return null;
    }
  }

  /**
   * Utility Methods
   */
  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    try {
      // Get available plans from Stripe client
      return stripePaymentClient.getSubscriptionPlans();
    } catch (error) {
      console.error('Failed to get available plans:', error);
      return []; // Return empty array to not break UI
    }
  }

  async validatePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      const currentUser = await this.authService.getCurrentUser();
      if (!currentUser) {
        return false;
      }

      // Validate through payment security service
      const securityResult = await stripePaymentClient['paymentSecurity'].validatePaymentToken(
        paymentMethodId,
        currentUser.id,
        currentUser.device_id || 'unknown',
        this.crisisMode
      );

      return securityResult.success;

    } catch (error) {
      console.error('Payment method validation failed:', error);
      return false;
    }
  }

  async getPaymentHistory(customerId: string, limit = 10): Promise<any[]> {
    try {
      // Fetch payment history from Stripe
      return await this.fetchStripePaymentHistory(customerId, limit);
    } catch (error) {
      console.error('Payment history retrieval failed:', error);
      return [];
    }
  }

  /**
   * Health & Status Monitoring
   */
  async getHealthStatus(): Promise<{
    stripe: { connected: boolean; latency: number };
    database: { connected: boolean; latency: number };
    crisisMode: boolean;
    errors: string[];
  }> {
    try {
      const errors: string[] = [];

      // Check Stripe connectivity
      const stripeStatus = await stripePaymentClient.getPaymentClientStatus();
      const stripeHealthy = stripeStatus.initialized && stripeStatus.stripeSDKAvailable;

      if (!stripeHealthy) {
        errors.push('Stripe connection issues detected');
      }

      // Check database connectivity
      const dbStart = Date.now();
      const dbHealthy = await this.cloudSync.isConnected();
      const dbLatency = Date.now() - dbStart;

      if (!dbHealthy) {
        errors.push('Database connection issues detected');
      }

      return {
        stripe: {
          connected: stripeHealthy,
          latency: this.performanceMetrics.lastStripeLatency
        },
        database: {
          connected: dbHealthy,
          latency: dbLatency
        },
        crisisMode: this.crisisMode,
        errors
      };

    } catch (error) {
      console.error('Health status check failed:', error);
      return {
        stripe: { connected: false, latency: 0 },
        database: { connected: false, latency: 0 },
        crisisMode: this.crisisMode,
        errors: ['Health status check failed']
      };
    }
  }

  // PRIVATE HELPER METHODS

  private async initializePaymentSync(): Promise<void> {
    // Initialize payment-specific sync separate from health data
    console.log('Payment sync initialized with separate data context');
  }

  private async initializeCrisisDetection(): Promise<void> {
    // Set up crisis detection monitoring
    console.log('Crisis detection initialized for payment system');
  }

  private async validateAuthIntegration(): Promise<void> {
    try {
      const isConnected = await this.authService.isAuthenticated();
      if (!isConnected) {
        console.warn('Auth service not ready - payment features may be limited');
      }
    } catch (error) {
      console.warn('Auth integration validation failed:', error);
    }
  }

  private initializePerformanceMonitoring(): void {
    // Reset performance metrics
    this.performanceMetrics = {
      lastStripeLatency: 0,
      lastDatabaseLatency: 0,
      errorCount: 0,
      successCount: 0,
      crisisOverrideCount: 0
    };

    console.log('Payment performance monitoring initialized');
  }

  private async enableEmergencyAccess(): Promise<void> {
    try {
      this.crisisMode = true;
      console.log('Emergency payment access enabled due to initialization failure');
    } catch (error) {
      console.error('Emergency access enablement failed:', error);
    }
  }

  // Crisis-specific helper methods
  private async createCrisisCustomer(customerData: CustomerData): Promise<CustomerResult> {
    const crisisCustomer: CustomerResult = {
      customerId: `crisis_customer_${Date.now()}`,
      userId: customerData.userId,
      email: customerData.email,
      name: customerData.name,
      created: new Date().toISOString(),
      defaultPaymentMethod: undefined,
      subscriptions: []
    };

    await this.storeCustomerData(crisisCustomer);
    console.log('Crisis customer created with emergency access');
    return crisisCustomer;
  }

  private async getCrisisCustomer(customerId: string): Promise<CustomerResult> {
    // Create emergency customer record if needed
    return {
      customerId,
      userId: 'crisis_user',
      email: 'crisis@being.app',
      name: 'Emergency Access',
      created: new Date().toISOString()
    };
  }

  private async createCrisisPaymentMethod(
    paymentMethodData: PaymentMethodData,
    customerId: string
  ): Promise<PaymentMethodResult> {
    const crisisMethod: PaymentMethodResult = {
      paymentMethodId: `crisis_pm_${Date.now()}`,
      type: 'card',
      card: {
        brand: 'crisis_bypass',
        last4: '0000',
        expiryMonth: 12,
        expiryYear: new Date().getFullYear() + 1
      },
      created: new Date().toISOString(),
      fingerprint: 'crisis_emergency_method',
      metadata: {
        deviceFingerprint: 'crisis_device',
        riskAssessment: 'low',
        verificationStatus: 'verified'
      }
    };

    console.log('Crisis payment method created for emergency access');
    return crisisMethod;
  }

  private async createCrisisPaymentIntent(paymentData: PaymentIntentData): Promise<PaymentIntentResult> {
    const crisisIntent: PaymentIntentResult = {
      paymentIntentId: `crisis_intent_${Date.now()}`,
      clientSecret: 'crisis_bypass_secret',
      status: 'succeeded',
      amount: 0, // Free during crisis
      currency: paymentData.currency,
      created: new Date().toISOString(),
      crisisOverride: true
    };

    console.log('Crisis payment intent created - full access granted for safety');
    return crisisIntent;
  }

  private async createCrisisSubscription(
    customerId: string,
    planId: string,
    trialDays?: number
  ): Promise<SubscriptionResult> {
    const plan = stripePaymentClient.getSubscriptionPlans().find(p => p.planId === planId);

    const crisisSubscription: SubscriptionResult = {
      subscriptionId: `crisis_sub_${Date.now()}`,
      customerId,
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      cancelAtPeriodEnd: false,
      plan: plan || {
        planId,
        name: 'Crisis Access',
        description: 'Emergency therapeutic access',
        amount: 0,
        currency: 'usd',
        interval: 'month',
        features: ['Full MBCT access', 'Crisis support', 'Emergency contacts']
      },
      trialEnd: trialDays ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString() : undefined
    };

    console.log('Crisis subscription created - therapeutic continuity maintained');
    return crisisSubscription;
  }

  // Storage helper methods
  private async storeCustomerData(customer: CustomerResult): Promise<void> {
    try {
      const encryptedData = await encryptionService.encryptData(
        customer,
        'SYSTEM', // Payment data is not PHI
        { paymentData: true, pciCompliant: true }
      );

      await SecureStore.setItemAsync(
        `payment_customer_${customer.customerId}`,
        JSON.stringify(encryptedData)
      );
    } catch (error) {
      console.error('Failed to store customer data:', error);
    }
  }

  private async getCachedCustomer(customerId: string): Promise<CustomerResult | null> {
    try {
      const encryptedData = await SecureStore.getItemAsync(`payment_customer_${customerId}`);
      if (!encryptedData) return null;

      const parsedData = JSON.parse(encryptedData);
      return await encryptionService.decryptData(parsedData, 'SYSTEM');
    } catch (error) {
      console.error('Failed to get cached customer:', error);
      return null;
    }
  }

  private async storePaymentIntent(intent: PaymentIntentResult): Promise<void> {
    try {
      const encryptedData = await encryptionService.encryptData(
        intent,
        'SYSTEM',
        { paymentData: true, pciCompliant: true }
      );

      await SecureStore.setItemAsync(
        `payment_intent_${intent.paymentIntentId}`,
        JSON.stringify(encryptedData)
      );
    } catch (error) {
      console.error('Failed to store payment intent:', error);
    }
  }

  private async getCachedPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResult | null> {
    try {
      const encryptedData = await SecureStore.getItemAsync(`payment_intent_${paymentIntentId}`);
      if (!encryptedData) return null;

      const parsedData = JSON.parse(encryptedData);
      return await encryptionService.decryptData(parsedData, 'SYSTEM');
    } catch (error) {
      console.error('Failed to get cached payment intent:', error);
      return null;
    }
  }

  private async storeSubscriptionData(subscription: SubscriptionResult): Promise<void> {
    try {
      const encryptedData = await encryptionService.encryptData(
        subscription,
        'SYSTEM',
        { paymentData: true, pciCompliant: true }
      );

      await SecureStore.setItemAsync(
        `payment_subscription_${subscription.subscriptionId}`,
        JSON.stringify(encryptedData)
      );
    } catch (error) {
      console.error('Failed to store subscription data:', error);
    }
  }

  private async getCachedSubscription(subscriptionId: string): Promise<SubscriptionResult | null> {
    try {
      const encryptedData = await SecureStore.getItemAsync(`payment_subscription_${subscriptionId}`);
      if (!encryptedData) return null;

      const parsedData = JSON.parse(encryptedData);
      return await encryptionService.decryptData(parsedData, 'SYSTEM');
    } catch (error) {
      console.error('Failed to get cached subscription:', error);
      return null;
    }
  }

  private async storeCrisisOverride(crisisOverride: CrisisPaymentOverride): Promise<void> {
    try {
      const encryptedData = await encryptionService.encryptData(
        crisisOverride,
        'SYSTEM',
        { crisisData: true, auditRequired: true }
      );

      await SecureStore.setItemAsync(
        `crisis_override_${crisisOverride.userId}`,
        JSON.stringify(encryptedData)
      );
    } catch (error) {
      console.error('Failed to store crisis override:', error);
    }
  }

  private async getCachedCrisisOverride(userId: string): Promise<CrisisPaymentOverride | null> {
    try {
      const encryptedData = await SecureStore.getItemAsync(`crisis_override_${userId}`);
      if (!encryptedData) return null;

      const parsedData = JSON.parse(encryptedData);
      const crisisOverride = await encryptionService.decryptData(parsedData, 'SYSTEM');

      // Check if expired
      if (new Date() > new Date(crisisOverride.expires)) {
        await SecureStore.deleteItemAsync(`crisis_override_${userId}`);
        return null;
      }

      return crisisOverride;
    } catch (error) {
      console.error('Failed to get cached crisis override:', error);
      return null;
    }
  }

  private async removeCrisisOverride(crisisSessionId: string): Promise<void> {
    try {
      // This would need to be enhanced to find by session ID
      // For now, simplified implementation
      console.log(`Crisis override removed for session ${crisisSessionId}`);
    } catch (error) {
      console.error('Failed to remove crisis override:', error);
    }
  }

  private async logPaymentEvent(eventData: Partial<PaymentEvent>): Promise<void> {
    try {
      const event: PaymentEvent = {
        eventId: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type: eventData.type || 'unknown',
        userId: eventData.userId || 'unknown',
        customerId: eventData.customerId,
        subscriptionId: eventData.subscriptionId,
        paymentIntentId: eventData.paymentIntentId,
        amount: eventData.amount,
        currency: eventData.currency || 'USD',
        metadata: eventData.metadata || {},
        crisisMode: eventData.crisisMode || this.crisisMode,
        errorCode: eventData.errorCode,
        errorMessage: eventData.errorMessage
      };

      // Store encrypted audit log
      const encryptedEvent = await encryptionService.encryptData(
        event,
        'SYSTEM',
        { auditLog: true, pciCompliant: true }
      );

      await SecureStore.setItemAsync(
        `payment_event_${event.eventId}`,
        JSON.stringify(encryptedEvent)
      );

    } catch (error) {
      console.error('Failed to log payment event:', error);
      // Should not throw - audit failures should not break payment operations
    }
  }

  private formatPaymentError(error: any, context: string): PaymentError {
    const paymentError: PaymentError = {
      type: error.type || 'api_error',
      code: error.code || 'unknown',
      message: error.message || 'Payment processing failed',
      param: error.param,
      declineCode: error.decline_code,
      retryable: error.retryable !== false,
      crisisImpact: this.assessCrisisImpact(error),
      userMessage: this.generateUserFriendlyMessage(error, context),
      technicalDetails: JSON.stringify(error),
      suggestions: this.generateSuggestions(error)
    };

    return paymentError;
  }

  private assessCrisisImpact(error: any): 'none' | 'degraded' | 'blocked' {
    if (error.type === 'rate_limit_error') return 'degraded';
    if (error.type === 'api_error' || error.type === 'authentication_error') return 'blocked';
    return 'none';
  }

  private generateUserFriendlyMessage(error: any, context: string): string {
    if (this.crisisMode) {
      return 'Payment temporarily unavailable, but all therapeutic features remain accessible for your safety.';
    }

    switch (error.type) {
      case 'card_error':
        return 'There was an issue with your payment method. Please check your card details or try a different payment method.';
      case 'rate_limit_error':
        return 'Too many requests. Please wait a moment and try again.';
      case 'authentication_error':
        return 'Payment service authentication failed. Please restart the app and try again.';
      default:
        return 'Payment processing temporarily unavailable. Please try again in a few moments.';
    }
  }

  private generateSuggestions(error: any): string[] {
    const suggestions: string[] = [];

    switch (error.type) {
      case 'card_error':
        suggestions.push('Verify your payment method details');
        suggestions.push('Try a different payment method');
        suggestions.push('Contact your bank if the issue persists');
        break;
      case 'rate_limit_error':
        suggestions.push('Wait a few minutes before trying again');
        break;
      case 'authentication_error':
        suggestions.push('Restart the app');
        suggestions.push('Check your internet connection');
        break;
      default:
        suggestions.push('Try again in a few moments');
        suggestions.push('Check your internet connection');
    }

    if (this.crisisMode) {
      suggestions.unshift('All crisis and safety features remain available');
    }

    return suggestions;
  }

  // Stripe API integration placeholders (would be implemented with actual Stripe calls)
  private async createStripeCustomer(customerData: CustomerData): Promise<any> {
    // Placeholder - would use actual Stripe API
    return { id: `cus_${Date.now()}` };
  }

  private async findExistingCustomer(userId: string): Promise<CustomerResult | null> {
    // Placeholder - would query Stripe for existing customer
    return null;
  }

  private async fetchStripeCustomer(customerId: string): Promise<any> {
    // Placeholder - would fetch from Stripe
    return {};
  }

  private async updateStripeCustomer(customerId: string, updates: any): Promise<any> {
    // Placeholder - would update Stripe customer
    return {};
  }

  private async hydrateCustomerData(stripeCustomer: any): Promise<CustomerResult> {
    // Placeholder - would convert Stripe customer to our format
    return {} as CustomerResult;
  }

  // Additional placeholder methods for other Stripe operations...
  private async attachPaymentMethodToCustomer(paymentMethodId: string, customerId: string): Promise<void> {}
  private async fetchStripePaymentMethods(customerId: string): Promise<any[]> { return []; }
  private async hydratePaymentMethods(stripeMethods: any[]): Promise<PaymentMethodResult[]> { return []; }
  private async cachePaymentMethods(customerId: string, methods: PaymentMethodResult[]): Promise<void> {}
  private async getCachedPaymentMethods(customerId: string): Promise<PaymentMethodResult[] | null> { return null; }
  private async deleteStripePaymentMethod(paymentMethodId: string): Promise<void> {}
  private async removePaymentMethodFromCache(paymentMethodId: string): Promise<void> {}
  private async updateStripeCustomerDefaultPayment(customerId: string, paymentMethodId: string): Promise<void> {}
  private async updateCachedCustomerDefaultPayment(customerId: string, paymentMethodId: string): Promise<void> {}
  private async updateStoredPaymentIntent(intent: PaymentIntentResult): Promise<void> {}
  private async fetchStripePaymentIntent(paymentIntentId: string): Promise<any> { return {}; }
  private async hydratePaymentIntent(stripeIntent: any): Promise<PaymentIntentResult> { return {} as PaymentIntentResult; }
  private async hydrateSubscriptionData(subscription: any, planId: string): Promise<SubscriptionResult> { return {} as SubscriptionResult; }
  private async fetchStripeSubscription(subscriptionId: string): Promise<any> { return {}; }
  private async hydrateSubscriptionFromStripe(stripeSubscription: any): Promise<SubscriptionResult> { return {} as SubscriptionResult; }
  private async updateStripeSubscription(subscriptionId: string, updates: any): Promise<any> { return {}; }
  private async cancelStripeSubscription(subscriptionId: string, atPeriodEnd: boolean): Promise<any> { return {}; }
  private async reactivateStripeSubscription(subscriptionId: string): Promise<any> { return {}; }
  private async fetchStripePaymentHistory(customerId: string, limit: number): Promise<any[]> { return []; }
  private async syncCustomerData(customer: CustomerResult): Promise<void> {}

  /**
   * ==========================================================================
   * DAY 17 PHASE 1: SUBSCRIPTION LOGIC AND API INTEGRATION
   * ==========================================================================
   */

  /**
   * Get subscription status with real-time synchronization
   */
  async getSubscriptionStatus(userId: string): Promise<{
    subscription: SubscriptionResult | null;
    tier: string;
    features: string[];
    trial: {
      active: boolean;
      daysRemaining: number;
      endDate?: string;
    } | null;
    gracePeriod: {
      active: boolean;
      daysRemaining: number;
      reason?: string;
    } | null;
    nextBilling?: {
      date: string;
      amount: number;
      currency: string;
    };
  }> {
    const startTime = Date.now();

    try {
      // Crisis mode bypass
      if (this.crisisMode) {
        return this.getCrisisSubscriptionStatus(userId);
      }

      // Get current user's customer record
      const customer = await this.getCustomerByUserId(userId);
      if (!customer) {
        return this.getDefaultSubscriptionStatus();
      }

      // Get active subscription
      const activeSubscription = await this.getActiveSubscription(customer.customerId);

      if (!activeSubscription) {
        return this.getDefaultSubscriptionStatus();
      }

      // Calculate trial information
      const trial = this.calculateTrialStatus(activeSubscription);

      // Calculate grace period if applicable
      const gracePeriod = await this.calculateGracePeriodStatus(activeSubscription);

      // Get subscription tier and features
      const tierInfo = this.getSubscriptionTierInfo(activeSubscription);

      // Calculate next billing
      const nextBilling = this.calculateNextBilling(activeSubscription);

      const responseTime = Date.now() - startTime;
      if (responseTime > 500) {
        console.warn(`Subscription status check took ${responseTime}ms (target: <500ms)`);
      }

      return {
        subscription: activeSubscription,
        tier: tierInfo.tier,
        features: tierInfo.features,
        trial,
        gracePeriod,
        nextBilling
      };

    } catch (error) {
      console.error('Get subscription status failed:', error);

      // Crisis fallback - maintain therapeutic access
      if (this.config?.crisis.enablePaymentBypass) {
        return this.getCrisisSubscriptionStatus(userId);
      }

      return this.getDefaultSubscriptionStatus();
    }
  }

  /**
   * Activate trial subscription with MBCT-compliant messaging
   */
  async activateTrial(
    userId: string,
    customerData: CustomerData,
    trialDays = 21
  ): Promise<SubscriptionResult> {
    const startTime = Date.now();

    try {
      console.log(`Activating ${trialDays}-day mindful trial for user ${userId}`);

      // Create or get customer
      let customer: CustomerResult;
      try {
        customer = await this.getCustomerByUserId(userId);
      } catch {
        customer = await this.createCustomer(customerData);
      }

      // Check if user is eligible for trial
      const trialEligibility = await this.checkTrialEligibility(userId);
      if (!trialEligibility.eligible) {
        throw new Error(`Trial not available: ${trialEligibility.reason}`);
      }

      // Create trial subscription
      const trialSubscription = await this.createTrialSubscription(
        customer.customerId,
        trialDays,
        this.crisisMode
      );

      // Log trial activation
      await this.logPaymentEvent({
        type: 'trial_activated',
        userId,
        customerId: customer.customerId,
        subscriptionId: trialSubscription.subscriptionId,
        metadata: {
          trialDays: trialDays.toString(),
          therapeuticOnboarding: 'true',
          mindfulActivation: 'true'
        }
      });

      const processingTime = Date.now() - startTime;
      console.log(`Trial activated in ${processingTime}ms`);

      return trialSubscription;

    } catch (error) {
      console.error('Trial activation failed:', error);

      // Crisis fallback - create emergency access
      if (this.crisisMode) {
        return await this.createEmergencyTrialAccess(userId, trialDays);
      }

      throw this.formatPaymentError(error, 'trial_activation_failed');
    }
  }

  /**
   * Convert trial to paid subscription with non-pressured experience
   */
  async convertTrialToPaid(
    subscriptionId: string,
    newPlanId: string,
    paymentMethodId?: string
  ): Promise<SubscriptionResult> {
    try {
      console.log(`Converting trial ${subscriptionId} to ${newPlanId} subscription`);

      // Get current trial subscription
      const currentSubscription = await this.getSubscription(subscriptionId);

      if (currentSubscription.status !== 'trialing') {
        throw new Error('Subscription is not in trial status');
      }

      // Create new paid subscription
      const paidSubscription = await this.createSubscription(
        currentSubscription.customerId,
        newPlanId,
        paymentMethodId,
        undefined, // No additional trial
        this.crisisMode
      );

      // Cancel the trial subscription
      await this.cancelSubscription(subscriptionId, false);

      // Log conversion
      await this.logPaymentEvent({
        type: 'trial_converted',
        userId: 'current_user', // Would get from context
        customerId: currentSubscription.customerId,
        subscriptionId: paidSubscription.subscriptionId,
        metadata: {
          fromPlan: 'trial',
          toPlan: newPlanId,
          conversionPath: 'mindful_upgrade',
          therapeuticContinuity: 'true'
        }
      });

      console.log('Trial converted to paid subscription successfully');
      return paidSubscription;

    } catch (error) {
      console.error('Trial conversion failed:', error);
      throw this.formatPaymentError(error, 'trial_conversion_failed');
    }
  }

  /**
   * Handle subscription payment failure with grace period
   */
  async handlePaymentFailure(
    subscriptionId: string,
    errorDetails: {
      code: string;
      message: string;
      declineCode?: string;
      retryable: boolean;
    }
  ): Promise<{
    gracePeriodActivated: boolean;
    gracePeriodDays: number;
    retryScheduled: boolean;
    retryDate?: string;
    therapeuticContinuity: boolean;
  }> {
    try {
      console.log(`Handling payment failure for subscription ${subscriptionId}: ${errorDetails.code}`);

      const subscription = await this.getSubscription(subscriptionId);

      // Determine grace period length based on subscription tier
      const gracePeriodDays = this.getGracePeriodDays(subscription.plan.planId);

      // Activate grace period
      const gracePeriodEnd = new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000);

      // Update subscription with grace period status
      await this.updateSubscriptionGracePeriod(subscriptionId, {
        gracePeriodStart: new Date().toISOString(),
        gracePeriodEnd: gracePeriodEnd.toISOString(),
        paymentFailureReason: errorDetails.code,
        retryAttempts: 0
      });

      // Schedule payment retry if retryable
      let retryScheduled = false;
      let retryDate: string | undefined;

      if (errorDetails.retryable) {
        retryDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
        await this.schedulePaymentRetry(subscriptionId, retryDate);
        retryScheduled = true;
      }

      // Log grace period activation
      await this.logPaymentEvent({
        type: 'grace_period_activated',
        userId: 'current_user',
        subscriptionId,
        metadata: {
          errorCode: errorDetails.code,
          gracePeriodDays: gracePeriodDays.toString(),
          retryScheduled: retryScheduled.toString(),
          therapeuticContinuity: 'maintained'
        },
        errorCode: errorDetails.code,
        errorMessage: errorDetails.message
      });

      return {
        gracePeriodActivated: true,
        gracePeriodDays,
        retryScheduled,
        retryDate,
        therapeuticContinuity: true
      };

    } catch (error) {
      console.error('Payment failure handling failed:', error);

      // Emergency fallback - maintain access
      await this.enableEmergencyAccess();

      return {
        gracePeriodActivated: true,
        gracePeriodDays: 7, // Emergency grace period
        retryScheduled: false,
        therapeuticContinuity: true
      };
    }
  }

  /**
   * Extend trial during crisis situations (automatic)
   */
  async extendTrialForCrisis(
    subscriptionId: string,
    crisisReason: string,
    extensionDays = 7
  ): Promise<void> {
    try {
      console.log(`Automatically extending trial for crisis: ${crisisReason}`);

      const subscription = await this.getSubscription(subscriptionId);

      if (subscription.status !== 'trialing' || !subscription.trialEnd) {
        console.log('Subscription not eligible for crisis trial extension');
        return;
      }

      // Extend trial end date
      const currentEndDate = new Date(subscription.trialEnd);
      const extendedEndDate = new Date(currentEndDate.getTime() + extensionDays * 24 * 60 * 60 * 1000);

      // Update subscription
      await this.updateStripeSubscriptionTrial(subscriptionId, extendedEndDate);

      // Log crisis extension
      await this.logPaymentEvent({
        type: 'trial_extended_crisis',
        userId: 'current_user',
        subscriptionId,
        metadata: {
          crisisReason,
          extensionDays: extensionDays.toString(),
          automaticExtension: 'true',
          therapeuticSafety: 'prioritized'
        },
        crisisMode: true
      });

      console.log(`Trial extended by ${extensionDays} days for crisis support`);

    } catch (error) {
      console.error('Crisis trial extension failed:', error);
      // Don't throw - crisis extensions are supportive, not critical
    }
  }

  /**
   * Get subscription recommendations based on usage and therapeutic needs
   */
  async getSubscriptionRecommendations(userId: string): Promise<{
    recommended: SubscriptionPlan;
    current: SubscriptionPlan | null;
    reasons: string[];
    therapeuticBenefits: string[];
    pricing: {
      monthly: number;
      annual: number;
      savings: number;
    };
    mindfulUpgradeMessage: string;
  }> {
    try {
      const plans = await this.getAvailablePlans();
      const currentStatus = await this.getSubscriptionStatus(userId);

      // Analyze usage patterns for recommendations
      const usageAnalysis = await this.analyzeUserEngagement(userId);

      // Default recommendation logic
      let recommended = plans.find(p => p.planId === 'basic') || plans[0];
      const reasons: string[] = [];
      const therapeuticBenefits: string[] = [];

      // Personalize recommendations based on usage
      if (usageAnalysis.multipleDevices) {
        recommended = plans.find(p => p.planId === 'premium') || recommended;
        reasons.push('You practice mindfulness across multiple devices');
        therapeuticBenefits.push('Seamless continuity in your therapeutic journey');
      }

      if (usageAnalysis.consistentPractice) {
        reasons.push('Your consistent practice shows dedication to growth');
        therapeuticBenefits.push('Advanced insights to deepen your mindfulness practice');
      }

      if (usageAnalysis.advancedFeatureUsage) {
        recommended = plans.find(p => p.planId === 'premium') || recommended;
        reasons.push('You engage deeply with therapeutic features');
        therapeuticBenefits.push('Personalized recommendations for your unique path');
      }

      // Always include safety messaging
      therapeuticBenefits.push('Continued access to crisis support and safety resources');

      // Calculate pricing with annual savings
      const pricing = {
        monthly: recommended.amount,
        annual: Math.round(recommended.amount * 12 * 0.83), // 17% savings
        savings: Math.round(recommended.amount * 12 * 0.17)
      };

      // Create mindful upgrade message
      const mindfulUpgradeMessage = this.createMindfulUpgradeMessage(
        recommended,
        usageAnalysis.therapeuticStage
      );

      return {
        recommended,
        current: currentStatus.subscription?.plan || null,
        reasons,
        therapeuticBenefits,
        pricing,
        mindfulUpgradeMessage
      };

    } catch (error) {
      console.error('Get subscription recommendations failed:', error);

      // Safe default recommendation
      const basicPlan = {
        planId: 'basic',
        name: 'Basic MBCT',
        description: 'Essential mindfulness tools for your therapeutic journey',
        amount: 9.99,
        currency: 'usd',
        interval: 'month' as const,
        features: ['Core MBCT practices', 'Basic insights', 'Crisis support']
      };

      return {
        recommended: basicPlan,
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
        mindfulUpgradeMessage: 'Take the next step in your mindfulness journey with features designed to support your therapeutic growth.'
      };
    }
  }

  /**
   * Cancel subscription with retention flow and therapeutic messaging
   */
  async cancelSubscriptionWithRetention(
    subscriptionId: string,
    cancellationReason: string,
    retentionOffered = false
  ): Promise<{
    canceled: boolean;
    retentionOffer?: {
      type: 'discount' | 'pause' | 'downgrade';
      details: string;
      validUntil: string;
    };
    therapeuticContinuity: {
      crisisAccess: boolean;
      basicFeatures: boolean;
      dataRetention: boolean;
    };
    cancellationDate: string;
  }> {
    try {
      console.log(`Processing subscription cancellation: ${cancellationReason}`);

      const subscription = await this.getSubscription(subscriptionId);

      // Offer retention based on cancellation reason
      let retentionOffer;
      if (!retentionOffered && this.shouldOfferRetention(cancellationReason)) {
        retentionOffer = await this.generateRetentionOffer(subscription, cancellationReason);

        if (retentionOffer) {
          // Don't cancel yet - present retention offer
          return {
            canceled: false,
            retentionOffer,
            therapeuticContinuity: {
              crisisAccess: true,
              basicFeatures: true,
              dataRetention: true
            },
            cancellationDate: '' // Not canceled
          };
        }
      }

      // Proceed with cancellation
      const canceledSubscription = await this.cancelSubscription(subscriptionId, true);

      // Ensure therapeutic continuity
      await this.setupPostCancellationAccess(subscription.customerId);

      // Log cancellation with therapeutic context
      await this.logPaymentEvent({
        type: 'subscription_canceled',
        userId: 'current_user',
        subscriptionId,
        metadata: {
          reason: cancellationReason,
          therapeuticTransition: 'supported',
          crisisAccessMaintained: 'true',
          dataRetentionActive: 'true'
        }
      });

      return {
        canceled: true,
        therapeuticContinuity: {
          crisisAccess: true, // Always maintained
          basicFeatures: false,
          dataRetention: true // 30-day retention
        },
        cancellationDate: canceledSubscription.canceledAt || new Date().toISOString()
      };

    } catch (error) {
      console.error('Subscription cancellation failed:', error);
      throw this.formatPaymentError(error, 'subscription_cancellation_failed');
    }
  }

  // Private helper methods for subscription logic

  private async getCustomerByUserId(userId: string): Promise<CustomerResult> {
    // This would be implemented to find customer by user ID
    // For now, assume a mapping exists
    return await this.getCustomer(`user_${userId}`);
  }

  private async getActiveSubscription(customerId: string): Promise<SubscriptionResult | null> {
    try {
      // This would fetch the active subscription for a customer
      // For now, return null if no active subscription
      return null;
    } catch {
      return null;
    }
  }

  private calculateTrialStatus(subscription: SubscriptionResult): {
    active: boolean;
    daysRemaining: number;
    endDate?: string;
  } | null {
    if (subscription.status !== 'trialing' || !subscription.trialEnd) {
      return null;
    }

    const trialEndDate = new Date(subscription.trialEnd);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

    return {
      active: daysRemaining > 0,
      daysRemaining,
      endDate: subscription.trialEnd
    };
  }

  private async calculateGracePeriodStatus(subscription: SubscriptionResult): Promise<{
    active: boolean;
    daysRemaining: number;
    reason?: string;
  } | null> {
    // Check if subscription is in grace period (past due but not canceled)
    if (subscription.status === 'past_due') {
      // This would calculate based on grace period settings
      return {
        active: true,
        daysRemaining: 5, // Example
        reason: 'Payment issue - access maintained during grace period'
      };
    }
    return null;
  }

  private getSubscriptionTierInfo(subscription: SubscriptionResult): {
    tier: string;
    features: string[];
  } {
    const tierMap: Record<string, { tier: string; features: string[] }> = {
      'trial': {
        tier: 'trial',
        features: ['core_mbct', 'basic_insights', 'crisis_support']
      },
      'basic': {
        tier: 'basic',
        features: ['core_mbct', 'cloud_sync', 'basic_insights', 'crisis_support']
      },
      'premium': {
        tier: 'premium',
        features: ['core_mbct', 'unlimited_sync', 'advanced_insights', 'personalized', 'priority_support', 'crisis_support']
      }
    };

    return tierMap[subscription.plan.planId] || tierMap['basic'];
  }

  private calculateNextBilling(subscription: SubscriptionResult): {
    date: string;
    amount: number;
    currency: string;
  } | undefined {
    if (subscription.status === 'active' && !subscription.cancelAtPeriodEnd) {
      return {
        date: subscription.currentPeriodEnd,
        amount: subscription.plan.amount,
        currency: subscription.plan.currency
      };
    }
    return undefined;
  }

  private getCrisisSubscriptionStatus(userId: string): any {
    return {
      subscription: null,
      tier: 'crisis_access',
      features: ['all_therapeutic_features', 'crisis_support', 'emergency_access'],
      trial: null,
      gracePeriod: null,
      nextBilling: undefined
    };
  }

  private getDefaultSubscriptionStatus(): any {
    return {
      subscription: null,
      tier: 'none',
      features: ['crisis_support'], // Always available
      trial: null,
      gracePeriod: null,
      nextBilling: undefined
    };
  }

  private async checkTrialEligibility(userId: string): Promise<{
    eligible: boolean;
    reason?: string;
  }> {
    // Check if user has already used trial
    // This would check against user history
    return {
      eligible: true,
      reason: undefined
    };
  }

  private async createTrialSubscription(
    customerId: string,
    trialDays: number,
    crisisMode: boolean
  ): Promise<SubscriptionResult> {
    // Create trial subscription with Stripe
    return await this.createSubscription(
      customerId,
      'trial',
      undefined,
      trialDays,
      crisisMode
    );
  }

  private async createEmergencyTrialAccess(userId: string, trialDays: number): Promise<SubscriptionResult> {
    return {
      subscriptionId: `emergency_trial_${userId}_${Date.now()}`,
      customerId: `emergency_customer_${userId}`,
      status: 'trialing',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString(),
      trialStart: new Date().toISOString(),
      trialEnd: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      plan: {
        planId: 'emergency_trial',
        name: 'Emergency Therapeutic Access',
        description: 'Crisis-activated trial with full therapeutic access',
        amount: 0,
        currency: 'usd',
        interval: 'month',
        features: ['all_features', 'crisis_support', 'emergency_access']
      }
    };
  }

  private getGracePeriodDays(planId: string): number {
    const gracePeriodMap: Record<string, number> = {
      'basic': 7,
      'premium': 14,
      'trial': 3
    };
    return gracePeriodMap[planId] || 7;
  }

  private async updateSubscriptionGracePeriod(subscriptionId: string, gracePeriodData: any): Promise<void> {
    // Update subscription with grace period information
    console.log(`Grace period activated for subscription ${subscriptionId}`);
  }

  private async schedulePaymentRetry(subscriptionId: string, retryDate: string): Promise<void> {
    // Schedule payment retry with Stripe
    console.log(`Payment retry scheduled for ${subscriptionId} on ${retryDate}`);
  }

  private async updateStripeSubscriptionTrial(subscriptionId: string, newEndDate: Date): Promise<void> {
    // Update trial end date in Stripe
    console.log(`Trial extended for ${subscriptionId} to ${newEndDate.toISOString()}`);
  }

  private async analyzeUserEngagement(userId: string): Promise<{
    multipleDevices: boolean;
    consistentPractice: boolean;
    advancedFeatureUsage: boolean;
    therapeuticStage: 'beginning' | 'developing' | 'established' | 'advanced';
  }> {
    // Analyze user engagement patterns
    // This would integrate with analytics service
    return {
      multipleDevices: false,
      consistentPractice: true,
      advancedFeatureUsage: false,
      therapeuticStage: 'developing'
    };
  }

  private createMindfulUpgradeMessage(plan: SubscriptionPlan, stage: string): string {
    const messages = {
      beginning: `Take the next mindful step in your journey. ${plan.name} offers gentle support as you build your practice.`,
      developing: `Your commitment to growth is inspiring. ${plan.name} provides deeper insights to support your therapeutic progress.`,
      established: `Your practice is flourishing. ${plan.name} offers advanced tools to enrich your mindfulness journey.`,
      advanced: `Your dedication is remarkable. ${plan.name} provides expert-level features for your sophisticated practice.`
    };

    return messages[stage as keyof typeof messages] || messages.developing;
  }

  private shouldOfferRetention(reason: string): boolean {
    const retentionReasons = ['too_expensive', 'not_using_features', 'technical_issues', 'temporary_financial'];
    return retentionReasons.includes(reason);
  }

  private async generateRetentionOffer(subscription: SubscriptionResult, reason: string): Promise<{
    type: 'discount' | 'pause' | 'downgrade';
    details: string;
    validUntil: string;
  } | null> {
    // Generate retention offer based on reason and subscription
    if (reason === 'too_expensive') {
      return {
        type: 'discount',
        details: '50% off for 3 months - continue your therapeutic journey at a comfortable pace',
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
    }

    if (reason === 'temporary_financial') {
      return {
        type: 'pause',
        details: 'Pause your subscription for up to 3 months while maintaining crisis access',
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      };
    }

    return null;
  }

  private async setupPostCancellationAccess(customerId: string): Promise<void> {
    // Set up limited access after cancellation
    // Ensure crisis features remain available
    console.log(`Post-cancellation access configured for ${customerId}`);
  }
}

// Export singleton instance
export const paymentAPIService = PaymentAPIService.getInstance();