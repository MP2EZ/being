# Being

## What This Is

Stoic Mindfulness mental wellness app. Consumer wellness — not a healthcare provider, medical device, or HIPAA-covered entity. PHQ-9 and GAD-7 are wellness self-screening tools, not clinical assessments. Solo-founder project under Palouse Labs LLC.

## Repo Layout

Bare git repo at `~/dev/being/` with worktrees at `~/dev/being/{main,development,phase-2b}/` plus feature worktrees created by `/b-work`. Always launch `claude` from `~/dev/being/` (the bare-repo root). The app code lives under each worktree's `app/` directory.

## Tech Stack

- React Native `0.85.3`, Expo `56`, React `19.2.3` (pinned — see version-check script in `app/package.json`)
- Supabase (auth + DB), Zustand `5` (state), Stripe (subscriptions), Sentry (monitoring), expo-secure-store + react-native-aes-crypto (encryption)
- TypeScript `5.9.x` strict (kept on 5.9 via `expo.install.exclude`; TS 6 deferred — see follow-up work item), Jest (unit/integration) + Maestro (safety-path e2e, local-only — INFRA-171)

## Setup & Run

```bash
cd app
npm start                  # Expo dev server
npm run ios                # iOS simulator
npm run android            # Android emulator
```

## Source Architecture

```
app/src/
├── core/         # Infrastructure: analytics, security, services, stores, types
└── features/     # Domain features: assessment, crisis, practices, learn, ...
```

Path aliases: `@/core/*`, `@/features/*`. Prefer aliases over relative imports. Types co-located with their consumers.

## Protected Paths → Specialist Agent

Editing these areas should invoke the matching agent for a planning pass before implementing:

| Path | Agent(s) |
|---|---|
| `app/src/features/crisis/` | `crisis` |
| `app/src/features/assessment/` | `crisis` + `philosopher` |
| `app/src/features/practices/` | `philosopher` |
| `app/src/core/services/security/` | `compliance` |

Specialist agents live in `.claude/agents/{crisis,compliance,philosopher}.md` and self-describe via frontmatter.

## Safety Facts (non-negotiable)

- **PHQ-9 thresholds**: ≥15 = support resources offered; ≥20 = active intervention. Q9 (self-harm) >0 = immediate intervention regardless of total.
- **GAD-7 threshold**: ≥15 = support resources offered.
- **988 access**: <3 taps from any screen, <3 seconds load.
- **Crisis detection**: <200ms, zero false negatives, audit-logged.
- **Wellness data encryption**: AES-256 at rest via `expo-secure-store` / `react-native-aes-crypto`. (Terminology: "wellness data," not "PHI" — Being is not a HIPAA entity.)

## Performance Budgets

| Metric | Target |
|---|---|
| App launch | <2s |
| Crisis button response | <200ms |
| Check-in flow transition | <500ms |
| Assessment load | <300ms |
| Breathing circle animation | 60fps |

## Test & Validate Commands

```bash
npm run typecheck                  # tsc --noEmit
npm run lint                       # eslint src
npm run lint:clinical              # stricter rules for clinical/safety code
npm run test                       # full jest suite
npm run test:clinical              # PHQ/GAD scoring + thresholds
npm run test:crisis-detection      # crisis detection validation
npm run test:accessibility         # WCAG AA
npm run test:offline-crisis        # offline 988 access
npm run validate:accessibility     # accessibility validation

# Safety-path e2e (Maestro, local-only — INFRA-171)
npm run e2e:safety                 # all 5 Maestro safety flows
npm run e2e:safety:q9              # PHQ-9 Q9 single-alert pinning
npm run e2e:safety:phq9            # PHQ-9 ≥20 completion path
npm run e2e:safety:gad7            # GAD-7 ≥15 severe handoff
npm run e2e:safety:crisis-button   # crisis button reachability from each tab
npm run e2e:safety:988-dial        # 988 dial does not fall back (pins LSApplicationQueriesSchemes)
```

## Validation Matrix

Which validators are required for which work type. `crisis`, `compliance`, `philosopher` are specialist agents. Accessibility is validated via `npm run test:accessibility` / `validate:accessibility`. Performance budgets (see "Performance Budgets" section) are enforced on-device via the Maestro flows under `app/.maestro/` — the jest-side `perf:*` scripts were removed in MAINT-166 PR 7 because they ran zero matching tests.

| Work Type | crisis | compliance | philosopher | accessibility | performance | safety e2e |
|---|---|---|---|---|---|---|
| Crisis features | required | required | — | required | <200ms required | required |
| Assessment UI | required (thresholds) | — | — | required | — | required |
| Therapeutic content (Stoic) | — | — | required | required | 60fps if animation | — |
| Privacy / wellness data export | — | required | — | if UI | — | — |
| General UI | — | — | — | required | — | — |
| Backend-only | — | — | — | — | — | — |

Safety e2e = Maestro flow in `app/.maestro/` pinning the user-visible contract. Gated by `/b-close` Phase 2.5 when safety paths change. Authoring guide: `docs/testing/e2e-maestro.md`.

## State (Zustand)

- `user` — profile, preferences
- `checkIn` — mood (encrypted at rest)
- `assessment` — PHQ/GAD results (critical: encrypted, validated)
- `crisis` — emergency contacts, safety plan (critical: encrypted)

## Design System

Uses the `@mp2ez/being-design-system` npm package. Theme tokens imported from `@/core/theme`. UI work imports `colorSystem`, `semantic`, `spacing`, `borderRadius`, `typography` from there. **No hardcoded hex colors, magic-number spacing, or inline fontSize.** Themes vary by time of day (`morning|midday|evening`) via `getTheme(flowType)`.

## Branch Model (GitHub Flow — INFRA-145)

Two long-lived branches:
- **`main`** — last-shipped state. Updated only via `development → main` release PRs (created by `/b-release`) or `hotfix/* → main` PRs. TestFlight + App Store build from this branch.
- **`development`** — integration branch. All feature / chore / fix branches PR into this. Each merge is "ready to release"; multiple can accumulate before a release.

Short-lived branches:
- `feat/*`, `fix/*`, `chore/*` — branched off `development`, PR'd to `development`, deleted on merge.
- `hotfix/*` — branched off `main` (NOT dev), PR'd to `main`. After merge: **cherry-pick** the hotfix commit onto `development` (decision: cherry-pick over rebase, keeps dev's force-push protection on).

**Branch protection**: both `main` and `development` require `CI pass` (9 strict gates), enforce admins, prevent force-push and deletion, and require PRs (no direct push). Use `gh pr merge --admin` for solo workflow speed.

**Multi-agent rule**: each Claude agent runs in its own worktree on its own feature branch. All agents converge on `development` via PRs. This is why `development` exists — it's the convergence point for parallel work streams.

## Release Process (INFRA-145)

1. Tranches land on `development` via `/b-close [WORK_ITEM_ID]` (which PRs to dev, waits for CI, merges via merge-commit).
2. When ready to ship to TestFlight, run `/b-release` from the development worktree:
   - Interactive prompt for bump type (patch / minor / major) — pass as arg to skip.
   - Skill auto-generates release notes from squash commits since last semver tag.
   - Bumps version across **FOUR sources** (INFRA-141): `app/package.json`, `app/app.json`, `~/dev/being/.config/env.production`, `~/dev/being/.config/env.development`. Refuses to run if any source disagrees.
   - Opens PR `development → main` (CI runs the same 9 gates).
   - Merges via **merge commit** (NOT squash — preserves per-tranche history visible on main).
3. After GitHub merges, run `/b-release --finish` to tag and push.

Tag scheme: `vX.Y.Z` semver. Pre-launch: `v0.x.y`. App Store launch: `v1.0.0`. Legacy `v2.x` tags from earlier development phases are filtered out by the b-release `--match 'v[0-9]*.[0-9]*.[0-9]*'` pattern.

## Hotfix Process

For bugs found in production (or TestFlight) that need to ship without waiting on in-progress dev work:

1. `git checkout main && git pull`
2. `git checkout -b hotfix/<short-description>`
3. Fix + commit
4. PR `hotfix/* → main` (NOT to development). CI runs against main.
5. After merge:
   - Tag main with patch bump (e.g., `v1.0.1`).
   - **Cherry-pick** the hotfix commit onto development:
     ```bash
     git -C ~/dev/being/development fetch origin
     git -C ~/dev/being/development checkout development
     git -C ~/dev/being/development cherry-pick origin/main
     # (or specifically pick the hotfix sha if main has multiple new commits)
     git -C ~/dev/being/development push origin development
     ```

Cherry-pick is preferred over rebase to keep dev's "prevent force-push" protection on. The duplicate commit content is fine — git handles identical content gracefully on the next release PR.

## Workflow Commands

| Command | Purpose |
|---|---|
| `/b-create [TYPE] - [Name]` | Create Notion work item from conversation context with dimension scores |
| `/b-work [WORK_ITEM_ID]` | Fetch work item, create worktree off `development` (with env symlinks per INFRA-141), install deps, implement |
| `/b-close [WORK_ITEM_ID]` | Push feature branch, open PR to `development`, wait for CI, merge via merge-commit (INFRA-145), update Notion to Done. Phase 2.5 Maestro safety-e2e gate runs scoped flow(s) when safety paths change (INFRA-171). `--push` deprecated (PR merge always pushes). `--skip-e2e` hotfix-only. |
| `/b-release [BUMP] [--finish]` | Promote `development → main` as a release. Interactive bump prompt + FOUR-place version bump (INFRA-141) + env schema pre-flight + auto release notes. Run with `--finish` after the PR merges to tag + push. |

Branch naming: `feat/*`, `fix/*`, `chore/*` (mapped from work item TYPE). Conventional commits. Aim for <400 LOC per PR.

**Notion work-items DB**: `NOTION_WORK_DB = 277a1108-c208-805c-810b-000b0f0aae22`. Single source of truth — referenced by slash commands as `${NOTION_WORK_DB}`. Rotate here only.

💡 **Recommended mode**: enable Accept Edits (Shift+Tab to cycle) for `/b-work` / `/b-close` / `/b-release` runs. These skills make many sequential tool calls (Notion + git + gh CLI + version bumps). For complex architectural work, consider Plan mode first.

## Docs Map

- `docs/product/` — PRD, TRD, DRD, roadmap, Stoic Mindfulness framework (`stoic-mindfulness/INDEX.md`)
- `docs/architecture/` — system design
- `docs/development/` — dev guides
- `docs/legal/regulatory-applicability.md` — **source of truth for what regulations apply** (FTC, CCPA, TDPSA, GDPR; NOT HIPAA/FDA)
- `docs/legal/breach-notification-runbook.md` — **internal operational procedure** for FTC HBNR (16 CFR Part 318) breach response; founder + counsel only, NOT user-facing (operationalizes the public commitment in `privacy-policy.md` §4.4)
- `docs/legal/dpia-sensitive-wellness-data.md` — **internal DPIA** for sensitive wellness-data processing (TDPSA/CPA/VCDPA/CTDPA); regulator-facing, NOT user-facing
- `docs/security/` — encryption, secure storage
- `docs/testing/` — test strategy
- Source architecture detail: `app/src/README.md`
- Full dev command reference: `QUICKSTART_COMMANDS.md` (at worktree root)

## Known Gotchas

- React must stay at `19.2.3` for RN 0.85.x compatibility — `version-check` script enforces.
- iOS minimum is `16.4` (SDK 56). New Architecture and edge-to-edge are mandatory and cannot be disabled.
- Vector icons use scoped `@react-native-vector-icons/*` packages (migrated from `@expo/vector-icons` in INFRA-158). On the crisis path, keep `import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons'` eager at module top — do not lazy-import.
- `LSApplicationQueriesSchemes` in `app/app.json` (`tel`, `sms`) is **required** on iOS 13+ for the crisis dial path. Without it, `Linking.canOpenURL('tel:988')` returns `false` and `CrisisResourcesScreen` falls back to an "Unable to Call — please manually dial" alert during a crisis. Tests mock `canOpenURL`, so Jest cannot catch a regression here — the Maestro flow `app/.maestro/crisis-988-dial.yaml` (INFRA-171) is the only mechanical pin, asserting absence of the "Unable to Call" fallback after tapping the 988 button. The `/b-close` Phase 2.5 gate runs this flow automatically when `app.json` or `Info.plist` change. If you add a new scheme to the crisis path (e.g., `mailto:`), add it to this array AND extend the Maestro flow to inverse-assert the matching fallback.
- App Groups entitlement for the iOS widget is injected via a local config plugin at `app/plugins/withAppGroupsEntitlement.js` (was previously `expo-build-properties`'s `ios.entitlements`, removed in SDK 56).
- TypeScript stays on `5.9.x` and `globalThis.fetch` stays as RN's `fetch` (via `EXPO_PUBLIC_USE_RN_FETCH=1`) — both SDK 56 default-changes were deliberately opted out in INFRA-158 to keep upgrade scope tight; see follow-up work items.
- `AsyncStorage` is unencrypted by design; wellness data must use `expo-secure-store` + AES-256.
- Encryption tests are slow (`test:encryption`) — run during pre-push, not pre-commit.
- iOS and Android behavior must match (use `npm run platform:both` to verify).
- Slash commands in `.claude/commands/` must use **absolute paths** (`/Users/max/dev/being/.claude/...`) for any internal file references — never relative `./.claude/...`. This avoids the symlink dance.
- Compliance terminology: "wellness data" not "PHI"; "AES-256 encryption" not "HIPAA-compliant encryption"; "wellness screening" not "clinical assessment."
- Env files live canonically at `~/dev/being/.config/{env.production,env.development}` (gitignored at bare root). Worktree `app/.env.{production,development}` are symlinks to those. `/b-work` creates the symlinks automatically; manual `git worktree add` requires creating them by hand (`ln -s ../../.config/env.production app/.env.production` and same for development). Dev env has empty `EXPO_PUBLIC_SENTRY_DSN` so Sentry no-ops locally; production env carries the real DSN. Back up the canonical files in 1Password — deleting `.config/` breaks all worktrees.
- Maestro safety-e2e (INFRA-171) is **local-only** — no CI macOS runners. Install with `brew install maestro`. Prereq per run: an iOS sim must be booted and `com.being.app` installed (`npm run ios` once per worktree). Flows live in `app/.maestro/`. The `/b-close` Phase 2.5 gate runs scoped flows when safety paths change. `--skip-e2e` bypass mirrors the `--no-verify` policy below: **`hotfix/*` only** — refused on `feat/*`, `fix/*`, `chore/*`. Authoring + debugging guide: `docs/testing/e2e-maestro.md`.
- **`patch-package` is wired into `app/package.json` (INFRA-176)** with a `postinstall: patch-package` script. Currently one patch: `app/patches/expo-modules-jsi+56.0.7.patch` rewrites `weak let` → `weak var` in 14 Swift files because Xcode 26.0.1's Swift 6.2 promoted `weak let` from warning to hard error and the SDK 56 pin of `expo-modules-jsi@56.0.7` predates that. **Every `npm install` reapplies the patch automatically** — do not manually edit `node_modules/expo-modules-jsi/` because the next install will overwrite. When the next Expo SDK upgrade lands, check whether `expo-modules-jsi` ships `weak var` natively; if so, delete the patch file and remove the postinstall script. New patches go alongside this one and stack automatically — no further wiring needed.
- **After back-merging dev when `app/ios/Podfile.lock` checksums shift** (typically `hermes-engine`, `React-Core-prebuilt`, `ExpoModulesCore`, or anything `expo-modules-jsi`-adjacent): the simulator's existing native binary and the worktree's CocoaPods integration are stale against the new lockfile, and the app throws `[runtime not ready]: ReferenceError: Property 'MessageQueue' doesn't exist` immediately after the JS bundle loads. This is **not** a JS-side issue — Sentry, Detox, and the other usual suspects don't access `MessageQueue` at runtime; the error is Hermes / bridge init failing because the native binary was compiled before the patched `expo-modules-jsi` (INFRA-176) reached the Pods integration. Fix sequence: `cd app/ios && pod deintegrate && pod install` (rewires the Xcode project against the patched source), `rm -rf ~/Library/Developer/Xcode/DerivedData/Being-*` (kills stale build artifacts), delete the Being app from the simulator (removes the pre-patch native binary), then `npm run ios`. Metro cache clear alone does not fix this — the binary mismatch is native-side. Discovered during the INFRA-62 → dev back-merge.
- **Yargs array-coercion on duplicated `--testTimeout` CLI flag (INFRA-180, RESOLVED)**: ~15 tests were quarantined for "the CI fake-timer + coverage flake on Ubuntu" — a framing that turned out to be wrong. Actual root cause: `npm run test:integration -- --ci --testTimeout=30000` combined with the package.json script's own `--testTimeout=30000` made yargs produce an array `[30000, 30000]`. Jest formatted that into error messages as `"Exceeded timeout of 30000,30000 ms"` and coerced it to `NaN` for the actual timeout, which `setTimeout` treats as `0 ms`. Tests with async `waitFor` failed in ~10 ms; sync tests passed because they finished first. The asymmetry disguised a deterministic bug as flakiness. Fix shipped in PR #80 (commit `8a9b39e`): removed `--testTimeout=30000` from the package.json `test:integration` script (CI yaml still provides it). Re-enabled `PracticeTimerScreen`, `ReflectionTimerScreen`, `BodyScanScreen`, and `subscription.integration`. **Lesson**: when a Jest error contains an unexpected character (a comma, a duplicated value, malformed units), trust the literal message before reaching for environmental hypotheses — the original 2-hour investigation chased Ubuntu kernel timer resolution and Node-20 fake-timer bugs because it read `30000,30000` as `30000` with formatting noise. **Triage pattern for future**: reproduce locally with the EXACT CI invocation (including the `-- ` flag separator). If the local error string matches CI character-for-character, the variable is the command, not the environment. Resolution doc: `docs/development/test-fake-timer-ci-flake.md`. The PR-5 sync/analytics tests + `practices-flows-integration` + `comprehensive-assessment-integration` + `EmbodimentScreen` are still quarantined for **different** scenario-level reasons (shape drift, layer mismatch, import-path drift) — those need separate fixes, not the INFRA-180 fix.

## Git Hooks (INFRA-155)

Husky v9 wires two hooks. **pre-commit** (INFRA-156) runs `npm run precommit` → `typecheck && lint:baseline && test:clinical && test:unit` (~16s); fires on every `git commit`. **pre-push** (INFRA-155) runs `npm run prepush` → `check:crisis-hotline` (~1s); fires on every `git push`. Heavy CI-class checks (test:ci, full clinical-complete) run on CI, not locally — running them on every push would train `--no-verify`. **Bypass policy**: `--no-verify` (commit or push) permitted *only on `hotfix/*` branches*. For `feat/*`, `fix/*`, `chore/*` — never. Full rationale: `docs/development/git-hooks.md`.

## Convention Reminders

- TDD for: bug fixes, pure logic, stateful algorithms, complex edge cases. Test-after for: API integrations, UI, glue code.
- When making multi-file or architectural changes: outline approach, get approval, then build.
- Push back with reasoning when something is wrong; no performative agreement.
