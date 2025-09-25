/**
 * Phase 7B: Security Environment Configuration Consolidation
 * Main Export Index
 * 
 * Consolidated security configuration system providing:
 * 1. Unified environment security management
 * 2. Centralized credential management
 * 3. HIPAA compliance validation
 * 4. Crisis intervention security guarantee
 * 5. Clinical data protection standards
 */

// Core configuration exports
export {
  SecurityEnvironmentManager,
  LegacyEnvironmentBridge,
  securityEnvironment,
  legacyBridge,
  type SecurityEnvironmentConfig,
} from './EnvironmentSecurityConfig';

// Credential management exports
export {
  CredentialManager,
  EnvironmentVariableConsolidator,
  credentialManager,
  environmentConsolidator,
  type CredentialConfig,
} from './CredentialManager';

// HIPAA compliance validation exports
export {
  HIPAAComplianceValidator,
  HIPAATechnicalSafeguardsValidator,
  CrisisInterventionSecurityValidator,
  ClinicalDataSecurityValidator,
  hipaaValidator,
  type HIPAAValidationResult,
} from './HIPAAComplianceValidator';

/**
 * Quick access to consolidated security configuration
 */
export const SecurityConfig = {
  // Get current environment security configuration
  getEnvironment: () => securityEnvironment.getConfig(),
  
  // Get consolidated credentials
  getCredentials: () => credentialManager.getCredentials(),
  
  // Validate HIPAA compliance
  validateCompliance: () => hipaaValidator.validateCompliance(),
  
  // Get crisis-specific security settings (immutable)
  getCrisisConfig: () => securityEnvironment.getCrisisConfig(),
  
  // Get encryption configuration
  getEncryptionConfig: () => securityEnvironment.getEncryptionConfig(),
  
  // Get compliance configuration
  getComplianceConfig: () => securityEnvironment.getComplianceConfig(),
  
  // Get consolidated environment variables for legacy compatibility
  getLegacyEnvironmentVariables: () => legacyBridge.getConsolidatedValues(),
  
  // Get deprecated variables list
  getDeprecatedVariables: () => environmentConsolidator.getDeprecatedVariables(),
  
  // Generate compliance report
  generateComplianceReport: () => hipaaValidator.generateComplianceReport(),
};

/**
 * Validation utilities for security configuration
 */
export const SecurityValidation = {
  // Validate crisis intervention accessibility
  validateCrisisAccess: () => securityEnvironment.validateCrisisEncryption(),
  
  // Validate credential security
  validateCredentials: () => credentialManager.validateCredentialSecurity(),
  
  // Check for deprecated environment variables
  checkDeprecatedVariables: () => environmentConsolidator.validateNoDeprecatedVariables(),
  
  // Full security validation
  validateAll: () => {
    const results = {
      crisisAccess: SecurityValidation.validateCrisisAccess(),
      credentials: SecurityValidation.validateCredentials(),
      noDeprecated: SecurityValidation.checkDeprecatedVariables(),
      hipaaCompliance: SecurityConfig.validateCompliance(),
    };
    
    return {
      isValid: results.crisisAccess && results.credentials && results.noDeprecated && results.hipaaCompliance.isCompliant,
      details: results,
    };
  },
};

/**
 * Migration utilities for transitioning from old environment variables
 */
export const SecurityMigration = {
  // Get mapping of old to new configuration
  getMigrationMapping: () => environmentConsolidator.getConsolidatedEnvironment(),
  
  // Get list of variables that can be safely removed
  getVariablesToRemove: () => environmentConsolidator.getDeprecatedVariables(),
  
  // Verify migration completeness
  verifyMigration: () => {
    const deprecated = environmentConsolidator.getDeprecatedVariables();
    const stillPresent = deprecated.filter(varName => process.env[varName] !== undefined);
    
    return {
      isComplete: stillPresent.length === 0,
      remainingVariables: stillPresent,
      recommendedActions: stillPresent.length > 0 ? [
        'Remove deprecated environment variables from .env files',
        'Update code to use SecurityConfig instead of direct process.env access',
        'Run validation to ensure no functionality is broken'
      ] : ['Migration is complete'],
    };
  },
};

/**
 * Development utilities for testing and debugging security configuration
 */
export const SecurityDevelopment = {
  // Test crisis intervention accessibility
  testCrisisAccess: () => {
    const crisisConfig = SecurityConfig.getCrisisConfig();
    return {
      hotlineAccessible: crisisConfig.hotline === '988',
      textLineAccessible: crisisConfig.textLine === '741741',
      paymentBypassEnabled: crisisConfig.paymentBypassEnabled,
      alwaysAccessible: crisisConfig.alwaysAccessible,
      responseTimeOptimal: crisisConfig.responseTimeoutMs <= 200,
      thresholdsCorrect: crisisConfig.thresholds.phq9 === 20 && crisisConfig.thresholds.gad7 === 15,
    };
  },
  
  // Test encryption configuration
  testEncryption: () => {
    const encryptionConfig = SecurityConfig.getEncryptionConfig();
    return {
      enabled: encryptionConfig.enabled,
      levelAES256: encryptionConfig.level === 'AES-256',
      backupEncrypted: encryptionConfig.backupEncryption,
      separatePaymentKeys: encryptionConfig.separatePaymentKeys,
    };
  },
  
  // Generate development security report
  generateDevelopmentReport: () => {
    const crisisTest = SecurityDevelopment.testCrisisAccess();
    const encryptionTest = SecurityDevelopment.testEncryption();
    const validation = SecurityValidation.validateAll();
    
    return {
      summary: {
        environment: securityEnvironment.getConfig().environment,
        overallStatus: validation.isValid ? 'SECURE' : 'ISSUES_DETECTED',
        criticalComponents: {
          crisisAccessible: Object.values(crisisTest).every(Boolean),
          encryptionSecure: Object.values(encryptionTest).every(Boolean),
          hipaaCompliant: validation.details.hipaaCompliance.isCompliant,
        },
      },
      details: {
        crisisAccess: crisisTest,
        encryption: encryptionTest,
        validation: validation.details,
      },
    };
  },
};

// Default export provides quick access to most common functionality
export default {
  ...SecurityConfig,
  validate: SecurityValidation.validateAll,
  migrate: SecurityMigration.verifyMigration,
  test: SecurityDevelopment.generateDevelopmentReport,
};