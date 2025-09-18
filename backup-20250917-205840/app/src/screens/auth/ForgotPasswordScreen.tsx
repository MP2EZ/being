/**
 * Forgot Password Screen - MBCT-Compliant Password Recovery
 * Maintains therapeutic support during security processes
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Button, Card, TextInput, CrisisButton } from '../../components/core';
import { colorSystem, spacing } from '../../constants/colors';
import { AuthErrorCode } from '../../types';
import { authIntegrationService } from '../../services/cloud/AuthIntegrationService';

interface ForgotPasswordFormData {
  email: string;
}

interface ForgotPasswordError {
  field?: keyof ForgotPasswordFormData;
  message: string;
  code: AuthErrorCode;
}

type PasswordResetStep = 'email' | 'sent' | 'security' | 'reset' | 'success';

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation();

  // Form state
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: ''
  });
  const [errors, setErrors] = useState<ForgotPasswordError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<PasswordResetStep>('email');
  const [attemptCount, setAttemptCount] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitExpiry, setRateLimitExpiry] = useState<Date | null>(null);

  // Security question state
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmailForm = useCallback((): boolean => {
    const newErrors: ForgotPasswordError[] = [];

    if (!formData.email.trim()) {
      newErrors.push({
        field: 'email',
        message: 'Email address is required to reset your password',
        code: 'VALIDATION_REQUIRED'
      });
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.push({
        field: 'email',
        message: 'Please enter a valid email address',
        code: 'VALIDATION_FORMAT'
      });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [formData.email]);

  const validatePasswordForm = useCallback((): boolean => {
    const newErrors: ForgotPasswordError[] = [];

    if (!newPassword) {
      newErrors.push({
        message: 'New password is required',
        code: 'VALIDATION_REQUIRED'
      });
    } else if (newPassword.length < 8) {
      newErrors.push({
        message: 'Password must be at least 8 characters for security',
        code: 'VALIDATION_LENGTH'
      });
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      newErrors.push({
        message: 'Password must include uppercase, lowercase, and numbers',
        code: 'VALIDATION_STRENGTH'
      });
    }

    if (!confirmNewPassword) {
      newErrors.push({
        message: 'Please confirm your new password',
        code: 'VALIDATION_REQUIRED'
      });
    } else if (newPassword !== confirmNewPassword) {
      newErrors.push({
        message: 'Passwords do not match',
        code: 'VALIDATION_MATCH'
      });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [newPassword, confirmNewPassword]);

  const checkRateLimit = useCallback((): boolean => {
    if (attemptCount >= 3) {
      const now = new Date();
      const limitExpiry = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
      setIsRateLimited(true);
      setRateLimitExpiry(limitExpiry);

      Alert.alert(
        'Too Many Attempts',
        'For your security, password reset requests are temporarily limited. Please try again in 15 minutes or contact support if you need immediate assistance.',
        [
          { text: 'Contact Support', onPress: handleContactSupport },
          { text: 'OK' }
        ]
      );
      return false;
    }
    return true;
  }, [attemptCount]);

  const handleSendResetEmail = useCallback(async () => {
    if (!validateEmailForm() || !checkRateLimit()) return;

    setIsLoading(true);
    try {
      // TODO: Implement password reset in SupabaseAuthService
      // For now, we'll use a simulation until the backend method is added
      // const result = await authIntegrationService.resetPassword(formData.email);

      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call

      setAttemptCount(prev => prev + 1);
      setCurrentStep('sent');

      // Auto-progress to success after a delay to simulate email processing
      setTimeout(() => {
        Alert.alert(
          'Reset Email Sent',
          'We\'ve sent password reset instructions to your email. Please check your inbox and spam folder.',
          [
            {
              text: 'Check Email',
              onPress: () => setCurrentStep('success')
            }
          ]
        );
      }, 1000);

    } catch (error) {
      const resetError: ForgotPasswordError = {
        message: 'Unable to send reset email. Please try again or contact support.',
        code: 'NETWORK_ERROR'
      };
      setErrors([resetError]);
    } finally {
      setIsLoading(false);
    }
  }, [formData.email, validateEmailForm, checkRateLimit]);

  const handleSecurityQuestionFallback = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Implement security question verification
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (securityAnswer.toLowerCase().trim() === 'expected answer') {
        setCurrentStep('reset');
      } else {
        Alert.alert(
          'Security Answer Incorrect',
          'The security answer provided does not match our records. Please try the email reset method or contact support.',
          [
            { text: 'Try Email Reset', onPress: () => setCurrentStep('email') },
            { text: 'Contact Support', onPress: handleContactSupport }
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Verification Error',
        'Unable to verify security answer. Please try the email reset method.',
        [{ text: 'Try Email Reset', onPress: () => setCurrentStep('email') }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [securityAnswer]);

  const handlePasswordReset = useCallback(async () => {
    if (!validatePasswordForm()) return;

    setIsLoading(true);
    try {
      // TODO: Implement password reset completion
      await new Promise(resolve => setTimeout(resolve, 1500));

      Alert.alert(
        'Password Reset Successful',
        'Your password has been updated successfully. You can now sign in with your new password.',
        [
          {
            text: 'Sign In Now',
            onPress: () => {
              (navigation as any).navigate('SignIn');
            }
          }
        ]
      );

    } catch (error) {
      const resetError: ForgotPasswordError = {
        message: 'Unable to reset password. Please try again.',
        code: 'RESET_FAILED'
      };
      setErrors([resetError]);
    } finally {
      setIsLoading(false);
    }
  }, [validatePasswordForm, navigation]);

  const handleContactSupport = useCallback(() => {
    Alert.alert(
      'Contact Support',
      'You can reach our support team at support@fullmind.app or through the in-app help section. Our team typically responds within 24 hours.',
      [
        {
          text: 'Send Email',
          onPress: () => {
            // TODO: Open email client
            console.log('Opening email client...');
          }
        },
        { text: 'OK' }
      ]
    );
  }, []);

  const handleReturnToSignIn = useCallback(() => {
    (navigation as any).navigate('SignIn');
  }, [navigation]);

  const handleTryDifferentEmail = useCallback(() => {
    setCurrentStep('email');
    setFormData({ email: '' });
    setErrors([]);
  }, []);

  const getErrorForField = (field?: keyof ForgotPasswordFormData): string | undefined => {
    return errors.find(error => error.field === field)?.message;
  };

  const getGeneralError = (): string | undefined => {
    return errors.find(error => !error.field)?.message;
  };

  const renderEmailStep = () => (
    <Card style={styles.formCard}>
      <Text style={styles.formTitle}>Reset Your Password</Text>
      <Text style={styles.formSubtitle}>
        Enter your email address and we'll send you instructions to reset your password safely
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email Address</Text>
        <TextInput
          value={formData.email}
          onChangeText={(text) => setFormData({ email: text })}
          placeholder="Enter your registered email address"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={getErrorForField('email')}
          disabled={isLoading || isRateLimited}
          accessibilityLabel="Email address for password reset"
          accessibilityHint="Enter the email address associated with your account"
        />
      </View>

      <Button
        variant="primary"
        onPress={handleSendResetEmail}
        loading={isLoading}
        disabled={isLoading || isRateLimited}
        style={styles.submitButton}
        accessibilityLabel="Send password reset email"
      >
        Send Reset Instructions
      </Button>

      {attemptCount > 0 && (
        <Text style={styles.attemptWarning}>
          Attempts: {attemptCount}/3 - For security, requests are limited
        </Text>
      )}
    </Card>
  );

  const renderSentStep = () => (
    <Card style={styles.formCard}>
      <Text style={styles.successIcon}>📧</Text>
      <Text style={styles.formTitle}>Check Your Email</Text>
      <Text style={styles.formSubtitle}>
        We've sent password reset instructions to{' '}
        <Text style={styles.emailText}>{formData.email}</Text>
      </Text>

      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsTitle}>Next Steps:</Text>
        <Text style={styles.instructionsText}>
          1. Check your email inbox and spam folder{'\n'}
          2. Click the secure reset link in the email{'\n'}
          3. Create your new password{'\n'}
          4. Sign in with your new credentials
        </Text>
      </View>

      <View style={styles.buttonGroup}>
        <Button
          variant="outline"
          onPress={handleTryDifferentEmail}
          disabled={isLoading}
          style={styles.halfButton}
          accessibilityLabel="Use different email address"
        >
          Different Email
        </Button>
        <Button
          variant="primary"
          onPress={() => setCurrentStep('security')}
          disabled={isLoading}
          style={styles.halfButton}
          accessibilityLabel="Try security question instead"
        >
          Security Question
        </Button>
      </View>
    </Card>
  );

  const renderSecurityStep = () => (
    <Card style={styles.formCard}>
      <Text style={styles.formTitle}>Security Question</Text>
      <Text style={styles.formSubtitle}>
        As an alternative, answer your security question to reset your password
      </Text>

      <View style={styles.securityQuestionBox}>
        <Text style={styles.securityQuestion}>
          What was the name of your first pet?
        </Text>
        <TextInput
          value={securityAnswer}
          onChangeText={setSecurityAnswer}
          placeholder="Enter your answer"
          autoCapitalize="words"
          disabled={isLoading}
          accessibilityLabel="Security question answer"
          accessibilityHint="Enter the answer to your security question"
        />
      </View>

      <View style={styles.buttonGroup}>
        <Button
          variant="outline"
          onPress={() => setCurrentStep('sent')}
          disabled={isLoading}
          style={styles.halfButton}
          accessibilityLabel="Go back to email reset"
        >
          Back to Email
        </Button>
        <Button
          variant="primary"
          onPress={handleSecurityQuestionFallback}
          loading={isLoading}
          disabled={isLoading || !securityAnswer.trim()}
          style={styles.halfButton}
          accessibilityLabel="Verify security answer"
        >
          Verify Answer
        </Button>
      </View>
    </Card>
  );

  const renderResetStep = () => (
    <Card style={styles.formCard}>
      <Text style={styles.formTitle}>Create New Password</Text>
      <Text style={styles.formSubtitle}>
        Choose a strong password to protect your therapeutic data
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>New Password</Text>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Create a strong password"
          secureTextEntry={!showNewPassword}
          disabled={isLoading}
          accessibilityLabel="New password"
          accessibilityHint="Create a secure password with uppercase, lowercase, and numbers"
          rightElement={
            <Button
              variant="ghost"
              onPress={() => setShowNewPassword(!showNewPassword)}
              disabled={isLoading}
              accessibilityLabel={showNewPassword ? 'Hide password' : 'Show password'}
            >
              {showNewPassword ? '🙈' : '👁️'}
            </Button>
          }
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Confirm New Password</Text>
        <TextInput
          value={confirmNewPassword}
          onChangeText={setConfirmNewPassword}
          placeholder="Confirm your new password"
          secureTextEntry={!showConfirmPassword}
          disabled={isLoading}
          accessibilityLabel="Confirm new password"
          accessibilityHint="Re-enter your new password to confirm"
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
        onPress={handlePasswordReset}
        loading={isLoading}
        disabled={isLoading || !newPassword || !confirmNewPassword}
        style={styles.submitButton}
        accessibilityLabel="Reset password with new credentials"
      >
        Reset Password
      </Button>
    </Card>
  );

  const renderSuccessStep = () => (
    <Card style={styles.formCard}>
      <Text style={styles.successIcon}>✅</Text>
      <Text style={styles.formTitle}>Instructions Sent</Text>
      <Text style={styles.formSubtitle}>
        Password reset instructions have been sent to your email. Please follow the secure link to complete the process.
      </Text>

      <View style={styles.successActions}>
        <Button
          variant="primary"
          onPress={handleReturnToSignIn}
          style={styles.returnButton}
          accessibilityLabel="Return to sign in screen"
        >
          Return to Sign In
        </Button>

        <Button
          variant="outline"
          onPress={handleContactSupport}
          style={styles.supportButton}
          accessibilityLabel="Contact support for help"
        >
          Need Help? Contact Support
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
          <Text style={styles.title}>Password Recovery</Text>
          <Text style={styles.subtitle}>
            Secure password reset for your therapeutic account
          </Text>
        </View>

        {/* General Error Display */}
        {getGeneralError() && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{getGeneralError()}</Text>
          </Card>
        )}

        {/* Step Content */}
        {currentStep === 'email' && renderEmailStep()}
        {currentStep === 'sent' && renderSentStep()}
        {currentStep === 'security' && renderSecurityStep()}
        {currentStep === 'reset' && renderResetStep()}
        {currentStep === 'success' && renderSuccessStep()}

        {/* Support & Alternative Options */}
        {currentStep !== 'success' && (
          <Card style={styles.supportCard}>
            <Text style={styles.supportTitle}>Need Immediate Help?</Text>
            <Text style={styles.supportText}>
              If you're having trouble accessing your account and need immediate support, our team is here to help.
            </Text>
            <Button
              variant="outline"
              onPress={handleContactSupport}
              style={styles.contactButton}
              accessibilityLabel="Contact support team"
            >
              Contact Support Team
            </Button>
          </Card>
        )}

        {/* Return Navigation */}
        <View style={styles.navigationFooter}>
          <Button
            variant="ghost"
            onPress={handleReturnToSignIn}
            accessibilityLabel="Cancel password reset and return to sign in"
          >
            ← Back to Sign In
          </Button>
        </View>

        {/* Crisis Assurance */}
        <Card style={styles.assuranceCard}>
          <Text style={styles.assuranceTitle}>Crisis Support Always Available</Text>
          <Text style={styles.assuranceText}>
            Remember: Crisis support (988) and emergency resources are always accessible, even without account access
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
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: colorSystem.gray[600],
    marginBottom: spacing.lg,
    lineHeight: 20,
    textAlign: 'center',
  },
  inputGroup: {
    width: '100%',
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colorSystem.gray[700],
    marginBottom: spacing.xs,
  },
  submitButton: {
    width: '100%',
    marginTop: spacing.sm,
  },
  attemptWarning: {
    fontSize: 12,
    color: colorSystem.status.warning,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  successIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emailText: {
    fontWeight: '600',
    color: colorSystem.primary[600],
  },
  instructionsBox: {
    backgroundColor: colorSystem.gray[50],
    padding: spacing.md,
    borderRadius: 8,
    marginVertical: spacing.lg,
    width: '100%',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
  },
  instructionsText: {
    fontSize: 13,
    color: colorSystem.gray[700],
    lineHeight: 20,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.md,
  },
  halfButton: {
    flex: 1,
  },
  securityQuestionBox: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  securityQuestion: {
    fontSize: 16,
    fontWeight: '500',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
    textAlign: 'center',
    backgroundColor: colorSystem.gray[50],
    padding: spacing.md,
    borderRadius: 8,
  },
  successActions: {
    width: '100%',
    marginTop: spacing.lg,
  },
  returnButton: {
    marginBottom: spacing.sm,
  },
  supportButton: {
    marginBottom: spacing.md,
  },
  supportCard: {
    backgroundColor: colorSystem.gray[50],
    marginBottom: spacing.lg,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  supportText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  contactButton: {
    alignSelf: 'center',
  },
  navigationFooter: {
    alignItems: 'center',
    marginBottom: spacing.lg,
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

export default ForgotPasswordScreen;