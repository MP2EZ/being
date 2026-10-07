/**
 * The on-disk assessment blob: shape recognition and deletion-only edits
 * (FEAT-717, FEAT-665 slice A2a-ii).
 *
 * Two writers share the `assessment_store` blob, and whichever wrote last is on disk:
 *   - zustand `persist` writes the envelope `{state, version}` (its `partialize` slice)
 *   - `saveProgress` writes the flat object `{currentSession, answers, ...}`
 * Anything else is unrecognised and normalises to null. The erasure writer treats null
 * as a failed read and writes nothing, so validation errs strict: a blob this module
 * cannot read is never rewritten.
 *
 * Pure: no I/O, no store access, never mutates its input.
 */

import type { AssessmentAnswer, AssessmentSession } from '../types/index';

/**
 * Shape of state persisted by the assessment store. Used to narrow
 * EncryptedAssessmentStorage.load()'s `unknown` return at the recovery
 * call site (audit TS-01).
 */
export interface PersistedAssessmentState {
  currentSession?: AssessmentSession | null;
  currentQuestionIndex?: number;
  answers?: AssessmentAnswer[];
  completedAssessments?: AssessmentSession[];
  lastSavedAt?: number;
}

export function isPersistedAssessmentState(value: unknown): value is PersistedAssessmentState {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export type PersistedAssessmentBlobShape = 'envelope' | 'flat';

export interface NormalizedAssessmentBlob {
  shape: PersistedAssessmentBlobShape;
  state: PersistedAssessmentState;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isSessionLike = (value: unknown): boolean =>
  isPlainObject(value) && typeof value['id'] === 'string';

const isOptional = (value: unknown, check: (v: unknown) => boolean): boolean =>
  value === undefined || check(value);

const isArrayOf = (check: (v: unknown) => boolean) => (value: unknown): boolean =>
  Array.isArray(value) && value.every(check);

/** Every field is optional on disk, but a present field must have its persisted type. */
function isRecognisedState(state: Record<string, unknown>): boolean {
  return (
    isOptional(state['currentSession'], (v) => v === null || isSessionLike(v)) &&
    isOptional(state['completedAssessments'], isArrayOf(isSessionLike)) &&
    isOptional(state['answers'], isArrayOf(isPlainObject)) &&
    isOptional(state['currentQuestionIndex'], (v) => typeof v === 'number')
  );
}

/**
 * Recognise either on-disk shape. The envelope is identified by its `state` key,
 * which the flat object never carries. Returns the inner state by reference; callers
 * that edit it must copy.
 */
export function normalizePersistedAssessmentBlob(raw: unknown): NormalizedAssessmentBlob | null {
  if (!isPlainObject(raw)) return null;
  if (Object.prototype.hasOwnProperty.call(raw, 'state')) {
    const { state, version } = raw;
    if (!isPlainObject(state)) return null;
    if (version !== undefined && (typeof version !== 'number' || !Number.isFinite(version))) return null;
    return isRecognisedState(state) ? { shape: 'envelope', state: state as PersistedAssessmentState } : null;
  }
  return isRecognisedState(raw) ? { shape: 'flat', state: raw as PersistedAssessmentState } : null;
}

/** The three deletions a user can make while Art. 9 writes are withheld. */
export type AssessmentErasureOp =
  | { kind: 'clear_history' }
  | { kind: 'clear_session_note'; sessionId: string }
  | { kind: 'reset_current_session' };

/** Omit the key entirely (exactOptionalPropertyTypes: `note: undefined` is not a valid session). */
function withoutNote(session: AssessmentSession): AssessmentSession {
  const { note: _note, ...rest } = session;
  return rest;
}

/**
 * Apply exactly one deletion to a persisted state. Every other key, including ones this
 * module does not know about, passes through untouched. Returns a new object.
 */
export function applyAssessmentErasureOp<S extends PersistedAssessmentState>(
  state: S,
  op: AssessmentErasureOp,
): S {
  switch (op.kind) {
    case 'clear_history':
      return { ...state, completedAssessments: [] };
    case 'clear_session_note': {
      const clear = (s: AssessmentSession): AssessmentSession =>
        s.id === op.sessionId ? withoutNote(s) : s;
      const next: S = { ...state };
      if (state.completedAssessments !== undefined) {
        next.completedAssessments = state.completedAssessments.map(clear);
      }
      if (state.currentSession) {
        next.currentSession = clear(state.currentSession);
      }
      return next;
    }
    case 'reset_current_session':
      return { ...state, currentSession: null, answers: [], currentQuestionIndex: 0 };
    default: {
      const unhandled: never = op;
      throw new Error(`unhandled assessment erasure op: ${JSON.stringify(unhandled)}`);
    }
  }
}
