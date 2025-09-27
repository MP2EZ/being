/**
 * Therapeutic Payment Messaging - MBCT-Compliant Payment Communication
 *
 * CLINICAL REQUIREMENTS:
 * - MBCT-compliant therapeutic language for all payment scenarios
 * - Non-judgmental approach to payment failures and financial stress
 * - Therapeutic reframing of payment challenges as opportunities for self-compassion
 * - Crisis-aware messaging that prioritizes safety over payment
 *
 * MESSAGING SCENARIOS:
 * - Payment success confirmation with therapeutic validation
 * - Payment failure support with compassionate reframing
 * - Subscription changes with mindful decision support
 * - Financial stress acknowledgment with crisis escalation
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Linking,
  AccessibilityInfo,
} from 'react-native';
import { useCrisisPaymentSafety } from '../../store';
import { usePaymentAccessibility } from '../accessibility/PaymentAccessibilityProvider';
import { colorSystem, spacing, typography } from '../../constants/colors';

export interface TherapeuticPaymentMessagingProps {
  scenario: 'payment_success' | 'payment_failure' | 'subscription_change' | 'financial_stress' | 'crisis_override' | 'retry_guidance';
  customMessage?: string;
  paymentAmount?: number;
  subscriptionPlan?: string;
  errorCode?: string;
  onCrisisSupport?: () => void;
  onRetry?: () => void;
  onAlternativeAction?: () => void;
}

interface TherapeuticMessage {
  title: string;
  message: string;
  tone: 'positive' | 'supportive' | 'crisis' | 'neutral';
  actions: Array<{
    text: string;
    action: 'crisis' | 'retry' | 'alternative' | 'dismiss' | 'call_988';
    style: 'primary' | 'secondary' | 'crisis' | 'outline';
  }>;
  additionalGuidance?: string;
}

export const TherapeuticPaymentMessaging: React.FC<TherapeuticPaymentMessagingProps> = ({
  scenario,
  customMessage,
  paymentAmount,
  subscriptionPlan,
  errorCode,
  onCrisisSupport,
  onRetry,
  onAlternativeAction
}) => {
  const { enableCrisisMode } = useCrisisPaymentSafety();
  const {
    announceForScreenReader,
    simplifyPaymentLanguage,
    ensureMinimumContrast,
    isHighContrastEnabled,
    crisisAccessibilityMode,
  } = usePaymentAccessibility();

  const getTherapeuticMessage = (): TherapeuticMessage => {
    switch (scenario) {
      case 'payment_success':
        return {
          title: 'Your Investment in Wellbeing',
          message: customMessage || `Thank you for choosing to invest in your mental health journey${paymentAmount ? ` with your ${formatCurrency(paymentAmount)} contribution` : ''}. This decision reflects your commitment to self-care and healing.\n\nYour therapeutic access is now active, and we're honored to support your mindfulness practice.`,
          tone: 'positive',
          actions: [
            { text: 'Begin Practice', action: 'dismiss', style: 'primary' }
          ],
          additionalGuidance: 'Remember: This investment in yourself is an act of courage and self-compassion.'
        };

      case 'payment_failure':
        return {
          title: 'Payment Challenge - You\'re Not Alone',
          message: customMessage || `Payment difficulties can happen to anyone and don't reflect your worth or your commitment to healing. Financial challenges are especially common during mental health struggles.\n\n${getPaymentFailureGuidance(errorCode)}`,
          tone: 'supportive',
          actions: [
            { text: 'Try Different Method', action: 'retry', style: 'primary' },
            { text: 'Get Crisis Support', action: 'crisis', style: 'crisis' },
            { text: 'Call 988', action: 'call_988', style: 'crisis' },
            { text: 'Continue Anyway', action: 'alternative', style: 'outline' }
          ],
          additionalGuidance: 'Your therapeutic journey continues regardless of payment status. Crisis support and safety tools remain freely accessible.'
        };

      case 'subscription_change':
        return {
          title: 'Mindful Subscription Decision',
          message: customMessage || `Changing your subscription is a thoughtful decision about what feels sustainable and appropriate for your current circumstances. This choice honors your needs and boundaries.\n\nYour therapeutic progress isn't tied to your subscription level - growth comes from practice, not payment tiers.`,
          tone: 'supportive',
          actions: [
            { text: 'Confirm Change', action: 'alternative', style: 'primary' },
            { text: 'I Need More Time', action: 'dismiss', style: 'outline' }
          ],
          additionalGuidance: 'There\'s no judgment here - only support for decisions that serve your wellbeing.'
        };

      case 'financial_stress':
        return {
          title: 'Financial Stress Support',
          message: customMessage || 'Financial pressure can significantly impact mental health and trigger anxiety or depression. You\'re not alone in facing these challenges, and seeking support is a sign of strength.\n\nYour mental health matters regardless of your financial circumstances. Let\'s explore options that support both your wellbeing and your practical needs.',
          tone: 'crisis',
          actions: [
            { text: 'Activate Crisis Mode', action: 'crisis', style: 'crisis' },
            { text: 'Call 988 Hotline', action: 'call_988', style: 'crisis' },
            { text: 'Financial Assistance', action: 'alternative', style: 'secondary' },
            { text: 'Continue with Support', action: 'dismiss', style: 'outline' }
          ],
          additionalGuidance: 'Financial stress is a valid mental health concern. Professional support is available 24/7.'
        };

      case 'crisis_override':
        return {
          title: 'Crisis Support Activated',
          message: customMessage || 'Crisis support mode has been activated to ensure you have full access to therapeutic tools during this challenging time. All payment barriers have been removed.\n\nThis override prioritizes your safety and wellbeing above all else. You deserve support, and it\'s here for you now.',
          tone: 'crisis',
          actions: [
            { text: 'Call 988 Now', action: 'call_988', style: 'crisis' },
            { text: 'Access Therapeutic Tools', action: 'alternative', style: 'primary' },
            { text: 'Crisis Planning', action: 'crisis', style: 'secondary' }
          ],
          additionalGuidance: 'Crisis support remains active for 24 hours and can be extended as needed for your safety.'
        };

      case 'retry_guidance':
        return {
          title: 'Gentle Retry Guidance',
          message: customMessage || 'Payment processing can sometimes be sensitive, and multiple attempts can feel overwhelming. Take a mindful breath - there\'s no rush or pressure.\n\nIf you\'re feeling anxious about the payment process, that\'s completely understandable. Financial transactions can trigger stress, especially during vulnerable times.',
          tone: 'supportive',
          actions: [
            { text: 'Try Again Mindfully', action: 'retry', style: 'primary' },
            { text: 'I Need Support', action: 'crisis', style: 'secondary' },
            { text: 'Different Method', action: 'alternative', style: 'outline' },
            { text: 'Take a Break', action: 'dismiss', style: 'outline' }
          ],
          additionalGuidance: 'Remember: Your worth isn\'t tied to successful payment processing.'
        };

      default:
        return {
          title: 'Payment Update',
          message: customMessage || 'We\'re here to support your therapeutic journey, regardless of payment status.',
          tone: 'neutral',
          actions: [
            { text: 'Continue', action: 'dismiss', style: 'primary' }
          ]
        };
    }
  };

  const getPaymentFailureGuidance = (errorCode?: string): string => {
    switch (errorCode) {
      case 'card_declined':
        return 'Your card was declined, which can happen for various reasons including daily limits, holds, or bank security measures. This doesn\'t reflect on you personally.';
      case 'insufficient_funds':
        return 'Insufficient funds can be stressful and triggering. Financial struggles are especially common during mental health challenges. You\'re not alone in this.';
      case 'expired_card':
        return 'Your card has expired. This is a simple administrative matter that\'s easily resolved.';
      case 'authentication_required':
        return 'Additional authentication is needed. Your bank is protecting your account, which is positive.';
      default:
        return 'Payment processing encountered a temporary issue. This is often just a technical matter and doesn\'t reflect on your account or worthiness.';
    }
  };

  const formatCurrency = (amount: number): string => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  const handleAction = async (action: string) => {
    // Performance tracking for crisis actions
    const startTime = Date.now();

    switch (action) {
      case 'crisis':
        await enableCrisisMode('therapeutic_payment_messaging');
        await announceForScreenReader(
          'Crisis support activated. All therapeutic features are now freely available.',
          'assertive'
        );
        if (onCrisisSupport) {
          onCrisisSupport();
        }
        break;

      case 'call_988':
        await announceForScreenReader('Connecting to crisis hotline 988', 'assertive');
        await Linking.openURL('tel:988');
        break;

      case 'retry':
        await announceForScreenReader('Preparing to retry payment process with therapeutic support', 'polite');
        if (onRetry) {
          onRetry();
        }
        break;

      case 'alternative':
        if (onAlternativeAction) {
          onAlternativeAction();
        }
        break;

      case 'dismiss':
        // Component will be dismissed by parent
        break;
    }

    // Monitor crisis action performance
    const responseTime = Date.now() - startTime;
    if ((action === 'crisis' || action === 'call_988') && responseTime > 200) {
      console.warn(`Crisis action ${action} exceeded 200ms: ${responseTime}ms`);
    }
  };

  const getContainerStyle = (tone: string) => {
    const baseStyles = [styles.container];

    switch (tone) {
      case 'positive':
        baseStyles.push(styles.positiveContainer);
        break;
      case 'crisis':
        baseStyles.push(styles.crisisContainer);
        // Enhanced contrast for crisis mode
        if (crisisAccessibilityMode || isHighContrastEnabled) {
          baseStyles.push(styles.highContrastCrisisContainer);
        }
        break;
      case 'supportive':
        baseStyles.push(styles.supportiveContainer);
        break;
      default:
        baseStyles.push(styles.neutralContainer);
    }

    return baseStyles;
  };

  const getButtonStyle = (style: string) => {
    const baseStyles = [styles.actionButton];

    switch (style) {
      case 'primary':
        baseStyles.push(styles.primaryButton);
        break;
      case 'crisis':
        baseStyles.push(styles.crisisButton);
        // Enhanced size and contrast for crisis buttons
        if (crisisAccessibilityMode || isHighContrastEnabled) {
          baseStyles.push(styles.accessibleCrisisButton);
        }
        break;
      case 'secondary':
        baseStyles.push(styles.secondaryButton);
        break;
      default:
        baseStyles.push(styles.outlineButton);
    }

    // High contrast mode adjustments
    if (isHighContrastEnabled) {
      baseStyles.push(styles.highContrastButton);
    }

    return baseStyles;
  };

  const getButtonTextStyle = (style: string) => {
    let textStyle;

    switch (style) {
      case 'primary':
        textStyle = styles.primaryButtonText;
        break;
      case 'crisis':
        textStyle = [
          styles.crisisButtonText,
          (crisisAccessibilityMode || isHighContrastEnabled) && styles.accessibleCrisisButtonText
        ];
        break;
      case 'secondary':
        textStyle = styles.secondaryButtonText;
        break;
      default:
        textStyle = styles.outlineButtonText;
    }

    return textStyle;
  };

  const therapeuticMessage = getTherapeuticMessage();

  // Announce message for screen readers when component mounts
  React.useEffect(() => {
    const message = simplifyPaymentLanguage(therapeuticMessage.message);
    const priority = therapeuticMessage.tone === 'crisis' ? 'assertive' : 'polite';

    // Delay to allow component to render before announcing
    setTimeout(() => {
      announceForScreenReader(`${therapeuticMessage.title}. ${message}`, priority);
    }, 100);
  }, [therapeuticMessage, announceForScreenReader, simplifyPaymentLanguage]);

  return (
    <View
      style={getContainerStyle(therapeuticMessage.tone)}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={`${therapeuticMessage.title}. ${simplifyPaymentLanguage(therapeuticMessage.message)}`}
      accessibilityLiveRegion={therapeuticMessage.tone === 'crisis' ? 'assertive' : 'polite'}
    >
      <Text
        style={[
          styles.title,
          { color: ensureMinimumContrast(styles.title.color, colorSystem.base.white, 4.5) }
        ]}
        accessibilityRole="header"
      >
        {therapeuticMessage.title}
      </Text>

      <Text
        style={[
          styles.message,
          { color: ensureMinimumContrast(styles.message.color, colorSystem.base.white, 4.5) }
        ]}
        accessible={true}
        accessibilityLabel={simplifyPaymentLanguage(therapeuticMessage.message)}
      >
        {therapeuticMessage.message}
      </Text>

      {therapeuticMessage.additionalGuidance && (
        <View
          style={styles.guidanceContainer}
          accessible={true}
          accessibilityRole="complementary"
          accessibilityLabel="Additional guidance"
        >
          <Text
            style={[
              styles.guidanceText,
              { color: ensureMinimumContrast(styles.guidanceText.color, colorSystem.gray[50], 4.5) }
            ]}
            accessible={true}
            accessibilityLabel={simplifyPaymentLanguage(therapeuticMessage.additionalGuidance)}
          >
            {therapeuticMessage.additionalGuidance}
          </Text>
        </View>
      )}

      <View
        style={styles.actionsContainer}
        accessible={true}
        accessibilityRole="group"
        accessibilityLabel="Payment actions"
      >
        {therapeuticMessage.actions.map((action, index) => (
          <Pressable
            key={index}
            style={({ pressed }) => [
              getButtonStyle(action.style),
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
            ]}
            onPress={() => handleAction(action.action)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`${action.text} button`}
            accessibilityHint={getAccessibilityHint(action.action, action.style)}
            accessibilityState={{
              disabled: false,
            }}
            // Enhanced touch targets for crisis buttons
            hitSlop={action.style === 'crisis' ? { top: 12, bottom: 12, left: 12, right: 12 } : { top: 8, bottom: 8, left: 8, right: 8 }}
            android_ripple={{
              color: action.style === 'crisis' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)',
              borderless: false,
              radius: 200
            }}
          >
            <Text style={getButtonTextStyle(action.style)}>
              {action.text}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  // Helper function for accessibility hints
  function getAccessibilityHint(actionType: string, style: string): string {
    switch (actionType) {
      case 'crisis':
        return 'Double tap to activate crisis support mode and remove payment barriers';
      case 'call_988':
        return 'Double tap to call the crisis support hotline immediately';
      case 'retry':
        return 'Double tap to attempt payment again with therapeutic support';
      case 'alternative':
        return 'Double tap to explore alternative payment options';
      case 'dismiss':
        return 'Double tap to dismiss this message and continue';
      default:
        return `Double tap to ${actionType.replace('_', ' ')}`;
    }
  }
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  positiveContainer: {
    backgroundColor: colorSystem.status.successBackground,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.success,
  },

  crisisContainer: {
    backgroundColor: colorSystem.status.errorBackground,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.critical,
    borderWidth: 1,
    borderColor: colorSystem.status.error,
  },

  supportiveContainer: {
    backgroundColor: colorSystem.status.warningBackground,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.warning,
  },

  neutralContainer: {
    backgroundColor: colorSystem.status.infoBackground,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.info,
  },

  title: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.md,
  },

  message: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
    marginBottom: spacing.md,
  },

  guidanceContainer: {
    backgroundColor: colorSystem.gray[50],
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },

  guidanceText: {
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    minWidth: 80,
    minHeight: 44, // WCAG minimum touch target
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButton: {
    backgroundColor: colorSystem.status.info,
  },

  primaryButtonText: {
    color: colorSystem.base.white,
    fontSize: 14,
    fontWeight: '600',
  },

  crisisButton: {
    backgroundColor: colorSystem.status.critical,
  },

  crisisButtonText: {
    color: colorSystem.base.white,
    fontSize: 14,
    fontWeight: '700',
  },

  secondaryButton: {
    backgroundColor: colorSystem.status.warning,
  },

  secondaryButtonText: {
    color: colorSystem.base.white,
    fontSize: 14,
    fontWeight: '600',
  },

  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colorSystem.gray[400],
  },

  outlineButtonText: {
    color: colorSystem.accessibility.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },

  // High Contrast Accessibility Styles
  highContrastCrisisContainer: {
    borderWidth: 3,
    borderColor: colorSystem.accessibility.highContrast.error,
    backgroundColor: colorSystem.base.white,
    shadowColor: colorSystem.status.critical,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },

  accessibleCrisisButton: {
    minWidth: 100,
    minHeight: 48, // Enhanced touch target for crisis actions
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: colorSystem.base.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },

  accessibleCrisisButtonText: {
    fontSize: 16,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  highContrastButton: {
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default TherapeuticPaymentMessaging;