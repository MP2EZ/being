/**
 * Migration Screen Component for Being. MBCT App
 *
 * Provides a user-friendly interface for storage migration with:
 * - Real-time progress tracking
 * - Critical data safety indicators
 * - Emergency rollback capabilities
 * - Clear error messaging and recovery options
 *
 * CLINICAL SAFETY FEATURES:
 * - Prominent crisis support access during migration
 * - Clear indication of assessment data security status
 * - Emergency contact preservation guarantees
 * - One-tap rollback for data recovery
 */

import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMigration } from '../../hooks/useMigration';
import { useTheme } from '../../context/theme/ThemeContext';

interface MigrationScreenProps {
  onComplete?: () => void;
  onError?: (error: string) => void;
  allowSkip?: boolean;
  showDetailedProgress?: boolean;
}

export function MigrationScreen({
  onComplete,
  onError,
  allowSkip = false,
  showDetailedProgress = true
}: MigrationScreenProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const { state, actions } = useMigration({
    autoCheck: true,
    autoMigrate: false,
    showDetailedProgress,
    retryAttempts: 3
  });

  // Animation refs
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  /**
   * Animate progress bar
   */
  useEffect(() => {
    if (state.progress) {
      Animated.timing(progressAnim, {
        toValue: state.progress.overallProgress / 100,
        duration: 500,
        useNativeDriver: false
      }).start();
    }
  }, [state.progress?.overallProgress, progressAnim]);

  /**
   * Pulse animation for critical status indicators
   */
  useEffect(() => {
    if (state.isInProgress || state.hasError) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true
          })
        ])
      );
      pulseAnimation.start();

      return () => pulseAnimation.stop();
    }
  }, [state.isInProgress, state.hasError, pulseAnim]);

  /**
   * Handle completion callback
   */
  useEffect(() => {
    if (state.isComplete && onComplete) {
      onComplete();
    }
  }, [state.isComplete, onComplete]);

  /**
   * Handle error callback
   */
  useEffect(() => {
    if (state.hasError && state.errors.length > 0 && onError) {
      onError(state.errors.join('; '));
    }
  }, [state.hasError, state.errors, onError]);

  /**
   * Start migration with confirmation
   */
  const handleStartMigration = useCallback(() => {
    const criticalCount = state.status?.criticalDataAtRisk.length || 0;

    if (criticalCount > 0) {
      Alert.alert(
        'Secure Your Data',
        `${criticalCount} critical data items need to be migrated for enhanced security. This includes your assessment results and safety information.\n\nThis process is safe and includes automatic backup.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Migration',
            style: 'default',
            onPress: actions.startMigration
          }
        ]
      );
    } else {
      actions.startMigration();
    }
  }, [state.status?.criticalDataAtRisk.length, actions.startMigration]);

  /**
   * Handle emergency rollback
   */
  const handleEmergencyRollback = useCallback(() => {
    Alert.alert(
      'Emergency Rollback',
      'This will restore your data to its previous state and undo the migration. Your data will be preserved, but security improvements will be lost.\n\nAre you sure you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rollback',
          style: 'destructive',
          onPress: actions.emergencyRollback
        }
      ]
    );
  }, [actions.emergencyRollback]);

  /**
   * Handle skip migration
   */
  const handleSkip = useCallback(() => {
    if (!allowSkip) return;

    Alert.alert(
      'Skip Migration',
      'Skipping migration means your data will remain less secure. You can migrate later from Settings.\n\nAre you sure you want to skip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'default',
          onPress: onComplete
        }
      ]
    );
  }, [allowSkip, onComplete]);

  /**
   * Render critical data status indicators
   */
  const renderCriticalDataStatus = () => {
    const { criticalDataStatus } = state;

    return (
      <View style={styles.criticalStatusContainer}>
        <Text style={styles.criticalStatusTitle}>Data Security Status</Text>

        <View style={styles.statusGrid}>
          <StatusIndicator
            label="Assessment Data"
            isSecure={criticalDataStatus.assessmentsSecure}
            description="PHQ-9 & GAD-7 scores"
          />
          <StatusIndicator
            label="Crisis Information"
            isSecure={criticalDataStatus.crisisDataSecure}
            description="Safety plans & contacts"
          />
          <StatusIndicator
            label="Personal Data"
            isSecure={criticalDataStatus.userDataSecure}
            description="Check-ins & preferences"
          />
        </View>

        {!criticalDataStatus.overallSecure && (
          <View style={styles.securityWarning}>
            <Text style={styles.securityWarningText}>
              🔒 Your data needs to be migrated for enhanced security
            </Text>
          </View>
        )}
      </View>
    );
  };

  /**
   * Render progress section
   */
  const renderProgress = () => {
    if (!state.isInProgress && !state.progress) return null;

    const progress = state.progress?.overallProgress || 0;

    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>{state.currentStage}</Text>
        <Text style={styles.progressMessage}>{state.statusMessage}</Text>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>

        {state.estimatedTimeRemaining && (
          <Text style={styles.timeRemaining}>{state.estimatedTimeRemaining}</Text>
        )}

        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={styles.activityIndicator}
        />
      </View>
    );
  };

  /**
   * Render action buttons
   */
  const renderActions = () => {
    if (state.isInProgress) {
      return (
        <View style={styles.actionsContainer}>
          <Text style={styles.inProgressNote}>
            Please wait while your data is being migrated...
          </Text>

          {state.canRollback && (
            <TouchableOpacity
              style={[styles.button, styles.emergencyButton]}
              onPress={handleEmergencyRollback}
            >
              <Text style={styles.emergencyButtonText}>Emergency Rollback</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (state.isComplete) {
      return (
        <View style={styles.actionsContainer}>
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>✅ Migration Complete!</Text>
            <Text style={styles.successMessage}>
              Your data has been successfully migrated and secured.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={onComplete}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (state.hasError) {
      return (
        <View style={styles.actionsContainer}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Migration Error</Text>
            {state.errors.map((error, index) => (
              <Text key={index} style={styles.errorText}>• {error}</Text>
            ))}
          </View>

          <View style={styles.errorActions}>
            {state.canRetry && (
              <TouchableOpacity
                style={[styles.button, styles.retryButton]}
                onPress={actions.retryMigration}
              >
                <Text style={styles.retryButtonText}>Retry Migration</Text>
              </TouchableOpacity>
            )}

            {state.canRollback && (
              <TouchableOpacity
                style={[styles.button, styles.emergencyButton]}
                onPress={handleEmergencyRollback}
              >
                <Text style={styles.emergencyButtonText}>Emergency Rollback</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={actions.clearErrors}
            >
              <Text style={styles.secondaryButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (state.isRequired) {
      return (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleStartMigration}
          >
            <Text style={styles.primaryButtonText}>Start Migration</Text>
          </TouchableOpacity>

          {allowSkip && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleSkip}
            >
              <Text style={styles.secondaryButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.actionsContainer}>
        <View style={styles.successContainer}>
          <Text style={styles.successTitle}>✅ All Set!</Text>
          <Text style={styles.successMessage}>
            Your data is already secure and up to date.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={onComplete}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  };

  /**
   * Render warnings section
   */
  const renderWarnings = () => {
    if (state.warnings.length === 0) return null;

    return (
      <View style={styles.warningsContainer}>
        <Text style={styles.warningsTitle}>Important Information</Text>
        {state.warnings.map((warning, index) => (
          <Text key={index} style={styles.warningText}>• {warning}</Text>
        ))}

        <TouchableOpacity
          style={styles.dismissWarningsButton}
          onPress={actions.dismissWarnings}
        >
          <Text style={styles.dismissWarningsText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    );
  };

  /**
   * Crisis support always available
   */
  const renderCrisisSupport = () => (
    <View style={styles.crisisSupportContainer}>
      <TouchableOpacity
        style={styles.crisisButton}
        onPress={() => {
          // Navigate to crisis support - this should always work
          Alert.alert('Crisis Support', 'Crisis support: 988\nEmergency: 911');
        }}
      >
        <Text style={styles.crisisButtonText}>🆘 Crisis Support Always Available</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Data Migration</Text>
          <Text style={styles.subtitle}>
            Securing your mental health data with enhanced encryption
          </Text>
        </View>

        {renderCriticalDataStatus()}
        {renderProgress()}
        {renderWarnings()}
        {renderActions()}
        {renderCrisisSupport()}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Status indicator component
 */
interface StatusIndicatorProps {
  label: string;
  isSecure: boolean;
  description: string;
}

function StatusIndicator({ label, isSecure, description }: StatusIndicatorProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.statusIndicator}>
      <View style={styles.statusIconContainer}>
        <Text style={[styles.statusIcon, isSecure ? styles.secureIcon : styles.insecureIcon]}>
          {isSecure ? '🔒' : '🔓'}
        </Text>
      </View>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusDescription}>{description}</Text>
    </View>
  );
}

/**
 * Create styles
 */
function createStyles(theme: any) {
  const { width } = Dimensions.get('window');

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    scrollView: {
      flex: 1
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 40
    },
    header: {
      alignItems: 'center',
      marginBottom: 30
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22
    },
    criticalStatusContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    criticalStatusTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
      textAlign: 'center'
    },
    statusGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap'
    },
    statusIndicator: {
      alignItems: 'center',
      width: (width - 80) / 3,
      marginBottom: 16
    },
    statusIconContainer: {
      marginBottom: 8
    },
    statusIcon: {
      fontSize: 24
    },
    secureIcon: {
      // Green tint for secure items
    },
    insecureIcon: {
      // Orange tint for insecure items
    },
    statusLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 4
    },
    statusDescription: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      textAlign: 'center'
    },
    securityWarning: {
      backgroundColor: theme.colors.warning + '20',
      borderRadius: 8,
      padding: 12,
      marginTop: 8
    },
    securityWarningText: {
      fontSize: 14,
      color: theme.colors.warning,
      textAlign: 'center',
      fontWeight: '500'
    },
    progressContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
      alignItems: 'center'
    },
    progressTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center'
    },
    progressMessage: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20
    },
    progressBarContainer: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 12
    },
    progressBarBackground: {
      width: '100%',
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 8
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 4
    },
    progressText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text
    },
    timeRemaining: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 16
    },
    activityIndicator: {
      marginTop: 8
    },
    actionsContainer: {
      marginBottom: 20
    },
    inProgressNote: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
      fontStyle: 'italic'
    },
    button: {
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      marginBottom: 12,
      alignItems: 'center'
    },
    primaryButton: {
      backgroundColor: theme.colors.primary
    },
    primaryButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 16,
      fontWeight: '600'
    },
    secondaryButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    secondaryButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '500'
    },
    retryButton: {
      backgroundColor: theme.colors.warning
    },
    retryButtonText: {
      color: theme.colors.onWarning,
      fontSize: 16,
      fontWeight: '600'
    },
    emergencyButton: {
      backgroundColor: theme.colors.error
    },
    emergencyButtonText: {
      color: theme.colors.onError,
      fontSize: 16,
      fontWeight: '600'
    },
    successContainer: {
      alignItems: 'center',
      marginBottom: 20
    },
    successTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.success,
      marginBottom: 8
    },
    successMessage: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center'
    },
    errorContainer: {
      backgroundColor: theme.colors.error + '10',
      borderRadius: 8,
      padding: 16,
      marginBottom: 16
    },
    errorTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.error,
      marginBottom: 8
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.error,
      marginBottom: 4
    },
    errorActions: {
      // Container for error action buttons
    },
    warningsContainer: {
      backgroundColor: theme.colors.warning + '10',
      borderRadius: 8,
      padding: 16,
      marginBottom: 20
    },
    warningsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.warning,
      marginBottom: 8
    },
    warningText: {
      fontSize: 14,
      color: theme.colors.warning,
      marginBottom: 4
    },
    dismissWarningsButton: {
      alignSelf: 'flex-end',
      marginTop: 8
    },
    dismissWarningsText: {
      fontSize: 12,
      color: theme.colors.warning,
      textDecorationLine: 'underline'
    },
    crisisSupportContainer: {
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border
    },
    crisisButton: {
      backgroundColor: theme.colors.crisis || theme.colors.error,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center'
    },
    crisisButtonText: {
      color: theme.colors.onError,
      fontSize: 14,
      fontWeight: '600'
    }
  });
}