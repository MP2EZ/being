/**
 * runWhenNoCrisisDestinationFocused (DEBUG-703, under DEBUG-706's crisis ruling).
 *
 * The forward half of the ruling for work that finishes after an await: run now
 * when no crisis destination is focused; otherwise wait for the first navigation
 * state in which none is, run exactly once, and stop listening. Never dropped,
 * never redirected, no timer — so an app backgrounded during a 988 call changes
 * nothing.
 */
import { runWhenNoCrisisDestinationFocused } from '@/core/navigation/crisisDestinationGuard';

/** A stand-in for navigationRef's 'state' event, with the focused root route as data. */
function fakeNavigation(initialFocus: string) {
  let focused = initialFocus;
  const listeners = new Set<() => void>();
  const subscribe = jest.fn((listener: () => void) => {
    listeners.add(listener);
    return jest.fn(() => {
      listeners.delete(listener);
    });
  });
  return {
    subscribe,
    isCrisisFocused: () => focused === 'CrisisResources',
    listenerCount: () => listeners.size,
    /** A navigation state change: the container emits 'state' to every listener. */
    focus: (route: string) => {
      focused = route;
      [...listeners].forEach((l) => l());
    },
  };
}

describe('runWhenNoCrisisDestinationFocused (DEBUG-703)', () => {
  it('runs synchronously, without subscribing, when no crisis destination is focused', () => {
    const nav = fakeNavigation('Main');
    const run = jest.fn();

    runWhenNoCrisisDestinationFocused(run, nav);

    expect(run).toHaveBeenCalledTimes(1);
    expect(nav.subscribe).not.toHaveBeenCalled();
  });

  it('defers while a crisis destination is focused', () => {
    const nav = fakeNavigation('CrisisResources');
    const run = jest.fn();

    runWhenNoCrisisDestinationFocused(run, nav);

    expect(run).not.toHaveBeenCalled();
    expect(nav.listenerCount()).toBe(1);
    // A state change that keeps the crisis screen focused (e.g. a param update) is not a release.
    nav.focus('CrisisResources');
    expect(run).not.toHaveBeenCalled();
  });

  it('runs on the first state with no crisis destination focused — never dropped', () => {
    const nav = fakeNavigation('CrisisResources');
    const run = jest.fn();
    runWhenNoCrisisDestinationFocused(run, nav);

    nav.focus('Main');

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('runs exactly once and unsubscribes, however many states follow', () => {
    const nav = fakeNavigation('CrisisResources');
    const run = jest.fn();
    runWhenNoCrisisDestinationFocused(run, nav);

    nav.focus('Main');
    nav.focus('CrisisResources');
    nav.focus('Onboarding');

    expect(run).toHaveBeenCalledTimes(1);
    expect(nav.listenerCount()).toBe(0);
    const unsubscribe = nav.subscribe.mock.results[0]!.value as jest.Mock;
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('still unsubscribes if the source emits synchronously during subscribe', () => {
    let focused = 'CrisisResources';
    const unsubscribe = jest.fn();
    const run = jest.fn();
    runWhenNoCrisisDestinationFocused(run, {
      isCrisisFocused: () => focused === 'CrisisResources',
      subscribe: (listener) => {
        focused = 'Main';
        listener();
        return unsubscribe;
      },
    });

    expect(run).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('uses no timer: nothing runs on the clock, only on a navigation state', () => {
    jest.useFakeTimers();
    try {
      const nav = fakeNavigation('CrisisResources');
      const run = jest.fn();
      runWhenNoCrisisDestinationFocused(run, nav);

      expect(jest.getTimerCount()).toBe(0);
      jest.advanceTimersByTime(60 * 60 * 1000); // an hour on a 988 call
      expect(run).not.toHaveBeenCalled();

      nav.focus('Main');
      expect(run).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('defaults to the real predicate and the root navigationRef state event', () => {
    // With no container mounted, navigationRef is not ready → no crisis destination is focused.
    const run = jest.fn();
    runWhenNoCrisisDestinationFocused(run);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
