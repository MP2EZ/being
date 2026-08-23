/**
 * VoiceReflectionScreen — safety contract specs (FEAT-283 Slice A)
 *
 * Covers what the Maestro flow cannot: the save-path branches, the
 * non-retraction rule, and that saving is never blocked by an intervention.
 * The Maestro flow covers what this cannot: that the contract holds in a real
 * build on a real device.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Keyboard, Linking, useWindowDimensions } from 'react-native';

jest.mock('@/core/services/speech/onDeviceSpeechGuard', () => ({
  checkOnDeviceAvailability: jest.fn().mockResolvedValue({ available: true }),
  startGuardedRecognition: jest.fn().mockResolvedValue({ started: true }),
}));

jest.mock('@/core/services/speech/audioArtifactSweeper', () => ({
  sweepAllAudioArtifacts: jest.fn().mockReturnValue(0),
}));

jest.mock('expo-speech-recognition', () => ({
  // Event subscription is a no-op here: the specs drive the transcript through
  // the TextInput, which is the same path the Maestro flow uses and the only
  // path available on a device that cannot speak.
  useSpeechRecognitionEvent: jest.fn(),
  ExpoSpeechRecognitionModule: { stop: jest.fn() },
}));

jest.mock('@/features/crisis/services/crisisAlert', () => ({
  showCrisisAlert: jest.fn(),
}));

jest.mock('../../services/journalEntryStore', () => ({
  MAX_ENTRY_CHARS: 20000,
  saveEntry: jest.fn().mockResolvedValue({ saved: true, entry: { id: 'x' } }),
}));

import { checkOnDeviceAvailability } from '@/core/services/speech/onDeviceSpeechGuard';
import { sweepAllAudioArtifacts } from '@/core/services/speech/audioArtifactSweeper';
import { showCrisisAlert } from '@/features/crisis/services/crisisAlert';
import { saveEntry } from '../../services/journalEntryStore';
import { VoiceReflectionScreen } from '../VoiceReflectionScreen';
import { OVERLAY_ACTION_ROW_PADDING_RIGHT } from '@/features/crisis/constants/crisisButtonGeometry';

const mockSave = saveEntry as jest.Mock;
const mockAlert = showCrisisAlert as jest.Mock;
const mockAvailability = checkOnDeviceAvailability as jest.Mock;
const mockSweep = sweepAllAudioArtifacts as jest.Mock;

/** RN accepts a style, an array, or nested arrays; flatten before asserting. */
function flatten(style: unknown): Record<string, number> {
  if (!style) return {};
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatten));
  return style as Record<string, number>;
}

const CRISIS_TEXT = 'i want to die';
const CLEAN_TEXT = 'today was hard but i made it through';

/** iPhone SE 3, the device every DEBUG-480/507/516 measurement was taken on. */
const SE3 = { width: 375, height: 667, scale: 2 };

/**
 * The keyboard window measured on that device — the FULL window `[0,407][375,667]`,
 * not `UIKeyboardLayoutStar Preview` `[0,451][375,667]`, which reports the key layout
 * only and under-reports the occluding edge by the ~44pt predictive bar
 * (profile-voice-reflection-xxxl.yaml).
 */
const SE3_KEYBOARD_HEIGHT = 260;

/** Render at a given Dynamic Type scale. 1 = default; 1.353 = XXXL; 3.571 = AX5. */
function setFontScale(fontScale: number): void {
  (useWindowDimensions as unknown as jest.Mock).mockReturnValue({ ...SE3, fontScale });
}

/**
 * Drive the module-level keyboard store the way iOS does.
 *
 * Captured from the `Keyboard.addListener` mock rather than emitted, because the store
 * subscribes lazily — a handler captured before the first consumer mounts does not exist.
 */
function emitKeyboard(height: number): void {
  const calls = (Keyboard.addListener as jest.Mock).mock.calls;
  act(() => {
    for (const [event, handler] of calls) {
      if (height > 0 && (event === 'keyboardWillChangeFrame' || event === 'keyboardDidShow')) {
        handler({ endCoordinates: { height, screenY: SE3.height - height } });
      }
      if (height === 0 && (event === 'keyboardWillHide' || event === 'keyboardDidHide')) {
        handler({});
      }
    }
  });
}

/** Drive the screen to the transcript-review phase. */
async function reachReview(text: string) {
  const utils = render(<VoiceReflectionScreen />);
  fireEvent.press(utils.getByTestId('journal-record-button'));
  await waitFor(() => utils.getByTestId('journal-stop-button'));
  fireEvent.press(utils.getByTestId('journal-stop-button'));
  const input = await waitFor(() => utils.getByTestId('journal-transcript-input'));
  fireEvent.changeText(input, text);
  return utils;
}

/** Component/host names of every ancestor of `node`, innermost first. */
function ancestorTypeNames(node: { parent: unknown } | null): string[] {
  const names: string[] = [];
  let cur = (node as { parent: unknown } | null)?.parent as
    | { parent: unknown; type?: unknown }
    | null
    | undefined;
  while (cur) {
    const t = cur.type as string | { displayName?: string; name?: string } | undefined;
    names.push(typeof t === 'string' ? t : (t?.displayName ?? t?.name ?? ''));
    cur = cur.parent as typeof cur;
  }
  return names;
}

const hasScrollAncestor = (node: { parent: unknown } | null): boolean =>
  ancestorTypeNames(node).some((n) => /scrollview/i.test(n));

/** testIDs of every ancestor of `node`, innermost first. */
function ancestorTestIds(node: { parent: unknown } | null): string[] {
  const ids: string[] = [];
  let cur = node as { parent: unknown; props?: Record<string, unknown> } | null;
  while (cur) {
    const id = cur.props?.testID;
    if (typeof id === 'string') ids.push(id);
    cur = cur.parent as typeof cur;
  }
  return ids;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSave.mockResolvedValue({ saved: true, entry: { id: 'x' } });
  mockAvailability.mockResolvedValue({ available: true });
  mockSweep.mockReturnValue(0);
  // clearAllMocks wipes the return value the shared setup installed, and the screen
  // destructures it — without this every spec in the file throws on render.
  setFontScale(1);
});

describe('transcript editing', () => {
  it('exposes a real editable TextInput', async () => {
    // Non-negotiable: a simulator cannot speak, so this is what makes the
    // safety path drivable end-to-end. If this stops being a text input, the
    // Maestro safety flow cannot run and the feature cannot ship.
    const { getByTestId } = await reachReview('anything');
    const input = getByTestId('journal-transcript-input');

    fireEvent.changeText(input, 'corrected words');
    expect(input.props.value).toBe('corrected words');
  });

  it('frames the step as correcting the transcript, not revising the reflection', async () => {
    const { getByText } = await reachReview('anything');
    expect(getByText('Check the transcript.')).toBeTruthy();
    expect(getByText('Fix anything the transcription got wrong.')).toBeTruthy();
  });
});

describe('crisis scan on save', () => {
  it('shows the persistent banner and still saves', async () => {
    const utils = await reachReview(CRISIS_TEXT);

    fireEvent.press(utils.getByTestId('journal-save-button'));

    await waitFor(() => expect(utils.getByTestId('journal-crisis-banner')).toBeTruthy());
    // Saving is never blocked, refused, or gated on acknowledging support.
    expect(mockSave).toHaveBeenCalled();
  });

  it('surfaces the canonical alert, not bespoke copy', async () => {
    const utils = await reachReview(CRISIS_TEXT);
    fireEvent.press(utils.getByTestId('journal-save-button'));

    await waitFor(() => expect(mockAlert).toHaveBeenCalledTimes(1));
  });

  it('does NOT show the banner for a clean entry', async () => {
    const utils = await reachReview(CLEAN_TEXT);
    fireEvent.press(utils.getByTestId('journal-save-button'));

    await waitFor(() => utils.getByTestId('journal-saved-state'));
    expect(utils.queryByTestId('journal-crisis-banner')).toBeNull();
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('keeps the banner after the user edits the crisis language out', async () => {
    const utils = await reachReview(CRISIS_TEXT);
    fireEvent.press(utils.getByTestId('journal-save-button'));
    await waitFor(() => utils.getByTestId('journal-crisis-banner'));

    // One-way escalation: already-surfaced support stays surfaced.
    expect(utils.getByTestId('journal-crisis-banner')).toBeTruthy();
  });

  it('offers a 988 action with an accessible label and a 44pt tap target', async () => {
    const utils = await reachReview(CRISIS_TEXT);
    fireEvent.press(utils.getByTestId('journal-save-button'));

    const action = await waitFor(() => utils.getByTestId('journal-crisis-call-988'));
    expect(action.props.accessibilityLabel).toContain('988');
    const flat = Array.isArray(action.props.style)
      ? Object.assign({}, ...action.props.style)
      : action.props.style;
    expect(flat.minHeight).toBeGreaterThanOrEqual(44);
  });

  describe('the 988 action actually dials (DEBUG-314)', () => {
    // This banner shipped in FEAT-283 with a bare `Linking.openURL('tel:988')`
    // — introduced AFTER the audit that catalogued that exact bug class. The
    // test above proved the button rendered; nothing proved it dialled, so a
    // silent failure here was invisible.
    beforeEach(() => {
      (Linking.openURL as jest.Mock).mockClear();
      (Linking.canOpenURL as jest.Mock).mockClear();
      (Alert.alert as jest.Mock).mockClear();
    });

    it('dials 988 through the canOpenURL guard', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(true);

      const utils = await reachReview(CRISIS_TEXT);
      fireEvent.press(utils.getByTestId('journal-save-button'));
      fireEvent.press(await waitFor(() => utils.getByTestId('journal-crisis-call-988')));

      await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('tel:988'));
      expect(Linking.canOpenURL).toHaveBeenCalledWith('tel:988');
    });

    it('shows a manual-dial instruction when the device cannot open tel:', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);

      const utils = await reachReview(CRISIS_TEXT);
      fireEvent.press(utils.getByTestId('journal-save-button'));
      fireEvent.press(await waitFor(() => utils.getByTestId('journal-crisis-call-988')));

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith(
          'Unable to Call',
          'Please manually dial 988 for support.',
          expect.any(Array)
        )
      );
      expect(Linking.openURL).not.toHaveBeenCalled();
    });
  });
});

describe('keyboard reachability of the save control (DEBUG-480)', () => {
  // journal-save-button is the ONLY caller of handleSave, whose scanOnSave is the
  // ONLY scan of text the user typed or corrected. scanOnFinalize runs on the
  // PRE-EDIT transcript, and on a simulator (which cannot speak) it scans ''.
  // So an unreachable Save does not defer the crisis scan — it destroys the text
  // unscanned. These pin the two independent defects separately, because fixing
  // the occlusion while leaving the tap-swallowing still loses the text.
  //
  // Assertions read the RENDERED TREE, never the file's source. A source-string
  // pin would match the prose in this screen that names the old
  // keyboardShouldPersistTaps='never' behaviour to warn readers off it (DEBUG-390).
  //
  // jest has no keyboard and no layout: these are shape pins. The behavioural
  // evidence is the keyboard-up block in .maestro/journal-crisis-scan.yaml.

  // DEBUG-516 re-anchored these three. `voice-reflection-screen` is now the OUTER
  // container — it has to be, because both Maestro flows assert it as the screen-identity
  // oracle and it must exist in all five phases. Read scroll props off the node that
  // actually scrolls; a scroll-prop assertion on a non-scrolling View is green and inert.

  it('does not let the ScrollView swallow the first keyboard-up tap', async () => {
    const utils = await reachReview(CLEAN_TEXT);
    const scroll = utils.getByTestId('voice-reflection-scroll');
    // 'handled' — NOT true/'always', which would stop inert content from
    // blurring the input and break journal-review-header's dismissal.
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
  });

  it('keeps the native keyboard inset on the scroll region, no longer load-bearing', async () => {
    const utils = await reachReview(CLEAN_TEXT);
    const scroll = utils.getByTestId('voice-reflection-scroll');
    // DEBUG-516 CORRECTION. Until DEBUG-516 this prop WAS the reachability mechanism,
    // and this spec said so. It is not any more: the outer container's paddingBottom
    // owns the bottom edge, and once the subtree ends at the keyboard top the native
    // intersection is zero. Retained for scroll CONTENT and for the animation
    // transient only. Save's reachability is pinned below, against the container.
    expect(scroll.props.automaticallyAdjustKeyboardInsets).toBe(true);
  });

  it('offers a dismissal that does not depend on tapping a specific element', async () => {
    const utils = await reachReview(CLEAN_TEXT);
    const scroll = utils.getByTestId('voice-reflection-scroll');
    // The transcript field is multiline, so Return inserts a newline and there is no
    // Done key, so a gestural dismissal is the only one.
    //
    // An ACCEPTED SET, not a free-form invariant: an assertion loose enough to pass on
    // 'none' is worse than the literal it replaced. 'interactive' is deliberately
    // EXCLUDED while DEBUG-506 is open — it dismisses only on a drag that pulls the
    // keyboard down, so a scroll to re-read the transcript keeps the keyboard and keeps
    // this surface's zero-988 window. It becomes a legitimate UX call once DEBUG-506
    // lands and keyboard-up 988 no longer depends on dismissal at all.
    expect(['on-drag']).toContain(scroll.props.keyboardDismissMode);
  });

  it('keeps Save and Discard out of the crisis button contested column', async () => {
    const utils = await reachReview(CLEAN_TEXT);
    const block = utils.getByTestId('journal-action-block');
    const flat = flatten(block.props.style);
    // Both controls live inside it.
    expect(utils.getByTestId('journal-save-button')).toBeTruthy();
    expect(utils.getByTestId('journal-discard-button')).toBeTruthy();
    // CollapsibleCrisisButton renders at zIndex 9999 and wins an overlapping tap,
    // so a full-width Save that scrolls into the exclusion rect could fire an
    // audit-logged crisis navigation AND swallow the save-time scan.
    expect(flat.paddingRight).toBe(OVERLAY_ACTION_ROW_PADDING_RIGHT);
    expect(flat.paddingRight).toBeGreaterThan(0);
  });

  it('gives Discard a real 44pt target on the pressable, not on its label', async () => {
    const utils = await reachReview(CLEAN_TEXT);
    const discard = utils.getByTestId('journal-discard-button');
    const flat = flatten(discard.props.style);
    // Discard destroys the transcript with the save-time scan never having run,
    // so a mis-tap here is DEBUG-480's own failure by another route.
    expect(flat.minHeight).toBeGreaterThanOrEqual(44);
    // Separation from Save — a destructive control flush under the primary one
    // is a coin-flip under a thumb even when both hit rects are compliant.
    expect(flat.marginTop).toBeGreaterThan(0);
  });

  it('renders the save error inside the pinned footer, not in the scroll region', async () => {
    mockSave.mockResolvedValue({ saved: false, reason: 'unknown' });
    const utils = await reachReview(CLEAN_TEXT);
    fireEvent.press(utils.getByTestId('journal-save-button'));

    const err = await waitFor(() => utils.getByTestId('journal-save-error'));
    // DEBUG-516 supersedes DEBUG-480's scrollToEnd. That call existed because the error
    // pushed Save down; with Save pinned it no longer can. Left in place it would fight
    // the scroll-to-top that reveals a banner disclosed on this same failure path — two
    // programmatic scrolls in one commit wanting opposite offsets. Moving the error into
    // the footer retires the fragile behaviour instead of retargeting it, and puts the
    // message adjacent to the control it refers to, visible with no scroll at all.
    const ancestors = ancestorTestIds(err);
    expect(ancestors).toContain('journal-action-block');
    expect(ancestors).not.toContain('voice-reflection-scroll');
    expect(err.props.onLayout).toBeUndefined();
  });

  it('announces the save error to assistive tech', async () => {
    mockSave.mockResolvedValue({ saved: false, reason: 'unknown' });
    const utils = await reachReview(CLEAN_TEXT);
    fireEvent.press(utils.getByTestId('journal-save-button'));

    const err = await waitFor(() => utils.getByTestId('journal-save-error'));
    // WCAG 4.1.3. The only prior handling was the scrollToEnd, which is visual; removing
    // it without replacement would leave a VoiceOver user with no signal that the save
    // failed, on the one path where the text has already survived one failed write and
    // there is no autosave or draft persistence.
    expect(err.props.accessibilityLiveRegion).toBe('assertive');
  });

  it('writes one entry when Save is double-tapped', async () => {
    let release: (v: unknown) => void = () => {};
    mockSave.mockImplementationOnce(
      () => new Promise((res) => { release = res; })
    );
    const utils = await reachReview(CLEAN_TEXT);
    const save = utils.getByTestId('journal-save-button');

    // Making Save smaller and scroll-dependent makes double-tapping MORE likely,
    // so the guard ships with the fix that causes it.
    fireEvent.press(save);
    fireEvent.press(save);
    release({ saved: true, entry: { id: 'x' } });
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
  });
});

describe('save failures', () => {
  it('reports a failure instead of silently losing the reflection', async () => {
    mockSave.mockResolvedValue({ saved: false, reason: 'storage_failed' });
    const utils = await reachReview(CLEAN_TEXT);

    fireEvent.press(utils.getByTestId('journal-save-button'));

    await waitFor(() => expect(utils.getByTestId('journal-save-error')).toBeTruthy());
    // Still on the review screen, text intact — the user can retry.
    expect(utils.getByTestId('journal-transcript-input').props.value).toBe(CLEAN_TEXT);
  });

  it('still surfaces the crisis banner when the save itself fails', async () => {
    mockSave.mockResolvedValue({ saved: false, reason: 'storage_failed' });
    const utils = await reachReview(CRISIS_TEXT);

    fireEvent.press(utils.getByTestId('journal-save-button'));

    // Support must not be contingent on a successful write.
    await waitFor(() => expect(utils.getByTestId('journal-crisis-banner')).toBeTruthy());
  });
});

describe('raw audio lifecycle (AC #3)', () => {
  it('sweeps audio artifacts when the recording is stopped', async () => {
    await reachReview('anything');
    expect(mockSweep).toHaveBeenCalled();
  });

  it('sweeps even when stopping the recognizer throws', async () => {
    const { ExpoSpeechRecognitionModule } = jest.requireMock('expo-speech-recognition');
    ExpoSpeechRecognitionModule.stop.mockImplementationOnce(() => {
      throw new Error('not running');
    });

    // The sweep is in a `finally`: cleanup must not be contingent on a clean
    // stop, which is exactly the case where a file is most likely stranded.
    const utils = render(<VoiceReflectionScreen />);
    fireEvent.press(utils.getByTestId('journal-record-button'));
    await waitFor(() => utils.getByTestId('journal-stop-button'));
    fireEvent.press(utils.getByTestId('journal-stop-button'));

    await waitFor(() => expect(mockSweep).toHaveBeenCalled());
  });

  it('does not break the flow when the sweep itself throws', async () => {
    mockSweep.mockImplementationOnce(() => {
      throw new Error('cache locked');
    });

    const utils = await reachReview('a reflection');
    expect(utils.getByTestId('journal-transcript-input')).toBeTruthy();
  });
});

describe('on-device guarantee', () => {
  it('refuses to record and explains why when on-device STT is unavailable', async () => {
    mockAvailability.mockResolvedValue({
      available: false,
      reason: 'no_on_device_support',
    });
    const { getByTestId } = render(<VoiceReflectionScreen />);

    fireEvent.press(getByTestId('journal-record-button'));

    // Honest dead end rather than a silent downgrade to cloud transcription.
    await waitFor(() => expect(getByTestId('journal-unavailable-state')).toBeTruthy());
  });
});

describe('framing invariants', () => {
  it('offers a prompt that can be dismissed — never a gate', async () => {
    const { getByTestId, getByText } = render(<VoiceReflectionScreen />);
    expect(getByText(/Go back through the day/)).toBeTruthy();

    fireEvent.press(getByTestId('journal-clear-prompt'));

    expect(getByText('Speak whatever’s here.')).toBeTruthy();
  });

  it('has no minimum-length gate — the save action is always available', async () => {
    // A length gate would make the app judge whether you examined enough,
    // which inverts the practice (the censor must be the self).
    const utils = await reachReview('ok');
    expect(utils.getByTestId('journal-save-button')).toBeTruthy();

    fireEvent.press(utils.getByTestId('journal-save-button'));
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
  });

  it('renders no streak, count, or duration anywhere in the flow', async () => {
    const utils = await reachReview(CLEAN_TEXT);
    fireEvent.press(utils.getByTestId('journal-save-button'));
    await waitFor(() => utils.getByTestId('journal-saved-state'));

    expect(utils.queryByText(/streak/i)).toBeNull();
    expect(utils.queryByText(/\b\d+ (entries|reflections|days)\b/i)).toBeNull();
    // Numeric counts only. The prose "Only your words remain" is not a word
    // count — the invariant forbids quantifying the practice, not the noun.
    expect(utils.queryByText(/\d+\s*(words?|characters?|min(ute)?s?)\b/i)).toBeNull();
  });
});

describe('a second disclosure in one screen session (DEBUG-504)', () => {
  // THE DEFECT THIS PINS
  //
  // `draftIdRef` was minted once per mount, and nothing regenerated it — not
  // `handleDiscard`, which resets the transcript and the phase but not the ref.
  // `onDraftDiscarded` is an intentional no-op on the intervention, so the id stayed in
  // the scanner's `active` set, and the scanner skips BOTH the Alert and the telemetry
  // emission when a draft is already active. So a genuinely separate disclosure raised no
  // Alert and wrote no `crisis_detected` row.
  //
  // It presents as working, which is why manual testing cannot find it: `crisisActive` is
  // never reset either, so the banner from the FIRST disclosure is still on screen and the
  // screen looks like it handled the second one.
  //
  // WHY THE SEQUENCE GOES THROUGH A FAILED SAVE. A successful save moves the phase to
  // `saved`, which is terminal and offers no Discard — so the only in-mount route back to
  // `idle` is Discard from `review`, and the only way to have ALREADY disclosed while still
  // in `review` is a save that failed. That is a real path (the retry is what the
  // save-error branch exists for), and it is the shortest reachable one.

  async function discloseViaFailedSave() {
    mockSave.mockResolvedValueOnce({ saved: false, reason: 'unknown' });
    const utils = await reachReview(CRISIS_TEXT);
    fireEvent.press(utils.getByTestId('journal-save-button'));
    await waitFor(() => expect(mockAlert).toHaveBeenCalledTimes(1));
    return utils;
  }

  it('raises a second Alert for a second capture that discloses again', async () => {
    const utils = await discloseViaFailedSave();

    // Discard: the disclosure is NOT retracted, but the capture is over.
    fireEvent.press(utils.getByTestId('journal-discard-button'));
    await waitFor(() => utils.getByTestId('journal-record-button'));

    // A NEW capture, disclosing the same thing. Same words are not the same disclosure.
    fireEvent.press(utils.getByTestId('journal-record-button'));
    await waitFor(() => utils.getByTestId('journal-stop-button'));
    fireEvent.press(utils.getByTestId('journal-stop-button'));
    const input = await waitFor(() => utils.getByTestId('journal-transcript-input'));
    fireEvent.changeText(input, CRISIS_TEXT);
    fireEvent.press(utils.getByTestId('journal-save-button'));

    await waitFor(() => expect(mockAlert).toHaveBeenCalledTimes(2));
  });

  it('keeps the banner and the 988 action mounted throughout — escalation is one-way', async () => {
    const utils = await discloseViaFailedSave();
    expect(utils.getByTestId('journal-crisis-banner')).toBeTruthy();
    expect(utils.getByTestId('journal-crisis-call-988')).toBeTruthy();

    fireEvent.press(utils.getByTestId('journal-discard-button'));
    await waitFor(() => utils.getByTestId('journal-record-button'));

    // Still there after the discard AND after a new capture begins: a new draft identity
    // must not read as "the intervention is over". Re-raising the banner would also be
    // wrong — unmounting a live <3-tap route to 988 is a reduction in support.
    expect(utils.getByTestId('journal-crisis-banner')).toBeTruthy();
    fireEvent.press(utils.getByTestId('journal-record-button'));
    await waitFor(() => utils.getByTestId('journal-stop-button'));
    expect(utils.getByTestId('journal-crisis-banner')).toBeTruthy();
    expect(utils.getByTestId('journal-crisis-call-988')).toBeTruthy();
  });

  it('still raises exactly ONE Alert when one capture is scanned at both points', async () => {
    // The dedupe that MUST survive: scanOnFinalize + scanOnSave over one capture is one
    // episode. This is the q9-single-alert family's reasoning and the reason draftId
    // exists at all — the fix must not buy the second Alert by losing this.
    const utils = await reachReview(CRISIS_TEXT);
    fireEvent.press(utils.getByTestId('journal-save-button'));
    await waitFor(() => utils.getByTestId('journal-saved-state'));
    expect(mockAlert).toHaveBeenCalledTimes(1);
  });

  it('does not re-alert when a save fails and is retried on the same capture', async () => {
    const utils = await discloseViaFailedSave();

    // Same capture, same identity — a retry is not a new disclosure.
    fireEvent.press(utils.getByTestId('journal-save-button'));
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(2));
    expect(mockAlert).toHaveBeenCalledTimes(1);
  });
});

/**
 * DEBUG-516 — the save control is pinned, and its bottom inset is read from the LIVE
 * keyboard frame.
 *
 * THE DEFECT. At `extra-extra-extra-large` on iPhone SE 3, `journal-save-button` measured
 * [24,415][279,473] against a full keyboard window of [0,407][375,667] — 100% covered,
 * 37pt under the edge. The keyboard band is identical at every text size; what moves is
 * Save, pushed down by the heading and transcript box growing above it. DEBUG-480 fixed
 * the default size only and left 4pt of clearance, which is one Dynamic Type step from
 * failing. It failed.
 *
 * WHY THE INSET IS FRAME-DERIVED AND NOT CLEARANCE-DERIVED. An `inputAccessoryView` is
 * installed into `UIRemoteKeyboardWindow` as part of the first responder's input-view set,
 * so `UIKeyboardFrameEndUserInfoKey` — and therefore RN's `endCoordinates.height` — reports
 * key layout + predictive bar + accessory as ONE union. DEBUG-506 makes this app's crisis
 * accessory attach for the first time, which raises the occluding edge on this surface by
 * ~60pt. Any fix calibrated against a measured clearance is correct under exactly one of
 * those two states; a fix that reads the frame is correct under both, because the inset and
 * the edge are the same number read once.
 *
 * jest has no keyboard and no layout. These are shape pins over a store driven by real
 * `Keyboard` events; the behavioural evidence is the keyboard-up block in
 * .maestro/journal-crisis-scan.yaml and .maestro/profile-voice-reflection-xxxl.yaml.
 */
describe('the save control is pinned above the keyboard (DEBUG-516)', () => {
  it('puts the action block OUTSIDE the scrolling region', async () => {
    const utils = await reachReview(CLEAN_TEXT);
    const save = utils.getByTestId('journal-save-button');

    expect(ancestorTestIds(save)).toContain('journal-action-block');
    expect(ancestorTestIds(save)).toContain('voice-reflection-screen');

    // Asserted on ANCESTOR TYPES, not on a testID. Phrased against a testID this spec
    // passes vacuously today — `not.toContain('voice-reflection-scroll')` is trivially
    // true while that testID does not exist, so it would go green before a line of the
    // fix was written and stay green if the fix were reverted.
    //
    // The whole fix: inside a scroller Save's y is a function of everything above it,
    // which is exactly what Dynamic Type changes. Outside one there is also no
    // capture-phase claimant, so the Pressable wins the first keyboard-up tap
    // unconditionally rather than by the negotiated 'handled' outcome DEBUG-480 relied on.
    expect(hasScrollAncestor(save)).toBe(false);

    // Control, proving the matcher still fires (DEBUG-390's rule: a narrow matcher that
    // silently matches nothing looks exactly like a passing assertion). The transcript
    // field must REMAIN inside the scroll region, so this half must stay true.
    expect(hasScrollAncestor(utils.getByTestId('journal-transcript-input'))).toBe(true);
  });

  it('insets the container by the live keyboard height', async () => {
    const utils = await reachReview(CLEAN_TEXT);
    emitKeyboard(SE3_KEYBOARD_HEIGHT);

    const flat = flatten(utils.getByTestId('voice-reflection-screen').props.style);
    expect(flat.paddingBottom).toBe(SE3_KEYBOARD_HEIGHT);
  });

  it('reserves NOTHING when no keyboard is up', async () => {
    const utils = await reachReview(CLEAN_TEXT);
    emitKeyboard(SE3_KEYBOARD_HEIGHT);
    emitKeyboard(0);

    const flat = flatten(utils.getByTestId('voice-reflection-screen').props.style);
    // Deliberately NOT useOverlayBottomInset(), whose Math.max floor would return the
    // 176pt CRISIS_BUTTON_RESERVED_BAND here — a quarter of a 667pt viewport surrendered
    // in every phase, spending the exact resource this fix is short of. That band is the
    // shape for a centred card; a bottom-anchored row dodges the crisis button
    // HORIZONTALLY, which journal-action-block already does.
    expect(flat.paddingBottom).toBe(0);
  });

  it('tracks the keyboard identically at every Dynamic Type step', async () => {
    for (const fontScale of [1, 1.353, 1.786, 3.571]) {
      setFontScale(fontScale);
      const utils = await reachReview(CLEAN_TEXT);
      emitKeyboard(SE3_KEYBOARD_HEIGHT);

      const flat = flatten(utils.getByTestId('voice-reflection-screen').props.style);
      // The inset is a property of the keyboard, never of the content above Save. This
      // is what makes clearance non-negative BY CONSTRUCTION instead of by arithmetic.
      expect(flat.paddingBottom).toBe(SE3_KEYBOARD_HEIGHT);
      utils.unmount();
    }
  });

  it('grows the transcript floor with the type size', async () => {
    setFontScale(1);
    const atDefault = await reachReview(CLEAN_TEXT);
    const defaultMin = flatten(atDefault.getByTestId('journal-transcript-input').props.style)
      .minHeight;
    atDefault.unmount();

    setFontScale(3.571);
    const atAx5 = await reachReview(CLEAN_TEXT);
    const ax5Min = flatten(atAx5.getByTestId('journal-transcript-input').props.style).minHeight;

    // minHeight: 180 is a fixed pt value against a font that scales, so it held ~7 lines
    // at default and ~2 at AX5 — the person correcting a lossy transcript loses the very
    // context correction depends on. Floor is three scaled lines; the default is unchanged.
    expect(defaultMin).toBe(180);
    expect(ax5Min).toBeGreaterThan(defaultMin);
  });

  it('relocates Discard out of the pinned footer at accessibility sizes, never deletes it', async () => {
    setFontScale(3.571);
    const utils = await reachReview(CLEAN_TEXT);

    // RELOCATION, NEVER DELETION (the DEBUG-469 rule). Discard is destructive and
    // secondary, so it is the release valve when the footer would otherwise crowd Save
    // toward the keyboard — but it keeps its label, its 44pt target, and its place in
    // the traversal order. Save never moves.
    const discard = utils.getByTestId('journal-discard-button');
    expect(ancestorTestIds(discard)).not.toContain('journal-action-block');
    expect(ancestorTestIds(discard)).toContain('voice-reflection-scroll');
    expect(flatten(discard.props.style).minHeight).toBeGreaterThanOrEqual(44);
    expect(ancestorTestIds(utils.getByTestId('journal-save-button')))
      .toContain('journal-action-block');
  });

  it('brings the banner back into view when a disclosure lands during review', async () => {
    const scrollTo = jest.spyOn(
      (jest.requireActual('react-native') as { ScrollView: { prototype: Record<string, unknown> } })
        .ScrollView.prototype,
      'scrollTo' as never,
    );
    mockSave.mockResolvedValue({ saved: false, reason: 'unknown' });
    const utils = await reachReview(CRISIS_TEXT);
    fireEvent.press(utils.getByTestId('journal-save-button'));
    await waitFor(() => utils.getByTestId('journal-crisis-banner'));

    // The restructure OWES this. Today the banner is the first child of a full-screen
    // ScrollView, so "first child" and "top of the viewport" coincide; after the split the
    // scroll region is a fraction of the screen and a modest offset carries the banner out
    // of view. The rising edge can only land in a scrolled position on one path — a save
    // that FAILS and discloses, leaving phase 'review' — which is this one.
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ y: 0 }));
    scrollTo.mockRestore();
  });

  it('adds no second 988 control to this surface', async () => {
    const utils = await reachReview(CRISIS_TEXT);
    // The banner is raised by scanOnSave, not by reaching review: the recognizer never
    // runs here, so scanOnFinalize scanned '' — the same reason the Maestro flow types
    // into the field rather than speaking.
    fireEvent.press(utils.getByTestId('journal-save-button'));
    await waitFor(() => utils.getByTestId('journal-crisis-banner'));
    // Crisis constraint: the keyboard-up 988 obligation is DEBUG-506's and is app-wide
    // across seven surfaces. A per-surface control here becomes a duplicate the day it
    // lands, giving one screen two differently-labelled Call-988 buttons — worse for a
    // screen-reader user than the gap it was meant to close. journal-crisis-call-988 is
    // the disclosure banner's action and is the ONLY 988 affordance this screen owns.
    expect(utils.getAllByTestId('journal-crisis-call-988')).toHaveLength(1);
    expect(ancestorTestIds(utils.getByTestId('journal-crisis-call-988')))
      .not.toContain('journal-action-block');
  });
});
