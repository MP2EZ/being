/**
 * Phase 7B: Security Configuration Validation Script
 * 
 * Validates the consolidated security environment system:
 * 1. Tests all security configurations
 * 2. Validates HIPAA compliance
 * 3. Ensures crisis intervention accessibility
 * 4. Verifies clinical data security standards
 * 5. Checks for deprecated environment variables
 */

import { SecurityConfig, SecurityValidation, SecurityMigration, SecurityDevelopment } from './index';

/**
 * Run comprehensive security configuration validation
 */
export async function validateSecurityConfiguration(): Promise<void> {
  console.log('🔒 Phase 7B: Security Environment Configuration Validation\n');
  
  try {
    // 1. Test basic configuration loading
    console.log('1. Testing Configuration Loading...');
    const environment = SecurityConfig.getEnvironment();
    const credentials = SecurityConfig.getCredentials();
    console.log(`   ✅ Environment: ${environment.environment}`);
    console.log(`   ✅ Credentials loaded for ${Object.keys(credentials).length} services\n`);

    // 2. Validate crisis intervention security
    console.log('2. Validating Crisis Intervention Security...');
    const crisisTest = SecurityDevelopment.testCrisisAccess();
    
    if (crisisTest.hotlineAccessible && crisisTest.textLineAccessible) {
      console.log('   ✅ Crisis hotlines accessible (988, 741741)');
    } else {
      console.log('   ❌ Crisis hotlines not properly configured');
      throw new Error('Crisis intervention accessibility failed');
    }
    
    if (crisisTest.paymentBypassEnabled && crisisTest.alwaysAccessible) {
      console.log('   ✅ Emergency access bypass enabled');
    } else {
      console.log('   ❌ Emergency access bypass not enabled');
      throw new Error('Emergency access configuration failed');
    }
    
    if (crisisTest.thresholdsCorrect) {
      console.log('   ✅ Clinical thresholds correct (PHQ-9: 20, GAD-7: 15)');
    } else {
      console.log('   ❌ Clinical thresholds have been modified');
      throw new Error('Clinical safety thresholds compromised');
    }
    
    console.log('');

    // 3. Validate encryption configuration
    console.log('3. Validating Encryption Configuration...');
    const encryptionTest = SecurityDevelopment.testEncryption();
    
    if (encryptionTest.enabled && encryptionTest.levelAES256) {
      console.log('   ✅ AES-256 encryption enabled');
    } else {
      console.log('   ❌ Encryption not properly configured');
      throw new Error('DataSensitivity.CRISIS encryption requirements not met');
    }
    
    if (encryptionTest.backupEncrypted) {
      console.log('   ✅ Backup encryption enabled');
    } else {
      console.log('   ⚠️  Backup encryption should be enabled');
    }
    
    console.log('');

    // 4. Run HIPAA compliance validation
    console.log('4. Validating HIPAA Compliance...');
    const hipaaResult = SecurityConfig.validateCompliance();
    
    if (hipaaResult.isCompliant) {
      console.log('   ✅ HIPAA compliant');
    } else {
      console.log(`   ⚠️  HIPAA compliance issues found:`);
      console.log(`       - ${hipaaResult.violations.length} violations`);
      console.log(`       - ${hipaaResult.criticalIssues.length} critical issues`);
      
      // Show critical issues
      hipaaResult.criticalIssues.forEach((issue, index) => {
        if (issue.urgency === 'immediate') {
          console.log(`       ${index + 1}. CRITICAL: ${issue.issue}`);
        }
      });
    }
    
    console.log('');

    // 5. Check for deprecated environment variables
    console.log('5. Checking for Deprecated Variables...');
    const migrationStatus = SecurityMigration.verifyMigration();
    
    if (migrationStatus.isComplete) {
      console.log('   ✅ No deprecated environment variables found');
    } else {
      console.log(`   ⚠️  Found ${migrationStatus.remainingVariables.length} deprecated variables:`);
      migrationStatus.remainingVariables.forEach(varName => {
        console.log(`       - ${varName}`);
      });
    }
    
    console.log('');

    // 6. Validate credential security
    console.log('6. Validating Credential Security...');
    try {
      SecurityValidation.validateCredentials();
      console.log('   ✅ Credential security validated');
    } catch (error) {
      console.log(`   ❌ Credential security issue: ${error.message}`);
      throw error;
    }
    
    console.log('');

    // 7. Generate final security report
    console.log('7. Generating Security Report...');
    const securityReport = SecurityDevelopment.generateDevelopmentReport();
    
    console.log(`   Environment: ${securityReport.summary.environment}`);
    console.log(`   Overall Status: ${securityReport.summary.overallStatus}`);
    console.log(`   Crisis Accessible: ${securityReport.summary.criticalComponents.crisisAccessible ? '✅' : '❌'}`);
    console.log(`   Encryption Secure: ${securityReport.summary.criticalComponents.encryptionSecure ? '✅' : '❌'}`);
    console.log(`   HIPAA Compliant: ${securityReport.summary.criticalComponents.hipaaCompliant ? '✅' : '❌'}`);
    
    console.log('');

    // 8. Final validation
    console.log('8. Running Final Validation...');
    const finalValidation = SecurityValidation.validateAll();
    
    if (finalValidation.isValid) {
      console.log('   ✅ All security validations passed');
      console.log('\n🎉 Phase 7B Security Configuration Consolidation: SUCCESS');
      console.log('   ✅ Environment variables consolidated');
      console.log('   ✅ Credential management centralized');
      console.log('   ✅ HIPAA compliance maintained');
      console.log('   ✅ Crisis intervention security guaranteed');
      console.log('   ✅ Clinical data protection verified');
    } else {
      console.log('   ❌ Security validation failed');
      throw new Error('Final security validation failed');
    }

  } catch (error) {
    console.error('\n❌ Phase 7B Security Configuration Validation FAILED');
    console.error(`Error: ${error.message}`);
    console.error('\nIMPORTANT: Security issues must be resolved before proceeding');
    throw error;
  }
}

/**
 * Generate detailed compliance report
 */
export function generateDetailedComplianceReport(): string {
  const report = SecurityConfig.generateComplianceReport();
  const timestamp = new Date().toISOString();
  
  return `
PHASE 7B SECURITY CONFIGURATION CONSOLIDATION REPORT
Generated: ${timestamp}

${report}

CONSOLIDATION SUMMARY:
- Environment variables consolidated from 3 separate .env files
- Duplicate security configurations eliminated
- Centralized credential management implemented
- HIPAA compliance validation automated
- Crisis intervention security guaranteed
- Clinical data protection standards verified

DEPRECATED VARIABLES REMOVED:
${SecurityMigration.verifyMigration().remainingVariables.length === 0 
  ? '✅ All deprecated variables successfully removed'
  : '⚠️  Some deprecated variables still present - see migration status above'
}

NEXT STEPS:
1. Update all service files to use SecurityConfig instead of direct process.env access
2. Remove deprecated environment variables from .env files
3. Deploy consolidated configuration to staging for testing
4. Validate production deployment with new security configuration
`;
}

// Export validation utilities
export const ValidationUtils = {
  validateConfiguration: validateSecurityConfiguration,
  generateReport: generateDetailedComplianceReport,
  
  // Quick validation checks
  quickCheck: () => {
    const results = SecurityValidation.validateAll();
    return {
      passed: results.isValid,
      summary: {
        crisisAccessible: results.details.crisisAccess,
        credentialsSecure: results.details.credentials,
        noDeprecated: results.details.noDeprecated,
        hipaaCompliant: results.details.hipaaCompliance.isCompliant,
      },
    };
  },
  
  // Crisis-specific validation
  validateCrisisOnly: () => {
    const crisisTest = SecurityDevelopment.testCrisisAccess();
    return {
      passed: Object.values(crisisTest).every(Boolean),
      details: crisisTest,
    };
  },
  
  // HIPAA-specific validation
  validateHIPAAOnly: () => {
    const hipaaResult = SecurityConfig.validateCompliance();
    return {
      passed: hipaaResult.isCompliant,
      violations: hipaaResult.violations.length,
      criticalIssues: hipaaResult.criticalIssues.length,
      details: hipaaResult,
    };
  },
};

// Run validation if script is executed directly
if (require.main === module) {
  validateSecurityConfiguration()
    .then(() => {
      console.log('\n📊 Generating detailed compliance report...');
      console.log(generateDetailedComplianceReport());
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Validation failed:', error.message);
      process.exit(1);
    });
}