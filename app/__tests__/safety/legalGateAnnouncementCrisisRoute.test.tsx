/**
 * DEBUG-778 — LegalGate never speaks over a focused crisis screen.
 *
 * `handleContinue` awaits `verifyAge` and `recordLegalGateConsents` (and, since DEBUG-763,
 * both may wait on an erasure in flight — an unbounded window). A runtime `being://crisis`
 * link (DEBUG-737) can focus CrisisResources above LegalGate during that wait. The screen then
 * announced "Verification complete. Proceeding to app." over the 988 content — interrupting a
 * VoiceOver user on the crisis screen, and falsely, since completeLegalGate defers the
 * navigation while a crisis destination is focused (DEBUG-735).
 *
 * Crisis ruling (b-batch 2026-10-12): SUPPRESS, never defer and never reword — any
 * announcement interrupts VoiceOver whatever its words, and a deferred one replays out of
 * context (the DEBUG-737 precedent). All three post-await announcements are guarded: success,
 * under-age and 'Verification failed'. Suppression is of SPEECH only: the consent write and
 * onComplete() are unchanged (DEBUG-735 compliance ruling).
 *
 * The falsifier flips focus WHILE an await is pending. A test that set focus before the press
 * would also pass against a guard sampled too early, before the awaits.
 */
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

jest.mock('@react-native-picker/picker', () => {
  const React_ = require('react');
  const { View } = require('react-native');
  const Picker = ({ children, ...props }: never) => React_.createElement(View, props, children);
  Picker.Item = (props: never) => React_.createElement(View, props);
  return { Picker };
});

let mockActive: string | undefined;
let mockFocusThrows = false;
jest.mock('@/core/navigation/navigationRef', () => ({
  getActiveRootRouteName: () => {
    if (mockFocusThrows) throw new Error('navigation not ready');
    return mockActive;
  },
  navigationRef: { addListener: jest.fn(() => jest.fn()), isReady: () => true },
}));

const mockVerifyAge = jest.fn();
const mockRecordLegalGateConsents = jest.fn();
jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: () => ({ verifyAge: mockVerifyAge }),
  recordLegalGateConsents: (...args: unknown[]) => mockRecordLegalGateConsents(...args),
}));

import CombinedLegalGateScreen from '@/features/consent/screens/CombinedLegalGateScreen';

const SUCCESS = 'Verification complete. Proceeding to app.';
const FAILED = 'Verification failed. Please try again.';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup() {
  const onComplete = jest.fn();
  const onUnderAge = jest.fn();
  const api = render(<CombinedLegalGateScreen onComplete={onComplete} onUnderAge={onUnderAge} />);
  fireEvent(api.getByTestId('legal-dob-picker'), 'valueChange', 1992);
  for (const id of ['legal-consent-tos', 'legal-consent-privacy', 'legal-consent-wellness']) {
    const pressable = api.getByTestId(id).parent;
    if (!pressable) throw new Error(`no pressable for ${id}`);
    fireEvent.press(pressable);
  }
  return { api, onComplete, onUnderAge };
}

const announced = () => (AccessibilityInfo.announceForAccessibility as jest.Mock).mock.calls.map((c) => c[0]);
const flush = () => act(async () => { await new Promise(process.nextTick); });

let announceSpy: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  mockActive = undefined;
  mockFocusThrows = false;
  announceSpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  mockRecordLegalGateConsents.mockResolvedValue(undefined);
});
afterEach(() => announceSpy.mockRestore());

describe('DEBUG-778 — post-await announcements are suppressed while a crisis screen is focused', () => {
  it('(a) control: no crisis screen — success announced once, before onComplete', async () => {
    mockVerifyAge.mockResolvedValue({ eligible: true, age: 34 });
    const { api, onComplete } = setup();
    fireEvent.press(api.getByTestId('legal-gate-continue'));
    await flush();

    expect(announced()).toEqual([SUCCESS]);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(announceSpy.mock.invocationCallOrder[0]).toBeLessThan(onComplete.mock.invocationCallOrder[0]);
  });

  it('(b) focus flips to CrisisResources while verifyAge is pending — success is NOT spoken', async () => {
    const age = deferred<{ eligible: boolean; age: number }>();
    mockVerifyAge.mockReturnValue(age.promise);
    const { api, onComplete } = setup();
    fireEvent.press(api.getByTestId('legal-gate-continue'));

    mockActive = 'CrisisResources';
    await act(async () => { age.resolve({ eligible: true, age: 34 }); });
    await flush();

    expect(announced()).not.toContain(SUCCESS);
    expect(mockRecordLegalGateConsents).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(api.queryByText(FAILED)).toBeNull();
  });

  it('(b) focus flips while recordLegalGateConsents is pending — success is NOT spoken', async () => {
    mockVerifyAge.mockResolvedValue({ eligible: true, age: 34 });
    const write = deferred<void>();
    mockRecordLegalGateConsents.mockReturnValue(write.promise);
    const { api, onComplete } = setup();
    fireEvent.press(api.getByTestId('legal-gate-continue'));
    await flush();

    mockActive = 'CrisisResources';
    await act(async () => { write.resolve(); });
    await flush();

    expect(announced()).not.toContain(SUCCESS);
    expect(mockRecordLegalGateConsents).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('(c) a throwing focus reader never reaches the catch: one write, onComplete, no failure', async () => {
    mockVerifyAge.mockResolvedValue({ eligible: true, age: 34 });
    const { api, onComplete } = setup();
    mockFocusThrows = true;
    fireEvent.press(api.getByTestId('legal-gate-continue'));
    await flush();

    expect(mockRecordLegalGateConsents).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(api.queryByText(FAILED)).toBeNull();
    expect(announced()).not.toContain(FAILED);
  });

  it('(d) under-age with a crisis screen focused: nothing spoken, the under-age path still runs', async () => {
    const age = deferred<{ eligible: boolean; age: number }>();
    mockVerifyAge.mockReturnValue(age.promise);
    const { api, onUnderAge } = setup();
    fireEvent.press(api.getByTestId('legal-gate-continue'));

    mockActive = 'CrisisResources';
    await act(async () => { age.resolve({ eligible: false, age: 15 }); });
    await flush();

    expect(announced().some((m) => /18 and older/.test(m))).toBe(false);
    expect(onUnderAge).toHaveBeenCalledTimes(1);
    expect(mockRecordLegalGateConsents).not.toHaveBeenCalled();
  });

  it('(e) a failed verification with a crisis screen focused: not spoken, the error still shows', async () => {
    const age = deferred<{ eligible: boolean; age: number }>();
    mockVerifyAge.mockReturnValue(age.promise);
    const { api, onComplete } = setup();
    fireEvent.press(api.getByTestId('legal-gate-continue'));

    mockActive = 'CrisisResources';
    await act(async () => { age.reject(new Error('boom')); });
    await flush();

    expect(announced()).not.toContain(FAILED);
    expect(api.getByText(FAILED)).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('(e) control: a failed verification with no crisis screen is still spoken', async () => {
    mockVerifyAge.mockRejectedValue(new Error('boom'));
    const { api } = setup();
    fireEvent.press(api.getByTestId('legal-gate-continue'));
    await flush();

    expect(announced()).toContain(FAILED);
  });

  it('(f) source pin: no bare post-await announce, and onComplete() still follows the write', () => {
    const raw = fs.readFileSync(
      path.resolve(__dirname, '../../src/features/consent/screens/CombinedLegalGateScreen.tsx'),
      'utf8',
    );
    const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const start = src.indexOf('await verifyAge(');
    const end = src.indexOf('}, [', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const postAwait = src.slice(start, end);

    // Canary: the slice is the real branch body, not an empty or wrong span.
    expect(postAwait).toMatch(/await recordLegalGateConsents\(/);
    expect(postAwait).not.toMatch(/AccessibilityInfo\.announceForAccessibility\s*\(/);
    expect(postAwait.indexOf('await recordLegalGateConsents(')).toBeLessThan(postAwait.indexOf('onComplete()'));
  });
});
