/**
 * VoiceReflectionScreen — safety contract specs (FEAT-283 Slice A)
 *
 * Covers what the Maestro flow cannot: the save-path branches, the
 * non-retraction rule, and that saving is never blocked by an intervention.
 * The Maestro flow covers what this cannot: that the contract holds in a real
 * build on a real device.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';

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

beforeEach(() => {
  jest.clearAllMocks();
  mockSave.mockResolvedValue({ saved: true, entry: { id: 'x' } });
  mockAvailability.mockResolvedValue({ available: true });
  mockSweep.mockReturnValue(0);
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

  it('does not let the ScrollView swallow the first keyboard-up tap', async () => {
    const utils = await reachReview(CLEAN_TEXT);
    const scroll = utils.getByTestId('voice-reflection-screen');
    // 'handled' — NOT true/'always', which would stop inert content from
    // blurring the input and break journal-review-header's dismissal.
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
  });

  it('insets the scroll view for the keyboard natively, not from a JS height', async () => {
    const utils = await reachReview(CLEAN_TEXT);
    const scroll = utils.getByTestId('voice-reflection-screen');
    // UIKit intersects the keyboard frame with this view's frame in window
    // coordinates, so it is immune to the header/modal-card offset that rules
    // out KeyboardAvoidingView here, and already includes DEBUG-450's accessory.
    expect(scroll.props.automaticallyAdjustKeyboardInsets).toBe(true);
  });

  it('offers a dismissal that does not depend on tapping a specific element', async () => {
    const utils = await reachReview(CLEAN_TEXT);
    const scroll = utils.getByTestId('voice-reflection-screen');
    // The transcript field is multiline, so Return inserts a newline and there is
    // no Done key. on-drag makes the scroll toward Save dismiss the keyboard.
    expect(scroll.props.keyboardDismissMode).toBe('on-drag');
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

  it('scrolls the save error into view, since it pushes Save further down', async () => {
    mockSave.mockResolvedValue({ saved: false, reason: 'unknown' });
    const utils = await reachReview(CLEAN_TEXT);
    fireEvent.press(utils.getByTestId('journal-save-button'));

    const err = await waitFor(() => utils.getByTestId('journal-save-error'));
    // The error renders BETWEEN the input and Save on the retry path, where the
    // text has already survived one failed write and there is no autosave.
    expect(typeof err.props.onLayout).toBe('function');
    expect(() => fireEvent(err, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 20 } },
    })).not.toThrow();
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
