/**
 * Account deletion does not close a crisis screen opened mid-deletion (DEBUG-703).
 *
 * DeleteAccountScreen awaited the server erasure and then reset the root stack to
 * Onboarding. While the spinner ran, the root crisis button (and, keyboard up, the
 * keyboard crisis accessory) stayed live. A user who opened CrisisResources in that
 * window had it destroyed by the reset — possibly while on a 988 call — and landed
 * on onboarding. The `finally` also re-enabled the Delete button after a
 * successful erasure.
 *
 * Crisis ruling (DEBUG-703 specifics on top of DEBUG-706's): the whole reset is
 * DEFERRED until the first root state in which no crisis destination is focused —
 * never dropped, never redirected, no AppState branch — then dispatched at the root
 * with the unchanged normal-path payload. A failed deletion never navigates and
 * announces nothing over the crisis screen.
 *
 * HARNESS: a REAL NavigationContainer bound to the real `navigationRef`, real
 * `@react-navigation/stack` navigators shaped like CleanRootNavigator (Onboarding;
 * Main holding a nested Profile stack with DeleteAccount; a `presentation:'modal'`
 * group holding CrisisResources), the real DeleteAccountScreen, CrisisResourcesScreen
 * and RootCrisisButton. CleanRootNavigator itself cannot mount in jest (stores,
 * consent, linking), so its route TREE is mirrored, not imported. Transitions are
 * `animation: 'none'`: routing, not pixels, is under test, and animation frames
 * outlive the jest environment. Only the erasure service is faked, as a promise
 * this file resolves.
 *
 * NOT COVERED HERE: the iOS keyboard accessory is not mounted (it is an
 * InputAccessoryView, a native window); its entry is exercised by calling
 * `navigateToCrisisResources('keyboard_accessory', …)`, which is all its tap does.
 * VoiceOver focus retention and the <3s half of the 988 contract are device-only.
 */
import React, { useEffect, useState } from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render, fireEvent, act, type RenderAPI } from '@testing-library/react-native';
import { NavigationContainer, CommonActions, StackActions } from '@react-navigation/native';
import { createStackNavigator, type StackNavigationProp } from '@react-navigation/stack';
import { navigationRef, getActiveRootRouteName } from '@/core/navigation/navigationRef';
import RootCrisisButton from '@/features/crisis/components/RootCrisisButton';
import CrisisResourcesScreen from '@/features/crisis/screens/CrisisResourcesScreen';
import { navigateToCrisisResources } from '@/features/crisis/utils/navigateToCrisisResources';
import { openCrisisUrl } from '@/features/crisis/utils/openCrisisUrl';
import DeleteAccountScreen from '@/features/profile/screens/DeleteAccountScreen';

// The global react-native mock is an allow-list. A real stack navigator needs three
// more modules and a Linking subscription; add them to THIS file's registry only.
// Babel compiles named imports to property reads at call time, so this lands before
// any navigator code runs.
const RN = require('react-native');
const actualRN = jest.requireActual('react-native');
Object.assign(RN, {
  InteractionManager: actualRN.InteractionManager,
  I18nManager: actualRN.I18nManager,
  PixelRatio: actualRN.PixelRatio,
});
RN.Linking.addEventListener = jest.fn(() => ({ remove: jest.fn() }));

// React Navigation's `use-latest-callback` picks useLayoutEffect only when
// `navigator.product === 'ReactNative'` (or a DOM exists); jest's node environment has
// neither, so it falls back to useEffect. Its ref then updates AFTER the passive
// cleanups of a deleted subtree, so the nested Profile navigator's unmount cleanup reads
// the root's PRE-reset state and writes it back: the first root RESET after any
// nested-stack navigation is silently reverted. That is a jest artifact — on device RN
// sets `navigator.product`. Give the harness the device value before the module loads.
jest.mock('use-latest-callback', () => {
  Object.defineProperty(globalThis, 'navigator', {
    value: { ...(globalThis as { navigator?: object }).navigator, product: 'ReactNative' },
    configurable: true,
    writable: true,
  });
  return jest.requireActual('use-latest-callback');
});

const mockDeleteAccountAndWipe = jest.fn();
jest.mock('@/core/services/privacy/AccountDeletionService', () => ({
  deleteAccountAndWipe: (...args: unknown[]) => mockDeleteAccountAndWipe(...args),
}));

jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({
    trackScreenView: jest.fn(),
    trackCrisisResourcesViewed: jest.fn(),
    trackCrisisHotlineTapped: jest.fn(),
  }),
}));

jest.mock('@/features/crisis/utils/openCrisisUrl', () => {
  const actual = jest.requireActual('@/features/crisis/utils/openCrisisUrl');
  return { ...actual, openCrisisUrl: jest.fn((...args: unknown[]) => actual.openCrisisUrl(...args)) };
});

const ONBOARDING_RESET = { index: 0, routes: [{ name: 'Onboarding' }] };

type Nav = StackNavigationProp<Record<string, object | undefined>>;
let deleteAccountNavigation: Nav | null = null;
let profileMenuNavigation: Nav | null = null;
let crisisMounts = 0;

const Root = createStackNavigator();
const Profile = createStackNavigator();
const Blank = () => null;

function OnboardingStub() {
  return null;
}

/** Stands in for ProfileScreen; the test presses its "Delete account" card by navigating. */
function ProfileMenuStub({ navigation }: { navigation: Nav }) {
  profileMenuNavigation = navigation;
  return null;
}

/** The real DeleteAccountScreen; the wrapper only records its navigation object. */
function DeleteAccountHost({ navigation }: { navigation: Nav }) {
  deleteAccountNavigation = navigation;
  return <DeleteAccountScreen />;
}

/** The real CrisisResourcesScreen, with a mount counter: a remount is the defect. */
function CountedCrisisResources() {
  useEffect(() => {
    crisisMounts += 1;
  }, []);
  return <CrisisResourcesScreen />;
}

function ProfileStack() {
  return (
    <Profile.Navigator initialRouteName="ProfileMenu" screenOptions={{ headerShown: false, animation: 'none' }}>
      <Profile.Screen name="ProfileMenu" component={ProfileMenuStub} />
      <Profile.Screen name="DeleteAccount" component={DeleteAccountHost} />
    </Profile.Navigator>
  );
}

/** CleanRootNavigator's route tree around this defect, plus the real root crisis button. */
function Harness() {
  const [activeRootRoute, setActiveRootRoute] = useState<string | undefined>(undefined);
  const sync = () => setActiveRootRoute(getActiveRootRouteName());
  return (
    <NavigationContainer ref={navigationRef} onReady={sync} onStateChange={sync}>
      <Root.Navigator initialRouteName="Main" screenOptions={{ headerShown: false, animation: 'none' }}>
        <Root.Screen name="Onboarding" component={OnboardingStub} />
        <Root.Screen name="Main" component={ProfileStack} />
        <Root.Screen name="ReConsent" component={Blank} />
        <Root.Screen name="ConsentBlocked" component={Blank} />
        <Root.Group screenOptions={{ presentation: 'modal' }}>
          <Root.Screen
            name="CrisisResources"
            component={CountedCrisisResources}
            options={{ headerShown: true, gestureEnabled: true }}
          />
        </Root.Group>
      </Root.Navigator>
      <RootCrisisButton routeName={activeRootRoute} />
    </NavigationContainer>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

const rootState = () => navigationRef.getRootState();
const rootNames = () => rootState().routes.map((r) => r.name);
const focusedRoot = () => rootState().routes[rootState().index];
const all = { includeHiddenElements: true } as const;

/** Mount at Main › Profile › DeleteAccount, with DELETE typed. */
function mountOnDeleteAccount(): RenderAPI {
  const ui = render(<Harness />);
  act(() => profileMenuNavigation!.navigate('DeleteAccount'));
  fireEvent.changeText(ui.getByTestId('delete-confirm-input'), 'DELETE');
  return ui;
}

/** Press Delete; the erasure then hangs until the returned function settles it. */
function startDeletion(ui: RenderAPI) {
  let settle: (r: { ok: boolean; retryable?: boolean }) => void = () => {};
  mockDeleteAccountAndWipe.mockReturnValue(new Promise((resolve) => (settle = resolve)));
  fireEvent.press(ui.getByTestId('delete-account-button'));
  expect(mockDeleteAccountAndWipe).toHaveBeenCalledTimes(1);
  return async (result: { ok: boolean; retryable?: boolean }) => {
    await act(async () => {
      settle(result);
    });
  };
}

type Source = 'crisis_button' | 'keyboard_accessory';

/** Open CrisisResources the way each entry point does. */
function openCrisis(ui: RenderAPI, source: Source) {
  if (source === 'crisis_button') {
    fireEvent.press(ui.getByTestId('crisis-button-root'));
  } else {
    act(() => navigateToCrisisResources('keyboard_accessory', 'CrisisKeyboardAccessory'));
  }
  expect(focusedRoot()?.name).toBe('CrisisResources');
  expect(focusedRoot()?.params).toEqual({ source });
  return focusedRoot()!;
}

/** Dismiss CrisisResources (header back / swipe-down / Android back all dispatch this). */
function dismissCrisis() {
  act(() => {
    navigationRef.dispatch(CommonActions.goBack());
  });
}

/**
 * Taps from this state's first render to openCrisisUrl('tel:988'). The 988 control
 * on the crisis destination if it is on screen, else the root crisis button first.
 */
function pressesTo988(ui: RenderAPI): number {
  (openCrisisUrl as jest.Mock).mockClear();
  let presses = 0;
  if (ui.queryByTestId('crisis-call-988-button') === null) {
    fireEvent.press(ui.getByTestId('crisis-button-root'));
    presses += 1;
  }
  fireEvent.press(ui.getByTestId('crisis-call-988-button'));
  presses += 1;
  expect(openCrisisUrl).toHaveBeenCalledWith('tel:988', expect.anything());
  return presses;
}

let stateEvents = 0;
let unsubscribeState: () => void = () => {};

beforeEach(() => {
  jest.clearAllMocks();
  RN.AppState.currentState = 'active';
  deleteAccountNavigation = null;
  profileMenuNavigation = null;
  crisisMounts = 0;
  stateEvents = 0;
});

afterEach(() => {
  unsubscribeState();
  unsubscribeState = () => {};
});

const countStateEvents = () => {
  stateEvents = 0;
  unsubscribeState = navigationRef.addListener('state', () => {
    stateEvents += 1;
  });
};

// ── cases ─────────────────────────────────────────────────────────────────────

describe('account deletion and a crisis screen opened mid-deletion (DEBUG-703)', () => {
  it('(a) control — the pre-fix completion, a reset from DeleteAccount, destroys CrisisResources', () => {
    const ui = mountOnDeleteAccount();
    openCrisis(ui, 'crisis_button');
    expect(crisisMounts).toBe(1);

    // Exactly what the screen did before DEBUG-703, from its own navigation object:
    // Profile has no Onboarding route, so the reset bubbles to the root.
    act(() => deleteAccountNavigation!.reset(ONBOARDING_RESET as never));

    expect(rootNames()).toEqual(['Onboarding']);
    expect(ui.queryByTestId('crisis-call-988-button')).toBeNull();
    ui.unmount();
  });

  describe.each<[Source, 'active' | 'background']>([
    ['crisis_button', 'active'],
    ['keyboard_accessory', 'active'],
    ['crisis_button', 'background'],
    ['keyboard_accessory', 'background'],
  ])('opened via %s, deletion resolves ok with the app %s', (source, appState) => {
    it('(b)/(c) leaves CrisisResources focused, same key and params, never remounted; no Onboarding beneath', async () => {
      const ui = mountOnDeleteAccount();
      const resolve = startDeletion(ui);
      const crisis = openCrisis(ui, source);
      RN.AppState.currentState = appState; // no AppState branch: the result must not depend on it

      await resolve({ ok: true });

      expect(focusedRoot()?.name).toBe('CrisisResources');
      expect(focusedRoot()?.key).toBe(crisis.key);
      expect(focusedRoot()?.params).toEqual({ source });
      expect(crisisMounts).toBe(1);
      expect(rootNames()).not.toContain('Onboarding');
      expect(ui.getByTestId('crisis-call-988-button')).toBeTruthy();
      ui.unmount();
    });

    it('(d) dismissal settles on [Onboarding] — never DeleteAccount, Profile, ReConsent or ConsentBlocked', async () => {
      const ui = mountOnDeleteAccount();
      const resolve = startDeletion(ui);
      openCrisis(ui, source);
      RN.AppState.currentState = appState;
      await resolve({ ok: true });
      expect(focusedRoot()?.name).toBe('CrisisResources');

      dismissCrisis();

      expect(rootNames()).toEqual(['Onboarding']);
      expect(focusedRoot()?.name).toBe('Onboarding');
      expect(rootState().routes.some((r) => r.state !== undefined)).toBe(false);
      expect(ui.queryByTestId('delete-account-screen', all)).toBeNull();
      ui.unmount();
    });
  });

  it('(d) dismissal by pop lands on Onboarding too, and the deferred reset runs once', async () => {
    const ui = mountOnDeleteAccount();
    const resolve = startDeletion(ui);
    openCrisis(ui, 'crisis_button');
    await resolve({ ok: true });
    expect(focusedRoot()?.name).toBe('CrisisResources');

    countStateEvents();
    act(() => {
      navigationRef.dispatch(StackActions.pop());
    });

    expect(rootNames()).toEqual(['Onboarding']);
    // One for the pop, one for the reset — and nothing after it.
    expect(stateEvents).toBe(2);
    act(() => navigationRef.navigate('CrisisResources' as never, { source: 'crisis_button' } as never));
    dismissCrisis();
    expect(rootNames()).toEqual(['Onboarding']);
    ui.unmount();
  });

  it('(e) failure while CrisisResources is focused: no navigation, no announcement; the error is there on return', async () => {
    const RNA = RN.AccessibilityInfo;
    const ui = mountOnDeleteAccount();
    const resolve = startDeletion(ui);
    const crisis = openCrisis(ui, 'crisis_button');
    const dispatch = jest.spyOn(navigationRef, 'dispatch');
    const reset = jest.spyOn(navigationRef, 'reset');
    countStateEvents();

    await resolve({ ok: false, retryable: true });

    expect(stateEvents).toBe(0);
    expect(dispatch).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
    expect(focusedRoot()?.key).toBe(crisis.key);
    expect(crisisMounts).toBe(1);
    expect(RNA.announceForAccessibility).not.toHaveBeenCalled();
    expect(RNA.setAccessibilityFocus).not.toHaveBeenCalled();
    const error = ui.getByTestId('delete-error', all);
    expect(error.props.accessibilityLiveRegion).toBe('none');
    dispatch.mockRestore();
    reset.mockRestore();

    dismissCrisis();

    expect(focusedRoot()?.name).toBe('Main');
    expect(ui.getByTestId('delete-error').props.children).toMatch(/intact/i);
    // Retry stays available after a FAILED erasure.
    expect(ui.getByTestId('delete-account-button').props.accessibilityState.disabled).toBe(false);
    ui.unmount();
  });

  it('(e) control — a failure with no crisis screen open still announces assertively', async () => {
    const ui = mountOnDeleteAccount();
    const resolve = startDeletion(ui);

    await resolve({ ok: false, retryable: true });

    expect(ui.getByTestId('delete-error').props.accessibilityLiveRegion).toBe('assertive');
    ui.unmount();
  });

  it('(f) normal path: resets with exactly the Onboarding payload and lands there', async () => {
    const ui = mountOnDeleteAccount();
    const reset = jest.spyOn(deleteAccountNavigation!, 'reset');
    const resolve = startDeletion(ui);

    await resolve({ ok: true });

    expect(reset).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledWith(ONBOARDING_RESET);
    expect(rootNames()).toEqual(['Onboarding']);
    ui.unmount();
  });

  it('(g) a successful erasure never re-enables the Delete button — screen still mounted after the reset', async () => {
    const ui = mountOnDeleteAccount();
    // Hold the screen on stage after its own reset, so the `finally` is observable.
    jest.spyOn(deleteAccountNavigation!, 'reset').mockImplementation(() => {});
    const resolve = startDeletion(ui);

    await resolve({ ok: true });

    const button = ui.getByTestId('delete-account-button');
    expect(button.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(button);
    expect(mockDeleteAccountAndWipe).toHaveBeenCalledTimes(1);
    ui.unmount();
  });

  it('(g) a successful erasure never re-enables the Delete button — beneath a crisis screen', async () => {
    const ui = mountOnDeleteAccount();
    const resolve = startDeletion(ui);
    openCrisis(ui, 'crisis_button');

    await resolve({ ok: true });

    const button = ui.getByTestId('delete-account-button', all);
    expect(button.props.accessibilityState.disabled).toBe(true);
    expect(ui.getByTestId('delete-confirm-input', all).props.editable).toBe(false);
    fireEvent.press(button);
    expect(mockDeleteAccountAndWipe).toHaveBeenCalledTimes(1);
    ui.unmount();
  });

  describe('(h) 988 within 2 taps in every state the harness can mount', () => {
    it('deletion in flight', () => {
      const ui = mountOnDeleteAccount();
      startDeletion(ui);
      expect(pressesTo988(ui)).toBeLessThanOrEqual(2);
      ui.unmount();
    });

    it('CrisisResources opened mid-deletion', () => {
      const ui = mountOnDeleteAccount();
      startDeletion(ui);
      openCrisis(ui, 'crisis_button');
      expect(pressesTo988(ui)).toBe(1);
      ui.unmount();
    });

    it('CrisisResources after the deletion completed beneath it', async () => {
      const ui = mountOnDeleteAccount();
      const resolve = startDeletion(ui);
      openCrisis(ui, 'keyboard_accessory');
      await resolve({ ok: true });
      expect(pressesTo988(ui)).toBe(1);
      ui.unmount();
    });

    it('the destination after dismissal (Onboarding)', async () => {
      const ui = mountOnDeleteAccount();
      const resolve = startDeletion(ui);
      openCrisis(ui, 'crisis_button');
      await resolve({ ok: true });
      expect(focusedRoot()?.name).toBe('CrisisResources');
      dismissCrisis();
      expect(focusedRoot()?.name).toBe('Onboarding');
      expect(pressesTo988(ui)).toBeLessThanOrEqual(2);
      ui.unmount();
    });

    it('the normal-path Onboarding', async () => {
      const ui = mountOnDeleteAccount();
      const resolve = startDeletion(ui);
      await resolve({ ok: true });
      expect(focusedRoot()?.name).toBe('Onboarding');
      expect(pressesTo988(ui)).toBeLessThanOrEqual(2);
      ui.unmount();
    });

    it('returning after a failed deletion', async () => {
      const ui = mountOnDeleteAccount();
      const resolve = startDeletion(ui);
      openCrisis(ui, 'crisis_button');
      await resolve({ ok: false, retryable: true });
      dismissCrisis();
      expect(focusedRoot()?.name).toBe('Main');
      expect(pressesTo988(ui)).toBeLessThanOrEqual(2);
      ui.unmount();
    });
  });
});

describe('DeleteAccountScreen goes through the crisis guard (DEBUG-703)', () => {
  /** DEBUG-390: strip comments — the header names the anti-pattern in prose. */
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const code = stripComments(
    readFileSync(join(__dirname, '../../src/features/profile/screens/DeleteAccountScreen.tsx'), 'utf8'),
  );

  it('(i) uses the guard predicate and helper, and declares no route list of its own', () => {
    expect(code.length).toBeGreaterThan(2000);
    expect(code).toMatch(/isCrisisDestinationFocused\s*\(/);
    expect(code).toMatch(/runWhenNoCrisisDestinationFocused\s*\(/);
    expect(code).toMatch(/from\s+['"]@\/core\/navigation\/crisisDestinationGuard['"]/);
    expect(code).not.toMatch(/['"]CrisisResources['"]/);
    expect(code).not.toMatch(/CRISIS_DESTINATION_ROUTES|SUPPRESSED_ROUTES|RECONSENT_DEFERRAL_ROUTES/);
    expect(code).not.toMatch(/useIsFocused\s*\(/);
  });

  it('(i) positive control — the matchers fire on code and ignore prose', () => {
    expect(stripComments("if (isCrisisDestinationFocused()) runWhenNoCrisisDestinationFocused(go);")).toMatch(
      /runWhenNoCrisisDestinationFocused\s*\(/,
    );
    expect(stripComments("const ROUTES = ['CrisisResources'];")).toMatch(/['"]CrisisResources['"]/);
    expect(stripComments("// never write ['CrisisResources'] here\nconst x = 1;")).not.toMatch(
      /['"]CrisisResources['"]/,
    );
    expect(stripComments('/* runWhenNoCrisisDestinationFocused(run) */')).not.toMatch(
      /runWhenNoCrisisDestinationFocused\s*\(/,
    );
  });
});
