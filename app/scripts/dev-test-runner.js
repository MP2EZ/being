#!/usr/bin/env node

/**
 * Development Test Runner
 * Optimized test execution for development workflow
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class DevTestRunner {
  constructor() {
    this.rootDir = process.cwd();
    this.runningTests = new Set();
    this.testQueue = [];
    this.config = this.loadConfig();
  }

  // Load development test configuration
  loadConfig() {
    const defaultConfig = {
      maxConcurrent: 2,
      timeouts: {
        unit: 10000,
        integration: 30000,
        crisis: 15000,
        clinical: 20000
      },
      priorityOrder: ['crisis', 'clinical', 'unit', 'integration', 'performance'],
      autoRetry: true,
      maxRetries: 2
    };

    try {
      const configPath = path.join(this.rootDir, 'dev-test-config.json');
      if (fs.existsSync(configPath)) {
        const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return { ...defaultConfig, ...userConfig };
      }
    } catch (error) {
      console.log('⚠️ Using default test configuration');
    }

    return defaultConfig;
  }

  // Run tests with smart prioritization
  async runSmartTests(pattern = '', options = {}) {
    console.log('🧠 Smart test execution starting...');
    
    const {
      prioritize = true,
      parallel = true,
      failFast = false,
      coverage = false
    } = options;

    const testFiles = this.discoverTests(pattern);
    const categorizedTests = this.categorizeTests(testFiles);
    
    console.log(`📊 Found ${testFiles.length} test files`);
    this.printTestBreakdown(categorizedTests);

    if (prioritize) {
      return this.runPrioritizedTests(categorizedTests, { parallel, failFast, coverage });
    } else {
      return this.runAllTests(testFiles, { parallel, failFast, coverage });
    }
  }

  // Discover test files based on pattern
  discoverTests(pattern) {
    const testDirs = [
      'src/**/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
      '__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}'
    ];

    let allTests = [];
    
    testDirs.forEach(dir => {
      try {
        const glob = require('glob');
        const tests = glob.sync(dir, { cwd: this.rootDir });
        allTests = allTests.concat(tests);
      } catch (error) {
        // Fallback to manual discovery
        allTests = allTests.concat(this.manualTestDiscovery(dir));
      }
    });

    // Filter by pattern if provided
    if (pattern) {
      allTests = allTests.filter(test => 
        test.includes(pattern) || path.basename(test).includes(pattern)
      );
    }

    return [...new Set(allTests)]; // Remove duplicates
  }

  // Manual test discovery fallback
  manualTestDiscovery(pattern) {
    const tests = [];
    const searchDirs = ['src', '__tests__'];
    
    searchDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        this.walkDirectory(dir, (file) => {
          if (/\\.(test|spec)\\.(js|jsx|ts|tsx)$/.test(file)) {
            tests.push(file);
          }
        });
      }
    });
    
    return tests;
  }

  // Walk directory recursively
  walkDirectory(dir, callback) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        this.walkDirectory(filePath, callback);
      } else {
        callback(filePath);
      }
    });
  }

  // Categorize tests by type and priority
  categorizeTests(testFiles) {
    const categories = {
      crisis: [],
      clinical: [],
      unit: [],
      integration: [],
      performance: [],
      other: []
    };

    testFiles.forEach(file => {
      const category = this.categorizeTest(file);
      categories[category].push(file);
    });

    return categories;
  }

  // Categorize single test file
  categorizeTest(filePath) {
    const content = filePath.toLowerCase();
    
    if (/crisis|emergency|988|intervention/.test(content)) return 'crisis';
    if (/clinical|phq|gad|assessment|therapeutic/.test(content)) return 'clinical';
    if (/integration|e2e/.test(content)) return 'integration';
    if (/performance|perf|speed/.test(content)) return 'performance';
    if (/unit|component/.test(content) || !/(integration|e2e|performance)/.test(content)) return 'unit';
    
    return 'other';
  }

  // Run tests with prioritization
  async runPrioritizedTests(categorizedTests, options) {
    const { parallel, failFast, coverage } = options;
    const results = {};
    let overallSuccess = true;

    console.log('\\n🎯 Running prioritized test execution...');

    for (const category of this.config.priorityOrder) {
      const tests = categorizedTests[category];
      if (tests.length === 0) continue;

      console.log(`\\n📂 Running ${category} tests (${tests.length} files)...`);
      
      const categoryResult = await this.runTestCategory(category, tests, {
        parallel: parallel && category !== 'crisis', // Crisis tests run sequentially
        timeout: this.config.timeouts[category] || 10000,
        coverage: coverage && category === 'unit' // Coverage mainly for unit tests
      });

      results[category] = categoryResult;

      if (!categoryResult.success) {
        overallSuccess = false;
        
        // Fail fast on critical categories
        if ((category === 'crisis' || category === 'clinical') && failFast) {
          console.log(`🚨 Critical ${category} tests failed - stopping execution`);
          break;
        }
      }
    }

    this.printOverallResults(results, overallSuccess);
    return { success: overallSuccess, results };
  }

  // Run specific test category
  async runTestCategory(category, testFiles, options = {}) {
    const { parallel = true, timeout = 10000, coverage = false } = options;
    const startTime = Date.now();
    
    try {
      let command = `npm run test:local`;
      
      // Add configuration options
      if (coverage) command += ' -- --coverage';
      command += ` --testTimeout=${timeout}`;
      
      // Add test files pattern
      const filesPattern = testFiles.map(f => path.basename(f, path.extname(f))).join('|');
      command += ` --testNamePattern="${filesPattern}"`;
      
      // Execute tests
      const output = execSync(command, {
        encoding: 'utf8',
        timeout: timeout * testFiles.length + 30000 // Extra buffer
      });
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ ${category} tests completed (${duration}ms)`);
      
      return {
        success: true,
        duration,
        testCount: testFiles.length,
        output: output.substring(0, 500) // Truncate for readability
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.log(`❌ ${category} tests failed (${duration}ms)`);
      
      // Retry logic for non-critical tests
      if (this.config.autoRetry && category !== 'crisis' && category !== 'clinical') {
        console.log(`🔄 Retrying ${category} tests...`);
        return this.retryTestCategory(category, testFiles, options);
      }
      
      return {
        success: false,
        duration,
        testCount: testFiles.length,
        error: error.message,
        output: error.stdout || ''
      };
    }
  }

  // Retry failed test category
  async retryTestCategory(category, testFiles, options, attempt = 1) {
    if (attempt > this.config.maxRetries) {
      console.log(`❌ ${category} tests failed after ${this.config.maxRetries} retries`);
      return { success: false, retryAttempts: attempt - 1 };
    }

    console.log(`🔄 Retry attempt ${attempt} for ${category} tests...`);
    
    const result = await this.runTestCategory(category, testFiles, options);
    
    if (!result.success) {
      return this.retryTestCategory(category, testFiles, options, attempt + 1);
    }
    
    result.retryAttempts = attempt;
    return result;
  }

  // Print test breakdown
  printTestBreakdown(categorizedTests) {
    console.log('\\n📋 Test Breakdown:');
    Object.entries(categorizedTests).forEach(([category, tests]) => {
      if (tests.length > 0) {
        const icon = category === 'crisis' ? '🚨' : 
                    category === 'clinical' ? '🏥' : 
                    category === 'performance' ? '⚡' : '🧪';
        console.log(`   ${icon} ${category}: ${tests.length} files`);
      }
    });
    console.log();
  }

  // Print overall results
  printOverallResults(results, overallSuccess) {
    console.log('\\n📊 Test Execution Summary');
    console.log(''.padEnd(40, '='));
    
    let totalTests = 0;
    let totalDuration = 0;
    let categoriesPassed = 0;
    
    Object.entries(results).forEach(([category, result]) => {
      const icon = result.success ? '✅' : '❌';
      const retryInfo = result.retryAttempts ? ` (${result.retryAttempts} retries)` : '';
      
      console.log(`${icon} ${category}: ${result.testCount} tests, ${result.duration}ms${retryInfo}`);
      
      totalTests += result.testCount;
      totalDuration += result.duration;
      if (result.success) categoriesPassed++;
    });
    
    console.log(''.padEnd(40, '-'));
    console.log(`Total: ${totalTests} tests in ${totalDuration}ms`);
    console.log(`Categories: ${categoriesPassed}/${Object.keys(results).length} passed`);
    
    if (overallSuccess) {
      console.log('🎉 All test categories passed!');
    } else {
      console.log('❌ Some test categories failed');
    }
    
    console.log(''.padEnd(40, '=') + '\\n');
  }

  // Focused test runner for specific component/feature
  async runFocusedTests(focus, options = {}) {
    console.log(`🎯 Running focused tests for: ${focus}`);
    
    const testFiles = this.discoverTests(focus);
    
    if (testFiles.length === 0) {
      console.log('❓ No tests found for the specified focus');
      return { success: false, reason: 'no_tests_found' };
    }
    
    console.log(`📁 Found ${testFiles.length} focused test files`);
    
    return this.runSmartTests(focus, {
      ...options,
      prioritize: false // No need to prioritize for focused tests
    });
  }

  // Debug mode test runner
  async runDebugTests(pattern = '', options = {}) {
    console.log('🐛 Debug mode test execution...');
    
    const {
      verbose = true,
      detectOpenHandles = true,
      forceExit = false
    } = options;

    let command = 'npm run test:local -- --verbose';
    
    if (detectOpenHandles) command += ' --detectOpenHandles';
    if (forceExit) command += ' --forceExit';
    if (pattern) command += ` --testNamePattern="${pattern}"`;
    
    console.log(`🔍 Running: ${command}`);
    
    try {
      const output = execSync(command, {
        encoding: 'utf8',
        stdio: 'inherit',
        timeout: 300000 // 5 minutes
      });
      
      console.log('✅ Debug test execution completed');
      return { success: true };
      
    } catch (error) {
      console.log('❌ Debug test execution failed');
      return { success: false, error: error.message };
    }
  }
}

// CLI interface
async function main() {
  const runner = new DevTestRunner();
  const command = process.argv[2] || 'smart';
  const pattern = process.argv[3] || '';
  
  try {
    switch (command) {
      case 'smart':
        await runner.runSmartTests(pattern, {
          prioritize: true,
          parallel: true,
          failFast: false
        });
        break;
      case 'focused':
      case 'focus':
        if (!pattern) {
          console.log('Usage: dev-test-runner focused <component/feature>');
          process.exit(1);
        }
        await runner.runFocusedTests(pattern);
        break;
      case 'debug':
        await runner.runDebugTests(pattern, {
          verbose: true,
          detectOpenHandles: true
        });
        break;
      case 'fast':
        await runner.runSmartTests(pattern, {
          prioritize: true,
          parallel: true,
          failFast: true
        });
        break;
      case 'coverage':
        await runner.runSmartTests(pattern, {
          prioritize: true,
          parallel: false,
          coverage: true
        });
        break;
      default:
        console.log('Usage: node dev-test-runner.js [command] [pattern]');
        console.log('Commands:');
        console.log('  smart [pattern]   - Smart prioritized test execution');
        console.log('  focused <pattern> - Run tests for specific component/feature');
        console.log('  debug [pattern]   - Debug mode with verbose output');
        console.log('  fast [pattern]    - Fast execution with fail-fast enabled');
        console.log('  coverage [pattern] - Run tests with coverage analysis');
        process.exit(1);
    }
  } catch (error) {
    console.error('🚨 Test execution failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DevTestRunner;