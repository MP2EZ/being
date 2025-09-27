#!/usr/bin/env node
/**
 * TypeScript Build Configuration Manager
 * Clinical-grade build performance optimization
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TypeScriptBuildManager {
  constructor() {
    this.appRoot = path.resolve(__dirname, '..');
    this.tsconfigPath = path.join(this.appRoot, 'tsconfig.json');
    this.buildInfoPath = path.join(this.appRoot, '.tsbuildinfo');
  }

  /**
   * Validate TypeScript configuration for clinical requirements
   */
  validateClinicalTypeScript() {
    console.log('🏥 Validating clinical-grade TypeScript configuration...');
    
    try {
      const tsconfig = JSON.parse(fs.readFileSync(this.tsconfigPath, 'utf8'));
      const { compilerOptions } = tsconfig;
      
      // Critical clinical type safety checks
      const criticalOptions = [
        'strict',
        'exactOptionalPropertyTypes', 
        'noUncheckedIndexedAccess'
      ];
      
      for (const option of criticalOptions) {
        if (!compilerOptions[option]) {
          throw new Error(`❌ CRITICAL: Missing clinical type safety option: ${option}`);
        }
      }
      
      // Performance optimization checks
      const performanceOptions = ['incremental', 'composite'];
      const hasPerformance = performanceOptions.some(opt => 
        compilerOptions.hasOwnProperty(opt)
      );
      
      if (!hasPerformance) {
        console.log('⚠️  Warning: No performance optimization options detected');
      }
      
      console.log('✅ Clinical TypeScript configuration validated');
      return true;
      
    } catch (error) {
      console.error('❌ TypeScript configuration validation failed:', error.message);
      return false;
    }
  }

  /**
   * Optimize build performance for development
   */
  optimizeForDevelopment() {
    console.log('🚀 Optimizing TypeScript build for development...');
    
    try {
      // Clear existing build info for fresh start
      if (fs.existsSync(this.buildInfoPath)) {
        fs.unlinkSync(this.buildInfoPath);
        console.log('🧹 Cleared existing build cache');
      }
      
      // Run incremental type check
      execSync('npx tsc --incremental --noEmit', { 
        cwd: this.appRoot,
        stdio: 'inherit'
      });
      
      console.log('✅ Development build optimized');
      return true;
      
    } catch (error) {
      console.error('❌ Development optimization failed:', error.message);
      return false;
    }
  }

  /**
   * Validate production readiness
   */
  validateProductionReadiness() {
    console.log('🏭 Validating production TypeScript readiness...');
    
    try {
      // Run strict type checking for production
      execSync('npx tsc --noEmit --strict --exactOptionalPropertyTypes --noUncheckedIndexedAccess', {
        cwd: this.appRoot,
        stdio: 'inherit'
      });
      
      console.log('✅ Production TypeScript validation passed');
      return true;
      
    } catch (error) {
      console.error('❌ Production validation failed:', error.message);
      console.error('🚨 BLOCKING: Cannot deploy with TypeScript errors');
      return false;
    }
  }

  /**
   * Monitor build performance metrics
   */
  monitorBuildPerformance() {
    console.log('📊 Monitoring TypeScript build performance...');
    
    const startTime = process.hrtime();
    
    try {
      execSync('npx tsc --noEmit --incremental', {
        cwd: this.appRoot,
        stdio: 'pipe'
      });
      
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds + nanoseconds / 1e9;
      
      console.log(`⏱️  TypeScript compilation: ${duration.toFixed(2)}s`);
      
      if (duration > 10) {
        console.log('⚠️  Warning: Compilation time exceeds 10s performance target');
      } else {
        console.log('✅ Build performance within acceptable range');
      }
      
      return { duration, success: true };
      
    } catch (error) {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds + nanoseconds / 1e9;
      
      console.error(`❌ TypeScript compilation failed after ${duration.toFixed(2)}s`);
      return { duration, success: false };
    }
  }

  /**
   * Generate build report
   */
  generateBuildReport() {
    const report = {
      timestamp: new Date().toISOString(),
      configuration: 'clinical-grade',
      validations: {},
      performance: {}
    };
    
    // Run all validations
    report.validations.clinical = this.validateClinicalTypeScript();
    report.performance = this.monitorBuildPerformance();
    report.validations.production = this.validateProductionReadiness();
    
    // Save report
    const reportPath = path.join(this.appRoot, 'typescript-build-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📋 Build report saved to: ${reportPath}`);
    return report;
  }
}

// CLI Interface
if (require.main === module) {
  const manager = new TypeScriptBuildManager();
  const command = process.argv[2];
  
  switch (command) {
    case 'validate':
      manager.validateClinicalTypeScript();
      break;
    case 'optimize':
      manager.optimizeForDevelopment();
      break;
    case 'production':
      manager.validateProductionReadiness();
      break;
    case 'monitor':
      manager.monitorBuildPerformance();
      break;
    case 'report':
      manager.generateBuildReport();
      break;
    default:
      console.log(`
TypeScript Build Configuration Manager

Usage:
  node scripts/typescript-build-config.js <command>

Commands:
  validate   - Validate clinical-grade TypeScript configuration
  optimize   - Optimize build for development
  production - Validate production readiness  
  monitor    - Monitor build performance
  report     - Generate comprehensive build report

Examples:
  npm run typecheck:validate
  npm run typecheck:optimize
  npm run typecheck:production
      `);
  }
}

module.exports = TypeScriptBuildManager;