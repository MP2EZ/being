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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

import { journalCrisisScanner, newJournalDraftId } from '../services/journalCrisisScan';
import { MAX_ENTRY_CHARS, saveEntry } from '../services/journalEntryStore';
import {
  checkOnDeviceAvailability,
  startGuardedRecognition,
} from '@/core/services/speech/onDeviceSpeechGuard';
import { sweepAllAudioArtifacts } from '@/core/services/speech/audioArtifactSweeper';
import { crisisAccessoryProps } from '@/features/crisis/constants/crisisInputAccessory';
import { OVERLAY_ACTION_ROW_PADDING_RIGHT } from '@/features/crisis/constants/crisisButtonGeometry';
import { useKeyboardAvoidingBottomInset } from '@/core/hooks/useKeyboardFrameHeight';

type Phase = 'idle' | 'recording' | 'review' | 'saved' | 'unavailable';

/**
 * DEBUG-516 — at or above this font scale `journal-discard-button` RELOCATES out of the
 * pinned footer and into the scrolling region.
 *
 * RELOCATION, NEVER DELETION, and never Save. Discard keeps its label, its 44pt target and
 * its place in the traversal order; it simply stops competing with Save for the band above
 * the keyboard. It is the right thing to move because it is secondary AND destructive — it
 * throws the transcript away with the save-time scan never having run, so a mis-tap on it
 * is DEBUG-480's own failure reached by another route.
 *
 * ONE module-level constant, read once, evaluated outside every per-control branch — the
 * DEBUG-469 shape. A threshold derived from a measured footer height would oscillate
 * (measure -> shrink -> remeasure), and a per-control threshold drops controls at
 * different scales.
 *
 * 2.6 fires at `accessibility-extra-large` (2.643) and above. Sized so the pinned footer
 * stays under half the band above the keyboard: on a 375x667 SE 3 the band is ~342pt after
 * the sheet inset and nav header, and Save plus Discard reach ~193pt (56%) by AX5 while
 * Save alone stays ~99pt (29%).
 */
const DISCARD_RELOCATION_FONT_SCALE = 2.6;

/**
 * Floor for the transcript field, in scaled lines rather than points.
 *
 * `minHeight: 180` was a fixed pt value against a font that scales, so it held ~7 lines at
 * the default size and ~2 at AX5 — and this step is CORRECTING A LOSSY TRANSCRIPT, so the
 * person doing the proofreading loses exactly the context the task depends on, at exactly
 * the size they asked for more of it. Three lines is degraded but honest; one line with a
 * visible caret is the absolute floor below which the field is not shippable.
 */
const TRANSCRIPT_MIN_LINES = 3;

/** RN's default line box for a text node, as a multiple of its font size. */
const LINE_BOX_RATIO = 1.2;

/**
 * Share of the band above the keyboard the transcript may claim before it yields.
 *
 * A CAP, not just a floor. The field cannot push Save any more — Save is pinned — but an
 * unbounded field still forces a scroll on a layout that would otherwise fit, which is the
 * discovery problem this item exists to remove.
 */
const TRANSCRIPT_MAX_BAND_SHARE = 0.45;

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

  // Identity for ONE capture, so the scanner can dedupe across its two scan points.
  //
  // DEBUG-504: re-minted at handleStart, NOT once per mount. Minted once, a second capture
  // in the same sitting inherited the first one's identity and was skipped at BOTH the
  // Alert and the `crisis_detected` emission — silent, and disguised by the banner from the
  // first disclosure still being on screen. Seeded here for the first capture; every later
  // one re-mints below.
  const draftIdRef = useRef(newJournalDraftId());

  // DEBUG-480: scrolled programmatically when journal-save-error renders, which
  // pushes Save further under the keyboard at exactly the moment the text is at
  // most risk — the save has already failed once, and there is no autosave or
  // draft persistence to fall back on.
  const scrollRef = useRef<ScrollView>(null);

  // DEBUG-516 — the bottom edge has exactly ONE owner, and this is it.
  //
  // Read from the LIVE keyboard frame, never from a measured clearance. UIKit reports key
  // layout + predictive bar + any `inputAccessoryView` as one union, so this number IS the
  // occluding edge rather than a proxy for it: when DEBUG-506 attaches the crisis accessory
  // and the edge rises ~72pt, the inset rises in the same notification. A fix calibrated
  // against DEBUG-480's measured 4pt clearance is correct under exactly one of those two
  // states and cannot be correct under both.
  //
  // Deliberately NOT useOverlayBottomInset(): its MAX with CRISIS_BUTTON_RESERVED_BAND
  // returns 176pt with no keyboard up, a quarter of an SE 3 viewport surrendered in every
  // phase to duplicate protection `styles.actionBlock`'s paddingRight already provides.
  // The band is the shape for a centred card; a bottom-anchored row dodges the button
  // HORIZONTALLY. Vertical space above the keyboard is the scarce resource here.
  //
  // A MAX with the safe area, never a sum — the same rule the overlay inset records.
  const keyboardInset = useKeyboardAvoidingBottomInset();
  const safeAreaBottom = useSafeAreaInsets().bottom;
  const bottomInset = Math.max(keyboardInset, safeAreaBottom);

  const { height: windowHeight, fontScale } = useWindowDimensions();
  const discardInFooter = fontScale < DISCARD_RELOCATION_FONT_SCALE;

  // The transcript yields; Save never does. Expressed in scaled line boxes so the floor
  // means the same thing at every text size, with 180 kept as the default-size value so
  // this is not a silent relayout for the 90% case.
  const transcriptLineBox = typography.bodyRegular.size * fontScale * LINE_BOX_RATIO;
  const transcriptMinHeight = Math.max(
    180,
    TRANSCRIPT_MIN_LINES * transcriptLineBox + spacing[16] * 2,
  );
  const transcriptMaxHeight = Math.max(
    transcriptMinHeight,
    (windowHeight - keyboardInset) * TRANSCRIPT_MAX_BAND_SHARE,
  );

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

    // DEBUG-504 — a capture BEGINS here, and this is the only place it can. Deliberately
    // AFTER both guards, so a failed availability check or a refused start does not consume
    // an identity: "has an identity" stays coextensive with "a capture is in progress".
    //
    // Deliberately NOT in handleDiscard. Discard is today's only route back to `idle`, so
    // the two are equivalent right now — but the invariant belongs to the capture, not to
    // the way the previous one ended. ANY future affordance that starts a capture (a retry
    // from `unavailable`, a "write another" from `saved`, a re-record from `review`) MUST
    // route through here, or the second disclosure goes silent again.
    //
    // Never between a capture's two scan points: scanOnFinalize and scanOnSave over one
    // capture must observe the SAME id, or one disclosure splits into two Alerts.
    draftIdRef.current = newJournalDraftId();
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

  // DEBUG-516 — the restructure OWES this, so it ships with the restructure.
  //
  // Today `journal-crisis-banner` is the first child of a FULL-SCREEN ScrollView, so "first
  // child" and "top of the viewport" coincide and a disclosure is always on screen. Once
  // the footer is pinned the scroll region is a fraction of the screen, and a modest offset
  // carries the banner — and `journal-crisis-call-988` with it — above the visible area.
  //
  // The rising edge can only land in a scrolled position on ONE path. scanOnFinalize also
  // transitions out of `recording`, and a successful scanOnSave transitions to `saved`; the
  // exception is a save that FAILS and discloses, which leaves phase `review` with the view
  // wherever the user left it. DEBUG-480's objection to scrolling mid-edit does not apply —
  // that was about the save-error scroll yanking the caret, and there is no scan during
  // editing to raise this edge.
  //
  // NOT pinned instead: at AX5 the banner's title alone runs several line boxes and would
  // consume the whole band above the keyboard before Save or the transcript got any of it.
  // Its un-pinnability is what makes the rest of this layout affordable.
  const wasCrisisActive = useRef(false);
  useEffect(() => {
    if (crisisActive && !wasCrisisActive.current) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
    wasCrisisActive.current = crisisActive;
  }, [crisisActive]);

  const handleDiscard = useCallback(() => {
    // Deliberately does NOT clear an active intervention: discarding the text
    // does not undo the disclosure.
    journalCrisisScanner.onDraftDiscarded(draftIdRef.current);
    setTranscript('');
    setPhase('idle');
  }, []);

  /**
   * DEBUG-480: the 44pt minimum goes on the PRESSABLE. `styles.subtleAction` is a Text
   * style shared with journal-clear-prompt, so growing it there would resize an unrelated
   * control. Discard destroys the transcript with the save-time scan never having run, so
   * a mis-tap here is DEBUG-480's own failure reached by a different route — hence real
   * separation from Save, not just a compliant hit rect.
   *
   * DEBUG-516: hoisted to a binding so it can render in the pinned footer or in the scroll
   * region without a second copy. One element, one set of props — a duplicated JSX branch
   * is how the two homes would drift apart on a label, a testID, or the 44pt floor.
   */
  const discardButton = (
    <Pressable
      onPress={handleDiscard}
      testID="journal-discard-button"
      accessibilityRole="button"
      style={styles.discardButton}
    >
      <Text style={styles.discardLabel}>Discard</Text>
    </Pressable>
  );

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
    // DEBUG-516 — the OUTER container owns the bottom edge, and carries the screen
    // identity. `voice-reflection-screen` has to live here rather than on the scroller:
    // both Maestro flows assert it as the screen-identity oracle, so it must exist in all
    // five phases, and the node that scrolls no longer wraps everything.
    <View style={[styles.container, { paddingBottom: bottomInset }]} testID="voice-reflection-screen">
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      testID="voice-reflection-scroll"
      // DEBUG-480. journal-save-button is the only caller of handleSave, whose
      // scanOnSave is the ONLY scan of text the user typed or corrected. Two
      // independent defects made it unreachable with the keyboard up, and both
      // are fixed here — separately, because fixing either alone still loses the
      // text unscanned.
      //
      // OCCLUSION — DEBUG-516 CORRECTION. Until DEBUG-516 this prop WAS the reachability
      // mechanism and this comment said so. It is not any more, and leaving the old prose
      // here is how the next reader re-derives the wrong mental model.
      //
      // It insets scroll CONTENT (contentInset.bottom); it does not move contentOffset and
      // it cannot reposition anything outside this ScrollView. So it could never have
      // rescued a pinned footer, and it did not rescue Save at XXXL either — the content
      // simply became scrollable and the button stayed under the keyboard at rest.
      //
      // Retained for the scroll region's own content and for the animation transient, where
      // the JS inset lags the native frame by a frame or two. Once the container's
      // paddingBottom ends this subtree at the keyboard top, the native intersection is
      // zero, so the two do not fight; they are self-cancelling rather than additive.
      //
      // The old comment also claimed accessory-inclusiveness "for free" via
      // UIKeyboardFrameEndUserInfoKey. That is true of the notification and is now what the
      // CONTAINER inset relies on — but it was never exercised here, because DEBUG-506
      // found the accessory never attaches, so no build has produced a non-zero bar for
      // this prop to absorb. It is an untested premise; do not lean on it.
      automaticallyAdjustKeyboardInsets
      // TAP-SWALLOWING. RN's default 'never' let the ScrollView consume the first
      // keyboard-up tap for dismissal, so it never reached handleSave. Under
      // 'handled' the capture-phase handler no longer claims the touch, so the
      // Pressable wins at the leaf; a tap on inert content still blurs via the
      // bubble-phase handler, which is what journal-review-header relies on.
      keyboardShouldPersistTaps="handled"
      // DEBUG-516: DEBUG-480's rationale for this — "the drag toward Save lands it fully
      // clear" — is void now that Save is pinned and needs no scroll. It stays for a
      // different and currently stronger reason: the field is multiline, so Return inserts
      // a newline and there is no Done key, which makes a gesture the ONLY dismissal here.
      // While DEBUG-506 is open there is no working keyboard-up 988 affordance on this
      // surface, so dismissal is also the only route back to a state where the root crisis
      // button is reachable — and `on-drag` makes that recovery a by-product of ordinary
      // scrolling rather than a deliberate act. `interactive` dismisses only on a drag that
      // pulls the keyboard down, which is exactly as undiscoverable as the gesture this
      // item exists to stop relying on. Revisit once DEBUG-506 lands.
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

          {/* DEBUG-516: the floor and cap are scale-derived, applied inline because both
              depend on values only available at render. What is SCANNED is unaffected —
              scanOnSave reads the `transcript` state string, never rendered text, so
              clipping or scrolling this field changes what the user SEES and nothing
              about what the crisis scanner receives. */}
          <TextInput
            {...crisisAccessoryProps()} /* DEBUG-450 */
            style={[
              styles.input,
              { minHeight: transcriptMinHeight, maxHeight: transcriptMaxHeight },
            ]}
            testID="journal-transcript-input"
            accessibilityLabel="Your reflection transcript"
            value={transcript}
            onChangeText={setTranscript}
            multiline
            maxLength={MAX_ENTRY_CHARS}
            textAlignVertical="top"
          />

          {/* DEBUG-516: Discard's second home. Above the threshold it scrolls with the
              transcript rather than crowding Save in the pinned footer. */}
          {!discardInFooter && discardButton}
        </View>
      )}

      {/* `saved` is terminal by design — no affordance back to `idle`. DEBUG-504: if a
          "write another" ever lands below, it MUST go through handleStart, which is where a
          capture's identity is minted. Anything reaching `recording` another way inherits
          the previous capture's id and silences its disclosure. */}
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

      {/* ── THE PINNED FOOTER (DEBUG-516) ────────────────────────────────────────────
          A plain flex sibling of the scroll region — never position:'absolute' (RN
          resolves it against the parent's PADDING BOX, the DEBUG-403 trap), never a
          Modal or the root overlay slot, either of which would paint above the crisis
          button. Same shape as DailyLoopDepthSelectScreen.

          WHY PINNED AT ALL. Inside the scroller, Save's y was a function of the heading
          and transcript above it, which is precisely what Dynamic Type changes: the
          keyboard band is identical at every text size, and only Save moved. Pinned, its
          clearance is non-negative BY CONSTRUCTION rather than by arithmetic that has to
          be re-measured every time a string, a locale, or the keyboard's own chrome moves.

          It also retires DEBUG-480's tap-swallowing negotiation for this control: with no
          ScrollView ancestor there is no capture-phase claimant, so the Pressable wins the
          first keyboard-up tap outright instead of relying on keyboardShouldPersistTaps
          resolving in its favour. That prop still matters for the scroll region, where
          journal-review-header's dismissal depends on the BUBBLE phase.

          paddingRight is DEBUG-480's and is MORE load-bearing here, not less: pinned to
          the bottom edge this row now sits permanently inside CRISIS_BUTTON_EXCLUSION_RECT's
          vertical band when the keyboard is down, so horizontal exclusion is the only thing
          keeping a Save tap out of a control that renders at zIndex 9999 and WINS an
          overlapping tap — which would fire an audit-logged crisis navigation AND swallow
          the save-time scan. */}
      {phase === 'review' && (
        <View style={styles.actionBlock} testID="journal-action-block">
          {saveError ? (
            <Text
              style={styles.error}
              testID="journal-save-error"
              // DEBUG-516 supersedes DEBUG-480's scrollToEnd, which existed only because
              // this node pushed Save down. It cannot any more, and left in place it would
              // fight the scroll-to-top that reveals a banner disclosed on this same
              // failure path — two programmatic scrolls in one commit wanting opposite
              // offsets. In the footer it is visible with no scroll at all, adjacent to the
              // control it refers to, on the one path where the text has already survived a
              // failed write with no autosave behind it.
              //
              // WCAG 4.1.3. The scroll was the only handling this ever had, and it is
              // visual: without the live region a VoiceOver user gets no signal that the
              // save failed.
              accessibilityLiveRegion="assertive"
            >
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
            {/* No maxFontSizeMultiplier, deliberately. This is the sole entry to the app's
                only save-time crisis scan, and the house rule is that capping text growth
                on a crisis affordance inverts the priority. Discard relocates instead. */}
            <Text style={styles.primaryButtonText}>Save</Text>
          </Pressable>

          {discardInFooter && discardButton}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // DEBUG-516: the outer container. paddingBottom is applied inline from the live
  // keyboard frame — a MAX with the safe area, never a sum.
  container: { flex: 1, backgroundColor: semantic.background.screen },
  // flex lets the prose and transcript YIELD space to the pinned footer rather than
  // pushing it off screen — the whole point of the split.
  scroll: { flex: 1 },
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
    // minHeight and maxHeight are applied inline: both are scale-derived. The old fixed
    // `minHeight: 180` held ~7 lines at the default size and ~2 at AX5.
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
  // DEBUG-480/516 — see the render site. Pinned; wraps the save error, Save, and Discard
  // when Discard has not relocated.
  actionBlock: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[8],
    paddingBottom: spacing[16],
    // MUST come after paddingHorizontal — RN StyleSheet is last-key-wins, so a
    // paddingHorizontal declared afterwards would silently overwrite the inset and restore
    // the collision with the crisis button, with no visible diff.
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
