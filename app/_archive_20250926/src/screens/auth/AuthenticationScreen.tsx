/**
 * Authentication Screen - Entry point for cloud features
 * Maintains offline-first UX with optional cloud upgrade
 */

import React, { useState } from 'react';
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
import * as LocalAuthentication from 'expo-local-authentication';
import { Button, Card } from '../../components/core';
import { colorSystem, spacing } from '../../constants/colors';
import { useUserStore } from '../../store';
import { BiometricAuthData, AuthSession } from '../../types';

interface AuthenticationScreenProps {
  mode: 'signup' | 'login' | 'migration';
  onAuthenticated?: (session: AuthSession) => void;
  onSkip?: () => void;
}

const AuthenticationScreen: React.FC<AuthenticationScreenProps> = ({
  mode = 'signup',
  onAuthenticated,
  onSkip
}) => {
  const navigation = useNavigation();
  const { user } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'biometric' | 'email' | null>(null);
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

  const handleBiometricAuth = async () => {
    if (!biometricSupported) {
      Alert.alert(
        'Biometric Authentication Unavailable',
        'Please set up Face ID or Touch ID in your device settings to use this feature.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: mode === 'signup'
          ? 'Set up biometric authentication for secure cloud sync'
          : 'Authenticate to access your cloud data',
        fallbackLabel: 'Use passcode instead',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // TODO: Integrate with CloudAuthClient
        // For now, simulate authentication
        const mockSession: AuthSession = {
          id: `session_${Date.now()}`,
          userId: user?.id || `user_${Date.now()}`,
          deviceId: Platform.OS === 'ios' ? 'ios_device' : 'android_device',
          accessToken: `token_${Date.now()}`,
          refreshToken: `refresh_${Date.now()}`,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
          scopes: ['read', 'write', 'sync'],
          mfaVerified: false,
          biometricVerified: true,
          sessionType: 'authenticated'
        };

        Alert.alert(
          'Authentication Successful',
          mode === 'signup'
            ? 'Your secure cloud account has been created!'
            : 'Welcome back! Your cloud data is now available.',
          [
            {
              text: 'Continue',
              onPress: () => {
                onAuthenticated?.(mockSession);
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Authentication Failed',
          'Please try again or use email authentication instead.'
        );
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      Alert.alert(
        'Authentication Error',
        'An error occurred during authentication. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = () => {
    // Navigate to email authentication flow
    Alert.alert(
      'Email Authentication',
      'Email authentication coming soon. For now, you can continue using FullMind offline.',
      [
        { text: 'Continue Offline', onPress: onSkip },
        { text: 'OK' }
      ]
    );
  };

  const getHeaderContent = () => {
    switch (mode) {
      case 'signup':
        return {
          title: 'Optional Cloud Features',
          subtitle: 'Enable secure cloud sync to access your data across devices. FullMind works perfectly offline too.',
          primaryAction: 'Set Up Cloud Sync',
          secondaryAction: 'Continue Offline'
        };
      case 'login':
        return {
          title: 'Access Cloud Data',
          subtitle: 'Authenticate to sync your data across devices.',
          primaryAction: 'Sign In',
          secondaryAction: 'Stay Offline'
        };
      case 'migration':
        return {
          title: 'Upgrade to Cloud Sync',
          subtitle: 'Keep your existing data and enable secure cloud backup.',
          primaryAction: 'Upgrade Account',
          secondaryAction: 'Maybe Later'
        };
    }
  };

  const headerContent = getHeaderContent();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{headerContent.title}</Text>
          <Text style={styles.subtitle}>{headerContent.subtitle}</Text>
        </View>

        {/* Feature Benefits */}
        <Card style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Cloud Sync Benefits</Text>
          <View style={styles.benefitsList}>
            <BenefitItem
              icon="🔄"
              title="Multi-Device Access"
              description="Access your data on all your devices"
            />
            <BenefitItem
              icon="🔒"
              title="Zero-Knowledge Encryption"
              description="Your data stays private, even from us"
            />
            <BenefitItem
              icon="💾"
              title="Secure Backup"
              description="Never lose your progress and insights"
            />
            <BenefitItem
              icon="⚡"
              title="Crisis Safety"
              description="Emergency sync ensures help is always available"
            />
          </View>
        </Card>

        {/* Authentication Options */}
        <View style={styles.authSection}>
          <Text style={styles.authTitle}>Choose Authentication Method</Text>

          {biometricSupported && (
            <Button
              variant="primary"
              onPress={handleBiometricAuth}
              loading={isLoading && authMethod === 'biometric'}
              disabled={isLoading}
              style={styles.authButton}
              accessibilityLabel={`Use ${Platform.OS === 'ios' ? 'Face ID or Touch ID' : 'biometric'} authentication`}
            >
              {Platform.OS === 'ios'
                ? '🔐 Use Face ID / Touch ID'
                : '🔐 Use Biometric Authentication'
              }
            </Button>
          )}

          <Button
            variant="outline"
            onPress={handleEmailAuth}
            loading={isLoading && authMethod === 'email'}
            disabled={isLoading}
            style={styles.authButton}
            accessibilityLabel="Use email and password authentication"
          >
            📧 Use Email & Password
          </Button>
        </View>

        {/* Privacy Notice */}
        <Card style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>Privacy & Security</Text>
          <Text style={styles.privacyText}>
            • All data is encrypted before leaving your device{'\n'}
            • We cannot read your personal information{'\n'}
            • You can disable cloud features anytime{'\n'}
            • Offline mode preserves full functionality{'\n'}
            • HIPAA-compliant secure infrastructure
          </Text>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            variant="outline"
            onPress={onSkip}
            disabled={isLoading}
            accessibilityLabel={headerContent.secondaryAction}
          >
            {headerContent.secondaryAction}
          </Button>
        </View>

        {/* Crisis Safety Notice */}
        <View style={styles.crisisNotice}>
          <Text style={styles.crisisText}>
            ⚠️ Crisis features work offline and are never affected by cloud settings
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const BenefitItem: React.FC<{
  icon: string;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <View style={styles.benefitItem}>
    <Text style={styles.benefitIcon}>{icon}</Text>
    <View style={styles.benefitContent}>
      <Text style={styles.benefitTitle}>{title}</Text>
      <Text style={styles.benefitDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  header: {
    paddingVertical: spacing.lg,
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
  benefitsCard: {
    marginBottom: spacing.lg,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
  },
  benefitsList: {
    gap: spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  benefitIcon: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  benefitDescription: {
    fontSize: 14,
    color: colorSystem.gray[600],
    lineHeight: 18,
  },
  authSection: {
    marginBottom: spacing.lg,
  },
  authTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  authButton: {
    marginBottom: spacing.sm,
  },
  privacyCard: {
    backgroundColor: colorSystem.gray[50],
    marginBottom: spacing.lg,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
  },
  privacyText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 20,
  },
  actions: {
    marginBottom: spacing.lg,
  },
  crisisNotice: {
    backgroundColor: colorSystem.status.warning + '20',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  crisisText: {
    fontSize: 12,
    color: colorSystem.gray[700],
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default AuthenticationScreen;