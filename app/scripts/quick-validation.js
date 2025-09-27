#!/usr/bin/env node

/**
 * Quick Validation Tools
 * Ultra-fast development validation for rapid iteration
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class QuickValidation {
  constructor() {
    this.rootDir = process.cwd();
    this.startTime = Date.now();
  }

  // Ultra-quick file-based test runner
  async quickTestFile(filePath) {
    console.log(`⚡ Quick test: ${filePath}`);
    
    try {
      const command = `npm run test:quick -- --testPathPattern="${filePath}"`;
      const result = execSync(command, { 
        encoding: 'utf8',
        timeout: 30000 // 30s max
      });
      
      console.log('✅ Tests passed');
      return { success: true, output: result };
    } catch (error) {
      console.log('❌ Tests failed');
      return { success: false, error: error.message, output: error.stdout };
    }
  }

  // Quick syntax and type check
  async quickSyntaxCheck(filePath = null) {
    console.log('🔍 Quick syntax check...');
    
    try {
      const command = filePath ? 
        `npx tsc --noEmit --skipLibCheck "${filePath}"` :
        'npm run typecheck';
      
      execSync(command, { 
        encoding: 'utf8',
        timeout: 15000 // 15s max
      });
      
      console.log('✅ Syntax OK');
      return { success: true };
    } catch (error) {
      console.log('❌ Syntax errors');
      return { success: false, error: error.message };
    }
  }

  // Quick crisis safety check
  async quickCrisisCheck() {
    console.log('🚨 Quick crisis safety check...');
    
    try {
      const result = execSync('npm run test:crisis-quick', { 
        encoding: 'utf8',
        timeout: 45000 // 45s max
      });
      
      console.log('✅ Crisis safety OK');
      return { success: true, output: result };
    } catch (error) {
      console.log('🚨 Crisis safety FAILED');
      return { success: false, error: error.message };
    }
  }

  // Quick clinical accuracy check
  async quickClinicalCheck() {
    console.log('🏥 Quick clinical check...');
    
    try {
      const result = execSync('npm run test:clinical-quick', { 
        encoding: 'utf8',
        timeout: 45000 // 45s max
      });
      
      console.log('✅ Clinical accuracy OK');
      return { success: true, output: result };
    } catch (error) {
      console.log('🏥 Clinical accuracy FAILED');
      return { success: false, error: error.message };
    }
  }

  // Quick lint fix
  async quickLintFix(filePath = null) {
    console.log('🔧 Quick lint fix...');
    
    try {
      const command = filePath ?
        `npx eslint "${filePath}" --fix` :
        'npm run lint:fix';
      
      execSync(command, { 
        encoding: 'utf8',
        timeout: 30000 // 30s max
      });
      
      console.log('✅ Lint fixes applied');
      return { success: true };
    } catch (error) {
      console.log('⚠️ Some lint issues remain');
      return { success: false, error: error.message };
    }
  }

  // Quick performance check for specific component
  async quickPerfCheck(componentName) {
    console.log(`⚡ Quick performance check: ${componentName}`);
    
    try {
      const command = `npm run test:performance -- --testNamePattern="${componentName}"`;
      const result = execSync(command, { 
        encoding: 'utf8',
        timeout: 60000 // 60s max
      });
      
      console.log('✅ Performance OK');
      return { success: true, output: result };
    } catch (error) {
      console.log('⚠️ Performance issues detected');
      return { success: false, error: error.message };
    }
  }

  // Smart validation based on changed files
  async smartValidation(changedFiles = []) {
    console.log('🧠 Smart validation based on changes...');
    
    if (changedFiles.length === 0) {
      changedFiles = this.getChangedFiles();
    }
    
    const validationPlan = this.createValidationPlan(changedFiles);
    const results = {};
    
    console.log(`📋 Validation plan: ${validationPlan.join(', ')}`);
    
    for (const validation of validationPlan) {
      switch (validation) {
        case 'crisis':
          results.crisis = await this.quickCrisisCheck();
          break;
        case 'clinical':
          results.clinical = await this.quickClinicalCheck();
          break;
        case 'syntax':
          results.syntax = await this.quickSyntaxCheck();
          break;
        case 'performance':
          results.performance = await this.quickPerfCheck('');
          break;
        case 'tests':
          results.tests = await this.runChangedFileTests(changedFiles);
          break;
      }
      
      // Stop on critical failures
      if ((validation === 'crisis' || validation === 'clinical') && !results[validation].success) {
        console.log(`🚨 Critical failure in ${validation} - stopping validation`);
        break;
      }
    }
    
    this.printSmartValidationSummary(results);
    return results;
  }

  // Get changed files from git
  getChangedFiles() {
    try {
      const result = execSync('git diff --name-only HEAD', { encoding: 'utf8' });
      return result.trim().split('\\n').filter(f => f && (f.endsWith('.ts') || f.endsWith('.tsx')));
    } catch (error) {
      return [];
    }
  }

  // Create validation plan based on changed files
  createValidationPlan(changedFiles) {
    const plan = ['syntax']; // Always check syntax
    
    const hasCrisisChanges = changedFiles.some(f => 
      /crisis|emergency|intervention/i.test(f) || f.includes('crisis')
    );
    
    const hasClinicalChanges = changedFiles.some(f => 
      /clinical|phq|gad|assessment|therapeutic/i.test(f)
    );
    
    const hasPerformanceChanges = changedFiles.some(f => 
      /performance|animation|breathing/i.test(f)
    );
    
    if (hasCrisisChanges) {
      plan.push('crisis');
    }
    
    if (hasClinicalChanges) {
      plan.push('clinical');
    }
    
    if (hasPerformanceChanges) {
      plan.push('performance');
    }
    
    // Always run relevant tests
    if (changedFiles.length > 0) {
      plan.push('tests');
    }
    
    return plan;
  }

  // Run tests for changed files
  async runChangedFileTests(changedFiles) {
    if (changedFiles.length === 0) return { success: true };
    
    console.log(`🧪 Testing changed files (${changedFiles.length} files)...`);
    
    const testFiles = changedFiles
      .map(f => f.replace(/\\.(ts|tsx)$/, '.test.$1'))
      .filter(f => fs.existsSync(f));
    
    if (testFiles.length === 0) {
      console.log('ℹ️ No test files found for changed files');
      return { success: true };
    }
    
    try {
      const testPattern = testFiles.join('|');
      const command = `npm run test:quick -- --testPathPattern="${testPattern}"`;
      const result = execSync(command, { 
        encoding: 'utf8',
        timeout: 120000 // 2min max
      });
      
      console.log(`✅ Tests passed for ${testFiles.length} test files`);
      return { success: true, output: result };
    } catch (error) {
      console.log(`❌ Tests failed for changed files`);
      return { success: false, error: error.message };
    }
  }

  // Watch mode for continuous validation
  async watchMode(pattern = '') {
    console.log('👀 Starting quick validation watch mode...');
    console.log('File changes will trigger smart validation');
    console.log('Press Ctrl+C to exit\\n');

    const chokidar = require('chokidar');
    
    const watchPath = path.join(this.rootDir, 'src/**/*.{ts,tsx}');
    let debounceTimer = null;
    
    const watcher = chokidar.watch(watchPath, {
      ignored: /(^|[\\/\\\\])\\../, // ignore dotfiles
      persistent: true
    });

    watcher.on('change', (filePath) => {
      console.log(`\\n🔄 File changed: ${path.relative(this.rootDir, filePath)}`);
      
      // Debounce rapid changes
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        await this.smartValidation([filePath]);
      }, 1000);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\\n🛑 Stopping watch mode...');
      watcher.close();
      process.exit(0);
    });
    
    console.log('👀 Watching for changes...');
  }

  // Interactive validation mode
  async interactiveMode() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('🎮 Interactive Quick Validation');
    console.log('Commands:');
    console.log('  c  - Crisis safety check');
    console.log('  cl - Clinical accuracy check');
    console.log('  s  - Syntax check');
    console.log('  p  - Performance check');
    console.log('  a  - Smart validation (all relevant)');
    console.log('  f  - Fix lint issues');
    console.log('  t  - Test specific file');
    console.log('  q  - Quit');
    console.log();

    const prompt = () => {
      rl.question('Quick validation> ', async (input) => {
        const command = input.trim().toLowerCase();
        
        switch (command) {
          case 'c':
            await this.quickCrisisCheck();
            break;
          case 'cl':
            await this.quickClinicalCheck();
            break;
          case 's':
            await this.quickSyntaxCheck();
            break;
          case 'p':
            await this.quickPerfCheck('');
            break;
          case 'a':
            await this.smartValidation();
            break;
          case 'f':
            await this.quickLintFix();
            break;
          case 't':
            rl.question('File path> ', async (filePath) => {
              if (filePath.trim()) {
                await this.quickTestFile(filePath.trim());
              }
              prompt();
            });
            return;
          case 'q':
            console.log('👋 Goodbye!');
            rl.close();
            return;
          default:
            console.log('❓ Unknown command');
        }
        
        prompt();
      });
    };

    prompt();
  }

  // Print smart validation summary
  printSmartValidationSummary(results) {
    const duration = Date.now() - this.startTime;
    
    console.log('\\n📊 Smart Validation Summary');
    console.log(''.padEnd(35, '='));
    
    Object.entries(results).forEach(([type, result]) => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${type}: ${result.success ? 'PASSED' : 'FAILED'}`);
    });
    
    const allPassed = Object.values(results).every(r => r.success);
    const criticalTests = ['crisis', 'clinical'];
    const criticalPassed = criticalTests.every(t => !results[t] || results[t].success);
    
    console.log(''.padEnd(35, '-'));
    console.log(`Duration: ${duration}ms`);
    
    if (allPassed) {
      console.log('🎉 All validations passed!');
    } else if (criticalPassed) {
      console.log('⚠️ Some validations failed, but critical safety tests passed');
    } else {
      console.log('🚨 Critical safety validations failed!');
    }
    
    console.log(''.padEnd(35, '=') + '\\n');
  }
}

// CLI interface
async function main() {
  const validator = new QuickValidation();
  const command = process.argv[2] || 'smart';
  const args = process.argv.slice(3);

  try {
    switch (command) {
      case 'smart':
        await validator.smartValidation(args);
        break;
      case 'crisis':
        await validator.quickCrisisCheck();
        break;
      case 'clinical':
        await validator.quickClinicalCheck();
        break;
      case 'syntax':
        await validator.quickSyntaxCheck(args[0]);
        break;
      case 'performance':
      case 'perf':
        await validator.quickPerfCheck(args[0] || '');
        break;
      case 'test':
        if (!args[0]) {
          console.log('Usage: quick-validation test <file-path>');
          process.exit(1);
        }
        await validator.quickTestFile(args[0]);
        break;
      case 'fix':
        await validator.quickLintFix(args[0]);
        break;
      case 'watch':
        await validator.watchMode(args[0]);
        break;
      case 'interactive':
      case 'i':
        await validator.interactiveMode();
        break;
      default:
        console.log('Usage: node quick-validation.js [command] [args...]');
        console.log('Commands:');
        console.log('  smart [files...]  - Smart validation based on changes');
        console.log('  crisis           - Quick crisis safety check');
        console.log('  clinical         - Quick clinical accuracy check');
        console.log('  syntax [file]    - Quick syntax/type check');
        console.log('  performance [component] - Quick performance check');
        console.log('  test <file>      - Quick test for specific file');
        console.log('  fix [file]       - Quick lint fix');
        console.log('  watch [pattern]  - Watch mode with smart validation');
        console.log('  interactive      - Interactive validation mode');
        process.exit(1);
    }
  } catch (error) {
    console.error('🚨 Quick validation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = QuickValidation;