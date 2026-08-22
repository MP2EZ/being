# Dependency Currency Assessment

**Work item:** INFRA-410 · **Assessed:** 2026-08-13 · **Tree:** `development` @ `1612383a`
**Scope of this document:** INFRA-410 AC1, AC2, AC3, **AC4a**, AC5, AC6, AC7.
**Carved out:** AC4b — the empirical build-and-launch probe — and the fix it validates, to
**INFRA-414**. See §1.6 for why the static adjudication is sufficient to *decide* the
question and what the probe is still needed to *confirm*.

> **This is a decision document, not an upgrade.** No dependency was installed, bumped, or
> pinned in producing it. `package.json`, `package-lock.json`, `patches/` and `.audit-ci.json`
> are untouched. The only artefact is this file.

### Provenance — how every number here was produced

All commands run in `app/` on `1612383a` with a clean tree.

| What | Exact command |
|---|---|
| Outdated set (55) | `GITHUB_TOKEN=$(grep _authToken ~/.npmrc \| head -1 \| sed 's/.*_authToken=//') npm outdated --json` |
| Advisory set (29) | `npm audit --audit-level moderate --json` |
| SDK 57 pin table | `curl -sL $(npm view expo@57.0.12 dist.tarball) \| tar -xzO package/bundledNativeModules.json` |
| Symbol presence | `curl -sL $(npm view expo-modules-core@<v> dist.tarball) \| tar -xzO package/ios/Core/Records/Record.swift \| grep -c 'func from(dictionary:'` |
| Registry metadata | `npm view <pkg> dist-tags\|versions\|dependencies\|peerDependencies\|engines --json` |

**The `GITHUB_TOKEN=` prefix is not optional.** A bare `npm outdated` 401s on
`@mp2ez/being-design-system` and falsely reports **1** outdated package instead of 55 — see
§11.2. Any future re-run of this assessment that reports a small number has hit the same
shadow, not a healthy tree.

---

## 1. AC4a — The `expo-print` adjudication

This section leads because it reverses a premise the work item itself was filed on, and that
reversal changes what the rest of this document is for.

### 1.1 The claim under test

INFRA-410's Technical Notes assert that INFRA-273's approach is *"likely obsolete"* because
`expo-print@56.0.4` was built against an **older** `expo-modules-core` than the installed
`56.0.13`, so *"moving core toward `56.0.23` goes further from the missing symbol, not
closer."*

### 1.2 Verdict: **that is backwards.** The symbol is *ahead* of the install.

`ExpoModulesCore.Record.from(dictionary:appContext:)` — the symbol whose absence produces the
dyld crash — was introduced in `expo-modules-core@56.0.16`:

```
expo-modules-core@56.0.13  →  func from(dictionary: count = 0     ← INSTALLED
expo-modules-core@56.0.15  →  func from(dictionary: count = 0
expo-modules-core@56.0.16  →  func from(dictionary: count = 2     ← symbol appears
expo-modules-core@56.0.23  →  func from(dictionary: count = 2     ← 56 train head
```

The installed `56.0.13` sits **below** the introduction point. Moving core forward on the 56
train moves **toward** the symbol, not away from it.

### 1.3 The mechanism, fully explained

`expo-print@56.0.4` published `2026-06-10T23:37:28.756Z`. `expo-modules-core@56.0.16`
published the same evening at `22:57Z` — **40 minutes earlier, same release batch**. So
`expo-print@56.0.4` was compiled against a core that *has* the symbol. Both packages ship
**prebuilt XCFrameworks**, so there is no source-level recompilation to paper over the gap: a
prebuilt `ExpoPrint` binary linked against a prebuilt `ExpoModulesCore@56.0.13` binary that
lacks the symbol is *precisely* a load-time missing-symbol abort.

This also explains the observation recorded in INFRA-273 that "a clean rebuild *should* have
fixed it and didn't." A clean rebuild cannot fix it. Nothing is being miscompiled — the
symbol is genuinely not in the binary being linked against.

### 1.4 Consequence: INFRA-273 is **vindicated, not obsolete**

INFRA-273's plan — *"align the SDK 56 patch train"* — is the correct approach. It was never
attempted because of a misread about which side of `56.0.16` the install sits on.

**The candidate fix is lockfile-only.** `expo@56.0.5` declares:

```
"expo-modules-core": "~56.0.13"
```

`~56.0.13` means `>=56.0.13 <56.1.0`, so **`56.0.23` is already inside the declared range**.
Reaching it requires no `expo` bump, no canary tag, no SDK 57 — only a lockfile resolution
move.

### 1.5 The canary path is strictly dominated — do not take it

`expo-print@56.0.4-canary-20260701-9100865` (the `canary-sdk-56` dist-tag) pairs with
`expo-modules-core@56.0.14-canary-20260701-9100865` — the same build hash. It therefore *also*
requires moving core, just to a canary rather than a stable. It offers nothing the stable path
does not, at strictly higher risk. **Rejected.**

### 1.6 One named blocker on any core bump — and AC2's patch question answered

`expo-modules-core@56.0.23` requires `expo-modules-jsi: ~56.0.12` (the installed
`56.0.13` requires `~56.0.7`). And:

```
expo-modules-jsi@56.0.7   →  'weak let' occurrences = 15   ← current patch target
expo-modules-jsi@56.0.12  →  'weak let' occurrences = 15   ← still present
```

The Xcode 26 / Swift 6.2 `weak let` hard error that INFRA-176 patched around is **not fixed
upstream**. So AC2's question — *"is the `expo-modules-jsi@56.0.7` patch still needed or can it
be deleted with its `postinstall`?"* — has a definite answer:

> **No. The patch cannot be deleted.** `patch-package` matches by `<name>+<version>.patch`, so
> a core bump silently orphans `expo-modules-jsi+56.0.7.patch` — the patch stops applying and
> the build fails on 15 `weak let` errors. It must be **regenerated** as
> `expo-modules-jsi+56.0.12.patch` as part of the same change.

This is the single most likely way a naive "just bump core" attempt fails.

### 1.7 What AC4b (INFRA-414) still has to confirm

The static case above establishes the **mechanism** and the **direction**. It does not
establish that `56.0.23` is free of *other* incompatibilities with the rest of the SDK 56
tree. INFRA-414 owns: regenerate the jsi patch, move core, build, and **launch** — because a
dyld abort is a load-time failure that only a launch observes.

**Note that nothing in this repo currently observes one.** `e2e-sim-build.sh` is build-only by
design (INFRA-407: "never let expo launch the app") and `e2e-safety.sh` never launches either.
A dyld abort surfaces through Maestro only as a misleading `_seeded-home` assertion failure.
There is no `simctl launch --console`, no crash-log capture, no `.ips` reader. **INFRA-414
must add a launch observation, or it cannot verify its own fix.**

### 1.8 A premise correction AC4-as-written depends on

AC4 asks whether pinning the canary *"on the **current stack**"* resolves the crash. That
presupposes `expo-print` is on the current stack. **It is not** — `git grep expo-print HEAD`
returns **zero** references on `development`. It exists only on
`feat/FEAT-270-export-pdf-option` @ `50bec470`, **369 commits behind** `development`.

Practical consequence: the fix in §1.4 is not validated by anything on `development` today. It
is a prerequisite for FEAT-271 (PDF export), not a repair of a live defect.

---

## 2. Bucket A go/no-go — **SDK 57 is externally blocked**

**Verdict: NO-GO on SDK 57. Blocked on a third party. Re-check trigger, not a date.**

One fact settles it independently of every other verdict in this document:

```
expo-speech-recognition dist-tags:
  sdk-50 … sdk-55 · next: 56.0.0 · latest: 56.0.1
```

**There is no 57.x release of `expo-speech-recognition`, and no `sdk-56`→`sdk-57` tag.** The
package is a direct dependency (`^56.0.1`) carrying FEAT-283's on-device STT hardening. It is
also the *only* Bucket A package that is currently **not** outdated — it is at its own latest.

An SDK 57 migration would have to either drop on-device speech recognition, or fork/vendor the
module. Neither is an upgrade decision; both are product decisions.

**Re-check trigger (not a calendar date):** `npm view expo-speech-recognition dist-tags` shows
a `57.x` on `latest` or a `sdk-57` tag. Watch the trigger, not the clock — a date-based
re-check on a third-party publication schedule is a guess.

### 2.1 What SDK 57 would cost even once unblocked

From `expo@57.0.12`'s `bundledNativeModules.json`:

| Package | Current pin | SDK 57 requires | Note |
|---|---|---|---|
| `react` | `19.2.3` | **`19.2.3`** | **unchanged** — the `version-check` invariant survives |
| `react-native` | `0.85.3` | `0.86.2` | one minor; *not* the `0.87.0` that `npm outdated` reports |
| `expo-modules-core` | `56.0.13` | `~57.0.10` | — |
| `react-native-reanimated` | `4.3.1` | `4.5.1` | breathing path |
| `react-native-worklets` | `0.8.3` | `0.10.1` | breathing path; **not** the `0.11.4` npm reports |
| `react-native-gesture-handler` | `~2.31.1` | `~2.32.0` | **stays on 2.x** |
| `@react-native-async-storage/async-storage` | `2.2.0` | `2.2.0` | **stays on 2.x** |

Two of these matter more than the version numbers suggest, and both point the same way:
**SDK 57 does not want the majors `npm outdated` is offering.** See §5.2 and §5.9 — the
`async-storage 3` and `gesture-handler 3` moves would put the tree *ahead* of the SDK it is
migrating to, not level with it.

`react@19.2.3` being unchanged is the most load-bearing single row here: it means the SDK 57
migration does **not** disturb the React pin that RN 0.85.x compatibility rests on, and the
`version-check` invariant (§11.1) stays true across the move.

---

## 3. Method — counting rules and the timebox floor

### 3.1 Counting rules (stated so the numbers are reproducible)

- **"55 outdated"** = entries returned by the token-corrected `npm outdated --json`.
- **"36 major-behind"** = entries whose `latest` major > `current` major by strict semver.
- **"38 breaking-behind"** = the 36 **plus** two `0.x` packages whose *minor* moved
  (`react-native 0.85.3 → 0.87.0`, `react-native-worklets 0.8.3 → 0.11.4`). Under semver a
  `0.x` minor bump **is** a breaking change, so a strict-major count understates the risk by
  exactly these two — both of which sit on the breathing-animation path that
  `check:breathing-worklets` guards. This is the fourth classification referenced in §4.
- **"17 native modules"** = `dependencies` keys matching `react-native-*` or `@react-native-*`.
  This excludes `expo-*` modules that also ship native code (counted in Bucket A) and excludes
  `react-native-nitro-modules`, which is transitive via `react-native-iap`.
- **"Bucket A = 23"** = `expo` + 20 `expo-*` runtime deps + `babel-preset-expo` + `jest-expo`.
  (AC2 estimates "~21"; the exact figure is 23, of which **22** are outdated.)

### 3.2 Floor on the "insufficient signal, re-check" escape hatch

AC1 permits closing a package as *"insufficient signal, re-check ⟨date⟩"*. Taken literally
that verdict could be applied to all 55 packages and the AC would still read as satisfied — and
no CI gate can distinguish that from real work. So it is bounded here:

> **A `defer` verdict is only valid if it names a *trigger* — an observable registry or
> upstream event — rather than a date alone.** "Re-check 2026-10-01" is not a verdict.
> "Re-check when `expo-speech-recognition` publishes a 57.x tag" is.

**Deferrals used in this document: 1 of 55** (Bucket A as a unit, §2, on a named registry
trigger). Every other package receives a go, a no-go, or a hold-with-stated-reason.

---

## 4. Classification scheme

Each package is one of:

| Class | Meaning |
|---|---|
| **SDK-coupled** | Version is dictated by the Expo SDK train. Cannot move independently. |
| **independent-major** | A real major, movable without the SDK. Costed on its own merits. |
| **breaking-minor** | `0.x` package whose minor moved — breaking despite the semver optics. |
| **hold-with-reason** | Movable in principle; held for a stated, re-checkable reason. |

---

## 5. Bucket B — independent majors, a verdict each

Ordered by decision weight, not alphabetically.

### 5.1 `typescript 6.0.3 → 7.0.2` — **HOLD**, sized `M`
Class: independent-major. Engines `node >=16.20.0` — satisfied (CI is Node 24).

MAINT-162 landed TS 6 and deliberately deferred the `baseUrl` removal, silencing it with
`ignoreDeprecations: "6.0"`. TS 7 **removes** `baseUrl`. The deferred work therefore becomes
mandatory at this bump, and it cannot be done in isolation: `tsconfig.json` currently pins
`types: ["node", "react"]` because TS 6 stopped auto-including `@types/node` ambient globals.
Removing `baseUrl` means re-validating `paths`, `types` and `typeRoots` **together**, across a
codebase that uses `@/core/*` and `@/features/*` aliases everywhere.

**Hold reason:** this is a self-contained, schedulable piece of work with no external blocker —
it should be its own item, not a line in an upgrade sweep. Interacts with `@types/node 24→26`
(§5.10); do them together.

### 5.2 `@react-native-async-storage/async-storage 2.2.0 → 3.1.1` — **NO-GO**, hold
Class: independent-major. Peers are `*` (no hard block).

**SDK 57 pins this package at `2.2.0` — the version already installed.** Moving to 3.x puts the
tree *ahead* of the SDK it would later migrate to, guaranteeing a future reconciliation. It
also touches wellness-ciphertext storage (INFRA-144), so it re-triggers the compliance and
encryption re-validation rows in §9 for no currency benefit.

**Verdict: hold until an SDK train pins 3.x.** Re-check trigger: `async-storage` appears at
`3.x` in a `bundledNativeModules.json`.

### 5.3 `@sentry/react-native 7.11.0 → 8.22.0` — **GO (independent)**, sized `M`
Class: independent-major. Peers `expo >=49`, `react >=17`, `react-native >=0.65` — all
satisfied on the current stack. **This is movable today, without SDK 57.**

The cost is not the bump, it is the re-validation: Being's Sentry integration carries a
`beforeSend` hook performing `containsCrisisContent` scrubbing (INFRA-310). A major that
touches hook signatures or event shape must be verified to still scrub, and that verification
is not covered by any existing gate — the dev env no-ops Sentry (empty DSN), so it only
validates from TestFlight.

**Requires:** `compliance` specialist (scrubbing boundary), plus a TestFlight validation pass.

### 5.4 `react-native-iap 15.3.1 → 16.3.0` — **GO (independent)**, sized `M`
Class: independent-major. New peer requirement `react-native-nitro-modules: ^0.36.5`; the tree
already carries `react-native-nitro-modules@0.35.7` transitively via iap@15, so this is a
**minor bump of an existing native module, not a new one** — but it is still a native
dependency move requiring a pod install and a CNG prebuild.

Subscriptions are revenue-path. Re-validation is a real sandbox purchase flow, which is
manual. Sequence **after** INFRA-84 (Supabase production readiness / sandbox receipt
validation), not before.

### 5.5 `jest 29.7.0 → 30.4.2` + `@testing-library/react-native 12.9.0 → 14.0.1` — **GO as a pair**, sized `M`
Class: independent-major ×2. **Must move together** — RNTL 14 peers `jest >=29.0.0`, so it
does not force jest 30, but the reverse coupling is what matters: jest 30's changed fake-timer
and module-registry behaviour is exactly the surface INFRA-180 and MAINT-188 fought.

Two concrete gates:
- RNTL 14 peers **`test-renderer: ^1.0.0`** — a *different package* from the
  `react-test-renderer@19.2.3` currently pinned in `overrides`/`resolutions`. That override
  pair (§7.2) has to be re-derived, not carried across.
- RNTL 14 engines: `node ^22.13.0 || >=24` — satisfied (CI Node 24).

**Carry the INFRA-180 lesson into this bump:** reproduce any failure with the *exact* CI
invocation including the `-- ` separator before theorising about the environment. That bug
presented as a Ubuntu fake-timer flake and was actually yargs array-coercion on a duplicated
`--testTimeout`.

### 5.6 `eslint 9.39.4 → 10.8.1` + `eslint-config-universe 15 → 16` + `eslint-plugin-react-hooks 5 → 7` — **GO as a set**, sized `M`
Class: independent-major ×3. `eslint-config-universe@16` peers `eslint >=8.10`, `prettier >=3`
— both satisfied, so the set is internally coherent.

The cost is `.eslint-baseline.json`. A rule-set change across three majors will move the
baseline counts wholesale, and the ratchet gate (`lint:baseline`, a `ci-pass` dependency)
compares against a checked-in file. Plan for a deliberate, reviewed baseline regeneration in
the same PR — and note the standing gotcha that a `--update` sweep pulls in unrelated drift,
so the regeneration must be inspected, not accepted.

### 5.7 `@babel/core 7.29.7 → 8.0.1` — **HOLD**, blocked on Bucket A
Class: independent-major. Engines `node ^22.18.0 || >=24.11.0` — satisfied locally (24.19.0)
and by CI's `NODE_VERSION: '24'`, **provided** the runner resolves 24.11+.

`babel-preset-expo` is SDK-coupled (`~56.0.0`, Bucket A) and is the primary consumer. Moving
`@babel/core` to 8 ahead of the preset invites a peer mismatch inside Metro's transform path —
which CI cannot catch, because `ci.yml` records that **CI does not run Metro**. A break here
surfaces only on a developer's or a build machine's first bundle.

**Hold until `babel-preset-expo` moves** (i.e. with Bucket A).

### 5.8 `uuid 13.0.2 → 14.0.1` — **GO**, sized `XS`
Class: independent-major. Direct dependency, no peers. Trivially movable. **Note this is a
*different* uuid from the one carrying GHSA-w5hq** — that one is `uuid@7.0.3`, nested at
`node_modules/xcode/node_modules/uuid`, and is unaffected by this bump (§7.1).

### 5.9 `react-native-gesture-handler 2.31.2 → 3.1.0` — **NO-GO**, hold
Class: independent-major. Peers are `*`.

**SDK 57 pins `~2.32.0` — it stays on the 2.x line.** Same reasoning as §5.2: moving to 3.x
would put the tree ahead of the target SDK. Re-bucketed here as **SDK-coupled in practice**
despite loose declared peers — gesture-handler is tightly bound to the RN version through its
native view-manager surface, and its declared `*` peers understate that.

Available move within the line: `2.31.2 → 2.32.0` alongside Bucket A.

### 5.10 `@types/jest 29 → 30` and `@types/node 24 → 26` — **coverage gap, now classified**
Neither appeared in AC2's enumeration. Both are `devDependencies` type packages:
- `@types/jest 29.5.14 → 30.0.0` — **GO, but bundled with §5.5.** Types must match the jest
  major; moving it alone produces false type errors.
- `@types/node 24.12.4 → 26.2.0` — **HOLD, bundled with §5.1.** `tsconfig.json` explicitly
  pins `types: ["node", "react"]` because of the TS 6 ambient-globals change, so a `@types/node`
  major and the TS 7 move have to be validated together.

### 5.11 Bucket B summary

| Package | Class | Verdict | Size | Gate |
|---|---|---|---|---|
| `typescript 6→7` | independent-major | HOLD | `M` | own item; pairs with `@types/node` |
| `async-storage 2→3` | independent-major | **NO-GO** | — | SDK 57 pins 2.2.0 |
| `@sentry/react-native 7→8` | independent-major | **GO** | `M` | `compliance` + TestFlight |
| `react-native-iap 15→16` | independent-major | **GO** | `M` | after INFRA-84 |
| `jest 29→30` + `RNTL 12→14` | independent-major ×2 | **GO (pair)** | `M` | `test-renderer` override rework |
| `eslint 9→10` set (×3) | independent-major ×3 | **GO (set)** | `M` | baseline regeneration |
| `@babel/core 7→8` | independent-major | HOLD | `S` | blocked on `babel-preset-expo` |
| `uuid 13→14` | independent-major | **GO** | `XS` | none |
| `gesture-handler 2→3` | SDK-coupled (re-bucketed) | **NO-GO** | — | SDK 57 pins 2.32.0 |
| `@types/jest 29→30` | independent-major | GO (with jest) | `XS` | — |
| `@types/node 24→26` | independent-major | HOLD (with TS 7) | `XS` | — |

---

## 6. Bucket C — the 17 non-major outdated packages

Not enumerated in the ACs, recorded for completeness. All are within-major and individually
low-risk: `@react-navigation/*` (3), `@supabase/supabase-js`, `@types/react`,
`@typescript-eslint/*` (2), `posthog-react-native`, `prettier`, `react` + `react-test-renderer`
(both `19.2.3 → 19.2.8`), `react-native-reanimated`, `react-native-safe-area-context`,
`react-native-screens`, `react-native-svg`, `ts-jest`, `zustand`.

**One trap here.** `react 19.2.3 → 19.2.8` and `react-test-renderer 19.2.3 → 19.2.8` look like
routine patch bumps. They are **pinned deliberately** in both `overrides` and `resolutions`,
and `react` is additionally guarded by the `version-check` invariant. Do not sweep them with a
generic "patch bumps are safe" pass — see §7.2 and §11.1.

**Verdict for the rest: GO as a single housekeeping item**, sized `S`, excluding the two React
packages, `react-native-reanimated` and `react-native-screens` (Bucket A adjacent — move with
the SDK).

---

## 7. AC5 — Security posture: does any proposed upgrade discharge the allowlist?

**Headline verdict: no. Zero of the eight allowlist entries are discharged by any upgrade
proposed in this document — including SDK 57. One is dischargeable immediately because it is
already stale.**

This is the inverse of what AC5 hoped for ("the allowlist shrinks by upgrade rather than by
accretion"), and it is worth stating plainly: **the allowlist cannot currently shrink by
upgrade.**

Current audit state on `1612383a`: **0 critical / 17 high / 12 moderate / 29 total** — matching
the figures in INFRA-410's Technical Notes exactly.

### 7.1 Per-GHSA verdict

Resolved by matching each allowlist entry against the live `npm audit --json` tree, not against
`fixAvailable` (which proposes `expo@53.0.27` — a **major downgrade** from the pinned SDK 56 —
for two of them, and is therefore not a real remedy).

| GHSA | Live? | Real path in tree | Recorded drop-condition | Verdict |
|---|---|---|---|---|
| `GHSA-ph9p-34f9-6g65` | **NO — stale** | *not present* | "Expo ships `@expo/config-plugins >=56.0.9` stable" | **DROP NOW** — §7.2 |
| `GHSA-6vfc-qv3f-vr6c` | yes | `markdown-it@10` ← `react-native-markdown-display@7` | *(mis-recorded — see §7.3)* | **not dischargeable** |
| `GHSA-w5hq-g745-h8pq` | yes | `uuid@7.0.3` @ `node_modules/xcode/node_modules/uuid` | "Expo ships `config-plugins >=56.0.9`" | **not dischargeable** — §7.4 |
| `GHSA-6v5v-wf23-fmfq` | yes | `markdown-it@10` | "if `react-native-markdown-display` upgrades `markdown-it`" | **not dischargeable** — §7.5 |
| `GHSA-22p9-wv53-3rq4` | yes | `linkify-it@2.2.0` ← `markdown-it@10` | drop with `6v5v` | **not dischargeable** — §7.5 |
| `GHSA-v245-v573-v5vm` | yes | `linkify-it@2.2.0` | drop with `22p9`/`6v5v` | **not dischargeable** — §7.5 |
| `GHSA-5p2g-fcmc-qvqq` | yes | `image-size` ← `metro` | "when metro ships a bump to a patched `image-size`" | **not dischargeable** — §7.6 |
| `GHSA-w3rx-r6r6-pgpr` | yes | `image-size` ← `metro` | same | **not dischargeable** — §7.6 |

### 7.2 `GHSA-ph9p-34f9-6g65` — already stale, drop it for free

**It does not appear in the tree at all.** Seven of eight allowlist entries resolve to a live
advisory; this one resolves to nothing, which is what `audit-ci`'s "Consider not allowlisting"
flag has been reporting.

Three separate close-outs (FEAT-313, INFRA-350, INFRA-359) each explicitly *left it in place*,
every one citing the same reason — that its drop-condition (`@expo/config-plugins` bump) was
"unrelated scope". That reasoning was sound for those changes but it answers the wrong
question: the entry does not need its drop-condition satisfied, because there is nothing left
to allowlist. `tmp` in this tree arrives via **`patch-package@8.0.1`**, not via
`@expo/config-plugins`.

> **Recommendation: delete `GHSA-ph9p-34f9-6g65` from `.audit-ci.json`'s allowlist as a
> standalone `XS` chore.** Zero dependency movement, and it removes a permanently-noisy
> `audit-ci` warning. This is the only allowlist shrinkage available today.

### 7.3 `GHSA-6vfc-qv3f-vr6c` — the recorded path is wrong

`.audit-ci.json` records this as one of *"the first three CVEs… transitive through
`@expo/config-plugins@56.0.8`"*, with the drop-condition *"Review when Expo ships
`@expo/config-plugins >=56.0.9` stable."*

**The live path is `markdown-it@10` ← `react-native-markdown-display@7`** — the same node that
carries `GHSA-6v5v`. It is a **fourth member of the markdown-it/linkify-it cluster** (§7.5),
not a config-plugins issue, and its recorded drop-condition would never have fired.

> **Correction needed in `.audit-ci.json`:** re-file `GHSA-6vfc` under the markdown cluster and
> restate its drop-condition as *"drop with `6v5v`/`22p9`/`v245` when
> `react-native-markdown-display` upgrades `markdown-it`/`linkify-it` past the vulnerable
> range."*

### 7.4 `GHSA-w5hq-g745-h8pq` — the config-plugins bump would *not* discharge it

This is the one entry whose recorded drop-condition is now technically satisfiable — and
checking it is what shows the condition to be wrong.

`@expo/config-plugins` **has** shipped past `56.0.9` on a stable `sdk-56` tag: the tag now
points at **`56.0.14`** (tree holds `56.0.8`). But `56.0.14` still declares `xcode: ^3.0.1`,
identical to `56.0.8`, and the vulnerable `uuid@7.0.3` is nested **under `xcode`**:

```
node_modules/xcode/node_modules/uuid   (7.0.3)   ← the advisory node
```

So bumping `@expo/config-plugins` to `56.0.14` — whether directly or via SDK 57 — leaves the
advisory in place. The drop-condition names the wrong package: it should name **`xcode`**.

> **Correction needed in `.audit-ci.json`:** restate `GHSA-w5hq`'s drop-condition as *"drop when
> `xcode` ships a release depending on `uuid >=11.1.1`"* — currently `xcode@3.0.1` is latest.

### 7.5 The markdown-it / linkify-it cluster (4 entries) — no fix exists

`react-native-markdown-display@7.0.2` **is already the latest published version** and pins
`markdown-it@10`, which pins `linkify-it@2.2.0`. `npm audit` reports `fixAvailable: false` for
both nodes. No upgrade in this assessment — SDK 57 included — moves them.

The exposure argument in `.audit-ci.json` still holds and should be preserved verbatim on any
re-file: the sole call site is `LegalDocumentScreen` rendering **bundled first-party** legal
docs (`legalContent.generated.ts` ← `docs/legal/*.md`), so the quadratic blow-up requires
attacker-controlled markdown Being has no path to.

**Only real discharge route:** replace `react-native-markdown-display` — a UI-surface change to
the legal-document screen, not a dependency bump. Out of scope here; recorded as a candidate.

### 7.6 The `image-size` pair (2 entries) — structurally undischargeable

The advisory range is `*` — **every published version of `image-size` is vulnerable**, and
`2.0.2` is still latest. There is no same-major fix and no cross-major fix. `npm`'s proposed
remedy is `expo@53.0.27`, a major downgrade from the pinned SDK 56.

Reached only through `metro` (build-time; never bundled into the RN runtime), reading image
dimensions from the developer's own asset directory. **No upgrade path exists at all**, so
these two entries are permanent until upstream `image-size` publishes a fix.

### 7.7 The 13 `overrides` / `resolutions` — which stop being load-bearing?

`overrides` and `resolutions` are **byte-identical** (13 entries each), correct per the
mirror rule.

| Override | Purpose | Under proposed upgrades |
|---|---|---|
| `react: 19.2.3` | RN 0.85.x compat pin | **still load-bearing** — SDK 57 also pins `19.2.3` |
| `react-test-renderer: 19.2.3` | matches React pin | **must be re-derived** if RNTL 14 lands (§5.5 — peers `test-renderer`, a different package) |
| `@types/react: 19.2.14` | matches React pin | still load-bearing |
| `form-data: 4.0.6` | GHSA-hmw2 lockfile fix | still load-bearing |
| `shell-quote: ^1.10.0` | GHSA-395f (INFRA-302) | still load-bearing |
| `brace-expansion@^1.1.7: 1.1.18` | GHSA-rgw5 (FEAT-313) | still load-bearing |
| `brace-expansion@^5.0.5: 5.0.9` | GHSA-rgw5 (FEAT-313) | still load-bearing |
| `postcss: ^8.5.18` | transitive hygiene | still load-bearing |
| `js-yaml@^3.13.1: 3.15.1` | GHSA-5p4m (INFRA-350) | still load-bearing |
| `js-yaml@^4.1.0: 4.3.1` | GHSA-5p4m | still load-bearing |
| `js-yaml@^4.1.1: 4.3.1` | GHSA-5p4m | still load-bearing |
| `nanoid@^3.3.11: 3.3.18` | GHSA-2v37 (INFRA-359) | still load-bearing |
| `nanoid@^3.3.16: 3.3.18` | GHSA-2v37 | still load-bearing |

**Verdict: 12 of 13 remain load-bearing under every upgrade proposed here. One
(`react-test-renderer`) needs rework rather than removal.** No override becomes free.

### 7.8 `patch-package` resolution under any proposed tree

Per §1.6, a core bump **breaks** `npx patch-package` unless the patch is regenerated for
`56.0.12`. The standing verification step — `npx patch-package` still resolves the pinned jsi —
must be run on any tree produced by INFRA-414.

**And the standing prohibition holds unconditionally: never run a blanket `npm audit fix`.** It
bumps past the `expo-modules-jsi` pin and breaks `npm ci`. Every advisory response above is
per-advisory by construction.

---

## 8. AC6 — Native and config surface inventory

### 8.1 The 15 `react-native-*` / `@react-native-*` modules

| Module | Pin | Verdict |
|---|---|---|
| `@react-native-async-storage/async-storage` | `2.2.0` | **hold** — §5.2 |
| `@react-native-community/datetimepicker` | `9.1.0` | current |
| `@react-native-community/netinfo` | `12.0.1` | current |
| `@react-native-picker/picker` | `^2.11.4` | current |
| `@react-native-vector-icons/ionicons` | `13.1.2` | current |
| `@react-native-vector-icons/material-design-icons` | `13.1.2` | current — **crisis path**, keep eager-imported |
| `react-native-aes-crypto` | `^3.2.1` | current — **wellness encryption**; any move needs `compliance` |
| `react-native-gesture-handler` | `~2.31.1` | **hold at 2.x** — §5.9 |
| `react-native-iap` | `^15.3.1` | **GO** — §5.4 |
| `react-native-markdown-display` | `^7.0.2` | at latest; carries 4 allowlisted GHSAs (§7.5) |
| `react-native-reanimated` | `4.3.1` | **breathing path** — move with Bucket A |
| `react-native-safe-area-context` | `~5.7.0` | within-major bump available |
| `react-native-screens` | `4.25.2` | within-major; move with Bucket A |
| `react-native-svg` | `15.15.4` | within-major (patch) |
| `react-native-worklets` | `0.8.3` | **breaking-minor** — §8.2 |

### 8.2 The breathing path is the sharpest native risk

`react-native-reanimated` + `react-native-worklets` are the two modules
`npm run check:breathing-worklets` guards, and `worklets 0.8.3 → 0.11.4` is **three breaking
`0.x` minors** — the exact case §3.1's fourth classification exists to surface.

`check:breathing-worklets` is a **structural** guard: it fails if `runOnJS`/a state-setter
returns to a `useAnimatedStyle`/`useDerivedValue`/`useAnimatedReaction`/`useFrameCallback`
body, if `requestAnimationFrame` appears on that path, or if `BreathingCircle` loses
`React.memo` or its module-scope prop constants. **It does not measure frames and cannot** — CI
is 100% `ubuntu-latest`.

So a worklets major can regress the 60fps budget while every gate stays green. Real
on-device measurement is INFRA-373, which is itself blocked on naming a calibration handset
and respecifying its ACs. **Any worklets/reanimated move must therefore carry a manual
on-device 60fps sign-off**, and should be sequenced with SDK 57 (which pins `worklets 0.10.1`,
not `0.11.4`) rather than taken independently.

### 8.3 Config-plugin and CNG surface

- **`app/plugins/withAppGroupsEntitlement.js`** — local config plugin injecting the iOS widget
  App Groups entitlement (replaced `expo-build-properties`'s `ios.entitlements`, removed in SDK
  56). An SDK 57 move must re-verify the plugin still applies; a silently-dropped entitlement
  breaks the widget with no build error.
- **CNG (INFRA-280)** — `app/ios/` is gitignored and regenerated by `expo prebuild`. `app.json`
  is the **sole** source of the generated `Info.plist`, so no reviewer ever sees a plist diff.
  This is why `LSApplicationQueriesSchemes` (`tel`, `sms`) has a dedicated jest static-config
  pin running in both `precommit` and the `Safety + privacy gates` CI job. **Any SDK major must
  re-run that pin**, and it is CI-gated, so it will hold.
- **Android native is still committed** — the CNG follow-up is pending. An SDK 57 move must
  regenerate or reconcile Android by hand, which is unmeasured work not costed here.
- **`expo-speech-recognition`** — §2. The Bucket A blocker.

---

## 9. AC7 — Re-validation cost per bucket

Which Validation Matrix rows each bucket re-triggers. Being's CI has **10 strict gates** wired
into `ci-pass`'s `needs` **and** its exit condition: `typecheck`, `lint`, `crisis-validation`,
`clinical-validation`, `test`, `security`, `accessibility`, `performance`, `edge-functions`,
`safety-privacy`.

| Bucket | Automated gates re-triggered | Manual / uncovered cost |
|---|---|---|
| **A — SDK 57** | all 10 | 8 Maestro safety flows (local-only); on-device 60fps; widget entitlement; Android native reconcile; **new**: launch observation per §1.7 |
| **B — Sentry 7→8** | `security`, `safety-privacy`, `test` | `compliance` specialist on `containsCrisisContent` scrubbing; **TestFlight-only** (dev env no-ops Sentry) |
| **B — iap 15→16** | `test` | sandbox purchase flow (manual); pod install + prebuild |
| **B — jest/RNTL** | `test`, `clinical-validation`, `crisis-validation`, `accessibility` | override rework; INFRA-180 triage discipline |
| **B — eslint set** | `lint` | reviewed `.eslint-baseline.json` regeneration |
| **B — TS 7** | `typecheck`, `lint` | `baseUrl`/`paths`/`types` re-validation |
| **C — housekeeping** | `test`, `typecheck` | none |
| **INFRA-414 (core bump)** | all 10 | jsi patch regeneration; **launch observation**; `npx patch-package` verification |

### 9.1 What the gates do *not* cover — read before sizing anything above

- **Performance budgets are only partly enforced.** Crisis detection `<200ms` is a strict CI
  gate. Crisis button `<200ms` is a coarse jest proxy measuring synthetic dispatch, not
  tap→render. **Breathing 60fps is structural-only and genuinely unmeasured** (§8.2). App
  launch `<2s` and check-in transition `<500ms` are enforced by **nothing**.
- **The Maestro safety gate is local-only** (no CI macOS runners) and verifies UI reachability
  and thresholds — **not** telemetry delivery (INFRA-400/DEBUG-409).
- **CI does not run Metro** — stated verbatim at `.github/workflows/ci.yml:391`. Any change to the transform path —
  `@babel/core`, `babel-preset-expo`, Metro itself — is structurally uncatchable by CI. This is
  the specific reason §5.7 holds `@babel/core 8`.

### 9.2 Tooling prerequisites — corrected

AC7 asks whether `e2e-sim-build.sh` and "the `eas-cli` floor (INFRA-351)" need work first.

**`e2e-sim-build.sh`: no work needed for these upgrades, one gap for INFRA-414.** Since
INFRA-383 it builds via `expo run:ios --configuration Release` (~11–14 min cold in a fresh
worktree, ~35–75 s warm) and asserts fail-closed that the artefact is launcher-free, newer than
the run, matches the resolved `e2e-sim` env, and kept `tel`/`sms` in
`LSApplicationQueriesSchemes`. The one gap is §1.7: it is **build-only** and never launches, so
it cannot observe a dyld abort.

**The `eas-cli` floor: no work needed, and the citation is correct.** AC7 cites INFRA-351,
which is a real, shipped item — *"Tighten `app/eas.json` `cli.version` to a bounded range in
lockstep with release.yml's pin"* (merged PR #320, commit `193451be`). It is the second half of
a **pair**:

- **INFRA-345** pinned `release.yml`'s `eas-version: 21.6.0` (`release.yml:101`, rationale at
  `:67`) — the CLI is a moving flag surface, so `latest` was replaced with an explicit pin.
- **INFRA-351** bounded `app/eas.json`'s `cli.version` in lockstep and added
  `app/__tests__/scripts/eas-cli-version-lockstep.test.js` as the CI guard.

Since INFRA-383 the **default** gate build path uses **no `eas-cli` at all**. `release.yml` and
the rollback path `npm run e2e:safety:build:eas` still do, so the pin remains load-bearing —
it is simply not on the critical path for these upgrades.

---

## 10. Recommended follow-up work items

The spike's expected output. In dependency order.

| # | Item | Size | Depends on |
|---|---|---|---|
| 1 | **INFRA-414** (exists) — regenerate jsi patch as `56.0.12`, move `expo-modules-core` `56.0.13 → 56.0.23`, add a **launch observation** to the e2e path, verify the dyld crash clears | `M` | — |
| 2 | Drop stale `GHSA-ph9p-34f9-6g65`; correct the recorded drop-conditions for `GHSA-6vfc` (§7.3) and `GHSA-w5hq` (§7.4) | `XS` | — |
| 3 | `@sentry/react-native 7 → 8` + scrubbing re-validation | `M` | — |
| 4 | `jest 30` + `RNTL 14` + `@types/jest 30` + `test-renderer` override rework | `M` | — |
| 5 | `eslint 10` set + reviewed baseline regeneration | `M` | — |
| 6 | `typescript 7` + `@types/node 26` + `baseUrl` removal | `M` | — |
| 7 | `react-native-iap 15 → 16` | `M` | INFRA-84 |
| 8 | Bucket C housekeeping sweep (13 within-major bumps) | `S` | — |
| 9 | **SDK 57 migration** | `XL` | `expo-speech-recognition` 57.x publishing |

Items 2–6 and 8 are all movable **today**, independent of the SDK train. That is the practical
headline: **the tree being "36 majors behind" does not mean 36 blocked upgrades** — six
schedulable items cover most of the real currency debt, and the SDK blocker gates only Bucket A.

---

## 11. Findings recorded, not fixed

Out of scope for this spike; recorded so they are not rediscovered.

### 11.1 The `version-check` script is dead code, and guards the wrong half

`app/package.json:84` defines:

```json
"version-check": "node -e \"const pkg=require('./package.json'); if(pkg.dependencies.react !== '19.2.3') throw new Error('React must be 19.2.3 for RN 0.85.x compatibility')\""
```

Two problems:
1. **Nothing invokes it.** A repo-wide grep across `package.json`, workflows, scripts and shell
   finds exactly one occurrence — its own definition. It is not in `precommit`, `prepush`, or
   any `ci.yml` job.
2. **It only checks `react`.** `react-native` — the other half of the compatibility pair the
   error message names — has no pin enforcement at all.

CLAUDE.md states "React must stay at `19.2.3` for RN 0.85.x compatibility — `version-check`
script enforces." **It does not enforce; it is never run.** The `overrides`/`resolutions` pins
are what actually hold the version. Worth either wiring into `precommit` (and extending to
`react-native`) or deleting — but not leaving as a documented guarantee that isn't one.

### 11.2 The `.npmrc` `GITHUB_TOKEN` shadow silently falsifies `npm outdated`

`app/.npmrc` references `${GITHUB_TOKEN}`, which shadows the PAT in `~/.npmrc`. A bare
`npm outdated` 401s on `@mp2ez/being-design-system` and reports **1** outdated package instead
of 55 — a *quiet* wrong answer, not an error. Any dependency tooling added later (a Renovate
config, a scheduled currency check) will hit this and report a healthy tree.

### 11.3 CLAUDE.md's `postinstall` description is incomplete

CLAUDE.md describes the INFRA-176 wiring as `"postinstall": "patch-package"`. The actual script
is:

```
"postinstall": "patch-package && node scripts/generate-legal-content.js"
```

The second half regenerates `legalContent.generated.ts` from `docs/legal/*.md` — the input to
`LegalDocumentScreen`, and therefore to the markdown-it advisory cluster's only call site
(§7.5). Minor, but it means `postinstall` is not safe to treat as "just the patch."
