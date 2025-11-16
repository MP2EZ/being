/**
 * FEATURE GATE COMPONENT
 * Conditionally renders content based on subscription feature access
 *
 * FEATURES:
 * - Check feature access based on subscription status
 * - Show upgrade prompt for locked features
 * - Crisis features always accessible (hardcoded true)
 * - Customizable fallback UI
 *
 * USAGE:
 * <FeatureGate feature="checkIns" onUpgrade={() => navigate('Subscription')}>
 *   <CheckInComponent />
 * </FeatureGate>
 *
 * ACCESSIBILITY:
 * - Screen reader support for locked features
 * - Clear messaging about upgrade requirements
 * - Keyboard navigation support
 *
 * PERFORMANCE:
 * - Fast feature access checks (<10ms)
 * - Minimal re-renders
 * - Memoized access checks
 */

import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSubscriptionStore } from '@/core/stores/subscriptionStore';
import { FeatureAccess } from '@/types/subscription';

interface FeatureGateProps {
  children: React.ReactNode;
  feature: keyof FeatureAccess;
  onUpgrade?: (() => void) | undefined;
  fallback?: React.ReactNode | undefined;
  showUpgradePrompt?: boolean | undefined;
}

export default function FeatureGate({
  children,
  feature,
  onUpgrade,
  fallback,
  showUpgradePrompt = true,
}: FeatureGateProps) {
  const store = useSubscriptionStore();

  // Check if user has access to this feature
  const hasAccess = React.useMemo(() => {
    return store.checkFeatureAccess(feature);
  }, [store, feature]);

  // If user has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // If custom fallback is provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // If upgrade prompt is disabled, render nothing
  if (!showUpgradePrompt) {
    return null;
  }

  // Default upgrade prompt
  return (
    <View style={styles.container}>
      <View style={styles.lockIcon}>
        <Text style={styles.lockIconText}>🔒</Text>
      </View>
      <Text style={styles.title}>Premium Feature</Text>
      <Text style={styles.description}>
        Upgrade to access this feature and support your mental health journey
      </Text>
      {onUpgrade && (
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={onUpgrade}
          accessibilityLabel="Upgrade to unlock feature"
          accessibilityRole="button"
        >
          <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Hook for checking feature access
 * Use this when you need access state without rendering fallback UI
 */
export function useFeatureAccess(feature: keyof FeatureAccess): boolean {
  const store = useSubscriptionStore();
  return React.useMemo(() => {
    return store.checkFeatureAccess(feature);
  }, [store, feature]);
}

/**
 * HOC for wrapping components with feature gating
 * Use this to create gated versions of existing components
 */
export function withFeatureGate<P extends object>(
  Component: React.ComponentType<P>,
  feature: keyof FeatureAccess,
  onUpgrade?: () => void
) {
  return function FeatureGatedComponent(props: P) {
    return (
      <FeatureGate feature={feature} onUpgrade={onUpgrade}>
        <Component {...props} />
      </FeatureGate>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
  },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockIconText: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  upgradeButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
