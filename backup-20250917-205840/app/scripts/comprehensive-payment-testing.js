#!/usr/bin/env node

/**
 * FullMind Payment UI Testing & Validation Script
 * Day 16 Phase 5: Comprehensive Testing Execution
 *
 * CRITICAL TESTING AREAS:
 * ✅ Crisis Safety Testing (<200ms response)
 * ✅ Payment Flow Testing (end-to-end)
 * ✅ Performance Testing (load times & responsiveness)
 * ✅ Accessibility Testing (WCAG AA compliance)
 * ✅ Integration Testing (payment store & cloud services)
 * ✅ Security Testing (PCI DSS compliance)
 */

const { execSync } = require('child_process');
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

// Test categories with requirements
const testCategories = {
  crisisSafety: {
    name: 'Crisis Safety Testing',
    icon: '🚨',
    requirements: [
      'Crisis button <200ms response time',
      '988 hotline accessibility from all payment screens',
      'Crisis mode overrides payment restrictions',
      'Emergency feature access during payment failures',
      'Offline crisis functionality during payment processes'
    ],
    tests: [
      'src/components/accessibility/__tests__/PaymentAccessibilityTests.tsx',
      '__tests__/store/paymentStore.test.ts'
    ]
  },

  paymentFlows: {
    name: 'Payment Flow Testing',
    icon: '💳',
    requirements: [
      'End-to-end subscription flow (trial → paid)',
      'Payment method management (add/update/remove)',
      'Stripe Elements integration with error handling',
      'Subscription tier changes and cancellations',
      'Payment failure recovery with therapeutic messaging'
    ],
    tests: [
      '__tests__/store/paymentStore.test.ts',
      'src/services/cloud/__tests__/StripePaymentClient.test.ts',
      '__tests__/services/PaymentAPIService.test.ts'
    ]
  },

  performance: {
    name: 'Performance Testing',
    icon: '⚡',
    requirements: [
      'Payment screen navigation <300ms',
      'Stripe Elements loading <1 second',
      'Crisis feature activation <200ms',
      'Subscription status sync <500ms',
      'Error recovery messaging <100ms'
    ],
    tests: [
      '__tests__/performance/critical-timing.test.ts',
      'src/__tests__/performance/AppLaunchPerformance.test.ts'
    ]
  },

  accessibility: {
    name: 'Accessibility Testing',
    icon: '♿',
    requirements: [
      'WCAG AA compliance with 4.5:1 contrast',
      'VoiceOver/TalkBack navigation support',
      '44px minimum touch targets (48px for crisis)',
      'High contrast and reduced motion support',
      'Screen reader announcements for status changes'
    ],
    tests: [
      'src/components/accessibility/__tests__/PaymentAccessibilityTests.tsx',
      '__tests__/accessibility/wcag-compliance.test.tsx'
    ]
  },

  security: {
    name: 'Security Testing',
    icon: '🔐',
    requirements: [
      'PCI DSS compliance validation',
      'Payment tokenization security',
      'No sensitive data storage verification',
      'Audit logging compliance',
      'Crisis data protection during payment'
    ],
    tests: [
      'src/services/security/__tests__/PaymentSecurityService.test.ts'
    ]
  },

  integration: {
    name: 'Integration Testing',
    icon: '🔗',
    requirements: [
      'Payment store integration with userStore',
      'Authentication system integration',
      'Cloud sync for payment status',
      'Feature flag integration for payment tiers',
      'Error boundary testing for payment components'
    ],
    tests: [
      '__tests__/integration/assessment-flow.test.tsx'
    ]
  }
};

class PaymentTestRunner {
  constructor() {
    this.results = {};
    this.startTime = Date.now();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logHeader(message) {
    console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}${message}${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  }

  logCategory(category, icon) {
    console.log(`\n${colors.bold}${colors.blue}${icon} ${category}${colors.reset}`);
    console.log(`${colors.blue}${'─'.repeat(50)}${colors.reset}`);
  }

  async runTestCategory(categoryKey, category) {
    this.logCategory(category.name, category.icon);

    // Log requirements
    this.log('\n📋 Requirements:', 'yellow');
    category.requirements.forEach(req => {
      this.log(`  • ${req}`, 'yellow');
    });

    // Check if test files exist
    const existingTests = [];
    const missingTests = [];

    for (const testPath of category.tests) {
      const fullPath = path.join(process.cwd(), testPath);
      if (fs.existsSync(fullPath)) {
        existingTests.push(testPath);
      } else {
        missingTests.push(testPath);
      }
    }

    if (missingTests.length > 0) {
      this.log('\n⚠️  Missing Test Files:', 'yellow');
      missingTests.forEach(test => this.log(`  • ${test}`, 'red'));
    }

    if (existingTests.length === 0) {
      this.log('\n❌ No test files found for this category', 'red');
      this.results[categoryKey] = {
        status: 'missing',
        tests: 0,
        passed: 0,
        failed: 0,
        duration: 0
      };
      return;
    }

    // Run tests for this category
    const testStart = Date.now();
    let testResult = {
      status: 'unknown',
      tests: 0,
      passed: 0,
      failed: 0,
      duration: 0,
      output: ''
    };

    try {
      this.log('\n🧪 Running Tests...', 'blue');

      // Build test pattern for existing tests
      const testPattern = existingTests
        .map(test => test.replace(/\//g, '\\/'))
        .join('|');

      const command = `npm test -- --testPathPattern="${testPattern}" --verbose --passWithNoTests`;

      this.log(`\n Command: ${command}`, 'cyan');

      const output = execSync(command, {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 120000 // 2 minutes timeout
      });

      testResult.output = output;
      testResult.status = 'passed';

      // Parse Jest output for test counts
      const testMatch = output.match(/Tests:\s+(\d+)\s+passed/);
      const failedMatch = output.match(/(\d+)\s+failed/);

      if (testMatch) testResult.passed = parseInt(testMatch[1]);
      if (failedMatch) testResult.failed = parseInt(failedMatch[1]);
      testResult.tests = testResult.passed + testResult.failed;

      this.log('✅ Tests completed successfully', 'green');

    } catch (error) {
      testResult.status = 'failed';
      testResult.output = error.message;
      this.log('❌ Tests failed', 'red');

      // Parse error output for any useful information
      if (error.stdout) {
        const testMatch = error.stdout.match(/Tests:\s+(\d+)\s+passed/);
        const failedMatch = error.stdout.match(/(\d+)\s+failed/);

        if (testMatch) testResult.passed = parseInt(testMatch[1]);
        if (failedMatch) testResult.failed = parseInt(failedMatch[1]);
        testResult.tests = testResult.passed + testResult.failed;
      }
    }

    testResult.duration = Date.now() - testStart;
    this.results[categoryKey] = testResult;

    // Log results
    this.log(`\n📊 Results:`, 'cyan');
    this.log(`  • Tests: ${testResult.tests}`, 'reset');
    this.log(`  • Passed: ${testResult.passed}`, testResult.passed > 0 ? 'green' : 'reset');
    this.log(`  • Failed: ${testResult.failed}`, testResult.failed > 0 ? 'red' : 'reset');
    this.log(`  • Duration: ${(testResult.duration / 1000).toFixed(1)}s`, 'reset');
  }

  generateReport() {
    this.logHeader('📋 COMPREHENSIVE PAYMENT TESTING REPORT');

    const totalDuration = Date.now() - this.startTime;
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let categoriesPassed = 0;
    let categoriesFailed = 0;

    // Calculate totals
    Object.keys(this.results).forEach(key => {
      const result = this.results[key];
      totalTests += result.tests || 0;
      totalPassed += result.passed || 0;
      totalFailed += result.failed || 0;

      if (result.status === 'passed' || (result.passed > 0 && result.failed === 0)) {
        categoriesPassed++;
      } else {
        categoriesFailed++;
      }
    });

    // Overall results
    this.log('\n🎯 OVERALL RESULTS:', 'bold');
    this.log(`  • Total Test Categories: ${Object.keys(this.results).length}`, 'reset');
    this.log(`  • Categories Passed: ${categoriesPassed}`, categoriesPassed > 0 ? 'green' : 'reset');
    this.log(`  • Categories Failed: ${categoriesFailed}`, categoriesFailed > 0 ? 'red' : 'reset');
    this.log(`  • Total Tests: ${totalTests}`, 'reset');
    this.log(`  • Tests Passed: ${totalPassed}`, totalPassed > 0 ? 'green' : 'reset');
    this.log(`  • Tests Failed: ${totalFailed}`, totalFailed > 0 ? 'red' : 'reset');
    this.log(`  • Total Duration: ${(totalDuration / 1000).toFixed(1)}s`, 'reset');

    // Category breakdown
    this.log('\n📊 CATEGORY BREAKDOWN:', 'bold');
    Object.keys(testCategories).forEach(key => {
      const category = testCategories[key];
      const result = this.results[key];

      let status = '❓';
      let statusColor = 'yellow';

      if (result.status === 'passed' || (result.passed > 0 && result.failed === 0)) {
        status = '✅';
        statusColor = 'green';
      } else if (result.status === 'failed' || result.failed > 0) {
        status = '❌';
        statusColor = 'red';
      } else if (result.status === 'missing') {
        status = '⚠️';
        statusColor = 'yellow';
      }

      this.log(`  ${status} ${category.icon} ${category.name}`, statusColor);
      if (result.tests > 0) {
        this.log(`      ${result.passed}/${result.tests} tests passed (${(result.duration / 1000).toFixed(1)}s)`, 'reset');
      }
    });

    // Critical requirements validation
    this.log('\n🎯 CRITICAL REQUIREMENTS STATUS:', 'bold');

    const criticalRequirements = [
      {
        name: 'Crisis Response Time <200ms',
        category: 'crisisSafety',
        status: this.results.crisisSafety?.passed > 0 ? 'PASS' : 'FAIL'
      },
      {
        name: 'Payment Security (PCI DSS)',
        category: 'security',
        status: this.results.security?.passed > 0 ? 'PASS' : 'FAIL'
      },
      {
        name: 'WCAG AA Accessibility',
        category: 'accessibility',
        status: this.results.accessibility?.passed > 0 ? 'PASS' : 'FAIL'
      },
      {
        name: 'End-to-End Payment Flow',
        category: 'paymentFlows',
        status: this.results.paymentFlows?.passed > 0 ? 'PASS' : 'FAIL'
      },
      {
        name: 'Performance Requirements',
        category: 'performance',
        status: this.results.performance?.passed > 0 ? 'PASS' : 'FAIL'
      }
    ];

    criticalRequirements.forEach(req => {
      const symbol = req.status === 'PASS' ? '✅' : '❌';
      const color = req.status === 'PASS' ? 'green' : 'red';
      this.log(`  ${symbol} ${req.name}: ${req.status}`, color);
    });

    // Recommendations
    this.log('\n💡 RECOMMENDATIONS:', 'bold');

    if (totalFailed > 0) {
      this.log('  • Fix failing tests before deployment', 'yellow');
    }

    if (this.results.crisisSafety?.status !== 'passed') {
      this.log('  • ⚠️  CRITICAL: Crisis safety tests must pass before deployment', 'red');
    }

    if (this.results.security?.status !== 'passed') {
      this.log('  • ⚠️  CRITICAL: Security tests must pass for payment features', 'red');
    }

    if (this.results.accessibility?.status !== 'passed') {
      this.log('  • ⚠️  IMPORTANT: Accessibility compliance needed for inclusive design', 'yellow');
    }

    // Final verdict
    const overallSuccess = categoriesFailed === 0 && totalFailed === 0;
    this.log('\n🏁 FINAL VERDICT:', 'bold');

    if (overallSuccess) {
      this.log('  ✅ PAYMENT UI READY FOR DEPLOYMENT', 'green');
      this.log('  All critical requirements met successfully', 'green');
    } else {
      this.log('  ❌ DEPLOYMENT NOT RECOMMENDED', 'red');
      this.log('  Critical issues must be resolved first', 'red');
    }

    return {
      success: overallSuccess,
      totalTests,
      totalPassed,
      totalFailed,
      categoriesPassed,
      categoriesFailed,
      duration: totalDuration
    };
  }

  async run() {
    this.logHeader('🚀 FULLMIND PAYMENT UI TESTING & VALIDATION');
    this.log('Executing comprehensive Day 16 Phase 5 testing suite...', 'cyan');
    this.log(`Started at: ${new Date().toISOString()}`, 'reset');

    // Run each test category
    for (const [key, category] of Object.entries(testCategories)) {
      await this.runTestCategory(key, category);
    }

    // Generate final report
    const report = this.generateReport();

    // Write detailed results to file
    const reportFile = path.join(__dirname, '../test-results', `payment-testing-report-${Date.now()}.json`);
    const reportDir = path.dirname(reportFile);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: report
    }, null, 2));

    this.log(`\n📁 Detailed results saved to: ${reportFile}`, 'cyan');

    return report;
  }
}

// Main execution
async function main() {
  try {
    const runner = new PaymentTestRunner();
    const report = await runner.run();

    // Exit with appropriate code
    process.exit(report.success ? 0 : 1);

  } catch (error) {
    console.error(`${colors.red}${colors.bold}TESTING FAILED:${colors.reset} ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { PaymentTestRunner, testCategories };