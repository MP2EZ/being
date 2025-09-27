/**
 * Accessible Payment Form - WCAG AA Compliant Payment Interface
 *
 * ACCESSIBILITY FEATURES:
 * - 4.5:1 contrast ratio for all interactive elements
 * - 7:1 contrast ratio for crisis elements
 * - Screen reader optimized with proper ARIA labels
 * - Keyboard navigation with visible focus indicators
 * - Form validation with therapeutic error messaging
 *
 * CRISIS SAFETY INTEGRATION:
 * - Crisis button accessible within 44px touch target
 * - Emergency features prioritized in tab order
 * - High contrast mode for payment anxiety
 * - Stress-reducing visual design patterns
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { usePaymentAccessibility } from './PaymentAccessibilityProvider';
import { useCrisisPaymentSafety } from '../../store';
import { colorSystem, spacing, typography, borderRadius } from '../../constants/colors';

export interface PaymentFormData {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface AccessiblePaymentFormProps {
  onSubmit: (formData: PaymentFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<PaymentFormData>;
  showProgressIndicator?: boolean;
}

interface FormField {
  key: keyof PaymentFormData | string;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  maxLength?: number;
  required: boolean;
  accessibilityHint: string;
  therapeuticGuidance?: string;
}

interface FormValidationState {
  errors: Record<string, string>;
  isValid: boolean;
  completedFields: string[];
}

export const AccessiblePaymentForm: React.FC<AccessiblePaymentFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  showProgressIndicator = true,
}) => {
  const {
    announceForScreenReader,
    announceFormProgress,
    provideFormGuidance,
    announcePaymentError,
    activateCrisisAccessibility,
    ensureMinimumContrast,
    simplifyPaymentLanguage,
    isScreenReaderEnabled,
    isHighContrastEnabled,
    crisisAccessibilityMode,
  } = usePaymentAccessibility();

  const { crisisMode } = useCrisisPaymentSafety();

  // Form state
  const [formData, setFormData] = useState<PaymentFormData>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
    ...initialData,
  });

  const [validation, setValidation] = useState<FormValidationState>({
    errors: {},
    isValid: false,
    completedFields: [],
  });

  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [showCrisisSupport, setShowCrisisSupport] = useState(false);

  // Refs for field navigation and accessibility
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldRefs = useRef<Record<string, React.RefObject<TextInput>>>({});
  const crisisButtonRef = useRef<TouchableOpacity>(null);

  // Form field definitions
  const formFields: FormField[] = [
    {
      key: 'cardholderName',
      label: 'Full Name on Card',
      placeholder: 'Enter the name exactly as it appears on your card',
      required: true,
      accessibilityHint: 'Enter the full name as printed on your payment card',
      therapeuticGuidance: 'Take your time entering your name. There\'s no rush.',
    },
    {
      key: 'cardNumber',
      label: 'Card Number',
      placeholder: '1234 5678 9012 3456',
      keyboardType: 'numeric',
      maxLength: 19,
      required: true,
      accessibilityHint: 'Enter your 16-digit card number with spaces',
      therapeuticGuidance: 'Your card number is secure with us. Enter it when you feel ready.',
    },
    {
      key: 'expiryDate',
      label: 'Expiry Date',
      placeholder: 'MM/YY',
      keyboardType: 'numeric',
      maxLength: 5,
      required: true,
      accessibilityHint: 'Enter expiration date in MM/YY format',
      therapeuticGuidance: 'Just month and year - MM/YY format.',
    },
    {
      key: 'cvv',
      label: 'Security Code (CVV)',
      placeholder: '123',
      keyboardType: 'numeric',
      maxLength: 4,
      required: true,
      accessibilityHint: 'Enter the 3 or 4 digit security code from your card',
      therapeuticGuidance: 'This is the 3-digit code on the back of your card.',
    },
    {
      key: 'billingAddress.street',
      label: 'Street Address',
      placeholder: 'Enter your billing address',
      required: true,
      accessibilityHint: 'Enter the street address for your billing information',
      therapeuticGuidance: 'Your billing address helps verify your card.',
    },
    {
      key: 'billingAddress.city',
      label: 'City',
      placeholder: 'Enter city',
      required: true,
      accessibilityHint: 'Enter the city for your billing address',
    },
    {
      key: 'billingAddress.state',
      label: 'State',
      placeholder: 'Enter state',
      required: true,
      accessibilityHint: 'Enter the state for your billing address',
    },
    {
      key: 'billingAddress.zipCode',
      label: 'ZIP Code',
      placeholder: '12345',
      keyboardType: 'numeric',
      maxLength: 10,
      required: true,
      accessibilityHint: 'Enter the ZIP code for your billing address',
    },
  ];

  // Initialize field refs
  useEffect(() => {
    formFields.forEach(field => {
      if (!fieldRefs.current[field.key]) {
        fieldRefs.current[field.key] = React.createRef<TextInput>();
      }
    });
  }, []);

  // Announce form loading
  useEffect(() => {
    if (isLoading) {
      announceForScreenReader('Processing payment. Please wait.', 'assertive');
    }
  }, [isLoading, announceForScreenReader]);

  // Form validation
  const validateForm = useCallback((): FormValidationState => {
    const errors: Record<string, string> = {};
    const completedFields: string[] = [];

    // Card number validation
    const cardNumber = formData.cardNumber.replace(/\s/g, '');
    if (!cardNumber) {
      errors.cardNumber = 'Card number is required for payment processing';
    } else if (cardNumber.length < 13 || cardNumber.length > 19) {
      errors.cardNumber = 'Please enter a valid card number (13-19 digits)';
    } else {
      completedFields.push('cardNumber');
    }

    // Expiry date validation
    if (!formData.expiryDate) {
      errors.expiryDate = 'Expiry date is required';
    } else if (!/^\d{2}\/\d{2}$/.test(formData.expiryDate)) {
      errors.expiryDate = 'Please use MM/YY format (example: 12/25)';
    } else {
      const [month, year] = formData.expiryDate.split('/');
      const currentDate = new Date();
      const expiryDate = new Date(parseInt('20' + year), parseInt(month) - 1);

      if (expiryDate < currentDate) {
        errors.expiryDate = 'This card appears to be expired. Please check the date or use a different card.';
      } else {
        completedFields.push('expiryDate');
      }
    }

    // CVV validation
    if (!formData.cvv) {
      errors.cvv = 'Security code is required for verification';
    } else if (formData.cvv.length < 3 || formData.cvv.length > 4) {
      errors.cvv = 'Security code should be 3 or 4 digits';
    } else {
      completedFields.push('cvv');
    }

    // Name validation
    if (!formData.cardholderName.trim()) {
      errors.cardholderName = 'Cardholder name is required';
    } else if (formData.cardholderName.trim().length < 2) {
      errors.cardholderName = 'Please enter the full name from your card';
    } else {
      completedFields.push('cardholderName');
    }

    // Billing address validation
    Object.entries(formData.billingAddress).forEach(([key, value]) => {
      const fieldKey = `billingAddress.${key}`;
      if (!value.trim()) {
        errors[fieldKey] = `${key.charAt(0).toUpperCase() + key.slice(1)} is required for billing`;
      } else {
        completedFields.push(fieldKey);
      }
    });

    const isValid = Object.keys(errors).length === 0;

    return { errors, isValid, completedFields };
  }, [formData]);

  // Update form data with accessibility support
  const updateFormField = useCallback((fieldKey: string, value: string) => {
    // Handle nested object updates (billingAddress)
    if (fieldKey.includes('.')) {
      const [parent, child] = fieldKey.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof PaymentFormData],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [fieldKey]: value,
      }));
    }

    // Clear field error if corrected
    if (validation.errors[fieldKey]) {
      setValidation(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [fieldKey]: '',
        },
      }));
    }
  }, [validation.errors]);

  // Format card number with spaces
  const formatCardNumber = useCallback((input: string): string => {
    const cleaned = input.replace(/\s/g, '');
    const match = cleaned.match(/\d{1,4}/g);
    return match ? match.join(' ') : '';
  }, []);

  // Format expiry date
  const formatExpiryDate = useCallback((input: string): string => {
    const cleaned = input.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  }, []);

  // Handle field focus with accessibility
  const handleFieldFocus = useCallback(async (fieldKey: string, index: number) => {
    setCurrentFieldIndex(index);

    const field = formFields.find(f => f.key === fieldKey);
    if (field) {
      await provideFormGuidance(field.label, validation.errors[fieldKey]);

      if (field.therapeuticGuidance && isScreenReaderEnabled) {
        setTimeout(() => {
          announceForScreenReader(field.therapeuticGuidance!, 'polite');
        }, 1500);
      }
    }

    if (showProgressIndicator) {
      await announceFormProgress(index + 1, formFields.length);
    }
  }, [provideFormGuidance, validation.errors, announceFormProgress, formFields, isScreenReaderEnabled, announceForScreenReader, showProgressIndicator]);

  // Handle field change with formatting
  const handleFieldChange = useCallback((fieldKey: string, value: string) => {
    let formattedValue = value;

    // Apply formatting
    if (fieldKey === 'cardNumber') {
      formattedValue = formatCardNumber(value);
    } else if (fieldKey === 'expiryDate') {
      formattedValue = formatExpiryDate(value);
    } else if (fieldKey === 'cvv') {
      formattedValue = value.replace(/\D/g, '');
    }

    updateFormField(fieldKey, formattedValue);
  }, [updateFormField, formatCardNumber, formatExpiryDate]);

  // Navigate to next field
  const navigateToNextField = useCallback((currentIndex: number) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < formFields.length) {
      const nextField = formFields[nextIndex];
      fieldRefs.current[nextField.key]?.current?.focus();
    }
  }, [formFields]);

  // Handle form submission with validation
  const handleSubmit = useCallback(async () => {
    const validationResult = validateForm();
    setValidation(validationResult);

    if (!validationResult.isValid) {
      const firstError = Object.keys(validationResult.errors)[0];
      const errorMessage = validationResult.errors[firstError];

      await announcePaymentError(errorMessage, true);

      // Focus first error field
      if (fieldRefs.current[firstError]?.current) {
        fieldRefs.current[firstError].current!.focus();
      }

      return;
    }

    try {
      await onSubmit(formData);
      await announceForScreenReader('Payment processed successfully! Thank you for your investment in your wellbeing.', 'polite');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      await announcePaymentError(errorMessage, false);

      // Show crisis support option for payment failures
      setShowCrisisSupport(true);
    }
  }, [formData, onSubmit, validateForm, announcePaymentError, announceForScreenReader]);

  // Crisis support activation
  const handleCrisisSupport = useCallback(async () => {
    await activateCrisisAccessibility('payment_form_crisis');
    setShowCrisisSupport(false);
  }, [activateCrisisAccessibility]);

  // Emergency hotline
  const handleEmergencyCall = useCallback(async () => {
    await Linking.openURL('tel:988');
  }, []);

  // Render individual form field
  const renderFormField = useCallback((field: FormField, index: number) => {
    const fieldValue = field.key.includes('.')
      ? field.key.split('.').reduce((obj, key) => obj[key], formData as any)
      : formData[field.key as keyof PaymentFormData];

    const hasError = !!validation.errors[field.key];
    const isCompleted = validation.completedFields.includes(field.key);

    // Dynamic colors based on accessibility needs
    const getFieldColors = () => {
      if (hasError) {
        return {
          borderColor: ensureMinimumContrast(colorSystem.status.error, colorSystem.base.white, 4.5),
          textColor: colorSystem.accessibility.text.primary,
          backgroundColor: colorSystem.status.errorBackground,
        };
      }

      if (isCompleted) {
        return {
          borderColor: ensureMinimumContrast(colorSystem.status.success, colorSystem.base.white, 4.5),
          textColor: colorSystem.accessibility.text.primary,
          backgroundColor: colorSystem.status.successBackground,
        };
      }

      return {
        borderColor: colorSystem.gray[300],
        textColor: colorSystem.accessibility.text.primary,
        backgroundColor: colorSystem.base.white,
      };
    };

    const fieldColors = getFieldColors();

    return (
      <View key={field.key} style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: fieldColors.textColor }]}>
          {field.label}
          {field.required && <Text style={styles.requiredIndicator}> *</Text>}
        </Text>

        <TextInput
          ref={fieldRefs.current[field.key]}
          style={[
            styles.textInput,
            {
              borderColor: fieldColors.borderColor,
              backgroundColor: fieldColors.backgroundColor,
              color: fieldColors.textColor,
            },
            isHighContrastEnabled && styles.highContrastInput,
          ]}
          value={fieldValue as string}
          onChangeText={(value) => handleFieldChange(field.key, value)}
          onFocus={() => handleFieldFocus(field.key, index)}
          onSubmitEditing={() => navigateToNextField(index)}
          placeholder={field.placeholder}
          placeholderTextColor={colorSystem.accessibility.text.tertiary}
          keyboardType={field.keyboardType || 'default'}
          maxLength={field.maxLength}
          autoCapitalize={field.keyboardType === 'numeric' ? 'none' : 'words'}
          autoComplete={getAutoCompleteType(field.key)}
          secureTextEntry={field.key === 'cvv'}
          accessible={true}
          accessibilityLabel={field.label}
          accessibilityHint={field.accessibilityHint}
          accessibilityState={{
            selected: currentFieldIndex === index,
            invalid: hasError,
          }}
          accessibilityValue={{
            text: hasError ? `Error: ${validation.errors[field.key]}` : undefined,
          }}
          returnKeyType={index < formFields.length - 1 ? 'next' : 'done'}
          blurOnSubmit={false}
        />

        {hasError && (
          <Text
            style={[styles.errorText, { color: fieldColors.borderColor }]}
            accessible={true}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {simplifyPaymentLanguage(validation.errors[field.key])}
          </Text>
        )}

        {isCompleted && (
          <Text
            style={[styles.successText, { color: fieldColors.borderColor }]}
            accessible={true}
            accessibilityLiveRegion="polite"
          >
            ✓ Completed
          </Text>
        )}
      </View>
    );
  }, [
    formData,
    validation,
    currentFieldIndex,
    handleFieldChange,
    handleFieldFocus,
    navigateToNextField,
    ensureMinimumContrast,
    simplifyPaymentLanguage,
    isHighContrastEnabled,
    formFields.length,
  ]);

  // Auto-complete type mapping
  const getAutoCompleteType = (fieldKey: string): string => {
    const mapping: Record<string, string> = {
      cardNumber: 'cc-number',
      expiryDate: 'cc-exp',
      cvv: 'cc-csc',
      cardholderName: 'cc-name',
      'billingAddress.street': 'street-address',
      'billingAddress.city': 'address-level2',
      'billingAddress.state': 'address-level1',
      'billingAddress.zipCode': 'postal-code',
    };

    return mapping[fieldKey] || 'off';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        accessible={true}
        accessibilityLabel="Payment form"
        accessibilityHint="Scroll to navigate through payment fields"
      >
        {/* Crisis Support Banner - Always Visible */}
        <View style={styles.crisisBanner}>
          <TouchableOpacity
            ref={crisisButtonRef}
            style={styles.crisisButton}
            onPress={handleEmergencyCall}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Call 988 crisis hotline"
            accessibilityHint="Emergency mental health support available 24/7"
          >
            <Text style={styles.crisisButtonText}>🆘 988</Text>
          </TouchableOpacity>

          <Text style={styles.crisisBannerText}>
            Crisis support is always free and available
          </Text>

          {!crisisMode && (
            <TouchableOpacity
              style={styles.activateCrisisButton}
              onPress={handleCrisisSupport}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Activate crisis mode"
              accessibilityHint="Remove payment barriers during crisis"
            >
              <Text style={styles.activateCrisisText}>Crisis Mode</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Form Progress Indicator */}
        {showProgressIndicator && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Payment Form Progress: {validation.completedFields.length} of {formFields.length} fields completed
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(validation.completedFields.length / formFields.length) * 100}%` }
                ]}
              />
            </View>
          </View>
        )}

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {formFields.map((field, index) => renderFormField(field, index))}
        </View>

        {/* Crisis Support Options */}
        {showCrisisSupport && (
          <View style={styles.crisisSupportContainer}>
            <Text style={styles.crisisSupportTitle}>Payment Stress Support</Text>
            <Text style={styles.crisisSupportMessage}>
              Payment difficulties can cause anxiety. Your mental health is more important than any payment.
            </Text>

            <View style={styles.crisisSupportActions}>
              <TouchableOpacity
                style={styles.crisisSupportButton}
                onPress={handleEmergencyCall}
              >
                <Text style={styles.crisisSupportButtonText}>Call 988</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.crisisSupportButton}
                onPress={handleCrisisSupport}
              >
                <Text style={styles.crisisSupportButtonText}>Crisis Mode</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Form Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonLoading]}
            onPress={handleSubmit}
            disabled={isLoading}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={isLoading ? "Processing payment" : "Submit payment"}
            accessibilityState={{ disabled: isLoading }}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Processing Payment...' : 'Complete Payment'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isLoading}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Cancel payment"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },

  // Crisis Support
  crisisBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSystem.status.critical,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginVertical: spacing.md,
  },

  crisisButton: {
    backgroundColor: colorSystem.base.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.small,
    marginRight: spacing.sm,
    minWidth: 60,
    minHeight: 44, // WCAG minimum touch target
    alignItems: 'center',
    justifyContent: 'center',
  },

  crisisButtonText: {
    color: colorSystem.status.critical,
    fontSize: 16,
    fontWeight: '800',
  },

  crisisBannerText: {
    flex: 1,
    color: colorSystem.base.white,
    fontSize: 14,
    fontWeight: '600',
    marginRight: spacing.sm,
  },

  activateCrisisButton: {
    backgroundColor: colorSystem.status.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.small,
    minHeight: 44, // WCAG minimum touch target
    justifyContent: 'center',
  },

  activateCrisisText: {
    color: colorSystem.base.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // Progress Indicator
  progressContainer: {
    marginBottom: spacing.lg,
  },

  progressText: {
    fontSize: typography.caption.size,
    color: colorSystem.accessibility.text.secondary,
    marginBottom: spacing.sm,
  },

  progressBar: {
    height: 4,
    backgroundColor: colorSystem.gray[200],
    borderRadius: borderRadius.small,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: colorSystem.status.info,
  },

  // Form Container
  formContainer: {
    marginBottom: spacing.xl,
  },

  fieldContainer: {
    marginBottom: spacing.lg,
  },

  fieldLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colorSystem.accessibility.text.primary,
  },

  requiredIndicator: {
    color: colorSystem.status.error,
  },

  textInput: {
    borderWidth: 2,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.bodyRegular.size,
    minHeight: 48, // WCAG minimum touch target
    backgroundColor: colorSystem.base.white,
  },

  highContrastInput: {
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  errorText: {
    fontSize: typography.caption.size,
    marginTop: spacing.xs,
    color: colorSystem.status.error,
  },

  successText: {
    fontSize: typography.caption.size,
    marginTop: spacing.xs,
    color: colorSystem.status.success,
    fontWeight: '500',
  },

  // Crisis Support Container
  crisisSupportContainer: {
    backgroundColor: colorSystem.status.errorBackground,
    padding: spacing.lg,
    borderRadius: borderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.critical,
    marginBottom: spacing.lg,
  },

  crisisSupportTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.status.critical,
    marginBottom: spacing.sm,
  },

  crisisSupportMessage: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
    marginBottom: spacing.md,
  },

  crisisSupportActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  crisisSupportButton: {
    backgroundColor: colorSystem.status.critical,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.small,
    minHeight: 44, // WCAG minimum touch target
    justifyContent: 'center',
  },

  crisisSupportButtonText: {
    color: colorSystem.base.white,
    fontSize: 14,
    fontWeight: '700',
  },

  // Form Actions
  actionsContainer: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },

  submitButton: {
    backgroundColor: colorSystem.status.info,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    minHeight: 48, // WCAG minimum touch target
  },

  submitButtonLoading: {
    backgroundColor: colorSystem.gray[400],
  },

  submitButtonText: {
    color: colorSystem.base.white,
    fontSize: typography.bodyRegular.size,
    fontWeight: '700',
  },

  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colorSystem.gray[400],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    minHeight: 48, // WCAG minimum touch target
  },

  cancelButtonText: {
    color: colorSystem.accessibility.text.secondary,
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
  },
});

export default AccessiblePaymentForm;