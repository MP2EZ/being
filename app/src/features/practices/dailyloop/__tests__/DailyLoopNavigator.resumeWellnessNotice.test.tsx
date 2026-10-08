/**
 * DEBUG-699 — the resume path, end to end at the navigator.
 *
 * A same-day daily-loop session parked past AwarePresence comes back with its depth
 * restored, so the depth picker — FEAT-669's only notice host — never renders. This pins
 * that the resume prompt carries the note instead for every block reason, that the picker
 * stays skipped, and that Resume still proceeds exactly as it does with writes kept.
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SessionStorageService } from '@/core/services/session/SessionStorageService';
import { WELLNESS_WITHHELD_NOTE } from '@/features/practices/shared/wellnessWithheldNote';
import {
  seedWellnessWriteConsent,
  type SeededWellnessWriteConsent,
} from '../../../../../__tests__/helpers/wellnessWriteConsent';
import DailyLoopNavigator from '../DailyLoopNavigator';

// Same shims as __tests__/safety/deleteAccountCrisisRoute.test.tsx, whose header explains
// them: the global react-native mock is an allow-list, and a real stack navigator needs
// three more modules plus a Linking subscription.
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

const NOTE_ID = 'resume-session-wellness-withheld-note';
const BLOCKED: SeededWellnessWriteConsent[] = ['refused', 'revoked', 'under_age', 'missing'];

function parkedSession() {
  return {
    id: 'dl-parked',
    flowType: 'daily-loop' as const,
    currentScreen: 'SphereSovereignty',
    startedAt: Date.now(),
    lastActiveAt: Date.now(),
    completedScreens: ['AwarePresence', 'Premeditatio'],
    version: 1,
    flowState: { depth: 'deep', mode: 'flat', sessionData: {} },
  };
}

async function renderResumed() {
  jest.spyOn(SessionStorageService, 'loadSession').mockResolvedValue(parkedSession() as never);
  jest.spyOn(SessionStorageService, 'saveSession').mockResolvedValue(undefined as never);
  jest.spyOn(SessionStorageService, 'clearSession').mockResolvedValue(undefined as never);
  const screen = render(
    <NavigationContainer>
      <DailyLoopNavigator />
    </NavigationContainer>,
  );
  await waitFor(() => expect(screen.getByTestId('resume-session-overlay')).toBeTruthy());
  return screen;
}

afterEach(() => {
  jest.restoreAllMocks();
  seedWellnessWriteConsent('loading');
});

describe('DEBUG-699: resuming a parked daily loop', () => {
  it.each(BLOCKED)('blocked (%s): the prompt carries the note, and the picker never renders', async (reason) => {
    seedWellnessWriteConsent(reason);
    const screen = await renderResumed();
    expect(screen.getByTestId(NOTE_ID).props.children).toBe(WELLNESS_WITHHELD_NOTE);
    expect(screen.queryByTestId('daily-loop-depth-quick')).toBeNull();
    expect(screen.queryByTestId('daily-loop-depth-deep')).toBeNull();
  });

  it('granted: same prompt, no note — the control that the prompt is what renders here', async () => {
    seedWellnessWriteConsent('granted');
    const screen = await renderResumed();
    expect(screen.queryByTestId(NOTE_ID)).toBeNull();
    expect(screen.queryByTestId('daily-loop-depth-quick')).toBeNull();
  });

  it.each<SeededWellnessWriteConsent>(['granted', ...BLOCKED])(
    '%s: Resume closes the prompt and re-grounds on AwarePresence, never the picker',
    async (reason) => {
      seedWellnessWriteConsent(reason);
      const screen = await renderResumed();
      await act(async () => {
        fireEvent.press(screen.getByTestId('resume-session-button'));
      });
      await waitFor(() => expect(screen.queryByTestId('resume-session-overlay')).toBeNull());
      // Resume re-grounds before the parked beat (handleResumeSession): AwarePresence's
      // breath is up, exactly as it is with writes kept.
      await waitFor(() => expect(screen.getByTestId('daily-loop-AwarePresence-screen')).toBeTruthy());
      expect(screen.getByTestId('daily-loop-breathing-circle')).toBeTruthy();
      expect(screen.queryByTestId('daily-loop-depth-quick')).toBeNull();
      expect(screen.queryByTestId(NOTE_ID)).toBeNull();
    },
  );
});
