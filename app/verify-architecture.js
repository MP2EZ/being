/**
 * Simple New Architecture Verification for Being. MBCT App
 * Node.js script to verify React Native New Architecture configuration
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logHeader(message) {
  log(`\n${colors.bold}${colors.cyan}=== ${message} ===${colors.reset}`);
}

function checkMetroConfig() {
  logHeader('Metro Configuration Check');

  const metroConfigPath = path.join(__dirname, 'metro.config.js');

  if (!fs.existsSync(metroConfigPath)) {
    logError('metro.config.js not found');
    return false;
  }

  try {
    const metroConfig = fs.readFileSync(metroConfigPath, 'utf8');

    // Check for New Architecture configuration
    const hasNewArchConfig = metroConfig.includes('unstable_transformProfile') ||
                           metroConfig.includes('hermesParser') ||
                           metroConfig.includes('ReactFabricEnabled');

    if (hasNewArchConfig) {
      logSuccess('Metro configuration includes New Architecture settings');
      return true;
    } else {
      logWarning('Metro configuration may not be optimized for New Architecture');
      return false;
    }
  } catch (error) {
    logError(`Error reading metro.config.js: ${error.message}`);
    return false;
  }
}

function checkPackageJson() {
  logHeader('Package Dependencies Check');

  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

    logInfo('Checking React Native and related versions:');

    // Check React Native version
    const rnVersion = packageJson.dependencies['react-native'];
    if (rnVersion) {
      logInfo(`  React Native: ${rnVersion}`);

      // Extract version number for comparison
      const versionMatch = rnVersion.match(/(\d+)\.(\d+)\.(\d+)/);
      if (versionMatch) {
        const [, major, minor] = versionMatch.map(Number);
        if (major > 0 || (major === 0 && minor >= 81)) {
          logSuccess('  React Native version supports New Architecture');
        } else {
          logError('  React Native version too old for New Architecture');
        }
      }
    } else {
      logError('  React Native not found in dependencies');
    }

    // Check Expo version
    const expoVersion = packageJson.dependencies['expo'];
    if (expoVersion) {
      logInfo(`  Expo SDK: ${expoVersion}`);

      const versionMatch = expoVersion.match(/(\d+)\.(\d+)\.(\d+)/);
      if (versionMatch) {
        const [, major] = versionMatch.map(Number);
        if (major >= 54) {
          logSuccess('  Expo SDK version supports New Architecture');
        } else {
          logWarning('  Expo SDK version may not fully support New Architecture');
        }
      }
    }

    // Check React version
    const reactVersion = packageJson.dependencies['react'];
    if (reactVersion) {
      logInfo(`  React: ${reactVersion}`);

      const versionMatch = reactVersion.match(/(\d+)\.(\d+)\.(\d+)/);
      if (versionMatch) {
        const [, major] = versionMatch.map(Number);
        if (major >= 19) {
          logSuccess('  React version supports concurrent features');
        } else {
          logWarning('  React version may not support all concurrent features');
        }
      }
    }

    return true;
  } catch (error) {
    logError(`Error reading package.json: ${error.message}`);
    return false;
  }
}

function checkExpoConfig() {
  logHeader('Expo Configuration Check');

  const expoConfigPaths = [
    path.join(__dirname, 'app.config.js'),
    path.join(__dirname, 'app.json'),
    path.join(__dirname, 'expo.json')
  ];

  let configFound = false;
  let hasNewArchConfig = false;

  for (const configPath of expoConfigPaths) {
    if (fs.existsSync(configPath)) {
      configFound = true;
      logInfo(`Found config: ${path.basename(configPath)}`);

      try {
        const configContent = fs.readFileSync(configPath, 'utf8');

        // Check for New Architecture settings
        if (configContent.includes('newArchEnabled') ||
            configContent.includes('ReactNativeNewArchitectureEnabled') ||
            configContent.includes('fabricEnabled')) {
          hasNewArchConfig = true;
          logSuccess('  Configuration includes New Architecture settings');
        }

        // Check for Hermes
        if (configContent.includes('hermes') && configContent.includes('true')) {
          logSuccess('  Hermes JavaScript engine enabled');
        }

      } catch (error) {
        logError(`Error reading ${configPath}: ${error.message}`);
      }
      break;
    }
  }

  if (!configFound) {
    logWarning('No Expo configuration file found');
    return false;
  }

  if (!hasNewArchConfig) {
    logWarning('New Architecture settings not found in Expo config');
  }

  return hasNewArchConfig;
}

function checkiOSConfiguration() {
  logHeader('iOS Configuration Check');

  const iosDir = path.join(__dirname, 'ios');

  if (!fs.existsSync(iosDir)) {
    logInfo('iOS directory not found (expected for Expo managed workflow)');
    return true; // Not an error for Expo apps
  }

  // Check for Podfile configuration
  const podfilePath = path.join(iosDir, 'Podfile');
  if (fs.existsSync(podfilePath)) {
    try {
      const podfileContent = fs.readFileSync(podfilePath, 'utf8');

      if (podfileContent.includes('fabric_enabled') ||
          podfileContent.includes('RCT_NEW_ARCH_ENABLED')) {
        logSuccess('Podfile configured for New Architecture');
        return true;
      } else {
        logWarning('Podfile may not be configured for New Architecture');
      }
    } catch (error) {
      logError(`Error reading Podfile: ${error.message}`);
    }
  }

  return false;
}

function generateReport() {
  logHeader('Being. MBCT App - New Architecture Configuration Report');

  log('\n🏗️ Phase 4 Critical: New Architecture Verification');
  log('📱 React Native 0.81.4 + Expo SDK 54 + React 19.1.0');

  const checks = [
    { name: 'Package Dependencies', result: checkPackageJson() },
    { name: 'Metro Configuration', result: checkMetroConfig() },
    { name: 'Expo Configuration', result: checkExpoConfig() },
    { name: 'iOS Configuration', result: checkiOSConfiguration() }
  ];

  logHeader('Configuration Summary');

  let allPassed = true;
  checks.forEach(check => {
    if (check.result) {
      logSuccess(`${check.name}: CONFIGURED`);
    } else {
      logError(`${check.name}: NEEDS ATTENTION`);
      allPassed = false;
    }
  });

  logHeader('Assessment');

  if (allPassed) {
    logSuccess('🎉 NEW ARCHITECTURE: PROPERLY CONFIGURED');
    logSuccess('✅ Being. MBCT App is set up for New Architecture');
    logInfo('  • Dependencies: Compatible versions installed');
    logInfo('  • Configuration: New Architecture settings detected');
    logInfo('  • Ready for runtime verification in simulator');
  } else {
    logWarning('⚠️  NEW ARCHITECTURE: CONFIGURATION ISSUES DETECTED');
    logWarning('🔧 Some configuration aspects need attention');
    logInfo('  • Review failed checks above');
    logInfo('  • Ensure all New Architecture settings are enabled');
  }

  logHeader('Next Steps');
  logInfo('1. Test the app in iOS simulator to verify runtime detection');
  logInfo('2. Check console logs for architecture detection messages');
  logInfo('3. Run performance tests to validate clinical requirements');
  logInfo('4. Verify crisis button response times and breathing animation smoothness');

  return allPassed;
}

// Run the verification
if (require.main === module) {
  try {
    const success = generateReport();
    process.exit(success ? 0 : 1);
  } catch (error) {
    logError(`Verification failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { generateReport };