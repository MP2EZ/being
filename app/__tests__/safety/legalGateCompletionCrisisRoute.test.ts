/**
 * The crisis screen survives the legal gate's completion (DEBUG-735).
 *
 * CombinedLegalGateScreen awaits verifyAge and recordLegalGateConsents before it calls
 * onComplete. A runtime `being://crisis` link is consent-exempt, so CrisisResources can
 * be pushed above LegalGate during those awaits. onComplete was a bare
 * `navigation.replace('Onboarding')` — StackRouter applies that to the FOCUSED route,
 * so CrisisResources was what got replaced.
 *
 * Crisis ruling (DEBUG-706's, shared with DEBUG-711 / DEBUG-734): defer the whole
 * navigation while a crisis destination is focused — never dropped, never redirected —
 * and replace LegalGate by key at the root. Compliance ruling: the persistence writes
 * stay in the screen and are awaited before onComplete; only the route change is
 * deferred.
 *
 * Router-level on the REAL StackRouter, the DEBUG-706 / DEBUG-711 / DEBUG-734 harness.
 * Maestro cannot reach this race: no flow can deliver a runtime link inside the await.
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
  const router = StackRouter({ initialRouteName: 'LegalGate' });
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
    /** What the LegalGate screen's own `navigation` does: stamps `source`, never `target`. */
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
function complete(stack: Stack, legalGateRouteKey = stack.keyOf('LegalGate')!): void {
  const { completeLegalGate } =
    require('@/core/navigation/completeLegalGate') as typeof import('@/core/navigation/completeLegalGate');
  completeLegalGate({
    legalGateRouteKey,
    root: stack.root as never,
    isCrisisFocused: () => isCrisisDestinationFocused(stack.focused()),
    subscribe: stack.subscribe,
  });
}

/** onComplete called after an await the test releases, so a crisis screen can open mid-await. */
function startCompletionBehindGate(stack: Stack) {
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => (release = r));
  const legalGateRouteKey = stack.keyOf('LegalGate')!;
  const done = (async () => {
    await gate; // verifyAge + recordLegalGateConsents
    complete(stack, legalGateRouteKey);
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
  it('replaces CrisisResources instead of LegalGate', () => {
    const stack = rootStack();
    const gate = stack.screen(stack.keyOf('LegalGate')!);
    stack.openCrisis();

    gate.replace('Onboarding'); // bare replace: acts on the focused route

    expect(stack.names()).not.toContain('CrisisResources');
    expect(stack.names()).toEqual(['LegalGate', 'Onboarding']);
  });
});

describe('a crisis screen opened while the gate is saving', () => {
  it('(b) stays focused, with its key, and Onboarding is not mounted while it is', async () => {
    const stack = rootStack();
    const r = startCompletionBehindGate(stack);
    stack.openCrisis();
    const crisisKey = stack.keyOf('CrisisResources');

    await r.finish();
    jest.advanceTimersByTime(1000);

    expect(stack.names()).toEqual(['LegalGate', 'CrisisResources']);
    expect(stack.focused()).toBe('CrisisResources');
    expect(stack.keyOf('CrisisResources')).toBe(crisisKey);
    expect(stack.names()).not.toContain('Onboarding');
    expect(stack.dispatch).not.toHaveBeenCalled();
  });

  it('(c) once the user leaves it, the deferred replace runs exactly once — never dropped, never repeated', async () => {
    const stack = rootStack();
    const r = startCompletionBehindGate(stack);
    stack.openCrisis();
    await r.finish();

    stack.popFocused();

    expect(stack.names()).toEqual(['Onboarding']);
    expect(stack.focused()).toBe('Onboarding');
    expect(stack.dispatch).toHaveBeenCalledTimes(1);

    // Later root state events do not re-run it.
    stack.openCrisis();
    stack.popFocused();
    stack.open('ReConsent');
    expect(stack.dispatch).toHaveBeenCalledTimes(1);
    expect(stack.names()).toEqual(['Onboarding', 'ReConsent']);
  });

  it('a second onComplete while deferred still yields exactly one Onboarding', async () => {
    const stack = rootStack();
    const legalGateRouteKey = stack.keyOf('LegalGate')!;
    stack.openCrisis();
    complete(stack, legalGateRouteKey);
    complete(stack, legalGateRouteKey);

    stack.popFocused();

    expect(stack.names()).toEqual(['Onboarding']);
    expect(logSystem).toHaveBeenCalledWith(expect.stringContaining('LegalGate route is gone'));
  });
});

describe('(d) with no crisis screen open', () => {
  it('replaces LegalGate with Onboarding immediately, with no timer', () => {
    const stack = rootStack();

    complete(stack);

    expect(stack.names()).toEqual(['Onboarding']);
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('(e) the stack it was meant for is gone', () => {
  it('drops the deferred replace with a log when LegalGate was removed meanwhile — no redirect', async () => {
    const stack = rootStack();
    const r = startCompletionBehindGate(stack);
    stack.openCrisis();
    await r.finish();

    stack.reset(['Main', 'CrisisResources']); // LegalGate removed while deferred
    stack.popFocused();

    expect(stack.names()).toEqual(['Main']);
    expect(stack.dispatch).not.toHaveBeenCalled();
    expect(logSystem).toHaveBeenCalledWith(expect.stringContaining('LegalGate route is gone'));
  });
});

describe('(f) it replaces LegalGate by key, whatever is focused', () => {
  it('a focused ReConsent (not a crisis destination) is left alone; LegalGate beneath it becomes Onboarding', () => {
    const stack = rootStack();
    stack.open('ReConsent');

    complete(stack);

    // A source-only replace acts on the FOCUSED route and would have replaced ReConsent.
    expect(stack.names()).toEqual(['Onboarding', 'ReConsent']);
  });
});

describe('(g) the fix never blocks a crisis destination', () => {
  it('opening CrisisResources again after the deferred replace ran still focuses it', async () => {
    const stack = rootStack();
    const r = startCompletionBehindGate(stack);
    stack.openCrisis();
    await r.finish();

    stack.popFocused(); // deferred replace runs
    stack.openCrisis(); // and the crisis screen opens over Onboarding, unguarded

    expect(stack.focused()).toBe('CrisisResources');
    expect(stack.names()).toEqual(['Onboarding', 'CrisisResources']);
  });

  it('the paths INTO the crisis screen do not import the guard or the completion', () => {
    const src = (p: string) => readFileSync(join(__dirname, '../../src', p), 'utf8');
    for (const p of ['features/crisis/utils/navigateToCrisisResources.ts', 'features/crisis/components/RootCrisisButton.tsx']) {
      expect(src(p)).not.toMatch(/crisisDestinationGuard|completeLegalGate/);
    }
  });
});

describe('nothing from the completion path can throw back into handleContinue', () => {
  it('a navigation that throws is logged and swallowed, never rethrown into the caller', () => {
    const stack = rootStack();
    stack.dispatch.mockImplementation(() => {
      throw new Error('navigator unavailable');
    });

    expect(() => complete(stack)).not.toThrow();
    expect(logError).toHaveBeenCalled();
    expect(stack.names()).toEqual(['LegalGate']);
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

  const legalGateBlock = () => block(read('core/navigation/CleanRootNavigator.tsx'), 'name="LegalGate"', '</Stack.Screen>');

  it('the slice is the LegalGate screen (guards the pins below against an empty or wrong slice)', () => {
    expect(legalGateBlock()).toMatch(/<CombinedLegalGateScreen/);
    expect(legalGateBlock()).toMatch(/onUnderAge/);
  });

  it("LegalGate's onComplete has no bare replace and wires completeLegalGate with this route's key", () => {
    const nav = read('core/navigation/CleanRootNavigator.tsx');
    expect(nav).toMatch(/import\s*\{\s*completeLegalGate\s*\}\s*from\s*'\.\/completeLegalGate'/);
    const g = legalGateBlock();
    expect(g).not.toMatch(/navigation\.replace\s*\(/);
    expect(g).toMatch(
      /onComplete\s*=\s*\{\s*\(\s*\)\s*=>\s*completeLegalGate\s*\(\s*\{\s*legalGateRouteKey:\s*route\.key\s*,?\s*\}\s*\)\s*\}/,
    );
  });

  it('completeLegalGate reaches crisis focus only through the existing guard, with no timer or AppState branch', () => {
    const src = read('core/navigation/completeLegalGate.ts');
    expect(src).toMatch(/runWhenNoCrisisDestinationFocused\s*\(/);
    expect(src).toMatch(/StackActions\.replace\s*\(\s*'Onboarding'\s*\)/);
    expect(src).toMatch(/target:\s*\w+\.key/);
    expect(src).not.toMatch(/[A-Z0-9_]+_ROUTES/);
    expect(src).not.toMatch(/setTimeout|AppState|AccessibilityInfo|announce/);
  });

  it('CombinedLegalGateScreen still persists before onComplete (the fix must not move the writes)', () => {
    const screen = read('features/consent/screens/CombinedLegalGateScreen.tsx');
    const verify = screen.search(/await\s+verifyAge\s*\(/);
    const record = screen.search(/await\s+recordLegalGateConsents\s*\(/);
    const done = screen.search(/onComplete\s*\(\s*\)/);
    expect(verify).toBeGreaterThan(-1);
    expect(record).toBeGreaterThan(verify);
    expect(done).toBeGreaterThan(record);
  });
});
