/**
 * The crisis screen survives a consent route dismissing itself (DEBUG-733).
 *
 * ReConsent and ConsentBlocked are transparent modals over Main. Both used to
 * dismiss with a bare `navigation.goBack()`, which StackRouter applies to the
 * FOCUSED route: if the user opened CrisisResources over the modal before the
 * dismissal ran (after an await, or from an effect), CrisisResources was what
 * got popped. Crisis ruling (DEBUG-706): a route that dismisses itself removes
 * ITSELF by key; navigation into a crisis destination is never guarded.
 *
 * Router-level on the REAL StackRouter (a jest NavigationContainer is not
 * supported here); the wiring half pins CleanRootNavigator's two dismissals.
 */
import { CommonActions, StackRouter, type StackNavigationState } from '@react-navigation/routers';
import { readFileSync } from 'fs';
import { join } from 'path';
import { removeOwnRoute } from '@/core/navigation/crisisDestinationGuard';

type State = StackNavigationState<Record<string, object | undefined>>;
type Action = { type: string; payload?: unknown; source?: string; target?: string };

const ROUTE_NAMES = ['Main', 'ReConsent', 'ConsentBlocked', 'CrisisResources'];

/** A root stack driven by the real router, with the navigation shape a screen receives. */
function rootStack() {
  const router = StackRouter({ initialRouteName: 'Main' });
  const options = { routeNames: ROUTE_NAMES, routeParamList: {}, routeGetIdList: {} };
  let state = router.getInitialState(options) as State;

  const apply = (action: Action) => {
    const next = router.getStateForAction(state, action as never, options);
    if (next && next !== state) state = next as State;
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
    names: () => state.routes.map((r) => r.name),
    focused: () => state.routes[state.index]?.name,
    popCrisis: () => apply({ ...CommonActions.goBack(), source: state.routes[state.index]!.key }),
  };
}

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe.each(['ReConsent', 'ConsentBlocked'])('the crisis screen survives %s dismissing itself (DEBUG-733)', (X) => {
  /** Main -> X, ready for a dismissal that targets X by key. */
  const openOverMain = () => {
    const stack = rootStack();
    const mainKey = stack.keyOf('Main')!;
    stack.navigate(X);
    const ownKey = stack.keyOf(X)!;
    const dismiss = () => removeOwnRoute(stack.navigationFor(ownKey), ownKey);
    const openCrisis = () => stack.navigate('CrisisResources');
    return { stack, mainKey, ownKey, dismiss, openCrisis };
  };

  it('(a) control — a bare goBack pops CrisisResources and leaves the modal mounted', () => {
    const { stack, ownKey, openCrisis } = openOverMain();
    openCrisis();

    stack.navigationFor(ownKey).goBack(); // the dismissal this item replaces

    expect(stack.names()).toEqual(['Main', X]);
    expect(stack.focused()).toBe(X);
  });

  it('(b) async path — dismissal after an await, CrisisResources opened meanwhile', async () => {
    const { stack, ownKey, dismiss, openCrisis } = openOverMain();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const task = (async () => {
      await gate;
      dismiss();
    })();

    openCrisis();
    const crisisKey = stack.keyOf('CrisisResources');
    release();
    await task;
    await flush();

    expect(stack.names()).toEqual(['Main', 'CrisisResources']);
    expect(stack.focused()).toBe('CrisisResources');
    expect(stack.keyOf('CrisisResources')).toBe(crisisKey);
    expect(stack.keyOf(X)).toBeUndefined();
    expect(ownKey).toBeDefined();
  });

  it('(c) sync/effect path — CrisisResources already focused above the modal', () => {
    const { stack, dismiss, openCrisis } = openOverMain();
    openCrisis();
    const crisisKey = stack.keyOf('CrisisResources');

    dismiss();

    expect(stack.names()).toEqual(['Main', 'CrisisResources']);
    expect(stack.focused()).toBe('CrisisResources');
    expect(stack.keyOf('CrisisResources')).toBe(crisisKey);
  });

  it('(d) a second dismissal is a no-op and CrisisResources stays focused', () => {
    const { stack, dismiss, openCrisis } = openOverMain();
    openCrisis();
    const crisisKey = stack.keyOf('CrisisResources');

    dismiss();
    const after = stack.state;
    dismiss();

    expect(stack.state).toEqual(after);
    expect(stack.focused()).toBe('CrisisResources');
    expect(stack.keyOf('CrisisResources')).toBe(crisisKey);
  });

  it("(e) leaving CrisisResources afterwards lands on Main with Main's original key", () => {
    const { stack, mainKey, dismiss, openCrisis } = openOverMain();
    openCrisis();
    dismiss();

    stack.popCrisis();

    expect(stack.names()).toEqual(['Main']);
    expect(stack.keyOf('Main')).toBe(mainKey);
  });

  it('(f) with no crisis screen open, the dismissal returns to Main', () => {
    const { stack, mainKey, dismiss } = openOverMain();

    dismiss();

    expect(stack.names()).toEqual(['Main']);
    expect(stack.keyOf('Main')).toBe(mainKey);
  });

  it('(g) entry into CrisisResources stays unguarded after a dismissal', () => {
    const { stack, dismiss, openCrisis } = openOverMain();

    dismiss();
    openCrisis();

    expect(stack.names()).toEqual(['Main', 'CrisisResources']);
    expect(stack.focused()).toBe('CrisisResources');
  });

  describe('CleanRootNavigator wiring', () => {
    /** The screen block, comments stripped (DEBUG-390: prose may name the anti-pattern). */
    const screenBlock = (): string => {
      const source = readFileSync(join(__dirname, '../../src/core/navigation/CleanRootNavigator.tsx'), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      const start = source.indexOf(`name="${X}"`);
      const end = source.indexOf('</Stack.Screen>', start);
      expect(start).toBeGreaterThan(-1);
      expect(end).toBeGreaterThan(start);
      return source.slice(start, end);
    };

    it('(h) dismisses by its own route key and never with a bare goBack()', () => {
      const block = screenBlock();
      expect(block).toContain(`name="${X}"`);
      expect(block.length).toBeGreaterThan(`name="${X}"`.length);
      expect(block).toMatch(/removeOwnRoute\s*\(\s*navigation\s*,\s*route\.key\s*\)/);
      expect(block).not.toMatch(/\.goBack\s*\(/);
    });
  });
});
