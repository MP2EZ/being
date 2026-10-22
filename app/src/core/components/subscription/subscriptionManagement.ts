/**
 * STORE SUBSCRIPTION MANAGEMENT (DEBUG-709)
 *
 * Opens the platform's own subscription settings, where a trial or a subscription is
 * managed or cancelled. Shared by ProfileScreen and SubscriptionStatusCard.
 *
 * Presents NO UI of its own and never throws (crisis ruling 2026-10-22): it reports whether
 * the store page opened, and a caller decides what to show. A native Alert is an occluder
 * above the crisis button, so the one caller that shows one (ProfileScreen) keeps it inside
 * its own gated file rather than putting it here, where every future importer would inherit it.
 *
 * Not under core/services: that tree is a crisis-dial guarded directory
 * (scripts/check-crisis-dial-guard.js), and this https: store link is not a crisis dial.
 */

import { Linking, Platform } from 'react-native';

export const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
export const GOOGLE_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';

export function getSubscriptionManagementUrl(os: string = Platform.OS): string {
  return os === 'ios' ? APPLE_SUBSCRIPTIONS_URL : GOOGLE_SUBSCRIPTIONS_URL;
}

/** True when the store's subscription page opened; false (never a throw) otherwise. */
export async function openSubscriptionManagement(): Promise<boolean> {
  const url = getSubscriptionManagementUrl();
  try {
    if (!(await Linking.canOpenURL(url))) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
