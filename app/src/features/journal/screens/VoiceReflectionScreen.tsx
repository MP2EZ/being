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
} from 'react-native';
// Static import — the crisis path's no-lazy-import rule (CLAUDE.md).
import { openCrisisUrl } from '@/features/crisis/utils/openCrisisUrl';
import {
  colorSystem,
  spacing,
  borderRadius,
  typography,
  semantic,
  TOUCH_TARGETS,
} from '@/core/theme';

import { useSpeechRecognitionEvent, ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

import { journalCrisisScanner } from '../services/journalCrisisScan';
import { MAX_ENTRY_CHARS, saveEntry } from '../services/journalEntryStore';
import {
  checkOnDeviceAvailability,
  startGuardedRecognition,
} from '@/core/services/speech/onDeviceSpeechGuard';
import { sweepAllAudioArtifacts } from '@/core/services/speech/audioArtifactSweeper';
import { crisisAccessoryProps } from '@/features/crisis/constants/crisisInputAccessory';
import { OVERLAY_ACTION_ROW_PADDING_RIGHT } from '@/features/crisis/constants/crisisButtonGeometry';

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

  // DEBUG-480: scrolled programmatically when journal-save-error renders, which
  // pushes Save further under the keyboard at exactly the moment the text is at
  // most risk — the save has already failed once, and there is no autosave or
  // draft persistence to fall back on.
  const scrollRef = useRef<ScrollView>(null);

  // DEBUG-480: in-flight guard. saveEntry is awaited with nothing blocking
  // re-entry, so a double-tap writes two encrypted entries. Making Save smaller
  // and scroll-dependent makes double-tapping MORE likely, so the guard ships
  // with the fix that causes it, not after.
  const savingRef = useRef(false);

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
   * Live transcription. The guard has already established that this is running
   * on-device, so nothing here reaches the network.
   */
  useSpeechRecognitionEvent('result', (event) => {
    const spoken = event.results?.[0]?.transcript ?? '';
    if (spoken.length > 0) {
      setTranscript(spoken);
    }
  });

  useSpeechRecognitionEvent('error', () => {
    // A failed transcription must not silently destroy the reflection with no
    // explanation — the person spoke and has nothing to show for it.
    try {
      sweepAllAudioArtifacts();
    } catch {
      // Never surface cleanup failure to someone mid-reflection.
    }
    setPhase('review');
  });

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
   * Stop the recognizer and finalize.
   *
   * Audio cleanup runs in a `finally` rather than on the success path only:
   * "discarded immediately post-transcription" has to hold when transcription
   * FAILS too, which is exactly when a stranded file is most likely. The guard
   * never asks the library to persist audio, so on iOS there is usually nothing
   * to remove — this covers Android's scratch PCM (written even when persist is
   * false) and anything a crash left behind.
   */
  const finishCapture = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // Already stopped, or never started — not actionable.
    } finally {
      try {
        sweepAllAudioArtifacts();
      } catch {
        // Never surface cleanup failure to someone mid-reflection.
      }
    }
    handleFinalize(transcript);
  }, [handleFinalize, transcript]);

  /**
   * Save commit — scan point 2, over the exact string handed to encryption.
   * The scan runs BEFORE the write and never blocks it.
   */
  const handleSave = useCallback(async () => {
    // DEBUG-480: re-entry guard, NOT a scan guard. A second tap while the first
    // save is still awaiting would write a second encrypted entry; the scan
    // itself is already idempotent per draftId. The scan below still runs on
    // every save that is actually admitted.
    if (savingRef.current) return;
    savingRef.current = true;

    try {
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
    } finally {
      // Released on EVERY path, including the save-error return above: the retry
      // is the whole point of that path, and a guard that latched on failure
      // would make an unreachable Save permanently unreachable.
      savingRef.current = false;
    }
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
        // Guarded dial (DEBUG-314). This banner shipped in FEAT-283 — *after*
        // the audit that catalogued this bug class — which is the clearest
        // evidence that the mechanical pin in
        // `__tests__/safety/crisisDialGuard.test.ts` was the necessary fix, not
        // the one-time sweep.
        onPress={() => { void openCrisisUrl('tel:988', { manualLabel: '988' }); }}
      >
        <Text style={styles.crisisActionText}>Call 988</Text>
      </Pressable>
    </View>
  ) : null;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="voice-reflection-screen"
      // DEBUG-480. journal-save-button is the only caller of handleSave, whose
      // scanOnSave is the ONLY scan of text the user typed or corrected. Two
      // independent defects made it unreachable with the keyboard up, and both
      // are fixed here — separately, because fixing either alone still loses the
      // text unscanned.
      //
      // OCCLUSION. UIKit intersects the keyboard frame with this ScrollView's
      // frame in WINDOW coordinates and insets natively. That is why this is a
      // native prop rather than a JS keyboard-height listener: a JS
      // `paddingBottom = keyboardHeight` measures against the view's own frame
      // and over-pads by the header + modal-card offset — the exact failure that
      // rules KeyboardAvoidingView out for this screen (useOverlayBottomInset.ts).
      // It is also accessory-inclusive for free: UIKeyboardFrameEndUserInfoKey
      // already covers DEBUG-450's CrisisKeyboardAccessory, so the journal's
      // reachability never becomes a function of that bar's height.
      automaticallyAdjustKeyboardInsets
      // TAP-SWALLOWING. RN's default 'never' let the ScrollView consume the first
      // keyboard-up tap for dismissal, so it never reached handleSave. Under
      // 'handled' the capture-phase handler no longer claims the touch, so the
      // Pressable wins at the leaf; a tap on inert content still blurs via the
      // bubble-phase handler, which is what journal-review-header relies on.
      keyboardShouldPersistTaps="handled"
      // At 375x667 the 180pt transcript field fills the band above the keyboard,
      // so NO layout shows the field and Save at once — scrolling is unavoidable.
      // on-drag makes the scroll gesture itself dismiss the keyboard, so the drag
      // toward Save lands it fully clear instead of scrolling underneath.
      keyboardDismissMode="on-drag"
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
            onPress={finishCapture}
          >
            <Text style={styles.primaryButtonText}>Done</Text>
          </Pressable>
        </View>
      )}

      {phase === 'review' && (
        <View>
          {/* DEBUG-477: testID is a test anchor on inert content, not an affordance.
              Maestro's hideKeyboard swipes at the SCREEN CENTRE, which at 375x667 is
              (187,333) — inside this screen's multiline transcript field (measured
              [25,166][350,344]), where a swipe moves the caret instead of resigning
              first responder. journal-crisis-scan taps this block instead: it has no
              onPress, so the touch falls through to the root ScrollView, which blurs
              the input. Element-anchored, so it does not go stale the way a
              screen-relative point does.
              DEBUG-480 changed the mechanism this relies on and the step still
              works: under keyboardShouldPersistTaps='handled' the ScrollView no
              longer claims the touch in the CAPTURE phase, but this View has no
              onPress, so it declines the responder and the ScrollView still claims
              it on the BUBBLE phase, where release blurs. A Pressable — Save —
              claims at the leaf first and keeps the keyboard up, which is exactly
              the asymmetry the fix needs. */}
          <View testID="journal-review-header">
            <Text style={styles.title}>Check the transcript.</Text>
            <Text style={styles.hint}>Fix anything the transcription got wrong.</Text>
          </View>

          <TextInput
            {...crisisAccessoryProps()} /* DEBUG-450 */
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
            <Text
              style={styles.error}
              testID="journal-save-error"
              // DEBUG-480: this node renders BETWEEN the input and Save and pushes
              // Save down by roughly its own height — on the retry path, where the
              // text has already survived one failed write. Scroll on the error's
              // own layout rather than on keyboard-raise: yanking the view while
              // the user is still editing would move the caret off screen.
              onLayout={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {saveError}
            </Text>
          ) : null}

          {/* DEBUG-480: keeps Save and Discard out of the crisis button's
              contested column. CollapsibleCrisisButton renders at zIndex 9999 and
              wins an overlapping tap, so an un-inset full-width Save that scrolls
              into CRISIS_BUTTON_EXCLUSION_RECT can fire an audit-logged crisis
              navigation AND swallow the save-time scan. This is unconditional:
              the transcript field grows without a cap, so Save's y is not fixed.
              Same shape as the DEBUG-406 composers. */}
          <View style={styles.actionBlock} testID="journal-action-block">
            <Pressable
              style={styles.primaryButton}
              testID="journal-save-button"
              accessibilityRole="button"
              accessibilityLabel="Save this reflection"
              onPress={handleSave}
            >
              <Text style={styles.primaryButtonText}>Save</Text>
            </Pressable>

            {/* DEBUG-480: the 44pt minimum goes on the PRESSABLE. styles.subtleAction
                is a Text style shared with journal-clear-prompt, so growing it there
                would resize an unrelated control. Discard destroys the transcript
                with the save-time scan never having run, so a mis-tap here is
                DEBUG-480's own failure reached by a different route — hence real
                separation from Save, not just a compliant hit rect. */}
            <Pressable
              onPress={handleDiscard}
              testID="journal-discard-button"
              accessibilityRole="button"
              style={styles.discardButton}
            >
              <Text style={styles.discardLabel}>Discard</Text>
            </Pressable>
          </View>
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
  // DEBUG-480 — see the render site. Wraps Save + Discard only.
  actionBlock: {
    paddingRight: OVERLAY_ACTION_ROW_PADDING_RIGHT,
  },
  discardButton: {
    // Real height, not hitSlop: hitSlop enlarges the touch area but not the
    // visible target, which is what WCAG 2.5.5 measures.
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
    alignItems: 'center',
    // Separation from Save. A destructive control flush under the primary one is
    // a coin-flip under a thumb even when both hit rects are compliant.
    marginTop: spacing[16],
  },
  // subtleAction without its marginTop — the spacing now belongs to the
  // Pressable, so the label centres inside the 44pt target instead of being
  // pushed to its bottom edge.
  discardLabel: {
    color: semantic.text.secondary,
    fontSize: typography.bodySmall.size,
    textAlign: 'center',
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
