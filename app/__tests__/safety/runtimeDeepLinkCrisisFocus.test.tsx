/**
 * A runtime deep link does not cover or pop a focused crisis screen (DEBUG-737).
 *
 * secureSubscribe delivered every valid, consented link to React Navigation whatever
 * was on screen. With CrisisResources focused — possibly mid-988 call — an external
 * `being://daily` pushed DailyLoop over it and `being://` popped it back to Main.
 *
 * Crisis ruling (DEBUG-737, the runtime-link arm of DEBUG-706's): while a crisis
 * destination is the active root route, a NON-crisis runtime link is DROPPED and
 * logged by base path — not deferred: an external link replayed after the user leaves
 * the crisis screen would arrive out of context. `being://crisis` and the rate-limited
 * crisis fallback return before the check and are never affected. The check reads the
 * route at event time; a throw in it drops the non-crisis link (fail closed).
 *
 * HARNESS: a REAL NavigationContainer bound to the real `navigationRef`, given the real
 * `linkingConfig`, around a real `@react-navigation/stack` root mirroring the routes
 * `config.screens` can resolve (CleanRootNavigator cannot mount in jest). Only
 * expo-linking is mocked: its `addEventListener` is captured so a test can fire a URL
 * the way the OS does, and `getInitialURL` resolves null (warm app). The consent store
 * is real, set valid. `subscribe` is teed only to count what secureSubscribe delivered.
 */
import React, { useEffect } from 'react';
import { render, act, type RenderAPI } from '@testing-library/react-native';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Linking from 'expo-linking';
import { navigationRef } from '@/core/navigation/navigationRef';
import { linkingConfig, CRISIS_PATH_SEGMENT } from '@/core/navigation/linking';
import * as crisisDestinationGuard from '@/core/navigation/crisisDestinationGuard';
import { useConsentStore } from '@/core/stores/consentStore';
import DeepLinkValidationService from '@/core/services/security/DeepLinkValidationService';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `being://${path.replace(/^\//, '')}`),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(),
}));

// The global react-native mock is an allow-list; a real stack navigator needs these.
const RN = require('react-native');
const actualRN = jest.requireActual('react-native');
Object.assign(RN, {
  InteractionManager: actualRN.InteractionManager,
  I18nManager: actualRN.I18nManager,
  PixelRatio: actualRN.PixelRatio,
});

const mockAddEventListener = Linking.addEventListener as jest.Mock;
let fireOsUrl: (url: string) => void = () => {
  throw new Error('secureSubscribe has not subscribed');
};
let delivered: string[] = [];

/** Real linkingConfig; `subscribe` still runs secureSubscribe, teed to record deliveries. */
const harnessLinking: LinkingOptions<RootStackParamList> = {
  ...linkingConfig,
  subscribe: (listener) =>
    linkingConfig.subscribe!((url: string) => {
      delivered.push(url);
      listener(url);
    }),
};

const Root = createStackNavigator();
const Blank = () => null;
let crisisMounts = 0;

function CountedCrisisResources() {
  useEffect(() => {
    crisisMounts += 1;
  }, []);
  return null;
}

/** CleanRootNavigator's root routes — every one `config.screens` can resolve to. */
function Harness() {
  return (
    <NavigationContainer ref={navigationRef} linking={harnessLinking}>
      <Root.Navigator initialRouteName="Main" screenOptions={{ headerShown: false, animation: 'none' }}>
        <Root.Screen name="Main" component={Blank} />
        <Root.Screen name="LegalGate" component={Blank} />
        <Root.Screen name="Onboarding" component={Blank} />
        <Root.Screen name="DailyLoop" component={Blank} />
        <Root.Screen name="AssessmentFlow" component={Blank} />
        <Root.Screen name="ModuleDetail" component={Blank} />
        <Root.Screen name="PracticeTimer" component={Blank} />
        <Root.Screen name="ReflectionTimer" component={Blank} />
        <Root.Screen name="SortingPractice" component={Blank} />
        <Root.Screen name="BodyScan" component={Blank} />
        <Root.Screen name="GuidedBodyScan" component={Blank} />
        <Root.Screen name="Subscription" component={Blank} />
        <Root.Screen name="SubscriptionStatus" component={Blank} />
        <Root.Screen name="WellnessTrendsDetail" component={Blank} />
        <Root.Group screenOptions={{ presentation: 'modal' }}>
          <Root.Screen
            name="CrisisResources"
            component={CountedCrisisResources}
            options={{ headerShown: true, gestureEnabled: true }}
          />
        </Root.Group>
      </Root.Navigator>
    </NavigationContainer>
  );
}

function setConsentValid() {
  useConsentStore.setState({
    consentStatus: 'valid',
    consentCache: {
      canCollectAnalytics: false,
      canCollectCrashReports: false,
      canSyncToCloud: false,
      canParticipateInResearch: false,
      canProcessMentalHealthData: true,
      honorUniversalOptOut: false,
      ageVerified: true,
      isEligible: true,
      cacheTimestamp: Date.now(),
    },
  });
}

// ── helpers ───────────────────────────────────────────────────────────────────

const rootState = () => navigationRef.getRootState();
const rootRoutes = () => rootState().routes.map((r) => ({ name: r.name, key: r.key }));
const focusedRoot = () => rootState().routes[rootState().index]!;

/** Mount at Main; resolves once getInitialURL has settled and the container is ready. */
async function mount(): Promise<RenderAPI> {
  const ui = render(<Harness />);
  await act(async () => {});
  expect(navigationRef.isReady()).toBe(true);
  expect(focusedRoot().name).toBe('Main');
  return ui;
}

/** Fire a URL as the OS does (expo-linking 'url' event) and flush the resulting navigation. */
async function fire(url: string) {
  await act(async () => {
    fireOsUrl(url);
  });
}

/** Open CrisisResources the way the root crisis button does. */
function openCrisisFromButton() {
  act(() => navigationRef.navigate('CrisisResources' as never, { source: 'crisis_button' } as never));
  expect(focusedRoot().name).toBe('CrisisResources');
  return { focused: focusedRoot(), routes: rootRoutes() };
}

function tripRateLimiter() {
  for (let i = 0; i < 31; i++) DeepLinkValidationService.validateDeepLink('being://morning');
  expect(DeepLinkValidationService.validateDeepLink('being://morning').errors.map((e) => e.code)).toEqual([
    'RATE_LIMIT_EXCEEDED',
  ]);
}

/** Valid, allowlisted tokens from linking.ts's config.screens, and where each lands from Main. */
const NON_CRISIS_LINKS: readonly [url: string, landsOn: string][] = [
  ['being://', 'Main'],
  ['being://daily', 'DailyLoop'],
  ['being://assessment/PHQ9', 'AssessmentFlow'],
  ['being://module/aware-presence', 'ModuleDetail'],
  ['being://practice/breathing-space?duration=60', 'PracticeTimer'],
  ['being://subscription', 'Subscription'],
];

beforeEach(() => {
  jest.clearAllMocks();
  DeepLinkValidationService.clearSecurityEvents();
  setConsentValid();
  delivered = [];
  crisisMounts = 0;
  mockAddEventListener.mockImplementation((_event: string, handler: (e: { url: string }) => void) => {
    fireOsUrl = (url) => handler({ url });
    return { remove: jest.fn() };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── cases ─────────────────────────────────────────────────────────────────────

describe('runtime deep links while a crisis destination is focused (DEBUG-737)', () => {
  describe('control — the focus check bypassed reproduces the defect', () => {
    beforeEach(() => {
      jest.spyOn(crisisDestinationGuard, 'isCrisisDestinationFocused').mockReturnValue(false);
    });

    it('being://daily pushes DailyLoop over CrisisResources', async () => {
      const ui = await mount();
      openCrisisFromButton();

      await fire('being://daily');

      expect(delivered).toHaveLength(1);
      expect(focusedRoot().name).toBe('DailyLoop');
      ui.unmount();
    });

    // React Navigation 7 resolves `being://` to a NAVIGATE that pushes a second Main
    // over the modal rather than popping it: CrisisResources is covered, not removed.
    it('being:// takes CrisisResources off screen (a new Main is pushed over it)', async () => {
      const ui = await mount();
      openCrisisFromButton();

      await fire('being://');

      expect(delivered).toHaveLength(1);
      expect(focusedRoot().name).toBe('Main');
      expect(rootRoutes().map((r) => r.name)).toEqual(['Main', 'CrisisResources', 'Main']);
      ui.unmount();
    });
  });

  describe('CrisisResources focused', () => {
    it.each(NON_CRISIS_LINKS)(
      '%s is dropped: CrisisResources stays focused, same key, same route list, never remounted',
      async (url) => {
        const ui = await mount();
        const before = openCrisisFromButton();
        expect(crisisMounts).toBe(1);

        await fire(url);

        expect(delivered).toEqual([]);
        expect(focusedRoot().name).toBe('CrisisResources');
        expect(focusedRoot().key).toBe(before.focused.key);
        expect(focusedRoot().params).toEqual({ source: 'crisis_button' });
        expect(rootRoutes()).toEqual(before.routes);
        expect(crisisMounts).toBe(1);
        ui.unmount();
      },
    );

    it('SAFETY: being://crisis is still delivered, and CrisisResources stays focused', async () => {
      const ui = await mount();
      openCrisisFromButton();

      await fire('being://crisis');

      expect(delivered).toHaveLength(1);
      expect(delivered[0]).toEqual(expect.stringContaining(CRISIS_PATH_SEGMENT));
      expect(focusedRoot().name).toBe('CrisisResources');
      ui.unmount();
    });

    it('SAFETY: the rate-limited crisis fallback is still delivered', async () => {
      const ui = await mount();
      openCrisisFromButton();
      tripRateLimiter();

      await fire('being://crisis');

      expect(delivered).toEqual([`being://${CRISIS_PATH_SEGMENT}`]);
      expect(focusedRoot().name).toBe('CrisisResources');
      ui.unmount();
    });

    it('the drop is per event: once CrisisResources is dismissed, the next link resolves normally', async () => {
      const ui = await mount();
      openCrisisFromButton();
      await fire('being://daily');
      expect(focusedRoot().name).toBe('CrisisResources');

      act(() => navigationRef.goBack());
      expect(focusedRoot().name).toBe('Main');
      await fire('being://daily');

      expect(delivered).toHaveLength(1);
      expect(focusedRoot().name).toBe('DailyLoop');
      ui.unmount();
    });
  });

  describe('Main focused — unchanged', () => {
    it.each(NON_CRISIS_LINKS)('%s is delivered and lands on %s', async (url, landsOn) => {
      const ui = await mount();

      await fire(url);

      expect(delivered).toHaveLength(1);
      expect(focusedRoot().name).toBe(landsOn);
      ui.unmount();
    });

    it('being://crisis opens CrisisResources', async () => {
      const ui = await mount();

      await fire('being://crisis');

      expect(delivered).toHaveLength(1);
      expect(focusedRoot().name).toBe('CrisisResources');
      ui.unmount();
    });
  });

  describe('the route read throws (fail closed for non-crisis, never for crisis)', () => {
    it('a non-crisis link is dropped; being://crisis is still delivered', async () => {
      const ui = await mount();
      const getRootState = jest.spyOn(navigationRef, 'getRootState').mockImplementation(() => {
        throw new Error('route read failed');
      });

      expect(() => fireOsUrl('being://daily')).not.toThrow();
      await fire('being://crisis');
      getRootState.mockRestore();

      expect(delivered).toEqual([expect.stringContaining(CRISIS_PATH_SEGMENT)]);
      expect(focusedRoot().name).toBe('CrisisResources');
      expect(rootRoutes().map((r) => r.name)).not.toContain('DailyLoop');
      ui.unmount();
    });
  });
});

describe('secureSubscribe — focus check at event time (DEBUG-737)', () => {
  /** Subscribe once, fire each URL, return what reached the listener. */
  function deliver(...urls: string[]): string[] {
    const out: string[] = [];
    const unsubscribe = linkingConfig.subscribe!((u: string) => out.push(u));
    urls.forEach((u) => fireOsUrl(u));
    unsubscribe?.();
    return out;
  }

  it('the listener is not called for a non-crisis link while a crisis destination is focused', () => {
    jest.spyOn(crisisDestinationGuard, 'isCrisisDestinationFocused').mockReturnValue(true);
    expect(deliver('being://daily', 'being://', 'being://subscription')).toEqual([]);
  });

  it('SAFETY: being://crisis reaches the listener while a crisis destination is focused', () => {
    jest.spyOn(crisisDestinationGuard, 'isCrisisDestinationFocused').mockReturnValue(true);
    expect(deliver('being://crisis')).toEqual([expect.stringContaining(CRISIS_PATH_SEGMENT)]);
  });

  it('the focus is read per event, not captured at subscribe time', () => {
    const focused = jest.spyOn(crisisDestinationGuard, 'isCrisisDestinationFocused').mockReturnValue(true);
    const out: string[] = [];
    const unsubscribe = linkingConfig.subscribe!((u: string) => out.push(u));
    fireOsUrl('being://daily');
    expect(out).toEqual([]);
    focused.mockReturnValue(false);
    fireOsUrl('being://daily');
    expect(out).toHaveLength(1);
    unsubscribe?.();
  });

  it('no navigator mounted (cold start / not ready) is not focused: links are delivered', () => {
    expect(navigationRef.isReady()).toBe(false);
    expect(deliver('being://daily')).toHaveLength(1);
  });
});
