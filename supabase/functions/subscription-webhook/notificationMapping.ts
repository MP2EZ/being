/**
 * Store notification → subscription transition (DEBUG-739, DEBUG-751).
 *
 * Pure and import-free, so the mapping can be table-tested on its own. Two outcomes are
 * distinct and must stay distinct:
 *
 *   - `status: null` — a HANDLED notification that must not touch `status`. Apple's
 *     DID_CHANGE_RENEWAL_STATUS means auto-renew was toggled, not that access changed.
 *     Before DEBUG-739 it fell through to a default `'active'`, which re-activated an
 *     expired or grace-period row on any toggle.
 *   - `null` (the whole transition) — an UNHANDLED type. The caller acknowledges it and
 *     writes nothing. Both switches used to default to `'active'`, so any type outside
 *     them (a price increase, a pause-schedule change, a type the store adds next year)
 *     re-activated whatever row it matched.
 *
 * STATUS SEMANTICS (DEBUG-751). `status` answers "does this person have access right now":
 * 'active' and 'grace' do, 'expired' does not. There is deliberately no fourth value
 * ('on_hold', 'paused'): a suspended subscription is simply no-access, and
 * `subscriptions_status_check` is untouched.
 *   - Google CANCELED means auto-renew was switched off; the user keeps access to the end of
 *     the paid period and Google sends EXPIRED when it ends. Status stays; the audit row
 *     records the cancellation.
 *   - Google ON_HOLD (billing retry failed) and PAUSED suspend access, so both are 'expired'.
 *     A later RECOVERED / RENEWED / PURCHASED restores 'active'.
 *   - Apple DID_FAIL_TO_RENEW is a grace period only inside a SIGNED grace period
 *     (renewal info's gracePeriodExpiresDate), decided in handlers.ts (DEBUG-772). The subtype
 *     is not evidence of anything; billing retry alone is no access.
 *   - Apple REFUND / REVOKE revoke only the current paid period; REFUND_REVERSED restores it
 *     (DEBUG-772, decided in handlers.ts from the signed transaction).
 *   - Google IN_GRACE_PERIOD carries no grace end, so it is audited without a status write
 *     (DEBUG-772; a bounded Google grace needs a Play Developer API lookup, DEBUG-777).
 *   - A voided Google purchase (refund, chargeback) revokes access: mapGoogleVoidedPurchase.
 *
 * ORDERING (DEBUG-751). Stores deliver at-least-once and out of order, so applying every
 * notification in arrival order lets a late EXPIRED undo a newer RENEWED. isStaleEvent is
 * the pure half of the guard (handlers.ts holds the rest): an event strictly older than the
 * newest one already applied to the row is acknowledged and not applied.
 */

export type SubscriptionStatus = 'active' | 'grace' | 'expired';

/** Must stay inside `subscription_events.event_type`'s CHECK (migration 20260816010000). */
export type WebhookEventType =
  | 'subscription_started'
  | 'subscription_renewed'
  | 'subscription_cancelled'
  | 'subscription_restored'
  | 'subscription_expired'
  | 'payment_failed'
  | 'grace_period_started';

export interface StatusTransition {
  /** null = handled, but leave `status` as it is. */
  status: SubscriptionStatus | null;
  eventType: WebhookEventType;
  /**
   * DEBUG-772: the status is not fixed by the type but decided by handlers.ts from the signed
   * transaction (and renewal info). `status` above is then the fail-closed default.
   *   - 'post_expiry': decideAppleStatus — grace only inside a bounded, signed grace period.
   *   - 'revocation': revoke only when the refunded transaction is the current paid period.
   *   - 'reversal': restore only a still-running period at least as late as the stored one.
   */
  signedState?: 'post_expiry' | 'revocation' | 'reversal';
}

export const APPLE_NOTIFICATION_TYPES = {
  SUBSCRIBED: 'SUBSCRIBED',
  DID_RENEW: 'DID_RENEW',
  DID_CHANGE_RENEWAL_STATUS: 'DID_CHANGE_RENEWAL_STATUS',
  DID_FAIL_TO_RENEW: 'DID_FAIL_TO_RENEW',
  EXPIRED: 'EXPIRED',
  GRACE_PERIOD_EXPIRED: 'GRACE_PERIOD_EXPIRED',
  REVOKE: 'REVOKE',
  REFUND: 'REFUND',
  REFUND_REVERSED: 'REFUND_REVERSED',
} as const;

export const GOOGLE_NOTIFICATION_TYPES = {
  SUBSCRIPTION_RECOVERED: 1,
  SUBSCRIPTION_RENEWED: 2,
  SUBSCRIPTION_CANCELED: 3,
  SUBSCRIPTION_PURCHASED: 4,
  SUBSCRIPTION_ON_HOLD: 5,
  SUBSCRIPTION_IN_GRACE_PERIOD: 6,
  SUBSCRIPTION_RESTARTED: 7,
  SUBSCRIPTION_PRICE_CHANGE_CONFIRMED: 8,
  SUBSCRIPTION_DEFERRED: 9,
  SUBSCRIPTION_PAUSED: 10,
  SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED: 11,
  SUBSCRIPTION_REVOKED: 12,
  SUBSCRIPTION_EXPIRED: 13,
} as const;

/**
 * Apple App Store Server Notifications v2. `subtype` is the notification's top-level
 * subtype; for DID_CHANGE_RENEWAL_STATUS it is the ONLY place the toggle direction lives —
 * `data.autoRenewStatus`, which the old code read, does not exist on the v2 `data` object
 * (it is inside the separately signed renewal info), so every toggle used to log as a
 * cancellation, re-enables included.
 */
export function mapAppleNotification(
  notificationType: string | undefined,
  subtype?: string,
): StatusTransition | null {
  const T = APPLE_NOTIFICATION_TYPES;
  switch (notificationType) {
    case T.SUBSCRIBED:
      return { status: 'active', eventType: 'subscription_started' };
    case T.DID_RENEW:
      return { status: 'active', eventType: 'subscription_renewed' };
    case T.DID_FAIL_TO_RENEW:
      // Status from the signed transaction + renewal info, never the subtype (DEBUG-772).
      return { status: 'expired', eventType: 'payment_failed', signedState: 'post_expiry' };
    case T.EXPIRED:
    case T.GRACE_PERIOD_EXPIRED:
      return { status: 'expired', eventType: 'subscription_expired' };
    case T.DID_CHANGE_RENEWAL_STATUS:
      if (subtype === 'AUTO_RENEW_DISABLED') {
        return { status: null, eventType: 'subscription_cancelled' };
      }
      if (subtype === 'AUTO_RENEW_ENABLED') {
        return { status: null, eventType: 'subscription_restored' };
      }
      // No recognisable direction: nothing true can be recorded, so record nothing.
      return null;
    case T.REVOKE:
    case T.REFUND:
      return { status: 'expired', eventType: 'subscription_cancelled', signedState: 'revocation' };
    case T.REFUND_REVERSED:
      return { status: 'active', eventType: 'subscription_restored', signedState: 'reversal' };
    default:
      return null;
  }
}

/** Google Play Real-time Developer Notifications, `subscriptionNotification.notificationType`. */
export function mapGoogleNotification(notificationType: number | undefined): StatusTransition | null {
  const T = GOOGLE_NOTIFICATION_TYPES;
  switch (notificationType) {
    case T.SUBSCRIPTION_PURCHASED:
      return { status: 'active', eventType: 'subscription_started' };
    case T.SUBSCRIPTION_RENEWED:
    case T.SUBSCRIPTION_RECOVERED:
      return { status: 'active', eventType: 'subscription_renewed' };
    case T.SUBSCRIPTION_IN_GRACE_PERIOD:
      // No signed grace end on an RTDN: audit only, never an unbounded grace (DEBUG-772).
      return { status: null, eventType: 'grace_period_started' };
    case T.SUBSCRIPTION_CANCELED:
      // Auto-renew switched off; access continues to the end of the paid period.
      return { status: null, eventType: 'subscription_cancelled' };
    case T.SUBSCRIPTION_RESTARTED:
      // Auto-renew switched back on before the period ended; access never stopped.
      return { status: null, eventType: 'subscription_restored' };
    case T.SUBSCRIPTION_EXPIRED:
    case T.SUBSCRIPTION_REVOKED:
      return { status: 'expired', eventType: 'subscription_expired' };
    case T.SUBSCRIPTION_ON_HOLD:
      return { status: 'expired', eventType: 'payment_failed' };
    case T.SUBSCRIPTION_PAUSED:
      return { status: 'expired', eventType: 'subscription_expired' };
    default:
      return null;
  }
}

/**
 * Google Play `voidedPurchaseNotification.productType`: 1 is a subscription purchase, 2 a
 * one-time product. Only a subscription voiding revokes this table's access; anything else
 * (including an absent or malformed value) maps to no transition and is acknowledged.
 */
export function mapGoogleVoidedPurchase(productType: unknown): StatusTransition | null {
  return productType === 1 ? { status: 'expired', eventType: 'subscription_cancelled' } : null;
}

/** How far ahead of now a store timestamp may be before it is not believed. */
export const EVENT_CLOCK_SKEW_MS = 5 * 60 * 1000;

/**
 * True when `eventMs` is strictly older than the newest store event already applied to the
 * row (`storedIso`, subscriptions.last_store_event_at). Equal is not stale: a redelivery of
 * the newest applied event is idempotent. An absent or unparseable watermark is no watermark,
 * and so is one more than EVENT_CLOCK_SKEW_MS ahead of `nowMs` - nothing legitimate writes
 * one, and believing it would freeze the row against every real event until the clock caught
 * up.
 */
export function isStaleEvent(eventMs: number, storedIso: string | null | undefined, nowMs: number): boolean {
  if (typeof storedIso !== 'string') return false;
  const storedMs = Date.parse(storedIso);
  if (!Number.isFinite(storedMs) || storedMs > nowMs + EVENT_CLOCK_SKEW_MS) return false;
  return eventMs < storedMs;
}
