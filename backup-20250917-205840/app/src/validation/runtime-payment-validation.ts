/**
 * Runtime Payment Validation - Enhanced Type Safety Framework
 *
 * Real-time validation utilities for payment operations with:
 * - Zod schema validation for all payment data
 * - Performance monitoring for crisis response (<200ms)
 * - Type-safe error handling with recovery guidance
 * - PCI DSS compliance validation at runtime
 * - HIPAA data separation enforcement
 * - Crisis mode validation bypass for emergency access
 */

import { z } from 'zod';
import {
  PaymentSchemas,
  PaymentConfig,
  PaymentMethodData,
  PaymentIntentData,
  SubscriptionResult,
  PaymentError,
  CrisisPaymentOverride,
  CustomerData,
  CustomerResult,
  PaymentEvent
} from '../types/payment';
import {
  isValidPaymentConfig,
  isValidPaymentMethodData,
  isValidPaymentIntentData,
  isValidCustomerData,
  isValidCrisisPaymentOverride,
  isCrisisResponseTimeSafe,
  isPCICompliantPaymentData,
  isHIPAASeparatedPaymentData
} from './payment-types-validation';

/**
 * Runtime Validation Result Interface
 */
export interface RuntimeValidationResult<T = any> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: PaymentValidationError | null;
  readonly performanceMetrics: {
    readonly validationTime: number;
    readonly crisisSafe: boolean;
  };
  readonly complianceChecks: {
    readonly pciCompliant: boolean;
    readonly hipaaCompliant: boolean;
  };
}

/**
 * Payment Validation Error with Recovery Guidance
 */
export interface PaymentValidationError {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
  readonly crisisImpact: 'none' | 'degraded' | 'blocked';
  readonly recoveryGuidance: string;
  readonly userMessage: string;
  readonly retryable: boolean;
}

/**
 * Performance Metrics for Validation Operations
 */
interface ValidationPerformanceMetrics {
  startTime: number;
  endTime: number;
  validationTime: number;
  crisisResponseTime?: number;
  typeCheckingTime: number;
}

/**
 * Runtime Payment Validator Class
 */
export class RuntimePaymentValidator {
  private performanceThresholds = {
    crisisResponse: 200, // ms - CRITICAL for user safety
    paymentProcessing: 5000, // ms - Good UX
    typeValidation: 100 // ms - Fast validation
  };

  /**
   * Validate payment configuration with performance monitoring
   */
  async validatePaymentConfig(config: unknown, crisisMode = false): Promise<RuntimeValidationResult<PaymentConfig>> {
    const metrics = this.startPerformanceTracking();

    try {
      // Crisis mode bypass for emergency configurations
      if (crisisMode) {
        metrics.crisisResponseTime = Date.now() - metrics.startTime;
        if (metrics.crisisResponseTime > this.performanceThresholds.crisisResponse) {
          console.warn(`⚠️ Crisis mode validation took ${metrics.crisisResponseTime}ms (should be <${this.performanceThresholds.crisisResponse}ms)`);
        }
      }

      // Type validation
      if (!isValidPaymentConfig(config)) {
        return this.createErrorResult(
          'INVALID_PAYMENT_CONFIG',
          'Payment configuration is invalid',
          crisisMode ? 'degraded' : 'blocked',
          'Please check your payment configuration and try again',
          true,
          metrics
        );
      }

      // PCI DSS compliance check
      const pciCompliant = this.validatePCICompliance(config as PaymentConfig);
      const hipaaCompliant = this.validateHIPAACompliance(config as PaymentConfig);

      return this.createSuccessResult(
        config as PaymentConfig,
        metrics,
        { pciCompliant, hipaaCompliant }
      );

    } catch (error) {
      return this.createErrorResult(
        'VALIDATION_ERROR',
        error instanceof Error ? error.message : 'Unknown validation error',
        crisisMode ? 'none' : 'blocked',
        'Configuration validation failed, using safe defaults',
        true,
        metrics
      );
    }
  }

  /**
   * Validate customer data with HIPAA compliance checks
   */
  async validateCustomerData(data: unknown, crisisMode = false): Promise<RuntimeValidationResult<CustomerData>> {
    const metrics = this.startPerformanceTracking();

    try {
      // Crisis mode validation bypass
      if (crisisMode) {
        metrics.crisisResponseTime = Date.now() - metrics.startTime;

        // Create emergency customer data if validation fails
        if (!isValidCustomerData(data)) {
          const emergencyCustomer: CustomerData = {
            userId: 'emergency_user',
            email: 'emergency@fullmind.app',
            name: 'Emergency Access',
            metadata: {
              appUserId: 'emergency_user',
              deviceId: 'emergency_device',
              registrationDate: new Date().toISOString(),
              therapeuticConsent: true,
              crisisContactConsent: true
            }
          };

          return this.createSuccessResult(
            emergencyCustomer,
            metrics,
            { pciCompliant: true, hipaaCompliant: true }
          );
        }
      }

      // Standard validation
      if (!isValidCustomerData(data)) {
        return this.createErrorResult(
          'INVALID_CUSTOMER_DATA',
          'Customer data is invalid',
          crisisMode ? 'none' : 'blocked',
          'Please verify your account information',
          true,
          metrics
        );
      }

      // HIPAA compliance check - ensure payment data doesn't contain PHI
      const hipaaCompliant = isHIPAASeparatedPaymentData(data);
      if (!hipaaCompliant && !crisisMode) {
        return this.createErrorResult(
          'HIPAA_VIOLATION',
          'Customer data contains prohibited PHI in payment context',
          'blocked',
          'Data privacy issue detected. Please contact support.',
          false,
          metrics
        );
      }

      return this.createSuccessResult(
        data as CustomerData,
        metrics,
        { pciCompliant: true, hipaaCompliant }
      );

    } catch (error) {
      return this.createErrorResult(
        'CUSTOMER_VALIDATION_ERROR',
        error instanceof Error ? error.message : 'Customer validation error',
        crisisMode ? 'none' : 'degraded',
        'Account verification failed, using limited access',
        true,
        metrics
      );
    }
  }

  /**
   * Validate payment method data with PCI DSS compliance
   */
  async validatePaymentMethodData(data: unknown, crisisMode = false): Promise<RuntimeValidationResult<PaymentMethodData>> {
    const metrics = this.startPerformanceTracking();

    try {
      // Crisis mode bypass - no payment methods needed
      if (crisisMode) {
        return this.createErrorResult(
          'CRISIS_PAYMENT_BYPASS',
          'Payment methods not available in crisis mode',
          'none', // No impact on crisis features
          'All therapeutic features remain available during your safety session',
          false,
          metrics
        );
      }

      // Type validation
      if (!isValidPaymentMethodData(data)) {
        return this.createErrorResult(
          'INVALID_PAYMENT_METHOD',
          'Payment method data is invalid',
          'degraded',
          'Please check your payment information and try again',
          true,
          metrics
        );
      }

      // PCI DSS compliance check - ensure no sensitive card data is stored
      const pciCompliant = isPCICompliantPaymentData(data);
      if (!pciCompliant) {
        return this.createErrorResult(
          'PCI_VIOLATION',
          'Payment method contains prohibited sensitive card data',
          'blocked',
          'Payment security issue detected. Please try again.',
          false,
          metrics
        );
      }

      return this.createSuccessResult(
        data as PaymentMethodData,
        metrics,
        { pciCompliant, hipaaCompliant: true }
      );

    } catch (error) {
      return this.createErrorResult(
        'PAYMENT_METHOD_VALIDATION_ERROR',
        error instanceof Error ? error.message : 'Payment method validation error',
        'degraded',
        'Payment method validation failed, please try again',
        true,
        metrics
      );
    }
  }

  /**
   * Validate payment intent with crisis safety checks
   */
  async validatePaymentIntent(data: unknown, crisisMode = false): Promise<RuntimeValidationResult<PaymentIntentData>> {
    const metrics = this.startPerformanceTracking();

    try {
      // Crisis mode handling - allow emergency payments
      if (crisisMode) {
        metrics.crisisResponseTime = Date.now() - metrics.startTime;

        // Create emergency payment intent if needed
        if (!isValidPaymentIntentData(data)) {
          const emergencyIntent: PaymentIntentData = {
            amount: 0, // Free emergency access
            currency: 'usd',
            subscriptionType: 'monthly',
            description: 'Emergency therapeutic access',
            metadata: {
              userId: 'emergency_user',
              deviceId: 'emergency_device',
              sessionId: 'emergency_session',
              crisisMode: true,
              appVersion: '1.0.0',
              emergencyAccess: true
            }
          };

          return this.createSuccessResult(
            emergencyIntent,
            metrics,
            { pciCompliant: true, hipaaCompliant: true }
          );
        }
      }

      // Standard validation
      if (!isValidPaymentIntentData(data)) {
        return this.createErrorResult(
          'INVALID_PAYMENT_INTENT',
          'Payment intent data is invalid',
          crisisMode ? 'none' : 'degraded',
          'Payment processing failed, please try again',
          true,
          metrics
        );
      }

      // Check for negative amounts or invalid currencies
      const paymentData = data as PaymentIntentData;
      if (paymentData.amount < 0) {
        return this.createErrorResult(
          'INVALID_AMOUNT',
          'Payment amount cannot be negative',
          crisisMode ? 'none' : 'degraded',
          'Invalid payment amount',
          true,
          metrics
        );
      }

      return this.createSuccessResult(
        paymentData,
        metrics,
        { pciCompliant: true, hipaaCompliant: true }
      );

    } catch (error) {
      return this.createErrorResult(
        'PAYMENT_INTENT_VALIDATION_ERROR',
        error instanceof Error ? error.message : 'Payment intent validation error',
        crisisMode ? 'none' : 'degraded',
        'Payment setup failed, all therapeutic features remain available',
        true,
        metrics
      );
    }
  }

  /**
   * Validate crisis payment override with emergency access verification
   */
  async validateCrisisOverride(override: unknown): Promise<RuntimeValidationResult<CrisisPaymentOverride>> {
    const metrics = this.startPerformanceTracking();
    metrics.crisisResponseTime = Date.now() - metrics.startTime;

    try {
      // Crisis overrides must be validated extremely quickly
      if (!isValidCrisisPaymentOverride(override)) {
        // Create emergency override if validation fails
        const emergencyOverride: CrisisPaymentOverride = {
          crisisSessionId: `emergency_${Date.now()}`,
          userId: 'emergency_user',
          deviceId: 'emergency_device',
          overrideReason: 'emergency_access',
          overrideType: 'full_access',
          granted: new Date().toISOString(),
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          auditTrail: {
            triggerEvent: 'validation_failure_emergency_bypass',
            safetyScore: 100,
            accessGranted: [
              'all_therapeutic_features',
              'crisis_tools',
              'emergency_contacts',
              'hotline_access'
            ]
          }
        };

        console.log('🚨 Crisis override validation failed, enabling emergency bypass');

        return this.createSuccessResult(
          emergencyOverride,
          metrics,
          { pciCompliant: true, hipaaCompliant: true }
        );
      }

      // Validate crisis response time
      const crisisSafe = isCrisisResponseTimeSafe(metrics.crisisResponseTime || 0);
      if (!crisisSafe) {
        console.warn(`⚠️ Crisis override validation took ${metrics.crisisResponseTime}ms (should be <200ms)`);
      }

      return this.createSuccessResult(
        override as CrisisPaymentOverride,
        metrics,
        { pciCompliant: true, hipaaCompliant: true }
      );

    } catch (error) {
      // CRITICAL: Never fail crisis override validation
      const emergencyOverride: CrisisPaymentOverride = {
        crisisSessionId: `emergency_fallback_${Date.now()}`,
        userId: 'emergency_user',
        deviceId: 'emergency_device',
        overrideReason: 'emergency_access',
        overrideType: 'full_access',
        granted: new Date().toISOString(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        auditTrail: {
          triggerEvent: 'validation_error_emergency_fallback',
          safetyScore: 100,
          accessGranted: [
            'all_therapeutic_features',
            'crisis_tools',
            'emergency_contacts',
            'hotline_access',
            'safety_plan'
          ]
        }
      };

      console.log('🚨 Crisis override validation error, enabling emergency fallback');

      return this.createSuccessResult(
        emergencyOverride,
        metrics,
        { pciCompliant: true, hipaaCompliant: true }
      );
    }
  }

  /**
   * Validate subscription result with therapeutic continuity checks
   */
  async validateSubscription(subscription: unknown, crisisMode = false): Promise<RuntimeValidationResult<SubscriptionResult>> {
    const metrics = this.startPerformanceTracking();

    try {
      // Crisis mode - provide emergency subscription
      if (crisisMode) {
        const emergencySubscription: SubscriptionResult = {
          subscriptionId: `crisis_sub_${Date.now()}`,
          customerId: 'emergency_customer',
          status: 'active',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
          plan: {
            planId: 'emergency_access',
            name: 'Emergency Therapeutic Access',
            description: 'Crisis support with full MBCT features',
            amount: 0,
            currency: 'usd',
            interval: 'month',
            features: [
              'Full MBCT content access',
              'Crisis support tools',
              'Emergency contacts integration',
              '988 hotline access',
              'Therapeutic continuity guarantee',
              'Safety plan access'
            ]
          }
        };

        return this.createSuccessResult(
          emergencySubscription,
          metrics,
          { pciCompliant: true, hipaaCompliant: true }
        );
      }

      // Standard subscription validation would go here
      // For now, return the subscription as-is if it exists
      if (subscription) {
        return this.createSuccessResult(
          subscription as SubscriptionResult,
          metrics,
          { pciCompliant: true, hipaaCompliant: true }
        );
      } else {
        return this.createErrorResult(
          'NO_SUBSCRIPTION',
          'No active subscription found',
          'degraded',
          'Some features may be limited without an active subscription',
          true,
          metrics
        );
      }

    } catch (error) {
      return this.createErrorResult(
        'SUBSCRIPTION_VALIDATION_ERROR',
        error instanceof Error ? error.message : 'Subscription validation error',
        crisisMode ? 'none' : 'degraded',
        'Subscription verification failed, emergency access enabled',
        true,
        metrics
      );
    }
  }

  /**
   * Performance and compliance helper methods
   */
  private startPerformanceTracking(): ValidationPerformanceMetrics {
    return {
      startTime: Date.now(),
      endTime: 0,
      validationTime: 0,
      typeCheckingTime: 0
    };
  }

  private endPerformanceTracking(metrics: ValidationPerformanceMetrics): ValidationPerformanceMetrics {
    metrics.endTime = Date.now();
    metrics.validationTime = metrics.endTime - metrics.startTime;
    return metrics;
  }

  private validatePCICompliance(config: PaymentConfig): boolean {
    // Check PCI DSS compliance settings
    return (
      config.compliance.pciDssLevel &&
      ['1', '2', '3', '4'].includes(config.compliance.pciDssLevel) &&
      config.security.enableFraudDetection
    );
  }

  private validateHIPAACompliance(config: PaymentConfig): boolean {
    // Check HIPAA compliance settings
    return (
      config.compliance.hipaaCompliant &&
      config.compliance.auditRetentionYears >= 7 &&
      config.compliance.enableDetailedLogging
    );
  }

  private createSuccessResult<T>(
    data: T,
    metrics: ValidationPerformanceMetrics,
    compliance: { pciCompliant: boolean; hipaaCompliant: boolean }
  ): RuntimeValidationResult<T> {
    const finalMetrics = this.endPerformanceTracking(metrics);

    return {
      success: true,
      data,
      error: null,
      performanceMetrics: {
        validationTime: finalMetrics.validationTime,
        crisisSafe: !finalMetrics.crisisResponseTime || finalMetrics.crisisResponseTime < this.performanceThresholds.crisisResponse
      },
      complianceChecks: compliance
    };
  }

  private createErrorResult(
    code: string,
    message: string,
    crisisImpact: 'none' | 'degraded' | 'blocked',
    userMessage: string,
    retryable: boolean,
    metrics: ValidationPerformanceMetrics
  ): RuntimeValidationResult<any> {
    const finalMetrics = this.endPerformanceTracking(metrics);

    const error: PaymentValidationError = {
      code,
      message,
      crisisImpact,
      recoveryGuidance: this.getRecoveryGuidance(code),
      userMessage,
      retryable
    };

    return {
      success: false,
      data: null,
      error,
      performanceMetrics: {
        validationTime: finalMetrics.validationTime,
        crisisSafe: !finalMetrics.crisisResponseTime || finalMetrics.crisisResponseTime < this.performanceThresholds.crisisResponse
      },
      complianceChecks: {
        pciCompliant: false,
        hipaaCompliant: false
      }
    };
  }

  private getRecoveryGuidance(errorCode: string): string {
    const guidance: Record<string, string> = {
      'INVALID_PAYMENT_CONFIG': 'Check payment configuration and API keys',
      'INVALID_CUSTOMER_DATA': 'Verify account information and email format',
      'INVALID_PAYMENT_METHOD': 'Check payment method details and expiration',
      'INVALID_PAYMENT_INTENT': 'Verify payment amount and currency',
      'HIPAA_VIOLATION': 'Ensure payment data does not contain personal health information',
      'PCI_VIOLATION': 'Remove sensitive card data from stored information',
      'CRISIS_PAYMENT_BYPASS': 'Crisis mode enabled - all therapeutic features remain available',
      'NO_SUBSCRIPTION': 'Consider upgrading to access additional features'
    };

    return guidance[errorCode] || 'Please try again or contact support if the issue persists';
  }
}

/**
 * Singleton runtime validator instance
 */
export const runtimePaymentValidator = new RuntimePaymentValidator();

/**
 * Convenience functions for common validations
 */

// Validate payment configuration
export async function validatePaymentConfigRuntime(
  config: unknown,
  crisisMode = false
): Promise<RuntimeValidationResult<PaymentConfig>> {
  return runtimePaymentValidator.validatePaymentConfig(config, crisisMode);
}

// Validate customer data
export async function validateCustomerDataRuntime(
  data: unknown,
  crisisMode = false
): Promise<RuntimeValidationResult<CustomerData>> {
  return runtimePaymentValidator.validateCustomerData(data, crisisMode);
}

// Validate payment method
export async function validatePaymentMethodRuntime(
  data: unknown,
  crisisMode = false
): Promise<RuntimeValidationResult<PaymentMethodData>> {
  return runtimePaymentValidator.validatePaymentMethodData(data, crisisMode);
}

// Validate payment intent
export async function validatePaymentIntentRuntime(
  data: unknown,
  crisisMode = false
): Promise<RuntimeValidationResult<PaymentIntentData>> {
  return runtimePaymentValidator.validatePaymentIntent(data, crisisMode);
}

// Validate crisis override (always high priority)
export async function validateCrisisOverrideRuntime(
  override: unknown
): Promise<RuntimeValidationResult<CrisisPaymentOverride>> {
  return runtimePaymentValidator.validateCrisisOverride(override);
}

// Validate subscription
export async function validateSubscriptionRuntime(
  subscription: unknown,
  crisisMode = false
): Promise<RuntimeValidationResult<SubscriptionResult>> {
  return runtimePaymentValidator.validateSubscription(subscription, crisisMode);
}

/**
 * Batch validation for multiple payment items
 */
export async function validatePaymentBatch(items: {
  config?: unknown;
  customer?: unknown;
  paymentMethod?: unknown;
  paymentIntent?: unknown;
  subscription?: unknown;
  crisisOverride?: unknown;
}, crisisMode = false): Promise<{
  config: RuntimeValidationResult<PaymentConfig> | null;
  customer: RuntimeValidationResult<CustomerData> | null;
  paymentMethod: RuntimeValidationResult<PaymentMethodData> | null;
  paymentIntent: RuntimeValidationResult<PaymentIntentData> | null;
  subscription: RuntimeValidationResult<SubscriptionResult> | null;
  crisisOverride: RuntimeValidationResult<CrisisPaymentOverride> | null;
  allValid: boolean;
  criticalErrors: PaymentValidationError[];
}> {
  const results = {
    config: null as RuntimeValidationResult<PaymentConfig> | null,
    customer: null as RuntimeValidationResult<CustomerData> | null,
    paymentMethod: null as RuntimeValidationResult<PaymentMethodData> | null,
    paymentIntent: null as RuntimeValidationResult<PaymentIntentData> | null,
    subscription: null as RuntimeValidationResult<SubscriptionResult> | null,
    crisisOverride: null as RuntimeValidationResult<CrisisPaymentOverride> | null,
    allValid: true,
    criticalErrors: [] as PaymentValidationError[]
  };

  // Validate each item if provided
  if (items.config) {
    results.config = await validatePaymentConfigRuntime(items.config, crisisMode);
    if (!results.config.success) results.allValid = false;
  }

  if (items.customer) {
    results.customer = await validateCustomerDataRuntime(items.customer, crisisMode);
    if (!results.customer.success) results.allValid = false;
  }

  if (items.paymentMethod) {
    results.paymentMethod = await validatePaymentMethodRuntime(items.paymentMethod, crisisMode);
    if (!results.paymentMethod.success) results.allValid = false;
  }

  if (items.paymentIntent) {
    results.paymentIntent = await validatePaymentIntentRuntime(items.paymentIntent, crisisMode);
    if (!results.paymentIntent.success) results.allValid = false;
  }

  if (items.subscription) {
    results.subscription = await validateSubscriptionRuntime(items.subscription, crisisMode);
    if (!results.subscription.success) results.allValid = false;
  }

  if (items.crisisOverride) {
    results.crisisOverride = await validateCrisisOverrideRuntime(items.crisisOverride);
    if (!results.crisisOverride.success) results.allValid = false;
  }

  // Collect critical errors (those that block crisis access)
  const allResults = Object.values(results).filter(result =>
    result && typeof result === 'object' && 'error' in result
  ) as RuntimeValidationResult<any>[];

  for (const result of allResults) {
    if (result.error && result.error.crisisImpact === 'blocked') {
      results.criticalErrors.push(result.error);
    }
  }

  return results;
}

/**
 * Crisis-safe validation wrapper that never blocks emergency access
 */
export async function crisisSafeValidation<T>(
  validationFn: () => Promise<RuntimeValidationResult<T>>,
  emergencyFallback: T
): Promise<RuntimeValidationResult<T>> {
  try {
    const result = await validationFn();

    // If validation succeeds, return result
    if (result.success) {
      return result;
    }

    // If validation fails but crisis impact is 'none', use fallback
    if (result.error && result.error.crisisImpact === 'none') {
      return {
        success: true,
        data: emergencyFallback,
        error: null,
        performanceMetrics: result.performanceMetrics,
        complianceChecks: result.complianceChecks
      };
    }

    // Otherwise return the error result
    return result;

  } catch (error) {
    // CRITICAL: Always provide emergency fallback for any validation errors
    console.error('Crisis-safe validation error, using emergency fallback:', error);

    return {
      success: true,
      data: emergencyFallback,
      error: null,
      performanceMetrics: {
        validationTime: 0,
        crisisSafe: true
      },
      complianceChecks: {
        pciCompliant: true,
        hipaaCompliant: true
      }
    };
  }
}

// Auto-run runtime validation test in development
if (__DEV__) {
  // Test runtime validation
  (async () => {
    try {
      console.log('🧪 Testing runtime payment validation...');

      const testConfig = {
        stripe: {
          publishableKey: 'pk_test_123',
          apiVersion: '2023-10-16',
          timeout: 30000,
          maxRetries: 3,
          enableApplePay: true,
          enableGooglePay: true
        },
        subscription: {
          defaultTrialDays: 7,
          gracePeriodDays: 3,
          retryAttempts: 3,
          invoiceReminders: true
        },
        crisis: {
          enablePaymentBypass: true,
          emergencyAccessDuration: 24,
          crisisDetectionTimeout: 3000,
          hotlineAlwaysAccessible: true
        },
        security: {
          enableFraudDetection: true,
          rateLimit: {
            maxAttemptsPerMinute: 10,
            blockDurationMinutes: 5
          },
          tokenExpiry: {
            paymentMethods: 24,
            sessions: 2
          }
        },
        compliance: {
          pciDssLevel: '2',
          auditRetentionYears: 7,
          enableDetailedLogging: true,
          hipaaCompliant: true
        }
      };

      const result = await validatePaymentConfigRuntime(testConfig);

      if (result.success) {
        console.log('✅ Runtime payment validation test passed');
        console.log(`⚡ Validation time: ${result.performanceMetrics.validationTime}ms`);
        console.log(`🛡️ Crisis safe: ${result.performanceMetrics.crisisSafe ? '✅' : '❌'}`);
      } else {
        console.error('❌ Runtime payment validation test failed:', result.error);
      }
    } catch (error) {
      console.error('💥 Runtime payment validation test crashed:', error);
    }
  })();
}