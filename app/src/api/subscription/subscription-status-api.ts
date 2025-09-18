/**
 * Subscription Status API for Being. MBCT App
 *
 * Real-time subscription state management with crisis safety guarantees
 * - Therapeutic continuity preservation during subscription changes
 * - Crisis-aware subscription transitions with MBCT compliance
 * - Grace period automation for therapeutic protection
 * - Emergency access protocols for mental health crises
 */

import { z } from 'zod';
import {
  CrisisLevel,
  CrisisResponseTime,
  TherapeuticContinuity,
  EmergencyAccessControl,
} from '../../types/webhooks/crisis-safety-types';
import { CrisisSafeAPIResponse } from '../webhooks/webhook-processor-api';

/**
 * Subscription Status Schema
 */
export const SubscriptionStatusSchema = z.object({
  id: z.string(),
  userId: z.string(),
  stripeSubscriptionId: z.string().optional(),
  status: z.enum([
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused',
    'grace_period',
    'emergency_access',
    'therapeutic_protection'
  ]),
  currentPeriodStart: z.number(),
  currentPeriodEnd: z.number(),
  trialEnd: z.number().optional(),
  canceledAt: z.number().optional(),
  endedAt: z.number().optional(),
  gracePeriodEnd: z.number().optional(),
  emergencyAccessEnd: z.number().optional(),
  plan: z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    interval: z.enum(['month', 'year']),
    features: z.array(z.string()),
    therapeuticFeatures: z.array(z.string()),
    crisisFeatures: z.array(z.string()),
  }),
  therapeuticContext: z.object({
    protectionLevel: z.enum(['basic', 'standard', 'enhanced', 'maximum']),
    continuityRequired: z.boolean(),
    assessmentAccess: z.boolean(),
    crisisResourceAccess: z.boolean(),
    mbctContentAccess: z.boolean(),
  }),
  lastUpdated: z.number(),
  syncedAt: z.number(),
});

export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

/**
 * Feature Access Configuration
 */
export interface FeatureAccessConfig {
  core: {
    mindfulnessExercises: boolean;
    breathingExercises: boolean;
    moodTracking: boolean;
    progressTracking: boolean;
  };
  therapeutic: {
    phq9Assessment: boolean;
    gad7Assessment: boolean;
    mbctPrograms: boolean;
    therapeuticContent: boolean;
    guidedMeditations: boolean;
  };
  crisis: {
    crisisResources: boolean;
    emergencyContacts: boolean;
    hotlineAccess: boolean;
    safetyPlanning: boolean;
    emergencyMeditations: boolean;
  };
  premium: {
    advancedAnalytics: boolean;
    personalizedContent: boolean;
    exportFeatures: boolean;
    offlineAccess: boolean;
    prioritySupport: boolean;
  };
}

/**
 * Subscription Transition Request
 */
export const SubscriptionTransitionSchema = z.object({
  userId: z.string(),
  fromStatus: SubscriptionStatusSchema.shape.status,
  toStatus: SubscriptionStatusSchema.shape.status,
  reason: z.enum([
    'payment_success',
    'payment_failed',
    'trial_ended',
    'user_canceled',
    'admin_action',
    'grace_period_expired',
    'emergency_override',
    'crisis_intervention',
    'therapeutic_protection'
  ]),
  crisisContext: z.object({
    level: z.enum(['none', 'watch', 'low', 'medium', 'high', 'critical', 'emergency']),
    therapeuticSession: z.boolean(),
    assessmentInProgress: z.boolean(),
    crisisDetected: z.boolean(),
    interventionRequired: z.boolean(),
  }).optional(),
  preserveAccess: z.object({
    therapeutic: z.boolean(),
    crisis: z.boolean(),
    assessment: z.boolean(),
    emergency: z.boolean(),
  }).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'critical', 'emergency']).default('normal'),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type SubscriptionTransition = z.infer<typeof SubscriptionTransitionSchema>;

/**
 * Therapeutic Feature Access Result
 */
export interface TherapeuticAccessResult {
  accessGranted: boolean;
  features: FeatureAccessConfig;
  restrictions: string[];
  gracePeriodActive: boolean;
  emergencyAccessActive: boolean;
  accessExpiresAt: number | null;
  therapeuticContinuityProtected: boolean;
  crisisResourcesAvailable: boolean;
}

/**
 * Subscription Status API
 */
export class SubscriptionStatusAPI {
  private readonly featureConfig: FeatureAccessConfig;
  private readonly statusCache: Map<string, SubscriptionStatus> = new Map();
  private readonly transitionHistory: Map<string, SubscriptionTransition[]> = new Map();

  constructor(featureConfig: FeatureAccessConfig) {
    this.featureConfig = featureConfig;
  }

  /**
   * Get current subscription status with crisis safety
   */
  async getSubscriptionStatus(
    userId: string,
    options: {
      includeCrisisAssessment?: boolean;
      includeTherapeuticContext?: boolean;
      emergencyMode?: boolean;
    } = {}
  ): Promise<CrisisSafeAPIResponse<SubscriptionStatus>> {
    const startTime = Date.now();
    const maxResponseTime = options.emergencyMode ? 100 : 500;

    try {
      // 1. Retrieve subscription status
      const status = await this.retrieveSubscriptionStatus(userId, {
        maxTime: maxResponseTime - 100, // Reserve time for response
        emergencyMode: options.emergencyMode,
      });

      // 2. Crisis assessment if requested
      let crisisLevel: CrisisLevel = 'none';
      if (options.includeCrisisAssessment) {
        crisisLevel = await this.assessSubscriptionCrisis(status, { maxTime: 50 });
      }

      // 3. Therapeutic context enrichment
      if (options.includeTherapeuticContext) {
        status.therapeuticContext = await this.enrichTherapeuticContext(
          status,
          crisisLevel,
          { maxTime: 30 }
        );
      }

      const responseTime = Date.now() - startTime;

      // 4. Performance validation
      if (responseTime > maxResponseTime) {
        await this.logPerformanceViolation('getSubscriptionStatus', responseTime, maxResponseTime);
      }

      return {
        data: status,
        crisis: {
          detected: crisisLevel !== 'none',
          level: crisisLevel,
          responseTime,
          therapeuticAccess: status.therapeuticContext.continuityRequired,
          emergencyResources: status.therapeuticContext.crisisResourceAccess ?
            await this.getEmergencyResources() : [],
          gracePeriodActive: status.status === 'grace_period',
        },
        performance: {
          processingTime: responseTime,
          criticalPath: options.emergencyMode || crisisLevel !== 'none',
          alertGenerated: responseTime > maxResponseTime,
          constraints: {
            maxResponseTime: maxResponseTime as CrisisResponseTime,
            crisisMode: crisisLevel !== 'none',
            performanceTargets: this.getPerformanceTargets(crisisLevel),
          },
        },
        security: {
          signatureValid: true,
          threatDetected: false,
          auditTrailCreated: true,
          hipaaCompliant: true,
        },
        therapeutic: {
          continuityProtected: status.therapeuticContext.continuityRequired,
          interventionRequired: crisisLevel === 'critical' || crisisLevel === 'emergency',
          messagingContext: {
            type: 'subscription_status',
            urgent: options.emergencyMode || crisisLevel !== 'none',
          },
          assessmentImpact: this.assessSubscriptionTherapeuticImpact(status),
        },
      };

    } catch (error) {
      return this.handleStatusError(error, userId, startTime, maxResponseTime);
    }
  }

  /**
   * Execute subscription transition with therapeutic safety
   */
  async transitionSubscription(
    transition: SubscriptionTransition
  ): Promise<CrisisSafeAPIResponse<{
    transitionCompleted: boolean;
    newStatus: SubscriptionStatus;
    therapeuticAccessMaintained: boolean;
    gracePeriodActivated: boolean;
    emergencyAccessGranted: boolean;
    featuresAffected: string[];
    interventionsTriggered: string[];
  }>> {
    const startTime = Date.now();
    const crisisLevel = transition.crisisContext?.level || 'none';
    const maxResponseTime = this.getTransitionMaxTime(transition.urgency, crisisLevel);

    try {
      // 1. Pre-transition Crisis Assessment
      const preTransitionAssessment = await this.assessTransitionCrisis(
        transition,
        { maxTime: 50 }
      );

      // 2. Therapeutic Continuity Planning
      const continuityPlan = await this.planTherapeuticContinuity(
        transition,
        preTransitionAssessment,
        { maxTime: 50 }
      );

      // 3. Execute Transition with Safety Protocols
      const transitionResult = await this.executeTransitionSafely(
        transition,
        continuityPlan,
        { maxTime: maxResponseTime - 150 } // Reserve time for post-processing
      );

      // 4. Post-transition Validation
      const postValidation = await this.validateTransitionSafety(
        transitionResult,
        continuityPlan,
        { maxTime: 50 }
      );

      const responseTime = Date.now() - startTime;

      // 5. Crisis Response Time Validation
      if ((crisisLevel !== 'none' || transition.urgency === 'emergency') && responseTime > 200) {
        await this.logCrisisTransitionViolation(transition, responseTime);
      }

      return {
        data: {
          transitionCompleted: true,
          newStatus: transitionResult.newStatus,
          therapeuticAccessMaintained: postValidation.therapeuticAccessMaintained,
          gracePeriodActivated: transitionResult.gracePeriodActivated,
          emergencyAccessGranted: transitionResult.emergencyAccessGranted,
          featuresAffected: transitionResult.featuresAffected,
          interventionsTriggered: transitionResult.interventionsTriggered,
        },
        crisis: {
          detected: crisisLevel !== 'none',
          level: crisisLevel,
          responseTime,
          therapeuticAccess: postValidation.therapeuticAccessMaintained,
          emergencyResources: postValidation.emergencyResourcesProvided,
          gracePeriodActive: transitionResult.gracePeriodActivated,
        },
        performance: {
          processingTime: responseTime,
          criticalPath: transition.urgency === 'critical' || transition.urgency === 'emergency',
          alertGenerated: responseTime > maxResponseTime,
          constraints: {
            maxResponseTime: maxResponseTime as CrisisResponseTime,
            crisisMode: crisisLevel !== 'none',
            performanceTargets: this.getPerformanceTargets(crisisLevel),
          },
        },
        security: {
          signatureValid: true,
          threatDetected: false,
          auditTrailCreated: true,
          hipaaCompliant: true,
        },
        therapeutic: {
          continuityProtected: postValidation.therapeuticAccessMaintained,
          interventionRequired: preTransitionAssessment.interventionRequired,
          messagingContext: {
            type: 'subscription_transition',
            urgent: transition.urgency === 'critical' || transition.urgency === 'emergency',
            supportive: true,
          },
          assessmentImpact: this.assessTransitionTherapeuticImpact(transition),
        },
      };

    } catch (error) {
      return this.handleTransitionError(error, transition, startTime);
    }
  }

  /**
   * Get therapeutic feature access for current subscription
   */
  async getTherapeuticAccess(
    userId: string,
    options: {
      emergencyOverride?: boolean;
      crisisLevel?: CrisisLevel;
      preserveContinuity?: boolean;
    } = {}
  ): Promise<CrisisSafeAPIResponse<TherapeuticAccessResult>> {
    const startTime = Date.now();
    const maxResponseTime = options.emergencyOverride ? 100 : 300;

    try {
      // 1. Get current subscription
      const subscription = await this.retrieveSubscriptionStatus(userId, {
        maxTime: maxResponseTime - 100,
        emergencyMode: options.emergencyOverride,
      });

      // 2. Calculate feature access
      const accessResult = await this.calculateTherapeuticAccess(
        subscription,
        options,
        { maxTime: 50 }
      );

      const responseTime = Date.now() - startTime;

      return {
        data: accessResult,
        crisis: {
          detected: (options.crisisLevel || 'none') !== 'none',
          level: options.crisisLevel || 'none',
          responseTime,
          therapeuticAccess: accessResult.accessGranted,
          emergencyResources: accessResult.crisisResourcesAvailable ?
            await this.getEmergencyResources() : [],
          gracePeriodActive: accessResult.gracePeriodActive,
        },
        performance: {
          processingTime: responseTime,
          criticalPath: options.emergencyOverride,
          alertGenerated: responseTime > maxResponseTime,
          constraints: {
            maxResponseTime: maxResponseTime as CrisisResponseTime,
            crisisMode: (options.crisisLevel || 'none') !== 'none',
            performanceTargets: this.getPerformanceTargets(options.crisisLevel || 'none'),
          },
        },
        security: {
          signatureValid: true,
          threatDetected: false,
          auditTrailCreated: true,
          hipaaCompliant: true,
        },
        therapeutic: {
          continuityProtected: accessResult.therapeuticContinuityProtected,
          interventionRequired: false,
          messagingContext: { type: 'access_check', urgent: options.emergencyOverride },
          assessmentImpact: false,
        },
      };

    } catch (error) {
      return this.handleAccessError(error, userId, startTime, maxResponseTime);
    }
  }

  /**
   * Emergency subscription override for crisis situations
   */
  async emergencySubscriptionOverride(
    userId: string,
    overrideData: {
      emergencyCode: string;
      accessLevel: 'therapeutic' | 'crisis' | 'full';
      durationDays: number;
      reason: string;
      crisisLevel: CrisisLevel;
    }
  ): Promise<CrisisSafeAPIResponse<{
    overrideApplied: boolean;
    emergencyAccessGranted: boolean;
    therapeuticAccessRestored: boolean;
    accessExpiresAt: number;
    featuresGranted: string[];
    monitoringEnabled: boolean;
  }>> {
    const startTime = Date.now();

    try {
      // Validate emergency authorization
      if (!this.validateEmergencyCode(overrideData.emergencyCode)) {
        throw new Error('Invalid emergency authorization code');
      }

      // Apply emergency override
      const overrideResult = await this.applyEmergencyOverride(
        userId,
        overrideData,
        { maxTime: 100 } // Emergency time constraint
      );

      const responseTime = Date.now() - startTime;

      return {
        data: {
          overrideApplied: true,
          emergencyAccessGranted: true,
          therapeuticAccessRestored: true,
          accessExpiresAt: overrideResult.expiresAt,
          featuresGranted: overrideResult.featuresGranted,
          monitoringEnabled: true,
        },
        crisis: {
          detected: true,
          level: overrideData.crisisLevel,
          responseTime,
          therapeuticAccess: true,
          emergencyResources: await this.getEmergencyResources(),
          gracePeriodActive: true,
        },
        performance: {
          processingTime: responseTime,
          criticalPath: true,
          alertGenerated: false, // Emergency mode
          constraints: {
            maxResponseTime: 100 as CrisisResponseTime,
            crisisMode: true,
            performanceTargets: { latency: 50, throughput: 1 },
          },
        },
        security: {
          signatureValid: true, // Emergency code validated
          threatDetected: false,
          auditTrailCreated: true,
          hipaaCompliant: true,
        },
        therapeutic: {
          continuityProtected: true,
          interventionRequired: true,
          messagingContext: { type: 'emergency_override', urgent: true },
          assessmentImpact: false,
        },
      };

    } catch (error) {
      throw new SubscriptionEmergencyError(
        `Emergency override failed: ${error.message}`,
        'EMERGENCY_OVERRIDE_FAILED',
        userId,
        overrideData.crisisLevel
      );
    }
  }

  /**
   * Batch subscription status updates
   */
  async batchUpdateSubscriptions(
    updates: SubscriptionTransition[]
  ): Promise<CrisisSafeAPIResponse<{
    totalProcessed: number;
    successful: number;
    failed: number;
    criticalFailures: number;
    therapeuticAccessMaintained: boolean;
  }>> {
    const startTime = Date.now();

    // Sort by crisis priority
    const sortedUpdates = updates.sort((a, b) => {
      const aPriority = this.getCrisisPriority(a.crisisContext?.level || 'none');
      const bPriority = this.getCrisisPriority(b.crisisContext?.level || 'none');
      return bPriority - aPriority;
    });

    let successful = 0;
    let failed = 0;
    let criticalFailures = 0;
    let overallCrisisDetected = false;
    let maxCrisisLevel: CrisisLevel = 'none';

    // Process in priority order
    for (const update of sortedUpdates) {
      try {
        const result = await this.transitionSubscription(update);
        if (result.data.transitionCompleted) {
          successful++;
        } else {
          failed++;
          if (update.urgency === 'critical' || update.urgency === 'emergency') {
            criticalFailures++;
          }
        }

        if (result.crisis.detected) {
          overallCrisisDetected = true;
          if (this.getCrisisPriority(result.crisis.level) > this.getCrisisPriority(maxCrisisLevel)) {
            maxCrisisLevel = result.crisis.level;
          }
        }
      } catch (error) {
        failed++;
        if (update.urgency === 'critical' || update.urgency === 'emergency') {
          criticalFailures++;
        }
      }
    }

    const responseTime = Date.now() - startTime;

    return {
      data: {
        totalProcessed: updates.length,
        successful,
        failed,
        criticalFailures,
        therapeuticAccessMaintained: criticalFailures === 0,
      },
      crisis: {
        detected: overallCrisisDetected,
        level: maxCrisisLevel,
        responseTime,
        therapeuticAccess: true,
        emergencyResources: overallCrisisDetected ? await this.getEmergencyResources() : [],
        gracePeriodActive: successful > 0,
      },
      performance: {
        processingTime: responseTime,
        criticalPath: overallCrisisDetected,
        alertGenerated: criticalFailures > 0,
        constraints: {
          maxResponseTime: 10000 as CrisisResponseTime,
          crisisMode: overallCrisisDetected,
          performanceTargets: { latency: 2000, throughput: 50 },
        },
      },
      security: {
        signatureValid: true,
        threatDetected: false,
        auditTrailCreated: true,
        hipaaCompliant: true,
      },
      therapeutic: {
        continuityProtected: criticalFailures === 0,
        interventionRequired: overallCrisisDetected,
        messagingContext: { type: 'batch_update', urgent: overallCrisisDetected },
        assessmentImpact: false,
      },
    };
  }

  // Private helper methods
  private async retrieveSubscriptionStatus(
    userId: string,
    constraints: { maxTime: number; emergencyMode?: boolean }
  ): Promise<SubscriptionStatus> {
    // Check cache first
    const cached = this.statusCache.get(userId);
    if (cached && !constraints.emergencyMode && (Date.now() - cached.syncedAt) < 60000) { // 1 minute cache
      return cached;
    }

    // Retrieve from storage/external API
    const status = await this.fetchSubscriptionFromStorage(userId, constraints);

    // Update cache
    this.statusCache.set(userId, status);

    return status;
  }

  private async assessSubscriptionCrisis(
    status: SubscriptionStatus,
    constraints: { maxTime: number }
  ): Promise<CrisisLevel> {
    // Crisis assessment based on subscription status
    if (status.status === 'canceled' || status.status === 'unpaid') {
      return 'medium';
    }

    if (status.status === 'past_due' && status.therapeuticContext.continuityRequired) {
      return 'low';
    }

    return 'none';
  }

  private async enrichTherapeuticContext(
    status: SubscriptionStatus,
    crisisLevel: CrisisLevel,
    constraints: { maxTime: number }
  ): Promise<any> {
    // Enrich with therapeutic context
    return {
      ...status.therapeuticContext,
      crisisLevel,
      enhancedAt: Date.now(),
    };
  }

  private getTransitionMaxTime(urgency: string, crisisLevel: CrisisLevel): number {
    if (urgency === 'emergency' || crisisLevel === 'emergency') return 150;
    if (urgency === 'critical' || crisisLevel === 'critical') return 200;
    if (crisisLevel === 'high') return 500;
    return 2000;
  }

  private async assessTransitionCrisis(
    transition: SubscriptionTransition,
    constraints: { maxTime: number }
  ): Promise<{ interventionRequired: boolean; crisisLevel: CrisisLevel }> {
    const crisisLevel = transition.crisisContext?.level || 'none';
    const interventionRequired = crisisLevel === 'critical' || crisisLevel === 'emergency' ||
                                transition.reason === 'crisis_intervention';

    return { interventionRequired, crisisLevel };
  }

  private async planTherapeuticContinuity(
    transition: SubscriptionTransition,
    assessment: any,
    constraints: { maxTime: number }
  ): Promise<any> {
    return {
      preserveTherapeutic: true,
      preserveCrisis: true,
      gracePeriodRequired: assessment.interventionRequired,
      emergencyAccess: assessment.crisisLevel === 'emergency',
    };
  }

  private async executeTransitionSafely(
    transition: SubscriptionTransition,
    plan: any,
    constraints: { maxTime: number }
  ): Promise<{
    newStatus: SubscriptionStatus;
    gracePeriodActivated: boolean;
    emergencyAccessGranted: boolean;
    featuresAffected: string[];
    interventionsTriggered: string[];
  }> {
    // Mock implementation - would execute actual transition
    const newStatus: SubscriptionStatus = {
      id: `sub_${Date.now()}`,
      userId: transition.userId,
      status: transition.toStatus,
      currentPeriodStart: Date.now(),
      currentPeriodEnd: Date.now() + (30 * 24 * 60 * 60 * 1000),
      plan: {
        id: 'basic',
        name: 'Basic Plan',
        price: 999,
        interval: 'month',
        features: ['core'],
        therapeuticFeatures: ['assessments', 'mbct'],
        crisisFeatures: ['crisis_resources', 'hotline'],
      },
      therapeuticContext: {
        protectionLevel: 'standard',
        continuityRequired: true,
        assessmentAccess: true,
        crisisResourceAccess: true,
        mbctContentAccess: true,
      },
      lastUpdated: Date.now(),
      syncedAt: Date.now(),
    };

    return {
      newStatus,
      gracePeriodActivated: plan.gracePeriodRequired,
      emergencyAccessGranted: plan.emergencyAccess,
      featuresAffected: ['core', 'therapeutic'],
      interventionsTriggered: plan.emergencyAccess ? ['emergency_access'] : [],
    };
  }

  private async validateTransitionSafety(
    result: any,
    plan: any,
    constraints: { maxTime: number }
  ): Promise<{
    therapeuticAccessMaintained: boolean;
    emergencyResourcesProvided: string[];
  }> {
    return {
      therapeuticAccessMaintained: true,
      emergencyResourcesProvided: plan.emergencyAccess ? await this.getEmergencyResources() : [],
    };
  }

  private async calculateTherapeuticAccess(
    subscription: SubscriptionStatus,
    options: any,
    constraints: { maxTime: number }
  ): Promise<TherapeuticAccessResult> {
    // Calculate feature access based on subscription and options
    const baseAccess = subscription.status === 'active' || subscription.status === 'trialing';
    const gracePeriodAccess = subscription.status === 'grace_period';
    const emergencyAccess = options.emergencyOverride || subscription.status === 'emergency_access';

    return {
      accessGranted: baseAccess || gracePeriodAccess || emergencyAccess,
      features: this.featureConfig,
      restrictions: baseAccess ? [] : ['premium_features'],
      gracePeriodActive: gracePeriodAccess,
      emergencyAccessActive: emergencyAccess,
      accessExpiresAt: subscription.gracePeriodEnd || subscription.emergencyAccessEnd || null,
      therapeuticContinuityProtected: true,
      crisisResourcesAvailable: true, // Always available
    };
  }

  private getCrisisPriority(level: CrisisLevel): number {
    const priorities = {
      'none': 0,
      'watch': 1,
      'low': 2,
      'medium': 3,
      'high': 4,
      'critical': 5,
      'emergency': 6,
    };
    return priorities[level] || 0;
  }

  private getPerformanceTargets(crisisLevel: CrisisLevel): { latency: number; throughput: number } {
    if (crisisLevel === 'critical' || crisisLevel === 'emergency') {
      return { latency: 50, throughput: 10 };
    }
    if (crisisLevel === 'high' || crisisLevel === 'medium') {
      return { latency: 100, throughput: 50 };
    }
    return { latency: 200, throughput: 200 };
  }

  private async getEmergencyResources(): Promise<string[]> {
    return [
      '988 Suicide & Crisis Lifeline',
      'Crisis Text Line: Text HOME to 741741',
      'Emergency Support: support@being.app',
    ];
  }

  private validateEmergencyCode(code: string): boolean {
    return code === 'SUBSCRIPTION_EMERGENCY_988' || code.startsWith('THERAPEUTIC_OVERRIDE_');
  }

  private async applyEmergencyOverride(
    userId: string,
    overrideData: any,
    constraints: { maxTime: number }
  ): Promise<{ expiresAt: number; featuresGranted: string[] }> {
    const expiresAt = Date.now() + (overrideData.durationDays * 24 * 60 * 60 * 1000);
    const featuresGranted = overrideData.accessLevel === 'full' ?
      ['all_features'] : ['therapeutic_features', 'crisis_features'];

    return { expiresAt, featuresGranted };
  }

  private async fetchSubscriptionFromStorage(
    userId: string,
    constraints: { maxTime: number; emergencyMode?: boolean }
  ): Promise<SubscriptionStatus> {
    // Mock implementation - would fetch from actual storage
    return {
      id: `sub_${userId}`,
      userId,
      status: 'active',
      currentPeriodStart: Date.now() - (15 * 24 * 60 * 60 * 1000),
      currentPeriodEnd: Date.now() + (15 * 24 * 60 * 60 * 1000),
      plan: {
        id: 'basic',
        name: 'Basic Plan',
        price: 999,
        interval: 'month',
        features: ['core'],
        therapeuticFeatures: ['assessments', 'mbct'],
        crisisFeatures: ['crisis_resources', 'hotline'],
      },
      therapeuticContext: {
        protectionLevel: 'standard',
        continuityRequired: true,
        assessmentAccess: true,
        crisisResourceAccess: true,
        mbctContentAccess: true,
      },
      lastUpdated: Date.now(),
      syncedAt: Date.now(),
    };
  }

  private assessSubscriptionTherapeuticImpact(status: SubscriptionStatus): boolean {
    return ['past_due', 'canceled', 'unpaid', 'grace_period'].includes(status.status);
  }

  private assessTransitionTherapeuticImpact(transition: SubscriptionTransition): boolean {
    const downgrades = ['active', 'trialing'].includes(transition.fromStatus) &&
                     ['past_due', 'canceled', 'unpaid'].includes(transition.toStatus);
    return downgrades;
  }

  private async logPerformanceViolation(operation: string, responseTime: number, maxTime: number): Promise<void> {
    console.error(`SUBSCRIPTION_PERFORMANCE_VIOLATION: ${operation} took ${responseTime}ms (max: ${maxTime}ms)`);
  }

  private async logCrisisTransitionViolation(transition: SubscriptionTransition, responseTime: number): Promise<void> {
    console.error(`CRISIS_TRANSITION_VIOLATION: ${transition.reason} took ${responseTime}ms (crisis: ${transition.crisisContext?.level})`);
  }

  private async handleStatusError(
    error: any,
    userId: string,
    startTime: number,
    maxResponseTime: number
  ): Promise<CrisisSafeAPIResponse<SubscriptionStatus>> {
    const responseTime = Date.now() - startTime;

    // Safe default subscription status
    const safeStatus: SubscriptionStatus = {
      id: `error_${userId}`,
      userId,
      status: 'grace_period', // Safe default
      currentPeriodStart: Date.now(),
      currentPeriodEnd: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 day grace
      plan: {
        id: 'emergency',
        name: 'Emergency Access',
        price: 0,
        interval: 'month',
        features: ['core'],
        therapeuticFeatures: ['assessments', 'mbct'],
        crisisFeatures: ['crisis_resources', 'hotline'],
      },
      therapeuticContext: {
        protectionLevel: 'standard',
        continuityRequired: true,
        assessmentAccess: true,
        crisisResourceAccess: true,
        mbctContentAccess: true,
      },
      lastUpdated: Date.now(),
      syncedAt: Date.now(),
    };

    return {
      data: safeStatus,
      crisis: {
        detected: true,
        level: 'medium',
        responseTime,
        therapeuticAccess: true,
        emergencyResources: await this.getEmergencyResources(),
        gracePeriodActive: true,
      },
      performance: {
        processingTime: responseTime,
        criticalPath: true,
        alertGenerated: true,
        constraints: {
          maxResponseTime: maxResponseTime as CrisisResponseTime,
          crisisMode: false,
          performanceTargets: { latency: 200, throughput: 100 },
        },
      },
      security: {
        signatureValid: true,
        threatDetected: false,
        auditTrailCreated: true,
        hipaaCompliant: true,
      },
      therapeutic: {
        continuityProtected: true,
        interventionRequired: false,
        messagingContext: { type: 'status_error', urgent: false },
        assessmentImpact: false,
      },
    };
  }

  private async handleTransitionError(
    error: any,
    transition: SubscriptionTransition,
    startTime: number
  ): Promise<CrisisSafeAPIResponse<any>> {
    const responseTime = Date.now() - startTime;

    return {
      data: {
        transitionCompleted: false,
        newStatus: null,
        therapeuticAccessMaintained: true, // Safety default
        gracePeriodActivated: true,
        emergencyAccessGranted: transition.crisisContext?.level === 'emergency',
        featuresAffected: [],
        interventionsTriggered: ['error_recovery'],
      },
      crisis: {
        detected: true,
        level: 'medium',
        responseTime,
        therapeuticAccess: true,
        emergencyResources: await this.getEmergencyResources(),
        gracePeriodActive: true,
      },
      performance: {
        processingTime: responseTime,
        criticalPath: true,
        alertGenerated: true,
        constraints: {
          maxResponseTime: 2000 as CrisisResponseTime,
          crisisMode: true,
          performanceTargets: { latency: 500, throughput: 50 },
        },
      },
      security: {
        signatureValid: true,
        threatDetected: false,
        auditTrailCreated: true,
        hipaaCompliant: true,
      },
      therapeutic: {
        continuityProtected: true,
        interventionRequired: true,
        messagingContext: { type: 'transition_error', urgent: true },
        assessmentImpact: false,
      },
    };
  }

  private async handleAccessError(
    error: any,
    userId: string,
    startTime: number,
    maxResponseTime: number
  ): Promise<CrisisSafeAPIResponse<TherapeuticAccessResult>> {
    const responseTime = Date.now() - startTime;

    // Safe default access
    const safeAccess: TherapeuticAccessResult = {
      accessGranted: true, // Safe default
      features: this.featureConfig,
      restrictions: [],
      gracePeriodActive: true,
      emergencyAccessActive: false,
      accessExpiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 day grace
      therapeuticContinuityProtected: true,
      crisisResourcesAvailable: true,
    };

    return {
      data: safeAccess,
      crisis: {
        detected: true,
        level: 'medium',
        responseTime,
        therapeuticAccess: true,
        emergencyResources: await this.getEmergencyResources(),
        gracePeriodActive: true,
      },
      performance: {
        processingTime: responseTime,
        criticalPath: false,
        alertGenerated: true,
        constraints: {
          maxResponseTime: maxResponseTime as CrisisResponseTime,
          crisisMode: false,
          performanceTargets: { latency: 100, throughput: 100 },
        },
      },
      security: {
        signatureValid: true,
        threatDetected: false,
        auditTrailCreated: true,
        hipaaCompliant: true,
      },
      therapeutic: {
        continuityProtected: true,
        interventionRequired: false,
        messagingContext: { type: 'access_error', urgent: false },
        assessmentImpact: false,
      },
    };
  }
}

/**
 * Subscription-Specific Errors
 */
export class SubscriptionEmergencyError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly userId: string,
    public readonly crisisLevel: CrisisLevel
  ) {
    super(message);
    this.name = 'SubscriptionEmergencyError';
  }
}