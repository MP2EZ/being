#!/usr/bin/env ts-node

/**
 * Widget System Validation Script
 * Comprehensive validation of the Being. widget integration
 * Ensures clinical-grade reliability and compliance
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  category: string;
  passed: boolean;
  duration: number;
  details: string;
  critical: boolean;
}

interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  coverage: number;
  duration: number;
}

class WidgetSystemValidator {
  private results: ValidationResult[] = [];
  private startTime = Date.now();

  async validateComplete(): Promise<void> {
    console.log('🚀 Starting Being. Widget System Validation...\n');

    try {
      // 1. Validate test infrastructure
      await this.validateTestInfrastructure();

      // 2. Run comprehensive integration tests
      await this.runComprehensiveTests();

      // 3. Validate performance requirements
      await this.validatePerformanceRequirements();

      // 4. Validate security and privacy
      await this.validateSecurityCompliance();

      // 5. Validate accessibility compliance
      await this.validateAccessibilityCompliance();

      // 6. Run end-to-end user journeys
      await this.runEndToEndTests();

      // 7. Generate final report
      this.generateFinalReport();

    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    }
  }

  private async validateTestInfrastructure(): Promise<void> {
    console.log('📋 Validating test infrastructure...');
    const startTime = Date.now();

    try {
      // Check test files exist
      const testFiles = [
        '__tests__/integration/widget-comprehensive.integration.test.ts',
        '__tests__/performance/widget-performance.integration.test.ts',
        '__tests__/security/widget-security.integration.test.ts',
        '__tests__/accessibility/widget-accessibility.comprehensive.test.tsx',
        '__tests__/e2e/widget-end-to-end.test.ts',
        '__tests__/utils/widgetTestInfrastructure.ts'
      ];

      for (const file of testFiles) {
        if (!existsSync(file)) {
          throw new Error(`Required test file missing: ${file}`);
        }
      }

      // Validate TypeScript compilation
      execSync('npx tsc --noEmit --project __tests__', { stdio: 'pipe' });

      this.addResult({
        category: 'Test Infrastructure',
        passed: true,
        duration: Date.now() - startTime,
        details: `All ${testFiles.length} test files present and TypeScript valid`,
        critical: true
      });

      console.log('✅ Test infrastructure validated\n');

    } catch (error) {
      this.addResult({
        category: 'Test Infrastructure',
        passed: false,
        duration: Date.now() - startTime,
        details: `Infrastructure validation failed: ${(error as Error).message}`,
        critical: true
      });

      throw error;
    }
  }

  private async runComprehensiveTests(): Promise<void> {
    console.log('🔬 Running comprehensive integration tests...');
    const startTime = Date.now();

    try {
      const output = execSync('npm run test:widget-comprehensive', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const metrics = this.parseTestOutput(output);

      this.addResult({
        category: 'Comprehensive Integration',
        passed: metrics.failedTests === 0,
        duration: Date.now() - startTime,
        details: `${metrics.passedTests}/${metrics.totalTests} tests passed, ${metrics.coverage}% coverage`,
        critical: true
      });

      console.log(`✅ Comprehensive tests completed: ${metrics.passedTests}/${metrics.totalTests} passed\n`);

    } catch (error) {
      this.addResult({
        category: 'Comprehensive Integration',
        passed: false,
        duration: Date.now() - startTime,
        details: `Integration tests failed: ${(error as Error).message}`,
        critical: true
      });

      console.log('❌ Comprehensive tests failed\n');
    }
  }

  private async validatePerformanceRequirements(): Promise<void> {
    console.log('⚡ Validating performance requirements...');
    const startTime = Date.now();

    try {
      const output = execSync('npm run test:widget-performance', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const metrics = this.parseTestOutput(output);
      const performanceMetrics = this.extractPerformanceMetrics(output);

      const criticalPerformanceMet = 
        performanceMetrics.crisisResponseMs < 200 &&
        performanceMetrics.widgetUpdateMs < 1000 &&
        performanceMetrics.deepLinkResponseMs < 500;

      this.addResult({
        category: 'Performance Requirements',
        passed: metrics.failedTests === 0 && criticalPerformanceMet,
        duration: Date.now() - startTime,
        details: `Crisis: ${performanceMetrics.crisisResponseMs}ms, Updates: ${performanceMetrics.widgetUpdateMs}ms, Deep links: ${performanceMetrics.deepLinkResponseMs}ms`,
        critical: true
      });

      if (criticalPerformanceMet) {
        console.log('✅ Performance requirements met\n');
      } else {
        console.log('⚠️  Performance requirements not fully met\n');
      }

    } catch (error) {
      this.addResult({
        category: 'Performance Requirements',
        passed: false,
        duration: Date.now() - startTime,
        details: `Performance validation failed: ${(error as Error).message}`,
        critical: true
      });

      console.log('❌ Performance validation failed\n');
    }
  }

  private async validateSecurityCompliance(): Promise<void> {
    console.log('🔐 Validating security and privacy compliance...');
    const startTime = Date.now();

    try {
      const output = execSync('npm run test:widget-security', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const metrics = this.parseTestOutput(output);
      const privacyViolations = this.extractPrivacyViolations(output);

      this.addResult({
        category: 'Security & Privacy',
        passed: metrics.failedTests === 0 && privacyViolations === 0,
        duration: Date.now() - startTime,
        details: `${metrics.passedTests} security tests passed, ${privacyViolations} privacy violations detected`,
        critical: true
      });

      if (privacyViolations === 0) {
        console.log('✅ Security and privacy compliance validated\n');
      } else {
        console.log(`❌ ${privacyViolations} privacy violations detected\n`);
      }

    } catch (error) {
      this.addResult({
        category: 'Security & Privacy',
        passed: false,
        duration: Date.now() - startTime,
        details: `Security validation failed: ${(error as Error).message}`,
        critical: true
      });

      console.log('❌ Security validation failed\n');
    }
  }

  private async validateAccessibilityCompliance(): Promise<void> {
    console.log('♿ Validating accessibility compliance...');
    const startTime = Date.now();

    try {
      const output = execSync('npm run test:widget-accessibility', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const metrics = this.parseTestOutput(output);
      const accessibilityViolations = this.extractAccessibilityViolations(output);

      this.addResult({
        category: 'Accessibility (WCAG AA)',
        passed: metrics.failedTests === 0 && accessibilityViolations === 0,
        duration: Date.now() - startTime,
        details: `${metrics.passedTests} accessibility tests passed, ${accessibilityViolations} WCAG violations`,
        critical: false
      });

      if (accessibilityViolations === 0) {
        console.log('✅ WCAG AA accessibility compliance validated\n');
      } else {
        console.log(`⚠️  ${accessibilityViolations} accessibility issues found\n`);
      }

    } catch (error) {
      this.addResult({
        category: 'Accessibility (WCAG AA)',
        passed: false,
        duration: Date.now() - startTime,
        details: `Accessibility validation failed: ${(error as Error).message}`,
        critical: false
      });

      console.log('⚠️  Accessibility validation had issues\n');
    }
  }

  private async runEndToEndTests(): Promise<void> {
    console.log('🔄 Running end-to-end user journey tests...');
    const startTime = Date.now();

    try {
      const output = execSync('npm run test:widget-e2e', {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 120000 // 2 minute timeout for E2E tests
      });

      const metrics = this.parseTestOutput(output);
      const userJourneys = this.extractUserJourneyMetrics(output);

      this.addResult({
        category: 'End-to-End User Journeys',
        passed: metrics.failedTests === 0,
        duration: Date.now() - startTime,
        details: `${userJourneys.completedJourneys}/${userJourneys.totalJourneys} user journeys completed successfully`,
        critical: true
      });

      console.log(`✅ E2E tests completed: ${userJourneys.completedJourneys}/${userJourneys.totalJourneys} journeys successful\n`);

    } catch (error) {
      this.addResult({
        category: 'End-to-End User Journeys',
        passed: false,
        duration: Date.now() - startTime,
        details: `E2E tests failed: ${(error as Error).message}`,
        critical: true
      });

      console.log('❌ End-to-end tests failed\n');
    }
  }

  private generateFinalReport(): void {
    const totalDuration = Date.now() - this.startTime;
    const passedResults = this.results.filter(r => r.passed);
    const failedResults = this.results.filter(r => !r.passed);
    const criticalFailures = failedResults.filter(r => r.critical);

    console.log('📊 FULLMIND WIDGET SYSTEM VALIDATION REPORT');
    console.log('=' .repeat(60));
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`Categories Validated: ${this.results.length}`);
    console.log(`Passed: ${passedResults.length}`);
    console.log(`Failed: ${failedResults.length}`);
    console.log(`Critical Failures: ${criticalFailures.length}`);
    console.log();

    // Detailed results
    this.results.forEach(result => {
      const icon = result.passed ? '✅' : (result.critical ? '❌' : '⚠️');
      const duration = (result.duration / 1000).toFixed(2);
      console.log(`${icon} ${result.category} (${duration}s)`);
      console.log(`   ${result.details}`);
      console.log();
    });

    // Final verdict
    const overallPassed = criticalFailures.length === 0;
    const warningCount = failedResults.length - criticalFailures.length;

    if (overallPassed) {
      console.log('🎉 WIDGET SYSTEM VALIDATION PASSED!');
      if (warningCount > 0) {
        console.log(`⚠️  Note: ${warningCount} non-critical warnings to address`);
      }
      console.log();
      console.log('✅ Widget system is ready for clinical deployment');
      console.log('✅ Privacy compliance validated (zero clinical data exposure)');
      console.log('✅ Performance requirements met for therapeutic use');
      console.log('✅ End-to-end user journeys validated');
      if (warningCount === 0) {
        console.log('✅ Full WCAG AA accessibility compliance');
      }
    } else {
      console.log('❌ WIDGET SYSTEM VALIDATION FAILED!');
      console.log(`${criticalFailures.length} critical issues must be resolved before deployment:`);
      
      criticalFailures.forEach(failure => {
        console.log(`   • ${failure.category}: ${failure.details}`);
      });

      if (warningCount > 0) {
        console.log(`\nAdditionally, ${warningCount} warnings should be addressed.`);
      }

      process.exit(1);
    }

    console.log();
    console.log('For detailed test results, run:');
    console.log('  npm run test:widget -- --verbose');
    console.log();
    console.log('For coverage reports, run:');
    console.log('  npm run test:coverage -- --testPathPattern=widget');
  }

  private addResult(result: ValidationResult): void {
    this.results.push(result);
  }

  private parseTestOutput(output: string): TestMetrics {
    const testMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    const coverageMatch = output.match(/All files\s+\|\s+[\d.]+\s+\|\s+([\d.]+)/);
    const durationMatch = output.match(/Time:\s+([\d.]+)\s*s/);

    const failed = testMatch ? parseInt(testMatch[1]) : 0;
    const passed = testMatch ? parseInt(testMatch[2]) : 0;
    const total = testMatch ? parseInt(testMatch[3]) : 0;
    const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;
    const duration = durationMatch ? parseFloat(durationMatch[1]) * 1000 : 0;

    return {
      totalTests: total,
      passedTests: passed,
      failedTests: failed,
      coverage,
      duration
    };
  }

  private extractPerformanceMetrics(output: string): {
    crisisResponseMs: number;
    widgetUpdateMs: number;
    deepLinkResponseMs: number;
  } {
    // Extract performance metrics from test output
    const crisisMatch = output.match(/Crisis.*?(\d+\.?\d*)ms/i);
    const updateMatch = output.match(/Widget.*?Update.*?(\d+\.?\d*)ms/i);
    const deepLinkMatch = output.match(/Deep.*?Link.*?(\d+\.?\d*)ms/i);

    return {
      crisisResponseMs: crisisMatch ? parseFloat(crisisMatch[1]) : 999,
      widgetUpdateMs: updateMatch ? parseFloat(updateMatch[1]) : 999,
      deepLinkResponseMs: deepLinkMatch ? parseFloat(deepLinkMatch[1]) : 999
    };
  }

  private extractPrivacyViolations(output: string): number {
    const violationMatch = output.match(/(\d+)\s+privacy\s+violations/i);
    return violationMatch ? parseInt(violationMatch[1]) : 0;
  }

  private extractAccessibilityViolations(output: string): number {
    const violationMatch = output.match(/(\d+)\s+accessibility\s+violations/i);
    return violationMatch ? parseInt(violationMatch[1]) : 0;
  }

  private extractUserJourneyMetrics(output: string): {
    completedJourneys: number;
    totalJourneys: number;
  } {
    const journeyMatch = output.match(/(\d+)\/(\d+)\s+.*journeys?\s+.*success/i);
    return {
      completedJourneys: journeyMatch ? parseInt(journeyMatch[1]) : 0,
      totalJourneys: journeyMatch ? parseInt(journeyMatch[2]) : 1
    };
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new WidgetSystemValidator();
  validator.validateComplete().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

export { WidgetSystemValidator };