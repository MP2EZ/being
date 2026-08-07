/**
 * Clean Root Navigator - Fresh start navigation
 * No crypto dependencies, minimal implementation
 * Includes check-in flow modal presentations
 */

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { logPerformance, logSystem } from '@/core/services/logging';
import { whenE2ESeedComplete } from '@/core/config/e2eSeed';
import { generateTimestampedId } from '@/core/utils/id';
import { NavigationContainer } from '@react-navigation/native';
import { linkingConfig } from './linking';
import { navigationRef, getActiveRootRouteName } from './navigationRef';
import { createStackNavigator } from '@react-navigation/stack';
import { HeaderBackButton } from '@react-navigation/elements';
import { spacing, typography } from '@/core/theme';
import CleanTabNavigator from './CleanTabNavigator';
import { DailyLoopNavigator } from '@/features/practices/dailyloop';
import { VoiceReflectionScreen } from '@/features/journal/screens/VoiceReflectionScreen';
import CrisisResourcesScreen from '@/features/crisis/screens/CrisisResourcesScreen';
import RootCrisisButton from '@/features/crisis/components/RootCrisisButton';
import PurchaseOptionsScreen from '@/core/components/subscription/PurchaseOptionsScreen';
import SubscriptionStatusCard from '@/core/components/subscription/SubscriptionStatusCard';
import OnboardingScreen from '@/features/onboarding/screens/OnboardingScreen';
import EnhancedAssessmentFlow from '@/features/assessment/components/EnhancedAssessmentFlow';
import ModuleDetailScreen from '@/features/learn/screens/ModuleDetailScreen';
import WellnessTrendsDetailScreen from '@/features/insights/screens/WellnessTrendsDetailScreen';
import ClassicalLibraryScreen from '@/features/library/screens/ClassicalLibraryScreen';
import PassageReaderScreen from '@/features/library/screens/PassageReaderScreen';
import {
  PracticeTimerScreen,
  ReflectionTimerScreen,
  BodyScanScreen,
  GuidedBodyScanScreen
} from '@/features/learn/practices';
// FEAT-293: standalone practice discoverability.
import SortingPracticeRoute from '@/features/practices/catalog/SortingPracticeRoute';
import PracticeLibraryScreen from '@/features/practices/screens/PracticeLibraryScreen';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import { useSettingsStore } from '@/core/stores/settingsStore';
import { useConsentStore } from '@/core/stores/consentStore';
import { CombinedLegalGateScreen } from '@/features/consent';
import type { AssessmentType, PHQ9Result, GAD7Result } from '@/features/assessment/types';
import type { DailyLoopMode, DailyLoopDepth, DailyLoopSessionData } from '@/features/practices/types/flows';
import {
  ENGAGEMENT_TYPE_BY_MODE,
  STEP_PRINCIPLE,
  getStepKeysForDepth,
} from '@/features/practices/dailyloop/config/tenseMode';
import type {
  ModuleId,
  PracticeVisualMode,
  SortingScenario,
} from '@/features/learn/types/education';
import type { PassageAuthor } from '@/features/library/types/library';

export type RootStackParamList = {
  LegalGate: undefined;
  Onboarding: undefined;
  Main: undefined;
  // The single daily ritual (FEAT-298 slice 5: the default practice; no longer flagged).
  // `mode` is a test/tooling param only — the tense is inferred from the clock, and there
  // is no mode picker.
  DailyLoop: { mode?: DailyLoopMode; depth?: DailyLoopDepth } | undefined;
  // FEAT-283 Slice A: spoken reflection capture, reached from the
  // `voice_journal`-flag-gated Profile card.
  VoiceReflection: undefined;
  ModuleDetail: { moduleId: ModuleId };
  ClassicalLibrary: { principle?: ModuleId; author?: PassageAuthor } | undefined;
  PassageReader: { passageId: string };
  PracticeTimer: {
    practiceId: string;
    moduleId: ModuleId;
    duration: number;
    title: string;
    // DEBUG-353: optional so the deep-link path (which cannot carry authored
    // content) still type-checks; resolvePracticeRoute supplies both when the
    // practice is launched from the module JSON.
    instructions?: string[];
    visualMode?: PracticeVisualMode;
  };
  ReflectionTimer: {
    practiceId: string;
    moduleId: ModuleId;
    duration: number;
    title: string;
    prompt?: string;
    instructions?: string[];
  };
  SortingPractice: {
    practiceId: string;
    moduleId: ModuleId;
    // FEAT-293: OPTIONAL. Learn still passes the already-loaded scenarios
    // (unchanged); the standalone Practice Library omits them and the screen
    // self-loads from module content. This also repairs the pre-existing
    // `/sorting` deep link in linking.ts, which could never supply an array.
    scenarios?: SortingScenario[];
  };
  // FEAT-293: standalone practice discoverability. A listing surface, so it is
  // deliberately absent from RootCrisisButton's SUPPRESSED_ROUTES and
  // IMMERSIVE_ROUTES — it must resolve to the default `standard` crisis overlay.
  PracticeLibrary: undefined;
  BodyScan: {
    practiceId: string;
    moduleId: ModuleId;
    duration: number;
  };
  GuidedBodyScan: {
    practiceId: string;
    moduleId: ModuleId;
    title: string;
  };
  AssessmentFlow: {
    assessmentType: AssessmentType;
    context: 'onboarding' | 'standalone';
    allowSkip?: boolean;
    onComplete?: (result: PHQ9Result | GAD7Result) => void;
    onSkip?: () => void;
  };
  CrisisResources: {
    severityLevel?: 'moderate' | 'high' | 'emergency';
    source?: 'assessment' | 'direct' | 'crisis_button';
  } | undefined;
  Subscription: undefined;
  SubscriptionStatus: undefined;
  WellnessTrendsDetail: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// Loading screen component
const LoadingScreen: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#FF9F43" />
  </View>
);

const CleanRootNavigator: React.FC = () => {
  const { markCheckInComplete, recordPrincipleEngagement } = useStoicPracticeStore();
  const { loadSettings, markOnboardingComplete } = useSettingsStore();
  const { loadConsent, consentStatus } = useConsentStore();
  const [initialRoute, setInitialRoute] = useState<'LegalGate' | 'Onboarding' | 'Main' | null>(null);
  // MAINT-290: active root-stack route drives the single RootCrisisButton overlay
  // (suppression + immersive/standard mode). Tracked via NavigationContainer below.
  const [activeRootRoute, setActiveRootRoute] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function checkInitialRoute() {
      // INFRA-217: in the e2e-sim build, wait for the launch-time seed to write
      // onboarding + consent before reading state, so the FIRST resolved route is
      // already Main (initialRouteName only applies on first navigator mount).
      // Resolves immediately in every real build.
      await whenE2ESeedComplete();

      // Both reads are independent AsyncStorage gets — parallelize.
      const [settings, consent] = await Promise.all([loadSettings(), loadConsent()]);

      // Determine initial route based on onboarding and consent status
      if (settings?.onboardingCompleted) {
        // Already onboarded - go to main
        setInitialRoute('Main');
      } else if (!consent || consentStatus === 'missing' || consentStatus === 'under_age') {
        // No consent or under age - start with legal gate (COPPA compliance)
        setInitialRoute('LegalGate');
      } else {
        // Has consent but not onboarded - go to onboarding
        setInitialRoute('Onboarding');
      }
    }
    checkInitialRoute();
  }, [loadSettings, loadConsent, consentStatus]);

  // FEAT-298 slice 3: the loop is now a FIRST-CLASS check-in. It records its own 'daily'
  // type instead of borrowing 'midday' — that borrowing made loop sessions
  // indistinguishable from real Midday check-ins and faded the wrong Home card.
  //
  // Legacy records written by the FEAT-291 prototype as 'midday' COEXIST read-only: they
  // are deliberately NOT rewritten to 'daily'. Rewriting would fabricate a record of an
  // action the user did not take (they completed what the app then called a Midday
  // check-in), which is a data-accuracy violation and would corrupt an export/right-to-know
  // response. Provenance beats tidiness — see the slice-2 migration note.
  const handleDailyLoopComplete = async (sessionData: DailyLoopSessionData) => {
    const depth = sessionData.depth ?? 'deep';
    logSystem(`Daily loop completed (mode: ${sessionData.mode}, depth: ${depth})`);
    await markCheckInComplete('daily');

    // FEAT-298 slice 3: the loop recorded ZERO principle engagements, so it was invisible
    // in the Insights principle chart despite being five principles end to end.
    //
    // One engagement per beat REACHED, unconditional on whether the user typed anything:
    // "typing is capture, never a gate" (tenseMode.ts) — every field is optional by design
    // for a walking, eyes-up practice. Gating the record on text would reintroduce the gate
    // through the back door and systematically under-record the practitioner the loop was
    // shaped for. One principle, one engagement, one session — NOT one per captured field,
    // which would inflate Sphere Sovereignty (2 fields) and Virtuous Response (up to 3)
    // and manufacture a false dominance signal.
    //
    // A quick session therefore records exactly 3, never 5. Under-recording is the
    // ACCURATE reading: crediting the two omitted beats would fabricate acts the user did
    // not perform. Quick and deep remain equally complete where completeness actually
    // lives — the calendar dot — because both write one 'daily' check-in.
    const engagementType = ENGAGEMENT_TYPE_BY_MODE[sessionData.mode];
    const stepKeys = getStepKeysForDepth(depth);
    for (const stepKey of stepKeys) {
      await recordPrincipleEngagement(STEP_PRINCIPLE[stepKey], 'daily', engagementType);
    }
    logSystem(
      `Recorded ${stepKeys.length} principle engagements (daily loop, ${engagementType})`
    );
  };

  // FEAT-298 slice 6c: the "start practising now" destination is the daily loop. It was
  // 'morning' — the retired Morning flow — so leaving it would navigate to a deleted route.
  const handleOnboardingComplete = async (destination?: 'home' | 'practice') => {
    await markOnboardingComplete();
    setInitialRoute('Main');

    // Navigate to destination after state update
    if (destination === 'practice') {
      // Small delay to ensure Main screen is mounted before modal presentation
      setTimeout(() => {
        // Navigation will be handled by the OnboardingScreen's navigation prop
      }, 100);
    }
  };

  if (!initialRoute) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linkingConfig}
      onReady={() => setActiveRootRoute(getActiveRootRouteName() ?? initialRoute)}
      onStateChange={() => setActiveRootRoute(getActiveRootRouteName())}
    >
      <View style={styles.root}>
        <Stack.Navigator
          initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          headerStyle: {
            backgroundColor: '#FFFFFF',
            borderBottomColor: '#E5E7EB',
            borderBottomWidth: 1,
          },
          headerTintColor: '#000000',
          headerTitleStyle: {
            fontSize: typography.bodyLarge.size,
            fontWeight: typography.fontWeight.semibold,
          },
        }}
      >
        {/* Legal Gate (Age + ToS) - First screen for new users */}
        <Stack.Screen
          name="LegalGate"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        >
          {({ navigation }) => (
            <CombinedLegalGateScreen
              onComplete={() => {
                // Legal gate passed - proceed to onboarding
                navigation.replace('Onboarding');
              }}
              onUnderAge={() => {
                // Under age - screen handles showing crisis resources
                // User stays on LegalGate screen with crisis resources
              }}
            />
          )}
        </Stack.Screen>

        {/* Onboarding Flow */}
        <Stack.Screen
          name="Onboarding"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        >
          {({ navigation }) => (
            <OnboardingScreen
              onComplete={async (destination) => {
                await handleOnboardingComplete(destination);
                // Navigate based on destination
                if (destination === 'practice') {
                  navigation.replace('Main');
                  // Enter the daily loop once Main is mounted. No mode param — the tense is
                  // inferred from the clock (slice 5).
                  setTimeout(() => {
                    navigation.navigate('DailyLoop');
                  }, 100);
                } else {
                  navigation.replace('Main');
                }
              }}
              isEmbedded={true}
            />
          )}
        </Stack.Screen>

        {/* Main App */}
        <Stack.Screen name="Main" component={CleanTabNavigator} />

        {/* Educational Module Detail */}
        <Stack.Screen
          name="ModuleDetail"
          component={ModuleDetailScreen}
          options={{
            headerShown: false, // ModuleDetailScreen has its own header
            presentation: 'card',
          }}
        />

        {/* Wellness Trends full-history detail (FEAT-196) */}
        <Stack.Screen
          name="WellnessTrendsDetail"
          component={WellnessTrendsDetailScreen}
          options={{
            headerShown: false, // screen renders its own header + back affordance
            presentation: 'card',
          }}
        />

        {/* Classical Resources Library (FEAT-54) */}
        <Stack.Screen
          name="ClassicalLibrary"
          component={ClassicalLibraryScreen}
          options={{
            headerShown: false, // ClassicalLibraryScreen has its own header
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="PassageReader"
          component={PassageReaderScreen}
          options={{
            headerShown: false, // PassageReaderScreen has its own header
            presentation: 'card',
          }}
        />

        {/* Practice Screens - Educational Exercises */}
        <Stack.Screen
          name="PracticeTimer"
          options={{
            headerShown: false,
            presentation: 'modal',
            gestureEnabled: false, // Prevent accidental swipe during practice
          }}
        >
          {({ navigation, route }) => (
            <PracticeTimerScreen
              practiceId={route.params.practiceId}
              moduleId={route.params.moduleId}
              duration={route.params.duration}
              title={route.params.title}
              instructions={route.params.instructions}
              visualMode={route.params.visualMode}
              onComplete={() => navigation.goBack()}
              onBack={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>

        {/* FEAT-293: standalone practice discoverability. `card` presentation,
            NOT modal — it is a browsable listing surface, and it must keep the
            root crisis overlay in its default `standard` mode (hence its
            deliberate absence from RootCrisisButton's route sets). */}
        <Stack.Screen
          name="PracticeLibrary"
          options={{ headerShown: false, presentation: 'card' }}
        >
          {({ navigation }) => (
            <PracticeLibraryScreen
              onBack={() => navigation.goBack()}
              onOpenPractice={(screen, params) =>
                navigation.navigate(screen as never, params as never)
              }
              onOpenModule={(moduleId) =>
                navigation.navigate('ModuleDetail', { moduleId })
              }
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="SortingPractice"
          options={{
            headerShown: false,
            presentation: 'modal',
            gestureEnabled: false,
          }}
        >
          {({ navigation, route }) => (
            // FEAT-293: routed through the resolving wrapper so scenarios can be
            // omitted (Practice Library / deep link) and loaded on demand.
            <SortingPracticeRoute
              practiceId={route.params.practiceId}
              moduleId={route.params.moduleId}
              scenarios={route.params.scenarios}
              onComplete={() => navigation.goBack()}
              onBack={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="BodyScan"
          options={{
            headerShown: false,
            presentation: 'modal',
            gestureEnabled: false,
          }}
        >
          {({ navigation, route }) => (
            <BodyScanScreen
              practiceId={route.params.practiceId}
              moduleId={route.params.moduleId}
              duration={route.params.duration}
              onComplete={() => navigation.goBack()}
              onBack={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="ReflectionTimer"
          options={{
            headerShown: false,
            presentation: 'modal',
            gestureEnabled: false,
          }}
        >
          {({ navigation, route }) => (
            <ReflectionTimerScreen
              practiceId={route.params.practiceId}
              moduleId={route.params.moduleId}
              duration={route.params.duration}
              title={route.params.title}
              {...(route.params.prompt && { prompt: route.params.prompt })}
              {...(route.params.instructions && { instructions: route.params.instructions })}
              onComplete={() => navigation.goBack()}
              onBack={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="GuidedBodyScan"
          options={{
            headerShown: false,
            presentation: 'modal',
            gestureEnabled: false,
          }}
        >
          {({ navigation, route }) => (
            <GuidedBodyScanScreen
              practiceId={route.params.practiceId}
              moduleId={route.params.moduleId}
              title={route.params.title}
              onComplete={() => navigation.goBack()}
              onBack={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>

        {/* Check-in Flow Modals */}
        <Stack.Group screenOptions={{ presentation: 'modal' }}>



          {/* FEAT-283 Slice A: spoken reflection capture. Reached only from the
              `voice_journal`-flag-gated Profile card. Deliberately NOT added to
              RootCrisisButton IMMERSIVE_ROUTES — crisis text may be on screen
              here, so the root crisis affordance must stay reachable. */}
          <Stack.Screen
            name="VoiceReflection"
            options={{ headerShown: true, title: 'Reflections' }}
          >
            {() => <VoiceReflectionScreen />}
          </Stack.Screen>

          {/* FEAT-291: Daily Loop prototype — reached only from the Home
              Home's single Daily Practice card. One nested navigator → inherits the single
              root crisis overlay (DailyLoop is in RootCrisisButton IMMERSIVE_ROUTES). */}
          <Stack.Screen
            name="DailyLoop"
            options={{
              headerShown: false,
              gestureEnabled: false,
              animationTypeForReplace: 'push'
            }}
          >
            {({ navigation, route }) => (
              <DailyLoopNavigator
                mode={route.params?.mode}
                depth={route.params?.depth}
                onComplete={(sessionData) => {
                  handleDailyLoopComplete(sessionData);
                  navigation.goBack();
                }}
                onExit={() => navigation.goBack()}
              />
            )}
          </Stack.Screen>

          {/* Assessment Flow Modal */}
          <Stack.Screen
            name="AssessmentFlow"
            options={{
              headerShown: false, // EnhancedAssessmentFlow has its own UI
              gestureEnabled: false, // Prevent swipe to dismiss during assessment
              animationTypeForReplace: 'push'
            }}
          >
            {({ navigation, route }) => {
              // Create consent status for EnhancedAssessmentFlow
              const consentStatus = {
                dataProcessingConsent: true, // Assumed true if user reached assessment
                clinicalDataConsent: true,
                consentTimestamp: Date.now(),
                consentVersion: '1.0.0'
              };

              return (
                <EnhancedAssessmentFlow
                  assessmentType={route.params.assessmentType}
                  context={route.params.context}
                  theme="neutral"
                  showIntroduction={route.params.context === 'standalone'}
                  consentStatus={consentStatus}
                  sessionId={generateTimestampedId('session')}
                  onComplete={(result) => {
                    logSystem(`Assessment ${route.params.assessmentType} completed`);
                    // Always dismiss the modal first
                    navigation.goBack();
                    // Then notify parent after brief delay to allow modal dismissal animation
                    setTimeout(() => {
                      route.params.onComplete?.(result);
                    }, 50);
                  }}
                  onCancel={() => {
                    // Handle skip for onboarding context
                    if (route.params.allowSkip && route.params.onSkip) {
                      route.params.onSkip();
                    }
                    navigation.goBack();
                  }}
                />
              );
            }}
          </Stack.Screen>

          {/* Crisis Resources Screen */}
          <Stack.Screen
            name="CrisisResources"
            component={CrisisResourcesScreen}
            options={{
              title: 'Crisis Support',
              headerShown: true,
              headerBackTitle: 'Back',
              presentation: 'modal',
              gestureEnabled: true,
              // INFRA-185: wrap the default HeaderBackButton with a testID so
              // Maestro's `crisis-button-reachability.yaml` flow can pop the
              // modal between tab iterations. Maestro v2.6's `- back` action
              // doesn't honor modal-presentation stack screens on iOS sim,
              // and `text:` doesn't match the iOS header chevron's
              // accessibilityText. Native HeaderBackButton, just with the
              // testID prop — same visual UX as every other stack screen.
              headerLeft: (headerLeftProps) => (
                <HeaderBackButton
                  {...headerLeftProps}
                  testID="nav-back-button"
                />
              ),
            }}
          />

          {/* Subscription Screens */}
          <Stack.Screen
            name="Subscription"
            component={PurchaseOptionsScreen}
            options={{
              title: 'Subscription',
              headerShown: false, // PurchaseOptionsScreen has its own SubMenuHeader
              presentation: 'card', // Full-screen like other submenus
              gestureEnabled: true
            }}
          />

          <Stack.Screen
            name="SubscriptionStatus"
            component={SubscriptionStatusCard}
            options={{
              title: 'Subscription Status',
              headerShown: true,
              presentation: 'modal',
              gestureEnabled: true
            }}
          />
        </Stack.Group>
        </Stack.Navigator>

        {/* MAINT-290: single persistent crisis-button overlay. Sibling of the root
            Stack.Navigator (JS stack → renders above stack modals too), so 988 access
            is guaranteed on every screen/step and can't regress per-screen. Mode +
            suppression are driven by the active root-stack route. */}
        <RootCrisisButton routeName={activeRootRoute ?? initialRoute} />
      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.regular,
    color: '#1C1C1C',
  },
});

export default CleanRootNavigator;