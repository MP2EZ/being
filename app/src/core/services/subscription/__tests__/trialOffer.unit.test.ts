/**
 * FEAT-822: the pure trial-offer helpers. IAPService.test.ts drives them through the
 * service; this file pins the edge cases one table at a time.
 */

import type { ProductSubscription } from 'react-native-iap';
import {
  androidRecurringPrice,
  findIOSIntroFreeTrial,
  formatTrialDuration,
  selectAndroidOffers,
} from '../trialOffer';

describe('formatTrialDuration', () => {
  it.each([
    [{ iso: 'P3D' }, '3 days'],
    [{ iso: 'P1W' }, '1 week'],
    [{ iso: 'P2W' }, '2 weeks'],
    [{ iso: 'P4W' }, '4 weeks'], // never normalised to a month
    [{ iso: 'P28D' }, '28 days'],
    [{ iso: 'P1M' }, '1 month'],
    [{ iso: 'P1Y' }, '1 year'],
    [{ iso: 'P1W', count: 2 }, '2 weeks'],
    [{ unit: 'day', value: 14 }, '14 days'],
    [{ unit: 'month', value: 1 }, '1 month'],
    [{ unit: 'day', value: 14, count: 2 }, '28 days'],
    [{ unit: 'month', value: 1, count: 2 }, '2 months'],
    [{ unit: 'month', value: 1, count: null }, '1 month'],
  ])('%j -> %s', (input, expected) => {
    expect(formatTrialDuration(input)).toBe(expected);
  });

  it.each([
    [{ iso: '' }],
    [{ iso: 'P1M2D' }],
    [{ iso: 'P0D' }],
    [{ iso: '1M' }],
    [{ unit: 'unknown', value: 1 }],
    [{ unit: 'day', value: 0 }],
    [{ unit: 'day', value: 1.5 }],
    [{ unit: 'day', value: 3, count: 0 }],
  ])('%j -> null (read as unknown)', (input) => {
    expect(formatTrialDuration(input)).toBeNull();
  });
});

const iosProduct = (subscriptionOffers: unknown) =>
  ({ id: 'com.being.subscription.monthly', subscriptionInfoIOS: undefined, subscriptionOffers }) as unknown as ProductSubscription;

describe('findIOSIntroFreeTrial', () => {
  const trial = { type: 'introductory', paymentMode: 'free-trial', period: { unit: 'month', value: 1 }, periodCount: 1 };

  it('finds the introductory free trial, ignoring other offers', () => {
    const promo = { type: 'promotional', paymentMode: 'free-trial' };
    const paidIntro = { type: 'introductory', paymentMode: 'pay-as-you-go' };
    expect(findIOSIntroFreeTrial(iosProduct([promo, paidIntro, trial]))).toBe(trial);
  });

  it.each([[null], [undefined], [[]], [[{ type: 'introductory', paymentMode: 'pay-up-front' }]]])(
    'no free-trial intro offer (%j) -> null',
    (offers) => {
      expect(findIOSIntroFreeTrial(iosProduct(offers))).toBeNull();
    },
  );

  it('never reads subscriptionInfoIOS (the bridge sets it undefined)', () => {
    const product = { id: 'x', subscriptionInfoIOS: { introductoryOffer: { paymentMode: 'free-trial' } } } as unknown as ProductSubscription;
    expect(findIOSIntroFreeTrial(product)).toBeNull();
  });
});

const phase = (micros: string, billingPeriod: string, recurrenceMode: number, formattedPrice: string) =>
  ({ priceAmountMicros: micros, billingPeriod, recurrenceMode, formattedPrice, billingCycleCount: 1, priceCurrencyCode: 'USD' });
const offer = (basePlanId: string, offerId: string | null, phases: unknown[], token: string) =>
  ({ basePlanId, offerId, offerTags: [], offerToken: token, pricingPhases: { pricingPhaseList: phases } });
const androidProduct = (details: unknown) =>
  ({ id: 'subscription_monthly', subscriptionOfferDetailsAndroid: details }) as unknown as ProductSubscription;

const BASE = offer('monthly', null, [phase('9990000', 'P1M', 1, '$9.99')], 'tok-base');
const TRIAL = offer('monthly', 'free-trial', [phase('0', 'P1M', 2, 'Free'), phase('9990000', 'P1M', 1, '$9.99')], 'tok-trial');

describe('selectAndroidOffers', () => {
  it('picks the base plan and its free trial by structure, whatever the order', () => {
    expect(selectAndroidOffers(androidProduct([TRIAL, BASE]))).toEqual({ basePlanOffer: BASE, trialOffer: TRIAL });
  });

  it('ignores a free offer on ANOTHER base plan and a non-zero intro offer', () => {
    const otherPlanTrial = offer('yearly', 'free-trial', [phase('0', 'P1M', 2, 'Free')], 'tok-other');
    const paidIntro = offer('monthly', 'intro', [phase('4990000', 'P1M', 2, '$4.99')], 'tok-intro');
    expect(selectAndroidOffers(androidProduct([otherPlanTrial, paidIntro, BASE]))).toEqual({
      basePlanOffer: BASE,
      trialOffer: null,
    });
  });

  it.each([
    ['no offers', []],
    ['no base-plan offer', [TRIAL]],
    ['two base-plan offers', [BASE, offer('monthly-legacy', null, [], 'tok-legacy')]],
    ['no offer list at all', undefined],
  ])('%s -> null (no single base plan to apply)', (_label, details) => {
    expect(selectAndroidOffers(androidProduct(details))).toBeNull();
  });
});

describe('androidRecurringPrice', () => {
  it('is the infinite-recurring phase, not the last phase', () => {
    const lastIsFinite = offer('monthly', 'x', [phase('9990000', 'P1M', 1, '$9.99'), phase('0', 'P1W', 2, 'Free')], 't');
    expect(androidRecurringPrice(lastIsFinite)).toBe('$9.99');
  });

  it('is null when no phase renews', () => {
    expect(androidRecurringPrice(offer('monthly', 'x', [phase('0', 'P1W', 2, 'Free')], 't'))).toBeNull();
  });
});
