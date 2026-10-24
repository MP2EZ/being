/**
 * FEAT-860 — the privacy-policy acknowledgement's storage lifecycle.
 *
 * `privacy_policy_ack_v1` is account-scoped: it records that THIS person saw the policy,
 * so it must not outlive the account. It is written by `recordLegalGateConsents`, deleted
 * by `resetConsent`, deleted by an account-deletion wipe (`ACCOUNT_ERASURE_SECURE_STORE_KEYS`)
 * and swept by `retireErasedRecords` on a shipped install erased before this key existed.
 * It is NOT in `ERASURE_EXCLUDED_SECURE_STORE_KEYS` or the survivor manifest —
 * `erasureSurvivorManifest.privacy.test.ts` stays green with no new row.
 *
 * Real SecureStorageService over in-memory maps (harness shape of
 * postErasureConsentHistory.privacy.test.ts). `.privacy.` so the Safety + privacy gates
 * CI job runs it.
 */
const mockAsync = new Map<string, string>();
const mockSecure = new Map<string, string>();
let mockFailSetKey: string | null = null;

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
    if (mockFailSetKey === k) throw new Error('keychain fault');
    mockSecure.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockSecure.delete(k);
  }),
}));
jest.mock('react-native-aes-crypto', () => require('../helpers/mockEncryption').createAesCryptoMock());
jest.mock('expo-crypto', () => require('../helpers/mockEncryption').createExpoCryptoMock());

import SecureStorageService, {
  ACCOUNT_DELETION_ATTESTATION_KEY,
  ACCOUNT_ERASURE_SECURE_STORE_KEYS,
  ERASURE_EXCLUDED_SECURE_STORE_KEYS,
} from '@/core/services/security/SecureStorageService';
import EncryptionService from '@/core/services/security/EncryptionService';
import {
  recordLegalGateConsents,
  retireErasedRecords,
  useConsentStore,
} from '@/core/stores/consentStore';
import { PRIVACY_POLICY_ACK_KEY } from '@/features/consent/services/policyAck';
import { getPolicyRevisions } from '@/features/consent/services/policyRevisions';

const T0 = 1_790_000_000_000;
const ATTESTED = T0 + 1_000;

const GATE = {
  tosAccepted: true,
  privacyAccepted: true,
  wellnessDisclaimerAcknowledged: true,
  mentalHealthProcessingConsent: true,
};
const ack = (acknowledgedAt: number) =>
  JSON.stringify({ version: '1.29', acknowledgedAt, source: 'notice' });
const attestation = (timestamp: number) =>
  JSON.stringify({
    action: 'revoked',
    changes: { cloudSyncEnabled: true },
    timestamp,
    note: 'account_deletion_requested; prior_entries=3',
  });

beforeEach(async () => {
  mockAsync.clear();
  mockSecure.clear();
  mockFailSetKey = null;
  await EncryptionService.deleteMasterKey();
});

describe('the key', () => {
  it('is the privacy_policy_ack_v1 key and an account-erasure key, not an erasure survivor', () => {
    expect(PRIVACY_POLICY_ACK_KEY).toBe('privacy_policy_ack_v1');
    expect(ACCOUNT_ERASURE_SECURE_STORE_KEYS as readonly string[]).toContain(PRIVACY_POLICY_ACK_KEY);
    expect(ERASURE_EXCLUDED_SECURE_STORE_KEYS as readonly string[]).not.toContain(PRIVACY_POLICY_ACK_KEY);
  });
});

describe('recordLegalGateConsents writes the acknowledgement', () => {
  it('at the bundled header version, sourced legal_gate, after the gate record', async () => {
    await recordLegalGateConsents(GATE);

    const stored = JSON.parse(mockSecure.get(PRIVACY_POLICY_ACK_KEY) as string);
    expect(stored.version).toBe(getPolicyRevisions().headerVersion);
    expect(stored.source).toBe('legal_gate');
    expect(typeof stored.acknowledgedAt).toBe('number');
    // The consent schema version is untouched.
    expect(JSON.parse(mockSecure.get('legal_gate_consents_v1') as string).version).toBe('1.1.0');
  });

  it('a failed acknowledgement write never fails the gate write', async () => {
    mockFailSetKey = PRIVACY_POLICY_ACK_KEY;
    await expect(recordLegalGateConsents(GATE)).resolves.toBeUndefined();
    expect(mockSecure.has('legal_gate_consents_v1')).toBe(true);
    expect(mockSecure.has(PRIVACY_POLICY_ACK_KEY)).toBe(false);
  });
});

describe('erasure', () => {
  it('an account-deletion wipe removes the acknowledgement', async () => {
    await recordLegalGateConsents(GATE);
    expect(mockSecure.has(PRIVACY_POLICY_ACK_KEY)).toBe(true);

    await SecureStorageService.clearAllWellnessData({ deleteMasterKey: true });

    expect(mockSecure.has(PRIVACY_POLICY_ACK_KEY)).toBe(false);
  });

  it('a partial clear leaves it alone', async () => {
    await recordLegalGateConsents(GATE);
    await SecureStorageService.clearAllWellnessData();
    expect(mockSecure.has(PRIVACY_POLICY_ACK_KEY)).toBe(true);
  });

  it('resetConsent removes it', async () => {
    await recordLegalGateConsents(GATE);
    await useConsentStore.getState().resetConsent();
    expect(mockSecure.has(PRIVACY_POLICY_ACK_KEY)).toBe(false);
  });
});

describe('retireErasedRecords sweeps a pre-erasure acknowledgement', () => {
  it('deletes one acknowledged before the attestation', async () => {
    mockSecure.set(ACCOUNT_DELETION_ATTESTATION_KEY, attestation(ATTESTED));
    mockSecure.set(PRIVACY_POLICY_ACK_KEY, ack(T0));

    await retireErasedRecords();

    expect(mockSecure.has(PRIVACY_POLICY_ACK_KEY)).toBe(false);
    expect(mockSecure.has(ACCOUNT_DELETION_ATTESTATION_KEY)).toBe(true);
  });

  it('keeps one acknowledged after the attestation (the next subject\'s own)', async () => {
    mockSecure.set(ACCOUNT_DELETION_ATTESTATION_KEY, attestation(ATTESTED));
    mockSecure.set(PRIVACY_POLICY_ACK_KEY, ack(ATTESTED + 100));

    await retireErasedRecords();

    expect(mockSecure.has(PRIVACY_POLICY_ACK_KEY)).toBe(true);
  });

  it('does nothing without an attestation', async () => {
    mockSecure.set(PRIVACY_POLICY_ACK_KEY, ack(T0));
    await retireErasedRecords();
    expect(mockSecure.has(PRIVACY_POLICY_ACK_KEY)).toBe(true);
  });
});
