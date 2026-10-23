/**
 * FEAT-272 (A1) — crisis + compliance content pin for the PDF export document.
 *
 * `buildExportHtml` decides where the 988 support line appears in a document the
 * user may hand to someone else, and how the Q9 / support-tier flags read there.
 * `app/src/features/data-export/` is a content Protected Path exempt from the
 * Phase 2.5 Maestro gate (no flow can falsify document text), so this suite IS
 * the control. It runs under `test:safety` (precommit + CI).
 *
 * Rulings encoded (batch panel 2026-10-18):
 * - The support line is static and identical in every export, at exactly three
 *   places: right after the opening disclaimer, immediately before the first
 *   free-text section (when one exists), and at the end. It is never adjacent to,
 *   or triggered by, a flagged row (founder decision 2026-10-18: compliance's
 *   static-only placement over crisis's per-row proposal).
 * - Flags render as fixed plain-language statements; no field names, raw Q9
 *   value, alarm vocabulary, counts, grouping or distinct styling.
 * - User free text is verbatim and HTML-escaped; the document loads nothing.
 * - FEAT-806 (crisis + compliance ruling 2026-10-22): the PDF covers the last 90 days.
 *   The window is disclosed by two fixed strings, present in every export and never
 *   conditional on flagged or older rows, with no count. Free text is never truncated
 *   and screenings inside the window are never capped; only check-ins and practice
 *   engagements are, at a fixed most-recent limit stated in every export.
 *
 * Every assertion reads PRESENT output, so none can pass on an empty string.
 */

import {
  buildExportHtml,
  EXPORT_SUPPORT_LINE,
  PDF_COMPLETE_COPY_NOTE,
  PDF_ROW_CAP,
  PDF_ROW_CAP_NOTE,
  PDF_WINDOW_OMISSION,
  Q9_RECORDED_STATEMENT,
  SUPPORT_OFFERED_STATEMENT,
} from '@/features/data-export/services/exportPdfDocument';
import {
  EXPORT_DISCLAIMER,
  EXPORT_OMISSIONS,
  EXPORT_SCHEMA_VERSION,
  type ExportedAssessment,
  type ExportPayload,
} from '@/features/data-export/types';

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date('2026-03-02T12:00:00.000Z').getTime();

function meta(categories: ExportPayload['meta']['categories']): ExportPayload['meta'] {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: T0 + 60 * DAY,
    requestedRange: { from: 0, to: T0 + 60 * DAY },
    dataRangeStart: T0,
    dataRangeEnd: T0 + 50 * DAY,
    categories,
    disclaimer: EXPORT_DISCLAIMER,
    omissions: [...EXPORT_OMISSIONS],
  };
}

function screening(day: number, over: Partial<ExportedAssessment> = {}): ExportedAssessment {
  return {
    type: 'phq9_wellness_screening',
    totalScore: 6,
    severity: 'mild',
    isCrisis: false,
    suicidalIdeation: false,
    completedAt: T0 + day * DAY,
    ...over,
  };
}

/** Payload as buildExportPayload emits it: newest first. */
const FLAGGED_DAYS = [10, 30];
const full: ExportPayload = {
  meta: meta(['assessments', 'checkIns', 'practices', 'reflections']),
  assessments: [
    screening(40),
    screening(30, { totalScore: 21, severity: 'severe', isCrisis: true, suicidalIdeation: true }),
    screening(20, { type: 'gad7_wellness_screening', totalScore: 4, severity: 'minimal' }),
    screening(10, { totalScore: 5, isCrisis: true, suicidalIdeation: true }),
    screening(0),
  ],
  checkIns: [{ type: 'evening', date: '2026-03-05', completedAt: T0 + 3 * DAY }],
  practices: {
    principleEngagements: [
      { principle: 'aware_presence', flowType: 'morning', engagementType: 'applied', timestamp: T0 + 4 * DAY },
    ],
  },
  reflections: [{ weekStartIso: '2026-03-09', text: 'A quiet week of small walks.', savedAt: T0 + 12 * DAY }],
};

const checkInsOnly: ExportPayload = {
  meta: meta(['checkIns']),
  checkIns: [{ type: 'morning', date: '2026-03-03', completedAt: T0 + DAY }],
};

const empty: ExportPayload = {
  meta: { ...meta(['assessments', 'checkIns', 'practices', 'reflections']), dataRangeStart: null, dataRangeEnd: null },
  assessments: [],
  checkIns: [],
  practices: { principleEngagements: [] },
  reflections: [],
};

const indicesOf = (haystack: string, needle: string): number[] => {
  const out: number[] = [];
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + 1)) out.push(i);
  return out;
};

/** Escaped form of a fixed string as it appears in the HTML. */
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const SUPPORT = esc(EXPORT_SUPPORT_LINE);
const DISCLAIMER = esc(EXPORT_DISCLAIMER);

/** Index of the first rendered data row (any category). */
const firstDataRow = (html: string): number => html.indexOf('data-row="');
const lastDataRow = (html: string): number => html.lastIndexOf('data-row="');

describe('support line — placement and count', () => {
  it('names 988 as real text in the fixed line', () => {
    expect(EXPORT_SUPPORT_LINE).toContain('call or text 988');
    expect(EXPORT_SUPPORT_LINE).toContain('call 911');
  });

  it.each([
    ['full export with free text', full, true],
    ['check-ins-only export', checkInsOnly, false],
    ['empty export', empty, false],
  ])('%s: appears 2 + (hasFreeText ? 1 : 0) times', (_name, payload, hasFreeText) => {
    const html = buildExportHtml(payload);
    expect(indicesOf(html, SUPPORT)).toHaveLength(2 + (hasFreeText ? 1 : 0));
  });

  it.each([
    ['full', full],
    ['check-ins-only', checkInsOnly],
  ])('%s: first line precedes every data row and the last line follows every data row', (_n, payload) => {
    const html = buildExportHtml(payload);
    const lines = indicesOf(html, SUPPORT);
    expect(firstDataRow(html)).toBeGreaterThan(-1);
    expect(lines[0]).toBeLessThan(firstDataRow(html));
    expect(lines[lines.length - 1]).toBeGreaterThan(lastDataRow(html));
  });

  it('the first line directly follows the opening disclaimer', () => {
    const html = buildExportHtml(full);
    const firstDisclaimer = html.indexOf(DISCLAIMER);
    const firstLine = html.indexOf(SUPPORT);
    expect(firstDisclaimer).toBeGreaterThan(-1);
    expect(firstLine).toBeGreaterThan(firstDisclaimer);
    // Nothing but markup between them: no data, no other prose.
    const between = html.slice(firstDisclaimer + DISCLAIMER.length, firstLine).replace(/<[^>]*>/g, '').trim();
    expect(between).toBe('');
  });

  it('the middle line sits before the first free-text section, not beside a row', () => {
    const html = buildExportHtml({ ...full, assessments: full.assessments!.map((a) => ({ ...a, note: undefined })) });
    const lines = indicesOf(html, SUPPORT);
    expect(lines).toHaveLength(3);
    const reflectionsHeading = html.indexOf('data-section="reflections"');
    expect(reflectionsHeading).toBeGreaterThan(-1);
    expect(lines[1]).toBeLessThan(reflectionsHeading);
    // Section-level: no data row between the middle line and the reflections section.
    expect(html.slice(lines[1], reflectionsHeading)).not.toContain('data-row="');
  });

  it('a screening note makes the screenings section the first free-text section', () => {
    const withNote: ExportPayload = { ...full, assessments: [screening(5, { note: 'Slept poorly.' })], reflections: [] };
    const html = buildExportHtml(withNote);
    const lines = indicesOf(html, SUPPORT);
    expect(lines).toHaveLength(3);
    const screeningsSection = html.indexOf('data-section="assessments"');
    expect(lines[1]).toBeLessThan(screeningsSection);
    expect(html.slice(lines[1], screeningsSection)).not.toContain('data-row="');
  });

  it('is identical whether or not any row is flagged (never triggered by a flag)', () => {
    const unflagged: ExportPayload = {
      ...full,
      assessments: full.assessments!.map((a) => ({ ...a, isCrisis: false, suicidalIdeation: false })),
    };
    const flaggedCount = indicesOf(buildExportHtml(full), SUPPORT).length;
    expect(flaggedCount).toBe(3);
    expect(indicesOf(buildExportHtml(unflagged), SUPPORT)).toHaveLength(flaggedCount);
  });

  it('never sits inside or immediately after a flagged screening row', () => {
    const html = buildExportHtml(full);
    const rows = html.match(/<tr data-row="assessment"[\s\S]*?<\/tr>/g) ?? [];
    expect(rows).toHaveLength(full.assessments!.length);
    for (const row of rows) expect(row).not.toContain(SUPPORT);
    for (const row of rows.filter((r) => r.includes(esc(Q9_RECORDED_STATEMENT)))) {
      const after = html.slice(html.indexOf(row) + row.length, html.indexOf(row) + row.length + 200);
      expect(after).not.toContain(SUPPORT);
    }
  });
});

describe('90-day window disclosure (FEAT-806)', () => {
  const WINDOW = esc(PDF_WINDOW_OMISSION);
  const NOTE = esc(PDF_COMPLETE_COPY_NOTE);

  it.each([
    ['full', full],
    ['check-ins-only', checkInsOnly],
    ['empty', empty],
  ])('%s: both fixed strings appear exactly once', (_n, payload) => {
    const html = buildExportHtml(payload);
    expect(indicesOf(html, WINDOW)).toHaveLength(1);
    expect(indicesOf(html, NOTE)).toHaveLength(1);
  });

  it('is identical whether or not any row is flagged', () => {
    const unflagged: ExportPayload = {
      ...full,
      assessments: full.assessments!.map((a) => ({ ...a, isCrisis: false, suicidalIdeation: false })),
    };
    const block = (html: string): string => html.slice(html.indexOf('<section class="summary">'), html.indexOf('</section>', html.indexOf('<section class="summary">')));
    expect(block(buildExportHtml(full))).toContain(WINDOW);
    expect(block(buildExportHtml(full))).toBe(block(buildExportHtml(unflagged)));
  });

  it('carries no count and none of the flag statements', () => {
    for (const s of [PDF_WINDOW_OMISSION, PDF_COMPLETE_COPY_NOTE]) {
      expect(s.replace('90', '')).not.toMatch(/\d/);
      expect(s).not.toContain(Q9_RECORDED_STATEMENT);
      expect(s).not.toContain(SUPPORT_OFFERED_STATEMENT);
    }
  });

  it('never caps screenings or reflections, even past the check-in cap', () => {
    const many = PDF_ROW_CAP + 20;
    const html = buildExportHtml({
      ...full,
      assessments: Array.from({ length: many }, (_, i) =>
        screening(i, i % 9 === 0 ? { isCrisis: true, suicidalIdeation: true } : {}),
      ),
      reflections: Array.from({ length: many }, (_, i) => ({
        weekStartIso: '2026-03-09',
        text: `Reflection ${i}.`,
        savedAt: T0 + i * DAY,
      })),
    });
    expect(html.match(/data-row="assessment"/g)).toHaveLength(many);
    expect(html.match(/data-row="reflection"/g)).toHaveLength(many);
    expect(indicesOf(html, esc(Q9_RECORDED_STATEMENT))).toHaveLength(Math.ceil(many / 9));
  });

  it('states the cap identically whether or not any row is flagged, with no count of dropped rows', () => {
    const unflagged = buildExportHtml({
      ...full,
      assessments: full.assessments!.map((a) => ({ ...a, isCrisis: false, suicidalIdeation: false })),
    });
    const flagged = buildExportHtml(full);
    expect(indicesOf(flagged, esc(PDF_ROW_CAP_NOTE))).toHaveLength(2);
    expect(indicesOf(unflagged, esc(PDF_ROW_CAP_NOTE))).toHaveLength(2);
    expect(PDF_ROW_CAP_NOTE.replace(String(PDF_ROW_CAP), '')).not.toMatch(/\d/);
  });

  it('renders every in-window screening, untruncated notes included', () => {
    const LONG_NOTE = `${'word '.repeat(1200)}last sentence kept.`;
    const html = buildExportHtml({
      ...full,
      assessments: [...full.assessments!, screening(45, { note: LONG_NOTE })],
    });
    expect(html.match(/data-row="assessment"/g)).toHaveLength(full.assessments!.length + 1);
    expect(html).toContain(esc(LONG_NOTE));
  });
});

describe('disclaimer', () => {
  it.each([['full', full], ['empty', empty]])('%s: appears verbatim first and last', (_n, payload) => {
    const html = buildExportHtml(payload);
    const hits = indicesOf(html, DISCLAIMER);
    expect(hits).toHaveLength(2);
    expect(hits[0]).toBeLessThan(html.indexOf(SUPPORT));
    expect(hits[1]).toBeGreaterThan(html.lastIndexOf(SUPPORT));
  });
});

describe('flag wording', () => {
  const html = buildExportHtml(full);

  it('renders the fixed Q9 and support-tier statements once per flagged row', () => {
    expect(indicesOf(html, esc(Q9_RECORDED_STATEMENT))).toHaveLength(FLAGGED_DAYS.length);
    expect(indicesOf(html, esc(SUPPORT_OFFERED_STATEMENT))).toHaveLength(FLAGGED_DAYS.length);
  });

  it('uses no alarm, clinical or field-name vocabulary outside the support line and disclaimer', () => {
    const stripped = html.split(SUPPORT).join('').split(DISCLAIMER).join('');
    expect(stripped.length).toBeGreaterThan(1000);
    const banned =
      /crisis|suicidal|at risk|high risk|flagged|alert|warning|danger|emergency|positive|clinical|diagnosis|patient|\bphi\b|isCrisis|suicidalIdeation/i;
    expect(stripped).not.toMatch(banned);
  });

  it('never renders a raw Q9 response or per-question answers', () => {
    expect(html).toContain(esc(Q9_RECORDED_STATEMENT));
    // "Individual screening answers" is named only as something the summary leaves out.
    expect(html).toContain('Individual screening answers');
    expect(html).not.toMatch(/answers\[|questionId|phq9_\d|gad7_\d|response:\s*\d/i);
  });

  it('keeps screening rows chronological, with no grouping by flag', () => {
    const dates = [...html.matchAll(/<tr data-row="assessment" data-time="(\d+)"/g)].map((m) => Number(m[1]));
    expect(dates).toHaveLength(full.assessments!.length);
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
  });

  it('gives flagged rows the same markup class as unflagged rows', () => {
    const classes = [...html.matchAll(/<tr data-row="assessment"[^>]*class="([^"]*)"/g)].map((m) => m[1]);
    expect(classes).toHaveLength(full.assessments!.length);
    expect(new Set(classes).size).toBe(1);
  });
});

describe('free text is inert', () => {
  const hostile: ExportPayload = {
    ...full,
    assessments: [screening(1, { note: 'before <script>alert(1)</script> after' })],
    reflections: [{ weekStartIso: '2026-03-09', text: 'see <img src=https://x.example/p.png> & "quotes"', savedAt: T0 + 2 * DAY }],
  };
  const html = buildExportHtml(hostile);

  it('escapes markup in notes and reflections and keeps the words', () => {
    expect(html).toContain('before &lt;script&gt;alert(1)&lt;/script&gt; after');
    expect(html).toContain('see &lt;img src=https://x.example/p.png&gt; &amp; &quot;quotes&quot;');
  });

  it('emits no executable or fetching element', () => {
    expect(html).toContain('<tr data-row="assessment"');
    expect(html).not.toMatch(/<script|<img|<link|<iframe|<object|<embed|url\(/i);
  });

  it('references no external resource outside escaped user text', () => {
    const withoutUserText = html.split('see &lt;img src=https://x.example/p.png&gt; &amp; &quot;quotes&quot;').join('');
    expect(withoutUserText.length).toBeGreaterThan(1000);
    expect(withoutUserText).not.toMatch(/https?:/i);
  });

  it('declares a content security policy that blocks everything but inline style', () => {
    expect(html).toContain(`content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"`);
  });
});
