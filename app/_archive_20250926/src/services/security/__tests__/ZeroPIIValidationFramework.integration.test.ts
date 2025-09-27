/**
 * Zero-PII Validation Framework Integration Tests
 *
 * Comprehensive tests for the zero-PII validation framework including
 * integration with multi-layer encryption, HIPAA compliance, and crisis
 * safety security systems.
 */

import {
  zeroPIIValidationFramework,
  multiLayerEncryptionFramework,
  hipaaComplianceSystem,
  crisisSafetySecuritySystem,
  encryptionService,
  DataSensitivity
} from '../index';

import type {
  ValidationContext,
  CrisisContext,
  ZeroPIIValidationResult,
  MultiLayerEncryptionResult,
  HIPAAComplianceResult,
  CrisisSecurityResult
} from '../index';

describe('Zero-PII Validation Framework Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Zero-PII Validation', () => {
    it('should validate clean therapeutic payload with full compliance', async () => {
      const therapeuticPayload = {
        phq9_score: 12,
        gad7_score: 8,
        mood_rating: 6,
        breathing_session: {
          duration: 180,
          completed: true,
          rating: 8
        },
        assessment_date: '2024-01-27T10:00:00Z',
        user_id: 'user_123' // This should be sanitized
      };

      const context: ValidationContext = {
        operation: 'sync',
        entityType: 'therapeutic',
        userId: 'user_123',
        sessionId: 'session_456',
        subscriptionTier: 'premium',
        emergencyContext: false,
        therapeuticContext: true,
        paymentContext: false
      };

      const result = await zeroPIIValidationFramework.validateZeroPII(
        therapeuticPayload,
        context
      );

      expect(result.isValid).toBe(true);
      expect(result.validationReport.piiDetected).toBe(true); // user_id detected
      expect(result.validationReport.sanitizationRequired).toBe(true);
      expect(result.validationReport.therapeuticExemptions).toContain('user_id_therapeutic_exception');
      expect(result.complianceValidation.hipaaCompliant).toBe(true);
      expect(result.performanceMetrics.totalValidationTime).toBeLessThan(200);
    });

    it('should handle PII-contaminated payload with sanitization', async () => {
      const contaminatedPayload = {
        phq9_score: 18,
        user_email: 'user@example.com',
        user_phone: '555-1234',
        credit_card: '4111-1111-1111-1111',
        mood_rating: 4,
        check_in_response: 'Feeling anxious today'
      };

      const context: ValidationContext = {
        operation: 'sync',
        entityType: 'therapeutic',
        userId: 'user_123',
        emergencyContext: false,
        therapeuticContext: true,
        paymentContext: false
      };

      const result = await zeroPIIValidationFramework.validateZeroPII(
        contaminatedPayload,
        context
      );

      expect(result.isValid).toBe(true); // Should be valid after sanitization
      expect(result.validationReport.piiDetected).toBe(true);
      expect(result.sanitizationResult.success).toBe(true);

      // Verify PII was sanitized
      const sanitized = result.sanitizationResult.sanitizedPayload;
      expect(sanitized.user_email).toBeUndefined();
      expect(sanitized.credit_card).toBeUndefined();

      // Verify therapeutic data preserved
      expect(sanitized.phq9_score).toBe(18);
      expect(sanitized.mood_rating).toBe(4);
      expect(sanitized.check_in_response).toBe('Feeling anxious today');
    });
  });

  describe('Crisis Response Integration', () => {
    it('should process critical crisis with emergency bypass under 200ms', async () => {
      const crisisPayload = {
        phq9_score: 24, // Critical level
        crisis_plan: {
          emergency_contact: 'Dr. Smith - 555-0123',
          safety_strategies: ['Call 988', 'Go to ER'],
          triggers: ['Suicidal thoughts']
        },
        user_location: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        user_ssn: '123-45-6789' // Should be blocked even in crisis
      };

      const context: ValidationContext = {
        operation: 'emergency',
        entityType: 'crisis',
        userId: 'user_123',
        emergencyContext: true,
        therapeuticContext: true,
        paymentContext: false,
        crisisLevel: 'critical'
      };

      const crisisContext: CrisisContext = {
        crisisType: 'suicidal_ideation',
        crisisLevel: 'critical',
        assessmentScore: { phq9: 24 },
        emergencyContact: {
          name: 'Dr. Smith',
          phone: '555-0123',
          relationship: 'therapist'
        },
        timeToIntervention: 30,
        previousCrisisEvents: 1
      };

      const validationStart = Date.now();

      // Test crisis safety security first
      const crisisResult = await crisisSafetySecuritySystem.validateCrisisSecurity(
        crisisPayload,
        context,
        crisisContext
      );

      const validationTime = Date.now() - validationStart;

      expect(validationTime).toBeLessThan(200); // Crisis response requirement
      expect(crisisResult.emergencyAccessGranted).toBe(true);
      expect(crisisResult.securityLevel).toBe('emergency_bypass');
      expect(crisisResult.crisisLevel).toBe('critical');

      // Verify crisis-optimized security measures
      expect(crisisResult.securityMeasures.piiValidation.mode).toBe('bypass');
      expect(crisisResult.securityMeasures.encryption.crisisOptimized).toBe(true);
      expect(crisisResult.emergencyOverrides.length).toBeGreaterThan(0);

      // Verify compliance preservation
      expect(crisisResult.compliancePreservation.emergencyDocumented).toBe(true);
      expect(crisisResult.compliancePreservation.auditTrailIntact).toBe(true);

      // Now test zero-PII validation in crisis mode
      const piiResult = await zeroPIIValidationFramework.validateZeroPII(
        crisisPayload,
        context
      );

      expect(piiResult.crisisOverride).toBe(true);
      expect(piiResult.validationReport.crisisExemptions).toContain('emergency_contact_crisis_exception');

      // Critical PII like SSN should still be blocked
      const sanitized = piiResult.sanitizationResult.sanitizedPayload;
      expect(sanitized?.user_ssn).toBeUndefined();

      // Crisis data should be preserved
      expect(sanitized?.crisis_plan).toBeDefined();
      expect(sanitized?.phq9_score).toBe(24);
    });

    it('should handle emergency PII bypass for life-threatening situations', async () => {
      const emergencyPayload = {
        immediate_threat: true,
        location: '123 Main St, Emergency Room',
        phone: '911',
        emergency_contact_name: 'John Doe',
        emergency_contact_phone: '555-9999',
        medical_conditions: ['diabetes', 'depression'],
        current_medications: ['insulin', 'sertraline']
      };

      const crisisContext: CrisisContext = {
        crisisType: 'suicidal_ideation',
        crisisLevel: 'critical',
        timeToIntervention: 0, // Immediate
        previousCrisisEvents: 0
      };

      const bypassResult = await crisisSafetySecuritySystem.emergencyPIIBypass(
        emergencyPayload,
        crisisContext,
        50 // 50ms limit
      );

      expect(bypassResult.bypassGranted).toBe(true);
      expect(bypassResult.responseTime).toBeLessThan(50);
      expect(bypassResult.emergencyJustification).toContain('suicidal_ideation');
      expect(bypassResult.complianceImpact).toBe('minimal'); // Life > privacy in crisis
      expect(bypassResult.auditRequired).toBe(true);
    });
  });

  describe('Multi-Layer Encryption Integration', () => {
    it('should validate encryption across all tiers', async () => {
      const therapeuticData = {
        phq9_responses: [2, 1, 3, 2, 2, 1, 2, 1, 1], // PHQ-9 responses
        gad7_responses: [1, 2, 1, 3, 2, 1, 2], // GAD-7 responses
        session_notes: 'Patient reports improved mood',
        therapist_id: 'therapist_456'
      };

      const context: ValidationContext = {
        operation: 'sync',
        entityType: 'therapeutic',
        userId: 'user_123',
        therapeuticContext: true,
        paymentContext: false,
        emergencyContext: false
      };

      // Test all subscription tiers
      for (const tier of ['free', 'premium', 'clinical'] as const) {
        const encryptionResult = await multiLayerEncryptionFramework.encryptMultiLayer(
          therapeuticData,
          context,
          tier
        );

        expect(encryptionResult.success).toBe(true);

        // Verify tier-appropriate encryption
        if (tier === 'free') {
          expect(encryptionResult.layers.therapeutic.encrypted).toBe(true);
          expect(encryptionResult.layers.context.encrypted).toBe(false);
          expect(encryptionResult.layers.transport.encrypted).toBe(false);
        } else if (tier === 'premium') {
          expect(encryptionResult.layers.therapeutic.encrypted).toBe(true);
          expect(encryptionResult.layers.context.encrypted).toBe(true);
          expect(encryptionResult.layers.transport.encrypted).toBe(true);
        } else { // clinical
          expect(encryptionResult.layers.therapeutic.encrypted).toBe(true);
          expect(encryptionResult.layers.context.encrypted).toBe(true);
          expect(encryptionResult.layers.transport.encrypted).toBe(true);
          expect(encryptionResult.encryptionMetadata.complianceLevel).toBe('clinical');
        }

        // Verify key management
        const keyRotation = encryptionResult.encryptionMetadata.keyRotationStatus;
        expect(keyRotation.therapeutic.rotationCompliant).toBe(true);

        if (tier === 'clinical') {
          expect(keyRotation.therapeutic.rotationPolicy).toBe('strict');
        }
      }
    });

    it('should integrate zero-PII validation with encryption pipeline', async () => {
      const mixedPayload = {
        assessment_data: {
          phq9_score: 15,
          gad7_score: 12,
          assessment_date: '2024-01-27'
        },
        user_info: {
          email: 'user@example.com', // PII to be sanitized
          device_id: 'device_123'
        },
        payment_info: {
          subscription_tier: 'premium',
          billing_cycle: 'monthly'
        }
      };

      const context: ValidationContext = {
        operation: 'sync',
        entityType: 'therapeutic',
        userId: 'user_123',
        therapeuticContext: true,
        paymentContext: true,
        emergencyContext: false
      };

      // Step 1: Zero-PII validation
      const piiValidation = await zeroPIIValidationFramework.validateZeroPII(
        mixedPayload,
        context
      );

      expect(piiValidation.isValid).toBe(true);
      expect(piiValidation.sanitizationResult.success).toBe(true);

      // Step 2: Multi-layer encryption of sanitized payload
      const encryptionResult = await multiLayerEncryptionFramework.encryptMultiLayer(
        piiValidation.sanitizationResult.sanitizedPayload,
        context,
        'premium'
      );

      expect(encryptionResult.success).toBe(true);

      // Verify subscription isolation
      const isolationValidation = await zeroPIIValidationFramework.validateSubscriptionIsolation(
        mixedPayload.assessment_data,
        mixedPayload.payment_info
      );

      expect(isolationValidation.isolated).toBe(true);
      expect(isolationValidation.crossContamination.length).toBe(0);
    });
  });

  describe('HIPAA Compliance Integration', () => {
    it('should validate comprehensive HIPAA compliance', async () => {
      const clinicalPayload = {
        patient_assessment: {
          phq9_score: 20,
          gad7_score: 16,
          suicide_risk: 'high',
          assessment_date: '2024-01-27',
          clinician_notes: 'Patient reports persistent suicidal ideation'
        },
        treatment_plan: {
          interventions: ['CBT', 'Medication management'],
          goals: ['Reduce suicide risk', 'Improve daily functioning']
        }
      };

      const context: ValidationContext = {
        operation: 'store',
        entityType: 'therapeutic',
        userId: 'patient_123',
        therapeuticContext: true,
        paymentContext: false,
        emergencyContext: false
      };

      const complianceResult = await hipaaComplianceSystem.validateHIPAACompliance(
        clinicalPayload,
        context,
        'clinical'
      );

      expect(complianceResult.compliant).toBe(true);
      expect(complianceResult.complianceLevel).toBe('clinical');
      expect(complianceResult.complianceScore).toBeGreaterThan(90);

      // Verify Technical Safeguards
      expect(complianceResult.technicalSafeguards.accessControl.implemented).toBe(true);
      expect(complianceResult.technicalSafeguards.auditControls.implemented).toBe(true);
      expect(complianceResult.technicalSafeguards.integrity.implemented).toBe(true);
      expect(complianceResult.technicalSafeguards.personEntityAuthentication.implemented).toBe(true);
      expect(complianceResult.technicalSafeguards.transmissionSecurity.implemented).toBe(true);

      // Verify data minimization
      expect(complianceResult.dataMinimization.minimizationApplied).toBe(true);
      expect(complianceResult.dataMinimization.piiRemovalVerified).toBe(true);

      // Verify retention compliance
      expect(complianceResult.retentionCompliance.compliant).toBe(true);
      expect(complianceResult.retentionCompliance.retentionPolicy).toBe('clinical');

      // Verify audit trail
      expect(complianceResult.auditTrail.auditType).toBe('data_modification');
      expect(complianceResult.auditTrail.complianceFlags.hipaaRequired).toBe(true);
    });

    it('should generate comprehensive compliance report', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const complianceReport = await hipaaComplianceSystem.generateComplianceReport(
        startDate,
        endDate,
        'detailed'
      );

      expect(complianceReport.reportType).toBe('detailed');
      expect(complianceReport.summary.complianceRate).toBeGreaterThan(95);

      // Verify technical safeguards compliance
      expect(complianceReport.technicalSafeguardsCompliance.accessControl).toBeGreaterThan(90);
      expect(complianceReport.technicalSafeguardsCompliance.auditControls).toBeGreaterThan(90);
      expect(complianceReport.technicalSafeguardsCompliance.integrity).toBeGreaterThan(90);
      expect(complianceReport.technicalSafeguardsCompliance.personEntityAuthentication).toBeGreaterThan(90);
      expect(complianceReport.technicalSafeguardsCompliance.transmissionSecurity).toBeGreaterThan(90);

      // Verify recommendations
      expect(Array.isArray(complianceReport.recommendations)).toBe(true);
      expect(complianceReport.nextReviewDate).toBeDefined();
    });

    it('should document emergency access with compliance preservation', async () => {
      const context: ValidationContext = {
        operation: 'emergency',
        entityType: 'crisis',
        userId: 'patient_123',
        emergencyContext: true,
        therapeuticContext: true,
        paymentContext: false,
        crisisLevel: 'high'
      };

      const emergencyDoc = await hipaaComplianceSystem.documentEmergencyAccess(
        context,
        'Patient experiencing acute suicidal ideation requiring immediate intervention',
        15 // 15 minutes
      );

      expect(emergencyDoc.documented).toBe(true);
      expect(emergencyDoc.complianceImpact).toBe('minimal');
      expect(emergencyDoc.auditRequired).toBe(true);
      expect(emergencyDoc.followUpRequired).toBe(false); // Minimal impact
    });
  });

  describe('Performance and Optimization', () => {
    it('should meet crisis response time requirements', async () => {
      const criticalPayload = {
        phq9_score: 27, // Severe
        immediate_risk: true,
        location_sharing_enabled: true
      };

      const context: ValidationContext = {
        operation: 'emergency',
        entityType: 'crisis',
        userId: 'user_123',
        emergencyContext: true,
        therapeuticContext: true,
        paymentContext: false,
        crisisLevel: 'critical'
      };

      const performanceStart = Date.now();

      // Test emergency validation
      const emergencyValidation = await zeroPIIValidationFramework.emergencyPIIValidation(
        criticalPayload,
        context
      );

      const emergencyTime = Date.now() - performanceStart;

      expect(emergencyTime).toBeLessThan(50); // Emergency target
      expect(emergencyValidation.safe).toBe(true);
      expect(emergencyValidation.emergencyRecommendation).toBe('allow');

      // Test full crisis validation
      const fullStart = Date.now();

      const fullValidation = await zeroPIIValidationFramework.validateZeroPII(
        criticalPayload,
        context
      );

      const fullTime = Date.now() - fullStart;

      expect(fullTime).toBeLessThan(200); // Crisis response requirement
      expect(fullValidation.isValid).toBe(true);
      expect(fullValidation.crisisOverride).toBe(true);
    });

    it('should validate tier-based key management performance', async () => {
      // Test key rotation for all tiers
      for (const tier of ['free', 'premium', 'clinical'] as const) {
        const rotationStart = Date.now();

        const rotationResult = await multiLayerEncryptionFramework.rotateTierKeys(tier);

        const rotationTime = Date.now() - rotationStart;

        expect(rotationResult.success).toBe(true);
        expect(rotationResult.rotatedLayers.length).toBeGreaterThan(0);
        expect(rotationTime).toBeLessThan(5000); // 5 second max for key rotation

        // Verify compliance based on tier
        const complianceCheck = Object.values(rotationResult.rotationCompliance).every(compliant => compliant);
        expect(complianceCheck).toBe(true);
      }
    });

    it('should validate framework integration performance', async () => {
      const complexPayload = {
        assessment: {
          phq9_score: 18,
          gad7_score: 14,
          responses: [2, 2, 3, 2, 2, 2, 2, 2, 2]
        },
        user_data: {
          email: 'test@example.com',
          phone: '555-1234',
          location: { lat: 40.7, lng: -74.0 }
        },
        payment_data: {
          tier: 'premium',
          billing: 'monthly'
        },
        session_data: {
          duration: 1800,
          activities: ['breathing', 'meditation'],
          notes: 'Good session today'
        }
      };

      const context: ValidationContext = {
        operation: 'sync',
        entityType: 'therapeutic',
        userId: 'user_123',
        subscriptionTier: 'premium',
        therapeuticContext: true,
        paymentContext: true,
        emergencyContext: false
      };

      const integrationStart = Date.now();

      // Run complete validation pipeline
      const results = await Promise.all([
        zeroPIIValidationFramework.validateZeroPII(complexPayload, context),
        multiLayerEncryptionFramework.encryptMultiLayer(complexPayload, context, 'premium'),
        hipaaComplianceSystem.validateHIPAACompliance(complexPayload, context, 'premium')
      ]);

      const integrationTime = Date.now() - integrationStart;

      expect(integrationTime).toBeLessThan(1000); // 1 second for full pipeline

      const [piiResult, encryptionResult, complianceResult] = results;

      // Verify all validations passed
      expect(piiResult.isValid).toBe(true);
      expect(encryptionResult.success).toBe(true);
      expect(complianceResult.compliant).toBe(true);

      // Verify performance requirements
      expect(piiResult.performanceMetrics.totalValidationTime).toBeLessThan(500);
      expect(encryptionResult.performanceMetrics.totalTime).toBeLessThan(400);
      expect(complianceResult.complianceScore).toBeGreaterThan(85);
    });
  });

  describe('Framework Status and Monitoring', () => {
    it('should provide comprehensive framework status', async () => {
      const status = await zeroPIIValidationFramework.getValidationStatus();

      expect(status.frameworkReady).toBe(true);
      expect(status.config).toBeDefined();
      expect(status.performanceMetrics.emergencyResponseCapable).toBe(true);

      // Verify compliance status
      expect(status.complianceStatus.hipaaReady).toBe(true);
      expect(status.complianceStatus.piiDetectionReady).toBe(true);
      expect(status.complianceStatus.encryptionReady).toBe(true);
      expect(status.complianceStatus.auditingReady).toBe(true);

      // Verify recommendations
      expect(Array.isArray(status.recommendations)).toBe(true);
    });

    it('should validate multi-layer encryption framework status', async () => {
      const frameworkStatus = await multiLayerEncryptionFramework.getFrameworkStatus();

      expect(frameworkStatus.frameworkReady).toBe(true);
      expect(frameworkStatus.performanceMetrics.crisisResponseCapable).toBe(true);

      // Verify tier configurations
      expect(frameworkStatus.tierConfigurations.free).toBeDefined();
      expect(frameworkStatus.tierConfigurations.premium).toBeDefined();
      expect(frameworkStatus.tierConfigurations.clinical).toBeDefined();

      // Verify compliance status
      expect(frameworkStatus.complianceStatus.freeCompliant).toBe(true);
      expect(frameworkStatus.complianceStatus.premiumCompliant).toBe(true);
      expect(frameworkStatus.complianceStatus.clinicalCompliant).toBe(true);
    });

    it('should validate crisis safety performance metrics', async () => {
      const crisisMetrics = crisisSafetySecuritySystem.getCrisisPerformanceMetrics();

      expect(crisisMetrics.averageResponseTime).toBeLessThan(200);
      expect(crisisMetrics.responseTimeCompliance).toBeGreaterThan(95);
      expect(crisisMetrics.compliancePreservationRate).toBeGreaterThan(95);

      // Verify recommendations
      expect(Array.isArray(crisisMetrics.recommendations)).toBe(true);
    });

    it('should validate HIPAA compliance system status', async () => {
      const complianceStatus = await hipaaComplianceSystem.getComplianceStatus();

      expect(complianceStatus.overallCompliance).toBe(true);
      expect(complianceStatus.complianceLevel).toBeDefined();

      // Verify technical safeguards
      expect(complianceStatus.technicalSafeguards.accessControl.implemented).toBe(true);
      expect(complianceStatus.technicalSafeguards.auditControls.implemented).toBe(true);

      // Verify auditing status
      expect(complianceStatus.auditingStatus.auditingEnabled).toBe(true);
      expect(complianceStatus.auditingStatus.auditRetentionCompliant).toBe(true);

      // Verify data governance
      expect(complianceStatus.dataGovernance.dataMinimizationImplemented).toBe(true);
      expect(complianceStatus.dataGovernance.retentionPoliciesActive).toBe(true);
    });
  });

  describe('End-to-End Integration Scenarios', () => {
    it('should handle complete therapeutic data lifecycle', async () => {
      // Scenario: User completes PHQ-9 assessment, data flows through complete pipeline
      const assessmentData = {
        phq9_responses: [3, 3, 2, 3, 2, 2, 3, 2, 2], // Score: 22 (severe depression)
        assessment_date: '2024-01-27T14:30:00Z',
        user_agent: 'FullMind/1.0 iOS',
        device_fingerprint: 'abc123def456',
        user_email: 'patient@example.com' // PII to be sanitized
      };

      const context: ValidationContext = {
        operation: 'store',
        entityType: 'therapeutic',
        userId: 'patient_789',
        subscriptionTier: 'clinical',
        therapeuticContext: true,
        paymentContext: false,
        emergencyContext: false
      };

      // Step 1: Zero-PII validation
      const piiValidation = await zeroPIIValidationFramework.validateZeroPII(
        assessmentData,
        context
      );

      expect(piiValidation.isValid).toBe(true);
      expect(piiValidation.sanitizationResult.sanitizedPayload.user_email).toBeUndefined();
      expect(piiValidation.sanitizationResult.sanitizedPayload.phq9_responses).toEqual(assessmentData.phq9_responses);

      // Step 2: Multi-layer encryption
      const encryptionResult = await multiLayerEncryptionFramework.encryptMultiLayer(
        piiValidation.sanitizationResult.sanitizedPayload,
        context,
        'clinical'
      );

      expect(encryptionResult.success).toBe(true);
      expect(encryptionResult.encryptionMetadata.complianceLevel).toBe('clinical');

      // Step 3: HIPAA compliance validation
      const complianceResult = await hipaaComplianceSystem.validateHIPAACompliance(
        piiValidation.sanitizationResult.sanitizedPayload,
        context,
        'clinical'
      );

      expect(complianceResult.compliant).toBe(true);
      expect(complianceResult.complianceLevel).toBe('clinical');
      expect(complianceResult.retentionCompliance.retentionPolicy).toBe('clinical');
      expect(complianceResult.retentionCompliance.retentionPeriod).toBe(2555); // 7 years

      // Verify end-to-end performance
      const totalTime = piiValidation.performanceMetrics.totalValidationTime +
                       encryptionResult.performanceMetrics.totalTime;

      expect(totalTime).toBeLessThan(1000); // 1 second total
    });

    it('should handle crisis intervention with full security preservation', async () => {
      // Scenario: High-risk patient triggers crisis intervention
      const crisisData = {
        phq9_score: 26, // Severe with suicidal ideation
        gad7_score: 21, // Severe anxiety
        crisis_indicators: ['suicidal_thoughts', 'plan_formulated', 'means_available'],
        emergency_contact: {
          name: 'Dr. Sarah Johnson',
          phone: '555-CRISIS',
          relationship: 'psychiatrist'
        },
        location: {
          latitude: 40.7831,
          longitude: -73.9712,
          accuracy: 10
        },
        patient_ssn: '987-65-4321' // Critical PII - should be blocked
      };

      const context: ValidationContext = {
        operation: 'emergency',
        entityType: 'crisis',
        userId: 'patient_critical',
        emergencyContext: true,
        therapeuticContext: true,
        paymentContext: false,
        crisisLevel: 'critical'
      };

      const crisisContext: CrisisContext = {
        crisisType: 'suicidal_ideation',
        crisisLevel: 'critical',
        assessmentScore: { phq9: 26, gad7: 21 },
        emergencyContact: crisisData.emergency_contact,
        timeToIntervention: 0,
        previousCrisisEvents: 2
      };

      const emergencyStart = Date.now();

      // Step 1: Crisis safety security validation
      const crisisResult = await crisisSafetySecuritySystem.validateCrisisSecurity(
        crisisData,
        context,
        crisisContext
      );

      const emergencyTime = Date.now() - emergencyStart;

      expect(emergencyTime).toBeLessThan(200); // Critical requirement
      expect(crisisResult.emergencyAccessGranted).toBe(true);
      expect(crisisResult.securityLevel).toBe('emergency_bypass');

      // Step 2: Emergency PII bypass
      const piiBypass = await crisisSafetySecuritySystem.emergencyPIIBypass(
        crisisData,
        crisisContext,
        50
      );

      expect(piiBypass.bypassGranted).toBe(true);
      expect(piiBypass.responseTime).toBeLessThan(50);

      // Critical PII should still be sanitized
      expect(piiBypass.sanitizedPayload.patient_ssn).toBeUndefined();

      // Emergency contact info should be preserved
      expect(piiBypass.sanitizedPayload.emergency_contact).toBeDefined();

      // Step 3: Document emergency access
      const emergencyDoc = await hipaaComplianceSystem.documentEmergencyAccess(
        context,
        'Critical suicidal ideation with formulated plan - immediate intervention required',
        15
      );

      expect(emergencyDoc.documented).toBe(true);
      expect(emergencyDoc.complianceImpact).toBe('minimal');

      // Step 4: Post-crisis restoration
      const crisisId = crisisResult.auditTrail.crisisAuditId;
      const restorationResult = await crisisSafetySecuritySystem.restorePostCrisisSecurity(
        crisisId,
        [crisisResult]
      );

      expect(restorationResult.restorationSuccess).toBe(true);
      expect(restorationResult.complianceRestored).toBe(true);
      expect(restorationResult.auditCompleted).toBe(true);
    });
  });
});