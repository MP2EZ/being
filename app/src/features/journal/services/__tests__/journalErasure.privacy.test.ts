/**
 * Journal erasure — enumeration-based proof of absence (FEAT-283, AC #7)
 *
 * WHY THIS TEST IS SHAPED THIS WAY
 *
 * The existing erasure coverage (`AccountDeletionService.unit.test.ts`) asserts
 * that `clearAllWellnessData` *was called*. That cannot detect the failure mode
 * that actually matters: a key whose name does not match any swept prefix. Such
 * a key survives erasure while every "was it called" assertion still passes.
 *
 * That was not hypothetical. `crisis_intervention_*` (written by
 * `assessmentStore.logCrisisIntervention`) matched none of the four swept
 * prefixes and survived account deletion — DEBUG-305, since fixed by deleting
 * the write and purging the residue. This suite is the assertion shape that
 * would have caught it, and DEBUG-305 reused it in
 * `crisisRecordErasure.privacy.test.ts`.
 *
 * So: write real entries, enumerate the store, erase, enumerate again, and
 * assert nothing remains. Proof of absence, not proof of intent.
 *
 * WHAT IS FAKED, AND WHY THAT IS SOUND
 *
 * AsyncStorage is replaced with a real in-memory implementation, because the
 * global test mock is a stub (`getItem` always null, no `getAllKeys`, no
 * `multiRemove`) and enumeration is the entire mechanism under test.
 *
 * Encryption is stubbed to a pass-through. The property being proven is about
 * KEY NAMING and sweep coverage, not about cipher correctness — which is
 * covered by `EncryptionService.realcrypto.test.ts`. Running real PBKDF2 here
 * would add ~100k iterations per write for no additional assurance about
 * erasure. The pass-through also makes the residual-plaintext check STRICTER:
 * if any entry text survived the sweep it would be readable in the dump, so a
 * leak cannot hide behind ciphertext.
 */

const mockMemoryStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockMemoryStore.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      mockMemoryStore.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      mockMemoryStore.delete(k);
    }),
    getAllKeys: jest.fn(async () => [...mockMemoryStore.keys()]),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((k) => mockMemoryStore.delete(k));
    }),
  },
  getItem: jest.fn(async (k: string) => mockMemoryStore.get(k) ?? null),
  setItem: jest.fn(async (k: string, v: string) => {
    mockMemoryStore.set(k, v);
  }),
  removeItem: jest.fn(async (k: string) => {
    mockMemoryStore.delete(k);
  }),
  getAllKeys: jest.fn(async () => [...mockMemoryStore.keys()]),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((k) => mockMemoryStore.delete(k));
  }),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureStorageService from '@/core/services/security/SecureStorageService';

import {
  deleteAllEntries,
  gatherJournalEntriesForExport,
  saveEntry,
} from '../journalEntryStore';

const SECRET_A = 'I went back over the whole day and hid nothing from myself';
const SECRET_B = 'the meeting went badly and I was short with him';

/**
 * Prefixes `clearAllWellnessData` sweeps. Any wellness key MUST use one.
 *
 * Read from the same constant the sweep filters on (DEBUG-355), not hand-copied.
 * A local copy silently goes stale the moment production gains or loses a
 * prefix, and every assertion here keeps passing against the wrong list — which
 * is precisely how `audit_log_` sat outside the sweep unnoticed.
 */
const SWEPT_PREFIXES = jest.requireActual<{
  SWEPT_ASYNC_PREFIXES: readonly string[];
}>('@/core/services/security/SecureStorageService').SWEPT_ASYNC_PREFIXES;

beforeEach(() => {
  mockMemoryStore.clear();
  jest.clearAllMocks();

  // Pass-through "encryption" — see header. Keeps plaintext visible so a
  // survivor cannot hide behind ciphertext.
  const svc = SecureStorageService as unknown as {
    encryptionService: {
      initialize: () => Promise<void>;
      encryptData: (d: unknown) => Promise<unknown>;
      decryptData: (p: unknown) => Promise<unknown>;
    };
  };
  svc.encryptionService.initialize = jest.fn(async () => undefined);
  svc.encryptionService.encryptData = jest.fn(async (data: unknown) => ({
    __passthrough: true,
    data,
  }));
  svc.encryptionService.decryptData = jest.fn(
    async (pkg: unknown) => (pkg as { data: unknown }).data
  );
});

describe('journal entries fall under the erasure sweep', () => {
  it('writes every key under a swept prefix', async () => {
    await saveEntry({ text: SECRET_A });
    await saveEntry({ text: SECRET_B });

    const keys = await AsyncStorage.getAllKeys();
    expect(keys.length).toBeGreaterThan(0);

    // The regression this catches: a future key added outside the convention,
    // exactly like crisis_intervention_* was before DEBUG-305.
    for (const key of keys) {
      expect(
        SWEPT_PREFIXES.some((p) => key.startsWith(p))
      ).toBe(true);
    }
  });

  it('leaves ZERO residual data after clearAllWellnessData', async () => {
    await saveEntry({ text: SECRET_A });
    await saveEntry({ text: SECRET_B });

    const before = await AsyncStorage.getAllKeys();
    expect(before.some((k) => k.includes('voice_journal_entry_'))).toBe(true);
    expect(before.some((k) => k.includes('voice_journal_index'))).toBe(true);

    await SecureStorageService.clearAllWellnessData();

    const after = await AsyncStorage.getAllKeys();
    expect(after.filter((k) => k.includes('voice_journal'))).toEqual([]);
  });

  it('leaves no entry text anywhere in the store after erasure', async () => {
    await saveEntry({ text: SECRET_A });
    await saveEntry({ text: SECRET_B });

    await SecureStorageService.clearAllWellnessData();

    // Whole-store dump. Stronger than checking known keys: it would catch a
    // copy written somewhere unexpected — an index backup, a migration marker,
    // a cache — that a key-name assertion would miss entirely.
    const dump = JSON.stringify([...mockMemoryStore.entries()]);
    expect(dump).not.toContain(SECRET_A);
    expect(dump).not.toContain(SECRET_B);
    expect(dump).not.toContain('went back over');
  });

  it('proves the test can fail — an unswept key IS detected', async () => {
    // Guards the guard. If the sweep or the enumeration silently stopped
    // working, the assertions above would pass vacuously on an empty store.
    // This plants the DEBUG-305 defect SHAPE — a key under no swept prefix —
    // and confirms the sweep genuinely leaves it behind.
    //
    // The canary is a neutral name, not `crisis_intervention_abc` as it was
    // originally: DEBUG-305 added that literal prefix to the sweep to purge
    // residue from shipped builds, so the real key is now swept and would make
    // this control fail. The property under test is "an unswept key survives,"
    // not "this particular key survives" — so the canary must be a name nothing
    // sweeps, or it stops testing anything.
    await saveEntry({ text: SECRET_A });
    mockMemoryStore.set('unswept_canary_abc', JSON.stringify({ text: SECRET_B }));

    await SecureStorageService.clearAllWellnessData();

    const after = await AsyncStorage.getAllKeys();
    expect(after).toContain('unswept_canary_abc');
    expect(JSON.stringify([...mockMemoryStore.entries()])).toContain(SECRET_B);
  });
});

describe('erasure covers keys that cannot use a swept prefix (DEBUG-305)', () => {
  it('removes legacy plaintext records even without a relaunch', async () => {
    // `legacyPlaintextRecordSweeper` purges these at app launch, but a user who
    // deletes their account without relaunching first never runs it. The sweep
    // matches them too so erasure does not depend on launch ordering.
    mockMemoryStore.set('crisis_intervention_s1', JSON.stringify({ triggerValue: 3 }));
    mockMemoryStore.set('assessment_audit_trail', '[]');

    await SecureStorageService.clearAllWellnessData();

    const after = await AsyncStorage.getAllKeys();
    expect(after).not.toContain('crisis_intervention_s1');
    expect(after).not.toContain('assessment_audit_trail');
  });

  it('removes the pending crisis-telemetry queue', async () => {
    // Not swept at launch — it must survive ordinary restarts to flush. But it
    // MUST go on account deletion: the server is erased first, so a surviving
    // queue would flush afterwards and re-create crisis rows for a deleted
    // account.
    mockMemoryStore.set(
      '@being/supabase/crisis_analytics_queue',
      JSON.stringify([{ properties: { trigger_type: 'phq9_suicidal_ideation' } }])
    );

    await SecureStorageService.clearAllWellnessData();

    const after = await AsyncStorage.getAllKeys();
    expect(after).not.toContain('@being/supabase/crisis_analytics_queue');
    expect(JSON.stringify([...mockMemoryStore.entries()])).not.toContain(
      'phq9_suicidal_ideation'
    );
  });

  it('matches the legacy names exactly rather than greedily', async () => {
    // The counterpart to the sweeper's collision guard. `crisis_async_*` is
    // swept here by design (it IS wellness data), so the risk this pins is
    // different: that broadening the sweep starts eating unrelated keys that
    // merely share the `crisis_`/`assessment_` stem.
    mockMemoryStore.set('crisis_unrelated_feature_state', 'keep me');
    mockMemoryStore.set('assessment_audit_trail_backup', 'keep me too');

    await SecureStorageService.clearAllWellnessData();

    const after = await AsyncStorage.getAllKeys();
    expect(after).toContain('crisis_unrelated_feature_state');
    expect(after).toContain('assessment_audit_trail_backup');
  });
});

describe('export-then-erase round trip (AC #7)', () => {
  it('exports entries before erasure and nothing after', async () => {
    await saveEntry({ text: SECRET_A });
    await saveEntry({ text: SECRET_B });

    const before = await gatherJournalEntriesForExport();
    expect(before.map((e) => e.text).sort()).toEqual([SECRET_A, SECRET_B].sort());

    await SecureStorageService.clearAllWellnessData();

    // Empty, not a throw. A decrypt error after erasure would mean ciphertext
    // outlived its key — a different and worse failure than "there is nothing
    // here", and one that would leave recoverable data behind if the key were
    // ever restored from a backup.
    await expect(gatherJournalEntriesForExport()).resolves.toEqual([]);
  });

  it('skips an unreadable entry rather than failing the whole export', async () => {
    await saveEntry({ text: SECRET_A });
    await saveEntry({ text: SECRET_B });

    // Corrupt one entry blob in place.
    const entryKey = [...mockMemoryStore.keys()].find((k) =>
      k.includes('voice_journal_entry_')
    )!;
    mockMemoryStore.set(entryKey, 'not json at all');

    // A disclosure missing one entry serves the user exercising a portability
    // right far better than a disclosure that errors out entirely.
    const exported = await gatherJournalEntriesForExport();
    expect(exported.length).toBe(1);
  });
});

describe('deleteAllEntries removes journal data on its own', () => {
  it('clears entries and index without needing a full account wipe', async () => {
    await saveEntry({ text: SECRET_A });
    await saveEntry({ text: SECRET_B });

    await deleteAllEntries();

    const after = await AsyncStorage.getAllKeys();
    expect(after.filter((k) => k.includes('voice_journal'))).toEqual([]);
    expect(JSON.stringify([...mockMemoryStore.entries()])).not.toContain(SECRET_A);
  });
});
