/**
 * FEAT-293 — SortingPracticeRoute (scenario-resolving wrapper).
 *
 * This wrapper is now the rendered component for the EXISTING `SortingPractice`
 * route, so a bug here breaks the Learn-launched sorting practice that shipped
 * long before FEAT-293. That risk is invisible to the Maestro safety suite:
 * crisis-button-reachability.yaml deliberately does not walk practice flows
 * (they need the long check-in preamble), so no on-device gate exercises this
 * path. It has to be pinned here.
 *
 * The central guarantee is the Learn path: when the caller already holds the
 * scenarios, the wrapper must pass them straight through with NO module load and
 * NO loading state — same render, same frame, as before FEAT-293.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

const mockLoadModuleContent = jest.fn();
jest.mock('@/core/services/moduleContent', () => ({
  loadModuleContent: (...args: unknown[]) => mockLoadModuleContent(...args),
}));

// Stub the practice screen: this suite is about the wrapper's resolution logic,
// not the drill's rendering (which has its own philosopher-signed copy).
jest.mock('@/features/learn/practices/SortingPracticeScreen', () => {
  const { Text: RNText } = require('react-native');
  return {
    __esModule: true,
    default: ({ scenarios }: { scenarios: Array<{ id: string }> }) => (
      <RNText testID="sorting-screen">{scenarios.map((s) => s.id).join(',')}</RNText>
    ),
  };
});

import SortingPracticeRoute from '@/features/practices/catalog/SortingPracticeRoute';

const SCENARIOS = [{ id: 'a' }, { id: 'b' }] as never;

const moduleWith = (scenarios: unknown) => ({
  practices: [{ id: 'control-sorting', type: 'sorting', scenarios }],
});

beforeEach(() => {
  mockLoadModuleContent.mockReset();
});

describe('FEAT-293 — Learn path (scenarios supplied) must not regress', () => {
  it('renders the drill immediately and never loads module content', () => {
    const { getByTestId, queryByTestId } = render(
      <SortingPracticeRoute
        practiceId="control-sorting"
        moduleId="sphere-sovereignty"
        scenarios={SCENARIOS}
      />
    );

    expect(getByTestId('sorting-screen').props.children).toBe('a,b');
    // No spinner frame: Learn's launch must look exactly as it did before.
    expect(queryByTestId('sorting-practice-loading')).toBeNull();
    expect(mockLoadModuleContent).not.toHaveBeenCalled();
  });
});

describe('FEAT-293 — standalone path (scenarios omitted) self-loads', () => {
  it('shows a loading state, then renders the loaded scenarios', async () => {
    mockLoadModuleContent.mockResolvedValue(moduleWith([{ id: 'x' }, { id: 'y' }]));

    const { getByTestId } = render(
      <SortingPracticeRoute practiceId="control-sorting" moduleId="sphere-sovereignty" />
    );

    expect(getByTestId('sorting-practice-loading')).toBeTruthy();
    await waitFor(() =>
      expect(getByTestId('sorting-screen').props.children).toBe('x,y')
    );
    expect(mockLoadModuleContent).toHaveBeenCalledWith('sphere-sovereignty');
  });

  it('treats an empty scenarios array as unavailable rather than rendering an empty drill', async () => {
    // SortingPracticeScreen throws on a missing scenario at the current index,
    // so an empty array must never reach it.
    mockLoadModuleContent.mockResolvedValue(moduleWith([]));

    const { getByTestId } = render(
      <SortingPracticeRoute practiceId="control-sorting" moduleId="sphere-sovereignty" />
    );

    await waitFor(() => expect(getByTestId('sorting-practice-unavailable')).toBeTruthy());
  });

  it('degrades to an unavailable message when the practice id is not in the module', async () => {
    mockLoadModuleContent.mockResolvedValue({ practices: [] });

    const { getByTestId } = render(
      <SortingPracticeRoute practiceId="nope" moduleId="sphere-sovereignty" />
    );

    await waitFor(() => expect(getByTestId('sorting-practice-unavailable')).toBeTruthy());
  });

  it('degrades to an unavailable message when the load rejects — never an unhandled rejection', async () => {
    mockLoadModuleContent.mockRejectedValue(new Error('disk on fire'));

    const { getByTestId } = render(
      <SortingPracticeRoute practiceId="control-sorting" moduleId="sphere-sovereignty" />
    );

    await waitFor(() => expect(getByTestId('sorting-practice-unavailable')).toBeTruthy());
  });

  it('does not set state after unmount when the load resolves late', async () => {
    // Dismissing the modal mid-load must not warn or throw.
    let resolve!: (v: unknown) => void;
    mockLoadModuleContent.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = render(
      <SortingPracticeRoute practiceId="control-sorting" moduleId="sphere-sovereignty" />
    );
    unmount();
    resolve(moduleWith([{ id: 'late' }]));
    await waitFor(() => expect(mockLoadModuleContent).toHaveBeenCalled());

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
