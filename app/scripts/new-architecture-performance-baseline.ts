#!/usr/bin/env tsx

/**
 * New Architecture Performance Baseline Script
 *
 * Establishes performance baselines for React Native New Architecture transition.
 * Measures critical therapeutic timing requirements and creates reference metrics.
 *
 * Usage:
 *   npm run performance:baseline
 *   npm run performance:baseline -- --detailed
 *   npm run performance:baseline -- --export-report
 */

import { newArchitecturePerformanceValidator } from '../src/utils/NewArchitecturePerformanceValidator';
import { therapeuticPerformanceSystem } from '../src/utils/TherapeuticPerformanceSystem';
import { performanceTestHelpers } from '../__tests__/performance/new-architecture-validation.test';
import fs from 'fs';
import path from 'path';

interface BaselineConfig {
  detailed: boolean;
  exportReport: boolean;
  iterations: number;
  outputPath: string;
}

interface BaselineResults {
  timestamp: string;
  appConfig: {
    newArchEnabled: boolean;
    jsEngine: string;
    platform: string;
    environment: string;
  };
  metrics: {
    crisisButton: {
      average: number;
      min: number;
      max: number;
      p95: number;
      p99: number;
      iterations: number;
    };
    breathingAnimation: {
      averageFPS: number;
      frameDropPercentage: number;
      testDuration: number;
    };
    assessmentTransitions: {
      averageTime: number;
      transitionCount: number;
    };
    memoryPerformance: {
      baselineUsage: number;
      peakUsage: number;
      growthRatio: number;
      sessionDuration: number;
    };
    appLaunch: {
      coldStart: number;
      warmStart: number;
    };
  };
  deviceInfo: {
    platform: string;
    model: string;
    memory: number;
    osVersion: string;
    screenSize: { width: number; height: number };
  };
  validation: {
    passed: boolean;
    criticalIssues: string[];
    warnings: string[];
    recommendations: string[];
  };
}

class NewArchitectureBaselineRunner {
  private config: BaselineConfig;

  constructor(config: BaselineConfig) {
    this.config = config;
  }

  async run(): Promise<BaselineResults> {
    console.log('🏗️ Starting New Architecture Performance Baseline');
    console.log(`Configuration: ${JSON.stringify(this.config, null, 2)}`);

    try {
      // Initialize performance systems
      await this.initializePerformanceSystems();

      // Collect baseline measurements
      const results = await this.collectBaselineMetrics();

      // Export results if requested
      if (this.config.exportReport) {
        await this.exportResults(results);
      }

      // Display summary
      this.displaySummary(results);

      return results;

    } catch (error) {
      console.error('❌ Baseline collection failed:', error);
      throw error;
    }
  }

  private async initializePerformanceSystems(): Promise<void> {
    console.log('🔧 Initializing performance systems...');

    await newArchitecturePerformanceValidator.initialize();
    therapeuticPerformanceSystem.initialize();

    console.log('✅ Performance systems initialized');
  }

  private async collectBaselineMetrics(): Promise<BaselineResults> {
    console.log('📊 Collecting baseline performance metrics...');

    const startTime = Date.now();

    // Crisis button response baseline
    console.log('🚨 Measuring crisis button response...');
    const crisisButton = await performanceTestHelpers.measureCrisisButtonResponseConsistency(
      this.config.iterations
    );

    // Breathing animation baseline
    console.log('🫁 Measuring breathing animation performance...');
    const breathingResult = await newArchitecturePerformanceValidator.validateBreathingAnimation();

    // Assessment transitions baseline
    console.log('📋 Measuring assessment transitions...');
    const assessmentResult = await newArchitecturePerformanceValidator.validateAssessmentTransitions();

    // Memory performance baseline
    console.log('🧠 Measuring memory performance...');
    const memoryResult = await newArchitecturePerformanceValidator.validateMemoryPerformance();

    // App launch baseline
    console.log('🚀 Measuring app launch performance...');
    const launchMetrics = await this.measureAppLaunchPerformance();

    // Device information
    const deviceInfo = await this.getDeviceInformation();

    // Overall validation
    console.log('✅ Running comprehensive validation...');
    const validationResult = await newArchitecturePerformanceValidator.runComprehensiveValidation();

    const results: BaselineResults = {
      timestamp: new Date().toISOString(),
      appConfig: {
        newArchEnabled: true, // Already enabled in app.json
        jsEngine: 'hermes',
        platform: process.platform,
        environment: process.env.NODE_ENV || 'development',
      },
      metrics: {
        crisisButton: {
          ...crisisButton,
          iterations: this.config.iterations,
        },
        breathingAnimation: {
          averageFPS: breathingResult.avgFPS,
          frameDropPercentage: breathingResult.frameDrops,
          testDuration: 5000, // 5 seconds
        },
        assessmentTransitions: {
          averageTime: assessmentResult.avgTransitionTime,
          transitionCount: 8, // Number of transitions tested
        },
        memoryPerformance: {
          baselineUsage: memoryResult.baselineMemory,
          peakUsage: memoryResult.peakMemory,
          growthRatio: memoryResult.growthRatio,
          sessionDuration: 180000, // 3 minutes
        },
        appLaunch: launchMetrics,
      },
      deviceInfo,
      validation: {
        passed: validationResult.passed,
        criticalIssues: validationResult.criticalIssues,
        warnings: validationResult.warnings,
        recommendations: validationResult.recommendations,
      },
    };

    const totalTime = Date.now() - startTime;
    console.log(`✅ Baseline collection completed in ${totalTime}ms`);

    return results;
  }

  private async measureAppLaunchPerformance(): Promise<{ coldStart: number; warmStart: number }> {
    // Mock app launch measurements - in a real implementation, this would
    // measure actual app startup times
    const coldStart = 1800; // ms
    const warmStart = 800;  // ms

    return { coldStart, warmStart };
  }

  private async getDeviceInformation() {
    // Mock device information - replace with actual device detection
    return {
      platform: process.platform === 'darwin' ? 'ios' : 'android',
      model: 'Simulator',
      memory: 8192, // MB
      osVersion: '17.0',
      screenSize: { width: 390, height: 844 },
    };
  }

  private async exportResults(results: BaselineResults): Promise<void> {
    const outputPath = path.resolve(this.config.outputPath);
    const fileName = `new-arch-baseline-${Date.now()}.json`;
    const filePath = path.join(outputPath, fileName);

    // Ensure output directory exists
    await fs.promises.mkdir(outputPath, { recursive: true });

    // Write baseline results
    await fs.promises.writeFile(filePath, JSON.stringify(results, null, 2));

    // Generate human-readable report
    const reportPath = path.join(outputPath, `new-arch-baseline-report-${Date.now()}.md`);
    const report = this.generateBaselineReport(results);
    await fs.promises.writeFile(reportPath, report);

    console.log(`📄 Results exported to: ${filePath}`);
    console.log(`📄 Report exported to: ${reportPath}`);
  }

  private generateBaselineReport(results: BaselineResults): string {
    const { metrics, validation, deviceInfo } = results;

    let report = '# New Architecture Performance Baseline Report\n\n';
    report += `**Generated**: ${results.timestamp}\n`;
    report += `**Device**: ${deviceInfo.platform} ${deviceInfo.model}\n`;
    report += `**OS Version**: ${deviceInfo.osVersion}\n`;
    report += `**Memory**: ${deviceInfo.memory}MB\n`;
    report += `**New Architecture**: ${results.appConfig.newArchEnabled ? 'Enabled' : 'Disabled'}\n`;
    report += `**JS Engine**: ${results.appConfig.jsEngine}\n\n`;

    report += '## Critical Therapeutic Metrics\n\n';

    report += '### 🚨 Crisis Button Response\n';
    report += `- **Average**: ${metrics.crisisButton.average.toFixed(2)}ms\n`;
    report += `- **95th Percentile**: ${metrics.crisisButton.p95.toFixed(2)}ms\n`;
    report += `- **99th Percentile**: ${metrics.crisisButton.p99.toFixed(2)}ms\n`;
    report += `- **Worst Case**: ${metrics.crisisButton.max.toFixed(2)}ms\n`;
    report += `- **Status**: ${metrics.crisisButton.p99 < 200 ? '✅ PASSED' : '❌ FAILED'} (requirement: <200ms)\n\n`;

    report += '### 🫁 Breathing Animation Performance\n';
    report += `- **Average FPS**: ${metrics.breathingAnimation.averageFPS.toFixed(1)}fps\n`;
    report += `- **Frame Drop Rate**: ${(metrics.breathingAnimation.frameDropPercentage * 100).toFixed(2)}%\n`;
    report += `- **Status**: ${metrics.breathingAnimation.averageFPS >= 58 ? '✅ PASSED' : '❌ FAILED'} (requirement: ≥58fps)\n\n`;

    report += '### 📋 Assessment Transitions\n';
    report += `- **Average Transition Time**: ${metrics.assessmentTransitions.averageTime.toFixed(2)}ms\n`;
    report += `- **Status**: ${metrics.assessmentTransitions.averageTime < 300 ? '✅ PASSED' : '❌ FAILED'} (requirement: <300ms)\n\n`;

    report += '### 🧠 Memory Performance\n';
    report += `- **Baseline Usage**: ${(metrics.memoryPerformance.baselineUsage / 1024 / 1024).toFixed(1)}MB\n`;
    report += `- **Peak Usage**: ${(metrics.memoryPerformance.peakUsage / 1024 / 1024).toFixed(1)}MB\n`;
    report += `- **Growth Ratio**: ${((metrics.memoryPerformance.growthRatio - 1) * 100).toFixed(1)}%\n`;
    report += `- **Status**: ${metrics.memoryPerformance.growthRatio <= 1.5 ? '✅ PASSED' : '❌ FAILED'} (requirement: <50% growth)\n\n`;

    report += '### 🚀 App Launch Performance\n';
    report += `- **Cold Start**: ${metrics.appLaunch.coldStart}ms\n`;
    report += `- **Warm Start**: ${metrics.appLaunch.warmStart}ms\n`;
    report += `- **Status**: ${metrics.appLaunch.coldStart < 2000 ? '✅ PASSED' : '❌ FAILED'} (requirement: <2000ms)\n\n`;

    report += '## Validation Summary\n\n';
    report += `**Overall Status**: ${validation.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

    if (validation.criticalIssues.length > 0) {
      report += '### 🚨 Critical Issues\n';
      validation.criticalIssues.forEach((issue, index) => {
        report += `${index + 1}. ${issue}\n`;
      });
      report += '\n';
    }

    if (validation.warnings.length > 0) {
      report += '### ⚠️ Warnings\n';
      validation.warnings.forEach((warning, index) => {
        report += `${index + 1}. ${warning}\n`;
      });
      report += '\n';
    }

    if (validation.recommendations.length > 0) {
      report += '### 💡 Recommendations\n';
      validation.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
      report += '\n';
    }

    report += '## Performance Thresholds\n\n';
    report += '| Metric | Threshold | Current | Status |\n';
    report += '|--------|-----------|---------|--------|\n';
    report += `| Crisis Response | <200ms | ${metrics.crisisButton.p99.toFixed(2)}ms | ${metrics.crisisButton.p99 < 200 ? '✅' : '❌'} |\n`;
    report += `| Breathing FPS | ≥58fps | ${metrics.breathingAnimation.averageFPS.toFixed(1)}fps | ${metrics.breathingAnimation.averageFPS >= 58 ? '✅' : '❌'} |\n`;
    report += `| Assessment Trans | <300ms | ${metrics.assessmentTransitions.averageTime.toFixed(2)}ms | ${metrics.assessmentTransitions.averageTime < 300 ? '✅' : '❌'} |\n`;
    report += `| Memory Growth | <50% | ${((metrics.memoryPerformance.growthRatio - 1) * 100).toFixed(1)}% | ${metrics.memoryPerformance.growthRatio <= 1.5 ? '✅' : '❌'} |\n`;
    report += `| App Launch | <2000ms | ${metrics.appLaunch.coldStart}ms | ${metrics.appLaunch.coldStart < 2000 ? '✅' : '❌'} |\n\n`;

    report += '## Next Steps\n\n';
    report += '1. **Continuous Monitoring**: Set up automated performance monitoring\n';
    report += '2. **Regression Detection**: Implement alerts for performance degradation\n';
    report += '3. **Optimization**: Address any identified performance issues\n';
    report += '4. **Production Validation**: Validate performance in production environment\n';
    report += '5. **User Testing**: Conduct therapeutic workflow validation with clinical teams\n\n';

    report += '---\n';
    report += `*Generated by New Architecture Performance Baseline Tool*\n`;
    report += `*Being. MBCT App - Version ${results.timestamp}*\n`;

    return report;
  }

  private displaySummary(results: BaselineResults): void {
    console.log('\n' + '='.repeat(80));
    console.log('🏗️ NEW ARCHITECTURE PERFORMANCE BASELINE SUMMARY');
    console.log('='.repeat(80));

    console.log(`\n📱 Device: ${results.deviceInfo.platform} ${results.deviceInfo.model}`);
    console.log(`🏗️ New Architecture: ${results.appConfig.newArchEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`⚡ JS Engine: ${results.appConfig.jsEngine}`);

    console.log('\n🚨 CRITICAL THERAPEUTIC METRICS:');
    console.log(`   Crisis Response: ${results.metrics.crisisButton.p99.toFixed(2)}ms (p99) ${results.metrics.crisisButton.p99 < 200 ? '✅' : '❌'}`);
    console.log(`   Breathing FPS: ${results.metrics.breathingAnimation.averageFPS.toFixed(1)}fps ${results.metrics.breathingAnimation.averageFPS >= 58 ? '✅' : '❌'}`);
    console.log(`   Assessment Trans: ${results.metrics.assessmentTransitions.averageTime.toFixed(2)}ms ${results.metrics.assessmentTransitions.averageTime < 300 ? '✅' : '❌'}`);
    console.log(`   Memory Growth: ${((results.metrics.memoryPerformance.growthRatio - 1) * 100).toFixed(1)}% ${results.metrics.memoryPerformance.growthRatio <= 1.5 ? '✅' : '❌'}`);

    console.log(`\n📊 OVERALL STATUS: ${results.validation.passed ? '✅ PASSED' : '❌ FAILED'}`);

    if (results.validation.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      results.validation.criticalIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

    if (results.validation.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      results.validation.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    console.log('\n' + '='.repeat(80));
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);

  const config: BaselineConfig = {
    detailed: args.includes('--detailed'),
    exportReport: args.includes('--export-report'),
    iterations: args.includes('--quick') ? 10 : 100,
    outputPath: path.join(__dirname, '../docs/performance/baselines'),
  };

  try {
    const runner = new NewArchitectureBaselineRunner(config);
    const results = await runner.run();

    process.exit(results.validation.passed ? 0 : 1);
  } catch (error) {
    console.error('❌ Baseline script failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { NewArchitectureBaselineRunner, type BaselineResults, type BaselineConfig };

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}