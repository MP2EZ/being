/**
 * MiddayFlowNavigator - Stoic Mindfulness Midday Reset (MAINT-65)
 *
 * MAINT-65: Simplified 4-Screen Flow (UX + Philosopher validated 9/10)
 *
 * FLOW ORDER (action-focused, reduced cognitive load):
 * 1. Pause & Acknowledge → 30s breath + situation input
 * 2. Reality Check → Single input: "What can you control?"
 * 3. Virtue Response → Single input: "What virtuous action?"
 * 4. Compassionate Close → Optional integration note + completion
 *
 * UX SIMPLIFICATIONS (validated by philosopher):
 * - Removed 3-way acceptance selector (Screen 2)
 * - Removed principle picker + Cardinal Virtues card (Screen 3)
 * - Removed previous answer card + second input (Screen 4)
 * - Quote moved to post-completion success state
 * - Virtue demonstrated through action, not by naming
 * - Duration: 2-3 minutes (down from 3-5 minutes)
 *
 * NON-NEGOTIABLES:
 * - Crisis-accessible (<3s from any screen)
 * - Dichotomy of control embedded in helper text
 * - Previous answer cards on Screens 2-3 for continuity
 *
 * FEAT-23: Session resumption with philosopher-validated Stoic language
 * INFRA-135: Uses shared FlowProgressIndicator and useFlowSessionResumption hook
 *
 * @see /docs/design/midday-flow-wireframes-v2.md
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

  // Custom header with flow name + progress (screen titles are in cards)
  const getHeaderOptions = () => ({
    headerTitle: () => (
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Midday Reset</Text>
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
        onComplete={handleComplete}
        startTime={startTime}
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
          options={getHeaderOptions()}
        />

        <Stack.Screen
          name="RealityCheck"
          component={RealityCheckScreenWrapper}
          options={getHeaderOptions()}
        />

        <Stack.Screen
          name="VirtueResponse"
          component={VirtueResponseScreenWrapper}
          options={getHeaderOptions()}
        />

        <Stack.Screen
          name="CompassionateClose"
          component={CompassionateCloseScreenWrapper}
          options={getHeaderOptions()}
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
  // Header
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
