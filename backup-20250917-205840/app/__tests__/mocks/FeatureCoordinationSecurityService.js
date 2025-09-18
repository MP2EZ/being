/**
 * Mock implementation of FeatureCoordinationSecurityService for testing
 * Simulates security coordination between features for test environments
 */

let mockEmergencyAccessValidation = {
  accessible: true,
  responseTime: 45, // Under 200ms requirement
  crisisDataAvailable: true,
  fallbackMechanismActive: false,
  timestamp: new Date().toISOString()
};

let mockSecurityBoundaryValidation = [
  {
    boundaryType: 'encryption',
    status: 'secure',
    details: 'Encryption active with 30 days until rotation'
  },
  {
    boundaryType: 'access_control',
    status: 'secure',
    details: 'Access control validation passed'
  },
  {
    boundaryType: 'data_isolation',
    status: 'secure',
    details: 'Data isolation boundaries intact'
  },
  {
    boundaryType: 'audit_trail',
    status: 'secure',
    details: 'Audit trail validation passed'
  }
];

const mockCoordinationStatus = {
  activeLocks: [],
  queuedOperations: [],
  lastEmergencyAccess: new Date().toISOString(),
  emergencyAccessHealth: 'healthy',
  securityBoundariesIntact: true
};

export class FeatureCoordinationSecurityService {
  constructor() {
    this.shouldFailFallback = false;
    this.shouldFailEncryptionBoundary = false;
    this.shouldFailOperations = false;
    this.shouldTimeout = false;
  }

  static getInstance() {
    if (!FeatureCoordinationSecurityService.instance) {
      FeatureCoordinationSecurityService.instance = new FeatureCoordinationSecurityService();
    }
    return FeatureCoordinationSecurityService.instance;
  }

  async coordinateSecureOperations(operations) {
    console.log(`🔒 Coordinating ${operations.length} secure operations`);
    
    if (this.shouldTimeout) {
      throw new Error('Security lock timeout');
    }

    if (this.shouldFailOperations) {
      // Try to execute and handle failures
      for (const operation of operations) {
        try {
          await operation.execute();
        } catch (error) {
          // Call rollback
          try {
            await operation.rollback();
          } catch (rollbackError) {
            throw new Error('Critical security failure');
          }
          throw error;
        }
      }
    } else {
      // Execute operations in priority order
      for (const operation of operations) {
        await operation.execute();
      }
    }
    
    return Promise.resolve();
  }

  async validateEmergencyAccess() {
    // Simulate emergency access timing
    const startTime = performance.now();
    await new Promise(resolve => setTimeout(resolve, 1)); // 1ms delay
    const responseTime = performance.now() - startTime;
    
    return {
      ...mockEmergencyAccessValidation,
      responseTime: Math.max(responseTime, 45), // Ensure reasonable test time
      fallbackMechanismActive: this.shouldFailFallback
    };
  }

  async validateSecurityBoundaries(operation) {
    // Simulate boundary validation based on operation type
    if (this.shouldFailEncryptionBoundary) {
      const boundaries = [...mockSecurityBoundaryValidation];
      boundaries[0] = {
        boundaryType: 'encryption',
        status: 'violation',
        details: 'Encryption service not initialized',
        recommendedAction: 'Initialize encryption service before operation'
      };
      return boundaries;
    }

    if (operation.type === 'migration' && this.hasActiveCalendarOperations()) {
      const boundaries = [...mockSecurityBoundaryValidation];
      boundaries[2] = {
        boundaryType: 'data_isolation',
        status: 'warning',
        details: 'Migration during active calendar operations may cause inconsistencies'
      };
      return boundaries;
    }

    return mockSecurityBoundaryValidation;
  }

  async getCoordinationStatus() {
    return mockCoordinationStatus;
  }

  async performEmergencyAccessHealthCheck() {
    const startTime = performance.now();
    
    // Simulate health check process
    await new Promise(resolve => setTimeout(resolve, 5));
    
    const responseTime = performance.now() - startTime;
    
    return {
      healthy: true,
      responseTime,
      issues: [],
      recommendations: []
    };
  }

  // Helper methods for testing
  hasActiveCalendarOperations() {
    return false; // Default to no conflicts for most tests
  }

  hasActiveMigration() {
    return false; // Default to no conflicts for most tests
  }

  // Test configuration methods
  setFailFallback(shouldFail) {
    this.shouldFailFallback = shouldFail;
  }

  setFailEncryptionBoundary(shouldFail) {
    this.shouldFailEncryptionBoundary = shouldFail;
  }

  setFailOperations(shouldFail) {
    this.shouldFailOperations = shouldFail;
  }

  setTimeout(shouldTimeout) {
    this.shouldTimeout = shouldTimeout;
  }

  reset() {
    this.shouldFailFallback = false;
    this.shouldFailEncryptionBoundary = false;
    this.shouldFailOperations = false;
    this.shouldTimeout = false;
  }
}

// Export singleton instance
export const featureCoordinationSecurity = new FeatureCoordinationSecurityService();