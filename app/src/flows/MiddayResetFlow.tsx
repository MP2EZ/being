/**
 * MiddayResetFlow - Navigation controller for 3-screen midday flow
 * Handles navigation between screens and flow completion
 */

import React, { useState } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { useCheckInStore } from '../store';
import {
  QuickEmotionsScreen,
  BreathingScreen,
  EventsAndNeedsScreen
} from './midday';

interface MiddayResetFlowProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const MiddayResetFlow: React.FC<MiddayResetFlowProps> = ({
  onComplete,
  onCancel
}) => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const { saveCurrentCheckIn, clearCurrentCheckIn } = useCheckInStore();

  const screens = [
    QuickEmotionsScreen,
    BreathingScreen,
    EventsAndNeedsScreen
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
      'Cancel Reset',
      'Are you sure you want to cancel? Your progress will be lost.',
      [
        { text: 'Continue Reset', style: 'cancel' },
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

  const isFirstScreen = currentScreen === 0;
  const isLastScreen = currentScreen === screens.length - 1;

  const renderCurrentScreen = () => {
    const ScreenComponent = screens[currentScreen];
    if (!ScreenComponent) {
      return null;
    }

    return (
      <ScreenComponent
        onNext={isLastScreen ? handleComplete : handleNext}
        onBack={isFirstScreen ? handleCancel : handleBack}
        onComplete={isLastScreen ? handleComplete : undefined}
      />
    );
  };

  return (
    <View style={styles.container}>
      {renderCurrentScreen()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default MiddayResetFlow;