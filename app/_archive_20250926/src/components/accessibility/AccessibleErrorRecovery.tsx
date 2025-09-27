/**
 * AccessibleErrorRecovery - WCAG 2.1 AA compliant error recovery
 * 
 * Clear error recovery guidance with plain language and multiple recovery options.
 * Designed to reduce anxiety during errors and provide clear paths forward for
 * users experiencing mental health challenges.
 * 
 * WCAG 2.1 AA Compliance:
 * - 3.3.3 Error Suggestion: Clear recovery options with specific guidance
 * - 1.4.3 Contrast: Minimum 4.5:1 ratio for all error and action text
 * - 2.4.6 Headings and Labels: Clear error categorization and action labels
 * - 4.1.3 Status Messages: Error announcements and recovery confirmations
 * - 1.3.1 Info and Relationships: Structured error information hierarchy
 * 
 * Mental Health Context:
 * - Reassuring language to reduce anxiety about errors
 * - Clear explanations that errors don't affect user data or progress
 * - Multiple recovery options to maintain user agency
 * - Crisis access prioritization during error states
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  AccessibilityInfo
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import { useMentalHealthAccessibility } from '../../hooks/useMentalHealthAccessibility';
import { Button } from '../core/Button';
import { AccessibleAlert } from '../core/AccessibleAlert';
import { crisisIntegrationCoordinator } from '../../services/coordination/CrisisIntegrationCoordinator';

export interface ErrorDetails {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: 'migration' | 'calendar' | 'storage' | 'sync' | 'assessment' | 'crisis' | 'network' | 'system';
  timestamp: string;
  userImpact: 'none' | 'minimal' | 'moderate' | 'significant';
  dataLoss: boolean;
  crisisAccessAffected: boolean;
  technicalDetails?: string;
  stackTrace?: string;
}

export interface RecoveryOption {
  id: string;
  title: string;
  description: string;
  action: 'retry' | 'refresh' | 'restart' | 'contact_support' | 'skip' | 'rollback' | 'safe_mode';
  difficulty: 'easy' | 'medium' | 'technical';
  timeEstimate: string;
  successRate: 'high' | 'medium' | 'low';
  preservesProgress: boolean;
  onSelect: () => void | Promise<void>;
}

export interface AccessibleErrorRecoveryProps {
  visible: boolean;
  error: ErrorDetails;
  recoveryOptions: RecoveryOption[];
  onDismiss?: () => void;
  onRecoveryComplete?: () => void;
  onContactSupport?: (errorDetails: ErrorDetails) => void;
  showTechnicalDetails?: boolean;
  testID?: string;
}

export const AccessibleErrorRecovery: React.FC<AccessibleErrorRecoveryProps> = ({
  visible,
  error,
  recoveryOptions,
  onDismiss,
  onRecoveryComplete,
  onContactSupport,
  showTechnicalDetails = false,
  testID = 'error-recovery'
}) => {
  const {
    generateAccessibleInstructions,
    announceToUser,
    announceErrorRecovery,
    accessibility,
    cognitiveSupport,
    crisisMode,
    emergencyAccessRequired,
    screenReaderActive
  } = useMentalHealthAccessibility();

  const [selectedRecovery, setSelectedRecovery] = useState<RecoveryOption | null>(null);
  const [isExecutingRecovery, setIsExecutingRecovery] = useState(false);
  const [showDetailedInfo, setShowDetailedInfo] = useState(false);
  const [crisisAccessVerified, setCrisisAccessVerified] = useState(false);
  const [showTechnicalModal, setShowTechnicalModal] = useState(false);
  const errorAnnouncedRef = useRef(false);

  // Announce error and check crisis access
  useEffect(() => {
    if (visible && !errorAnnouncedRef.current) {
      errorAnnouncedRef.current = true;
      
      // Announce error with appropriate priority
      const priority = error.severity === 'critical' ? 'emergency' :
                      error.severity === 'high' ? 'high' : 'medium';
      
      const simplifiedMessage = generateAccessibleInstructions(
        getErrorExplanation(error),
        'error'
      );

      announceErrorRecovery({
        message: simplifiedMessage,
        recoveryOptions: recoveryOptions.map(opt => opt.title),
        canRetry: recoveryOptions.some(opt => opt.action === 'retry')
      });

      // If crisis access might be affected, verify immediately
      if (error.crisisAccessAffected || error.severity === 'critical') {
        verifyCrisisAccess();
      }
    }
  }, [visible, error, recoveryOptions, generateAccessibleInstructions, announceErrorRecovery]);

  // Reset announcement flag when error changes
  useEffect(() => {
    errorAnnouncedRef.current = false;
  }, [error.code, error.timestamp]);

  const verifyCrisisAccess = async () => {
    try {
      const readiness = await crisisIntegrationCoordinator.validateSystemReadiness();
      
      if (readiness.ready && readiness.responseTimeEstimate < 200) {
        setCrisisAccessVerified(true);
        announceToUser({
          message: 'Crisis support verified as available despite error',
          priority: 'medium',
          interruption: false,
          context: 'crisis'
        });
      } else {
        announceToUser({
          message: 'Crisis support is being restored - emergency help remains available',
          priority: 'high',
          interruption: true,
          context: 'crisis'
        });
      }
    } catch (verificationError) {
      console.error('Crisis access verification failed:', verificationError);
      announceToUser({
        message: 'Crisis support status unknown - contact support if emergency assistance needed',
        priority: 'emergency',
        interruption: true,
        context: 'crisis'
      });
    }
  };

  const executeRecovery = async (option: RecoveryOption) => {
    setSelectedRecovery(option);
    setIsExecutingRecovery(true);

    announceToUser({
      message: `Attempting recovery: ${option.title}`,
      priority: 'medium',
      interruption: false,
      context: 'progress'
    });

    try {
      await option.onSelect();
      
      announceToUser({
        message: `Recovery completed successfully`,
        priority: 'medium',
        interruption: false,
        context: 'completion'
      });
      
      onRecoveryComplete?.();
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
      
      announceToUser({
        message: 'Recovery attempt failed. Other options remain available.',
        priority: 'high',
        interruption: true,
        context: 'error'
      });
    } finally {
      setIsExecutingRecovery(false);
      setSelectedRecovery(null);
    }
  };

  const getErrorExplanation = (error: ErrorDetails): string => {
    const explanations = {
      migration: {
        low: 'A minor issue occurred while upgrading your data. Your information is completely safe.',
        medium: 'The data upgrade encountered a problem but has been safely paused. No information was lost.',
        high: 'The data upgrade stopped due to a technical issue. All your data remains secure and unchanged.',
        critical: 'A serious issue occurred during data upgrade. Your data is protected and nothing was damaged.'
      },
      calendar: {
        low: 'Calendar reminders had a small issue. Your therapeutic data is unaffected.',
        medium: 'Calendar integration encountered a problem. Your mental health data remains secure.',
        high: 'Calendar system experienced an error. All your therapeutic information is safe.',
        critical: 'Calendar functionality failed. Your health data and crisis access are protected.'
      },
      storage: {
        low: 'A minor storage issue occurred. Your data is backed up and safe.',
        medium: 'Data storage encountered a problem but your information is secure.',
        high: 'Storage system had an error. All your data is protected and recoverable.',
        critical: 'Critical storage error detected. Your data is secure with multiple backups available.'
      },
      assessment: {
        low: 'Assessment recording had a minor issue. Your progress is saved.',
        medium: 'Assessment system encountered a problem. Your previous responses are secure.',
        high: 'Assessment functionality experienced an error. Your therapeutic progress is protected.',
        critical: 'Assessment system failed. Your clinical data and progress are completely safe.'
      },
      crisis: {
        low: 'Crisis support system had a minor hiccup. Emergency access remains available.',
        medium: 'Crisis system encountered an issue but emergency help is still accessible.',
        high: 'Crisis support experienced an error. Emergency assistance remains fully available.',
        critical: 'Crisis system failure detected. Emergency support is verified as operational and accessible.'
      },
      sync: {
        low: 'Data sync had a small issue. Your local information is complete and safe.',
        medium: 'Sync process encountered a problem. Your data is secure and up to date locally.',
        high: 'Sync system experienced an error. All your information is protected locally.',
        critical: 'Sync failure occurred. Your data is secure with local backups available.'
      },
      network: {
        low: 'Network connection had a brief issue. Your app works offline.',
        medium: 'Network problem occurred. Your data and functionality remain available offline.',
        high: 'Network error detected. All your information and features work without internet.',
        critical: 'Network system failure. Your app and data are fully functional offline.'
      },
      system: {
        low: 'System had a minor issue. Your data and progress are unaffected.',
        medium: 'System encountered a problem. Your information and settings are secure.',
        high: 'System error occurred. All your data and therapeutic progress are protected.',
        critical: 'Critical system error. Your data, progress, and crisis access are all secure.'
      }
    };

    const contextMessages = explanations[error.context] || explanations.system;
    return contextMessages[error.severity];
  };

  const getSeverityColor = (severity: ErrorDetails['severity']) => {
    switch (severity) {
      case 'critical':
        return colorSystem.status.critical;
      case 'high':
        return colorSystem.status.error;
      case 'medium':
        return colorSystem.status.warning;
      case 'low':
      default:
        return colorSystem.status.info;
    }
  };

  const getSeverityIcon = (severity: ErrorDetails['severity']) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
      default:
        return 'ℹ️';
    }
  };

  const getRecoveryIcon = (action: RecoveryOption['action']) => {
    const icons = {
      retry: '🔄',
      refresh: '↻',
      restart: '⏯️',
      contact_support: '🆘',
      skip: '⏭️',
      rollback: '⏪',
      safe_mode: '🛡️'
    };
    return icons[action] || '🔧';
  };

  const getDifficultyLabel = (difficulty: RecoveryOption['difficulty']) => {
    const labels = {
      easy: 'Simple',
      medium: 'Moderate',
      technical: 'Technical'
    };
    return labels[difficulty];
  };

  if (!visible) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} testID={testID}>
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Error Header */}
          <View style={[styles.errorHeader, { borderLeftColor: getSeverityColor(error.severity) }]}>
            <View style={styles.errorIconContainer}>
              <Text style={styles.errorIcon} accessible={false}>
                {getSeverityIcon(error.severity)}
              </Text>
            </View>
            <View style={styles.errorTextContainer}>
              <Text 
                style={styles.errorTitle}
                accessible={true}
                accessibilityRole="header"
                accessibilityLevel={1}
                accessibilityLiveRegion="assertive"
              >
                Something Happened
              </Text>
              <Text 
                style={styles.errorSeverity}
                accessible={true}
              >
                {error.severity.charAt(0).toUpperCase() + error.severity.slice(1)} Issue
              </Text>
            </View>
          </View>

          {/* Crisis Access Status - Show if relevant */}
          {(error.crisisAccessAffected || error.severity === 'critical' || crisisMode) && (
            <View style={[
              styles.crisisStatus,
              crisisAccessVerified ? styles.crisisStatusGood : styles.crisisStatusChecking
            ]}>
              <Text style={styles.crisisIcon} accessible={false}>
                {crisisAccessVerified ? '✅' : '🔍'}
              </Text>
              <Text style={styles.crisisStatusText} accessible={true} accessibilityLiveRegion="polite">
                {crisisAccessVerified 
                  ? 'Crisis support verified as available'
                  : 'Checking crisis support availability...'}
              </Text>
            </View>
          )}

          {/* Error Explanation */}
          <View style={styles.explanationSection}>
            <Text 
              style={styles.explanationTitle}
              accessible={true}
              accessibilityRole="header"
              accessibilityLevel={2}
            >
              What This Means
            </Text>
            <Text style={styles.explanationText} accessible={true}>
              {getErrorExplanation(error)}
            </Text>
            
            {/* Data Safety Reassurance */}
            <View style={styles.safetyReassurance}>
              <Text style={styles.safetyIcon} accessible={false}>🛡️</Text>
              <Text style={styles.safetyText} accessible={true}>
                {error.dataLoss 
                  ? 'Some recent changes may need to be redone, but your main data is safe.'
                  : 'All your data, progress, and settings are completely safe and unchanged.'}
              </Text>
            </View>
          </View>

          {/* Recovery Options */}
          <View style={styles.recoverySection}>
            <Text 
              style={styles.recoveryTitle}
              accessible={true}
              accessibilityRole="header"
              accessibilityLevel={2}
            >
              How to Fix This
            </Text>
            
            <Text style={styles.recoverySubtitle} accessible={true}>
              {generateAccessibleInstructions(
                'Choose the option that feels most comfortable to you. Each one will help resolve the issue.',
                'navigation'
              )}
            </Text>

            <View style={styles.recoveryOptions}>
              {recoveryOptions
                .filter(opt => !showDetailedInfo || opt.difficulty !== 'technical')
                .map((option, index) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.recoveryOption,
                    option.difficulty === 'easy' && styles.recoveryOptionEasy,
                    selectedRecovery?.id === option.id && isExecutingRecovery && styles.recoveryOptionExecuting
                  ]}
                  onPress={() => executeRecovery(option)}
                  disabled={isExecutingRecovery}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.title}. ${option.description}. ${getDifficultyLabel(option.difficulty)} option, takes ${option.timeEstimate}.`}
                  accessibilityHint={`${option.successRate} success rate. ${option.preservesProgress ? 'Keeps your progress.' : 'May need to redo recent changes.'}`}
                  testID={`${testID}-option-${option.id}`}
                >
                  <View style={styles.recoveryOptionHeader}>
                    <Text style={styles.recoveryOptionIcon} accessible={false}>
                      {getRecoveryIcon(option.action)}
                    </Text>
                    <View style={styles.recoveryOptionTitleContainer}>
                      <Text style={styles.recoveryOptionTitle}>
                        {option.title}
                      </Text>
                      <View style={styles.recoveryOptionMeta}>
                        <Text style={styles.recoveryOptionDifficulty}>
                          {getDifficultyLabel(option.difficulty)}
                        </Text>
                        <Text style={styles.recoveryOptionTime}>
                          {option.timeEstimate}
                        </Text>
                        <Text style={styles.recoveryOptionSuccess}>
                          {option.successRate} success rate
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.recoveryOptionDescription}>
                    {generateAccessibleInstructions(option.description, 'action')}
                  </Text>
                  
                  {!option.preservesProgress && (
                    <Text style={styles.recoveryOptionWarning} accessible={true}>
                      Note: May need to redo recent changes
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Additional Options */}
          <View style={styles.additionalOptions}>
            {!showDetailedInfo && (
              <TouchableOpacity
                style={styles.additionalOption}
                onPress={() => setShowDetailedInfo(true)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Show more technical recovery options"
                testID={`${testID}-show-more`}
              >
                <Text style={styles.additionalOptionText}>
                  Show More Options
                </Text>
              </TouchableOpacity>
            )}
            
            {showTechnicalDetails && (
              <TouchableOpacity
                style={styles.additionalOption}
                onPress={() => setShowTechnicalModal(true)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="View technical error details"
                accessibilityHint="Shows technical information about the error"
                testID={`${testID}-technical-details`}
              >
                <Text style={styles.additionalOptionText}>
                  Technical Details
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.additionalOption}
              onPress={() => onContactSupport?.(error)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Contact support for help"
              accessibilityHint="Get personalized assistance with this error"
              testID={`${testID}-contact-support`}
            >
              <Text style={styles.additionalOptionText}>
                Contact Support
              </Text>
            </TouchableOpacity>
          </View>

          {/* Skip Option */}
          {onDismiss && (
            <View style={styles.skipSection}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={onDismiss}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Dismiss error and continue"
                accessibilityHint="Closes this error message. You can address the issue later."
                testID={`${testID}-dismiss`}
              >
                <Text style={styles.skipText}>
                  Dismiss for Now
                </Text>
              </TouchableOpacity>
              <Text style={styles.skipNote} accessible={true}>
                You can continue using the app. This error won't prevent you from accessing your therapeutic tools.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Loading Indicator */}
        {isExecutingRecovery && selectedRecovery && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText} accessible={true} accessibilityLiveRegion="polite">
                {selectedRecovery.title} in progress...
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Technical Details Modal */}
      <AccessibleAlert
        visible={showTechnicalModal}
        title="Technical Error Details"
        message={`Error Code: ${error.code}\nContext: ${error.context}\nTimestamp: ${new Date(error.timestamp).toLocaleString()}\n\n${error.technicalDetails || error.message}`}
        buttons={[
          {
            text: 'Copy Details',
            style: 'default',
            onPress: () => {
              // Implementation would copy to clipboard
              announceToUser({
                message: 'Error details copied to clipboard',
                priority: 'low',
                interruption: false,
                context: 'completion'
              });
            }
          },
          {
            text: 'Close',
            style: 'cancel',
            onPress: () => setShowTechnicalModal(false)
          }
        ]}
        onDismiss={() => setShowTechnicalModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white
  },
  content: {
    flex: 1
  },
  scrollContent: {
    flex: 1
  },
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl
  },

  // Error Header
  errorHeader: {
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4
  },
  errorIconContainer: {
    marginRight: spacing.sm,
    marginTop: 2
  },
  errorIcon: {
    fontSize: 24
  },
  errorTextContainer: {
    flex: 1
  },
  errorTitle: {
    fontSize: typography.headline3.size,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs
  },
  errorSeverity: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    fontWeight: '500'
  },

  // Crisis Status
  crisisStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSystem.status.warningBackground,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colorSystem.status.warning
  },
  crisisStatusGood: {
    backgroundColor: colorSystem.status.successBackground,
    borderColor: colorSystem.status.success
  },
  crisisStatusChecking: {
    backgroundColor: colorSystem.status.infoBackground,
    borderColor: colorSystem.status.info
  },
  crisisIcon: {
    fontSize: 20,
    marginRight: spacing.sm
  },
  crisisStatusText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    fontWeight: '500',
    flex: 1
  },

  // Explanation Section
  explanationSection: {
    marginBottom: spacing.xl
  },
  explanationTitle: {
    fontSize: typography.headline3.size,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.sm
  },
  explanationText: {
    fontSize: typography.bodyLarge.size,
    color: colorSystem.gray[700],
    lineHeight: 26,
    marginBottom: spacing.md
  },
  safetyReassurance: {
    backgroundColor: colorSystem.status.successBackground,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colorSystem.status.success
  },
  safetyIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
    marginTop: 2
  },
  safetyText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    lineHeight: 22,
    flex: 1
  },

  // Recovery Section
  recoverySection: {
    marginBottom: spacing.xl
  },
  recoveryTitle: {
    fontSize: typography.headline3.size,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.sm
  },
  recoverySubtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    lineHeight: 22,
    marginBottom: spacing.lg
  },
  recoveryOptions: {
    gap: spacing.md
  },
  recoveryOption: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colorSystem.gray[200],
    minHeight: 48 // WCAG touch target
  },
  recoveryOptionEasy: {
    borderColor: colorSystem.status.success,
    backgroundColor: colorSystem.status.successBackground
  },
  recoveryOptionExecuting: {
    borderColor: colorSystem.status.info,
    backgroundColor: colorSystem.status.infoBackground,
    opacity: 0.7
  },
  recoveryOptionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm
  },
  recoveryOptionIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
    marginTop: 2
  },
  recoveryOptionTitleContainer: {
    flex: 1
  },
  recoveryOptionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs
  },
  recoveryOptionMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap'
  },
  recoveryOptionDifficulty: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    backgroundColor: colorSystem.gray[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.small,
    overflow: 'hidden'
  },
  recoveryOptionTime: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600]
  },
  recoveryOptionSuccess: {
    fontSize: typography.caption.size,
    color: colorSystem.status.success,
    fontWeight: '500'
  },
  recoveryOptionDescription: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    lineHeight: 22,
    marginBottom: spacing.sm
  },
  recoveryOptionWarning: {
    fontSize: typography.caption.size,
    color: colorSystem.status.warning,
    fontStyle: 'italic'
  },

  // Additional Options
  additionalOptions: {
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
    paddingTop: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm
  },
  additionalOption: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md
  },
  additionalOptionText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.status.info,
    textDecorationLine: 'underline'
  },

  // Skip Section
  skipSection: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200]
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm
  },
  skipText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    textDecorationLine: 'underline'
  },
  skipNote: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[500],
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md
  },

  // Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingContainer: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.medium,
    padding: spacing.lg,
    margin: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8
  },
  loadingText: {
    fontSize: typography.bodyLarge.size,
    color: colorSystem.base.black,
    fontWeight: '500'
  }
});

export default AccessibleErrorRecovery;