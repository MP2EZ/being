/**
 * PaymentErrorModal - Therapeutic payment error handling
 *
 * User-friendly error messages for payment failures with recovery actions
 * Maintains crisis safety and therapeutic continuity during payment issues
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from '../core';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import { usePaymentStatus, usePaymentActions, paymentSelectors, usePaymentStore } from '../../store/paymentStore';
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics } from '../../hooks/useHaptics';

export interface PaymentErrorModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onRetryPayment?: () => void | Promise<void>;
  readonly onUpdatePaymentMethod?: () => void | Promise<void>;
  readonly onContactSupport?: () => void | Promise<void>;
  readonly error?: EnhancedPaymentErrorInfo | null;
  readonly testID: string; // Required for comprehensive testing

  // Crisis safety and therapeutic continuity
  readonly therapeuticContinuityEnabled?: boolean;
  readonly gracePeriodAvailable?: boolean;
  readonly showCrisisSafety?: boolean;

  // Modal accessibility
  readonly accessibilityLabel: string; // Required for modals
  readonly accessibilityViewIsModal?: boolean;
  readonly onAccessibilityEscape?: () => void;
}

interface EnhancedPaymentErrorInfo {
  readonly code: string;
  readonly message: string;
  readonly type: string;
  readonly severity?: 'low' | 'medium' | 'high' | 'critical';
  readonly therapeuticMessage?: string; // MBCT-compliant messaging
  readonly crisisImpactLevel?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  readonly recoveryStrategies?: ReadonlyArray<ErrorRecoveryStrategy>;
  readonly gracePeriodEligible?: boolean;
  readonly retryable?: boolean;
  readonly userMessage?: string;
  readonly suggestions?: ReadonlyArray<string>;
}

interface ErrorRecoveryStrategy {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly action: () => void | Promise<void>;
  readonly priority: 'primary' | 'secondary' | 'tertiary';
  readonly therapeutic?: boolean;
  readonly estimatedTime?: string;
}

interface ErrorSolution {
  id: string;
  title: string;
  description: string;
  action: () => void;
  primary?: boolean;
  therapeutic?: boolean;
}

export const PaymentErrorModal: React.FC<PaymentErrorModalProps> = ({
  visible,
  onClose,
  onRetryPayment,
  onUpdatePaymentMethod,
  onContactSupport,
  error: propError,
  testID,
  therapeuticContinuityEnabled = true,
  gracePeriodAvailable = true,
  showCrisisSafety = true,
  accessibilityLabel,
  accessibilityViewIsModal = true,
  onAccessibilityEscape
}) => {
  const { colorSystem: colors } = useTheme();
  const { onModalOpen, onModalClose, onSelect, onError } = useCommonHaptics();
  const [isRetrying, setIsRetrying] = useState(false);

  const store = usePaymentStore();
  const {
    paymentError,
    isSubscriptionActive
  } = usePaymentStatus();

  const {
    retryFailedPayment,
    activateGracePeriod
  } = usePaymentActions();

  const gracePeriodStatus = paymentSelectors.getGracePeriodStatus(store);

  const currentError = propError || paymentError;

  const handleModalOpen = async () => {
    await onModalOpen();
  };

  const handleModalClose = async () => {
    await onModalClose();
    onClose();
  };

  const handleRetryPayment = async () => {
    if (!onRetryPayment) return;

    setIsRetrying(true);
    await onSelect();

    try {
      await retryFailedPayment();
      onRetryPayment();
      await handleModalClose();
    } catch (error) {
      await onError();
      Alert.alert(
        'Retry Failed',
        'Unable to process payment. Please check your payment method or contact support.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRetrying(false);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    await onSelect();
    onUpdatePaymentMethod?.();
  };

  const handleContactSupport = async () => {
    await onSelect();
    onContactSupport?.();
  };

  const handleContinueWithoutPayment = async () => {
    await onSelect();

    // Activate grace period for therapeutic continuity
    await activateGracePeriod({
      reason: 'payment_failed_user_choice',
      therapeuticContinuity: true
    });

    Alert.alert(
      'Therapeutic Continuity Activated',
      'Your mindful practice continues safely. You have 7 days to resolve payment issues while maintaining full access.',
      [{ text: 'Continue Practicing', onPress: handleModalClose }]
    );
  };

  const getErrorInfo = () => {
    if (!currentError) {
      return {
        title: 'Payment Issue',
        message: 'We encountered an issue processing your payment.',
        severity: 'medium' as const,
        therapeuticMessage: 'Your mindful practice continues safely while we resolve this.'
      };
    }

    const { code, message, type, severity = 'medium' } = currentError;

    switch (code) {
      case 'card_declined':
        return {
          title: 'Card Declined',
          message: 'Your payment method was declined by your bank.',
          severity,
          therapeuticMessage: 'Your therapeutic access remains protected.',
          suggestions: [
            'Check if your card has sufficient funds',
            'Verify your card details are correct',
            'Contact your bank about the transaction',
            'Try a different payment method'
          ]
        };

      case 'expired_card':
        return {
          title: 'Card Expired',
          message: 'Your payment method has expired.',
          severity,
          therapeuticMessage: 'Your practice continues while you update your card.',
          suggestions: [
            'Update your card expiration date',
            'Add a new payment method',
            'Contact your bank for a replacement card'
          ]
        };

      case 'insufficient_funds':
        return {
          title: 'Insufficient Funds',
          message: 'Your account has insufficient funds for this transaction.',
          severity,
          therapeuticMessage: 'Your mindful practice is protected during this time.',
          suggestions: [
            'Add funds to your account',
            'Try a different payment method',
            'Check your account balance',
            'Contact your bank'
          ]
        };

      case 'processing_error':
        return {
          title: 'Processing Error',
          message: 'We encountered a temporary issue processing your payment.',
          severity,
          therapeuticMessage: 'This is likely temporary. Your access continues safely.',
          suggestions: [
            'Try again in a few minutes',
            'Check your internet connection',
            'Restart the app',
            'Contact support if the issue persists'
          ]
        };

      default:
        return {
          title: 'Payment Issue',
          message: message || 'We encountered an issue with your payment.',
          severity,
          therapeuticMessage: 'Your therapeutic access is protected.',
          suggestions: [
            'Try again in a few minutes',
            'Check your payment method',
            'Contact support for assistance'
          ]
        };
    }
  };

  const errorInfo = getErrorInfo();

  const getSolutions = (): ErrorSolution[] => {
    const solutions: ErrorSolution[] = [];

    if (onRetryPayment) {
      solutions.push({
        id: 'retry',
        title: 'Retry Payment',
        description: 'Try processing the payment again',
        action: handleRetryPayment,
        primary: true
      });
    }

    if (onUpdatePaymentMethod) {
      solutions.push({
        id: 'update-payment',
        title: 'Update Payment Method',
        description: 'Change or add a new payment method',
        action: handleUpdatePaymentMethod
      });
    }

    // Always offer therapeutic continuity
    solutions.push({
      id: 'continue-practice',
      title: 'Continue Your Practice',
      description: '7 days of full access while you resolve payment',
      action: handleContinueWithoutPayment,
      therapeutic: true
    });

    if (onContactSupport) {
      solutions.push({
        id: 'contact-support',
        title: 'Contact Support',
        description: 'Get help from our support team',
        action: handleContactSupport
      });
    }

    return solutions;
  };

  const solutions = getSolutions();

  React.useEffect(() => {
    if (visible) {
      handleModalOpen();
    }
  }, [visible]);

  const getSeverityColor = () => {
    switch (errorInfo.severity) {
      case 'critical':
        return colors.status.critical;
      case 'high':
        return colors.status.error;
      case 'medium':
        return colors.status.warning;
      case 'low':
        return colors.status.info;
      default:
        return colors.status.warning;
    }
  };

  const getSeverityBackground = () => {
    switch (errorInfo.severity) {
      case 'critical':
        return colors.status.criticalBackground;
      case 'high':
        return colors.status.errorBackground;
      case 'medium':
        return colors.status.warningBackground;
      case 'low':
        return colors.status.infoBackground;
      default:
        return colors.status.warningBackground;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleModalClose}
      testID={testID}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleModalClose}
            accessibilityLabel="Close payment error dialog"
            accessibilityRole="button"
          >
            <Text style={[styles.closeText, { color: colors.status.info }]}>
              Close
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.base.black }]}>
            Payment Issue
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Error Information */}
          <Card style={[styles.errorCard, { backgroundColor: getSeverityBackground() }]}>
            <View style={styles.errorHeader}>
              <View style={styles.errorIcon}>
                <Text style={styles.errorIconText}>💳</Text>
              </View>
              <View style={styles.errorInfo}>
                <Text style={[styles.errorTitle, { color: getSeverityColor() }]}>
                  {errorInfo.title}
                </Text>
                <Text style={[styles.errorMessage, { color: colors.gray[700] }]}>
                  {errorInfo.message}
                </Text>
              </View>
            </View>

            {/* Therapeutic Reassurance */}
            <View style={[styles.therapeuticMessage, { backgroundColor: colors.status.successBackground }]}>
              <Text style={[styles.therapeuticText, { color: colors.status.success }]}>
                🛡️ {errorInfo.therapeuticMessage}
              </Text>
            </View>
          </Card>

          {/* Grace Period Status */}
          {gracePeriodStatus?.active && (
            <Card style={styles.gracePeriodCard}>
              <Text style={[styles.gracePeriodTitle, { color: colors.status.success }]}>
                Therapeutic Continuity Active
              </Text>
              <Text style={[styles.gracePeriodText, { color: colors.gray[600] }]}>
                You have {gracePeriodStatus.daysRemainingFormatted} of full access while resolving payment issues.
              </Text>
            </Card>
          )}

          {/* Troubleshooting Suggestions */}
          {errorInfo.suggestions && (
            <Card style={styles.suggestionsCard}>
              <Text style={[styles.sectionTitle, { color: colors.base.black }]}>
                Quick Solutions
              </Text>
              {errorInfo.suggestions.map((suggestion, index) => (
                <View key={index} style={styles.suggestionRow}>
                  <Text style={[styles.suggestionBullet, { color: colors.status.info }]}>
                    •
                  </Text>
                  <Text style={[styles.suggestionText, { color: colors.gray[700] }]}>
                    {suggestion}
                  </Text>
                </View>
              ))}
            </Card>
          )}

          {/* Action Solutions */}
          <Card style={styles.solutionsCard}>
            <Text style={[styles.sectionTitle, { color: colors.base.black }]}>
              What would you like to do?
            </Text>

            {solutions.map((solution) => (
              <TouchableOpacity
                key={solution.id}
                style={[
                  styles.solutionButton,
                  {
                    borderColor: solution.primary
                      ? colors.status.info
                      : solution.therapeutic
                      ? colors.status.success
                      : colors.gray[300],
                    backgroundColor: solution.primary
                      ? colors.status.infoBackground
                      : solution.therapeutic
                      ? colors.status.successBackground
                      : colors.base.white
                  }
                ]}
                onPress={solution.action}
                activeOpacity={0.8}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${solution.title}. ${solution.description}`}
                disabled={isRetrying && solution.id === 'retry'}
              >
                <View style={styles.solutionContent}>
                  <Text
                    style={[
                      styles.solutionTitle,
                      {
                        color: solution.primary
                          ? colors.status.info
                          : solution.therapeutic
                          ? colors.status.success
                          : colors.base.black
                      }
                    ]}
                  >
                    {solution.therapeutic && '🛡️ '}
                    {solution.title}
                  </Text>
                  <Text style={[styles.solutionDescription, { color: colors.gray[600] }]}>
                    {solution.description}
                  </Text>
                </View>

                {solution.primary && (
                  <Text style={[styles.solutionArrow, { color: colors.status.info }]}>
                    →
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </Card>

          {/* Crisis Safety Note */}
          <Card style={[styles.safetyCard, { backgroundColor: colors.status.successBackground }]}>
            <Text style={[styles.safetyTitle, { color: colors.status.success }]}>
              Your Wellbeing Comes First
            </Text>
            <Text style={[styles.safetyText, { color: colors.gray[700] }]}>
              Payment issues never affect your access to core therapeutic features, crisis support, or emergency resources. Your mental health journey continues safely.
            </Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  closeButton: {
    padding: spacing.xs,
    minWidth: 60,
  },
  closeText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  errorCard: {
    marginBottom: spacing.lg,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.medium,
    backgroundColor: colorSystem.base.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  errorIconText: {
    fontSize: 24,
  },
  errorInfo: {
    flex: 1,
  },
  errorTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    marginBottom: spacing.xs,
  },
  errorMessage: {
    fontSize: typography.bodyRegular.size,
    lineHeight: 22,
  },
  therapeuticMessage: {
    padding: spacing.sm,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
  },
  therapeuticText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
    textAlign: 'center',
  },
  gracePeriodCard: {
    marginBottom: spacing.lg,
    backgroundColor: colorSystem.status.successBackground,
  },
  gracePeriodTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  gracePeriodText: {
    fontSize: typography.bodyRegular.size,
    lineHeight: 22,
  },
  suggestionsCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    marginBottom: spacing.md,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  suggestionBullet: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  suggestionText: {
    flex: 1,
    fontSize: typography.bodyRegular.size,
    lineHeight: 22,
  },
  solutionsCard: {
    marginBottom: spacing.lg,
  },
  solutionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    marginBottom: spacing.sm,
    minHeight: 72, // WCAG AA touch target
  },
  solutionContent: {
    flex: 1,
  },
  solutionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  solutionDescription: {
    fontSize: typography.bodyRegular.size,
    lineHeight: 20,
  },
  solutionArrow: {
    fontSize: 18,
    fontWeight: '600',
  },
  safetyCard: {
    marginBottom: spacing.xl,
  },
  safetyTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  safetyText: {
    fontSize: typography.bodyRegular.size,
    lineHeight: 22,
    textAlign: 'center',
  },
});