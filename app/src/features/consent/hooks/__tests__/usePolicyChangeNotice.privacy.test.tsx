/**
 * FEAT-860 — the show predicate of the policy-change notice.
 *
 *   consentStatus === 'valid' AND onboarding complete AND a legal-gate record exists
 *   AND (acknowledgement absent OR acknowledged version < latest material version)
 *
 * Real consentStore reads and real policy parse; only storage and the settings store are
 * faked. Pending versions are asserted against the parsed bundled policy, so this holds
 * when a new material revision lands.
 */
const mockSecure = new Map<string, string>();
let mockGetFails = false;
const mockSettings: { settings: { onboardingCompleted: boolean } | null } = {
  settings: { onboardingCompleted: true },
};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => {
    if (mockGetFails) throw new Error('keychain locked');
    return mockSecure.get(k) ?? null;
  }),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockSecure.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockSecure.delete(k);
  }),
}));
jest.mock('@/core/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: typeof mockSettings) => unknown) => selector(mockSettings),
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useConsentStore } from '@/core/stores/consentStore';
import { compareVersions, getPolicyRevisions } from '../../services/policyRevisions';
import { PRIVACY_POLICY_ACK_KEY } from '../../services/policyAck';
import { usePolicyChangeNotice } from '../usePolicyChangeNotice';

const GATE = JSON.stringify({
  tosAccepted: true,
  privacyAccepted: true,
  wellnessDisclaimerAcknowledged: true,
  mentalHealthProcessingConsent: true,
  timestamp: 1_790_000_000_000,
  version: '1.1.0',
});
const ackAt = (version: string) =>
  JSON.stringify({ version, acknowledgedAt: 1_790_000_000_001, source: 'notice' });

const { materialVersions, latestMaterialVersion } = getPolicyRevisions();

const settle = () => act(async () => { await new Promise<void>((r) => setImmediate(r)); });

async function pendingFor(): Promise<string[]> {
  const { result } = renderHook(() => usePolicyChangeNotice());
  await settle();
  return result.current.pendingVersions;
}

beforeEach(() => {
  mockSecure.clear();
  mockGetFails = false;
  mockSettings.settings = { onboardingCompleted: true };
  mockSecure.set('legal_gate_consents_v1', GATE);
  useConsentStore.setState({ consentStatus: 'valid' });
});

describe('usePolicyChangeNotice', () => {
  it('shows every material revision when there is no acknowledgement', async () => {
    expect(await pendingFor()).toEqual(materialVersions);
    expect(materialVersions).toEqual(expect.arrayContaining(['1.24', '1.25', '1.29']));
  });

  it('shows only the revisions newer than the acknowledged version', async () => {
    mockSecure.set(PRIVACY_POLICY_ACK_KEY, ackAt('1.25'));
    const pending = await pendingFor();
    expect(pending).toEqual(materialVersions.filter((v) => compareVersions(v, '1.25') > 0));
    expect(pending).toContain('1.29');
    expect(pending).not.toContain('1.24');
    expect(pending).not.toContain('1.25');
  });

  it('shows nothing once acknowledged at or above the latest material version', async () => {
    mockSecure.set(PRIVACY_POLICY_ACK_KEY, ackAt(latestMaterialVersion as string));
    expect(await pendingFor()).toEqual([]);
  });

  it('shows nothing when the header is newer only through non-material revisions (AC3)', async () => {
    // Acknowledged at the latest MATERIAL version while the document has since moved to a
    // higher header through non-material revisions: still nothing to show.
    mockSecure.set(PRIVACY_POLICY_ACK_KEY, ackAt(latestMaterialVersion as string));
    expect(await pendingFor()).toEqual([]);
    expect(getPolicyRevisions().materialVersions).not.toContain('1.26');
  });

  it('compares numerically: an acknowledgement at 1.9 still has 1.24 pending', async () => {
    mockSecure.set(PRIVACY_POLICY_ACK_KEY, ackAt('1.9'));
    expect(await pendingFor()).toEqual(materialVersions);
  });

  it.each(['missing', 'loading', 'version_mismatch', 'revoked', 'integrity_error', 'declined'] as const)(
    'shows nothing when consentStatus is %s',
    async (status) => {
      useConsentStore.setState({ consentStatus: status });
      expect(await pendingFor()).toEqual([]);
    },
  );

  it('shows nothing before onboarding is complete', async () => {
    mockSettings.settings = { onboardingCompleted: false };
    expect(await pendingFor()).toEqual([]);
    mockSettings.settings = null;
    expect(await pendingFor()).toEqual([]);
  });

  it('shows nothing without a legal-gate record', async () => {
    mockSecure.delete('legal_gate_consents_v1');
    expect(await pendingFor()).toEqual([]);
  });

  it('hides for this launch, without throwing, when storage rejects', async () => {
    mockGetFails = true;
    expect(await pendingFor()).toEqual([]);
  });

  it('hides when only the acknowledgement read fails', async () => {
    const { getItemAsync } = jest.requireMock('expo-secure-store');
    getItemAsync.mockImplementation(async (k: string) => {
      if (k === PRIVACY_POLICY_ACK_KEY) throw new Error('keychain locked');
      return mockSecure.get(k) ?? null;
    });
    try {
      expect(await pendingFor()).toEqual([]);
    } finally {
      getItemAsync.mockImplementation(async (k: string) => {
        if (mockGetFails) throw new Error('keychain locked');
        return mockSecure.get(k) ?? null;
      });
    }
  });

  it('a corrupt acknowledgement counts as absent', async () => {
    mockSecure.set(PRIVACY_POLICY_ACK_KEY, '{not json');
    expect(await pendingFor()).toEqual(materialVersions);
  });

  describe('acknowledge', () => {
    it('writes a notice-sourced acknowledgement and clears the pending list', async () => {
      const { result } = renderHook(() => usePolicyChangeNotice());
      await settle();
      expect(result.current.pendingVersions.length).toBeGreaterThan(0);

      await act(async () => {
        await result.current.acknowledge();
      });

      expect(result.current.pendingVersions).toEqual([]);
      const stored = JSON.parse(mockSecure.get(PRIVACY_POLICY_ACK_KEY) as string);
      expect(stored).toMatchObject({ version: getPolicyRevisions().headerVersion, source: 'notice' });
    });

    it('writes nothing on mount or while the notice is merely shown', async () => {
      await pendingFor();
      expect(mockSecure.has(PRIVACY_POLICY_ACK_KEY)).toBe(false);
    });

    it('does not throw when the write fails, and hides for this launch', async () => {
      const { setItemAsync } = jest.requireMock('expo-secure-store');
      const { result } = renderHook(() => usePolicyChangeNotice());
      await settle();
      setItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
      await act(async () => {
        await expect(result.current.acknowledge()).resolves.toBeUndefined();
      });
      expect(result.current.pendingVersions).toEqual([]);
      expect(mockSecure.has(PRIVACY_POLICY_ACK_KEY)).toBe(false);
    });
  });
});
