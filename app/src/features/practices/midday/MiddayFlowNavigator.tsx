/**
 * MiddayFlowNavigator - Stoic Mindfulness Midday Reset
 *
 * DRD v2.0.0 SPECIFICATION (DRD-FLOW-003):
 * - 4 practices: Control → Embodiment → Reappraisal → Affirmation
 * - 3-7 minutes flexible duration
 * - Interrupt-friendly (can pause/resume)
 * - Modal presentation from CleanHomeScreen
 * - Midday theme throughout (#40B5AD)
 * - Crisis-accessible (<3s from any screen)
 *
 * FEAT-23: Session resumption with philosopher-validated Stoic language
 * - Supports resuming interrupted sessions (24hr TTL)
 * - Automatic session saving on screen navigation
 * - Sphere Sovereignty: Both resume and fresh start equally virtuous
 *
 * INFRA-135: Uses shared FlowProgressIndicator and useFlowSessionResumption hook
 *
 * PHILOSOPHY:
 * - Mindfulness-first with Stoic wisdom enrichment
 * - NOT toxic positivity - realistic perspective shift
 * - Grounded affirmations (capability within control)
 * - Oikeiôsis framework (self-compassion as foundation)
 */

import React, { useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colorSystem, spacing, typography } from '@/core/theme';
import { ResumeSessionModal, FlowProgressIndicator } from '../shared/components';
import { useFlowSessionResumption } from '../shared/hooks';
import ControlCheckScreen from './screens/ControlCheckScreen';
import EmbodimentScreen from './screens/EmbodimentScreen';
import ReappraisalScreen from './screens/ReappraisalScreen';
import AffirmationScreen from './screens/AffirmationScreen';
import MiddayCompletionScreen from './screens/MiddayCompletionScreen';
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';

// Navigation types (DRD v2.0.0 compliant)
export type MiddayFlowParamList = {
  ControlCheck: undefined;
  Embodiment: undefined;
  Reappraisal: undefined;
  Affirmation: undefined;
  MiddayCompletion: undefined;
};

interface MiddayFlowNavigatorProps {
  onComplete: (sessionData: any) => void;
  onExit: () => void;
}

const Stack = createStackNavigator<MiddayFlowParamList>();

// Screen order mapping for progress calculation (DRD v2.0.0)
const SCREEN_ORDER = [
  'ControlCheck',
  'Embodiment',
  'Reappraisal',
  'Affirmation',
  'MiddayCompletion',
] as const;

type MiddayScreenName = (typeof SCREEN_ORDER)[number];

const MiddayFlowNavigator: React.FC<MiddayFlowNavigatorProps> = ({
  onComplete,
  onExit,
}) => {
  // Navigation for crisis button
  const rootNavigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [sessionData, setSessionData] = useState<{
    startTime: number;
    controlCheckData?: any;
    embodimentData?: any;
    reappraisalData?: any;
    affirmationData?: any;
  }>({
    startTime: Date.now(),
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = SCREEN_ORDER.length - 1; // 4 steps (exclude MiddayCompletion)

  // FEAT-23 + INFRA-135: Use shared session resumption hook
  const {
    isCheckingSession,
    showResumeModal,
    resumableSession,
    initialNavigationState,
    shouldResetNav,
    hasResetNav,
    handleResumeSession,
    handleBeginFresh,
    updateScreenData,
    clearResetNav,
  } = useFlowSessionResumption<MiddayScreenName>({
    flowType: 'midday',
    screenOrder: SCREEN_ORDER,
    logPrefix: '[MiddayFlow]',
  });

  // Custom header with progress
  const getHeaderOptions = (_routeName: keyof MiddayFlowParamList, title: string) => ({
    headerTitle: () => (
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>{title}</Text>
        <FlowProgressIndicator
          currentStep={currentStep}
          totalSteps={totalSteps}
          flowType="midday"
        />
      </View>
    ),
    headerTitleAlign: 'center' as const,
  });

  // Screen wrappers with data persistence
  const ControlCheckScreenWrapper = ({ navigation, route }: any) => (
    <ControlCheckScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        updateScreenData('ControlCheck', data, 'Embodiment');
        // Also update sessionData for completion screen
        setSessionData((prev) => ({ ...prev, controlCheckData: data }));
        console.log('✅ ControlCheck completed');
      }}
    />
  );

  const EmbodimentScreenWrapper = ({ navigation, route }: any) => (
    <EmbodimentScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        updateScreenData('Embodiment', data, 'Reappraisal');
        setSessionData((prev) => ({ ...prev, embodimentData: data }));
        console.log('✅ Embodiment completed');
      }}
    />
  );

  const ReappraisalScreenWrapper = ({ navigation, route }: any) => (
    <ReappraisalScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        updateScreenData('Reappraisal', data, 'Affirmation');
        setSessionData((prev) => ({ ...prev, reappraisalData: data }));
        console.log('✅ Reappraisal completed');
      }}
    />
  );

  const AffirmationScreenWrapper = ({ navigation, route }: any) => (
    <AffirmationScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        updateScreenData('Affirmation', data, 'MiddayCompletion');
        setSessionData((prev) => ({ ...prev, affirmationData: data }));
        console.log('✅ Affirmation completed');
      }}
    />
  );

  const MiddayCompletionScreenWrapper = ({ navigation }: any) => {
    const finalSessionData = {
      ...sessionData,
      completedAt: Date.now(),
      duration: Date.now() - sessionData.startTime,
    };

    return (
      <MiddayCompletionScreen
        navigation={navigation}
        route={{ params: {} } as any}
        onComplete={() => {
          console.log('✅ Midday flow completed');
          onComplete(finalSessionData);
        }}
      />
    );
  };

  // Don't render anything until we've checked for a session
  if (isCheckingSession) {
    return null; // Could show a loading spinner here if desired
  }

  // Don't render navigator until resume modal is dismissed to prevent premature saves
  if (showResumeModal) {
    return (
      <ResumeSessionModal
        visible={showResumeModal}
        session={resumableSession}
        onResume={handleResumeSession}
        onBeginFresh={handleBeginFresh}
      />
    );
  }

  return (
    <>
      <Stack.Navigator
        initialRouteName="ControlCheck"
        screenOptions={{
          headerShown: true,
          gestureEnabled: true, // Allow swipe back for safety
          cardStyle: { backgroundColor: 'transparent' },
          headerStyle: {
            backgroundColor: colorSystem.themes.midday.background,
            borderBottomColor: colorSystem.themes.midday.primary,
            borderBottomWidth: 1,
            height: 100, // Increased height for progress indicator
          },
          headerTintColor: colorSystem.themes.midday.primary,
          headerLeft: () => (
            <Pressable
              onPress={onExit}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close midday flow"
              accessibilityHint="Returns to home screen"
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          ),
        }}
        screenListeners={({ navigation }) => ({
          state: (e) => {
            // FEAT-23: Trigger imperative reset if needed (on first mount after resume)
            if (shouldResetNav && !hasResetNav.current && initialNavigationState) {
              hasResetNav.current = true;
              console.log('[MiddayFlow] Triggering imperative reset with state:', initialNavigationState);

              // Reset navigation state
              navigation.reset(initialNavigationState);
              clearResetNav();
              console.log('[MiddayFlow] Imperative reset complete');
              return; // Don't process state update this cycle
            }

            // Update progress based on current screen
            const state = e.data.state;
            if (state) {
              const currentRouteName = state.routes[state.index]?.name;
              const stepIndex = SCREEN_ORDER.indexOf(currentRouteName as MiddayScreenName);
              if (stepIndex !== -1) {
                setCurrentStep(stepIndex + 1);
              }

              // FEAT-23: Session saving is handled by updateScreenData in screen wrappers
            }
          },
        })}
      >
        <Stack.Screen
          name="ControlCheck"
          component={ControlCheckScreenWrapper}
          options={getHeaderOptions('ControlCheck', 'Pause & Center')}
        />

        <Stack.Screen
          name="Embodiment"
          component={EmbodimentScreenWrapper}
          options={getHeaderOptions('Embodiment', 'Ground in Your Body')}
        />

        <Stack.Screen
          name="Reappraisal"
          component={ReappraisalScreenWrapper}
          options={getHeaderOptions('Reappraisal', 'Reframe with Wisdom')}
        />

        <Stack.Screen
          name="Affirmation"
          component={AffirmationScreenWrapper}
          options={getHeaderOptions('Affirmation', 'Self-Compassion')}
        />

        <Stack.Screen
          name="MiddayCompletion"
          component={MiddayCompletionScreenWrapper}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>

      {/* Crisis Button - Single instance for entire flow, maintains fade state */}
      <CollapsibleCrisisButton
        mode="immersive"
        onNavigate={() => rootNavigation.navigate('CrisisResources')}
        testID="crisis-midday-flow"
      />
    </>
  );
};

const styles = StyleSheet.create({
  // Header container and title
  headerContainer: {
    alignItems: 'center',
    width: '100%',
  },
  headerTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[4],
  },

  // Exit button (consistent with Evening/Morning)
  closeButton: {
    marginLeft: spacing[16],
    padding: spacing[8],
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: typography.headline4.size,
    color: colorSystem.base.black,
    fontWeight: typography.fontWeight.regular,
  },
});

export default MiddayFlowNavigator;
