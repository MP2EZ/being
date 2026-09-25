/**
 * DEBUG-643 — which controls carry the __DEV__ crisis-exclusion check, and what must never.
 *
 * The check is opt-in, so its coverage is exactly the set of controls that adopt it. This
 * pins that set against the hosts DEBUG-643 AC4 names, so a host cannot quietly drop its
 * check. The per-host suites prove each check is wired to the right testID at render; this
 * proves every declared check reaches an `onLayout`, so none is computed and dropped.
 *
 * It also pins the other direction: nothing on the crisis tap path may import the check.
 * It is dev-only and cannot reach a Release binary, but the tap path's <200ms budget is
 * not something a developer detector gets to share a module graph with.
 *
 * Source-shape assertions strip comments first (DEBUG-390): this codebase names the hook
 * in prose, and a match on a comment is not an adoption.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..', '..', 'src');
const read = (rel: string) =>
  fs
    .readFileSync(path.join(SRC, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const HOOK_MODULE = "from '@/core/hooks/useCrisisExclusionAssertion'";
const HOOK_DECL = /const (\w+) = useCrisisExclusionAssertion\(/g;
const FACTORY_AT_PROP = /onLayout=\{crisisExclusionOnLayout\(/g;

/** Host → number of controls it checks (hook declarations + inline factory calls). */
const HOSTS: Record<string, number> = {
  'features/learn/practices/PracticeTimerScreen.tsx': 1,
  'features/learn/practices/ReflectionTimerScreen.tsx': 1,
  'features/learn/practices/BodyScanScreen.tsx': 1,
  'features/learn/practices/GuidedBodyScanScreen.tsx': 1,
  'features/learn/practices/SortingPracticeScreen.tsx': 3,
  'features/practices/screens/PracticeLibraryScreen.tsx': 3,
  'features/home/screens/CleanHomeScreen.tsx': 1,
  'features/guidance/components/RightNowAffordance.tsx': 1,
};

const TAP_PATH = [
  'features/crisis/components/CollapsibleCrisisButton.tsx',
  'features/crisis/components/RootCrisisButton.tsx',
  'features/crisis/utils/navigateToCrisisResources.ts',
  'features/crisis/services/crisisTapTrace.ts',
  'features/crisis/utils/openCrisisUrl.ts',
  'features/crisis/components/Static988Button.tsx',
  'features/crisis/components/CrisisKeyboardAccessory.tsx',
  'features/crisis/screens/CrisisResourcesScreen.tsx',
];

describe('DEBUG-643 — every AC4 host checks its cleared controls', () => {
  it.each(Object.entries(HOSTS))('%s declares %i check(s), each wired to an onLayout', (rel, expected) => {
    const src = read(rel);
    expect(src).toContain(HOOK_MODULE);
    const declared = [...src.matchAll(HOOK_DECL)].map((m) => m[1]);
    const inline = (src.match(FACTORY_AT_PROP) ?? []).length;
    expect(declared.length + inline).toBe(expected);
    for (const name of declared) expect(src).toMatch(new RegExp(`onLayout=\\{${name}\\}`));
  });

  it('PracticeToggleButton only forwards the handler, leaving the host style last', () => {
    const src = read('features/learn/practices/shared/PracticeToggleButton.tsx');
    expect(src).toMatch(/onLayout=\{onLayout\}/);
    expect(src).toMatch(/style=\{\[styles\.button, style\]\}/);
    expect(src).not.toMatch(/from '@\/features\/crisis\//);
  });

  it('control: the matchers fire on a host slice, and not on a comment naming the hook', () => {
    const host = read('features/learn/practices/PracticeTimerScreen.tsx');
    expect([...host.matchAll(HOOK_DECL)]).toHaveLength(1);
    const commentOnly = read('features/crisis/constants/crisisButtonGeometry.ts');
    expect(fs.readFileSync(path.join(SRC, 'features/crisis/constants/crisisButtonGeometry.ts'), 'utf8')).toMatch(
      /useCrisisExclusionAssertion/
    );
    expect([...commentOnly.matchAll(HOOK_DECL)]).toHaveLength(0);
    expect(commentOnly).not.toContain('useCrisisExclusionAssertion');
  });
});

describe('DEBUG-643 — the crisis tap path never imports the check', () => {
  it.each(TAP_PATH)('%s', (rel) => {
    expect(read(rel)).not.toContain('useCrisisExclusionAssertion');
  });
});
