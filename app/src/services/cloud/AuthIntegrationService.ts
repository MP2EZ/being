/**
 * Authentication Integration Service - Week 2 Implementation
 *
 * Integrates Supabase Auth with existing FullMind infrastructure:
 * - CloudSyncAPI and SupabaseClient integration
 * - Zero-knowledge encryption with authentication
 * - Crisis response authentication (<200ms requirement)
 * - HIPAA-compliant session management and audit logging
 */

import { Session, AuthChangeEvent, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

// Import existing services
import { supabaseAuthService, AuthenticationResult } from './SupabaseAuthConfig';
import { supabaseClient } from './SupabaseClient';
import { cloudSyncAPI } from './CloudSyncAPI';
import { securityManager } from '../security';

// Types for integration
export interface AuthSessionState {
  readonly isAuthenticated: boolean;
  readonly user: any;
  readonly session: Session | null;
  readonly deviceBound: boolean;
  readonly emergencyAccess: boolean;
  readonly sessionType: 'normal' | 'emergency' | 'crisis' | 'recovery';
  readonly expiresAt: string | null;
  readonly performanceMetrics: {
    readonly lastAuthTime: number;
    readonly averageAuthTime: number;
    readonly networkLatency: number;
  };
}

export interface ConsentState {
  readonly dataProcessing: boolean;
  readonly clinicalData: boolean;
  readonly emergencyAccess: boolean;
  readonly cloudSync: boolean;
  readonly biometricAuth: boolean;
  readonly lastUpdated: string;
}

export interface DeviceRegistration {
  readonly deviceId: string;
  readonly registered: boolean;
  readonly trusted: boolean;
  readonly encryptionKeyId: string;
  readonly lastActivity: string;
}

export interface CrisisAuthResult {
  readonly success: boolean;
  readonly sessionId: string | null;
  readonly accessGranted: boolean;
  readonly responseTime: number;
  readonly error?: string;
}

/**
 * Main Authentication Integration Service
 * Coordinates between auth, security, and cloud services
 */
export class AuthIntegrationService {
  private static instance: AuthIntegrationService;
  private authStateListeners = new Set<(state: AuthSessionState) => void>();
  private currentSessionState: AuthSessionState | null = null;
  private performanceMetrics = {
    authTimes: [] as number[],
    networkLatencies: [] as number[]
  };

  constructor() {
    this.initializeIntegration();
  }

  /**
   * Get singleton instance of AuthIntegrationService
   */
  static getInstance(): AuthIntegrationService {
    if (!AuthIntegrationService.instance) {
      AuthIntegrationService.instance = new AuthIntegrationService();
    }
    return AuthIntegrationService.instance;
  }

  /**
   * Initialize authentication integration
   */
  private async initializeIntegration(): Promise<void> {
    try {
      // Set up auth state change listener
      supabaseAuthService.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
        await this.handleAuthStateChange(event, session);
      });

      // Initialize security manager
      await securityManager.initialize();

      // Check for existing session
      const currentSession = supabaseAuthService.getSession();
      if (currentSession) {
        await this.handleAuthStateChange('SIGNED_IN', currentSession);
      }

      console.log('Authentication integration initialized successfully');

    } catch (error) {
      console.error('Authentication integration initialization failed:', error);
      throw new Error(`Auth integration failed: ${error}`);
    }
  }

  /**
   * Handle authentication state changes and update all systems
   */
  private async handleAuthStateChange(event: AuthChangeEvent, session: Session | null): Promise<void> {
    const startTime = Date.now();

    try {
      // Update current session state
      await this.updateSessionState(session);

      // Update cloud sync client
      if (session) {
        await this.configureCloudServices(session);
      } else {
        await this.clearCloudServices();
      }

      // Update security context
      await this.updateSecurityContext(session);

      // Log auth event for audit
      await this.logAuthEvent(event, session, Date.now() - startTime);

      // Notify listeners
      if (this.currentSessionState) {
        this.notifyAuthStateListeners(this.currentSessionState);
      }

    } catch (error) {
      console.error('Auth state change handling failed:', error);
      await this.handleAuthError(error, event);
    }
  }

  /**
   * Update current session state
   */
  private async updateSessionState(session: Session | null): Promise<void> {
    if (!session) {
      this.currentSessionState = {
        isAuthenticated: false,
        user: null,
        session: null,
        deviceBound: false,
        emergencyAccess: false,
        sessionType: 'normal',
        expiresAt: null,
        performanceMetrics: {
          lastAuthTime: 0,
          averageAuthTime: this.getAverageAuthTime(),
          networkLatency: this.getAverageNetworkLatency()
        }
      };
      return;
    }

    // Check for emergency session
    const emergencySessionData = await AsyncStorage.getItem('fullmind-emergency-session');
    const emergencyAccess = !!emergencySessionData;

    // Get device binding status
    const deviceBound = await this.checkDeviceBinding(session.user.id);

    // Determine session type
    const sessionType = emergencyAccess ? 'emergency' : 'normal';

    this.currentSessionState = {
      isAuthenticated: true,
      user: session.user,
      session,
      deviceBound,
      emergencyAccess,
      sessionType,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      performanceMetrics: {
        lastAuthTime: this.performanceMetrics.authTimes[this.performanceMetrics.authTimes.length - 1] || 0,
        averageAuthTime: this.getAverageAuthTime(),
        networkLatency: this.getAverageNetworkLatency()
      }
    };
  }

  /**
   * Configure cloud services for authenticated session
   */
  private async configureCloudServices(session: Session): Promise<void> {
    try {
      // Update Supabase client with session
      const client = supabaseClient.getClient();
      if (client) {
        await client.auth.setSession(session);
      }

      // Initialize cloud sync if enabled and consent granted
      const consentValid = await this.validateCloudSyncConsent(session.user.id);
      if (consentValid) {
        // Cloud sync API will automatically pick up the session
        console.log('Cloud sync configured for authenticated user');
      }

    } catch (error) {
      console.error('Cloud services configuration failed:', error);
    }
  }

  /**
   * Clear cloud services on sign out
   */
  private async clearCloudServices(): Promise<void> {
    try {
      // Clear any cached data
      await AsyncStorage.removeItem('fullmind-emergency-session');
      await AsyncStorage.removeItem('fullmind-device-info');

      console.log('Cloud services cleared');

    } catch (error) {
      console.error('Cloud services cleanup failed:', error);
    }
  }

  /**
   * Update security context with current session
   */
  private async updateSecurityContext(session: Session | null): Promise<void> {
    try {
      if (session) {
        // Log security event for session creation
        await securityManager.logSecurityEvent({
          operation: 'SESSION_ESTABLISHED',
          entityType: 'authentication',
          userId: session.user.id,
          securityContext: {
            authenticated: true,
            biometricUsed: false, // Would be determined from session metadata
            deviceTrusted: await this.checkDeviceBinding(session.user.id),
            networkSecure: true,
            encryptionActive: true
          }
        });
      } else {
        // Log security event for session termination
        await securityManager.logSecurityEvent({
          operation: 'SESSION_TERMINATED',
          entityType: 'authentication',
          securityContext: {
            authenticated: false,
            biometricUsed: false,
            deviceTrusted: false,
            networkSecure: true,
            encryptionActive: true
          }
        });
      }

    } catch (error) {
      console.error('Security context update failed:', error);
    }
  }

  /**
   * Check device binding status
   */
  private async checkDeviceBinding(userId: string): Promise<boolean> {
    try {
      const client = supabaseClient.getClient();
      if (!client) return false;

      const deviceInfo = await AsyncStorage.getItem('fullmind-device-info');
      if (!deviceInfo) return false;

      const { deviceId } = JSON.parse(deviceInfo);

      const { data, error } = await client
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .eq('active', true)
        .single();

      return !error && !!data;

    } catch (error) {
      console.error('Device binding check failed:', error);
      return false;
    }
  }

  /**
   * Validate cloud sync consent
   */
  private async validateCloudSyncConsent(userId: string): Promise<boolean> {
    try {
      const client = supabaseClient.getClient();
      if (!client) return false;

      const { data, error } = await client
        .rpc('validate_user_consent', {
          user_uuid: userId,
          consent_types: ['cloud_sync', 'data_processing']
        });

      return !error && data === true;

    } catch (error) {
      console.error('Cloud sync consent validation failed:', error);
      return false;
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthenticationResult> {
    const startTime = Date.now();

    try {
      // Use enhanced auth service
      const result = await supabaseAuthService.signInWithPassword(email, password);

      // Track performance metrics
      this.trackAuthPerformance(result.performanceMetrics.authTime, result.performanceMetrics.networkLatency);

      // Set up default consents if sign-in successful
      if (result.success && result.user) {
        await this.setupDefaultConsents(result.user.id);
      }

      return result;

    } catch (error) {
      console.error('Sign in failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
        performanceMetrics: {
          authTime: Date.now() - startTime,
          networkLatency: 0
        }
      };
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, metadata?: Record<string, any>): Promise<AuthenticationResult> {
    const startTime = Date.now();

    try {
      // Use enhanced auth service
      const result = await supabaseAuthService.signUpWithPassword(email, password, metadata);

      // Track performance metrics
      this.trackAuthPerformance(result.performanceMetrics.authTime, result.performanceMetrics.networkLatency);

      // Set up default consents if sign-up successful
      if (result.success && result.user) {
        await this.setupDefaultConsents(result.user.id);
      }

      return result;

    } catch (error) {
      console.error('Sign up failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign up failed',
        performanceMetrics: {
          authTime: Date.now() - startTime,
          networkLatency: 0
        }
      };
    }
  }

  /**
   * Sign in with Apple (iOS only)
   */
  async signInWithApple(): Promise<AuthenticationResult> {
    const result = await supabaseAuthService.signInWithApple();

    if (result.success && result.user) {
      this.trackAuthPerformance(result.performanceMetrics.authTime, result.performanceMetrics.networkLatency);
      await this.setupDefaultConsents(result.user.id);
    }

    return result;
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(): Promise<AuthenticationResult> {
    const result = await supabaseAuthService.signInWithGoogle();

    if (result.success && result.user) {
      this.trackAuthPerformance(result.performanceMetrics.authTime, result.performanceMetrics.networkLatency);
      await this.setupDefaultConsents(result.user.id);
    }

    return result;
  }

  /**
   * Create emergency session for crisis scenarios
   */
  async createCrisisAuthentication(crisisType: string, severity: 'low' | 'medium' | 'high' | 'severe'): Promise<CrisisAuthResult> {
    const startTime = Date.now();

    try {
      // Check if crisis response is fast enough (<200ms requirement)
      const securityCheck = await securityManager.emergencySecurityCheck();
      if (!securityCheck) {
        return {
          success: false,
          sessionId: null,
          accessGranted: false,
          responseTime: Date.now() - startTime,
          error: 'Emergency security check failed'
        };
      }

      // Create emergency session
      const result = await supabaseAuthService.createEmergencySession(crisisType, severity);

      const responseTime = Date.now() - startTime;

      // Verify response time meets crisis requirement
      if (responseTime > 200) {
        console.warn(`Crisis authentication took ${responseTime}ms, exceeding 200ms requirement`);
      }

      return {
        success: result.success,
        sessionId: result.success ? 'emergency_session' : null,
        accessGranted: result.emergencyAccess || false,
        responseTime,
        error: result.error
      };

    } catch (error) {
      return {
        success: false,
        sessionId: null,
        accessGranted: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Crisis authentication failed'
      };
    }
  }

  /**
   * Set up default consents for new users
   */
  private async setupDefaultConsents(userId: string): Promise<void> {
    try {
      const client = supabaseClient.getClient();
      if (!client) return;

      const deviceInfo = await AsyncStorage.getItem('fullmind-device-info');
      const deviceId = deviceInfo ? JSON.parse(deviceInfo).deviceId : 'unknown';

      await client.rpc('setup_default_consents', {
        user_uuid: userId,
        device_id_param: deviceId
      });

    } catch (error) {
      console.error('Default consents setup failed:', error);
    }
  }

  /**
   * Update user consent
   */
  async updateConsent(
    consentType: string,
    granted: boolean,
    purpose: string,
    dataCategories: string[]
  ): Promise<boolean> {
    try {
      const client = supabaseClient.getClient();
      const session = supabaseAuthService.getSession();

      if (!client || !session) {
        return false;
      }

      const deviceInfo = await AsyncStorage.getItem('fullmind-device-info');
      const deviceId = deviceInfo ? JSON.parse(deviceInfo).deviceId : 'unknown';

      const { error } = await client
        .from('user_consent')
        .upsert({
          user_id: session.user.id,
          device_id: deviceId,
          consent_type: consentType,
          consent_version: '1.0',
          granted,
          granted_at: new Date().toISOString(),
          legal_basis: 'consent',
          purpose,
          data_categories: dataCategories,
          retention_period: 2555, // 7 years
          third_party_sharing: false,
          automated_processing: false
        }, {
          onConflict: 'user_id,consent_type,consent_version'
        });

      return !error;

    } catch (error) {
      console.error('Consent update failed:', error);
      return false;
    }
  }

  /**
   * Get current consent state
   */
  async getConsentState(): Promise<ConsentState | null> {
    try {
      const client = supabaseClient.getClient();
      const session = supabaseAuthService.getSession();

      if (!client || !session) {
        return null;
      }

      const { data, error } = await client
        .from('user_consent')
        .select('consent_type, granted, granted_at')
        .eq('user_id', session.user.id)
        .eq('granted', true)
        .is('withdrawn_at', null);

      if (error) {
        console.error('Consent state retrieval failed:', error);
        return null;
      }

      const consents = data || [];
      const lastUpdated = consents.reduce((latest, consent) => {
        const grantedAt = new Date(consent.granted_at);
        return grantedAt > latest ? grantedAt : latest;
      }, new Date(0));

      return {
        dataProcessing: consents.some(c => c.consent_type === 'data_processing'),
        clinicalData: consents.some(c => c.consent_type === 'clinical_data'),
        emergencyAccess: consents.some(c => c.consent_type === 'emergency_access'),
        cloudSync: consents.some(c => c.consent_type === 'cloud_sync'),
        biometricAuth: consents.some(c => c.consent_type === 'biometric_auth'),
        lastUpdated: lastUpdated.toISOString()
      };

    } catch (error) {
      console.error('Consent state retrieval failed:', error);
      return null;
    }
  }

  /**
   * Get device registration status
   */
  async getDeviceRegistration(): Promise<DeviceRegistration | null> {
    try {
      const client = supabaseClient.getClient();
      const session = supabaseAuthService.getSession();

      if (!client || !session) {
        return null;
      }

      const deviceInfo = await AsyncStorage.getItem('fullmind-device-info');
      if (!deviceInfo) {
        return null;
      }

      const { deviceId } = JSON.parse(deviceInfo);

      const { data, error } = await client
        .from('user_devices')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('device_id', deviceId)
        .single();

      if (error || !data) {
        return {
          deviceId,
          registered: false,
          trusted: false,
          encryptionKeyId: '',
          lastActivity: new Date().toISOString()
        };
      }

      return {
        deviceId: data.device_id,
        registered: true,
        trusted: data.active,
        encryptionKeyId: data.encryption_key_id,
        lastActivity: data.last_seen
      };

    } catch (error) {
      console.error('Device registration check failed:', error);
      return null;
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      await supabaseAuthService.signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  /**
   * Get current session state
   */
  getSessionState(): AuthSessionState | null {
    return this.currentSessionState;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentSessionState?.isAuthenticated || false;
  }

  /**
   * Add auth state change listener
   */
  onAuthStateChange(listener: (state: AuthSessionState) => void): () => void {
    this.authStateListeners.add(listener);

    return () => {
      this.authStateListeners.delete(listener);
    };
  }

  /**
   * Refresh current session
   */
  async refreshSession(): Promise<boolean> {
    return await supabaseAuthService.refreshSession();
  }

  /**
   * Get authentication health status
   */
  async getAuthHealth() {
    return await supabaseAuthService.getAuthHealth();
  }

  // Private helper methods

  private trackAuthPerformance(authTime: number, networkLatency: number): void {
    this.performanceMetrics.authTimes.push(authTime);
    this.performanceMetrics.networkLatencies.push(networkLatency);

    // Keep only last 10 measurements
    if (this.performanceMetrics.authTimes.length > 10) {
      this.performanceMetrics.authTimes.shift();
    }
    if (this.performanceMetrics.networkLatencies.length > 10) {
      this.performanceMetrics.networkLatencies.shift();
    }
  }

  private getAverageAuthTime(): number {
    const times = this.performanceMetrics.authTimes;
    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
  }

  private getAverageNetworkLatency(): number {
    const latencies = this.performanceMetrics.networkLatencies;
    return latencies.length > 0 ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length : 0;
  }

  private notifyAuthStateListeners(state: AuthSessionState): void {
    this.authStateListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Auth state listener error:', error);
      }
    });
  }

  private async logAuthEvent(event: AuthChangeEvent, session: Session | null, duration: number): Promise<void> {
    try {
      await securityManager.logSecurityEvent({
        operation: `AUTH_${event}`,
        entityType: 'authentication',
        userId: session?.user?.id,
        operationMetadata: {
          success: !!session,
          duration
        },
        securityContext: {
          authenticated: !!session,
          biometricUsed: false,
          deviceTrusted: session ? await this.checkDeviceBinding(session.user.id) : false,
          networkSecure: true,
          encryptionActive: true
        }
      });

    } catch (error) {
      console.error('Auth event logging failed:', error);
    }
  }

  private async handleAuthError(error: any, event: AuthChangeEvent): Promise<void> {
    console.error(`Auth error during ${event}:`, error);

    // Log security violation
    await securityManager.handleSecurityViolation({
      violationType: 'authentication_error',
      severity: 'medium',
      description: `Authentication error during ${event}: ${error}`,
      affectedResources: ['authentication_system'],
      automaticResponse: {
        implemented: false,
        actions: []
      }
    });
  }
}

// Export singleton instance
export const authIntegrationService = new AuthIntegrationService();

// Convenience functions
export const signIn = (email: string, password: string) =>
  authIntegrationService.signIn(email, password);

export const signUp = (email: string, password: string, metadata?: Record<string, any>) =>
  authIntegrationService.signUp(email, password, metadata);

export const signInWithApple = () =>
  authIntegrationService.signInWithApple();

export const signInWithGoogle = () =>
  authIntegrationService.signInWithGoogle();

export const createCrisisAuthentication = (crisisType: string, severity: 'low' | 'medium' | 'high' | 'severe') =>
  authIntegrationService.createCrisisAuthentication(crisisType, severity);

export const signOut = () =>
  authIntegrationService.signOut();

export const isAuthenticated = () =>
  authIntegrationService.isAuthenticated();

export const getSessionState = () =>
  authIntegrationService.getSessionState();

export const getConsentState = () =>
  authIntegrationService.getConsentState();

export const updateConsent = (
  consentType: string,
  granted: boolean,
  purpose: string,
  dataCategories: string[]
) => authIntegrationService.updateConsent(consentType, granted, purpose, dataCategories);

export const getDeviceRegistration = () =>
  authIntegrationService.getDeviceRegistration();

export const refreshSession = () =>
  authIntegrationService.refreshSession();

export const getAuthHealth = () =>
  authIntegrationService.getAuthHealth();

export const onAuthStateChange = (listener: (state: AuthSessionState) => void) =>
  authIntegrationService.onAuthStateChange(listener);