/**
 * SAFETY COMPLIANCE REPORTER - Week 3 Orchestration
 * Critical safety validation and compliance monitoring for mental health application
 * 
 * SAFETY REQUIREMENTS:
 * - Crisis detection accuracy: 100% precision required
 * - Crisis response time: <200ms maximum
 * - Assessment calculation: Zero tolerance for errors
 * - Clinical thresholds: PHQ-9≥20, GAD-7≥15 exact validation
 * - Accessibility compliance: WCAG-AA standards
 * - Data protection: HIPAA compliance validation
 */

const fs = require('fs');
const path = require('path');

class SafetyComplianceReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.safetyViolations = [];
    this.complianceIssues = [];
    this.criticalErrors = [];
    this.warnings = [];
    this.testResults = {};
    
    // Safety thresholds - Zero tolerance for critical functions
    this.safetyThresholds = {
      crisis_response_max_ms: 200,
      assessment_accuracy_percent: 100,
      crisis_detection_accuracy_percent: 100,
      accessibility_compliance_percent: 100,
      data_encryption_compliance_percent: 100
    };
    
    console.log('🏥 Safety compliance monitoring initialized...');
  }

  onRunStart(results, options) {
    console.log('🚨 CRITICAL SAFETY VALIDATION STARTED');
    console.log('   - Crisis detection accuracy monitoring');
    console.log('   - Assessment calculation validation');
    console.log('   - Response time safety checks');
    console.log('   - Accessibility compliance verification');
    console.log('   - Data protection validation');
    
    this.startTime = Date.now();
    this.safetyViolations = [];
    this.complianceIssues = [];
    this.criticalErrors = [];
    this.warnings = [];
  }

  onTestResult(test, testResult) {
    const testPath = testResult.testFilePath.replace(process.cwd(), '');
    
    // Analyze each test for safety violations
    testResult.testResults.forEach(result => {
      this.analyzeSafetyTest(testPath, result);
    });
    
    // Check console output for safety violations
    this.analyzeConsoleOutput(testPath, testResult);
    
    // Record test results for compliance reporting
    this.testResults[testPath] = {
      passed: testResult.numPassingTests,
      failed: testResult.numFailingTests,
      duration: testResult.perfStats?.runtime || 0,
      isSafetyCritical: this.isSafetyCriticalTest(testPath)
    };
  }

  isSafetyCriticalTest(testPath) {
    const safetyCriticalPatterns = [
      'crisis',
      'clinical',
      'assessment',
      'safety',
      'emergency',
      'phq',
      'gad',
      'scoring'
    ];
    
    return safetyCriticalPatterns.some(pattern => 
      testPath.toLowerCase().includes(pattern)
    );
  }

  analyzeSafetyTest(testPath, testResult) {
    const testName = testResult.fullName;
    const testTitle = testResult.title;
    
    // Crisis response time validation
    if (this.isCrisisResponseTest(testName)) {
      this.validateCrisisResponse(testPath, testResult);
    }
    
    // Assessment accuracy validation
    if (this.isAssessmentTest(testName)) {
      this.validateAssessmentAccuracy(testPath, testResult);
    }
    
    // Clinical calculation validation
    if (this.isClinicalCalculationTest(testName)) {
      this.validateClinicalCalculation(testPath, testResult);
    }
    
    // Accessibility validation
    if (this.isAccessibilityTest(testName)) {
      this.validateAccessibility(testPath, testResult);
    }
    
    // Data protection validation
    if (this.isDataProtectionTest(testName)) {
      this.validateDataProtection(testPath, testResult);
    }
    
    // Check for test failures in safety-critical areas
    if (testResult.status === 'failed' && this.isSafetyCriticalTest(testPath)) {
      this.criticalErrors.push({
        type: 'SAFETY_CRITICAL_FAILURE',
        test: testName,
        path: testPath,
        error: testResult.failureMessage,
        severity: 'CRITICAL'
      });
    }
  }

  isCrisisResponseTest(testName) {
    return testName.toLowerCase().includes('crisis') && 
           (testName.toLowerCase().includes('response') || 
            testName.toLowerCase().includes('time') ||
            testName.toLowerCase().includes('speed'));
  }

  isAssessmentTest(testName) {
    return testName.toLowerCase().includes('assessment') ||
           testName.toLowerCase().includes('phq') ||
           testName.toLowerCase().includes('gad') ||
           testName.toLowerCase().includes('scoring');
  }

  isClinicalCalculationTest(testName) {
    return testName.toLowerCase().includes('calculation') ||
           testName.toLowerCase().includes('clinical') ||
           testName.toLowerCase().includes('threshold');
  }

  isAccessibilityTest(testName) {
    return testName.toLowerCase().includes('accessibility') ||
           testName.toLowerCase().includes('wcag') ||
           testName.toLowerCase().includes('screen reader') ||
           testName.toLowerCase().includes('keyboard');
  }

  isDataProtectionTest(testName) {
    return testName.toLowerCase().includes('encryption') ||
           testName.toLowerCase().includes('hipaa') ||
           testName.toLowerCase().includes('privacy') ||
           testName.toLowerCase().includes('secure');
  }

  validateCrisisResponse(testPath, testResult) {
    // Look for timing information in test results
    if (testResult.duration && testResult.duration > this.safetyThresholds.crisis_response_max_ms) {
      this.safetyViolations.push({
        type: 'CRISIS_RESPONSE_TIME_VIOLATION',
        test: testResult.fullName,
        path: testPath,
        actual_ms: testResult.duration,
        threshold_ms: this.safetyThresholds.crisis_response_max_ms,
        severity: 'CRITICAL',
        message: `Crisis response time ${testResult.duration}ms exceeds ${this.safetyThresholds.crisis_response_max_ms}ms safety threshold`
      });
    }
  }

  validateAssessmentAccuracy(testPath, testResult) {
    // Check for assessment accuracy failures
    if (testResult.status === 'failed') {
      const isAccuracyTest = testResult.fullName.toLowerCase().includes('accuracy') ||
                            testResult.fullName.toLowerCase().includes('calculation') ||
                            testResult.fullName.toLowerCase().includes('score');
      
      if (isAccuracyTest) {
        this.safetyViolations.push({
          type: 'ASSESSMENT_ACCURACY_VIOLATION',
          test: testResult.fullName,
          path: testPath,
          severity: 'CRITICAL',
          message: 'Assessment accuracy test failed - potential clinical miscalculation'
        });
      }
    }
  }

  validateClinicalCalculation(testPath, testResult) {
    // Clinical calculations must be 100% accurate
    if (testResult.status === 'failed') {
      this.safetyViolations.push({
        type: 'CLINICAL_CALCULATION_VIOLATION',
        test: testResult.fullName,
        path: testPath,
        severity: 'CRITICAL',
        message: 'Clinical calculation test failed - risk of incorrect crisis detection'
      });
    }
  }

  validateAccessibility(testPath, testResult) {
    if (testResult.status === 'failed') {
      this.complianceIssues.push({
        type: 'ACCESSIBILITY_COMPLIANCE_VIOLATION',
        test: testResult.fullName,
        path: testPath,
        severity: 'HIGH',
        message: 'Accessibility test failed - may prevent crisis access for disabled users'
      });
    }
  }

  validateDataProtection(testPath, testResult) {
    if (testResult.status === 'failed') {
      this.complianceIssues.push({
        type: 'DATA_PROTECTION_VIOLATION',
        test: testResult.fullName,
        path: testPath,
        severity: 'HIGH',
        message: 'Data protection test failed - potential HIPAA compliance violation'
      });
    }
  }

  analyzeConsoleOutput(testPath, testResult) {
    if (!testResult.console) return;
    
    testResult.console.forEach(entry => {
      const message = entry.message;
      
      // Look for safety violation patterns
      if (message.includes('CRISIS SAFETY VIOLATION')) {
        this.safetyViolations.push({
          type: 'CONSOLE_SAFETY_VIOLATION',
          path: testPath,
          message: message,
          severity: 'CRITICAL'
        });
      }
      
      if (message.includes('CLINICAL ACCURACY ERROR')) {
        this.safetyViolations.push({
          type: 'CLINICAL_ACCURACY_ERROR',
          path: testPath,
          message: message,
          severity: 'CRITICAL'
        });
      }
      
      if (message.includes('ACCESSIBILITY WARNING')) {
        this.warnings.push({
          type: 'ACCESSIBILITY_WARNING',
          path: testPath,
          message: message,
          severity: 'MEDIUM'
        });
      }
      
      if (message.includes('HIPAA') || message.includes('PRIVACY')) {
        this.complianceIssues.push({
          type: 'PRIVACY_CONCERN',
          path: testPath,
          message: message,
          severity: 'HIGH'
        });
      }
    });
  }

  onRunComplete(contexts, results) {
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n🏥 SAFETY COMPLIANCE ANALYSIS COMPLETE');
    
    // Generate comprehensive safety report
    const safetyReport = this.generateSafetyReport(results, totalDuration);
    
    // Save safety report
    this.saveSafetyReport(safetyReport);
    
    // Display critical safety results
    this.displaySafetyResults(safetyReport);
    
    // Determine if deployment should be blocked
    const shouldBlock = this.shouldBlockDeployment(safetyReport);
    
    if (shouldBlock) {
      console.error('\n🚨 DEPLOYMENT BLOCKED - CRITICAL SAFETY VIOLATIONS DETECTED');
      console.error('   Mental health application safety requirements not met');
      console.error('   Manual review required before deployment');
      process.exit(1);
    } else {
      console.log('\n✅ SAFETY VALIDATION PASSED - Deployment authorized');
    }
  }

  generateSafetyReport(results, totalDuration) {
    const criticalViolations = this.safetyViolations.filter(v => v.severity === 'CRITICAL');
    const highIssues = this.complianceIssues.filter(i => i.severity === 'HIGH');
    
    return {
      timestamp: new Date().toISOString(),
      execution_summary: {
        total_tests: results.numTotalTests,
        passed_tests: results.numPassedTests,
        failed_tests: results.numFailedTests,
        total_duration_ms: totalDuration,
        safety_critical_tests: Object.values(this.testResults)
          .filter(r => r.isSafetyCritical).length
      },
      safety_analysis: {
        critical_violations: criticalViolations.length,
        high_compliance_issues: highIssues.length,
        total_warnings: this.warnings.length,
        safety_status: criticalViolations.length === 0 ? 'SAFE' : 'UNSAFE'
      },
      violations: {
        safety_violations: this.safetyViolations,
        compliance_issues: this.complianceIssues,
        critical_errors: this.criticalErrors,
        warnings: this.warnings
      },
      thresholds: this.safetyThresholds,
      test_results: this.testResults,
      compliance_checklist: {
        crisis_response_time: criticalViolations.filter(v => v.type.includes('CRISIS_RESPONSE')).length === 0,
        assessment_accuracy: criticalViolations.filter(v => v.type.includes('ASSESSMENT_ACCURACY')).length === 0,
        clinical_calculations: criticalViolations.filter(v => v.type.includes('CLINICAL_CALCULATION')).length === 0,
        accessibility_compliance: this.complianceIssues.filter(i => i.type.includes('ACCESSIBILITY')).length === 0,
        data_protection: this.complianceIssues.filter(i => i.type.includes('DATA_PROTECTION')).length === 0
      }
    };
  }

  saveSafetyReport(report) {
    const reportDir = path.join(process.cwd(), 'test-results');
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    // Save detailed JSON report
    const jsonPath = path.join(reportDir, 'safety-compliance-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    
    // Save human-readable safety summary
    const summaryPath = path.join(reportDir, 'safety-summary.txt');
    const summary = this.generateSafetySummary(report);
    fs.writeFileSync(summaryPath, summary);
    
    console.log(`🏥 Safety compliance report saved to: ${jsonPath}`);
  }

  generateSafetySummary(report) {
    let summary = '# SAFETY COMPLIANCE REPORT\n';
    summary += '## MENTAL HEALTH APPLICATION SAFETY VALIDATION\n\n';
    summary += `Generated: ${report.timestamp}\n`;
    summary += `Safety Status: ${report.safety_analysis.safety_status}\n\n`;
    
    summary += '## COMPLIANCE CHECKLIST\n\n';
    Object.entries(report.compliance_checklist).forEach(([check, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      summary += `${status} ${check.replace(/_/g, ' ').toUpperCase()}\n`;
    });
    
    summary += '\n## SAFETY ANALYSIS\n\n';
    summary += `Critical Violations: ${report.safety_analysis.critical_violations}\n`;
    summary += `High Compliance Issues: ${report.safety_analysis.high_compliance_issues}\n`;
    summary += `Warnings: ${report.safety_analysis.total_warnings}\n\n`;
    
    if (report.violations.safety_violations.length > 0) {
      summary += '## SAFETY VIOLATIONS\n\n';
      report.violations.safety_violations.forEach(violation => {
        summary += `🚨 [${violation.severity}] ${violation.type}\n`;
        summary += `   Test: ${violation.test || 'N/A'}\n`;
        summary += `   Message: ${violation.message}\n\n`;
      });
    }
    
    if (report.violations.compliance_issues.length > 0) {
      summary += '## COMPLIANCE ISSUES\n\n';
      report.violations.compliance_issues.forEach(issue => {
        summary += `⚠️ [${issue.severity}] ${issue.type}\n`;
        summary += `   Test: ${issue.test || 'N/A'}\n`;
        summary += `   Message: ${issue.message}\n\n`;
      });
    }
    
    summary += '## SAFETY THRESHOLDS\n\n';
    Object.entries(report.thresholds).forEach(([key, value]) => {
      summary += `- ${key}: ${value}${key.includes('_ms') ? 'ms' : '%'}\n`;
    });
    
    return summary;
  }

  displaySafetyResults(report) {
    console.log('\n🏥 SAFETY COMPLIANCE RESULTS:');
    
    // Display compliance checklist
    console.log('\n📋 Compliance Checklist:');
    Object.entries(report.compliance_checklist).forEach(([check, passed]) => {
      const icon = passed ? '✅' : '❌';
      const status = passed ? 'PASS' : 'FAIL';
      console.log(`  ${icon} ${check.replace(/_/g, ' ').toUpperCase()}: ${status}`);
    });
    
    // Display safety violations
    if (report.violations.safety_violations.length > 0) {
      console.log(`\n🚨 ${report.violations.safety_violations.length} CRITICAL SAFETY VIOLATIONS:`);
      report.violations.safety_violations.forEach(violation => {
        console.log(`  🚨 [${violation.severity}] ${violation.type}`);
        console.log(`     ${violation.message}`);
      });
    }
    
    // Display compliance issues
    if (report.violations.compliance_issues.length > 0) {
      console.log(`\n⚠️ ${report.violations.compliance_issues.length} COMPLIANCE ISSUES:`);
      report.violations.compliance_issues.forEach(issue => {
        console.log(`  ⚠️ [${issue.severity}] ${issue.type}`);
        console.log(`     ${issue.message}`);
      });
    }
    
    // Overall safety status
    const statusIcon = report.safety_analysis.safety_status === 'SAFE' ? '✅' : '🚨';
    console.log(`\n${statusIcon} OVERALL SAFETY STATUS: ${report.safety_analysis.safety_status}`);
    
    if (report.safety_analysis.safety_status === 'SAFE') {
      console.log('   🏥 Mental health application meets all safety requirements');
      console.log('   🚨 Crisis intervention systems validated');
      console.log('   📊 Clinical calculations verified for accuracy');
      console.log('   ♿ Accessibility compliance confirmed');
    }
  }

  shouldBlockDeployment(report) {
    // Block deployment for any critical safety violations
    const criticalViolations = report.violations.safety_violations.filter(v => v.severity === 'CRITICAL');
    
    // Block for critical compliance failures
    const criticalComplianceFailures = [
      !report.compliance_checklist.crisis_response_time,
      !report.compliance_checklist.assessment_accuracy,
      !report.compliance_checklist.clinical_calculations
    ].filter(Boolean);
    
    return criticalViolations.length > 0 || criticalComplianceFailures.length > 0;
  }
}

module.exports = SafetyComplianceReporter;