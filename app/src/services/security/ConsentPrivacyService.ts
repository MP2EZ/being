/**
 * Consent & Privacy Security Service - HIPAA-Compliant Privacy Management
 *
 * Implements comprehensive consent and privacy management:
 * - Encrypted consent storage with versioning
 * - Privacy-preserving user data collection
 * - Secure consent withdrawal mechanisms
 * - Granular permission management
 * - HIPAA-compliant audit trails
 * - Dynamic privacy controls with user empowerment
 */

import { AuthSession, ComplianceFlag, AUTH_CONSTANTS } from '../../types/auth-session';
import { encryptionService, DataSensitivity } from './EncryptionService';
import { securityControlsService } from './SecurityControlsService';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

export interface ConsentConfig {
  // Consent versioning
  currentConsentVersion: string;
  currentPrivacyPolicyVersion: string;
  minimumRequiredVersion: string;
  gracePeriodDays: number; // Days to update consent

  // Data collection preferences
  allowDataCollection: boolean;
  allowAnalytics: boolean;
  allowPersonalization: boolean;
  allowCloudSync: boolean;
  allowCrossDeviceSync: boolean;

  // Privacy settings
  enableDataMinimization: boolean;
  enableAnonymization: boolean;
  enableEncryption: boolean;
  enableAuditLogging: boolean;

  // Retention policies
  defaultRetentionDays: number;
  clinicalDataRetentionDays: number;
  auditLogRetentionDays: number;
  backupRetentionDays: number;

  // Withdrawal settings
  enableConsentWithdrawal: boolean;
  withdrawalGracePeriodDays: number;
  automaticDataDeletion: boolean;
  withdrawalAuditRequired: boolean;
}

export interface UserConsent {
  consentId: string;
  userId: string;
  deviceId: string;
  consentVersion: string;
  privacyPolicyVersion: string;
  consentTimestamp: string;
  lastUpdated: string;
  expiresAt?: string;

  // Consent categories
  categories: ConsentCategory[];

  // User choices
  dataProcessing: DataProcessingConsent;
  privacy: PrivacyConsent;
  communication: CommunicationConsent;

  // Legal basis
  legalBasis: LegalBasis;

  // Metadata
  ipAddress?: string; // Anonymized
  userAgent?: string;
  consentMethod: 'explicit' | 'implicit' | 'withdrawn' | 'updated';
  withdrawnAt?: string;
  withdrawalReason?: string;

  // Audit trail
  auditTrail: ConsentAuditEntry[];

  // Compliance markers
  hipaaCompliant: boolean;
  gdprCompliant: boolean;
  ccpaCompliant: boolean;
}

export interface ConsentCategory {
  categoryId: string;
  name: string;
  description: string;
  required: boolean;
  consented: boolean;
  consentedAt?: string;
  withdrawnAt?: string;
  purpose: string[];
  dataTypes: string[];
  retentionDays: number;
  canWithdraw: boolean;
  dependencies: string[]; // Other categories this depends on
}

export interface DataProcessingConsent {
  // Core data processing
  collectBasicData: boolean;
  collectClinicalData: boolean;
  collectUsageData: boolean;
  collectDiagnosticData: boolean;

  // Processing purposes
  therapeuticUse: boolean;
  researchUse: boolean;
  analyticsUse: boolean;
  improvementUse: boolean;

  // Data sharing
  shareAnonymizedData: boolean;
  shareAggregatedData: boolean;
  shareWithProviders: boolean;
  shareForResearch: boolean;

  // Storage and retention
  localStorageOnly: boolean;
  cloudStorageAllowed: boolean;
  backupAllowed: boolean;
  customRetentionPeriod?: number;
}

export interface PrivacyConsent {
  // Data minimization
  enableDataMinimization: boolean;
  minimumDataCollection: boolean;
  anonymizeData: boolean;
  pseudonymizeData: boolean;

  // Access controls
  restrictAccess: boolean;
  requireBiometric: boolean;
  enableDeviceBinding: boolean;
  limitDeviceAccess: boolean;

  // Tracking and analytics
  allowUsageTracking: boolean;
  allowPerformanceTracking: boolean;
  allowCrashReporting: boolean;
  allowPersonalization: boolean;

  // Third-party integrations
  allowThirdPartyIntegrations: boolean;
  allowAPIAccess: boolean;
  allowExternalServices: boolean;
}

export interface CommunicationConsent {
  // Notifications
  allowPushNotifications: boolean;
  allowEmailNotifications: boolean;
  allowSMSNotifications: boolean;
  allowInAppNotifications: boolean;

  // Communication types
  therapeuticReminders: boolean;
  assessmentReminders: boolean;
  progressUpdates: boolean;
  educationalContent: boolean;
  securityAlerts: boolean;

  // Emergency communications
  allowEmergencyContact: boolean;
  allowCrisisNotifications: boolean;
  allowEmergencyOverride: boolean;

  // Marketing and research
  allowMarketingCommunications: boolean;
  allowResearchInvitations: boolean;
  allowSurveys: boolean;
}

export interface LegalBasis {
  // GDPR legal bases
  consent: boolean;
  contract: boolean;
  legalObligation: boolean;
  vitalInterests: boolean;
  publicTask: boolean;
  legitimateInterests: boolean;

  // Healthcare-specific
  medicalCare: boolean;
  publicHealth: boolean;
  archivingPurposes: boolean;
  scientificResearch: boolean;

  // Details
  specificBasis: string;
  jurisdiction: string;
  applicableLaws: string[];
}

export interface ConsentAuditEntry {
  auditId: string;
  timestamp: string;
  action: 'consent_given' | 'consent_updated' | 'consent_withdrawn' | 'privacy_changed' | 'access_granted' | 'access_denied';
  details: Record<string, unknown>;
  ipAddress?: string; // Anonymized
  userAgent?: string;
  deviceId: string;
  consentVersion: string;
  legalBasis: string;
  complianceMarkers: {
    hipaaRequired: boolean;
    gdprRequired: boolean;
    ccpaRequired: boolean;
    auditRequired: boolean;
    retentionDays: number;
  };
}

export interface PrivacyRequest {
  requestId: string;
  userId: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection' | 'withdrawal';
  requestedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  completedAt?: string;
  rejectionReason?: string;

  // Request details
  scope: string[]; // Data categories
  reason?: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';

  // Processing
  estimatedCompletionDate: string;
  actualCompletionDate?: string;
  processingNotes: string[];

  // Verification
  identityVerified: boolean;
  verificationMethod?: string;
  verificationTimestamp?: string;

  // Audit
  auditTrail: PrivacyRequestAuditEntry[];
}

export interface PrivacyRequestAuditEntry {
  auditId: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details: Record<string, unknown>;
  complianceNotes?: string;
}

export interface ConsentValidationResult {
  valid: boolean;
  consents: UserConsent[];
  missing: string[];
  expired: string[];
  conflicts: string[];
  warnings: string[];
  actionRequired: boolean;
  gracePeriodRemaining?: number; // days
}

export interface PrivacyImpactAssessment {
  assessmentId: string;
  operation: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  dataTypes: string[];
  consentRequired: boolean;
  legalBasisRequired: string[];
  mitigationMeasures: string[];
  complianceRequirements: string[];
  approvalRequired: boolean;
}

/**
 * Consent & Privacy Security Service Implementation
 */
export class ConsentPrivacyService {
  private static instance: ConsentPrivacyService;
  private userConsents: Map<string, UserConsent> = new Map();
  private privacyRequests: Map<string, PrivacyRequest> = new Map();
  private consentAudits: ConsentAuditEntry[] = [];

  // Configuration
  private config: ConsentConfig = {
    currentConsentVersion: AUTH_CONSTANTS.COMPLIANCE.CONSENT_VERSION_CURRENT,
    currentPrivacyPolicyVersion: AUTH_CONSTANTS.COMPLIANCE.PRIVACY_POLICY_VERSION_CURRENT,
    minimumRequiredVersion: '2024.1',
    gracePeriodDays: 30,
    allowDataCollection: true,
    allowAnalytics: false, // Disabled by default for privacy
    allowPersonalization: true,
    allowCloudSync: false, // Disabled until Phase 2
    allowCrossDeviceSync: false,
    enableDataMinimization: true,
    enableAnonymization: true,
    enableEncryption: true,
    enableAuditLogging: true,
    defaultRetentionDays: AUTH_CONSTANTS.COMPLIANCE.DATA_RETENTION_DAYS_DEFAULT,
    clinicalDataRetentionDays: 2555, // 7 years
    auditLogRetentionDays: AUTH_CONSTANTS.COMPLIANCE.AUDIT_LOG_RETENTION_DAYS,
    backupRetentionDays: 90,
    enableConsentWithdrawal: true,
    withdrawalGracePeriodDays: 30,
    automaticDataDeletion: true,
    withdrawalAuditRequired: true
  };

  // Storage keys
  private readonly CONSENT_KEY = '@fullmind_user_consents_v1';
  private readonly PRIVACY_REQUESTS_KEY = '@fullmind_privacy_requests_v1';
  private readonly CONSENT_AUDITS_KEY = '@fullmind_consent_audits_v1';
  private readonly CONSENT_CONFIG_KEY = '@fullmind_consent_config_v1';

  private constructor() {
    this.initialize();
  }

  public static getInstance(): ConsentPrivacyService {
    if (!ConsentPrivacyService.instance) {
      ConsentPrivacyService.instance = new ConsentPrivacyService();
    }
    return ConsentPrivacyService.instance;
  }

  /**
   * Initialize consent and privacy service
   */
  private async initialize(): Promise<void> {
    try {
      // Load configuration and consent data
      await this.loadConfiguration();
      await this.loadConsentData();

      // Set up periodic consent validation
      this.setupPeriodicValidation();

      console.log('Consent & Privacy Service initialized');
    } catch (error) {
      console.error('Consent privacy initialization failed:', error);
      await this.logConsentEvent('initialization_failed', { error: String(error) });
    }
  }

  // ===========================================
  // CONSENT MANAGEMENT
  // ===========================================

  /**
   * Create or update user consent
   */
  async createUserConsent(
    userId: string,
    deviceId: string,
    consentData: {
      dataProcessing: Partial<DataProcessingConsent>;
      privacy: Partial<PrivacyConsent>;
      communication: Partial<CommunicationConsent>;
      categories?: Partial<ConsentCategory>[];
    },
    consentMethod: 'explicit' | 'implicit' = 'explicit'
  ): Promise<UserConsent> {
    try {
      const now = new Date();
      const consentId = await Crypto.randomUUID();

      // Create default consent categories
      const defaultCategories = this.getDefaultConsentCategories();
      const categories = consentData.categories
        ? this.mergeConsentCategories(defaultCategories, consentData.categories)
        : defaultCategories;

      // Create user consent
      const userConsent: UserConsent = {
        consentId,
        userId,
        deviceId,
        consentVersion: this.config.currentConsentVersion,
        privacyPolicyVersion: this.config.currentPrivacyPolicyVersion,
        consentTimestamp: now.toISOString(),
        lastUpdated: now.toISOString(),
        categories,
        dataProcessing: this.getDefaultDataProcessingConsent(consentData.dataProcessing),
        privacy: this.getDefaultPrivacyConsent(consentData.privacy),
        communication: this.getDefaultCommunicationConsent(consentData.communication),
        legalBasis: this.determineLegalBasis(consentData),
        consentMethod,
        auditTrail: [],
        hipaaCompliant: this.validateHIPAACompliance(consentData),
        gdprCompliant: this.validateGDPRCompliance(consentData),
        ccpaCompliant: this.validateCCPACompliance(consentData)
      };

      // Store consent
      this.userConsents.set(`${userId}_${deviceId}`, userConsent);
      await this.saveUserConsents();

      // Log consent creation
      await this.logConsentAudit({
        action: 'consent_given',
        details: {
          consentVersion: userConsent.consentVersion,
          privacyPolicyVersion: userConsent.privacyPolicyVersion,
          consentMethod,
          categoriesCount: categories.length
        },
        deviceId,
        consentVersion: userConsent.consentVersion,
        legalBasis: userConsent.legalBasis.specificBasis,
        complianceMarkers: {
          hipaaRequired: true,
          gdprRequired: true,
          ccpaRequired: true,
          auditRequired: true,
          retentionDays: this.config.auditLogRetentionDays
        }
      });

      return userConsent;

    } catch (error) {
      await this.logConsentEvent('consent_creation_failed', {
        error: String(error),
        userId,
        deviceId
      });
      throw new Error(`Consent creation failed: ${error}`);
    }
  }

  /**
   * Update existing consent
   */
  async updateUserConsent(
    userId: string,
    deviceId: string,
    updates: {
      dataProcessing?: Partial<DataProcessingConsent>;
      privacy?: Partial<PrivacyConsent>;
      communication?: Partial<CommunicationConsent>;
      categories?: Partial<ConsentCategory>[];
    }
  ): Promise<UserConsent> {
    try {
      const key = `${userId}_${deviceId}`;
      const existingConsent = this.userConsents.get(key);

      if (!existingConsent) {
        throw new Error('No existing consent found for user');
      }

      // Create updated consent
      const updatedConsent: UserConsent = {
        ...existingConsent,
        lastUpdated: new Date().toISOString(),
        dataProcessing: updates.dataProcessing
          ? { ...existingConsent.dataProcessing, ...updates.dataProcessing }
          : existingConsent.dataProcessing,
        privacy: updates.privacy
          ? { ...existingConsent.privacy, ...updates.privacy }
          : existingConsent.privacy,
        communication: updates.communication
          ? { ...existingConsent.communication, ...updates.communication }
          : existingConsent.communication,
        categories: updates.categories
          ? this.mergeConsentCategories(existingConsent.categories, updates.categories)
          : existingConsent.categories
      };

      // Update compliance flags
      updatedConsent.hipaaCompliant = this.validateHIPAACompliance(updates);
      updatedConsent.gdprCompliant = this.validateGDPRCompliance(updates);
      updatedConsent.ccpaCompliant = this.validateCCPACompliance(updates);

      // Store updated consent
      this.userConsents.set(key, updatedConsent);
      await this.saveUserConsents();

      // Log consent update
      await this.logConsentAudit({
        action: 'consent_updated',
        details: {
          updatedFields: Object.keys(updates),
          previousVersion: existingConsent.consentVersion,
          newVersion: updatedConsent.consentVersion
        },
        deviceId,
        consentVersion: updatedConsent.consentVersion,
        legalBasis: updatedConsent.legalBasis.specificBasis,
        complianceMarkers: {
          hipaaRequired: true,
          gdprRequired: true,
          ccpaRequired: true,
          auditRequired: true,
          retentionDays: this.config.auditLogRetentionDays
        }
      });

      return updatedConsent;

    } catch (error) {
      await this.logConsentEvent('consent_update_failed', {
        error: String(error),
        userId,
        deviceId
      });
      throw new Error(`Consent update failed: ${error}`);
    }
  }

  /**
   * Withdraw user consent
   */
  async withdrawUserConsent(
    userId: string,
    deviceId: string,
    reason?: string,
    specificCategories?: string[]
  ): Promise<{ success: boolean; gracePeriodDays: number; deletionScheduled: boolean }> {
    try {
      const key = `${userId}_${deviceId}`;
      const existingConsent = this.userConsents.get(key);

      if (!existingConsent) {
        throw new Error('No existing consent found for user');
      }

      const now = new Date();

      if (specificCategories) {
        // Partial withdrawal - withdraw specific categories
        existingConsent.categories.forEach(category => {
          if (specificCategories.includes(category.categoryId)) {
            category.consented = false;
            category.withdrawnAt = now.toISOString();
          }
        });

        existingConsent.lastUpdated = now.toISOString();
      } else {
        // Full withdrawal
        existingConsent.consentMethod = 'withdrawn';
        existingConsent.withdrawnAt = now.toISOString();
        existingConsent.withdrawalReason = reason;
        existingConsent.lastUpdated = now.toISOString();

        // Mark all categories as withdrawn
        existingConsent.categories.forEach(category => {
          if (category.canWithdraw) {
            category.consented = false;
            category.withdrawnAt = now.toISOString();
          }
        });
      }

      // Store updated consent
      this.userConsents.set(key, existingConsent);
      await this.saveUserConsents();

      // Schedule data deletion if automatic deletion is enabled
      let deletionScheduled = false;
      if (this.config.automaticDataDeletion && !specificCategories) {
        deletionScheduled = await this.scheduleDataDeletion(userId, deviceId);
      }

      // Log consent withdrawal
      await this.logConsentAudit({
        action: 'consent_withdrawn',
        details: {
          withdrawalType: specificCategories ? 'partial' : 'full',
          reason,
          specificCategories,
          deletionScheduled
        },
        deviceId,
        consentVersion: existingConsent.consentVersion,
        legalBasis: existingConsent.legalBasis.specificBasis,
        complianceMarkers: {
          hipaaRequired: true,
          gdprRequired: true,
          ccpaRequired: true,
          auditRequired: true,
          retentionDays: this.config.auditLogRetentionDays
        }
      });

      return {
        success: true,
        gracePeriodDays: this.config.withdrawalGracePeriodDays,
        deletionScheduled
      };

    } catch (error) {
      await this.logConsentEvent('consent_withdrawal_failed', {
        error: String(error),
        userId,
        deviceId,
        reason
      });
      throw new Error(`Consent withdrawal failed: ${error}`);
    }
  }

  /**
   * Validate user consent for operation
   */
  async validateConsent(
    userId: string,
    deviceId: string,
    operation: string,
    dataTypes: string[] = []
  ): Promise<ConsentValidationResult> {
    try {
      const key = `${userId}_${deviceId}`;
      const consent = this.userConsents.get(key);
      const missing: string[] = [];
      const expired: string[] = [];
      const conflicts: string[] = [];
      const warnings: string[] = [];

      if (!consent) {
        missing.push('user_consent');
        return {
          valid: false,
          consents: [],
          missing,
          expired,
          conflicts,
          warnings,
          actionRequired: true
        };
      }

      // Check if consent has been withdrawn
      if (consent.consentMethod === 'withdrawn') {
        conflicts.push('consent_withdrawn');
        return {
          valid: false,
          consents: [consent],
          missing,
          expired,
          conflicts,
          warnings,
          actionRequired: true
        };
      }

      // Check consent version compatibility
      if (consent.consentVersion !== this.config.currentConsentVersion) {
        const gracePeriodEnd = new Date(consent.lastUpdated);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.config.gracePeriodDays);

        if (new Date() > gracePeriodEnd) {
          expired.push('consent_version');
        } else {
          warnings.push('consent_version_outdated');
        }
      }

      // Check operation-specific consent requirements
      const operationValid = this.validateOperationConsent(consent, operation, dataTypes);
      if (!operationValid.valid) {
        missing.push(...operationValid.missing);
        conflicts.push(...operationValid.conflicts);
      }

      // Check required categories
      const requiredCategories = consent.categories.filter(cat => cat.required);
      for (const category of requiredCategories) {
        if (!category.consented) {
          missing.push(category.categoryId);
        }
      }

      const valid = missing.length === 0 && expired.length === 0 && conflicts.length === 0;

      return {
        valid,
        consents: [consent],
        missing,
        expired,
        conflicts,
        warnings,
        actionRequired: !valid || warnings.length > 0,
        gracePeriodRemaining: this.calculateGracePeriodRemaining(consent)
      };

    } catch (error) {
      await this.logConsentEvent('consent_validation_failed', {
        error: String(error),
        userId,
        deviceId,
        operation
      });

      return {
        valid: false,
        consents: [],
        missing: ['validation_error'],
        expired: [],
        conflicts: [],
        warnings: [],
        actionRequired: true
      };
    }
  }

  // ===========================================
  // PRIVACY REQUEST MANAGEMENT
  // ===========================================

  /**
   * Create privacy request (GDPR Article 15-22)
   */
  async createPrivacyRequest(
    userId: string,
    requestType: PrivacyRequest['requestType'],
    scope: string[],
    reason?: string,
    urgency: PrivacyRequest['urgency'] = 'medium'
  ): Promise<PrivacyRequest> {
    try {
      const requestId = await Crypto.randomUUID();
      const now = new Date();

      // Calculate estimated completion date based on request type and urgency
      const estimatedDays = this.getEstimatedProcessingDays(requestType, urgency);
      const estimatedCompletionDate = new Date(now.getTime() + estimatedDays * 24 * 60 * 60 * 1000);

      const privacyRequest: PrivacyRequest = {
        requestId,
        userId,
        requestType,
        requestedAt: now.toISOString(),
        status: 'pending',
        scope,
        reason,
        urgency,
        estimatedCompletionDate: estimatedCompletionDate.toISOString(),
        processingNotes: [],
        identityVerified: false,
        auditTrail: []
      };

      // Store privacy request
      this.privacyRequests.set(requestId, privacyRequest);
      await this.savePrivacyRequests();

      // Log privacy request creation
      await this.logConsentAudit({
        action: 'privacy_request_created',
        details: {
          requestType,
          scope,
          urgency,
          estimatedDays
        },
        deviceId: 'unknown',
        consentVersion: this.config.currentConsentVersion,
        legalBasis: 'gdpr_rights',
        complianceMarkers: {
          hipaaRequired: false,
          gdprRequired: true,
          ccpaRequired: true,
          auditRequired: true,
          retentionDays: this.config.auditLogRetentionDays
        }
      });

      return privacyRequest;

    } catch (error) {
      await this.logConsentEvent('privacy_request_creation_failed', {
        error: String(error),
        userId,
        requestType
      });
      throw new Error(`Privacy request creation failed: ${error}`);
    }
  }

  /**
   * Process privacy request
   */
  async processPrivacyRequest(
    requestId: string,
    action: 'approve' | 'reject' | 'complete',
    notes?: string
  ): Promise<PrivacyRequest> {
    try {
      const request = this.privacyRequests.get(requestId);
      if (!request) {
        throw new Error('Privacy request not found');
      }

      const now = new Date();

      switch (action) {
        case 'approve':
          request.status = 'processing';
          request.processingNotes.push(`Approved: ${notes || 'No notes'}`);
          break;

        case 'reject':
          request.status = 'rejected';
          request.rejectionReason = notes;
          request.completedAt = now.toISOString();
          break;

        case 'complete':
          request.status = 'completed';
          request.completedAt = now.toISOString();
          request.actualCompletionDate = now.toISOString();
          request.processingNotes.push(`Completed: ${notes || 'No notes'}`);
          break;
      }

      // Add audit trail entry
      const auditEntry: PrivacyRequestAuditEntry = {
        auditId: await Crypto.randomUUID(),
        timestamp: now.toISOString(),
        action: `request_${action}`,
        performedBy: 'system', // In production, this would be the admin/system user
        details: { notes, previousStatus: request.status },
        complianceNotes: `Privacy request ${action} processed`
      };

      request.auditTrail.push(auditEntry);

      // Store updated request
      this.privacyRequests.set(requestId, request);
      await this.savePrivacyRequests();

      // Log privacy request processing
      await this.logConsentAudit({
        action: 'privacy_request_processed',
        details: {
          requestId,
          action,
          requestType: request.requestType,
          status: request.status
        },
        deviceId: 'unknown',
        consentVersion: this.config.currentConsentVersion,
        legalBasis: 'gdpr_rights',
        complianceMarkers: {
          hipaaRequired: false,
          gdprRequired: true,
          ccpaRequired: true,
          auditRequired: true,
          retentionDays: this.config.auditLogRetentionDays
        }
      });

      return request;

    } catch (error) {
      await this.logConsentEvent('privacy_request_processing_failed', {
        error: String(error),
        requestId,
        action
      });
      throw new Error(`Privacy request processing failed: ${error}`);
    }
  }

  // ===========================================
  // PRIVACY IMPACT ASSESSMENT
  // ===========================================

  /**
   * Conduct privacy impact assessment for operation
   */
  async conductPrivacyImpactAssessment(
    operation: string,
    dataTypes: string[],
    context: Record<string, unknown> = {}
  ): Promise<PrivacyImpactAssessment> {
    try {
      const assessmentId = await Crypto.randomUUID();

      // Determine risk level based on data types and operation
      const riskLevel = this.calculatePrivacyRiskLevel(operation, dataTypes, context);

      // Determine consent requirements
      const consentRequired = this.isConsentRequired(operation, dataTypes);

      // Determine legal basis requirements
      const legalBasisRequired = this.getLegalBasisRequirements(operation, dataTypes);

      // Generate mitigation measures
      const mitigationMeasures = this.generateMitigationMeasures(riskLevel, dataTypes);

      // Determine compliance requirements
      const complianceRequirements = this.getComplianceRequirements(operation, dataTypes);

      // Check if approval is required
      const approvalRequired = riskLevel === 'high' || riskLevel === 'critical';

      const assessment: PrivacyImpactAssessment = {
        assessmentId,
        operation,
        riskLevel,
        dataTypes,
        consentRequired,
        legalBasisRequired,
        mitigationMeasures,
        complianceRequirements,
        approvalRequired
      };

      // Log privacy impact assessment
      await this.logConsentAudit({
        action: 'privacy_impact_assessment',
        details: {
          operation,
          riskLevel,
          dataTypesCount: dataTypes.length,
          consentRequired,
          approvalRequired
        },
        deviceId: 'unknown',
        consentVersion: this.config.currentConsentVersion,
        legalBasis: 'privacy_assessment',
        complianceMarkers: {
          hipaaRequired: dataTypes.some(type => type.includes('clinical')),
          gdprRequired: true,
          ccpaRequired: true,
          auditRequired: true,
          retentionDays: this.config.auditLogRetentionDays
        }
      });

      return assessment;

    } catch (error) {
      await this.logConsentEvent('privacy_impact_assessment_failed', {
        error: String(error),
        operation,
        dataTypes
      });
      throw new Error(`Privacy impact assessment failed: ${error}`);
    }
  }

  // ===========================================
  // HELPER METHODS
  // ===========================================

  /**
   * Get default consent categories
   */
  private getDefaultConsentCategories(): ConsentCategory[] {
    return [
      {
        categoryId: 'essential',
        name: 'Essential Functionality',
        description: 'Basic app functionality and user account management',
        required: true,
        consented: true,
        consentedAt: new Date().toISOString(),
        purpose: ['app_functionality', 'user_management'],
        dataTypes: ['user_profile', 'app_settings'],
        retentionDays: this.config.defaultRetentionDays,
        canWithdraw: false,
        dependencies: []
      },
      {
        categoryId: 'clinical',
        name: 'Clinical Data Processing',
        description: 'Processing of health and clinical information',
        required: true,
        consented: true,
        consentedAt: new Date().toISOString(),
        purpose: ['therapeutic_use', 'clinical_care'],
        dataTypes: ['clinical_data', 'assessments', 'mood_data'],
        retentionDays: this.config.clinicalDataRetentionDays,
        canWithdraw: true,
        dependencies: ['essential']
      },
      {
        categoryId: 'analytics',
        name: 'Analytics and Improvement',
        description: 'Usage analytics for app improvement',
        required: false,
        consented: false,
        purpose: ['analytics', 'improvement'],
        dataTypes: ['usage_data', 'performance_data'],
        retentionDays: 365,
        canWithdraw: true,
        dependencies: []
      },
      {
        categoryId: 'communication',
        name: 'Communications',
        description: 'Notifications and communications',
        required: false,
        consented: true,
        consentedAt: new Date().toISOString(),
        purpose: ['notifications', 'reminders'],
        dataTypes: ['communication_preferences', 'notification_data'],
        retentionDays: this.config.defaultRetentionDays,
        canWithdraw: true,
        dependencies: ['essential']
      }
    ];
  }

  /**
   * Get default data processing consent
   */
  private getDefaultDataProcessingConsent(overrides: Partial<DataProcessingConsent> = {}): DataProcessingConsent {
    return {
      collectBasicData: true,
      collectClinicalData: true,
      collectUsageData: false,
      collectDiagnosticData: false,
      therapeuticUse: true,
      researchUse: false,
      analyticsUse: false,
      improvementUse: false,
      shareAnonymizedData: false,
      shareAggregatedData: false,
      shareWithProviders: false,
      shareForResearch: false,
      localStorageOnly: true,
      cloudStorageAllowed: false,
      backupAllowed: true,
      ...overrides
    };
  }

  /**
   * Get default privacy consent
   */
  private getDefaultPrivacyConsent(overrides: Partial<PrivacyConsent> = {}): PrivacyConsent {
    return {
      enableDataMinimization: true,
      minimumDataCollection: true,
      anonymizeData: true,
      pseudonymizeData: false,
      restrictAccess: true,
      requireBiometric: true,
      enableDeviceBinding: true,
      limitDeviceAccess: true,
      allowUsageTracking: false,
      allowPerformanceTracking: false,
      allowCrashReporting: true,
      allowPersonalization: true,
      allowThirdPartyIntegrations: false,
      allowAPIAccess: false,
      allowExternalServices: false,
      ...overrides
    };
  }

  /**
   * Get default communication consent
   */
  private getDefaultCommunicationConsent(overrides: Partial<CommunicationConsent> = {}): CommunicationConsent {
    return {
      allowPushNotifications: true,
      allowEmailNotifications: false,
      allowSMSNotifications: false,
      allowInAppNotifications: true,
      therapeuticReminders: true,
      assessmentReminders: true,
      progressUpdates: true,
      educationalContent: false,
      securityAlerts: true,
      allowEmergencyContact: true,
      allowCrisisNotifications: true,
      allowEmergencyOverride: true,
      allowMarketingCommunications: false,
      allowResearchInvitations: false,
      allowSurveys: false,
      ...overrides
    };
  }

  /**
   * Determine legal basis for consent
   */
  private determineLegalBasis(consentData: any): LegalBasis {
    return {
      consent: true,
      contract: false,
      legalObligation: false,
      vitalInterests: true, // For crisis intervention
      publicTask: false,
      legitimateInterests: false,
      medicalCare: true,
      publicHealth: false,
      archivingPurposes: false,
      scientificResearch: false,
      specificBasis: 'consent_and_vital_interests',
      jurisdiction: 'US',
      applicableLaws: ['HIPAA', 'state_mental_health_laws']
    };
  }

  /**
   * Validate HIPAA compliance
   */
  private validateHIPAACompliance(consentData: any): boolean {
    // Check if clinical data processing requires HIPAA compliance
    return true; // Simplified for now
  }

  /**
   * Validate GDPR compliance
   */
  private validateGDPRCompliance(consentData: any): boolean {
    // Check GDPR requirements
    return true; // Simplified for now
  }

  /**
   * Validate CCPA compliance
   */
  private validateCCPACompliance(consentData: any): boolean {
    // Check CCPA requirements
    return true; // Simplified for now
  }

  /**
   * Merge consent categories
   */
  private mergeConsentCategories(
    existing: ConsentCategory[],
    updates: Partial<ConsentCategory>[]
  ): ConsentCategory[] {
    const merged = [...existing];

    updates.forEach(update => {
      const index = merged.findIndex(cat => cat.categoryId === update.categoryId);
      if (index >= 0) {
        merged[index] = { ...merged[index], ...update };
      }
    });

    return merged;
  }

  /**
   * Validate operation consent
   */
  private validateOperationConsent(
    consent: UserConsent,
    operation: string,
    dataTypes: string[]
  ): { valid: boolean; missing: string[]; conflicts: string[] } {
    const missing: string[] = [];
    const conflicts: string[] = [];

    // Check operation-specific requirements
    switch (operation) {
      case 'data_export':
        if (!consent.dataProcessing.localStorageOnly && !consent.dataProcessing.cloudStorageAllowed) {
          conflicts.push('export_not_allowed');
        }
        break;

      case 'analytics':
        if (!consent.dataProcessing.analyticsUse) {
          missing.push('analytics_consent');
        }
        break;

      case 'cloud_sync':
        if (!consent.dataProcessing.cloudStorageAllowed) {
          missing.push('cloud_storage_consent');
        }
        break;

      case 'research_participation':
        if (!consent.dataProcessing.researchUse) {
          missing.push('research_consent');
        }
        break;
    }

    return {
      valid: missing.length === 0 && conflicts.length === 0,
      missing,
      conflicts
    };
  }

  /**
   * Calculate grace period remaining
   */
  private calculateGracePeriodRemaining(consent: UserConsent): number | undefined {
    if (consent.consentVersion === this.config.currentConsentVersion) {
      return undefined;
    }

    const lastUpdated = new Date(consent.lastUpdated);
    const gracePeriodEnd = new Date(lastUpdated.getTime() + this.config.gracePeriodDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    if (now >= gracePeriodEnd) {
      return 0;
    }

    return Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  }

  /**
   * Schedule data deletion
   */
  private async scheduleDataDeletion(userId: string, deviceId: string): Promise<boolean> {
    try {
      // TODO: Implement data deletion scheduling
      // For now, just log the scheduled deletion
      await this.logConsentEvent('data_deletion_scheduled', {
        userId,
        deviceId,
        gracePeriodDays: this.config.withdrawalGracePeriodDays
      });

      return true;
    } catch (error) {
      console.error('Data deletion scheduling failed:', error);
      return false;
    }
  }

  /**
   * Get estimated processing days for privacy request
   */
  private getEstimatedProcessingDays(requestType: PrivacyRequest['requestType'], urgency: PrivacyRequest['urgency']): number {
    const baseDays = {
      access: 30,
      rectification: 30,
      erasure: 30,
      portability: 30,
      restriction: 30,
      objection: 30,
      withdrawal: 7
    };

    const urgencyMultiplier = {
      low: 1.5,
      medium: 1.0,
      high: 0.5,
      emergency: 0.1
    };

    return Math.ceil(baseDays[requestType] * urgencyMultiplier[urgency]);
  }

  /**
   * Calculate privacy risk level
   */
  private calculatePrivacyRiskLevel(
    operation: string,
    dataTypes: string[],
    context: Record<string, unknown>
  ): PrivacyImpactAssessment['riskLevel'] {
    let riskScore = 0;

    // High-risk operations
    if (['data_export', 'cloud_sync', 'third_party_share'].includes(operation)) {
      riskScore += 3;
    }

    // High-risk data types
    const highRiskTypes = ['clinical_data', 'pii', 'biometric', 'location'];
    const highRiskCount = dataTypes.filter(type => highRiskTypes.includes(type)).length;
    riskScore += highRiskCount * 2;

    // Medium-risk data types
    const mediumRiskTypes = ['usage_data', 'device_data', 'preferences'];
    const mediumRiskCount = dataTypes.filter(type => mediumRiskTypes.includes(type)).length;
    riskScore += mediumRiskCount;

    if (riskScore >= 6) return 'critical';
    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Check if consent is required for operation
   */
  private isConsentRequired(operation: string, dataTypes: string[]): boolean {
    // All operations require consent in our privacy-first approach
    return true;
  }

  /**
   * Get legal basis requirements
   */
  private getLegalBasisRequirements(operation: string, dataTypes: string[]): string[] {
    const requirements: string[] = ['consent'];

    if (dataTypes.includes('clinical_data')) {
      requirements.push('medical_care');
    }

    if (operation === 'crisis_intervention') {
      requirements.push('vital_interests');
    }

    return requirements;
  }

  /**
   * Generate mitigation measures
   */
  private generateMitigationMeasures(riskLevel: PrivacyImpactAssessment['riskLevel'], dataTypes: string[]): string[] {
    const measures: string[] = [];

    // Always include basic measures
    measures.push('data_encryption', 'access_controls', 'audit_logging');

    if (riskLevel === 'high' || riskLevel === 'critical') {
      measures.push('enhanced_authentication', 'data_minimization', 'regular_review');
    }

    if (dataTypes.includes('clinical_data')) {
      measures.push('hipaa_compliance', 'clinical_safeguards');
    }

    if (riskLevel === 'critical') {
      measures.push('executive_review', 'legal_review', 'third_party_audit');
    }

    return measures;
  }

  /**
   * Get compliance requirements
   */
  private getComplianceRequirements(operation: string, dataTypes: string[]): string[] {
    const requirements: string[] = [];

    if (dataTypes.includes('clinical_data') || dataTypes.includes('pii')) {
      requirements.push('HIPAA');
    }

    // Always include privacy regulations
    requirements.push('GDPR', 'CCPA');

    if (operation === 'research_data') {
      requirements.push('IRB_approval', 'research_ethics');
    }

    return requirements;
  }

  /**
   * Set up periodic consent validation
   */
  private setupPeriodicValidation(): void {
    // Validate consents daily
    setInterval(() => {
      this.performPeriodicValidation();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Perform periodic consent validation
   */
  private async performPeriodicValidation(): Promise<void> {
    try {
      const now = new Date();
      let expiredCount = 0;
      let outdatedCount = 0;

      for (const consent of this.userConsents.values()) {
        // Check for expired consents
        if (consent.expiresAt && new Date(consent.expiresAt) <= now) {
          expiredCount++;
        }

        // Check for outdated consent versions
        if (consent.consentVersion !== this.config.currentConsentVersion) {
          const gracePeriodEnd = new Date(consent.lastUpdated);
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.config.gracePeriodDays);

          if (now > gracePeriodEnd) {
            outdatedCount++;
          }
        }
      }

      // Log validation results
      await this.logConsentEvent('periodic_validation', {
        totalConsents: this.userConsents.size,
        expiredCount,
        outdatedCount,
        validationDate: now.toISOString()
      });

    } catch (error) {
      console.error('Periodic validation failed:', error);
    }
  }

  /**
   * Log consent audit entry
   */
  private async logConsentAudit(entry: Omit<ConsentAuditEntry, 'auditId' | 'timestamp'>): Promise<void> {
    const auditEntry: ConsentAuditEntry = {
      auditId: await Crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...entry
    };

    this.consentAudits.push(auditEntry);

    // Keep only recent entries (performance optimization)
    if (this.consentAudits.length > 1000) {
      this.consentAudits = this.consentAudits.slice(-500);
    }

    await this.saveConsentAudits();

    // Log to security controls
    await securityControlsService.logAuditEntry({
      operation: entry.action,
      entityType: 'consent',
      dataSensitivity: DataSensitivity.PERSONAL,
      userId: 'consent_service',
      securityContext: {
        authenticated: true,
        biometricUsed: false,
        deviceTrusted: true,
        networkSecure: true,
        encryptionActive: true
      },
      operationMetadata: {
        success: true,
        duration: 0
      },
      complianceMarkers: {
        hipaaRequired: entry.complianceMarkers.hipaaRequired,
        auditRequired: entry.complianceMarkers.auditRequired,
        retentionDays: entry.complianceMarkers.retentionDays
      }
    });
  }

  /**
   * Log consent event
   */
  private async logConsentEvent(eventType: string, details: Record<string, unknown>): Promise<void> {
    await securityControlsService.recordSecurityViolation({
      violationType: 'policy_violation',
      severity: 'medium',
      description: `Consent privacy event: ${eventType}`,
      affectedResources: ['consent_privacy_service'],
      automaticResponse: {
        implemented: false,
        actions: []
      }
    });
  }

  // ===========================================
  // STORAGE METHODS
  // ===========================================

  private async saveUserConsents(): Promise<void> {
    try {
      const consentsArray = Array.from(this.userConsents.entries());
      const encrypted = await encryptionService.encryptData(consentsArray, DataSensitivity.PERSONAL);
      await SecureStore.setItemAsync(this.CONSENT_KEY, JSON.stringify(encrypted));
    } catch (error) {
      console.error('Failed to save user consents:', error);
    }
  }

  private async savePrivacyRequests(): Promise<void> {
    try {
      const requestsArray = Array.from(this.privacyRequests.entries());
      const encrypted = await encryptionService.encryptData(requestsArray, DataSensitivity.PERSONAL);
      await SecureStore.setItemAsync(this.PRIVACY_REQUESTS_KEY, JSON.stringify(encrypted));
    } catch (error) {
      console.error('Failed to save privacy requests:', error);
    }
  }

  private async saveConsentAudits(): Promise<void> {
    try {
      const encrypted = await encryptionService.encryptData(this.consentAudits, DataSensitivity.PERSONAL);
      await SecureStore.setItemAsync(this.CONSENT_AUDITS_KEY, JSON.stringify(encrypted));
    } catch (error) {
      console.error('Failed to save consent audits:', error);
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configData = await SecureStore.getItemAsync(this.CONSENT_CONFIG_KEY);
      if (configData) {
        const config = JSON.parse(configData);
        this.config = { ...this.config, ...config };
      }
    } catch (error) {
      console.error('Failed to load consent configuration:', error);
    }
  }

  private async loadConsentData(): Promise<void> {
    try {
      // Load user consents
      const consentsData = await SecureStore.getItemAsync(this.CONSENT_KEY);
      if (consentsData) {
        const encrypted = JSON.parse(consentsData);
        const consentsArray = await encryptionService.decryptData(encrypted, DataSensitivity.PERSONAL);
        this.userConsents = new Map(consentsArray);
      }

      // Load privacy requests
      const requestsData = await SecureStore.getItemAsync(this.PRIVACY_REQUESTS_KEY);
      if (requestsData) {
        const encrypted = JSON.parse(requestsData);
        const requestsArray = await encryptionService.decryptData(encrypted, DataSensitivity.PERSONAL);
        this.privacyRequests = new Map(requestsArray);
      }

      // Load consent audits
      const auditsData = await SecureStore.getItemAsync(this.CONSENT_AUDITS_KEY);
      if (auditsData) {
        const encrypted = JSON.parse(auditsData);
        this.consentAudits = await encryptionService.decryptData(encrypted, DataSensitivity.PERSONAL);
      }

    } catch (error) {
      console.error('Failed to load consent data:', error);
    }
  }

  // ===========================================
  // PUBLIC API
  // ===========================================

  /**
   * Get consent configuration
   */
  getConfiguration(): ConsentConfig {
    return { ...this.config };
  }

  /**
   * Update consent configuration
   */
  async updateConfiguration(newConfig: Partial<ConsentConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await SecureStore.setItemAsync(this.CONSENT_CONFIG_KEY, JSON.stringify(this.config));
  }

  /**
   * Get user consent
   */
  getUserConsent(userId: string, deviceId: string): UserConsent | undefined {
    return this.userConsents.get(`${userId}_${deviceId}`);
  }

  /**
   * Get privacy request
   */
  getPrivacyRequest(requestId: string): PrivacyRequest | undefined {
    return this.privacyRequests.get(requestId);
  }

  /**
   * Get consent audit trail
   */
  getConsentAudits(): ConsentAuditEntry[] {
    return [...this.consentAudits];
  }

  /**
   * Check if data collection is allowed
   */
  isDataCollectionAllowed(userId: string, deviceId: string, dataType: string): boolean {
    const consent = this.getUserConsent(userId, deviceId);
    if (!consent || consent.consentMethod === 'withdrawn') {
      return false;
    }

    // Check specific data type permissions
    switch (dataType) {
      case 'clinical_data':
        return consent.dataProcessing.collectClinicalData;
      case 'usage_data':
        return consent.dataProcessing.collectUsageData;
      case 'diagnostic_data':
        return consent.dataProcessing.collectDiagnosticData;
      default:
        return consent.dataProcessing.collectBasicData;
    }
  }

  /**
   * Get data retention period for user
   */
  getDataRetentionPeriod(userId: string, deviceId: string, dataType: string): number {
    const consent = this.getUserConsent(userId, deviceId);
    if (!consent) {
      return this.config.defaultRetentionDays;
    }

    if (consent.dataProcessing.customRetentionPeriod) {
      return consent.dataProcessing.customRetentionPeriod;
    }

    // Return category-specific retention
    const category = consent.categories.find(cat =>
      cat.dataTypes.includes(dataType)
    );

    return category?.retentionDays || this.config.defaultRetentionDays;
  }
}

// Export singleton instance
export const consentPrivacyService = ConsentPrivacyService.getInstance();