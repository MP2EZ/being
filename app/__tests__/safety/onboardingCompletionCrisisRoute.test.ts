/**
 * The crisis screen survives onboarding completion (DEBUG-711).
 *
 * The root crisis button is live on Onboarding, so CrisisResources can open while
 * completion is still persisting. The old closure then ran a bare
 * `navigation.replace('Main')` — StackRouter applies that to the FOCUSED route, so
 * CrisisResources was the route replaced — and 100ms later pushed DailyLoop over
 * whatever was on top.
 *
 * Crisis ruling (DEBUG-706's, shared with DEBUG-703; mechanism 2026-10-06): persist
 * first, then defer the WHOLE navigation while a crisis destination is focused —
 * never dropped, never redirected — replacing Onboarding by key at the root. Not
 * "replace now, defer only DailyLoop": that mounts Main under CrisisResources, and
 * Home's intro announces itself on mount.
 *
 * Router-level on the REAL StackRouter, the DEBUG-706 harness. Maestro cannot reach
 * this race: e2e seeding starts past onboarding.
 */
import { CommonActions, StackRouter, type StackNavigationState } from '@react-navigation/routers';
import { AccessibilityInfo } from 'react-native';
import { readFileSync } from 'fs';
import { join } from 'path';
import { completeOnboarding, type OnboardingDestination } from '@/core/navigation/completeOnboarding';
import { isCrisisDestinationFocused } from '@/core/navigation/crisisDestinationGuard';

type State = StackNavigationState<Record<string, object | undefined>>;
type Action = { type: string; payload?: unknown; source?: string; target?: string };

const ROUTE_NAMES = ['Onboarding', 'Main', 'DailyLoop', 'CrisisResources', 'ReConsent'];
const DESTINATIONS: OnboardingDestination[] = ['home', 'practice'];
const LANDING: Record<OnboardingDestination, string[]> = { home: ['Main'], practice: ['Main', 'DailyLoop'] };

function rootStack() {
  const router = StackRouter({ initialRouteName: 'Onboarding' });
  const options = { routeNames: ROUTE_NAMES, routeParamList: {}, routeGetIdList: {} };
  let state = router.getInitialState(options) as State;
  const listeners = new Set<() => void>();
  const apply = (action: Action) => {
    const next = router.getStateForAction(state, action as never, options);
    if (next && next !== state) {
      state = next as State;
      listeners.forEach((l) => l());
    }
  };
  return {
    get state() {
      return state;
    },
    names: () => state.routes.map((r) => r.name),
    keyOf: (name: string) => state.routes.find((r) => r.name === name)?.key,
    focused: () => state.routes[state.index]?.name,
    /** What the Onboarding screen's own `navigation` does: stamps `source`, never `target`. */
    screen: (routeKey: string) => ({
      replace: (name: string) => apply({ type: 'REPLACE', payload: { name }, source: routeKey }),
      navigate: (name: string) => apply({ ...CommonActions.navigate(name), source: routeKey }),
    }),
    /** The root the fix dispatches through (navigationRef's shape). */
    root: {
      getRootState: () => state,
      dispatch: (action: Action) => apply(action),
      navigate: (name: 'DailyLoop') => apply(CommonActions.navigate(name)),
    },
    openCrisis: () => apply(CommonActions.navigate('CrisisResources')),
    popCrisis: () => apply({ ...CommonActions.goBack(), source: state.routes[state.index]!.key }),
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

type Stack = ReturnType<typeof rootStack>;

/** Start completion with a persist the test resolves, so a crisis screen can open mid-await. */
function startCompletion(stack: Stack, destination: OnboardingDestination) {
  let resolvePersist: () => void = () => {};
  const persist = jest.fn(() => new Promise<void>((r) => (resolvePersist = r)));
  const done = completeOnboarding(destination, {
    onboardingRouteKey: stack.keyOf('Onboarding')!,
    markComplete: persist,
    root: stack.root as never,
    isCrisisFocused: () => isCrisisDestinationFocused(stack.focused()),
    subscribe: stack.subscribe,
  });
  return {
    persist,
    finish: async () => {
      resolvePersist();
      await done;
    },
  };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('control — the closure this item replaces', () => {
  it('replaces CrisisResources instead of Onboarding, and pushes DailyLoop on top', () => {
    const stack = rootStack();
    const onboarding = stack.screen(stack.keyOf('Onboarding')!);
    stack.openCrisis();

    onboarding.replace('Main'); // bare replace: acts on the focused route
    onboarding.navigate('DailyLoop');

    expect(stack.names()).not.toContain('CrisisResources');
    expect(stack.names()).toContain('Onboarding');
  });
});

describe.each(DESTINATIONS)('destination %s', (destination) => {
  it('CrisisResources opened during the completion await stays focused, with its key, while deferred', async () => {
    const stack = rootStack();
    const c = startCompletion(stack, destination);
    stack.openCrisis();
    const crisisKey = stack.keyOf('CrisisResources');

    await c.finish();
    jest.advanceTimersByTime(1000);

    expect(c.persist).toHaveBeenCalledTimes(1);
    expect(stack.names()).toEqual(['Onboarding', 'CrisisResources']);
    expect(stack.focused()).toBe('CrisisResources');
    expect(stack.keyOf('CrisisResources')).toBe(crisisKey);
  });

  it(`lands on ${LANDING[destination].join(' + ')} once the user leaves CrisisResources — deferred, never dropped`, async () => {
    const stack = rootStack();
    const c = startCompletion(stack, destination);
    stack.openCrisis();
    await c.finish();

    stack.popCrisis();

    expect(stack.names()).toEqual(LANDING[destination]);
    expect(stack.names()).not.toContain('Onboarding');
  });

  it('with no crisis screen open, behaves as before, in the same tick and with no timer', async () => {
    const stack = rootStack();
    const c = startCompletion(stack, destination);
    await c.finish();

    expect(stack.names()).toEqual(LANDING[destination]);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('a CrisisResources opened right after completion is never covered: nothing is left scheduled', async () => {
    const stack = rootStack();
    const c = startCompletion(stack, destination);
    await c.finish();
    stack.openCrisis();
    const before = stack.names();

    jest.advanceTimersByTime(1000);

    expect(stack.focused()).toBe('CrisisResources');
    expect(stack.names()).toEqual(before);
  });

  it('a second completion is a logged no-op once Onboarding is gone', async () => {
    const stack = rootStack();
    const key = stack.keyOf('Onboarding')!;
    await startCompletion(stack, destination).finish();
    const after = stack.names();

    await completeOnboarding(destination, {
      onboardingRouteKey: key,
      markComplete: jest.fn(async () => {}),
      root: stack.root as never,
      isCrisisFocused: () => isCrisisDestinationFocused(stack.focused()),
      subscribe: stack.subscribe,
    });

    expect(stack.names()).toEqual(after);
  });

  it('never moves accessibility focus or announces anything, deferred or not', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const focus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus');
    const stack = rootStack();
    const c = startCompletion(stack, destination);
    stack.openCrisis();
    await c.finish();
    stack.popCrisis();

    expect(announce).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
  });
});

describe('it replaces Onboarding by key, whatever is focused', () => {
  it('a non-crisis route above Onboarding is left alone; Onboarding beneath it becomes Main', async () => {
    const stack = rootStack();
    const c = startCompletion(stack, 'home');
    stack.root.dispatch(CommonActions.navigate('ReConsent')); // not a crisis destination: no deferral
    await c.finish();

    // A source-only replace acts on the FOCUSED route and would have replaced ReConsent.
    expect(stack.names()).toEqual(['Main', 'ReConsent']);
  });
});

describe('the fix never blocks a crisis destination', () => {
  it('opening CrisisResources again while completion is deferred still focuses it', async () => {
    const stack = rootStack();
    const c = startCompletion(stack, 'practice');
    stack.openCrisis();
    await c.finish();

    stack.popCrisis(); // deferred navigation runs: Main + DailyLoop
    stack.openCrisis(); // and the crisis screen opens over it, unguarded

    expect(stack.focused()).toBe('CrisisResources');
  });

  it('the paths INTO the crisis screen do not import the guard or this completion', () => {
    const src = (p: string) => readFileSync(join(__dirname, '../../src', p), 'utf8');
    for (const p of ['features/crisis/utils/navigateToCrisisResources.ts', 'features/crisis/components/RootCrisisButton.tsx']) {
      expect(src(p)).not.toMatch(/crisisDestinationGuard|completeOnboarding/);
    }
  });
});

describe('wiring', () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const navigator = () => strip(readFileSync(join(__dirname, '../../src/core/navigation/CleanRootNavigator.tsx'), 'utf8'));

  const block = (source: string, start: string, end: string): string => {
    const a = source.indexOf(start);
    const b = source.indexOf(end, a);
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
    return source.slice(a, b);
  };

  it('the Onboarding screen completes through completeOnboarding, with no timer and no bare replace', () => {
    const onboarding = block(navigator(), 'name="Onboarding"', '</Stack.Screen>');
    expect(onboarding).toMatch(/completeOnboarding\s*\(/);
    expect(onboarding).toMatch(/onboardingRouteKey:\s*route\.key/);
    expect(onboarding).not.toMatch(/setTimeout\s*\(/);
    expect(onboarding).not.toMatch(/navigation\.(replace|navigate)\s*\(/);
  });

  it('handleOnboardingComplete only persists — the empty timer is gone', () => {
    const handler = block(navigator(), 'const handleOnboardingComplete', '};');
    expect(handler).toMatch(/markOnboardingComplete\s*\(/);
    expect(handler).not.toMatch(/setTimeout\s*\(/);
  });

  it('completeOnboarding reaches crisis focus only through the existing destination set', () => {
    const src = strip(readFileSync(join(__dirname, '../../src/core/navigation/completeOnboarding.ts'), 'utf8'));
    expect(src).toMatch(/runWhenNoCrisisDestinationFocused/);
    expect(src).not.toMatch(/[A-Z0-9_]+_ROUTES/);
    expect(src).not.toMatch(/AccessibilityInfo|announce/);
  });

  it("the 'Onboarding finished' announcement fires on the Continue tap, BEFORE onComplete runs", () => {
    // Pinned rather than moved (crisis ruling): a crisis screen cannot be open yet at that
    // point, because the tap that raises the announcement is the tap that starts completion.
    const onboarding = strip(readFileSync(join(__dirname, '../../src/features/onboarding/screens/OnboardingScreen.tsx'), 'utf8'));
    const announce = onboarding.indexOf('announceToScreenReader(screenTransitions.celebration)');
    const complete = onboarding.indexOf('onComplete(completionDestination)');
    expect(announce).toBeGreaterThan(-1);
    expect(complete).toBeGreaterThan(announce);
  });
});
