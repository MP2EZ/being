/**
 * Art. 9 write-block start, the blocked-log helper and the consent seeds (FEAT-665, slice A2a-i).
 *
 * `selectWellnessWriteBlockStart` answers "since when has this user's Art. 9 choice blocked
 * wellness writes?". FEAT-673 consumes it: a screening counts toward guidance only if it was
 * completed at or after that instant, so a withdrawer's stale pre-withdrawal history can never
 * answer `full`. Nothing reads it yet, which is pinned in wellnessWriteConsentBoundary.test.ts.
 *
 * The crisis ruling (founder-chosen, 2026-10-03) sets the contract pinned here:
 *   - a PRIMITIVE: a finite number = blocked since; -Infinity = provably never blocked;
 *     null = unknown, so every reading is inadmissible. Never an object (zustand 5 snapshot
 *     stability on the screens that will subscribe).
 *   - a LATER answer is always the safe error, so every approximation errs later.
 *   - `loading` never opens an interval, and the legal-gate mirror is never read.
 *
 * `.privacy.` so the `Safety + privacy gates` CI job runs it.
 */

jest.mock('@/core/services/logging', () => {
  const actual = jest.requireActual('@/core/services/logging');
  return { ...actual, logSecurity: jest.fn() };
});

import { logSecurity } from '@/core/services/logging';
import {
  decideWellnessWrite,
  getWellnessWriteBlockStart,
  logWellnessWriteBlocked,
  selectWellnessWriteBlockStart,
  useConsentStore,
  type ConsentHistoryEntry,
  type ConsentRecord,
  type ConsentStatus,
} from '@/core/stores/consentStore';
import { seedWellnessWriteConsent } from '../helpers/wellnessWriteConsent';

const mockLogSecurity = logSecurity as jest.Mock;

type ConsentState = ReturnType<typeof useConsentStore.getState>;

const T0 = 1_700_000_000_000;
const T1 = T0 + 1_000;
const T2 = T0 + 2_000;
const T3 = T0 + 3_000;
const T4 = T0 + 4_000;

function record(overrides: Partial<ConsentRecord> = {}, art9 = true): ConsentRecord {
  return {
    consentId: 'consent_test',
    userId: 'user_test',
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
    timestamp: T0,
    updatedAt: T0,
    revoked: false,
    ...overrides,
  } as ConsentRecord;
}

function entry(
  action: ConsentHistoryEntry['action'],
  timestamp: number,
  art9?: boolean,
): ConsentHistoryEntry {
  return {
    action,
    timestamp,
    changes: art9 === undefined ? {} : { mentalHealthProcessingConsent: art9 },
  };
}

/** A complete state object, so the selector is exercised as a pure function. */
function state(
  consentStatus: ConsentStatus,
  consentHistory: ConsentHistoryEntry[],
  currentConsent: ConsentRecord | null,
  canProcessMentalHealthData: boolean,
  staleConsent: ConsentRecord | null = null,
): ConsentState {
  const base = useConsentStore.getState();
  return {
    ...base,
    consentStatus,
    consentHistory,
    currentConsent,
    staleConsent,
    consentCache: { ...base.consentCache, canProcessMentalHealthData },
  };
}

afterEach(async () => {
  await useConsentStore.getState().resetConsent();
  mockLogSecurity.mockReset();
});

describe('selectWellnessWriteBlockStart: statuses that cannot know the block start', () => {
  it.each<ConsentStatus>(['loading', 'missing', 'under_age', 'integrity_error'])(
    '%s → null (every reading inadmissible)',
    (status) => {
      expect(selectWellnessWriteBlockStart(state(status, [entry('granted', T0, false)], record({}, false), false))).toBeNull();
    },
  );

  it('version_mismatch → null: the stale record is never read to widen admissibility', () => {
    const stale = record({ version: '1.0.0', updatedAt: T2 });
    expect(selectWellnessWriteBlockStart(state('version_mismatch', [], null, false, stale))).toBeNull();
  });

  it('expired → the retained record\'s updatedAt, never -Infinity', () => {
    const expired = record({ updatedAt: T2, expiresAt: T3 });
    expect(selectWellnessWriteBlockStart(state('expired', [entry('granted', T0, true)], expired, false))).toBe(T2);
  });
});

describe('selectWellnessWriteBlockStart: revoked', () => {
  it('in-session → revokedAt', () => {
    const revoked = record({ revoked: true, revokedAt: T2, updatedAt: T2 });
    const history = [entry('granted', T0, true), entry('revoked', T2)];
    expect(selectWellnessWriteBlockStart(state('revoked', history, revoked, false))).toBe(T2);
  });

  it('revokedAt counts even when the history does not carry the revoke', () => {
    const revoked = record({ revoked: true, revokedAt: T2, updatedAt: T1 });
    expect(selectWellnessWriteBlockStart(state('revoked', [entry('granted', T0, true)], revoked, false))).toBe(T2);
  });

  it('after a relaunch (loadConsent nulls the record and loads no history) → null', () => {
    expect(selectWellnessWriteBlockStart(state('revoked', [], null, false))).toBeNull();
  });
});

describe('selectWellnessWriteBlockStart: valid, walked over the history', () => {
  it('granted with Art. 9 true and no opening event → -Infinity (provably never blocked)', () => {
    expect(selectWellnessWriteBlockStart(state('valid', [entry('granted', T0, true)], record(), true))).toBe(
      Number.NEGATIVE_INFINITY,
    );
  });

  it('refused at grant → that grant\'s timestamp', () => {
    expect(selectWellnessWriteBlockStart(state('valid', [entry('granted', T1, false)], record({}, false), false))).toBe(T1);
  });

  it('withdrawn by an update → the update\'s timestamp', () => {
    const history = [entry('granted', T0, true), entry('updated', T1, false)];
    expect(selectWellnessWriteBlockStart(state('valid', history, record({ updatedAt: T1 }, false), false))).toBe(T1);
  });

  it('a CLOSED interval still reports its start: blocked-period readings stay inadmissible', () => {
    const history = [entry('granted', T0, true), entry('updated', T1, false), entry('updated', T2, true)];
    expect(selectWellnessWriteBlockStart(state('valid', history, record({ updatedAt: T2 }), true))).toBe(T1);
  });

  it('several intervals → the LATEST opening', () => {
    const history = [
      entry('granted', T0, false),
      entry('updated', T1, true),
      entry('updated', T2, false),
      entry('updated', T3, true),
    ];
    expect(selectWellnessWriteBlockStart(state('valid', history, record({ updatedAt: T3 }), true))).toBe(T2);
  });

  it('a revoked entry opens an interval like an explicit false', () => {
    const history = [entry('granted', T0, true), entry('revoked', T1), entry('renewed', T2, true)];
    expect(selectWellnessWriteBlockStart(state('valid', history, record({ updatedAt: T2 }), true))).toBe(T1);
  });

  it('`declined` and updates without the Art. 9 key are no-ops', () => {
    const history = [
      entry('granted', T0, true),
      entry('declined', T1),
      { action: 'updated', timestamp: T2, changes: { analyticsEnabled: true } } as ConsentHistoryEntry,
    ];
    expect(selectWellnessWriteBlockStart(state('valid', history, record({ updatedAt: T2 }), true))).toBe(
      Number.NEGATIVE_INFINITY,
    );
  });

  it('a backward clock step can only push the answer LATER, never earlier', () => {
    const history = [entry('granted', T4, true), entry('updated', T1, false)];
    expect(selectWellnessWriteBlockStart(state('valid', history, record({ updatedAt: T1 }, false), false))).toBe(T4);
  });

  it('no anchor that proves Art. 9 was granted (a pre-1.1.0 entry) → the record\'s updatedAt', () => {
    const legacy = { action: 'granted', timestamp: T0, changes: { analyticsEnabled: true } } as ConsentHistoryEntry;
    expect(selectWellnessWriteBlockStart(state('valid', [legacy], record({ updatedAt: T3 }), true))).toBe(T3);
  });

  it('a walk that disagrees with live state (refused, but no opening event) → the record\'s updatedAt', () => {
    expect(selectWellnessWriteBlockStart(state('valid', [], record({ updatedAt: T3 }, false), false))).toBe(T3);
  });

  it('a walk that ends ALLOWED while live state is blocked → the later of its opening and updatedAt', () => {
    const history = [entry('granted', T1, false), entry('updated', T2, true)];
    expect(selectWellnessWriteBlockStart(state('valid', history, record({ updatedAt: T3 }, false), false))).toBe(T3);
  });

  it('a non-finite timestamp → null', () => {
    const history = [entry('granted', T0, true), entry('updated', Number.NaN, false)];
    expect(selectWellnessWriteBlockStart(state('valid', history, record({}, false), false))).toBeNull();
    expect(selectWellnessWriteBlockStart(state('valid', [], record({ updatedAt: Number.NaN }, false), false))).toBeNull();
  });

  it('a malformed state never throws: it answers null', () => {
    const broken = { ...state('valid', [], record(), true), consentHistory: null } as unknown as ConsentState;
    expect(() => selectWellnessWriteBlockStart(broken)).not.toThrow();
    expect(selectWellnessWriteBlockStart(broken)).toBeNull();
  });
});

describe('selectWellnessWriteBlockStart: shape and side effects', () => {
  it('returns a primitive, so a subscribing screen gets a stable snapshot', () => {
    const s = state('valid', [entry('granted', T1, false)], record({}, false), false);
    const answer = selectWellnessWriteBlockStart(s);
    expect(typeof answer).toBe('number');
    expect(Object.is(selectWellnessWriteBlockStart(s), answer)).toBe(true);
  });

  it('writes no state and logs nothing', () => {
    seedWellnessWriteConsent('refused', { blockStartedAt: T1 });
    const before = useConsentStore.getState();
    mockLogSecurity.mockClear();
    expect(getWellnessWriteBlockStart()).toBe(T1);
    expect(useConsentStore.getState()).toBe(before);
    expect(mockLogSecurity).not.toHaveBeenCalled();
  });
});

describe('logWellnessWriteBlocked', () => {
  it('logs exactly the content-free fields, at low severity', () => {
    logWellnessWriteBlocked({ component: 'assessmentStore', action: 'save', site: 'site-a' }, 'refused');
    expect(mockLogSecurity).toHaveBeenCalledTimes(1);
    const [, severity, context] = mockLogSecurity.mock.calls[0]!;
    expect(severity).toBe('low');
    expect(context).toEqual({
      component: 'assessmentStore',
      action: 'save',
      site: 'site-a',
      reason: 'refused',
      result: 'blocked',
    });
  });

  it('logs once per site and reason per process', () => {
    const where = { component: 'assessmentStore', action: 'save', site: 'site-b' };
    logWellnessWriteBlocked(where, 'revoked');
    logWellnessWriteBlocked(where, 'revoked');
    logWellnessWriteBlocked(where, 'under_age');
    logWellnessWriteBlocked({ ...where, site: 'site-c' }, 'revoked');
    expect(mockLogSecurity).toHaveBeenCalledTimes(3);
  });

  it('a throwing logger is swallowed and not retried', () => {
    mockLogSecurity.mockImplementation(() => {
      throw new Error('logger down');
    });
    const where = { component: 'assessmentStore', action: 'save', site: 'site-d' };
    expect(() => logWellnessWriteBlocked(where, 'missing')).not.toThrow();
    expect(() => logWellnessWriteBlocked(where, 'missing')).not.toThrow();
    expect(mockLogSecurity).toHaveBeenCalledTimes(1);
  });
});

describe('seedWellnessWriteConsent: every seed produces the verdict and block start it names', () => {
  it.each([
    ['granted', { allowed: true }, Number.NEGATIVE_INFINITY],
    ['refused', { allowed: false, reason: 'refused' }, T1],
    ['revoked', { allowed: false, reason: 'revoked' }, T1],
    ['revoked_relaunched', { allowed: false, reason: 'revoked' }, null],
    ['under_age', { allowed: false, reason: 'under_age' }, null],
    ['missing', { allowed: false, reason: 'missing' }, null],
    ['loading', { allowed: false, reason: 'loading' }, null],
  ] as const)('%s', (seed, verdict, blockStart) => {
    seedWellnessWriteConsent(seed, { blockStartedAt: T1 });
    expect(decideWellnessWrite()).toEqual(verdict);
    expect(getWellnessWriteBlockStart()).toBe(blockStart);
  });

  it('legal_gate_refused (async): refused by the mirror, block start unknown', async () => {
    await seedWellnessWriteConsent('legal_gate_refused');
    expect(useConsentStore.getState().consentStatus).toBe('missing');
    expect(decideWellnessWrite()).toEqual({ allowed: false, reason: 'refused' });
    expect(getWellnessWriteBlockStart()).toBeNull();
  });

  it('a seed whose verdict comes out wrong throws instead of passing silently', async () => {
    // A legal-gate pass left in the mirror turns a later `missing` seed into `refused`.
    await seedWellnessWriteConsent('legal_gate_refused');
    expect(() => seedWellnessWriteConsent('missing')).toThrow(/missing/);
  });

  it('version_mismatch and expired with Art. 9 false still ALLOW writes (recorded, not seeded as blocked)', () => {
    useConsentStore.setState({ consentStatus: 'version_mismatch' });
    expect(decideWellnessWrite()).toEqual({ allowed: true });
    useConsentStore.setState({
      consentStatus: 'expired',
      currentConsent: record({}, false),
      consentCache: { ...useConsentStore.getState().consentCache, canProcessMentalHealthData: false },
    });
    expect(decideWellnessWrite()).toEqual({ allowed: true });
  });
});
