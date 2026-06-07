/**
 * LSApplicationQueriesSchemes static-config pin (INFRA-184)
 *
 * Pins the iOS Info.plist contract that lets `Linking.canOpenURL('tel:988')`
 * and `Linking.canOpenURL('sms:741741')` return true on real devices. Without
 * either scheme in the array, `CrisisResourcesScreen` falls back to an
 * "Unable to Call" / "Unable to Text" alert during a crisis — terrible UX
 * exactly when it matters most.
 *
 * This test is the PRIMARY mechanical pin for the contract. It runs in
 * `npm run precommit` on every commit on every machine in <100ms. The
 * supplementary device-only Maestro flow at `app/.maestro/crisis-988-dial.yaml`
 * (tag: `safety-device-only`) validates the runtime dial behavior on real
 * iOS hardware but cannot pass on the simulator (sim's `canOpenURL` returns
 * false unconditionally) — see INFRA-184.
 *
 * Upstream config: INFRA-147 originally added this array. INFRA-158 (SDK 56
 * upgrade) preserved it. If this test fails after an Expo SDK upgrade,
 * the upgrade dropped a required infoPlist key — restore before merging.
 */

const appJson = require('../../app.json');

describe('LSApplicationQueriesSchemes (iOS infoPlist contract)', () => {
  const schemes: unknown = appJson?.expo?.ios?.infoPlist?.LSApplicationQueriesSchemes;

  it('is declared as an array on expo.ios.infoPlist', () => {
    expect(Array.isArray(schemes)).toBe(true);
  });

  it('includes "tel" so canOpenURL("tel:988") returns true on iOS devices', () => {
    expect(schemes).toEqual(expect.arrayContaining(['tel']));
  });

  it('includes "sms" so canOpenURL("sms:741741") returns true on iOS devices', () => {
    expect(schemes).toEqual(expect.arrayContaining(['sms']));
  });
});
