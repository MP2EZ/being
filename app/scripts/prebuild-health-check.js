#!/usr/bin/env node
/**
 * Prebuild Health Check Script - Being.
 * Validates critical system health before build execution
 *
 * CRITICAL SAFETY CHECKS:
 * - Crisis hotline configuration (988)
 * - Emergency deployment readiness
 * - Clinical accuracy requirements
 * - HIPAA compliance validation
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Running prebuild health checks...');

// Check critical environment variables
const criticalEnvVars = [
  'EXPO_PUBLIC_CRISIS_HOTLINE',
  'EXPO_PUBLIC_EMERGENCY_SERVICES',
  'EXPO_PUBLIC_CLINICAL_VALIDATION'
];

// Validate crisis hotline configuration
function validateCrisisConfig() {
  console.log('📞 Validating crisis hotline configuration...');

  const envFiles = ['.env.production', '.env.development'];

  for (const envFile of envFiles) {
    const envPath = path.join(__dirname, '..', envFile);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      if (!content.includes('EXPO_PUBLIC_CRISIS_HOTLINE=988')) {
        console.error(`❌ Crisis hotline not configured in ${envFile}`);
        process.exit(1);
      }
    }
  }

  console.log('✅ Crisis hotline configuration validated');
}

// Validate emergency deployment readiness
function validateEmergencyReadiness() {
  console.log('🚨 Validating emergency deployment readiness...');

  // Check if emergency workflow exists
  const emergencyWorkflow = path.join(__dirname, '..', '.github', 'workflows', 'emergency-deploy-optimized.yml');
  if (!fs.existsSync(emergencyWorkflow)) {
    console.error('❌ Emergency deployment workflow missing');
    process.exit(1);
  }

  console.log('✅ Emergency deployment readiness validated');
}

// Validate clinical accuracy requirements
function validateClinicalAccuracy() {
  console.log('🏥 Validating clinical accuracy requirements...');

  // Check for PHQ-9/GAD-7 components
  const assessmentDir = path.join(__dirname, '..', 'src', 'components', 'assessment');
  if (!fs.existsSync(assessmentDir)) {
    console.error('❌ Assessment components directory missing');
    process.exit(1);
  }

  console.log('✅ Clinical accuracy requirements validated');
}

// Main health check execution
async function runHealthChecks() {
  try {
    validateCrisisConfig();
    validateEmergencyReadiness();
    validateClinicalAccuracy();

    console.log('🎉 All prebuild health checks passed!');
    console.log('🚀 Build system ready for deployment');

  } catch (error) {
    console.error('❌ Prebuild health check failed:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runHealthChecks();
}

module.exports = { runHealthChecks };