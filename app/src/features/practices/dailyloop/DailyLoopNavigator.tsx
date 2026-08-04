/**
 * DailyLoopNavigator — the single daily practice (FEAT-298 slice 5: default, unflagged).
 *
 * The Five Principles in canonical order as ONE nested flow, cloned structurally from
 * the Midday navigator. Registered as a SINGLE root-stack modal screen (`DailyLoop`) in
 * CleanRootNavigator — that is what lets it inherit MAINT-290's single root crisis
 * overlay on every step (the root route `DailyLoop` is in RootCrisisButton's
 * IMMERSIVE_ROUTES). It therefore mounts NO crisis button of its own.
 *
 * Prototype specifics:
 *  - `mode` (flat / morning / evening) is INFERRED FROM THE CLOCK (getDailyLoopTense) and
 *    drives which tense copy each step renders. It is internal — never user-picked, never
 *    displayed. The route param survives for tests/tooling only.
 *  - Session resumption is intentionally NOT used: it is keyed by CheckInType, and this
 *    prototype themes as 'midday' (no new CheckInType), so the hook would collide with
 *    the real Midday flow's saved session. A local accumulator sidesteps that entirely.
 *  - Themed as 'midday' (no ThemeKey/FlowType/CheckInType union change).
 */
import React, { useState, useEffect, useCallback } from 'react';
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
import DailyLoopDepthSelectScreen from './screens/DailyLoopDepthSelectScreen';
import DailyLoopCompleteScreen from './screens/DailyLoopCompleteScreen';
import { ResumeSessionModal } from '../shared/components/ResumeSessionModal';
import { SessionStorageService } from '@/core/services/session/SessionStorageService';
import { getDailyLoopTense } from '@/core/utils/timeOfDay';
import type { SessionMetadata } from '@/core/types/session';

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
  // FEAT-298 slice 5: the tense is INFERRED FROM THE CLOCK, never picked by the user.
  // `initialMode` survives only as a route param for tests/tooling; there is no picker and
  // no UI path that sets it. Resolved once per session so a session that straddles a
  // boundary (e.g. begun 16:58) keeps the tense it opened in rather than switching
  // mid-practice.
  const [mode, setMode] = useState<DailyLoopMode>(initialMode ?? getDailyLoopTense());
  const [sessionData, setSessionData] = useState<Partial<DailyLoopSessionData>>({});
  const [startTime] = useState(() => Date.now());
  const [currentStep, setCurrentStep] = useState(1);

  // ── Session resumption (FEAT-298 slice 3b) ──────────────────────────────────────────
  // FEAT-291 skipped resumption because the shared hook keys sessions by CheckInType and
  // the prototype borrowed 'midday', so it would have collided with the real Midday flow's
  // saved session. Slice 3b removes that collision: the loop has its own PracticeIdentity
  // ('daily-loop') and its own SecureStore key, so it can persist properly.
  //
  // Storage goes through SessionStorageService — the same AES-256 path the legacy flows
  // use. The typed beats are wellness data; there is no second path.
  const [resumableSession, setResumableSession] = useState<SessionMetadata | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  // Set when a resume is accepted: the beat to land on AFTER re-grounding.
  const [regroundTarget, setRegroundTarget] = useState<DailyLoopStepKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const session = await SessionStorageService.loadSession('daily-loop');
        if (cancelled) return;
        // A session parked on the first beat has nothing to resume TO — re-grounding would
        // land the user exactly where they already are.
        if (session && session.currentScreen !== 'AwarePresence') {
          const { flowState, ...metadata } = session;
          if (flowState?.['sessionData']) setSessionData(flowState['sessionData']);
          if (flowState?.['mode']) setMode(flowState['mode']);
          if (flowState?.['depth']) setDepth(flowState['depth']);
          setResumableSession(metadata);
          setShowResumeModal(true);
        }
      } catch (error) {
        // Resumption is a nice-to-have; never block entry to the practice.
        console.error('[DailyLoop] Failed to check for resumable session:', error);
      } finally {
        if (!cancelled) setHasCheckedSession(true);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveSession = useCallback(
    (currentScreen: string, data: Partial<DailyLoopSessionData>, m: DailyLoopMode | null, d: DailyLoopDepth | null) => {
      void SessionStorageService.saveSession('daily-loop', currentScreen, {
        sessionData: data,
        mode: m,
        depth: d,
      });
    },
    []
  );

  const handleResumeSession = useCallback(() => {
    // MUST re-ground before the resumed beat. Aware Presence is "the ground the other four
    // beats stand on", and ground established hours ago has expired — dropping the user
    // straight into beat 4 stands the arc on nothing. We replay the BREATH only, never a
    // re-capture of beat 1's answer, and never framed as a penalty or a re-do. It is the
    // practice, not a toll.
    const target = resumableSession?.currentScreen as DailyLoopStepKey | undefined;
    if (target) setRegroundTarget(target);
    setShowResumeModal(false);
  }, [resumableSession]);

  const handleBeginFresh = useCallback(async () => {
    await SessionStorageService.clearSession('daily-loop');
    setSessionData({});
    setRegroundTarget(null);
    setShowResumeModal(false);
  }, []);

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

  // Wait for the session check before rendering anything. Without this the depth picker
  // paints for a frame and is then replaced by the resume modal — and worse, a resumed
  // session's restored depth/mode would arrive after the user had already been offered
  // the choice. Nothing is shown for one async tick; the practice has not started yet.
  if (!hasCheckedSession) return <View style={styles.pickerContainer} />;

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
          <FlowProgressIndicator currentStep={currentStep} totalSteps={totalSteps} flowType="daily-loop" />
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
        const updated = { ...sessionData, [STEP_FIELD[stepKey]]: data };
        setSessionData(updated);

        // After re-grounding on Aware Presence, jump to the beat the user left off at
        // rather than walking forward from beat 2.
        const next =
          stepKey === 'AwarePresence' && regroundTarget
            ? (regroundTarget as LoopRoute)
            : (screenOrder[index + 1] as LoopRoute);
        if (stepKey === 'AwarePresence' && regroundTarget) setRegroundTarget(null);

        saveSession(String(next), updated, mode, depth);
        navigation.navigate(next);
      }}
    />
  );

  const CompleteScreen = ({ navigation: _navigation }: any) => (
    <DailyLoopCompleteScreen
      depth={depth}
      mode={mode}
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
        void SessionStorageService.clearSession('daily-loop');
        onComplete(finalSessionData);
      }}
    />
  );

  return (
    <>
    <ResumeSessionModal
      visible={showResumeModal}
      session={resumableSession}
      onResume={handleResumeSession}
      onBeginFresh={handleBeginFresh}
    />
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
    </>
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
