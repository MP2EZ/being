/**
 * INFRA-542 — AppLifecycleTracker mounts regardless of analytics consent.
 *
 * WHY THIS PIN EXISTS. The tracker owns two unrelated jobs: the always-on
 * `setLastActiveTimestamp` write that feeds the Home intro animation, and the
 * consent-gated `app_opened` / `app_backgrounded` emits. Mounting it only on a
 * consented path reads as the tidier arrangement and is silently wrong — it
 * stops the intro-animation timestamp for every user who has not consented to
 * analytics, with no failing test and nothing user-visible until someone
 * notices Home animating differently.
 *
 * The tracker's own suite proves the write survives a missing PostHog client.
 * It cannot prove the component is RENDERED without consent. That is this
 * file's job.
 *
 * DEBUG-559 RESTATED THIS, AND RAISED THE STAKES. This file used to be titled
 * "mounts in BOTH branches", because the provider returned a bare fragment
 * without consent and <PHProvider> with it. That element-TYPE swap was the
 * DEBUG-559 defect — it destroyed and recreated every 988 affordance in the app
 * on an ordinary consent tap — so the consent branch is gone and there is only
 * one branch left. Unconditional mounting is therefore no longer merely the
 * tidy-vs-correct question above: React reconciles unkeyed children by
 * position, so a tracker rendered only under consent would shift `children`'s
 * index and remount the crisis subtree by a second route. The assertions below
 * are unchanged in spirit and stronger in consequence.
 *
 * The env override below is load-bearing, and more so than when it was written:
 * `__tests__/setup/env.mock.js` blanks EXPO_PUBLIC_POSTHOG_API_KEY for every
 * jest run and PostHogProvider reads it at MODULE SCOPE. Since the API-key
 * guard is now the file's ONLY conditional, without the override every case
 * here renders the fragment branch and the suite passes having never exercised
 * the shape a Release build takes. The branch-entered control asserts the
 * override actually took.
 */

jest.mock('@/core/config/env', () => {
  const actual = jest.requireActual('@/core/config/env');
  return {
    ...actual,
    env: {
      ...actual.env,
      EXPO_PUBLIC_POSTHOG_API_KEY: 'phc_infra542_branch_pin',
      EXPO_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com',
    },
  };
});

const PH_BRANCH_TEST_ID = 'infra542-ph-provider-branch';
jest.mock('posthog-react-native', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    PostHogProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(View, { testID: 'infra542-ph-provider-branch' }, children),
    usePostHog: () => null,
  };
});

const TRACKER_TEST_ID = 'infra542-lifecycle-tracker';
jest.mock('../AppLifecycleTracker', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    AppLifecycleTracker: () =>
      ReactActual.createElement(View, { testID: 'infra542-lifecycle-tracker' }),
    default: () => ReactActual.createElement(View, { testID: 'infra542-lifecycle-tracker' }),
  };
});

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { PostHogProvider } from '../PostHogProvider';
import { useConsentStore } from '@/core/stores/consentStore';

function setAnalyticsConsent(enabled: boolean): void {
  useConsentStore.setState({
    currentConsent: {
      preferences: { analyticsEnabled: enabled },
      universalOptOut: false,
    },
  } as unknown as Parameters<typeof useConsentStore.setState>[0]);
}

function renderProvider() {
  return render(
    <PostHogProvider>
      <Text testID="infra542-child">child</Text>
    </PostHogProvider>
  );
}

describe('PostHogProvider mounts AppLifecycleTracker regardless of consent (INFRA-542)', () => {
  beforeEach(() => {
    useConsentStore.setState({ currentConsent: null } as unknown as Parameters<
      typeof useConsentStore.setState
    >[0]);
  });

  it('mounts the tracker WITHOUT analytics consent', () => {
    setAnalyticsConsent(false);
    const { getByTestId } = renderProvider();

    // Control (DEBUG-559): the element type no longer depends on consent, so we
    // are inside <PHProvider> even here. Before the fix this asserted the
    // opposite — that inversion IS the fix, and it also proves the env override
    // took, since a blanked API key would land on the fragment branch instead.
    expect(getByTestId(PH_BRANCH_TEST_ID)).toBeTruthy();
    expect(getByTestId('infra542-child')).toBeTruthy();

    // The assertion this file exists for.
    expect(getByTestId(TRACKER_TEST_ID)).toBeTruthy();
  });

  it('mounts the tracker WITH analytics consent', () => {
    setAnalyticsConsent(true);
    const { getByTestId } = renderProvider();

    expect(getByTestId(PH_BRANCH_TEST_ID)).toBeTruthy();
    expect(getByTestId(TRACKER_TEST_ID)).toBeTruthy();
  });

  it('mounts exactly one tracker in either consent state', () => {
    // A second listener is what the item's AC forbids: the fix RELOCATES the
    // App.tsx listener, it does not add a sibling. Two mounted trackers would
    // double every emit and double-write lastActiveTimestamp.
    for (const enabled of [false, true]) {
      setAnalyticsConsent(enabled);
      const { getAllByTestId, unmount } = renderProvider();
      expect(getAllByTestId(TRACKER_TEST_ID)).toHaveLength(1);
      unmount();
    }
  });
});
