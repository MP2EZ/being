/**
 * SubscriptionStatus route (DEBUG-760)
 *
 * The navigator mounts route components with no props, so registering
 * SubscriptionStatusCard directly left every upgrade button with onPress undefined. This
 * wrapper is the registered component: it sends Start Free Trial / Upgrade Now / Renew /
 * Subscribe to the 'Subscription' paywall (the same call ProfileScreen makes) and leaves
 * onManage unset, so Manage and Update Payment keep the card's store-URL fallback.
 *
 * Crisis constraints (b-batch crisis ruling): a plain navigate only - never reset/replace or a
 * StackActions dispatch, which can discard a CrisisResources route lower in the stack - and no
 * native modal or sheet, which would cover the root 988 button. It lives outside
 * core/navigation so the navigator diff stays one component swap.
 */

import * as React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import SubscriptionStatusCard from './SubscriptionStatusCard';

export default function SubscriptionStatusRoute() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  return <SubscriptionStatusCard onUpgrade={() => navigation.navigate('Subscription')} />;
}
