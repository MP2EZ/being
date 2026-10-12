/**
 * MAINT-747 — PracticeTab duration label and launch route.
 *
 * Duration label: omitted for an untimed practice (undefined or 0 — control-sorting is
 * untimed by design), '<1 min' under a minute, whole minutes from 60s up.
 * Launch: the card press navigates to exactly what resolvePracticeRoute returns.
 * Route resolution itself is pinned in practiceNavigation.contract.test.ts.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import type { ModuleContent, Practice } from '@/features/learn/types/education';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

import PracticeTab from '@/features/learn/tabs/PracticeTab';
import { resolvePracticeRoute } from '@/features/practices/catalog/practiceNavigation';

const PRACTICES: Practice[] = [
  { id: 'p-90', title: 'Ninety seconds', description: 'd', type: 'guided-timer', duration: 90 },
  { id: 'p-20', title: 'Twenty seconds', description: 'd', type: 'guided-timer', duration: 20 },
  { id: 'p-none', title: 'Untimed', description: 'd', type: 'sorting' },
  { id: 'p-zero', title: 'Zero', description: 'd', type: 'reflection', duration: 0 },
];

const content = { practices: PRACTICES } as unknown as ModuleContent;
const durationText = (screen: ReturnType<typeof render>, id: string): string | undefined => {
  const node = screen.queryByTestId(`practice-duration-${id}`);
  return node ? String(node.props.children) : undefined;
};

beforeEach(() => {
  mockNavigate.mockClear();
});

describe('PracticeTab — duration label', () => {
  it('shows whole minutes at 60s and over (90s -> "1 min")', () => {
    const screen = render(<PracticeTab moduleContent={content} moduleId="sphere-sovereignty" />);
    expect(durationText(screen, 'p-90')).toBe('1 min');
  });

  it('shows "<1 min" under a minute (20s)', () => {
    const screen = render(<PracticeTab moduleContent={content} moduleId="sphere-sovereignty" />);
    expect(durationText(screen, 'p-20')).toBe('<1 min');
  });

  it('omits the duration when it is undefined', () => {
    const screen = render(<PracticeTab moduleContent={content} moduleId="sphere-sovereignty" />);
    expect(screen.getByText('Untimed')).toBeTruthy();
    expect(durationText(screen, 'p-none')).toBeUndefined();
  });

  it('omits the duration when it is 0, and never renders "0 min"', () => {
    const screen = render(<PracticeTab moduleContent={content} moduleId="sphere-sovereignty" />);
    expect(durationText(screen, 'p-zero')).toBeUndefined();
    expect(screen.queryByText('0 min')).toBeNull();
  });
});

describe('PracticeTab — launching a practice', () => {
  it('control: there is one Start Practice button per practice', () => {
    const screen = render(<PracticeTab moduleContent={content} moduleId="sphere-sovereignty" />);
    expect(screen.getAllByText('Start Practice')).toHaveLength(PRACTICES.length);
  });

  it.each(PRACTICES.map((p, i) => [p.id, p, i] as const))(
    'pressing %s navigates to exactly resolvePracticeRoute(practice, moduleId)',
    (_id, practice, index) => {
      const screen = render(<PracticeTab moduleContent={content} moduleId="sphere-sovereignty" />);

      fireEvent.press(screen.getAllByText('Start Practice')[index]);

      const expected = resolvePracticeRoute(practice, 'sphere-sovereignty');
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(expected.screen, expected.params);
    },
  );
});
