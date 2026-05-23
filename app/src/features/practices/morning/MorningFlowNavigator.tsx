/**
 * Morning Flow Navigator - FEAT-139 UX Refactor
 *
 * Handles navigation for Stoic Mindfulness morning practice with progress tracking.
 * Refactored from 6 screens to 4 screens for improved UX (~70% projected completion rate).
 *
 * FEAT-139: Morning Check-in UX Refactor
 * - 4 screens (down from 6): Grounded Presence → Gratitude+Intention → Principle Focus → Relational Close
 * - Physical grounding FIRST (Aware Presence principle)
 * - All 5 Stoic Mindfulness principles now represented
 * - Reduced required inputs from 7+ to 2-3
 * - 3-5 minute completion time (down from 5-10 min)
 *
 * FEAT-23: Session resumption preserved
 * - Supports resuming interrupted sessions (24hr TTL)
 * - Automatic session saving on screen navigation
 *
 * Classical Stoic Foundation:
 * - Marcus Aurelius: Daily morning preparation (Meditations 2:1)
 * - Epictetus: Begin the day with right principles (Enchiridion 21)
 * - Seneca: "Begin at once to live" (Letters 101)
 *
 * @see ~/dtemp/morning-checkin-ux-refactor-design.md
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { colorSystem, spacing, typography } from '@/core/theme';
import { MorningFlowParamList } from '@/features/practices/types/flows';
import { ResumeSessionModal, FlowProgressIndicator } from '../shared/components';
import { useFlowSessionResumption } from '../shared/hooks';
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';

// Import new FEAT-139 screens
import GroundedPresenceScreen from './screens/GroundedPresenceScreen';
import GratitudeIntentionScreen from './screens/GratitudeIntentionScreen';
import PrincipleFocusScreen from './screens/PrincipleFocusScreen';
import RelationalCloseScreen from './screens/RelationalCloseScreen';
import MorningCompletionScreen from './screens/MorningCompletionScreen';

const Stack = createStackNavigator<MorningFlowParamList>();

interface MorningFlowNavigatorProps {
  onComplete: (sessionData: any) => void;
  onExit: () => void;
}

// FEAT-139: New 4-screen order (+ completion)
const SCREEN_ORDER = [
  'GroundedPresence',    // Screen 1: Physical grounding FIRST (Aware Presence)
  'GratitudeIntention',  // Screen 2: Combined gratitude + intention
  'PrincipleFocus',      // Screen 3: Principle selection
  'RelationalClose',     // Screen 4: Interconnected Living (NEW)
  'MorningCompletion',   // Completion card
] as const;

type MorningScreenName = (typeof SCREEN_ORDER)[number];

const MorningFlowNavigator: React.FC<MorningFlowNavigatorProps> = ({
  onComplete,
  onExit,
}) => {
  // Navigation for crisis button
  const rootNavigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = SCREEN_ORDER.length - 1; // Exclude MorningCompletion from count (4 steps)

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
  } = useFlowSessionResumption<MorningScreenName>({
    flowType: 'morning',
    screenOrder: SCREEN_ORDER,
    logPrefix: '[MorningFlow]',
  });

  // Screen wrappers with data persistence

  // Screen 1: Grounded Presence (Aware Presence principle)
  const GroundedPresenceWrapper = ({ navigation, route }: any) => (
    <GroundedPresenceScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        updateScreenData('GroundedPresence', data, 'GratitudeIntention');
      }}
    />
  );

  // Screen 2: Gratitude + Intention (combined)
  const GratitudeIntentionWrapper = ({ navigation, route }: any) => (
    <GratitudeIntentionScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        updateScreenData('GratitudeIntention', data, 'PrincipleFocus');
      }}
    />
  );

  // Screen 3: Principle Focus
  const PrincipleFocusWrapper = ({ navigation, route }: any) => (
    <PrincipleFocusScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        updateScreenData('PrincipleFocus', data, 'RelationalClose');
      }}
    />
  );

  // Screen 4: Relational Close (NEW - Interconnected Living)
  const RelationalCloseWrapper = ({ navigation, route }: any) => (
    <RelationalCloseScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        updateScreenData('RelationalClose', data, 'MorningCompletion');
      }}
    />
  );

  // Custom header with flow name + progress indicator
  const getHeaderOptions = () => ({
    headerTitle: () => (
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Morning Check-in</Text>
        <FlowProgressIndicator
          currentStep={currentStep}
          totalSteps={totalSteps}
          flowType="morning"
        />
      </View>
    ),
    headerTitleAlign: 'center' as const,
    headerLeft: () => (
      <TouchableOpacity
        onPress={onExit}
        style={styles.closeButton}
        accessibilityLabel="Close morning check-in"
        accessibilityRole="button"
        accessibilityHint="Returns to home screen"
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>
    ),
  });

  // Loading state while checking for resumable session
  if (isCheckingSession) {
    return null;
  }

  // Show resume modal if there's a resumable session
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
        initialRouteName="GroundedPresence"
        screenOptions={{
          headerStyle: {
            backgroundColor: colorSystem.themes.morning.background,
            borderBottomColor: colorSystem.themes.morning.primary,
            borderBottomWidth: 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 4,
            height: 100,
          },
          headerTintColor: colorSystem.base.black,
          cardStyle: {
            backgroundColor: colorSystem.themes.morning.background,
          },
          gestureEnabled: true,
        }}
        screenListeners={({ navigation }) => ({
          state: (e) => {
            // FEAT-23: Trigger imperative reset if needed (on first mount after resume)
            if (shouldResetNav && !hasResetNav.current && initialNavigationState) {
              hasResetNav.current = true;
              console.log('[MorningFlow] Triggering imperative reset with state:', initialNavigationState);
              navigation.reset(initialNavigationState);
              clearResetNav();
              console.log('[MorningFlow] Imperative reset complete');
              return;
            }

            // Update progress based on current screen
            const state = e.data.state;
            if (state) {
              const currentRouteName = state.routes[state.index]?.name;
              const stepIndex = SCREEN_ORDER.indexOf(currentRouteName as MorningScreenName);
              if (stepIndex !== -1) {
                setCurrentStep(stepIndex + 1);
              }
            }
          },
        })}
      >
        {/* Screen 1: Grounded Presence */}
        <Stack.Screen
          name="GroundedPresence"
          component={GroundedPresenceWrapper}
          options={getHeaderOptions()}
        />

        {/* Screen 2: Gratitude + Intention */}
        <Stack.Screen
          name="GratitudeIntention"
          component={GratitudeIntentionWrapper}
          options={getHeaderOptions()}
        />

        {/* Screen 3: Principle Focus */}
        <Stack.Screen
          name="PrincipleFocus"
          component={PrincipleFocusWrapper}
          options={getHeaderOptions()}
        />

        {/* Screen 4: Relational Close (NEW) */}
        <Stack.Screen
          name="RelationalClose"
          component={RelationalCloseWrapper}
          options={getHeaderOptions()}
        />

        {/* Completion Screen */}
        <Stack.Screen
          name="MorningCompletion"
          options={{ headerShown: false }}
        >
          {(props) => (
            <MorningCompletionScreen
              {...props}
              route={{
                ...props.route,
                params: {
                  flowData: {
                    // FEAT-139: Map new screen data structure
                    groundedPresence: screenData['GroundedPresence'],
                    gratitudeIntention: screenData['GratitudeIntention'],
                    principleFocus: screenData['PrincipleFocus'],
                    relationalClose: screenData['RelationalClose'],
                  },
                  startTime: new Date().toISOString(),
                } as any,
              }}
              onSave={onComplete}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>

      {/* Crisis Button - Always accessible, maintains fade state */}
      <CollapsibleCrisisButton
        mode="immersive"
        onNavigate={() => rootNavigation.navigate('CrisisResources')}
        testID="crisis-morning-flow"
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

export default MorningFlowNavigator;
