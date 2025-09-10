/**
 * FullMind Clinical Export Process Store
 * Clinical-grade Zustand store for managing export operations, progress tracking,
 * and real-time status updates with therapeutic data processing guarantees.
 * 
 * Features:
 * - Real-time export progress tracking with clinical accuracy
 * - Concurrent export operation management with resource optimization
 * - Queue-based export scheduling with priority handling
 * - Clinical-grade error recovery and retry mechanisms
 * - Performance monitoring and resource management
 * - Integration with export configuration and history stores
 * - Memory-efficient handling of large therapeutic datasets
 */

'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  ExportRequest,
  ExportResult,
  ExportOperation,
  ExportProgress,
  ExportID,
  UserID,
  ISO8601Timestamp,
  ClinicalExportData,
  ExportFormat,
  ExportPerformanceMetrics,
  ExportError,
  ExportErrorCode,
  ErrorSeverity,
  ClinicalImpact,
  RecoveryStrategy,
  RecoveryType,
  PerformanceRequirements,
} from '../types/clinical-export';

// ============================================================================
// PROCESS STORE INTERFACES
// ============================================================================

/**
 * Export operation state with clinical tracking
 */
export interface ExportOperation {
  readonly id: ExportID;
  readonly userId: UserID;
  readonly request: ExportRequest;
  readonly status: ExportOperationStatus;
  readonly progress: ExportProgress;
  readonly startedAt: ISO8601Timestamp;
  readonly estimatedCompletion?: ISO8601Timestamp;
  readonly completedAt?: ISO8601Timestamp;
  readonly result?: ExportResult;
  readonly error?: ExportError;
  readonly cancellationToken?: AbortController;
  readonly retryCount: number;
  readonly clinicalPriority: 'low' | 'normal' | 'high' | 'critical';
  readonly performanceMetrics?: ExportPerformanceMetrics;
  readonly recoveryStrategy?: RecoveryStrategy;
}

/**
 * Export operation status
 */
export type ExportOperationStatus = 
  | 'queued'
  | 'validating'
  | 'processing' 
  | 'generating'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';

/**
 * Export progress with clinical validation stages
 */
export interface ExportProgress {
  readonly stage: ExportProcessingStage;
  readonly percentage: number; // 0-100
  readonly processedRecords: number;
  readonly totalRecords: number;
  readonly currentOperation: string;
  readonly estimatedTimeRemaining?: number; // milliseconds
  readonly throughput?: number; // records per second
  readonly memoryUsage?: number; // bytes
  readonly validationErrors: number;
  readonly clinicalWarnings: number;
  readonly lastUpdate: ISO8601Timestamp;
}

/**
 * Export processing stages
 */
export type ExportProcessingStage = 
  | 'initializing'
  | 'consent-validation'
  | 'data-collection'
  | 'clinical-validation'
  | 'data-transformation'
  | 'format-generation'
  | 'quality-assurance'
  | 'finalization'
  | 'cleanup';

/**
 * Export queue entry with priority
 */
export interface ExportQueueEntry {
  readonly request: ExportRequest;
  readonly priority: number; // Higher number = higher priority
  readonly queuedAt: ISO8601Timestamp;
  readonly estimatedDuration: number; // milliseconds
  readonly resourceRequirements: PerformanceRequirements;
  readonly clinicalPriority: ExportOperation['clinicalPriority'];
}

/**
 * Resource utilization tracking
 */
export interface ResourceUtilization {
  readonly cpuUsage: number; // 0-1
  readonly memoryUsage: number; // bytes
  readonly activeOperations: number;
  readonly queueLength: number;
  readonly averageThroughput: number; // records per second
  readonly peakMemoryUsage: number; // bytes
  readonly lastUpdated: ISO8601Timestamp;
}

/**
 * Export process store state
 */
export interface ExportProcessState {
  // Active operations tracking
  readonly activeExports: Map<ExportID, ExportOperation>;
  readonly exportQueue: readonly ExportQueueEntry[];
  readonly completedExports: Map<ExportID, ExportResult>;
  
  // Progress and status tracking
  readonly exportProgress: Map<ExportID, ExportProgress>;
  readonly operationStatuses: Map<ExportID, ExportOperationStatus>;
  
  // Resource management
  readonly resourceUtilization: ResourceUtilization;
  readonly maxConcurrentExports: number;
  readonly memoryThreshold: number; // bytes
  readonly performanceMode: 'standard' | 'optimized' | 'clinical-safe';
  
  // Queue management
  readonly queueProcessingEnabled: boolean;
  readonly nextProcessingTime?: ISO8601Timestamp;
  readonly priorityWeights: {
    readonly clinical: number;
    readonly performance: number;
    readonly user: number;
    readonly system: number;
  };
  
  // Error handling and recovery
  readonly failedOperations: Map<ExportID, ExportError>;
  readonly recoveryAttempts: Map<ExportID, number>;
  readonly maxRetryAttempts: number;
  readonly autoRecoveryEnabled: boolean;
  
  // Performance monitoring
  readonly performanceHistory: readonly PerformanceSnapshot[];
  readonly averageProcessingTime: number; // milliseconds
  readonly successRate: number; // 0-1
  readonly lastPerformanceCheck: ISO8601Timestamp;
  
  // Global state
  readonly isProcessing: boolean;
  readonly systemHealthy: boolean;
  readonly lastError?: ExportError;
  readonly maintenanceMode: boolean;
}

/**
 * Performance snapshot for monitoring
 */
export interface PerformanceSnapshot {
  readonly timestamp: ISO8601Timestamp;
  readonly activeOperations: number;
  readonly queueLength: number;
  readonly memoryUsage: number;
  readonly cpuUsage: number;
  readonly throughput: number;
  readonly errorRate: number;
}

/**
 * Export process store actions
 */
export interface ExportProcessActions {
  // Export operation management
  startExport: (request: ExportRequest) => Promise<ExportID>;
  cancelExport: (id: ExportID) => Promise<void>;
  pauseExport: (id: ExportID) => Promise<void>;
  resumeExport: (id: ExportID) => Promise<void>;
  retryExport: (id: ExportID) => Promise<void>;
  
  // Progress tracking
  updateProgress: (id: ExportID, progress: Partial<ExportProgress>) => void;
  setOperationStatus: (id: ExportID, status: ExportOperationStatus) => void;
  completeExport: (id: ExportID, result: ExportResult) => void;
  failExport: (id: ExportID, error: ExportError) => void;
  
  // Queue management
  addToQueue: (entry: ExportQueueEntry) => void;
  removeFromQueue: (requestId: string) => void;
  prioritizeExport: (requestId: string, priority: number) => void;
  processQueue: () => Promise<void>;
  clearQueue: () => void;
  
  // Resource management
  updateResourceUtilization: (resources: Partial<ResourceUtilization>) => void;
  setMaxConcurrentExports: (max: number) => void;
  setMemoryThreshold: (threshold: number) => void;
  setPerformanceMode: (mode: ExportProcessState['performanceMode']) => void;
  optimizeResources: () => void;
  
  // Error handling and recovery
  handleExportError: (id: ExportID, error: ExportError) => Promise<void>;
  attemptRecovery: (id: ExportID) => Promise<boolean>;
  setAutoRecoveryEnabled: (enabled: boolean) => void;
  clearFailedOperations: () => void;
  
  // Performance monitoring
  recordPerformanceSnapshot: () => void;
  updatePerformanceMetrics: (id: ExportID, metrics: ExportPerformanceMetrics) => void;
  calculateSuccessRate: () => number;
  getSystemHealth: () => boolean;
  
  // System management
  enableMaintenanceMode: () => void;
  disableMaintenanceMode: () => void;
  pauseAllOperations: () => Promise<void>;
  resumeAllOperations: () => Promise<void>;
  cleanupCompletedExports: (olderThan?: ISO8601Timestamp) => void;
  
  // Status queries
  getOperationStatus: (id: ExportID) => ExportOperationStatus | null;
  getOperationProgress: (id: ExportID) => ExportProgress | null;
  isOperationActive: (id: ExportID) => boolean;
  getQueuePosition: (requestId: string) => number;
  getEstimatedWaitTime: (requestId: string) => number;
}

/**
 * Combined export process store interface
 */
export interface ExportProcessStore extends ExportProcessState, ExportProcessActions {}

// ============================================================================
// DEFAULT VALUES AND CONSTANTS
// ============================================================================

const DEFAULT_RESOURCE_UTILIZATION: ResourceUtilization = {
  cpuUsage: 0,
  memoryUsage: 0,
  activeOperations: 0,
  queueLength: 0,
  averageThroughput: 0,
  peakMemoryUsage: 0,
  lastUpdated: new Date().toISOString() as ISO8601Timestamp,
};

const DEFAULT_PRIORITY_WEIGHTS = {
  clinical: 0.4,    // Clinical exports get highest priority
  performance: 0.3, // Performance-critical operations
  user: 0.2,        // User-initiated exports
  system: 0.1,      // System maintenance exports
} as const;

const INITIAL_STATE: ExportProcessState = {
  activeExports: new Map(),
  exportQueue: [],
  completedExports: new Map(),
  exportProgress: new Map(),
  operationStatuses: new Map(),
  resourceUtilization: DEFAULT_RESOURCE_UTILIZATION,
  maxConcurrentExports: 3,
  memoryThreshold: 500_000_000, // 500MB
  performanceMode: 'clinical-safe',
  queueProcessingEnabled: true,
  priorityWeights: DEFAULT_PRIORITY_WEIGHTS,
  failedOperations: new Map(),
  recoveryAttempts: new Map(),
  maxRetryAttempts: 3,
  autoRecoveryEnabled: true,
  performanceHistory: [],
  averageProcessingTime: 0,
  successRate: 1.0,
  lastPerformanceCheck: new Date().toISOString() as ISO8601Timestamp,
  isProcessing: false,
  systemHealthy: true,
  maintenanceMode: false,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique export ID
 */
const generateExportId = (): ExportID => {
  return `export_${Date.now()}_${Math.random().toString(36).substring(2)}` as ExportID;
};

/**
 * Create ISO timestamp
 */
const createTimestamp = (): ISO8601Timestamp => {
  return new Date().toISOString() as ISO8601Timestamp;
};

/**
 * Calculate export priority based on multiple factors
 */
const calculatePriority = (
  request: ExportRequest,
  clinicalPriority: ExportOperation['clinicalPriority'],
  weights: typeof DEFAULT_PRIORITY_WEIGHTS
): number => {
  let priority = 0;
  
  // Clinical priority weight
  const clinicalWeight = {
    'low': 1,
    'normal': 2,
    'high': 3,
    'critical': 4,
  }[clinicalPriority];
  priority += clinicalWeight * weights.clinical * 100;
  
  // Performance requirements weight
  const performanceWeight = request.urgent ? 3 : 1;
  priority += performanceWeight * weights.performance * 100;
  
  // User priority weight
  const userWeight = request.priority || 1;
  priority += userWeight * weights.user * 100;
  
  // System factors weight
  const systemWeight = request.estimatedRecordCount < 1000 ? 2 : 1; // Smaller exports get slight priority
  priority += systemWeight * weights.system * 100;
  
  return priority;
};

/**
 * Estimate export processing time based on request parameters
 */
const estimateProcessingTime = (request: ExportRequest): number => {
  const baseTimeMs = 5000; // 5 seconds base
  const recordTime = request.estimatedRecordCount * 10; // 10ms per record
  const formatMultiplier = {
    'pdf': 3.0,
    'csv': 1.0,
    'json': 1.5,
    'clinical-xml': 2.0,
  }[request.format.type];
  
  return baseTimeMs + (recordTime * formatMultiplier);
};

/**
 * Create performance requirements from request
 */
const createPerformanceRequirements = (request: ExportRequest): PerformanceRequirements => {
  return {
    maxProcessingTime: estimateProcessingTime(request),
    maxMemoryUsage: request.estimatedRecordCount * 1000, // 1KB per record estimate
    chunkSize: Math.min(request.estimatedRecordCount / 10, 1000),
    concurrencyLimit: 1,
    progressReporting: true,
    cancellationSupport: true,
    recoveryStrategy: {
      type: 'automatic-retry',
      automaticRetry: {
        maxAttempts: 3,
        delayMs: 5000,
        exponentialBackoff: true,
      },
      dataRecovery: { enabled: true },
      userNotification: { enabled: true },
      fallbackExport: { enabled: false },
      escalationProcedure: { enabled: true },
    },
  };
};

/**
 * Mock export processing function (would be replaced with actual implementation)
 */
const processExport = async (
  operation: ExportOperation,
  updateProgress: (progress: Partial<ExportProgress>) => void,
  checkCancellation: () => boolean
): Promise<ExportResult> => {
  const stages: ExportProcessingStage[] = [
    'initializing',
    'consent-validation',
    'data-collection',
    'clinical-validation',
    'data-transformation',
    'format-generation',
    'quality-assurance',
    'finalization',
  ];
  
  const totalRecords = operation.request.estimatedRecordCount;
  let processedRecords = 0;
  
  for (let i = 0; i < stages.length; i++) {
    if (checkCancellation()) {
      throw new Error('Export cancelled by user');
    }
    
    const stage = stages[i];
    const stageProgress = ((i + 1) / stages.length) * 100;
    
    updateProgress({
      stage,
      percentage: stageProgress,
      processedRecords: Math.floor((processedRecords / totalRecords) * 100),
      totalRecords,
      currentOperation: `Processing ${stage}`,
      lastUpdate: createTimestamp(),
    });
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
    processedRecords += Math.floor(totalRecords / stages.length);
  }
  
  // Mock successful result
  return {
    id: operation.id,
    success: true,
    data: new Uint8Array(1024), // Mock export data
    format: operation.request.format,
    metadata: {
      exportId: operation.id,
      createdAt: createTimestamp(),
      createdBy: operation.userId,
      version: '1.0.0' as any,
      formatVersion: '1.0.0' as any,
      dataVersion: '1.0.0' as any,
      clinicalVersion: '1.0.0' as any,
      sourceSystem: { name: 'FullMind', version: '1.0.0' },
      generation: { processingTime: Date.now() - new Date(operation.startedAt).getTime() },
      quality: { score: 0.95, issues: [] },
      compliance: { hipaaCompliant: true, auditTrail: [] },
    },
    performanceMetrics: {
      processingTime: Date.now() - new Date(operation.startedAt).getTime(),
      memoryPeak: Math.random() * 100_000_000,
      recordsProcessed: totalRecords,
      throughput: totalRecords / ((Date.now() - new Date(operation.startedAt).getTime()) / 1000),
      errorRate: 0,
      retryCount: operation.retryCount,
      cacheHitRate: 0.8,
      compressionRatio: 0.6,
    },
    validation: {
      valid: true,
      clinicalAccuracy: {
        assessmentScoresValid: true,
        trendCalculationsAccurate: true,
        clinicalInterpretationConsistent: true,
        riskAssessmentAccurate: true,
        therapeuticDataPreserved: true,
        mbctComplianceValidated: true,
        validationErrors: [],
      },
      dataIntegrity: {
        sourceDataIntact: true,
        transformationLossless: true,
        aggregationAccurate: true,
        timestampPreservation: true,
        relationshipIntegrity: true,
        checksumValidation: { algorithm: 'SHA-256', originalChecksum: '', calculatedChecksum: '', valid: true },
        integrityErrors: [],
      },
      privacyCompliance: {
        consentVerified: true,
        dataMinimizationApplied: true,
        anonymizationCompliant: true,
        accessControlsValidated: true,
        auditTrailComplete: true,
        hipaaCompliant: true,
        privacyErrors: [],
      },
      formatValidation: { valid: true, formatErrors: [], structureValid: true, contentValid: true },
      errors: [],
      warnings: [],
      clinicalConcerns: [],
      validationMetadata: { version: '1.0.0', timestamp: createTimestamp(), validator: 'clinical-export-validator' },
    },
    clinicalContext: {
      clinicalValidation: { validated: true, validator: 'clinical-team', timestamp: createTimestamp() },
      therapeuticContext: {
        mbctProtocol: { version: '2023.1', compliance: true },
        treatmentPhase: 'intervention',
        therapeuticGoals: [],
        progressMarkers: [],
        clinicalOutcomes: [],
        therapeuticAlliance: { score: 0.8, lastAssessed: createTimestamp() },
      },
      riskContext: {
        currentRiskLevel: 'low',
        riskFactors: [],
        protectiveFactors: [],
        crisisHistory: [],
        safetyPlanning: { active: true, lastUpdated: createTimestamp() },
        interventionHistory: [],
      },
      treatmentContext: {
        currentTreatments: [],
        treatmentHistory: [],
        medications: [],
        therapeuticModalities: ['MBCT'],
      },
      complianceContext: {
        hipaaCompliant: true,
        consentValid: true,
        auditTrailComplete: true,
        dataProtectionCompliant: true,
      },
      qualityAssurance: {
        qualityScore: 0.95,
        reviewComplete: true,
        clinicalReview: true,
        technicalReview: true,
        issues: [],
      },
    },
    createdAt: createTimestamp(),
  };
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useExportProcessStore = create<ExportProcessStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    ...INITIAL_STATE,

    // Export operation management
    startExport: async (request: ExportRequest): Promise<ExportID> => {
      const exportId = generateExportId();
      const clinicalPriority: ExportOperation['clinicalPriority'] = 
        request.urgent ? 'critical' : 
        request.dataCategories.includes('risk-assessments') ? 'high' :
        request.dataCategories.includes('assessment-scores') ? 'normal' : 'low';
      
      const operation: ExportOperation = {
        id: exportId,
        userId: request.userId,
        request,
        status: 'queued',
        progress: {
          stage: 'initializing',
          percentage: 0,
          processedRecords: 0,
          totalRecords: request.estimatedRecordCount,
          currentOperation: 'Initializing export',
          validationErrors: 0,
          clinicalWarnings: 0,
          lastUpdate: createTimestamp(),
        },
        startedAt: createTimestamp(),
        retryCount: 0,
        clinicalPriority,
        recoveryStrategy: createPerformanceRequirements(request).recoveryStrategy,
      };

      // Add to active exports
      set(state => ({
        activeExports: new Map(state.activeExports).set(exportId, operation),
        exportProgress: new Map(state.exportProgress).set(exportId, operation.progress),
        operationStatuses: new Map(state.operationStatuses).set(exportId, 'queued'),
      }));

      // Check if we can start immediately or need to queue
      const { activeExports, maxConcurrentExports } = get();
      const activeCount = Array.from(activeExports.values())
        .filter(op => ['validating', 'processing', 'generating', 'finalizing'].includes(op.status))
        .length;

      if (activeCount < maxConcurrentExports) {
        // Start processing immediately
        setTimeout(() => get().processExportOperation(exportId), 0);
      } else {
        // Add to queue
        const queueEntry: ExportQueueEntry = {
          request,
          priority: calculatePriority(request, clinicalPriority, get().priorityWeights),
          queuedAt: createTimestamp(),
          estimatedDuration: estimateProcessingTime(request),
          resourceRequirements: createPerformanceRequirements(request),
          clinicalPriority,
        };
        
        get().addToQueue(queueEntry);
      }

      return exportId;
    },

    cancelExport: async (id: ExportID): Promise<void> => {
      const operation = get().activeExports.get(id);
      if (!operation) return;

      // Cancel the operation
      operation.cancellationToken?.abort();
      
      set(state => {
        const newActiveExports = new Map(state.activeExports);
        const newStatuses = new Map(state.operationStatuses);
        
        newActiveExports.set(id, { ...operation, status: 'cancelled' });
        newStatuses.set(id, 'cancelled');
        
        return {
          activeExports: newActiveExports,
          operationStatuses: newStatuses,
        };
      });

      // Process next in queue if available
      setTimeout(() => get().processQueue(), 100);
    },

    pauseExport: async (id: ExportID): Promise<void> => {
      // Implementation would pause the export operation
      console.log(`Pausing export ${id}`);
    },

    resumeExport: async (id: ExportID): Promise<void> => {
      // Implementation would resume the export operation
      console.log(`Resuming export ${id}`);
    },

    retryExport: async (id: ExportID): Promise<void> => {
      const operation = get().activeExports.get(id);
      if (!operation || operation.retryCount >= get().maxRetryAttempts) return;

      const retryOperation: ExportOperation = {
        ...operation,
        status: 'queued',
        retryCount: operation.retryCount + 1,
        startedAt: createTimestamp(),
        error: undefined,
        cancellationToken: new AbortController(),
      };

      set(state => ({
        activeExports: new Map(state.activeExports).set(id, retryOperation),
        operationStatuses: new Map(state.operationStatuses).set(id, 'queued'),
        recoveryAttempts: new Map(state.recoveryAttempts).set(id, retryOperation.retryCount),
      }));

      // Start processing
      setTimeout(() => get().processExportOperation(id), 1000 * retryOperation.retryCount); // Exponential backoff
    },

    // Progress tracking
    updateProgress: (id: ExportID, progress: Partial<ExportProgress>) => {
      const currentProgress = get().exportProgress.get(id);
      if (!currentProgress) return;

      const updatedProgress: ExportProgress = {
        ...currentProgress,
        ...progress,
        lastUpdate: createTimestamp(),
      };

      set(state => ({
        exportProgress: new Map(state.exportProgress).set(id, updatedProgress),
      }));
    },

    setOperationStatus: (id: ExportID, status: ExportOperationStatus) => {
      set(state => {
        const newStatuses = new Map(state.operationStatuses);
        const newActiveExports = new Map(state.activeExports);
        
        newStatuses.set(id, status);
        
        const operation = newActiveExports.get(id);
        if (operation) {
          newActiveExports.set(id, { ...operation, status });
        }
        
        return {
          operationStatuses: newStatuses,
          activeExports: newActiveExports,
        };
      });
    },

    completeExport: (id: ExportID, result: ExportResult) => {
      const operation = get().activeExports.get(id);
      if (!operation) return;

      const completedOperation: ExportOperation = {
        ...operation,
        status: 'completed',
        completedAt: createTimestamp(),
        result,
        performanceMetrics: result.performanceMetrics,
      };

      set(state => ({
        activeExports: new Map(state.activeExports).set(id, completedOperation),
        completedExports: new Map(state.completedExports).set(id, result),
        operationStatuses: new Map(state.operationStatuses).set(id, 'completed'),
      }));

      // Update success rate and performance metrics
      get().updatePerformanceMetrics(id, result.performanceMetrics);
      
      // Process next in queue
      setTimeout(() => get().processQueue(), 100);
    },

    failExport: (id: ExportID, error: ExportError) => {
      const operation = get().activeExports.get(id);
      if (!operation) return;

      const failedOperation: ExportOperation = {
        ...operation,
        status: 'failed',
        error,
        completedAt: createTimestamp(),
      };

      set(state => ({
        activeExports: new Map(state.activeExports).set(id, failedOperation),
        operationStatuses: new Map(state.operationStatuses).set(id, 'failed'),
        failedOperations: new Map(state.failedOperations).set(id, error),
        lastError: error,
      }));

      // Attempt automatic recovery if enabled
      if (get().autoRecoveryEnabled && operation.retryCount < get().maxRetryAttempts) {
        setTimeout(() => get().attemptRecovery(id), 5000);
      } else {
        // Process next in queue
        setTimeout(() => get().processQueue(), 100);
      }
    },

    // Queue management
    addToQueue: (entry: ExportQueueEntry) => {
      set(state => {
        const newQueue = [...state.exportQueue, entry].sort((a, b) => b.priority - a.priority);
        return {
          exportQueue: newQueue,
          resourceUtilization: {
            ...state.resourceUtilization,
            queueLength: newQueue.length,
            lastUpdated: createTimestamp(),
          },
        };
      });
    },

    removeFromQueue: (requestId: string) => {
      set(state => ({
        exportQueue: state.exportQueue.filter(entry => entry.request.id !== requestId),
      }));
    },

    prioritizeExport: (requestId: string, priority: number) => {
      set(state => {
        const newQueue = state.exportQueue.map(entry => 
          entry.request.id === requestId 
            ? { ...entry, priority }
            : entry
        ).sort((a, b) => b.priority - a.priority);
        
        return { exportQueue: newQueue };
      });
    },

    processQueue: async () => {
      const { exportQueue, activeExports, maxConcurrentExports, queueProcessingEnabled } = get();
      
      if (!queueProcessingEnabled || exportQueue.length === 0) return;

      // Count active operations
      const activeCount = Array.from(activeExports.values())
        .filter(op => ['validating', 'processing', 'generating', 'finalizing'].includes(op.status))
        .length;

      // Start next export if we have capacity
      if (activeCount < maxConcurrentExports && exportQueue.length > 0) {
        const nextEntry = exportQueue[0];
        
        // Remove from queue
        get().removeFromQueue(nextEntry.request.id);
        
        // Start the export
        const exportId = await get().startExport(nextEntry.request);
      }
    },

    clearQueue: () => {
      set({ exportQueue: [] });
    },

    // Resource management
    updateResourceUtilization: (resources: Partial<ResourceUtilization>) => {
      set(state => ({
        resourceUtilization: {
          ...state.resourceUtilization,
          ...resources,
          lastUpdated: createTimestamp(),
        },
      }));
    },

    setMaxConcurrentExports: (max: number) => {
      set({ maxConcurrentExports: Math.max(1, Math.min(max, 10)) }); // Reasonable bounds
    },

    setMemoryThreshold: (threshold: number) => {
      set({ memoryThreshold: Math.max(100_000_000, threshold) }); // Minimum 100MB
    },

    setPerformanceMode: (mode: ExportProcessState['performanceMode']) => {
      const modeSettings = {
        'standard': { maxConcurrent: 5, memoryThreshold: 300_000_000 },
        'optimized': { maxConcurrent: 8, memoryThreshold: 200_000_000 },
        'clinical-safe': { maxConcurrent: 3, memoryThreshold: 500_000_000 },
      };
      
      const settings = modeSettings[mode];
      
      set({
        performanceMode: mode,
        maxConcurrentExports: settings.maxConcurrent,
        memoryThreshold: settings.memoryThreshold,
      });
    },

    optimizeResources: () => {
      const { resourceUtilization, performanceMode } = get();
      
      // Adjust concurrent exports based on current resource usage
      if (resourceUtilization.memoryUsage > get().memoryThreshold) {
        const currentMax = get().maxConcurrentExports;
        get().setMaxConcurrentExports(Math.max(1, currentMax - 1));
      } else if (resourceUtilization.cpuUsage < 0.5) {
        const currentMax = get().maxConcurrentExports;
        get().setMaxConcurrentExports(Math.min(8, currentMax + 1));
      }
    },

    // Error handling and recovery
    handleExportError: async (id: ExportID, error: ExportError) => {
      get().failExport(id, error);
      
      // Log error for monitoring
      console.error(`Export ${id} failed:`, error);
      
      // Check if this error indicates system issues
      if (error.severity === 'critical' || error.clinicalImpact === 'severe') {
        set({ systemHealthy: false });
        
        // Consider enabling maintenance mode for severe issues
        if (error.errorCode === 'EXPORT_DATA_CORRUPTION') {
          get().enableMaintenanceMode();
        }
      }
    },

    attemptRecovery: async (id: ExportID): Promise<boolean> => {
      const operation = get().activeExports.get(id);
      const error = get().failedOperations.get(id);
      
      if (!operation || !error || operation.retryCount >= get().maxRetryAttempts) {
        return false;
      }

      // Determine recovery strategy based on error
      const canRecover = error.severity !== 'critical' && 
                        error.clinicalImpact !== 'severe' &&
                        !['EXPORT_DATA_CORRUPTION', 'EXPORT_CONSENT_VIOLATION'].includes(error.errorCode);

      if (canRecover) {
        await get().retryExport(id);
        return true;
      }

      return false;
    },

    setAutoRecoveryEnabled: (enabled: boolean) => {
      set({ autoRecoveryEnabled: enabled });
    },

    clearFailedOperations: () => {
      set({ failedOperations: new Map() });
    },

    // Performance monitoring
    recordPerformanceSnapshot: () => {
      const { activeExports, exportQueue, resourceUtilization } = get();
      
      const snapshot: PerformanceSnapshot = {
        timestamp: createTimestamp(),
        activeOperations: resourceUtilization.activeOperations,
        queueLength: resourceUtilization.queueLength,
        memoryUsage: resourceUtilization.memoryUsage,
        cpuUsage: resourceUtilization.cpuUsage,
        throughput: resourceUtilization.averageThroughput,
        errorRate: get().calculateErrorRate(),
      };

      set(state => ({
        performanceHistory: [...state.performanceHistory.slice(-49), snapshot], // Keep last 50
        lastPerformanceCheck: createTimestamp(),
      }));
    },

    updatePerformanceMetrics: (id: ExportID, metrics: ExportPerformanceMetrics) => {
      set(state => {
        const newActiveExports = new Map(state.activeExports);
        const operation = newActiveExports.get(id);
        
        if (operation) {
          newActiveExports.set(id, { ...operation, performanceMetrics: metrics });
        }
        
        // Update average processing time
        const allCompletedMetrics = Array.from(state.completedExports.values())
          .map(result => result.performanceMetrics?.processingTime)
          .filter(time => time !== undefined) as number[];
        
        allCompletedMetrics.push(metrics.processingTime);
        
        const averageProcessingTime = allCompletedMetrics.length > 0 
          ? allCompletedMetrics.reduce((sum, time) => sum + time, 0) / allCompletedMetrics.length
          : state.averageProcessingTime;
        
        return {
          activeExports: newActiveExports,
          averageProcessingTime,
        };
      });
    },

    calculateSuccessRate: (): number => {
      const { activeExports, completedExports } = get();
      
      const allOperations = Array.from(activeExports.values());
      const completedOperations = allOperations.filter(op => 
        op.status === 'completed' || op.status === 'failed'
      );
      const successfulOperations = allOperations.filter(op => op.status === 'completed');
      
      if (completedOperations.length === 0) return 1.0;
      
      return successfulOperations.length / completedOperations.length;
    },

    calculateErrorRate: (): number => {
      const { performanceHistory } = get();
      if (performanceHistory.length === 0) return 0;
      
      const recentSnapshots = performanceHistory.slice(-10); // Last 10 snapshots
      const totalErrors = recentSnapshots.reduce((sum, snapshot) => sum + snapshot.errorRate, 0);
      
      return totalErrors / recentSnapshots.length;
    },

    getSystemHealth: (): boolean => {
      const { resourceUtilization, memoryThreshold } = get();
      const errorRate = get().calculateErrorRate();
      
      return (
        resourceUtilization.memoryUsage < memoryThreshold * 0.9 && // Under 90% memory threshold
        resourceUtilization.cpuUsage < 0.8 && // Under 80% CPU
        errorRate < 0.1 // Error rate under 10%
      );
    },

    // System management
    enableMaintenanceMode: () => {
      set({ 
        maintenanceMode: true,
        queueProcessingEnabled: false,
      });
      
      // Pause all non-critical operations
      get().pauseAllOperations();
    },

    disableMaintenanceMode: () => {
      set({ 
        maintenanceMode: false,
        queueProcessingEnabled: true,
        systemHealthy: true,
      });
      
      // Resume operations
      get().resumeAllOperations();
    },

    pauseAllOperations: async () => {
      const { activeExports } = get();
      
      for (const [id, operation] of activeExports.entries()) {
        if (['processing', 'generating'].includes(operation.status)) {
          await get().pauseExport(id);
        }
      }
      
      set({ isProcessing: false });
    },

    resumeAllOperations: async () => {
      const { activeExports } = get();
      
      for (const [id, operation] of activeExports.entries()) {
        if (operation.status === 'paused') {
          await get().resumeExport(id);
        }
      }
      
      set({ isProcessing: true });
      
      // Resume queue processing
      setTimeout(() => get().processQueue(), 1000);
    },

    cleanupCompletedExports: (olderThan?: ISO8601Timestamp) => {
      const cutoffDate = olderThan ? new Date(olderThan) : new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      set(state => {
        const newActiveExports = new Map();
        const newCompletedExports = new Map();
        const newProgress = new Map();
        const newStatuses = new Map();
        
        for (const [id, operation] of state.activeExports.entries()) {
          if (operation.completedAt && new Date(operation.completedAt) < cutoffDate) {
            // Skip cleanup - operation is too old
            continue;
          }
          
          newActiveExports.set(id, operation);
          
          if (state.exportProgress.has(id)) {
            newProgress.set(id, state.exportProgress.get(id));
          }
          if (state.operationStatuses.has(id)) {
            newStatuses.set(id, state.operationStatuses.get(id));
          }
        }
        
        for (const [id, result] of state.completedExports.entries()) {
          if (new Date(result.createdAt) < cutoffDate) {
            continue;
          }
          
          newCompletedExports.set(id, result);
        }
        
        return {
          activeExports: newActiveExports,
          completedExports: newCompletedExports,
          exportProgress: newProgress,
          operationStatuses: newStatuses,
        };
      });
    },

    // Status queries
    getOperationStatus: (id: ExportID): ExportOperationStatus | null => {
      return get().operationStatuses.get(id) || null;
    },

    getOperationProgress: (id: ExportID): ExportProgress | null => {
      return get().exportProgress.get(id) || null;
    },

    isOperationActive: (id: ExportID): boolean => {
      const status = get().getOperationStatus(id);
      return status ? ['queued', 'validating', 'processing', 'generating', 'finalizing'].includes(status) : false;
    },

    getQueuePosition: (requestId: string): number => {
      const { exportQueue } = get();
      return exportQueue.findIndex(entry => entry.request.id === requestId) + 1; // 1-based position
    },

    getEstimatedWaitTime: (requestId: string): number => {
      const { exportQueue, averageProcessingTime } = get();
      const position = get().getQueuePosition(requestId);
      
      if (position === 0) return 0; // Not in queue
      
      // Estimate based on queue position and average processing time
      return (position - 1) * averageProcessingTime;
    },

    // Internal helper method for processing operations
    processExportOperation: async (id: ExportID) => {
      const operation = get().activeExports.get(id);
      if (!operation) return;

      const cancellationToken = new AbortController();
      
      // Update operation with cancellation token
      set(state => ({
        activeExports: new Map(state.activeExports).set(id, {
          ...operation,
          cancellationToken,
          status: 'processing',
        }),
        operationStatuses: new Map(state.operationStatuses).set(id, 'processing'),
        isProcessing: true,
      }));

      try {
        const result = await processExport(
          operation,
          (progress) => get().updateProgress(id, progress),
          () => cancellationToken.signal.aborted
        );
        
        get().completeExport(id, result);
      } catch (error) {
        const exportError: ExportError = {
          name: 'ExportError',
          message: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'EXPORT_PROCESSING_FAILED' as ExportErrorCode,
          severity: 'medium' as ErrorSeverity,
          stage: 'processing',
          clinicalImpact: 'minimal' as ClinicalImpact,
          recoverySuggestions: ['Retry export', 'Check data integrity', 'Contact support'],
          userMessage: 'Export processing failed. Please try again.',
          technicalDetails: { error: String(error), operationId: id },
          timestamp: createTimestamp(),
        };
        
        await get().handleExportError(id, exportError);
      }
    },
  }))
);

// ============================================================================
// COMPUTED SELECTORS
// ============================================================================

export const exportProcessSelectors = {
  // Get all active operations
  getActiveOperations: (state: ExportProcessState): ExportOperation[] => {
    return Array.from(state.activeExports.values()).filter(op => 
      ['queued', 'validating', 'processing', 'generating', 'finalizing'].includes(op.status)
    );
  },

  // Get processing statistics
  getProcessingStats: (state: ExportProcessState) => {
    const allOps = Array.from(state.activeExports.values());
    const activeOps = exportProcessSelectors.getActiveOperations(state);
    const completedOps = allOps.filter(op => op.status === 'completed');
    const failedOps = allOps.filter(op => op.status === 'failed');
    
    return {
      total: allOps.length,
      active: activeOps.length,
      completed: completedOps.length,
      failed: failedOps.length,
      queued: state.exportQueue.length,
      successRate: completedOps.length / Math.max(completedOps.length + failedOps.length, 1),
    };
  },

  // Get system resource status
  getResourceStatus: (state: ExportProcessState) => {
    const { resourceUtilization, memoryThreshold, maxConcurrentExports } = state;
    
    return {
      memoryUtilization: resourceUtilization.memoryUsage / memoryThreshold,
      cpuUtilization: resourceUtilization.cpuUsage,
      concurrencyUtilization: resourceUtilization.activeOperations / maxConcurrentExports,
      healthy: resourceUtilization.memoryUsage < memoryThreshold * 0.9 && 
               resourceUtilization.cpuUsage < 0.8,
      status: resourceUtilization.memoryUsage > memoryThreshold * 0.95 ? 'critical' :
              resourceUtilization.memoryUsage > memoryThreshold * 0.8 ? 'warning' :
              'healthy',
    };
  },

  // Get next queue processing time
  getNextQueueProcessTime: (state: ExportProcessState): ISO8601Timestamp | null => {
    if (state.exportQueue.length === 0 || !state.queueProcessingEnabled) {
      return null;
    }
    
    const activeCount = exportProcessSelectors.getActiveOperations(state).length;
    if (activeCount < state.maxConcurrentExports) {
      return createTimestamp(); // Can process now
    }
    
    // Estimate when next slot will be available
    const avgProcessingTime = state.averageProcessingTime || 30000; // 30 second default
    return new Date(Date.now() + avgProcessingTime).toISOString() as ISO8601Timestamp;
  },
};

// ============================================================================
// BACKGROUND PROCESSING
// ============================================================================

// Performance monitoring interval
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useExportProcessStore.getState();
    if (state.isProcessing || state.activeExports.size > 0) {
      state.recordPerformanceSnapshot();
      
      // Update system health
      const healthy = state.getSystemHealth();
      if (state.systemHealthy !== healthy) {
        useExportProcessStore.setState({ systemHealthy: healthy });
      }
    }
  }, 30000); // Every 30 seconds

  // Queue processing interval
  setInterval(() => {
    const state = useExportProcessStore.getState();
    if (state.queueProcessingEnabled && !state.maintenanceMode) {
      state.processQueue();
    }
  }, 5000); // Every 5 seconds

  // Resource optimization interval
  setInterval(() => {
    const state = useExportProcessStore.getState();
    if (state.performanceMode === 'optimized') {
      state.optimizeResources();
    }
  }, 60000); // Every minute

  // Cleanup interval
  setInterval(() => {
    const state = useExportProcessStore.getState();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() as ISO8601Timestamp;
    state.cleanupCompletedExports(oneDayAgo);
  }, 60 * 60 * 1000); // Every hour
}

export default useExportProcessStore;