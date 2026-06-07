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
