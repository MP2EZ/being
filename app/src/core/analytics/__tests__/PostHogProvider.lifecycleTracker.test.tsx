/**
 * INFRA-542 — AppLifecycleTracker mounts in BOTH PostHogProvider branches.
 *
 * WHY THIS PIN EXISTS. The tracker owns two unrelated jobs: the always-on
 * `setLastActiveTimestamp` write that feeds the Home intro animation, and the
 * consent-gated `app_opened` / `app_backgrounded` emits. Mounting it only
 * inside the gated `<PHProvider>` branch reads as the tidier arrangement and
 * is silently wrong — it stops the intro-animation timestamp for every user
 * who has not consented to analytics, with no failing test and nothing
 * user-visible until someone notices Home animating differently.
 *
 * The tracker's own suite proves the write survives a missing PostHog client.
 * It cannot prove the component is RENDERED on the path where the client is
 * missing. That is this file's only job.
 *
 * The env override below is load-bearing, for the reason DEBUG-557's
 * consent-remount suite documents at length: `__tests__/setup/env.mock.js`
 * blanks EXPO_PUBLIC_POSTHOG_API_KEY for every jest run and PostHogProvider
 * reads it at MODULE SCOPE, so without the override BOTH consent states render
 * the fragment branch — and this file would pass while testing one branch
 * twice. The branch-entered control asserts the override actually took.
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

describe('PostHogProvider mounts AppLifecycleTracker in both branches (INFRA-542)', () => {
  beforeEach(() => {
    useConsentStore.setState({ currentConsent: null } as unknown as Parameters<
      typeof useConsentStore.setState
    >[0]);
  });

  it('mounts the tracker on the UNGATED branch (analytics consent off)', () => {
    setAnalyticsConsent(false);
    const { getByTestId, queryByTestId } = renderProvider();

    // Control: we really are on the fragment branch, not the provider one.
    expect(queryByTestId(PH_BRANCH_TEST_ID)).toBeNull();
    expect(getByTestId('infra542-child')).toBeTruthy();

    // The assertion this file exists for.
    expect(getByTestId(TRACKER_TEST_ID)).toBeTruthy();
  });

  it('mounts the tracker on the GATED branch (analytics consent on)', () => {
    setAnalyticsConsent(true);
    const { getByTestId } = renderProvider();

    // Control: the env override took and we crossed into <PHProvider>. Without
    // this, a blanked API key would put both cases on the fragment branch and
    // this suite would pass having never tested the gated path.
    expect(getByTestId(PH_BRANCH_TEST_ID)).toBeTruthy();

    expect(getByTestId(TRACKER_TEST_ID)).toBeTruthy();
  });

  it('mounts exactly one tracker per branch', () => {
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
