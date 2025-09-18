/**
 * Performance Reporter for Cross-Device Sync Tests
 *
 * Custom Jest reporter that tracks and validates performance metrics:
 * - Crisis response times <200ms
 * - Memory usage monitoring
 * - Sync operation throughput
 * - Success rate validation
 * - Performance regression detection
 */

const fs = require('fs');
const path = require('path');

class SyncPerformanceReporter {
  constructor(globalConfig, options = {}) {
    this.globalConfig = globalConfig;
    this.options = {
      outputPath: options.outputPath || './test-results/performance-report.json',
      thresholds: {
        crisisResponseTime: 200,
        therapeuticSyncTime: 500,
        generalSyncTime: 2000,
        memoryUsage: 50 * 1024 * 1024, // 50MB
        successRate: 0.95,
        ...options.thresholds
      }
    };

    this.performanceData = {
      summary: {
        testStartTime: null,
        testEndTime: null,
        totalDuration: 0,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
      },
      metrics: {
        crisisResponseTimes: [],
        therapeuticSyncTimes: [],
        generalSyncTimes: [],
        memorySnapshots: [],
        operationCounts: {},
        successRates: {},
      },
      violations: [],
      trends: {
        performanceRegression: false,
        memoryLeaks: false,
        consistencyIssues: false,
      }
    };
  }

  onRunStart() {
    this.performanceData.summary.testStartTime = Date.now();
    console.log('\n🚀 Starting Cross-Device Sync Performance Testing...\n');
  }

  onTestStart(test) {
    // Initialize test-specific performance tracking
    if (global.performanceMonitor) {
      global.performanceMonitor.startTest(test.path);
    }
  }

  onTestResult(test, testResult) {
    this.performanceData.summary.totalTests++;

    if (testResult.numFailingTests === 0) {
      this.performanceData.summary.passedTests++;
    } else {
      this.performanceData.summary.failedTests++;
    }

    if (testResult.skipped) {
      this.performanceData.summary.skippedTests++;
    }

    // Extract performance data from test results
    this.extractPerformanceMetrics(test, testResult);

    // Validate performance thresholds
    this.validateThresholds(test, testResult);
  }

  extractPerformanceMetrics(test, testResult) {
    // Extract metrics from global performance monitor
    if (global.performanceMonitor) {
      const testMetrics = global.performanceMonitor.getMetrics();

      // Categorize response times
      testMetrics.responseTimes.forEach(metric => {
        if (metric.operation.includes('crisis')) {
          this.performanceData.metrics.crisisResponseTimes.push({
            duration: metric.duration,
            operation: metric.operation,
            testFile: test.path,
            timestamp: metric.timestamp,
          });
        } else if (metric.operation.includes('therapeutic')) {
          this.performanceData.metrics.therapeuticSyncTimes.push({
            duration: metric.duration,
            operation: metric.operation,
            testFile: test.path,
            timestamp: metric.timestamp,
          });
        } else if (metric.operation.includes('general')) {
          this.performanceData.metrics.generalSyncTimes.push({
            duration: metric.duration,
            operation: metric.operation,
            testFile: test.path,
            timestamp: metric.timestamp,
          });
        }
      });

      // Track memory usage
      testMetrics.memoryUsage.forEach(usage => {
        this.performanceData.metrics.memorySnapshots.push({
          ...usage,
          testFile: test.path,
        });
      });

      // Track operation counts
      Object.entries(testMetrics.operationCounts).forEach(([operation, count]) => {
        if (!this.performanceData.metrics.operationCounts[operation]) {
          this.performanceData.metrics.operationCounts[operation] = 0;
        }
        this.performanceData.metrics.operationCounts[operation] += count;
      });
    }

    // Extract success rates from test results
    if (testResult.testResults) {
      const testName = path.basename(test.path);
      this.performanceData.metrics.successRates[testName] = {
        passed: testResult.numPassingTests,
        failed: testResult.numFailingTests,
        total: testResult.numPassingTests + testResult.numFailingTests,
        rate: testResult.numPassingTests / (testResult.numPassingTests + testResult.numFailingTests),
      };
    }
  }

  validateThresholds(test, testResult) {
    const testName = path.basename(test.path);

    // Validate crisis response times
    const recentCrisisResponses = this.performanceData.metrics.crisisResponseTimes
      .filter(metric => metric.testFile === test.path);

    recentCrisisResponses.forEach(metric => {
      if (metric.duration > this.options.thresholds.crisisResponseTime) {
        this.performanceData.violations.push({
          type: 'CRISIS_RESPONSE_TIME_VIOLATION',
          severity: 'HIGH',
          testFile: test.path,
          operation: metric.operation,
          actualValue: metric.duration,
          threshold: this.options.thresholds.crisisResponseTime,
          message: `Crisis response time ${metric.duration}ms exceeds ${this.options.thresholds.crisisResponseTime}ms threshold`,
          timestamp: Date.now(),
        });
      }
    });

    // Validate memory usage
    const recentMemoryUsage = this.performanceData.metrics.memorySnapshots
      .filter(snapshot => snapshot.testFile === test.path);

    const peakMemory = Math.max(...recentMemoryUsage.map(s => s.heapUsed), 0);

    if (peakMemory > this.options.thresholds.memoryUsage) {
      this.performanceData.violations.push({
        type: 'MEMORY_USAGE_VIOLATION',
        severity: 'MEDIUM',
        testFile: test.path,
        actualValue: peakMemory,
        threshold: this.options.thresholds.memoryUsage,
        message: `Memory usage ${(peakMemory / 1024 / 1024).toFixed(2)}MB exceeds ${(this.options.thresholds.memoryUsage / 1024 / 1024).toFixed(2)}MB threshold`,
        timestamp: Date.now(),
      });
    }

    // Validate success rate
    const successRate = this.performanceData.metrics.successRates[testName];
    if (successRate && successRate.rate < this.options.thresholds.successRate) {
      this.performanceData.violations.push({
        type: 'SUCCESS_RATE_VIOLATION',
        severity: 'HIGH',
        testFile: test.path,
        actualValue: successRate.rate,
        threshold: this.options.thresholds.successRate,
        message: `Success rate ${(successRate.rate * 100).toFixed(1)}% below ${(this.options.thresholds.successRate * 100).toFixed(1)}% threshold`,
        timestamp: Date.now(),
      });
    }
  }

  onRunComplete(contexts, results) {
    this.performanceData.summary.testEndTime = Date.now();
    this.performanceData.summary.totalDuration =
      this.performanceData.summary.testEndTime - this.performanceData.summary.testStartTime;

    // Calculate performance statistics
    this.calculateStatistics();

    // Detect performance trends
    this.detectTrends();

    // Generate report
    this.generateReport();

    // Display summary
    this.displaySummary();
  }

  calculateStatistics() {
    // Crisis response time statistics
    if (this.performanceData.metrics.crisisResponseTimes.length > 0) {
      const crisisTimes = this.performanceData.metrics.crisisResponseTimes.map(m => m.duration);
      this.performanceData.statistics = {
        crisisResponseTimes: {
          count: crisisTimes.length,
          average: crisisTimes.reduce((sum, time) => sum + time, 0) / crisisTimes.length,
          min: Math.min(...crisisTimes),
          max: Math.max(...crisisTimes),
          p95: this.calculatePercentile(crisisTimes, 0.95),
          p99: this.calculatePercentile(crisisTimes, 0.99),
          violationCount: crisisTimes.filter(time => time > this.options.thresholds.crisisResponseTime).length,
        }
      };
    }

    // Memory usage statistics
    if (this.performanceData.metrics.memorySnapshots.length > 0) {
      const memoryUsages = this.performanceData.metrics.memorySnapshots.map(s => s.heapUsed);
      this.performanceData.statistics.memoryUsage = {
        count: memoryUsages.length,
        average: memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length,
        min: Math.min(...memoryUsages),
        max: Math.max(...memoryUsages),
        peak: Math.max(...memoryUsages),
        violationCount: memoryUsages.filter(usage => usage > this.options.thresholds.memoryUsage).length,
      };
    }

    // Overall success rate
    const allSuccessRates = Object.values(this.performanceData.metrics.successRates);
    if (allSuccessRates.length > 0) {
      const totalPassed = allSuccessRates.reduce((sum, rate) => sum + rate.passed, 0);
      const totalTests = allSuccessRates.reduce((sum, rate) => sum + rate.total, 0);

      this.performanceData.statistics.overallSuccessRate = {
        passed: totalPassed,
        total: totalTests,
        rate: totalTests > 0 ? totalPassed / totalTests : 0,
      };
    }
  }

  calculatePercentile(values, percentile) {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }

  detectTrends() {
    // Performance regression detection
    if (this.performanceData.statistics?.crisisResponseTimes) {
      const avgCrisisTime = this.performanceData.statistics.crisisResponseTimes.average;
      const p95CrisisTime = this.performanceData.statistics.crisisResponseTimes.p95;

      if (avgCrisisTime > this.options.thresholds.crisisResponseTime * 0.8 ||
          p95CrisisTime > this.options.thresholds.crisisResponseTime * 0.95) {
        this.performanceData.trends.performanceRegression = true;
      }
    }

    // Memory leak detection
    if (this.performanceData.metrics.memorySnapshots.length > 5) {
      const memoryTrend = this.performanceData.metrics.memorySnapshots
        .slice(-5)
        .map(s => s.heapUsed);

      const isIncreasing = memoryTrend.every((usage, index) =>
        index === 0 || usage >= memoryTrend[index - 1]);

      if (isIncreasing) {
        this.performanceData.trends.memoryLeaks = true;
      }
    }

    // Consistency issues
    if (this.performanceData.violations.length > 0) {
      const consistencyViolations = this.performanceData.violations.filter(v =>
        v.type.includes('RESPONSE_TIME') || v.type.includes('SUCCESS_RATE'));

      if (consistencyViolations.length > this.performanceData.summary.totalTests * 0.1) {
        this.performanceData.trends.consistencyIssues = true;
      }
    }
  }

  generateReport() {
    try {
      const outputDir = path.dirname(this.options.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const report = {
        metadata: {
          reportGeneratedAt: new Date().toISOString(),
          testSuite: 'Cross-Device Sync Performance',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'test',
        },
        ...this.performanceData,
        recommendations: this.generateRecommendations(),
      };

      fs.writeFileSync(this.options.outputPath, JSON.stringify(report, null, 2));
      console.log(`📊 Performance report saved to: ${this.options.outputPath}`);

    } catch (error) {
      console.error('Failed to generate performance report:', error);
    }
  }

  generateRecommendations() {
    const recommendations = [];

    // Crisis response time recommendations
    if (this.performanceData.statistics?.crisisResponseTimes?.violationCount > 0) {
      recommendations.push({
        category: 'Crisis Response Performance',
        severity: 'HIGH',
        issue: `${this.performanceData.statistics.crisisResponseTimes.violationCount} crisis response time violations detected`,
        recommendation: 'Optimize crisis data sync path, consider WebSocket prioritization, reduce encryption overhead for emergency data',
        priority: 1,
      });
    }

    // Memory usage recommendations
    if (this.performanceData.trends.memoryLeaks) {
      recommendations.push({
        category: 'Memory Management',
        severity: 'MEDIUM',
        issue: 'Potential memory leaks detected in sync operations',
        recommendation: 'Review sync operation cleanup, implement better garbage collection, check for retained references in event listeners',
        priority: 2,
      });
    }

    // Success rate recommendations
    if (this.performanceData.statistics?.overallSuccessRate?.rate < this.options.thresholds.successRate) {
      recommendations.push({
        category: 'Reliability',
        severity: 'HIGH',
        issue: `Overall success rate ${(this.performanceData.statistics.overallSuccessRate.rate * 100).toFixed(1)}% below threshold`,
        recommendation: 'Implement better error handling, add retry mechanisms, improve network resilience',
        priority: 1,
      });
    }

    // Performance regression recommendations
    if (this.performanceData.trends.performanceRegression) {
      recommendations.push({
        category: 'Performance Optimization',
        severity: 'MEDIUM',
        issue: 'Performance regression trends detected',
        recommendation: 'Profile sync operations, optimize data serialization, consider operation batching',
        priority: 2,
      });
    }

    return recommendations;
  }

  displaySummary() {
    console.log('\n📈 Cross-Device Sync Performance Summary');
    console.log('=' .repeat(50));

    // Test execution summary
    console.log(`\n🏃 Test Execution:`);
    console.log(`  Total Tests: ${this.performanceData.summary.totalTests}`);
    console.log(`  Passed: ${this.performanceData.summary.passedTests}`);
    console.log(`  Failed: ${this.performanceData.summary.failedTests}`);
    console.log(`  Duration: ${(this.performanceData.summary.totalDuration / 1000).toFixed(2)}s`);

    // Performance metrics
    if (this.performanceData.statistics?.crisisResponseTimes) {
      const stats = this.performanceData.statistics.crisisResponseTimes;
      console.log(`\n⚡ Crisis Response Times:`);
      console.log(`  Average: ${stats.average.toFixed(2)}ms (Threshold: ${this.options.thresholds.crisisResponseTime}ms)`);
      console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
      console.log(`  P99: ${stats.p99.toFixed(2)}ms`);
      console.log(`  Violations: ${stats.violationCount}/${stats.count}`);

      if (stats.violationCount === 0) {
        console.log(`  ✅ All crisis responses within threshold`);
      } else {
        console.log(`  ❌ ${stats.violationCount} crisis response violations`);
      }
    }

    // Memory usage
    if (this.performanceData.statistics?.memoryUsage) {
      const memStats = this.performanceData.statistics.memoryUsage;
      console.log(`\n💾 Memory Usage:`);
      console.log(`  Peak: ${(memStats.peak / 1024 / 1024).toFixed(2)}MB (Limit: ${(this.options.thresholds.memoryUsage / 1024 / 1024).toFixed(2)}MB)`);
      console.log(`  Average: ${(memStats.average / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Violations: ${memStats.violationCount}`);

      if (memStats.violationCount === 0) {
        console.log(`  ✅ Memory usage within limits`);
      } else {
        console.log(`  ❌ ${memStats.violationCount} memory violations`);
      }
    }

    // Success rate
    if (this.performanceData.statistics?.overallSuccessRate) {
      const successStats = this.performanceData.statistics.overallSuccessRate;
      console.log(`\n🎯 Success Rate:`);
      console.log(`  Overall: ${(successStats.rate * 100).toFixed(1)}% (Threshold: ${(this.options.thresholds.successRate * 100).toFixed(1)}%)`);
      console.log(`  Tests: ${successStats.passed}/${successStats.total}`);

      if (successStats.rate >= this.options.thresholds.successRate) {
        console.log(`  ✅ Success rate meets threshold`);
      } else {
        console.log(`  ❌ Success rate below threshold`);
      }
    }

    // Violations summary
    if (this.performanceData.violations.length > 0) {
      console.log(`\n⚠️  Performance Violations:`);
      const violationsByType = this.performanceData.violations.reduce((acc, violation) => {
        acc[violation.type] = (acc[violation.type] || 0) + 1;
        return acc;
      }, {});

      Object.entries(violationsByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    } else {
      console.log(`\n✅ No performance violations detected`);
    }

    // Trends
    console.log(`\n📊 Performance Trends:`);
    console.log(`  Regression: ${this.performanceData.trends.performanceRegression ? '❌ Detected' : '✅ None'}`);
    console.log(`  Memory Leaks: ${this.performanceData.trends.memoryLeaks ? '❌ Suspected' : '✅ None'}`);
    console.log(`  Consistency: ${this.performanceData.trends.consistencyIssues ? '❌ Issues' : '✅ Good'}`);

    console.log('\n' + '='.repeat(50) + '\n');
  }
}

module.exports = SyncPerformanceReporter;