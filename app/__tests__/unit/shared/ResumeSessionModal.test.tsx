/**
 * ResumeSessionModal Tests
 *
 * FEAT-139: Unit tests for the shared ResumeSessionModal component
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent, within } from '@testing-library/react-native';
import { ResumeSessionModal } from '@/features/practices/shared/components/ResumeSessionModal';
import { colorSystem } from '@/core/theme';
import type { SessionMetadata } from '@/core/types/session';

// Mock Vibration
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Vibration = { vibrate: jest.fn() };
  return RN;
});

describe('ResumeSessionModal', () => {
  const mockOnResume = jest.fn();
  const mockOnBeginFresh = jest.fn();

  /**
   * A start time guaranteed to fall on the SAME local calendar day as "now", however late
   * or early the suite runs.
   *
   * FEAT-298 slice 3b made `formatTimeElapsed` compare calendar days rather than elapsed
   * hours — because the old version returned "earlier today" for anything under 12h, so a
   * 22:00 -> 08:00 resume claimed "today" for yesterday's work. A bare `Date.now() - 1h`
   * therefore crosses midnight whenever the suite runs between 00:00 and 00:59, correctly
   * renders "yesterday", and made the assertion below fail once an hour, every night.
   */
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const sameDayHourAgo = Math.max(startOfToday + 60 * 1000, Date.now() - 1000 * 60 * 60);

  const mockSession: SessionMetadata = {
    id: 'test-session-123',
    flowType: 'morning',
    currentScreen: 'Gratitude',
    startedAt: sameDayHourAgo,
    lastActiveAt: Math.max(sameDayHourAgo, Date.now() - 1000 * 60 * 30),
    completedScreens: ['PhysicalGrounding'],
    version: 1,
  };

  beforeEach(() => {
    mockOnResume.mockClear();
    mockOnBeginFresh.mockClear();
  });

  it('renders nothing when session is null', () => {
    const { toJSON } = render(
      <ResumeSessionModal
        visible={true}
        session={null}
        onResume={mockOnResume}
        onBeginFresh={mockOnBeginFresh}
      />
    );

    expect(toJSON()).toBeNull();
  });

  it('renders modal with session info', () => {
    const { getByText } = render(
      <ResumeSessionModal
        visible={true}
        session={mockSession}
        onResume={mockOnResume}
        onBeginFresh={mockOnBeginFresh}
      />
    );

    expect(getByText('Return to Your Practice?')).toBeTruthy();
    expect(getByText('Morning Gratitude')).toBeTruthy();
  });

  it('shows morning flow emoji', () => {
    const { getByText } = render(
      <ResumeSessionModal
        visible={true}
        session={mockSession}
        onResume={mockOnResume}
        onBeginFresh={mockOnBeginFresh}
      />
    );

    expect(getByText('🌅')).toBeTruthy();
  });

  it('shows midday flow emoji', () => {
    const middaySession: SessionMetadata = {
      ...mockSession,
      flowType: 'midday',
      currentScreen: 'ControlCheck',
    };

    const { getByText } = render(
      <ResumeSessionModal
        visible={true}
        session={middaySession}
        onResume={mockOnResume}
        onBeginFresh={mockOnBeginFresh}
      />
    );

    expect(getByText('☀️')).toBeTruthy();
  });

  it('shows evening flow emoji', () => {
    const eveningSession: SessionMetadata = {
      ...mockSession,
      flowType: 'evening',
      currentScreen: 'VirtueReflection',
    };

    const { getByText } = render(
      <ResumeSessionModal
        visible={true}
        session={eveningSession}
        onResume={mockOnResume}
        onBeginFresh={mockOnBeginFresh}
      />
    );

    expect(getByText('🌙')).toBeTruthy();
  });

  it('calls onResume when Return to Practice is pressed', () => {
    const { getByText } = render(
      <ResumeSessionModal
        visible={true}
        session={mockSession}
        onResume={mockOnResume}
        onBeginFresh={mockOnBeginFresh}
      />
    );

    fireEvent.press(getByText('Return to Practice'));
    expect(mockOnResume).toHaveBeenCalledTimes(1);
  });

  it('calls onBeginFresh when Begin Fresh is pressed', () => {
    const { getByText } = render(
      <ResumeSessionModal
        visible={true}
        session={mockSession}
        onResume={mockOnResume}
        onBeginFresh={mockOnBeginFresh}
      />
    );

    fireEvent.press(getByText('Begin Fresh'));
    expect(mockOnBeginFresh).toHaveBeenCalledTimes(1);
  });

  it('displays Stoic-validated messaging', () => {
    const { getByText } = render(
      <ResumeSessionModal
        visible={true}
        session={mockSession}
        onResume={mockOnResume}
        onBeginFresh={mockOnBeginFresh}
      />
    );

    expect(
      getByText(/Either choice is an opportunity to practice virtue/)
    ).toBeTruthy();
  });

  it('toggles Sphere Sovereignty tooltip', () => {
    const { getByText, queryByText } = render(
      <ResumeSessionModal
        visible={true}
        session={mockSession}
        onResume={mockOnResume}
        onBeginFresh={mockOnBeginFresh}
      />
    );

    // Initially hidden
    expect(queryByText('Sphere Sovereignty')).toBeNull();

    // Show tooltip
    fireEvent.press(getByText(/What do I control/));
    expect(getByText('Sphere Sovereignty')).toBeTruthy();

    // Hide tooltip
    fireEvent.press(getByText(/What do I control/));
    expect(queryByText('Sphere Sovereignty')).toBeNull();
  });

  it('displays time elapsed contextually', () => {
    const { getByText } = render(
      <ResumeSessionModal
        visible={true}
        session={mockSession}
        onResume={mockOnResume}
        onBeginFresh={mockOnBeginFresh}
      />
    );

    // Should show contextual time (not precise hours/minutes)
    expect(getByText(/earlier today|a few hours ago/)).toBeTruthy();
  });

  /**
   * DEBUG-403 — this prompt must never again be an RN <Modal>.
   *
   * RN's <Modal> renders in a SEPARATE NATIVE WINDOW above the JS view hierarchy, so
   * while it was open the root crisis button was not merely faded — it was not on screen
   * at all. DailyLoop is an IMMERSIVE_ROUTE and this prompt AUTO-triggers on stale-session
   * detection, so a user could reach zero 988 affordance without having tapped anything.
   *
   * These specs are structural guards, not behaviour coverage: the behaviour is pinned
   * on-device by daily-loop-quick-depth.yaml, because whether one native layer occludes
   * another is not observable from jest at all. What jest CAN do is fail the moment the
   * component reacquires the shape that caused it.
   */
  describe('DEBUG-403 · crisis-button occlusion guards', () => {
    it('renders no RN <Modal> — the occlusion shape must not return', () => {
      const { UNSAFE_queryAllByType } = render(
        <ResumeSessionModal
          visible={true}
          session={mockSession}
          onResume={mockOnResume}
          onBeginFresh={mockOnBeginFresh}
        />
      );

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Modal } = require('react-native');
      expect(UNSAFE_queryAllByType(Modal)).toHaveLength(0);
    });

    it('exposes the overlay testID the Maestro safety flow asserts on', () => {
      // daily-loop-quick-depth.yaml asserts `resume-session-overlay` is visible as the
      // PRECONDITION before it asserts the crisis button is reachable. If this testID is
      // renamed, that flow stops proving the resume state was reached and starts passing
      // vacuously — so the selector is pinned here where it is cheap to catch.
      const { getByTestId } = render(
        <ResumeSessionModal
          visible={true}
          session={mockSession}
          onResume={mockOnResume}
          onBeginFresh={mockOnBeginFresh}
        />
      );

      expect(getByTestId('resume-session-overlay')).toBeTruthy();
    });

    it('renders nothing when not visible', () => {
      // <Modal visible={false}> used to handle this. A plain overlay must gate itself, or
      // it would sit permanently over the navigator.
      const { queryByTestId } = render(
        <ResumeSessionModal
          visible={false}
          session={mockSession}
          onResume={mockOnResume}
          onBeginFresh={mockOnBeginFresh}
        />
      );

      expect(queryByTestId('resume-session-overlay')).toBeNull();
    });

    it('keeps the crisis button clear: the overlay reserves a bottom band', () => {
      const { getByTestId } = render(
        <ResumeSessionModal
          visible={true}
          session={mockSession}
          onResume={mockOnResume}
          onBeginFresh={mockOnBeginFresh}
        />
      );

      const style = StyleSheet.flatten(getByTestId('resume-session-overlay').props.style);

      // Absolute inset-0, not flex:1 — it is a sibling of the navigator now, not the root
      // of its own native window.
      expect(style.position).toBe('absolute');
      // The crisis button's hit area reaches ~156pt up from the bottom edge; it renders at
      // zIndex 9999, so an overlap would win the tap and fire a false crisis entry.
      expect(style.paddingBottom).toBeGreaterThanOrEqual(156);
      // WHITE, not the old rgba(0,0,0,0.6) scrim. The faded crisis button now composites
      // over this layer: against #171717 it measures 1.34:1, against white 2.71:1, and
      // DEBUG-396's FADED_OPACITY of 0.6 clears 3:1 on white. Darkening moves the wrong way.
      expect(style.backgroundColor).toBe(colorSystem.base.white);
    });

    it('PINS the action buttons outside the ScrollView so they cannot be clipped', () => {
      // THE regression guard for this item. Measured on device: the overlay gives the
      // card ~687pt (viewport minus the 176pt reserved band) and the full prompt wants
      // ~700pt. While the buttons lived inside the scroll region that ~13pt shortfall put
      // `begin-fresh-button`'s CENTRE 1.5pt into the clipped band — it still resolved in
      // the hierarchy, so Maestro reported the tap COMPLETED while the app never received
      // it, and a real user saw the primary action sliced in half.
      //
      // Two earlier attempts (bounding the scroll frame; auto margins instead of
      // justifyContent) both left the on-device render pixel-identical, because neither
      // changed the fact that the content did not fit. Pinning does.
      const { getByTestId, UNSAFE_getByType } = render(
        <ResumeSessionModal
          visible={true}
          session={mockSession}
          onResume={mockOnResume}
          onBeginFresh={mockOnBeginFresh}
        />
      );

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ScrollView } = require('react-native');
      const scroll = UNSAFE_getByType(ScrollView);

      // Both actions must exist...
      expect(getByTestId('begin-fresh-button')).toBeTruthy();
      expect(getByTestId('resume-session-button')).toBeTruthy();
      // CONTROL — proves `within(scroll)` actually resolves against this subtree. Without
      // it the two toBeNull assertions below could pass vacuously (a broken scope query
      // returns null for everything), which is the failure mode DEBUG-390 records: a
      // guard that cannot go red is worse than no guard.
      expect(within(scroll).queryByText('Return to Your Practice?')).toBeTruthy();

      // ...and NEITHER action may be a descendant of the scrollable region.
      expect(within(scroll).queryByTestId('begin-fresh-button')).toBeNull();
      expect(within(scroll).queryByTestId('resume-session-button')).toBeNull();
    });

    it('caps the card height so it can never overflow the overlay', () => {
      const { UNSAFE_getByType } = render(
        <ResumeSessionModal
          visible={true}
          session={mockSession}
          onResume={mockOnResume}
          onBeginFresh={mockOnBeginFresh}
        />
      );

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ScrollView } = require('react-native');
      const scroll = UNSAFE_getByType(ScrollView);

      // The prose gives up space first when the cap binds; the pinned row keeps its
      // height. Without flexShrink the scroll region would refuse to shrink and push the
      // buttons back out of the card.
      expect(StyleSheet.flatten(scroll.props.style)?.flexShrink).toBe(1);

      const card = scroll.parent;
      expect(StyleSheet.flatten(card?.props?.style)?.maxHeight).toBe('100%');
    });

  });
});
