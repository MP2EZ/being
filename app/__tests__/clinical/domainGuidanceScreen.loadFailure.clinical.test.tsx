/**
 * DomainGuidanceScreen — the load-failure branch (MAINT-745, TEST-24).
 *
 * The loader is mocked with a controllable deferred per call, so these rows do not
 * depend on which domains happen to be unauthored today. What each pins:
 *   · a rejected load renders the error state and nothing from the ladder
 *   · a STALE rejection (a domain the reader has already left) never surfaces —
 *     the effect's `cancelled` guard is what stops it
 *   · suppression outranks a load failure that happened first
 *   · a pending or suppressed gate never reaches the loader at all
 *
 * Filename avoids the `crisis` substring (`test:crisis-quick`'s 5s bound).
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

import type { GAD7Result, PHQ9Result } from '@/features/assessment/types';
import type { GuidanceContent, GuidanceDomain } from '@/features/guidance/types/guidance';

const mockGoBack = jest.fn();
const mockRoute = { domain: 'conflict' as GuidanceDomain };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
  useRoute: () => ({ params: { domain: mockRoute.domain } }),
}));

const mockStore = {
  phq9: null as PHQ9Result | null,
  gad7: null as GAD7Result | null,
  hydrated: true,
};

jest.mock('@/features/assessment/stores/assessmentStore', () => {
  const state = {
    getLastResult: (type: 'phq9' | 'gad7') => (type === 'phq9' ? mockStore.phq9 : mockStore.gad7),
  };
  const useAssessmentStore = Object.assign(
    (selector: (s: typeof state) => unknown) => selector(state),
    {
      getState: () => state,
      persist: {
        hasHydrated: () => mockStore.hydrated,
        onFinishHydration: () => () => undefined,
      },
    },
  );
  return { useAssessmentStore };
});

interface Deferred {
  domain: GuidanceDomain;
  resolve: (content: GuidanceContent) => void;
  reject: (error: Error) => void;
}
const mockLoads: Deferred[] = [];

jest.mock('@/core/services/guidanceContent', () => ({
  loadGuidanceContent: jest.fn(
    (domain: GuidanceDomain) =>
      new Promise((resolve, reject) => {
        mockLoads.push({ domain, resolve, reject });
      }),
  ),
}));

import DomainGuidanceScreen from '@/features/guidance/screens/DomainGuidanceScreen';
import { loadGuidanceContent } from '@/core/services/guidanceContent';

const conflictContent = require('../../assets/guidance/guidance-conflict.json') as GuidanceContent;
const loader = loadGuidanceContent as jest.Mock;

const phq9 = (totalScore: number, suicidalIdeation = false): PHQ9Result => ({
  totalScore,
  severity: 'minimal',
  isCrisis: false,
  suicidalIdeation,
  completedAt: 1_700_000_000_000,
  answers: [],
});

const gad7 = (totalScore: number): GAD7Result => ({
  totalScore,
  severity: 'minimal',
  isCrisis: false,
  completedAt: 1_700_000_000_000,
  answers: [],
});

const LADDER_TEST_IDS = [
  'guidance-content',
  'guidance-tier0',
  'guidance-tier1',
  'guidance-tier2',
  'guidance-tier3',
] as const;

const pendingLoad = (domain: GuidanceDomain): Deferred => {
  const found = mockLoads.find((d) => d.domain === domain);
  if (!found) throw new Error(`no load started for ${domain}`);
  return found;
};

beforeEach(() => {
  mockGoBack.mockClear();
  loader.mockClear();
  mockLoads.length = 0;
  mockRoute.domain = 'conflict';
  mockStore.phq9 = phq9(2);
  mockStore.gad7 = gad7(2);
  mockStore.hydrated = true;
});

describe('DomainGuidanceScreen — a rejected load', () => {
  it('renders the error state, nothing from the ladder, and a working way back', async () => {
    const { getByTestId, queryByTestId, getByText } = render(<DomainGuidanceScreen />);
    expect(getByTestId('guidance-loading')).toBeTruthy();

    await act(async () => {
      pendingLoad('conflict').reject(new Error('Failed to load guidance content: conflict'));
    });

    expect(getByTestId('guidance-error')).toBeTruthy();
    expect(getByText("This guidance isn't available yet.")).toBeTruthy();
    for (const id of LADDER_TEST_IDS) expect(queryByTestId(id)).toBeNull();
    // A load failure is not a suppression: the crisis notice must not stand in for it.
    expect(queryByTestId('guidance-suppression-notice')).toBeNull();

    fireEvent.press(getByTestId('guidance-go-back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('ignores a stale rejection from a domain the reader has already left', async () => {
    mockRoute.domain = 'career';
    const { getByTestId, queryByTestId, rerender } = render(<DomainGuidanceScreen />);
    const career = pendingLoad('career');

    mockRoute.domain = 'conflict';
    rerender(<DomainGuidanceScreen />);
    await act(async () => {
      pendingLoad('conflict').resolve(conflictContent);
    });
    expect(getByTestId('guidance-content')).toBeTruthy();

    // The career load settles late. Without the `cancelled` guard it would flip
    // `loadFailed` and replace live conflict content with the error state.
    await act(async () => {
      career.reject(new Error('Failed to load guidance content: career'));
    });

    expect(queryByTestId('guidance-error')).toBeNull();
    expect(getByTestId('guidance-content')).toBeTruthy();
  });

  it('settles quietly when the load rejects after unmount (smoke)', async () => {
    // React 19 no longer warns on a set-state-after-unmount, so this cannot catch a
    // removed guard; it pins only that a late rejection does not throw.
    const { unmount } = render(<DomainGuidanceScreen />);
    const conflict = pendingLoad('conflict');
    unmount();
    await act(async () => {
      conflict.reject(new Error('late'));
    });
    expect(loader).toHaveBeenCalledTimes(1);
  });
});

describe('DomainGuidanceScreen — precedence over a load failure', () => {
  it('shows the suppression notice, not the error, when the gate flips after a failure', async () => {
    const { getByTestId, queryByTestId, rerender } = render(<DomainGuidanceScreen />);
    await act(async () => {
      pendingLoad('conflict').reject(new Error('Failed to load guidance content: conflict'));
    });
    expect(getByTestId('guidance-error')).toBeTruthy();

    mockStore.phq9 = phq9(3, true);
    rerender(<DomainGuidanceScreen />);

    expect(getByTestId('guidance-suppression-notice')).toBeTruthy();
    expect(queryByTestId('guidance-error')).toBeNull();
  });

  it('never calls the loader while the gate is suppressed', () => {
    mockStore.phq9 = phq9(3, true);
    const { getByTestId } = render(<DomainGuidanceScreen />);
    expect(getByTestId('guidance-suppression-notice')).toBeTruthy();
    expect(loader).not.toHaveBeenCalled();
  });

  it('never calls the loader while the store is still hydrating', () => {
    mockStore.hydrated = false;
    const { getByTestId } = render(<DomainGuidanceScreen />);
    expect(getByTestId('guidance-pending')).toBeTruthy();
    expect(loader).not.toHaveBeenCalled();
  });
});
