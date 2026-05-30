/**
 * cloud-backup-consent.test.ts — MAINT-173 service-layer consent gate.
 *
 * CloudBackupService.createBackup() is the single chokepoint every backup
 * path routes through (manual, auto-backup timer, store listener, app-state
 * listener). These tests pin that it short-circuits when cloud_sync consent
 * is absent and proceeds when present — the contract that makes the
 * "Settings Backup" toggle in PrivacyDataScreen actually control backups.
 */
import { jest } from '@jest/globals';

// Mock fns live inside factories (not module-scope consts) because ES `import`
// hoisting runs the factory before module-scope consts initialize.
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
  default: { encryptData: jest.fn(async () => ({ ciphertext: 'x', iv: 'y', tag: 'z' })) },
}));

jest.mock('@/features/assessment/stores/assessmentStore', () => ({
  useAssessmentStore: {
    getState: () => ({ autoSaveEnabled: true, lastSyncAt: '2026-01-01T00:00:00Z' }),
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

// `new Blob([...]).size` is used for backup sizing; Node test env lacks Blob.
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
import { useConsentStore } from '@/core/stores/consentStore';

const mockSaveBackup = supabaseService.saveBackup as jest.Mock;
const mockCanPerformOperation = jest.fn<(op: string) => boolean>();

describe('CloudBackupService — cloud_sync consent gate (MAINT-173)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Route the consent store through our controllable mock.
    (useConsentStore.getState as jest.Mock).mockReturnValue({
      canPerformOperation: mockCanPerformOperation,
    });
    // Reach the consent gate without running initialize()'s timers/listeners.
    (cloudBackupService as unknown as { isInitialized: boolean }).isInitialized = true;
    // Force "changed data" so createBackup doesn't no-op as unchanged.
    (cloudBackupService as unknown as { lastBackupHash?: string }).lastBackupHash = undefined;
    // Skip the compression branch — not under test here.
    (cloudBackupService as unknown as { config: { compressionEnabled: boolean } }).config.compressionEnabled = false;
  });

  it('skips backup (no egress) when cloud_sync consent is absent', async () => {
    mockCanPerformOperation.mockReturnValue(false);

    const result = await cloudBackupService.createBackup();

    expect(mockCanPerformOperation).toHaveBeenCalledWith('cloud_sync');
    expect(result.success).toBe(false);
    expect(result.error).toBe('cloud_sync_consent_absent');
    // The decisive assertion: nothing was uploaded.
    expect(mockSaveBackup).not.toHaveBeenCalled();
  });

  it('proceeds with backup when cloud_sync consent is present', async () => {
    mockCanPerformOperation.mockReturnValue(true);

    const result = await cloudBackupService.createBackup();

    expect(result.success).toBe(true);
    expect(mockSaveBackup).toHaveBeenCalledTimes(1);
  });
});
