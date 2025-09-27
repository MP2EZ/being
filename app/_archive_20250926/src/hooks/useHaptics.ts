/**
 * useHaptics - Custom hook for consistent haptic feedback across the app
 * Respects user preferences and provides platform-appropriate feedback
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '../store/userStore';

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

interface UseHapticsReturn {
  triggerHaptic: (type: HapticType) => Promise<void>;
  isHapticsEnabled: boolean;
}

export const useHaptics = (): UseHapticsReturn => {
  const { user } = useUserStore();
  
  // Check if haptics are enabled in user preferences
  const isHapticsEnabled = Platform.OS === 'ios' && (user?.preferences?.haptics ?? true);

  const triggerHaptic = async (type: HapticType): Promise<void> => {
    // Only trigger haptics on iOS and if enabled in preferences
    if (!isHapticsEnabled) {
      return;
    }

    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      // Silently fail - haptics are non-critical
      console.debug('Haptic feedback failed:', error);
    }
  };

  return {
    triggerHaptic,
    isHapticsEnabled
  };
};

// Convenience functions for common haptic patterns
export const useCommonHaptics = () => {
  const { triggerHaptic } = useHaptics();

  return {
    // UI Interactions
    onPress: () => triggerHaptic('light'),          // Button presses, taps
    onSelect: () => triggerHaptic('light'),         // Selections, radio buttons
    onToggle: () => triggerHaptic('medium'),        // Switches, checkboxes
    onScroll: () => triggerHaptic('light'),         // Scroll boundaries, snap points
    
    // Navigation
    onScreenChange: () => triggerHaptic('light'),   // Screen transitions
    onModalOpen: () => triggerHaptic('medium'),     // Modal/dialog opens
    onModalClose: () => triggerHaptic('light'),     // Modal/dialog closes
    
    // Check-in Actions
    onStepComplete: () => triggerHaptic('medium'),  // Completing a check-in step
    onFlowComplete: () => triggerHaptic('success'), // Completing entire flow
    onProgressSave: () => triggerHaptic('light'),   // Auto-save progress
    
    // Assessment Actions
    onAnswerSelect: () => triggerHaptic('light'),   // Selecting assessment answers
    onAssessmentComplete: () => triggerHaptic('success'), // Completing assessment
    
    // System Feedback
    onSuccess: () => triggerHaptic('success'),      // Success states
    onWarning: () => triggerHaptic('warning'),      // Warning states  
    onError: () => triggerHaptic('error'),          // Error states
    onCancel: () => triggerHaptic('medium'),        // Cancel actions
  };
};

export default useHaptics;