/**
 * legacyPlaintextRecordSweeper — DEBUG-305
 *
 * WHY THIS SUITE IS THE MOST IMPORTANT ONE IN THE PR
 *
 * The sweeper deletes AsyncStorage keys by pattern. The keys it must remove sit
 * in the same `crisis_`/`assessment_` namespace as the keys it must NEVER
 * remove: `crisis_async_*` holds the AES-256-encrypted safety plan and
 * emergency contacts. A naive `startsWith('crisis_')` would destroy them —
 * converting a privacy defect into a safety incident, silently, at app launch,
 * with no error message.
 *
 * So the survival assertions below are not padding. They are the actual
 * contract; the removal assertions are the easy half.
 */

const mockMemoryStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getAllKeys: jest.fn(async () => [...mockMemoryStore.keys()]),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((k) => mockMemoryStore.delete(k));
    }),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { sweepLegacyPlaintextRecords } from '../legacyPlaintextRecordSweeper';

beforeEach(() => {
  mockMemoryStore.clear();
  jest.clearAllMocks();
});

describe('removes the DEBUG-305 legacy plaintext records', () => {
  it('removes crisis_intervention_* written by shipped builds', async () => {
    mockMemoryStore.set(
      'crisis_intervention_session-abc',
      JSON.stringify({ detection: { triggerValue: 3 } })
    );

    const removed = await sweepLegacyPlaintextRecords();

    expect(removed).toBe(1);
    expect(await AsyncStorage.getAllKeys()).not.toContain(
      'crisis_intervention_session-abc'
    );
  });

  it('removes the legacy bare assessment_audit_trail key', async () => {
    mockMemoryStore.set('assessment_audit_trail', JSON.stringify([{ action: 'save' }]));

    await sweepLegacyPlaintextRecords();

    expect(await AsyncStorage.getAllKeys()).not.toContain('assessment_audit_trail');
  });

  it('leaves no residual plaintext trigger value behind', async () => {
    mockMemoryStore.set(
      'crisis_intervention_s1',
      JSON.stringify({ detection: { primaryTrigger: 'phq9_suicidal_ideation', triggerValue: 3 } })
    );

    await sweepLegacyPlaintextRecords();

    const dump = JSON.stringify([...mockMemoryStore.entries()]);
    expect(dump).not.toContain('phq9_suicidal_ideation');
  });
});

describe('PREFIX COLLISION GUARD — encrypted crisis data must survive', () => {
  it('does NOT delete crisis_async_* (encrypted safety plan / emergency contacts)', async () => {
    mockMemoryStore.set('crisis_async_safety_plan', 'ciphertext');
    mockMemoryStore.set('crisis_async_emergency_contacts', 'ciphertext');
    mockMemoryStore.set('crisis_intervention_s1', 'plaintext');

    await sweepLegacyPlaintextRecords();

    const after = await AsyncStorage.getAllKeys();
    expect(after).toContain('crisis_async_safety_plan');
    expect(after).toContain('crisis_async_emergency_contacts');
    expect(after).not.toContain('crisis_intervention_s1');
  });

  it('does NOT delete the other swept wellness namespaces', async () => {
    mockMemoryStore.set('crisis_secure_legacy', 'ciphertext');
    mockMemoryStore.set('assessment_async_s1', 'ciphertext');
    mockMemoryStore.set('assessment_async_audit_trail', '[]');
    mockMemoryStore.set('wellness_async_voice_journal_entry_1', 'ciphertext');
    mockMemoryStore.set('wellness_migrated:crisis_secure_x', 'v1');

    await sweepLegacyPlaintextRecords();

    const after = await AsyncStorage.getAllKeys();
    expect(after).toEqual(
      expect.arrayContaining([
        'crisis_secure_legacy',
        'assessment_async_s1',
        'assessment_async_audit_trail',
        'wellness_async_voice_journal_entry_1',
        'wellness_migrated:crisis_secure_x',
      ])
    );
  });

  it('does not touch unrelated app keys', async () => {
    mockMemoryStore.set('user_preferences', '{}');
    mockMemoryStore.set('crisis_analytics_queue', '[]');

    await sweepLegacyPlaintextRecords();

    const after = await AsyncStorage.getAllKeys();
    expect(after).toContain('user_preferences');
    expect(after).toContain('crisis_analytics_queue');
  });
});

describe('safe to run at app launch', () => {
  it('is idempotent — a second run removes nothing and does not throw', async () => {
    mockMemoryStore.set('crisis_intervention_s1', 'plaintext');

    expect(await sweepLegacyPlaintextRecords()).toBe(1);
    expect(await sweepLegacyPlaintextRecords()).toBe(0);
  });

  it('returns 0 rather than calling multiRemove on a clean store', async () => {
    mockMemoryStore.set('user_preferences', '{}');

    expect(await sweepLegacyPlaintextRecords()).toBe(0);
    expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
  });

  it('never throws when storage enumeration fails', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(
      new Error('storage unavailable')
    );

    // Runs before app render — a failure here must not break app start.
    await expect(sweepLegacyPlaintextRecords()).resolves.toBe(0);
  });

  it('never throws when removal fails', async () => {
    mockMemoryStore.set('crisis_intervention_s1', 'plaintext');
    (AsyncStorage.multiRemove as jest.Mock).mockRejectedValueOnce(
      new Error('write failed')
    );

    await expect(sweepLegacyPlaintextRecords()).resolves.toBe(0);
  });
});
