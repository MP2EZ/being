/**
 * The on-disk assessment blob, normalised and erased (FEAT-717, FEAT-665 slice A2a-ii).
 *
 * Two writers share one key: zustand `persist` writes the envelope `{state, version}`
 * and `saveProgress` writes the flat object. Whichever wrote last is what is on disk,
 * so the erasure writer and the blocked-period ledger must read both. Anything else is
 * unrecognised (null), which the erasure writer treats as a failed read: zero writes.
 *
 * An erasure op deletes exactly one thing and passes every other key through untouched.
 */

import {
  applyAssessmentErasureOp,
  isPersistedAssessmentState,
  normalizePersistedAssessmentBlob,
  type PersistedAssessmentState,
} from '../persistedAssessmentBlob';
import type { AssessmentSession } from '../../types/index';

const session = (id: string, extra: Partial<AssessmentSession> = {}): AssessmentSession => ({
  id,
  type: 'phq9',
  context: 'standalone',
  progress: {
    type: 'phq9',
    currentQuestionIndex: 0,
    totalQuestions: 9,
    startedAt: 1_000,
    answers: [],
    isComplete: false,
  },
  ...extra,
});

const flatBlob = (): Record<string, unknown> => ({
  currentSession: session('cur', { note: 'current note' }),
  currentQuestionIndex: 2,
  answers: [
    { questionId: 'phq9_1', response: 1, timestamp: 10 },
    { questionId: 'phq9_2', response: 0, timestamp: 11 },
  ],
  completedAssessments: [session('a', { note: 'kept' }), session('b', { note: 'to clear' })],
  lastSavedAt: 12,
});

const envelope = (): Record<string, unknown> => ({
  state: { ...flatBlob(), autoSaveEnabled: false },
  version: 0,
});

describe('normalizePersistedAssessmentBlob', () => {
  it('recognises the persist envelope and returns its inner state', () => {
    const raw = envelope();
    const result = normalizePersistedAssessmentBlob(raw);
    expect(result?.shape).toBe('envelope');
    expect(result?.state).toEqual(raw['state']);
  });

  it('recognises the flat saveProgress object and returns it as the state', () => {
    const raw = flatBlob();
    const result = normalizePersistedAssessmentBlob(raw);
    expect(result?.shape).toBe('flat');
    expect(result?.state).toEqual(raw);
  });

  it('accepts an empty flat object (every field is optional on disk)', () => {
    expect(normalizePersistedAssessmentBlob({})).toEqual({ shape: 'flat', state: {} });
  });

  it.each<[string, unknown]>([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'assessment'],
    ['a number', 7],
    ['an array', [flatBlob()]],
    ['an envelope whose state is not an object', { state: 'x', version: 0 }],
    ['an envelope whose state is an array', { state: [], version: 0 }],
    ['an envelope with a non-numeric version', { state: flatBlob(), version: '0' }],
    ['completedAssessments that is not an array', { completedAssessments: {} }],
    ['a completed session without a string id', { completedAssessments: [{ type: 'phq9' }] }],
    ['a currentSession without a string id', { currentSession: { id: 4 } }],
    ['answers that is not an array', { answers: 'phq9_1' }],
    ['a non-object answer', { answers: [3] }],
    ['a non-numeric currentQuestionIndex', { currentQuestionIndex: '2' }],
  ])('returns null for %s', (_label, raw) => {
    expect(normalizePersistedAssessmentBlob(raw)).toBeNull();
  });

  it('never mutates its input', () => {
    const raw = Object.freeze(envelope());
    expect(() => normalizePersistedAssessmentBlob(raw)).not.toThrow();
  });
});

describe('isPersistedAssessmentState (moved from assessmentStore, behaviour unchanged)', () => {
  it('accepts any non-array object and rejects everything else', () => {
    expect(isPersistedAssessmentState({})).toBe(true);
    expect(isPersistedAssessmentState(envelope())).toBe(true);
    expect(isPersistedAssessmentState(null)).toBe(false);
    expect(isPersistedAssessmentState([])).toBe(false);
    expect(isPersistedAssessmentState('x')).toBe(false);
  });
});

describe('applyAssessmentErasureOp', () => {
  const state = (): PersistedAssessmentState & Record<string, unknown> => ({
    ...flatBlob(),
    autoSaveEnabled: false,
    unknownFutureKey: { kept: true },
  });

  it('clear_history empties completedAssessments and touches nothing else', () => {
    const before = state();
    const after = applyAssessmentErasureOp(before, { kind: 'clear_history' });
    const { completedAssessments, ...rest } = after as Record<string, unknown>;
    const { completedAssessments: _was, ...restBefore } = before as Record<string, unknown>;
    expect(completedAssessments).toEqual([]);
    expect(rest).toEqual(restBefore);
  });

  it('clear_session_note omits the note key on the matching completed session only', () => {
    const after = applyAssessmentErasureOp(state(), { kind: 'clear_session_note', sessionId: 'b' });
    const [a, b] = after.completedAssessments ?? [];
    expect(a).toEqual(session('a', { note: 'kept' }));
    expect(b).toEqual(session('b'));
    // Omitted, never present-as-undefined (exactOptionalPropertyTypes).
    expect(Object.prototype.hasOwnProperty.call(b, 'note')).toBe(false);
    expect(after.currentSession).toEqual(session('cur', { note: 'current note' }));
  });

  it('clear_session_note also clears the note on a matching currentSession', () => {
    const after = applyAssessmentErasureOp(state(), { kind: 'clear_session_note', sessionId: 'cur' });
    expect(after.currentSession).toEqual(session('cur'));
    expect(Object.prototype.hasOwnProperty.call(after.currentSession, 'note')).toBe(false);
    expect(after.completedAssessments).toEqual(state().completedAssessments);
  });

  it('clear_session_note on an unknown id deletes nothing', () => {
    expect(applyAssessmentErasureOp(state(), { kind: 'clear_session_note', sessionId: 'zzz' })).toEqual(state());
  });

  it('reset_current_session nulls the session, empties answers and rewinds the index', () => {
    const before = state();
    const after = applyAssessmentErasureOp(before, { kind: 'reset_current_session' }) as Record<string, unknown>;
    expect(after['currentSession']).toBeNull();
    expect(after['answers']).toEqual([]);
    expect(after['currentQuestionIndex']).toBe(0);
    const strip = (s: Record<string, unknown>) => {
      const { currentSession: _c, answers: _a, currentQuestionIndex: _i, ...rest } = s;
      return rest;
    };
    expect(strip(after)).toEqual(strip(before as Record<string, unknown>));
  });

  it('leaves an absent completedAssessments absent', () => {
    const after = applyAssessmentErasureOp({ currentSession: null }, { kind: 'clear_session_note', sessionId: 'a' });
    expect(after).toEqual({ currentSession: null });
  });

  it('never mutates its input', () => {
    const frozen = state();
    for (const s of frozen.completedAssessments ?? []) Object.freeze(s);
    Object.freeze(frozen.currentSession);
    Object.freeze(frozen);
    expect(() => {
      applyAssessmentErasureOp(frozen, { kind: 'clear_history' });
      applyAssessmentErasureOp(frozen, { kind: 'clear_session_note', sessionId: 'b' });
      applyAssessmentErasureOp(frozen, { kind: 'clear_session_note', sessionId: 'cur' });
      applyAssessmentErasureOp(frozen, { kind: 'reset_current_session' });
    }).not.toThrow();
    expect(frozen).toEqual(state());
  });
});
