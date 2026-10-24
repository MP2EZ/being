/**
 * DEBUG-827 — the key processVerifiedPurchase coalesces in-flight calls on.
 *
 * The identity is chosen BY PLATFORM, never `transactionId ?? purchaseToken`: on iOS
 * the purchaseToken is the JWS, which can differ between the listener's purchase and
 * getAvailablePurchases' copy of the same transaction. No identity means no key, and
 * no key means no coalescing (the pre-DEBUG-827 behaviour).
 */

import { purchaseCoalesceKey } from '../purchaseCoalesceKey';

describe('purchaseCoalesceKey (DEBUG-827)', () => {
  it.each([
    ['apple: the transactionId', 0, 'apple', { transactionId: '2000000847061713' }, '0:apple:2000000847061713'],
    [
      'apple: the JWS purchaseToken is ignored',
      0,
      'apple',
      { transactionId: '2000000847061713', purchaseToken: 'eyJ.jws-a' },
      '0:apple:2000000847061713',
    ],
    ['apple: no transactionId never falls back to the token', 0, 'apple', { purchaseToken: 'eyJ.jws-a' }, undefined],
    ['apple: an empty transactionId', 0, 'apple', { transactionId: '' }, undefined],
    ['apple: a non-string transactionId', 0, 'apple', { transactionId: 42 }, undefined],
    ['google: the purchaseToken', 0, 'google', { purchaseToken: 'opaque-play-token' }, '0:google:opaque-play-token'],
    [
      'google: a transactionId is ignored',
      0,
      'google',
      { transactionId: 'GPA.1', purchaseToken: 'opaque-play-token' },
      '0:google:opaque-play-token',
    ],
    ['google: no purchaseToken', 0, 'google', { transactionId: 'GPA.1' }, undefined],
    ['google: an empty purchaseToken', 0, 'google', { purchaseToken: '' }, undefined],
    ['none: never keyed', 0, 'none', { transactionId: '1', purchaseToken: 't' }, undefined],
    ['a null purchase', 0, 'apple', null, undefined],
    ['the generation is part of the key', 3, 'apple', { transactionId: '7' }, '3:apple:7'],
  ] as const)('%s', (_label, generation, platform, purchase, expected) => {
    expect(purchaseCoalesceKey(generation, platform, purchase)).toBe(expected);
  });

  it('one transaction under two generations yields two keys', () => {
    const purchase = { transactionId: '2000000847061713' };
    expect(purchaseCoalesceKey(1, 'apple', purchase)).not.toBe(purchaseCoalesceKey(2, 'apple', purchase));
  });

  it('the same id on the two platforms yields two keys', () => {
    const purchase = { transactionId: 'x', purchaseToken: 'x' };
    expect(purchaseCoalesceKey(0, 'apple', purchase)).not.toBe(purchaseCoalesceKey(0, 'google', purchase));
  });
});
