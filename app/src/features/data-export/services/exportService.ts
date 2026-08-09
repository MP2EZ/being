/**
 * exportService (FEAT-29 Slice 1)
 *
 * Pure, synchronous gathering of a user's own wellness data into a redacted
 * `ExportPayload`. This is the foundation for the client-side PDF export added
 * in a later slice — there is no UI, file I/O, network, or store mutation here
 * (compliance pass: the build step has no side effects; the audit obligation
 * attaches to the later *delivery* action).
 *
 * Filtering is authoritative on absolute ms bounds: store selectors are used to
 * fetch a generous superset (so we stay decoupled from each store's internal
 * retention/cutoff rules), then the resolved `[from, to]` window is applied here
 * and reflected honestly in `meta`. Bounds are absolute instants, so unlike the
 * stores' today-relative local-date cutoffs there is no near-midnight drift.
 */

import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import type { AssessmentSession, PHQ9Result } from '@/features/assessment/types';
import {
  EXPORT_DISCLAIMER,
  EXPORT_OMISSIONS,
  EXPORT_SCHEMA_VERSION,
  type ExportDateRange,
  type ExportedAssessment,
  type ExportedCheckIn,
  type ExportedPractices,
  type ExportedReflection,
  type ExportOptions,
  type ExportPayload,
} from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

const PRESET_DAYS: Record<'last7' | 'last30' | 'last90', number> = {
  last7: 7,
  last30: 30,
  last90: 90,
};

/** Normalize a stored timestamp (ms number, Date, or ISO/date string) to ms. */
function toMs(value: number | string | Date): number {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  return new Date(value).getTime();
}

function resolveRange(range: ExportDateRange, now: number): { from: number; to: number } {
  if ('preset' in range) {
    if (range.preset === 'all') return { from: 0, to: now };
    return { from: now - PRESET_DAYS[range.preset] * DAY_MS, to: now };
  }
  return { from: range.from, to: range.to };
}

const within = (ms: number, from: number, to: number): boolean => ms >= from && ms <= to;

function redactAssessment(session: AssessmentSession): ExportedAssessment | null {
  const result = session.result;
  if (!result) return null; // incomplete session — nothing to export
  // `suicidalIdeation` exists on PHQ-9 results only; never the raw Q9 response.
  const suicidalIdeation = (result as PHQ9Result).suicidalIdeation ?? false;
  const exported: ExportedAssessment = {
    type: session.type === 'phq9' ? 'phq9_wellness_screening' : 'gad7_wellness_screening',
    totalScore: result.totalScore,
    severity: result.severity,
    isCrisis: result.isCrisis,
    suicidalIdeation,
    completedAt: result.completedAt,
  };
  if (session.note !== undefined) exported.note = session.note; // verbatim, OPAQUE
  return exported;
}

export function buildExportPayload(options: ExportOptions): ExportPayload {
  const now = Date.now();
  const { from, to } = resolveRange(options.range, now);
  // Generous fetch span; the absolute [from, to] filter below is authoritative.
  const fetchDays = Math.ceil((now - from) / DAY_MS) + 2;
  const categories = new Set(options.categories);

  const payload: ExportPayload = {
    meta: {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: now,
      requestedRange: { from, to },
      dataRangeStart: null,
      dataRangeEnd: null,
      categories: options.categories,
      disclaimer: EXPORT_DISCLAIMER,
      omissions: [...EXPORT_OMISSIONS],
    },
  };

  const includedTimestamps: number[] = [];

  if (categories.has('assessments')) {
    const assessments = useAssessmentStore
      .getState()
      .getAssessmentHistory()
      .map(redactAssessment)
      .filter((a): a is ExportedAssessment => a !== null && within(a.completedAt, from, to))
      .sort((a, b) => b.completedAt - a.completedAt);
    assessments.forEach((a) => includedTimestamps.push(a.completedAt));
    payload.assessments = assessments;
  }

  if (categories.has('checkIns')) {
    const checkIns: ExportedCheckIn[] = useStoicPracticeStore
      .getState()
      .getCheckInHistory(fetchDays)
      .map((c) => ({ type: c.type, date: c.date, completedAt: toMs(c.completedAt) }))
      .filter((c) => within(c.completedAt, from, to))
      .sort((a, b) => b.completedAt - a.completedAt);
    checkIns.forEach((c) => includedTimestamps.push(c.completedAt));
    payload.checkIns = checkIns;
  }

  if (categories.has('practices')) {
    const state = useStoicPracticeStore.getState();
    // MAINT-371 (export schema v3): the `virtues` block that stood here is gone with
    // the store state it read. Disclosed via EXPORT_OMISSIONS, not silently dropped.
    const principleEngagements: ExportedPractices['principleEngagements'] = state
      .getPrincipleEngagements(fetchDays)
      .map((p) => ({
        principle: p.principle,
        flowType: p.flowType,
        engagementType: p.engagementType,
        timestamp: toMs(p.timestamp),
      }))
      .filter((p) => within(p.timestamp, from, to))
      .sort((a, b) => b.timestamp - a.timestamp);
    principleEngagements.forEach((p) => includedTimestamps.push(p.timestamp));
    payload.practices = { principleEngagements };
  }

  if (categories.has('reflections')) {
    const reflections: ExportedReflection[] = useStoicPracticeStore
      .getState()
      .weeklyReflections.map((r) => ({
        weekStartIso: r.weekStartIso,
        text: r.text, // verbatim, OPAQUE
        savedAt: toMs(r.savedAt),
      }))
      .filter((r) => within(r.savedAt, from, to))
      .sort((a, b) => b.savedAt - a.savedAt);
    reflections.forEach((r) => includedTimestamps.push(r.savedAt));
    payload.reflections = reflections;
  }

  if (includedTimestamps.length > 0) {
    payload.meta.dataRangeStart = Math.min(...includedTimestamps);
    payload.meta.dataRangeEnd = Math.max(...includedTimestamps);
  }

  return payload;
}
