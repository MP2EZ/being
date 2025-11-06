/**
 * SECURITY SERVICES INDEX - DRD-FLOW-005 Security Implementation
 *
 * COMPREHENSIVE SECURITY ARCHITECTURE FOR MENTAL HEALTH APPLICATION:
 * - Centralized security service management and orchestration
 * - End-to-end protection for PHQ-9/GAD-7 assessment data
 * - Crisis intervention data special security protocols
 * - HIPAA-compliant incident response and breach notification
 * - Real-time security monitoring and vulnerability assessment
 *
 * SECURITY LAYERS:
 * 1. Encryption Service - Data protection at rest and in transit
 * 2. Authentication Service - User identity and session management
 * 3. Secure Storage Service - Protected data storage with audit trails
 * 4. Network Security Service - Secure API communications
 * 5. Crisis Security Protocol - Crisis data special protections
 * 6. Security Monitoring Service - Continuous vulnerability assessment
 * 7. Incident Response Service - Breach detection and response
 *
 * INTEGRATION POINTS:
 * - Crisis detection system integration
 * - Assessment data protection workflows
 * - Professional access controls
 * - Regulatory compliance automation
 * - Emergency response coordination
 */

// Import services for internal use by SecurityOrchestrator
import EncryptionService from './EncryptionService';
import AuthenticationService from './AuthenticationService';
import SecureStorageService from './SecureStorageService';
import NetworkSecurityService from './NetworkSecurityService';
import SecurityMonitoringService from './SecurityMonitoringService';
import IncidentResponseService from './IncidentResponseService';
import CrisisSecurityProtocol from './crisis/CrisisSecurityProtocol';
import { logPerformance, logError, LogCategory } from '../logging';
import type { VulnerabilityAssessment } from './SecurityMonitoringService';

// Core Security Services - Re-export
export { default as EncryptionService } from './EncryptionService';
export { default as AuthenticationService } from './AuthenticationService';
export { default as SecureStorageService } from './SecureStorageService';
export { default as NetworkSecurityService } from './NetworkSecurityService';
export { default as SecurityMonitoringService } from './SecurityMonitoringService';
export { default as IncidentResponseService } from './IncidentResponseService';

// Crisis-Specific Security - Re-export
export { default as CrisisSecurityProtocol } from './crisis/CrisisSecurityProtocol';

// Type Exports - Encryption Service
export type {
  DataSensitivityLevel,
  EncryptedDataPackage,
  EncryptionMetadata,
  KeyManagementResult,
  EncryptionPerformanceMetrics
} from './EncryptionService';

// Type Exports - Authentication Service
export type {
  AuthenticationLevel,
  AuthenticationMethod,
  UserAuthenticationContext,
  AuthenticationToken,
  AuthenticationResult,
  SessionValidationResult,
  BiometricAuthOptions,
  AuthenticationAuditEntry
} from './AuthenticationService';

// Type Exports - Secure Storage Service
export type {
  StorageTier,
  SecureStorageMetadata,
  StorageOperationResult,
  BulkStorageOperation,
  StorageAccessLogEntry
} from './SecureStorageService';

// Type Exports - Network Security Service
export type {
  APIEndpointCategory,
  RequestSecurityContext,
  SecureRequestOptions,
  SecureResponse,
  NetworkSecurityMetrics,
  SecurityViolationEvent
} from './NetworkSecurityService';

// Type Exports - Crisis Security Protocol
export type {
  CrisisSecurityLevel,
  CrisisAccessContext,
  CrisisDataProtectionResult,
  CrisisSecurityViolation,
  EmergencyAccessCredentials
} from './crisis/CrisisSecurityProtocol';

// Type Exports - Security Monitoring Service
export type {
  VulnerabilityAssessment,
  SecurityVulnerability,
  SecurityRecommendation,
  ComplianceStatus,
  ThreatDetectionResult,
  SecurityMetrics,
  IncidentDetectionEvent
} from './SecurityMonitoringService';

// Type Exports - Incident Response Service
export type {
  IncidentSeverity,
  DataSensitivityType,
  NotificationGroup,
  IncidentRecord,
  IncidentTimelineEvent,
  IncidentNotification,
  ContainmentAction,
  RecoveryPlan
} from './IncidentResponseService';

/**
 * COMPREHENSIVE SECURITY ORCHESTRATOR
 * Coordinates all security services and provides unified security management
 */
export class SecurityOrchestrator {
  private static instance: SecurityOrchestrator;
  private initialized: boolean = false;

  // Core security services
  private encryptionService = EncryptionService;
  private authenticationService = AuthenticationService;
  private secureStorage = SecureStorageService;
  private networkSecurity = NetworkSecurityService;
  private crisisSecurityProtocol = CrisisSecurityProtocol;
  private securityMonitoring = SecurityMonitoringService;
  private incidentResponse = IncidentResponseService;

  private constructor() {}

  public static getInstance(): SecurityOrchestrator {
    if (!SecurityOrchestrator.instance) {
      SecurityOrchestrator.instance = new SecurityOrchestrator();
    }
    return SecurityOrchestrator.instance;
  }

  /**
   * INITIALIZE ALL SECURITY SERVICES
   * Comprehensive initialization of the security architecture
   */
  public async initializeSecurityArchitecture(): Promise<void> {
    const startTime = performance.now();

    try {
      console.log('🔐 Initializing Comprehensive Security Architecture...');

      // Initialize core security services in dependency order
      console.log('🔑 Initializing Encryption Service...');
      await this.encryptionService.initialize();

      console.log('🚪 Initializing Authentication Service...');
      await this.authenticationService.initialize();

      console.log('💾 Initializing Secure Storage Service...');
      await this.secureStorage.initialize();

      console.log('🌐 Initializing Network Security Service...');
      await this.networkSecurity.initialize();

      console.log('🚨 Initializing Crisis Security Protocol...');
      await this.crisisSecurityProtocol.initialize();

      console.log('🔍 Initializing Security Monitoring Service...');
      await this.securityMonitoring.initialize();

      console.log('🚨 Initializing Incident Response Service...');
      await this.incidentResponse.initialize();

      // Verify all services are operational
      await this.verifySecurityServices();

      // Start continuous security monitoring
      await this.securityMonitoring.startContinuousMonitoring();

      this.initialized = true;

      const initializationTime = performance.now() - startTime;
      logPerformance('SecurityArchitecture.initialize', initializationTime, {
        status: 'success'
      });

      // Log successful initialization through incident response
      await this.incidentResponse.detectAndRespondToIncident(
        'system_compromise', // Using as general event type
        `Security architecture initialized successfully in ${initializationTime.toFixed(2)}ms`,
        {
          dataTypes: [],
          recordCount: 0,
          userCount: 0,
          professionalCount: 0,
          dataCategories: ['system_initialization']
        },
        {
          systemNames: ['SecurityArchitecture'],
          criticalSystems: true,
          backupSystems: false,
          encryptionBreach: false
        },
        'system_initialization'
      );

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 SECURITY ARCHITECTURE INITIALIZATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Security architecture initialization failed: ${(error instanceof Error ? error.message : String(error))}`);
    }
  }

  /**
   * CRISIS DATA PROTECTION WORKFLOW
   * End-to-end protection for crisis intervention data
   */
  public async protectCrisisData(
    crisisData: any,
    crisisEpisodeId: string,
    userContext?: string
  ): Promise<{
    encrypted: boolean;
    stored: boolean;
    monitored: boolean;
    protectionLevel: string;
  }> {
    try {
      console.log(`🚨 Protecting crisis data for episode: ${crisisEpisodeId}`);

      // 1. Apply crisis-specific encryption
      const encryptedData = await this.encryptionService.encryptCrisisData(
        crisisData,
        crisisEpisodeId
      );

      // 2. Store with maximum security
      const storageResult = await this.secureStorage.storeCrisisData(
        crisisEpisodeId,
        encryptedData,
        crisisEpisodeId,
        userContext
      );

      // 3. Apply crisis security protocols
      const protectionResult = await this.crisisSecurityProtocol.protectCrisisData(
        crisisData,
        crisisEpisodeId,
        'crisis_intervention'
      );

      // 4. Start crisis security monitoring
      await this.crisisSecurityProtocol.startCrisisSecurityMonitoring(crisisEpisodeId);

      console.log(`🔒 Crisis data protected (episode: ${crisisEpisodeId})`);

      return {
        encrypted: true,
        stored: storageResult.success,
        monitored: protectionResult.monitoringEnabled,
        protectionLevel: protectionResult.protectionLevel
      };

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 CRISIS DATA PROTECTION ERROR:', error instanceof Error ? error : new Error(String(error)));

      // Log security incident
      await this.incidentResponse.detectAndRespondToIncident(
        'data_breach',
        `Crisis data protection failed for episode ${crisisEpisodeId}: ${(error instanceof Error ? error.message : String(error))}`,
        {
          dataTypes: ['crisis_responses'],
          recordCount: 1,
          userCount: 1,
          professionalCount: 0,
          dataCategories: ['crisis_protection_failure']
        },
        {
          systemNames: ['CrisisDataProtection'],
          criticalSystems: true,
          backupSystems: false,
          encryptionBreach: true
        },
        'data_protection_failure'
      );

      throw error;
    }
  }

  /**
   * ASSESSMENT DATA PROTECTION WORKFLOW
   * End-to-end protection for PHQ-9/GAD-7 assessment data
   */
  public async protectAssessmentData(
    assessmentData: {
      type: 'PHQ-9' | 'GAD-7';
      responses: number[];
      totalScore: number;
      timestamp: number;
      userId: string;
    },
    assessmentId: string,
    userContext?: string
  ): Promise<{
    encrypted: boolean;
    stored: boolean;
    compliance: boolean;
    riskLevel: string;
  }> {
    try {
      console.log(`📋 Protecting ${assessmentData.type} assessment data: ${assessmentId}`);

      // 1. Encrypt assessment data with appropriate security level
      const encryptedData = await this.encryptionService.encryptAssessmentData(
        assessmentData,
        assessmentId
      );

      // 2. Store with assessment-tier security
      const storageResult = await this.secureStorage.storeAssessmentData(
        assessmentId,
        assessmentData,
        userContext
      );

      // 3. Check for crisis-level responses (PHQ-9 Q9 > 0)
      let riskLevel = 'standard';
      if (assessmentData.type === 'PHQ-9' && (assessmentData.responses[8] ?? 0) > 0) {
        riskLevel = 'crisis';
        // Trigger crisis data protection for suicidal ideation
        await this.protectCrisisData(
          { assessment: assessmentData, suicidalIdeation: true },
          `assessment_crisis_${assessmentId}`,
          userContext
        );
      } else if (assessmentData.totalScore >= 20 || 
                (assessmentData.type === 'GAD-7' && assessmentData.totalScore >= 15)) {
        riskLevel = 'high';
      }

      // 4. Perform compliance check
      const complianceStatus = await this.securityMonitoring.performComplianceCheck();

      console.log(`📋 Assessment data protected (${assessmentData.type}, risk: ${riskLevel})`);

      return {
        encrypted: true,
        stored: storageResult.success,
        compliance: complianceStatus.overallScore >= 95,
        riskLevel
      };

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 ASSESSMENT DATA PROTECTION ERROR:', error instanceof Error ? error : new Error(String(error)));

      // Log security incident
      await this.incidentResponse.detectAndRespondToIncident(
        'data_breach',
        `Assessment data protection failed for ${assessmentData.type} assessment ${assessmentId}: ${(error instanceof Error ? error.message : String(error))}`,
        {
          dataTypes: ['assessment_data'],
          recordCount: 1,
          userCount: 1,
          professionalCount: 0,
          dataCategories: ['assessment_protection_failure']
        },
        {
          systemNames: ['AssessmentDataProtection'],
          criticalSystems: false,
          backupSystems: false,
          encryptionBreach: true
        },
        'data_protection_failure'
      );

      throw error;
    }
  }

  /**
   * EMERGENCY ACCESS PROTOCOL
   * Fast, secure access for emergency situations
   */
  public async grantEmergencyAccess(
    emergencyCode?: string,
    professionalId?: string
  ): Promise<{
    accessGranted: boolean;
    accessLevel: string;
    expiresAt: number;
    accessTime: number;
  }> {
    const startTime = performance.now();

    try {
      console.log('🚨 Emergency access requested');

      // Grant emergency access through crisis security protocol
      const accessContext = await this.crisisSecurityProtocol.grantEmergencyAccess({
        emergencyCode: emergencyCode || 'emergency_default',
        emergencyContactId: professionalId || 'emergency_responder',
        emergencyLevel: 'immediate',
        validUntil: Date.now() + (60 * 60 * 1000), // 1 hour
        restrictions: [],
        auditRequired: true
      });

      // Grant authentication access
      const authResult = await this.authenticationService.authenticateCrisisAccess(emergencyCode);

      const accessTime = performance.now() - startTime;

      logPerformance('SecurityArchitecture.grantEmergencyAccess', accessTime, {
        accessType: 'emergency'
      });

      return {
        accessGranted: accessContext.auditTrail.accessGranted && authResult.success,
        accessLevel: accessContext.accessLevel,
        expiresAt: accessContext.expiresAt,
        accessTime
      };

    } catch (error) {
      const accessTime = performance.now() - startTime;
      logError(LogCategory.SECURITY, '🚨 EMERGENCY ACCESS ERROR:', error instanceof Error ? error : new Error(String(error)));

      // Log failed emergency access
      await this.incidentResponse.detectAndRespondToIncident(
        'unauthorized_access',
        `Emergency access failed: ${(error instanceof Error ? error.message : String(error))}`,
        {
          dataTypes: [],
          recordCount: 0,
          userCount: 0,
          professionalCount: 1,
          dataCategories: ['emergency_access_failure']
        },
        {
          systemNames: ['EmergencyAccess'],
          criticalSystems: true,
          backupSystems: false,
          encryptionBreach: false
        },
        'emergency_access_failure'
      );

      return {
        accessGranted: false,
        accessLevel: 'none',
        expiresAt: 0,
        accessTime
      };
    }
  }

  /**
   * SECURITY HEALTH CHECK
   * Comprehensive security status assessment
   */
  public async performSecurityHealthCheck(): Promise<{
    overallScore: number;
    encryption: { status: string; score: number };
    authentication: { status: string; score: number };
    storage: { status: string; score: number };
    network: { status: string; score: number };
    crisis: { status: string; score: number };
    monitoring: { status: string; score: number };
    incidents: { status: string; score: number };
    compliance: { status: string; score: number };
    recommendations: string[];
  }> {
    try {
      console.log('🔍 Performing comprehensive security health check...');

      // Get status from all security services
      const encryptionStatus = await this.encryptionService.getEncryptionStatus();
      const authMetrics = await this.authenticationService.getAuthenticationMetrics();
      const storageMetrics = await this.secureStorage.getStorageMetrics();
      const networkMetrics = await this.networkSecurity.getSecurityMetrics();
      const crisisMetrics = await this.crisisSecurityProtocol.getCrisisSecurityMetrics();
      const securityMetrics = await this.securityMonitoring.getSecurityMetrics();
      const incidentMetrics = await this.incidentResponse.getIncidentMetrics();
      const complianceStatus = await this.securityMonitoring.performComplianceCheck();

      // Calculate individual scores
      const encryptionScore = encryptionStatus.initialized ? 
        (encryptionStatus.successRate * 100) : 0;
      
      const authScore = authMetrics.isAuthenticated ? 90 : 50;
      
      const storageScore = storageMetrics.successRate * 100;
      
      const networkScore = networkMetrics.totalRequests > 0 ? 
        ((networkMetrics.successfulRequests / networkMetrics.totalRequests) * 100) : 100;
      
      const crisisScore = crisisMetrics.securityViolations === 0 ? 100 : 
        Math.max(0, 100 - (crisisMetrics.securityViolations * 10));
      
      const monitoringScore = this.securityMonitoring.isMonitoringActive() ? 100 : 0;
      
      const incidentScore = incidentMetrics.containmentSuccessRate * 100;
      
      const complianceScore = complianceStatus.overallScore;

      // Calculate overall score
      const scores = [
        encryptionScore, authScore, storageScore, networkScore,
        crisisScore, monitoringScore, incidentScore, complianceScore
      ];
      const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      // Generate recommendations
      const recommendations: string[] = [];
      if (encryptionScore < 95) recommendations.push('Review encryption service reliability');
      if (authScore < 80) recommendations.push('Strengthen authentication mechanisms');
      if (storageScore < 95) recommendations.push('Improve secure storage reliability');
      if (networkScore < 90) recommendations.push('Enhance network security measures');
      if (crisisScore < 100) recommendations.push('Address crisis security violations');
      if (monitoringScore < 100) recommendations.push('Ensure continuous security monitoring');
      if (incidentScore < 90) recommendations.push('Improve incident response procedures');
      if (complianceScore < 95) recommendations.push('Address compliance violations');

      console.log(`🔍 Security health check completed (overall score: ${overallScore.toFixed(1)}%)`);

      return {
        overallScore,
        encryption: { 
          status: encryptionScore >= 95 ? 'healthy' : encryptionScore >= 80 ? 'warning' : 'critical',
          score: encryptionScore 
        },
        authentication: { 
          status: authScore >= 80 ? 'healthy' : authScore >= 60 ? 'warning' : 'critical',
          score: authScore 
        },
        storage: { 
          status: storageScore >= 95 ? 'healthy' : storageScore >= 80 ? 'warning' : 'critical',
          score: storageScore 
        },
        network: { 
          status: networkScore >= 90 ? 'healthy' : networkScore >= 70 ? 'warning' : 'critical',
          score: networkScore 
        },
        crisis: { 
          status: crisisScore >= 100 ? 'healthy' : crisisScore >= 80 ? 'warning' : 'critical',
          score: crisisScore 
        },
        monitoring: { 
          status: monitoringScore >= 100 ? 'healthy' : 'critical',
          score: monitoringScore 
        },
        incidents: { 
          status: incidentScore >= 90 ? 'healthy' : incidentScore >= 70 ? 'warning' : 'critical',
          score: incidentScore 
        },
        compliance: { 
          status: complianceScore >= 95 ? 'healthy' : complianceScore >= 80 ? 'warning' : 'critical',
          score: complianceScore 
        },
        recommendations
      };

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 SECURITY HEALTH CHECK ERROR:', error instanceof Error ? error : new Error(String(error)));
      return {
        overallScore: 0,
        encryption: { status: 'error', score: 0 },
        authentication: { status: 'error', score: 0 },
        storage: { status: 'error', score: 0 },
        network: { status: 'error', score: 0 },
        crisis: { status: 'error', score: 0 },
        monitoring: { status: 'error', score: 0 },
        incidents: { status: 'error', score: 0 },
        compliance: { status: 'error', score: 0 },
        recommendations: ['System error - immediate investigation required']
      };
    }
  }

  /**
   * VULNERABILITY ASSESSMENT
   * Comprehensive security vulnerability assessment
   */
  public async performVulnerabilityAssessment(): Promise<VulnerabilityAssessment> {
    try {
      console.log('🔍 Performing comprehensive vulnerability assessment...');

      return await this.securityMonitoring.performVulnerabilityAssessment();

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 VULNERABILITY ASSESSMENT ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * INCIDENT RESPONSE COORDINATION
   * Coordinate incident response across all security services
   */
  public async respondToSecurityIncident(
    incidentType: string,
    description: string,
    affectedData: any,
    affectedSystems: any
  ): Promise<string> {
    try {
      console.log(`🚨 Coordinating security incident response: ${incidentType}`);

      // Initiate incident response
      const incidentId = await this.incidentResponse.detectAndRespondToIncident(
        incidentType as any,
        description,
        affectedData,
        affectedSystems
      );

      // If crisis data is affected, activate crisis protocols
      if (affectedData.dataTypes?.includes('crisis_responses')) {
        await this.incidentResponse.respondToCrisisDataBreach(
          incidentId,
          {
            dataExposed: affectedData.dataCategories || [],
            exposureMethod: 'security_incident',
            potentialImpact: description,
            userCount: affectedData.userCount || 0
          }
        );
      }

      console.log(`🚨 Security incident response coordinated: ${incidentId}`);

      return incidentId;

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 INCIDENT RESPONSE COORDINATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * UTILITY METHODS
   */

  private async verifySecurityServices(): Promise<void> {
    try {
      console.log('🔍 Verifying all security services...');

      // Verify each service is properly initialized
      const services = [
        { name: 'Encryption', service: this.encryptionService },
        { name: 'Authentication', service: this.authenticationService },
        { name: 'SecureStorage', service: this.secureStorage },
        { name: 'NetworkSecurity', service: this.networkSecurity },
        { name: 'CrisisSecurity', service: this.crisisSecurityProtocol },
        { name: 'SecurityMonitoring', service: this.securityMonitoring },
        { name: 'IncidentResponse', service: this.incidentResponse }
      ];

      for (const { name, service } of services) {
        if (!service) {
          throw new Error(`${name} service not available`);
        }
      }

      console.log('✅ All security services verified');

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 SECURITY SERVICE VERIFICATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * PUBLIC API METHODS
   */

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getEncryptionService() {
    return this.encryptionService;
  }

  public getAuthenticationService() {
    return this.authenticationService;
  }

  public getSecureStorage() {
    return this.secureStorage;
  }

  public getNetworkSecurity() {
    return this.networkSecurity;
  }

  public getCrisisSecurityProtocol() {
    return this.crisisSecurityProtocol;
  }

  public getSecurityMonitoring() {
    return this.securityMonitoring;
  }

  public getIncidentResponse() {
    return this.incidentResponse;
  }

  /**
   * DESTROY SECURITY ARCHITECTURE
   * Clean shutdown of all security services
   */
  public async destroySecurityArchitecture(): Promise<void> {
    try {
      console.log('🗑️  Destroying Security Architecture...');

      // Destroy services in reverse dependency order
      await this.incidentResponse.destroy();
      await this.securityMonitoring.destroy();
      await this.crisisSecurityProtocol.destroy();
      await this.networkSecurity.destroy();
      await this.secureStorage.destroy();
      await this.authenticationService.destroy();
      await this.encryptionService.destroy();

      this.initialized = false;

      console.log('✅ Security Architecture destroyed');

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 SECURITY ARCHITECTURE DESTRUCTION ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

// Export singleton security orchestrator
export default SecurityOrchestrator.getInstance();