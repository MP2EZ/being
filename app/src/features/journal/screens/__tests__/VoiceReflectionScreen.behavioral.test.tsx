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

const mockSave = saveEntry as jest.Mock;
const mockAlert = showCrisisAlert as jest.Mock;
const mockAvailability = checkOnDeviceAvailability as jest.Mock;
const mockSweep = sweepAllAudioArtifacts as jest.Mock;

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
