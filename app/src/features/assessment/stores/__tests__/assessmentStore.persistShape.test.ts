/**
 * MAINT-731 — every saveProgress leaves the zustand-persist envelope on disk.
 *
 * Two writers share the `assessment_store` blob and whichever wrote last is on disk
 * (persistedAssessmentBlob.ts). saveProgress used to write a FLAT object and then
 * `set({ lastSavedAt })`, and that trailing set — whose value nothing read — was the only
 * thing making persist's `{state, version}` envelope the last write. Persist hydrates
 * from `.state`, which a flat blob does not have, so dropping the set alone would leave
 * every screening and every note to vanish on the next cold start: completedAssessments
 * rehydrates empty and the next write persists that emptiness over the history.
 *
 * Drives the REAL store against the SecureStorageService seam (the shape
 * assessmentStore.notes.test.ts uses), so the blob asserted here is the one on disk.
 */

const mockWellnessBlobs: Record<string, unknown> = {};
jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: jest.fn(async (key: string, data: unknown) => {
      mockWellnessBlobs[key] = data;
      return { success: true, operationType: 'store' as const, storageKey: `wellness_async_${key}`, operationTimeMs: 0, dataSize: 0 };
    }),
    retrieveWellnessBlob: jest.fn(async (key: string) => mockWellnessBlobs[key] ?? null),
    deleteWellnessBlob: jest.fn(async (key: string) => { delete mockWellnessBlobs[key]; }),
  },
}));

import { useAssessmentStore } from '../assessmentStore';
import type { AssessmentSession, AssessmentType } from '../../types/index';
import { seedWellnessWriteConsent } from '../../../../../__tests__/helpers/wellnessWriteConsent';

const BLOB = 'assessment_store';

function session(id: string, type: AssessmentType = 'phq9'): AssessmentSession {
  return {
    id,
    type,
    context: 'standalone',
    progress: {
      type,
      currentQuestionIndex: 0,
      totalQuestions: type === 'phq9' ? 9 : 7,
      startedAt: 1_700_000_000_000,
      answers: [],
      isComplete: true,
    },
  };
}

/** Let any write the last action kicked off (persist's setItem is not awaited) land. */
const settle = () => new Promise((r) => setTimeout(r, 0));

function expectEnvelope(blob: unknown): { state: Record<string, unknown>; version: number } {
  expect(blob).toEqual({ state: expect.any(Object), version: expect.any(Number) });
  const env = blob as { state: Record<string, unknown>; version: number };
  expect(Object.keys(env).sort()).toEqual(['state', 'version']);
  expect(env.state).not.toHaveProperty('lastSavedAt');
  return env;
}

describe('MAINT-731 — the assessment blob on disk is always the persist envelope', () => {
  beforeEach(() => {
    seedWellnessWriteConsent('granted');
    for (const k of Object.keys(mockWellnessBlobs)) delete mockWellnessBlobs[k];
    useAssessmentStore.getState().resetAssessment();
    useAssessmentStore.setState({ completedAssessments: [session('s1'), session('s2', 'gad7')], currentSession: null, error: null });
  });

  afterEach(() => {
    useAssessmentStore.getState().resetAssessment();
    useAssessmentStore.setState({ completedAssessments: [], currentSession: null });
    seedWellnessWriteConsent('loading');
  });

  it('the store carries no lastSavedAt field', () => {
    expect(useAssessmentStore.getState()).not.toHaveProperty('lastSavedAt');
  });

  it('saveProgress leaves the envelope, carrying the partialized history', async () => {
    delete mockWellnessBlobs[BLOB];
    await useAssessmentStore.getState().saveProgress();
    await settle();

    const env = expectEnvelope(mockWellnessBlobs[BLOB]);
    expect((env.state['completedAssessments'] as AssessmentSession[]).map((s) => s.id)).toEqual(['s1', 's2']);
    expect(env.version).toBe(useAssessmentStore.persist.getOptions().version ?? 0);
    expect(useAssessmentStore.getState().error).toBeNull();
  });

  it.each([
    ['setSessionNote', () => useAssessmentStore.getState().setSessionNote('s1', 'new job')],
    ['clearHistory', () => useAssessmentStore.getState().clearHistory()],
  ])('%s, which ends in saveProgress, leaves the envelope', async (_name, action) => {
    delete mockWellnessBlobs[BLOB];
    await action();
    await settle();
    expectEnvelope(mockWellnessBlobs[BLOB]);
  });

  it('a cold start rehydrates the history a save wrote', async () => {
    await useAssessmentStore.getState().setSessionNote('s1', 'kept across launches');
    await settle();
    const onDisk = JSON.parse(JSON.stringify(mockWellnessBlobs[BLOB]));

    // Simulate the next launch: memory is gone, the disk is what the save left.
    useAssessmentStore.setState({ completedAssessments: [] });
    await settle();
    mockWellnessBlobs[BLOB] = onDisk;
    await useAssessmentStore.persist.rehydrate();

    const history = useAssessmentStore.getState().completedAssessments;
    expect(history.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(history.find((s) => s.id === 's1')?.note).toBe('kept across launches');
  });
});
