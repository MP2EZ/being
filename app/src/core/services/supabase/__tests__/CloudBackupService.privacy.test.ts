/**
 * CloudBackupService — privacy & wellness-data safety contracts (MAINT-235)
 *
 * Pins the AC's safety surface on the cloud-backup egress path (zero tests before
 * this). Real assertions on the actual mechanisms (not mock-only):
 *   1. Consent chokepoint — backup is skipped when cloud_sync consent is absent.
 *   2. Unchanged-data skip — no redundant re-upload when the payload is identical.
 *   3. Wellness-data-leak failsafe — a >500-byte payload aborts BEFORE upload.
 *   4. Restore integrity — a checksum mismatch throws; restore returns failure.
 *   5. Restore allowlist — only non-sensitive config fields (autoSaveEnabled,
 *      lastSyncAt) are written back; any extra fields are dropped.
 *
 * Compliance planning pass: assert through the real consent gate
 * (useConsentStore.canPerformOperation('cloud_sync')); do NOT re-test encryption,
 * consent-store internals, or Supabase resilience (owned elsewhere). Terminology:
 * "wellness data," not "PHI" (Being is not a HIPAA entity) — the source's own
 * "PHI" strings are matched literally only where asserted.
 */

jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: { getState: jest.fn() },
}));
jest.mock('@/features/assessment/stores/assessmentStore', () => ({
  useAssessmentStore: { getState: jest.fn(), setState: jest.fn() },
}));
jest.mock('../../security/EncryptionService', () => ({
  __esModule: true,
  default: {
    encryptData: jest.fn(async () => ({ ciphertext: 'enc', iv: 'iv' })),
    decryptData: jest.fn(),
  },
}));
jest.mock('../SupabaseService', () => ({
  __esModule: true,
  default: {
    saveBackup: jest.fn(async () => true),
    getBackup: jest.fn(),
    trackEvent: jest.fn(async () => undefined),
  },
}));
// Deterministic digest so checksum/data-hash are predictable: echo the input.
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(async (_alg: string, data: string) => `CHK_${data}`),
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async () => undefined),
  getItem: jest.fn(async () => null),
}));

import cloudBackupService from '../CloudBackupService';
import { useConsentStore } from '@/core/stores/consentStore';
import { useAssessmentStore as assessmentStore } from '@/features/assessment/stores/assessmentStore';
import supabaseService from '../SupabaseService';
import EncryptionService from '../../security/EncryptionService';

const consentGetState = useConsentStore.getState as jest.Mock;
const assessmentGetState = assessmentStore.getState as jest.Mock;
const assessmentSetState = assessmentStore.setState as jest.Mock;
const saveBackup = supabaseService.saveBackup as jest.Mock;
const getBackup = supabaseService.getBackup as jest.Mock;
const decryptData = EncryptionService.decryptData as jest.Mock;

const allowConsent = (allowed: boolean) =>
  consentGetState.mockReturnValue({ canPerformOperation: jest.fn(() => allowed) });

beforeEach(() => {
  jest.clearAllMocks();
  // The service is a singleton; bypass initialize() and reset change-tracking.
  (cloudBackupService as unknown as { isInitialized: boolean }).isInitialized = true;
  (cloudBackupService as unknown as { lastBackupHash: string | null }).lastBackupHash = null;
  allowConsent(true);
  // Small, allowlisted-only state → payload well under the 500-byte failsafe.
  assessmentGetState.mockReturnValue({ autoSaveEnabled: true, lastSyncAt: 123 });
  saveBackup.mockResolvedValue(true);
});

describe('CloudBackupService — consent chokepoint (cloud_sync opt-in)', () => {
  it('skips backup and does NOT upload when cloud_sync consent is absent', async () => {
    allowConsent(false);
    const result = await cloudBackupService.createBackup();
    expect(result).toEqual({ success: false, error: 'cloud_sync_consent_absent' });
    expect(saveBackup).not.toHaveBeenCalled();
  });

  it('proceeds to upload when cloud_sync consent is present', async () => {
    allowConsent(true);
    const result = await cloudBackupService.createBackup();
    expect(result.success).toBe(true);
    expect(saveBackup).toHaveBeenCalledTimes(1);
  });

  it('halts egress immediately when consent is revoked after a prior backup', async () => {
    await cloudBackupService.createBackup(); // first backup with consent
    expect(saveBackup).toHaveBeenCalledTimes(1);
    allowConsent(false); // user toggles cloud_sync off
    const result = await cloudBackupService.createBackup();
    expect(result.error).toBe('cloud_sync_consent_absent');
    expect(saveBackup).toHaveBeenCalledTimes(1); // no second upload
  });
});

describe('CloudBackupService — unchanged-data skip', () => {
  it('does not re-upload when the payload is identical to the last backup', async () => {
    const first = await cloudBackupService.createBackup();
    expect(first.success).toBe(true);
    expect(saveBackup).toHaveBeenCalledTimes(1);
    const second = await cloudBackupService.createBackup(); // same getState → same hash
    expect(second.success).toBe(true);
    expect(saveBackup).toHaveBeenCalledTimes(1); // still once — skipped
  });
});

describe('CloudBackupService — wellness-data-leak failsafe (>500 bytes aborts before upload)', () => {
  it('aborts the backup and does NOT upload when the serialized payload exceeds 500 bytes', async () => {
    // Inflate an allowlisted field so the payload crosses the 500-byte fail-safe —
    // simulating accidental inclusion of sensitive wellness data.
    assessmentGetState.mockReturnValue({ autoSaveEnabled: 'x'.repeat(600), lastSyncAt: null });
    const result = await cloudBackupService.createBackup();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Backup size validation failed');
    expect(saveBackup).not.toHaveBeenCalled();
  });
});

describe('CloudBackupService — restore integrity + allowlist', () => {
  const encryptedData = JSON.stringify({ ciphertext: 'abc', iv: 'iv' });

  it('throws and reports failure on a checksum mismatch (corrupted/tampered backup)', async () => {
    getBackup.mockResolvedValue({ encrypted_data: encryptedData, checksum: 'WRONG_CHECKSUM' });
    const result = await cloudBackupService.restoreFromBackup();
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('integrity check failed');
    expect(assessmentSetState).not.toHaveBeenCalled();
  });

  it('restores ONLY allowlisted config fields, dropping any sensitive wellness-data fields', async () => {
    // Legacy-style backup carrying extra (sensitive) fields beyond the allowlist.
    const backupData = {
      version: 1,
      timestamp: 1700000000000,
      stores: {
        assessment: {
          autoSaveEnabled: true,
          lastSyncAt: 99,
          totalScore: 27, // sensitive — must be dropped on restore
          answers: [{ q: 9, value: 3 }], // sensitive — must be dropped on restore
        },
      },
    };
    getBackup.mockResolvedValue({ encrypted_data: encryptedData, checksum: `CHK_${encryptedData}` });
    decryptData.mockResolvedValue(JSON.stringify(backupData));

    const result = await cloudBackupService.restoreFromBackup();

    expect(result.success).toBe(true);
    expect(assessmentSetState).toHaveBeenCalledTimes(1);
    const restored = assessmentSetState.mock.calls[0][0];
    expect(restored).toEqual({ autoSaveEnabled: true, lastSyncAt: 99 });
    expect(restored).not.toHaveProperty('totalScore');
    expect(restored).not.toHaveProperty('answers');
  });
});
