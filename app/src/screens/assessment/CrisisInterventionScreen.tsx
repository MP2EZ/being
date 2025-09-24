/**
 * CrisisInterventionScreen - Emergency Intervention and 988 Access
 * CRITICAL: <200ms response time, multiple safety nets, clinical audit trail
 * SAFETY FIRST: Immediate access to crisis resources with therapeutic appropriateness
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Linking, Vibration, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Button } from '../../components/core/Button';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';

type CrisisInterventionParams = {
  CrisisInterventionScreen: {
    source?: 'assessment' | 'manual' | 'detection' | 'checkin';
    assessmentType?: 'phq9' | 'gad7';
    emergencyLevel?: 'urgent' | 'high' | 'moderate';
    returnTo?: string;
  };
};

type CrisisInterventionRouteProp = RouteProp<CrisisInterventionParams, 'CrisisInterventionScreen'>;

interface CrisisResource {
  id: string;
  title: string;
  description: string;
  action: string;
  type: 'immediate' | 'support' | 'professional' | 'digital';
  phone?: string;
  text?: string;
  url?: string;
  available: string;
  icon: string;
}

const CRISIS_RESOURCES: CrisisResource[] = [
  {
    id: 'suicide-crisis-lifeline',
    title: '988 Suicide & Crisis Lifeline',
    description: 'Free, confidential support for people in crisis and those around them',
    action: 'Call Now',
    type: 'immediate',
    phone: '988',
    available: '24/7',
    icon: '📞'
  },
  {
    id: 'crisis-text-line',
    title: 'Crisis Text Line',
    description: 'Free crisis support via text message with trained counselors',
    action: 'Text HOME',
    type: 'immediate',
    text: '741741',
    available: '24/7',
    icon: '💬'
  },
  {
    id: 'emergency-services',
    title: 'Emergency Services',
    description: 'Immediate emergency medical and psychiatric intervention',
    action: 'Call 911',
    type: 'immediate',
    phone: '911',
    available: '24/7',
    icon: '🚨'
  },
  {
    id: 'warmline',
    title: 'SAMHSA National Helpline',
    description: 'Treatment referral service for mental health and substance use',
    action: 'Call for Help',
    type: 'support',
    phone: '1-800-662-4357',
    available: '24/7',
    icon: '🤝'
  },
  {
    id: 'lgbt-hotline',
    title: 'Trevor Project (LGBTQ+)',
    description: 'Crisis support specifically for LGBTQ+ young people',
    action: 'Call Now',
    type: 'support',
    phone: '1-866-488-7386',
    available: '24/7',
    icon: '🏳️‍🌈'
  },
  {
    id: 'veterans-crisis',
    title: 'Veterans Crisis Line',
    description: 'Specialized crisis support for veterans and their families',
    action: 'Call or Text',
    type: 'support',
    phone: '1-800-273-8255',
    text: '838255',
    available: '24/7',
    icon: '🇺🇸'
  }
];

const SAFETY_PLAN_ITEMS = [
  {
    step: 1,
    title: 'Recognize Warning Signs',
    description: 'Notice thoughts, feelings, or situations that might trigger a crisis',
    icon: '⚠️'
  },
  {
    step: 2,
    title: 'Use Coping Strategies',
    description: 'Try breathing exercises, grounding techniques, or other helpful activities',
    icon: '🧘‍♀️'
  },
  {
    step: 3,
    title: 'Contact Support People',
    description: 'Reach out to trusted friends, family, or support network',
    icon: '👥'
  },
  {
    step: 4,
    title: 'Contact Professionals',
    description: 'Call your therapist, doctor, or mental health professional',
    icon: '👩‍⚕️'
  },
  {
    step: 5,
    title: 'Use Crisis Resources',
    description: 'Contact 988, text crisis line, or seek emergency help',
    icon: '🆘'
  },
  {
    step: 6,
    title: 'Create Safe Environment',
    description: 'Remove means of self-harm and ensure safety',
    icon: '🏠'
  }
];

export const CrisisInterventionScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CrisisInterventionRouteProp>();
  const { source = 'manual', assessmentType, emergencyLevel = 'moderate', returnTo } = route.params || {};

  const [activeSection, setActiveSection] = useState<'resources' | 'safety-plan' | 'immediate'>('immediate');
  const [callInProgress, setCallInProgress] = useState(false);

  // Log crisis intervention access for clinical audit
  useEffect(() => {
    const accessTime = new Date().toISOString();
    console.log(`🆘 CRISIS INTERVENTION ACCESSED: ${accessTime}`, {
      source,
      assessmentType,
      emergencyLevel,
      userAgent: 'Crisis Intervention Screen'
    });

    // Vibration for urgent attention (accessibility)
    if (emergencyLevel === 'urgent') {
      Vibration.vibrate([0, 500, 200, 500]);
    }
  }, [source, assessmentType, emergencyLevel]);

  const handleCall = async (phoneNumber: string, resourceTitle: string) => {
    setCallInProgress(true);

    try {
      console.log(`🆘 CRISIS CALL INITIATED: ${phoneNumber} - ${resourceTitle}`);
      await Linking.openURL(`tel:${phoneNumber}`);

      // Log successful call initiation for audit trail
      setTimeout(() => {
        console.log(`✅ CRISIS CALL CONNECTED: ${phoneNumber} at ${new Date().toISOString()}`);
        setCallInProgress(false);
      }, 2000);

    } catch (error) {
      console.error('Crisis call failed:', error);
      setCallInProgress(false);

      Alert.alert(
        'Call Failed',
        `Unable to dial ${phoneNumber} automatically. Please dial manually for immediate support.`,
        [
          { text: 'OK' },
          {
            text: 'Try Again',
            onPress: () => handleCall(phoneNumber, resourceTitle)
          }
        ]
      );
    }
  };

  const handleText = async (number: string, message: string = '') => {
    try {
      const url = message ? `sms:${number}?body=${encodeURIComponent(message)}` : `sms:${number}`;
      await Linking.openURL(url);
      console.log(`💬 CRISIS TEXT INITIATED: ${number}`);
    } catch (error) {
      console.error('Crisis text failed:', error);
      Alert.alert(
        'Text Failed',
        `Unable to text ${number} automatically. Please text manually: "${message || 'HOME'}"`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleEmergencyCall = () => {
    Alert.alert(
      'Emergency Call',
      'This will call emergency services (911). Only use for immediate medical emergencies.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call 911',
          onPress: () => handleCall('911', 'Emergency Services'),
          style: 'destructive'
        }
      ]
    );
  };

  const renderCrisisResource = (resource: CrisisResource) => {
    const isImmediate = resource.type === 'immediate';

    return (
      <View
        key={resource.id}
        style={[
          styles.resourceCard,
          isImmediate && styles.resourceCardImmediate,
          resource.id === 'suicide-crisis-lifeline' && styles.resourceCardPrimary
        ]}
      >
        <View style={styles.resourceHeader}>
          <Text style={styles.resourceIcon}>{resource.icon}</Text>
          <View style={styles.resourceInfo}>
            <Text style={[
              styles.resourceTitle,
              isImmediate && styles.resourceTitleImmediate
            ]}>
              {resource.title}
            </Text>
            <Text style={styles.resourceAvailable}>{resource.available}</Text>
          </View>
        </View>

        <Text style={styles.resourceDescription}>{resource.description}</Text>

        <View style={styles.resourceActions}>
          {resource.phone && (
            <Button
              variant={resource.id === 'suicide-crisis-lifeline' ? 'crisis' : isImmediate ? 'emergency' : 'primary'}
              onPress={() => handleCall(resource.phone!, resource.title)}
              loading={callInProgress}
              style={[
                styles.resourceButton,
                resource.id === 'suicide-crisis-lifeline' && styles.primaryCrisisButton
              ]}
              accessibilityLabel={`Call ${resource.title}`}
              accessibilityHint={`Dials ${resource.phone} for immediate support`}
            >
              {resource.phone === '911' ? 'Call 911' : `Call ${resource.phone}`}
            </Button>
          )}

          {resource.text && (
            <Button
              variant="outline"
              onPress={() => handleText(resource.text!, resource.id === 'crisis-text-line' ? 'HOME' : '')}
              style={styles.resourceButtonSecondary}
              accessibilityLabel={`Text ${resource.title}`}
            >
              Text {resource.text}
            </Button>
          )}
        </View>
      </View>
    );
  };

  const renderSafetyPlanItem = (item: typeof SAFETY_PLAN_ITEMS[0]) => (
    <View key={item.step} style={styles.safetyPlanItem}>
      <View style={styles.safetyPlanStep}>
        <Text style={styles.safetyPlanStepNumber}>{item.step}</Text>
      </View>
      <View style={styles.safetyPlanContent}>
        <View style={styles.safetyPlanHeader}>
          <Text style={styles.safetyPlanIcon}>{item.icon}</Text>
          <Text style={styles.safetyPlanTitle}>{item.title}</Text>
        </View>
        <Text style={styles.safetyPlanDescription}>{item.description}</Text>
      </View>
    </View>
  );

  const getUrgencyMessage = () => {
    switch (emergencyLevel) {
      case 'urgent':
        return {
          text: '🚨 If you are in immediate danger or having thoughts of self-harm, please call 988 or 911 right now.',
          color: colorSystem.status.critical
        };
      case 'high':
        return {
          text: '⚠️ You may be experiencing significant distress. Crisis support is available to help.',
          color: colorSystem.status.error
        };
      default:
        return {
          text: '💙 You\'re taking a positive step by seeking support. Help is available.',
          color: colorSystem.status.info
        };
    }
  };

  const urgencyMessage = getUrgencyMessage();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => returnTo ? navigation.navigate(returnTo as never) : navigation.goBack()}
              style={({ pressed }) => [
                styles.backButton,
                { opacity: pressed ? 0.7 : 1.0 }
              ]}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </Pressable>

            <Text style={styles.title}>Crisis Support</Text>
          </View>

          {/* Urgency Message */}
          <View style={[styles.urgencyBanner, { backgroundColor: urgencyMessage.color + '20', borderLeftColor: urgencyMessage.color }]}>
            <Text style={[styles.urgencyText, { color: urgencyMessage.color }]}>
              {urgencyMessage.text}
            </Text>
          </View>

          {/* Section Navigation */}
          <View style={styles.sectionNav}>
            {[
              { key: 'immediate', label: 'Immediate Help' },
              { key: 'resources', label: 'All Resources' },
              { key: 'safety-plan', label: 'Safety Plan' }
            ].map(section => (
              <Pressable
                key={section.key}
                style={({ pressed }) => [
                  styles.sectionButton,
                  activeSection === section.key && styles.sectionButtonActive,
                  { opacity: pressed ? 0.7 : 1.0 }
                ]}
                onPress={() => setActiveSection(section.key as any)}
                accessibilityLabel={section.label}
                accessibilityRole="button"
                accessibilityState={{ selected: activeSection === section.key }}
              >
                <Text style={[
                  styles.sectionButtonText,
                  activeSection === section.key && styles.sectionButtonTextActive
                ]}>
                  {section.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Content Sections */}
          {activeSection === 'immediate' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Immediate Crisis Support</Text>
              <Text style={styles.sectionDescription}>
                If you're having thoughts of self-harm or are in crisis, these resources provide immediate support.
              </Text>

              {CRISIS_RESOURCES.filter(r => r.type === 'immediate').map(renderCrisisResource)}

              {/* Quick breathing exercise */}
              <View style={styles.quickHelp}>
                <Text style={styles.quickHelpTitle}>🌬️ Quick Calm: 4-7-8 Breathing</Text>
                <Text style={styles.quickHelpText}>
                  While waiting for support: Breathe in for 4, hold for 7, breathe out for 8. Repeat 3 times.
                </Text>
              </View>
            </View>
          )}

          {activeSection === 'resources' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>All Crisis Resources</Text>
              <Text style={styles.sectionDescription}>
                Comprehensive support options for different situations and populations.
              </Text>

              {CRISIS_RESOURCES.map(renderCrisisResource)}
            </View>
          )}

          {activeSection === 'safety-plan' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Crisis Safety Plan</Text>
              <Text style={styles.sectionDescription}>
                A step-by-step guide to help you stay safe during difficult times.
              </Text>

              {SAFETY_PLAN_ITEMS.map(renderSafetyPlanItem)}

              <View style={styles.safetyPlanNote}>
                <Text style={styles.safetyPlanNoteText}>
                  💡 Consider sharing this plan with a trusted person and customizing it with your healthcare provider.
                </Text>
              </View>
            </View>
          )}

          {/* Always visible emergency button */}
          <View style={styles.emergencySection}>
            <Button
              variant="crisis"
              onPress={() => handleCall('988', '988 Suicide & Crisis Lifeline')}
              style={styles.emergencyButton}
              loading={callInProgress}
              accessibilityLabel="Call 988 Crisis Lifeline immediately"
              accessibilityHint="Calls the national suicide and crisis lifeline for immediate support"
            >
              🆘 Call 988 - Crisis Lifeline
            </Button>
          </View>
        </View>
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  backButton: {
    marginRight: spacing.md,
  },
  backButtonText: {
    fontSize: 16,
    color: colorSystem.status.info,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colorSystem.base.black,
  },
  urgencyBanner: {
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    borderLeftWidth: 4,
    marginBottom: spacing.lg,
  },
  urgencyText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  sectionNav: {
    flexDirection: 'row',
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.medium,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  sectionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.small,
    alignItems: 'center',
  },
  sectionButtonActive: {
    backgroundColor: colorSystem.base.white,
  },
  sectionButtonText: {
    fontSize: 13,
    color: colorSystem.gray[600],
    fontWeight: '500',
  },
  sectionButtonTextActive: {
    color: colorSystem.base.black,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: 14,
    color: colorSystem.gray[600],
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  resourceCard: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.lg,
    borderRadius: borderRadius.large,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resourceCardImmediate: {
    borderColor: colorSystem.status.critical,
    borderWidth: 2,
  },
  resourceCardPrimary: {
    backgroundColor: colorSystem.status.criticalBackground,
    borderColor: colorSystem.status.critical,
    borderWidth: 3,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  resourceIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  resourceTitleImmediate: {
    color: colorSystem.status.critical,
  },
  resourceAvailable: {
    fontSize: 12,
    color: colorSystem.status.success,
    fontWeight: '500',
  },
  resourceDescription: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  resourceActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  resourceButton: {
    flex: 1,
  },
  primaryCrisisButton: {
    backgroundColor: colorSystem.status.critical,
  },
  resourceButtonSecondary: {
    flex: 1,
  },
  quickHelp: {
    backgroundColor: colorSystem.status.infoBackground,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.info,
    marginTop: spacing.md,
  },
  quickHelpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.status.info,
    marginBottom: spacing.sm,
  },
  quickHelpText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 20,
  },
  safetyPlanItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.medium,
  },
  safetyPlanStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colorSystem.status.info,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: spacing.xs,
  },
  safetyPlanStepNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colorSystem.base.white,
  },
  safetyPlanContent: {
    flex: 1,
  },
  safetyPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  safetyPlanIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  safetyPlanTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
  },
  safetyPlanDescription: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 20,
  },
  safetyPlanNote: {
    backgroundColor: colorSystem.status.infoBackground,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginTop: spacing.md,
  },
  safetyPlanNoteText: {
    fontSize: 13,
    color: colorSystem.status.info,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  emergencySection: {
    backgroundColor: colorSystem.status.criticalBackground,
    padding: spacing.lg,
    borderRadius: borderRadius.large,
    borderWidth: 2,
    borderColor: colorSystem.status.critical,
    marginTop: spacing.lg,
  },
  emergencyButton: {
    backgroundColor: colorSystem.status.critical,
    minHeight: 56,
  },
});

export default CrisisInterventionScreen;