#!/usr/bin/env node

/**
 * Being. MBCT App - New Architecture Setup Validation
 *
 * This script validates that the Being. app is properly configured
 * for React Native New Architecture development builds.
 */

const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function validateConfig() {
  log('🏗️  Being. MBCT App - New Architecture Validation', colors.bold + colors.blue);
  log('');

  let allValid = true;

  // Check app.json configuration
  try {
    const appJsonPath = path.join(__dirname, 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    log('1. Expo Configuration:', colors.bold);

    if (appJson.expo?.newArchEnabled === true) {
      log('   ✅ Global newArchEnabled: true', colors.green);
    } else {
      log('   ❌ Global newArchEnabled: missing or false', colors.red);
      allValid = false;
    }

    if (appJson.expo?.ios?.newArchEnabled === true) {
      log('   ✅ iOS newArchEnabled: true', colors.green);
    } else {
      log('   ❌ iOS newArchEnabled: missing or false', colors.red);
      allValid = false;
    }

    if (appJson.expo?.ios?.jsEngine === 'hermes') {
      log('   ✅ iOS Hermes engine: enabled', colors.green);
    } else {
      log('   ❌ iOS Hermes engine: not configured', colors.red);
      allValid = false;
    }

  } catch (error) {
    log('   ❌ Failed to read app.json', colors.red);
    allValid = false;
  }

  // Check iOS Podfile.properties.json
  try {
    const podfilePropsPath = path.join(__dirname, 'ios/Podfile.properties.json');
    const podfileProps = JSON.parse(fs.readFileSync(podfilePropsPath, 'utf8'));

    log('');
    log('2. iOS Configuration:', colors.bold);

    if (podfileProps.newArchEnabled === 'true') {
      log('   ✅ iOS newArchEnabled: true', colors.green);
    } else {
      log('   ❌ iOS newArchEnabled: missing or false', colors.red);
      allValid = false;
    }

    if (podfileProps['expo.jsEngine'] === 'hermes') {
      log('   ✅ iOS Hermes engine: enabled', colors.green);
    } else {
      log('   ❌ iOS Hermes engine: not configured', colors.red);
      allValid = false;
    }

  } catch (error) {
    log('   ❌ Failed to read iOS Podfile.properties.json', colors.red);
    allValid = false;
  }

  // Check Android gradle.properties
  try {
    const gradlePropsPath = path.join(__dirname, 'android/gradle.properties');
    const gradleProps = fs.readFileSync(gradlePropsPath, 'utf8');

    log('');
    log('3. Android Configuration:', colors.bold);

    if (gradleProps.includes('newArchEnabled=true')) {
      log('   ✅ Android newArchEnabled: true', colors.green);
    } else {
      log('   ❌ Android newArchEnabled: missing or false', colors.red);
      allValid = false;
    }

  } catch (error) {
    log('   ❌ Failed to read Android gradle.properties', colors.red);
    allValid = false;
  }

  // Check for architecture detection components
  log('');
  log('4. Architecture Detection Components:', colors.bold);

  const requiredFiles = [
    'src/types/new-architecture-types.ts',
    'src/utils/architecture-detection.ts',
    'src/components/test/NewArchitectureTest.tsx'
  ];

  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      log(`   ✅ ${file}: exists`, colors.green);
    } else {
      log(`   ❌ ${file}: missing`, colors.red);
      allValid = false;
    }
  });

  // Check for clean build state
  log('');
  log('5. Build Cleanliness:', colors.bold);

  const buildPaths = [
    'ios/build',
    'android/app/build',
    'node_modules/.cache',
    '.expo/web'
  ];

  const hasStaleBuilds = buildPaths.some(buildPath => {
    const fullPath = path.join(__dirname, buildPath);
    return fs.existsSync(fullPath) && fs.readdirSync(fullPath).length > 0;
  });

  if (!hasStaleBuilds) {
    log('   ✅ Clean build state: ready for fresh build', colors.green);
  } else {
    log('   ⚠️  Stale build artifacts detected: recommend clean', colors.yellow);
  }

  // Final validation
  log('');
  log('6. Validation Summary:', colors.bold);

  if (allValid) {
    log('   ✅ All configurations valid: Ready for New Architecture development build!', colors.bold + colors.green);
    log('');
    log('Next steps:', colors.bold);
    log('   1. Run: npx expo run:ios', colors.blue);
    log('   2. Check app displays: "Being. Clinical Architecture Test"', colors.blue);
    log('   3. Verify: "✅ New Architecture Detected" in test component', colors.blue);
    process.exit(0);
  } else {
    log('   ❌ Configuration issues detected: Fix above errors before build', colors.bold + colors.red);
    log('');
    log('Common fixes:', colors.bold);
    log('   1. Ensure app.json has newArchEnabled: true', colors.yellow);
    log('   2. Check iOS/Android configuration files', colors.yellow);
    log('   3. Verify all architecture detection files exist', colors.yellow);
    process.exit(1);
  }
}

// Run validation
validateConfig();