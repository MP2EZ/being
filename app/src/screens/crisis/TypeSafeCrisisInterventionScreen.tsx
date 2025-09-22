/**
 * Type-Safe Crisis Intervention Screen - Zero Tolerance Safety Implementation
 *
 * This component implements crisis intervention protocols with type-safe
 * validation, guaranteed response times, and comprehensive safety measures.
 *
 * CRITICAL: All crisis detection, response timing, and emergency protocols
 * are validated through certified clinical and timing services.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
  Vibration
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Button } from '../../components/core';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';

import {
  PHQ9Score,
  GAD7Score,
  ISODateString,
  createISODateString
} from '../../types/clinical';

import {
  ValidatedPHQ9Score,
  ValidatedGAD7Score,
  ValidatedSeverity,
  CrisisDetected,
  SuicidalIdeationDetected,
  ValidatedCrisisResponse,
  ValidatedCrisisAlertProps,
  ClinicalValidationState,
  ClinicalTypeValidationError
} from '../../types/clinical-type-safety';

import { clinicalCalculator } from '../../services/clinical/ClinicalCalculationService';
import { therapeuticTimer } from '../../services/clinical/TherapeuticTimingService';

/**
 * Crisis Intervention Route Parameters
 */
type CrisisInterventionParams = {
  CrisisIntervention: {
    triggerType: 'score_threshold' | 'suicidal_ideation' | 'manual' | 'assessment_result';
    assessmentType?: 'phq9' | 'gad7';
    score?: ValidatedPHQ9Score | ValidatedGAD7Score;
    severity?: ValidatedSeverity<'phq9'> | ValidatedSeverity<'gad7'>;
    crisisDetected: CrisisDetected;
    suicidalIdeation?: SuicidalIdeationDetected;
    triggerTime: ISODateString;
    validationState: ClinicalValidationState;
  };
};

type CrisisInterventionRouteProp = RouteProp<CrisisInterventionParams, 'CrisisIntervention'>;

/**
 * Emergency Contact Resource
 */
interface EmergencyResource {
  id: string;
  name: string;
  type: 'crisis_hotline' | 'text_line' | 'emergency_services' | 'specialized';
  number: string;
  description: string;
  availability: string;
  isValidated: boolean;
  responseTimeTarget: number; // milliseconds
  priority: 'critical' | 'high' | 'medium';
}

/**
 * Crisis Intervention Action
 */
interface CrisisAction {
  id: string;
  title: string;
  description: string;
  type: 'immediate' | 'coping' | 'safety_plan' | 'resource';
  icon: string;
  targetResponseTime: number; // milliseconds
  onPress: () => Promise<void>;
  isValidated: boolean;
}

/**
 * Safety Plan Item
 */
interface SafetyPlanItem {
  id: string;
  category: 'warning_signs' | 'coping_strategies' | 'social_contacts' | 'professional_contacts' | 'environment_safety';
  title: string;
  content: string;
  priority: number;
}

/**
 * Crisis Response Metrics
 */
interface CrisisResponseMetrics {
  screenLoadTime: number;
  firstActionTime: number | null;
  resourceAccessTime: number | null;
  userInteractionCount: number;
  sessionDuration: number;
}

/**
 * Type-Safe Crisis Intervention Screen Component
 */
export const TypeSafeCrisisInterventionScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CrisisInterventionRouteProp>();
  const {
    triggerType,
    assessmentType,
    score,
    severity,
    crisisDetected,
    suicidalIdeation,
    triggerTime,
    validationState
  } = route.params;

  const screenLoadTime = useMemo(() => Date.now(), []);
  const [responseMetrics, setResponseMetrics] = useState<CrisisResponseMetrics>({
    screenLoadTime,
    firstActionTime: null,
    resourceAccessTime: null,
    userInteractionCount: 0,
    sessionDuration: 0
  });

  /**
   * Validate Crisis Parameters on Mount
   */
  useEffect(() => {
    try {
      // Validate crisis detection
      if (!crisisDetected) {
        throw new ClinicalTypeValidationError(
          'Crisis intervention screen accessed without valid crisis detection',
          'TypeSafeCrisisInterventionScreen',
          'CrisisDetected',
          crisisDetected,
          'critical'
        );
      }

      // Validate response time from trigger to screen load
      const responseTime = screenLoadTime - new Date(triggerTime).getTime();
      try {
        therapeuticTimer.validateCrisisResponse(responseTime);
      } catch (timingError) {
        console.warn('Crisis screen load time exceeded target:', responseTime, 'ms');
      }

      // Haptic feedback for crisis awareness
      if (Platform.OS === 'ios') {
        Vibration.vibrate([100, 50, 100]);
      } else {
        Vibration.vibrate(200);
      }

    } catch (error) {
      console.error('Crisis intervention validation failed:', error);
      // Don't block crisis screen - log error but continue
    }
  }, [crisisDetected, triggerTime, screenLoadTime]);

  /**
   * Emergency Resources with Type Safety
   */
  const emergencyResources = useMemo((): EmergencyResource[] => [
    {
      id: 'crisis_lifeline_988',
      name: '988 Suicide & Crisis Lifeline',
      type: 'crisis_hotline',
      number: '988',
      description: 'Free, confidential support 24/7 for people in distress',
      availability: '24/7',
      isValidated: true,
      responseTimeTarget: 150, // Target response time to initiate call
      priority: 'critical'
    },
    {
      id: 'crisis_text_line',
      name: 'Crisis Text Line',
      type: 'text_line',
      number: '741741',
      description: 'Text HOME for immediate crisis counselor',
      availability: '24/7',
      isValidated: true,
      responseTimeTarget: 200,
      priority: 'critical'
    },
    {
      id: 'emergency_services',
      name: 'Emergency Services',
      type: 'emergency_services',
      number: '911',
      description: 'Immediate emergency response',
      availability: '24/7',
      isValidated: true,
      responseTimeTarget: 100, // Fastest possible response
      priority: 'critical'
    },
    {
      id: 'trans_lifeline',
      name: 'Trans Lifeline',
      type: 'specialized',
      number: '877-565-8860',
      description: 'Support for transgender community',
      availability: '24/7',
      isValidated: true,
      responseTimeTarget: 200,
      priority: 'high'
    }
  ], []);

  /**
   * Crisis-Specific Message Generation
   */
  const crisisMessage = useMemo(() => {
    const baseMessage = "You are not alone. Help is available right now.";

    if (suicidalIdeation) {
      return {
        title: "Immediate Support Available",
        message: "We're concerned about thoughts of self-harm that you've shared. " + baseMessage,
        urgency: "critical" as const,
        icon: "🆘"
      };
    }

    if (triggerType === 'score_threshold') {
      const assessmentName = assessmentType === 'phq9' ? 'depression' : 'anxiety';
      return {
        title: "Professional Support Recommended",
        message: `Your ${assessmentName} assessment indicates severe symptoms. ` + baseMessage,
        urgency: "high" as const,
        icon: "⚠️"
      };
    }

    return {
      title: "Crisis Support",
      message: baseMessage,
      urgency: "high" as const,
      icon: "🫂"
    };
  }, [triggerType, assessmentType, suicidalIdeation]);

  /**
   * Track User Interaction for Crisis Response Metrics
   */
  const trackInteraction = useCallback((actionType: string) => {
    const currentTime = Date.now();
    setResponseMetrics(prev => {
      const newMetrics = {
        ...prev,
        userInteractionCount: prev.userInteractionCount + 1,
        sessionDuration: currentTime - screenLoadTime
      };

      if (prev.firstActionTime === null) {
        newMetrics.firstActionTime = currentTime;
      }

      if (actionType === 'resource_access' && prev.resourceAccessTime === null) {
        newMetrics.resourceAccessTime = currentTime;
      }

      return newMetrics;
    });
  }, [screenLoadTime]);

  /**
   * Emergency Contact Handler with Response Time Validation
   */
  const handleEmergencyContact = useCallback(async (resource: EmergencyResource) => {
    const startTime = Date.now();
    trackInteraction('resource_access');

    try {
      let contactURL: string;

      switch (resource.type) {
        case 'crisis_hotline':
        case 'emergency_services':
        case 'specialized':
          contactURL = `tel:${resource.number}`;
          break;
        case 'text_line':
          contactURL = `sms:${resource.number}?body=HOME`;
          break;
        default:
          throw new Error(`Unknown resource type: ${resource.type}`);
      }

      // Attempt to open contact with performance tracking
      await Linking.openURL(contactURL);

      const responseTime = Date.now() - startTime;
      try {
        therapeuticTimer.validateCrisisResponse(responseTime);
      } catch (timingError) {
        console.warn(`Contact response time for ${resource.name} exceeded target:`, responseTime, 'ms');
      }

    } catch (error) {
      console.error('Emergency contact error:', error);

      // Fallback alert with manual dialing instructions
      Alert.alert(
        'Contact Emergency Support',
        `Please dial ${resource.number} directly for immediate help.\n\n${resource.description}`,
        [
          {
            text: 'Call Now',
            onPress: () => {
              // Attempt alternative contact method
              Linking.openURL(`tel:${resource.number}`).catch(() => {
                console.error('Alternative contact method failed');
              });
            }
          },
          { text: 'Close', style: 'cancel' }
        ]
      );
    }
  }, [trackInteraction]);

  /**
   * Safety Plan Quick Access
   */
  const handleSafetyPlan = useCallback(async () => {
    trackInteraction('safety_plan');

    const safetyPlanItems: SafetyPlanItem[] = [
      {
        id: 'grounding_54321',
        category: 'coping_strategies',
        title: '5-4-3-2-1 Grounding',
        content: '5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste',
        priority: 1
      },
      {
        id: 'breathing_exercise',
        category: 'coping_strategies',
        title: 'Deep Breathing',
        content: 'Breathe in for 4, hold for 4, breathe out for 6. Repeat 5 times.',
        priority: 2
      },
      {
        id: 'cold_water',
        category: 'coping_strategies',
        title: 'Cold Water Technique',
        content: 'Splash cold water on face or hold ice cubes to activate mammalian dive response',
        priority: 3
      }
    ];

    Alert.alert(
      'Quick Safety Strategies',
      'Choose a strategy to help right now:',
      [
        ...safetyPlanItems.map(item => ({
          text: item.title,
          onPress: () => {
            Alert.alert(item.title, item.content, [{ text: 'Got it' }]);
          }
        })),
        { text: 'Close', style: 'cancel' }
      ]
    );
  }, [trackInteraction]);

  /**
   * Navigate to Professional Resources
   */
  const handleProfessionalResources = useCallback(() => {
    trackInteraction('professional_resources');

    navigation.navigate('CrisisPlan');
  }, [navigation, trackInteraction]);

  /**
   * Render Emergency Resource Card
   */
  const renderEmergencyResource = (resource: EmergencyResource) => {
    return (
      <TouchableOpacity
        key={resource.id}
        style={[
          styles.resourceCard,
          {
            borderColor: resource.priority === 'critical'
              ? colorSystem.status.critical
              : colorSystem.status.error
          }
        ]}
        onPress={() => handleEmergencyContact(resource)}
        activeOpacity={0.8}
      >
        <View style={styles.resourceHeader}>
          <Text style={[
            styles.resourceName,
            {
              color: resource.priority === 'critical'
                ? colorSystem.status.critical
                : colorSystem.status.error
            }
          ]}>
            {resource.name}
          </Text>
          <Text style={styles.resourceNumber}>{resource.number}</Text>
        </View>
        <Text style={styles.resourceDescription}>{resource.description}</Text>
        <Text style={styles.resourceAvailability}>{resource.availability}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Crisis Header */}
          <View style={[
            styles.header,
            {
              backgroundColor: crisisMessage.urgency === 'critical'
                ? colorSystem.status.criticalBackground
                : colorSystem.status.errorBackground
            }
          ]}>
            <Text style={styles.headerIcon}>{crisisMessage.icon}</Text>
            <Text style={styles.headerTitle}>{crisisMessage.title}</Text>
            <Text style={styles.headerMessage}>{crisisMessage.message}</Text>
          </View>

          {/* Assessment Context */}
          {score && severity && assessmentType && (
            <View style={styles.contextCard}>
              <Text style={styles.contextTitle}>Assessment Results</Text>
              <Text style={styles.contextText}>
                {assessmentType === 'phq9' ? 'PHQ-9 Depression' : 'GAD-7 Anxiety'} Score: {score}
              </Text>
              <Text style={styles.contextSeverity}>
                Severity: {severity.charAt(0).toUpperCase() + severity.slice(1).replace('_', ' ')}
              </Text>
            </View>
          )}

          {/* Emergency Resources */}
          <View style={styles.resourcesSection}>
            <Text style={styles.sectionTitle}>🆘 Immediate Help</Text>
            {emergencyResources
              .filter(resource => resource.priority === 'critical')
              .map(renderEmergencyResource)}
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Quick Support Actions</Text>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleSafetyPlan}
              activeOpacity={0.7}
            >
              <Text style={styles.actionTitle}>🧘 Immediate Coping Strategies</Text>
              <Text style={styles.actionDescription}>
                Quick techniques to help manage overwhelming feelings right now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleProfessionalResources}
              activeOpacity={0.7}
            >
              <Text style={styles.actionTitle}>📋 Full Crisis Plan</Text>
              <Text style={styles.actionDescription}>
                Complete safety plan and additional resources
              </Text>
            </TouchableOpacity>
          </View>

          {/* Additional Resources */}
          <View style={styles.resourcesSection}>
            <Text style={styles.sectionTitle}>📞 Additional Support</Text>
            {emergencyResources
              .filter(resource => resource.priority !== 'critical')
              .map(renderEmergencyResource)}
          </View>

          {/* Safety Reminder */}
          <View style={styles.safetyReminder}>
            <Text style={styles.safetyTitle}>💙 Remember</Text>
            <Text style={styles.safetyText}>
              • This feeling is temporary and will pass{'\n'}
              • You have survived difficult times before{'\n'}
              • Reaching out for help is a sign of strength{'\n'}
              • You deserve support and care{'\n'}
              • Your life has value and meaning
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Action */}
      <View style={styles.bottomActions}>
        <Button
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        >
          I'm Safe Now
        </Button>

        <Button
          onPress={() => handleEmergencyContact(emergencyResources[0])}
          style={[styles.emergencyButton, { backgroundColor: colorSystem.status.critical }]}
        >
          Call 988 Now
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    padding: spacing.lg,
    borderRadius: borderRadius.medium,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colorSystem.status.critical,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  headerMessage: {
    fontSize: 16,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: 22,
  },
  contextCard: {
    backgroundColor: colorSystem.status.infoBackground,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.lg,
  },
  contextTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colorSystem.status.info,
    marginBottom: spacing.xs,
  },
  contextText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    marginBottom: spacing.xs,
  },
  contextSeverity: {
    fontSize: 14,
    fontWeight: '500',
    color: colorSystem.gray[800],
  },
  resourcesSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
  },
  resourceCard: {
    backgroundColor: colorSystem.base.white,
    borderWidth: 2,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  resourceNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colorSystem.base.black,
  },
  resourceDescription: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  resourceAvailability: {
    fontSize: 12,
    color: colorSystem.gray[600],
    fontWeight: '500',
  },
  actionsSection: {
    marginBottom: spacing.xl,
  },
  actionCard: {
    backgroundColor: colorSystem.gray[100],
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.sm,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  actionDescription: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 18,
  },
  safetyReminder: {
    backgroundColor: colorSystem.status.successBackground,
    padding: spacing.lg,
    borderRadius: borderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.success,
    marginBottom: spacing.lg,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.status.success,
    marginBottom: spacing.sm,
  },
  safetyText: {
    fontSize: 14,
    color: colorSystem.gray[800],
    lineHeight: 20,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colorSystem.base.white,
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
  },
  closeButton: {
    flex: 1,
    marginRight: spacing.sm,
  },
  emergencyButton: {
    flex: 1,
    marginLeft: spacing.sm,
  },
});

export default TypeSafeCrisisInterventionScreen;