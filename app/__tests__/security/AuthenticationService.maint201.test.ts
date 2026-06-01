/**
 * AUTHENTICATION SERVICE — MAINT-201
 * Analytics permission gate + operation authentication. Isolated file so spies on
 * the singleton don't interact with the broader AuthenticationService suite.
 */

import { jest } from '@jest/globals';
import AuthenticationService from '@/core/services/security/AuthenticationService';
import type {
  UserAuthenticationContext,
  SessionValidationResult,
} from '@/core/services/security/AuthenticationService';

const makeUser = (
  o: Partial<UserAuthenticationContext> = {},
): UserAuthenticationContext => ({
  userId: 'u1',
  authenticationLevel: 'anonymous',
  authenticationMethod: 'device_trust',
  deviceId: 'd1',
  sessionId: 's1',
  authenticatedAt: 0,
  expiresAt: Date.now() + 1_000_000,
  lastActivityAt: 0,
  permissions: [],
  isCrisisAccess: false,
  isProfessionalAccess: false,
  biometricEnabled: false,
  ...o,
});

describe('AuthenticationService.validateAnalyticsPermissions (MAINT-201)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('fails closed when there is no current session', () => {
    jest.spyOn(AuthenticationService, 'getCurrentUser').mockReturnValue(null);
    expect(AuthenticationService.validateAnalyticsPermissions()).toBe(false);
  });

  it('allows the anonymous device-trust session (production default)', () => {
    jest.spyOn(AuthenticationService, 'getCurrentUser').mockReturnValue(makeUser());
    expect(AuthenticationService.validateAnalyticsPermissions()).toBe(true);
  });

  it('allows any session holding the explicit analytics_access permission', () => {
    jest.spyOn(AuthenticationService, 'getCurrentUser').mockReturnValue(
      makeUser({ authenticationLevel: 'basic', authenticationMethod: 'biometric', permissions: ['analytics_access'] }),
    );
    expect(AuthenticationService.validateAnalyticsPermissions()).toBe(true);
  });

  it('denies a non-anonymous session without analytics_access', () => {
    jest.spyOn(AuthenticationService, 'getCurrentUser').mockReturnValue(
      makeUser({ authenticationLevel: 'basic', authenticationMethod: 'biometric' }),
    );
    expect(AuthenticationService.validateAnalyticsPermissions()).toBe(false);
  });

  it('denies a crisis-access session (isCrisisAccess flag)', () => {
    jest.spyOn(AuthenticationService, 'getCurrentUser').mockReturnValue(
      makeUser({ isCrisisAccess: true, permissions: ['analytics_access'] }),
    );
    expect(AuthenticationService.validateAnalyticsPermissions()).toBe(false);
  });

  it('denies a crisis-access session (crisis_access level)', () => {
    jest.spyOn(AuthenticationService, 'getCurrentUser').mockReturnValue(
      makeUser({ authenticationLevel: 'crisis_access' }),
    );
    expect(AuthenticationService.validateAnalyticsPermissions()).toBe(false);
  });
});

describe('AuthenticationService.authenticateOperation (MAINT-201)', () => {
  afterEach(() => jest.restoreAllMocks());

  const invalidSession: SessionValidationResult = {
    isValid: false,
    needsRefresh: false,
    isExpiring: false,
    timeUntilExpiry: 0,
    validationTimeMs: 1,
    error: 'Session invalid',
  };

  it('returns success:false when the session is invalid', async () => {
    jest.spyOn(AuthenticationService, 'validateSession').mockResolvedValue(invalidSession);
    const result = await AuthenticationService.authenticateOperation('track_event');
    expect(result.success).toBe(false);
    expect(result.authenticationMethod).toBe('device_trust');
  });

  it('returns success:true with the session method (never the old session_validation stub)', async () => {
    const user = makeUser();
    jest.spyOn(AuthenticationService, 'validateSession').mockResolvedValue({
      isValid: true,
      user,
      needsRefresh: false,
      isExpiring: false,
      timeUntilExpiry: 1_000_000,
      validationTimeMs: 1,
    });
    const result = await AuthenticationService.authenticateOperation('track_event');
    expect(result.success).toBe(true);
    expect(result.user).toBe(user);
    expect(result.authenticationMethod).toBe('device_trust');
    expect(result.authenticationMethod).not.toBe('session_validation');
  });
});
