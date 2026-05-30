# Bundle Identifier Migration Runbook — `com.being.mbct` → `com.being.app`

> **Work item:** MAINT-159. **Status:** in-code portion complete; external coordination **blocked on
> account provisioning** (Apple Developer + Google Play approval pending — see the "Provision iOS Apple
> credentials" work item). This is a forward checklist for the founder to execute once those accounts exist,
> and **before any production / TestFlight submission**.

## Why this exists

The app declared `com.being.app` in `app.json` since the Fullmind→Being rebrand but historically shipped
native binaries under the legacy `com.being.mbct` (Expo prebuild had been run against the old slug). A
prebuild regeneration (Expo SDK 56 upgrade, INFRA-158) rewrote all native files to `com.being.app`, closing
the in-code drift. The remaining work is aligning external systems (Apple, Google, push, deep links) to the
canonical `com.being.app` identifier before launch — none of which can be done from this repo.

A bundle ID is permanent for a *published* listing. Doing this pre-launch is cheap; post-launch it is a new
app listing + a server-side migration project. **Complete every external step below before the first
production submission.**

---

## ✅ Already done (in-code, verified)

| Item | Where | State |
|---|---|---|
| iOS bundle ID (Debug + Release) | `app/ios/Being.xcodeproj/project.pbxproj` L427, L459 | `com.being.app` |
| Android namespace + applicationId | `app/android/app/build.gradle` L90, L92 | `com.being.app` |
| Android Java package + dir | `app/android/app/src/main/java/com/being/app/{MainApplication,MainActivity}.kt` | `package com.being.app` |
| Declared identifiers | `app/app.json` (`ios.bundleIdentifier`, `android.package`) | `com.being.app` |
| iOS App Group | `app/app.json` L69, `app/ios/Being/Being.entitlements` L18, `app/plugins/withAppGroupsEntitlement.js` | `group.com.being.app.widgets` (was never `com.being.mbct.*`) |
| Apple Sign-In client ID (env) | `~/dev/being/.config/env.{production,development}`, `app/src/core/config/env.test.ts`, `app/__tests__/setup/env.mock.js` | `com.being.app` (MAINT-159) |

After MAINT-159: `grep -rn "com\.being\.mbct"` over the working tree (excl. node_modules/.git/Pods) returns
zero matches.

**Note on the env Apple client ID:** `EXPO_PUBLIC_AUTH_APPLE_CLIENT_ID` is validated by the Zod schema
(`env.ts:98`) and read (`env.ts:233`) but has **no runtime consumer** in `src/` today — native
Sign-in-with-Apple derives its audience from the provisioned bundle ID, not this var. Flipping it makes the
value consistent and forward-correct; it did not change runtime behavior.

---

## ⛔ Blocked on account provisioning — execute when Apple Developer + Play Console approval lands

Sequence matters: **update OAuth providers first (additively), then submit under the new bundle ID.** This
avoids an authentication gap.

### Apple Developer Portal
- [ ] Register `com.being.app` as an explicit App ID.
- [ ] Enable **Sign in with Apple** capability on the App ID.
- [ ] Configure the **Services ID** / return (callback) URI to match `com.being.app` (and the Supabase auth
      callback if Apple is wired through Supabase). Keep any legacy `com.being.mbct` callback registered
      during the transition window if it exists.
- [ ] Enable **App Groups** capability and confirm `group.com.being.app.widgets` is associated (needed once
      the iOS widget target ships).
- [ ] Enable **Associated Domains** for universal links (see deep-link section).

### Google Cloud Console (OAuth)
- [ ] Add an OAuth redirect / authorized client for the `com.being.app` bundle alongside the existing one
      (additive — do not remove the old until cutover is confirmed).

### App Store Connect
- [ ] Create a **new** app listing under `com.being.app` (a published bundle ID cannot be renamed).
- [ ] Decide disposition of any legacy `com.being.mbct` listing: archive / delete / leave for a transition
      window. Pre-launch with no published listing → nothing to migrate.

### Google Play Console
- [ ] Same as App Store Connect: new listing under `com.being.app`; decide legacy disposition.

### Push notifications
- [ ] iOS: re-issue / regenerate the **APNs** key or cert scoped to `com.being.app`.
- [ ] Android: confirm the **FCM** project's `applicationId` is `com.being.app` (FCM keys on applicationId;
      may already be aligned). Re-download `google-services.json` if it changes (none committed today).
- [ ] Existing device push tokens become invalid across a bundle ID change. Pre-launch: no impact.

### Deep links / Universal Links — cross-repo (being-website)
- [ ] **Gap:** `being-website` currently has **no** `apple-app-site-association` (AASA) file. The universal
      links declared in `app/app.json` (`applinks:being.fyi`, `applinks:www.being.fyi`) are therefore **not
      served** — universal links do not resolve yet regardless of bundle ID.
- [ ] Create `being.fyi/.well-known/apple-app-site-association` (and `www`) referencing the **new**
      `TEAMID.com.being.app` appID — this is a *new* AASA, not a rename of an mbct entry. Tracked as an
      acceptance criterion on **MAINT-161** (Provision iOS Apple credentials), which supplies the Team ID
      the AASA file requires; deploy via the being-website `.well-known/` pipeline.
- [ ] Verify Android App Links (`assetlinks.json`) similarly if/when configured.

---

## Verification once external steps are done

- [ ] EAS dev build under `com.being.app` installs on a real device.
- [ ] App launches; Supabase auth flow succeeds; (when wired) Sign-in-with-Apple / Google succeed.
- [ ] Push registration returns a token under the new bundle ID.
- [ ] Universal link tap (after AASA is live) opens the app rather than Safari.

---

## Data-continuity caveat (compliance verification, MAINT-159)

Compliance GO on both auth-gap and wellness-data continuity:

- **Auth:** No in-app auth gap. SecureStore auth-token keys (`auth_access_token_v2`, etc.) and the AES master
  key (`mental_health_master_key`) are **static string literals** — none are derived from the bundle ID.
- **Wellness data:** Encrypted wellness data (AES-256-GCM) lives in AsyncStorage under static prefixes
  (`crisis_async_`, `assessment_async_`, `wellness_async_`); the master key lives in SecureStore. The App
  Group already uses `com.being.app`; no widget Swift target exists yet, so nothing reads from
  `UserDefaults(suiteName:)` cross-process.
- **OS-level caveat (inherent, not a code defect):** iOS scopes Keychain (SecureStore) and the AsyncStorage
  container to the team-ID + bundle-ID pair. Any device with a `com.being.mbct` build installed would, on
  upgrade to `com.being.app`, present as a **fresh install** — SecureStore items (incl. the AES master key)
  and AsyncStorage ciphertext become unreadable. **Moot pre-launch:** if no `com.being.mbct` build was ever
  distributed beyond local development, there is no user data at risk. If TestFlight testers exist under the
  old ID, treat their data as non-recoverable and communicate a reinstall.
