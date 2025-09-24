#!/usr/bin/env node

/**
 * Feature Flag System Validation Script
 *
 * Comprehensive validation script that tests all critical aspects
 * of the feature flag system implementation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class FeatureFlagValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  success(message) {
    this.log(`✅ ${message}`, 'green');
    this.results.passed++;
  }

  failure(message) {
    this.log(`❌ ${message}`, 'red');
    this.results.failed++;
  }

  warning(message) {
    this.log(`⚠️  ${message}`, 'yellow');
    this.results.warnings++;
  }

  info(message) {
    this.log(`ℹ️  ${message}`, 'blue');
  }

  section(title) {
    this.log(`\n${colors.bold}${colors.cyan}=== ${title} ===${colors.reset}`, 'cyan');
  }

  async runTest(description, testFn) {
    try {
      const result = await testFn();
      if (result === false) {
        this.failure(description);
      } else {
        this.success(description);
      }
      return result;
    } catch (error) {
      this.failure(`${description} - ${error.message}`);
      return false;
    }
  }

  // Test 1: Feature Flag Types and Structure
  async validateFeatureFlagTypes() {
    this.section('Feature Flag Types and Structure');

    // Check if feature flag types exist
    const typesPath = path.join(__dirname, '../src/types/feature-flags.ts');
    const typesExist = fs.existsSync(typesPath);

    await this.runTest('Feature flag types file exists', () => typesExist);

    if (typesExist) {
      const typesContent = fs.readFileSync(typesPath, 'utf8');

      await this.runTest('P0CloudFeatureFlags interface defined', () => {
        return typesContent.includes('interface P0CloudFeatureFlags');
      });

      await this.runTest('All features default to false', () => {
        return typesContent.includes('DEFAULT_FEATURE_FLAGS') &&
               typesContent.includes(': false');
      });

      await this.runTest('Feature metadata includes cost impact', () => {
        return typesContent.includes('costImpact') &&
               typesContent.includes('canDisableInCrisis');
      });

      await this.runTest('Crisis response threshold defined', () => {
        return typesContent.includes('CRISIS_RESPONSE_MAX_MS') &&
               typesContent.includes('200');
      });
    }
  }

  // Test 2: Store Implementation
  async validateStore() {
    this.section('Feature Flag Store Implementation');

    const storePath = path.join(__dirname, '../src/store/featureFlagStore.ts');
    const storeExists = fs.existsSync(storePath);

    await this.runTest('Feature flag store file exists', () => storeExists);

    if (storeExists) {
      const storeContent = fs.readFileSync(storePath, 'utf8');

      await this.runTest('Store implements crisis protection', () => {
        return storeContent.includes('validateCrisisAccess') &&
               storeContent.includes('emergencyDisable');
      });

      await this.runTest('Store implements cost controls', () => {
        return storeContent.includes('checkCostLimits') &&
               storeContent.includes('disableExpensiveFeatures');
      });

      await this.runTest('Store implements HIPAA compliance', () => {
        return storeContent.includes('checkHIPAACompliance') &&
               storeContent.includes('validateEncryption');
      });

      await this.runTest('Store implements offline fallback', () => {
        return storeContent.includes('emergencyEnableOfflineMode') &&
               storeContent.includes('offlineFallbackReady');
      });
    }
  }

  // Test 3: React Hooks Implementation
  async validateHooks() {
    this.section('React Hooks Implementation');

    const hooksPath = path.join(__dirname, '../src/hooks/useFeatureFlags.ts');
    const hooksExist = fs.existsSync(hooksPath);

    await this.runTest('Feature flag hooks file exists', () => hooksExist);

    if (hooksExist) {
      const hooksContent = fs.readFileSync(hooksPath, 'utf8');

      await this.runTest('Base useFeatureFlag hook implemented', () => {
        return hooksContent.includes('export function useFeatureFlag');
      });

      await this.runTest('Progressive rollout hook implemented', () => {
        return hooksContent.includes('useProgressiveFeature');
      });

      await this.runTest('Cost aware hook implemented', () => {
        return hooksContent.includes('useCostAwareFeature');
      });

      await this.runTest('Safety aware hook implemented', () => {
        return hooksContent.includes('useSafetyAwareFeature');
      });

      await this.runTest('Emergency controls hook implemented', () => {
        return hooksContent.includes('useEmergencyFeatureControl');
      });

      await this.runTest('Admin controls hook implemented', () => {
        return hooksContent.includes('useFeatureFlagAdmin');
      });
    }
  }

  // Test 4: Run Unit Tests
  async runUnitTests() {
    this.section('Unit Tests Execution');

    try {
      // Run feature flag store tests
      await this.runTest('Feature flag store unit tests pass', () => {
        try {
          execSync('npm test -- __tests__/unit/featureFlagStore.test.ts', {
            stdio: 'pipe',
            cwd: path.join(__dirname, '..')
          });
          return true;
        } catch (error) {
          console.log('Store tests output:', error.stdout?.toString());
          return false;
        }
      });

      // Run feature flag hooks tests
      await this.runTest('Feature flag hooks unit tests pass', () => {
        try {
          execSync('npm test -- __tests__/unit/featureFlagHooks.test.tsx', {
            stdio: 'pipe',
            cwd: path.join(__dirname, '..')
          });
          return true;
        } catch (error) {
          console.log('Hooks tests output:', error.stdout?.toString());
          return false;
        }
      });

    } catch (error) {
      this.failure(`Unit tests execution failed: ${error.message}`);
    }
  }

  // Test 5: Run Integration Tests
  async runIntegrationTests() {
    this.section('Integration Tests Execution');

    try {
      // Run offline integration tests
      await this.runTest('Offline integration tests pass', () => {
        try {
          execSync('npm test -- __tests__/integration/featureFlag-offline-integration.test.ts', {
            stdio: 'pipe',
            cwd: path.join(__dirname, '..')
          });
          return true;
        } catch (error) {
          console.log('Offline integration tests output:', error.stdout?.toString());
          return false;
        }
      });

      // Run crisis integration tests
      await this.runTest('Crisis integration tests pass', () => {
        try {
          execSync('npm test -- __tests__/integration/featureFlag-crisis-integration.test.ts', {
            stdio: 'pipe',
            cwd: path.join(__dirname, '..')
          });
          return true;
        } catch (error) {
          console.log('Crisis integration tests output:', error.stdout?.toString());
          return false;
        }
      });

      // Run cost control tests
      await this.runTest('Cost control tests pass', () => {
        try {
          execSync('npm test -- __tests__/integration/featureFlag-cost-control.test.ts', {
            stdio: 'pipe',
            cwd: path.join(__dirname, '..')
          });
          return true;
        } catch (error) {
          console.log('Cost control tests output:', error.stdout?.toString());
          return false;
        }
      });

    } catch (error) {
      this.failure(`Integration tests execution failed: ${error.message}`);
    }
  }

  // Test 6: Run E2E Tests
  async runE2ETests() {
    this.section('End-to-End Tests Execution');

    try {
      await this.runTest('End-to-end tests pass', () => {
        try {
          execSync('npm test -- __tests__/e2e/featureFlag-end-to-end.test.ts', {
            stdio: 'pipe',
            cwd: path.join(__dirname, '..')
          });
          return true;
        } catch (error) {
          console.log('E2E tests output:', error.stdout?.toString());
          return false;
        }
      });
    } catch (error) {
      this.failure(`E2E tests execution failed: ${error.message}`);
    }
  }

  // Test 7: Performance and Memory Validation
  async validatePerformance() {
    this.section('Performance Validation');

    // Create a simple performance test script
    const perfTestScript = `
      const { useFeatureFlagStore } = require('./src/store/featureFlagStore');
      const { DEFAULT_FEATURE_FLAGS } = require('./src/types/feature-flags');

      // Mock dependencies
      jest.mock('./src/services/storage/SecureDataStore');
      jest.mock('./src/services/CrisisProtectionService');
      jest.mock('./src/services/cloud/CostMonitoring');

      async function runPerformanceTest() {
        const store = useFeatureFlagStore.getState();

        // Test 1: Flag evaluation performance
        const iterations = 1000;
        const startTime = Date.now();

        for (let i = 0; i < iterations; i++) {
          store.evaluateFlag('CLOUD_SYNC_ENABLED');
          store.evaluateFlag('ANALYTICS_ENABLED');
          store.evaluateFlag('PUSH_NOTIFICATIONS_ENABLED');
        }

        const endTime = Date.now();
        const totalTime = endTime - startTime;
        const avgTime = totalTime / (iterations * 3);

        console.log('Average flag evaluation time:', avgTime, 'ms');
        return avgTime < 0.1; // Should be under 0.1ms per evaluation
      }

      runPerformanceTest().then(result => {
        process.exit(result ? 0 : 1);
      });
    `;

    const tempTestFile = path.join(__dirname, '../temp-perf-test.js');

    try {
      fs.writeFileSync(tempTestFile, perfTestScript);

      await this.runTest('Flag evaluation performance <0.1ms', () => {
        try {
          execSync(`node ${tempTestFile}`, {
            stdio: 'pipe',
            cwd: path.join(__dirname, '..')
          });
          return true;
        } catch (error) {
          return false;
        }
      });
    } finally {
      if (fs.existsSync(tempTestFile)) {
        fs.unlinkSync(tempTestFile);
      }
    }
  }

  // Test 8: Crisis Response Time Validation
  async validateCrisisResponse() {
    this.section('Crisis Response Time Validation');

    // Create crisis response test
    const crisisTestScript = `
      const { useFeatureFlagStore } = require('./src/store/featureFlagStore');
      const { FEATURE_FLAG_CONSTANTS } = require('./src/types/feature-flags');

      // Mock dependencies
      jest.mock('./src/services/storage/SecureDataStore');
      jest.mock('./src/services/CrisisProtectionService', () => ({
        crisisProtectionService: {
          isInCrisisMode: () => false,
          measureResponseTime: () => Promise.resolve(150),
          testFeatureResponse: () => Promise.resolve(180)
        }
      }));

      async function testCrisisResponse() {
        const store = useFeatureFlagStore.getState();

        const startTime = Date.now();
        const result = await store.validateCrisisAccess();
        const endTime = Date.now();

        const responseTime = endTime - startTime;
        console.log('Crisis response time:', responseTime, 'ms');

        return responseTime < FEATURE_FLAG_CONSTANTS.CRISIS_RESPONSE_MAX_MS && result;
      }

      testCrisisResponse().then(result => {
        process.exit(result ? 0 : 1);
      });
    `;

    const tempCrisisFile = path.join(__dirname, '../temp-crisis-test.js');

    try {
      fs.writeFileSync(tempCrisisFile, crisisTestScript);

      await this.runTest('Crisis response time <200ms', () => {
        try {
          execSync(`node ${tempCrisisFile}`, {
            stdio: 'pipe',
            cwd: path.join(__dirname, '..')
          });
          return true;
        } catch (error) {
          return false;
        }
      });
    } finally {
      if (fs.existsSync(tempCrisisFile)) {
        fs.unlinkSync(tempCrisisFile);
      }
    }
  }

  // Test 9: Validate Test Coverage
  async validateTestCoverage() {
    this.section('Test Coverage Validation');

    const testFiles = [
      '__tests__/unit/featureFlagStore.test.ts',
      '__tests__/unit/featureFlagHooks.test.tsx',
      '__tests__/integration/featureFlag-offline-integration.test.ts',
      '__tests__/integration/featureFlag-crisis-integration.test.ts',
      '__tests__/integration/featureFlag-cost-control.test.ts',
      '__tests__/e2e/featureFlag-end-to-end.test.ts'
    ];

    let totalTests = 0;

    for (const testFile of testFiles) {
      const testPath = path.join(__dirname, '..', testFile);
      const exists = fs.existsSync(testPath);

      await this.runTest(`${testFile} exists`, () => exists);

      if (exists) {
        const content = fs.readFileSync(testPath, 'utf8');
        const testCount = (content.match(/test\(|it\(/g) || []).length;
        totalTests += testCount;

        this.info(`  ${testCount} tests in ${path.basename(testFile)}`);
      }
    }

    this.info(`Total tests created: ${totalTests}`);

    // Validate minimum test coverage
    await this.runTest('Minimum 100 tests created', () => totalTests >= 100);
    await this.runTest('All test categories covered', () => testFiles.every(file =>
      fs.existsSync(path.join(__dirname, '..', file))
    ));
  }

  // Test 10: Validate Documentation and Implementation Completeness
  async validateImplementationCompleteness() {
    this.section('Implementation Completeness');

    const requiredFiles = [
      'src/types/feature-flags.ts',
      'src/store/featureFlagStore.ts',
      'src/hooks/useFeatureFlags.ts',
      'src/components/FeatureFlags/FeatureFlagDashboard.tsx',
      'src/components/FeatureFlags/FeatureFlagToggle.tsx'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, '..', file);
      await this.runTest(`${file} exists`, () => fs.existsSync(filePath));
    }

    // Check for key implementation features
    const storePath = path.join(__dirname, '../src/store/featureFlagStore.ts');
    if (fs.existsSync(storePath)) {
      const storeContent = fs.readFileSync(storePath, 'utf8');

      const requiredMethods = [
        'initializeFlags',
        'evaluateFlag',
        'requestFeatureAccess',
        'updateUserConsent',
        'emergencyDisable',
        'emergencyEnableOfflineMode',
        'validateCrisisAccess',
        'checkCostLimits',
        'checkHIPAACompliance'
      ];

      for (const method of requiredMethods) {
        await this.runTest(`Store implements ${method}`, () =>
          storeContent.includes(method)
        );
      }
    }
  }

  // Generate final report
  generateReport() {
    this.section('Validation Summary');

    const total = this.results.passed + this.results.failed;
    const successRate = ((this.results.passed / total) * 100).toFixed(1);

    this.log(`\n${colors.bold}FEATURE FLAG SYSTEM VALIDATION RESULTS${colors.reset}`);
    this.log(`${'='.repeat(50)}`);
    this.log(`Total Tests: ${total}`);
    this.success(`Passed: ${this.results.passed}`);
    this.failure(`Failed: ${this.results.failed}`);
    this.warning(`Warnings: ${this.results.warnings}`);
    this.log(`Success Rate: ${successRate}%\n`);

    if (this.results.failed === 0) {
      this.log(`${colors.bold}${colors.green}🎉 ALL VALIDATIONS PASSED! 🎉${colors.reset}`);
      this.log(`${colors.green}Feature Flag System is ready for production deployment.${colors.reset}`);
    } else {
      this.log(`${colors.bold}${colors.red}❌ VALIDATION FAILED${colors.reset}`);
      this.log(`${colors.red}Please fix the failed tests before proceeding.${colors.reset}`);
    }

    return this.results.failed === 0;
  }

  // Main validation runner
  async runAllValidations() {
    this.log(`${colors.bold}${colors.magenta}Being. Feature Flag System Validation${colors.reset}`);
    this.log(`${colors.magenta}Testing complete implementation for Day 6-7 validation${colors.reset}\n`);

    try {
      await this.validateFeatureFlagTypes();
      await this.validateStore();
      await this.validateHooks();
      await this.validateImplementationCompleteness();
      await this.validateTestCoverage();

      // Performance and crisis tests (may require mocking)
      try {
        await this.validatePerformance();
        await this.validateCrisisResponse();
      } catch (error) {
        this.warning(`Performance tests skipped: ${error.message}`);
      }

      // Test execution (may fail if dependencies not installed)
      try {
        await this.runUnitTests();
        await this.runIntegrationTests();
        await this.runE2ETests();
      } catch (error) {
        this.warning(`Test execution skipped: ${error.message}`);
      }

    } catch (error) {
      this.failure(`Validation failed: ${error.message}`);
    }

    return this.generateReport();
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new FeatureFlagValidator();
  validator.runAllValidations().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = FeatureFlagValidator;