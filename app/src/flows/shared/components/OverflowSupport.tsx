/**
 * Overflow Support Component
 * CRITICAL CLINICAL SAFETY: Distress detection and intervention options
 * 
 * SAFETY FEATURES:
 * - Gentle, non-alarming presentation
 * - Multiple support options
 * - Crisis resource access
 * - Breathing space option
 * - Flow exit with affirmation
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  Pressable,
  Modal 
} from 'react-native';
import { colorSystem, spacing, borderRadius, typography } from '../../../constants/colors';
import SafetyButton from './SafetyButton';

interface OverflowSupportProps {
  visible: boolean;
  onClose: () => void;
  onBreathingSpace: () => void;
  onSkipToCompletion: () => void;
  onCrisisSupport: () => void;
  triggerReason: 'distress' | 'overflow' | 'difficulty';
  theme?: 'morning' | 'midday' | 'evening';
}

const OverflowSupport: React.FC<OverflowSupportProps> = ({
  visible,
  onClose,
  onBreathingSpace,
  onSkipToCompletion,
  onCrisisSupport,
  triggerReason,
  theme = 'evening',
}) => {
  const themeColors = colorSystem.themes[theme];

  const getTitle = () => {
    switch (triggerReason) {
      case 'distress':
        return 'Taking Care of Yourself';
      case 'overflow':
        return 'You\'re Noticing A Lot';
      case 'difficulty':
        return 'This Feels Heavy Right Now';
      default:
        return 'Support Options';
    }
  };

  const getMessage = () => {
    switch (triggerReason) {
      case 'distress':
        return 'You\'ve indicated some difficult feelings. It\'s completely okay to pause and choose what feels right for you now.';
      case 'overflow':
        return 'You\'re noticing many patterns or challenges. This awareness is valuable, and you can take care of yourself while processing it.';
      case 'difficulty':
        return 'If today brought intense difficulty, it\'s completely okay to choose gentleness over processing right now.';
      default:
        return 'What would feel most supportive right now?';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[
          styles.modalContainer,
          { borderColor: themeColors.primary }
        ]}>
          {/* Header */}
          <View style={[
            styles.header,
            { backgroundColor: themeColors.background }
          ]}>
            <Text style={styles.title}>{getTitle()}</Text>
            <Text style={styles.message}>{getMessage()}</Text>
          </View>

          {/* Support Options */}
          <View style={styles.optionsContainer}>
            
            {/* Breathing Space Option */}
            <Pressable
              style={[
                styles.optionButton,
                styles.primaryOption,
                { backgroundColor: themeColors.light }
              ]}
              onPress={onBreathingSpace}
              accessibilityRole="button"
              accessibilityLabel="Take a 2 minute breathing space"
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionIcon}>🌬️</Text>
                <View style={styles.optionTextContainer}>
                  <Text style={[
                    styles.optionTitle,
                    { color: themeColors.primary }
                  ]}>
                    Breathing Space (2 min)
                  </Text>
                  <Text style={styles.optionDescription}>
                    A gentle practice to find your center
                  </Text>
                </View>
              </View>
            </Pressable>

            {/* Skip to Rest Option */}
            <Pressable
              style={[
                styles.optionButton,
                { backgroundColor: colorSystem.base.white }
              ]}
              onPress={onSkipToCompletion}
              accessibilityRole="button"
              accessibilityLabel="Skip to rest preparation"
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionIcon}>🌙</Text>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>
                    Skip to Rest Preparation
                  </Text>
                  <Text style={styles.optionDescription}>
                    Move gently toward sleep and rest
                  </Text>
                </View>
              </View>
            </Pressable>

            {/* Continue Option */}
            <Pressable
              style={[
                styles.optionButton,
                { backgroundColor: colorSystem.base.white }
              ]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Continue with this reflection"
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionIcon}>💚</Text>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>
                    Continue Gently
                  </Text>
                  <Text style={styles.optionDescription}>
                    I feel ready to continue with kindness
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>

          {/* Crisis Support */}
          <View style={styles.crisisContainer}>
            <Text style={styles.crisisText}>
              If you're in crisis or need immediate support:
            </Text>
            <SafetyButton onPress={onCrisisSupport} />
          </View>

          {/* Gentle Reminder */}
          <View style={styles.reminderContainer}>
            <Text style={styles.reminderText}>
              Whatever you choose is exactly right. You know yourself best.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.large,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    padding: spacing.lg,
    borderTopLeftRadius: borderRadius.large,
    borderTopRightRadius: borderRadius.large,
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  title: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsContainer: {
    padding: spacing.lg,
  },
  optionButton: {
    borderRadius: borderRadius.medium,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  primaryOption: {
    borderWidth: 2,
    borderColor: colorSystem.themes.evening.primary,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  optionDescription: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    lineHeight: 18,
  },
  crisisContainer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
    alignItems: 'center',
  },
  crisisText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  reminderContainer: {
    padding: spacing.md,
    backgroundColor: colorSystem.gray[50],
    borderBottomLeftRadius: borderRadius.large,
    borderBottomRightRadius: borderRadius.large,
  },
  reminderText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});

export default OverflowSupport;