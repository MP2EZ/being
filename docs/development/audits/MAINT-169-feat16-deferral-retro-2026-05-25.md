# FEAT-16 Deferral Retro — Legal & In-App Copy Audit

**Date:** 2026-05-25
**Work item:** MAINT-169 (Notion `36ba1108-c208-8172-b8d2-c52f607ae422`)
**Branch:** `chore/MAINT-169-feat16-deferral-retro`
**Scope:** Targeted scrub of v1 launch artifacts for references to features deferred by the May 2026 FEAT-16 reclassification (accounts, login, web subscriptions, cross-device sync, two-factor authentication, email collection).

## Why this exists

In May 2026, FEAT-16 (account/login feature) and its dependents — FEAT-58 (logout), FEAT-59 (account deletion), FEAT-38 (Stripe web subscriptions) — were reclassified as post-launch / V2. v1 ships **anonymous + IAP-only**, with no accounts, no login, no email collection. Legal documents and in-app copy authored before this reclassification still described those features as live capabilities, which created FTC Act §5 (deceptive practices) and App Store Guideline 2.3.1 (description matches reality) risks.

This audit corrects the inaccuracies. It does **not** perform a comprehensive v2-aware rewrite — that's a deliberately-deferred sub-ticket.

## Verified state of cloud backup (precondition)

Before editing, I verified the actual cloud-backup capability:
- `app/src/core/services/supabase/CloudBackupService.ts` exists and is functional, wired into the app
- The strict allowlist (`AssessmentStoreBackup` interface, lines 88-93) limits backup contents to exactly **two non-wellness fields**: `autoSaveEnabled` and `lastSyncAt`
- All PHQ-9 / GAD-7 responses, scores, crisis indicators, and assessment history are excluded by design (MAINT-117 PHI filtering)
- Anonymous device-ID keying (`anonymous_${Date.now()}`) makes cross-device sync architecturally impossible in v1
- The user-facing toggle is in `PrivacyDataScreen.tsx:307-323` via `consentStore.cloudSyncEnabled`

This meant legal-doc references to "cloud backup" weren't entirely false — backup *infrastructure* exists — but claims about "syncing data across devices" and implications that wellness data is backed up were false. The compliance agent recommended renaming the user-facing feature from "Optional Cloud Backup" to "Optional Settings Backup" to reflect the actual narrow scope, which this audit adopts.

## Files changed

| File | Hits | Action taken |
|---|---|---|
| `docs/legal/privacy-policy.md` | 8 | Deleted "Account Information" data category; deleted "Two-factor authentication for accounts" bullet; renamed §4.2 to "Optional Settings Backup" and rewrote scope honestly (in-transit + at-rest encryption, no E2E claim, no cross-device sync claim); fixed §4.4 breach-notification email-delivery language; fixed §6 user rights wording; fixed §7 data retention rows; fixed §10 update-notification language |
| `docs/legal/terms-of-service.md` | 4 | §5 "User Accounts" rewritten as §5 "Use of Being" (single honest paragraph); deleted "Share your account credentials" bullet from §7; softened §10 cloud-backup deletion clause; fixed §15 update-notification language |
| `docs/legal/multi-state-privacy.md` | 5 | Rewrote per-state "Verification" bullets to reference unified Verification Procedures section; rewrote Verification Procedures section to describe the anonymous-mode usage-pattern verification fallback |
| `docs/legal/california-privacy.md` | 5 | Updated CCPA data-categories table (Identifiers: No); updated "By Email" instructions for usage-pattern fallback; rewrote Verification section per CCPA §1798.130(a)(2) requirement to respond within 45 days regardless of channel; updated Authorized Agents section; updated Data Retention table for no-account model; fixed update-notification language |
| `app/src/features/profile/screens/ProfileScreen.tsx` | 3 | Subtitle de-account-ified; "Account Management" section heading → "Preferences"; "Account Settings" card → "App Preferences" with honest description and accessibility hint |

## Compliance validation

The `compliance` agent reviewed the planned edits before implementation and made these refinements (all incorporated):

1. **§4.2 "Encrypted end-to-end"** → changed to "Encrypted in transit (TLS 1.2+) and at rest (AES-256)". E2E is a specific technical claim implying the endpoints alone can decrypt; could not be substantiated without code-level verification, so the safer accurate wording was used.
2. **Breach notification email delivery** → removed "by email (if you provided one)" since v1 collects no email.
3. **Verification fallback for state laws** → CCPA §1798.130(a)(2) requires a 45-day response regardless of channel. The original draft language ("cannot be authenticated") read as a refusal; rewritten to preserve the email channel while directing fulfillment in-app.
4. **"Optional Cloud Backup" → "Optional Settings Backup"** rename — accurate to the strict-allowlist scope.
5. **California-privacy.md authorized-agent verification** → replaced "confirm your email address" with usage-pattern matching, since no email is collected.

## Out of scope (deliberately deferred)

| Item | Where to track |
|---|---|
| App Store Connect metadata audit | INFRA-85 (Blocked) — will consume MAINT-169 findings during description writing |
| being.fyi signup-gate removal | User handling separately |
| `AccountSettingsScreen.tsx` internal copy | Already gated correctly with FEAT-16/58/59 alerts — no change needed |
| iOS Privacy Manifest | INFRA-113 (Done); data categories unchanged |
| Android Data Safety form | INFRA-114 (Not started); will consume MAINT-169 findings |
| Comprehensive legal-doc v2-aware rewrite | Sub-ticket filed under Workstream D (blocked by FEAT-16a) |
| Orphaned `CloudBackupSettings.tsx` (870 lines, not rendered anywhere) | Sub-ticket filed under Workstream D — audit and wire-up-or-delete |
| `docs/legal/dpia-sensitive-wellness-data.md` | Clean per audit (refs are to encryption/architecture, not user-facing claims) |
| `docs/legal/medical-disclaimer.md` | Clean per audit |
| ProfileScreen hiding the Preferences card entirely | Considered; user chose "rewrite copy, keep card" — internal screen already gated |

## Verification

After edits, the original drift greps were re-run to confirm only legitimate references remain (privacy@being.fyi email links, GPC opt-out wording, etc.). `npm run typecheck` and `npm run lint` were verified to pass with the trivial TSX string changes.

## Follow-up sub-tickets filed (Workstream D)

1. **MAINT (S):** Comprehensive legal-doc rewrite when FEAT-16 lands — blocked by FEAT-16a
2. **MAINT (XS):** Audit orphaned CloudBackupSettings.tsx (870 lines) — wire it up or delete
