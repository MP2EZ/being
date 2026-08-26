/**
 * AccountDeletionService — erasure ordering invariant (FEAT-267).
 *
 * The data-subject erasure flow has ONE non-negotiable ordering rule
 * (compliance + crisis sign-off): the server-side account must be erased
 * BEFORE any local data is touched. A failed server delete must NOT wipe local
 * data — the user can retry with their data intact. These tests pin that rule.
 *
 * DEBUG-539 added a third step between the attestation and the wipe: the
 * analytics identity reset. Its position is load-bearing in BOTH directions —
 * after the server delete (a failed one aborts with local state untouched) and
 * before the wipe (so a wipe failure cannot strand a still-linked identity).
 */

import { deleteAccountAndWipe } from '../AccountDeletionService';
import supabaseService from '@/core/services/supabase/SupabaseService';
import SecureStorageService from '@/core/services/security/SecureStorageService';
import { useConsentStore } from '@/core/stores/consentStore';
import { resetAnalyticsIdentity } from '@/core/analytics/analyticsIdentityReset';

jest.mock('@/core/analytics/analyticsIdentityReset', () => ({
  resetAnalyticsIdentity: jest.fn(),
}));

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
const mockResetAnalyticsIdentity = resetAnalyticsIdentity as jest.Mock;

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

    const result = await deleteAccountAndWipe({ posthog: null });

    expect(result).toEqual({ ok: false, retryable: true });
    expect(mockClearAllWellnessData).not.toHaveBeenCalled();
    expect(mockRecordAttestation).not.toHaveBeenCalled();
  });

  it('on server success, wipes local data with deleteMasterKey:true and returns ok', async () => {
    mockDeleteAccount.mockResolvedValue(true);

    const result = await deleteAccountAndWipe({ posthog: null });

    expect(result).toEqual({ ok: true });
    expect(mockClearAllWellnessData).toHaveBeenCalledTimes(1);
    expect(mockClearAllWellnessData).toHaveBeenCalledWith({ deleteMasterKey: true });
  });

  it('records the audit attestation BEFORE the wipe, and both AFTER the server delete', async () => {
    mockDeleteAccount.mockResolvedValue(true);

    await deleteAccountAndWipe({ posthog: null });

    const serverOrder = mockDeleteAccount.mock.invocationCallOrder[0];
    const attestationOrder = mockRecordAttestation.mock.invocationCallOrder[0];
    const wipeOrder = mockClearAllWellnessData.mock.invocationCallOrder[0];

    expect(serverOrder).toBeLessThan(attestationOrder);
    expect(attestationOrder).toBeLessThan(wipeOrder);
  });

  it('still completes the wipe if the attestation write fails (best-effort audit)', async () => {
    mockDeleteAccount.mockResolvedValue(true);
    mockRecordAttestation.mockRejectedValue(new Error('secure-store unavailable'));

    const result = await deleteAccountAndWipe({ posthog: null });

    expect(result).toEqual({ ok: true });
    expect(mockClearAllWellnessData).toHaveBeenCalledWith({ deleteMasterKey: true });
  });

  it('does not re-call the server delete when the local wipe throws (no retry loop)', async () => {
    mockDeleteAccount.mockResolvedValue(true);
    mockClearAllWellnessData.mockRejectedValue(new Error('wipe failed mid-flight'));

    await expect(deleteAccountAndWipe({ posthog: null })).rejects.toThrow(/wipe failed/);
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
  });

  it('DEBUG-539: resets the analytics identity AFTER the attestation and BEFORE the wipe', async () => {
    mockDeleteAccount.mockResolvedValue(true);

    await deleteAccountAndWipe({ posthog: null });

    // invocationCallOrder is monotonic across mocks, so this pins the actual
    // sequence rather than merely asserting each step happened.
    const serverOrder = mockDeleteAccount.mock.invocationCallOrder[0];
    const attestOrder = mockRecordAttestation.mock.invocationCallOrder[0];
    const resetOrder = mockResetAnalyticsIdentity.mock.invocationCallOrder[0];
    const wipeOrder = mockClearAllWellnessData.mock.invocationCallOrder[0];

    expect(serverOrder).toBeLessThan(attestOrder);
    expect(attestOrder).toBeLessThan(resetOrder);
    expect(resetOrder).toBeLessThan(wipeOrder);
  });

  it('DEBUG-539: forwards the caller-supplied client rather than inventing one', async () => {
    mockDeleteAccount.mockResolvedValue(true);
    const client = { reset: jest.fn(), setPersistedProperty: jest.fn() };

    await deleteAccountAndWipe({ posthog: client });

    expect(mockResetAnalyticsIdentity).toHaveBeenCalledWith({ posthog: client });
  });

  it('DEBUG-539: a failed reset does NOT gate the wipe', async () => {
    // Best-effort, mirroring the attestation above. An erasure that stops because
    // analytics could not be reset would leave the full local wellness store on a
    // device whose server account is already gone — strictly worse than the bug.
    mockDeleteAccount.mockResolvedValue(true);
    mockResetAnalyticsIdentity.mockImplementationOnce(() => {
      throw new Error('posthog exploded');
    });

    const result = await deleteAccountAndWipe({ posthog: null });

    expect(mockClearAllWellnessData).toHaveBeenCalledWith({ deleteMasterKey: true });
    expect(result).toEqual({ ok: true });
  });

  it('DEBUG-539: does NOT reset when the server delete failed', async () => {
    // Nothing local may be touched on the abort path, and the analytics identity
    // is local state like any other.
    mockDeleteAccount.mockResolvedValue(false);

    await deleteAccountAndWipe({ posthog: null });

    expect(mockResetAnalyticsIdentity).not.toHaveBeenCalled();
  });
});
