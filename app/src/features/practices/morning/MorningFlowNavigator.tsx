/**
 * Morning Flow Navigator (Stoic Mindfulness - FEAT-45)
 * Handles navigation for Stoic morning practice with progress tracking
 * Standard stack navigation with philosophical UX
 *
 * FEAT-23: Session resumption with philosopher-validated Stoic language
 * - Supports resuming interrupted sessions (24hr TTL)
 * - Automatic session saving on screen navigation
 * - Sphere Sovereignty: Both resume and fresh start equally virtuous
 *
 * INFRA-135: Uses shared FlowProgressIndicator and useFlowSessionResumption hook
 *
 * Classical Stoic Foundation:
 * - Marcus Aurelius: Daily morning preparation (Meditations 2:1)
 * - Epictetus: Begin the day with right principles (Enchiridion 21)
 * - Seneca: "Begin at once to live" (Letters 101)
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
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

// Import Stoic Mindfulness screens (DRD v2.0.0)
import GratitudeScreen from './screens/GratitudeScreen';
import IntentionScreen from './screens/IntentionScreen';
import ProtectedPreparationScreen from './screens/ProtectedPreparationScreen';
import PrincipleFocusScreen from './screens/PrincipleFocusScreen';
import PhysicalGroundingScreen from './screens/PhysicalGroundingScreen';
import MorningCompletionScreen from './screens/MorningCompletionScreen';

const Stack = createStackNavigator<MorningFlowParamList>();

interface MorningFlowNavigatorProps {
  onComplete: (sessionData: any) => void;
  onExit: () => void;
}

// Screen order mapping for progress calculation (Stoic Mindfulness Flow - DRD v2.0.0)
const SCREEN_ORDER = [
  'Gratitude',
  'Intention',
  'Preparation',
  'PrincipleFocus',
  'PhysicalGrounding',
  'MorningCompletion',
] as const;

type MorningScreenName = (typeof SCREEN_ORDER)[number];

const MorningFlowNavigator: React.FC<MorningFlowNavigatorProps> = ({
  onComplete,
  onExit,
}) => {
  // Navigation for crisis button
  const rootNavigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = SCREEN_ORDER.length - 1; // Exclude MorningCompletion from count

  // FEAT-23 + INFRA-135: Use shared session resumption hook
  const {
    isCheckingSession,
    showResumeModal,
    resumableSession,
    initialNavigationState,
    shouldResetNav,
    lastSavedStep,
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
  const GratitudeScreenWrapper = ({ navigation, route }: any) => (
    <GratitudeScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        updateScreenData('Gratitude', data, 'Intention');
      }}
    />
  );

  const IntentionScreenWrapper = ({ navigation, route }: any) => (
    <IntentionScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        updateScreenData('Intention', data, 'Preparation');
      }}
    />
  );

  const PreparationScreenWrapper = ({ navigation, route }: any) => (
    <ProtectedPreparationScreen
      {...({ navigation, route } as any)}
      onSave={(data: any) => {
        updateScreenData('Preparation', data, 'PrincipleFocus');
      }}
    />
  );

  const PrincipleFocusScreenWrapper = ({ navigation, route }: any) => (
    <PrincipleFocusScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        updateScreenData('PrincipleFocus', data, 'PhysicalGrounding');
      }}
    />
  );

  const PhysicalGroundingScreenWrapper = ({ navigation, route }: any) => (
    <PhysicalGroundingScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        updateScreenData('PhysicalGrounding', data, 'MorningCompletion');
      }}
    />
  );

  // Custom header with flow name + progress (screen titles are in cards)
  const getHeaderOptions = () => ({
    headerTitle: () => (
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Morning Awareness</Text>
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
        accessibilityLabel="Close morning flow"
        accessibilityRole="button"
        accessibilityHint="Returns to home screen"
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>
    ),
  });

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
        initialRouteName="Gratitude"
        screenOptions={{
          headerStyle: {
            backgroundColor: colorSystem.themes.morning.background,
            // Colored accent bar at bottom (matches midday/evening pattern)
            borderBottomColor: colorSystem.themes.morning.primary,
            borderBottomWidth: 1,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 1,
            },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 4,
            height: 100, // Increased height for progress indicator
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

              // Reset navigation state
              navigation.reset(initialNavigationState);
              clearResetNav();
              console.log('[MorningFlow] Imperative reset complete');
              return; // Don't process state update this cycle
            }

            // Update progress based on current screen
            const state = e.data.state;
            if (state) {
              const currentRouteName = state.routes[state.index]?.name;
              const stepIndex = SCREEN_ORDER.indexOf(currentRouteName as MorningScreenName);
              if (stepIndex !== -1) {
                setCurrentStep(stepIndex + 1);
              }

              // FEAT-23: Session saving is handled by updateScreenData in screen wrappers
              // The screenListeners state change is only used for progress updates and reset handling
            }
          },
        })}
      >
        <Stack.Screen
          name="Gratitude"
          component={GratitudeScreenWrapper}
          options={getHeaderOptions()}
        />

        <Stack.Screen
          name="Intention"
          component={IntentionScreenWrapper}
          options={getHeaderOptions()}
        />

        <Stack.Screen
          name="Preparation"
          component={PreparationScreenWrapper}
          options={getHeaderOptions()}
        />

        <Stack.Screen
          name="PrincipleFocus"
          component={PrincipleFocusScreenWrapper}
          options={getHeaderOptions()}
        />

        <Stack.Screen
          name="PhysicalGrounding"
          component={PhysicalGroundingScreenWrapper}
          options={getHeaderOptions()}
        />

        <Stack.Screen
          name="MorningCompletion"
          options={{ headerShown: false }}
        >
          {(props) => (
            <MorningCompletionScreen
              {...props}
              route={{
                ...props.route,
                // Cast params to any - MorningCompletionScreen extracts via (route.params as any)
                // Transform screenData keys from PascalCase to camelCase to match StoicMorningFlowData
                params: {
                  flowData: {
                    gratitude: screenData['Gratitude'],
                    intention: screenData['Intention'],
                    preparation: screenData['Preparation'],
                    principleFocus: screenData['PrincipleFocus'],
                    physicalGrounding: screenData['PhysicalGrounding'],
                  },
                  startTime: new Date().toISOString(),
                } as any,
              }}
              onSave={onComplete}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>

      {/* Crisis Button - Single instance for entire flow, maintains fade state */}
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
