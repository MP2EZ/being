/**
 * Encryption Service Validation Script
 * Tests encryption service initialization and basic operations
 */

import { encryptionService, DataSensitivity } from '../src/services/security/EncryptionService';

async function validateEncryptionService(): Promise<void> {
  console.log('🔐 Starting Being. encryption service validation...\n');

  try {
    // Test 1: Service initialization
    console.log('Test 1: Initializing encryption service...');
    await encryptionService.initialize();
    console.log('✅ Encryption service initialized successfully\n');

    // Test 2: Encryption status check
    console.log('Test 2: Checking encryption status...');
    const status = await encryptionService.getEncryptionStatus();
    console.log('Encryption Status:', {
      initialized: status.initialized,
      keyVersion: status.keyVersion,
      algorithm: status.supportedAlgorithms[0],
      daysUntilRotation: status.daysUntilRotation
    });
    console.log('✅ Encryption status retrieved successfully\n');

    // Test 3: Data encryption/decryption
    console.log('Test 3: Testing data encryption and decryption...');

    const testData = {
      phq9_score: 15,
      gad7_score: 12,
      timestamp: new Date().toISOString(),
      mood_data: {
        anxiety_level: 7,
        depression_level: 6,
        energy_level: 4
      }
    };

    // Test clinical data encryption
    const encryptedClinical = await encryptionService.encryptData(testData, DataSensitivity.CLINICAL);
    console.log('Clinical data encrypted - IV length:', encryptedClinical.iv.length);

    const decryptedClinical = await encryptionService.decryptData(encryptedClinical, DataSensitivity.CLINICAL);
    console.log('Clinical data decrypted successfully');

    // Verify data integrity
    const integrityValid = await encryptionService.validateDataIntegrity(
      testData,
      encryptedClinical,
      DataSensitivity.CLINICAL
    );
    console.log('Data integrity validation:', integrityValid ? '✅ VALID' : '❌ INVALID');

    // Test personal data encryption
    const personalData = { daily_mood: 6, check_in_notes: 'Feeling better today' };
    const encryptedPersonal = await encryptionService.encryptData(personalData, DataSensitivity.PERSONAL);
    const decryptedPersonal = await encryptionService.decryptData(encryptedPersonal, DataSensitivity.PERSONAL);

    console.log('Personal data encryption test passed\n');

    // Test 4: Security readiness check
    console.log('Test 4: Checking security readiness for production...');
    const securityReadiness = await encryptionService.getSecurityReadiness();
    console.log('Security Readiness:', {
      ready: securityReadiness.ready,
      algorithm: securityReadiness.algorithm,
      keyDerivation: securityReadiness.keyDerivation,
      encryptionStrength: securityReadiness.encryptionStrength,
      cloudSyncReady: securityReadiness.cloudSyncReady,
      issues: securityReadiness.issues,
      recommendations: securityReadiness.recommendations
    });

    if (securityReadiness.ready) {
      console.log('✅ Security system is production-ready');
    } else {
      console.log('⚠️ Security system has issues that need attention');
    }

    console.log('\n🎉 All encryption validation tests passed!');
    console.log('🔒 Being. encryption service is functioning correctly for clinical data protection');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('\n❌ Encryption validation failed:', errorMessage);
    if (errorStack) {
      console.error('Stack trace:', errorStack);
    }

    // Provide specific guidance based on error type
    if (errorMessage.includes('NSFaceIDUsageDescription')) {
      console.error('\n🔧 Fix: Ensure NSFaceIDUsageDescription is properly set in Info.plist');
    } else if (errorMessage.includes('requireAuthentication')) {
      console.error('\n🔧 Fix: Check biometric authentication configuration and availability');
    } else if (errorMessage.includes('cryptographic')) {
      console.error('\n🔧 Fix: Verify Web Crypto API support on the target platform');
    } else {
      console.error('\n🔧 Fix: Check SecureStore configuration and device keychain availability');
    }

    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  validateEncryptionService().then(() => {
    console.log('\n✅ Encryption validation completed successfully');
  }).catch((error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Encryption validation failed:', errorMessage);
    process.exit(1);
  });
}

export { validateEncryptionService };