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

import { readFileSync } from 'fs';
import { join } from 'path';

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

/**
 * Static wiring pin.
 *
 * Everything above proves the sweeper WORKS. None of it proves it RUNS: delete
 * the call from `App.tsx` and every assertion in this file still passes, while
 * the plaintext records stay on every device forever. That is the whole point
 * of the sweeper, so it needs its own pin.
 *
 * Read as source text rather than by rendering `App.tsx`. The house pattern for
 * this is `__tests__/safety/lsApplicationQueriesSchemes.config.test.ts`, which
 * reads `app.json` directly: a static contract deserves a static check, and
 * standing up a render harness for `App.tsx` (which has none today, and pulls
 * in Sentry, PostHog, navigation, and every store) would cost far more than it
 * proves and would fail for unrelated reasons.
 */
describe('the sweeper is actually wired into app launch', () => {
  const appSource = readFileSync(
    join(__dirname, '../../../../../App.tsx'),
    'utf8'
  );

  it('imports the sweeper', () => {
    expect(appSource).toMatch(
      /import\s*\{[^}]*\bsweepLegacyPlaintextRecords\b[^}]*\}\s*from/
    );
  });

  it('calls it during launch', () => {
    expect(appSource).toMatch(/\bsweepLegacyPlaintextRecords\s*\(/);
  });

  it('awaits it — a floating promise could lose to app teardown', () => {
    expect(appSource).toMatch(/await\s+sweepLegacyPlaintextRecords\s*\(/);
  });

  it('guards the call so a sweep failure cannot break app start', () => {
    // The sweeper already returns 0 rather than throwing, but it runs before
    // render: the call site should not be the single point where that
    // guarantee is assumed rather than enforced.
    const callIndex = appSource.indexOf('await sweepLegacyPlaintextRecords');
    expect(callIndex).toBeGreaterThan(-1);

    const precedingSource = appSource.slice(0, callIndex);
    const lastTry = precedingSource.lastIndexOf('try {');
    const lastCatch = precedingSource.lastIndexOf('catch');
    expect(lastTry).toBeGreaterThan(lastCatch);
  });
});
