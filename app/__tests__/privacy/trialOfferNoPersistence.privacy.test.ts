/**
 * FEAT-822 AC1 (founder ruling 2026-10-19, compliance): a store free-trial eligibility read
 * persists nothing. The store is the only trial authority, so the result of
 * IAPService.getTrialOffer is never written to SecureStore, AsyncStorage or Supabase.
 *
 * Asserted as "no write call at all during the read", which is stronger than "no call carries
 * the result" and cannot be satisfied by a call that merely re-encodes it.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as RNIap from 'react-native-iap';
import { IAPService } from '@/core/services/subscription/IAPService';
import { supabaseService } from '@/core/services/supabase/SupabaseService';

jest.mock('react-native-iap', () => ({
  __esModule: true,
  initConnection: jest.fn(async () => true),
  endConnection: jest.fn(async () => true),
  purchaseUpdatedListener: jest.fn(() => ({ remove: jest.fn() })),
  purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
  fetchProducts: jest.fn(),
  requestPurchase: jest.fn(),
  isEligibleForIntroOfferIOS: jest.fn(async () => true),
  ErrorCode: { UserCancelled: 'E_USER_CANCELLED' },
}));

const mockInvoke = jest.fn();
jest.mock('@/core/services/supabase/SupabaseService', () => ({
  supabaseService: {
    getAuthenticatedClient: jest.fn(async () => ({ ok: true, client: { functions: { invoke: mockInvoke } } })),
    getClient: jest.fn(() => ({ functions: { invoke: mockInvoke } })),
  },
}));

const subscriptionTypes = require('@/core/types/subscription') as { APPLE_SUBSCRIPTION_GROUP_ID: unknown };
const rniap = RNIap as jest.Mocked<typeof RNIap>;

const IOS_PRODUCT = {
  id: 'com.being.subscription.monthly', type: 'subs', platform: 'ios', displayPrice: '$9.99',
  subscriptionInfoIOS: undefined,
  subscriptionOffers: [{ id: 'intro', type: 'introductory', paymentMode: 'free-trial', displayPrice: '$0.00', price: 0, period: { unit: 'month', value: 1 }, periodCount: 1 }],
};
const phase = (micros: string, billingPeriod: string, recurrenceMode: number, formattedPrice: string) =>
  ({ priceAmountMicros: micros, billingPeriod, recurrenceMode, formattedPrice, billingCycleCount: 1, priceCurrencyCode: 'USD' });
const ANDROID_PRODUCT = {
  id: 'subscription_monthly', type: 'subs', platform: 'android', displayPrice: '$9.99', subscriptionOffers: [],
  subscriptionOfferDetailsAndroid: [
    { basePlanId: 'monthly', offerId: null, offerTags: [], offerToken: 'tok-base', pricingPhases: { pricingPhaseList: [phase('9990000', 'P1M', 1, '$9.99')] } },
    { basePlanId: 'monthly', offerId: 'free-trial', offerTags: [], offerToken: 'tok-trial',
      pricingPhases: { pricingPhaseList: [phase('0', 'P1M', 2, 'Free'), phase('9990000', 'P1M', 1, '$9.99')] } },
  ],
};

describe('FEAT-822: a trial eligibility read persists nothing', () => {
  beforeEach(async () => {
    await IAPService.disconnect();
    subscriptionTypes.APPLE_SUBSCRIPTION_GROUP_ID = '21480000';
    (IAPService as unknown as { mockMode: boolean }).mockMode = false;
  });

  afterEach(() => {
    (IAPService as unknown as { mockMode: boolean }).mockMode = true;
    subscriptionTypes.APPLE_SUBSCRIPTION_GROUP_ID = null;
    jest.restoreAllMocks();
  });

  it.each([
    ['ios', IOS_PRODUCT, { state: 'eligible', durationLabel: '1 month', renewalPriceLabel: '$9.99' }],
    ['android', ANDROID_PRODUCT, { state: 'eligible', durationLabel: '1 month', renewalPriceLabel: '$9.99', offerToken: 'tok-trial' }],
  ] as const)('%s', async (os, product, expected) => {
    jest.replaceProperty(Platform, 'OS', os);
    rniap.fetchProducts.mockResolvedValue([product] as never);
    await IAPService.initialize();

    // Every write method the global storage mocks expose (the AsyncStorage mock has no multiSet).
    const writes = [
      jest.spyOn(SecureStore, 'setItemAsync'),
      ...(['setItem', 'multiSet', 'mergeItem'] as const)
        .filter((m) => typeof (AsyncStorage as unknown as Record<string, unknown>)[m] === 'function')
        .map((m) => jest.spyOn(AsyncStorage as unknown as Record<string, () => unknown>, m)),
    ];
    expect(writes.length).toBeGreaterThanOrEqual(2);
    mockInvoke.mockClear();
    (supabaseService.getAuthenticatedClient as jest.Mock).mockClear();

    // Non-vacuity: the read must actually produce the eligible result being protected.
    await expect(IAPService.getTrialOffer('monthly')).resolves.toEqual(expected);

    for (const w of writes) expect(w).not.toHaveBeenCalled();
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(supabaseService.getAuthenticatedClient).not.toHaveBeenCalled();
  });
});
