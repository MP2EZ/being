/**
 * The depth picker's "won't be saved" note (FEAT-669, the FEAT-667 remainder).
 *
 * While the Art. 9 write gate withholds the daily loop's writes, the picker says so in
 * its intro, before any answer is typed. Crisis ruling: the note sits in the scrolling
 * intro and never in the pinned choices (DEBUG-469), renders at every font scale, is
 * plain text with no role, and is absent with no wrapper when writes are kept. Copy is
 * true for every block reason, so it never says the reader chose.
 *
 * `.accessibility.` so `npm run test:accessibility` runs it. The crisis half — both
 * choices behave identically for every reason — is pinned in
 * `__tests__/safety/dailyLoopWellnessWriteBlocked.crisisReachability.test.tsx`.
 */
import React from 'react';
import { ScrollView, Text, useWindowDimensions } from 'react-native';
import { act, render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import DailyLoopDepthSelectScreen, {
  WELLNESS_WITHHELD_NOTE,
} from '../screens/DailyLoopDepthSelectScreen';
import { DEPTH_PICKER_COPY } from '../config/tenseMode';
import { semantic } from '@/core/theme';
import {
  seedWellnessWriteConsent,
  type SeededWellnessWriteConsent,
} from '../../../../../__tests__/helpers/wellnessWriteConsent';

const NOTE_ID = 'daily-loop-wellness-withheld-note';
const BLOCKED: SeededWellnessWriteConsent[] = ['refused', 'revoked', 'under_age', 'missing'];

const setScale = (fontScale: number) =>
  (useWindowDimensions as unknown as jest.Mock).mockReturnValue({ width: 375, height: 667, scale: 2, fontScale });

const renderPicker = () => render(<DailyLoopDepthSelectScreen onSelect={jest.fn()} />);

const ancestors = (node: ReactTestInstance): ReactTestInstance[] => {
  const out: ReactTestInstance[] = [];
  for (let p = node.parent; p; p = p.parent) out.push(p);
  return out;
};

const hasTestIdAncestor = (node: ReactTestInstance, testID: string) =>
  ancestors(node).some((a) => a.props?.testID === testID);

afterEach(() => setScale(1));

describe.each([1, 3.1])('at font scale %s', (scale) => {
  beforeEach(() => setScale(scale));

  it.each(BLOCKED)('blocked (%s): the note is in the scrolling intro, never the pinned choices', (reason) => {
    seedWellnessWriteConsent(reason);
    const screen = renderPicker();
    const note = screen.getByTestId(NOTE_ID);
    const scroll = screen.UNSAFE_getByType(ScrollView);
    expect(ancestors(note)).toContain(scroll);
    expect(hasTestIdAncestor(note, 'daily-loop-depth-choices')).toBe(false);
    // Positive control (DEBUG-390): the walk does find the choices region when it is there.
    expect(hasTestIdAncestor(screen.getByText(DEPTH_PICKER_COPY.guarantee), 'daily-loop-depth-choices')).toBe(true);
  });
});

describe('the note itself', () => {
  it.each(BLOCKED)('blocked (%s): plain muted text with the shared copy, no role, no action', (reason) => {
    seedWellnessWriteConsent(reason);
    const note = renderPicker().getByTestId(NOTE_ID);
    expect(note.props.children).toBe(WELLNESS_WITHHELD_NOTE);
    expect(note.props.accessibilityRole).toBeUndefined();
    expect(note.props.accessibilityLiveRegion).toBeUndefined();
    expect(note.props.onPress).toBeUndefined();
    const flat = Object.assign({}, ...[note.props.style].flat());
    expect(flat.color).toBe(semantic.text.muted);
  });

  it.each<SeededWellnessWriteConsent>(['granted', 'loading'])('%s: no note and no wrapper', (state) => {
    seedWellnessWriteConsent(state);
    const screen = renderPicker();
    expect(screen.queryByTestId(NOTE_ID)).toBeNull();
    // Title and subtitle only, at default scale: nothing else entered the intro.
    expect(screen.UNSAFE_getByType(ScrollView).findAllByType(Text)).toHaveLength(2);
  });

  it('follows a consent change while the picker is mounted', () => {
    seedWellnessWriteConsent('loading');
    const screen = renderPicker();
    expect(screen.queryByTestId(NOTE_ID)).toBeNull();
    act(() => seedWellnessWriteConsent('refused'));
    expect(screen.getByTestId(NOTE_ID)).toBeTruthy();
    act(() => seedWellnessWriteConsent('granted'));
    expect(screen.queryByTestId(NOTE_ID)).toBeNull();
    act(() => seedWellnessWriteConsent('revoked'));
    expect(screen.getByTestId(NOTE_ID)).toBeTruthy();
  });

  it('copy is true for every reason and carries no CTA, safety or principle wording', () => {
    expect(WELLNESS_WITHHELD_NOTE).toMatch(/won't be saved/);
    expect(WELLNESS_WITHHELD_NOTE).not.toMatch(
      /\b(chose|choice|choose|declin\w*|refus\w*|settings?|tap|988|crisis|support|safety|help|let go|accept\w*|control)\b/i,
    );
    // DEBUG-390: the matcher fires on the copy it replaced.
    expect('in line with your wellness data choice').toMatch(/\bchoice\b/i);
  });
});
