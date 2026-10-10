/**
 * FEAT-570 — BugReportForm SEND FLOW and the overlay's slot wiring (MAINT-748).
 *
 * `modalOcclusionConversions.test.tsx` pins the STRUCTURE of the form (no Modal,
 * opaque backdrop, padded action row, no autoFocus) and `bugReportSubmit.contract`
 * pins `submitFeedback` at the API. Neither presses Send. This file drives the
 * user-visible send path through the real reporter, and pins the one wiring detail
 * nothing else can see: that `BugReportOverlay` passes `close` to `useRootOverlay`
 * as `onRevoked`.
 *
 * That wiring is the whole fix for "the form pops at the user the moment they
 * navigate away": the slot refuses or releases the overlay on
 * `CrisisResources` / `AssessmentFlow` / `LegalGate`, and without `onRevoked` the
 * store's `visible` stays true and the claim effect re-runs on every render.
 * `rootOverlayCrisisRoute.test.tsx` pins the slot's half of that contract with a
 * synthetic claimant; this pins the real claimant's half.
 *
 * Isolation: the reporter and both stores are module singletons, so every case
 * loads a fresh module graph — React and RNTL included, so they stay one
 * consistent registry. RNTL's auto-cleanup registers an `afterEach` at import
 * time, which cannot be done from inside a hook, so it is skipped and `cleanup`
 * is called by hand.
 */

process.env.RNTL_SKIP_AUTO_CLEANUP = 'true';

const mockInit = jest.fn();
const mockCaptureFeedback = jest.fn();

const mockSentry: Record<string, unknown> = {};
function resetSentryMock(): void {
  for (const key of Object.keys(mockSentry)) delete mockSentry[key];
  Object.assign(mockSentry, {
    init: (...args: unknown[]) => mockInit(...args),
    close: jest.fn(),
    captureException: jest.fn(),
    captureFeedback: (...args: unknown[]) => mockCaptureFeedback(...args),
    addEventProcessor: jest.fn(),
    feedbackIntegration: (opts: unknown) => ({ name: 'MobileFeedback', options: opts }),
  });
}
jest.mock('@sentry/react-native', () => mockSentry);

jest.mock('@/core/config/env', () => ({
  env: { EXPO_PUBLIC_SENTRY_DSN: '' },
}));

jest.mock('@/core/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: () => true,
    getCurrentRoute: () => ({ name: 'Home' }),
  },
}));

const TEST_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';

/** Long enough to drain the form's 350ms TalkBack focus retry and its rAF. */
const FOCUS_DRAIN_MS = 400;

type Graph = ReturnType<typeof loadGraph>;

function loadGraph() {
  jest.resetModules();
  resetSentryMock();
  /* eslint-disable @typescript-eslint/no-var-requires */
  const React = require('react') as typeof import('react');
  const rntl = require('@testing-library/react-native') as typeof import('@testing-library/react-native');
  const overlay = require('@/core/components/BugReportOverlay') as typeof import('@/core/components/BugReportOverlay');
  const reporter = require('@/core/services/logging/ExternalErrorReporter') as typeof import('@/core/services/logging/ExternalErrorReporter');
  const bugStore = require('@/core/stores/bugReportStore') as typeof import('@/core/stores/bugReportStore');
  const slot = require('@/core/navigation/rootOverlaySlot') as typeof import('@/core/navigation/rootOverlaySlot');
  /* eslint-enable @typescript-eslint/no-var-requires */
  return { React, rntl, overlay, reporter, bugStore, slot };
}

let g: Graph;
let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockCaptureFeedback.mockReset();
  // kill() logs a critical security line at ERROR, which the test logger prints.
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  g = loadGraph();
});

afterEach(() => {
  g.rntl.act(() => {
    jest.runOnlyPendingTimers();
  });
  g.rntl.cleanup();
  consoleErrorSpy.mockRestore();
  jest.useRealTimers();
});

/** Render the form, then drain the focus timer and rAF it schedules. */
function renderForm(props: { killed?: boolean; onClose?: () => void } = {}) {
  const onClose = props.onClose ?? jest.fn();
  const { BugReportForm } = g.overlay;
  const utils = g.rntl.render(
    <BugReportForm visible killed={props.killed ?? false} onClose={onClose} />,
  );
  g.rntl.act(() => {
    jest.advanceTimersByTime(FOCUS_DRAIN_MS);
  });
  return { ...utils, onClose };
}

function typeMessage(utils: ReturnType<typeof renderForm>, text: string): void {
  g.rntl.fireEvent.changeText(utils.getByTestId('bug-report-input'), text);
}

describe('BugReportForm · send flow', () => {
  it('keeps Send disabled for whitespace-only input, and pressing it submits nothing', async () => {
    await g.reporter.externalErrorReporter.initialize(TEST_DSN);
    const submitSpy = jest.spyOn(g.reporter.externalErrorReporter, 'submitFeedback');
    const utils = renderForm();

    typeMessage(utils, '    ');
    const send = utils.getByTestId('bug-report-send');
    expect(send.props.accessibilityState).toMatchObject({ disabled: true });

    g.rntl.fireEvent.press(send);

    expect(submitSpy).not.toHaveBeenCalled();
    expect(mockCaptureFeedback).not.toHaveBeenCalled();
    expect(utils.onClose).not.toHaveBeenCalled();
    expect(utils.queryByTestId('bug-report-refused')).toBeNull();
  });

  it('enables Send once the message has content (the disabled assertion is not vacuous)', async () => {
    await g.reporter.externalErrorReporter.initialize(TEST_DSN);
    const utils = renderForm();

    typeMessage(utils, 'the timer resets');

    expect(utils.getByTestId('bug-report-send').props.accessibilityState).toMatchObject({
      disabled: false,
    });
  });

  it('closes exactly once and transmits once when the submit is accepted', async () => {
    await g.reporter.externalErrorReporter.initialize(TEST_DSN);
    const utils = renderForm();

    typeMessage(utils, 'the timer resets when I background the app');
    g.rntl.fireEvent.press(utils.getByTestId('bug-report-send'));

    expect(mockCaptureFeedback).toHaveBeenCalledTimes(1);
    expect(utils.onClose).toHaveBeenCalledTimes(1);
    expect(utils.queryByTestId('bug-report-refused')).toBeNull();
  });

  it('shows the refusal, stays open and keeps the typed text when the submit is refused', () => {
    // Never initialized: the empty-DSN dev/sim state. submitFeedback returns false.
    const utils = renderForm();

    typeMessage(utils, 'the send button does nothing');
    g.rntl.fireEvent.press(utils.getByTestId('bug-report-send'));

    expect(utils.getByTestId('bug-report-refused')).toBeTruthy();
    expect(utils.onClose).not.toHaveBeenCalled();
    expect(mockCaptureFeedback).not.toHaveBeenCalled();
    // The copy promises "copy it if you want to keep it" — the text must still be there.
    expect(utils.getByTestId('bug-report-input').props.value).toBe(
      'the send button does nothing',
    );
  });

  it('refuses at the moment of Send when kill() fires after the form rendered', async () => {
    await g.reporter.externalErrorReporter.initialize(TEST_DSN);
    const utils = renderForm({ killed: false });
    typeMessage(utils, 'typed before the kill landed');
    expect(utils.queryByTestId('bug-report-unavailable')).toBeNull();

    g.reporter.killExternalReporting();
    g.rntl.fireEvent.press(utils.getByTestId('bug-report-send'));

    expect(utils.getByTestId('bug-report-refused')).toBeTruthy();
    expect(mockCaptureFeedback).not.toHaveBeenCalled();
    expect(utils.onClose).not.toHaveBeenCalled();
  });
});

describe('BugReportForm · killed variant', () => {
  it('renders the unavailable notice with no input and no Send, and Cancel still closes', async () => {
    await g.reporter.externalErrorReporter.initialize(TEST_DSN);
    g.reporter.killExternalReporting();
    const submitSpy = jest.spyOn(g.reporter.externalErrorReporter, 'submitFeedback');
    const utils = renderForm({ killed: true });

    expect(utils.getByTestId('bug-report-unavailable')).toBeTruthy();
    expect(utils.queryByTestId('bug-report-input')).toBeNull();
    expect(utils.queryByTestId('bug-report-send')).toBeNull();

    // The exit stays reachable: a surface with no input AND no exit is the silent
    // dead end this variant exists to avoid.
    g.rntl.fireEvent.press(utils.getByTestId('bug-report-cancel'));
    expect(utils.onClose).toHaveBeenCalledTimes(1);

    expect(submitSpy).not.toHaveBeenCalled();
    expect(mockCaptureFeedback).not.toHaveBeenCalled();
  });
});

describe('BugReportOverlay · onRevoked is wired to close (real root slot)', () => {
  /** Mount the publisher beside the real slot, so the form is observable in the tree. */
  function mountOverlayAndSlot() {
    const { React, rntl, overlay, slot } = g;
    return rntl.render(
      <React.Fragment>
        <overlay.BugReportOverlay />
        <slot.RootOverlaySlot />
      </React.Fragment>,
    );
  }

  function resetSlot(): void {
    g.slot.useRootOverlayStore.setState({
      ownerId: null,
      node: null,
      overlayForbiddenRouteActive: false,
    });
    g.bugStore.useBugReportStore.setState({ visible: false });
  }

  beforeEach(() => {
    resetSlot();
  });

  it('holds the slot and paints the form on a route that permits it (anti-vacuity)', () => {
    g.slot.useRootOverlayStore.getState().syncActiveRoute('Main');
    const utils = mountOverlayAndSlot();

    g.rntl.act(() => {
      g.bugStore.openBugReport();
    });

    expect(g.bugStore.useBugReportStore.getState().visible).toBe(true);
    expect(g.slot.useRootOverlayStore.getState().ownerId).toBe(g.overlay.BUG_REPORT_OVERLAY_ID);
    expect(utils.getByTestId('bug-report-overlay')).toBeTruthy();
  });

  it.each(['AssessmentFlow', 'CrisisResources', 'LegalGate'])(
    'closes itself, rather than lingering, when opened while %s is active',
    (route) => {
      g.slot.useRootOverlayStore.getState().syncActiveRoute(route);
      const utils = mountOverlayAndSlot();

      g.rntl.act(() => {
        g.bugStore.openBugReport();
      });

      // Refused at the door, and TOLD: visible must return to false, or it re-claims
      // on every render and pops at the user the instant they leave the route.
      expect(g.bugStore.useBugReportStore.getState().visible).toBe(false);
      expect(g.slot.useRootOverlayStore.getState().ownerId).not.toBe(
        g.overlay.BUG_REPORT_OVERLAY_ID,
      );
      expect(utils.queryByTestId('bug-report-overlay')).toBeNull();
    },
  );

  it('does not pop back up when the user leaves a forbidden route it was refused on', () => {
    g.slot.useRootOverlayStore.getState().syncActiveRoute('LegalGate');
    const utils = mountOverlayAndSlot();
    g.rntl.act(() => {
      g.bugStore.openBugReport();
    });

    g.rntl.act(() => {
      g.slot.useRootOverlayStore.getState().syncActiveRoute('Main');
    });

    expect(g.bugStore.useBugReportStore.getState().visible).toBe(false);
    expect(g.slot.useRootOverlayStore.getState().ownerId).toBeNull();
    expect(utils.queryByTestId('bug-report-overlay')).toBeNull();
  });

  it('closes when the slot revokes a form that is already open', () => {
    g.slot.useRootOverlayStore.getState().syncActiveRoute('Main');
    const utils = mountOverlayAndSlot();
    g.rntl.act(() => {
      g.bugStore.openBugReport();
    });
    expect(g.slot.useRootOverlayStore.getState().ownerId).toBe(g.overlay.BUG_REPORT_OVERLAY_ID);

    // The boot-race / navigate-to-988 ordering: the claim is standing, then a
    // forbidden route becomes active and the slot releases it unconditionally.
    g.rntl.act(() => {
      g.slot.useRootOverlayStore.getState().syncActiveRoute('CrisisResources');
    });

    expect(g.bugStore.useBugReportStore.getState().visible).toBe(false);
    expect(utils.queryByTestId('bug-report-overlay')).toBeNull();

    // And it stays closed on the way back.
    g.rntl.act(() => {
      g.slot.useRootOverlayStore.getState().syncActiveRoute('Main');
    });
    expect(g.bugStore.useBugReportStore.getState().visible).toBe(false);
    expect(g.slot.useRootOverlayStore.getState().ownerId).toBeNull();
  });
});
