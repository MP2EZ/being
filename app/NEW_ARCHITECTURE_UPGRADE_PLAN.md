# React Native New Architecture Upgrade Plan

## Current State Analysis
- React Native: 0.81.4 (❌ No New Architecture support)
- Expo SDK: 54 (❌ Based on RN 0.81.4)
- React: 19.1.0 (❌ Incompatible with RN 0.81.4)

## Target Configuration for New Architecture

### Required Versions
```json
{
  "react-native": "0.82.0+",
  "expo": "55.0.0+",
  "react": "18.2.0",
  "@types/react": "18.2.0"
}
```

## Step-by-Step Upgrade Process

### Phase 1: Version Compatibility Fix
1. **Downgrade React to compatible version**
   ```bash
   npm install react@18.2.0 react-test-renderer@18.2.0 @types/react@18.2.0
   ```

2. **Update package.json overrides**
   ```json
   "overrides": {
     "react": "18.2.0",
     "react-test-renderer": "18.2.0",
     "@types/react": "18.2.0"
   }
   ```

3. **Test current app with compatible React version**
   ```bash
   npm run start
   # Should work without New Architecture but with stable foundation
   ```

### Phase 2: Expo SDK Upgrade (New Architecture Support)
1. **Upgrade to Expo SDK 55+ (supports RN 0.82+)**
   ```bash
   npx expo install --fix
   npx expo upgrade 55
   ```

2. **Update app.json for new SDK**
   ```json
   {
     "expo": {
       "sdkVersion": "55.0.0",
       "newArchEnabled": true
     }
   }
   ```

### Phase 3: React Native Upgrade
1. **Upgrade React Native to 0.82+**
   ```bash
   npx react-native upgrade 0.82.0
   ```

2. **Update iOS Podfile for New Architecture**
   ```ruby
   # Podfile should automatically detect newArchEnabled from properties
   ENV['RCT_NEW_ARCH_ENABLED'] = '1'
   ```

3. **Clean and rebuild iOS**
   ```bash
   cd ios && rm -rf Pods Podfile.lock
   pod install --repo-update
   cd .. && npx expo run:ios
   ```

### Phase 4: Development Build (Required for New Architecture)
1. **Install EAS CLI**
   ```bash
   npm install -g @expo/eas-cli
   eas login
   ```

2. **Create development build**
   ```bash
   eas build --profile development --platform ios
   ```

3. **Configure eas.json**
   ```json
   {
     "cli": {
       "version": ">= 8.0.0"
     },
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal",
         "ios": {
           "buildConfiguration": "Debug"
         }
       }
     }
   }
   ```

## Alternative: Quick Validation Option

### Immediate Test with Compatible Versions
If you want to test New Architecture capability without full upgrade:

1. **Create new test project with correct versions**
   ```bash
   npx create-expo-app --template blank-typescript NewArchTest
   cd NewArchTest
   npx expo install expo@55
   ```

2. **Copy your NewArchitectureTest component**
3. **Enable New Architecture in new project**
4. **Test if detection works**

## Verification Steps

### After Upgrade, Verify New Architecture
1. **Runtime Detection**: Your NewArchitectureTest component should show:
   ```
   ✅ Fabric UI Manager: Enabled
   ✅ TurboModules: Enabled
   ✅ Hermes Engine: Active
   ```

2. **Console Verification**: Should NOT see "Legacy Architecture" warnings

3. **Performance Benefits**:
   - Faster UI updates
   - Lower memory usage
   - Better responsiveness

## Risk Assessment

### High Risk Changes
- **React Native version bump**: May break existing native dependencies
- **Expo SDK upgrade**: Could affect Expo modules compatibility
- **Development Build requirement**: Changes deployment workflow

### Mitigation Strategy
1. **Create feature branch**: `git checkout -b feature/new-architecture-upgrade`
2. **Backup current working state**: Git commit before changes
3. **Test in isolated environment**: Use new test project first
4. **Gradual rollout**: Test one change at a time

## Timeline Estimate
- **Phase 1**: 30 minutes (React version fix)
- **Phase 2**: 1-2 hours (Expo SDK upgrade)
- **Phase 3**: 2-3 hours (React Native upgrade + testing)
- **Phase 4**: 1 hour (Development build setup)

**Total**: 4-6 hours for complete upgrade and testing

## Success Criteria
- [ ] NewArchitectureTest shows "✅ New Architecture Detected"
- [ ] No "Legacy Architecture" console warnings
- [ ] All existing functionality works
- [ ] Performance improvements measurable
- [ ] Crisis button response time <200ms maintained
- [ ] Breathing circle 60fps maintained

## Rollback Plan
If upgrade fails:
1. **Git reset**: Return to pre-upgrade commit
2. **Clean reinstall**: `rm -rf node_modules package-lock.json && npm install`
3. **Rebuild iOS**: `cd ios && rm -rf Pods && pod install`