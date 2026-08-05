/**
 * crisisAlert — canonical alert contract (FEAT-283)
 *
 * Pins the most safety-critical copy in the app. It now has two callers (the
 * PHQ-9/GAD-7 completion path and voice journal), so drift between them is the
 * failure this guards — MAINT-166 fixed one bug of exactly that family.
 */

import { Alert, Linking } from 'react-native';

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

  it('dials 988 and 741741 through local Linking, never a network call', () => {
    showCrisisAlert();
    const buttons = alertSpy.mock.calls[0][2] as { onPress: () => void }[];

    buttons[0].onPress();
    expect(Linking.openURL).toHaveBeenCalledWith('tel:988');

    buttons[1].onPress();
    expect(Linking.openURL).toHaveBeenCalledWith('sms:741741');

    buttons[2].onPress();
    expect(Linking.openURL).toHaveBeenCalledWith('tel:911');
  });

  it('falls through to dialing 988 if the alert itself throws', () => {
    // A broken modal must not become a silent no-op on this path.
    alertSpy.mockImplementationOnce(() => {
      throw new Error('Alert unavailable');
    });

    expect(() => showCrisisAlert()).not.toThrow();
    expect(Linking.openURL).toHaveBeenCalledWith('tel:988');
  });
});
