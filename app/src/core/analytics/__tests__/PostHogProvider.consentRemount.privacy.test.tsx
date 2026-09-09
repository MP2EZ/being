/**
 * DEBUG-559 — granting analytics consent must NOT remount the subtree below
 * <PostHogProvider>, which contains every 988 affordance in the app.
 *
 * WHAT THIS FILE PINS, AND WHY THE ASSERTIONS INVERTED
 * ---------------------------------------------------
 * DEBUG-557 authored this file to CONFIRM the defect: `PostHogProvider` returned a
 * bare fragment when analytics was off and `<PHProvider>` when on, an element-TYPE
 * change at a fixed position, so React deleted and recreated the entire subtree.
 * Measured: mounts 1→2, unmounts 0→1, component state lost.
 *
 * DEBUG-559 fixed it, so every assertion about the real provider now reads the
 * other way: mounts === 1, unmounts === 0, state preserved. The five controls are
 * retained, because `mounts === 1` is ALSO what a broken harness reports.
 *
 * WHY THE ENV MOCK BELOW IS NOW THE FILE'S LOAD-BEARING SENTENCE
 * -------------------------------------------------------------
 * `__tests__/setup/env.mock.js` sets EXPO_PUBLIC_POSTHOG_API_KEY to '' for every
 * jest run, and PostHogProvider reads it at MODULE SCOPE. Under DEBUG-557's shape
 * that meant both consent states rendered the fragment branch. Under DEBUG-559's
 * shape the API-key guard is the ONLY conditional left in that file, so without the
 * override below every test here renders the fragment branch and every counter
 * reads `mounts === 1` — the exact number the fix is supposed to produce, for a
 * reason that has nothing to do with the fix. Control 4 (the PHProvider branch is
 * actually entered) is what proves the override took, and it is the difference
 * between a pin and a green light on unfixed code.
 *
 * `process.env` assignment cannot substitute: babel hoists the imports above any
 * statement, so the module-scope read happens first. Editing env.mock.js cannot
 * substitute either — it is a global setupFile and would switch the PHProvider
 * branch on for every suite in the repo.
 *
 * WHAT THIS FILE DELIBERATELY DOES NOT ESTABLISH
 * ---------------------------------------------
 * The on-device consequence, and the duration of the pre-fix blank window. Both
 * need a Release build on a device and are measured in DEBUG-559's attended
 * session; jest counts commits, never frames.
 */

// ---------------------------------------------------------------------------
// Env: give the provider a non-placeholder key so the tests exercise the branch
// a Release build takes. Spread requireActual so every other validated var and
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
// posthog-react-native: a passthrough with a DISTINCT element type, plus a fake
// client. Faithful for this question — the pre-fix remount was caused by the type
// at the return position changing from React.Fragment to PHProvider, independent
// of what PHProvider renders internally. The testID is how the branch-entered
// control observes it; the client is how the opt-state pins observe ConsentSync.
//
// `mock`-prefixed so the jest.mock factory may close over it (babel hoists the
// factory above the declarations, and only `mock*` names are exempt).
// ---------------------------------------------------------------------------
const PH_BRANCH_TEST_ID = 'debug557-ph-provider-branch';
const mockPostHogClient = {
  optIn: jest.fn(),
  optOut: jest.fn(),
  register: jest.fn(),
  capture: jest.fn(),
};
jest.mock('posthog-react-native', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    PostHogProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(View, { testID: 'debug557-ph-provider-branch' }, children),
    usePostHog: () => mockPostHogClient,
  };
});

// Observed by the sibling-index pin: a `null`-returning sibling that remounts
// proves `children`'s index shifted, which remounts the crisis subtree too.
const mockLifecycleMounts = { count: 0 };
jest.mock('../AppLifecycleTracker', () => {
  const ReactActual = require('react');
  return {
    __esModule: true,
    AppLifecycleTracker: (): null => {
      ReactActual.useEffect(() => {
        mockLifecycleMounts.count += 1;
      }, []);
      return null;
    },
  };
});

const mockRegisterAnalyticsClient = jest.fn();
jest.mock('../analyticsIdentityReset', () => ({
  __esModule: true,
  registerAnalyticsClient: (client: unknown) => mockRegisterAnalyticsClient(client),
}));

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
import fs from 'fs';
import path from 'path';
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
// Mount accounting. Module-scoped so it would survive the subtree being
// destroyed — which is the entire point.
// ---------------------------------------------------------------------------
let mounts = 0;
let unmounts = 0;
let renders = 0;
let setProbeValue: ((v: string) => void) | null = null;

const PROBE_TEST_ID = 'debug557-probe';

/**
 * Wraps the real at-risk subtree. The `useState` is the state-loss instrument:
 * component state cannot survive an unmount, so driving it to 'dirty' before the
 * consent flip and reading it back afterwards distinguishes destruction from a
 * re-render. That is the same mechanism by which OnboardingScreen's in-progress
 * screen state was lost.
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
  mockLifecycleMounts.count = 0;
  mockPostHogClient.optIn.mockClear();
  mockPostHogClient.optOut.mockClear();
  mockPostHogClient.register.mockClear();
  mockPostHogClient.capture.mockClear();
  mockRegisterAnalyticsClient.mockClear();
}

/**
 * The provider's consent predicate reads exactly two paths off the store:
 *   currentConsent?.preferences?.analyticsEnabled
 *   currentConsent?.universalOptOut
 * Both are optional-chained, so a literal carrying just those is a faithful
 * stand-in and keeps this pin decoupled from unrelated ConsentRecord schema
 * churn. The selector control below asserts these are the paths production reads.
 */
function setConsent(analyticsEnabled: boolean, universalOptOut = false): void {
  useConsentStore.setState({
    currentConsent: {
      preferences: { analyticsEnabled },
      universalOptOut,
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

describe('DEBUG-559 — consent flips must not reconcile the crisis subtree away', () => {
  beforeEach(() => {
    resetCounters();
    useConsentStore.setState({ currentConsent: null } as unknown as Parameters<
      typeof useConsentStore.setState
    >[0]);
  });

  describe('the fix', () => {
    it('preserves the subtree — including the root crisis button — when consent is GRANTED', () => {
      const { getByTestId, queryByTestId } = renderSubtree();

      // ── Control 1: the counter fires at all. If a mock swallowed `children`,
      //    this fails loudly instead of letting `mounts === 1` read as a pass.
      expect(mounts).toBe(1);
      expect(unmounts).toBe(0);
      expect(renders).toBeGreaterThanOrEqual(1);
      expect(getByTestId(ROOT_CRISIS_BUTTON_TEST_ID)).toBeTruthy();

      // ── Control 2 (INVERTED by the fix): pre-consent we are ALREADY inside the
      //    PHProvider branch. Before DEBUG-559 this was `toBeNull()` — that swap
      //    is the fix, so asserting presence here is what proves the type no
      //    longer depends on consent.
      expect(queryByTestId(PH_BRANCH_TEST_ID)).toBeTruthy();

      // Dirty the probe's state so its survival is observable.
      act(() => setProbeValue?.('dirty'));
      expect(getByTestId(PROBE_TEST_ID).props.children).toBe('dirty');

      const rendersBeforeToggle = renders;

      act(() => setConsent(true));

      // ── Control 3: the selector paths production reads are the ones we set.
      //    Pins the literal property path, so a rename breaks this test rather
      //    than silently making it vacuous.
      const consent = useConsentStore.getState().currentConsent;
      expect(consent?.preferences?.analyticsEnabled).toBe(true);
      expect(consent?.universalOptOut).toBe(false);

      // ── Control 4: we are in the PHProvider branch, i.e. the env override took.
      //    Without this, everything below passes against an empty API key for
      //    reasons unrelated to the fix.
      expect(getByTestId(PH_BRANCH_TEST_ID)).toBeTruthy();

      // ── Control 5: the subscription fired and propagated. Separates a genuine
      //    "did not remount" from a store that never notified — without it,
      //    `mounts === 1` would also be what a dead subscription reports.
      //
      //    Measured on the CLIENT, not on a render count, and that is a property
      //    of the fix rather than a workaround. Before DEBUG-559 the provider body
      //    itself subscribed, so a flip re-rendered the whole app subtree and
      //    `renders` ticked. The subscription now lives in the null-returning
      //    leaves, so the flip reaches the client WITHOUT re-rendering `children`
      //    at all — `renders` legitimately stays flat, and optIn is the live
      //    evidence the store notified.
      expect(mockPostHogClient.optIn).toHaveBeenCalled();
      expect(renders).toBe(rendersBeforeToggle);

      // ── The fix: no destroy/create.
      expect(unmounts).toBe(0);
      expect(mounts).toBe(1);

      // ── The user-visible consequence, as a property rather than a count:
      //    in-progress component state survives.
      expect(getByTestId(PROBE_TEST_ID).props.children).toBe('dirty');
      expect(getByTestId(ROOT_CRISIS_BUTTON_TEST_ID)).toBeTruthy();
    });

    it('preserves the subtree when consent is REVOKED (the same swap, in reverse)', () => {
      setConsent(true);
      const { getByTestId } = renderSubtree();

      expect(mounts).toBe(1);
      act(() => setProbeValue?.('dirty'));
      const rendersBeforeToggle = renders;

      act(() => setConsent(false));

      // Propagation control — see the note on Control 5 above.
      expect(mockPostHogClient.optOut).toHaveBeenCalled();
      expect(renders).toBe(rendersBeforeToggle);
      expect(unmounts).toBe(0);
      expect(mounts).toBe(1);
      expect(getByTestId(PROBE_TEST_ID).props.children).toBe('dirty');
      expect(getByTestId(ROOT_CRISIS_BUTTON_TEST_ID)).toBeTruthy();
    });

    it('preserves the subtree across the universalOptOut axis (INFRA-151), not just analyticsEnabled', () => {
      // The predicate reads TWO store paths. A fix correct on one input and
      // broken on the other would pass every test above.
      setConsent(true, false);
      const { getByTestId } = renderSubtree();

      expect(mounts).toBe(1);
      act(() => setProbeValue?.('dirty'));
      const rendersBeforeToggle = renders;

      mockPostHogClient.optOut.mockClear();
      act(() => setConsent(true, true));

      expect(useConsentStore.getState().currentConsent?.universalOptOut).toBe(true);
      // Propagation control — universalOptOut alone must drive the client OUT
      // even though analyticsEnabled is still true.
      expect(mockPostHogClient.optOut).toHaveBeenCalled();
      expect(renders).toBe(rendersBeforeToggle);
      expect(unmounts).toBe(0);
      expect(mounts).toBe(1);
      expect(getByTestId(PROBE_TEST_ID).props.children).toBe('dirty');
    });

    it('holds `children` at a fixed sibling index — the null-returning siblings do not remount either', () => {
      // React reconciles unkeyed children by POSITION, so anything that moves
      // `children` to a different slot on a consent flip remounts the crisis
      // subtree just as surely as a type swap would. Counting a null-returning
      // sibling is how that is observed.
      //
      // Measured while validating this pin, because it is the opposite of the
      // obvious guess: `{cond && <X />}` is index-SAFE — a `false` still occupies
      // its slot, so the count never changes. What actually shifts `children` is a
      // change in the child COUNT or in what wraps it. Both are caught here and by
      // the source-order pin below; the `&&` form is caught by the source pin only,
      // which is why that one is not redundant.
      renderSubtree();

      expect(mockLifecycleMounts.count).toBe(1);

      act(() => setConsent(true));
      expect(mockLifecycleMounts.count).toBe(1);

      act(() => setConsent(true, true));
      expect(mockLifecycleMounts.count).toBe(1);

      act(() => setConsent(false));
      expect(mockLifecycleMounts.count).toBe(1);

      expect(mounts).toBe(1);
      expect(unmounts).toBe(0);
    });
  });

  /**
   * DEBUG-390 discipline, inverted from DEBUG-557's version. That file needed a
   * control proving the harness could report "no remount"; now that "no remount"
   * is the expected result, the risk runs the other way — a rigged harness that
   * can ONLY report `mounts === 1` looks exactly like a working fix. This runs the
   * IDENTICAL harness against a provider that DOES swap element type on the same
   * consent flip, and asserts it still detects the destruction.
   */
  describe('positive control — the harness can still report "remounted"', () => {
    function TypeSwappingProvider({
      children,
    }: {
      children: React.ReactNode;
    }): React.ReactElement {
      const analyticsEnabled = useConsentStore(
        (s) => s.currentConsent?.preferences?.analyticsEnabled ?? false,
      );
      const PH = require('posthog-react-native').PostHogProvider;
      // Deliberately the pre-DEBUG-559 shape.
      if (!analyticsEnabled) return <>{children}</>;
      return <PH>{children}</PH>;
    }

    it('reports mounts === 2 and loses state when the element type is NOT stable', () => {
      const { getByTestId } = render(
        <TypeSwappingProvider>
          <MountProbe>
            <RootCrisisBoundary>
              <RootCrisisButton routeName="Main" />
            </RootCrisisBoundary>
          </MountProbe>
        </TypeSwappingProvider>,
      );

      expect(mounts).toBe(1);
      const rendersBeforeToggle = renders;

      act(() => setProbeValue?.('dirty'));
      act(() => setConsent(true));

      expect(renders).toBeGreaterThan(rendersBeforeToggle);
      expect(unmounts).toBe(1);
      expect(mounts).toBe(2);
      expect(getByTestId(PROBE_TEST_ID).props.children).toBe('initial');
    });
  });

  /**
   * The consent lever. `disabled`/`defaultOptIn` are frozen in the client
   * constructor (PHProvider memoises on [client, apiKey], NOT on options), so the
   * only runtime lever is optIn/optOut on the existing instance — and it must be
   * the existing one, because rebuilding the client would reintroduce an identity
   * discontinuity, the same class of damage one level down.
   */
  describe('consent drives the client opt state, not the tree shape', () => {
    it('opts OUT on mount without consent and IN on grant, on the SAME client instance', () => {
      renderSubtree();

      expect(mockPostHogClient.optOut).toHaveBeenCalled();
      expect(mockPostHogClient.optIn).not.toHaveBeenCalled();
      const instanceSeenWhileOptedOut = mockRegisterAnalyticsClient.mock.calls[0]?.[0];

      act(() => setConsent(true));

      expect(mockPostHogClient.optIn).toHaveBeenCalled();
      // Same object identity before and after: no client was reconstructed.
      expect(instanceSeenWhileOptedOut).toBe(mockPostHogClient);
    });

    it('opts back OUT when consent is revoked and when universalOptOut is asserted', () => {
      setConsent(true);
      renderSubtree();
      expect(mockPostHogClient.optIn).toHaveBeenCalled();

      mockPostHogClient.optOut.mockClear();
      act(() => setConsent(false));
      expect(mockPostHogClient.optOut).toHaveBeenCalled();

      // Re-grant first: mayEmit must actually TRANSITION for the effect to re-run.
      // Going revoked -> revoked+universalOptOut is false -> false, i.e. no change
      // and correctly no call, so asserting one there would pin a fiction.
      act(() => setConsent(true));
      mockPostHogClient.optOut.mockClear();
      act(() => setConsent(true, true));
      expect(mockPostHogClient.optOut).toHaveBeenCalled();
    });

    it('withholds the surface super-property until consent, but registers the client for erasure immediately', () => {
      renderSubtree();

      // `register` persists to disk through wrap(), which checks `disabled` and
      // NOT `optedOut` — so it would otherwise write pre-consent.
      expect(mockPostHogClient.register).not.toHaveBeenCalled();
      // DEBUG-539's erasure path needs the instance regardless of consent, and
      // now gets it at launch rather than at first consent.
      expect(mockRegisterAnalyticsClient).toHaveBeenCalledWith(mockPostHogClient);

      act(() => setConsent(true));
      expect(mockPostHogClient.register).toHaveBeenCalledWith({ surface: 'app' });
    });
  });
});

/**
 * Source-shape pins. These guard the two properties that make the fix a fix, and
 * that a well-meaning future edit could undo without any behavioural test noticing
 * — the same reasoning as `check:breathing-worklets`.
 *
 * DEBUG-390 applies with force here: this file's subject is dense with prose that
 * NAMES the anti-patterns, so comments are stripped before matching, patterns are
 * prop-shaped rather than bare identifiers, and every matcher is proved to fire
 * against a known-bad literal so a narrowed regex cannot go silently vacuous.
 */
describe('DEBUG-559 — source shape of PostHogProvider', () => {
  const providerPath = path.join(__dirname, '..', 'PostHogProvider.tsx');
  const raw = fs.readFileSync(providerPath, 'utf8');
  const source = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('strips to something non-trivial (guards against a vacuous matcher)', () => {
    expect(raw.length).toBeGreaterThan(2000);
    expect(source.length).toBeGreaterThan(500);
    expect(source).toContain('PHProvider');
  });

  it('carries the five pre-consent network-suppression options', () => {
    // Each is load-bearing: defaultOptIn alone does NOT silence the client,
    // because the SDK's init path gates on `disabled`, never on `optedOut`.
    const required = [
      /disabled\s*:\s*false/,
      /defaultOptIn\s*:\s*false/,
      /disableRemoteConfig\s*:\s*true/,
      /preloadFeatureFlags\s*:\s*false/,
      /disableSurveys\s*:\s*true/,
    ];
    for (const re of required) {
      expect(re.test(source)).toBe(true);
      // The matcher fires against a known-bad literal, so a typo in the regex
      // cannot make this assertion silently vacuous.
      expect(re.test('disabled: false defaultOptIn: false disableRemoteConfig: true preloadFeatureFlags: false disableSurveys: true')).toBe(true);
    }
  });

  it('never makes the returned element type depend on consent', () => {
    // The component body may branch ONLY on the module-scope key constant. If a
    // future edit re-sources the key from a store or context, or reintroduces a
    // consent branch at the return position, the original defect returns in its
    // exact original form with nobody looking.
    const body = source.slice(source.indexOf('export function PostHogProvider'));
    const guard = body.slice(0, body.indexOf('return'));

    expect(/POSTHOG_CONFIGURED/.test(guard)).toBe(true);
    expect(/useConsentStore|analyticsEnabled|universalOptOut|useAnalyticsConsent/.test(guard)).toBe(
      false,
    );
    // Known-bad literal control for the negative matcher above.
    expect(
      /useConsentStore|analyticsEnabled|universalOptOut|useAnalyticsConsent/.test(
        'if (!analyticsEnabled) return <>{children}</>;',
      ),
    ).toBe(true);
  });

  it('reads the API key at module scope, so the surviving guard cannot become runtime-variable', () => {
    const beforeComponent = source.slice(0, source.indexOf('export function PostHogProvider'));
    expect(/const\s+POSTHOG_API_KEY\s*=\s*env\./.test(beforeComponent)).toBe(true);
    expect(/const\s+POSTHOG_CONFIGURED\s*=/.test(beforeComponent)).toBe(true);
  });

  it('renders the three effect-only siblings unconditionally, ahead of children', () => {
    const jsx = source.slice(source.indexOf('<PHProvider'), source.indexOf('</PHProvider>'));
    const consentSync = jsx.indexOf('<ConsentSync />');
    const registerSurface = jsx.indexOf('<RegisterSurfaceProperty />');
    const lifecycle = jsx.indexOf('<AppLifecycleTracker />');
    const children = jsx.indexOf('{children}');

    expect(consentSync).toBeGreaterThan(-1);
    expect(registerSurface).toBeGreaterThan(-1);
    expect(lifecycle).toBeGreaterThan(-1);
    expect(children).toBeGreaterThan(-1);

    // Fixed order, all before children: a conditional sibling would shift
    // children's index and remount the crisis subtree. ConsentSync leads so its
    // optIn/optOut effect runs before the app subtree's effects can emit.
    expect(consentSync).toBeLessThan(registerSurface);
    expect(registerSurface).toBeLessThan(lifecycle);
    expect(lifecycle).toBeLessThan(children);

    // No `&&` / ternary gating on any of them.
    expect(/[&?]\s*<(ConsentSync|RegisterSurfaceProperty|AppLifecycleTracker)/.test(jsx)).toBe(false);
    expect(/[&?]\s*<(ConsentSync|RegisterSurfaceProperty|AppLifecycleTracker)/.test('{ok && <ConsentSync />}')).toBe(true);
  });
});
