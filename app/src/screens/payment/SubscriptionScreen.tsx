/**
 * Subscription Screen - MBCT-Compliant Payment Tier Selection
 *
 * CLINICAL REQUIREMENTS:
 * - MBCT-compliant therapeutic language validated by clinician agent
 * - Crisis safety messaging prominently displayed
 * - Non-judgmental approach to payment decisions
 * - Always visible 988 hotline access
 * - Emergency override for crisis situations
 *
 * PERFORMANCE REQUIREMENTS:
 * - Screen load time <500ms
 * - Crisis button response <200ms
 * - Smooth animations for anxiety reduction
 * - Progressive loading of subscription data
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  Linking,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  usePaymentStore,
  usePaymentActions,
  usePaymentStatus,
  useCrisisPaymentSafety,
  useSubscriptionManagement,
  useTrialManagement
} from '../../store';
import { CrisisButton, Card, Button, LoadingScreen } from '../../components/core';
import { colorSystem, spacing, typography } from '../../constants/colors';

interface SubscriptionPlan {
  planId: string;
  name: string;
  therapeuticName: string; // MBCT-compliant display name
  description: string;
  price: number;
  interval: 'month' | 'year';
  originalPrice?: number; // For showing savings
  features: string[];
  trialDays?: number;
  recommended?: boolean;
  therapeuticBenefits: string[]; // Clinical benefits in MBCT language
}

// MBCT-Compliant Subscription Plans
const THERAPEUTIC_PLANS: SubscriptionPlan[] = [
  {
    planId: 'fullmind_free_trial',
    name: 'Mindful Foundation',
    therapeuticName: 'Begin Your Journey',
    description: 'Start with essential mindfulness practices, no payment required initially',
    price: 0,
    interval: 'month',
    features: [
      '7-day exploration period',
      'Basic MBCT practices',
      'Daily check-in support',
      'Crisis support tools (always free)',
      'Community guidelines access'
    ],
    therapeuticBenefits: [
      'Gentle introduction to mindful awareness',
      'Safe space to explore practices',
      'Foundation skills for emotional regulation'
    ],
    trialDays: 7
  },
  {
    planId: 'fullmind_monthly',
    name: 'Mindful Growth',
    therapeuticName: 'Deepen Your Practice',
    description: 'Comprehensive MBCT support with monthly flexibility',
    price: 999, // $9.99
    interval: 'month',
    features: [
      'Complete MBCT program access',
      'Guided meditation library',
      'Progress insights and tracking',
      'Personalized practice recommendations',
      'Crisis support tools (always free)',
      '24/7 therapeutic content access'
    ],
    therapeuticBenefits: [
      'Structured cognitive behavioral mindfulness',
      'Ongoing support for mood regulation',
      'Flexible commitment for healing journey'
    ],
    trialDays: 14
  },
  {
    planId: 'fullmind_annual',
    name: 'Mindful Commitment',
    therapeuticName: 'Your Year of Transformation',
    description: 'Deep therapeutic commitment with significant savings',
    price: 9999, // $99.99 (2 months free)
    originalPrice: 11988, // $119.88
    interval: 'year',
    features: [
      'Everything in Mindful Growth',
      'Advanced MBCT techniques',
      'Annual progress reports',
      'Priority therapeutic support',
      'Early access to new practices',
      'Crisis support tools (always free)',
      'Offline practice downloads'
    ],
    therapeuticBenefits: [
      'Sustained engagement for lasting change',
      'Advanced emotional regulation skills',
      'Long-term therapeutic relationship'
    ],
    trialDays: 21,
    recommended: true
  }
];

const SubscriptionScreen: React.FC = () => {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Enhanced store integration with subscription management
  const {
    availablePlans,
    activeSubscription,
    loadingPlans,
    showSubscriptionSelector,
    subscriptionManager
  } = usePaymentStore();

  const {
    loadCustomer,
    createSubscription,
    initializeSubscriptionManager
  } = usePaymentActions();

  const {
    subscriptionStatus,
    featureAccess,
    paymentError,
    crisisMode,
    isLoading,
    subscriptionTier,
    trialInfo
  } = usePaymentStatus();

  const {
    crisisOverride,
    enableCrisisMode,
    performanceMetrics
  } = useCrisisPaymentSafety();

  // Enhanced subscription management hooks
  const {
    subscriptionManager: managerInstance,
    startMindfulTrial,
    syncSubscriptionState
  } = useSubscriptionManagement();

  const {
    trialActive,
    daysRemaining: trialDaysRemaining,
    convertTrialToPaid
  } = useTrialManagement();

  // Component state
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [trialTimeRemaining, setTrialTimeRemaining] = useState<number | null>(null);
  const [showCrisisOverride, setShowCrisisOverride] = useState(false);
  const [isProcessingSubscription, setIsProcessingSubscription] = useState(false);
  const [paymentAnxietyDetected, setPaymentAnxietyDetected] = useState(false);

  // Performance monitoring
  const screenLoadStart = useRef(Date.now());
  const [screenLoadTime, setScreenLoadTime] = useState<number | null>(null);

  useEffect(() => {
    initializeScreen();
  }, []);

  useEffect(() => {
    // Monitor crisis mode activation
    if (crisisMode && !showCrisisOverride) {
      setShowCrisisOverride(true);
      announceForScreenReader('Crisis support mode activated. All therapeutic features are now freely available for your safety.');
    }
  }, [crisisMode]);

  useEffect(() => {
    // Calculate trial time if applicable
    if (activeSubscription?.plan?.trialDays) {
      const trialEndTime = new Date(activeSubscription.currentPeriodEnd).getTime();
      const currentTime = Date.now();
      const timeRemaining = Math.max(0, Math.floor((trialEndTime - currentTime) / (1000 * 60 * 60 * 24)));
      setTrialTimeRemaining(timeRemaining);
    }
  }, [activeSubscription]);

  const initializeScreen = async () => {
    try {
      // Initialize enhanced subscription management
      if (!subscriptionManager) {
        await initializeSubscriptionManager();
      }

      // Initialize payment system
      await loadCustomer('current_user');

      // Sync subscription state
      await syncSubscriptionState();

      // Start entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Record screen load performance
      const loadTime = Date.now() - screenLoadStart.current;
      setScreenLoadTime(loadTime);

      if (loadTime > 500) {
        console.warn(`Subscription screen load time exceeded target: ${loadTime}ms`);
      }

    } catch (error) {
      console.error('Subscription screen initialization failed:', error);
      // Enable crisis mode if payment system fails
      handleCrisisActivation('payment_system_unavailable');
    }
  };

  const handleCrisisActivation = useCallback(async (reason: string) => {
    try {
      await enableCrisisMode(reason);
      setShowCrisisOverride(true);

      Alert.alert(
        'Crisis Support Activated',
        'All therapeutic features are now freely available. Your wellbeing is our priority.\n\nCall 988 for immediate crisis support.',
        [
          {
            text: 'Call 988',
            onPress: () => Linking.openURL('tel:988'),
            style: 'destructive'
          },
          { text: 'Continue', style: 'default' }
        ]
      );
    } catch (error) {
      console.error('Crisis activation failed:', error);
      // Still show crisis support options
      setShowCrisisOverride(true);
    }
  }, [enableCrisisMode]);

  const announceForScreenReader = (message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  };

  const handlePlanSelection = useCallback(async (plan: SubscriptionPlan) => {
    // Detect potential payment anxiety
    if (Date.now() - screenLoadStart.current < 3000) {
      // Very quick selection might indicate anxiety
      setPaymentAnxietyDetected(true);
      announceForScreenReader('Take your time. There\'s no pressure to decide quickly. Your therapeutic access is secure.');
    }

    setSelectedPlan(plan);

    // Show therapeutic guidance for payment decisions
    const therapeuticMessage = `You're considering ${plan.therapeuticName}. This decision is part of your self-care journey. Take the time you need to choose what feels right for you.`;

    Alert.alert(
      'Mindful Decision',
      therapeuticMessage,
      [
        {
          text: 'I need more time',
          style: 'cancel',
          onPress: () => setSelectedPlan(null)
        },
        {
          text: 'Continue mindfully',
          onPress: () => proceedWithSubscription(plan)
        }
      ]
    );
  }, []);

  const proceedWithSubscription = async (plan: SubscriptionPlan) => {
    if (!plan) return;

    setIsProcessingSubscription(true);

    try {
      // For free trial, use enhanced trial management
      if (plan.price === 0 || plan.planId === 'fullmind_free_trial') {
        await startMindfulTrial('current_user');
        announceForScreenReader('Your mindful foundation access has been activated. Welcome to your journey.');
        navigation.goBack();
        return;
      }

      // For trial to paid conversion
      if (trialActive && managerInstance) {
        await convertTrialToPaid(plan.planId);
        announceForScreenReader(`Your subscription has been upgraded to ${plan.therapeuticName}. Your journey continues seamlessly.`);
        navigation.goBack();
        return;
      }

      // Navigate to payment method screen for new paid plans
      (navigation as any).navigate('PaymentMethodScreen', {
        selectedPlan: plan,
        returnScreen: 'SubscriptionScreen'
      });

    } catch (error) {
      console.error('Subscription process failed:', error);
      handleSubscriptionError(error, plan);
    } finally {
      setIsProcessingSubscription(false);
    }
  };

  const handleSubscriptionError = (error: any, plan: SubscriptionPlan) => {
    const isAnxietyTrigger = error.code === 'card_declined' || error.code === 'insufficient_funds';

    if (isAnxietyTrigger || paymentAnxietyDetected) {
      // Provide therapeutic response to payment failures
      Alert.alert(
        'Payment Difficulty - You\'re Not Alone',
        'Payment challenges can feel overwhelming. Remember, this doesn\'t define your worth or your ability to heal.\n\nYour therapeutic journey can continue regardless of payment status.',
        [
          {
            text: 'Activate Crisis Support',
            onPress: () => handleCrisisActivation('payment_stress'),
            style: 'destructive'
          },
          {
            text: 'Try Different Method',
            onPress: () => navigation.goBack()
          },
          { text: 'Take a Mindful Pause', style: 'cancel' }
        ]
      );
    } else {
      // Standard error handling
      Alert.alert(
        'Subscription Update',
        'We encountered a temporary issue. Your therapeutic access remains secure while we resolve this.',
        [{ text: 'OK' }]
      );
    }
  };

  const CrisisPaymentBanner: React.FC = () => (
    <View style={styles.crisisBanner}>
      <View style={styles.crisisHeader}>
        <Text style={styles.crisisTitle}>Crisis Support Always Free</Text>
        <TouchableOpacity
          onPress={() => Linking.openURL('tel:988')}
          style={styles.hotlineButton}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Call 988 crisis hotline immediately"
          accessibilityHint="Double tap to call the crisis support hotline"
        >
          <Text style={styles.hotlineText}>988</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.crisisMessage}>
        All crisis support tools, emergency contacts, and therapeutic safety features remain freely accessible regardless of subscription status.
      </Text>
    </View>
  );

  const TrialCountdown: React.FC = () => {
    // Use enhanced trial management for display
    const daysRemaining = trialActive ? trialDaysRemaining : trialTimeRemaining;

    if (!daysRemaining) return null;

    return (
      <View style={styles.trialBanner}>
        <Text style={styles.trialText}>
          Your mindful exploration continues: {daysRemaining} days remaining
        </Text>
        <Text style={styles.trialSubtext}>
          No pressure - choose what feels right for your journey
        </Text>
        {trialActive && (
          <Text style={styles.trialManagerStatus}>
            ✓ Enhanced trial management active
          </Text>
        )}
      </View>
    );
  };

  const TherapeuticPlanCard: React.FC<{ plan: SubscriptionPlan }> = ({ plan }) => {
    const isSelected = selectedPlan?.planId === plan.planId;
    const isCurrentPlan = activeSubscription?.plan?.planId === plan.planId;

    return (
      <TouchableOpacity
        style={[
          styles.planCard,
          plan.recommended && styles.recommendedCard,
          isSelected && styles.selectedCard,
          isCurrentPlan && styles.currentPlanCard
        ]}
        onPress={() => handlePlanSelection(plan)}
        disabled={isProcessingSubscription || isCurrentPlan}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${plan.therapeuticName}: ${plan.description}`}
        accessibilityHint={`Double tap to learn more about this mindfulness plan`}
        accessibilityState={{
          selected: isSelected,
          disabled: isProcessingSubscription || isCurrentPlan
        }}
      >
        {plan.recommended && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>Therapeutically Recommended</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <Text style={styles.planName}>{plan.therapeuticName}</Text>
          <View style={styles.priceContainer}>
            {plan.originalPrice && (
              <Text style={styles.originalPrice}>
                ${(plan.originalPrice / 100).toFixed(2)}
              </Text>
            )}
            <Text style={styles.planPrice}>
              {plan.price === 0 ? 'Free' : `$${(plan.price / 100).toFixed(2)}`}
              {plan.price > 0 && (
                <Text style={styles.priceInterval}>/{plan.interval}</Text>
              )}
            </Text>
          </View>
        </View>

        <Text style={styles.planDescription}>{plan.description}</Text>

        {plan.trialDays && (
          <Text style={styles.trialInfo}>
            Includes {plan.trialDays}-day mindful exploration period
          </Text>
        )}

        <View style={styles.therapeuticBenefits}>
          <Text style={styles.benefitsTitle}>Therapeutic Benefits:</Text>
          {plan.therapeuticBenefits.map((benefit, index) => (
            <Text key={index} style={styles.benefitItem}>• {benefit}</Text>
          ))}
        </View>

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>What's Included:</Text>
          {plan.features.map((feature, index) => (
            <Text key={index} style={styles.featureItem}>✓ {feature}</Text>
          ))}
        </View>

        {isCurrentPlan && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Your Current Plan</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const PaymentAnxietySupport: React.FC = () => {
    if (!paymentAnxietyDetected) return null;

    return (
      <View style={styles.anxietySupport}>
        <Text style={styles.anxietySupportTitle}>Take a Mindful Breath</Text>
        <Text style={styles.anxietySupportText}>
          Payment decisions can feel overwhelming. Remember: your worth isn't determined by what you can afford.
          Take the time you need, and know that crisis support is always available.
        </Text>
        <View style={styles.anxietySupportActions}>
          <Button
            variant="outline"
            onPress={() => handleCrisisActivation('payment_anxiety')}
            style={styles.anxietyButton}
          >
            Access Crisis Support
          </Button>
          <Button
            variant="secondary"
            onPress={() => setPaymentAnxietyDetected(false)}
          >
            Continue When Ready
          </Button>
        </View>
      </View>
    );
  };

  if (isLoading && !showCrisisOverride) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <CrisisButton variant="floating" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Crisis Safety Banner - Always Visible */}
          <CrisisPaymentBanner />

          {/* Crisis Override Message */}
          {showCrisisOverride && (
            <View style={styles.crisisOverride}>
              <Text style={styles.crisisOverrideTitle}>Crisis Support Activated</Text>
              <Text style={styles.crisisOverrideText}>
                All therapeutic features are now freely available. Your safety and wellbeing are our highest priority.
              </Text>
            </View>
          )}

          {/* Trial Countdown */}
          <TrialCountdown />

          {/* Payment Anxiety Support */}
          <PaymentAnxietySupport />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Choose Your Mindful Journey</Text>
            <Text style={styles.subtitle}>
              Every option supports your therapeutic growth. Choose what feels aligned with your current needs and circumstances.
            </Text>
          </View>

          {/* Subscription Plans */}
          <View style={styles.plansContainer}>
            {THERAPEUTIC_PLANS.map((plan) => (
              <TherapeuticPlanCard key={plan.planId} plan={plan} />
            ))}
          </View>

          {/* Therapeutic Guidance */}
          <View style={styles.therapeuticGuidance}>
            <Text style={styles.guidanceTitle}>Mindful Subscription Guidance</Text>
            <Text style={styles.guidanceText}>
              • Choose based on your current capacity, not external pressure
            </Text>
            <Text style={styles.guidanceText}>
              • Your therapeutic journey is valid regardless of subscription level
            </Text>
            <Text style={styles.guidanceText}>
              • Crisis support remains free and accessible at all times
            </Text>
            <Text style={styles.guidanceText}>
              • You can change or cancel anytime without judgment
            </Text>
          </View>

          {/* Performance Information (Debug) */}
          {__DEV__ && screenLoadTime && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                Screen load: {screenLoadTime}ms | Performance: {screenLoadTime < 500 ? '✓' : '⚠️'}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for floating crisis button
  },
  content: {
    paddingHorizontal: spacing.md,
  },

  // Crisis Safety Components
  crisisBanner: {
    backgroundColor: colorSystem.status.critical,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: 12,
  },
  crisisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  crisisTitle: {
    color: colorSystem.base.white,
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
  },
  hotlineButton: {
    backgroundColor: colorSystem.base.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  hotlineText: {
    color: colorSystem.status.critical,
    fontSize: 18,
    fontWeight: '700',
  },
  crisisMessage: {
    color: colorSystem.base.white,
    fontSize: typography.bodyRegular.size,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
  },

  crisisOverride: {
    backgroundColor: colorSystem.status.successBackground,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.success,
  },
  crisisOverrideTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.status.success,
    marginBottom: spacing.sm,
  },
  crisisOverrideText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
  },

  // Trial Components
  trialBanner: {
    backgroundColor: colorSystem.status.infoBackground,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.info,
  },
  trialText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    color: colorSystem.status.info,
    marginBottom: spacing.xs,
  },
  trialSubtext: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.secondary,
  },
  trialManagerStatus: {
    fontSize: 12,
    color: colorSystem.status.success,
    fontWeight: '600',
    marginTop: spacing.xs,
  },

  // Anxiety Support
  anxietySupport: {
    backgroundColor: colorSystem.status.warningBackground,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  anxietySupportTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.status.warning,
    marginBottom: spacing.sm,
  },
  anxietySupportText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
    marginBottom: spacing.md,
  },
  anxietySupportActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  anxietyButton: {
    flex: 1,
  },

  // Header
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.headline1.size,
    fontWeight: typography.headline1.weight,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.bodyLarge.size,
    color: colorSystem.accessibility.text.secondary,
    lineHeight: typography.bodyLarge.lineHeight * typography.bodyLarge.size,
  },

  // Plans
  plansContainer: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  planCard: {
    backgroundColor: colorSystem.base.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    position: 'relative',
  },
  recommendedCard: {
    borderColor: colorSystem.status.success,
    borderWidth: 2,
  },
  selectedCard: {
    borderColor: colorSystem.status.info,
    borderWidth: 2,
    backgroundColor: colorSystem.status.infoBackground,
  },
  currentPlanCard: {
    borderColor: colorSystem.themes.midday.primary,
    borderWidth: 2,
    backgroundColor: colorSystem.themes.midday.background,
  },

  recommendedBadge: {
    position: 'absolute',
    top: -8,
    left: spacing.md,
    backgroundColor: colorSystem.status.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  recommendedText: {
    color: colorSystem.base.white,
    fontSize: 12,
    fontWeight: '600',
  },

  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  planName: {
    fontSize: typography.headline2.size,
    fontWeight: typography.headline2.weight,
    color: colorSystem.accessibility.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  originalPrice: {
    fontSize: 14,
    color: colorSystem.gray[500],
    textDecorationLine: 'line-through',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: colorSystem.status.info,
  },
  priceInterval: {
    fontSize: 16,
    fontWeight: '400',
    color: colorSystem.accessibility.text.secondary,
  },

  planDescription: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.secondary,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
    marginBottom: spacing.md,
  },

  trialInfo: {
    fontSize: 14,
    color: colorSystem.status.info,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },

  therapeuticBenefits: {
    marginBottom: spacing.md,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.sm,
  },
  benefitItem: {
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
  },

  features: {
    marginBottom: spacing.md,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.sm,
  },
  featureItem: {
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
    marginBottom: spacing.xs,
  },

  currentBadge: {
    backgroundColor: colorSystem.themes.midday.primary,
    padding: spacing.sm,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  currentBadgeText: {
    color: colorSystem.base.white,
    fontSize: 14,
    fontWeight: '600',
  },

  // Therapeutic Guidance
  therapeuticGuidance: {
    backgroundColor: colorSystem.gray[50],
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  guidanceTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.md,
  },
  guidanceText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.secondary,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
    marginBottom: spacing.sm,
  },

  // Debug Information
  debugInfo: {
    backgroundColor: colorSystem.gray[100],
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  debugText: {
    fontSize: 12,
    color: colorSystem.gray[600],
    fontFamily: 'Courier',
  },
});

export default SubscriptionScreen;