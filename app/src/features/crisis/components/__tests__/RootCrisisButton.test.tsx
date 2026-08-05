/**
 * RootCrisisButton — MAINT-290
 *
 * Deterministic guard for the single persistent crisis-button overlay. This is
 * the "988 access can never regress" pin that runs in CI (the Maestro
 * crisis-button-reachability flow is local-only). It asserts the route→behavior
 * contract that the on-device flow cannot cheaply cover for every route:
 *   - suppression on routes that own their own crisis affordance,
 *   - immersive mode during meditative practice flows/timers,
 *   - standard mode everywhere else,
 *   - navigation via the root ref (guarded on isReady).
 */
import React from 'react';
import { render } from '@testing-library/react-native';

// Capture the props handed to the (heavy, animation-driven) CollapsibleCrisisButton
// without mounting it for real.
const receivedProps: Array<Record<string, any>> = [];
jest.mock('../CollapsibleCrisisButton', () => {
  const ReactActual = require('react');
  const { Text } = require('react-native');
  const Stub = (props: any) => {
    receivedProps.push(props);
    return ReactActual.createElement(Text, { testID: props.testID }, `mode:${props.mode}`);
  };
  return { __esModule: true, CollapsibleCrisisButton: Stub, default: Stub };
});

const mockNavigate = jest.fn();
let mockReady = true;
jest.mock('@/core/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: () => mockReady,
    navigate: (...args: any[]) => mockNavigate(...args),
  },
  getActiveRootRouteName: jest.fn(),
}));

import { RootCrisisButton, ROOT_CRISIS_BUTTON_TEST_ID } from '../RootCrisisButton';

const SUPPRESSED = ['CrisisResources', 'AssessmentFlow', 'LegalGate'];
const IMMERSIVE = [
  // FEAT-298 slice 6c: MorningFlow / MiddayFlow / EveningFlow removed with the flows.
  // DailyLoop is now the ONLY daily-practice immersive route — which raises the stakes on
  // this pin, since it is the sole surface where the overlay must render in immersive mode.
  'DailyLoop',
  'PracticeTimer',
  'ReflectionTimer',
  'SortingPractice',
  'BodyScan',
  'GuidedBodyScan',
];
const STANDARD = [
  'Main',
  'Onboarding',
  'ModuleDetail',
  'ClassicalLibrary',
  'PassageReader',
  'WellnessTrendsDetail',
  'Subscription',
  'SubscriptionStatus',
];

describe('RootCrisisButton (MAINT-290 single root mount)', () => {
  beforeEach(() => {
    receivedProps.length = 0;
    mockNavigate.mockClear();
    mockReady = true;
  });

  it.each(SUPPRESSED)('renders nothing on suppressed route %s (owns its own crisis affordance)', (route) => {
    const { queryByTestId } = render(<RootCrisisButton routeName={route} />);
    expect(queryByTestId(ROOT_CRISIS_BUTTON_TEST_ID)).toBeNull();
    expect(receivedProps).toHaveLength(0);
  });

  it('stays reachable in standard mode on VoiceReflection (FEAT-283)', () => {
    // The voice journal review surface can have crisis text on screen, so the
    // always-available affordance matters most there. Suppressing it, or
    // fading it to immersive, would be a safety regression — this pins that
    // adding the route to SUPPRESSED_ROUTES or IMMERSIVE_ROUTES fails a test
    // rather than silently shipping. Also pinned end-to-end by
    // .maestro/journal-crisis-scan.yaml.
    render(<RootCrisisButton routeName="VoiceReflection" />);
    expect(receivedProps[0]?.mode).toBe('standard');
    expect(receivedProps[0]?.testID).toBe(ROOT_CRISIS_BUTTON_TEST_ID);
  });

  it.each(IMMERSIVE)('uses immersive mode on practice route %s', (route) => {
    render(<RootCrisisButton routeName={route} />);
    expect(receivedProps[0]?.mode).toBe('immersive');
    expect(receivedProps[0]?.testID).toBe(ROOT_CRISIS_BUTTON_TEST_ID);
  });

  it.each(STANDARD)('uses standard mode on route %s', (route) => {
    render(<RootCrisisButton routeName={route} />);
    expect(receivedProps[0]?.mode).toBe('standard');
    expect(receivedProps[0]?.testID).toBe(ROOT_CRISIS_BUTTON_TEST_ID);
  });

  it('keeps the overlay in standard mode on the FEAT-293 PracticeLibrary route', () => {
    // PracticeLibrary is a browsable LISTING surface, not a practice the user is
    // immersed in, so it must resolve to the default `standard` overlay — and it
    // must never end up in SUPPRESSED_ROUTES, which would make it a screen with
    // zero 988 access. Unknown routes fall through to `standard`, which is the
    // fail-safe direction, but "safe by accident" is not a contract; this pins it.
    const { getByTestId } = render(<RootCrisisButton routeName="PracticeLibrary" />);
    expect(getByTestId(ROOT_CRISIS_BUTTON_TEST_ID)).toBeTruthy();
    expect(receivedProps[0]?.mode).toBe('standard');
  });

  it('renders in standard mode when route is undefined (pre-ready)', () => {
    const { getByTestId } = render(<RootCrisisButton />);
    expect(getByTestId(ROOT_CRISIS_BUTTON_TEST_ID)).toBeTruthy();
    expect(receivedProps[0]?.mode).toBe('standard');
  });

  it('navigates to CrisisResources via the root ref when ready', () => {
    render(<RootCrisisButton routeName="Main" />);
    receivedProps[0]?.onNavigate();
    expect(mockNavigate).toHaveBeenCalledWith('CrisisResources', { source: 'crisis_button' });
  });

  it('does not throw or navigate when the nav container is not ready', () => {
    mockReady = false;
    render(<RootCrisisButton routeName="Main" />);
    expect(() => receivedProps[0]?.onNavigate()).not.toThrow();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
