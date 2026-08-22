/**
 * hapticActuator — can this device produce a haptic at all? (DEBUG-426)
 *
 * WHY THIS EXISTS. `expo-haptics` exposes no capability API — its entire
 * surface is `notificationAsync`, `impactAsync`, `selectionAsync`,
 * `performAndroidHapticsAsync`. And on iOS `UIFeedbackGenerator` resolves
 * NORMALLY on hardware with no actuator, so nothing throws and
 * `hapticEngine`'s catch-only `available` latch never fires. The failure is
 * silent by construction. Without a capability read, the once-ever opt-in is
 * offered on an iPad, the practitioner accepts, their single unrepeatable
 * choice is spent, and nothing ever vibrates — with no feedback that anything
 * is wrong.
 *
 * THIS IS THE ONLY MODULE PERMITTED TO IMPORT `expo-device`, deliberately
 * mirroring `hapticEngine`'s charter as the only module permitted to call
 * `expo-haptics`. One place to mock, one place to revise when a real
 * capability API lands.
 *
 * FAIL OPEN. Anything unrecognised — `DeviceType.UNKNOWN`, a null `modelId`,
 * a null `deviceType` — resolves to CAPABLE and still shows the prompt. The
 * two error directions are not comparable. A wrongly-shown prompt costs one
 * dismissible choice on hardware that will honour it. A wrongly-suppressed
 * prompt permanently withholds the channel, because the prompt is the only
 * discovery surface haptics has ever had and a decline is by design
 * unrepeatable — and the withheld cohort is the eyes-closed and low-vision
 * practitioners the subsystem was built for.
 *
 * WHAT THIS DOES NOT MODEL. The iOS "System Haptics" switch. It has no public
 * API, and with it off a fully Taptic-equipped iPhone silently no-ops. That is
 * a TRANSIENT user setting, not absent hardware, and conflating the two would
 * be wrong in a way this module cannot detect anyway.
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';

/**
 * The raw signals the decision is made from, passed explicitly so the rules
 * can be exercised as a table without mocking a native module.
 */
export interface ActuatorSignals {
  /** `Platform.OS`. */
  os: string;
  /** `Device.isDevice` — false on a simulator. */
  isDevice: boolean;
  /** `Device.modelId`, e.g. 'iPhone14,2' / 'iPad13,16'. Null when unresolved. */
  modelId: string | null;
  /** `Device.deviceType`. Null when unresolved. */
  deviceType: number | null;
}

/** Device classes that have never shipped a Taptic Engine. */
const NO_ACTUATOR_TYPES: readonly number[] = [
  Device.DeviceType.TABLET,
  Device.DeviceType.DESKTOP,
  Device.DeviceType.TV,
];

/**
 * The whole truth table. Pure — no native reads, no platform globals.
 */
export function inferHapticActuator(signals: ActuatorSignals): boolean {
  const { os, isDevice, modelId, deviceType } = signals;

  // ANDROID SHORT-CIRCUITS FIRST, before any device signal is consulted.
  // expo-device infers Android's `deviceType` from SCREEN DIAGONAL, so a large
  // phone can report TABLET — suppressing on that would withhold a working
  // capability from a device that has one. No probe short of a native
  // `Vibrator.hasVibrator()` bridge exists, so the existing catch-only failure
  // latch in hapticEngine stays the Android mechanism.
  if (os !== 'ios') return true;

  // A simulator has no actuator, and `Device.modelId` there is the HOST
  // architecture from `uname().machine` ('arm64'), never an iPad identifier —
  // so this arm is the only one that can fire on a simulated iPad.
  if (!isDevice) return false;

  // The two remaining signals cover DISJOINT cases and must be OR'd, never
  // AND'd, and neither is merely a fallback for the other:
  //   - `deviceType` catches an Apple Silicon Mac. expo-device returns DESKTOP
  //     for isMacCatalystApp / isiOSAppOnMac BEFORE it consults
  //     userInterfaceIdiom, and app.json's supportsTablet:true means this build
  //     installs there with `isDevice` TRUE.
  //   - `modelId` catches an iPhone-only build running on iPad in compatibility
  //     mode, which reports idiom .phone while the model IS an iPad.
  if (deviceType !== null && NO_ACTUATOR_TYPES.includes(deviceType)) return false;
  if (modelId !== null && modelId.startsWith('iPad')) return false;

  // Everything else — including UNKNOWN and both nulls — asks. See FAIL OPEN.
  return true;
}

/**
 * Read the live device signals and decide.
 *
 * Not memoised, deliberately: `Device.*` are already-resolved JS constants on
 * the module object (no bridge call per read), so a cache would buy nothing and
 * would add a third module-scoped latch that every test's `beforeEach` has to
 * remember alongside `__resetHapticsOptInLatch` and `__resetHapticEngineForTest`.
 */
export function hasHapticActuator(): boolean {
  return inferHapticActuator({
    os: Platform.OS,
    isDevice: Device.isDevice,
    modelId: Device.modelId ?? null,
    deviceType: Device.deviceType ?? null,
  });
}
