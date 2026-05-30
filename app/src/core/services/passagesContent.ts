/**
 * Classical Passages Content Loader
 * FEAT-54: Classical Resources Library
 *
 * Loads and caches the curated primary-source passage JSON files.
 *
 * Design (architect-validated):
 * - The require() registry is keyed by the 5 principles (ModuleId) — it is
 *   O(5) over *files*, never per-passage, so it scales to 100+ passages
 *   without growing.
 * - Loading is LAZY: nothing is required at app boot. The library is not
 *   touched during the <2s launch window, so passage JSON is parsed only on
 *   first library/section open. There is intentionally no preload* analogue
 *   to moduleContent.preloadAllModules().
 * - byPrinciple / byId indexes are built lazily into the in-memory cache.
 */

import type { ModuleId } from '@/features/learn/types/education';
import type {
  Passage,
  PassageAuthor,
  PassageCollection,
} from '@/features/library/types/library';
import { PASSAGE_AUTHORS, CLASSICAL_WORKS } from '@/features/library/types/library';

/**
 * File registry — one JSON file per principle. The switch is over the 5
 * files, not the passages within them, so this stays O(5) as the corpus grows.
 */
const PASSAGE_FILES: Record<ModuleId, () => PassageCollection> = {
  'aware-presence': () =>
    require('../../../assets/passages/passages-1-aware-presence.json'),
  'radical-acceptance': () =>
    require('../../../assets/passages/passages-2-radical-acceptance.json'),
  'sphere-sovereignty': () =>
    require('../../../assets/passages/passages-3-sphere-sovereignty.json'),
  'virtuous-response': () =>
    require('../../../assets/passages/passages-4-virtuous-response.json'),
  'interconnected-living': () =>
    require('../../../assets/passages/passages-5-interconnected-living.json'),
};

const PRINCIPLE_IDS = Object.keys(PASSAGE_FILES) as ModuleId[];

// Per-principle cache (in-memory, persists for app session).
const principleCache: Partial<Record<ModuleId, Passage[]>> = {};
// Lazy global id index, built the first time all passages are loaded.
let idIndex: Map<string, Passage> | null = null;

/**
 * Sort passages by their optional `order` field (stable, undefined last).
 */
function sortByOrder(passages: Passage[]): Passage[] {
  return [...passages].sort(
    (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
  );
}

/**
 * Validate a passage collection's structure. Throws on the first problem.
 * Mirrors moduleContent.validateModuleContent.
 */
export function validatePassageCollection(
  data: any,
  expectedPrinciple: ModuleId
): asserts data is PassageCollection {
  if (!data || typeof data !== 'object') {
    throw new Error(`Passage file for ${expectedPrinciple} is not an object`);
  }
  if (data.principle !== expectedPrinciple) {
    throw new Error(
      `Passage file principle mismatch: expected "${expectedPrinciple}", got "${data.principle}"`
    );
  }
  if (!Array.isArray(data.passages) || data.passages.length === 0) {
    throw new Error(`Passage file for ${expectedPrinciple} must have a non-empty passages array`);
  }

  const seenIds = new Set<string>();
  for (const p of data.passages as Passage[]) {
    if (!p.id || !p.text || !p.citation || !p.translation || !p.author || !p.work) {
      throw new Error(
        `Passage in ${expectedPrinciple} missing required field (id/text/citation/translation/author/work): ${p.id ?? '<no id>'}`
      );
    }
    if (p.principle !== expectedPrinciple) {
      throw new Error(`Passage "${p.id}" principle "${p.principle}" does not match file "${expectedPrinciple}"`);
    }
    if (!PASSAGE_AUTHORS.includes(p.author)) {
      throw new Error(`Passage "${p.id}" has unknown author "${p.author}"`);
    }
    if (!CLASSICAL_WORKS.includes(p.work)) {
      throw new Error(`Passage "${p.id}" has unknown work "${p.work}"`);
    }
    if (seenIds.has(p.id)) {
      throw new Error(`Duplicate passage id within ${expectedPrinciple}: "${p.id}"`);
    }
    seenIds.add(p.id);
  }
}

/**
 * Load (and cache) all passages for one principle, sorted by display order.
 */
export function loadPassagesForPrinciple(principle: ModuleId): Passage[] {
  if (principleCache[principle]) {
    return principleCache[principle]!;
  }

  const loader = PASSAGE_FILES[principle];
  if (!loader) {
    throw new Error(`Unknown principle: ${principle}`);
  }

  const collection = loader();
  validatePassageCollection(collection, principle);

  const sorted = sortByOrder(collection.passages);
  principleCache[principle] = sorted;
  return sorted;
}

/**
 * Load every passage across all principles (flat list).
 * Builds the global id index as a side effect. Call only when the user opens
 * the standalone library — never at app boot.
 */
export function loadAllPassages(): Passage[] {
  const all = PRINCIPLE_IDS.flatMap((id) => loadPassagesForPrinciple(id));

  if (!idIndex) {
    idIndex = new Map<string, Passage>();
    for (const p of all) {
      if (idIndex.has(p.id)) {
        throw new Error(`Duplicate passage id across files: "${p.id}"`);
      }
      idIndex.set(p.id, p);
    }
  }

  return all;
}

/**
 * All passages by a given author (across principles).
 */
export function getPassagesByAuthor(author: PassageAuthor): Passage[] {
  return loadAllPassages().filter((p) => p.author === author);
}

/**
 * Look up a single passage by id (used by the reader screen).
 */
export function getPassageById(id: string): Passage | undefined {
  loadAllPassages();
  return idIndex?.get(id);
}

/**
 * Distinct authors present in the corpus, in canonical order.
 */
export function getAuthorsPresent(): PassageAuthor[] {
  const present = new Set(loadAllPassages().map((p) => p.author));
  return PASSAGE_AUTHORS.filter((a) => present.has(a));
}

/**
 * All principle ids that have a passage file.
 */
export function getPrincipleIds(): ModuleId[] {
  return [...PRINCIPLE_IDS];
}

/**
 * Clear caches (testing / memory management).
 */
export function clearPassagesCache(): void {
  PRINCIPLE_IDS.forEach((id) => delete principleCache[id]);
  idIndex = null;
}
