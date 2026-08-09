/**
 * crisisAlert — canonical alert contract (FEAT-283)
 *
 * Pins the most safety-critical copy in the app. It now has two callers (the
 * PHQ-9/GAD-7 completion path and voice journal), so drift between them is the
 * failure this guards — MAINT-166 fixed one bug of exactly that family.
 */

import { Alert, Linking } from 'react-native';

// The three actions dial through `openCrisisUrl` (DEBUG-314), so this suite
// asserts the delegation, not the underlying canOpenURL→openURL sequence —
// that sequence is `openCrisisUrl.test.ts`'s job and it already owns it.
// Same module-mock shape as CrisisErrorBoundary.test.tsx.
jest.mock('@/features/crisis/utils/openCrisisUrl', () => ({
  openCrisisUrl: jest.fn(),
}));

import { openCrisisUrl } from '@/features/crisis/utils/openCrisisUrl';

import {
  CRISIS_ACTION_911,
  CRISIS_ACTION_988,
  CRISIS_ACTION_TEXT_LINE,
  CRISIS_ALERT_TITLE,
  showCrisisAlert,
} from '../crisisAlert';

jest.spyOn(Linking, 'openURL').mockImplementation(async () => true);
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

beforeEach(() => jest.clearAllMocks());

describe('showCrisisAlert', () => {
  it('offers exactly three actions, in escalation order', () => {
    showCrisisAlert();

    const [title, , buttons] = alertSpy.mock.calls[0];
    expect(title).toBe(CRISIS_ALERT_TITLE);
    expect((buttons as { text: string }[]).map((b) => b.text)).toEqual([
      CRISIS_ACTION_988,
      CRISIS_ACTION_TEXT_LINE,
      CRISIS_ACTION_911,
    ]);
  });

  it('is not cancelable', () => {
    // Tapping outside must not be an exit from a crisis intervention.
    showCrisisAlert();
    expect(alertSpy.mock.calls[0][3]).toEqual({ cancelable: false });
  });

  it('dials 988, 741741 and 911 through the guarded helper, never a network call', () => {
    showCrisisAlert();
    const buttons = alertSpy.mock.calls[0][2] as { onPress: () => void }[];

    // Each dial carries manual-fallback copy, so a device that cannot open the
    // scheme gets an explicit instruction instead of silence (DEBUG-314).
    buttons[0].onPress();
    expect(openCrisisUrl).toHaveBeenCalledWith('tel:988', { manualLabel: '988' });

    // The text line uses explicit copy, not `manualLabel`: the default reads
    // "manually dial 741741 for support", which is wrong for a text line.
    buttons[1].onPress();
    expect(openCrisisUrl).toHaveBeenCalledWith('sms:741741', {
      fallbackTitle: 'Unable to Text',
      fallbackMessage: 'Please text 741741 for support.',
    });

    buttons[2].onPress();
    expect(openCrisisUrl).toHaveBeenCalledWith('tel:911', { manualLabel: '911' });
  });

  it('never routes a dial straight to Linking while the alert is healthy', () => {
    // Guards the actual DEBUG-314 defect shape: a bypassing call site gets no
    // canOpenURL check, no fallback Alert and no CRISIS audit record, so it
    // fails silently mid-crisis.
    showCrisisAlert();
    const buttons = alertSpy.mock.calls[0][2] as { onPress: () => void }[];
    buttons.forEach((b) => b.onPress());

    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('falls through to dialing 988 if the alert itself throws', () => {
    // A broken modal must not become a silent no-op on this path.
    //
    // DELIBERATE ASYMMETRY (DEBUG-314) — do not "fix" this to use
    // openCrisisUrl like the assertions above. This path runs only because
    // `Alert.alert` threw, and openCrisisUrl's sole failure surface IS
    // `Alert.alert`; routing it through the guard would trade a blind dial for
    // a guaranteed-silent one. The bare dial is the honest last resort.
    alertSpy.mockImplementationOnce(() => {
      throw new Error('Alert unavailable');
    });

    expect(() => showCrisisAlert()).not.toThrow();
    expect(Linking.openURL).toHaveBeenCalledWith('tel:988');
    expect(openCrisisUrl).not.toHaveBeenCalled();
  });

  it('does not leave the last-resort dial rejection unhandled', () => {
    // The unhandled rejection WAS the defect at this line: an openURL that
    // rejected had nowhere to go, so the failure was invisible to the user
    // and to the logs alike.
    alertSpy.mockImplementationOnce(() => {
      throw new Error('Alert unavailable');
    });
    (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('no dialer'));

    expect(() => showCrisisAlert()).not.toThrow();
  });
});
