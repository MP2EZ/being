/**
 * Evening Flow Navigator - FEAT-134 UX-Optimized Redesign
 * Stoic Mindfulness Evening Practice (6 screens)
 *
 * CRITICAL CLINICAL SAFETY IMPLEMENTATION:
 * - Crisis button always present in headers
 * - Gentle therapeutic language
 * - Evening-appropriate header styling
 * - Safety-first navigation approach
 *
 * FEAT-23: Session resumption with philosopher-validated Stoic language
 * - Supports resuming interrupted sessions (24hr TTL)
 * - Automatic session saving on screen navigation
 * - Sphere Sovereignty: Both resume and fresh start equally virtuous
 *
 * INFRA-135: Uses shared FlowProgressIndicator and useFlowSessionResumption hook
 *
 * FEAT-134 UX-Optimized Flow (6 screens, 3 required fields):
 * 1. Breathing - Pure 60s settling (no decisions)
 * 2. Gratitude - Positive priming (1 required, up to 3)
 * 3. VirtueReflection - Reflection + inline principle picker
 * 4. SelfCompassion - Dedicated self-kindness (required)
 * 5. Tomorrow - Optional intention (skippable)
 * 6. SleepTransition - Gentle breathing + completion card
 *
 * Principle Engagement:
 * - When user selects a principle on VirtueReflection, record engagement
 * - Feeds Insights dashboard via recordPrincipleEngagement()
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import { logger, LogCategory } from '@/core/services/logging';
import React, { useState, useCallback } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colorSystem, spacing, typography } from '@/core/theme';
import type {
  EveningFlowParamList,
  EveningBreathingData,
  EveningGratitudeData,
  VirtueReflectionData,
  SelfCompassionData,
  TomorrowData,
  SleepTransitionData,
  EveningCompletionSummary,
} from '@/features/practices/types/flows';
import type { StoicPrinciple } from '@/features/practices/types/stoic';
import { SessionStorageService } from '@/core/services/session/SessionStorageService';
import { ResumeSessionModal, FlowProgressIndicator } from '../shared/components';
import { useFlowSessionResumption } from '../shared/hooks';
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';

// Import FEAT-134 UX-Optimized screens
import BreathingScreen from './screens/BreathingScreen';
import GratitudeScreen from './screens/GratitudeScreen';
import VirtueReflectionScreen from './screens/VirtueReflectionScreen';
import SelfCompassionScreen from './screens/SelfCompassionScreen';
import TomorrowScreen from './screens/TomorrowScreen';
import SleepTransitionScreen from './screens/SleepTransitionScreen';

const Stack = createStackNavigator<EveningFlowParamList>();

interface EveningFlowNavigatorProps {
  onComplete: (sessionData: EveningSessionData) => void;
  onExit: () => void;
  recordPrincipleEngagement?: (
    principle: StoicPrinciple,
    context: 'evening',
    type: 'reflected'
  ) => void;
}

// Session data accumulated across screens
interface EveningSessionData {
  breathing?: EveningBreathingData;
  gratitude?: EveningGratitudeData;
  virtueReflection?: VirtueReflectionData;
  selfCompassion?: SelfCompassionData;
  tomorrow?: TomorrowData;
  sleepTransition?: SleepTransitionData;
  completedAt: Date;
}

// FEAT-134: New screen order (UX-optimized)
// Breathing first (settle), then positive priming (gratitude), then reflection
const SCREEN_ORDER = [
  'Breathing',
  'Gratitude',
  'VirtueReflection',
  'SelfCompassion',
  'Tomorrow',
  'SleepTransition',
] as const;

type EveningScreenName = (typeof SCREEN_ORDER)[number];

const EveningFlowNavigator: React.FC<EveningFlowNavigatorProps> = ({
  onComplete,
  onExit,
  recordPrincipleEngagement,
}) => {
  // Navigation for crisis button
  const rootNavigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = SCREEN_ORDER.length;

  // FEAT-23 + INFRA-135: Use shared session resumption hook
  const {
    isCheckingSession,
    showResumeModal,
    resumableSession,
    initialNavigationState,
    shouldResetNav,
    hasResetNav,
    screenData,
    handleResumeSession,
    handleBeginFresh,
    updateScreenData,
    clearResetNav,
  } = useFlowSessionResumption<EveningScreenName>({
    flowType: 'evening',
    screenOrder: SCREEN_ORDER,
    logPrefix: '[EveningFlow]',
  });

  // Custom header with flow name + progress (screen titles are in cards)
  const getHeaderOptions = () => ({
    headerTitle: () => (
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Evening Reflection</Text>
        <FlowProgressIndicator
          currentStep={currentStep}
          totalSteps={totalSteps}
          flowType="evening"
        />
      </View>
    ),
    headerTitleAlign: 'center' as const,
    headerLeft: () => (
      <Pressable
        onPress={onExit}
        style={styles.closeButton}
        accessibilityLabel="Close evening flow"
        accessibilityRole="button"
        accessibilityHint="Returns to home screen"
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </Pressable>
    ),
  });

  // Build completion summary from accumulated data
  const buildCompletionSummary = useCallback((): EveningCompletionSummary => {
    const gratitudeData = screenData['Gratitude'] as EveningGratitudeData | undefined;
    const virtueData = screenData['VirtueReflection'] as VirtueReflectionData | undefined;
    const compassionData = screenData['SelfCompassion'] as SelfCompassionData | undefined;
    const tomorrowData = screenData['Tomorrow'] as TomorrowData | undefined;

    return {
      gratitudeCount: gratitudeData?.items?.length || 0,
      principleReflected: virtueData?.principleReflected,
      selfCompassionCompleted: !!compassionData?.reflection,
      tomorrowIntentionSet: !!tomorrowData?.intention?.trim(),
    };
  }, [screenData]);

  // Screen wrappers with data persistence
  const BreathingScreenWrapper = ({ navigation, route }: any) => {
    // Merge existing screenData with route.params.initialData for back navigation
    const existingData = screenData['Breathing'] || route.params?.initialData;
    const enhancedRoute = existingData
      ? { ...route, params: { ...route.params, initialData: existingData } }
      : route;

    return (
      <BreathingScreen
        navigation={navigation}
        route={enhancedRoute}
        onSave={(data: EveningBreathingData) => {
          updateScreenData('Breathing', data, 'Gratitude');
        }}
      />
    );
  };

  const GratitudeScreenWrapper = ({ navigation, route }: any) => (
    <GratitudeScreen
      navigation={navigation}
      route={route}
      onSave={(data: EveningGratitudeData) => {
        updateScreenData('Gratitude', data, 'VirtueReflection');
      }}
    />
  );

  const VirtueReflectionScreenWrapper = ({ navigation, route }: any) => (
    <VirtueReflectionScreen
      navigation={navigation}
      route={route}
      onSave={(data: VirtueReflectionData) => {
        updateScreenData('VirtueReflection', data, 'SelfCompassion');

        // FEAT-134: Record principle engagement for Insights dashboard
        if (data.principleReflected && recordPrincipleEngagement) {
          try {
            recordPrincipleEngagement(data.principleReflected, 'evening', 'reflected');
            logger.info(LogCategory.ANALYTICS, 'principle_engagement_recorded', {
              context: 'evening',
              type: 'reflected',
            });
          } catch (error) {
            logger.error(LogCategory.ANALYTICS, 'principle_engagement_failed', {
              error: String(error),
            });
          }
        }
      }}
    />
  );

  const SelfCompassionScreenWrapper = ({ navigation, route }: any) => (
    <SelfCompassionScreen
      navigation={navigation}
      route={route}
      onSave={(data: SelfCompassionData) => {
        updateScreenData('SelfCompassion', data, 'Tomorrow');
      }}
    />
  );

  const TomorrowScreenWrapper = ({ navigation, route }: any) => (
    <TomorrowScreen
      navigation={navigation}
      route={route}
      onSave={(data: TomorrowData) => {
        updateScreenData('Tomorrow', data, 'SleepTransition');

        // Pass summary to SleepTransition when navigating
        navigation.navigate('SleepTransition', {
          summary: buildCompletionSummary(),
        });
      }}
    />
  );

  const SleepTransitionScreenWrapper = ({ navigation, route }: any) => {
    // Ensure we have the summary (may come from Tomorrow or resumption)
    const summary = route.params?.summary || buildCompletionSummary();

    return (
      <SleepTransitionScreen
        navigation={navigation}
        route={{ ...route, params: { ...route.params, summary } }}
        onComplete={(data: SleepTransitionData) => {
          updateScreenData('SleepTransition', data);

          // Clear session on completion
          SessionStorageService.clearSession('evening').catch((error) =>
            console.error('[EveningFlow] Failed to clear session:', error)
          );

          // Build final session data and complete
          const finalSessionData: EveningSessionData = {
            breathing: screenData['Breathing'],
            gratitude: screenData['Gratitude'],
            virtueReflection: screenData['VirtueReflection'],
            selfCompassion: screenData['SelfCompassion'],
            tomorrow: screenData['Tomorrow'],
            sleepTransition: data,
            completedAt: new Date(),
          };

          onComplete(finalSessionData);
        }}
      />
    );
  };

  // Don't render until session check complete
  if (isCheckingSession) {
    return null;
  }

  // Show resume modal before rendering navigator
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
        initialRouteName="Breathing"
        screenOptions={{
          headerStyle: {
            // Light background matching morning/midday pattern
            backgroundColor: colorSystem.themes.evening.background,
            // Colored accent bar at bottom (matches midday pattern)
            borderBottomColor: colorSystem.themes.evening.primary,
            borderBottomWidth: 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 4,
            height: 100, // Increased height for progress indicator
          },
          headerTintColor: colorSystem.base.black, // Dark text on light header
          cardStyle: {
            backgroundColor: colorSystem.base.white, // White content area (matches morning/midday)
          },
          gestureEnabled: true,
        }}
        screenListeners={({ navigation }) => ({
          state: (e) => {
            // FEAT-23: Trigger imperative reset if needed
            if (shouldResetNav && !hasResetNav.current && initialNavigationState) {
              hasResetNav.current = true;
              navigation.reset(initialNavigationState);
              clearResetNav();
              return;
            }

            // Update progress based on current screen
            const state = e.data.state;
            if (state) {
              const currentRouteName = state.routes[state.index]?.name;
              const stepIndex = SCREEN_ORDER.indexOf(currentRouteName as EveningScreenName);
              if (stepIndex !== -1) {
                setCurrentStep(stepIndex + 1);
              }

              // FEAT-23: Session saving is handled by updateScreenData in screen wrappers
            }
          },
        })}
      >
        <Stack.Screen
          name="Breathing"
          component={BreathingScreenWrapper}
          options={getHeaderOptions()}
        />

        <Stack.Screen
          name="Gratitude"
          component={GratitudeScreenWrapper}
          options={getHeaderOptions()}
        />

        <Stack.Screen
          name="VirtueReflection"
          component={VirtueReflectionScreenWrapper}
          options={getHeaderOptions()}
        />

        <Stack.Screen
          name="SelfCompassion"
          component={SelfCompassionScreenWrapper}
          options={getHeaderOptions()}
        />

        <Stack.Screen
          name="Tomorrow"
          component={TomorrowScreenWrapper}
          options={getHeaderOptions()}
        />

        <Stack.Screen
          name="SleepTransition"
          component={SleepTransitionScreenWrapper}
          options={getHeaderOptions()}
        />
      </Stack.Navigator>

      {/* Crisis Button - Single instance for entire flow */}
      <CollapsibleCrisisButton
        mode="immersive"
        onNavigate={() => rootNavigation.navigate('CrisisResources')}
        testID="crisis-evening-flow"
      />
    </>
  );
};

const styles = StyleSheet.create({
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
    fontWeight: typography.fontWeight.light,
  },
});

export default EveningFlowNavigator;
