/**
 * RE-CONSENT SUBMISSION (FEAT-376 slice C1)
 *
 * The single place the two consent records are written together.
 *
 * Being stores consent across TWO disjoint records, and a re-consent must
 * replay both:
 *
 *   `legal_gate_consents_v1`  four document acceptances (ToS, Privacy Policy,
 *                             Wellness Disclaimer, GDPR Art. 9(2)(a)), written
 *                             by `recordLegalGateConsents` (consentStore.ts:67)
 *   the `ConsentRecord`       the five `ConsentPreferences` booleans, written
 *                             by `renewConsent` (consentStore.ts:1078)
 *
 * `renewConsent` deliberately does NOT write the first
 * (`consentStore.ts:1143-1154`): it has no UI of its own, so stamping a fresh
 * version into a record that attests "the user was SHOWN and ACCEPTED these
 * named documents" would manufacture Art. 7(1) evidence. That comment names
 * this slice as the one that must close the gap — this module is that call.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THE ORDER IS legal-gate FIRST, RENEWAL SECOND
 *
 * If the second write fails, the surviving state is:
 *   legal_gate_consents_v1 @ CONSENT_VERSION   ← TRUE. The user just ticked
 *                                                those four boxes.
 *   ConsentRecord          @ the old version   ← still stale, so `loadConsent`
 *                                                resolves `version_mismatch`
 *                                                again and the next launch
 *                                                re-prompts. The retry rewrites
 *                                                both.
 * Nothing has widened: `canPerformOperation` reads the consent cache, which
 * only `renewConsent` rebuilds (`consentStore.ts:1170-1183`), so the first
 * write alone permits no new processing.
 *
 * The reverse order fails the other way, and permanently. `renewConsent` would
 * set `consentStatus: 'valid'` (`:1189`), which stops the re-prompt — because
 * `isReConsentEligible` only admits `version_mismatch` / `expired` — while the
 * demonstrability artifact stayed pinned at the old version. Divergent forever,
 * silently, with nothing left to trigger a correction.
 *
 * The two awaits are sequential on purpose. A throw from
 * `recordLegalGateConsents` must never reach `renewConsent`; `Promise.all`
 * would let the renewal land anyway and produce exactly the state above.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 🔴 FAILURE IS NOT SIGNALLED BY A THROW. `renewConsent` catches everything and
 * does `set({ error }); return` (`consentStore.ts:1193-1199`) — `void` return,
 * no throw, no result. An `await` that resolves proves nothing about whether a
 * record was written. The only honest success signal is reading
 * `consentStatus === 'valid'` back off the store afterwards.
 */

import {
  useConsentStore,
  recordLegalGateConsents,
  isReConsentEligible,
  isBaseEligibleForRenewal,
  type ConsentPreferences,
  type LegalGateConsents,
} from '@/core/stores/consentStore';

/**
 * Everything `ReConsentScreen` collects, in the shape the two writes need.
 *
 * Typed explicitly rather than inferred: this is the seam where a caller could
 * silently drop `mentalHealthProcessingConsent` from one half. It appears on
 * BOTH — it is the only field the two interfaces share — and the screen
 * collects it exactly once.
 */
export interface ReConsentSubmission {
  /** The four document acceptances. Timestamp and version are stamped by the store. */
  legalGate: Omit<LegalGateConsents, 'timestamp' | 'version'>;
  /** All five preference booleans. `renewConsent` carries none forward. */
  preferences: ConsentPreferences;
}

/**
 * `stage` names which write did not happen, so the screen can say something
 * true about what to do next. It is not a user-facing string.
 */
export type ReConsentSubmitResult =
  | { ok: true }
  | { ok: false; stage: 'ineligible' | 'art9_mismatch' | 'legal_gate' | 'renew'; message: string };

/**
 * Write both consent records. Returns a result rather than throwing, and never
 * navigates — the caller (FEAT-417) owns what happens next.
 */
export async function submitReConsent(
  submission: ReConsentSubmission,
): Promise<ReConsentSubmitResult> {
  const { legalGate, preferences } = submission;

  // ── Pre-flight ────────────────────────────────────────────────────────────
  // `renewConsent` allowlists {version_mismatch, expired} itself, but it is the
  // SECOND write. Without checking here, an ineligible caller would already
  // have stamped a fresh Art. 7(1) attestation into `legal_gate_consents_v1` —
  // a plaintext, erasure-excluded key — by the time the store refused.
  const status = useConsentStore.getState().consentStatus;
  if (!isReConsentEligible(status)) {
    return {
      ok: false,
      stage: 'ineligible',
      message: `Re-consent is not applicable from status '${status}'`,
    };
  }

  // The Art. 9(2)(a) tick is ONE decision written to two records. If the halves
  // disagree, one of them is fabricated — refuse both writes rather than pick a
  // winner. (`OnboardingScreen.tsx:1036-1037` picks a winner today, defaulting
  // it to `true`; that is tracked as DEBUG-419 and is not repeated here.)
  if (legalGate.mentalHealthProcessingConsent !== preferences.mentalHealthProcessingConsent) {
    return {
      ok: false,
      stage: 'art9_mismatch',
      message: 'Wellness-data consent must be recorded identically in both records',
    };
  }

  // The 13→18 flip (DEBUG-150) shipped in the same commit as the 1.0.0→1.1.0
  // bump, so `isEligible: true` on a v1.0.0 record — the only cohort
  // `version_mismatch` can serve — means "≥13", not "≥18". `renewConsent`
  // re-derives from `birthYear` and hard-refuses (`consentStore.ts:1094`), but
  // that is again the second write, and a minor's ticks must not be stamped
  // into the legal-gate record on the way to being refused.
  const { staleConsent, currentConsent } = useConsentStore.getState();
  const base = staleConsent ?? currentConsent;
  if (!base) {
    return { ok: false, stage: 'ineligible', message: 'No consent record available to renew' };
  }
  if (!isBaseEligibleForRenewal(base)) {
    return {
      ok: false,
      stage: 'ineligible',
      message: 'Age eligibility could not be re-established',
    };
  }

  // ── Write 1: the demonstrability artifact ─────────────────────────────────
  try {
    await recordLegalGateConsents(legalGate);
  } catch (error) {
    return {
      ok: false,
      stage: 'legal_gate',
      message: error instanceof Error ? error.message : 'Failed to record legal acceptances',
    };
  }

  // ── Write 2: the consent record ───────────────────────────────────────────
  await useConsentStore.getState().renewConsent(preferences);

  const after = useConsentStore.getState();
  if (after.consentStatus !== 'valid') {
    // Deliberately NO rollback of write 1. The user really did accept those
    // four documents; deleting the record to "stay consistent" would destroy
    // evidence of an acceptance that actually happened. The stale ConsentRecord
    // still drives a re-prompt next launch, and `recordLegalGateConsents` is a
    // plain overwrite, so the retry converges.
    return {
      ok: false,
      stage: 'renew',
      message: after.error ?? 'Failed to renew consent',
    };
  }

  return { ok: true };
}
