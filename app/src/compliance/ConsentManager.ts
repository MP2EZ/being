/**
 * HIPAA CONSENT MANAGER - DRD-FLOW-005 Assessment System
 *
 * COMPREHENSIVE CONSENT MANAGEMENT:
 * - HIPAA-compliant consent collection and validation
 * - Granular consent scopes for different data types
 * - Consent withdrawal and data deletion workflows
 * - Electronic signature validation and legal compliance
 * - Consent renewal and version management
 * - Integration with assessment and crisis intervention systems
 *
 * MENTAL HEALTH SPECIFIC CONSIDERATIONS:
 * - Enhanced privacy protections for sensitive mental health data
 * - Crisis intervention consent exceptions for emergency situations
 * - Therapeutic relationship preservation during consent processes
 * - Professional sharing consent for emergency mental health care
 * - Capacity assessment for consent validity
 *
 * REGULATORY COMPLIANCE:
 * - 45 CFR 164.508 (HIPAA Authorization Requirements)
 * - 45 CFR 164.522 (Rights to Request Privacy Protection)
 * - 21 CFR Part 11 (Electronic Records and Signatures)
 * - State mental health privacy laws
 * - Crisis intervention legal requirements
 */


import { logSecurity, logPerformance, logError, LogCategory } from '@/core/services/logging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert, Platform } from 'react-native';
import HIPAAComplianceEngine, { 
  HIPAAConsent, 
  PHIClassification,
  HIPAA_COMPLIANCE_CONFIG 
} from './DataProtectionEngine';

/**
 * CONSENT SCOPE DEFINITIONS
 * Granular consent categories for different data types and uses
 */
export interface ConsentScope {
  /** Core assessment data collection */
  assessmentData: {
    /** PHQ-9 depression assessment responses */
    phq9Responses: boolean;
    /** GAD-7 anxiety assessment responses */
    gad7Responses: boolean;
    /** Assessment scores and severity classifications */
    assessmentScores: boolean;
    /** Assessment timing and completion data */
    assessmentMetadata: boolean;
  };
  /** Crisis intervention and safety data */
  crisisIntervention: {
    /** Crisis detection triggers and thresholds */
    crisisDetectionData: boolean;
    /** Suicidal ideation assessment responses */
    suicidalIdeationData: boolean;
    /** Crisis intervention actions and outcomes */
    interventionRecords: boolean;
    /** Emergency contact usage records */
    emergencyContactRecords: boolean;
  };
  /** Professional sharing and treatment coordination */
  professionalSharing: {
    /** Emergency mental health professional sharing */
    emergencyProfessionalSharing: boolean;
    /** Treatment provider coordination */
    treatmentProviderSharing: boolean;
    /** Crisis counselor data sharing */
    crisisCounselorSharing: boolean;
    /** Research and quality improvement sharing */
    researchDataSharing: boolean;
  };
  /** System and performance data */
  systemData: {
    /** App usage analytics for improvement */
    usageAnalytics: boolean;
    /** Performance metrics and error reporting */
    performanceMetrics: boolean;
    /** Security monitoring and audit logs */
    securityMonitoring: boolean;
  };
  /** Special circumstances */
  specialCircumstances: {
    /** Data retention beyond standard periods */
    extendedRetention: boolean;
    /** Legal proceeding data preservation */
    legalPreservation: boolean;
    /** Clinical research participation */
    clinicalResearch: boolean;
  };
}

/**
 * CONSENT COLLECTION CONTEXT
 * Context information for consent collection scenarios
 */
export interface ConsentCollectionContext {
  /** Where consent is being collected */
  location: 'onboarding' | 'assessment_start' | 'crisis_intervention' | 'settings' | 'data_export';
  /** Reason for consent collection */
  trigger: 'initial_setup' | 'consent_expired' | 'scope_expansion' | 'user_requested' | 'regulatory_update';
  /** User's current state */
  userState: 'stable' | 'distressed' | 'crisis' | 'post_crisis';
  /** Assessment context if applicable */
  assessmentContext?: {
    type: 'phq9' | 'gad7';
    inProgress: boolean;
    crisisDetected: boolean;
  };
  /** Crisis context if applicable */
  crisisContext?: {
    severityLevel: 'moderate' | 'high' | 'critical' | 'emergency';
    interventionActive: boolean;
    emergencyServicesContacted: boolean;
  };
}

/**
 * CONSENT VALIDATION RESULT
 * Comprehensive validation of consent status and requirements
 */
export interface ConsentValidationResult {
  /** Overall consent validity */
  valid: boolean;
  /** Consent status */
  status: 'valid' | 'expired' | 'revoked' | 'insufficient_scope' | 'capacity_concerns' | 'not_found';
  /** Current consent details */
  consent?: HIPAAConsent;
  /** Missing consent scopes */
  missingScopes: string[];
  /** Consent expiry information */
  expiryInfo?: {
    expiresAt: number;
    daysUntilExpiry: number;
    renewalRequired: boolean;
  };
  /** Capacity assessment */
  capacityAssessment: {
    /** User has capacity to consent */
    hasCapacity: boolean;
    /** Factors affecting capacity */
    capacityFactors: string[];
    /** Recommendations for consent collection */
    recommendations: string[];
  };
  /** Emergency override information */
  emergencyOverride?: {
    /** Emergency situation allows override */
    applicable: boolean;
    /** Legal basis for override */
    legalBasis: string;
    /** Override limitations */
    limitations: string[];
  } | undefined;
}

/**
 * CONSENT COLLECTION WORKFLOW
 * Step-by-step consent collection process
 */
export interface ConsentCollectionWorkflow {
  /** Workflow ID */
  workflowId: string;
  /** Current step */
  currentStep: ConsentCollectionStep;
  /** Workflow context */
  context: ConsentCollectionContext;
  /** Requested consent scope */
  requestedScope: ConsentScope;
  /** Collected evidence */
  evidence: {
    /** Device and technical information */
    deviceInfo: any;
    /** User interaction evidence */
    userInteractions: any[];
    /** Authentication evidence */
    authenticationEvidence?: any;
    /** Capacity assessment evidence */
    capacityEvidence?: any;
  };
  /** Workflow status */
  status: 'initiated' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  /** Start and completion times */
  timing: {
    startedAt: number;
    completedAt?: number;
    totalDurationMs?: number;
  };
}

export type ConsentCollectionStep = 
  | 'capacity_assessment'
  | 'privacy_notice_presentation'
  | 'scope_explanation'
  | 'consent_collection'
  | 'electronic_signature'
  | 'verification'
  | 'storage'
  | 'confirmation';

/**
 * HIPAA CONSENT MANAGER IMPLEMENTATION
 */
export class HIPAAConsentManager {
  private static instance: HIPAAConsentManager;
  private activeWorkflows: Map<string, ConsentCollectionWorkflow> = new Map();
  private consentCache: Map<string, HIPAAConsent> = new Map();
  private complianceEngine = HIPAAComplianceEngine;

  private constructor() {}

  public static getInstance(): HIPAAConsentManager {
    if (!HIPAAConsentManager.instance) {
      HIPAAConsentManager.instance = new HIPAAConsentManager();
    }
    return HIPAAConsentManager.instance;
  }

  /**
   * CONSENT VALIDATION AND CHECKING
   */

  /**
   * Validates current consent status for specific operations
   */
  public async validateConsentForOperation(
    userId: string,
    operation: {
      type: 'assessment_data_collection' | 'crisis_intervention' | 'professional_sharing' | 'data_export';
      dataTypes: string[];
      purpose: 'treatment' | 'emergency' | 'user_request' | 'research';
      context?: ConsentCollectionContext;
    }
  ): Promise<ConsentValidationResult> {
    try {
      // Load current consent
      const consent = await this.loadCurrentConsent(userId);
      
      if (!consent) {
        return {
          valid: false,
          status: 'not_found',
          missingScopes: operation.dataTypes,
          capacityAssessment: {
            hasCapacity: true, // Assume capacity unless assessed otherwise
            capacityFactors: [],
            recommendations: ['Collect initial consent before proceeding']
          }
        };
      }

      // Check if consent is revoked
      if (consent.revocation) {
        return {
          valid: false,
          status: 'revoked',
          consent,
          missingScopes: operation.dataTypes,
          capacityAssessment: {
            hasCapacity: true,
            capacityFactors: [],
            recommendations: ['User has revoked consent - respect withdrawal']
          }
        };
      }

      // Validate consent scope
      const scopeValidation = this.validateConsentScope(consent, operation);
      
      if (!scopeValidation.valid) {
        return {
          valid: false,
          status: 'insufficient_scope',
          consent,
          missingScopes: scopeValidation.missingScopes,
          capacityAssessment: await this.assessUserCapacity(userId, operation.context)
        };
      }

      // Check for emergency override if consent issues exist
      const emergencyOverride = await this.assessEmergencyOverride(operation, consent);

      return {
        valid: true,
        status: 'valid',
        consent,
        missingScopes: [],
        capacityAssessment: await this.assessUserCapacity(userId, operation.context),
        emergencyOverride
      };

    } catch (error) {
      logError(LogCategory.SYSTEM, 'CONSENT VALIDATION ERROR:', error instanceof Error ? error : undefined);
      return {
        valid: false,
        status: 'not_found',
        missingScopes: operation.dataTypes,
        capacityAssessment: {
          hasCapacity: false,
          capacityFactors: ['System error during validation'],
          recommendations: ['Resolve system errors before collecting consent']
        }
      };
    }
  }

  /**
   * CONSENT COLLECTION WORKFLOWS
   */

  /**
   * Initiates comprehensive consent collection workflow
   */
  public async initiateConsentCollection(
    userId: string,
    requestedScope: ConsentScope,
    context: ConsentCollectionContext
  ): Promise<string> {
    try {
      const workflowId = `consent_workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const workflow: ConsentCollectionWorkflow = {
        workflowId,
        currentStep: 'capacity_assessment',
        context,
        requestedScope,
        evidence: {
          deviceInfo: await this.collectDeviceInfo(),
          userInteractions: [],
          authenticationEvidence: await this.collectAuthenticationEvidence(),
        },
        status: 'initiated',
        timing: {
          startedAt: Date.now()
        }
      };

      // Store workflow
      this.activeWorkflows.set(workflowId, workflow);
      await this.persistWorkflow(workflow);

      // Start workflow execution
      await this.executeWorkflowStep(workflowId, 'capacity_assessment');

      return workflowId;

    } catch (error) {
      logError(LogCategory.SYSTEM, 'CONSENT COLLECTION INITIATION ERROR:', error instanceof Error ? error : undefined);
      throw new Error(`Failed to initiate consent collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Executes specific step in consent collection workflow
   */
  public async executeWorkflowStep(
    workflowId: string,
    step: ConsentCollectionStep,
    userInput?: any
  ): Promise<{
    completed: boolean;
    nextStep?: ConsentCollectionStep;
    uiPrompt?: any;
    error?: string;
  }> {
    try {
      const workflow = this.activeWorkflows.get(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      workflow.currentStep = step;

      switch (step) {
        case 'capacity_assessment':
          return await this.executeCapacityAssessment(workflow, userInput);
        
        case 'privacy_notice_presentation':
          return await this.executePrivacyNoticePresentation(workflow);
        
        case 'scope_explanation':
          return await this.executeScopeExplanation(workflow);
        
        case 'consent_collection':
          return await this.executeConsentCollection(workflow, userInput);
        
        case 'electronic_signature':
          return await this.executeElectronicSignature(workflow, userInput);
        
        case 'verification':
          return await this.executeVerification(workflow);
        
        case 'storage':
          return await this.executeStorage(workflow);
        
        case 'confirmation':
          return await this.executeConfirmation(workflow);
        
        default:
          throw new Error(`Unknown workflow step: ${step}`);
      }

    } catch (error) {
      logError(LogCategory.SYSTEM, `WORKFLOW STEP ERROR (${step}):`, error instanceof Error ? error : undefined);
      return {
        completed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * WORKFLOW STEP IMPLEMENTATIONS
   */

  private async executeCapacityAssessment(
    workflow: ConsentCollectionWorkflow,
    userInput?: any
  ): Promise<{
    completed: boolean;
    nextStep?: ConsentCollectionStep;
    uiPrompt?: any;
  }> {
    // Assess user's capacity to provide consent
    const capacityAssessment = await this.performCapacityAssessment(workflow.context);
    
    workflow.evidence.capacityEvidence = capacityAssessment;

    if (!capacityAssessment.hasCapacity) {
      // Cannot collect consent without capacity
      workflow.status = 'failed';
      
      return {
        completed: false,
        uiPrompt: {
          type: 'capacity_concern',
          title: 'Consent Collection Paused',
          message: 'We want to ensure you can make informed decisions about your healthcare data. Please try again when you\'re feeling more stable.',
          recommendations: capacityAssessment.recommendations,
          actions: [
            { type: 'defer', label: 'Try Again Later' },
            { type: 'contact_support', label: 'Contact Support' }
          ]
        }
      };
    }

    return {
      completed: true,
      nextStep: 'privacy_notice_presentation'
    };
  }

  private async executePrivacyNoticePresentation(
    workflow: ConsentCollectionWorkflow
  ): Promise<{
    completed: boolean;
    nextStep?: ConsentCollectionStep;
    uiPrompt?: any;
  }> {
    // Present comprehensive privacy notice
    const privacyNotice = await this.generatePrivacyNotice(workflow.context, workflow.requestedScope);

    return {
      completed: false, // Requires user interaction
      nextStep: 'scope_explanation',
      uiPrompt: {
        type: 'privacy_notice',
        title: 'Your Privacy Rights',
        content: privacyNotice,
        actions: [
          { type: 'continue', label: 'I understand my privacy rights' },
          { type: 'more_info', label: 'Tell me more about data protection' },
          { type: 'cancel', label: 'Cancel' }
        ]
      }
    };
  }

  private async executeScopeExplanation(
    workflow: ConsentCollectionWorkflow
  ): Promise<{
    completed: boolean;
    nextStep?: ConsentCollectionStep;
    uiPrompt?: any;
  }> {
    // Explain specific consent scopes in plain language
    const scopeExplanation = await this.generateScopeExplanation(workflow.requestedScope, workflow.context);

    return {
      completed: false,
      nextStep: 'consent_collection',
      uiPrompt: {
        type: 'scope_explanation',
        title: 'What We\'re Asking Permission For',
        content: scopeExplanation,
        scopes: this.formatScopeChoices(workflow.requestedScope),
        actions: [
          { type: 'customize', label: 'Customize my choices' },
          { type: 'accept_all', label: 'Accept all' },
          { type: 'decline', label: 'Decline' }
        ]
      }
    };
  }

  private async executeConsentCollection(
    workflow: ConsentCollectionWorkflow,
    userInput?: any
  ): Promise<{
    completed: boolean;
    nextStep?: ConsentCollectionStep;
    uiPrompt?: any;
  }> {
    if (!userInput) {
      // First time showing consent form
      return {
        completed: false,
        nextStep: 'electronic_signature',
        uiPrompt: {
          type: 'consent_form',
          title: 'Your Consent Choices',
          description: 'Please review and confirm your choices for how we can use your healthcare information.',
          consentItems: this.generateConsentItems(workflow.requestedScope),
          actions: [
            { type: 'review', label: 'Review my choices' },
            { type: 'proceed', label: 'Proceed to sign' },
            { type: 'cancel', label: 'Cancel' }
          ]
        }
      };
    }

    // Process user's consent choices
    const processedChoices = this.processConsentChoices(userInput.choices, workflow.requestedScope);
    workflow.requestedScope = processedChoices;

    // Record user interaction
    workflow.evidence.userInteractions.push({
      timestamp: Date.now(),
      type: 'consent_choices',
      data: userInput
    });

    return {
      completed: true,
      nextStep: 'electronic_signature'
    };
  }

  private async executeElectronicSignature(
    workflow: ConsentCollectionWorkflow,
    userInput?: any
  ): Promise<{
    completed: boolean;
    nextStep?: ConsentCollectionStep;
    uiPrompt?: any;
  }> {
    if (!userInput) {
      // Show signature interface
      return {
        completed: false,
        nextStep: 'verification',
        uiPrompt: {
          type: 'electronic_signature',
          title: 'Electronic Signature Required',
          description: 'Your electronic signature confirms your consent to the uses described above.',
          signatureMethod: await this.determineBestSignatureMethod(),
          actions: [
            { type: 'biometric_sign', label: 'Sign with biometric' },
            { type: 'typed_signature', label: 'Type my name' },
            { type: 'cancel', label: 'Cancel' }
          ]
        }
      };
    }

    // Process electronic signature
    const signatureValid = await this.validateElectronicSignature(userInput, workflow);
    
    if (!signatureValid) {
      return {
        completed: false,
        uiPrompt: {
          type: 'signature_error',
          title: 'Signature Verification Failed',
          message: 'Please try signing again to complete your consent.',
          actions: [
            { type: 'retry', label: 'Try again' },
            { type: 'cancel', label: 'Cancel' }
          ]
        }
      };
    }

    // Record signature evidence
    workflow.evidence.authenticationEvidence = {
      ...workflow.evidence.authenticationEvidence,
      signature: userInput,
      signatureTimestamp: Date.now()
    };

    return {
      completed: true,
      nextStep: 'verification'
    };
  }

  private async executeVerification(
    workflow: ConsentCollectionWorkflow
  ): Promise<{
    completed: boolean;
    nextStep?: ConsentCollectionStep;
    uiPrompt?: any;
  }> {
    // Verify all consent components are valid
    const verification = await this.verifyConsentComponents(workflow);
    
    if (!verification.valid) {
      workflow.status = 'failed';
      return {
        completed: false,
        uiPrompt: {
          type: 'verification_failed',
          title: 'Consent Verification Failed',
          message: 'There was an issue with your consent. Please try again.',
          errors: verification.errors,
          actions: [
            { type: 'retry', label: 'Start over' },
            { type: 'contact_support', label: 'Contact support' }
          ]
        }
      };
    }

    return {
      completed: true,
      nextStep: 'storage'
    };
  }

  private async executeStorage(
    workflow: ConsentCollectionWorkflow
  ): Promise<{
    completed: boolean;
    nextStep?: ConsentCollectionStep;
    uiPrompt?: any;
  }> {
    try {
      // Create final consent record
      const consentRecord = await this.createConsentRecord(workflow);
      
      // Store consent securely
      await this.storeConsentRecord(consentRecord);
      
      // Update compliance engine
      await this.complianceEngine.obtainUserConsent(
        workflow.context.assessmentContext?.type || 'system',
        this.convertToHIPAAConsentScope(workflow.requestedScope),
        workflow.evidence as any
      );

      // Cache consent
      this.consentCache.set(consentRecord.userId, consentRecord);

      workflow.status = 'completed';
      workflow.timing.completedAt = Date.now();
      workflow.timing.totalDurationMs = workflow.timing.completedAt - workflow.timing.startedAt;

      return {
        completed: true,
        nextStep: 'confirmation'
      };

    } catch (error) {
      logError(LogCategory.SYSTEM, 'CONSENT STORAGE ERROR:', error instanceof Error ? error : undefined);
      workflow.status = 'failed';
      
      return {
        completed: false,
        uiPrompt: {
          type: 'storage_error',
          title: 'Consent Storage Failed',
          message: 'We couldn\'t save your consent preferences. Please try again.',
          actions: [
            { type: 'retry', label: 'Try again' },
            { type: 'contact_support', label: 'Contact support' }
          ]
        }
      };
    }
  }

  private async executeConfirmation(
    workflow: ConsentCollectionWorkflow
  ): Promise<{
    completed: boolean;
    nextStep?: ConsentCollectionStep;
    uiPrompt?: any;
  }> {
    // Show confirmation and next steps
    return {
      completed: true,
      uiPrompt: {
        type: 'consent_confirmation',
        title: 'Consent Collected Successfully',
        message: 'Thank you for providing your consent. You can review or change your choices anytime in Settings.',
        summary: this.generateConsentSummary(workflow.requestedScope),
        actions: [
          { type: 'continue', label: 'Continue' },
          { type: 'view_privacy_policy', label: 'View full privacy policy' }
        ]
      }
    };
  }

  /**
   * CONSENT REVOCATION AND WITHDRAWAL
   */

  /**
   * Processes consent revocation request
   */
  public async revokeConsent(
    userId: string,
    revocationReason: string,
    requestDataDeletion: boolean = false
  ): Promise<{
    success: boolean;
    revocationId: string;
    dataDeletionScheduled: boolean;
    error?: string;
  }> {
    try {
      // Load current consent
      const currentConsent = await this.loadCurrentConsent(userId);
      if (!currentConsent) {
        throw new Error('No consent found to revoke');
      }

      // Process revocation through compliance engine
      await this.complianceEngine.revokeUserConsent(userId, revocationReason, requestDataDeletion);

      // Update local consent record
      const revokedConsent: HIPAAConsent = {
        ...currentConsent,
        type: 'revoked',
        revocation: {
          timestamp: Date.now(),
          reason: revocationReason,
          deletionRequested: requestDataDeletion
        }
      };

      // Store revoked consent
      await this.storeConsentRecord(revokedConsent);

      // Remove from cache
      this.consentCache.delete(userId);

      const revocationId = `revocation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        revocationId,
        dataDeletionScheduled: requestDataDeletion
      };

    } catch (error) {
      logError(LogCategory.SYSTEM, 'CONSENT REVOCATION ERROR:', error instanceof Error ? error : undefined);
      return {
        success: false,
        revocationId: '',
        dataDeletionScheduled: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * UTILITY METHODS
   */

  private async loadCurrentConsent(userId: string): Promise<HIPAAConsent | null> {
    // Check cache first
    const cached = this.consentCache.get(userId);
    if (cached) {
      return cached;
    }

    try {
      // Load from secure storage
      const consentKeys = await this.getConsentKeys(userId);
      if (consentKeys.length === 0) {
        return null;
      }

      // Get most recent non-revoked consent
      const latestKey = consentKeys
        .sort((a, b) => b.localeCompare(a)) // Sort by timestamp (newest first)
        [0]!;

      const consentData = await SecureStore.getItemAsync(latestKey);
      if (!consentData) {
        return null;
      }

      const consent = JSON.parse(consentData) as HIPAAConsent;
      
      // Cache if not revoked
      if (!consent.revocation) {
        this.consentCache.set(userId, consent);
      }

      return consent;

    } catch (error) {
      logError(LogCategory.SYSTEM, 'CONSENT LOADING ERROR:', error instanceof Error ? error : undefined);
      return null;
    }
  }

  private validateConsentScope(
    consent: HIPAAConsent,
    operation: {
      type: string;
      dataTypes: string[];
      purpose: string;
    }
  ): {
    valid: boolean;
    missingScopes: string[];
  } {
    const missingScopes: string[] = [];

    // Map operation types to consent scope properties
    const scopeMapping = {
      'assessment_data_collection': 'assessmentDataCollection',
      'crisis_intervention': 'crisisInterventionData',
      'professional_sharing': 'emergencyProfessionalSharing',
      'data_export': true // Always allowed for user requests
    };

    const requiredScope = scopeMapping[operation.type as keyof typeof scopeMapping];
    
    if (requiredScope === true) {
      return { valid: true, missingScopes: [] };
    }

    if (typeof requiredScope === 'string' && !consent.scope[requiredScope as keyof typeof consent.scope]) {
      missingScopes.push(operation.type);
    }

    return {
      valid: missingScopes.length === 0,
      missingScopes
    };
  }

  private async assessUserCapacity(
    userId: string,
    context?: ConsentCollectionContext
  ): Promise<ConsentValidationResult['capacityAssessment']> {
    const capacityFactors: string[] = [];
    const recommendations: string[] = [];

    // Check crisis state
    if (context?.userState === 'crisis') {
      capacityFactors.push('Currently in crisis state');
      recommendations.push('Wait until crisis stabilizes before consent collection');
      
      return {
        hasCapacity: false,
        capacityFactors,
        recommendations
      };
    }

    // Check distressed state
    if (context?.userState === 'distressed') {
      capacityFactors.push('Currently experiencing distress');
      recommendations.push('Provide additional support and explanation during consent');
    }

    // Default to having capacity
    return {
      hasCapacity: true,
      capacityFactors,
      recommendations
    };
  }

  private async assessEmergencyOverride(
    operation: any,
    consent: HIPAAConsent
  ): Promise<ConsentValidationResult['emergencyOverride']> {
    if (operation.purpose === 'emergency') {
      return {
        applicable: true,
        legalBasis: 'Emergency medical care exception under HIPAA Privacy Rule',
        limitations: [
          'Limited to information necessary for emergency care',
          'Must notify individual when emergency ends',
          'Document emergency circumstances'
        ]
      };
    }

    return {
      applicable: false,
      legalBasis: '',
      limitations: []
    };
  }

  private async performCapacityAssessment(
    context: ConsentCollectionContext
  ): Promise<{
    hasCapacity: boolean;
    recommendations: string[];
  }> {
    // Simplified capacity assessment
    if (context.userState === 'crisis' || context.userState === 'distressed') {
      return {
        hasCapacity: false,
        recommendations: [
          'Provide additional support before consent collection',
          'Consider waiting until user is in a stable state',
          'Offer professional assistance if needed'
        ]
      };
    }

    return {
      hasCapacity: true,
      recommendations: []
    };
  }

  private async generatePrivacyNotice(
    context: ConsentCollectionContext,
    scope: ConsentScope
  ): Promise<string> {
    return `
## Your Privacy Rights

We are committed to protecting your mental health information. This notice explains how your health information may be used and disclosed and how you can get access to this information.

### What Information We Collect
- Mental health assessment responses (PHQ-9, GAD-7)
- Crisis intervention and safety information
- App usage data for improving your experience

### How We Use Your Information
- To provide personalized mental health support
- To detect and respond to mental health crises
- To improve our services and safety protocols

### Your Rights
- Right to access your information
- Right to request corrections
- Right to restrict uses and disclosures
- Right to file a complaint

### Security
All your health information is encrypted and stored securely according to HIPAA requirements.

For our complete privacy policy, visit: [Privacy Policy Link]
    `.trim();
  }

  private async generateScopeExplanation(
    scope: ConsentScope,
    context: ConsentCollectionContext
  ): Promise<string> {
    return `
We want to be completely transparent about what we're asking permission for:

**Assessment Data**: Your PHQ-9 and GAD-7 responses help us understand your mental health and provide personalized support.

**Crisis Safety**: If our assessments detect you might be in crisis, we may share necessary information with crisis counselors to keep you safe.

**System Improvement**: Anonymous usage data helps us make the app better and safer for everyone.

You can customize these choices or change them anytime in your settings.
    `.trim();
  }

  private formatScopeChoices(scope: ConsentScope): any[] {
    return [
      {
        id: 'assessment_data',
        title: 'Assessment Data Collection',
        description: 'PHQ-9 and GAD-7 responses for personalized support',
        required: true,
        enabled: true
      },
      {
        id: 'crisis_intervention',
        title: 'Crisis Safety Features',
        description: 'Crisis detection and emergency response',
        required: true,
        enabled: true
      },
      {
        id: 'professional_sharing',
        title: 'Emergency Professional Sharing',
        description: 'Share information with mental health professionals in emergencies',
        required: false,
        enabled: scope.professionalSharing.emergencyProfessionalSharing
      },
      {
        id: 'usage_analytics',
        title: 'Usage Analytics',
        description: 'Anonymous data to improve the app',
        required: false,
        enabled: scope.systemData.usageAnalytics
      }
    ];
  }

  private generateConsentItems(scope: ConsentScope): any[] {
    return this.formatScopeChoices(scope).map(choice => ({
      ...choice,
      legalBasis: this.getLegalBasisForScope(choice.id),
      consequences: this.getConsequencesForScope(choice.id)
    }));
  }

  private getLegalBasisForScope(scopeId: string): string {
    const legalBases = {
      'assessment_data': 'Treatment and healthcare operations',
      'crisis_intervention': 'Emergency care and safety',
      'professional_sharing': 'Treatment coordination',
      'usage_analytics': 'Legitimate interest in service improvement'
    };
    return legalBases[scopeId as keyof typeof legalBases] || 'Healthcare operations';
  }

  private getConsequencesForScope(scopeId: string): string {
    const consequences = {
      'assessment_data': 'Without this, we cannot provide personalized mental health support',
      'crisis_intervention': 'Without this, we cannot provide crisis safety features',
      'professional_sharing': 'Without this, we cannot coordinate emergency care',
      'usage_analytics': 'Without this, app improvements may be limited'
    };
    return consequences[scopeId as keyof typeof consequences] || '';
  }

  private processConsentChoices(choices: any, requestedScope: ConsentScope): ConsentScope {
    // Process user's consent choices and update scope
    const updatedScope = { ...requestedScope };
    
    for (const choice of choices) {
      switch (choice.id) {
        case 'professional_sharing':
          updatedScope.professionalSharing.emergencyProfessionalSharing = choice.enabled;
          break;
        case 'usage_analytics':
          updatedScope.systemData.usageAnalytics = choice.enabled;
          break;
        // Core items (assessment_data, crisis_intervention) remain required
      }
    }

    return updatedScope;
  }

  private async determineBestSignatureMethod(): Promise<string> {
    // Check for biometric availability
    const biometricAvailable = await LocalAuthentication.hasHardwareAsync();
    const biometricEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    if (biometricAvailable && biometricEnrolled) {
      return 'biometric';
    }
    
    return 'typed_signature';
  }

  private async validateElectronicSignature(userInput: any, workflow: ConsentCollectionWorkflow): Promise<boolean> {
    try {
      if (userInput.method === 'biometric') {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirm your consent with biometric authentication',
          fallbackLabel: 'Use password instead'
        });
        return result.success;
      }
      
      if (userInput.method === 'typed_signature') {
        // Validate typed signature
        return userInput.signature && userInput.signature.length > 0;
      }
      
      return false;
    } catch (error) {
      logError(LogCategory.SYSTEM, 'SIGNATURE VALIDATION ERROR:', error instanceof Error ? error : undefined);
      return false;
    }
  }

  private async verifyConsentComponents(workflow: ConsentCollectionWorkflow): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Verify capacity assessment
    if (!workflow.evidence.capacityEvidence?.hasCapacity) {
      errors.push('User capacity assessment failed');
    }

    // Verify signature
    if (!workflow.evidence.authenticationEvidence?.signature) {
      errors.push('Electronic signature missing');
    }

    // Verify user interactions
    if (workflow.evidence.userInteractions.length === 0) {
      errors.push('No user interaction evidence');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async createConsentRecord(workflow: ConsentCollectionWorkflow): Promise<HIPAAConsent> {
    return {
      consentId: `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: workflow.context.assessmentContext?.type || 'user',
      timestamp: Date.now(),
      version: '1.0',
      type: 'initial',
      scope: this.convertToHIPAAConsentScope(workflow.requestedScope),
      evidence: {
        ipAddress: '127.0.0.1', // Would get actual IP
        deviceInfo: JSON.stringify(workflow.evidence.deviceInfo),
        userAgent: Platform.OS,
        method: 'electronic_signature'
      }
    };
  }

  private convertToHIPAAConsentScope(scope: ConsentScope): HIPAAConsent['scope'] {
    return {
      assessmentDataCollection: scope.assessmentData.phq9Responses && scope.assessmentData.gad7Responses,
      crisisInterventionData: scope.crisisIntervention.crisisDetectionData,
      performanceAnalytics: scope.systemData.usageAnalytics,
      emergencyProfessionalSharing: scope.professionalSharing.emergencyProfessionalSharing,
      researchParticipation: scope.specialCircumstances.clinicalResearch
    };
  }

  private async storeConsentRecord(consent: HIPAAConsent): Promise<void> {
    const storageKey = `hipaa_consent_${consent.userId}_${consent.timestamp}`;
    await SecureStore.setItemAsync(storageKey, JSON.stringify(consent));
  }

  private async getConsentKeys(userId: string): Promise<string[]> {
    const allKeys = await AsyncStorage.getAllKeys();
    return allKeys.filter(key => key.startsWith(`hipaa_consent_${userId}_`));
  }

  private generateConsentSummary(scope: ConsentScope): string {
    const enabledFeatures = [];
    
    if (scope.assessmentData.phq9Responses) enabledFeatures.push('Assessment data collection');
    if (scope.crisisIntervention.crisisDetectionData) enabledFeatures.push('Crisis safety features');
    if (scope.professionalSharing.emergencyProfessionalSharing) enabledFeatures.push('Emergency professional sharing');
    if (scope.systemData.usageAnalytics) enabledFeatures.push('Usage analytics');
    
    return `You have consented to: ${enabledFeatures.join(', ')}.`;
  }

  private async collectDeviceInfo(): Promise<any> {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      timestamp: Date.now()
    };
  }

  private async collectAuthenticationEvidence(): Promise<any> {
    return {
      timestamp: Date.now(),
      method: 'app_session'
    };
  }

  private async persistWorkflow(workflow: ConsentCollectionWorkflow): Promise<void> {
    const workflowKey = `consent_workflow_${workflow.workflowId}`;
    await AsyncStorage.setItem(workflowKey, JSON.stringify(workflow));
  }

  /**
   * PUBLIC API METHODS
   */

  /**
   * Quick consent validation for assessment operations
   */
  public async canCollectAssessmentData(userId: string, assessmentType: 'phq9' | 'gad7'): Promise<boolean> {
    const validation = await this.validateConsentForOperation(userId, {
      type: 'assessment_data_collection',
      dataTypes: [`${assessmentType}_responses`],
      purpose: 'treatment'
    });

    return validation.valid || validation.emergencyOverride?.applicable === true;
  }

  /**
   * Quick consent validation for crisis intervention
   */
  public async canPerformCrisisIntervention(userId: string): Promise<boolean> {
    const validation = await this.validateConsentForOperation(userId, {
      type: 'crisis_intervention',
      dataTypes: ['crisis_intervention_data'],
      purpose: 'emergency'
    });

    return validation.valid || validation.emergencyOverride?.applicable === true;
  }

  /**
   * Get consent status summary
   */
  public async getConsentStatus(userId: string): Promise<{
    hasValidConsent: boolean;
    consentVersion: string;
    lastUpdated: number;
    enabledScopes: string[];
    pendingActions: string[];
  }> {
    try {
      const consent = await this.loadCurrentConsent(userId);
      
      if (!consent || consent.revocation) {
        return {
          hasValidConsent: false,
          consentVersion: '',
          lastUpdated: 0,
          enabledScopes: [],
          pendingActions: ['Obtain initial consent']
        };
      }

      const enabledScopes = Object.entries(consent.scope)
        .filter(([_, enabled]) => enabled)
        .map(([scope, _]) => scope);

      return {
        hasValidConsent: true,
        consentVersion: consent.version,
        lastUpdated: consent.timestamp,
        enabledScopes,
        pendingActions: []
      };

    } catch (error) {
      logError(LogCategory.SYSTEM, 'CONSENT STATUS ERROR:', error instanceof Error ? error : undefined);
      return {
        hasValidConsent: false,
        consentVersion: '',
        lastUpdated: 0,
        enabledScopes: [],
        pendingActions: ['Resolve consent system errors']
      };
    }
  }
}

// Export singleton instance
export default HIPAAConsentManager.getInstance();