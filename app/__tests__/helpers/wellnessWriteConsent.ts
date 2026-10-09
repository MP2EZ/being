/**
 * Consent seeding for suites that reach a FEAT-318 write gate (FEAT-667, extended FEAT-665).
 *
 * `consentStore` boots at `loading`, which `decideWellnessWrite()` blocks
 * (FEAT-664). A suite that persists wellness data but is not ABOUT consent seeds
 * `granted` in a `beforeEach` rather than editing its assertions; a suite that is
 * about the gate seeds each blocked reason directly.
 *
 * Seeds the real store, so the real predicate decides — nothing here mocks it.
 *
 * FEAT-665: each seed also carries the record and history that
 * `selectWellnessWriteBlockStart` reads, with the block starting at `blockStartedAt`
 * where a block has a start. And each seed CHECKS its own verdict and throws if the
 * predicate disagrees, so a seed can never quietly test a different branch than the
 * one it names. That matters for `missing`: it relies on the legal-gate mirror being
 * empty, and a `legal_gate_refused` seed fills it. Reset with `resetConsent()` between
 * the two, or the `missing` seed throws.
 */

import {
  decideWellnessWrite,
  recordLegalGateConsents,
  useConsentStore,
  type ConsentHistoryEntry,
  type ConsentRecord,
  type WellnessWriteBlockReason,
  type WellnessWriteDecision,
} from '@/core/stores/consentStore';

/** `revoked_relaunched` is what `loadConsent` leaves after a relaunch: no record, no history. */
export type SeededWellnessWriteConsent = 'granted' | WellnessWriteBlockReason | 'revoked_relaunched';

export interface SeedWellnessWriteConsentOptions {
  /** When the block began, for the seeds whose block has a recorded start. */
  blockStartedAt?: number;
}

const EXPECTED: Record<SeededWellnessWriteConsent | 'legal_gate_refused', WellnessWriteDecision> = {
  granted: { allowed: true },
  refused: { allowed: false, reason: 'refused' },
  revoked: { allowed: false, reason: 'revoked' },
  revoked_relaunched: { allowed: false, reason: 'revoked' },
  under_age: { allowed: false, reason: 'under_age' },
  missing: { allowed: false, reason: 'missing' },
  loading: { allowed: false, reason: 'loading' },
  legal_gate_refused: { allowed: false, reason: 'refused' },
};

const GRANT_LEAD_MS = 60_000;

function seededRecord(art9: boolean, at: number, overrides: Partial<ConsentRecord> = {}): ConsentRecord {
  return {
    consentId: 'consent_seeded',
    userId: 'user_seeded',
    version: '1.1.0',
    preferences: {
      analyticsEnabled: false,
      crashReportsEnabled: false,
      cloudSyncEnabled: false,
      researchEnabled: false,
      mentalHealthProcessingConsent: art9,
    },
    universalOptOut: false,
    ageVerification: { verified: true, isEligible: true },
    timestamp: at,
    updatedAt: at,
    revoked: false,
    ...overrides,
  };
}

const grantEntry = (art9: boolean, at: number): ConsentHistoryEntry => ({
  action: 'granted',
  changes: { mentalHealthProcessingConsent: art9 },
  timestamp: at,
});

function assertVerdict(seed: keyof typeof EXPECTED): void {
  const actual = decideWellnessWrite();
  const expected = EXPECTED[seed];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `seedWellnessWriteConsent('${seed}') produced ${JSON.stringify(actual)}, not ${JSON.stringify(expected)}. ` +
        'A legal-gate record left by an earlier seed is the usual cause: await resetConsent() first.',
    );
  }
}

/**
 * `legal_gate_refused`: a first-time refusal at the legal gate, before any ConsentRecord
 * exists. Async because it goes through the public `recordLegalGateConsents`; it resets
 * consent first so the mirror it writes is the only one.
 */
export function seedWellnessWriteConsent(state: 'legal_gate_refused'): Promise<void>;
export function seedWellnessWriteConsent(
  state: SeededWellnessWriteConsent,
  options?: SeedWellnessWriteConsentOptions,
): void;
export function seedWellnessWriteConsent(
  state: SeededWellnessWriteConsent | 'legal_gate_refused',
  options: SeedWellnessWriteConsentOptions = {},
): void | Promise<void> {
  if (state === 'legal_gate_refused') {
    return (async () => {
      await useConsentStore.getState().resetConsent();
      await recordLegalGateConsents({
        tosAccepted: true,
        privacyAccepted: true,
        wellnessDisclaimerAcknowledged: true,
        mentalHealthProcessingConsent: false,
      });
      assertVerdict(state);
    })();
  }

  const blockStartedAt = options.blockStartedAt ?? Date.now();
  const grantedAt = blockStartedAt - GRANT_LEAD_MS;
  const { consentCache } = useConsentStore.getState();

  switch (state) {
    case 'granted':
    case 'refused': {
      const art9 = state === 'granted';
      const at = art9 ? grantedAt : blockStartedAt;
      useConsentStore.setState({
        consentStatus: 'valid',
        currentConsent: seededRecord(art9, at),
        consentHistory: [grantEntry(art9, at)],
        consentCache: { ...consentCache, canProcessMentalHealthData: art9 },
      });
      break;
    }
    case 'revoked':
      useConsentStore.setState({
        consentStatus: 'revoked',
        currentConsent: seededRecord(true, grantedAt, {
          revoked: true,
          revokedAt: blockStartedAt,
          updatedAt: blockStartedAt,
        }),
        consentHistory: [
          grantEntry(true, grantedAt),
          { action: 'revoked', changes: {}, timestamp: blockStartedAt },
        ],
      });
      break;
    case 'revoked_relaunched':
      useConsentStore.setState({ consentStatus: 'revoked', currentConsent: null, consentHistory: [] });
      break;
    case 'under_age':
      useConsentStore.setState({
        consentStatus: 'under_age',
        currentConsent: seededRecord(false, blockStartedAt, {
          ageVerification: { verified: true, isEligible: false },
        }),
        consentHistory: [],
      });
      break;
    case 'missing':
    case 'loading':
      useConsentStore.setState({ consentStatus: state, currentConsent: null, consentHistory: [] });
      break;
  }
  assertVerdict(state);
}
