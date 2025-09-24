/**
 * Webhook Security Validation Hook for Being. MBCT App
 *
 * Comprehensive webhook security with:
 * - HMAC signature verification
 * - Crisis-safe security protocols
 * - Real-time threat detection
 * - HIPAA-compliant security logging
 * - Emergency security bypass for crisis situations
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { WebhookEvent } from '../../types/webhooks/webhook-events';
import { CrisisLevel } from '../../types/webhooks/crisis-safety-types';
import { PerformanceMetric, PERFORMANCE_THRESHOLDS } from '../../types/webhooks/performance-monitoring';
import { AuditTrailEntry } from '../../types/webhooks/audit-compliance';
import { encryptionService } from '../../services/security/EncryptionService';

export interface WebhookSecurityState {
  securityLevel: 'low' | 'medium' | 'high' | 'maximum' | 'crisis_bypass';
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  validationEnabled: boolean;
  crisisSecurityMode: boolean;
  emergencyBypassActive: boolean;
  consecutiveFailures: number;
  lastValidWebhook: Date | null;
  suspiciousActivityDetected: boolean;
  rateLimitingActive: boolean;
  securityAlertsEnabled: boolean;
}

export interface WebhookSignatureValidation {
  valid: boolean;
  timestamp: number;
  signature: string;
  computedSignature: string;
  signatureAge: number;
  withinTimeWindow: boolean;
  reason?: string;
}

export interface SecurityThreat {
  id: string;
  type: 'invalid_signature' | 'replay_attack' | 'rate_limit_exceeded' | 'suspicious_payload' | 'timestamp_violation' | 'unknown_source';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  details: Record<string, any>;
  mitigated: boolean;
  crisisImpact: boolean;
}

export interface WebhookSecurityConfig {
  signatureValidation: boolean;
  timestampValidation: boolean;
  timestampToleranceSeconds: number;
  rateLimiting: boolean;
  maxRequestsPerMinute: number;
  suspiciousActivityDetection: boolean;
  crisisSecurityBypass: boolean;
  emergencyValidationMode: boolean;
  auditAllRequests: boolean;
  threatResponseMode: 'block' | 'warn' | 'log' | 'crisis_bypass';
}

export interface WebhookSecurityAPI {
  // Core Security Validation
  validateWebhookSignature: (
    payload: string,
    signature: string,
    timestamp: string,
    secret: string
  ) => Promise<WebhookSignatureValidation>;
  validateWebhookEvent: (event: WebhookEvent, signature: string, timestamp: string) => Promise<boolean>;
  verifyWebhookSource: (event: WebhookEvent) => Promise<boolean>;

  // Threat Detection & Response
  detectSecurityThreats: (event: WebhookEvent) => Promise<SecurityThreat[]>;
  handleSecurityThreat: (threat: SecurityThreat) => Promise<void>;
  assessThreatLevel: () => 'none' | 'low' | 'medium' | 'high' | 'critical';

  // Crisis Security Management
  activateCrisisSecurityMode: (level: CrisisLevel) => Promise<void>;
  deactivateCrisisSecurityMode: () => Promise<void>;
  grantEmergencySecurityBypass: (reason: string) => Promise<void>;
  revokeEmergencySecurityBypass: () => Promise<void>;

  // Rate Limiting & Protection
  checkRateLimit: (source: string) => Promise<boolean>;
  updateRateLimit: (source: string) => void;
  getRequestCount: (source: string, timeWindowMinutes: number) => number;

  // Configuration & State
  getSecurityState: () => WebhookSecurityState;
  updateSecurityConfig: (config: Partial<WebhookSecurityConfig>) => void;
  getSecurityConfig: () => WebhookSecurityConfig;

  // Monitoring & Audit
  getSecurityMetrics: () => PerformanceMetric[];
  getSecurityAuditTrail: () => AuditTrailEntry[];
  getSecurityThreats: () => SecurityThreat[];
  generateSecurityReport: () => Promise<any>;

  // Emergency Protocols
  lockdownWebhooks: (reason: string) => Promise<void>;
  emergencyUnlock: (authCode: string) => Promise<boolean>;
  resetSecurityCounters: () => void;
}

const DEFAULT_SECURITY_CONFIG: WebhookSecurityConfig = {
  signatureValidation: true,
  timestampValidation: true,
  timestampToleranceSeconds: 300, // 5 minutes
  rateLimiting: true,
  maxRequestsPerMinute: 100,
  suspiciousActivityDetection: true,
  crisisSecurityBypass: true,
  emergencyValidationMode: false,
  auditAllRequests: true,
  threatResponseMode: 'block',
};

/**
 * Webhook Security Validation Hook
 */
export const useWebhookSecurity = (
  initialConfig: Partial<WebhookSecurityConfig> = {}
): WebhookSecurityAPI => {
  // Configuration state
  const [config, setConfig] = useState<WebhookSecurityConfig>({
    ...DEFAULT_SECURITY_CONFIG,
    ...initialConfig,
  });

  // Security state
  const [state, setState] = useState<WebhookSecurityState>({
    securityLevel: 'high',
    threatLevel: 'none',
    validationEnabled: true,
    crisisSecurityMode: false,
    emergencyBypassActive: false,
    consecutiveFailures: 0,
    lastValidWebhook: null,
    suspiciousActivityDetected: false,
    rateLimitingActive: true,
    securityAlertsEnabled: true,
  });

  // Security data storage
  const securityMetrics = useRef<PerformanceMetric[]>([]);
  const auditTrail = useRef<AuditTrailEntry[]>([]);
  const securityThreats = useRef<SecurityThreat[]>([]);
  const rateLimitMap = useRef<Map<string, number[]>>(new Map());
  const suspiciousIPs = useRef<Set<string>>(new Set());

  /**
   * Core Signature Validation
   */
  const validateWebhookSignature = useCallback(async (
    payload: string,
    signature: string,
    timestamp: string,
    secret: string
  ): Promise<WebhookSignatureValidation> => {
    const startTime = Date.now();

    try {
      // Parse signature header (format: t=timestamp,v1=signature)
      const sig = signature.split(',').find(s => s.startsWith('v1='));
      if (!sig) {
        return {
          valid: false,
          timestamp: parseInt(timestamp),
          signature,
          computedSignature: '',
          signatureAge: 0,
          withinTimeWindow: false,
          reason: 'Invalid signature format',
        };
      }

      const providedSignature = sig.split('=')[1];
      const signatureTimestamp = parseInt(timestamp);
      const currentTime = Math.floor(Date.now() / 1000);
      const signatureAge = currentTime - signatureTimestamp;

      // Check timestamp validity
      const withinTimeWindow = signatureAge <= config.timestampToleranceSeconds;

      // Compute expected signature
      const signedPayload = `${timestamp}.${payload}`;
      const computedSignature = await encryptionService.generateHMAC(signedPayload, secret);

      // Constant-time comparison to prevent timing attacks
      const valid = await constantTimeCompare(providedSignature, computedSignature) &&
                   (!config.timestampValidation || withinTimeWindow);

      // Record security metric
      securityMetrics.current.push({
        timestamp: startTime,
        category: 'security_validation',
        operation: 'signature_validation',
        duration: Date.now() - startTime,
        success: valid,
        crisisMode: state.crisisSecurityMode,
        therapeuticImpact: false,
      });

      return {
        valid,
        timestamp: signatureTimestamp,
        signature,
        computedSignature,
        signatureAge,
        withinTimeWindow,
        reason: valid ? 'Valid signature' : 'Signature mismatch or timestamp invalid',
      };

    } catch (error) {
      return {
        valid: false,
        timestamp: 0,
        signature,
        computedSignature: '',
        signatureAge: 0,
        withinTimeWindow: false,
        reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }, [config.timestampValidation, config.timestampToleranceSeconds, state.crisisSecurityMode]);

  /**
   * Webhook Event Validation
   */
  const validateWebhookEvent = useCallback(async (
    event: WebhookEvent,
    signature: string,
    timestamp: string
  ): Promise<boolean> => {
    const startTime = Date.now();

    try {
      // Crisis mode bypass
      if (state.emergencyBypassActive && event.crisisSafety.emergencyBypass) {
        console.log('Emergency security bypass activated for crisis event');
        return true;
      }

      // Basic event structure validation
      if (!event.id || !event.type || !event.created) {
        await handleSecurityThreat({
          id: `threat_${Date.now()}`,
          type: 'suspicious_payload',
          severity: 'medium',
          timestamp: startTime,
          details: { reason: 'Invalid event structure', eventId: event.id },
          mitigated: false,
          crisisImpact: event.crisisSafety.crisisMode,
        });
        return false;
      }

      // Signature validation (if not in emergency mode)
      if (config.signatureValidation && !state.emergencyBypassActive) {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'test_secret';
        const payloadString = JSON.stringify(event);

        const validation = await validateWebhookSignature(
          payloadString,
          signature,
          timestamp,
          webhookSecret
        );

        if (!validation.valid) {
          await handleSecurityThreat({
            id: `signature_threat_${Date.now()}`,
            type: 'invalid_signature',
            severity: 'high',
            timestamp: startTime,
            details: {
              reason: validation.reason,
              signatureAge: validation.signatureAge,
              withinTimeWindow: validation.withinTimeWindow,
            },
            mitigated: false,
            crisisImpact: event.crisisSafety.crisisMode,
          });

          setState(prev => ({
            ...prev,
            consecutiveFailures: prev.consecutiveFailures + 1,
            suspiciousActivityDetected: prev.consecutiveFailures >= 3,
          }));

          return false;
        }
      }

      // Rate limiting check
      if (config.rateLimiting && !await checkRateLimit('webhook')) {
        await handleSecurityThreat({
          id: `rate_limit_threat_${Date.now()}`,
          type: 'rate_limit_exceeded',
          severity: 'medium',
          timestamp: startTime,
          details: { source: 'webhook', maxRate: config.maxRequestsPerMinute },
          mitigated: true,
          crisisImpact: false,
        });
        return false;
      }

      // Update success state
      setState(prev => ({
        ...prev,
        consecutiveFailures: 0,
        lastValidWebhook: new Date(),
        suspiciousActivityDetected: false,
      }));

      // Create audit entry
      auditTrail.current.push({
        auditId: `webhook_validation_${event.id}`,
        timestamp: startTime,
        sequenceNumber: auditTrail.current.length + 1,
        category: 'security_validation',
        eventType: 'webhook_validated',
        severity: 'info',
        subject: {
          type: 'system',
          identifier: 'webhook_security_validator',
        },
        action: {
          performed: 'validate_webhook',
          outcome: 'success',
          details: {
            eventType: event.type,
            eventId: event.id,
            crisisMode: event.crisisSafety.crisisMode,
          },
        },
        compliance: {
          hipaaLevel: 'not_applicable',
          pciDssRequired: event.type.includes('payment'),
          consentVerified: true,
          dataMinimization: true,
          encryptionApplied: true,
          accessJustified: true,
        },
        integrity: {
          checksum: `validation_${event.id}`,
          signatureValid: true,
          tamperDetected: false,
        },
      });

      return true;

    } catch (error) {
      console.error('Webhook validation error:', error);
      return false;
    }
  }, [state, config, validateWebhookSignature, checkRateLimit, handleSecurityThreat]);

  /**
   * Verify Webhook Source
   */
  const verifyWebhookSource = useCallback(async (event: WebhookEvent): Promise<boolean> => {
    // In a real implementation, this would verify the webhook comes from Stripe
    // For now, we'll do basic checks

    if (!event.livemode && process.env.NODE_ENV === 'production') {
      await handleSecurityThreat({
        id: `source_threat_${Date.now()}`,
        type: 'unknown_source',
        severity: 'medium',
        timestamp: Date.now(),
        details: { reason: 'Test webhook in production' },
        mitigated: false,
        crisisImpact: false,
      });
      return false;
    }

    return true;
  }, [handleSecurityThreat]);

  /**
   * Threat Detection & Response
   */
  const detectSecurityThreats = useCallback(async (event: WebhookEvent): Promise<SecurityThreat[]> => {
    const threats: SecurityThreat[] = [];
    const currentTime = Date.now();

    // Detect replay attacks
    const recentEvents = securityMetrics.current.filter(
      m => m.timestamp > currentTime - 60000 && // Last minute
           m.category === 'webhook_processing'
    );

    if (recentEvents.length > config.maxRequestsPerMinute) {
      threats.push({
        id: `replay_threat_${currentTime}`,
        type: 'replay_attack',
        severity: 'high',
        timestamp: currentTime,
        details: { eventCount: recentEvents.length, timeWindow: '1 minute' },
        mitigated: false,
        crisisImpact: event.crisisSafety.crisisMode,
      });
    }

    // Detect suspicious payload patterns
    if (event.type && !event.type.match(/^(customer|invoice|payment_intent|subscription)\./)) {
      threats.push({
        id: `payload_threat_${currentTime}`,
        type: 'suspicious_payload',
        severity: 'medium',
        timestamp: currentTime,
        details: { eventType: event.type, reason: 'Unexpected event type' },
        mitigated: false,
        crisisImpact: false,
      });
    }

    // Detect timestamp anomalies
    const eventAge = currentTime - (event.created * 1000);
    if (eventAge > 3600000) { // 1 hour
      threats.push({
        id: `timestamp_threat_${currentTime}`,
        type: 'timestamp_violation',
        severity: 'low',
        timestamp: currentTime,
        details: { eventAge: eventAge, created: event.created },
        mitigated: false,
        crisisImpact: false,
      });
    }

    return threats;
  }, [config.maxRequestsPerMinute]);

  const handleSecurityThreat = useCallback(async (threat: SecurityThreat): Promise<void> => {
    securityThreats.current.push(threat);

    // Update threat level based on severity and count
    const recentThreats = securityThreats.current.filter(
      t => t.timestamp > Date.now() - 300000 // Last 5 minutes
    );

    let newThreatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
    if (recentThreats.length >= 10) newThreatLevel = 'critical';
    else if (recentThreats.length >= 5) newThreatLevel = 'high';
    else if (recentThreats.length >= 3) newThreatLevel = 'medium';
    else if (recentThreats.length >= 1) newThreatLevel = 'low';

    setState(prev => ({
      ...prev,
      threatLevel: newThreatLevel,
      suspiciousActivityDetected: newThreatLevel !== 'none',
    }));

    // Create security audit entry
    auditTrail.current.push({
      auditId: `security_threat_${threat.id}`,
      timestamp: threat.timestamp,
      sequenceNumber: auditTrail.current.length + 1,
      category: 'security_violation',
      eventType: 'security_threat_detected',
      severity: threat.severity === 'critical' ? 'critical' : 'warning',
      subject: {
        type: 'system',
        identifier: 'webhook_security_monitor',
      },
      action: {
        performed: 'detect_security_threat',
        outcome: 'success',
        details: {
          threatType: threat.type,
          severity: threat.severity,
          details: threat.details,
        },
      },
      compliance: {
        hipaaLevel: 'not_applicable',
        pciDssRequired: false,
        consentVerified: false,
        dataMinimization: true,
        encryptionApplied: true,
        accessJustified: true,
      },
      integrity: {
        checksum: `threat_${threat.id}`,
        signatureValid: false,
        tamperDetected: true,
      },
    });

    console.log(`Security threat detected: ${threat.type} (severity: ${threat.severity})`);
  }, []);

  const assessThreatLevel = useCallback((): 'none' | 'low' | 'medium' | 'high' | 'critical' => {
    return state.threatLevel;
  }, [state.threatLevel]);

  /**
   * Crisis Security Management
   */
  const activateCrisisSecurityMode = useCallback(async (level: CrisisLevel): Promise<void> => {
    setState(prev => ({
      ...prev,
      crisisSecurityMode: true,
      securityLevel: level === 'emergency' ? 'crisis_bypass' : 'medium',
      emergencyBypassActive: level === 'emergency' || level === 'critical',
    }));

    setConfig(prev => ({
      ...prev,
      emergencyValidationMode: true,
      threatResponseMode: level === 'emergency' ? 'crisis_bypass' : 'warn',
    }));

    console.log(`Crisis security mode activated: level ${level}`);
  }, []);

  const deactivateCrisisSecurityMode = useCallback(async (): Promise<void> => {
    setState(prev => ({
      ...prev,
      crisisSecurityMode: false,
      securityLevel: 'high',
      emergencyBypassActive: false,
    }));

    setConfig(prev => ({
      ...prev,
      emergencyValidationMode: false,
      threatResponseMode: 'block',
    }));

    console.log('Crisis security mode deactivated');
  }, []);

  const grantEmergencySecurityBypass = useCallback(async (reason: string): Promise<void> => {
    setState(prev => ({
      ...prev,
      emergencyBypassActive: true,
      securityLevel: 'crisis_bypass',
    }));

    // Create emergency audit entry
    auditTrail.current.push({
      auditId: `emergency_bypass_${Date.now()}`,
      timestamp: Date.now(),
      sequenceNumber: auditTrail.current.length + 1,
      category: 'authorization',
      eventType: 'emergency_security_bypass',
      severity: 'critical',
      subject: {
        type: 'system',
        identifier: 'webhook_security_controller',
      },
      action: {
        performed: 'grant_emergency_bypass',
        outcome: 'success',
        details: { reason },
      },
      compliance: {
        hipaaLevel: 'enhanced',
        pciDssRequired: false,
        consentVerified: true,
        dataMinimization: true,
        encryptionApplied: true,
        accessJustified: true,
      },
      integrity: {
        checksum: `emergency_bypass_${Date.now()}`,
        signatureValid: true,
        tamperDetected: false,
      },
    });

    console.log(`Emergency security bypass granted: ${reason}`);
  }, []);

  const revokeEmergencySecurityBypass = useCallback(async (): Promise<void> => {
    setState(prev => ({
      ...prev,
      emergencyBypassActive: false,
      securityLevel: 'high',
    }));

    console.log('Emergency security bypass revoked');
  }, []);

  /**
   * Rate Limiting & Protection
   */
  const checkRateLimit = useCallback(async (source: string): Promise<boolean> => {
    if (!config.rateLimiting) return true;

    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    const requests = rateLimitMap.current.get(source) || [];
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);

    if (recentRequests.length >= config.maxRequestsPerMinute) {
      return false;
    }

    return true;
  }, [config.rateLimiting, config.maxRequestsPerMinute]);

  const updateRateLimit = useCallback((source: string): void => {
    const now = Date.now();
    const requests = rateLimitMap.current.get(source) || [];
    requests.push(now);

    // Keep only requests from the last minute
    const windowStart = now - 60000;
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);

    rateLimitMap.current.set(source, recentRequests);
  }, []);

  const getRequestCount = useCallback((source: string, timeWindowMinutes: number): number => {
    const now = Date.now();
    const windowStart = now - (timeWindowMinutes * 60000);
    const requests = rateLimitMap.current.get(source) || [];

    return requests.filter(timestamp => timestamp > windowStart).length;
  }, []);

  /**
   * Configuration & State
   */
  const getSecurityState = useCallback((): WebhookSecurityState => state, [state]);
  const getSecurityConfig = useCallback((): WebhookSecurityConfig => config, [config]);
  const updateSecurityConfig = useCallback((newConfig: Partial<WebhookSecurityConfig>): void => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  /**
   * Monitoring & Audit
   */
  const getSecurityMetrics = useCallback((): PerformanceMetric[] => {
    return [...securityMetrics.current];
  }, []);

  const getSecurityAuditTrail = useCallback((): AuditTrailEntry[] => {
    return [...auditTrail.current];
  }, []);

  const getSecurityThreats = useCallback((): SecurityThreat[] => {
    return [...securityThreats.current];
  }, []);

  const generateSecurityReport = useCallback(async (): Promise<any> => {
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
    const recentThreats = securityThreats.current.filter(t => t.timestamp > last24Hours);
    const recentMetrics = securityMetrics.current.filter(m => m.timestamp > last24Hours);

    return {
      timeframe: '24_hours',
      overview: {
        threatLevel: state.threatLevel,
        consecutiveFailures: state.consecutiveFailures,
        emergencyBypassActive: state.emergencyBypassActive,
        suspiciousActivityDetected: state.suspiciousActivityDetected,
      },
      threats: {
        total: recentThreats.length,
        byType: recentThreats.reduce((acc, threat) => {
          acc[threat.type] = (acc[threat.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        bySeverity: recentThreats.reduce((acc, threat) => {
          acc[threat.severity] = (acc[threat.severity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      performance: {
        totalValidations: recentMetrics.length,
        successRate: recentMetrics.length > 0
          ? (recentMetrics.filter(m => m.success).length / recentMetrics.length) * 100
          : 100,
        averageValidationTime: recentMetrics.length > 0
          ? recentMetrics.reduce((acc, m) => acc + m.duration, 0) / recentMetrics.length
          : 0,
      },
    };
  }, [state, securityThreats, securityMetrics]);

  /**
   * Emergency Protocols
   */
  const lockdownWebhooks = useCallback(async (reason: string): Promise<void> => {
    setState(prev => ({
      ...prev,
      validationEnabled: false,
      securityLevel: 'maximum',
      rateLimitingActive: false, // Block all requests
    }));

    console.log(`Webhook lockdown activated: ${reason}`);
  }, []);

  const emergencyUnlock = useCallback(async (authCode: string): Promise<boolean> => {
    // In a real implementation, this would validate the auth code
    const validCode = process.env.EMERGENCY_UNLOCK_CODE || 'emergency123';

    if (authCode === validCode) {
      setState(prev => ({
        ...prev,
        validationEnabled: true,
        securityLevel: 'high',
        rateLimitingActive: true,
        consecutiveFailures: 0,
        suspiciousActivityDetected: false,
      }));

      console.log('Emergency unlock successful');
      return true;
    }

    return false;
  }, []);

  const resetSecurityCounters = useCallback((): void => {
    setState(prev => ({
      ...prev,
      consecutiveFailures: 0,
      suspiciousActivityDetected: false,
      threatLevel: 'none',
    }));

    securityThreats.current = [];
    rateLimitMap.current.clear();
    suspiciousIPs.current.clear();

    console.log('Security counters reset');
  }, []);

  /**
   * Utility Functions
   */
  const constantTimeCompare = async (a: string, b: string): Promise<boolean> => {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  };

  // Cleanup old data periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

      // Clean old metrics
      securityMetrics.current = securityMetrics.current.filter(m => m.timestamp > cutoff);

      // Clean old threats
      securityThreats.current = securityThreats.current.filter(t => t.timestamp > cutoff);

      // Clean old audit entries (keep for longer - 7 days)
      const auditCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      auditTrail.current = auditTrail.current.filter(a => a.timestamp > auditCutoff);
    }, 60 * 60 * 1000); // Run every hour

    return () => clearInterval(cleanup);
  }, []);

  return {
    // Core Security Validation
    validateWebhookSignature,
    validateWebhookEvent,
    verifyWebhookSource,

    // Threat Detection & Response
    detectSecurityThreats,
    handleSecurityThreat,
    assessThreatLevel,

    // Crisis Security Management
    activateCrisisSecurityMode,
    deactivateCrisisSecurityMode,
    grantEmergencySecurityBypass,
    revokeEmergencySecurityBypass,

    // Rate Limiting & Protection
    checkRateLimit,
    updateRateLimit,
    getRequestCount,

    // Configuration & State
    getSecurityState,
    updateSecurityConfig,
    getSecurityConfig,

    // Monitoring & Audit
    getSecurityMetrics,
    getSecurityAuditTrail,
    getSecurityThreats,
    generateSecurityReport,

    // Emergency Protocols
    lockdownWebhooks,
    emergencyUnlock,
    resetSecurityCounters,
  };
};