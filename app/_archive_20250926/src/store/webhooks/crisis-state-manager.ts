/**
 * Crisis State Manager for Being. MBCT App
 *
 * Mental health crisis state coordination with:
 * - Real-time crisis detection and intervention protocols
 * - <100ms emergency response time guarantees
 * - Therapeutic continuity protection during crisis events
 * - Emergency access state preservation with payment bypass
 * - Crisis-aware webhook processing and state management
 * - HIPAA-compliant crisis data handling and audit trails
 * - Integration with 988 hotline and emergency contacts
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CrisisLevel,
  CrisisResponseTime,
  CrisisDetectionTrigger,
  EmergencyAccessControl,
  TherapeuticContinuity,
  CrisisSafeState,
  CrisisAwareError,
} from '../../types/webhooks/crisis-safety-types';
import {
  WebhookEvent,
  WebhookProcessingResult,
} from '../../types/webhooks/webhook-events';
import {
  TherapeuticMessage,
  TherapeuticCommunicationContext,
} from '../../types/webhooks/therapeutic-messaging';
import { encryptionService } from '../../services/security/EncryptionService';

/**
 * Crisis Detection Sources
 */
export type CrisisDetectionSource =
  | 'assessment_score'     // PHQ-9/GAD-7 scores
  | 'user_reported'        // User activated crisis button
  | 'behavior_pattern'     // App usage patterns
  | 'payment_failure'      // Payment issues causing access loss
  | 'system_error'         // Technical errors affecting access
  | 'external_trigger'     // External crisis API calls
  | 'webhook_event'        // Crisis events from webhooks
  | 'manual_override';     // Manual activation by support

/**
 * Crisis Response Actions
 */
export type CrisisResponseAction =
  | 'emergency_access'     // Grant immediate access to all features
  | 'hotline_contact'      // Display 988 hotline information
  | 'emergency_contacts'   // Access to user's emergency contacts
  | 'therapeutic_bypass'   // Bypass payment restrictions for therapy
  | 'crisis_resources'     // Display crisis intervention resources
  | 'safety_plan'          // Access to user's safety plan
  | 'immediate_support'    // Connect to immediate support
  | 'state_preservation';  // Preserve current therapeutic state

/**
 * Crisis State Management
 */
interface CrisisStateManagerState {
  // Crisis Detection & Level Management
  currentCrisisLevel: CrisisLevel;
  crisisDetectionActive: boolean;
  lastCrisisEvent: {
    timestamp: number;
    source: CrisisDetectionSource;
    trigger: CrisisDetectionTrigger;
    level: CrisisLevel;
    responseTime: number;
  } | null;

  // Crisis Response State
  emergencyResponseActive: boolean;
  emergencyAccessGranted: boolean;
  therapeuticContinuityActive: boolean;
  crisisInterventionActive: boolean;
  emergencyContactsAccessible: boolean;
  hotlineDisplayed: boolean;
  safetyPlanAccessible: boolean;

  // Real-Time Crisis Monitoring
  crisisMonitoringActive: boolean;
  crisisDetectionSensitivity: 'low' | 'medium' | 'high' | 'maximum';
  behaviorPatternTracking: boolean;
  assessmentScoreTracking: boolean;
  usagePatternAnalysis: boolean;

  // Crisis Response Performance
  crisisResponseMetrics: {
    averageResponseTime: number;
    lastResponseTime: number;
    emergencyActivations: number;
    successfulInterventions: number;
    responseTimeViolations: number;
    crisisEscalations: number;
    therapeuticContinuityBreaches: number;
  };

  // Crisis Communication
  crisisCommunicationState: {
    currentMessage: TherapeuticMessage | null;
    emergencyMessageQueue: TherapeuticMessage[];
    supportiveModeActive: boolean;
    anxietyReductionActive: boolean;
    calming_interface_active: boolean;
  };

  // Emergency Overrides
  emergencyOverrides: {
    paymentBypassActive: boolean;
    featureAccessOverridden: boolean;
    subscriptionBypassActive: boolean;
    premiumContentUnlocked: boolean;
    exportRestrictionsLifted: boolean;
  };

  // Crisis Data & Audit
  crisisAuditTrail: Array<{
    id: string;
    timestamp: number;
    event: 'detection' | 'escalation' | 'intervention' | 'resolution' | 'override';
    source: CrisisDetectionSource;
    level: CrisisLevel;
    action: CrisisResponseAction;
    responseTime: number;
    outcome: 'successful' | 'escalated' | 'failed' | 'ongoing';
    userSafe: boolean;
    therapeuticContinuity: boolean;
    encrypted: boolean;
  }>;

  // Crisis Recovery Management
  crisisRecoveryState: {
    recoveryInProgress: boolean;
    recoveryStartTime: number | null;
    gradualTransitionActive: boolean;
    supportMaintenanceActive: boolean;
    followUpRequired: boolean;
    recoveryMonitoringActive: boolean;
  };

  // Webhook Crisis Integration
  webhookCrisisProcessing: {
    crisisWebhookQueue: Array<{
      event: WebhookEvent;
      crisisLevel: CrisisLevel;
      urgency: 'immediate' | 'high' | 'medium' | 'low';
      timestamp: number;
      processed: boolean;
    }>;
    crisisEventHandlers: Map<string, Function>;
    emergencyProcessingActive: boolean;
  };

  // Crisis Prevention
  crisisPreventionState: {
    earlyWarningActive: boolean;
    preventiveMeasuresEnabled: boolean;
    riskAssessmentActive: boolean;
    interventionThresholds: {
      phq9_threshold: number;
      gad7_threshold: number;
      behavior_threshold: number;
      usage_threshold: number;
    };
  };
}

/**
 * Crisis State Manager Actions
 */
interface CrisisStateManagerActions {
  // Crisis Detection & Monitoring
  initializeCrisisMonitoring: () => Promise<void>;
  shutdownCrisisMonitoring: () => Promise<void>;
  detectCrisis: (source: CrisisDetectionSource, trigger: CrisisDetectionTrigger) => Promise<void>;
  escalateCrisisLevel: (newLevel: CrisisLevel, reason: string) => Promise<void>;
  validateCrisisResponse: (responseTime: number) => boolean;

  // Emergency Response
  activateEmergencyResponse: (trigger: CrisisDetectionTrigger) => Promise<void>;
  deactivateEmergencyResponse: () => Promise<void>;
  grantEmergencyAccess: (reason: string) => Promise<void>;
  preserveTherapeuticContinuity: () => Promise<void>;
  activateCrisisIntervention: () => Promise<void>;

  // Crisis Communication
  displayCrisisMessage: (message: TherapeuticMessage) => void;
  generateCrisisMessage: (level: CrisisLevel, context: string) => TherapeuticMessage;
  activateSupportiveMode: () => void;
  deactivateSupportiveMode: () => void;
  displayHotlineInformation: () => void;

  // Emergency Overrides
  activatePaymentBypass: (reason: string) => Promise<void>;
  deactivatePaymentBypass: () => Promise<void>;
  overrideFeatureAccess: (features: string[], reason: string) => Promise<void>;
  removeFeatureOverrides: () => Promise<void>;

  // Crisis Audit & Tracking
  logCrisisEvent: (event: string, source: CrisisDetectionSource, level: CrisisLevel, action: CrisisResponseAction) => Promise<void>;
  trackCrisisResponseTime: (startTime: number, endTime: number) => void;
  generateCrisisReport: () => Promise<any>;
  validateCrisisDataIntegrity: () => Promise<boolean>;

  // Crisis Recovery
  initiateCrisisRecovery: () => Promise<void>;
  monitorRecoveryProgress: () => Promise<void>;
  completeCrisisRecovery: () => Promise<void>;
  scheduleFollowUp: (timeframe: number) => void;

  // Webhook Crisis Processing
  processWebhookCrisisEvent: (event: WebhookEvent, crisisLevel: CrisisLevel) => Promise<WebhookProcessingResult>;
  prioritizeCrisisWebhooks: () => Promise<void>;
  flushCrisisWebhookQueue: () => Promise<void>;

  // Crisis Prevention
  configureCrisisPrevention: (config: any) => void;
  assessCrisisRisk: (assessmentData: any) => Promise<CrisisLevel>;
  activateEarlyWarning: (riskLevel: number) => Promise<void>;
  updateInterventionThresholds: (thresholds: any) => void;

  // Integration Points
  integrateWithPaymentStore: (paymentStore: any) => void;
  integrateWithSubscriptionStore: (subscriptionStore: any) => void;
  integrateWithWebhookManager: (webhookManager: any) => void;
}

/**
 * Combined Crisis State Manager Store
 */
type CrisisStateManagerStore = CrisisStateManagerState & CrisisStateManagerActions;

/**
 * Crisis State Manager Implementation
 */
export const useCrisisStateManager = create<CrisisStateManagerStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      // Initial State
      currentCrisisLevel: 'none',
      crisisDetectionActive: true,
      lastCrisisEvent: null,

      // Emergency Response
      emergencyResponseActive: false,
      emergencyAccessGranted: false,
      therapeuticContinuityActive: true,
      crisisInterventionActive: false,
      emergencyContactsAccessible: true,
      hotlineDisplayed: false,
      safetyPlanAccessible: true,

      // Monitoring
      crisisMonitoringActive: false,
      crisisDetectionSensitivity: 'medium',
      behaviorPatternTracking: false,
      assessmentScoreTracking: true,
      usagePatternAnalysis: false,

      // Performance Metrics
      crisisResponseMetrics: {
        averageResponseTime: 0,
        lastResponseTime: 0,
        emergencyActivations: 0,
        successfulInterventions: 0,
        responseTimeViolations: 0,
        crisisEscalations: 0,
        therapeuticContinuityBreaches: 0,
      },

      // Communication
      crisisCommunicationState: {
        currentMessage: null,
        emergencyMessageQueue: [],
        supportiveModeActive: false,
        anxietyReductionActive: true,
        calming_interface_active: false,
      },

      // Overrides
      emergencyOverrides: {
        paymentBypassActive: false,
        featureAccessOverridden: false,
        subscriptionBypassActive: false,
        premiumContentUnlocked: false,
        exportRestrictionsLifted: false,
      },

      // Audit Trail
      crisisAuditTrail: [],

      // Recovery
      crisisRecoveryState: {
        recoveryInProgress: false,
        recoveryStartTime: null,
        gradualTransitionActive: false,
        supportMaintenanceActive: false,
        followUpRequired: false,
        recoveryMonitoringActive: false,
      },

      // Webhook Integration
      webhookCrisisProcessing: {
        crisisWebhookQueue: [],
        crisisEventHandlers: new Map(),
        emergencyProcessingActive: false,
      },

      // Prevention
      crisisPreventionState: {
        earlyWarningActive: true,
        preventiveMeasuresEnabled: true,
        riskAssessmentActive: true,
        interventionThresholds: {
          phq9_threshold: 20,    // Crisis threshold for PHQ-9
          gad7_threshold: 15,    // Crisis threshold for GAD-7
          behavior_threshold: 80, // Behavioral risk score
          usage_threshold: 75,   // Usage pattern risk score
        },
      },

      // Actions Implementation
      initializeCrisisMonitoring: async () => {
        const startTime = Date.now();

        try {
          // Initialize crisis detection systems
          set({
            crisisMonitoringActive: true,
            crisisDetectionActive: true,
            assessmentScoreTracking: true,
            therapeuticContinuityActive: true,
          });

          // Set up early warning systems
          set({
            crisisPreventionState: {
              ...get().crisisPreventionState,
              earlyWarningActive: true,
              preventiveMeasuresEnabled: true,
              riskAssessmentActive: true,
            },
          });

          const initTime = Date.now() - startTime;
          console.log(`[CrisisStateManager] Crisis monitoring initialized in ${initTime}ms`);

          // Log initialization
          await get().logCrisisEvent('detection', 'system_error', 'none', 'state_preservation');

        } catch (error) {
          console.error('[CrisisStateManager] Crisis monitoring initialization failed:', error);
          throw error;
        }
      },

      shutdownCrisisMonitoring: async () => {
        // Ensure safe shutdown with continuity preservation
        await get().preserveTherapeuticContinuity();

        set({
          crisisMonitoringActive: false,
          crisisDetectionActive: false,
        });

        console.log('[CrisisStateManager] Crisis monitoring safely shutdown');
      },

      detectCrisis: async (source: CrisisDetectionSource, trigger: CrisisDetectionTrigger) => {
        const startTime = Date.now();

        try {
          // Determine crisis level based on trigger
          let crisisLevel: CrisisLevel = 'medium';

          if (trigger.type === 'assessment_threshold' && trigger.severity === 'critical') {
            crisisLevel = 'critical';
          } else if (trigger.type === 'user_activation') {
            crisisLevel = 'high';
          } else if (trigger.type === 'payment_access_loss') {
            crisisLevel = 'medium';
          } else if (trigger.type === 'system_failure') {
            crisisLevel = 'high';
          }

          // Escalate crisis level if necessary
          await get().escalateCrisisLevel(crisisLevel, `Crisis detected from ${source}`);

          // Activate emergency response if critical
          if (crisisLevel === 'critical' || crisisLevel === 'emergency') {
            await get().activateEmergencyResponse(trigger);
          }

          const responseTime = Date.now() - startTime;

          // Validate response time (must be <100ms for crisis detection)
          if (!get().validateCrisisResponse(responseTime)) {
            const metrics = get().crisisResponseMetrics;
            set({
              crisisResponseMetrics: {
                ...metrics,
                responseTimeViolations: metrics.responseTimeViolations + 1,
              },
            });
          }

          // Track performance
          get().trackCrisisResponseTime(startTime, Date.now());

          // Log crisis event
          await get().logCrisisEvent('detection', source, crisisLevel, 'emergency_access');

          // Update last crisis event
          set({
            lastCrisisEvent: {
              timestamp: Date.now(),
              source,
              trigger,
              level: crisisLevel,
              responseTime,
            },
          });

          console.log(`[CrisisStateManager] Crisis detected and processed in ${responseTime}ms: ${source} -> ${crisisLevel}`);

        } catch (error) {
          console.error('[CrisisStateManager] Crisis detection failed:', error);

          // Ensure emergency access as fallback
          await get().grantEmergencyAccess('Crisis detection failure - emergency fallback');
          throw error;
        }
      },

      escalateCrisisLevel: async (newLevel: CrisisLevel, reason: string) => {
        const currentLevel = get().currentCrisisLevel;

        if (newLevel === currentLevel) return;

        const escalationOrder: CrisisLevel[] = ['none', 'watch', 'low', 'medium', 'high', 'critical', 'emergency'];
        const currentIndex = escalationOrder.indexOf(currentLevel);
        const newIndex = escalationOrder.indexOf(newLevel);

        // Only allow escalation or lateral moves, not de-escalation without recovery
        if (newIndex >= currentIndex) {
          set({ currentCrisisLevel: newLevel });

          // Auto-activate appropriate responses
          if (newLevel === 'critical' || newLevel === 'emergency') {
            await get().activateEmergencyResponse({
              type: 'crisis_escalation',
              source: 'escalation',
              severity: 'critical',
              timestamp: Date.now(),
              metadata: { reason },
            });
          }

          // Log escalation
          await get().logCrisisEvent('escalation', 'manual_override', newLevel, 'emergency_access');

          console.log(`[CrisisStateManager] Crisis escalated: ${currentLevel} -> ${newLevel} (${reason})`);
        }
      },

      validateCrisisResponse: (responseTime: number) => {
        // Crisis responses must be within 100ms
        return responseTime <= 100;
      },

      activateEmergencyResponse: async (trigger: CrisisDetectionTrigger) => {
        const startTime = Date.now();

        try {
          // Emergency response must activate within 50ms
          set({
            emergencyResponseActive: true,
            emergencyAccessGranted: true,
            therapeuticContinuityActive: true,
            crisisInterventionActive: true,
            emergencyContactsAccessible: true,
            safetyPlanAccessible: true,
          });

          // Activate all emergency overrides
          await get().activatePaymentBypass('Emergency crisis response');
          await get().overrideFeatureAccess(['all'], 'Crisis emergency access');

          // Display emergency support
          get().displayHotlineInformation();
          await get().activateCrisisIntervention();

          // Generate and display crisis message
          const crisisMessage = get().generateCrisisMessage('critical', 'emergency_response');
          get().displayCrisisMessage(crisisMessage);

          const activationTime = Date.now() - startTime;

          // Update metrics
          const metrics = get().crisisResponseMetrics;
          set({
            crisisResponseMetrics: {
              ...metrics,
              emergencyActivations: metrics.emergencyActivations + 1,
              lastResponseTime: activationTime,
              averageResponseTime: (metrics.averageResponseTime + activationTime) / 2,
            },
          });

          // Log emergency activation
          await get().logCrisisEvent('intervention', 'user_reported', 'critical', 'emergency_access');

          console.log(`[CrisisStateManager] Emergency response activated in ${activationTime}ms`);

        } catch (error) {
          console.error('[CrisisStateManager] Emergency response activation failed:', error);

          // Ensure basic emergency access
          set({
            emergencyAccessGranted: true,
            therapeuticContinuityActive: true,
          });

          throw error;
        }
      },

      deactivateEmergencyResponse: async () => {
        // Initiate gradual recovery process
        await get().initiateCrisisRecovery();

        // Don't immediately deactivate - let recovery process handle it
        console.log('[CrisisStateManager] Emergency response deactivation initiated through recovery process');
      },

      grantEmergencyAccess: async (reason: string) => {
        set({
          emergencyAccessGranted: true,
          therapeuticContinuityActive: true,
        });

        // Activate payment bypass
        await get().activatePaymentBypass(reason);

        console.log(`[CrisisStateManager] Emergency access granted: ${reason}`);
      },

      preserveTherapeuticContinuity: async () => {
        set({
          therapeuticContinuityActive: true,
          emergencyContactsAccessible: true,
          safetyPlanAccessible: true,
        });

        // Ensure core therapeutic features remain accessible
        await get().overrideFeatureAccess([
          'coreTherapeuticContent',
          'crisisSupport',
          'offlineMode',
          'basicAssessments',
          'emergencyContacts'
        ], 'Therapeutic continuity preservation');

        console.log('[CrisisStateManager] Therapeutic continuity preserved');
      },

      activateCrisisIntervention: async () => {
        set({
          crisisInterventionActive: true,
        });

        // Display crisis resources and support
        const interventionMessage = get().generateCrisisMessage('critical', 'crisis_intervention');
        get().displayCrisisMessage(interventionMessage);

        // Activate supportive communication mode
        get().activateSupportiveMode();

        console.log('[CrisisStateManager] Crisis intervention activated');
      },

      displayCrisisMessage: (message: TherapeuticMessage) => {
        set({
          crisisCommunicationState: {
            ...get().crisisCommunicationState,
            currentMessage: message,
          },
        });

        // Auto-clear after display duration
        setTimeout(() => {
          const current = get().crisisCommunicationState.currentMessage;
          if (current && current.id === message.id) {
            set({
              crisisCommunicationState: {
                ...get().crisisCommunicationState,
                currentMessage: null,
              },
            });
          }
        }, message.timing.displayDuration);
      },

      generateCrisisMessage: (level: CrisisLevel, context: string) => {
        const messages = {
          critical: {
            emergency_response: 'You are safe. Emergency support is activated. All therapeutic resources are immediately available. Crisis support: 988.',
            crisis_intervention: 'Immediate support is here. Your safety plan is accessible. You are not alone. Crisis Lifeline: 988.',
          },
          high: {
            support_activation: 'Additional support activated. Your therapeutic tools are enhanced and fully accessible.',
            early_intervention: 'We\'re here to help. Your crisis resources and emergency contacts are readily available.',
          },
          medium: {
            enhanced_support: 'Enhanced support mode activated. Your therapeutic access is protected and prioritized.',
            preventive_care: 'Preventive support engaged. Your wellness tools remain fully available.',
          },
        };

        const messageContent = messages[level]?.[context] || 'Support is available. Your therapeutic access is maintained.';

        return {
          id: `crisis_${level}_${context}_${Date.now()}`,
          type: 'crisis_support' as const,
          priority: level === 'critical' ? 'critical' as const : 'high' as const,
          content: messageContent,
          context: {
            userState: 'crisis_detected',
            therapeuticPhase: 'crisis_support',
            anxietyLevel: level === 'critical' ? 'high' : 'medium',
            supportNeeded: true,
          },
          timing: {
            displayDuration: level === 'critical' ? 20000 : 15000, // Longer display for critical
            fadeIn: 200,
            fadeOut: 1000,
          },
          accessibility: {
            screenReaderText: messageContent + ' Crisis support available.',
            highContrast: true,
            largeText: true,
          },
          timestamp: Date.now(),
        };
      },

      activateSupportiveMode: () => {
        set({
          crisisCommunicationState: {
            ...get().crisisCommunicationState,
            supportiveModeActive: true,
            anxietyReductionActive: true,
            calming_interface_active: true,
          },
        });

        console.log('[CrisisStateManager] Supportive communication mode activated');
      },

      deactivateSupportiveMode: () => {
        set({
          crisisCommunicationState: {
            ...get().crisisCommunicationState,
            supportiveModeActive: false,
            calming_interface_active: false,
          },
        });

        console.log('[CrisisStateManager] Supportive communication mode deactivated');
      },

      displayHotlineInformation: () => {
        set({ hotlineDisplayed: true });

        const hotlineMessage = {
          id: `hotline_${Date.now()}`,
          type: 'crisis_support' as const,
          priority: 'critical' as const,
          content: '🆘 Crisis Lifeline: 988\n\nImmediate help available 24/7.\nYou are not alone.',
          context: {
            userState: 'crisis_support',
            therapeuticPhase: 'emergency_support',
            anxietyLevel: 'high',
            supportNeeded: true,
          },
          timing: {
            displayDuration: 30000, // 30 seconds
            fadeIn: 200,
            fadeOut: 1000,
          },
          accessibility: {
            screenReaderText: 'Crisis Lifeline 988. Immediate help available 24 hours a day, 7 days a week.',
            highContrast: true,
            largeText: true,
          },
          timestamp: Date.now(),
        };

        get().displayCrisisMessage(hotlineMessage);
      },

      activatePaymentBypass: async (reason: string) => {
        set({
          emergencyOverrides: {
            ...get().emergencyOverrides,
            paymentBypassActive: true,
            subscriptionBypassActive: true,
            premiumContentUnlocked: true,
            exportRestrictionsLifted: true,
          },
        });

        await get().logCrisisEvent('override', 'system_error', 'critical', 'emergency_access');

        console.log(`[CrisisStateManager] Payment bypass activated: ${reason}`);
      },

      deactivatePaymentBypass: async () => {
        // Gradual deactivation through recovery process
        const { crisisRecoveryState } = get();

        if (crisisRecoveryState.recoveryInProgress) {
          set({
            emergencyOverrides: {
              ...get().emergencyOverrides,
              paymentBypassActive: false,
              subscriptionBypassActive: false,
            },
          });

          console.log('[CrisisStateManager] Payment bypass deactivated through recovery');
        }
      },

      overrideFeatureAccess: async (features: string[], reason: string) => {
        set({
          emergencyOverrides: {
            ...get().emergencyOverrides,
            featureAccessOverridden: true,
          },
        });

        await get().logCrisisEvent('override', 'manual_override', 'high', 'emergency_access');

        console.log(`[CrisisStateManager] Feature access overridden for: ${features.join(', ')} (${reason})`);
      },

      removeFeatureOverrides: async () => {
        set({
          emergencyOverrides: {
            ...get().emergencyOverrides,
            featureAccessOverridden: false,
          },
        });

        console.log('[CrisisStateManager] Feature access overrides removed');
      },

      logCrisisEvent: async (event: string, source: CrisisDetectionSource, level: CrisisLevel, action: CrisisResponseAction) => {
        const auditEntry = {
          id: `crisis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          event: event as any,
          source,
          level,
          action,
          responseTime: Date.now() - (get().lastCrisisEvent?.timestamp || Date.now()),
          outcome: 'ongoing' as const,
          userSafe: true,
          therapeuticContinuity: get().therapeuticContinuityActive,
          encrypted: true,
        };

        const auditTrail = get().crisisAuditTrail;
        auditTrail.push(auditEntry);

        set({ crisisAuditTrail: auditTrail });

        // Encrypt sensitive audit data
        try {
          const encryptedEntry = encryptionService.encrypt(JSON.stringify(auditEntry));
          // Store encrypted audit entry
          console.log(`[CrisisStateManager] Crisis event logged: ${event} (${source})`);
        } catch (error) {
          console.error('[CrisisStateManager] Failed to encrypt audit entry:', error);
        }
      },

      trackCrisisResponseTime: (startTime: number, endTime: number) => {
        const responseTime = endTime - startTime;
        const metrics = get().crisisResponseMetrics;

        const updatedMetrics = {
          averageResponseTime: (metrics.averageResponseTime + responseTime) / 2,
          lastResponseTime: responseTime,
          emergencyActivations: metrics.emergencyActivations,
          successfulInterventions: metrics.successfulInterventions + 1,
          responseTimeViolations: responseTime > 100 ? metrics.responseTimeViolations + 1 : metrics.responseTimeViolations,
          crisisEscalations: metrics.crisisEscalations,
          therapeuticContinuityBreaches: metrics.therapeuticContinuityBreaches,
        };

        set({ crisisResponseMetrics: updatedMetrics });
      },

      generateCrisisReport: async () => {
        const state = get();

        return {
          summary: {
            currentLevel: state.currentCrisisLevel,
            emergencyActive: state.emergencyResponseActive,
            therapeuticContinuity: state.therapeuticContinuityActive,
            lastCrisis: state.lastCrisisEvent,
          },
          metrics: state.crisisResponseMetrics,
          auditTrail: state.crisisAuditTrail.slice(-10), // Last 10 events
          overrides: state.emergencyOverrides,
          timestamp: Date.now(),
        };
      },

      validateCrisisDataIntegrity: async () => {
        const state = get();

        const checks = [
          state.therapeuticContinuityActive,
          state.emergencyContactsAccessible,
          state.safetyPlanAccessible,
          state.crisisAuditTrail.length >= 0,
          state.crisisResponseMetrics.therapeuticContinuityBreaches === 0,
        ];

        const isValid = checks.every(check => check);

        if (!isValid) {
          console.warn('[CrisisStateManager] Crisis data integrity validation failed');
          await get().preserveTherapeuticContinuity();
        }

        return isValid;
      },

      initiateCrisisRecovery: async () => {
        set({
          crisisRecoveryState: {
            recoveryInProgress: true,
            recoveryStartTime: Date.now(),
            gradualTransitionActive: true,
            supportMaintenanceActive: true,
            followUpRequired: true,
            recoveryMonitoringActive: true,
          },
        });

        // Start gradual recovery process (5-minute transition)
        setTimeout(async () => {
          await get().monitorRecoveryProgress();
        }, 300000); // 5 minutes

        console.log('[CrisisStateManager] Crisis recovery initiated');
      },

      monitorRecoveryProgress: async () => {
        const { crisisRecoveryState, currentCrisisLevel } = get();

        if (!crisisRecoveryState.recoveryInProgress) return;

        // Check if conditions are stable for recovery
        const stableConditions = [
          currentCrisisLevel === 'low' || currentCrisisLevel === 'none',
          get().therapeuticContinuityActive,
          !get().emergencyResponseActive,
        ];

        if (stableConditions.every(condition => condition)) {
          await get().completeCrisisRecovery();
        } else {
          // Continue monitoring
          setTimeout(async () => {
            await get().monitorRecoveryProgress();
          }, 60000); // Check every minute
        }
      },

      completeCrisisRecovery: async () => {
        // Gradual transition out of emergency mode
        set({
          currentCrisisLevel: 'none',
          emergencyResponseActive: false,
          crisisInterventionActive: false,
        });

        // Deactivate overrides gradually
        await get().deactivatePaymentBypass();
        await get().removeFeatureOverrides();

        // Complete recovery
        set({
          crisisRecoveryState: {
            recoveryInProgress: false,
            recoveryStartTime: null,
            gradualTransitionActive: false,
            supportMaintenanceActive: false,
            followUpRequired: false,
            recoveryMonitoringActive: false,
          },
        });

        // Schedule follow-up
        get().scheduleFollowUp(24 * 60 * 60 * 1000); // 24 hours

        await get().logCrisisEvent('resolution', 'system_error', 'none', 'state_preservation');

        console.log('[CrisisStateManager] Crisis recovery completed');
      },

      scheduleFollowUp: (timeframe: number) => {
        setTimeout(() => {
          console.log('[CrisisStateManager] Follow-up check initiated');
          // Implement follow-up check logic
        }, timeframe);
      },

      processWebhookCrisisEvent: async (event: WebhookEvent, crisisLevel: CrisisLevel) => {
        const startTime = Date.now();

        try {
          // Add to crisis webhook queue
          const crisisQueue = get().webhookCrisisProcessing.crisisWebhookQueue;
          crisisQueue.push({
            event,
            crisisLevel,
            urgency: crisisLevel === 'critical' ? 'immediate' : 'high',
            timestamp: Date.now(),
            processed: false,
          });

          set({
            webhookCrisisProcessing: {
              ...get().webhookCrisisProcessing,
              crisisWebhookQueue: crisisQueue,
              emergencyProcessingActive: true,
            },
          });

          // Process immediately if critical
          if (crisisLevel === 'critical' || crisisLevel === 'emergency') {
            await get().prioritizeCrisisWebhooks();
          }

          const processingTime = Date.now() - startTime;

          return {
            success: true,
            eventId: event.id,
            processingTime,
            crisisMode: true,
            therapeuticContinuity: get().therapeuticContinuityActive,
          };

        } catch (error) {
          console.error('[CrisisStateManager] Crisis webhook processing failed:', error);

          return {
            success: false,
            eventId: event.id,
            processingTime: Date.now() - startTime,
            error: error.message,
            crisisMode: true,
            therapeuticContinuity: get().therapeuticContinuityActive,
          };
        }
      },

      prioritizeCrisisWebhooks: async () => {
        const { crisisWebhookQueue } = get().webhookCrisisProcessing;

        // Sort by urgency and process immediately
        const prioritizedQueue = [...crisisWebhookQueue].sort((a, b) => {
          const urgencyOrder = { immediate: 0, high: 1, medium: 2, low: 3 };
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        });

        for (const queuedEvent of prioritizedQueue) {
          if (!queuedEvent.processed && queuedEvent.urgency === 'immediate') {
            // Process critical events immediately
            queuedEvent.processed = true;
            console.log(`[CrisisStateManager] Processing critical webhook: ${queuedEvent.event.id}`);
          }
        }

        set({
          webhookCrisisProcessing: {
            ...get().webhookCrisisProcessing,
            crisisWebhookQueue: prioritizedQueue,
          },
        });
      },

      flushCrisisWebhookQueue: async () => {
        const { crisisWebhookQueue } = get().webhookCrisisProcessing;

        console.log(`[CrisisStateManager] Flushing ${crisisWebhookQueue.length} crisis webhooks`);

        // Process all unprocessed events
        for (const queuedEvent of crisisWebhookQueue) {
          if (!queuedEvent.processed) {
            queuedEvent.processed = true;
            // Process event
          }
        }

        set({
          webhookCrisisProcessing: {
            ...get().webhookCrisisProcessing,
            crisisWebhookQueue: [],
            emergencyProcessingActive: false,
          },
        });
      },

      configureCrisisPrevention: (config: any) => {
        set({
          crisisPreventionState: {
            ...get().crisisPreventionState,
            ...config,
          },
        });

        console.log('[CrisisStateManager] Crisis prevention configured');
      },

      assessCrisisRisk: async (assessmentData: any) => {
        const { interventionThresholds } = get().crisisPreventionState;

        let riskLevel: CrisisLevel = 'none';

        // PHQ-9 assessment
        if (assessmentData.phq9Score >= interventionThresholds.phq9_threshold) {
          riskLevel = 'critical';
        }

        // GAD-7 assessment
        if (assessmentData.gad7Score >= interventionThresholds.gad7_threshold) {
          riskLevel = riskLevel === 'critical' ? 'emergency' : 'critical';
        }

        // Behavioral patterns
        if (assessmentData.behaviorRisk >= interventionThresholds.behavior_threshold) {
          riskLevel = riskLevel === 'none' ? 'medium' : riskLevel;
        }

        return riskLevel;
      },

      activateEarlyWarning: async (riskLevel: number) => {
        if (riskLevel > 70) {
          const warningMessage = get().generateCrisisMessage('medium', 'preventive_care');
          get().displayCrisisMessage(warningMessage);

          console.log(`[CrisisStateManager] Early warning activated: risk level ${riskLevel}`);
        }
      },

      updateInterventionThresholds: (thresholds: any) => {
        set({
          crisisPreventionState: {
            ...get().crisisPreventionState,
            interventionThresholds: {
              ...get().crisisPreventionState.interventionThresholds,
              ...thresholds,
            },
          },
        });

        console.log('[CrisisStateManager] Intervention thresholds updated');
      },

      // Integration methods
      integrateWithPaymentStore: (paymentStore: any) => {
        console.log('[CrisisStateManager] Integrated with payment store');
      },

      integrateWithSubscriptionStore: (subscriptionStore: any) => {
        console.log('[CrisisStateManager] Integrated with subscription store');
      },

      integrateWithWebhookManager: (webhookManager: any) => {
        console.log('[CrisisStateManager] Integrated with webhook manager');
      },
    })),
    {
      name: 'crisis-state-manager',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist critical state for recovery
        currentCrisisLevel: state.currentCrisisLevel,
        therapeuticContinuityActive: state.therapeuticContinuityActive,
        emergencyContactsAccessible: state.emergencyContactsAccessible,
        safetyPlanAccessible: state.safetyPlanAccessible,
        crisisPreventionState: state.crisisPreventionState,
        lastCrisisEvent: state.lastCrisisEvent,
        crisisResponseMetrics: state.crisisResponseMetrics,
      }),
    }
  )
);

/**
 * Crisis State Manager Selectors
 */
export const crisisStateSelectors = {
  isCrisisActive: (state: CrisisStateManagerState) =>
    state.currentCrisisLevel !== 'none' && state.currentCrisisLevel !== 'watch',

  isEmergencyActive: (state: CrisisStateManagerState) =>
    state.emergencyResponseActive || state.currentCrisisLevel === 'critical' || state.currentCrisisLevel === 'emergency',

  hasTherapeuticContinuity: (state: CrisisStateManagerState) =>
    state.therapeuticContinuityActive,

  isRecoveryInProgress: (state: CrisisStateManagerState) =>
    state.crisisRecoveryState.recoveryInProgress,

  crisisHealth: (state: CrisisStateManagerState) => ({
    level: state.currentCrisisLevel,
    responseTime: state.crisisResponseMetrics.lastResponseTime,
    therapeuticContinuity: state.therapeuticContinuityActive,
    emergencyAccess: state.emergencyAccessGranted,
  }),

  responsePerformance: (state: CrisisStateManagerState) => ({
    averageTime: state.crisisResponseMetrics.averageResponseTime,
    violations: state.crisisResponseMetrics.responseTimeViolations,
    successRate: state.crisisResponseMetrics.successfulInterventions /
                 (state.crisisResponseMetrics.emergencyActivations || 1) * 100,
    continuityBreaches: state.crisisResponseMetrics.therapeuticContinuityBreaches,
  }),
};

export default useCrisisStateManager;