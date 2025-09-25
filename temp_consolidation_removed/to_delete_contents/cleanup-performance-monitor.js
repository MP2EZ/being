#!/usr/bin/env node

/**
 * FullMind MBCT Cleanup Performance Monitor
 * 
 * Real-time performance monitoring during systematic cleanup phases.
 * Validates no regression in therapeutic safety and clinical accuracy.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🏥 FullMind MBCT Cleanup Performance Monitor');
console.log('==========================================');

// Load baseline for comparison
let baseline = {};
try {
  baseline = JSON.parse(fs.readFileSync('./performance-baseline-report.json', 'utf8'));
  console.log(`📊 Loaded baseline from: ${baseline.timestamp}`);
} catch (e) {
  console.log('⚠️  Warning: No baseline found. Run performance-baseline-measurement.js first');
}

const monitor = {
  timestamp: new Date().toISOString(),
  phase: process.argv[2] || 'Unknown Phase',
  baseline_comparison: {},
  current_measurements: {},
  regression_analysis: {},
  safety_validation: {},
  recommendations: [],
};

console.log(`🔍 Monitoring Phase: ${monitor.phase}`);

/**
 * 1. Quick Performance Health Check
 */
console.log('\n⚡ Running Quick Performance Health Check...');

try {
  // Memory usage
  const memInfo = process.memoryUsage();
  const currentMemoryMB = Math.round(memInfo.heapUsed / 1024 / 1024);
  const baselineMemoryMB = baseline.measurements?.memory_baseline ? 
    parseInt(baseline.measurements.memory_baseline.node_heap_used) : null;

  monitor.current_measurements.memory = {
    heap_used_mb: currentMemoryMB,
    heap_total_mb: Math.round(memInfo.heapTotal / 1024 / 1024),
    rss_mb: Math.round(memInfo.rss / 1024 / 1024),
    within_mobile_target: currentMemoryMB < 50,
  };

  if (baselineMemoryMB) {
    const memoryChange = ((currentMemoryMB - baselineMemoryMB) / baselineMemoryMB * 100).toFixed(1);
    monitor.baseline_comparison.memory = {
      baseline_mb: baselineMemoryMB,
      current_mb: currentMemoryMB,
      change_percent: `${memoryChange}%`,
      regression: Math.abs(memoryChange) > 10,
    };
  }

  console.log(`  ✅ Memory: ${currentMemoryMB}MB heap (${Math.round(memInfo.rss / 1024 / 1024)}MB RSS)`);
  if (currentMemoryMB >= 50) {
    console.log('  🚨 WARNING: Memory exceeds 50MB mobile target');
    monitor.recommendations.push('Memory usage exceeds mobile target - investigate memory leaks');
  }

} catch (error) {
  console.log(`  ❌ Memory check failed: ${error.message}`);
}

/**
 * 2. Bundle Size Analysis
 */
console.log('\n📦 Analyzing Bundle Size Changes...');

try {
  const currentFiles = parseInt(execSync('find . -name "*.ts" -o -name "*.tsx" -not -path "./node_modules/*" | wc -l', { cwd: __dirname }).toString().trim());
  const currentSrcFiles = parseInt(execSync('find src -name "*.ts" -o -name "*.tsx" | wc -l', { cwd: __dirname }).toString().trim());
  
  monitor.current_measurements.bundle = {
    total_typescript_files: currentFiles,
    src_typescript_files: currentSrcFiles,
    timestamp: new Date().toISOString(),
  };

  if (baseline.measurements?.bundle_analysis) {
    const baselineTotal = baseline.measurements.bundle_analysis.typescript_files.total_project;
    const baselineSrc = baseline.measurements.bundle_analysis.typescript_files.src_directory;
    
    const totalChange = ((currentFiles - baselineTotal) / baselineTotal * 100).toFixed(1);
    const srcChange = ((currentSrcFiles - baselineSrc) / baselineSrc * 100).toFixed(1);
    
    monitor.baseline_comparison.bundle = {
      total_files: { baseline: baselineTotal, current: currentFiles, change: `${totalChange}%` },
      src_files: { baseline: baselineSrc, current: currentSrcFiles, change: `${srcChange}%` },
      improvement: totalChange < 0 && srcChange < 0,
    };

    console.log(`  📊 Total files: ${baselineTotal} → ${currentFiles} (${totalChange}%)`);
    console.log(`  📊 Src files: ${baselineSrc} → ${currentSrcFiles} (${srcChange}%)`);
    
    if (totalChange < 0 || srcChange < 0) {
      console.log(`  ✅ Bundle size reduction achieved`);
    } else {
      console.log(`  ⚠️  Bundle size increased - validate cleanup progress`);
    }
  }

} catch (error) {
  console.log(`  ❌ Bundle analysis failed: ${error.message}`);
}

/**
 * 3. Critical Component Validation
 */
console.log('\n🚨 Validating Critical Components...');

try {
  const criticalComponents = {
    crisis_files: parseInt(execSync('find src -name "*crisis*" -o -name "*Crisis*" | wc -l', { cwd: __dirname }).toString().trim()),
    emergency_files: parseInt(execSync('find src -name "*emergency*" -o -name "*Emergency*" | wc -l', { cwd: __dirname }).toString().trim()),
    assessment_files: parseInt(execSync('find src -name "*assessment*" -o -name "*Assessment*" -o -name "*PHQ*" -o -name "*GAD*" | wc -l', { cwd: __dirname }).toString().trim()),
    breathing_files: parseInt(execSync('find src -name "*breathing*" -o -name "*Breathing*" -o -name "*animation*" | wc -l', { cwd: __dirname }).toString().trim()),
    store_files: parseInt(execSync('find src -name "*store*" -o -name "*Store*" | wc -l', { cwd: __dirname }).toString().trim()),
  };

  monitor.current_measurements.critical_components = criticalComponents;

  // Validate against baseline
  if (baseline.measurements?.critical_components) {
    const baseline_components = baseline.measurements.critical_components;
    
    monitor.safety_validation = {
      crisis_safety: {
        baseline: baseline_components.crisis_safety,
        current: criticalComponents.crisis_files + criticalComponents.emergency_files,
        safe: (criticalComponents.crisis_files + criticalComponents.emergency_files) >= baseline_components.crisis_safety * 0.8,
      },
      clinical_assessment: {
        baseline: baseline_components.clinical_assessment,
        current: criticalComponents.assessment_files,
        safe: criticalComponents.assessment_files >= baseline_components.clinical_assessment * 0.8,
      },
      therapeutic_animations: {
        baseline: baseline_components.therapeutic_animations,
        current: criticalComponents.breathing_files,
        safe: criticalComponents.breathing_files >= baseline_components.therapeutic_animations * 0.8,
      },
    };

    console.log(`  🚨 Crisis components: ${monitor.safety_validation.crisis_safety.baseline} → ${monitor.safety_validation.crisis_safety.current} ${monitor.safety_validation.crisis_safety.safe ? '✅' : '🚨'}`);
    console.log(`  📊 Assessment components: ${monitor.safety_validation.clinical_assessment.baseline} → ${monitor.safety_validation.clinical_assessment.current} ${monitor.safety_validation.clinical_assessment.safe ? '✅' : '🚨'}`);
    console.log(`  🫁 Breathing components: ${monitor.safety_validation.therapeutic_animations.baseline} → ${monitor.safety_validation.therapeutic_animations.current} ${monitor.safety_validation.therapeutic_animations.safe ? '✅' : '🚨'}`);

    // Check for safety violations
    Object.entries(monitor.safety_validation).forEach(([key, validation]) => {
      if (!validation.safe) {
        monitor.recommendations.push(`CRITICAL: ${key} components reduced beyond safe threshold`);
      }
    });
  }

} catch (error) {
  console.log(`  ❌ Critical component validation failed: ${error.message}`);
}

/**
 * 4. Test Infrastructure Validation
 */
console.log('\n🧪 Validating Test Infrastructure...');

try {
  const testFiles = {
    performance_tests: parseInt(execSync('find __tests__ -name "*perf*" -o -name "*performance*" | wc -l', { cwd: __dirname }).toString().trim()),
    crisis_tests: parseInt(execSync('find __tests__ -name "*crisis*" -o -name "*Crisis*" | wc -l', { cwd: __dirname }).toString().trim()),
    clinical_tests: parseInt(execSync('find __tests__ -name "*clinical*" -o -name "*Clinical*" -o -name "*PHQ*" -o -name "*GAD*" | wc -l', { cwd: __dirname }).toString().trim()),
  };

  monitor.current_measurements.test_infrastructure = testFiles;

  const totalTests = Object.values(testFiles).reduce((sum, count) => sum + count, 0);
  console.log(`  🧪 Performance tests: ${testFiles.performance_tests}`);
  console.log(`  🚨 Crisis tests: ${testFiles.crisis_tests}`);
  console.log(`  🏥 Clinical tests: ${testFiles.clinical_tests}`);
  console.log(`  📊 Total critical tests: ${totalTests}`);

  if (totalTests < 40) {
    monitor.recommendations.push('Test infrastructure may have been affected by cleanup - validate test coverage');
  }

} catch (error) {
  console.log(`  ❌ Test infrastructure validation failed: ${error.message}`);
}

/**
 * 5. Quick Performance Test Execution
 */
console.log('\n⚡ Running Quick Performance Validation...');

const performanceTests = [
  { name: 'TypeScript Compilation', command: 'npx tsc --noEmit', timeout: 30000, critical: false },
  { name: 'Crisis Performance', command: 'npm run perf:crisis', timeout: 20000, critical: true },
  { name: 'Clinical Accuracy', command: 'npm run test:clinical', timeout: 20000, critical: true },
];

monitor.performance_validation = {};

for (const test of performanceTests) {
  console.log(`  🧪 Testing: ${test.name}...`);
  const testStart = Date.now();
  
  try {
    execSync(test.command, { cwd: __dirname, timeout: test.timeout, stdio: 'pipe' });
    const testTime = Date.now() - testStart;
    
    monitor.performance_validation[test.name] = {
      status: 'PASS',
      execution_time: `${testTime}ms`,
      critical: test.critical,
    };
    
    console.log(`    ✅ ${test.name}: PASS (${testTime}ms)`);
    
  } catch (error) {
    monitor.performance_validation[test.name] = {
      status: 'FAIL',
      error: error.message.substring(0, 100) + '...',
      critical: test.critical,
    };
    
    console.log(`    ${test.critical ? '🚨' : '⚠️'} ${test.name}: FAIL`);
    
    if (test.critical) {
      monitor.recommendations.push(`CRITICAL: ${test.name} failing - immediate attention required`);
    } else {
      monitor.recommendations.push(`Warning: ${test.name} failing - may need configuration`);
    }
  }
}

/**
 * 6. Regression Analysis
 */
console.log('\n📊 Performing Regression Analysis...');

monitor.regression_analysis = {
  memory_regression: monitor.baseline_comparison.memory?.regression || false,
  bundle_improvement: monitor.baseline_comparison.bundle?.improvement || false,
  safety_violations: [],
  performance_failures: [],
};

// Check for safety violations
Object.entries(monitor.safety_validation || {}).forEach(([component, validation]) => {
  if (!validation.safe) {
    monitor.regression_analysis.safety_violations.push(component);
  }
});

// Check for performance failures
Object.entries(monitor.performance_validation).forEach(([test, result]) => {
  if (result.status === 'FAIL' && result.critical) {
    monitor.regression_analysis.performance_failures.push(test);
  }
});

const regressionCount = monitor.regression_analysis.safety_violations.length + 
                       monitor.regression_analysis.performance_failures.length +
                       (monitor.regression_analysis.memory_regression ? 1 : 0);

console.log(`  📊 Regression violations: ${regressionCount}`);
console.log(`  📦 Bundle improvement: ${monitor.regression_analysis.bundle_improvement ? 'YES' : 'NO'}`);
console.log(`  🧠 Memory regression: ${monitor.regression_analysis.memory_regression ? 'YES' : 'NO'}`);
console.log(`  🚨 Safety violations: ${monitor.regression_analysis.safety_violations.length}`);
console.log(`  ⚡ Performance failures: ${monitor.regression_analysis.performance_failures.length}`);

/**
 * 7. Generate Monitoring Report
 */
console.log('\n📋 Generating Cleanup Performance Report...');

// Calculate overall health score
let healthScore = 100;
healthScore -= monitor.regression_analysis.safety_violations.length * 30;
healthScore -= monitor.regression_analysis.performance_failures.length * 25;
healthScore -= monitor.regression_analysis.memory_regression ? 15 : 0;
healthScore += monitor.regression_analysis.bundle_improvement ? 10 : 0;

monitor.overall_assessment = {
  health_score: Math.max(0, Math.min(100, healthScore)),
  status: healthScore >= 90 ? 'EXCELLENT' : healthScore >= 70 ? 'GOOD' : healthScore >= 50 ? 'CONCERNING' : 'CRITICAL',
  cleanup_recommendation: healthScore >= 70 ? 'CONTINUE' : healthScore >= 50 ? 'PROCEED_WITH_CAUTION' : 'STOP_AND_ADDRESS',
};

// Save monitoring report
const reportPath = `./cleanup-performance-report-${monitor.phase.replace(/\s+/g, '-').toLowerCase()}.json`;
fs.writeFileSync(reportPath, JSON.stringify(monitor, null, 2));

console.log('\n✅ Cleanup Performance Monitoring Complete');
console.log('==========================================');
console.log(`🏥 Health Score: ${monitor.overall_assessment.health_score}/100`);
console.log(`📊 Status: ${monitor.overall_assessment.status}`);
console.log(`🚀 Recommendation: ${monitor.overall_assessment.cleanup_recommendation}`);
console.log(`📁 Report saved: ${reportPath}`);

if (monitor.recommendations.length > 0) {
  console.log('\n📋 Recommendations:');
  monitor.recommendations.forEach((rec, index) => {
    const icon = rec.startsWith('CRITICAL') ? '🚨' : '⚠️';
    console.log(`   ${icon} ${rec}`);
  });
}

if (monitor.overall_assessment.health_score < 70) {
  console.log('\n🚨 ATTENTION REQUIRED');
  console.log('===================');
  console.log('Performance degradation detected. Consider:');
  console.log('• Reviewing recent cleanup changes');
  console.log('• Running full performance test suite');
  console.log('• Validating critical therapeutic functionality');
  console.log('• Rolling back if safety-critical features affected');
}

if (monitor.overall_assessment.health_score >= 90) {
  console.log('\n🎉 CLEANUP PROGRESSING WELL');
  console.log('==========================');
  console.log('Performance maintained or improved. Continue with:');
  console.log('• Regular performance monitoring');
  console.log('• Validating each cleanup phase');
  console.log('• Documenting optimization gains');
}

console.log('\n🔄 Next Steps:');
console.log('• Run this monitor after each major cleanup phase');
console.log('• Address any critical recommendations immediately');
console.log('• Compare results with previous monitoring reports');
console.log('• Maintain baseline performance for therapeutic safety');

return monitor;