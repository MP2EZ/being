# MAINT-226 — Audit Follow-up Decisions

**Date:** 2026-06-06
**Ticket:** [MAINT-226 — Audit follow-up decisions: cert pinning, auth model, crisis 15–19 semantics, fail-open breaker](https://app.notion.com/p/377a1108c20881b9b3b2cf0a9f1a25d2)
**Author:** `/b-work maint-226` — decisions investigated against source and signed off by the `security`, `compliance`, `crisis`, and `philosopher` specialist agents; **ratified by the owner**.
**Scope:** Four audit findings from the 2026-06-06 multi-dimension audit of `development` need owner/specialist sign-off before their fix tranches can proceed. **Decision record only — no code changes ship from this work item.** The fixes land in downstream tranches **T2, T12, T13**.
**Grounded in:** source as read on branch `chore/maint-226-audit-followup-decisions` (off `development` @ `9135dd1`). Every file:line below was re-verified against that branch before publication.

---

## TL;DR

This work item is tranche **T0b**, risk rank **#1 (enabler)**. It ratifies four decisions so the downstream fix tranches inherit unambiguous ACs.

| ID | Finding | Severity | Ratified decision | Gates |
|---|---|---|---|---|
| **D — SEC-09** | RLS policies key on `current_setting('app.device_id')` but the app **never sets it** → per-device isolation is **effectively unenforced**; the DPIA already credits RLS as a live control | **Critical** | **Anonymous-session** (`signInAnonymously` + `auth.uid()` RLS); reject device-attestation | T12 |
| **E — TEST-07** | Pure `detectCrisis()` triggers only at ≥20, so PHQ-9 **15–19 returns `null`** — no support offer, violating the "≥15 = support resources offered" contract (and a test actively pins the bug) | **Critical** (safety) | **Fix:** 15–19 emits a distinct support tier; consolidate to one `detectCrisis` source of truth; preserve the support-vs-intervention tier distinction end-to-end | T13 |
| **F — SEC-07** | Crisis circuit-breaker fallback returns `{ isCrisis: false }` for ~5s on trip — a false-negative generator (currently **dormant** config, not wired live); 2000ms timeout exceeds the <200ms budget | **High** (safety) | **Non-breakable** crisis detection + **fail-safe toward support**; never `{isCrisis:false}`; align timeout to ≤200ms; precommit config-guard | T13 |
| **C — SEC-03** | `pin_validation_success` audit event emitted on every request, but **no TLS pinning is performed** (native call commented out, `validateCertificatePin` never invoked) | **High** (integrity) | **Remove the false claim now**; scope real pinning as a separate deferred tranche. **Not a launch blocker** | T2 |

**Cross-decision priority: D > C.** Both security and compliance ranked the unenforced-RLS gap (D) above the cert-pinning false claim (C): TLS still protects the wire, but RLS is the only server-side tenant boundary, and the DPIA documents it as live. **D and E are launch blockers; F fixes a dormant defect cheaply; C's false-claim removal is a compliance priority but real pinning is deferrable.**

---

## Decision D — SEC-09 · Supabase auth model

### Finding (verified)
The Supabase client is created with the anon key only — `autoRefreshToken: false, persistSession: false` (`app/src/core/services/supabase/SupabaseService.ts:178–179`). There is **no `signInAnonymously()`, no per-user JWT, no session**. RLS policies isolate rows via the Postgres session variable `current_setting('app.device_id', true)` (`app/src/core/services/supabase/schema.sql:123, 131, 140, 530, 539`) — **not** `auth.uid()`.

**The live bug:** nothing in the app ever sets `app.device_id` — no `set_config`, no `SET`, no header injection anywhere in `app/src` (verified by grep). So RLS evaluates `device_id = NULL` on every request → returns no rows by default, **but writes still flow on the anon key + the app-supplied `user_id`**. Per-device isolation is effectively unenforced; today's isolation rests on a client-trusted identity. The DPIA (`docs/legal/dpia-sensitive-wellness-data.md` §7, Control 6) credits "Row-Level Security on all Supabase tables" as a live mitigation, and `docs/security/supabase-rls-verification.md` is marked "VERIFIED: PASS" — but that verification used SQL-editor `SET LOCAL app.device_id = …` and never exercised the runtime app path.

### Decision: Anonymous-session (`signInAnonymously` + `auth.uid()` RLS). Reject device-attestation.
Adopt Supabase `signInAnonymously()` so each device gets a real server-issued JWT; rewrite all RLS policies from `current_setting('app.device_id', true)` to `USING (… = auth.uid())`; flip `persistSession`/`autoRefreshToken` to `true` so the JWT survives restarts and refreshes; migrate existing `device_id` rows to the minted `auth.uid()` (idempotent, reversible, keep `device_id` as a transitional secondary key). Reject App Attest / Play Integrity device-attestation as overkill.

### Rationale (security + compliance co-sign)
The threat model is wellness-data confidentiality for a no-account app, not hardware-forgery fraud. `auth.uid()` is server-verified and client-unspoofable, closing the unenforced-RLS hole with genuine isolation; it is low-complexity, offline-friendly, needs no native modules, and matches the existing direction — the `verify-apple-receipt` / `verify-google-receipt` Edge Functions already read `auth.uid()` from a JWT, and `schema.sql` references a "Phase 2c" rewrite onto `auth.uid()`. Device-attestation buys anti-Sybil/anti-emulator protection we don't need at the cost of native attestation, server verification, Expo prebuild plugins, perpetual OS maintenance, and a new Apple/Google processor relationship — and it over-collects hardware signals, a GDPR/TDPSA data-minimization concern. AES-256 client-encryption of `encrypted_backups` reduces the *impact* of the gap for backup data (an attacker reading another's row gets opaque ciphertext with no key), but does **not** cover `subscriptions` / `subscription_events`, so the fix is still required before broad launch. The unenforced RLS as documented in the DPIA is a gap between the regulator-facing control inventory and production reality, independent of the encryption backstop.

### Downstream AC + tests → T12
- Client calls `signInAnonymously()`; `persistSession` / `autoRefreshToken` flipped from `false` (`SupabaseService.ts:178–179`).
- All RLS policies rewritten from `current_setting('app.device_id', true)` to `auth.uid()` predicates.
- Idempotent, reversible migration of existing `device_id` rows → minted `auth.uid()`; `device_id` retained as transitional secondary key.
- **Key acceptance test — cross-device isolation:** device A (anon user A) writes a backup; assert device B (anon user B) **cannot read or write it** via RLS (the proof the current setup cannot pass).
- Fail-closed verified: no/invalid JWT → zero rows read **and** writes rejected (not true today).
- Edge-Function `auth.uid()` still resolves under the anonymous JWT; offline-tolerant sign-in + token refresh covered.
- Re-verify `docs/security/supabase-rls-verification.md` against the runtime app flow (not SQL-editor `SET LOCAL`); update DPIA §7 Control 6. `compliance` agent planning pass (touches privacy / wellness-data).

---

## Decision E — TEST-07 · PHQ-9 15–19 support trigger

### Finding (verified)
The pure function `detectCrisis(result, userId)` in `app/src/features/crisis/types/safety.ts` gates the PHQ-9 score branch on `CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE`, which is **20** (`safety.ts:34`, gate at `safety.ts:351`). So a PHQ-9 of **15–19 with Q9=0** produces an empty triggers array and the function **returns `null`** (`safety.ts:370`) — a silent no-detection that violates the CLAUDE.md contract "≥15 = support resources offered; ≥20 = active intervention." `detection.quick.test.ts:34` **actively pins the bug** (`expect(detectCrisis(phq(19), 'u1')).toBeNull()`).

A **second, divergent** implementation — `CrisisDetectionService.detectCrisis` in `app/src/features/assessment/stores/assessmentStore.ts` (~`:320`) — uses the correct `CRISIS_THRESHOLDS.PHQ9_CRISIS_SCORE` = **15** and *does* emit `phq9_moderate_severe_score` ("high") for 15–19. A second latent bug lives here too: the store emits `phq9_moderate_severe_score` even at ≥20 and **never emits `phq9_severe_score`** (the intervention-tier trigger type). `validation.ts:415` also invalidates any detection with `triggerValue < 20`, which would reject legitimate 15–19 support detections.

### Decision: Fix. One source of truth. Preserve the tier distinction.
The pure `detectCrisis()` in `safety.ts` becomes the **single source of truth**:
- **15–19 (Q9=0)** → emit a distinct **support-tier** trigger `phq9_moderate_severe_score` (severity "high", resources-*offered* UX).
- **≥20 (Q9=0)** → `phq9_severe_score` (active-intervention tier, "critical").
- **Q9 > 0** at any total → `phq9_suicidal_ideation` (immediate intervention) — unchanged.

The store's `CrisisDetectionService` **delegates** to the pure function so thresholds and trigger vocabulary have one owner (this also fixes the store's missing `phq9_severe_score` at ≥20). Relax the `validation.ts:415` `< PHQ9_CRISIS_SCORE` invalidation to the 15-floor for the support tier. The support-vs-active-intervention distinction is preserved **end-to-end (scoring → copy → UX)** — collapsing the two tiers is rejected.

### Rationale (crisis + philosopher co-sign)
Zero-false-negatives makes the current `null` a defect, not a design choice: a user self-screening at 17 (moderate-to-severe band) is contractually owed a support offer and currently receives nothing from this path. Two `detectCrisis` implementations with divergent thresholds and trigger vocab is exactly the ambiguity a safety contract cannot tolerate — the pure function wins because it is pure (trivially testable), already owns the full trigger taxonomy, and is the entrypoint the crisis-feature consumers import.

**Philosopher co-sign:** a graduated response (gentle *offer* at 15–19, more directive *intervention* at ≥20) is more coherent with the framework than a binary crisis/no-crisis switch. A support offer is dichotomy-of-control-respecting — resources are placed before the user and assent remains theirs (prohairesis intact); the intervention tier becomes appropriately directive only where the clinical signal (≥20, or Q9>0) suggests judgment may be compromised. **Condition of sign-off:** the 15–19 surface copy must stay non-pathologizing and within Being's wellness framing ("wellness screening," not "clinical assessment"; name the experience, not a diagnosis; provide an easy decline; do not slide into minimizing). Final copy gets a `compliance` terminology pass.

### Downstream AC + tests → T13 (Test-first — clinical/safety override)
- Boundary tests: PHQ-9 **14 → `null`**, **15 → support tier**, **19 → support tier**, **20 → intervention tier**; **Q9>0 → immediate** at any total.
- **Invert** `detection.quick.test.ts:34` (the assertion that currently pins the bug).
- **Pure-vs-store parity test:** both `detectCrisis` paths return the same primaryTrigger/severity for {14, 15, 19, 20, Q9>0} so divergence cannot silently reappear.
- Fix the store's missing `phq9_severe_score` at ≥20 (own AC line so it isn't lost).
- Relax `validation.ts` 15-floor for the support tier. `crisis` + `philosopher` agent planning passes; `compliance` copy-terminology pass.

---

## Decision F — SEC-07 · Crisis circuit-breaker fail-safe default

### Finding (verified)
`app/src/core/services/resilience/CircuitBreakerService.ts` configures `ProtectedService.CRISIS_DETECTION` with `failureThreshold: 1`, `recoveryTimeout: 5000`, `requestTimeout: 2000` (`:470–473`) and a `'default'` fallback returning `{ isCrisis: false, severity: 'unknown' }` (`:532–533`). So when the breaker trips (after a single failure) it returns "no crisis" for ~5 seconds — a fail-open-to-no-crisis behavior that manufactures false negatives, and the 2000ms timeout is 10× the <200ms crisis budget. The config comment is self-refuting: `failureThreshold: 1, // Never allow crisis detection to fail` describes the *intent* while the value delivers the opposite.

**Currently dormant:** `protectedCrisisDetection` is exported (`CircuitBreakerService.ts:721`, re-exported `resilience/index.ts:41`) but is **not wrapped around the live `detectCrisis` path** (no production call site). The dangerous default is latent config, not active runtime behavior — which makes the safe fix cheap.

### Decision: Non-breakable detection + fail-safe toward support.
Crisis detection compute is local and pure — **remove it from the openable-breaker set** (always attempt, never short-circuit). The fallback must **never** return `{ isCrisis: false }`; on any error, **fail-safe toward surfacing support / 988**. Keep 988 reachability as its own **static UI guarantee** (<3 taps, independent of detection compute). Align or remove the 2000ms `requestTimeout` to **≤200ms** per the crisis budget. Add a precommit config-guard test (analogous to the `LSApplicationQueriesSchemes` static-config pin) so a fail-open crisis default can never be re-introduced.

### Rationale (crisis co-sign)
A detector's *safe* failure is a false positive (offer help to someone who's fine), never a false negative (withhold help from someone in crisis). The circuit-breaker pattern protects callers from slow/failing *external* dependencies; the crisis detection compute has none, so the breaker buys nothing and costs false negatives. Separate the two concerns the breaker conflates: **(a) detection compute** — local, must always run; **(b) resource availability** — 988 access is a static UI path unaffected by any breaker state. Fixing this while dormant avoids ever shipping the live false-negative behavior.

### Downstream AC + tests → T13
- Remove `CRISIS_DETECTION` from the openable-breaker set, or change its fallback so it can never return an `isCrisis:false`-shaped object; on operation error, fail-safe to a support-surfacing result.
- Align/remove the 2000ms timeout against the <200ms budget.
- **Fail-open guard (precommit):** assert the CRISIS_DETECTION fallback default never equals an `isCrisis:false` shape.
- **Non-breakable behavior:** force the breaker OPEN, call the protected crisis path, assert the underlying detection still executes and a true-crisis input still yields a crisis/support result (not a swallowed `false`).
- **Fail-safe on error:** wrapped operation throws → result surfaces support/988.
- **988 independence:** 988 reachability unaffected regardless of breaker state.
- **Budget:** configured crisis timeout (if any) ≤200ms. `crisis` agent planning pass.

---

## Decision C — SEC-03 · Certificate pinning

### Finding (verified)
`app/src/core/services/security/pinned-fetch.ts:209` emits a `pin_validation_success` security audit event on every request, but **no TLS certificate pinning is performed**: the native pinning import is commented out (`:33`), the `SSLPinnedFetch` block is commented out (`:193–203`), and the real call is a plain `fetchWithTimeout` (`:203`). `app/src/core/services/security/certificate-pinning.ts` defines real pins and a `validateCertificatePin()` function (`:196`, exported `:374`) with **zero production call sites**. The app logs "pin validation success" with zero MITM protection — a false audit claim.

### Decision: Remove the false claim now; defer real pinning. Not a launch blocker.
Neuter the `pin_validation_success` emission immediately (false-claim removal is the compliance priority, independent of whether pinning ever ships) — emit no event for a control that isn't running, or a factually accurate `network_request_initiated`. Scope real `react-native-ssl-public-key-pinning` (or equivalent) as a **separate deferred tranche**, gated on first confirming Expo SDK 56 / New Architecture native-module compat, with ≥2 backup pins (intermediate + root), a cert-rotation runbook, an explicit crisis/988 carve-out, and ideally a remote soft-disable so a pin mismatch can never brick the app.

### Rationale (security + compliance co-sign)
The integrity risk is the priority and is independent of whether pinning ships: a security log asserting `pin_validation_success` with zero protection is worse than no log — it manufactures false assurance and corrupts incident forensics. Under FTC Act §5, the Commission targets the gap between claimed and actual security posture, not just user-facing marketing; the audit log is discoverable, and `privacy-policy.md` §4.3 already represents "TLS 1.2+ … in transit," so a reviewer seeing `pin_validation_success` would reasonably infer pinning is operational. In an HBNR breach response (`docs/legal/breach-notification-runbook.md`), a false "validation success" trail risks misclassifying a MITM breach as involving "secured" data and suppressing a required notification — itself an FTC §5 violation. Real pinning carries the classic operational hazard: a hard-fail pin with no remote kill-switch bricks the entire app (including the crisis path) if Supabase rotates to a chain outside the backup-pin set. For a no-account wellness app whose realistic adversary is defeated by TLS 1.3 + platform CA validation, pinning only adds defense against a CA-compromise/corporate-MITM tier — worth scoping deliberately, never worth failing the crisis path.

### Downstream AC + tests → T2
- **C1 (remove false claim — priority):** no `pin_validation_success` emitted from a path that performs no validation; test asserting the event taxonomy has no reachable "pin validation success" without a real `validateCertificatePin` call. `compliance` agent planning pass (touches `core/services/security/`).
- **C2 (deferred real pinning — separate tranche):** emit success only after genuine validation; distinct failure event; fail-closed for data endpoints with an explicit crisis/988 carve-out; ≥2 backup pins + rotation runbook + remote soft-disable; test proving a mismatched pin is rejected **and** the crisis endpoint stays reachable. Gate C2 on confirming native-module support for Expo SDK 56 / New Arch first.

---

## Sign-off

| Decision | Specialists | Owner |
|---|---|---|
| C — SEC-03 cert pinning | `security`, `compliance` | ✅ Ratified — remove false claim now, defer real pinning |
| D — SEC-09 auth model | `security`, `compliance` | ✅ Ratified — anonymous-session (`signInAnonymously` + `auth.uid()`) |
| E — TEST-07 PHQ-9 15–19 | `crisis`, `philosopher` | ✅ Ratified — fix; one source of truth; preserve tiers |
| F — SEC-07 fail-safe breaker | `crisis` | ✅ Ratified — non-breakable + fail-safe toward support |

**No application code changes ship from MAINT-226.** Decisions C/D/E/F feed the ACs of tranches T2/T12/T13 respectively.
