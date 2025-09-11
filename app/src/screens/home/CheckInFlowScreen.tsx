/**
 * CheckInFlowScreen - Modal screen that hosts the check-in flows
 * Handles navigation to different flow types and completion
 */

import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { useCheckInStore } from '../../store';
import { MorningCheckInFlow, MiddayResetFlow, EveningReflectionFlow } from '../../flows';

type CheckInFlowParams = {
  CheckInFlow: {
    type: 'morning' | 'midday' | 'evening';
  };
};

type CheckInFlowScreenRouteProp = RouteProp<CheckInFlowParams, 'CheckInFlow'>;

export const CheckInFlowScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CheckInFlowScreenRouteProp>();
  const { type } = route.params;
  
  const { startCheckIn, loadTodaysCheckIns } = useCheckInStore();

  React.useEffect(() => {
    // Start the check-in when component mounts
    startCheckIn(type);
  }, [type, startCheckIn]);

  const handleComplete = async () => {
    try {
      // Reload today's check-ins to reflect the completed one
      await loadTodaysCheckIns();
      
      // Show success message
      Alert.alert(
        'Check-in Complete!',
        `Your ${type} check-in has been saved. Great job taking time for mindful awareness.`,
        [
          {
            text: 'Continue',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      navigation.goBack();
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const renderFlow = () => {
    switch (type) {
      case 'morning':
        return (
          <MorningCheckInFlow
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        );
      case 'midday':
        return (
          <MiddayResetFlow
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        );
      case 'evening':
        return (
          <EveningReflectionFlow
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        );
      default:
        return <View style={styles.container} />;
    }
  };

  return <View style={styles.container}>{renderFlow()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CheckInFlowScreen;