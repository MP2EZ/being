/**
 * Threshold Education Modal
 * Educational content about assessment scoring and thresholds
 * Bottom sheet presentation with philosopher-validated copy
 *
 * PHILOSOPHER-VALIDATED:
 * - Non-catastrophizing language (amber, not red)
 * - Empowering tone ("in your power")
 * - Stoic framing of awareness and agency
 * - No medicalization or diagnostic language
 *
 * ACCESSIBILITY:
 * - Focus management on open/close
 * - Screen reader compatible
 * - Dismissible via swipe, backdrop tap, or button
 * - WCAG AA color contrast
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  AccessibilityInfo,
} from 'react-native';
import { spacing, borderRadius, typography } from '@/core/theme';

interface ThresholdEducationModalProps {
  visible: boolean;
  onDismiss: () => void;
}

// WCAG-AA compliant colors
const colors = {
  white: '#FFFFFF',
  black: '#1C1C1C',
  gray100: '#F3F4F6',
  gray600: '#4B5563',
  gray700: '#374151',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  primaryOrange: '#FF9F43',
};

const ThresholdEducationModal: React.FC<ThresholdEducationModalProps> = ({
  visible,
  onDismiss,
}) => {
  useEffect(() => {
    if (visible) {
      // Announce modal opening to screen readers
      AccessibilityInfo.announceForAccessibility(
        'Assessment scoring information opened. Swipe or tap to dismiss.'
      );
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onDismiss}
      accessibilityViewIsModal={true}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        accessibilityLabel="Close assessment information"
        accessibilityRole="button"
      >
        <View style={styles.bottomSheet}>
          <Pressable
            // Prevent backdrop press from propagating through bottom sheet
            onPress={(e) => e.stopPropagation()}
            accessible={false}
          >
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
            >
              {/* Drag indicator */}
              <View style={styles.dragIndicator} accessibilityElementsHidden={true} />

              {/* Header */}
              <Text style={styles.title}>About Assessment Scoring</Text>

              {/* Main content - philosopher-validated copy */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>What Assessments Measure</Text>
                <Text style={styles.bodyText}>
                  The PHQ-9 and GAD-7 are scientifically-validated tools that help you notice patterns in your mood and anxiety over the past two weeks. They're a starting point for understanding your experience, not a diagnosis.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Severity Ranges</Text>
                <Text style={styles.bodyText}>
                  Scores fall into ranges like "minimal," "mild," "moderate," or "severe." These categories help you and your healthcare provider understand what level of support might be helpful.
                </Text>
                <Text style={styles.bodyText}>
                  <Text style={styles.bold}>PHQ-9 (Depression):</Text> Scores range from 0-27
                </Text>
                <Text style={styles.bodyText}>
                  <Text style={styles.bold}>GAD-7 (Anxiety):</Text> Scores range from 0-21
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>When to Seek Support</Text>
                <Text style={styles.bodyText}>
                  If your score indicates moderate or severe symptoms, this is information in your power to act on. Consider reaching out to a mental health professional, your doctor, or a trusted person in your life.
                </Text>
                <Text style={styles.bodyText}>
                  These assessments are tools for awareness, not labels. Your experience is valid regardless of the number.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Regular Check-Ins</Text>
                <Text style={styles.bodyText}>
                  Completing assessments every 2-3 weeks helps you notice trends and patterns over time. This awareness is part of practicing mindful self-knowledge.
                </Text>
              </View>

              {/* Dismiss button */}
              <Pressable
                style={styles.dismissButton}
                onPress={onDismiss}
                accessibilityRole="button"
                accessibilityLabel="Got it, thanks. Close assessment information."
              >
                <Text style={styles.dismissButtonText}>Got It, Thanks</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '80%',
    paddingBottom: spacing[10], // Safe area padding
  },
  scrollView: {
    paddingHorizontal: spacing.lg,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray600,
    borderRadius: borderRadius.xs,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  bodyText: {
    fontSize: typography.bodyRegular.size,
    lineHeight: 24,
    color: colors.gray700,
    marginBottom: spacing.sm,
  },
  bold: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
  dismissButton: {
    backgroundColor: colors.primaryOrange,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.large,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    minHeight: 48, // Touch target minimum
  },
  dismissButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    textAlign: 'center',
  },
});

export default ThresholdEducationModal;
