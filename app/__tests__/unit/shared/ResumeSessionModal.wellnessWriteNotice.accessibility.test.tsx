/**
 * DEBUG-699 — the resume prompt's "won't be saved" note.
 *
 * A resumed daily loop restores its depth and skips the picker, so the FEAT-669 note on
 * DailyLoopDepthSelectScreen never shows on that path. Crisis + philosopher ruling
 * (2026-10-06): ResumeSessionModal is a display-only notice host. The note sits in the
 * scrolling session-info block, never in the pinned button row (DEBUG-403) and never in
 * the Stoic copy. It uses FEAT-669's copy verbatim, is plain muted text with no role, and
 * is absent, with no wrapper, while writes are kept or consent is still loading.
 *
 * `.accessibility.` so `npm run test:accessibility` runs it. The crisis half (both
 * choices behave identically for every reason) is pinned in
 * `__tests__/safety/dailyLoopWellnessWriteBlocked.crisisReachability.test.tsx`.
 */
import React from 'react';
import { ScrollView, Text, useWindowDimensions } from 'react-native';
import { act, render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { ResumeSessionModal } from '@/features/practices/shared/components/ResumeSessionModal';
import { WELLNESS_WITHHELD_NOTE } from '@/features/practices/shared/wellnessWithheldNote';
import { WELLNESS_WITHHELD_NOTE as PICKER_NOTE } from '@/features/practices/dailyloop/screens/DailyLoopDepthSelectScreen';
import { semantic } from '@/core/theme';
import type { SessionMetadata } from '@/core/types/session';
import { seedWellnessWriteConsent, type SeededWellnessWriteConsent } from '../../helpers/wellnessWriteConsent';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Vibration = { vibrate: jest.fn() };
  return RN;
});

const NOTE_ID = 'resume-session-wellness-withheld-note';
const BLOCKED: SeededWellnessWriteConsent[] = ['refused', 'revoked', 'under_age', 'missing'];

const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
const SESSION: SessionMetadata = {
  id: 'dl-1',
  flowType: 'daily-loop',
  currentScreen: 'SphereSovereignty',
  startedAt: Math.max(startOfToday + 60_000, Date.now() - 60 * 60 * 1000),
  lastActiveAt: Date.now(),
  completedScreens: ['AwarePresence', 'Premeditatio'],
  version: 1,
};

const setScale = (fontScale: number) =>
  (useWindowDimensions as unknown as jest.Mock).mockReturnValue({ width: 375, height: 667, scale: 2, fontScale });

const renderPrompt = () =>
  render(<ResumeSessionModal visible session={SESSION} onResume={jest.fn()} onBeginFresh={jest.fn()} />);

const ancestors = (node: ReactTestInstance): ReactTestInstance[] => {
  const out: ReactTestInstance[] = [];
  for (let p = node.parent; p; p = p.parent) out.push(p);
  return out;
};
const hasTestIdAncestor = (node: ReactTestInstance, testID: string) =>
  ancestors(node).some((a) => a.props?.testID === testID);

afterEach(() => {
  setScale(1);
  seedWellnessWriteConsent('loading');
});

describe.each([1, 3.1])('at font scale %s', (scale) => {
  beforeEach(() => setScale(scale));

  it.each(BLOCKED)('blocked (%s): the note is in the scrolling prose, never the pinned choices', (reason) => {
    seedWellnessWriteConsent(reason);
    const screen = renderPrompt();
    const note = screen.getByTestId(NOTE_ID);
    expect(ancestors(note)).toContain(screen.UNSAFE_getByType(ScrollView));
    expect(hasTestIdAncestor(note, 'resume-session-actions')).toBe(false);
    // Positive control (DEBUG-390): the walk does find the pinned row when it is there.
    expect(hasTestIdAncestor(screen.getByTestId('resume-session-button'), 'resume-session-actions')).toBe(true);
  });
});

describe('the note itself', () => {
  it.each(BLOCKED)('blocked (%s): FEAT-669 copy verbatim, plain muted text, no role, no action', (reason) => {
    seedWellnessWriteConsent(reason);
    const note = renderPrompt().getByTestId(NOTE_ID);
    expect(note.props.children).toBe(WELLNESS_WITHHELD_NOTE);
    expect(note.props.accessibilityRole).toBeUndefined();
    expect(note.props.accessibilityLiveRegion).toBeUndefined();
    expect(note.props.onPress).toBeUndefined();
    const flat = Object.assign({}, ...[note.props.style].flat());
    expect(flat.color).toBe(semantic.text.muted);
  });

  it('is the same string the depth picker shows — one fact, one wording', () => {
    expect(PICKER_NOTE).toBe(WELLNESS_WITHHELD_NOTE);
  });

  it('sits with the session facts, not inside the Stoic message', () => {
    seedWellnessWriteConsent('refused');
    const screen = renderPrompt();
    const texts = (n: ReactTestInstance) => n.findAllByType(Text).map((t) => t.props.children).flat();
    // The nearest block that holds the session facts is the one that holds the note…
    const block = ancestors(screen.getByTestId(NOTE_ID)).find((a) => texts(a).includes('You were at:'));
    expect(block).toBeDefined();
    // …and it is not the block that holds the Stoic message.
    expect(texts(block!).some((c) => typeof c === 'string' && /opportunity to practice virtue/.test(c))).toBe(false);
    // Positive control: the whole scroll region DOES contain that message.
    expect(texts(screen.UNSAFE_getByType(ScrollView)).some((c) => typeof c === 'string' && /opportunity to practice virtue/.test(c))).toBe(true);
  });

  it.each<SeededWellnessWriteConsent>(['granted', 'loading'])('%s: no note, and the prose is unchanged', (state) => {
    seedWellnessWriteConsent('granted');
    const baseline = renderPrompt().UNSAFE_getByType(ScrollView).findAllByType(Text).length;
    seedWellnessWriteConsent(state);
    const screen = renderPrompt();
    expect(screen.queryByTestId(NOTE_ID)).toBeNull();
    expect(screen.UNSAFE_getByType(ScrollView).findAllByType(Text)).toHaveLength(baseline);
  });

  it('follows a consent change while the prompt is up', () => {
    seedWellnessWriteConsent('loading');
    const screen = renderPrompt();
    expect(screen.queryByTestId(NOTE_ID)).toBeNull();
    act(() => seedWellnessWriteConsent('refused'));
    expect(screen.getByTestId(NOTE_ID)).toBeTruthy();
    act(() => seedWellnessWriteConsent('granted'));
    expect(screen.queryByTestId(NOTE_ID)).toBeNull();
    act(() => seedWellnessWriteConsent('revoked'));
    expect(screen.getByTestId(NOTE_ID)).toBeTruthy();
  });

  it('leaves both choices byte-identical whether or not writes are withheld', () => {
    const props = (s: ReturnType<typeof renderPrompt>) =>
      ['resume-session-button', 'begin-fresh-button'].map((id) => {
        const b = s.getByTestId(id);
        return [b.props.accessibilityLabel, b.props.accessibilityHint, b.props.accessibilityRole];
      });
    seedWellnessWriteConsent('granted');
    const granted = props(renderPrompt());
    for (const reason of BLOCKED) {
      seedWellnessWriteConsent(reason);
      expect(props(renderPrompt())).toEqual(granted);
    }
  });
});
