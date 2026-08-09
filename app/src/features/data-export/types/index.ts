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

import type { StoicPrinciple } from '@/features/practices/types/stoic';
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
 *
 * v3 (MAINT-371): `ExportedPractices.virtues` — a REQUIRED member of the v2 payload — is
 * removed, along with the `ExportedVirtue` type. This is a strictly harder compatibility
 * class than v2. v2 widened a value space: a stale reader still parses every field and at
 * worst mis-buckets a row. v3 removes a member: a v2-shaped consumer doing
 * `payload.practices.virtues.map(...)` gets `undefined` and throws. Widening degrades;
 * removal breaks.
 *
 * That said, do not read the paragraph above as describing a real migration risk here —
 * it describes the CLASS, so the next removal is judged against it correctly. The actual
 * blast radius of v3 is zero, and honesty about that matters more than the rhetoric:
 * `buildExportPayload` has NO production callers (FEAT-29 Slice B, the screen that would
 * call it, is unshipped), so no v2 file carrying `practices.virtues` has ever left a
 * device. There is no reader of this payload anywhere in the tree, and none outside it.
 * No back-compat reader is needed, and none could be written against a file that does not
 * exist. The version is bumped because the contract changed, not because anyone is
 * migrating. The removed data was empty in every case regardless — see the MAINT-320 /
 * MAINT-371 header in `stoicPracticeStore.ts` — and its absence is disclosed in
 * `EXPORT_OMISSIONS` below rather than left silent.
 */
export const EXPORT_SCHEMA_VERSION = 3;

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
 * Disclosed gaps: data a user might reasonably expect to find here and will not.
 * Rather than silently omit them, the export discloses each absence (compliance pass).
 *
 * `breathing_session_log`: the spec lists "breathing practice sessions" as exportable,
 * but no dedicated breathing-session log exists in this version.
 *
 * `virtue_practice_log` (MAINT-371): the store carried `virtueInstances` /
 * `virtueChallenges` arrays, so a v2 payload had a `practices.virtues` member — but no
 * writer for them ever reached production, so the arrays were empty in every build that
 * shipped. The wording is deliberately stronger than the breathing entry: "not recorded
 * in this version" would imply an earlier version did record it. None did.
 */
export const EXPORT_OMISSIONS: readonly string[] = [
  'breathing_session_log: not recorded in this version',
  'virtue_practice_log: never recorded in any shipped version',
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

export interface ExportedPrincipleEngagement {
  principle: StoicPrinciple;
  flowType: CheckInType;
  engagementType: PrincipleEngagementType;
  timestamp: number;
}

/**
 * MAINT-371: `virtues: ExportedVirtue[]` was removed at schema v3. Its absence is
 * disclosed in `EXPORT_OMISSIONS`, not left silent.
 */
export interface ExportedPractices {
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
