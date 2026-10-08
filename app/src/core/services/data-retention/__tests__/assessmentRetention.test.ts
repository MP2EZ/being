/**
 * Assessment retention rules (DEBUG-705) — the pure half. The live-storage half
 * is assessmentRetention.livePath.privacy.test.ts.
 */
import {
  ASSESSMENT_RETENTION_PERIODS,
  pruneAssessmentBlob,
  retentionTier,
  shouldRetainAssessment,
} from '../assessmentRetention';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 4);
const at = (ageDays: number) => NOW - ageDays * DAY;
const keep = (record: unknown) => shouldRetainAssessment(record, NOW, ASSESSMENT_RETENTION_PERIODS);

describe('retentionTier', () => {
  it('PHQ-9 15-19 is the 90-day tier even when stored isCrisis is true', () => {
    expect(retentionTier({ type: 'phq9', result: { totalScore: 17, isCrisis: true, suicidalIdeation: false } })).toBe(
      'ninety_day'
    );
  });

  it('reads Q9 from the answers when suicidalIdeation is absent or false', () => {
    const answers = [{ questionId: 'phq9_9', response: 2, timestamp: 1 }];
    expect(retentionTier({ type: 'phq9', result: { totalScore: 4, suicidalIdeation: false, answers } })).toBe('three_year');
    expect(retentionTier({ type: 'phq9', result: { totalScore: 4 }, progress: { answers } })).toBe('three_year');
  });

  it('normalises an upper-case type and infers PHQ-9 from a suicidalIdeation field', () => {
    expect(retentionTier({ type: 'PHQ9', result: { totalScore: 22 } })).toBe('three_year');
    expect(retentionTier({ result: { totalScore: 3, suicidalIdeation: false } })).toBe('ninety_day');
  });

  it('recomputes a missing total from the answers', () => {
    const answers = [3, 3, 3, 3, 3, 3, 2, 0, 0].map((response, i) => ({ questionId: `phq9_${i + 1}`, response }));
    expect(retentionTier({ type: 'phq9', result: { answers } })).toBe('three_year'); // 20
  });

  it('fails safe to three_year when the tier cannot be established', () => {
    expect(retentionTier({ type: 'unknown', result: { totalScore: 1 } })).toBe('three_year');
    expect(retentionTier({ type: 'gad7', result: {} })).toBe('three_year');
    expect(retentionTier(null)).toBe('three_year');
  });
});

describe('shouldRetainAssessment', () => {
  const mild = (ageDays: number) => ({ type: 'gad7', progress: { startedAt: at(ageDays) }, result: { totalScore: 3 } });
  const severe = (ageDays: number) => ({ type: 'gad7', progress: { startedAt: at(ageDays) }, result: { totalScore: 18 } });

  it('applies 90 days to non-crisis and 3 years to crisis-tier records', () => {
    expect(keep(mild(89))).toBe(true);
    expect(keep(mild(91))).toBe(false);
    expect(keep(severe(400))).toBe(true);
    expect(keep(severe(3 * 365 + 1))).toBe(false);
  });

  it('falls back to completedAt when startedAt is missing', () => {
    expect(keep({ type: 'gad7', result: { totalScore: 3, completedAt: at(91) } })).toBe(false);
  });

  it('keeps a record with no usable timestamp rather than guess', () => {
    expect(keep({ type: 'gad7', result: { totalScore: 3 } })).toBe(true);
  });
});

describe('pruneAssessmentBlob', () => {
  const old = { id: 'old', type: 'gad7', progress: { startedAt: at(200) }, result: { totalScore: 2 } };
  const fresh = { id: 'fresh', type: 'gad7', progress: { startedAt: at(2) }, result: { totalScore: 2 } };

  it('returns null for a shape it does not recognise', () => {
    expect(pruneAssessmentBlob(['x'], NOW, ASSESSMENT_RETENTION_PERIODS)).toBeNull();
    expect(pruneAssessmentBlob('x', NOW, ASSESSMENT_RETENTION_PERIODS)).toBeNull();
  });

  it('treats a blob with no history as nothing to prune', () => {
    expect(pruneAssessmentBlob({ currentSession: null }, NOW, ASSESSMENT_RETENTION_PERIODS)).toEqual({
      blob: { currentSession: null },
      removed: 0,
    });
  });

  it('keeps every other field in both shapes', () => {
    expect(pruneAssessmentBlob({ completedAssessments: [old, fresh], lastSavedAt: 9 }, NOW, ASSESSMENT_RETENTION_PERIODS)).toEqual({
      blob: { completedAssessments: [fresh], lastSavedAt: 9 },
      removed: 1,
    });
    expect(
      pruneAssessmentBlob({ state: { completedAssessments: [old], autoSaveEnabled: true }, version: 0 }, NOW, ASSESSMENT_RETENTION_PERIODS)
    ).toEqual({ blob: { state: { completedAssessments: [], autoSaveEnabled: true }, version: 0 }, removed: 1 });
  });
});
