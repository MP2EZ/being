/**
 * Crisis Payment Banner - Always Visible Crisis Safety Component
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - Always visible on all payment screens
 * - Crisis hotline (988) access within <3 seconds
 * - High contrast design for crisis visibility
 * - Screen reader compatible with assertive announcements
 * - No payment barriers for crisis features
 *
 * THERAPEUTIC REQUIREMENTS:
 * - Non-judgmental messaging about payment status
 * - Clear communication that crisis support is always free
 * - Reduces payment anxiety through safety assurance
 * - MBCT-compliant therapeutic language
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  AccessibilityInfo,
} from 'react-native';
import { useCrisisPaymentSafety } from '../../store';
import { colorSystem, spacing, typography } from '../../constants/colors';

export interface CrisisPaymentBannerProps {
  variant?: 'standard' | 'prominent' | 'emergency';
  showActivateButton?: boolean;
  customMessage?: string;
  onCrisisActivated?: () => void;
}

export const CrisisPaymentBanner: React.FC<CrisisPaymentBannerProps> = ({
  variant = 'standard',
  showActivateButton = true,
  customMessage,
  onCrisisActivated
}) => {
  const {
    crisisMode,
    crisisOverride,
    enableCrisisMode,
    performanceMetrics
  } = useCrisisPaymentSafety();

  const handleCrisisHotlineCall = useCallback(async () => {
    try {
      // Performance tracking for critical safety feature
      const startTime = Date.now();

      await Linking.openURL('tel:988');

      const responseTime = Date.now() - startTime;
      if (responseTime > 200) {
        console.warn(`Crisis hotline response time exceeded target: ${responseTime}ms`);
      }

      // Announce successful connection attempt
      AccessibilityInfo.announceForAccessibility(
        'Connecting to crisis hotline 988. Help is on the way.'
      );

    } catch (error) {
      console.error('Crisis hotline call failed:', error);

      // Fallback alert if phone call fails
      Alert.alert(
        'Call 988 for Crisis Support',
        'Please dial 988 directly for immediate crisis support and mental health emergency assistance.',
        [
          { text: 'OK' },
          {
            text: 'Activate Crisis Mode',
            onPress: () => handleCrisisActivation('hotline_call_failed')
          }
        ]
      );
    }
  }, []);

  const handleCrisisActivation = useCallback(async (reason: string) => {
    try {
      await enableCrisisMode(reason);

      Alert.alert(
        'Crisis Support Activated',
        'All therapeutic features are now freely available for your safety. Remember:\n\n• Crisis support is always free\n• Your wellbeing is our priority\n• Professional help is available 24/7',
        [
          {
            text: 'Call 988 Now',
            onPress: handleCrisisHotlineCall,
            style: 'destructive'
          },
          { text: 'Continue', style: 'default' }
        ]
      );

      // Notify parent component
      onCrisisActivated?.();

      // Announce activation for screen readers
      AccessibilityInfo.announceForAccessibility(
        'Crisis support mode activated. All therapeutic features are now freely available.'
      );

    } catch (error) {
      console.error('Crisis mode activation failed:', error);

      // Even if activation fails, provide guidance
      Alert.alert(
        'Crisis Support Available',
        'Crisis support tools and hotline access remain available. Call 988 for immediate professional support.',
        [
          { text: 'Call 988', onPress: handleCrisisHotlineCall }
        ]
      );
    }
  }, [enableCrisisMode, onCrisisActivated, handleCrisisHotlineCall]);

  const getBannerStyle = () => {
    switch (variant) {
      case 'prominent':
        return [styles.banner, styles.prominentBanner];
      case 'emergency':
        return [styles.banner, styles.emergencyBanner];
      default:
        return [styles.banner, styles.standardBanner];
    }
  };

  const getMessage = () => {
    if (customMessage) return customMessage;

    if (crisisMode) {
      return 'Crisis Support Active - All features freely available for your safety';
    }

    switch (variant) {
      case 'emergency':
        return 'EMERGENCY: Crisis support always free • Call 988 immediately';
      case 'prominent':
        return 'Crisis Support Always Free • Call 988 for immediate help';
      default:
        return 'Crisis Support Always Free • 988 Available 24/7';
    }
  };

  return (
    <View
      style={getBannerStyle()}
      accessible={true}
      accessibilityRole="banner"
      accessibilityLabel={getMessage()}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <View style={styles.messageContainer}>
          <Text style={styles.crisisIcon}>🆘</Text>
          <Text style={styles.message}>{getMessage()}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.hotlineButton}
            onPress={handleCrisisHotlineCall}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Call 988 crisis hotline immediately"
            accessibilityHint="Double tap to call the crisis support hotline for immediate help"
          >
            <Text style={styles.hotlineText}>988</Text>
          </TouchableOpacity>

          {showActivateButton && !crisisMode && (
            <TouchableOpacity
              style={styles.activateButton}
              onPress={() => handleCrisisActivation('user_requested')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Activate crisis support mode"
              accessibilityHint="Double tap to enable free access to all therapeutic features during crisis"
            >
              <Text style={styles.activateText}>Crisis Mode</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {crisisMode && crisisOverride && (
        <View style={styles.crisisDetails}>
          <Text style={styles.crisisDetailsText}>
            Active until {new Date(crisisOverride.expires).toLocaleDateString()} •
            Session ID: {crisisOverride.crisisSessionId.slice(-8)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  standardBanner: {
    backgroundColor: colorSystem.status.critical,
  },
  prominentBanner: {
    backgroundColor: colorSystem.status.critical,
    borderWidth: 3,
    borderColor: colorSystem.accessibility.highContrast.error,
  },
  emergencyBanner: {
    backgroundColor: colorSystem.accessibility.highContrast.error,
    borderWidth: 4,
    borderColor: colorSystem.base.white,
    shadowColor: colorSystem.status.critical,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },

  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },

  crisisIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },

  message: {
    flex: 1,
    color: colorSystem.base.white,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  hotlineButton: {
    backgroundColor: colorSystem.base.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  hotlineText: {
    color: colorSystem.status.critical,
    fontSize: 18,
    fontWeight: '800',
  },

  activateButton: {
    backgroundColor: colorSystem.status.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },

  activateText: {
    color: colorSystem.base.white,
    fontSize: 12,
    fontWeight: '700',
  },

  crisisDetails: {
    backgroundColor: colorSystem.status.successBackground,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colorSystem.base.white,
  },

  crisisDetailsText: {
    fontSize: 12,
    color: colorSystem.status.success,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default CrisisPaymentBanner;