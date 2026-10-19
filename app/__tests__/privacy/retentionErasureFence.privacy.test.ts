/**
 * Retention cleanup vs. an interrupted erasure's resume (DEBUG-775).
 *
 * App.tsx runs `runRetentionCleanup` in its init allSettled while CleanRootNavigator
 * is already mounted, and the navigator starts `resumeInterruptedErasure` once the
 * route is set. Retention is a read → prune → write-back: a read before the resume's
 * wipe and a write after it restored the deleted account's records. The fence makes
 * retention wait for an erasure in flight and skip the launch while the marker is set,
 * failing closed on a marker it cannot read.
 *
 * Real DataRetentionService, AccountDeletionService and storage over in-memory disks.
 * `.privacy.` so the `Safety + privacy gates` CI job runs it (INFRA-368).
 */

const mockAsync = new Map<string, string>();
const mockSecure = new Map<string, string>();
/** A SecureStore write to one of these keys is held open until `releaseHeld()`. */
const mockHeld = new Set<string>();
let mockRelease: Array<() => void> = [];
let mockMarkerReadFails = false;

jest.mock('@react-native-async-storage/async-storage', () => {
  const api = {
    getItem: jest.fn(async (k: string) => {
      if (mockMarkerReadFails && k === '@being/erasure_pending') throw new Error('storage fault');
      return mockAsync.get(k) ?? null;
    }),
    setItem: jest.fn(async (k: string, v: string) => {
      mockAsync.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      mockAsync.delete(k);
    }),
    getAllKeys: jest.fn(async () => [...mockAsync.keys()]),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((k) => mockAsync.delete(k));
    }),
  };
  return { __esModule: true, default: api, ...api };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockSecure.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    if (mockHeld.has(k)) await new Promise<void>((resolve) => mockRelease.push(resolve));
    mockSecure.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockSecure.delete(k);
  }),
}));

jest.mock('react-native-aes-crypto', () => require('../helpers/mockEncryption').createAesCryptoMock());
jest.mock('expo-crypto', () => require('../helpers/mockEncryption').createExpoCryptoMock());
jest.mock('@/core/services/supabase/SupabaseService', () => ({
  __esModule: true,
  default: { deleteAccount: jest.fn(async () => true) },
}));
jest.mock('@/core/analytics/analyticsIdentityReset', () => ({ resetAnalyticsIdentity: jest.fn() }));
jest.mock('@/core/services/privacy/exportArtifactSweeper', () => ({ sweepExportArtifacts: jest.fn(() => 0) }));

import { resumeInterruptedErasure } from '@/core/services/privacy/AccountDeletionService';
import { ERASURE_PENDING_KEY } from '@/core/services/privacy/erasurePending';
import { DataRetentionService, DATA_RETENTION_CONFIG } from '@/core/services/data-retention/DataRetentionService';

const STOIC_KEY = 'stoic_practice_state';
const day = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().split('T')[0];

/** One expired check-in (so retention writes back) and one in-window one (so the write-back has content). */
function seedPreErasureStoic(): void {
  mockSecure.set(
    STOIC_KEY,
    JSON.stringify({
      checkInCompletions: [
        { type: 'morning', date: day(200) },
        { type: 'evening', date: day(1) },
      ],
      principleEngagements: [],
    }),
  );
}

const releaseHeld = () => {
  mockRelease.forEach((r) => r());
  mockRelease = [];
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

beforeEach(() => {
  mockAsync.clear();
  mockSecure.clear();
  mockHeld.clear();
  mockRelease = [];
  mockMarkerReadFails = false;
});

describe('retention cleanup and a resumed erasure', () => {
  it('does not write the deleted account\'s practice data back after the wipe', async () => {
    seedPreErasureStoic();
    mockAsync.set(ERASURE_PENDING_KEY, String(1_790_000_000_000));
    mockHeld.add(STOIC_KEY);

    // App.tsx's order: retention starts in init, the resume once the route is set.
    const retention = DataRetentionService.runRetentionCleanup();
    await settle();
    await resumeInterruptedErasure();
    releaseHeld();
    await retention;
    await settle();

    expect(mockSecure.has(STOIC_KEY)).toBe(false);
    expect(mockAsync.has(ERASURE_PENDING_KEY)).toBe(false);
  });

  it('skips the launch while the marker is set, without stamping the daily limiter', async () => {
    seedPreErasureStoic();
    mockAsync.set(ERASURE_PENDING_KEY, String(1_790_000_000_000));

    const result = await DataRetentionService.runRetentionCleanup();

    expect(result.categoriesProcessed).toEqual([]);
    expect(JSON.parse(mockSecure.get(STOIC_KEY)!).checkInCompletions).toHaveLength(2);
    expect(mockAsync.has(DATA_RETENTION_CONFIG.LAST_CLEANUP_KEY)).toBe(false);
    expect(mockAsync.has(DATA_RETENTION_CONFIG.DELETION_AUDIT_KEY)).toBe(false);
  });

  it('fails closed when the marker cannot be read', async () => {
    seedPreErasureStoic();
    mockMarkerReadFails = true;

    await DataRetentionService.runRetentionCleanup();

    expect(JSON.parse(mockSecure.get(STOIC_KEY)!).checkInCompletions).toHaveLength(2);
    expect(mockAsync.has(DATA_RETENTION_CONFIG.LAST_CLEANUP_KEY)).toBe(false);
  });

  it('prunes normally with no erasure pending (control)', async () => {
    seedPreErasureStoic();

    await DataRetentionService.runRetentionCleanup();

    expect(JSON.parse(mockSecure.get(STOIC_KEY)!).checkInCompletions).toEqual([{ type: 'evening', date: day(1) }]);
    expect(mockAsync.has(DATA_RETENTION_CONFIG.LAST_CLEANUP_KEY)).toBe(true);
  });
});
