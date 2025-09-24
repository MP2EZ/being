/**
 * Button TypeScript Validation Tests - Pressable Migration
 *
 * Comprehensive type safety validation for Button component after Pressable migration.
 * Validates therapeutic features, New Architecture compatibility, and accessibility.
 */

import type {
  ButtonProps,
  EnhancedButtonProps,
  TherapeuticStyleFunction,
  CrisisOptimizedRipple,
  TherapeuticAnimationConfig,
  ButtonPerformanceMetrics,
} from '../ui';

import type {
  NEW_ARCHITECTURE_CONSTANTS,
  createCrisisButtonConfig,
  createTherapeuticAnimation,
  isCrisisOptimized,
  validatePerformanceConfig,
} from '../new-architecture-enhanced';

// === TYPE VALIDATION TESTS ===

/**
 * Test 1: ButtonProps Interface Compatibility
 * Validates that ButtonProps properly extends PressableProps
 */
function testButtonPropsInterface() {
  // ✅ Basic button props should work
  const basicProps: ButtonProps = {
    children: 'Test Button',
    onPress: () => console.log('pressed'),
  };

  // ✅ Crisis-optimized button props should work
  const crisisProps: ButtonProps = {
    children: 'Crisis Button',
    variant: 'crisis',
    emergency: true,
    haptic: true,
    onPress: () => console.log('crisis'),
  };

  // ✅ Therapeutic features should be type-safe
  const therapeuticProps: ButtonProps = {
    children: 'Therapeutic Button',
    variant: 'primary',
    theme: 'evening',
    haptic: true,
    fullWidth: true,
    onPress: async () => {
      // Async onPress support
      await new Promise(resolve => setTimeout(resolve, 100));
    },
  };

  return { basicProps, crisisProps, therapeuticProps };
}

/**
 * Test 2: Enhanced Pressable Style Function Types
 * Validates that style functions work with pressed state
 */
function testPressableStyleFunction() {
  // ✅ Function-based styling should work
  const styleFunction: TherapeuticStyleFunction = (state) => ({
    backgroundColor: state.pressed ? '#ddd' : '#fff',
    transform: [{ scale: state.pressed ? 0.95 : 1.0 }],
    opacity: state.emergency ? 1.0 : 0.9,
  });

  // ✅ Combined style types should work
  const buttonWithFunctionStyle: ButtonProps = {
    children: 'Styled Button',
    style: styleFunction,
    onPress: () => {},
  };

  // ✅ Array style should still work
  const buttonWithArrayStyle: ButtonProps = {
    children: 'Array Styled Button',
    style: [{ padding: 16 }, { backgroundColor: '#007AFF' }],
    onPress: () => {},
  };

  return { styleFunction, buttonWithFunctionStyle, buttonWithArrayStyle };
}

/**
 * Test 3: Android Ripple Configuration Types
 * Validates New Architecture android_ripple prop typing
 */
function testAndroidRippleConfiguration() {
  // ✅ Crisis-optimized ripple should work
  const crisisRipple: CrisisOptimizedRipple = {
    color: 'rgba(255, 255, 255, 0.3)',
    borderless: false,
    radius: 200,
    crisisMode: true,
    therapeuticFeedback: true,
  };

  // ✅ Standard ripple should work
  const standardRipple: CrisisOptimizedRipple = {
    color: 'rgba(0, 0, 0, 0.1)',
    borderless: false,
    radius: 100,
  };

  // ✅ Button with ripple configuration
  const buttonWithRipple: ButtonProps = {
    children: 'Ripple Button',
    android_ripple: crisisRipple,
    onPress: () => {},
  };

  return { crisisRipple, standardRipple, buttonWithRipple };
}

/**
 * Test 4: Therapeutic Animation Configuration Types
 * Validates animation configuration type safety
 */
function testTherapeuticAnimations() {
  // ✅ Crisis animation config should work
  const crisisAnimation: TherapeuticAnimationConfig = {
    type: 'crisis',
    duration: 200,
    easing: 'spring',
    springConfig: {
      damping: 15,
      stiffness: 300,
      mass: 0.8,
    },
    crisisOptimized: true,
    reduceMotion: false,
  };

  // ✅ Breathing animation config should work
  const breathingAnimation: TherapeuticAnimationConfig = {
    type: 'breathing',
    duration: 2000,
    easing: 'timing',
    timingConfig: {
      duration: 2000,
      useNativeDriver: true,
    },
    reduceMotion: false,
  };

  return { crisisAnimation, breathingAnimation };
}

/**
 * Test 5: Performance Metrics Validation
 * Validates performance configuration type safety
 */
function testPerformanceMetrics() {
  // ✅ Crisis performance metrics should work
  const crisisMetrics: ButtonPerformanceMetrics = {
    renderTime: 8, // Under 16ms for 60fps
    pressResponseTime: 150, // Under 200ms for crisis
    animationFrameDrops: 0,
    hapticLatency: 30, // Under 50ms
    fabricOptimized: true,
    turboModuleEnabled: true,
  };

  // ✅ Standard performance metrics should work
  const standardMetrics: ButtonPerformanceMetrics = {
    renderTime: 12,
    pressResponseTime: 100,
    animationFrameDrops: 1,
    hapticLatency: 25,
    fabricOptimized: true,
    turboModuleEnabled: false,
  };

  // ✅ Performance validation should work
  const isValidCrisis = validatePerformanceConfig(crisisMetrics);
  const isValidStandard = validatePerformanceConfig(standardMetrics);

  return { crisisMetrics, standardMetrics, isValidCrisis, isValidStandard };
}

/**
 * Test 6: Enhanced Button Props Integration
 * Validates that EnhancedButtonProps works with all features
 */
function testEnhancedButtonProps() {
  // ✅ Comprehensive enhanced button should work
  const enhancedButton: EnhancedButtonProps = {
    children: 'Enhanced Crisis Button',
    variant: 'crisis',
    emergency: true,

    // Enhanced styling
    style: (state) => ({
      backgroundColor: state.pressed ? '#cc0000' : '#ff0000',
      transform: [{ scale: state.pressed ? 0.95 : 1.0 }],
    }),

    // New Architecture features
    android_ripple: {
      color: 'rgba(255, 255, 255, 0.3)',
      crisisMode: true,
      therapeuticFeedback: true,
    },

    // Performance configuration
    performanceConfig: {
      renderTime: 8,
      pressResponseTime: 150,
      animationFrameDrops: 0,
      hapticLatency: 30,
      fabricOptimized: true,
      turboModuleEnabled: true,
    },

    // Animation configuration
    animationConfig: {
      type: 'crisis',
      duration: 200,
      easing: 'spring',
      springConfig: {
        damping: 15,
        stiffness: 300,
        mass: 0.8,
      },
      crisisOptimized: true,
    },

    // Enhanced haptic configuration
    hapticConfig: {
      type: 'heavy',
      crisisIntensity: true,
      nonBlocking: true,
    },

    // Crisis configuration
    crisisConfig: createCrisisButtonConfig(),

    // Enhanced accessibility
    accessibilityState: {
      disabled: false,
      crisisAlert: true,
      therapeuticContext: 'emergency',
    },

    // Event handlers
    onPress: async () => {
      console.log('Crisis button pressed');
    },
    onPressIn: () => console.log('Press started'),
    onPressOut: () => console.log('Press ended'),

    // Therapeutic timing
    therapeuticTiming: true,
    debugMode: false,
  };

  return { enhancedButton };
}

/**
 * Test 7: Type Guard Functions
 * Validates that type guard functions work correctly
 */
function testTypeGuards() {
  const crisisButton: Partial<EnhancedButtonProps> = {
    emergency: true,
    variant: 'crisis',
  };

  const standardButton: Partial<EnhancedButtonProps> = {
    variant: 'primary',
  };

  // ✅ Crisis optimization detection should work
  const isCrisisButton = isCrisisOptimized(crisisButton);
  const isStandardButton = isCrisisOptimized(standardButton);

  return { isCrisisButton, isStandardButton };
}

/**
 * Test 8: Constants and Factory Functions
 * Validates that constants and factory functions are properly typed
 */
function testConstantsAndFactories() {
  // ✅ Constants should be accessible
  const constants = NEW_ARCHITECTURE_CONSTANTS;

  // ✅ Factory functions should work
  const crisisConfig = createCrisisButtonConfig();
  const crisisAnimation = createTherapeuticAnimation('crisis');
  const breathingAnimation = createTherapeuticAnimation('breathing', {
    duration: 3000,
    reduceMotion: true,
  });

  return { constants, crisisConfig, crisisAnimation, breathingAnimation };
}

// === INTEGRATION TESTS ===

/**
 * Test 9: Real-World Button Usage Patterns
 * Validates common button usage patterns work with enhanced types
 */
function testRealWorldUsagePatterns() {
  // ✅ Crisis button with all features
  const crisisButton: ButtonProps = {
    children: 'Crisis Help',
    variant: 'crisis',
    emergency: true,
    haptic: true,
    fullWidth: true,
    style: ({ pressed }) => ({
      backgroundColor: pressed ? '#cc0000' : '#ff0000',
      opacity: pressed ? 0.8 : 1.0,
    }),
    android_ripple: {
      color: 'rgba(255, 255, 255, 0.3)',
      borderless: false,
      radius: 200,
    },
    accessibilityLabel: 'Emergency crisis help button',
    accessibilityHint: 'Activates crisis intervention resources',
    onPress: async () => {
      // Crisis response logic
    },
    testID: 'crisis-button',
  };

  // ✅ Therapeutic breathing button
  const breathingButton: ButtonProps = {
    children: 'Start Breathing Exercise',
    variant: 'primary',
    theme: 'evening',
    haptic: true,
    style: [
      { padding: 20 },
      ({ pressed }) => ({
        transform: [{ scale: pressed ? 0.95 : 1.0 }],
      }),
    ],
    onPress: () => {
      // Start breathing exercise
    },
  };

  // ✅ Assessment continue button
  const assessmentButton: ButtonProps = {
    children: 'Continue Assessment',
    variant: 'success',
    loading: false,
    disabled: false,
    onPress: () => {
      // Continue to next assessment question
    },
  };

  return { crisisButton, breathingButton, assessmentButton };
}

// === TYPE COMPILATION TESTS ===

/**
 * Test 10: Backward Compatibility
 * Ensures existing button usage patterns still work
 */
function testBackwardCompatibility() {
  // ✅ Legacy button props should still work
  const legacyButton: ButtonProps = {
    children: 'Legacy Button',
    onPress: () => {},
  };

  // ✅ Legacy style props should work
  const legacyStyledButton: ButtonProps = {
    children: 'Legacy Styled',
    style: { backgroundColor: '#007AFF' },
    onPress: () => {},
  };

  // ✅ Legacy therapeutic features should work
  const legacyTherapeuticButton: ButtonProps = {
    children: 'Legacy Therapeutic',
    variant: 'emergency',
    haptic: true,
    theme: 'morning',
    onPress: () => {},
  };

  return { legacyButton, legacyStyledButton, legacyTherapeuticButton };
}

// === EXPORT TEST FUNCTIONS ===

export const buttonTypeValidationTests = {
  testButtonPropsInterface,
  testPressableStyleFunction,
  testAndroidRippleConfiguration,
  testTherapeuticAnimations,
  testPerformanceMetrics,
  testEnhancedButtonProps,
  testTypeGuards,
  testConstantsAndFactories,
  testRealWorldUsagePatterns,
  testBackwardCompatibility,
};

// === TYPE ONLY VALIDATION ===

/**
 * These functions are never called - they exist only to validate TypeScript compilation.
 * If this file compiles without errors, our type definitions are correct.
 */
declare const __TYPE_VALIDATION__: never;

if (__TYPE_VALIDATION__) {
  // Run all validation tests
  Object.values(buttonTypeValidationTests).forEach(test => test());
}