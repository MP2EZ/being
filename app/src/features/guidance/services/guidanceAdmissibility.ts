/**
 * Which screenings may inform the guidance gate (FEAT-673).
 *
 * Once a reader's Art. 9 write-block begins (a refusal, a withdrawal, Art. 9 switched off),
 * readings taken before it are not evidence the app may act on. A reading counts only if
 * it completed at or after the block start (crisis re-ruling 2026-10-02; founder 2026-10-19:
 * a fresh reading counts even while the reader is still blocked).
 *
 * Layered UPSTREAM of `decideGuidanceAccess`, which keeps its signature and its matrix
 * unchanged. The order is the crisis constraint:
 *   1. A suppressing reading (Q9 > 0 at any total, PHQ-9 >= 20, GAD-7 >= 15) suppresses
 *      whether or not it is admissible — a stale crisis floor keeps protecting.
 *   2. Never blocked, with writes allowed: the raw decision, exactly as before.
 *   3. No admissible reading on either axis: `gentle_withheld` — Tier 0/1, no premeditatio.
 *      No admissible evidence of state is not evidence of readiness.
 *   4. Otherwise the raw decision over the admissible readings, an inadmissible axis read
 *      as missing (so a single admissible calm axis is `gentle`, never `full`).
 *
 * PURE: no React, no store, no clock. `blockStart` is the consent selector's primitive:
 * -Infinity = never blocked, a finite time = the latest block start, null = unknown, which
 * admits nothing. The hook (useGuidanceGate) reads the stores and hands both values in.
 */

import type { GAD7Result, PHQ9Result } from '@/features/assessment/types';
import type { DevelopmentalStage } from '@/features/learn/types/education';
import type { GuidanceAccessDecision } from '../types/guidance';
import { decideGuidanceAccess } from './guidanceGate';

export const GENTLE_WITHHELD_DECISION: GuidanceAccessDecision = Object.freeze({
  level: 'gentle_withheld',
  allowTier2Plus: false,
  allowPremeditatio: false,
});

/**
 * The start from which readings are admissible. Pre-block history is admitted wholesale
 * (-Infinity) ONLY when the reader was never blocked AND writes are allowed now; a
 * never-blocked reader whose writes are blocked anyway (row i) is unknown (null).
 */
export function resolveAdmissionStart(blockStart: number | null, predicateAllowed: boolean): number | null {
  if (blockStart === -Infinity) return predicateAllowed ? -Infinity : null;
  return blockStart;
}

/** Does a reading completed at `completedAt` count under `start`? */
export function isAdmissible(completedAt: number, start: number | null): boolean {
  if (start === null) return false;
  if (start === -Infinity) return true;
  return Number.isFinite(completedAt) && completedAt >= start;
}

export function decideAdmissibleGuidanceAccess(
  phq9: PHQ9Result | null,
  gad7: GAD7Result | null,
  userStage: DevelopmentalStage,
  blockStart: number | null,
  predicateAllowed: boolean,
): GuidanceAccessDecision {
  const raw = decideGuidanceAccess(phq9, gad7, userStage);
  if (raw.level === 'suppressed') return raw;

  const start = resolveAdmissionStart(blockStart, predicateAllowed);
  if (start === -Infinity) return raw;

  const admissiblePhq9 = phq9 && isAdmissible(phq9.completedAt, start) ? phq9 : null;
  const admissibleGad7 = gad7 && isAdmissible(gad7.completedAt, start) ? gad7 : null;
  if (admissiblePhq9 === null && admissibleGad7 === null) return GENTLE_WITHHELD_DECISION;

  return decideGuidanceAccess(admissiblePhq9, admissibleGad7, userStage);
}
