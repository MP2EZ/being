#!/usr/bin/env node
/**
 * Phase 2C Implementation Validation
 * Validates the 8 Core Foundation Scripts implementation
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Phase 2C Core Foundation Scripts Validation');
console.log('==============================================');
console.log('');

let passed = 0;
let total = 0;

function test(description, condition) {
  total++;
  if (condition) {
    console.log(`✅ ${description}`);
    passed++;
  } else {
    console.log(`❌ ${description}`);
  }
}

// Test 1: Verify package.json structure
console.log('📦 Testing package.json structure...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const scripts = packageJson.scripts;

test('start script exists', scripts.start === 'expo start');
test('android script exists', scripts.android === 'expo run:android');
test('ios script exists', scripts.ios === 'expo run:ios');
test('web script exists', scripts.web === 'expo start --web');
test('build script exists', scripts.build === 'npm run typecheck:strict && npm run lint:clinical');
test('deploy script exists', scripts.deploy === 'bash scripts/deployment-orchestrator.sh');
test('monitor script exists', scripts.monitor === 'node scripts/monitoring-hub.js');
test('emergency script exists', scripts.emergency === 'bash scripts/emergency-response.sh');

console.log('');

// Test 2: Verify orchestrator scripts exist
console.log('📁 Testing orchestrator scripts...');
test('deployment-orchestrator.sh exists', fs.existsSync('scripts/deployment-orchestrator.sh'));
test('monitoring-hub.js exists', fs.existsSync('scripts/monitoring-hub.js'));
test('emergency-response.sh exists', fs.existsSync('scripts/emergency-response.sh'));

console.log('');

// Test 3: Verify script consolidation (approximate count)
console.log('🔢 Testing script consolidation...');
const scriptCount = Object.keys(scripts).length;
test(`Scripts consolidated (${scriptCount} vs previous 157+)`, scriptCount < 20);
test('Core foundation scripts present', scriptCount >= 8);

console.log('');

// Test 4: Verify orchestrator script content
console.log('📝 Testing orchestrator script content...');
try {
  const deploymentScript = fs.readFileSync('scripts/deployment-orchestrator.sh', 'utf8');
  test('Deployment orchestrator has usage function', deploymentScript.includes('usage()'));
  test('Deployment orchestrator has validation mode', deploymentScript.includes('--validation-only'));
  test('Deployment orchestrator has emergency mode', deploymentScript.includes('--emergency'));
} catch (e) {
  test('Deployment orchestrator readable', false);
}

try {
  const monitoringScript = fs.readFileSync('scripts/monitoring-hub.js', 'utf8');
  test('Monitoring hub has MonitoringHub class', monitoringScript.includes('class MonitoringHub'));
  test('Monitoring hub has crisis monitoring', monitoringScript.includes('startCrisisMonitoring'));
  test('Monitoring hub has performance monitoring', monitoringScript.includes('startPerformanceMonitoring'));
} catch (e) {
  test('Monitoring hub readable', false);
}

try {
  const emergencyScript = fs.readFileSync('scripts/emergency-response.sh', 'utf8');
  test('Emergency response has rollback function', emergencyScript.includes('emergency_rollback'));
  test('Emergency response has crisis override', emergencyScript.includes('crisis_override'));
  test('Emergency response has system check', emergencyScript.includes('emergency_system_check'));
} catch (e) {
  test('Emergency response readable', false);
}

console.log('');

// Summary
console.log('📊 VALIDATION SUMMARY');
console.log('===================');
console.log(`✅ Passed: ${passed}/${total} tests`);
console.log('');

if (passed === total) {
  console.log('🎉 Phase 2C Implementation: SUCCESSFUL ✅');
  console.log('');
  console.log('✅ 8 Core Foundation Scripts implemented');
  console.log('✅ Script count reduced from 157+ to ' + scriptCount);
  console.log('✅ 3 Orchestrator scripts created');
  console.log('✅ All core development workflows preserved');
  console.log('✅ Emergency and monitoring capabilities added');
  console.log('');
  console.log('📝 Available Commands:');
  console.log('  npm start     - Start development server');
  console.log('  npm run android - Run on Android');
  console.log('  npm run ios   - Run on iOS');
  console.log('  npm run web   - Run on web');
  console.log('  npm run build - Build with validation');
  console.log('  npm run deploy - Deploy with orchestrator');
  console.log('  npm run monitor - Start monitoring hub');
  console.log('  npm run emergency - Emergency response');
} else {
  console.log('❌ Phase 2C Implementation: FAILED ❌');
  console.log('Some tests failed. Please review the implementation.');
}

process.exit(passed === total ? 0 : 1);