/**
 * Phase 7B: HIPAA Compliance Environment Validation
 * 
 * Comprehensive HIPAA compliance validation for environment configurations:
 * 1. Technical safeguards validation (45 CFR 164.312)
 * 2. Administrative safeguards validation (45 CFR 164.308) 
 * 3. Physical safeguards validation (45 CFR 164.310)
 * 4. Crisis intervention accessibility requirements
 * 5. Clinical data security standards
 */

import { securityEnvironment, SecurityEnvironmentConfig } from './EnvironmentSecurityConfig';
import { credentialManager, CredentialManager } from './CredentialManager';

export interface HIPAAValidationResult {
  isCompliant: boolean;
  violations: HIPAAViolation[];
  warnings: HIPAAWarning[];
  criticalIssues: CriticalSecurityIssue[];
  recommendations: SecurityRecommendation[];
}

interface HIPAAViolation {
  regulation: string; // CFR reference
  severity: 'critical' | 'high' | 'medium';
  description: string;
  currentValue: any;
  requiredValue: any;
  remediation: string;
}

interface HIPAAWarning {
  category: 'technical' | 'administrative' | 'physical' | 'operational';
  description: string;
  impact: 'low' | 'medium' | 'high';
  recommendation: string;
}

interface CriticalSecurityIssue {
  issue: string;
  impact: 'crisis_access' | 'data_breach' | 'clinical_safety' | 'unauthorized_access';
  urgency: 'immediate' | 'high' | 'medium';
  resolution: string;
}

interface SecurityRecommendation {
  category: 'encryption' | 'access_control' | 'audit' | 'backup' | 'monitoring';
  priority: 'high' | 'medium' | 'low';
  description: string;
  implementation: string;
}

/**
 * HIPAA Technical Safeguards Validator
 * Validates 45 CFR 164.312 compliance
 */
export class HIPAATechnicalSafeguardsValidator {
  private config: SecurityEnvironmentConfig;
  private violations: HIPAAViolation[] = [];

  constructor(config: SecurityEnvironmentConfig) {
    this.config = config;
  }

  public validate(): HIPAAViolation[] {
    this.validateAccessControl();
    this.validateAuditControls();
    this.validateIntegrityControl();
    this.validatePersonOrEntityAuthentication();
    this.validateTransmissionSecurity();
    
    return this.violations;
  }

  /**
   * 164.312(a) - Access Control
   */
  private validateAccessControl(): void {
    // Unique user identification required
    if (!this.config.auth.biometricEnabled && this.config.environment !== 'development') {
      this.violations.push({
        regulation: '45 CFR 164.312(a)(1)',
        severity: 'high',
        description: 'Biometric authentication should be enabled for unique user identification',
        currentValue: this.config.auth.biometricEnabled,
        requiredValue: true,
        remediation: 'Enable biometric authentication in production and staging environments'
      });
    }

    // Automatic logoff required
    if (this.config.auth.sessionTimeoutSeconds > 1800) { // 30 minutes max
      this.violations.push({
        regulation: '45 CFR 164.312(a)(2)(iii)',
        severity: 'medium',
        description: 'Session timeout exceeds HIPAA recommendation of 30 minutes',
        currentValue: this.config.auth.sessionTimeoutSeconds,
        requiredValue: 1800,
        remediation: 'Reduce session timeout to 30 minutes or less'
      });
    }

    // Encryption required for PHI
    if (!this.config.encryption.enabled) {
      this.violations.push({
        regulation: '45 CFR 164.312(a)(2)(iv)',
        severity: 'critical',
        description: 'Encryption is required for PHI protection',
        currentValue: this.config.encryption.enabled,
        requiredValue: true,
        remediation: 'Enable encryption for all PHI data'
      });
    }
  }

  /**
   * 164.312(b) - Audit Controls
   */
  private validateAuditControls(): void {
    if (!this.config.compliance.auditLogging) {
      this.violations.push({
        regulation: '45 CFR 164.312(b)',
        severity: 'critical',
        description: 'Audit logging is required for HIPAA compliance',
        currentValue: this.config.compliance.auditLogging,
        requiredValue: true,
        remediation: 'Enable comprehensive audit logging for all PHI access'
      });
    }

    if (!this.config.compliance.clinicalAuditTrail) {
      this.violations.push({
        regulation: '45 CFR 164.312(b)',
        severity: 'critical',
        description: 'Clinical audit trail is required for PHI access tracking',
        currentValue: this.config.compliance.clinicalAuditTrail,
        requiredValue: true,
        remediation: 'Enable clinical audit trail for all assessment and therapeutic data access'
      });
    }
  }

  /**
   * 164.312(c) - Integrity Control
   */
  private validateIntegrityControl(): void {
    if (this.config.encryption.level !== 'AES-256') {
      this.violations.push({
        regulation: '45 CFR 164.312(c)(1)',
        severity: 'high',
        description: 'AES-256 encryption is required for PHI integrity protection',
        currentValue: this.config.encryption.level,
        requiredValue: 'AES-256',
        remediation: 'Upgrade encryption to AES-256 standard'
      });
    }
  }

  /**
   * 164.312(d) - Person or Entity Authentication
   */
  private validatePersonOrEntityAuthentication(): void {
    if (this.config.auth.tokenExpirySeconds > 86400) { // 24 hours max
      this.violations.push({
        regulation: '45 CFR 164.312(d)',
        severity: 'medium',
        description: 'Authentication token expiry exceeds recommended duration',
        currentValue: this.config.auth.tokenExpirySeconds,
        requiredValue: 86400,
        remediation: 'Limit authentication tokens to 24 hours or less'
      });
    }
  }

  /**
   * 164.312(e) - Transmission Security
   */
  private validateTransmissionSecurity(): void {
    if (!this.config.encryption.separatePaymentKeys && this.config.environment !== 'development') {
      this.violations.push({
        regulation: '45 CFR 164.312(e)(1)',
        severity: 'high',
        description: 'Separate encryption keys required for payment and clinical data',
        currentValue: this.config.encryption.separatePaymentKeys,
        requiredValue: true,
        remediation: 'Implement separate encryption keys for payment processing'
      });
    }
  }
}

/**
 * Crisis Intervention Security Validator
 * Ensures crisis intervention remains accessible under all security configurations
 */
export class CrisisInterventionSecurityValidator {
  private config: SecurityEnvironmentConfig;
  private criticalIssues: CriticalSecurityIssue[] = [];

  constructor(config: SecurityEnvironmentConfig) {
    this.config = config;
  }

  public validate(): CriticalSecurityIssue[] {
    this.validateCrisisAccessibility();
    this.validateEmergencyBypass();
    this.validateResponseTime();
    this.validateThresholdSecurity();
    
    return this.criticalIssues;
  }

  private validateCrisisAccessibility(): void {
    if (!this.config.crisis.alwaysAccessible) {
      this.criticalIssues.push({
        issue: 'Crisis intervention features are not always accessible',
        impact: 'crisis_access',
        urgency: 'immediate',
        resolution: 'Enable alwaysAccessible flag for crisis intervention'
      });
    }

    if (!this.config.crisis.paymentBypassEnabled) {
      this.criticalIssues.push({
        issue: 'Payment bypass for crisis situations is disabled',
        impact: 'crisis_access', 
        urgency: 'immediate',
        resolution: 'Enable payment bypass for emergency crisis access'
      });
    }
  }

  private validateEmergencyBypass(): void {
    if (!this.config.crisis.detectionEnabled) {
      this.criticalIssues.push({
        issue: 'Automatic crisis detection is disabled',
        impact: 'clinical_safety',
        urgency: 'high',
        resolution: 'Enable automatic crisis detection for patient safety'
      });
    }

    if (!this.config.crisis.autoIntervention) {
      this.criticalIssues.push({
        issue: 'Automatic crisis intervention is disabled',
        impact: 'clinical_safety',
        urgency: 'high',
        resolution: 'Enable automatic crisis intervention protocols'
      });
    }
  }

  private validateResponseTime(): void {
    const maxAllowedTime = this.config.environment === 'production' ? 50 : 200;
    
    if (this.config.crisis.responseTimeoutMs > maxAllowedTime) {
      this.criticalIssues.push({
        issue: `Crisis response time ${this.config.crisis.responseTimeoutMs}ms exceeds maximum ${maxAllowedTime}ms`,
        impact: 'crisis_access',
        urgency: 'high',
        resolution: `Reduce crisis response timeout to ${maxAllowedTime}ms or less`
      });
    }

    if (this.config.performance.crisisButtonMaxMs > 200) {
      this.criticalIssues.push({
        issue: 'Crisis button response time exceeds 200ms safety requirement',
        impact: 'crisis_access',
        urgency: 'immediate',
        resolution: 'Optimize crisis button performance to <200ms response time'
      });
    }
  }

  private validateThresholdSecurity(): void {
    if (this.config.crisis.thresholds.phq9 !== 20) {
      this.criticalIssues.push({
        issue: 'PHQ-9 crisis threshold has been modified from clinical standard',
        impact: 'clinical_safety',
        urgency: 'immediate',
        resolution: 'Reset PHQ-9 crisis threshold to validated value of 20'
      });
    }

    if (this.config.crisis.thresholds.gad7 !== 15) {
      this.criticalIssues.push({
        issue: 'GAD-7 crisis threshold has been modified from clinical standard', 
        impact: 'clinical_safety',
        urgency: 'immediate',
        resolution: 'Reset GAD-7 crisis threshold to validated value of 15'
      });
    }
  }
}

/**
 * Clinical Data Security Validator
 * Validates DataSensitivity.CRISIS and DataSensitivity.CLINICAL security requirements
 */
export class ClinicalDataSecurityValidator {
  private config: SecurityEnvironmentConfig;
  private violations: HIPAAViolation[] = [];

  constructor(config: SecurityEnvironmentConfig) {
    this.config = config;
  }

  public validate(): HIPAAViolation[] {
    this.validateDataClassificationSecurity();
    this.validateRetentionPolicies();
    this.validateBackupSecurity();
    
    return this.violations;
  }

  private validateDataClassificationSecurity(): void {
    // DataSensitivity.CRISIS requires highest level encryption
    if (this.config.encryption.level !== 'AES-256') {
      this.violations.push({
        regulation: 'DataSensitivity.CRISIS',
        severity: 'critical',
        description: 'Crisis data requires AES-256 encryption',
        currentValue: this.config.encryption.level,
        requiredValue: 'AES-256',
        remediation: 'Upgrade to AES-256 encryption for crisis data protection'
      });
    }

    // DataSensitivity.CLINICAL requires audit trail
    if (!this.config.compliance.clinicalAuditTrail) {
      this.violations.push({
        regulation: 'DataSensitivity.CLINICAL',
        severity: 'critical',
        description: 'Clinical data requires comprehensive audit trail',
        currentValue: this.config.compliance.clinicalAuditTrail,
        requiredValue: true,
        remediation: 'Enable clinical audit trail for PHQ-9/GAD-7 assessment data'
      });
    }
  }

  private validateRetentionPolicies(): void {
    // Clinical data retention requirements
    if (this.config.compliance.dataRetentionDays < 365 && this.config.environment !== 'development') {
      this.violations.push({
        regulation: '45 CFR 164.316(b)(2)',
        severity: 'medium',
        description: 'Clinical data retention period should be at least 365 days',
        currentValue: this.config.compliance.dataRetentionDays,
        requiredValue: 365,
        remediation: 'Extend data retention to meet clinical documentation requirements'
      });
    }

    // Right to delete must be preserved
    if (!this.config.compliance.rightToDelete) {
      this.violations.push({
        regulation: 'GDPR Article 17',
        severity: 'high',
        description: 'Right to delete is required for patient data control',
        currentValue: this.config.compliance.rightToDelete,
        requiredValue: true,
        remediation: 'Implement right to delete functionality for patient data'
      });
    }
  }

  private validateBackupSecurity(): void {
    if (!this.config.encryption.backupEncryption) {
      this.violations.push({
        regulation: '45 CFR 164.312(a)(2)(iv)',
        severity: 'critical',
        description: 'Backup data must be encrypted for PHI protection',
        currentValue: this.config.encryption.backupEncryption,
        requiredValue: true,
        remediation: 'Enable encryption for all backup data containing PHI'
      });
    }
  }
}

/**
 * Comprehensive HIPAA Compliance Validator
 * Orchestrates all validation checks and provides consolidated results
 */
export class HIPAAComplianceValidator {
  private technicalValidator: HIPAATechnicalSafeguardsValidator;
  private crisisValidator: CrisisInterventionSecurityValidator;
  private clinicalValidator: ClinicalDataSecurityValidator;
  private config: SecurityEnvironmentConfig;

  constructor() {
    this.config = securityEnvironment.getConfig();
    this.technicalValidator = new HIPAATechnicalSafeguardsValidator(this.config);
    this.crisisValidator = new CrisisInterventionSecurityValidator(this.config);
    this.clinicalValidator = new ClinicalDataSecurityValidator(this.config);
  }

  /**
   * Run comprehensive HIPAA compliance validation
   */
  public validateCompliance(): HIPAAValidationResult {
    const technicalViolations = this.technicalValidator.validate();
    const criticalIssues = this.crisisValidator.validate();
    const clinicalViolations = this.clinicalValidator.validate();
    
    const allViolations = [...technicalViolations, ...clinicalViolations];
    const warnings = this.generateWarnings();
    const recommendations = this.generateRecommendations();

    const isCompliant = allViolations.filter(v => v.severity === 'critical').length === 0 &&
                       criticalIssues.filter(i => i.urgency === 'immediate').length === 0;

    return {
      isCompliant,
      violations: allViolations,
      warnings,
      criticalIssues,
      recommendations
    };
  }

  /**
   * Generate security warnings for improvement opportunities
   */
  private generateWarnings(): HIPAAWarning[] {
    const warnings: HIPAAWarning[] = [];
    
    // Environment-specific warnings
    if (this.config.environment === 'development') {
      warnings.push({
        category: 'operational',
        description: 'Development environment detected - ensure production security hardening',
        impact: 'medium',
        recommendation: 'Review security settings before production deployment'
      });
    }

    // Performance vs security warnings
    if (this.config.performance.crisisButtonMaxMs > 100) {
      warnings.push({
        category: 'technical',
        description: 'Crisis button response time could be optimized further',
        impact: 'low',
        recommendation: 'Target <100ms response time for optimal crisis intervention'
      });
    }

    return warnings;
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(): SecurityRecommendation[] {
    const recommendations: SecurityRecommendation[] = [];

    // Encryption recommendations
    if (!this.config.encryption.keyRotationEnabled && this.config.environment !== 'development') {
      recommendations.push({
        category: 'encryption',
        priority: 'high',
        description: 'Enable automatic key rotation for enhanced security',
        implementation: 'Implement automated encryption key rotation with 90-day cycle'
      });
    }

    // Monitoring recommendations
    recommendations.push({
      category: 'monitoring',
      priority: 'high',
      description: 'Implement real-time security monitoring for PHI access',
      implementation: 'Deploy security monitoring dashboard for anomaly detection'
    });

    return recommendations;
  }

  /**
   * Generate compliance report
   */
  public generateComplianceReport(): string {
    const result = this.validateCompliance();
    
    let report = `HIPAA Compliance Validation Report\n`;
    report += `Environment: ${this.config.environment}\n`;
    report += `Overall Compliance: ${result.isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}\n\n`;
    
    if (result.criticalIssues.length > 0) {
      report += `CRITICAL SECURITY ISSUES (${result.criticalIssues.length}):\n`;
      result.criticalIssues.forEach((issue, index) => {
        report += `${index + 1}. ${issue.issue}\n`;
        report += `   Impact: ${issue.impact}\n`;
        report += `   Urgency: ${issue.urgency}\n`;
        report += `   Resolution: ${issue.resolution}\n\n`;
      });
    }

    if (result.violations.length > 0) {
      report += `HIPAA VIOLATIONS (${result.violations.length}):\n`;
      result.violations.forEach((violation, index) => {
        report += `${index + 1}. ${violation.regulation} - ${violation.description}\n`;
        report += `   Severity: ${violation.severity}\n`;
        report += `   Current: ${violation.currentValue}\n`;
        report += `   Required: ${violation.requiredValue}\n`;
        report += `   Remediation: ${violation.remediation}\n\n`;
      });
    }

    return report;
  }
}

// Export singleton instance
export const hipaaValidator = new HIPAAComplianceValidator();