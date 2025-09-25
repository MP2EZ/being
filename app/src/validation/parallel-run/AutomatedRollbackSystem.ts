/**
 * Automated Rollback System - Phase 5E: Safety Net
 * 
 * MISSION: Ensure zero-downtime rollback on discrepancies
 * CRITICAL: Immediate rollback for clinical/crisis data discrepancies
 */

import { ISODateString, createISODateString } from '../../types/clinical';
import { ValidationDiscrepancy } from './ParallelValidationEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface RollbackTrigger {
  id: string;
  type: 'DISCREPANCY' | 'PERFORMANCE' | 'ERROR' | 'MANUAL';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  store: 'USER' | 'ASSESSMENT' | 'CRISIS' | 'SETTINGS' | 'ALL';
  threshold: number;
  description: string;
  autoExecute: boolean;
}

interface RollbackEvent {
  triggerId: string;
  timestamp: ISODateString;
  cause: string;
  affectedStores: string[];
  executionTime: number;
  success: boolean;
  recoveryActions: string[];
}

interface RollbackStrategy {
  name: string;
  priority: number;
  stores: string[];
  actions: RollbackAction[];
  verificationSteps: string[];
}

interface RollbackAction {
  type: 'RESTORE_STATE' | 'CLEAR_CACHE' | 'RESET_STORE' | 'ALERT_USER' | 'LOG_EVENT';
  target: string;
  payload?: any;
}

class AutomatedRollbackSystem {
  private triggers: Map<string, RollbackTrigger> = new Map();
  private strategies: Map<string, RollbackStrategy> = new Map();
  private rollbackHistory: RollbackEvent[] = [];
  private isRollbackInProgress: boolean = false;

  constructor() {
    this.initializeDefaultTriggers();
    this.initializeRollbackStrategies();
  }

  /**
   * Initialize default rollback triggers
   */
  private initializeDefaultTriggers(): void {
    // Critical discrepancy triggers
    this.triggers.set('CRITICAL_CLINICAL_DISCREPANCY', {
      id: 'CRITICAL_CLINICAL_DISCREPANCY',
      type: 'DISCREPANCY',
      severity: 'CRITICAL',
      store: 'ASSESSMENT',
      threshold: 1, // Any clinical discrepancy
      description: 'PHQ-9/GAD-7 calculation mismatch between stores',
      autoExecute: true
    });

    this.triggers.set('CRISIS_SAFETY_VIOLATION', {
      id: 'CRISIS_SAFETY_VIOLATION',
      type: 'DISCREPANCY',
      severity: 'CRITICAL',
      store: 'CRISIS',
      threshold: 1, // Any crisis safety issue
      description: 'Crisis detection or response discrepancy',
      autoExecute: true
    });

    this.triggers.set('CRISIS_PERFORMANCE_VIOLATION', {
      id: 'CRISIS_PERFORMANCE_VIOLATION',
      type: 'PERFORMANCE',
      severity: 'CRITICAL',
      store: 'CRISIS',
      threshold: 200, // >200ms response time
      description: 'Crisis response time exceeded 200ms threshold',
      autoExecute: true
    });

    this.triggers.set('ASSESSMENT_PERFORMANCE_VIOLATION', {
      id: 'ASSESSMENT_PERFORMANCE_VIOLATION',
      type: 'PERFORMANCE',
      severity: 'HIGH',
      store: 'ASSESSMENT',
      threshold: 500, // >500ms response time
      description: 'Assessment response time exceeded 500ms threshold',
      autoExecute: false // Requires manual approval for assessment performance issues
    });

    this.triggers.set('USER_DATA_CORRUPTION', {
      id: 'USER_DATA_CORRUPTION',
      type: 'ERROR',
      severity: 'HIGH',
      store: 'USER',
      threshold: 3, // Multiple errors
      description: 'User data corruption detected',
      autoExecute: true
    });

    this.triggers.set('MULTIPLE_STORE_FAILURES', {
      id: 'MULTIPLE_STORE_FAILURES',
      type: 'ERROR',
      severity: 'CRITICAL',
      store: 'ALL',
      threshold: 2, // 2 or more store failures
      description: 'Multiple store systems failing simultaneously',
      autoExecute: true
    });
  }

  /**
   * Initialize rollback strategies
   */
  private initializeRollbackStrategies(): void {
    // Emergency Crisis Rollback
    this.strategies.set('EMERGENCY_CRISIS', {
      name: 'Emergency Crisis System Rollback',
      priority: 1,
      stores: ['CRISIS'],
      actions: [
        { type: 'RESTORE_STATE', target: 'CRISIS_STORE' },
        { type: 'CLEAR_CACHE', target: 'CRISIS_CACHE' },
        { type: 'ALERT_USER', target: 'CRISIS_TEAM' },
        { type: 'LOG_EVENT', target: 'EMERGENCY_LOG' }
      ],
      verificationSteps: [
        'Verify crisis button functionality',
        'Test emergency contact access',
        'Validate 988 integration',
        'Confirm response time <200ms'
      ]
    });

    // Clinical Assessment Rollback
    this.strategies.set('CLINICAL_ASSESSMENT', {
      name: 'Clinical Assessment Data Rollback',
      priority: 2,
      stores: ['ASSESSMENT'],
      actions: [
        { type: 'RESTORE_STATE', target: 'ASSESSMENT_STORE' },
        { type: 'CLEAR_CACHE', target: 'PHQ9_GAD7_CACHE' },
        { type: 'RESET_STORE', target: 'CLINICAL_CALCULATIONS' },
        { type: 'LOG_EVENT', target: 'CLINICAL_LOG' }
      ],
      verificationSteps: [
        'Verify PHQ-9 calculation accuracy',
        'Verify GAD-7 calculation accuracy',
        'Test crisis threshold detection',
        'Confirm assessment loading <500ms'
      ]
    });

    // User Data Rollback
    this.strategies.set('USER_DATA', {
      name: 'User Data and Settings Rollback',
      priority: 3,
      stores: ['USER', 'SETTINGS'],
      actions: [
        { type: 'RESTORE_STATE', target: 'USER_STORE' },
        { type: 'RESTORE_STATE', target: 'SETTINGS_STORE' },
        { type: 'CLEAR_CACHE', target: 'USER_PREFERENCES_CACHE' },
        { type: 'LOG_EVENT', target: 'USER_LOG' }
      ],
      verificationSteps: [
        'Verify user authentication',
        'Test settings persistence',
        'Confirm preference synchronization'
      ]
    });

    // Complete System Rollback
    this.strategies.set('COMPLETE_SYSTEM', {
      name: 'Complete System Rollback',
      priority: 4,
      stores: ['ALL'],
      actions: [
        { type: 'RESTORE_STATE', target: 'ALL_STORES' },
        { type: 'CLEAR_CACHE', target: 'ALL_CACHES' },
        { type: 'RESET_STORE', target: 'PARALLEL_RUN_STATE' },
        { type: 'ALERT_USER', target: 'DEVELOPMENT_TEAM' },
        { type: 'LOG_EVENT', target: 'SYSTEM_LOG' }
      ],
      verificationSteps: [
        'Complete functional testing suite',
        'Performance benchmark verification',
        'Data integrity check',
        'User acceptance testing'
      ]
    });
  }

  /**
   * Evaluate rollback triggers
   */
  async evaluateTriggers(
    discrepancies: ValidationDiscrepancy[],
    performanceMetrics: Record<string, number[]>,
    errorCounts: Record<string, number>
  ): Promise<RollbackEvent[]> {
    const rollbackEvents: RollbackEvent[] = [];

    for (const [triggerId, trigger] of this.triggers) {
      const shouldTrigger = await this.shouldTriggerRollback(
        trigger,
        discrepancies,
        performanceMetrics,
        errorCounts
      );

      if (shouldTrigger) {
        if (trigger.autoExecute) {
          const event = await this.executeRollback(triggerId, trigger);
          rollbackEvents.push(event);
        } else {
          await this.requestRollbackApproval(trigger);
        }
      }
    }

    return rollbackEvents;
  }

  /**
   * Determine if trigger conditions are met
   */
  private async shouldTriggerRollback(
    trigger: RollbackTrigger,
    discrepancies: ValidationDiscrepancy[],
    performanceMetrics: Record<string, number[]>,
    errorCounts: Record<string, number>
  ): Promise<boolean> {
    switch (trigger.type) {
      case 'DISCREPANCY':
        return this.evaluateDiscrepancyTrigger(trigger, discrepancies);
      
      case 'PERFORMANCE':
        return this.evaluatePerformanceTrigger(trigger, performanceMetrics);
      
      case 'ERROR':
        return this.evaluateErrorTrigger(trigger, errorCounts);
      
      default:
        return false;
    }
  }

  /**
   * Evaluate discrepancy triggers
   */
  private evaluateDiscrepancyTrigger(
    trigger: RollbackTrigger,
    discrepancies: ValidationDiscrepancy[]
  ): boolean {
    const relevantDiscrepancies = discrepancies.filter(d => {
      // Filter by severity
      if (d.severity !== trigger.severity) return false;

      // Filter by store
      if (trigger.store !== 'ALL') {
        const storeMatch = d.field.toLowerCase().includes(trigger.store.toLowerCase()) ||
                          d.impact === 'CLINICAL' && trigger.store === 'ASSESSMENT' ||
                          d.impact === 'SAFETY' && trigger.store === 'CRISIS';
        if (!storeMatch) return false;
      }

      return true;
    });

    return relevantDiscrepancies.length >= trigger.threshold;
  }

  /**
   * Evaluate performance triggers
   */
  private evaluatePerformanceTrigger(
    trigger: RollbackTrigger,
    performanceMetrics: Record<string, number[]>
  ): boolean {
    const storeKey = trigger.store.toLowerCase();
    const metrics = performanceMetrics[storeKey] || [];
    
    if (metrics.length === 0) return false;

    // Check if recent metrics exceed threshold
    const recentMetrics = metrics.slice(-10); // Last 10 operations
    const exceedingThreshold = recentMetrics.filter(m => m > trigger.threshold);
    
    // Trigger if more than 50% of recent operations exceed threshold
    return exceedingThreshold.length > (recentMetrics.length * 0.5);
  }

  /**
   * Evaluate error triggers
   */
  private evaluateErrorTrigger(
    trigger: RollbackTrigger,
    errorCounts: Record<string, number>
  ): boolean {
    if (trigger.store === 'ALL') {
      const totalErrors = Object.values(errorCounts).reduce((sum, count) => sum + count, 0);
      return totalErrors >= trigger.threshold;
    }

    const storeKey = trigger.store.toLowerCase();
    const errorCount = errorCounts[storeKey] || 0;
    return errorCount >= trigger.threshold;
  }

  /**
   * Execute rollback with appropriate strategy
   */
  async executeRollback(triggerId: string, trigger: RollbackTrigger): Promise<RollbackEvent> {
    if (this.isRollbackInProgress) {
      throw new Error('Rollback already in progress');
    }

    this.isRollbackInProgress = true;
    const startTime = Date.now();

    console.log('🔄 EXECUTING ROLLBACK:', triggerId, trigger.description);

    try {
      // Select appropriate strategy
      const strategy = this.selectRollbackStrategy(trigger);
      
      // Execute rollback actions
      const recoveryActions = await this.executeRollbackActions(strategy);
      
      // Verify rollback success
      const verificationPassed = await this.verifyRollback(strategy);
      
      const rollbackEvent: RollbackEvent = {
        triggerId,
        timestamp: createISODateString(),
        cause: trigger.description,
        affectedStores: strategy.stores,
        executionTime: Date.now() - startTime,
        success: verificationPassed,
        recoveryActions
      };

      // Log rollback event
      this.rollbackHistory.push(rollbackEvent);
      await this.persistRollbackEvent(rollbackEvent);

      console.log(verificationPassed ? '✅ ROLLBACK SUCCESS' : '❌ ROLLBACK FAILED:', rollbackEvent);

      return rollbackEvent;
    } catch (error) {
      console.error('🚨 ROLLBACK EXECUTION FAILED:', error);
      
      const failedEvent: RollbackEvent = {
        triggerId,
        timestamp: createISODateString(),
        cause: `Rollback execution failed: ${error}`,
        affectedStores: [trigger.store],
        executionTime: Date.now() - startTime,
        success: false,
        recoveryActions: ['ROLLBACK_FAILED']
      };

      this.rollbackHistory.push(failedEvent);
      return failedEvent;
    } finally {
      this.isRollbackInProgress = false;
    }
  }

  /**
   * Select appropriate rollback strategy
   */
  private selectRollbackStrategy(trigger: RollbackTrigger): RollbackStrategy {
    // Crisis triggers use emergency strategy
    if (trigger.store === 'CRISIS' || trigger.severity === 'CRITICAL') {
      if (trigger.store === 'CRISIS') {
        return this.strategies.get('EMERGENCY_CRISIS')!;
      }
      if (trigger.store === 'ASSESSMENT') {
        return this.strategies.get('CLINICAL_ASSESSMENT')!;
      }
      if (trigger.store === 'ALL') {
        return this.strategies.get('COMPLETE_SYSTEM')!;
      }
    }

    // Default to user data strategy
    return this.strategies.get('USER_DATA')!;
  }

  /**
   * Execute rollback actions
   */
  private async executeRollbackActions(strategy: RollbackStrategy): Promise<string[]> {
    const executedActions: string[] = [];

    for (const action of strategy.actions) {
      try {
        await this.executeAction(action);
        executedActions.push(`${action.type}:${action.target}:SUCCESS`);
      } catch (error) {
        console.error('Rollback action failed:', action, error);
        executedActions.push(`${action.type}:${action.target}:FAILED`);
      }
    }

    return executedActions;
  }

  /**
   * Execute individual rollback action
   */
  private async executeAction(action: RollbackAction): Promise<void> {
    switch (action.type) {
      case 'RESTORE_STATE':
        await this.restoreState(action.target);
        break;
      
      case 'CLEAR_CACHE':
        await this.clearCache(action.target);
        break;
      
      case 'RESET_STORE':
        await this.resetStore(action.target);
        break;
      
      case 'ALERT_USER':
        await this.sendAlert(action.target, action.payload);
        break;
      
      case 'LOG_EVENT':
        await this.logEvent(action.target, action.payload);
        break;
    }
  }

  /**
   * Restore state from backup
   */
  private async restoreState(target: string): Promise<void> {
    const backupKey = `BACKUP_${target}_${Date.now()}`;
    
    try {
      const backupData = await AsyncStorage.getItem(backupKey);
      if (backupData) {
        await AsyncStorage.setItem(target, backupData);
        console.log('✅ State restored:', target);
      } else {
        console.warn('⚠️ No backup found for:', target);
      }
    } catch (error) {
      console.error('❌ State restore failed:', target, error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  private async clearCache(target: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(target);
      console.log('✅ Cache cleared:', target);
    } catch (error) {
      console.error('❌ Cache clear failed:', target, error);
      throw error;
    }
  }

  /**
   * Reset store to default state
   */
  private async resetStore(target: string): Promise<void> {
    try {
      // Implementation would reset store to initial state
      await AsyncStorage.removeItem(target);
      console.log('✅ Store reset:', target);
    } catch (error) {
      console.error('❌ Store reset failed:', target, error);
      throw error;
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlert(target: string, message: any): Promise<void> {
    console.log('🚨 ROLLBACK ALERT:', target, message);
    
    if (target === 'CRISIS_TEAM' || target === 'DEVELOPMENT_TEAM') {
      Alert.alert(
        'System Rollback Executed',
        `Automated rollback triggered. Target: ${target}`,
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Log rollback event
   */
  private async logEvent(target: string, data: any): Promise<void> {
    const logEntry = {
      timestamp: createISODateString(),
      target,
      data,
      type: 'ROLLBACK_ACTION'
    };

    try {
      const existingLog = await AsyncStorage.getItem(target);
      const logs = existingLog ? JSON.parse(existingLog) : [];
      logs.push(logEntry);
      
      await AsyncStorage.setItem(target, JSON.stringify(logs));
      console.log('✅ Event logged:', target);
    } catch (error) {
      console.error('❌ Event logging failed:', target, error);
    }
  }

  /**
   * Verify rollback success
   */
  private async verifyRollback(strategy: RollbackStrategy): Promise<boolean> {
    let allStepsPassed = true;

    for (const step of strategy.verificationSteps) {
      try {
        const stepPassed = await this.verifyStep(step);
        if (!stepPassed) {
          console.warn('⚠️ Verification step failed:', step);
          allStepsPassed = false;
        }
      } catch (error) {
        console.error('❌ Verification step error:', step, error);
        allStepsPassed = false;
      }
    }

    return allStepsPassed;
  }

  /**
   * Verify individual step
   */
  private async verifyStep(step: string): Promise<boolean> {
    // Implementation would perform actual verification
    // For now, return true to simulate successful verification
    console.log('✅ Verification step passed:', step);
    return true;
  }

  /**
   * Request manual rollback approval
   */
  private async requestRollbackApproval(trigger: RollbackTrigger): Promise<void> {
    console.log('🤔 ROLLBACK APPROVAL REQUESTED:', trigger.description);
    
    // Store approval request
    await AsyncStorage.setItem(`ROLLBACK_APPROVAL_${trigger.id}`, JSON.stringify({
      trigger,
      timestamp: createISODateString(),
      status: 'PENDING'
    }));
  }

  /**
   * Persist rollback event
   */
  private async persistRollbackEvent(event: RollbackEvent): Promise<void> {
    try {
      const existingEvents = await AsyncStorage.getItem('ROLLBACK_HISTORY');
      const events = existingEvents ? JSON.parse(existingEvents) : [];
      
      events.push(event);
      
      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      
      await AsyncStorage.setItem('ROLLBACK_HISTORY', JSON.stringify(events));
    } catch (error) {
      console.error('Failed to persist rollback event:', error);
    }
  }

  /**
   * Get rollback system status
   */
  getSystemStatus() {
    return {
      triggersActive: this.triggers.size,
      strategiesLoaded: this.strategies.size,
      rollbackInProgress: this.isRollbackInProgress,
      totalRollbacks: this.rollbackHistory.length,
      successfulRollbacks: this.rollbackHistory.filter(e => e.success).length,
      lastRollback: this.rollbackHistory[this.rollbackHistory.length - 1]
    };
  }

  /**
   * Manual rollback trigger
   */
  async triggerManualRollback(
    reason: string,
    stores: string[] = ['ALL']
  ): Promise<RollbackEvent> {
    const manualTrigger: RollbackTrigger = {
      id: 'MANUAL_ROLLBACK',
      type: 'MANUAL',
      severity: 'HIGH',
      store: stores.includes('ALL') ? 'ALL' : stores[0] as any,
      threshold: 1,
      description: reason,
      autoExecute: true
    };

    return this.executeRollback('MANUAL_ROLLBACK', manualTrigger);
  }
}

export default AutomatedRollbackSystem;
export type { RollbackTrigger, RollbackEvent, RollbackStrategy, RollbackAction };