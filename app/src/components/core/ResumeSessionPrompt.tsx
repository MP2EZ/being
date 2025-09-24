/**
 * ResumeSessionPrompt - Modal/banner component for resuming interrupted sessions
 * Supportive and encouraging messaging for therapeutic continuity
 * 
 * ✅ PRESSABLE MIGRATION: TouchableOpacity → Pressable with New Architecture optimization
 * - Enhanced interaction handling for modal overlays
 * - Improved accessibility for session continuation prompts
 * - Optimized touch targets for therapeutic continuity features
 */

import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Pressable,
  Modal,
  Dimensions,
  Platform 
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Button } from './Button';
import { Card } from './Card';
import { SessionProgressBar } from './SessionProgressBar';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';

interface ResumeSessionPromptProps {
  isVisible: boolean;
  checkInType: 'morning' | 'midday' | 'evening';
  percentage: number;
  estimatedTimeRemaining?: number; // in seconds
  onContinue: () => void;
  onDismiss: () => void;
  variant?: 'modal' | 'banner';
  testID?: string;
}

export const ResumeSessionPrompt: React.FC<ResumeSessionPromptProps> = ({
  isVisible,
  checkInType,
  percentage,
  estimatedTimeRemaining,
  onContinue,
  onDismiss,
  variant = 'modal',
  testID
}) => {
  const { colorSystem } = useTheme();
  const { triggerHaptic } = useHaptics();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, fadeAnim, slideAnim]);

  const themeColors = colorSystem.themes[checkInType];
  
  const getCheckInDisplayName = (): string => {
    switch (checkInType) {
      case 'morning':
        return 'Morning Awareness';
      case 'midday':
        return 'Midday Reset';
      case 'evening':
        return 'Evening Reflection';
      default:
        return 'Check-in';
    }
  };

  const getEncouragingMessage = (): string => {
    if (percentage < 25) {
      return "You've started something meaningful. Continue your journey of mindful awareness.";
    } else if (percentage < 50) {
      return "You're making progress. Let's continue where you left off.";
    } else if (percentage < 75) {
      return "You're doing well. Just a little more to complete your practice.";
    } else {
      return "You're almost there! Complete your mindful check-in.";
    }
  };

  const formatTimeRemaining = (seconds?: number): string => {
    if (!seconds) return '';
    const minutes = Math.ceil(seconds / 60);
    return minutes <= 1 ? 'About 1 minute remaining' : `About ${minutes} minutes remaining`;
  };

  const handleContinue = async () => {
    await triggerHaptic('light');
    onContinue();
  };

  const handleDismiss = async () => {
    await triggerHaptic('light');
    onDismiss();
  };

  const renderContent = () => (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
      testID={testID}
    >
      <Card 
        theme={checkInType}
        style={[
          styles.promptCard,
          { borderColor: themeColors.primary, borderWidth: 2 }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text 
              style={[styles.title, { color: themeColors.primary }]}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
            >
              Continue Your Practice
            </Text>
            <Text 
              style={styles.subtitle}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.2}
            >
              {getCheckInDisplayName()}
            </Text>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <SessionProgressBar
            percentage={percentage}
            theme={checkInType}
            accessibilityLabel={`${getCheckInDisplayName()} progress: ${Math.round(percentage)}% complete`}
            testID={`${testID}-progress-bar`}
          />
          
          {estimatedTimeRemaining && (
            <Text 
              style={[styles.timeRemaining, { color: themeColors.primary }]}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.2}
            >
              {formatTimeRemaining(estimatedTimeRemaining)}
            </Text>
          )}
        </View>

        {/* Message */}
        <Text 
          style={styles.message}
          allowFontScaling={true}
          maxFontSizeMultiplier={1.2}
        >
          {getEncouragingMessage()}
        </Text>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            theme={checkInType}
            variant="primary"
            onPress={handleContinue}
            accessibilityLabel={`Continue ${getCheckInDisplayName()}`}
            accessibilityHint="Resume your check-in where you left off"
            testID={`${testID}-continue-button`}
          >
            Continue Where You Left Off
          </Button>
          
          <Button
            variant="outline"
            onPress={handleDismiss}
            accessibilityLabel="Dismiss resume prompt"
            accessibilityHint="Close this prompt and start a new check-in later"
            testID={`${testID}-dismiss-button`}
            style={styles.dismissButton}
          >
            Not Right Now
          </Button>
        </View>
      </Card>
    </Animated.View>
  );

  if (variant === 'banner') {
    return isVisible ? renderContent() : null;
  }

  // Modal variant
  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none" // We handle animation manually
      statusBarTranslucent={Platform.OS === 'android'}
      accessible={true}
      accessibilityViewIsModal={true}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={handleDismiss}
        accessible={false}
      >
        <View style={styles.modalContent}>
          <Pressable style={styles.modalTouchableContent}>
            {renderContent()}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: screenWidth - (spacing.md * 2),
    alignItems: 'center',
  },
  modalTouchableContent: {
    width: '100%',
  },
  
  // Main content
  container: {
    width: '100%',
  },
  promptCard: {
    marginBottom: 0, // Override Card default margin
    // Enhanced shadow for prominence
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  
  // Header
  header: {
    marginBottom: spacing.md,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colorSystem.gray[600],
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Progress section
  progressSection: {
    marginBottom: spacing.md,
  },
  timeRemaining: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  
  // Message
  message: {
    fontSize: 14,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  
  // Actions
  actions: {
    gap: spacing.sm,
  },
  dismissButton: {
    marginBottom: 0, // Override Button default margin
  },
});