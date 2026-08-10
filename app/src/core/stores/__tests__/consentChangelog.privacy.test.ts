/**
 * Consent changelog + version algebra (FEAT-375 slice A2, PR1)
 *
 * Pins the version-keyed CONSENT_CHANGELOG map and getConsentDeltaSince(), the
 * store-layer half of the only recovery path from a CONSENT_VERSION bump.
 *
 * WHY THIS FILE AND NOT consentStore.test.ts: that suite is on the committed
 * uncovered allowlist (app/scripts/ci-uncovered-tests.json) — it matches no CI
 * or precommit --testPathPattern, so a regression test written there would be
 * documentation rather than a gate. `*.privacy.test.ts` matches
 * `--testPathPattern=privacy`, which runs in `npm run precommit` AND in the
 * `Safety + privacy gates` CI job inside `ci-pass`. Do NOT add this file to the
 * allowlist: check-ci-test-coverage.js fails both on unlisted-uncovered and on
 * listed-but-now-covered.
 *
 * NOTE ON THE TYPECHECK PIN: consentStore.ts pins changelog coverage at the
 * type level. That cannot be tested from here — tsconfig.json excludes
 * **\/*.test.ts and jest transforms via babel-jest, so types in this file are
 * stripped, never checked. The runtime assertion below is the independent
 * second gate, not a proof of the first.
 */

// consentStore.ts calls create() at module scope and reaches SecureStore /
// AsyncStorage / SecureStorageService on import, so those need stubbing even
// though everything under test here is pure. Pattern from consentStore.test.ts.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
    getAllKeys: jest.fn(async () => []),
    multiRemove: jest.fn(async () => undefined),
  },
}));

jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: jest.fn(async () => undefined),
    getWellnessBlob: jest.fn(async () => null),
    removeWellnessBlob: jest.fn(async () => undefined),
  },
}));

import {
  CONSENT_VERSION,
  CONSENT_CHANGELOG,
  GENERIC_CONSENT_CHANGE_SUMMARY,
  compareConsentVersions,
  computeConsentDelta,
  getConsentDeltaSince,
  type ConsentChangedKey,
  type ConsentChangelogEntry,
} from '../consentStore';

/**
 * The DEBUG-150 (c96ab71e) 1.0.0 → 1.1.0 delta, as far as this type can express
 * it. The commit made three changes; only two are ConsentPreferences-shaped.
 * The third — splitting the bundled legal-gate checkbox into four — landed on
 * LegalGateConsents, a different interface, so it lives in `summary` alone.
 */
const DEBUG_150_CHANGED_KEYS: ConsentChangedKey[] = [
  'ageGate',
  'mentalHealthProcessingConsent',
];

const SEMVER_RE = /^\d+\.\d+\.\d+$/;

describe('CONSENT_CHANGELOG — shape and coverage', () => {
  it('is populated, so every invariant below is non-vacuous', () => {
    expect(Object.keys(CONSENT_CHANGELOG).length).toBeGreaterThan(0);
  });

  it('is keyed exclusively by parseable three-number semver', () => {
    // compareConsentVersions treats an unparseable version as equal-to-all,
    // which would silently drop that entry from every delta.
    for (const version of Object.keys(CONSENT_CHANGELOG)) {
      expect(version).toMatch(SEMVER_RE);
    }
  });

  it('contains an entry for the current CONSENT_VERSION', () => {
    // Runtime half of the source-level pin: a bump must not be able to ship
    // without its user-facing explanation.
    expect(Object.keys(CONSENT_CHANGELOG)).toContain(CONSENT_VERSION);
  });

  it('gives every entry a real summary and at least one changed key', () => {
    for (const [version, entry] of Object.entries(CONSENT_CHANGELOG)) {
      expect(version).toMatch(SEMVER_RE);
      expect(entry.summary.trim().length).toBeGreaterThan(0);
      // A placeholder would satisfy "has an entry" while telling the user
      // nothing. Reusing the unknown-version fallback text is exactly that.
      expect(entry.summary).not.toBe(GENERIC_CONSENT_CHANGE_SUMMARY);
      expect(entry.changedKeys.length).toBeGreaterThan(0);
    }
  });
});

describe("CONSENT_CHANGELOG['1.1.0'] — the DEBUG-150 entry is genuine", () => {
  const entry = CONSENT_CHANGELOG['1.1.0'];

  it('names exactly the two preference-shaped changes, no more and no fewer', () => {
    // Exact equality, not a superset check: a loose assertion here lets the
    // machine-readable delta drift away from the policy text it must match.
    expect([...entry.changedKeys].sort()).toEqual([...DEBUG_150_CHANGED_KEYS].sort());
  });

  it('states the age change in prose', () => {
    expect(entry.summary).toMatch(/\b18\b/);
  });

  it('states the separate explicit wellness-data consent in prose', () => {
    // This is the Art. 9(2)(a) fact that changedKeys structurally cannot
    // carry, so the summary is the ONLY place it can live.
    expect(entry.summary).toMatch(/explicit/i);
    expect(entry.summary).toMatch(/wellness data/i);
  });

  it('makes no claim about what happens if the user does not re-consent', () => {
    // The lapse-window characterisation is an open counsel decision. Shipped
    // copy must not prejudge it.
    expect(entry.summary).not.toMatch(/delete|erase|days|lose access|suspend/i);
  });
});

describe('compareConsentVersions', () => {
  it('orders numerically, not lexicographically', () => {
    // Under string compare '1.10.0' < '1.9.0', which would silently drop a
    // changelog entry from every delta after ten minor bumps.
    expect(compareConsentVersions('1.9.0', '1.10.0')).toBeLessThan(0);
    expect(compareConsentVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareConsentVersions('2.0.0', '10.0.0')).toBeLessThan(0);
  });

  it('reports equality and each direction across major, minor and patch', () => {
    expect(compareConsentVersions('1.1.0', '1.1.0')).toBe(0);
    expect(compareConsentVersions('1.0.0', '1.1.0')).toBeLessThan(0);
    expect(compareConsentVersions('1.1.1', '1.1.0')).toBeGreaterThan(0);
    expect(compareConsentVersions('1.0.0', '2.0.0')).toBeLessThan(0);
  });

  it('sorts a shuffled list into ascending order', () => {
    const sorted = ['1.10.0', '1.0.0', '2.0.1', '1.9.3', '1.1.0'].sort(
      compareConsentVersions
    );
    expect(sorted).toEqual(['1.0.0', '1.1.0', '1.9.3', '1.10.0', '2.0.1']);
  });
});

describe('getConsentDeltaSince — known older version', () => {
  it('returns the real delta for the only genuine case, 1.0.0', () => {
    const delta = getConsentDeltaSince('1.0.0');

    expect(delta.isKnownVersion).toBe(true);
    expect(delta.fromVersion).toBe('1.0.0');
    expect(delta.toVersion).toBe(CONSENT_VERSION);
    expect(delta.changes.map((c) => c.version)).toEqual(['1.1.0']);
    expect(delta.changes[0]?.summary).toBe(CONSENT_CHANGELOG['1.1.0'].summary);
    expect([...delta.changedKeys].sort()).toEqual([...DEBUG_150_CHANGED_KEYS].sort());
  });

  it('never emits the generic fallback for a version it can actually explain', () => {
    // The trap: defining "unknown" as "not a key in CONSENT_CHANGELOG" would
    // classify 1.0.0 — the ONLY real case — as unknown and discard the very
    // delta this function exists to deliver. The map is keyed by TO-version;
    // the input is a FROM-version.
    expect(getConsentDeltaSince('1.0.0').changes.map((c) => c.summary)).not.toContain(
      GENERIC_CONSENT_CHANGE_SUMMARY
    );
  });
});

describe('getConsentDeltaSince — the expired path (stored === current)', () => {
  it('is KNOWN with EMPTY changes, never "unrecognised"', () => {
    // An expired-but-current-version record is the `expired` consentStatus. We
    // recognise the version perfectly; there is simply nothing to explain.
    const delta = getConsentDeltaSince(CONSENT_VERSION);

    expect(delta.isKnownVersion).toBe(true);
    expect(delta.changes).toEqual([]);
    expect(delta.changedKeys).toEqual([]);
    expect(delta.fromVersion).toBe(CONSENT_VERSION);
    expect(delta.toVersion).toBe(CONSENT_VERSION);
  });

  it("excludes the entry keyed at the stored version itself", () => {
    // Range is stored < v <= current, so 1.1.0's own entry must not reappear
    // for a user already on 1.1.0.
    expect(getConsentDeltaSince('1.1.0').changes).toEqual([]);
  });
});

describe('getConsentDeltaSince — unknown versions fail open on prompting, closed on content', () => {
  const unparseable = [
    '',
    '   ',
    'abc',
    '1.1',
    '1.1.0.0',
    'v1.1.0',
    '1.1.x',
    '1.1.0-beta',
  ];

  it.each(unparseable)('treats %p as unknown without fabricating a delta', (stored) => {
    const delta = getConsentDeltaSince(stored);

    expect(delta.isKnownVersion).toBe(false);
    expect(delta.changedKeys).toEqual([]);
    expect(delta.changes.map((c) => c.summary)).toEqual([GENERIC_CONSENT_CHANGE_SUMMARY]);
    expect(delta.toVersion).toBe(CONSENT_VERSION);
  });

  it('treats a rolled-back / downgraded version as unknown', () => {
    // Stored is NEWER than this build knows about — a downgrade or a reverted
    // release. Synthesising a delta could describe unreleased policy.
    const delta = getConsentDeltaSince('2.0.0');

    expect(delta.isKnownVersion).toBe(false);
    expect(delta.changedKeys).toEqual([]);
    expect(delta.changes.map((c) => c.summary)).toEqual([GENERIC_CONSENT_CHANGE_SUMMARY]);
  });

  it('still yields a renewable result rather than throwing', () => {
    // Fail open on prompting: an unrecognised version must not strand the user
    // with no path to re-consent.
    for (const stored of [...unparseable, '2.0.0']) {
      expect(() => getConsentDeltaSince(stored)).not.toThrow();
      expect(getConsentDeltaSince(stored).changes.length).toBeGreaterThan(0);
    }
  });
});

describe('isKnownVersion is not inferable from changes.length', () => {
  it('separates the expired path from the unrecognised path on BOTH fields', () => {
    // This is why isKnownVersion is a discrete field. The two states are
    // opposites on each axis, so collapsing either one loses the distinction:
    //   expired      -> known,   zero changes
    //   unrecognised -> unknown, one generic change
    const expired = getConsentDeltaSince(CONSENT_VERSION);
    const unrecognised = getConsentDeltaSince('nonsense');

    expect(expired.isKnownVersion).toBe(true);
    expect(expired.changes.length).toBe(0);

    expect(unrecognised.isKnownVersion).toBe(false);
    expect(unrecognised.changes.length).toBe(1);
  });
});

describe('computeConsentDelta — union, dedup and ordering across MULTIPLE versions', () => {
  // The real map has exactly one entry today, which would make union, dedup
  // and ordering true by construction rather than by code. Injecting a
  // synthetic changelog is the only way to actually exercise them, and it is
  // why computeConsentDelta takes the map as a parameter.
  const SYNTHETIC: Record<string, ConsentChangelogEntry> = {
    '1.1.0': { summary: 'first', changedKeys: ['ageGate', 'analyticsEnabled'] },
    '1.9.0': { summary: 'third', changedKeys: ['cloudSyncEnabled'] },
    '1.10.0': { summary: 'fourth', changedKeys: ['analyticsEnabled', 'researchEnabled'] },
    '1.2.0': { summary: 'second', changedKeys: ['ageGate', 'crashReportsEnabled'] },
  };

  it('collects every version in (stored, current] in ascending order', () => {
    const delta = computeConsentDelta(SYNTHETIC, '1.0.0', '1.10.0');

    expect(delta.isKnownVersion).toBe(true);
    expect(delta.changes.map((c) => c.version)).toEqual([
      '1.1.0',
      '1.2.0',
      '1.9.0',
      '1.10.0',
    ]);
    expect(delta.changes.map((c) => c.summary)).toEqual([
      'first',
      'second',
      'third',
      'fourth',
    ]);
  });

  it('dedups changedKeys across versions, preserving first-seen order', () => {
    const delta = computeConsentDelta(SYNTHETIC, '1.0.0', '1.10.0');

    // ageGate appears in 1.1.0 and 1.2.0; analyticsEnabled in 1.1.0 and 1.10.0.
    expect(delta.changedKeys).toEqual([
      'ageGate',
      'analyticsEnabled',
      'crashReportsEnabled',
      'cloudSyncEnabled',
      'researchEnabled',
    ]);
    expect(new Set(delta.changedKeys).size).toBe(delta.changedKeys.length);
  });

  it('excludes versions at or below stored, and above current', () => {
    const delta = computeConsentDelta(SYNTHETIC, '1.2.0', '1.9.0');

    // 1.1.0 is below stored; 1.2.0 IS stored; 1.10.0 is above current.
    expect(delta.changes.map((c) => c.version)).toEqual(['1.9.0']);
    expect(delta.changedKeys).toEqual(['cloudSyncEnabled']);
  });

  it('returns an empty known delta when nothing falls in the range', () => {
    const delta = computeConsentDelta(SYNTHETIC, '1.10.0', '1.10.0');

    expect(delta.isKnownVersion).toBe(true);
    expect(delta.changes).toEqual([]);
    expect(delta.changedKeys).toEqual([]);
  });

  it('drops an unparseable changelog key rather than fabricating its position', () => {
    // Fail closed on content. The shape test above stops this reaching the
    // real map; this pins the behaviour if it ever did.
    const withGarbage: Record<string, ConsentChangelogEntry> = {
      ...SYNTHETIC,
      'not-a-version': { summary: 'garbage', changedKeys: ['researchEnabled'] },
    };
    const delta = computeConsentDelta(withGarbage, '1.0.0', '1.10.0');

    expect(delta.changes.map((c) => c.version)).not.toContain('not-a-version');
    expect(delta.changes.map((c) => c.summary)).not.toContain('garbage');
  });
});
