/**
 * The crisis screen survives onboarding PHQ-9 completion (DEBUG-706).
 *
 * The in-flow crisis button stays tappable while the last PHQ-9 answer saves.
 * If the user opens CrisisResources in that window, the completion used to run
 * a bare `navigation.goBack()` — which StackRouter applies to the FOCUSED route,
 * popping CrisisResources — and the parent's GAD-7 navigate then landed on the
 * still-mounted PHQ-9 route and re-paramed it. The user was moved out of the
 * crisis screen into another questionnaire at the moment they reached for help.
 *
 * Crisis ruling (shared with DEBUG-703 / DEBUG-711, recorded on DEBUG-706):
 * removal targets its own route by key; the forward callback is DEFERRED while
 * a crisis destination is focused — never dropped, never redirected — and GAD-7
 * then opens as a fresh route.
 *
 * Router-level on the REAL StackRouter (pure JS, not mocked): a jest
 * NavigationContainer is not supported here, and the router is where both
 * halves of the defect live. Maestro cannot reach this race — the q9 / phq9 /
 * gad7 flows start from seeded Home, past onboarding.
 */
import { CommonActions, StackRouter, type StackNavigationState } from '@react-navigation/routers';
import { readFileSync } from 'fs';
import { join } from 'path';
import { dismissRouteThenNotify, isCrisisDestinationFocused } from '@/core/navigation/crisisDestinationGuard';

type State = StackNavigationState<Record<string, object | undefined>>;
type Action = { type: string; payload?: unknown; source?: string; target?: string };

const ROUTE_NAMES = ['Onboarding', 'AssessmentFlow', 'CrisisResources'];

/** A root stack driven by the real router, with the navigation shape a screen receives. */
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
  /** What `navigation` gives the screen at `routeKey`: it stamps `source`, never `target`. */
  const navigationFor = (routeKey: string) => ({
    dispatch: (action: Action) => apply({ source: routeKey, ...action }),
    getState: () => state,
    navigate: (name: string, params?: object) => apply({ ...CommonActions.navigate(name, params), source: routeKey }),
    goBack: () => apply({ ...CommonActions.goBack(), source: routeKey }),
  });
  return {
    get state() {
      return state;
    },
    navigationFor,
    navigate: (name: string, params?: object) => apply(CommonActions.navigate(name, params)),
    keyOf: (name: string) => state.routes.find((r) => r.name === name)?.key,
    focused: () => state.routes[state.index]?.name,
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    popCrisis: () => apply({ ...CommonActions.goBack(), source: state.routes[state.index]!.key }),
    /** A container-level reset (the router alone does not handle RESET). */
    resetTo: (names: string[]) => {
      state = router.getRehydratedState({ routes: names.map((name) => ({ name })) } as never, options) as State;
      listeners.forEach((l) => l());
    },
  };
}

/** Onboarding → PHQ-9 AssessmentFlow, then the user opens CrisisResources mid-save. */
function crisisOpenedDuringPhq9() {
  const stack = rootStack();
  stack.navigate('AssessmentFlow', { assessmentType: 'phq9', context: 'onboarding' });
  const phq9Key = stack.keyOf('AssessmentFlow')!;
  stack.navigate('CrisisResources');
  const crisisKey = stack.keyOf('CrisisResources')!;
  // The parent's follow-on: what OnboardingScreen does after PHQ-9 completes.
  const onboarding = stack.navigationFor(stack.keyOf('Onboarding')!);
  const startGad7 = jest.fn(() => onboarding.navigate('AssessmentFlow', { assessmentType: 'gad7', context: 'onboarding' }));
  return { stack, phq9Key, crisisKey, startGad7 };
}

const complete = (stack: ReturnType<typeof rootStack>, routeKey: string, notify: () => void) =>
  dismissRouteThenNotify({
    navigation: stack.navigationFor(routeKey),
    routeKey,
    notify,
    isCrisisFocused: () => isCrisisDestinationFocused(stack.focused()),
    subscribe: stack.subscribe,
  });

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('the crisis screen survives onboarding PHQ-9 completion (DEBUG-706)', () => {
  it('control — the old completion pops CrisisResources and re-params the PHQ-9 route', () => {
    const { stack, phq9Key, startGad7 } = crisisOpenedDuringPhq9();

    stack.navigationFor(phq9Key).goBack(); // the bare goBack this item replaces
    startGad7();

    expect(stack.focused()).toBe('AssessmentFlow');
    expect(stack.state.routes.map((r) => r.name)).not.toContain('CrisisResources');
    const focused = stack.state.routes[stack.state.index]!;
    expect(focused.key).toBe(phq9Key); // GAD-7 landed ON the still-mounted PHQ-9 route
    expect(focused.params).toMatchObject({ assessmentType: 'gad7' });
  });

  it('keeps CrisisResources focused, with its key, and holds GAD-7 while it is open', () => {
    const { stack, phq9Key, crisisKey, startGad7 } = crisisOpenedDuringPhq9();

    complete(stack, phq9Key, startGad7);
    jest.advanceTimersByTime(1000);

    expect(stack.state.routes.map((r) => r.name)).toEqual(['Onboarding', 'CrisisResources']);
    expect(stack.focused()).toBe('CrisisResources');
    expect(stack.keyOf('CrisisResources')).toBe(crisisKey);
    expect(startGad7).not.toHaveBeenCalled();
  });

  it('opens GAD-7 as a fresh route once the user leaves CrisisResources — never dropped', () => {
    const { stack, phq9Key, startGad7 } = crisisOpenedDuringPhq9();
    complete(stack, phq9Key, startGad7);
    jest.advanceTimersByTime(100);

    stack.popCrisis();

    expect(startGad7).toHaveBeenCalledTimes(1);
    expect(stack.focused()).toBe('AssessmentFlow');
    const gad7 = stack.state.routes[stack.state.index]!;
    expect(gad7.key).not.toBe(phq9Key);
    expect(gad7.params).toMatchObject({ assessmentType: 'gad7' });
  });

  it('with no crisis screen open, behaves as before: dismiss, then notify after the delay', () => {
    const stack = rootStack();
    stack.navigate('AssessmentFlow', { assessmentType: 'phq9', context: 'onboarding' });
    const phq9Key = stack.keyOf('AssessmentFlow')!;
    const notify = jest.fn();

    complete(stack, phq9Key, notify);
    expect(stack.state.routes.map((r) => r.name)).toEqual(['Onboarding']);
    expect(notify).not.toHaveBeenCalled();
    jest.advanceTimersByTime(50);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('drops the callback with a log if the route beneath is gone, rather than pushing onto another stack', () => {
    const { stack, phq9Key, startGad7 } = crisisOpenedDuringPhq9();
    complete(stack, phq9Key, startGad7);
    jest.advanceTimersByTime(100);

    // Something reset the stack while the crisis screen was open (e.g. account deletion).
    stack.resetTo(['Onboarding', 'CrisisResources']);
    stack.popCrisis();

    expect(stack.state.routes.map((r) => r.name)).toEqual(['Onboarding']);
    expect(startGad7).not.toHaveBeenCalled();
  });

  it('the crisis-surface set is the existing destination set, nothing wider', () => {
    expect(isCrisisDestinationFocused('CrisisResources')).toBe(true);
    for (const route of ['AssessmentFlow', 'LegalGate', 'Onboarding', undefined]) {
      expect(isCrisisDestinationFocused(route)).toBe(false);
    }
  });
});

describe('an onboarding exit-skip survives a focused crisis screen (DEBUG-771)', () => {
  /*
   * Crisis ruling R5 on DEBUG-771: the new questions-phase Exit makes onCancel reachable
   * mid-screening. In onboarding it runs the parent's onSkip, which opens the next
   * screening — forward navigation after a user action, the same shape as DEBUG-706's
   * completion. It goes through the same guard, so it is deferred, never dropped, while a
   * crisis destination is focused.
   */
  it('holds onSkip while CrisisResources is focused, keeping its key', () => {
    const { stack, phq9Key, crisisKey, startGad7: onSkip } = crisisOpenedDuringPhq9();

    complete(stack, phq9Key, onSkip);
    jest.advanceTimersByTime(1000);

    expect(stack.state.routes.map((r) => r.name)).toEqual(['Onboarding', 'CrisisResources']);
    expect(stack.keyOf('CrisisResources')).toBe(crisisKey);
    expect(onSkip).not.toHaveBeenCalled();
  });

  it('runs onSkip exactly once after the user leaves CrisisResources — never dropped', () => {
    const { stack, phq9Key, startGad7: onSkip } = crisisOpenedDuringPhq9();
    complete(stack, phq9Key, onSkip);
    jest.advanceTimersByTime(100);

    stack.popCrisis();
    jest.advanceTimersByTime(1000);

    expect(onSkip).toHaveBeenCalledTimes(1);
    const next = stack.state.routes[stack.state.index]!;
    expect(next.key).not.toBe(phq9Key);
  });
});

describe('CleanRootNavigator wiring (DEBUG-706)', () => {
  /** The AssessmentFlow screen block, comments stripped (DEBUG-390: prose may name the anti-pattern). */
  const assessmentFlowBlock = (): string => {
    const source = readFileSync(join(__dirname, '../../src/core/navigation/CleanRootNavigator.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    const start = source.indexOf('name="AssessmentFlow"');
    const end = source.indexOf('</Stack.Screen>', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return source.slice(start, end);
  };

  it('completes through the guard and never with a bare goBack()', () => {
    const block = assessmentFlowBlock();
    expect(block).toMatch(/dismissRouteThenNotify\s*\(/);
    expect(block).toMatch(/removeOwnRoute\s*\(/);
    expect(block).not.toMatch(/navigation\.goBack\s*\(/);
  });

  /** onCancel's handler, from its prop to the end of the screen block. */
  const onCancelHandler = (): string => {
    const block = assessmentFlowBlock();
    const start = block.indexOf('onCancel={');
    expect(start).toBeGreaterThan(-1);
    return block.slice(start);
  };
  const DIRECT_SKIP = /onSkip\s*\(/;
  const GUARDED_SKIP = /dismissRouteThenNotify\s*\(\s*\{[^}]*notify:\s*route\.params\.onSkip\b[^}]*\}\s*\)/;

  it('DEBUG-771 matcher self-check: the direct call fires, the guarded form matches', () => {
    expect('route.params.onSkip();').toMatch(DIRECT_SKIP);
    expect('dismissRouteThenNotify({ navigation, routeKey: route.key, notify: route.params.onSkip });').toMatch(
      GUARDED_SKIP,
    );
    expect('dismissRouteThenNotify({ navigation, routeKey: route.key, notify: route.params.onSkip });').not.toMatch(
      DIRECT_SKIP,
    );
  });

  it('DEBUG-771: onCancel reaches onSkip only through dismissRouteThenNotify, and still removes its own route', () => {
    const handler = onCancelHandler();
    expect(handler.length).toBeGreaterThan(60);
    expect(handler).toMatch(GUARDED_SKIP);
    expect(handler).not.toMatch(DIRECT_SKIP);
    expect(handler).toMatch(/removeOwnRoute\s*\(\s*navigation\s*,\s*route\.key\s*\)/);
    expect(handler).not.toMatch(/navigation\.goBack\s*\(/);
  });
});
