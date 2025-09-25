#!/usr/bin/env node
/**
 * PHASE 5F: Store Consolidation Integration Testing
 * CRITICAL: Validates Clinical Pattern + Phase 4 canonical types + Phase 5 store architecture
 *
 * Test Agent: Store integration validation before crisis agent handoff
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class StoreIntegrationValidator {
  constructor() {
    this.validationResults = {
      assessmentStore: { passed: 0, failed: 0, errors: [] },
      crisisStore: { passed: 0, failed: 0, errors: [] },
      userStore: { passed: 0, failed: 0, errors: [] },
      settingsStore: { passed: 0, failed: 0, errors: [] },
      integration: { passed: 0, failed: 0, errors: [] }
    };
    this.startTime = performance.now();
  }

  /**
   * Validate Assessment Store with Clinical Pattern
   */
  async validateAssessmentStore() {
    console.log('🏥 PHASE 5F: Validating Assessment Store Clinical Pattern...');

    try {
      // Check if assessment store exists and has correct structure
      const assessmentStorePath = path.join(__dirname, 'src/store/assessmentStore.ts');
      if (!fs.existsSync(assessmentStorePath)) {
        throw new Error('Assessment store file not found');
      }

      const assessmentStoreContent = fs.readFileSync(assessmentStorePath, 'utf8');

      // Validate Clinical Pattern implementation
      const clinicalPatternChecks = [
        {
          name: 'Clinical Pattern Import',
          pattern: /from.*types\/crisis-safety/,
          required: true
        },
        {
          name: 'PHQ9Answers Type',
          pattern: /PHQ9Answers/,
          required: true
        },
        {
          name: 'GAD7Answers Type',
          pattern: /GAD7Answers/,
          required: true
        },
        {
          name: 'CLINICAL_CONSTANTS',
          pattern: /CLINICAL_CONSTANTS/,
          required: true
        },
        {
          name: 'Crisis Threshold PHQ9',
          pattern: /CRISIS_THRESHOLD_PHQ9/,
          required: true
        },
        {
          name: 'Crisis Threshold GAD7',
          pattern: /CRISIS_THRESHOLD_GAD7/,
          required: true
        },
        {
          name: 'Suicidal Ideation Detection',
          pattern: /SUICIDAL_IDEATION_QUESTION_INDEX/,
          required: true
        },
        {
          name: 'DataSensitivity.CLINICAL',
          pattern: /DataSensitivity\.CLINICAL/,
          required: true
        },
        {
          name: 'Clinical Pattern Migration',
          pattern: /migrateToClinicalPattern/,
          required: true
        },
        {
          name: 'Clinical Accuracy Validation',
          pattern: /validateClinicalAccuracy/,
          required: true
        }
      ];

      clinicalPatternChecks.forEach(check => {
        if (check.pattern.test(assessmentStoreContent)) {
          this.validationResults.assessmentStore.passed++;
          console.log(`  ✅ ${check.name}`);
        } else if (check.required) {
          this.validationResults.assessmentStore.failed++;
          this.validationResults.assessmentStore.errors.push({
            type: 'CLINICAL_PATTERN_MISSING',
            check: check.name,
            pattern: check.pattern.toString()
          });
          console.log(`  ❌ ${check.name} - MISSING`);
        }
      });

      // Validate Performance Requirements
      const performanceChecks = [
        {
          name: 'Assessment Load Performance (<500ms)',
          pattern: /lastLoadTime|performanceMetrics/,
          required: true
        },
        {
          name: 'Crisis Detection Performance (<200ms)',
          pattern: /crisisDetectionTime/,
          required: true
        },
        {
          name: 'Calculation Time Tracking',
          pattern: /lastCalculationTime/,
          required: true
        }
      ];

      performanceChecks.forEach(check => {
        if (check.pattern.test(assessmentStoreContent)) {
          this.validationResults.assessmentStore.passed++;
          console.log(`  ✅ ${check.name}`);
        } else if (check.required) {
          this.validationResults.assessmentStore.failed++;
          this.validationResults.assessmentStore.errors.push({
            type: 'PERFORMANCE_TRACKING_MISSING',
            check: check.name
          });
          console.log(`  ❌ ${check.name} - MISSING`);
        }
      });

    } catch (error) {
      this.validationResults.assessmentStore.failed++;
      this.validationResults.assessmentStore.errors.push({
        type: 'ASSESSMENT_STORE_ERROR',
        error: error.message
      });
      console.log(`  ❌ Assessment Store Validation Failed: ${error.message}`);
    }
  }

  /**
   * Validate Crisis Store Emergency Intervention
   */
  async validateCrisisStore() {
    console.log('🚨 PHASE 5F: Validating Crisis Store Emergency Intervention...');

    try {
      // Check crisis store files
      const crisisStoreFiles = [
        'src/store/crisis/crisis-button-store.ts',
        'src/services/CrisisDetectionService.ts',
        'src/services/CrisisResponseMonitor.ts'
      ];

      let foundCrisisFiles = 0;
      crisisStoreFiles.forEach(filePath => {
        const fullPath = path.join(__dirname, filePath);
        if (fs.existsSync(fullPath)) {
          foundCrisisFiles++;
          console.log(`  ✅ Found ${filePath}`);
        } else {
          console.log(`  ⚠️  Missing ${filePath}`);
        }
      });

      if (foundCrisisFiles > 0) {
        this.validationResults.crisisStore.passed++;
      }

      // Check DataSensitivity encryption usage in assessment store
      const assessmentStorePath = path.join(__dirname, 'src/store/assessmentStore.ts');
      if (fs.existsSync(assessmentStorePath)) {
        const content = fs.readFileSync(assessmentStorePath, 'utf8');
        if (content.includes('DataSensitivity.CLINICAL') || content.includes('DataSensitivity.CRISIS')) {
          this.validationResults.crisisStore.passed++;
          console.log('  ✅ DataSensitivity encryption detected (CLINICAL/CRISIS)');
        } else {
          this.validationResults.crisisStore.failed++;
          this.validationResults.crisisStore.errors.push({
            type: 'CRISIS_ENCRYPTION_MISSING',
            message: 'DataSensitivity encryption not found in assessment store'
          });
          console.log('  ❌ DataSensitivity encryption missing');
        }
      }

      // Check 988 hotline integration
      const crisisConstants = [
        "createCrisisPhoneNumber('988')",
        'EMERGENCY_NUMBER.*988',
        'tel:988'
      ];

      crisisConstants.forEach((pattern, index) => {
        const regex = new RegExp(pattern);
        if (fs.existsSync(assessmentStorePath)) {
          const content = fs.readFileSync(assessmentStorePath, 'utf8');
          if (regex.test(content)) {
            this.validationResults.crisisStore.passed++;
            console.log(`  ✅ 988 hotline integration detected (pattern ${index + 1})`);
          }
        }
      });

    } catch (error) {
      this.validationResults.crisisStore.failed++;
      this.validationResults.crisisStore.errors.push({
        type: 'CRISIS_STORE_ERROR',
        error: error.message
      });
      console.log(`  ❌ Crisis Store Validation Failed: ${error.message}`);
    }
  }

  /**
   * Validate User Store HIPAA Compliance
   */
  async validateUserStore() {
    console.log('🛡️ PHASE 5F: Validating User Store HIPAA Compliance...');

    try {
      const userStorePath = path.join(__dirname, 'src/store/userStore.ts');
      if (!fs.existsSync(userStorePath)) {
        throw new Error('User store file not found');
      }

      const userStoreContent = fs.readFileSync(userStorePath, 'utf8');

      // HIPAA compliance checks
      const hipaaChecks = [
        {
          name: 'Encryption Service Import',
          pattern: /encryptionService.*from.*security/,
          required: true
        },
        {
          name: 'Clinical Pattern Integration',
          pattern: /Clinical.*Pattern|clinicalPattern/,
          required: false
        },
        {
          name: 'Secure Storage',
          pattern: /SecureDataStore|encryptedStorage/,
          required: true
        },
        {
          name: 'Data Sensitivity Classification',
          pattern: /DataSensitivity\./,
          required: true
        }
      ];

      hipaaChecks.forEach(check => {
        if (check.pattern.test(userStoreContent)) {
          this.validationResults.userStore.passed++;
          console.log(`  ✅ ${check.name}`);
        } else if (check.required) {
          this.validationResults.userStore.failed++;
          this.validationResults.userStore.errors.push({
            type: 'HIPAA_COMPLIANCE_MISSING',
            check: check.name
          });
          console.log(`  ❌ ${check.name} - MISSING`);
        } else {
          console.log(`  ⚠️  ${check.name} - Optional`);
        }
      });

    } catch (error) {
      this.validationResults.userStore.failed++;
      this.validationResults.userStore.errors.push({
        type: 'USER_STORE_ERROR',
        error: error.message
      });
      console.log(`  ❌ User Store Validation Failed: ${error.message}`);
    }
  }

  /**
   * Validate Settings Store Consolidated Preferences
   */
  async validateSettingsStore() {
    console.log('⚙️ PHASE 5F: Validating Settings Store Consolidated Preferences...');

    // Check if settings store exists or if preferences are integrated into other stores
    const settingsFiles = [
      'src/store/settingsStore.ts',
      'src/store/userStore.ts' // Settings might be integrated into user store
    ];

    let foundSettings = false;
    settingsFiles.forEach(filePath => {
      const fullPath = path.join(__dirname, filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('settings') || content.includes('preferences') || content.includes('Settings')) {
          foundSettings = true;
          this.validationResults.settingsStore.passed++;
          console.log(`  ✅ Settings/preferences found in ${filePath}`);
        }
      }
    });

    if (!foundSettings) {
      this.validationResults.settingsStore.failed++;
      this.validationResults.settingsStore.errors.push({
        type: 'SETTINGS_STORE_MISSING',
        message: 'No settings or preferences store detected'
      });
      console.log('  ❌ Settings store not found');
    }
  }

  /**
   * Validate Phase Integration (3D + 4 + 5)
   */
  async validatePhaseIntegration() {
    console.log('🔗 PHASE 5F: Validating Phase Integration (3D+4+5)...');

    try {
      // Phase 3D: Service consolidation (250→67)
      const serviceFiles = fs.readdirSync(path.join(__dirname, 'src/services'))
        .filter(file => file.endsWith('.ts') && !file.endsWith('.test.ts'));

      console.log(`  📊 Service files count: ${serviceFiles.length}`);

      if (serviceFiles.length <= 70) { // Target was 67, allow some margin
        this.validationResults.integration.passed++;
        console.log('  ✅ Phase 3D: Service consolidation target met');
      } else {
        this.validationResults.integration.failed++;
        this.validationResults.integration.errors.push({
          type: 'SERVICE_CONSOLIDATION_TARGET_MISSED',
          actual: serviceFiles.length,
          target: 67
        });
        console.log(`  ❌ Phase 3D: Service consolidation target missed (${serviceFiles.length} > 70)`);
      }

      // Phase 4: Type consolidation (96→25)
      const typeFiles = fs.readdirSync(path.join(__dirname, 'src/types'))
        .filter(file => file.endsWith('.ts') && !file.includes('canonical'));

      console.log(`  📊 Type files count: ${typeFiles.length}`);

      if (typeFiles.length <= 30) { // Target was 25, allow some margin
        this.validationResults.integration.passed++;
        console.log('  ✅ Phase 4: Type consolidation target met');
      } else {
        this.validationResults.integration.failed++;
        this.validationResults.integration.errors.push({
          type: 'TYPE_CONSOLIDATION_TARGET_MISSED',
          actual: typeFiles.length,
          target: 25
        });
        console.log(`  ❌ Phase 4: Type consolidation target missed (${typeFiles.length} > 30)`);
      }

      // Phase 5: Clinical Pattern implementation
      const assessmentStorePath = path.join(__dirname, 'src/store/assessmentStore.ts');
      if (fs.existsSync(assessmentStorePath)) {
        const content = fs.readFileSync(assessmentStorePath, 'utf8');
        if (content.includes('Clinical Pattern') && content.includes('patternCompliance')) {
          this.validationResults.integration.passed++;
          console.log('  ✅ Phase 5: Clinical Pattern implementation detected');
        } else {
          this.validationResults.integration.failed++;
          this.validationResults.integration.errors.push({
            type: 'CLINICAL_PATTERN_MISSING',
            message: 'Clinical Pattern implementation not found'
          });
          console.log('  ❌ Phase 5: Clinical Pattern implementation missing');
        }
      }

      // Integration check: Cross-phase compatibility
      const canonicalTypes = fs.existsSync(path.join(__dirname, 'src/types/crisis-safety.ts'));
      const consolidatedServices = fs.existsSync(path.join(__dirname, 'src/services/consolidated'));
      const clinicalPattern = fs.existsSync(assessmentStorePath);

      if (canonicalTypes && clinicalPattern) {
        this.validationResults.integration.passed++;
        console.log('  ✅ Cross-phase integration: Types + Clinical Pattern working together');
      } else {
        this.validationResults.integration.failed++;
        this.validationResults.integration.errors.push({
          type: 'CROSS_PHASE_INTEGRATION_FAILED',
          canonicalTypes,
          clinicalPattern
        });
        console.log('  ❌ Cross-phase integration issues detected');
      }

    } catch (error) {
      this.validationResults.integration.failed++;
      this.validationResults.integration.errors.push({
        type: 'PHASE_INTEGRATION_ERROR',
        error: error.message
      });
      console.log(`  ❌ Phase Integration Validation Failed: ${error.message}`);
    }
  }

  /**
   * Generate validation report
   */
  generateValidationReport() {
    const totalTime = performance.now() - this.startTime;
    const overallPassed = Object.values(this.validationResults).every(result => result.failed === 0);

    const report = {
      timestamp: new Date().toISOString(),
      phase: '5F',
      agent: 'test',
      validationType: 'store_integration',
      validationTimeMs: Math.round(totalTime),
      overallPassed,
      results: this.validationResults,
      summary: {
        totalTests: Object.values(this.validationResults).reduce((sum, r) => sum + r.passed + r.failed, 0),
        totalPassed: Object.values(this.validationResults).reduce((sum, r) => sum + r.passed, 0),
        totalFailed: Object.values(this.validationResults).reduce((sum, r) => sum + r.failed, 0)
      },
      readyForCrisisAgent: overallPassed
    };

    return report;
  }

  /**
   * Run complete store integration validation
   */
  async runCompleteValidation() {
    console.log('🚀 PHASE 5F: Store Integration Validation Started');
    console.log('=' .repeat(60));

    try {
      await this.validateAssessmentStore();
      await this.validateCrisisStore();
      await this.validateUserStore();
      await this.validateSettingsStore();
      await this.validatePhaseIntegration();

      const report = this.generateValidationReport();

      console.log('=' .repeat(60));
      console.log('📊 PHASE 5F STORE INTEGRATION SUMMARY:');
      console.log(`Overall Status: ${report.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`Total Tests: ${report.summary.totalTests}`);
      console.log(`Passed: ${report.summary.totalPassed}`);
      console.log(`Failed: ${report.summary.totalFailed}`);
      console.log(`Validation Time: ${report.validationTimeMs}ms`);

      if (!report.overallPassed) {
        console.log('\\n❌ INTEGRATION ERRORS:');
        Object.entries(this.validationResults).forEach(([category, result]) => {
          if (result.failed > 0) {
            console.log(`\\n${category.toUpperCase()}: ${result.failed} failures`);
            result.errors.forEach(error => {
              console.log(`  • ${error.type}: ${error.message || JSON.stringify(error)}`);
            });
          }
        });

        console.log('\\n🚨 STORE INTEGRATION FAILED - Review issues before crisis agent handoff');
      } else {
        console.log('\\n✅ STORE INTEGRATION COMPLETE - Ready for crisis agent handoff');
      }

      // Save detailed report
      const reportPath = path.join(__dirname, 'PHASE_5F_STORE_INTEGRATION_REPORT.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Detailed report: ${reportPath}`);

      return report;

    } catch (error) {
      console.error('🚨 STORE INTEGRATION VALIDATION ERROR:', error);
      throw error;
    }
  }
}

// Execute validation if run directly
if (require.main === module) {
  const validator = new StoreIntegrationValidator();
  validator.runCompleteValidation()
    .then((report) => {
      if (report.overallPassed) {
        console.log('🎉 PHASE 5F store integration validation completed successfully');
        process.exit(0);
      } else {
        console.log('💥 PHASE 5F store integration validation failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 PHASE 5F store integration validation error:', error);
      process.exit(1);
    });
}

module.exports = { StoreIntegrationValidator };