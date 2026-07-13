/**
 * AccountDeletionService — erasure ordering invariant (FEAT-267).
 *
 * The data-subject erasure flow has ONE non-negotiable ordering rule
 * (compliance + crisis sign-off): the server-side account must be erased
 * BEFORE any local data is touched. A failed server delete must NOT wipe local
 * data — the user can retry with their data intact. These tests pin that rule.
 */

import { deleteAccountAndWipe } from '../AccountDeletionService';
import supabaseService from '@/core/services/supabase/SupabaseService';
import SecureStorageService from '@/core/services/security/SecureStorageService';
import { useConsentStore } from '@/core/stores/consentStore';

jest.mock('@/core/services/supabase/SupabaseService', () => ({
  __esModule: true,
  default: { deleteAccount: jest.fn() },
}));

jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: { clearAllWellnessData: jest.fn() },
}));

jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: { getState: jest.fn() },
}));

const mockDeleteAccount = supabaseService.deleteAccount as jest.Mock;
const mockClearAllWellnessData = SecureStorageService.clearAllWellnessData as jest.Mock;
const mockRecordAttestation = jest.fn();

describe('AccountDeletionService — deleteAccountAndWipe ordering invariant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClearAllWellnessData.mockResolvedValue(undefined);
    mockRecordAttestation.mockResolvedValue(undefined);
    (useConsentStore.getState as jest.Mock).mockReturnValue({
      recordAccountDeletionAttestation: mockRecordAttestation,
    });
  });

  it('aborts and reports retryable when the server delete fails — NEVER wipes local data', async () => {
    mockDeleteAccount.mockResolvedValue(false);

    const result = await deleteAccountAndWipe();

    expect(result).toEqual({ ok: false, retryable: true });
    expect(mockClearAllWellnessData).not.toHaveBeenCalled();
    expect(mockRecordAttestation).not.toHaveBeenCalled();
  });

  it('on server success, wipes local data with deleteMasterKey:true and returns ok', async () => {
    mockDeleteAccount.mockResolvedValue(true);

    const result = await deleteAccountAndWipe();

    expect(result).toEqual({ ok: true });
    expect(mockClearAllWellnessData).toHaveBeenCalledTimes(1);
    expect(mockClearAllWellnessData).toHaveBeenCalledWith({ deleteMasterKey: true });
  });

  it('records the audit attestation BEFORE the wipe, and both AFTER the server delete', async () => {
    mockDeleteAccount.mockResolvedValue(true);

    await deleteAccountAndWipe();

    const serverOrder = mockDeleteAccount.mock.invocationCallOrder[0];
    const attestationOrder = mockRecordAttestation.mock.invocationCallOrder[0];
    const wipeOrder = mockClearAllWellnessData.mock.invocationCallOrder[0];

    expect(serverOrder).toBeLessThan(attestationOrder);
    expect(attestationOrder).toBeLessThan(wipeOrder);
  });

  it('still completes the wipe if the attestation write fails (best-effort audit)', async () => {
    mockDeleteAccount.mockResolvedValue(true);
    mockRecordAttestation.mockRejectedValue(new Error('secure-store unavailable'));

    const result = await deleteAccountAndWipe();

    expect(result).toEqual({ ok: true });
    expect(mockClearAllWellnessData).toHaveBeenCalledWith({ deleteMasterKey: true });
  });

  it('does not re-call the server delete when the local wipe throws (no retry loop)', async () => {
    mockDeleteAccount.mockResolvedValue(true);
    mockClearAllWellnessData.mockRejectedValue(new Error('wipe failed mid-flight'));

    await expect(deleteAccountAndWipe()).rejects.toThrow(/wipe failed/);
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
  });
});
