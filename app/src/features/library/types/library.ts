/**
 * Classical Resources Library Types
 * FEAT-54: Classical Resources Library
 *
 * Type-safe definitions for curated primary-source Stoic passages.
 * Passages are curated BY principle and reuse the education domain's
 * kebab-case `ModuleId` as their principle key (no third id mapping —
 * see principleMapping.ts for the bridge to the practices snake_case ids).
 *
 * Content sourcing (non-negotiable, philosopher-validated):
 * - Public-domain translations ONLY (George Long / Elizabeth Carter /
 *   Richard Mott Gummere / Aubrey Stewart). Hays & Robin Hard are
 *   in-copyright and must never be excerpted — link out to buy instead.
 * - `text` is the exact translation, never a paraphrase.
 */

import type { ModuleId } from '@/features/learn/types/education';

/**
 * Passage author — same union as ClassicalQuote.author (education.ts).
 */
export type PassageAuthor = 'Marcus Aurelius' | 'Epictetus' | 'Seneca';

/**
 * Classical work a passage is drawn from.
 */
export type ClassicalWork =
  | 'Meditations'
  | 'Enchiridion'
  | 'Discourses'
  | 'Letters from a Stoic'
  | 'On Tranquility';

/**
 * A single curated primary-source passage.
 */
export interface Passage {
  /** Stable unique slug, e.g. "marcus-meditations-5-20". */
  id: string;
  /** Principle this passage grounds (kebab-case ModuleId). */
  principle: ModuleId;
  author: PassageAuthor;
  work: ClassicalWork;
  /** Human-readable work + locator, e.g. "Meditations 5.20". */
  citation: string;
  /** Public-domain translator attribution (mandatory). */
  translation: string;
  /** Exact translation text — no paraphrase. For long passages this is the excerpt. */
  text: string;
  /** Optional longer excerpt for long passages (Seneca letters): text = teaser, fullText = full. */
  fullText?: string;
  /** Short literary frame (1–2 sentences), kept minimal. */
  context?: string;
  /** Display order within a principle. */
  order?: number;
}

/**
 * All passages for a single principle, as stored in one JSON file.
 */
export interface PassageCollection {
  principle: ModuleId;
  passages: Passage[];
}

/** Human-readable principle labels for the library UI (display-only). */
export const PRINCIPLE_LABELS: Record<ModuleId, string> = {
  'aware-presence': 'Aware Presence',
  'radical-acceptance': 'Radical Acceptance',
  'sphere-sovereignty': 'Sphere Sovereignty',
  'virtuous-response': 'Virtuous Response',
  'interconnected-living': 'Interconnected Living',
};

/** Canonical authors, for filtering. */
export const PASSAGE_AUTHORS: readonly PassageAuthor[] = [
  'Marcus Aurelius',
  'Epictetus',
  'Seneca',
] as const;

/** Canonical works, used by the loader validator. */
export const CLASSICAL_WORKS: readonly ClassicalWork[] = [
  'Meditations',
  'Enchiridion',
  'Discourses',
  'Letters from a Stoic',
  'On Tranquility',
] as const;
