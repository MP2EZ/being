/**
 * The crisis screen survives the onboarding re-ask at the legal gate (DEBUG-734).
 *
 * handlePrivacyContinue awaits two consent reads and a grant before it decides to
 * re-ask (DEBUG-419 / DEBUG-755). The root crisis button is live on Onboarding, so
 * CrisisResources can open during those awaits. Each re-ask was a bare
 * `navigation.replace('LegalGate')` — StackRouter applies that to the FOCUSED route,
 * so CrisisResources was what got replaced.
 *
 * Crisis ruling (DEBUG-706's, shared with DEBUG-703 / DEBUG-711): defer the whole
 * navigation while a crisis destination is focused — never dropped, never redirected
 * — and replace Onboarding by key at the root. Compliance ruling: the fail-closed
 * DECISION stays synchronous in the screen; only the route change is deferred.
 *
 * Router-level on the REAL StackRouter, the DEBUG-706 / DEBUG-711 harness. Maestro
 * cannot reach this race: e2e seeding starts past onboarding.
 */
import { CommonActions, StackRouter, type StackNavigationState } from '@react-navigation/routers';
import { readFileSync } from 'fs';
import { join } from 'path';
import { isCrisisDestinationFocused } from '@/core/navigation/crisisDestinationGuard';
import { logError, logSystem } from '@/core/services/logging';

jest.mock('@/core/services/logging', () => ({
  ...jest.requireActual('@/core/services/logging'),
  logSystem: jest.fn(),
  logError: jest.fn(),
}));

type State = StackNavigationState<Record<string, object | undefined>>;
type Action = { type: string; payload?: unknown; source?: string; target?: string };

const ROUTE_NAMES = ['LegalGate', 'Onboarding', 'Main', 'CrisisResources', 'ReConsent'];

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
  const dispatch = jest.fn((action: Action) => apply(action));
  return {
    names: () => state.routes.map((r) => r.name),
    keyOf: (name: string) => state.routes.find((r) => r.name === name)?.key,
    focused: () => state.routes[state.index]?.name,
    /** What the Onboarding screen's own `navigation` does: stamps `source`, never `target`. */
    screen: (routeKey: string) => ({
      replace: (name: string) => apply({ type: 'REPLACE', payload: { name }, source: routeKey }),
    }),
    /** The root the fix dispatches through (navigationRef's shape). */
    root: { getRootState: () => state, dispatch },
    dispatch,
    open: (name: string) => apply(CommonActions.navigate(name)),
    openCrisis: () => apply(CommonActions.navigate('CrisisResources')),
    popFocused: () => apply({ ...CommonActions.goBack(), source: state.routes[state.index]!.key }),
    reset: (names: string[]) =>
      apply(CommonActions.reset({ index: names.length - 1, routes: names.map((name) => ({ name })) })),
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

type Stack = ReturnType<typeof rootStack>;

/**
 * Required lazily so the control case runs — and shows the defect — on a tree where
 * the module does not exist yet.
 */
function reask(stack: Stack, onboardingRouteKey = stack.keyOf('Onboarding')!): void {
  const { returnToLegalGate } =
    require('@/core/navigation/returnToLegalGate') as typeof import('@/core/navigation/returnToLegalGate');
  returnToLegalGate({
    onboardingRouteKey,
    root: stack.root as never,
    isCrisisFocused: () => isCrisisDestinationFocused(stack.focused()),
    subscribe: stack.subscribe,
  });
}

/** The re-ask decided after an await the test releases, so a crisis screen can open mid-await. */
function startReaskBehindGate(stack: Stack) {
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => (release = r));
  const onboardingRouteKey = stack.keyOf('Onboarding')!;
  const done = (async () => {
    await gate; // the consent reads / grant handlePrivacyContinue awaits
    reask(stack, onboardingRouteKey);
  })();
  return {
    finish: async () => {
      release();
      await done;
    },
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('(a) control — the bare replace this item removes', () => {
  it('replaces CrisisResources instead of Onboarding', () => {
    const stack = rootStack();
    const onboarding = stack.screen(stack.keyOf('Onboarding')!);
    stack.openCrisis();

    onboarding.replace('LegalGate'); // bare replace: acts on the focused route

    expect(stack.names()).not.toContain('CrisisResources');
    expect(stack.names()).toEqual(['Onboarding', 'LegalGate']);
  });
});

describe('a crisis screen opened while the re-ask is pending', () => {
  it('(b) stays focused, with its key, and LegalGate is not mounted while it is', async () => {
    const stack = rootStack();
    const r = startReaskBehindGate(stack);
    stack.openCrisis();
    const crisisKey = stack.keyOf('CrisisResources');

    await r.finish();
    jest.advanceTimersByTime(1000);

    expect(stack.names()).toEqual(['Onboarding', 'CrisisResources']);
    expect(stack.focused()).toBe('CrisisResources');
    expect(stack.keyOf('CrisisResources')).toBe(crisisKey);
    expect(stack.names()).not.toContain('LegalGate');
    expect(stack.dispatch).not.toHaveBeenCalled();
  });

  it('(c) once the user leaves it, the deferred re-ask runs exactly once — never dropped, never repeated', async () => {
    const stack = rootStack();
    const r = startReaskBehindGate(stack);
    stack.openCrisis();
    await r.finish();

    stack.popFocused();

    expect(stack.names()).toEqual(['LegalGate']);
    expect(stack.dispatch).toHaveBeenCalledTimes(1);

    // Later root state events do not re-run it.
    stack.openCrisis();
    stack.popFocused();
    stack.open('ReConsent');
    expect(stack.dispatch).toHaveBeenCalledTimes(1);
    expect(stack.names()).toEqual(['LegalGate', 'ReConsent']);
  });
});

describe('(d) with no crisis screen open', () => {
  it('replaces Onboarding with LegalGate immediately, with no timer', () => {
    const stack = rootStack();

    reask(stack);

    expect(stack.names()).toEqual(['LegalGate']);
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('(e) the stack it was meant for is gone', () => {
  it('drops the deferred re-ask with a log when Onboarding was removed meanwhile — no redirect', async () => {
    const stack = rootStack();
    const r = startReaskBehindGate(stack);
    stack.openCrisis();
    await r.finish();

    stack.reset(['Main', 'CrisisResources']); // Onboarding removed while deferred
    stack.popFocused();

    expect(stack.names()).toEqual(['Main']);
    expect(stack.dispatch).not.toHaveBeenCalled();
    expect(logSystem).toHaveBeenCalledWith(expect.stringContaining('Onboarding route is gone'));
  });
});

describe('(f) it replaces Onboarding by key, whatever is focused', () => {
  it('a focused ReConsent (not a crisis destination) is left alone; Onboarding beneath it becomes LegalGate', () => {
    const stack = rootStack();
    stack.open('ReConsent');

    reask(stack);

    // A source-only replace acts on the FOCUSED route and would have replaced ReConsent.
    expect(stack.names()).toEqual(['LegalGate', 'ReConsent']);
  });
});

describe('(g) the fix never blocks a crisis destination', () => {
  it('opening CrisisResources again after the deferred re-ask ran still focuses it', async () => {
    const stack = rootStack();
    const r = startReaskBehindGate(stack);
    stack.openCrisis();
    await r.finish();

    stack.popFocused(); // deferred re-ask runs
    stack.openCrisis(); // and the crisis screen opens over the gate, unguarded

    expect(stack.focused()).toBe('CrisisResources');
    expect(stack.names()).toEqual(['LegalGate', 'CrisisResources']);
  });

  it('the paths INTO the crisis screen do not import the guard or the re-ask', () => {
    const src = (p: string) => readFileSync(join(__dirname, '../../src', p), 'utf8');
    for (const p of ['features/crisis/utils/navigateToCrisisResources.ts', 'features/crisis/components/RootCrisisButton.tsx']) {
      expect(src(p)).not.toMatch(/crisisDestinationGuard|returnToLegalGate/);
    }
  });
});

describe('nothing from the re-ask path can throw back into handlePrivacyContinue', () => {
  it('a navigation that throws is logged and swallowed, never rethrown into the caller', () => {
    const stack = rootStack();
    stack.dispatch.mockImplementation(() => {
      throw new Error('navigator unavailable');
    });

    expect(() => reask(stack)).not.toThrow();
    expect(logError).toHaveBeenCalled();
    expect(stack.names()).toEqual(['Onboarding']);
  });
});

describe('wiring', () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const read = (p: string) => strip(readFileSync(join(__dirname, '../../src', p), 'utf8'));

  const block = (source: string, start: string, end: string): string => {
    const a = source.indexOf(start);
    const b = source.indexOf(end, a);
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
    return source.slice(a, b);
  };

  const handler = () =>
    block(read('features/onboarding/screens/OnboardingScreen.tsx'), 'const handlePrivacyContinue', 'const renderPrivacy');

  it('the slice is the consent handler (guards the pins below against an empty or wrong slice)', () => {
    const h = handler();
    expect(h).toMatch(/getStoredAgeVerification\s*\(/);
    expect(h).toMatch(/grantConsent\s*\(/);
    expect(h).toMatch(/catch\s*\(/);
  });

  it('handlePrivacyContinue has no bare replace: all three re-asks go through onReturnToLegalGate and return', () => {
    const h = handler();
    expect(h).not.toMatch(/navigation\.replace\s*\(/);
    expect(h.match(/onReturnToLegalGate\s*\(\s*\)\s*;\s*return\s*;/g)).toHaveLength(3);
    expect(h.match(/onReturnToLegalGate\s*\(/g)).toHaveLength(3);
  });

  it('the fail-closed decision is logged synchronously, before the re-ask is scheduled', () => {
    const h = handler();
    const decision = h.indexOf("'returned-to-legal-gate'");
    const firstReask = h.search(/onReturnToLegalGate\s*\(/);
    expect(decision).toBeGreaterThan(-1);
    expect(firstReask).toBeGreaterThan(decision);
  });

  it('onReturnToLegalGate is a REQUIRED prop of OnboardingScreen', () => {
    const props = block(read('features/onboarding/screens/OnboardingScreen.tsx'), 'interface OnboardingScreenProps', '}');
    expect(props).toMatch(/onReturnToLegalGate\s*:\s*\(\s*\)\s*=>\s*void/);
  });

  it("CleanRootNavigator's Onboarding render prop wires it to returnToLegalGate with this route's key", () => {
    const nav = read('core/navigation/CleanRootNavigator.tsx');
    expect(nav).toMatch(/import\s*\{\s*returnToLegalGate\s*\}\s*from\s*'\.\/returnToLegalGate'/);
    const onboarding = block(nav, 'name="Onboarding"', '</Stack.Screen>');
    expect(onboarding).toMatch(
      /onReturnToLegalGate\s*=\s*\{\s*\(\s*\)\s*=>\s*returnToLegalGate\s*\(\s*\{\s*onboardingRouteKey:\s*route\.key\s*,?\s*\}\s*\)\s*\}/,
    );
  });

  it('returnToLegalGate reaches crisis focus only through the existing guard, with no timer or AppState branch', () => {
    const src = read('core/navigation/returnToLegalGate.ts');
    expect(src).toMatch(/runWhenNoCrisisDestinationFocused\s*\(/);
    expect(src).toMatch(/StackActions\.replace\s*\(\s*'LegalGate'\s*\)/);
    expect(src).toMatch(/target:\s*\w+\.key/);
    expect(src).not.toMatch(/[A-Z0-9_]+_ROUTES/);
    expect(src).not.toMatch(/setTimeout|AppState|AccessibilityInfo|announce/);
  });
});
