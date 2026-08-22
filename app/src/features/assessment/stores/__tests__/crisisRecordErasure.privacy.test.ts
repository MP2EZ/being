/**
 * Crisis-path erasure — enumeration-based proof of absence (DEBUG-305)
 *
 * WHY THIS TEST IS SHAPED THIS WAY
 *
 * The defect this pins could not be caught by any existing assertion. The
 * erasure coverage in `AccountDeletionService.unit.test.ts` mocks
 * `clearAllWellnessData` outright, so it can only assert the sweep was
 * *called*. A key whose name matches no swept prefix survives erasure while
 * every "was it called" assertion still passes.
 *
 * `logCrisisIntervention` wrote `crisis_intervention_${assessmentId}` — raw
 * JSON, no encryption, matching none of the four swept prefixes. It therefore
 * persisted the Q9 self-harm response (`triggerValue`) alongside
 * `primaryTrigger: 'phq9_suicidal_ideation'` in the clear, and survived account
 * deletion. DEBUG-305 deleted that write.
 *
 * So this suite drives a REAL Q9-positive flow and then enumerates the store,
 * rather than asserting anything about the code that was removed. A test that
 * asserts "logCrisisIntervention is not called" would pass just as well if
 * someone reintroduced the same write under a different name; enumerating every
 * key that actually exists is the assertion that cannot be fooled that way.
 *
 * WHAT IS FAKED, AND WHY THAT IS SOUND
 *
 * AsyncStorage is a real in-memory implementation, because the global test mock
 * is a stub with no `getAllKeys`, and enumeration is the entire mechanism under
 * test.
 *
 * `SecureStorageService` is stubbed to base64-wrap its payload rather than run
 * real AES. The property being proven is about KEY NAMING, sweep coverage, and
 * the absence of cleartext on the crisis path — not cipher correctness, which
 * `EncryptionService.realcrypto.test.ts` covers. Encoding (rather than
 * passthrough) is deliberate: it keeps the legitimately-encrypted blob opaque
 * so the whole-store cleartext assertions below cannot pass or fail for the
 * wrong reason.
 */

const mockMemoryStore = new Map<string, string>();

// Built inside the factory rather than referenced from an outer const: the
// `jest.mock` call is hoisted above module-scope declarations, so a captured
// variable would still be uninitialised when the factory runs.
jest.mock('@react-native-async-storage/async-storage', () => {
  const impl = {
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
  };
  return { __esModule: true, default: impl, ...impl };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

// Encrypt-alike: opaque payload under the swept `wellness_async_` prefix.
jest.mock('@/core/services/security/SecureStorageService', () => {
  const encode = (data: unknown) =>
    `CIPHERTEXT:${Buffer.from(JSON.stringify(data)).toString('base64')}`;
  const decode = (raw: string) =>
    JSON.parse(Buffer.from(raw.replace('CIPHERTEXT:', ''), 'base64').toString());
  return {
    __esModule: true,
    default: {
      storeWellnessBlob: jest.fn(async (key: string, data: unknown) => {
        mockMemoryStore.set(`wellness_async_${key}`, encode(data));
        return { success: true };
      }),
      retrieveWellnessBlob: jest.fn(async (key: string) => {
        const raw = mockMemoryStore.get(`wellness_async_${key}`);
        return raw ? decode(raw) : null;
      }),
      deleteWellnessBlob: jest.fn(async (key: string) => {
        mockMemoryStore.delete(`wellness_async_${key}`);
      }),
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

import { useAssessmentStore } from '../assessmentStore';

/**
 * The two halves of what `clearAllWellnessData` erases — prefix families and
 * exact-name exceptions — both read from the constants the sweep itself filters
 * on. A hand-copied list here could drift from the real sweep and turn this
 * guard into a rubber stamp; importing means adding a prefix or an exception
 * requires editing the sweep.
 *
 * The exact-key half was already wired this way (DEBUG-305). The prefix half was
 * a hand-copy until DEBUG-355, and the gap was not theoretical: `audit_log_`
 * lived outside the sweep while this list, mirroring only four prefixes, kept
 * reporting full coverage.
 */
const { SWEPT_ASYNC_PREFIXES: SWEPT_PREFIXES, SECURE_STORAGE_CONFIG } =
  jest.requireActual<{
    SWEPT_ASYNC_PREFIXES: readonly string[];
    SECURE_STORAGE_CONFIG: { SWEPT_EXACT_KEYS: readonly string[] };
  }>('@/core/services/security/SecureStorageService');

const SWEPT_EXACT_KEYS = SECURE_STORAGE_CONFIG.SWEPT_EXACT_KEYS;

const isSwept = (key: string) =>
  SWEPT_PREFIXES.some((p) => key.startsWith(p)) || SWEPT_EXACT_KEYS.includes(key);

/** Drive a PHQ-9 to a positive Q9 answer — the highest-sensitivity path. */
async function answerThroughPositiveQ9(q9Response: number) {
  const store = useAssessmentStore.getState();
  await store.startAssessment('phq9', 'debug-305-erasure-test');
  for (let i = 0; i < 8; i++) {
    await useAssessmentStore.getState().answerQuestion(`phq9_${i + 1}`, 1);
  }
  await useAssessmentStore.getState().answerQuestion('phq9_9', q9Response);
}

beforeEach(() => {
  mockMemoryStore.clear();
  jest.clearAllMocks();
  useAssessmentStore.getState().resetAssessment();
});

describe('a Q9-positive crisis writes no plaintext record', () => {
  it('writes no crisis_intervention_* key at all', async () => {
    await answerThroughPositiveQ9(3);

    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter((k) => k.startsWith('crisis_intervention_'))).toEqual([]);
  });

  it('writes every key under a swept prefix', async () => {
    await answerThroughPositiveQ9(3);

    const keys = await AsyncStorage.getAllKeys();
    expect(keys.length).toBeGreaterThan(0);

    // The regression this catches: any crisis-path key added outside the
    // naming convention, which would be invisible to account erasure.
    const unswept = keys.filter((k) => !isSwept(k));
    expect(unswept).toEqual([]);
  });

  it('leaves no cleartext self-harm marker outside the outbound telemetry queue', async () => {
    await answerThroughPositiveQ9(3);

    // Whole-store dump MINUS the one key allowed to hold the trigger in the
    // clear. `crisis_analytics_queue` is the pending-upload buffer for the
    // INFRA-214 `crisis_detected` event: an allow-listed categorical payload
    // (trigger_type / severity_bucket / intervention_surfaced /
    // assessment_type, never the raw score) that has to stay readable to be
    // flushed. It is covered by erasure via SWEPT_EXACT_KEYS — asserted
    // separately by the swept-prefix test above, so excluding it here narrows
    // the assertion without creating a blind spot.
    //
    // DEBUG-381 NARROWED THIS FROM THE WHOLE CONSTANT TO ONE KEY BY NAME, and
    // the distinction is the entire point. Filtering on `SWEPT_EXACT_KEYS`
    // membership meant every FUTURE addition to that list silently exempted
    // itself from this cleartext assertion — so the list, whose stated purpose
    // is that it "cannot silently grow a hole", was growing one here. DEBUG-381
    // added `storage_metadata_index`, which is cleartext and crisis-describing
    // (`crisis_async_<episodeId>` / `crisis_tier` / `level_1_crisis_responses`)
    // and is exactly the sort of key this assertion exists to catch. Excluding
    // it would have traded one blind spot for another.
    //
    // Only `crisis_analytics_queue` earns the exemption, because it is the one
    // key that must stay READABLE to function — it is a pending-upload buffer,
    // and its payload is the allow-listed categorical shape named above.
    // Anything else added to the exception list gets asserted here like every
    // other key. If a future entry genuinely needs exempting, add it by name
    // with its own justification.
    const CLEARTEXT_EXEMPT = ['@being/supabase/crisis_analytics_queue'];
    const dump = JSON.stringify(
      [...mockMemoryStore.entries()].filter(([key]) => !CLEARTEXT_EXEMPT.includes(key))
    );

    // Everything else must be free of the crisis record's plaintext shape.
    expect(dump).not.toContain('phq9_suicidal_ideation');
    expect(dump).not.toContain('triggeringAnswers');
    expect(dump).not.toContain('interventionStarted');
  });

  it('keeps the raw Q9 response out of cleartext everywhere', async () => {
    await answerThroughPositiveQ9(3);

    // The assessment blob legitimately holds the answers — encrypted. With the
    // stub's opaque encoding, a cleartext answer record anywhere would show up
    // as a readable `questionId`/`response` pair.
    const dump = JSON.stringify([...mockMemoryStore.entries()]);
    expect(dump).not.toContain('"questionId":"phq9_9"');
    expect(dump).not.toContain('triggerValue');
  });

  it('proves the assertion can fail — a planted unswept key IS detected', async () => {
    // Guards the guard. If enumeration silently stopped working, the
    // assertions above would pass vacuously on an empty store. This plants the
    // exact DEBUG-305 defect shape and confirms the check rejects it.
    await answerThroughPositiveQ9(3);
    mockMemoryStore.set(
      'crisis_intervention_planted',
      JSON.stringify({ primaryTrigger: 'phq9_suicidal_ideation' })
    );

    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter((k) => !isSwept(k))).toContain('crisis_intervention_planted');
  });
});

describe('crisis behaviour is unchanged by the removal', () => {
  it('still surfaces the crisis alert on a positive Q9', async () => {
    await answerThroughPositiveQ9(1);

    expect(Alert.alert).toHaveBeenCalled();
    expect(useAssessmentStore.getState().crisisDetection?.primaryTrigger).toBe(
      'phq9_suicidal_ideation'
    );
  });

  it('keeps the full detection in memory for the dedup invariant', async () => {
    await answerThroughPositiveQ9(2);

    // `triggerValue` must survive IN MEMORY — handleCrisisDetection's dedup and
    // the crisisIntervention.detection === crisisDetection invariant depend on
    // it. It is excluded from `partialize`, so it never reaches disk.
    const state = useAssessmentStore.getState();
    expect(state.crisisDetection?.triggerValue).toBe(2);
    expect(state.crisisIntervention?.detection).toBe(state.crisisDetection);
  });
});
