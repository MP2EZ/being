# Feature flags

Last verified: 2026-10-19 (MAINT-808; first written by MAINT-804, 2026-10-18)

Inventory of every feature flag in the app: what each gates, which tier resolves it, the value each source holds, how a build picks its value, and the operations still owed. Flags are a comma-separated `key:value` blob in `EXPO_PUBLIC_FEATURE_FLAGS`, parsed once at module load (`app/src/core/services/featureFlags.ts`). Only the literal `true` enables a flag; an absent key resolves to `false`. Re-verify this file on any flag change, any posthog SDK bump, and before v1.0.0.

Terms: **build-time** = `isFeatureEnabled()`, value baked into the JS bundle. **Runtime tier** = `useFeatureFlag()`, which may let PostHog override the build-time value for flags in `PRODUCT_FLAGS`.

## 1. Inventory

Source of truth for members: `FeatureFlag` union, `featureFlags.ts:50-129` (7 members). Runtime-overridable set: `PRODUCT_FLAGS`, `app/src/core/analytics/useFeatureFlag.ts:53-59` (2 members). "Introduced by" is the first commit adding the string to `featureFlags.ts` (`git log -S`).

Adding any key to `PRODUCT_FLAGS` is an explicit change that requires compliance review.

| Flag | Introduced by | What it gates | Tier | Why that tier | Consumers |
|---|---|---|---|---|---|
| `cloud_sync` | MAINT-173 | Cloud Backup entry row + screen (UI visibility; egress is gated separately by cloud_sync consent in `CloudBackupService`); Cloud Backup consent card in onboarding and re-consent | Both (split, see below) | In `PRODUCT_FLAGS` since INFRA-199 (`useFeatureFlag.ts:53-54`). Consent cards read build-time on purpose: a consent surface must not depend on analytics consent or a network round-trip (DEBUG-625 AC3, `OnboardingScreen.tsx:1102-1111`) | Runtime: `CloudBackupScreen.tsx:25` , `PrivacyDataScreen.tsx:170` (Protected Path). Build-time: `OnboardingScreen.tsx:1113` (Protected Path), `ReConsentScreen.tsx:221`, `:527` (Protected Path) |
| `wellness_trend_notes` | FEAT-195 | "Your note" annotation surface on Wellness Trends. UI visibility only; note encryption, consent and delete paths are independent and always on | PRODUCT_FLAGS (runtime-overridable) | Listed in `PRODUCT_FLAGS` with "ships dark (build-time floor false)" (`useFeatureFlag.ts:55-58`); no further rationale recorded | `WellnessScreeningTrends.tsx:555` (Protected Path) |
| `bug_reporting` | FEAT-284 | Internal "Report a bug / Send feedback" surface (shake-to-report + Sentry feedback widget) | Build-time only | Availability must be deterministic, offline, and not coupled to analytics consent (INFRA-199 safety carve-out), `featureFlags.ts:53-61` | `useBugReportShake.ts:110` (Protected Path), `ExternalErrorReporter.ts:749` (Protected Path), `ProfileScreen.tsx:447` (Protected Path); comment reference only: `bugReportStore.ts:34` (Protected Path) |
| `practice_haptics` | FEAT-285 | Haptic phase cues during timed practices, plus the opt-in prompt and settings row | Build-time only | Non-visual guidance channel for low-vision and eyes-closed practitioners; a user who declined analytics must not lose it (INFRA-199 carve-out), `featureFlags.ts:62-75` | `AppSettingsScreen.tsx:366`, `useHapticsOptIn.ts:90` (Protected Path), `usePracticeHaptics.ts:110` (Protected Path) |
| `voice_journal` | FEAT-283 | Voice journal / spoken reflection surface (capture, on-device transcription, encrypted store, crisis scan) | Build-time only | Gates a whole screen + entry point, not a per-user rollout; a zero-egress feature must not have network-dependent availability; INFRA-199 forbids coupling to analytics consent, `featureFlags.ts:86-95` | `ProfileScreen.tsx:469`, `:492` (Protected Path) |
| `data_export` | FEAT-270 | UI visibility of the "See what's included" scoping/count-preview section on `ExportDataScreen` **only**. Never a consent gate for any data operation; the always-on JSON export stays reachable when this is `false` | Build-time only; must never enter `PRODUCT_FLAGS` | A runtime flag resolves only under granted analytics consent, so a PostHog gate would hide a data-subject-rights surface from exactly the users who declined analytics (`featureFlags.ts:96-112`) | `ExportDataScreen.tsx:165` (Protected Path) |
| `domain_guidance` | FEAT-457 | Home entry point into domain-specific guidance (`RightNowAffordance`) | Build-time only | The surface routes a suppressed reader to CrisisResources, so availability must never depend on analytics consent or a network round-trip (INFRA-199 carve-out). Buys no incident response: a flip needs a new build, `featureFlags.ts:113-129` | `CleanHomeScreen.tsx:316` (Protected Path) |

Findings:

- **Split-tier read (`cloud_sync`).** It is read both ways. If PostHog ever held a clean boolean for a consenting user that differs from the build-time value, the Profile screens (`CloudBackupScreen`, `PrivacyDataScreen`) would follow PostHog while the onboarding and re-consent cards would not. Example: build-time `false`, PostHog `true` shows Cloud Backup without the consent card that authorizes it. Inactive today (see section 4) but latent.
- **Dead members (removed from code).** `emergency_sync` and `cross_device_sync` had zero consumers. MAINT-808 removed them from the union, `PRODUCT_FLAGS` and the committed `e2e-sim` string; the `.config` and EAS strings still carry them until the section 7 pending op runs (harmless: an unknown key resolves `false`).
- **Stale comment.** `CloudBackupScreen.tsx:8-9` says "PostHog promotes"; the hook lets a PostHog boolean win in both directions (section 3).

## 2. Value matrix

Values read 2026-10-18. `.config` files: grep of the `EXPO_PUBLIC_FEATURE_FLAGS` line only. EAS: `eas env:list --environment <env>` (read-only), filtered to that variable. "absent" = key not in the string, resolves `false`. T = true, F = false.

| Flag | `.config/.env.production` | `.config/.env.development` | EAS production | EAS preview | EAS development | `e2e-sim` (eas.json:68, string at :78) | PostHog 111221 (see note) |
|---|---|---|---|---|---|---|---|
| `cloud_sync` | F | T | F | F | F | F | active, 0% rollout, no conditions |
| `wellness_trend_notes` | F | F | F | absent | absent | F | inactive |
| `bug_reporting` | T | T | T | absent | absent | T | no definition |
| `practice_haptics` | T | T | T | absent | absent | F | no definition |
| `voice_journal` | F | T | F | absent | absent | T | no definition |
| `data_export` | F | F | F | absent | absent | F | inactive (orphan) |
| `domain_guidance` | F | T | F | absent | absent | T | no definition |

PostHog column: read 2026-10-18 by planning panel (read-only PostHog API), project 111221; not re-read by this doc's author.

EAS preview and development each hold this stale pre-MAINT-213 string: `production_mode`, `performance_monitoring`, `crisis_detection`, `clinical_accuracy`, `data_encryption`, `biometric_auth`, `offline_mode`, `widget_support` (all `true`, all removed from the union by MAINT-213, `featureFlags.ts:34-37`) plus `cloud_sync`, `emergency_sync`, `cross_device_sync` (all `false`; the last two no longer exist in code, MAINT-808). The six newer flags are missing.

`eas.json` profiles (`app/eas.json`): `development`, `preview` (extends `production`), `production`, `production-emergency` (extends `production`) set **no** `EXPO_PUBLIC_FEATURE_FLAGS`. Only `e2e-sim` sets it (profile at `eas.json:68`, string at `:78`). No profile sets an `environment` key.

### Disagreements

| Disagreement | Label | Reason |
|---|---|---|
| `.env.development` has `cloud_sync`, `voice_journal`, `domain_guidance` true vs production false | Intended | Local development exercises dark-shipped surfaces; production ships dark until validated (`featureFlags.ts:86-95`, `:125-128`) |
| `e2e-sim` has `voice_journal`, `domain_guidance` true vs production false | Intended | Maestro safety flows must reach those surfaces; a dark flag makes the flow unrunnable (`featureFlags.ts:93-94`, `:125-128`) |
| `e2e-sim` has `practice_haptics` false vs production true | Intended | Gate build stays dark: no current safety flow enters the practice timer screens; pinned by `__tests__/unit/practices/haptics/hapticTraceFlag.test.ts` ("keeps the Maestro gate build dark") and noted at `featureFlags.ts:72-74` |
| `e2e-sim` `bug_reporting` true | Intended today, open decision at launch | Matches production pre-launch; keeping it true after production flips off needs a stated reason (section 6) |
| EAS preview and development strings stale, missing 6 flags, carry 8 removed keys | Drift | Never resynced after MAINT-213 and the later flags. A preview or development-profile build reading them would ship `bug_reporting`, `practice_haptics` etc. dark, unlike production |
| PostHog `cloud_sync` active at 0% vs build-time values | Drift (inert) | Definition is never fetched by current builds (section 4); a mismatch affects no build |
| PostHog `wellness_trend_notes` inactive | Consistent, inert | Matches the build-time `false` floor |
| PostHog `data_export` inactive definition | Drift (orphan) | Not in `PRODUCT_FLAGS`, no code reads it via PostHog; its description refers to a PDF export the code does not gate |
| `.config/.env.production` vs EAS production | Agree | Identical strings on 2026-10-18 |

## 3. Resolution per build

| Build | JS env source | Which source wins | Runtime tier reachable? |
|---|---|---|---|
| Expo Go / dev client | Metro loads `app/.env.development`, a symlink to `.config/.env.development` | `.env.development` | Only by the consent condition below, and see section 4 |
| `npm run e2e:safety:build` | `eas.json` `e2e-sim` env | `e2e-sim` string wins over `.env.production`; see `app/scripts/e2e-sim-build.sh:542-557` (parity assert) | Same as above |
| `npm run e2e:safety:build:eas` (`eas build --local --profile e2e-sim`, `scripts/e2e-sim-build-eas.sh:132`) | Unverified. No profile sets `environment`; internal distribution may default to `preview`, which holds the stale string | Unverified: confirm from an EAS build log before relying on it | Unverified |
| EAS TestFlight and App Store | One binary from `eas build --profile production`. `.env.production` is gitignored, so the EAS `production` environment is the only source | EAS `production` environment | Same as above |

For TestFlight and App Store, a local-only edit of `.config/.env.production` changes nothing in a shipped build.

### Consent condition for the runtime tier

As coded in `useFeatureFlag.ts`, PostHog is consulted only when all four hold (`:99-100`):

1. the flag is in `PRODUCT_FLAGS`, and
2. `analyticsEnabled === true` (`:85-87`), and
3. `universalOptOut === false` (GPC / state universal opt-out, `:88-90`), and
4. a PostHog client exists.

Client presence is not a consent signal since the provider became unconditional (DEBUG-559, `:80-81`, `:96-98`). Every other branch returns the build-time value (fail-safe): non-product flag, no consent, opt-out, no client, unresolved or non-boolean value, network failure (`:129-130`). For a consenting user a clean PostHog boolean wins in both directions (`:131`): PostHog `false` overrides build-time `true`, and PostHog `true` overrides build-time `false`.

Consequence: a PostHog kill-switch or rollout reaches consenting users only. Reaching everyone requires a new build with the env default changed.

## 4. Runtime-tier status

In current builds the runtime tier never fetches flags. `useFeatureFlag` therefore always returns the build-time value, and the PostHog flag definitions are inert.

| Evidence | Where |
|---|---|
| `disableRemoteConfig: true`, `preloadFeatureFlags: false`, `disableSurveys: true` | `PostHogProvider.tsx:81-83`. Load-bearing pre-consent network suppression from the DEBUG-559 ruling (`:40-62`) |
| `optIn()` / `optOut()` only mutate a persisted opt-out flag | `PostHogProvider.tsx:116-117`, `:136` |
| No app code calls `reloadFeatureFlags`, `identify` or `group` | Searched `app/src` and `app/App.tsx` on 2026-10-18; only hits are comments in `PostHogProvider.tsx` |
| The only path that loads flags is `client.reset()` during account deletion | `analyticsIdentityReset.ts:145`; the SDK's `reset()` calls `reloadFeatureFlags()` (`node_modules/@posthog/core/dist/posthog-core.js:100`) |
| Observed: on app 1.4.0, every `$feature_flag_called` event for `cloud_sync` and `wellness_trend_notes` carried `$used_bootstrap_value=true` | Planning panel reading, 2026-10-18 (PostHog read-only); not re-run here |

Caveat: a device that ran a pre-DEBUG-559 build may hold a persisted flag cache.

Do not flip `preloadFeatureFlags` or `disableRemoteConfig` to make the tier live; they are the pre-consent network suppression keys. Making the tier live is a follow-up decision (section 7).

Pinned SDK versions (`app/package-lock.json`): `posthog-react-native` 4.45.14, `@posthog/core` 1.29.9. Re-verify this section on any SDK bump.

## 5. Dead and orphaned entries

| Entry | Detail | Disposition |
|---|---|---|
| `emergency_sync`, `cross_device_sync` | Removed from the union, `PRODUCT_FLAGS` and the `e2e-sim` string by MAINT-808; still in `.config/.env.*` and EAS | Pending op (remove from env strings), section 7 |
| PostHog `data_export` definition | Inactive; orphan; must never become the gate for `data_export` | Pending op (archive) |
| EAS preview and development strings | Stale, see section 2 | Pending op (resync or delete) |
| `daily_loop` | Not a flag any more. Appears only in a comment at `featureFlags.ts:89` and as retired-flag history at `CleanHomeScreen.tsx:5`, `:264`. (`stoic_session_daily_loop` is a storage key, not a flag) | None; reword the comment when touching `featureFlags.ts` |
| `app/__tests__/setup/env.mock.js` | Set `EXPO_PUBLIC_FEATURE_FLAGS: 'production_mode:true,crisis_detection:true'`, both keys removed by MAINT-213 | Done (MAINT-810): now `'cloud_sync:false'`, so every flag resolves false under jest |

## 6. Launch gates and how to flip

### Launch gate: `bug_reporting`

`bug_reporting` must be `false` in both `.config/.env.production` and the EAS production environment before v1.0.0. EAS production is what a shipped build reads, so a local-only flip silently does nothing. Pinned (parsing only) in `__tests__/privacy/feedbackScrub.contract.test.ts`; that test does not read either env source.

Compliance recommendation: flip before the first external TestFlight tester (feedback reaches Sentry), or confirm the privacy policy discloses Sentry feedback capture.

Open decision: `e2e-sim` keeping `bug_reporting:true` at launch needs a stated reason.

### How to flip a flag

Every place that must change together:

- [ ] `.config/.env.production`
- [ ] `.config/.env.development`
- [ ] EAS `production` environment. Founder runs `eas env:set` (never `eas env:update`: its `--name` flag renames the variable), then verifies with `eas env:list --environment production`
- [ ] EAS `preview` and `development` environments (or delete them)
- [ ] `app/eas.json` `e2e-sim` string, plus what pins it: `__tests__/unit/practices/haptics/hapticTraceFlag.test.ts` (reads the real `eas.json`) and the `scripts/e2e-sim-build.sh` parity assert (`:542-557`). `__tests__/privacy/feedbackScrub.contract.test.ts` and `__tests__/scripts/e2e-sim-build.test.js` use their own fixture strings
- [ ] PostHog definition, only for `PRODUCT_FLAGS` members and only once the runtime tier is live
- [ ] Value claims in `featureFlags.ts` comments (for example "ships dark", the `practice_haptics` prod-sources sentence)
- [ ] This doc's matrix, with a new verified-on date
- [ ] A new build. A build-time flag is not an incident lever

PostHog targeting rule: release conditions may use only the anonymous device id and the `surface: 'app'` super-property; never any wellness-derived property (scores, check-in values, journal or crisis state).

## 7. Pending ops and follow-ups

### Pending ops (founder-executed)

| Entry | Exact action | Owner | Verify with | Status |
|---|---|---|---|---|
| EAS preview `EXPO_PUBLIC_FEATURE_FLAGS` | Set to the current 7-flag string (no `emergency_sync` / `cross_device_sync`) with `eas env:set`, or delete the variable | Founder | `eas env:list --environment preview` | Open |
| EAS development `EXPO_PUBLIC_FEATURE_FLAGS` | Same | Founder | `eas env:list --environment development` | Open |
| PostHog `data_export` definition (project 111221) | Archive. Compliance point: `data_export` must never become PostHog-gated | Founder | PostHog flag list shows it archived | Open |
| `bug_reporting` launch gate | Set `bug_reporting:false` in `.config/.env.production` and the EAS production environment | Founder | `grep EXPO_PUBLIC_FEATURE_FLAGS` on the `.config` file; `eas env:list --environment production` | Open |
| `emergency_sync`, `cross_device_sync` in `.config/.env.production`, `.config/.env.development` and EAS production | Remove both `:false` pairs (MAINT-808 removed them from code). EAS: `eas env:set`, never `eas env:update`. Preview and development are covered by the resync rows above | Founder | `grep EXPO_PUBLIC_FEATURE_FLAGS` on each `.config` file; `eas env:list --environment production` | Open |

### Follow-up items

| Item | ID |
|---|---|
| Remove `emergency_sync` and `cross_device_sync` from `FeatureFlag` and `PRODUCT_FLAGS` | MAINT-808 (done) |
| Resolve `cloud_sync` split-tier reads (Protected Paths: `PrivacyDataScreen.tsx`, `OnboardingScreen.tsx`, `ReConsentScreen.tsx`) and the stale "PostHog promotes" wording at `CloudBackupScreen.tsx:8-9` | MAINT-809 |
| Clean stale keys from `app/__tests__/setup/env.mock.js` | MAINT-810 (done) |
| Decide keep, fix or retire the PostHog runtime tier. A fix would be a post-consent `reloadFeatureFlags` under the same four conditions as `useFeatureFlag.ts:99-100`, in `PostHogProvider` (a crisis + compliance Protected Path), plus a privacy-policy section 5.2 check | MAINT-811 |
| Investigate whether `client.reset()` on account deletion triggers a `/flags` request while the user is opted out (compliance) | DEBUG-812 |
