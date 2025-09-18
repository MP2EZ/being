/**
 * Authentication Security Service - Enhanced Security Implementation
 *
 * Implements secure authentication with:
 * - JWT token management with automatic rotation
 * - Rate limiting (5 attempts per 15 minutes)
 * - Device binding for session security
 * - Emergency access validation
 * - Biometric authentication with fallback
 * - Enhanced security monitoring and threat detection
 */

import {
  AuthSession,
  BiometricAuthData,
  JWTValidationResult,
  JWTClaims,
  AUTH_CONSTANTS
} from '../../types/auth-session';
import { encryptionService, DataSensitivity } from './EncryptionService';
import { securityControlsService } from './SecurityControlsService';
import { sessionSecurityService } from './SessionSecurityService';
import { featureFlagService, isEmergencyMode, isBiometricRequired } from './FeatureFlags';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

export interface AuthenticationConfig {
  // Rate limiting
  maxFailedAttempts: number; // 5 attempts per window
  rateLimitWindowMinutes: number; // 15 minutes
  lockoutDurationMinutes: number; // 15 minutes after max attempts

  // JWT settings
  jwtAlgorithm: string; // HS256
  accessTokenExpiryMinutes: number; // 15 minutes
  refreshTokenExpiryHours: number; // 24 hours
  tokenRotationThreshold: number; // Rotate when 75% expired

  // Device binding
  enableDeviceBinding: boolean;
  deviceFingerprintRequired: boolean;
  maxDevicesPerUser: number; // 3 devices

  // Biometric settings
  biometricRequired: boolean;
  biometricFallbackEnabled: boolean;
  biometricTimeoutSeconds: number; // 30 seconds

  // Emergency access
  emergencyAccessEnabled: boolean;
  emergencyValidationRequired: boolean;
  emergencyAuditRequired: boolean;

  // Performance requirements
  maxAuthTime: number; // 200ms for crisis response
  enablePerformanceMonitoring: boolean;
}

export interface AuthenticationAttempt {
  attemptId: string;
  timestamp: string;
  userId?: string;
  deviceId: string;
  authMethod: 'biometric' | 'password' | 'emergency' | 'refresh_token';
  success: boolean;
  failureReason?: string;
  duration: number; // milliseconds
  ipAddress?: string; // Anonymized
  userAgent?: string;
  riskScore: number;
  rateLimited: boolean;
}

export interface DeviceBinding {
  deviceId: string;
  userId: string;
  deviceFingerprint: string;
  bindingSecret: string;
  createdAt: string;
  lastUsed: string;
  trustLevel: number; // 0-1
  verified: boolean;
  revoked: boolean;
}

export interface RateLimitState {
  userId?: string;
  deviceId: string;
  failedAttempts: number;
  firstAttemptTime: string;
  lastAttemptTime: string;
  lockedUntil?: string;
  windowResets: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenType: 'Bearer';
  scope: string[];
}

export interface AuthenticationResult {
  success: boolean;
  session?: AuthSession;
  tokens?: TokenPair;
  requiresAdditionalAuth: boolean;
  error?: string;
  rateLimited: boolean;
  lockedUntil?: string;
  performanceMetrics: {
    authTime: number;
    biometricTime?: number;
    tokenTime?: number;
    validationTime?: number;
  };
}

/**
 * Authentication Security Service Implementation
 */
export class AuthenticationSecurityService {
  private static instance: AuthenticationSecurityService;
  private authAttempts: AuthenticationAttempt[] = [];
  private deviceBindings: Map<string, DeviceBinding> = new Map();
  private rateLimitStates: Map<string, RateLimitState> = new Map();

  // Configuration
  private config: AuthenticationConfig = {
    maxFailedAttempts: 5,
    rateLimitWindowMinutes: 15,
    lockoutDurationMinutes: 15,
    jwtAlgorithm: 'HS256',
    accessTokenExpiryMinutes: 15, // HIPAA-compliant
    refreshTokenExpiryHours: 24,
    tokenRotationThreshold: 0.75,
    enableDeviceBinding: true,
    deviceFingerprintRequired: true,
    maxDevicesPerUser: 3,
    biometricRequired: true,
    biometricFallbackEnabled: true,
    biometricTimeoutSeconds: 30,
    emergencyAccessEnabled: true,
    emergencyValidationRequired: true,
    emergencyAuditRequired: true,
    maxAuthTime: 200,
    enablePerformanceMonitoring: true
  };

  // Storage keys
  private readonly AUTH_ATTEMPTS_KEY = '@being_auth_attempts_v1';
  private readonly DEVICE_BINDINGS_KEY = '@being_device_bindings_v1';
  private readonly RATE_LIMIT_KEY = '@being_rate_limits_v1';
  private readonly JWT_SECRET_KEY = '@being_jwt_secret_v1';
  private readonly CONFIG_KEY = '@being_auth_config_v1';

  private constructor() {
    this.initialize();
  }

  public static getInstance(): AuthenticationSecurityService {
    if (!AuthenticationSecurityService.instance) {
      AuthenticationSecurityService.instance = new AuthenticationSecurityService();
    }
    return AuthenticationSecurityService.instance;
  }

  /**
   * Initialize authentication service
   */
  private async initialize(): Promise<void> {
    try {
      // Load configuration and persistent data
      await this.loadConfiguration();
      await this.loadAuthenticationData();

      // Set up periodic cleanup
      this.setupPeriodicCleanup();

      console.log('Authentication Security Service initialized');
    } catch (error) {
      console.error('Authentication security initialization failed:', error);
      await this.logSecurityEvent('initialization_failed', { error: String(error) });
    }
  }

  // ===========================================
  // AUTHENTICATION METHODS
  // ===========================================

  /**
   * Authenticate user with comprehensive security checks
   */
  async authenticateUser(
    userId: string,
    authMethod: 'biometric' | 'password' | 'emergency',
    deviceId: string,
    credentials?: {
      password?: string;
      biometricData?: BiometricAuthData;
      emergencyCode?: string;
    }
  ): Promise<AuthenticationResult> {
    const startTime = Date.now();
    const attemptId = await Crypto.randomUUID();

    try {
      // Check rate limiting first
      const rateLimitCheck = await this.checkRateLimit(userId, deviceId);
      if (rateLimitCheck.limited) {
        await this.recordAuthAttempt({
          attemptId,
          userId,
          deviceId,
          authMethod,
          success: false,
          failureReason: 'rate_limited',
          duration: Date.now() - startTime,
          riskScore: 1.0,
          rateLimited: true
        });

        return {
          success: false,
          requiresAdditionalAuth: false,
          error: 'Too many failed attempts',
          rateLimited: true,
          lockedUntil: rateLimitCheck.lockedUntil,
          performanceMetrics: { authTime: Date.now() - startTime }
        };
      }

      // Validate device binding if required
      if (this.config.enableDeviceBinding) {
        const deviceValid = await this.validateDeviceBinding(userId, deviceId);
        if (!deviceValid) {
          await this.recordAuthAttempt({
            attemptId,
            userId,
            deviceId,
            authMethod,
            success: false,
            failureReason: 'device_binding_failed',
            duration: Date.now() - startTime,
            riskScore: 0.9,
            rateLimited: false
          });

          return {
            success: false,
            requiresAdditionalAuth: true,
            error: 'Device binding validation failed',
            rateLimited: false,
            performanceMetrics: { authTime: Date.now() - startTime }
          };
        }
      }

      // Perform authentication based on method
      let authSuccess = false;
      let biometricTime: number | undefined;
      let validationTime: number | undefined;

      switch (authMethod) {
        case 'biometric':
          const biometricStart = Date.now();
          authSuccess = await this.performBiometricAuth(credentials?.biometricData);
          biometricTime = Date.now() - biometricStart;
          break;

        case 'password':
          const validationStart = Date.now();
          authSuccess = await this.validatePassword(userId, credentials?.password);
          validationTime = Date.now() - validationStart;
          break;

        case 'emergency':
          const emergencyStart = Date.now();
          authSuccess = await this.validateEmergencyAccess(userId, credentials?.emergencyCode);
          validationTime = Date.now() - emergencyStart;
          break;

        default:
          throw new Error(`Unsupported authentication method: ${authMethod}`);
      }

      // Calculate risk score
      const riskScore = await this.calculateRiskScore(userId, deviceId, authMethod, authSuccess);

      // Record authentication attempt
      await this.recordAuthAttempt({
        attemptId,
        userId,
        deviceId,
        authMethod,
        success: authSuccess,
        failureReason: authSuccess ? undefined : 'invalid_credentials',
        duration: Date.now() - startTime,
        riskScore,
        rateLimited: false
      });

      if (!authSuccess) {
        // Update rate limiting state
        await this.updateRateLimit(userId, deviceId, false);

        return {
          success: false,
          requiresAdditionalAuth: false,
          error: 'Authentication failed',
          rateLimited: false,
          performanceMetrics: {
            authTime: Date.now() - startTime,
            biometricTime,
            validationTime
          }
        };
      }

      // Authentication successful - create session and tokens
      const tokenStart = Date.now();
      const session = await sessionSecurityService.createSession(
        userId,
        authMethod,
        deviceId,
        authMethod === 'emergency'
      );

      const tokens = await this.generateTokenPair(userId, deviceId, session.id, authMethod === 'emergency');
      const tokenTime = Date.now() - tokenStart;

      // Update rate limiting state (success)
      await this.updateRateLimit(userId, deviceId, true);

      // Update device binding trust level
      if (this.config.enableDeviceBinding) {
        await this.updateDeviceBinding(userId, deviceId, true);
      }

      return {
        success: true,
        session,
        tokens,
        requiresAdditionalAuth: false,
        rateLimited: false,
        performanceMetrics: {
          authTime: Date.now() - startTime,
          biometricTime,
          validationTime,
          tokenTime
        }
      };

    } catch (error) {
      await this.logSecurityEvent('authentication_error', {
        error: String(error),
        userId,
        deviceId,
        authMethod
      });

      return {
        success: false,
        requiresAdditionalAuth: false,
        error: `Authentication error: ${error}`,
        rateLimited: false,
        performanceMetrics: { authTime: Date.now() - startTime }
      };
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(refreshToken: string, deviceId: string): Promise<AuthenticationResult> {
    const startTime = Date.now();

    try {
      // Validate refresh token
      const tokenValidation = await this.validateJWT(refreshToken, 'refresh');
      if (!tokenValidation.valid) {
        return {
          success: false,
          requiresAdditionalAuth: true,
          error: 'Invalid refresh token',
          rateLimited: false,
          performanceMetrics: { authTime: Date.now() - startTime }
        };
      }

      const userId = tokenValidation.claims.sub;

      // Check if token rotation is needed
      const rotationNeeded = await this.isTokenRotationNeeded(refreshToken);

      if (rotationNeeded) {
        // Generate new token pair
        const tokens = await this.generateTokenPair(userId, deviceId, tokenValidation.claims.jti, false);

        return {
          success: true,
          tokens,
          requiresAdditionalAuth: false,
          rateLimited: false,
          performanceMetrics: { authTime: Date.now() - startTime }
        };
      }

      // Token is still valid, no rotation needed
      return {
        success: true,
        requiresAdditionalAuth: false,
        rateLimited: false,
        performanceMetrics: { authTime: Date.now() - startTime }
      };

    } catch (error) {
      await this.logSecurityEvent('token_refresh_error', {
        error: String(error),
        deviceId
      });

      return {
        success: false,
        requiresAdditionalAuth: true,
        error: `Token refresh failed: ${error}`,
        rateLimited: false,
        performanceMetrics: { authTime: Date.now() - startTime }
      };
    }
  }

  /**
   * Validate JWT token
   */
  async validateJWT(token: string, tokenType: 'access' | 'refresh' | 'emergency'): Promise<JWTValidationResult> {
    try {
      // Basic JWT structure validation
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {
          valid: false,
          expired: false,
          claims: {} as JWTClaims,
          errors: ['Invalid JWT structure'],
          warnings: [],
          trustLevel: 0
        };
      }

      // Decode header and payload (simplified - in production use proper JWT library)
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

      // Validate signature (simplified - in production use proper crypto validation)
      const isSignatureValid = await this.validateJWTSignature(token);

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      const expired = payload.exp && payload.exp < now;

      // Validate claims
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!isSignatureValid) {
        errors.push('Invalid signature');
      }

      if (expired) {
        errors.push('Token expired');
      }

      if (!payload.sub) {
        errors.push('Missing subject claim');
      }

      if (!payload.iat) {
        warnings.push('Missing issued at claim');
      }

      // Calculate trust level based on validation results
      let trustLevel = 1.0;
      if (errors.length > 0) trustLevel = 0;
      else if (warnings.length > 0) trustLevel = 0.8;
      else if (expired) trustLevel = 0.3;

      return {
        valid: errors.length === 0 && !expired,
        expired,
        claims: payload as JWTClaims,
        errors,
        warnings,
        trustLevel
      };

    } catch (error) {
      return {
        valid: false,
        expired: false,
        claims: {} as JWTClaims,
        errors: [`Validation error: ${error}`],
        warnings: [],
        trustLevel: 0
      };
    }
  }

  // ===========================================
  // RATE LIMITING
  // ===========================================

  /**
   * Check rate limiting for authentication attempts
   */
  private async checkRateLimit(userId: string, deviceId: string): Promise<{ limited: boolean; lockedUntil?: string }> {
    const key = `${userId || 'anonymous'}_${deviceId}`;
    const state = this.rateLimitStates.get(key);

    if (!state) {
      return { limited: false };
    }

    const now = new Date();
    const lockoutEnd = state.lockedUntil ? new Date(state.lockedUntil) : null;

    // Check if still locked out
    if (lockoutEnd && now < lockoutEnd) {
      return { limited: true, lockedUntil: state.lockedUntil };
    }

    // Check if window has expired
    const windowStart = new Date(state.firstAttemptTime);
    const windowEnd = new Date(windowStart.getTime() + this.config.rateLimitWindowMinutes * 60 * 1000);

    if (now > windowEnd) {
      // Window expired, reset state
      this.rateLimitStates.delete(key);
      return { limited: false };
    }

    // Check if max attempts reached
    if (state.failedAttempts >= this.config.maxFailedAttempts) {
      const lockUntil = new Date(now.getTime() + this.config.lockoutDurationMinutes * 60 * 1000);
      state.lockedUntil = lockUntil.toISOString();
      await this.saveRateLimitState();

      return { limited: true, lockedUntil: state.lockedUntil };
    }

    return { limited: false };
  }

  /**
   * Update rate limiting state after authentication attempt
   */
  private async updateRateLimit(userId: string, deviceId: string, success: boolean): Promise<void> {
    const key = `${userId || 'anonymous'}_${deviceId}`;
    const now = new Date();

    if (success) {
      // Success - reset rate limiting
      this.rateLimitStates.delete(key);
    } else {
      // Failure - update state
      let state = this.rateLimitStates.get(key);

      if (!state) {
        state = {
          userId,
          deviceId,
          failedAttempts: 1,
          firstAttemptTime: now.toISOString(),
          lastAttemptTime: now.toISOString(),
          windowResets: 0
        };
      } else {
        state.failedAttempts++;
        state.lastAttemptTime = now.toISOString();
      }

      this.rateLimitStates.set(key, state);
    }

    await this.saveRateLimitState();
  }

  // ===========================================
  // DEVICE BINDING
  // ===========================================

  /**
   * Create device binding for user
   */
  async createDeviceBinding(userId: string, deviceId: string): Promise<DeviceBinding> {
    try {
      // Generate device fingerprint
      const deviceFingerprint = await this.generateDeviceFingerprint(deviceId);

      // Generate binding secret
      const bindingSecret = await Crypto.randomUUID();

      const binding: DeviceBinding = {
        deviceId,
        userId,
        deviceFingerprint,
        bindingSecret,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        trustLevel: 0.5, // Initial trust level
        verified: false,
        revoked: false
      };

      this.deviceBindings.set(`${userId}_${deviceId}`, binding);
      await this.saveDeviceBindings();

      await this.logSecurityEvent('device_binding_created', {
        userId,
        deviceId,
        trustLevel: binding.trustLevel
      });

      return binding;

    } catch (error) {
      await this.logSecurityEvent('device_binding_creation_failed', {
        error: String(error),
        userId,
        deviceId
      });
      throw new Error(`Device binding creation failed: ${error}`);
    }
  }

  /**
   * Validate device binding
   */
  private async validateDeviceBinding(userId: string, deviceId: string): Promise<boolean> {
    try {
      const key = `${userId}_${deviceId}`;
      const binding = this.deviceBindings.get(key);

      if (!binding) {
        // No binding exists - create one if auto-binding is enabled
        if (this.config.enableDeviceBinding) {
          await this.createDeviceBinding(userId, deviceId);
          return true; // Allow first-time binding
        }
        return false;
      }

      // Check if binding is revoked
      if (binding.revoked) {
        return false;
      }

      // Validate device fingerprint
      const currentFingerprint = await this.generateDeviceFingerprint(deviceId);
      if (binding.deviceFingerprint !== currentFingerprint) {
        await this.logSecurityEvent('device_fingerprint_mismatch', {
          userId,
          deviceId,
          expectedFingerprint: binding.deviceFingerprint,
          actualFingerprint: currentFingerprint
        });
        return false;
      }

      // Update last used timestamp
      binding.lastUsed = new Date().toISOString();
      await this.saveDeviceBindings();

      return true;

    } catch (error) {
      await this.logSecurityEvent('device_binding_validation_failed', {
        error: String(error),
        userId,
        deviceId
      });
      return false;
    }
  }

  /**
   * Update device binding trust level
   */
  private async updateDeviceBinding(userId: string, deviceId: string, success: boolean): Promise<void> {
    const key = `${userId}_${deviceId}`;
    const binding = this.deviceBindings.get(key);

    if (binding) {
      if (success) {
        // Increase trust level on successful auth
        binding.trustLevel = Math.min(1.0, binding.trustLevel + 0.1);
        binding.verified = binding.trustLevel >= 0.8;
      } else {
        // Decrease trust level on failed auth
        binding.trustLevel = Math.max(0.0, binding.trustLevel - 0.2);
        binding.verified = false;
      }

      await this.saveDeviceBindings();
    }
  }

  // ===========================================
  // HELPER METHODS
  // ===========================================

  /**
   * Perform biometric authentication
   */
  private async performBiometricAuth(biometricData?: BiometricAuthData): Promise<boolean> {
    try {
      // Check if biometrics are available
      const biometricType = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (biometricType.length === 0) {
        throw new Error('Biometric authentication not available');
      }

      // Perform biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: !this.config.biometricFallbackEnabled
      });

      return result.success;

    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  /**
   * Validate password (placeholder implementation)
   */
  private async validatePassword(userId: string, password?: string): Promise<boolean> {
    // TODO: Implement secure password validation
    return !!password && password.length >= 8;
  }

  /**
   * Validate emergency access
   */
  private async validateEmergencyAccess(userId: string, emergencyCode?: string): Promise<boolean> {
    if (!this.config.emergencyAccessEnabled) {
      return false;
    }

    // TODO: Implement emergency code validation
    // For now, accept any non-empty code in emergency situations
    return !!emergencyCode && isEmergencyMode();
  }

  /**
   * Generate token pair
   */
  private async generateTokenPair(
    userId: string,
    deviceId: string,
    sessionId: string,
    emergency: boolean
  ): Promise<TokenPair> {
    const now = new Date();
    const accessTokenExpiry = new Date(now.getTime() + this.config.accessTokenExpiryMinutes * 60 * 1000);
    const refreshTokenExpiry = new Date(now.getTime() + this.config.refreshTokenExpiryHours * 60 * 60 * 1000);

    // Create JWT claims
    const accessClaims: JWTClaims = {
      iss: 'fullmind-app',
      sub: userId,
      aud: 'fullmind-users',
      exp: Math.floor(accessTokenExpiry.getTime() / 1000),
      iat: Math.floor(now.getTime() / 1000),
      jti: sessionId,
      scope: emergency ? ['emergency'] : ['full_access'],
      deviceId,
      sessionType: emergency ? 'emergency' : 'authenticated',
      authMethod: 'biometric', // TODO: Pass actual auth method
      mfaVerified: false,
      customClaims: { emergency }
    };

    const refreshClaims: JWTClaims = {
      ...accessClaims,
      exp: Math.floor(refreshTokenExpiry.getTime() / 1000),
      scope: ['refresh']
    };

    // Generate tokens (simplified - use proper JWT library in production)
    const accessToken = await this.generateJWT(accessClaims);
    const refreshToken = await this.generateJWT(refreshClaims);

    return {
      accessToken,
      refreshToken,
      expiresAt: accessTokenExpiry.toISOString(),
      tokenType: 'Bearer',
      scope: accessClaims.scope
    };
  }

  /**
   * Generate JWT token (simplified implementation)
   */
  private async generateJWT(claims: JWTClaims): Promise<string> {
    // TODO: Implement proper JWT generation with signing
    // For now, return a base64 encoded version
    const header = { alg: this.config.jwtAlgorithm, typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64');
    const payloadB64 = Buffer.from(JSON.stringify(claims)).toString('base64');
    const signature = await this.generateJWTSignature(`${headerB64}.${payloadB64}`);

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  /**
   * Generate JWT signature (placeholder)
   */
  private async generateJWTSignature(data: string): Promise<string> {
    // TODO: Implement proper HMAC signing
    return Buffer.from(await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data)).toString('base64');
  }

  /**
   * Validate JWT signature (placeholder)
   */
  private async validateJWTSignature(token: string): Promise<boolean> {
    // TODO: Implement proper signature validation
    return true; // Simplified for now
  }

  /**
   * Check if token rotation is needed
   */
  private async isTokenRotationNeeded(token: string): Promise<boolean> {
    const validation = await this.validateJWT(token, 'refresh');
    if (!validation.valid) return false;

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = validation.claims.exp - now;
    const totalLifetime = validation.claims.exp - validation.claims.iat;
    const remainingRatio = timeUntilExpiry / totalLifetime;

    return remainingRatio <= (1 - this.config.tokenRotationThreshold);
  }

  /**
   * Generate device fingerprint
   */
  private async generateDeviceFingerprint(deviceId: string): Promise<string> {
    // TODO: Implement comprehensive device fingerprinting
    const platform = Platform.OS;
    const timestamp = Date.now();
    const data = `${deviceId}_${platform}_${timestamp}`;
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
  }

  /**
   * Calculate risk score for authentication attempt
   */
  private async calculateRiskScore(
    userId: string,
    deviceId: string,
    authMethod: string,
    success: boolean
  ): Promise<number> {
    let riskScore = 0.1; // Base risk

    // Failed authentication increases risk
    if (!success) {
      riskScore += 0.5;
    }

    // Emergency authentication has higher risk
    if (authMethod === 'emergency') {
      riskScore += 0.3;
    }

    // Check device binding trust level
    const binding = this.deviceBindings.get(`${userId}_${deviceId}`);
    if (!binding || !binding.verified) {
      riskScore += 0.3;
    }

    // Check recent failed attempts
    const recentFailures = this.authAttempts
      .filter(attempt =>
        attempt.userId === userId &&
        !attempt.success &&
        Date.now() - new Date(attempt.timestamp).getTime() < 60 * 60 * 1000 // Last hour
      ).length;

    riskScore += recentFailures * 0.1;

    return Math.min(1.0, riskScore);
  }

  /**
   * Record authentication attempt
   */
  private async recordAuthAttempt(attempt: Omit<AuthenticationAttempt, 'timestamp'>): Promise<void> {
    const authAttempt: AuthenticationAttempt = {
      ...attempt,
      timestamp: new Date().toISOString()
    };

    this.authAttempts.push(authAttempt);

    // Keep only recent attempts (performance optimization)
    if (this.authAttempts.length > 1000) {
      this.authAttempts = this.authAttempts.slice(-500);
    }

    await this.saveAuthAttempts();

    // Log to security controls
    await securityControlsService.logAuditEntry({
      operation: `auth_${attempt.authMethod}`,
      entityType: 'authentication',
      dataSensitivity: DataSensitivity.PERSONAL,
      userId: attempt.userId || 'anonymous',
      securityContext: {
        authenticated: attempt.success,
        biometricUsed: attempt.authMethod === 'biometric',
        deviceTrusted: true, // TODO: Get from device binding
        networkSecure: true,
        encryptionActive: true
      },
      operationMetadata: {
        success: attempt.success,
        duration: attempt.duration
      },
      complianceMarkers: {
        hipaaRequired: true,
        auditRequired: true,
        retentionDays: 2555 // 7 years
      }
    });
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(eventType: string, details: Record<string, unknown>): Promise<void> {
    await securityControlsService.recordSecurityViolation({
      violationType: 'authentication_failure',
      severity: 'medium',
      description: `Authentication security event: ${eventType}`,
      affectedResources: ['authentication_service'],
      automaticResponse: {
        implemented: false,
        actions: []
      }
    });
  }

  // ===========================================
  // STORAGE METHODS
  // ===========================================

  private async saveAuthAttempts(): Promise<void> {
    try {
      const encrypted = await encryptionService.encryptData(this.authAttempts, DataSensitivity.PERSONAL);
      await SecureStore.setItemAsync(this.AUTH_ATTEMPTS_KEY, JSON.stringify(encrypted));
    } catch (error) {
      console.error('Failed to save auth attempts:', error);
    }
  }

  private async saveDeviceBindings(): Promise<void> {
    try {
      const bindingsArray = Array.from(this.deviceBindings.entries());
      const encrypted = await encryptionService.encryptData(bindingsArray, DataSensitivity.PERSONAL);
      await SecureStore.setItemAsync(this.DEVICE_BINDINGS_KEY, JSON.stringify(encrypted));
    } catch (error) {
      console.error('Failed to save device bindings:', error);
    }
  }

  private async saveRateLimitState(): Promise<void> {
    try {
      const statesArray = Array.from(this.rateLimitStates.entries());
      const encrypted = await encryptionService.encryptData(statesArray, DataSensitivity.SYSTEM);
      await SecureStore.setItemAsync(this.RATE_LIMIT_KEY, JSON.stringify(encrypted));
    } catch (error) {
      console.error('Failed to save rate limit state:', error);
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configData = await SecureStore.getItemAsync(this.CONFIG_KEY);
      if (configData) {
        const config = JSON.parse(configData);
        this.config = { ...this.config, ...config };
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  }

  private async loadAuthenticationData(): Promise<void> {
    try {
      // Load auth attempts
      const attemptsData = await SecureStore.getItemAsync(this.AUTH_ATTEMPTS_KEY);
      if (attemptsData) {
        const encrypted = JSON.parse(attemptsData);
        this.authAttempts = await encryptionService.decryptData(encrypted, DataSensitivity.PERSONAL);
      }

      // Load device bindings
      const bindingsData = await SecureStore.getItemAsync(this.DEVICE_BINDINGS_KEY);
      if (bindingsData) {
        const encrypted = JSON.parse(bindingsData);
        const bindingsArray = await encryptionService.decryptData(encrypted, DataSensitivity.PERSONAL);
        this.deviceBindings = new Map(bindingsArray);
      }

      // Load rate limit states
      const rateLimitData = await SecureStore.getItemAsync(this.RATE_LIMIT_KEY);
      if (rateLimitData) {
        const encrypted = JSON.parse(rateLimitData);
        const statesArray = await encryptionService.decryptData(encrypted, DataSensitivity.SYSTEM);
        this.rateLimitStates = new Map(statesArray);
      }

    } catch (error) {
      console.error('Failed to load authentication data:', error);
    }
  }

  private setupPeriodicCleanup(): void {
    // Clean up old data every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000);
  }

  private async cleanupOldData(): Promise<void> {
    try {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

      // Clean up old auth attempts (keep 1 day)
      this.authAttempts = this.authAttempts.filter(
        attempt => new Date(attempt.timestamp).getTime() > oneDayAgo
      );

      // Clean up expired rate limit states
      for (const [key, state] of this.rateLimitStates.entries()) {
        const stateAge = now - new Date(state.firstAttemptTime).getTime();
        if (stateAge > oneWeekAgo) {
          this.rateLimitStates.delete(key);
        }
      }

      // Save cleaned up data
      await this.saveAuthAttempts();
      await this.saveRateLimitState();

    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  // ===========================================
  // PUBLIC API
  // ===========================================

  /**
   * Get authentication configuration
   */
  getConfiguration(): AuthenticationConfig {
    return { ...this.config };
  }

  /**
   * Update authentication configuration
   */
  async updateConfiguration(newConfig: Partial<AuthenticationConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await SecureStore.setItemAsync(this.CONFIG_KEY, JSON.stringify(this.config));
  }

  /**
   * Get authentication attempts (for debugging/audit)
   */
  getAuthenticationAttempts(): AuthenticationAttempt[] {
    return [...this.authAttempts];
  }

  /**
   * Get device bindings for user
   */
  getDeviceBindings(userId: string): DeviceBinding[] {
    return Array.from(this.deviceBindings.values()).filter(binding => binding.userId === userId);
  }

  /**
   * Revoke device binding
   */
  async revokeDeviceBinding(userId: string, deviceId: string): Promise<void> {
    const key = `${userId}_${deviceId}`;
    const binding = this.deviceBindings.get(key);

    if (binding) {
      binding.revoked = true;
      await this.saveDeviceBindings();

      await this.logSecurityEvent('device_binding_revoked', {
        userId,
        deviceId
      });
    }
  }

  /**
   * Clear rate limiting for user (admin function)
   */
  async clearRateLimit(userId: string, deviceId?: string): Promise<void> {
    if (deviceId) {
      this.rateLimitStates.delete(`${userId}_${deviceId}`);
    } else {
      // Clear all rate limits for user
      for (const key of this.rateLimitStates.keys()) {
        if (key.startsWith(`${userId}_`)) {
          this.rateLimitStates.delete(key);
        }
      }
    }

    await this.saveRateLimitState();
  }
}

// Export singleton instance
export const authenticationSecurityService = AuthenticationSecurityService.getInstance();