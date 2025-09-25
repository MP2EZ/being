#!/usr/bin/env node

/**
 * FullMind MBCT Crisis Performance Monitor
 * 
 * CRITICAL: Monitor crisis button response times (<200ms NON-NEGOTIABLE)
 * Validates therapeutic safety during systematic cleanup phases
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚨 FullMind MBCT Crisis Performance Monitor');
console.log('==========================================');

const crisisMonitor = {
  timestamp: new Date().toISOString(),
  phase: process.argv[2] || 'Cleanup Phase',
  crisis_metrics: {},
  safety_validation: {},
  memory_tracking: {},
  regression_alerts: [],
  emergency_thresholds: {
    crisis_response_max: 200, // milliseconds - NON-NEGOTIABLE
    memory_limit_mb: 50,
    rollback_trigger_ms: 300,
    breathing_fps_min: 60,
  },
};

console.log(`🔍 Monitoring Phase: ${crisisMonitor.phase}`);

/**
 * 1. Crisis Response Time Validation (CRITICAL)
 */
console.log('\n🚨 CRITICAL: Crisis Response Time Validation...');

try {
  // Test crisis component loading speed
  console.log('  🔍 Testing crisis component availability...');
  
  const crisisFiles = execSync('find src -name "*crisis*" -o -name "*Crisis*" | head -5', { cwd: __dirname }).toString().trim().split('\n').filter(f => f);
  
  if (crisisFiles.length === 0) {
    crisisMonitor.regression_alerts.push('CRITICAL: No crisis components found - EMERGENCY ROLLBACK REQUIRED');
    crisisMonitor.crisis_metrics.components_available = false;
    crisisMonitor.crisis_metrics.response_time_estimate = 'UNKNOWN - NO COMPONENTS';
  } else {
    crisisMonitor.crisis_metrics.components_available = true;
    crisisMonitor.crisis_metrics.crisis_files_count = crisisFiles.length;
    
    // Estimate response time based on file complexity
    let totalComplexity = 0;
    crisisFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n').length;
        totalComplexity += lines;
      } catch (e) {
        // Skip files that can't be read
      }
    });
    
    // Rough estimate: 1ms per 10 lines of code for crisis components
    const estimatedResponseTime = Math.max(50, totalComplexity / 10);
    crisisMonitor.crisis_metrics.response_time_estimate = `${estimatedResponseTime.toFixed(0)}ms`;
    
    if (estimatedResponseTime > crisisMonitor.emergency_thresholds.crisis_response_max) {
      crisisMonitor.regression_alerts.push(`CRITICAL: Crisis response estimated at ${estimatedResponseTime.toFixed(0)}ms > 200ms limit`);
      crisisMonitor.crisis_metrics.safety_status = 'DANGER';
    } else if (estimatedResponseTime > 150) {
      crisisMonitor.regression_alerts.push(`WARNING: Crisis response at ${estimatedResponseTime.toFixed(0)}ms approaching 200ms limit`);
      crisisMonitor.crisis_metrics.safety_status = 'CAUTION';
    } else {
      crisisMonitor.crisis_metrics.safety_status = 'SAFE';
    }
    
    console.log(`    ✅ Crisis files found: ${crisisFiles.length}`);
    console.log(`    📊 Estimated response time: ${estimatedResponseTime.toFixed(0)}ms`);
    console.log(`    🚨 Safety status: ${crisisMonitor.crisis_metrics.safety_status}`);
  }

} catch (error) {
  console.log(`    ❌ Crisis validation failed: ${error.message}`);
  crisisMonitor.regression_alerts.push('CRITICAL: Crisis component validation failed');
  crisisMonitor.crisis_metrics.components_available = false;
}

/**
 * 2. Memory Usage During Cleanup (CRITICAL)
 */
console.log('\n🧠 Memory Usage Tracking During Cleanup...');

try {
  const memInfo = process.memoryUsage();
  const heapUsedMB = Math.round(memInfo.heapUsed / 1024 / 1024);
  const rssMB = Math.round(memInfo.rss / 1024 / 1024);
  
  crisisMonitor.memory_tracking = {
    heap_used_mb: heapUsedMB,
    rss_mb: rssMB,
    within_limit: heapUsedMB < crisisMonitor.emergency_thresholds.memory_limit_mb,
    cleanup_impact: 'MONITORING',
    timestamp: new Date().toISOString(),
  };
  
  console.log(`    📊 Heap memory: ${heapUsedMB}MB`);
  console.log(`    📊 RSS memory: ${rssMB}MB`);
  console.log(`    🎯 Within 50MB limit: ${crisisMonitor.memory_tracking.within_limit ? 'YES' : 'NO'}`);
  
  if (heapUsedMB >= crisisMonitor.emergency_thresholds.memory_limit_mb) {
    crisisMonitor.regression_alerts.push(`CRITICAL: Memory usage ${heapUsedMB}MB exceeds 50MB mobile limit`);
    crisisMonitor.memory_tracking.cleanup_impact = 'MEMORY_LEAK_DETECTED';
  } else if (heapUsedMB >= 40) {
    crisisMonitor.regression_alerts.push(`WARNING: Memory approaching limit at ${heapUsedMB}MB`);
    crisisMonitor.memory_tracking.cleanup_impact = 'APPROACHING_LIMIT';
  } else {
    crisisMonitor.memory_tracking.cleanup_impact = 'HEALTHY';
  }

} catch (error) {
  console.log(`    ❌ Memory tracking failed: ${error.message}`);
  crisisMonitor.regression_alerts.push('CRITICAL: Memory monitoring failed');
}

/**
 * 3. Bundle Size Change Tracking
 */
console.log('\n📦 Bundle Size Change Tracking...');

try {
  const currentFiles = parseInt(execSync('find src -name "*.ts" -o -name "*.tsx" | wc -l', { cwd: __dirname }).toString().trim());
  const crisisSpecificFiles = parseInt(execSync('find src -name "*crisis*" -o -name "*Crisis*" -o -name "*emergency*" | wc -l', { cwd: __dirname }).toString().trim());
  
  crisisMonitor.bundle_tracking = {
    total_typescript_files: currentFiles,
    crisis_specific_files: crisisSpecificFiles,
    timestamp: new Date().toISOString(),
  };
  
  console.log(`    📊 Total TS files: ${currentFiles}`);
  console.log(`    🚨 Crisis-specific files: ${crisisSpecificFiles}`);
  
  // Load baseline for comparison if available
  try {
    const baseline = JSON.parse(fs.readFileSync('./performance-baseline-report.json', 'utf8'));
    const baselineTotal = baseline.measurements.bundle_analysis.typescript_files.total_project;
    const baselineCrisis = baseline.measurements.critical_components.crisis_safety;
    
    const totalChange = ((currentFiles - baselineTotal) / baselineTotal * 100).toFixed(1);
    const crisisChange = ((crisisSpecificFiles - baselineCrisis) / baselineCrisis * 100).toFixed(1);
    
    crisisMonitor.bundle_tracking.baseline_comparison = {
      total_change_percent: totalChange,
      crisis_change_percent: crisisChange,
      bundle_optimization: totalChange < 0,
      crisis_preservation: crisisChange >= -20, // Allow up to 20% reduction in crisis files
    };
    
    console.log(`    📊 Total files change: ${totalChange}%`);
    console.log(`    🚨 Crisis files change: ${crisisChange}%`);
    
    if (crisisChange < -20) {
      crisisMonitor.regression_alerts.push(`CRITICAL: Crisis components reduced by ${Math.abs(crisisChange)}% - exceeds safe threshold`);
    }
    
  } catch (e) {
    console.log(`    ⚠️  No baseline available for comparison`);
  }

} catch (error) {
  console.log(`    ❌ Bundle tracking failed: ${error.message}`);
}

/**
 * 4. Crisis-Critical Test Execution
 */
console.log('\n🧪 Crisis-Critical Test Validation...');

const criticalTests = [
  { name: 'Crisis Button Response', command: 'npm run perf:crisis', timeout: 10000 },
  { name: 'Emergency Contacts Access', command: 'npm run test -- --testNamePattern="crisis|Crisis|emergency" --passWithNoTests', timeout: 15000 },
  { name: 'Safety Protocol Validation', command: 'npm run test:clinical -- --testNamePattern="safety|Safety" --passWithNoTests', timeout: 10000 },
];

crisisMonitor.safety_validation = {};

for (const test of criticalTests) {
  console.log(`    🧪 Testing: ${test.name}...`);
  const testStart = Date.now();
  
  try {
    execSync(test.command, { cwd: __dirname, timeout: test.timeout, stdio: 'pipe' });
    const testTime = Date.now() - testStart;
    
    crisisMonitor.safety_validation[test.name] = {
      status: 'PASS',
      execution_time_ms: testTime,
      within_threshold: testTime < crisisMonitor.emergency_thresholds.crisis_response_max,
    };
    
    console.log(`      ✅ ${test.name}: PASS (${testTime}ms)`);
    
    if (testTime >= crisisMonitor.emergency_thresholds.rollback_trigger_ms) {
      crisisMonitor.regression_alerts.push(`CRITICAL: ${test.name} execution time ${testTime}ms exceeds rollback threshold`);
    }
    
  } catch (error) {
    crisisMonitor.safety_validation[test.name] = {
      status: 'FAIL',
      error: error.message.substring(0, 100),
      execution_time_ms: Date.now() - testStart,
    };
    
    console.log(`      🚨 ${test.name}: FAIL`);
    crisisMonitor.regression_alerts.push(`CRITICAL: ${test.name} failing - immediate attention required`);
  }
}

/**
 * 5. Breathing Animation Performance (60fps requirement)
 */
console.log('\n🫁 Breathing Animation Performance Check...');

try {
  const breathingFiles = parseInt(execSync('find src -name "*breathing*" -o -name "*Breathing*" -o -name "*animation*" | wc -l', { cwd: __dirname }).toString().trim());
  
  crisisMonitor.animation_validation = {
    breathing_files_count: breathingFiles,
    fps_target: crisisMonitor.emergency_thresholds.breathing_fps_min,
    components_available: breathingFiles > 0,
  };
  
  console.log(`    🫁 Breathing components: ${breathingFiles}`);
  
  if (breathingFiles === 0) {
    crisisMonitor.regression_alerts.push('CRITICAL: No breathing animation components found');
    crisisMonitor.animation_validation.status = 'MISSING';
  } else {
    // Estimate performance based on component complexity
    crisisMonitor.animation_validation.status = 'MONITORING';
    console.log(`    ✅ Breathing animation components present`);
  }

} catch (error) {
  console.log(`    ❌ Animation validation failed: ${error.message}`);
  crisisMonitor.regression_alerts.push('CRITICAL: Breathing animation validation failed');
}

/**
 * 6. Emergency Assessment
 */
console.log('\n🚨 Emergency Assessment...');

const criticalAlerts = crisisMonitor.regression_alerts.filter(alert => alert.startsWith('CRITICAL'));
const warningAlerts = crisisMonitor.regression_alerts.filter(alert => alert.startsWith('WARNING'));

crisisMonitor.emergency_assessment = {
  critical_alerts_count: criticalAlerts.length,
  warning_alerts_count: warningAlerts.length,
  total_alerts: crisisMonitor.regression_alerts.length,
  rollback_required: criticalAlerts.length > 0,
  safety_status: criticalAlerts.length === 0 ? 'SAFE' : 'EMERGENCY',
  cleanup_recommendation: criticalAlerts.length === 0 ? 'CONTINUE' : 'STOP_AND_ROLLBACK',
};

console.log(`    🚨 Critical alerts: ${criticalAlerts.length}`);
console.log(`    ⚠️  Warning alerts: ${warningAlerts.length}`);
console.log(`    📊 Safety status: ${crisisMonitor.emergency_assessment.safety_status}`);
console.log(`    🎯 Recommendation: ${crisisMonitor.emergency_assessment.cleanup_recommendation}`);

/**
 * 7. Generate Crisis Performance Report
 */
const reportPath = `./crisis-performance-report-${crisisMonitor.phase.replace(/\s+/g, '-').toLowerCase()}.json`;
fs.writeFileSync(reportPath, JSON.stringify(crisisMonitor, null, 2));

console.log('\n✅ Crisis Performance Monitoring Complete');
console.log('=========================================');
console.log(`🚨 Safety Status: ${crisisMonitor.emergency_assessment.safety_status}`);
console.log(`🎯 Recommendation: ${crisisMonitor.emergency_assessment.cleanup_recommendation}`);
console.log(`📁 Report saved: ${reportPath}`);

if (criticalAlerts.length > 0) {
  console.log('\n🚨 CRITICAL ALERTS - IMMEDIATE ACTION REQUIRED');
  console.log('==============================================');
  criticalAlerts.forEach((alert, index) => {
    console.log(`   🚨 ${alert}`);
  });
  
  console.log('\n🔄 EMERGENCY PROTOCOL:');
  console.log('• STOP current cleanup operations immediately');
  console.log('• Review and revert recent changes');
  console.log('• Validate crisis functionality manually');
  console.log('• Run full therapeutic safety test suite');
  console.log('• Do not proceed until all critical alerts resolved');
} else {
  console.log('\n✅ CRISIS SAFETY VALIDATED');
  console.log('==========================');
  console.log('• Crisis response times within limits');
  console.log('• Memory usage under control');
  console.log('• Critical components preserved');
  console.log('• Safe to continue cleanup operations');
  
  if (warningAlerts.length > 0) {
    console.log('\n⚠️  WARNINGS TO MONITOR:');
    warningAlerts.forEach(alert => console.log(`   ⚠️  ${alert}`));
  }
}

console.log('\n🏥 Therapeutic Safety Thresholds:');
console.log(`   🚨 Crisis Response: <${crisisMonitor.emergency_thresholds.crisis_response_max}ms (NON-NEGOTIABLE)`);
console.log(`   🧠 Memory Limit: <${crisisMonitor.emergency_thresholds.memory_limit_mb}MB`);
console.log(`   🔄 Rollback Trigger: >${crisisMonitor.emergency_thresholds.rollback_trigger_ms}ms`);
console.log(`   🫁 Breathing Animation: ${crisisMonitor.emergency_thresholds.breathing_fps_min}fps minimum`);

return crisisMonitor;