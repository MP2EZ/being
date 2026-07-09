/**
 * DailyLoopNavigator — FEAT-291 single-loop daily practice (build-time flag `daily_loop`).
 *
 * The Five Principles in canonical order as ONE nested flow, cloned structurally from
 * the Midday navigator. Registered as a SINGLE root-stack modal screen (`DailyLoop`) in
 * CleanRootNavigator — that is what lets it inherit MAINT-290's single root crisis
 * overlay on every step (the root route `DailyLoop` is in RootCrisisButton's
 * IMMERSIVE_ROUTES). It therefore mounts NO crisis button of its own.
 *
 * Prototype specifics:
 *  - `mode` (flat / morning / evening) is chosen from a route param or an in-flow mode
 *    picker, and drives which tense copy each step renders (tenseMode config).
 *  - Session resumption is intentionally NOT used: it is keyed by CheckInType, and this
 *    prototype themes as 'midday' (no new CheckInType), so the hook would collide with
 *    the real Midday flow's saved session. A local accumulator sidesteps that entirely.
 *  - Themed as 'midday' (no ThemeKey/FlowType/CheckInType union change).
 */
import React, { useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colorSystem, spacing, typography } from '@/core/theme';
import { FlowProgressIndicator } from '../shared/components';
import type {
  DailyLoopMode,
  DailyLoopParamList,
  DailyLoopStepData,
  DailyLoopCompleteData,
  DailyLoopSessionData,
} from '@/features/practices/types/flows';
import { DAILY_LOOP_STEP_KEYS, type DailyLoopStepKey } from './config/tenseMode';
import DailyLoopStepScreen from './screens/DailyLoopStepScreen';
import DailyLoopModeSelectScreen from './screens/DailyLoopModeSelectScreen';
import DailyLoopCompleteScreen from './screens/DailyLoopCompleteScreen';

interface DailyLoopNavigatorProps {
  mode?: DailyLoopMode | undefined;
  onComplete: (sessionData: DailyLoopSessionData) => void;
  onExit: () => void;
}

const Stack = createStackNavigator<DailyLoopParamList>();

// Route order (5 principle beats + completion). Completion is NOT a principle step.
const SCREEN_ORDER = [...DAILY_LOOP_STEP_KEYS, 'DailyLoopComplete'] as const;
type LoopRoute = (typeof SCREEN_ORDER)[number];

// stepKey → session field + the label shown when the NEXT step echoes this answer.
const STEP_FIELD: Record<DailyLoopStepKey, keyof DailyLoopSessionData> = {
  AwarePresence: 'awarePresence',
  RadicalAcceptance: 'radicalAcceptance',
  SphereSovereignty: 'sphereSovereignty',
  VirtuousResponse: 'virtuousResponse',
  InterconnectedLiving: 'interconnectedLiving',
};
const PREV_LABEL: Partial<Record<DailyLoopStepKey, string>> = {
  RadicalAcceptance: "What's present:",
  SphereSovereignty: 'What you accepted:',
  VirtuousResponse: 'Within your control:',
  InterconnectedLiving: 'Your virtuous response:',
};

const DailyLoopNavigator: React.FC<DailyLoopNavigatorProps> = ({ mode: initialMode, onComplete, onExit }) => {
  const [mode, setMode] = useState<DailyLoopMode | null>(initialMode ?? null);
  const [sessionData, setSessionData] = useState<Partial<DailyLoopSessionData>>({});
  const [startTime] = useState(() => Date.now());
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = DAILY_LOOP_STEP_KEYS.length; // 5 principle beats

  // Mode picker (only when no mode was passed as a route param).
  if (!mode) {
    return (
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <Pressable
            onPress={onExit}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close daily practice"
            accessibilityHint="Returns to home screen"
            testID="daily-loop-exit"
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>
        <DailyLoopModeSelectScreen onSelect={setMode} />
      </View>
    );
  }

  const prevResponse = (step: DailyLoopStepKey): { label: string; text: string } | undefined => {
    const label = PREV_LABEL[step];
    if (!label) return undefined;
    const order = DAILY_LOOP_STEP_KEYS;
    const idx = order.indexOf(step);
    if (idx <= 0) return undefined;
    const prevField = STEP_FIELD[order[idx - 1] as DailyLoopStepKey];
    const prev = sessionData[prevField] as DailyLoopStepData | undefined;
    return prev?.response ? { label, text: prev.response } : undefined;
  };

  const getHeaderOptions = (showProgress: boolean) => ({
    headerTitle: () => (
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Daily Practice</Text>
        {showProgress && (
          <FlowProgressIndicator currentStep={currentStep} totalSteps={totalSteps} flowType="midday" />
        )}
      </View>
    ),
    headerTitleAlign: 'center' as const,
  });

  const makeStep = (stepKey: DailyLoopStepKey, index: number) => ({ navigation }: any) => (
    <DailyLoopStepScreen
      stepKey={stepKey}
      mode={mode}
      showBreath={stepKey === 'AwarePresence'}
      showBack={index > 0}
      onBack={() => navigation.goBack()}
      previousAnswer={prevResponse(stepKey)}
      onSave={(data: DailyLoopStepData) => {
        setSessionData((prev) => ({ ...prev, [STEP_FIELD[stepKey]]: data }));
        const next = SCREEN_ORDER[index + 1] as LoopRoute;
        navigation.navigate(next);
      }}
    />
  );

  const CompleteScreen = ({ navigation: _navigation }: any) => (
    <DailyLoopCompleteScreen
      onComplete={(data: DailyLoopCompleteData) => {
        const finalSessionData: DailyLoopSessionData = {
          ...sessionData,
          mode,
          complete: data,
          completedAt: new Date(),
          timeSpentSeconds: Math.round((Date.now() - startTime) / 1000),
          flowVersion: 'feat-291-daily-loop-v1',
        };
        onComplete(finalSessionData);
      }}
    />
  );

  return (
    <Stack.Navigator
      initialRouteName="AwarePresence"
      screenOptions={{
        headerShown: true,
        gestureEnabled: true,
        cardStyle: { backgroundColor: 'transparent' },
        headerStyle: {
          backgroundColor: colorSystem.themes.midday.background,
          borderBottomColor: colorSystem.themes.midday.primary,
          borderBottomWidth: 1,
          height: 100,
        },
        headerTintColor: colorSystem.themes.midday.primary,
        headerLeft: () => (
          <Pressable
            onPress={onExit}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close daily practice"
            accessibilityHint="Returns to home screen"
            testID="daily-loop-exit"
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        ),
      }}
      screenListeners={{
        state: (e) => {
          const state = e.data.state;
          if (!state) return;
          const routeName = state.routes[state.index]?.name as LoopRoute | undefined;
          const stepIndex = DAILY_LOOP_STEP_KEYS.indexOf(routeName as DailyLoopStepKey);
          if (stepIndex !== -1) setCurrentStep(stepIndex + 1);
        },
      }}
    >
      {DAILY_LOOP_STEP_KEYS.map((stepKey, index) => (
        <Stack.Screen key={stepKey} name={stepKey} options={getHeaderOptions(true)}>
          {makeStep(stepKey, index)}
        </Stack.Screen>
      ))}
      <Stack.Screen name="DailyLoopComplete" options={getHeaderOptions(false)}>
        {CompleteScreen}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  pickerContainer: { flex: 1, backgroundColor: colorSystem.base.white },
  pickerHeader: {
    height: 56,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.themes.midday.primary,
    backgroundColor: colorSystem.themes.midday.background,
  },
  headerContainer: { alignItems: 'center', width: '100%' },
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
    fontWeight: typography.fontWeight.regular,
  },
});

export default DailyLoopNavigator;
