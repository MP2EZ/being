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
  // MAINT-437: SafeAreaView removed. It was a DEAD re-export -- no consumer of this
  // barrel destructured it -- but `export { SafeAreaView } from 'react-native'` still
  // touches the deprecating getter at module load, which is the only reason it was in
  // scope. Import from 'react-native-safe-area-context' directly if ever needed.
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
  semantic,
  spacing,
  typography,
  borderRadius,
} from '@/core/theme';

// ============================================================================
// Shared Components
// ============================================================================
export { default as PracticeScreenHeader } from './PracticeScreenHeader';
export { default as PracticeToggleButton } from './PracticeToggleButton';
export { default as PracticeScreenLayout } from './PracticeScreenLayout';
export { default as PracticeInstructions } from './PracticeInstructions';

// ============================================================================
// Shared Hooks
// ============================================================================
export { usePracticeCompletion } from './usePracticeCompletion';
export { useInstructionsFade } from './useInstructionsFade';
export { useTimerPractice } from './useTimerPractice';

// ============================================================================
// Shared Styles
// ============================================================================
export { sharedPracticeStyles } from './sharedPracticeStyles';

// ============================================================================
// Types
// ============================================================================
export type { ModuleId } from '@/features/learn/types/education';
