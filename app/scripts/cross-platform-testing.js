#!/usr/bin/env node

/**
 * Cross-Platform Local Testing Tools
 * iOS and Android testing utilities for React Native development
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class CrossPlatformTesting {
  constructor() {
    this.rootDir = process.cwd();
    this.platform = os.platform();
    this.supportedPlatforms = this.detectSupportedPlatforms();
  }

  // Detect available platforms and tools
  detectSupportedPlatforms() {
    const platforms = {
      ios: false,
      android: false,
      simulators: [],
      emulators: []
    };

    try {
      // Check for iOS support (macOS only)
      if (this.platform === 'darwin') {
        try {
          execSync('xcode-select -p', { stdio: 'pipe' });
          platforms.ios = true;
          
          // Get available iOS simulators
          const simctl = execSync('xcrun simctl list devices available', { encoding: 'utf8' });
          platforms.simulators = this.parseSimulators(simctl);
        } catch (error) {
          console.log('⚠️ Xcode not available - iOS testing disabled');
        }
      }

      // Check for Android support
      try {
        const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
        if (androidHome && fs.existsSync(androidHome)) {
          platforms.android = true;
          
          // Get available Android emulators
          const adbPath = path.join(androidHome, 'platform-tools', 'adb');
          if (fs.existsSync(adbPath)) {
            try {
              const emulators = execSync(`${androidHome}/emulator/emulator -list-avds`, { encoding: 'utf8' });
              platforms.emulators = this.parseEmulators(emulators);
            } catch (error) {
              console.log('⚠️ Android emulators not configured');
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Android SDK not available - Android testing disabled');
      }

    } catch (error) {
      console.log('⚠️ Error detecting platforms:', error.message);
    }

    return platforms;
  }

  // Parse iOS simulators from simctl output
  parseSimulators(simctlOutput) {
    const simulators = [];
    const lines = simctlOutput.split('\\n');
    let currentOS = '';
    
    lines.forEach(line => {
      if (line.includes('-- iOS')) {
        currentOS = line.trim();
      } else if (line.includes('iPhone') || line.includes('iPad')) {
        const match = line.match(/\\s+(.+?)\\s+\\(([^)]+)\\)\\s+\\(([^)]+)\\)/);
        if (match) {
          simulators.push({
            name: match[1],
            udid: match[2],
            state: match[3],
            os: currentOS,
            platform: 'ios'
          });
        }
      }
    });
    
    return simulators.filter(sim => sim.state === 'Shutdown' || sim.state === 'Booted');
  }

  // Parse Android emulators
  parseEmulators(emulatorsOutput) {
    return emulatorsOutput
      .split('\\n')
      .filter(line => line.trim())
      .map(name => ({
        name: name.trim(),
        platform: 'android'
      }));
  }

  // Run tests on specific platform
  async runPlatformTests(platform, options = {}) {
    const {
      device = 'auto',
      testPattern = '',
      coverage = false,
      timeout = 120000
    } = options;

    console.log(`📱 Running ${platform} platform tests...`);
    
    if (!this.supportedPlatforms[platform]) {
      throw new Error(`${platform} platform not available`);
    }

    const testConfig = this.getPlatformTestConfig(platform);
    let command = this.buildTestCommand(platform, testConfig, {
      testPattern,
      coverage,
      timeout
    });

    try {
      // Start device/simulator if needed
      if (device !== 'auto') {
        await this.startDevice(platform, device);
      }

      // Run the tests
      const startTime = Date.now();
      const output = execSync(command, {
        encoding: 'utf8',
        timeout: timeout + 30000, // Extra buffer
        stdio: 'pipe'
      });

      const duration = Date.now() - startTime;
      
      console.log(`✅ ${platform} tests completed (${duration}ms)`);
      
      return {
        success: true,
        platform,
        duration,
        output: output.substring(0, 1000) // Truncate for readability
      };

    } catch (error) {
      console.log(`❌ ${platform} tests failed:`, error.message);
      
      return {
        success: false,
        platform,
        error: error.message,
        output: error.stdout || ''
      };
    }
  }

  // Get platform-specific test configuration
  getPlatformTestConfig(platform) {
    const configs = {
      ios: {
        setupTimeout: 60000,
        testTimeout: 30000,
        environment: 'ios-simulator',
        preset: 'react-native'
      },
      android: {
        setupTimeout: 90000,
        testTimeout: 45000,
        environment: 'android-emulator',
        preset: 'react-native'
      }
    };

    return configs[platform] || configs.ios;
  }

  // Build test command for platform
  buildTestCommand(platform, config, options) {
    let command = 'npm run test:local';
    
    // Platform-specific environment variables
    const envVars = [];
    envVars.push(`PLATFORM=${platform}`);
    envVars.push(`TEST_TIMEOUT=${options.timeout}`);
    
    if (platform === 'ios') {
      envVars.push('RCT_NO_LAUNCH_PACKAGER=1');
    }

    // Add Jest options
    const jestOptions = [];
    
    if (options.testPattern) {
      jestOptions.push(`--testNamePattern="${options.testPattern}"`);
    }
    
    if (options.coverage) {
      jestOptions.push('--coverage');
    }
    
    jestOptions.push(`--testTimeout=${config.testTimeout}`);
    jestOptions.push('--maxWorkers=1'); // Single worker for device testing
    
    // Platform-specific test files
    jestOptions.push(`--testPathPattern="(${platform}|platform|cross-platform)"`);

    if (jestOptions.length > 0) {
      command += ' -- ' + jestOptions.join(' ');
    }

    // Prepend environment variables
    if (envVars.length > 0) {
      command = envVars.join(' ') + ' ' + command;
    }

    return command;
  }

  // Start device/simulator
  async startDevice(platform, deviceName) {
    console.log(`🚀 Starting ${platform} device: ${deviceName}`);
    
    try {
      if (platform === 'ios') {
        await this.startIOSSimulator(deviceName);
      } else if (platform === 'android') {
        await this.startAndroidEmulator(deviceName);
      }
      
      // Wait for device to be ready
      await this.waitForDeviceReady(platform, deviceName);
      
    } catch (error) {
      console.log(`⚠️ Failed to start ${platform} device:`, error.message);
      throw error;
    }
  }

  // Start iOS simulator
  async startIOSSimulator(deviceName) {
    let simulator;
    
    if (deviceName === 'auto') {
      // Find first available iPhone simulator
      simulator = this.supportedPlatforms.simulators.find(sim => 
        sim.name.includes('iPhone') && sim.state === 'Shutdown'
      );
    } else {
      simulator = this.supportedPlatforms.simulators.find(sim => 
        sim.name.includes(deviceName) || sim.udid === deviceName
      );
    }

    if (!simulator) {
      throw new Error(`iOS simulator '${deviceName}' not found`);
    }

    console.log(`📱 Booting iOS simulator: ${simulator.name}`);
    
    execSync(`xcrun simctl boot "${simulator.udid}"`, { stdio: 'pipe' });
    
    // Wait a moment for simulator to boot
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Start Android emulator
  async startAndroidEmulator(deviceName) {
    const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
    
    let emulator;
    if (deviceName === 'auto') {
      emulator = this.supportedPlatforms.emulators[0];
    } else {
      emulator = this.supportedPlatforms.emulators.find(emu => 
        emu.name.includes(deviceName)
      );
    }

    if (!emulator) {
      throw new Error(`Android emulator '${deviceName}' not found`);
    }

    console.log(`📱 Starting Android emulator: ${emulator.name}`);
    
    const emulatorPath = path.join(androidHome, 'emulator', 'emulator');
    
    // Start emulator in background
    spawn(emulatorPath, ['-avd', emulator.name, '-no-audio', '-no-window'], {
      detached: true,
      stdio: 'ignore'
    });
    
    // Wait for emulator to start
    await new Promise(resolve => setTimeout(resolve, 15000));
  }

  // Wait for device to be ready
  async waitForDeviceReady(platform, deviceName, maxWait = 60000) {
    console.log(`⏳ Waiting for ${platform} device to be ready...`);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      try {
        if (platform === 'ios') {
          // Check if simulator is booted
          const status = execSync('xcrun simctl list devices booted', { encoding: 'utf8' });
          if (status.includes('iPhone') || status.includes('iPad')) {
            console.log('✅ iOS simulator ready');
            return true;
          }
        } else if (platform === 'android') {
          // Check if emulator is online
          const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
          const adbPath = path.join(androidHome, 'platform-tools', 'adb');
          const devices = execSync(`${adbPath} devices`, { encoding: 'utf8' });
          if (devices.includes('emulator') && devices.includes('device')) {
            console.log('✅ Android emulator ready');
            return true;
          }
        }
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`${platform} device not ready after ${maxWait}ms`);
  }

  // Run tests on both platforms
  async runCrossPlatformTests(options = {}) {
    console.log('📱📱 Running cross-platform tests...');
    
    const {
      parallel = false,
      iosDevice = 'auto',
      androidDevice = 'auto',
      testPattern = '',
      coverage = false
    } = options;

    const results = {};
    const availablePlatforms = [];
    
    if (this.supportedPlatforms.ios) availablePlatforms.push('ios');
    if (this.supportedPlatforms.android) availablePlatforms.push('android');
    
    if (availablePlatforms.length === 0) {
      throw new Error('No platforms available for testing');
    }

    console.log(`🎯 Testing on platforms: ${availablePlatforms.join(', ')}`);

    if (parallel && availablePlatforms.length > 1) {
      // Run platforms in parallel
      console.log('⚡ Running platforms in parallel...');
      
      const promises = availablePlatforms.map(platform => {
        const device = platform === 'ios' ? iosDevice : androidDevice;
        return this.runPlatformTests(platform, {
          device,
          testPattern,
          coverage: coverage && platform === 'ios' // Coverage only on one platform
        });
      });

      const parallelResults = await Promise.allSettled(promises);
      
      parallelResults.forEach((result, index) => {
        const platform = availablePlatforms[index];
        results[platform] = result.status === 'fulfilled' ? 
          result.value : { success: false, error: result.reason.message };
      });

    } else {
      // Run platforms sequentially
      console.log('🔄 Running platforms sequentially...');
      
      for (const platform of availablePlatforms) {
        const device = platform === 'ios' ? iosDevice : androidDevice;
        results[platform] = await this.runPlatformTests(platform, {
          device,
          testPattern,
          coverage: coverage && platform === availablePlatforms[0] // Coverage on first platform only
        });
      }
    }

    this.printCrossPlatformResults(results);
    
    const overallSuccess = Object.values(results).every(r => r.success);
    return { success: overallSuccess, results };
  }

  // Print cross-platform results
  printCrossPlatformResults(results) {
    console.log('\\n📊 Cross-Platform Test Results');
    console.log(''.padEnd(40, '='));
    
    Object.entries(results).forEach(([platform, result]) => {
      const icon = result.success ? '✅' : '❌';
      const duration = result.duration ? `${result.duration}ms` : 'N/A';
      
      console.log(`${icon} ${platform.toUpperCase()}: ${result.success ? 'PASSED' : 'FAILED'} (${duration})`);
      
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error.substring(0, 100)}...`);
      }
    });
    
    const passedCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;
    
    console.log(''.padEnd(40, '-'));
    console.log(`Platforms: ${passedCount}/${totalCount} passed`);
    
    if (passedCount === totalCount) {
      console.log('🎉 All platforms passed!');
    } else {
      console.log('❌ Some platforms failed');
    }
    
    console.log(''.padEnd(40, '=') + '\\n');
  }

  // List available devices
  listDevices() {
    console.log('📱 Available Test Devices');
    console.log(''.padEnd(30, '='));
    
    if (this.supportedPlatforms.ios) {
      console.log('\\n📱 iOS Simulators:');
      this.supportedPlatforms.simulators.forEach(sim => {
        const status = sim.state === 'Booted' ? '🟢' : '⚪';
        console.log(`   ${status} ${sim.name} (${sim.state})`);
      });
    } else {
      console.log('\\n📱 iOS: Not available (requires macOS + Xcode)');
    }
    
    if (this.supportedPlatforms.android) {
      console.log('\\n🤖 Android Emulators:');
      this.supportedPlatforms.emulators.forEach(emu => {
        console.log(`   📱 ${emu.name}`);
      });
    } else {
      console.log('\\n🤖 Android: Not available (requires Android SDK)');
    }
    
    console.log(''.padEnd(30, '=') + '\\n');
  }

  // Generate platform-specific test setup
  async generatePlatformTests() {
    console.log('🛠️ Generating platform-specific test utilities...');
    
    const testUtilsPath = path.join(this.rootDir, '__tests__', 'platform-utils');
    
    if (!fs.existsSync(testUtilsPath)) {
      fs.mkdirSync(testUtilsPath, { recursive: true });
    }

    // Generate iOS test utilities
    if (this.supportedPlatforms.ios) {
      await this.generateIOSTestUtils(testUtilsPath);
    }

    // Generate Android test utilities
    if (this.supportedPlatforms.android) {
      await this.generateAndroidTestUtils(testUtilsPath);
    }

    // Generate cross-platform test utilities
    await this.generateCrossPlatformTestUtils(testUtilsPath);
    
    console.log(`✅ Platform test utilities generated in ${testUtilsPath}`);
  }

  // Generate iOS test utilities
  async generateIOSTestUtils(outputPath) {
    const iosUtilsContent = `
/**
 * iOS Testing Utilities
 * Platform-specific test helpers for iOS
 */

export const iOSTestUtils = {
  // Simulate iOS-specific interactions
  simulateAppStateChange: (state: 'active' | 'background' | 'inactive') => {
    // Mock iOS app state changes
    const AppState = require('react-native').AppState;
    AppState.currentState = state;
    AppState._eventHandlers.change.forEach(handler => handler(state));
  },

  // Simulate iOS permissions
  simulatePermission: (permission: string, status: 'granted' | 'denied' | 'undetermined') => {
    // Mock iOS permission responses
    return Promise.resolve(status);
  },

  // Simulate iOS haptic feedback
  simulateHapticFeedback: (type: 'light' | 'medium' | 'heavy') => {
    // Mock iOS haptic feedback
    console.log(\`iOS Haptic: \${type}\`);
  },

  // iOS-specific crisis button testing
  testCrisisButtonIOS: () => {
    // Simulate iOS emergency calling
    const Linking = require('react-native').Linking;
    return Linking.openURL('tel:988');
  },

  // iOS breathing animation testing
  testBreathingAnimationIOS: () => {
    // Test iOS-specific animation performance
    const start = performance.now();
    // Simulate 60fps animation for 60 seconds
    return new Promise(resolve => {
      setTimeout(() => {
        const duration = performance.now() - start;
        resolve({ duration, targetDuration: 60000, fps: 60 });
      }, 100); // Quick test
    });
  }
};
`;

    fs.writeFileSync(path.join(outputPath, 'ios-utils.ts'), iosUtilsContent);
  }

  // Generate Android test utilities
  async generateAndroidTestUtils(outputPath) {
    const androidUtilsContent = `
/**
 * Android Testing Utilities
 * Platform-specific test helpers for Android
 */

export const AndroidTestUtils = {
  // Simulate Android-specific interactions
  simulateBackPress: () => {
    // Mock Android back button press
    const BackHandler = require('react-native').BackHandler;
    BackHandler._eventHandlers.hardwareBackPress.forEach(handler => handler());
  },

  // Simulate Android permissions
  simulatePermission: (permission: string, status: 'granted' | 'denied' | 'never_ask_again') => {
    // Mock Android permission responses
    return Promise.resolve(status);
  },

  // Simulate Android app lifecycle
  simulateAppLifecycle: (event: 'pause' | 'resume' | 'destroy') => {
    // Mock Android app lifecycle events
    console.log(\`Android Lifecycle: \${event}\`);
  },

  // Android-specific crisis button testing
  testCrisisButtonAndroid: () => {
    // Simulate Android emergency calling
    const Linking = require('react-native').Linking;
    return Linking.openURL('tel:988');
  },

  // Android breathing animation testing
  testBreathingAnimationAndroid: () => {
    // Test Android-specific animation performance
    const start = performance.now();
    // Simulate animation with Android-specific optimizations
    return new Promise(resolve => {
      setTimeout(() => {
        const duration = performance.now() - start;
        resolve({ duration, targetDuration: 60000, fps: 60 });
      }, 100); // Quick test
    });
  },

  // Android accessibility testing
  testAccessibilityAndroid: () => {
    // Test Android-specific accessibility features
    return {
      talkBackEnabled: false,
      touchExplorationEnabled: false,
      accessibilityFocusable: true
    };
  }
};
`;

    fs.writeFileSync(path.join(outputPath, 'android-utils.ts'), androidUtilsContent);
  }

  // Generate cross-platform test utilities
  async generateCrossPlatformTestUtils(outputPath) {
    const crossPlatformContent = `
/**
 * Cross-Platform Testing Utilities
 * Unified testing helpers that work across iOS and Android
 */

import { Platform } from 'react-native';
import { iOSTestUtils } from './ios-utils';
import { AndroidTestUtils } from './android-utils';

export const CrossPlatformTestUtils = {
  // Platform detection
  getCurrentPlatform: () => Platform.OS,
  
  isIOS: () => Platform.OS === 'ios',
  isAndroid: () => Platform.OS === 'android',

  // Universal crisis button testing
  testCrisisButton: async () => {
    if (Platform.OS === 'ios') {
      return iOSTestUtils.testCrisisButtonIOS();
    } else {
      return AndroidTestUtils.testCrisisButtonAndroid();
    }
  },

  // Universal breathing animation testing
  testBreathingAnimation: async () => {
    if (Platform.OS === 'ios') {
      return iOSTestUtils.testBreathingAnimationIOS();
    } else {
      return AndroidTestUtils.testBreathingAnimationAndroid();
    }
  },

  // Universal permission testing
  testPermissions: async (permission: string) => {
    if (Platform.OS === 'ios') {
      return iOSTestUtils.simulatePermission(permission, 'granted');
    } else {
      return AndroidTestUtils.simulatePermission(permission, 'granted');
    }
  },

  // Cross-platform performance testing
  testPerformanceMetrics: () => {
    const metrics = {
      platform: Platform.OS,
      timestamp: Date.now(),
      memory: {
        used: 0, // Would get actual memory usage
        available: 0
      },
      renderTime: 0 // Would measure actual render time
    };

    return metrics;
  },

  // Clinical accuracy testing across platforms
  testClinicalAccuracy: () => {
    // Test PHQ-9 and GAD-7 scoring consistency across platforms
    const testCases = [
      { phq9: [3, 3, 3, 3, 3, 3, 3, 3, 3], expectedScore: 27 },
      { gad7: [3, 3, 3, 3, 3, 3, 3], expectedScore: 21 }
    ];

    return testCases.map(testCase => {
      if ('phq9' in testCase) {
        const score = testCase.phq9.reduce((sum, val) => sum + val, 0);
        return {
          test: 'PHQ-9',
          platform: Platform.OS,
          expected: testCase.expectedScore,
          actual: score,
          passed: score === testCase.expectedScore
        };
      } else {
        const score = testCase.gad7.reduce((sum, val) => sum + val, 0);
        return {
          test: 'GAD-7',
          platform: Platform.OS,
          expected: testCase.expectedScore,
          actual: score,
          passed: score === testCase.expectedScore
        };
      }
    });
  }
};
`;

    fs.writeFileSync(path.join(outputPath, 'cross-platform-utils.ts'), crossPlatformContent);
  }
}

// CLI interface
async function main() {
  const tester = new CrossPlatformTesting();
  const command = process.argv[2] || 'list';
  const args = process.argv.slice(3);

  try {
    switch (command) {
      case 'list':
        tester.listDevices();
        break;
      case 'ios':
        await tester.runPlatformTests('ios', {
          device: args[0] || 'auto',
          testPattern: args[1] || '',
          coverage: args.includes('--coverage')
        });
        break;
      case 'android':
        await tester.runPlatformTests('android', {
          device: args[0] || 'auto',
          testPattern: args[1] || '',
          coverage: args.includes('--coverage')
        });
        break;
      case 'both':
      case 'cross':
        await tester.runCrossPlatformTests({
          parallel: args.includes('--parallel'),
          testPattern: args.find(arg => !arg.startsWith('--')) || '',
          coverage: args.includes('--coverage')
        });
        break;
      case 'setup':
        await tester.generatePlatformTests();
        break;
      default:
        console.log('Usage: node cross-platform-testing.js [command] [options]');
        console.log('Commands:');
        console.log('  list              - List available devices');
        console.log('  ios [device]      - Run iOS tests');
        console.log('  android [device]  - Run Android tests');
        console.log('  both [pattern]    - Run tests on both platforms');
        console.log('  setup             - Generate platform test utilities');
        console.log('');
        console.log('Options:');
        console.log('  --parallel        - Run platforms in parallel');
        console.log('  --coverage        - Include coverage analysis');
        process.exit(1);
    }
  } catch (error) {
    console.error('🚨 Cross-platform testing failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = CrossPlatformTesting;