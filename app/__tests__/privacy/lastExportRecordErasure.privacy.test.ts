/**
 * FEAT-807 — the last-export record is erased with the account.
 *
 * Written through the real `writeLastExportRecord` (real SecureStorageService and
 * encryption over in-memory stores), then the real `deleteAccountAndWipe` runs; only the
 * server delete, the analytics reset and the export sweep are faked, as in
 * erasureSurvivorManifest.privacy.test.ts. That suite proves the key is no survivor by
 * seeding it; this one proves the record the feature actually writes is gone.
 */

const mockAsync = new Map<string, string>();
const mockSecure = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => {
  const api = {
    getItem: jest.fn(async (k: string) => mockAsync.get(k) ?? null),
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

import { deleteAccountAndWipe } from '@/core/services/privacy/AccountDeletionService';
import { SECURE_STORAGE_CONFIG } from '@/core/services/security/SecureStorageService';
import {
  readLastExportRecord,
  writeLastExportRecord,
} from '@/features/data-export/services/lastExportRecord';

const STORED_KEY = `${SECURE_STORAGE_CONFIG.WELLNESS_ASYNC_PREFIX}last_export_record_v1`;

it('is written encrypted, readable, and gone after a successful erasure', async () => {
  const written = await writeLastExportRecord('json', {
    preset: 'all',
    categories: ['assessments', 'checkIns', 'practices', 'reflections'],
  });
  expect(written).not.toBeNull();

  // Liveness: the record really landed, under the swept prefix, and not in plaintext.
  expect(mockAsync.has(STORED_KEY)).toBe(true);
  expect(mockAsync.get(STORED_KEY)).not.toContain('"format":"json"');
  await expect(readLastExportRecord()).resolves.toEqual(written);

  const result = await deleteAccountAndWipe({ posthog: null });
  expect(result).toMatchObject({ ok: true });

  expect(mockAsync.has(STORED_KEY)).toBe(false);
  await expect(readLastExportRecord()).resolves.toBeNull();
});
