/**
 * DEBUG-679 — what a PracticeTimer route may put on screen.
 *
 * `being://practice/<id>` is externally reachable, and React Navigation hands a route every
 * query key it did not parse, raw. So PracticeTimerRoute reads no param as copy: `practiceId`
 * is a lookup key only, and the title, presentation and module credit come from here.
 *
 * Only `guided-timer` entries resolve, because they are what PracticeTimer renders. A title
 * from any other type has never been measured on this screen, and one of them is the title
 * that hid the breathing circle at AX5 (`Daily Social Impact Reflection`, DEBUG-654). Every
 * other id (unknown, a prototype key, a reflection) gets the fixed, Being-authored fallback.
 *
 * Synchronous, total, never throws: it runs in a render with RootCrisisButton as a sibling,
 * so a throw would take the 988 affordance with it (DEBUG-344). The index is a Map, never a
 * bracket lookup on an object literal: `constructor`, `toString` and the other prototype keys
 * survive linking.ts's [a-zA-Z0-9-] sanitiser.
 *
 * Imports nothing from features/ (MAINT-659): `moduleId` is the module JSON's own `id`, and
 * PracticeTimerRoute narrows it with isModuleId before anything is credited.
 */

import awarePresence from '../../../assets/modules/module-1-aware-presence.json';
import radicalAcceptance from '../../../assets/modules/module-2-radical-acceptance.json';
import sphereSovereignty from '../../../assets/modules/module-3-sphere-sovereignty.json';
import virtuousResponse from '../../../assets/modules/module-4-virtuous-response.json';
import interconnectedLiving from '../../../assets/modules/module-5-interconnected-living.json';

/**
 * The header for any id that does not resolve (crisis + philosopher ruling, DEBUG-679). No
 * duration claim, no digits, no help wording; it names what renders: the breathing timer.
 * Changing it re-opens DEBUG-654's AX5 measurement (practiceTimerCircleTitles.test.ts).
 */
export const FALLBACK_PRACTICE_TITLE = 'Breathing Space';

/**
 * The practiceId the screen receives on the fallback. It is no catalog id and has no
 * PRACTICE_QUOTES entry, so a fallback completion shows no citation, and the screen never
 * carries a URL-derived id.
 */
export const FALLBACK_PRACTICE_ID = 'linked-practice-fallback';

/**
 * linking.ts's duration clamp default (DEBUG-353). Founder ruling, DEBUG-679: a fallback link
 * with NO duration runs this long. The parse only runs for a key that is present, so a bare
 * `being://practice/probe` used to reach the timer with undefined, which never completes.
 */
export const LINK_DURATION_DEFAULT_SECONDS = 60;

/**
 * The fallback path's duration: the link's, already clamped by linking.ts's parse, or the
 * clamp's default when the link carried none. Never undefined, never NaN.
 */
export function fallbackLinkDuration(urlDuration: unknown): number {
  return typeof urlDuration === 'number' && Number.isFinite(urlDuration)
    ? urlDuration
    : LINK_DURATION_DEFAULT_SECONDS;
}

/** practiceNavigation.ts's guided-timer default, so a link and an in-app launch agree. */
const DEFAULT_TIMER_SECONDS = 180;

export type LinkedPracticeVisualMode = 'breathing' | 'contemplative';

export interface LinkedPracticeParams {
  /** The catalog id when resolved; FALLBACK_PRACTICE_ID otherwise. */
  practiceId: string;
  title: string;
  visualMode: LinkedPracticeVisualMode;
  instructions: string[] | undefined;
  /** The owning module's `id` when resolved; undefined otherwise, so nothing is credited. */
  moduleId: string | undefined;
  /** Catalog seconds when resolved; undefined on the fallback, where fallbackLinkDuration applies. */
  duration: number | undefined;
}

const FALLBACK: LinkedPracticeParams = Object.freeze({
  practiceId: FALLBACK_PRACTICE_ID,
  title: FALLBACK_PRACTICE_TITLE,
  visualMode: 'breathing',
  instructions: undefined,
  moduleId: undefined,
  duration: undefined,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function toEntry(moduleId: string, practice: Record<string, unknown>): LinkedPracticeParams | null {
  const { id, title, visualMode, instructions, duration } = practice;
  if (typeof id !== 'string' || typeof title !== 'string' || title.trim().length === 0) return null;
  const steps = Array.isArray(instructions)
    ? instructions.filter((s): s is string => typeof s === 'string')
    : [];
  return Object.freeze({
    practiceId: id,
    title,
    visualMode: visualMode === 'contemplative' ? 'contemplative' : 'breathing',
    instructions: steps.length > 0 ? steps : undefined,
    moduleId,
    duration:
      typeof duration === 'number' && Number.isFinite(duration) && duration > 0
        ? duration
        : DEFAULT_TIMER_SECONDS,
  });
}

function buildCatalog(): ReadonlyMap<string, LinkedPracticeParams> {
  const catalog = new Map<string, LinkedPracticeParams>();
  try {
    const ambiguous = new Set<string>();
    const modules: unknown[] = [
      awarePresence,
      radicalAcceptance,
      sphereSovereignty,
      virtuousResponse,
      interconnectedLiving,
    ];
    for (const mod of modules) {
      if (!isRecord(mod)) continue;
      const { id: moduleId, practices } = mod;
      if (typeof moduleId !== 'string' || !Array.isArray(practices)) continue;
      for (const practice of practices) {
        if (!isRecord(practice) || practice['type'] !== 'guided-timer') continue;
        const entry = toEntry(moduleId, practice);
        if (!entry) continue;
        // An id in two modules is ambiguous: crediting either could be wrong, so neither
        // resolves. Ids are pinned unique (practiceDeepLinkTitle.test.tsx); this is the backstop.
        if (catalog.has(entry.practiceId)) ambiguous.add(entry.practiceId);
        else catalog.set(entry.practiceId, entry);
      }
    }
    for (const id of ambiguous) catalog.delete(id);
  } catch {
    catalog.clear(); // Everything falls back rather than half a catalog.
  }
  return catalog;
}

const GUIDED_TIMER_CATALOG = buildCatalog();

/**
 * The presentation for a PracticeTimer route. A guided-timer catalog id gets its authored
 * title, visualMode, instructions, module and duration; anything else gets FALLBACK.
 */
export function resolveLinkedPracticeParams(practiceId: unknown): LinkedPracticeParams {
  try {
    if (typeof practiceId !== 'string') return FALLBACK;
    return GUIDED_TIMER_CATALOG.get(practiceId) ?? FALLBACK;
  } catch {
    return FALLBACK;
  }
}
