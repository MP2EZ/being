/**
 * Speech-recognition permission static-config pin (FEAT-283, AC #1)
 *
 * Companion to `lsApplicationQueriesSchemes.config.test.ts`, same shape and
 * same reasoning: read `app.json` directly and assert a static contract in
 * <100ms, on every machine, in `npm run precommit`. A regression fails the
 * commit before a build is ever produced.
 *
 * WHAT IT PINS
 *
 * 1. Both iOS usage-description strings exist. iOS refuses microphone access
 *    without `NSMicrophoneUsageDescription`, and gates `SFSpeechRecognizer`
 *    behind `NSSpeechRecognitionUsageDescription` even in on-device-only mode.
 *    A missing string is not a soft failure — the feature simply cannot run.
 *
 * 2. The strings are not the library's generic defaults. `expo-speech-recognition`
 *    falls back to "Allow $(PRODUCT_NAME) to use the microphone." A generic
 *    string is an App Store review risk on a mental-health app and tells the
 *    user nothing about the on-device guarantee, which is the entire premise of
 *    this feature.
 *
 * 3. The config plugin is registered. Without it the native module is not
 *    configured, regardless of what the infoPlist says.
 *
 * 4. THE DRIFT GUARD. `expo prebuild` materialised the plugin's computed
 *    permission strings into `ios.infoPlist`, so the same sentence now lives in
 *    two places: the plugin props and the infoPlist. The plugin applies its
 *    prop only as a fallback (`props?.x || config.ios.infoPlist.x || default`),
 *    so once both exist the infoPlist wins and an edit to the plugin prop alone
 *    would silently do nothing. Editing one and not the other is the likely
 *    mistake; this asserts they agree.
 *
 * WHAT IT DOES NOT PIN
 * Runtime behaviour. Whether recognition actually stays on-device is enforced
 * by `src/core/services/speech/onDeviceSpeechGuard.ts` and its specs, and can
 * only be truly confirmed on a device. This file pins configuration.
 */

const appJson = require('../../app.json');

const LIBRARY_DEFAULT_MIC = 'Allow $(PRODUCT_NAME) to use the microphone.';
const LIBRARY_DEFAULT_SPEECH = 'Allow $(PRODUCT_NAME) to use speech recognition.';

describe('Speech recognition permissions (iOS infoPlist contract)', () => {
  const infoPlist = appJson?.expo?.ios?.infoPlist;

  it('declares NSMicrophoneUsageDescription', () => {
    expect(typeof infoPlist?.NSMicrophoneUsageDescription).toBe('string');
    expect(infoPlist.NSMicrophoneUsageDescription.length).toBeGreaterThan(0);
  });

  it('declares NSSpeechRecognitionUsageDescription', () => {
    // Required even for on-device-only recognition: iOS gates the Speech
    // framework behind this string regardless of the on-device flag.
    expect(typeof infoPlist?.NSSpeechRecognitionUsageDescription).toBe('string');
    expect(infoPlist.NSSpeechRecognitionUsageDescription.length).toBeGreaterThan(0);
  });

  it('does not ship the library default usage strings', () => {
    expect(infoPlist.NSMicrophoneUsageDescription).not.toBe(LIBRARY_DEFAULT_MIC);
    expect(infoPlist.NSSpeechRecognitionUsageDescription).not.toBe(LIBRARY_DEFAULT_SPEECH);
  });
});

describe('expo-speech-recognition plugin registration', () => {
  const plugins: unknown[] = appJson?.expo?.plugins ?? [];

  const entry = plugins.find(
    (p) =>
      p === 'expo-speech-recognition' ||
      (Array.isArray(p) && p[0] === 'expo-speech-recognition')
  );

  it('is registered in the plugins array', () => {
    expect(entry).toBeDefined();
  });

  it('keeps the plugin props and the materialised infoPlist in agreement', () => {
    // Drift guard — see file header. Two copies of one sentence exist since
    // prebuild wrote the computed values back into app.json.
    if (!Array.isArray(entry)) {
      // Bare string form carries no props, so there is nothing to drift.
      return;
    }

    const props = entry[1] as Record<string, string> | undefined;
    const infoPlist = appJson.expo.ios.infoPlist;

    if (props?.microphonePermission) {
      expect(props.microphonePermission).toBe(infoPlist.NSMicrophoneUsageDescription);
    }
    if (props?.speechRecognitionPermission) {
      expect(props.speechRecognitionPermission).toBe(
        infoPlist.NSSpeechRecognitionUsageDescription
      );
    }
  });
});

describe('Android RECORD_AUDIO declaration', () => {
  it('declares RECORD_AUDIO', () => {
    const permissions: string[] = appJson?.expo?.android?.permissions ?? [];
    expect(permissions).toContain('android.permission.RECORD_AUDIO');
  });

  // NOTE for the deferred Android work item: this permission is declared while
  // the feature ships iOS-first behind a dark flag, so Android currently
  // requests microphone access for a feature it does not surface. Revisit the
  // Play data-safety declaration before any Android release — and note the
  // on-device guarantee is materially weaker there (real only on API 33+;
  // below that EXTRA_PREFER_OFFLINE is a preference the service may ignore).
});
