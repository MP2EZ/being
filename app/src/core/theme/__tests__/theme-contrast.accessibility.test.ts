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
 * The list stays explicit, but the REASON changed (MAINT-471). It used to be that
 * the ramp was non-monotonic at the light end; design-system v1.10.0 swapped
 * gray[50] and gray[100] — they had shipped inverted — so it is now monotonic by
 * luminance end to end. The list is explicit so that a surface ADDED to the app
 * fails here until it is enumerated, which is the property that actually matters.
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
  // MAINT-487 addition, on the same "the sweep genuinely lands token text on them"
  // rule as the four above. `CrisisResourcesScreen.emergencyCard` overrides the 911
  // card's white ground to this tint, and the sweep moved `resourceDescription` onto
  // `semantic.text.secondary` inside it — so without this entry the one test whose
  // purpose is to govern swept text would ship green over an ungoverned ground.
  // gray[650] measures 4.8744 here, the thinnest margin the sweep produced.
  ['#FFEBEE (CrisisResourcesScreen.emergencyCard)', '#FFEBEE'],
  // MAINT-487, the two ALPHA-COMPOSITED learn tints. Unlike every entry above, these
  // are not authored hexes — they are `colorSystem.navigation.learn + '10' | '15'`
  // resolved over a white host, so the literal here is DERIVED and only valid while
  // the host stays white. Every live host was checked and is (`sharedPracticeStyles`
  // container, GuidedBodyScanScreen:203, SortingPracticeScreen:343, and
  // PracticeScreenLayout, which sets none and inherits the white navigator default).
  // Same class as `severityBands` — a surface computed at render time — but unlike the
  // bands these composite LIGHTER than gray[300], so the mid-tier neutral is legal and
  // a static entry can express them. gray[600] is 4.3278 / 4.2292 here, so the
  // "would have FAILED" loop below still holds on both.
  ['#F9F7FB (navigation.learn +10 over white)', '#F9F7FB'],
  ['#F7F4FA (navigation.learn +15 over white)', '#F7F4FA'],
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
    // ALL surfaces does exist numerically — but the value it named, roughly
    // #707070, is NOT it.
    //
    // DEBUG-380 CORRECTION: #707070 measures 4.042:1 on gray[300], so it FAILS.
    // That figure was true when written and went stale in the same commit that
    // superseded it: DEBUG-370 added gray[300] (#E8E8E8) to SURFACES, and
    // gray[300] is the darkest ground in the matrix, so it displaced gray[200]
    // as the binding constraint on every neutral. The true lightest
    // all-surface-legal neutral is #686868 at 4.548:1 on gray[300] — a margin of
    // 0.048 over the bar, thin enough that darkening any surface token would
    // break it.
    //
    // The ruling is UNCHANGED and the correction strengthens it rather than
    // weakening it: #686868 is four hex steps from gray[600] (#757575), so it is
    // still visually indistinguishable and still cannot express a third tier.
    // MAINT-471: #686868 IS gray[650] now, so the guard passes on the shipped
    // token by ramp membership rather than by luck. What it still forbids is
    // HAND-TYPING that value: a literal #686868 has the same pixels and none of the
    // ramp's guarantee, and it is the invent-a-lighter-grey reflex — not this
    // particular hex — that the guard exists to catch. That is the
    // trap this assertion exists to close.
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
    // This assertion's PREMISE VALUE has now changed under it TWICE, and the
    // assertion itself has never moved. When DEBUG-342 wrote it, muted was gray[600]
    // and the margin over the 3:1 bar was 4.61 → thin. DEBUG-357 took it to gray[700]
    // at 10.05:1. MAINT-471 took it to gray[650] at 5.5723:1 — still comfortably over
    // the bar, and deliberately LESS margin than gray[700] gave, because the point of
    // the mid-tier is to be lighter. Recorded so a future reader does not mistake a
    // shrinking margin for a regression. The 3.0 bar is right — these are graphical
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
    // WHEN DEBUG-357 CLOSED THIS, the gap closed structurally rather than by finding
    // a better grey, because at the time there was no legal third grey — the ramp
    // jumped gray[500] 1.98:1 → gray[600] 4.61:1 → gray[700]
    // 10.05:1 with nothing usable between. THAT IS NO LONGER TRUE (MAINT-471):
    // design-system v1.10.0 minted gray[650] #686868 at 5.5723:1, which sits exactly
    // in that gap and is what `muted` reads today. The historical reasoning is kept
    // because it explains why the collapse was the right call THEN; do not read it as
    // a standing claim about the ramp. The resolution at the time was to collapse the
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
    // MAINT-487: 10 -> 16 (2 tokens x 8 grounds). The literal is the belt to the
    // derived length's braces, so it is SUPPOSED to go red when a ground is added —
    // updating it is the moment you confirm the new surface was deliberate. Do not
    // replace it with the expression.
    expect(cases).toHaveLength(16);
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
    // prose. Each of the DEBUG-370 grounds carried raw gray[600] text before that
    // sweep; each was a real AA failure, none was detectable by any pin that
    // existed at the time. If a future change makes gray[600] legal here, this
    // goes red and the sweep's justification should be re-read, not assumed.
    //
    // MAINT-487 NARROWED THE CLAIM: #FFEBEE carried raw gray[700] (8.7911), not
    // gray[600], so "every one of these grounds carried gray[600]" stopped being
    // true when that entry was added. The ASSERTION still holds on it — gray[600]
    // is 4.0305 there — and is kept for that reason, but the history sentence is
    // now about the DEBUG-370 five only. Same class of prose drift this file has
    // twice corrected in colors.ts: a stale ratio or provenance gets copied into
    // the next story.
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

/**
 * DEBUG-380 — the primary↔secondary separation, pinned as a RULING rather than fixed.
 *
 * DEBUG-357 moved `secondary`/`muted` gray[600] → gray[700] to close a real AA
 * failure. Its side effect was that the two text tiers stopped being
 * chromatically distinguishable: `primary` is `base.black` #1C1C1C, so the
 * separation fell from 3.699:1 to 1.696:1. DEBUG-370 then multiplied the affected
 * sites roughly fivefold, which is what made it worth filing.
 *
 * DEBUG-380 PROPOSED re-pointing `primary` to gray[800] to restore ~2.3:1. That
 * remedy is arithmetically impossible, in two independent ways, and this describe
 * exists so neither can be re-proposed from prose:
 *
 *   1. gray[800] #212121 is rgb(33,33,33). base.black #1C1C1C is rgb(28,28,28).
 *      gray[800] is LIGHTER. Re-pointing there moves the separation to 1.602:1 —
 *      it makes the filed defect WORSE. The "800" label misleads because
 *      `base.black` is not a member of the gray ramp at all; `colors.base` and
 *      `colors.gray` are separate namespaces that happen to interleave at the
 *      dark end. gray[900] #171717 IS darker, but buys only 1.784:1 — a 5/255
 *      step, imperceptible.
 *   2. The ~2.3:1 target is unreachable by ANY foreground. Separation against a
 *      fixed `secondary` is (L_sec + 0.05) / (L_fg + 0.05), maximised at L_fg = 0,
 *      so with `secondary` at gray[700] the supremum is 2.090:1 at pure #000000.
 *      2.3:1 would require 23.1:1 on white against a 21:1 physical ceiling.
 *
 * THE RULING HELD FOR EXACTLY AS LONG AS ITS PREMISE DID (MAINT-471).
 *
 * The ruling was: accept the flattening; subordination is expressed structurally —
 * italic, position, size, enclosure — never chromatically. Its PREMISE was that the
 * ramp had no legal step between gray[600] and gray[700], so the only lever was a
 * design-system release minting a mid-tier, which the app cannot do for itself.
 *
 * MAINT-388 minted it. `gray[650]` #686868 clears 4.5:1 on all 17 enumerated
 * grounds (worst case 4.5478 on gray[300], margin 0.0478), and MAINT-471 re-pointed
 * `secondary`/`muted` onto it. Separation went 1.696:1 → 3.0583:1 and the supremum
 * went 2.090:1 → 3.7686:1.
 *
 * So both assertions below going red was the ruling WORKING AS DESIGNED, not
 * failing: they were written to fire the moment the dark end of the ramp widened,
 * because that was the only moment worth re-opening this. They are now RESIDUAL
 * pins on the new state — the tier is restored but NOT back to its pre-DEBUG-357
 * value, and that gap stays visible rather than being declared closed.
 *
 * WHAT SURVIVES UNCHANGED:
 *   - Both arithmetic impossibilities above. gray[800] is still LIGHTER than
 *     base.black, and the supremum is still (L_sec + 0.05) / (L_fg + 0.05)
 *     maximised at L_fg = 0. That formula is precisely WHY the fix worked from the
 *     other side: the supremum is a function OF `secondary`, so widening the ramp
 *     moved it. Re-pointing `primary` remains the wrong lever.
 *   - DEBUG-323's structural-subordination ruling. No legal FOURTH text tier
 *     exists — the design system kept `colors.text.tertiary` #757575 white-only for
 *     the same reason — so subordination past `secondary` is still structural.
 *   - `semantic.text.primary` reaches only ~26 render sites while
 *     `colorSystem.base.black` is read directly at ~102, so any future primary move
 *     must still be preceded by that sweep. That is the DEBUG-342 shape, one token
 *     up — and it now has a sibling: ~61 raw `colorSystem.gray[700]` text reads
 *     across 27 files did NOT follow this re-point, so the app ships two subordinate
 *     greys until that sweep lands. Tracked separately.
 */
describe('DEBUG-380: the primary↔secondary separation ruling', () => {
  it('records the collapse — the two text tiers are not chromatically distinct', () => {
    // MAINT-471 INVERTED THIS PIN. It used to assert the collapse (< 3.0) and fired
    // when the ramp widened — which is exactly what it was for. gray[650] restored
    // the tier, so it now asserts the RESTORATION, and keeps the residual visible:
    // 3.0583 clears the 3:1 large-text threshold but is still short of the 3.699
    // this had before DEBUG-357. The upper bound is what stops "restored" being
    // read as "back to where we were".
    const separation = getContrastRatio(semantic.text.primary, semantic.text.secondary);
    expect(separation).toBeGreaterThan(3.0);
    expect(separation).toBeLessThan(3.699);
  });

  it('proves the ~2.3:1 acceptance target is unreachable by ANY foreground', () => {
    // MAINT-471: the 2.3 VERDICT is retired — the shipped token now exceeds it
    // (3.7686) — but the MECHANISM this test existed to pin is unchanged and is
    // what made the fix legible. Pure black is the theoretical maximum contrast
    // against anything, so the supremum is a function of `secondary` alone. Pinning
    // that relation keeps the arithmetic re-derivable if `secondary` ever moves
    // again, where pinning the old verdict would only record a number that is no
    // longer true. #000000 stays a literal on purpose: it is named to be REJECTED
    // as a foreground, the same way gray[500] is named in the DEBUG-342 block above.
    const ceiling = getContrastRatio('#000000', semantic.text.secondary);
    expect(ceiling).toBeGreaterThan(2.3);
    // No real foreground can beat pure black, so the shipped separation must sit at
    // or below the supremum. This is the invariant; the numbers above are its values.
    const separation = getContrastRatio(semantic.text.primary, semantic.text.secondary);
    expect(separation).toBeLessThanOrEqual(ceiling);
  });

  it('blocks the gray[800] proposal by name — it is LIGHTER than base.black', () => {
    // The specific inversion DEBUG-380 was filed on. Asserted as a comparison
    // rather than as two magic numbers so it stays true if the design system
    // renumbers the ramp, and still fails loudly if gray[800] ever becomes the
    // darker of the two (at which point the proposal deserves a fresh hearing).
    const white = colorSystem.base.white;
    expect(getContrastRatio(colorSystem.gray[800], white)).toBeLessThan(
      getContrastRatio(colorSystem.base.black, white),
    );
  });

  it('confirms secondary is the binding constraint, not primary', () => {
    // Why the remedy has to move `secondary` and not `primary`: `primary` already
    // sits within 0.9 of the 21:1 ceiling, so there is almost nothing left to
    // gain by darkening it, while `secondary` still has headroom above the 4.5 bar
    // (1.07 points on white as of MAINT-471's gray[650], down from ~5.6 under
    // gray[700] — the mid-tier spends headroom on purpose). States
    // the asymmetry mechanically so the next reader does not have to re-derive it.
    const white = colorSystem.base.white;
    const primaryHeadroom = 21 - getContrastRatio(semantic.text.primary, white);
    const secondaryHeadroom = 21 - getContrastRatio(semantic.text.secondary, white);
    expect(primaryHeadroom).toBeLessThan(5);
    expect(secondaryHeadroom).toBeGreaterThan(primaryHeadroom);
  });
});
