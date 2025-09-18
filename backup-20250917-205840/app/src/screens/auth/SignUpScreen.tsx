/**
 * Sign Up Screen - MBCT-Compliant Account Creation
 * Focuses on therapeutic value while maintaining crisis accessibility
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';

import { Button, Card, TextInput, CrisisButton } from '../../components/core';
import { colorSystem, spacing } from '../../constants/colors';
import { useUserStore } from '../../store';
import { AuthenticationResult, AuthErrorCode, ConsentLevel } from '../../types';
import { authIntegrationService, signUp, signInWithApple, signInWithGoogle } from '../../services/cloud/AuthIntegrationService';

interface SignUpFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface SignUpError {
  field?: keyof SignUpFormData | 'terms' | 'privacy';
  message: string;
  code: AuthErrorCode;
}

interface ConsentState {
  termsOfService: boolean;
  privacyPolicy: boolean;
  therapeuticData: boolean;
  emailCommunication: boolean;
  researchParticipation: boolean;
}

const SignUpScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useUserStore();

  // Form state
  const [formData, setFormData] = useState<SignUpFormData>({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [consent, setConsent] = useState<ConsentState>({
    termsOfService: false,
    privacyPolicy: false,
    therapeuticData: true, // Default to true for therapeutic benefit
    emailCommunication: false,
    researchParticipation: false
  });
  const [errors, setErrors] = useState<SignUpError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState<'account' | 'consent' | 'biometric'>('account');

  // Biometric state
  const [biometricSupported, setBiometricSupported] = useState<boolean | null>(null);

  React.useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricSupported(hasHardware && isEnrolled);
    } catch (error) {
      console.warn('Failed to check biometric support:', error);
      setBiometricSupported(false);
    }
  };

  const validateAccountForm = useCallback((): boolean => {
    const newErrors: SignUpError[] = [];

    // Email validation
    if (!formData.email.trim()) {
      newErrors.push({
        field: 'email',
        message: 'Email is required for your secure account',
        code: 'VALIDATION_REQUIRED'
      });
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.push({
        field: 'email',
        message: 'Please enter a valid email address',
        code: 'VALIDATION_FORMAT'
      });
    }

    // Password validation
    if (!formData.password) {
      newErrors.push({
        field: 'password',
        message: 'Password is required to protect your therapeutic data',
        code: 'VALIDATION_REQUIRED'
      });
    } else if (formData.password.length < 8) {
      newErrors.push({
        field: 'password',
        message: 'Password must be at least 8 characters for security',
        code: 'VALIDATION_LENGTH'
      });
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.push({
        field: 'password',
        message: 'Password must include uppercase, lowercase, and numbers',
        code: 'VALIDATION_STRENGTH'
      });
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.push({
        field: 'confirmPassword',
        message: 'Please confirm your password',
        code: 'VALIDATION_REQUIRED'
      });
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.push({
        field: 'confirmPassword',
        message: 'Passwords do not match',
        code: 'VALIDATION_MATCH'
      });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [formData]);

  const validateConsentForm = useCallback((): boolean => {
    const newErrors: SignUpError[] = [];

    if (!consent.termsOfService) {
      newErrors.push({
        field: 'terms',
        message: 'Please accept the Terms of Service to continue',
        code: 'CONSENT_REQUIRED'
      });
    }

    if (!consent.privacyPolicy) {
      newErrors.push({
        field: 'privacy',
        message: 'Please accept the Privacy Policy to continue',
        code: 'CONSENT_REQUIRED'
      });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [consent]);

  const handleAccountNext = useCallback(() => {
    if (validateAccountForm()) {
      setCurrentStep('consent');
    }
  }, [validateAccountForm]);

  const handleConsentNext = useCallback(() => {
    if (validateConsentForm()) {
      if (biometricSupported) {
        setCurrentStep('biometric');
      } else {
        handleCreateAccount();
      }
    }
  }, [validateConsentForm, biometricSupported]);

  const handleCreateAccount = useCallback(async () => {
    setIsLoading(true);
    try {
      // Prepare metadata with consent information
      const metadata = {
        termsOfService: consent.termsOfService,
        privacyPolicy: consent.privacyPolicy,
        therapeuticData: consent.therapeuticData,
        emailCommunication: consent.emailCommunication,
        researchParticipation: consent.researchParticipation,
        appVersion: '1.0.0',
        deviceType: Platform.OS,
        registrationSource: 'mobile_app'
      };

      // Integrate with authentication service
      const result = await signUp(formData.email, formData.password, metadata);

      if (result.success) {
        // Show success and introduction
        Alert.alert(
          'Welcome to FullMind',
          'Your secure account has been created! You now have access to cloud sync and cross-device therapeutic continuity.',
          [
            {
              text: 'Start Your Journey',
              onPress: () => {
                // Navigate to MBCT introduction flow
                (navigation as any).navigate('OnboardingIntroduction');
              }
            }
          ]
        );
      } else {
        const authError: SignUpError = {
          message: result.error || 'Unable to create account. Please try again.',
          code: result.error?.includes('exists') ? 'EMAIL_ALREADY_EXISTS' : 'REGISTRATION_FAILED'
        };
        setErrors([authError]);
      }

    } catch (error) {
      const authError: SignUpError = {
        message: 'Unable to create account. Please try again.',
        code: 'REGISTRATION_FAILED'
      };
      setErrors([authError]);
    } finally {
      setIsLoading(false);
    }
  }, [formData, consent, navigation]);

  const handleBiometricSetup = useCallback(async () => {
    if (!biometricSupported) {
      // Skip biometric setup
      handleCreateAccount();
      return;
    }

    setIsLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Set up biometric authentication for secure, quick access to your therapeutic data',
        fallbackLabel: 'Skip for now',
        disableDeviceFallback: false,
      });

      if (result.success) {
        Alert.alert(
          'Biometric Authentication Enabled',
          'You can now quickly and securely access your account with biometric authentication.',
          [
            {
              text: 'Complete Setup',
              onPress: handleCreateAccount
            }
          ]
        );
      } else {
        // User chose to skip
        handleCreateAccount();
      }
    } catch (error) {
      Alert.alert(
        'Biometric Setup',
        'Biometric setup can be enabled later in settings. Your account will be created without it.',
        [
          {
            text: 'Continue',
            onPress: handleCreateAccount
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  }, [biometricSupported, handleCreateAccount]);

  const handleSocialSignUp = useCallback(async (provider: 'apple' | 'google') => {
    setIsLoading(true);
    try {
      let result: AuthenticationResult;

      if (provider === 'apple') {
        result = await signInWithApple();
      } else {
        result = await signInWithGoogle();
      }

      if (result.success) {
        Alert.alert(
          'Welcome to FullMind',
          `Your account has been created with ${provider === 'apple' ? 'Apple' : 'Google'}! You now have access to cloud sync and cross-device therapeutic continuity.`,
          [
            {
              text: 'Start Your Journey',
              onPress: () => {
                // Navigate to MBCT introduction flow
                (navigation as any).navigate('OnboardingIntroduction');
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Sign Up Error',
          result.error || `There was an issue creating your account with ${provider === 'apple' ? 'Apple' : 'Google'}. Please try email registration.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Sign Up Error',
        'There was an issue with social sign up. Please try email registration.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  const handleSignInInstead = useCallback(() => {
    (navigation as any).navigate('SignIn');
  }, [navigation]);

  const handleContinueOffline = useCallback(() => {
    Alert.alert(
      'Continue Without Account?',
      'You can use FullMind\'s full therapeutic features offline. You can always create an account later to enable cloud sync.',
      [
        {
          text: 'Create Account',
          style: 'default'
        },
        {
          text: 'Continue Offline',
          style: 'destructive',
          onPress: () => navigation.goBack()
        }
      ]
    );
  }, [navigation]);

  const handleViewDocument = useCallback((document: 'terms' | 'privacy') => {
    // TODO: Navigate to document viewer or open web link
    Alert.alert(
      document === 'terms' ? 'Terms of Service' : 'Privacy Policy',
      `${document === 'terms' ? 'Terms of Service' : 'Privacy Policy'} viewer coming soon.`,
      [{ text: 'OK' }]
    );
  }, []);

  const getErrorForField = (field: keyof SignUpFormData | 'terms' | 'privacy'): string | undefined => {
    return errors.find(error => error.field === field)?.message;
  };

  const getGeneralError = (): string | undefined => {
    return errors.find(error => !error.field)?.message;
  };

  const renderAccountStep = () => (
    <>
      <Card style={styles.formCard}>
        <Text style={styles.formTitle}>Create Your Secure Account</Text>
        <Text style={styles.formSubtitle}>
          Start your mindful journey with secure cloud sync across all your devices
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            value={formData.email}
            onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
            placeholder="Enter your email address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={getErrorForField('email')}
            disabled={isLoading}
            accessibilityLabel="Email address"
            accessibilityHint="Enter your email for account creation"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            value={formData.password}
            onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
            placeholder="Create a strong password"
            secureTextEntry={!showPassword}
            error={getErrorForField('password')}
            disabled={isLoading}
            accessibilityLabel="Password"
            accessibilityHint="Create a secure password with uppercase, lowercase, and numbers"
            rightElement={
              <Button
                variant="ghost"
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </Button>
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Confirm Password</Text>
          <TextInput
            value={formData.confirmPassword}
            onChangeText={(text) => setFormData(prev => ({ ...prev, confirmPassword: text }))}
            placeholder="Confirm your password"
            secureTextEntry={!showConfirmPassword}
            error={getErrorForField('confirmPassword')}
            disabled={isLoading}
            accessibilityLabel="Confirm password"
            accessibilityHint="Re-enter your password to confirm"
            rightElement={
              <Button
                variant="ghost"
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
                accessibilityLabel={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </Button>
            }
          />
        </View>

        <Button
          variant="primary"
          onPress={handleAccountNext}
          loading={isLoading}
          disabled={isLoading}
          style={styles.nextButton}
          accessibilityLabel="Continue to privacy settings"
        >
          Continue to Privacy Settings
        </Button>
      </Card>

      {/* Social Registration Options */}
      <Card style={styles.socialCard}>
        <Text style={styles.socialTitle}>Quick Registration Options</Text>

        {Platform.OS === 'ios' && (
          <Button
            variant="outline"
            onPress={() => handleSocialSignUp('apple')}
            loading={isLoading}
            disabled={isLoading}
            style={styles.socialButton}
            accessibilityLabel="Create account with Apple ID"
          >
            🍎 Continue with Apple
          </Button>
        )}

        <Button
          variant="outline"
          onPress={() => handleSocialSignUp('google')}
          loading={isLoading}
          disabled={isLoading}
          style={styles.socialButton}
          accessibilityLabel="Create account with Google"
        >
          🔵 Continue with Google
        </Button>
      </Card>
    </>
  );

  const renderConsentStep = () => (
    <Card style={styles.formCard}>
      <Text style={styles.formTitle}>Privacy & Data Consent</Text>
      <Text style={styles.formSubtitle}>
        Your privacy and therapeutic safety are our highest priorities
      </Text>

      {/* Required Consents */}
      <View style={styles.consentSection}>
        <Text style={styles.consentSectionTitle}>Required Agreements</Text>

        <View style={styles.consentItem}>
          <Button
            variant="ghost"
            onPress={() => setConsent(prev => ({ ...prev, termsOfService: !prev.termsOfService }))}
            style={styles.checkboxButton}
            accessibilityLabel={`${consent.termsOfService ? 'Uncheck' : 'Check'} Terms of Service agreement`}
          >
            {consent.termsOfService ? '✅' : '☐'}
          </Button>
          <View style={styles.consentText}>
            <Text style={styles.consentLabel}>
              I agree to the{' '}
              <Text
                style={styles.linkText}
                onPress={() => handleViewDocument('terms')}
                accessibilityRole="link"
                accessibilityLabel="View Terms of Service"
              >
                Terms of Service
              </Text>
            </Text>
            {getErrorForField('terms') && (
              <Text style={styles.consentError}>{getErrorForField('terms')}</Text>
            )}
          </View>
        </View>

        <View style={styles.consentItem}>
          <Button
            variant="ghost"
            onPress={() => setConsent(prev => ({ ...prev, privacyPolicy: !prev.privacyPolicy }))}
            style={styles.checkboxButton}
            accessibilityLabel={`${consent.privacyPolicy ? 'Uncheck' : 'Check'} Privacy Policy agreement`}
          >
            {consent.privacyPolicy ? '✅' : '☐'}
          </Button>
          <View style={styles.consentText}>
            <Text style={styles.consentLabel}>
              I agree to the{' '}
              <Text
                style={styles.linkText}
                onPress={() => handleViewDocument('privacy')}
                accessibilityRole="link"
                accessibilityLabel="View Privacy Policy"
              >
                Privacy Policy
              </Text>
            </Text>
            {getErrorForField('privacy') && (
              <Text style={styles.consentError}>{getErrorForField('privacy')}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Optional Consents */}
      <View style={styles.consentSection}>
        <Text style={styles.consentSectionTitle}>Optional Preferences</Text>

        <View style={styles.consentItem}>
          <Button
            variant="ghost"
            onPress={() => setConsent(prev => ({ ...prev, therapeuticData: !prev.therapeuticData }))}
            style={styles.checkboxButton}
            accessibilityLabel={`${consent.therapeuticData ? 'Disable' : 'Enable'} therapeutic data processing`}
          >
            {consent.therapeuticData ? '✅' : '☐'}
          </Button>
          <View style={styles.consentText}>
            <Text style={styles.consentLabel}>
              Enable enhanced therapeutic features and progress tracking
            </Text>
            <Text style={styles.consentDescription}>
              Recommended: Helps personalize your mindfulness journey
            </Text>
          </View>
        </View>

        <View style={styles.consentItem}>
          <Button
            variant="ghost"
            onPress={() => setConsent(prev => ({ ...prev, emailCommunication: !prev.emailCommunication }))}
            style={styles.checkboxButton}
            accessibilityLabel={`${consent.emailCommunication ? 'Disable' : 'Enable'} email communication`}
          >
            {consent.emailCommunication ? '✅' : '☐'}
          </Button>
          <View style={styles.consentText}>
            <Text style={styles.consentLabel}>
              Receive helpful mindfulness tips and app updates via email
            </Text>
          </View>
        </View>

        <View style={styles.consentItem}>
          <Button
            variant="ghost"
            onPress={() => setConsent(prev => ({ ...prev, researchParticipation: !prev.researchParticipation }))}
            style={styles.checkboxButton}
            accessibilityLabel={`${consent.researchParticipation ? 'Disable' : 'Enable'} research participation`}
          >
            {consent.researchParticipation ? '✅' : '☐'}
          </Button>
          <View style={styles.consentText}>
            <Text style={styles.consentLabel}>
              Contribute to mental health research (anonymized data only)
            </Text>
            <Text style={styles.consentDescription}>
              Help improve mental health support for everyone
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.stepButtons}>
        <Button
          variant="outline"
          onPress={() => setCurrentStep('account')}
          disabled={isLoading}
          style={styles.backButton}
          accessibilityLabel="Go back to account information"
        >
          Back
        </Button>
        <Button
          variant="primary"
          onPress={handleConsentNext}
          loading={isLoading}
          disabled={isLoading}
          style={styles.nextButton}
          accessibilityLabel="Continue to biometric setup"
        >
          {biometricSupported ? 'Continue to Security' : 'Create Account'}
        </Button>
      </View>
    </Card>
  );

  const renderBiometricStep = () => (
    <Card style={styles.formCard}>
      <Text style={styles.formTitle}>Enhanced Security Setup</Text>
      <Text style={styles.formSubtitle}>
        Add biometric authentication for quick, secure access to your therapeutic data
      </Text>

      <View style={styles.biometricInfo}>
        <Text style={styles.biometricBenefit}>
          ✅ Instant access to your mindfulness journey{'\n'}
          ✅ Military-grade security for your personal data{'\n'}
          ✅ No passwords to remember or forget{'\n'}
          ✅ Works even when you're feeling overwhelmed
        </Text>
      </View>

      <View style={styles.stepButtons}>
        <Button
          variant="outline"
          onPress={() => setCurrentStep('consent')}
          disabled={isLoading}
          style={styles.backButton}
          accessibilityLabel="Go back to privacy settings"
        >
          Back
        </Button>
        <Button
          variant="primary"
          onPress={handleBiometricSetup}
          loading={isLoading}
          disabled={isLoading}
          style={styles.nextButton}
          accessibilityLabel={`Set up ${Platform.OS === 'ios' ? 'Face ID or Touch ID' : 'biometric'} authentication`}
        >
          {Platform.OS === 'ios'
            ? 'Enable Face ID / Touch ID'
            : 'Enable Biometric Auth'
          }
        </Button>
        <Button
          variant="ghost"
          onPress={handleCreateAccount}
          disabled={isLoading}
          style={styles.skipButton}
          accessibilityLabel="Skip biometric setup and create account"
        >
          Skip for Now
        </Button>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Crisis Button - Always Accessible */}
      <CrisisButton variant="header" style={styles.crisisButton} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Join FullMind</Text>
          <Text style={styles.subtitle}>
            Create your secure account for mindful mental health support
          </Text>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: currentStep === 'account' ? '33%' : currentStep === 'consent' ? '67%' : '100%' }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            Step {currentStep === 'account' ? '1' : currentStep === 'consent' ? '2' : '3'} of 3
          </Text>
        </View>

        {/* General Error Display */}
        {getGeneralError() && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{getGeneralError()}</Text>
          </Card>
        )}

        {/* Step Content */}
        {currentStep === 'account' && renderAccountStep()}
        {currentStep === 'consent' && renderConsentStep()}
        {currentStep === 'biometric' && renderBiometricStep()}

        {/* Alternative Options */}
        <View style={styles.alternativeOptions}>
          <Text style={styles.alternativePrompt}>
            Already have an account?
          </Text>
          <Button
            variant="outline"
            onPress={handleSignInInstead}
            disabled={isLoading}
            style={styles.signInButton}
            accessibilityLabel="Sign in to existing account"
          >
            Sign In Instead
          </Button>

          <Button
            variant="ghost"
            onPress={handleContinueOffline}
            disabled={isLoading}
            style={styles.offlineButton}
            accessibilityLabel="Continue using app without creating account"
          >
            Continue Offline for Now
          </Button>
        </View>

        {/* Crisis Assurance */}
        <Card style={styles.assuranceCard}>
          <Text style={styles.assuranceTitle}>Always Available Support</Text>
          <Text style={styles.assuranceText}>
            Crisis support (988) and core mindfulness features are always accessible, regardless of your account status
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  crisisButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 1000,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  header: {
    paddingVertical: spacing.lg,
    paddingTop: 100, // Account for crisis button space
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },
  progressContainer: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: colorSystem.gray[200],
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colorSystem.primary[500],
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: colorSystem.gray[500],
  },
  errorCard: {
    backgroundColor: colorSystem.status.error + '20',
    borderColor: colorSystem.status.error,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colorSystem.status.error,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  formSubtitle: {
    fontSize: 14,
    color: colorSystem.gray[600],
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colorSystem.gray[700],
    marginBottom: spacing.xs,
  },
  nextButton: {
    marginTop: spacing.sm,
    flex: 1,
  },
  socialCard: {
    marginBottom: spacing.lg,
  },
  socialTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  socialButton: {
    marginBottom: spacing.sm,
  },
  consentSection: {
    marginBottom: spacing.lg,
  },
  consentSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
  },
  consentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  checkboxButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  consentText: {
    flex: 1,
  },
  consentLabel: {
    fontSize: 14,
    color: colorSystem.base.black,
    lineHeight: 20,
  },
  consentDescription: {
    fontSize: 12,
    color: colorSystem.gray[600],
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  consentError: {
    fontSize: 12,
    color: colorSystem.status.error,
    marginTop: spacing.xs,
  },
  linkText: {
    color: colorSystem.primary[600],
    textDecorationLine: 'underline',
  },
  stepButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  backButton: {
    flex: 1,
  },
  skipButton: {
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  biometricInfo: {
    backgroundColor: colorSystem.gray[50],
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  biometricBenefit: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 22,
  },
  alternativeOptions: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  alternativePrompt: {
    fontSize: 14,
    color: colorSystem.gray[600],
    marginBottom: spacing.sm,
  },
  signInButton: {
    marginBottom: spacing.sm,
    minWidth: 200,
  },
  offlineButton: {
    minWidth: 200,
  },
  assuranceCard: {
    backgroundColor: colorSystem.status.success + '20',
    marginBottom: spacing.xl,
  },
  assuranceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.status.success,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  assuranceText: {
    fontSize: 13,
    color: colorSystem.gray[700],
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default SignUpScreen;