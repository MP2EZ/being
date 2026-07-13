/**
 * profile-stack-navigator.test.tsx
 *
 * FEAT-212 once hosted CollapsibleCrisisButton as a sibling of <Stack.Navigator>
 * inside ProfileStackNavigator (testID="crisis-profile"). MAINT-290 SUPERSEDED that:
 * the crisis button was promoted to a single persistent root overlay
 * (RootCrisisButton, testID="crisis-button-root") mounted once in CleanRootNavigator,
 * so the Profile stack no longer hosts its own — a per-navigator mount would now
 * double-render over the root overlay. This spec now pins:
 *   - the MAINT-290 regression guard: the Profile stack mounts NO crisis overlay,
 *   - the MAINT-257 header contract (back affordance + centered title), unchanged.
 *
 * Route→mode/suppression and the onNavigate('CrisisResources') payload for the single
 * root overlay are pinned by RootCrisisButton.test.tsx; on-device reachability across
 * every Profile route (depth-1 + depth-2) is the Maestro crisis-button-reachability flow.
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

describe('ProfileStackNavigator — crisis overlay delegated to root (MAINT-290)', () => {
  // The single persistent RootCrisisButton (mounted in CleanRootNavigator) now covers
  // every Profile route. The Profile stack must NOT mount its own crisis button — a
  // per-navigator mount would double-render over the root overlay. This guards against
  // reintroducing the removed FEAT-212 sibling mount.
  it('no longer hosts its own crisis overlay (delegated to the root mount)', () => {
    const { queryByTestId } = render(<ProfileStackNavigator />);
    expect(queryByTestId('crisis-profile')).toBeNull();
    expect(mockCrisisProps).not.toHaveBeenCalled();
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
