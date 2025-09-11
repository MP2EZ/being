/**
 * FullMind Clinical Export Stores - Unified Export
 * Comprehensive state management system for clinical-grade export functionality
 * 
 * This module provides a complete state management solution for FullMind's 
 * clinical export system, integrating four specialized Zustand stores with
 * a unified coordination layer.
 * 
 * Architecture:
 * - Configuration Store: User preferences, consent, and privacy settings
 * - Process Store: Real-time export operations and progress tracking  
 * - History Store: Audit trail, sharing records, and analytics
 * - Error Store: Clinical-grade error handling and recovery
 * - Integration Store: Unified coordination and workflow orchestration
 * 
 * Features:
 * - Clinical-grade data accuracy and safety
 * - HIPAA-aware privacy and compliance management
 * - Therapeutic error handling with user guidance
 * - Comprehensive audit trail and history tracking
 * - Performance optimization for large datasets
 * - Cross-store consistency and synchronization
 * - Integration with existing FullMind clinical systems
 */

// Core export stores
export {
  useExportConfigurationStore,
  exportConfigurationSelectors,
  type ExportConfigurationStore,
  type ExportConfigurationState,
  type ExportConfigurationActions,
  type UserExportPreferences,
  type ExportPrivacySettings,
  type DataTypeOption,
  type ConfigurationHistoryEntry,
} from './exportConfigurationStore';

export {
  useExportProcessStore,
  exportProcessSelectors,
  type ExportProcessStore,
  type ExportProcessState,
  type ExportProcessActions,
  type ExportOperation,
  type ExportProgress,
  type ExportProcessingStage,
  type ResourceUtilization,
  type PerformanceSnapshot,
} from './exportProcessStore';

export {
  useExportHistoryStore,
  exportHistorySelectors,
  type ExportHistoryStore,
  type ExportHistoryState,
  type ExportHistoryActions,
  type ExportHistoryRecord,
  type SharingHistoryRecord,
  type ExportSummary,
  type ExportAnalytics,
  type ExportSearchCriteria,
} from './exportHistoryStore';

export {
  useExportErrorStore,
  exportErrorSelectors,
  type ExportErrorStore,
  type ExportErrorState,
  type ExportErrorActions,
  type ClinicalErrorType,
  type RecoveryPlan,
  type TherapeuticGuidance,
  type ErrorAnalytics,
  type ErrorRecord,
} from './exportErrorStore';

// Integration and coordination
export {
  useExportIntegrationStore,
  exportIntegrationSelectors,
  type ExportIntegrationStore,
  type ExportIntegrationState,
  type ExportIntegrationActions,
  type UnifiedExportRequest,
  type ExportWorkflowStatus,
  type ExportWorkflowStage,
  type ClinicalExportSummary,
  type SystemSyncStatus,
  type SystemDiagnostics,
} from './exportIntegrationStore';

// Re-export types from clinical-export for convenience
export type {
  ExportRequest,
  ExportResult,
  ExportID,
  UserID,
  ISO8601Timestamp,
  ExportFormat,
  DataCategory,
  ExportPurpose,
  ValidationResult,
  ExportDataPackage,
  ClinicalExportData,
  ExportError,
  UserConsentRecord,
  ExportPerformanceMetrics,
  ConsentID,
  ErrorSeverity,
  ClinicalImpact,
  RecoveryStrategy,
  ExportErrorCode,
} from '../types/clinical-export';

// ============================================================================
// UNIFIED EXPORT SYSTEM HOOKS
// ============================================================================

/**
 * Comprehensive export system hook that provides access to all stores
 * with integrated state and actions for complete export functionality
 */
export const useExportSystem = () => {
  const configuration = useExportConfigurationStore();
  const process = useExportProcessStore();
  const history = useExportHistoryStore();
  const error = useExportErrorStore();
  const integration = useExportIntegrationStore();

  return {
    // Store instances
    configuration,
    process,
    history,
    error,
    integration,
    
    // Unified state getters
    isSystemHealthy: () => 
      integration.systemHealthy && 
      configuration.configurationValid && 
      process.systemHealthy && 
      error.isHealthy,
    
    hasActiveExports: () => 
      process.activeExports.size > 0 || 
      integration.activeWorkflows.size > 0,
    
    getTotalExports: () => history.exportHistory.length,
    
    getActiveErrorCount: () => error.getActiveErrorCount(),
    
    // Unified actions
    createExport: integration.createUnifiedExport,
    getExportStatus: integration.getExportStatus,
    cancelExport: integration.cancelExport,
    retryExport: integration.retryFailedExport,
    
    // System management
    initializeSystem: integration.initializeIntegration,
    validateSystem: integration.validateSystemIntegrity,
    getSystemDiagnostics: integration.exportSystemDiagnostics,
    refreshDashboard: integration.refreshDashboard,
    
    // Cross-store operations
    syncAllStores: integration.syncAllStores,
    validateConsistency: integration.validateCrossStoreConsistency,
    repairInconsistencies: integration.repairInconsistencies,
  };
};

/**
 * Hook for clinical export configuration with validation
 */
export const useExportConfiguration = () => {
  const store = useExportConfigurationStore();
  const integration = useExportIntegrationStore();
  
  return {
    ...store,
    
    // Enhanced validation with clinical safety
    validateRequestWithClinicalSafety: integration.validateClinicalRequest,
    
    // Clinical-specific configuration helpers
    isClinicalExportReady: () => 
      exportConfigurationSelectors.isClinicalExportReady(store),
    
    getPrivacyComplianceScore: () =>
      exportConfigurationSelectors.getPrivacyComplianceScore(store),
    
    getExportReadinessStatus: () =>
      exportConfigurationSelectors.getExportReadinessStatus(store),
  };
};

/**
 * Hook for export process management with clinical oversight
 */
export const useExportProcess = () => {
  const store = useExportProcessStore();
  const integration = useExportIntegrationStore();
  
  return {
    ...store,
    
    // Enhanced process management with workflow integration
    createExportWithWorkflow: integration.createUnifiedExport,
    getWorkflowStatus: integration.getExportStatus,
    
    // Clinical process monitoring
    getProcessingStats: () =>
      exportProcessSelectors.getProcessingStats(store),
    
    getResourceStatus: () =>
      exportProcessSelectors.getResourceStatus(store),
    
    getNextQueueProcessTime: () =>
      exportProcessSelectors.getNextQueueProcessTime(store),
  };
};

/**
 * Hook for export history and analytics with clinical insights
 */
export const useExportHistory = () => {
  const store = useExportHistoryStore();
  const integration = useExportIntegrationStore();
  
  return {
    ...store,
    
    // Enhanced analytics with clinical context
    getRecentActivity: integration.getRecentActivity,
    
    // Clinical-specific history analysis
    getExportsRequiringAttention: () =>
      exportHistorySelectors.getExportsRequiringAttention(store),
    
    getClinicalSignificanceSummary: () =>
      exportHistorySelectors.getClinicalSignificanceSummary(store),
    
    getSharingStatistics: () =>
      exportHistorySelectors.getSharingStatistics(store),
    
    getStorageSummary: () =>
      exportHistorySelectors.getStorageSummary(store),
  };
};

/**
 * Hook for clinical-grade error management
 */
export const useExportErrors = () => {
  const store = useExportErrorStore();
  const integration = useExportIntegrationStore();
  
  return {
    ...store,
    
    // Enhanced error management with clinical context
    getDetailedErrorInfo: integration.getDetailedErrorInfo,
    
    // Clinical error analysis
    getClinicalImpactSummary: () =>
      exportErrorSelectors.getClinicalImpactSummary(store),
    
    getRecoveryStatusOverview: () =>
      exportErrorSelectors.getRecoveryStatusOverview(store),
    
    getSystemHealthStatus: () =>
      exportErrorSelectors.getSystemHealthStatus(store),
  };
};

/**
 * Hook for system-wide export monitoring and management
 */
export const useExportSystemMonitoring = () => {
  const integration = useExportIntegrationStore();
  const configuration = useExportConfigurationStore();
  const process = useExportProcessStore();
  const history = useExportHistoryStore();
  const error = useExportErrorStore();
  
  return {
    // System overview
    systemSummary: integration.exportSummary,
    systemHealth: integration.getSystemHealthStatus(),
    workflowOverview: exportIntegrationSelectors.getWorkflowOverview(integration),
    systemStatus: exportIntegrationSelectors.getSystemStatusSummary(integration),
    performanceInsights: exportIntegrationSelectors.getPerformanceInsights(integration),
    
    // Cross-store metrics
    totalActiveExports: process.activeExports.size,
    totalHistoryRecords: history.exportHistory.length,
    totalActiveErrors: error.activeErrors.size,
    configurationValid: configuration.configurationValid,
    
    // System management actions
    refreshSystemStatus: integration.refreshDashboard,
    validateSystemIntegrity: integration.validateSystemIntegrity,
    exportDiagnostics: integration.exportSystemDiagnostics,
    initializeSystem: integration.initializeIntegration,
    
    // Maintenance operations
    cleanupSystem: () => {
      process.cleanupCompletedExports();
      history.cleanupOldErrors();
      error.cleanupOldErrors();
      integration.cleanupCompletedWorkflows();
    },
    
    optimizeSystem: () => {
      process.optimizeResources();
      history.optimizeStorage();
      if (integration.performanceOptimizationEnabled) {
        integration.enablePerformanceOptimization(true);
      }
    },
    
    // Emergency operations
    enableMaintenanceMode: () => {
      process.enableMaintenanceMode();
    },
    
    disableMaintenanceMode: () => {
      process.disableMaintenanceMode();
    },
  };
};

// ============================================================================
// CLINICAL EXPORT SYSTEM UTILITIES
// ============================================================================

/**
 * Clinical export system initialization utility
 */
export const initializeExportSystem = async (): Promise<boolean> => {
  try {
    const integration = useExportIntegrationStore.getState();
    await integration.initializeIntegration();
    
    console.log('FullMind clinical export system initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize export system:', error);
    return false;
  }
};

/**
 * Export system health check utility
 */
export const performExportSystemHealthCheck = async (): Promise<{
  healthy: boolean;
  issues: string[];
  recommendations: string[];
}> => {
  try {
    const integration = useExportIntegrationStore.getState();
    const integrityReport = await integration.validateSystemIntegrity();
    
    return {
      healthy: integrityReport.overallHealthy,
      issues: integrityReport.issues.map(issue => issue.description),
      recommendations: integrityReport.recommendations,
    };
  } catch (error) {
    return {
      healthy: false,
      issues: [`Health check failed: ${error}`],
      recommendations: ['Investigate system errors', 'Consider system restart'],
    };
  }
};

/**
 * Export system diagnostics utility for debugging
 */
export const getExportSystemDiagnostics = (): SystemDiagnostics => {
  const integration = useExportIntegrationStore.getState();
  return integration.exportSystemDiagnostics();
};

/**
 * Emergency export system recovery utility
 */
export const recoverExportSystem = async (): Promise<boolean> => {
  try {
    const integration = useExportIntegrationStore.getState();
    const configuration = useExportConfigurationStore.getState();
    const process = useExportProcessStore.getState();
    const history = useExportHistoryStore.getState();
    const error = useExportErrorStore.getState();
    
    // Attempt to repair inconsistencies
    await integration.repairInconsistencies();
    
    // Reset stores to healthy state if needed
    if (configuration.error) {
      configuration.clearError();
    }
    
    if (process.lastError) {
      process.setError(null);
    }
    
    if (history.error) {
      history.clearError();
    }
    
    if (error.systemError) {
      error.setSystemError(null);
    }
    
    // Re-initialize integration
    await integration.initializeIntegration();
    
    console.log('Export system recovery completed');
    return true;
  } catch (error) {
    console.error('Export system recovery failed:', error);
    return false;
  }
};

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

/**
 * Clinical export system constants
 */
export const EXPORT_SYSTEM_CONSTANTS = {
  // Clinical validation requirements
  CLINICAL_ACCURACY_THRESHOLD: 0.999, // 99.9% accuracy required
  PHQ9_CRISIS_THRESHOLD: 20,
  GAD7_CRISIS_THRESHOLD: 15,
  
  // Performance targets
  MAX_EXPORT_TIME_MS: 300000, // 5 minutes
  MAX_CONCURRENT_EXPORTS: 5,
  MAX_MEMORY_USAGE_MB: 500,
  
  // Data retention and compliance
  DEFAULT_RETENTION_DAYS: 90,
  CLINICAL_RETENTION_DAYS: 2555, // 7 years
  AUDIT_TRAIL_RETENTION_DAYS: 2555,
  
  // System health thresholds
  MAX_ACTIVE_ERRORS: 10,
  MAX_CRITICAL_ERRORS: 1,
  MIN_SUCCESS_RATE: 0.95, // 95%
  
  // Export format limits
  PDF_MAX_RECORDS: 10000,
  CSV_MAX_RECORDS: 100000,
  JSON_MAX_SIZE_MB: 50,
  
  // Clinical review requirements
  AUTO_REVIEW_THRESHOLD: 1000, // Records
  CLINICAL_REVIEW_REQUIRED_THRESHOLD: 5000,
  PATIENT_SAFETY_REVIEW_ALWAYS: true,
} as const;

/**
 * Default clinical export configuration
 */
export const DEFAULT_CLINICAL_EXPORT_CONFIG = {
  // Clinical safety defaults
  clinicalValidationEnabled: true,
  auditTrailEnabled: true,
  privacyComplianceEnabled: true,
  
  // Quality defaults
  qualityLevel: 'clinical-grade' as const,
  accessibilityLevel: 'AA' as const,
  encryptionRequired: true,
  
  // Performance defaults
  performanceMode: 'clinical-safe' as const,
  maxConcurrentExports: 3,
  memoryOptimizationEnabled: true,
  
  // User experience defaults
  therapeuticTone: 'gentle' as const,
  userGuidanceEnabled: true,
  showTechnicalDetails: false,
} as const;

// ============================================================================
// TYPE EXPORTS FOR EXTERNAL CONSUMPTION
// ============================================================================

// Store type exports
export type ExportStoreState = {
  configuration: ReturnType<typeof useExportConfigurationStore>;
  process: ReturnType<typeof useExportProcessStore>;
  history: ReturnType<typeof useExportHistoryStore>;
  error: ReturnType<typeof useExportErrorStore>;
  integration: ReturnType<typeof useExportIntegrationStore>;
};

export type ExportSystemActions = {
  createExport: (request: UnifiedExportRequest) => Promise<ExportID>;
  getExportStatus: (id: ExportID) => ExportWorkflowStatus | null;
  cancelExport: (id: ExportID) => Promise<void>;
  retryExport: (id: ExportID) => Promise<void>;
  validateSystem: () => Promise<boolean>;
  initializeSystem: () => Promise<void>;
  getSystemHealth: () => 'healthy' | 'warning' | 'critical';
};

export type ExportSystemMonitoring = {
  systemSummary: ClinicalExportSummary | null;
  systemHealth: 'healthy' | 'warning' | 'critical';
  totalActiveExports: number;
  totalHistoryRecords: number;
  totalActiveErrors: number;
  configurationValid: boolean;
};

/**
 * Complete export system interface for external integrations
 */
export interface FullMindExportSystem {
  readonly stores: ExportStoreState;
  readonly actions: ExportSystemActions;
  readonly monitoring: ExportSystemMonitoring;
  readonly constants: typeof EXPORT_SYSTEM_CONSTANTS;
  readonly config: typeof DEFAULT_CLINICAL_EXPORT_CONFIG;
  readonly utils: {
    initialize: typeof initializeExportSystem;
    healthCheck: typeof performExportSystemHealthCheck;
    diagnostics: typeof getExportSystemDiagnostics;
    recovery: typeof recoverExportSystem;
  };
}

/**
 * Factory function to create a complete FullMind export system instance
 */
export const createFullMindExportSystem = (): FullMindExportSystem => {
  const system = useExportSystem();
  const monitoring = useExportSystemMonitoring();
  
  return {
    stores: {
      configuration: system.configuration,
      process: system.process,
      history: system.history,
      error: system.error,
      integration: system.integration,
    },
    actions: {
      createExport: system.createExport,
      getExportStatus: system.getExportStatus,
      cancelExport: system.cancelExport,
      retryExport: system.retryExport,
      validateSystem: system.validateSystem,
      initializeSystem: system.initializeSystem,
      getSystemHealth: system.integration.getSystemHealthStatus,
    },
    monitoring: {
      systemSummary: monitoring.systemSummary,
      systemHealth: monitoring.systemHealth,
      totalActiveExports: monitoring.totalActiveExports,
      totalHistoryRecords: monitoring.totalHistoryRecords,
      totalActiveErrors: monitoring.totalActiveErrors,
      configurationValid: monitoring.configurationValid,
    },
    constants: EXPORT_SYSTEM_CONSTANTS,
    config: DEFAULT_CLINICAL_EXPORT_CONFIG,
    utils: {
      initialize: initializeExportSystem,
      healthCheck: performExportSystemHealthCheck,
      diagnostics: getExportSystemDiagnostics,
      recovery: recoverExportSystem,
    },
  };
};

// Default export for convenience
export default {
  // Core stores
  useExportConfigurationStore,
  useExportProcessStore,
  useExportHistoryStore,
  useExportErrorStore,
  useExportIntegrationStore,
  
  // Unified hooks
  useExportSystem,
  useExportConfiguration,
  useExportProcess,
  useExportHistory,
  useExportErrors,
  useExportSystemMonitoring,
  
  // Utilities
  initializeExportSystem,
  performExportSystemHealthCheck,
  getExportSystemDiagnostics,
  recoverExportSystem,
  createFullMindExportSystem,
  
  // Constants
  EXPORT_SYSTEM_CONSTANTS,
  DEFAULT_CLINICAL_EXPORT_CONFIG,
};