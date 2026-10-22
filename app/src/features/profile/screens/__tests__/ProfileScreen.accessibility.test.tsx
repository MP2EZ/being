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
import path from 'path';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import type { AssessmentSession } from '@/features/assessment/types';
import {
  expectEntryShape, expectLiveness, expectMarginClearance, expectModelFidelity,
  expectSweepClear, flat, hostPad, readHost,
} from '../../../../../__tests__/helpers/crisisFabClearance';
import { expectExclusionCheckWired } from '../../../../../__tests__/helpers/crisisExclusionLayoutEvent';

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

// DEBUG-709: mutable, so each plan state can be rendered. The selectors mirror the store's:
// isSubscriptionActive is active|grace, isTrialActive is trial only.
let mockPlan: { status: 'trial' | 'active' | 'grace' | 'expired' | 'crisis_only' | null; trialDays: number | null } = {
  status: null,
  trialDays: null,
};
jest.mock('@/core/stores/subscriptionStore', () => ({
  useSubscriptionStore: () => ({
    subscription: mockPlan.status ? { status: mockPlan.status } : null,
    isTrialActive: () => mockPlan.status === 'trial',
    getTrialDaysRemaining: () => mockPlan.trialDays,
    isSubscriptionActive: () => mockPlan.status === 'active' || mockPlan.status === 'grace',
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
    // MAINT-615: titles are the pinned wellness labels, and each label starts
    // with its visible title so label-in-name holds (WCAG 2.5.3).
    expect(phq9.props.accessibilityLabel.startsWith('Mood Wellness Screening (PHQ-9),')).toBe(true);
    expect(gad7.props.accessibilityLabel.startsWith('Stress Wellness Screening (GAD-7),')).toBe(true);
    expect(phq9.props.accessibilityHint).toBe('Start the mood wellness screening');
    expect(gad7.props.accessibilityHint).toBe('Start the stress wellness screening');

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

// DEBUG-653: since DEBUG-562 the footer link is the LAST control at max scroll, where the FAB
// (zIndex 9999) would win an overlapping tap — the DEBUG-547 shape. See crisisFabClearance.ts.
describe('DEBUG-653: the Onboarding Setup footer link clears the crisis FAB exclusion region', () => {
  const TEST_ID = 'profile-footer-onboarding';
  const HOST = readHost(path.join(__dirname, '../ProfileScreen.tsx'));
  // Measured pre-fix: iPhone SE (3rd generation), 375x667, iOS 18.6, installed gate binary
  // marker 184ab8af, 2026-09-25, max scroll — [24,545][351,581].
  const MEASURED = { x: 24, y: 545, width: 327, height: 36 };
  const renderHost = () => {
    const api = render(<ProfileScreen />);
    return { api, style: flat(api.getByTestId(TEST_ID).props.style), pad: hostPad(api) };
  };

  it('(a) carries the clearance as a MARGIN on the element with the testID', () => {
    expectMarginClearance(renderHost().style, true);
  });

  it("(b) declares it from the derived constant, last, in the link's own bare entry", () => {
    expectEntryShape(HOST, 'footerLink', true);
    expect(HOST.source).toMatch(/style=\{styles\.footerLink\}/);
    expect(HOST.source.match(/styles\.footerLink(?!\w)/g)).toHaveLength(1);
  });

  it('(c) never intersects the exclusion rect at any y, on any supported viewport', () => {
    const { pad, style } = renderHost();
    expectSweepClear(pad, style, [MEASURED.height, 200]);
  });

  it('(d) the model reproduces the measured frame; (e) at inset 0 everything goes red', () => {
    expectModelFidelity(MEASURED, renderHost().pad);
    expectLiveness(HOST, 'footerLink', MEASURED, renderHost().pad);
  });

  it('DEBUG-643: the __DEV__ crisis-exclusion check is wired to the footer link', async () => {
    await expectExclusionCheckWired(renderHost().api.getByTestId(TEST_ID), TEST_ID);
  });
});

// ---------------------------------------------------------------------------
// DEBUG-709: "Your Plan" shows only what the store will honour
// ---------------------------------------------------------------------------

describe('DEBUG-709: the Your Plan card', () => {
  const APPLE_URL = 'https://apps.apple.com/account/subscriptions';
  const PROMISE = /start free trial|try free|28|unlock|therapeutic/i;

  beforeEach(() => {
    mockPlan = { status: null, trialDays: null };
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
    (Linking.openURL as jest.Mock).mockClear();
    (Linking.openURL as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['trial, 12 days', 'trial', 12, 'Free Trial - 12 days remaining'],
    ['trial, 1 day', 'trial', 1, 'Free Trial - 1 day remaining'],
    ['trial, ends today', 'trial', 0, 'Free Trial - ends today'],
    ['trial, unknown end', 'trial', null, 'Free Trial'],
    ['active', 'active', null, 'Active Subscription'],
    ['grace', 'grace', null, 'Payment Issue'],
  ] as const)('%s: "%s" title, a Manage CTA, and the press opens the store — never the paywall', async (_l, status, days, title) => {
    mockPlan = { status, trialDays: days };
    const { getByText, getByLabelText, queryByText } = render(<ProfileScreen />);

    expect(getByText(title)).toBeTruthy();
    expect(getByText('Manage Subscription →')).toBeTruthy();
    expect(getByLabelText(title).props.accessibilityHint).toBe('Manage your subscription');
    expect(queryByText(PROMISE)).toBeNull();

    await act(async () => {
      fireEvent.press(getByLabelText(title));
    });
    expect(Linking.openURL).toHaveBeenCalledWith(APPLE_URL);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('when the store page cannot open, one dismissable OK Alert names where to manage it', async () => {
    mockPlan = { status: 'active', trialDays: null };
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByLabelText } = render(<ProfileScreen />);

    await act(async () => {
      fireEvent.press(getByLabelText('Active Subscription'));
    });
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      'Manage your subscription in your App Store / Google Play account settings',
      undefined,
      [{ text: 'OK' }],
      { cancelable: true },
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it.each([
    ['no subscription', null, 'Choose a plan'],
    ['expired', 'expired', 'Subscription Ended'],
    ['crisis_only', 'crisis_only', 'Crisis Support Available'],
  ] as const)('%s: "%s", neutral copy, "See plans" opens the paywall', async (_l, status, title) => {
    mockPlan = { status, trialDays: null };
    const { getByText, getByLabelText, queryByText } = render(<ProfileScreen />);

    expect(getByText(title)).toBeTruthy();
    expect(getByText('See plans →')).toBeTruthy();
    expect(getByLabelText(title).props.accessibilityHint).toBe('Opens subscription plans');
    expect(queryByText(PROMISE)).toBeNull();
    expect(queryByText(/free trial/i)).toBeNull();

    await act(async () => {
      fireEvent.press(getByLabelText(title));
    });
    expect(mockNavigate).toHaveBeenCalledWith('Subscription');
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
