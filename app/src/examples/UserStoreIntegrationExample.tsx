/**
 * UserStore Integration Example
 *
 * Demonstrates how to use the enhanced UserStore in FullMind components
 * with security compliance and crisis response features.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useUserStore, userStoreUtils } from '../store/userStore';
import { Button } from '../components/core/Button';

interface UserStoreExampleProps {
  onNavigateToCrisis?: () => void;
}

export const UserStoreIntegrationExample: React.FC<UserStoreExampleProps> = ({
  onNavigateToCrisis
}) => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    sessionExpiry,
    lastAuthTime,
    avgResponseTime,
    emergencyMode,
    signIn,
    signOut,
    enableEmergencyMode,
    disableEmergencyMode,
    updateProfile,
    initializeStore,
    getSessionTimeRemaining,
    isCrisisAccessible
  } = useUserStore();

  const [email, setEmail] = useState('demo@fullmind.app');
  const [password, setPassword] = useState('demo123');
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0);

  // Initialize store on component mount
  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  // Update session time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTimeLeft(getSessionTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [getSessionTimeRemaining]);

  // Handle authentication
  const handleSignIn = async () => {
    try {
      await signIn(email, password);
      Alert.alert('Success', `Signed in successfully! Auth took ${lastAuthTime}ms`);
    } catch (error) {
      Alert.alert('Error', 'Failed to sign in');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      Alert.alert('Success', 'Signed out successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  // Handle emergency mode
  const handleEmergencyMode = async () => {
    try {
      const startTime = Date.now();
      await enableEmergencyMode('severe_anxiety');
      const duration = Date.now() - startTime;

      Alert.alert(
        'Emergency Mode Activated',
        `Crisis access enabled in ${duration}ms. Crisis features are now available.`,
        [
          { text: 'Go to Crisis Plan', onPress: onNavigateToCrisis },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to activate emergency mode');
    }
  };

  const handleDisableEmergencyMode = async () => {
    try {
      await disableEmergencyMode();
      Alert.alert('Success', 'Emergency mode disabled');
    } catch (error) {
      Alert.alert('Error', 'Failed to disable emergency mode');
    }
  };

  // Handle profile update
  const handleUpdateProfile = async () => {
    try {
      await updateProfile({
        preferences: {
          ...user?.preferences,
          haptics: !user?.preferences?.haptics
        }
      });
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  // Format time remaining
  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return 'Expired';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Format performance metrics
  const formatPerformanceMetrics = (): string => {
    return `Last: ${lastAuthTime}ms | Avg: ${Math.round(avgResponseTime)}ms`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>UserStore Integration Example</Text>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      {/* Authentication Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Authentication Status</Text>
        <Text>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</Text>
        <Text>Loading: {isLoading ? 'Yes' : 'No'}</Text>
        <Text>Emergency Mode: {emergencyMode ? 'Active' : 'Inactive'}</Text>
        <Text>Crisis Accessible: {isCrisisAccessible() ? 'Yes' : 'No'}</Text>
      </View>

      {/* User Information */}
      {user && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Information</Text>
          <Text>ID: {user.id}</Text>
          <Text>Onboarding: {user.onboardingCompleted ? 'Complete' : 'Incomplete'}</Text>
          <Text>Theme: {user.preferences.theme}</Text>
          <Text>Haptics: {user.preferences.haptics ? 'Enabled' : 'Disabled'}</Text>
          <Text>Values: {user.values.join(', ') || 'None'}</Text>
        </View>
      )}

      {/* Session Information */}
      {isAuthenticated && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Information</Text>
          <Text>Time Remaining: {formatTimeRemaining(sessionTimeLeft)}</Text>
          <Text>Session Expires: {sessionExpiry ? new Date(sessionExpiry).toLocaleTimeString() : 'Unknown'}</Text>
          <Text>Performance: {formatPerformanceMetrics()}</Text>
          {avgResponseTime > 200 && (
            <Text style={styles.warningText}>
              ⚠️ Auth performance exceeds 200ms crisis requirement
            </Text>
          )}
        </View>
      )}

      {/* Authentication Actions */}
      {!isAuthenticated ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sign In</Text>
          <Button
            title="Sign In (Demo)"
            onPress={handleSignIn}
            disabled={isLoading}
            variant="primary"
            style={styles.button}
          />
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          <Button
            title="Update Profile"
            onPress={handleUpdateProfile}
            disabled={isLoading}
            variant="secondary"
            style={styles.button}
          />
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            disabled={isLoading}
            variant="secondary"
            style={styles.button}
          />
        </View>
      )}

      {/* Crisis Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Crisis Management</Text>
        <Text style={styles.description}>
          Crisis features are always accessible for safety, even without authentication.
        </Text>

        {!emergencyMode ? (
          <Button
            title="🚨 Activate Emergency Mode"
            onPress={handleEmergencyMode}
            variant="danger"
            style={[styles.button, styles.emergencyButton]}
          />
        ) : (
          <Button
            title="Disable Emergency Mode"
            onPress={handleDisableEmergencyMode}
            variant="secondary"
            style={styles.button}
          />
        )}

        {isCrisisAccessible() && (
          <Button
            title="Go to Crisis Plan"
            onPress={onNavigateToCrisis}
            variant="primary"
            style={styles.button}
          />
        )}
      </View>

      {/* Performance Monitoring */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Monitoring</Text>
        <Text>Fast Auth Check: {userStoreUtils.isAuthenticated() ? 'Authenticated' : 'Not Authenticated'}</Text>
        <Text>Crisis Accessible: {userStoreUtils.isCrisisAccessible() ? 'Yes' : 'No'}</Text>
        <Text>Last Auth Time: {userStoreUtils.getLastAuthTime()}ms</Text>
        <Text>Average Response: {Math.round(userStoreUtils.getAverageResponseTime())}ms</Text>
        <Text>Session Time Left: {formatTimeRemaining(userStoreUtils.getSessionTimeRemaining())}</Text>

        {userStoreUtils.getAverageResponseTime() <= 200 && (
          <Text style={styles.successText}>
            ✅ Performance meets crisis response requirements
          </Text>
        )}
      </View>

      {/* Store Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Store Features</Text>
        <Text>• HIPAA-compliant 15-minute session timeout</Text>
        <Text>• Zero-knowledge client-side encryption</Text>
        <Text>• Crisis response &lt;200ms performance</Text>
        <Text>• Automatic session refresh and validation</Text>
        <Text>• Emergency authentication bypass</Text>
        <Text>• Comprehensive audit logging</Text>
        <Text>• Background session monitoring</Text>
        <Text>• Secure session persistence</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  button: {
    marginVertical: 5,
  },
  emergencyButton: {
    backgroundColor: '#ff4444',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontWeight: '500',
  },
  warningText: {
    color: '#ff9800',
    fontWeight: '500',
    marginTop: 5,
  },
  successText: {
    color: '#4caf50',
    fontWeight: '500',
    marginTop: 5,
  },
});

export default UserStoreIntegrationExample;