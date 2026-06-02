/**
 * ProfileScreen IA + safety-surface tests (FEAT-209, FEAT-203 Slice 1).
 *
 * Slice 1 is a pure information-architecture refactor of the Profile menu:
 * rename collision-prone labels, re-cluster 6 flat sections into 4 intent
 * groups with assessments promoted to the top, gate the "About Being."
 * placeholder, and demote Onboarding to a footer link.
 *
 * No ProfileScreen test existed before this. These specs pin BOTH the new IA
 * and the non-negotiable safety invariants the refactor must preserve
 * (audit §5.1): the persistent crisis button (CB-7), the two separately-
 * actionable instrument-named assessment entry points (AS-1), and the
 * co-located scoring-education trigger (AS-5).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { AssessmentSession } from '@/features/assessment/types';

// ── mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({ trackScreenView: jest.fn() }),
}));

// Keep the dev-mode banner out of the menu so assertions see only real chrome.
jest.mock('@/core/constants/devMode', () => ({ isDevMode: () => false }));

// Inject (empty) assessment history through the store selector.
let mockSessions: AssessmentSession[] = [];
jest.mock('@/features/assessment/stores/assessmentStore', () => ({
  useAssessmentStore: (selector: (s: { completedAssessments: AssessmentSession[] }) => unknown) =>
    selector({ completedAssessments: mockSessions }),
}));

jest.mock('@/core/stores/subscriptionStore', () => ({
  useSubscriptionStore: () => ({
    isTrialActive: () => false,
    getTrialDaysRemaining: () => 0,
    isSubscriptionActive: () => false,
  }),
}));

// FEAT-212: ProfileScreen is now the "ProfileMenu" route component — the
// subscreens are sibling routes on ProfileStackNavigator and are no longer
// imported here, so no stubbing of their heavy transitive deps is needed.

// Stand-in modal that surfaces its `visible` prop so we can assert the inline
// ⓘ trigger opens the scoring education (AS-5) without depending on RN Modal.
jest.mock('@/core/components/ThresholdEducationModal', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible }: { visible: boolean }) =>
      visible ? ReactLib.createElement(Text, { testID: 'edu-modal-open' }, 'scoring') : null,
  };
});

import ProfileScreen from '../ProfileScreen';

beforeEach(() => {
  mockSessions = [];
  mockNavigate.mockClear();
});

describe('ProfileScreen — FEAT-209 information architecture', () => {
  it('renders the four intent clusters with assessments promoted to the top', () => {
    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Wellbeing Check-ins')).toBeTruthy();
    expect(getByText('Your Plan')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('About')).toBeTruthy();
  });

  it('applies the C1 renames and drops the collision-prone labels', () => {
    const { getByText, queryByText } = render(<ProfileScreen />);

    // Renamed surfaces present…
    expect(getByText('Notifications & Display')).toBeTruthy();
    expect(getByText('Account')).toBeTruthy();
    expect(getByText('Your Plan')).toBeTruthy();

    // …and the near-synonym collisions are gone.
    expect(queryByText('App Settings')).toBeNull();
    expect(queryByText('App Preferences')).toBeNull();
    expect(queryByText('Subscription')).toBeNull();
    expect(queryByText('Information')).toBeNull();
  });

  it('M2: the Account card no longer lists its siblings\' contents', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('Manage your account details and preferences.')).toBeTruthy();
  });

  it('H2: gates the "About Being." placeholder until real content exists', () => {
    const { queryByText } = render(<ProfileScreen />);
    expect(queryByText('About Being.')).toBeNull();
  });

  it('H3: demotes Onboarding Setup to a footer link, not a top card', () => {
    const { getByLabelText } = render(<ProfileScreen />);
    const onboarding = getByLabelText('Onboarding Setup');
    expect(onboarding).toBeTruthy();
    expect(onboarding.props.accessibilityRole).toBe('button');
  });
});

describe('ProfileScreen — safety invariants preserved (audit §5.1)', () => {
  // CB-7 (persistent crisis button) moved to ProfileStackNavigator in FEAT-212 —
  // the overlay is now hosted above the stack so it covers every Profile route.
  // It is pinned in ProfileStackNavigator.test.tsx, not here.

  it('AS-1: PHQ-9 and GAD-7 stay separate, instrument-named, actionable entries', () => {
    const { getByTestId } = render(<ProfileScreen />);

    const phq9 = getByTestId('take-phq9-button');
    const gad7 = getByTestId('take-gad7-button');
    expect(phq9).toBeTruthy();
    expect(gad7).toBeTruthy();
    expect(phq9.props.accessibilityLabel).toContain('PHQ-9');
    expect(gad7.props.accessibilityLabel).toContain('GAD-7');

    fireEvent.press(phq9);
    expect(mockNavigate).toHaveBeenCalledWith('AssessmentFlow', {
      assessmentType: 'phq9',
      context: 'standalone',
    });
  });

  it('AS-5: the scoring-education ⓘ stays co-located and opens the modal', () => {
    const { getByLabelText, queryByTestId } = render(<ProfileScreen />);

    const info = getByLabelText('Learn about assessment scoring');
    expect(info.props.accessibilityRole).toBe('button');
    expect(queryByTestId('edu-modal-open')).toBeNull();

    fireEvent.press(info);
    expect(queryByTestId('edu-modal-open')).toBeTruthy();
  });
});
