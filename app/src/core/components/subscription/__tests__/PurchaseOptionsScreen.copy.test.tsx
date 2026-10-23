/**
 * PurchaseOptionsScreen copy (DEBUG-709 AC1 + AC4).
 *
 * The paywall offered a local "28-day free trial (no payment)" no store would honour. Trials
 * are store intro offers now, so in every subscription state the paywall renders no trial,
 * duration or "no payment" claim, keeps its paid Subscribe button, and keeps the crisis
 * guarantee banner. Rendered output, never source text. Mocks follow
 * PurchaseOptionsScreen.restore.unit.test.tsx.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import PurchaseOptionsScreen from '../PurchaseOptionsScreen';
import { useSubscriptionStore } from '@/core/stores/subscriptionStore';
import type { SubscriptionStatus } from '@/core/types/subscription';
import { makeStoreBackedSubscription } from '@tests/helpers/subscriptionFixtures';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

const mockService = {
  getPlatform: jest.fn(() => 'apple' as 'apple' | 'google' | 'none'),
  getProducts: jest.fn(() => []),
  getProduct: jest.fn(() => null),
  restorePurchases: jest.fn(),
  verifyReceipt: jest.fn(),
  finishTransaction: jest.fn(() => Promise.resolve()),
  purchaseSubscription: jest.fn(),
};
// Getters, not values: the screen's import is hoisted above `mockService`.
jest.mock('@/core/services/subscription/IAPService', () => ({
  __esModule: true,
  get IAPService() {
    return mockService;
  },
  useIAPService: () => ({ isReady: true, service: mockService }),
}));

const STATES: Array<SubscriptionStatus | null> = [null, 'trial', 'active', 'grace', 'expired', 'crisis_only'];

describe('PurchaseOptionsScreen — no local trial (DEBUG-709)', () => {
  test.each(STATES)('%s: no trial, duration or "no payment" claim; Subscribe and the crisis banner remain', (status) => {
    useSubscriptionStore.setState({
      subscription: status === null ? null : makeStoreBackedSubscription(status),
      isLoading: false,
      error: null,
    });
    const { queryByText, getByText } = render(<PurchaseOptionsScreen />);

    expect(queryByText(/free trial|try free|28-day|no payment/i)).toBeNull();
    expect(queryByText(/start free trial/i)).toBeNull();
    expect(getByText('Subscribe Now')).toBeTruthy();
    expect(getByText('Choose the plan that fits your practice.')).toBeTruthy();
    expect(getByText(/Crisis support features always accessible/)).toBeTruthy();
  });
});
