/**
 * AccessibleAlert - Screen reader friendly alert replacement
 * CRITICAL: Used for life-safety crisis interventions
 * 
 * ✅ PRESSABLE MIGRATION: TouchableOpacity → Pressable with New Architecture optimization
 * - Enhanced android_ripple for emergency alert buttons
 * - Improved accessibility for crisis-critical interactions
 * - Optimized touch targets for life-safety features
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';

interface AccessibleAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive' | 'emergency';
    accessibilityLabel?: string;
  }>;
  onDismiss?: () => void;
  urgency?: 'low' | 'high' | 'emergency';
}

export const AccessibleAlert: React.FC<AccessibleAlertProps> = ({
  visible,
  title,
  message,
  buttons,
  onDismiss,
  urgency = 'low'
}) => {
  const titleRef = useRef<Text>(null);

  useEffect(() => {
    if (visible && urgency === 'emergency') {
      // Immediately announce emergency alerts
      const announcement = `URGENT: ${title}. ${message}`;
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [visible, title, message, urgency]);

  useEffect(() => {
    if (visible) {
      // Set focus to title when modal opens
      const timeout = setTimeout(() => {
        if (titleRef.current) {
          AccessibilityInfo.setAccessibilityFocus(titleRef.current as any);
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [visible]);

  const getButtonStyle = (style: string = 'default') => {
    switch (style) {
      case 'emergency':
        return {
          backgroundColor: colorSystem.status.critical,
          borderColor: colorSystem.base.white,
          borderWidth: 2,
        };
      case 'destructive':
        return {
          backgroundColor: colorSystem.status.error,
        };
      case 'cancel':
        return {
          backgroundColor: 'transparent',
          borderColor: colorSystem.gray[400],
          borderWidth: 1,
        };
      default:
        return {
          backgroundColor: colorSystem.status.info,
        };
    }
  };

  const getButtonTextColor = (style: string = 'default') => {
    return style === 'cancel' ? colorSystem.base.black : colorSystem.base.white;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
      accessibilityViewIsModal={true}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View 
            style={[
              styles.container,
              urgency === 'emergency' && styles.emergencyContainer
            ]}
            accessible={true}
            accessibilityRole="alert"
            accessibilityLabel={`${title} alert dialog`}
          >
            <Text
              ref={titleRef}
              style={[
                styles.title,
                urgency === 'emergency' && styles.emergencyTitle
              ]}
              accessibilityRole="header"
              accessible={true}
            >
              {title}
            </Text>
            
            <Text 
              style={styles.message}
              accessible={true}
              accessibilityLiveRegion={urgency === 'emergency' ? 'assertive' : 'polite'}
            >
              {message}
            </Text>

            <View style={styles.buttonContainer}>
              {buttons.map((button, index) => (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    styles.button,
                    getButtonStyle(button.style || 'default'),
                    buttons.length === 1 && styles.singleButton,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                  ]}
                  onPress={button.onPress}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={
                    button.accessibilityLabel || 
                    `${button.text} button`
                  }
                  accessibilityHint={
                    button.style === 'emergency' 
                      ? 'Calls emergency hotline immediately'
                      : undefined
                  }
                  android_ripple={{
                    color: button.style === 'emergency' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)',
                    borderless: false,
                    radius: 150
                  }}
                  hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}
                >
                  <Text 
                    style={[
                      styles.buttonText,
                      { color: getButtonTextColor(button.style || 'default') },
                      button.style === 'emergency' && styles.emergencyButtonText
                    ]}
                  >
                    {button.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </SafeAreaView>
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
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  container: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.large,
    padding: spacing.xl,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  emergencyContainer: {
    borderColor: colorSystem.status.critical,
    borderWidth: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emergencyTitle: {
    color: colorSystem.status.critical,
    fontSize: 22,
    fontWeight: '700',
  },
  message: {
    fontSize: 16,
    color: colorSystem.gray[700],
    lineHeight: 22,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.medium,
    minHeight: 48, // Larger than 44pt for crisis situations
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleButton: {
    minHeight: 52, // Even larger for single emergency button
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  emergencyButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
});