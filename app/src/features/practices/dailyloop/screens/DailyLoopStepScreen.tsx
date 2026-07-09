/**
 * DailyLoopStepScreen — FEAT-291
 *
 * ONE parameterized beat screen for the single-loop daily practice, driven by the
 * tenseMode config. Covers all five principle steps; step-specific surfaces are
 * optional slots:
 *  - step 1 (Aware Presence): a 30s micro-breath gate before the input (reuses
 *    BreathingCircle/Timer/SkipLink/GuidanceCard, mirroring the Midday pattern),
 *  - step 4 (Virtuous Response): the four cardinal virtues as a reference line +
 *    OPTIONAL selectable chips (scaffolding, never a required gate), plus — in
 *    morning-tensed mode only — an OPTIONAL, skippable, coping-clause-paired
 *    premeditatio input.
 *
 * The screen owns no navigation: it calls onSave(data) and the navigator advances.
 * This decouples the loop's step order from any hardcoded route targets. Themed as
 * 'midday' (no ThemeKey union change — FEAT-291 ships alongside the 3 flows).
 * Crisis access is inherited from the single root overlay (MAINT-290); this screen
 * mounts NO crisis button of its own.
 */
import React, { useState, useCallback } from 'react';
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
import type { DailyLoopMode, DailyLoopStepData } from '@/features/practices/types/flows';
import type { CardinalVirtue } from '@/features/practices/types/stoic';
import {
  getStepCopy,
  STEP_TITLES,
  VIRTUE_REFERENCE,
  PREMEDITATIO,
  type DailyLoopStepKey,
} from '../config/tenseMode';

const BREATH_DURATION_MS = 30 * 1000;

export interface DailyLoopStepScreenProps {
  stepKey: DailyLoopStepKey;
  mode: DailyLoopMode;
  /** Whether to gate the input behind a 30s micro-breath (step 1 only). */
  showBreath?: boolean;
  /** Whether to render the in-content back affordance (all but the first step). */
  showBack?: boolean;
  onBack?: () => void;
  /** Previous beat's answer, shown as context. */
  previousAnswer?: { label: string; text: string } | undefined;
  /** Called with the captured beat data; the navigator advances to the next step. */
  onSave: (data: DailyLoopStepData) => void;
}

const DailyLoopStepScreen: React.FC<DailyLoopStepScreenProps> = ({
  stepKey,
  mode,
  showBreath = false,
  showBack = true,
  onBack,
  previousAnswer,
  onSave,
}) => {
  const copy = getStepCopy(mode, stepKey);
  const title = STEP_TITLES[stepKey];
  const themeColors = getTheme('midday');
  const isVirtueStep = stepKey === 'VirtuousResponse';
  const showPremeditatio = isVirtueStep && mode === 'morning';

  const [response, setResponse] = useState('');
  const [selectedVirtue, setSelectedVirtue] = useState<CardinalVirtue | undefined>(undefined);
  const [adversityRehearsal, setAdversityRehearsal] = useState('');
  const [breathCompleted, setBreathCompleted] = useState(!showBreath);
  const [isBreathActive, setIsBreathActive] = useState(showBreath);

  const handleBreathComplete = useCallback(() => {
    setBreathCompleted(true);
    setIsBreathActive(false);
  }, []);

  const handleContinue = useCallback(() => {
    if (!response.trim()) return;
    onSave({
      response: response.trim(),
      ...(selectedVirtue ? { virtue: selectedVirtue } : {}),
      ...(adversityRehearsal.trim() ? { adversityRehearsal: adversityRehearsal.trim() } : {}),
      timestamp: new Date(),
    });
  }, [response, selectedVirtue, adversityRehearsal, onSave]);

  const canContinue = breathCompleted && response.trim().length > 0;

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
        {showBack && (
          <FlowBackButton onPress={() => onBack?.()} theme="midday" />
        )}

        {/* Breath gate (step 1 only) */}
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
                title="Pause and notice:"
                items={['Your posture right now', 'The rhythm of your breath', "What's asking for your attention"]}
                testID="daily-loop-pause-guidance"
              />
            </View>
          </View>
        )}

        {/* Input phase */}
        {breathCompleted && (
          <>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionSubtitle}>{copy.subtitle}</Text>

            {previousAnswer && previousAnswer.text ? (
              <PreviousAnswerCard
                label={previousAnswer.label}
                answer={previousAnswer.text}
                theme="midday"
                testID="daily-loop-previous-answer"
              />
            ) : null}

            {/* Step 4: four cardinal virtues reference + optional chips */}
            {isVirtueStep && (
              <View style={styles.virtueBlock}>
                <Text style={styles.virtueReference}>
                  {VIRTUE_REFERENCE.map((v) => `${v.label} — ${v.gloss}`).join('   ·   ')}
                </Text>
                <View style={styles.virtueChips}>
                  {VIRTUE_REFERENCE.map((v) => {
                    const active = selectedVirtue === v.key;
                    return (
                      <Pressable
                        key={v.key}
                        onPress={() => setSelectedVirtue(active ? undefined : v.key)}
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
                        accessibilityHint="Optional — name the virtue this calls for"
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

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{copy.inputLabel}</Text>
              {copy.inputHint ? <Text style={styles.inputHint}>{copy.inputHint}</Text> : null}
              <TextInput
                style={[
                  styles.textInput,
                  { borderColor: response ? themeColors.primary : colorSystem.gray[300] },
                ]}
                value={response}
                onChangeText={setResponse}
                placeholder={copy.placeholder}
                placeholderTextColor={colorSystem.gray[500]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                accessibilityLabel={title}
                accessibilityHint="Enter your reflection for this step"
                testID="daily-loop-input"
              />
            </View>

            {/* Step 4 morning-tensed: optional, skippable premeditatio */}
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
                  accessibilityLabel="Optional: how you'd want to meet adversity"
                  accessibilityHint="Optional and skippable — leave blank to skip"
                  testID="premeditatio-input"
                />
              </View>
            )}

            <AccessibleButton
              onPress={handleContinue}
              label="Continue"
              variant="primary"
              size="large"
              theme="midday"
              disabled={!canContinue}
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

  virtueBlock: { marginBottom: spacing[16] },
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
    minHeight: 110,
  },
});

export default DailyLoopStepScreen;
