/**
 * DEBUG-618 — Breathing Space's column must scroll, so Begin Practice stays reachable
 * at large Dynamic Type sizes.
 *
 * PracticeTimerScreen passed `scrollable={false}` to PracticeScreenLayout, so its
 * column (instructions → BreathingCircle → Timer → toggle → note) rendered in a plain
 * View. From xxxLarge up the toggle fell below the modal card's clip edge and could
 * not be reached at all (TestFlight JAVASCRIPT-REACT-9). It was the only practice host
 * that did not scroll.
 *
 * Unlike `PracticeTimerScreen.test.tsx`, this suite renders the REAL layout, toggle
 * and instructions: that suite mocks PracticeScreenLayout wholesale and so cannot see
 * `scrollable` at all. Jest has no layout engine, so what this proves is CONTAINMENT —
 * every control is inside the scroll container — plus that nothing caps text scale.
 * The simulator reachability sweep is DEBUG-626.
 */

import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, within } from '@testing-library/react-native';

import PracticeTimerScreen from '@/features/learn/practices/PracticeTimerScreen';
import PracticeScreenLayout from '@/features/learn/practices/shared/PracticeScreenLayout';

jest.mock('@/features/practices/shared/components/BreathingCircle', () => {
  const { View } = require('react-native');
  return ({ testID, isActive }: { testID?: string; isActive: boolean }) => (
    <View testID={testID} accessibilityValue={{ text: isActive ? 'active' : 'inactive' }} />
  );
});

jest.mock('@/features/practices/shared/components/Timer', () => {
  const { View } = require('react-native');
  return ({ testID }: { testID?: string }) => <View testID={testID} />;
});

jest.mock('@/features/learn/practices/shared/usePracticeCompletion', () => ({
  usePracticeCompletion: () => ({
    renderCompletion: () => null,
    markStarted: jest.fn(),
    markComplete: jest.fn(),
  }),
}));

const ID = 'practice-timer-screen';

const renderBreathing = () =>
  render(
    <PracticeTimerScreen
      practiceId="breathing-space"
      moduleId="aware-presence"
      duration={180}
      title="3-Minute Breathing Space"
    />
  );

const renderContemplative = () =>
  render(
    <PracticeTimerScreen
      practiceId="loving-kindness"
      moduleId="interconnected-living"
      duration={480}
      title="Loving-Kindness"
      visualMode="contemplative"
      instructions={['Hold yourself in mind.', 'Hold someone close in mind.']}
    />
  );

type RenderResult = ReturnType<typeof render>;

/** WCAG 1.4.4: text must resize to 200% without loss of content. */
const WCAG_MIN_TEXT_SCALE = 2;

/**
 * Every Text node that opts out of Dynamic Type or caps it short of 200%. A cap at or
 * above 200% is allowed: DEBUG-619 caps the header's back glyph and progress counter at
 * 2.0× so they cannot outgrow the header, while body text stays uncapped.
 */
const scaleCappedTexts = (result: RenderResult) =>
  result.UNSAFE_getAllByType(Text).filter(
    (node) =>
      node.props.allowFontScaling === false ||
      (node.props.maxFontSizeMultiplier !== undefined &&
        node.props.maxFontSizeMultiplier < WCAG_MIN_TEXT_SCALE)
  );

describe('PracticeTimerScreen column is a scroll container', () => {
  it('breathing mode: the instructions, circle, timer, toggle and note are all inside the scroll view', () => {
    const scroll = within(renderBreathing().getByTestId(`${ID}-scroll`));

    for (const part of ['instructions', 'breathing-circle', 'timer', 'toggle-button', 'note']) {
      expect(scroll.getByTestId(`${ID}-${part}`)).toBeTruthy();
    }
  });

  it('contemplative mode: the stepped instructions, timer, toggle and note are inside the scroll view', () => {
    const result = renderContemplative();
    const scroll = within(result.getByTestId(`${ID}-scroll`));

    for (const part of ['instructions', 'timer', 'toggle-button', 'note']) {
      expect(scroll.getByTestId(`${ID}-${part}`)).toBeTruthy();
    }
    expect(result.queryByTestId(`${ID}-breathing-circle`)).toBeNull();
  });

  it('Begin Practice inside the scroll view still starts the practice', () => {
    const scroll = within(renderBreathing().getByTestId(`${ID}-scroll`));
    const circleState = () => scroll.getByTestId(`${ID}-breathing-circle`).props.accessibilityValue.text;

    expect(circleState()).toBe('inactive');
    fireEvent.press(scroll.getByTestId(`${ID}-toggle-button`));

    expect(circleState()).toBe('active');
  });

  it('control: a non-scrolling layout renders no scroll node, so the containment check can fail', () => {
    const fixed = render(
      <PracticeScreenLayout title="t" onBack={() => {}} scrollable={false} testID="probe">
        <Text>content</Text>
      </PracticeScreenLayout>
    );
    const scrolling = render(
      <PracticeScreenLayout title="t" onBack={() => {}} scrollable testID="probe">
        <Text>content</Text>
      </PracticeScreenLayout>
    );

    expect(fixed.queryByTestId('probe-scroll')).toBeNull();
    expect(scrolling.getByTestId('probe-scroll')).toBeTruthy();
  });
});

describe('PracticeTimerScreen text scales freely (WCAG 1.4.4)', () => {
  it('no Text on the screen disables font scaling or caps it short of 200%', () => {
    const result = renderBreathing();

    expect(result.UNSAFE_getAllByType(Text).length).toBeGreaterThan(3);
    expect(scaleCappedTexts(result).map((node) => node.props.children)).toEqual([]);
  });

  it('the practice column itself carries no cap at all (instructions, toggle, note)', () => {
    const scroll = within(renderBreathing().getByTestId(`${ID}-scroll`));
    const texts = scroll.UNSAFE_getAllByType(Text);

    expect(texts.length).toBeGreaterThan(2);
    expect(texts.filter((node) => node.props.maxFontSizeMultiplier !== undefined)).toEqual([]);
  });

  it('control: the scale-cap check flags a sub-200% cap and a disabled Text, not a 200% cap', () => {
    const result = render(
      <>
        <Text allowFontScaling={false}>disabled</Text>
        <Text maxFontSizeMultiplier={1.5}>capped</Text>
        <Text maxFontSizeMultiplier={2}>at 200%</Text>
        <Text>free</Text>
      </>
    );

    expect(scaleCappedTexts(result)).toHaveLength(2);
  });
});
