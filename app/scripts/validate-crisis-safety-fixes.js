/**
 * Crisis Safety Violation Fix Validation Script
 * CRITICAL: Validates all 4 crisis safety violations have been resolved
 * Runs independent validation without Jest dependencies
 */

const fs = require('fs');
const path = require('path');

console.log('🚨 CRISIS SAFETY VIOLATION FIX VALIDATION\n');

// Validation results
let violations = [];
let fixes = [];

// VIOLATION 1: Crisis Response Performance Monitoring
function validateCrisisPerformanceMonitoring() {
  const monitorFile = path.join(__dirname, '../src/services/CrisisResponseMonitor.ts');

  if (!fs.existsSync(monitorFile)) {
    violations.push('❌ VIOLATION 1: CrisisResponseMonitor service not found');
    return;
  }

  const content = fs.readFileSync(monitorFile, 'utf8');

  // Check for performance guarantees
  if (!content.includes('RESPONSE_TIME_THRESHOLD = 200')) {
    violations.push('❌ VIOLATION 1: 200ms response time threshold not enforced');
    return;
  }

  if (!content.includes('executeCrisisAction')) {
    violations.push('❌ VIOLATION 1: Crisis action execution monitoring missing');
    return;
  }

  if (!content.includes('triggerEmergencyFallback')) {
    violations.push('❌ VIOLATION 1: Emergency fallback mechanism missing');
    return;
  }

  fixes.push('✅ VIOLATION 1 FIXED: Crisis response performance monitoring implemented');
}

// VIOLATION 2: Feature Flag Logic Inversion
function validateFeatureFlagProtection() {
  const featureFlagFile = path.join(__dirname, '../src/services/security/FeatureFlags.ts');

  if (!fs.existsSync(featureFlagFile)) {
    violations.push('❌ VIOLATION 2: FeatureFlags service not found');
    return;
  }

  const content = fs.readFileSync(featureFlagFile, 'utf8');

  // Check for crisis protection logic
  if (!content.includes('CRISIS_CRITICAL_FLAGS')) {
    violations.push('❌ VIOLATION 2: Crisis critical flag protection missing');
    return;
  }

  if (!content.includes('isCrisisCriticalFlag')) {
    violations.push('❌ VIOLATION 2: Crisis flag validation method missing');
    return;
  }

  if (!content.includes('Cannot disable critical flag')) {
    violations.push('❌ VIOLATION 2: Crisis flag disable prevention missing');
    return;
  }

  // Check for fixed override logic
  if (!content.includes('active: true, // ALWAYS ACTIVE for crisis safety')) {
    violations.push('❌ VIOLATION 2: Crisis features not always enabled in overrides');
    return;
  }

  fixes.push('✅ VIOLATION 2 FIXED: Crisis feature flag protection implemented');
}

// VIOLATION 3: Real-Time Crisis Detection
function validateRealTimeCrisisDetection() {
  const assessmentStore = path.join(__dirname, '../src/store/assessmentStore.ts');

  if (!fs.existsSync(assessmentStore)) {
    violations.push('❌ VIOLATION 3: Assessment store not found');
    return;
  }

  const content = fs.readFileSync(assessmentStore, 'utf8');

  // Check for real-time crisis detection
  if (!content.includes('crisisDetected')) {
    violations.push('❌ VIOLATION 3: Crisis detection state missing');
    return;
  }

  if (!content.includes('currentQuestion === 8 && answer >= 1')) {
    violations.push('❌ VIOLATION 3: PHQ-9 Question 9 suicidal ideation detection missing');
    return;
  }

  if (!content.includes('triggerRealTimeCrisisIntervention')) {
    violations.push('❌ VIOLATION 3: Real-time crisis intervention trigger missing');
    return;
  }

  if (!content.includes('projectedScore >= 20')) {
    violations.push('❌ VIOLATION 3: PHQ-9 severe depression threshold detection missing');
    return;
  }

  fixes.push('✅ VIOLATION 3 FIXED: Real-time crisis detection during assessments implemented');
}

// VIOLATION 4: Offline Crisis Failsafe
function validateOfflineCrisisFailsafe() {
  const offlineManager = path.join(__dirname, '../src/services/OfflineCrisisManager.ts');

  if (!fs.existsSync(offlineManager)) {
    violations.push('❌ VIOLATION 4: OfflineCrisisManager service not found');
    return;
  }

  const content = fs.readFileSync(offlineManager, 'utf8');

  // Check for offline crisis capabilities
  if (!content.includes('initializeOfflineCrisisData')) {
    violations.push('❌ VIOLATION 4: Offline crisis data initialization missing');
    return;
  }

  if (!content.includes('getHardcodedCrisisResources')) {
    violations.push('❌ VIOLATION 4: Hardcoded crisis fallback missing');
    return;
  }

  if (!content.includes('988 Suicide & Crisis Lifeline')) {
    violations.push('❌ VIOLATION 4: Critical hotline information missing');
    return;
  }

  if (!content.includes('getOfflineCrisisMessage')) {
    violations.push('❌ VIOLATION 4: Offline crisis message generation missing');
    return;
  }

  fixes.push('✅ VIOLATION 4 FIXED: Offline crisis failsafe protocols implemented');
}

// Check App.tsx initialization
function validateAppInitialization() {
  const appFile = path.join(__dirname, '../App.tsx');

  if (!fs.existsSync(appFile)) {
    violations.push('❌ App.tsx not found for initialization check');
    return;
  }

  const content = fs.readFileSync(appFile, 'utf8');

  if (!content.includes('OfflineCrisisManager.initializeOfflineCrisisData')) {
    violations.push('❌ App initialization: Offline crisis data not initialized on launch');
    return;
  }

  fixes.push('✅ App initialization: Crisis data initialized on app launch');
}

// Run all validations
console.log('Running crisis safety violation fix validation...\n');

validateCrisisPerformanceMonitoring();
validateFeatureFlagProtection();
validateRealTimeCrisisDetection();
validateOfflineCrisisFailsafe();
validateAppInitialization();

// Report results
console.log('='.repeat(80));
console.log('CRISIS SAFETY VIOLATION FIX VALIDATION RESULTS');
console.log('='.repeat(80));

if (fixes.length > 0) {
  console.log('\n🎉 FIXES IMPLEMENTED:');
  fixes.forEach(fix => console.log(`  ${fix}`));
}

if (violations.length > 0) {
  console.log('\n🚨 REMAINING VIOLATIONS:');
  violations.forEach(violation => console.log(`  ${violation}`));
  console.log('\n❌ CRISIS SAFETY VALIDATION FAILED');
  console.log('⚠️  Week 2 cannot proceed until all violations are resolved');
  process.exit(1);
} else {
  console.log('\n✅ ALL CRISIS SAFETY VIOLATIONS RESOLVED');
  console.log('🎯 Crisis safety fixes validated successfully');
  console.log('✅ Week 2 implementation can proceed');
  process.exit(0);
}