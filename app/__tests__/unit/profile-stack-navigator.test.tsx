/**
 * profile-stack-navigator.test.tsx — FEAT-212 crisis-overlay re-host (audit §5.1).
 *
 * FEAT-212 moved CollapsibleCrisisButton from inside ProfileScreen up to the
 * ProfileStackNavigator wrapper (sibling above <Stack.Navigator>). This spec pins
 * the frozen crisis contract at the jest layer by capturing the props the navigator
 * passes to the overlay:
 *   - CB-7: testID="crisis-profile" (the safety e2e + reachability target)
 *   - CB-6: mode="standard" (full opacity — never downgraded to immersive)
 *   - CB-4: position="right"
 *   - CB-1: onNavigate routes to the ROOT CrisisResources modal, not the local
 *           Profile stack — the failure mode where the dial path silently no-ops.
 *
 * The navigator machinery and screen modules are stubbed: this test is about WHAT
 * the navigator wires into the overlay. On-device reachability across every route
 * (depth-1 + depth-2) is the Maestro crisis-button-reachability flow.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

// Root navigation spy — the navigator must resolve THIS (root) nav for onNavigate.
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Stub the stack so <Stack.Navigator> just renders its children and screens are
// inert — keeps the overlay (the sibling we care about) rendering without a
// NavigationContainer (unsupported in this jest env). Also capture the Navigator
// props so we can assert the header contract (MAINT-257 restyle).
const mockNavigatorProps = jest.fn();
jest.mock('@react-navigation/stack', () => {
  const ReactLib = require('react');
  return {
    createStackNavigator: () => ({
      Navigator: (props: Record<string, unknown>) => {
        mockNavigatorProps(props);
        return ReactLib.createElement(ReactLib.Fragment, null, props.children);
      },
      Screen: () => null,
    }),
  };
});
jest.mock('@react-navigation/elements', () => ({ HeaderBackButton: () => null }));

// Capture the props the navigator passes to the crisis overlay.
const mockCrisisProps = jest.fn();
jest.mock('@/features/crisis/components/CollapsibleCrisisButton', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    CollapsibleCrisisButton: (props: Record<string, unknown>) => {
      mockCrisisProps(props);
      return ReactLib.createElement(Text, { testID: props.testID as string }, 'crisis');
    },
  };
});

// Screen modules are imported at the navigator's module top — stub them so their
// heavy transitive deps (e.g. react-native-markdown-display ESM) never load.
jest.mock('@/features/profile/screens/ProfileScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('@/features/profile/screens/AccountSettingsScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('@/features/profile/screens/PrivacyDataScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('@/features/profile/screens/AppSettingsScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('@/features/profile/screens/AboutStoicMindfulnessScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('@/features/profile/screens/AboutBeingScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('@/features/profile/screens/LegalDocumentsListScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('@/features/profile/screens/LegalDocumentScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('@/features/profile/screens/CloudBackupScreen', () => ({ __esModule: true, default: () => null }));

import ProfileStackNavigator from '@/features/profile/ProfileStackNavigator';

beforeEach(() => {
  mockNavigate.mockClear();
  mockCrisisProps.mockClear();
  mockNavigatorProps.mockClear();
});

describe('ProfileStackNavigator — crisis overlay re-host (FEAT-212)', () => {
  it('hosts the crisis overlay as a sibling of the stack (testID="crisis-profile")', () => {
    const { getByTestId } = render(<ProfileStackNavigator />);
    expect(getByTestId('crisis-profile')).toBeTruthy();
  });

  it('passes the frozen crisis props: standard mode, right position, pinned testID', () => {
    render(<ProfileStackNavigator />);
    expect(mockCrisisProps).toHaveBeenCalledTimes(1);
    const props = mockCrisisProps.mock.calls[0][0];
    expect(props.mode).toBe('standard'); // CB-6: never immersive
    expect(props.position).toBe('right'); // CB-4
    expect(props.testID).toBe('crisis-profile'); // CB-7
  });

  it('CB-1: onNavigate routes to the ROOT CrisisResources modal', () => {
    render(<ProfileStackNavigator />);
    const props = mockCrisisProps.mock.calls[0][0];
    (props.onNavigate as () => void)();
    expect(mockNavigate).toHaveBeenCalledWith('CrisisResources');
  });
});

describe('ProfileStackNavigator — header contract (MAINT-257 restyle)', () => {
  it('preserves the back affordance and centered title under the header restyle', () => {
    render(<ProfileStackNavigator />);
    const navProps = mockNavigatorProps.mock.calls[0][0];
    const opts = navProps.screenOptions as Record<string, unknown>;
    // Back-button label the screen reader announces (also a Maestro pin).
    expect(opts.headerBackTitle).toBe('Profile');
    // Native nav convention with a back chevron — must stay centered.
    expect(opts.headerTitleAlign).toBe('center');
    // headerLeft renders the HeaderBackButton carrying the Maestro back testID.
    const backEl = (opts.headerLeft as (p: object) => React.ReactElement)({});
    expect((backEl.props as { testID?: string }).testID).toBe('profile-back-button');
  });
});
