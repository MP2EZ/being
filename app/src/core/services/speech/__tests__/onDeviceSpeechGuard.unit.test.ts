/**
 * onDeviceSpeechGuard — unit specs (FEAT-283 Slice A, AC #1)
 *
 * WHAT THESE SPECS DO AND DO NOT PROVE
 *
 * They prove configuration and guard behaviour: that the on-device flag is a
 * hardcoded literal, that the recognition locale matches the locale the
 * availability probe examines, and that recognition is refused rather than
 * downgraded when on-device support is absent.
 *
 * They do NOT prove network behaviour. The native module bypasses the JS
 * network layer entirely, so spying on fetch during a transcription run would
 * assert nothing — the audio path never touches JS. Only a device test can
 * establish that no packets leave the phone. Do not cite this suite as proof of
 * zero egress; cite it as proof that the downgrade branch is unreachable from
 * our call sites.
 *
 * WHY THE GUARD EXISTS AT ALL
 * `expo-speech-recognition` silently discards the on-device request when the
 * recognizer for the locale lacks on-device support — the flag assignment is
 * skipped and Apple's default of `false` (server recognition) stands, with no
 * error and no way to read back the effective mode. Its own
 * `supportsOnDeviceRecognition()` probe builds `SFSpeechRecognizer()` from the
 * DEVICE DEFAULT locale, while the recognizer that actually runs is built from
 * the `lang` we pass. Pinning `lang` to the device locale is what makes the
 * probe answer the question we are actually asking.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    supportsOnDeviceRecognition: jest.fn(),
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    start: jest.fn(),
  },
}));

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(),
}));

import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { getLocales } from 'expo-localization';

import {
  buildRecognitionOptions,
  checkOnDeviceAvailability,
  resolveRecognitionLocale,
  startGuardedRecognition,
} from '../onDeviceSpeechGuard';

const mockModule = ExpoSpeechRecognitionModule as jest.Mocked<
  typeof ExpoSpeechRecognitionModule
>;
const mockGetLocales = getLocales as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetLocales.mockReturnValue([{ languageTag: 'en-US' }]);
  mockModule.supportsOnDeviceRecognition.mockReturnValue(true);
  mockModule.getPermissionsAsync.mockResolvedValue({ granted: true });
  mockModule.requestPermissionsAsync.mockResolvedValue({ granted: true });
});

describe('resolveRecognitionLocale', () => {
  it('uses the device locale', () => {
    mockGetLocales.mockReturnValue([{ languageTag: 'en-GB' }]);
    expect(resolveRecognitionLocale()).toBe('en-GB');
  });

  it('falls back to en-US when the device reports no locale', () => {
    mockGetLocales.mockReturnValue([]);
    expect(resolveRecognitionLocale()).toBe('en-US');
  });

  it('never returns a hardcoded locale that ignores the device', () => {
    mockGetLocales.mockReturnValue([{ languageTag: 'de-DE' }]);
    // Regression guard: a hardcoded 'en-US' would make the availability probe
    // (which uses the device default) answer for a different recognizer than
    // the one that runs — the exact mismatch that lets a silent cloud
    // downgrade through.
    expect(resolveRecognitionLocale()).toBe('de-DE');
  });
});

describe('buildRecognitionOptions', () => {
  it('always requests on-device recognition', () => {
    expect(buildRecognitionOptions('en-US').requiresOnDeviceRecognition).toBe(true);
  });

  it('carries the supplied locale as lang', () => {
    expect(buildRecognitionOptions('fr-FR').lang).toBe('fr-FR');
  });
});

describe('checkOnDeviceAvailability', () => {
  it('reports available when the platform supports on-device recognition', async () => {
    const result = await checkOnDeviceAvailability();
    expect(result.available).toBe(true);
  });

  it('reports unavailable — never silently proceeds — when unsupported', async () => {
    mockModule.supportsOnDeviceRecognition.mockReturnValue(false);
    const result = await checkOnDeviceAvailability();
    expect(result).toEqual({ available: false, reason: 'no_on_device_support' });
  });

  it('treats a throwing probe as unavailable, not as available', async () => {
    // Fail closed. An exception from the native probe must never be read as
    // "probably fine" — that would route audio to the cloud on error.
    mockModule.supportsOnDeviceRecognition.mockImplementation(() => {
      throw new Error('native module not linked');
    });
    const result = await checkOnDeviceAvailability();
    expect(result).toEqual({ available: false, reason: 'probe_failed' });
  });
});

describe('startGuardedRecognition', () => {
  it('starts with on-device required and the device locale', async () => {
    mockGetLocales.mockReturnValue([{ languageTag: 'en-AU' }]);

    const outcome = await startGuardedRecognition();

    expect(outcome.started).toBe(true);
    expect(mockModule.start).toHaveBeenCalledTimes(1);
    expect(mockModule.start).toHaveBeenCalledWith(
      expect.objectContaining({ requiresOnDeviceRecognition: true, lang: 'en-AU' })
    );
  });

  it('REFUSES to start when on-device support is absent', async () => {
    mockModule.supportsOnDeviceRecognition.mockReturnValue(false);

    const outcome = await startGuardedRecognition();

    expect(outcome).toEqual({ started: false, reason: 'no_on_device_support' });
    // The whole point: no start call at all, rather than a start that quietly
    // becomes a cloud transcription.
    expect(mockModule.start).not.toHaveBeenCalled();
  });

  it('REFUSES to start when permissions are denied', async () => {
    mockModule.getPermissionsAsync.mockResolvedValue({ granted: false });
    mockModule.requestPermissionsAsync.mockResolvedValue({ granted: false });

    const outcome = await startGuardedRecognition();

    expect(outcome).toEqual({ started: false, reason: 'no_permission' });
    expect(mockModule.start).not.toHaveBeenCalled();
  });

  it('checks on-device support BEFORE requesting permissions', async () => {
    // Ordering matters for honesty: do not prompt someone for microphone
    // access for a feature this device cannot deliver privately.
    mockModule.supportsOnDeviceRecognition.mockReturnValue(false);

    await startGuardedRecognition();

    expect(mockModule.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('surfaces a start failure rather than retrying without the on-device flag', async () => {
    mockModule.start.mockImplementation(() => {
      throw new Error('recognizer unavailable');
    });

    const outcome = await startGuardedRecognition();

    expect(outcome).toEqual({ started: false, reason: 'start_failed' });
    // One attempt only. A retry that relaxed the flag would be the silent
    // downgrade reintroduced by hand.
    expect(mockModule.start).toHaveBeenCalledTimes(1);
  });
});

/**
 * AC #1's mechanical, CI-enforceable pin.
 *
 * Mirrors `__tests__/safety/lsApplicationQueriesSchemes.config.test.ts`: read
 * the source directly and assert a static property, cheaply and deterministically,
 * on every machine in every precommit. It cannot prove runtime network
 * behaviour — see the header — but it does prove the safety flag has not been
 * made configurable, which is the regression a code review is most likely to
 * wave through.
 */
describe('AC #1 static pin — on-device flag is not configurable', () => {
  const source = readFileSync(join(__dirname, '../onDeviceSpeechGuard.ts'), 'utf8');

  it('sets requiresOnDeviceRecognition to the literal true', () => {
    expect(source).toMatch(/requiresOnDeviceRecognition:\s*true\b/);
  });

  it('never sets requiresOnDeviceRecognition to false', () => {
    expect(source).not.toMatch(/requiresOnDeviceRecognition:\s*false\b/);
  });

  it('never derives the on-device flag from a variable, env value, or feature flag', () => {
    // Anything other than the literal `true` after the colon is a way for the
    // guarantee to be switched off at runtime.
    const assignments = [...source.matchAll(/requiresOnDeviceRecognition:\s*([^,\n}]+)/g)];
    expect(assignments.length).toBeGreaterThan(0);
    for (const [, value] of assignments) {
      expect(value.trim()).toBe('true');
    }
  });

  it('reads the locale from the device rather than hardcoding one into the options', () => {
    expect(source).toMatch(/getLocales\(\)/);
  });
});
