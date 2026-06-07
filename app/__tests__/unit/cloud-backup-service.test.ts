/**
 * cloud-backup-service.test.ts — CloudBackupService unit coverage (MAINT-193).
 *
 * Re-authored from the orphaned src/core/services/supabase/__tests__/
 * CloudBackupService.test.ts, which loaded 0 of its cases because (a) it
 * mocked a stale `flows/assessment` import path that maps to nothing and
 * (b) its location matched no CI `--testPathPattern` keyword, so no gate
 * ever ran it. This file lives under __tests__/unit/ so the `test:unit`
 * CI gate executes it.
 *
 * SCOPE — what these tests pin:
 *  - The MAINT-117 strict allowlist: only `autoSaveEnabled` + `lastSyncAt`
 *    leave the device; all wellness data (PHQ-9/GAD-7 responses, scores,
 *    crisis indicators) is excluded on BOTH backup and restore.
 *  - The wellness-data size circuit-breaker (aborts a backup whose payload
 *    exceeds the safe maximum).
 *  - Backup mechanics (collect → hash → encrypt → checksum → upload),
 *    restore mechanics (integrity → decrypt → validate → allowlist-restore),
 *    status, and configuration persistence.
 *
 * OUT OF SCOPE — the cloud_sync consent gate contract (absent → no egress,
 * present → proceeds) is owned by cloud-backup-consent.test.ts (MAINT-173).
 * Here, consent is granted only as a PRECONDITION so the mechanics can run;
 * do not re-assert the gate. Deleting that file is NOT covered by this one.
 */
import { jest } from '@jest/globals';

// Mock fns live inside the factories (not module-scope consts) because ES
// `import` hoisting runs the factory before module-scope consts initialize.
jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: { getState: jest.fn(() => ({ canPerformOperation: jest.fn() })) },
}));

jest.mock('@/core/services/supabase/SupabaseService', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(async () => undefined),
    saveBackup: jest.fn(async () => true),
    getBackup: jest.fn(async () => null),
    trackEvent: jest.fn(async () => undefined),
  },
}));

jest.mock('@/core/services/security/EncryptionService', () => ({
  __esModule: true,
  default: {
    encryptData: jest.fn(async () => ({ ciphertext: 'c', iv: 'i', tag: 't' })),
    decryptData: jest.fn(async () => '{}'),
  },
}));

jest.mock('@/features/assessment/stores/assessmentStore', () => ({
  useAssessmentStore: {
    getState: jest.fn(() => ({ autoSaveEnabled: true, lastSyncAt: null })),
    setState: jest.fn(),
    subscribe: jest.fn(),
  },
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(async () => 'deterministic_hash'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined) },
}));

// `new Blob([...]).size` is used for backup sizing; the Node test env lacks Blob.
if (typeof (global as { Blob?: unknown }).Blob === 'undefined') {
  (global as { Blob?: unknown }).Blob = class {
    size: number;
    constructor(parts: string[]) {
      this.size = parts.join('').length;
    }
  };
}

import cloudBackupService from '@/core/services/supabase/CloudBackupService';
import supabaseService from '@/core/services/supabase/SupabaseService';
import EncryptionService from '@/core/services/security/EncryptionService';
import { useConsentStore } from '@/core/stores/consentStore';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockSupabase = supabaseService as unknown as {
  initialize: jest.Mock;
  saveBackup: jest.Mock;
  getBackup: jest.Mock;
  trackEvent: jest.Mock;
};
const mockEncryption = EncryptionService as unknown as {
  encryptData: jest.Mock;
  decryptData: jest.Mock;
};
const mockAssessment = useAssessmentStore as unknown as {
  getState: jest.Mock;
  setState: jest.Mock;
  subscribe: jest.Mock;
};
const mockAsyncStorage = AsyncStorage as unknown as { getItem: jest.Mock; setItem: jest.Mock };
const mockDigest = Crypto.digestStringAsync as jest.Mock;
const mockCanPerformOperation = jest.fn<(op: string) => boolean>();

// The two-field allowlist the service is allowed to back up (MAINT-117).
const ALLOWLIST_STATE = { autoSaveEnabled: true, lastSyncAt: 1700000000000 };

// Wellness-data fields that MUST NEVER appear in a backup payload or be
// written back on restore. Mirrors SENSITIVE_FIELDS_EXCLUDED in the service.
const EXCLUDED_WELLNESS_FIELDS = [
  'responses',
  'currentAssessment',
  'completedAssessments',
  'currentResult',
  'crisisDetection',
  'crisisIntervention',
  'answers',
];

describe('CloudBackupService (MAINT-193)', () => {
  // `any` keeps the test free of the service's private-member visibility so
  // it can exercise collectStoreData / validateBackupStructure directly.
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Consent granted is a PRECONDITION for the mechanics tests — the gate
    // contract itself is owned by cloud-backup-consent.test.ts (MAINT-173).
    mockCanPerformOperation.mockReturnValue(true);
    (useConsentStore.getState as jest.Mock).mockReturnValue({
      canPerformOperation: mockCanPerformOperation,
    });

    mockAssessment.getState.mockReturnValue({ ...ALLOWLIST_STATE });
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockSupabase.initialize.mockResolvedValue(undefined);
    mockSupabase.saveBackup.mockResolvedValue(true);
    mockSupabase.getBackup.mockResolvedValue(null);
    mockSupabase.trackEvent.mockResolvedValue(undefined);
    mockEncryption.encryptData.mockResolvedValue({ ciphertext: 'c', iv: 'i', tag: 't' });
    mockEncryption.decryptData.mockResolvedValue('{}');
    mockDigest.mockResolvedValue('deterministic_hash');

    // Fresh instance per test — the module default export is a singleton, so
    // reusing it would leak isInitialized / lastBackupHash across tests.
    service = new (cloudBackupService as any).constructor();
  });

  describe('Initialization', () => {
    it('initializes its dependencies and marks itself ready', async () => {
      await service.initialize();

      expect(service.isInitialized).toBe(true);
      expect(mockSupabase.initialize).toHaveBeenCalled();
    });

    it('loads persisted configuration from storage', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ autoBackupEnabled: false, compressionEnabled: false })
      );

      await service.initialize();

      expect(service.getConfig().autoBackupEnabled).toBe(false);
      expect(service.getConfig().compressionEnabled).toBe(false);
    });

    it('subscribes to the assessment store for change-triggered backups', async () => {
      await service.initialize();

      expect(mockAssessment.subscribe).toHaveBeenCalled();
    });
  });

  describe('Allowlist filtering (MAINT-117 wellness-data protection)', () => {
    it('backs up ONLY the non-sensitive allowlist fields, excluding wellness data', async () => {
      // The store returns a full, realistic state including raw assessment
      // answers, scores, and crisis indicators. None of it may be backed up.
      mockAssessment.getState.mockReturnValue({
        autoSaveEnabled: false,
        lastSyncAt: 1700000000000,
        responses: [1, 2, 1, 0, 2, 1, 1, 0, 0],
        currentAssessment: 'PHQ9',
        completedAssessments: [{ totalScore: 18, severity: 'moderately-severe' }],
        currentResult: { totalScore: 18, severity: 'moderately-severe' },
        crisisDetection: { isCrisis: true },
        crisisIntervention: { triggered: true },
        answers: [1, 2, 1, 0, 2, 1, 1, 0, 0],
      });

      const backup = await service.collectStoreData();

      // Exact-equality (toEqual, not toMatchObject) so any extra key fails.
      expect(backup.stores.assessment).toEqual({
        autoSaveEnabled: false,
        lastSyncAt: 1700000000000,
      });

      // Independent second failure mode: each excluded field is absent.
      for (const field of EXCLUDED_WELLNESS_FIELDS) {
        expect(backup.stores.assessment).not.toHaveProperty(field);
      }

      expect(backup.version).toBe(1);
      expect(backup.metadata).toEqual({ platform: 'react-native' });
    });

    it('aborts the backup via the size circuit-breaker when the payload is too large', async () => {
      // Simulate a regression that widens an allowlisted field beyond its
      // expected tiny size (config-only backups are ~150 bytes). The service
      // must abort rather than risk transmitting an oversized — potentially
      // wellness-data-bearing — payload to the cloud.
      mockAssessment.getState.mockReturnValue({
        autoSaveEnabled: true,
        lastSyncAt: 'x'.repeat(600) as unknown as number,
      });

      await expect(service.collectStoreData()).rejects.toThrow(/Backup size validation failed/);
    });
  });

  describe('Backup creation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('collects, encrypts, and uploads a backup', async () => {
      const result = await service.createBackup();

      expect(result.success).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(mockEncryption.encryptData).toHaveBeenCalled();
      expect(mockSupabase.saveBackup).toHaveBeenCalled();
    });

    it('tracks a completion event with size and duration metadata', async () => {
      await service.createBackup();

      expect(mockSupabase.trackEvent).toHaveBeenCalledWith(
        'backup_completed',
        expect.objectContaining({
          size_mb: expect.any(Number),
          duration_ms: expect.any(Number),
        })
      );
    });

    it('reports failure when the cloud upload is rejected', async () => {
      mockSupabase.saveBackup.mockResolvedValueOnce(false);

      const result = await service.createBackup();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('skips re-upload when the data is unchanged since the last backup', async () => {
      await service.createBackup(); // first backup records the data hash
      const result = await service.createBackup(); // identical data → no-op

      expect(result.success).toBe(true);
      expect(mockEncryption.encryptData).toHaveBeenCalledTimes(1);
    });

    it('surfaces encryption failures', async () => {
      mockEncryption.encryptData.mockRejectedValueOnce(new Error('Encryption failed'));

      const result = await service.createBackup();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Encryption failed');
    });

    it('tracks a failure event when the upload throws', async () => {
      mockSupabase.saveBackup.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.createBackup();

      expect(result.success).toBe(false);
      expect(mockSupabase.trackEvent).toHaveBeenCalledWith(
        'backup_failed',
        expect.objectContaining({ error_type: 'Error' })
      );
    });
  });

  describe('Restore (allowlist re-applied on the way back in)', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('restores ONLY allowlist fields from a legacy backup that still contains wellness data', async () => {
      // A legacy cloud backup that predates the allowlist and still carries
      // raw assessment data. Restore must drop everything but the two safe
      // fields — otherwise a regression could rehydrate wellness data.
      const legacyDecrypted = JSON.stringify({
        version: 1,
        timestamp: 1700000000000,
        stores: {
          assessment: {
            autoSaveEnabled: false,
            lastSyncAt: 1699999999999,
            responses: [1, 2, 3, 2, 1, 0, 1],
            currentAssessment: 'GAD7',
          },
        },
      });

      mockSupabase.getBackup.mockResolvedValueOnce({
        encrypted_data: JSON.stringify({ ciphertext: 'c', iv: 'i', tag: 't' }),
        checksum: 'deterministic_hash', // matches the mocked digest → integrity passes
        created_at: '2024-01-01T12:00:00Z',
      });
      mockEncryption.decryptData.mockResolvedValueOnce(legacyDecrypted);

      const result = await service.restoreFromBackup();

      expect(result.success).toBe(true);
      expect(mockAssessment.setState).toHaveBeenCalledTimes(1);

      const restoredArg = mockAssessment.setState.mock.calls[0][0];
      expect(restoredArg).toEqual({ autoSaveEnabled: false, lastSyncAt: 1699999999999 });
      expect(restoredArg).not.toHaveProperty('responses');
      expect(restoredArg).not.toHaveProperty('currentAssessment');
      expect(
        result.restoredStores.some((s: string) => s.includes('assessment (config only'))
      ).toBe(true);
    });

    it('reports failure when no backup exists', async () => {
      mockSupabase.getBackup.mockResolvedValueOnce(null);

      const result = await service.restoreFromBackup();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No backup found');
    });

    it('fails the integrity check when the checksum does not match', async () => {
      mockSupabase.getBackup.mockResolvedValueOnce({
        encrypted_data: JSON.stringify({ ciphertext: 'c' }),
        checksum: 'a-different-checksum',
      });

      const result = await service.restoreFromBackup();

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('integrity check failed');
    });

    it('rejects a structurally invalid backup', async () => {
      mockSupabase.getBackup.mockResolvedValueOnce({
        encrypted_data: JSON.stringify({ ciphertext: 'c' }),
        checksum: 'deterministic_hash',
      });
      mockEncryption.decryptData.mockResolvedValueOnce(
        JSON.stringify({ version: 'not-a-number', stores: 'not-an-object' })
      );

      const result = await service.restoreFromBackup();

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Invalid backup structure');
    });
  });

  describe('Backup status', () => {
    it('reports whether a cloud backup exists', async () => {
      mockSupabase.getBackup.mockResolvedValueOnce({ id: 'backup_123', created_at: '2024-01-01' });
      expect(await service.hasCloudBackup()).toBe(true);

      mockSupabase.getBackup.mockResolvedValueOnce(null);
      expect(await service.hasCloudBackup()).toBe(false);
    });

    it('reports comprehensive status and flags needsBackup when local data changed', async () => {
      mockSupabase.getBackup.mockResolvedValueOnce({ created_at: '2024-01-01T12:00:00Z' });
      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ timestamp: 1699990000000, hash: 'an-old-hash' })
      );
      // Current data hash ('deterministic_hash') differs from the stored hash.

      const status = await service.getBackupStatus();

      expect(status.hasCloudBackup).toBe(true);
      expect(status.hasLocalData).toBe(true);
      expect(status.lastBackupTime).toBe(1699990000000);
      expect(status.cloudBackupTime).toBe(new Date('2024-01-01T12:00:00Z').getTime());
      expect(status.needsBackup).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('persists updated configuration to storage', async () => {
      await service.updateConfig({ autoBackupEnabled: false, compressionEnabled: true });

      expect(service.getConfig().autoBackupEnabled).toBe(false);
      expect(service.getConfig().compressionEnabled).toBe(true);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@being/cloud_backup/config',
        JSON.stringify(service.getConfig())
      );
    });

    it('returns a defensive copy of the current configuration', () => {
      const config = service.getConfig();

      expect(config).toEqual(
        expect.objectContaining({
          autoBackupEnabled: expect.any(Boolean),
          autoBackupIntervalMs: expect.any(Number),
          maxBackupSizeMB: expect.any(Number),
          compressionEnabled: expect.any(Boolean),
          integrityCheckEnabled: expect.any(Boolean),
        })
      );
      // A fresh object each call — callers can't mutate internal config.
      expect(service.getConfig()).not.toBe(service.getConfig());
    });
  });

  describe('Validation and cleanup', () => {
    it('validates backup structure correctly', () => {
      expect(service.validateBackupStructure({ version: 1, timestamp: 1, stores: {} })).toBe(true);
      expect(service.validateBackupStructure({ version: 'invalid', stores: 'not-object' })).toBe(false);
    });

    it('performs a final backup and tears down on cleanup', async () => {
      await service.initialize();
      const createBackupSpy = jest.spyOn(service, 'createBackup').mockResolvedValue({ success: true });

      await service.cleanup();

      expect(createBackupSpy).toHaveBeenCalledTimes(1);
      expect(service.isInitialized).toBe(false);
    });
  });
});
