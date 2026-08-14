/**
 * DEBUG-426 — can this device produce a haptic at all?
 *
 * `expo-haptics` exposes no capability API, and on iOS `UIFeedbackGenerator`
 * resolves NORMALLY on hardware with no actuator — so `hapticEngine`'s
 * catch-only `available` latch never fires there. The failure is silent by
 * construction, which is why the once-ever opt-in was being spent on iPads.
 *
 * This is the pure half of the predicate: a truth table over the four signals,
 * with no module mocking at all, so the rules can be read off the specs.
 *
 * THE ASYMMETRY THAT SHAPES EVERY ROW. Over-suppression is NOT the safe
 * direction merely because the stored preference survives. A capable device
 * that is never asked gets silence forever, because the prompt is the only
 * discovery surface haptics has ever had and it is unrepeatable. So anything
 * unrecognised must resolve to CAPABLE and still ask.
 */

import {
  inferHapticActuator,
  type ActuatorSignals,
} from '@/features/practices/shared/haptics/hapticActuator';

/** expo-device's DeviceType, inlined so the table reads without an import. */
const UNKNOWN = 0;
const PHONE = 1;
const TABLET = 2;
const DESKTOP = 3;
const TV = 4;

const iphone: ActuatorSignals = {
  os: 'ios',
  isDevice: true,
  modelId: 'iPhone14,2',
  deviceType: PHONE,
};

const signals = (over: Partial<ActuatorSignals>): ActuatorSignals => ({ ...iphone, ...over });

describe('DEBUG-426: iOS hardware that cannot vibrate', () => {
  it('treats a physical iPhone as capable', () => {
    // The control. Without it every "false" below could be a predicate that
    // simply always returns false.
    expect(inferHapticActuator(iphone)).toBe(true);
  });

  it('treats an iPad as incapable, by model identifier', () => {
    expect(inferHapticActuator(signals({ modelId: 'iPad13,16', deviceType: TABLET }))).toBe(false);
  });

  it('treats a TABLET as incapable even when the model identifier does not say iPad', () => {
    // Not redundant with the row above: on the iOS Simulator `modelId` is the
    // HOST architecture (uname().machine), never an iPad identifier, so the
    // model arm cannot fire and only deviceType can.
    expect(inferHapticActuator(signals({ modelId: 'arm64', deviceType: TABLET }))).toBe(false);
  });

  it('treats an iPad model identifier as incapable even when the idiom reports PHONE', () => {
    // The converse disjoint case: an iPhone-only build running on iPad in
    // compatibility mode reports idiom .phone while modelId IS an iPad. The two
    // signals must be OR'd, never AND'd.
    expect(inferHapticActuator(signals({ modelId: 'iPad13,16', deviceType: PHONE }))).toBe(false);
  });

  it('treats DESKTOP as incapable — the iPad build installs on Apple Silicon Macs', () => {
    // app.json sets supportsTablet:true, so this build runs on Macs. expo-device
    // returns DESKTOP for isMacCatalystApp / isiOSAppOnMac BEFORE it consults
    // userInterfaceIdiom, and reports isDevice TRUE there. A predicate keyed
    // only on TABLET misses the case entirely.
    expect(inferHapticActuator(signals({ modelId: 'Mac14,12', deviceType: DESKTOP }))).toBe(false);
  });

  it('treats TV as incapable', () => {
    expect(inferHapticActuator(signals({ modelId: 'AppleTV11,1', deviceType: TV }))).toBe(false);
  });

  it('treats the simulator as incapable', () => {
    expect(inferHapticActuator(signals({ isDevice: false, modelId: 'arm64' }))).toBe(false);
  });
});

describe('DEBUG-426: the predicate fails OPEN', () => {
  // A wrongly-shown prompt costs one dismissible choice on hardware that will
  // honour it. A wrongly-suppressed prompt permanently withholds the channel
  // from the cohort it was built for, with no recovery path. These are not
  // comparable, so every unknown resolves to "ask".

  it('asks on an unrecognised device type', () => {
    expect(inferHapticActuator(signals({ modelId: 'iPhone99,1', deviceType: UNKNOWN }))).toBe(true);
  });

  it('asks when the model identifier is absent', () => {
    expect(inferHapticActuator(signals({ modelId: null }))).toBe(true);
  });

  it('asks when the device type is absent', () => {
    expect(inferHapticActuator(signals({ deviceType: null }))).toBe(true);
  });

  it('asks when both are absent', () => {
    expect(inferHapticActuator(signals({ modelId: null, deviceType: null }))).toBe(true);
  });
});

describe('DEBUG-426: Android is left alone', () => {
  // No probe short of a native Vibrator.hasVibrator() bridge exists there, and
  // expo-device infers Android deviceType from SCREEN DIAGONAL — so a large
  // phone can report TABLET. Suppressing on that would withhold a working
  // capability from a device that has one. The existing catch-only failure
  // latch stays the Android mechanism.

  it('treats an Android phone as capable', () => {
    expect(inferHapticActuator({ os: 'android', isDevice: true, modelId: 'Pixel 8', deviceType: PHONE })).toBe(true);
  });

  it('treats an Android device reporting TABLET as capable — diagonal is not an actuator', () => {
    expect(inferHapticActuator({ os: 'android', isDevice: true, modelId: 'SM-X710', deviceType: TABLET })).toBe(true);
  });

  it('short-circuits before the device signals are consulted at all', () => {
    // Every signal here says "suppress" on iOS. On Android none of them may be
    // read, so the answer must still be capable.
    expect(inferHapticActuator({ os: 'android', isDevice: false, modelId: 'iPad13,16', deviceType: DESKTOP })).toBe(true);
  });
});
