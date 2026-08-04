/**
 * onDeviceSpeechGuard — enforces on-device speech recognition (FEAT-283, AC #1)
 *
 * THE DEFECT THIS EXISTS TO CLOSE
 *
 * `expo-speech-recognition` does not honour an on-device request unconditionally.
 * In `ios/ExpoSpeechRecognizer.swift` the flag is applied only inside a support
 * check:
 *
 *     if recognizer.supportsOnDeviceRecognition {
 *       request.requiresOnDeviceRecognition = options.requiresOnDeviceRecognition
 *     }
 *
 * When support is absent the assignment is skipped and Apple's default of
 * `false` stands — i.e. audio goes to Apple's servers. There is no error, no
 * event, and no API to read back the effective mode. On that same path the
 * module also skips the speech-recognition authorization check
 * (`ExpoSpeechRecognitionModule.swift`), so the branch that can reach the cloud
 * is the one that never verified consent.
 *
 * For a feature whose entire premise is that nothing spoken leaves the device,
 * a silent downgrade is the worst available failure: the user is told the
 * opposite of what happened.
 *
 * HOW THE GUARD WORKS
 *
 * The module's `supportsOnDeviceRecognition()` probe constructs
 * `SFSpeechRecognizer()` with no locale argument, so it answers for the DEVICE
 * DEFAULT locale — while the recognizer that actually runs is built from the
 * `lang` we pass to `start()`. The two can disagree, and the disagreement
 * resolves silently in favour of the cloud.
 *
 * So the guard has two halves, and both are load-bearing:
 *
 *   1. `lang` is pinned to the device locale, which makes the probe answer for
 *      the same recognizer that will run.
 *   2. Recognition is REFUSED when the probe is false, rather than started and
 *      allowed to degrade.
 *
 * With those, the downgrade branch is unreachable from our call sites: if the
 * probe says support exists, the verified source does apply the flag.
 *
 * WHAT THIS DOES NOT GUARANTEE
 * A runtime check, not a structural impossibility. A bundled local model would
 * make egress impossible rather than merely refused — reconsider that for
 * FEAT-287 (Slice B), where sending text to Claude changes the calculus anyway.
 * Every failure mode here is "the feature is unavailable," which is visible and
 * honest; none of them is "it worked, but over the network."
 */

import { getLocales } from 'expo-localization';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

/** Used only when the platform reports no locale at all. */
const FALLBACK_LOCALE = 'en-US';

export type OnDeviceUnavailableReason = 'no_on_device_support' | 'probe_failed';

export type OnDeviceAvailability =
  | { available: true }
  | { available: false; reason: OnDeviceUnavailableReason };

export type StartRefusalReason =
  | OnDeviceUnavailableReason
  | 'no_permission'
  | 'start_failed';

export type StartOutcome =
  | { started: true }
  | { started: false; reason: StartRefusalReason };

/**
 * The locale recognition runs in.
 *
 * MUST come from the device. A hardcoded locale would make the availability
 * probe — which examines the device default — answer for a different recognizer
 * than the one that runs, which is precisely the gap the silent downgrade slips
 * through.
 */
export function resolveRecognitionLocale(): string {
  const locales = getLocales();
  return locales?.[0]?.languageTag ?? FALLBACK_LOCALE;
}

/**
 * Options for a recognition session.
 *
 * `requiresOnDeviceRecognition` is a hardcoded literal and must stay one. It is
 * deliberately not a parameter, an env value, or a feature flag — a safety
 * guarantee that can be switched off at runtime is not a guarantee. The static
 * pin in the unit specs fails the build if this becomes configurable.
 */
export function buildRecognitionOptions(lang: string) {
  return {
    lang,
    requiresOnDeviceRecognition: true,
    interimResults: false,
  };
}

/**
 * Whether this device can transcribe without reaching the network.
 *
 * Fails closed: a throwing probe reports unavailable. Reading an exception as
 * "probably fine" would route audio to the cloud precisely when the platform is
 * least understood.
 */
export async function checkOnDeviceAvailability(): Promise<OnDeviceAvailability> {
  try {
    if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) {
      return { available: false, reason: 'no_on_device_support' };
    }
    return { available: true };
  } catch {
    return { available: false, reason: 'probe_failed' };
  }
}

/**
 * Start recognition, or refuse.
 *
 * Order is deliberate: on-device support is checked BEFORE permissions are
 * requested, so nobody is prompted for microphone access for a feature this
 * device cannot deliver privately.
 *
 * There is no fallback path. A retry with the flag relaxed would be the silent
 * downgrade reintroduced by hand, so a start failure is reported as a failure.
 */
export async function startGuardedRecognition(): Promise<StartOutcome> {
  const availability = await checkOnDeviceAvailability();
  if (!availability.available) {
    return { started: false, reason: availability.reason };
  }

  const granted = await hasMicrophoneAndSpeechPermission();
  if (!granted) {
    return { started: false, reason: 'no_permission' };
  }

  const lang = resolveRecognitionLocale();

  try {
    ExpoSpeechRecognitionModule.start(buildRecognitionOptions(lang));
    return { started: true };
  } catch {
    return { started: false, reason: 'start_failed' };
  }
}

async function hasMicrophoneAndSpeechPermission(): Promise<boolean> {
  try {
    const existing = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (existing?.granted) {
      return true;
    }
    const requested = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return Boolean(requested?.granted);
  } catch {
    return false;
  }
}
