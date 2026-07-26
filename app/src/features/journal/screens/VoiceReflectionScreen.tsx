/**
 * VoiceReflectionScreen (FEAT-283 Slice A)
 *
 * Speak a reflection → transcribe on-device → correct the transcript → save
 * encrypted. Nothing leaves the device.
 *
 * FRAMING (philosopher-gated — non-negotiable):
 * - This is the Senecan evening examination (De Ira III.36), not generic
 *   journaling and not a diary. Seneca reports Sextius' practice of questioning
 *   himself at the close of day: "What bad habit have you cured today? What
 *   fault have you resisted? In what respect are you better?"
 * - Premeditatio malorum is explicitly OUT of scope: it is prospective and
 *   morning-tensed, and its `PremeditationSafetyService` rails (obstacle cap,
 *   time-box, mandatory self-compassion close) cannot be enforced over
 *   free-form speech.
 * - The prompt is an OFFER, never a gate. Prohairesis: the censor must be the
 *   self, so the app must not become the examiner. "Just speak" always clears it.
 * - No minimum length. A two-sentence entry is a complete entry — Marcus wrote
 *   plenty of them. A length gate would make the app judge whether you examined
 *   enough, which inverts the practice.
 * - The edit step is framed as CORRECTING THE TRANSCRIPT, never revising the
 *   reflection. STT is lossy, so correction serves honesty ("nihil transeo");
 *   an invitation to polish would not. No tidy-up affordance, no "edited" badge,
 *   no revision history — provenance markers install the audience the practice
 *   depends on not having.
 * - Never prescribe a feeling. No streaks, counts, durations, or word counts
 *   anywhere in this flow.
 *
 * SAFETY (crisis-gated — non-negotiable):
 * - The transcript field is a real `TextInput` with a stable testID. A simulator
 *   cannot speak, so this is what makes the safety path drivable end-to-end; an
 *   undrivable safety path cannot ship.
 * - Scanning happens at BOTH transcript-finalize and save-commit, because an
 *   edit can introduce language the recognizer never produced, and an entry that
 *   was transcribed then discarded was still transcribed.
 * - The crisis banner is persistent and does not auto-dismiss. The iOS Alert is
 *   one tap from gone; the banner is the durable <3-tap affordance and the only
 *   thing an e2e flow can assert.
 * - Saving is never blocked, refused, or gated on acknowledging support.
 *   Coercion on a journaling surface trains people to stop journaling, which
 *   removes the signal entirely.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Linking,
} from 'react-native';
import {
  colorSystem,
  spacing,
  borderRadius,
  typography,
  semantic,
} from '@/core/theme';

import { journalCrisisScanner } from '../services/journalCrisisScan';
import { MAX_ENTRY_CHARS, saveEntry } from '../services/journalEntryStore';
import {
  checkOnDeviceAvailability,
  startGuardedRecognition,
} from '@/core/services/speech/onDeviceSpeechGuard';

type Phase = 'idle' | 'recording' | 'review' | 'saved' | 'unavailable';

/**
 * Prompts, each traceable to a classical source. Offered, never required.
 * The first is the master prompt — if only one ever ships, it is this one.
 */
export const REFLECTION_PROMPTS = [
  {
    text: 'Go back through the day. What did you say, and what did you do?',
    hint: 'Nothing hidden, nothing skipped — that was Seneca’s own rule.',
  },
  {
    text: 'What did you resist today?',
    hint: 'An impulse, a habit, a first reaction you didn’t follow.',
  },
  {
    text: 'In what way are you better than you were this morning?',
    hint: 'Small counts. Character moves in small amounts.',
  },
  {
    text: 'Is there something to pardon yourself for, and set down?',
    hint: 'Seneca closed his own review this way: see that you do it no more — for now, I pardon you.',
  },
] as const;

export function VoiceReflectionScreen(): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [showPrompt, setShowPrompt] = useState(true);
  const [crisisActive, setCrisisActive] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Stable per-capture id so the scanner can dedupe across its two scan points.
  const draftIdRef = useRef(`draft-${Date.now()}`);

  const prompt = REFLECTION_PROMPTS[0];

  const handleStart = useCallback(async () => {
    const availability = await checkOnDeviceAvailability();
    if (!availability.available) {
      // Honest dead end rather than a silent downgrade to cloud transcription.
      setPhase('unavailable');
      return;
    }

    const outcome = await startGuardedRecognition();
    if (!outcome.started) {
      setPhase('unavailable');
      return;
    }
    setPhase('recording');
  }, []);

  /**
   * Transcript finalize — scan point 1.
   * Fires even if the entry is later discarded.
   */
  const handleFinalize = useCallback((finalText: string) => {
    setTranscript(finalText);
    setPhase('review');

    const result = journalCrisisScanner.scanOnFinalize(draftIdRef.current, finalText);
    if (result.interventionActive) {
      setCrisisActive(true);
    }
  }, []);

  /**
   * Save commit — scan point 2, over the exact string handed to encryption.
   * The scan runs BEFORE the write and never blocks it.
   */
  const handleSave = useCallback(async () => {
    setSaveError(null);

    const result = journalCrisisScanner.scanOnSave(draftIdRef.current, transcript);
    if (result.interventionActive) {
      setCrisisActive(true);
    }

    const saved = await saveEntry({ text: transcript });
    if (!saved.saved) {
      setSaveError(
        saved.reason === 'too_long'
          ? 'That reflection is longer than we can save. Trim it a little.'
          : saved.reason === 'empty'
            ? 'There’s nothing to save yet.'
            : 'That didn’t save. Try once more.'
      );
      return;
    }

    setPhase('saved');
  }, [transcript]);

  const handleDiscard = useCallback(() => {
    // Deliberately does NOT clear an active intervention: discarding the text
    // does not undo the disclosure.
    journalCrisisScanner.onDraftDiscarded(draftIdRef.current);
    setTranscript('');
    setPhase('idle');
  }, []);

  const crisisBanner = crisisActive ? (
    <View style={styles.crisisBanner} testID="journal-crisis-banner">
      <Text style={styles.crisisTitle}>Support is available right now</Text>
      <Text style={styles.crisisBody}>
        You don’t have to be in danger to reach out.
      </Text>
      <Pressable
        style={styles.crisisAction}
        testID="journal-crisis-call-988"
        accessibilityRole="button"
        accessibilityLabel="Call 988, the Suicide and Crisis Lifeline"
        onPress={() => Linking.openURL('tel:988')}
      >
        <Text style={styles.crisisActionText}>Call 988</Text>
      </Pressable>
    </View>
  ) : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="voice-reflection-screen"
    >
      {crisisBanner}

      {phase === 'idle' && (
        <View>
          {showPrompt ? (
            <View style={styles.promptBlock}>
              <Text style={styles.prompt}>{prompt.text}</Text>
              <Text style={styles.hint}>{prompt.hint}</Text>
              <Pressable
                onPress={() => setShowPrompt(false)}
                testID="journal-clear-prompt"
                accessibilityRole="button"
              >
                <Text style={styles.subtleAction}>Just speak</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.prompt}>Speak whatever’s here.</Text>
          )}

          <Pressable
            style={styles.primaryButton}
            testID="journal-record-button"
            accessibilityRole="button"
            accessibilityLabel="Speak a reflection"
            onPress={handleStart}
          >
            <Text style={styles.primaryButtonText}>Speak a reflection</Text>
          </Pressable>
        </View>
      )}

      {phase === 'recording' && (
        <View>
          <Text style={styles.prompt}>Listening.</Text>
          <Pressable
            style={styles.primaryButton}
            testID="journal-stop-button"
            accessibilityRole="button"
            accessibilityLabel="Finish recording"
            onPress={() => handleFinalize(transcript)}
          >
            <Text style={styles.primaryButtonText}>Done</Text>
          </Pressable>
        </View>
      )}

      {phase === 'review' && (
        <View>
          <Text style={styles.title}>Check the transcript.</Text>
          <Text style={styles.hint}>Fix anything the transcription got wrong.</Text>

          <TextInput
            style={styles.input}
            testID="journal-transcript-input"
            accessibilityLabel="Your reflection transcript"
            value={transcript}
            onChangeText={setTranscript}
            multiline
            maxLength={MAX_ENTRY_CHARS}
            textAlignVertical="top"
          />

          {saveError ? (
            <Text style={styles.error} testID="journal-save-error">
              {saveError}
            </Text>
          ) : null}

          <Pressable
            style={styles.primaryButton}
            testID="journal-save-button"
            accessibilityRole="button"
            accessibilityLabel="Save this reflection"
            onPress={handleSave}
          >
            <Text style={styles.primaryButtonText}>Save</Text>
          </Pressable>

          <Pressable
            onPress={handleDiscard}
            testID="journal-discard-button"
            accessibilityRole="button"
          >
            <Text style={styles.subtleAction}>Discard</Text>
          </Pressable>
        </View>
      )}

      {phase === 'saved' && (
        <View testID="journal-saved-state">
          <Text style={styles.title}>Said, and set down.</Text>
          <Text style={styles.hint}>
            That’s the whole practice. You looked at the day, and now you can leave it.
          </Text>
          <Text style={styles.hint}>
            The recording is gone. Only your words remain, encrypted on this device.
          </Text>
        </View>
      )}

      {phase === 'unavailable' && (
        <View testID="journal-unavailable-state">
          <Text style={styles.title}>Voice isn’t available on this device.</Text>
          <Text style={styles.hint}>
            Being only transcribes on your device, and this device can’t do that
            right now. You can write your reflection instead.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: semantic.background.screen },
  content: { padding: spacing[24], gap: spacing[16] },
  title: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[4],
  },
  promptBlock: { gap: spacing[8], marginBottom: spacing[24] },
  prompt: {
    fontSize: typography.bodyLarge.size,
    color: semantic.text.primary,
  },
  hint: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
    marginBottom: spacing[8],
  },
  input: {
    minHeight: 180,
    borderWidth: 1,
    borderColor: semantic.border.default,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    fontSize: typography.bodyRegular.size,
    color: semantic.text.primary,
    backgroundColor: colorSystem.base.white,
    marginBottom: spacing[16],
  },
  primaryButton: {
    backgroundColor: colorSystem.base.midnightBlue,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[24],
    alignItems: 'center',
    marginTop: spacing[16],
    // Crisis-path tap target: never below the 44pt accessibility minimum.
    minHeight: 44,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colorSystem.base.white,
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
  },
  subtleAction: {
    color: semantic.text.secondary,
    fontSize: typography.bodySmall.size,
    textAlign: 'center',
    marginTop: spacing[16],
  },
  error: {
    color: colorSystem.status.error,
    fontSize: typography.bodySmall.size,
    marginBottom: spacing[8],
  },
  crisisBanner: {
    backgroundColor: colorSystem.status.errorBackground,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginBottom: spacing[24],
    gap: spacing[4],
  },
  crisisTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
  },
  crisisBody: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
  },
  crisisAction: {
    marginTop: spacing[8],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius.small,
    backgroundColor: colorSystem.base.midnightBlue,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  crisisActionText: {
    color: colorSystem.base.white,
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default VoiceReflectionScreen;
