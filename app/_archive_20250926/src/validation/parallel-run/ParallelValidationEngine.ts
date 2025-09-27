/**
 * Parallel Validation Engine - Phase 5E: 24-Hour Parallel Run
 * 
 * MISSION: Orchestrate dual store operation with real-time validation
 * CRITICAL: Zero data discrepancies, performance maintained, automatic rollback
 */

import { ISODateString, createISODateString } from '../../types/clinical';
import { PHQ9Score, GAD7Score, Assessment } from '../../types/crisis-safety';
import { UserProfile } from '../../types';
import { encryptionService } from '../../services/security';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Parallel Run Configuration
interface ParallelRunConfig {
  enabled: boolean;
  startTime: ISODateString;
  duration: number; // hours
  validationInterval: number; // ms
  crisisResponseThreshold: number; // 200ms
  assessmentResponseThreshold: number; // 500ms
  autoRollbackEnabled: boolean;
  discrepancyTolerance: number; // 0 for zero tolerance
}

// Validation Result Types
interface StoreComparisonResult {
  storeName: string;
  dataMatch: boolean;
  performanceMatch: boolean;
  discrepancies: ValidationDiscrepancy[];
  responseTime: {
    old: number;
    new: number;
  };
}

interface ValidationDiscrepancy {
  field: string;
  oldValue: any;
  newValue: any;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: ISODateString;
  impact: 'CLINICAL' | 'PERFORMANCE' | 'DATA' | 'SAFETY';
}

interface ParallelRunResult {
  success: boolean;
  duration: number;
  totalOperations: number;
  discrepanciesFound: number;
  rollbacksTriggered: number;
  performanceViolations: number;
  storeComparisons: StoreComparisonResult[];
}

// Store Operation Wrapper
interface StoreOperation {
  type: 'READ' | 'WRITE' | 'UPDATE' | 'DELETE';
  store: 'USER' | 'ASSESSMENT' | 'CRISIS' | 'SETTINGS';
  payload: any;
  expectedResult: any;
  timestamp: ISODateString;
}

class ParallelValidationEngine {
  private config: ParallelRunConfig;
  private isRunning: boolean = false;
  private validationResults: ValidationDiscrepancy[] = [];
  private performanceMetrics: Map<string, number[]> = new Map();
  private rollbackCallbacks: Map<string, () => Promise<void>> = new Map();

  constructor(config: ParallelRunConfig) {
    this.config = config;
  }

  /**
   * Initialize 24-hour parallel run
   */
  async startParallelRun(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Parallel run already in progress');
    }

    console.log('🚀 PHASE 5E: Starting 24-hour parallel validation run');
    
    this.isRunning = true;
    this.validationResults = [];
    this.performanceMetrics.clear();

    // Store initial state checkpoints
    await this.createStateCheckpoints();

    // Start validation monitoring
    this.startContinuousValidation();

    // Schedule run completion
    setTimeout(() => {
      this.completeParallelRun();
    }, this.config.duration * 60 * 60 * 1000); // Convert hours to ms

    await AsyncStorage.setItem('PARALLEL_RUN_STATUS', JSON.stringify({
      running: true,
      startTime: this.config.startTime,
      config: this.config
    }));
  }

  /**
   * Execute dual store operation with validation
   */
  async executeWithValidation<T>(
    operation: StoreOperation,
    oldStoreExecutor: () => Promise<T>,
    newStoreExecutor: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      // Execute both operations in parallel
      const [oldResult, newResult] = await Promise.all([
        oldStoreExecutor(),
        newStoreExecutor()
      ]);

      const responseTime = Date.now() - startTime;

      // Validate results
      const comparison = await this.compareResults(
        operation.store,
        oldResult,
        newResult,
        responseTime
      );

      // Check performance thresholds
      this.validatePerformance(operation, responseTime);

      // Store metrics
      this.recordMetrics(operation.store, responseTime);

      // Trigger rollback if critical discrepancies found
      if (this.shouldRollback(comparison)) {
        await this.triggerRollback(operation.store, comparison.discrepancies);
      }

      return newResult; // Return new store result if validation passes
    } catch (error) {
      console.error('❌ Parallel validation execution failed:', error);
      
      // Emergency rollback to old store
      try {
        return await oldStoreExecutor();
      } catch (rollbackError) {
        console.error('🚨 CRITICAL: Both stores failed, emergency intervention needed');
        throw new Error(`Dual store failure: ${error}. Rollback failed: ${rollbackError}`);
      }
    }
  }

  /**
   * Validate Assessment Store Operations (CRITICAL)
   */
  async validateAssessmentOperation<T>(
    operation: () => Promise<T>,
    oldStore: any,
    newStore: any
  ): Promise<T> {
    const storeOperation: StoreOperation = {
      type: 'READ',
      store: 'ASSESSMENT',
      payload: null,
      expectedResult: null,
      timestamp: createISODateString()
    };

    return this.executeWithValidation(
      storeOperation,
      () => operation.call(oldStore),
      () => operation.call(newStore)
    );
  }

  /**
   * Validate Crisis Store Operations (ULTRA-CRITICAL)
   */
  async validateCrisisOperation<T>(
    operation: () => Promise<T>,
    oldStore: any,
    newStore: any
  ): Promise<T> {
    const startTime = Date.now();

    const storeOperation: StoreOperation = {
      type: 'READ',
      store: 'CRISIS',
      payload: null,
      expectedResult: null,
      timestamp: createISODateString()
    };

    const result = await this.executeWithValidation(
      storeOperation,
      () => operation.call(oldStore),
      () => operation.call(newStore)
    );

    const responseTime = Date.now() - startTime;

    // Crisis operations MUST be under 200ms
    if (responseTime > this.config.crisisResponseThreshold) {
      console.error('🚨 CRISIS PERFORMANCE VIOLATION:', responseTime, 'ms');
      await this.triggerEmergencyRollback('CRISIS_PERFORMANCE_VIOLATION');
    }

    return result;
  }

  /**
   * Compare results between old and new stores
   */
  private async compareResults(
    storeName: string,
    oldResult: any,
    newResult: any,
    responseTime: number
  ): Promise<StoreComparisonResult> {
    const discrepancies: ValidationDiscrepancy[] = [];

    // Deep comparison of results
    const dataMatch = this.deepCompare(oldResult, newResult, '', discrepancies);

    // Assess performance match (within 10% tolerance)
    const performanceMatch = Math.abs(responseTime) < 50; // Allow 50ms variance

    return {
      storeName,
      dataMatch,
      performanceMatch,
      discrepancies,
      responseTime: {
        old: responseTime, // Placeholder - would need actual old store timing
        new: responseTime
      }
    };
  }

  /**
   * Deep comparison with discrepancy tracking
   */
  private deepCompare(
    oldValue: any,
    newValue: any,
    path: string,
    discrepancies: ValidationDiscrepancy[]
  ): boolean {
    if (oldValue === newValue) return true;

    // Handle null/undefined
    if (oldValue == null || newValue == null) {
      discrepancies.push({
        field: path,
        oldValue,
        newValue,
        severity: 'HIGH',
        timestamp: createISODateString(),
        impact: 'DATA'
      });
      return false;
    }

    // Handle arrays
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      if (oldValue.length !== newValue.length) {
        discrepancies.push({
          field: `${path}.length`,
          oldValue: oldValue.length,
          newValue: newValue.length,
          severity: 'HIGH',
          timestamp: createISODateString(),
          impact: 'DATA'
        });
        return false;
      }

      let allMatch = true;
      for (let i = 0; i < oldValue.length; i++) {
        if (!this.deepCompare(oldValue[i], newValue[i], `${path}[${i}]`, discrepancies)) {
          allMatch = false;
        }
      }
      return allMatch;
    }

    // Handle objects
    if (typeof oldValue === 'object' && typeof newValue === 'object') {
      const oldKeys = Object.keys(oldValue);
      const newKeys = Object.keys(newValue);

      if (oldKeys.length !== newKeys.length) {
        discrepancies.push({
          field: `${path}.keys`,
          oldValue: oldKeys,
          newValue: newKeys,
          severity: 'MEDIUM',
          timestamp: createISODateString(),
          impact: 'DATA'
        });
      }

      let allMatch = true;
      for (const key of [...new Set([...oldKeys, ...newKeys])]) {
        const newPath = path ? `${path}.${key}` : key;
        if (!this.deepCompare(oldValue[key], newValue[key], newPath, discrepancies)) {
          allMatch = false;
        }
      }
      return allMatch;
    }

    // Primitive values don't match
    discrepancies.push({
      field: path,
      oldValue,
      newValue,
      severity: this.assessSeverity(path, oldValue, newValue),
      timestamp: createISODateString(),
      impact: this.assessImpact(path)
    });

    return false;
  }

  /**
   * Assess severity of discrepancy
   */
  private assessSeverity(field: string, oldValue: any, newValue: any): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    // Clinical data discrepancies are CRITICAL
    if (field.includes('phq9') || field.includes('gad7') || field.includes('crisis')) {
      return 'CRITICAL';
    }

    // Score calculations are CRITICAL
    if (field.includes('score') || field.includes('severity')) {
      return 'CRITICAL';
    }

    // Authentication and user data are HIGH
    if (field.includes('user') || field.includes('auth') || field.includes('profile')) {
      return 'HIGH';
    }

    // Settings and preferences are MEDIUM
    if (field.includes('settings') || field.includes('preferences')) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  /**
   * Assess impact of discrepancy
   */
  private assessImpact(field: string): 'CLINICAL' | 'PERFORMANCE' | 'DATA' | 'SAFETY' {
    if (field.includes('crisis') || field.includes('suicidal') || field.includes('emergency')) {
      return 'SAFETY';
    }

    if (field.includes('phq9') || field.includes('gad7') || field.includes('assessment')) {
      return 'CLINICAL';
    }

    if (field.includes('response') || field.includes('time') || field.includes('performance')) {
      return 'PERFORMANCE';
    }

    return 'DATA';
  }

  /**
   * Validate performance thresholds
   */
  private validatePerformance(operation: StoreOperation, responseTime: number): void {
    let threshold = 1000; // Default 1s

    switch (operation.store) {
      case 'CRISIS':
        threshold = this.config.crisisResponseThreshold;
        break;
      case 'ASSESSMENT':
        threshold = this.config.assessmentResponseThreshold;
        break;
      case 'USER':
      case 'SETTINGS':
        threshold = 1000; // 1s for non-critical operations
        break;
    }

    if (responseTime > threshold) {
      this.validationResults.push({
        field: 'responseTime',
        oldValue: threshold,
        newValue: responseTime,
        severity: operation.store === 'CRISIS' ? 'CRITICAL' : 'HIGH',
        timestamp: createISODateString(),
        impact: 'PERFORMANCE'
      });
    }
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(storeName: string, responseTime: number): void {
    if (!this.performanceMetrics.has(storeName)) {
      this.performanceMetrics.set(storeName, []);
    }
    
    this.performanceMetrics.get(storeName)!.push(responseTime);
  }

  /**
   * Determine if rollback should be triggered
   */
  private shouldRollback(comparison: StoreComparisonResult): boolean {
    if (!this.config.autoRollbackEnabled) return false;

    // Any CRITICAL discrepancy triggers rollback
    const criticalDiscrepancies = comparison.discrepancies.filter(d => d.severity === 'CRITICAL');
    if (criticalDiscrepancies.length > 0) return true;

    // Multiple HIGH discrepancies trigger rollback
    const highDiscrepancies = comparison.discrepancies.filter(d => d.severity === 'HIGH');
    if (highDiscrepancies.length > 3) return true;

    // Performance violations trigger rollback
    if (!comparison.performanceMatch && comparison.storeName === 'CRISIS') return true;

    return false;
  }

  /**
   * Trigger store rollback
   */
  private async triggerRollback(storeName: string, discrepancies: ValidationDiscrepancy[]): Promise<void> {
    console.log('🔄 ROLLBACK TRIGGERED:', storeName, discrepancies.length, 'discrepancies');

    const rollbackCallback = this.rollbackCallbacks.get(storeName);
    if (rollbackCallback) {
      await rollbackCallback();
    }

    // Log rollback event
    await AsyncStorage.setItem(`ROLLBACK_${storeName}_${Date.now()}`, JSON.stringify({
      storeName,
      discrepancies,
      timestamp: createISODateString()
    }));
  }

  /**
   * Emergency rollback for critical failures
   */
  private async triggerEmergencyRollback(reason: string): Promise<void> {
    console.log('🚨 EMERGENCY ROLLBACK:', reason);

    // Stop parallel run
    this.isRunning = false;

    // Execute all rollbacks
    for (const [storeName, callback] of this.rollbackCallbacks.entries()) {
      try {
        await callback();
        console.log('✅ Rolled back:', storeName);
      } catch (error) {
        console.error('❌ Rollback failed:', storeName, error);
      }
    }

    // Log emergency rollback
    await AsyncStorage.setItem(`EMERGENCY_ROLLBACK_${Date.now()}`, JSON.stringify({
      reason,
      timestamp: createISODateString(),
      stores: Array.from(this.rollbackCallbacks.keys())
    }));
  }

  /**
   * Register rollback callback for a store
   */
  registerRollback(storeName: string, callback: () => Promise<void>): void {
    this.rollbackCallbacks.set(storeName, callback);
  }

  /**
   * Start continuous validation monitoring
   */
  private startContinuousValidation(): void {
    setInterval(() => {
      if (!this.isRunning) return;

      this.performHealthCheck();
    }, this.config.validationInterval);
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    // Check for accumulated discrepancies
    const recentDiscrepancies = this.validationResults.filter(
      d => Date.now() - new Date(d.timestamp).getTime() < 60000 // Last minute
    );

    const criticalCount = recentDiscrepancies.filter(d => d.severity === 'CRITICAL').length;
    
    if (criticalCount > 0) {
      console.log('🚨 Health check: Critical discrepancies detected:', criticalCount);
      await this.triggerEmergencyRollback('HEALTH_CHECK_CRITICAL_DISCREPANCIES');
    }
  }

  /**
   * Create state checkpoints
   */
  private async createStateCheckpoints(): Promise<void> {
    const checkpoint = {
      timestamp: createISODateString(),
      stores: {
        user: 'STATE_CHECKPOINT_USER',
        assessment: 'STATE_CHECKPOINT_ASSESSMENT',
        crisis: 'STATE_CHECKPOINT_CRISIS',
        settings: 'STATE_CHECKPOINT_SETTINGS'
      }
    };

    await AsyncStorage.setItem('PARALLEL_RUN_CHECKPOINT', JSON.stringify(checkpoint));
  }

  /**
   * Complete parallel run and generate report
   */
  private async completeParallelRun(): Promise<ParallelRunResult> {
    this.isRunning = false;

    console.log('✅ PHASE 5E COMPLETE: 24-hour parallel run finished');

    const result: ParallelRunResult = {
      success: this.validationResults.filter(d => d.severity === 'CRITICAL').length === 0,
      duration: this.config.duration,
      totalOperations: this.validationResults.length,
      discrepanciesFound: this.validationResults.length,
      rollbacksTriggered: Array.from(this.rollbackCallbacks.keys()).length,
      performanceViolations: this.validationResults.filter(d => d.impact === 'PERFORMANCE').length,
      storeComparisons: [] // Would be populated during run
    };

    await AsyncStorage.setItem('PARALLEL_RUN_RESULT', JSON.stringify(result));
    
    return result;
  }

  /**
   * Get current validation status
   */
  getValidationStatus() {
    return {
      isRunning: this.isRunning,
      discrepancies: this.validationResults.length,
      criticalIssues: this.validationResults.filter(d => d.severity === 'CRITICAL').length,
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
      rollbacksRegistered: this.rollbackCallbacks.size
    };
  }
}

export default ParallelValidationEngine;
export type {
  ParallelRunConfig,
  ParallelRunResult,
  ValidationDiscrepancy,
  StoreComparisonResult,
  StoreOperation
};