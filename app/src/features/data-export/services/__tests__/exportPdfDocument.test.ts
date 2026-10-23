/**
 * exportPdfDocument — unit tests (FEAT-272 A1, test-first).
 *
 * Structure, escaping and completeness of the HTML that a later slice (FEAT-806)
 * hands to expo-print. The crisis/compliance content contract (988 placement,
 * flag wording) is pinned separately in
 * `__tests__/safety/exportPdfCrisisContent.test.ts`.
 */

import {
  buildExportHtml,
  escapeHtml,
  PDF_COMPLETE_COPY_NOTE,
  PDF_RANGE_PRESET,
  PDF_WINDOW_OMISSION,
  SUMMARY_NOT_COMPLETE_HEADING,
} from '../exportPdfDocument';
import {
  EXPORT_DISCLAIMER,
  EXPORT_OMISSIONS,
  EXPORT_SCHEMA_VERSION,
  type ExportPayload,
} from '../../types';

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date('2026-01-05T12:00:00.000Z').getTime();

function basePayload(over: Partial<ExportPayload> = {}): ExportPayload {
  return {
    meta: {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: T0 + 100 * DAY,
      requestedRange: { from: 0, to: T0 + 100 * DAY },
      dataRangeStart: T0,
      dataRangeEnd: T0 + 90 * DAY,
      categories: ['assessments', 'checkIns', 'practices', 'reflections'],
      disclaimer: EXPORT_DISCLAIMER,
      omissions: [...EXPORT_OMISSIONS],
    },
    ...over,
  };
}

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;',
    );
  });

  it('leaves ordinary text untouched', () => {
    expect(escapeHtml('A calm morning — 5 minutes.')).toBe('A calm morning — 5 minutes.');
  });
});

describe('document shell', () => {
  const html = buildExportHtml(basePayload());

  it('is a complete UTF-8 HTML document with a non-identifying title', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toMatch(/<title>Being — wellness data summary<\/title>/);
    expect(html.trim().endsWith('</html>')).toBe(true);
  });

  it('paginates with print CSS rather than progressive rendering', () => {
    expect(html).toContain('@page');
    expect(html).toContain('display: table-header-group');
    expect(html).toContain('page-break-inside: avoid');
  });

  it('takes colours from theme tokens, not literals of its own', () => {
    // Every hex value in the stylesheet must be a design-system token value.
    const { colorSystem } = jest.requireActual('@/core/theme');
    const tokenHexes = new Set(
      [colorSystem.base.black, colorSystem.base.white, ...Object.values(colorSystem.gray)].map((h: unknown) =>
        String(h).toUpperCase(),
      ),
    );
    const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
    const used = css.match(/#[0-9a-f]{3,8}\b/gi) ?? [];
    expect(used.length).toBeGreaterThan(0);
    for (const hex of used) expect(tokenHexes).toContain(hex.toUpperCase());
  });
});

describe('completeness disclosure', () => {
  const html = buildExportHtml(basePayload());

  it('states that the PDF is a summary and points to the JSON export', () => {
    expect(html).toContain(escapeHtml(SUMMARY_NOT_COMPLETE_HEADING));
    expect(html).toContain('Export as JSON');
  });

  it.each(['Voice journal entries', 'Consent records', 'Subscription state', 'Individual screening answers', 'Practice streaks and totals', 'more than 90 days before'])(
    'lists what the summary leaves out: %s',
    (item) => {
      expect(html).toContain(item);
    },
  );

  it('renders every meta omission verbatim', () => {
    for (const omission of EXPORT_OMISSIONS) expect(html).toContain(escapeHtml(omission));
  });
});

describe('the 90-day window (FEAT-806)', () => {
  const html = buildExportHtml(basePayload());

  it('is the last90 preset, and the fixed omission line names the same 90 days', () => {
    expect(PDF_RANGE_PRESET).toBe('last90');
    expect(PDF_WINDOW_OMISSION).toBe(
      'Anything recorded more than 90 days before this PDF was prepared, including earlier ' +
        'wellness screenings and weekly reflections',
    );
  });

  it('lists the window among what the summary leaves out', () => {
    const list = html.slice(html.indexOf('It leaves out:'), html.indexOf('</ul>', html.indexOf('It leaves out:')));
    expect(list).toContain(`<li>${escapeHtml(PDF_WINDOW_OMISSION)}</li>`);
  });

  it('says an absent screening or reflection may be in the complete copy, before the JSON pointer', () => {
    expect(PDF_COMPLETE_COPY_NOTE).toBe('A screening or reflection not shown here may still be in your complete copy.');
    const note = html.indexOf(escapeHtml(PDF_COMPLETE_COPY_NOTE));
    expect(note).toBeGreaterThan(-1);
    expect(note).toBeLessThan(html.indexOf('For your complete copy, use Export as JSON'));
  });

  it('states the requested window from meta.requestedRange, not only the records found', () => {
    const from = T0 + 10 * DAY;
    const to = T0 + 100 * DAY;
    const windowed = buildExportHtml(basePayload({ meta: { ...basePayload().meta, requestedRange: { from, to } } }));
    const ymd = (ms: number): string => {
      const d = new Date(ms);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    expect(windowed).toContain(`Covers ${ymd(from)} to ${ymd(to)}`);
  });
});

describe('records', () => {
  it('renders a section only for requested categories, with an explicit empty state', () => {
    const html = buildExportHtml(
      basePayload({ meta: { ...basePayload().meta, categories: ['checkIns'] }, checkIns: [] }),
    );
    expect(html).toContain('data-section="checkIns"');
    expect(html).not.toContain('data-section="assessments"');
    expect(html).toContain('No entries in this range.');
  });

  it('humanises enum values and severity bands', () => {
    const html = buildExportHtml(
      basePayload({
        assessments: [
          {
            type: 'phq9_wellness_screening',
            totalScore: 16,
            severity: 'moderately_severe',
            isCrisis: false,
            suicidalIdeation: false,
            completedAt: T0,
          },
        ],
        practices: {
          principleEngagements: [
            { principle: 'sphere_sovereignty', flowType: 'evening', engagementType: 'reflected', timestamp: T0 },
          ],
        },
      }),
    );
    expect(html).toContain('PHQ-9 wellness screening');
    expect(html).toContain('Moderately severe');
    expect(html).toContain('Sphere sovereignty');
    expect(html).not.toMatch(/moderately_severe|sphere_sovereignty|phq9_wellness_screening/);
  });

  it('keeps reflection text verbatim, line breaks included', () => {
    const text = 'Line one.\nLine two, unchanged.';
    const html = buildExportHtml(
      basePayload({ reflections: [{ weekStartIso: '2026-01-05', text, savedAt: T0 }] }),
    );
    expect(html).toContain(escapeHtml(text));
  });

  it('renders oldest first within each section', () => {
    const html = buildExportHtml(
      basePayload({
        checkIns: [
          { type: 'evening', date: '2026-01-07', completedAt: T0 + 2 * DAY },
          { type: 'morning', date: '2026-01-05', completedAt: T0 },
        ],
      }),
    );
    const times = [...html.matchAll(/<tr data-row="checkIn" data-time="(\d+)"/g)].map((m) => Number(m[1]));
    expect(times).toEqual([T0, T0 + 2 * DAY]);
  });
});

describe('three-year payload budget', () => {
  // ~3 years: three check-ins and three engagements a day, biweekly PHQ-9 and
  // GAD-7, weekly reflections of ~1,500 characters.
  const days = 3 * 365;
  const payload = basePayload({
    assessments: Array.from({ length: Math.floor(days / 7) }, (_, i) => ({
      type: i % 2 === 0 ? ('phq9_wellness_screening' as const) : ('gad7_wellness_screening' as const),
      totalScore: i % 27,
      severity: 'mild',
      isCrisis: i % 13 === 0,
      suicidalIdeation: i % 26 === 0,
      completedAt: T0 + i * 7 * DAY,
      note: i % 3 === 0 ? `Note ${i}: ${'steady breath. '.repeat(10)}` : undefined,
    })),
    checkIns: Array.from({ length: days * 3 }, (_, i) => ({
      type: (['morning', 'midday', 'evening'] as const)[i % 3],
      date: new Date(T0 + Math.floor(i / 3) * DAY).toISOString().slice(0, 10),
      completedAt: T0 + Math.floor(i / 3) * DAY + (i % 3) * 3600_000,
    })),
    practices: {
      principleEngagements: Array.from({ length: days * 3 }, (_, i) => ({
        principle: 'aware_presence' as const,
        flowType: 'morning' as const,
        engagementType: 'applied' as const,
        timestamp: T0 + Math.floor(i / 3) * DAY + i,
      })),
    },
    reflections: Array.from({ length: Math.floor(days / 7) }, (_, i) => ({
      weekStartIso: new Date(T0 + i * 7 * DAY).toISOString().slice(0, 10),
      text: 'This week I practised returning to the breath. '.repeat(32),
      savedAt: T0 + i * 7 * DAY + DAY,
    })),
  });

  it('renders every record — nothing is dropped', () => {
    const html = buildExportHtml(payload);
    const count = (row: string): number => (html.match(new RegExp(`data-row="${row}"`, 'g')) ?? []).length;
    expect(count('assessment')).toBe(payload.assessments!.length);
    expect(count('checkIn')).toBe(payload.checkIns!.length);
    expect(count('engagement')).toBe(payload.practices!.principleEngagements.length);
    expect(count('reflection')).toBe(payload.reflections!.length);
  });

  it('builds within the size and time budget', () => {
    const start = Date.now();
    const html = buildExportHtml(payload);
    const elapsed = Date.now() - start;
    expect(html.length).toBeGreaterThan(1_000_000);
    expect(html.length).toBeLessThan(4_000_000);
    expect(elapsed).toBeLessThan(1_000);
  });
});
