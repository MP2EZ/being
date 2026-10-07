/**
 * DailyLoopNavigator — resume, begin fresh, load failure, completion (MAINT-746, audit TEST-26).
 *
 * Exercises the real navigator in a real NavigationContainer with SessionStorageService
 * spied, never module-mocked, using the shims from DailyLoopNavigator.resumeWellnessNotice
 * (DEBUG-699), whose header explains them. Real timers: the step screens render the real
 * Timer, so the tests take the breath "skip" links rather than fake time through a navigator.
 *
 * What is deliberately NOT asserted here: the crisis button over the resume prompt. In an
 * isolated navigator render it is absent by design — the root overlay paints above the
 * prompt — and that reachability is pinned where the root exists:
 * __tests__/safety/dailyLoopWellnessWriteBlocked.crisisReachability.test.tsx.
 *
 * Framework notes the assertions honour (philosopher review):
 *   - Accepting a resume RE-GROUNDS on Aware Presence's breath, then jumps to the parked
 *     beat. It is the practice, not a toll: nothing here requires re-answering beat 1.
 *   - Depth is never persisted across a fresh start (FEAT-301); begin-fresh re-presents
 *     the neutral picker.
 *   - Mode is the clock's tense. The resume fixture's saved mode matches the mocked clock,
 *     so this suite neither endorses nor forbids a cross-band resume; begin-fresh uses a
 *     saved mode that DIFFERS from the clock, or "mode resets to the clock" would be vacuous.
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SessionStorageService } from '@/core/services/session/SessionStorageService';
import { seedWellnessWriteConsent } from '../../../../../__tests__/helpers/wellnessWriteConsent';
import DailyLoopNavigator from '../DailyLoopNavigator';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RN = require('react-native');
const actualRN = jest.requireActual('react-native');
Object.assign(RN, {
  InteractionManager: actualRN.InteractionManager,
  I18nManager: actualRN.I18nManager,
  PixelRatio: actualRN.PixelRatio,
});
RN.Linking.addEventListener = jest.fn(() => ({ remove: jest.fn() }));
RN.Vibration = { vibrate: jest.fn() };

jest.mock('use-latest-callback', () => {
  Object.defineProperty(globalThis, 'navigator', {
    value: { ...(globalThis as { navigator?: object }).navigator, product: 'ReactNative' },
    configurable: true,
    writable: true,
  });
  return jest.requireActual('use-latest-callback');
});

jest.mock('@/core/analytics', () => ({
  ...jest.requireActual('@/core/analytics'),
  useAnalytics: () => new Proxy({}, { get: () => jest.fn() }),
}));

// The clock's tense, pinned so "mode resets to the clock" is observable at any hour.
const CLOCK_TENSE = 'evening';
jest.mock('@/core/utils/timeOfDay', () => ({
  ...jest.requireActual('@/core/utils/timeOfDay'),
  getDailyLoopTense: jest.fn(() => 'evening'),
}));

function parkedSession(mode: 'morning' | 'evening') {
  return {
    flowType: 'daily-loop' as const,
    currentScreen: 'SphereSovereignty',
    startedAt: Date.now(),
    lastSavedAt: Date.now(),
    completed: false,
    expiresAt: Date.now() + 3_600_000,
    flowState: { depth: 'deep', mode, sessionData: {} },
  };
}

let load: jest.SpyInstance;
let save: jest.SpyInstance;
let clear: jest.SpyInstance;

beforeEach(() => {
  seedWellnessWriteConsent('granted');
  load = jest.spyOn(SessionStorageService, 'loadSession').mockResolvedValue(null as never);
  save = jest.spyOn(SessionStorageService, 'saveSession').mockResolvedValue(undefined as never);
  clear = jest.spyOn(SessionStorageService, 'clearSession').mockResolvedValue(undefined as never);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  seedWellnessWriteConsent('loading');
});

function mount(props: Partial<React.ComponentProps<typeof DailyLoopNavigator>> = {}) {
  const onComplete = jest.fn();
  const screen = render(
    <NavigationContainer>
      <DailyLoopNavigator onComplete={onComplete} onExit={jest.fn()} {...props} />
    </NavigationContainer>,
  );
  return { screen, onComplete };
}

/** The top of the stack: earlier screens stay mounted, so take the last match. */
const top = (screen: ReturnType<typeof render>, testID: string) => screen.getAllByTestId(testID).at(-1)!;

async function press(screen: ReturnType<typeof render>, testID: string) {
  await act(async () => {
    fireEvent.press(top(screen, testID));
  });
}

/** Take the breath's skip link, then Continue. */
async function passAwarePresence(screen: ReturnType<typeof render>) {
  await waitFor(() => expect(screen.getByTestId('daily-loop-AwarePresence-screen')).toBeTruthy());
  await press(screen, 'daily-loop-skip-breath');
  await press(screen, 'continue-button');
}

describe('resume', () => {
  it('a session parked on Sphere Sovereignty offers the resume prompt', async () => {
    load.mockResolvedValue(parkedSession(CLOCK_TENSE) as never);
    const { screen } = mount();
    await waitFor(() => expect(screen.getByTestId('resume-session-overlay')).toBeTruthy());
    expect(screen.queryByTestId('daily-loop-depth-select-screen')).toBeNull();
  });

  it('accepting re-grounds on Aware Presence, then jumps straight to the parked beat', async () => {
    load.mockResolvedValue(parkedSession(CLOCK_TENSE) as never);
    const { screen } = mount();
    await waitFor(() => expect(screen.getByTestId('resume-session-overlay')).toBeTruthy());
    await press(screen, 'resume-session-button');

    await passAwarePresence(screen);

    // Not beat 2 (Radical Acceptance): the jump-back skips the walk forward.
    await waitFor(() => expect(screen.getByTestId('daily-loop-SphereSovereignty-screen')).toBeTruthy());
    expect(screen.queryByTestId('daily-loop-RadicalAcceptance-screen')).toBeNull();
    expect(save).toHaveBeenLastCalledWith(
      'daily-loop',
      'SphereSovereignty',
      expect.objectContaining({ depth: 'deep', mode: CLOCK_TENSE }),
    );
  });
});

describe('begin fresh', () => {
  it('clears the session, re-presents the depth picker, and takes the clock tense', async () => {
    load.mockResolvedValue(parkedSession('morning') as never); // saved mode differs from the clock
    const { screen } = mount();
    await waitFor(() => expect(screen.getByTestId('resume-session-overlay')).toBeTruthy());
    await press(screen, 'begin-fresh-button');

    expect(clear).toHaveBeenCalledWith('daily-loop');
    // Depth was restored from the session; begin fresh must not keep it.
    await waitFor(() => expect(screen.getByTestId('daily-loop-depth-select-screen')).toBeTruthy());
    expect(screen.queryByTestId('resume-session-overlay')).toBeNull();

    await press(screen, 'daily-loop-depth-deep');
    await passAwarePresence(screen);

    // Beat 2, the normal walk — no stale re-ground target survives a fresh start.
    await waitFor(() => expect(screen.getByTestId('daily-loop-RadicalAcceptance-screen')).toBeTruthy());
    expect(save).toHaveBeenCalledWith(
      'daily-loop',
      'RadicalAcceptance',
      expect.objectContaining({ mode: CLOCK_TENSE, depth: 'deep' }),
    );
    expect(save).not.toHaveBeenCalledWith('daily-loop', expect.anything(), expect.objectContaining({ mode: 'morning' }));
  });
});

describe('load failure', () => {
  it('a session read that rejects still lets the user in, at the depth picker', async () => {
    load.mockRejectedValue(new Error('keychain unavailable') as never);
    const { screen } = mount();
    await waitFor(() => expect(screen.getByTestId('daily-loop-depth-select-screen')).toBeTruthy());
    expect(screen.queryByTestId('resume-session-overlay')).toBeNull();
  });
});

describe('completion', () => {
  it('hands onComplete the full record and clears the session', async () => {
    const { screen, onComplete } = mount({ depth: 'quick' });
    await passAwarePresence(screen);
    // Quick is 1 → 3 → 4.
    await waitFor(() => expect(screen.getByTestId('daily-loop-SphereSovereignty-screen')).toBeTruthy());
    await press(screen, 'continue-button');
    await waitFor(() => expect(screen.getByTestId('daily-loop-VirtuousResponse-screen')).toBeTruthy());
    await press(screen, 'continue-button');
    await waitFor(() => expect(screen.getByTestId('daily-loop-complete-screen')).toBeTruthy());
    await press(screen, 'daily-loop-skip-closing-breath');
    await press(screen, 'daily-loop-done-button');

    expect(onComplete).toHaveBeenCalledTimes(1);
    const record = onComplete.mock.calls[0][0];
    expect(record).toEqual(
      expect.objectContaining({
        mode: CLOCK_TENSE,
        depth: 'quick',
        flowVersion: 'feat-291-daily-loop-v1',
        awarePresence: expect.anything(),
        sphereSovereignty: expect.anything(),
        virtuousResponse: expect.anything(),
        complete: expect.anything(),
      }),
    );
    expect(record.completedAt).toBeInstanceOf(Date);
    expect(typeof record.timeSpentSeconds).toBe('number');
    expect(clear).toHaveBeenCalledWith('daily-loop');
  });
});
