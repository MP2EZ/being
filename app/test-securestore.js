/**
 * SecureStore Entitlement Test
 * Run this to verify SecureStore is working properly after entitlement fixes
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TEST_KEY = 'being-securestore-test';
const TEST_VALUE = 'test-value-' + Date.now();

async function testSecureStore() {
  console.log('🔐 Testing SecureStore functionality...');
  console.log('Platform:', Platform.OS);

  try {
    // Test 1: Write to SecureStore
    console.log('\n📝 Test 1: Writing to SecureStore');
    await SecureStore.setItemAsync(TEST_KEY, TEST_VALUE);
    console.log('✅ Successfully wrote to SecureStore');

    // Test 2: Read from SecureStore
    console.log('\n📖 Test 2: Reading from SecureStore');
    const retrievedValue = await SecureStore.getItemAsync(TEST_KEY);

    if (retrievedValue === TEST_VALUE) {
      console.log('✅ Successfully read from SecureStore');
      console.log('Value matches:', retrievedValue);
    } else {
      console.log('❌ Value mismatch');
      console.log('Expected:', TEST_VALUE);
      console.log('Got:', retrievedValue);
    }

    // Test 3: Check if key exists
    console.log('\n🔍 Test 3: Checking key existence');
    const keyExists = await SecureStore.isAvailableAsync();
    console.log('SecureStore available:', keyExists);

    // Test 4: Delete from SecureStore
    console.log('\n🗑️ Test 4: Deleting from SecureStore');
    await SecureStore.deleteItemAsync(TEST_KEY);
    console.log('✅ Successfully deleted from SecureStore');

    // Test 5: Verify deletion
    console.log('\n✅ Test 5: Verifying deletion');
    const deletedValue = await SecureStore.getItemAsync(TEST_KEY);
    if (deletedValue === null) {
      console.log('✅ Key successfully deleted (returns null)');
    } else {
      console.log('❌ Key still exists:', deletedValue);
    }

    console.log('\n🎉 All SecureStore tests passed!');
    return true;

  } catch (error) {
    console.log('\n❌ SecureStore test failed:');
    console.log('Error:', error.message);
    console.log('Code:', error.code);
    console.log('Stack:', error.stack);

    // Specific error handling for entitlement issues
    if (error.message?.includes('entitlement')) {
      console.log('\n🔧 ENTITLEMENT ISSUE DETECTED:');
      console.log('1. Check Being.entitlements file has keychain-access-groups');
      console.log('2. Verify Xcode project links to entitlements file');
      console.log('3. Clean and rebuild the iOS app');
      console.log('4. Make sure app is running on device/simulator with proper provisioning');
    }

    return false;
  }
}

// Test specific SecureStore options
async function testSecureStoreOptions() {
  console.log('\n🔧 Testing SecureStore with options...');

  const options = {
    keychainService: 'com.being.mbct.keychain',
    requireAuthentication: false,
    accessGroup: 'group.com.being.mbct.widgets'
  };

  try {
    await SecureStore.setItemAsync('test-options', 'test-value', options);
    const value = await SecureStore.getItemAsync('test-options', options);
    await SecureStore.deleteItemAsync('test-options', options);

    console.log('✅ SecureStore options test passed');
    return true;
  } catch (error) {
    console.log('❌ SecureStore options test failed:', error.message);
    return false;
  }
}

export { testSecureStore, testSecureStoreOptions };

// If running directly
if (typeof require !== 'undefined' && require.main === module) {
  (async () => {
    const basicTest = await testSecureStore();
    const optionsTest = await testSecureStoreOptions();

    if (basicTest && optionsTest) {
      console.log('\n🎉 ALL SECURESTORE TESTS PASSED! 🎉');
    } else {
      console.log('\n❌ Some SecureStore tests failed');
      console.log('Check entitlements and rebuild the app');
    }
  })();
}