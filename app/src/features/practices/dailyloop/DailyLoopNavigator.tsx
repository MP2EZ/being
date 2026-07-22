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
  DailyLoopDepth,
  DailyLoopParamList,
  DailyLoopStepData,
  DailyLoopCompleteData,
  DailyLoopSessionData,
} from '@/features/practices/types/flows';
import { getStepKeysForDepth, type DailyLoopStepKey } from './config/tenseMode';
import DailyLoopStepScreen from './screens/DailyLoopStepScreen';
import DailyLoopModeSelectScreen from './screens/DailyLoopModeSelectScreen';
import DailyLoopDepthSelectScreen from './screens/DailyLoopDepthSelectScreen';
import DailyLoopCompleteScreen from './screens/DailyLoopCompleteScreen';

interface DailyLoopNavigatorProps {
  mode?: DailyLoopMode | undefined;
  /** Per-session depth (FEAT-301). When absent, the in-flow depth picker is shown. */
  depth?: DailyLoopDepth | undefined;
  onComplete: (sessionData: DailyLoopSessionData) => void;
  onExit: () => void;
}

const Stack = createStackNavigator<DailyLoopParamList>();

// A loop route is any principle beat + the (non-principle) completion. The RUNTIME
// order is depth-resolved inside the component (deep = all five; quick = 1→3→4).
type LoopRoute = DailyLoopStepKey | 'DailyLoopComplete';

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

const DailyLoopNavigator: React.FC<DailyLoopNavigatorProps> = ({
  mode: initialMode,
  depth: initialDepth,
  onComplete,
  onExit,
}) => {
  const [depth, setDepth] = useState<DailyLoopDepth | null>(initialDepth ?? null);
  const [mode, setMode] = useState<DailyLoopMode | null>(initialMode ?? null);
  const [sessionData, setSessionData] = useState<Partial<DailyLoopSessionData>>({});
  const [startTime] = useState(() => Date.now());
  const [currentStep, setCurrentStep] = useState(1);

  const closeButton = (
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
  );

  // Depth picker (FEAT-301) — shown FIRST, only when no depth route param was passed.
  // Two equal, always-available choices; the chosen depth lives in local state and is
  // NEVER persisted (non-sticky — the next session re-presents this neutral choice).
  if (!depth) {
    return (
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>{closeButton}</View>
        <DailyLoopDepthSelectScreen onSelect={setDepth} />
      </View>
    );
  }

  // Mode picker (only when no mode was passed as a route param).
  if (!mode) {
    return (
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>{closeButton}</View>
        <DailyLoopModeSelectScreen onSelect={setMode} />
      </View>
    );
  }

  // Depth-resolved step set: deep = all five beats; quick = canonical 1→3→4.
  const stepKeys = getStepKeysForDepth(depth);
  const screenOrder: LoopRoute[] = [...stepKeys, 'DailyLoopComplete'];
  const totalSteps = stepKeys.length;

  const prevResponse = (step: DailyLoopStepKey): { label: string; text: string } | undefined => {
    // Quick is a fast pass over a NON-contiguous subset (1→3→4); the PREV_LABEL chain
    // assumes contiguous predecessors, so echoing a prior beat would mislabel it. Skip
    // the echo for quick — it stays a clean short pass.
    if (depth === 'quick') return undefined;
    const label = PREV_LABEL[step];
    if (!label) return undefined;
    const idx = stepKeys.indexOf(step);
    if (idx <= 0) return undefined;
    const prevField = STEP_FIELD[stepKeys[idx - 1] as DailyLoopStepKey];
    const prev = sessionData[prevField] as DailyLoopStepData | undefined;
    // Reflect-first: inputs are optional, so the prior beat may have no capture.
    // Prefer its primary text; for Sphere Sovereignty (two fields) echo "what's yours".
    const text = prev?.response ?? prev?.mine ?? prev?.notMine;
    return text ? { label, text } : undefined;
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
      depth={depth}
      showBreath={stepKey === 'AwarePresence'}
      showBack={index > 0}
      onBack={() => navigation.goBack()}
      previousAnswer={prevResponse(stepKey)}
      onSave={(data: DailyLoopStepData) => {
        setSessionData((prev) => ({ ...prev, [STEP_FIELD[stepKey]]: data }));
        const next = screenOrder[index + 1] as LoopRoute;
        navigation.navigate(next);
      }}
    />
  );

  const CompleteScreen = ({ navigation: _navigation }: any) => (
    <DailyLoopCompleteScreen
      depth={depth}
      onComplete={(data: DailyLoopCompleteData) => {
        const finalSessionData: DailyLoopSessionData = {
          ...sessionData,
          mode,
          // Record-only (analytics parity); never read back to bias a future session.
          depth,
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
        headerLeft: () => closeButton,
      }}
      screenListeners={{
        state: (e) => {
          const state = e.data.state;
          if (!state) return;
          const routeName = state.routes[state.index]?.name as LoopRoute | undefined;
          const stepIndex = stepKeys.indexOf(routeName as DailyLoopStepKey);
          if (stepIndex !== -1) setCurrentStep(stepIndex + 1);
        },
      }}
    >
      {stepKeys.map((stepKey, index) => (
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
