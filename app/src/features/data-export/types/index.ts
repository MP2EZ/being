/**
 * Data Export — types (FEAT-29 Slice 1)
 *
 * The export feature lets a user take their own wellness data off-device
 * (GDPR Art. 20 data portability / CCPA §1798.110 right to access). Generation
 * is fully client-side — these types describe the in-memory, REDACTED payload
 * that a later slice renders to a PDF. No raw per-question assessment answers
 * ever appear here (compliance ruling: the item-level PHQ-9 Q9 response must
 * never leave the device).
 *
 * Terminology is fixed by the compliance pass: "wellness data" (never "PHI"),
 * "wellness screening" (never "clinical assessment").
 */

import type {
  CardinalVirtue,
  PracticeDomain,
  StoicPrinciple,
} from '@/features/practices/types/stoic';
// CheckInType / PrincipleEngagementType are exported from the store module,
// not the types barrel.
import type {
  CheckInType,
  PrincipleEngagementType,
} from '@/features/practices/stores/stoicPracticeStore';

/**
 * Schema version stamped into every export so downstream readers can adapt.
 *
 * v2 (FEAT-298 slice 2): `CheckInType` gained 'daily' for the single daily ritual, so
 * `ExportedCheckIn.type` and `ExportedPrincipleEngagement.flowType` can now carry a value
 * no v1 reader knows. `exportService` passes `type` through without runtime narrowing, so
 * nothing would otherwise stop a 'daily' row landing in a file labelled v1.
 *
 * The version tracks the VALUE SPACE a reader must interpret, not just the JSON shape:
 * additive widening is compatible for parsing, but not for exhaustive interpretation — a
 * reader that switches on `type` (a future PDF renderer, or a user's own script) would
 * silently mis-bucket or drop 'daily' rows. Already-exported v1 files remain valid
 * archives of a closed value set; only new exports carry v2, so no payload migration.
 */
export const EXPORT_SCHEMA_VERSION = 2;

/**
 * Verbatim "not medical records" disclaimer (compliance pass, non-negotiable
 * wording). Carried in `meta` and surfaced in the eventual PDF.
 */
export const EXPORT_DISCLAIMER =
  'This export contains personal wellness data from the Being app. It does not ' +
  'constitute medical records, a clinical assessment, or a diagnosis. Being is a ' +
  'consumer wellness app, not a healthcare provider. PHQ-9 and GAD-7 results are ' +
  'self-monitoring wellness screenings, not clinical evaluations. Consult a ' +
  'qualified healthcare professional for any medical concerns.';

/**
 * Disclosed gap: the spec lists "breathing practice sessions" as exportable,
 * but no dedicated breathing-session log exists in this version. Rather than
 * silently omit it, the export discloses the absence (compliance pass).
 */
export const EXPORT_OMISSIONS: readonly string[] = [
  'breathing_session_log: not recorded in this version',
];

export type ExportDataCategory =
  | 'assessments'
  | 'checkIns'
  | 'practices'
  | 'reflections';

/** Preset windows resolve to absolute ms bounds at build time; `all` → from 0. */
export type ExportRangePreset = 'last7' | 'last30' | 'last90' | 'all';

export type ExportDateRange =
  | { preset: ExportRangePreset }
  | { from: number; to: number };

export interface ExportOptions {
  /** Which data categories to include; only those listed are assembled. */
  categories: ExportDataCategory[];
  /** Time window to include records from. */
  range: ExportDateRange;
}

/** Redacted assessment record — item-level `answers[]` are intentionally absent. */
export interface ExportedAssessment {
  type: 'phq9_wellness_screening' | 'gad7_wellness_screening';
  totalScore: number;
  severity: string;
  isCrisis: boolean;
  /** PHQ-9 Q9 elevated flag (always false for GAD-7); boolean only, never the raw response. */
  suicidalIdeation: boolean;
  completedAt: number;
  /** Optional user note, exported verbatim (OPAQUE — never transformed). */
  note?: string;
}

export interface ExportedCheckIn {
  type: CheckInType;
  date: string;
  completedAt: number;
}

export interface ExportedVirtue {
  virtue: CardinalVirtue;
  domain: PracticeDomain;
  /** Free-text situation note, exported verbatim. */
  context: string;
  principleApplied: string | null;
  timestamp: number;
}

export interface ExportedPrincipleEngagement {
  principle: StoicPrinciple;
  flowType: CheckInType;
  engagementType: PrincipleEngagementType;
  timestamp: number;
}

export interface ExportedPractices {
  virtues: ExportedVirtue[];
  principleEngagements: ExportedPrincipleEngagement[];
}

export interface ExportedReflection {
  weekStartIso: string;
  /** Free-text reflection, exported verbatim. */
  text: string;
  savedAt: number;
}

export interface ExportMeta {
  schemaVersion: number;
  /** When `buildExportPayload` was called. */
  exportedAt: number;
  /** The resolved window that was requested. */
  requestedRange: { from: number; to: number };
  /** Oldest/newest timestamp across INCLUDED records, or null when empty. */
  dataRangeStart: number | null;
  dataRangeEnd: number | null;
  categories: ExportDataCategory[];
  disclaimer: string;
  omissions: string[];
}

/** Assembled, redacted export. Category arrays are present only when requested. */
export interface ExportPayload {
  meta: ExportMeta;
  assessments?: ExportedAssessment[];
  checkIns?: ExportedCheckIn[];
  practices?: ExportedPractices;
  reflections?: ExportedReflection[];
}
