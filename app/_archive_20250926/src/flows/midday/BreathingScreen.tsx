/**
 * BreathingScreen - Step 2 of Midday Reset
 * 3-minute breathing exercise using BreathingCircle
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BreathingCircle, StepsIndicator } from '../../components/checkin';
import { useCheckInStore } from '../../store';
import { colorSystem, spacing } from '../../constants/colors';

interface BreathingScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export const BreathingScreen: React.FC<BreathingScreenProps> = ({
  onNext,
  onBack
}) => {
  const { updateCurrentCheckIn } = useCheckInStore();

  const handleComplete = () => {
    updateCurrentCheckIn({ breathingCompleted: true });
    onNext();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <StepsIndicator
          totalSteps={3}
          currentStep={1}
          theme="midday"
        />
      </View>

      <View style={styles.content}>
        <BreathingCircle
          onComplete={handleComplete}
          theme="midday"
          autoStart={false}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.themes.midday.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
});

export default BreathingScreen;