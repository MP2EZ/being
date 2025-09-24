/**
 * Emergency Protocol Safety Types
 *
 * Comprehensive type safety for crisis intervention and emergency protocols,
 * ensuring user safety, clinical appropriateness, and legal compliance.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - Crisis detection accuracy (zero false negatives)
 * - Emergency response timing <200ms
 * - 988 hotline integration validation
 * - Safety plan accessibility
 * - Legal compliance verification
 */

import { ReactNode } from 'react';
import { ViewStyle, TextStyle } from 'react-native';

// =============================================================================
// CRISIS DETECTION VALIDATION
// =============================================================================

/**
 * Crisis Detection System Validation
 * Type-safe crisis detection with zero tolerance for false negatives
 */
export interface CrisisDetectionSystemValidation {
  readonly systemId: string;
  readonly detectionAccuracy: CrisisDetectionAccuracy;
  detectionProtocols: CrisisDetectionProtocol[];
  escalationMatrix: CrisisEscalationMatrix;
  responseProtocols: EmergencyResponseProtocol[];
  safetyValidation: CrisisSafetyValidation;
  legalCompliance: CrisisLegalCompliance;
  performanceRequirements: CrisisPerformanceRequirements;
}

export interface CrisisDetectionAccuracy {
  readonly falseNegativeRate: 0; // Type-enforced zero tolerance
  readonly falsePositiveRate: number; // Target: <5%
  readonly overallAccuracy: number; // Target: >95%
  readonly sensitivityScore: number; // Target: 100% for safety
  readonly specificityScore: number; // Balance with sensitivity
  validationMethods: CrisisValidationMethod[];
  lastValidated: Date;
  validationFrequency: 'continuous' | 'daily' | 'weekly' | 'monthly';
  validatedBy: CrisisValidationAuthority[];
}

export interface CrisisValidationMethod {
  methodId: string;
  methodName: string;
  methodType: 'clinical_expert' | 'statistical_analysis' | 'user_testing' | 'simulation' | 'machine_learning';
  validationData: CrisisValidationData;
  validationResults: CrisisValidationResult[];
  confidenceLevel: number; // 0-100
  clinicalEndorsement: boolean;
  safetyAssurance: CrisisSafetyAssurance;
}

export interface CrisisValidationData {
  dataSourceType: 'clinical_assessment' | 'simulated_crisis' | 'historical_data' | 'expert_scenarios' | 'user_reports';
  dataSetSize: number;
  dataQuality: 'high' | 'medium' | 'low';
  clinicalRelevance: 'high' | 'medium' | 'low';
  representativeness: number; // 0-100
  biasAssessment: BiasAssessmentResult[];
  ethicalApproval: boolean;
}

export interface BiasAssessmentResult {
  biasType: 'demographic' | 'clinical' | 'cultural' | 'socioeconomic' | 'technical' | 'gender' | 'age';
  biasLevel: 'none' | 'minimal' | 'moderate' | 'significant' | 'critical';
  biasImpact: 'safety_risk' | 'accuracy_impact' | 'fairness_concern' | 'usability_issue';
  mitigationStrategies: string[];
  mitigationImplemented: boolean;
}

export interface CrisisValidationResult {
  validationId: string;
  accuracyScore: number; // 0-100
  sensitivityScore: number; // 0-100
  specificityScore: number; // 0-100
  falsePositiveCount: number;
  falseNegativeCount: number; // Must be 0 for safety
  truePositiveCount: number;
  trueNegativeCount: number;
  validationDate: Date;
  validatorCredentials: string[];
  recommendations: string[];
  safetyAssurance: boolean;
}

export interface CrisisValidationAuthority {
  authorityId: string;
  authorityName: string;
  authorityType: 'clinical_psychologist' | 'psychiatrist' | 'crisis_counselor' | 'mbct_specialist' | 'regulatory_body';
  credentials: string[];
  endorsementLevel: 'full' | 'conditional' | 'under_review' | 'not_endorsed';
  endorsementDate: Date;
  endorsementComments: string;
  specializations: string[];
}

export interface CrisisSafetyAssurance {
  safetyLevel: 'maximum' | 'high' | 'standard' | 'minimal';
  safetyMeasures: CrisisSafetyMeasure[];
  redundancyLevel: 'triple' | 'double' | 'single' | 'none';
  failsafeProtocols: FailsafeProtocol[];
  monitoringLevel: 'continuous' | 'frequent' | 'periodic' | 'minimal';
  qualityAssurance: CrisisQualityAssurance;
}

export interface CrisisSafetyMeasure {
  measureId: string;
  measureName: string;
  measureType: 'prevention' | 'detection' | 'response' | 'recovery' | 'monitoring';
  implementation: string;
  effectiveness: 'proven' | 'likely' | 'possible' | 'theoretical';
  lastTested: Date;
  testResults: string;
  maintenance: CrisisMaintenance;
}

export interface FailsafeProtocol {
  protocolId: string;
  protocolName: string;
  triggerConditions: FailsafeTriggerCondition[];
  automaticActivation: boolean;
  manualOverride: boolean;
  responseActions: FailsafeResponseAction[];
  activationTime: number; // milliseconds - must be <200ms
  reliabilityLevel: 'maximum' | 'high' | 'standard';
  lastTested: Date;
  testSuccess: boolean;
}

export interface FailsafeTriggerCondition {
  conditionType: 'system_failure' | 'detection_failure' | 'response_failure' | 'communication_failure' | 'data_corruption' | 'network_failure';
  detectionMethod: string;
  responseTime: number; // milliseconds
  reliabilityLevel: 'maximum' | 'high' | 'standard';
  falsePositiveRate: number; // Target: <1%
  falseNegativeRate: number; // Target: 0%
}

export interface FailsafeResponseAction {
  actionType: 'emergency_contact' | 'hotline_activation' | 'resource_display' | 'data_preservation' | 'system_notification' | 'manual_escalation';
  actionPriority: 'immediate' | 'urgent' | 'high' | 'normal';
  executionTime: number; // milliseconds
  reliabilityRequirement: 'maximum' | 'high' | 'standard';
  userNotification: boolean;
  clinicalNotification: boolean;
  legalNotification: boolean;
}

export interface CrisisMaintenance {
  maintenanceSchedule: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  maintenanceType: 'preventive' | 'corrective' | 'adaptive' | 'perfective';
  lastMaintenance: Date;
  nextMaintenance: Date;
  maintenanceResults: MaintenanceResult[];
  maintenanceBy: string[];
}

export interface MaintenanceResult {
  maintenanceId: string;
  maintenanceDate: Date;
  issuesFound: CrisisMaintenanceIssue[];
  issuesResolved: number;
  systemHealth: 'excellent' | 'good' | 'adequate' | 'needs_attention' | 'critical';
  performanceImpact: 'none' | 'minimal' | 'moderate' | 'significant';
  safetyImpact: 'none' | 'monitored' | 'concerning' | 'critical';
}

export interface CrisisMaintenanceIssue {
  issueId: string;
  issueType: 'safety' | 'accuracy' | 'performance' | 'usability' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  description: string;
  impact: string;
  resolution: string;
  resolutionTime: number; // hours
  preventionMeasures: string[];
}

export interface CrisisQualityAssurance {
  qaLevel: 'clinical_grade' | 'hospital_grade' | 'research_grade' | 'commercial_grade';
  qaStandards: CrisisQAStandard[];
  qaAudits: CrisisQAAudit[];
  qaMetrics: CrisisQAMetric[];
  continuousImprovement: boolean;
  userFeedbackIntegration: boolean;
  clinicalFeedbackIntegration: boolean;
}

export interface CrisisQAStandard {
  standardId: string;
  standardName: string;
  standardType: 'safety' | 'accuracy' | 'performance' | 'usability' | 'legal' | 'ethical';
  complianceLevel: 'full' | 'substantial' | 'partial' | 'non_compliant';
  lastAssessment: Date;
  assessmentResults: string;
  improvementPlan: string[];
}

export interface CrisisQAAudit {
  auditId: string;
  auditDate: Date;
  auditType: 'internal' | 'external' | 'regulatory' | 'clinical' | 'user';
  auditorCredentials: string[];
  auditScope: string[];
  auditFindings: CrisisAuditFinding[];
  overallRating: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' | 'unsatisfactory';
  recommendedActions: CrisisRecommendedAction[];
}

export interface CrisisAuditFinding {
  findingId: string;
  findingType: 'strength' | 'weakness' | 'opportunity' | 'threat' | 'non_compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string;
  impact: string;
  recommendation: string;
  actionRequired: boolean;
  actionTimeline: string;
}

export interface CrisisRecommendedAction {
  actionId: string;
  actionType: 'immediate' | 'short_term' | 'medium_term' | 'long_term' | 'strategic';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  expectedBenefit: string;
  implementationCost: 'high' | 'medium' | 'low';
  implementationComplexity: 'high' | 'medium' | 'low';
  riskIfNotImplemented: 'critical' | 'high' | 'medium' | 'low';
}

export interface CrisisQAMetric {
  metricId: string;
  metricName: string;
  metricType: 'safety' | 'accuracy' | 'performance' | 'satisfaction' | 'compliance';
  currentValue: number;
  targetValue: number;
  trend: 'improving' | 'stable' | 'declining' | 'fluctuating';
  measurementFrequency: 'real_time' | 'daily' | 'weekly' | 'monthly';
  lastMeasured: Date;
  actionThreshold: number;
  actionRequired: boolean;
}

// =============================================================================
// EMERGENCY RESPONSE PROTOCOLS
// =============================================================================

/**
 * Emergency Response Protocol Validation
 * Type-safe emergency response with timing and safety requirements
 */
export interface EmergencyResponseProtocol {
  protocolId: string;
  protocolName: string;
  protocolType: 'immediate' | 'urgent' | 'standard' | 'follow_up' | 'preventive';
  triggerCriteria: EmergencyTriggerCriteria[];
  responseActions: EmergencyResponseAction[];
  escalationPaths: EmergencyEscalationPath[];
  timingRequirements: EmergencyTimingRequirements;
  safetyRequirements: EmergencySafetyRequirements;
  legalRequirements: EmergencyLegalRequirements;
  qualityAssurance: EmergencyQualityAssurance;
}

export interface EmergencyTriggerCriteria {
  criteriaId: string;
  criteriaType: 'score_based' | 'pattern_based' | 'user_initiated' | 'time_based' | 'behavioral' | 'contextual';
  triggerCondition: string;
  thresholdValue?: number;
  confidenceRequirement: number; // 0-100
  validationRequired: boolean;
  automaticTrigger: boolean;
  manualOverride: boolean;
  falsePositiveRate: number; // Target: <5%
  falseNegativeRate: number; // Target: 0%
}

export interface EmergencyResponseAction {
  actionId: string;
  actionName: string;
  actionType: 'immediate_alert' | 'hotline_prompt' | 'resource_display' | 'contact_emergency' | 'save_state' | 'escalate' | 'monitor';
  priority: 'critical' | 'high' | 'medium' | 'low';
  timing: EmergencyActionTiming;
  execution: EmergencyActionExecution;
  validation: EmergencyActionValidation;
  accessibility: EmergencyActionAccessibility;
  safety: EmergencyActionSafety;
}

export interface EmergencyActionTiming {
  executionDelay: number; // milliseconds from trigger
  maxExecutionTime: number; // milliseconds
  timeoutHandling: string;
  retryPolicy: EmergencyRetryPolicy;
  priorityOverride: boolean;
  parallelExecution: boolean;
  dependencyHandling: string;
}

export interface EmergencyRetryPolicy {
  maxRetries: number;
  retryDelay: number; // milliseconds
  backoffStrategy: 'linear' | 'exponential' | 'fixed' | 'custom';
  failureHandling: 'escalate' | 'fallback' | 'abort' | 'manual';
  successCriteria: string;
  failureCriteria: string;
}

export interface EmergencyActionExecution {
  executionMethod: 'api_call' | 'ui_display' | 'system_command' | 'user_prompt' | 'external_service' | 'data_operation';
  executionParameters: Record<string, any>;
  executionValidation: boolean;
  executionLogging: boolean;
  executionMonitoring: boolean;
  executionFeedback: boolean;
  executionRollback: boolean;
}

export interface EmergencyActionValidation {
  preExecutionValidation: boolean;
  postExecutionValidation: boolean;
  validationCriteria: string[];
  validationTimeout: number; // milliseconds
  validationRetry: boolean;
  validationFailureHandling: string;
  validationLogging: boolean;
}

export interface EmergencyActionAccessibility {
  screenReaderCompatible: boolean;
  keyboardAccessible: boolean;
  highContrastSupport: boolean;
  largeTextSupport: boolean;
  voiceAnnouncementSupport: boolean;
  hapticFeedbackSupport: boolean;
  cognitiveLoadOptimized: boolean;
  stressOptimizedInterface: boolean;
}

export interface EmergencyActionSafety {
  userSafetyImpact: 'positive' | 'neutral' | 'potential_risk' | 'requires_monitoring';
  dataSafetyImpact: 'secure' | 'standard' | 'potential_exposure' | 'requires_protection';
  systemSafetyImpact: 'stable' | 'monitored' | 'potential_instability' | 'requires_safeguards';
  legalSafetyImpact: 'compliant' | 'standard' | 'potential_issues' | 'requires_review';
  clinicalSafetyImpact: 'beneficial' | 'neutral' | 'potential_concerns' | 'requires_oversight';
}

export interface EmergencyEscalationPath {
  pathId: string;
  pathName: string;
  escalationTriggers: EscalationTrigger[];
  escalationSteps: EscalationStep[];
  escalationTimeline: EscalationTimeline;
  escalationAuthorities: EscalationAuthority[];
  escalationCommunication: EscalationCommunication;
  escalationDocumentation: EscalationDocumentation;
}

export interface EscalationTrigger {
  triggerId: string;
  triggerType: 'time_based' | 'severity_based' | 'response_failure' | 'user_request' | 'system_failure' | 'manual';
  triggerCondition: string;
  automaticEscalation: boolean;
  escalationDelay: number; // milliseconds
  escalationCriteria: string[];
  escalationValidation: boolean;
}

export interface EscalationStep {
  stepId: string;
  stepName: string;
  stepOrder: number;
  stepType: 'notification' | 'resource_activation' | 'authority_contact' | 'system_escalation' | 'manual_intervention';
  stepExecution: EscalationStepExecution;
  stepValidation: EscalationStepValidation;
  stepTimeline: EscalationStepTimeline;
  stepSafety: EscalationStepSafety;
}

export interface EscalationStepExecution {
  executionMethod: string;
  executionParameters: Record<string, any>;
  executionValidation: boolean;
  executionFeedback: boolean;
  executionLogging: boolean;
  executionMonitoring: boolean;
}

export interface EscalationStepValidation {
  validationRequired: boolean;
  validationCriteria: string[];
  validationMethod: string;
  validationTimeout: number; // milliseconds
  validationFailureHandling: string;
}

export interface EscalationStepTimeline {
  expectedDuration: number; // milliseconds
  maxDuration: number; // milliseconds
  timeoutHandling: string;
  urgencyLevel: 'immediate' | 'urgent' | 'high' | 'normal';
  delayAcceptable: boolean;
}

export interface EscalationStepSafety {
  safetyRequirements: string[];
  safetyValidation: boolean;
  safetyMonitoring: boolean;
  safetyFallback: string;
  riskAssessment: string;
}

export interface EscalationTimeline {
  totalMaxTime: number; // milliseconds
  stepTimeouts: Record<string, number>;
  escalationInterval: number; // milliseconds
  urgencyIncrease: boolean;
  timelineFlexibility: boolean;
  timelineMonitoring: boolean;
}

export interface EscalationAuthority {
  authorityId: string;
  authorityType: 'crisis_counselor' | 'clinical_supervisor' | 'emergency_services' | 'system_administrator' | 'legal_counsel';
  contactMethod: EscalationContactMethod[];
  availability: EscalationAvailability;
  responseExpectation: EscalationResponseExpectation;
  authorization: EscalationAuthorization;
}

export interface EscalationContactMethod {
  methodType: 'phone' | 'email' | 'sms' | 'in_app' | 'pager' | 'emergency_system';
  contactDetails: string;
  priority: number;
  expectedResponseTime: number; // minutes
  availability: string;
  reliability: 'high' | 'medium' | 'low';
}

export interface EscalationAvailability {
  availability247: boolean;
  businessHours: string;
  timeZone: string;
  holidaySchedule: string;
  backupPersonnel: boolean;
  unavailabilityProtocol: string;
}

export interface EscalationResponseExpectation {
  acknowledgmentTime: number; // minutes
  responseTime: number; // minutes
  resolutionTime: number; // hours
  escalationCriteria: string;
  communicationFrequency: string;
  statusUpdates: boolean;
}

export interface EscalationAuthorization {
  decisionAuthority: boolean;
  resourceAccess: string[];
  systemAccess: string[];
  overrideCapability: boolean;
  escalationCapability: boolean;
  documentationAccess: boolean;
}

export interface EscalationCommunication {
  communicationProtocol: string;
  communicationSecurity: 'encrypted' | 'secure' | 'standard';
  communicationLogging: boolean;
  communicationBackup: boolean;
  multilanguageSupport: boolean;
  accessibilitySupport: boolean;
}

export interface EscalationDocumentation {
  documentationRequired: boolean;
  documentationLevel: 'minimal' | 'standard' | 'comprehensive' | 'legal';
  documentationSecurity: 'encrypted' | 'secure' | 'standard';
  documentationRetention: string;
  documentationAccess: string[];
  documentationAudit: boolean;
}

// =============================================================================
// HOTLINE INTEGRATION VALIDATION
// =============================================================================

/**
 * 988 Hotline Integration Validation
 * Type-safe hotline integration with reliability requirements
 */
export interface HotlineIntegrationValidation {
  readonly hotlineNumber: '988'; // Type-enforced crisis hotline
  integrationMethod: HotlineIntegrationMethod;
  reliabilityRequirements: HotlineReliabilityRequirements;
  accessibilityIntegration: HotlineAccessibilityIntegration;
  legalCompliance: HotlineLegalCompliance;
  qualityAssurance: HotlineQualityAssurance;
  fallbackProtocols: HotlineFallbackProtocol[];
  userExperience: HotlineUserExperience;
}

export interface HotlineIntegrationMethod {
  methodType: 'direct_dial' | 'in_app_dial' | 'web_dial' | 'deep_link' | 'custom_integration';
  implementation: string;
  platformSupport: HotlinePlatformSupport[];
  networkRequirements: HotlineNetworkRequirements;
  permissionRequirements: HotlinePermissionRequirements;
  securityMeasures: HotlineSecurityMeasures;
}

export interface HotlinePlatformSupport {
  platform: 'ios' | 'android' | 'web' | 'desktop';
  supportLevel: 'full' | 'partial' | 'basic' | 'not_supported';
  implementation: string;
  testing: HotlinePlatformTesting;
  limitations: string[];
  workarounds: string[];
}

export interface HotlinePlatformTesting {
  lastTested: Date;
  testResults: 'pass' | 'fail' | 'conditional' | 'not_tested';
  testScenarios: HotlineTestScenario[];
  testEnvironment: string;
  testData: string;
  testRecommendations: string[];
}

export interface HotlineTestScenario {
  scenarioId: string;
  scenarioName: string;
  scenarioType: 'functional' | 'stress' | 'accessibility' | 'security' | 'performance';
  testProcedure: string;
  expectedResult: string;
  actualResult: string;
  testStatus: 'pass' | 'fail' | 'inconclusive';
  issues: string[];
  recommendations: string[];
}

export interface HotlineNetworkRequirements {
  internetRequired: boolean;
  minimumBandwidth: number; // kbps
  networkFallback: boolean;
  offlineSupport: boolean;
  networkFailureHandling: string;
  connectivityTesting: boolean;
}

export interface HotlinePermissionRequirements {
  phonePermission: boolean;
  networkPermission: boolean;
  locationPermission: boolean;
  permissionHandling: string;
  permissionFallback: string;
  userConsent: boolean;
}

export interface HotlineSecurityMeasures {
  dataEncryption: boolean;
  communicationSecurity: 'encrypted' | 'secure' | 'standard';
  privacyProtection: boolean;
  userAnonymity: boolean;
  dataLogging: 'none' | 'minimal' | 'standard' | 'comprehensive';
  securityAudit: boolean;
}

export interface HotlineReliabilityRequirements {
  readonly uptime: 99.9; // Type-enforced 99.9% uptime requirement
  readonly maxCallSetupTime: 10000; // milliseconds (10 seconds max)
  redundancyLevel: 'triple' | 'double' | 'single' | 'none';
  failoverProtocols: HotlineFailoverProtocol[];
  monitoringLevel: 'continuous' | 'frequent' | 'periodic';
  reliabilityTesting: HotlineReliabilityTesting;
}

export interface HotlineFailoverProtocol {
  protocolId: string;
  protocolName: string;
  triggerConditions: string[];
  failoverTarget: 'backup_hotline' | 'emergency_services' | 'alternative_resources' | 'offline_resources';
  failoverTime: number; // milliseconds
  userNotification: boolean;
  transparentFailover: boolean;
  recoveryProtocol: string;
}

export interface HotlineReliabilityTesting {
  testingFrequency: 'continuous' | 'daily' | 'weekly' | 'monthly';
  testingScope: 'functional' | 'stress' | 'load' | 'comprehensive';
  lastTested: Date;
  testResults: HotlineTestResult[];
  issuesFound: HotlineReliabilityIssue[];
  performanceMetrics: HotlinePerformanceMetric[];
}

export interface HotlineTestResult {
  testId: string;
  testDate: Date;
  testType: string;
  testResult: 'pass' | 'fail' | 'conditional';
  callSetupTime: number; // milliseconds
  callQuality: 'excellent' | 'good' | 'fair' | 'poor';
  reliability: number; // 0-100
  issues: string[];
  recommendations: string[];
}

export interface HotlineReliabilityIssue {
  issueId: string;
  issueType: 'connectivity' | 'call_quality' | 'setup_time' | 'availability' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  frequency: string;
  resolution: string;
  preventionMeasures: string[];
}

export interface HotlinePerformanceMetric {
  metricName: string;
  metricValue: number;
  metricUnit: string;
  target: number;
  trend: 'improving' | 'stable' | 'declining';
  lastMeasured: Date;
  actionThreshold: number;
  actionRequired: boolean;
}

export interface HotlineAccessibilityIntegration {
  screenReaderSupport: boolean;
  voiceDialingSupport: boolean;
  largeButtonSupport: boolean;
  highContrastSupport: boolean;
  hapticFeedbackSupport: boolean;
  emergencyAccessibilityMode: boolean;
  cognitiveAccessibilitySupport: boolean;
  multiLanguageSupport: boolean;
}

export interface HotlineLegalCompliance {
  complianceLevel: 'full' | 'substantial' | 'partial' | 'non_compliant';
  legalRequirements: HotlineLegalRequirement[];
  privacyCompliance: HotlinePrivacyCompliance;
  dataProtectionCompliance: HotlineDataProtectionCompliance;
  emergencyServicesCompliance: boolean;
  crossBorderCompliance: boolean;
  complianceAudit: HotlineComplianceAudit;
}

export interface HotlineLegalRequirement {
  requirementId: string;
  requirementType: 'privacy' | 'data_protection' | 'emergency_services' | 'telecommunications' | 'healthcare';
  jurisdiction: string;
  requirementDescription: string;
  complianceStatus: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  complianceEvidence: string;
  lastReviewed: Date;
  nextReview: Date;
}

export interface HotlinePrivacyCompliance {
  userConsentRequired: boolean;
  dataMinimization: boolean;
  purposeLimitation: boolean;
  transparencyProvided: boolean;
  userRights: string[];
  dataRetention: string;
  dataSharing: string;
}

export interface HotlineDataProtectionCompliance {
  encryptionRequired: boolean;
  accessControls: boolean;
  auditTrails: boolean;
  breachNotification: boolean;
  dataLocalization: boolean;
  thirdPartySharing: string;
  dataProcessorAgreements: boolean;
}

export interface HotlineComplianceAudit {
  lastAudit: Date;
  nextAudit: Date;
  auditType: 'internal' | 'external' | 'regulatory';
  auditResults: 'compliant' | 'minor_issues' | 'major_issues' | 'non_compliant';
  auditFindings: string[];
  correctiveActions: string[];
  auditEvidence: string[];
}

export interface HotlineQualityAssurance {
  qaLevel: 'basic' | 'standard' | 'enhanced' | 'premium';
  qualityMetrics: HotlineQualityMetric[];
  userSatisfaction: HotlineUserSatisfaction;
  serviceLevelAgreement: HotlineServiceLevelAgreement;
  continuousImprovement: boolean;
  qualityReporting: HotlineQualityReporting;
}

export interface HotlineQualityMetric {
  metricName: string;
  metricType: 'availability' | 'response_time' | 'call_quality' | 'user_satisfaction' | 'issue_resolution';
  currentValue: number;
  targetValue: number;
  threshold: number;
  trend: 'improving' | 'stable' | 'declining';
  lastMeasured: Date;
  measurementFrequency: string;
}

export interface HotlineUserSatisfaction {
  satisfactionScore: number; // 0-100
  feedbackSources: string[];
  commonComplaints: string[];
  improvementSuggestions: string[];
  userExperienceRating: 'excellent' | 'good' | 'fair' | 'poor';
  recommendationRate: number; // 0-100
}

export interface HotlineServiceLevelAgreement {
  availabilityTarget: number; // percentage
  responseTimeTarget: number; // seconds
  resolutionTimeTarget: number; // minutes
  qualityTarget: number; // score
  penaltyClause: boolean;
  bonusClause: boolean;
  reviewFrequency: string;
}

export interface HotlineQualityReporting {
  reportingFrequency: 'real_time' | 'daily' | 'weekly' | 'monthly';
  reportingScope: 'internal' | 'stakeholder' | 'regulatory' | 'public';
  reportingFormat: 'dashboard' | 'report' | 'alert' | 'api';
  dataVisualization: boolean;
  trendAnalysis: boolean;
  predictiveAnalysis: boolean;
}

export interface HotlineFallbackProtocol {
  protocolId: string;
  protocolName: string;
  triggerConditions: string[];
  fallbackAction: string;
  fallbackTarget: string;
  userNotification: string;
  fallbackTesting: boolean;
  fallbackReliability: number; // 0-100
}

export interface HotlineUserExperience {
  easeOfAccess: 'immediate' | 'quick' | 'moderate' | 'difficult';
  userInterface: 'intuitive' | 'clear' | 'adequate' | 'confusing';
  userGuidance: boolean;
  errorHandling: 'excellent' | 'good' | 'adequate' | 'poor';
  feedbackProvision: boolean;
  userEducation: boolean;
  userTesting: HotlineUserTesting;
}

export interface HotlineUserTesting {
  testingFrequency: 'monthly' | 'quarterly' | 'annually';
  userGroups: string[];
  testScenarios: string[];
  usabilityScore: number; // 0-100
  accessibilityScore: number; // 0-100
  satisfactionScore: number; // 0-100
  recommendedImprovements: string[];
}

// =============================================================================
// COMPREHENSIVE EMERGENCY COMPONENT PROPS
// =============================================================================

/**
 * Emergency Component Integration Props
 * Unified interface for emergency-enabled clinical components
 */
export interface EmergencyEnabledComponentProps {
  // Core Emergency Requirements
  emergencyProtocolsEnabled: true; // Type-enforced requirement
  crisisDetectionEnabled: true;    // Type-enforced requirement
  hotlineIntegrationValidated: true; // Type-enforced requirement

  // Emergency System Configuration
  emergencySystem: CrisisDetectionSystemValidation;
  responseProtocols: EmergencyResponseProtocol[];
  escalationMatrix: CrisisEscalationMatrix;
  hotlineIntegration: HotlineIntegrationValidation;

  // Performance Requirements
  readonly maxEmergencyResponseTime: 200; // milliseconds - type-enforced
  readonly emergencySystemUptime: 99.9;   // percentage - type-enforced
  emergencyPerformanceMonitoring: boolean;

  // Safety Requirements
  emergencySafetyValidation: CrisisSafetyValidation;
  emergencyLegalCompliance: CrisisLegalCompliance;
  emergencyQualityAssurance: CrisisQualityAssurance;

  // Event Handlers
  onEmergencyDetected?: (emergency: EmergencyDetectionEvent) => Promise<void>;
  onEmergencyResponse?: (response: EmergencyResponseEvent) => Promise<void>;
  onEmergencyEscalation?: (escalation: EmergencyEscalationEvent) => Promise<void>;
  onEmergencyResolution?: (resolution: EmergencyResolutionEvent) => Promise<void>;

  // User Interface
  emergencyUIConfiguration: EmergencyUIConfiguration;
  emergencyAccessibilityConfiguration: EmergencyAccessibilityConfiguration;

  // Integration
  componentIntegration: EmergencyComponentIntegration;
  systemIntegration: EmergencySystemIntegration;
}

export interface CrisisEscalationMatrix {
  matrixId: string;
  escalationLevels: EscalationLevel[];
  escalationCriteria: EscalationCriteria[];
  escalationTimelines: EscalationTimeline[];
  escalationAuthorities: EscalationAuthority[];
  escalationDocumentation: EscalationDocumentation;
}

export interface EscalationLevel {
  level: number;
  levelName: string;
  description: string;
  triggerCriteria: string[];
  responseActions: string[];
  authorities: string[];
  maxDuration: number; // minutes
  escalationConditions: string[];
}

export interface EscalationCriteria {
  criteriaId: string;
  criteriaType: string;
  threshold: number;
  measurement: string;
  frequency: string;
  validation: boolean;
}

export interface CrisisLegalCompliance {
  complianceLevel: 'full' | 'substantial' | 'partial' | 'non_compliant';
  legalFrameworks: LegalFramework[];
  complianceAudits: ComplianceAudit[];
  legalRisks: LegalRisk[];
  complianceMonitoring: boolean;
}

export interface LegalFramework {
  frameworkId: string;
  frameworkName: string;
  jurisdiction: string;
  applicability: string;
  requirements: string[];
  complianceStatus: string;
  lastReview: Date;
}

export interface ComplianceAudit {
  auditId: string;
  auditDate: Date;
  auditScope: string[];
  auditResults: string;
  findings: string[];
  recommendations: string[];
  followUpRequired: boolean;
}

export interface LegalRisk {
  riskId: string;
  riskType: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation: string[];
  monitoring: boolean;
}

export interface CrisisPerformanceRequirements {
  readonly maxDetectionTime: 100;  // milliseconds - type-enforced
  readonly maxResponseTime: 200;   // milliseconds - type-enforced
  readonly minAccuracy: 95;        // percentage - type-enforced
  readonly maxFalseNegativeRate: 0; // percentage - type-enforced
  performanceMonitoring: boolean;
  performanceReporting: boolean;
  performanceOptimization: boolean;
}

// Emergency Event Types
export interface EmergencyDetectionEvent {
  detectionId: string;
  detectionTime: Date;
  detectionSource: string;
  emergencyType: string;
  emergencyLevel: 'low' | 'medium' | 'high' | 'critical';
  detectionConfidence: number; // 0-100
  triggerData: Record<string, any>;
  userContext: Record<string, any>;
  systemContext: Record<string, any>;
}

export interface EmergencyResponseEvent {
  responseId: string;
  emergencyId: string;
  responseTime: Date;
  responseType: string;
  responseActions: string[];
  responseSuccess: boolean;
  responseLatency: number; // milliseconds
  userFeedback?: string;
  systemFeedback: string;
}

export interface EmergencyEscalationEvent {
  escalationId: string;
  emergencyId: string;
  escalationTime: Date;
  escalationLevel: number;
  escalationReason: string;
  escalationActions: string[];
  authoritiesNotified: string[];
  escalationSuccess: boolean;
}

export interface EmergencyResolutionEvent {
  resolutionId: string;
  emergencyId: string;
  resolutionTime: Date;
  resolutionMethod: string;
  resolutionSuccess: boolean;
  resolutionOutcome: string;
  followUpRequired: boolean;
  lessonsLearned: string[];
}

export interface EmergencyUIConfiguration {
  emergencyMode: 'discrete' | 'prominent' | 'full_screen' | 'overlay';
  visualDesign: EmergencyVisualDesign;
  interactionDesign: EmergencyInteractionDesign;
  informationArchitecture: EmergencyInformationArchitecture;
  userGuidance: EmergencyUserGuidance;
}

export interface EmergencyVisualDesign {
  colorScheme: 'high_contrast' | 'crisis_optimized' | 'standard';
  typography: 'large_text' | 'crisis_readable' | 'standard';
  iconography: 'crisis_clear' | 'universal' | 'standard';
  spacing: 'crisis_optimized' | 'generous' | 'standard';
  animation: 'minimal' | 'attention_grabbing' | 'standard' | 'none';
}

export interface EmergencyInteractionDesign {
  touchTargets: 'oversized' | 'large' | 'standard';
  interactionFeedback: 'immediate' | 'strong' | 'standard';
  errorPrevention: 'maximum' | 'high' | 'standard';
  errorRecovery: 'automatic' | 'guided' | 'standard';
  inputMethods: 'multimodal' | 'optimized' | 'standard';
}

export interface EmergencyInformationArchitecture {
  informationPriority: 'crisis_first' | 'safety_first' | 'user_first';
  informationFlow: 'linear' | 'branched' | 'adaptive';
  informationDensity: 'minimal' | 'focused' | 'comprehensive';
  navigationModel: 'simplified' | 'guided' | 'flexible';
  contentStrategy: 'crisis_optimized' | 'user_centered' | 'comprehensive';
}

export interface EmergencyUserGuidance {
  guidanceLevel: 'comprehensive' | 'contextual' | 'minimal';
  guidanceType: 'voice' | 'text' | 'visual' | 'multimodal';
  guidanceTiming: 'proactive' | 'reactive' | 'on_demand';
  guidancePersonalization: 'adaptive' | 'configurable' | 'standard';
  guidanceAccessibility: 'universal' | 'enhanced' | 'standard';
}

export interface EmergencyAccessibilityConfiguration {
  accessibilityLevel: 'maximum' | 'enhanced' | 'standard';
  screenReaderOptimization: boolean;
  keyboardNavigationOptimization: boolean;
  voiceControlSupport: boolean;
  gestureControlSupport: boolean;
  eyeTrackingSupport: boolean;
  switchControlSupport: boolean;
  cognitiveAccessibilitySupport: boolean;
}

export interface EmergencyComponentIntegration {
  componentType: string;
  integrationLevel: 'deep' | 'moderate' | 'shallow';
  integrationPoints: string[];
  dataSharing: EmergencyDataSharing;
  eventSharing: EmergencyEventSharing;
  uiIntegration: EmergencyUIIntegration;
}

export interface EmergencyDataSharing {
  sharingLevel: 'full' | 'selective' | 'minimal' | 'none';
  sharedData: string[];
  dataFormat: string;
  dataSecurity: string;
  dataPrivacy: string;
  dataRetention: string;
}

export interface EmergencyEventSharing {
  eventTypes: string[];
  eventFormat: string;
  eventTiming: 'real_time' | 'near_real_time' | 'batch';
  eventReliability: 'guaranteed' | 'best_effort';
  eventSecurity: string;
}

export interface EmergencyUIIntegration {
  integrationMode: 'seamless' | 'overlay' | 'separate';
  transitionHandling: string;
  stateManagement: string;
  visualConsistency: boolean;
  interactionConsistency: boolean;
}

export interface EmergencySystemIntegration {
  systemType: string;
  integrationProtocol: string;
  integrationSecurity: string;
  integrationReliability: string;
  integrationMonitoring: boolean;
  integrationTesting: boolean;
}

// Export comprehensive emergency protocol types
export default {
  // Crisis Detection
  CrisisDetectionSystemValidation,
  CrisisDetectionAccuracy,
  CrisisSafetyValidation,

  // Emergency Response
  EmergencyResponseProtocol,
  EmergencyResponseAction,
  EmergencyEscalationPath,

  // Hotline Integration
  HotlineIntegrationValidation,
  HotlineReliabilityRequirements,
  HotlineAccessibilityIntegration,

  // Component Integration
  EmergencyEnabledComponentProps,
  EmergencyUIConfiguration,
  EmergencyAccessibilityConfiguration,

  // Event Types
  EmergencyDetectionEvent,
  EmergencyResponseEvent,
  EmergencyEscalationEvent,
  EmergencyResolutionEvent,
};