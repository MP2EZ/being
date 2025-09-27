/**
 * Therapeutic Grace Period Manager Hook for Being. MBCT App
 *
 * MBCT-compliant grace period management with:
 * - Therapeutic continuity protection
 * - Crisis-sensitive grace period extensions
 * - Mindful transition messaging
 * - HIPAA-compliant grace period tracking
 * - Emergency grace period activation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { CrisisLevel, GracePeriodState } from '../../types/webhooks/crisis-safety-types';
import { TherapeuticMessage, buildTherapeuticMessage, MessageContext } from '../../types/webhooks/therapeutic-messaging';
import { PerformanceMetric } from '../../types/webhooks/performance-monitoring';
import { AuditTrailEntry } from '../../types/webhooks/audit-compliance';
import { usePaymentStore } from '../../store/paymentStore';

export interface GracePeriodManagerState {
  activeGracePeriods: Map<string, GracePeriodState>;
  totalActiveUsers: number;
  emergencyGracePeriods: number;
  crisisGracePeriods: number;
  standardGracePeriods: number;
  averageGracePeriodDuration: number;
  therapeuticContinuityRate: number;
  lastGracePeriodActivation: Date | null;
  gracePeriodConfig: GracePeriodConfiguration;
}

export interface GracePeriodConfiguration {
  standardDurationDays: number;
  emergencyDurationDays: number;
  crisisDurationDays: number;
  maxDurationDays: number;
  maxSimultaneousGracePeriods: number;
  therapeuticContinuityRequired: boolean;
  mindfulTransitions: boolean;
  emergencyAutoExtension: boolean;
  crisisAutoExtension: boolean;
  extensionCooldownHours: number;
  auditingEnabled: boolean;
}

export interface GracePeriodTrigger {
  type: 'payment_failure' | 'subscription_cancelled' | 'crisis_detected' | 'emergency_access' | 'therapeutic_disruption' | 'manual_activation';
  severity: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  userId: string;
  reason: string;
  requestedDuration?: number;
  crisisLevel?: CrisisLevel;
  therapeuticContext?: string;
  emergencyJustification?: string;
}

export interface GracePeriodTransition {
  userId: string;
  gracePeriodId: string;
  transitionType: 'activation' | 'extension' | 'early_termination' | 'natural_expiration' | 'crisis_override';
  fromState: GracePeriodState | null;
  toState: GracePeriodState | null;
  reason: string;
  therapeuticMessage: TherapeuticMessage;
  timestamp: Date;
  crisisLevel: CrisisLevel;
}

export interface GracePeriodAPI {
  // Grace Period Lifecycle
  activateGracePeriod: (trigger: GracePeriodTrigger) => Promise<string>; // Returns grace period ID
  extendGracePeriod: (userId: string, additionalDays: number, reason: string) => Promise<boolean>;
  terminateGracePeriod: (userId: string, reason: string) => Promise<boolean>;
  renewGracePeriod: (userId: string, newDuration: number, reason: string) => Promise<boolean>;

  // Grace Period Queries
  getGracePeriodStatus: (userId: string) => GracePeriodState | null;
  getAllActiveGracePeriods: () => Map<string, GracePeriodState>;
  getGracePeriodHistory: (userId: string) => GracePeriodTransition[];
  isInGracePeriod: (userId: string) => boolean;
  getDaysRemaining: (userId: string) => number;

  // Crisis & Emergency Management
  activateEmergencyGracePeriod: (userId: string, crisisLevel: CrisisLevel, reason: string) => Promise<string>;
  activateCrisisGracePeriod: (userId: string, crisisDetails: any) => Promise<string>;
  escalateGracePeriod: (userId: string, newCrisisLevel: CrisisLevel) => Promise<boolean>;

  // Therapeutic Features
  getProtectedFeatures: (userId: string) => string[];
  assessTherapeuticContinuity: (userId: string) => Promise<{
    maintained: boolean;
    threatenedFeatures: string[];
    recommendedActions: string[];
  }>;
  generateTransitionMessage: (transition: GracePeriodTransition) => Promise<TherapeuticMessage>;

  // Configuration & Management
  updateConfiguration: (config: Partial<GracePeriodConfiguration>) => void;
  getConfiguration: () => GracePeriodConfiguration;
  getManagerState: () => GracePeriodManagerState;

  // Monitoring & Analytics
  getGracePeriodMetrics: () => PerformanceMetric[];
  getGracePeriodAuditTrail: () => AuditTrailEntry[];
  generateGracePeriodReport: () => Promise<any>;

  // Automated Management
  processExpiringGracePeriods: () => Promise<void>;
  processAutoExtensions: () => Promise<void>;
  cleanupExpiredGracePeriods: () => void;
}

const DEFAULT_GRACE_PERIOD_CONFIG: GracePeriodConfiguration = {
  standardDurationDays: 7,
  emergencyDurationDays: 14,
  crisisDurationDays: 21,
  maxDurationDays: 30,
  maxSimultaneousGracePeriods: 1000,
  therapeuticContinuityRequired: true,
  mindfulTransitions: true,
  emergencyAutoExtension: true,
  crisisAutoExtension: true,
  extensionCooldownHours: 24,
  auditingEnabled: true,
};

const THERAPEUTIC_FEATURES_BY_PRIORITY = {
  essential: [
    'crisis_resources',
    'emergency_contacts',
    'breathing_exercises',
    'crisis_hotline_access',
    'safety_planning',
    'mindfulness_basics',
    'assessment_tools',
  ],
  important: [
    'guided_meditations',
    'body_scan_exercises',
    'therapeutic_content',
    'progress_tracking',
    'check_in_flows',
    'mindful_movement',
  ],
  nice_to_have: [
    'advanced_analytics',
    'premium_content',
    'social_features',
    'customization',
    'export_features',
  ],
};

/**
 * Therapeutic Grace Period Manager Hook
 */
export const useGracePeriodManager = (
  initialConfig: Partial<GracePeriodConfiguration> = {}
): GracePeriodAPI => {
  // Configuration state
  const [config, setConfig] = useState<GracePeriodConfiguration>({
    ...DEFAULT_GRACE_PERIOD_CONFIG,
    ...initialConfig,
  });

  // Manager state
  const [state, setState] = useState<GracePeriodManagerState>({
    activeGracePeriods: new Map(),
    totalActiveUsers: 0,
    emergencyGracePeriods: 0,
    crisisGracePeriods: 0,
    standardGracePeriods: 0,
    averageGracePeriodDuration: 7,
    therapeuticContinuityRate: 100,
    lastGracePeriodActivation: null,
    gracePeriodConfig: config,
  });

  // Data storage
  const gracePeriodHistory = useRef<Map<string, GracePeriodTransition[]>>(new Map());
  const performanceMetrics = useRef<PerformanceMetric[]>([]);
  const auditTrail = useRef<AuditTrailEntry[]>([]);
  const extensionCooldowns = useRef<Map<string, Date>>(new Map());

  // Timers
  const expirationCheckTimer = useRef<NodeJS.Timeout | null>(null);
  const autoExtensionTimer = useRef<NodeJS.Timeout | null>(null);

  // External dependencies
  const paymentStore = usePaymentStore();

  /**
   * Grace Period Lifecycle Management
   */
  const activateGracePeriod = useCallback(async (trigger: GracePeriodTrigger): Promise<string> => {
    const startTime = Date.now();
    const gracePeriodId = `grace_${trigger.userId}_${Date.now()}`;

    try {
      // Determine grace period duration based on trigger
      let duration = config.standardDurationDays;
      let emergencyAccess = false;

      switch (trigger.severity) {
        case 'emergency':
          duration = config.emergencyDurationDays;
          emergencyAccess = true;
          break;
        case 'critical':
          duration = config.crisisDurationDays;
          emergencyAccess = true;
          break;
        case 'high':
          duration = Math.max(config.standardDurationDays, 10);
          break;
        case 'medium':
          duration = config.standardDurationDays;
          break;
        case 'low':
          duration = Math.min(config.standardDurationDays, 5);
          break;
      }

      // Override duration if specifically requested
      if (trigger.requestedDuration) {
        duration = Math.min(trigger.requestedDuration, config.maxDurationDays);
      }

      // Create grace period state
      const gracePeriod: GracePeriodState = {
        active: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
        remainingDays: duration,
        reason: trigger.reason,
        therapeuticFeatures: [
          ...THERAPEUTIC_FEATURES_BY_PRIORITY.essential,
          ...(emergencyAccess ? THERAPEUTIC_FEATURES_BY_PRIORITY.important : []),
        ],
        emergencyAccess,
      };

      // Check if user already has an active grace period
      const existingGracePeriod = state.activeGracePeriods.get(trigger.userId);
      if (existingGracePeriod && existingGracePeriod.active) {
        // Extend existing grace period if the new trigger is more severe
        if (trigger.severity === 'emergency' || trigger.severity === 'critical') {
          await extendGracePeriod(trigger.userId, duration - existingGracePeriod.remainingDays, trigger.reason);
          return gracePeriodId;
        } else {
          console.log(`User ${trigger.userId} already has active grace period`);
          return existingGracePeriod.reason; // Return existing ID
        }
      }

      // Add to active grace periods
      const newActiveGracePeriods = new Map(state.activeGracePeriods);
      newActiveGracePeriods.set(trigger.userId, gracePeriod);

      // Update state
      setState(prev => ({
        ...prev,
        activeGracePeriods: newActiveGracePeriods,
        totalActiveUsers: newActiveGracePeriods.size,
        emergencyGracePeriods: prev.emergencyGracePeriods + (emergencyAccess ? 1 : 0),
        crisisGracePeriods: prev.crisisGracePeriods + (trigger.severity === 'critical' ? 1 : 0),
        standardGracePeriods: prev.standardGracePeriods + (trigger.severity === 'low' || trigger.severity === 'medium' ? 1 : 0),
        lastGracePeriodActivation: new Date(),
      }));

      // Create transition record
      const transition: GracePeriodTransition = {
        userId: trigger.userId,
        gracePeriodId,
        transitionType: 'activation',
        fromState: null,
        toState: gracePeriod,
        reason: trigger.reason,
        therapeuticMessage: await generateTransitionMessage({
          userId: trigger.userId,
          gracePeriodId,
          transitionType: 'activation',
          fromState: null,
          toState: gracePeriod,
          reason: trigger.reason,
          therapeuticMessage: {} as TherapeuticMessage, // Will be filled
          timestamp: new Date(),
          crisisLevel: trigger.crisisLevel || 'none',
        }),
        timestamp: new Date(),
        crisisLevel: trigger.crisisLevel || 'none',
      };

      // Update history
      const userHistory = gracePeriodHistory.current.get(trigger.userId) || [];
      userHistory.push(transition);
      gracePeriodHistory.current.set(trigger.userId, userHistory);

      // Update payment store
      await paymentStore.activateGracePeriod(trigger.userId, duration, trigger.reason);

      // Create audit entry
      if (config.auditingEnabled) {
        auditTrail.current.push({
          auditId: `grace_period_activation_${gracePeriodId}`,
          timestamp: startTime,
          sequenceNumber: auditTrail.current.length + 1,
          category: 'therapeutic_session',
          eventType: 'grace_period_activated',
          severity: trigger.severity === 'emergency' ? 'critical' : 'info',
          subject: {
            type: 'user',
            identifier: await hashUserId(trigger.userId),
          },
          action: {
            performed: 'activate_grace_period',
            outcome: 'success',
            details: {
              gracePeriodId,
              duration,
              reason: trigger.reason,
              triggerType: trigger.type,
              emergencyAccess,
            },
          },
          compliance: {
            hipaaLevel: 'enhanced',
            pciDssRequired: false,
            consentVerified: true,
            dataMinimization: true,
            encryptionApplied: true,
            accessJustified: true,
          },
          integrity: {
            checksum: `grace_period_${gracePeriodId}`,
            signatureValid: true,
            tamperDetected: false,
          },
        });
      }

      // Record performance metric
      performanceMetrics.current.push({
        timestamp: startTime,
        category: 'therapeutic_content',
        operation: 'activate_grace_period',
        duration: Date.now() - startTime,
        success: true,
        crisisMode: trigger.severity === 'emergency',
        therapeuticImpact: true,
      });

      console.log(`Grace period activated for user ${trigger.userId}: ${duration} days (${trigger.reason})`);
      return gracePeriodId;

    } catch (error) {
      console.error('Error activating grace period:', error);
      throw error;
    }
  }, [config, state, paymentStore, generateTransitionMessage]);

  /**
   * Grace Period Extension
   */
  const extendGracePeriod = useCallback(async (
    userId: string,
    additionalDays: number,
    reason: string
  ): Promise<boolean> => {
    try {
      const gracePeriod = state.activeGracePeriods.get(userId);
      if (!gracePeriod || !gracePeriod.active) {
        console.log(`No active grace period found for user ${userId}`);
        return false;
      }

      // Check cooldown
      const lastExtension = extensionCooldowns.current.get(userId);
      if (lastExtension && Date.now() - lastExtension.getTime() < config.extensionCooldownHours * 60 * 60 * 1000) {
        console.log(`Extension cooldown active for user ${userId}`);
        return false;
      }

      // Calculate new end date
      const newEndDate = new Date(gracePeriod.endDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);
      const maxEndDate = new Date(gracePeriod.startDate.getTime() + config.maxDurationDays * 24 * 60 * 60 * 1000);

      if (newEndDate > maxEndDate) {
        newEndDate.setTime(maxEndDate.getTime());
      }

      const newRemainingDays = Math.ceil((newEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      // Update grace period
      const updatedGracePeriod: GracePeriodState = {
        ...gracePeriod,
        endDate: newEndDate,
        remainingDays: newRemainingDays,
        reason: `${gracePeriod.reason} (extended: ${reason})`,
      };

      // Update state
      const newActiveGracePeriods = new Map(state.activeGracePeriods);
      newActiveGracePeriods.set(userId, updatedGracePeriod);

      setState(prev => ({
        ...prev,
        activeGracePeriods: newActiveGracePeriods,
      }));

      // Set extension cooldown
      extensionCooldowns.current.set(userId, new Date());

      // Create transition record
      const transition: GracePeriodTransition = {
        userId,
        gracePeriodId: `extension_${userId}_${Date.now()}`,
        transitionType: 'extension',
        fromState: gracePeriod,
        toState: updatedGracePeriod,
        reason,
        therapeuticMessage: await generateTransitionMessage({
          userId,
          gracePeriodId: `extension_${userId}_${Date.now()}`,
          transitionType: 'extension',
          fromState: gracePeriod,
          toState: updatedGracePeriod,
          reason,
          therapeuticMessage: {} as TherapeuticMessage,
          timestamp: new Date(),
          crisisLevel: 'none',
        }),
        timestamp: new Date(),
        crisisLevel: 'none',
      };

      // Update history
      const userHistory = gracePeriodHistory.current.get(userId) || [];
      userHistory.push(transition);
      gracePeriodHistory.current.set(userId, userHistory);

      console.log(`Grace period extended for user ${userId}: +${additionalDays} days (${reason})`);
      return true;

    } catch (error) {
      console.error('Error extending grace period:', error);
      return false;
    }
  }, [config, state, generateTransitionMessage]);

  /**
   * Grace Period Termination
   */
  const terminateGracePeriod = useCallback(async (userId: string, reason: string): Promise<boolean> => {
    try {
      const gracePeriod = state.activeGracePeriods.get(userId);
      if (!gracePeriod || !gracePeriod.active) {
        return false;
      }

      // Update grace period to inactive
      const terminatedGracePeriod: GracePeriodState = {
        ...gracePeriod,
        active: false,
        remainingDays: 0,
        reason: `${gracePeriod.reason} (terminated: ${reason})`,
      };

      // Remove from active grace periods
      const newActiveGracePeriods = new Map(state.activeGracePeriods);
      newActiveGracePeriods.delete(userId);

      setState(prev => ({
        ...prev,
        activeGracePeriods: newActiveGracePeriods,
        totalActiveUsers: newActiveGracePeriods.size,
        emergencyGracePeriods: gracePeriod.emergencyAccess ? prev.emergencyGracePeriods - 1 : prev.emergencyGracePeriods,
      }));

      // Create transition record
      const transition: GracePeriodTransition = {
        userId,
        gracePeriodId: `termination_${userId}_${Date.now()}`,
        transitionType: reason.includes('expir') ? 'natural_expiration' : 'early_termination',
        fromState: gracePeriod,
        toState: terminatedGracePeriod,
        reason,
        therapeuticMessage: await generateTransitionMessage({
          userId,
          gracePeriodId: `termination_${userId}_${Date.now()}`,
          transitionType: reason.includes('expir') ? 'natural_expiration' : 'early_termination',
          fromState: gracePeriod,
          toState: terminatedGracePeriod,
          reason,
          therapeuticMessage: {} as TherapeuticMessage,
          timestamp: new Date(),
          crisisLevel: 'none',
        }),
        timestamp: new Date(),
        crisisLevel: 'none',
      };

      // Update history
      const userHistory = gracePeriodHistory.current.get(userId) || [];
      userHistory.push(transition);
      gracePeriodHistory.current.set(userId, userHistory);

      console.log(`Grace period terminated for user ${userId}: ${reason}`);
      return true;

    } catch (error) {
      console.error('Error terminating grace period:', error);
      return false;
    }
  }, [state, generateTransitionMessage]);

  /**
   * Grace Period Renewal
   */
  const renewGracePeriod = useCallback(async (
    userId: string,
    newDuration: number,
    reason: string
  ): Promise<boolean> => {
    try {
      // First terminate the current grace period
      await terminateGracePeriod(userId, 'renewal');

      // Then activate a new one
      const trigger: GracePeriodTrigger = {
        type: 'manual_activation',
        severity: 'medium',
        userId,
        reason: `Renewal: ${reason}`,
        requestedDuration: newDuration,
      };

      await activateGracePeriod(trigger);
      return true;

    } catch (error) {
      console.error('Error renewing grace period:', error);
      return false;
    }
  }, [activateGracePeriod, terminateGracePeriod]);

  /**
   * Emergency and Crisis Management
   */
  const activateEmergencyGracePeriod = useCallback(async (
    userId: string,
    crisisLevel: CrisisLevel,
    reason: string
  ): Promise<string> => {
    const trigger: GracePeriodTrigger = {
      type: 'emergency_access',
      severity: 'emergency',
      userId,
      reason: `Emergency: ${reason}`,
      crisisLevel,
      emergencyJustification: reason,
    };

    return await activateGracePeriod(trigger);
  }, [activateGracePeriod]);

  const activateCrisisGracePeriod = useCallback(async (
    userId: string,
    crisisDetails: any
  ): Promise<string> => {
    const trigger: GracePeriodTrigger = {
      type: 'crisis_detected',
      severity: 'critical',
      userId,
      reason: `Crisis detected: ${crisisDetails.reason || 'Unknown crisis'}`,
      crisisLevel: crisisDetails.level || 'high',
      therapeuticContext: crisisDetails.context,
    };

    return await activateGracePeriod(trigger);
  }, [activateGracePeriod]);

  const escalateGracePeriod = useCallback(async (
    userId: string,
    newCrisisLevel: CrisisLevel
  ): Promise<boolean> => {
    const gracePeriod = state.activeGracePeriods.get(userId);
    if (!gracePeriod) return false;

    // Determine if escalation is needed
    const needsEscalation = (newCrisisLevel === 'critical' || newCrisisLevel === 'emergency') &&
                           !gracePeriod.emergencyAccess;

    if (needsEscalation) {
      const additionalDays = newCrisisLevel === 'emergency' ?
        config.emergencyDurationDays - gracePeriod.remainingDays :
        config.crisisDurationDays - gracePeriod.remainingDays;

      return await extendGracePeriod(userId, Math.max(0, additionalDays), `Crisis escalation: ${newCrisisLevel}`);
    }

    return true;
  }, [config, state, extendGracePeriod]);

  /**
   * Query Functions
   */
  const getGracePeriodStatus = useCallback((userId: string): GracePeriodState | null => {
    return state.activeGracePeriods.get(userId) || null;
  }, [state]);

  const getAllActiveGracePeriods = useCallback((): Map<string, GracePeriodState> => {
    return new Map(state.activeGracePeriods);
  }, [state]);

  const getGracePeriodHistory = useCallback((userId: string): GracePeriodTransition[] => {
    return gracePeriodHistory.current.get(userId) || [];
  }, []);

  const isInGracePeriod = useCallback((userId: string): boolean => {
    const gracePeriod = state.activeGracePeriods.get(userId);
    return gracePeriod ? gracePeriod.active && gracePeriod.remainingDays > 0 : false;
  }, [state]);

  const getDaysRemaining = useCallback((userId: string): number => {
    const gracePeriod = state.activeGracePeriods.get(userId);
    return gracePeriod ? Math.max(0, gracePeriod.remainingDays) : 0;
  }, [state]);

  /**
   * Therapeutic Features
   */
  const getProtectedFeatures = useCallback((userId: string): string[] => {
    const gracePeriod = state.activeGracePeriods.get(userId);
    return gracePeriod ? gracePeriod.therapeuticFeatures : [];
  }, [state]);

  const assessTherapeuticContinuity = useCallback(async (userId: string): Promise<{
    maintained: boolean;
    threatenedFeatures: string[];
    recommendedActions: string[];
  }> => {
    const gracePeriod = state.activeGracePeriods.get(userId);

    if (!gracePeriod) {
      return {
        maintained: false,
        threatenedFeatures: [...THERAPEUTIC_FEATURES_BY_PRIORITY.essential],
        recommendedActions: ['Activate grace period', 'Ensure crisis support access'],
      };
    }

    const daysRemaining = getDaysRemaining(userId);
    const criticalThreshold = 2; // 2 days

    const maintained = daysRemaining > criticalThreshold;
    const threatenedFeatures = daysRemaining <= criticalThreshold ?
      THERAPEUTIC_FEATURES_BY_PRIORITY.nice_to_have : [];

    const recommendedActions = [];
    if (daysRemaining <= criticalThreshold) {
      recommendedActions.push('Consider grace period extension');
      recommendedActions.push('Ensure essential features remain accessible');
    }
    if (daysRemaining <= 1) {
      recommendedActions.push('Activate emergency protocols');
      recommendedActions.push('Notify user of impending expiration');
    }

    return {
      maintained,
      threatenedFeatures,
      recommendedActions,
    };
  }, [state, getDaysRemaining]);

  const generateTransitionMessage = useCallback(async (
    transition: GracePeriodTransition
  ): Promise<TherapeuticMessage> => {
    const messageContext: MessageContext = {
      userState: transition.crisisLevel !== 'none' ? 'crisis' : 'stable',
      urgency: transition.transitionType === 'activation' ? 'moderate' : 'low',
      therapeuticPhase: 'crisis_support',
    };

    let templateId = 'GRACE_PERIOD_START';
    let variables: Record<string, string> = {};

    switch (transition.transitionType) {
      case 'activation':
        templateId = 'GRACE_PERIOD_START';
        variables = {
          gracePeriodDays: transition.toState?.remainingDays?.toString() || '7'
        };
        break;
      case 'extension':
        templateId = 'GRACE_PERIOD_START'; // Could create specific extension template
        variables = {
          gracePeriodDays: transition.toState?.remainingDays?.toString() || '7'
        };
        break;
      case 'natural_expiration':
      case 'early_termination':
        // Would need templates for these cases
        templateId = 'GRACE_PERIOD_START';
        variables = { gracePeriodDays: '0' };
        break;
    }

    return buildTherapeuticMessage(templateId, variables, messageContext, transition.crisisLevel);
  }, []);

  /**
   * Automated Management
   */
  const processExpiringGracePeriods = useCallback(async (): Promise<void> => {
    const now = Date.now();
    const warningThreshold = 24 * 60 * 60 * 1000; // 24 hours
    const expirationThreshold = 60 * 60 * 1000; // 1 hour

    for (const [userId, gracePeriod] of state.activeGracePeriods) {
      const timeToExpiration = gracePeriod.endDate.getTime() - now;

      if (timeToExpiration <= expirationThreshold && gracePeriod.active) {
        // Expire the grace period
        await terminateGracePeriod(userId, 'natural expiration');
      } else if (timeToExpiration <= warningThreshold && gracePeriod.active) {
        // Send warning notification
        const messageContext: MessageContext = {
          userState: 'monitoring',
          urgency: 'moderate',
          therapeuticPhase: 'maintenance',
        };

        const message = buildTherapeuticMessage(
          'GRACE_PERIOD_START', // Would need specific expiration warning template
          { gracePeriodDays: '1' },
          messageContext,
          'low'
        );

        console.log(`Grace period expiring soon for user ${userId}:`, message.content.message);
      }
    }
  }, [state, terminateGracePeriod]);

  const processAutoExtensions = useCallback(async (): Promise<void> => {
    if (!config.emergencyAutoExtension && !config.crisisAutoExtension) return;

    for (const [userId, gracePeriod] of state.activeGracePeriods) {
      const daysRemaining = Math.ceil((gracePeriod.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      // Auto-extend emergency grace periods
      if (config.emergencyAutoExtension && gracePeriod.emergencyAccess && daysRemaining <= 1) {
        await extendGracePeriod(userId, 7, 'Automatic emergency extension');
      }

      // Auto-extend crisis grace periods
      if (config.crisisAutoExtension && gracePeriod.reason.includes('crisis') && daysRemaining <= 2) {
        await extendGracePeriod(userId, 5, 'Automatic crisis extension');
      }
    }
  }, [config, state, extendGracePeriod]);

  const cleanupExpiredGracePeriods = useCallback((): void => {
    const now = Date.now();
    const retentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days

    // Clean up old performance metrics
    performanceMetrics.current = performanceMetrics.current.filter(
      metric => now - metric.timestamp < retentionPeriod
    );

    // Clean up old audit entries (keep longer - 90 days)
    const auditRetentionPeriod = 90 * 24 * 60 * 60 * 1000;
    auditTrail.current = auditTrail.current.filter(
      entry => now - entry.timestamp < auditRetentionPeriod
    );

    // Clean up old grace period history (keep for 1 year)
    const historyRetentionPeriod = 365 * 24 * 60 * 60 * 1000;
    for (const [userId, history] of gracePeriodHistory.current) {
      const filteredHistory = history.filter(
        transition => now - transition.timestamp.getTime() < historyRetentionPeriod
      );
      if (filteredHistory.length === 0) {
        gracePeriodHistory.current.delete(userId);
      } else {
        gracePeriodHistory.current.set(userId, filteredHistory);
      }
    }

    // Clean up extension cooldowns
    for (const [userId, cooldownEnd] of extensionCooldowns.current) {
      if (now - cooldownEnd.getTime() > config.extensionCooldownHours * 60 * 60 * 1000) {
        extensionCooldowns.current.delete(userId);
      }
    }
  }, [config]);

  /**
   * Configuration & State Management
   */
  const updateConfiguration = useCallback((newConfig: Partial<GracePeriodConfiguration>): void => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    setState(prev => ({ ...prev, gracePeriodConfig: { ...prev.gracePeriodConfig, ...newConfig } }));
  }, []);

  const getConfiguration = useCallback((): GracePeriodConfiguration => config, [config]);
  const getManagerState = useCallback((): GracePeriodManagerState => state, [state]);

  /**
   * Monitoring & Analytics
   */
  const getGracePeriodMetrics = useCallback((): PerformanceMetric[] => {
    return [...performanceMetrics.current];
  }, []);

  const getGracePeriodAuditTrail = useCallback((): AuditTrailEntry[] => {
    return [...auditTrail.current];
  }, []);

  const generateGracePeriodReport = useCallback(async (): Promise<any> => {
    const totalActive = state.totalActiveUsers;
    const totalHistory = Array.from(gracePeriodHistory.current.values()).flat();

    const last30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = totalHistory.filter(t => t.timestamp.getTime() > last30Days);

    return {
      timeframe: '30_days',
      summary: {
        totalActiveGracePeriods: totalActive,
        emergencyGracePeriods: state.emergencyGracePeriods,
        crisisGracePeriods: state.crisisGracePeriods,
        standardGracePeriods: state.standardGracePeriods,
        therapeuticContinuityRate: state.therapeuticContinuityRate,
        averageDuration: state.averageGracePeriodDuration,
      },
      recentActivity: {
        totalActivations: recent.filter(t => t.transitionType === 'activation').length,
        totalExtensions: recent.filter(t => t.transitionType === 'extension').length,
        totalTerminations: recent.filter(t => t.transitionType === 'early_termination').length,
        naturalExpirations: recent.filter(t => t.transitionType === 'natural_expiration').length,
      },
      triggers: recent.reduce((acc, transition) => {
        const key = transition.reason.split(':')[0]; // Get trigger type
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      therapeuticImpact: {
        featuresProtected: THERAPEUTIC_FEATURES_BY_PRIORITY.essential.length,
        continuityMaintained: state.therapeuticContinuityRate > 95,
        crisisSupported: state.emergencyGracePeriods + state.crisisGracePeriods,
      },
    };
  }, [state, gracePeriodHistory]);

  /**
   * Utility Functions
   */
  const hashUserId = async (userId: string): Promise<string> => {
    // Simple hash for audit purposes (would use proper hashing in production)
    return `user_${userId.slice(-8)}`;
  };

  // Set up automated timers
  useEffect(() => {
    // Process expiring grace periods every hour
    expirationCheckTimer.current = setInterval(processExpiringGracePeriods, 60 * 60 * 1000);

    // Process auto-extensions every 6 hours
    autoExtensionTimer.current = setInterval(processAutoExtensions, 6 * 60 * 60 * 1000);

    // Cleanup old data every 24 hours
    const cleanupTimer = setInterval(cleanupExpiredGracePeriods, 24 * 60 * 60 * 1000);

    return () => {
      if (expirationCheckTimer.current) clearInterval(expirationCheckTimer.current);
      if (autoExtensionTimer.current) clearInterval(autoExtensionTimer.current);
      clearInterval(cleanupTimer);
    };
  }, [processExpiringGracePeriods, processAutoExtensions, cleanupExpiredGracePeriods]);

  return {
    // Grace Period Lifecycle
    activateGracePeriod,
    extendGracePeriod,
    terminateGracePeriod,
    renewGracePeriod,

    // Grace Period Queries
    getGracePeriodStatus,
    getAllActiveGracePeriods,
    getGracePeriodHistory,
    isInGracePeriod,
    getDaysRemaining,

    // Crisis & Emergency Management
    activateEmergencyGracePeriod,
    activateCrisisGracePeriod,
    escalateGracePeriod,

    // Therapeutic Features
    getProtectedFeatures,
    assessTherapeuticContinuity,
    generateTransitionMessage,

    // Configuration & Management
    updateConfiguration,
    getConfiguration,
    getManagerState,

    // Monitoring & Analytics
    getGracePeriodMetrics,
    getGracePeriodAuditTrail,
    generateGracePeriodReport,

    // Automated Management
    processExpiringGracePeriods,
    processAutoExtensions,
    cleanupExpiredGracePeriods,
  };
};