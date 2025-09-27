/**
 * UserStore Test Suite - Security & Performance Validation
 *
 * Tests the complete UserStore implementation with focus on:
 * - Security compliance (HIPAA, encryption, audit)
 * - Performance requirements (<200ms crisis response)
 * - Session management (15-minute timeout, refresh)
 * - Emergency/crisis scenarios
 * - Integration with security services
 */

import { useUserStore, userStoreUtils } from '../userStore';
import { UserProfile } from '../../types';

// Mock dependencies
jest.mock('../services/security');
jest.mock('../services/storage/SecureDataStore');
jest.mock('expo-secure-store');
jest.mock('expo-local-authentication');
jest.mock('expo-device');
jest.mock('expo-crypto');

// Mock implementations
const mockAuthResult = {
  success: true,
  session: {
    id: 'test-session-id',
    userId: 'test-user-id',
    deviceId: 'test-device-id',
    sessionType: 'authenticated' as const,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    lastActivity: new Date().toISOString(),
    tokens: {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      deviceToken: 'test-device-token',
      tokenType: 'Bearer' as const,
      expiresIn: 900,
      scope: ['full_access'],
      issuedAt: new Date().toISOString(),
      issuer: 'being-app',
      audience: 'being-users'
    },
    security: {
      authMethod: 'biometric' as const,
      mfaEnabled: false,
      mfaVerified: false,
      biometricVerified: true,
      deviceTrusted: true,
      riskScore: 0.2,
      securityFlags: []
    },
    device: {},
    permissions: {},
    compliance: {}
  },
  tokens: {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  }
};

const mockUserProfile: UserProfile = {
  id: 'test-user-id',
  createdAt: new Date().toISOString(),
  onboardingCompleted: true,
  values: ['mindfulness', 'compassion'],
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

describe('UserStore - Security & Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useUserStore.setState({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      isRefreshing: false,
      error: null,
      sessionExpiry: null,
      lastActivity: new Date().toISOString(),
      requiresBiometric: false,
      emergencyMode: false,
      lastAuthTime: 0,
      avgResponseTime: 0
    });
  });

  describe('Authentication & Session Management', () => {
    test('should sign in user with performance monitoring', async () => {
      // Mock successful authentication
      const { authenticationSecurityService } = require('../../services/security');
      authenticationSecurityService.authenticateUser.mockResolvedValue(mockAuthResult);

      const { dataStore } = require('../../services/storage/SecureDataStore');
      dataStore.getUser.mockResolvedValue(mockUserProfile);

      const store = useUserStore.getState();
      const startTime = Date.now();

      await store.signIn('test@example.com', 'password');

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Validate authentication completed
      expect(store.isAuthenticated).toBe(true);
      expect(store.user).toEqual(mockUserProfile);
      expect(store.session).toEqual(mockAuthResult.session);

      // Validate performance requirement (<200ms for crisis response)
      expect(store.lastAuthTime).toBeLessThan(200);
      expect(duration).toBeLessThan(1000); // Reasonable test timeout

      // Validate security integration
      expect(authenticationSecurityService.authenticateUser).toHaveBeenCalledWith(
        'test@example.com',
        'password',
        expect.any(String),
        { password: 'password' }
      );
    });

    test('should handle session refresh with persistence', async () => {
      // Set up authenticated state
      useUserStore.setState({
        isAuthenticated: true,
        session: mockAuthResult.session,
        user: mockUserProfile
      });

      const { authenticationSecurityService } = require('../../services/security');
      authenticationSecurityService.refreshTokens.mockResolvedValue({
        success: true,
        tokens: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        }
      });

      const store = useUserStore.getState();
      await store.refreshSession();

      expect(store.isRefreshing).toBe(false);
      expect(store.session?.tokens.accessToken).toBe('new-access-token');
    });

    test('should validate session with security checks', async () => {
      // Set up authenticated state
      useUserStore.setState({
        isAuthenticated: true,
        session: mockAuthResult.session,
        user: mockUserProfile
      });

      const { sessionSecurityService } = require('../../services/security');
      sessionSecurityService.validateSession.mockResolvedValue({
        valid: true,
        session: mockAuthResult.session,
        requiresReAuthentication: false,
        reason: 'Session valid',
        securityFlags: [],
        performanceMetrics: {
          validationTime: 50,
          securityCheckTime: 25
        }
      });

      const store = useUserStore.getState();
      const isValid = await store.validateSession();

      expect(isValid).toBe(true);
      expect(sessionSecurityService.validateSession).toHaveBeenCalled();
    });
  });

  describe('Emergency/Crisis Mode', () => {
    test('should enable emergency mode with <200ms response', async () => {
      const { createEmergencySession } = require('../../services/security');
      createEmergencySession.mockResolvedValue({
        ...mockAuthResult.session,
        sessionType: 'emergency'
      });

      const store = useUserStore.getState();
      const startTime = Date.now();

      await store.enableEmergencyMode('severe_anxiety');

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Validate emergency mode activated
      expect(store.emergencyMode).toBe(true);
      expect(store.isAuthenticated).toBe(true);

      // Validate crisis response time requirement
      expect(store.lastAuthTime).toBeLessThan(200);
      expect(duration).toBeLessThan(500); // Emergency mode should be fast

      expect(createEmergencySession).toHaveBeenCalledWith(
        undefined, // No user ID for anonymous
        expect.any(String),
        'severe_anxiety'
      );
    });

    test('should provide crisis accessibility check', () => {
      // Test emergency mode
      useUserStore.setState({ emergencyMode: true });
      expect(userStoreUtils.isCrisisAccessible()).toBe(true);

      // Test emergency session
      useUserStore.setState({
        emergencyMode: false,
        session: { ...mockAuthResult.session, sessionType: 'emergency' }
      });
      expect(userStoreUtils.isCrisisAccessible()).toBe(true);

      // Test bypass enabled
      useUserStore.setState({
        emergencyMode: false,
        session: null
      });
      expect(userStoreUtils.isCrisisAccessible()).toBe(true); // Emergency bypass enabled
    });
  });

  describe('Session Persistence & Hydration', () => {
    test('should persist session after authentication', async () => {
      const { authenticationSecurityService, encryptionService } = require('../../services/security');
      const { SecureStore } = require('expo-secure-store');

      authenticationSecurityService.authenticateUser.mockResolvedValue(mockAuthResult);
      const { dataStore } = require('../../services/storage/SecureDataStore');
      dataStore.getUser.mockResolvedValue(mockUserProfile);

      encryptionService.encryptData.mockResolvedValue({
        encryptedData: 'encrypted-session-data',
        iv: 'test-iv',
        salt: 'test-salt'
      });

      const store = useUserStore.getState();
      await store.signIn('test@example.com', 'password');

      // Verify session persistence
      expect(encryptionService.encryptData).toHaveBeenCalledWith(
        mockAuthResult.session,
        expect.any(Object) // DataSensitivity.PERSONAL
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'being_user_session_v1',
        expect.any(String)
      );
    });

    test('should hydrate session on store initialization', async () => {
      const { encryptionService } = require('../../services/security');
      const { SecureStore } = require('expo-secure-store');
      const { dataStore } = require('../../services/storage/SecureDataStore');

      // Mock stored session
      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify({
        encryptedData: 'encrypted-session-data'
      }));

      encryptionService.decryptData.mockResolvedValue(mockAuthResult.session);
      dataStore.getUser.mockResolvedValue(mockUserProfile);

      const store = useUserStore.getState();
      await store.hydrateSession();

      expect(store.isAuthenticated).toBe(true);
      expect(store.user).toEqual(mockUserProfile);
      expect(store.session).toEqual(mockAuthResult.session);
    });

    test('should clean up expired sessions during hydration', async () => {
      const { SecureStore } = require('expo-secure-store');
      const { encryptionService } = require('../../services/security');

      // Mock expired session
      const expiredSession = {
        ...mockAuthResult.session,
        expiresAt: new Date(Date.now() - 60000).toISOString() // Expired 1 minute ago
      };

      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify({
        encryptedData: 'encrypted-session-data'
      }));

      encryptionService.decryptData.mockResolvedValue(expiredSession);

      const store = useUserStore.getState();
      await store.hydrateSession();

      // Should remain unauthenticated
      expect(store.isAuthenticated).toBe(false);
      expect(store.user).toBeNull();

      // Should clean up expired session
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('being_user_session_v1');
    });
  });

  describe('Performance Monitoring', () => {
    test('should track authentication performance', async () => {
      const { authenticationSecurityService } = require('../../services/security');
      const { dataStore } = require('../../services/storage/SecureDataStore');

      // Simulate slow authentication
      authenticationSecurityService.authenticateUser.mockImplementation(
        () => new Promise(resolve =>
          setTimeout(() => resolve(mockAuthResult), 150)
        )
      );
      dataStore.getUser.mockResolvedValue(mockUserProfile);

      const store = useUserStore.getState();
      await store.signIn('test@example.com', 'password');

      // Should record authentication time
      expect(store.lastAuthTime).toBeGreaterThan(0);
      expect(store.avgResponseTime).toBeGreaterThan(0);
    });

    test('should provide performance utilities', () => {
      // Set performance metrics
      useUserStore.setState({
        lastAuthTime: 150,
        avgResponseTime: 125
      });

      expect(userStoreUtils.getLastAuthTime()).toBe(150);
      expect(userStoreUtils.getAverageResponseTime()).toBe(125);
    });
  });

  describe('Store Utilities & Navigation Guards', () => {
    test('should provide fast authentication check', () => {
      // Unauthenticated
      useUserStore.setState({
        isAuthenticated: false,
        isLoading: false
      });
      expect(userStoreUtils.isAuthenticated()).toBe(false);

      // Authenticated but loading
      useUserStore.setState({
        isAuthenticated: true,
        isLoading: true
      });
      expect(userStoreUtils.isAuthenticated()).toBe(false);

      // Fully authenticated
      useUserStore.setState({
        isAuthenticated: true,
        isLoading: false
      });
      expect(userStoreUtils.isAuthenticated()).toBe(true);
    });

    test('should calculate session time remaining', () => {
      const futureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
      useUserStore.setState({
        sessionExpiry: futureTime
      });

      const timeRemaining = userStoreUtils.getSessionTimeRemaining();
      expect(timeRemaining).toBeGreaterThan(9 * 60 * 1000); // At least 9 minutes
      expect(timeRemaining).toBeLessThan(10 * 60 * 1000); // Less than 10 minutes
    });
  });

  describe('Cleanup & Memory Management', () => {
    test('should clean up store resources', async () => {
      const { sessionSecurityService } = require('../../services/security');
      const { SecureStore } = require('expo-secure-store');

      // Set up authenticated state
      useUserStore.setState({
        isAuthenticated: true,
        session: mockAuthResult.session
      });

      await userStoreUtils.cleanup();

      expect(sessionSecurityService.invalidateSession).toHaveBeenCalledWith('app_cleanup');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('being_user_session_v1');
    });
  });

  describe('Error Handling & Resilience', () => {
    test('should handle authentication failures gracefully', async () => {
      const { authenticationSecurityService } = require('../../services/security');
      authenticationSecurityService.authenticateUser.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      const store = useUserStore.getState();
      await store.signIn('test@example.com', 'wrong-password');

      expect(store.isAuthenticated).toBe(false);
      expect(store.error).toBe('Invalid credentials');
      expect(store.isLoading).toBe(false);
    });

    test('should handle session validation errors', async () => {
      const { sessionSecurityService } = require('../../services/security');
      sessionSecurityService.validateSession.mockRejectedValue(new Error('Validation failed'));

      useUserStore.setState({
        isAuthenticated: true,
        session: mockAuthResult.session
      });

      const store = useUserStore.getState();
      const isValid = await store.validateSession();

      expect(isValid).toBe(false);
    });
  });
});

describe('UserStore - Integration Tests', () => {
  test('should integrate with all security services', async () => {
    const {
      authenticationSecurityService,
      sessionSecurityService,
      securityControlsService,
      encryptionService
    } = require('../../services/security');

    // Mock all service responses
    authenticationSecurityService.authenticateUser.mockResolvedValue(mockAuthResult);
    sessionSecurityService.validateSession.mockResolvedValue({
      valid: true,
      session: mockAuthResult.session,
      requiresReAuthentication: false,
      reason: 'Valid',
      securityFlags: [],
      performanceMetrics: { validationTime: 50, securityCheckTime: 25 }
    });

    const { dataStore } = require('../../services/storage/SecureDataStore');
    dataStore.getUser.mockResolvedValue(mockUserProfile);

    const store = useUserStore.getState();

    // Test complete authentication flow
    await store.signIn('test@example.com', 'password');

    // Verify all services were called
    expect(authenticationSecurityService.authenticateUser).toHaveBeenCalled();
    expect(encryptionService.encryptData).toHaveBeenCalled();
    expect(dataStore.getUser).toHaveBeenCalled();

    // Test session validation
    await store.validateSession();
    expect(sessionSecurityService.validateSession).toHaveBeenCalled();

    // Test profile update with audit logging
    await store.updateProfile({ onboardingCompleted: true });
    expect(securityControlsService.logAuditEntry).toHaveBeenCalled();
  });
});