/**
 * intervalFromProductId — store product ID -> SubscriptionInterval (MAINT-744)
 *
 * Pins the mapping the purchase listener and restorePurchases rely on (DEBUG-720).
 * The four literal IDs are pinned directly. The Apple IDs are documented as
 * unsettled, so a second table derives its cases from
 * DEFAULT_SUBSCRIPTION_CONFIG.products: if the IDs are renamed there, this suite
 * keeps asserting the mapping stays consistent without a literal edit.
 */
import { intervalFromProductId } from '../subscriptionProductInterval';
import { DEFAULT_SUBSCRIPTION_CONFIG } from '@/core/types/subscription';

describe('intervalFromProductId', () => {
  describe('literal product IDs', () => {
    test.each([
      ['com.being.subscription.monthly', 'monthly'],
      ['subscription_monthly', 'monthly'],
      ['com.being.subscription.yearly', 'yearly'],
      ['subscription_yearly', 'yearly'],
    ])('%s -> %s', (productId, interval) => {
      expect(intervalFromProductId(productId)).toBe(interval);
    });
  });

  describe('IDs from DEFAULT_SUBSCRIPTION_CONFIG.products', () => {
    const { apple, google } = DEFAULT_SUBSCRIPTION_CONFIG.products;

    test.each([
      ['apple.monthly', apple.monthly, 'monthly'],
      ['google.monthly', google.monthly, 'monthly'],
      ['apple.yearly', apple.yearly, 'yearly'],
      ['google.yearly', google.yearly, 'yearly'],
    ])('%s maps to %s', (_label, productId, interval) => {
      expect(intervalFromProductId(productId)).toBe(interval);
    });

    it('never maps a monthly ID and a yearly ID to the same interval', () => {
      expect(intervalFromProductId(apple.monthly)).not.toBe(intervalFromProductId(apple.yearly));
      expect(intervalFromProductId(google.monthly)).not.toBe(intervalFromProductId(google.yearly));
    });
  });

  describe('products this app does not sell', () => {
    test.each([
      ['empty string', ''],
      ['unknown id', 'com.example.not_ours'],
      ['near-miss casing', 'SUBSCRIPTION_MONTHLY'],
    ])('%s -> null', (_label, productId) => {
      expect(intervalFromProductId(productId)).toBeNull();
    });
  });
});
