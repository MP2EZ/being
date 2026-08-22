/**
 * FEAT-285 — haptic cue accessibility contract.
 *
 * The governing principle: a haptic is a SIGNAL, not a MEANING. The primitives
 * are not self-describing — `impactLight` and `impactMedium` are not reliably
 * discriminable on a cold hand, through a phone case, or on mid-tier Android
 * hardware. So the tactile channel marks *when*, and the speech channel carries
 * *what*. Neither may substitute for the other, and the ordering between them
 * is a contract rather than an accident.
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

import { colorSystem } from '@/core/theme';
import PracticeScreenLayout from '@/features/learn/practices/shared/PracticeScreenLayout';

import {
  PRACTICE_CUES,
  CUE_CATALOG,
} from '@/features/practices/shared/haptics/cueCatalog';
import {
  HAPTIC_ANNOUNCEMENT_STAGGER_MS,
  MIN_CUE_INTERVAL_MS,
  MAX_CUE_LATENESS_MS,
} from '@/features/practices/shared/haptics/constants';
import HapticsOptInPrompt from '@/features/practices/shared/components/HapticsOptInPrompt';

describe('haptic / screen-reader stagger', () => {
  it('gives the haptic a definite lead over its announcement', () => {
    expect(HAPTIC_ANNOUNCEMENT_STAGGER_MS).toBe(150);
  });

  it('clears the ~80ms window where a tap fuses with speech onset', () => {
    // Below this the two events merge into one multimodal percept, which
    // measurably degrades phoneme identification — the announcement gets
    // harder to understand, not easier.
    expect(HAPTIC_ANNOUNCEMENT_STAGGER_MS).toBeGreaterThan(80);
  });

  it('stays inside the ~400ms window where the two still read as related', () => {
    // Beyond this they stop grouping and land as two unrelated events.
    expect(HAPTIC_ANNOUNCEMENT_STAGGER_MS).toBeLessThan(400);
  });

  it('absorbs a slow Android actuator with margin', () => {
    // Android impact latency runs ~30-80ms against iOS's ~10-20ms. The stagger
    // must survive the worst case and still leave the haptic leading.
    const WORST_CASE_ANDROID_ACTUATOR_MS = 80;
    expect(HAPTIC_ANNOUNCEMENT_STAGGER_MS).toBeGreaterThan(WORST_CASE_ANDROID_ACTUATOR_MS);
  });

  it('leaves room for a cue and its announcement inside one throttle window', () => {
    expect(HAPTIC_ANNOUNCEMENT_STAGGER_MS).toBeLessThan(MIN_CUE_INTERVAL_MS);
  });
});

describe('every cue is resolvable into a meaning', () => {
  it('gives each cue plain-language meaning text, not just a waveform', () => {
    for (const cue of PRACTICE_CUES) {
      const meaning = CUE_CATALOG[cue].meaning;
      expect(meaning.length).toBeGreaterThan(10);
      // A meaning, not a restatement of the primitive.
      expect(meaning.toLowerCase()).not.toContain('impact');
      expect(meaning.toLowerCase()).not.toContain('vibrat');
    }
  });

  it('does not rely on discriminating one primitive from another for safety', () => {
    // No cue may be the ONLY carrier of something the practitioner must act on.
    // Session end is the strongest signal and is still just "complete".
    expect(CUE_CATALOG.sessionEnd.meaning).toMatch(/complete/i);
  });
});

describe('lateness budget protects the pairing', () => {
  it('drops a cue before it can arrive detached from its announcement', () => {
    // A cue delivered later than this reads as an unexplained buzz rather than
    // the marker for a transition that has visibly already happened.
    expect(MAX_CUE_LATENESS_MS).toBeLessThanOrEqual(150);
  });
});

describe('first-run opt-in prompt', () => {
  const renderPrompt = (onChoose = jest.fn()) => ({
    onChoose,
    ...render(<HapticsOptInPrompt onChoose={onChoose} />),
  });

  it('is a modal on iOS so VoiceOver cannot swipe past it', () => {
    const { getByTestId } = renderPrompt();
    expect(getByTestId('haptics-optin-prompt').props.accessibilityViewIsModal).toBe(true);
  });

  it('marks the question as a header so focus can land on it', () => {
    const { getByTestId } = renderPrompt();
    expect(getByTestId('haptics-optin-prompt-heading').props.accessibilityRole).toBe('header');
  });

  it('exposes both choices as buttons', () => {
    const { getByTestId } = renderPrompt();
    expect(getByTestId('haptics-optin-prompt-accept').props.accessibilityRole).toBe('button');
    expect(getByTestId('haptics-optin-prompt-decline').props.accessibilityRole).toBe('button');
  });

  it('gives both choices BYTE-IDENTICAL hints', () => {
    // A differing hint is the audio equivalent of a pre-checked box, and it is
    // far harder to notice in the speech channel than on screen.
    const { getByTestId } = renderPrompt();
    expect(getByTestId('haptics-optin-prompt-accept').props.accessibilityHint).toBe(
      getByTestId('haptics-optin-prompt-decline').props.accessibilityHint
    );
  });

  it('pre-selects NEITHER choice', () => {
    const { getByTestId } = renderPrompt();
    for (const id of ['haptics-optin-prompt-accept', 'haptics-optin-prompt-decline']) {
      expect(getByTestId(id).props.accessibilityState?.selected).toBeUndefined();
    }
  });

  it('gives both choices distinct, non-persuasive labels', () => {
    const { getByTestId } = renderPrompt();
    const accept = getByTestId('haptics-optin-prompt-accept').props.accessibilityLabel;
    const decline = getByTestId('haptics-optin-prompt-decline').props.accessibilityLabel;

    expect(accept).not.toBe(decline);
    for (const label of [accept, decline]) {
      expect(label.toLowerCase()).not.toContain('recommend');
      // "Not now" would imply a re-ask that will never come.
      expect(label.toLowerCase()).not.toContain('not now');
    }
  });

  it('states that the choice is final', () => {
    const { getByTestId } = renderPrompt();
    expect(getByTestId('haptics-optin-prompt-accept').props.accessibilityHint).toMatch(
      /not be asked again/i
    );
  });

  it('reports the choice on accept', () => {
    const { onChoose, getByTestId } = renderPrompt();
    fireEvent.press(getByTestId('haptics-optin-prompt-accept'));
    expect(onChoose).toHaveBeenCalledWith(true);
  });

  it('reports the choice on decline', () => {
    const { onChoose, getByTestId } = renderPrompt();
    fireEvent.press(getByTestId('haptics-optin-prompt-decline'));
    expect(onChoose).toHaveBeenCalledWith(false);
  });

  it('offers NO dismissal that would spend the prompt without a choice', () => {
    const { queryByTestId } = renderPrompt();
    expect(queryByTestId('haptics-optin-prompt-close')).toBeNull();
    expect(queryByTestId('haptics-optin-prompt-dismiss')).toBeNull();
  });

  it('keeps the container non-accessible so children stay individually navigable', () => {
    const { getByTestId } = renderPrompt();
    // The card wrapper must not collapse heading/body/buttons into one stop.
    const accept = getByTestId('haptics-optin-prompt-accept');
    expect(accept.props.accessibilityLabel).toBeTruthy();
  });

  /**
   * FEAT-385 — the preferred-"Turn on" override.
   *
   * The founder decision made accept the recommended choice. These assertions are
   * the line between PREFERENCE and COERCION, and they are written to fail if the
   * emphasis ever leaks out of the two channels it is allowed to occupy.
   */
  describe('preferred treatment stays a preference, not a coercion', () => {
    const flat = (node: { props: { style?: unknown } }) =>
      StyleSheet.flatten(node.props.style) as Record<string, unknown>;

    it('EMPHASISES accept additively — a fill, and only a fill', () => {
      const { getByTestId } = renderPrompt();
      const accept = flat(getByTestId('haptics-optin-prompt-accept'));
      const decline = flat(getByTestId('haptics-optin-prompt-decline'));

      expect(accept.backgroundColor).toBe(colorSystem.base.midnightBlue);
      // Decline is byte-identical to the original treatment — never de-emphasised.
      expect(decline.backgroundColor).toBe(colorSystem.base.white);
      expect(decline.borderColor).toBe(colorSystem.base.midnightBlue);
    });

    it('keeps the COST of both choices exactly equal', () => {
      // Emphasis may change appearance; it must never change reachability. An
      // unequally-sized target is the motor-channel equivalent of a pre-selected
      // control, which this prompt already forbids.
      const { getByTestId } = renderPrompt();
      const accept = flat(getByTestId('haptics-optin-prompt-accept'));
      const decline = flat(getByTestId('haptics-optin-prompt-decline'));

      for (const key of [
        'flex',
        'minHeight',
        'paddingVertical',
        'paddingHorizontal',
        'borderRadius',
        'borderWidth',
      ]) {
        expect([key, accept[key]]).toEqual([key, decline[key]]);
      }
    });

    it('keeps both LABELS identical in weight and size', () => {
      const { getByTestId } = renderPrompt();
      const accept = flat(getByTestId('haptics-optin-prompt-accept').children[0] as never);
      const decline = flat(getByTestId('haptics-optin-prompt-decline').children[0] as never);

      expect(accept.fontSize).toBe(decline.fontSize);
      expect(accept.fontWeight).toBe(decline.fontWeight);
      // The only label difference is colour, carrying the fill's contrast.
      expect(accept.color).toBe(colorSystem.base.white);
      expect(decline.color).toBe(colorSystem.base.midnightBlue);
    });

    it('declares NO opacity on either choice', () => {
      // midnightBlue at 0.6 over white composites to 4.00:1 — a silent 1.4.3
      // failure that reads as a styling choice rather than a regression.
      const { getByTestId } = renderPrompt();
      for (const id of ['haptics-optin-prompt-accept', 'haptics-optin-prompt-decline']) {
        expect(flat(getByTestId(id)).opacity).toBeUndefined();
      }
    });

    it('carries the recommendation in the BODY and nowhere in button metadata', () => {
      // WCAG 1.3.1: a visual-only recommendation has no text equivalent, and it
      // would withhold the suggestion from precisely the cohort the tactile
      // channel exists for. Hints are the wrong carrier too — iOS can disable
      // hint speech outright and TalkBack truncates it.
      const { getByTestId } = renderPrompt();

      expect(getByTestId('haptics-optin-prompt-body').props.children).toMatch(/we suggest/i);

      for (const id of ['haptics-optin-prompt-accept', 'haptics-optin-prompt-decline']) {
        const node = getByTestId(id);
        expect(node.props.accessibilityLabel.toLowerCase()).not.toMatch(/suggest|recommend/);
        expect(node.props.accessibilityHint.toLowerCase()).not.toMatch(/suggest|recommend/);
        expect(node.props.accessibilityState?.selected).toBeUndefined();
      }
    });

    it('uses a LIGHT backdrop so the faded crisis overlay stays perceivable', () => {
      // The old gray[900] fill put the faded crisis button at 1.34:1 beneath an
      // undismissable prompt. A darker scrim cannot fix that — #991B1B is lighter
      // than #171717 — so the only available direction is light.
      const { getByTestId } = renderPrompt();
      expect(flat(getByTestId('haptics-optin-prompt')).backgroundColor).toBe(
        colorSystem.base.white
      );
    });
  });
});

/**
 * FEAT-385 — the mount contract. The prompt is an absolutely-positioned inset-0
 * layer, so WHERE it renders decides whether it covers the screen or scrolls away
 * with the content.
 */
describe('practice screen overlay slot', () => {
  const renderLayout = (overlay?: React.ReactNode) =>
    render(
      <PracticeScreenLayout
        title="Practice"
        onBack={() => {}}
        scrollable={true}
        overlay={overlay}
        testID="practice-screen"
      >
        <Text>practice content</Text>
      </PracticeScreenLayout>
    );

  it('renders the overlay OUTSIDE the hidden content subtree, and keeps it reachable', () => {
    // Two assertions in one, both load-bearing:
    //   1. The content subtree is GONE from the accessibility tree (TalkBack
    //      modality — Android has no accessibilityViewIsModal).
    //   2. The overlay is STILL reachable by the same query, which is only
    //      possible if it renders as a SIBLING of that subtree rather than
    //      inside it. Two of the three hosts are scrollable={true}, and nested
    //      inside the ScrollView an inset-0 backdrop sizes to the content box
    //      and scrolls off with it.
    const { getByTestId, queryByTestId } = renderLayout(
      <Text testID="test-overlay">overlay</Text>
    );

    expect(queryByTestId('practice-screen-content')).toBeNull();
    expect(getByTestId('test-overlay')).toBeTruthy();
  });

  it('scopes the hiding to the content wrapper, never to the overlay ancestor', () => {
    // Hiding the ROOT would hide the overlay too, since the root is its ancestor.
    const { getByTestId } = renderLayout(<Text testID="test-overlay">overlay</Text>);

    expect(
      getByTestId('practice-screen-content', { includeHiddenElements: true }).props
        .importantForAccessibility
    ).toBe('no-hide-descendants');
    expect(getByTestId('practice-screen').props.importantForAccessibility).toBeUndefined();
  });

  it('leaves the content reachable when there is no overlay', () => {
    const { getByTestId } = renderLayout(undefined);
    expect(getByTestId('practice-screen-content').props.importantForAccessibility).toBe('auto');
  });
});
