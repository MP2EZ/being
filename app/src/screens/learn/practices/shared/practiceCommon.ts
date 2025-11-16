/**
 * Barrel exports for common practice screen imports
 * Reduces import boilerplate across practice screens from 15-20 lines to 3-5 lines
 *
 * Usage:
 * import {
 *   useState,
 *   View,
 *   Text,
 *   PracticeScreenLayout,
 *   useTimerPractice,
 *   sharedPracticeStyles,
 *   type ModuleId,
 * } from './shared/practiceCommon';
 */

// ============================================================================
// React Hooks
// ============================================================================
export { useState, useCallback, useEffect } from 'react';
export type { ReactElement } from 'react';

// ============================================================================
// React Native Components
// ============================================================================
export {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Animated,
  TouchableOpacity,
  Pressable,
} from 'react-native';

// ============================================================================
// Design System (Constants)
// ============================================================================
export {
  colorSystem,
  spacing,
  typography,
  borderRadius,
} from '@/core/theme/colors';

// ============================================================================
// Phase 1 Shared Components (Existing)
// ============================================================================
export { default as PracticeScreenHeader } from './PracticeScreenHeader';
export { default as PracticeToggleButton } from './PracticeToggleButton';

// ============================================================================
// Phase 2 Shared Components (New)
// ============================================================================
export { default as PracticeScreenLayout } from './PracticeScreenLayout';
export { default as PracticeInstructions } from './PracticeInstructions';

// ============================================================================
// Phase 1 Shared Hooks (Existing)
// ============================================================================
export { usePracticeCompletion } from './usePracticeCompletion';
export { useInstructionsFade } from './useInstructionsFade';

// ============================================================================
// Phase 2 Shared Hooks (New)
// ============================================================================
export { useTimerPractice } from './useTimerPractice';

// ============================================================================
// Phase 2 Shared Styles (New)
// ============================================================================
export { sharedPracticeStyles } from './sharedPracticeStyles';

// ============================================================================
// Types
// ============================================================================
export type { ModuleId } from '../../../../types/education';
