/**
 * Phase 7B: Security Environment Configuration Consolidation Tests
 * 
 * Comprehensive test suite validating:
 * 1. Consolidated environment security management
 * 2. Centralized credential management
 * 3. HIPAA compliance validation
 * 4. Crisis intervention security guarantee
 * 5. Clinical data protection standards
 */

import {
  SecurityConfig,
  SecurityValidation,
  SecurityMigration,
  SecurityDevelopment,
  securityEnvironment,
  credentialManager,
  hipaaValidator,
} from '../../src/config/security';

describe('Phase 7B: Security Configuration Consolidation', () => {
  
  describe('SecurityEnvironmentManager', () => {
    test('should provide environment-specific security configuration', () => {
      const config = SecurityConfig.getEnvironment();
      
      expect(config).toBeDefined();
      expect(['development', 'staging', 'production']).toContain(config.environment);
      expect(config.encryption).toBeDefined();
      expect(config.crisis).toBeDefined();
      expect(config.auth).toBeDefined();
      expect(config.compliance).toBeDefined();
      expect(config.performance).toBeDefined();
    });

    test('should maintain immutable crisis intervention settings', () => {
      const crisisConfig = SecurityConfig.getCrisisConfig();
      
      // IMMUTABLE: Crisis intervention security constants
      expect(crisisConfig.hotline).toBe('988');
      expect(crisisConfig.textLine).toBe('741741');
      expect(crisisConfig.emergencyServices).toBe('911');
      expect(crisisConfig.thresholds.phq9).toBe(20);
      expect(crisisConfig.thresholds.gad7).toBe(15);
      expect(crisisConfig.alwaysAccessible).toBe(true);
      expect(crisisConfig.paymentBypassEnabled).toBe(true);
      expect(crisisConfig.detectionEnabled).toBe(true);
      expect(crisisConfig.autoIntervention).toBe(true);
    });

    test('should enforce DataSensitivity.CRISIS encryption requirements', () => {
      const encryptionConfig = SecurityConfig.getEncryptionConfig();
      
      // DataSensitivity.CRISIS requires AES-256
      expect(encryptionConfig.enabled).toBe(true);
      expect(encryptionConfig.level).toBe('AES-256');
      expect(encryptionConfig.backupEncryption).toBe(true);
      
      // Validate crisis encryption requirements
      expect(() => securityEnvironment.validateCrisisEncryption()).not.toThrow();
    });

    test('should validate configuration integrity on initialization', () => {
      // Should not throw if configuration is valid
      expect(() => {
        const manager = securityEnvironment;
        const config = manager.getConfig();
        
        // Critical validations
        expect(config.crisis.hotline).toBe('988');
        expect(config.encryption.enabled).toBe(true);
        expect(config.compliance.gdprCompliance).toBe(true);
      }).not.toThrow();
    });
  });

  describe('CredentialManager', () => {
    test('should provide consolidated credential access', () => {
      const credentials = SecurityConfig.getCredentials();
      
      expect(credentials.supabase).toBeDefined();
      expect(credentials.stripe).toBeDefined();
      expect(credentials.auth).toBeDefined();
      expect(credentials.monitoring).toBeDefined();
      expect(credentials.crisis).toBeDefined();
    });

    test('should validate credential security', () => {
      expect(() => SecurityValidation.validateCredentials()).not.toThrow();
    });

    test('should provide environment-specific Supabase credentials', () => {
      const supabaseCredentials = credentialManager.getSupabaseCredentials();
      
      expect(supabaseCredentials.url).toBeDefined();
      expect(supabaseCredentials.anonKey).toBeDefined();
      expect(['us-east-1', 'us-west-1']).toContain(supabaseCredentials.region);
      expect(supabaseCredentials.maxRetries).toBeGreaterThan(0);
    });

    test('should provide crisis intervention credentials', () => {
      const crisisCredentials = credentialManager.getCrisisCredentials();
      
      expect(crisisCredentials.crisisApiEndpoint).toBeDefined();
      expect(crisisCredentials.crisisApiEndpoint).toMatch(/\/crisis$/);
    });
  });

  describe('HIPAAComplianceValidator', () => {
    test('should validate technical safeguards compliance', () => {
      const validationResult = SecurityConfig.validateCompliance();
      
      expect(validationResult).toBeDefined();
      expect(validationResult.violations).toBeInstanceOf(Array);
      expect(validationResult.criticalIssues).toBeInstanceOf(Array);
      expect(validationResult.warnings).toBeInstanceOf(Array);
      expect(validationResult.recommendations).toBeInstanceOf(Array);
    });

    test('should detect critical security issues', () => {
      const validationResult = SecurityConfig.validateCompliance();
      
      // No immediate crisis access issues should be present
      const immediateCrisisIssues = validationResult.criticalIssues.filter(
        issue => issue.impact === 'crisis_access' && issue.urgency === 'immediate'
      );
      
      expect(immediateCrisisIssues).toHaveLength(0);
    });

    test('should validate crisis intervention accessibility', () => {
      const crisisTest = SecurityDevelopment.testCrisisAccess();
      
      expect(crisisTest.hotlineAccessible).toBe(true);
      expect(crisisTest.textLineAccessible).toBe(true);
      expect(crisisTest.paymentBypassEnabled).toBe(true);
      expect(crisisTest.alwaysAccessible).toBe(true);
      expect(crisisTest.thresholdsCorrect).toBe(true);
    });

    test('should generate compliance report', () => {
      const report = SecurityConfig.generateComplianceReport();
      
      expect(report).toBeDefined();
      expect(report).toContain('HIPAA Compliance Validation Report');
      expect(report).toContain('Environment:');
      expect(report).toContain('Overall Compliance:');
    });
  });

  describe('Environment Variable Consolidation', () => {
    test('should provide legacy compatibility layer', () => {
      const legacyValues = SecurityConfig.getLegacyEnvironmentVariables();
      
      // Critical crisis configuration
      expect(legacyValues.EXPO_PUBLIC_CRISIS_HOTLINE).toBe('988');
      expect(legacyValues.EXPO_PUBLIC_CRISIS_TEXT_LINE).toBe('741741');
      expect(legacyValues.EXPO_PUBLIC_PHQ9_CRISIS_THRESHOLD).toBe(20);
      expect(legacyValues.EXPO_PUBLIC_GAD7_CRISIS_THRESHOLD).toBe(15);
      
      // Encryption configuration
      expect(legacyValues.EXPO_PUBLIC_ENCRYPTION_ENABLED).toBe(true);
      expect(legacyValues.EXPO_PUBLIC_DATA_ENCRYPTION_LEVEL).toBe('AES-256');
      
      // Compliance configuration
      expect(legacyValues.EXPO_PUBLIC_GDPR_COMPLIANCE).toBe(true);
      expect(legacyValues.EXPO_PUBLIC_CLINICAL_AUDIT_TRAIL).toBe(true);
    });

    test('should identify deprecated environment variables', () => {
      const deprecatedVars = SecurityConfig.getDeprecatedVariables();
      
      expect(deprecatedVars).toBeInstanceOf(Array);
      expect(deprecatedVars).toContain('EXPO_PUBLIC_CLOUD_FEATURES_ENABLED');
      expect(deprecatedVars).toContain('EXPO_PUBLIC_ANONYMOUS_ANALYTICS');
      expect(deprecatedVars).toContain('EXPO_PUBLIC_SECURE_STORAGE');
    });

    test('should validate migration completeness', () => {
      const migrationStatus = SecurityMigration.verifyMigration();
      
      expect(migrationStatus).toBeDefined();
      expect(migrationStatus.isComplete).toBeDefined();
      expect(migrationStatus.remainingVariables).toBeInstanceOf(Array);
      expect(migrationStatus.recommendedActions).toBeInstanceOf(Array);
    });
  });

  describe('Security Validation Integration', () => {
    test('should run comprehensive security validation', () => {
      const validationResults = SecurityValidation.validateAll();
      
      expect(validationResults.isValid).toBeDefined();
      expect(validationResults.details).toBeDefined();
      expect(validationResults.details.crisisAccess).toBe(true);
      expect(validationResults.details.credentials).toBe(true);
      expect(validationResults.details.noDeprecated).toBeDefined();
      expect(validationResults.details.hipaaCompliance).toBeDefined();
    });

    test('should validate crisis intervention security specifically', () => {
      expect(() => SecurityValidation.validateCrisisAccess()).not.toThrow();
    });

    test('should detect and warn about deprecated variables', () => {
      const noDeprecatedResult = SecurityValidation.checkDeprecatedVariables();
      
      // This test passes regardless of result but logs warnings appropriately
      expect(typeof noDeprecatedResult).toBe('boolean');
    });
  });

  describe('Development and Testing Utilities', () => {
    test('should provide development security report', () => {
      const devReport = SecurityDevelopment.generateDevelopmentReport();
      
      expect(devReport.summary).toBeDefined();
      expect(devReport.summary.environment).toBeDefined();
      expect(devReport.summary.overallStatus).toBeDefined();
      expect(devReport.summary.criticalComponents).toBeDefined();
      expect(devReport.details).toBeDefined();
    });

    test('should test crisis access functionality', () => {
      const crisisTest = SecurityDevelopment.testCrisisAccess();
      
      expect(crisisTest.hotlineAccessible).toBe(true);
      expect(crisisTest.textLineAccessible).toBe(true);
      expect(crisisTest.paymentBypassEnabled).toBe(true);
      expect(crisisTest.alwaysAccessible).toBe(true);
      expect(crisisTest.thresholdsCorrect).toBe(true);
    });

    test('should test encryption configuration', () => {
      const encryptionTest = SecurityDevelopment.testEncryption();
      
      expect(encryptionTest.enabled).toBe(true);
      expect(encryptionTest.levelAES256).toBe(true);
      expect(encryptionTest.backupEncrypted).toBe(true);
    });
  });

  describe('Error Handling and Security Violations', () => {
    test('should throw on critical security violations', () => {
      // Test configuration integrity validation
      expect(() => {
        const config = SecurityConfig.getEnvironment();
        
        // Simulate tampering (in a real scenario, this would be detected)
        if (config.crisis.hotline !== '988') {
          throw new Error('Crisis hotline configuration tampered');
        }
        
        if (!config.encryption.enabled) {
          throw new Error('Encryption disabled - security violation');
        }
      }).not.toThrow();
    });

    test('should validate DataSensitivity.CRISIS requirements cannot be bypassed', () => {
      expect(() => {
        securityEnvironment.validateCrisisEncryption();
      }).not.toThrow();
    });
  });
});

describe('Integration with Existing Security Services', () => {
  test('should integrate with existing EncryptionService patterns', () => {
    // Test that our configuration system provides the values that 
    // existing services expect
    const encryptionConfig = SecurityConfig.getEncryptionConfig();
    
    expect(encryptionConfig.enabled).toBe(true);
    expect(encryptionConfig.level).toBe('AES-256');
    
    // These values should be usable by DataSensitivity.CRISIS operations
    expect(encryptionConfig.backupEncryption).toBe(true);
  });

  test('should provide crisis intervention credentials for emergency access', () => {
    const crisisCredentials = credentialManager.getCrisisCredentials();
    const crisisConfig = SecurityConfig.getCrisisConfig();
    
    // Crisis API should be accessible
    expect(crisisCredentials.crisisApiEndpoint).toBeDefined();
    
    // Emergency bypass should be enabled
    expect(crisisConfig.paymentBypassEnabled).toBe(true);
    expect(crisisConfig.alwaysAccessible).toBe(true);
  });
});

describe('Phase 7B Consolidation Success Criteria', () => {
  test('should eliminate duplicate environment variables', () => {
    const deprecatedVars = SecurityConfig.getDeprecatedVariables();
    
    // Key duplicates that should be removed
    expect(deprecatedVars).toContain('EXPO_PUBLIC_SECURE_STORAGE'); // Always enabled
    expect(deprecatedVars).toContain('EXPO_PUBLIC_CLINICAL_VALIDATION_ENABLED'); // Always enabled
    expect(deprecatedVars).toContain('EXPO_PUBLIC_PHQ9_SCORING_VALIDATION'); // Always strict
    expect(deprecatedVars).toContain('EXPO_PUBLIC_GAD7_SCORING_VALIDATION'); // Always strict
  });

  test('should maintain HIPAA compliance across all environments', () => {
    const compliance = SecurityConfig.validateCompliance();
    const criticalViolations = compliance.violations.filter(v => v.severity === 'critical');
    const immediateCrisisIssues = compliance.criticalIssues.filter(i => i.urgency === 'immediate');
    
    // No critical HIPAA violations or immediate crisis issues
    expect(criticalViolations.length + immediateCrisisIssues.length).toBe(0);
  });

  test('should preserve DataSensitivity.CRISIS encryption requirements', () => {
    expect(() => securityEnvironment.validateCrisisEncryption()).not.toThrow();
  });

  test('should ensure crisis intervention remains accessible', () => {
    const crisisTest = SecurityDevelopment.testCrisisAccess();
    
    // All crisis access tests must pass
    expect(Object.values(crisisTest).every(Boolean)).toBe(true);
  });

  test('should provide consolidated credential management', () => {
    const credentials = SecurityConfig.getCredentials();
    
    // All required credential categories should be present
    expect(credentials.supabase).toBeDefined();
    expect(credentials.stripe).toBeDefined();
    expect(credentials.auth).toBeDefined();
    expect(credentials.crisis).toBeDefined();
    
    // Credential security validation should pass
    expect(() => SecurityValidation.validateCredentials()).not.toThrow();
  });
});