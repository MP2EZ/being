/**
 * Blocked-period ledger for the assessment blob (FEAT-717 AC2, FEAT-665 slice A2a-ii).
 *
 * UNWIRED: FEAT-685 creates one, feeds it and calls `filterForSave` before each allowed
 * write. Pinned unwired in wellnessWriteConsentBoundary.test.ts.
 *
 * Why a ledger and not a process latch (panel ruling 2026-10-03): a latch would drop a
 * now-consenting user's post-grant screenings and would latch every user at boot. The
 * ledger remembers WHICH sessions were captured while Art. 9 writes were withheld, by
 * session id, and strips only those from the next allowed write after a re-grant.
 *
 *   - Only `refused`, `revoked` and `under_age` mark: the reasons that also open a
 *     FEAT-665 block-start interval. `loading` defers and `missing` defers pending
 *     FEAT-685's mirror-lapse rule; neither ever marks.
 *   - A session already on disk before the block is never withheld. If it continued
 *     during the block (a straddler), only the answers captured during the block are
 *     dropped: those not already on disk and timestamped at or after the block start
 *     (ruling 2026-10-05). The block start is an argument
 *     (`selectWellnessWriteBlockStart`), so this module stays pure. When it is unknown,
 *     every answer not already on disk counts as captured during the block.
 *   - Memory is never touched. `filterForSave` returns a new payload of the same shape.
 *
 * FEAT-685 CONTRACT: hydration and every successful allowed write must reach
 * `notePersisted` before the first blocked observation. Otherwise a pre-block session
 * looks blocked-period, and saves after a re-grant would strip pre-block history.
 */

import type { WellnessWriteBlockReason } from '@/core/stores/consentStore';
import type { AssessmentAnswer, AssessmentSession } from '../types/index';
import {
  normalizePersistedAssessmentBlob,
  type PersistedAssessmentState,
} from './persistedAssessmentBlob';

export interface BlockedPeriodLedger {
  /** Record what is on disk: call after hydration and after every successful write. */
  notePersisted(blob: unknown): void;
  /** A write of `payload` was withheld for `reason`. No-op for `loading` and `missing`. */
  observeBlocked(reason: WellnessWriteBlockReason, payload: unknown, blockStart?: number | null): void;
  /**
   * `payload` minus everything captured during a block, in the same shape. Returns the
   * payload itself when nothing is withheld, and null when something is withheld but the
   * payload cannot be read: the caller must then write nothing.
   */
  filterForSave(payload: unknown): unknown;
  /** Forget everything (erasure, or a new process-equivalent reset). */
  reset(): void;
}

const WITHHOLDING_REASONS: ReadonlySet<WellnessWriteBlockReason> = new Set<WellnessWriteBlockReason>([
  'refused',
  'revoked',
  'under_age',
]);

const answerKey = (a: AssessmentAnswer): string => `${String(a.questionId)}@${String(a.timestamp)}`;

/** Every session in a state, with the answers that belong to it. */
function sessionsOf(state: PersistedAssessmentState): Array<{ session: AssessmentSession; answers: AssessmentAnswer[] }> {
  const out: Array<{ session: AssessmentSession; answers: AssessmentAnswer[] }> = [];
  for (const session of state.completedAssessments ?? []) {
    out.push({ session, answers: session.progress?.answers ?? [] });
  }
  if (state.currentSession) {
    out.push({
      session: state.currentSession,
      answers: [...(state.answers ?? []), ...(state.currentSession.progress?.answers ?? [])],
    });
  }
  return out;
}

export function createBlockedPeriodLedger(): BlockedPeriodLedger {
  /** Session id → keys of its answers already on disk. */
  const persisted = new Map<string, Set<string>>();
  /** Sessions first seen while blocked: withheld whole. */
  const withheldSessions = new Set<string>();
  /** Straddlers: session id → keys of answers captured during the block. */
  const withheldAnswers = new Map<string, Set<string>>();

  const isEmpty = (): boolean => withheldSessions.size === 0 && withheldAnswers.size === 0;

  const keepAnswer = (sessionId: string): ((a: AssessmentAnswer) => boolean) => {
    const dropped = withheldAnswers.get(sessionId);
    return (a: AssessmentAnswer): boolean => !dropped?.has(answerKey(a));
  };

  /** A straddler minus its blocked-period answers, and minus a result derived from them. */
  function filterStraddler(session: AssessmentSession): AssessmentSession {
    const keep = keepAnswer(session.id);
    if (!session.progress) return session;
    const answers = session.progress.answers ?? [];
    const kept = answers.filter(keep);
    if (kept.length === answers.length && (!session.result || (session.result.answers ?? []).every(keep))) {
      return session;
    }
    const { result: _derived, ...rest } = session;
    return { ...rest, progress: { ...session.progress, answers: kept, isComplete: false } };
  }

  function filterState(state: PersistedAssessmentState): PersistedAssessmentState {
    const next: PersistedAssessmentState = { ...state };
    if (state.completedAssessments !== undefined) {
      next.completedAssessments = state.completedAssessments
        .filter((s) => !withheldSessions.has(s.id))
        .map((s) => (withheldAnswers.has(s.id) ? filterStraddler(s) : s));
    }
    const current = state.currentSession;
    if (current && withheldSessions.has(current.id)) {
      next.currentSession = null;
      next.answers = [];
      next.currentQuestionIndex = 0;
    } else if (current && withheldAnswers.has(current.id)) {
      next.currentSession = filterStraddler(current);
      if (state.answers !== undefined) {
        const kept = state.answers.filter(keepAnswer(current.id));
        next.answers = kept;
        if (typeof state.currentQuestionIndex === 'number') {
          next.currentQuestionIndex = Math.min(state.currentQuestionIndex, kept.length);
        }
      }
    }
    return next;
  }

  /** Mark what a straddler captured during the block: not on disk, and not provably before it. */
  function markStraddler(sessionId: string, answers: AssessmentAnswer[], onDisk: Set<string>, start: number | null): void {
    for (const a of answers) {
      const key = answerKey(a);
      if (onDisk.has(key)) continue;
      const provablyBefore = start !== null && typeof a.timestamp === 'number' && a.timestamp < start;
      if (provablyBefore) continue;
      const dropped = withheldAnswers.get(sessionId) ?? new Set<string>();
      dropped.add(key);
      withheldAnswers.set(sessionId, dropped);
    }
  }

  return {
    notePersisted(blob): void {
      const normalized = normalizePersistedAssessmentBlob(blob);
      if (!normalized) return;
      for (const { session, answers } of sessionsOf(normalized.state)) {
        const keys = persisted.get(session.id) ?? new Set<string>();
        for (const a of answers) keys.add(answerKey(a));
        persisted.set(session.id, keys);
      }
    },

    observeBlocked(reason, payload, blockStart): void {
      if (!WITHHOLDING_REASONS.has(reason)) return;
      const normalized = normalizePersistedAssessmentBlob(payload);
      if (!normalized) return;
      const start = typeof blockStart === 'number' && Number.isFinite(blockStart) ? blockStart : null;

      for (const { session, answers } of sessionsOf(normalized.state)) {
        const onDisk = persisted.get(session.id);
        if (onDisk) markStraddler(session.id, answers, onDisk, start);
        else withheldSessions.add(session.id);
      }
    },

    filterForSave(payload): unknown {
      if (isEmpty()) return payload;
      const normalized = normalizePersistedAssessmentBlob(payload);
      if (!normalized) return null;
      const state = filterState(normalized.state);
      if (normalized.shape === 'envelope') {
        return { ...(payload as Record<string, unknown>), state };
      }
      return state;
    },

    reset(): void {
      persisted.clear();
      withheldSessions.clear();
      withheldAnswers.clear();
    },
  };
}
