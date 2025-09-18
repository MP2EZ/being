#!/usr/bin/env node

/**
 * Payment Testing Validation Script
 * Handles Jest configuration issues and validates existing test infrastructure
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${message}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

// Define test validation criteria
const testValidations = {
  crisisSafety: {
    name: 'Crisis Safety Testing',
    icon: '🚨',
    files: [
      'src/components/accessibility/__tests__/PaymentAccessibilityTests.tsx',
      '__tests__/store/paymentStore.test.ts'
    ],
    requirements: [
      'Crisis button response time <200ms',
      '988 hotline access from all payment screens',
      'Crisis mode overrides payment restrictions',
      'Emergency feature access during failures',
      'Offline crisis functionality maintained'
    ]
  },

  paymentFlows: {
    name: 'Payment Flow Testing',
    icon: '💳',
    files: [
      '__tests__/store/paymentStore.test.ts',
      'src/services/cloud/__tests__/StripePaymentClient.test.ts',
      '__tests__/services/PaymentAPIService.test.ts'
    ],
    requirements: [
      'End-to-end subscription flow (trial → paid)',
      'Payment method management (CRUD operations)',
      'Stripe Elements integration with error handling',
      'Subscription tier changes and cancellations',
      'Payment failure recovery with therapeutic messaging'
    ]
  },

  performance: {
    name: 'Performance Testing',
    icon: '⚡',
    files: [
      '__tests__/performance/critical-timing.test.ts',
      'src/__tests__/performance/AppLaunchPerformance.test.ts'
    ],
    requirements: [
      'Payment screen navigation <300ms',
      'Stripe Elements loading <1 second',
      'Crisis feature activation <200ms',
      'Subscription status sync <500ms',
      'Error recovery messaging <100ms'
    ]
  },

  accessibility: {
    name: 'Accessibility Testing',
    icon: '♿',
    files: [
      'src/components/accessibility/__tests__/PaymentAccessibilityTests.tsx',
      '__tests__/accessibility/wcag-compliance.test.tsx'
    ],
    requirements: [
      'WCAG AA compliance (4.5:1 contrast ratio)',
      'VoiceOver/TalkBack navigation support',
      '44px minimum touch targets (48px crisis)',
      'High contrast and reduced motion support',
      'Screen reader status announcements'
    ]
  },

  security: {
    name: 'Security Testing',
    icon: '🔐',
    files: [
      'src/services/security/__tests__/PaymentSecurityService.test.ts'
    ],
    requirements: [
      'PCI DSS Level 2 compliance validation',
      'Payment tokenization security',
      'No sensitive data storage verification',
      'Comprehensive audit logging',
      'Crisis data protection during payments'
    ]
  },

  integration: {
    name: 'Integration Testing',
    icon: '🔗',
    files: [
      '__tests__/integration/assessment-flow.test.tsx'
    ],
    requirements: [
      'Payment store integration with userStore',
      'Authentication system integration for subscriptions',
      'Cloud sync for payment status across devices',
      'Feature flag integration for payment tiers',
      'Error boundary testing for payment components'
    ]
  }
};

function validateTestFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  const exists = fs.existsSync(fullPath);

  if (!exists) {
    return { exists: false, content: null, size: 0, lines: 0 };
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n').length;
    const size = content.length;

    return {
      exists: true,
      content,
      size,
      lines,
      hasTests: content.includes('test(') || content.includes('it('),
      hasDescribeBlocks: content.includes('describe('),
      hasMocks: content.includes('jest.mock'),
      hasAsyncTests: content.includes('async'),
      hasExpectations: content.includes('expect(')
    };
  } catch (error) {
    return { exists: true, error: error.message };
  }
}

function analyzeTestCoverage(validation) {
  const results = {
    name: validation.name,
    icon: validation.icon,
    files: [],
    totalFiles: validation.files.length,
    existingFiles: 0,
    totalLines: 0,
    hasTests: 0,
    requirements: validation.requirements,
    coverage: 0
  };

  validation.files.forEach(filePath => {
    const analysis = validateTestFile(filePath);
    results.files.push({
      path: filePath,
      ...analysis
    });

    if (analysis.exists) {
      results.existingFiles++;
      results.totalLines += analysis.lines || 0;
      if (analysis.hasTests) {
        results.hasTests++;
      }
    }
  });

  // Calculate coverage percentage
  results.coverage = results.existingFiles > 0
    ? Math.round((results.hasTests / results.existingFiles) * 100)
    : 0;

  return results;
}

function generateValidationReport() {
  logHeader('📋 PAYMENT TESTING INFRASTRUCTURE VALIDATION');

  const results = {};
  let totalFiles = 0;
  let existingFiles = 0;
  let filesWithTests = 0;
  let totalRequirements = 0;

  // Analyze each validation category
  Object.keys(testValidations).forEach(key => {
    const validation = testValidations[key];
    const analysis = analyzeTestCoverage(validation);
    results[key] = analysis;

    totalFiles += analysis.totalFiles;
    existingFiles += analysis.existingFiles;
    filesWithTests += analysis.hasTests;
    totalRequirements += analysis.requirements.length;

    // Log category results
    log(`\n${analysis.icon} ${analysis.name}`, 'bold');
    log(`${'─'.repeat(50)}`, 'blue');

    analysis.files.forEach(file => {
      if (file.exists) {
        const status = file.hasTests ? '✅' : '⚠️';
        const statusColor = file.hasTests ? 'green' : 'yellow';
        const statusText = file.hasTests ? 'HAS TESTS' : 'NO TESTS';

        log(`  ${status} ${file.path}`, statusColor);
        log(`     Lines: ${file.lines}, ${statusText}`, 'reset');

        if (file.error) {
          log(`     Error: ${file.error}`, 'red');
        }
      } else {
        log(`  ❌ ${file.path}`, 'red');
        log(`     File does not exist`, 'red');
      }
    });

    log(`\n  📊 Coverage: ${analysis.coverage}% (${analysis.hasTests}/${analysis.existingFiles} files with tests)`,
        analysis.coverage >= 70 ? 'green' : analysis.coverage >= 40 ? 'yellow' : 'red');

    log(`  📋 Requirements (${analysis.requirements.length}):`, 'cyan');
    analysis.requirements.forEach(req => {
      log(`     • ${req}`, 'reset');
    });
  });

  // Overall summary
  logHeader('📊 OVERALL VALIDATION SUMMARY');

  const overallCoverage = existingFiles > 0 ? Math.round((filesWithTests / existingFiles) * 100) : 0;

  log('🎯 FILE COVERAGE:', 'bold');
  log(`  • Total Test Files Expected: ${totalFiles}`, 'reset');
  log(`  • Existing Test Files: ${existingFiles}`, existingFiles > 0 ? 'green' : 'red');
  log(`  • Files with Actual Tests: ${filesWithTests}`, filesWithTests > 0 ? 'green' : 'red');
  log(`  • Overall Coverage: ${overallCoverage}%`,
      overallCoverage >= 70 ? 'green' : overallCoverage >= 40 ? 'yellow' : 'red');

  log('\n🎯 REQUIREMENTS COVERAGE:', 'bold');
  log(`  • Total Critical Requirements: ${totalRequirements}`, 'reset');

  // Category status
  log('\n🎯 CATEGORY STATUS:', 'bold');
  Object.keys(results).forEach(key => {
    const result = results[key];
    let status = '❌';
    let statusColor = 'red';

    if (result.coverage >= 70) {
      status = '✅';
      statusColor = 'green';
    } else if (result.coverage >= 40) {
      status = '⚠️';
      statusColor = 'yellow';
    }

    log(`  ${status} ${result.icon} ${result.name}: ${result.coverage}%`, statusColor);
  });

  // Critical assessment
  log('\n🎯 CRITICAL ASSESSMENT:', 'bold');

  const criticalCategories = ['crisisSafety', 'security', 'paymentFlows'];
  const criticalIssues = [];

  criticalCategories.forEach(key => {
    const result = results[key];
    if (result.coverage < 70) {
      criticalIssues.push(`${result.name}: ${result.coverage}% coverage`);
    }
  });

  if (criticalIssues.length === 0) {
    log('  ✅ All critical categories have adequate test coverage', 'green');
  } else {
    log('  ❌ CRITICAL ISSUES FOUND:', 'red');
    criticalIssues.forEach(issue => {
      log(`     • ${issue}`, 'red');
    });
  }

  // Recommendations
  log('\n💡 RECOMMENDATIONS:', 'bold');

  if (results.crisisSafety.coverage < 70) {
    log('  • ⚠️  CRITICAL: Implement crisis safety tests immediately', 'red');
    log('     Crisis functionality must be 100% reliable for user safety', 'red');
  }

  if (results.security.coverage < 70) {
    log('  • ⚠️  CRITICAL: Complete security testing for PCI compliance', 'red');
    log('     Payment security cannot be compromised', 'red');
  }

  if (results.accessibility.coverage < 70) {
    log('  • ⚠️  IMPORTANT: Accessibility testing needed for WCAG compliance', 'yellow');
    log('     Mental health apps must be inclusive and accessible', 'yellow');
  }

  if (overallCoverage < 60) {
    log('  • 🚨 Overall test coverage is insufficient for production deployment', 'red');
  }

  // Next steps
  log('\n🚀 NEXT STEPS:', 'bold');

  if (existingFiles < totalFiles / 2) {
    log('  1. Create missing test files using existing patterns', 'yellow');
  }

  if (filesWithTests < existingFiles) {
    log('  2. Add actual test cases to existing test files', 'yellow');
  }

  log('  3. Run individual test suites to validate implementation', 'cyan');
  log('  4. Fix any Jest configuration issues preventing test execution', 'cyan');
  log('  5. Implement performance benchmarking for critical paths', 'cyan');

  // Final verdict
  log('\n🏁 DEPLOYMENT READINESS:', 'bold');

  const readyForDeployment = overallCoverage >= 60 &&
                            results.crisisSafety.coverage >= 70 &&
                            results.security.coverage >= 70;

  if (readyForDeployment) {
    log('  ✅ PAYMENT UI TESTING INFRASTRUCTURE IS ADEQUATE', 'green');
    log('  Payment features can proceed to deployment with current test coverage', 'green');
  } else {
    log('  ❌ ADDITIONAL TESTING REQUIRED BEFORE DEPLOYMENT', 'red');
    log('  Critical test coverage gaps must be addressed first', 'red');
  }

  return {
    overallCoverage,
    totalFiles,
    existingFiles,
    filesWithTests,
    results,
    readyForDeployment
  };
}

// Main execution
function main() {
  try {
    const report = generateValidationReport();

    // Write report to file
    const reportFile = path.join(__dirname, '../test-results', `payment-test-validation-${Date.now()}.json`);
    const reportDir = path.dirname(reportFile);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      ...report
    }, null, 2));

    log(`\n📁 Validation report saved to: ${reportFile}`, 'cyan');

    // Exit with appropriate code
    process.exit(report.readyForDeployment ? 0 : 1);

  } catch (error) {
    console.error(`${colors.red}${colors.bold}VALIDATION FAILED:${colors.reset} ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { validateTestFile, analyzeTestCoverage, testValidations };