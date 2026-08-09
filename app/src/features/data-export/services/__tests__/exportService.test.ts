/**
 * exportService — unit tests (FEAT-29 Slice 1, test-first).
 *
 * Covers the pure data-gathering contract: date-range filtering, category
 * selection, the compliance redaction rule (raw answers never exported),
 * empty-data handling, deterministic ordering, and meta disclosure.
 */

import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import type {
  AssessmentSession,
  PHQ9Result,
  GAD7Result,
} from '@/features/assessment/types';
import { buildExportPayload } from '../exportService';
import { EXPORT_DISCLAIMER, EXPORT_OMISSIONS, EXPORT_SCHEMA_VERSION } from '../../types';

const DAY = 24 * 60 * 60 * 1000;
const FIXED_NOW = new Date('2026-06-08T12:00:00.000Z').getTime();

const ymd = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

function phq9Session(overrides: { completedAt: number; totalScore?: number; suicidalIdeation?: boolean; note?: string }): AssessmentSession {
  const result: PHQ9Result = {
    totalScore: overrides.totalScore ?? 8,
    severity: 'mild',
    isCrisis: (overrides.totalScore ?? 8) >= 20,
    suicidalIdeation: overrides.suicidalIdeation ?? false,
    completedAt: overrides.completedAt,
    answers: [
      { questionId: 'phq9_1', response: 1, timestamp: overrides.completedAt },
      { questionId: 'phq9_9', response: overrides.suicidalIdeation ? 2 : 0, timestamp: overrides.completedAt },
    ],
  };
  return {
    id: `phq9_${overrides.completedAt}`,
    type: 'phq9',
    progress: {
      type: 'phq9',
      currentQuestionIndex: 9,
      totalQuestions: 9,
      startedAt: overrides.completedAt - 1000,
      answers: result.answers,
      isComplete: true,
    },
    result,
    context: 'standalone',
    note: overrides.note,
  };
}

function gad7Session(overrides: { completedAt: number; totalScore?: number }): AssessmentSession {
  const result: GAD7Result = {
    totalScore: overrides.totalScore ?? 5,
    severity: 'mild',
    isCrisis: (overrides.totalScore ?? 5) >= 15,
    completedAt: overrides.completedAt,
    answers: [{ questionId: 'gad7_1', response: 1, timestamp: overrides.completedAt }],
  };
  return {
    id: `gad7_${overrides.completedAt}`,
    type: 'gad7',
    progress: {
      type: 'gad7',
      currentQuestionIndex: 7,
      totalQuestions: 7,
      startedAt: overrides.completedAt - 1000,
      answers: result.answers,
      isComplete: true,
    },
    result,
    context: 'standalone',
  };
}

const resetStores = () => {
  useAssessmentStore.setState({ completedAssessments: [] });
  useStoicPracticeStore.setState({
    virtueInstances: [],
    principleEngagements: [],
    checkInCompletions: [],
    weeklyReflections: [],
  });
};

describe('buildExportPayload', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
    resetStores();
  });

  afterEach(() => {
    jest.useRealTimers();
    resetStores();
  });

  describe('meta', () => {
    it('stamps schema version, exportedAt, disclaimer and the breathing omission', () => {
      const payload = buildExportPayload({ categories: ['assessments'], range: { preset: 'all' } });
      expect(payload.meta.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
      expect(payload.meta.exportedAt).toBe(FIXED_NOW);
      expect(payload.meta.disclaimer).toBe(EXPORT_DISCLAIMER);
      expect(payload.meta.omissions).toContain('breathing_session_log: not recorded in this version');
      expect(payload.meta.categories).toEqual(['assessments']);
    });

    it('reports dataRangeStart/End as null for empty data', () => {
      const payload = buildExportPayload({ categories: ['assessments'], range: { preset: 'all' } });
      expect(payload.assessments).toEqual([]);
      expect(payload.meta.dataRangeStart).toBeNull();
      expect(payload.meta.dataRangeEnd).toBeNull();
    });

    it('reports dataRangeStart/End from the oldest/newest INCLUDED records', () => {
      useAssessmentStore.setState({
        completedAssessments: [
          phq9Session({ completedAt: FIXED_NOW - 3 * DAY }),
          phq9Session({ completedAt: FIXED_NOW - 1 * DAY }),
        ],
      });
      const payload = buildExportPayload({ categories: ['assessments'], range: { preset: 'all' } });
      expect(payload.meta.dataRangeStart).toBe(FIXED_NOW - 3 * DAY);
      expect(payload.meta.dataRangeEnd).toBe(FIXED_NOW - 1 * DAY);
    });
  });

  describe('redaction (compliance: raw answers never exported)', () => {
    it('omits the answers[] array and emits only score/severity/flags', () => {
      useAssessmentStore.setState({
        completedAssessments: [phq9Session({ completedAt: FIXED_NOW - DAY, totalScore: 22, suicidalIdeation: true, note: 'rough week' })],
      });
      const payload = buildExportPayload({ categories: ['assessments'], range: { preset: 'all' } });
      const exported = payload.assessments![0];
      expect(exported).not.toHaveProperty('answers');
      expect(JSON.stringify(payload)).not.toContain('phq9_9');
      expect(exported).toEqual({
        type: 'phq9_wellness_screening',
        totalScore: 22,
        severity: 'mild',
        isCrisis: true,
        suicidalIdeation: true,
        completedAt: FIXED_NOW - DAY,
        note: 'rough week',
      });
    });

    it('maps gad7 type label and forces suicidalIdeation false', () => {
      useAssessmentStore.setState({
        completedAssessments: [gad7Session({ completedAt: FIXED_NOW - DAY, totalScore: 16 })],
      });
      const payload = buildExportPayload({ categories: ['assessments'], range: { preset: 'all' } });
      expect(payload.assessments![0].type).toBe('gad7_wellness_screening');
      expect(payload.assessments![0].suicidalIdeation).toBe(false);
      expect(payload.assessments![0].isCrisis).toBe(true);
    });

    it('exports the user note verbatim and omits it when absent', () => {
      useAssessmentStore.setState({
        completedAssessments: [
          phq9Session({ completedAt: FIXED_NOW - DAY, note: '  spaces & émojis 🌧️  ' }),
          phq9Session({ completedAt: FIXED_NOW - 2 * DAY }),
        ],
      });
      const payload = buildExportPayload({ categories: ['assessments'], range: { preset: 'all' } });
      const withNote = payload.assessments!.find((a) => a.note !== undefined);
      const without = payload.assessments!.find((a) => a.note === undefined);
      expect(withNote!.note).toBe('  spaces & émojis 🌧️  ');
      expect(without).toBeDefined();
    });
  });

  describe('category selection', () => {
    beforeEach(() => {
      useAssessmentStore.setState({ completedAssessments: [phq9Session({ completedAt: FIXED_NOW - DAY })] });
      useStoicPracticeStore.setState({
        checkInCompletions: [{ type: 'morning', completedAt: new Date(FIXED_NOW - DAY), date: ymd(FIXED_NOW - DAY) }],
        weeklyReflections: [{ id: 'r1', weekStartIso: ymd(FIXED_NOW - DAY), text: 'noted', savedAt: new Date(FIXED_NOW - DAY).toISOString() }],
      });
    });

    it('includes only requested categories', () => {
      const payload = buildExportPayload({ categories: ['assessments'], range: { preset: 'all' } });
      expect(payload.assessments).toBeDefined();
      expect(payload.checkIns).toBeUndefined();
      expect(payload.practices).toBeUndefined();
      expect(payload.reflections).toBeUndefined();
    });

    it('assembles multiple requested categories', () => {
      const payload = buildExportPayload({ categories: ['assessments', 'checkIns', 'reflections'], range: { preset: 'all' } });
      expect(payload.assessments).toHaveLength(1);
      expect(payload.checkIns).toHaveLength(1);
      expect(payload.reflections).toHaveLength(1);
      expect(payload.practices).toBeUndefined();
    });
  });

  describe('date-range filtering', () => {
    beforeEach(() => {
      useAssessmentStore.setState({
        completedAssessments: [
          phq9Session({ completedAt: FIXED_NOW - 2 * DAY }),
          phq9Session({ completedAt: FIXED_NOW - 20 * DAY }),
          phq9Session({ completedAt: FIXED_NOW - 60 * DAY }),
        ],
      });
    });

    it('last7 includes only records within 7 days', () => {
      const payload = buildExportPayload({ categories: ['assessments'], range: { preset: 'last7' } });
      expect(payload.assessments!.map((a) => a.completedAt)).toEqual([FIXED_NOW - 2 * DAY]);
    });

    it('last30 includes records within 30 days', () => {
      const payload = buildExportPayload({ categories: ['assessments'], range: { preset: 'last30' } });
      expect(payload.assessments!.map((a) => a.completedAt)).toEqual([FIXED_NOW - 2 * DAY, FIXED_NOW - 20 * DAY]);
    });

    it('all includes every record', () => {
      const payload = buildExportPayload({ categories: ['assessments'], range: { preset: 'all' } });
      expect(payload.assessments).toHaveLength(3);
    });

    it('custom {from,to} filters inclusively on the absolute bounds', () => {
      const from = FIXED_NOW - 25 * DAY;
      const to = FIXED_NOW - 15 * DAY;
      const payload = buildExportPayload({ categories: ['assessments'], range: { from, to } });
      expect(payload.assessments!.map((a) => a.completedAt)).toEqual([FIXED_NOW - 20 * DAY]);
      expect(payload.meta.requestedRange).toEqual({ from, to });
    });
  });

  describe('deterministic ordering', () => {
    it('orders assessments newest-first', () => {
      useAssessmentStore.setState({
        completedAssessments: [
          phq9Session({ completedAt: FIXED_NOW - 5 * DAY }),
          phq9Session({ completedAt: FIXED_NOW - 1 * DAY }),
          phq9Session({ completedAt: FIXED_NOW - 3 * DAY }),
        ],
      });
      const payload = buildExportPayload({ categories: ['assessments'], range: { preset: 'all' } });
      expect(payload.assessments!.map((a) => a.completedAt)).toEqual([
        FIXED_NOW - 1 * DAY,
        FIXED_NOW - 3 * DAY,
        FIXED_NOW - 5 * DAY,
      ]);
    });
  });

  describe('practices category', () => {
    it('exports principle engagements verbatim with normalized timestamps', () => {
      useStoicPracticeStore.setState({
        principleEngagements: [
          {
            principle: 'sphere_sovereignty',
            flowType: 'morning',
            engagementType: 'selected',
            date: ymd(FIXED_NOW - DAY),
            timestamp: new Date(FIXED_NOW - DAY),
          },
        ],
      });
      const payload = buildExportPayload({ categories: ['practices'], range: { preset: 'all' } });
      expect(payload.practices!.principleEngagements[0].principle).toBe('sphere_sovereignty');
      expect(payload.practices!.principleEngagements[0].timestamp).toBe(FIXED_NOW - DAY);
    });

    it('no longer emits a virtues member (MAINT-371, EXPORT_SCHEMA_VERSION 3)', () => {
      // The removal is the whole point of the v2 -> v3 bump, so assert the absence
      // directly rather than inferring it from the positive test above. `virtues`
      // was a REQUIRED member of ExportedPractices in v2, so a v2-shaped consumer
      // doing `payload.practices.virtues.map(...)` throws on a v3 file — which is
      // why this is a harder compat class than the additive v1 -> v2 widening.
      const payload = buildExportPayload({ categories: ['practices'], range: { preset: 'all' } });
      expect(payload.practices).toBeDefined();
      expect(payload.practices).not.toHaveProperty('virtues');
    });

    it('records the virtue log in EXPORT_OMISSIONS rather than dropping it silently', () => {
      // MAINT-358's lesson: an omission that is not disclosed reads as coverage.
      const payload = buildExportPayload({ categories: ['practices'], range: { preset: 'all' } });
      const omissions = JSON.stringify(payload.meta?.omissions ?? {});
      expect(omissions).toMatch(/virtue/i);
    });
  });
});
