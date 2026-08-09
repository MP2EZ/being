# Vital Interests Assessment — Crisis-Detection Telemetry

**Document scope:** Internal compliance artifact. Regulator-facing only. Not for public distribution.
**Document type:** Lawful-basis assessment record (GDPR Art. 6(1)(d), Art. 9(2)(c))
**Processing activity:** `crisis_detected` event — Supabase `analytics_events` table
**Version:** 1.0
**Date:** 2026-06-03
**Author:** Palouse Labs LLC
**Related work item:** INFRA-214 T5

---

## 1. Purpose

When Being detects a PHQ-9 total score ≥20, a non-zero PHQ-9 Q9 (self-harm ideation) response, or a GAD-7 total score ≥15, it records a single `crisis_detected` event to the first-party Supabase `analytics_events` table. The purpose is twofold: (a) operational safety monitoring — to allow the founder to verify that crisis-resource interventions (988 prompt, safety-plan display) are being surfaced at the correct thresholds; and (b) aggregate pattern observation — to detect any systematic failure in the crisis-detection path across the user base.

This processing occurs without analytics consent and is not suppressible by the universal opt-out, because its lawful basis is vital interests rather than consent or legitimate interests.

---

## 2. Necessity Assessment

**Why consent is not the appropriate basis:** Crisis-detection telemetry must fire at the moment of threshold detection, before any consent dialog could be meaningfully presented. A user in a crisis state should not be required to grant analytics consent before crisis resources are surfaced or before the triggering event is logged. Conditioning safety-path telemetry on consent would also allow a user to inadvertently prevent logging by opting out before a later crisis event, defeating the operational safety purpose.

**Why legitimate interests is not the appropriate basis:** The processing involves special-category health data (mental-health condition data derived from PHQ-9/GAD-7 responses) per GDPR Art. 9. Art. 9(1) prohibits processing of special-category data; the legitimate-interests basis in Art. 6(1)(f) does not on its own override Art. 9(1). A specific Art. 9 derogation is required. Art. 9(2)(c) (vital interests where the data subject is or may be physically incapable of giving consent) is the appropriate derogation, applied in conjunction with Art. 6(1)(d).

**Minimum necessary payload:** The event payload is limited to `trigger_type` (category label — one of `phq9_suicidal_ideation`, `phq9_severe_score`, `phq9_moderate_severe_score`, `gad7_severe_score`), `severity_bucket` (e.g. `high` / `critical`), `intervention_surfaced` (boolean), and `assessment_type` (`PHQ-9` / `GAD-7`). No raw score, no Q9 numeric value, no device identifier, and no persistent session token is included. A daily-rotated anonymous `session_id` (generated in `app/src/core/utils/id.ts` and consumed by `app/src/core/services/supabase/SupabaseService.ts`) is the only session-level field; it cannot be joined to a user identity and does not persist across calendar days. These are the minimum fields needed to fulfil the operational safety purpose.

---

## 3. Balancing Test

Where Art. 6(1)(d) is applied alongside Art. 9(2)(c), a full legitimate-interests balancing test is not strictly required, because the vital-interests basis is precisely intended to override the ordinary consent requirement in life-safety contexts. The following is recorded for completeness.

**Nature of the data:** The payload encodes a derived category (crisis threshold crossed) rather than the underlying responses. A severity bucket is less sensitive than a raw PHQ-9 score. The daily-rotating `session_id` provides no persistent linkage. The processing does not reveal the user's identity to any third party.

**Reasonable expectations:** A user who completes a PHQ-9 or GAD-7 in a mental-wellness app that has disclosed crisis-detection and safety-resource features would reasonably expect that threshold-crossing events are monitored by the app operator to ensure the safety path works correctly.

**Consequences for the data subject:** The payload carries no information usable to identify, re-contact, or disadvantage the data subject. The first-party Supabase table is governed by Row-Level Security; cross-user queries are not possible at the application layer. The data is not shared with any third party. The primary consequence for the data subject is that crisis-resource failures are more likely to be detected and corrected — in the data subject's interest.

**Counterweight:** The data subject's privacy interest in not having a derived crisis-threshold indicator recorded to a server is real. It is outweighed in this context by the safety interest above and the minimal identifiability of the payload, further reduced by the safeguards in §4.

---

## 4. Safeguards

1. **Payload minimization.** The emitter writes an explicit allow-list of four bucketed/categorical fields; it never spreads the detection object (which holds the raw `triggerValue`). The Supabase sanitizer additionally severity-buckets any clinically-named numeric as a backstop.
2. **Daily-rotating session_id.** The anonymous token is generated at app launch and replaced after a calendar-day boundary. No persistent user-level identifier is stored or transmitted. (DB CHECK constraint enforces the `session_YYYY-MM-DD_…` format.)
3. **Durable, lossless capture.** The event is enqueued durably at fire-time (independent of network/userId provisioning) and reconciled to the anonymous user row when available, so a first-run/offline crisis is recorded rather than silently dropped. Undeliverable events are retained for retry and surfaced to the local security log.
4. **First-party storage only.** `analytics_events` is in Being's own Supabase project. No third party receives crisis-detection telemetry.
5. **Row-Level Security.** RLS isolates rows by an opaque identifier; no cross-user query is possible at the application layer. Technical basis: `docs/security/supabase-rls-verification.md`.
6. **Local footprint minimization — corrected (MAINT-334).** Versions of this assessment before 2026-08-06 recorded the opposite safeguard here: that a separate, mandatory on-device crisis-intervention audit (`logCrisisIntervention`) recorded every detection independently of this telemetry. DEBUG-305 removed that write, and the claim has been false since. It is corrected rather than deleted because the accurate position is a **stronger** safeguard for the balancing test in §3, not a weaker one: the app retains no durable local record of crisis-intervention *content*. Residual records on pre-fix installs are deleted at launch by `legacyPlaintextRecordSweeper`.

**Corrected a second time (DEBUG-381), and the correction is about completeness, not content.** This safeguard previously read "the app no longer retains any durable local crisis-intervention record" and named `crisis_analytics_queue` as "the only local artifact that remains". Both were **false when written**. Two further AsyncStorage keys described crisis-tier records at that time — `audit_log_<epoch>` (closed by DEBUG-355) and `storage_metadata_index` (closed by DEBUG-381) — and neither was enumerated here or in the DPIA. This is the third consecutive version of this safeguard to assert local completeness and be falsified, each time discovered by enumerating the store after erasure while testing the previous fix.

The safeguard is therefore restated in a checkable form. **The accurate claim is about content, not artifacts:** no durable local record holds crisis *content* — no score, no Q9 value, no free text. Several local artifacts do record that a crisis-tier record *existed* and when; all are now swept on account erasure, and all are enumerated positively in `dpia-sensitive-wellness-data.md` §3 rather than asserted away here. That table, not this sentence, is the authority — a negative completeness claim in prose has now been wrong three times.

**Effect on the §3 balancing test: none.** The balancing conclusion rests on the minimal identifiability of the **transmitted** payload — four bucketed categorical fields and a daily-rotated anonymous `session_id` — which no local write affects. The local-footprint safeguard is corroborating, not load-bearing. Had it been load-bearing, three successive falsifications would have required re-running the balance rather than amending the text.

The completeness interest the original safeguard was reaching for is served by safeguard 3's durable enqueue-and-reconcile, not by a second local copy. `@being/supabase/crisis_analytics_queue` remains the pending-upload buffer described in safeguard 3: same four bucketed fields as the transmitted event, cleared on successful flush, swept on account erasure (`SWEPT_EXACT_KEYS`). See `dpia-sensitive-wellness-data.md` §3 (positive key enumeration), §7 controls 14–16 and 18–19, and §9 v1.8 / v2.0.

**Second correction (DEBUG-355, 2026-08-08).** The paragraph above previously ended its first sentence with "…so the data subject's local exposure is now nil rather than an unencrypted plaintext record on the device." That phrase was **false when written** and has been struck. Two further local crisis-path writes survived DEBUG-305 and were still live: `critical_log_<epoch>` to SecureStore for every ERROR-level or CRISIS-category log entry, and `audit_log_<epoch>` to AsyncStorage for every `crisis_tier` storage operation. The first was written in cleartext in every real configuration and was **unerasable by construction** — SecureStore does not enumerate, so account deletion could not reach it and no sweeper could be built for it.

This matters here specifically, and not only in the DPIA, because the sentence was doing work: §3's balancing test weighs the data subject's privacy interest against the safety interest, and "local exposure is nil" was an input to that weighing. An overstated safeguard makes a balancing test unsound even where the conclusion survives — and the conclusion does survive, because the §3 balance rests on the minimal identifiability of the *transmitted* payload, which these local writes never affected.

The corrected position: the writes are removed at source (`critical_log_*`) and brought under the erasure sweep (`audit_log_*`) as of DEBUG-355. Prospectively, local exposure on this path is nil. Retrospectively, `critical_log_*` records on installs predating that change are irreducible and are recorded as an **accepted residual** in `dpia-sensitive-wellness-data.md` §8 — bounded, never transmitted, OS-keystore-protected, and containing only sanitized log fields rather than scores, responses, or identifiers. See also `dpia-sensitive-wellness-data.md` §7 controls 17–18 and §9 v1.9.
7. **Transparency.** The privacy policy (§3 Safety Features; §5.2 Analytics) discloses that crisis-detection events are recorded to first-party storage under a vital-interests basis without analytics consent.
8. **Storage limitation — bounded and enforced (DEBUG-340).** `crisis_detected` rows are retained for **3 years** from the recorded date and then deleted, matching the period published in privacy-policy §7.2. Enforcement is a scheduled database job (`analytics-retention-prune`, daily), not a manual process. Every other `analytics_events` row is deleted at 90 days by the same job. This safeguard is recorded here because this assessment previously stated no retention period at all: the function existed but was never scheduled, so actual server-side retention was **indefinite** — which would have undermined the proportionality argument in §3, since an unbounded window cannot be "limited to the minimum required for the operational safety purpose" however small the payload. The 3-year figure is a business choice, not a regulatory floor or ceiling: no statute fixes a retention period for crisis records held by a consumer wellness app that is not a healthcare provider (see `regulatory-applicability.md`). It is justified by the safety-monitoring-continuity purpose in §1 and is the period already published to users.

---

## 5. Conclusion

Processing of the `crisis_detected` event under GDPR Art. 6(1)(d) and Art. 9(2)(c) (vital interests) is lawful, necessary, and proportionate. The processing is limited to the minimum payload required for the operational safety purpose, confined to first-party infrastructure, and subject to the safeguards in §4. This assessment will be reviewed if the payload expands, if the storage location changes, or if the EU user base triggers the GDPR Art. 35 threshold in `dpia-sensitive-wellness-data.md` §10.

---

*Internal compliance artifact — not for public distribution. Self-certified by Palouse Labs LLC, 2026-06-03.*
