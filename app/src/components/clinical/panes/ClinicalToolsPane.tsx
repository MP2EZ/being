/**
 * ClinicalToolsPane Component
 *
 * Displays clinical assessment tools with PHQ-9/GAD-7 preview,
 * featuring interactive question examples and clinical accuracy metrics.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Vibration
} from 'react-native';

import { ClinicalPaneProps, AssessmentData } from '../types';
import { PHQAssessmentPreview } from '../components/PHQAssessmentPreview';
import { FeatureList } from '../components/FeatureList';
import { SecurityBadge } from '../components/SecurityBadge';
import { ClinicalIcon } from '../components/ClinicalIcon';

const ClinicalToolsPane: React.FC<ClinicalPaneProps> = memo(({ data, isActive }) => {
  const assessmentData = data.visual.data as AssessmentData;

  const clinicalFeatures = [
    'Share results securely with your therapist',
    'Track progress over time with detailed history',
    'Clinically validated with 95% accuracy rate'
  ];

  return (
    <View
      style={styles.paneContainer}
      accessible={true}
      accessibilityRole="tabpanel"
      accessibilityLabel={data.title}
      accessibilityState={{ selected: isActive }}
    >
      {/* Pane Header */}
      <View style={styles.paneHeader}>
        <ClinicalIcon
          type="assessment"
          size={32}
          color="#2C5282"
          accessibilityLabel="Clinical assessment tools icon"
        />
        <View style={styles.paneTitles}>
          <Text style={styles.paneTitle}>{data.title}</Text>
          <Text style={styles.paneSubtitle}>{data.subtitle}</Text>
        </View>
      </View>

      {/* Assessment Preview */}
      <View style={styles.assessmentSection}>
        <PHQAssessmentPreview
          data={assessmentData}
          title="PHQ-9 Depression Screening"
          subtitle="Hospital-grade diagnostic instrument"
        />
      </View>

      {/* Clinical Features */}
      <View style={styles.featuresSection}>
        <FeatureList
          features={clinicalFeatures}
          showIcons={true}
        />

        <SecurityBadge
          isHIPAAReady={true}
          encryptionStatus="AES-256"
          accessibilityLabel="HIPAA-ready with AES-256 encryption"
        />
      </View>

      {/* Call to Action */}
      {data.content.callToAction && (
        <Pressable
          onPressIn={() => {
            // CLINICAL: Medium haptic feedback for assessment tool interaction
            // Provides reassuring feedback for clinical tool engagement
            Vibration.vibrate(150); // Medium feedback for clinical assessment tools
          }}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={data.content.callToAction.text}
          accessibilityHint="Start a demo of the clinical assessment tools"
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.ctaButtonText}>
            {data.content.callToAction.text}
          </Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  paneContainer: {
    flex: 1,
    padding: 25,
    backgroundColor: 'transparent'
  },
  paneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    gap: 15
  },
  paneTitles: {
    flex: 1
  },
  paneTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A365D',
    marginBottom: 5,
    lineHeight: 30
  },
  paneSubtitle: {
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 22,
    fontWeight: '400'
  },
  assessmentSection: {
    marginBottom: 25
  },
  featuresSection: {
    marginBottom: 20,
    gap: 15
  },
  ctaButton: {
    backgroundColor: '#2C5282',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    // Minimum touch target for accessibility
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  }
});

ClinicalToolsPane.displayName = 'ClinicalToolsPane';

export { ClinicalToolsPane };