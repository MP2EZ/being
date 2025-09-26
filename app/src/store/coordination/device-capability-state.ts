/**
 * Device Capability State Management for Being. MBCT App
 *
 * Device-specific queue capabilities and resource management:
 * - Dynamic device capability assessment and resource monitoring
 * - Subscription tier-aware capacity management with intelligent scaling
 * - Performance profiling and optimization recommendations
 * - Battery and network-aware queue operation scheduling
 * - Device health monitoring with proactive capability adjustment
 *
 * CRITICAL PERFORMANCE REQUIREMENTS:
 * - Capability assessment: <50ms for device profiling updates
 * - Resource monitoring: <20ms for resource state updates
 * - Performance optimization: Background processing with minimal impact
 * - Memory efficiency: <3MB for comprehensive capability state
 * - Real-time adaptation: <100ms for capability adjustments
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import type { SubscriptionTier } from '../../types/payment-canonical';

/**
 * Device Performance Profile
 */
export const DevicePerformanceProfileSchema = z.object({
  deviceId: z.string().uuid(),

  // Core performance metrics
  performance: z.object({
    computeScore: z.number().min(0).max(100), // 0-100 relative performance score
    memoryScore: z.number().min(0).max(100),
    storageScore: z.number().min(0).max(100),
    networkScore: z.number().min(0).max(100),
    overallScore: z.number().min(0).max(100),
  }),

  // Capacity metrics
  capacity: z.object({
    maxConcurrentOperations: z.number().int().positive(),
    maxQueueSize: z.number().int().positive(),
    processingThroughputPerSecond: z.number().min(0),
    memoryCapacityMB: z.number().int().positive(),
    storageCapacityMB: z.number().int().positive(),
    offlineCapacityHours: z.number().min(0),
  }),

  // Resource utilization
  utilization: z.object({
    cpuUtilizationPercentage: z.number().min(0).max(1),
    memoryUtilizationPercentage: z.number().min(0).max(1),
    storageUtilizationPercentage: z.number().min(0).max(1),
    networkUtilizationPercentage: z.number().min(0).max(1),
    batteryLevel: z.number().min(0).max(1).optional(),
  }),

  // Performance characteristics
  characteristics: z.object({
    preferredOperationTypes: z.array(z.string()),
    avoidedOperationTypes: z.array(z.string()),
    optimalBatchSize: z.number().int().positive(),
    preferredSchedulingWindow: z.object({
      startHour: z.number().int().min(0).max(23),
      endHour: z.number().int().min(0).max(23),
    }).optional(),
  }),

  lastUpdated: z.string(), // ISO timestamp
});

export type DevicePerformanceProfile = z.infer<typeof DevicePerformanceProfileSchema>;

/**
 * Subscription Tier Capabilities
 */
export const SubscriptionCapabilitiesSchema = z.object({
  subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),

  // Queue limits
  queueLimits: z.object({
    maxQueuedOperations: z.number().int().positive(),
    maxConcurrentOperations: z.number().int().positive(),
    maxOperationsPerHour: z.number().int().positive(),
    maxStorageUsageMB: z.number().int().positive(),
  }),

  // Feature access
  featureAccess: z.object({
    priorityLevels: z.array(z.number().int().min(1).max(10)),
    crisisAccess: z.boolean(),
    therapeuticAccess: z.boolean(),
    offlineSyncAccess: z.boolean(),
    crossDeviceSync: z.boolean(),
    backgroundProcessing: z.boolean(),
    analyticsAccess: z.boolean(),
  }),

  // Performance guarantees
  performanceGuarantees: z.object({
    maxResponseTimeMs: z.number().positive(),
    minThroughputPerSecond: z.number().min(0),
    maxMemoryUsageMB: z.number().int().positive(),
    uptime: z.number().min(0).max(1), // SLA uptime percentage
  }),

  // Usage tracking
  usage: z.object({
    currentOperations: z.number().int().min(0),
    operationsThisHour: z.number().int().min(0),
    storageUsedMB: z.number().int().min(0),
    lastResetTime: z.string(), // ISO timestamp
  }),

  lastUpdated: z.string(), // ISO timestamp
});

export type SubscriptionCapabilities = z.infer<typeof SubscriptionCapabilitiesSchema>;

/**
 * Resource Constraint Definition
 */
export const ResourceConstraintSchema = z.object({
  constraintId: z.string().uuid(),
  constraintType: z.enum(['memory', 'cpu', 'storage', 'network', 'battery', 'thermal']),
  severity: z.enum(['info', 'warning', 'critical']),

  // Constraint details
  constraint: z.object({
    threshold: z.number(),
    currentValue: z.number(),
    unit: z.string(),
    direction: z.enum(['above', 'below']), // Whether constraint is violated when above or below threshold
  }),

  // Impact assessment
  impact: z.object({
    affectedOperationTypes: z.array(z.string()),
    performanceReduction: z.number().min(0).max(1), // 0-1 percentage reduction
    recommendedActions: z.array(z.string()),
    automaticMitigationAvailable: z.boolean(),
  }),

  // Temporal information
  detectedAt: z.string(), // ISO timestamp
  resolvedAt: z.string().optional(), // ISO timestamp
  estimatedDurationMs: z.number().int().positive().optional(),

  // Context
  context: z.object({
    activeOperationsCount: z.number().int().min(0),
    deviceState: z.enum(['idle', 'active', 'stressed', 'critical']),
    environmentalFactors: z.array(z.string()).optional(),
  }),
});

export type ResourceConstraint = z.infer<typeof ResourceConstraintSchema>;

/**
 * Capability Optimization Recommendation
 */
export const CapabilityOptimizationSchema = z.object({
  recommendationId: z.string().uuid(),
  deviceId: z.string().uuid(),

  // Optimization type
  optimizationType: z.enum(['capacity_increase', 'performance_tuning', 'resource_reallocation', 'constraint_mitigation', 'subscription_upgrade']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),

  // Recommendation details
  recommendation: z.object({
    title: z.string(),
    description: z.string(),
    expectedBenefit: z.string(),
    estimatedImprovementPercentage: z.number().min(0).max(100),
  }),

  // Implementation details
  implementation: z.object({
    requiresUserAction: z.boolean(),
    canAutoApply: z.boolean(),
    estimatedImplementationTimeMs: z.number().int().positive(),
    risksInvolved: z.array(z.string()),
    rollbackAvailable: z.boolean(),
  }),

  // Cost-benefit analysis
  analysis: z.object({
    currentPerformanceScore: z.number().min(0).max(100),
    projectedPerformanceScore: z.number().min(0).max(100),
    resourceCost: z.enum(['low', 'medium', 'high']),
    userExperienceImpact: z.enum(['positive', 'neutral', 'negative']),
  }),

  generatedAt: z.string(), // ISO timestamp
  validUntil: z.string().optional(), // ISO timestamp
  appliedAt: z.string().optional(), // ISO timestamp
});

export type CapabilityOptimization = z.infer<typeof CapabilityOptimizationSchema>;

/**
 * Device Capability State Interface
 */
interface DeviceCapabilityState {
  // Device profiles
  deviceProfiles: Map<string, DevicePerformanceProfile>;
  currentDeviceProfile: DevicePerformanceProfile | null;

  // Subscription management
  subscriptionCapabilities: Map<SubscriptionTier, SubscriptionCapabilities>;
  currentSubscriptionCapabilities: SubscriptionCapabilities | null;

  // Resource constraints
  activeConstraints: ResourceConstraint[];
  constraintHistory: ResourceConstraint[];

  // Optimization management
  optimizationRecommendations: CapabilityOptimization[];
  appliedOptimizations: CapabilityOptimization[];

  // Dynamic capability adjustment
  capabilityAdjustments: {
    dynamicAdjustmentEnabled: boolean;
    lastAdjustmentTime: string | null; // ISO timestamp
    adjustmentHistory: Array<{
      timestamp: string; // ISO timestamp
      adjustmentType: string;
      reason: string;
      impact: number; // Performance impact percentage
    }>;
  };

  // Performance monitoring
  performanceMonitoring: {
    monitoringEnabled: boolean;
    samplingIntervalMs: number;
    alertThresholds: Record<string, number>;
    lastPerformanceCheck: string | null; // ISO timestamp
  };

  // Configuration
  capabilityConfig: {
    enableAutomaticOptimization: boolean;
    enableResourceConstraintDetection: boolean;
    performanceMonitoringInterval: number;
    optimizationSchedule: 'immediate' | 'background' | 'scheduled';
    constraintSensitivity: 'low' | 'medium' | 'high';
  };

  lastStateUpdate: string; // ISO timestamp
}

/**
 * Device Capability Actions
 */
interface DeviceCapabilityActions {
  // Profile management
  updateDeviceProfile: (deviceId: string, profile: Partial<DevicePerformanceProfile>) => boolean;
  assessDeviceCapabilities: (deviceId: string) => Promise<DevicePerformanceProfile>;
  benchmarkDevice: (deviceId: string) => Promise<{ score: number; details: Record<string, number> }>;

  // Subscription capability management
  updateSubscriptionCapabilities: (tier: SubscriptionTier, capabilities: Partial<SubscriptionCapabilities>) => boolean;
  checkSubscriptionLimits: (tier: SubscriptionTier, operationType: string) => { allowed: boolean; reason?: string };
  trackSubscriptionUsage: (tier: SubscriptionTier, operationType: string, resourceUsage: number) => void;

  // Resource constraint management
  detectResourceConstraints: (deviceId: string) => Promise<ResourceConstraint[]>;
  resolveConstraint: (constraintId: string) => Promise<boolean>;
  mitigateConstraint: (constraintId: string) => Promise<boolean>;
  addCustomConstraint: (constraint: Omit<ResourceConstraint, 'constraintId' | 'detectedAt'>) => string; // Returns constraint ID

  // Optimization management
  generateOptimizationRecommendations: (deviceId: string) => Promise<CapabilityOptimization[]>;
  applyOptimization: (recommendationId: string) => Promise<boolean>;
  rollbackOptimization: (recommendationId: string) => Promise<boolean>;
  scheduleOptimization: (recommendationId: string, scheduledTime: string) => boolean;

  // Dynamic capability adjustment
  adjustCapabilitiesForLoad: (deviceId: string, currentLoad: number) => Promise<boolean>;
  optimizeForBattery: (deviceId: string) => Promise<boolean>;
  optimizeForPerformance: (deviceId: string) => Promise<boolean>;

  // Resource monitoring
  startPerformanceMonitoring: (deviceId: string) => boolean;
  stopPerformanceMonitoring: (deviceId: string) => boolean;
  updatePerformanceMetrics: (deviceId: string, metrics: Partial<DevicePerformanceProfile['performance']>) => void;

  // Analytics and reporting
  getCapabilityReport: (deviceId: string) => Promise<string>;
  getOptimizationReport: () => Promise<string>;
  exportCapabilityData: () => Promise<string>;

  // Maintenance
  performCapabilityMaintenance: () => Promise<{ optimizationsApplied: number; constraintsResolved: number }>;
  cleanupCapabilityState: () => Promise<{ recordsRemoved: number; memoryFreed: number }>;

  // Configuration
  updateCapabilityConfig: (config: Partial<DeviceCapabilityState['capabilityConfig']>) => void;

  reset: () => void;
}

/**
 * Default Subscription Capabilities by Tier
 */
const getDefaultSubscriptionCapabilities = (tier: SubscriptionTier): SubscriptionCapabilities => {
  const baseCapabilities = {
    trial: {
      queueLimits: { maxQueuedOperations: 25, maxConcurrentOperations: 1, maxOperationsPerHour: 30, maxStorageUsageMB: 50 },
      featureAccess: { priorityLevels: [1, 2, 3], crisisAccess: true, therapeuticAccess: true, offlineSyncAccess: false, crossDeviceSync: false, backgroundProcessing: false, analyticsAccess: false },
      performanceGuarantees: { maxResponseTimeMs: 10000, minThroughputPerSecond: 0.2, maxMemoryUsageMB: 25, uptime: 0.95 },
    },
    basic: {
      queueLimits: { maxQueuedOperations: 100, maxConcurrentOperations: 3, maxOperationsPerHour: 120, maxStorageUsageMB: 200 },
      featureAccess: { priorityLevels: [1, 2, 3, 4, 5, 6], crisisAccess: true, therapeuticAccess: true, offlineSyncAccess: true, crossDeviceSync: true, backgroundProcessing: true, analyticsAccess: false },
      performanceGuarantees: { maxResponseTimeMs: 3000, minThroughputPerSecond: 1.0, maxMemoryUsageMB: 75, uptime: 0.98 },
    },
    premium: {
      queueLimits: { maxQueuedOperations: 500, maxConcurrentOperations: 5, maxOperationsPerHour: 300, maxStorageUsageMB: 1000 },
      featureAccess: { priorityLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], crisisAccess: true, therapeuticAccess: true, offlineSyncAccess: true, crossDeviceSync: true, backgroundProcessing: true, analyticsAccess: true },
      performanceGuarantees: { maxResponseTimeMs: 1000, minThroughputPerSecond: 2.0, maxMemoryUsageMB: 150, uptime: 0.995 },
    },
    grace_period: {
      queueLimits: { maxQueuedOperations: 10, maxConcurrentOperations: 1, maxOperationsPerHour: 15, maxStorageUsageMB: 25 },
      featureAccess: { priorityLevels: [1, 2], crisisAccess: true, therapeuticAccess: true, offlineSyncAccess: false, crossDeviceSync: false, backgroundProcessing: false, analyticsAccess: false },
      performanceGuarantees: { maxResponseTimeMs: 15000, minThroughputPerSecond: 0.1, maxMemoryUsageMB: 20, uptime: 0.90 },
    },
  };

  const capabilities = baseCapabilities[tier];
  return {
    subscriptionTier: tier,
    ...capabilities,
    usage: {
      currentOperations: 0,
      operationsThisHour: 0,
      storageUsedMB: 0,
      lastResetTime: new Date().toISOString(),
    },
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * Device Capability Store Implementation
 */
export const useDeviceCapabilityStore = create<DeviceCapabilityState & DeviceCapabilityActions>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        deviceProfiles: new Map(),
        currentDeviceProfile: null,
        subscriptionCapabilities: new Map(),
        currentSubscriptionCapabilities: null,
        activeConstraints: [],
        constraintHistory: [],
        optimizationRecommendations: [],
        appliedOptimizations: [],
        capabilityAdjustments: {
          dynamicAdjustmentEnabled: true,
          lastAdjustmentTime: null,
          adjustmentHistory: [],
        },
        performanceMonitoring: {
          monitoringEnabled: true,
          samplingIntervalMs: 5000, // 5 seconds
          alertThresholds: {
            memoryUtilization: 0.8,
            cpuUtilization: 0.9,
            storageUtilization: 0.85,
          },
          lastPerformanceCheck: null,
        },
        capabilityConfig: {
          enableAutomaticOptimization: true,
          enableResourceConstraintDetection: true,
          performanceMonitoringInterval: 5000,
          optimizationSchedule: 'background',
          constraintSensitivity: 'medium',
        },
        lastStateUpdate: new Date().toISOString(),

        // Profile management
        updateDeviceProfile: (deviceId: string, profileUpdates: Partial<DevicePerformanceProfile>): boolean => {
          try {
            set((state) => {
              const existingProfile = state.deviceProfiles.get(deviceId);
              if (!existingProfile) {
                // Create new profile if it doesn't exist
                const newProfile: DevicePerformanceProfile = {
                  deviceId,
                  performance: { computeScore: 50, memoryScore: 50, storageScore: 50, networkScore: 50, overallScore: 50 },
                  capacity: { maxConcurrentOperations: 3, maxQueueSize: 100, processingThroughputPerSecond: 1.0, memoryCapacityMB: 2000, storageCapacityMB: 16000, offlineCapacityHours: 24 },
                  utilization: { cpuUtilizationPercentage: 0, memoryUtilizationPercentage: 0, storageUtilizationPercentage: 0, networkUtilizationPercentage: 0 },
                  characteristics: { preferredOperationTypes: [], avoidedOperationTypes: [], optimalBatchSize: 10 },
                  lastUpdated: new Date().toISOString(),
                  ...profileUpdates,
                };
                state.deviceProfiles.set(deviceId, newProfile);
              } else {
                const updatedProfile = {
                  ...existingProfile,
                  ...profileUpdates,
                  lastUpdated: new Date().toISOString(),
                };
                state.deviceProfiles.set(deviceId, updatedProfile);
              }

              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to update device profile:', error);
            return false;
          }
        },

        assessDeviceCapabilities: async (deviceId: string): Promise<DevicePerformanceProfile> => {
          // Simulate device capability assessment
          await new Promise(resolve => setTimeout(resolve, 200));

          const profile: DevicePerformanceProfile = {
            deviceId,
            performance: {
              computeScore: 70 + Math.random() * 30, // Simulate 70-100 range
              memoryScore: 60 + Math.random() * 40,
              storageScore: 80 + Math.random() * 20,
              networkScore: 50 + Math.random() * 50,
              overallScore: 0, // Will be calculated
            },
            capacity: {
              maxConcurrentOperations: Math.floor(2 + Math.random() * 6), // 2-8
              maxQueueSize: Math.floor(50 + Math.random() * 200), // 50-250
              processingThroughputPerSecond: 0.5 + Math.random() * 2, // 0.5-2.5
              memoryCapacityMB: Math.floor(1000 + Math.random() * 7000), // 1-8GB
              storageCapacityMB: Math.floor(8000 + Math.random() * 120000), // 8-128GB
              offlineCapacityHours: Math.floor(12 + Math.random() * 36), // 12-48 hours
            },
            utilization: {
              cpuUtilizationPercentage: Math.random() * 0.3, // 0-30%
              memoryUtilizationPercentage: Math.random() * 0.4, // 0-40%
              storageUtilizationPercentage: Math.random() * 0.6, // 0-60%
              networkUtilizationPercentage: Math.random() * 0.2, // 0-20%
              batteryLevel: 0.3 + Math.random() * 0.7, // 30-100%
            },
            characteristics: {
              preferredOperationTypes: ['sync', 'processing'],
              avoidedOperationTypes: ['heavy_compute'],
              optimalBatchSize: Math.floor(5 + Math.random() * 20), // 5-25
            },
            lastUpdated: new Date().toISOString(),
          };

          // Calculate overall score
          profile.performance.overallScore = (
            profile.performance.computeScore +
            profile.performance.memoryScore +
            profile.performance.storageScore +
            profile.performance.networkScore
          ) / 4;

          // Update the profile in state
          get().updateDeviceProfile(deviceId, profile);

          return profile;
        },

        benchmarkDevice: async (deviceId: string): Promise<{ score: number; details: Record<string, number> }> => {
          // Simulate device benchmarking
          await new Promise(resolve => setTimeout(resolve, 1000));

          const details = {
            cpuPerformance: 60 + Math.random() * 40,
            memoryPerformance: 70 + Math.random() * 30,
            storagePerformance: 50 + Math.random() * 50,
            networkPerformance: 40 + Math.random() * 60,
          };

          const score = Object.values(details).reduce((a, b) => a + b, 0) / Object.values(details).length;

          // Update device profile with benchmark results
          get().updateDeviceProfile(deviceId, {
            performance: {
              computeScore: details.cpuPerformance,
              memoryScore: details.memoryPerformance,
              storageScore: details.storagePerformance,
              networkScore: details.networkPerformance,
              overallScore: score,
            },
          });

          return { score, details };
        },

        // Subscription capability management
        updateSubscriptionCapabilities: (tier: SubscriptionTier, capabilityUpdates: Partial<SubscriptionCapabilities>): boolean => {
          try {
            set((state) => {
              const existingCapabilities = state.subscriptionCapabilities.get(tier) || getDefaultSubscriptionCapabilities(tier);

              const updatedCapabilities = {
                ...existingCapabilities,
                ...capabilityUpdates,
                lastUpdated: new Date().toISOString(),
              };

              state.subscriptionCapabilities.set(tier, updatedCapabilities);
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to update subscription capabilities:', error);
            return false;
          }
        },

        checkSubscriptionLimits: (tier: SubscriptionTier, operationType: string): { allowed: boolean; reason?: string } => {
          const state = get();
          const capabilities = state.subscriptionCapabilities.get(tier) || getDefaultSubscriptionCapabilities(tier);

          // Check queue limits
          if (capabilities.usage.currentOperations >= capabilities.queueLimits.maxConcurrentOperations) {
            return { allowed: false, reason: `Concurrent operation limit reached (${capabilities.queueLimits.maxConcurrentOperations})` };
          }

          if (capabilities.usage.operationsThisHour >= capabilities.queueLimits.maxOperationsPerHour) {
            return { allowed: false, reason: `Hourly operation limit reached (${capabilities.queueLimits.maxOperationsPerHour})` };
          }

          // Check feature access
          if (operationType === 'crisis' && !capabilities.featureAccess.crisisAccess) {
            return { allowed: false, reason: 'Crisis access not available for this subscription tier' };
          }

          if (operationType === 'therapeutic' && !capabilities.featureAccess.therapeuticAccess) {
            return { allowed: false, reason: 'Therapeutic access not available for this subscription tier' };
          }

          return { allowed: true };
        },

        trackSubscriptionUsage: (tier: SubscriptionTier, operationType: string, resourceUsage: number): void => {
          set((state) => {
            const capabilities = state.subscriptionCapabilities.get(tier);
            if (!capabilities) return;

            capabilities.usage.currentOperations += 1;
            capabilities.usage.operationsThisHour += 1;
            capabilities.usage.storageUsedMB += resourceUsage;
            capabilities.lastUpdated = new Date().toISOString();

            state.subscriptionCapabilities.set(tier, capabilities);
            state.lastStateUpdate = new Date().toISOString();
          });
        },

        // Resource constraint management
        detectResourceConstraints: async (deviceId: string): Promise<ResourceConstraint[]> => {
          const state = get();
          const profile = state.deviceProfiles.get(deviceId);

          if (!profile) return [];

          const constraints: ResourceConstraint[] = [];

          // Memory constraint detection
          if (profile.utilization.memoryUtilizationPercentage > 0.85) {
            constraints.push({
              constraintId: crypto.randomUUID(),
              constraintType: 'memory',
              severity: profile.utilization.memoryUtilizationPercentage > 0.95 ? 'critical' : 'warning',
              constraint: {
                threshold: 0.85,
                currentValue: profile.utilization.memoryUtilizationPercentage,
                unit: 'percentage',
                direction: 'above',
              },
              impact: {
                affectedOperationTypes: ['processing', 'sync', 'analysis'],
                performanceReduction: Math.min(0.8, profile.utilization.memoryUtilizationPercentage),
                recommendedActions: ['Clear cache', 'Reduce queue size', 'Optimize memory usage'],
                automaticMitigationAvailable: true,
              },
              detectedAt: new Date().toISOString(),
              context: {
                activeOperationsCount: 5, // Would be actual count
                deviceState: profile.utilization.memoryUtilizationPercentage > 0.95 ? 'critical' : 'stressed',
              },
            });
          }

          // CPU constraint detection
          if (profile.utilization.cpuUtilizationPercentage > 0.9) {
            constraints.push({
              constraintId: crypto.randomUUID(),
              constraintType: 'cpu',
              severity: 'warning',
              constraint: {
                threshold: 0.9,
                currentValue: profile.utilization.cpuUtilizationPercentage,
                unit: 'percentage',
                direction: 'above',
              },
              impact: {
                affectedOperationTypes: ['processing', 'computation'],
                performanceReduction: 0.3,
                recommendedActions: ['Reduce concurrent operations', 'Schedule background tasks'],
                automaticMitigationAvailable: true,
              },
              detectedAt: new Date().toISOString(),
              context: {
                activeOperationsCount: 8,
                deviceState: 'stressed',
              },
            });
          }

          // Battery constraint detection (if available)
          if (profile.utilization.batteryLevel && profile.utilization.batteryLevel < 0.2) {
            constraints.push({
              constraintId: crypto.randomUUID(),
              constraintType: 'battery',
              severity: profile.utilization.batteryLevel < 0.1 ? 'critical' : 'warning',
              constraint: {
                threshold: 0.2,
                currentValue: profile.utilization.batteryLevel,
                unit: 'percentage',
                direction: 'below',
              },
              impact: {
                affectedOperationTypes: ['background_sync', 'processing', 'networking'],
                performanceReduction: 1 - profile.utilization.batteryLevel,
                recommendedActions: ['Enable battery optimization', 'Reduce background operations', 'Defer non-critical tasks'],
                automaticMitigationAvailable: true,
              },
              detectedAt: new Date().toISOString(),
              context: {
                activeOperationsCount: 3,
                deviceState: 'stressed',
                environmentalFactors: ['low_power_mode'],
              },
            });
          }

          return constraints;
        },

        resolveConstraint: async (constraintId: string): Promise<boolean> => {
          try {
            set((state) => {
              const constraintIndex = state.activeConstraints.findIndex(c => c.constraintId === constraintId);
              if (constraintIndex === -1) return;

              const constraint = state.activeConstraints[constraintIndex];
              constraint.resolvedAt = new Date().toISOString();

              // Move to history
              state.constraintHistory.push(constraint);
              state.activeConstraints.splice(constraintIndex, 1);

              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to resolve constraint:', error);
            return false;
          }
        },

        mitigateConstraint: async (constraintId: string): Promise<boolean> => {
          const state = get();
          const constraint = state.activeConstraints.find(c => c.constraintId === constraintId);

          if (!constraint) return false;

          try {
            // Apply mitigation based on constraint type
            switch (constraint.constraintType) {
              case 'memory':
                // Simulate memory cleanup
                await new Promise(resolve => setTimeout(resolve, 500));
                // Reduce memory utilization in device profile
                const deviceProfile = state.deviceProfiles.get(constraint.context.activeOperationsCount.toString());
                if (deviceProfile) {
                  get().updateDeviceProfile(deviceProfile.deviceId, {
                    utilization: {
                      ...deviceProfile.utilization,
                      memoryUtilizationPercentage: Math.max(0.7, deviceProfile.utilization.memoryUtilizationPercentage - 0.2),
                    },
                  });
                }
                break;

              case 'cpu':
                // Simulate CPU load reduction
                await new Promise(resolve => setTimeout(resolve, 300));
                break;

              case 'battery':
                // Simulate battery optimization
                await new Promise(resolve => setTimeout(resolve, 100));
                break;
            }

            // Mark constraint as resolved
            await get().resolveConstraint(constraintId);

            return true;
          } catch (error) {
            console.error('Failed to mitigate constraint:', error);
            return false;
          }
        },

        addCustomConstraint: (constraint: Omit<ResourceConstraint, 'constraintId' | 'detectedAt'>): string => {
          const constraintId = crypto.randomUUID();

          set((state) => {
            const newConstraint: ResourceConstraint = {
              ...constraint,
              constraintId,
              detectedAt: new Date().toISOString(),
            };

            state.activeConstraints.push(newConstraint);
            state.lastStateUpdate = new Date().toISOString();
          });

          return constraintId;
        },

        // Optimization management
        generateOptimizationRecommendations: async (deviceId: string): Promise<CapabilityOptimization[]> => {
          const state = get();
          const profile = state.deviceProfiles.get(deviceId);

          if (!profile) return [];

          const recommendations: CapabilityOptimization[] = [];
          const now = new Date().toISOString();

          // Performance optimization recommendations
          if (profile.performance.overallScore < 70) {
            recommendations.push({
              recommendationId: crypto.randomUUID(),
              deviceId,
              optimizationType: 'performance_tuning',
              priority: 'high',
              recommendation: {
                title: 'Performance Optimization',
                description: 'Device performance is below optimal levels. Consider performance tuning.',
                expectedBenefit: 'Improved queue processing speed and reduced latency',
                estimatedImprovementPercentage: 25,
              },
              implementation: {
                requiresUserAction: false,
                canAutoApply: true,
                estimatedImplementationTimeMs: 5000,
                risksInvolved: [],
                rollbackAvailable: true,
              },
              analysis: {
                currentPerformanceScore: profile.performance.overallScore,
                projectedPerformanceScore: Math.min(100, profile.performance.overallScore + 25),
                resourceCost: 'low',
                userExperienceImpact: 'positive',
              },
              generatedAt: now,
              validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            });
          }

          // Memory optimization recommendations
          if (profile.utilization.memoryUtilizationPercentage > 0.75) {
            recommendations.push({
              recommendationId: crypto.randomUUID(),
              deviceId,
              optimizationType: 'resource_reallocation',
              priority: 'medium',
              recommendation: {
                title: 'Memory Usage Optimization',
                description: 'High memory usage detected. Optimize memory allocation.',
                expectedBenefit: 'Reduced memory pressure and improved stability',
                estimatedImprovementPercentage: 20,
              },
              implementation: {
                requiresUserAction: false,
                canAutoApply: true,
                estimatedImplementationTimeMs: 2000,
                risksInvolved: ['Temporary performance impact'],
                rollbackAvailable: true,
              },
              analysis: {
                currentPerformanceScore: profile.performance.memoryScore,
                projectedPerformanceScore: Math.min(100, profile.performance.memoryScore + 20),
                resourceCost: 'low',
                userExperienceImpact: 'neutral',
              },
              generatedAt: now,
            });
          }

          // Capacity increase recommendations
          if (profile.capacity.maxConcurrentOperations < 3) {
            recommendations.push({
              recommendationId: crypto.randomUUID(),
              deviceId,
              optimizationType: 'capacity_increase',
              priority: 'low',
              recommendation: {
                title: 'Increase Concurrent Operation Capacity',
                description: 'Device can handle more concurrent operations based on current performance.',
                expectedBenefit: 'Higher throughput and better resource utilization',
                estimatedImprovementPercentage: 15,
              },
              implementation: {
                requiresUserAction: true,
                canAutoApply: false,
                estimatedImplementationTimeMs: 1000,
                risksInvolved: ['Increased resource usage'],
                rollbackAvailable: true,
              },
              analysis: {
                currentPerformanceScore: profile.performance.overallScore,
                projectedPerformanceScore: profile.performance.overallScore + 5,
                resourceCost: 'medium',
                userExperienceImpact: 'positive',
              },
              generatedAt: now,
            });
          }

          return recommendations;
        },

        applyOptimization: async (recommendationId: string): Promise<boolean> => {
          const state = get();
          const recommendation = state.optimizationRecommendations.find(r => r.recommendationId === recommendationId);

          if (!recommendation) return false;

          try {
            // Simulate optimization application
            await new Promise(resolve => setTimeout(resolve, recommendation.implementation.estimatedImplementationTimeMs));

            set((storeState) => {
              // Mark as applied
              recommendation.appliedAt = new Date().toISOString();
              storeState.appliedOptimizations.push(recommendation);

              // Remove from recommendations
              storeState.optimizationRecommendations = storeState.optimizationRecommendations.filter(
                r => r.recommendationId !== recommendationId
              );

              // Apply the optimization effects to the device profile
              const profile = storeState.deviceProfiles.get(recommendation.deviceId);
              if (profile) {
                switch (recommendation.optimizationType) {
                  case 'performance_tuning':
                    profile.performance.overallScore = Math.min(100,
                      profile.performance.overallScore + recommendation.recommendation.estimatedImprovementPercentage
                    );
                    break;

                  case 'resource_reallocation':
                    if (recommendation.recommendation.title.includes('Memory')) {
                      profile.utilization.memoryUtilizationPercentage = Math.max(0.1,
                        profile.utilization.memoryUtilizationPercentage - 0.2
                      );
                    }
                    break;

                  case 'capacity_increase':
                    profile.capacity.maxConcurrentOperations += 1;
                    break;
                }

                profile.lastUpdated = new Date().toISOString();
                storeState.deviceProfiles.set(recommendation.deviceId, profile);
              }

              storeState.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to apply optimization:', error);
            return false;
          }
        },

        rollbackOptimization: async (recommendationId: string): Promise<boolean> => {
          try {
            set((state) => {
              const appliedIndex = state.appliedOptimizations.findIndex(o => o.recommendationId === recommendationId);
              if (appliedIndex === -1) return;

              const optimization = state.appliedOptimizations[appliedIndex];

              // Rollback the optimization effects (simplified)
              const profile = state.deviceProfiles.get(optimization.deviceId);
              if (profile) {
                switch (optimization.optimizationType) {
                  case 'performance_tuning':
                    profile.performance.overallScore = Math.max(0,
                      profile.performance.overallScore - optimization.recommendation.estimatedImprovementPercentage
                    );
                    break;

                  case 'capacity_increase':
                    profile.capacity.maxConcurrentOperations = Math.max(1, profile.capacity.maxConcurrentOperations - 1);
                    break;
                }

                profile.lastUpdated = new Date().toISOString();
                state.deviceProfiles.set(optimization.deviceId, profile);
              }

              // Remove from applied optimizations
              state.appliedOptimizations.splice(appliedIndex, 1);
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to rollback optimization:', error);
            return false;
          }
        },

        scheduleOptimization: (recommendationId: string, scheduledTime: string): boolean => {
          try {
            set((state) => {
              const recommendation = state.optimizationRecommendations.find(r => r.recommendationId === recommendationId);
              if (recommendation) {
                recommendation.validUntil = scheduledTime;
                state.lastStateUpdate = new Date().toISOString();
              }
            });

            return true;
          } catch (error) {
            console.error('Failed to schedule optimization:', error);
            return false;
          }
        },

        // Dynamic capability adjustment
        adjustCapabilitiesForLoad: async (deviceId: string, currentLoad: number): Promise<boolean> => {
          try {
            const profile = get().deviceProfiles.get(deviceId);
            if (!profile) return false;

            // Adjust capabilities based on current load
            const adjustmentFactor = Math.max(0.5, 1 - currentLoad * 0.3);

            get().updateDeviceProfile(deviceId, {
              capacity: {
                ...profile.capacity,
                maxConcurrentOperations: Math.floor(profile.capacity.maxConcurrentOperations * adjustmentFactor),
                processingThroughputPerSecond: profile.capacity.processingThroughputPerSecond * adjustmentFactor,
              },
            });

            // Record adjustment
            set((state) => {
              state.capabilityAdjustments.adjustmentHistory.push({
                timestamp: new Date().toISOString(),
                adjustmentType: 'load_balancing',
                reason: `Adjusted for load: ${(currentLoad * 100).toFixed(1)}%`,
                impact: (1 - adjustmentFactor) * 100,
              });

              state.capabilityAdjustments.lastAdjustmentTime = new Date().toISOString();
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to adjust capabilities for load:', error);
            return false;
          }
        },

        optimizeForBattery: async (deviceId: string): Promise<boolean> => {
          try {
            const profile = get().deviceProfiles.get(deviceId);
            if (!profile) return false;

            // Reduce capabilities to save battery
            get().updateDeviceProfile(deviceId, {
              capacity: {
                ...profile.capacity,
                maxConcurrentOperations: Math.max(1, Math.floor(profile.capacity.maxConcurrentOperations * 0.6)),
                processingThroughputPerSecond: profile.capacity.processingThroughputPerSecond * 0.7,
              },
              characteristics: {
                ...profile.characteristics,
                avoidedOperationTypes: [...profile.characteristics.avoidedOperationTypes, 'heavy_compute', 'background_sync'],
              },
            });

            // Record adjustment
            set((state) => {
              state.capabilityAdjustments.adjustmentHistory.push({
                timestamp: new Date().toISOString(),
                adjustmentType: 'battery_optimization',
                reason: 'Optimized for battery conservation',
                impact: 40,
              });

              state.capabilityAdjustments.lastAdjustmentTime = new Date().toISOString();
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to optimize for battery:', error);
            return false;
          }
        },

        optimizeForPerformance: async (deviceId: string): Promise<boolean> => {
          try {
            const profile = get().deviceProfiles.get(deviceId);
            if (!profile) return false;

            // Increase capabilities for performance
            get().updateDeviceProfile(deviceId, {
              capacity: {
                ...profile.capacity,
                maxConcurrentOperations: Math.min(10, profile.capacity.maxConcurrentOperations + 2),
                processingThroughputPerSecond: profile.capacity.processingThroughputPerSecond * 1.3,
              },
              characteristics: {
                ...profile.characteristics,
                preferredOperationTypes: [...profile.characteristics.preferredOperationTypes, 'processing', 'compute'],
                avoidedOperationTypes: profile.characteristics.avoidedOperationTypes.filter(type =>
                  !['heavy_compute', 'processing'].includes(type)
                ),
              },
            });

            // Record adjustment
            set((state) => {
              state.capabilityAdjustments.adjustmentHistory.push({
                timestamp: new Date().toISOString(),
                adjustmentType: 'performance_optimization',
                reason: 'Optimized for maximum performance',
                impact: 30,
              });

              state.capabilityAdjustments.lastAdjustmentTime = new Date().toISOString();
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to optimize for performance:', error);
            return false;
          }
        },

        // Resource monitoring
        startPerformanceMonitoring: (deviceId: string): boolean => {
          try {
            set((state) => {
              state.performanceMonitoring.monitoringEnabled = true;
              state.performanceMonitoring.lastPerformanceCheck = new Date().toISOString();
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to start performance monitoring:', error);
            return false;
          }
        },

        stopPerformanceMonitoring: (deviceId: string): boolean => {
          try {
            set((state) => {
              state.performanceMonitoring.monitoringEnabled = false;
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to stop performance monitoring:', error);
            return false;
          }
        },

        updatePerformanceMetrics: (deviceId: string, metricsUpdates: Partial<DevicePerformanceProfile['performance']>): void => {
          get().updateDeviceProfile(deviceId, {
            performance: {
              ...get().deviceProfiles.get(deviceId)?.performance,
              ...metricsUpdates,
            },
          });

          set((state) => {
            state.performanceMonitoring.lastPerformanceCheck = new Date().toISOString();
            state.lastStateUpdate = new Date().toISOString();
          });
        },

        // Analytics and reporting
        getCapabilityReport: async (deviceId: string): Promise<string> => {
          const state = get();
          const profile = state.deviceProfiles.get(deviceId);

          if (!profile) {
            return JSON.stringify({ error: 'Device profile not found' });
          }

          const report = {
            generatedAt: new Date().toISOString(),
            deviceId,
            profile,
            constraints: state.activeConstraints.filter(c =>
              c.context.activeOperationsCount.toString() === deviceId
            ),
            recommendations: state.optimizationRecommendations.filter(r => r.deviceId === deviceId),
            appliedOptimizations: state.appliedOptimizations.filter(o => o.deviceId === deviceId),
            adjustmentHistory: state.capabilityAdjustments.adjustmentHistory.slice(-10),
          };

          return JSON.stringify(report, null, 2);
        },

        getOptimizationReport: async (): Promise<string> => {
          const state = get();

          const report = {
            generatedAt: new Date().toISOString(),
            summary: {
              totalDevices: state.deviceProfiles.size,
              activeConstraints: state.activeConstraints.length,
              pendingOptimizations: state.optimizationRecommendations.length,
              appliedOptimizations: state.appliedOptimizations.length,
            },
            performanceDistribution: {
              highPerforming: Array.from(state.deviceProfiles.values()).filter(p => p.performance.overallScore > 80).length,
              mediumPerforming: Array.from(state.deviceProfiles.values()).filter(p => p.performance.overallScore >= 60 && p.performance.overallScore <= 80).length,
              lowPerforming: Array.from(state.deviceProfiles.values()).filter(p => p.performance.overallScore < 60).length,
            },
            constraintsByType: state.activeConstraints.reduce((acc, constraint) => {
              acc[constraint.constraintType] = (acc[constraint.constraintType] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            optimizationsByType: state.optimizationRecommendations.reduce((acc, optimization) => {
              acc[optimization.optimizationType] = (acc[optimization.optimizationType] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
          };

          return JSON.stringify(report, null, 2);
        },

        exportCapabilityData: async (): Promise<string> => {
          const state = get();

          const exportData = {
            exportedAt: new Date().toISOString(),
            deviceProfiles: Array.from(state.deviceProfiles.entries()),
            subscriptionCapabilities: Array.from(state.subscriptionCapabilities.entries()),
            activeConstraints: state.activeConstraints,
            optimizationRecommendations: state.optimizationRecommendations,
            appliedOptimizations: state.appliedOptimizations,
            capabilityAdjustments: state.capabilityAdjustments,
            performanceMonitoring: state.performanceMonitoring,
          };

          return JSON.stringify(exportData, null, 2);
        },

        // Maintenance
        performCapabilityMaintenance: async (): Promise<{ optimizationsApplied: number; constraintsResolved: number }> => {
          let optimizationsApplied = 0;
          let constraintsResolved = 0;

          const state = get();

          // Auto-apply eligible optimizations
          for (const recommendation of state.optimizationRecommendations) {
            if (recommendation.implementation.canAutoApply && !recommendation.implementation.requiresUserAction) {
              const applied = await get().applyOptimization(recommendation.recommendationId);
              if (applied) optimizationsApplied++;
            }
          }

          // Auto-resolve eligible constraints
          for (const constraint of state.activeConstraints) {
            if (constraint.impact.automaticMitigationAvailable) {
              const resolved = await get().mitigateConstraint(constraint.constraintId);
              if (resolved) constraintsResolved++;
            }
          }

          return { optimizationsApplied, constraintsResolved };
        },

        cleanupCapabilityState: async (): Promise<{ recordsRemoved: number; memoryFreed: number }> => {
          let recordsRemoved = 0;
          let memoryFreed = 0;

          set((state) => {
            // Clean up old constraint history
            const constraintRetentionMs = 7 * 24 * 60 * 60 * 1000; // 7 days
            const constraintCutoff = Date.now() - constraintRetentionMs;

            const initialConstraintCount = state.constraintHistory.length;
            state.constraintHistory = state.constraintHistory.filter(constraint =>
              new Date(constraint.detectedAt).getTime() > constraintCutoff
            );
            recordsRemoved += initialConstraintCount - state.constraintHistory.length;

            // Clean up old adjustment history
            if (state.capabilityAdjustments.adjustmentHistory.length > 50) {
              const removed = state.capabilityAdjustments.adjustmentHistory.length - 25;
              state.capabilityAdjustments.adjustmentHistory = state.capabilityAdjustments.adjustmentHistory.slice(-25);
              recordsRemoved += removed;
            }

            // Clean up expired optimization recommendations
            const now = Date.now();
            const initialOptimizationCount = state.optimizationRecommendations.length;
            state.optimizationRecommendations = state.optimizationRecommendations.filter(optimization => {
              if (!optimization.validUntil) return true;
              return new Date(optimization.validUntil).getTime() > now;
            });
            recordsRemoved += initialOptimizationCount - state.optimizationRecommendations.length;

            // Estimate memory freed (simplified calculation)
            memoryFreed = recordsRemoved * 2; // Estimate 2KB per record

            state.lastStateUpdate = new Date().toISOString();
          });

          return { recordsRemoved, memoryFreed };
        },

        // Configuration
        updateCapabilityConfig: (config: Partial<DeviceCapabilityState['capabilityConfig']>): void => {
          set((state) => {
            state.capabilityConfig = {
              ...state.capabilityConfig,
              ...config,
            };
            state.lastStateUpdate = new Date().toISOString();
          });
        },

        reset: () => {
          set(() => ({
            deviceProfiles: new Map(),
            currentDeviceProfile: null,
            subscriptionCapabilities: new Map(),
            currentSubscriptionCapabilities: null,
            activeConstraints: [],
            constraintHistory: [],
            optimizationRecommendations: [],
            appliedOptimizations: [],
            capabilityAdjustments: {
              dynamicAdjustmentEnabled: true,
              lastAdjustmentTime: null,
              adjustmentHistory: [],
            },
            performanceMonitoring: {
              monitoringEnabled: true,
              samplingIntervalMs: 5000,
              alertThresholds: {
                memoryUtilization: 0.8,
                cpuUtilization: 0.9,
                storageUtilization: 0.85,
              },
              lastPerformanceCheck: null,
            },
            capabilityConfig: {
              enableAutomaticOptimization: true,
              enableResourceConstraintDetection: true,
              performanceMonitoringInterval: 5000,
              optimizationSchedule: 'background',
              constraintSensitivity: 'medium',
            },
            lastStateUpdate: new Date().toISOString(),
          }));
        },
      })),
      {
        name: 'being-device-capability',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          // Convert Maps to objects for serialization
          deviceProfiles: Object.fromEntries(state.deviceProfiles),
          subscriptionCapabilities: Object.fromEntries(state.subscriptionCapabilities),
          currentDeviceProfile: state.currentDeviceProfile,
          currentSubscriptionCapabilities: state.currentSubscriptionCapabilities,
          activeConstraints: state.activeConstraints,
          constraintHistory: state.constraintHistory.slice(-50), // Keep recent history
          optimizationRecommendations: state.optimizationRecommendations,
          appliedOptimizations: state.appliedOptimizations,
          capabilityAdjustments: state.capabilityAdjustments,
          performanceMonitoring: state.performanceMonitoring,
          capabilityConfig: state.capabilityConfig,
        }),
        // Convert objects back to Maps after deserialization
        onRehydrateStorage: () => (state) => {
          if (state) {
            if (state.deviceProfiles) {
              const profilesMap = new Map();
              Object.entries(state.deviceProfiles as any).forEach(([key, value]) => {
                profilesMap.set(key, value);
              });
              state.deviceProfiles = profilesMap;
            }

            if (state.subscriptionCapabilities) {
              const capabilitiesMap = new Map();
              Object.entries(state.subscriptionCapabilities as any).forEach(([key, value]) => {
                capabilitiesMap.set(key, value);
              });
              state.subscriptionCapabilities = capabilitiesMap;
            }
          }
        },
      }
    )
  )
);

/**
 * Device Capability Selectors for Performance
 */
export const deviceCapabilitySelectors = {
  getDeviceProfiles: (state: DeviceCapabilityState) => Array.from(state.deviceProfiles.values()),
  getCurrentDeviceProfile: (state: DeviceCapabilityState) => state.currentDeviceProfile,
  getDeviceProfile: (state: DeviceCapabilityState, deviceId: string) => state.deviceProfiles.get(deviceId),
  getSubscriptionCapabilities: (state: DeviceCapabilityState, tier: SubscriptionTier) =>
    state.subscriptionCapabilities.get(tier),
  getActiveConstraints: (state: DeviceCapabilityState) => state.activeConstraints,
  getCriticalConstraints: (state: DeviceCapabilityState) =>
    state.activeConstraints.filter(c => c.severity === 'critical'),
  getOptimizationRecommendations: (state: DeviceCapabilityState) => state.optimizationRecommendations,
  getHighPriorityOptimizations: (state: DeviceCapabilityState) =>
    state.optimizationRecommendations.filter(o => o.priority === 'high' || o.priority === 'critical'),
  getCapabilityAdjustments: (state: DeviceCapabilityState) => state.capabilityAdjustments,
  getPerformanceMonitoring: (state: DeviceCapabilityState) => state.performanceMonitoring,
  getDeviceHealthScore: (state: DeviceCapabilityState, deviceId: string) => {
    const profile = state.deviceProfiles.get(deviceId);
    if (!profile) return 0;

    const constraints = state.activeConstraints.length;
    const baseScore = profile.performance.overallScore;
    const constraintPenalty = constraints * 10;

    return Math.max(0, baseScore - constraintPenalty);
  },
};

/**
 * Device Capability Hook with Selectors
 */
export const useDeviceCapability = () => {
  const store = useDeviceCapabilityStore();
  return {
    ...store,
    selectors: deviceCapabilitySelectors,
  };
};