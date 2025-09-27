/**
 * Conflict Resolution Store for Being. MBCT App
 *
 * Intelligent conflict resolution with therapeutic data prioritization:
 * - AI-assisted conflict detection and resolution algorithms
 * - Therapeutic data priority ranking with clinical impact assessment
 * - Advanced merge strategies for assessment and session data
 * - Crisis-safe conflict resolution with emergency data protection
 * - User-guided resolution with therapeutic guidance and context
 * - Performance-optimized resolution with <1s target response time
 */

import { create } from 'zustand';
import { createJSONStorage, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { encryptionService } from '../../services/security/EncryptionService';
import { stateSynchronizationService } from '../../services/state/StateSynchronization';

/**
 * Conflict Type Schema with Therapeutic Context
 */
export const ConflictTypeSchema = z.enum([
  'data_divergence',        // Different data values for same field
  'version_mismatch',       // Different versions of same record
  'timestamp_conflict',     // Timestamp inconsistencies
  'crisis_override',        // Crisis data takes priority
  'therapeutic_priority',   // Therapeutic data prioritized
  'session_conflict',       // Overlapping session data
  'assessment_conflict',    // PHQ-9/GAD-7 score conflicts
  'progress_conflict',      // Progress tracking conflicts
  'privacy_conflict',       // Privacy level mismatches
  'family_conflict',        // Family sharing conflicts
]);

export type ConflictType = z.infer<typeof ConflictTypeSchema>;

/**
 * Therapeutic Impact Assessment Schema
 */
export const TherapeuticImpactSchema = z.object({
  level: z.enum(['none', 'minimal', 'moderate', 'significant', 'critical']),
  description: z.string(),
  affectedAreas: z.array(z.enum([
    'mood_tracking',
    'assessment_scores',
    'breathing_progress',
    'session_continuity',
    'crisis_detection',
    'therapeutic_relationship',
    'progress_tracking',
    'family_support'
  ])),
  clinicalRelevance: z.enum(['low', 'medium', 'high', 'critical']),
  userExperience: z.enum(['seamless', 'minor_disruption', 'noticeable', 'disruptive', 'harmful']),
  dataIntegrity: z.enum(['maintained', 'slightly_affected', 'compromised', 'severely_damaged']),
  urgencyLevel: z.enum(['low', 'medium', 'high', 'emergency']),
});

export type TherapeuticImpact = z.infer<typeof TherapeuticImpactSchema>;

/**
 * Conflict Context Schema
 */
export const ConflictContextSchema = z.object({
  sourceDeviceId: z.string(),
  targetDeviceId: z.string(),
  conflictOrigin: z.enum(['sync', 'handoff', 'manual_edit', 'crisis_event', 'family_share']),
  detectedAt: z.string(), // ISO timestamp

  // Data context
  dataType: z.enum(['user_profile', 'assessment', 'session', 'progress', 'crisis', 'family']),
  recordId: z.string(),
  fieldPath: z.string(), // JSON path to conflicting field

  // Timing context
  localTimestamp: z.string(),   // ISO timestamp
  remoteTimestamp: z.string(),  // ISO timestamp
  networkLatency: z.number(),   // ms

  // Session context
  activeSession: z.object({
    sessionId: z.string(),
    sessionType: z.string(),
    progress: z.number(),
    canInterrupt: z.boolean(),
  }).optional(),

  // Crisis context
  crisisActive: z.boolean(),
  crisisLevel: z.enum(['none', 'mild', 'moderate', 'severe', 'emergency']),

  // User context
  userState: z.enum(['active', 'passive', 'crisis', 'offline', 'handoff']),
  therapeuticPhase: z.enum(['initial', 'engagement', 'deepening', 'integration', 'maintenance']),
});

export type ConflictContext = z.infer<typeof ConflictContextSchema>;

/**
 * Conflict Resolution Strategy Schema
 */
export const ConflictResolutionStrategySchema = z.object({
  strategyId: z.string(),
  strategyName: z.string(),
  description: z.string(),

  // Strategy configuration
  autoResolve: z.boolean(),
  requiresUserInput: z.boolean(),
  therapistGuidance: z.boolean(),
  aiAssisted: z.boolean(),

  // Applicability
  conflictTypes: z.array(ConflictTypeSchema),
  dataTypes: z.array(z.string()),
  urgencyLevels: z.array(z.enum(['low', 'medium', 'high', 'emergency'])),

  // Resolution approach
  resolutionMethod: z.enum([
    'local_wins',           // Local data takes priority
    'remote_wins',          // Remote data takes priority
    'timestamp_priority',   // Most recent timestamp wins
    'crisis_priority',      // Crisis-related data wins
    'therapeutic_priority', // Therapeutically relevant data wins
    'merge_intelligent',    // AI-assisted intelligent merge
    'merge_additive',       // Combine both datasets
    'user_choice',          // Let user decide
    'therapist_review',     // Flag for therapist review
    'family_consensus',     // Family members decide
  ]),

  // Fallback strategy
  fallbackStrategy: z.string().optional(),

  // Performance requirements
  maxResolutionTime: z.number(), // ms
  complexityScore: z.number().min(0).max(1), // 0 = simple, 1 = complex

  // Validation
  validationRequired: z.boolean(),
  rollbackSupported: z.boolean(),
});

export type ConflictResolutionStrategy = z.infer<typeof ConflictResolutionStrategySchema>;

/**
 * Active Conflict Schema
 */
export const ActiveConflictSchema = z.object({
  id: z.string(),
  conflictType: ConflictTypeSchema,
  context: ConflictContextSchema,
  therapeuticImpact: TherapeuticImpactSchema,

  // Conflict data
  localData: z.any(),
  remoteData: z.any(),
  originalData: z.any().optional(), // Pre-conflict state

  // Resolution process
  strategy: ConflictResolutionStrategySchema,
  resolutionState: z.enum(['detected', 'analyzing', 'resolving', 'user_input', 'resolved', 'failed']),
  resolutionProgress: z.number().min(0).max(1),

  // Resolution result
  resolvedData: z.any().optional(),
  resolutionMethod: z.string().optional(),
  resolvedAt: z.string().optional(), // ISO timestamp
  resolutionTime: z.number().optional(), // ms

  // User interaction
  userNotified: z.boolean(),
  userResponse: z.object({
    choice: z.string().optional(),
    timestamp: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    notes: z.string().optional(),
  }).optional(),

  // Therapeutic guidance
  therapeuticGuidance: z.object({
    recommendation: z.string(),
    reasoning: z.string(),
    alternativeOptions: z.array(z.string()),
    clinicalNotes: z.string().optional(),
  }).optional(),

  // Quality assurance
  resolutionQuality: z.object({
    dataIntegrityScore: z.number().min(0).max(1),
    userSatisfactionScore: z.number().min(0).max(1).optional(),
    therapeuticAlignmentScore: z.number().min(0).max(1),
    performanceScore: z.number().min(0).max(1),
  }).optional(),

  // Metadata
  retryCount: z.number().default(0),
  maxRetries: z.number().default(3),
  escalated: z.boolean().default(false),
  escalationReason: z.string().optional(),
});

export type ActiveConflict = z.infer<typeof ActiveConflictSchema>;

/**
 * Resolution Analytics Schema
 */
export const ResolutionAnalyticsSchema = z.object({
  // Performance metrics
  totalConflicts: z.number().default(0),
  resolvedConflicts: z.number().default(0),
  failedConflicts: z.number().default(0),
  escalatedConflicts: z.number().default(0),

  // Timing metrics
  averageResolutionTime: z.number().default(0), // ms
  medianResolutionTime: z.number().default(0),  // ms
  p95ResolutionTime: z.number().default(0),     // ms
  maxResolutionTime: z.number().default(0),     // ms

  // Strategy effectiveness
  strategySuccess: z.record(z.string(), z.object({
    attempts: z.number(),
    successes: z.number(),
    failures: z.number(),
    averageTime: z.number(),
    successRate: z.number(),
  })),

  // Therapeutic impact tracking
  therapeuticImpactDistribution: z.record(z.string(), z.number()),
  clinicalRelevanceDistribution: z.record(z.string(), z.number()),

  // User interaction metrics
  userChoiceAccuracy: z.number().default(0), // How often user choices align with therapeutic goals
  userResponseTime: z.number().default(0),   // Average time for user to respond
  userSatisfactionScore: z.number().default(0),

  // Quality metrics
  dataIntegrityMaintained: z.number().default(0), // Percentage
  therapeuticContinuityMaintained: z.number().default(0),
  performanceTargetsMet: z.number().default(0),

  // Trend analysis
  conflictTrends: z.array(z.object({
    date: z.string(), // ISO date
    conflictCount: z.number(),
    averageResolutionTime: z.number(),
    successRate: z.number(),
  })),

  // Last updated
  lastUpdated: z.string(), // ISO timestamp
  reportingPeriod: z.object({
    start: z.string(), // ISO timestamp
    end: z.string(),   // ISO timestamp
  }),
});

export type ResolutionAnalytics = z.infer<typeof ResolutionAnalyticsSchema>;

/**
 * Conflict Resolution Store Interface
 */
export interface ConflictResolutionStore {
  // Core state
  activeConflicts: ActiveConflict[];
  resolutionStrategies: Record<string, ConflictResolutionStrategy>;
  analytics: ResolutionAnalytics;

  // Configuration
  globalSettings: {
    autoResolutionEnabled: boolean;
    maxConcurrentConflicts: number;
    therapeuticPriorityEnabled: boolean;
    crisisOverrideEnabled: boolean;
    userGuidanceLevel: 'minimal' | 'standard' | 'detailed' | 'therapeutic';
    performanceTargetMs: number;
  };

  // AI assistance
  aiResolutionEngine: {
    enabled: boolean;
    modelVersion: string;
    confidenceThreshold: number;
    learningEnabled: boolean;
    therapeuticKnowledgeBase: any;
  };

  // Core conflict management actions
  detectConflict: (localData: any, remoteData: any, context: ConflictContext) => Promise<string>;
  analyzeConflict: (conflictId: string) => Promise<TherapeuticImpact>;
  resolveConflict: (conflictId: string, method?: string) => Promise<any>;
  escalateConflict: (conflictId: string, reason: string) => Promise<void>;

  // Strategy management
  selectResolutionStrategy: (conflict: ActiveConflict) => ConflictResolutionStrategy;
  updateResolutionStrategy: (strategyId: string, updates: Partial<ConflictResolutionStrategy>) => void;
  addCustomStrategy: (strategy: ConflictResolutionStrategy) => void;

  // Resolution methods
  resolveWithLocalPriority: (conflictId: string) => Promise<any>;
  resolveWithRemotePriority: (conflictId: string) => Promise<any>;
  resolveWithTimestampPriority: (conflictId: string) => Promise<any>;
  resolveWithCrisisPriority: (conflictId: string) => Promise<any>;
  resolveWithTherapeuticPriority: (conflictId: string) => Promise<any>;
  resolveWithIntelligentMerge: (conflictId: string) => Promise<any>;
  resolveWithUserChoice: (conflictId: string, userChoice: any) => Promise<any>;

  // User interaction
  requestUserGuidance: (conflictId: string) => Promise<void>;
  submitUserChoice: (conflictId: string, choice: any, confidence?: number) => Promise<void>;
  getTherapeuticGuidance: (conflictId: string) => Promise<any>;

  // AI-assisted resolution
  getAIRecommendation: (conflictId: string) => Promise<any>;
  trainAIModel: (resolutionHistory: any[]) => Promise<void>;
  validateAIRecommendation: (conflictId: string, recommendation: any) => Promise<boolean>;

  // Performance monitoring
  recordResolutionMetric: (conflictId: string, metric: string, value: number) => void;
  getPerformanceReport: () => any;
  optimizeResolutionPerformance: () => Promise<void>;

  // Analytics and insights
  generateAnalyticsReport: (timeRange?: { start: string; end: string }) => ResolutionAnalytics;
  getConflictTrends: () => any[];
  getStrategyEffectiveness: () => any;
  getTherapeuticImpactInsights: () => any;

  // Integration actions
  integrateWithSyncStore: (syncStore: any) => void;
  integrateWithCrisisStore: (crisisStore: any) => void;
  integrateWithAssessmentStore: (assessmentStore: any) => void;

  // Internal helpers
  _internal: {
    resolutionTimers: Map<string, NodeJS.Timeout>;
    aiProcessingQueue: Map<string, any>;
    userNotificationQueue: Map<string, any>;
    storeIntegrations: Map<string, any>;
    performanceMetrics: Map<string, number[]>;
  };
}

/**
 * Default Resolution Strategies
 */
const DEFAULT_RESOLUTION_STRATEGIES: Record<string, ConflictResolutionStrategy> = {
  crisis_priority: {
    strategyId: 'crisis_priority',
    strategyName: 'Crisis Data Priority',
    description: 'Crisis-related data always takes precedence to ensure user safety',
    autoResolve: true,
    requiresUserInput: false,
    therapistGuidance: false,
    aiAssisted: false,
    conflictTypes: ['crisis_override', 'data_divergence', 'timestamp_conflict'],
    dataTypes: ['crisis', 'assessment', 'session'],
    urgencyLevels: ['high', 'emergency'],
    resolutionMethod: 'crisis_priority',
    maxResolutionTime: 100, // 100ms for crisis
    complexityScore: 0.2,
    validationRequired: true,
    rollbackSupported: false,
  },

  therapeutic_priority: {
    strategyId: 'therapeutic_priority',
    strategyName: 'Therapeutic Data Priority',
    description: 'Prioritize data that maintains therapeutic continuity and progress',
    autoResolve: true,
    requiresUserInput: false,
    therapistGuidance: true,
    aiAssisted: true,
    conflictTypes: ['therapeutic_priority', 'session_conflict', 'progress_conflict'],
    dataTypes: ['session', 'progress', 'assessment'],
    urgencyLevels: ['medium', 'high'],
    resolutionMethod: 'therapeutic_priority',
    maxResolutionTime: 500,
    complexityScore: 0.6,
    validationRequired: true,
    rollbackSupported: true,
  },

  intelligent_merge: {
    strategyId: 'intelligent_merge',
    strategyName: 'AI-Assisted Intelligent Merge',
    description: 'Use AI to intelligently merge conflicting data while preserving therapeutic value',
    autoResolve: true,
    requiresUserInput: false,
    therapistGuidance: true,
    aiAssisted: true,
    conflictTypes: ['data_divergence', 'version_mismatch', 'session_conflict'],
    dataTypes: ['user_profile', 'session', 'progress'],
    urgencyLevels: ['low', 'medium'],
    resolutionMethod: 'merge_intelligent',
    maxResolutionTime: 1000,
    complexityScore: 0.8,
    validationRequired: true,
    rollbackSupported: true,
  },

  user_guided: {
    strategyId: 'user_guided',
    strategyName: 'User-Guided Resolution',
    description: 'Present options to user with therapeutic guidance for informed decision',
    autoResolve: false,
    requiresUserInput: true,
    therapistGuidance: true,
    aiAssisted: true,
    conflictTypes: ['privacy_conflict', 'family_conflict', 'assessment_conflict'],
    dataTypes: ['user_profile', 'family', 'privacy'],
    urgencyLevels: ['low', 'medium'],
    resolutionMethod: 'user_choice',
    maxResolutionTime: 30000, // 30 seconds for user response
    complexityScore: 0.4,
    validationRequired: false,
    rollbackSupported: true,
  },

  timestamp_fallback: {
    strategyId: 'timestamp_fallback',
    strategyName: 'Timestamp-Based Fallback',
    description: 'Fallback strategy using most recent timestamp when other methods fail',
    autoResolve: true,
    requiresUserInput: false,
    therapistGuidance: false,
    aiAssisted: false,
    conflictTypes: ['timestamp_conflict', 'version_mismatch'],
    dataTypes: ['user_profile', 'session', 'progress', 'assessment'],
    urgencyLevels: ['low', 'medium', 'high'],
    resolutionMethod: 'timestamp_priority',
    maxResolutionTime: 200,
    complexityScore: 0.1,
    validationRequired: false,
    rollbackSupported: true,
  },
};

/**
 * Create Conflict Resolution Store
 */
export const useConflictResolutionStore = create<ConflictResolutionStore>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        activeConflicts: [],
        resolutionStrategies: DEFAULT_RESOLUTION_STRATEGIES,
        analytics: {
          totalConflicts: 0,
          resolvedConflicts: 0,
          failedConflicts: 0,
          escalatedConflicts: 0,
          averageResolutionTime: 0,
          medianResolutionTime: 0,
          p95ResolutionTime: 0,
          maxResolutionTime: 0,
          strategySuccess: {},
          therapeuticImpactDistribution: {},
          clinicalRelevanceDistribution: {},
          userChoiceAccuracy: 0,
          userResponseTime: 0,
          userSatisfactionScore: 0,
          dataIntegrityMaintained: 0,
          therapeuticContinuityMaintained: 0,
          performanceTargetsMet: 0,
          conflictTrends: [],
          lastUpdated: new Date().toISOString(),
          reportingPeriod: {
            start: new Date().toISOString(),
            end: new Date().toISOString(),
          },
        },

        globalSettings: {
          autoResolutionEnabled: true,
          maxConcurrentConflicts: 10,
          therapeuticPriorityEnabled: true,
          crisisOverrideEnabled: true,
          userGuidanceLevel: 'therapeutic',
          performanceTargetMs: 1000,
        },

        aiResolutionEngine: {
          enabled: true,
          modelVersion: '1.0',
          confidenceThreshold: 0.8,
          learningEnabled: true,
          therapeuticKnowledgeBase: {},
        },

        _internal: {
          resolutionTimers: new Map(),
          aiProcessingQueue: new Map(),
          userNotificationQueue: new Map(),
          storeIntegrations: new Map(),
          performanceMetrics: new Map(),
        },

        // Core conflict management actions
        detectConflict: async (localData, remoteData, context) => {
          const conflictId = `conflict_${Date.now()}_${Math.random()}`;
          const startTime = performance.now();

          // Determine conflict type
          const conflictType = get()._determineConflictType(localData, remoteData, context);

          // Assess therapeutic impact
          const therapeuticImpact = await get()._assessTherapeuticImpact(
            conflictType,
            localData,
            remoteData,
            context
          );

          // Select resolution strategy
          const strategy = get().selectResolutionStrategy({
            id: conflictId,
            conflictType,
            context,
            therapeuticImpact,
            localData,
            remoteData,
          } as ActiveConflict);

          const conflict: ActiveConflict = {
            id: conflictId,
            conflictType,
            context,
            therapeuticImpact,
            localData,
            remoteData,
            strategy,
            resolutionState: 'detected',
            resolutionProgress: 0,
            userNotified: false,
            retryCount: 0,
            maxRetries: 3,
            escalated: false,
          };

          set((state) => {
            state.activeConflicts.push(conflict);
            state.analytics.totalConflicts += 1;
          });

          // Record detection time
          const detectionTime = performance.now() - startTime;
          get().recordResolutionMetric(conflictId, 'detection_time', detectionTime);

          // Start resolution process
          if (strategy.autoResolve && !strategy.requiresUserInput) {
            // Auto-resolve if strategy allows
            get().resolveConflict(conflictId);
          } else if (strategy.requiresUserInput) {
            // Request user guidance
            await get().requestUserGuidance(conflictId);
          }

          return conflictId;
        },

        analyzeConflict: async (conflictId) => {
          const conflict = get().activeConflicts.find(c => c.id === conflictId);
          if (!conflict) {
            throw new Error('Conflict not found');
          }

          set((state) => {
            const conflictIndex = state.activeConflicts.findIndex(c => c.id === conflictId);
            if (conflictIndex !== -1) {
              state.activeConflicts[conflictIndex].resolutionState = 'analyzing';
              state.activeConflicts[conflictIndex].resolutionProgress = 0.1;
            }
          });

          // Perform deep analysis
          const analysis = await get()._performDeepAnalysis(conflict);

          set((state) => {
            const conflictIndex = state.activeConflicts.findIndex(c => c.id === conflictId);
            if (conflictIndex !== -1) {
              state.activeConflicts[conflictIndex].therapeuticImpact = analysis.therapeuticImpact;
              state.activeConflicts[conflictIndex].resolutionProgress = 0.3;
            }
          });

          return analysis.therapeuticImpact;
        },

        resolveConflict: async (conflictId, method) => {
          const startTime = performance.now();
          const conflict = get().activeConflicts.find(c => c.id === conflictId);

          if (!conflict) {
            throw new Error('Conflict not found');
          }

          set((state) => {
            const conflictIndex = state.activeConflicts.findIndex(c => c.id === conflictId);
            if (conflictIndex !== -1) {
              state.activeConflicts[conflictIndex].resolutionState = 'resolving';
              state.activeConflicts[conflictIndex].resolutionProgress = 0.5;
            }
          });

          try {
            let resolvedData;
            const resolutionMethod = method || conflict.strategy.resolutionMethod;

            switch (resolutionMethod) {
              case 'crisis_priority':
                resolvedData = await get().resolveWithCrisisPriority(conflictId);
                break;
              case 'therapeutic_priority':
                resolvedData = await get().resolveWithTherapeuticPriority(conflictId);
                break;
              case 'merge_intelligent':
                resolvedData = await get().resolveWithIntelligentMerge(conflictId);
                break;
              case 'timestamp_priority':
                resolvedData = await get().resolveWithTimestampPriority(conflictId);
                break;
              case 'local_wins':
                resolvedData = await get().resolveWithLocalPriority(conflictId);
                break;
              case 'remote_wins':
                resolvedData = await get().resolveWithRemotePriority(conflictId);
                break;
              case 'user_choice':
                // User choice handled separately
                return;
              default:
                throw new Error(`Unknown resolution method: ${resolutionMethod}`);
            }

            const resolutionTime = performance.now() - startTime;

            // Validate resolution
            const isValid = await get()._validateResolution(conflict, resolvedData);
            if (!isValid) {
              throw new Error('Resolution validation failed');
            }

            // Update conflict with resolution
            set((state) => {
              const conflictIndex = state.activeConflicts.findIndex(c => c.id === conflictId);
              if (conflictIndex !== -1) {
                state.activeConflicts[conflictIndex].resolutionState = 'resolved';
                state.activeConflicts[conflictIndex].resolutionProgress = 1;
                state.activeConflicts[conflictIndex].resolvedData = resolvedData;
                state.activeConflicts[conflictIndex].resolutionMethod = resolutionMethod;
                state.activeConflicts[conflictIndex].resolvedAt = new Date().toISOString();
                state.activeConflicts[conflictIndex].resolutionTime = resolutionTime;
              }

              // Update analytics
              state.analytics.resolvedConflicts += 1;
              state.analytics.averageResolutionTime =
                (state.analytics.averageResolutionTime * (state.analytics.resolvedConflicts - 1) + resolutionTime) /
                state.analytics.resolvedConflicts;
            });

            // Record metrics
            get().recordResolutionMetric(conflictId, 'resolution_time', resolutionTime);
            get().recordResolutionMetric(conflictId, 'success', 1);

            // Apply resolved data to stores
            await get()._applyResolvedData(conflict, resolvedData);

            // Clean up resolved conflict after a delay
            setTimeout(() => {
              set((state) => {
                state.activeConflicts = state.activeConflicts.filter(c => c.id !== conflictId);
              });
            }, 5000); // Keep for 5 seconds for potential rollback

            return resolvedData;

          } catch (error) {
            console.error(`Conflict resolution failed for ${conflictId}:`, error);

            set((state) => {
              const conflictIndex = state.activeConflicts.findIndex(c => c.id === conflictId);
              if (conflictIndex !== -1) {
                state.activeConflicts[conflictIndex].resolutionState = 'failed';
                state.activeConflicts[conflictIndex].retryCount += 1;
              }

              state.analytics.failedConflicts += 1;
            });

            get().recordResolutionMetric(conflictId, 'failure', 1);

            // Retry or escalate
            if (conflict.retryCount < conflict.maxRetries) {
              // Try fallback strategy
              const fallbackStrategy = get().resolutionStrategies[conflict.strategy.fallbackStrategy || 'timestamp_fallback'];
              if (fallbackStrategy) {
                return get().resolveConflict(conflictId, fallbackStrategy.resolutionMethod);
              }
            } else {
              // Escalate
              await get().escalateConflict(conflictId, 'max_retries_exceeded');
            }

            throw error;
          }
        },

        escalateConflict: async (conflictId, reason) => {
          set((state) => {
            const conflictIndex = state.activeConflicts.findIndex(c => c.id === conflictId);
            if (conflictIndex !== -1) {
              state.activeConflicts[conflictIndex].escalated = true;
              state.activeConflicts[conflictIndex].escalationReason = reason;
              state.activeConflicts[conflictIndex].resolutionState = 'user_input';
            }

            state.analytics.escalatedConflicts += 1;
          });

          // Request user guidance for escalated conflict
          await get().requestUserGuidance(conflictId);
        },

        // Strategy management
        selectResolutionStrategy: (conflict) => {
          const strategies = Object.values(get().resolutionStrategies);

          // Crisis override - highest priority
          if (conflict.context.crisisActive && conflict.context.crisisLevel !== 'none') {
            const crisisStrategy = strategies.find(s => s.strategyId === 'crisis_priority');
            if (crisisStrategy && crisisStrategy.conflictTypes.includes(conflict.conflictType)) {
              return crisisStrategy;
            }
          }

          // Therapeutic priority for therapeutic data
          if (get().globalSettings.therapeuticPriorityEnabled &&
              conflict.therapeuticImpact.clinicalRelevance === 'high') {
            const therapeuticStrategy = strategies.find(s => s.strategyId === 'therapeutic_priority');
            if (therapeuticStrategy && therapeuticStrategy.conflictTypes.includes(conflict.conflictType)) {
              return therapeuticStrategy;
            }
          }

          // Find best matching strategy
          const applicableStrategies = strategies.filter(strategy =>
            strategy.conflictTypes.includes(conflict.conflictType) &&
            strategy.urgencyLevels.includes(conflict.therapeuticImpact.urgencyLevel)
          );

          if (applicableStrategies.length === 0) {
            // Fallback to timestamp strategy
            return get().resolutionStrategies.timestamp_fallback;
          }

          // Select strategy with best complexity score for the situation
          const targetComplexity = conflict.therapeuticImpact.level === 'critical' ? 0.8 : 0.4;

          return applicableStrategies.reduce((best, current) => {
            const bestScore = Math.abs(best.complexityScore - targetComplexity);
            const currentScore = Math.abs(current.complexityScore - targetComplexity);
            return currentScore < bestScore ? current : best;
          });
        },

        updateResolutionStrategy: (strategyId, updates) => {
          set((state) => {
            if (state.resolutionStrategies[strategyId]) {
              Object.assign(state.resolutionStrategies[strategyId], updates);
            }
          });
        },

        addCustomStrategy: (strategy) => {
          set((state) => {
            state.resolutionStrategies[strategy.strategyId] = strategy;
          });
        },

        // Resolution methods
        resolveWithLocalPriority: async (conflictId) => {
          const conflict = get().activeConflicts.find(c => c.id === conflictId);
          if (!conflict) throw new Error('Conflict not found');

          return conflict.localData;
        },

        resolveWithRemotePriority: async (conflictId) => {
          const conflict = get().activeConflicts.find(c => c.id === conflictId);
          if (!conflict) throw new Error('Conflict not found');

          return conflict.remoteData;
        },

        resolveWithTimestampPriority: async (conflictId) => {
          const conflict = get().activeConflicts.find(c => c.id === conflictId);
          if (!conflict) throw new Error('Conflict not found');

          const localTimestamp = new Date(conflict.context.localTimestamp).getTime();
          const remoteTimestamp = new Date(conflict.context.remoteTimestamp).getTime();

          return localTimestamp > remoteTimestamp ? conflict.localData : conflict.remoteData;
        },

        resolveWithCrisisPriority: async (conflictId) => {
          const conflict = get().activeConflicts.find(c => c.id === conflictId);
          if (!conflict) throw new Error('Conflict not found');

          // Determine which data has crisis relevance
          const localCrisisRelevance = get()._assessCrisisRelevance(conflict.localData);
          const remoteCrisisRelevance = get()._assessCrisisRelevance(conflict.remoteData);

          if (localCrisisRelevance > remoteCrisisRelevance) {
            return conflict.localData;
          } else if (remoteCrisisRelevance > localCrisisRelevance) {
            return conflict.remoteData;
          } else {
            // Equal crisis relevance, fall back to timestamp
            return get().resolveWithTimestampPriority(conflictId);
          }
        },

        resolveWithTherapeuticPriority: async (conflictId) => {
          const conflict = get().activeConflicts.find(c => c.id === conflictId);
          if (!conflict) throw new Error('Conflict not found');

          // Assess therapeutic value of each data set
          const localTherapeuticValue = await get()._assessTherapeuticValue(conflict.localData, conflict.context);
          const remoteTherapeuticValue = await get()._assessTherapeuticValue(conflict.remoteData, conflict.context);

          if (localTherapeuticValue > remoteTherapeuticValue) {
            return conflict.localData;
          } else if (remoteTherapeuticValue > localTherapeuticValue) {
            return conflict.remoteData;
          } else {
            // Equal therapeutic value, prefer more recent
            return get().resolveWithTimestampPriority(conflictId);
          }
        },

        resolveWithIntelligentMerge: async (conflictId) => {
          const conflict = get().activeConflicts.find(c => c.id === conflictId);
          if (!conflict) throw new Error('Conflict not found');

          if (!get().aiResolutionEngine.enabled) {
            // Fallback to simple merge
            return get()._performSimpleMerge(conflict.localData, conflict.remoteData);
          }

          // Get AI recommendation
          const aiRecommendation = await get().getAIRecommendation(conflictId);

          if (aiRecommendation.confidence >= get().aiResolutionEngine.confidenceThreshold) {
            return aiRecommendation.mergedData;
          } else {
            // AI not confident, fallback to therapeutic priority
            return get().resolveWithTherapeuticPriority(conflictId);
          }
        },

        resolveWithUserChoice: async (conflictId, userChoice) => {
          const conflict = get().activeConflicts.find(c => c.id === conflictId);
          if (!conflict) throw new Error('Conflict not found');

          set((state) => {
            const conflictIndex = state.activeConflicts.findIndex(c => c.id === conflictId);
            if (conflictIndex !== -1) {
              state.activeConflicts[conflictIndex].userResponse = {
                choice: userChoice.choice,
                timestamp: new Date().toISOString(),
                confidence: userChoice.confidence || 0.5,
                notes: userChoice.notes,
              };
            }
          });

          // Apply user choice
          switch (userChoice.choice) {
            case 'local':
              return conflict.localData;
            case 'remote':
              return conflict.remoteData;
            case 'merge':
              return get()._performSimpleMerge(conflict.localData, conflict.remoteData);
            case 'custom':
              return userChoice.customData;
            default:
              throw new Error(`Invalid user choice: ${userChoice.choice}`);
          }
        },

        // User interaction
        requestUserGuidance: async (conflictId) => {
          const conflict = get().activeConflicts.find(c => c.id === conflictId);
          if (!conflict) return;

          // Generate therapeutic guidance
          const guidance = await get().getTherapeuticGuidance(conflictId);

          set((state) => {
            const conflictIndex = state.activeConflicts.findIndex(c => c.id === conflictId);
            if (conflictIndex !== -1) {
              state.activeConflicts[conflictIndex].therapeuticGuidance = guidance;
              state.activeConflicts[conflictIndex].userNotified = true;
              state.activeConflicts[conflictIndex].resolutionState = 'user_input';
            }
          });

          // Queue notification
          get()._internal.userNotificationQueue.set(conflictId, {
            conflictId,
            guidance,
            timestamp: new Date().toISOString(),
          });

          // Set timeout for user response
          const timeout = setTimeout(() => {
            // User didn't respond, use default resolution
            get().resolveConflict(conflictId, 'timestamp_priority');
          }, conflict.strategy.maxResolutionTime);

          get()._internal.resolutionTimers.set(conflictId, timeout);
        },

        submitUserChoice: async (conflictId, choice, confidence) => {
          const timeout = get()._internal.resolutionTimers.get(conflictId);
          if (timeout) {
            clearTimeout(timeout);
            get()._internal.resolutionTimers.delete(conflictId);
          }

          const userChoice = {
            choice: choice.choice,
            confidence: confidence || choice.confidence || 0.5,
            notes: choice.notes,
            customData: choice.customData,
          };

          return get().resolveWithUserChoice(conflictId, userChoice);
        },

        getTherapeuticGuidance: async (conflictId) => {
          const conflict = get().activeConflicts.find(c => c.id === conflictId);
          if (!conflict) return null;

          // Generate context-aware therapeutic guidance
          const guidance = {
            recommendation: get()._generateTherapeuticRecommendation(conflict),
            reasoning: get()._generateTherapeuticReasoning(conflict),
            alternativeOptions: get()._generateAlternativeOptions(conflict),
            clinicalNotes: get()._generateClinicalNotes(conflict),
          };

          return guidance;
        },

        // AI-assisted resolution
        getAIRecommendation: async (conflictId) => {
          const conflict = get().activeConflicts.find(c => c.id === conflictId);
          if (!conflict) throw new Error('Conflict not found');

          if (!get().aiResolutionEngine.enabled) {
            throw new Error('AI resolution engine disabled');
          }

          // Simulate AI processing (in real implementation, this would call an AI service)
          return new Promise((resolve) => {
            setTimeout(() => {
              const recommendation = {
                mergedData: get()._performSimpleMerge(conflict.localData, conflict.remoteData),
                confidence: Math.random() * 0.4 + 0.6, // Random confidence between 0.6-1.0
                reasoning: 'AI merged data based on therapeutic value and timestamp priority',
                alternatives: [
                  { method: 'local_wins', confidence: 0.3 },
                  { method: 'remote_wins', confidence: 0.2 },
                ],
              };
              resolve(recommendation);
            }, 100); // Simulate processing time
          });
        },

        trainAIModel: async (resolutionHistory) => {
          if (!get().aiResolutionEngine.learningEnabled) return;

          // Train AI model with resolution history
          // In real implementation, this would update the AI model
          console.log('Training AI model with', resolutionHistory.length, 'resolution examples');
        },

        validateAIRecommendation: async (conflictId, recommendation) => {
          const conflict = get().activeConflicts.find(c => c.id === conflictId);
          if (!conflict) return false;

          // Validate AI recommendation against therapeutic principles
          const therapeuticScore = await get()._assessTherapeuticValue(
            recommendation.mergedData,
            conflict.context
          );

          return therapeuticScore > 0.7; // Require high therapeutic value
        },

        // Performance monitoring
        recordResolutionMetric: (conflictId, metric, value) => {
          const metrics = get()._internal.performanceMetrics.get(metric) || [];
          metrics.push(value);

          // Keep only last 100 metrics
          if (metrics.length > 100) {
            metrics.shift();
          }

          get()._internal.performanceMetrics.set(metric, metrics);

          // Update analytics if resolution completed
          if (metric === 'resolution_time') {
            set((state) => {
              const allTimes = get()._internal.performanceMetrics.get('resolution_time') || [];
              state.analytics.averageResolutionTime = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
              state.analytics.maxResolutionTime = Math.max(...allTimes);

              // Calculate percentiles
              const sortedTimes = [...allTimes].sort((a, b) => a - b);
              const p95Index = Math.floor(sortedTimes.length * 0.95);
              const medianIndex = Math.floor(sortedTimes.length * 0.5);

              state.analytics.p95ResolutionTime = sortedTimes[p95Index] || 0;
              state.analytics.medianResolutionTime = sortedTimes[medianIndex] || 0;

              // Check if performance targets are met
              const targetsMet = allTimes.filter(t => t <= state.globalSettings.performanceTargetMs).length;
              state.analytics.performanceTargetsMet = targetsMet / allTimes.length;
            });
          }
        },

        getPerformanceReport: () => {
          const state = get();
          return {
            analytics: state.analytics,
            currentActiveConflicts: state.activeConflicts.length,
            averageResolutionTime: state.analytics.averageResolutionTime,
            performanceTargetsMet: state.analytics.performanceTargetsMet,
            recentMetrics: Object.fromEntries(
              Array.from(state._internal.performanceMetrics.entries()).map(([key, values]) => [
                key,
                values.slice(-10) // Last 10 values
              ])
            ),
          };
        },

        optimizeResolutionPerformance: async () => {
          const analytics = get().analytics;

          // Adjust strategies based on performance
          if (analytics.performanceTargetsMet < 0.8) {
            // Performance below target, favor simpler strategies
            set((state) => {
              Object.values(state.resolutionStrategies).forEach(strategy => {
                if (strategy.complexityScore > 0.5) {
                  strategy.maxResolutionTime = Math.max(100, strategy.maxResolutionTime * 0.8);
                }
              });
            });
          }

          // Adjust AI confidence threshold based on accuracy
          if (analytics.userChoiceAccuracy > 0.9) {
            // AI is performing well, lower threshold
            set((state) => {
              state.aiResolutionEngine.confidenceThreshold = Math.max(0.6, state.aiResolutionEngine.confidenceThreshold - 0.1);
            });
          } else if (analytics.userChoiceAccuracy < 0.7) {
            // AI needs improvement, raise threshold
            set((state) => {
              state.aiResolutionEngine.confidenceThreshold = Math.min(0.9, state.aiResolutionEngine.confidenceThreshold + 0.1);
            });
          }

          // Clear old conflicts
          set((state) => {
            const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            state.activeConflicts = state.activeConflicts.filter(
              c => c.resolutionState !== 'resolved' || (c.resolvedAt && c.resolvedAt > hourAgo)
            );
          });
        },

        // Analytics and insights
        generateAnalyticsReport: (timeRange) => {
          // Generate comprehensive analytics report
          const state = get();
          return state.analytics;
        },

        getConflictTrends: () => {
          return get().analytics.conflictTrends;
        },

        getStrategyEffectiveness: () => {
          return get().analytics.strategySuccess;
        },

        getTherapeuticImpactInsights: () => {
          const analytics = get().analytics;
          return {
            impactDistribution: analytics.therapeuticImpactDistribution,
            clinicalRelevance: analytics.clinicalRelevanceDistribution,
            continuityMaintained: analytics.therapeuticContinuityMaintained,
          };
        },

        // Integration actions
        integrateWithSyncStore: (syncStore) => {
          get()._internal.storeIntegrations.set('sync', syncStore);
        },

        integrateWithCrisisStore: (crisisStore) => {
          get()._internal.storeIntegrations.set('crisis', crisisStore);
        },

        integrateWithAssessmentStore: (assessmentStore) => {
          get()._internal.storeIntegrations.set('assessment', assessmentStore);
        },

        // Helper methods
        _determineConflictType: (localData: any, remoteData: any, context: ConflictContext): ConflictType => {
          if (context.crisisActive) {
            return 'crisis_override';
          }

          if (context.dataType === 'assessment' && localData.score !== remoteData.score) {
            return 'assessment_conflict';
          }

          if (context.dataType === 'session' && context.activeSession) {
            return 'session_conflict';
          }

          if (context.therapeuticPhase && localData.progress !== remoteData.progress) {
            return 'therapeutic_priority';
          }

          if (Math.abs(new Date(context.localTimestamp).getTime() - new Date(context.remoteTimestamp).getTime()) > 5000) {
            return 'timestamp_conflict';
          }

          return 'data_divergence';
        },

        _assessTherapeuticImpact: async (conflictType: ConflictType, localData: any, remoteData: any, context: ConflictContext): Promise<TherapeuticImpact> => {
          let level: 'none' | 'minimal' | 'moderate' | 'significant' | 'critical' = 'minimal';
          let urgencyLevel: 'low' | 'medium' | 'high' | 'emergency' = 'low';
          let affectedAreas: string[] = [];

          // Crisis conflicts are always critical
          if (conflictType === 'crisis_override') {
            level = 'critical';
            urgencyLevel = 'emergency';
            affectedAreas = ['crisis_detection', 'therapeutic_relationship'];
          }

          // Assessment conflicts affect progress tracking
          if (conflictType === 'assessment_conflict') {
            level = 'significant';
            urgencyLevel = 'high';
            affectedAreas = ['assessment_scores', 'progress_tracking'];
          }

          // Session conflicts during active sessions are significant
          if (conflictType === 'session_conflict' && context.activeSession) {
            level = 'significant';
            urgencyLevel = 'medium';
            affectedAreas = ['session_continuity', 'therapeutic_relationship'];
          }

          return {
            level,
            description: `${conflictType} conflict with ${level} therapeutic impact`,
            affectedAreas,
            clinicalRelevance: level === 'critical' ? 'critical' : level === 'significant' ? 'high' : 'medium',
            userExperience: level === 'critical' ? 'harmful' : level === 'significant' ? 'disruptive' : 'minor_disruption',
            dataIntegrity: 'maintained',
            urgencyLevel,
          };
        },

        _performDeepAnalysis: async (conflict: ActiveConflict) => {
          // Perform detailed conflict analysis
          const therapeuticImpact = await get()._assessTherapeuticImpact(
            conflict.conflictType,
            conflict.localData,
            conflict.remoteData,
            conflict.context
          );

          return { therapeuticImpact };
        },

        _validateResolution: async (conflict: ActiveConflict, resolvedData: any): Promise<boolean> => {
          // Validate that resolution maintains data integrity and therapeutic value
          if (!resolvedData) return false;

          // Check data structure integrity
          const localKeys = Object.keys(conflict.localData);
          const resolvedKeys = Object.keys(resolvedData);

          const hasRequiredFields = localKeys.every(key => resolvedKeys.includes(key));
          if (!hasRequiredFields) return false;

          // Check therapeutic value
          const therapeuticValue = await get()._assessTherapeuticValue(resolvedData, conflict.context);
          return therapeuticValue > 0.5;
        },

        _applyResolvedData: async (conflict: ActiveConflict, resolvedData: any) => {
          // Apply resolved data to appropriate stores
          const storeType = conflict.context.dataType;
          const integration = get()._internal.storeIntegrations.get(storeType);

          if (integration && integration.setState) {
            integration.setState((state: any) => ({
              ...state,
              ...resolvedData,
            }));
          }
        },

        _assessCrisisRelevance: (data: any): number => {
          // Assess how relevant data is to crisis situations
          let relevance = 0;

          if (data.crisisLevel && data.crisisLevel !== 'none') relevance += 0.5;
          if (data.emergencyContacts) relevance += 0.3;
          if (data.assessmentScore && data.assessmentScore >= 20) relevance += 0.2; // PHQ-9 crisis threshold

          return Math.min(1, relevance);
        },

        _assessTherapeuticValue: async (data: any, context: ConflictContext): Promise<number> => {
          // Assess therapeutic value of data
          let value = 0.5; // Base value

          // Higher value for progress data
          if (data.progress !== undefined) value += 0.2;

          // Higher value for assessment data
          if (data.assessmentScore !== undefined) value += 0.2;

          // Higher value for session data during active sessions
          if (context.activeSession && data.sessionId === context.activeSession.sessionId) {
            value += 0.3;
          }

          // Higher value for more recent data
          if (data.timestamp) {
            const age = Date.now() - new Date(data.timestamp).getTime();
            const recencyScore = Math.max(0, 1 - age / (24 * 60 * 60 * 1000)); // Decay over 24 hours
            value += recencyScore * 0.1;
          }

          return Math.min(1, value);
        },

        _performSimpleMerge: (localData: any, remoteData: any) => {
          // Simple merge strategy - combine objects with remote data taking priority for conflicts
          return {
            ...localData,
            ...remoteData,
            _mergedAt: new Date().toISOString(),
            _mergeStrategy: 'simple',
          };
        },

        _generateTherapeuticRecommendation: (conflict: ActiveConflict): string => {
          switch (conflict.conflictType) {
            case 'crisis_override':
              return 'In crisis situations, prioritize safety and immediate access to crisis resources.';
            case 'assessment_conflict':
              return 'Assessment data accuracy is crucial for therapeutic progress. Consider the context in which each assessment was completed.';
            case 'session_conflict':
              return 'Maintain session continuity to support therapeutic progress and user engagement.';
            default:
              return 'Consider which option best supports your therapeutic journey and current needs.';
          }
        },

        _generateTherapeuticReasoning: (conflict: ActiveConflict): string => {
          return `This conflict involves ${conflict.context.dataType} data and may impact ${conflict.therapeuticImpact.affectedAreas.join(', ')}. The therapeutic impact is assessed as ${conflict.therapeuticImpact.level}.`;
        },

        _generateAlternativeOptions: (conflict: ActiveConflict): string[] => {
          const options = [
            'Use the most recent data',
            'Combine both datasets',
            'Keep your device\'s data',
            'Use the other device\'s data',
          ];

          if (conflict.conflictType === 'assessment_conflict') {
            options.push('Review both assessments and choose the most accurate');
          }

          if (conflict.context.crisisActive) {
            options.push('Prioritize crisis-safe data');
          }

          return options;
        },

        _generateClinicalNotes: (conflict: ActiveConflict): string => {
          if (conflict.therapeuticImpact.level === 'critical') {
            return 'This conflict requires immediate attention as it may impact user safety or therapeutic progress.';
          }

          if (conflict.conflictType === 'assessment_conflict') {
            return 'Assessment conflicts should be resolved carefully to maintain accurate progress tracking.';
          }

          return 'This conflict can be resolved automatically while maintaining therapeutic value.';
        },
      })),
      {
        name: 'being-conflict-resolution-store',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          resolutionStrategies: state.resolutionStrategies,
          analytics: state.analytics,
          globalSettings: state.globalSettings,
          aiResolutionEngine: state.aiResolutionEngine,
        }),
      }
    )
  )
);

// Conflict Resolution Selectors
export const conflictResolutionSelectors = {
  // Conflict selectors
  getActiveConflicts: (state: ConflictResolutionStore) => state.activeConflicts,
  getCriticalConflicts: (state: ConflictResolutionStore) =>
    state.activeConflicts.filter(c => c.therapeuticImpact.level === 'critical'),
  getPendingUserInput: (state: ConflictResolutionStore) =>
    state.activeConflicts.filter(c => c.resolutionState === 'user_input'),

  // Performance selectors
  getResolutionMetrics: (state: ConflictResolutionStore) => state.analytics,
  getPerformanceScore: (state: ConflictResolutionStore) => ({
    resolutionRate: state.analytics.resolvedConflicts / (state.analytics.totalConflicts || 1),
    averageTime: state.analytics.averageResolutionTime,
    performanceTargetsMet: state.analytics.performanceTargetsMet,
  }),

  // Strategy selectors
  getAvailableStrategies: (state: ConflictResolutionStore) => state.resolutionStrategies,
  getBestStrategy: (state: ConflictResolutionStore, conflictType: ConflictType) =>
    Object.values(state.resolutionStrategies).find(s => s.conflictTypes.includes(conflictType)),

  // AI selectors
  isAIEnabled: (state: ConflictResolutionStore) => state.aiResolutionEngine.enabled,
  getAIConfidenceThreshold: (state: ConflictResolutionStore) => state.aiResolutionEngine.confidenceThreshold,
};

// Conflict Resolution Hooks
export const useConflictResolution = () => {
  const store = useConflictResolutionStore();

  return {
    // State
    activeConflicts: store.activeConflicts,
    resolutionStrategies: store.resolutionStrategies,
    analytics: store.analytics,
    globalSettings: store.globalSettings,

    // Core actions
    detectConflict: store.detectConflict,
    analyzeConflict: store.analyzeConflict,
    resolveConflict: store.resolveConflict,
    escalateConflict: store.escalateConflict,

    // User interaction
    requestUserGuidance: store.requestUserGuidance,
    submitUserChoice: store.submitUserChoice,
    getTherapeuticGuidance: store.getTherapeuticGuidance,

    // AI assistance
    getAIRecommendation: store.getAIRecommendation,
    validateAIRecommendation: store.validateAIRecommendation,

    // Performance
    getPerformanceReport: store.getPerformanceReport,
    optimizeResolutionPerformance: store.optimizeResolutionPerformance,

    // Analytics
    generateAnalyticsReport: store.generateAnalyticsReport,
    getConflictTrends: store.getConflictTrends,
    getStrategyEffectiveness: store.getStrategyEffectiveness,

    // Integration
    integrateWithSyncStore: store.integrateWithSyncStore,
    integrateWithCrisisStore: store.integrateWithCrisisStore,
    integrateWithAssessmentStore: store.integrateWithAssessmentStore,

    // Selectors
    ...conflictResolutionSelectors,
  };
};

export default useConflictResolutionStore;