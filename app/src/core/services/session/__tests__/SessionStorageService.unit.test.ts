/**
 * SessionStorageService against its real code (MAINT-746, audit TEST-37).
 *
 * SecureStore is an in-memory disk and EncryptionService a transparent envelope — the
 * cipher is not under test (same harness as sessionStorage.wellnessWriteGate.privacy.test).
 * Read-path cases seed the disk directly so they do not depend on the FEAT-667 consent gate;
 * the save round trip seeds consent, or every "returns null" below would pass vacuously on
 * a save that never wrote. Each null/cleared assertion is preceded by proof the session
 * existed.
 *
 * Times are built with local-time Date constructors: the daily loop expires at the next
 * LOCAL midnight (computeSessionExpiry), so a UTC epoch literal would move the boundary on a
 * runner in another time zone.
 */

import { SESSION_STORAGE_KEYS, computeSessionExpiry, type SessionData } from '@/core/types/session';
import type { PracticeIdentity } from '@/core/types/practice-identity';
import type { SeededWellnessWriteConsent } from '../../../../../__tests__/helpers/wellnessWriteConsent';

const mockDisk: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockDisk[key] ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockDisk[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete mockDisk[key];
  }),
}));

jest.mock('@/core/services/security/EncryptionService', () => ({
  __esModule: true,
  default: {
    encryptData: jest.fn(async (data: unknown) => ({ plaintext: data })),
    decryptData: jest.fn(async (pkg: { plaintext: unknown }) => pkg.plaintext),
  },
}));

type ServiceModule = typeof import('@/core/services/session/SessionStorageService');
let Service: ServiceModule['SessionStorageService'];
let seedConsent: (state: SeededWellnessWriteConsent) => void;

const KEY: Record<PracticeIdentity, string> = {
  morning: SESSION_STORAGE_KEYS.MORNING,
  midday: SESSION_STORAGE_KEYS.MIDDAY,
  evening: SESSION_STORAGE_KEYS.EVENING,
  'daily-loop': SESSION_STORAGE_KEYS.DAILY_LOOP,
};

/** Write a session straight to the disk, the way saveSession would have. */
function putSession(flowType: PracticeIdentity, startedAt: number, over: Partial<SessionData> = {}) {
  const data: SessionData = {
    flowType,
    startedAt,
    lastSavedAt: startedAt,
    currentScreen: 'SphereSovereignty',
    completed: false,
    expiresAt: computeSessionExpiry(flowType, startedAt),
    flowState: { depth: 'deep', mode: 'present' },
    ...over,
  };
  mockDisk[KEY[flowType]] = JSON.stringify({ plaintext: data });
}

/** 6 October 2026 at the given LOCAL hour and minute. */
const at = (hour: number, minute = 0, day = 6) => new Date(2026, 9, day, hour, minute).getTime();

beforeEach(() => {
  for (const key of Object.keys(mockDisk)) delete mockDisk[key];
  jest.useFakeTimers({ now: at(9), doNotFake: ['nextTick', 'queueMicrotask'] });
  // The withheld-flows latch is process-static: a fresh module per test starts it empty.
  jest.resetModules();
  Service = require('@/core/services/session/SessionStorageService').SessionStorageService;
  seedConsent = require('../../../../../__tests__/helpers/wellnessWriteConsent').seedWellnessWriteConsent;
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('clearAllSessions', () => {
  it('clears EVERY session key, the daily loop included', async () => {
    // Derived from SESSION_STORAGE_KEYS, never a literal list: a hand-kept list of keys is
    // exactly how 'daily-loop' came to be skipped.
    const keys = Object.values(SESSION_STORAGE_KEYS);
    for (const key of keys) mockDisk[key] = '{"plaintext":{}}';
    expect(Object.keys(mockDisk).sort()).toEqual([...keys].sort());

    await Service.clearAllSessions();

    for (const key of keys) expect(mockDisk[key]).toBeUndefined();
  });
});

describe('loadSession', () => {
  it('returns an unexpired session (control for the null cases below)', async () => {
    putSession('morning', at(8));
    expect((await Service.loadSession('morning'))?.currentScreen).toBe('SphereSovereignty');
  });

  it('expires a legacy flow on its rolling 24h TTL, and clears it', async () => {
    putSession('morning', at(8));
    expect(mockDisk[KEY.morning]).toBeDefined();
    jest.setSystemTime(at(8, 1, 7)); // 24h and one minute later

    expect(await Service.loadSession('morning')).toBeNull();
    expect(mockDisk[KEY.morning]).toBeUndefined();
  });

  it('expires a daily-loop session at the next local midnight, well inside 24h', async () => {
    putSession('daily-loop', at(23));
    jest.setSystemTime(at(23, 30));
    expect(await Service.loadSession('daily-loop')).not.toBeNull();

    jest.setSystemTime(at(0, 30, 7)); // 90 minutes later, but past midnight
    expect(await Service.loadSession('daily-loop')).toBeNull();
    expect(mockDisk[KEY['daily-loop']]).toBeUndefined();
  });

  it('returns null for a completed session, and clears it', async () => {
    putSession('evening', at(8), { completed: true });
    expect(mockDisk[KEY.evening]).toBeDefined();

    expect(await Service.loadSession('evening')).toBeNull();
    expect(mockDisk[KEY.evening]).toBeUndefined();
  });

  it('returns null for corrupt JSON, and clears it', async () => {
    mockDisk[KEY.midday] = 'not json{';

    expect(await Service.loadSession('midday')).toBeNull();
    expect(mockDisk[KEY.midday]).toBeUndefined();
  });
});

describe('save → complete → load', () => {
  it('a saved session loads, and once marked completed it does not', async () => {
    seedConsent('granted');
    await Service.saveSession('daily-loop', 'SphereSovereignty', { depth: 'deep' });
    expect((await Service.loadSession('daily-loop'))?.currentScreen).toBe('SphereSovereignty');

    await Service.markSessionCompleted('daily-loop');

    expect(await Service.loadSession('daily-loop')).toBeNull();
    expect(mockDisk[KEY['daily-loop']]).toBeUndefined();
  });
});

describe('getSessionMetadata', () => {
  it('returns the metadata without the flow state', async () => {
    putSession('morning', at(8));

    const metadata = await Service.getSessionMetadata('morning');

    expect(metadata?.currentScreen).toBe('SphereSovereignty');
    expect(metadata).not.toHaveProperty('flowState');
  });
});
