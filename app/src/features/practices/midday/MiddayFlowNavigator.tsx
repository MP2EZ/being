/**
 * MiddayFlowNavigator - Stoic Mindfulness Midday Reset (MAINT-65)
 *
 * MAINT-65: Refactored 4-Screen Flow (Philosopher-validated 8.5/10)
 *
 * NEW FLOW ORDER (aligned with 5 Stoic Mindfulness Principles):
 * 1. Pause & Acknowledge → Aware Presence (30s micro-breath + situation)
 * 2. Reality Check → Radical Acceptance + Sphere Sovereignty
 * 3. Virtue Response → Virtuous Response (principle picker)
 * 4. Compassionate Close → Interconnected Living (completion)
 *
 * KEY CHANGES FROM v1:
 * - Reduced from 5 screens to 4 (removed standalone Embodiment)
 * - 30s micro-breath integrated into Screen 1 (was 60s standalone)
 * - Principle picker now required (feeds Insights dashboard)
 * - Previous answer cards for contextual continuity
 * - Duration: 3-5 minutes (down from 3-7 minutes)
 *
 * NON-NEGOTIABLES:
 * - Crisis-accessible (<3s from any screen)
 * - Self-compassion field on closing screen
 * - Principle selection feeds Insights dashboard
 *
 * FEAT-23: Session resumption with philosopher-validated Stoic language
 * INFRA-135: Uses shared FlowProgressIndicator and useFlowSessionResumption hook
 *
 * @see /docs/design/midday-flow-wireframes-v2.md
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React, { useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colorSystem, spacing, typography } from '@/core/theme';
import { ResumeSessionModal, FlowProgressIndicator } from '../shared/components';
import { useFlowSessionResumption } from '../shared/hooks';
import PauseAcknowledgeScreen from './screens/PauseAcknowledgeScreen';
import RealityCheckScreen from './screens/RealityCheckScreen';
import VirtueResponseScreen from './screens/VirtueResponseScreen';
import CompassionateCloseScreen from './screens/CompassionateCloseScreen';
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import type { MiddayFlowParamList, StoicMiddayFlowData } from '@/features/practices/types/flows';

interface MiddayFlowNavigatorProps {
  onComplete: (sessionData: StoicMiddayFlowData) => void;
  onExit: () => void;
}

const Stack = createStackNavigator<MiddayFlowParamList>();

// Screen order mapping for progress calculation (MAINT-65: 4 screens)
const SCREEN_ORDER = [
  'PauseAcknowledge',
  'RealityCheck',
  'VirtueResponse',
  'CompassionateClose',
] as const;

type MiddayScreenName = (typeof SCREEN_ORDER)[number];

const MiddayFlowNavigator: React.FC<MiddayFlowNavigatorProps> = ({
  onComplete,
  onExit,
}) => {
  // Navigation for crisis button
  const rootNavigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [sessionData, setSessionData] = useState<Partial<StoicMiddayFlowData>>({});
  const [startTime] = useState(() => Date.now());

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = SCREEN_ORDER.length; // 4 steps

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
  const PauseAcknowledgeScreenWrapper = ({ navigation, route }: any) => (
    <PauseAcknowledgeScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        updateScreenData('PauseAcknowledge', data, 'RealityCheck');
        setSessionData((prev) => ({ ...prev, pauseAcknowledge: data }));
        console.log('✅ PauseAcknowledge completed');
      }}
    />
  );

  const RealityCheckScreenWrapper = ({ navigation, route }: any) => (
    <RealityCheckScreen
      navigation={navigation}
      route={route}
      previousSituation={sessionData.pauseAcknowledge?.situation}
      onSave={(data) => {
        updateScreenData('RealityCheck', data, 'VirtueResponse');
        setSessionData((prev) => ({ ...prev, realityCheck: data }));
        console.log('✅ RealityCheck completed');
      }}
    />
  );

  const VirtueResponseScreenWrapper = ({ navigation, route }: any) => (
    <VirtueResponseScreen
      navigation={navigation}
      route={route}
      previousSituation={sessionData.pauseAcknowledge?.situation}
      previousWithinPower={sessionData.realityCheck?.withinPower}
      onSave={(data) => {
        updateScreenData('VirtueResponse', data, 'CompassionateClose');
        setSessionData((prev) => ({ ...prev, virtueResponse: data }));
        console.log('✅ VirtueResponse completed');
      }}
    />
  );

  const CompassionateCloseScreenWrapper = ({ navigation, route }: any) => {
    const handleComplete = (data: any) => {
      const finalSessionData: StoicMiddayFlowData = {
        ...sessionData,
        compassionateClose: data,
        completedAt: new Date(),
        timeSpentSeconds: Math.round((Date.now() - startTime) / 1000),
        flowVersion: 'stoic_midday_v2',
      };

      console.log('✅ Midday flow completed');
      onComplete(finalSessionData);
    };

    return (
      <CompassionateCloseScreen
        navigation={navigation}
        route={route}
        previousVirtuousResponse={sessionData.virtueResponse?.virtuousResponse}
        onComplete={handleComplete}
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
        initialRouteName="PauseAcknowledge"
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
          name="PauseAcknowledge"
          component={PauseAcknowledgeScreenWrapper}
          options={getHeaderOptions('PauseAcknowledge', 'Pause & Acknowledge')}
        />

        <Stack.Screen
          name="RealityCheck"
          component={RealityCheckScreenWrapper}
          options={getHeaderOptions('RealityCheck', 'Reality Check')}
        />

        <Stack.Screen
          name="VirtueResponse"
          component={VirtueResponseScreenWrapper}
          options={getHeaderOptions('VirtueResponse', 'Virtue Response')}
        />

        <Stack.Screen
          name="CompassionateClose"
          component={CompassionateCloseScreenWrapper}
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
