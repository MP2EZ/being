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
 *
 * DEBUG-357 extended this file from a single-surface pin to a per-(foreground,
 * surface) MATRIX. The reason is the defect it closed: gray[600] passed on white
 * (4.61:1) and failed on every other surface in the app, so "valid only on white"
 * was tribal knowledge that no assertion could enforce. A mechanical swap onto
 * `semantic.text.muted` on a themed surface produced a still-failing ratio that
 * now *looked* fixed. One surface is not a pin — the set of surfaces is.
 */
import { getContrastRatio, meetsWCAGAA } from '../accessibility';
import { semantic, colorSystem, severityBands } from '../colors';

/** WCAG 2.1 AA minimum for normal-size text. */
const AA_NORMAL_TEXT = 4.5;

/**
 * Every surface a `semantic.text.*` token can legally land on in this app.
 *
 * Enumerated as literal entries rather than derived, because the point is to
 * fail when a NEW surface appears without anyone checking it against the text
 * ramp. A derived list would silently grow and keep passing.
 *
 * gray[50] is here deliberately even though DEBUG-357's acceptance criteria
 * omitted it: it is the actual surface of `ResumeSessionModal`'s tooltip and of
 * `DailyLoopCompleteScreen`'s passage box. Without it the matrix ships green
 * while a site the story names by name still fails.
 *
 * Note the ramp is non-monotonic at the light end — gray[100] (#FAFAFA) is
 * LIGHTER than gray[50] (#F9F9F9) — so this list must be explicit and must not
 * assume ordering.
 */
const SURFACES: Array<[string, string]> = [
  ['base.white', colorSystem.base.white],
  ['gray[50]', colorSystem.gray[50]],
  ['gray[100] (background.secondary)', colorSystem.gray[100]],
  ['gray[200]', colorSystem.gray[200]],
  ['themes.morning.background', colorSystem.themes.morning.background],
  ['themes.midday.background', colorSystem.themes.midday.background],
  ['themes.evening.background', colorSystem.themes.evening.background],
  ['themes.learn.background', colorSystem.themes.learn.background],
  // DEBUG-370 additions. The sweep moved ~75 call sites onto these tokens, which
  // landed subordinate text on four design-system grounds this matrix had never
  // asserted. They are added because the sweep put text there, not speculatively:
  // gray[300] hosts CloudBackupSettings' tertiary buttons and OverviewTab's stage
  // cards; status.infoBackground is AppSettingsScreen's `infoText` ground, which
  // was a live 4.23:1 failure before the sweep.
  ['gray[300]', colorSystem.gray[300]],
  ['status.infoBackground', colorSystem.status.infoBackground],
  ['status.successBackground', colorSystem.status.successBackground],
  ['status.errorBackground', colorSystem.status.errorBackground],
];

/**
 * DEBUG-370 — grounds that are HARDCODED HEX in feature files, not DS tokens.
 *
 * Deliberately a separate array rather than extra `SURFACES` entries. `SURFACES`
 * means "design-system surface", and the sibling test below asserts the text
 * tokens come from the ramp; folding app-local literals into it would blur a
 * contract that is currently exact.
 *
 * They are pinned at all because the sweep genuinely lands token text on them, so
 * omitting them would assert the sweep against grounds it does not actually touch
 * while leaving the ones it does untested. Each is a duplicate of a token that
 * already exists (#FEF2F2 is status.errorBackground, #F0FDF4 is
 * status.successBackground) or a one-off tint — eliminating them is its own
 * hex-elimination item, and this list is the inventory that item will start from.
 */
const APP_LOCAL_TINTED_SURFACES: Array<[string, string]> = [
  ['#E8F4EC (ConsentToggleCard.privacyNote)', '#E8F4EC'],
  ['#F0F4FF (LegalDocumentsListScreen.offlineNote)', '#F0F4FF'],
  ['#FFF9E6 (OverviewTab.exampleCard)', '#FFF9E6'],
  ['#F8F5FF (ModuleDetailScreen / PassageReaderScreen)', '#F8F5FF'],
  ['#E8F5E9 (ProgressiveBodyScanList)', '#E8F5E9'],
];

/** The two aliased body-subordinate text tokens this matrix governs. */
const SUBORDINATE_TEXT: Array<[string, string]> = [
  ['secondary', semantic.text.secondary],
  ['muted', semantic.text.muted],
];

describe('semantic text tokens meet WCAG AA on the default background', () => {
  // Every one of the 7 non-test consumers of `muted` audited under DEBUG-323
  // renders on a white surface (WellnessScreeningTrends, WeeklyReflectionCard
  // and SessionNoteComposer all sit in white cards, and background.screen has
  // been white since MAINT-263), so white is the correct bar for all of them.
  //
  // This describe covers the DEFAULT surface only. DEBUG-342 deliberately left
  // background.secondary untested here because gray[600] on gray[100] was 4.41:1
  // — a real but then-out-of-scope failure. DEBUG-357 closed that gap by moving
  // the token, so the every-surface obligation now lives in the matrix below
  // rather than being scoped out here.
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
    // CLAUDE.md forbids hardcoded hex in UI work. Because the ramp has no
    // accessible step between gray[500] and gray[600], the tempting "fix" has
    // always been to invent an intermediate hex — which would both violate that
    // rule and, at any value visually distinct from the passing step, still fail
    // AA. Block it here.
    //
    // DEBUG-357 sharpened why this guard matters. A pure neutral that passes on
    // ALL surfaces does exist numerically, at roughly #707070 — but it is five
    // hex steps from gray[600], so it is visually indistinguishable and cannot
    // express a third tier anyway. The bespoke hex buys nothing and costs the
    // ramp guarantee. That is the trap this assertion exists to close.
    const ramp = Object.values(colorSystem.gray as Record<string, string>);
    expect(ramp).toContain(semantic.text.muted);
    expect(ramp).toContain(semantic.text.secondary);
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
    //
    // DEBUG-357 note: this assertion's PREMISE VALUE changed under it. When
    // DEBUG-342 wrote it, muted was gray[600] and the margin over the 3:1 bar was
    // 4.61 → thin. It is now gray[700] at 10.05:1. The assertion is unchanged and
    // still correct; recorded here so a future reader does not mistake the large
    // margin for a mis-stated bar. The 3.0 bar is right — these are graphical
    // objects, not text.
    const ratio = getContrastRatio(semantic.text.muted, semantic.background.primary);
    expect(ratio).toBeGreaterThanOrEqual(3.0);
  });

  it('DEBUG-357 closed the residual: muted now clears 4.5:1 on the SECONDARY surface', () => {
    // INVERTED FROM A RESIDUAL PIN, NOT DELETED. This test previously asserted the
    // gap EXISTED (`> 4.0 && < 4.5`) so it would stay visible rather than assumed
    // closed — which meant it went red the instant the token moved. That is the
    // correct behaviour for a residual pin and it is why it is rewritten here in
    // the same commit rather than quietly removed: deleting it would erase the
    // record of why the gap was knowingly left open across DEBUG-323 and DEBUG-342.
    //
    // The gap closed structurally, not by finding a better grey. There is no legal
    // third grey — the ramp jumps gray[500] 1.98:1 → gray[600] 4.61:1 → gray[700]
    // 10.05:1 with nothing usable between — so the resolution was to collapse the
    // muted tier onto gray[700] and express subordination structurally instead.
    // That is DEBUG-323's own standing ruling (colors.ts) applied one level up.
    const ratio = getContrastRatio(semantic.text.muted, semantic.background.secondary);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});

/**
 * DEBUG-357 — the per-(foreground, surface) matrix.
 *
 * The defect this closes was not "the grey is slightly too light". It was that
 * `semantic.text.secondary` / `.muted` were valid on ONE surface and illegal on
 * every other, while nothing said so and nothing could detect it. The old pin
 * asserted white only, so a developer moving a site onto a themed background got
 * a still-failing ratio with a green suite.
 *
 * WHY THIS IS THE MECHANISM RATHER THAN PER-SITE FIXES: `SkipLink.tsx` renders
 * `color: semantic.text.muted` with NO backgroundColor of its own, and mounts as
 * a floating affordance over five different hosts. Its surface is not statically
 * knowable, so there is no per-site assertion that could ever cover it. Pinning
 * the TOKEN against every surface in the app is what makes an overlay carrying it
 * legal wherever it lands — that property is why the token moved instead of the
 * call sites being patched one at a time.
 */
describe('DEBUG-357: subordinate text tokens are surface-INDEPENDENT', () => {
  // Tuple order is [tokenName, surfaceName, color, surface] so the two `%s` in the
  // test title resolve to the two NAMES. jest's printf substitution is positional,
  // so putting `color` second would title the test with the foreground hex while
  // claiming it is the surface — a failure would then name the wrong thing.
  const cases: Array<[string, string, string, string]> = SUBORDINATE_TEXT.flatMap(
    ([tokenName, color]) =>
      SURFACES.map(
        ([surfaceName, surface]) =>
          [tokenName, surfaceName, color, surface] as [string, string, string, string],
      ),
  );

  it('covers every token x surface pair (guards against a silently empty matrix)', () => {
    // MAINT-358's standard: a test that cannot fail does not belong in this gate.
    // A `test.each` over an array that filtering shrinks to empty is SILENTLY
    // GREEN, which is the exact shape MAINT-358 deleted eight tests for. Pin the
    // count so shrinking the matrix is a failure, not a quiet coverage loss.
    expect(cases).toHaveLength(SUBORDINATE_TEXT.length * SURFACES.length);
    // DEBUG-370: was 16 (2 tokens x 8 surfaces). The literal is not redundant with
    // the derived assertion above — that one only proves `cases` was built from the
    // two arrays, and would stay green if a surface were quietly deleted. This one
    // is what makes shrinking the matrix a failure. Both must move together, and
    // forgetting this line is the most likely way to turn the gate red for a reason
    // that has nothing to do with contrast.
    expect(cases).toHaveLength(24);
  });

  test.each(cases)(
    'semantic.text.%s is >= 4.5:1 on %s',
    (tokenName, surfaceName, color, surface) => {
      const ratio = getContrastRatio(color, surface);
      // String-embed the label so a failure names the offending pair instead of
      // printing "expected true, received false" with no way to tell which.
      expect(`${tokenName} on ${surfaceName}: ${ratio >= AA_NORMAL_TEXT}`).toBe(
        `${tokenName} on ${surfaceName}: true`,
      );
    },
  );
});

/**
 * DEBUG-370 — the same obligation, on the app-local hex grounds the sweep touched.
 *
 * Split from the matrix above rather than merged into it because these are not
 * design-system surfaces and must not be mistaken for them. The assertion is
 * identical; only the provenance of the ground differs.
 */
describe('DEBUG-370: subordinate text also clears AA on app-local tinted grounds', () => {
  const cases: Array<[string, string, string, string]> = SUBORDINATE_TEXT.flatMap(
    ([tokenName, color]) =>
      APP_LOCAL_TINTED_SURFACES.map(
        ([surfaceName, surface]) =>
          [tokenName, surfaceName, color, surface] as [string, string, string, string],
      ),
  );

  it('covers every token x app-local surface pair', () => {
    expect(cases).toHaveLength(SUBORDINATE_TEXT.length * APP_LOCAL_TINTED_SURFACES.length);
    expect(cases).toHaveLength(10);
  });

  test.each(cases)(
    'semantic.text.%s is >= 4.5:1 on %s',
    (tokenName, surfaceName, color, surface) => {
      const ratio = getContrastRatio(color, surface);
      expect(`${tokenName} on ${surfaceName}: ${ratio >= AA_NORMAL_TEXT}`).toBe(
        `${tokenName} on ${surfaceName}: true`,
      );
    },
  );

  it('records that gray[600] would have FAILED on these same grounds', () => {
    // The reason the sweep was worth doing, stated as an assertion rather than
    // prose. Every one of these grounds carried raw gray[600] text before
    // DEBUG-370; each was a real AA failure, none was detectable by any pin that
    // existed at the time. If a future change makes gray[600] legal here, this
    // goes red and the sweep's justification should be re-read, not assumed.
    for (const [surfaceName, surface] of APP_LOCAL_TINTED_SURFACES) {
      const ratio = getContrastRatio(colorSystem.gray[600], surface);
      expect(`${surfaceName}: ${ratio < AA_NORMAL_TEXT}`).toBe(`${surfaceName}: true`);
    }
  });
});

/**
 * DEBUG-357 — severity-band labels, the one site the matrix above cannot express.
 *
 * `WellnessScreeningTrends` renders `severityBands.label` over reference bands
 * that are `severityBands.fill` (gray[700]) alpha-composited onto white at
 * `severityBands.opacity` (0.04–0.16). The effective surface is therefore a
 * COMPUTED colour, not a token — so no static (foreground, surface) entry can
 * cover it, and it was the worst-failing site in the whole item: at the severe
 * band the composite is ~#E1E1E1, where the old gray[600] measured 3.53:1.
 *
 * The large-text exemption is unavailable: those labels render at fontSize 7.
 *
 * FLAGGED, NOT FIXED: fontSize 7 is below any reasonable legible minimum
 * regardless of contrast. That is a separate defect and needs its own work item —
 * it is deliberately not folded in here, because a legibility floor is a design
 * decision about the chart, not a contrast ruling.
 */
describe('DEBUG-357: severity-band labels clear AA on the composited band fill', () => {
  /**
   * Source-over composite of an opaque `fg` at `alpha` onto an opaque `bg`.
   * Local to this file on purpose — it models how React Native flattens
   * `fillOpacity`, and does not belong in core/theme/accessibility.ts, whose
   * helpers take resolved opaque colours.
   */
  const composite = (fg: string, bg: string, alpha: number): string => {
    const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
    const mix = (i: number) => Math.round(ch(fg, i) * alpha + ch(bg, i) * (1 - alpha));
    return `#${[0, 1, 2].map((i) => mix(i).toString(16).padStart(2, '0')).join('')}`;
  };

  const bands = Object.entries(severityBands.opacity) as Array<[string, number]>;

  it('covers every severity band', () => {
    // Same anti-tautology guard as the matrix: PHQ-9 contributes the extra
    // `moderately_severe` step that GAD-7 does not have, so 5 is the real count.
    expect(bands).toHaveLength(5);
  });

  test.each(bands)('label is >= 4.5:1 on the %s band', (bandName, opacity) => {
    const surface = composite(severityBands.fill, colorSystem.base.white, opacity);
    const ratio = getContrastRatio(severityBands.label, surface);
    expect(`${bandName}: ${ratio >= AA_NORMAL_TEXT}`).toBe(`${bandName}: true`);
  });

  it('the deepest band is the worst case, so passing it bounds the rest', () => {
    // Guards the assumption the test.each above rests on: higher opacity = darker
    // surface = lower ratio against dark text. If the opacity scale is ever
    // re-ordered, this fails rather than letting the matrix silently under-test.
    const ratios = bands.map(([, opacity]) =>
      getContrastRatio(
        severityBands.label,
        composite(severityBands.fill, colorSystem.base.white, opacity),
      ),
    );
    expect(Math.min(...ratios)).toBe(ratios[ratios.length - 1]);
  });
});
