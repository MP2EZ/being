/**
 * iOS privacy manifest: collected data types (DEBUG-793 AC3)
 *
 * Pins the `NSPrivacyCollectedDataTypes` that app.json's `expo.ios.privacyManifests`
 * writes into the generated PrivacyInfo.xcprivacy. iOS is CNG (INFRA-280), so the plist
 * is never reviewed in a diff: this test is the only pin on what the manifest declares.
 *
 * What it declares, and why. With Usage Analytics on, PostHog events carry an
 * install-persistent distinct_id (Device ID), product-interaction events, and city-level
 * GeoIP (Coarse Location). Crash Reports (Sentry, policy v1.21) also carry a device
 * identifier and approximate location. All three are declared LINKED, conservatively: an
 * install-persistent identifier is a device-level link (docs/security/ios-privacy-manifest.md
 * records the reasoning). None is used for tracking.
 *
 * DEBUG-853 adds User ID: the random account ID (Supabase `auth.uid()`) is an app-assigned
 * account identifier, created on first crisis-detection event, settings backup or purchase,
 * and used only for app functionality.
 *
 * The App Store Connect nutrition label must match this manifest; that half is manual
 * console work and cannot be pinned here.
 */

const appJson = require('../../app.json');

type CollectedDataType = {
  NSPrivacyCollectedDataType: string;
  NSPrivacyCollectedDataTypeLinked: boolean;
  NSPrivacyCollectedDataTypeTracking: boolean;
  NSPrivacyCollectedDataTypePurposes: string[];
};

const ANALYTICS = 'NSPrivacyCollectedDataTypePurposeAnalytics';
const APP_FUNCTIONALITY = 'NSPrivacyCollectedDataTypePurposeAppFunctionality';

const EXPECTED: Record<string, string[]> = {
  NSPrivacyCollectedDataTypeDeviceID: [ANALYTICS, APP_FUNCTIONALITY],
  NSPrivacyCollectedDataTypeProductInteraction: [ANALYTICS],
  NSPrivacyCollectedDataTypeCoarseLocation: [ANALYTICS, APP_FUNCTIONALITY],
  NSPrivacyCollectedDataTypeUserID: [APP_FUNCTIONALITY],
};

describe('iOS privacy manifest — NSPrivacyCollectedDataTypes (DEBUG-793)', () => {
  const declared: unknown = appJson?.expo?.ios?.privacyManifests?.NSPrivacyCollectedDataTypes;

  it('is declared as an array on expo.ios.privacyManifests', () => {
    expect(Array.isArray(declared)).toBe(true);
  });

  it('declares exactly the collected types the policy discloses', () => {
    const types = (declared as CollectedDataType[]).map((d) => d.NSPrivacyCollectedDataType).sort();
    expect(types).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(Object.entries(EXPECTED))('%s is linked, not tracking, with the expected purposes', (type, purposes) => {
    const entry = (declared as CollectedDataType[]).find((d) => d.NSPrivacyCollectedDataType === type);
    expect(entry).toBeDefined();
    expect(entry!.NSPrivacyCollectedDataTypeLinked).toBe(true);
    expect(entry!.NSPrivacyCollectedDataTypeTracking).toBe(false);
    expect([...entry!.NSPrivacyCollectedDataTypePurposes].sort()).toEqual([...purposes].sort());
  });

  it('keeps the accessed-API reasons beside it', () => {
    expect(Array.isArray(appJson?.expo?.ios?.privacyManifests?.NSPrivacyAccessedAPITypes)).toBe(true);
  });
});
