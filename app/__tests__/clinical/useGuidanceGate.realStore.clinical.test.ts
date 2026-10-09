/**
 * `useGuidanceGate` against the REAL assessment store (MAINT-745, TEST-68).
 *
 * The hand-rolled mock in the sibling suites calls the selector on render and has
 * no subscription, so it cannot tell a subscribed hook from one that snapshots. This
 * suite drives the real zustand store through its real actions and holds ONE render:
 * a Q9 > 0 completion made after mount must flip the same `result.current` from
 * `full` to `suppressed`. A hook that selected the stable `getLastResult` accessor,
 * or read through `getState()`, stays `full` — a live reader keeps seeing Tier 2/3.
 *
 * Storage is the in-memory SecureStorageService seam (assessmentStore.persistShape
 * pattern), which keeps SecureStore and the AES adapter out of the graph; AsyncStorage
 * is the global jest.setup mock. The
 * alert and the crisis telemetry are mocked: this pins the gate, not the alert path.
 * `react-native` is NOT mocked — renderHook needs the real renderer.
 */

// The store hydrates at import time, before this file's top-level assignments run
// (imports are hoisted above them), so the seam tolerates the holder being unset.
const mockWellnessBlobs: Record<string, unknown> = {};
jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: jest.fn(async (key: string, data: unknown) => {
      if (mockWellnessBlobs) mockWellnessBlobs[key] = data;
      return { success: true, operationType: 'store' as const, storageKey: `wellness_async_${key}`, operationTimeMs: 0, dataSize: 0 };
    }),
    retrieveWellnessBlob: jest.fn(async (key: string) => mockWellnessBlobs?.[key] ?? null),
    deleteWellnessBlob: jest.fn(async (key: string) => {
      delete mockWellnessBlobs[key];
    }),
  },
}));

jest.mock('@/features/crisis/services/crisisAlert', () => ({ showCrisisAlert: jest.fn() }));
jest.mock('@/core/services/supabase/SupabaseService', () => ({
  __esModule: true,
  default: { trackCrisisDetection: jest.fn() },
}));

import { renderHook, act } from '@testing-library/react-native';

import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import type { AssessmentResponse, AssessmentType } from '@/features/assessment/types';
import { showCrisisAlert } from '@/features/crisis/services/crisisAlert';
import { useGuidanceGate, type GuidanceGateState } from '@/features/guidance/hooks/useGuidanceGate';
import { seedWellnessWriteConsent } from '../helpers/wellnessWriteConsent';

const settle = () => new Promise((r) => setTimeout(r, 0));

const levelOf = (state: GuidanceGateState) =>
  state.status === 'ready' ? state.decision.level : 'pending';

/** One complete screening through the store's own actions — no setState shortcut. */
async function screen(type: AssessmentType, responses: readonly AssessmentResponse[]) {
  const store = useAssessmentStore.getState;
  await store().startAssessment(type, 'standalone');
  for (let i = 0; i < responses.length; i++) {
    await store().answerQuestion(`${type}_${i + 1}`, responses[i]!);
  }
  await store().completeAssessment();
  await settle();
}

beforeEach(async () => {
  seedWellnessWriteConsent('granted');
  await useAssessmentStore.setState(useAssessmentStore.getInitialState(), true);
  await settle();
  for (const k of Object.keys(mockWellnessBlobs)) delete mockWellnessBlobs[k];
  jest.clearAllMocks();
  await useAssessmentStore.persist.rehydrate();
  await settle();
});

afterEach(async () => {
  await useAssessmentStore.setState(useAssessmentStore.getInitialState(), true);
  await settle();
  seedWellnessWriteConsent('loading');
});

describe('useGuidanceGate — subscribed to the real store', () => {
  it('flips the SAME mounted reading from full to suppressed when a Q9 > 0 PHQ-9 lands', async () => {
    expect(useAssessmentStore.persist.hasHydrated()).toBe(true);

    await act(async () => {
      await screen('phq9', [0, 1, 0, 0, 0, 0, 0, 0, 0]);
      await screen('gad7', [0, 1, 0, 0, 0, 0, 0]);
    });

    const { result } = renderHook(() => useGuidanceGate());
    expect(levelOf(result.current)).toBe('full');

    // Total 2, Q9 = 1: below every score floor, suppressed only by the Q9 rule.
    await act(async () => {
      await screen('phq9', [0, 0, 0, 0, 0, 1, 0, 0, 1]);
    });

    const last = useAssessmentStore.getState().getLastResult('phq9');
    expect(last && 'suicidalIdeation' in last && last.suicidalIdeation).toBe(true);
    expect(last?.totalScore).toBe(2);
    expect(showCrisisAlert).toHaveBeenCalled();

    expect(levelOf(result.current)).toBe('suppressed');
    expect(result.current.status === 'ready' && result.current.decision.allowTier2Plus).toBe(false);
  });
});
