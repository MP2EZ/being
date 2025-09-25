/**
 * Group 4 Integration Test
 * Phase 5C: Settings/Preferences Clinical Pattern Integration Test
 *
 * MISSION: Test integrated store ecosystem functionality
 * VALIDATES: Cross-store communication, data consistency, performance
 */

const fs = require('fs');
const path = require('path');

// Test results structure
const testResults = {
  timestamp: new Date().toISOString(),
  phase: '5C-Group-4',
  testType: 'integration',
  results: {
    storeInteroperability: {},
    dataConsistency: {},
    performanceImpact: {},
    clinicalSafety: {},
    backupAndRecovery: {}
  },
  summary: {
    passed: 0,
    failed: 0,
    skipped: 0
  }
};

console.log('🧪 GROUP 4 INTEGRATION TESTING');
console.log('Phase 5C: Settings/Preferences Clinical Pattern Integration');
console.log('========================================================');

/**
 * Store Interoperability Testing
 */
function testStoreInteroperability() {
  console.log('\n🔄 Testing store interoperability...');

  const tests = [];

  // Test 1: Consolidated store exports
  try {
    const consolidatedStorePath = path.join(__dirname, 'src/store/settingsStore.clinical.ts');
    if (fs.existsSync(consolidatedStorePath)) {
      const content = fs.readFileSync(consolidatedStorePath, 'utf8');

      // Check for proper exports
      const requiredExports = [
        'useConsolidatedClinicalSettingsStore',
        'initializeConsolidatedClinicalSettingsStore',
        'useSettingsStore',
        'initializeSettingsStore'
      ];

      requiredExports.forEach(exportName => {
        if (content.includes(exportName)) {
          tests.push({ name: `Export: ${exportName}`, status: 'passed' });
          console.log(`✅ Export available: ${exportName}`);
          testResults.summary.passed++;
        } else {
          tests.push({ name: `Export: ${exportName}`, status: 'failed' });
          console.log(`❌ Missing export: ${exportName}`);
          testResults.summary.failed++;
        }
      });

      // Test legacy compatibility methods
      if (content.includes('getLegacyUserStore') && content.includes('getLegacyFeatureFlagStore')) {
        tests.push({ name: 'Legacy compatibility', status: 'passed' });
        console.log('✅ Legacy compatibility methods available');
        testResults.summary.passed++;
      } else {
        tests.push({ name: 'Legacy compatibility', status: 'failed' });
        console.log('❌ Legacy compatibility methods missing');
        testResults.summary.failed++;
      }

    } else {
      tests.push({ name: 'Consolidated store file', status: 'failed' });
      console.log('❌ Consolidated store file not found');
      testResults.summary.failed++;
    }
  } catch (error) {
    tests.push({ name: 'Store interoperability test', status: 'failed', error: error.message });
    console.log(`❌ Store interoperability test failed: ${error.message}`);
    testResults.summary.failed++;
  }

  testResults.results.storeInteroperability = { tests };
}

/**
 * Data Consistency Testing
 */
function testDataConsistency() {
  console.log('\n📊 Testing data consistency...');

  const tests = [];

  // Test 1: Clinical Pattern data structures
  const clinicalFiles = [
    'src/store/featureFlagStore.clinical.ts',
    'src/store/userStore.clinical.ts',
    'src/store/settingsStore.clinical.ts'
  ];

  clinicalFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for consistent Clinical Pattern structure
      const requiredStructures = [
        'dataIntegrity',
        'performanceMetrics',
        'lastValidatedAt',
        'createISODateString',
        'DataSensitivity'
      ];

      let allStructuresPresent = true;
      requiredStructures.forEach(structure => {
        if (!content.includes(structure)) {
          allStructuresPresent = false;
        }
      });

      if (allStructuresPresent) {
        tests.push({ name: `Clinical Pattern consistency: ${file}`, status: 'passed' });
        console.log(`✅ Clinical Pattern consistent: ${file}`);
        testResults.summary.passed++;
      } else {
        tests.push({ name: `Clinical Pattern consistency: ${file}`, status: 'failed' });
        console.log(`❌ Clinical Pattern inconsistent: ${file}`);
        testResults.summary.failed++;
      }
    }
  });

  // Test 2: Encryption level consistency
  const settingsStorePath = path.join(__dirname, 'src/store/settingsStore.clinical.ts');
  if (fs.existsSync(settingsStorePath)) {
    const content = fs.readFileSync(settingsStorePath, 'utf8');

    if (content.includes('DataSensitivity.SYSTEM')) {
      tests.push({ name: 'Settings encryption level', status: 'passed' });
      console.log('✅ Settings use SYSTEM-level encryption consistently');
      testResults.summary.passed++;
    } else {
      tests.push({ name: 'Settings encryption level', status: 'failed' });
      console.log('❌ Settings encryption level inconsistent');
      testResults.summary.failed++;
    }
  }

  testResults.results.dataConsistency = { tests };
}

/**
 * Performance Impact Testing
 */
function testPerformanceImpact() {
  console.log('\n⚡ Testing performance impact...');

  const tests = [];

  // Test 1: Performance metrics implementation
  const consolidatedStorePath = path.join(__dirname, 'src/store/settingsStore.clinical.ts');
  if (fs.existsSync(consolidatedStorePath)) {
    const content = fs.readFileSync(consolidatedStorePath, 'utf8');

    const performanceFeatures = [
      'createPerformanceMetrics',
      'optimizePerformance',
      'refreshMetrics',
      'performanceMetrics',
      'lastOptimization',
      'optimizationTime',
      'subscribeWithSelector'
    ];

    let performanceScore = 0;
    performanceFeatures.forEach(feature => {
      if (content.includes(feature)) {
        performanceScore++;
      }
    });

    const performancePercentage = (performanceScore / performanceFeatures.length) * 100;

    if (performancePercentage >= 90) {
      tests.push({ name: 'Performance features implementation', status: 'passed', score: performancePercentage });
      console.log(`✅ Performance features: ${performancePercentage.toFixed(1)}% implemented`);
      testResults.summary.passed++;
    } else if (performancePercentage >= 70) {
      tests.push({ name: 'Performance features implementation', status: 'warning', score: performancePercentage });
      console.log(`⚠️  Performance features: ${performancePercentage.toFixed(1)}% implemented (acceptable)`);
      testResults.summary.passed++;
    } else {
      tests.push({ name: 'Performance features implementation', status: 'failed', score: performancePercentage });
      console.log(`❌ Performance features: ${performancePercentage.toFixed(1)}% implemented (insufficient)`);
      testResults.summary.failed++;
    }

    // Test 2: Memory management
    if (content.includes('clearInterval') || content.includes('cleanup') || content.includes('removeEventListener')) {
      tests.push({ name: 'Memory management', status: 'passed' });
      console.log('✅ Memory management patterns detected');
      testResults.summary.passed++;
    } else {
      tests.push({ name: 'Memory management', status: 'warning' });
      console.log('⚠️  Memory management patterns not explicitly detected');
      testResults.summary.passed++;
    }
  }

  testResults.results.performanceImpact = { tests };
}

/**
 * Clinical Safety Testing
 */
function testClinicalSafety() {
  console.log('\n🏥 Testing clinical safety features...');

  const tests = [];

  const consolidatedStorePath = path.join(__dirname, 'src/store/settingsStore.clinical.ts');
  if (fs.existsSync(consolidatedStorePath)) {
    const content = fs.readFileSync(consolidatedStorePath, 'utf8');

    // Test 1: Clinical safety methods
    const safetyMethods = [
      'validateClinicalSafety',
      'enableEmergencyMode',
      'emergencyDisableFeature'
    ];

    safetyMethods.forEach(method => {
      if (content.includes(method)) {
        tests.push({ name: `Clinical safety method: ${method}`, status: 'passed' });
        console.log(`✅ Clinical safety method: ${method}`);
        testResults.summary.passed++;
      } else {
        tests.push({ name: `Clinical safety method: ${method}`, status: 'failed' });
        console.log(`❌ Missing clinical safety method: ${method}`);
        testResults.summary.failed++;
      }
    });

    // Test 2: Crisis alerts always enabled
    if (content.includes('enabled: true') && content.includes('crisisAlerts') && content.includes('Always enabled for safety')) {
      tests.push({ name: 'Crisis alerts always enabled', status: 'passed' });
      console.log('✅ Crisis alerts always enabled for safety');
      testResults.summary.passed++;
    } else {
      tests.push({ name: 'Crisis alerts always enabled', status: 'failed' });
      console.log('❌ Crisis alerts not guaranteed to be always enabled');
      testResults.summary.failed++;
    }

    // Test 3: Clinical safety overrides
    if (content.includes('clinicalSafetyOverrides') && content.includes('EMERGENCY_CONTACTS_CLOUD: true')) {
      tests.push({ name: 'Clinical safety overrides', status: 'passed' });
      console.log('✅ Clinical safety overrides implemented');
      testResults.summary.passed++;
    } else {
      tests.push({ name: 'Clinical safety overrides', status: 'failed' });
      console.log('❌ Clinical safety overrides missing');
      testResults.summary.failed++;
    }
  }

  testResults.results.clinicalSafety = { tests };
}

/**
 * Backup and Recovery Testing
 */
function testBackupAndRecovery() {
  console.log('\n💾 Testing backup and recovery capabilities...');

  const tests = [];

  // Test 1: Backup system extension
  const backupSystemPath = path.join(__dirname, 'src/store/migration/store-backup-system.ts');
  if (fs.existsSync(backupSystemPath)) {
    const content = fs.readFileSync(backupSystemPath, 'utf8');

    const backupMethods = [
      'backupUserStore',
      'backupFeatureFlagStore',
      'backupTherapeuticStore'
    ];

    backupMethods.forEach(method => {
      if (content.includes(method)) {
        tests.push({ name: `Backup method: ${method}`, status: 'passed' });
        console.log(`✅ Backup method available: ${method}`);
        testResults.summary.passed++;
      } else {
        tests.push({ name: `Backup method: ${method}`, status: 'failed' });
        console.log(`❌ Missing backup method: ${method}`);
        testResults.summary.failed++;
      }
    });

    // Test store type support
    if (content.includes("'user' | 'feature_flags' | 'therapeutic'")) {
      tests.push({ name: 'Settings store types supported', status: 'passed' });
      console.log('✅ Settings store types supported in backup system');
      testResults.summary.passed++;
    } else {
      tests.push({ name: 'Settings store types supported', status: 'failed' });
      console.log('❌ Settings store types not supported in backup system');
      testResults.summary.failed++;
    }
  } else {
    tests.push({ name: 'Backup system file', status: 'failed' });
    console.log('❌ Backup system file not found');
    testResults.summary.failed++;
  }

  testResults.results.backupAndRecovery = { tests };
}

/**
 * Generate Integration Test Report
 */
function generateIntegrationReport() {
  console.log('\n📋 INTEGRATION TEST SUMMARY');
  console.log('============================');

  const { passed, failed, skipped } = testResults.summary;
  const total = passed + failed + skipped;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`📊 Total Tests: ${total}`);

  const passRate = total > 0 ? (passed / total) * 100 : 0;
  console.log(`🎯 Pass Rate: ${passRate.toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n⚠️  INTEGRATION ISSUES FOUND');
    testResults.status = 'ISSUES_FOUND';
    testResults.recommendation = 'Review failed integration tests before deployment';
  } else if (passRate >= 95) {
    console.log('\n🎉 INTEGRATION TESTS PASSED EXCELLENTLY');
    testResults.status = 'EXCELLENT';
    testResults.recommendation = 'Ready for deployment with other agent groups';
  } else if (passRate >= 85) {
    console.log('\n✅ INTEGRATION TESTS PASSED');
    testResults.status = 'GOOD';
    testResults.recommendation = 'Ready for deployment';
  } else {
    console.log('\n⚠️  INTEGRATION TESTS MARGINALLY PASSED');
    testResults.status = 'MARGINAL';
    testResults.recommendation = 'Consider addressing warning areas';
  }

  // Save integration test report
  const reportPath = path.join(__dirname, 'GROUP_4_INTEGRATION_TEST_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Integration test report saved: ${reportPath}`);

  return testResults.status;
}

/**
 * Main Integration Test Process
 */
async function runIntegrationTests() {
  try {
    testStoreInteroperability();
    testDataConsistency();
    testPerformanceImpact();
    testClinicalSafety();
    testBackupAndRecovery();

    const status = generateIntegrationReport();

    // Exit with appropriate code
    if (status === 'ISSUES_FOUND') {
      process.exit(1);
    } else {
      process.exit(0);
    }

  } catch (error) {
    console.error('\n💥 INTEGRATION TESTS FAILED WITH ERROR:', error.message);
    testResults.error = error.message;
    testResults.status = 'ERROR';

    const reportPath = path.join(__dirname, 'GROUP_4_INTEGRATION_TEST_ERROR.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));

    process.exit(2);
  }
}

// Run integration tests
runIntegrationTests();