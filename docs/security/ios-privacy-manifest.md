# iOS Privacy Manifest Documentation

## Overview

This document explains the declarations in Being's iOS privacy manifest. **The source is `app/app.json` → `expo.ios.privacyManifests`.** `expo prebuild` writes it into `app/ios/Being/PrivacyInfo.xcprivacy`, which is generated (iOS is CNG, INFRA-280) and gitignored, so never edit or cite that file as a source. After any change, regenerate with `npx expo prebuild --platform ios --no-install` (never omit `--platform`: `app/android/` is committed) and read it back with `/usr/libexec/PlistBuddy -c 'Print :NSPrivacyCollectedDataTypes' app/ios/Being/PrivacyInfo.xcprivacy`.

Pinned by `app/__tests__/privacy/privacyManifestCollectedDataTypes.config.test.ts`. Re-synced to `app.json` by DEBUG-793 (2026-10-19). This document previously described a Health declaration and API reasons that `app.json` never carried.

## NSPrivacyCollectedDataTypes

| Type | Linked | Tracking | Purposes | What it covers |
|---|---|---|---|---|
| `NSPrivacyCollectedDataTypeDeviceID` | `true` | `false` | Analytics, AppFunctionality | PostHog's install-persistent `distinct_id`, sent only with *Usage Analytics* on. Sentry's installation and device identifiers, sent only with *Crash Reports* on (privacy policy v1.21, §5.1) |
| `NSPrivacyCollectedDataTypeProductInteraction` | `true` | `false` | Analytics | PostHog product events, only with *Usage Analytics* on. Since DEBUG-821 they exclude opening a wellness screening, screening history, support resources or guidance, and tapping a crisis line; never answers, scores, or anything the user writes (privacy policy §5.2) |
| `NSPrivacyCollectedDataTypeCoarseLocation` | `true` | `false` | Analytics, AppFunctionality | City-level GeoIP derived by PostHog (with *Usage Analytics* on) and by Sentry (with *Crash Reports* on, and on any bug report sent). PostHog and Sentry do not store the IP address. Supabase does keep the IP address of the device's most recent connection against the random account ID (privacy policy §4.1), and Being does not derive a location from it |
| `NSPrivacyCollectedDataTypeUserID` | `true` | `false` | AppFunctionality | The random account ID (Supabase `auth.uid()`), created the first time a crisis-detection event is recorded, the settings backup is used, or a purchase is made or restored. Supabase keeps the latest connection's IP address, user agent and last-connection time against it (privacy policy §2.2, §4.1). Added by DEBUG-853 |
| `NSPrivacyCollectedDataTypeHealth` | `false` | `false` | Analytics, AppFunctionality | The Crisis Detection Event (`crisis_detected`): the threshold category, severity band, screening type, whether support resources were shown, and the detection day. Sent and stored with no account or session identifier, and the day only, not the time (INFRA-861; privacy policy §3, §4.1). Screening answers, scores, mood values and journal content never leave the device. Added by INFRA-861 |

**Why Linked = true** (every type except Health). Being has no sign-in, but Apple counts data tied to a device or account identifier as linked to the user, and every one of these is stored against an install-persistent identifier or the random account ID. Declaring them "not linked" would rest on the absence of an account, which Apple's definition does not accept. This is the conservative reading (DEBUG-793 compliance lens). Revisit only with a written ruling.

**Why Health is Linked = false (INFRA-861 compliance ruling).** Apple's "not linked" test is that identifiers are removed before collection and the data is not re-linked. The crisis lane sends with the publishable key only, carrying no user token, account ID or session ID, and the server refuses a `crisis_detected` row that carries `user_id` or `session_id` (CHECK constraint) and stores the day, not the time. Nothing joins the row to an install. This holds only for builds carrying the INFRA-861 client; an older build bound the event to the account ID.

**No Other Diagnostic Data (DEBUG-853 compliance ruling).** The user agent Supabase keeps with each connection (the app's build number and the device's OS version) is connection metadata for the User ID row, not diagnostic data collected for analysis, so no separate type is declared.

**Why Tracking = false.** No data is combined with third-party data for advertising or shared with a data broker. There is no IDFA and no ATT prompt.

Sentry's pod ships its own manifest (crash, performance and other diagnostic data), which Xcode merges into the app's privacy report.

### Open, not ruled

- **Purchase History.** Store transaction identifiers and subscription status are stored server-side against the random account ID (privacy policy §4.1). A compliance ruling is needed before App Store submission.

## NSPrivacyAccessedAPITypes

| API category | Reason | Use |
|---|---|---|
| `NSPrivacyAccessedAPICategoryFileTimestamp` | `C617.1` | File timestamps inside the app container (encrypted local storage) |
| `NSPrivacyAccessedAPICategoryUserDefaults` | `CA92.1` | App preferences |
| `NSPrivacyAccessedAPICategorySystemBootTime` | `35F9.1` | Elapsed-time measurement (animation and session timing) |

## NSPrivacyTracking

`false`. Being does not track users as defined by App Tracking Transparency.

## App Store Connect declaration

The App Store Connect nutrition label is entered by hand and must match this manifest. The questionnaire answers are in `docs/product/app-store-connect-metadata.md` §5.

## References

- [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Privacy Manifest Files](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files)
- [Describing Data Use in Privacy Manifests](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_data_use_in_privacy_manifests)
