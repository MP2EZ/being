/**
 * journalSearchTerms — unit specs (FEAT-530 slice A, AC #1)
 *
 * Pure logic, written test-first. The builder and the query side share ONE
 * normaliser, so "Café" in an entry and "caf" in the search box meet.
 */

import {
  MAX_TERM_CODEPOINTS,
  buildTermRow,
  normaliseForSearch,
  queryPrefixes,
  tokenise,
} from '../journalSearchTerms';

describe('normaliseForSearch', () => {
  it('lowercases', () => {
    expect(normaliseForSearch('STOIC Calm')).toBe('stoic calm');
  });

  it('strips combining marks after NFKD ("CAFÉ" -> "cafe")', () => {
    expect(normaliseForSearch('CAFÉ')).toBe('cafe');
    expect(normaliseForSearch('Café')).toBe('cafe');
    // Precomposed and decomposed spellings land on the same string.
    expect(normaliseForSearch('café')).toBe(normaliseForSearch('café'));
  });

  it('applies compatibility decomposition (NFKD, not NFD)', () => {
    expect(normaliseForSearch('ﬁnal')).toBe('final');
    expect(normaliseForSearch('Ⅻ')).toBe('xii');
  });

  it('is idempotent, including where lowercasing creates a new mark', () => {
    // U+0130 lowercases to "i" + U+0307; the mark must not survive.
    expect(normaliseForSearch('İstanbul')).toBe('istanbul');
    for (const s of ['CAFÉ', 'İstanbul', 'ﬁnal', 'naïve façade', '東京']) {
      expect(normaliseForSearch(normaliseForSearch(s))).toBe(normaliseForSearch(s));
    }
  });
});

describe('tokenise', () => {
  it('splits on anything that is not a letter or digit', () => {
    expect(tokenise('Stoic, calm; and (steady)!')).toEqual(['stoic', 'calm', 'and', 'steady']);
  });

  it('keeps digits', () => {
    expect(tokenise('slept 7 hours, woke at 0530')).toEqual(['slept', '7', 'hours', 'woke', 'at', '0530']);
  });

  it('DELETES apostrophes inside a word (straight and curly): "don\'t" -> "dont"', () => {
    expect(tokenise("don't")).toEqual(['dont']);
    expect(tokenise('don’t')).toEqual(['dont']);
    expect(tokenise("it's Marcus' day")).toEqual(['its', 'marcus', 'day']);
  });

  it('SPLITS on hyphens: "well-being" -> "well", "being"', () => {
    expect(tokenise('well-being')).toEqual(['well', 'being']);
    expect(tokenise('a–b—c')).toEqual(['a', 'b', 'c']);
  });

  it('caps one term at MAX_TERM_CODEPOINTS code points, never splitting a surrogate pair', () => {
    expect(MAX_TERM_CODEPOINTS).toBe(32);
    const long = 'a'.repeat(100);
    expect(tokenise(long)).toEqual(['a'.repeat(MAX_TERM_CODEPOINTS)]);
    // U+10400 is a letter outside the BMP (two UTF-16 units).
    const astral = '\u{10400}'.repeat(40);
    const [term] = tokenise(astral);
    expect(Array.from(term)).toHaveLength(MAX_TERM_CODEPOINTS);
    expect(term).toBe(normaliseForSearch('\u{10400}').repeat(MAX_TERM_CODEPOINTS));
  });

  it('degrades unspaced CJK to one sentence-long term (known limitation)', () => {
    // The stated normaliser (NFKD + strip marks) also drops the dakuten: で -> て.
    expect(tokenise('今日は静かな一日でした。明日も')).toEqual(['今日は静かな一日てした', '明日も']);
  });

  it('returns [] for empty, whitespace-only and punctuation-only input', () => {
    expect(tokenise('')).toEqual([]);
    expect(tokenise('  \n\t ')).toEqual([]);
    expect(tokenise('... -- !?')).toEqual([]);
  });
});

describe('buildTermRow', () => {
  it('emits exactly { entryId, terms } and nothing else', () => {
    const row = buildTermRow('e1', 'one two');
    expect(Object.keys(row)).toEqual(['entryId', 'terms']);
  });

  it('deduplicates: a word repeated 50 times is one term', () => {
    const row = buildTermRow('e1', Array(50).fill('breathe').join(' '));
    expect(row.terms).toEqual(['breathe']);
  });

  it('sorts terms (deterministic shard bytes)', () => {
    expect(buildTermRow('e1', 'zeta alpha Mu alpha').terms).toEqual(['alpha', 'mu', 'zeta']);
  });

  it('dedupes across casing and accents', () => {
    expect(buildTermRow('e1', 'Café CAFE cafe').terms).toEqual(['cafe']);
  });

  it('gives a text with no letters an empty-terms row (so the id is still "indexed")', () => {
    expect(buildTermRow('e1', '🙂 ... 🙂')).toEqual({ entryId: 'e1', terms: [] });
  });
});

describe('queryPrefixes', () => {
  it('uses the same normaliser as the index ("CAFÉ" and "cafe" are the same prefix)', () => {
    expect(queryPrefixes('CAFÉ')).toEqual(['cafe']);
    expect(queryPrefixes('Caf')).toEqual(['caf']);
  });

  it('keeps one prefix per distinct word, in typed order, without sorting', () => {
    expect(queryPrefixes('stoic cal stoic')).toEqual(['stoic', 'cal']);
    expect(queryPrefixes('zeta alpha')).toEqual(['zeta', 'alpha']);
  });

  it('applies the term cap to the query too', () => {
    expect(queryPrefixes('b'.repeat(80))).toEqual(['b'.repeat(MAX_TERM_CODEPOINTS)]);
  });

  it('returns [] for empty, whitespace-only and punctuation-only input', () => {
    expect(queryPrefixes('')).toEqual([]);
    expect(queryPrefixes('   ')).toEqual([]);
    expect(queryPrefixes('?!-- ...')).toEqual([]);
  });

  it('treats apostrophes and hyphens exactly like the index does', () => {
    expect(queryPrefixes("don't")).toEqual(['dont']);
    expect(queryPrefixes('well-being')).toEqual(['well', 'being']);
  });
});
