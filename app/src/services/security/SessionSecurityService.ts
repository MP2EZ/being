/**
 * Session Security Service - HIPAA-Compliant Session Management
 *
 * Implements secure session management with:
 * - HIPAA-compliant 15-minute session timeout
 * - Automatic idle detection (5 minutes)
 * - Biometric re-authentication after 3 minutes
 * - Emergency session protocols for crisis situations
 * - Enhanced security monitoring and audit logging
 */

import { AuthSession, SessionSecurity, SessionTokens, AUTH_CONSTANTS } from '../../types/auth-session';
import { encryptionService, DataSensitivity } from './EncryptionService';
import { securityControlsService } from './SecurityControlsService';
import { featureFlagService, isEmergencyMode } from './FeatureFlags';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { AppState, AppStateStatus } from 'react-native';
import * as Crypto from 'expo-crypto';

export interface SessionSecurityConfig {
  // Session timeout settings (HIPAA-compliant)
  sessionTimeoutMinutes: number; // 15 minutes for HIPAA compliance
  idleTimeoutMinutes: number; // 5 minutes idle detection
  biometricReAuthMinutes: number; // 3 minutes for biometric re-auth
  emergencySessionMinutes: number; // 15 minutes max emergency session
  absoluteTimeoutHours: number; // 8 hours absolute maximum

  // Security enforcement
  enforceDeviceBinding: boolean;
  requireBiometricForSensitive: boolean;
  enableIdleDetection: boolean;
  autoLockOnBackground: boolean;
  emergencyBypassEnabled: boolean;

  // Performance requirements
  maxAuthResponseTime: number; // 200ms for crisis response
  maxSessionValidationTime: number; // 100ms
  performanceLoggingEnabled: boolean;
}

export interface SessionActivity {
  activityId: string;
  sessionId: string;
  timestamp: string;
  activityType: 'authentication' | 'data_access' | 'idle_detected' | 'background' | 'foreground' | 'logout';
  details: Record<string, unknown>;
  securityImpact: 'none' | 'low' | 'medium' | 'high';
  requiresAudit: boolean;
}

export interface SessionValidationResult {
  valid: boolean;
  session: AuthSession | null;
  requiresReAuthentication: boolean;
  reason: string;
  securityFlags: string[];
  performanceMetrics: {
    validationTime: number;
    securityCheckTime: number;
    biometricCheckTime?: number;
  };
}

export interface EmergencySessionConfig {
  enabled: boolean;
  maxDurationMinutes: number;
  allowedOperations: string[];
  auditRequired: boolean;
  automaticTimeout: boolean;
  crisisProtocolBypass: boolean;
}

/**
 * Session Security Service Implementation
 */
export class SessionSecurityService {
  private static instance: SessionSecurityService;
  private currentSession: AuthSession | null = null;
  private sessionActivities: SessionActivity[] = [];
  private idleTimer: NodeJS.Timeout | null = null;
  private sessionTimer: NodeJS.Timeout | null = null;
  private lastActivity: Date = new Date();
  private isIdle: boolean = false;
  private appStateSubscription: any = null;

  // Configuration
  private config: SessionSecurityConfig = {
    sessionTimeoutMinutes: 15, // HIPAA-compliant
    idleTimeoutMinutes: 5,
    biometricReAuthMinutes: 3,
    emergencySessionMinutes: 15,
    absoluteTimeoutHours: 8,
    enforceDeviceBinding: true,
    requireBiometricForSensitive: true,
    enableIdleDetection: true,
    autoLockOnBackground: true,
    emergencyBypassEnabled: true,
    maxAuthResponseTime: 200,
    maxSessionValidationTime: 100,
    performanceLoggingEnabled: true
  };

  private emergencyConfig: EmergencySessionConfig = {
    enabled: true,
    maxDurationMinutes: 15,
    allowedOperations: ['crisis_access', 'emergency_contact', 'crisis_plan_view'],
    auditRequired: true,
    automaticTimeout: true,
    crisisProtocolBypass: true
  };

  // Storage keys
  private readonly SESSION_KEY = '@being_session_security_v1';
  private readonly ACTIVITY_LOG_KEY = '@being_session_activity_v1';
  private readonly CONFIG_KEY = '@being_session_config_v1';

  private constructor() {
    this.initialize();
  }

  public static getInstance(): SessionSecurityService {
    if (!SessionSecurityService.instance) {
      SessionSecurityService.instance = new SessionSecurityService();
    }
    return SessionSecurityService.instance;
  }

  /**
   * Initialize session security service
   */
  private async initialize(): Promise<void> {
    try {
      // Load configuration and session data
      await this.loadConfiguration();
      await this.loadSessionData();

      // Set up activity monitoring
      this.setupActivityMonitoring();

      // Set up app state monitoring for background/foreground detection
      this.setupAppStateMonitoring();

      console.log('Session Security Service initialized');
    } catch (error) {
      console.error('Session security initialization failed:', error);
      await this.logSecurityEvent('initialization_failed', { error: String(error) });
    }
  }

  // ===========================================
  // SESSION MANAGEMENT
  // ===========================================

  /**
   * Create new authenticated session with security validation
   */
  async createSession(
    userId: string,
    authMethod: SessionSecurity['authMethod'],
    deviceId: string,
    emergencyMode: boolean = false
  ): Promise<AuthSession> {
    const startTime = Date.now();

    try {
      // Generate session ID and tokens
      const sessionId = await Crypto.randomUUID();
      const deviceToken = await this.generateDeviceToken(deviceId);
      const accessToken = await this.generateAccessToken(userId, sessionId, emergencyMode);
      const refreshToken = await this.generateRefreshToken(userId, sessionId);

      // Calculate session expiration based on type
      const sessionType = emergencyMode ? 'emergency' : 'authenticated';
      const timeoutMinutes = emergencyMode
        ? this.emergencyConfig.maxDurationMinutes
        : this.config.sessionTimeoutMinutes;

      const now = new Date();
      const expiresAt = new Date(now.getTime() + timeoutMinutes * 60 * 1000);

      // Create session security context
      const security: SessionSecurity = {
        authMethod,
        mfaEnabled: false, // TODO: Implement MFA
        mfaVerified: false,
        biometricVerified: authMethod === 'biometric',
        deviceTrusted: await this.isDeviceTrusted(deviceId),
        riskScore: await this.calculateRiskScore(userId, deviceId, authMethod),
        securityFlags: []
      };

      // Create session tokens
      const tokens: SessionTokens = {
        accessToken,
        refreshToken,
        deviceToken,
        emergencyToken: emergencyMode ? await this.generateEmergencyToken(userId, sessionId) : undefined,
        tokenType: 'Bearer',
        expiresIn: timeoutMinutes * 60,
        scope: emergencyMode ? this.emergencyConfig.allowedOperations : ['full_access'],
        issuedAt: now.toISOString(),
        issuer: 'fullmind-app',
        audience: 'fullmind-users'
      };

      // Create the session
      const session: AuthSession = {
        id: sessionId,
        userId,
        deviceId,
        sessionType,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        lastActivity: now.toISOString(),
        tokens,
        security,
        device: await this.getDeviceInfo(deviceId),
        permissions: await this.getSessionPermissions(userId, emergencyMode),
        compliance: await this.getComplianceInfo(userId)
      };

      // Store session securely
      await this.storeSession(session);

      // Set up session timers
      this.setupSessionTimers(session);

      // Log session creation
      await this.logSessionActivity({
        activityType: 'authentication',
        details: {
          authMethod,
          emergencyMode,
          sessionType,
          deviceId
        },
        securityImpact: emergencyMode ? 'high' : 'medium',
        requiresAudit: true
      });

      // Performance validation
      const duration = Date.now() - startTime;
      if (duration > this.config.maxAuthResponseTime && !emergencyMode) {
        console.warn(`Session creation took ${duration}ms, exceeds ${this.config.maxAuthResponseTime}ms limit`);
      }

      this.currentSession = session;
      this.resetActivityTimer();

      return session;

    } catch (error) {
      await this.logSecurityEvent('session_creation_failed', {
        error: String(error),
        userId,
        deviceId,
        emergencyMode
      });
      throw new Error(`Session creation failed: ${error}`);
    }
  }

  /**
   * Validate current session with security checks
   */
  async validateSession(requireBiometric: boolean = false): Promise<SessionValidationResult> {
    const startTime = Date.now();

    try {
      // Quick validation for crisis response
      if (!this.currentSession) {
        return {
          valid: false,
          session: null,
          requiresReAuthentication: true,
          reason: 'No active session',
          securityFlags: ['no_session'],
          performanceMetrics: {
            validationTime: Date.now() - startTime,
            securityCheckTime: 0
          }
        };
      }

      const securityCheckStart = Date.now();
      const securityFlags: string[] = [];

      // Check session expiration
      const now = new Date();
      const expiresAt = new Date(this.currentSession.expiresAt);
      if (now >= expiresAt) {
        securityFlags.push('session_expired');
        await this.invalidateSession('session_expired');
        return {
          valid: false,
          session: null,
          requiresReAuthentication: true,
          reason: 'Session expired',
          securityFlags,
          performanceMetrics: {
            validationTime: Date.now() - startTime,
            securityCheckTime: Date.now() - securityCheckStart
          }
        };
      }

      // Check idle timeout
      const idleTimeout = this.config.idleTimeoutMinutes * 60 * 1000;
      const lastActivity = new Date(this.currentSession.lastActivity);
      if (now.getTime() - lastActivity.getTime() > idleTimeout) {
        securityFlags.push('idle_timeout');
        this.isIdle = true;
      }

      // Check if biometric re-authentication is required
      const biometricReAuthTimeout = this.config.biometricReAuthMinutes * 60 * 1000;
      const requiresBiometricReauth = requireBiometric ||
        (this.config.requireBiometricForSensitive &&
         now.getTime() - lastActivity.getTime() > biometricReAuthTimeout);

      let biometricCheckTime: number | undefined;
      if (requiresBiometricReauth && !this.isIdle) {
        const biometricStart = Date.now();
        const biometricResult = await this.performBiometricCheck();
        biometricCheckTime = Date.now() - biometricStart;

        if (!biometricResult.success) {
          securityFlags.push('biometric_auth_failed');
          return {
            valid: false,
            session: this.currentSession,
            requiresReAuthentication: true,
            reason: 'Biometric authentication required',
            securityFlags,
            performanceMetrics: {
              validationTime: Date.now() - startTime,
              securityCheckTime: Date.now() - securityCheckStart,
              biometricCheckTime
            }
          };
        }
      }

      // Check device binding
      if (this.config.enforceDeviceBinding) {
        const deviceValid = await this.validateDeviceBinding(this.currentSession.deviceId);
        if (!deviceValid) {
          securityFlags.push('device_binding_invalid');
          await this.invalidateSession('device_binding_failed');
          return {
            valid: false,
            session: null,
            requiresReAuthentication: true,
            reason: 'Device binding validation failed',
            securityFlags,
            performanceMetrics: {
              validationTime: Date.now() - startTime,
              securityCheckTime: Date.now() - securityCheckStart,
              biometricCheckTime
            }
          };
        }
      }

      // Update last activity
      await this.updateSessionActivity();

      const valid = !this.isIdle && securityFlags.length === 0;
      const requiresReAuthentication = this.isIdle || requiresBiometricReauth;

      return {
        valid,
        session: this.currentSession,
        requiresReAuthentication: requiresReAuthentication && !valid,
        reason: valid ? 'Session valid' : securityFlags.join(', '),
        securityFlags,
        performanceMetrics: {
          validationTime: Date.now() - startTime,
          securityCheckTime: Date.now() - securityCheckStart,
          biometricCheckTime
        }
      };

    } catch (error) {
      await this.logSecurityEvent('session_validation_failed', { error: String(error) });
      return {
        valid: false,
        session: null,
        requiresReAuthentication: true,
        reason: `Validation error: ${error}`,
        securityFlags: ['validation_error'],
        performanceMetrics: {
          validationTime: Date.now() - startTime,
          securityCheckTime: 0
        }
      };
    }
  }

  /**
   * Create emergency session for crisis situations
   */
  async createEmergencySession(userId: string, deviceId: string, crisisType: string): Promise<AuthSession> {
    try {
      // Check if emergency mode is enabled
      if (!this.emergencyConfig.enabled) {
        throw new Error('Emergency sessions are disabled');
      }

      // Create emergency session with limited permissions
      const session = await this.createSession(userId, 'emergency', deviceId, true);

      // Log emergency session creation
      await this.logSessionActivity({
        activityType: 'authentication',
        details: {
          authMethod: 'emergency',
          emergencyMode: true,
          crisisType,
          deviceId,
          automaticTimeout: this.emergencyConfig.automaticTimeout
        },
        securityImpact: 'high',
        requiresAudit: true
      });

      // Set up automatic timeout
      if (this.emergencyConfig.automaticTimeout) {
        setTimeout(() => {
          this.invalidateSession('emergency_timeout');
        }, this.emergencyConfig.maxDurationMinutes * 60 * 1000);
      }

      return session;

    } catch (error) {
      await this.logSecurityEvent('emergency_session_failed', {
        error: String(error),
        userId,
        deviceId,
        crisisType
      });
      throw new Error(`Emergency session creation failed: ${error}`);
    }
  }

  /**
   * Invalidate current session
   */
  async invalidateSession(reason: string): Promise<void> {
    try {
      if (this.currentSession) {
        // Clear session timers
        this.clearSessionTimers();

        // Log session termination
        await this.logSessionActivity({
          activityType: 'logout',
          details: {
            reason,
            sessionDuration: Date.now() - new Date(this.currentSession.createdAt).getTime(),
            voluntary: reason === 'user_logout'
          },
          securityImpact: 'medium',
          requiresAudit: true
        });

        // Clear stored session
        await SecureStore.deleteItemAsync(this.SESSION_KEY);

        this.currentSession = null;
        this.isIdle = false;
      }
    } catch (error) {
      console.error('Session invalidation failed:', error);
      await this.logSecurityEvent('session_invalidation_failed', { error: String(error), reason });
    }
  }

  // ===========================================
  // ACTIVITY MONITORING
  // ===========================================

  /**
   * Set up activity monitoring for idle detection
   */
  private setupActivityMonitoring(): void {
    // Set up idle detection timer
    this.resetActivityTimer();
  }

  /**
   * Reset activity timer
   */
  private resetActivityTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.lastActivity = new Date();
    this.isIdle = false;

    this.idleTimer = setTimeout(() => {
      this.handleIdleTimeout();
    }, this.config.idleTimeoutMinutes * 60 * 1000);
  }

  /**
   * Handle idle timeout
   */
  private async handleIdleTimeout(): Promise<void> {
    this.isIdle = true;

    await this.logSessionActivity({
      activityType: 'idle_detected',
      details: {
        idleTimeoutMinutes: this.config.idleTimeoutMinutes,
        lastActivity: this.lastActivity.toISOString()
      },
      securityImpact: 'medium',
      requiresAudit: true
    });

    // Trigger re-authentication requirement
    console.log('User idle detected - re-authentication will be required');
  }

  /**
   * Set up app state monitoring
   */
  private setupAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      this.handleAppStateChange(nextAppState);
    });
  }

  /**
   * Handle app state changes
   */
  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    try {
      if (nextAppState === 'background' && this.config.autoLockOnBackground) {
        await this.logSessionActivity({
          activityType: 'background',
          details: {
            timestamp: new Date().toISOString(),
            autoLockEnabled: this.config.autoLockOnBackground
          },
          securityImpact: 'low',
          requiresAudit: false
        });

        // Set idle state when app goes to background
        this.isIdle = true;
      } else if (nextAppState === 'active') {
        await this.logSessionActivity({
          activityType: 'foreground',
          details: {
            timestamp: new Date().toISOString(),
            wasIdle: this.isIdle
          },
          securityImpact: 'low',
          requiresAudit: false
        });

        // Reset activity timer when app becomes active
        this.resetActivityTimer();
      }
    } catch (error) {
      console.error('App state change handling failed:', error);
    }
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Update session activity
   */
  private async updateSessionActivity(): Promise<void> {
    if (this.currentSession) {
      this.currentSession = {
        ...this.currentSession,
        lastActivity: new Date().toISOString()
      };

      await this.storeSession(this.currentSession);
      this.resetActivityTimer();
    }
  }

  /**
   * Log session activity
   */
  private async logSessionActivity(activity: Omit<SessionActivity, 'activityId' | 'sessionId' | 'timestamp'>): Promise<void> {
    const sessionActivity: SessionActivity = {
      activityId: await Crypto.randomUUID(),
      sessionId: this.currentSession?.id || 'no_session',
      timestamp: new Date().toISOString(),
      ...activity
    };

    this.sessionActivities.push(sessionActivity);

    // Keep only recent activities (performance optimization)
    if (this.sessionActivities.length > 1000) {
      this.sessionActivities = this.sessionActivities.slice(-500);
    }

    // Store activities
    await this.storeSessionActivities();

    // Log to security controls if audit required
    if (activity.requiresAudit) {
      await securityControlsService.logAuditEntry({
        operation: `session_${activity.activityType}`,
        entityType: 'session',
        dataSensitivity: DataSensitivity.PERSONAL,
        userId: this.currentSession?.userId || 'unknown',
        securityContext: {
          authenticated: !!this.currentSession,
          biometricUsed: this.currentSession?.security.biometricVerified || false,
          deviceTrusted: this.currentSession?.security.deviceTrusted || false,
          networkSecure: true,
          encryptionActive: true
        },
        operationMetadata: {
          success: true,
          duration: 0
        },
        complianceMarkers: {
          hipaaRequired: true,
          auditRequired: true,
          retentionDays: 2555 // 7 years
        }
      });
    }
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(eventType: string, details: Record<string, unknown>): Promise<void> {
    await securityControlsService.recordSecurityViolation({
      violationType: 'policy_violation',
      severity: 'medium',
      description: `Session security event: ${eventType}`,
      affectedResources: ['session_service'],
      automaticResponse: {
        implemented: false,
        actions: []
      }
    });
  }

  // ===========================================
  // STORAGE METHODS
  // ===========================================

  /**
   * Store session securely
   */
  private async storeSession(session: AuthSession): Promise<void> {
    const encryptedSession = await encryptionService.encryptData(session, DataSensitivity.PERSONAL);
    await SecureStore.setItemAsync(this.SESSION_KEY, JSON.stringify(encryptedSession));
  }

  /**
   * Load session data
   */
  private async loadSessionData(): Promise<void> {
    try {
      const encryptedData = await SecureStore.getItemAsync(this.SESSION_KEY);
      if (encryptedData) {
        const encryptedSession = JSON.parse(encryptedData);
        const session = await encryptionService.decryptData(encryptedSession, DataSensitivity.PERSONAL);

        // Validate session is not expired
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        if (now < expiresAt) {
          this.currentSession = session;
          this.setupSessionTimers(session);
        }
      }
    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  }

  /**
   * Store session activities
   */
  private async storeSessionActivities(): Promise<void> {
    try {
      const encryptedActivities = await encryptionService.encryptData(
        this.sessionActivities,
        DataSensitivity.PERSONAL
      );
      await SecureStore.setItemAsync(this.ACTIVITY_LOG_KEY, JSON.stringify(encryptedActivities));
    } catch (error) {
      console.error('Failed to store session activities:', error);
    }
  }

  /**
   * Load configuration
   */
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

  // ===========================================
  // HELPER METHODS (TO BE IMPLEMENTED)
  // ===========================================

  private async generateDeviceToken(deviceId: string): Promise<string> {
    // TODO: Implement secure device token generation
    return `device_${deviceId}_${Date.now()}`;
  }

  private async generateAccessToken(userId: string, sessionId: string, emergencyMode: boolean): Promise<string> {
    // TODO: Implement JWT access token generation
    return `access_${userId}_${sessionId}_${emergencyMode ? 'emergency' : 'normal'}`;
  }

  private async generateRefreshToken(userId: string, sessionId: string): Promise<string> {
    // TODO: Implement secure refresh token generation
    return `refresh_${userId}_${sessionId}`;
  }

  private async generateEmergencyToken(userId: string, sessionId: string): Promise<string> {
    // TODO: Implement emergency access token
    return `emergency_${userId}_${sessionId}`;
  }

  private async isDeviceTrusted(deviceId: string): Promise<boolean> {
    // TODO: Implement device trust validation
    return true;
  }

  private async calculateRiskScore(userId: string, deviceId: string, authMethod: SessionSecurity['authMethod']): Promise<number> {
    // TODO: Implement risk scoring algorithm
    return authMethod === 'emergency' ? 0.8 : 0.2;
  }

  private async getDeviceInfo(deviceId: string): Promise<any> {
    // TODO: Implement device info collection
    return {
      deviceId,
      deviceName: 'Unknown Device',
      platform: 'unknown',
      osVersion: 'unknown',
      appVersion: '1.0.0',
      locale: 'en-US',
      timezone: 'UTC',
      lastSeen: new Date().toISOString(),
      firstSeen: new Date().toISOString(),
      syncEnabled: false,
      encryptionCapabilities: {
        hardwareEncryption: false,
        keychainAccess: true,
        biometricKeyDerivation: false,
        secureEnclave: false,
        webCryptoSupport: false,
        encryptionAlgorithms: ['AES-256-GCM']
      },
      biometricCapabilities: {
        available: false,
        types: [],
        enrolled: false,
        hardwareBacked: false,
        fallbackAvailable: true
      },
      networkInfo: {
        connectionType: 'unknown',
        isVPN: false,
        isProxy: false
      }
    };
  }

  private async getSessionPermissions(userId: string, emergencyMode: boolean): Promise<any> {
    // TODO: Implement dynamic permission system
    return {
      dataAccess: {
        read: emergencyMode ? ['crisis_plan'] : ['checkins', 'assessments', 'profile', 'crisis_plan'],
        write: emergencyMode ? [] : ['checkins', 'assessments', 'profile', 'crisis_plan'],
        delete: emergencyMode ? [] : ['checkins', 'assessments']
      },
      features: {
        cloudSync: !emergencyMode,
        crossDeviceSync: !emergencyMode,
        exportData: !emergencyMode,
        emergencyFeatures: true,
        adminFeatures: false
      },
      restrictions: {
        dataRetentionDays: emergencyMode ? 1 : undefined,
        maxDevices: emergencyMode ? 1 : 3
      }
    };
  }

  private async getComplianceInfo(userId: string): Promise<any> {
    // TODO: Implement compliance tracking
    return {
      hipaaCompliant: true,
      consentGiven: true,
      consentVersion: AUTH_CONSTANTS.COMPLIANCE.CONSENT_VERSION_CURRENT,
      consentTimestamp: new Date().toISOString(),
      dataProcessingAgreement: true,
      auditingEnabled: true,
      retentionPolicyAccepted: true,
      privacyPolicyVersion: AUTH_CONSTANTS.COMPLIANCE.PRIVACY_POLICY_VERSION_CURRENT,
      complianceFlags: []
    };
  }

  private setupSessionTimers(session: AuthSession): void {
    // Clear existing timers
    this.clearSessionTimers();

    // Set session timeout
    const expiresAt = new Date(session.expiresAt);
    const timeUntilExpiry = expiresAt.getTime() - Date.now();

    if (timeUntilExpiry > 0) {
      this.sessionTimer = setTimeout(() => {
        this.invalidateSession('session_timeout');
      }, timeUntilExpiry);
    }
  }

  private clearSessionTimers(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private async performBiometricCheck(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity to continue',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false
      });

      return { success: result.success, error: result.error };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async validateDeviceBinding(deviceId: string): Promise<boolean> {
    // TODO: Implement device binding validation
    return true;
  }

  // ===========================================
  // PUBLIC API
  // ===========================================

  /**
   * Get current session
   */
  getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentSession && !this.isIdle;
  }

  /**
   * Mark user activity (call this on user interactions)
   */
  markActivity(): void {
    this.resetActivityTimer();
  }

  /**
   * Get session configuration
   */
  getConfiguration(): SessionSecurityConfig {
    return { ...this.config };
  }

  /**
   * Update session configuration
   */
  async updateConfiguration(newConfig: Partial<SessionSecurityConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await SecureStore.setItemAsync(this.CONFIG_KEY, JSON.stringify(this.config));
  }

  /**
   * Get session activities (for debugging/audit)
   */
  getSessionActivities(): SessionActivity[] {
    return [...this.sessionActivities];
  }

  /**
   * Cleanup service (call on app termination)
   */
  async cleanup(): Promise<void> {
    this.clearSessionTimers();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    if (this.currentSession) {
      await this.invalidateSession('app_termination');
    }
  }
}

// Export singleton instance
export const sessionSecurityService = SessionSecurityService.getInstance();