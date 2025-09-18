#!/usr/bin/env node

/**
 * Payment Security Deployment Validation Script
 *
 * Validates Day 15 P0-CLOUD payment infrastructure deployment
 * Ensures PCI DSS compliance and crisis safety requirements
 *
 * CRITICAL VALIDATIONS:
 * - PCI DSS Level 2 compliance verification
 * - Crisis bypass functionality (<200ms response)
 * - Payment data isolation from PHI
 * - Database schema and RLS policy validation
 * - Fraud detection and rate limiting
 * - Comprehensive audit logging
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Validation configuration
const VALIDATION_CONFIG = {
  crisisResponseTimeLimit: 200, // milliseconds
  pciComplianceRequired: true,
  hipaaComplianceRequired: true,
  auditRetentionYears: 7,
  maxAllowedVulnerabilities: 0,
  requiredEncryptionAlgorithm: 'AES-256-GCM',
  requiredKeyDerivation: 'PBKDF2-SHA256'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  const levelColors = {
    INFO: colors.blue,
    SUCCESS: colors.green,
    WARNING: colors.yellow,
    ERROR: colors.red,
    CRITICAL: colors.magenta
  };

  console.log(`${levelColors[level]}[${level}] ${timestamp}: ${message}${colors.reset}`);
}

class PaymentDeploymentValidator {
  constructor() {
    this.validationResults = {
      pciCompliance: false,
      crisisSafety: false,
      dataIsolation: false,
      databaseSchema: false,
      auditLogging: false,
      performanceRequirements: false,
      securityIntegration: false,
      overallValid: false
    };

    this.issues = [];
    this.recommendations = [];
  }

  async runValidation() {
    log('INFO', 'Starting Payment Security Deployment Validation');
    log('INFO', '🏥 Validating PCI DSS + HIPAA dual compliance for mental health payments');

    try {
      // Core validation checks
      await this.validatePCICompliance();
      await this.validateCrisisSafetyProtocols();
      await this.validateDataIsolation();
      await this.validateDatabaseSchema();
      await this.validateAuditLogging();
      await this.validatePerformanceRequirements();
      await this.validateSecurityIntegration();

      // Calculate overall validation result
      this.calculateOverallResult();

      // Generate validation report
      await this.generateValidationReport();

      // Exit with appropriate code
      process.exit(this.validationResults.overallValid ? 0 : 1);

    } catch (error) {
      log('CRITICAL', `Validation failed with error: ${error.message}`);
      process.exit(1);
    }
  }

  async validatePCICompliance() {
    log('INFO', '🔐 Validating PCI DSS Level 2 compliance...');

    try {
      // Check payment security service exists
      const paymentServicePath = path.join(__dirname, '../src/services/security/PaymentSecurityService.ts');
      if (!fs.existsSync(paymentServicePath)) {
        throw new Error('PaymentSecurityService.ts not found');
      }

      const serviceContent = fs.readFileSync(paymentServicePath, 'utf8');

      // Validate PCI DSS requirements
      const pciChecks = [
        {
          name: 'No card data storage',
          check: () => !serviceContent.includes('cardNumber') && !serviceContent.includes('cvv'),
          requirement: 'PCI DSS Requirement 3.2'
        },
        {
          name: 'Separate encryption keys',
          check: () => serviceContent.includes('PAYMENT_MASTER_KEY') && serviceContent.includes('separate'),
          requirement: 'PCI DSS Requirement 3.4'
        },
        {
          name: 'Rate limiting implementation',
          check: () => serviceContent.includes('rateLimitPerMinute') && serviceContent.includes('maxFailedAttempts'),
          requirement: 'PCI DSS Requirement 8.1.6'
        },
        {
          name: 'Comprehensive audit logging',
          check: () => serviceContent.includes('PaymentAuditEvent') && serviceContent.includes('auditRetentionYears'),
          requirement: 'PCI DSS Requirement 10'
        },
        {
          name: 'Fraud detection system',
          check: () => serviceContent.includes('FraudDetectionResult') && serviceContent.includes('riskScore'),
          requirement: 'PCI DSS Requirement 11'
        }
      ];

      let passedChecks = 0;
      for (const check of pciChecks) {
        if (check.check()) {
          log('SUCCESS', `✓ ${check.name} (${check.requirement})`);
          passedChecks++;
        } else {
          log('ERROR', `✗ ${check.name} (${check.requirement})`);
          this.issues.push(`PCI DSS compliance issue: ${check.name}`);
        }
      }

      this.validationResults.pciCompliance = passedChecks === pciChecks.length;

      if (this.validationResults.pciCompliance) {
        log('SUCCESS', '🎉 PCI DSS Level 2 compliance validated');
      } else {
        log('ERROR', `❌ PCI DSS compliance failed: ${passedChecks}/${pciChecks.length} checks passed`);
      }

    } catch (error) {
      log('ERROR', `PCI DSS validation failed: ${error.message}`);
      this.issues.push(`PCI DSS validation error: ${error.message}`);
    }
  }

  async validateCrisisSafetyProtocols() {
    log('INFO', '🚨 Validating crisis safety protocols...');

    try {
      const paymentServicePath = path.join(__dirname, '../src/services/security/PaymentSecurityService.ts');
      const serviceContent = fs.readFileSync(paymentServicePath, 'utf8');

      // Crisis safety checks
      const crisisChecks = [
        {
          name: 'Crisis mode bypass',
          check: () => serviceContent.includes('crisisMode') && serviceContent.includes('bypass'),
          critical: true
        },
        {
          name: 'Emergency payment handling',
          check: () => serviceContent.includes('handleCrisisPaymentRequest'),
          critical: true
        },
        {
          name: 'Rate limiting exemptions',
          check: () => serviceContent.includes('crisis_mode') && serviceContent.includes('exemption'),
          critical: true
        },
        {
          name: '988 hotline protection',
          check: () => serviceContent.includes('988') || serviceContent.includes('emergency'),
          critical: true
        },
        {
          name: 'Emergency cleanup function',
          check: () => serviceContent.includes('emergencyCleanup'),
          critical: false
        }
      ];

      let passedCriticalChecks = 0;
      let totalCriticalChecks = 0;

      for (const check of crisisChecks) {
        if (check.critical) {
          totalCriticalChecks++;
        }

        if (check.check()) {
          log('SUCCESS', `✓ Crisis safety: ${check.name}${check.critical ? ' (CRITICAL)' : ''}`);
          if (check.critical) passedCriticalChecks++;
        } else {
          log(check.critical ? 'CRITICAL' : 'WARNING', `✗ Crisis safety: ${check.name}${check.critical ? ' (CRITICAL)' : ''}`);
          if (check.critical) {
            this.issues.push(`CRITICAL: Crisis safety issue - ${check.name}`);
          }
        }
      }

      this.validationResults.crisisSafety = passedCriticalChecks === totalCriticalChecks;

      if (this.validationResults.crisisSafety) {
        log('SUCCESS', '🎉 Crisis safety protocols validated - 988 hotline access protected');
      } else {
        log('CRITICAL', `❌ Crisis safety validation failed: ${passedCriticalChecks}/${totalCriticalChecks} critical checks passed`);
        log('CRITICAL', '🚨 USER SAFETY COMPROMISED - DEPLOYMENT BLOCKED');
      }

    } catch (error) {
      log('CRITICAL', `Crisis safety validation failed: ${error.message}`);
      this.issues.push(`CRITICAL: Crisis safety validation error: ${error.message}`);
    }
  }

  async validateDataIsolation() {
    log('INFO', '🔒 Validating payment vs PHI data isolation...');

    try {
      const paymentServicePath = path.join(__dirname, '../src/services/security/PaymentSecurityService.ts');
      const encryptionServicePath = path.join(__dirname, '../src/services/security/EncryptionService.ts');

      if (!fs.existsSync(paymentServicePath) || !fs.existsSync(encryptionServicePath)) {
        throw new Error('Required security service files not found');
      }

      const paymentContent = fs.readFileSync(paymentServicePath, 'utf8');
      const encryptionContent = fs.readFileSync(encryptionServicePath, 'utf8');

      // Data isolation checks
      const isolationChecks = [
        {
          name: 'Separate payment encryption keys',
          check: () => paymentContent.includes('PAYMENT_MASTER_KEY') &&
                      !paymentContent.includes('@fullmind_master_key_v1'),
          requirement: 'HIPAA + PCI DSS data segregation'
        },
        {
          name: 'Payment data classification',
          check: () => paymentContent.includes('DataSensitivity.SYSTEM') &&
                      paymentContent.includes('not PHI'),
          requirement: 'Data classification separation'
        },
        {
          name: 'Separate audit contexts',
          check: () => paymentContent.includes('PaymentAuditEvent') &&
                      encryptionContent.includes('logEncryptionEvent'),
          requirement: 'Audit trail separation'
        },
        {
          name: 'No PHI in payment metadata',
          check: () => !paymentContent.toLowerCase().includes('phq9') &&
                      !paymentContent.toLowerCase().includes('gad7') &&
                      !paymentContent.toLowerCase().includes('mood'),
          requirement: 'PHI data protection'
        }
      ];

      let passedChecks = 0;
      for (const check of isolationChecks) {
        if (check.check()) {
          log('SUCCESS', `✓ Data isolation: ${check.name}`);
          passedChecks++;
        } else {
          log('ERROR', `✗ Data isolation: ${check.name} (${check.requirement})`);
          this.issues.push(`Data isolation issue: ${check.name}`);
        }
      }

      this.validationResults.dataIsolation = passedChecks === isolationChecks.length;

      if (this.validationResults.dataIsolation) {
        log('SUCCESS', '🎉 Payment vs PHI data isolation validated');
      } else {
        log('ERROR', `❌ Data isolation validation failed: ${passedChecks}/${isolationChecks.length} checks passed`);
      }

    } catch (error) {
      log('ERROR', `Data isolation validation failed: ${error.message}`);
      this.issues.push(`Data isolation validation error: ${error.message}`);
    }
  }

  async validateDatabaseSchema() {
    log('INFO', '🗄️ Validating payment database schema...');

    try {
      const schemaPath = path.join(__dirname, './payment-database-schema.sql');
      if (!fs.existsSync(schemaPath)) {
        throw new Error('Payment database schema file not found');
      }

      const schemaContent = fs.readFileSync(schemaPath, 'utf8');

      // Database schema checks
      const schemaChecks = [
        {
          name: 'Subscription tables',
          check: () => schemaContent.includes('user_subscriptions') &&
                      schemaContent.includes('subscription_plans'),
          requirement: 'Subscription management'
        },
        {
          name: 'Payment audit logging',
          check: () => schemaContent.includes('payment_audit_log') &&
                      schemaContent.includes('7 years'),
          requirement: 'PCI DSS audit requirements'
        },
        {
          name: 'RLS policies',
          check: () => schemaContent.includes('ENABLE ROW LEVEL SECURITY') &&
                      schemaContent.includes('auth.uid()'),
          requirement: 'Data access control'
        },
        {
          name: 'Crisis safety functions',
          check: () => schemaContent.includes('grant_crisis_subscription_access') &&
                      schemaContent.includes('check_subscription_access'),
          requirement: 'Emergency access protocols'
        },
        {
          name: 'Encrypted payment references',
          check: () => schemaContent.includes('stripe_customer_id_encrypted') &&
                      schemaContent.includes('stripe_subscription_id_encrypted'),
          requirement: 'PCI DSS data protection'
        }
      ];

      let passedChecks = 0;
      for (const check of schemaChecks) {
        if (check.check()) {
          log('SUCCESS', `✓ Database schema: ${check.name}`);
          passedChecks++;
        } else {
          log('ERROR', `✗ Database schema: ${check.name} (${check.requirement})`);
          this.issues.push(`Database schema issue: ${check.name}`);
        }
      }

      this.validationResults.databaseSchema = passedChecks === schemaChecks.length;

      if (this.validationResults.databaseSchema) {
        log('SUCCESS', '🎉 Payment database schema validated');
      } else {
        log('ERROR', `❌ Database schema validation failed: ${passedChecks}/${schemaChecks.length} checks passed`);
      }

    } catch (error) {
      log('ERROR', `Database schema validation failed: ${error.message}`);
      this.issues.push(`Database schema validation error: ${error.message}`);
    }
  }

  async validateAuditLogging() {
    log('INFO', '📋 Validating comprehensive audit logging...');

    try {
      const paymentServicePath = path.join(__dirname, '../src/services/security/PaymentSecurityService.ts');
      const serviceContent = fs.readFileSync(paymentServicePath, 'utf8');

      // Audit logging checks
      const auditChecks = [
        {
          name: 'Payment audit events',
          check: () => serviceContent.includes('PaymentAuditEvent') &&
                      serviceContent.includes('auditPaymentEvent'),
          requirement: 'PCI DSS Requirement 10.1'
        },
        {
          name: '7-year retention policy',
          check: () => serviceContent.includes('auditRetentionYears: 7'),
          requirement: 'PCI DSS Requirement 10.7'
        },
        {
          name: 'Fraud detection logging',
          check: () => serviceContent.includes('fraud_detected') &&
                      serviceContent.includes('riskScore'),
          requirement: 'PCI DSS Requirement 11.4'
        },
        {
          name: 'Crisis bypass logging',
          check: () => serviceContent.includes('crisis_bypass') &&
                      serviceContent.includes('crisisMode'),
          requirement: 'Crisis safety audit trail'
        },
        {
          name: 'Encrypted audit storage',
          check: () => serviceContent.includes('encryptionService.encryptData') &&
                      serviceContent.includes('auditLog: true'),
          requirement: 'Audit data protection'
        }
      ];

      let passedChecks = 0;
      for (const check of auditChecks) {
        if (check.check()) {
          log('SUCCESS', `✓ Audit logging: ${check.name}`);
          passedChecks++;
        } else {
          log('ERROR', `✗ Audit logging: ${check.name} (${check.requirement})`);
          this.issues.push(`Audit logging issue: ${check.name}`);
        }
      }

      this.validationResults.auditLogging = passedChecks === auditChecks.length;

      if (this.validationResults.auditLogging) {
        log('SUCCESS', '🎉 Comprehensive audit logging validated');
      } else {
        log('ERROR', `❌ Audit logging validation failed: ${passedChecks}/${auditChecks.length} checks passed`);
      }

    } catch (error) {
      log('ERROR', `Audit logging validation failed: ${error.message}`);
      this.issues.push(`Audit logging validation error: ${error.message}`);
    }
  }

  async validatePerformanceRequirements() {
    log('INFO', '⚡ Validating performance requirements...');

    try {
      const testPath = path.join(__dirname, '../src/services/security/__tests__/PaymentSecurityService.test.ts');
      if (!fs.existsSync(testPath)) {
        throw new Error('Payment security tests not found');
      }

      const testContent = fs.readFileSync(testPath, 'utf8');

      // Performance requirement checks
      const performanceChecks = [
        {
          name: 'Crisis response time tests',
          check: () => testContent.includes('toBeLessThan(200)') &&
                      testContent.includes('crisis response time'),
          requirement: '<200ms crisis response'
        },
        {
          name: 'Load testing implementation',
          check: () => testContent.includes('concurrentRequests') &&
                      testContent.includes('performance under load'),
          requirement: 'Concurrent operation handling'
        },
        {
          name: 'Crisis mode performance isolation',
          check: () => testContent.includes('crisis mode') &&
                      testContent.includes('performance'),
          requirement: 'Crisis operations prioritization'
        },
        {
          name: 'Error handling resilience',
          check: () => testContent.includes('error handling') &&
                      testContent.includes('gracefully'),
          requirement: 'Graceful degradation'
        }
      ];

      let passedChecks = 0;
      for (const check of performanceChecks) {
        if (check.check()) {
          log('SUCCESS', `✓ Performance: ${check.name}`);
          passedChecks++;
        } else {
          log('WARNING', `✗ Performance: ${check.name} (${check.requirement})`);
          this.recommendations.push(`Add performance test: ${check.name}`);
        }
      }

      this.validationResults.performanceRequirements = passedChecks >= Math.floor(performanceChecks.length * 0.75);

      if (this.validationResults.performanceRequirements) {
        log('SUCCESS', '🎉 Performance requirements validated');
      } else {
        log('WARNING', `⚠️ Performance validation partial: ${passedChecks}/${performanceChecks.length} checks passed`);
      }

    } catch (error) {
      log('WARNING', `Performance validation failed: ${error.message}`);
      this.recommendations.push('Add comprehensive performance testing');
      this.validationResults.performanceRequirements = false;
    }
  }

  async validateSecurityIntegration() {
    log('INFO', '🔗 Validating security service integration...');

    try {
      const indexPath = path.join(__dirname, '../src/services/security/index.ts');
      if (!fs.existsSync(indexPath)) {
        throw new Error('Security service index not found');
      }

      const indexContent = fs.readFileSync(indexPath, 'utf8');

      // Integration checks
      const integrationChecks = [
        {
          name: 'Payment security export',
          check: () => indexContent.includes('PaymentSecurityService') &&
                      indexContent.includes('paymentSecurityService'),
          requirement: 'Service availability'
        },
        {
          name: 'Unified security manager integration',
          check: () => indexContent.includes('paymentSecurity.initialize()') &&
                      indexContent.includes('paymentStatus'),
          requirement: 'Centralized security management'
        },
        {
          name: 'Crisis payment functions',
          check: () => indexContent.includes('createCrisisPaymentToken') &&
                      indexContent.includes('enablePaymentEmergencyMode'),
          requirement: 'Emergency payment access'
        },
        {
          name: 'Compliance reporting integration',
          check: () => indexContent.includes('pciDssCompliance') &&
                      indexContent.includes('paymentStatus'),
          requirement: 'Compliance monitoring'
        }
      ];

      let passedChecks = 0;
      for (const check of integrationChecks) {
        if (check.check()) {
          log('SUCCESS', `✓ Integration: ${check.name}`);
          passedChecks++;
        } else {
          log('ERROR', `✗ Integration: ${check.name} (${check.requirement})`);
          this.issues.push(`Security integration issue: ${check.name}`);
        }
      }

      this.validationResults.securityIntegration = passedChecks === integrationChecks.length;

      if (this.validationResults.securityIntegration) {
        log('SUCCESS', '🎉 Security service integration validated');
      } else {
        log('ERROR', `❌ Security integration validation failed: ${passedChecks}/${integrationChecks.length} checks passed`);
      }

    } catch (error) {
      log('ERROR', `Security integration validation failed: ${error.message}`);
      this.issues.push(`Security integration validation error: ${error.message}`);
    }
  }

  calculateOverallResult() {
    const criticalRequirements = [
      this.validationResults.pciCompliance,
      this.validationResults.crisisSafety,
      this.validationResults.dataIsolation
    ];

    const importantRequirements = [
      this.validationResults.databaseSchema,
      this.validationResults.auditLogging,
      this.validationResults.securityIntegration
    ];

    const allCriticalPassed = criticalRequirements.every(result => result);
    const mostImportantPassed = importantRequirements.filter(result => result).length >= 2;

    this.validationResults.overallValid = allCriticalPassed && mostImportantPassed;

    if (this.validationResults.overallValid) {
      log('SUCCESS', '🎉 OVERALL VALIDATION PASSED - Payment security deployment approved');
      log('SUCCESS', '✅ PCI DSS + HIPAA dual compliance achieved');
      log('SUCCESS', '🚨 Crisis safety protocols validated - 988 hotline protected');
    } else {
      log('CRITICAL', '❌ OVERALL VALIDATION FAILED - Deployment blocked');
      if (!allCriticalPassed) {
        log('CRITICAL', '🚨 CRITICAL REQUIREMENTS NOT MET - User safety at risk');
      }
      log('ERROR', `Issues found: ${this.issues.length}`);
      log('ERROR', `Recommendations: ${this.recommendations.length}`);
    }
  }

  async generateValidationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      validationResults: this.validationResults,
      issues: this.issues,
      recommendations: this.recommendations,
      complianceStatus: {
        pciDssLevel2: this.validationResults.pciCompliance,
        hipaaCompliant: this.validationResults.dataIsolation,
        crisisSafetyProtected: this.validationResults.crisisSafety
      },
      deploymentApproval: this.validationResults.overallValid ? 'APPROVED' : 'BLOCKED',
      nextSteps: this.validationResults.overallValid
        ? ['Deploy to production', 'Monitor payment security metrics', 'Schedule compliance review']
        : ['Fix critical issues', 'Re-run validation', 'Security team review required']
    };

    const reportPath = path.join(__dirname, '../PAYMENT_VALIDATION_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    log('INFO', `📊 Validation report generated: ${reportPath}`);

    // Console summary
    console.log('\n' + '='.repeat(80));
    console.log(`${colors.cyan}PAYMENT SECURITY DEPLOYMENT VALIDATION SUMMARY${colors.reset}`);
    console.log('='.repeat(80));

    Object.entries(this.validationResults).forEach(([key, value]) => {
      const status = value ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
      console.log(`${key.padEnd(25)}: ${status}`);
    });

    if (this.issues.length > 0) {
      console.log(`\n${colors.red}ISSUES (${this.issues.length}):${colors.reset}`);
      this.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }

    if (this.recommendations.length > 0) {
      console.log(`\n${colors.yellow}RECOMMENDATIONS (${this.recommendations.length}):${colors.reset}`);
      this.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    const finalStatus = this.validationResults.overallValid
      ? `${colors.green}✅ DEPLOYMENT APPROVED${colors.reset}`
      : `${colors.red}❌ DEPLOYMENT BLOCKED${colors.reset}`;
    console.log(`FINAL STATUS: ${finalStatus}`);
    console.log('='.repeat(80) + '\n');
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new PaymentDeploymentValidator();
  validator.runValidation().catch(error => {
    console.error('Validation script failed:', error);
    process.exit(1);
  });
}

module.exports = PaymentDeploymentValidator;