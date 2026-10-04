/**
 * Assessment-history retention rules (DEBUG-705).
 *
 * Pure functions over PERSISTED assessment records, shared by the daily disk
 * sweep (`DataRetentionService.cleanupAssessmentData`) and the assessment
 * store's hydration filter, so the two can never disagree about what expires.
 *
 * TIERS (privacy-policy §7.1 / §7.2, ruled by compliance + crisis):
 * - 3 years: PHQ-9 Q9 > 0 at any total, PHQ-9 total ≥ 20, GAD-7 total ≥ 15 —
 *   exactly `isInterventionTier(detectCrisis())`, via `isInterventionTierScore`.
 * - 90 days: everything else, INCLUDING PHQ-9 15–19. The stored `result.isCrisis`
 *   is deliberately not read: it fires at the PHQ-9 ≥ 15 support floor, and
 *   honouring it kept 15–19 records for 3 years against the published 90 days.
 *
 * FAIL-SAFE: a record whose tier or age cannot be established is KEPT. Deleting
 * wellness data early is irreversible; keeping a malformed record is not.
 */

import { isInterventionTierScore } from '@/features/crisis/types/safety';

type ScreeningType = Parameters<typeof isInterventionTierScore>[0];

export interface AssessmentRetentionPeriods {
  /** Non-crisis records (§7.1). */
  defaultMs: number;
  /** Crisis-tier records (§7.2). */
  crisisMs: number;
}

export type AssessmentRetentionTier = 'ninety_day' | 'three_year';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The published periods. Defined here, not imported from DataRetentionService,
 * so the assessment store can apply them at hydration without loading the
 * service. Pinned equal to DATA_RETENTION_CONFIG by the live-path suite.
 */
export const ASSESSMENT_RETENTION_PERIODS: AssessmentRetentionPeriods = {
  defaultMs: 90 * DAY_MS,
  crisisMs: 3 * 365 * DAY_MS,
};

const Q9_QUESTION_ID = 'phq9_9';

type Loose = Record<string, unknown>;

const isObject = (v: unknown): v is Loose => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function arrayAt(parent: unknown, key: string): unknown[] | null {
  return isObject(parent) && Array.isArray(parent[key]) ? (parent[key] as unknown[]) : null;
}

function answersOf(record: Loose): unknown[] {
  return arrayAt(record['result'], 'answers') ?? arrayAt(record['progress'], 'answers') ?? [];
}

function screeningType(record: Loose): ScreeningType | null {
  const raw = typeof record['type'] === 'string' ? record['type'].toLowerCase() : null;
  if (raw === 'phq9' || raw === 'gad7') return raw;
  // Older records may lack `type`; only a PHQ-9 result carries suicidalIdeation.
  if (isObject(record['result']) && 'suicidalIdeation' in record['result']) return 'phq9';
  return null;
}

function q9Positive(record: Loose): boolean {
  const result = isObject(record['result']) ? record['result'] : null;
  if (result?.['suicidalIdeation'] === true) return true;
  return answersOf(record).some(
    (a) => isObject(a) && a['questionId'] === Q9_QUESTION_ID && (finite(a['response']) ?? 0) > 0
  );
}

function totalScore(record: Loose): number | null {
  const result = isObject(record['result']) ? record['result'] : null;
  const stored = finite(result?.['totalScore']);
  if (stored !== null) return stored;
  const responses = answersOf(record).map((a) => (isObject(a) ? finite(a['response']) : null));
  if (responses.length === 0 || responses.some((r) => r === null)) return null;
  return (responses as number[]).reduce((sum, r) => sum + r, 0);
}

/** Which retention period applies. Undeterminable type or score → three_year. */
export function retentionTier(record: unknown): AssessmentRetentionTier {
  if (!isObject(record)) return 'three_year';
  const type = screeningType(record);
  const q9 = q9Positive(record);
  if (q9) return 'three_year';
  const total = totalScore(record);
  if (type === null || total === null) return 'three_year';
  return isInterventionTierScore(type, total, q9) ? 'three_year' : 'ninety_day';
}

/**
 * The record's age anchor: when the screening started, falling back to when it
 * completed. Started-at is earlier, so this errs toward earlier deletion — the
 * safe direction under a policy stating a maximum.
 */
function recordedAt(record: Loose): number | null {
  const progress = isObject(record['progress']) ? record['progress'] : null;
  const result = isObject(record['result']) ? record['result'] : null;
  return finite(progress?.['startedAt']) ?? finite(result?.['completedAt']);
}

/** False only when the record is provably past its period. */
export function shouldRetainAssessment(
  record: unknown,
  nowMs: number,
  periods: AssessmentRetentionPeriods
): boolean {
  if (!isObject(record)) return true;
  const at = recordedAt(record);
  if (at === null) return true;
  const period = retentionTier(record) === 'three_year' ? periods.crisisMs : periods.defaultMs;
  return at >= nowMs - period;
}

export interface AssessmentBlobPrune {
  /** The blob to write back, in the shape it was read; every other field intact. */
  blob: unknown;
  removed: number;
}

/**
 * Prune `completedAssessments` inside a persisted assessment blob. Handles both
 * shapes written to the same key: flat `{completedAssessments, ...}` from
 * saveProgress, and `{state: {completedAssessments, ...}, version}` from the
 * zustand persist middleware. Returns null for a shape it does not recognise —
 * the caller leaves such a blob untouched.
 */
export function pruneAssessmentBlob(
  blob: unknown,
  nowMs: number,
  periods: AssessmentRetentionPeriods
): AssessmentBlobPrune | null {
  if (!isObject(blob)) return null;

  const prune = (list: unknown[]): unknown[] => list.filter((r) => shouldRetainAssessment(r, nowMs, periods));

  if (isObject(blob['state'])) {
    const state = blob['state'];
    if (!Array.isArray(state['completedAssessments'])) return { blob, removed: 0 };
    const kept = prune(state['completedAssessments']);
    return {
      blob: { ...blob, state: { ...state, completedAssessments: kept } },
      removed: state['completedAssessments'].length - kept.length,
    };
  }

  if (!Array.isArray(blob['completedAssessments'])) return { blob, removed: 0 };
  const kept = prune(blob['completedAssessments']);
  return {
    blob: { ...blob, completedAssessments: kept },
    removed: blob['completedAssessments'].length - kept.length,
  };
}
