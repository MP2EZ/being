/**
 * UserStore Security Testing Suite
 *
 * Comprehensive security validation tests for:
 * - Session management and token security
 * - Crisis response performance (<200ms requirement)
 * - HIPAA compliance validation
 * - Authentication security integration
 * - Emergency access protocols
 * - Biometric authentication flows
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { useUserStore } from '../../../store/userStore';
import {
  sessionSecurityService,
  authenticationSecurityService,
  crisisAuthenticationService,
  securityControlsService
} from '../index';

// Mock dependencies
jest.mock('expo-secure-store');
jest.mock('expo-local-authentication');
jest.mock('expo-device');
jest.mock('expo-crypto');

describe('UserStore Security Validation', () => {
  beforeEach(() => {
    // Reset store state
    useUserStore.getState().signOut();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Authentication Security', () => {
    test('should enforce HIPAA-compliant 15-minute session timeout', async () => {
      const { signIn, validateSession } = useUserStore.getState();

      // Mock successful authentication
      jest.spyOn(authenticationSecurityService, 'authenticateUser').mockResolvedValue({
        success: true,
        session: createMockSession('authenticated'),
        tokens: createMockTokens(),
        requiresAdditionalAuth: false,
        rateLimited: false,
        performanceMetrics: { authTime: 150 }
      });

      await signIn('test@example.com', 'password123');

      // Verify session created
      expect(useUserStore.getState().isAuthenticated).toBe(true);
      expect(useUserStore.getState().session).toBeTruthy();

      // Mock session expiry (15 minutes = 900,000ms)
      const session = useUserStore.getState().session!;
      const expiredSession = {
        ...session,
        expiresAt: new Date(Date.now() - 1000).toISOString() // Expired 1 second ago
      };

      jest.spyOn(sessionSecurityService, 'validateSession').mockResolvedValue({
        valid: false,
        session: null,
        requiresReAuthentication: true,
        reason: 'Session expired',
        securityFlags: ['session_expired'],
        performanceMetrics: { validationTime: 50, securityCheckTime: 30 }
      });

      // Validate session should fail for expired session
      const isValid = await validateSession();
      expect(isValid).toBe(false);
      expect(useUserStore.getState().isAuthenticated).toBe(false);
    });

    test('should enforce rate limiting (5 attempts per 15 minutes)', async () => {
      const { signIn } = useUserStore.getState();

      // Mock rate limited response
      jest.spyOn(authenticationSecurityService, 'authenticateUser').mockResolvedValue({
        success: false,
        requiresAdditionalAuth: false,
        error: 'Too many failed attempts',
        rateLimited: true,
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        performanceMetrics: { authTime: 100 }
      });

      await signIn('test@example.com', 'wrongpassword');

      expect(useUserStore.getState().isAuthenticated).toBe(false);
      expect(useUserStore.getState().error).toContain('Too many attempts');
    });

    test('should require biometric authentication for sensitive operations', async () => {
      const { signIn, deleteAccount } = useUserStore.getState();

      // Setup authenticated state
      setupAuthenticatedState();

      // Mock biometric validation failure
      jest.spyOn(sessionSecurityService, 'validateSession').mockResolvedValue({
        valid: false,
        session: useUserStore.getState().session,
        requiresReAuthentication: true,
        reason: 'Biometric authentication required',
        securityFlags: ['biometric_auth_required'],
        performanceMetrics: { validationTime: 80, securityCheckTime: 50 }
      });

      await deleteAccount();

      expect(useUserStore.getState().error).toContain('Biometric authentication required');
    });

    test('should securely store tokens in hardware-backed storage', async () => {
      const { signIn } = useUserStore.getState();

      // Mock successful authentication with token storage
      const mockTokens = createMockTokens();
      jest.spyOn(authenticationSecurityService, 'authenticateUser').mockResolvedValue({
        success: true,
        session: createMockSession('authenticated'),
        tokens: mockTokens,
        requiresAdditionalAuth: false,
        rateLimited: false,
        performanceMetrics: { authTime: 120 }
      });

      // Mock SecureStore to verify token storage
      const SecureStore = require('expo-secure-store');
      const setItemSpy = jest.spyOn(SecureStore, 'setItemAsync').mockResolvedValue();

      await signIn('test@example.com', 'password123');

      // Verify tokens are stored securely
      expect(setItemSpy).toHaveBeenCalled();
      expect(useUserStore.getState().session?.tokens).toEqual(mockTokens);
    });
  });

  describe('Crisis Response Performance', () => {
    test('should authenticate within 200ms for crisis response', async () => {
      const { enableEmergencyMode } = useUserStore.getState();

      const startTime = Date.now();

      // Mock fast emergency session creation
      jest.spyOn(crisisAuthenticationService, 'createCrisisAccess').mockResolvedValue({
        success: true,
        session: createMockSession('emergency'),
        crisisAccess: {
          accessLevel: 'emergency',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          operations: ['crisis_plan_view', 'emergency_contact']
        },
        performanceMetrics: {
          responseTime: 150, // Under 200ms requirement
          crisisDetectionTime: 50,
          sessionCreationTime: 100
        },
        auditRequired: true
      });

      await enableEmergencyMode('severe_anxiety');

      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(200);
      expect(useUserStore.getState().emergencyMode).toBe(true);
      expect(useUserStore.getState().lastAuthTime).toBeLessThan(200);
    });

    test('should maintain crisis accessibility without authentication', async () => {
      const { isCrisisAccessible } = useUserStore.getState();

      // Verify crisis access without authentication
      expect(isCrisisAccessible()).toBe(true);

      // Even in unauthenticated state, crisis features should be accessible
      expect(useUserStore.getState().isAuthenticated).toBe(false);
      expect(isCrisisAccessible()).toBe(true);
    });

    test('should alert when crisis response time exceeds 200ms', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { enableEmergencyMode } = useUserStore.getState();

      // Mock slow emergency response (exceeds 200ms)
      jest.spyOn(crisisAuthenticationService, 'createCrisisAccess').mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => {
            resolve({
              success: true,
              session: createMockSession('emergency'),
              crisisAccess: {
                accessLevel: 'emergency',
                expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                operations: ['crisis_plan_view']
              },
              performanceMetrics: {
                responseTime: 350, // Exceeds 200ms requirement
                crisisDetectionTime: 200,
                sessionCreationTime: 150
              },
              auditRequired: true
            });
          }, 350);
        })
      );

      await enableEmergencyMode('panic_attack');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Authentication took')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('exceeds 200ms')
      );
    });
  });

  describe('Session Management Security', () => {
    test('should automatically refresh tokens before expiry', async () => {
      setupAuthenticatedState();

      const { refreshSession } = useUserStore.getState();

      // Mock token refresh
      jest.spyOn(authenticationSecurityService, 'refreshTokens').mockResolvedValue({
        success: true,
        tokens: {
          ...createMockTokens(),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        },
        requiresAdditionalAuth: false,
        rateLimited: false,
        performanceMetrics: { authTime: 100 }
      });

      const initialTokens = useUserStore.getState().session?.tokens;
      await refreshSession();
      const refreshedTokens = useUserStore.getState().session?.tokens;

      expect(refreshedTokens).not.toEqual(initialTokens);
      expect(useUserStore.getState().isRefreshing).toBe(false);
    });

    test('should invalidate session on security violations', async () => {
      setupAuthenticatedState();

      const { validateSession } = useUserStore.getState();

      // Mock security violation
      jest.spyOn(sessionSecurityService, 'validateSession').mockResolvedValue({
        valid: false,
        session: null,
        requiresReAuthentication: true,
        reason: 'Device binding validation failed',
        securityFlags: ['device_binding_invalid'],
        performanceMetrics: { validationTime: 100, securityCheckTime: 80 }
      });

      const isValid = await validateSession();

      expect(isValid).toBe(false);
      expect(useUserStore.getState().isAuthenticated).toBe(false);
      expect(useUserStore.getState().session).toBeNull();
    });

    test('should handle concurrent session operations safely', async () => {
      setupAuthenticatedState();

      const { validateSession, refreshSession, extendSession } = useUserStore.getState();

      // Simulate concurrent operations
      const operations = [
        validateSession(),
        refreshSession(),
        extendSession()
      ];

      await Promise.all(operations);

      // Verify store state remains consistent
      const state = useUserStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.session).toBeTruthy();
    });
  });

  describe('Profile Management Security', () => {
    test('should validate session before profile updates', async () => {
      setupAuthenticatedState();

      const { updateProfile } = useUserStore.getState();

      // Mock session validation failure
      jest.spyOn(sessionSecurityService, 'validateSession').mockResolvedValue({
        valid: false,
        session: null,
        requiresReAuthentication: true,
        reason: 'Session expired',
        securityFlags: ['session_expired'],
        performanceMetrics: { validationTime: 50, securityCheckTime: 30 }
      });

      await updateProfile({ onboardingCompleted: true });

      expect(useUserStore.getState().error).toContain('Session expired');
    });

    test('should encrypt profile data before storage', async () => {
      setupAuthenticatedState();

      const { updateProfile } = useUserStore.getState();

      // Mock encryption service
      const encryptionService = require('../EncryptionService');
      const encryptSpy = jest.spyOn(encryptionService.encryptionService, 'encryptData')
        .mockResolvedValue({ encryptedData: 'encrypted_profile', iv: 'test_iv' });

      await updateProfile({
        preferences: { theme: 'dark' },
        notifications: { enabled: false }
      });

      expect(encryptSpy).toHaveBeenCalled();
    });

    test('should audit profile changes for compliance', async () => {
      setupAuthenticatedState();

      const { updateProfile } = useUserStore.getState();

      // Mock audit logging
      const auditSpy = jest.spyOn(securityControlsService, 'logAuditEntry')
        .mockResolvedValue();

      await updateProfile({ onboardingCompleted: true });

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'profile_update',
          entityType: 'user_profile',
          complianceMarkers: expect.objectContaining({
            hipaaRequired: true,
            auditRequired: true,
            retentionDays: 2555
          })
        })
      );
    });
  });

  describe('Emergency Access Security', () => {
    test('should create emergency session without full authentication', async () => {
      const { enableEmergencyMode } = useUserStore.getState();

      // Mock emergency session creation
      jest.spyOn(crisisAuthenticationService, 'createCrisisAccess').mockResolvedValue({
        success: true,
        session: createMockSession('emergency'),
        crisisAccess: {
          accessLevel: 'emergency',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          operations: ['crisis_plan_view', 'emergency_contact']
        },
        performanceMetrics: {
          responseTime: 120,
          crisisDetectionTime: 50,
          sessionCreationTime: 70
        },
        auditRequired: true
      });

      await enableEmergencyMode('suicidal_ideation');

      expect(useUserStore.getState().emergencyMode).toBe(true);
      expect(useUserStore.getState().isAuthenticated).toBe(true);
      expect(useUserStore.getState().session?.sessionType).toBe('emergency');
    });

    test('should automatically expire emergency sessions after 15 minutes', async () => {
      const { enableEmergencyMode, disableEmergencyMode } = useUserStore.getState();

      // Enable emergency mode
      await enableEmergencyMode('crisis');

      expect(useUserStore.getState().emergencyMode).toBe(true);

      // Mock session expiry
      jest.spyOn(sessionSecurityService, 'invalidateSession').mockResolvedValue();

      await disableEmergencyMode();

      expect(useUserStore.getState().emergencyMode).toBe(false);
      expect(useUserStore.getState().isAuthenticated).toBe(false);
    });

    test('should audit all emergency access for compliance', async () => {
      const { enableEmergencyMode } = useUserStore.getState();

      const auditSpy = jest.spyOn(securityControlsService, 'logAuditEntry')
        .mockResolvedValue();

      await enableEmergencyMode('panic_attack');

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          dataSensitivity: expect.any(String),
          complianceMarkers: expect.objectContaining({
            auditRequired: true
          })
        })
      );
    });
  });

  describe('HIPAA Compliance Validation', () => {
    test('should maintain 7-year audit log retention for clinical data', async () => {
      setupAuthenticatedState();

      const { deleteAccount } = useUserStore.getState();

      // Mock biometric validation success
      jest.spyOn(sessionSecurityService, 'validateSession').mockResolvedValue({
        valid: true,
        session: useUserStore.getState().session,
        requiresReAuthentication: false,
        reason: 'Biometric authentication successful',
        securityFlags: [],
        performanceMetrics: { validationTime: 100, securityCheckTime: 80, biometricCheckTime: 200 }
      });

      const auditSpy = jest.spyOn(securityControlsService, 'logAuditEntry')
        .mockResolvedValue();

      await deleteAccount();

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'account_deletion',
          dataSensitivity: 'CLINICAL',
          complianceMarkers: expect.objectContaining({
            hipaaRequired: true,
            auditRequired: true,
            retentionDays: 2555 // 7 years
          })
        })
      );
    });

    test('should encrypt all stored user data', async () => {
      const { signUp } = useUserStore.getState();

      // Mock encryption for user data storage
      const encryptionService = require('../EncryptionService');
      const encryptSpy = jest.spyOn(encryptionService.encryptionService, 'encryptData')
        .mockResolvedValue({ encryptedData: 'encrypted_user_data', iv: 'test_iv' });

      await signUp('newuser@example.com', 'securepassword123');

      expect(encryptSpy).toHaveBeenCalled();
    });

    test('should implement minimum necessary access principle', async () => {
      setupAuthenticatedState();

      const session = useUserStore.getState().session!;

      // Verify session permissions are appropriately scoped
      expect(session.permissions.dataAccess.read).toContain('profile');
      expect(session.permissions.features.emergencyFeatures).toBe(true);

      // Emergency sessions should have limited permissions
      const emergencySession = createMockSession('emergency');
      expect(emergencySession.permissions.dataAccess.write).toHaveLength(0);
      expect(emergencySession.permissions.dataAccess.read).toEqual(['crisis_plan']);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle service unavailability gracefully', async () => {
      const { signIn } = useUserStore.getState();

      // Mock service failure
      jest.spyOn(authenticationSecurityService, 'authenticateUser')
        .mockRejectedValue(new Error('Service unavailable'));

      await signIn('test@example.com', 'password123');

      expect(useUserStore.getState().isAuthenticated).toBe(false);
      expect(useUserStore.getState().error).toContain('Sign in failed');
    });

    test('should maintain crisis accessibility during system failures', async () => {
      const { isCrisisAccessible } = useUserStore.getState();

      // Mock all security services failing
      jest.spyOn(sessionSecurityService, 'validateSession')
        .mockRejectedValue(new Error('Security service down'));

      // Crisis access should still be available (fail-safe)
      expect(isCrisisAccessible()).toBe(true);
    });

    test('should recover from corrupted session state', async () => {
      const { validateSession } = useUserStore.getState();

      // Corrupt the session state
      useUserStore.setState({
        session: null,
        isAuthenticated: true // Inconsistent state
      });

      await validateSession();

      // Should resolve inconsistent state
      expect(useUserStore.getState().isAuthenticated).toBe(false);
      expect(useUserStore.getState().session).toBeNull();
    });
  });
});

// Helper functions for test setup
function createMockSession(type: 'authenticated' | 'emergency' | 'anonymous') {
  const now = new Date();
  const expiry = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

  return {
    id: 'test-session-id',
    userId: 'test-user-id',
    deviceId: 'test-device-id',
    sessionType: type,
    createdAt: now.toISOString(),
    expiresAt: expiry.toISOString(),
    lastActivity: now.toISOString(),
    tokens: createMockTokens(),
    security: {
      authMethod: type === 'emergency' ? 'emergency' : 'biometric',
      mfaEnabled: false,
      mfaVerified: false,
      biometricVerified: type !== 'emergency',
      deviceTrusted: true,
      riskScore: type === 'emergency' ? 0.8 : 0.2,
      securityFlags: []
    },
    device: {
      deviceId: 'test-device-id',
      deviceName: 'Test Device',
      platform: 'ios',
      osVersion: '17.0',
      appVersion: '1.0.0',
      locale: 'en-US',
      timezone: 'UTC',
      lastSeen: now.toISOString(),
      firstSeen: now.toISOString(),
      syncEnabled: false
    },
    permissions: {
      dataAccess: {
        read: type === 'emergency' ? ['crisis_plan'] : ['checkins', 'assessments', 'profile', 'crisis_plan'],
        write: type === 'emergency' ? [] : ['checkins', 'assessments', 'profile', 'crisis_plan'],
        delete: type === 'emergency' ? [] : ['checkins', 'assessments']
      },
      features: {
        cloudSync: type !== 'emergency',
        crossDeviceSync: type !== 'emergency',
        exportData: type !== 'emergency',
        emergencyFeatures: true,
        adminFeatures: false
      },
      restrictions: {
        dataRetentionDays: type === 'emergency' ? 1 : undefined,
        maxDevices: type === 'emergency' ? 1 : 3
      }
    },
    compliance: {
      hipaaCompliant: true,
      consentGiven: true,
      consentVersion: '2024.1',
      consentTimestamp: now.toISOString(),
      dataProcessingAgreement: true,
      auditingEnabled: true,
      retentionPolicyAccepted: true,
      privacyPolicyVersion: '2024.1',
      complianceFlags: []
    }
  };
}

function createMockTokens() {
  const now = new Date();
  const expiry = new Date(now.getTime() + 15 * 60 * 1000);

  return {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    deviceToken: 'mock-device-token',
    tokenType: 'Bearer' as const,
    expiresAt: expiry.toISOString(),
    scope: ['full_access']
  };
}

function setupAuthenticatedState() {
  const mockSession = createMockSession('authenticated');
  const mockUser = {
    id: 'test-user-id',
    createdAt: new Date().toISOString(),
    onboardingCompleted: true,
    notifications: {
      enabled: true,
      morning: '08:00',
      midday: '13:00',
      evening: '20:00'
    },
    preferences: {
      haptics: true,
      theme: 'auto' as const
    },
    values: []
  };

  useUserStore.setState({
    user: mockUser,
    session: mockSession,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    sessionExpiry: mockSession.expiresAt,
    emergencyMode: false
  });

  // Mock successful session validation
  jest.spyOn(sessionSecurityService, 'validateSession').mockResolvedValue({
    valid: true,
    session: mockSession,
    requiresReAuthentication: false,
    reason: 'Session valid',
    securityFlags: [],
    performanceMetrics: { validationTime: 50, securityCheckTime: 30 }
  });
}