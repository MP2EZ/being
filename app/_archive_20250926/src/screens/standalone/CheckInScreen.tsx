/**
 * Standalone CheckInScreen - Multi-step check-in flow with mood tracking
 * Integrates all check-in types with session persistence and therapeutic validation
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
// FIXED: Import from ReanimatedMock to prevent property descriptor conflicts
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from '../../utils/ReanimatedMock';
import { Button, CrisisButton, Slider } from '../../components/core';
import { MultiSelect, TextArea } from '../../components/core';
import { StepsIndicator } from '../../components/checkin';
import { colorSystem, spacing } from '../../constants/colors';
import { useThemeColors } from '../../contexts/ThemeContext';
import { useCheckInStore } from '../../store';
import { useCommonHaptics } from '../../hooks/useHaptics';

const { width: screenWidth } = Dimensions.get('window');

interface CheckInScreenParams {
  CheckInScreen: {
    type?: 'morning' | 'midday' | 'evening';
    autoStart?: boolean;
  };
}

type CheckInScreenRouteProp = RouteProp<CheckInScreenParams, 'CheckInScreen'>;

// Emotion options for different check-ins
const EMOTIONS = [
  'Calm', 'Happy', 'Excited', 'Grateful', 'Peaceful',
  'Anxious', 'Sad', 'Frustrated', 'Tired', 'Overwhelmed',
  'Hopeful', 'Content', 'Energetic', 'Reflective', 'Curious'
];

// Body area options for morning check-ins
const BODY_AREAS = [
  'Head', 'Neck', 'Shoulders', 'Arms', 'Chest',
  'Back', 'Stomach', 'Hips', 'Legs', 'Feet'
];

interface CheckInStep {
  id: string;
  title: string;
  subtitle: string;
  component: React.ComponentType<any>;
}

export const CheckInScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CheckInScreenRouteProp>();
  const { type = 'morning', autoStart = false } = route.params || {};

  const themeColors = useThemeColors();
  const { onScreenChange, onFlowComplete } = useCommonHaptics();
  const {
    currentCheckIn,
    updateCurrentCheckIn,
    saveCurrentCheckIn,
    startCheckIn,
    clearCurrentCheckIn,
    savePartialProgress,
  } = useCheckInStore();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // Animation values for smooth transitions
  const slideAnimation = useSharedValue(0);
  const fadeAnimation = useSharedValue(1);

  // Initialize check-in on mount
  useEffect(() => {
    if (autoStart) {
      initializeCheckIn();
    }
  }, [autoStart]);

  const initializeCheckIn = useCallback(async () => {
    try {
      await startCheckIn(type);
    } catch (error) {
      console.error('Failed to start check-in:', error);
      Alert.alert('Error', 'Failed to start check-in. Please try again.');
    }
  }, [type, startCheckIn]);

  // Define steps based on check-in type
  const steps = useMemo((): CheckInStep[] => {
    switch (type) {
      case 'morning':
        return [
          { id: 'mood', title: 'How are you feeling?', subtitle: 'Rate your current mood', component: MoodStep },
          { id: 'body', title: 'Body Scan', subtitle: 'Notice areas of tension or comfort', component: BodyStep },
          { id: 'emotions', title: 'Emotions', subtitle: 'What emotions are present right now?', component: EmotionsStep },
          { id: 'sleep', title: 'Sleep Quality', subtitle: 'How well did you sleep last night?', component: SleepStep },
          { id: 'energy', title: 'Energy Level', subtitle: 'How energetic do you feel?', component: EnergyStep },
          { id: 'intention', title: 'Today\'s Intention', subtitle: 'What do you hope to cultivate today?', component: IntentionStep },
        ];
      case 'midday':
        return [
          { id: 'mood', title: 'Current Mood', subtitle: 'How are you feeling right now?', component: MoodStep },
          { id: 'emotions', title: 'Present Emotions', subtitle: 'What emotions are you experiencing?', component: EmotionsStep },
          { id: 'pleasant', title: 'Pleasant Moment', subtitle: 'Share something positive from today', component: PleasantStep },
          { id: 'challenge', title: 'Today\'s Challenge', subtitle: 'What has been difficult today?', component: ChallengeStep },
          { id: 'need', title: 'What You Need', subtitle: 'What would support you right now?', component: NeedStep },
        ];
      case 'evening':
        return [
          { id: 'mood', title: 'Evening Mood', subtitle: 'How are you feeling as the day ends?', component: MoodStep },
          { id: 'highlight', title: 'Day\'s Highlight', subtitle: 'What was the best part of your day?', component: HighlightStep },
          { id: 'emotions', title: 'Day\'s Emotions', subtitle: 'What emotions did you experience today?', component: EmotionsStep },
          { id: 'gratitude', title: 'Gratitude', subtitle: 'What are you grateful for today?', component: GratitudeStep },
          { id: 'learning', title: 'Today\'s Learning', subtitle: 'What did you learn about yourself today?', component: LearningStep },
          { id: 'tomorrow', title: 'Tomorrow\'s Focus', subtitle: 'What do you want to focus on tomorrow?', component: TomorrowStep },
        ];
      default:
        return [];
    }
  }, [type]);

  // Handle step navigation with smooth transitions
  const handleNext = useCallback(async () => {
    if (currentStepIndex < steps.length - 1) {
      // Animate transition
      fadeAnimation.value = withSequence(
        withTiming(0, { duration: 150, easing: Easing.ease }),
        withTiming(1, { duration: 150, easing: Easing.ease })
      );

      slideAnimation.value = withSequence(
        withTiming(-50, { duration: 150, easing: Easing.ease }),
        withTiming(0, { duration: 150, easing: Easing.ease })
      );

      await onScreenChange();
      setCurrentStepIndex(currentStepIndex + 1);

      // Auto-save progress
      await savePartialProgress(`step_${steps[currentStepIndex + 1].id}`);
    } else {
      await handleComplete();
    }
  }, [currentStepIndex, steps, fadeAnimation, slideAnimation, onScreenChange, savePartialProgress]);

  const handleBack = useCallback(async () => {
    if (currentStepIndex > 0) {
      // Animate transition
      fadeAnimation.value = withSequence(
        withTiming(0, { duration: 150, easing: Easing.ease }),
        withTiming(1, { duration: 150, easing: Easing.ease })
      );

      slideAnimation.value = withSequence(
        withTiming(50, { duration: 150, easing: Easing.ease }),
        withTiming(0, { duration: 150, easing: Easing.ease })
      );

      setCurrentStepIndex(currentStepIndex - 1);
    } else {
      handleCancel();
    }
  }, [currentStepIndex, fadeAnimation, slideAnimation]);

  const handleComplete = useCallback(async () => {
    try {
      setIsLoading(true);
      await updateCurrentCheckIn(formData);
      await saveCurrentCheckIn();
      await onFlowComplete();

      Alert.alert(
        'Check-in Complete!',
        `Your ${type} check-in has been saved. Thank you for taking time for mindful reflection.`,
        [{ text: 'Continue', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Failed to complete check-in:', error);
      Alert.alert('Error', 'Failed to save your check-in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [formData, updateCurrentCheckIn, saveCurrentCheckIn, onFlowComplete, type, navigation]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancel Check-in',
      'Would you like to save your progress or cancel completely?',
      [
        { text: 'Continue Check-in', style: 'cancel' },
        {
          text: 'Save Progress',
          onPress: async () => {
            if (Object.keys(formData).length > 0) {
              await updateCurrentCheckIn(formData);
              await savePartialProgress(`step_${steps[currentStepIndex].id}`);
            }
            navigation.goBack();
          }
        },
        {
          text: 'Cancel Completely',
          style: 'destructive',
          onPress: () => {
            clearCurrentCheckIn();
            navigation.goBack();
          }
        }
      ]
    );
  }, [formData, updateCurrentCheckIn, savePartialProgress, steps, currentStepIndex, clearCurrentCheckIn, navigation]);

  // Update form data
  const updateFormData = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnimation.value,
    transform: [{ translateX: slideAnimation.value }],
  }));

  const currentStep = steps[currentStepIndex];
  const CurrentStepComponent = currentStep?.component;

  if (!currentStep) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invalid check-in configuration</Text>
          <Button onPress={() => navigation.goBack()}>Go Back</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorSystem.themes[type].background }]}>
      {/* Crisis Button */}
      <CrisisButton variant="floating" />

      {/* Header */}
      <View style={styles.header}>
        <StepsIndicator
          totalSteps={steps.length}
          currentStep={currentStepIndex}
          theme={type}
        />
        <Text style={styles.title}>{currentStep.title}</Text>
        <Text style={styles.subtitle}>{currentStep.subtitle}</Text>
      </View>

      {/* Step Content */}
      <Animated.View style={[styles.content, animatedStyle]}>
        <CurrentStepComponent
          value={formData[currentStep.id]}
          onChange={(value: any) => updateFormData(currentStep.id, value)}
          theme={type}
        />
      </Animated.View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <Button
          variant="outline"
          onPress={handleBack}
          style={styles.backButton}
          fullWidth={false}
        >
          {currentStepIndex === 0 ? 'Cancel' : 'Back'}
        </Button>

        <Button
          theme={type}
          onPress={handleNext}
          style={styles.nextButton}
          loading={isLoading}
          fullWidth={false}
        >
          {currentStepIndex === steps.length - 1 ? 'Complete' : 'Next'}
        </Button>
      </View>
    </SafeAreaView>
  );
};

// Step Components
const MoodStep: React.FC<{ value: number; onChange: (value: number) => void; theme: string }> = ({
  value = 5,
  onChange,
  theme
}) => (
  <View style={stepStyles.container}>
    <Slider
      value={value}
      onValueChange={onChange}
      minimumValue={1}
      maximumValue={10}
      step={1}
      theme={theme}
      showLabels={true}
      labels={['Very Low', 'Low', 'Neutral', 'Good', 'Excellent']}
    />
    <Text style={stepStyles.valueText}>Current: {value}/10</Text>
  </View>
);

const BodyStep: React.FC<{ value: string[]; onChange: (value: string[]) => void }> = ({
  value = [],
  onChange
}) => (
  <View style={stepStyles.container}>
    <Text style={stepStyles.instruction}>
      Take a moment to scan your body from head to toe. Select areas where you notice tension, discomfort, or relaxation.
    </Text>
    <MultiSelect
      options={BODY_AREAS}
      selectedValues={value}
      onSelectionChange={onChange}
      maxSelections={5}
      placeholder="Tap to select body areas..."
    />
  </View>
);

const EmotionsStep: React.FC<{ value: string[]; onChange: (value: string[]) => void }> = ({
  value = [],
  onChange
}) => (
  <View style={stepStyles.container}>
    <Text style={stepStyles.instruction}>
      What emotions are you experiencing right now? Select all that apply.
    </Text>
    <MultiSelect
      options={EMOTIONS}
      selectedValues={value}
      onSelectionChange={onChange}
      maxSelections={5}
      placeholder="Tap to select emotions..."
    />
  </View>
);

const SleepStep: React.FC<{ value: number; onChange: (value: number) => void; theme: string }> = ({
  value = 5,
  onChange,
  theme
}) => (
  <View style={stepStyles.container}>
    <Text style={stepStyles.instruction}>
      How would you rate the quality of your sleep last night?
    </Text>
    <Slider
      value={value}
      onValueChange={onChange}
      minimumValue={1}
      maximumValue={10}
      step={1}
      theme={theme}
      showLabels={true}
      labels={['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent']}
    />
    <Text style={stepStyles.valueText}>Quality: {value}/10</Text>
  </View>
);

const EnergyStep: React.FC<{ value: number; onChange: (value: number) => void; theme: string }> = ({
  value = 5,
  onChange,
  theme
}) => (
  <View style={stepStyles.container}>
    <Text style={stepStyles.instruction}>
      How energetic do you feel right now?
    </Text>
    <Slider
      value={value}
      onValueChange={onChange}
      minimumValue={1}
      maximumValue={10}
      step={1}
      theme={theme}
      showLabels={true}
      labels={['Exhausted', 'Low', 'Moderate', 'High', 'Very High']}
    />
    <Text style={stepStyles.valueText}>Energy: {value}/10</Text>
  </View>
);

const IntentionStep: React.FC<{ value: string; onChange: (value: string) => void }> = ({
  value = '',
  onChange
}) => (
  <View style={stepStyles.container}>
    <Text style={stepStyles.instruction}>
      What quality or intention would you like to cultivate today? This could be a feeling, attitude, or way of being.
    </Text>
    <TextArea
      value={value}
      onChangeText={onChange}
      placeholder="I intend to..."
      maxLength={200}
      multiline={true}
    />
  </View>
);

const PleasantStep: React.FC<{ value: string; onChange: (value: string) => void }> = ({
  value = '',
  onChange
}) => (
  <View style={stepStyles.container}>
    <Text style={stepStyles.instruction}>
      Share something pleasant or positive that has happened today, no matter how small.
    </Text>
    <TextArea
      value={value}
      onChangeText={onChange}
      placeholder="Something pleasant today was..."
      maxLength={200}
      multiline={true}
    />
  </View>
);

const ChallengeStep: React.FC<{ value: string; onChange: (value: string) => void }> = ({
  value = '',
  onChange
}) => (
  <View style={stepStyles.container}>
    <Text style={stepStyles.instruction}>
      What has been challenging or difficult today? It's okay to acknowledge struggles.
    </Text>
    <TextArea
      value={value}
      onChangeText={onChange}
      placeholder="Today has been challenging because..."
      maxLength={200}
      multiline={true}
    />
  </View>
);

const NeedStep: React.FC<{ value: string; onChange: (value: string) => void }> = ({
  value = '',
  onChange
}) => (
  <View style={stepStyles.container}>
    <Text style={stepStyles.instruction}>
      What do you need right now to support your wellbeing? This could be practical, emotional, or spiritual.
    </Text>
    <TextArea
      value={value}
      onChangeText={onChange}
      placeholder="Right now I need..."
      maxLength={200}
      multiline={true}
    />
  </View>
);

const HighlightStep: React.FC<{ value: string; onChange: (value: string) => void }> = ({
  value = '',
  onChange
}) => (
  <View style={stepStyles.container}>
    <Text style={stepStyles.instruction}>
      What was the highlight of your day? What moment brought you joy, satisfaction, or peace?
    </Text>
    <TextArea
      value={value}
      onChangeText={onChange}
      placeholder="The highlight of my day was..."
      maxLength={200}
      multiline={true}
    />
  </View>
);

const GratitudeStep: React.FC<{ value: string; onChange: (value: string) => void }> = ({
  value = '',
  onChange
}) => (
  <View style={stepStyles.container}>
    <Text style={stepStyles.instruction}>
      What are you grateful for today? This can be anything - big or small, ordinary or extraordinary.
    </Text>
    <TextArea
      value={value}
      onChangeText={onChange}
      placeholder="I am grateful for..."
      maxLength={200}
      multiline={true}
    />
  </View>
);

const LearningStep: React.FC<{ value: string; onChange: (value: string) => void }> = ({
  value = '',
  onChange
}) => (
  <View style={stepStyles.container}>
    <Text style={stepStyles.instruction}>
      What did you learn about yourself today? What insights or discoveries did you have?
    </Text>
    <TextArea
      value={value}
      onChangeText={onChange}
      placeholder="Today I learned..."
      maxLength={200}
      multiline={true}
    />
  </View>
);

const TomorrowStep: React.FC<{ value: string; onChange: (value: string) => void }> = ({
  value = '',
  onChange
}) => (
  <View style={stepStyles.container}>
    <Text style={stepStyles.instruction}>
      What would you like to focus on or be mindful of tomorrow?
    </Text>
    <TextArea
      value={value}
      onChangeText={onChange}
      placeholder="Tomorrow I want to focus on..."
      maxLength={200}
      multiline={true}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    fontSize: 16,
    color: colorSystem.status.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});

const stepStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  instruction: {
    fontSize: 16,
    color: colorSystem.gray[700],
    lineHeight: 22,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  valueText: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

export default CheckInScreen;