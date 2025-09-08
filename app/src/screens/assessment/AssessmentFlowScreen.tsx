/**
 * AssessmentFlowScreen - Modal screen for PHQ-9 and GAD-7 assessments
 * Handles navigation through clinical assessment questions
 */

import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { useAssessmentStore } from '../../store';
import { AssessmentFlow } from '../../flows/assessment';

type AssessmentFlowParams = {
  AssessmentFlow: {
    type: 'phq9' | 'gad7';
  };
};

type AssessmentFlowScreenRouteProp = RouteProp<AssessmentFlowParams, 'AssessmentFlow'>;

export const AssessmentFlowScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<AssessmentFlowScreenRouteProp>();
  const { type } = route.params;
  
  const { startAssessment } = useAssessmentStore();

  React.useEffect(() => {
    // Start the assessment when component mounts
    startAssessment(type);
  }, [type, startAssessment]);

  const handleComplete = async (score: number) => {
    try {
      // Navigate to results screen with score
      (navigation as any).navigate('AssessmentResults', { type, score });
    } catch (error) {
      navigation.goBack();
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Assessment?',
      'Are you sure you want to cancel? Your progress will be lost.',
      [
        { text: 'Continue Assessment', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AssessmentFlow
        type={type}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AssessmentFlowScreen;