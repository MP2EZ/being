/**
 * Unit tests for the pure functions of scripts/legal-site-freshness.js
 * (MAINT-743 / TEST-41).
 *
 * The script's main() is behind `require.main`, so requiring it makes no network
 * call. Fixtures are inline synthetic HTML and markdown. These tests PIN CURRENT
 * BEHAVIOUR, including two known quirks (headerValue has no word boundary;
 * firstDivergence's "(none ...)" label) — they are not a statement that the
 * quirks are desirable.
 */

const {
  extractRenderedArticle,
  decodeEntities,
  normalizeWords,
  liveProseFingerprint,
  sourceProseFingerprint,
  hash,
  headerValue,
  liveHeaders,
  sourceHeaders,
  firstDivergence,
} = require('../../../scripts/legal-site-freshness');

const page = (articleInner, extra = '') =>
  `<html><head><style>.x{color:red}</style></head><body><nav>Site nav chrome</nav>` +
  `<article class="prose legal-content wide">${articleInner}</article>${extra}<footer>Footer chrome</footer></body></html>`;

describe('extractRenderedArticle', () => {
  it('returns only the legal-content article, not the surrounding chrome', () => {
    const inner = extractRenderedArticle(page('<p>Hello policy</p>'));
    expect(inner).toBe('<p>Hello policy</p>');
    expect(inner).not.toMatch(/chrome/);
  });

  it('drops the duplicated RSC flight payload carried in <script> blocks', () => {
    const html = page(
      '<p>Real prose</p>',
      '<script>self.__next_f.push([1,"&lt;p&gt;Real prose&lt;/p&gt; DUPLICATE"])</script>'
    );
    expect(extractRenderedArticle(html)).toBe('<p>Real prose</p>');
    expect(liveProseFingerprint(html)).toBe('real prose');
  });

  it('removes a <script> placed inside the article itself', () => {
    const html = page('<p>Keep</p><script>var leaked = "SCRIPTTEXT";</script><p>this</p>');
    expect(extractRenderedArticle(html)).toBe('<p>Keep</p><p>this</p>');
  });

  it('throws an actionable error when the article markup is absent', () => {
    expect(() => extractRenderedArticle('<html><body><article class="other">x</article></body></html>')).toThrow(
      /could not locate <article class="legal-content">/
    );
  });
});

describe('decodeEntities', () => {
  it('decodes named, decimal and hex entities', () => {
    expect(decodeEntities('A &amp; B')).toBe('A & B');
    expect(decodeEntities('it&#8217;s')).toBe('it’s');
    expect(decodeEntities('it&rsquo;s')).toBe('it’s');
    expect(decodeEntities('&#x2014;&mdash;')).toBe('——');
    expect(decodeEntities('&lt;b&gt; &quot;q&quot; &apos;a&apos;')).toBe('<b> "q" \'a\'');
  });

  it('is case-insensitive on names and leaves unknown entities untouched', () => {
    expect(decodeEntities('&AMP;')).toBe('&');
    expect(decodeEntities('&notanentity;')).toBe('&notanentity;');
  });

  it('makes the decimal and named forms of an apostrophe fingerprint identically', () => {
    const a = liveProseFingerprint(page('<p>Don&#8217;t share</p>'));
    const b = liveProseFingerprint(page('<p>Don&rsquo;t share</p>'));
    expect(a).toBe(b);
  });
});

describe('normalizeWords', () => {
  it('keeps lowercase alphanumeric runs and drops all punctuation and whitespace shape', () => {
    expect(normalizeWords('  **Hello,** World -- 42!\n\t|x|  ')).toBe('hello world 42 x');
    expect(normalizeWords('')).toBe('');
  });
});

describe('sourceProseFingerprint', () => {
  it('drops ordered-list markers but keeps numerals in ATX headings', () => {
    const md = ['## 1. Introduction', '', '1. First item', '2. Second item', '   3. Indented item'].join('\n');
    expect(sourceProseFingerprint(md)).toBe('1 introduction first item second item indented item');
  });

  it('keeps link text and drops the URL', () => {
    expect(sourceProseFingerprint('See [our policy](https://example.test/p) now')).toBe('see our policy now');
  });

  it('drops fenced code blocks entirely', () => {
    expect(sourceProseFingerprint('before\n```\nSECRET code\n```\nafter')).toBe('before after');
  });

  it('matches the live fingerprint of the equivalent rendered HTML', () => {
    const md = [
      '## 1. Introduction',
      '',
      '1. We collect **data** & use it.',
      '2. See [terms](https://example.test/t).',
    ].join('\n');
    const html = page(
      '<h2>1. Introduction</h2><ol><li>We collect <strong>data</strong> &amp; use it.</li>' +
        '<li>See <a href="https://example.test/t">terms</a>.</li></ol>'
    );
    expect(liveProseFingerprint(html)).toBe(sourceProseFingerprint(md));
  });

  it('reports drift when a heading numeral is missing from the rendered side', () => {
    const md = '## 2. Scope\n\nText';
    const html = page('<h2>Scope</h2><p>Text</p>');
    expect(liveProseFingerprint(html)).not.toBe(sourceProseFingerprint(md));
  });
});

describe('hash', () => {
  it('is a stable 16-char hex prefix', () => {
    expect(hash('abc')).toMatch(/^[0-9a-f]{16}$/);
    expect(hash('abc')).toBe(hash('abc'));
    expect(hash('abc')).not.toBe(hash('abd'));
  });
});

describe('headerValue', () => {
  it('captures the value after the label, with or without a colon', () => {
    expect(headerValue('Version: 2.3', 'Version')).toBe('2.3');
    expect(headerValue('Version 2.3', 'Version')).toBe('2.3');
    expect(headerValue('VERSION:   2.3', 'Version')).toBe('2.3');
  });

  it('collapses internal whitespace and trims', () => {
    expect(headerValue('Last Updated:   June   1,\t2026  ', 'Last Updated')).toBe('June 1, 2026');
  });

  it('takes the first match only', () => {
    expect(headerValue('Version: 1.0\nVersion: 2.0', 'Version')).toBe('1.0');
  });

  it('returns null when the label is absent', () => {
    expect(headerValue('nothing here', 'Version')).toBeNull();
  });

  it('PINS: has no word boundary, so a longer word starting with the label matches', () => {
    expect(headerValue('Versioning policy', 'Version')).toBe('ing policy');
  });

  it('reads at most 40 characters of the value', () => {
    expect(headerValue(`Version: ${'x'.repeat(60)}`, 'Version')).toBe('x'.repeat(40));
  });
});

describe('liveHeaders / sourceHeaders', () => {
  it('extract equal headers from equivalent rendered HTML and markdown', () => {
    const html = page(
      '<p><strong>Version:</strong> 2.3</p><p><strong>Last Updated:</strong> June 1, 2026</p><p>Body</p>'
    );
    const md = '**Version:** 2.3\n**Last Updated:** June 1, 2026\n\nBody';
    expect(liveHeaders(html)).toEqual({ version: '2.3', lastUpdated: 'June 1, 2026' });
    expect(sourceHeaders(md)).toEqual({ version: '2.3', lastUpdated: 'June 1, 2026' });
  });

  it('decodes entities in live headers', () => {
    const html = page('<p>Version: 2.3</p><p>Last Updated: May&nbsp;5, 2026</p>');
    expect(liveHeaders(html).lastUpdated).toBe('May 5, 2026');
  });

  it('reports null for a header the document does not carry', () => {
    expect(sourceHeaders('# Title\n\nNo headers')).toEqual({ version: null, lastUpdated: null });
    expect(liveHeaders(page('<p>No headers</p>'))).toEqual({ version: null, lastUpdated: null });
  });

  it('detects a stale version', () => {
    const live = liveHeaders(page('<p>Version: 1.5</p><p>Last Updated: May 31, 2026</p>'));
    const src = sourceHeaders('**Version:** 2.0\n**Last Updated:** August 7, 2026');
    expect(live.version).not.toBe(src.version);
    expect(live.lastUpdated).not.toBe(src.lastUpdated);
  });
});

describe('firstDivergence', () => {
  it('points at the first differing word with context from both sides', () => {
    const out = firstDivergence('alpha beta gamma delta', 'alpha beta GAMMA delta');
    expect(out).toContain('live: …alpha beta gamma delta…');
    expect(out).toContain('src:  …alpha beta GAMMA delta…');
  });

  it('windows six words before and twelve after the divergence', () => {
    const common = Array.from({ length: 10 }, (_, i) => `w${i}`);
    const tail = Array.from({ length: 20 }, (_, i) => `t${i}`);
    const a = [...common, 'live-only', ...tail].join(' ');
    const b = [...common, 'src-only', ...tail].join(' ');
    const out = firstDivergence(a, b);
    // i = 10 -> words 4..21
    expect(out).toContain('live: …w4 w5 w6 w7 w8 w9 live-only t0 t1 t2 t3 t4 t5 t6 t7 t8 t9 t10…');
    expect(out).not.toContain('w3 ');
    expect(out).not.toContain('t11');
  });

  it('reports a length difference at the end as a divergence at the first missing word', () => {
    const out = firstDivergence('one two three', 'one two three four');
    expect(out).toContain('live: …one two three…');
    expect(out).toContain('src:  …one two three four…');
  });

  it('PINS: identical inputs yield the "(none — lengths differ only at end)" label', () => {
    expect(firstDivergence('same words', 'same words')).toBe('(none — lengths differ only at end)');
  });
});
