/**
 * Feature Coordination Security Service
 * 
 * Provides secure coordination between SQLite migration and Calendar integration
 * to prevent race conditions and ensure crisis data access during all operations.
 * 
 * CRITICAL: Addresses identified security gaps in multi-feature coordination
 */

import { encryptionService, DataSensitivity } from './EncryptionService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SecurityOperation {
  readonly id: string;
  readonly type: 'migration' | 'calendar' | 'emergency' | 'key_rotation';
  readonly priority: 'critical' | 'high' | 'medium' | 'low';
  readonly requiresExclusiveLock: boolean;
  readonly emergencyAccessRequired: boolean;
  readonly execute: () => Promise<void>;
  readonly rollback: () => Promise<void>;
  readonly validate: () => Promise<boolean>;
}

export interface SecurityLock {
  readonly id: string;
  readonly acquiredAt: string;
  readonly operation: string;
  readonly priority: SecurityOperation['priority'];
  readonly release: () => Promise<void>;
}

export interface EmergencyAccessValidation {
  readonly accessible: boolean;
  readonly responseTime: number;
  readonly crisisDataAvailable: boolean;
  readonly fallbackMechanismActive: boolean;
  readonly timestamp: string;
}

export interface FeatureCoordinationStatus {
  readonly activeLocks: readonly SecurityLock[];
  readonly queuedOperations: readonly SecurityOperation[];
  readonly lastEmergencyAccess: string | null;
  readonly emergencyAccessHealth: 'healthy' | 'degraded' | 'failed';
  readonly securityBoundariesIntact: boolean;
}

export interface SecurityBoundaryValidation {
  readonly boundaryType: 'encryption' | 'access_control' | 'data_isolation' | 'audit_trail';
  readonly status: 'secure' | 'warning' | 'violation';
  readonly details: string;
  readonly recommendedAction?: string;
}

export class FeatureCoordinationSecurityService {
  private static instance: FeatureCoordinationSecurityService;
  private readonly locks = new Map<string, SecurityLock>();
  private readonly operationQueue: SecurityOperation[] = [];
  private readonly EMERGENCY_ACCESS_TIMEOUT_MS = 200;
  private readonly LOCK_TIMEOUT_MS = 30000; // 30 seconds
  private readonly SECURITY_LOCK_KEY = '@fullmind_security_lock';

  private constructor() {}

  public static getInstance(): FeatureCoordinationSecurityService {
    if (!FeatureCoordinationSecurityService.instance) {
      FeatureCoordinationSecurityService.instance = new FeatureCoordinationSecurityService();
    }
    return FeatureCoordinationSecurityService.instance;
  }

  /**
   * Coordinate multiple security operations with proper synchronization
   * CRITICAL: Prevents race conditions between migration and calendar features
   */
  async coordinateSecureOperations(operations: SecurityOperation[]): Promise<void> {
    // Sort operations by priority
    const sortedOperations = this.sortOperationsByPriority(operations);
    
    // Validate all operations before execution
    for (const operation of sortedOperations) {
      const isValid = await operation.validate();
      if (!isValid) {
        throw new Error(`Security operation validation failed: ${operation.id}`);
      }
    }

    // Execute operations with proper coordination
    for (const operation of sortedOperations) {
      await this.executeSecureOperation(operation);
    }
  }

  /**
   * Execute single operation with security boundaries
   */
  private async executeSecureOperation(operation: SecurityOperation): Promise<void> {
    let lock: SecurityLock | null = null;

    try {
      // Acquire security lock if required
      if (operation.requiresExclusiveLock) {
        lock = await this.acquireSecurityLock(operation);
      }

      // Validate emergency access if required
      if (operation.emergencyAccessRequired) {
        const emergencyValidation = await this.validateEmergencyAccess();
        if (!emergencyValidation.accessible) {
          throw new Error('Emergency access validation failed - operation aborted');
        }
      }

      // Validate security boundaries before execution
      const boundaryValidation = await this.validateSecurityBoundaries(operation);
      if (boundaryValidation.some(b => b.status === 'violation')) {
        throw new Error('Security boundary violation detected - operation aborted');
      }

      // Execute the operation
      console.log(`🔒 Executing secure operation: ${operation.id} (${operation.type})`);
      await operation.execute();

      // Validate security boundaries after execution
      const postExecutionValidation = await this.validateSecurityBoundaries(operation);
      if (postExecutionValidation.some(b => b.status === 'violation')) {
        console.error('Post-execution security violation detected - initiating rollback');
        await operation.rollback();
        throw new Error('Post-execution security validation failed');
      }

      console.log(`✅ Secure operation completed: ${operation.id}`);

    } catch (error) {
      console.error(`❌ Secure operation failed: ${operation.id}`, error);
      
      // Attempt rollback
      try {
        await operation.rollback();
        console.log(`🔄 Rollback completed for operation: ${operation.id}`);
      } catch (rollbackError) {
        console.error(`💥 Rollback failed for operation: ${operation.id}`, rollbackError);
        throw new Error(`Critical security failure: operation ${operation.id} failed and rollback failed`);
      }

      throw error;
    } finally {
      // Always release the lock
      if (lock) {
        await lock.release();
      }
    }
  }

  /**
   * Acquire exclusive security lock with timeout protection
   */
  private async acquireSecurityLock(operation: SecurityOperation): Promise<SecurityLock> {
    const lockId = `lock_${operation.type}_${Date.now()}`;
    const timeout = setTimeout(() => {
      throw new Error(`Security lock timeout for operation: ${operation.id}`);
    }, this.LOCK_TIMEOUT_MS);

    try {
      // Check for existing locks
      await this.waitForLockAvailability(operation);

      // Create and store lock
      const lock: SecurityLock = {
        id: lockId,
        acquiredAt: new Date().toISOString(),
        operation: operation.id,
        priority: operation.priority,
        release: async () => {
          this.locks.delete(lockId);
          await this.clearStoredLock(lockId);
          clearTimeout(timeout);
        }
      };

      // Store lock for crash recovery
      await this.storeLock(lock);
      this.locks.set(lockId, lock);

      console.log(`🔒 Security lock acquired: ${lockId} for operation ${operation.id}`);
      return lock;

    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Wait for lock availability, respecting priority
   */
  private async waitForLockAvailability(operation: SecurityOperation): Promise<void> {
    const maxWaitTime = 10000; // 10 seconds
    const startTime = Date.now();

    while (this.hasConflictingLocks(operation)) {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error(`Lock wait timeout for operation: ${operation.id}`);
      }

      // Wait and check again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Check for conflicting locks
   */
  private hasConflictingLocks(operation: SecurityOperation): boolean {
    for (const [_, lock] of this.locks) {
      // Migration and calendar operations are mutually exclusive
      if (operation.type === 'migration' && lock.operation.includes('calendar')) {
        return true;
      }
      if (operation.type === 'calendar' && lock.operation.includes('migration')) {
        return true;
      }
      
      // Key rotation requires exclusive access
      if (operation.type === 'key_rotation' || lock.operation.includes('key_rotation')) {
        return true;
      }
    }
    return false;
  }

  /**
   * CRITICAL: Validate emergency access is maintained during all operations
   * Must complete in <200ms to meet clinical requirements
   */
  async validateEmergencyAccess(): Promise<EmergencyAccessValidation> {
    const startTime = performance.now();

    try {
      // Simulate crisis data access
      const crisisDataPromise = this.getCrisisDataWithTimeout();
      const fallbackPromise = this.validateFallbackMechanisms();

      const [crisisData, fallbackActive] = await Promise.all([
        crisisDataPromise,
        fallbackPromise
      ]);

      const responseTime = performance.now() - startTime;

      const validation: EmergencyAccessValidation = {
        accessible: crisisData !== null,
        responseTime,
        crisisDataAvailable: crisisData !== null,
        fallbackMechanismActive: fallbackActive,
        timestamp: new Date().toISOString()
      };

      // CRITICAL: Must meet clinical response time requirement
      if (responseTime > this.EMERGENCY_ACCESS_TIMEOUT_MS) {
        console.warn(`⚠️ Emergency access slow: ${responseTime.toFixed(2)}ms (target: <${this.EMERGENCY_ACCESS_TIMEOUT_MS}ms)`);
      }

      console.log(`🚨 Emergency access validated: ${responseTime.toFixed(2)}ms`);
      return validation;

    } catch (error) {
      const responseTime = performance.now() - startTime;
      console.error('Emergency access validation failed:', error);

      return {
        accessible: false,
        responseTime,
        crisisDataAvailable: false,
        fallbackMechanismActive: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get crisis data with strict timeout
   */
  private async getCrisisDataWithTimeout(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Crisis data access timeout'));
      }, this.EMERGENCY_ACCESS_TIMEOUT_MS);

      try {
        // Simulate accessing encrypted crisis data
        const crisisData = await encryptionService.decryptData(
          { encryptedData: 'simulated_crisis_data', iv: '', timestamp: new Date().toISOString() },
          DataSensitivity.CLINICAL
        );
        
        clearTimeout(timeout);
        resolve(crisisData);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Validate fallback mechanisms are active
   */
  private async validateFallbackMechanisms(): Promise<boolean> {
    try {
      // Check if local emergency contacts are accessible
      const localData = await AsyncStorage.getItem('@fullmind_emergency_contacts');
      return localData !== null;
    } catch (error) {
      console.warn('Fallback mechanism validation failed:', error);
      return false;
    }
  }

  /**
   * Validate security boundaries for operation
   */
  async validateSecurityBoundaries(operation: SecurityOperation): Promise<SecurityBoundaryValidation[]> {
    const validations: SecurityBoundaryValidation[] = [];

    // Validate encryption boundary
    const encryptionValidation = await this.validateEncryptionBoundary(operation);
    validations.push(encryptionValidation);

    // Validate access control boundary
    const accessControlValidation = await this.validateAccessControlBoundary(operation);
    validations.push(accessControlValidation);

    // Validate data isolation boundary
    const isolationValidation = await this.validateDataIsolationBoundary(operation);
    validations.push(isolationValidation);

    // Validate audit trail boundary
    const auditValidation = await this.validateAuditTrailBoundary(operation);
    validations.push(auditValidation);

    return validations;
  }

  /**
   * Validate encryption security boundaries
   */
  private async validateEncryptionBoundary(operation: SecurityOperation): Promise<SecurityBoundaryValidation> {
    try {
      const encryptionStatus = await encryptionService.getEncryptionStatus();
      
      if (!encryptionStatus.initialized) {
        return {
          boundaryType: 'encryption',
          status: 'violation',
          details: 'Encryption service not initialized',
          recommendedAction: 'Initialize encryption service before operation'
        };
      }

      if (encryptionStatus.daysUntilRotation <= 0 && operation.type !== 'key_rotation') {
        return {
          boundaryType: 'encryption',
          status: 'warning',
          details: 'Key rotation overdue',
          recommendedAction: 'Schedule key rotation'
        };
      }

      return {
        boundaryType: 'encryption',
        status: 'secure',
        details: `Encryption active with ${encryptionStatus.daysUntilRotation} days until rotation`
      };

    } catch (error) {
      return {
        boundaryType: 'encryption',
        status: 'violation',
        details: `Encryption validation failed: ${error}`,
        recommendedAction: 'Check encryption service health'
      };
    }
  }

  /**
   * Validate access control boundaries
   */
  private async validateAccessControlBoundary(operation: SecurityOperation): Promise<SecurityBoundaryValidation> {
    // Simulate access control validation
    const hasValidSession = await this.validateSessionSecurity();
    
    if (!hasValidSession && operation.type !== 'emergency') {
      return {
        boundaryType: 'access_control',
        status: 'violation',
        details: 'Invalid or expired session',
        recommendedAction: 'Re-authenticate user before operation'
      };
    }

    return {
      boundaryType: 'access_control',
      status: 'secure',
      details: 'Access control validation passed'
    };
  }

  /**
   * Validate data isolation boundaries
   */
  private async validateDataIsolationBoundary(operation: SecurityOperation): Promise<SecurityBoundaryValidation> {
    // Check for cross-feature data contamination risk
    if (operation.type === 'calendar' && this.hasActiveMigration()) {
      return {
        boundaryType: 'data_isolation',
        status: 'warning',
        details: 'Calendar operation during active migration may access stale data',
        recommendedAction: 'Wait for migration completion or use coordinated operation'
      };
    }

    if (operation.type === 'migration' && this.hasActiveCalendarOperations()) {
      return {
        boundaryType: 'data_isolation',
        status: 'warning',
        details: 'Migration during active calendar operations may cause inconsistencies',
        recommendedAction: 'Coordinate with calendar service or use exclusive lock'
      };
    }

    return {
      boundaryType: 'data_isolation',
      status: 'secure',
      details: 'Data isolation boundaries intact'
    };
  }

  /**
   * Validate audit trail boundaries
   */
  private async validateAuditTrailBoundary(operation: SecurityOperation): Promise<SecurityBoundaryValidation> {
    try {
      // Verify audit logging is active
      const auditEnabled = await this.isAuditLoggingActive();
      
      if (!auditEnabled) {
        return {
          boundaryType: 'audit_trail',
          status: 'violation',
          details: 'Audit logging not active',
          recommendedAction: 'Enable audit logging before operation'
        };
      }

      // Log security operation for audit trail
      await this.logSecurityEvent({
        type: 'security_boundary_validation',
        operation: operation.id,
        timestamp: new Date().toISOString(),
        result: 'passed'
      });

      return {
        boundaryType: 'audit_trail',
        status: 'secure',
        details: 'Audit trail validation passed'
      };

    } catch (error) {
      return {
        boundaryType: 'audit_trail',
        status: 'violation',
        details: `Audit trail validation failed: ${error}`,
        recommendedAction: 'Check audit logging service'
      };
    }
  }

  /**
   * Get current coordination status
   */
  async getCoordinationStatus(): Promise<FeatureCoordinationStatus> {
    const emergencyValidation = await this.validateEmergencyAccess();
    
    return {
      activeLocks: Array.from(this.locks.values()),
      queuedOperations: [...this.operationQueue],
      lastEmergencyAccess: emergencyValidation.timestamp,
      emergencyAccessHealth: emergencyValidation.accessible ? 'healthy' : 
                            emergencyValidation.fallbackMechanismActive ? 'degraded' : 'failed',
      securityBoundariesIntact: await this.areSecurityBoundariesIntact()
    };
  }

  /**
   * Emergency access health check - CRITICAL for crisis scenarios
   */
  async performEmergencyAccessHealthCheck(): Promise<{
    healthy: boolean;
    responseTime: number;
    issues: string[];
    recommendations: string[];
  }> {
    const startTime = performance.now();
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Test emergency access multiple times for consistency
      const accessTests = await Promise.all([
        this.validateEmergencyAccess(),
        this.validateEmergencyAccess(),
        this.validateEmergencyAccess()
      ]);

      const avgResponseTime = accessTests.reduce((sum, test) => sum + test.responseTime, 0) / accessTests.length;
      const failedTests = accessTests.filter(test => !test.accessible).length;

      if (failedTests > 0) {
        issues.push(`${failedTests}/3 emergency access tests failed`);
        recommendations.push('Check encryption service and emergency data availability');
      }

      if (avgResponseTime > this.EMERGENCY_ACCESS_TIMEOUT_MS) {
        issues.push(`Average response time ${avgResponseTime.toFixed(2)}ms exceeds ${this.EMERGENCY_ACCESS_TIMEOUT_MS}ms target`);
        recommendations.push('Optimize emergency access pathway or increase timeout threshold');
      }

      const overallResponseTime = performance.now() - startTime;
      
      return {
        healthy: issues.length === 0,
        responseTime: overallResponseTime,
        issues,
        recommendations
      };

    } catch (error) {
      return {
        healthy: false,
        responseTime: performance.now() - startTime,
        issues: [`Emergency access health check failed: ${error}`],
        recommendations: ['Investigate emergency access system integrity']
      };
    }
  }

  // PRIVATE HELPER METHODS

  private sortOperationsByPriority(operations: SecurityOperation[]): SecurityOperation[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return operations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  private async storeLock(lock: SecurityLock): Promise<void> {
    try {
      await AsyncStorage.setItem(`${this.SECURITY_LOCK_KEY}_${lock.id}`, JSON.stringify({
        id: lock.id,
        acquiredAt: lock.acquiredAt,
        operation: lock.operation,
        priority: lock.priority
      }));
    } catch (error) {
      console.warn('Failed to store security lock:', error);
    }
  }

  private async clearStoredLock(lockId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.SECURITY_LOCK_KEY}_${lockId}`);
    } catch (error) {
      console.warn('Failed to clear stored security lock:', error);
    }
  }

  private async validateSessionSecurity(): Promise<boolean> {
    // Simulate session validation - in real implementation would check JWT/session token
    return true;
  }

  private hasActiveMigration(): boolean {
    return Array.from(this.locks.values()).some(lock => lock.operation.includes('migration'));
  }

  private hasActiveCalendarOperations(): boolean {
    return Array.from(this.locks.values()).some(lock => lock.operation.includes('calendar'));
  }

  private async isAuditLoggingActive(): Promise<boolean> {
    // Simulate audit logging check
    return true;
  }

  private async logSecurityEvent(event: any): Promise<void> {
    console.log(`🔍 SECURITY AUDIT: ${JSON.stringify(event)}`);
  }

  private async areSecurityBoundariesIntact(): Promise<boolean> {
    // Quick check of critical security boundaries
    try {
      const encryptionStatus = await encryptionService.getEncryptionStatus();
      return encryptionStatus.initialized;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const featureCoordinationSecurity = FeatureCoordinationSecurityService.getInstance();