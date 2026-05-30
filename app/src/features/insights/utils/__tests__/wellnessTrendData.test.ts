/**
 * Tests for wellnessTrendData — pure trend-data selectors (FEAT-30 PR1).
 *
 * These functions back the Wellness Screening Trends surface. They MUST stay
 * verdict-free: a TrendPoint carries only raw {score, timestamp, severity, max}
 * and a comparison carries only counts + raw value ranges. No 'improving' /
 * 'declining' / 'better' / 'worse' / delta is ever emitted (philosopher red
 * line — the app surfaces, the user interprets).
 */

import {
  getTrendPoints,
  compareWindows,
  downsample,
  buildTrendSnapshot,
  WELLNESS_LABELS,
  PHQ9_MAX_SCORE,
  GAD7_MAX_SCORE,
  type TrendPoint,
} from '../wellnessTrendData';
import type {
  AssessmentSession,
  AssessmentType,
  PHQ9Result,
  GAD7Result,
} from '@/features/assessment/types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000; // fixed reference instant

/** Build a completed AssessmentSession fixture at a given age (days before NOW). */
function makeSession(
  type: AssessmentType,
  score: number,
  severity: string,
  daysAgo: number,
  id = `${type}-${daysAgo}`
): AssessmentSession {
  const startedAt = NOW - daysAgo * DAY;
  const baseResult = {
    totalScore: score,
    severity,
    isCrisis: false,
    completedAt: startedAt,
    answers: [],
  };
  const result =
    type === 'phq9'
      ? ({ ...baseResult, suicidalIdeation: false } as PHQ9Result)
      : (baseResult as GAD7Result);

  return {
    id,
    type,
    context: 'standalone',
    progress: {
      type,
      currentQuestionIndex: type === 'phq9' ? 9 : 7,
      totalQuestions: type === 'phq9' ? 9 : 7,
      startedAt,
      answers: [],
      isComplete: true,
    },
    result,
  };
}

/** A session with no result (interrupted) — must be skipped by selectors. */
function makeIncompleteSession(type: AssessmentType, daysAgo: number): AssessmentSession {
  const startedAt = NOW - daysAgo * DAY;
  return {
    id: `${type}-incomplete-${daysAgo}`,
    type,
    context: 'standalone',
    progress: {
      type,
      currentQuestionIndex: 1,
      totalQuestions: type === 'phq9' ? 9 : 7,
      startedAt,
      answers: [],
      isComplete: false,
    },
  };
}

describe('getTrendPoints', () => {
  it('maps completed sessions of the requested type to raw trend points', () => {
    const sessions = [
      makeSession('phq9', 12, 'moderate', 10),
      makeSession('gad7', 8, 'mild', 9),
      makeSession('phq9', 6, 'mild', 2),
    ];

    const points = getTrendPoints(sessions, 'phq9', 'all', NOW);

    expect(points).toHaveLength(2);
    expect(points.map((p) => p.score)).toEqual([12, 6]); // chronological asc
    expect(points[0]).toMatchObject({ score: 12, severity: 'moderate', max: PHQ9_MAX_SCORE });
  });

  it('uses progress.startedAt as the timestamp and the instrument max', () => {
    const sessions = [makeSession('gad7', 15, 'severe', 3)];
    const [point] = getTrendPoints(sessions, 'gad7', 'all', NOW);
    expect(point.timestamp).toBe(NOW - 3 * DAY);
    expect(point.max).toBe(GAD7_MAX_SCORE);
  });

  it('skips sessions without a result (interrupted assessments)', () => {
    const sessions = [
      makeSession('phq9', 10, 'moderate', 5),
      makeIncompleteSession('phq9', 1),
    ];
    expect(getTrendPoints(sessions, 'phq9', 'all', NOW)).toHaveLength(1);
  });

  it('sorts points chronologically even when sessions are unordered', () => {
    const sessions = [
      makeSession('phq9', 3, 'minimal', 1),
      makeSession('phq9', 20, 'severe', 30),
      makeSession('phq9', 11, 'moderate', 10),
    ];
    const ts = getTrendPoints(sessions, 'phq9', 'all', NOW).map((p) => p.timestamp);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
  });

  describe('time-range filtering (boundaries are inclusive)', () => {
    const sessions = [
      makeSession('phq9', 1, 'minimal', 0), // today
      makeSession('phq9', 2, 'minimal', 7), // exactly a week ago
      makeSession('phq9', 3, 'minimal', 30), // exactly a month ago
      makeSession('phq9', 4, 'minimal', 90), // exactly a quarter ago
      makeSession('phq9', 5, 'minimal', 120), // older than a quarter
    ];

    it('week keeps points within the last 7 days inclusive', () => {
      expect(getTrendPoints(sessions, 'phq9', 'week', NOW).map((p) => p.score)).toEqual([2, 1]);
    });
    it('month keeps points within the last 30 days inclusive', () => {
      expect(getTrendPoints(sessions, 'phq9', 'month', NOW).map((p) => p.score)).toEqual([3, 2, 1]);
    });
    it('quarter keeps points within the last 90 days inclusive', () => {
      expect(getTrendPoints(sessions, 'phq9', 'quarter', NOW).map((p) => p.score)).toEqual([4, 3, 2, 1]);
    });
    it('all keeps every point regardless of age', () => {
      expect(getTrendPoints(sessions, 'phq9', 'all', NOW)).toHaveLength(5);
    });
  });

  it('returns an empty array when there are no sessions', () => {
    expect(getTrendPoints([], 'phq9', 'all', NOW)).toEqual([]);
  });

  it('NEVER emits a verdict field (no trend/direction/interpretation/change)', () => {
    const points = getTrendPoints([makeSession('phq9', 9, 'mild', 1)], 'phq9', 'all', NOW);
    for (const p of points) {
      expect(Object.keys(p).sort()).toEqual(['max', 'score', 'severity', 'timestamp']);
      expect(p).not.toHaveProperty('trend');
      expect(p).not.toHaveProperty('direction');
      expect(p).not.toHaveProperty('interpretation');
      expect(p).not.toHaveProperty('change');
    }
  });
});

describe('compareWindows', () => {
  function pts(...specs: Array<[score: number, daysAgo: number]>): TrendPoint[] {
    return specs.map(([score, daysAgo]) => ({
      score,
      timestamp: NOW - daysAgo * DAY,
      severity: 'minimal',
      max: PHQ9_MAX_SCORE,
    }));
  }

  it('summarizes the last-30 and previous-30 windows as counts + raw ranges', () => {
    const points = pts([5, 2], [9, 20], [14, 40], [3, 50]);
    const cmp = compareWindows(points, NOW);
    expect(cmp.current).toEqual({ count: 2, min: 5, max: 9 });
    expect(cmp.previous).toEqual({ count: 2, min: 3, max: 14 });
  });

  it('reports an empty window with count 0 and null ranges (no fabricated values)', () => {
    const cmp = compareWindows(pts([7, 3]), NOW);
    expect(cmp.current).toEqual({ count: 1, min: 7, max: 7 });
    expect(cmp.previous).toEqual({ count: 0, min: null, max: null });
  });

  it('excludes points older than 60 days from both windows', () => {
    const cmp = compareWindows(pts([10, 70], [11, 100]), NOW);
    expect(cmp.current.count).toBe(0);
    expect(cmp.previous.count).toBe(0);
  });

  it('NEVER emits a delta, direction, or percentage', () => {
    const cmp = compareWindows(pts([5, 2], [15, 40]), NOW);
    const serialized = JSON.stringify(cmp);
    expect(serialized).not.toMatch(/delta|direction|change|percent|improv|declin|worse|better/i);
    expect(Object.keys(cmp).sort()).toEqual(['current', 'previous']);
  });
});

describe('downsample', () => {
  const many: TrendPoint[] = Array.from({ length: 200 }, (_, i) => ({
    score: i % 28,
    timestamp: NOW - (200 - i) * DAY,
    severity: 'minimal',
    max: PHQ9_MAX_SCORE,
  }));

  it('returns the input unchanged when at or under the cap', () => {
    const few = many.slice(0, 40);
    expect(downsample(few, 60)).toBe(few);
  });

  it('reduces to at most the cap when over it', () => {
    expect(downsample(many, 60).length).toBeLessThanOrEqual(60);
  });

  it('always preserves the first and last points (no edge clipping)', () => {
    const out = downsample(many, 60);
    expect(out[0]).toBe(many[0]);
    expect(out[out.length - 1]).toBe(many[many.length - 1]);
  });

  it('keeps points in chronological order', () => {
    const ts = downsample(many, 60).map((p) => p.timestamp);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
  });
});

describe('buildTrendSnapshot (FEAT-29 export contract)', () => {
  it('includes only instruments with at least one completed screening', () => {
    const snap = buildTrendSnapshot([makeSession('phq9', 10, 'moderate', 5)], NOW);
    expect(snap.instruments.map((i) => i.type)).toEqual(['phq9']);
    expect(snap.instruments[0]!.label).toBe(WELLNESS_LABELS.phq9);
  });

  it('orders instruments phq9 then gad7 and carries full chronological history', () => {
    const snap = buildTrendSnapshot(
      [
        makeSession('gad7', 8, 'mild', 3),
        makeSession('phq9', 4, 'minimal', 30),
        makeSession('phq9', 12, 'moderate', 2),
      ],
      NOW
    );
    expect(snap.instruments.map((i) => i.type)).toEqual(['phq9', 'gad7']);
    expect(snap.instruments[0]!.points.map((p) => p.score)).toEqual([4, 12]);
  });

  it('stamps generatedAt and carries the compliance disclaimer', () => {
    const snap = buildTrendSnapshot([makeSession('phq9', 6, 'mild', 1)], NOW);
    expect(snap.generatedAt).toBe(NOW);
    expect(snap.disclaimer).toMatch(/not clinical assessments or diagnoses/i);
    expect(snap.disclaimer).toMatch(/988/);
  });

  it('is plain serializable JSON with no verdict fields', () => {
    const snap = buildTrendSnapshot(
      [makeSession('phq9', 9, 'mild', 5), makeSession('gad7', 14, 'moderate', 2)],
      NOW
    );
    // Round-trips with no loss (no functions/symbols).
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
    const serialized = JSON.stringify(snap);
    expect(serialized).not.toMatch(/trend|direction|interpretation|delta|improv|declin/i);
  });

  it('returns an empty instruments list when there is no history', () => {
    const snap = buildTrendSnapshot([], NOW);
    expect(snap.instruments).toEqual([]);
  });
});
