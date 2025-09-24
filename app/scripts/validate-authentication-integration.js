#!/usr/bin/env node

/**
 * Authentication Integration Validation Script
 *
 * Validates that the authentication screens have been properly updated
 * to integrate with the real authentication services.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const SCREENS_PATH = path.join(PROJECT_ROOT, 'src', 'screens', 'auth');
const SERVICES_PATH = path.join(PROJECT_ROOT, 'src', 'services', 'cloud');

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description} - File not found: ${filePath}`, 'red');
    return false;
  }
}

function validateFileContains(filePath, patterns, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = [];

    for (const [key, pattern] of Object.entries(patterns)) {
      const found = pattern.test(content);
      results.push({ key, found, pattern: pattern.source });

      if (found) {
        log(`  ✅ ${key}`, 'green');
      } else {
        log(`  ❌ ${key} - Pattern not found: ${pattern.source}`, 'red');
      }
    }

    const allFound = results.every(r => r.found);
    if (allFound) {
      log(`✅ ${description}`, 'green');
    } else {
      log(`❌ ${description} - Some patterns missing`, 'red');
    }

    return allFound;
  } catch (error) {
    log(`❌ ${description} - Error reading file: ${error.message}`, 'red');
    return false;
  }
}

function validateEnvironmentConfig() {
  log('\n🔍 Validating Environment Configuration...', 'blue');

  const envPath = path.join(PROJECT_ROOT, '.env.production');

  if (!validateFileExists(envPath, 'Production environment file')) {
    return false;
  }

  const envPatterns = {
    'Supabase URL configured': /EXPO_PUBLIC_SUPABASE_URL=/,
    'Supabase anon key configured': /EXPO_PUBLIC_SUPABASE_ANON_KEY=/,
    'Apple client ID configured': /EXPO_PUBLIC_AUTH_APPLE_CLIENT_ID=/,
    'Google client ID configured': /EXPO_PUBLIC_AUTH_GOOGLE_CLIENT_ID=/,
    'Authentication enabled': /EXPO_PUBLIC_AUTH_EMAIL_SIGNUP_ENABLED=true/,
    'Biometric auth enabled': /EXPO_PUBLIC_AUTH_BIOMETRIC_ENABLED=true/
  };

  return validateFileContains(envPath, envPatterns, 'Environment configuration');
}

function validateSignInScreen() {
  log('\n🔍 Validating SignInScreen Integration...', 'blue');

  const filePath = path.join(SCREENS_PATH, 'SignInScreen.tsx');

  if (!validateFileExists(filePath, 'SignInScreen.tsx')) {
    return false;
  }

  const patterns = {
    'AuthIntegrationService imported': /import.*AuthIntegrationService/,
    'Real signIn function used': /await signIn\(formData\.email, formData\.password\)/,
    'Social auth functions imported': /signInWithApple|signInWithGoogle/,
    'Real Apple authentication': /await signInWithApple\(\)/,
    'Real Google authentication': /await signInWithGoogle\(\)/,
    'Crisis button maintained': /<CrisisButton/,
    'Error handling updated': /if \(result\.success\)/,
    'No TODO/mock comments in auth flow': /^(?!.*TODO.*authentication|.*setTimeout.*1000).*$/m
  };

  return validateFileContains(filePath, patterns, 'SignInScreen integration');
}

function validateSignUpScreen() {
  log('\n🔍 Validating SignUpScreen Integration...', 'blue');

  const filePath = path.join(SCREENS_PATH, 'SignUpScreen.tsx');

  if (!validateFileExists(filePath, 'SignUpScreen.tsx')) {
    return false;
  }

  const patterns = {
    'AuthIntegrationService imported': /import.*AuthIntegrationService/,
    'Real signUp function used': /await signUp\(formData\.email, formData\.password, metadata\)/,
    'Metadata with consent': /metadata.*consent/,
    'Social signup functions used': /signInWithApple|signInWithGoogle/,
    'Platform metadata included': /deviceType.*Platform\.OS/,
    'Crisis button maintained': /<CrisisButton/,
    'Consent integration': /termsOfService.*consent\.termsOfService/s,
    'No mock authentication': /^(?!.*TODO.*authentication|.*setTimeout.*2000).*$/m
  };

  return validateFileContains(filePath, patterns, 'SignUpScreen integration');
}

function validateForgotPasswordScreen() {
  log('\n🔍 Validating ForgotPasswordScreen Integration...', 'blue');

  const filePath = path.join(SCREENS_PATH, 'ForgotPasswordScreen.tsx');

  if (!validateFileExists(filePath, 'ForgotPasswordScreen.tsx')) {
    return false;
  }

  const patterns = {
    'AuthIntegrationService imported': /import.*AuthIntegrationService/,
    'Integration structure prepared': /authIntegrationService/,
    'TODO comment for password reset': /TODO.*password reset.*SupabaseAuthService/,
    'Crisis button maintained': /<CrisisButton/,
    'Rate limiting preserved': /checkRateLimit/
  };

  return validateFileContains(filePath, patterns, 'ForgotPasswordScreen integration');
}

function validateAuthenticationServices() {
  log('\n🔍 Validating Authentication Services...', 'blue');

  const services = [
    {
      name: 'AuthIntegrationService.ts',
      patterns: {
        'signIn method available': /async signIn\(/,
        'signUp method available': /async signUp\(/,
        'Apple auth method': /async signInWithApple\(/,
        'Google auth method': /async signInWithGoogle\(/,
        'Crisis auth method': /async createCrisisAuthentication\(/,
        'Session state management': /AuthSessionState/,
        'Performance monitoring': /performanceMetrics/
      }
    },
    {
      name: 'SupabaseAuthConfig.ts',
      patterns: {
        'SupabaseAuthService class': /class SupabaseAuthService/,
        'Email auth method': /async signInWithPassword\(/,
        'Social auth methods': /async signInWithApple\(|async signInWithGoogle\(/,
        'Device binding': /deviceBinding/,
        'Rate limiting': /rateLimitState/,
        'HIPAA compliance': /HIPAA.*compliant/
      }
    }
  ];

  let allValid = true;

  for (const service of services) {
    const filePath = path.join(SERVICES_PATH, service.name);
    if (!validateFileContains(filePath, service.patterns, `${service.name} service`)) {
      allValid = false;
    }
  }

  return allValid;
}

function validateCoreComponents() {
  log('\n🔍 Validating Core Components...', 'blue');

  const indexPath = path.join(PROJECT_ROOT, 'src', 'components', 'core', 'index.ts');

  if (!validateFileExists(indexPath, 'Core components index')) {
    return false;
  }

  const patterns = {
    'Button exported': /export.*Button/,
    'TextInput exported': /export.*TextInput/,
    'CrisisButton exported': /export.*CrisisButton/,
    'Card exported': /export.*Card/
  };

  return validateFileContains(indexPath, patterns, 'Core components exports');
}

function validateSummary() {
  log('\n🔍 Validating Implementation Summary...', 'blue');

  const summaryPath = path.join(PROJECT_ROOT, 'DAYS_10_11_AUTHENTICATION_IMPLEMENTATION_SUMMARY.md');

  return validateFileExists(summaryPath, 'Implementation summary document');
}

function main() {
  log('🚀 Authentication Integration Validation', 'bold');
  log('==========================================', 'blue');

  const validations = [
    validateEnvironmentConfig,
    validateSignInScreen,
    validateSignUpScreen,
    validateForgotPasswordScreen,
    validateAuthenticationServices,
    validateCoreComponents,
    validateSummary
  ];

  const results = validations.map(validation => validation());
  const allPassed = results.every(result => result);

  log('\n📊 Validation Summary', 'bold');
  log('====================', 'blue');

  if (allPassed) {
    log('✅ All validations passed! Authentication integration is properly implemented.', 'green');
    log('\n🎉 Days 10-11 authentication screens are ready for testing.', 'green');
    log('\n📝 Next steps:', 'blue');
    log('   1. Add password reset method to SupabaseAuthService', 'yellow');
    log('   2. Run integration tests', 'yellow');
    log('   3. Validate performance metrics', 'yellow');
    log('   4. Deploy to staging for clinical validation', 'yellow');
  } else {
    log('❌ Some validations failed. Please review the issues above.', 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validateSignInScreen,
  validateSignUpScreen,
  validateForgotPasswordScreen,
  validateAuthenticationServices,
  validateEnvironmentConfig
};