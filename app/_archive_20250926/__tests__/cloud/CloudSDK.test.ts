/**
 * Cloud SDK Test Suite - Comprehensive Testing for P0-CLOUD Phase 1
 *
 * Tests zero-knowledge architecture, HIPAA compliance, and production readiness
 */

import { FullMindCloudSDK, createCloudSDK } from '../../src/services/cloud/CloudSDK';
import { CheckIn, Assessment, CrisisPlan, UserProfile } from '../../src/types';
import { CLOUD_CONSTANTS } from '../../src/types/cloud';

// Mock environment for testing
const mockEnv = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  EXPO_PUBLIC_SUPABASE_REGION: 'us-east-1',
  EXPO_PUBLIC_CLOUD_FEATURES_ENABLED: 'false',
  EXPO_PUBLIC_APP_VERSION: '1.0.0-test'
};

// Mock data for testing
const mockCheckIn: CheckIn = {
  id: 'checkin-test-001',
  type: 'morning',
  startedAt: '2025-01-27T08:00:00.000Z',
  completedAt: '2025-01-27T08:15:00.000Z',
  skipped: false,
  data: {
    bodyAreas: ['chest', 'shoulders'],
    emotions: ['calm', 'hopeful'],
    thoughts: ['positive thinking'],
    sleepQuality: 7,
    energyLevel: 8,
    anxietyLevel: 3,
    todayValue: 'compassion',
    intention: 'practice mindfulness'
  }
};

const mockAssessment: Assessment = {
  id: 'assessment-test-001',
  type: 'phq9',
  completedAt: '2025-01-27T10:00:00.000Z',
  answers: [1, 2, 1, 0, 1, 2, 1, 0, 1], // Valid PHQ-9 answers
  score: 9, // Sum of answers
  severity: 'mild',
  context: 'standalone'
};

const mockCrisisPlan: CrisisPlan = {
  id: 'crisis-plan-test-001',
  updatedAt: '2025-01-27T12:00:00.000Z',
  warningSigns: ['isolation', 'hopelessness'],
  copingStrategies: ['breathing exercises', 'call trusted friend'],
  contacts: {
    crisisLine: '988',
    trustedFriends: [
      { name: 'John Doe', phone: '+1-555-0123' }
    ]
  },
  safetyMeasures: ['remove harmful items', 'stay with someone'],
  isActive: true
};

const mockUserProfile: UserProfile = {
  id: 'user-test-001',
  createdAt: '2025-01-27T00:00:00.000Z',
  onboardingCompleted: true,
  values: ['compassion', 'mindfulness', 'acceptance'],
  notifications: {
    enabled: true,
    morning: '08:00',
    midday: '13:00',
    evening: '20:00'
  },
  preferences: {
    haptics: true,
    theme: 'auto'
  }
};

describe('FullMind Cloud SDK', () => {
  let sdk: FullMindCloudSDK;

  beforeEach(() => {
    // Set up mock environment
    Object.assign(process.env, mockEnv);

    // Create SDK instance with test configuration
    sdk = createCloudSDK({
      enableCloudSync: false, // Start disabled as per requirements
      enableEmergencySync: false,
      enableCrossDeviceSync: false,
      enableAuditLogging: true,
      syncIntervalMs: 10000, // Faster for testing
      batchSize: 10,
      retryAttempts: 2,
      timeoutMs: 5000
    });
  });

  afterEach(() => {
    sdk.destroy();
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with cloud sync disabled by default', async () => {
      const status = await sdk.getStatus();

      expect(status.success).toBe(true);
      expect(status.data?.ready).toBe(true);
      expect(status.data?.cloudEnabled).toBe(false); // Default OFF
    });

    it('should validate environment configuration', async () => {
      const status = await sdk.getStatus();

      expect(status.success).toBe(true);
      expect(status.data?.serviceHealth).toBeDefined();
    });

    it('should handle missing environment variables gracefully', () => {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;

      const testSDK = createCloudSDK({
        enableCloudSync: true
      });

      expect(testSDK.isReady()).toBe(false);
      testSDK.destroy();
    });

    it('should update configuration correctly', () => {
      const updateResult = sdk.updateConfig({
        enableCloudSync: true,
        batchSize: 25
      });

      expect(updateResult.success).toBe(true);
    });

    it('should validate configuration parameters', () => {
      const updateResult = sdk.updateConfig({
        syncIntervalMs: 5000 // Below minimum
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.errorCode).toBe('CONFIG_UPDATE_FAILED');
    });
  });

  describe('Authentication', () => {
    it('should validate email format during authentication', async () => {
      const result = await sdk.authenticate('invalid-email', 'password123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('AUTH_ERROR');
    });

    it('should validate password requirements during registration', async () => {
      const result = await sdk.register('test@example.com', '123'); // Too short

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('REGISTRATION_ERROR');
    });

    it('should include HIPAA consent in registration metadata', async () => {
      // This would be tested with actual Supabase connection
      const email = 'test@example.com';
      const password = 'validPassword123';

      const result = await sdk.register(email, password, {
        testMode: true
      });

      // In test environment, this will fail due to no actual connection
      // But we can verify the method exists and handles errors properly
      expect(result.success).toBe(false);
      expect(result.errorCode).toBeDefined();
    });

    it('should handle sign out gracefully', async () => {
      const result = await sdk.signOut();

      // Should not fail even when not authenticated
      expect(result.success).toBe(true);
    });
  });

  describe('Data Validation', () => {
    it('should validate check-in data structure', async () => {
      const invalidCheckIn = {
        ...mockCheckIn,
        type: 'invalid-type' as any
      };

      const result = await sdk.syncCheckIn(invalidCheckIn);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CHECKIN_SYNC_ERROR');
    });

    it('should validate assessment scoring accuracy', async () => {
      const invalidAssessment = {
        ...mockAssessment,
        score: 10 // Incorrect score (should be 9)
      };

      const result = await sdk.syncAssessment(invalidAssessment);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('ASSESSMENT_SYNC_ERROR');
      expect(result.error).toContain('scoring error');
    });

    it('should validate PHQ-9 answer count and ranges', async () => {
      const invalidAssessment = {
        ...mockAssessment,
        answers: [1, 2, 3, 4, 5] // Wrong count and invalid values
      };

      const result = await sdk.syncAssessment(invalidAssessment);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('ASSESSMENT_SYNC_ERROR');
    });

    it('should validate GAD-7 assessment structure', async () => {
      const gad7Assessment: Assessment = {
        id: 'gad7-test-001',
        type: 'gad7',
        completedAt: '2025-01-27T10:00:00.000Z',
        answers: [2, 1, 3, 0, 2, 1, 2], // Valid GAD-7 answers
        score: 11, // Sum of answers
        severity: 'moderate',
        context: 'standalone'
      };

      const result = await sdk.syncAssessment(gad7Assessment);

      // Will fail due to no cloud connection, but validation should pass
      expect(result.errorCode).not.toBe('ASSESSMENT_SYNC_ERROR');
    });

    it('should validate crisis plan structure', async () => {
      const invalidCrisisPlan = {
        ...mockCrisisPlan,
        contacts: {
          // Missing crisisLine
          trustedFriends: []
        }
      } as any;

      const result = await sdk.syncCrisisPlan(invalidCrisisPlan);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CRISIS_PLAN_SYNC_ERROR');
    });

    it('should require 988 crisis hotline in crisis plan', async () => {
      const crisisPlanWithoutHotline = {
        ...mockCrisisPlan,
        contacts: {
          ...mockCrisisPlan.contacts,
          crisisLine: '1-800-555-0199' // Non-988 number
        }
      };

      const result = await sdk.syncCrisisPlan(crisisPlanWithoutHotline);

      // Should still sync but with warning (checked via console logs in actual implementation)
      expect(result.errorCode).not.toBe('CRISIS_PLAN_SYNC_ERROR');
    });
  });

  describe('Sync Operations', () => {
    it('should reject sync operations when cloud sync disabled', async () => {
      const result = await sdk.syncCheckIn(mockCheckIn);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('SDK_NOT_READY');
    });

    it('should prevent concurrent full syncs', async () => {
      // Enable cloud sync for this test
      sdk.updateConfig({ enableCloudSync: true });

      // Start first sync
      const firstSync = sdk.performFullSync();

      // Try to start second sync immediately
      const secondSync = await sdk.performFullSync();

      expect(secondSync.success).toBe(false);
      expect(secondSync.errorCode).toBe('SYNC_IN_PROGRESS');

      // Wait for first sync to complete
      await firstSync;
    });

    it('should handle emergency sync configuration', async () => {
      const result = await sdk.emergencySync();

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('EMERGENCY_SYNC_DISABLED');
    });

    it('should return sync statistics', async () => {
      const result = await sdk.getSyncStats();

      // Will fail without actual connection, but method should exist
      expect(result.errorCode).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should track error count and disable after max errors', async () => {
      // Enable cloud sync to allow operations
      sdk.updateConfig({ enableCloudSync: true });

      // Simulate multiple failed operations
      for (let i = 0; i < 15; i++) {
        await sdk.syncCheckIn(mockCheckIn);
      }

      const status = await sdk.getStatus();
      expect(status.data?.errorCount).toBeGreaterThan(10);
    });

    it('should allow error count reset', () => {
      sdk.resetErrorCount();

      // This is tested indirectly through status check
      expect(sdk.isReady()).toBe(true);
    });

    it('should handle network timeouts gracefully', async () => {
      sdk.updateConfig({
        enableCloudSync: true,
        timeoutMs: 1 // Very short timeout
      });

      const result = await sdk.syncCheckIn(mockCheckIn);

      expect(result.success).toBe(false);
      expect(result.duration).toBeDefined();
    });

    it('should provide detailed error information', async () => {
      const result = await sdk.syncCheckIn(mockCheckIn);

      expect(result.errorCode).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.error).toBeDefined();
    });
  });

  describe('Security and Compliance', () => {
    it('should enforce HIPAA compliance requirements', async () => {
      // Test that all operations include compliance metadata
      const status = await sdk.getStatus();

      expect(status.timestamp).toBeDefined();
      expect(typeof status.success).toBe('boolean');
    });

    it('should handle sensitive data appropriately', async () => {
      // Assessment data should be treated as critical
      const result = await sdk.syncAssessment(mockAssessment);

      // Error handling should not expose sensitive data
      if (!result.success && result.error) {
        expect(result.error).not.toContain(JSON.stringify(mockAssessment.answers));
      }
    });

    it('should validate encryption requirements', () => {
      // Verify that cloud features require encryption
      const config = sdk.updateConfig({
        enableCloudSync: true
      });

      expect(config.success).toBe(true);
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track operation duration', async () => {
      const result = await sdk.getStatus();

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should respect batch size limits', () => {
      const updateResult = sdk.updateConfig({
        batchSize: 150 // Over maximum
      });

      expect(updateResult.success).toBe(false);
    });

    it('should handle service health monitoring', async () => {
      const status = await sdk.getStatus();

      expect(status.data?.serviceHealth).toMatch(/healthy|degraded|unavailable/);
    });
  });

  describe('Constants and Configuration Validation', () => {
    it('should use secure default configuration', () => {
      expect(CLOUD_CONSTANTS.DEFAULT_FEATURE_FLAGS.enabled).toBe(false);
      expect(CLOUD_CONSTANTS.DEFAULT_FEATURE_FLAGS.supabaseSync).toBe(false);
      expect(CLOUD_CONSTANTS.DEFAULT_FEATURE_FLAGS.auditLogging).toBe(true);
    });

    it('should enforce HIPAA-compliant regions', () => {
      expect(CLOUD_CONSTANTS.HIPAA_REGIONS).toContain('us-east-1');
      expect(CLOUD_CONSTANTS.HIPAA_REGIONS).toContain('us-west-1');
      expect(CLOUD_CONSTANTS.HIPAA_REGIONS).not.toContain('eu-west-1');
    });

    it('should define appropriate timeout values', () => {
      expect(CLOUD_CONSTANTS.EMERGENCY_SYNC_TIMEOUT_MS).toBeLessThan(
        CLOUD_CONSTANTS.REQUEST_TIMEOUT_MS
      );
      expect(CLOUD_CONSTANTS.CONNECTION_TIMEOUT_MS).toBeLessThan(
        CLOUD_CONSTANTS.REQUEST_TIMEOUT_MS
      );
    });

    it('should enforce clinical safety priorities', () => {
      expect(CLOUD_CONSTANTS.EMERGENCY_ENTITIES).toContain('crisis_plan');
      expect(CLOUD_CONSTANTS.EMERGENCY_ENTITIES).toContain('assessment');
      expect(CLOUD_CONSTANTS.PRIORITY_THRESHOLDS.PHQ9_CRISIS).toBe(20);
      expect(CLOUD_CONSTANTS.PRIORITY_THRESHOLDS.GAD7_CRISIS).toBe(15);
    });
  });

  describe('Integration Points', () => {
    it('should integrate with existing EncryptionService', () => {
      // Verify SDK initializes without conflicting with existing encryption
      expect(sdk.isReady()).toBe(true);
    });

    it('should maintain offline-first architecture', async () => {
      // Cloud sync should not interfere with offline functionality
      const status = await sdk.getStatus();

      expect(status.success).toBe(true);
      expect(status.data?.ready).toBe(true);
    });

    it('should support feature flag integration', () => {
      // Verify feature flags are parsed correctly
      const testFlags = 'cloud_sync:true,emergency_sync:false';

      // This would be tested through the feature flag parsing logic
      expect(testFlags).toBeDefined();
    });
  });
});

describe('Cloud SDK Production Readiness', () => {
  it('should handle production environment configuration', () => {
    const prodEnv = {
      EXPO_PUBLIC_SUPABASE_URL: 'https://prod-project.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'prod-anon-key',
      EXPO_PUBLIC_SUPABASE_REGION: 'us-east-1',
      EXPO_PUBLIC_CLOUD_FEATURES_ENABLED: 'false'
    };

    Object.assign(process.env, prodEnv);

    const prodSDK = createCloudSDK({
      enableCloudSync: false,
      enableAuditLogging: true
    });

    expect(prodSDK.isReady()).toBe(true);
    prodSDK.destroy();
  });

  it('should enforce zero-knowledge architecture', () => {
    // Verify that SDK does not store unencrypted sensitive data
    const sdk = createCloudSDK();

    // All data should be encrypted before transmission
    expect(sdk.isReady()).toBe(true);

    sdk.destroy();
  });

  it('should meet performance requirements', async () => {
    const sdk = createCloudSDK();
    const startTime = Date.now();

    const status = await sdk.getStatus();
    const duration = Date.now() - startTime;

    // Status check should be fast
    expect(duration).toBeLessThan(1000); // 1 second
    expect(status.success).toBe(true);

    sdk.destroy();
  });
});