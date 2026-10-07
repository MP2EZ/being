/**
 * The crisis-adjacent route sets are a closed inventory (DEBUG-711, job 2).
 *
 * Five sets with five different meanings already exist, and the bug class DEBUG-703,
 * DEBUG-706 and DEBUG-711 fixed grew because each new site reached for its own list.
 * "The crisis surface" for navigation that runs after an await, timer, effect or
 * listener is ONE set: CRISIS_DESTINATION_ROUTES, read through crisisDestinationGuard.
 *
 * This goes red when a new exported `*_ROUTES` set appears anywhere in app/src, so its
 * meaning has to be written down here — next to the existing five — before it merges.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { CRISIS_DESTINATION_ROUTES } from '@/core/navigation/rootOverlaySlot';
import { IMMERSIVE_ROUTES, SUPPRESSED_ROUTES } from '@/features/crisis/components/RootCrisisButton';

const SRC = join(__dirname, '../../src');

/** Every exported route set, and what it means. Add a row only with a crisis ruling. */
const KNOWN: Record<string, string> = {
  CRISIS_DESTINATION_ROUTES: 'the user was sent here for 988; nothing may cover or pop it (the guard set)',
  SUPPRESSED_ROUTES: 'the root crisis button does not render; the screen owns its own 988',
  IMMERSIVE_ROUTES: 'the root crisis button renders collapsed',
  RECONSENT_DEFERRAL_ROUTES: 're-consent waits until the user leaves these',
  SCREEN_OWNED_988_ROUTES: 'the root overlay slot yields to a screen-owned 988 affordance',
};

const EXPORTED_SET = /export\s+const\s+([A-Z][A-Z0-9_]*_ROUTES)\b/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : sourceFiles(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [p] : [];
  });
}

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

function exportedSets(): string[] {
  return sourceFiles(SRC)
    .flatMap((f) => [...stripComments(readFileSync(f, 'utf8')).matchAll(EXPORTED_SET)].map((m) => m[1]!))
    .sort();
}

describe('crisis-adjacent route sets', () => {
  it('the exported *_ROUTES sets are exactly the recorded five', () => {
    expect(exportedSets()).toEqual(Object.keys(KNOWN).sort());
  });

  it('positive control: the matcher finds a planted set, and ignores one in a comment', () => {
    expect([...stripComments('export const NEW_THING_ROUTES = new Set([]);').matchAll(EXPORTED_SET)]).toHaveLength(1);
    expect([...stripComments('// export const NEW_THING_ROUTES = new Set([]);').matchAll(EXPORTED_SET)]).toHaveLength(0);
  });

  it('relations: a crisis destination owns its 988, and immersive never hides the root button', () => {
    // A crisis destination suppresses the root button because the screen IS the 988 surface.
    for (const route of CRISIS_DESTINATION_ROUTES) expect(SUPPRESSED_ROUTES.has(route)).toBe(true);
    // Immersive collapses the root button but keeps it — so no route can be both.
    expect([...IMMERSIVE_ROUTES].filter((r) => SUPPRESSED_ROUTES.has(r))).toEqual([]);
  });

  it('the guard reads only the destination set', () => {
    const guard = stripComments(readFileSync(join(SRC, 'core/navigation/crisisDestinationGuard.ts'), 'utf8'));
    const used = [...new Set(guard.match(/\b[A-Z][A-Z0-9_]*_ROUTES\b/g) ?? [])];
    expect(used).toEqual(['CRISIS_DESTINATION_ROUTES']);
  });
});
