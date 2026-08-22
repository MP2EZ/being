/**
 * DailyLoopCompleteScreen completion-register guard — FEAT-328.
 *
 * The copy-side guard in tenseMode.test.ts ('never congratulates, rewards, or absolves')
 * matches only the joined CLOSING constants. That is why it never saw the "✓ Loop complete"
 * badge: the string was inline in this screen's JSX, so the rule and the violation lived in
 * the same feature and never met. This file is the render-level counterpart — it pins the
 * INVARIANT in tenseMode.ts ("completion may be stated, never marked") against what is
 * actually on screen, which is the only surface that can prove it.
 *
 * Two things are asserted, and they are deliberately a pair:
 *  - completion is still STATED (the depth-accurate title renders, and is the first thing
 *    in the block) — this is the guard on the counter-argument that removing the badge
 *    leaves a breath-skipper with no confirmation the practice worked,
 *  - completion is not MARKED (no checkmark, no accent-coloured surface inside the coda).
 *
 * Scoping note: the assertions walk the ScrollView subtree only. The pinned footer button
 * is legitimately accent-filled and sits outside it. That is the real distinction the rule
 * draws — accent in this app codes AFFORDANCE, so a tappable accent surface is correct and
 * a static one is reward. Do not "fix" a future failure by widening the scope to include
 * the footer; a failure here means something non-interactive went accent.
 *
 * The post-breath state is reached by pressing the skip link, NOT by advancing fake timers
 * past the 15s closing breath — see docs/development/test-fake-timer-ci-flake.md.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import DailyLoopCompleteScreen from '../screens/DailyLoopCompleteScreen';
import { getCompleteTitle } from '../config/tenseMode';
import { getTheme } from '@/core/theme';
import type { DailyLoopDepth } from '@/features/practices/types/flows';

const ACCENT = getTheme('midday').primary;
/**
 * The removed badge was filled with the theme's pale accent TINT and lettered in the
 * accent teal. Both count as accent coding, so both are banned — checking only `primary`
 * would let a tinted pill with neutral text walk straight back in, which is most of what
 * the badge was.
 */
const ACCENT_TINT = getTheme('midday').background;

/** Render the screen and skip the closing breath to land in the post-breath block. */
const renderPostBreath = (depth: DailyLoopDepth) => {
  const utils = render(
    <DailyLoopCompleteScreen depth={depth} mode="flat" onComplete={jest.fn()} />,
  );
  fireEvent.press(utils.getByTestId('daily-loop-skip-closing-breath'));
  return utils;
};

/** Every resolved style object in the scrolling coda content. */
const codaStyles = (getByTestId: ReturnType<typeof render>['getByTestId']) =>
  getByTestId('daily-loop-complete-screen')
    .findAll(() => true)
    .map((node) => StyleSheet.flatten(node.props?.style))
    .filter((style): style is Record<string, unknown> => Boolean(style));

describe('completion is stated', () => {
  it.each<DailyLoopDepth>(['quick', 'deep'])(
    'renders the depth-accurate completion title (%s)',
    (depth) => {
      const { getByText } = renderPostBreath(depth);
      // Not merely "some completion signal exists" — the title IS the signal now that the
      // badge is gone, so it has to be the depth-correct one. Quick moved through three
      // canonical beats, and claiming five would be false.
      expect(getByText(getCompleteTitle(depth))).toBeTruthy();
    },
  );
});

describe('completion is not marked', () => {
  it('renders no checkmark anywhere in the coda', () => {
    const { toJSON } = renderPostBreath('deep');
    expect(JSON.stringify(toJSON())).not.toContain('✓');
  });

  it('exposes no "Loop complete" marker to assistive tech', () => {
    // The badge carried accessibilityLabel="Loop complete" (the ✓ glyph itself was never
    // announced), so a text-only assertion would have missed half of what shipped.
    const { queryByLabelText, queryByText } = renderPostBreath('deep');
    expect(queryByLabelText('Loop complete')).toBeNull();
    expect(queryByText(/loop complete/i)).toBeNull();
  });

  it('uses no accent fill or accent text inside the scrolling coda content', () => {
    // The durable invariant. `borderColor` is deliberately NOT checked: the integration
    // note's active border is accent by design and is an affordance, not reward.
    const offenders = codaStyles(renderPostBreath('deep').getByTestId).filter(
      (style) =>
        style.backgroundColor === ACCENT ||
        style.backgroundColor === ACCENT_TINT ||
        style.color === ACCENT,
    );
    expect(offenders).toEqual([]);
  });
});
