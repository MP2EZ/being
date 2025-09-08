/**
 * EveningReflectionFlow - Navigation controller for 4-screen evening flow
 * Handles navigation between screens and flow completion
 */

import React, { useState } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { useCheckInStore } from '../store';
import {
  DayReviewScreen,
  GratitudeLearningScreen,
  BodyTensionReleaseScreen,
  SleepPreparationScreen
} from './evening';

interface EveningReflectionFlowProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const EveningReflectionFlow: React.FC<EveningReflectionFlowProps> = ({
  onComplete,
  onCancel
}) => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const { saveCurrentCheckIn, clearCurrentCheckIn } = useCheckInStore();

  const screens = [
    DayReviewScreen,
    GratitudeLearningScreen,
    BodyTensionReleaseScreen,
    SleepPreparationScreen
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
        'Unable to save your evening reflection. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Evening Reflection',
      'Are you sure you want to cancel? Your progress will be lost.',
      [
        { text: 'Continue Reflection', style: 'cancel' },
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

export default EveningReflectionFlow;