/**
 * DEBUG-323 — WCAG AA contrast pins for the semantic text tokens.
 *
 * `semantic.text.muted` shipped as gray[500] = 1.98:1 on background.primary
 * (white). WCAG 2.1 AA requires 4.5:1 for normal text and 3:1 for large text;
 * it failed both. The design system therefore shipped a semantic *text* token
 * that could not legally render text on the default background, and all 7
 * non-test consumers were latent AA failures — including `addNoteText`, the
 * visible label of an interactive Pressable, which made it a functional
 * barrier rather than a cosmetic one.
 *
 * FILE PATH IS LOAD-BEARING, NOT STYLISTIC. `npm run test:accessibility` is
 * `jest --testPathPattern=accessibility`, so the FILENAME must contain
 * "accessibility" or this never runs; and jest.config.js's
 * `src/**\/__tests__/**\/*` pattern is what makes a file here match testMatch at
 * all. Move or rename this and it silently leaves the accessibility gate.
 *
 * It is also the first consumer of `getContrastRatio` / `meetsWCAGAA`
 * (core/theme/accessibility.ts), which had ZERO callers — the repo shipped a
 * correct WCAG luminance implementation that nothing used, which is precisely
 * why a 1.98:1 text token could sit in the theme unnoticed while
 * `test:accessibility` stayed green.
 */
import { getContrastRatio, meetsWCAGAA } from '../accessibility';
import { semantic, colorSystem } from '../colors';

/** WCAG 2.1 AA minimum for normal-size text. */
const AA_NORMAL_TEXT = 4.5;

describe('semantic text tokens meet WCAG AA on the default background', () => {
  // Every one of the 7 non-test consumers of `muted` audited under DEBUG-323
  // renders on a white surface (WellnessScreeningTrends, WeeklyReflectionCard
  // and SessionNoteComposer all sit in white cards, and background.screen has
  // been white since MAINT-263), so white is the correct bar for all of them.
  //
  // Deliberately NOT asserted against background.secondary (gray[100]):
  // gray[600] on gray[100] is 4.41:1, a real but PRE-EXISTING failure that also
  // affects `secondary` and is tracked separately. Asserting it here would turn
  // this file red on an out-of-scope defect and invite someone to weaken it.
  const cases: Array<[string, string]> = [
    ['primary', semantic.text.primary],
    ['secondary', semantic.text.secondary],
    ['muted', semantic.text.muted],
  ];

  test.each(cases)(
    'semantic.text.%s is >= 4.5:1 on semantic.background.primary',
    (name, color) => {
      const ratio = getContrastRatio(color, semantic.background.primary);
      expect(`${name}:${ratio >= AA_NORMAL_TEXT}`).toBe(`${name}:true`);
    },
  );

  test.each(cases)('semantic.text.%s passes meetsWCAGAA for normal text', (name, color) => {
    expect(`${name}:${meetsWCAGAA(color, semantic.background.primary, false)}`).toBe(
      `${name}:true`,
    );
  });

  test('muted is specifically above the value that failed (regression pin)', () => {
    // The shipped defect was exactly 1.98:1. Pin the number so a partial
    // "improvement" to some still-illegal lighter gray cannot pass.
    const ratio = getContrastRatio(semantic.text.muted, semantic.background.primary);
    expect(ratio).toBeGreaterThan(4.5);
    expect(ratio).toBeGreaterThan(
      getContrastRatio(colorSystem.gray[500], semantic.background.primary),
    );
  });
});

describe('semantic text tokens come from the design-system ramp', () => {
  test('muted is a colorSystem gray, not a bespoke hex', () => {
    // CLAUDE.md forbids hardcoded hex in UI work. Since there is no accessible
    // step between gray[500] and gray[600], the tempting "fix" is to invent an
    // intermediate hex — which would both violate that rule and, at any value
    // visually distinct from gray[600], still fail AA. Block it here.
    const ramp = Object.values(colorSystem.gray as Record<string, string>);
    expect(ramp).toContain(semantic.text.muted);
  });
});

/**
 * DEBUG-342 — why `colorSystem.gray[500]` is banned outright.
 *
 * DEBUG-323 fixed the TOKEN, but 34 non-test sites read the raw ramp value and
 * bypassed it entirely, so the fix reached none of them. These pins record the
 * reason the ESLint `no-restricted-syntax` rule in eslint.config.js is a hard zero
 * with no allowlist: gray[500] clears neither WCAG bar on any light surface here,
 * so the "prove it is non-text and meets 3:1" escape hatch is empty by construction.
 */
describe('gray[500] is not a legal UI colour (DEBUG-342)', () => {
  it('fails the AA text bar AND the 1.4.11 non-text bar on white', () => {
    const ratio = getContrastRatio(colorSystem.gray[500], semantic.background.primary);
    expect(ratio).toBeLessThan(4.5); // normal text
    expect(ratio).toBeLessThan(3.0); // non-text / UI component — no exemption available
  });

  it('the replacement clears the 3:1 non-text bar, so tab icons are legal', () => {
    // The 4 CleanTabNavigator inactive icons moved here. 1.4.11 governs them
    // (graphical objects identifying a UI state), not 1.4.3.
    const ratio = getContrastRatio(semantic.text.muted, semantic.background.primary);
    expect(ratio).toBeGreaterThanOrEqual(3.0);
  });

  it('records the residual: muted still fails 4.5:1 on the SECONDARY surface', () => {
    // Not fixed here — this is the pre-existing semantic.text.secondary-on-
    // background.secondary defect DEBUG-342 explicitly scoped out. The 7 sites on
    // tinted surfaces land at ~4.4:1: strictly better than the 1.90:1 they had, but
    // still short. Pinned so the gap is visible rather than assumed closed.
    const ratio = getContrastRatio(semantic.text.muted, semantic.background.secondary);
    expect(ratio).toBeGreaterThan(4.0);
    expect(ratio).toBeLessThan(4.5);
  });
});
