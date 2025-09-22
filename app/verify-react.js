/**
 * React Version Verification Script
 * Tests if React 18.2.0 fix resolved the runtime issue
 */

const React = require('react');
const { version } = require('./package.json');

console.log('=== REACT VERSION VERIFICATION ===');
console.log('App package.json version:', version);
console.log('React version from node_modules:', React.version);
console.log('Expected React version: 18.2.0');

// Check if versions match expected
const isReactCorrect = React.version === '18.2.0';
console.log('✅ React version correct:', isReactCorrect ? 'YES' : 'NO');

// Check if overrides worked
const packageJson = require('./package.json');
console.log('Package.json overrides React:', packageJson.overrides?.react);
console.log('Package.json resolutions React:', packageJson.resolutions?.react);

console.log('\n=== DIAGNOSIS ===');
if (isReactCorrect) {
  console.log('✅ React 18.2.0 is correctly installed');
  console.log('📱 iOS runtime error likely due to:');
  console.log('   - Cached native iOS build from React 19');
  console.log('   - Need complete iOS rebuild');
  console.log('   - TypeScript compilation issues blocking build');
} else {
  console.log('❌ React version mismatch - package resolution failed');
}

console.log('\n=== NEXT STEPS ===');
console.log('1. Complete iOS native rebuild (expo run:ios)');
console.log('2. Clear all caches (Metro, Xcode, npm)');
console.log('3. Test with Expo Go app');
console.log('4. Verify runtime React version in simulator');