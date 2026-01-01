/**
 * ResumeSessionModal Tests
 *
 * FEAT-139: Unit tests for the shared ResumeSessionModal component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ResumeSessionModal } from '@/features/practices/shared/components/ResumeSessionModal';
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

  const mockSession: SessionMetadata = {
    id: 'test-session-123',
    flowType: 'morning',
    currentScreen: 'Gratitude',
    startedAt: Date.now() - 1000 * 60 * 60, // 1 hour ago
    lastActiveAt: Date.now() - 1000 * 60 * 30, // 30 min ago
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
});
