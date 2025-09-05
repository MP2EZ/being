/**
 * MorningCheckInFlow - Navigation controller for 6-screen morning flow
 * Handles navigation between screens and flow completion
 */

import React, { useState } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { useCheckInStore } from '../store';
import {
  BodyScanScreen,
  EmotionsScreen,
  ThoughtsScreen,
  EnergyLevelsScreen,
  TodaysValueScreen,
  IntentionScreen
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
  const { saveCurrentCheckIn, clearCurrentCheckIn } = useCheckInStore();

  const screens = [
    BodyScanScreen,
    EmotionsScreen, 
    ThoughtsScreen,
    EnergyLevelsScreen,
    TodaysValueScreen,
    IntentionScreen
  ];

  const handleNext = () => {
    if (currentScreen < screens.length - 1) {
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
      'Are you sure you want to cancel? Your progress will be lost.',
      [
        { text: 'Continue Check-in', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
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

  return (
    <View style={styles.container}>
      <CurrentScreen
        onNext={isLastScreen ? handleComplete : handleNext}
        onBack={isFirstScreen ? handleCancel : handleBack}
        onComplete={isLastScreen ? handleComplete : undefined}
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