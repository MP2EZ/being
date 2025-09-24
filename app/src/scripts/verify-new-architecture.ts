#!/usr/bin/env ts-node

/**
 * Being. MBCT App - New Architecture Verification Script
 *
 * This script performs comprehensive verification that React Native New Architecture
 * is properly enabled and meets clinical performance requirements.
 *
 * Usage: npx ts-node src/scripts/verify-new-architecture.ts
 */

import NewArchPerformanceValidator from '../utils/NewArchPerformanceValidator';
import {
  detectFabricRenderer,
  detectTurboModules,
  detectHermesEngine,
  detectJSEngine
} from '../utils/architecture-detection';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message: string, color: string = COLORS.white): void {
  console.log(`${color}${message}${COLORS.reset}`);
}

function logSuccess(message: string): void {
  log(`✅ ${message}`, COLORS.green);
}

function logError(message: string): void {
  log(`❌ ${message}`, COLORS.red);
}

function logWarning(message: string): void {
  log(`⚠️  ${message}`, COLORS.yellow);
}

function logInfo(message: string): void {
  log(`ℹ️  ${message}`, COLORS.blue);
}

function logHeader(message: string): void {
  log(`\n${COLORS.bright}${COLORS.cyan}=== ${message} ===${COLORS.reset}`);
}

async function verifyNewArchitecture(): Promise<void> {
  logHeader('Being. MBCT App - New Architecture Verification');

  log('\n🏗️ Phase 4 Critical: New Architecture Verification for Being. MBCT App');
  log('📱 React Native 0.81.4 + Expo SDK 54 + React 19.1.0');
  log('🎯 Target: Clinical-grade performance with New Architecture');

  // Step 1: Basic Architecture Detection
  logHeader('Step 1: Architecture Feature Detection');

  const fabric = detectFabricRenderer();
  const turboModules = detectTurboModules();
  const hermes = detectHermesEngine();
  const jsEngine = detectJSEngine();
  const newArchDetected = fabric || turboModules;

  log('\n📊 Architecture Analysis:');

  if (fabric) {
    logSuccess(`Fabric Renderer: ENABLED`);
    logInfo('  • Fabric provides improved UI thread performance');
    logInfo('  • Better concurrent rendering for therapeutic timing');
    logInfo('  • Enhanced crisis button response capabilities');
  } else {
    logError(`Fabric Renderer: DISABLED`);
    logWarning('  • Missing improved UI thread performance');
    logWarning('  • Crisis button response may be slower');
  }

  if (turboModules) {
    logSuccess(`TurboModules: ENABLED`);
    logInfo('  • Reduced JavaScript bridge overhead');
    logInfo('  • Improved assessment scoring performance');
    logInfo('  • Better data encryption capabilities');
  } else {
    logError(`TurboModules: DISABLED`);
    logWarning('  • Higher JavaScript bridge overhead');
    logWarning('  • Assessment transitions may be slower');
  }

  if (hermes) {
    logSuccess(`Hermes Engine: ACTIVE`);
    logInfo('  • Faster app startup for crisis access');
    logInfo('  • Better memory management for stability');
    logInfo('  • Optimized bytecode execution');
  } else {
    logError(`Hermes Engine: INACTIVE`);
    logWarning('  • Slower app startup times');
    logWarning('  • Higher memory usage');
  }

  log(`\n🔧 JavaScript Engine: ${jsEngine.toUpperCase()}`);

  if (newArchDetected) {
    logSuccess('🏗️ NEW ARCHITECTURE: DETECTED AND ACTIVE');
    logInfo('  • Being. app is running with React Native New Architecture');
    logInfo('  • Ready for clinical performance validation');
  } else {
    logError('🏗️ NEW ARCHITECTURE: NOT DETECTED');
    logError('  • Being. app is using Legacy Architecture');
    logError('  • CRITICAL: New Architecture required for clinical deployment');
    return;
  }

  // Step 2: Clinical Performance Validation
  logHeader('Step 2: Clinical Performance Validation');

  log('\n🧪 Running clinical-grade performance tests...');

  try {
    const validator = NewArchPerformanceValidator.getInstance();
    const validation = await validator.validateNewArchitecturePerformance();

    log('\n📈 Performance Test Results:');

    validation.performanceTests.forEach(test => {
      if (test.passed) {
        logSuccess(`${test.testName}: ${test.measured}ms (target: ${test.target}ms)`);
        if (test.clinicalImpact === 'critical') {
          logInfo(`  • CRITICAL: ${test.requirement}`);
        }
      } else {
        logError(`${test.testName}: ${test.measured}ms (target: ${test.target}ms)`);
        logError(`  • FAILED: ${test.requirement}`);
        logError(`  • Clinical Impact: ${test.clinicalImpact.toUpperCase()}`);
      }
    });

    // Overall Compliance Assessment
    logHeader('Step 3: Clinical Compliance Assessment');

    log(`\n🏥 Clinical Compliance Status: ${validation.clinicalCompliance.toUpperCase()}`);

    switch (validation.clinicalCompliance) {
      case 'compliant':
        logSuccess('ALL CLINICAL REQUIREMENTS MET');
        logSuccess('✅ Ready for therapeutic deployment');
        logInfo('  • Crisis response timing: ACCEPTABLE');
        logInfo('  • Breathing animation performance: THERAPEUTIC GRADE');
        logInfo('  • Assessment flow timing: CLINICALLY APPROPRIATE');
        break;

      case 'warning':
        logWarning('CORE REQUIREMENTS MET WITH OPTIMIZATIONS NEEDED');
        logWarning('⚠️  Ready for beta testing with monitoring');
        logInfo('  • Critical safety features: FUNCTIONAL');
        logInfo('  • Performance optimizations: RECOMMENDED');
        break;

      case 'non-compliant':
        logError('CRITICAL PERFORMANCE ISSUES DETECTED');
        logError('❌ NOT READY for clinical deployment');
        logError('  • Safety-critical features: AT RISK');
        logError('  • Performance requirements: NOT MET');
        break;
    }

    // Recommendations
    if (validation.recommendations.length > 0) {
      logHeader('Step 4: Performance Recommendations');

      log('\n📋 Recommendations for Optimization:');
      validation.recommendations.forEach((rec, index) => {
        if (rec.includes('CRITICAL')) {
          logError(`${index + 1}. ${rec}`);
        } else if (rec.includes('HIGH')) {
          logWarning(`${index + 1}. ${rec}`);
        } else if (rec.includes('✅')) {
          logSuccess(`${index + 1}. ${rec}`);
        } else {
          logInfo(`${index + 1}. ${rec}`);
        }
      });
    }

    // Final Assessment
    logHeader('Final Assessment');

    if (validation.overallPassed && newArchDetected) {
      logSuccess('🎉 NEW ARCHITECTURE VERIFICATION: COMPLETE');
      logSuccess('✅ Being. MBCT App meets all clinical performance requirements');
      logSuccess('🚀 Ready for Phase 4 continuation and clinical validation');

      log('\n📊 Summary:');
      logInfo(`  • New Architecture: ENABLED (Fabric: ${fabric ? 'Yes' : 'No'}, TurboModules: ${turboModules ? 'Yes' : 'No'})`);
      logInfo(`  • JavaScript Engine: ${jsEngine.toUpperCase()}`);
      logInfo(`  • Performance Tests: ${validation.performanceTests.filter(t => t.passed).length}/${validation.performanceTests.length} PASSED`);
      logInfo(`  • Clinical Compliance: ${validation.clinicalCompliance.toUpperCase()}`);
      logInfo('  • Crisis Response: READY');
      logInfo('  • Therapeutic Timing: VALIDATED');

    } else {
      logError('❌ NEW ARCHITECTURE VERIFICATION: FAILED');
      logError('🛑 Being. MBCT App requires optimization before clinical deployment');

      if (!newArchDetected) {
        logError('  • CRITICAL: New Architecture not detected');
      }

      const failedTests = validation.performanceTests.filter(t => !t.passed);
      if (failedTests.length > 0) {
        logError(`  • PERFORMANCE: ${failedTests.length} tests failed`);
      }
    }

    // Export detailed report
    const report = validator.exportValidationReport(validation);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `/tmp/being-new-arch-validation-${timestamp}.md`;

    try {
      require('fs').writeFileSync(reportPath, report);
      logInfo(`\n📄 Detailed report exported: ${reportPath}`);
    } catch (error) {
      logWarning('Could not export detailed report to file');
    }

  } catch (error) {
    logError('Performance validation failed:');
    logError(error instanceof Error ? error.message : 'Unknown error');
  }
}

// Execute verification if run directly
if (require.main === module) {
  verifyNewArchitecture().catch(error => {
    logError('Verification script failed:');
    logError(error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  });
}

export { verifyNewArchitecture };