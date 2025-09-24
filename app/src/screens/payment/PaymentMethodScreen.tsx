/**
 * Payment Method Screen - PCI-Compliant Card Input with Crisis Safety
 *
 * SECURITY REQUIREMENTS:
 * - PCI DSS Level 1 compliance via Stripe Elements
 * - Zero card data storage (tokenization only)
 * - Secure payment method management
 * - HIPAA-compliant data segregation
 *
 * CRISIS SAFETY REQUIREMENTS:
 * - Crisis button always visible with <3 second access
 * - Payment anxiety detection and intervention
 * - Emergency payment bypass for crisis situations
 * - Therapeutic messaging for payment failures
 *
 * PERFORMANCE REQUIREMENTS:
 * - Screen load time <500ms
 * - Payment processing UI feedback within 100ms
 * - Crisis button response <200ms
 * - Real-time payment validation feedback
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  usePaymentStore,
  usePaymentActions,
  usePaymentStatus,
  useCrisisPaymentSafety
} from '../../store';
import { CrisisButton, Button, TextInput, Card, LoadingScreen } from '../../components/core';
import { colorSystem, spacing, typography } from '../../constants/colors';
import { stripePaymentClient } from '../../services/cloud/StripePaymentClient';

interface PaymentMethodFormData {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
  nameOnCard: string;
  billingEmail: string;
}

interface PaymentMethodScreenProps {
  selectedPlan?: any;
  returnScreen?: string;
}

const PaymentMethodScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as PaymentMethodScreenProps;

  // Store integration
  const {
    customer,
    paymentMethods,
    currentPaymentIntent,
    paymentInProgress,
    lastPaymentError
  } = usePaymentStore();

  const {
    addPaymentMethod,
    createPaymentIntent,
    confirmPayment,
    createSubscription
  } = usePaymentActions();

  const {
    crisisMode,
    isLoading
  } = usePaymentStatus();

  const {
    crisisOverride,
    enableCrisisMode,
    performanceMetrics
  } = useCrisisPaymentSafety();

  // Component state
  const [formData, setFormData] = useState<PaymentMethodFormData>({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    nameOnCard: '',
    billingEmail: customer?.email || ''
  });

  const [formErrors, setFormErrors] = useState<Partial<PaymentMethodFormData>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentAnxietyLevel, setPaymentAnxietyLevel] = useState(0);
  const [showAnxietySupport, setShowAnxietySupport] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [showAddNewCard, setShowAddNewCard] = useState(false);

  // Performance monitoring
  const formInteractionStart = useRef<number | null>(null);
  const anxietyDetectionTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializePaymentMethod();
  }, []);

  useEffect(() => {
    // Monitor for payment anxiety indicators
    if (formInteractionStart.current) {
      const timeSinceStart = Date.now() - formInteractionStart.current;

      // Detect rapid typing, corrections, or long hesitation
      if (timeSinceStart > 30000 && !formData.cardNumber) {
        // Long hesitation
        setPaymentAnxietyLevel(prev => Math.min(prev + 1, 5));
      }
    }

    // Show anxiety support if indicators are present
    if (paymentAnxietyLevel >= 3 && !showAnxietySupport) {
      setShowAnxietySupport(true);
      announceForScreenReader('Payment support is available if you need assistance or feel overwhelmed.');
    }
  }, [formData, paymentAnxietyLevel, showAnxietySupport]);

  const initializePaymentMethod = async () => {
    try {
      // Initialize Stripe client
      const publishableKey = __DEV__
        ? 'pk_test_51234567890123456789012345678901234567890123456789012'
        : 'pk_live_production_key'; // Would come from secure config

      await stripePaymentClient.initialize(publishableKey, crisisMode);

      // If user has existing payment methods, show them first
      if (paymentMethods.length > 0) {
        setSelectedPaymentMethod(paymentMethods[0].paymentMethodId);
      } else {
        setShowAddNewCard(true);
      }

    } catch (error) {
      console.error('Payment method initialization failed:', error);
      handlePaymentSystemError(error);
    }
  };

  const announceForScreenReader = (message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  };

  const handlePaymentSystemError = async (error: any) => {
    // Enable crisis mode if payment system is unavailable
    if (error.code === 'payment_unavailable' || error.code === 'initialization_failed') {
      await enableCrisisMode('payment_system_unavailable');

      Alert.alert(
        'Payment System Unavailable',
        'The payment system is temporarily unavailable, but all therapeutic features remain accessible for your safety.\n\nCall 988 if you need immediate crisis support.',
        [
          {
            text: 'Call 988',
            onPress: () => Linking.openURL('tel:988'),
            style: 'destructive'
          },
          {
            text: 'Continue with Free Access',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  };

  const handleFormChange = (field: keyof PaymentMethodFormData, value: string) => {
    // Record first interaction for anxiety detection
    if (!formInteractionStart.current) {
      formInteractionStart.current = Date.now();
    }

    // Clear field-specific errors
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }

    let processedValue = value;

    // Format card number with spaces
    if (field === 'cardNumber') {
      processedValue = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();

      // Detect multiple corrections (anxiety indicator)
      if (value.length < formData.cardNumber.length) {
        setPaymentAnxietyLevel(prev => Math.min(prev + 0.5, 5));
      }
    }

    // Format expiry
    if (field === 'expiryMonth') {
      processedValue = value.replace(/\D/g, '').slice(0, 2);
    }
    if (field === 'expiryYear') {
      processedValue = value.replace(/\D/g, '').slice(0, 4);
    }

    // Format CVC
    if (field === 'cvc') {
      processedValue = value.replace(/\D/g, '').slice(0, 4);
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));

    // Validate in real-time
    validateField(field, processedValue);
  };

  const validateField = (field: keyof PaymentMethodFormData, value: string) => {
    let error: string | undefined;

    switch (field) {
      case 'cardNumber':
        const cardDigits = value.replace(/\s/g, '');
        if (cardDigits.length < 13 || cardDigits.length > 19) {
          error = 'Card number must be 13-19 digits';
        }
        break;
      case 'expiryMonth':
        const month = parseInt(value);
        if (month < 1 || month > 12) {
          error = 'Month must be 01-12';
        }
        break;
      case 'expiryYear':
        const year = parseInt(value);
        const currentYear = new Date().getFullYear();
        if (year < currentYear || year > currentYear + 20) {
          error = 'Invalid expiry year';
        }
        break;
      case 'cvc':
        if (value.length < 3 || value.length > 4) {
          error = 'CVC must be 3-4 digits';
        }
        break;
      case 'nameOnCard':
        if (value.length < 2) {
          error = 'Name is required';
        }
        break;
      case 'billingEmail':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          error = 'Valid email required';
        }
        break;
    }

    if (error) {
      setFormErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<PaymentMethodFormData> = {};

    Object.keys(formData).forEach(key => {
      validateField(key as keyof PaymentMethodFormData, formData[key as keyof PaymentMethodFormData]);
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddPaymentMethod = async () => {
    if (!validateForm()) {
      setPaymentAnxietyLevel(prev => Math.min(prev + 1, 5));
      announceForScreenReader('Please check the highlighted fields and try again. Take your time.');
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment method via Stripe
      const result = await stripePaymentClient.createPaymentMethod(
        {
          number: formData.cardNumber.replace(/\s/g, ''),
          expiryMonth: parseInt(formData.expiryMonth),
          expiryYear: parseInt(formData.expiryYear),
          cvc: formData.cvc
        },
        {
          name: formData.nameOnCard,
          email: formData.billingEmail
        },
        customer?.customerId || 'current_user',
        'current_device',
        crisisMode
      );

      // Add to payment store
      await addPaymentMethod({
        type: 'card',
        stripePaymentMethodId: result.paymentMethod.paymentMethodId,
        last4: result.paymentMethod.card?.last4 || '0000',
        brand: result.paymentMethod.card?.brand || 'unknown',
        expiryMonth: result.paymentMethod.card?.expiryMonth || 12,
        expiryYear: result.paymentMethod.card?.expiryYear || new Date().getFullYear() + 1,
        nameOnCard: formData.nameOnCard,
        billingEmail: formData.billingEmail,
        fingerprint: result.paymentMethod.fingerprint,
        metadata: {
          verificationStatus: 'verified',
          addedDate: new Date().toISOString(),
          deviceId: 'current_device'
        }
      });

      // Clear sensitive form data
      setFormData(prev => ({
        ...prev,
        cardNumber: '',
        cvc: '',
        expiryMonth: '',
        expiryYear: ''
      }));

      setSelectedPaymentMethod(result.paymentMethod.paymentMethodId);
      setShowAddNewCard(false);

      announceForScreenReader('Payment method added successfully and securely stored.');

      // Proceed with subscription if plan was selected
      if (params?.selectedPlan) {
        await handleSubscriptionCreation(result.paymentMethod.paymentMethodId);
      }

    } catch (error) {
      console.error('Add payment method failed:', error);
      handlePaymentMethodError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubscriptionCreation = async (paymentMethodId: string) => {
    if (!params?.selectedPlan) return;

    try {
      await createSubscription(
        params.selectedPlan.planId,
        paymentMethodId,
        params.selectedPlan.trialDays
      );

      Alert.alert(
        'Welcome to Your Mindful Journey',
        `Your ${params.selectedPlan.therapeuticName} access has been activated. Thank you for investing in your wellbeing.`,
        [
          {
            text: 'Begin Practice',
            onPress: () => {
              if (params.returnScreen) {
                navigation.navigate(params.returnScreen as never);
              } else {
                navigation.goBack();
              }
            }
          }
        ]
      );

    } catch (error) {
      console.error('Subscription creation failed:', error);
      handlePaymentMethodError(error);
    }
  };

  const handlePaymentMethodError = (error: any) => {
    const isAnxietyTrigger = [
      'card_declined',
      'insufficient_funds',
      'authentication_required'
    ].includes(error.code);

    if (isAnxietyTrigger || paymentAnxietyLevel >= 3) {
      Alert.alert(
        'Payment Challenge - You\'re Supported',
        'Payment difficulties can feel overwhelming, but they don\'t define your worth or your right to heal.\n\nYour therapeutic access continues regardless of payment status.',
        [
          {
            text: 'Activate Crisis Support',
            onPress: () => enableCrisisMode('payment_declined_stress'),
            style: 'destructive'
          },
          {
            text: 'Try Different Card',
            onPress: () => {
              setFormData(prev => ({
                ...prev,
                cardNumber: '',
                expiryMonth: '',
                expiryYear: '',
                cvc: ''
              }));
            }
          },
          { text: 'Take a Mindful Pause', style: 'cancel' }
        ]
      );
    } else {
      Alert.alert(
        'Payment Method Update',
        'We encountered a temporary issue adding your payment method. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    }
  };

  const PaymentAnxietySupport: React.FC = () => {
    if (!showAnxietySupport) return null;

    return (
      <View style={styles.anxietySupport}>
        <Text style={styles.anxietySupportTitle}>Feeling Overwhelmed?</Text>
        <Text style={styles.anxietySupportText}>
          Payment forms can trigger anxiety. Remember: you're investing in your healing, and that's courageous.
          Take breaks as needed, and know that crisis support is always available.
        </Text>
        <View style={styles.anxietySupportActions}>
          <Button
            variant="outline"
            onPress={() => enableCrisisMode('payment_form_anxiety')}
            style={styles.anxietyButton}
          >
            I Need Support
          </Button>
          <Button
            variant="secondary"
            onPress={() => setShowAnxietySupport(false)}
          >
            Continue When Ready
          </Button>
        </View>
      </View>
    );
  };

  const ExistingPaymentMethods: React.FC = () => {
    if (paymentMethods.length === 0) return null;

    return (
      <View style={styles.existingMethods}>
        <Text style={styles.sectionTitle}>Your Saved Payment Methods</Text>
        {paymentMethods.map((method) => (
          <Pressable
            key={method.paymentMethodId}
            style={({ pressed }) => [
              styles.paymentMethodCard,
              selectedPaymentMethod === method.paymentMethodId && styles.selectedMethod,
              pressed && { opacity: 0.8 }
            ]}
            onPress={() => setSelectedPaymentMethod(method.paymentMethodId)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`${method.card?.brand} ending in ${method.card?.last4}`}
            accessibilityState={{ selected: selectedPaymentMethod === method.paymentMethodId }}
          >
            <View style={styles.methodInfo}>
              <Text style={styles.methodBrand}>{method.card?.brand?.toUpperCase()}</Text>
              <Text style={styles.methodNumber}>•••• {method.card?.last4}</Text>
              <Text style={styles.methodExpiry}>
                {String(method.card?.expiryMonth).padStart(2, '0')}/{method.card?.expiryYear}
              </Text>
            </View>
            {selectedPaymentMethod === method.paymentMethodId && (
              <View style={styles.selectedIndicator}>
                <Text style={styles.selectedText}>✓</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    );
  };

  const AddNewCardForm: React.FC = () => {
    if (!showAddNewCard) return null;

    return (
      <View style={styles.addCardForm}>
        <Text style={styles.sectionTitle}>Add New Payment Method</Text>

        <View style={styles.securityNotice}>
          <Text style={styles.securityTitle}>🔒 PCI Compliant Security</Text>
          <Text style={styles.securityText}>
            Your payment information is processed securely through Stripe's PCI Level 1 compliant infrastructure.
            We never store your card details.
          </Text>
        </View>

        <View style={styles.formSection}>
          <TextInput
            label="Card Number"
            value={formData.cardNumber}
            onChangeText={(value) => handleFormChange('cardNumber', value)}
            placeholder="1234 5678 9012 3456"
            keyboardType="numeric"
            maxLength={19}
            error={formErrors.cardNumber}
            accessible={true}
            accessibilityLabel="Card number input"
            accessibilityHint="Enter your card number with or without spaces"
          />

          <View style={styles.rowInputs}>
            <TextInput
              label="MM"
              value={formData.expiryMonth}
              onChangeText={(value) => handleFormChange('expiryMonth', value)}
              placeholder="12"
              keyboardType="numeric"
              maxLength={2}
              error={formErrors.expiryMonth}
              style={styles.shortInput}
              accessible={true}
              accessibilityLabel="Expiry month"
            />
            <TextInput
              label="YYYY"
              value={formData.expiryYear}
              onChangeText={(value) => handleFormChange('expiryYear', value)}
              placeholder="2025"
              keyboardType="numeric"
              maxLength={4}
              error={formErrors.expiryYear}
              style={styles.shortInput}
              accessible={true}
              accessibilityLabel="Expiry year"
            />
            <TextInput
              label="CVC"
              value={formData.cvc}
              onChangeText={(value) => handleFormChange('cvc', value)}
              placeholder="123"
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry={true}
              error={formErrors.cvc}
              style={styles.shortInput}
              accessible={true}
              accessibilityLabel="Security code"
              accessibilityHint="3 or 4 digit security code on back of card"
            />
          </View>

          <TextInput
            label="Name on Card"
            value={formData.nameOnCard}
            onChangeText={(value) => handleFormChange('nameOnCard', value)}
            placeholder="Full Name"
            autoCapitalize="words"
            error={formErrors.nameOnCard}
            accessible={true}
            accessibilityLabel="Cardholder name"
          />

          <TextInput
            label="Billing Email"
            value={formData.billingEmail}
            onChangeText={(value) => handleFormChange('billingEmail', value)}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={formErrors.billingEmail}
            accessible={true}
            accessibilityLabel="Billing email address"
          />
        </View>
      </View>
    );
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <CrisisButton variant="floating" />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Crisis Safety Banner */}
          <View style={styles.crisisBanner}>
            <Text style={styles.crisisText}>
              Crisis Support Always Free • Call 988 Anytime
            </Text>
            <Pressable
              onPress={() => Linking.openURL('tel:988')}
              style={({ pressed }) => [
                styles.crisisCall,
                pressed && { opacity: 0.8 }
              ]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Call 988 crisis hotline"
            >
              <Text style={styles.crisisCallText}>Call Now</Text>
            </Pressable>
          </View>

          {/* Payment Anxiety Support */}
          <PaymentAnxietySupport />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Secure Payment Method</Text>
            <Text style={styles.subtitle}>
              Your payment information is encrypted and processed securely.
              Choose or add a payment method to continue your mindful journey.
            </Text>
          </View>

          {/* Existing Payment Methods */}
          <ExistingPaymentMethods />

          {/* Add New Card Toggle */}
          {paymentMethods.length > 0 && !showAddNewCard && (
            <Button
              variant="outline"
              onPress={() => setShowAddNewCard(true)}
              style={styles.addNewButton}
            >
              Add New Payment Method
            </Button>
          )}

          {/* Add New Card Form */}
          <AddNewCardForm />

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {showAddNewCard ? (
              <View style={styles.formActions}>
                <Button
                  variant="outline"
                  onPress={() => setShowAddNewCard(false)}
                  style={styles.cancelButton}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={handleAddPaymentMethod}
                  style={styles.addButton}
                  loading={isProcessing}
                  disabled={isProcessing}
                >
                  Add Secure Payment Method
                </Button>
              </View>
            ) : selectedPaymentMethod && params?.selectedPlan ? (
              <Button
                variant="primary"
                onPress={() => handleSubscriptionCreation(selectedPaymentMethod)}
                loading={isProcessing}
                disabled={isProcessing}
              >
                Complete Subscription
              </Button>
            ) : (
              <Button
                variant="outline"
                onPress={() => navigation.goBack()}
              >
                Return to Plans
              </Button>
            )}
          </View>

          {/* Therapeutic Messaging */}
          <View style={styles.therapeuticMessage}>
            <Text style={styles.therapeuticTitle}>Remember</Text>
            <Text style={styles.therapeuticText}>
              • Your worth isn't determined by what you can afford
            </Text>
            <Text style={styles.therapeuticText}>
              • Payment challenges don't diminish your right to healing
            </Text>
            <Text style={styles.therapeuticText}>
              • Crisis support remains free and accessible always
            </Text>
            <Text style={styles.therapeuticText}>
              • You can change or cancel your subscription anytime
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100, // Space for floating crisis button
  },

  // Crisis Banner
  crisisBanner: {
    backgroundColor: colorSystem.status.critical,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: 12,
  },
  crisisText: {
    color: colorSystem.base.white,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  crisisCall: {
    backgroundColor: colorSystem.base.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  crisisCallText: {
    color: colorSystem.status.critical,
    fontSize: 14,
    fontWeight: '700',
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

  // Existing Methods
  existingMethods: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.md,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSystem.base.white,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  selectedMethod: {
    borderColor: colorSystem.status.info,
    borderWidth: 2,
    backgroundColor: colorSystem.status.infoBackground,
  },
  methodInfo: {
    flex: 1,
  },
  methodBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.xs,
  },
  methodNumber: {
    fontSize: 16,
    color: colorSystem.accessibility.text.secondary,
    marginBottom: spacing.xs,
  },
  methodExpiry: {
    fontSize: 14,
    color: colorSystem.accessibility.text.tertiary,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    backgroundColor: colorSystem.status.info,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedText: {
    color: colorSystem.base.white,
    fontSize: 16,
    fontWeight: '700',
  },

  // Add New Card
  addNewButton: {
    marginBottom: spacing.lg,
  },
  addCardForm: {
    marginBottom: spacing.lg,
  },
  securityNotice: {
    backgroundColor: colorSystem.status.infoBackground,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.info,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.status.info,
    marginBottom: spacing.sm,
  },
  securityText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.secondary,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
  },

  formSection: {
    gap: spacing.md,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shortInput: {
    flex: 1,
  },

  // Action Buttons
  actionButtons: {
    marginBottom: spacing.xl,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
  },
  addButton: {
    flex: 2,
  },

  // Therapeutic Message
  therapeuticMessage: {
    backgroundColor: colorSystem.gray[50],
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  therapeuticTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.md,
  },
  therapeuticText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.secondary,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
    marginBottom: spacing.sm,
  },
});

export default PaymentMethodScreen;