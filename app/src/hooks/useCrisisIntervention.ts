/**
 * useCrisisIntervention - Accessible crisis support management
 * CRITICAL: Handles life-safety crisis detection and intervention
 */

import { useState } from 'react';
import { Linking, AccessibilityInfo, Alert } from 'react-native';
import { useHaptics } from './useHaptics';

export interface CrisisInterventionOptions {
  immediate?: boolean;
  source?: 'assessment' | 'manual' | 'sos';
  context?: string;
}

export const useCrisisIntervention = () => {
  const [isShowingCrisis, setIsShowingCrisis] = useState(false);
  const { triggerHaptic } = useHaptics();

  const triggerCrisisIntervention = async (options: CrisisInterventionOptions = {}) => {
    const { immediate = false, source = 'manual', context } = options;

    // Immediate haptic feedback for crisis situations
    await triggerHaptic('error');

    // Announce crisis state to screen readers immediately
    const announcement = immediate 
      ? 'URGENT: Crisis support needed. Emergency resources are now available.'
      : 'Crisis support resources are available if you need immediate help.';
    
    AccessibilityInfo.announceForAccessibility(
      announcement,
      { urgency: immediate ? 'high' : 'medium' } as any
    );

    setIsShowingCrisis(true);
  };

  const callCrisisHotline = async () => {
    try {
      // Announce calling action
      AccessibilityInfo.announceForAccessibility(
        'Calling 988 Crisis Lifeline now. Please wait.'
      );

      // Haptic feedback for emergency action
      await triggerHaptic('heavy');

      const phoneUrl = '988';
      const canOpen = await Linking.canOpenURL(`tel:${phoneUrl}`);
      
      if (canOpen) {
        await Linking.openURL(`tel:${phoneUrl}`);
      } else {
        // Fallback announcement if calling fails
        AccessibilityInfo.announceForAccessibility(
          'Unable to make call automatically. Please dial 9-8-8 directly on your phone for immediate crisis support.'
        );
        
        // Show accessible alert as fallback
        Alert.alert(
          'Call 988',
          'Please dial 988 directly on your phone for immediate crisis support.\n\n988 is the Suicide & Crisis Lifeline - free, confidential, 24/7.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      AccessibilityInfo.announceForAccessibility(
        'Call failed. Please dial 9-8-8 directly for crisis support.'
      );
    }
  };

  const callEmergencyServices = async () => {
    try {
      AccessibilityInfo.announceForAccessibility(
        'Calling 911 Emergency Services now.'
      );

      await triggerHaptic('heavy');
      
      const canOpen = await Linking.canOpenURL('tel:911');
      if (canOpen) {
        await Linking.openURL('tel:911');
      } else {
        AccessibilityInfo.announceForAccessibility(
          'Unable to call automatically. Please dial 9-1-1 for emergency services.'
        );
      }
    } catch (error) {
      AccessibilityInfo.announceForAccessibility(
        'Call failed. Please dial 9-1-1 for emergency services.'
      );
    }
  };

  const openCrisisTextLine = async () => {
    try {
      AccessibilityInfo.announceForAccessibility(
        'Opening crisis text line. Text HOME to 741741.'
      );

      const smsUrl = 'sms:741741?body=HOME';
      const canOpen = await Linking.canOpenURL(smsUrl);
      
      if (canOpen) {
        await Linking.openURL(smsUrl);
      } else {
        AccessibilityInfo.announceForAccessibility(
          'Please send a text message to 7-4-1-7-4-1 with the word HOME for crisis text support.'
        );
      }
    } catch (error) {
      AccessibilityInfo.announceForAccessibility(
        'Please manually text HOME to 741741 for crisis text support.'
      );
    }
  };

  const dismissCrisisIntervention = () => {
    AccessibilityInfo.announceForAccessibility(
      'Crisis support dismissed. Resources remain available from the menu.'
    );
    setIsShowingCrisis(false);
  };

  // Determine if assessment results require crisis intervention
  const evaluateCrisisNeed = (
    assessmentType: 'phq9' | 'gad7',
    score: number,
    answers: number[]
  ): boolean => {
    if (assessmentType === 'phq9') {
      // PHQ-9: Check for severe depression (≥20) or suicidal ideation (question 9 > 0)
      const hasSuicidalThoughts = answers[8] > 0; // Question 9 (index 8)
      const hasSevereDepression = score >= 20;
      
      return hasSuicidalThoughts || hasSevereDepression;
    }
    
    if (assessmentType === 'gad7') {
      // GAD-7: Check for severe anxiety (≥15)
      return score >= 15;
    }
    
    return false;
  };

  return {
    isShowingCrisis,
    triggerCrisisIntervention,
    callCrisisHotline,
    callEmergencyServices,
    openCrisisTextLine,
    dismissCrisisIntervention,
    evaluateCrisisNeed,
  };
};

export default useCrisisIntervention;