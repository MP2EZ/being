/**
 * Haptic Test Runner
 * 
 * Comprehensive test orchestration for haptic feedback system including:
 * - Automated test suite execution and reporting
 * - Clinical compliance validation and certification
 * - Performance benchmarking and optimization recommendations
 * - Accessibility compliance verification
 * - Integration testing with existing Being. architecture
 * - Production readiness assessment
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

interface HapticTestSuite {
  name: string;
  file: string;
  category: 'clinical' | 'integration' | 'accessibility' | 'performance';
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedDuration: number; // minutes
  dependencies: string[];
}

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  accuracy: number;
  clinicalCompliance: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

interface HapticTestReport {
  timestamp: Date;
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  overallAccuracy: number;
  clinicalCompliance: boolean;
  accessibilityCompliance: boolean;
  performanceMet: boolean;
  productionReady: boolean;
  results: TestResult[];
  recommendations: string[];
  certifications: string[];
}

class HapticTestRunner {
  private testSuites: HapticTestSuite[] = [
    {
      name: 'Clinical Reliability',
      file: 'haptic-clinical-reliability.test.ts',
      category: 'clinical',
      priority: 'critical',
      estimatedDuration: 45,
      dependencies: [],
    },
    {
      name: 'Integration Testing',
      file: 'haptic-integration.test.ts',
      category: 'integration',
      priority: 'critical',
      estimatedDuration: 30,
      dependencies: ['Clinical Reliability'],
    },
    {
      name: 'Accessibility Compliance',
      file: 'haptic-accessibility.test.ts',
      category: 'accessibility',
      priority: 'critical',
      estimatedDuration: 60,
      dependencies: ['Integration Testing'],
    },
    {
      name: 'Performance Optimization',
      file: 'haptic-performance.test.ts',
      category: 'performance',
      priority: 'high',
      estimatedDuration: 40,
      dependencies: ['Clinical Reliability', 'Integration Testing'],
    },
  ];

  private results: TestResult[] = [];
  private startTime: Date = new Date();

  async runAllTests(): Promise<HapticTestReport> {
    console.log('🔊 Being. Haptic Feedback System - Comprehensive Test Suite');
    console.log('=' .repeat(80));
    console.log(`Started: ${this.startTime.toISOString()}`);
    console.log(`Total Test Suites: ${this.testSuites.length}`);
    console.log(`Estimated Duration: ${this.getTotalEstimatedDuration()} minutes`);
    console.log('=' .repeat(80));

    this.startTime = new Date();
    this.results = [];

    // Run test suites in dependency order
    const executionOrder = this.getExecutionOrder();
    
    for (const suite of executionOrder) {
      console.log(`\n🔄 Running: ${suite.name} (${suite.category})`);
      console.log(`⏱️  Estimated Duration: ${suite.estimatedDuration} minutes`);
      
      const result = await this.runTestSuite(suite);
      this.results.push(result);
      
      if (result.passed) {
        console.log(`✅ ${suite.name}: PASSED (Accuracy: ${(result.accuracy * 100).toFixed(1)}%)`);
      } else {
        console.log(`❌ ${suite.name}: FAILED`);
        result.errors.forEach(error => console.log(`   Error: ${error}`));
      }
      
      // Stop on critical failures
      if (!result.passed && suite.priority === 'critical') {
        console.log(`\n🚨 Critical test suite failed: ${suite.name}`);
        console.log('🛑 Stopping test execution due to critical failure');
        break;
      }
    }

    const report = this.generateReport();
    await this.saveReport(report);
    this.printSummary(report);
    
    return report;
  }

  private async runTestSuite(suite: HapticTestSuite): Promise<TestResult> {
    const suiteStart = Date.now();
    
    try {
      // Run Jest test suite with specific configuration
      const testCommand = `npx jest src/test/haptic/${suite.file} --verbose --json --outputFile=temp-${suite.name.replace(/\s+/g, '-')}-results.json`;
      
      console.log(`   📋 Executing: ${suite.file}`);
      
      // Execute test suite
      const output = execSync(testCommand, { 
        encoding: 'utf8',
        timeout: suite.estimatedDuration * 60 * 1000, // Convert to milliseconds
      });

      // Parse Jest results
      const resultsFile = `temp-${suite.name.replace(/\s+/g, '-')}-results.json`;
      const jestResults = await this.parseJestResults(resultsFile);
      
      // Clean up temp file
      try {
        await fs.unlink(resultsFile);
      } catch (cleanupError) {
        console.warn(`   ⚠️  Could not clean up temp file: ${resultsFile}`);
      }

      const duration = (Date.now() - suiteStart) / 1000 / 60; // Convert to minutes
      
      return {
        suite: suite.name,
        passed: jestResults.success,
        duration,
        accuracy: jestResults.accuracy,
        clinicalCompliance: jestResults.clinicalCompliance,
        errors: jestResults.errors,
        warnings: jestResults.warnings,
        recommendations: jestResults.recommendations,
      };
    } catch (error) {
      const duration = (Date.now() - suiteStart) / 1000 / 60;
      
      return {
        suite: suite.name,
        passed: false,
        duration,
        accuracy: 0,
        clinicalCompliance: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        recommendations: [`Investigate test failure in ${suite.name}`],
      };
    }
  }

  private async parseJestResults(resultsFile: string): Promise<{
    success: boolean;
    accuracy: number;
    clinicalCompliance: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    try {
      const resultsContent = await fs.readFile(resultsFile, 'utf8');
      const jestOutput = JSON.parse(resultsContent);
      
      // Parse Jest test results
      const totalTests = jestOutput.numTotalTests || 0;
      const passedTests = jestOutput.numPassedTests || 0;
      const failedTests = jestOutput.numFailedTests || 0;
      
      const accuracy = totalTests > 0 ? passedTests / totalTests : 0;
      const success = failedTests === 0 && totalTests > 0;
      const clinicalCompliance = accuracy >= 0.999; // 99.9% requirement for clinical
      
      const errors: string[] = [];
      const warnings: string[] = [];
      const recommendations: string[] = [];
      
      // Extract errors from failed tests
      if (jestOutput.testResults) {
        for (const testResult of jestOutput.testResults) {
          if (testResult.message) {
            const failureMessages = testResult.message.split('\n')
              .filter((line: string) => line.includes('Error:') || line.includes('Failed:'))
              .slice(0, 5); // Limit to first 5 errors
            errors.push(...failureMessages);
          }
          
          // Extract assertion failures for recommendations
          if (testResult.assertionResults) {
            for (const assertion of testResult.assertionResults) {
              if (assertion.status === 'failed' && assertion.failureMessages) {
                assertion.failureMessages.forEach((message: string) => {
                  if (message.includes('accuracy') || message.includes('clinical')) {
                    recommendations.push('Review clinical accuracy requirements and implementation');
                  }
                  if (message.includes('performance') || message.includes('battery')) {
                    recommendations.push('Optimize performance and battery usage');
                  }
                  if (message.includes('accessibility') || message.includes('WCAG')) {
                    recommendations.push('Address accessibility compliance issues');
                  }
                });
              }
            }
          }
        }
      }
      
      return {
        success,
        accuracy,
        clinicalCompliance,
        errors: [...new Set(errors)], // Remove duplicates
        warnings: [...new Set(warnings)],
        recommendations: [...new Set(recommendations)],
      };
    } catch (parseError) {
      console.warn(`   ⚠️  Could not parse Jest results: ${parseError}`);
      
      return {
        success: false,
        accuracy: 0,
        clinicalCompliance: false,
        errors: ['Failed to parse test results'],
        warnings: [],
        recommendations: ['Check Jest configuration and test output'],
      };
    }
  }

  private getExecutionOrder(): HapticTestSuite[] {
    const executed = new Set<string>();
    const order: HapticTestSuite[] = [];
    
    const addToOrder = (suiteName: string) => {
      if (executed.has(suiteName)) return;
      
      const suite = this.testSuites.find(s => s.name === suiteName);
      if (!suite) return;
      
      // Add dependencies first
      suite.dependencies.forEach(dep => addToOrder(dep));
      
      // Add this suite
      order.push(suite);
      executed.add(suiteName);
    };
    
    // Add critical suites first, then high priority, etc.
    const priorityOrder = ['critical', 'high', 'medium', 'low'] as const;
    
    for (const priority of priorityOrder) {
      this.testSuites
        .filter(suite => suite.priority === priority)
        .forEach(suite => addToOrder(suite.name));
    }
    
    return order;
  }

  private getTotalEstimatedDuration(): number {
    return this.testSuites.reduce((total, suite) => total + suite.estimatedDuration, 0);
  }

  private generateReport(): HapticTestReport {
    const endTime = new Date();
    const totalDuration = (endTime.getTime() - this.startTime.getTime()) / 1000 / 60; // minutes
    
    const passedSuites = this.results.filter(r => r.passed).length;
    const failedSuites = this.results.filter(r => !r.passed).length;
    const totalSuites = this.results.length;
    
    const overallAccuracy = totalSuites > 0 
      ? this.results.reduce((sum, r) => sum + r.accuracy, 0) / totalSuites 
      : 0;
    
    const clinicalCompliance = this.results
      .filter(r => r.suite === 'Clinical Reliability')
      .every(r => r.clinicalCompliance);
    
    const accessibilityCompliance = this.results
      .filter(r => r.suite === 'Accessibility Compliance')
      .every(r => r.passed);
    
    const performanceMet = this.results
      .filter(r => r.suite === 'Performance Optimization')
      .every(r => r.passed);
    
    const productionReady = clinicalCompliance && 
                           accessibilityCompliance && 
                           performanceMet && 
                           overallAccuracy >= 0.999;
    
    // Generate recommendations
    const recommendations: string[] = [];
    const certifications: string[] = [];
    
    // Collect all recommendations
    this.results.forEach(result => {
      recommendations.push(...result.recommendations);
    });
    
    // Add certifications based on compliance
    if (clinicalCompliance) {
      certifications.push('Clinical-Grade Reliability Certified');
    }
    if (accessibilityCompliance) {
      certifications.push('WCAG 2.1 AA Accessibility Compliant');
    }
    if (performanceMet) {
      certifications.push('Performance Optimized for Production');
    }
    if (productionReady) {
      certifications.push('Production Ready - Mental Health App Certified');
    }
    
    // Add specific recommendations
    if (!clinicalCompliance) {
      recommendations.push('Address clinical accuracy requirements before production deployment');
    }
    if (!accessibilityCompliance) {
      recommendations.push('Complete accessibility compliance testing and fixes');
    }
    if (!performanceMet) {
      recommendations.push('Optimize performance for battery efficiency and response times');
    }
    if (overallAccuracy < 0.95) {
      recommendations.push('Improve overall test accuracy and reliability');
    }
    
    return {
      timestamp: endTime,
      totalSuites,
      passedSuites,
      failedSuites,
      overallAccuracy,
      clinicalCompliance,
      accessibilityCompliance,
      performanceMet,
      productionReady,
      results: this.results,
      recommendations: [...new Set(recommendations)],
      certifications,
    };
  }

  private async saveReport(report: HapticTestReport): Promise<void> {
    const reportsDir = path.join(process.cwd(), 'reports', 'haptic');
    
    try {
      // Ensure reports directory exists
      await fs.mkdir(reportsDir, { recursive: true });
      
      // Save JSON report
      const jsonReportPath = path.join(reportsDir, `haptic-test-report-${report.timestamp.toISOString().replace(/[:.]/g, '-')}.json`);
      await fs.writeFile(jsonReportPath, JSON.stringify(report, null, 2));
      
      // Save HTML report
      const htmlReport = this.generateHTMLReport(report);
      const htmlReportPath = path.join(reportsDir, `haptic-test-report-${report.timestamp.toISOString().replace(/[:.]/g, '-')}.html`);
      await fs.writeFile(htmlReportPath, htmlReport);
      
      // Create latest report symlinks
      const latestJsonPath = path.join(reportsDir, 'latest-haptic-report.json');
      const latestHtmlPath = path.join(reportsDir, 'latest-haptic-report.html');
      
      await fs.writeFile(latestJsonPath, JSON.stringify(report, null, 2));
      await fs.writeFile(latestHtmlPath, htmlReport);
      
      console.log(`\n📊 Reports saved:`);
      console.log(`   JSON: ${jsonReportPath}`);
      console.log(`   HTML: ${htmlReportPath}`);
      console.log(`   Latest: ${latestHtmlPath}`);
    } catch (saveError) {
      console.error('❌ Failed to save reports:', saveError);
    }
  }

  private generateHTMLReport(report: HapticTestReport): string {
    const statusColor = report.productionReady ? '#10B981' : '#EF4444'; // Green or Red
    const complianceColor = report.clinicalCompliance ? '#10B981' : '#F59E0B'; // Green or Orange
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Being. Haptic Feedback - Test Report</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            margin: 0; 
            padding: 20px; 
            background-color: #f8fafc;
        }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #1f2937; font-size: 2.5rem; margin: 0; font-weight: 700; }
        .subtitle { color: #6b7280; font-size: 1.1rem; margin: 5px 0; }
        .status-badge { 
            display: inline-block; 
            padding: 8px 16px; 
            border-radius: 20px; 
            color: white; 
            font-weight: 600;
            font-size: 0.9rem;
            background-color: ${statusColor};
        }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { 
            background: #f9fafb; 
            padding: 20px; 
            border-radius: 8px; 
            text-align: center; 
            border-left: 4px solid ${complianceColor};
        }
        .metric-value { font-size: 2rem; font-weight: 700; color: #1f2937; }
        .metric-label { color: #6b7280; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .section { margin: 30px 0; }
        .section-title { 
            font-size: 1.5rem; 
            font-weight: 600; 
            color: #1f2937; 
            border-bottom: 2px solid #e5e7eb; 
            padding-bottom: 10px; 
        }
        .test-results { display: grid; gap: 15px; }
        .test-result { 
            background: #f9fafb; 
            border-left: 4px solid ${report.clinicalCompliance ? '#10B981' : '#EF4444'}; 
            padding: 15px; 
            border-radius: 0 8px 8px 0; 
        }
        .test-name { font-weight: 600; color: #1f2937; }
        .test-status { 
            display: inline-block; 
            margin-left: 10px; 
            padding: 2px 8px; 
            border-radius: 12px; 
            font-size: 0.8rem; 
            font-weight: 500;
        }
        .passed { background: #dcfce7; color: #166534; }
        .failed { background: #fee2e2; color: #991b1b; }
        .test-details { margin-top: 10px; font-size: 0.9rem; color: #6b7280; }
        .certification-list { list-style: none; padding: 0; }
        .certification { 
            background: #dcfce7; 
            color: #166534; 
            padding: 10px 15px; 
            margin: 5px 0; 
            border-radius: 6px; 
            border-left: 4px solid #10B981;
        }
        .recommendation { 
            background: #fef3c7; 
            color: #92400e; 
            padding: 10px 15px; 
            margin: 5px 0; 
            border-radius: 6px; 
            border-left: 4px solid #f59e0b;
        }
        .timestamp { text-align: center; color: #6b7280; font-size: 0.9rem; margin-top: 30px; }
        .clinical-note {
            background: #eff6ff;
            border: 1px solid #dbeafe;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .clinical-note-title {
            color: #1e40af;
            font-weight: 600;
            font-size: 1.1rem;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">🔊 Being. Haptic Feedback</h1>
            <p class="subtitle">Comprehensive Test Suite Report</p>
            <span class="status-badge">${report.productionReady ? '✅ Production Ready' : '⚠️ Needs Attention'}</span>
        </div>

        <div class="clinical-note">
            <div class="clinical-note-title">Clinical Mental Health Application</div>
            <p>This haptic feedback system is designed for clinical-grade mental health applications with 99.9% reliability requirements for therapeutic and crisis intervention scenarios.</p>
        </div>

        <div class="metrics">
            <div class="metric">
                <div class="metric-value">${report.passedSuites}/${report.totalSuites}</div>
                <div class="metric-label">Test Suites Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${(report.overallAccuracy * 100).toFixed(1)}%</div>
                <div class="metric-label">Overall Accuracy</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.clinicalCompliance ? 'YES' : 'NO'}</div>
                <div class="metric-label">Clinical Compliant</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.accessibilityCompliance ? 'YES' : 'NO'}</div>
                <div class="metric-label">WCAG AA Compliant</div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Test Results</h2>
            <div class="test-results">
                ${report.results.map(result => `
                    <div class="test-result">
                        <div class="test-name">
                            ${result.suite}
                            <span class="test-status ${result.passed ? 'passed' : 'failed'}">
                                ${result.passed ? '✅ PASSED' : '❌ FAILED'}
                            </span>
                        </div>
                        <div class="test-details">
                            <strong>Accuracy:</strong> ${(result.accuracy * 100).toFixed(1)}% | 
                            <strong>Duration:</strong> ${result.duration.toFixed(1)} minutes | 
                            <strong>Clinical Compliance:</strong> ${result.clinicalCompliance ? 'YES' : 'NO'}
                            ${result.errors.length > 0 ? `<br><strong>Errors:</strong> ${result.errors.join(', ')}` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        ${report.certifications.length > 0 ? `
        <div class="section">
            <h2 class="section-title">🏆 Certifications Achieved</h2>
            <ul class="certification-list">
                ${report.certifications.map(cert => `<li class="certification">✅ ${cert}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        ${report.recommendations.length > 0 ? `
        <div class="section">
            <h2 class="section-title">📋 Recommendations</h2>
            <div>
                ${report.recommendations.map(rec => `<div class="recommendation">⚠️ ${rec}</div>`).join('')}
            </div>
        </div>
        ` : ''}

        <div class="timestamp">
            Report generated: ${report.timestamp.toLocaleString()}
        </div>
    </div>
</body>
</html>`;
  }

  private printSummary(report: HapticTestReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('🔊 BEING HAPTIC FEEDBACK SYSTEM - TEST SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`\n📊 RESULTS:`);
    console.log(`   Total Test Suites: ${report.totalSuites}`);
    console.log(`   Passed: ${report.passedSuites}`);
    console.log(`   Failed: ${report.failedSuites}`);
    console.log(`   Overall Accuracy: ${(report.overallAccuracy * 100).toFixed(1)}%`);
    
    console.log(`\n🏥 CLINICAL COMPLIANCE:`);
    console.log(`   Clinical-Grade Reliability: ${report.clinicalCompliance ? '✅ CERTIFIED' : '❌ NOT MET'}`);
    console.log(`   99.9% Accuracy Requirement: ${report.overallAccuracy >= 0.999 ? '✅ MET' : '❌ NOT MET'}`);
    
    console.log(`\n♿ ACCESSIBILITY COMPLIANCE:`);
    console.log(`   WCAG 2.1 AA Compliance: ${report.accessibilityCompliance ? '✅ CERTIFIED' : '❌ NOT MET'}`);
    
    console.log(`\n⚡ PERFORMANCE:`);
    console.log(`   Battery & Response Time: ${report.performanceMet ? '✅ OPTIMIZED' : '❌ NEEDS WORK'}`);
    
    console.log(`\n🚀 PRODUCTION READINESS:`);
    console.log(`   Ready for Deployment: ${report.productionReady ? '✅ READY' : '❌ NOT READY'}`);
    
    if (report.certifications.length > 0) {
      console.log(`\n🏆 CERTIFICATIONS ACHIEVED:`);
      report.certifications.forEach(cert => {
        console.log(`   ✅ ${cert}`);
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log(`\n📋 RECOMMENDATIONS:`);
      report.recommendations.slice(0, 5).forEach(rec => { // Show top 5 recommendations
        console.log(`   ⚠️  ${rec}`);
      });
      
      if (report.recommendations.length > 5) {
        console.log(`   ... and ${report.recommendations.length - 5} more (see full report)`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    
    if (report.productionReady) {
      console.log('🎉 HAPTIC FEEDBACK SYSTEM: READY FOR PRODUCTION DEPLOYMENT! 🎉');
    } else {
      console.log('⚠️  HAPTIC FEEDBACK SYSTEM: REQUIRES ATTENTION BEFORE DEPLOYMENT ⚠️');
    }
    
    console.log('='.repeat(80));
  }
}

// CLI Interface
if (require.main === module) {
  const runner = new HapticTestRunner();
  
  runner.runAllTests()
    .then(report => {
      process.exit(report.productionReady ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

export { HapticTestRunner, type HapticTestReport, type TestResult };