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
6. **Local audit log is separate and mandatory.** The on-device crisis intervention audit (`logCrisisIntervention`) is independent of this telemetry and records every detection regardless of whether the telemetry event ever leaves the device.
7. **Transparency.** The privacy policy (§3 Safety Features; §5.2 Analytics) discloses that crisis-detection events are recorded to first-party storage under a vital-interests basis without analytics consent.
8. **Storage limitation — bounded and enforced (DEBUG-340).** `crisis_detected` rows are retained for **3 years** from the recorded date and then deleted, matching the period published in privacy-policy §7.2. Enforcement is a scheduled database job (`analytics-retention-prune`, daily), not a manual process. Every other `analytics_events` row is deleted at 90 days by the same job. This safeguard is recorded here because this assessment previously stated no retention period at all: the function existed but was never scheduled, so actual server-side retention was **indefinite** — which would have undermined the proportionality argument in §3, since an unbounded window cannot be "limited to the minimum required for the operational safety purpose" however small the payload. The 3-year figure is a business choice, not a regulatory floor or ceiling: no statute fixes a retention period for crisis records held by a consumer wellness app that is not a healthcare provider (see `regulatory-applicability.md`). It is justified by the safety-monitoring-continuity purpose in §1 and is the period already published to users.

---

## 5. Conclusion

Processing of the `crisis_detected` event under GDPR Art. 6(1)(d) and Art. 9(2)(c) (vital interests) is lawful, necessary, and proportionate. The processing is limited to the minimum payload required for the operational safety purpose, confined to first-party infrastructure, and subject to the safeguards in §4. This assessment will be reviewed if the payload expands, if the storage location changes, or if the EU user base triggers the GDPR Art. 35 threshold in `dpia-sensitive-wellness-data.md` §10.

---

*Internal compliance artifact — not for public distribution. Self-certified by Palouse Labs LLC, 2026-06-03.*
