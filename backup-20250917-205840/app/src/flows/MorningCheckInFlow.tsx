/**
 * MorningCheckInFlow - Navigation controller for 6-screen morning flow
 * Handles navigation between screens and flow completion
 */

import React, { useState, useEffect } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { useCheckInStore } from '../store';
import { ResumeSessionDialog } from '../components/dialogs';
import { useCommonHaptics } from '../hooks/useHaptics';
import {
  BodyScanScreen,
  EmotionsScreen,
  ThoughtsScreen,
  EnergyLevelsScreen,
  TodaysValueScreen,
  DreamJournalScreen
} from './morning';

interface MorningCheckInFlowProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const MorningCheckInFlow: React.FC<MorningCheckInFlowProps> = ({
  onComplete,
  onCancel
}) => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  
  const { 
    saveCurrentCheckIn, 
    clearCurrentCheckIn, 
    startCheckIn,
    resumeCheckIn,
    checkForPartialSession,
    clearPartialSession,
    savePartialProgress,
    currentCheckIn 
  } = useCheckInStore();
  
  const { 
    onScreenChange, 
    onFlowComplete, 
    onProgressSave,
    onModalOpen,
    onModalClose 
  } = useCommonHaptics();

  const screens = [
    BodyScanScreen,
    EmotionsScreen, 
    ThoughtsScreen,
    EnergyLevelsScreen,
    TodaysValueScreen,
    DreamJournalScreen
  ];

  // Check for partial session on component mount
  useEffect(() => {
    const checkForExistingSession = async () => {
      try {
        const hasPartialSession = await checkForPartialSession('morning');
        if (hasPartialSession) {
          setShowResumeDialog(true);
          await onModalOpen();
        } else {
          // No partial session, start fresh
          startCheckIn('morning');
        }
      } catch (error) {
        console.error('Failed to check for partial session:', error);
        // On error, start fresh
        startCheckIn('morning');
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkForExistingSession();
  }, [checkForPartialSession, startCheckIn]);

  // Auto-save progress when moving between screens
  useEffect(() => {
    if (currentCheckIn && currentCheckIn.id && currentScreen > 0) {
      // Save progress after a delay to avoid excessive saves
      const timer = setTimeout(async () => {
        await savePartialProgress();
        await onProgressSave();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [currentScreen, currentCheckIn, savePartialProgress, onProgressSave]);

  // Handle resume session dialog actions
  const handleResumeSession = async () => {
    try {
      const resumed = await resumeCheckIn('morning');
      if (resumed && currentCheckIn) {
        // Determine which screen to show based on progress
        // This is a simplified approach - in a more sophisticated version,
        // you'd track exact screen progress
        const dataKeys = Object.keys(currentCheckIn.data || {});
        let screenIndex = Math.min(dataKeys.length, screens.length - 1);
        setCurrentScreen(screenIndex);
      }
      setShowResumeDialog(false);
      setIsCheckingSession(false);
      await onModalClose();
    } catch (error) {
      console.error('Failed to resume session:', error);
      handleStartFresh();
    }
  };

  const handleStartFresh = async () => {
    try {
      await clearPartialSession('morning');
      startCheckIn('morning');
      setCurrentScreen(0);
      setShowResumeDialog(false);
      setIsCheckingSession(false);
    } catch (error) {
      console.error('Failed to start fresh:', error);
      setShowResumeDialog(false);
      setIsCheckingSession(false);
    }
  };

  const handleNext = async () => {
    if (currentScreen < screens.length - 1) {
      await onScreenChange();
      setCurrentScreen(currentScreen + 1);
    }
  };

  const handleBack = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1);
    } else {
      handleCancel();
    }
  };

  const handleComplete = async () => {
    try {
      await saveCurrentCheckIn();
      await onFlowComplete();
      onComplete();
    } catch (error) {
      Alert.alert(
        'Save Error',
        'Unable to save your check-in. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Check-in',
      'Would you like to save your progress or cancel completely?',
      [
        { text: 'Continue Check-in', style: 'cancel' },
        {
          text: 'Save Progress',
          onPress: async () => {
            if (currentCheckIn && currentScreen > 0) {
              await savePartialProgress();
            }
            onCancel();
          }
        },
        {
          text: 'Cancel Completely',
          style: 'destructive',
          onPress: async () => {
            await clearPartialSession('morning');
            clearCurrentCheckIn();
            onCancel();
          }
        }
      ]
    );
  };

  const CurrentScreen = screens[currentScreen];
  const isFirstScreen = currentScreen === 0;
  const isLastScreen = currentScreen === screens.length - 1;

  // Show loading while checking for partial session
  if (isCheckingSession) {
    return (
      <View style={styles.container}>
        {/* You could add a loading spinner here */}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CurrentScreen
        onNext={isLastScreen ? handleComplete : handleNext}
        onBack={isFirstScreen ? handleCancel : handleBack}
        onComplete={isLastScreen ? handleComplete : undefined}
      />
      
      <ResumeSessionDialog
        visible={showResumeDialog}
        checkInType="morning"
        onResume={handleResumeSession}
        onStartFresh={handleStartFresh}
        onCancel={() => {
          setShowResumeDialog(false);
          setIsCheckingSession(false);
          onCancel();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default MorningCheckInFlow;