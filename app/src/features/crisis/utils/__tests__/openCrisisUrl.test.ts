/**
 * openCrisisUrl behavioral tests (DEBUG-230 / SEC-W5)
 *
 * The shared crisis-dial helper is the single guard point for every
 * tel:/sms: deeplink on the crisis path. It MUST:
 * - canOpenURL-guard before openURL,
 * - fall back to a manual-dial Alert + logError(CRISIS) when the URL is
 *   unsupported or openURL rejects (no silent failure mid-crisis),
 * - fire the injected onTap analytics callback (class components can't use
 *   the useAnalytics hook).
 */

import { Alert, Linking } from 'react-native';

jest.mock('@/core/services/logging', () => ({
  __esModule: true,
  logError: jest.fn(),
  LogCategory: { CRISIS: 'crisis' },
}));

import { logError, LogCategory } from '@/core/services/logging';
import { openCrisisUrl } from '../openCrisisUrl';

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('openCrisisUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  test('supported URL: guards with canOpenURL then dials', async () => {
    await openCrisisUrl('tel:988');
    await flush();
    expect(Linking.canOpenURL).toHaveBeenCalledWith('tel:988');
    expect(Linking.openURL).toHaveBeenCalledWith('tel:988');
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  test('fires the injected onTap callback once', async () => {
    const onTap = jest.fn();
    await openCrisisUrl('tel:988', { onTap });
    await flush();
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  /**
   * FEAT-543 -- analytics must never be able to block a dial.
   *
   * `onTap?.()` is the FIRST statement in openCrisisUrl, ahead of the
   * canOpenURL guard, and `trackEvent` carries no try/catch of its own. Until
   * FEAT-543 every caller passed a bare function reference, so nothing was
   * evaluated at the call site; that item introduced a call-site expression
   * (`() => track(resource.id === PRIMARY_988_RESOURCE_ID)`) into the slot.
   *
   * A throw here would abort the dial with no openURL, no manual-dial Alert,
   * no logError(CRISIS) and no endCrisisTap terminal -- a silent crisis false
   * negative, not a visible failure.
   */
  test('a throwing onTap still reaches the dial and is logged', async () => {
    const onTap = jest.fn(() => {
      throw new Error('analytics exploded');
    });

    await expect(openCrisisUrl('tel:988', { onTap })).resolves.toBeUndefined();
    await flush();

    expect(onTap).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).toHaveBeenCalledWith('tel:988');
    // The swallow must be recorded, not silent.
    expect(logError).toHaveBeenCalledWith(
      LogCategory.CRISIS,
      expect.stringMatching(/analytics/i),
      expect.any(Error)
    );
    // A failed tap is not a failed dial: no manual-dial fallback.
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  test('omitting onTap does not throw', async () => {
    await expect(openCrisisUrl('tel:988')).resolves.toBeUndefined();
  });

  test('unsupported URL: shows manual-dial Alert + logs, never dials', async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);
    await openCrisisUrl('tel:988', { manualLabel: '988' });
    await flush();
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Unable to Call',
      expect.stringContaining('988'),
      expect.anything()
    );
    expect(logError).toHaveBeenCalledWith(
      LogCategory.CRISIS,
      expect.any(String),
      expect.any(Error)
    );
  });

  test('openURL rejection: surfaces Alert + logs (no silent failure)', async () => {
    (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('no dialer'));
    await openCrisisUrl('tel:988', { manualLabel: '988' });
    await flush();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Unable to Call',
      expect.stringContaining('988'),
      expect.anything()
    );
    expect(logError).toHaveBeenCalled();
  });
});
