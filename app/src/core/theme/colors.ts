/**
 * Being. Color System - Powered by @mp2ez/being-design-system
 *
 * Re-exports design tokens from the shared design system package.
 * The Proxy wrapper on themes provides safe access with fallback warnings.
 */
import {
  colors as dsColors,
  spacing,
  borderRadius,
  typography,
  getTheme,
  shadows,
} from '@mp2ez/being-design-system/native';
import type { Theme, ThemeKey, Shadows, ShadowKey } from '@mp2ez/being-design-system/native';

// Re-export spacing, borderRadius, typography, getTheme, shadows directly.
// MAINT-222: shadows is now re-exported here so UI uses the DS elevation token
// instead of hand-rolled shadowColor:'#000' literals (DS guidance: prefer borders).
export { spacing, borderRadius, typography, getTheme, shadows };
export type { Theme, ThemeKey, Shadows, ShadowKey };

// Create themes object with Proxy for safe access (maintains backward compatibility)
const themesHandler: ProxyHandler<typeof dsColors.themes> = {
  get(target, prop) {
    if (prop in target) {
      return target[prop as keyof typeof target];
    }
    console.warn(`[Theme Warning] Attempted to access undefined theme: ${String(prop)}, falling back to morning`);
    return target.morning;
  }
};

const themesProxy = new Proxy(dsColors.themes, themesHandler);

// Build colorSystem from design system values with Proxy-wrapped themes
export const colorSystem = {
  themes: themesProxy,
  base: dsColors.base,
  gray: dsColors.gray,
  status: dsColors.status,
  accessibility: dsColors.accessibility,
  navigation: dsColors.navigation,
  therapeutic: dsColors.therapeutic,
  principles: dsColors.principles, // MAINT-253: principle category colours for the Insights chart
};

// Export as 'colors' for backward compatibility
export const colors = colorSystem;

/**
 * Semantic color tokens for common UI patterns
 * Maps intent to specific color values
 */
export const semantic = {
  text: {
    primary: colorSystem.base.black,
    secondary: colorSystem.gray[700],
    // DEBUG-323: was gray[500], which is 1.98:1 on background.primary (white) —
    // failing WCAG AA for normal text (4.5:1) AND for large text (3:1). A
    // semantic *text* token that could not legally render text on the default
    // background; all 7 non-test consumers were latent AA failures.
    //
    // This is a DELIBERATE ALIAS of `secondary`, not an oversight. The
    // design-system gray ramp has no accessible step between gray[500] (1.98:1)
    // and gray[600] (4.61:1) — so any value light enough to read as distinct
    // from the passing step is by construction too light to pass. There is no
    // legal third text tier, and minting a hex would violate the
    // no-hardcoded-colour rule.
    //
    // Consequence: quieting must be expressed STRUCTURALLY — italic, position,
    // size, enclosure — never chromatically. Same ruling FEAT-292 already made
    // one level down at DailyLoopStepScreen.tsx ("subordination is preserved
    // structurally rather than chromatically"); this lifts it to the token so
    // the two cannot contradict each other.
    //
    // DEBUG-357: both tokens moved gray[600] -> gray[700]. gray[600] (#757575)
    // was legal ONLY on white (4.61:1) and failed AA on every other surface in
    // the app — gray[50] 4.38, gray[100] 4.41, gray[200] 4.23, and all four
    // getTheme backgrounds 4.26–4.37. That made the token a trap: the "correct"
    // choice silently failed the moment a site sat on a tinted surface, and the
    // pin at the time asserted white only, so nothing could detect it.
    //
    // DEBUG-370 CORRECTED TWO NUMBERS IN THIS BLOCK. The gray[200] figure read
    // 3.97 and the worst case below read 8.66; re-derived against
    // @mp2ez/being-design-system@1.9.0 they are 4.23 and 9.22. 3.97 in particular
    // corresponds to nothing in the ramp (gray[300] is 3.76), and it was the
    // figure DEBUG-370's acceptance criteria leaned on to justify a non-text
    // carve-out that turned out not to exist. Neither error changed a pass/fail
    // verdict — the ruling below stands unaltered — but a wrong ratio in prose
    // gets copied into the next story, which is exactly how it reached one.
    //
    // DEBUG-380 CORRECTED THE WORST CASE STATED BELOW, for the same reason
    // DEBUG-370 corrected the two above it — and one iteration later, which is
    // the point. The figure read "9.22 on gray[200]", which was true when
    // DEBUG-370 wrote it and went stale in that same commit: DEBUG-370 added
    // gray[300] (#E8E8E8) to the matrix's SURFACES, and gray[300] is the darkest
    // ground in the app, so it displaced gray[200] as the binding constraint on
    // every neutral. Re-derived across all 17 grounds the pin now asserts, the
    // true worst case is 8.202 on gray[300]. The verdict is unaltered (8.202 >>
    // 4.5) — but a prose ratio that nothing asserts drifts every time the surface
    // set grows, and it has now drifted twice.
    //
    // gray[700] (#424242) clears 4.5:1 on EVERY surface (worst case 8.202 on
    // gray[300]), which makes these tokens SURFACE-INDEPENDENT. That property is
    // the point, not a side effect: `SkipLink` renders `muted` with no
    // backgroundColor of its own over five different hosts, so its surface is
    // not statically knowable and no per-site fix could ever cover it.
    //
    // The cost is that the subordinate tier and body text are now the same
    // colour. That is the DEBUG-323 ruling above being paid, not violated —
    // there was never a legal chromatic tier to preserve.
    //
    // DEBUG-380 TESTED THAT COST AND UPHELD IT. The complaint was that `primary`
    // (base.black #1C1C1C) and `secondary` (gray[700]) are now 1.696:1 apart,
    // down from 3.699:1 before DEBUG-357 — near-indistinguishable, in a token
    // vocabulary that claims two tiers. Real, and DEBUG-370 multiplied the
    // affected sites roughly fivefold. But the proposed remedy — re-point
    // `primary` to gray[800] — is arithmetically impossible twice over:
    //
    //   - gray[800] #212121 is rgb(33,33,33); base.black #1C1C1C is rgb(28,28,28).
    //     gray[800] is LIGHTER, so the re-point moves the separation to 1.602:1
    //     and makes the defect worse. The "800" label misleads because
    //     `colors.base` and `colors.gray` are separate namespaces that merely
    //     interleave at the dark end. gray[900] #171717 is genuinely darker but
    //     buys only 1.784:1 — a 5/255 step.
    //   - The ~2.3:1 target is unreachable by any foreground whatsoever. Against a
    //     fixed `secondary` the separation is (L_sec + 0.05) / (L_fg + 0.05),
    //     maximised at L_fg = 0, so the ceiling is 2.090:1 at pure #000000.
    //
    // WCAG has no criterion governing contrast between two text TIERS (1.4.3 and
    // 1.4.6 govern text against its background; 1.4.11 governs UI components and
    // graphical objects), and both tiers clear AA on all 17 grounds the pin
    // asserts — so this is a hierarchy judgement, not a gate failure.
    //
    // Two further facts settle it. #1C1C1C is not an app-side accident: it IS the
    // design system's own `colors.text.primary`, paired in-package with
    // `text.secondary` #424242, so the collapsed pairing is the DS's declared
    // intent. And there WAS a second prerequisite here — this note used to say
    // `semantic.text.primary` reached "only ~26 render sites" while
    // `colorSystem.base.black` was read directly at "~102 across 46 files", so a
    // primary re-point would move a fifth of the sites and mint two
    // indistinguishable blacks: the DEBUG-342 token-bypass shape, one token up.
    //
    // DEBUG-387 DISCHARGED IT. Those figures were inherited prose, never measured
    // (the real counts were 32-34 and 100 across 45 files), and the condition is
    // now gone: this token is the SOLE reader of the primary text ramp.
    // `colorSystem.base.black` survives only as its definition on the line below
    // plus three decorative `shadowColor:` sites, and the raw `#1C1C1C` literal is
    // a hard zero in source — both pinned in BOTH directions by
    // `__tests__/black-call-sites.accessibility.test.ts`, so the bypass cannot
    // regrow silently. A primary re-point now moves every site at once.
    //
    // The only lever that can actually restore a chromatic tier is LIGHTENING
    // `secondary`, which the app cannot do — it can re-point which ramp value a
    // semantic token reads, not add one. That needs a design-system release
    // minting a legal mid-tier (~#686868, 4.548:1 on gray[300]), tracked
    // separately. Until then the ruling stands: subordination is structural.
    //
    // Pinned mechanically by the DEBUG-380 describe in
    // core/theme/__tests__/theme-contrast.accessibility.test.ts, including an
    // assertion that #000000 itself cannot reach 2.3:1 — so the target cannot be
    // re-proposed from prose — and one that goes RED if the ramp is ever widened,
    // which is the only event that should re-open this.
    //
    // Pinned by core/theme/__tests__/theme-contrast.accessibility.test.ts, which
    // DEBUG-357 widened from a single-surface assertion to a per-(foreground,
    // surface) matrix so "valid only on white" cannot become tribal knowledge again.
    muted: colorSystem.gray[700],
    inverse: colorSystem.base.white,
    // DEBUG-364: the learn-brand purple that is LEGAL AS TEXT on light surfaces.
    //
    // THE COUNTERPART RULE, which is the whole point of this token existing:
    // `colorSystem.navigation.learn` and `colorSystem.themes.learn.primary` are
    // the SAME hex (#9B7EBD) at 3.44:1 on white. That clears the WCAG 1.4.11
    // non-text bar (3:1) but NOT the 1.4.3 text bar (4.5:1), so it may be used as
    // a fill, a border or an icon — never as `color:`.
    //
    // The design system already says so in its own code: the token's comment
    // reads "Use for >=18pt text or icons; for body text on learn surfaces, pair
    // with accessibility.text.primary or text.primary instead", and
    // `pairings.learnPrimaryOnBackground` is declared at level 'AA-large'. So the
    // eight failing practices sites were app-side MISUSE of a correctly-labelled
    // token, not a broken token — which is why this is fixed here and needs no
    // design-system release.
    //
    // themes.learn.success (#7C5FA0) is the same brand family one step darker:
    // 5.25:1 on white, 5.25:1 as a fill under white text, and 4.86:1 on
    // themes.learn.background. It clears the text bar in every direction these
    // sites need, with zero new hex. MAINT-253 already promoted it elsewhere as
    // "darker brand purple", so this is a second consumer of a settled choice.
    learn: colorSystem.themes.learn.success,
  },
  background: {
    primary: colorSystem.base.white,
    secondary: colorSystem.gray[100],
    // MAINT-263: single tab-screen surface token. Home/Learn/Insights/Profile (and the
    // Insights "full history" detail screen) all read from this so the cross-tab
    // background decision lives in one place. Unified to white (was: Insights gray[100])
    // after MAINT-257 made tab headers borderless — the screen background is now the
    // visual separator, so one surface keeps the tabs reading as a single coherent space.
    // Insights content cards take a 1px semantic.border.default hairline to stay defined
    // on white (they previously relied on the gray backdrop).
    screen: colorSystem.base.white,
  },
  border: {
    default: colorSystem.gray[200],
    strong: colorSystem.gray[400],
  },
} as const;

/**
 * DEBUG-364 — the text-legal accent for each time-of-day / learn theme.
 *
 * `colorSystem.themes[k].primary` is the theme's brand accent, but it is only
 * *coincidentally* legal as text. Measured on white: morning #B45309 5.02:1,
 * midday #0F766E 5.47:1, evening #4A7C59 4.86:1 — and learn #9B7EBD 3.44:1,
 * which FAILS. Learn is the single asymmetry in the set, and it is the default
 * theme of `Timer`, so a component reading `themeColors.primary` for text is
 * correct three times out of four and silently wrong the fourth.
 *
 * This map exists so a consumer can resolve a text-safe accent by theme without
 * a conditional at the call site — which is exactly where the asymmetry would
 * otherwise be forgotten. Every value is an existing design-system token; the
 * learn entry simply points one step darker in the same brand family.
 *
 * Use this for `color:` and for fills sitting under white text. For progress
 * bars, borders and icons, keep reading `themes[k].primary` — those are governed
 * by 1.4.11 at 3:1, which #9B7EBD clears.
 */
export const themeAccent: Record<ThemeKey, string> = {
  morning: colorSystem.themes.morning.primary,
  midday: colorSystem.themes.midday.primary,
  evening: colorSystem.themes.evening.primary,
  learn: semantic.text.learn,
};

/**
 * Neutral severity reference-band tokens (FEAT-30).
 *
 * Used to shade the clinical reference ranges behind the Wellness Screening
 * Trends chart. Deliberately NOT a green→red stoplight ramp: a rising PHQ-9 /
 * GAD-7 score is information, not failure, so severity must read as neutral
 * depth + a text label — never as "you're winning / failing" colour
 * (philosopher red line on moralized severity colour).
 *
 * A single DS gray fill is rendered at increasing `fillOpacity` for higher
 * severity bands (deeper, not redder). Zero new hex — all values derive from
 * the design-system gray scale.
 */
export const severityBands = {
  /** Single neutral fill for every reference band (legacy filled-band style). */
  fill: colorSystem.gray[700],
  /** Hairline colour for reference-boundary gridlines (neutral, matches list dividers). */
  gridline: colorSystem.gray[300],
  /** Neutral colour for band range labels. */
  label: semantic.text.muted,
  /**
   * Per-severity fill opacity. Keyed by the clinical severity names used by
   * PHQ-9 (includes `moderately_severe`) and GAD-7. Stepped, not hued.
   */
  opacity: {
    minimal: 0.04,
    mild: 0.07,
    moderate: 0.1,
    moderately_severe: 0.13,
    severe: 0.16,
  },
} as const;

export type SeverityBandKey = keyof typeof severityBands.opacity;

// Flat re-exports for direct destructuring (optional convenience)
// Use colorSystem.* for most cases; these are for legacy compatibility
export const crisis = colorSystem.status.critical;
