/**
 * Payment Queue State Integration for Being. MBCT App
 *
 * Payment system queue state management with subscription awareness:
 * - Payment operation queue management with subscription tier enforcement
 * - Billing state integration with queue operation prioritization
 * - Crisis payment bypass mechanisms with emergency access
 * - Subscription-aware queue capacity and feature gating
 * - Payment failure recovery with graceful queue operation handling
 *
 * CRITICAL INTEGRATION REQUIREMENTS:
 * - Payment operations: <200ms for emergency billing bypass
 * - Subscription validation: <100ms for queue capacity checks
 * - Crisis payment bypass: Immediate access without billing interruption
 * - Memory efficiency: <2MB for payment-aware queue state
 * - Zero billing interruption during crisis events
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import type {
  PriorityQueueOperation,
  PriorityLevel,
} from '../../types/sync/sync-priority-queue';
import type { SubscriptionTier } from '../../types/subscription';
import type { PaymentState } from '../../types/payment';

/**
 * Payment-Aware Queue Operation
 */
export const PaymentAwareQueueOperationSchema = z.object({
  operationId: z.string().uuid(),
  baseOperation: z.record(z.any()), // The original queue operation

  // Payment integration
  paymentContext: z.object({
    requiresBilling: z.boolean(),
    billingTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
    billingValidated: z.boolean(),
    billingValidationTime: z.string().optional(), // ISO timestamp
    paymentBypassGranted: z.boolean().default(false),
    bypassReason: z.enum(['crisis', 'emergency', 'grace_period', 'system_override']).optional(),
  }),

  // Subscription enforcement
  subscriptionGating: z.object({
    subscriptionRequired: z.boolean(),
    minimumTier: z.enum(['trial', 'basic', 'premium', 'grace_period']).optional(),
    currentTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
    tierValidated: z.boolean(),
    gracePeriodAllowed: z.boolean().default(false),
    gracePeriodExpiry: z.string().optional(), // ISO timestamp
  }),

  // Payment operation state
  paymentOperationState: z.object({
    billingAttempts: z.number().int().min(0).default(0),
    lastBillingAttempt: z.string().optional(), // ISO timestamp
    paymentErrors: z.array(z.string()).default([]),
    recoveryStrategy: z.enum(['retry', 'grace_period', 'downgrade', 'bypass']).optional(),
    billingRecoveryInProgress: z.boolean().default(false),
  }),

  // Performance tracking
  paymentPerformanceMetrics: z.object({
    billingValidationTimeMs: z.number().min(0).default(0),
    subscriptionCheckTimeMs: z.number().min(0).default(0),
    totalPaymentOverheadMs: z.number().min(0).default(0),
    paymentCacheHit: z.boolean().default(false),
  }),

  createdAt: z.string(), // ISO timestamp
  lastUpdatedAt: z.string(), // ISO timestamp
});

export type PaymentAwareQueueOperation = z.infer<typeof PaymentAwareQueueOperationSchema>;

/**
 * Subscription Queue Limits with Dynamic Scaling
 */
export const SubscriptionQueueLimitsSchema = z.object({
  subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),

  // Base queue limits
  baseLimits: z.object({
    maxQueuedOperations: z.number().int().positive(),
    maxConcurrentOperations: z.number().int().positive(),
    maxOperationsPerHour: z.number().int().positive(),
    maxPriorityLevel: z.number().int().min(1).max(10),
  }),

  // Dynamic scaling based on usage
  dynamicScaling: z.object({
    enabled: z.boolean(),
    scalingFactor: z.number().min(0.5).max(2.0), // 50% to 200% scaling
    lastScalingAdjustment: z.string().optional(), // ISO timestamp
    scalingReason: z.string().optional(),
  }),

  // Crisis overrides
  crisisOverrides: z.object({
    enableCrisisOverride: z.boolean().default(true),
    crisisUnlimitedOperations: z.boolean().default(true),
    crisisMaxPriority: z.number().int().min(1).max(10).default(10),
    crisisGracePeriodHours: z.number().min(0).default(24),
  }),

  // Usage tracking
  currentUsage: z.object({
    queuedOperations: z.number().int().min(0).default(0),
    operationsThisHour: z.number().int().min(0).default(0),
    averageOperationsPerHour: z.number().min(0).default(0),
    lastUsageReset: z.string(), // ISO timestamp
  }),

  lastUpdated: z.string(), // ISO timestamp
});

export type SubscriptionQueueLimits = z.infer<typeof SubscriptionQueueLimitsSchema>;

/**
 * Payment Queue Recovery Strategy
 */
export const PaymentRecoveryStrategySchema = z.object({
  strategyId: z.string().uuid(),
  strategyType: z.enum(['automatic_retry', 'grace_period_extension', 'tier_downgrade', 'emergency_bypass', 'user_intervention']),

  // Recovery conditions
  triggerConditions: z.object({
    paymentFailureCount: z.number().int().min(0),
    subscriptionExpired: z.boolean(),
    gracePeriodActive: z.boolean(),
    crisisEventActive: z.boolean(),
    userRequestedRecovery: z.boolean(),
  }),

  // Recovery actions
  recoveryActions: z.object({
    retryPayment: z.boolean().default(false),
    extendGracePeriod: z.boolean().default(false),
    downgradeTier: z.boolean().default(false),
    enableEmergencyBypass: z.boolean().default(false),
    notifyUser: z.boolean().default(true),
    preserveQueueOperations: z.boolean().default(true),
  }),

  // Recovery timeline
  timeline: z.object({
    initiatedAt: z.string(), // ISO timestamp
    expectedCompletionTime: z.string(), // ISO timestamp
    actualCompletionTime: z.string().optional(), // ISO timestamp
    maxRecoveryTimeMs: z.number().int().positive(),
  }),

  // Success criteria
  successCriteria: z.object({
    paymentRestored: z.boolean(),
    subscriptionActive: z.boolean(),
    queueOperationsResumed: z.boolean(),
    userSatisfied: z.boolean(),
  }),

  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']),
  lastUpdated: z.string(), // ISO timestamp
});

export type PaymentRecoveryStrategy = z.infer<typeof PaymentRecoveryStrategySchema>;

/**
 * Payment Queue State Integration Interface
 */
interface PaymentQueueIntegrationState {
  // Payment-aware operations
  paymentAwareOperations: Map<string, PaymentAwareQueueOperation>;

  // Subscription limits management
  subscriptionLimits: Map<SubscriptionTier, SubscriptionQueueLimits>;

  // Payment integration state
  paymentIntegration: {
    billingSystemActive: boolean;
    paymentValidationEnabled: boolean;
    lastBillingSystemCheck: string | null; // ISO timestamp
    billingSystemResponseTimeMs: number;
    paymentCacheValid: boolean;
    paymentCacheExpiry: string | null; // ISO timestamp
  };

  // Crisis payment bypass
  crisisPaymentBypass: {
    bypassActive: boolean;
    bypassGrantedAt: string | null; // ISO timestamp
    bypassExpiresAt: string | null; // ISO timestamp
    bypassOperations: string[]; // Operation IDs with bypass
    emergencyAccessLevel: 'none' | 'limited' | 'full';
  };

  // Recovery management
  activeRecoveryStrategies: PaymentRecoveryStrategy[];
  recoveryHistory: PaymentRecoveryStrategy[];

  // Performance monitoring
  paymentQueueMetrics: {
    averageBillingValidationTimeMs: number;
    paymentOperationSuccessRate: number;
    subscriptionCheckSuccessRate: number;
    crisisBypassActivations: number;
    lastMetricsUpdate: string | null; // ISO timestamp
  };

  // Integration configuration
  integrationConfig: {
    enablePaymentValidation: boolean;
    enableSubscriptionEnforcement: boolean;
    enableCrisisBypass: boolean;
    paymentValidationTimeoutMs: number;
    subscriptionCheckIntervalMs: number;
    gracePeriodDurationHours: number;
    emergencyBypassDurationHours: number;
  };

  lastStateUpdate: string; // ISO timestamp
}

/**
 * Payment Queue Integration Actions
 */
interface PaymentQueueIntegrationActions {
  // Payment-aware operation management
  createPaymentAwareOperation: (baseOperation: PriorityQueueOperation, paymentContext: Partial<PaymentAwareQueueOperation['paymentContext']>) => Promise<string>; // Returns operation ID
  updatePaymentContext: (operationId: string, paymentUpdates: Partial<PaymentAwareQueueOperation['paymentContext']>) => boolean;
  validatePaymentForOperation: (operationId: string) => Promise<boolean>;

  // Subscription management
  updateSubscriptionLimits: (tier: SubscriptionTier, limits: Partial<SubscriptionQueueLimits>) => boolean;
  checkSubscriptionCapacity: (tier: SubscriptionTier, operationType: string) => { allowed: boolean; reason?: string; capacityUsed: number };
  enforceSubscriptionLimits: (tier: SubscriptionTier) => Promise<{ operationsDeferred: number; operationsCancelled: number }>;

  // Payment validation and billing
  validateBilling: (operationId: string) => Promise<{ valid: boolean; tier: SubscriptionTier; gracePeriod?: boolean }>;
  processBillingForOperation: (operationId: string) => Promise<boolean>;
  handlePaymentFailure: (operationId: string, error: string) => Promise<boolean>;

  // Crisis payment bypass
  activateCrisisPaymentBypass: (reason: PaymentAwareQueueOperation['paymentContext']['bypassReason']) => Promise<boolean>;
  deactivateCrisisPaymentBypass: () => Promise<boolean>;
  grantOperationPaymentBypass: (operationId: string, reason: string) => boolean;

  // Recovery management
  initiatePaymentRecovery: (strategyType: PaymentRecoveryStrategy['strategyType']) => Promise<string>; // Returns strategy ID
  executeRecoveryStrategy: (strategyId: string) => Promise<boolean>;
  monitorRecoveryProgress: (strategyId: string) => Promise<{ progress: number; status: PaymentRecoveryStrategy['status'] }>;

  // Integration monitoring
  updatePaymentMetrics: (metrics: Partial<PaymentQueueIntegrationState['paymentQueueMetrics']>) => void;
  checkBillingSystemHealth: () => Promise<{ healthy: boolean; responseTime: number; issues: string[] }>;
  optimizePaymentIntegration: () => Promise<{ optimizationsApplied: number; performanceGain: number }>;

  // Analytics and reporting
  generatePaymentQueueReport: () => Promise<string>;
  exportPaymentIntegrationData: () => Promise<string>;

  // Configuration
  updateIntegrationConfig: (config: Partial<PaymentQueueIntegrationState['integrationConfig']>) => void;

  reset: () => void;
}

/**
 * Default Subscription Limits by Tier
 */
const getDefaultSubscriptionLimits = (tier: SubscriptionTier): SubscriptionQueueLimits => {
  const baseLimits = {
    trial: { maxQueuedOperations: 25, maxConcurrentOperations: 1, maxOperationsPerHour: 30, maxPriorityLevel: 6 },
    basic: { maxQueuedOperations: 100, maxConcurrentOperations: 3, maxOperationsPerHour: 120, maxPriorityLevel: 8 },
    premium: { maxQueuedOperations: 500, maxConcurrentOperations: 5, maxOperationsPerHour: 300, maxPriorityLevel: 10 },
    grace_period: { maxQueuedOperations: 10, maxConcurrentOperations: 1, maxOperationsPerHour: 15, maxPriorityLevel: 4 },
  };

  return {
    subscriptionTier: tier,
    baseLimits: baseLimits[tier],
    dynamicScaling: {
      enabled: tier === 'premium',
      scalingFactor: 1.0,
    },
    crisisOverrides: {
      enableCrisisOverride: true,
      crisisUnlimitedOperations: true,
      crisisMaxPriority: 10,
      crisisGracePeriodHours: 24,
    },
    currentUsage: {
      queuedOperations: 0,
      operationsThisHour: 0,
      averageOperationsPerHour: 0,
      lastUsageReset: new Date().toISOString(),
    },
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * Payment Queue Integration Store Implementation
 */
export const usePaymentQueueIntegrationStore = create<PaymentQueueIntegrationState & PaymentQueueIntegrationActions>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        paymentAwareOperations: new Map(),
        subscriptionLimits: new Map([
          ['trial', getDefaultSubscriptionLimits('trial')],
          ['basic', getDefaultSubscriptionLimits('basic')],
          ['premium', getDefaultSubscriptionLimits('premium')],
          ['grace_period', getDefaultSubscriptionLimits('grace_period')],
        ]),
        paymentIntegration: {
          billingSystemActive: true,
          paymentValidationEnabled: true,
          lastBillingSystemCheck: null,
          billingSystemResponseTimeMs: 0,
          paymentCacheValid: false,
          paymentCacheExpiry: null,
        },
        crisisPaymentBypass: {
          bypassActive: false,
          bypassGrantedAt: null,
          bypassExpiresAt: null,
          bypassOperations: [],
          emergencyAccessLevel: 'none',
        },
        activeRecoveryStrategies: [],
        recoveryHistory: [],
        paymentQueueMetrics: {
          averageBillingValidationTimeMs: 0,
          paymentOperationSuccessRate: 1.0,
          subscriptionCheckSuccessRate: 1.0,
          crisisBypassActivations: 0,
          lastMetricsUpdate: null,
        },
        integrationConfig: {
          enablePaymentValidation: true,
          enableSubscriptionEnforcement: true,
          enableCrisisBypass: true,
          paymentValidationTimeoutMs: 5000,
          subscriptionCheckIntervalMs: 300000, // 5 minutes
          gracePeriodDurationHours: 72, // 3 days
          emergencyBypassDurationHours: 24,
        },
        lastStateUpdate: new Date().toISOString(),

        // Payment-aware operation management
        createPaymentAwareOperation: async (baseOperation: PriorityQueueOperation, paymentContextUpdates: Partial<PaymentAwareQueueOperation['paymentContext']>): Promise<string> => {
          const operationId = baseOperation.operationId;
          const now = new Date().toISOString();

          try {
            const paymentAwareOperation: PaymentAwareQueueOperation = {
              operationId,
              baseOperation: baseOperation as any,
              paymentContext: {
                requiresBilling: true,
                billingTier: baseOperation.subscriptionContext?.currentTier || 'trial',
                billingValidated: false,
                paymentBypassGranted: false,
                ...paymentContextUpdates,
              },
              subscriptionGating: {
                subscriptionRequired: true,
                currentTier: baseOperation.subscriptionContext?.currentTier || 'trial',
                tierValidated: false,
                gracePeriodAllowed: baseOperation.subscriptionContext?.gracePeriodAllowed || false,
                ...((baseOperation.subscriptionContext?.requiredTier && { minimumTier: baseOperation.subscriptionContext.requiredTier }) || {}),
              },
              paymentOperationState: {
                billingAttempts: 0,
                paymentErrors: [],
                billingRecoveryInProgress: false,
              },
              paymentPerformanceMetrics: {
                billingValidationTimeMs: 0,
                subscriptionCheckTimeMs: 0,
                totalPaymentOverheadMs: 0,
                paymentCacheHit: false,
              },
              createdAt: now,
              lastUpdatedAt: now,
            };

            set((state) => {
              state.paymentAwareOperations.set(operationId, paymentAwareOperation);
              state.lastStateUpdate = now;
            });

            return operationId;
          } catch (error) {
            console.error('Failed to create payment-aware operation:', error);
            throw error;
          }
        },

        updatePaymentContext: (operationId: string, paymentUpdates: Partial<PaymentAwareQueueOperation['paymentContext']>): boolean => {
          try {
            set((state) => {
              const operation = state.paymentAwareOperations.get(operationId);
              if (!operation) return;

              operation.paymentContext = {
                ...operation.paymentContext,
                ...paymentUpdates,
              };

              operation.lastUpdatedAt = new Date().toISOString();
              state.paymentAwareOperations.set(operationId, operation);
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to update payment context:', error);
            return false;
          }
        },

        validatePaymentForOperation: async (operationId: string): Promise<boolean> => {
          const startTime = performance.now();

          try {
            const state = get();
            const operation = state.paymentAwareOperations.get(operationId);

            if (!operation) return false;

            // Check if crisis bypass is active
            if (state.crisisPaymentBypass.bypassActive || operation.paymentContext.paymentBypassGranted) {
              get().updatePaymentContext(operationId, {
                billingValidated: true,
                paymentBypassGranted: true,
                billingValidationTime: new Date().toISOString(),
              });

              return true;
            }

            // Simulate payment validation
            await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));

            const validationTime = performance.now() - startTime;
            const isValid = Math.random() > 0.05; // 95% success rate

            // Update operation with validation results
            get().updatePaymentContext(operationId, {
              billingValidated: isValid,
              billingValidationTime: new Date().toISOString(),
            });

            // Update performance metrics
            set((storeState) => {
              storeState.paymentQueueMetrics.averageBillingValidationTimeMs =
                (storeState.paymentQueueMetrics.averageBillingValidationTimeMs + validationTime) / 2;

              const operation = storeState.paymentAwareOperations.get(operationId);
              if (operation) {
                operation.paymentPerformanceMetrics.billingValidationTimeMs = validationTime;
                operation.paymentPerformanceMetrics.totalPaymentOverheadMs += validationTime;
                storeState.paymentAwareOperations.set(operationId, operation);
              }

              storeState.lastStateUpdate = new Date().toISOString();
            });

            return isValid;
          } catch (error) {
            console.error('Failed to validate payment for operation:', error);
            return false;
          }
        },

        // Subscription management
        updateSubscriptionLimits: (tier: SubscriptionTier, limitsUpdates: Partial<SubscriptionQueueLimits>): boolean => {
          try {
            set((state) => {
              const existingLimits = state.subscriptionLimits.get(tier) || getDefaultSubscriptionLimits(tier);

              const updatedLimits = {
                ...existingLimits,
                ...limitsUpdates,
                lastUpdated: new Date().toISOString(),
              };

              state.subscriptionLimits.set(tier, updatedLimits);
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to update subscription limits:', error);
            return false;
          }
        },

        checkSubscriptionCapacity: (tier: SubscriptionTier, operationType: string): { allowed: boolean; reason?: string; capacityUsed: number } => {
          const state = get();
          const limits = state.subscriptionLimits.get(tier);

          if (!limits) {
            return { allowed: false, reason: 'Subscription tier not found', capacityUsed: 0 };
          }

          // Check if crisis override is active
          if (state.crisisPaymentBypass.bypassActive && limits.crisisOverrides.enableCrisisOverride) {
            return { allowed: true, capacityUsed: 0 };
          }

          const currentUsage = limits.currentUsage;
          const baseLimits = limits.baseLimits;

          // Apply dynamic scaling if enabled
          const scalingFactor = limits.dynamicScaling.enabled ? limits.dynamicScaling.scalingFactor : 1.0;
          const effectiveLimits = {
            maxQueuedOperations: Math.floor(baseLimits.maxQueuedOperations * scalingFactor),
            maxConcurrentOperations: Math.floor(baseLimits.maxConcurrentOperations * scalingFactor),
            maxOperationsPerHour: Math.floor(baseLimits.maxOperationsPerHour * scalingFactor),
          };

          // Check queue capacity
          if (currentUsage.queuedOperations >= effectiveLimits.maxQueuedOperations) {
            return {
              allowed: false,
              reason: `Queue capacity exceeded (${currentUsage.queuedOperations}/${effectiveLimits.maxQueuedOperations})`,
              capacityUsed: currentUsage.queuedOperations / effectiveLimits.maxQueuedOperations,
            };
          }

          // Check hourly limits
          if (currentUsage.operationsThisHour >= effectiveLimits.maxOperationsPerHour) {
            return {
              allowed: false,
              reason: `Hourly limit exceeded (${currentUsage.operationsThisHour}/${effectiveLimits.maxOperationsPerHour})`,
              capacityUsed: currentUsage.operationsThisHour / effectiveLimits.maxOperationsPerHour,
            };
          }

          return {
            allowed: true,
            capacityUsed: Math.max(
              currentUsage.queuedOperations / effectiveLimits.maxQueuedOperations,
              currentUsage.operationsThisHour / effectiveLimits.maxOperationsPerHour
            ),
          };
        },

        enforceSubscriptionLimits: async (tier: SubscriptionTier): Promise<{ operationsDeferred: number; operationsCancelled: number }> => {
          const state = get();
          const limits = state.subscriptionLimits.get(tier);

          if (!limits) {
            return { operationsDeferred: 0, operationsCancelled: 0 };
          }

          let operationsDeferred = 0;
          let operationsCancelled = 0;

          // Get operations for this tier
          const tierOperations = Array.from(state.paymentAwareOperations.values()).filter(
            op => op.subscriptionGating.currentTier === tier
          );

          // Sort by priority (lower priority operations are deferred first)
          const sortedOperations = tierOperations.sort((a, b) => {
            const aPriority = (a.baseOperation as any).priority || 5;
            const bPriority = (b.baseOperation as any).priority || 5;
            return aPriority - bPriority;
          });

          const currentUsage = limits.currentUsage;
          const baseLimits = limits.baseLimits;

          // Enforce queue limits
          if (currentUsage.queuedOperations > baseLimits.maxQueuedOperations) {
            const excessOperations = currentUsage.queuedOperations - baseLimits.maxQueuedOperations;
            const operationsToDefer = sortedOperations.slice(0, excessOperations);

            for (const operation of operationsToDefer) {
              // Don't defer crisis operations
              if ((operation.baseOperation as any).crisisAttributes?.isCrisisOperation) {
                continue;
              }

              // Mark operation as deferred
              operation.paymentOperationState.recoveryStrategy = 'grace_period';
              operation.paymentOperationState.billingRecoveryInProgress = true;
              operationsDeferred++;
            }
          }

          set((storeState) => {
            storeState.lastStateUpdate = new Date().toISOString();
          });

          return { operationsDeferred, operationsCancelled };
        },

        // Payment validation and billing
        validateBilling: async (operationId: string): Promise<{ valid: boolean; tier: SubscriptionTier; gracePeriod?: boolean }> => {
          const state = get();
          const operation = state.paymentAwareOperations.get(operationId);

          if (!operation) {
            return { valid: false, tier: 'trial' };
          }

          // Simulate billing validation
          await new Promise(resolve => setTimeout(resolve, 150));

          const tier = operation.subscriptionGating.currentTier;
          const isValid = Math.random() > 0.1; // 90% success rate
          const gracePeriod = !isValid && operation.subscriptionGating.gracePeriodAllowed;

          return { valid: isValid, tier, gracePeriod };
        },

        processBillingForOperation: async (operationId: string): Promise<boolean> => {
          const operation = get().paymentAwareOperations.get(operationId);

          if (!operation) return false;

          try {
            // Update billing attempts
            set((state) => {
              const op = state.paymentAwareOperations.get(operationId);
              if (op) {
                op.paymentOperationState.billingAttempts += 1;
                op.paymentOperationState.lastBillingAttempt = new Date().toISOString();
                state.paymentAwareOperations.set(operationId, op);
              }
            });

            // Simulate billing processing
            await new Promise(resolve => setTimeout(resolve, 300));

            const success = Math.random() > 0.05; // 95% success rate

            if (success) {
              get().updatePaymentContext(operationId, {
                billingValidated: true,
                billingValidationTime: new Date().toISOString(),
              });
            } else {
              // Handle billing failure
              await get().handlePaymentFailure(operationId, 'Payment processing failed');
            }

            return success;
          } catch (error) {
            console.error('Failed to process billing for operation:', error);
            return false;
          }
        },

        handlePaymentFailure: async (operationId: string, error: string): Promise<boolean> => {
          try {
            set((state) => {
              const operation = state.paymentAwareOperations.get(operationId);
              if (!operation) return;

              operation.paymentOperationState.paymentErrors.push(error);
              operation.paymentOperationState.billingRecoveryInProgress = true;

              // Determine recovery strategy based on failure type and operation importance
              const isCrisisOperation = (operation.baseOperation as any).crisisAttributes?.isCrisisOperation;

              if (isCrisisOperation) {
                operation.paymentOperationState.recoveryStrategy = 'bypass';
                operation.paymentContext.paymentBypassGranted = true;
                operation.paymentContext.bypassReason = 'crisis';
              } else if (operation.subscriptionGating.gracePeriodAllowed) {
                operation.paymentOperationState.recoveryStrategy = 'grace_period';
              } else {
                operation.paymentOperationState.recoveryStrategy = 'retry';
              }

              operation.lastUpdatedAt = new Date().toISOString();
              state.paymentAwareOperations.set(operationId, operation);
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to handle payment failure:', error);
            return false;
          }
        },

        // Crisis payment bypass
        activateCrisisPaymentBypass: async (reason: PaymentAwareQueueOperation['paymentContext']['bypassReason']): Promise<boolean> => {
          try {
            const now = new Date().toISOString();
            const expiryTime = new Date(Date.now() + get().integrationConfig.emergencyBypassDurationHours * 60 * 60 * 1000).toISOString();

            set((state) => {
              state.crisisPaymentBypass = {
                bypassActive: true,
                bypassGrantedAt: now,
                bypassExpiresAt: expiryTime,
                bypassOperations: [],
                emergencyAccessLevel: 'full',
              };

              // Update metrics
              state.paymentQueueMetrics.crisisBypassActivations += 1;
              state.paymentQueueMetrics.lastMetricsUpdate = now;

              state.lastStateUpdate = now;
            });

            return true;
          } catch (error) {
            console.error('Failed to activate crisis payment bypass:', error);
            return false;
          }
        },

        deactivateCrisisPaymentBypass: async (): Promise<boolean> => {
          try {
            set((state) => {
              state.crisisPaymentBypass = {
                bypassActive: false,
                bypassGrantedAt: null,
                bypassExpiresAt: null,
                bypassOperations: [],
                emergencyAccessLevel: 'none',
              };

              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to deactivate crisis payment bypass:', error);
            return false;
          }
        },

        grantOperationPaymentBypass: (operationId: string, reason: string): boolean => {
          try {
            set((state) => {
              const operation = state.paymentAwareOperations.get(operationId);
              if (!operation) return;

              operation.paymentContext.paymentBypassGranted = true;
              operation.paymentContext.bypassReason = reason as any;
              operation.paymentContext.billingValidated = true;
              operation.lastUpdatedAt = new Date().toISOString();

              state.paymentAwareOperations.set(operationId, operation);
              state.crisisPaymentBypass.bypassOperations.push(operationId);
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to grant operation payment bypass:', error);
            return false;
          }
        },

        // Recovery management
        initiatePaymentRecovery: async (strategyType: PaymentRecoveryStrategy['strategyType']): Promise<string> => {
          const strategyId = crypto.randomUUID();
          const now = new Date().toISOString();

          const recoveryStrategy: PaymentRecoveryStrategy = {
            strategyId,
            strategyType,
            triggerConditions: {
              paymentFailureCount: 1, // Would be calculated from actual state
              subscriptionExpired: false,
              gracePeriodActive: false,
              crisisEventActive: false,
              userRequestedRecovery: false,
            },
            recoveryActions: {
              retryPayment: strategyType === 'automatic_retry',
              extendGracePeriod: strategyType === 'grace_period_extension',
              downgradeTier: strategyType === 'tier_downgrade',
              enableEmergencyBypass: strategyType === 'emergency_bypass',
              notifyUser: true,
              preserveQueueOperations: true,
            },
            timeline: {
              initiatedAt: now,
              expectedCompletionTime: new Date(Date.now() + 300000).toISOString(), // 5 minutes
              maxRecoveryTimeMs: 600000, // 10 minutes
            },
            successCriteria: {
              paymentRestored: false,
              subscriptionActive: false,
              queueOperationsResumed: false,
              userSatisfied: false,
            },
            status: 'pending',
            lastUpdated: now,
          };

          set((state) => {
            state.activeRecoveryStrategies.push(recoveryStrategy);
            state.lastStateUpdate = now;
          });

          return strategyId;
        },

        executeRecoveryStrategy: async (strategyId: string): Promise<boolean> => {
          try {
            set((state) => {
              const strategy = state.activeRecoveryStrategies.find(s => s.strategyId === strategyId);
              if (!strategy) return;

              strategy.status = 'in_progress';
              strategy.lastUpdated = new Date().toISOString();
            });

            // Simulate recovery execution
            await new Promise(resolve => setTimeout(resolve, 2000));

            const success = Math.random() > 0.2; // 80% success rate

            set((state) => {
              const strategyIndex = state.activeRecoveryStrategies.findIndex(s => s.strategyId === strategyId);
              if (strategyIndex === -1) return;

              const strategy = state.activeRecoveryStrategies[strategyIndex];
              strategy.status = success ? 'completed' : 'failed';
              strategy.timeline.actualCompletionTime = new Date().toISOString();

              if (success) {
                strategy.successCriteria = {
                  paymentRestored: true,
                  subscriptionActive: true,
                  queueOperationsResumed: true,
                  userSatisfied: true,
                };
              }

              strategy.lastUpdated = new Date().toISOString();

              // Move to history
              state.recoveryHistory.push(strategy);
              state.activeRecoveryStrategies.splice(strategyIndex, 1);

              state.lastStateUpdate = new Date().toISOString();
            });

            return success;
          } catch (error) {
            console.error('Failed to execute recovery strategy:', error);
            return false;
          }
        },

        monitorRecoveryProgress: async (strategyId: string): Promise<{ progress: number; status: PaymentRecoveryStrategy['status'] }> => {
          const state = get();
          const strategy = state.activeRecoveryStrategies.find(s => s.strategyId === strategyId) ||
                          state.recoveryHistory.find(s => s.strategyId === strategyId);

          if (!strategy) {
            return { progress: 0, status: 'failed' };
          }

          let progress = 0;
          switch (strategy.status) {
            case 'pending':
              progress = 0;
              break;
            case 'in_progress':
              // Calculate progress based on time elapsed
              const elapsed = Date.now() - new Date(strategy.timeline.initiatedAt).getTime();
              const total = strategy.timeline.maxRecoveryTimeMs;
              progress = Math.min(0.9, elapsed / total); // Cap at 90% until completed
              break;
            case 'completed':
              progress = 1.0;
              break;
            case 'failed':
            case 'cancelled':
              progress = 0;
              break;
          }

          return { progress, status: strategy.status };
        },

        // Integration monitoring
        updatePaymentMetrics: (metricsUpdates: Partial<PaymentQueueIntegrationState['paymentQueueMetrics']>): void => {
          set((state) => {
            state.paymentQueueMetrics = {
              ...state.paymentQueueMetrics,
              ...metricsUpdates,
              lastMetricsUpdate: new Date().toISOString(),
            };
            state.lastStateUpdate = new Date().toISOString();
          });
        },

        checkBillingSystemHealth: async (): Promise<{ healthy: boolean; responseTime: number; issues: string[] }> => {
          const startTime = performance.now();
          const issues: string[] = [];

          // Simulate billing system health check
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

          const responseTime = performance.now() - startTime;
          const healthy = responseTime < 500 && Math.random() > 0.05; // 95% success rate

          if (responseTime > 500) {
            issues.push('Billing system response time is high');
          }

          if (!healthy) {
            issues.push('Billing system connectivity issues');
          }

          // Update integration state
          set((state) => {
            state.paymentIntegration.billingSystemActive = healthy;
            state.paymentIntegration.billingSystemResponseTimeMs = responseTime;
            state.paymentIntegration.lastBillingSystemCheck = new Date().toISOString();
            state.lastStateUpdate = new Date().toISOString();
          });

          return { healthy, responseTime, issues };
        },

        optimizePaymentIntegration: async (): Promise<{ optimizationsApplied: number; performanceGain: number }> => {
          let optimizationsApplied = 0;
          let performanceGain = 0;

          const state = get();

          // Optimize payment cache
          if (!state.paymentIntegration.paymentCacheValid) {
            set((storeState) => {
              storeState.paymentIntegration.paymentCacheValid = true;
              storeState.paymentIntegration.paymentCacheExpiry = new Date(Date.now() + 300000).toISOString(); // 5 minutes
              storeState.lastStateUpdate = new Date().toISOString();
            });
            optimizationsApplied++;
            performanceGain += 20;
          }

          // Clean up old recovery strategies
          if (state.recoveryHistory.length > 20) {
            set((storeState) => {
              storeState.recoveryHistory = storeState.recoveryHistory.slice(-10);
              storeState.lastStateUpdate = new Date().toISOString();
            });
            optimizationsApplied++;
            performanceGain += 5;
          }

          return { optimizationsApplied, performanceGain };
        },

        // Analytics and reporting
        generatePaymentQueueReport: async (): Promise<string> => {
          const state = get();

          const report = {
            generatedAt: new Date().toISOString(),
            paymentIntegration: {
              totalOperations: state.paymentAwareOperations.size,
              billingSystemHealth: state.paymentIntegration.billingSystemActive,
              averageBillingValidationTime: state.paymentQueueMetrics.averageBillingValidationTimeMs,
              paymentSuccessRate: state.paymentQueueMetrics.paymentOperationSuccessRate,
            },
            crisisBypass: {
              bypassActive: state.crisisPaymentBypass.bypassActive,
              totalActivations: state.paymentQueueMetrics.crisisBypassActivations,
              bypassedOperations: state.crisisPaymentBypass.bypassOperations.length,
            },
            subscriptionEnforcement: {
              subscriptionTiers: Array.from(state.subscriptionLimits.keys()),
              enforcementEnabled: get().integrationConfig.enableSubscriptionEnforcement,
              gracePeriodDuration: get().integrationConfig.gracePeriodDurationHours,
            },
            recovery: {
              activeStrategies: state.activeRecoveryStrategies.length,
              completedRecoveries: state.recoveryHistory.filter(r => r.status === 'completed').length,
              failedRecoveries: state.recoveryHistory.filter(r => r.status === 'failed').length,
            },
          };

          return JSON.stringify(report, null, 2);
        },

        exportPaymentIntegrationData: async (): Promise<string> => {
          const state = get();

          const exportData = {
            exportedAt: new Date().toISOString(),
            paymentAwareOperations: Array.from(state.paymentAwareOperations.entries()),
            subscriptionLimits: Array.from(state.subscriptionLimits.entries()),
            paymentIntegration: state.paymentIntegration,
            crisisPaymentBypass: state.crisisPaymentBypass,
            activeRecoveryStrategies: state.activeRecoveryStrategies,
            recoveryHistory: state.recoveryHistory.slice(-50), // Recent history
            paymentQueueMetrics: state.paymentQueueMetrics,
          };

          return JSON.stringify(exportData, null, 2);
        },

        // Configuration
        updateIntegrationConfig: (config: Partial<PaymentQueueIntegrationState['integrationConfig']>): void => {
          set((state) => {
            state.integrationConfig = {
              ...state.integrationConfig,
              ...config,
            };
            state.lastStateUpdate = new Date().toISOString();
          });
        },

        reset: () => {
          set(() => ({
            paymentAwareOperations: new Map(),
            subscriptionLimits: new Map([
              ['trial', getDefaultSubscriptionLimits('trial')],
              ['basic', getDefaultSubscriptionLimits('basic')],
              ['premium', getDefaultSubscriptionLimits('premium')],
              ['grace_period', getDefaultSubscriptionLimits('grace_period')],
            ]),
            paymentIntegration: {
              billingSystemActive: true,
              paymentValidationEnabled: true,
              lastBillingSystemCheck: null,
              billingSystemResponseTimeMs: 0,
              paymentCacheValid: false,
              paymentCacheExpiry: null,
            },
            crisisPaymentBypass: {
              bypassActive: false,
              bypassGrantedAt: null,
              bypassExpiresAt: null,
              bypassOperations: [],
              emergencyAccessLevel: 'none',
            },
            activeRecoveryStrategies: [],
            recoveryHistory: [],
            paymentQueueMetrics: {
              averageBillingValidationTimeMs: 0,
              paymentOperationSuccessRate: 1.0,
              subscriptionCheckSuccessRate: 1.0,
              crisisBypassActivations: 0,
              lastMetricsUpdate: null,
            },
            integrationConfig: {
              enablePaymentValidation: true,
              enableSubscriptionEnforcement: true,
              enableCrisisBypass: true,
              paymentValidationTimeoutMs: 5000,
              subscriptionCheckIntervalMs: 300000,
              gracePeriodDurationHours: 72,
              emergencyBypassDurationHours: 24,
            },
            lastStateUpdate: new Date().toISOString(),
          }));
        },
      })),
      {
        name: 'being-payment-queue-integration',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          // Convert Maps to objects for serialization
          paymentAwareOperations: Object.fromEntries(state.paymentAwareOperations),
          subscriptionLimits: Object.fromEntries(state.subscriptionLimits),
          paymentIntegration: state.paymentIntegration,
          crisisPaymentBypass: state.crisisPaymentBypass,
          activeRecoveryStrategies: state.activeRecoveryStrategies,
          recoveryHistory: state.recoveryHistory.slice(-20), // Keep recent history
          paymentQueueMetrics: state.paymentQueueMetrics,
          integrationConfig: state.integrationConfig,
        }),
        // Convert objects back to Maps after deserialization
        onRehydrateStorage: () => (state) => {
          if (state) {
            if (state.paymentAwareOperations) {
              const operationsMap = new Map();
              Object.entries(state.paymentAwareOperations as any).forEach(([key, value]) => {
                operationsMap.set(key, value);
              });
              state.paymentAwareOperations = operationsMap;
            }

            if (state.subscriptionLimits) {
              const limitsMap = new Map();
              Object.entries(state.subscriptionLimits as any).forEach(([key, value]) => {
                limitsMap.set(key, value);
              });
              state.subscriptionLimits = limitsMap;
            }
          }
        },
      }
    )
  )
);

/**
 * Payment Queue Integration Selectors
 */
export const paymentQueueIntegrationSelectors = {
  getPaymentAwareOperations: (state: PaymentQueueIntegrationState) =>
    Array.from(state.paymentAwareOperations.values()),
  getSubscriptionLimits: (state: PaymentQueueIntegrationState, tier: SubscriptionTier) =>
    state.subscriptionLimits.get(tier),
  isCrisisPaymentBypassActive: (state: PaymentQueueIntegrationState) =>
    state.crisisPaymentBypass.bypassActive,
  getActiveRecoveryStrategies: (state: PaymentQueueIntegrationState) =>
    state.activeRecoveryStrategies,
  getPaymentQueueMetrics: (state: PaymentQueueIntegrationState) =>
    state.paymentQueueMetrics,
  getBillingSystemHealth: (state: PaymentQueueIntegrationState) => ({
    active: state.paymentIntegration.billingSystemActive,
    responseTime: state.paymentIntegration.billingSystemResponseTimeMs,
    lastCheck: state.paymentIntegration.lastBillingSystemCheck,
  }),
  getPaymentIntegrationConfig: (state: PaymentQueueIntegrationState) =>
    state.integrationConfig,
};

/**
 * Payment Queue Integration Hook
 */
export const usePaymentQueueIntegration = () => {
  const store = usePaymentQueueIntegrationStore();
  return {
    ...store,
    selectors: paymentQueueIntegrationSelectors,
  };
};