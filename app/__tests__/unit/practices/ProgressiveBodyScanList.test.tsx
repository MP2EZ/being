/**
 * ProgressiveBodyScanList Tests (TEST-08 / MAINT-166 PR 6)
 *
 * Presentational component covering progressive single-area body scan UX.
 * Tests cover: render shape, status transitions (completed/current/upcoming),
 * conditional guidance text, and accessibility labels.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import ProgressiveBodyScanList from '@/features/practices/shared/components/ProgressiveBodyScanList';

const AREAS = ['Head', 'Shoulders', 'Chest', 'Belly', 'Legs'];

describe('ProgressiveBodyScanList', () => {
  it('renders every area passed in', () => {
    const { getByText } = render(
      <ProgressiveBodyScanList areas={AREAS} currentIndex={0} />
    );

    AREAS.forEach((area) => {
      expect(getByText(area)).toBeTruthy();
    });
  });

  it('renders a checkmark only for areas before currentIndex', () => {
    const { getAllByText } = render(
      <ProgressiveBodyScanList areas={AREAS} currentIndex={2} />
    );

    // currentIndex=2 means Head (0) + Shoulders (1) are completed → 2 checkmarks
    expect(getAllByText('✓')).toHaveLength(2);
  });

  it('renders no checkmarks when currentIndex is 0', () => {
    const { queryAllByText } = render(
      <ProgressiveBodyScanList areas={AREAS} currentIndex={0} />
    );

    expect(queryAllByText('✓')).toHaveLength(0);
  });

  it('renders checkmarks for all but the last area when currentIndex points to the last', () => {
    const { getAllByText } = render(
      <ProgressiveBodyScanList areas={AREAS} currentIndex={AREAS.length - 1} />
    );

    expect(getAllByText('✓')).toHaveLength(AREAS.length - 1);
  });

  it('renders currentGuidance only on the current area', () => {
    const { getByText, queryByText } = render(
      <ProgressiveBodyScanList
        areas={AREAS}
        currentIndex={2}
        currentGuidance="Notice any tension in your chest"
      />
    );

    expect(getByText('Notice any tension in your chest')).toBeTruthy();
    // Guidance must not appear elsewhere — only one node should match
    const guidanceMatches = queryByText('Notice any tension in your chest');
    expect(guidanceMatches).toBeTruthy();
  });

  it('does not render guidance text when currentGuidance is omitted', () => {
    const { queryByText } = render(
      <ProgressiveBodyScanList areas={AREAS} currentIndex={2} />
    );

    expect(queryByText('Notice any tension')).toBeNull();
  });

  it('sets accessibility label to "completed" for areas before currentIndex', () => {
    const { getByLabelText } = render(
      <ProgressiveBodyScanList areas={AREAS} currentIndex={2} />
    );

    expect(getByLabelText('Head, completed')).toBeTruthy();
    expect(getByLabelText('Shoulders, completed')).toBeTruthy();
  });

  it('sets accessibility label to "currently focusing" for the current area without guidance', () => {
    const { getByLabelText } = render(
      <ProgressiveBodyScanList areas={AREAS} currentIndex={2} />
    );

    expect(getByLabelText('Chest, currently focusing')).toBeTruthy();
  });

  it('embeds currentGuidance into the current area accessibility label when provided', () => {
    const { getByLabelText } = render(
      <ProgressiveBodyScanList
        areas={AREAS}
        currentIndex={2}
        currentGuidance="Notice any tension in your chest"
      />
    );

    expect(
      getByLabelText('Chest, currently focusing. Notice any tension in your chest')
    ).toBeTruthy();
  });

  it('sets accessibility label to "upcoming" for areas after currentIndex', () => {
    const { getByLabelText } = render(
      <ProgressiveBodyScanList areas={AREAS} currentIndex={2} />
    );

    expect(getByLabelText('Belly, upcoming')).toBeTruthy();
    expect(getByLabelText('Legs, upcoming')).toBeTruthy();
  });

  it('respects custom testID', () => {
    const { getByTestId } = render(
      <ProgressiveBodyScanList areas={AREAS} currentIndex={0} testID="custom-scan-list" />
    );

    expect(getByTestId('custom-scan-list')).toBeTruthy();
  });

  it('falls back to default testID', () => {
    const { getByTestId } = render(
      <ProgressiveBodyScanList areas={AREAS} currentIndex={0} />
    );

    expect(getByTestId('progressive-body-scan-list')).toBeTruthy();
  });

  it('handles an empty areas array without crashing', () => {
    const { getByTestId } = render(
      <ProgressiveBodyScanList areas={[]} currentIndex={0} />
    );

    expect(getByTestId('progressive-body-scan-list')).toBeTruthy();
  });
});
