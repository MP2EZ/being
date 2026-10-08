/**
 * SubscriptionStatus route — every button the card shows does something (DEBUG-760)
 *
 * The navigator used to register SubscriptionStatusCard directly, so it mounted with no
 * `onUpgrade` and Start Free Trial / Upgrade Now / Renew / Subscribe had `onPress={undefined}`.
 * SubscriptionStatusRoute is the registered component now: it wires every upgrade button to
 * the 'Subscription' paywall route and leaves Manage / Update Payment on the card's own
 * store-URL fallback.
 *
 * Two halves, because either alone can pass on a broken route:
 *   - behaviour: the wrapper, rendered with NO props as the navigator mounts it;
 *   - registration: CleanRootNavigator registers the wrapper, not the bare card (a green
 *     wrapper test is worthless while the navigator still mounts the card).
 *
 * The crisis-support note on the expired state is a wellness-safety message and must still
 * render through the wrapper.
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import { Linking, Platform } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import SubscriptionStatusRoute from '../SubscriptionStatusRoute';
import { useSubscriptionStore } from '@/core/stores/subscriptionStore';
import type { SubscriptionMetadata, SubscriptionStatus } from '@/core/types/subscription';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const NOW = new Date('2026-01-15T12:00:00.000Z').getTime();
const DAY_MS = 24 * 60 * 60 * 1000;
const IOS_URL = 'https://apps.apple.com/account/subscriptions';

const mockCanOpenURL = Linking.canOpenURL as jest.Mock;
const mockOpenURL = Linking.openURL as jest.Mock;

function makeSubscription(status: SubscriptionStatus): SubscriptionMetadata {
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
    trialEndDate: NOW + DAY_MS,
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    gracePeriodEnd: NOW + DAY_MS,
    lastReceiptVerified: null,
    receiptData: null,
    lastPaymentDate: null,
    paymentFailureCount: 0,
    crisisAccessEnabled: true,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function setSubscription(status: SubscriptionStatus | null) {
  act(() => {
    useSubscriptionStore.setState({ subscription: status === null ? null : makeSubscription(status) });
  });
}

const ORIGINAL_OS = Platform.OS;

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  mockNavigate.mockReset();
  mockCanOpenURL.mockReset();
  mockCanOpenURL.mockResolvedValue(true);
  mockOpenURL.mockReset();
  mockOpenURL.mockResolvedValue(undefined);
  Platform.OS = 'ios';
});

afterEach(() => {
  jest.useRealTimers();
  Platform.OS = ORIGINAL_OS;
  useSubscriptionStore.setState({ subscription: null, featureAccess: null, isLoading: false, error: null });
});

describe('SubscriptionStatusRoute — mounted with no props, as the navigator mounts it', () => {
  test.each([
    ['none (no subscription)', null, 'Start Free Trial'],
    ['trial', 'trial', 'Upgrade Now'],
    ['expired', 'expired', 'Renew Subscription'],
    ['crisis_only', 'crisis_only', 'Subscribe'],
  ] as const)('%s: its upgrade button opens the Subscription paywall', (_label, status, button) => {
    setSubscription(status);
    const { getByText } = render(<SubscriptionStatusRoute />);

    fireEvent.press(getByText(button));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('Subscription');
    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  test.each([
    ['active', 'Manage Subscription'],
    ['grace', 'Update Payment'],
  ] as const)('%s: "%s" keeps the store-URL behaviour and does not navigate', async (status, button) => {
    setSubscription(status);
    const { getByText } = render(<SubscriptionStatusRoute />);

    await act(async () => {
      fireEvent.press(getByText(button));
    });

    expect(mockOpenURL).toHaveBeenCalledWith(IOS_URL);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('expired still shows the crisis-support note', () => {
    setSubscription('expired');
    const { getByText } = render(<SubscriptionStatusRoute />);
    expect(getByText('Crisis support features remain accessible')).toBeTruthy();
  });
});

describe('CleanRootNavigator registers the wrapper for SubscriptionStatus', () => {
  const NAVIGATOR = path.join(__dirname, '../../../navigation/CleanRootNavigator.tsx');

  /** Strip block and line comments (DEBUG-390): the file names the bare card in prose. */
  function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  }

  it('the SubscriptionStatus screen mounts SubscriptionStatusRoute, never the bare card', () => {
    const code = stripComments(fs.readFileSync(NAVIGATOR, 'utf8'));
    const start = code.indexOf('name="SubscriptionStatus"');
    expect(start).toBeGreaterThan(-1);
    // The screen element, from its name to its self-closing end.
    const screen = code.slice(start, code.indexOf('/>', start));
    expect(screen).toMatch(/component\s*=\s*\{\s*SubscriptionStatusRoute\s*\}/);
    expect(screen).not.toMatch(/component\s*=\s*\{\s*SubscriptionStatusCard\s*\}/);
  });
});
