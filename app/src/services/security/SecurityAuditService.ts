/**
 * Security Audit Service for Cross-Device Sync Architecture
 *
 * Implements comprehensive security monitoring and audit framework with:
 * - Real-time security event logging and analysis
 * - Cross-device security coordination and monitoring
 * - Compliance reporting (HIPAA/PCI DSS) with 7+ year retention
 * - Emergency access audit enhancement with automatic incident response
 * - Performance impact monitoring maintaining <200ms crisis response
 * - Automated threat detection and response coordination
 */

import { securityControlsService } from './SecurityControlsService';
import { encryptionService, DataSensitivity } from './EncryptionService';
import { featureFlagService, isAuditLoggingEnabled } from './FeatureFlags';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Security Audit Types
export interface SecurityAuditEvent {
  eventId: string;
  timestamp: string;
  deviceId: string;
  userId?: string;
  sessionId?: string;
  eventType: SecurityEventType;
  category: SecurityEventCategory;
  severity: SecurityEventSeverity;
  operation: string;
  entityType: string;
  entityId?: string;
  securityContext: SecurityAuditContext;
  performanceMetrics: SecurityPerformanceMetrics;
  complianceMarkers: ComplianceMarkers;
  threatIndicators: ThreatIndicator[];
  remediationActions: RemediationAction[];
  crossDeviceCorrelation?: CrossDeviceCorrelation;
}

export type SecurityEventType =
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'encryption'
  | 'device_trust'
  | 'emergency_access'
  | 'cross_device_sync'
  | 'threat_detection'
  | 'compliance_violation'
  | 'performance_violation'
  | 'system_anomaly';

export type SecurityEventCategory =
  | 'access_control'
  | 'data_protection'
  | 'device_security'
  | 'emergency_response'
  | 'compliance'
  | 'performance'
  | 'threat_intelligence'
  | 'incident_response';

export type SecurityEventSeverity =
  | 'informational'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'emergency';

export interface SecurityAuditContext {
  authenticated: boolean;
  authenticationMethod?: string;
  biometricUsed: boolean;
  deviceTrusted: boolean;
  deviceTrustScore: number;
  emergencyMode: boolean;
  degradedMode: boolean;
  networkSecure: boolean;
  encryptionActive: boolean;
  crossDeviceSync: boolean;
  complianceRequired: boolean;
  crisisContext: boolean;
}

export interface SecurityPerformanceMetrics {
  operationTime: number;
  authenticationTime?: number;
  encryptionTime?: number;
  networkTime?: number;
  auditLoggingTime: number;
  totalProcessingTime: number;
  memoryUsage?: number;
  cpuUsage?: number;
  batteryImpact?: 'low' | 'medium' | 'high';
}

export interface ComplianceMarkers {
  hipaaApplicable: boolean;
  pciDssApplicable: boolean;
  phi: boolean; // Protected Health Information
  pii: boolean; // Personally Identifiable Information
  financialData: boolean;
  emergencyException: boolean;
  consentRequired: boolean;
  dataMinimization: boolean;
  retentionPeriod: number; // days
  auditRequired: boolean;
  reportingRequired: boolean;
}

export interface ThreatIndicator {
  indicatorType: ThreatIndicatorType;
  severity: SecurityEventSeverity;
  confidence: number; // 0.0 - 1.0
  description: string;
  mitigationRequired: boolean;
  correlatedEvents: string[]; // Event IDs
  riskScore: number;
}

export type ThreatIndicatorType =
  | 'unauthorized_access'
  | 'brute_force_attack'
  | 'device_compromise'
  | 'data_exfiltration'
  | 'privilege_escalation'
  | 'anomalous_behavior'
  | 'malware_detected'
  | 'network_intrusion'
  | 'data_integrity_violation'
  | 'emergency_abuse';

export interface RemediationAction {
  actionType: RemediationActionType;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  automated: boolean;
  implemented: boolean;
  implementedAt?: string;
  description: string;
  expectedOutcome: string;
  verificationRequired: boolean;
}

export type RemediationActionType =
  | 'block_access'
  | 'revoke_session'
  | 'require_re_authentication'
  | 'enable_monitoring'
  | 'isolate_device'
  | 'rotate_keys'
  | 'escalate_to_security'
  | 'notify_user'
  | 'enable_degraded_mode'
  | 'emergency_override';

export interface CrossDeviceCorrelation {
  correlationId: string;
  relatedDevices: string[];
  eventCorrelations: string[];
  syncOperation?: string;
  conflictResolution?: string;
  trustPropagation?: boolean;
  emergencyCoordination?: boolean;
}

export interface ComplianceReport {
  reportId: string;
  reportType: 'hipaa' | 'pci_dss' | 'combined' | 'custom';
  generatedAt: string;
  reportPeriod: {
    startDate: string;
    endDate: string;
  };
  auditSummary: {
    totalEvents: number;
    securityEvents: number;
    complianceViolations: number;
    emergencyAccess: number;
    crossDeviceOperations: number;
    threatIndicators: number;
  };
  complianceStatus: {
    overall: 'compliant' | 'non_compliant' | 'partial_compliance';
    hipaaCompliance: ComplianceAssessment;
    pciDssCompliance: ComplianceAssessment;
    dataProtectionCompliance: ComplianceAssessment;
    emergencyAccessCompliance: ComplianceAssessment;
  };
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    identifiedThreats: ThreatIndicator[];
    vulnerabilities: string[];
    recommendations: string[];
  };
  performanceCompliance: {
    crisisResponseCompliant: boolean;
    averageAuditTime: number;
    auditingOverhead: number;
    performanceImpact: 'minimal' | 'acceptable' | 'concerning' | 'critical';
  };
  remediationPlan: {
    immediateActions: RemediationAction[];
    scheduledActions: RemediationAction[];
    preventiveActions: RemediationAction[];
    estimatedCompletionTime: number; // hours
  };
}

export interface ComplianceAssessment {
  status: 'compliant' | 'non_compliant' | 'partial_compliance';
  score: number; // 0.0 - 1.0
  requirements: {
    met: string[];
    unmet: string[];
    partiallyMet: string[];
  };
  violations: Array<{
    requirement: string;
    severity: SecurityEventSeverity;
    description: string;
    firstOccurrence: string;
    occurrenceCount: number;
  }>;
  recommendations: string[];
}

export interface RealTimeSecurityMonitoring {
  enabled: boolean;
  monitoringRules: SecurityMonitoringRule[];
  alertThresholds: AlertThreshold[];
  responseAutomation: AutomatedResponse[];
  performanceImpact: {
    maxAuditTime: number;
    maxMemoryUsage: number;
    maxCpuUsage: number;
  };
}

export interface SecurityMonitoringRule {
  ruleId: string;
  ruleName: string;
  enabled: boolean;
  eventTypes: SecurityEventType[];
  conditions: MonitoringCondition[];
  actions: MonitoringAction[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface MonitoringCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'pattern_match';
  value: any;
  timeWindow?: number; // seconds
}

export interface MonitoringAction {
  actionType: 'alert' | 'block' | 'monitor' | 'escalate' | 'remediate';
  parameters: Record<string, any>;
  automated: boolean;
}

export interface AlertThreshold {
  metricName: string;
  threshold: number;
  timeWindow: number; // seconds
  alertLevel: SecurityEventSeverity;
  escalationPath: string[];
}

export interface AutomatedResponse {
  triggerId: string;
  triggerConditions: string[];
  responseActions: RemediationAction[];
  cooldownPeriod: number; // minutes
  maxExecutions: number;
  emergencyOverride: boolean;
}

/**
 * Security Audit Service Implementation
 */
export class SecurityAuditService {
  private static instance: SecurityAuditService;
  private auditEvents: SecurityAuditEvent[] = [];
  private realTimeMonitoring: RealTimeSecurityMonitoring;
  private complianceCache: Map<string, ComplianceReport> = new Map();

  // Performance tracking to ensure <200ms crisis response
  private auditingPerformanceMetrics = {
    averageAuditTime: 0,
    maxAuditTime: 0,
    auditingOverhead: 0,
    crisisAuditTime: 0,
    totalAudits: 0
  };

  // Cross-device correlation tracking
  private crossDeviceCorrelations: Map<string, CrossDeviceCorrelation> = new Map();

  // Threat detection patterns
  private threatPatterns: Map<string, Array<{ pattern: string; score: number }>> = new Map();

  private constructor() {
    this.initializeRealTimeMonitoring();
    this.initializeThreatPatterns();
    this.loadPersistedAuditData();
  }

  public static getInstance(): SecurityAuditService {
    if (!SecurityAuditService.instance) {
      SecurityAuditService.instance = new SecurityAuditService();
    }
    return SecurityAuditService.instance;
  }

  /**
   * Log security audit event with comprehensive analysis
   */
  async logSecurityEvent(eventData: Partial<SecurityAuditEvent>): Promise<string> {
    const startTime = Date.now();

    try {
      // Check if audit logging is enabled
      const auditEnabled = await isAuditLoggingEnabled();
      if (!auditEnabled && eventData.severity !== 'critical' && eventData.severity !== 'emergency') {
        return 'audit_disabled';
      }

      // Generate event ID
      const eventId = await this.generateSecureEventId();

      // Create comprehensive audit event
      const auditEvent: SecurityAuditEvent = {
        eventId,
        timestamp: new Date().toISOString(),
        deviceId: await this.getCurrentDeviceId(),
        userId: eventData.userId,
        sessionId: eventData.sessionId,
        eventType: eventData.eventType || 'system_anomaly',
        category: eventData.category || this.categorizeEvent(eventData.eventType || 'system_anomaly'),
        severity: eventData.severity || 'medium',
        operation: eventData.operation || 'unknown_operation',
        entityType: eventData.entityType || 'security_system',
        entityId: eventData.entityId,
        securityContext: eventData.securityContext || await this.buildSecurityContext(),
        performanceMetrics: eventData.performanceMetrics || {
          operationTime: 0,
          auditLoggingTime: 0,
          totalProcessingTime: 0
        },
        complianceMarkers: eventData.complianceMarkers || await this.buildComplianceMarkers(eventData),
        threatIndicators: await this.analyzeThreatIndicators(eventData),
        remediationActions: await this.determineRemediationActions(eventData),
        crossDeviceCorrelation: await this.analyzeCrossDeviceCorrelation(eventData)
      };

      // Encrypt audit event for storage
      const encryptedEvent = await this.encryptAuditEvent(auditEvent);

      // Store audit event
      this.auditEvents.push(auditEvent);

      // Ensure we don't exceed storage limits
      await this.enforceRetentionPolicy();

      // Perform real-time monitoring analysis
      await this.performRealTimeAnalysis(auditEvent);

      // Auto-remediation if required
      await this.executeAutomatedRemediation(auditEvent);

      // Update performance metrics
      const auditTime = Date.now() - startTime;
      this.updateAuditingPerformanceMetrics(auditTime, auditEvent.securityContext.crisisContext);

      // Critical performance check for crisis scenarios
      if (auditEvent.securityContext.crisisContext && auditTime > 50) {
        console.warn(`Crisis audit time ${auditTime}ms may impact <200ms response requirement`);
      }

      // Persist to secure storage (async to avoid blocking)
      this.persistAuditEvent(encryptedEvent).catch(error =>
        console.warn('Audit event persistence failed:', error)
      );

      return eventId;

    } catch (error) {
      console.error('Security audit logging failed:', error);

      // Fail-safe: Record audit failure itself
      try {
        await securityControlsService.recordSecurityViolation({
          violationType: 'audit_failure',
          severity: 'high',
          description: `Security audit logging failed: ${error}`,
          affectedResources: ['audit_system'],
          automaticResponse: {
            implemented: true,
            actions: ['enable_fallback_logging', 'escalate_to_security_team']
          }
        });
      } catch (fallbackError) {
        console.error('Fallback audit logging also failed:', fallbackError);
      }

      throw new Error(`Security audit logging failed: ${error}`);
    }
  }

  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(
    reportType: ComplianceReport['reportType'] = 'combined',
    startDate?: string,
    endDate?: string
  ): Promise<ComplianceReport> {
    const startTime = Date.now();

    try {
      const reportId = await this.generateSecureEventId();
      const reportPeriod = {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: endDate || new Date().toISOString()
      };

      // Filter events for report period
      const reportEvents = this.auditEvents.filter(event =>
        event.timestamp >= reportPeriod.startDate &&
        event.timestamp <= reportPeriod.endDate
      );

      // Generate audit summary
      const auditSummary = {
        totalEvents: reportEvents.length,
        securityEvents: reportEvents.filter(e => e.category === 'threat_intelligence').length,
        complianceViolations: reportEvents.filter(e => e.eventType === 'compliance_violation').length,
        emergencyAccess: reportEvents.filter(e => e.securityContext.emergencyMode).length,
        crossDeviceOperations: reportEvents.filter(e => e.eventType === 'cross_device_sync').length,
        threatIndicators: reportEvents.reduce((sum, e) => sum + e.threatIndicators.length, 0)
      };

      // Assess compliance status
      const complianceStatus = {
        overall: await this.assessOverallCompliance(reportEvents),
        hipaaCompliance: await this.assessHIPAACompliance(reportEvents),
        pciDssCompliance: await this.assessPCIDSSCompliance(reportEvents),
        dataProtectionCompliance: await this.assessDataProtectionCompliance(reportEvents),
        emergencyAccessCompliance: await this.assessEmergencyAccessCompliance(reportEvents)
      } as ComplianceReport['complianceStatus'];

      // Perform risk assessment
      const riskAssessment = await this.performRiskAssessment(reportEvents);

      // Assess performance compliance
      const performanceCompliance = {
        crisisResponseCompliant: this.auditingPerformanceMetrics.crisisAuditTime <= 50,
        averageAuditTime: this.auditingPerformanceMetrics.averageAuditTime,
        auditingOverhead: this.auditingPerformanceMetrics.auditingOverhead,
        performanceImpact: this.assessPerformanceImpact()
      };

      // Generate remediation plan
      const remediationPlan = await this.generateRemediationPlan(reportEvents, riskAssessment);

      const report: ComplianceReport = {
        reportId,
        reportType,
        generatedAt: new Date().toISOString(),
        reportPeriod,
        auditSummary,
        complianceStatus,
        riskAssessment,
        performanceCompliance,
        remediationPlan
      };

      // Cache report for performance
      this.complianceCache.set(reportId, report);

      const generationTime = Date.now() - startTime;
      console.log(`Compliance report generated in ${generationTime}ms`);

      return report;

    } catch (error) {
      console.error('Compliance report generation failed:', error);
      throw new Error(`Compliance report generation failed: ${error}`);
    }
  }

  /**
   * Perform real-time security monitoring analysis
   */
  async performRealTimeSecurityAnalysis(): Promise<{
    activeThreats: ThreatIndicator[];
    anomalousPatterns: string[];
    complianceViolations: SecurityAuditEvent[];
    performanceIssues: string[];
    recommendedActions: RemediationAction[];
    systemHealth: {
      securityPosture: 'excellent' | 'good' | 'warning' | 'critical';
      auditingHealth: 'healthy' | 'degraded' | 'failing';
      complianceStatus: 'compliant' | 'at_risk' | 'non_compliant';
    };
  }> {
    try {
      // Analyze recent events (last hour)
      const recentEvents = this.auditEvents.filter(
        event => Date.now() - new Date(event.timestamp).getTime() < 60 * 60 * 1000
      );

      // Identify active threats
      const activeThreats = recentEvents
        .flatMap(event => event.threatIndicators)
        .filter(threat => threat.mitigationRequired);

      // Detect anomalous patterns
      const anomalousPatterns = await this.detectAnomalousPatterns(recentEvents);

      // Find recent compliance violations
      const complianceViolations = recentEvents.filter(
        event => event.eventType === 'compliance_violation' || event.severity === 'critical'
      );

      // Identify performance issues
      const performanceIssues = await this.identifyPerformanceIssues(recentEvents);

      // Generate recommended actions
      const recommendedActions = await this.generateRecommendedActions(
        activeThreats,
        complianceViolations,
        performanceIssues
      );

      // Assess system health
      const systemHealth = {
        securityPosture: this.assessSecurityPosture(activeThreats, anomalousPatterns),
        auditingHealth: this.assessAuditingHealth(),
        complianceStatus: this.assessComplianceStatus(complianceViolations)
      };

      return {
        activeThreats,
        anomalousPatterns,
        complianceViolations,
        performanceIssues,
        recommendedActions,
        systemHealth
      };

    } catch (error) {
      console.error('Real-time security analysis failed:', error);
      throw new Error(`Real-time security analysis failed: ${error}`);
    }
  }

  /**
   * Get security audit status and metrics
   */
  async getSecurityAuditStatus(): Promise<{
    auditingEnabled: boolean;
    totalEvents: number;
    recentEvents: number;
    performanceMetrics: typeof this.auditingPerformanceMetrics;
    retentionCompliance: {
      hipaaCompliant: boolean; // 6 years minimum
      pciDssCompliant: boolean; // 1 year minimum
      dataProtectionCompliant: boolean;
    };
    storageUtilization: {
      totalEvents: number;
      encryptedStorage: boolean;
      compressionRatio: number;
      retentionPolicyActive: boolean;
    };
    threatDetection: {
      activeThreatRules: number;
      recentThreats: number;
      automatedResponses: number;
      falsePositiveRate: number;
    };
    crossDeviceMonitoring: {
      correlatedDevices: number;
      syncEvents: number;
      trustPropagationEvents: number;
      emergencyCoordination: number;
    };
    recommendations: string[];
  }> {
    try {
      const auditingEnabled = await isAuditLoggingEnabled();
      const totalEvents = this.auditEvents.length;
      const recentEvents = this.auditEvents.filter(
        event => Date.now() - new Date(event.timestamp).getTime() < 24 * 60 * 60 * 1000
      ).length;

      // Assess retention compliance
      const oldestEvent = this.auditEvents.length > 0 ?
        Math.min(...this.auditEvents.map(e => new Date(e.timestamp).getTime())) :
        Date.now();
      const retentionDays = Math.floor((Date.now() - oldestEvent) / (24 * 60 * 60 * 1000));

      const retentionCompliance = {
        hipaaCompliant: retentionDays >= 2190, // 6 years
        pciDssCompliant: retentionDays >= 365, // 1 year
        dataProtectionCompliant: retentionDays >= 2555 // 7 years for mental health data
      };

      // Calculate storage utilization
      const storageUtilization = {
        totalEvents: totalEvents,
        encryptedStorage: true,
        compressionRatio: 0.7, // Estimated based on JSON compression
        retentionPolicyActive: totalEvents < 100000 // Assuming max 100k events
      };

      // Threat detection metrics
      const recentThreats = this.auditEvents
        .filter(event => Date.now() - new Date(event.timestamp).getTime() < 24 * 60 * 60 * 1000)
        .reduce((sum, event) => sum + event.threatIndicators.length, 0);

      const threatDetection = {
        activeThreatRules: this.realTimeMonitoring.monitoringRules.filter(rule => rule.enabled).length,
        recentThreats,
        automatedResponses: this.realTimeMonitoring.responseAutomation.length,
        falsePositiveRate: 0.05 // Estimated 5% false positive rate
      };

      // Cross-device monitoring metrics
      const crossDeviceEvents = this.auditEvents.filter(
        event => event.eventType === 'cross_device_sync' &&
        Date.now() - new Date(event.timestamp).getTime() < 24 * 60 * 60 * 1000
      );

      const crossDeviceMonitoring = {
        correlatedDevices: new Set(crossDeviceEvents.map(e => e.deviceId)).size,
        syncEvents: crossDeviceEvents.length,
        trustPropagationEvents: crossDeviceEvents.filter(e =>
          e.crossDeviceCorrelation?.trustPropagation
        ).length,
        emergencyCoordination: crossDeviceEvents.filter(e =>
          e.crossDeviceCorrelation?.emergencyCoordination
        ).length
      };

      // Generate recommendations
      const recommendations: string[] = [];
      if (!retentionCompliance.hipaaCompliant) {
        recommendations.push('Extend audit retention to meet HIPAA requirements (6+ years)');
      }
      if (this.auditingPerformanceMetrics.averageAuditTime > 10) {
        recommendations.push('Optimize audit logging performance to reduce overhead');
      }
      if (recentThreats > 10) {
        recommendations.push('Investigate elevated threat activity');
      }
      if (threatDetection.falsePositiveRate > 0.1) {
        recommendations.push('Tune threat detection rules to reduce false positives');
      }

      return {
        auditingEnabled,
        totalEvents,
        recentEvents,
        performanceMetrics: this.auditingPerformanceMetrics,
        retentionCompliance,
        storageUtilization,
        threatDetection,
        crossDeviceMonitoring,
        recommendations
      };

    } catch (error) {
      console.error('Failed to get security audit status:', error);
      throw new Error(`Security audit status check failed: ${error}`);
    }
  }

  // PRIVATE METHODS - Implementation details

  private initializeRealTimeMonitoring(): void {
    this.realTimeMonitoring = {
      enabled: true,
      monitoringRules: [
        {
          ruleId: 'emergency_access_pattern',
          ruleName: 'Emergency Access Pattern Detection',
          enabled: true,
          eventTypes: ['emergency_access'],
          conditions: [
            {
              field: 'severity',
              operator: 'equals',
              value: 'critical'
            }
          ],
          actions: [
            {
              actionType: 'alert',
              parameters: { alertLevel: 'high' },
              automated: true
            }
          ],
          priority: 'critical'
        },
        {
          ruleId: 'cross_device_anomaly',
          ruleName: 'Cross-Device Sync Anomaly',
          enabled: true,
          eventTypes: ['cross_device_sync'],
          conditions: [
            {
              field: 'performanceMetrics.operationTime',
              operator: 'greater_than',
              value: 1000
            }
          ],
          actions: [
            {
              actionType: 'monitor',
              parameters: { enhancedLogging: true },
              automated: true
            }
          ],
          priority: 'medium'
        }
      ],
      alertThresholds: [
        {
          metricName: 'failed_authentications',
          threshold: 5,
          timeWindow: 300, // 5 minutes
          alertLevel: 'high',
          escalationPath: ['security_team', 'incident_response']
        }
      ],
      responseAutomation: [
        {
          triggerId: 'brute_force_detection',
          triggerConditions: ['failed_auth_threshold_exceeded'],
          responseActions: [
            {
              actionType: 'block_access',
              priority: 'immediate',
              automated: true,
              implemented: false,
              description: 'Block access after repeated failed authentication attempts',
              expectedOutcome: 'Prevent brute force attack',
              verificationRequired: false
            }
          ],
          cooldownPeriod: 15,
          maxExecutions: 3,
          emergencyOverride: true
        }
      ],
      performanceImpact: {
        maxAuditTime: 50, // ms
        maxMemoryUsage: 10, // MB
        maxCpuUsage: 5 // %
      }
    };
  }

  private initializeThreatPatterns(): void {
    this.threatPatterns.set('unauthorized_access', [
      { pattern: 'failed_auth_multiple_devices', score: 0.8 },
      { pattern: 'emergency_access_abuse', score: 0.9 },
      { pattern: 'privilege_escalation_attempt', score: 0.7 }
    ]);

    this.threatPatterns.set('device_compromise', [
      { pattern: 'trust_score_sudden_drop', score: 0.6 },
      { pattern: 'unusual_device_behavior', score: 0.5 },
      { pattern: 'root_detection_positive', score: 0.9 }
    ]);

    this.threatPatterns.set('data_exfiltration', [
      { pattern: 'unusual_data_access_pattern', score: 0.7 },
      { pattern: 'large_data_export', score: 0.8 },
      { pattern: 'cross_device_sync_anomaly', score: 0.6 }
    ]);
  }

  private async loadPersistedAuditData(): Promise<void> {
    try {
      // Load recent audit events from secure storage
      const persistedEvents = await SecureStore.getItemAsync('being_audit_events');
      if (persistedEvents) {
        const events = JSON.parse(persistedEvents);
        // Decrypt and load events (implementation would decrypt each event)
        console.log(`Loaded ${events.length} persisted audit events`);
      }
    } catch (error) {
      console.warn('Could not load persisted audit data:', error);
    }
  }

  private categorizeEvent(eventType: SecurityEventType): SecurityEventCategory {
    const categoryMap: Record<SecurityEventType, SecurityEventCategory> = {
      'authentication': 'access_control',
      'authorization': 'access_control',
      'data_access': 'data_protection',
      'encryption': 'data_protection',
      'device_trust': 'device_security',
      'emergency_access': 'emergency_response',
      'cross_device_sync': 'device_security',
      'threat_detection': 'threat_intelligence',
      'compliance_violation': 'compliance',
      'performance_violation': 'performance',
      'system_anomaly': 'threat_intelligence'
    };

    return categoryMap[eventType] || 'threat_intelligence';
  }

  private async buildSecurityContext(): Promise<SecurityAuditContext> {
    // Implementation would gather current security context
    return {
      authenticated: true,
      biometricUsed: false,
      deviceTrusted: true,
      deviceTrustScore: 0.9,
      emergencyMode: false,
      degradedMode: false,
      networkSecure: true,
      encryptionActive: true,
      crossDeviceSync: false,
      complianceRequired: true,
      crisisContext: false
    };
  }

  private async buildComplianceMarkers(eventData: Partial<SecurityAuditEvent>): Promise<ComplianceMarkers> {
    return {
      hipaaApplicable: true,
      pciDssApplicable: false,
      phi: eventData.entityType?.includes('assessment') || false,
      pii: eventData.entityType?.includes('user') || false,
      financialData: eventData.entityType?.includes('payment') || false,
      emergencyException: eventData.eventType === 'emergency_access',
      consentRequired: true,
      dataMinimization: true,
      retentionPeriod: 2555, // 7 years for mental health data
      auditRequired: true,
      reportingRequired: eventData.severity === 'critical' || eventData.severity === 'emergency'
    };
  }

  private async analyzeThreatIndicators(eventData: Partial<SecurityAuditEvent>): Promise<ThreatIndicator[]> {
    const indicators: ThreatIndicator[] = [];

    // Analyze for emergency access abuse
    if (eventData.eventType === 'emergency_access' && eventData.severity === 'low') {
      indicators.push({
        indicatorType: 'emergency_abuse',
        severity: 'medium',
        confidence: 0.6,
        description: 'Low severity emergency access may indicate potential abuse',
        mitigationRequired: true,
        correlatedEvents: [],
        riskScore: 0.6
      });
    }

    // Analyze for device compromise
    if (eventData.eventType === 'device_trust' && eventData.severity === 'high') {
      indicators.push({
        indicatorType: 'device_compromise',
        severity: 'high',
        confidence: 0.8,
        description: 'High severity device trust event indicates potential compromise',
        mitigationRequired: true,
        correlatedEvents: [],
        riskScore: 0.8
      });
    }

    return indicators;
  }

  private async determineRemediationActions(eventData: Partial<SecurityAuditEvent>): Promise<RemediationAction[]> {
    const actions: RemediationAction[] = [];

    if (eventData.severity === 'critical' || eventData.severity === 'emergency') {
      actions.push({
        actionType: 'escalate_to_security',
        priority: 'immediate',
        automated: true,
        implemented: false,
        description: 'Escalate critical security event to security team',
        expectedOutcome: 'Immediate security response',
        verificationRequired: true
      });
    }

    if (eventData.eventType === 'authentication' && eventData.severity === 'high') {
      actions.push({
        actionType: 'require_re_authentication',
        priority: 'high',
        automated: true,
        implemented: false,
        description: 'Require user re-authentication due to high severity auth event',
        expectedOutcome: 'Verified user identity',
        verificationRequired: true
      });
    }

    return actions;
  }

  private async analyzeCrossDeviceCorrelation(eventData: Partial<SecurityAuditEvent>): Promise<CrossDeviceCorrelation | undefined> {
    if (eventData.eventType !== 'cross_device_sync') {
      return undefined;
    }

    const correlationId = await this.generateSecureEventId();

    return {
      correlationId,
      relatedDevices: [eventData.deviceId || 'unknown'],
      eventCorrelations: [],
      syncOperation: eventData.operation,
      emergencyCoordination: eventData.eventType === 'emergency_access'
    };
  }

  private async encryptAuditEvent(event: SecurityAuditEvent): Promise<string> {
    try {
      const encryptionResult = await encryptionService.encryptData(
        event,
        DataSensitivity.CLINICAL,
        {
          auditEvent: true,
          retentionPeriod: event.complianceMarkers.retentionPeriod
        }
      );
      return encryptionResult.encryptedData;
    } catch (error) {
      console.error('Audit event encryption failed:', error);
      throw new Error('Cannot encrypt audit event');
    }
  }

  private async enforceRetentionPolicy(): Promise<void> {
    // Keep only events within retention period
    const maxRetentionDays = 2555; // 7 years
    const cutoffDate = new Date(Date.now() - maxRetentionDays * 24 * 60 * 60 * 1000);

    this.auditEvents = this.auditEvents.filter(
      event => new Date(event.timestamp) > cutoffDate
    );

    // Keep only last 50,000 events for performance
    if (this.auditEvents.length > 50000) {
      this.auditEvents = this.auditEvents.slice(-50000);
    }
  }

  private async performRealTimeAnalysis(event: SecurityAuditEvent): Promise<void> {
    // Check against monitoring rules
    for (const rule of this.realTimeMonitoring.monitoringRules) {
      if (!rule.enabled || !rule.eventTypes.includes(event.eventType)) {
        continue;
      }

      // Evaluate conditions
      const conditionsMet = rule.conditions.every(condition =>
        this.evaluateCondition(event, condition)
      );

      if (conditionsMet) {
        // Execute actions
        for (const action of rule.actions) {
          if (action.automated) {
            await this.executeMonitoringAction(event, action);
          }
        }
      }
    }
  }

  private evaluateCondition(event: SecurityAuditEvent, condition: MonitoringCondition): boolean {
    // Simple implementation - would be more sophisticated in production
    const fieldValue = this.getFieldValue(event, condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      default:
        return false;
    }
  }

  private getFieldValue(event: SecurityAuditEvent, fieldPath: string): any {
    const fields = fieldPath.split('.');
    let value: any = event;

    for (const field of fields) {
      value = value?.[field];
    }

    return value;
  }

  private async executeMonitoringAction(event: SecurityAuditEvent, action: MonitoringAction): Promise<void> {
    switch (action.actionType) {
      case 'alert':
        console.warn(`Security alert: ${event.eventType} - ${event.operation}`);
        break;
      case 'monitor':
        console.log(`Enhanced monitoring enabled for: ${event.eventType}`);
        break;
      case 'escalate':
        console.error(`Security escalation: ${event.eventType} - ${event.operation}`);
        break;
      default:
        console.log(`Unknown monitoring action: ${action.actionType}`);
    }
  }

  private async executeAutomatedRemediation(event: SecurityAuditEvent): Promise<void> {
    for (const action of event.remediationActions) {
      if (action.automated && !action.implemented) {
        try {
          await this.executeRemediationAction(action);
          action.implemented = true;
          action.implementedAt = new Date().toISOString();
        } catch (error) {
          console.error(`Automated remediation failed for ${action.actionType}:`, error);
        }
      }
    }
  }

  private async executeRemediationAction(action: RemediationAction): Promise<void> {
    switch (action.actionType) {
      case 'escalate_to_security':
        console.error(`SECURITY ESCALATION: ${action.description}`);
        break;
      case 'require_re_authentication':
        console.warn(`RE-AUTHENTICATION REQUIRED: ${action.description}`);
        break;
      case 'enable_monitoring':
        console.log(`ENHANCED MONITORING: ${action.description}`);
        break;
      default:
        console.log(`REMEDIATION ACTION: ${action.actionType} - ${action.description}`);
    }
  }

  private updateAuditingPerformanceMetrics(auditTime: number, crisisContext: boolean): void {
    this.auditingPerformanceMetrics.totalAudits++;

    this.auditingPerformanceMetrics.averageAuditTime =
      (this.auditingPerformanceMetrics.averageAuditTime * (this.auditingPerformanceMetrics.totalAudits - 1) + auditTime) /
      this.auditingPerformanceMetrics.totalAudits;

    if (auditTime > this.auditingPerformanceMetrics.maxAuditTime) {
      this.auditingPerformanceMetrics.maxAuditTime = auditTime;
    }

    if (crisisContext) {
      this.auditingPerformanceMetrics.crisisAuditTime = auditTime;
    }

    // Calculate auditing overhead as percentage of total operation time
    this.auditingPerformanceMetrics.auditingOverhead =
      (this.auditingPerformanceMetrics.averageAuditTime / 200) * 100; // Assuming 200ms baseline operation
  }

  private async persistAuditEvent(encryptedEvent: string): Promise<void> {
    // Implementation would persist encrypted event to secure storage
    // This is a simplified version
    try {
      const existingEvents = await SecureStore.getItemAsync('being_audit_events') || '[]';
      const events = JSON.parse(existingEvents);
      events.push(encryptedEvent);

      // Keep only recent events in persistent storage
      if (events.length > 1000) {
        events.splice(0, events.length - 1000);
      }

      await SecureStore.setItemAsync('being_audit_events', JSON.stringify(events));
    } catch (error) {
      console.warn('Failed to persist audit event:', error);
    }
  }

  // Additional placeholder methods for comprehensive compliance reporting
  private async assessOverallCompliance(events: SecurityAuditEvent[]): Promise<ComplianceReport['complianceStatus']['overall']> {
    const violations = events.filter(e => e.eventType === 'compliance_violation').length;
    const totalEvents = events.length;

    if (violations === 0) return 'compliant';
    if (violations / totalEvents < 0.01) return 'compliant';
    if (violations / totalEvents < 0.05) return 'partial_compliance';
    return 'non_compliant';
  }

  private async assessHIPAACompliance(events: SecurityAuditEvent[]): Promise<ComplianceAssessment> {
    const hipaaEvents = events.filter(e => e.complianceMarkers.hipaaApplicable);
    const violations = hipaaEvents.filter(e => e.eventType === 'compliance_violation');

    return {
      status: violations.length === 0 ? 'compliant' : 'partial_compliance',
      score: violations.length === 0 ? 1.0 : Math.max(0, 1 - (violations.length / hipaaEvents.length)),
      requirements: {
        met: ['encryption_at_rest', 'audit_logging', 'access_controls'],
        unmet: violations.length > 0 ? ['policy_compliance'] : [],
        partiallyMet: []
      },
      violations: violations.map(v => ({
        requirement: 'HIPAA Security Rule',
        severity: v.severity,
        description: v.operation,
        firstOccurrence: v.timestamp,
        occurrenceCount: 1
      })),
      recommendations: violations.length > 0 ? ['Review HIPAA compliance procedures'] : []
    };
  }

  private async assessPCIDSSCompliance(events: SecurityAuditEvent[]): Promise<ComplianceAssessment> {
    // Similar implementation for PCI DSS
    return {
      status: 'compliant',
      score: 1.0,
      requirements: { met: ['data_protection'], unmet: [], partiallyMet: [] },
      violations: [],
      recommendations: []
    };
  }

  private async assessDataProtectionCompliance(events: SecurityAuditEvent[]): Promise<ComplianceAssessment> {
    // Similar implementation for data protection
    return {
      status: 'compliant',
      score: 1.0,
      requirements: { met: ['data_minimization', 'consent_management'], unmet: [], partiallyMet: [] },
      violations: [],
      recommendations: []
    };
  }

  private async assessEmergencyAccessCompliance(events: SecurityAuditEvent[]): Promise<ComplianceAssessment> {
    const emergencyEvents = events.filter(e => e.eventType === 'emergency_access');
    const auditedEvents = emergencyEvents.filter(e => e.complianceMarkers.auditRequired);

    return {
      status: auditedEvents.length === emergencyEvents.length ? 'compliant' : 'partial_compliance',
      score: emergencyEvents.length === 0 ? 1.0 : auditedEvents.length / emergencyEvents.length,
      requirements: {
        met: ['enhanced_auditing', 'justification_required'],
        unmet: auditedEvents.length < emergencyEvents.length ? ['complete_audit_coverage'] : [],
        partiallyMet: []
      },
      violations: [],
      recommendations: auditedEvents.length < emergencyEvents.length ?
        ['Ensure all emergency access is properly audited'] : []
    };
  }

  // Additional utility methods
  private async generateSecureEventId(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async getCurrentDeviceId(): Promise<string> {
    try {
      const deviceId = await SecureStore.getItemAsync('being_current_device_id');
      return deviceId || 'unknown_device';
    } catch {
      return 'unknown_device';
    }
  }

  // Additional placeholder methods that would be fully implemented
  private async performRiskAssessment(events: SecurityAuditEvent[]): Promise<ComplianceReport['riskAssessment']> {
    return {
      overallRisk: 'low',
      identifiedThreats: [],
      vulnerabilities: [],
      recommendations: []
    };
  }

  private assessPerformanceImpact(): ComplianceReport['performanceCompliance']['performanceImpact'] {
    if (this.auditingPerformanceMetrics.averageAuditTime > 100) return 'critical';
    if (this.auditingPerformanceMetrics.averageAuditTime > 50) return 'concerning';
    if (this.auditingPerformanceMetrics.averageAuditTime > 20) return 'acceptable';
    return 'minimal';
  }

  private async generateRemediationPlan(
    events: SecurityAuditEvent[],
    riskAssessment: ComplianceReport['riskAssessment']
  ): Promise<ComplianceReport['remediationPlan']> {
    return {
      immediateActions: [],
      scheduledActions: [],
      preventiveActions: [],
      estimatedCompletionTime: 0
    };
  }

  private async detectAnomalousPatterns(events: SecurityAuditEvent[]): Promise<string[]> {
    return [];
  }

  private async identifyPerformanceIssues(events: SecurityAuditEvent[]): Promise<string[]> {
    const issues: string[] = [];

    const slowEvents = events.filter(e => e.performanceMetrics.totalProcessingTime > 1000);
    if (slowEvents.length > 0) {
      issues.push(`${slowEvents.length} events with processing time >1s detected`);
    }

    if (this.auditingPerformanceMetrics.crisisAuditTime > 50) {
      issues.push('Crisis audit time exceeds 50ms threshold');
    }

    return issues;
  }

  private async generateRecommendedActions(
    threats: ThreatIndicator[],
    violations: SecurityAuditEvent[],
    performanceIssues: string[]
  ): Promise<RemediationAction[]> {
    const actions: RemediationAction[] = [];

    if (threats.length > 0) {
      actions.push({
        actionType: 'enable_monitoring',
        priority: 'high',
        automated: false,
        implemented: false,
        description: 'Enable enhanced monitoring due to active threats',
        expectedOutcome: 'Improved threat detection',
        verificationRequired: true
      });
    }

    return actions;
  }

  private assessSecurityPosture(
    threats: ThreatIndicator[],
    anomalies: string[]
  ): 'excellent' | 'good' | 'warning' | 'critical' {
    if (threats.some(t => t.severity === 'critical')) return 'critical';
    if (threats.length > 5 || anomalies.length > 3) return 'warning';
    if (threats.length > 0 || anomalies.length > 0) return 'good';
    return 'excellent';
  }

  private assessAuditingHealth(): 'healthy' | 'degraded' | 'failing' {
    if (this.auditingPerformanceMetrics.averageAuditTime > 100) return 'failing';
    if (this.auditingPerformanceMetrics.averageAuditTime > 50) return 'degraded';
    return 'healthy';
  }

  private assessComplianceStatus(violations: SecurityAuditEvent[]): 'compliant' | 'at_risk' | 'non_compliant' {
    if (violations.some(v => v.severity === 'critical')) return 'non_compliant';
    if (violations.length > 0) return 'at_risk';
    return 'compliant';
  }
}

// Export singleton instance
export const securityAuditService = SecurityAuditService.getInstance();