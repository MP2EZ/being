/**
 * DEBUG-678 — the completion title breaks between words, never inside one, at AX sizes.
 *
 * Observed on a Release build at AX5 (402x874): "Practic / e Comple / te". headline2 is
 * 28pt semibold, ×3.571 at AX5 ≈ 100pt, and the title box is W − 2·spacing[24]. Each of
 * the two words is wider than that box on every iPhone width, so no padding fixes it.
 *
 * Accessibility ruled T2 (recorded on DEBUG-678): cap the TITLE only, at the AX5 endpoint
 * of iOS's own Title 1 ramp (28 → 58pt). That is DEBUG-629's category: a fixed string
 * that carries no state (the checkmark, the announcement and the uncapped practice name
 * all say the same thing), where a cap ≥ 2.0 IS WCAG 1.4.4 conformance. It is NOT
 * DEBUG-619's practice-name title, which is never capped, and it is no precedent for
 * the quote, the practice name or the educational copy, which are content.
 *
 * Jest has no text layout, so the width budget below is arithmetic over a CoreText
 * estimate (SF Pro semibold advances). The on-device proof is DEBUG-678 AC2.
 */

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import PracticeCompletionScreen, {
  PRACTICE_COMPLETION_TITLE_MAX_FONT_SCALE,
  PRACTICE_QUOTES,
} from '@/features/learn/practices/PracticeCompletionScreen';
import { spacing, typography } from '@/core/theme';
import type { ModuleId } from '@/features/learn/types/education';

const MODULE: ModuleId = 'interconnected-living';
const TITLE = 'Practice Complete';

/** RN's iOS content-size multipliers (RCTAccessibilityManager). */
const AX4_FONT_SCALE = 3.143;
const AX5_FONT_SCALE = 3.571;

/** iOS Title 1 at its default size and at AX5. */
const IOS_TITLE1_DEFAULT_PT = 28;
const IOS_TITLE1_AX5_PT = 58;

/** "Complete", the wider title word, in em at SF Pro semibold (CoreText estimate). */
const COMPLETE_EM = 4.358;

/** The title box on the narrowest supported iPhone (375pt wide). */
const NARROWEST_TITLE_BOX_PT = 375 - 2 * spacing[24];

function renderScreen() {
  const quote = Object.values(PRACTICE_QUOTES)[0];
  return render(
    <PracticeCompletionScreen
      practiceTitle="Breathing Space"
      quote={quote}
      moduleId={MODULE}
      onContinue={() => {}}
    />
  );
}

describe('PRACTICE_COMPLETION_TITLE_MAX_FONT_SCALE', () => {
  it('is above 1, so iOS honours it (DEBUG-579)', () => {
    expect(PRACTICE_COMPLETION_TITLE_MAX_FONT_SCALE).toBeGreaterThan(1);
  });

  it('is at least WCAG 1.4.4\'s 200%', () => {
    expect(PRACTICE_COMPLETION_TITLE_MAX_FONT_SCALE).toBeGreaterThanOrEqual(2);
  });

  it('never renders the title below iOS\'s own Title 1 at AX5', () => {
    expect(PRACTICE_COMPLETION_TITLE_MAX_FONT_SCALE).toBeGreaterThanOrEqual(
      IOS_TITLE1_AX5_PT / IOS_TITLE1_DEFAULT_PT
    );
  });

  it('keeps "Complete" inside the narrowest title box at the cap', () => {
    const cappedPt = typography.headline2.size * PRACTICE_COMPLETION_TITLE_MAX_FONT_SCALE;
    expect(COMPLETE_EM * cappedPt).toBeLessThanOrEqual(NARROWEST_TITLE_BOX_PT);
  });

  it('control: uncapped, "Complete" overflows that box at AX4 and AX5', () => {
    // If this ever goes green-to-red the budget above has stopped meaning anything:
    // the defect would no longer reproduce, so the cap would be guarding nothing.
    for (const scale of [AX4_FONT_SCALE, AX5_FONT_SCALE]) {
      expect(COMPLETE_EM * typography.headline2.size * scale).toBeGreaterThan(
        NARROWEST_TITLE_BOX_PT
      );
    }
  });
});

describe('PracticeCompletionScreen title', () => {
  it('carries the cap', () => {
    const { getByText } = renderScreen();
    expect(getByText(TITLE).props.maxFontSizeMultiplier).toBe(
      PRACTICE_COMPLETION_TITLE_MAX_FONT_SCALE
    );
  });

  it('wraps rather than shrinking or truncating', () => {
    const { props } = renderScreen().getByText(TITLE);
    expect(props.numberOfLines).toBeUndefined();
    expect(props.adjustsFontSizeToFit).toBeUndefined();
    expect(props.minimumFontScale).toBeUndefined();
  });

  it('is still the screen\'s header, with its wording unchanged', () => {
    expect(renderScreen().getByText(TITLE).props.accessibilityRole).toBe('header');
  });
});

describe('nothing else on the screen is capped', () => {
  it('the practice name, quote, attribution, copy and Continue label all scale freely', () => {
    const { UNSAFE_getAllByType } = renderScreen();
    const others = UNSAFE_getAllByType(Text).filter((node) => node.props.children !== TITLE);

    // Positive control: the sweep must actually reach the content it is protecting.
    const rendered = others.map((node) => JSON.stringify(node.props.children));
    expect(rendered.some((c) => c.includes('Breathing Space'))).toBe(true);
    expect(rendered.some((c) => c.includes('Continue'))).toBe(true);
    expect(rendered.some((c) => c.includes('Each time you practice'))).toBe(true);

    for (const node of others) {
      expect(node.props.maxFontSizeMultiplier).toBeUndefined();
    }
  });
});
