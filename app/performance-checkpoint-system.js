#!/usr/bin/env node

/**
 * FullMind MBCT Performance Checkpoint System
 * 
 * Before/after performance comparison for each cleanup phase
 * Automated regression detection with rollback triggers
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🏥 FullMind MBCT Performance Checkpoint System');
console.log('==============================================');

const checkpointType = process.argv[2] || 'before'; // 'before' or 'after'
const phaseName = process.argv[3] || 'cleanup-phase';

const checkpoint = {
  timestamp: new Date().toISOString(),
  phase: phaseName,
  type: checkpointType, // 'before' or 'after'
  measurements: {},
  comparison: {},
  regression_detection: {},
  rollback_triggers: {
    crisis_response_max_ms: 300, // Triggers rollback if exceeded
    memory_increase_max_percent: 20,
    bundle_increase_max_percent: 10,
    test_failure_critical: true,
  },
};

console.log(`📊 Creating ${checkpointType.toUpperCase()} checkpoint for: ${phaseName}`);

/**
 * 1. Core Performance Measurements
 */
console.log('\n⚡ Measuring Core Performance Metrics...');

try {
  // Memory usage snapshot
  const memInfo = process.memoryUsage();
  checkpoint.measurements.memory = {
    heap_used_mb: Math.round(memInfo.heapUsed / 1024 / 1024),
    heap_total_mb: Math.round(memInfo.heapTotal / 1024 / 1024),
    rss_mb: Math.round(memInfo.rss / 1024 / 1024),
    external_mb: Math.round(memInfo.external / 1024 / 1024),
  };

  // Bundle metrics
  const totalFiles = parseInt(execSync('find . -name "*.ts" -o -name "*.tsx" -not -path "./node_modules/*" | wc -l', { cwd: __dirname }).toString().trim());
  const srcFiles = parseInt(execSync('find src -name "*.ts" -o -name "*.tsx" | wc -l', { cwd: __dirname }).toString().trim());
  const crisisFiles = parseInt(execSync('find src -name "*crisis*" -o -name "*Crisis*" -o -name "*emergency*" | wc -l', { cwd: __dirname }).toString().trim());
  const assessmentFiles = parseInt(execSync('find src -name "*assessment*" -o -name "*Assessment*" -o -name "*PHQ*" -o -name "*GAD*" | wc -l', { cwd: __dirname }).toString().trim());
  const breathingFiles = parseInt(execSync('find src -name "*breathing*" -o -name "*Breathing*" -o -name "*animation*" | wc -l', { cwd: __dirname }).toString().trim());

  checkpoint.measurements.bundle = {
    total_typescript_files: totalFiles,
    src_typescript_files: srcFiles,
    crisis_files: crisisFiles,
    assessment_files: assessmentFiles,
    breathing_files: breathingFiles,
  };

  // Package dependencies
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  checkpoint.measurements.dependencies = {
    production_deps: Object.keys(packageJson.dependencies || {}).length,
    dev_deps: Object.keys(packageJson.devDependencies || {}).length,
    npm_scripts: Object.keys(packageJson.scripts || {}).length,
  };

  console.log(`    ✅ Memory: ${checkpoint.measurements.memory.heap_used_mb}MB heap, ${checkpoint.measurements.memory.rss_mb}MB RSS`);
  console.log(`    ✅ Files: ${totalFiles} total, ${srcFiles} src, ${crisisFiles} crisis`);
  console.log(`    ✅ Dependencies: ${checkpoint.measurements.dependencies.production_deps} prod + ${checkpoint.measurements.dependencies.dev_deps} dev`);
  console.log(`    ✅ NPM Scripts: ${checkpoint.measurements.dependencies.npm_scripts}`);

} catch (error) {
  console.log(`    ❌ Core measurements failed: ${error.message}`);
  checkpoint.measurements.error = error.message;
}

/**
 * 2. Critical Performance Tests
 */
console.log('\n🧪 Running Critical Performance Tests...');

const criticalTests = [
  { name: 'TypeScript Check', command: 'npx tsc --noEmit', timeout: 30000, critical: false },
  { name: 'Crisis Performance', command: 'npm run perf:crisis', timeout: 15000, critical: true },
  { name: 'Memory Test', command: 'node -e "console.log(process.memoryUsage())"', timeout: 5000, critical: false },
];

checkpoint.measurements.test_results = {};

for (const test of criticalTests) {
  console.log(`    🧪 ${test.name}...`);
  const testStart = Date.now();
  
  try {
    const result = execSync(test.command, { 
      cwd: __dirname, 
      timeout: test.timeout, 
      stdio: 'pipe' 
    }).toString();
    
    const testTime = Date.now() - testStart;
    
    checkpoint.measurements.test_results[test.name] = {
      status: 'PASS',
      execution_time_ms: testTime,
      critical: test.critical,
      within_crisis_threshold: testTime < checkpoint.rollback_triggers.crisis_response_max_ms,
    };
    
    console.log(`      ✅ PASS (${testTime}ms)`);
    
  } catch (error) {
    checkpoint.measurements.test_results[test.name] = {
      status: 'FAIL',
      execution_time_ms: Date.now() - testStart,
      critical: test.critical,
      error: error.message.substring(0, 100),
    };
    
    console.log(`      ${test.critical ? '🚨' : '⚠️'} FAIL`);
  }
}

/**
 * 3. Comparison with Previous Checkpoint (if 'after' type)
 */
if (checkpointType === 'after') {
  console.log('\n📊 Comparing with BEFORE checkpoint...');
  
  const beforeCheckpointPath = `./performance-checkpoint-before-${phaseName}.json`;
  
  try {
    if (fs.existsSync(beforeCheckpointPath)) {
      const beforeCheckpoint = JSON.parse(fs.readFileSync(beforeCheckpointPath, 'utf8'));
      
      // Memory comparison
      const memoryBefore = beforeCheckpoint.measurements.memory.heap_used_mb;
      const memoryAfter = checkpoint.measurements.memory.heap_used_mb;
      const memoryChange = ((memoryAfter - memoryBefore) / memoryBefore * 100).toFixed(1);
      
      checkpoint.comparison.memory = {
        before_mb: memoryBefore,
        after_mb: memoryAfter,
        change_percent: parseFloat(memoryChange),
        improved: memoryChange < 0,
        regression: parseFloat(memoryChange) > checkpoint.rollback_triggers.memory_increase_max_percent,
      };
      
      // Bundle comparison
      const bundleBefore = beforeCheckpoint.measurements.bundle.total_typescript_files;
      const bundleAfter = checkpoint.measurements.bundle.total_typescript_files;
      const bundleChange = ((bundleAfter - bundleBefore) / bundleBefore * 100).toFixed(1);
      
      checkpoint.comparison.bundle = {
        before_files: bundleBefore,
        after_files: bundleAfter,
        change_percent: parseFloat(bundleChange),
        improved: bundleChange < 0,
        regression: parseFloat(bundleChange) > checkpoint.rollback_triggers.bundle_increase_max_percent,
      };
      
      // Crisis files comparison (critical safety check)
      const crisisBefore = beforeCheckpoint.measurements.bundle.crisis_files;
      const crisisAfter = checkpoint.measurements.bundle.crisis_files;
      const crisisChange = crisisAfter - crisisBefore;
      
      checkpoint.comparison.crisis_safety = {
        before_files: crisisBefore,
        after_files: crisisAfter,
        change_absolute: crisisChange,
        preserved: crisisChange >= -Math.floor(crisisBefore * 0.2), // Allow max 20% reduction
        critical_regression: crisisChange < -Math.floor(crisisBefore * 0.2),
      };
      
      console.log(`      📊 Memory: ${memoryBefore}MB → ${memoryAfter}MB (${memoryChange}%)`);
      console.log(`      📦 Bundle: ${bundleBefore} → ${bundleAfter} files (${bundleChange}%)`);
      console.log(`      🚨 Crisis files: ${crisisBefore} → ${crisisAfter} (${crisisChange >= 0 ? '+' : ''}${crisisChange})`);
      
    } else {
      console.log(`      ⚠️  No BEFORE checkpoint found at: ${beforeCheckpointPath}`);
      checkpoint.comparison.error = 'No before checkpoint available';
    }
    
  } catch (error) {
    console.log(`      ❌ Comparison failed: ${error.message}`);
    checkpoint.comparison.error = error.message;
  }
}

/**
 * 4. Regression Detection and Rollback Analysis
 */
console.log('\n🔍 Regression Detection Analysis...');

checkpoint.regression_detection = {
  memory_regression: false,
  bundle_regression: false,
  crisis_safety_regression: false,
  test_failures: [],
  rollback_required: false,
  rollback_reasons: [],
};

// Check memory regression
if (checkpoint.comparison.memory?.regression) {
  checkpoint.regression_detection.memory_regression = true;
  checkpoint.regression_detection.rollback_reasons.push(`Memory increased by ${checkpoint.comparison.memory.change_percent}% > ${checkpoint.rollback_triggers.memory_increase_max_percent}% limit`);
}

// Check bundle regression
if (checkpoint.comparison.bundle?.regression) {
  checkpoint.regression_detection.bundle_regression = true;
  checkpoint.regression_detection.rollback_reasons.push(`Bundle size increased by ${checkpoint.comparison.bundle.change_percent}% > ${checkpoint.rollback_triggers.bundle_increase_max_percent}% limit`);
}

// Check crisis safety regression
if (checkpoint.comparison.crisis_safety?.critical_regression) {
  checkpoint.regression_detection.crisis_safety_regression = true;
  checkpoint.regression_detection.rollback_reasons.push(`Crisis components reduced beyond safe threshold`);
}

// Check critical test failures
Object.entries(checkpoint.measurements.test_results).forEach(([testName, result]) => {
  if (result.status === 'FAIL' && result.critical) {
    checkpoint.regression_detection.test_failures.push(testName);
    if (checkpoint.rollback_triggers.test_failure_critical) {
      checkpoint.regression_detection.rollback_reasons.push(`Critical test failed: ${testName}`);
    }
  }
  
  if (result.execution_time_ms >= checkpoint.rollback_triggers.crisis_response_max_ms && result.critical) {
    checkpoint.regression_detection.rollback_reasons.push(`${testName} execution time ${result.execution_time_ms}ms exceeds rollback threshold`);
  }
});

// Determine if rollback is required
checkpoint.regression_detection.rollback_required = checkpoint.regression_detection.rollback_reasons.length > 0;

console.log(`    🔍 Memory regression: ${checkpoint.regression_detection.memory_regression}`);
console.log(`    📦 Bundle regression: ${checkpoint.regression_detection.bundle_regression}`);
console.log(`    🚨 Crisis safety regression: ${checkpoint.regression_detection.crisis_safety_regression}`);
console.log(`    🧪 Test failures: ${checkpoint.regression_detection.test_failures.length}`);
console.log(`    🔄 Rollback required: ${checkpoint.regression_detection.rollback_required}`);

/**
 * 5. Save Checkpoint
 */
const checkpointPath = `./performance-checkpoint-${checkpointType}-${phaseName}.json`;
fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));

console.log('\n✅ Performance Checkpoint Complete');
console.log('==================================');
console.log(`📊 Checkpoint type: ${checkpointType.toUpperCase()}`);
console.log(`📁 Saved to: ${checkpointPath}`);

if (checkpoint.regression_detection.rollback_required) {
  console.log('\n🚨 ROLLBACK REQUIRED');
  console.log('===================');
  console.log('Performance regression detected:');
  checkpoint.regression_detection.rollback_reasons.forEach(reason => {
    console.log(`   🚨 ${reason}`);
  });
  
  console.log('\n🔄 ROLLBACK PROTOCOL:');
  console.log('• Stop all cleanup operations immediately');
  console.log('• Revert changes made in this phase');
  console.log('• Validate crisis functionality manually');
  console.log('• Run full performance test suite');
  console.log('• Investigate root cause before proceeding');
  
} else if (checkpointType === 'after') {
  console.log('\n✅ CHECKPOINT VALIDATION PASSED');
  console.log('==============================');
  
  if (checkpoint.comparison.memory?.improved) {
    console.log(`   🎉 Memory improved by ${Math.abs(checkpoint.comparison.memory.change_percent)}%`);
  }
  
  if (checkpoint.comparison.bundle?.improved) {
    console.log(`   🎉 Bundle size reduced by ${Math.abs(checkpoint.comparison.bundle.change_percent)}%`);
  }
  
  if (checkpoint.comparison.crisis_safety?.preserved) {
    console.log(`   ✅ Crisis safety components preserved`);
  }
  
  console.log('\n🚀 Safe to continue to next cleanup phase');
  
} else {
  console.log('\n📊 BASELINE CHECKPOINT ESTABLISHED');
  console.log('=================================');
  console.log('Ready to begin cleanup phase. Run with "after" when complete.');
}

console.log('\n🏥 Next Steps:');
if (checkpointType === 'before') {
  console.log(`• Proceed with ${phaseName} cleanup operations`);
  console.log(`• Run: node performance-checkpoint-system.js after ${phaseName}`);
  console.log('• Monitor crisis performance continuously');
} else {
  console.log('• Review checkpoint comparison results');
  console.log('• Address any performance regressions');
  console.log('• Document cleanup optimizations achieved');
  console.log('• Proceed to next phase if validation passed');
}

return checkpoint;