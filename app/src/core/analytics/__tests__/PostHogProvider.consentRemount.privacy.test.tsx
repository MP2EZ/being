/**
 * DEBUG-557 — granting analytics consent remounts the whole subtree below
 * <PostHogProvider>, including the root crisis affordance.
 *
 * WHAT THIS FILE SETTLES, AND WHAT IT DELIBERATELY DOES NOT
 * --------------------------------------------------------
 * `PostHogProvider` returns a bare fragment when analytics is off and
 * `<PHProvider>` when it is on. That is an element-TYPE change at a fixed
 * position, so React deletes and recreates the entire subtree rather than
 * reconciling it — `children` being a referentially identical element does not
 * rescue it. This file pins that reconciliation fact and the state loss that
 * follows from it.
 *
 * It does NOT establish the on-device consequence, nor measure how long
 * RootCrisisButton is absent. Both need a device and a Release build and are
 * owned by DEBUG-559.
 *
 * WHY THE ENV MOCK BELOW IS LOAD-BEARING, NOT SETUP NOISE
 * ------------------------------------------------------
 * `__tests__/setup/env.mock.js` sets EXPO_PUBLIC_POSTHOG_API_KEY to '' for every
 * jest run, and PostHogProvider reads it at MODULE SCOPE. Without the override,
 * the early-return guard is permanently true and BOTH consent states render the
 * fragment branch — a mount counter then reads 1 and the file reports "it does
 * not remount". Under this item's AC-1 that reading closes a live defect. The
 * override is therefore the difference between a pin and a false exoneration,
 * and the branch-entered control below is what proves the override took.
 *
 * `process.env` assignment cannot substitute: babel hoists the imports above any
 * statement, so the module-scope read happens first. Editing env.mock.js cannot
 * substitute either — it is a global setupFile and would switch the PHProvider
 * branch on for every suite in the repo.
 */

// ---------------------------------------------------------------------------
// Env: give the provider a non-placeholder key so the consent flip can actually
// cross the conditional. Spread requireActual so every other validated var and
// export stays real.
// ---------------------------------------------------------------------------
jest.mock('@/core/config/env', () => {
  const actual = jest.requireActual('@/core/config/env');
  return {
    ...actual,
    env: {
      ...actual.env,
      EXPO_PUBLIC_POSTHOG_API_KEY: 'phc_debug557_mount_pin',
      EXPO_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com',
    },
  };
});

// ---------------------------------------------------------------------------
// posthog-react-native: a passthrough with a DISTINCT element type. Faithful for
// this question — the remount is caused by the type at the return position
// changing from React.Fragment to PHProvider, independent of what PHProvider
// renders internally. The testID is how the branch-entered control observes it.
// ---------------------------------------------------------------------------
const PH_BRANCH_TEST_ID = 'debug557-ph-provider-branch';
jest.mock('posthog-react-native', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    PostHogProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(View, { testID: 'debug557-ph-provider-branch' }, children),
    usePostHog: () => null,
  };
});

// ---------------------------------------------------------------------------
// The real crisis subtree's own dependencies. Mirrors RootCrisisButton.test.tsx
// so the at-risk components can render for real without dragging in the
// animation-driven button or the navigation container.
// ---------------------------------------------------------------------------
jest.mock('@/features/crisis/components/CollapsibleCrisisButton', () => {
  const ReactActual = require('react');
  const { Text } = require('react-native');
  const Stub = (props: { testID?: string; mode?: string }) =>
    ReactActual.createElement(Text, { testID: props.testID }, `mode:${props.mode}`);
  return { __esModule: true, CollapsibleCrisisButton: Stub, default: Stub };
});

jest.mock('@/features/crisis/utils/openCrisisUrl', () => ({
  openCrisisUrl: jest.fn(),
}));

jest.mock('@/core/navigation/navigationRef', () => ({
  navigationRef: { isReady: () => true, navigate: jest.fn() },
  getActiveRootRouteName: jest.fn(),
}));

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';

import { PostHogProvider } from '../PostHogProvider';
import { useConsentStore } from '@/core/stores/consentStore';
import RootCrisisBoundary from '@/features/crisis/components/RootCrisisBoundary';
import {
  RootCrisisButton,
  ROOT_CRISIS_BUTTON_TEST_ID,
} from '@/features/crisis/components/RootCrisisButton';

// ---------------------------------------------------------------------------
// Mount accounting. Module-scoped so it survives the subtree being destroyed —
// which is the entire point.
// ---------------------------------------------------------------------------
let mounts = 0;
let unmounts = 0;
let renders = 0;
let setProbeValue: ((v: string) => void) | null = null;

const PROBE_TEST_ID = 'debug557-probe';

/**
 * Wraps the real at-risk subtree. The `useState` is the state-loss instrument:
 * component state cannot survive an unmount, so driving it to 'dirty' before the
 * consent flip and reading 'initial' afterwards demonstrates destruction rather
 * than a re-render. That is the same mechanism by which OnboardingScreen's
 * in-progress screen state is lost.
 */
function MountProbe({ children }: { children: React.ReactNode }): React.ReactElement {
  const [value, setValue] = React.useState('initial');
  renders += 1;
  setProbeValue = setValue;

  React.useEffect(() => {
    mounts += 1;
    return () => {
      unmounts += 1;
    };
  }, []);

  return (
    <>
      <Text testID={PROBE_TEST_ID}>{value}</Text>
      {children}
    </>
  );
}

function resetCounters(): void {
  mounts = 0;
  unmounts = 0;
  renders = 0;
  setProbeValue = null;
}

/**
 * The provider reads exactly two paths off the store:
 *   currentConsent?.preferences?.analyticsEnabled
 *   currentConsent?.universalOptOut
 * Both are optional-chained, so a literal carrying just those is a faithful
 * stand-in and keeps this pin decoupled from unrelated ConsentRecord schema
 * churn. The selector control below asserts these are the paths production reads.
 */
function setAnalyticsConsent(enabled: boolean): void {
  useConsentStore.setState({
    currentConsent: {
      preferences: { analyticsEnabled: enabled },
      universalOptOut: false,
    },
  } as unknown as Parameters<typeof useConsentStore.setState>[0]);
}

function renderSubtree() {
  return render(
    <PostHogProvider>
      <MountProbe>
        <RootCrisisBoundary>
          <RootCrisisButton routeName="Main" />
        </RootCrisisBoundary>
      </MountProbe>
    </PostHogProvider>,
  );
}

describe('DEBUG-557 — consent grant and subtree reconciliation', () => {
  beforeEach(() => {
    resetCounters();
    useConsentStore.setState({ currentConsent: null } as unknown as Parameters<
      typeof useConsentStore.setState
    >[0]);
  });

  describe('the finding', () => {
    it('destroys and recreates the subtree — including the root crisis button — when consent is granted', () => {
      const { getByTestId, queryByTestId } = renderSubtree();

      // ── Control 1: the counter fires at all. If a mock swallowed `children`,
      //    this fails loudly instead of letting `mounts === 1` read as a pass.
      expect(mounts).toBe(1);
      expect(unmounts).toBe(0);
      expect(renders).toBeGreaterThanOrEqual(1);
      expect(getByTestId(ROOT_CRISIS_BUTTON_TEST_ID)).toBeTruthy();

      // ── Control 2: we start in the fragment branch.
      expect(queryByTestId(PH_BRANCH_TEST_ID)).toBeNull();

      // Dirty the probe's state so its loss is observable.
      act(() => setProbeValue?.('dirty'));
      expect(getByTestId(PROBE_TEST_ID).props.children).toBe('dirty');

      const rendersBeforeToggle = renders;

      act(() => setAnalyticsConsent(true));

      // ── Control 3: the selector paths production reads are the ones we set.
      //    Pins the literal property path, so a rename breaks this test rather
      //    than silently making it vacuous.
      const consent = useConsentStore.getState().currentConsent;
      expect(consent?.preferences?.analyticsEnabled).toBe(true);
      expect(consent?.universalOptOut).toBe(false);

      // ── Control 4: the toggle actually CROSSED the conditional. This is the
      //    control that catches the empty-API-key false negative; without it a
      //    "no remount" result would be indistinguishable from a mis-set store.
      expect(getByTestId(PH_BRANCH_TEST_ID)).toBeTruthy();

      // ── Control 5: the subscription fired and propagated. Separates a genuine
      //    negative from a store that never notified.
      expect(renders).toBeGreaterThan(rendersBeforeToggle);

      // ── The finding: a real destroy/create, not a re-render.
      expect(unmounts).toBe(1);
      expect(mounts).toBe(2);

      // ── The user-visible consequence, as a property rather than a count:
      //    in-progress component state is gone.
      expect(getByTestId(PROBE_TEST_ID).props.children).toBe('initial');

      // The crisis button is present again AFTER remount — the exposure is the
      // window, not the end state. Measuring that window is DEBUG-559's job.
      expect(getByTestId(ROOT_CRISIS_BUTTON_TEST_ID)).toBeTruthy();
    });
  });

  /**
   * DEBUG-390 discipline: a pin that can only ever report "remounted" is
   * indistinguishable from a rigged counter. This runs the IDENTICAL harness
   * against a provider whose returned element type is STABLE across the same
   * consent flip, and asserts the counters report the opposite. It brackets the
   * finding from both sides and doubles as a zero-risk preview of the only fix
   * shape that works.
   */
  describe('negative control — the harness can report "no remount"', () => {
    function StableShapeProvider({
      children,
    }: {
      children: React.ReactNode;
    }): React.ReactElement {
      // Subscribes to the same store slice so the flip drives a re-render here
      // too, but the returned element type never changes.
      const analyticsEnabled = useConsentStore(
        (s) => s.currentConsent?.preferences?.analyticsEnabled ?? false,
      );
      const PH = require('posthog-react-native').PostHogProvider;
      return <PH data-analytics-enabled={analyticsEnabled}>{children}</PH>;
    }

    it('reports mounts === 1 and preserves state when the element type is stable', () => {
      const { getByTestId } = render(
        <StableShapeProvider>
          <MountProbe>
            <RootCrisisBoundary>
              <RootCrisisButton routeName="Main" />
            </RootCrisisBoundary>
          </MountProbe>
        </StableShapeProvider>,
      );

      expect(mounts).toBe(1);
      const rendersBeforeToggle = renders;

      act(() => setProbeValue?.('dirty'));
      act(() => setAnalyticsConsent(true));

      // Same propagation control as above — proves the flip was observed here
      // too, so `mounts === 1` means "did not remount", not "nothing happened".
      expect(renders).toBeGreaterThan(rendersBeforeToggle);

      expect(unmounts).toBe(0);
      expect(mounts).toBe(1);
      expect(getByTestId(PROBE_TEST_ID).props.children).toBe('dirty');
    });
  });
});
