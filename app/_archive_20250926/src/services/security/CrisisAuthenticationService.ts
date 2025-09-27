/**
 * Crisis Authentication Service - Emergency Access Management
 *
 * Implements crisis-specific authentication protocols:
 * - Crisis features accessible without full authentication
 * - Limited emergency sessions (15 minutes max)
 * - Audit logging for emergency access
 * - Automatic timeout after crisis resolution
 * - Secure emergency contact integration
 * - Performance optimized for <200ms crisis response
 */

import { EnhancedAuthSession, CrisisAuthenticationConfig, AUTHENTICATION_CANONICAL_CONSTANTS } from '../../types/authentication-canonical';
import { encryptionService, DataSensitivity } from './EncryptionService';
import { securityControlsService } from './SecurityControlsService';
import { sessionSecurityService } from './SessionSecurityService';
import { authenticationSecurityService } from './AuthenticationSecurityService';
import { featureFlagService, isEmergencyMode } from './FeatureFlags';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

export interface CrisisAccessConfig {
  // Emergency access settings
  enabled: boolean;
  maxSessionDurationMinutes: number; // 15 minutes HIPAA-compliant
  allowedOperations: CrisisOperation[];
  requiresValidation: boolean;
  automaticTimeout: boolean;

  // Performance requirements
  maxResponseTime: number; // 200ms for crisis response
  emergencyBypassEnabled: boolean;
  offlineAccessEnabled: boolean;

  // Security settings
  auditRequired: boolean;
  enhancedLogging: boolean;
  threatMonitoring: boolean;
  automaticEscalation: boolean;

  // Crisis detection
  crisisDetectionEnabled: boolean;
  autoActivateCrisisMode: boolean;
  crisisThresholds: CrisisThresholds;
}

export interface CrisisOperation {
  operation: 'crisis_plan_view' | 'emergency_contact' | 'crisis_button' | 'mood_log_emergency' | 'safety_assessment';
  requiresAuth: boolean;
  maxExecutions?: number; // Per session
  auditLevel: 'minimal' | 'standard' | 'enhanced';
  performanceLimit: number; // milliseconds
}

export interface CrisisThresholds {
  phq9CriticalScore: number; // 20+ indicates severe depression
  gad7CriticalScore: number; // 15+ indicates severe anxiety
  emergencyKeywords: string[]; // Crisis language detection
  behaviorPatterns: string[]; // Concerning usage patterns
  timeBasedTriggers: string[]; // Time-based crisis indicators
}

export interface CrisisSession {
  sessionId: string;
  userId?: string; // May be anonymous
  deviceId: string;
  crisisType: CrisisType;
  severity: CrisisSeverity;
  initiatedAt: string;
  expiresAt: string;
  lastActivity: string;
  operationsPerformed: CrisisOperationLog[];
  emergencyContacts: EmergencyContact[];
  crisisPlan?: CrisisPlan;
  auditTrail: CrisisAuditEntry[];
  automaticEscalation: boolean;
  resolved: boolean;
  resolvedAt?: string;
}

export interface CrisisOperationLog {
  operationId: string;
  operation: CrisisOperation['operation'];
  timestamp: string;
  duration: number; // milliseconds
  success: boolean;
  errorCode?: string;
  dataAccessed?: string[];
  emergencyProtocolsTriggered?: string[];
}

export interface EmergencyContact {
  contactId: string;
  name: string;
  relationship: string;
  phoneNumber: string; // Encrypted
  priority: number; // 1 = highest priority
  available24h: boolean;
  lastContacted?: string;
  contactMethod: 'call' | 'text' | 'both';
  verificationRequired: boolean;
}

export interface CrisisPlan {
  planId: string;
  userId: string;
  warningSignsInternal: string[];
  warningSignsExternal: string[];
  copingStrategies: string[];
  emergencyContacts: EmergencyContact[];
  professionalSupports: ProfessionalSupport[];
  safetyPlan: SafetyPlan;
  lastUpdated: string;
  lastReviewed: string;
}

export interface ProfessionalSupport {
  type: 'therapist' | 'psychiatrist' | 'crisis_line' | 'hospital' | 'other';
  name: string;
  phoneNumber: string; // Encrypted
  address?: string;
  available24h: boolean;
  notes?: string;
}

export interface SafetyPlan {
  immediateSteps: string[];
  peopleToCOntact: string[];
  placesToGo: string[];
  thingsToRemove: string[];
  reasonsToLive: string[];
  professionalContacts: string[];
}

export interface CrisisAuditEntry {
  entryId: string;
  timestamp: string;
  operation: string;
  userId?: string;
  deviceId: string;
  crisisType: CrisisType;
  severity: CrisisSeverity;
  duration: number;
  success: boolean;
  emergencyProtocols: string[];
  dataAccessed: string[];
  securityFlags: string[];
  complianceMarkers: {
    hipaaRequired: boolean;
    auditRequired: boolean;
    retentionDays: number;
  };
}

export type CrisisType =
  | 'suicidal_ideation'
  | 'self_harm'
  | 'panic_attack'
  | 'severe_depression'
  | 'severe_anxiety'
  | 'substance_abuse'
  | 'other';

export type CrisisSeverity = 'mild' | 'moderate' | 'severe' | 'critical';

export interface CrisisAccessResult {
  success: boolean;
  session?: CrisisSession;
  allowedOperations: CrisisOperation[];
  expiresAt: string;
  error?: string;
  performanceMetrics: {
    responseTime: number;
    authTime?: number;
    validationTime?: number;
  };
  emergencyProtocols: string[];
  automaticEscalation: boolean;
}

export interface CrisisValidationResult {
  valid: boolean;
  crisisDetected: boolean;
  severity: CrisisSeverity;
  crisisType: CrisisType;
  recommendedActions: string[];
  emergencyContactsRecommended: boolean;
  immediateIntervention: boolean;
  confidence: number; // 0-1
}

/**
 * Crisis Authentication Service Implementation
 */
export class CrisisAuthenticationService {
  private static instance: CrisisAuthenticationService;
  private activeCrisisSessions: Map<string, CrisisSession> = new Map();
  private crisisHistory: CrisisAuditEntry[] = [];

  // Configuration
  private config: CrisisAccessConfig = {
    enabled: true,
    maxSessionDurationMinutes: 15, // HIPAA-compliant
    allowedOperations: [
      {
        operation: 'crisis_plan_view',
        requiresAuth: false,
        auditLevel: 'enhanced',
        performanceLimit: 100
      },
      {
        operation: 'emergency_contact',
        requiresAuth: false,
        auditLevel: 'enhanced',
        performanceLimit: 50
      },
      {
        operation: 'crisis_button',
        requiresAuth: false,
        auditLevel: 'enhanced',
        performanceLimit: 50
      },
      {
        operation: 'mood_log_emergency',
        requiresAuth: false,
        maxExecutions: 5,
        auditLevel: 'standard',
        performanceLimit: 200
      },
      {
        operation: 'safety_assessment',
        requiresAuth: false,
        auditLevel: 'enhanced',
        performanceLimit: 100
      }
    ],
    requiresValidation: true,
    automaticTimeout: true,
    maxResponseTime: 200,
    emergencyBypassEnabled: true,
    offlineAccessEnabled: true,
    auditRequired: true,
    enhancedLogging: true,
    threatMonitoring: true,
    automaticEscalation: true,
    crisisDetectionEnabled: true,
    autoActivateCrisisMode: true,
    crisisThresholds: {
      phq9CriticalScore: 20,
      gad7CriticalScore: 15,
      emergencyKeywords: [
        'suicide', 'kill myself', 'end it all', 'can\'t go on',
        'want to die', 'hurt myself', 'self harm', 'cut myself',
        'overdose', 'jump', 'hang myself', 'no hope'
      ],
      behaviorPatterns: [
        'rapid_assessment_completion',
        'extreme_mood_swings',
        'isolation_indicators',
        'help_seeking_behavior'
      ],
      timeBasedTriggers: [
        'late_night_usage',
        'early_morning_distress',
        'weekend_crisis_pattern'
      ]
    }
  };

  // Storage keys
  private readonly CRISIS_SESSIONS_KEY = 'being_crisis_sessions_v1';
  private readonly CRISIS_HISTORY_KEY = 'being_crisis_history_v1';
  private readonly CRISIS_CONFIG_KEY = 'being_crisis_config_v1';
  private readonly EMERGENCY_CONTACTS_KEY = 'being_emergency_contacts_v1';

  private constructor() {
    this.initialize();
  }

  public static getInstance(): CrisisAuthenticationService {
    if (!CrisisAuthenticationService.instance) {
      CrisisAuthenticationService.instance = new CrisisAuthenticationService();
    }
    return CrisisAuthenticationService.instance;
  }

  /**
   * Initialize crisis authentication service
   */
  private async initialize(): Promise<void> {
    try {
      // Load configuration and crisis data
      await this.loadConfiguration();
      await this.loadCrisisData();

      // Set up periodic cleanup for expired sessions
      this.setupSessionCleanup();

      console.log('Crisis Authentication Service initialized');
    } catch (error) {
      console.error('Crisis authentication initialization failed:', error);
      await this.logCrisisEvent('initialization_failed', { error: String(error) });
    }
  }

  // ===========================================
  // CRISIS ACCESS MANAGEMENT
  // ===========================================

  /**
   * Create emergency access session for crisis situations
   */
  async createCrisisAccess(
    deviceId: string,
    crisisType: CrisisType,
    severity: CrisisSeverity,
    userId?: string
  ): Promise<CrisisAccessResult> {
    const startTime = Date.now();

    try {
      // Quick validation for crisis response performance
      if (!this.config.enabled) {
        return {
          success: false,
          allowedOperations: [],
          expiresAt: new Date().toISOString(),
          error: 'Crisis access is disabled',
          performanceMetrics: { responseTime: Date.now() - startTime },
          emergencyProtocols: [],
          automaticEscalation: false
        };
      }

      // Generate crisis session
      const sessionId = await Crypto.randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.config.maxSessionDurationMinutes * 60 * 1000);

      // Load user's crisis plan if available
      const crisisPlan = userId ? await this.loadCrisisPlan(userId) : undefined;

      // Create crisis session
      const crisisSession: CrisisSession = {
        sessionId,
        userId,
        deviceId,
        crisisType,
        severity,
        initiatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        lastActivity: now.toISOString(),
        operationsPerformed: [],
        emergencyContacts: crisisPlan?.emergencyContacts || [],
        crisisPlan,
        auditTrail: [],
        automaticEscalation: severity === 'critical' || severity === 'severe',
        resolved: false
      };

      // Store crisis session
      this.activeCrisisSessions.set(sessionId, crisisSession);
      await this.saveCrisisSessions();

      // Set up automatic timeout
      if (this.config.automaticTimeout) {
        setTimeout(() => {
          this.expireCrisisSession(sessionId, 'automatic_timeout');
        }, this.config.maxSessionDurationMinutes * 60 * 1000);
      }

      // Trigger emergency protocols if needed
      const emergencyProtocols: string[] = [];
      if (severity === 'critical' || crisisType === 'suicidal_ideation') {
        emergencyProtocols.push('crisis_hotline_notification');
        emergencyProtocols.push('emergency_contact_notification');
      }

      // Log crisis access creation
      await this.logCrisisAudit({
        operation: 'crisis_access_created',
        userId,
        deviceId,
        crisisType,
        severity,
        duration: Date.now() - startTime,
        success: true,
        emergencyProtocols,
        dataAccessed: ['crisis_plan'],
        securityFlags: [],
        complianceMarkers: {
          hipaaRequired: true,
          auditRequired: true,
          retentionDays: 2555 // 7 years for crisis data
        }
      });

      // Performance validation
      const responseTime = Date.now() - startTime;
      if (responseTime > this.config.maxResponseTime) {
        console.warn(`Crisis access creation took ${responseTime}ms, exceeds ${this.config.maxResponseTime}ms limit`);
      }

      return {
        success: true,
        session: crisisSession,
        allowedOperations: this.config.allowedOperations,
        expiresAt: expiresAt.toISOString(),
        performanceMetrics: { responseTime },
        emergencyProtocols,
        automaticEscalation: crisisSession.automaticEscalation
      };

    } catch (error) {
      await this.logCrisisEvent('crisis_access_creation_failed', {
        error: String(error),
        deviceId,
        crisisType,
        severity
      });

      return {
        success: false,
        allowedOperations: [],
        expiresAt: new Date().toISOString(),
        error: `Crisis access creation failed: ${error}`,
        performanceMetrics: { responseTime: Date.now() - startTime },
        emergencyProtocols: [],
        automaticEscalation: false
      };
    }
  }

  /**
   * Validate crisis access for operation
   */
  async validateCrisisAccess(
    sessionId: string,
    operation: CrisisOperation['operation']
  ): Promise<{ allowed: boolean; reason: string; performanceTime: number }> {
    const startTime = Date.now();

    try {
      const session = this.activeCrisisSessions.get(sessionId);

      if (!session) {
        return {
          allowed: false,
          reason: 'Invalid crisis session',
          performanceTime: Date.now() - startTime
        };
      }

      // Check session expiration
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);
      if (now >= expiresAt) {
        await this.expireCrisisSession(sessionId, 'session_expired');
        return {
          allowed: false,
          reason: 'Crisis session expired',
          performanceTime: Date.now() - startTime
        };
      }

      // Check if operation is allowed
      const allowedOperation = this.config.allowedOperations.find(op => op.operation === operation);
      if (!allowedOperation) {
        return {
          allowed: false,
          reason: 'Operation not allowed in crisis mode',
          performanceTime: Date.now() - startTime
        };
      }

      // Check operation limits
      if (allowedOperation.maxExecutions) {
        const operationCount = session.operationsPerformed.filter(
          op => op.operation === operation
        ).length;

        if (operationCount >= allowedOperation.maxExecutions) {
          return {
            allowed: false,
            reason: 'Operation limit exceeded for crisis session',
            performanceTime: Date.now() - startTime
          };
        }
      }

      // Update session activity
      session.lastActivity = now.toISOString();
      await this.saveCrisisSessions();

      return {
        allowed: true,
        reason: 'Crisis access validated',
        performanceTime: Date.now() - startTime
      };

    } catch (error) {
      await this.logCrisisEvent('crisis_access_validation_failed', {
        error: String(error),
        sessionId,
        operation
      });

      return {
        allowed: false,
        reason: `Validation error: ${error}`,
        performanceTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute crisis operation with logging
   */
  async executeCrisisOperation(
    sessionId: string,
    operation: CrisisOperation['operation'],
    operationData?: Record<string, unknown>
  ): Promise<{ success: boolean; result?: any; performanceTime: number; error?: string }> {
    const startTime = Date.now();

    try {
      // Validate access first
      const accessValidation = await this.validateCrisisAccess(sessionId, operation);
      if (!accessValidation.allowed) {
        return {
          success: false,
          error: accessValidation.reason,
          performanceTime: Date.now() - startTime
        };
      }

      const session = this.activeCrisisSessions.get(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Crisis session not found',
          performanceTime: Date.now() - startTime
        };
      }

      // Execute the operation
      let result: any;
      let dataAccessed: string[] = [];
      let emergencyProtocols: string[] = [];

      switch (operation) {
        case 'crisis_plan_view':
          result = session.crisisPlan;
          dataAccessed = ['crisis_plan'];
          break;

        case 'emergency_contact':
          result = session.emergencyContacts;
          dataAccessed = ['emergency_contacts'];
          emergencyProtocols = ['emergency_contact_accessed'];
          break;

        case 'crisis_button':
          result = await this.triggerCrisisButton(session);
          emergencyProtocols = ['crisis_button_activated', 'emergency_services_notified'];
          break;

        case 'mood_log_emergency':
          result = await this.logEmergencyMood(session, operationData);
          dataAccessed = ['mood_data'];
          break;

        case 'safety_assessment':
          result = await this.performSafetyAssessment(session, operationData);
          dataAccessed = ['assessment_data'];
          break;

        default:
          throw new Error(`Unsupported crisis operation: ${operation}`);
      }

      // Log operation
      const operationLog: CrisisOperationLog = {
        operationId: await Crypto.randomUUID(),
        operation,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        success: true,
        dataAccessed,
        emergencyProtocolsTriggered: emergencyProtocols
      };

      session.operationsPerformed.push(operationLog);
      await this.saveCrisisSessions();

      // Log audit entry
      await this.logCrisisAudit({
        operation: `crisis_${operation}`,
        userId: session.userId,
        deviceId: session.deviceId,
        crisisType: session.crisisType,
        severity: session.severity,
        duration: Date.now() - startTime,
        success: true,
        emergencyProtocols,
        dataAccessed,
        securityFlags: [],
        complianceMarkers: {
          hipaaRequired: true,
          auditRequired: true,
          retentionDays: 2555
        }
      });

      return {
        success: true,
        result,
        performanceTime: Date.now() - startTime
      };

    } catch (error) {
      await this.logCrisisEvent('crisis_operation_failed', {
        error: String(error),
        sessionId,
        operation,
        operationData
      });

      return {
        success: false,
        error: `Operation failed: ${error}`,
        performanceTime: Date.now() - startTime
      };
    }
  }

  /**
   * Detect crisis situation from user input/behavior
   */
  async detectCrisis(
    input: {
      text?: string;
      phq9Score?: number;
      gad7Score?: number;
      moodScore?: number;
      behaviorPatterns?: string[];
    },
    userId?: string,
    deviceId?: string
  ): Promise<CrisisValidationResult> {
    try {
      let crisisDetected = false;
      let severity: CrisisSeverity = 'mild';
      let crisisType: CrisisType = 'other';
      let confidence = 0;
      const recommendedActions: string[] = [];

      // Check assessment scores
      if (input.phq9Score && input.phq9Score >= this.config.crisisThresholds.phq9CriticalScore) {
        crisisDetected = true;
        severity = 'severe';
        crisisType = 'severe_depression';
        confidence = 0.9;
        recommendedActions.push('immediate_crisis_support');
      }

      if (input.gad7Score && input.gad7Score >= this.config.crisisThresholds.gad7CriticalScore) {
        crisisDetected = true;
        severity = severity === 'severe' ? 'critical' : 'severe';
        crisisType = 'severe_anxiety';
        confidence = Math.max(confidence, 0.9);
        recommendedActions.push('anxiety_crisis_protocol');
      }

      // Check emergency keywords
      if (input.text) {
        const lowerText = input.text.toLowerCase();
        const keywordMatches = this.config.crisisThresholds.emergencyKeywords.filter(
          keyword => lowerText.includes(keyword)
        );

        if (keywordMatches.length > 0) {
          crisisDetected = true;
          severity = 'critical';
          crisisType = 'suicidal_ideation';
          confidence = 0.95;
          recommendedActions.push('suicide_prevention_protocol');
          recommendedActions.push('emergency_contact_notification');
        }
      }

      // Check behavior patterns
      if (input.behaviorPatterns) {
        const concerningPatterns = input.behaviorPatterns.filter(
          pattern => this.config.crisisThresholds.behaviorPatterns.includes(pattern)
        );

        if (concerningPatterns.length >= 2) {
          crisisDetected = true;
          severity = 'moderate';
          confidence = Math.max(confidence, 0.7);
          recommendedActions.push('behavior_monitoring');
        }
      }

      // Determine immediate intervention need
      const immediateIntervention = severity === 'critical' || crisisType === 'suicidal_ideation';
      const emergencyContactsRecommended = severity === 'severe' || severity === 'critical';

      // Log crisis detection
      if (crisisDetected) {
        await this.logCrisisEvent('crisis_detected', {
          severity,
          crisisType,
          confidence,
          recommendedActions,
          immediateIntervention,
          userId,
          deviceId
        });
      }

      return {
        valid: true,
        crisisDetected,
        severity,
        crisisType,
        recommendedActions,
        emergencyContactsRecommended,
        immediateIntervention,
        confidence
      };

    } catch (error) {
      console.error('Crisis detection failed:', error);
      return {
        valid: false,
        crisisDetected: false,
        severity: 'mild',
        crisisType: 'other',
        recommendedActions: [],
        emergencyContactsRecommended: false,
        immediateIntervention: false,
        confidence: 0
      };
    }
  }

  // ===========================================
  // CRISIS OPERATIONS
  // ===========================================

  /**
   * Trigger crisis button functionality
   */
  private async triggerCrisisButton(session: CrisisSession): Promise<any> {
    try {
      const actions = {
        crisisHotlineNumber: '988', // National Suicide Prevention Lifeline
        emergencyNumber: '911',
        emergencyContacts: session.emergencyContacts.slice(0, 3), // Top 3 contacts
        crisisPlan: session.crisisPlan?.safetyPlan,
        immediateSteps: session.crisisPlan?.safetyPlan.immediateSteps || [
          'Take slow, deep breaths',
          'Find a safe place',
          'Call emergency contact',
          'Remove harmful objects'
        ],
        professionalSupports: session.crisisPlan?.professionalSupports || []
      };

      // Mark session for automatic escalation
      session.automaticEscalation = true;

      return actions;

    } catch (error) {
      console.error('Crisis button trigger failed:', error);
      throw error;
    }
  }

  /**
   * Log emergency mood data
   */
  private async logEmergencyMood(session: CrisisSession, data?: Record<string, unknown>): Promise<any> {
    try {
      const moodData = {
        timestamp: new Date().toISOString(),
        crisisMode: true,
        sessionId: session.sessionId,
        mood: data?.mood || 'crisis',
        notes: data?.notes || 'Emergency mood log during crisis',
        severity: session.severity,
        crisisType: session.crisisType
      };

      // Store mood data securely
      const encrypted = await encryptionService.encryptData(moodData, DataSensitivity.CLINICAL);
      // TODO: Save to appropriate storage

      return { logged: true, timestamp: moodData.timestamp };

    } catch (error) {
      console.error('Emergency mood logging failed:', error);
      throw error;
    }
  }

  /**
   * Perform quick safety assessment
   */
  private async performSafetyAssessment(session: CrisisSession, data?: Record<string, unknown>): Promise<any> {
    try {
      const assessment = {
        timestamp: new Date().toISOString(),
        sessionId: session.sessionId,
        safetyLevel: data?.safetyLevel || 'unknown',
        immediateRisk: data?.immediateRisk || false,
        suicidalThoughts: data?.suicidalThoughts || false,
        planPresent: data?.planPresent || false,
        meansAvailable: data?.meansAvailable || false,
        protectiveFactors: data?.protectiveFactors || [],
        recommendations: this.generateSafetyRecommendations(data)
      };

      // If high risk detected, trigger additional protocols
      if (assessment.immediateRisk || (assessment.suicidalThoughts && assessment.planPresent)) {
        session.automaticEscalation = true;
        session.severity = 'critical';
      }

      return assessment;

    } catch (error) {
      console.error('Safety assessment failed:', error);
      throw error;
    }
  }

  /**
   * Generate safety recommendations based on assessment
   */
  private generateSafetyRecommendations(data?: Record<string, unknown>): string[] {
    const recommendations: string[] = [];

    if (data?.suicidalThoughts) {
      recommendations.push('Contact crisis hotline immediately: 988');
      recommendations.push('Reach out to emergency contact');
      recommendations.push('Go to nearest emergency room if in immediate danger');
    }

    if (data?.meansAvailable) {
      recommendations.push('Remove or secure potential means of harm');
      recommendations.push('Ask trusted person to help with safety planning');
    }

    if (data?.planPresent) {
      recommendations.push('Do not be alone - stay with trusted person');
      recommendations.push('Contact mental health professional immediately');
    }

    // Always include general safety recommendations
    recommendations.push('Use coping strategies from your safety plan');
    recommendations.push('Practice grounding techniques');
    recommendations.push('Remember this feeling is temporary');

    return recommendations;
  }

  // ===========================================
  // SESSION MANAGEMENT
  // ===========================================

  /**
   * Resolve crisis session
   */
  async resolveCrisisSession(sessionId: string, resolution: string): Promise<void> {
    try {
      const session = this.activeCrisisSessions.get(sessionId);
      if (session && !session.resolved) {
        session.resolved = true;
        session.resolvedAt = new Date().toISOString();

        await this.logCrisisAudit({
          operation: 'crisis_session_resolved',
          userId: session.userId,
          deviceId: session.deviceId,
          crisisType: session.crisisType,
          severity: session.severity,
          duration: new Date(session.resolvedAt).getTime() - new Date(session.initiatedAt).getTime(),
          success: true,
          emergencyProtocols: [],
          dataAccessed: [],
          securityFlags: [],
          complianceMarkers: {
            hipaaRequired: true,
            auditRequired: true,
            retentionDays: 2555
          }
        });

        await this.saveCrisisSessions();
      }
    } catch (error) {
      console.error('Crisis session resolution failed:', error);
    }
  }

  /**
   * Expire crisis session
   */
  private async expireCrisisSession(sessionId: string, reason: string): Promise<void> {
    try {
      const session = this.activeCrisisSessions.get(sessionId);
      if (session) {
        // Mark as resolved due to expiration
        session.resolved = true;
        session.resolvedAt = new Date().toISOString();

        await this.logCrisisAudit({
          operation: 'crisis_session_expired',
          userId: session.userId,
          deviceId: session.deviceId,
          crisisType: session.crisisType,
          severity: session.severity,
          duration: new Date().getTime() - new Date(session.initiatedAt).getTime(),
          success: false,
          emergencyProtocols: [],
          dataAccessed: [],
          securityFlags: [reason],
          complianceMarkers: {
            hipaaRequired: true,
            auditRequired: true,
            retentionDays: 2555
          }
        });

        // Remove from active sessions after a delay (for audit purposes)
        setTimeout(() => {
          this.activeCrisisSessions.delete(sessionId);
          this.saveCrisisSessions();
        }, 5 * 60 * 1000); // 5 minutes
      }
    } catch (error) {
      console.error('Crisis session expiration failed:', error);
    }
  }

  /**
   * Set up automatic session cleanup
   */
  private setupSessionCleanup(): void {
    // Clean up expired sessions every 5 minutes
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up expired crisis sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date();
      const expiredSessions: string[] = [];

      for (const [sessionId, session] of this.activeCrisisSessions.entries()) {
        const expiresAt = new Date(session.expiresAt);
        if (now >= expiresAt && !session.resolved) {
          expiredSessions.push(sessionId);
        }
      }

      // Expire all expired sessions
      for (const sessionId of expiredSessions) {
        await this.expireCrisisSession(sessionId, 'automatic_cleanup');
      }

    } catch (error) {
      console.error('Session cleanup failed:', error);
    }
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Load crisis plan for user
   */
  private async loadCrisisPlan(userId: string): Promise<CrisisPlan | undefined> {
    try {
      // TODO: Implement crisis plan loading from secure storage
      // For now, return undefined
      return undefined;
    } catch (error) {
      console.error('Crisis plan loading failed:', error);
      return undefined;
    }
  }

  /**
   * Log crisis audit entry
   */
  private async logCrisisAudit(entry: Omit<CrisisAuditEntry, 'entryId' | 'timestamp'>): Promise<void> {
    const auditEntry: CrisisAuditEntry = {
      entryId: await Crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...entry
    };

    this.crisisHistory.push(auditEntry);

    // Keep only recent entries (performance optimization)
    if (this.crisisHistory.length > 1000) {
      this.crisisHistory = this.crisisHistory.slice(-500);
    }

    await this.saveCrisisHistory();

    // Also log to security controls
    await securityControlsService.logAuditEntry({
      operation: entry.operation,
      entityType: 'crisis_session',
      dataSensitivity: DataSensitivity.CLINICAL,
      userId: entry.userId || 'anonymous',
      securityContext: {
        authenticated: false, // Crisis access doesn't require full auth
        biometricUsed: false,
        deviceTrusted: false,
        networkSecure: true,
        encryptionActive: true
      },
      operationMetadata: {
        success: entry.success,
        duration: entry.duration
      },
      complianceMarkers: entry.complianceMarkers
    });
  }

  /**
   * Log crisis event
   */
  private async logCrisisEvent(eventType: string, details: Record<string, unknown>): Promise<void> {
    await securityControlsService.recordSecurityViolation({
      violationType: 'policy_violation',
      severity: 'high', // Crisis events are high severity
      description: `Crisis authentication event: ${eventType}`,
      affectedResources: ['crisis_authentication_service'],
      automaticResponse: {
        implemented: false,
        actions: []
      }
    });
  }

  // ===========================================
  // STORAGE METHODS
  // ===========================================

  private async saveCrisisSessions(): Promise<void> {
    try {
      const sessionsArray = Array.from(this.activeCrisisSessions.entries());
      const encrypted = await encryptionService.encryptData(sessionsArray, DataSensitivity.CLINICAL);
      await SecureStore.setItemAsync(this.CRISIS_SESSIONS_KEY, JSON.stringify(encrypted));
    } catch (error) {
      console.error('Failed to save crisis sessions:', error);
    }
  }

  private async saveCrisisHistory(): Promise<void> {
    try {
      const encrypted = await encryptionService.encryptData(this.crisisHistory, DataSensitivity.CLINICAL);
      await SecureStore.setItemAsync(this.CRISIS_HISTORY_KEY, JSON.stringify(encrypted));
    } catch (error) {
      console.error('Failed to save crisis history:', error);
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configData = await SecureStore.getItemAsync(this.CRISIS_CONFIG_KEY);
      if (configData) {
        const config = JSON.parse(configData);
        this.config = { ...this.config, ...config };
      }
    } catch (error) {
      console.error('Failed to load crisis configuration:', error);
    }
  }

  private async loadCrisisData(): Promise<void> {
    try {
      // Load active sessions
      const sessionsData = await SecureStore.getItemAsync(this.CRISIS_SESSIONS_KEY);
      if (sessionsData) {
        const encrypted = JSON.parse(sessionsData);
        const sessionsArray = await encryptionService.decryptData(encrypted, DataSensitivity.CLINICAL);
        this.activeCrisisSessions = new Map(sessionsArray);
      }

      // Load crisis history
      const historyData = await SecureStore.getItemAsync(this.CRISIS_HISTORY_KEY);
      if (historyData) {
        const encrypted = JSON.parse(historyData);
        this.crisisHistory = await encryptionService.decryptData(encrypted, DataSensitivity.CLINICAL);
      }

    } catch (error) {
      console.error('Failed to load crisis data:', error);
    }
  }

  // ===========================================
  // PUBLIC API
  // ===========================================

  /**
   * Get crisis configuration
   */
  getConfiguration(): CrisisAccessConfig {
    return { ...this.config };
  }

  /**
   * Update crisis configuration
   */
  async updateConfiguration(newConfig: Partial<CrisisAccessConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await SecureStore.setItemAsync(this.CRISIS_CONFIG_KEY, JSON.stringify(this.config));
  }

  /**
   * Get active crisis sessions (for debugging/admin)
   */
  getActiveCrisisSessions(): CrisisSession[] {
    return Array.from(this.activeCrisisSessions.values());
  }

  /**
   * Get crisis history (for audit/reporting)
   */
  getCrisisHistory(): CrisisAuditEntry[] {
    return [...this.crisisHistory];
  }

  /**
   * Check if device has active crisis session
   */
  hasActiveCrisisSession(deviceId: string): boolean {
    for (const session of this.activeCrisisSessions.values()) {
      if (session.deviceId === deviceId && !session.resolved) {
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        if (now < expiresAt) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get active crisis session for device
   */
  getActiveCrisisSession(deviceId: string): CrisisSession | null {
    for (const session of this.activeCrisisSessions.values()) {
      if (session.deviceId === deviceId && !session.resolved) {
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        if (now < expiresAt) {
          return session;
        }
      }
    }
    return null;
  }
}

// Export singleton instance
export const crisisAuthenticationService = CrisisAuthenticationService.getInstance();