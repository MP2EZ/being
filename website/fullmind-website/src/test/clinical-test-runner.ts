/**
 * FullMind Clinical Test Runner
 * 
 * Comprehensive test execution script for clinical-grade testing including:
 * - Assessment accuracy validation (99.9% requirement)
 * - Crisis safety protocol testing
 * - Export functionality validation  
 * - Accessibility compliance verification
 * - Performance validation for therapeutic UX
 * - Clinical compliance reporting
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// ============================================================================
// CLINICAL TEST CONFIGURATION
// ============================================================================

interface ClinicalTestSuite {
  name: string;
  pattern: string;
  timeout: number;
  critical: boolean;
  accuracyRequirement: number;
}

const CLINICAL_TEST_SUITES: ClinicalTestSuite[] = [
  {
    name: 'Assessment Scoring Accuracy',
    pattern: 'src/test/clinical/assessment-scoring.test.ts',
    timeout: 60000, // 60 seconds
    critical: true,
    accuracyRequirement: 0.999, // 99.9%
  },
  {
    name: 'Crisis Safety Protocols',
    pattern: 'src/test/crisis/crisis-safety-protocols.test.ts',
    timeout: 120000, // 2 minutes
    critical: true,
    accuracyRequirement: 1.0, // 100% for safety
  },
  {
    name: 'Export Integration',
    pattern: 'src/test/export/clinical-export-integration.test.ts',
    timeout: 300000, // 5 minutes
    critical: true,
    accuracyRequirement: 0.95, // 95%
  },
  {
    name: 'Accessibility Compliance',
    pattern: 'src/test/accessibility/accessibility-compliance.test.ts',
    timeout: 180000, // 3 minutes
    critical: true,
    accuracyRequirement: 0.90, // 90%
  },
  {
    name: 'Theme Integration',
    pattern: 'src/test/theme-integration.test.tsx',
    timeout: 60000, // 60 seconds
    critical: false,
    accuracyRequirement: 0.85, // 85%
  },
];

// ============================================================================
// CLINICAL TEST EXECUTION
// ============================================================================

interface TestResults {
  suiteName: string;
  passed: boolean;
  accuracy: number;
  duration: number;
  errors: string[];
  warnings: string[];
  clinicalConcerns: string[];
}

interface ClinicalTestReport {
  timestamp: string;
  overallPassed: boolean;
  criticalTestsPassed: boolean;
  totalTests: number;
  passedTests: number;
  overallAccuracy: number;
  results: TestResults[];
  clinicalCompliance: {
    assessmentAccuracy: number;
    crisisSafety: number;
    exportIntegrity: number;
    accessibilityCompliance: number;
  };
  recommendations: string[];
}

class ClinicalTestRunner {
  private reportsDir: string;
  private startTime: number;

  constructor() {
    this.reportsDir = join(process.cwd(), 'reports', 'clinical');
    this.startTime = Date.now();
    this.ensureReportsDirectory();
  }

  private ensureReportsDirectory(): void {
    if (!existsSync(this.reportsDir)) {
      mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async runClinicalTests(): Promise<ClinicalTestReport> {
    console.log('🏥 Starting FullMind Clinical Testing Suite');
    console.log('=' .repeat(60));
    
    const results: TestResults[] = [];
    let overallPassed = true;
    let criticalTestsPassed = true;
    
    for (const suite of CLINICAL_TEST_SUITES) {
      console.log(`\n📋 Running ${suite.name}...`);
      
      try {
        const result = await this.runTestSuite(suite);
        results.push(result);
        
        if (!result.passed) {
          overallPassed = false;
          if (suite.critical) {
            criticalTestsPassed = false;
          }
        }

        this.logSuiteResult(result, suite.critical);
        
      } catch (error) {
        const failedResult: TestResults = {
          suiteName: suite.name,
          passed: false,
          accuracy: 0,
          duration: 0,
          errors: [String(error)],
          warnings: [],
          clinicalConcerns: ['Test suite failed to execute'],
        };
        
        results.push(failedResult);
        overallPassed = false;
        if (suite.critical) {
          criticalTestsPassed = false;
        }
        
        console.error(`❌ ${suite.name} failed to execute:`, error);
      }
    }

    const report = this.generateReport(results, overallPassed, criticalTestsPassed);
    await this.saveReport(report);
    this.displaySummary(report);
    
    return report;
  }

  private async runTestSuite(suite: ClinicalTestSuite): Promise<TestResults> {
    const startTime = Date.now();
    
    try {
      // Run Jest with specific configuration for clinical testing
      const jestCommand = [
        'npx jest',
        `--testPathPattern="${suite.pattern}"`,
        `--testTimeout=${suite.timeout}`,
        '--verbose',
        '--no-cache',
        '--runInBand', // Single-threaded for deterministic results
        '--forceExit',
        `--collectCoverageFrom="${suite.pattern}"`,
        '--coverage',
        `--coverageDirectory="${join(this.reportsDir, 'coverage', suite.name.replace(/\s+/g, '-'))}"`,
        '--coverageReporters=json-summary,text,html',
      ].join(' ');

      const output = execSync(jestCommand, {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: suite.timeout,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          CLINICAL_TEST_MODE: 'true',
          CI: 'true', // Ensure consistent behavior
        },
      });

      const duration = Date.now() - startTime;
      
      // Parse Jest output for results
      const accuracy = this.parseAccuracyFromOutput(output);
      const passed = accuracy >= suite.accuracyRequirement && !output.includes('FAIL');
      
      return {
        suiteName: suite.name,
        passed,
        accuracy,
        duration,
        errors: this.parseErrorsFromOutput(output),
        warnings: this.parseWarningsFromOutput(output),
        clinicalConcerns: this.parseClinicalConcerns(output),
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        suiteName: suite.name,
        passed: false,
        accuracy: 0,
        duration,
        errors: [error.message, error.stdout, error.stderr].filter(Boolean),
        warnings: [],
        clinicalConcerns: ['Test execution failed'],
      };
    }
  }

  private parseAccuracyFromOutput(output: string): number {
    // Look for accuracy metrics in test output
    const accuracyMatches = [
      /Assessment Accuracy: ([\d.]+)%/,
      /Overall Accuracy: ([\d.]+)%/,
      /Scoring Accuracy: ([\d.]+)%/,
      /Success Rate: ([\d.]+)%/,
    ];

    for (const regex of accuracyMatches) {
      const match = output.match(regex);
      if (match) {
        return parseFloat(match[1]) / 100;
      }
    }

    // Look for Jest test results
    const passMatch = output.match(/(\d+) passing/);
    const totalMatch = output.match(/(\d+) total/);
    
    if (passMatch && totalMatch) {
      return parseInt(passMatch[1]) / parseInt(totalMatch[1]);
    }

    // Default to assuming 100% if tests pass
    return output.includes('PASS') ? 1.0 : 0.0;
  }

  private parseErrorsFromOutput(output: string): string[] {
    const errors: string[] = [];
    
    // Extract Jest errors
    const errorMatches = output.match(/FAIL .+/g);
    if (errorMatches) {
      errors.push(...errorMatches);
    }

    // Extract clinical-specific errors
    const clinicalErrorMatches = output.match(/Clinical Error: .+/g);
    if (clinicalErrorMatches) {
      errors.push(...clinicalErrorMatches);
    }

    return errors;
  }

  private parseWarningsFromOutput(output: string): string[] {
    const warnings: string[] = [];
    
    const warningMatches = output.match(/Warning: .+/g);
    if (warningMatches) {
      warnings.push(...warningMatches);
    }

    return warnings;
  }

  private parseClinicalConcerns(output: string): string[] {
    const concerns: string[] = [];
    
    // Look for clinical-specific concerns
    if (output.includes('crisis threshold')) {
      concerns.push('Crisis threshold detection issues detected');
    }
    if (output.includes('assessment score')) {
      concerns.push('Assessment scoring accuracy concerns');
    }
    if (output.includes('accessibility')) {
      concerns.push('Accessibility compliance issues detected');
    }

    return concerns;
  }

  private logSuiteResult(result: TestResults, critical: boolean): void {
    const icon = result.passed ? '✅' : '❌';
    const criticalLabel = critical ? ' (CRITICAL)' : '';
    const accuracy = (result.accuracy * 100).toFixed(1);
    
    console.log(`${icon} ${result.suiteName}${criticalLabel}`);
    console.log(`   Accuracy: ${accuracy}%`);
    console.log(`   Duration: ${result.duration}ms`);
    
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`);
    }
    if (result.clinicalConcerns.length > 0) {
      console.log(`   Clinical Concerns: ${result.clinicalConcerns.length}`);
    }
  }

  private generateReport(
    results: TestResults[], 
    overallPassed: boolean, 
    criticalTestsPassed: boolean
  ): ClinicalTestReport {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const overallAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / totalTests;

    // Calculate clinical compliance metrics
    const assessmentResult = results.find(r => r.suiteName.includes('Assessment'));
    const crisisResult = results.find(r => r.suiteName.includes('Crisis'));
    const exportResult = results.find(r => r.suiteName.includes('Export'));
    const accessibilityResult = results.find(r => r.suiteName.includes('Accessibility'));

    const clinicalCompliance = {
      assessmentAccuracy: assessmentResult?.accuracy || 0,
      crisisSafety: crisisResult?.accuracy || 0,
      exportIntegrity: exportResult?.accuracy || 0,
      accessibilityCompliance: accessibilityResult?.accuracy || 0,
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(results, clinicalCompliance);

    return {
      timestamp: new Date().toISOString(),
      overallPassed,
      criticalTestsPassed,
      totalTests,
      passedTests,
      overallAccuracy,
      results,
      clinicalCompliance,
      recommendations,
    };
  }

  private generateRecommendations(
    results: TestResults[], 
    compliance: ClinicalTestReport['clinicalCompliance']
  ): string[] {
    const recommendations: string[] = [];

    // Assessment accuracy recommendations
    if (compliance.assessmentAccuracy < 0.999) {
      recommendations.push(
        'CRITICAL: Assessment scoring accuracy below 99.9% requirement. Review PHQ-9 and GAD-7 calculations.'
      );
    }

    // Crisis safety recommendations
    if (compliance.crisisSafety < 1.0) {
      recommendations.push(
        'CRITICAL: Crisis safety protocols not at 100%. Immediate review of crisis threshold detection required.'
      );
    }

    // Export integrity recommendations
    if (compliance.exportIntegrity < 0.95) {
      recommendations.push(
        'Export functionality below 95% accuracy. Review data transformation and format generation.'
      );
    }

    // Accessibility recommendations
    if (compliance.accessibilityCompliance < 0.90) {
      recommendations.push(
        'Accessibility compliance below 90%. Review WCAG AA requirements and crisis accessibility.'
      );
    }

    // General recommendations
    const failedCritical = results.filter(r => !r.passed && 
      CLINICAL_TEST_SUITES.find(s => s.name === r.suiteName)?.critical
    );
    
    if (failedCritical.length > 0) {
      recommendations.push(
        'CRITICAL: One or more critical test suites failed. Clinical deployment not recommended.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('All clinical requirements met. System ready for therapeutic use.');
    }

    return recommendations;
  }

  private async saveReport(report: ClinicalTestReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = join(this.reportsDir, `clinical-test-report-${timestamp}.json`);
    const summaryPath = join(this.reportsDir, 'latest-clinical-report.json');
    
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    writeFileSync(summaryPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = join(this.reportsDir, `clinical-test-report-${timestamp}.html`);
    const latestHtmlPath = join(this.reportsDir, 'latest-clinical-report.html');
    
    writeFileSync(htmlPath, htmlReport);
    writeFileSync(latestHtmlPath, htmlReport);
    
    console.log(`\n📊 Clinical test report saved:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlPath}`);
  }

  private generateHTMLReport(report: ClinicalTestReport): string {
    const statusClass = report.criticalTestsPassed ? 'success' : 'critical-failure';
    const statusText = report.criticalTestsPassed ? 'CLINICAL COMPLIANCE ACHIEVED' : 'CRITICAL CLINICAL FAILURES';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FullMind Clinical Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; line-height: 1.6; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; }
        .status { padding: 20px; margin: 20px 0; border-radius: 8px; font-weight: bold; }
        .success { background: #dcfce7; color: #166534; border: 2px solid #16a34a; }
        .critical-failure { background: #fef2f2; color: #991b1b; border: 2px solid #dc2626; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-value { font-size: 24px; font-weight: bold; color: #2563eb; }
        .test-result { margin: 20px 0; padding: 15px; border-radius: 8px; }
        .test-passed { background: #f0fdf4; border-left: 4px solid #22c55e; }
        .test-failed { background: #fef2f2; border-left: 4px solid #ef4444; }
        .recommendations { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .clinical-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .clinical-metric { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; }
        ul { margin: 10px 0; }
        li { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏥 FullMind Clinical Test Report</h1>
        <p>Generated: ${report.timestamp}</p>
    </div>
    
    <div class="status ${statusClass}">
        ${statusText}
    </div>
    
    <div class="clinical-metrics">
        <div class="clinical-metric">
            <h3>Overall Accuracy</h3>
            <div class="metric-value">${(report.overallAccuracy * 100).toFixed(1)}%</div>
        </div>
        <div class="clinical-metric">
            <h3>Tests Passed</h3>
            <div class="metric-value">${report.passedTests}/${report.totalTests}</div>
        </div>
        <div class="clinical-metric">
            <h3>Assessment Accuracy</h3>
            <div class="metric-value">${(report.clinicalCompliance.assessmentAccuracy * 100).toFixed(3)}%</div>
        </div>
        <div class="clinical-metric">
            <h3>Crisis Safety</h3>
            <div class="metric-value">${(report.clinicalCompliance.crisisSafety * 100).toFixed(1)}%</div>
        </div>
    </div>
    
    <h2>Test Results</h2>
    ${report.results.map(result => `
        <div class="test-result ${result.passed ? 'test-passed' : 'test-failed'}">
            <h3>${result.passed ? '✅' : '❌'} ${result.suiteName}</h3>
            <p><strong>Accuracy:</strong> ${(result.accuracy * 100).toFixed(1)}%</p>
            <p><strong>Duration:</strong> ${result.duration}ms</p>
            ${result.errors.length > 0 ? `
                <h4>Errors:</h4>
                <ul>${result.errors.map(error => `<li>${error}</li>`).join('')}</ul>
            ` : ''}
            ${result.clinicalConcerns.length > 0 ? `
                <h4>Clinical Concerns:</h4>
                <ul>${result.clinicalConcerns.map(concern => `<li>${concern}</li>`).join('')}</ul>
            ` : ''}
        </div>
    `).join('')}
    
    ${report.recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>Recommendations</h2>
            <ul>
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    ` : ''}
    
    <div style="margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 8px; font-size: 12px; color: #64748b;">
        <p>This report validates clinical-grade accuracy for therapeutic data processing, crisis safety protocols, 
        and accessibility compliance according to FullMind's clinical requirements.</p>
        <p>Critical tests must maintain 99.9%+ accuracy for assessment scoring and 100% accuracy for crisis detection.</p>
    </div>
</body>
</html>
    `.trim();
  }

  private displaySummary(report: ClinicalTestReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('🏥 CLINICAL TESTING SUMMARY');
    console.log('='.repeat(60));
    
    const statusIcon = report.criticalTestsPassed ? '✅' : '❌';
    const statusText = report.criticalTestsPassed ? 'CLINICAL COMPLIANCE ACHIEVED' : 'CRITICAL FAILURES DETECTED';
    
    console.log(`${statusIcon} Status: ${statusText}`);
    console.log(`📊 Overall Accuracy: ${(report.overallAccuracy * 100).toFixed(1)}%`);
    console.log(`✅ Tests Passed: ${report.passedTests}/${report.totalTests}`);
    console.log(`⏱️  Total Duration: ${Date.now() - this.startTime}ms`);
    
    console.log('\n📋 Clinical Compliance:');
    console.log(`   Assessment Accuracy: ${(report.clinicalCompliance.assessmentAccuracy * 100).toFixed(3)}% (Required: 99.9%)`);
    console.log(`   Crisis Safety: ${(report.clinicalCompliance.crisisSafety * 100).toFixed(1)}% (Required: 100%)`);
    console.log(`   Export Integrity: ${(report.clinicalCompliance.exportIntegrity * 100).toFixed(1)}% (Required: 95%)`);
    console.log(`   Accessibility: ${(report.clinicalCompliance.accessibilityCompliance * 100).toFixed(1)}% (Required: 90%)`);
    
    if (report.recommendations.length > 0) {
      console.log('\n⚠️  Recommendations:');
      report.recommendations.forEach(rec => console.log(`   • ${rec}`));
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Exit with appropriate code
    process.exit(report.criticalTestsPassed ? 0 : 1);
  }
}

// ============================================================================
// CLI EXECUTION
// ============================================================================

if (require.main === module) {
  const runner = new ClinicalTestRunner();
  runner.runClinicalTests().catch(error => {
    console.error('❌ Clinical test runner failed:', error);
    process.exit(1);
  });
}

export { ClinicalTestRunner, ClinicalTestReport, TestResults };