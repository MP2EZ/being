/**
 * Store notification → subscription transition (DEBUG-739).
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
 * The handled-type mappings below are the PRE-EXISTING ones, pinned as-is. Several do not
 * match store semantics (Google CANCELED → expired while access continues; ON_HOLD and
 * PAUSED → grace while access has stopped; Apple DID_FAIL_TO_RENEW → grace without
 * checking the GRACE_PERIOD subtype). Correcting them is DEBUG-751, not this change.
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
      return { status: 'grace', eventType: 'payment_failed' };
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
      return { status: 'expired', eventType: 'subscription_cancelled' };
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
      return { status: 'grace', eventType: 'grace_period_started' };
    case T.SUBSCRIPTION_CANCELED:
    case T.SUBSCRIPTION_EXPIRED:
    case T.SUBSCRIPTION_REVOKED:
      return { status: 'expired', eventType: 'subscription_expired' };
    case T.SUBSCRIPTION_ON_HOLD:
    case T.SUBSCRIPTION_PAUSED:
      return { status: 'grace', eventType: 'payment_failed' };
    default:
      return null;
  }
}
