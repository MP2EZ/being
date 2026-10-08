/**
 * SubscriptionStatusCard — per-status rendering, countdown timer, and manage links (MAINT-744)
 *
 * Pins the component's PROP CONTRACT against the real zustand subscription store
 * (only expo-secure-store is mocked, as subscriptionStore.test.ts does):
 *   - the title / call-to-action shown for each subscription state
 *   - which states wire `onUpgrade` and which route through "manage"
 *   - the one-minute countdown interval and its cleanup
 *   - the platform store URL fallback when `onManage` is not supplied
 *
 * This suite pins what the component does with the props it is given, not that
 * the route supplies them. The shipped route is SubscriptionStatusRoute, which wires
 * `onUpgrade` and leaves `onManage` to the store-URL fallback; that wiring is pinned
 * by SubscriptionStatusRoute.test.tsx (DEBUG-760).
 *
 * The crisis-support note on the expired state is a wellness-safety message:
 * crisis access is never gated by subscription status, so it is asserted present
 * for 'expired' and absent everywhere else.
 */

import React from 'react';
import { Linking, Platform } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import SubscriptionStatusCard from '../SubscriptionStatusCard';
import { useSubscriptionStore } from '@/core/stores/subscriptionStore';
import type { SubscriptionMetadata, SubscriptionStatus } from '@/core/types/subscription';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const NOW = new Date('2026-01-15T12:00:00.000Z').getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

const IOS_URL = 'https://apps.apple.com/account/subscriptions';
const ANDROID_URL = 'https://play.google.com/store/account/subscriptions';

const mockCanOpenURL = Linking.canOpenURL as jest.Mock;
const mockOpenURL = Linking.openURL as jest.Mock;

function makeSubscription(
  status: SubscriptionStatus,
  overrides: Partial<SubscriptionMetadata> = {},
): SubscriptionMetadata {
  return {
    id: 'sub-1',
    userId: 'user-1',
    platform: 'apple',
    platformSubscriptionId: 'plat-1',
    status,
    tier: 'standard',
    interval: 'monthly',
    priceUsd: 0,
    currency: 'USD',
    trialStartDate: null,
    trialEndDate: null,
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    gracePeriodEnd: null,
    lastReceiptVerified: null,
    receiptData: null,
    lastPaymentDate: null,
    paymentFailureCount: 0,
    crisisAccessEnabled: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function setSubscription(subscription: SubscriptionMetadata | null) {
  act(() => {
    useSubscriptionStore.setState({ subscription });
  });
}

const ORIGINAL_OS = Platform.OS;

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  mockCanOpenURL.mockReset();
  mockCanOpenURL.mockResolvedValue(true);
  mockOpenURL.mockReset();
  mockOpenURL.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  Platform.OS = ORIGINAL_OS;
  useSubscriptionStore.setState({ subscription: null, featureAccess: null, isLoading: false, error: null });
});

describe('SubscriptionStatusCard — per-status title and button', () => {
  const CRISIS_NOTE = 'Crisis support features remain accessible';

  const table: Array<[string, SubscriptionStatus | null, string, string]> = [
    ['none (no subscription)', null, 'Start Your Free Trial', 'Start Free Trial'],
    ['trial', 'trial', 'Your Trial is Active', 'Upgrade Now'],
    ['active', 'active', 'Subscription Active', 'Manage Subscription'],
    ['grace', 'grace', 'Update Payment Method', 'Update Payment'],
    ['expired', 'expired', 'Subscription Ended', 'Renew Subscription'],
    ['crisis_only', 'crisis_only', 'Crisis Support Always Available', 'Subscribe'],
  ];

  test.each(table)('%s shows its title and button', (_label, status, title, button) => {
    setSubscription(status === null ? null : makeSubscription(status, {
      trialEndDate: NOW + DAY_MS,
      gracePeriodEnd: NOW + DAY_MS,
    }));
    const { getByText } = render(<SubscriptionStatusCard />);
    expect(getByText(title)).toBeTruthy();
    expect(getByText(button)).toBeTruthy();
  });

  test.each(table)('%s: crisis note present only for expired', (_label, status) => {
    setSubscription(status === null ? null : makeSubscription(status, {
      trialEndDate: NOW + DAY_MS,
      gracePeriodEnd: NOW + DAY_MS,
    }));
    const { queryByText } = render(<SubscriptionStatusCard />);
    if (status === 'expired') {
      expect(queryByText(CRISIS_NOTE)).toBeTruthy();
    } else {
      expect(queryByText(CRISIS_NOTE)).toBeNull();
    }
  });

  it('renders nothing for a status the component does not know (reachable only via a cast)', () => {
    setSubscription(makeSubscription('bogus' as unknown as SubscriptionStatus));
    const { toJSON } = render(<SubscriptionStatusCard />);
    expect(toJSON()).toBeNull();
  });
});

describe('SubscriptionStatusCard — onUpgrade wiring', () => {
  const upgradeStates: Array<[string, SubscriptionStatus | null, string]> = [
    ['none', null, 'Start Free Trial'],
    ['trial', 'trial', 'Upgrade Now'],
    ['expired', 'expired', 'Renew Subscription'],
    ['crisis_only', 'crisis_only', 'Subscribe'],
  ];

  test.each(upgradeStates)('%s: pressing the button fires onUpgrade', (_label, status, button) => {
    setSubscription(status === null ? null : makeSubscription(status, { trialEndDate: NOW + DAY_MS }));
    const onUpgrade = jest.fn();
    const { getByText } = render(<SubscriptionStatusCard onUpgrade={onUpgrade} />);
    fireEvent.press(getByText(button));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['active', 'Manage Subscription'],
    ['grace', 'Update Payment'],
  ] as const)('%s: its button routes through manage, not onUpgrade', async (status, button) => {
    setSubscription(makeSubscription(status, { gracePeriodEnd: NOW + DAY_MS }));
    const onUpgrade = jest.fn();
    const onManage = jest.fn();
    const { getByText } = render(<SubscriptionStatusCard onUpgrade={onUpgrade} onManage={onManage} />);
    await act(async () => {
      fireEvent.press(getByText(button));
    });
    expect(onManage).toHaveBeenCalledTimes(1);
    expect(onUpgrade).not.toHaveBeenCalled();
  });
});

describe('SubscriptionStatusCard — countdown', () => {
  it('trial: shows singular "1 day remaining" at +1 day and plural "3 days remaining" at +3 days', () => {
    setSubscription(makeSubscription('trial', { trialEndDate: NOW + DAY_MS }));
    const one = render(<SubscriptionStatusCard />);
    expect(one.getByText('1 day remaining')).toBeTruthy();
    one.unmount();

    setSubscription(makeSubscription('trial', { trialEndDate: NOW + 3 * DAY_MS }));
    const three = render(<SubscriptionStatusCard />);
    expect(three.getByText('3 days remaining')).toBeTruthy();
  });

  it('grace: shows singular "1 day remaining" at +1 day and plural "3 days remaining" at +3 days', () => {
    setSubscription(makeSubscription('grace', { gracePeriodEnd: NOW + DAY_MS }));
    const one = render(<SubscriptionStatusCard />);
    expect(one.getByText('1 day remaining')).toBeTruthy();
    one.unmount();

    setSubscription(makeSubscription('grace', { gracePeriodEnd: NOW + 3 * DAY_MS }));
    const three = render(<SubscriptionStatusCard />);
    expect(three.getByText('3 days remaining')).toBeTruthy();
  });

  it('runs one interval while mounted and clears it on unmount', () => {
    setSubscription(makeSubscription('trial', { trialEndDate: NOW + 3 * DAY_MS }));
    const setSpy = jest.spyOn(global, 'setInterval');
    const clearSpy = jest.spyOn(global, 'clearInterval');
    // React's scheduler leaves zero-delay timers pending after a render/unmount;
    // flush them so the count below is the card's interval alone.
    const flushScheduler = () => act(() => { jest.advanceTimersByTime(0); });

    const { unmount } = render(<SubscriptionStatusCard />);
    flushScheduler();
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);
    expect(jest.getTimerCount()).toBe(1);

    unmount();
    flushScheduler();
    expect(clearSpy).toHaveBeenCalledWith(setSpy.mock.results[0]?.value);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('re-reads the remaining days when the 60s interval fires', () => {
    // 1 day + 30s out: ceil -> 2 days now; after 60s it is 1 day - 30s out: ceil -> 1 day.
    setSubscription(makeSubscription('trial', { trialEndDate: NOW + DAY_MS + 30_000 }));
    const { getByText, queryByText } = render(<SubscriptionStatusCard />);
    expect(getByText('2 days remaining')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(getByText('1 day remaining')).toBeTruthy();
    expect(queryByText('2 days remaining')).toBeNull();
  });
});

describe('SubscriptionStatusCard — Manage subscription', () => {
  it('onManage prop wins: it is called and Linking.canOpenURL is never consulted', async () => {
    setSubscription(makeSubscription('active'));
    const onManage = jest.fn();
    const { getByText } = render(<SubscriptionStatusCard onManage={onManage} />);
    await act(async () => {
      fireEvent.press(getByText('Manage Subscription'));
    });
    expect(onManage).toHaveBeenCalledTimes(1);
    expect(mockCanOpenURL).not.toHaveBeenCalled();
    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  it.each([
    ['ios', IOS_URL],
    ['android', ANDROID_URL],
  ] as const)('without onManage on %s opens the platform subscriptions URL', async (os, url) => {
    Platform.OS = os;
    setSubscription(makeSubscription('active'));
    const { getByText } = render(<SubscriptionStatusCard />);
    await act(async () => {
      fireEvent.press(getByText('Manage Subscription'));
    });
    expect(mockCanOpenURL).toHaveBeenCalledWith(url);
    expect(mockOpenURL).toHaveBeenCalledWith(url);
  });

  it('does not open the URL, and does not throw, when canOpenURL resolves false', async () => {
    mockCanOpenURL.mockResolvedValue(false);
    setSubscription(makeSubscription('active'));
    const { getByText } = render(<SubscriptionStatusCard />);
    await act(async () => {
      fireEvent.press(getByText('Manage Subscription'));
    });
    expect(mockCanOpenURL).toHaveBeenCalledTimes(1);
    expect(mockOpenURL).not.toHaveBeenCalled();
  });
});
