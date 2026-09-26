/**
 * Art. 9 wellness-write consent predicate + legal-gate mirror (FEAT-664, FEAT-318 slice A1).
 *
 * `decideWellnessWrite()` is the single reading of "may wellness data be written
 * right now?" that slices A2, B and C will consult at their storage writes. It is
 * new rather than a call to `canPerformOperation('mental_health_processing')`
 * because that fails closed on every status except `valid`, and the store boots at
 * `loading` — reusing it would block every user at boot and every new user during
 * onboarding, where PHQ-9/GAD-7 run BEFORE `grantConsent`.
 *
 * WHAT THIS SUITE PINS
 *   1. The founder-approved 2026-08-08 disposition table, status by status.
 *   2. The `missing` window: permitted only on an in-memory legal-gate record that
 *      consents, carries CONSENT_VERSION, and is 0..BOUND ms old (compliance,
 *      2026-09-26). Both sides of the bound, and a future timestamp, are covered.
 *   3. The non-negotiables: synchronous, zero I/O, never throws (fails OPEN), and
 *      never consults `canPerformOperation` or `getLegalGateConsents`.
 *   4. The breadcrumb: pass-through statuses and the fail-open branch log once per
 *      status per process; `valid`, blocked and `loading` never log; a throwing
 *      logger cannot change a verdict (crisis, 2026-09-26).
 *   5. The mirror: written through only after the SecureStore write resolves;
 *      hydrated at boot without ever delaying `loadConsent` (crisis — a hung
 *      Keychain read must not hold LoadingScreen); never a store notification;
 *      and never overwritten by hydration once written through (compliance,
 *      revised ruling D — a transient read failure must not discard a gate pass).
 *
 * Module state (the mirror, its generation counter, the breadcrumb dedupe set) is
 * deliberately unexported, so every test gets a fresh module via `jest.resetModules`.
 *
 * `.privacy.` so the `Safety + privacy gates` CI job runs it (INFRA-368).
 */

const mockSecureStore: Record<string, string> = {};
const mockAsyncStorage: Record<string, string> = {};
/** Keys whose SecureStore read should be handed a caller-controlled promise. */
const mockDeferredReads: Record<string, Promise<string | null>> = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) =>
    key in mockDeferredReads ? mockDeferredReads[key] : (mockSecureStore[key] ?? null),
  ),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStore[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete mockSecureStore[key];
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockAsyncStorage[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockAsyncStorage[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete mockAsyncStorage[key];
    }),
  },
}));

jest.mock('@/core/constants/devMode', () => ({
  getCurrentUserId: () => 'test-user-id',
}));

jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  ACCOUNT_DELETION_ATTESTATION_KEY: 'account_deletion_attestation_v1',
  default: {
    storeWellnessBlob: jest.fn(async () => ({ success: true })),
    retrieveWellnessBlob: jest.fn(async () => null),
    deleteWellnessBlob: jest.fn(async () => undefined),
  },
}));

jest.mock('@/core/services/logging', () => ({
  logSecurity: jest.fn(),
}));

type ConsentStoreModule = typeof import('../consentStore');
type Status = import('../consentStore').ConsentStatus;

const LEGAL_GATE_CONSENTS_KEY = 'legal_gate_consents_v1';
const CONSENT_SECURE_KEY = 'consent_record_v1';
const T0 = 1_800_000_000_000;

let store: ConsentStoreModule;
let SecureStore: jest.Mocked<typeof import('expo-secure-store')>;
let AsyncStorage: { getItem: jest.Mock; setItem: jest.Mock; removeItem: jest.Mock };
let SecureStorageService: Record<string, jest.Mock>;
let logSecurity: jest.Mock;
let now = T0;

const GATE = {
  tosAccepted: true,
  privacyAccepted: true,
  wellnessDisclaimerAcknowledged: true,
} as const;

beforeEach(() => {
  jest.resetModules();
  for (const bag of [mockSecureStore, mockAsyncStorage, mockDeferredReads]) {
    for (const key of Object.keys(bag)) delete bag[key];
  }
  now = T0;
  jest.spyOn(Date, 'now').mockImplementation(() => now);

  store = require('../consentStore');
  SecureStore = require('expo-secure-store');
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
  SecureStorageService = require('@/core/services/security/SecureStorageService').default;
  logSecurity = require('@/core/services/logging').logSecurity;
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Put the store in a status without going through storage. */
function setStatus(consentStatus: Status, canProcessMentalHealthData = false): void {
  const { consentCache } = store.useConsentStore.getState();
  store.useConsentStore.setState({
    consentStatus,
    consentCache: { ...consentCache, canProcessMentalHealthData },
  });
}

/** Seed the mirror through its only production writer. */
async function recordGate(mentalHealthProcessingConsent: boolean): Promise<void> {
  await store.recordLegalGateConsents({ ...GATE, mentalHealthProcessingConsent });
}

/** Resolve pending microtasks (hydration is fire-and-forget). */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const ALLOWED = { allowed: true };
const blocked = (reason: string) => ({ allowed: false, reason });

describe('disposition table (2026-08-08, founder-approved)', () => {
  it.each<[string, Status, boolean, object]>([
    ['valid + Art. 9 granted', 'valid', true, ALLOWED],
    ['valid + Art. 9 refused', 'valid', false, blocked('refused')],
    ['revoked (Art. 7(3) withdrawal)', 'revoked', false, blocked('revoked')],
    ['under_age (affirmative ineligibility)', 'under_age', false, blocked('under_age')],
    ['loading (boot, nothing read yet)', 'loading', false, blocked('loading')],
    ['version_mismatch (re-consent eligible)', 'version_mismatch', false, ALLOWED],
    ['expired (founder: pass until FEAT-332)', 'expired', false, ALLOWED],
    ['integrity_error (founder: pass)', 'integrity_error', false, ALLOWED],
    ['missing, no legal-gate record', 'missing', false, blocked('missing')],
  ])('%s', (_label, status, canProcess, expected) => {
    setStatus(status, canProcess);
    expect(store.decideWellnessWrite()).toEqual(expected);
  });

  it('ignores the legal-gate mirror on every status except `missing`', async () => {
    await recordGate(true);
    for (const [status, reason] of [
      ['loading', 'loading'],
      ['revoked', 'revoked'],
      ['under_age', 'under_age'],
    ] as const) {
      setStatus(status);
      expect(store.decideWellnessWrite()).toEqual(blocked(reason));
    }
    setStatus('valid', false);
    expect(store.decideWellnessWrite()).toEqual(blocked('refused'));

    await recordGate(false);
    setStatus('valid', true);
    expect(store.decideWellnessWrite()).toEqual(ALLOWED);
  });
});

describe('`missing` — the onboarding window before grantConsent', () => {
  const BOUND = () => store.MISSING_CONSENT_MIRROR_BOUND_MS;

  it('is bounded at 30 minutes (compliance ruling)', () => {
    expect(BOUND()).toBe(30 * 60 * 1000);
  });

  it('permits on a consenting, current-version record at age 0 and at exactly the bound', async () => {
    setStatus('missing');
    await recordGate(true);
    expect(store.decideWellnessWrite()).toEqual(ALLOWED);
    now = T0 + BOUND();
    expect(store.decideWellnessWrite()).toEqual(ALLOWED);
  });

  it('blocks as `missing` one millisecond past the bound', async () => {
    setStatus('missing');
    await recordGate(true);
    now = T0 + BOUND() + 1;
    expect(store.decideWellnessWrite()).toEqual(blocked('missing'));
  });

  it('blocks as `missing` on a future-stamped record (clock moved back)', async () => {
    setStatus('missing');
    await recordGate(true);
    now = T0 - 1;
    expect(store.decideWellnessWrite()).toEqual(blocked('missing'));
  });

  it('blocks as `refused` on a record that refused Art. 9 at the gate', async () => {
    setStatus('missing');
    await recordGate(false);
    expect(store.decideWellnessWrite()).toEqual(blocked('refused'));
  });

  it('blocks as `missing` on a consenting record from another CONSENT_VERSION', async () => {
    mockSecureStore[LEGAL_GATE_CONSENTS_KEY] = JSON.stringify({
      ...GATE,
      mentalHealthProcessingConsent: true,
      timestamp: T0,
      version: '1.0.0',
    });
    await store.useConsentStore.getState().loadConsent();
    await flush();
    expect(store.useConsentStore.getState().consentStatus).toBe('missing');
    expect(store.decideWellnessWrite()).toEqual(blocked('missing'));
  });
});

describe('non-negotiables', () => {
  const EVERY_STATUS: Status[] = [
    'loading',
    'valid',
    'version_mismatch',
    'integrity_error',
    'revoked',
    'expired',
    'missing',
    'under_age',
  ];

  it('is synchronous on every status (returns no Promise)', async () => {
    await recordGate(true);
    for (const status of EVERY_STATUS) {
      setStatus(status, true);
      const result = store.decideWellnessWrite() as unknown as { then?: unknown };
      expect(result).not.toBeInstanceOf(Promise);
      expect(result.then).toBeUndefined();
    }
  });

  it('performs zero storage I/O on every status', async () => {
    await recordGate(true);
    const mocks = [
      SecureStore.getItemAsync,
      SecureStore.setItemAsync,
      SecureStore.deleteItemAsync,
      AsyncStorage.getItem,
      AsyncStorage.setItem,
      AsyncStorage.removeItem,
      ...Object.values(SecureStorageService),
    ] as jest.Mock[];
    const before = mocks.map((m) => m.mock.calls.length);

    for (const status of EVERY_STATUS) {
      setStatus(status, false);
      store.decideWellnessWrite();
      setStatus(status, true);
      store.decideWellnessWrite();
    }

    expect(mocks.map((m) => m.mock.calls.length)).toEqual(before);
  });

  it('never consults canPerformOperation', () => {
    const canPerformOperation = jest.fn(() => true);
    store.useConsentStore.setState({ canPerformOperation });
    for (const status of EVERY_STATUS) {
      setStatus(status, true);
      store.decideWellnessWrite();
    }
    expect(canPerformOperation).not.toHaveBeenCalled();
  });

  it('fails OPEN on an internal throw, and does not throw itself', () => {
    jest.spyOn(store.useConsentStore, 'getState').mockImplementation(() => {
      throw new TypeError('secret detail that must not be logged');
    });
    expect(() => store.decideWellnessWrite()).not.toThrow();
    expect(store.decideWellnessWrite()).toEqual(ALLOWED);
  });
});

describe('breadcrumb', () => {
  it.each<Status>(['version_mismatch', 'expired', 'integrity_error'])(
    'logs %s exactly once per process, content-free, at low severity',
    (status) => {
      setStatus(status);
      for (let i = 0; i < 5; i += 1) store.decideWellnessWrite();

      expect(logSecurity).toHaveBeenCalledTimes(1);
      const [, severity, context] = logSecurity.mock.calls[0];
      expect(severity).toBe('low');
      expect(context).toEqual({
        component: 'consentStore',
        action: 'decideWellnessWrite',
        result: 'success',
        reason: status,
      });
    },
  );

  it('dedupes per status, not globally — a mid-session transition still logs', () => {
    setStatus('version_mismatch');
    store.decideWellnessWrite();
    setStatus('expired');
    store.decideWellnessWrite();
    store.decideWellnessWrite();
    expect(logSecurity).toHaveBeenCalledTimes(2);
  });

  it.each<[Status, boolean]>([
    ['valid', true],
    ['valid', false],
    ['revoked', false],
    ['under_age', false],
    ['loading', false],
    ['missing', false],
  ])('never logs on %s (canProcess=%s)', (status, canProcess) => {
    setStatus(status, canProcess);
    for (let i = 0; i < 5; i += 1) store.decideWellnessWrite();
    expect(logSecurity).not.toHaveBeenCalled();
  });

  it('logs the fail-open branch once, at high severity, with only the error name', () => {
    jest.spyOn(store.useConsentStore, 'getState').mockImplementation(() => {
      throw new TypeError('secret detail that must not be logged');
    });
    store.decideWellnessWrite();
    store.decideWellnessWrite();

    expect(logSecurity).toHaveBeenCalledTimes(1);
    const [, severity, context] = logSecurity.mock.calls[0];
    expect(severity).toBe('high');
    expect(context).toEqual({
      component: 'consentStore',
      action: 'decideWellnessWrite',
      result: 'failure',
      reason: 'evaluation_threw',
      cause: 'TypeError',
    });
    expect(JSON.stringify(logSecurity.mock.calls)).not.toContain('secret detail');
  });

  it.each<Status>(['version_mismatch', 'expired', 'integrity_error'])(
    'a throwing logger cannot change the %s verdict, and is not retried',
    (status) => {
      logSecurity.mockImplementation(() => {
        throw new Error('logger down');
      });
      setStatus(status);
      expect(() => store.decideWellnessWrite()).not.toThrow();
      expect(store.decideWellnessWrite()).toEqual(ALLOWED);
      expect(logSecurity).toHaveBeenCalledTimes(1);
    },
  );

  it('a throwing logger inside the fail-open branch still returns allowed', () => {
    logSecurity.mockImplementation(() => {
      throw new Error('logger down');
    });
    jest.spyOn(store.useConsentStore, 'getState').mockImplementation(() => {
      throw new Error('state unreadable');
    });
    expect(() => store.decideWellnessWrite()).not.toThrow();
    expect(store.decideWellnessWrite()).toEqual(ALLOWED);
    expect(logSecurity).toHaveBeenCalledTimes(1);
  });
});

describe('legal-gate mirror — write-through', () => {
  it('is not set until the SecureStore write resolves', async () => {
    setStatus('missing');
    const write = deferred<void>();
    SecureStore.setItemAsync.mockImplementationOnce(() => write.promise);

    const pending = recordGate(true);
    expect(store.decideWellnessWrite()).toEqual(blocked('missing'));

    write.resolve();
    await pending;
    expect(store.decideWellnessWrite()).toEqual(ALLOWED);
  });

  it('a failed write never widens permission', async () => {
    setStatus('missing');
    SecureStore.setItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
    await expect(recordGate(true)).rejects.toThrow('keychain locked');
    expect(store.decideWellnessWrite()).toEqual(blocked('missing'));
  });

  it('the latest gate pass wins', async () => {
    setStatus('missing');
    await recordGate(true);
    await recordGate(false);
    expect(store.decideWellnessWrite()).toEqual(blocked('refused'));
  });

  it('resetConsent clears it', async () => {
    await recordGate(true);
    await store.useConsentStore.getState().resetConsent();
    expect(store.useConsentStore.getState().consentStatus).toBe('missing');
    expect(store.decideWellnessWrite()).toEqual(blocked('missing'));
  });
});

describe('legal-gate mirror — boot hydration', () => {
  it('hydrates from the stored record when loadConsent runs', async () => {
    mockSecureStore[LEGAL_GATE_CONSENTS_KEY] = JSON.stringify({
      ...GATE,
      mentalHealthProcessingConsent: true,
      timestamp: T0,
      version: store.CONSENT_VERSION,
    });
    await store.useConsentStore.getState().loadConsent();
    await flush();
    expect(store.useConsentStore.getState().consentStatus).toBe('missing');
    expect(store.decideWellnessWrite()).toEqual(ALLOWED);
  });

  it('starts the read before loadConsent’s first await, so every branch hydrates', async () => {
    // Force the catch branch: the consent-record read itself throws.
    SecureStore.getItemAsync.mockImplementation(async (key: string) => {
      if (key === CONSENT_SECURE_KEY) throw new Error('keychain unavailable');
      return mockSecureStore[key] ?? null;
    });
    const pending = store.useConsentStore.getState().loadConsent();
    // Asserted before awaiting anything: the read was issued synchronously.
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(LEGAL_GATE_CONSENTS_KEY);
    await pending;
    expect(store.useConsentStore.getState().consentStatus).toBe('integrity_error');
  });

  it('a null read clears a mirror that was only ever seeded from disk', async () => {
    mockSecureStore[LEGAL_GATE_CONSENTS_KEY] = JSON.stringify({
      ...GATE,
      mentalHealthProcessingConsent: true,
      timestamp: T0,
      version: store.CONSENT_VERSION,
    });
    await store.useConsentStore.getState().loadConsent();
    await flush();
    expect(store.decideWellnessWrite()).toEqual(ALLOWED);

    delete mockSecureStore[LEGAL_GATE_CONSENTS_KEY];
    await store.useConsentStore.getState().loadConsent();
    await flush();
    expect(store.decideWellnessWrite()).toEqual(blocked('missing'));
  });

  it('a transient read failure after a gate pass keeps the mirror (compliance, revised D)', async () => {
    // loadConsent re-runs during a session; a Keychain blip on one of those reads
    // must not discard a real gate pass and start dropping onboarding screenings.
    await recordGate(true);
    SecureStore.getItemAsync.mockImplementation(async (key: string) => {
      if (key === LEGAL_GATE_CONSENTS_KEY) throw new Error('keychain unavailable');
      return mockSecureStore[key] ?? null;
    });
    await store.useConsentStore.getState().loadConsent();
    await flush();
    expect(store.useConsentStore.getState().consentStatus).toBe('missing');
    expect(store.decideWellnessWrite()).toEqual(ALLOWED);
  });

  it('after resetConsent, hydration seeds the mirror again', async () => {
    await recordGate(false);
    await store.useConsentStore.getState().resetConsent();
    mockSecureStore[LEGAL_GATE_CONSENTS_KEY] = JSON.stringify({
      ...GATE,
      mentalHealthProcessingConsent: true,
      timestamp: T0,
      version: store.CONSENT_VERSION,
    });
    await store.useConsentStore.getState().loadConsent();
    await flush();
    expect(store.decideWellnessWrite()).toEqual(ALLOWED);
  });

  it('a slow boot read cannot clobber a newer write-through', async () => {
    const slowRead = deferred<string | null>();
    mockDeferredReads[LEGAL_GATE_CONSENTS_KEY] = slowRead.promise;

    await store.useConsentStore.getState().loadConsent();
    await recordGate(true);
    slowRead.resolve(null);
    await flush();

    expect(store.useConsentStore.getState().consentStatus).toBe('missing');
    expect(store.decideWellnessWrite()).toEqual(ALLOWED);
  });

  it.each([
    ['missing', undefined],
    ['valid', 'record'],
  ])(
    'a legal-gate read that NEVER resolves does not delay loadConsent (%s branch)',
    async (expectedStatus, seed) => {
      mockDeferredReads[LEGAL_GATE_CONSENTS_KEY] = new Promise<string | null>(() => {});
      if (seed) {
        mockSecureStore[CONSENT_SECURE_KEY] = JSON.stringify({
          consentId: 'c1',
          userId: 'test-user-id',
          version: store.CONSENT_VERSION,
          preferences: {
            analyticsEnabled: false,
            crashReportsEnabled: false,
            cloudSyncEnabled: false,
            researchEnabled: false,
            mentalHealthProcessingConsent: true,
          },
          universalOptOut: false,
          ageVerification: { verified: true, isEligible: true, birthYear: 1990 },
          timestamp: T0,
          updatedAt: T0,
          revoked: false,
        });
      }

      let timer: ReturnType<typeof setTimeout> | undefined;
      const outcome = await Promise.race([
        store.useConsentStore.getState().loadConsent().then(() => 'settled'),
        new Promise((resolve) => {
          timer = setTimeout(() => resolve('hung'), 1000);
        }),
      ]);
      clearTimeout(timer);

      expect(outcome).toBe('settled');
      expect(store.useConsentStore.getState().consentStatus).toBe(expectedStatus);
    },
  );

  it('resolving hydration after loadConsent settles notifies no store subscriber', async () => {
    const read = deferred<string | null>();
    mockDeferredReads[LEGAL_GATE_CONSENTS_KEY] = read.promise;
    await store.useConsentStore.getState().loadConsent();

    const listener = jest.fn();
    const unsubscribe = store.useConsentStore.subscribe(listener);
    read.resolve(
      JSON.stringify({
        ...GATE,
        mentalHealthProcessingConsent: true,
        timestamp: T0,
        version: store.CONSENT_VERSION,
      }),
    );
    await flush();
    unsubscribe();

    expect(listener).not.toHaveBeenCalled();
    expect(store.decideWellnessWrite()).toEqual(ALLOWED);
  });

  it('never rejects, even when the read and the logger both fail', async () => {
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);
    try {
      SecureStore.getItemAsync.mockImplementation(async (key: string) => {
        if (key === LEGAL_GATE_CONSENTS_KEY) throw new Error('keychain');
        return mockSecureStore[key] ?? null;
      });
      logSecurity.mockImplementation(() => {
        throw new Error('logger down');
      });
      await store.useConsentStore.getState().loadConsent();
      await flush();
      await new Promise((resolve) => setImmediate(resolve));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });
});
