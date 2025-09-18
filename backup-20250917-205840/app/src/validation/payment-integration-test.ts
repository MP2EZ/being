/**
 * Payment Integration Test - Day 15 TypeScript Integration Validation
 *
 * Comprehensive integration test for payment TypeScript system:
 * - Validates complete payment type system integration
 * - Tests runtime type validation with crisis scenarios
 * - Verifies performance monitoring for crisis compliance (<200ms)
 * - Validates error handling with recovery strategies
 * - Tests integration with existing authentication and user types
 * - Ensures HIPAA/PCI DSS compliance type separation
 */

import {
  validatePaymentTypes,
  quickPaymentTypeValidation,
  validatePaymentTypeIntegration
} from './payment-types-validation';

import {
  runtimePaymentValidator,
  validatePaymentConfigRuntime,
  validateCustomerDataRuntime,
  validatePaymentMethodRuntime,
  validateCrisisOverrideRuntime,
  crisisSafeValidation
} from './runtime-payment-validation';

import {
  PaymentErrorBuilder,
  StripeErrorConverter,
  crisisPaymentErrorHandler,
  createCrisisError
} from '../types/payment-error-handling';

import {
  paymentPerformanceMonitor,
  crisisPerformanceValidator,
  measureCrisisOperation,
  isCrisisPerformanceSafe,
  PERFORMANCE_THRESHOLDS
} from '../types/payment-performance';

import {
  PaymentConfig,
  PaymentState,
  PaymentActions,
  CustomerData,
  PaymentMethodData,
  CrisisPaymentOverride,
  EnhancedPaymentState,
  EnhancedPaymentActions,
  PaymentOperation
} from '../types/payment';

/**
 * Integration Test Results Interface
 */
export interface PaymentIntegrationTestResult {
  readonly testName: string;
  readonly success: boolean;
  readonly duration: number;
  readonly details: {
    readonly typeValidation: boolean;
    readonly runtimeValidation: boolean;
    readonly errorHandling: boolean;
    readonly performanceMonitoring: boolean;
    readonly crisisCompliance: boolean;
    readonly integration: boolean;
  };
  readonly errors: string[];
  readonly warnings: string[];
  readonly criticalIssues: string[];
}

/**
 * Payment Integration Test Suite
 */
export class PaymentIntegrationTestSuite {
  private testResults: PaymentIntegrationTestResult[] = [];

  /**
   * Run complete payment integration test suite
   */
  async runAllTests(): Promise<{
    success: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: PaymentIntegrationTestResult[];
    summary: {
      typeValidation: boolean;
      runtimeValidation: boolean;
      errorHandling: boolean;
      performanceMonitoring: boolean;
      crisisCompliance: boolean;
      integration: boolean;
    };
  }> {
    console.log('🧪 Starting Payment Integration Test Suite...');

    this.testResults = [];

    // Run all integration tests
    await this.testTypeValidationIntegration();
    await this.testRuntimeValidationIntegration();
    await this.testErrorHandlingIntegration();
    await this.testPerformanceMonitoringIntegration();
    await this.testCrisisComplianceIntegration();
    await this.testFullSystemIntegration();

    // Calculate summary
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = this.testResults.filter(r => !r.success).length;
    const totalTests = this.testResults.length;

    const summary = {
      typeValidation: this.testResults.some(r => r.testName.includes('Type Validation') && r.success),
      runtimeValidation: this.testResults.some(r => r.testName.includes('Runtime Validation') && r.success),
      errorHandling: this.testResults.some(r => r.testName.includes('Error Handling') && r.success),
      performanceMonitoring: this.testResults.some(r => r.testName.includes('Performance') && r.success),
      crisisCompliance: this.testResults.some(r => r.testName.includes('Crisis Compliance') && r.success),
      integration: this.testResults.some(r => r.testName.includes('Full System') && r.success)
    };

    console.log(`✅ Payment Integration Tests Complete: ${passedTests}/${totalTests} passed`);

    return {
      success: failedTests === 0,
      totalTests,
      passedTests,
      failedTests,
      results: this.testResults,
      summary
    };
  }

  /**
   * Test 1: Type Validation Integration
   */
  private async testTypeValidationIntegration(): Promise<void> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const criticalIssues: string[] = [];

    try {
      console.log('🔍 Testing type validation integration...');

      // Test comprehensive type validation
      const typeValidationResult = await validatePaymentTypes();

      if (!typeValidationResult.valid) {
        errors.push(...typeValidationResult.errors);
        // Check for critical type validation issues
        if (typeValidationResult.errors.some(error => error.includes('critical'))) {
          criticalIssues.push('Critical type validation failures detected');
        }
      }

      warnings.push(...typeValidationResult.warnings);

      // Test performance of type validation
      if (typeValidationResult.performanceChecks.typeValidationTime === false) {
        warnings.push('Type validation took longer than expected');
      }

      // Test crisis response time in type validation
      if (typeValidationResult.performanceChecks.crisisResponseTime === false) {
        criticalIssues.push('Crisis response time validation failed - this is critical for user safety');
      }

      // Test integration with existing types
      const integrationResult = await validatePaymentTypeIntegration();
      if (!integrationResult.authIntegration) {
        errors.push('Auth integration types failed validation');
      }
      if (!integrationResult.crisisSafety) {
        criticalIssues.push('Crisis safety types failed validation');
      }

      const success = errors.length === 0 && criticalIssues.length === 0;
      const duration = Date.now() - startTime;

      this.testResults.push({
        testName: 'Type Validation Integration',
        success,
        duration,
        details: {
          typeValidation: typeValidationResult.valid,
          runtimeValidation: true, // Not tested in this section
          errorHandling: true, // Not tested in this section
          performanceMonitoring: typeValidationResult.performanceChecks.typeValidationTime,
          crisisCompliance: typeValidationResult.performanceChecks.crisisResponseTime,
          integration: integrationResult.authIntegration && integrationResult.crisisSafety
        },
        errors,
        warnings,
        criticalIssues
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      criticalIssues.push(`Type validation integration test crashed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      this.testResults.push({
        testName: 'Type Validation Integration',
        success: false,
        duration,
        details: {
          typeValidation: false,
          runtimeValidation: false,
          errorHandling: false,
          performanceMonitoring: false,
          crisisCompliance: false,
          integration: false
        },
        errors,
        warnings,
        criticalIssues
      });
    }
  }

  /**
   * Test 2: Runtime Validation Integration
   */
  private async testRuntimeValidationIntegration(): Promise<void> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const criticalIssues: string[] = [];

    try {
      console.log('🔍 Testing runtime validation integration...');

      // Test payment configuration validation
      const testConfig: PaymentConfig = {
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

      const configValidationResult = await validatePaymentConfigRuntime(testConfig);
      if (!configValidationResult.success) {
        errors.push('Payment config runtime validation failed');
      }

      // Test crisis mode validation
      const crisisConfigValidationResult = await validatePaymentConfigRuntime(testConfig, true);
      if (!crisisConfigValidationResult.success) {
        criticalIssues.push('Crisis mode config validation failed');
      }

      // Validate performance metrics
      if (!configValidationResult.performanceMetrics.crisisSafe) {
        criticalIssues.push('Runtime validation does not meet crisis response time requirements');
      }

      // Test customer data validation
      const testCustomerData: CustomerData = {
        userId: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        metadata: {
          appUserId: 'user_123',
          deviceId: 'device_123',
          registrationDate: new Date().toISOString(),
          therapeuticConsent: true,
          crisisContactConsent: true
        }
      };

      const customerValidationResult = await validateCustomerDataRuntime(testCustomerData);
      if (!customerValidationResult.success) {
        errors.push('Customer data runtime validation failed');
      }

      // Test crisis override validation
      const testCrisisOverride: CrisisPaymentOverride = {
        crisisSessionId: 'crisis_123',
        userId: 'user_123',
        deviceId: 'device_123',
        overrideReason: 'crisis_detection',
        overrideType: 'full_access',
        granted: new Date().toISOString(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        auditTrail: {
          triggerEvent: 'PHQ9_score_20',
          safetyScore: 85,
          accessGranted: ['all_therapeutic_features']
        }
      };

      const crisisValidationResult = await validateCrisisOverrideRuntime(testCrisisOverride);
      if (!crisisValidationResult.success) {
        criticalIssues.push('Crisis override validation failed - this is critical for user safety');
      }

      const success = errors.length === 0 && criticalIssues.length === 0;
      const duration = Date.now() - startTime;

      this.testResults.push({
        testName: 'Runtime Validation Integration',
        success,
        duration,
        details: {
          typeValidation: true, // Not tested in this section
          runtimeValidation: configValidationResult.success && customerValidationResult.success,
          errorHandling: true, // Not tested in this section
          performanceMonitoring: configValidationResult.performanceMetrics.crisisSafe,
          crisisCompliance: crisisValidationResult.success,
          integration: success
        },
        errors,
        warnings,
        criticalIssues
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      criticalIssues.push(`Runtime validation integration test crashed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      this.testResults.push({
        testName: 'Runtime Validation Integration',
        success: false,
        duration,
        details: {
          typeValidation: false,
          runtimeValidation: false,
          errorHandling: false,
          performanceMonitoring: false,
          crisisCompliance: false,
          integration: false
        },
        errors,
        warnings,
        criticalIssues
      });
    }
  }

  /**
   * Test 3: Error Handling Integration
   */
  private async testErrorHandlingIntegration(): Promise<void> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const criticalIssues: string[] = [];

    try {
      console.log('🔍 Testing error handling integration...');

      // Test enhanced error creation
      const testError = PaymentErrorBuilder.create()
        .withCategory('payment_processing_error')
        .withCode('TEST_ERROR')
        .withMessage('Test error message')
        .withCrisisImpact('none')
        .withUserMessage('Test user message')
        .withRecoveryStrategy('retry_with_backoff')
        .withContext({
          operation: 'create_payment_intent',
          crisisMode: false,
          emergencySession: false,
          requestMetadata: {}
        })
        .withSource({
          service: 'stripe',
          component: 'test',
          function: 'test'
        })
        .build();

      if (!testError.id || !testError.timestamp) {
        errors.push('Enhanced error creation failed');
      }

      // Test Stripe error conversion
      const mockStripeError = {
        type: 'card_error',
        code: 'card_declined',
        message: 'Your card was declined'
      };

      const convertedError = StripeErrorConverter.convert(mockStripeError, {
        operation: 'create_payment_intent',
        crisisMode: false,
        emergencySession: false,
        requestMetadata: {}
      });

      if (convertedError.category !== 'payment_processing_error') {
        errors.push('Stripe error conversion failed');
      }

      // Test crisis error handling
      const crisisError = createCrisisError('test_emergency', {
        operation: 'enable_crisis_mode',
        crisisMode: true,
        emergencySession: true,
        requestMetadata: {}
      });

      if (crisisError.crisisImpact !== 'none') {
        criticalIssues.push('Crisis errors must never impact emergency access');
      }

      // Test error recovery
      const recoveryResult = await crisisPaymentErrorHandler.handleError(testError, {
        operation: 'create_payment_intent',
        crisisMode: true,
        emergencySession: false,
        requestMetadata: {}
      });

      if (!recoveryResult.crisisModeFallback) {
        warnings.push('Crisis mode fallback was not activated during error recovery');
      }

      // Test performance of error handling
      if (recoveryResult.performanceMetrics.recoveryTime > PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE) {
        criticalIssues.push('Error recovery took too long for crisis safety');
      }

      const success = errors.length === 0 && criticalIssues.length === 0;
      const duration = Date.now() - startTime;

      this.testResults.push({
        testName: 'Error Handling Integration',
        success,
        duration,
        details: {
          typeValidation: true, // Not tested in this section
          runtimeValidation: true, // Not tested in this section
          errorHandling: success,
          performanceMonitoring: recoveryResult.performanceMetrics.recoveryTime <= PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE,
          crisisCompliance: crisisError.crisisImpact === 'none',
          integration: success
        },
        errors,
        warnings,
        criticalIssues
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      criticalIssues.push(`Error handling integration test crashed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      this.testResults.push({
        testName: 'Error Handling Integration',
        success: false,
        duration,
        details: {
          typeValidation: false,
          runtimeValidation: false,
          errorHandling: false,
          performanceMonitoring: false,
          crisisCompliance: false,
          integration: false
        },
        errors,
        warnings,
        criticalIssues
      });
    }
  }

  /**
   * Test 4: Performance Monitoring Integration
   */
  private async testPerformanceMonitoringIntegration(): Promise<void> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const criticalIssues: string[] = [];

    try {
      console.log('🔍 Testing performance monitoring integration...');

      // Test crisis operation measurement
      const crisisTestOperation = async (): Promise<string> => {
        // Simulate a fast crisis operation
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms - should be well under 200ms threshold
        return 'crisis_operation_success';
      };

      const { result, metric } = await measureCrisisOperation(
        'enable_crisis_mode',
        crisisTestOperation,
        {
          userId: 'user_123',
          sessionId: 'session_123',
          crisisMode: true,
          emergencySession: true,
          deviceId: 'device_123'
        }
      );

      if (result !== 'crisis_operation_success') {
        errors.push('Crisis operation measurement failed');
      }

      // Validate crisis response time
      const crisisCompliant = crisisPerformanceValidator.validateCrisisResponseTime(metric.duration);
      if (!crisisCompliant) {
        criticalIssues.push(`Crisis operation took ${metric.duration}ms (should be <${PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE}ms)`);
      }

      // Test performance monitoring
      const operationId = paymentPerformanceMonitor.startOperation('create_subscription', {
        userId: 'user_123',
        sessionId: 'session_123',
        crisisMode: false,
        emergencySession: false,
        operation: 'create_subscription'
      });

      // Simulate operation
      await new Promise(resolve => setTimeout(resolve, 100));

      const endMetric = paymentPerformanceMonitor.endOperation(operationId, true);

      if (!endMetric.withinThreshold && endMetric.duration > endMetric.threshold * 2) {
        warnings.push('Performance monitoring detected slow operation');
      }

      // Test crisis performance safety check
      const crisisPerformanceSafe = isCrisisPerformanceSafe();
      if (!crisisPerformanceSafe) {
        warnings.push('Current performance may not support crisis operations');
      }

      const success = errors.length === 0 && criticalIssues.length === 0;
      const duration = Date.now() - startTime;

      this.testResults.push({
        testName: 'Performance Monitoring Integration',
        success,
        duration,
        details: {
          typeValidation: true, // Not tested in this section
          runtimeValidation: true, // Not tested in this section
          errorHandling: true, // Not tested in this section
          performanceMonitoring: success && metric.withinThreshold,
          crisisCompliance: crisisCompliant,
          integration: success
        },
        errors,
        warnings,
        criticalIssues
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      criticalIssues.push(`Performance monitoring integration test crashed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      this.testResults.push({
        testName: 'Performance Monitoring Integration',
        success: false,
        duration,
        details: {
          typeValidation: false,
          runtimeValidation: false,
          errorHandling: false,
          performanceMonitoring: false,
          crisisCompliance: false,
          integration: false
        },
        errors,
        warnings,
        criticalIssues
      });
    }
  }

  /**
   * Test 5: Crisis Compliance Integration
   */
  private async testCrisisComplianceIntegration(): Promise<void> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const criticalIssues: string[] = [];

    try {
      console.log('🔍 Testing crisis compliance integration...');

      // Test that crisis mode never blocks emergency access
      const emergencyFallback: CrisisPaymentOverride = {
        crisisSessionId: 'emergency_fallback',
        userId: 'emergency_user',
        deviceId: 'emergency_device',
        overrideReason: 'emergency_access',
        overrideType: 'full_access',
        granted: new Date().toISOString(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        auditTrail: {
          triggerEvent: 'test_emergency',
          safetyScore: 100,
          accessGranted: ['all_therapeutic_features']
        }
      };

      // Test crisis-safe validation wrapper
      const crisisSafeResult = await crisisSafeValidation(
        async () => {
          // Simulate a validation that might fail
          throw new Error('Simulated validation failure');
        },
        emergencyFallback
      );

      // Crisis-safe validation should always succeed with fallback
      if (!crisisSafeResult.success) {
        criticalIssues.push('Crisis-safe validation failed to provide emergency fallback');
      }

      if (!crisisSafeResult.data || crisisSafeResult.data.overrideType !== 'full_access') {
        criticalIssues.push('Crisis-safe validation fallback does not provide full access');
      }

      // Test crisis performance requirements
      const crisisOperationStart = Date.now();

      // Simulate crisis override creation
      const crisisOverrideResult = await validateCrisisOverrideRuntime({
        crisisSessionId: 'test_crisis',
        userId: 'user_123',
        deviceId: 'device_123',
        overrideReason: 'crisis_detection',
        overrideType: 'full_access',
        granted: new Date().toISOString(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        auditTrail: {
          triggerEvent: 'test_trigger',
          safetyScore: 90,
          accessGranted: ['therapeutic_content']
        }
      });

      const crisisOperationTime = Date.now() - crisisOperationStart;

      if (crisisOperationTime > PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE) {
        criticalIssues.push(`Crisis override creation took ${crisisOperationTime}ms (should be <${PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE}ms)`);
      }

      if (!crisisOverrideResult.success) {
        criticalIssues.push('Crisis override validation failed');
      }

      // Test that crisis mode preserves all therapeutic features
      if (crisisOverrideResult.data && crisisOverrideResult.data.overrideType !== 'full_access') {
        criticalIssues.push('Crisis override does not provide full therapeutic access');
      }

      const success = errors.length === 0 && criticalIssues.length === 0;
      const duration = Date.now() - startTime;

      this.testResults.push({
        testName: 'Crisis Compliance Integration',
        success,
        duration,
        details: {
          typeValidation: true, // Not tested in this section
          runtimeValidation: true, // Not tested in this section
          errorHandling: true, // Not tested in this section
          performanceMonitoring: crisisOperationTime <= PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE,
          crisisCompliance: success,
          integration: success
        },
        errors,
        warnings,
        criticalIssues
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      criticalIssues.push(`Crisis compliance integration test crashed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      this.testResults.push({
        testName: 'Crisis Compliance Integration',
        success: false,
        duration,
        details: {
          typeValidation: false,
          runtimeValidation: false,
          errorHandling: false,
          performanceMonitoring: false,
          crisisCompliance: false,
          integration: false
        },
        errors,
        warnings,
        criticalIssues
      });
    }
  }

  /**
   * Test 6: Full System Integration
   */
  private async testFullSystemIntegration(): Promise<void> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const criticalIssues: string[] = [];

    try {
      console.log('🔍 Testing full system integration...');

      // Test complete workflow: Normal operation → Error → Crisis mode → Recovery

      // 1. Normal payment operation
      let testConfig: PaymentConfig;
      try {
        testConfig = {
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

        const configResult = await validatePaymentConfigRuntime(testConfig);
        if (!configResult.success) {
          errors.push('Initial config validation failed');
        }
      } catch (error) {
        errors.push('Config creation failed');
      }

      // 2. Simulate error scenario
      try {
        const mockError = new Error('Payment processing failed');
        const errorContext = {
          operation: 'create_payment_intent' as PaymentOperation,
          crisisMode: false,
          emergencySession: false,
          requestMetadata: {}
        };

        const errorResult = await crisisPaymentErrorHandler.handleError(mockError, errorContext);

        if (errorResult.success) {
          warnings.push('Error handling succeeded unexpectedly');
        }
      } catch (error) {
        warnings.push('Error handling test failed');
      }

      // 3. Crisis mode activation
      try {
        const crisisContext = {
          operation: 'enable_crisis_mode' as PaymentOperation,
          crisisMode: true,
          emergencySession: true,
          requestMetadata: {}
        };

        const crisisResult = await crisisPaymentErrorHandler.handleError(new Error('Crisis activation'), crisisContext);

        if (!crisisResult.success || !crisisResult.crisisModeFallback) {
          criticalIssues.push('Crisis mode activation failed');
        }

        if (!crisisResult.performanceMetrics.crisisSafe) {
          criticalIssues.push('Crisis mode activation does not meet performance requirements');
        }
      } catch (error) {
        criticalIssues.push('Crisis mode test failed');
      }

      // 4. Validate end-to-end type safety
      try {
        const quickValidation = await quickPaymentTypeValidation();
        if (!quickValidation) {
          errors.push('End-to-end type validation failed');
        }
      } catch (error) {
        errors.push('End-to-end validation crashed');
      }

      // 5. Performance compliance check
      try {
        const performanceSafe = isCrisisPerformanceSafe();
        if (!performanceSafe) {
          warnings.push('System performance may not support crisis operations');
        }
      } catch (error) {
        warnings.push('Performance check failed');
      }

      const success = errors.length === 0 && criticalIssues.length === 0;
      const duration = Date.now() - startTime;

      this.testResults.push({
        testName: 'Full System Integration',
        success,
        duration,
        details: {
          typeValidation: true,
          runtimeValidation: true,
          errorHandling: true,
          performanceMonitoring: true,
          crisisCompliance: criticalIssues.length === 0,
          integration: success
        },
        errors,
        warnings,
        criticalIssues
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      criticalIssues.push(`Full system integration test crashed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      this.testResults.push({
        testName: 'Full System Integration',
        success: false,
        duration,
        details: {
          typeValidation: false,
          runtimeValidation: false,
          errorHandling: false,
          performanceMonitoring: false,
          crisisCompliance: false,
          integration: false
        },
        errors,
        warnings,
        criticalIssues
      });
    }
  }
}

/**
 * Run payment integration tests and return results
 */
export async function runPaymentIntegrationTests(): Promise<{
  success: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: PaymentIntegrationTestResult[];
  summary: {
    typeValidation: boolean;
    runtimeValidation: boolean;
    errorHandling: boolean;
    performanceMonitoring: boolean;
    crisisCompliance: boolean;
    integration: boolean;
  };
}> {
  const testSuite = new PaymentIntegrationTestSuite();
  return await testSuite.runAllTests();
}

/**
 * Quick integration test for CI/CD
 */
export async function quickPaymentIntegrationTest(): Promise<boolean> {
  try {
    const results = await runPaymentIntegrationTests();

    // Must have no critical issues and all main categories passing
    const criticalIssueCount = results.results.reduce((count, result) => count + result.criticalIssues.length, 0);

    return results.success &&
           criticalIssueCount === 0 &&
           results.summary.crisisCompliance &&
           results.summary.typeValidation;
  } catch (error) {
    console.error('Payment integration test crashed:', error);
    return false;
  }
}

// Auto-run integration tests in development
if (__DEV__) {
  runPaymentIntegrationTests().then(results => {
    if (results.success) {
      console.log('✅ Payment Integration Tests: ALL PASSED');
      console.log(`📊 Summary: ${results.passedTests}/${results.totalTests} tests passed`);
      console.log('🎯 All type safety and crisis compliance requirements met');
    } else {
      console.error('❌ Payment Integration Tests: SOME FAILED');
      console.error(`📊 Summary: ${results.passedTests}/${results.totalTests} tests passed`);

      const criticalIssues = results.results.flatMap(r => r.criticalIssues);
      if (criticalIssues.length > 0) {
        console.error(`🚨 ${criticalIssues.length} CRITICAL issues detected:`);
        criticalIssues.forEach(issue => console.error(`  • ${issue}`));
      }
    }
  }).catch(error => {
    console.error('💥 Payment Integration Tests crashed:', error);
  });
}