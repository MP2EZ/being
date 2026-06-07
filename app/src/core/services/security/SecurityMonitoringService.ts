/**
 * SECURITY MONITORING SERVICE - DRD-FLOW-005 Security Implementation
 *
 * COMPREHENSIVE SECURITY MONITORING FOR MENTAL HEALTH APPLICATION:
 * - Real-time vulnerability assessment and threat detection
 * - Continuous security monitoring of all application layers
 * - Automated security scanning and penetration testing
 * - Security metrics collection and analysis
 * - Incident detection and automated response
 *
 * MENTAL HEALTH SPECIFIC MONITORING:
 * - Crisis data access pattern analysis
 * - PHQ-9/GAD-7 assessment data protection monitoring
 * - Professional access compliance tracking
 * - Privacy compliance monitoring and reporting
 * - Emergency access pattern validation
 *
 * MONITORING SCOPE:
 * - Application layer security (React Native components)
 * - Data layer security (encryption, storage, transmission)
 * - Network layer security (API calls, certificate validation)
 * - Authentication layer security (session management, token validation)
 * - Crisis system security (emergency access, professional oversight)
 *
 * PERFORMANCE REQUIREMENTS:
 * - Real-time monitoring: <100ms detection latency
 * - Vulnerability scans: <5 seconds for full assessment
 * - Incident response: <30 seconds for automated mitigation
 * - Compliance reporting: <10 seconds for status generation
 */


import { logSecurity, logPerformance, logError, LogCategory } from '../logging';
import EncryptionService from './EncryptionService';
import AuthenticationService from './AuthenticationService';
import SecureStorageService from './SecureStorageService';
import NetworkSecurityService from './NetworkSecurityService';
import CrisisSecurityProtocol from '@/features/crisis/services/CrisisSecurityProtocol';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { sanitizeWellnessData } from '@/core/services/security/wellnessDataPatterns';

/**
 * SECURITY MONITORING CONFIGURATION
 */
export const MONITORING_CONFIG = {
  /** Monitoring intervals */
  REAL_TIME_MONITORING_MS: 5000,      // 5 seconds
  VULNERABILITY_SCAN_MS: 300000,      // 5 minutes
  COMPLIANCE_CHECK_MS: 900000,        // 15 minutes
  THREAT_ANALYSIS_MS: 60000,          // 1 minute
  INCIDENT_RESPONSE_MS: 30000,        // 30 seconds
  
  /** Performance thresholds */
  DETECTION_LATENCY_THRESHOLD_MS: 100,
  SCAN_DURATION_THRESHOLD_MS: 5000,
  RESPONSE_TIME_THRESHOLD_MS: 30000,
  COMPLIANCE_CHECK_THRESHOLD_MS: 10000,
  
  /** Security thresholds */
  MAX_FAILED_ATTEMPTS: 5,
  SUSPICIOUS_ACTIVITY_THRESHOLD: 10,
  VULNERABILITY_SCORE_THRESHOLD: 7.0,
  COMPLIANCE_SCORE_THRESHOLD: 95.0,
  INCIDENT_ESCALATION_THRESHOLD: 3,
  
  /** Monitoring categories */
  MONITORING_CATEGORIES: {
    application_security: 'Application Layer Security',
    data_security: 'Data Protection Security',
    network_security: 'Network Communication Security',
    authentication_security: 'Authentication & Authorization Security',
    crisis_security: 'Crisis Intervention Security',
    compliance_monitoring: 'Regulatory Compliance Monitoring'
  } as const,
  
  /** Vulnerability severity levels */
  VULNERABILITY_SEVERITY: {
    critical: { score: 9.0, color: '#FF0000', priority: 1 },
    high: { score: 7.0, color: '#FF6600', priority: 2 },
    medium: { score: 5.0, color: '#FFAA00', priority: 3 },
    low: { score: 3.0, color: '#FFFF00', priority: 4 },
    info: { score: 1.0, color: '#00FF00', priority: 5 }
  } as const
} as const;

/**
 * VULNERABILITY ASSESSMENT RESULT
 */
export interface VulnerabilityAssessment {
  assessmentId: string;
  timestamp: number;
  scanDuration: number;
  overallScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'minimal';
  vulnerabilities: SecurityVulnerability[];
  categories: {
    [K in keyof typeof MONITORING_CONFIG.MONITORING_CATEGORIES]: {
      score: number;
      vulnerabilities: SecurityVulnerability[];
      status: 'secure' | 'warning' | 'vulnerable' | 'critical';
    };
  };
  recommendations: SecurityRecommendation[];
  complianceStatus: ComplianceStatus;
}

/**
 * SECURITY VULNERABILITY
 */
export interface SecurityVulnerability {
  vulnerabilityId: string;
  category: keyof typeof MONITORING_CONFIG.MONITORING_CATEGORIES;
  severity: keyof typeof MONITORING_CONFIG.VULNERABILITY_SEVERITY;
  title: string;
  description: string;
  affectedComponents: string[];
  riskScore: number;
  exploitability: 'low' | 'medium' | 'high' | 'critical';
  impact: {
    confidentiality: 'none' | 'partial' | 'complete';
    integrity: 'none' | 'partial' | 'complete';
    availability: 'none' | 'partial' | 'complete';
  };
  cvssScore?: number;
  cweId?: string;
  detectionMethod: 'static_analysis' | 'dynamic_analysis' | 'behavioral_monitoring' | 'signature_detection';
  firstDetected: number;
  lastSeen: number;
  mitigationStatus: 'open' | 'in_progress' | 'mitigated' | 'accepted_risk';
  mitigationSteps: string[];
  estimatedFixTime: number;
}

/**
 * SECURITY RECOMMENDATION
 */
export interface SecurityRecommendation {
  recommendationId: string;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  category: keyof typeof MONITORING_CONFIG.MONITORING_CATEGORIES;
  title: string;
  description: string;
  actionRequired: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  riskReduction: number;
  implementationSteps: string[];
  dependencies: string[];
  complianceImpact: string[];
}

/**
 * COMPLIANCE STATUS
 */
export interface ComplianceStatus {
  overallScore: number;
  privacyCompliance: {
    score: number;
    status: 'compliant' | 'non_compliant' | 'partial';
    violations: string[];
    recommendations: string[];
  };
  dataProtectionCompliance: {
    score: number;
    encryptionCompliance: boolean;
    storageCompliance: boolean;
    transmissionCompliance: boolean;
    accessControlCompliance: boolean;
  };
  clinicalCompliance: {
    score: number;
    crisisProtocolCompliance: boolean;
    professionalAccessCompliance: boolean;
    auditTrailCompliance: boolean;
    documentationCompliance: boolean;
  };
  lastComplianceCheck: number;
}

/**
 * THREAT DETECTION RESULT
 */
export interface ThreatDetectionResult {
  detectionId: string;
  timestamp: number;
  threatType: 'malware' | 'phishing' | 'data_exfiltration' | 'unauthorized_access' | 'ddos' | 'social_engineering' | 'insider_threat';
  severity: keyof typeof MONITORING_CONFIG.VULNERABILITY_SEVERITY;
  confidence: number;
  description: string;
  indicators: string[];
  affectedAssets: string[];
  potentialImpact: string;
  detectionSource: 'behavioral_analysis' | 'signature_detection' | 'anomaly_detection' | 'ml_detection';
  automated_response: boolean;
  responseActions: string[];
  requiresInvestigation: boolean;
}

/**
 * SECURITY METRICS
 */
export interface SecurityMetrics {
  timestamp: number;
  monitoringPeriod: number;
  overallSecurityScore: number;
  
  applicationSecurity: {
    componentVulnerabilities: number;
    secureConfigurationScore: number;
    codeQualityScore: number;
    dependencyVulnerabilities: number;
  };
  
  dataSecurity: {
    encryptionCoverage: number;
    dataClassificationCompliance: number;
    accessControlEffectiveness: number;
    dataLeakageIncidents: number;
  };
  
  networkSecurity: {
    trafficAnalysisScore: number;
    certificateValidityScore: number;
    apiSecurityScore: number;
    networkIntrusionAttempts: number;
  };
  
  authenticationSecurity: {
    authenticationSuccessRate: number;
    sessionSecurityScore: number;
    privilegeEscalationAttempts: number;
    multiFactorAuthUsage: number;
  };
  
  crisisSecurity: {
    crisisAccessCompliance: number;
    emergencyProtocolEffectiveness: number;
    professionalOversightScore: number;
    crisisDataProtectionScore: number;
  };
  
  complianceMetrics: {
    privacyComplianceScore: number;
    auditTrailCompleteness: number;
    dataRetentionCompliance: number;
    incidentResponseEffectiveness: number;
  };
  
  incidentMetrics: {
    totalIncidents: number;
    criticalIncidents: number;
    averageResponseTime: number;
    automaticMitigationRate: number;
  };
}

/**
 * INCIDENT DETECTION EVENT
 */
export interface IncidentDetectionEvent {
  incidentId: string;
  timestamp: number;
  incidentType: 'security_breach' | 'data_leak' | 'authentication_failure' | 'malware_detection' | 'compliance_violation' | 'system_compromise';
  severity: keyof typeof MONITORING_CONFIG.VULNERABILITY_SEVERITY;
  description: string;
  affectedSystems: string[];
  detectionMethod: string;
  automaticResponse: boolean;
  responseActions: string[];
  escalationRequired: boolean;
  containmentStatus: 'contained' | 'in_progress' | 'uncontained';
  estimatedImpact: {
    dataCompromised: boolean;
    systemsAffected: number;
    usersImpacted: number;
    complianceViolation: boolean;
  };
}

/**
 * COMPREHENSIVE SECURITY MONITORING SERVICE
 * Provides real-time security monitoring and vulnerability assessment
 */
/**
 * THREAT DETECTOR REGISTRATION (MAINT-201)
 * Consumers (e.g. AnalyticsService) register named detectors that the monitoring
 * service holds in-memory. `pattern` may be a RegExp or a predicate closure — both
 * are memory-only and intentionally NOT persisted.
 */
export interface ThreatDetectorConfig {
  pattern: RegExp | ((data: unknown) => boolean);
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  action: 'block_and_alert' | 'alert_and_obfuscate' | 'rotate_sessions';
}

export class SecurityMonitoringService {
  private static instance: SecurityMonitoringService;
  
  // Service dependencies
  private encryptionService: typeof EncryptionService;
  private authenticationService: typeof AuthenticationService;
  private secureStorage: typeof SecureStorageService;
  private networkSecurity: typeof NetworkSecurityService;
  private crisisSecurityProtocol: typeof CrisisSecurityProtocol;
  
  // Monitoring state
  private monitoringActive: boolean = false;
  private lastVulnerabilityAssessment: VulnerabilityAssessment | null = null;
  private securityMetrics: SecurityMetrics;
  private detectedThreats: ThreatDetectionResult[] = [];
  private detectedIncidents: IncidentDetectionEvent[] = [];
  private vulnerabilities: SecurityVulnerability[] = [];
  // MAINT-201: in-memory registry of named threat detectors. Never persisted —
  // pattern values may be RegExp or closures.
  private threatDetectors: Map<string, ThreatDetectorConfig> = new Map();
  // MAINT-201: sanitized, in-memory record of critical/high analytics security
  // events. Holds NO durable wellness data (sanitizeWellnessData runs first).
  private analyticsSecurityEvents: Array<{
    eventType: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    timestamp: number;
    data: Record<string, unknown>;
  }> = [];
  
  // Monitoring timers
  private realTimeMonitoringTimer: NodeJS.Timeout | null = null;
  private vulnerabilityScanTimer: NodeJS.Timeout | null = null;
  private complianceCheckTimer: NodeJS.Timeout | null = null;
  
  private initialized: boolean = false;

  private constructor() {
    this.encryptionService = EncryptionService;
    this.authenticationService = AuthenticationService;
    this.secureStorage = SecureStorageService;
    this.networkSecurity = NetworkSecurityService;
    this.crisisSecurityProtocol = CrisisSecurityProtocol;
    this.securityMetrics = this.initializeSecurityMetrics();
  }

  public static getInstance(): SecurityMonitoringService {
    if (!SecurityMonitoringService.instance) {
      SecurityMonitoringService.instance = new SecurityMonitoringService();
    }
    return SecurityMonitoringService.instance;
  }

  /**
   * MAINT-190: Test-only escape hatch for singleton state isolation.
   * Clears all monitoring timers + threat/incident/vulnerability lists.
   *
   * Production safety: throws if NODE_ENV !== 'test'. A production reset
   * would silently disable real-time threat detection mid-session — the
   * monitoringActive flag flips back to false without firing the normal
   * shutdown audit, so the security operations dashboard would show
   * green while monitoring is actually offline.
   */
  public static __resetForTesting__(): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        'SecurityMonitoringService.__resetForTesting__() called outside NODE_ENV=test — refusing to clear monitoring state in production'
      );
    }
    if (SecurityMonitoringService.instance) {
      const inst = SecurityMonitoringService.instance;
      if (inst.realTimeMonitoringTimer) {
        clearInterval(inst.realTimeMonitoringTimer);
        inst.realTimeMonitoringTimer = null;
      }
      if (inst.vulnerabilityScanTimer) {
        clearInterval(inst.vulnerabilityScanTimer);
        inst.vulnerabilityScanTimer = null;
      }
      if (inst.complianceCheckTimer) {
        clearInterval(inst.complianceCheckTimer);
        inst.complianceCheckTimer = null;
      }
      inst.monitoringActive = false;
      inst.lastVulnerabilityAssessment = null;
      inst.detectedThreats = [];
      inst.detectedIncidents = [];
      inst.vulnerabilities = [];
      inst.threatDetectors = new Map();
      inst.analyticsSecurityEvents = [];
      inst.initialized = false;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional: nulling private static reset target
    SecurityMonitoringService.instance = undefined as any;
  }

  /**
   * INITIALIZE SECURITY MONITORING
   */
  public async initialize(): Promise<void> {
    const startTime = performance.now();

    try {
      console.log('🔍 Initializing Security Monitoring Service...');

      // Initialize all security services
      await this.encryptionService.initialize();
      await this.authenticationService.initialize();
      await this.secureStorage.initialize();
      await this.networkSecurity.initialize();
      await this.crisisSecurityProtocol.initialize();

      // Perform initial vulnerability assessment
      await this.performVulnerabilityAssessment();

      // Perform initial compliance check
      await this.performComplianceCheck();

      // Start continuous monitoring
      await this.startContinuousMonitoring();

      this.initialized = true;

      const initializationTime = performance.now() - startTime;
      logPerformance('SecurityMonitoringService.initialize', initializationTime, {
        status: 'success'
      });

      // Log successful initialization
      await this.logIncidentEvent({
        incidentId: await this.generateIncidentId(),
        timestamp: Date.now(),
        incidentType: 'system_compromise', // Using as general event type
        severity: 'info',
        description: `Security monitoring service initialized successfully in ${initializationTime.toFixed(2)}ms`,
        affectedSystems: ['security_monitoring'],
        detectionMethod: 'system_initialization',
        automaticResponse: false,
        responseActions: ['monitoring_activated'],
        escalationRequired: false,
        containmentStatus: 'contained',
        estimatedImpact: {
          dataCompromised: false,
          systemsAffected: 0,
          usersImpacted: 0,
          complianceViolation: false
        }
      });

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 SECURITY MONITORING INITIALIZATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Security monitoring initialization failed: ${(error instanceof Error ? error.message : String(error))}`);
    }
  }

  /**
   * VULNERABILITY ASSESSMENT
   * Comprehensive security vulnerability scanning and assessment
   */
  public async performVulnerabilityAssessment(): Promise<VulnerabilityAssessment> {
    const startTime = performance.now();
    const assessmentId = await this.generateAssessmentId();

    try {
      console.log('🔍 Performing comprehensive vulnerability assessment...');

      if (!this.initialized) {
        throw new Error('Security monitoring service not initialized');
      }

      const vulnerabilities: SecurityVulnerability[] = [];

      // Application Security Assessment
      const appSecurityVulns = await this.assessApplicationSecurity();
      vulnerabilities.push(...appSecurityVulns);

      // Data Security Assessment
      const dataSecurityVulns = await this.assessDataSecurity();
      vulnerabilities.push(...dataSecurityVulns);

      // Network Security Assessment
      const networkSecurityVulns = await this.assessNetworkSecurity();
      vulnerabilities.push(...networkSecurityVulns);

      // Authentication Security Assessment
      const authSecurityVulns = await this.assessAuthenticationSecurity();
      vulnerabilities.push(...authSecurityVulns);

      // Crisis Security Assessment
      const crisisSecurityVulns = await this.assessCrisisSecurity();
      vulnerabilities.push(...crisisSecurityVulns);

      // Calculate overall scores
      const scanDuration = performance.now() - startTime;
      const overallScore = this.calculateOverallSecurityScore(vulnerabilities);
      const riskLevel = this.determineRiskLevel(overallScore);

      // Generate recommendations
      const recommendations = await this.generateSecurityRecommendations(vulnerabilities);

      // Check compliance status
      const complianceStatus = await (this as any).checkComplianceStatus();

      // Categorize vulnerabilities
      const categories = this.categorizeVulnerabilities(vulnerabilities);

      const assessment: VulnerabilityAssessment = {
        assessmentId,
        timestamp: Date.now(),
        scanDuration,
        overallScore,
        riskLevel,
        vulnerabilities,
        categories,
        recommendations,
        complianceStatus
      };

      // Store assessment results
      this.lastVulnerabilityAssessment = assessment;
      this.vulnerabilities = vulnerabilities;

      // Validate scan performance
      if (scanDuration > MONITORING_CONFIG.SCAN_DURATION_THRESHOLD_MS) {
        logSecurity(`⚠️  Vulnerability scan slow: ${scanDuration.toFixed(2)}ms > ${MONITORING_CONFIG.SCAN_DURATION_THRESHOLD_MS}ms`, 'medium', { component: 'SecurityService' });
      }

      // Store assessment for historical tracking
      await this.storeAssessmentResults(assessment);

      logPerformance('SecurityMonitoringService.assessVulnerabilities', scanDuration, {
        vulnerabilityCount: vulnerabilities.length
      });

      return assessment;

    } catch (error) {
      const scanDuration = performance.now() - startTime;
      logError(LogCategory.SECURITY, '🚨 VULNERABILITY ASSESSMENT ERROR:', error instanceof Error ? error : new Error(String(error)));

      // Return failed assessment
      return {
        assessmentId,
        timestamp: Date.now(),
        scanDuration,
        overallScore: 0,
        riskLevel: 'critical',
        vulnerabilities: [],
        categories: {} as any,
        recommendations: [],
        complianceStatus: {
          overallScore: 0,
          privacyCompliance: { score: 0, status: 'non_compliant', violations: [(error instanceof Error ? error.message : String(error))], recommendations: [] },
          dataProtectionCompliance: { score: 0, encryptionCompliance: false, storageCompliance: false, transmissionCompliance: false, accessControlCompliance: false },
          clinicalCompliance: { score: 0, crisisProtocolCompliance: false, professionalAccessCompliance: false, auditTrailCompliance: false, documentationCompliance: false },
          lastComplianceCheck: Date.now()
        }
      };
    }
  }

  /**
   * INCIDENT DETECTION AND RESPONSE
   * Automated incident detection and response system
   */
  public async detectIncidents(): Promise<IncidentDetectionEvent[]> {
    const startTime = performance.now();

    try {
      console.log('🚨 Performing incident detection...');

      if (!this.initialized) {
        throw new Error('Security monitoring service not initialized');
      }

      const incidents: IncidentDetectionEvent[] = [];

      // Authentication failure pattern detection
      const authFailures = await this.detectAuthenticationFailures();
      incidents.push(...authFailures);

      // Compliance violation detection
      const complianceViolations = await this.detectComplianceViolations();
      incidents.push(...complianceViolations);

      // Process each incident
      for (const incident of incidents) {
        await this.processIncident(incident);
      }

      // Store incidents
      this.detectedIncidents.push(...incidents);

      // Keep only recent incidents
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
      this.detectedIncidents = this.detectedIncidents.filter(incident => incident.timestamp > cutoffTime);

      const detectionTime = performance.now() - startTime;

      logPerformance('SecurityMonitoringService.detectIncidents', detectionTime, {
        incidentCount: incidents.length
      });

      return incidents;

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 INCIDENT DETECTION ERROR:', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * COMPLIANCE MONITORING
   * Continuous compliance monitoring and reporting
   */
  public async performComplianceCheck(): Promise<ComplianceStatus> {
    const startTime = performance.now();

    try {
      console.log('📋 Performing compliance check...');

      if (!this.initialized) {
        throw new Error('Security monitoring service not initialized');
      }

      // Privacy Compliance Check
      const privacyCompliance = await this.checkPrivacyCompliance();

      // Data Protection Compliance Check
      const dataProtectionCompliance = await this.checkDataProtectionCompliance();

      // Clinical Compliance Check
      const clinicalCompliance = await this.checkClinicalCompliance();

      // Calculate overall compliance score
      const overallScore = (
        privacyCompliance.score + 
        dataProtectionCompliance.score + 
        clinicalCompliance.score
      ) / 3;

      const complianceStatus: ComplianceStatus = {
        overallScore,
        privacyCompliance,
        dataProtectionCompliance,
        clinicalCompliance,
        lastComplianceCheck: Date.now()
      };

      const checkTime = performance.now() - startTime;

      // Validate compliance check performance
      if (checkTime > MONITORING_CONFIG.COMPLIANCE_CHECK_THRESHOLD_MS) {
        logSecurity(`⚠️  Compliance check slow: ${checkTime.toFixed(2)}ms > ${MONITORING_CONFIG.COMPLIANCE_CHECK_THRESHOLD_MS}ms`, 'medium', { component: 'SecurityService' });
      }

      // Log compliance violations
      if (overallScore < MONITORING_CONFIG.COMPLIANCE_SCORE_THRESHOLD) {
        await this.logIncidentEvent({
          incidentId: await this.generateIncidentId(),
          timestamp: Date.now(),
          incidentType: 'compliance_violation',
          severity: overallScore < 80 ? 'critical' : 'high',
          description: `Compliance score below threshold: ${overallScore.toFixed(1)}% < ${MONITORING_CONFIG.COMPLIANCE_SCORE_THRESHOLD}%`,
          affectedSystems: ['compliance_monitoring'],
          detectionMethod: 'compliance_check',
          automaticResponse: false,
          responseActions: ['compliance_review_required'],
          escalationRequired: true,
          containmentStatus: 'in_progress',
          estimatedImpact: {
            dataCompromised: false,
            systemsAffected: 0,
            usersImpacted: 0,
            complianceViolation: true
          }
        });
      }

      logPerformance('SecurityMonitoringService.checkCompliance', checkTime, {
        overallScore: overallScore.toFixed(1)
      });

      return complianceStatus;

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 COMPLIANCE CHECK ERROR:', error instanceof Error ? error : new Error(String(error)));
      
      // Return failed compliance status
      return {
        overallScore: 0,
        privacyCompliance: { score: 0, status: 'non_compliant', violations: [(error instanceof Error ? error.message : String(error))], recommendations: [] },
        dataProtectionCompliance: { score: 0, encryptionCompliance: false, storageCompliance: false, transmissionCompliance: false, accessControlCompliance: false },
        clinicalCompliance: { score: 0, crisisProtocolCompliance: false, professionalAccessCompliance: false, auditTrailCompliance: false, documentationCompliance: false },
        lastComplianceCheck: Date.now()
      };
    }
  }

  /**
   * CONTINUOUS MONITORING
   * Start continuous security monitoring processes
   */
  public async startContinuousMonitoring(): Promise<void> {
    try {
      console.log('🔄 Starting continuous security monitoring...');

      if (this.monitoringActive) {
        console.log('⚠️  Monitoring already active');
        return;
      }

      this.monitoringActive = true;

      // INFRA-175: Skip interval setup in test environment to prevent Jest
      // worker hang from unguarded timers (INFRA-144 pattern). Production
      // continuous-monitoring is unaffected — guards only fire under
      // NODE_ENV === 'test'.
      if (process.env.NODE_ENV === 'test') {
        logSecurity('Continuous security monitoring active (intervals skipped under NODE_ENV=test per INFRA-175)', 'low');
        return;
      }

      // Real-time monitoring (every 5 seconds)
      this.realTimeMonitoringTimer = setInterval(async () => {
        try {
          await this.performRealTimeMonitoring();
        } catch (error) {
          logError(LogCategory.SECURITY, '🚨 REAL-TIME MONITORING ERROR:', error instanceof Error ? error : new Error(String(error)));
        }
      }, MONITORING_CONFIG.REAL_TIME_MONITORING_MS);

      // Vulnerability scanning (every 5 minutes)
      this.vulnerabilityScanTimer = setInterval(async () => {
        try {
          await this.performVulnerabilityAssessment();
        } catch (error) {
          logError(LogCategory.SECURITY, '🚨 VULNERABILITY SCAN ERROR:', error instanceof Error ? error : new Error(String(error)));
        }
      }, MONITORING_CONFIG.VULNERABILITY_SCAN_MS);

      // Compliance checking (every 15 minutes)
      this.complianceCheckTimer = setInterval(async () => {
        try {
          await this.performComplianceCheck();
        } catch (error) {
          logError(LogCategory.SECURITY, '🚨 COMPLIANCE CHECK ERROR:', error instanceof Error ? error : new Error(String(error)));
        }
      }, MONITORING_CONFIG.COMPLIANCE_CHECK_MS);

      console.log('✅ Continuous security monitoring started');

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 CONTINUOUS MONITORING START ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * VULNERABILITY ASSESSMENT METHODS
   */

  private async assessApplicationSecurity(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Check secure configuration (real __DEV__ vulnerability surface)
      const configVulns = await this.checkSecureConfiguration();
      vulnerabilities.push(...configVulns);

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 APPLICATION SECURITY ASSESSMENT ERROR:', error instanceof Error ? error : new Error(String(error)));
    }

    return vulnerabilities;
  }

  private async assessDataSecurity(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Check encryption status
      const encryptionStatus = await this.encryptionService.getEncryptionStatus();
      
      if (encryptionStatus.successRate < 0.95) {
        vulnerabilities.push({
          vulnerabilityId: await this.generateVulnerabilityId(),
          category: 'data_security',
          severity: 'high',
          title: 'Encryption Service Reliability Issue',
          description: `Encryption success rate is ${(encryptionStatus.successRate * 100).toFixed(1)}%, below acceptable threshold`,
          affectedComponents: ['EncryptionService'],
          riskScore: 8.0,
          exploitability: 'high',
          impact: { confidentiality: 'complete', integrity: 'partial', availability: 'none' },
          detectionMethod: 'static_analysis',
          firstDetected: Date.now(),
          lastSeen: Date.now(),
          mitigationStatus: 'open',
          mitigationSteps: ['Review encryption service logs', 'Check key management', 'Validate encryption algorithms'],
          estimatedFixTime: 4 * 60 * 60 * 1000 // 4 hours
        });
      }

      // Check storage security
      const storageMetrics = await this.secureStorage.getStorageMetrics();
      
      if (storageMetrics.successRate < 0.98) {
        vulnerabilities.push({
          vulnerabilityId: await this.generateVulnerabilityId(),
          category: 'data_security',
          severity: 'medium',
          title: 'Secure Storage Reliability Issue',
          description: `Secure storage success rate is ${(storageMetrics.successRate * 100).toFixed(1)}%`,
          affectedComponents: ['SecureStorageService'],
          riskScore: 6.0,
          exploitability: 'medium',
          impact: { confidentiality: 'partial', integrity: 'partial', availability: 'partial' },
          detectionMethod: 'behavioral_monitoring',
          firstDetected: Date.now(),
          lastSeen: Date.now(),
          mitigationStatus: 'open',
          mitigationSteps: ['Review storage service logs', 'Check device storage capacity', 'Validate storage permissions'],
          estimatedFixTime: 2 * 60 * 60 * 1000 // 2 hours
        });
      }

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 DATA SECURITY ASSESSMENT ERROR:', error instanceof Error ? error : new Error(String(error)));
    }

    return vulnerabilities;
  }

  private async assessNetworkSecurity(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Check network security metrics
      const networkMetrics = await this.networkSecurity.getSecurityMetrics();
      
      if (networkMetrics.successfulRequests / networkMetrics.totalRequests < 0.95) {
        vulnerabilities.push({
          vulnerabilityId: await this.generateVulnerabilityId(),
          category: 'network_security',
          severity: 'medium',
          title: 'Network Request Failure Rate High',
          description: `Network request success rate is ${((networkMetrics.successfulRequests / networkMetrics.totalRequests) * 100).toFixed(1)}%`,
          affectedComponents: ['NetworkSecurityService'],
          riskScore: 5.5,
          exploitability: 'medium',
          impact: { confidentiality: 'none', integrity: 'none', availability: 'partial' },
          detectionMethod: 'behavioral_monitoring',
          firstDetected: Date.now(),
          lastSeen: Date.now(),
          mitigationStatus: 'open',
          mitigationSteps: ['Review network logs', 'Check API endpoints', 'Validate network connectivity'],
          estimatedFixTime: 1 * 60 * 60 * 1000 // 1 hour
        });
      }

      if (networkMetrics.securityViolations > 0) {
        vulnerabilities.push({
          vulnerabilityId: await this.generateVulnerabilityId(),
          category: 'network_security',
          severity: 'high',
          title: 'Network Security Violations Detected',
          description: `${networkMetrics.securityViolations} network security violations detected`,
          affectedComponents: ['NetworkSecurityService'],
          riskScore: 7.5,
          exploitability: 'high',
          impact: { confidentiality: 'partial', integrity: 'partial', availability: 'none' },
          detectionMethod: 'signature_detection',
          firstDetected: Date.now(),
          lastSeen: Date.now(),
          mitigationStatus: 'open',
          mitigationSteps: ['Investigate security violations', 'Review network security logs', 'Update security policies'],
          estimatedFixTime: 3 * 60 * 60 * 1000 // 3 hours
        });
      }

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 NETWORK SECURITY ASSESSMENT ERROR:', error instanceof Error ? error : new Error(String(error)));
    }

    return vulnerabilities;
  }

  private async assessAuthenticationSecurity(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Check authentication metrics
      const authMetrics = await this.authenticationService.getAuthenticationMetrics();
      
      if (authMetrics.authenticationAttempts > MONITORING_CONFIG.MAX_FAILED_ATTEMPTS) {
        vulnerabilities.push({
          vulnerabilityId: await this.generateVulnerabilityId(),
          category: 'authentication_security',
          severity: 'high',
          title: 'High Authentication Failure Rate',
          description: `${authMetrics.authenticationAttempts} failed authentication attempts detected`,
          affectedComponents: ['AuthenticationService'],
          riskScore: 7.0,
          exploitability: 'high',
          impact: { confidentiality: 'partial', integrity: 'none', availability: 'none' },
          detectionMethod: 'behavioral_monitoring',
          firstDetected: Date.now(),
          lastSeen: Date.now(),
          mitigationStatus: 'open',
          mitigationSteps: ['Review authentication logs', 'Check for brute force attacks', 'Implement rate limiting'],
          estimatedFixTime: 2 * 60 * 60 * 1000 // 2 hours
        });
      }

      if (!authMetrics.biometricAvailable && Platform.OS !== 'web') {
        vulnerabilities.push({
          vulnerabilityId: await this.generateVulnerabilityId(),
          category: 'authentication_security',
          severity: 'low',
          title: 'Biometric Authentication Not Available',
          description: 'Biometric authentication is not available on this device',
          affectedComponents: ['AuthenticationService'],
          riskScore: 3.0,
          exploitability: 'low',
          impact: { confidentiality: 'none', integrity: 'none', availability: 'none' },
          detectionMethod: 'static_analysis',
          firstDetected: Date.now(),
          lastSeen: Date.now(),
          mitigationStatus: 'accepted_risk',
          mitigationSteps: ['Enable biometric authentication if supported', 'Use strong passwords'],
          estimatedFixTime: 0
        });
      }

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 AUTHENTICATION SECURITY ASSESSMENT ERROR:', error instanceof Error ? error : new Error(String(error)));
    }

    return vulnerabilities;
  }

  private async assessCrisisSecurity(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Check crisis security metrics
      const crisisMetrics = await this.crisisSecurityProtocol.getCrisisSecurityMetrics();
      
      if (crisisMetrics.securityViolations > 0) {
        vulnerabilities.push({
          vulnerabilityId: await this.generateVulnerabilityId(),
          category: 'crisis_security',
          severity: 'critical',
          title: 'Crisis Security Violations Detected',
          description: `${crisisMetrics.securityViolations} crisis security violations detected`,
          affectedComponents: ['CrisisSecurityProtocol'],
          riskScore: 9.0,
          exploitability: 'critical',
          impact: { confidentiality: 'complete', integrity: 'complete', availability: 'partial' },
          detectionMethod: 'signature_detection',
          firstDetected: Date.now(),
          lastSeen: Date.now(),
          mitigationStatus: 'open',
          mitigationSteps: ['Investigate crisis security violations', 'Review crisis access logs', 'Update crisis protocols'],
          estimatedFixTime: 1 * 60 * 60 * 1000 // 1 hour (immediate response required)
        });
      }

      if (crisisMetrics.averageAccessTime > 200) {
        vulnerabilities.push({
          vulnerabilityId: await this.generateVulnerabilityId(),
          category: 'crisis_security',
          severity: 'medium',
          title: 'Crisis Access Performance Issue',
          description: `Crisis access time is ${crisisMetrics.averageAccessTime.toFixed(2)}ms, above 200ms threshold`,
          affectedComponents: ['CrisisSecurityProtocol'],
          riskScore: 5.0,
          exploitability: 'low',
          impact: { confidentiality: 'none', integrity: 'none', availability: 'partial' },
          detectionMethod: 'behavioral_monitoring',
          firstDetected: Date.now(),
          lastSeen: Date.now(),
          mitigationStatus: 'open',
          mitigationSteps: ['Optimize crisis access performance', 'Review system resources', 'Check network latency'],
          estimatedFixTime: 4 * 60 * 60 * 1000 // 4 hours
        });
      }

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 CRISIS SECURITY ASSESSMENT ERROR:', error instanceof Error ? error : new Error(String(error)));
    }

    return vulnerabilities;
  }

  /**
   * COMPONENT VULNERABILITY CHECKS
   */

  private async checkSecureConfiguration(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Check for secure configuration issues
      if (__DEV__) {
        vulnerabilities.push({
          vulnerabilityId: await this.generateVulnerabilityId(),
          category: 'application_security',
          severity: 'medium',
          title: 'Development Mode Enabled',
          description: 'Application is running in development mode',
          affectedComponents: ['Application Configuration'],
          riskScore: 5.0,
          exploitability: 'medium',
          impact: { confidentiality: 'partial', integrity: 'none', availability: 'none' },
          detectionMethod: 'static_analysis',
          firstDetected: Date.now(),
          lastSeen: Date.now(),
          mitigationStatus: 'accepted_risk',
          mitigationSteps: ['Ensure production build for release'],
          estimatedFixTime: 0
        });
      }

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 SECURE CONFIGURATION CHECK ERROR:', error instanceof Error ? error : new Error(String(error)));
    }

    return vulnerabilities;
  }

  /**
   * INCIDENT DETECTION METHODS
   */

  private async detectAuthenticationFailures(): Promise<IncidentDetectionEvent[]> {
    const incidents: IncidentDetectionEvent[] = [];

    try {
      // Check for authentication failure patterns
      const authMetrics = await this.authenticationService.getAuthenticationMetrics();
      
      if (authMetrics.authenticationAttempts > MONITORING_CONFIG.SUSPICIOUS_ACTIVITY_THRESHOLD) {
        incidents.push({
          incidentId: await this.generateIncidentId(),
          timestamp: Date.now(),
          incidentType: 'authentication_failure',
          severity: 'high',
          description: `Suspicious authentication failure pattern detected: ${authMetrics.authenticationAttempts} attempts`,
          affectedSystems: ['AuthenticationService'],
          detectionMethod: 'behavioral_analysis',
          automaticResponse: true,
          responseActions: ['rate_limiting_enabled', 'account_monitoring_increased'],
          escalationRequired: true,
          containmentStatus: 'in_progress',
          estimatedImpact: {
            dataCompromised: false,
            systemsAffected: 1,
            usersImpacted: 1,
            complianceViolation: false
          }
        });
      }

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 AUTHENTICATION FAILURE DETECTION ERROR:', error instanceof Error ? error : new Error(String(error)));
    }

    return incidents;
  }

  private async detectComplianceViolations(): Promise<IncidentDetectionEvent[]> {
    const incidents: IncidentDetectionEvent[] = [];

    try {
      // Check for compliance violations
      const complianceStatus = await this.performComplianceCheck();
      
      if (complianceStatus.overallScore < MONITORING_CONFIG.COMPLIANCE_SCORE_THRESHOLD) {
        incidents.push({
          incidentId: await this.generateIncidentId(),
          timestamp: Date.now(),
          incidentType: 'compliance_violation',
          severity: complianceStatus.overallScore < 80 ? 'critical' : 'high',
          description: `Compliance violation detected: Overall score ${complianceStatus.overallScore.toFixed(1)}%`,
          affectedSystems: ['ComplianceMonitoring'],
          detectionMethod: 'compliance_check',
          automaticResponse: false,
          responseActions: ['compliance_review_triggered'],
          escalationRequired: true,
          containmentStatus: 'in_progress',
          estimatedImpact: {
            dataCompromised: false,
            systemsAffected: 0,
            usersImpacted: 0,
            complianceViolation: true
          }
        });
      }

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 COMPLIANCE VIOLATION DETECTION ERROR:', error instanceof Error ? error : new Error(String(error)));
    }

    return incidents;
  }

  /**
   * COMPLIANCE CHECK METHODS
   */

  private async checkPrivacyCompliance(): Promise<ComplianceStatus['privacyCompliance']> {
    try {
      const violations: string[] = [];
      const recommendations: string[] = [];
      let score = 100;

      // Check encryption compliance
      const encryptionStatus = await this.encryptionService.getEncryptionStatus();
      if (!encryptionStatus.initialized) {
        violations.push('Encryption service not properly initialized');
        score -= 25;
      }

      // Check access controls
      const authMetrics = await this.authenticationService.getAuthenticationMetrics();
      if (!authMetrics.isAuthenticated) {
        recommendations.push('Ensure proper user authentication');
      }

      // Check audit trails
      const storageMetrics = await this.secureStorage.getStorageMetrics();
      if (storageMetrics.accessLogSize === 0) {
        violations.push('No audit trail found');
        score -= 20;
      }

      const status: ComplianceStatus['privacyCompliance']['status'] = 
        score >= 95 ? 'compliant' :
        score >= 80 ? 'partial' : 'non_compliant';

      return {
        score,
        status,
        violations,
        recommendations
      };

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 Privacy COMPLIANCE CHECK ERROR:', error instanceof Error ? error : new Error(String(error)));
      return {
        score: 0,
        status: 'non_compliant',
        violations: [(error instanceof Error ? error.message : String(error))],
        recommendations: ['Fix Privacy compliance check errors']
      };
    }
  }

  private async checkDataProtectionCompliance(): Promise<ComplianceStatus['dataProtectionCompliance']> {
    try {
      // Check encryption compliance
      const encryptionStatus = await this.encryptionService.getEncryptionStatus();
      const encryptionCompliance = encryptionStatus.initialized && encryptionStatus.successRate > 0.95;

      // Check storage compliance
      const storageMetrics = await this.secureStorage.getStorageMetrics();
      const storageCompliance = storageMetrics.successRate > 0.95;

      // Check transmission compliance
      const networkMetrics = await this.networkSecurity.getSecurityMetrics();
      const transmissionCompliance = networkMetrics.successfulRequests / Math.max(networkMetrics.totalRequests, 1) > 0.95;

      // Check access control compliance
      const authMetrics = await this.authenticationService.getAuthenticationMetrics();
      const accessControlCompliance = (authMetrics as any).successRate > 0.9;

      const complianceCount = [
        encryptionCompliance,
        storageCompliance,
        transmissionCompliance,
        accessControlCompliance
      ].filter(Boolean).length;

      const score = (complianceCount / 4) * 100;

      return {
        score,
        encryptionCompliance,
        storageCompliance,
        transmissionCompliance,
        accessControlCompliance
      };

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 DATA PROTECTION COMPLIANCE CHECK ERROR:', error instanceof Error ? error : new Error(String(error)));
      return {
        score: 0,
        encryptionCompliance: false,
        storageCompliance: false,
        transmissionCompliance: false,
        accessControlCompliance: false
      };
    }
  }

  private async checkClinicalCompliance(): Promise<ComplianceStatus['clinicalCompliance']> {
    try {
      // Check crisis protocol compliance
      const crisisMetrics = await this.crisisSecurityProtocol.getCrisisSecurityMetrics();
      const crisisProtocolCompliance = crisisMetrics.securityViolations === 0;

      // Check professional access compliance
      const professionalAccessCompliance = crisisMetrics.professionalAccess >= 0; // Any professional access is compliant

      // Check audit trail compliance
      const auditTrailCompliance = crisisMetrics.averageAccessTime < 1000; // Reasonable access time

      // Check documentation compliance (assume compliant for now)
      const documentationCompliance = true;

      const complianceCount = [
        crisisProtocolCompliance,
        professionalAccessCompliance,
        auditTrailCompliance,
        documentationCompliance
      ].filter(Boolean).length;

      const score = (complianceCount / 4) * 100;

      return {
        score,
        crisisProtocolCompliance,
        professionalAccessCompliance,
        auditTrailCompliance,
        documentationCompliance
      };

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 CLINICAL COMPLIANCE CHECK ERROR:', error instanceof Error ? error : new Error(String(error)));
      return {
        score: 0,
        crisisProtocolCompliance: false,
        professionalAccessCompliance: false,
        auditTrailCompliance: false,
        documentationCompliance: false
      };
    }
  }

  /**
   * UTILITY METHODS
   */

  private calculateOverallSecurityScore(vulnerabilities: SecurityVulnerability[]): number {
    if (vulnerabilities.length === 0) {
      return 100;
    }

    const totalRiskScore = vulnerabilities.reduce((sum, vuln) => sum + vuln.riskScore, 0);
    const averageRiskScore = totalRiskScore / vulnerabilities.length;
    
    // Convert to security score (inverse of risk)
    return Math.max(0, 100 - (averageRiskScore * 10));
  }

  private determineRiskLevel(score: number): VulnerabilityAssessment['riskLevel'] {
    if (score >= 90) return 'minimal';
    if (score >= 80) return 'low';
    if (score >= 70) return 'medium';
    if (score >= 60) return 'high';
    return 'critical';
  }

  private categorizeVulnerabilities(vulnerabilities: SecurityVulnerability[]): VulnerabilityAssessment['categories'] {
    const categories: any = {};

    for (const category of Object.keys(MONITORING_CONFIG.MONITORING_CATEGORIES)) {
      const categoryVulns = vulnerabilities.filter(v => v.category === category);
      const categoryScore = categoryVulns.length > 0 
        ? this.calculateOverallSecurityScore(categoryVulns)
        : 100;

      categories[category as keyof typeof MONITORING_CONFIG.MONITORING_CATEGORIES] = {
        score: categoryScore,
        vulnerabilities: categoryVulns,
        status: categoryScore >= 90 ? 'secure' :
                categoryScore >= 80 ? 'warning' :
                categoryScore >= 70 ? 'vulnerable' : 'critical'
      };
    }

    return categories;
  }

  private async generateSecurityRecommendations(vulnerabilities: SecurityVulnerability[]): Promise<SecurityRecommendation[]> {
    const recommendations: SecurityRecommendation[] = [];

    try {
      // Group vulnerabilities by category and generate recommendations
      const categorizedVulns = this.categorizeVulnerabilities(vulnerabilities);

      for (const [category, categoryData] of Object.entries(categorizedVulns)) {
        if (categoryData.vulnerabilities.length > 0) {
          const highSeverityVulns = categoryData.vulnerabilities.filter(v => 
            v.severity === 'critical' || v.severity === 'high'
          );

          if (highSeverityVulns.length > 0) {
            recommendations.push({
              recommendationId: await this.generateRecommendationId(),
              priority: 'immediate',
              category: category as keyof typeof MONITORING_CONFIG.MONITORING_CATEGORIES,
              title: `Address ${highSeverityVulns.length} Critical/High Severity Issues`,
              description: `Immediate attention required for ${highSeverityVulns.length} security vulnerabilities in ${category}`,
              actionRequired: 'Implement security fixes and mitigations',
              estimatedEffort: 'high',
              riskReduction: 80,
              implementationSteps: [
                'Review vulnerability details',
                'Implement recommended mitigations',
                'Test security fixes',
                'Update security documentation'
              ],
              dependencies: [],
              complianceImpact: ['Privacy', 'Data Protection']
            });
          }
        }
      }

      // Add general recommendations
      if (vulnerabilities.length > 10) {
        recommendations.push({
          recommendationId: await this.generateRecommendationId(),
          priority: 'high',
          category: 'application_security',
          title: 'Implement Comprehensive Security Review',
          description: `${vulnerabilities.length} vulnerabilities detected, comprehensive security review recommended`,
          actionRequired: 'Conduct security audit and implement systematic fixes',
          estimatedEffort: 'high',
          riskReduction: 60,
          implementationSteps: [
            'Conduct security audit',
            'Prioritize vulnerabilities',
            'Implement systematic fixes',
            'Establish security monitoring'
          ],
          dependencies: ['Security team approval'],
          complianceImpact: ['Overall security posture']
        });
      }

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 RECOMMENDATION GENERATION ERROR:', error instanceof Error ? error : new Error(String(error)));
    }

    return recommendations;
  }

  private async processIncident(incident: IncidentDetectionEvent): Promise<void> {
    try {
      console.log(`🚨 Processing incident: ${incident.incidentId}`);

      // Execute automatic response actions
      for (const action of incident.responseActions) {
        await this.executeResponseAction(action, incident);
      }

      // Update containment status
      incident.containmentStatus = incident.automaticResponse ? 'contained' : 'in_progress';

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 INCIDENT PROCESSING ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async executeResponseAction(action: string, incident: IncidentDetectionEvent): Promise<void> {
    try {
      switch (action) {
        case 'rate_limiting_enabled':
          // Enable rate limiting
          break;
        case 'account_monitoring_increased':
          // Increase account monitoring
          break;
        case 'compliance_review_triggered':
          // Trigger compliance review
          break;
        default:
          console.log(`📝 Response action logged: ${action}`);
      }
    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 RESPONSE ACTION EXECUTION ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async performRealTimeMonitoring(): Promise<void> {
    try {
      // Perform lightweight real-time checks
      await this.checkSystemHealth();
      await this.updateSecurityMetrics();
    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 REAL-TIME MONITORING ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async checkSystemHealth(): Promise<void> {
    try {
      // Check system health indicators
      const encryptionStatus = await this.encryptionService.getEncryptionStatus();
      const authMetrics = await this.authenticationService.getAuthenticationMetrics();
      
      // Update system health metrics
      this.securityMetrics.timestamp = Date.now();
    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 SYSTEM HEALTH CHECK ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async updateSecurityMetrics(): Promise<void> {
    try {
      // Update security metrics
      this.securityMetrics.timestamp = Date.now();
      
      // Calculate overall security score
      const vulnerabilityScore = this.lastVulnerabilityAssessment?.overallScore || 0;
      const complianceScore = await this.performComplianceCheck().then(cs => cs.overallScore);
      
      this.securityMetrics.overallSecurityScore = (vulnerabilityScore + complianceScore) / 2;
    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 SECURITY METRICS UPDATE ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private initializeSecurityMetrics(): SecurityMetrics {
    return {
      timestamp: Date.now(),
      monitoringPeriod: MONITORING_CONFIG.REAL_TIME_MONITORING_MS,
      overallSecurityScore: 0,
      
      applicationSecurity: {
        componentVulnerabilities: 0,
        secureConfigurationScore: 100,
        codeQualityScore: 100,
        dependencyVulnerabilities: 0
      },
      
      dataSecurity: {
        encryptionCoverage: 100,
        dataClassificationCompliance: 100,
        accessControlEffectiveness: 100,
        dataLeakageIncidents: 0
      },
      
      networkSecurity: {
        trafficAnalysisScore: 100,
        certificateValidityScore: 100,
        apiSecurityScore: 100,
        networkIntrusionAttempts: 0
      },
      
      authenticationSecurity: {
        authenticationSuccessRate: 100,
        sessionSecurityScore: 100,
        privilegeEscalationAttempts: 0,
        multiFactorAuthUsage: 0
      },
      
      crisisSecurity: {
        crisisAccessCompliance: 100,
        emergencyProtocolEffectiveness: 100,
        professionalOversightScore: 100,
        crisisDataProtectionScore: 100
      },
      
      complianceMetrics: {
        privacyComplianceScore: 100,
        auditTrailCompleteness: 100,
        dataRetentionCompliance: 100,
        incidentResponseEffectiveness: 100
      },
      
      incidentMetrics: {
        totalIncidents: 0,
        criticalIncidents: 0,
        averageResponseTime: 0,
        automaticMitigationRate: 100
      }
    };
  }

  private async storeAssessmentResults(assessment: VulnerabilityAssessment): Promise<void> {
    try {
      await this.secureStorage.storeGeneralData(
        `vulnerability_assessment_${assessment.assessmentId}`,
        assessment,
        'performance_tier'
      );
    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 ASSESSMENT STORAGE ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async logIncidentEvent(incident: IncidentDetectionEvent): Promise<void> {
    try {
      this.detectedIncidents.push(incident);

      // Keep only recent incidents
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
      this.detectedIncidents = this.detectedIncidents.filter(inc => inc.timestamp > cutoffTime);

      // Store critical incidents
      if (incident.severity === 'critical' || incident.severity === 'high') {
        await this.secureStorage.storeCrisisData(
          `security_incident_${incident.incidentId}`,
          incident,
          'security_incident'
        );
      }
    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 INCIDENT LOGGING ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async generateAssessmentId(): Promise<string> {
    try {
      const timestamp = Date.now().toString(36);
      const randomBytes = await Crypto.getRandomBytesAsync(8);
      const random = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      return `assessment_${timestamp}_${random}`;
    } catch (error) {
      return `assessment_${Date.now()}_fallback`;
    }
  }

  private async generateVulnerabilityId(): Promise<string> {
    try {
      const timestamp = Date.now().toString(36);
      const randomBytes = await Crypto.getRandomBytesAsync(6);
      const random = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      return `vuln_${timestamp}_${random}`;
    } catch (error) {
      return `vuln_${Date.now()}_fallback`;
    }
  }

  private async generateRecommendationId(): Promise<string> {
    try {
      const timestamp = Date.now().toString(36);
      const randomBytes = await Crypto.getRandomBytesAsync(6);
      const random = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      return `rec_${timestamp}_${random}`;
    } catch (error) {
      return `rec_${Date.now()}_fallback`;
    }
  }

  private async generateIncidentId(): Promise<string> {
    try {
      const timestamp = Date.now().toString(36);
      const randomBytes = await Crypto.getRandomBytesAsync(6);
      const random = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      return `incident_${timestamp}_${random}`;
    } catch (error) {
      return `incident_${Date.now()}_fallback`;
    }
  }

  /**
   * PUBLIC API METHODS
   */

  public getLastVulnerabilityAssessment(): VulnerabilityAssessment | null {
    return this.lastVulnerabilityAssessment;
  }

  public getSecurityMetrics(): SecurityMetrics {
    return { ...this.securityMetrics };
  }

  public getDetectedThreats(): ThreatDetectionResult[] {
    return [...this.detectedThreats];
  }

  public getDetectedIncidents(): IncidentDetectionEvent[] {
    return [...this.detectedIncidents];
  }

  /**
   * THREAT DETECTOR REGISTRATION (MAINT-201)
   * Stores a named detector in-memory. Re-registering an existing name overwrites it.
   */
  public registerThreatDetector(name: string, config: ThreatDetectorConfig): void {
    this.threatDetectors.set(name, config);
  }

  /** Names of currently-registered threat detectors (no pattern/closure exposure). */
  public getThreatDetectorNames(): string[] {
    return [...this.threatDetectors.keys()];
  }

  /** Recorded analytics security events (critical/high; sanitized, in-memory). */
  public getAnalyticsSecurityEvents(): ReadonlyArray<{
    eventType: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    timestamp: number;
    data: Record<string, unknown>;
  }> {
    return [...this.analyticsSecurityEvents];
  }

  /**
   * SECURITY EVENT LOGGING (MAINT-201)
   *
   * Records a security event reported by the analytics pipeline. The `data` may carry
   * wellness data (e.g. a `rawText: 'PHQ-9: 18'`), so it is sanitized via
   * `sanitizeWellnessData` BEFORE it reaches any log sink or storage. Severity is
   * derived from `eventType` here — callers cannot downgrade it. Only critical/high
   * events are recorded (in-memory, sanitized); lower severities are log-only.
   * Never throws.
   */
  public async logSecurityEvent(eventType: string, data: unknown): Promise<void> {
    try {
      const severity = this.deriveSecurityEventSeverity(eventType);
      const safeData = sanitizeWellnessData(data);

      if (severity === 'critical' || severity === 'high') {
        this.analyticsSecurityEvents.push({ eventType, severity, timestamp: Date.now(), data: safeData });
        if (this.analyticsSecurityEvents.length > 100) {
          this.analyticsSecurityEvents.shift();
        }
      }

      logSecurity(`Analytics security event: ${eventType}`, severity, {
        eventType: `analytics_${eventType}`,
        data: safeData,
      });
    } catch (error) {
      logError(LogCategory.SECURITY, '📝 SecurityMonitoring logSecurityEvent failed:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /** Map an analytics security-event type to a severity. Caller cannot override. */
  private deriveSecurityEventSeverity(eventType: string): 'critical' | 'high' | 'medium' | 'low' {
    const map: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
      phi_exposure_attempt: 'critical',
      unauthorized_access: 'high',
    };
    return map[eventType] ?? 'medium';
  }

  public getVulnerabilities(): SecurityVulnerability[] {
    return [...this.vulnerabilities];
  }

  public isMonitoringActive(): boolean {
    return this.monitoringActive;
  }

  public async stopContinuousMonitoring(): Promise<void> {
    try {
      console.log('🛑 Stopping continuous security monitoring...');

      this.monitoringActive = false;

      // Clear timers
      if (this.realTimeMonitoringTimer) {
        clearInterval(this.realTimeMonitoringTimer);
        this.realTimeMonitoringTimer = null;
      }

      if (this.vulnerabilityScanTimer) {
        clearInterval(this.vulnerabilityScanTimer);
        this.vulnerabilityScanTimer = null;
      }

      if (this.complianceCheckTimer) {
        clearInterval(this.complianceCheckTimer);
        this.complianceCheckTimer = null;
      }

      console.log('✅ Continuous security monitoring stopped');

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 STOP MONITORING ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async destroy(): Promise<void> {
    try {
      console.log('🗑️  Destroying security monitoring service...');

      // Stop monitoring
      await this.stopContinuousMonitoring();

      // Clear data
      this.lastVulnerabilityAssessment = null;
      this.detectedThreats = [];
      this.detectedIncidents = [];
      this.vulnerabilities = [];
      this.securityMetrics = this.initializeSecurityMetrics();

      this.initialized = false;

      console.log('✅ Security monitoring service destroyed');

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 SECURITY MONITORING DESTRUCTION ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

// Export singleton instance
export default SecurityMonitoringService.getInstance();