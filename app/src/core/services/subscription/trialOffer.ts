/**
 * STORE FREE-TRIAL OFFER READING (FEAT-822, intro-offer A)
 *
 * Pure helpers IAPService uses to read whether the store offers this account a free trial,
 * and which offer a purchase should apply. Type-only imports from react-native-iap, so the
 * module loads no native binding and tests drive it directly.
 *
 * Founder rulings (2026-10-19): trial eligibility belongs to the stores (Apple introductory
 * offers, Google Play free-trial offers), which enforce it per store account across
 * reinstalls and account deletion. Being keeps no trial bookkeeping, so nothing here
 * persists anything.
 *
 * iOS: the offer is read from `product.subscriptionOffers`. Never `subscriptionInfoIOS` —
 * react-native-iap 15.3.1 sets it to undefined at the bridge (type-bridge.ts:244), so a read
 * through it would always say "no trial".
 * Android: offers are picked by structure, never by array position. The base plan is the
 * single offer without an offerId; the free trial is an offer on that base plan whose first
 * pricing phase is free.
 */

import type {
  PricingPhaseAndroid,
  ProductSubscription,
  ProductSubscriptionAndroidOfferDetails,
  SubscriptionOffer,
} from 'react-native-iap';

export type TrialOffer =
  | { state: 'eligible'; durationLabel: string; renewalPriceLabel: string; offerToken?: string }
  | { state: 'ineligible' }
  | { state: 'unknown' };

export const TRIAL_UNKNOWN: TrialOffer = Object.freeze({ state: 'unknown' });
export const TRIAL_INELIGIBLE: TrialOffer = Object.freeze({ state: 'ineligible' });

type DurationUnit = 'day' | 'week' | 'month' | 'year';
const ISO_UNITS: Record<string, DurationUnit> = { D: 'day', W: 'week', M: 'month', Y: 'year' };

function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0;
}

/**
 * A human duration ("1 month", "14 days") from an ISO-8601 period (Play's `billingPeriod`,
 * e.g. P1M) or an iOS `{ unit, value }` period, times a repeat count (iOS `periodCount`,
 * Play `billingCycleCount`). P4W stays "4 weeks": it is not normalised to a month. Anything
 * unparseable is null, which callers read as "unknown".
 */
export function formatTrialDuration(
  input: { iso: string; count?: number | null | undefined } | { unit: string; value: number; count?: number | null | undefined },
): string | null {
  let unit: DurationUnit | undefined;
  let value: number;
  if ('iso' in input) {
    const m = /^P(\d+)([DWMY])$/.exec(input.iso ?? '');
    if (!m) return null;
    unit = ISO_UNITS[m[2]!];
    value = Number(m[1]);
  } else {
    unit = (['day', 'week', 'month', 'year'] as const).find((u) => u === input.unit);
    value = input.value;
  }
  const count = input.count ?? 1;
  if (!unit || !isPositiveInt(value) || !isPositiveInt(count)) return null;
  const n = value * count;
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

/** The iOS introductory free-trial offer, or null. A null offer list (no offers) is null. */
export function findIOSIntroFreeTrial(product: ProductSubscription): SubscriptionOffer | null {
  const offers = (product as { subscriptionOffers?: SubscriptionOffer[] | null }).subscriptionOffers;
  if (!Array.isArray(offers)) return null;
  return offers.find((o) => o?.type === 'introductory' && o?.paymentMode === 'free-trial') ?? null;
}

export interface AndroidOffers {
  basePlanOffer: ProductSubscriptionAndroidOfferDetails;
  trialOffer: ProductSubscriptionAndroidOfferDetails | null;
}

/**
 * The base-plan offer and, if present, the free-trial offer on that base plan. Null unless
 * there is exactly one base-plan offer (an offer with no offerId): with none or several,
 * "the product's base plan" has no single referent, and guessing would apply the wrong offer.
 */
export function selectAndroidOffers(product: ProductSubscription): AndroidOffers | null {
  const details = (product as { subscriptionOfferDetailsAndroid?: ProductSubscriptionAndroidOfferDetails[] | null })
    .subscriptionOfferDetailsAndroid;
  if (!Array.isArray(details)) return null;
  const bases = details.filter((o) => o != null && o.offerId == null);
  if (bases.length !== 1) return null;
  const basePlanOffer = bases[0]!;
  const trialOffer = details.find((o) =>
    o != null &&
    o.offerId != null &&
    o.basePlanId === basePlanOffer.basePlanId &&
    o.pricingPhases?.pricingPhaseList?.[0]?.priceAmountMicros === '0'
  ) ?? null;
  return { basePlanOffer, trialOffer };
}

/** The free first phase of a Play trial offer (its duration), or null. */
export function androidTrialPhase(offer: ProductSubscriptionAndroidOfferDetails): PricingPhaseAndroid | null {
  const first = offer.pricingPhases?.pricingPhaseList?.[0];
  return first && first.priceAmountMicros === '0' ? first : null;
}

/** INFINITE_RECURRING in Play Billing's RecurrenceMode: the price that renews. */
const RECURRENCE_INFINITE = 1;

/** The renewal price of a Play offer: its infinite-recurring phase, never "the last phase". */
export function androidRecurringPrice(offer: ProductSubscriptionAndroidOfferDetails): string | null {
  const phase = offer.pricingPhases?.pricingPhaseList?.find((p) => p?.recurrenceMode === RECURRENCE_INFINITE);
  return phase?.formattedPrice ? phase.formattedPrice : null;
}
