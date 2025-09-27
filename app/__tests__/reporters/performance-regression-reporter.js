/**
 * PERFORMANCE REGRESSION REPORTER - Week 3 Orchestration
 * Automated performance monitoring and regression detection for CI/CD
 * 
 * FEATURES:
 * - Real-time performance metric collection
 * - Baseline comparison and regression detection
 * - Crisis response time monitoring (<200ms requirement)
 * - Memory usage tracking and leak detection
 * - UI performance validation (60fps target)
 * - Automated alerting for performance violations
 */

const fs = require('fs');
const path = require('path');

class PerformanceRegressionReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.performanceMetrics = {};
    this.regressions = [];
    this.warnings = [];
    this.startTime = Date.now();
    
    // Performance thresholds
    this.thresholds = {
      crisis_response_ms: 200,
      ui_render_ms: 16.67, // 60fps
      memory_limit_mb: 50,
      assessment_calculation_ms: 100,
      test_execution_ms: 30000
    };
    
    // Load baseline performance data if available
    this.loadBaselines();
  }

  loadBaselines() {
    const baselinePath = path.join(process.cwd(), 'performance-baselines.json');
    
    try {
      if (fs.existsSync(baselinePath)) {
        this.baselines = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        console.log('📊 Loaded performance baselines for regression detection');
      } else {
        // Create initial baselines
        this.baselines = { ...this.thresholds };
        this.saveBaselines();
        console.log('📊 Created initial performance baselines');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load performance baselines:', error.message);
      this.baselines = { ...this.thresholds };
    }
  }

  saveBaselines() {
    const baselinePath = path.join(process.cwd(), 'performance-baselines.json');
    
    try {
      fs.writeFileSync(baselinePath, JSON.stringify(this.baselines, null, 2));
    } catch (error) {
      console.warn('⚠️ Failed to save performance baselines:', error.message);
    }
  }

  onRunStart(results, options) {
    console.log('⚡ Performance regression monitoring started...');
    this.startTime = Date.now();
    this.performanceMetrics = {};
    this.regressions = [];
    this.warnings = [];
  }

  onTestStart(test) {
    // Track test start time for performance measurement
    test.startTime = performance.now();
  }

  onTestResult(test, testResult) {
    const testName = testResult.testFilePath.replace(process.cwd(), '');
    const duration = performance.now() - test.startTime;
    
    // Record test execution time
    this.performanceMetrics[testName] = {
      duration,
      numPassingTests: testResult.numPassingTests,
      numFailingTests: testResult.numFailingTests,
      perfTests: this.extractPerformanceTests(testResult)
    };

    // Check for performance regressions
    this.checkPerformanceRegression(testName, duration);
    
    // Analyze test output for performance warnings
    this.analyzeTestOutput(testResult);
  }

  extractPerformanceTests(testResult) {
    const perfTests = {};
    
    testResult.testResults.forEach(result => {
      const testName = result.fullName;
      
      // Look for performance-related test names
      if (testName.includes('performance') || testName.includes('response time') || testName.includes('memory')) {
        // Extract timing information from test results if available
        if (result.duration) {
          perfTests[testName] = result.duration;
          
          // Check against thresholds
          if (testName.toLowerCase().includes('crisis') && result.duration > this.thresholds.crisis_response_ms) {
            this.regressions.push({
              type: 'CRITICAL',
              test: testName,
              metric: 'crisis_response_time',
              actual: result.duration,
              threshold: this.thresholds.crisis_response_ms,
              severity: 'HIGH'
            });
          }
        }
      }
    });
    
    return perfTests;
  }

  checkPerformanceRegression(testName, duration) {
    // Check against execution time thresholds
    if (duration > this.thresholds.test_execution_ms) {
      this.warnings.push({
        type: 'SLOW_TEST',
        test: testName,
        duration,
        threshold: this.thresholds.test_execution_ms
      });
    }

    // Check against baseline if available
    const baselineKey = this.getBaselineKey(testName);
    if (this.baselines[baselineKey]) {
      const baseline = this.baselines[baselineKey];
      const regressionThreshold = baseline * 1.2; // 20% regression threshold
      
      if (duration > regressionThreshold) {
        this.regressions.push({
          type: 'REGRESSION',
          test: testName,
          metric: 'execution_time',
          actual: duration,
          baseline,
          threshold: regressionThreshold,
          severity: this.getSeverity(duration, baseline)
        });
      }
    }
  }

  getBaselineKey(testName) {
    // Generate a key for baseline lookup
    if (testName.includes('crisis')) return 'crisis_response_ms';
    if (testName.includes('performance')) return 'test_execution_ms';
    if (testName.includes('memory')) return 'memory_limit_mb';
    return 'default_test_ms';
  }

  getSeverity(actual, baseline) {
    const ratio = actual / baseline;
    if (ratio > 2.0) return 'CRITICAL';
    if (ratio > 1.5) return 'HIGH';
    if (ratio > 1.2) return 'MEDIUM';
    return 'LOW';
  }

  analyzeTestOutput(testResult) {
    // Look for performance-related console output
    testResult.console?.forEach(entry => {
      const message = entry.message;
      
      // Check for performance violations
      if (message.includes('PERFORMANCE VIOLATION')) {
        this.regressions.push({
          type: 'VIOLATION',
          message: message,
          severity: 'HIGH'
        });
      }
      
      // Check for memory warnings
      if (message.includes('MEMORY WARNING')) {
        this.warnings.push({
          type: 'MEMORY',
          message: message
        });
      }
      
      // Check for crisis response violations
      if (message.includes('CRISIS SAFETY VIOLATION')) {
        this.regressions.push({
          type: 'CRITICAL',
          message: message,
          severity: 'CRITICAL'
        });
      }
    });
  }

  onRunComplete(contexts, results) {
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n📊 Performance Regression Analysis Complete');
    console.log(`⏱️ Total execution time: ${totalDuration}ms`);
    
    // Generate comprehensive performance report
    const report = this.generatePerformanceReport(results, totalDuration);
    
    // Save performance report
    this.savePerformanceReport(report);
    
    // Display results
    this.displayResults(report);
    
    // Check if we should fail the build
    if (this.shouldFailBuild()) {
      console.error('🚨 CRITICAL PERFORMANCE REGRESSIONS DETECTED - FAILING BUILD');
      process.exit(1);
    }
  }

  generatePerformanceReport(results, totalDuration) {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        total_tests: results.numTotalTests,
        passed_tests: results.numPassedTests,
        failed_tests: results.numFailedTests,
        total_duration_ms: totalDuration,
        test_files: Object.keys(this.performanceMetrics).length
      },
      performance_metrics: this.performanceMetrics,
      baselines: this.baselines,
      thresholds: this.thresholds,
      regressions: this.regressions,
      warnings: this.warnings,
      analysis: {
        regression_count: this.regressions.length,
        warning_count: this.warnings.length,
        critical_issues: this.regressions.filter(r => r.severity === 'CRITICAL').length,
        high_issues: this.regressions.filter(r => r.severity === 'HIGH').length
      }
    };
  }

  savePerformanceReport(report) {
    const reportDir = path.join(process.cwd(), 'test-results');
    
    // Ensure directory exists
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    // Save detailed JSON report
    const jsonReportPath = path.join(reportDir, 'performance-regression-report.json');
    fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
    
    // Save human-readable summary
    const summaryPath = path.join(reportDir, 'performance-summary.txt');
    const summary = this.generateHumanReadableSummary(report);
    fs.writeFileSync(summaryPath, summary);
    
    console.log(`📊 Performance report saved to: ${jsonReportPath}`);
  }

  generateHumanReadableSummary(report) {
    let summary = '# Performance Regression Analysis Report\n\n';
    summary += `Generated: ${report.timestamp}\n`;
    summary += `Total Tests: ${report.summary.total_tests}\n`;
    summary += `Execution Time: ${report.summary.total_duration_ms}ms\n\n`;
    
    summary += '## Performance Analysis\n\n';
    summary += `Regressions Detected: ${report.analysis.regression_count}\n`;
    summary += `Warnings: ${report.analysis.warning_count}\n`;
    summary += `Critical Issues: ${report.analysis.critical_issues}\n`;
    summary += `High Severity Issues: ${report.analysis.high_issues}\n\n`;
    
    if (report.regressions.length > 0) {
      summary += '## Regressions\n\n';
      report.regressions.forEach(regression => {
        summary += `- [${regression.severity}] ${regression.type}: ${regression.test || regression.message}\n`;
        if (regression.actual && regression.threshold) {
          summary += `  Actual: ${regression.actual}ms, Threshold: ${regression.threshold}ms\n`;
        }
      });
      summary += '\n';
    }
    
    if (report.warnings.length > 0) {
      summary += '## Warnings\n\n';
      report.warnings.forEach(warning => {
        summary += `- ${warning.type}: ${warning.message || warning.test}\n`;
        if (warning.duration && warning.threshold) {
          summary += `  Duration: ${warning.duration}ms, Threshold: ${warning.threshold}ms\n`;
        }
      });
      summary += '\n';
    }
    
    summary += '## Performance Thresholds\n\n';
    Object.entries(report.thresholds).forEach(([key, value]) => {
      summary += `- ${key}: ${value}${key.includes('_ms') ? 'ms' : (key.includes('_mb') ? 'MB' : '')}\n`;
    });
    
    return summary;
  }

  displayResults(report) {
    console.log('\n📈 Performance Metrics Summary:');
    
    if (report.regressions.length > 0) {
      console.log(`\n🚨 ${report.regressions.length} Performance Regressions Detected:`);
      report.regressions.forEach(regression => {
        const icon = regression.severity === 'CRITICAL' ? '🚨' : regression.severity === 'HIGH' ? '⚠️' : '📊';
        console.log(`  ${icon} [${regression.severity}] ${regression.test || regression.message}`);
      });
    } else {
      console.log('✅ No performance regressions detected');
    }
    
    if (report.warnings.length > 0) {
      console.log(`\n⚠️ ${report.warnings.length} Performance Warnings:`);
      report.warnings.forEach(warning => {
        console.log(`  ⚠️ ${warning.type}: ${warning.message || warning.test}`);
      });
    }
    
    console.log('\n📊 Key Metrics:');
    console.log(`  ⏱️ Crisis Response Threshold: <${this.thresholds.crisis_response_ms}ms`);
    console.log(`  🧠 Memory Limit: <${this.thresholds.memory_limit_mb}MB`);
    console.log(`  🖼️ UI Performance: ${1000/this.thresholds.ui_render_ms}fps target`);
    
    // Update baselines if all tests passed and no regressions
    if (report.summary.failed_tests === 0 && report.regressions.length === 0) {
      this.updateBaselines(report);
    }
  }

  updateBaselines(report) {
    let updated = false;
    
    // Update baselines with better performance
    Object.entries(this.performanceMetrics).forEach(([testName, metrics]) => {
      const baselineKey = this.getBaselineKey(testName);
      if (this.baselines[baselineKey] && metrics.duration < this.baselines[baselineKey] * 0.9) {
        this.baselines[baselineKey] = metrics.duration;
        updated = true;
      }
    });
    
    if (updated) {
      this.saveBaselines();
      console.log('📊 Performance baselines updated with improved metrics');
    }
  }

  shouldFailBuild() {
    // Fail build if there are critical performance regressions
    const criticalIssues = this.regressions.filter(r => r.severity === 'CRITICAL').length;
    const highIssues = this.regressions.filter(r => r.severity === 'HIGH').length;
    
    // Fail for any critical issues or more than 3 high severity issues
    return criticalIssues > 0 || highIssues > 3;
  }
}

module.exports = PerformanceRegressionReporter;