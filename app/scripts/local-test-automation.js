#!/usr/bin/env node

/**
 * Local Test Automation Script
 * Comprehensive local testing workflows without CI/CD complexity
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class LocalTestAutomation {
  constructor() {
    this.rootDir = process.cwd();
    this.testResults = [];
    this.startTime = Date.now();
    
    // Create test results directory
    this.resultsDir = path.join(this.rootDir, 'test-results');
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  // Quick validation suite for rapid iteration
  async runQuickValidation() {
    console.log('⚡ Starting Quick Validation Suite...\n');
    
    const tests = [
      { name: 'Quick Tests', command: 'npm run test:quick', critical: false },
      { name: 'Crisis Safety Check', command: 'npm run test:crisis-quick', critical: true },
      { name: 'Clinical Accuracy', command: 'npm run test:clinical-quick', critical: true },
      { name: 'TypeScript Check', command: 'npm run typecheck', critical: false }
    ];

    return this.runTestSuite(tests, 'quick-validation');
  }

  // Comprehensive local testing (full suite)
  async runComprehensive() {
    console.log('🔄 Starting Comprehensive Local Testing...\n');
    
    const tests = [
      { name: 'Unit Tests', command: 'npm run test:unit', critical: false },
      { name: 'Crisis Safety', command: 'npm run test:crisis', critical: true },
      { name: 'Clinical Tests', command: 'npm run test:clinical', critical: true },
      { name: 'Integration Tests', command: 'npm run test:integration', critical: false },
      { name: 'Performance Tests', command: 'npm run test:performance', critical: false },
      { name: 'Accessibility Tests', command: 'npm run test:accessibility', critical: false },
      { name: 'Security Tests', command: 'npm run test:security', critical: false }
    ];

    return this.runTestSuite(tests, 'comprehensive');
  }

  // Performance regression testing
  //
  // MAINT-166 PR 7 (TEST-17) note: the jest-based perf scripts
  // (perf:crisis / perf:launch / perf:breathing / test:memory) were
  // removed because none ran real tests — they relied on
  // --passWithNoTests or testNamePattern matches that resolved to zero
  // describe blocks. On-device performance validation lives in the
  // Maestro safety flows + the perf budgets documented in CLAUDE.md
  // ("Performance Budgets" section). When real jest-side perf tests
  // exist, this method should be repopulated with them.
  async runPerformanceRegression() {
    console.log('📊 Performance Regression Testing is currently a no-op.');
    console.log('   See CLAUDE.md "Performance Budgets" + the Maestro flows');
    console.log('   under app/.maestro/ for the actual perf surface.\n');
    return { success: true, results: [], suite: 'performance-regression' };
  }

  // Pre-commit validation
  async runPreCommitValidation() {
    console.log('🔍 Starting Pre-commit Validation...\n');
    
    const tests = [
      { name: 'TypeScript Build', command: 'npm run typecheck:strict', critical: true },
      { name: 'Clinical Linting', command: 'npm run lint:clinical', critical: true },
      { name: 'Type Safety', command: 'npm run validate:types', critical: true },
      { name: 'Crisis Tests', command: 'npm run test:crisis', critical: true },
      { name: 'Clinical Tests', command: 'npm run test:clinical', critical: true }
    ];

    return this.runTestSuite(tests, 'pre-commit');
  }

  // Development workflow testing
  async runDevelopmentWorkflow() {
    console.log('🛠️ Starting Development Workflow Testing...\n');
    
    // Run quick tests first
    const quickResult = await this.runQuickValidation();
    
    if (!quickResult.success) {
      console.log('❌ Quick validation failed, skipping comprehensive tests');
      return quickResult;
    }

    // If quick tests pass, run comprehensive
    console.log('✅ Quick validation passed, running comprehensive tests...\n');
    return this.runComprehensive();
  }

  // Core test suite runner
  async runTestSuite(tests, suiteName) {
    const suiteStartTime = Date.now();
    const results = [];
    let overallSuccess = true;
    let criticalFailures = 0;

    console.log(`📋 Test Suite: ${suiteName}`);
    console.log(''.padEnd(50, '='));

    for (const test of tests) {
      const testStartTime = Date.now();
      console.log(`\n🔄 Running: ${test.name}...`);
      
      try {
        const output = execSync(test.command, { 
          encoding: 'utf8',
          timeout: 300000, // 5 minute timeout
          stdio: 'pipe'
        });
        
        const duration = Date.now() - testStartTime;
        const result = {
          name: test.name,
          command: test.command,
          status: 'passed',
          duration,
          critical: test.critical,
          output: output.substring(0, 1000) // Truncate output
        };
        
        results.push(result);
        console.log(`✅ ${test.name} passed (${duration}ms)`);
        
      } catch (error) {
        const duration = Date.now() - testStartTime;
        const result = {
          name: test.name,
          command: test.command,
          status: 'failed',
          duration,
          critical: test.critical,
          error: error.message,
          output: error.stdout ? error.stdout.substring(0, 1000) : ''
        };
        
        results.push(result);
        overallSuccess = false;
        
        if (test.critical) {
          criticalFailures++;
          console.log(`🚨 CRITICAL FAILURE: ${test.name} failed (${duration}ms)`);
        } else {
          console.log(`❌ ${test.name} failed (${duration}ms)`);
        }
      }
    }

    const totalDuration = Date.now() - suiteStartTime;
    const passedCount = results.filter(r => r.status === 'passed').length;
    
    // Generate suite report
    const suiteResult = {
      suiteName,
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      totalTests: results.length,
      passed: passedCount,
      failed: results.length - passedCount,
      criticalFailures,
      success: overallSuccess && criticalFailures === 0,
      results
    };

    // Save results
    const reportPath = path.join(this.resultsDir, `${suiteName}-report.json`);
    fs.writeFileSync(reportPath, JSON.stringify(suiteResult, null, 2));

    // Print summary
    this.printSuiteSummary(suiteResult);
    
    return suiteResult;
  }

  // Print test suite summary
  printSuiteSummary(suiteResult) {
    console.log('\n' + ''.padEnd(50, '='));
    console.log(`📊 ${suiteResult.suiteName.toUpperCase()} SUMMARY`);
    console.log(''.padEnd(50, '='));
    console.log(`Duration: ${suiteResult.duration}ms`);
    console.log(`Tests: ${suiteResult.passed}/${suiteResult.totalTests} passed`);
    
    if (suiteResult.criticalFailures > 0) {
      console.log(`🚨 Critical Failures: ${suiteResult.criticalFailures}`);
    }
    
    if (suiteResult.success) {
      console.log('✅ Suite passed successfully!');
    } else {
      console.log('❌ Suite failed');
      
      // Show failed tests
      const failedTests = suiteResult.results.filter(r => r.status === 'failed');
      console.log('\nFailed Tests:');
      failedTests.forEach(test => {
        const icon = test.critical ? '🚨' : '❌';
        console.log(`   ${icon} ${test.name}`);
      });
    }
    
    console.log(`📄 Report: ${path.join(this.resultsDir, `${suiteResult.suiteName}-report.json`)}`);
    console.log(''.padEnd(50, '=') + '\n');
  }

  // Generate performance comparison report
  async generatePerformanceReport() {
    console.log('📊 Generating performance comparison report...');
    
    try {
      // Look for existing performance data
      const perfFiles = fs.readdirSync(this.resultsDir)
        .filter(f => f.includes('performance') && f.endsWith('.json'))
        .sort()
        .slice(-5); // Last 5 runs
      
      if (perfFiles.length < 2) {
        console.log('ℹ️ Not enough performance data for comparison');
        return;
      }

      const performanceData = perfFiles.map(file => {
        const data = JSON.parse(fs.readFileSync(path.join(this.resultsDir, file), 'utf8'));
        return {
          timestamp: data.timestamp,
          file,
          data
        };
      });

      // Generate trend analysis
      const trendReport = {
        timestamp: new Date().toISOString(),
        totalRuns: performanceData.length,
        trends: this.analyzePerformanceTrends(performanceData),
        recommendations: this.generatePerformanceRecommendations(performanceData)
      };

      fs.writeFileSync(
        path.join(this.resultsDir, 'performance-trends.json'),
        JSON.stringify(trendReport, null, 2)
      );

      console.log('✅ Performance trend report generated');
      
    } catch (error) {
      console.log('⚠️ Error generating performance report:', error.message);
    }
  }

  // Analyze performance trends
  analyzePerformanceTrends(performanceData) {
    const trends = {};
    
    // Analyze duration trends for each test category
    ['crisis', 'clinical', 'unit', 'integration'].forEach(category => {
      const categoryData = performanceData.map(run => {
        const categoryTests = run.data.results?.filter(r => 
          r.name.toLowerCase().includes(category)) || [];
        
        if (categoryTests.length === 0) return null;
        
        const avgDuration = categoryTests.reduce((sum, test) => 
          sum + (test.duration || 0), 0) / categoryTests.length;
        
        return {
          timestamp: run.timestamp,
          avgDuration,
          testCount: categoryTests.length
        };
      }).filter(Boolean);

      if (categoryData.length >= 2) {
        const latest = categoryData[categoryData.length - 1];
        const previous = categoryData[categoryData.length - 2];
        const change = latest.avgDuration - previous.avgDuration;
        const changePercent = (change / previous.avgDuration) * 100;

        trends[category] = {
          latest: latest.avgDuration,
          previous: previous.avgDuration,
          change,
          changePercent,
          trend: changePercent > 10 ? 'degrading' : 
                 changePercent < -10 ? 'improving' : 'stable'
        };
      }
    });

    return trends;
  }

  // Generate performance recommendations
  generatePerformanceRecommendations(performanceData) {
    const recommendations = [];
    
    // Check for consistently slow crisis tests
    const latestRun = performanceData[performanceData.length - 1];
    const crisisTests = latestRun.data.results?.filter(r => 
      r.name.toLowerCase().includes('crisis') && r.duration > 3000) || [];
    
    if (crisisTests.length > 0) {
      recommendations.push({
        type: 'CRITICAL',
        category: 'crisis',
        message: `${crisisTests.length} crisis tests exceed 3s threshold`,
        action: 'Optimize crisis detection algorithms immediately',
        tests: crisisTests.map(t => t.name)
      });
    }

    return recommendations;
  }

  // Watch mode for continuous testing
  async runWatchMode(testPattern = '') {
    console.log('👀 Starting Watch Mode for Continuous Testing...\n');
    console.log('File changes will trigger automatic test runs');
    console.log('Press Ctrl+C to exit\n');

    const command = testPattern ? 
      `npm run test:watch -- --testNamePattern="${testPattern}"` :
      'npm run test:watch';

    const testProcess = spawn('npm', ['run', 'test:watch'], {
      stdio: 'inherit',
      shell: true
    });

    testProcess.on('close', (code) => {
      console.log(`\n👀 Watch mode exited with code ${code}`);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping watch mode...');
      testProcess.kill('SIGTERM');
      process.exit(0);
    });
  }
}

// CLI interface
async function main() {
  const automation = new LocalTestAutomation();
  const command = process.argv[2] || 'quick';

  try {
    switch (command) {
      case 'quick':
        await automation.runQuickValidation();
        break;
      case 'comprehensive':
      case 'full':
        await automation.runComprehensive();
        break;
      case 'performance':
      case 'perf':
        await automation.runPerformanceRegression();
        break;
      case 'pre-commit':
        await automation.runPreCommitValidation();
        break;
      case 'dev':
      case 'development':
        await automation.runDevelopmentWorkflow();
        break;
      case 'watch':
        await automation.runWatchMode(process.argv[3]);
        break;
      default:
        console.log('Usage: node local-test-automation.js [command]');
        console.log('Commands:');
        console.log('  quick         - Quick validation suite');
        console.log('  comprehensive - Full test suite');
        console.log('  performance   - Performance regression tests');
        console.log('  pre-commit    - Pre-commit validation');
        console.log('  development   - Development workflow');
        console.log('  watch [pattern] - Watch mode with optional test pattern');
        process.exit(1);
    }
  } catch (error) {
    console.error('🚨 Automation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = LocalTestAutomation;