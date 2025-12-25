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
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme';
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
import { SessionMetadata } from '@/core/types/session';
import { ResumeSessionModal } from '../shared/components/ResumeSessionModal';
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

// Progress indicator component (matches morning/midday flows)
const ProgressIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({
  currentStep,
  totalSteps
}) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <View style={headerStyles.progressContainer}>
      <View style={headerStyles.progressBar}>
        <View
          style={[
            headerStyles.progressFill,
            {
              width: `${progress}%`,
              backgroundColor: colorSystem.themes.evening.primary
            }
          ]}
        />
      </View>
      <Text style={headerStyles.progressText}>
        {currentStep} of {totalSteps}
      </Text>
    </View>
  );
};

// FEAT-134: New screen order (UX-optimized)
// Breathing first (settle), then positive priming (gratitude), then reflection
const SCREEN_ORDER: (keyof EveningFlowParamList)[] = [
  'Breathing',
  'Gratitude',
  'VirtueReflection',
  'SelfCompassion',
  'Tomorrow',
  'SleepTransition',
];

// Screen titles for header
const SCREEN_TITLES: Record<keyof EveningFlowParamList, string> = {
  Breathing: 'Evening Practice',
  Gratitude: 'Evening Gratitude',
  VirtueReflection: 'Reflection',
  SelfCompassion: 'Self-Compassion',
  Tomorrow: "Tomorrow's Intention",
  SleepTransition: 'Evening Complete',
};

const EveningFlowNavigator: React.FC<EveningFlowNavigatorProps> = ({
  onComplete,
  onExit,
  recordPrincipleEngagement,
}) => {
  // Navigation for crisis button
  const rootNavigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = SCREEN_ORDER.length;

  // FEAT-23: Accumulated screen data for session persistence
  const [screenData, setScreenData] = useState<Record<string, any>>({});
  const loadedScreenData = useRef<Record<string, any>>({});

  // FEAT-23: Session resumption state
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumableSession, setResumableSession] = useState<SessionMetadata | null>(null);
  const [initialNavigationState, setInitialNavigationState] = useState<any>(undefined);
  const [shouldResetNav, setShouldResetNav] = useState(false);
  const hasCheckedSession = useRef(false);
  const lastSavedStep = useRef(0);
  const hasResetNav = useRef(false);

  // FEAT-23: Check for resumable session on mount
  useEffect(() => {
    const checkForResumableSession = async () => {
      if (hasCheckedSession.current) return;
      hasCheckedSession.current = true;

      try {
        const fullSession = await SessionStorageService.loadSession('evening');
        if (fullSession) {
          const { flowState, ...metadata } = fullSession;

          // Don't show resume modal if we're at the first screen
          if (metadata.currentScreen === SCREEN_ORDER[0]) {
            console.log('[EveningFlow] Session at first screen, clearing and starting fresh');
            await SessionStorageService.clearSession('evening');
            setIsCheckingSession(false);
            return;
          }

          setResumableSession(metadata);
          setShowResumeModal(true);

          // Restore screen data if available
          if (flowState?.['screenData']) {
            loadedScreenData.current = flowState['screenData'];
            setScreenData(flowState['screenData']);
            console.log(`[EveningFlow] Restored screen data for ${Object.keys(flowState['screenData']).length} screens`);
          }
        }
      } catch (error) {
        console.error('[EveningFlow] Failed to check for resumable session:', error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkForResumableSession();
  }, []);

  // FEAT-23: Handle resume session
  const handleResumeSession = () => {
    if (!resumableSession) return;

    try {
      const screenName = resumableSession.currentScreen as keyof EveningFlowParamList;
      const screenIndex = SCREEN_ORDER.indexOf(screenName);

      if (screenIndex === -1) {
        console.error(`[EveningFlow] Invalid screen name: ${screenName}`);
        return;
      }

      const routes = SCREEN_ORDER.slice(0, screenIndex + 1).map((name, idx) => ({
        key: `${name}-${idx}`,
        name,
        params: {
          initialData: loadedScreenData.current[name],
        },
      }));

      const navState = {
        index: screenIndex,
        routes,
      };

      lastSavedStep.current = screenIndex;
      setInitialNavigationState(navState);
      setShowResumeModal(false);
      setShouldResetNav(true);

      console.log(`[EveningFlow] Resumed at ${screenName} (index ${screenIndex})`);
    } catch (error) {
      console.error('[EveningFlow] Failed to resume session:', error);
    }
  };

  // FEAT-23: Handle begin fresh
  const handleBeginFresh = async () => {
    try {
      await SessionStorageService.clearSession('evening');
      setInitialNavigationState(undefined);
      setShowResumeModal(false);
      setResumableSession(null);
      lastSavedStep.current = 0;
      hasResetNav.current = false;
      console.log('[EveningFlow] Starting fresh evening session');
    } catch (error) {
      console.error('[EveningFlow] Failed to clear session:', error);
    }
  };

  // Custom header with progress (matches morning/midday pattern)
  // X close button on left in header, Back link rendered in screen content
  const getHeaderOptions = (routeName: keyof EveningFlowParamList) => ({
    headerTitle: () => (
      <View style={headerStyles.headerContainer}>
        <Text style={headerStyles.headerTitle}>{SCREEN_TITLES[routeName]}</Text>
        <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />
      </View>
    ),
    headerTitleAlign: 'center' as const,
    headerLeft: () => (
      <Pressable
        onPress={onExit}
        style={headerStyles.closeButton}
        accessibilityLabel="Close evening flow"
        accessibilityRole="button"
        accessibilityHint="Returns to home screen"
      >
        <Text style={headerStyles.closeButtonText}>✕</Text>
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
      tomorrowIntentionSet: !!(tomorrowData?.intention?.trim()),
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
        const newScreenData = { ...screenData, Breathing: data };
        setScreenData(newScreenData);

        const nextScreen = 'Gratitude';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('evening', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[EveningFlow] Failed to save from Breathing:', error));
        }
      }}
      />
    );
  };

  const GratitudeScreenWrapper = ({ navigation, route }: any) => (
    <GratitudeScreen
      navigation={navigation}
      route={route}
      onSave={(data: EveningGratitudeData) => {
        const newScreenData = { ...screenData, Gratitude: data };
        setScreenData(newScreenData);

        const nextScreen = 'VirtueReflection';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('evening', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[EveningFlow] Failed to save from Gratitude:', error));
        }
      }}
    />
  );

  const VirtueReflectionScreenWrapper = ({ navigation, route }: any) => (
    <VirtueReflectionScreen
      navigation={navigation}
      route={route}
      onSave={(data: VirtueReflectionData) => {
        const newScreenData = { ...screenData, VirtueReflection: data };
        setScreenData(newScreenData);

        // FEAT-134: Record principle engagement for Insights dashboard
        if (data.principleReflected && recordPrincipleEngagement) {
          try {
            recordPrincipleEngagement(data.principleReflected, 'evening', 'reflected');
            logger.info(LogCategory.ANALYTICS, 'principle_engagement_recorded', {
              context: 'evening',
              type: 'reflected',
            });
          } catch (error) {
            logger.error(LogCategory.ANALYTICS, 'principle_engagement_failed', { error: String(error) });
          }
        }

        const nextScreen = 'SelfCompassion';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('evening', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[EveningFlow] Failed to save from VirtueReflection:', error));
        }
      }}
    />
  );

  const SelfCompassionScreenWrapper = ({ navigation, route }: any) => (
    <SelfCompassionScreen
      navigation={navigation}
      route={route}
      onSave={(data: SelfCompassionData) => {
        const newScreenData = { ...screenData, SelfCompassion: data };
        setScreenData(newScreenData);

        const nextScreen = 'Tomorrow';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('evening', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[EveningFlow] Failed to save from SelfCompassion:', error));
        }
      }}
    />
  );

  const TomorrowScreenWrapper = ({ navigation, route }: any) => (
    <TomorrowScreen
      navigation={navigation}
      route={route}
      onSave={(data: TomorrowData) => {
        const newScreenData = { ...screenData, Tomorrow: data };
        setScreenData(newScreenData);

        const nextScreen = 'SleepTransition';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('evening', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[EveningFlow] Failed to save from Tomorrow:', error));
        }

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
          const newScreenData = { ...screenData, SleepTransition: data };
          setScreenData(newScreenData);

          // Clear session on completion
          SessionStorageService.clearSession('evening')
            .catch(error => console.error('[EveningFlow] Failed to clear session:', error));

          // Build final session data and complete
          const sessionData: EveningSessionData = {
            breathing: screenData['Breathing'],
            gratitude: screenData['Gratitude'],
            virtueReflection: screenData['VirtueReflection'],
            selfCompassion: screenData['SelfCompassion'],
            tomorrow: screenData['Tomorrow'],
            sleepTransition: data,
            completedAt: new Date(),
          };

          onComplete(sessionData);
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
          presentation: 'modal',
          gestureEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              transform: [
                {
                  translateY: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.height, 0],
                  }),
                },
              ],
            },
          }),
        }}
        screenListeners={({ navigation }) => ({
          state: (e) => {
            // FEAT-23: Trigger imperative reset if needed
            if (shouldResetNav && !hasResetNav.current && initialNavigationState) {
              hasResetNav.current = true;
              navigation.reset(initialNavigationState);
              setShouldResetNav(false);
              return;
            }

            // Update progress based on current screen
            const state = e.data.state;
            if (state) {
              const currentRouteName = state.routes[state.index]?.name;
              const stepIndex = SCREEN_ORDER.indexOf(currentRouteName as keyof EveningFlowParamList);
              if (stepIndex !== -1) {
                setCurrentStep(stepIndex + 1);
              }

              // FEAT-23: Save session progress on forward navigation
              if (currentRouteName && stepIndex >= lastSavedStep.current) {
                lastSavedStep.current = stepIndex;
                SessionStorageService.saveSession('evening', currentRouteName as string, {
                  screenData,
                }).catch(error => {
                  console.error('[EveningFlow] Failed to save session:', error);
                });
              }
            }
          },
        })}
      >
        <Stack.Screen
          name="Breathing"
          component={BreathingScreenWrapper}
          options={getHeaderOptions('Breathing')}
        />

        <Stack.Screen
          name="Gratitude"
          component={GratitudeScreenWrapper}
          options={getHeaderOptions('Gratitude')}
        />

        <Stack.Screen
          name="VirtueReflection"
          component={VirtueReflectionScreenWrapper}
          options={getHeaderOptions('VirtueReflection')}
        />

        <Stack.Screen
          name="SelfCompassion"
          component={SelfCompassionScreenWrapper}
          options={getHeaderOptions('SelfCompassion')}
        />

        <Stack.Screen
          name="Tomorrow"
          component={TomorrowScreenWrapper}
          options={getHeaderOptions('Tomorrow')}
        />

        <Stack.Screen
          name="SleepTransition"
          component={SleepTransitionScreenWrapper}
          options={getHeaderOptions('SleepTransition')}
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

const headerStyles = StyleSheet.create({
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
  progressContainer: {
    alignItems: 'center',
    width: '100%',
  },
  progressBar: {
    width: 120,
    height: spacing[4],
    backgroundColor: colorSystem.gray[200],
    borderRadius: borderRadius.xs,
    marginBottom: spacing[4],
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.xs,
    backgroundColor: colorSystem.themes.evening.primary,
  },
  progressText: {
    fontSize: typography.micro.size,
    color: colorSystem.gray[600],
    fontWeight: typography.fontWeight.medium,
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
