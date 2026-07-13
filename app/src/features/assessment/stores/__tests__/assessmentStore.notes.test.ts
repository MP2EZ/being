/**
 * Assessment Store — life-event annotations ("Your note", FEAT-195).
 *
 * Pins the note CRUD contract: the note attaches to the right session, is
 * clamped to SESSION_NOTE_MAX_LENGTH, persists through the SAME encrypted
 * saveProgress() path as every other assessment write, and clears on empty.
 * The note is opaque — no inference, no analytics — which this suite enforces by
 * asserting the only egress is the encrypted blob.
 */

import { renderHook, act } from '@testing-library/react-native';

import { useAssessmentStore, SESSION_NOTE_MAX_LENGTH } from '../assessmentStore';
import type { AssessmentSession, AssessmentType } from '../../types/index';

// Passthrough SecureStorageService mock (mirrors assessmentStore.test.ts) — the
// in-memory map IS the encrypted blob, so we can assert what would be persisted
// without invoking real crypto. The `mock` prefix satisfies jest hoisting.
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
import SecureStorageService from '@/core/services/security/SecureStorageService';
const mockStoreWellnessBlob = SecureStorageService.storeWellnessBlob as jest.Mock;

function session(id: string, type: AssessmentType = 'phq9'): AssessmentSession {
  return {
    id,
    type,
    context: 'standalone',
    progress: {
      type,
      currentQuestionIndex: 0,
      totalQuestions: 9,
      startedAt: 1_700_000_000_000,
      answers: [],
      isComplete: true,
    },
  };
}

describe('Assessment Store — Your note annotations (FEAT-195)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const k of Object.keys(mockWellnessBlobs)) delete mockWellnessBlobs[k];
    useAssessmentStore.getState().resetAssessment();
    useAssessmentStore.setState({
      completedAssessments: [session('s1'), session('s2', 'gad7')],
      currentSession: null,
    });
  });

  it('attaches a note to the matching session only', async () => {
    const { result } = renderHook(() => useAssessmentStore());

    await act(async () => {
      await result.current.setSessionNote('s1', 'Started a new job this week');
    });

    const history = result.current.completedAssessments;
    expect(history.find((s) => s.id === 's1')?.note).toBe('Started a new job this week');
    expect(history.find((s) => s.id === 's2')?.note).toBeUndefined();
  });

  it('persists the note through the encrypted saveProgress() path', async () => {
    const { result } = renderHook(() => useAssessmentStore());

    await act(async () => {
      await result.current.setSessionNote('s1', 'context note');
    });

    // The only egress is the encrypted assessment blob with the assessment-tier
    // classification — no separate store, no analytics call.
    expect(mockStoreWellnessBlob).toHaveBeenCalledWith(
      'assessment_store',
      expect.any(Object),
      'level_2_assessment_data'
    );
    // The persisted blob is the zustand-persist envelope ({ state, version });
    // unwrap to the partialized slice.
    const blob = mockWellnessBlobs['assessment_store'] as {
      state?: { completedAssessments: AssessmentSession[] };
      completedAssessments?: AssessmentSession[];
    };
    const persistedSessions = blob.state?.completedAssessments ?? blob.completedAssessments ?? [];
    expect(persistedSessions.find((s) => s.id === 's1')?.note).toBe('context note');
  });

  it('clamps the note to SESSION_NOTE_MAX_LENGTH (140) chars', async () => {
    const { result } = renderHook(() => useAssessmentStore());
    const long = 'x'.repeat(SESSION_NOTE_MAX_LENGTH + 50);

    await act(async () => {
      await result.current.setSessionNote('s1', long);
    });

    const note = result.current.completedAssessments.find((s) => s.id === 's1')?.note;
    expect(note).toHaveLength(SESSION_NOTE_MAX_LENGTH);
  });

  it('trims surrounding whitespace and treats whitespace-only as a clear', async () => {
    const { result } = renderHook(() => useAssessmentStore());

    await act(async () => {
      await result.current.setSessionNote('s1', '  spaced  ');
    });
    expect(result.current.completedAssessments.find((s) => s.id === 's1')?.note).toBe('spaced');

    await act(async () => {
      await result.current.setSessionNote('s1', '   ');
    });
    expect(result.current.completedAssessments.find((s) => s.id === 's1')?.note).toBeUndefined();
  });

  it('clearSessionNote removes the note', async () => {
    const { result } = renderHook(() => useAssessmentStore());

    await act(async () => {
      await result.current.setSessionNote('s1', 'temporary');
    });
    expect(result.current.completedAssessments.find((s) => s.id === 's1')?.note).toBe('temporary');

    await act(async () => {
      await result.current.clearSessionNote('s1');
    });
    expect(result.current.completedAssessments.find((s) => s.id === 's1')?.note).toBeUndefined();
  });

  it('also updates currentSession when it is the annotated session', async () => {
    const cur = session('cur');
    useAssessmentStore.setState({ currentSession: cur, completedAssessments: [cur] });
    const { result } = renderHook(() => useAssessmentStore());

    await act(async () => {
      await result.current.setSessionNote('cur', 'live note');
    });

    expect(result.current.currentSession?.note).toBe('live note');
  });

  it('has zero edge into crisis detection — note is not a safety signal (crisis invariant)', async () => {
    // A note mentioning distressing words must NOT alter crisis state or the
    // scored result. The score path remains the sole safety signal; the note is
    // opaque (philosopher + crisis red line).
    const withResult: AssessmentSession = {
      ...session('s1'),
      result: { totalScore: 4, severity: 'mild', isCrisis: false, completedAt: 1, answers: [], suicidalIdeation: false } as never,
    };
    useAssessmentStore.setState({ completedAssessments: [withResult], crisisDetection: null });
    const { result } = renderHook(() => useAssessmentStore());

    await act(async () => {
      await result.current.setSessionNote('s1', 'I feel hopeless and want to end it');
    });

    expect(result.current.crisisDetection).toBeNull();
    expect(result.current.crisisIntervention).toBeNull();
    // The scored result is untouched — the note never feeds scoring.
    const s1 = result.current.completedAssessments.find((s) => s.id === 's1');
    expect(s1?.result?.totalScore).toBe(4);
    expect(s1?.result?.isCrisis).toBe(false);
  });
});
