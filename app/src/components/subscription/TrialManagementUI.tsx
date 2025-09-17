/**
 * Trial Management UI Component - Mindful Trial Experience
 *
 * CLINICAL REQUIREMENTS:
 * - Non-pressured trial-to-paid conversion messaging
 * - Crisis access during trial without disruption
 * - Therapeutic continuity during trial changes
 * - MBCT-compliant trial benefits highlighting
 *
 * PERFORMANCE REQUIREMENTS:
 * - Real-time trial countdown updates
 * - Trial status changes <200ms response
 * - Smooth UI transitions during state changes
 * - Crisis access always <200ms
 *
 * BUSINESS REQUIREMENTS:
 * - Clear trial benefits communication
 * - Mindful upgrade suggestions
 * - Trial extension options for crisis situations
 * - Non-judgmental trial completion messaging
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  AccessibilityInfo
} from 'react-native';
import {
  useTrialManagement,
  usePaymentStatus,
  useCrisisPaymentSafety,
  useSubscriptionManagement
} from '../../store';
import { useNavigation } from '@react-navigation/native';
import { Card, Button } from '../core';
import { colorSystem, spacing, typography } from '../../constants/colors';

interface TrialManagementUIProps {
  showExtensionOptions?: boolean;
  showConversionPrompts?: boolean;
  showBenefitsHighlight?: boolean;
  onTrialStatusChange?: (status: string) => void;
}

export const TrialManagementUI: React.FC<TrialManagementUIProps> = ({
  showExtensionOptions = true,
  showConversionPrompts = true,
  showBenefitsHighlight = true,
  onTrialStatusChange
}) => {
  const navigation = useNavigation();
  const [fadeAnim] = useState(new Animated.Value(1));
  const [showDetails, setShowDetails] = useState(false);

  // Store hooks
  const trialManagement = useTrialManagement();
  const paymentStatus = usePaymentStatus();
  const crisisSafety = useCrisisPaymentSafety();
  const subscriptionManagement = useSubscriptionManagement();

  // Local state
  const [isExtending, setIsExtending] = useState(false);
  const [showConversionDialog, setShowConversionDialog] = useState(false);

  /**
   * Handle trial extension for crisis situations
   */
  const handleTrialExtension = useCallback(async (reason: string) => {
    setIsExtending(true);

    try {
      await trialManagement.extendTrial(7, reason); // 7 day extension

      Alert.alert(
        'Trial Extended',
        'Your trial has been extended by 7 days. Take the time you need for your therapeutic journey.',
        [{ text: 'Thank you', style: 'default' }]
      );

      if (onTrialStatusChange) {
        onTrialStatusChange('extended');
      }

    } catch (error) {
      console.error('Trial extension failed:', error);
      Alert.alert(
        'Extension Unavailable',
        'We\'re unable to extend your trial right now, but crisis support remains freely available.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsExtending(false);
    }
  }, [trialManagement, onTrialStatusChange]);

  /**
   * Handle mindful trial-to-paid conversion
   */
  const handleMindfulConversion = useCallback(() => {
    Alert.alert(
      'Continue Your Journey',
      'Your trial has given you a taste of what MBCT practices can offer. Would you like to explore subscription options that support your continued growth?',
      [
        { text: 'Not right now', style: 'cancel' },
        {
          text: 'I need crisis support',
          onPress: () => crisisSafety.enableCrisisMode('trial_conversion_stress'),
          style: 'destructive'
        },
        {
          text: 'Explore options',
          onPress: () => {
            (navigation as any).navigate('SubscriptionScreen', {
              trialConversion: true,
              currentTrial: trialManagement
            });
          }
        }
      ]
    );
  }, [navigation, trialManagement, crisisSafety]);

  /**
   * Handle crisis-aware trial completion
   */
  const handleTrialCompletion = useCallback(async () => {
    // Show supportive completion message
    Alert.alert(
      'Trial Complete - You\'re Valued',
      'Your 21-day mindful exploration is complete. Regardless of what you choose next, you\'ve taken meaningful steps in your healing journey.\n\nCrisis support and safety tools remain freely available.',
      [
        {
          text: 'Access Crisis Support',
          onPress: () => crisisSafety.enableCrisisMode('trial_completion'),
          style: 'destructive'
        },
        { text: 'Continue Exploring', onPress: handleMindfulConversion },
        { text: 'Take Time to Decide', style: 'cancel' }
      ]
    );
  }, [crisisSafety, handleMindfulConversion]);

  /**
   * Trial countdown with mindful messaging
   */
  const TrialCountdown: React.FC = () => {
    const daysRemaining = trialManagement.daysRemaining;
    const isLowTime = daysRemaining <= 3;

    return (
      <View style={[styles.countdownContainer, isLowTime && styles.lowTimeContainer]}>
        <View style={styles.countdownHeader}>
          <Text style={styles.countdownDays}>{daysRemaining}</Text>
          <Text style={styles.countdownLabel}>
            day{daysRemaining !== 1 ? 's' : ''} remaining
          </Text>
        </View>

        <Text style={styles.countdownMessage}>
          {isLowTime
            ? 'Your trial is ending soon. Take time to reflect on your experience.'
            : 'Your mindful exploration continues. Notice what practices resonate with you.'
          }
        </Text>

        {isLowTime && showConversionPrompts && (
          <TouchableOpacity
            style={styles.gentlePrompt}
            onPress={handleMindfulConversion}
            accessibilityRole="button"
            accessibilityLabel="Explore subscription options mindfully"
          >
            <Text style={styles.gentlePromptText}>
              Explore continuing your journey
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /**
   * Trial benefits highlight
   */
  const TrialBenefits: React.FC = () => {
    if (!showBenefitsHighlight) return null;

    const benefits = [
      'Complete MBCT program access',
      'Guided meditation library',
      'Progress insights and tracking',
      'Crisis support tools (always free)',
      'All therapeutic practices'
    ];

    return (
      <View style={styles.benefitsContainer}>
        <Text style={styles.benefitsTitle}>What You're Exploring</Text>
        {benefits.map((benefit, index) => (
          <View key={index} style={styles.benefitItem}>
            <Text style={styles.benefitBullet}>✓</Text>
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>
    );
  };

  /**
   * Crisis-aware extension options
   */
  const ExtensionOptions: React.FC = () => {
    if (!showExtensionOptions || !trialManagement.trialActive) return null;

    return (
      <View style={styles.extensionContainer}>
        <Text style={styles.extensionTitle}>Need More Time?</Text>
        <Text style={styles.extensionDescription}>
          If you're experiencing financial stress or need more time to decide, we understand.
        </Text>

        <View style={styles.extensionButtons}>
          <Button
            variant="outline"
            onPress={() => handleTrialExtension('need_more_time')}
            disabled={isExtending}
            style={styles.extensionButton}
          >
            {isExtending ? 'Extending...' : 'Extend Trial (7 days)'}
          </Button>

          <Button
            variant="secondary"
            onPress={() => crisisSafety.enableCrisisMode('financial_stress')}
            style={styles.extensionButton}
          >
            Crisis Support
          </Button>
        </View>
      </View>
    );
  };

  /**
   * Trial progress indicator
   */
  const TrialProgress: React.FC = () => {
    const totalDays = 21; // Standard trial length
    const remainingDays = trialManagement.daysRemaining;
    const progressPercent = ((totalDays - remainingDays) / totalDays) * 100;

    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>Your Mindful Journey</Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercent}%` }
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {totalDays - remainingDays} days of exploration completed
        </Text>
      </View>
    );
  };

  // Auto-trigger completion flow when trial expires
  useEffect(() => {
    if (trialManagement.trialActive && trialManagement.daysRemaining === 0) {
      handleTrialCompletion();
    }
  }, [trialManagement.trialActive, trialManagement.daysRemaining, handleTrialCompletion]);

  // Don't render if no trial active
  if (!trialManagement.trialActive) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Card style={styles.trialCard}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Mindful Trial</Text>
          <TouchableOpacity
            onPress={() => setShowDetails(!showDetails)}
            style={styles.detailsToggle}
            accessibilityRole="button"
            accessibilityLabel={showDetails ? 'Hide details' : 'Show details'}
          >
            <Text style={styles.detailsToggleText}>
              {showDetails ? '▲' : '▼'} Details
            </Text>
          </TouchableOpacity>
        </View>

        <TrialCountdown />

        {showDetails && (
          <View style={styles.detailsSection}>
            <TrialProgress />
            <TrialBenefits />
            <ExtensionOptions />
          </View>
        )}

        {/* Always show crisis support access */}
        <View style={styles.crisisAccess}>
          <Text style={styles.crisisText}>
            Crisis support and safety tools remain freely accessible throughout your trial
          </Text>
        </View>
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  trialCard: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.headline2.weight,
    color: colorSystem.accessibility.text.primary,
  },
  detailsToggle: {
    padding: spacing.sm,
  },
  detailsToggleText: {
    fontSize: 14,
    color: colorSystem.status.info,
    fontWeight: '600',
  },

  // Countdown
  countdownContainer: {
    backgroundColor: colorSystem.status.infoBackground,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  lowTimeContainer: {
    backgroundColor: colorSystem.status.warningBackground,
  },
  countdownHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  countdownDays: {
    fontSize: 36,
    fontWeight: '700',
    color: colorSystem.status.info,
    marginRight: spacing.sm,
  },
  countdownLabel: {
    fontSize: 16,
    color: colorSystem.accessibility.text.secondary,
    fontWeight: '600',
  },
  countdownMessage: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.primary,
    textAlign: 'center',
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
  },
  gentlePrompt: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
    alignSelf: 'center',
  },
  gentlePromptText: {
    fontSize: 14,
    color: colorSystem.status.info,
    fontWeight: '600',
  },

  // Progress
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: colorSystem.gray[200],
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colorSystem.status.success,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
    textAlign: 'center',
  },

  // Benefits
  benefitsContainer: {
    marginBottom: spacing.lg,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  benefitBullet: {
    fontSize: 16,
    color: colorSystem.status.success,
    marginRight: spacing.sm,
    fontWeight: '600',
  },
  benefitText: {
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
    flex: 1,
  },

  // Extension Options
  extensionContainer: {
    backgroundColor: colorSystem.gray[50],
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  extensionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.sm,
  },
  extensionDescription: {
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  extensionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  extensionButton: {
    flex: 1,
  },

  // Details Section
  detailsSection: {
    marginTop: spacing.md,
  },

  // Crisis Access
  crisisAccess: {
    backgroundColor: colorSystem.status.successBackground,
    padding: spacing.sm,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.success,
  },
  crisisText: {
    fontSize: 12,
    color: colorSystem.status.success,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default TrialManagementUI;