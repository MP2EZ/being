/**
 * exportPdfDocument (FEAT-272 A1)
 *
 * Pure rendering of a redacted `ExportPayload` (FEAT-269's `buildExportPayload`)
 * to a self-contained HTML document that FEAT-806 hands to expo-print. No UI, no
 * file I/O, no logging, no store access: payload in, string out. Deliberately not
 * wired to any screen and not re-exported from a barrel, so it stays off every
 * eager module graph until the PDF path exists.
 *
 * `features/data-export/` is a crisis + compliance CONTENT Protected Path (exempt
 * from Phase 2.5): this file decides where the 988 support line sits in a
 * document the user may hand to someone else, and how the Q9 / support-tier flags
 * read there. The rulings it encodes (batch panel 2026-10-18) are pinned by
 * `__tests__/safety/exportPdfCrisisContent.test.ts`:
 *
 * - The support line is a fixed string, identical in every export, placed only
 *   after the opening disclaimer, before the first free-text section, and at the
 *   end. It is never adjacent to or conditional on a flagged row: a flag-triggered
 *   line would disclose the flag a second time and read as a clinical judgment.
 * - Flags render as fixed plain-language statements. No field names, raw Q9
 *   value, alarm vocabulary, counts, grouping or distinct styling; rows stay
 *   chronological.
 * - User free text is verbatim and HTML-escaped, and the document loads nothing
 *   (CSP `default-src 'none'`): an unescaped `<img src=…>` in a note would make
 *   the print WebView fetch it, sending wellness data off-device.
 * - No textual crisis scan runs over notes. Its recall is unmeasured, and a null
 *   scan would imply a check that does not exist.
 *
 * Imports nothing from `features/crisis/` (INFRA-531's import detector would
 * otherwise need an exemption entry for this file).
 */

import { semantic, spacing, typography } from '@/core/theme';
import { EXPORT_DISCLAIMER } from '../types';
import type {
  ExportDataCategory,
  ExportedAssessment,
  ExportedCheckIn,
  ExportedPrincipleEngagement,
  ExportedReflection,
  ExportPayload,
} from '../types';

/** Fixed support line (crisis ruling, exact text). Real, selectable text — never an image. */
export const EXPORT_SUPPORT_LINE =
  'If you are thinking about suicide or self-harm, or are in emotional distress, call or text ' +
  '988 (Suicide & Crisis Lifeline, US) — free, confidential, 24/7. If you are in immediate ' +
  'danger, call 911.';

/** Rendered for a PHQ-9 row whose Q9 response was above "Not at all". Never the raw value. */
export const Q9_RECORDED_STATEMENT =
  'Question 9 (thoughts of self-harm): a response other than "Not at all" was recorded.';

/**
 * Rendered for a row in the support-resources tier. `isCrisis` is score ≥15 OR Q9 >0
 * (`assessmentStore`), so the wording describes what the app did, which is true in
 * both cases, rather than claiming the score was in a range.
 */
export const SUPPORT_OFFERED_STATEMENT = 'Being offered support resources after this screening.';

export const SUMMARY_NOT_COMPLETE_HEADING = 'This PDF is a readable summary, not your complete copy';

const SUMMARY_LEAVES_OUT: readonly string[] = [
  'Voice journal entries',
  'Consent records',
  'Subscription state',
  'Individual screening answers',
  'Practice streaks and totals',
];

const DOCUMENT_TITLE = 'Being — wellness data summary';

const CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:";

const CATEGORY_LABEL: Record<ExportDataCategory, string> = {
  assessments: 'Wellness screenings',
  checkIns: 'Check-ins',
  practices: 'Practice engagements',
  reflections: 'Weekly reflections',
};

const SCREENING_LABEL: Record<ExportedAssessment['type'], string> = {
  phq9_wellness_screening: 'PHQ-9 wellness screening',
  gad7_wellness_screening: 'GAD-7 wellness screening',
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** `moderately_severe` → `Moderately severe`. Escaped, since enum values are data too. */
function humanise(value: string): string {
  const words = value.replace(/_/g, ' ');
  return escapeHtml(words.charAt(0).toUpperCase() + words.slice(1));
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Local calendar date, YYYY-MM-DD. */
function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Oldest first; never mutates the payload. */
function chronological<T>(rows: readonly T[], at: (row: T) => number): T[] {
  return [...rows].sort((a, b) => at(a) - at(b));
}

const hasText = (value: string | undefined): value is string =>
  typeof value === 'string' && value.trim() !== '';

const supportLine = (): string => `<p class="support">${escapeHtml(EXPORT_SUPPORT_LINE)}</p>`;

const disclaimerBlock = (): string =>
  `<section class="disclaimer"><p>${escapeHtml(EXPORT_DISCLAIMER)}</p></section>`;

function stylesheet(): string {
  const text = semantic.text.primary;
  const muted = semantic.text.secondary;
  const rule = semantic.border.strong;
  const band = semantic.background.secondary;
  const px = (n: number): string => `${n}px`;
  return [
    `@page { margin: ${px(spacing[48])} ${px(spacing[40])}; }`,
    `body { color: ${text}; background: ${semantic.background.primary}; font-family: -apple-system, Roboto, sans-serif; font-size: ${px(typography.bodySmall.size)}; line-height: 1.5; margin: 0; }`,
    `h1 { font-size: ${px(typography.headline2.size)}; font-weight: ${typography.fontWeight.semibold}; margin: 0 0 ${px(spacing[16])}; }`,
    `h2 { font-size: ${px(typography.headline4.size)}; font-weight: ${typography.fontWeight.semibold}; margin: ${px(spacing[24])} 0 ${px(spacing[8])}; page-break-after: avoid; }`,
    `p, ul { margin: 0 0 ${px(spacing[12])}; }`,
    `.disclaimer { background: ${band}; border: 1px solid ${rule}; padding: ${px(spacing[12])}; margin-bottom: ${px(spacing[16])}; }`,
    `.support { font-weight: ${typography.fontWeight.regular}; }`,
    `.meta { color: ${muted}; font-size: ${px(typography.caption.size)}; }`,
    `.empty { color: ${muted}; }`,
    `table { width: 100%; border-collapse: collapse; margin-bottom: ${px(spacing[16])}; }`,
    'thead { display: table-header-group; }',
    'tr { page-break-inside: avoid; }',
    `th, td { text-align: left; vertical-align: top; padding: ${px(spacing[4])} ${px(spacing[8])}; border-bottom: 1px solid ${rule}; }`,
    `th { font-weight: ${typography.fontWeight.semibold}; }`,
    '.verbatim { white-space: pre-wrap; word-break: break-word; }',
  ].join('\n');
}

function table(headers: readonly string[], rows: string[]): string {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function section(category: ExportDataCategory, body: string): string {
  return (
    `<section data-section="${category}"><h2>${escapeHtml(CATEGORY_LABEL[category])}</h2>` +
    `${body}</section>`
  );
}

const EMPTY = '<p class="empty">No entries in this range.</p>';

function assessmentsSection(rows: readonly ExportedAssessment[]): string {
  if (rows.length === 0) return section('assessments', EMPTY);
  const body = chronological(rows, (a) => a.completedAt).map((a) => {
    const details: string[] = [];
    if (a.suicidalIdeation) details.push(`<p>${escapeHtml(Q9_RECORDED_STATEMENT)}</p>`);
    if (a.isCrisis) details.push(`<p>${escapeHtml(SUPPORT_OFFERED_STATEMENT)}</p>`);
    if (hasText(a.note)) details.push(`<p class="verbatim">${escapeHtml(a.note)}</p>`);
    return (
      `<tr data-row="assessment" data-time="${a.completedAt}" class="row">` +
      `<td>${formatDate(a.completedAt)}</td>` +
      `<td>${escapeHtml(SCREENING_LABEL[a.type])}</td>` +
      `<td>${a.totalScore}</td>` +
      `<td>${humanise(a.severity)}</td>` +
      `<td>${details.join('')}</td></tr>`
    );
  });
  return section(
    'assessments',
    table(['Date', 'Wellness screening', 'Self-reported score', 'Band', 'Details and your note'], body),
  );
}

function checkInsSection(rows: readonly ExportedCheckIn[]): string {
  if (rows.length === 0) return section('checkIns', EMPTY);
  const body = chronological(rows, (c) => c.completedAt).map(
    (c) =>
      `<tr data-row="checkIn" data-time="${c.completedAt}" class="row">` +
      `<td>${formatDate(c.completedAt)}</td><td>${humanise(c.type)}</td></tr>`,
  );
  return section('checkIns', table(['Date', 'Check-in'], body));
}

function practicesSection(rows: readonly ExportedPrincipleEngagement[]): string {
  if (rows.length === 0) return section('practices', EMPTY);
  const body = chronological(rows, (p) => p.timestamp).map(
    (p) =>
      `<tr data-row="engagement" data-time="${p.timestamp}" class="row">` +
      `<td>${formatDate(p.timestamp)}</td><td>${humanise(p.principle)}</td>` +
      `<td>${humanise(p.engagementType)}</td><td>${humanise(p.flowType)}</td></tr>`,
  );
  return section('practices', table(['Date', 'Principle', 'Engagement', 'Session'], body));
}

function reflectionsSection(rows: readonly ExportedReflection[]): string {
  if (rows.length === 0) return section('reflections', EMPTY);
  const body = chronological(rows, (r) => r.savedAt).map(
    (r) =>
      `<tr data-row="reflection" data-time="${r.savedAt}" class="row">` +
      `<td>${escapeHtml(r.weekStartIso)}</td><td>${formatDate(r.savedAt)}</td>` +
      `<td class="verbatim">${escapeHtml(r.text)}</td></tr>`,
  );
  return section('reflections', table(['Week of', 'Saved', 'Your reflection'], body));
}

function aboutBlock(payload: ExportPayload): string {
  const { meta } = payload;
  const included = meta.categories.map((c) => escapeHtml(CATEGORY_LABEL[c])).join(', ');
  const covered =
    meta.dataRangeStart !== null && meta.dataRangeEnd !== null
      ? `${formatDate(meta.dataRangeStart)} to ${formatDate(meta.dataRangeEnd)}`
      : 'No records in the requested range';
  const omissions = meta.omissions.map((o) => `<li>${escapeHtml(o)}</li>`).join('');
  return (
    '<section class="about">' +
    `<p class="meta">Prepared ${formatDate(meta.exportedAt)} · Records from ${covered} · ` +
    `Included: ${included || 'none'}</p>` +
    (omissions ? `<p class="meta">Not recorded by Being:</p><ul class="meta">${omissions}</ul>` : '') +
    '</section>'
  );
}

function summaryNotice(): string {
  const items = SUMMARY_LEAVES_OUT.map((i) => `<li>${escapeHtml(i)}</li>`).join('');
  return (
    '<section class="summary">' +
    `<h2>${escapeHtml(SUMMARY_NOT_COMPLETE_HEADING)}</h2>` +
    `<p>It leaves out:</p><ul>${items}</ul>` +
    '<p>For your complete copy, use Export as JSON in the Being app.</p>' +
    '</section>'
  );
}

/**
 * Render the payload as a complete HTML document. Every record in the payload is
 * rendered; nothing is capped or summarised.
 */
export function buildExportHtml(payload: ExportPayload): string {
  const requested = new Set(payload.meta.categories);

  // Section order is fixed. A section is free text when it carries user-written
  // words: screenings with at least one note, or any reflection.
  const sections: { html: string; freeText: boolean }[] = [];
  if (requested.has('assessments')) {
    const rows = payload.assessments ?? [];
    sections.push({ html: assessmentsSection(rows), freeText: rows.some((a) => hasText(a.note)) });
  }
  if (requested.has('checkIns')) {
    sections.push({ html: checkInsSection(payload.checkIns ?? []), freeText: false });
  }
  if (requested.has('practices')) {
    sections.push({
      html: practicesSection(payload.practices?.principleEngagements ?? []),
      freeText: false,
    });
  }
  if (requested.has('reflections')) {
    const rows = payload.reflections ?? [];
    sections.push({ html: reflectionsSection(rows), freeText: rows.some((r) => hasText(r.text)) });
  }

  const firstFreeText = sections.findIndex((s) => s.freeText);
  const body = sections.map((s, i) => (i === firstFreeText ? supportLine() + s.html : s.html));

  return [
    '<!DOCTYPE html>',
    '<html lang="en"><head>',
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${CSP}">`,
    `<title>${escapeHtml(DOCUMENT_TITLE)}</title>`,
    `<style>${stylesheet()}</style>`,
    '</head><body>',
    `<h1>${escapeHtml(DOCUMENT_TITLE)}</h1>`,
    disclaimerBlock(),
    supportLine(),
    summaryNotice(),
    aboutBlock(payload),
    ...body,
    supportLine(),
    disclaimerBlock(),
    '</body></html>',
  ].join('\n');
}
