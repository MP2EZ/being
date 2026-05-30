/**
 * wellnessTrendData — pure selectors for the Wellness Screening Trends surface
 * (FEAT-30).
 *
 * Transforms the assessment store's `completedAssessments` into the minimal,
 * raw shape the trend visualization needs. Deliberately VERDICT-FREE:
 *
 * - A `TrendPoint` carries only `{ score, timestamp, severity, max }`. It has no
 *   `trend` / `direction` / `interpretation` / `change` field, so no consumer
 *   can render an app-authored judgement ("you're improving / declining"). The
 *   app surfaces the data; the user interprets it (philosopher red line).
 * - `compareWindows` returns only counts + raw value RANGES per window — never a
 *   delta, direction, or percentage between them.
 *
 * The verdict-bearing `ScoreTrend` / `ScoreComparison` types in
 * `assessment/types/scoring.ts` are intentionally NOT used here.
 *
 * All windowing functions take `now` explicitly so they stay pure and
 * deterministic under test.
 */

import type { AssessmentSession, AssessmentType } from '@/features/assessment/types';

/** PHQ-9 spans 0–27. */
export const PHQ9_MAX_SCORE = 27;
/** GAD-7 spans 0–21. */
export const GAD7_MAX_SCORE = 21;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Time windows offered by the trends UI. Mirrors PrincipleEngagementChart's tabs (+ 'all'). */
export type TrendTimeRange = 'week' | 'month' | 'quarter' | 'all';

/** Days of history each range covers; `all` is unbounded. */
const TIME_RANGE_DAYS: Record<TrendTimeRange, number> = {
  week: 7,
  month: 30,
  quarter: 90,
  all: Infinity,
};

/**
 * A single screening result reduced to what the chart renders. No verdict
 * fields by construction.
 */
export interface TrendPoint {
  /** Raw total score for the instrument. */
  score: number;
  /** When the assessment was started (ms epoch) — matches existing InsightsScreen mapping. */
  timestamp: number;
  /** Clinical severity bucket label (e.g. 'mild', 'moderate'). */
  severity: string;
  /** Maximum possible score for the instrument (27 PHQ-9 / 21 GAD-7) — fixes the Y axis. */
  max: number;
}

/** Count + raw value range for one comparison window. Min/max are null when empty. */
export interface WindowSummary {
  count: number;
  min: number | null;
  max: number | null;
}

/**
 * Two adjacent 30-day windows summarized independently. There is intentionally
 * no field relating the two (no delta/direction) — comparison is left to the
 * reader.
 */
export interface TrendComparison {
  /** Last 30 days (now-30d .. now). */
  current: WindowSummary;
  /** The 30 days before that (now-60d .. now-30d). */
  previous: WindowSummary;
}

const INSTRUMENT_MAX: Record<AssessmentType, number> = {
  phq9: PHQ9_MAX_SCORE,
  gad7: GAD7_MAX_SCORE,
};

/**
 * Reduce completed assessment sessions of one type to chronological trend
 * points, filtered to the given time range.
 *
 * @param now reference instant (ms); defaults to Date.now() in app use.
 */
export function getTrendPoints(
  sessions: AssessmentSession[],
  type: AssessmentType,
  range: TrendTimeRange,
  now: number = Date.now()
): TrendPoint[] {
  const rangeDays = TIME_RANGE_DAYS[range];
  const cutoff = rangeDays === Infinity ? -Infinity : now - rangeDays * MS_PER_DAY;
  const max = INSTRUMENT_MAX[type];

  const points: TrendPoint[] = [];
  for (const session of sessions) {
    if (session.type !== type || !session.result) continue;
    const timestamp = session.progress.startedAt;
    if (timestamp < cutoff) continue;
    points.push({
      score: session.result.totalScore,
      timestamp,
      severity: session.result.severity,
      max,
    });
  }

  return points.sort((a, b) => a.timestamp - b.timestamp);
}

/** Summarize a set of points into count + raw min/max (null range when empty). */
function summarize(points: TrendPoint[]): WindowSummary {
  if (points.length === 0) return { count: 0, min: null, max: null };
  let min = points[0]!.score;
  let max = points[0]!.score;
  for (const p of points) {
    if (p.score < min) min = p.score;
    if (p.score > max) max = p.score;
  }
  return { count: points.length, min, max };
}

/**
 * Split points into the last-30-day and previous-30-day windows and summarize
 * each. Points older than 60 days are excluded from both. Returns only
 * per-window counts + ranges — never a between-window delta or direction.
 *
 * @param now reference instant (ms); defaults to Date.now() in app use.
 */
export function compareWindows(
  points: TrendPoint[],
  now: number = Date.now()
): TrendComparison {
  const thirty = now - 30 * MS_PER_DAY;
  const sixty = now - 60 * MS_PER_DAY;

  const current: TrendPoint[] = [];
  const previous: TrendPoint[] = [];
  for (const p of points) {
    if (p.timestamp >= thirty && p.timestamp <= now) current.push(p);
    else if (p.timestamp >= sixty && p.timestamp < thirty) previous.push(p);
  }

  return { current: summarize(current), previous: summarize(previous) };
}

/**
 * Evenly thin a point series to at most `cap` points for render performance,
 * always preserving the first and last point. Returns the input unchanged when
 * already at/under the cap.
 */
export function downsample(points: TrendPoint[], cap = 60): TrendPoint[] {
  if (points.length <= cap) return points;

  const step = (points.length - 1) / (cap - 1);
  const out: TrendPoint[] = [];
  for (let i = 0; i < cap; i++) {
    out.push(points[Math.round(i * step)]!);
  }
  return out;
}
