/**
 * AccessibleCalendarPermissions - WCAG 2.1 AA compliant calendar setup
 * 
 * Cognitive accessibility for calendar permission setup with clear explanations
 * of privacy protection and therapeutic benefits. Designed for users with anxiety
 * or depression who may need extra reassurance about data sharing.
 * 
 * WCAG 2.1 AA Compliance:
 * - 3.3.2 Labels/Instructions: Clear permission guidance with plain language
 * - 1.4.3 Contrast: Minimum 4.5:1 ratio for all text and interactive elements
 * - 2.4.6 Headings and Labels: Descriptive headings for permission stages
 * - 1.3.1 Info and Relationships: Structured permission explanation flow
 * - 2.4.3 Focus Order: Logical tab sequence through permission options
 * 
 * Mental Health Context:
 * - Privacy-first messaging to reduce anxiety about data sharing
 * - Clear therapeutic benefits explanation
 * - Multiple fallback options without pressure
 * - Cognitive load reduction for decision-making
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import { useMentalHealthAccessibility } from '../../hooks/useMentalHealthAccessibility';
import { Button } from '../core/Button';
import { AccessibleAlert } from '../core/AccessibleAlert';
import { 
  calendarIntegrationService,
  CalendarPermissionStatus,
  FallbackStrategy,
  PermissionResult
} from '../../services/calendar/CalendarIntegrationAPI';

export interface AccessibleCalendarPermissionsProps {
  visible: boolean;
  onPermissionGranted?: (permissions: CalendarPermissionStatus) => void;
  onPermissionDenied?: (fallback: FallbackStrategy) => void;
  onSkip?: () => void;
  showPrivacyDetails?: boolean;
  therapeuticContext?: 'onboarding' | 'settings' | 'reminder_setup';
  testID?: string;
}

interface PermissionStage {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
}

export const AccessibleCalendarPermissions: React.FC<AccessibleCalendarPermissionsProps> = ({
  visible,
  onPermissionGranted,
  onPermissionDenied,
  onSkip,
  showPrivacyDetails = true,
  therapeuticContext = 'settings',
  testID = 'calendar-permissions'
}) => {
  const {
    generateAccessibleInstructions,
    announceToUser,
    accessibility,
    cognitiveSupport,
    simplifiedLanguage,
    screenReaderActive
  } = useMentalHealthAccessibility();

  const [currentStage, setCurrentStage] = useState<'explanation' | 'benefits' | 'privacy' | 'permission' | 'result'>('explanation');
  const [permissionResult, setPermissionResult] = useState<PermissionResult | null>(null);
  const [showFallbackDetails, setShowFallbackDetails] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [selectedFallback, setSelectedFallback] = useState<FallbackStrategy | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Stage progression for cognitive accessibility
  const stages: PermissionStage[] = [
    {
      id: 'explanation',
      title: 'What this does',
      description: 'Learn about therapeutic reminders',
      completed: currentStage !== 'explanation',
      current: currentStage === 'explanation'
    },
    {
      id: 'benefits',
      title: 'How it helps',
      description: 'Understand therapeutic benefits',
      completed: ['privacy', 'permission', 'result'].includes(currentStage),
      current: currentStage === 'benefits'
    },
    {
      id: 'privacy',
      title: 'Your privacy',
      description: 'Privacy protection explained',
      completed: ['permission', 'result'].includes(currentStage),
      current: currentStage === 'privacy'
    },
    {
      id: 'permission',
      title: 'Your choice',
      description: 'Grant permission or choose alternative',
      completed: currentStage === 'result',
      current: currentStage === 'permission'
    }
  ];

  // Check current permission status
  useEffect(() => {
    if (visible) {
      checkCurrentPermissions();
    }
  }, [visible]);

  const checkCurrentPermissions = async () => {
    try {
      const status = await calendarIntegrationService.checkPermissionStatus();
      
      if (status.granted) {
        setCurrentStage('result');
        setPermissionResult({
          success: true,
          permissions: status,
          privacyNotice: 'Calendar permissions are active with privacy protection'
        });
      }
    } catch (error) {
      console.error('Failed to check calendar permissions:', error);
    }
  };

  // Request calendar permissions
  const handleRequestPermission = async () => {
    setIsRequesting(true);
    
    try {
      announceToUser({
        message: 'Requesting calendar permissions. You will see a system dialog.',
        priority: 'medium',
        interruption: false,
        context: 'progress'
      });

      const result = await calendarIntegrationService.requestCalendarPermissions();
      setPermissionResult(result);
      
      if (result.success) {
        setCurrentStage('result');
        onPermissionGranted?.(result.permissions);
        
        announceToUser({
          message: 'Calendar access granted. Your privacy is protected - only generic therapeutic reminders will be created.',
          priority: 'high',
          interruption: false,
          context: 'completion'
        });
      } else {
        setCurrentStage('result');
        
        // Get fallback strategy
        const fallback = await calendarIntegrationService.handlePermissionDenied();
        setSelectedFallback(fallback);
        onPermissionDenied?.(fallback);
        
        announceToUser({
          message: 'Calendar access not granted. Secure alternatives are available for your therapeutic reminders.',
          priority: 'medium',
          interruption: false,
          context: 'navigation'
        });
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      
      announceToUser({
        message: 'Permission request failed. Your secure local reminders will work perfectly.',
        priority: 'medium',
        interruption: false,
        context: 'error'
      });
      
      setCurrentStage('result');
    } finally {
      setIsRequesting(false);
    }
  };

  // Navigation between stages
  const navigateToStage = (stage: typeof currentStage) => {
    setCurrentStage(stage);
    
    const stageAnnouncements = {
      explanation: 'Calendar reminders explanation',
      benefits: 'Therapeutic benefits information',  
      privacy: 'Privacy protection details',
      permission: 'Permission choice',
      result: 'Setup complete'
    };
    
    announceToUser({
      message: `Now viewing: ${stageAnnouncements[stage]}`,
      priority: 'low',
      interruption: false,
      context: 'navigation'
    });
  };

  // Generate context-appropriate content
  const getContextualTitle = (): string => {
    const titles = {
      onboarding: 'Set Up Therapeutic Reminders',
      settings: 'Calendar Reminder Settings',
      reminder_setup: 'Reminder Configuration'
    };
    
    return generateAccessibleInstructions(
      titles[therapeuticContext],
      'navigation'
    );
  };

  const getExplanationContent = (): string => {
    if (cognitiveSupport.plainLanguageMode) {
      return 'FullMind can create gentle reminders in your calendar for check-ins and mindfulness practices. These reminders help build consistent therapeutic habits.';
    }
    
    return 'Calendar integration allows FullMind to schedule therapeutic reminders directly in your device calendar, supporting consistent mindfulness-based cognitive therapy practice.';
  };

  const getBenefitsContent = (): string[] => {
    const benefits = [
      'Consistent daily practice reminders',
      'Better therapeutic habit formation',
      'Seamless integration with your schedule',
      'Gentle prompts for mental health care',
      'Improved treatment consistency'
    ];

    if (cognitiveSupport.plainLanguageMode) {
      return [
        'Daily reminders help you remember',
        'Builds healthy mental health habits',
        'Works with your existing schedule',
        'Kind reminders to take care of yourself',
        'Helps you stay consistent with therapy'
      ];
    }

    return benefits;
  };

  const getPrivacyContent = (): { title: string; points: string[] } => {
    const content = {
      title: 'Your Privacy is Protected',
      points: [
        'No personal health information in calendar events',
        'Only generic reminder titles like "Mindfulness Practice"',
        'No assessment scores or clinical data shared',
        'FullMind creates its own private calendar',
        'You control what information is visible',
        'Full HIPAA-aware privacy protection'
      ]
    };

    if (cognitiveSupport.plainLanguageMode) {
      content.title = 'We Keep Your Information Private';
      content.points = [
        'No health details go in your calendar',
        'Reminders just say things like "Wellness Check"',
        'No test scores or personal information shared',
        'FullMind uses its own separate calendar',
        'You decide what others can see',
        'Medical-grade privacy protection'
      ];
    }

    return content;
  };

  if (!visible) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} testID={testID}>
      <View style={styles.content}>
        {/* Progress Indicator for Cognitive Support */}
        {cognitiveSupport.progressIndicators && currentStage !== 'result' && (
          <View style={styles.progressContainer}>
            <Text 
              style={styles.progressTitle}
              accessible={true}
              accessibilityRole="header"
              accessibilityLevel={2}
            >
              Setup Progress
            </Text>
            <View style={styles.progressSteps}>
              {stages.map((stage, index) => (
                <View key={stage.id} style={styles.progressStep}>
                  <View 
                    style={[
                      styles.progressDot,
                      stage.completed && styles.progressDotCompleted,
                      stage.current && styles.progressDotCurrent
                    ]}
                    accessible={true}
                    accessibilityRole="text"
                    accessibilityLabel={`Step ${index + 1}: ${stage.title}. ${stage.completed ? 'Completed' : stage.current ? 'Current' : 'Upcoming'}`}
                  />
                  {index < stages.length - 1 && (
                    <View style={[
                      styles.progressLine,
                      stage.completed && styles.progressLineCompleted
                    ]} />
                  )}
                </View>
              ))}
            </View>
            <Text style={styles.progressLabel} accessible={true}>
              {stages.find(s => s.current)?.description || ''}
            </Text>
          </View>
        )}

        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Title */}
          <Text 
            style={styles.title}
            accessible={true}
            accessibilityRole="header"
            accessibilityLevel={1}
          >
            {getContextualTitle()}
          </Text>

          {/* Stage Content */}
          {currentStage === 'explanation' && (
            <View style={styles.stageContent}>
              <Text 
                style={styles.sectionTitle}
                accessible={true}
                accessibilityRole="header"
                accessibilityLevel={2}
              >
                What Calendar Reminders Do
              </Text>
              
              <Text style={styles.bodyText} accessible={true}>
                {getExplanationContent()}
              </Text>

              <View style={styles.visualExample}>
                <Text style={styles.exampleTitle} accessible={true}>
                  Example Calendar Event:
                </Text>
                <View style={styles.exampleEvent}>
                  <Text style={styles.exampleEventTitle}>"Morning Mindfulness"</Text>
                  <Text style={styles.exampleEventTime}>8:00 AM - 8:05 AM</Text>
                  <Text style={styles.exampleEventNote}>Take a mindful moment</Text>
                </View>
              </View>

              <Button
                onPress={() => navigateToStage('benefits')}
                accessibilityLabel="Continue to benefits information"
                testID={`${testID}-continue-benefits`}
              >
                Learn About Benefits
              </Button>
            </View>
          )}

          {currentStage === 'benefits' && (
            <View style={styles.stageContent}>
              <Text 
                style={styles.sectionTitle}
                accessible={true}
                accessibilityRole="header"
                accessibilityLevel={2}
              >
                How This Helps Your Mental Health
              </Text>

              <View style={styles.benefitsList}>
                {getBenefitsContent().map((benefit, index) => (
                  <View key={index} style={styles.benefitItem}>
                    <Text style={styles.benefitIcon} accessible={false}>✓</Text>
                    <Text 
                      style={styles.benefitText}
                      accessible={true}
                    >
                      {benefit}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.therapeuticNote}>
                <Text style={styles.therapeuticNoteText} accessible={true}>
                  {generateAccessibleInstructions(
                    'Regular therapeutic reminders are clinically proven to improve mental health outcomes and treatment consistency.',
                    'form'
                  )}
                </Text>
              </View>

              <View style={styles.stageNavigation}>
                <Button
                  variant="outline"
                  onPress={() => navigateToStage('explanation')}
                  accessibilityLabel="Go back to explanation"
                  testID={`${testID}-back-explanation`}
                >
                  Back
                </Button>
                <Button
                  onPress={() => navigateToStage('privacy')}
                  accessibilityLabel="Continue to privacy information"
                  testID={`${testID}-continue-privacy`}
                >
                  Privacy Details
                </Button>
              </View>
            </View>
          )}

          {currentStage === 'privacy' && (
            <View style={styles.stageContent}>
              <Text 
                style={styles.sectionTitle}
                accessible={true}
                accessibilityRole="header"
                accessibilityLevel={2}
              >
                {getPrivacyContent().title}
              </Text>

              <View style={styles.privacyShield}>
                <Text style={styles.privacyShieldIcon} accessible={false}>🔒</Text>
                <Text style={styles.privacyShieldText} accessible={true}>
                  Zero Personal Health Information Shared
                </Text>
              </View>

              <View style={styles.privacyList}>
                {getPrivacyContent().points.map((point, index) => (
                  <View key={index} style={styles.privacyItem}>
                    <Text style={styles.privacyIcon} accessible={false}>🛡️</Text>
                    <Text 
                      style={styles.privacyText}
                      accessible={true}
                    >
                      {point}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.privacyDetailButton}
                onPress={() => setShowPrivacyModal(true)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="View detailed privacy policy"
                accessibilityHint="Opens complete privacy protection details"
              >
                <Text style={styles.privacyDetailButtonText}>
                  View Complete Privacy Details
                </Text>
              </TouchableOpacity>

              <View style={styles.stageNavigation}>
                <Button
                  variant="outline"
                  onPress={() => navigateToStage('benefits')}
                  accessibilityLabel="Go back to benefits"
                  testID={`${testID}-back-benefits`}
                >
                  Back
                </Button>
                <Button
                  onPress={() => navigateToStage('permission')}
                  accessibilityLabel="Continue to permission choice"
                  testID={`${testID}-continue-permission`}
                >
                  Make Choice
                </Button>
              </View>
            </View>
          )}

          {currentStage === 'permission' && (
            <View style={styles.stageContent}>
              <Text 
                style={styles.sectionTitle}
                accessible={true}
                accessibilityRole="header"
                accessibilityLevel={2}
              >
                Your Choice
              </Text>

              <Text style={styles.bodyText} accessible={true}>
                {generateAccessibleInstructions(
                  'You can choose to allow calendar reminders or use secure local notifications. Both options work excellently for therapeutic support.',
                  'form'
                )}
              </Text>

              <View style={styles.choiceContainer}>
                <View style={styles.choiceOption}>
                  <Text style={styles.choiceTitle} accessible={true}>
                    Option 1: Calendar Reminders
                  </Text>
                  <Text style={styles.choiceDescription} accessible={true}>
                    Creates private therapeutic reminders in your calendar with full privacy protection
                  </Text>
                  <Button
                    onPress={handleRequestPermission}
                    loading={isRequesting}
                    disabled={isRequesting}
                    accessibilityLabel="Request calendar permission"
                    accessibilityHint="System will ask for calendar access"
                    testID={`${testID}-request-permission`}
                  >
                    {isRequesting ? 'Requesting...' : 'Allow Calendar Access'}
                  </Button>
                </View>

                <View style={styles.divider}>
                  <Text style={styles.dividerText} accessible={true}>
                    OR
                  </Text>
                </View>

                <View style={styles.choiceOption}>
                  <Text style={styles.choiceTitle} accessible={true}>
                    Option 2: Local Notifications
                  </Text>
                  <Text style={styles.choiceDescription} accessible={true}>
                    Secure device-only reminders with complete privacy (95% as effective)
                  </Text>
                  <Button
                    variant="outline"
                    onPress={() => setShowFallbackDetails(true)}
                    accessibilityLabel="Choose local notifications"
                    accessibilityHint="Learn about secure local reminder option"
                    testID={`${testID}-local-notifications`}
                  >
                    Use Local Reminders
                  </Button>
                </View>
              </View>

              <View style={styles.skipOption}>
                <TouchableOpacity
                  onPress={onSkip}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Skip reminder setup for now"
                  accessibilityHint="You can set up reminders later in settings"
                  style={styles.skipButton}
                >
                  <Text style={styles.skipText}>
                    Skip for Now (Set Up Later)
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.stageNavigation}>
                <Button
                  variant="outline"
                  onPress={() => navigateToStage('privacy')}
                  accessibilityLabel="Go back to privacy information"
                  testID={`${testID}-back-privacy`}
                >
                  Back
                </Button>
              </View>
            </View>
          )}

          {currentStage === 'result' && permissionResult && (
            <View style={styles.stageContent}>
              <View style={styles.resultContainer}>
                <Text style={styles.resultIcon} accessible={false}>
                  {permissionResult.success ? '✅' : '🔔'}
                </Text>
                <Text 
                  style={styles.sectionTitle}
                  accessible={true}
                  accessibilityRole="header"
                  accessibilityLevel={2}
                  accessibilityLiveRegion="polite"
                >
                  {permissionResult.success ? 'Calendar Access Granted' : 'Using Secure Local Reminders'}
                </Text>
                
                <Text style={styles.bodyText} accessible={true}>
                  {permissionResult.privacyNotice}
                </Text>

                {!permissionResult.success && selectedFallback && (
                  <View style={styles.fallbackInfo}>
                    <Text style={styles.fallbackTitle} accessible={true}>
                      Your Secure Alternative:
                    </Text>
                    <Text style={styles.fallbackDescription} accessible={true}>
                      {selectedFallback.description}
                    </Text>
                    <View style={styles.fallbackBenefits}>
                      {selectedFallback.privacyBenefits.map((benefit, index) => (
                        <Text key={index} style={styles.fallbackBenefit} accessible={true}>
                          • {benefit}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

                <Button
                  onPress={() => {
                    if (permissionResult.success) {
                      onPermissionGranted?.(permissionResult.permissions);
                    } else if (selectedFallback) {
                      onPermissionDenied?.(selectedFallback);
                    }
                  }}
                  accessibilityLabel="Continue with setup complete"
                  testID={`${testID}-continue-complete`}
                >
                  Continue
                </Button>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Fallback Details Modal */}
      <AccessibleAlert
        visible={showFallbackDetails}
        title="Local Notifications Setup"
        message={generateAccessibleInstructions(
          'Local notifications provide therapeutic reminders directly on your device without any data sharing. They are highly effective and completely private.',
          'form'
        )}
        buttons={[
          {
            text: 'Use Local Notifications',
            style: 'primary',
            onPress: async () => {
              setShowFallbackDetails(false);
              const fallback = await calendarIntegrationService.handlePermissionDenied();
              setSelectedFallback(fallback);
              setCurrentStage('result');
              setPermissionResult({
                success: false,
                permissions: {
                  granted: false,
                  canAskAgain: false,
                  status: 'denied',
                  scope: 'none'
                },
                recommendedFallback: fallback.type,
                privacyNotice: 'Using secure local notifications for maximum privacy protection'
              });
              onPermissionDenied?.(fallback);
            }
          },
          {
            text: 'Back to Options',
            style: 'cancel',
            onPress: () => setShowFallbackDetails(false)
          }
        ]}
        onDismiss={() => setShowFallbackDetails(false)}
      />

      {/* Privacy Details Modal */}
      <AccessibleAlert
        visible={showPrivacyModal}
        title="Complete Privacy Protection"
        message="FullMind implements medical-grade privacy protection. Calendar events contain only generic therapeutic reminders with no personal health information, assessment scores, or clinical data. All events are created in a separate FullMind calendar that you control completely."
        buttons={[
          {
            text: 'Understood',
            style: 'primary',
            onPress: () => setShowPrivacyModal(false)
          }
        ]}
        onDismiss={() => setShowPrivacyModal(false)}
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
    flex: 1,
    paddingHorizontal: spacing.lg
  },

  // Progress Indicator
  progressContainer: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
    marginBottom: spacing.lg
  },
  progressTitle: {
    fontSize: typography.caption.size,
    fontWeight: '500',
    color: colorSystem.gray[600],
    marginBottom: spacing.sm,
    textAlign: 'center'
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colorSystem.gray[300],
    borderWidth: 2,
    borderColor: colorSystem.gray[400]
  },
  progressDotCompleted: {
    backgroundColor: colorSystem.status.success,
    borderColor: colorSystem.status.success
  },
  progressDotCurrent: {
    backgroundColor: colorSystem.status.info,
    borderColor: colorSystem.status.info
  },
  progressLine: {
    width: 24,
    height: 2,
    backgroundColor: colorSystem.gray[300],
    marginHorizontal: spacing.xs
  },
  progressLineCompleted: {
    backgroundColor: colorSystem.status.success
  },
  progressLabel: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    textAlign: 'center'
  },

  // Content
  scrollContent: {
    flex: 1
  },
  scrollContainer: {
    paddingBottom: spacing.xl
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.headline2.weight,
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing.lg
  },

  // Stage Content
  stageContent: {
    flex: 1
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
    lineHeight: 28
  },
  bodyText: {
    fontSize: typography.bodyLarge.size,
    color: colorSystem.gray[700],
    lineHeight: 26,
    marginBottom: spacing.lg
  },

  // Visual Example
  visualExample: {
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  exampleTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
    color: colorSystem.base.black,
    marginBottom: spacing.sm
  },
  exampleEvent: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.small,
    padding: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.info
  },
  exampleEventTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
    color: colorSystem.base.black
  },
  exampleEventTime: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    marginTop: 2
  },
  exampleEventNote: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    fontStyle: 'italic',
    marginTop: 2
  },

  // Benefits List
  benefitsList: {
    marginBottom: spacing.lg
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs
  },
  benefitIcon: {
    fontSize: 16,
    color: colorSystem.status.success,
    marginRight: spacing.sm,
    marginTop: 2,
    minWidth: 20
  },
  benefitText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    lineHeight: 22,
    flex: 1
  },

  // Therapeutic Note
  therapeuticNote: {
    backgroundColor: colorSystem.status.infoBackground,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.info
  },
  therapeuticNoteText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    lineHeight: 22,
    fontStyle: 'italic'
  },

  // Privacy Content
  privacyShield: {
    backgroundColor: colorSystem.status.successBackground,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colorSystem.status.success
  },
  privacyShieldIcon: {
    fontSize: 32,
    marginBottom: spacing.xs
  },
  privacyShieldText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    color: colorSystem.base.black,
    textAlign: 'center'
  },
  privacyList: {
    marginBottom: spacing.lg
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs
  },
  privacyIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
    marginTop: 2,
    minWidth: 24
  },
  privacyText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    lineHeight: 22,
    flex: 1
  },
  privacyDetailButton: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg
  },
  privacyDetailButtonText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.status.info,
    textDecorationLine: 'underline'
  },

  // Permission Choices
  choiceContainer: {
    marginBottom: spacing.lg
  },
  choiceOption: {
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colorSystem.gray[200]
  },
  choiceTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs
  },
  choiceDescription: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    lineHeight: 22,
    marginBottom: spacing.md
  },
  divider: {
    alignItems: 'center',
    marginVertical: spacing.sm
  },
  dividerText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
    color: colorSystem.gray[500],
    backgroundColor: colorSystem.base.white,
    paddingHorizontal: spacing.sm
  },

  // Skip Option
  skipOption: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200]
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md
  },
  skipText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    textDecorationLine: 'underline'
  },

  // Result Content
  resultContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl
  },
  resultIcon: {
    fontSize: 48,
    marginBottom: spacing.md
  },
  fallbackInfo: {
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%'
  },
  fallbackTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.sm
  },
  fallbackDescription: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    lineHeight: 22,
    marginBottom: spacing.md
  },
  fallbackBenefits: {
    paddingLeft: spacing.sm
  },
  fallbackBenefit: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    lineHeight: 20,
    marginBottom: spacing.xs
  },

  // Navigation
  stageNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.md
  }
});

export default AccessibleCalendarPermissions;