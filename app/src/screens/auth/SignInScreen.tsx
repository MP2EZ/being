/**
 * Sign In Screen - MBCT-Compliant Authentication
 * Maintains therapeutic continuity with crisis support always accessible
 * Enhanced with comprehensive type safety and performance monitoring
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import * as LocalAuthentication from 'expo-local-authentication';

import { Button, Card, TextInput, CrisisButton } from '../../components/core';
import { colorSystem, spacing } from '../../constants/colors';
import { useUserStore } from '../../store';
import {
  AuthenticationResult,
  AuthErrorCode,
  AuthenticationMethod
} from '../../types/authentication';
import {
  SignInScreenProps,
  SignInFormData,
  AuthScreenError,
  AuthScreenState,
  BiometricScreenState,
  SocialAuthScreenState,
  CrisisPerformanceMonitor,
  AUTH_SCREEN_CONSTANTS,
  isSignInFormData,
  isAuthScreenError,
  isCrisisAuthRequired,
  isPerformanceViolation
} from '../../types/auth-screens';
import {
  authIntegrationService,
  signIn,
  signInWithApple,
  signInWithGoogle,
  AuthSessionState
} from '../../services/cloud/AuthIntegrationService';

const SignInScreen: React.FC<SignInScreenProps> = ({ navigation, route }) => {
  const { user } = useUserStore();
  const performanceStartTime = useRef<number>(Date.now());
  const authStartTime = useRef<number | null>(null);

  // Enhanced form state with type safety
  const [formData, setFormData] = useState<SignInFormData>({
    email: '',
    password: ''
  });

  // Enhanced error handling with comprehensive types
  const [errors, setErrors] = useState<AuthScreenError[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  // Enhanced screen state management
  const [screenState, setScreenState] = useState<AuthScreenState>({
    isLoading: false,
    errors: [],
    warnings: [],
    currentStep: 'form_input',
    canNavigateBack: true,
    performanceMetrics: {
      screenLoadTime: 0,
      formValidationTime: 0,
      authenticationTime: 0,
      biometricSetupTime: 0,
      totalTime: 0,
      crisisResponseReady: false,
      networkLatency: 0,
      errorCount: 0
    }
  });

  // Enhanced biometric state
  const [biometricState, setBiometricState] = useState<BiometricScreenState>({
    supported: false,
    available: false,
    enrolled: false,
    enabled: false,
    setupInProgress: false,
    capabilities: {
      faceId: false,
      touchId: false,
      fingerprint: false,
      voice: false,
      iris: false,
      hardwareBacked: false,
      multipleEnrollments: false
    }
  });

  // Social authentication state
  const [socialAuthState, setSocialAuthState] = useState<SocialAuthScreenState>({
    apple: {
      available: Platform.OS === 'ios',
      configured: true,
      loading: false
    },
    google: {
      available: true,
      configured: true,
      loading: false
    }
  });

  // Crisis performance monitoring
  const [crisisMonitor, setCrisisMonitor] = useState<CrisisPerformanceMonitor>({
    enabled: route.params?.emergencyMode || false,
    threshold: AUTH_SCREEN_CONSTANTS.PERFORMANCE.CRISIS_RESPONSE_TIMEOUT,
    currentResponseTime: 0,
    averageResponseTime: 0,
    violationCount: 0,
    alerts: []
  });

  // Initialize screen with performance monitoring
  useEffect(() => {
    initializeScreen();
  }, []);

  // Monitor route params for emergency mode changes
  useEffect(() => {
    if (route.params?.emergencyMode) {
      setCrisisMonitor(prev => ({
        ...prev,
        enabled: true,
        threshold: AUTH_SCREEN_CONSTANTS.PERFORMANCE.CRISIS_RESPONSE_TIMEOUT
      }));

      setScreenState(prev => ({
        ...prev,
        performanceMetrics: {
          ...prev.performanceMetrics,
          crisisResponseReady: true
        }
      }));
    }
  }, [route.params?.emergencyMode]);

  const initializeScreen = async (): Promise<void> => {
    const startTime = Date.now();

    try {
      // Check biometric capabilities
      await checkBiometricSupport();

      // Update screen load time
      const loadTime = Date.now() - startTime;
      setScreenState(prev => ({
        ...prev,
        performanceMetrics: {
          ...prev.performanceMetrics,
          screenLoadTime: loadTime
        }
      }));

      // Verify crisis response capability if required
      if (crisisMonitor.enabled && loadTime > crisisMonitor.threshold) {
        addPerformanceAlert('screen_load', loadTime, 'warning');
      }

    } catch (error) {
      console.error('Screen initialization failed:', error);
      addAuthError({
        message: 'Screen initialization failed',
        code: 'INITIALIZATION_ERROR',
        timestamp: new Date().toISOString(),
        recoverable: true,
        suggestions: ['Try restarting the app', 'Check device capabilities']
      });
    }
  };

  const checkBiometricSupport = async (): Promise<void> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      // Get detailed biometric information
      const capabilities = {
        faceId: supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
        touchId: supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
        fingerprint: supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
        voice: false, // Not supported by Expo LocalAuthentication
        iris: supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS),
        hardwareBacked: hasHardware,
        multipleEnrollments: isEnrolled && supportedTypes.length > 1
      };

      setBiometricState({
        supported: hasHardware,
        available: hasHardware && isEnrolled,
        enrolled: isEnrolled,
        enabled: hasHardware && isEnrolled,
        setupInProgress: false,
        capabilities
      });

    } catch (error) {
      console.warn('Failed to check biometric support:', error);
      setBiometricState(prev => ({
        ...prev,
        supported: false,
        available: false,
        enrolled: false,
        enabled: false
      }));
    }
  };

  // Helper functions for error and performance management
  const addAuthError = useCallback((error: Omit<AuthScreenError, 'field'>): void => {
    const newError: AuthScreenError = {
      ...error,
      field: 'general'
    };

    setErrors(prev => [...prev, newError]);
    setScreenState(prev => ({
      ...prev,
      errors: [...prev.errors, newError],
      performanceMetrics: {
        ...prev.performanceMetrics,
        errorCount: prev.performanceMetrics.errorCount + 1
      }
    }));
  }, []);

  const addFieldError = useCallback((field: keyof SignInFormData, error: Omit<AuthScreenError, 'field'>): void => {
    const newError: AuthScreenError = {
      ...error,
      field
    };

    setErrors(prev => [...prev, newError]);
    setScreenState(prev => ({
      ...prev,
      errors: [...prev.errors, newError],
      performanceMetrics: {
        ...prev.performanceMetrics,
        errorCount: prev.performanceMetrics.errorCount + 1
      }
    }));
  }, []);

  const addPerformanceAlert = useCallback((method: string, responseTime: number, severity: 'warning' | 'critical'): void => {
    const alert = {
      timestamp: new Date().toISOString(),
      responseTime,
      threshold: crisisMonitor.threshold,
      screen: 'SignIn',
      method,
      severity
    };

    setCrisisMonitor(prev => ({
      ...prev,
      alerts: [...prev.alerts, alert],
      violationCount: severity === 'critical' ? prev.violationCount + 1 : prev.violationCount,
      lastViolation: severity === 'critical' ? alert.timestamp : prev.lastViolation
    }));

    if (severity === 'critical') {
      console.warn(`Crisis performance violation: ${method} took ${responseTime}ms (threshold: ${crisisMonitor.threshold}ms)`);
    }
  }, [crisisMonitor.threshold]);

  const clearErrors = useCallback((): void => {
    setErrors([]);
    setScreenState(prev => ({
      ...prev,
      errors: []
    }));
  }, []);

  const clearFieldError = useCallback((field: keyof SignInFormData): void => {
    setErrors(prev => prev.filter(error => error.field !== field));
    setScreenState(prev => ({
      ...prev,
      errors: prev.errors.filter(error => error.field !== field)
    }));
  }, []);

  // Enhanced form validation with performance monitoring
  const validateForm = useCallback((): boolean => {
    const validationStartTime = Date.now();
    const newErrors: AuthScreenError[] = [];

    // Email validation with enhanced error types
    if (!formData.email.trim()) {
      newErrors.push({
        field: 'email',
        message: 'Email is required to access your secure account',
        code: 'VALIDATION_REQUIRED',
        timestamp: new Date().toISOString(),
        recoverable: true,
        suggestions: ['Enter your registered email address']
      });
    } else if (!AUTH_SCREEN_CONSTANTS.VALIDATION.EMAIL_REGEX.test(formData.email)) {
      newErrors.push({
        field: 'email',
        message: 'Please enter a valid email address',
        code: 'VALIDATION_FORMAT',
        timestamp: new Date().toISOString(),
        recoverable: true,
        suggestions: ['Check email format (example@domain.com)']
      });
    }

    // Password validation with enhanced security checks
    if (!formData.password) {
      newErrors.push({
        field: 'password',
        message: 'Password is required to access your account',
        code: 'VALIDATION_REQUIRED',
        timestamp: new Date().toISOString(),
        recoverable: true,
        suggestions: ['Enter your account password']
      });
    } else if (formData.password.length < AUTH_SCREEN_CONSTANTS.VALIDATION.MIN_PASSWORD_LENGTH) {
      newErrors.push({
        field: 'password',
        message: `Password must be at least ${AUTH_SCREEN_CONSTANTS.VALIDATION.MIN_PASSWORD_LENGTH} characters`,
        code: 'VALIDATION_LENGTH',
        timestamp: new Date().toISOString(),
        recoverable: true,
        suggestions: ['Use a longer password for security']
      });
    }

    // Update validation time metrics
    const validationTime = Date.now() - validationStartTime;
    setScreenState(prev => ({
      ...prev,
      performanceMetrics: {
        ...prev.performanceMetrics,
        formValidationTime: validationTime
      }
    }));

    // Check validation performance for crisis scenarios
    if (crisisMonitor.enabled && validationTime > AUTH_SCREEN_CONSTANTS.PERFORMANCE.FORM_VALIDATION_TIMEOUT) {
      addPerformanceAlert('form_validation', validationTime, 'warning');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [formData]);

  // Enhanced email sign-in with comprehensive error handling and performance monitoring
  const handleEmailSignIn = useCallback(async (): Promise<void> => {
    if (!validateForm()) return;

    authStartTime.current = Date.now();
    setScreenState(prev => ({
      ...prev,
      isLoading: true,
      currentStep: 'authentication'
    }));

    try {
      // Clear previous errors
      clearErrors();

      // Validate form data using type guard
      if (!isSignInFormData(formData)) {
        throw new Error('Invalid form data format');
      }

      // Integrate with authentication service with performance monitoring
      const result = await signIn(formData.email, formData.password);
      const authTime = Date.now() - (authStartTime.current || Date.now());

      // Update performance metrics
      setScreenState(prev => ({
        ...prev,
        performanceMetrics: {
          ...prev.performanceMetrics,
          authenticationTime: authTime,
          networkLatency: result.performanceMetrics?.networkLatency || 0
        }
      }));

      // Check crisis performance requirements
      if (crisisMonitor.enabled && authTime > crisisMonitor.threshold) {
        addPerformanceAlert('email_signin', authTime, 'critical');
      }

      if (result.success) {
        // Handle successful authentication
        await handleAuthenticationSuccess(result, 'email');
      } else {
        // Handle authentication failure with enhanced error types
        const authError: AuthScreenError = {
          message: result.error || 'Unable to sign in. Please check your credentials and try again.',
          code: result.error?.includes('Invalid') ? 'INVALID_CREDENTIALS' : 'AUTHENTICATION_FAILED',
          timestamp: new Date().toISOString(),
          recoverable: true,
          suggestions: [
            'Check your email and password',
            'Try signing in with biometric authentication',
            'Use "Forgot Password" if needed'
          ]
        };
        addAuthError(authError);
      }

    } catch (error) {
      const authTime = Date.now() - (authStartTime.current || Date.now());

      // Update performance metrics for failed attempt
      setScreenState(prev => ({
        ...prev,
        performanceMetrics: {
          ...prev.performanceMetrics,
          authenticationTime: authTime
        }
      }));

      const authError: AuthScreenError = {
        message: error instanceof Error ? error.message : 'Unable to sign in. Please try again.',
        code: 'AUTHENTICATION_FAILED',
        timestamp: new Date().toISOString(),
        recoverable: true,
        suggestions: [
          'Check your internet connection',
          'Try again in a few moments',
          'Contact support if the problem persists'
        ]
      };
      addAuthError(authError);

      console.error('Email sign-in failed:', error);
    } finally {
      setScreenState(prev => ({
        ...prev,
        isLoading: false,
        currentStep: 'form_input'
      }));
    }
  }, [formData, validateForm, crisisMonitor.enabled, clearErrors, addAuthError, addPerformanceAlert]);

  // Handle successful authentication with type safety
  const handleAuthenticationSuccess = useCallback(async (
    result: AuthenticationResult,
    method: AuthenticationMethod
  ): Promise<void> => {
    try {
      // Calculate total completion time
      const totalTime = Date.now() - performanceStartTime.current;

      setScreenState(prev => ({
        ...prev,
        currentStep: 'completion',
        performanceMetrics: {
          ...prev.performanceMetrics,
          totalTime
        }
      }));

      // Show success message
      Alert.alert(
        'Welcome Back',
        'You have successfully signed in to your secure account. Your therapeutic progress is now available across all your devices.',
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigate based on route parameters
              const returnTo = route.params?.returnTo;
              if (returnTo) {
                navigation.navigate(returnTo as any);
              } else {
                navigation.goBack();
              }
            }
          }
        ]
      );

    } catch (error) {
      console.error('Success handling failed:', error);
      addAuthError({
        message: 'Authentication succeeded but navigation failed',
        code: 'NAVIGATION_ERROR',
        timestamp: new Date().toISOString(),
        recoverable: true,
        suggestions: ['Try navigating manually to the main screen']
      });
    }
  }, [route.params?.returnTo, navigation, addAuthError]);

  const handleBiometricSignIn = useCallback(async () => {
    if (!biometricSupported) {
      Alert.alert(
        'Biometric Authentication Unavailable',
        'Please set up Face ID or Touch ID in your device settings, or sign in with your email and password.',
        [
          { text: 'Use Email Instead', onPress: () => {} },
          { text: 'OK' }
        ]
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to access your secure therapeutic data',
        fallbackLabel: 'Use email and password',
        disableDeviceFallback: false,
      });

      if (result.success) {
        Alert.alert(
          'Welcome Back',
          'Biometric authentication successful. Your secure therapeutic data is now accessible.',
          [
            {
              text: 'Continue',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert(
          'Authentication Required',
          'Biometric authentication was not completed. You can continue with email and password below.',
          [{ text: 'Continue' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Authentication Error',
        'An error occurred during biometric authentication. Please try signing in with email and password.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [biometricSupported, navigation]);

  const handleSocialSignIn = useCallback(async (provider: 'apple' | 'google') => {
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
          'Welcome Back',
          `You have successfully signed in with ${provider === 'apple' ? 'Apple' : 'Google'}. Your therapeutic progress is now available across all your devices.`,
          [
            {
              text: 'Continue',
              onPress: () => {
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Sign In Error',
          result.error || `There was an issue signing in with ${provider === 'apple' ? 'Apple' : 'Google'}. Please try email authentication.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Sign In Error',
        'There was an issue with social sign in. Please try email authentication.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  const handleForgotPassword = useCallback(() => {
    (navigation as any).navigate('ForgotPassword');
  }, [navigation]);

  const handleCreateAccount = useCallback(() => {
    (navigation as any).navigate('SignUp');
  }, [navigation]);

  const handleContinueOffline = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const getErrorForField = (field: keyof SignInFormData): string | undefined => {
    return errors.find(error => error.field === field)?.message;
  };

  const getGeneralError = (): string | undefined => {
    return errors.find(error => !error.field)?.message;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Crisis Button - Always Accessible */}
      <CrisisButton variant="header" style={styles.crisisButton} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        accessible={true}
        accessibilityLabel="Sign in screen content"
        accessibilityRole="scrollbar"
      >
        {/* Header */}
        <View style={styles.header} accessible={true} accessibilityRole="header">
          <Text
            style={styles.title}
            accessible={true}
            accessibilityRole="header"
            accessibilityLevel={1}
          >
            Welcome Back
          </Text>
          <Text
            style={styles.subtitle}
            accessible={true}
            accessibilityRole="text"
          >
            Sign in to access your secure therapeutic progress across all devices
          </Text>
        </View>

        {/* General Error Display */}
        {getGeneralError() && (
          <Card
            style={styles.errorCard}
            accessible={true}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            accessibilityLabel={`Error: ${getGeneralError()}`}
          >
            <Text
              style={styles.errorText}
              accessible={true}
              accessibilityRole="text"
            >
              {getGeneralError()}
            </Text>
          </Card>
        )}

        {/* Quick Authentication Options */}
        {biometricState.available && (
          <Card style={styles.quickAuthCard}>
            <Text
              style={styles.quickAuthTitle}
              accessible={true}
              accessibilityRole="header"
              accessibilityLevel={2}
            >
              Quick & Secure Sign In
            </Text>
            <Button
              variant="primary"
              onPress={handleBiometricSignIn}
              loading={screenState.isLoading}
              disabled={screenState.isLoading}
              style={styles.biometricButton}
              accessibilityLabel={`Use ${Platform.OS === 'ios' ? 'Face ID or Touch ID' : 'biometric'} to sign in securely`}
              accessibilityHint="Double tap to authenticate using your device's biometric security. This provides secure access to your therapeutic data."
            >
              {Platform.OS === 'ios'
                ? '🔐 Sign In with Face ID / Touch ID'
                : '🔐 Sign In with Biometric'
              }
            </Button>
          </Card>
        )}

        {/* Email Sign In Form */}
        <Card style={styles.formCard}>
          <Text
            style={styles.formTitle}
            accessible={true}
            accessibilityRole="header"
            accessibilityLevel={2}
          >
            Sign In with Email
          </Text>

          <View
            style={styles.inputGroup}
            accessible={true}
            accessibilityRole="none"
          >
            <Text
              style={styles.inputLabel}
              accessible={true}
              accessibilityRole="text"
            >
              Email Address
            </Text>
            <TextInput
              value={formData.email}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, email: text }));
                // Clear field error when user starts typing
                clearFieldError('email');
              }}
              placeholder="Enter your email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              error={getErrorForField('email')}
              disabled={screenState.isLoading}
              accessibilityLabel="Email address input field"
              accessibilityHint="Enter your registered email address to sign in to your secure account"
              required={true}
            />
          </View>

          <View
            style={styles.inputGroup}
            accessible={true}
            accessibilityRole="none"
          >
            <Text
              style={styles.inputLabel}
              accessible={true}
              accessibilityRole="text"
            >
              Password
            </Text>
            <TextInput
              value={formData.password}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, password: text }));
                clearFieldError('password');
              }}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              autoComplete="current-password"
              textContentType="password"
              error={getErrorForField('password')}
              disabled={screenState.isLoading}
              accessibilityLabel="Password input field"
              accessibilityHint="Enter your account password to access your secure therapeutic data"
              required={true}
              rightElement={
                <Button
                  variant="ghost"
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={screenState.isLoading}
                  accessibilityLabel={showPassword ? 'Hide password from view' : 'Show password characters'}
                  accessibilityHint={showPassword ? 'Double tap to hide your password for security' : 'Double tap to reveal your password characters'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </Button>
              }
            />
          </View>

          <Button
            variant="primary"
            onPress={handleEmailSignIn}
            loading={screenState.isLoading}
            disabled={screenState.isLoading || !formData.email.trim() || !formData.password.trim()}
            style={styles.signInButton}
            accessibilityLabel="Sign in with email and password"
            accessibilityHint="Double tap to sign in to your secure therapeutic account using the email and password you entered"
            accessibilityState={{
              disabled: screenState.isLoading || !formData.email.trim() || !formData.password.trim(),
              busy: screenState.isLoading
            }}
          >
            Sign In to Secure Account
          </Button>

          <Button
            variant="ghost"
            onPress={handleForgotPassword}
            disabled={screenState.isLoading}
            style={styles.forgotPasswordButton}
            accessibilityLabel="Reset forgotten password"
            accessibilityHint="Double tap to start the secure password reset process"
          >
            Forgot your password?
          </Button>
        </Card>

        {/* Social Authentication */}
        <Card style={styles.socialCard}>
          <Text style={styles.socialTitle}>Alternative Sign In Methods</Text>

          {Platform.OS === 'ios' && (
            <Button
              variant="outline"
              onPress={() => handleSocialSignIn('apple')}
              loading={isLoading}
              disabled={isLoading}
              style={styles.socialButton}
              accessibilityLabel="Sign in with Apple ID"
            >
              🍎 Continue with Apple
            </Button>
          )}

          <Button
            variant="outline"
            onPress={() => handleSocialSignIn('google')}
            loading={isLoading}
            disabled={isLoading}
            style={styles.socialButton}
            accessibilityLabel="Sign in with Google account"
          >
            🔵 Continue with Google
          </Button>
        </Card>

        {/* Account Creation & Offline Options */}
        <View style={styles.accountOptions}>
          <Text style={styles.accountPrompt}>
            Don't have an account yet?
          </Text>
          <Button
            variant="outline"
            onPress={handleCreateAccount}
            disabled={isLoading}
            style={styles.createAccountButton}
            accessibilityLabel="Create new secure account"
          >
            Create Secure Account
          </Button>

          <Button
            variant="ghost"
            onPress={handleContinueOffline}
            disabled={isLoading}
            style={styles.offlineButton}
            accessibilityLabel="Continue using app without cloud features"
          >
            Continue Offline for Now
          </Button>
        </View>

        {/* Privacy & Crisis Assurance */}
        <Card style={styles.assuranceCard}>
          <Text
            style={styles.assuranceTitle}
            accessible={true}
            accessibilityRole="header"
            accessibilityLevel={2}
          >
            Your Safety & Privacy
          </Text>
          <Text
            style={styles.assuranceText}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel="Privacy and safety information: Crisis support 988 is always available even without signing in. All therapeutic features work offline to ensure continuous support. Your data is encrypted and never accessible to others. You can disable cloud features anytime while keeping your progress."
          >
            • Crisis support (988) is always available, even without signing in{'\n'}
            • All therapeutic features work offline to ensure continuous support{'\n'}
            • Your data is encrypted and never accessible to others{'\n'}
            • You can disable cloud features anytime while keeping your progress
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
    minWidth: 44, // WCAG AA touch target
    minHeight: 44, // WCAG AA touch target
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
  quickAuthCard: {
    marginBottom: spacing.lg,
    backgroundColor: colorSystem.gray[50],
  },
  quickAuthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  biometricButton: {
    marginBottom: 0,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
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
  signInButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  forgotPasswordButton: {
    alignSelf: 'center',
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
  accountOptions: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  accountPrompt: {
    fontSize: 14,
    color: colorSystem.gray[600],
    marginBottom: spacing.sm,
  },
  createAccountButton: {
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
  },
});

export default SignInScreen;