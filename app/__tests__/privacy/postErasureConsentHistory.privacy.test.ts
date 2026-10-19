/**
 * Account erasure leaves no consent record and no prior-subject consent history for the
 * next person on the device (DEBUG-762, AC1/AC3/AC4).
 *
 * DEBUG-755 RETIRED the deleted account's consent, legal-gate and age records; DEBUG-762
 * deletes them (SecureStorageService.ACCOUNT_ERASURE_SECURE_STORE_KEYS) and closes what
 * retirement could not:
 *
 *  - A SHIPPED install keeps those records on disk. `retireErasedRecords`, fired once from
 *    `loadConsent`, deletes the ones that predate the attestation.
 *  - The attestation also sits in the legacy `consent_history_v1` plaintext key, which the
 *    consent-history migration folds into the encrypted chain: the next subject's history
 *    and DSR export began with the PREVIOUS subject's deletion record. The chain is now
 *    filtered (`excludePriorSubjectEntries`), the legacy copy is stripped once the isolated
 *    attestation key verifies, and the export applies the same filter without writing.
 *
 * WHY NOT consentStore.test.ts: that suite mocks SecureStorageService wholesale, so it
 * cannot reach the migration path that is the mechanism under test. Here the service is the
 * REAL one over in-memory maps (same harness shape as
 * accountDeletionAttestationDurability.privacy.test.ts). Only the cipher is faked.
 * `.privacy.` so the Safety + privacy gates CI job runs it (INFRA-368).
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

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureStorageService, {
  ACCOUNT_DELETION_ATTESTATION_KEY,
} from '@/core/services/security/SecureStorageService';
import EncryptionService from '@/core/services/security/EncryptionService';
import * as logging from '@/core/services/logging';
import {
  excludePriorSubjectEntries,
  retireErasedRecords,
  useConsentStore,
  type ConsentHistoryEntry,
} from '@/core/stores/consentStore';

const LEGACY_KEY = 'consent_history_v1';
const BLOB_KEY = 'consent_history_v1';
const MIGRATION_FLAG = 'being.consent_history_migration_v2';

const T0 = 1_790_000_000_000;
let now = T0;

const PREFS = {
  analyticsEnabled: false,
  crashReportsEnabled: false,
  cloudSyncEnabled: true,
  researchEnabled: false,
  mentalHealthProcessingConsent: true,
};
const AGE = { verified: true, birthYear: 1990, ageAtVerification: 36, isEligible: true };

const attestationAt = (timestamp: number): ConsentHistoryEntry => ({
  action: 'revoked',
  changes: { cloudSyncEnabled: true },
  timestamp,
  note: 'account_deletion_requested; prior_entries=3',
});
const entry = (action: ConsentHistoryEntry['action'], timestamp: number, note?: string): ConsentHistoryEntry => ({
  action,
  changes: {},
  timestamp,
  ...(note ? { note } : {}),
});
const ANNOTATION = 'storage_migration_v2: ciphertext moved to AsyncStorage, encryption boundary preserved';

async function readBlob(): Promise<ConsentHistoryEntry[] | null> {
  return SecureStorageService.retrieveWellnessBlob<ConsentHistoryEntry[]>(BLOB_KEY, undefined, {
    sensitivityLevel: 'level_2_assessment_data',
  });
}
async function writeBlob(chain: ConsentHistoryEntry[]): Promise<void> {
  const result = await SecureStorageService.storeWellnessBlob(BLOB_KEY, chain, 'level_2_assessment_data');
  if (!result.success) throw new Error(`writeBlob failed: ${result.error}`);
}
const isolatedAttestation = (timestamp: number) =>
  mockSecure.set(ACCOUNT_DELETION_ATTESTATION_KEY, JSON.stringify(attestationAt(timestamp)));

/** A consent record in the exact shape grantConsent writes, stamped at `timestamp`. */
function consentRecord(timestamp: number, age: Record<string, unknown> = { ...AGE, verifiedAt: timestamp }) {
  return {
    consentId: `consent_${timestamp}`,
    userId: 'user-x',
    version: '1.1.0',
    preferences: PREFS,
    universalOptOut: false,
    ageVerification: age,
    timestamp,
    updatedAt: timestamp,
    expiresAt: timestamp + 365 * 24 * 60 * 60 * 1000,
    revoked: false,
  };
}

async function settle(): Promise<void> {
  for (let i = 0; i < 40; i += 1) await new Promise<void>((r) => setImmediate(r));
}

beforeEach(async () => {
  mockAsync.clear();
  mockSecure.clear();
  // The cipher singleton caches its master key across tests; the disks above were just
  // emptied, so drop the cache too (the same production op erasure uses) and let the
  // next write provision a fresh key.
  await EncryptionService.deleteMasterKey();
  now = T0;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  useConsentStore.setState({
    consentStatus: 'loading',
    currentConsent: null,
    staleConsent: null,
    consentHistory: [],
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('excludePriorSubjectEntries (pure)', () => {
  const att = attestationAt(1_000);

  it('cuts positionally at the attestation, immune to clock skew', () => {
    // The next subject's grant is stamped EARLIER than the attestation (device clock set back).
    const b1 = entry('granted', 400);
    const b2 = entry('updated', 500);
    expect(excludePriorSubjectEntries([entry('granted', 100), att, b1, b2], 1_000)).toEqual([b1, b2]);
  });

  it('cuts at the LAST attestation when there are several', () => {
    const b1 = entry('granted', 5_000);
    const chain = [entry('granted', 1), attestationAt(1_000), entry('granted', 2), attestationAt(2_000), b1];
    expect(excludePriorSubjectEntries(chain, 2_000)).toEqual([b1]);
  });

  it('drops a storage_migration_v2 annotation that follows the cut, keeps real entries', () => {
    const b1 = entry('granted', 5_000);
    const annotation = entry('updated', 6_000, ANNOTATION);
    expect(excludePriorSubjectEntries([att, annotation, b1], 1_000)).toEqual([b1]);
    expect(excludePriorSubjectEntries([att, b1, annotation], 1_000)).toEqual([b1]);
  });

  it('an annotation BEFORE the cut goes with the cut, and a non-annotation note is kept', () => {
    const note = entry('updated', 5_000, 'user changed analytics');
    expect(excludePriorSubjectEntries([entry('updated', 1, ANNOTATION), att, note], 1_000)).toEqual([note]);
  });

  it('with no attestation entry but a known attestation time, drops entries at or before it', () => {
    const kept = entry('granted', 2_001);
    const chain = [entry('granted', 999), entry('updated', 1_000), kept];
    expect(excludePriorSubjectEntries(chain, 1_000)).toEqual([kept]);
  });

  it('with neither an attestation entry nor an attestation time, returns the chain unchanged', () => {
    const chain = [entry('granted', 1), entry('updated', 2, ANNOTATION)];
    expect(excludePriorSubjectEntries(chain, null)).toEqual(chain);
  });

  it('an attestation entry alone empties the chain; an empty chain stays empty', () => {
    expect(excludePriorSubjectEntries([att], null)).toEqual([]);
    expect(excludePriorSubjectEntries([], 1_000)).toEqual([]);
  });

  it('does not mutate its input', () => {
    const chain = [entry('granted', 1), att, entry('granted', 5_000)];
    const snapshot = JSON.stringify(chain);
    excludePriorSubjectEntries(chain, 1_000);
    expect(JSON.stringify(chain)).toBe(snapshot);
  });
});

describe('the DSR export for the next subject (AC3)', () => {
  /** The disk an erased (post-DEBUG-762) install leaves: attestation in both homes, nothing else. */
  function seedErasedDisk(): void {
    isolatedAttestation(T0 + 1_000);
    mockSecure.set(LEGACY_KEY, JSON.stringify([attestationAt(T0 + 1_000)]));
    now = T0 + 2_000;
  }

  it('is empty before the next subject grants — the legacy attestation is not folded in', async () => {
    seedErasedDisk();
    const exported = await useConsentStore.getState().exportConsentRecords();
    expect(exported.history).toEqual([]);
  });

  it('contains only the next subject\'s own grant after they grant — never the deletion record', async () => {
    seedErasedDisk();
    await useConsentStore.getState().grantConsent(PREFS, { ...AGE, verifiedAt: now });
    const { history } = await useConsentStore.getState().exportConsentRecords();
    expect(history).toHaveLength(1);
    expect(history[0]?.action).toBe('granted');
    expect(JSON.stringify(history)).not.toContain('account_deletion_requested');
  });

  it('after a load (which used to migrate the legacy attestation into the chain) it is still clean', async () => {
    seedErasedDisk();
    await useConsentStore.getState().grantConsent(PREFS, { ...AGE, verifiedAt: now });
    now += 1_000;
    await useConsentStore.getState().loadConsent();
    await settle();
    const { history } = await useConsentStore.getState().exportConsentRecords();
    // (The first load after a grant also appends the INFRA-144 annotation; that is the
    // next subject's own, pre-existing behaviour and is not what is under test.)
    const own = (chain: ConsentHistoryEntry[]) => chain.filter((h) => !(h.note ?? '').startsWith('storage_migration_v2'));
    expect(own(history).map((h) => h.action)).toEqual(['granted']);
    expect(JSON.stringify(history)).not.toContain('account_deletion_requested');
    expect(JSON.stringify(useConsentStore.getState().consentHistory)).not.toContain('account_deletion_requested');
  });

  it('filters a shipped mixed chain in memory and NEVER writes (DEBUG-402 side-effect-free rule)', async () => {
    isolatedAttestation(T0 + 1_000);
    const b1 = entry('granted', T0 + 2_000);
    const b2 = entry('updated', T0 + 3_000);
    await writeBlob([attestationAt(T0 + 1_000), b1, b2]);
    mockSecure.set(LEGACY_KEY, JSON.stringify([attestationAt(T0 + 1_000)]));
    const blobBefore = mockAsync.get(`wellness_async_${BLOB_KEY}`);
    const asyncSnapshot = JSON.stringify([...mockAsync.entries()]);
    const secureSnapshot = JSON.stringify([...mockSecure.entries()]);
    (AsyncStorage.setItem as jest.Mock).mockClear();
    (SecureStore.setItemAsync as jest.Mock).mockClear();
    (SecureStore.deleteItemAsync as jest.Mock).mockClear();

    const { history } = await useConsentStore.getState().exportConsentRecords();

    expect(history).toEqual([b1, b2]);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(mockAsync.get(`wellness_async_${BLOB_KEY}`)).toBe(blobBefore);
    expect(JSON.stringify([...mockAsync.entries()])).toBe(asyncSnapshot);
    expect(JSON.stringify([...mockSecure.entries()])).toBe(secureSnapshot);
    expect(mockAsync.has(MIGRATION_FLAG)).toBe(false);
  });

  it('NEGATIVE CONTROL — with no attestation anywhere the export still migrates-on-read as before', async () => {
    mockSecure.set(LEGACY_KEY, JSON.stringify([entry('granted', T0), entry('updated', T0 + 1)]));
    const { history } = await useConsentStore.getState().exportConsentRecords();
    expect(history.map((h) => h.action)).toEqual(['granted', 'updated']);
  });
});

describe('the shipped mixed chain [attestation, B1, B2] (AC3)', () => {
  async function seedMixedChain(): Promise<{ b1: ConsentHistoryEntry; b2: ConsentHistoryEntry }> {
    const b1 = entry('granted', T0 + 2_000);
    const b2 = entry('updated', T0 + 3_000);
    mockSecure.set('consent_record_v1', JSON.stringify(consentRecord(T0 + 2_000)));
    await writeBlob([attestationAt(T0 + 1_000), b1, b2]);
    mockAsync.set(MIGRATION_FLAG, '1');
    now = T0 + 4_000;
    return { b1, b2 };
  }

  it('is [B1, B2] in memory and on disk after a load (isolated key present)', async () => {
    const { b1, b2 } = await seedMixedChain();
    isolatedAttestation(T0 + 1_000);

    await useConsentStore.getState().loadConsent();

    expect(useConsentStore.getState().consentStatus).toBe('valid');
    expect(useConsentStore.getState().consentHistory).toEqual([b1, b2]);
    expect(await readBlob()).toEqual([b1, b2]);
    expect(mockSecure.get(ACCOUNT_DELETION_ATTESTATION_KEY)).toBe(JSON.stringify(attestationAt(T0 + 1_000)));
  });

  it('recovers the attestation from the chain (arm b) BEFORE filtering it away', async () => {
    const { b1, b2 } = await seedMixedChain();
    expect(mockSecure.has(ACCOUNT_DELETION_ATTESTATION_KEY)).toBe(false);

    await useConsentStore.getState().loadConsent();

    expect(mockSecure.get(ACCOUNT_DELETION_ATTESTATION_KEY)).toBe(JSON.stringify(attestationAt(T0 + 1_000)));
    expect(useConsentStore.getState().consentHistory).toEqual([b1, b2]);
    expect(await readBlob()).toEqual([b1, b2]);
  });

  it('does NOT persist the filtered chain when the attestation cannot be confirmed — the chain copy may be the only one', async () => {
    const { b1, b2 } = await seedMixedChain();
    const original = (SecureStore.setItemAsync as jest.Mock).getMockImplementation()!;
    (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (k: string, v: string) => {
      if (k === ACCOUNT_DELETION_ATTESTATION_KEY) throw new Error('keychain write failed');
      return original(k, v);
    });
    try {
      await useConsentStore.getState().loadConsent();
    } finally {
      (SecureStore.setItemAsync as jest.Mock).mockImplementation(original);
    }

    expect(useConsentStore.getState().consentHistory).toEqual([b1, b2]); // filtered in memory
    expect(await readBlob()).toEqual([attestationAt(T0 + 1_000), b1, b2]); // evidence kept on disk
  });

  it('NEGATIVE CONTROL — with no attestation anywhere an unmigrated chain is left exactly as it was', async () => {
    const chain = [entry('granted', T0 + 2_000), entry('updated', T0 + 3_000)];
    mockSecure.set('consent_record_v1', JSON.stringify(consentRecord(T0 + 2_000)));
    mockSecure.set(LEGACY_KEY, JSON.stringify(chain));
    now = T0 + 4_000;

    await useConsentStore.getState().loadConsent();

    // The ordinary INFRA-144 migration ran (chain + its one annotation) and nothing was filtered.
    const history = useConsentStore.getState().consentHistory;
    expect(history.slice(0, 2)).toEqual(chain);
    expect(history).toHaveLength(3);
    expect(history[2]?.note).toMatch(/^storage_migration_v2/);
    expect(mockSecure.has(ACCOUNT_DELETION_ATTESTATION_KEY)).toBe(false);
  });

  it('NEGATIVE CONTROL — an unmigrated legacy chain is not stripped when no attestation exists', async () => {
    const chain = [entry('granted', T0 + 2_000)];
    mockSecure.set('consent_record_v1', JSON.stringify(consentRecord(T0 + 2_000)));
    await writeBlob([entry('granted', T0 + 2_000)]); // a blob exists, so the legacy key is NOT migrated away
    mockSecure.set(LEGACY_KEY, JSON.stringify(chain));
    mockAsync.set(MIGRATION_FLAG, '1');
    now = T0 + 4_000;

    await useConsentStore.getState().loadConsent();

    expect(mockSecure.get(LEGACY_KEY)).toBe(JSON.stringify(chain));
  });
});

describe('the legacy consent_history_v1 attestation copy (AC3)', () => {
  /** A blob already exists, so the legacy key is NOT migrated away by the read: only the strip can remove it. */
  async function seedValidWithLegacy(legacy: unknown): Promise<void> {
    mockSecure.set('consent_record_v1', JSON.stringify(consentRecord(T0 + 2_000)));
    await writeBlob([entry('granted', T0 + 2_000)]);
    mockAsync.set(MIGRATION_FLAG, '1');
    mockSecure.set(LEGACY_KEY, JSON.stringify(legacy));
    now = T0 + 4_000;
  }

  it('is deleted once the isolated key holds a verified attestation', async () => {
    isolatedAttestation(T0 + 1_000);
    await seedValidWithLegacy([attestationAt(T0 + 1_000)]);
    await useConsentStore.getState().loadConsent();
    expect(mockSecure.has(LEGACY_KEY)).toBe(false);
    expect(mockSecure.has(ACCOUNT_DELETION_ATTESTATION_KEY)).toBe(true);
  });

  it('is kept when the isolated key is CORRUPT and the legacy copy is exactly [attestation] — it is the only evidence', async () => {
    mockSecure.set(ACCOUNT_DELETION_ATTESTATION_KEY, '{not json');
    await seedValidWithLegacy([attestationAt(T0 + 1_000)]);
    await useConsentStore.getState().loadConsent();
    expect(mockSecure.get(LEGACY_KEY)).toBe(JSON.stringify([attestationAt(T0 + 1_000)]));
  });

  it('is kept when the isolated key is ABSENT and cannot be written, and the legacy copy is exactly [attestation]', async () => {
    await seedValidWithLegacy([attestationAt(T0 + 1_000)]);
    const original = (SecureStore.setItemAsync as jest.Mock).getMockImplementation()!;
    (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (k: string, v: string) => {
      if (k === ACCOUNT_DELETION_ATTESTATION_KEY) throw new Error('keychain write failed');
      return original(k, v);
    });
    try {
      await useConsentStore.getState().loadConsent();
    } finally {
      (SecureStore.setItemAsync as jest.Mock).mockImplementation(original);
    }
    expect(mockSecure.has(ACCOUNT_DELETION_ATTESTATION_KEY)).toBe(false);
    expect(mockSecure.get(LEGACY_KEY)).toBe(JSON.stringify([attestationAt(T0 + 1_000)]));
  });

  it('is deleted when the isolated key is unverified and the legacy copy is MORE than the attestation (a prior subject\'s chain)', async () => {
    mockSecure.set(ACCOUNT_DELETION_ATTESTATION_KEY, '{not json');
    await seedValidWithLegacy([entry('granted', T0 - 5_000), attestationAt(T0 + 1_000)]);
    await useConsentStore.getState().loadConsent();
    expect(mockSecure.has(LEGACY_KEY)).toBe(false);
  });
});

describe('a grant after erasure (AC3)', () => {
  it('writes a fresh single-entry chain over a stale one', async () => {
    isolatedAttestation(T0 + 1_000);
    await writeBlob([attestationAt(T0 + 1_000), entry('updated', T0 + 1_500, ANNOTATION)]);
    now = T0 + 2_000;

    await useConsentStore.getState().grantConsent(PREFS, { ...AGE, verifiedAt: now });

    const chain = await readBlob();
    expect(chain).toHaveLength(1);
    expect(chain![0]?.action).toBe('granted');
    expect(useConsentStore.getState().consentHistory).toEqual(chain);
  });
});

describe('retireErasedRecords (AC4)', () => {
  const ATTESTED = T0 + 1_000;

  function seedPreErasureRecords(): void {
    mockSecure.set('consent_record_v1', JSON.stringify(consentRecord(T0)));
    mockSecure.set(
      'legal_gate_consents_v1',
      JSON.stringify({
        tosAccepted: true,
        privacyAccepted: true,
        wellnessDisclaimerAcknowledged: true,
        mentalHealthProcessingConsent: true,
        timestamp: T0,
        version: '1.1.0',
      }),
    );
    mockSecure.set('age_verification_v1', JSON.stringify({ ...AGE, verifiedAt: T0 }));
    mockSecure.set('auth_device_id', 'legacy-anchor');
  }
  const bystanders = () => {
    mockSecure.set('stoic_practice_state', 'cipher');
    mockSecure.set('mental_health_master_key', 'master');
    mockAsync.set('wellness_async_x', 'cipher');
    mockAsync.set('crisis_async_ep', 'cipher');
    mockAsync.set('assessment_async_a', 'cipher');
    mockAsync.set('app_settings_v1', JSON.stringify({ onboardingCompleted: true }));
    mockAsync.set('@being/supabase/crisis_analytics_queue', '[]');
  };
  const expectBystandersIntact = () => {
    expect(mockSecure.get('stoic_practice_state')).toBe('cipher');
    expect(mockSecure.get('mental_health_master_key')).toBe('master');
    expect(mockAsync.get('wellness_async_x')).toBe('cipher');
    expect(mockAsync.get('crisis_async_ep')).toBe('cipher');
    expect(mockAsync.get('assessment_async_a')).toBe('cipher');
    expect(mockAsync.get('app_settings_v1')).toBe(JSON.stringify({ onboardingCompleted: true }));
    expect(mockAsync.get('@being/supabase/crisis_analytics_queue')).toBe('[]');
  };

  it('deletes every record that predates the attestation, plus the device anchor', async () => {
    seedPreErasureRecords();
    bystanders();
    isolatedAttestation(ATTESTED);
    now = ATTESTED + 5_000;

    await retireErasedRecords();

    for (const key of ['consent_record_v1', 'legal_gate_consents_v1', 'age_verification_v1', 'auth_device_id']) {
      expect([key, mockSecure.has(key)]).toEqual([key, false]);
    }
    expect(mockSecure.has(ACCOUNT_DELETION_ATTESTATION_KEY)).toBe(true);
    expectBystandersIntact();
  });

  it('keeps records that post-date the attestation (the next subject\'s own)', async () => {
    isolatedAttestation(ATTESTED);
    mockSecure.set('consent_record_v1', JSON.stringify(consentRecord(ATTESTED + 100)));
    mockSecure.set('age_verification_v1', JSON.stringify({ ...AGE, verifiedAt: ATTESTED + 50 }));
    mockSecure.set(
      'legal_gate_consents_v1',
      JSON.stringify({
        tosAccepted: true,
        privacyAccepted: true,
        wellnessDisclaimerAcknowledged: true,
        mentalHealthProcessingConsent: true,
        timestamp: ATTESTED + 60,
        version: '1.1.0',
      }),
    );

    await retireErasedRecords();

    expect(mockSecure.has('consent_record_v1')).toBe(true);
    expect(mockSecure.has('age_verification_v1')).toBe(true);
    expect(mockSecure.has('legal_gate_consents_v1')).toBe(true);
  });

  it('deletes a record granted AFTER the attestation whose embedded age check predates it (stale age carried over)', async () => {
    isolatedAttestation(ATTESTED);
    mockSecure.set(
      'consent_record_v1',
      JSON.stringify(consentRecord(ATTESTED + 100, { ...AGE, verifiedAt: ATTESTED - 10 })),
    );
    await retireErasedRecords();
    expect(mockSecure.has('consent_record_v1')).toBe(false);
  });

  it('does nothing at all when no attestation exists', async () => {
    seedPreErasureRecords();
    bystanders();
    const before = JSON.stringify([...mockSecure.entries()]);
    await retireErasedRecords();
    expect(JSON.stringify([...mockSecure.entries()])).toBe(before);
  });

  it('is independent per key: one failing delete does not stop the others, and it never rejects', async () => {
    seedPreErasureRecords();
    isolatedAttestation(ATTESTED);
    const original = (SecureStore.deleteItemAsync as jest.Mock).getMockImplementation()!;
    (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async (k: string) => {
      if (k === 'consent_record_v1') throw new Error('keychain locked');
      return original(k);
    });
    try {
      await expect(retireErasedRecords()).resolves.toBeUndefined();
    } finally {
      (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(original);
    }
    expect(mockSecure.has('consent_record_v1')).toBe(true);
    expect(mockSecure.has('legal_gate_consents_v1')).toBe(false);
    expect(mockSecure.has('age_verification_v1')).toBe(false);
    expect(mockSecure.has('auth_device_id')).toBe(false);
  });

  it('never rejects when every SecureStore read throws', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('keychain down'));
    try {
      await expect(retireErasedRecords()).resolves.toBeUndefined();
    } finally {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (k: string) => mockSecure.get(k) ?? null);
    }
  });

  it('logs exactly one low-severity, contents-free line', async () => {
    seedPreErasureRecords();
    isolatedAttestation(ATTESTED);
    const spy = jest.spyOn(logging, 'logSecurity').mockImplementation(() => undefined);
    await retireErasedRecords();
    expect(spy).toHaveBeenCalledTimes(1);
    const [, severity, context] = spy.mock.calls[0]!;
    expect(severity).toBe('low');
    expect(context).toMatchObject({ reason: 'superseded_by_erasure' });
    expect(JSON.stringify(spy.mock.calls[0])).not.toMatch(/legacy-anchor|1990|consent_\d+/);
  });

  it('strips the legacy attestation copy and recovers the isolated key first for an un-relaunched shipped install', async () => {
    seedPreErasureRecords();
    mockSecure.set(LEGACY_KEY, JSON.stringify([attestationAt(ATTESTED)])); // shipped build: legacy only
    expect(mockSecure.has(ACCOUNT_DELETION_ATTESTATION_KEY)).toBe(false);

    await retireErasedRecords();

    expect(mockSecure.get(ACCOUNT_DELETION_ATTESTATION_KEY)).toBe(JSON.stringify(attestationAt(ATTESTED)));
    expect(mockSecure.has(LEGACY_KEY)).toBe(false);
    expect(mockSecure.has('consent_record_v1')).toBe(false);
  });

  it('never calls the destructive wipes', async () => {
    seedPreErasureRecords();
    isolatedAttestation(ATTESTED);
    const wipes = [
      jest.spyOn(SecureStorageService, 'clearAllWellnessData'),
      jest.spyOn(SecureStorageService, 'deleteWellnessBlob'),
    ];
    const resetSpy = jest.spyOn(useConsentStore.getState(), 'resetConsent');
    await retireErasedRecords();
    for (const w of wipes) expect(w).not.toHaveBeenCalled();
    expect(resetSpy).not.toHaveBeenCalled();
  });

  it('loadConsent fires it AFTER setting the status, without awaiting it', async () => {
    seedPreErasureRecords();
    isolatedAttestation(ATTESTED);
    now = ATTESTED + 5_000;
    // Hang the cleanup's deletes: if loadConsent awaited it, this would never resolve.
    (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(() => new Promise(() => undefined));
    try {
      const result = await useConsentStore.getState().loadConsent();
      expect(result).toBeNull();
      expect(useConsentStore.getState().consentStatus).toBe('missing');
    } finally {
      (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async (k: string) => {
        mockSecure.delete(k);
      });
    }
  });
});
