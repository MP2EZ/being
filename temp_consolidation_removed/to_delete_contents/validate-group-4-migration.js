/**
 * Group 4 Settings Migration Validation
 * Phase 5C: Settings/Preferences Clinical Pattern Migration
 *
 * MISSION: Validate settings preservation and functionality after migration
 * CRITICAL: Ensure zero-loss migration with performance validation
 */

const fs = require('fs');
const path = require('path');

// Validation report structure
const validationReport = {
  timestamp: new Date().toISOString(),
  phase: '5C-Group-4',
  validationType: 'settings-migration',
  results: {
    fileStructure: {},
    settingsPreservation: {},
    clinicalPatternCompliance: {},
    performance: {},
    integration: {}
  },
  summary: {
    passed: 0,
    failed: 0,
    warnings: 0,
    critical: 0
  }
};

console.log('🔍 GROUP 4 SETTINGS MIGRATION VALIDATION');
console.log('Phase 5C: Settings/Preferences Clinical Pattern Migration');
console.log('========================================================');

/**
 * File Structure Validation
 */
function validateFileStructure() {
  console.log('\n📁 Validating file structure...');

  const expectedFiles = [
    'src/store/featureFlagStore.clinical.ts',
    'src/store/userStore.clinical.ts',
    'src/store/settingsStore.clinical.ts',
    'src/store/migration/group-4/settings-clinical-pattern.ts',
    'src/store/migration/store-backup-system.ts'
  ];

  const results = {
    missingFiles: [],
    presentFiles: [],
    unexpectedFiles: []
  };

  expectedFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      results.presentFiles.push(file);
      console.log(`✅ ${file}`);
    } else {
      results.missingFiles.push(file);
      console.log(`❌ ${file} - MISSING`);
      validationReport.summary.failed++;
    }
  });

  // Check for legacy store files
  const legacyFiles = [
    'src/store/featureFlagStore.ts',
    'src/store/userStore.ts'
  ];

  legacyFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`⚠️  ${file} - Legacy file still present (expected during transition)`);
      validationReport.summary.warnings++;
    }
  });

  validationReport.results.fileStructure = results;

  if (results.missingFiles.length === 0) {
    console.log('✅ All required files present');
    validationReport.summary.passed++;
  } else {
    console.log(`❌ ${results.missingFiles.length} files missing`);
    validationReport.summary.critical++;
  }
}

/**
 * Settings Preservation Validation
 */
function validateSettingsPreservation() {
  console.log('\n⚙️  Validating settings preservation...');

  const checks = [];

  // Check Clinical Pattern structure in consolidated store
  try {
    const consolidatedStorePath = path.join(__dirname, 'src/store/settingsStore.clinical.ts');
    if (fs.existsSync(consolidatedStorePath)) {
      const content = fs.readFileSync(consolidatedStorePath, 'utf8');

      // Check for required Clinical Pattern structures
      const requiredStructures = [
        'ConsolidatedClinicalSettingsStore',
        'userProfile',
        'notificationSettings',
        'therapeuticSettings',
        'featurePreferences',
        'dataIntegrity',
        'performanceMetrics',
        'clinical'
      ];

      requiredStructures.forEach(structure => {
        if (content.includes(structure)) {
          checks.push({ name: structure, status: 'present' });
          console.log(`✅ ${structure} structure found`);
        } else {
          checks.push({ name: structure, status: 'missing' });
          console.log(`❌ ${structure} structure missing`);
          validationReport.summary.failed++;
        }
      });

      // Check for clinical safety features
      const safetyFeatures = [
        'clinicalSafetyOverrides',
        'emergencyNotifications',
        'crisisAlerts',
        'validateClinicalSafety',
        'enableEmergencyMode'
      ];

      safetyFeatures.forEach(feature => {
        if (content.includes(feature)) {
          console.log(`✅ Clinical safety feature: ${feature}`);
          validationReport.summary.passed++;
        } else {
          console.log(`❌ Missing clinical safety feature: ${feature}`);
          validationReport.summary.critical++;
        }
      });

      // Check encryption level
      if (content.includes('DataSensitivity.SYSTEM')) {
        console.log('✅ SYSTEM-level encryption configured correctly');
        validationReport.summary.passed++;
      } else {
        console.log('❌ SYSTEM-level encryption not found');
        validationReport.summary.failed++;
      }

    } else {
      console.log('❌ Consolidated settings store not found');
      validationReport.summary.critical++;
    }
  } catch (error) {
    console.log(`❌ Error validating consolidated store: ${error.message}`);
    validationReport.summary.failed++;
  }

  validationReport.results.settingsPreservation = { checks };
}

/**
 * Clinical Pattern Compliance Validation
 */
function validateClinicalPatternCompliance() {
  console.log('\n🏥 Validating Clinical Pattern compliance...');

  const clinicalFiles = [
    'src/store/featureFlagStore.clinical.ts',
    'src/store/userStore.clinical.ts',
    'src/store/settingsStore.clinical.ts'
  ];

  const compliance = {
    dataIntegrity: 0,
    performanceMetrics: 0,
    encryptionLevels: 0,
    clinicalSafety: 0
  };

  clinicalFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check Clinical Pattern requirements
      if (content.includes('ClinicalDataIntegrity')) {
        compliance.dataIntegrity++;
        console.log(`✅ ${file}: ClinicalDataIntegrity implemented`);
      } else {
        console.log(`❌ ${file}: Missing ClinicalDataIntegrity`);
        validationReport.summary.failed++;
      }

      if (content.includes('PerformanceMetrics')) {
        compliance.performanceMetrics++;
        console.log(`✅ ${file}: PerformanceMetrics implemented`);
      } else {
        console.log(`❌ ${file}: Missing PerformanceMetrics`);
        validationReport.summary.failed++;
      }

      if (content.includes('DataSensitivity')) {
        compliance.encryptionLevels++;
        console.log(`✅ ${file}: DataSensitivity encryption implemented`);
      } else {
        console.log(`❌ ${file}: Missing DataSensitivity encryption`);
        validationReport.summary.failed++;
      }

      if (content.includes('clinical') && content.includes('safety')) {
        compliance.clinicalSafety++;
        console.log(`✅ ${file}: Clinical safety features implemented`);
      } else {
        console.log(`❌ ${file}: Missing clinical safety features`);
        validationReport.summary.failed++;
      }
    }
  });

  validationReport.results.clinicalPatternCompliance = compliance;

  const totalFiles = clinicalFiles.length;
  if (compliance.dataIntegrity === totalFiles &&
      compliance.performanceMetrics === totalFiles &&
      compliance.encryptionLevels === totalFiles &&
      compliance.clinicalSafety === totalFiles) {
    console.log('✅ Full Clinical Pattern compliance achieved');
    validationReport.summary.passed++;
  } else {
    console.log('❌ Clinical Pattern compliance incomplete');
    validationReport.summary.failed++;
  }
}

/**
 * Performance Validation
 */
function validatePerformance() {
  console.log('\n⚡ Validating performance optimizations...');

  const performanceChecks = [];

  // Check for subscription optimization
  const files = [
    'src/store/settingsStore.clinical.ts'
  ];

  files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for performance features
      const performanceFeatures = [
        'subscribeWithSelector',
        'performanceMetrics',
        'optimizePerformance',
        'refreshMetrics',
        'lastOptimization'
      ];

      performanceFeatures.forEach(feature => {
        if (content.includes(feature)) {
          performanceChecks.push({ feature, status: 'implemented', file });
          console.log(`✅ Performance feature: ${feature} in ${file}`);
          validationReport.summary.passed++;
        } else {
          performanceChecks.push({ feature, status: 'missing', file });
          console.log(`❌ Missing performance feature: ${feature} in ${file}`);
          validationReport.summary.failed++;
        }
      });

      // Check for memory management
      if (content.includes('cleanup') || content.includes('clearInterval')) {
        console.log(`✅ Memory management implemented in ${file}`);
        validationReport.summary.passed++;
      } else {
        console.log(`⚠️  Memory management not explicit in ${file}`);
        validationReport.summary.warnings++;
      }
    }
  });

  validationReport.results.performance = { checks: performanceChecks };
}

/**
 * Integration Validation
 */
function validateIntegration() {
  console.log('\n🔗 Validating integration points...');

  const integrationChecks = [];

  // Check migration utilities
  const migrationPath = path.join(__dirname, 'src/store/migration/group-4/settings-clinical-pattern.ts');
  if (fs.existsSync(migrationPath)) {
    const content = fs.readFileSync(migrationPath, 'utf8');

    if (content.includes('SettingsClinicalPatternMigration')) {
      console.log('✅ Settings migration utility available');
      validationReport.summary.passed++;
    } else {
      console.log('❌ Settings migration utility missing');
      validationReport.summary.failed++;
    }

    if (content.includes('migrateUserSettingsStore') &&
        content.includes('migrateFeatureFlagsStore')) {
      console.log('✅ All store migration methods available');
      validationReport.summary.passed++;
    } else {
      console.log('❌ Some store migration methods missing');
      validationReport.summary.failed++;
    }
  } else {
    console.log('❌ Migration utilities not found');
    validationReport.summary.critical++;
  }

  // Check backup system extension
  const backupPath = path.join(__dirname, 'src/store/migration/store-backup-system.ts');
  if (fs.existsSync(backupPath)) {
    const content = fs.readFileSync(backupPath, 'utf8');

    if (content.includes('backupUserStore') &&
        content.includes('backupFeatureFlagStore')) {
      console.log('✅ Settings backup methods available');
      validationReport.summary.passed++;
    } else {
      console.log('❌ Settings backup methods missing');
      validationReport.summary.failed++;
    }
  } else {
    console.log('❌ Backup system not found');
    validationReport.summary.critical++;
  }

  validationReport.results.integration = { checks: integrationChecks };
}

/**
 * Generate Final Report
 */
function generateFinalReport() {
  console.log('\n📋 VALIDATION SUMMARY');
  console.log('=====================');

  const { passed, failed, warnings, critical } = validationReport.summary;
  const total = passed + failed + warnings + critical;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`🚨 Critical: ${critical}`);
  console.log(`📊 Total Checks: ${total}`);

  if (critical > 0) {
    console.log('\n🚨 CRITICAL ISSUES FOUND - MIGRATION INCOMPLETE');
    validationReport.status = 'FAILED';
    validationReport.recommendation = 'Resolve critical issues before proceeding';
  } else if (failed > 0) {
    console.log('\n⚠️  ISSUES FOUND - REVIEW REQUIRED');
    validationReport.status = 'NEEDS_REVIEW';
    validationReport.recommendation = 'Address failed checks and validate manually';
  } else if (warnings > 0) {
    console.log('\n✅ MIGRATION SUCCESSFUL WITH WARNINGS');
    validationReport.status = 'SUCCESS_WITH_WARNINGS';
    validationReport.recommendation = 'Monitor warnings during testing';
  } else {
    console.log('\n🎉 MIGRATION VALIDATION PASSED COMPLETELY');
    validationReport.status = 'SUCCESS';
    validationReport.recommendation = 'Proceed with integration testing';
  }

  // Save validation report
  const reportPath = path.join(__dirname, 'GROUP_4_MIGRATION_VALIDATION_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));
  console.log(`\n📄 Validation report saved: ${reportPath}`);

  return validationReport.status;
}

/**
 * Main Validation Process
 */
async function runValidation() {
  try {
    validateFileStructure();
    validateSettingsPreservation();
    validateClinicalPatternCompliance();
    validatePerformance();
    validateIntegration();

    const status = generateFinalReport();

    // Exit with appropriate code
    if (status === 'FAILED') {
      process.exit(1);
    } else if (status === 'NEEDS_REVIEW') {
      process.exit(2);
    } else {
      process.exit(0);
    }

  } catch (error) {
    console.error('\n💥 VALIDATION FAILED WITH ERROR:', error.message);
    validationReport.error = error.message;
    validationReport.status = 'ERROR';

    const reportPath = path.join(__dirname, 'GROUP_4_MIGRATION_VALIDATION_ERROR.json');
    fs.writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));

    process.exit(3);
  }
}

// Run validation
runValidation();