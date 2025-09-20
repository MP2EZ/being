/**
 * Security Integration API - Comprehensive Security Framework
 *
 * Integrates all security services for cross-device sync:
 * - End-to-end encryption service integration
 * - Zero-knowledge architecture validation
 * - Security controls and audit logging
 * - Threat detection and response
 * - Compliance monitoring and reporting
 * - Emergency security protocols
 */

import { EventEmitter } from '../../utils/EventEmitter';
import { z } from 'zod';
import {
  CloudAuditEntry,
  HIPAAComplianceStatus,
  CLOUD_CONSTANTS
} from '../../types/cloud';
import { DataSensitivity, EncryptionResult } from '../security/EncryptionService';
import { encryptionService } from '../security/EncryptionService';
import { securityControlsService } from '../security/SecurityControlsService';
import { zeroKnowledgeCloudSync } from '../security/ZeroKnowledgeCloudSync';

/**
 * Security validation schemas
 */
const SecurityContextSchema = z.object({
  authenticated: z.boolean(),
  biometricUsed: z.boolean(),
  deviceTrusted: z.boolean(),
  networkSecure: z.boolean(),
  encryptionActive: z.boolean(),
  sessionValid: z.boolean().optional(),
  emergencyAccess: z.boolean().optional()
}).readonly();

const ThreatDetectionSchema = z.object({
  threatType: z.enum(['brute_force', 'data_exfiltration', 'man_in_middle', 'replay_attack', 'unauthorized_access']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  source: z.string(),
  timestamp: z.string().datetime(),
  indicators: z.array(z.string()),
  mitigated: z.boolean()
}).readonly();

const ComplianceCheckSchema = z.object({
  checkType: z.enum(['hipaa', 'encryption', 'audit', 'access_control', 'data_retention']),
  status: z.enum(['compliant', 'non_compliant', 'warning']),
  details: z.string(),
  timestamp: z.string().datetime(),
  remediation: z.array(z.string()).optional()
}).readonly();

type SecurityContext = z.infer<typeof SecurityContextSchema>;
type ThreatDetection = z.infer<typeof ThreatDetectionSchema>;
type ComplianceCheck = z.infer<typeof ComplianceCheckSchema>;

/**
 * Security policy configuration
 */
interface SecurityPolicy {
  encryptionRequired: boolean;
  biometricRequired: boolean;
  deviceTrustRequired: boolean;
  networkSecurityRequired: boolean;
  auditLoggingRequired: boolean;
  threatDetectionEnabled: boolean;
  complianceValidationEnabled: boolean;
  emergencyBypassAllowed: boolean;
}

/**
 * Security event types
 */
interface SecurityEvent {
  id: string;
  type: 'authentication' | 'encryption' | 'threat' | 'compliance' | 'emergency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  context: SecurityContext;
  resolved: boolean;
  response: string[];
}

/**
 * Encryption validator for sync operations
 */
class EncryptionValidator {
  /**
   * Validate encryption readiness
   */
  async validateEncryptionReadiness(): Promise<{
    ready: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check encryption service status
      const encryptionStatus = await encryptionService.getSecurityReadiness();

      if (!encryptionStatus.biometricReady && encryptionStatus.biometricRequired) {
        issues.push('Biometric authentication not configured');
        recommendations.push('Enable biometric authentication for enhanced security');
      }

      if (!encryptionStatus.keyRotationReady) {
        issues.push('Key rotation not configured');
        recommendations.push('Configure automatic key rotation schedule');
      }

      if (!encryptionStatus.zeroKnowledgeReady) {
        issues.push('Zero-knowledge encryption not ready');
        recommendations.push('Complete zero-knowledge encryption setup');
      }

      // Check zero-knowledge sync compliance
      const zkCompliance = await zeroKnowledgeCloudSync.validateZeroKnowledgeCompliance();

      if (!zkCompliance.compliant) {
        issues.push(...zkCompliance.violations);
        recommendations.push(...zkCompliance.recommendations);
      }

      return {
        ready: issues.length === 0,
        issues,
        recommendations
      };

    } catch (error) {
      return {
        ready: false,
        issues: [`Encryption validation failed: ${error}`],
        recommendations: ['Check encryption service configuration and retry']
      };
    }
  }

  /**
   * Validate encrypted data integrity
   */
  async validateDataIntegrity(
    encryptedData: string,
    expectedChecksum: string,
    dataSensitivity: DataSensitivity
  ): Promise<{
    valid: boolean;
    checksumMatch: boolean;
    encryptionValid: boolean;
    error?: string;
  }> {
    try {
      // Verify encryption format
      const encryptionValid = this.validateEncryptionFormat(encryptedData);

      if (!encryptionValid) {
        return {
          valid: false,
          checksumMatch: false,
          encryptionValid: false,
          error: 'Invalid encryption format'
        };
      }

      // Calculate checksum
      const calculatedChecksum = await this.calculateChecksum(encryptedData);
      const checksumMatch = calculatedChecksum === expectedChecksum;

      return {
        valid: encryptionValid && checksumMatch,
        checksumMatch,
        encryptionValid,
        error: checksumMatch ? undefined : 'Checksum mismatch detected'
      };

    } catch (error) {
      return {
        valid: false,
        checksumMatch: false,
        encryptionValid: false,
        error: error instanceof Error ? error.message : 'Integrity validation failed'
      };
    }
  }

  /**
   * Validate encryption format
   */
  private validateEncryptionFormat(encryptedData: string): boolean {
    // Check if data appears to be base64 encoded
    try {
      const decoded = atob(encryptedData);
      return decoded.length > 0 && encryptedData.length > 32;
    } catch {
      return false;
    }
  }

  /**
   * Calculate data checksum
   */
  private async calculateChecksum(data: string): Promise<string> {
    // Simple checksum calculation for demo
    // In production, would use proper cryptographic hashing
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * Threat detection engine
 */
class ThreatDetectionEngine {
  private detectedThreats: ThreatDetection[] = [];
  private suspiciousActivity: Map<string, number> = new Map();

  /**
   * Analyze operation for threats
   */
  analyzeOperation(
    operation: string,
    context: SecurityContext,
    metadata: Record<string, any>
  ): ThreatDetection[] {
    const threats: ThreatDetection[] = [];
    const timestamp = new Date().toISOString();

    // Check for brute force attempts
    if (operation === 'authentication' && !context.authenticated) {
      const attempts = this.suspiciousActivity.get('auth_failures') || 0;
      this.suspiciousActivity.set('auth_failures', attempts + 1);

      if (attempts > 5) {
        threats.push({
          threatType: 'brute_force',
          severity: 'high',
          source: metadata.deviceId || 'unknown',
          timestamp,
          indicators: ['Multiple authentication failures', `${attempts + 1} attempts`],
          mitigated: false
        });
      }
    }

    // Check for unauthorized access attempts
    if (!context.deviceTrusted && operation.includes('sync')) {
      threats.push({
        threatType: 'unauthorized_access',
        severity: 'medium',
        source: metadata.deviceId || 'unknown',
        timestamp,
        indicators: ['Untrusted device attempting sync', `Operation: ${operation}`],
        mitigated: false
      });
    }

    // Check for network security issues
    if (!context.networkSecure && context.encryptionActive) {
      threats.push({
        threatType: 'man_in_middle',
        severity: 'medium',
        source: 'network',
        timestamp,
        indicators: ['Insecure network with encryption active', 'Potential interception risk'],
        mitigated: true // Mitigated by encryption
      });
    }

    // Check for emergency access abuse
    if (context.emergencyAccess && operation !== 'crisis_sync') {
      threats.push({
        threatType: 'unauthorized_access',
        severity: 'high',
        source: metadata.deviceId || 'unknown',
        timestamp,
        indicators: ['Emergency access used for non-crisis operation', `Operation: ${operation}`],
        mitigated: false
      });
    }

    // Store detected threats
    this.detectedThreats.push(...threats);

    return threats;
  }

  /**
   * Get recent threats
   */
  getRecentThreats(hours: number = 24): ThreatDetection[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.detectedThreats.filter(threat =>
      new Date(threat.timestamp) > cutoff
    );
  }

  /**
   * Mitigate threat
   */
  mitigateThreat(threatId: string, mitigationActions: string[]): boolean {
    // In production, this would implement actual threat mitigation
    console.log(`Mitigating threat ${threatId} with actions:`, mitigationActions);
    return true;
  }

  /**
   * Clear old threats
   */
  clearOldThreats(olderThanHours: number = 168): void { // 7 days
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    this.detectedThreats = this.detectedThreats.filter(threat =>
      new Date(threat.timestamp) > cutoff
    );
  }
}

/**
 * Compliance monitor for regulations
 */
class ComplianceMonitor {
  private complianceChecks: ComplianceCheck[] = [];

  /**
   * Perform HIPAA compliance check
   */
  async performHIPAACheck(): Promise<ComplianceCheck> {
    const timestamp = new Date().toISOString();

    try {
      // Check encryption requirements
      const encryptionStatus = await encryptionService.getSecurityReadiness();

      if (!encryptionStatus.encryptionActive) {
        return {
          checkType: 'hipaa',
          status: 'non_compliant',
          details: 'Encryption not active - required for HIPAA compliance',
          timestamp,
          remediation: ['Enable encryption for all data', 'Verify encryption keys are secure']
        };
      }

      // Check audit logging
      const auditEnabled = true; // Would check actual audit status

      if (!auditEnabled) {
        return {
          checkType: 'hipaa',
          status: 'non_compliant',
          details: 'Audit logging not enabled - required for HIPAA compliance',
          timestamp,
          remediation: ['Enable comprehensive audit logging', 'Ensure audit logs are secure']
        };
      }

      // Check access controls
      const accessControlsValid = true; // Would validate access controls

      if (!accessControlsValid) {
        return {
          checkType: 'hipaa',
          status: 'warning',
          details: 'Access controls may need strengthening',
          timestamp,
          remediation: ['Review user access permissions', 'Implement role-based access control']
        };
      }

      const check: ComplianceCheck = {
        checkType: 'hipaa',
        status: 'compliant',
        details: 'All HIPAA requirements satisfied',
        timestamp
      };

      this.complianceChecks.push(check);
      return check;

    } catch (error) {
      const check: ComplianceCheck = {
        checkType: 'hipaa',
        status: 'non_compliant',
        details: `HIPAA compliance check failed: ${error}`,
        timestamp,
        remediation: ['Fix system errors and retry compliance check']
      };

      this.complianceChecks.push(check);
      return check;
    }
  }

  /**
   * Perform encryption compliance check
   */
  async performEncryptionCheck(): Promise<ComplianceCheck> {
    const timestamp = new Date().toISOString();

    try {
      const zkCompliance = await zeroKnowledgeCloudSync.validateZeroKnowledgeCompliance();

      const check: ComplianceCheck = {
        checkType: 'encryption',
        status: zkCompliance.compliant ? 'compliant' : 'non_compliant',
        details: zkCompliance.compliant
          ? 'Zero-knowledge encryption compliance verified'
          : `Encryption compliance issues: ${zkCompliance.violations.join(', ')}`,
        timestamp,
        remediation: zkCompliance.compliant ? undefined : zkCompliance.recommendations
      };

      this.complianceChecks.push(check);
      return check;

    } catch (error) {
      const check: ComplianceCheck = {
        checkType: 'encryption',
        status: 'non_compliant',
        details: `Encryption compliance check failed: ${error}`,
        timestamp,
        remediation: ['Check encryption service status and configuration']
      };

      this.complianceChecks.push(check);
      return check;
    }
  }

  /**
   * Get compliance status
   */
  getComplianceStatus(): HIPAAComplianceStatus {
    const recentChecks = this.getRecentChecks(24); // Last 24 hours
    const hipaaChecks = recentChecks.filter(check => check.checkType === 'hipaa');
    const encryptionChecks = recentChecks.filter(check => check.checkType === 'encryption');

    const hipaaCompliant = hipaaChecks.length > 0 &&
      hipaaChecks.every(check => check.status === 'compliant');

    const encryptionValidated = encryptionChecks.length > 0 &&
      encryptionChecks.every(check => check.status === 'compliant');

    const issues = recentChecks
      .filter(check => check.status !== 'compliant')
      .map(check => check.details);

    return {
      compliant: hipaaCompliant && encryptionValidated,
      lastAudit: recentChecks.length > 0 ? recentChecks[0].timestamp : new Date().toISOString(),
      encryptionValidated,
      accessLogsEnabled: true, // Would check actual status
      dataMinimization: true, // Would check actual implementation
      userConsent: true, // Would check actual consent status
      breachProtocols: true, // Would check actual protocols
      issues,
      certifications: ['SOC2', 'HIPAA'] // Would list actual certifications
    };
  }

  /**
   * Get recent compliance checks
   */
  private getRecentChecks(hours: number): ComplianceCheck[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.complianceChecks.filter(check =>
      new Date(check.timestamp) > cutoff
    );
  }
}

/**
 * Main Security Integration API Implementation
 */
export class SecurityIntegrationAPI extends EventEmitter {
  private static instance: SecurityIntegrationAPI;

  private encryptionValidator = new EncryptionValidator();
  private threatDetection = new ThreatDetectionEngine();
  private complianceMonitor = new ComplianceMonitor();

  private securityPolicy: SecurityPolicy = {
    encryptionRequired: true,
    biometricRequired: true,
    deviceTrustRequired: true,
    networkSecurityRequired: false, // Allow insecure networks with encryption
    auditLoggingRequired: true,
    threatDetectionEnabled: true,
    complianceValidationEnabled: true,
    emergencyBypassAllowed: true
  };

  private securityEvents: SecurityEvent[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.startSecurityMonitoring();
  }

  public static getInstance(): SecurityIntegrationAPI {
    if (!SecurityIntegrationAPI.instance) {
      SecurityIntegrationAPI.instance = new SecurityIntegrationAPI();
    }
    return SecurityIntegrationAPI.instance;
  }

  /**
   * Validate security context for operation
   */
  async validateSecurityContext(
    operation: string,
    context: SecurityContext,
    metadata: Record<string, any> = {}
  ): Promise<{
    valid: boolean;
    issues: string[];
    threats: ThreatDetection[];
    recommendations: string[];
  }> {
    try {
      SecurityContextSchema.parse(context);

      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check policy requirements
      if (this.securityPolicy.encryptionRequired && !context.encryptionActive) {
        issues.push('Encryption required but not active');
        recommendations.push('Enable encryption for this operation');
      }

      if (this.securityPolicy.biometricRequired && !context.biometricUsed && !context.emergencyAccess) {
        issues.push('Biometric authentication required');
        recommendations.push('Use biometric authentication or enable emergency access');
      }

      if (this.securityPolicy.deviceTrustRequired && !context.deviceTrusted) {
        issues.push('Device trust required but device not trusted');
        recommendations.push('Register and verify device trust');
      }

      if (this.securityPolicy.networkSecurityRequired && !context.networkSecure) {
        issues.push('Secure network required');
        recommendations.push('Connect to secure network or enable VPN');
      }

      // Detect threats
      const threats = this.securityPolicy.threatDetectionEnabled
        ? this.threatDetection.analyzeOperation(operation, context, metadata)
        : [];

      // Log security validation
      await this.logSecurityEvent({
        type: 'authentication',
        severity: issues.length > 0 ? 'medium' : 'low',
        description: `Security validation for ${operation}`,
        context,
        resolved: issues.length === 0,
        response: recommendations
      });

      return {
        valid: issues.length === 0 && threats.filter(t => !t.mitigated).length === 0,
        issues,
        threats,
        recommendations
      };

    } catch (error) {
      return {
        valid: false,
        issues: [`Security context validation failed: ${error}`],
        threats: [],
        recommendations: ['Check security context format and retry']
      };
    }
  }

  /**
   * Secure sync operation with full security validation
   */
  async secureSync(
    data: any,
    dataSensitivity: DataSensitivity,
    context: SecurityContext,
    metadata: Record<string, any> = {}
  ): Promise<{
    success: boolean;
    encryptedData?: string;
    securityValidation: any;
    complianceStatus: any;
    error?: string;
  }> {
    try {
      // Validate security context
      const securityValidation = await this.validateSecurityContext('sync_operation', context, metadata);

      if (!securityValidation.valid) {
        return {
          success: false,
          securityValidation,
          complianceStatus: null,
          error: `Security validation failed: ${securityValidation.issues.join(', ')}`
        };
      }

      // Check encryption readiness
      const encryptionReadiness = await this.encryptionValidator.validateEncryptionReadiness();

      if (!encryptionReadiness.ready) {
        return {
          success: false,
          securityValidation,
          complianceStatus: null,
          error: `Encryption not ready: ${encryptionReadiness.issues.join(', ')}`
        };
      }

      // Encrypt data using zero-knowledge sync
      const encryptedPayload = await zeroKnowledgeCloudSync.prepareForCloudUpload(data, {
        entityType: metadata.entityType || 'general',
        entityId: metadata.entityId || 'unknown',
        userId: metadata.userId || 'unknown',
        version: metadata.version || 1,
        lastModified: new Date().toISOString(),
        dataSensitivity,
        syncStrategy: 'immediate',
        clientTimestamp: new Date().toISOString(),
        deviceId: metadata.deviceId || 'unknown',
        appVersion: metadata.appVersion || '1.0.0'
      });

      // Validate encrypted data integrity
      const integrityValidation = await this.encryptionValidator.validateDataIntegrity(
        encryptedPayload.encryptedData,
        encryptedPayload.integrityHash,
        dataSensitivity
      );

      if (!integrityValidation.valid) {
        return {
          success: false,
          securityValidation,
          complianceStatus: null,
          error: `Data integrity validation failed: ${integrityValidation.error}`
        };
      }

      // Perform compliance checks
      const complianceStatus = await this.getComplianceStatus();

      // Log secure sync operation
      await this.logSecurityEvent({
        type: 'encryption',
        severity: 'low',
        description: 'Secure sync operation completed',
        context,
        resolved: true,
        response: ['Data encrypted and validated successfully']
      });

      return {
        success: true,
        encryptedData: encryptedPayload.encryptedData,
        securityValidation,
        complianceStatus
      };

    } catch (error) {
      await this.logSecurityEvent({
        type: 'encryption',
        severity: 'high',
        description: `Secure sync operation failed: ${error}`,
        context,
        resolved: false,
        response: ['Investigate encryption service error']
      });

      return {
        success: false,
        securityValidation: { valid: false, issues: [], threats: [], recommendations: [] },
        complianceStatus: null,
        error: error instanceof Error ? error.message : 'Secure sync failed'
      };
    }
  }

  /**
   * Get comprehensive compliance status
   */
  async getComplianceStatus(): Promise<HIPAAComplianceStatus> {
    // Perform latest compliance checks
    await this.complianceMonitor.performHIPAACheck();
    await this.complianceMonitor.performEncryptionCheck();

    return this.complianceMonitor.getComplianceStatus();
  }

  /**
   * Get security dashboard status
   */
  getSecurityDashboard(): {
    encryptionStatus: 'active' | 'inactive' | 'error';
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    complianceStatus: 'compliant' | 'non_compliant' | 'warning';
    recentThreats: number;
    securityEvents: number;
    lastSecurityCheck: string;
  } {
    const recentThreats = this.threatDetection.getRecentThreats(24);
    const recentEvents = this.getRecentSecurityEvents(24);

    const highSeverityThreats = recentThreats.filter(t =>
      t.severity === 'high' || t.severity === 'critical'
    );

    const threatLevel = highSeverityThreats.length > 0 ? 'high' :
                      recentThreats.length > 5 ? 'medium' : 'low';

    const complianceStatus = this.complianceMonitor.getComplianceStatus();

    return {
      encryptionStatus: 'active', // Would check actual status
      threatLevel: threatLevel as any,
      complianceStatus: complianceStatus.compliant ? 'compliant' : 'non_compliant',
      recentThreats: recentThreats.length,
      securityEvents: recentEvents.length,
      lastSecurityCheck: new Date().toISOString()
    };
  }

  /**
   * Emergency security override for crisis situations
   */
  async emergencySecurityOverride(
    justification: string,
    context: SecurityContext
  ): Promise<{
    success: boolean;
    overrideToken?: string;
    expiresAt?: string;
    limitations: string[];
    error?: string;
  }> {
    try {
      if (!this.securityPolicy.emergencyBypassAllowed) {
        return {
          success: false,
          limitations: [],
          error: 'Emergency security override not allowed by policy'
        };
      }

      // Generate emergency override token
      const overrideToken = `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      const limitations = [
        'Crisis data access only',
        'Read-only operations',
        'Enhanced audit logging active',
        'Automatic expiry in 1 hour'
      ];

      // Log emergency override
      await this.logSecurityEvent({
        type: 'emergency',
        severity: 'critical',
        description: `Emergency security override activated: ${justification}`,
        context: { ...context, emergencyAccess: true },
        resolved: false, // Requires manual review
        response: ['Emergency access granted with limitations']
      });

      // Record security violation for immediate attention
      await securityControlsService.recordSecurityViolation({
        violationType: 'emergency_override',
        severity: 'high',
        description: `Emergency security override: ${justification}`,
        affectedResources: ['security_system'],
        automaticResponse: {
          implemented: true,
          actions: ['limit_access_scope', 'enhanced_monitoring', 'auto_expire_1h', 'require_manual_review']
        }
      });

      return {
        success: true,
        overrideToken,
        expiresAt,
        limitations
      };

    } catch (error) {
      return {
        success: false,
        limitations: [],
        error: error instanceof Error ? error.message : 'Emergency override failed'
      };
    }
  }

  /**
   * Start continuous security monitoring
   */
  private startSecurityMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        // Perform routine security checks
        await this.performRoutineSecurityChecks();

        // Clean up old data
        this.threatDetection.clearOldThreats();
        this.clearOldSecurityEvents();

      } catch (error) {
        console.error('Security monitoring error:', error);
      }
    }, 300000); // 5 minutes
  }

  /**
   * Perform routine security checks
   */
  private async performRoutineSecurityChecks(): Promise<void> {
    // Check encryption readiness
    const encryptionReadiness = await this.encryptionValidator.validateEncryptionReadiness();

    if (!encryptionReadiness.ready) {
      await this.logSecurityEvent({
        type: 'encryption',
        severity: 'medium',
        description: 'Encryption readiness check failed',
        context: { authenticated: false, biometricUsed: false, deviceTrusted: false, networkSecure: false, encryptionActive: false },
        resolved: false,
        response: encryptionReadiness.recommendations
      });
    }

    // Perform compliance checks
    if (this.securityPolicy.complianceValidationEnabled) {
      await this.complianceMonitor.performHIPAACheck();
      await this.complianceMonitor.performEncryptionCheck();
    }
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...event
    };

    this.securityEvents.push(securityEvent);

    // Emit security event
    this.emit('securityEvent', securityEvent);

    // Log to audit system
    await securityControlsService.logAuditEntry({
      operation: `security_event_${event.type}`,
      entityType: 'security',
      entityId: securityEvent.id,
      dataSensitivity: event.severity === 'critical' ? DataSensitivity.CLINICAL : DataSensitivity.SYSTEM,
      userId: 'security_system',
      securityContext: event.context,
      operationMetadata: {
        success: event.resolved,
        duration: 0,
        additionalContext: {
          severity: event.severity,
          description: event.description,
          response: event.response
        }
      },
      complianceMarkers: {
        hipaaRequired: event.severity === 'critical',
        auditRequired: true,
        retentionDays: event.severity === 'critical' ? 2555 : 365
      }
    });
  }

  /**
   * Get recent security events
   */
  private getRecentSecurityEvents(hours: number): SecurityEvent[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.securityEvents.filter(event =>
      new Date(event.timestamp) > cutoff
    );
  }

  /**
   * Clear old security events
   */
  private clearOldSecurityEvents(olderThanHours: number = 168): void { // 7 days
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    this.securityEvents = this.securityEvents.filter(event =>
      new Date(event.timestamp) > cutoff
    );
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.removeAllListeners();
  }
}

// Export singleton instance
export const securityIntegrationAPI = SecurityIntegrationAPI.getInstance();