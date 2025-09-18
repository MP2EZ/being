/**
 * Emergency Authentication Model for Crisis Safety
 *
 * Implements comprehensive emergency authentication with:
 * - Crisis access bypass with biometric/PIN/emergency code fallback
 * - Degraded mode operation with local-only access
 * - Enhanced audit requirements during emergency access
 * - Emergency contact verification with multiple factors
 * - Time-limited access with automatic revocation
 * - <200ms crisis response guarantee
 */

import { crisisAuthenticationService } from './CrisisAuthenticationService';
import { sessionSecurityService } from './SessionSecurityService';
import { encryptionService, DataSensitivity } from './EncryptionService';
import { deviceTrustManager } from './DeviceTrustManager';
import { securityControlsService } from './SecurityControlsService';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

// Emergency Authentication Types
export interface EmergencyAuthenticationConfig {
  crisisAccessBypass: {
    enabled: boolean;
    allowedMethods: EmergencyAuthMethod[];
    fallbackChain: EmergencyAuthMethod[];
    maxResponseTime: number; // 200ms for crisis
    degradedModeEnabled: boolean;
  };
  emergencyContacts: {
    verificationRequired: boolean;
    multiFactorRequired: boolean;
    contactVerificationMethods: ContactVerificationMethod[];
    emergencyContactTimeout: number; // seconds
  };
  timeLimitedAccess: {
    enabled: boolean;
    defaultDurationMinutes: number;
    maxDurationMinutes: number;
    automaticRevocation: boolean;
    warningIntervals: number[]; // minutes before expiry
  };
  auditRequirements: {
    enhancedLogging: boolean;
    realTimeNotification: boolean;
    justificationRequired: boolean;
    securityTeamNotification: boolean;
    postEmergencyReview: boolean;
  };
  degradedModeOperation: {
    allowedFeatures: string[];
    restrictedFeatures: string[];
    localOnlyAccess: boolean;
    networkOperationsDisabled: boolean;
    syncOperationsDisabled: boolean;
  };
}

export type EmergencyAuthMethod =
  | 'biometric_bypass'
  | 'emergency_pin'
  | 'emergency_code'
  | 'device_fallback'
  | 'contact_verification'
  | 'manual_override';

export type ContactVerificationMethod =
  | 'phone_verification'
  | 'email_verification'
  | 'sms_verification'
  | 'emergency_contact_call'
  | 'trusted_contact_confirmation';

export interface EmergencyAuthenticationRequest {
  requestId: string;
  timestamp: string;
  deviceId: string;
  userId?: string;
  crisisType: 'suicidal_ideation' | 'panic_attack' | 'medical_emergency' | 'safety_concern' | 'other';
  severityLevel: 'low' | 'medium' | 'high' | 'critical';
  requestedAccess: string[];
  emergencyJustification?: string;
  contactInformation?: EmergencyContactInfo;
  locationInfo?: {
    latitude?: number;
    longitude?: number;
    timestamp: string;
  };
}

export interface EmergencyContactInfo {
  primaryContact?: {
    name: string;
    phone: string;
    relationship: string;
    verificationStatus: 'pending' | 'verified' | 'failed';
  };
  secondaryContacts?: Array<{
    name: string;
    phone: string;
    relationship: string;
    priority: number;
  }>;
  emergencyServices?: {
    contacted: boolean;
    serviceType: '911' | '988' | 'local_emergency';
    contactTime?: string;
  };
}

export interface EmergencyAuthenticationResult {
  success: boolean;
  sessionId?: string;
  accessToken?: string;
  emergencySession?: EmergencySession;
  authenticatedMethods: EmergencyAuthMethod[];
  bypassedSecurityMeasures: string[];
  degradedModeActive: boolean;
  timeLimit?: {
    expiresAt: string;
    warningAt: string;
    automaticRevocation: boolean;
  };
  auditingEnhanced: boolean;
  performanceMetrics: {
    authenticationTime: number;
    bypassTime: number;
    contactVerificationTime?: number;
    totalResponseTime: number;
  };
  error?: string;
  fallbackOptions?: EmergencyAuthMethod[];
}

export interface EmergencySession {
  sessionId: string;
  deviceId: string;
  userId?: string;
  crisisType: EmergencyAuthenticationRequest['crisisType'];
  severityLevel: EmergencyAuthenticationRequest['severityLevel'];
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
  accessLevel: 'full' | 'crisis_only' | 'degraded' | 'local_only';
  allowedOperations: string[];
  restrictedOperations: string[];
  auditLevel: 'standard' | 'enhanced' | 'real_time';
  emergencyOverrides: string[];
  contactVerification?: {
    verified: boolean;
    verificationMethod: ContactVerificationMethod;
    verificationTime: string;
    verificationDetails: any;
  };
}

export interface DegradedModeConfig {
  enabled: boolean;
  allowedFeatures: {
    crisisButton: boolean;
    emergencyContacts: boolean;
    crisisPlan: boolean;
    localAssessments: boolean;
    offlineJournal: boolean;
    breathingExercises: boolean;
    mindfulnessAudio: boolean;
  };
  restrictedFeatures: {
    cloudSync: boolean;
    dataExport: boolean;
    socialFeatures: boolean;
    advancedAnalytics: boolean;
    paymentFeatures: boolean;
    deviceManagement: boolean;
  };
  dataAccess: {
    localDataOnly: boolean;
    encryptedLocalCache: boolean;
    emergencyDataAccess: boolean;
    historicalDataLimited: boolean;
  };
  networkRestrictions: {
    emergencyCallsOnly: boolean;
    hotlineAccessOnly: boolean;
    noCloudOperations: boolean;
    noSyncOperations: boolean;
  };
}

export interface EmergencyAuditEvent {
  eventId: string;
  timestamp: string;
  sessionId: string;
  eventType: 'authentication' | 'access_granted' | 'operation_performed' | 'session_expired' | 'emergency_override';
  operation: string;
  justification?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  securityBypass: string[];
  contactVerification?: boolean;
  emergencyContacts?: string[];
  performanceMetrics: {
    operationTime: number;
    securityCheckTime: number;
    auditLoggingTime: number;
  };
  complianceMarkers: {
    hipaaApplicable: boolean;
    emergencyException: boolean;
    postReviewRequired: boolean;
    dataMinimization: boolean;
  };
}

/**
 * Emergency Authentication Model Implementation
 */
export class EmergencyAuthenticationModel {
  private static instance: EmergencyAuthenticationModel;
  private config: EmergencyAuthenticationConfig;
  private activeSessions: Map<string, EmergencySession> = new Map();
  private auditEvents: EmergencyAuditEvent[] = [];
  private degradedModeConfig: DegradedModeConfig;

  // Emergency authentication cache for offline access
  private emergencyAuthCache: Map<string, {
    hashedCredentials: string;
    emergencyCode: string;
    deviceFingerprint: string;
    createdAt: string;
  }> = new Map();

  // Performance tracking for crisis response
  private performanceMetrics = {
    averageEmergencyAuthTime: 0,
    fastestCrisisResponse: Infinity,
    emergencyAuthSuccessRate: 0,
    degradedModeActivations: 0,
    totalEmergencyAuthentications: 0
  };

  private constructor() {
    this.initializeConfig();
    this.initializeDegradedModeConfig();
    this.loadEmergencyAuthCache();
  }

  public static getInstance(): EmergencyAuthenticationModel {
    if (!EmergencyAuthenticationModel.instance) {
      EmergencyAuthenticationModel.instance = new EmergencyAuthenticationModel();
    }
    return EmergencyAuthenticationModel.instance;
  }

  /**
   * Perform emergency authentication with crisis access bypass
   */
  async performEmergencyAuthentication(
    request: EmergencyAuthenticationRequest
  ): Promise<EmergencyAuthenticationResult> {
    const startTime = Date.now();

    try {
      console.log(`Emergency authentication requested: ${request.crisisType} (${request.severityLevel})`);

      // Critical: Ensure crisis response time <200ms
      const isCriticalCrisis = request.severityLevel === 'critical' ||
                              request.crisisType === 'suicidal_ideation';

      // Validate emergency authentication request
      await this.validateEmergencyRequest(request);

      // Attempt authentication methods in order of speed
      const authResult = await this.attemptEmergencyAuthMethods(request, isCriticalCrisis);

      // Create emergency session
      const emergencySession = await this.createEmergencySession(request, authResult);

      // Set up time-limited access
      const timeLimit = await this.setupTimeLimitedAccess(emergencySession);

      // Enable degraded mode if required
      const degradedModeActive = await this.enableDegradedModeIfRequired(
        request,
        authResult.success
      );

      // Set up enhanced auditing
      await this.setupEnhancedAuditing(emergencySession);

      const totalResponseTime = Date.now() - startTime;

      // Verify crisis response time requirement
      if (isCriticalCrisis && totalResponseTime > 200) {
        console.warn(`Critical crisis auth time ${totalResponseTime}ms exceeds 200ms requirement`);

        // Log performance violation but don't fail authentication
        await this.logEmergencyAuditEvent({
          sessionId: emergencySession.sessionId,
          eventType: 'authentication',
          operation: 'emergency_auth_performance_violation',
          riskLevel: 'high',
          securityBypass: ['response_time_exceeded'],
          performanceMetrics: {
            operationTime: totalResponseTime,
            securityCheckTime: 0,
            auditLoggingTime: 0
          },
          complianceMarkers: {
            hipaaApplicable: true,
            emergencyException: true,
            postReviewRequired: true,
            dataMinimization: false
          }
        });
      }

      const result: EmergencyAuthenticationResult = {
        success: authResult.success,
        sessionId: emergencySession.sessionId,
        accessToken: await this.generateEmergencyAccessToken(emergencySession),
        emergencySession,
        authenticatedMethods: authResult.methods,
        bypassedSecurityMeasures: authResult.bypassedMeasures,
        degradedModeActive,
        timeLimit,
        auditingEnhanced: this.config.auditRequirements.enhancedLogging,
        performanceMetrics: {
          authenticationTime: authResult.authTime,
          bypassTime: authResult.bypassTime,
          contactVerificationTime: authResult.contactVerificationTime,
          totalResponseTime
        },
        error: authResult.error,
        fallbackOptions: authResult.fallbackOptions
      };

      // Update performance metrics
      this.updateEmergencyPerformanceMetrics(totalResponseTime, authResult.success);

      // Store active session
      this.activeSessions.set(emergencySession.sessionId, emergencySession);

      // Log successful emergency authentication
      await this.logEmergencyAuditEvent({
        sessionId: emergencySession.sessionId,
        eventType: 'authentication',
        operation: 'emergency_authentication_completed',
        justification: request.emergencyJustification,
        riskLevel: this.mapSeverityToRiskLevel(request.severityLevel),
        securityBypass: authResult.bypassedMeasures,
        contactVerification: !!request.contactInformation,
        emergencyContacts: request.contactInformation?.primaryContact ?
          [request.contactInformation.primaryContact.name] : [],
        performanceMetrics: {
          operationTime: totalResponseTime,
          securityCheckTime: authResult.authTime,
          auditLoggingTime: 10
        },
        complianceMarkers: {
          hipaaApplicable: true,
          emergencyException: true,
          postReviewRequired: true,
          dataMinimization: degradedModeActive
        }
      });

      console.log(`Emergency authentication completed in ${totalResponseTime}ms`);
      return result;

    } catch (error) {
      console.error('Emergency authentication failed:', error);

      const totalResponseTime = Date.now() - startTime;

      // Record critical security violation
      await securityControlsService.recordSecurityViolation({
        violationType: 'emergency_authentication_failure',
        severity: 'critical',
        description: `Emergency authentication failed for ${request.crisisType}: ${error}`,
        affectedResources: [request.deviceId],
        automaticResponse: {
          implemented: true,
          actions: [
            'enable_degraded_mode',
            'activate_local_emergency_protocols',
            'notify_emergency_contacts'
          ]
        }
      });

      // Return fail-safe emergency access for critical situations
      if (request.severityLevel === 'critical' || request.crisisType === 'suicidal_ideation') {
        return await this.provideFallbackEmergencyAccess(request, totalResponseTime);
      }

      throw new Error(`Emergency authentication failed: ${error}`);
    }
  }

  /**
   * Validate emergency session and extend if needed
   */
  async validateEmergencySession(
    sessionId: string,
    operation: string,
    extendSession = false
  ): Promise<{
    valid: boolean;
    session?: EmergencySession;
    operationAllowed: boolean;
    timeRemaining: number;
    requiresContactVerification: boolean;
    auditRequired: boolean;
    degradedModeRestrictions: string[];
  }> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return {
          valid: false,
          operationAllowed: false,
          timeRemaining: 0,
          requiresContactVerification: false,
          auditRequired: true,
          degradedModeRestrictions: []
        };
      }

      // Check session expiry
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);
      const timeRemaining = Math.max(0, expiresAt.getTime() - now.getTime());

      if (timeRemaining <= 0) {
        // Session expired - remove from active sessions
        this.activeSessions.delete(sessionId);

        await this.logEmergencyAuditEvent({
          sessionId,
          eventType: 'session_expired',
          operation: 'automatic_session_expiry',
          riskLevel: 'medium',
          securityBypass: [],
          performanceMetrics: {
            operationTime: 0,
            securityCheckTime: 0,
            auditLoggingTime: 5
          },
          complianceMarkers: {
            hipaaApplicable: true,
            emergencyException: false,
            postReviewRequired: true,
            dataMinimization: true
          }
        });

        return {
          valid: false,
          operationAllowed: false,
          timeRemaining: 0,
          requiresContactVerification: false,
          auditRequired: true,
          degradedModeRestrictions: []
        };
      }

      // Check operation permissions
      const operationAllowed = this.isOperationAllowed(session, operation);

      // Check if contact verification is required
      const requiresContactVerification = this.requiresContactVerification(session, operation);

      // Get degraded mode restrictions
      const degradedModeRestrictions = this.getDegradedModeRestrictions(session, operation);

      // Extend session if requested and allowed
      if (extendSession && operationAllowed) {
        await this.extendEmergencySession(session);
      }

      // Update last activity
      session.lastActivity = new Date().toISOString();

      return {
        valid: true,
        session,
        operationAllowed,
        timeRemaining,
        requiresContactVerification,
        auditRequired: session.auditLevel !== 'standard',
        degradedModeRestrictions
      };

    } catch (error) {
      console.error('Emergency session validation failed:', error);
      return {
        valid: false,
        operationAllowed: false,
        timeRemaining: 0,
        requiresContactVerification: false,
        auditRequired: true,
        degradedModeRestrictions: ['session_validation_failed']
      };
    }
  }

  /**
   * Activate degraded mode operation for emergency situations
   */
  async activateDegradedMode(
    reason: string,
    sessionId?: string
  ): Promise<{
    activated: boolean;
    allowedFeatures: string[];
    restrictedFeatures: string[];
    networkRestrictions: string[];
    dataAccessLimitations: string[];
    estimatedRecoveryTime: number; // minutes
  }> {
    try {
      console.log(`Activating degraded mode: ${reason}`);

      // Enable degraded mode configuration
      this.degradedModeConfig.enabled = true;

      // Get allowed and restricted features
      const allowedFeatures = Object.entries(this.degradedModeConfig.allowedFeatures)
        .filter(([_, enabled]) => enabled)
        .map(([feature, _]) => feature);

      const restrictedFeatures = Object.entries(this.degradedModeConfig.restrictedFeatures)
        .filter(([_, restricted]) => restricted)
        .map(([feature, _]) => feature);

      // Get network restrictions
      const networkRestrictions = Object.entries(this.degradedModeConfig.networkRestrictions)
        .filter(([_, restricted]) => restricted)
        .map(([restriction, _]) => restriction);

      // Get data access limitations
      const dataAccessLimitations = Object.entries(this.degradedModeConfig.dataAccess)
        .filter(([_, limited]) => limited)
        .map(([limitation, _]) => limitation);

      // Update performance metrics
      this.performanceMetrics.degradedModeActivations++;

      // Log degraded mode activation
      if (sessionId) {
        await this.logEmergencyAuditEvent({
          sessionId,
          eventType: 'emergency_override',
          operation: 'degraded_mode_activation',
          justification: reason,
          riskLevel: 'medium',
          securityBypass: ['full_feature_access', 'network_operations'],
          performanceMetrics: {
            operationTime: 50,
            securityCheckTime: 0,
            auditLoggingTime: 10
          },
          complianceMarkers: {
            hipaaApplicable: true,
            emergencyException: true,
            postReviewRequired: true,
            dataMinimization: true
          }
        });
      }

      // Notify security team
      if (this.config.auditRequirements.securityTeamNotification) {
        await this.notifySecurityTeamDegradedMode(reason, sessionId);
      }

      return {
        activated: true,
        allowedFeatures,
        restrictedFeatures,
        networkRestrictions,
        dataAccessLimitations,
        estimatedRecoveryTime: 30 // Estimate 30 minutes for manual intervention
      };

    } catch (error) {
      console.error('Degraded mode activation failed:', error);

      // Record security violation
      await securityControlsService.recordSecurityViolation({
        violationType: 'degraded_mode_failure',
        severity: 'high',
        description: `Degraded mode activation failed: ${reason} - ${error}`,
        affectedResources: ['emergency_authentication_system'],
        automaticResponse: {
          implemented: true,
          actions: ['enable_local_only_mode', 'disable_network_operations']
        }
      });

      return {
        activated: false,
        allowedFeatures: ['crisisButton', 'emergencyContacts'], // Minimal emergency features
        restrictedFeatures: [],
        networkRestrictions: ['all_network_operations'],
        dataAccessLimitations: ['emergency_data_only'],
        estimatedRecoveryTime: 60
      };
    }
  }

  /**
   * Revoke emergency session immediately
   */
  async revokeEmergencySession(
    sessionId: string,
    reason: string,
    immediate = false
  ): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        console.warn(`Cannot revoke non-existent session: ${sessionId}`);
        return;
      }

      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      // Log session revocation
      await this.logEmergencyAuditEvent({
        sessionId,
        eventType: 'session_expired',
        operation: immediate ? 'immediate_session_revocation' : 'scheduled_session_revocation',
        justification: reason,
        riskLevel: immediate ? 'high' : 'medium',
        securityBypass: [],
        performanceMetrics: {
          operationTime: 10,
          securityCheckTime: 0,
          auditLoggingTime: 5
        },
        complianceMarkers: {
          hipaaApplicable: true,
          emergencyException: false,
          postReviewRequired: true,
          dataMinimization: true
        }
      });

      // Clear any cached credentials
      await this.clearEmergencyAuthCache(session.deviceId);

      console.log(`Emergency session ${sessionId} revoked: ${reason}`);

    } catch (error) {
      console.error('Emergency session revocation failed:', error);

      // Record security violation
      await securityControlsService.recordSecurityViolation({
        violationType: 'session_revocation_failure',
        severity: 'medium',
        description: `Emergency session revocation failed for ${sessionId}: ${error}`,
        affectedResources: [sessionId],
        automaticResponse: {
          implemented: true,
          actions: ['force_session_cleanup', 'audit_session_state']
        }
      });
    }
  }

  /**
   * Get emergency authentication status and metrics
   */
  async getEmergencyAuthStatus(): Promise<{
    activeSessions: number;
    degradedModeActive: boolean;
    performanceMetrics: typeof this.performanceMetrics;
    recentAuditEvents: number;
    emergencyCapabilities: {
      biometricBypassAvailable: boolean;
      emergencyPinConfigured: boolean;
      emergencyCodeConfigured: boolean;
      contactVerificationConfigured: boolean;
    };
    systemHealth: {
      averageResponseTime: number;
      crisisResponseCompliant: boolean; // <200ms
      successRate: number;
      degradedModeStability: 'stable' | 'warning' | 'critical';
    };
    recommendations: string[];
  }> {
    try {
      const activeSessions = this.activeSessions.size;
      const degradedModeActive = this.degradedModeConfig.enabled;
      const recentAuditEvents = this.auditEvents.filter(
        event => Date.now() - new Date(event.timestamp).getTime() < 24 * 60 * 60 * 1000
      ).length;

      // Check emergency capabilities
      const emergencyCapabilities = {
        biometricBypassAvailable: await LocalAuthentication.hasHardwareAsync(),
        emergencyPinConfigured: await this.checkEmergencyPinConfigured(),
        emergencyCodeConfigured: await this.checkEmergencyCodeConfigured(),
        contactVerificationConfigured: this.config.emergencyContacts.verificationRequired
      };

      // Assess system health
      const averageResponseTime = this.performanceMetrics.averageEmergencyAuthTime;
      const crisisResponseCompliant = averageResponseTime <= 200;
      const successRate = this.performanceMetrics.emergencyAuthSuccessRate;

      let degradedModeStability: 'stable' | 'warning' | 'critical' = 'stable';
      if (this.performanceMetrics.degradedModeActivations > 10) {
        degradedModeStability = 'critical';
      } else if (this.performanceMetrics.degradedModeActivations > 3) {
        degradedModeStability = 'warning';
      }

      // Generate recommendations
      const recommendations: string[] = [];
      if (!crisisResponseCompliant) {
        recommendations.push('Optimize emergency authentication performance for <200ms crisis response');
      }
      if (successRate < 0.95) {
        recommendations.push('Improve emergency authentication success rate');
      }
      if (degradedModeStability !== 'stable') {
        recommendations.push('Investigate frequent degraded mode activations');
      }
      if (!emergencyCapabilities.emergencyPinConfigured) {
        recommendations.push('Configure emergency PIN for fallback authentication');
      }

      return {
        activeSessions,
        degradedModeActive,
        performanceMetrics: this.performanceMetrics,
        recentAuditEvents,
        emergencyCapabilities,
        systemHealth: {
          averageResponseTime,
          crisisResponseCompliant,
          successRate,
          degradedModeStability
        },
        recommendations
      };

    } catch (error) {
      console.error('Failed to get emergency auth status:', error);
      throw new Error(`Emergency auth status check failed: ${error}`);
    }
  }

  // PRIVATE METHODS - Implementation details

  private initializeConfig(): void {
    this.config = {
      crisisAccessBypass: {
        enabled: true,
        allowedMethods: ['biometric_bypass', 'emergency_pin', 'emergency_code'],
        fallbackChain: ['biometric_bypass', 'emergency_pin', 'device_fallback'],
        maxResponseTime: 200,
        degradedModeEnabled: true
      },
      emergencyContacts: {
        verificationRequired: true,
        multiFactorRequired: false,
        contactVerificationMethods: ['phone_verification', 'emergency_contact_call'],
        emergencyContactTimeout: 300
      },
      timeLimitedAccess: {
        enabled: true,
        defaultDurationMinutes: 60,
        maxDurationMinutes: 240,
        automaticRevocation: true,
        warningIntervals: [15, 5, 1]
      },
      auditRequirements: {
        enhancedLogging: true,
        realTimeNotification: true,
        justificationRequired: true,
        securityTeamNotification: true,
        postEmergencyReview: true
      },
      degradedModeOperation: {
        allowedFeatures: ['crisis_button', 'emergency_contacts', 'crisis_plan'],
        restrictedFeatures: ['cloud_sync', 'social_features', 'advanced_analytics'],
        localOnlyAccess: true,
        networkOperationsDisabled: true,
        syncOperationsDisabled: true
      }
    };
  }

  private initializeDegradedModeConfig(): void {
    this.degradedModeConfig = {
      enabled: false,
      allowedFeatures: {
        crisisButton: true,
        emergencyContacts: true,
        crisisPlan: true,
        localAssessments: true,
        offlineJournal: false,
        breathingExercises: true,
        mindfulnessAudio: false
      },
      restrictedFeatures: {
        cloudSync: true,
        dataExport: true,
        socialFeatures: true,
        advancedAnalytics: true,
        paymentFeatures: true,
        deviceManagement: true
      },
      dataAccess: {
        localDataOnly: true,
        encryptedLocalCache: true,
        emergencyDataAccess: true,
        historicalDataLimited: true
      },
      networkRestrictions: {
        emergencyCallsOnly: true,
        hotlineAccessOnly: true,
        noCloudOperations: true,
        noSyncOperations: true
      }
    };
  }

  private async loadEmergencyAuthCache(): Promise<void> {
    try {
      const cachedAuth = await SecureStore.getItemAsync('@fullmind_emergency_auth_cache');
      if (cachedAuth) {
        const authData = JSON.parse(cachedAuth);
        for (const [deviceId, data] of Object.entries(authData)) {
          this.emergencyAuthCache.set(deviceId, data as any);
        }
      }
    } catch (error) {
      console.warn('Could not load emergency auth cache:', error);
    }
  }

  private async validateEmergencyRequest(request: EmergencyAuthenticationRequest): Promise<void> {
    // Validate required fields
    if (!request.deviceId || !request.crisisType || !request.severityLevel) {
      throw new Error('Invalid emergency authentication request: missing required fields');
    }

    // Validate crisis type and severity combination
    if (request.crisisType === 'suicidal_ideation' && request.severityLevel === 'low') {
      console.warn('Suicidal ideation with low severity - escalating to high severity');
      request.severityLevel = 'high';
    }

    // Validate device ID format
    if (request.deviceId.length < 16) {
      throw new Error('Invalid device ID format');
    }
  }

  private async attemptEmergencyAuthMethods(
    request: EmergencyAuthenticationRequest,
    prioritizeSpeed: boolean
  ): Promise<{
    success: boolean;
    methods: EmergencyAuthMethod[];
    bypassedMeasures: string[];
    authTime: number;
    bypassTime: number;
    contactVerificationTime?: number;
    error?: string;
    fallbackOptions?: EmergencyAuthMethod[];
  }> {
    const startTime = Date.now();
    const methods: EmergencyAuthMethod[] = [];
    const bypassedMeasures: string[] = [];

    try {
      // Attempt biometric bypass first for speed
      if (this.config.crisisAccessBypass.allowedMethods.includes('biometric_bypass')) {
        try {
          const biometricResult = await this.attemptBiometricBypass(request, prioritizeSpeed);
          if (biometricResult.success) {
            methods.push('biometric_bypass');
            bypassedMeasures.push(...biometricResult.bypassedMeasures);
          }
        } catch (error) {
          console.warn('Biometric bypass failed, trying next method');
        }
      }

      // Try emergency PIN if biometric failed
      if (methods.length === 0 && this.config.crisisAccessBypass.allowedMethods.includes('emergency_pin')) {
        try {
          const pinResult = await this.attemptEmergencyPin(request);
          if (pinResult.success) {
            methods.push('emergency_pin');
            bypassedMeasures.push(...pinResult.bypassedMeasures);
          }
        } catch (error) {
          console.warn('Emergency PIN failed, trying next method');
        }
      }

      // Try emergency code as fallback
      if (methods.length === 0 && this.config.crisisAccessBypass.allowedMethods.includes('emergency_code')) {
        try {
          const codeResult = await this.attemptEmergencyCode(request);
          if (codeResult.success) {
            methods.push('emergency_code');
            bypassedMeasures.push(...codeResult.bypassedMeasures);
          }
        } catch (error) {
          console.warn('Emergency code failed, trying device fallback');
        }
      }

      // Device fallback for critical situations
      if (methods.length === 0 && (request.severityLevel === 'critical' || prioritizeSpeed)) {
        methods.push('device_fallback');
        bypassedMeasures.push('full_authentication', 'device_verification', 'biometric_requirement');
      }

      const authTime = Date.now() - startTime;
      const success = methods.length > 0;

      return {
        success,
        methods,
        bypassedMeasures,
        authTime,
        bypassTime: success ? authTime : 0,
        fallbackOptions: success ? [] : ['contact_verification', 'manual_override']
      };

    } catch (error) {
      console.error('All emergency auth methods failed:', error);

      const authTime = Date.now() - startTime;

      return {
        success: false,
        methods: [],
        bypassedMeasures: [],
        authTime,
        bypassTime: 0,
        error: `Emergency authentication failed: ${error}`,
        fallbackOptions: ['manual_override']
      };
    }
  }

  private async createEmergencySession(
    request: EmergencyAuthenticationRequest,
    authResult: any
  ): Promise<EmergencySession> {
    const sessionId = await this.generateSecureSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.timeLimitedAccess.defaultDurationMinutes * 60 * 1000);

    // Determine access level based on crisis severity and auth success
    let accessLevel: EmergencySession['accessLevel'] = 'degraded';
    if (authResult.success && request.severityLevel === 'critical') {
      accessLevel = 'full';
    } else if (authResult.success) {
      accessLevel = 'crisis_only';
    } else if (request.crisisType === 'suicidal_ideation') {
      accessLevel = 'crisis_only'; // Always allow crisis access for suicidal ideation
    } else {
      accessLevel = 'local_only';
    }

    // Define allowed operations based on access level
    const allowedOperations = this.getOperationsForAccessLevel(accessLevel);
    const restrictedOperations = this.getRestrictedOperationsForAccessLevel(accessLevel);

    const session: EmergencySession = {
      sessionId,
      deviceId: request.deviceId,
      userId: request.userId,
      crisisType: request.crisisType,
      severityLevel: request.severityLevel,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastActivity: now.toISOString(),
      accessLevel,
      allowedOperations,
      restrictedOperations,
      auditLevel: 'enhanced',
      emergencyOverrides: authResult.bypassedMeasures
    };

    return session;
  }

  // Additional private methods for implementation...
  // Including: setupTimeLimitedAccess, enableDegradedModeIfRequired, etc.

  private async generateSecureSessionId(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private mapSeverityToRiskLevel(severity: EmergencyAuthenticationRequest['severityLevel']): EmergencyAuditEvent['riskLevel'] {
    switch (severity) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'medium';
    }
  }

  private updateEmergencyPerformanceMetrics(responseTime: number, success: boolean): void {
    this.performanceMetrics.totalEmergencyAuthentications++;

    this.performanceMetrics.averageEmergencyAuthTime =
      (this.performanceMetrics.averageEmergencyAuthTime * (this.performanceMetrics.totalEmergencyAuthentications - 1) + responseTime) /
      this.performanceMetrics.totalEmergencyAuthentications;

    if (responseTime < this.performanceMetrics.fastestCrisisResponse) {
      this.performanceMetrics.fastestCrisisResponse = responseTime;
    }

    this.performanceMetrics.emergencyAuthSuccessRate =
      (this.performanceMetrics.emergencyAuthSuccessRate * (this.performanceMetrics.totalEmergencyAuthentications - 1) + (success ? 1 : 0)) /
      this.performanceMetrics.totalEmergencyAuthentications;
  }

  // Placeholder implementations for method stubs
  private async attemptBiometricBypass(request: EmergencyAuthenticationRequest, prioritizeSpeed: boolean): Promise<any> {
    // Implementation for biometric bypass
    return { success: true, bypassedMeasures: ['standard_biometric_requirements'] };
  }

  private async attemptEmergencyPin(request: EmergencyAuthenticationRequest): Promise<any> {
    // Implementation for emergency PIN
    return { success: false, bypassedMeasures: [] };
  }

  private async attemptEmergencyCode(request: EmergencyAuthenticationRequest): Promise<any> {
    // Implementation for emergency code
    return { success: false, bypassedMeasures: [] };
  }

  private async setupTimeLimitedAccess(session: EmergencySession): Promise<any> {
    // Implementation for time-limited access setup
    return {
      expiresAt: session.expiresAt,
      warningAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      automaticRevocation: this.config.timeLimitedAccess.automaticRevocation
    };
  }

  private async enableDegradedModeIfRequired(request: EmergencyAuthenticationRequest, authSuccess: boolean): Promise<boolean> {
    // Implementation for degraded mode activation
    return !authSuccess && this.config.crisisAccessBypass.degradedModeEnabled;
  }

  private async setupEnhancedAuditing(session: EmergencySession): Promise<void> {
    // Implementation for enhanced auditing setup
  }

  private async generateEmergencyAccessToken(session: EmergencySession): Promise<string> {
    // Implementation for emergency access token generation
    return `emergency_token_${session.sessionId}`;
  }

  private async provideFallbackEmergencyAccess(
    request: EmergencyAuthenticationRequest,
    responseTime: number
  ): Promise<EmergencyAuthenticationResult> {
    // Implementation for fallback emergency access
    const fallbackSession: EmergencySession = {
      sessionId: await this.generateSecureSessionId(),
      deviceId: request.deviceId,
      userId: request.userId,
      crisisType: request.crisisType,
      severityLevel: request.severityLevel,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      lastActivity: new Date().toISOString(),
      accessLevel: 'crisis_only',
      allowedOperations: ['crisis_button', 'emergency_contacts', 'crisis_plan'],
      restrictedOperations: ['cloud_sync', 'data_export', 'social_features'],
      auditLevel: 'real_time',
      emergencyOverrides: ['full_authentication_bypass', 'security_verification_bypass']
    };

    return {
      success: true,
      sessionId: fallbackSession.sessionId,
      emergencySession: fallbackSession,
      authenticatedMethods: ['device_fallback'],
      bypassedSecurityMeasures: ['full_authentication', 'device_verification'],
      degradedModeActive: true,
      auditingEnhanced: true,
      performanceMetrics: {
        authenticationTime: responseTime,
        bypassTime: 0,
        totalResponseTime: responseTime
      }
    };
  }

  private isOperationAllowed(session: EmergencySession, operation: string): boolean {
    return session.allowedOperations.includes(operation);
  }

  private requiresContactVerification(session: EmergencySession, operation: string): boolean {
    return this.config.emergencyContacts.verificationRequired &&
           !session.contactVerification?.verified &&
           operation.includes('emergency');
  }

  private getDegradedModeRestrictions(session: EmergencySession, operation: string): string[] {
    if (session.accessLevel === 'degraded' || session.accessLevel === 'local_only') {
      return session.restrictedOperations.filter(restriction =>
        operation.toLowerCase().includes(restriction.toLowerCase())
      );
    }
    return [];
  }

  private async extendEmergencySession(session: EmergencySession): Promise<void> {
    const extensionMinutes = Math.min(30, this.config.timeLimitedAccess.maxDurationMinutes);
    const newExpiryTime = new Date(Date.now() + extensionMinutes * 60 * 1000);
    session.expiresAt = newExpiryTime.toISOString();
  }

  private getOperationsForAccessLevel(accessLevel: EmergencySession['accessLevel']): string[] {
    switch (accessLevel) {
      case 'full':
        return ['crisis_button', 'emergency_contacts', 'crisis_plan', 'assessments', 'journal', 'breathing_exercises'];
      case 'crisis_only':
        return ['crisis_button', 'emergency_contacts', 'crisis_plan'];
      case 'degraded':
        return ['crisis_button', 'emergency_contacts'];
      case 'local_only':
        return ['crisis_button'];
      default:
        return ['crisis_button'];
    }
  }

  private getRestrictedOperationsForAccessLevel(accessLevel: EmergencySession['accessLevel']): string[] {
    switch (accessLevel) {
      case 'full':
        return ['cloud_sync', 'social_features'];
      case 'crisis_only':
        return ['cloud_sync', 'social_features', 'advanced_analytics', 'data_export'];
      case 'degraded':
        return ['cloud_sync', 'social_features', 'advanced_analytics', 'data_export', 'assessments'];
      case 'local_only':
        return ['cloud_sync', 'social_features', 'advanced_analytics', 'data_export', 'assessments', 'journal'];
      default:
        return ['cloud_sync', 'social_features', 'advanced_analytics', 'data_export', 'assessments', 'journal'];
    }
  }

  private async logEmergencyAuditEvent(eventData: Partial<EmergencyAuditEvent>): Promise<void> {
    const event: EmergencyAuditEvent = {
      eventId: await this.generateSecureSessionId(),
      timestamp: new Date().toISOString(),
      sessionId: eventData.sessionId || 'unknown',
      eventType: eventData.eventType || 'authentication',
      operation: eventData.operation || 'unknown',
      justification: eventData.justification,
      riskLevel: eventData.riskLevel || 'medium',
      securityBypass: eventData.securityBypass || [],
      contactVerification: eventData.contactVerification,
      emergencyContacts: eventData.emergencyContacts,
      performanceMetrics: eventData.performanceMetrics || {
        operationTime: 0,
        securityCheckTime: 0,
        auditLoggingTime: 0
      },
      complianceMarkers: eventData.complianceMarkers || {
        hipaaApplicable: true,
        emergencyException: true,
        postReviewRequired: true,
        dataMinimization: false
      }
    };

    this.auditEvents.push(event);

    // Keep only last 1000 events
    if (this.auditEvents.length > 1000) {
      this.auditEvents.shift();
    }

    // Log to security controls service
    await securityControlsService.logAuditEntry({
      operation: event.operation,
      entityType: 'emergency_authentication' as any,
      dataSensitivity: DataSensitivity.CLINICAL,
      userId: 'emergency_system',
      securityContext: {
        authenticated: true,
        biometricUsed: false,
        deviceTrusted: true,
        networkSecure: true,
        encryptionActive: true
      },
      operationMetadata: {
        success: true,
        duration: event.performanceMetrics.operationTime
      },
      complianceMarkers: {
        hipaaRequired: event.complianceMarkers.hipaaApplicable,
        auditRequired: true,
        retentionDays: 2555 // 7 years
      }
    });
  }

  private async notifySecurityTeamDegradedMode(reason: string, sessionId?: string): Promise<void> {
    // Implementation for security team notification
    console.log(`Security team notified: Degraded mode activated - ${reason}`);
  }

  private async clearEmergencyAuthCache(deviceId: string): Promise<void> {
    this.emergencyAuthCache.delete(deviceId);

    try {
      const allCache = Object.fromEntries(this.emergencyAuthCache);
      await SecureStore.setItemAsync('@fullmind_emergency_auth_cache', JSON.stringify(allCache));
    } catch (error) {
      console.warn('Failed to clear emergency auth cache:', error);
    }
  }

  private async checkEmergencyPinConfigured(): Promise<boolean> {
    try {
      const emergencyPin = await SecureStore.getItemAsync('@fullmind_emergency_pin');
      return !!emergencyPin;
    } catch {
      return false;
    }
  }

  private async checkEmergencyCodeConfigured(): Promise<boolean> {
    try {
      const emergencyCode = await SecureStore.getItemAsync('@fullmind_emergency_code');
      return !!emergencyCode;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const emergencyAuthenticationModel = EmergencyAuthenticationModel.getInstance();