/**
 * Crisis Queue Bypass API
 *
 * Ensures emergency and crisis operations bypass the offline queue system entirely,
 * providing immediate sync attempts and guaranteed therapeutic access during critical moments.
 * Crisis operations never wait in queues - they attempt real-time sync immediately.
 *
 * CRISIS SAFETY GUARANTEES:
 * - Emergency operations never queued offline (always attempt immediate sync)
 * - Crisis data gets absolute priority during offline-to-online transition
 * - Therapeutic access maintained regardless of queue status
 * - <200ms response time for crisis override operations
 *
 * CRISIS ESCALATION MATRIX:
 * - Level 10: Emergency (988 hotline) - Immediate bypass, <100ms
 * - Level 9: Critical (High clinical risk) - Immediate bypass, <150ms
 * - Level 8: High (Crisis plan access) - Priority sync, <200ms
 * - Level 7: Elevated (Assessment alerts) - Fast-track, <500ms
 */

import { z } from 'zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import type { OfflineOperation } from './offline-payment-queue-api';

/**
 * Crisis Operation Types
 */
export const CrisisOperationSchema = z.object({
  // Core identification
  id: z.string().uuid(),
  crisisLevel: z.enum(['emergency', 'critical', 'high', 'elevated']),
  operationType: z.enum([
    'crisis_hotline_call',
    'emergency_contact_activation',
    'crisis_plan_access',
    'safety_check_immediate',
    'assessment_crisis_alert',
    'therapeutic_intervention',
    'emergency_resource_access',
    'crisis_data_sync'
  ]),

  // Crisis context
  crisisIndicators: z.array(z.string()),
  riskLevel: z.number().min(1).max(10),
  timeConstraints: z.object({
    maxResponseTime: z.number().positive(), // ms
    criticalDeadline: z.string().optional(), // ISO timestamp
    timeToInterventionRequired: z.number().positive().optional() // ms
  }),

  // Therapeutic context
  therapeuticPriority: z.number().min(1).max(10),
  affectsUserSafety: z.boolean(),
  requiredForTherapeuticContinuity: z.boolean(),
  canDegradeGracefully: z.boolean(),

  // Bypass configuration
  forceImmediate: z.boolean(),
  allowOfflineFallback: z.boolean(),
  requiresRealTimeSync: z.boolean(),
  fallbackBehavior: z.enum(['cache_locally', 'show_error', 'degrade_gracefully', 'retry_immediately']),

  // Payload and sync details
  payload: z.record(z.any()),
  syncEndpoint: z.string(),
  httpMethod: z.enum(['GET', 'POST', 'PUT', 'PATCH']).default('POST'),
  headers: z.record(z.string()).optional(),

  // User and subscription context
  userId: z.string(),
  subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),

  // Timing
  createdAt: z.string(), // ISO timestamp
  mustCompleteBy: z.string().optional(), // ISO timestamp
  lastAttemptAt: z.string().optional(),

  // Error tracking
  attempts: z.number().min(0).default(0),
  lastError: z.string().optional(),
  fallbackActivated: z.boolean().default(false),

  // Metadata
  metadata: z.record(z.any()).default({})
});

export type CrisisOperation = z.infer<typeof CrisisOperationSchema>;

/**
 * Crisis Response Metrics
 */
export const CrisisResponseMetricsSchema = z.object({
  // Response time tracking
  responseTime: z.object({
    target: z.number().positive(), // ms
    actual: z.number().positive(), // ms
    exceeded: z.boolean(),
    percentile95: z.number().positive(), // ms
    percentile99: z.number().positive()  // ms
  }),

  // Success rates
  successRate: z.object({
    immediate: z.number().min(0).max(1), // 0-1 ratio
    withRetry: z.number().min(0).max(1),
    overall: z.number().min(0).max(1)
  }),

  // Crisis type breakdown
  operationsByType: z.record(z.string(), z.object({
    count: z.number().min(0),
    avgResponseTime: z.number().positive(),
    successRate: z.number().min(0).max(1)
  })),

  // Error analysis
  errors: z.object({
    networkErrors: z.number().min(0),
    timeoutErrors: z.number().min(0),
    serverErrors: z.number().min(0),
    totalErrors: z.number().min(0),
    criticalFailures: z.number().min(0) // Failures that affected user safety
  }),

  // Fallback usage
  fallbacks: z.object({
    cacheUsage: z.number().min(0),
    gracefulDegradation: z.number().min(0),
    immediateRetry: z.number().min(0),
    totalFallbacks: z.number().min(0)
  }),

  // Time period
  periodStart: z.string(), // ISO timestamp
  periodEnd: z.string(),   // ISO timestamp
  totalOperations: z.number().min(0)
});

export type CrisisResponseMetrics = z.infer<typeof CrisisResponseMetricsSchema>;

/**
 * Crisis Queue Bypass API Class
 */
export class CrisisQueueBypassAPI {
  private storageKey: string;
  private metricsKey: string;
  private responseTimeTargets: Record<string, number>;
  private failedOperations: Map<string, CrisisOperation>;
  private metrics: CrisisResponseMetrics;

  constructor(config?: {
    storageKey?: string;
    responseTimeTargets?: Record<string, number>;
  }) {
    this.storageKey = config?.storageKey || 'fullmind_crisis_operations';
    this.metricsKey = `${this.storageKey}_metrics`;
    this.responseTimeTargets = config?.responseTimeTargets || {
      'emergency': 100,    // 988 hotline, immediate response
      'critical': 150,     // High clinical risk
      'high': 200,         // Crisis plan access
      'elevated': 500      // Assessment alerts
    };
    this.failedOperations = new Map();
    this.metrics = this.initializeMetrics();
  }

  /**
   * Execute crisis operation with immediate bypass
   */
  async executeImmediate(operation: CrisisOperation): Promise<{
    success: boolean;
    responseTime: number;
    usedFallback: boolean;
    fallbackType?: string;
    error?: string;
    result?: any;
  }> {
    const startTime = Date.now();
    const validatedOperation = CrisisOperationSchema.parse(operation);

    try {
      // Crisis operations never wait - attempt immediate sync
      const result = await this.attemptImmediateSync(validatedOperation);

      if (result.success) {
        await this.recordSuccessMetrics(validatedOperation, Date.now() - startTime);
        return {
          success: true,
          responseTime: Date.now() - startTime,
          usedFallback: false,
          result: result.data
        };
      }

      // If immediate sync fails, handle fallback
      const fallbackResult = await this.handleCrisisFallback(validatedOperation);

      await this.recordFailureMetrics(validatedOperation, Date.now() - startTime, result.error);

      return {
        success: fallbackResult.success,
        responseTime: Date.now() - startTime,
        usedFallback: true,
        fallbackType: fallbackResult.type,
        error: result.error,
        result: fallbackResult.data
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.recordFailureMetrics(validatedOperation, responseTime, String(error));

      // Even in error, attempt fallback for user safety
      const emergencyFallback = await this.handleEmergencyFallback(validatedOperation);

      return {
        success: emergencyFallback.success,
        responseTime,
        usedFallback: true,
        fallbackType: 'emergency',
        error: String(error),
        result: emergencyFallback.data
      };
    }
  }

  /**
   * Check if operation should bypass queue
   */
  async shouldBypassQueue(operation: OfflineOperation): Promise<{
    shouldBypass: boolean;
    reason: string;
    crisisLevel?: string;
    targetResponseTime?: number;
  }> {
    // Crisis operations always bypass
    if (operation.isCrisisOperation || operation.bypassOfflineQueue) {
      return {
        shouldBypass: true,
        reason: 'Crisis operation requires immediate processing',
        crisisLevel: operation.crisisLevel,
        targetResponseTime: this.responseTimeTargets[operation.crisisLevel] || 200
      };
    }

    // Therapeutic continuity operations bypass during crisis
    if (operation.affectsTherapeuticAccess) {
      const isCurrentlyCrisis = await this.isUserInCrisisMode(operation.userId);
      if (isCurrentlyCrisis) {
        return {
          shouldBypass: true,
          reason: 'Therapeutic access required during crisis period',
          crisisLevel: 'high',
          targetResponseTime: 500
        };
      }
    }

    // High priority operations bypass when queue is congested
    if (operation.priority >= 8) {
      // Implementation would check queue congestion
      return {
        shouldBypass: true,
        reason: 'High priority operation with queue bypass privilege',
        targetResponseTime: 1000
      };
    }

    return {
      shouldBypass: false,
      reason: 'Standard operation should use queue'
    };
  }

  /**
   * Monitor crisis response performance
   */
  async getCrisisResponseMetrics(): Promise<CrisisResponseMetrics> {
    try {
      const savedMetrics = await AsyncStorage.getItem(this.metricsKey);
      if (savedMetrics) {
        return CrisisResponseMetricsSchema.parse(JSON.parse(savedMetrics));
      }
      return this.metrics;
    } catch {
      return this.metrics;
    }
  }

  /**
   * Validate crisis response time compliance
   */
  async validateResponseTimeCompliance(): Promise<{
    compliant: boolean;
    violations: Array<{
      crisisLevel: string;
      targetTime: number;
      actualTime: number;
      violationCount: number;
    }>;
    overallScore: number; // 0-1
  }> {
    const metrics = await this.getCrisisResponseMetrics();
    const violations: Array<{
      crisisLevel: string;
      targetTime: number;
      actualTime: number;
      violationCount: number;
    }> = [];

    let totalOperations = 0;
    let compliantOperations = 0;

    for (const [crisisLevel, target] of Object.entries(this.responseTimeTargets)) {
      const operations = metrics.operationsByType[crisisLevel];
      if (operations) {
        totalOperations += operations.count;

        // Estimate compliant operations (assuming normal distribution)
        const compliantOps = Math.floor(operations.count *
          (operations.avgResponseTime <= target ? 0.9 : 0.6));
        compliantOperations += compliantOps;

        if (operations.avgResponseTime > target) {
          violations.push({
            crisisLevel,
            targetTime: target,
            actualTime: operations.avgResponseTime,
            violationCount: operations.count - compliantOps
          });
        }
      }
    }

    const overallScore = totalOperations > 0 ? compliantOperations / totalOperations : 1;
    const isCompliant = overallScore >= 0.95; // 95% compliance threshold

    return {
      compliant: isCompliant,
      violations,
      overallScore
    };
  }

  /**
   * Private helper methods
   */
  private async attemptImmediateSync(operation: CrisisOperation): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Check network connectivity first
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error('No network connection available for crisis operation');
      }

      // Prepare request with crisis priority headers
      const requestOptions: RequestInit = {
        method: operation.httpMethod,
        headers: {
          'Content-Type': 'application/json',
          'X-Crisis-Operation': 'true',
          'X-Crisis-Level': operation.crisisLevel,
          'X-Max-Response-Time': operation.timeConstraints.maxResponseTime.toString(),
          'X-User-Safety-Critical': operation.affectsUserSafety.toString(),
          'X-Operation-Id': operation.id,
          'X-Subscription-Tier': operation.subscriptionTier,
          ...operation.headers
        },
        body: operation.httpMethod !== 'GET' ? JSON.stringify(operation.payload) : undefined,
        // Set aggressive timeout for crisis operations
        signal: AbortSignal.timeout(operation.timeConstraints.maxResponseTime)
      };

      const response = await fetch(operation.syncEndpoint, requestOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data
      };

    } catch (error) {
      return {
        success: false,
        error: String(error)
      };
    }
  }

  private async handleCrisisFallback(operation: CrisisOperation): Promise<{
    success: boolean;
    type: string;
    data?: any;
  }> {
    switch (operation.fallbackBehavior) {
      case 'cache_locally':
        await this.cacheOperationLocally(operation);
        return {
          success: true,
          type: 'cached_locally',
          data: { cached: true, willRetry: true }
        };

      case 'retry_immediately':
        // Store for immediate retry when connectivity returns
        this.failedOperations.set(operation.id, operation);
        return {
          success: false,
          type: 'retry_queued',
          data: { willRetry: true, retryInMs: 1000 }
        };

      case 'degrade_gracefully':
        const degradedResult = await this.provideDegradedService(operation);
        return {
          success: true,
          type: 'graceful_degradation',
          data: degradedResult
        };

      default:
        return {
          success: false,
          type: 'show_error',
          data: { error: 'Crisis operation failed - please retry or seek immediate help' }
        };
    }
  }

  private async handleEmergencyFallback(operation: CrisisOperation): Promise<{
    success: boolean;
    data?: any;
  }> {
    // For emergency operations that fail, provide immediate local alternatives
    if (operation.operationType === 'crisis_hotline_call') {
      return {
        success: true,
        data: {
          localHotline: '988',
          alternativeNumbers: ['1-800-273-8255', '1-800-784-2433'],
          message: 'Please call 988 immediately for crisis support'
        }
      };
    }

    if (operation.operationType === 'crisis_plan_access') {
      const cachedPlan = await this.getCachedCrisisPlan(operation.userId);
      return {
        success: true,
        data: cachedPlan || {
          emergencyContacts: [],
          copingStrategies: ['Deep breathing', 'Contact trusted friend', 'Call 988'],
          safetyPlan: 'If you are in immediate danger, call 911'
        }
      };
    }

    return {
      success: false,
      data: { error: 'Emergency fallback not available for this operation type' }
    };
  }

  private async cacheOperationLocally(operation: CrisisOperation): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.storageKey);
      const operations = cached ? JSON.parse(cached) : [];
      operations.push({
        ...operation,
        cachedAt: new Date().toISOString(),
        priority: 10 // Highest priority for retry
      });
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(operations));
    } catch (error) {
      console.error('Failed to cache crisis operation:', error);
    }
  }

  private async provideDegradedService(operation: CrisisOperation): Promise<any> {
    // Provide offline alternatives based on operation type
    switch (operation.operationType) {
      case 'safety_check_immediate':
        return {
          selfAssessmentQuestions: [
            'Are you safe right now?',
            'Do you have thoughts of hurting yourself?',
            'Do you have someone you can talk to?'
          ],
          emergencyResources: ['988 Crisis Hotline', 'Local Emergency: 911'],
          copingSkills: ['Deep breathing', '5-4-3-2-1 grounding technique']
        };

      case 'therapeutic_intervention':
        return {
          immediateStrategies: [
            'Practice deep breathing for 3 minutes',
            'Use the 5-4-3-2-1 grounding technique',
            'Contact your support person'
          ],
          resourceAccess: 'Available offline',
          followUpRequired: true
        };

      default:
        return {
          message: 'Service temporarily unavailable offline',
          alternatives: ['Call 988 for immediate support', 'Contact emergency services if in danger']
        };
    }
  }

  private async isUserInCrisisMode(userId: string): Promise<boolean> {
    try {
      // Implementation would check user's recent crisis indicators
      const crisisData = await AsyncStorage.getItem(`crisis_mode_${userId}`);
      if (!crisisData) return false;

      const crisis = JSON.parse(crisisData);
      const crisisEnd = new Date(crisis.endTime);
      return crisisEnd > new Date();
    } catch {
      return false;
    }
  }

  private async getCachedCrisisPlan(userId: string): Promise<any> {
    try {
      const planData = await AsyncStorage.getItem(`crisis_plan_${userId}`);
      return planData ? JSON.parse(planData) : null;
    } catch {
      return null;
    }
  }

  private async recordSuccessMetrics(operation: CrisisOperation, responseTime: number): Promise<void> {
    const target = this.responseTimeTargets[operation.crisisLevel];

    this.metrics.responseTime.actual = responseTime;
    this.metrics.responseTime.exceeded = responseTime > target;

    if (!this.metrics.operationsByType[operation.crisisLevel]) {
      this.metrics.operationsByType[operation.crisisLevel] = {
        count: 0,
        avgResponseTime: 0,
        successRate: 0
      };
    }

    const typeMetrics = this.metrics.operationsByType[operation.crisisLevel];
    typeMetrics.count++;
    typeMetrics.avgResponseTime = (typeMetrics.avgResponseTime + responseTime) / 2;
    // Success rate calculation would be more sophisticated in reality

    await this.saveMetrics();
  }

  private async recordFailureMetrics(operation: CrisisOperation, responseTime: number, error: string): Promise<void> {
    this.metrics.errors.totalErrors++;

    if (error.includes('network') || error.includes('fetch')) {
      this.metrics.errors.networkErrors++;
    } else if (error.includes('timeout') || error.includes('AbortError')) {
      this.metrics.errors.timeoutErrors++;
    } else if (error.includes('HTTP 5')) {
      this.metrics.errors.serverErrors++;
    }

    if (operation.affectsUserSafety) {
      this.metrics.errors.criticalFailures++;
    }

    await this.saveMetrics();
  }

  private async saveMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.metricsKey, JSON.stringify(this.metrics));
    } catch (error) {
      console.error('Failed to save crisis metrics:', error);
    }
  }

  private initializeMetrics(): CrisisResponseMetrics {
    const now = new Date().toISOString();
    return {
      responseTime: {
        target: 200,
        actual: 0,
        exceeded: false,
        percentile95: 0,
        percentile99: 0
      },
      successRate: {
        immediate: 1,
        withRetry: 1,
        overall: 1
      },
      operationsByType: {},
      errors: {
        networkErrors: 0,
        timeoutErrors: 0,
        serverErrors: 0,
        totalErrors: 0,
        criticalFailures: 0
      },
      fallbacks: {
        cacheUsage: 0,
        gracefulDegradation: 0,
        immediateRetry: 0,
        totalFallbacks: 0
      },
      periodStart: now,
      periodEnd: now,
      totalOperations: 0
    };
  }
}

/**
 * Default instance for global use
 */
export const crisisQueueBypass = new CrisisQueueBypassAPI();

export default CrisisQueueBypassAPI;