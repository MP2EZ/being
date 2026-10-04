/**
 * PurchaseOptionsScreen — Restore Purchases (DEBUG-720).
 *
 * The screen used to verify each restored purchase itself, call
 * updateSubscriptionStatus('active') — a no-op when no subscription is loaded —
 * then acknowledge the transaction and show "Purchases Restored" regardless.
 * These tests pin the screen to the store's outcome: success only when a
 * purchase was actually applied, and no acknowledgement for one that wasn't.
 *
 * The store is real; only the IAP SDK boundary and SecureStore are mocked, so
 * the store's dynamic import of IAPService resolves to the same mock the
 * screen's hook returns.
 */

import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import PurchaseOptionsScreen from '../PurchaseOptionsScreen';
import { useSubscriptionStore } from '@/core/stores/subscriptionStore';
import { DEFAULT_SUBSCRIPTION_CONFIG, type SubscriptionMetadata } from '@/core/types/subscription';

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
// Getters, not values: the screen's import is hoisted above `mockService`, so a
// plain property would capture it before initialisation.
jest.mock('@/core/services/subscription/IAPService', () => ({
  __esModule: true,
  get IAPService() {
    return mockService;
  },
  useIAPService: () => ({ isReady: true, service: mockService }),
}));

const mockSetItem = SecureStore.setItemAsync as jest.Mock;
const { apple } = DEFAULT_SUBSCRIPTION_CONFIG.products;
const restored = (productId: string) => ({
  productId,
  transactionReceipt: 'receipt-restore',
  orderId: 'order-restore',
});

function activeSubscription(): SubscriptionMetadata {
  const now = Date.now();
  return {
    id: 'sub-existing',
    userId: 'user-1',
    platform: 'apple',
    platformSubscriptionId: 'plat-existing',
    status: 'active',
    tier: 'standard',
    interval: 'monthly',
    priceUsd: 7.99,
    currency: 'USD',
    trialStartDate: null,
    trialEndDate: null,
    subscriptionStartDate: now,
    subscriptionEndDate: null,
    gracePeriodEnd: null,
    lastReceiptVerified: now,
    receiptData: 'receipt-existing',
    lastPaymentDate: now,
    paymentFailureCount: 0,
    crisisAccessEnabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

const alertTitles = () => (Alert.alert as jest.Mock).mock.calls.map((call) => call[0]);

async function tapRestore() {
  const screen = render(<PurchaseOptionsScreen />);
  fireEvent.press(screen.getByLabelText('Restore previous purchases'));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
  return screen;
}

describe('PurchaseOptionsScreen — Restore Purchases (DEBUG-720)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetItem.mockResolvedValue(undefined);
    mockService.getPlatform.mockReturnValue('apple');
    useSubscriptionStore.setState({
      subscription: null,
      featureAccess: null,
      isLoading: false,
      isVerifyingReceipt: false,
      error: null,
    });
  });

  it('with nothing loaded, a valid restore shows success and leaves an active subscription', async () => {
    mockService.restorePurchases.mockResolvedValue([restored(apple.yearly)]);
    mockService.verifyReceipt.mockResolvedValue({ valid: true, subscriptionId: 'sub-r', expiresDate: null });

    await tapRestore();

    expect(alertTitles()).toEqual(['Purchases Restored']);
    expect(useSubscriptionStore.getState().subscription?.status).toBe('active');
    expect(mockService.finishTransaction).toHaveBeenCalledTimes(1);
  });

  it('a restore that is not applied shows no success and is not acknowledged', async () => {
    mockService.restorePurchases.mockResolvedValue([restored(apple.yearly)]);
    mockService.verifyReceipt.mockResolvedValue({ valid: false, error: 'Receipt verification failed' });

    await tapRestore();

    expect(alertTitles()).toEqual(['Restore Failed']);
    expect((Alert.alert as jest.Mock).mock.calls[0][1]).toBe('Could not verify your previous purchases.');
    expect(useSubscriptionStore.getState().subscription).toBeNull();
    expect(mockService.finishTransaction).not.toHaveBeenCalled();
  });

  it('an already-active record does not turn a failed restore into a success', async () => {
    // The stale-state trap: checking "is the store active afterwards" alone passes
    // here even though this restore applied nothing.
    useSubscriptionStore.setState({ subscription: activeSubscription() });
    mockService.restorePurchases.mockResolvedValue([restored(apple.yearly)]);
    mockService.verifyReceipt.mockResolvedValue({ valid: true, subscriptionId: 'sub-r', expiresDate: null });
    mockSetItem.mockRejectedValueOnce(new Error('keychain locked'));

    await tapRestore();

    expect(alertTitles()).toEqual(['Restore Failed']);
    expect(mockService.finishTransaction).not.toHaveBeenCalled();
  });

  it('shows the existing "No Purchases Found" message when there is nothing to restore', async () => {
    mockService.restorePurchases.mockResolvedValue([]);

    await tapRestore();

    expect(alertTitles()).toEqual(['No Purchases Found']);
    expect(mockService.verifyReceipt).not.toHaveBeenCalled();
  });
});
