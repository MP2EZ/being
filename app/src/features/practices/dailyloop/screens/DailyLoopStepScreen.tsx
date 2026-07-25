/**
 * DailyLoopStepScreen — FEAT-291
 *
 * ONE parameterized beat screen for the single-loop daily practice, driven by the
 * tenseMode step config. Reflect-first: every text field is OPTIONAL — after the
 * breath, Continue is always enabled (typing is capture, not a gate), suiting the
 * walking, eyes-up practice. Step-specific surfaces are declared by the config:
 *  - step 1 (Aware Presence): a 30s micro-breath with a grounding prompt (body
 *    sensation + environment + mind) in the guidance card, then optional capture,
 *  - step 3 (Sphere Sovereignty): two order-agnostic fields (the full dichotomy),
 *  - step 4 (Virtuous Response): MULTI-select virtue chips (optional lens) + one
 *    synthesized action, plus — morning only — the guardrailed premeditatio,
 *  - step 2 (Radical Acceptance): a quiet static crisis-support line (crisis review).
 *
 * The screen owns no navigation for step advance (calls onSave; the navigator
 * advances). The support line taps to CrisisResources via the root nav ref — the
 * only crisis path; NO scan of the free text. Themed as 'midday'. Crisis access is
 * otherwise inherited from the single root overlay (MAINT-290); no per-step button.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { colorSystem, spacing, borderRadius, typography, getTheme } from '@/core/theme';
import { AccessibleButton } from '@/core/components/accessibility/AccessibleButton';
import {
  BreathingCircle,
  Timer,
  GuidanceCard,
  SkipLink,
  FlowBackButton,
  PreviousAnswerCard,
} from '@/features/practices/shared/components';
import { navigationRef } from '@/core/navigation/navigationRef';
import type { DailyLoopMode, DailyLoopDepth, DailyLoopStepData } from '@/features/practices/types/flows';
import type { CardinalVirtue } from '@/features/practices/types/stoic';
import {
  getStepConfig,
  STEP_TITLES,
  DAILY_LOOP_STEP_KEYS,
  VIRTUE_REFERENCE,
  PREMEDITATIO,
  SUPPORT_LINE,
  showsSupportLine,
  type DailyLoopStepKey,
  type LoopFieldKey,
} from '../config/tenseMode';
import {
  MODULE_FOR_STEP,
  getStageNote,
  selectStageNoteStep,
  dayIndexFor,
  type StagesByStep,
} from '../config/stageNotes';
import { useEducationStore } from '@/features/learn/stores/educationStore';

const BREATH_DURATION_MS = 30 * 1000;

export interface DailyLoopStepScreenProps {
  stepKey: DailyLoopStepKey;
  mode: DailyLoopMode;
  /** Per-session depth (FEAT-301). Deep = full loop; quick = canonical steps 1→3→4. */
  depth: DailyLoopDepth;
  /** Gate the input behind a 30s micro-breath (step 1 only). */
  showBreath?: boolean;
  /** Render the in-content back affordance (all but the first step). */
  showBack?: boolean;
  onBack?: () => void;
  /** Previous beat's answer, shown as context. */
  previousAnswer?: { label: string; text: string } | undefined;
  /** Called with the captured beat data; the navigator advances to the next step. */
  onSave: (data: DailyLoopStepData) => void;
}

const openCrisisResources = () => {
  if (navigationRef.isReady()) {
    navigationRef.navigate('CrisisResources', { source: 'crisis_button' });
  }
};

const DailyLoopStepScreen: React.FC<DailyLoopStepScreenProps> = ({
  stepKey,
  mode,
  depth,
  showBreath = false,
  showBack = true,
  onBack,
  previousAnswer,
  onSave,
}) => {
  const config = getStepConfig(mode, stepKey);
  const title = STEP_TITLES[stepKey];
  const themeColors = getTheme('midday');
  // Premeditatio (morning-tensed negative visualization on Virtuous Response) is
  // EXCLUDED from the quick pass — a fast micro-arc is not the container for it. Its
  // morning-only + acute-distress gating is otherwise unchanged for the deep loop.
  const showPremeditatio = stepKey === 'VirtuousResponse' && mode === 'morning' && depth !== 'quick';
  // Crisis support line placement is resolved at the DATA level (tenseMode.ts) so the
  // "exactly once, per depth" invariant is config-testable — deep: Radical Acceptance;
  // quick: Sphere Sovereignty (a no-breath-gate beat). Never a screen-level decision.
  const showSupportLine = showsSupportLine(depth, mode, stepKey);

  // FEAT-292 — stage-aware normalization. Each beat reads the stage the user
  // self-assessed FOR ITS OWN PRINCIPLE (step↔module is 1:1), so nothing is
  // aggregated and nothing is computed: an unassessed principle simply stays silent.
  // At most ONE note surfaces per session (selectStageNoteStep), which both keeps it
  // from becoming wallpaper and holds quick/deep at the same count.
  const moduleProgress = useEducationStore((s) => s.modules);
  const stageNote = useMemo(() => {
    const stagesByStep: StagesByStep = {};
    for (const key of DAILY_LOOP_STEP_KEYS) {
      stagesByStep[key] = moduleProgress?.[MODULE_FOR_STEP[key]]?.developmentalStage ?? null;
    }
    const selected = selectStageNoteStep(stagesByStep, depth, mode, dayIndexFor(new Date()));
    return selected === stepKey ? getStageNote(stagesByStep[stepKey] ?? null, stepKey) : undefined;
  }, [moduleProgress, depth, mode, stepKey]);

  const [values, setValues] = useState<Record<LoopFieldKey, string>>({ response: '', notMine: '', mine: '' });
  const [selectedVirtues, setSelectedVirtues] = useState<CardinalVirtue[]>([]);
  const [adversityRehearsal, setAdversityRehearsal] = useState('');
  const [breathCompleted, setBreathCompleted] = useState(!showBreath);
  const [isBreathActive, setIsBreathActive] = useState(showBreath);

  const setField = useCallback((key: LoopFieldKey, text: string) => {
    setValues((v) => ({ ...v, [key]: text }));
  }, []);

  const toggleVirtue = useCallback((key: CardinalVirtue) => {
    setSelectedVirtues((prev) => (prev.includes(key) ? prev.filter((v) => v !== key) : [...prev, key]));
  }, []);

  const handleBreathComplete = useCallback(() => {
    setBreathCompleted(true);
    setIsBreathActive(false);
  }, []);

  const handleContinue = useCallback(() => {
    // Reflect-first: all inputs optional. Capture only what was written.
    const data: DailyLoopStepData = { timestamp: new Date() };
    if (values.response.trim()) data.response = values.response.trim();
    if (values.notMine.trim()) data.notMine = values.notMine.trim();
    if (values.mine.trim()) data.mine = values.mine.trim();
    if (selectedVirtues.length) data.virtues = selectedVirtues;
    if (adversityRehearsal.trim()) data.adversityRehearsal = adversityRehearsal.trim();
    onSave(data);
  }, [values, selectedVirtues, adversityRehearsal, onSave]);

  const renderField = (key: LoopFieldKey, label: string, hint: string | undefined, placeholder: string) => (
    <View style={styles.inputSection} key={key}>
      <Text style={styles.inputLabel}>{label}</Text>
      {hint ? <Text style={styles.inputHint}>{hint}</Text> : null}
      <TextInput
        style={[styles.textInput, { borderColor: values[key] ? themeColors.primary : colorSystem.gray[300] }]}
        value={values[key]}
        onChangeText={(t) => setField(key, t)}
        placeholder={placeholder}
        placeholderTextColor={colorSystem.gray[500]}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        accessibilityLabel={label}
        accessibilityHint="Optional — leave blank to reflect without writing"
        testID={`daily-loop-input-${key}`}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        testID={`daily-loop-${stepKey}-screen`}
      >
        {showBack && <FlowBackButton onPress={() => onBack?.()} theme="midday" />}

        {/* Breath gate (step 1) — grounding prompt lives in the guidance card */}
        {!breathCompleted && (
          <View style={styles.breathSection}>
            <Text style={styles.breathTitle}>Take a moment to arrive</Text>
            <Text style={styles.breathSubtitle}>Let your body settle. Notice what's here.</Text>
            <View style={styles.breathCircleContainer}>
              <BreathingCircle
                isActive={isBreathActive}
                pattern={{ inhale: 4000, exhale: 4000 }}
                testID="daily-loop-breathing-circle"
              />
            </View>
            <Timer
              duration={BREATH_DURATION_MS}
              isActive={isBreathActive}
              onComplete={handleBreathComplete}
              onPause={() => setIsBreathActive(false)}
              onResume={() => setIsBreathActive(true)}
              showProgress
              showControls
              showSkip={false}
              theme="midday"
              testID="daily-loop-breath-timer"
            />
            <SkipLink
              onPress={handleBreathComplete}
              accessibilityLabel="Skip breathing exercise"
              testID="daily-loop-skip-breath"
            />
            <View style={styles.guidanceWrapper}>
              <GuidanceCard
                title="As you breathe, notice:"
                items={config.grounding ?? ['Your posture right now', 'The rhythm of your breath', "What's asking for your attention"]}
                testID="daily-loop-grounding"
              />
            </View>
          </View>
        )}

        {/* Reflection phase */}
        {breathCompleted && (
          <>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionSubtitle}>{config.subtitle}</Text>

            {/* FEAT-292 stage normalization — framing for the beat, so it sits BEFORE
                the prompt (telling someone the difficulty was expected only after
                they've already written reads as retroactive consolation). Kept at the
                head of the beat and non-interactive so it can never be mistaken for
                the tappable crisis support line at the foot. Never labels the stage. */}
            {stageNote ? (
              <Text style={styles.stageNote} testID="daily-loop-stage-note">
                {stageNote}
              </Text>
            ) : null}

            {previousAnswer && previousAnswer.text ? (
              <PreviousAnswerCard
                label={previousAnswer.label}
                answer={previousAnswer.text}
                theme="midday"
                testID="daily-loop-previous-answer"
              />
            ) : null}

            {/* Step 4: four cardinal virtues — multi-select lens (optional) */}
            {config.virtueChips && (
              <View style={styles.virtueBlock}>
                {config.virtueChipsPrompt ? (
                  <Text style={styles.virtuePrompt}>{config.virtueChipsPrompt}</Text>
                ) : null}
                <Text style={styles.virtueReference}>
                  {VIRTUE_REFERENCE.map((v) => `${v.label} — ${v.gloss}`).join('   ·   ')}
                </Text>
                <View style={styles.virtueChips}>
                  {VIRTUE_REFERENCE.map((v) => {
                    const active = selectedVirtues.includes(v.key);
                    return (
                      <Pressable
                        key={v.key}
                        onPress={() => toggleVirtue(v.key)}
                        style={[
                          styles.virtueChip,
                          {
                            borderColor: active ? themeColors.primary : colorSystem.gray[300],
                            backgroundColor: active ? themeColors.background : colorSystem.base.white,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${v.label}${active ? ', selected' : ''}`}
                        accessibilityHint="Optional — name any virtues this calls for"
                        testID={`virtue-chip-${v.key}`}
                      >
                        <Text
                          style={[
                            styles.virtueChipText,
                            { color: active ? themeColors.primary : colorSystem.gray[600] },
                          ]}
                        >
                          {v.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Optional fields (1 for most beats, 2 for Sphere Sovereignty) */}
            {config.fields.map((f) => renderField(f.key, f.label, f.hint, f.placeholder))}

            {/* Step 4 morning-tensed only: optional, skippable premeditatio */}
            {showPremeditatio && (
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>{PREMEDITATIO.label}</Text>
                <Text style={styles.inputHint}>{PREMEDITATIO.hint}</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { borderColor: adversityRehearsal ? themeColors.primary : colorSystem.gray[300] },
                  ]}
                  value={adversityRehearsal}
                  onChangeText={setAdversityRehearsal}
                  placeholder={PREMEDITATIO.placeholder}
                  placeholderTextColor={colorSystem.gray[500]}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  accessibilityLabel="Optional: how you'd want to meet a setback"
                  accessibilityHint="Optional and skippable — leave blank to skip"
                  testID="premeditatio-input"
                />
              </View>
            )}

            {/* Quiet, static crisis-support line (crisis review). Deep: Radical
                Acceptance; quick: re-hosted to Aware Presence (its first beat). */}
            {showSupportLine && (
              <Pressable
                onPress={openCrisisResources}
                style={styles.supportLine}
                accessibilityRole="button"
                accessibilityLabel={SUPPORT_LINE}
                accessibilityHint="Opens crisis support resources"
                testID="daily-loop-support-line"
              >
                <Text style={styles.supportLineText}>{SUPPORT_LINE}</Text>
              </Pressable>
            )}

            <Text style={styles.reflectNote}>Reflect as long as you like — writing is optional.</Text>

            <AccessibleButton
              onPress={handleContinue}
              label="Continue"
              variant="primary"
              size="large"
              theme="midday"
              testID="continue-button"
              accessibilityHint="Continue to the next step"
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colorSystem.base.white },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[20], paddingBottom: spacing[40] },

  breathSection: { alignItems: 'center', paddingTop: spacing[16] },
  breathTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  breathSubtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    marginBottom: spacing[32],
  },
  breathCircleContainer: { marginBottom: spacing[24] },
  guidanceWrapper: { marginTop: spacing[24], width: '100%' },

  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  sectionSubtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    marginBottom: spacing[16],
  },
  // FEAT-292. The philosopher pass asked for gray[500] — one step quieter than the
  // support line — but flagged it to be MEASURED rather than assumed: gray[500]
  // (#B8B8B8) is 1.98:1 on white, failing WCAG AA (4.5:1). gray[600] (#757575) is
  // 4.61:1 and is used instead. Subordination to the crisis affordance is preserved
  // structurally rather than chromatically: this line sits at the HEAD of the beat
  // (the support line sits at the foot), carries no underline, and is not pressable
  // — so the two never read as the same affordance despite sharing a colour.
  stageNote: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    lineHeight: typography.bodySmall.size * 1.5,
    marginBottom: spacing[16],
  },

  virtueBlock: { marginBottom: spacing[16] },
  virtuePrompt: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  virtueReference: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    marginBottom: spacing[12],
    lineHeight: typography.bodySmall.size * 1.5,
  },
  virtueChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] },
  virtueChip: {
    borderWidth: 2,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    minHeight: 44,
    justifyContent: 'center',
  },
  virtueChipText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
  },

  inputSection: { marginBottom: spacing[24] },
  inputLabel: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  inputHint: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    marginBottom: spacing[16],
    lineHeight: typography.bodySmall.size * 1.5,
  },
  textInput: {
    borderWidth: 2,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    backgroundColor: colorSystem.base.white,
    minHeight: 96,
  },

  supportLine: {
    paddingVertical: spacing[12],
    marginBottom: spacing[8],
    minHeight: 44,
    justifyContent: 'center',
  },
  supportLineText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    textDecorationLine: 'underline',
  },
  reflectNote: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[500],
    fontStyle: 'italic',
    marginBottom: spacing[16],
  },
});

export default DailyLoopStepScreen;
