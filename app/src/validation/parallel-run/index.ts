/**
 * Phase 5E: 24-Hour Parallel Run - Complete System Exports
 * 
 * MISSION: Provide seamless 24-hour dual store validation system
 * CRITICAL: Zero downtime, data integrity, performance validation
 */

// Core orchestration
export { default as Phase5EOrchestrator, DEFAULT_PHASE_5E_CONFIG } from './Phase5EOrchestrator';
export type { Phase5EResult, Phase5EConfig } from './Phase5EOrchestrator';

// Validation engine
export { default as ParallelValidationEngine } from './ParallelValidationEngine';
export type { 
  ParallelRunConfig,
  ParallelRunResult,
  ValidationDiscrepancy,
  StoreComparisonResult,
  StoreOperation
} from './ParallelValidationEngine';

// Store orchestration
export { default as DualStoreOrchestrator } from './DualStoreOrchestrator';
export type { DualOperationResult, StoreRegistry } from './DualStoreOrchestrator';

// Rollback system
export { default as AutomatedRollbackSystem } from './AutomatedRollbackSystem';
export type { 
  RollbackTrigger, 
  RollbackEvent, 
  RollbackStrategy, 
  RollbackAction 
} from './AutomatedRollbackSystem';

// Performance monitoring
export { default as ParallelRunPerformanceMonitor, PERFORMANCE_THRESHOLDS } from './ParallelRunPerformanceMonitor';
export type { 
  PerformanceMetric, 
  PerformanceSample, 
  PerformanceAlert, 
  PerformanceReport 
} from './ParallelRunPerformanceMonitor';

// Dashboard
export { default as ParallelRunDashboard } from './ParallelRunDashboard';

// Quick setup function
export const setupPhase5E = async (config?: Partial<Phase5EConfig>) => {
  const { Phase5EOrchestrator, DEFAULT_PHASE_5E_CONFIG } = await import('./Phase5EOrchestrator');
  
  const fullConfig = {
    ...DEFAULT_PHASE_5E_CONFIG,
    ...config
  };
  
  return new Phase5EOrchestrator(fullConfig);
};

// Quick execution function
export const executePhase5E = async (config?: Partial<Phase5EConfig>): Promise<Phase5EResult> => {
  const orchestrator = await setupPhase5E(config);
  return orchestrator.executePhase5E();
};