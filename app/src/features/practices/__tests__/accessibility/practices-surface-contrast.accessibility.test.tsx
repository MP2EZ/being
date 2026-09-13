/**
 * DEBUG-364 — WCAG contrast on practices surfaces, measured off RENDERED NODES.
 *
 * WHY RENDERED NODES AND NOT TOKEN PAIRS. DEBUG-342 fixed a token and the fix
 * reached none of its call sites, because 34 non-test sites read the raw ramp
 * value and bypassed the token entirely. A test that restates `getContrastRatio(
 * TOKEN_A, TOKEN_B)` cannot see that class of defect: it asserts what the theme
 * says, not what the component renders. So every pair below is read back off the
 * tree — foreground from the Text node, background from the ancestor that
 * actually declares it.
 *
 * THE PX/PT CONVENTION, pinned here because it decides two of these verdicts.
 * WCAG states large text in POINTS: 18pt regular or 14pt bold. React Native
 * `fontSize` is DP, and 1pt = 4/3 DP, so the DP thresholds are 24 (regular) and
 * 18.66 (bold) — and "bold" means weight >= 700 (CSS bold; axe-core enforces
 * 700), NOT semibold 600. Consequences:
 *   - Timer's time readout is 22 DP at weight 600. It qualifies under NEITHER
 *     path, so it needs 4.5:1. The work item listed it as passing via the
 *     large-text exemption; that was wrong, and it is fixed rather than excused.
 *   - principleEyebrow at 14 DP / 600 does not qualify either.
 * `core/theme/accessibility.ts` TYPOGRAPHY held the raw point numbers and a 600
 * bold floor; DEBUG-364 corrected it, since left as-is it would have blessed the
 * timer readout as large text and laundered a real failure into a pass.
 *
 * FILE PATH IS LOAD-BEARING. `npm run test:accessibility` is
 * `jest --testPathPattern=accessibility`; the filename AND directory both carry
 * it so this cannot silently drop out of the gate.
 *
 * RNTL performs no layout and no style cascade — it resolves declared styles
 * only. That is sufficient here because every pair's background is declared on a
 * node this file renders; it is NOT sufficient for anything relying on an
 * inherited surface, which is why the residual block below pins rather than
 * asserts those.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import GuidanceCard from '@/features/practices/shared/components/GuidanceCard';
import StoicQuoteCard from '@/features/practices/shared/components/StoicQuoteCard';
import { PreviousAnswerCard } from '@/features/practices/shared/components/PreviousAnswerCard';
import { getContrastRatio } from '@/core/theme/accessibility';
import { colorSystem, semantic, themeAccent } from '@/core/theme';

const AA_NORMAL_TEXT = 4.5;
/** SC 1.4.11 — graphical objects and UI-component boundaries. */
const AA_NON_TEXT = 3.0;

/** Resolve a possibly-array style prop to a flat object, as RN would. */
const resolved = (node: { props: { style?: unknown } }): Record<string, unknown> =>
  (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;

/**
 * The two grey-on-grey cards: DEBUG-364 owns the ROUTING, DEBUG-357 owns the VALUE.
 *
 * `GuidanceCard` item and `StoicQuoteCard` attribution were `colorSystem.gray[600]`
 * hardcoded on a `gray[100]` fill — 4.41:1, short of 4.5. It is tempting to assert
 * the ratio here and be done, but that pair is not this item's to fix: gray[600] is
 * an app-wide residual across ~120 sites, and DEBUG-357 closes it at the token by
 * moving `semantic.text.secondary` to gray[700]. Its per-(foreground, surface)
 * matrix already pins `secondary` against `gray[100]`, so the ratio IS covered —
 * once, in the file that owns it.
 *
 * What was actually broken *here* is that these two cards read the RAW RAMP, so no
 * token fix could ever reach them — precisely the DEBUG-342 failure mode. So the
 * assertion below is membership, not a number. That is not a weaker test; it is the
 * correct one, and it has the property a ratio assertion would not: it holds
 * identically before and after DEBUG-357 lands, so it can never go stale or turn
 * into a landmine in either direction.
 */
describe('DEBUG-364: the grey cards read the token, so the token fix reaches them', () => {
  it('GuidanceCard items read semantic.text.secondary, not colorSystem.gray[600]', () => {
    const { getByTestId, getByText } = render(
      <GuidanceCard title="Guidance" items={['Notice the breath']} testID="guidance-card" />,
    );
    // Still read off the rendered tree rather than the stylesheet, so a site that
    // overrides the token downstream would fail this.
    expect(resolved(getByText(/Notice the breath/)).color).toBe(semantic.text.secondary);
    // The surface is asserted too: the pairing DEBUG-357 pins is (secondary,
    // gray[100]), so if this card's fill ever changes, that pin stops covering it.
    expect(resolved(getByTestId('guidance-card')).backgroundColor).toBe(colorSystem.gray[100]);
  });

  it('StoicQuoteCard attribution reads semantic.text.secondary', () => {
    const { getByTestId, getByText } = render(
      <StoicQuoteCard quote="The obstacle is the way." author="Marcus Aurelius" />,
    );
    expect(resolved(getByText(/Marcus Aurelius/)).color).toBe(semantic.text.secondary);
    expect(resolved(getByTestId('stoic-quote-card')).backgroundColor).toBe(
      colorSystem.gray[100],
    );
  });
});

describe('DEBUG-364: the learn accent is legal as text where the brand purple is not', () => {
  it('semantic.text.learn clears 4.5:1 on white and on the learn surface', () => {
    expect(
      getContrastRatio(semantic.text.learn, colorSystem.base.white),
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    expect(
      getContrastRatio(semantic.text.learn, colorSystem.themes.learn.background),
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('white text on the learn accent as a FILL also clears 4.5:1', () => {
    // PracticeLibraryScreen's featured button and Timer's control button both put
    // white text on this value. Both directions must hold simultaneously, and they
    // move in OPPOSITE directions as the fill darkens — so asserting only one is
    // how a "fix" ships that trades one failure for another.
    expect(
      getContrastRatio(colorSystem.base.white, semantic.text.learn),
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('every theme accent is text-legal, learn included', () => {
    const entries = Object.entries(themeAccent);
    expect(entries).toHaveLength(4); // guards a silently shrinking map
    entries.forEach(([name, value]) => {
      const ratio = getContrastRatio(value, colorSystem.base.white);
      expect(`${name}: ${ratio >= AA_NORMAL_TEXT}`).toBe(`${name}: true`);
    });
  });

  it('the brand purple is still 1.4.11-legal, so it keeps its non-text uses', () => {
    // PracticeLibraryScreen's featured-card border and ActivityIndicator, and
    // Timer's progress fill, deliberately still read themes.learn.primary. This
    // records that leaving them is a ruling, not an oversight: 3.44:1 clears the
    // 3:1 non-text bar. Two-sided so that if the design system ever darkens the
    // token past the text bar, this fails and the ruling gets revisited.
    const ratio = getContrastRatio(colorSystem.themes.learn.primary, colorSystem.base.white);
    expect(ratio).toBeGreaterThanOrEqual(AA_NON_TEXT);
    expect(ratio).toBeLessThan(AA_NORMAL_TEXT);
  });
});

/**
 * DEBUG-364 — pinned as FAILING rather than silently omitted.
 *
 * MAINT-358 exists because this repo shipped a block printing "contrastRatioMet:
 * PASS" over real failures. Silent omission is the same failure wearing a
 * different hat, so everything this item did NOT fix is recorded here with a
 * bounded two-sided assertion: it breaks on a regression AND on a silent fix,
 * forcing the pin to be deleted deliberately rather than outliving the defect.
 */
describe('DEBUG-364: known-failing pairs, pinned rather than omitted', () => {
  it('~25 color: navigation.learn sites in learn/ and library/ are still failing', () => {
    // Same 3.44:1 defect, outside "practices surfaces" so outside this item's
    // scope. They need their own sweep onto semantic.text.learn.
    const ratio = getContrastRatio(colorSystem.navigation.learn, colorSystem.base.white);
    expect(ratio).toBeGreaterThan(AA_NON_TEXT);
    expect(ratio).toBeLessThan(AA_NORMAL_TEXT);
  });

  /*
   * RETIRED by MAINT-386 — the pinned defect no longer exists.
   *
   * The pin read: "SharedBreathingScreen staticGlowText is failing and was not in
   * the story" — base.black on themes[theme].primary in that screen's reduceMotion
   * branch, 3.39:1 on morning at 18 DP / weight 500, large text under NEITHER
   * corrected threshold.
   *
   * MAINT-386 deleted SharedBreathingScreen.tsx (dead since FEAT-298 slice 6c
   * orphaned it) and ported its reduce-motion handling into BreathingCircle. The
   * port deliberately does NOT carry the static-glow treatment across: the
   * replacement phase cue uses `semantic.text.primary` on the default surface
   * (21:1) with no container opacity, so the failing pair has no render site left
   * anywhere in the tree.
   *
   * Deleted rather than left passing, per this describe's own contract: the
   * assertion was on colorSystem tokens, not on the component, so it would have
   * gone on passing indefinitely while naming a file that no longer exists —
   * silent omission wearing the other hat. If a themed colour is ever composited
   * under a container opacity on a breath surface again, this pin should come
   * back with a live subject.
   */

  it('ProgressiveBodyScanList still carries hardcoded hexes, one of them failing', () => {
    // #4CAF50 on #E8F5E9 is ~2.2:1 — worse than any pair the story listed — and is
    // also a direct CLAUDE.md no-hardcoded-hex violation. Its own item.
    expect(getContrastRatio('#4CAF50', '#E8F5E9')).toBeLessThan(AA_NON_TEXT);
  });

  it('gray[300] borders remain below 3:1, as the story explicitly scoped out', () => {
    // BodyAreaGrid and the unselected virtueChip. Argued acceptable because
    // selection is also carried by a large background-fill delta plus
    // accessibilityState.selected, so 1.4.11 is satisfied by other means.
    expect(
      getContrastRatio(colorSystem.gray[300], colorSystem.base.white),
    ).toBeLessThan(AA_NON_TEXT);
  });
});

/**
 * MAINT-487 — the two practices findings the gray[700] call-site sweep produced.
 *
 * Neither is covered by the pins that already exist. `gray700-call-sites.
 * accessibility.test.ts` asserts that no raw reference survives outside its allowlist;
 * it is deliberately blind to WHY a survivor is lawful, which is a prose field there.
 * `theme-contrast.accessibility.test.ts` asserts tokens against enumerated surfaces and
 * structurally cannot enumerate `themes.*.light` — the whole point of the first pin
 * below is that no ramp value is legal on that ground, so adding it to the matrix would
 * produce a permanent red with no fix available.
 */
describe('MAINT-487: the gray[700] sweep on practices surfaces', () => {
  it('BodyAreaGrid: no ramp neutral is legal on themes.*.light, so its text stayed raw', () => {
    // The carve-out's arithmetic, asserted rather than described. `noteSection` takes
    // `themeColors.light`, and these are SATURATED ACCENT MID-TONES, not light
    // surfaces. Two already fail at today's value, and the swept token would take all
    // four under — so a blind sweep here would have made a latent failure worse. This
    // goes red the moment a ramp value becomes legal on evening, which is the only
    // event that should reopen the carve-out.
    for (const theme of ['morning', 'midday', 'evening', 'learn'] as const) {
      const ground = colorSystem.themes[theme].light;
      expect(`${theme}: ${getContrastRatio(semantic.text.secondary, ground) < AA_NORMAL_TEXT}`)
        .toBe(`${theme}: true`);
    }

    // And that it is LATENT rather than live — the reason it is a carve-out and not a
    // bug. Two of the four already fail at the raw value the component still carries.
    expect(
      getContrastRatio(colorSystem.gray[700], colorSystem.themes.evening.light),
    ).toBeLessThan(AA_NORMAL_TEXT);
  });

  it("PreviousAnswerCard renders the user's own answer at primary, above its own caption", () => {
    // Read off the tree, per this file's contract. The card already subordinates the
    // caption structurally — enclosure, left rule, gray[100] fill, italic, quotation
    // marks — so the answer carries no chromatic demotion on top: at `secondary` it
    // would render the same colour as its own label and the card would collapse into
    // one grey block. The substantive reason is that this is the practitioner's
    // exercised judgement, and the app's instructional voice sits at primary
    // throughout; ranking the user's assent below the app's prompts is the thing this
    // assertion exists to prevent regressing.
    const { getByText } = render(
      <PreviousAnswerCard label="What's weighing on you:" answer="the meeting" theme="midday" />,
    );
    expect(resolved(getByText('"the meeting"')).color).toBe(semantic.text.primary);
    expect(resolved(getByText("What's weighing on you:")).color).toBe(semantic.text.secondary);
    expect(semantic.text.primary).not.toBe(semantic.text.secondary);

    // gray[100] is the declared fill, and it is already in the matrix's SURFACES.
    expect(getContrastRatio(semantic.text.primary, colorSystem.gray[100]))
      .toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});
