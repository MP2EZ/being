/**
 * FEAT-54: Classical Resources Library — passage loader + content integrity
 *
 * Covers: loader caching, the validator's rejection paths, principle/author
 * filtering, and a content-integrity guard across all shipped passage files
 * (global id uniqueness, author/work in-union) — the analogue of the static
 * clinical-config tests.
 */

import {
  loadPassagesForPrinciple,
  loadAllPassages,
  getPassagesByAuthor,
  getPassageById,
  getAuthorsPresent,
  getPrincipleIds,
  validatePassageCollection,
  clearPassagesCache,
} from '@/core/services/passagesContent';
import {
  PASSAGE_AUTHORS,
  CLASSICAL_WORKS,
  PRINCIPLE_LABELS,
} from '@/features/library/types/library';
import type { ModuleId } from '@/features/learn/types/education';

beforeEach(() => {
  clearPassagesCache();
});

describe('loadPassagesForPrinciple', () => {
  it('returns a non-empty list for every principle', () => {
    for (const principle of getPrincipleIds()) {
      const passages = loadPassagesForPrinciple(principle);
      expect(passages.length).toBeGreaterThan(0);
      expect(passages.every((p) => p.principle === principle)).toBe(true);
    }
  });

  it('returns passages sorted by order', () => {
    const passages = loadPassagesForPrinciple('virtuous-response');
    const orders = passages.map((p) => p.order ?? Number.MAX_SAFE_INTEGER);
    const sorted = [...orders].sort((a, b) => a - b);
    expect(orders).toEqual(sorted);
  });

  it('caches — the second call returns the same array reference', () => {
    const first = loadPassagesForPrinciple('aware-presence');
    const second = loadPassagesForPrinciple('aware-presence');
    expect(second).toBe(first);
  });

  it('throws on an unknown principle', () => {
    expect(() => loadPassagesForPrinciple('nonexistent' as ModuleId)).toThrow();
  });
});

describe('loadAllPassages', () => {
  it('aggregates every principle file', () => {
    const all = loadAllPassages();
    const perPrinciple = getPrincipleIds().reduce(
      (sum, id) => sum + loadPassagesForPrinciple(id).length,
      0
    );
    expect(all.length).toBe(perPrinciple);
  });

  it('has globally unique passage ids', () => {
    const all = loadAllPassages();
    const ids = all.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('filtering', () => {
  it('getPassagesByAuthor returns only that author, across principles', () => {
    const marcus = getPassagesByAuthor('Marcus Aurelius');
    expect(marcus.length).toBeGreaterThan(0);
    expect(marcus.every((p) => p.author === 'Marcus Aurelius')).toBe(true);
    // Marcus appears under more than one principle (cross-file aggregation).
    expect(new Set(marcus.map((p) => p.principle)).size).toBeGreaterThan(1);
  });

  it('getAuthorsPresent returns authors in canonical order', () => {
    const present = getAuthorsPresent();
    expect(present.length).toBeGreaterThan(0);
    expect(present).toEqual(PASSAGE_AUTHORS.filter((a) => present.includes(a)));
  });
});

describe('getPassageById', () => {
  it('resolves a known id', () => {
    const passage = getPassageById('epictetus-enchiridion-1');
    expect(passage).toBeDefined();
    expect(passage?.author).toBe('Epictetus');
    expect(passage?.principle).toBe('sphere-sovereignty');
  });

  it('returns undefined for an unknown id', () => {
    expect(getPassageById('does-not-exist')).toBeUndefined();
  });
});

describe('validatePassageCollection', () => {
  const valid = () => ({
    principle: 'aware-presence' as ModuleId,
    passages: [
      {
        id: 'x-1',
        principle: 'aware-presence' as ModuleId,
        author: 'Seneca' as const,
        work: 'Letters from a Stoic' as const,
        citation: 'Letters 1',
        translation: 'Gummere',
        text: 'A passage.',
      },
    ],
  });

  it('accepts a well-formed collection', () => {
    expect(() => validatePassageCollection(valid(), 'aware-presence')).not.toThrow();
  });

  it('rejects a principle/file mismatch', () => {
    expect(() => validatePassageCollection(valid(), 'radical-acceptance')).toThrow(/mismatch/i);
  });

  it('rejects an empty passages array', () => {
    const data = { principle: 'aware-presence', passages: [] };
    expect(() => validatePassageCollection(data, 'aware-presence')).toThrow(/non-empty/i);
  });

  it('rejects a passage missing a required field', () => {
    const data = valid();
    delete (data.passages[0] as any).citation;
    expect(() => validatePassageCollection(data, 'aware-presence')).toThrow(/missing required field/i);
  });

  it('rejects an unknown author', () => {
    const data = valid();
    (data.passages[0] as any).author = 'Plato';
    expect(() => validatePassageCollection(data, 'aware-presence')).toThrow(/unknown author/i);
  });

  it('rejects an unknown work', () => {
    const data = valid();
    (data.passages[0] as any).work = 'Republic';
    expect(() => validatePassageCollection(data, 'aware-presence')).toThrow(/unknown work/i);
  });

  it('rejects a duplicate id within a file', () => {
    const data = valid();
    data.passages.push({ ...data.passages[0] });
    expect(() => validatePassageCollection(data, 'aware-presence')).toThrow(/duplicate/i);
  });
});

describe('content integrity (all shipped passage files)', () => {
  it('every passage has a valid author, work, principle, and required text/citation/translation', () => {
    for (const passage of loadAllPassages()) {
      expect(PASSAGE_AUTHORS).toContain(passage.author);
      expect(CLASSICAL_WORKS).toContain(passage.work);
      expect(getPrincipleIds()).toContain(passage.principle);
      expect(PRINCIPLE_LABELS[passage.principle]).toBeDefined();
      expect(passage.text.length).toBeGreaterThan(0);
      expect(passage.citation.length).toBeGreaterThan(0);
      // Public-domain translator attribution is mandatory.
      expect(passage.translation.length).toBeGreaterThan(0);
    }
  });

  it('never ships the in-copyright Hays "stands in the way" phrasing', () => {
    const offending = loadAllPassages().filter((p) =>
      /stands in the way becomes the way/i.test(`${p.text} ${p.fullText ?? ''}`)
    );
    expect(offending).toEqual([]);
  });
});
