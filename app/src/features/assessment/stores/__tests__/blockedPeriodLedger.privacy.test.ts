/**
 * Blocked-period ledger (FEAT-717 AC2, FEAT-665 slice A2a-ii). Unwired: FEAT-685 feeds it.
 *
 * Rulings (2026-10-03, 2026-10-05):
 *   - keyed by session id, in memory only; never a process latch
 *   - only refused / revoked / under_age withhold; loading and missing never mark
 *   - after refuse then grant, the next save holds nothing captured during the block
 *   - a session persisted before the block is never withheld; if it continued during the
 *     block, only its answers timestamped at or after the block start are dropped
 *   - memory is never touched: filterForSave returns a new payload of the same shape
 */

import { createBlockedPeriodLedger } from '../blockedPeriodLedger';
import type { AssessmentAnswer, AssessmentSession, PHQ9Result } from '../../types/index';

const BLOCK_START = 50_000;
const BEFORE = BLOCK_START - 10_000;
const DURING = BLOCK_START + 1_000;
const AFTER_GRANT = BLOCK_START + 90_000;

const answer = (n: number, timestamp: number): AssessmentAnswer => ({
  questionId: `phq9_${n}`,
  response: 1,
  timestamp,
});

const session = (id: string, answers: AssessmentAnswer[] = [], extra: Partial<AssessmentSession> = {}): AssessmentSession => ({
  id,
  type: 'phq9',
  context: 'standalone',
  progress: {
    type: 'phq9',
    currentQuestionIndex: 0,
    totalQuestions: 9,
    startedAt: 1_000,
    answers,
    isComplete: false,
  },
  ...extra,
});

const completed = (id: string, answers: AssessmentAnswer[]): AssessmentSession =>
  session(id, answers, {
    result: {
      totalScore: answers.length,
      severity: 'minimal',
      isCrisis: false,
      suicidalIdeation: false,
      completedAt: 2_000,
      answers,
    } as PHQ9Result,
    progress: {
      type: 'phq9',
      currentQuestionIndex: 9,
      totalQuestions: 9,
      startedAt: 1_000,
      answers,
      isComplete: true,
    },
  });

interface FlatState {
  currentSession: AssessmentSession | null;
  currentQuestionIndex: number;
  answers: AssessmentAnswer[];
  completedAssessments: AssessmentSession[];
  lastSavedAt?: number;
  autoSaveEnabled?: boolean;
}

const flat = (s: Partial<FlatState>): FlatState => ({
  currentSession: null,
  currentQuestionIndex: 0,
  answers: [],
  completedAssessments: [],
  ...s,
});

const envelope = (s: Partial<FlatState>, version = 0) => ({ state: { ...flat(s), autoSaveEnabled: true }, version });

const ids = (sessions: AssessmentSession[] | undefined) => (sessions ?? []).map((s) => s.id);

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}

describe('refuse → grant: the next save excludes what was captured during the block', () => {
  it.each(['refused', 'revoked', 'under_age'] as const)('%s', (reason) => {
    const ledger = createBlockedPeriodLedger();
    const pre = completed('pre', [answer(1, BEFORE)]);
    ledger.notePersisted(flat({ completedAssessments: [pre] }));

    // Blocked: a screening is started and completed, then another is started.
    const blockedDone = completed('blocked-done', [answer(1, DURING)]);
    const blockedLive = session('blocked-live');
    ledger.observeBlocked(
      reason,
      flat({ completedAssessments: [pre, blockedDone], currentSession: blockedLive, answers: [answer(1, DURING)], currentQuestionIndex: 1 }),
      BLOCK_START,
    );

    // Granted again: memory still holds everything, plus a screening completed after the grant.
    const postGrant = completed('post-grant', [answer(1, AFTER_GRANT)]);
    const memory = flat({
      completedAssessments: [pre, blockedDone, postGrant],
      currentSession: blockedLive,
      answers: [answer(1, DURING), answer(2, AFTER_GRANT)],
      currentQuestionIndex: 2,
      lastSavedAt: AFTER_GRANT,
    });
    const out = ledger.filterForSave(memory) as FlatState;

    expect(ids(out.completedAssessments)).toEqual(['pre', 'post-grant']);
    expect(out.currentSession).toBeNull();
    expect(out.answers).toEqual([]);
    expect(out.currentQuestionIndex).toBe(0);
    expect(out.lastSavedAt).toBe(AFTER_GRANT);
  });
});

describe('sessions persisted before the block are never withheld', () => {
  it('a pre-block completed session survives even though the blocked payload carried it', () => {
    const ledger = createBlockedPeriodLedger();
    const pre = completed('pre', [answer(1, BEFORE)]);
    ledger.notePersisted(envelope({ completedAssessments: [pre] }));
    ledger.observeBlocked('refused', flat({ completedAssessments: [pre] }), BLOCK_START);

    const out = ledger.filterForSave(flat({ completedAssessments: [pre] })) as FlatState;
    expect(out.completedAssessments).toEqual([pre]);
  });

  it('a pre-block current session that the user did not touch during the block is kept whole', () => {
    const ledger = createBlockedPeriodLedger();
    const live = session('live');
    const pre = flat({ currentSession: live, answers: [answer(1, BEFORE)], currentQuestionIndex: 1 });
    ledger.notePersisted(pre);
    ledger.observeBlocked('revoked', pre, BLOCK_START);
    expect(ledger.filterForSave(pre)).toEqual(pre);
  });
});

describe('a straddling session keeps its pre-block answers and drops the blocked-period ones', () => {
  const live = session('straddler');

  it('in progress: answers at or after the block start are dropped, post-grant answers kept', () => {
    const ledger = createBlockedPeriodLedger();
    ledger.notePersisted(flat({ currentSession: live, answers: [answer(1, BEFORE), answer(2, BEFORE)], currentQuestionIndex: 2 }));

    // During the block: q3 at exactly the block start, q4 after it.
    ledger.observeBlocked(
      'refused',
      flat({
        currentSession: live,
        answers: [answer(1, BEFORE), answer(2, BEFORE), answer(3, BLOCK_START), answer(4, DURING)],
        currentQuestionIndex: 4,
      }),
      BLOCK_START,
    );

    // After the grant: q5 answered.
    const out = ledger.filterForSave(
      flat({
        currentSession: live,
        answers: [answer(1, BEFORE), answer(2, BEFORE), answer(3, BLOCK_START), answer(4, DURING), answer(5, AFTER_GRANT)],
        currentQuestionIndex: 5,
      }),
    ) as FlatState;

    expect(out.currentSession?.id).toBe('straddler');
    expect(out.answers.map((a) => a.questionId)).toEqual(['phq9_1', 'phq9_2', 'phq9_5']);
    expect(out.currentQuestionIndex).toBeLessThanOrEqual(out.answers.length);
  });

  it('a blocked-period answer re-answered after the grant is kept (new timestamp)', () => {
    const ledger = createBlockedPeriodLedger();
    ledger.notePersisted(flat({ currentSession: live, answers: [answer(1, BEFORE)] }));
    ledger.observeBlocked('refused', flat({ currentSession: live, answers: [answer(1, BEFORE), answer(2, DURING)] }), BLOCK_START);
    const out = ledger.filterForSave(
      flat({ currentSession: live, answers: [answer(1, BEFORE), answer(2, AFTER_GRANT)] }),
    ) as FlatState;
    expect(out.answers).toEqual([answer(1, BEFORE), answer(2, AFTER_GRANT)]);
  });

  it('completed during the block: the session is kept, its blocked-period answers and derived result are not', () => {
    const ledger = createBlockedPeriodLedger();
    ledger.notePersisted(flat({ currentSession: live, answers: [answer(1, BEFORE)] }));
    const done = completed('straddler', [answer(1, BEFORE), answer(2, DURING)]);
    ledger.observeBlocked('refused', flat({ completedAssessments: [done], currentSession: null }), BLOCK_START);

    const out = ledger.filterForSave(flat({ completedAssessments: [done] })) as FlatState;
    const kept = out.completedAssessments[0];
    expect(kept?.id).toBe('straddler');
    expect(kept?.progress.answers).toEqual([answer(1, BEFORE)]);
    expect(kept?.progress.isComplete).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(kept, 'result')).toBe(false);
  });

  it('an unknown block start falls back to what was on disk: only persisted answers are kept', () => {
    const ledger = createBlockedPeriodLedger();
    ledger.notePersisted(flat({ currentSession: live, answers: [answer(1, BEFORE)] }));
    ledger.observeBlocked('revoked', flat({ currentSession: live, answers: [answer(1, BEFORE), answer(2, DURING)] }), null);
    const out = ledger.filterForSave(flat({ currentSession: live, answers: [answer(1, BEFORE), answer(2, DURING)] })) as FlatState;
    expect(out.answers).toEqual([answer(1, BEFORE)]);
  });

  it('an answer already on disk is never dropped, whatever its timestamp says', () => {
    const ledger = createBlockedPeriodLedger();
    const skewed = answer(1, DURING); // persisted before the block, clock ahead
    ledger.notePersisted(flat({ currentSession: live, answers: [skewed] }));
    ledger.observeBlocked('refused', flat({ currentSession: live, answers: [skewed] }), BLOCK_START);
    const out = ledger.filterForSave(flat({ currentSession: live, answers: [skewed] })) as FlatState;
    expect(out.answers).toEqual([skewed]);
  });
});

describe('loading and missing never mark', () => {
  it.each(['loading', 'missing'] as const)('%s: nothing is withheld and the payload passes through as-is', (reason) => {
    const ledger = createBlockedPeriodLedger();
    const payload = flat({
      completedAssessments: [completed('x', [answer(1, DURING)])],
      currentSession: session('y'),
      answers: [answer(1, DURING)],
      currentQuestionIndex: 1,
    });
    ledger.observeBlocked(reason, payload, BLOCK_START);
    expect(ledger.filterForSave(payload)).toBe(payload);
  });

  it('positive control: the same payload IS withheld under refused', () => {
    const ledger = createBlockedPeriodLedger();
    const payload = flat({ completedAssessments: [completed('x', [answer(1, DURING)])] });
    ledger.observeBlocked('refused', payload, BLOCK_START);
    expect(ids((ledger.filterForSave(payload) as FlatState).completedAssessments)).toEqual([]);
  });
});

describe('shape and memory', () => {
  it('an envelope stays an envelope: version and other keys pass through', () => {
    const ledger = createBlockedPeriodLedger();
    ledger.observeBlocked('refused', flat({ completedAssessments: [completed('b', [])] }), BLOCK_START);
    const payload = envelope({ completedAssessments: [completed('a', []), completed('b', [])] }, 3);
    const out = ledger.filterForSave(payload) as ReturnType<typeof envelope>;
    expect(out.version).toBe(3);
    expect(out.state.autoSaveEnabled).toBe(true);
    expect(ids(out.state.completedAssessments)).toEqual(['a']);
  });

  it('a flat payload stays flat', () => {
    const ledger = createBlockedPeriodLedger();
    ledger.observeBlocked('refused', envelope({ completedAssessments: [completed('b', [])] }), BLOCK_START);
    const out = ledger.filterForSave(flat({ completedAssessments: [completed('b', [])], lastSavedAt: 9 })) as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(out, 'state')).toBe(false);
    expect(out['lastSavedAt']).toBe(9);
    expect(out['completedAssessments']).toEqual([]);
  });

  it('never mutates the payload it is handed (memory is never touched)', () => {
    const ledger = createBlockedPeriodLedger();
    const live = session('s');
    ledger.notePersisted(flat({ currentSession: live, answers: [answer(1, BEFORE)] }));
    const payload = deepFreeze(
      envelope({
        completedAssessments: [completed('b', [answer(1, DURING)]), completed('s', [answer(1, BEFORE), answer(2, DURING)])],
        currentSession: session('c'),
        answers: [answer(1, DURING)],
      }),
    );
    const snapshot = JSON.parse(JSON.stringify(payload));
    expect(() => {
      ledger.notePersisted(payload);
      ledger.observeBlocked('refused', payload, BLOCK_START);
      ledger.filterForSave(payload);
    }).not.toThrow();
    expect(payload).toEqual(snapshot);
  });

  it('a ledger that never saw a block returns the payload itself, recognised or not', () => {
    const ledger = createBlockedPeriodLedger();
    const odd = ['not', 'a', 'blob'];
    expect(ledger.filterForSave(odd)).toBe(odd);
  });

  it('a ledger holding withheld data answers null for a payload it cannot read', () => {
    const ledger = createBlockedPeriodLedger();
    ledger.observeBlocked('refused', flat({ completedAssessments: [completed('b', [])] }), BLOCK_START);
    expect(ledger.filterForSave('garbage')).toBeNull();
  });

  it('reset() forgets everything', () => {
    const ledger = createBlockedPeriodLedger();
    const payload = flat({ completedAssessments: [completed('b', [])] });
    ledger.observeBlocked('refused', payload, BLOCK_START);
    ledger.reset();
    expect(ledger.filterForSave(payload)).toBe(payload);
  });

  it('each factory call is independent (no singleton)', () => {
    const a = createBlockedPeriodLedger();
    const b = createBlockedPeriodLedger();
    const payload = flat({ completedAssessments: [completed('b', [])] });
    a.observeBlocked('refused', payload, BLOCK_START);
    expect(b.filterForSave(payload)).toBe(payload);
  });
});
