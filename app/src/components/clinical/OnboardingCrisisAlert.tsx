/**
 * Onboarding Crisis Alert - Crisis intervention UI for therapeutic onboarding
 *
 * CRITICAL SAFETY FEATURES:
 * - <200ms response time for crisis intervention UI
 * - Accessible crisis interface for stressed users
 * - Progress preservation during crisis events
 * - First-time user crisis education
 * - Seamless onboarding continuation after intervention
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  AccessibilityInfo,
  Vibration,
  Platform,
  Animated,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  Card,
  Typography,
  TherapeuticHeading,
  CrisisButton,
  Screen,
  LoadingScreen
} from '../core';

import { colorSystem, spacing } from '../../constants/colors';
import { useCrisisStore } from '../../store/crisisStore';
import { useOnboardingStore, OnboardingStep } from '../../store/onboardingStore';
import { onboardingCrisisDetectionService, OnboardingCrisisEvent } from '../../services/OnboardingCrisisDetectionService';
import { OfflineCrisisManager } from '../../services/OfflineCrisisManager';

interface OnboardingCrisisAlertProps {
  crisisEvent: OnboardingCrisisEvent;
  onResolved: () => void;
  onContinueOnboarding: () => void;
  onExitOnboarding: () => void;
  isVisible: boolean;
  theme: 'morning' | 'midday' | 'evening';
}

interface CrisisResource {
  id: string;
  name: string;
  action: 'call' | 'text' | 'navigate';
  value: string;
  description: string;
  available: string;
  urgency: 'immediate' | 'urgent' | 'support';
}

export const OnboardingCrisisAlert: React.FC<OnboardingCrisisAlertProps> = ({
  crisisEvent,
  onResolved,
  onContinueOnboarding,
  onExitOnboarding,
  isVisible,
  theme
}) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [showEducation, setShowEducation] = useState(false);
  const [crisisResources, setCrisisResources] = useState<CrisisResource[]>([]);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Store access
  const { call988, call911, textCrisisLine } = useCrisisStore();
  const { pauseOnboarding, goToStep } = useOnboardingStore();

  const themeColors = colorSystem.themes[theme];
  const { width: screenWidth } = Dimensions.get('window');

  // Initialize component
  useEffect(() => {
    if (isVisible) {
      initializeCrisisAlert();
    }
  }, [isVisible]);

  // Check accessibility settings
  useEffect(() => {
    const checkAccessibility = async () => {
      try {
        const screenReader = await AccessibilityInfo.isScreenReaderEnabled();
        setIsScreenReaderEnabled(screenReader);
      } catch (error) {
        console.warn('Failed to check accessibility settings:', error);
      }
    };

    checkAccessibility();
  }, []);

  // Animate in when visible
  useEffect(() => {
    if (isVisible) {
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

      // Accessibility announcement
      const urgentMessage = crisisEvent.crisisResult.severity === 'critical'
        ? 'URGENT: Crisis support interface opened. Help is available.'
        : 'Crisis support interface opened. Support resources available.';

      AccessibilityInfo.announceForAccessibility(urgentMessage);

      // Haptic feedback for crisis alert
      if (Platform.OS === 'ios') {
        Vibration.vibrate([0, 250, 100, 250]);
      } else {
        Vibration.vibrate(500);
      }
    }
  }, [isVisible, fadeAnim, slideAnim, crisisEvent]);

  /**
   * Initialize crisis alert with resources
   */
  const initializeCrisisAlert = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load crisis resources
      const offlineResources = await OfflineCrisisManager.getOfflineCrisisResources();

      const resources: CrisisResource[] = [
        {
          id: '988',
          name: '988 Crisis Lifeline',
          action: 'call',
          value: '988',
          description: '24/7 crisis support and suicide prevention',
          available: '24/7',
          urgency: 'immediate'
        },
        {
          id: 'text',
          name: 'Crisis Text Line',
          action: 'text',
          value: '741741',
          description: 'Text HOME for 24/7 crisis support',
          available: '24/7',
          urgency: 'urgent'
        },
        {
          id: '911',
          name: 'Emergency Services',
          action: 'call',
          value: '911',
          description: 'Life-threatening emergencies',
          available: '24/7',
          urgency: 'immediate'
        }
      ];

      setCrisisResources(resources);
    } catch (error) {
      console.error('Failed to initialize crisis alert:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Execute crisis action with performance monitoring
   */
  const executeCrisisAction = useCallback(async (action: string, value?: string) => {
    const startTime = performance.now();
    setIsLoading(true);

    try {
      let success = false;

      switch (action) {
        case 'call988':
          success = await call988();
          break;
        case 'call911':
          success = await call911();
          break;
        case 'textCrisisLine':
          success = await textCrisisLine();
          break;
        case 'pauseOnboarding':
          await pauseOnboarding();
          success = true;
          break;
        default:
          console.warn(`Unknown crisis action: ${action}`);
      }

      // Record action in crisis event
      crisisEvent.interventionTaken.push(action);

      const responseTime = performance.now() - startTime;
      console.log(`✅ Crisis action ${action} executed in ${responseTime.toFixed(2)}ms`);

      // Accessibility announcement
      AccessibilityInfo.announceForAccessibility(
        success
          ? `${action} completed successfully`
          : `${action} encountered an issue`
      );

      return success;
    } catch (error) {
      console.error(`Crisis action ${action} failed:`, error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [call988, call911, textCrisisLine, pauseOnboarding, crisisEvent]);

  /**
   * Handle continuing onboarding after crisis intervention
   */
  const handleContinueOnboarding = useCallback(async () => {
    try {
      setIsLoading(true);

      // Mark crisis as addressed
      crisisEvent.userContinuedOnboarding = true;
      crisisEvent.onboardingResumed = true;

      // Clear current crisis
      onboardingCrisisDetectionService.clearCurrentCrisis();

      // Continue onboarding with crisis support context
      onContinueOnboarding();

      // Accessibility announcement
      AccessibilityInfo.announceForAccessibility('Continuing onboarding setup');

    } catch (error) {
      console.error('Failed to continue onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  }, [crisisEvent, onContinueOnboarding]);

  /**
   * Handle skipping to safety planning
   */
  const handleSkipToSafetyPlan = useCallback(async () => {
    try {
      setIsLoading(true);

      // Navigate to safety planning step
      await goToStep('safety_planning');

      // Mark as resolved
      crisisEvent.onboardingResumed = true;
      onResolved();

      // Accessibility announcement
      AccessibilityInfo.announceForAccessibility('Navigating to safety planning');

    } catch (error) {
      console.error('Failed to skip to safety plan:', error);
    } finally {
      setIsLoading(false);
    }
  }, [goToStep, crisisEvent, onResolved]);

  /**
   * Show crisis education for first-time users
   */
  const showCrisisEducation = useCallback(async () => {
    setShowEducation(true);

    // Accessibility announcement
    AccessibilityInfo.announceForAccessibility('Crisis education information displayed');
  }, []);

  /**
   * Get severity-specific styling
   */
  const getSeverityStyle = () => {
    switch (crisisEvent.crisisResult.severity) {
      case 'critical':
        return styles.criticalSeverity;
      case 'severe':
        return styles.severeSeverity;
      case 'moderate':
        return styles.moderateSeverity;
      default:
        return styles.moderateSeverity;
    }
  };

  /**
   * Get severity-specific message
   */
  const getSeverityMessage = () => {
    switch (crisisEvent.crisisResult.severity) {
      case 'critical':
        return {
          title: '🆘 Immediate Support Needed',
          message: 'Your responses indicate you may need immediate professional support. Crisis counselors are available 24/7.',
          urgency: 'URGENT'
        };
      case 'severe':
        return {
          title: '🔒 Support Available',
          message: 'We want to make sure you have the support and safety resources you need.',
          urgency: 'IMPORTANT'
        };
      case 'moderate':
        return {
          title: '🛡️ Support Resources',
          message: 'It sounds like you might benefit from some additional support resources. We\'re here to help.',
          urgency: 'SUPPORT'
        };
      default:
        return {
          title: '💚 Support Available',
          message: 'Support resources are available when you need them.',
          urgency: 'GENERAL'
        };
    }
  };

  if (isLoading) {
    return (
      <LoadingScreen
        message="Preparing support resources..."
        theme={theme}
      />
    );
  }

  if (!isVisible) {
    return null;
  }

  const severityInfo = getSeverityMessage();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Animated.View
        style={[
          styles.alertContainer,
          getSeverityStyle(),
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          accessible={true}
          accessibilityLabel="Crisis support options"
        >
          {/* Header */}
          <View style={styles.header}>
            <TherapeuticHeading
              variant="h2"
              style={[styles.title, { color: themeColors.text }]}
              accessible={true}
              accessibilityRole="header"
            >
              {severityInfo.title}
            </TherapeuticHeading>

            <Text
              style={[styles.urgencyBadge, getSeverityStyle()]}
              accessible={true}
              accessibilityLabel={`Urgency level: ${severityInfo.urgency}`}
            >
              {severityInfo.urgency}
            </Text>
          </View>

          {/* Message */}
          <Typography
            variant="body"
            style={[styles.message, { color: themeColors.text }]}
            accessible={true}
          >
            {severityInfo.message}
          </Typography>

          {/* Primary Crisis Actions */}
          <View style={styles.primaryActions}>
            {crisisEvent.crisisResult.severity === 'critical' ||
             crisisEvent.crisisResult.trigger === 'suicidal_ideation' ? (
              <>
                <Button
                  onPress={() => executeCrisisAction('call988')}
                  variant="primary"
                  style={[styles.primaryButton, styles.emergencyButton]}
                  disabled={isLoading}
                  accessible={true}
                  accessibilityLabel="Call 988 Crisis Lifeline immediately"
                  accessibilityHint="Double tap to call 988 for immediate crisis support"
                  testID="crisis-call-988-button"
                >
                  📞 Call 988 Now
                </Button>

                <Button
                  onPress={() => setShowResources(true)}
                  variant="secondary"
                  style={styles.secondaryButton}
                  disabled={isLoading}
                  accessible={true}
                  accessibilityLabel="View all crisis resources"
                >
                  🆘 All Crisis Resources
                </Button>
              </>
            ) : crisisEvent.crisisResult.severity === 'severe' ? (
              <>
                <Button
                  onPress={() => executeCrisisAction('call988')}
                  variant="primary"
                  style={styles.primaryButton}
                  disabled={isLoading}
                  accessible={true}
                  accessibilityLabel="Call 988 Crisis Lifeline"
                >
                  📞 Call 988
                </Button>

                <Button
                  onPress={handleSkipToSafetyPlan}
                  variant="secondary"
                  style={styles.secondaryButton}
                  disabled={isLoading}
                  accessible={true}
                  accessibilityLabel="Create safety plan"
                >
                  🔒 Create Safety Plan
                </Button>

                <Button
                  onPress={() => setShowResources(true)}
                  variant="outline"
                  style={styles.tertiaryButton}
                  disabled={isLoading}
                  accessible={true}
                  accessibilityLabel="View crisis resources"
                >
                  📋 Crisis Resources
                </Button>
              </>
            ) : (
              <>
                <Button
                  onPress={() => executeCrisisAction('textCrisisLine')}
                  variant="primary"
                  style={styles.primaryButton}
                  disabled={isLoading}
                  accessible={true}
                  accessibilityLabel="Contact Crisis Text Line"
                >
                  💬 Text Crisis Line
                </Button>

                <Button
                  onPress={handleSkipToSafetyPlan}
                  variant="secondary"
                  style={styles.secondaryButton}
                  disabled={isLoading}
                  accessible={true}
                  accessibilityLabel="Set up safety planning"
                >
                  🛡️ Safety Planning
                </Button>

                <Button
                  onPress={showCrisisEducation}
                  variant="outline"
                  style={styles.tertiaryButton}
                  disabled={isLoading}
                  accessible={true}
                  accessibilityLabel="Learn about crisis support"
                >
                  📚 Learn About Support
                </Button>
              </>
            )}
          </View>

          {/* Onboarding Options */}
          <Card style={[styles.onboardingCard, { backgroundColor: themeColors.surface }]}>
            <Typography
              variant="h3"
              style={[styles.sectionTitle, { color: themeColors.text }]}
            >
              Continue Your Setup
            </Typography>

            <Typography
              variant="body"
              style={[styles.sectionMessage, { color: themeColors.textSecondary }]}
            >
              Your progress has been saved. You can continue when you're ready.
            </Typography>

            <View style={styles.onboardingActions}>
              <Button
                onPress={handleContinueOnboarding}
                variant="primary"
                style={styles.continueButton}
                disabled={isLoading}
                accessible={true}
                accessibilityLabel="Continue onboarding setup"
              >
                Continue Setup
              </Button>

              <Button
                onPress={onExitOnboarding}
                variant="outline"
                style={styles.exitButton}
                disabled={isLoading}
                accessible={true}
                accessibilityLabel="Exit onboarding safely"
              >
                Exit Safely
              </Button>
            </View>
          </Card>

          {/* Resources Modal */}
          {showResources && (
            <Card style={[styles.resourcesCard, { backgroundColor: themeColors.surface }]}>
              <Typography
                variant="h3"
                style={[styles.sectionTitle, { color: themeColors.text }]}
              >
                🆘 Crisis Support Resources
              </Typography>

              {crisisResources.map((resource) => (
                <TouchableOpacity
                  key={resource.id}
                  style={[
                    styles.resourceItem,
                    resource.urgency === 'immediate' && styles.immediateResource
                  ]}
                  onPress={() => {
                    if (resource.action === 'call') {
                      if (resource.value === '988') {
                        executeCrisisAction('call988');
                      } else if (resource.value === '911') {
                        executeCrisisAction('call911');
                      }
                    } else if (resource.action === 'text') {
                      executeCrisisAction('textCrisisLine');
                    }
                  }}
                  accessible={true}
                  accessibilityLabel={`${resource.name}: ${resource.description}`}
                  accessibilityRole="button"
                >
                  <View style={styles.resourceInfo}>
                    <Typography
                      variant="h4"
                      style={[styles.resourceName, { color: themeColors.text }]}
                    >
                      {resource.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      style={[styles.resourceDescription, { color: themeColors.textSecondary }]}
                    >
                      {resource.description}
                    </Typography>
                    <Typography
                      variant="caption"
                      style={[styles.resourceAvailable, { color: themeColors.success }]}
                    >
                      Available: {resource.available}
                    </Typography>
                  </View>
                </TouchableOpacity>
              ))}

              <Button
                onPress={() => setShowResources(false)}
                variant="outline"
                style={styles.closeButton}
                accessible={true}
                accessibilityLabel="Close resources list"
              >
                Close
              </Button>
            </Card>
          )}

          {/* Education Modal */}
          {showEducation && (
            <Card style={[styles.educationCard, { backgroundColor: themeColors.surface }]}>
              <Typography
                variant="h3"
                style={[styles.sectionTitle, { color: themeColors.text }]}
              >
                📚 Understanding Crisis Support
              </Typography>

              <Typography
                variant="body"
                style={[styles.educationText, { color: themeColors.text }]}
              >
                Crisis support is available 24/7 when you need it most:
              </Typography>

              <View style={styles.educationList}>
                <Typography
                  variant="body"
                  style={[styles.educationItem, { color: themeColors.text }]}
                >
                  • 988 Crisis Lifeline connects you with trained counselors
                </Typography>
                <Typography
                  variant="body"
                  style={[styles.educationItem, { color: themeColors.text }]}
                >
                  • Crisis Text Line provides support via text messaging
                </Typography>
                <Typography
                  variant="body"
                  style={[styles.educationItem, { color: themeColors.text }]}
                >
                  • Safety plans help you prepare for difficult moments
                </Typography>
                <Typography
                  variant="body"
                  style={[styles.educationItem, { color: themeColors.text }]}
                >
                  • All services are free, confidential, and available 24/7
                </Typography>
              </View>

              <Button
                onPress={() => setShowEducation(false)}
                variant="primary"
                style={styles.continueButton}
                accessible={true}
                accessibilityLabel="Close education information"
              >
                Got It
              </Button>
            </Card>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  alertContainer: {
    width: '95%',
    maxWidth: 400,
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    flex: 1,
    marginRight: spacing.md,
  },
  urgencyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'white',
  },
  message: {
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  primaryActions: {
    marginBottom: spacing.lg,
  },
  primaryButton: {
    marginBottom: spacing.md,
    minHeight: 56, // Larger for crisis situations
  },
  emergencyButton: {
    backgroundColor: '#B91C1C', // High contrast red
    borderColor: '#B91C1C',
  },
  secondaryButton: {
    marginBottom: spacing.sm,
    minHeight: 52,
  },
  tertiaryButton: {
    marginBottom: spacing.sm,
    minHeight: 48,
  },
  onboardingCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 12,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  sectionMessage: {
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  onboardingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  continueButton: {
    flex: 1,
    marginRight: spacing.xs,
  },
  exitButton: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  resourcesCard: {
    padding: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 12,
  },
  resourceItem: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 8,
    backgroundColor: colorSystem.gray[50],
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
  },
  immediateResource: {
    borderColor: colorSystem.status.error,
    backgroundColor: colorSystem.status.errorLight,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceName: {
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  resourceDescription: {
    marginBottom: spacing.xs,
  },
  resourceAvailable: {
    fontWeight: '500',
  },
  closeButton: {
    marginTop: spacing.md,
  },
  educationCard: {
    padding: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 12,
  },
  educationText: {
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  educationList: {
    marginBottom: spacing.lg,
  },
  educationItem: {
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  // Severity-specific styles
  criticalSeverity: {
    backgroundColor: '#FEF2F2',
    borderColor: '#B91C1C',
    borderWidth: 3,
  },
  severeSeverity: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EA580C',
    borderWidth: 2,
  },
  moderateSeverity: {
    backgroundColor: '#FFFBEB',
    borderColor: '#D97706',
    borderWidth: 1,
  },
});

export default OnboardingCrisisAlert;