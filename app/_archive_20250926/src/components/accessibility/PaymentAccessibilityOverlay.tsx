/**
 * Payment Accessibility Overlay - High Contrast & Reduced Motion Support
 *
 * VISUAL ACCESSIBILITY FEATURES:
 * - High contrast mode with 7:1 ratios for crisis elements
 * - Reduced motion preferences for animations
 * - Color-blind friendly status indicators
 * - Text scaling support up to 200%
 * - Focus indicators with sufficient contrast
 *
 * COGNITIVE ACCESSIBILITY:
 * - Simple, clear language for all payment instructions
 * - Progressive disclosure for complex forms
 * - Consistent navigation patterns
 * - Stress-reducing visual design
 * - Context help at each step
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Switch,
  Slider,
  Alert,
  AccessibilityInfo,
  Animated,
  Dimensions,
} from 'react-native';
import { usePaymentAccessibility } from './PaymentAccessibilityProvider';
import { colorSystem, spacing, typography, borderRadius } from '../../constants/colors';

interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  textScale: number;
  simplifiedLanguage: boolean;
  extraGuidance: boolean;
  colorBlindSupport: boolean;
}

interface PaymentAccessibilityOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSettingsChange: (settings: AccessibilitySettings) => void;
}

export const PaymentAccessibilityOverlay: React.FC<PaymentAccessibilityOverlayProps> = ({
  visible,
  onClose,
  onSettingsChange,
}) => {
  const {
    isScreenReaderEnabled,
    isHighContrastEnabled,
    isReduceMotionEnabled,
    preferredFontSize,
    announceForScreenReader,
  } = usePaymentAccessibility();

  // Animation values
  const slideAnimation = new Animated.Value(0);
  const fadeAnimation = new Animated.Value(0);

  // Settings state
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: isHighContrastEnabled,
    reducedMotion: isReduceMotionEnabled,
    largeText: preferredFontSize > 16,
    textScale: Math.max(1.0, Math.min(2.0, preferredFontSize / 16)),
    simplifiedLanguage: false,
    extraGuidance: isScreenReaderEnabled,
    colorBlindSupport: false,
  });

  // Screen dimensions for responsive design
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    if (visible) {
      // Entrance animation
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 1,
          duration: isReduceMotionEnabled ? 150 : 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: isReduceMotionEnabled ? 100 : 200,
          useNativeDriver: true,
        }),
      ]).start();

      announceForScreenReader(
        'Payment accessibility settings opened. You can customize the interface to better meet your needs.',
        'polite'
      );
    } else {
      // Exit animation
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: isReduceMotionEnabled ? 100 : 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 0,
          duration: isReduceMotionEnabled ? 50 : 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, isReduceMotionEnabled, announceForScreenReader]);

  // Update settings and notify parent
  const updateSetting = useCallback((key: keyof AccessibilitySettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange(newSettings);

    // Announce change to screen reader
    const settingNames: Record<keyof AccessibilitySettings, string> = {
      highContrast: 'High contrast mode',
      reducedMotion: 'Reduced motion',
      largeText: 'Large text',
      textScale: 'Text size',
      simplifiedLanguage: 'Simplified language',
      extraGuidance: 'Extra guidance',
      colorBlindSupport: 'Color blind support',
    };

    const settingName = settingNames[key];
    const valueDescription = typeof value === 'boolean'
      ? (value ? 'enabled' : 'disabled')
      : `set to ${value}`;

    announceForScreenReader(`${settingName} ${valueDescription}`, 'polite');
  }, [settings, onSettingsChange, announceForScreenReader]);

  // Get dynamic colors based on current settings
  const getColors = useCallback(() => {
    if (settings.highContrast) {
      return {
        background: '#FFFFFF',
        text: '#000000',
        border: '#000000',
        accent: '#0066CC',
        success: '#006600',
        warning: '#CC6600',
        error: '#CC0000',
      };
    }

    return {
      background: colorSystem.base.white,
      text: colorSystem.accessibility.text.primary,
      border: colorSystem.gray[300],
      accent: colorSystem.status.info,
      success: colorSystem.status.success,
      warning: colorSystem.status.warning,
      error: colorSystem.status.error,
    };
  }, [settings.highContrast]);

  const colors = getColors();

  // Settings sections
  const renderSettingToggle = (
    key: keyof AccessibilitySettings,
    label: string,
    description: string,
    value: boolean,
    isDisabled: boolean = false
  ) => (
    <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.settingDescription, { color: colors.text, opacity: 0.7 }]}>
          {description}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={(newValue) => updateSetting(key, newValue)}
        disabled={isDisabled}
        trackColor={{
          false: colors.border,
          true: colors.accent,
        }}
        thumbColor={value ? colors.background : colors.border}
        accessible={true}
        accessibilityLabel={`${label} toggle`}
        accessibilityHint={`Currently ${value ? 'enabled' : 'disabled'}. ${description}`}
        accessibilityState={{ disabled: isDisabled }}
      />
    </View>
  );

  const renderTextScaleSlider = () => (
    <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>Text Size</Text>
        <Text style={[styles.settingDescription, { color: colors.text, opacity: 0.7 }]}>
          Adjust text size for better readability
        </Text>

        <View style={styles.sliderContainer}>
          <Text style={[styles.sliderLabel, { color: colors.text }]}>A</Text>
          <Slider
            style={styles.slider}
            value={settings.textScale}
            onValueChange={(value) => updateSetting('textScale', value)}
            minimumValue={1.0}
            maximumValue={2.0}
            step={0.1}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.accent}
            accessible={true}
            accessibilityLabel="Text size slider"
            accessibilityHint={`Current size is ${Math.round(settings.textScale * 100)}%. Slide to adjust.`}
          />
          <Text style={[styles.sliderLabel, { color: colors.text, fontSize: 20 }]}>A</Text>
        </View>

        <Text style={[styles.scaleValue, { color: colors.text }]}>
          Current: {Math.round(settings.textScale * 100)}%
        </Text>
      </View>
    </View>
  );

  const renderPreviewSection = () => (
    <View style={[styles.previewSection, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={[styles.previewTitle, { color: colors.text }]}>Preview</Text>

      <View style={styles.previewContent}>
        <Text style={[
          styles.previewText,
          {
            color: colors.text,
            fontSize: 16 * settings.textScale,
          }
        ]}>
          {settings.simplifiedLanguage
            ? 'This is how text will look with your settings.'
            : 'This demonstrates the visual appearance of text content with your current accessibility preferences applied.'
          }
        </Text>

        {/* Payment element preview */}
        <View style={[
          styles.previewPaymentElement,
          {
            backgroundColor: settings.highContrast ? '#F0F0F0' : colorSystem.gray[50],
            borderColor: colors.border,
            borderWidth: settings.highContrast ? 2 : 1,
          }
        ]}>
          <Text style={[
            styles.previewPaymentLabel,
            {
              color: colors.text,
              fontSize: 14 * settings.textScale,
            }
          ]}>
            Card Number
          </Text>
          <View style={[
            styles.previewInput,
            {
              borderColor: colors.border,
              borderWidth: settings.highContrast ? 2 : 1,
            }
          ]}>
            <Text style={[
              styles.previewInputText,
              {
                color: colors.text,
                opacity: 0.5,
                fontSize: 16 * settings.textScale,
              }
            ]}>
              1234 5678 9012 3456
            </Text>
          </View>
        </View>

        {/* Crisis button preview */}
        <TouchableOpacity
          style={[
            styles.previewCrisisButton,
            {
              backgroundColor: settings.highContrast ? '#CC0000' : colors.error,
              borderWidth: settings.highContrast ? 3 : 0,
              borderColor: settings.highContrast ? '#000000' : 'transparent',
            }
          ]}
          disabled={true}
          accessible={true}
          accessibilityLabel="Crisis button preview"
          accessibilityHint="This shows how the crisis button will appear"
        >
          <Text style={[
            styles.previewCrisisButtonText,
            {
              color: colors.background,
              fontSize: 14 * settings.textScale,
              fontWeight: settings.highContrast ? '800' : '700',
            }
          ]}>
            🆘 988 Crisis Support
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Quick settings presets
  const applyPreset = useCallback((presetName: string) => {
    let presetSettings: AccessibilitySettings;

    switch (presetName) {
      case 'crisis':
        presetSettings = {
          highContrast: true,
          reducedMotion: true,
          largeText: true,
          textScale: 1.4,
          simplifiedLanguage: true,
          extraGuidance: true,
          colorBlindSupport: true,
        };
        break;

      case 'visual':
        presetSettings = {
          highContrast: true,
          reducedMotion: false,
          largeText: true,
          textScale: 1.6,
          simplifiedLanguage: false,
          extraGuidance: false,
          colorBlindSupport: true,
        };
        break;

      case 'cognitive':
        presetSettings = {
          highContrast: false,
          reducedMotion: true,
          largeText: true,
          textScale: 1.2,
          simplifiedLanguage: true,
          extraGuidance: true,
          colorBlindSupport: false,
        };
        break;

      default:
        presetSettings = {
          highContrast: false,
          reducedMotion: false,
          largeText: false,
          textScale: 1.0,
          simplifiedLanguage: false,
          extraGuidance: false,
          colorBlindSupport: false,
        };
    }

    setSettings(presetSettings);
    onSettingsChange(presetSettings);

    announceForScreenReader(
      `Applied ${presetName} accessibility preset. Settings have been optimized for ${presetName} accessibility needs.`,
      'polite'
    );
  }, [onSettingsChange, announceForScreenReader]);

  const renderQuickPresets = () => (
    <View style={[styles.presetsSection, { borderColor: colors.border }]}>
      <Text style={[styles.presetTitle, { color: colors.text }]}>Quick Settings</Text>
      <Text style={[styles.presetDescription, { color: colors.text, opacity: 0.7 }]}>
        Choose a preset that matches your accessibility needs
      </Text>

      <View style={styles.presetButtons}>
        {[
          { key: 'default', label: 'Standard', description: 'Default settings' },
          { key: 'crisis', label: 'Crisis Mode', description: 'High contrast, simplified, extra support' },
          { key: 'visual', label: 'Visual Support', description: 'Enhanced contrast and text size' },
          { key: 'cognitive', label: 'Cognitive Support', description: 'Simplified language and guidance' },
        ].map((preset) => (
          <TouchableOpacity
            key={preset.key}
            style={[
              styles.presetButton,
              {
                backgroundColor: colors.background,
                borderColor: colors.accent,
                borderWidth: settings.highContrast ? 2 : 1,
              }
            ]}
            onPress={() => applyPreset(preset.key)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Apply ${preset.label} preset`}
            accessibilityHint={preset.description}
          >
            <Text style={[
              styles.presetButtonText,
              {
                color: colors.accent,
                fontSize: 14 * settings.textScale,
                fontWeight: settings.highContrast ? '700' : '600',
              }
            ]}>
              {preset.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const slideTransform = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth, 0],
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      accessible={true}
      accessibilityViewIsModal={true}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnimation }]}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          accessible={true}
          accessibilityLabel="Close accessibility settings"
          accessibilityHint="Tap to close the accessibility settings overlay"
        />

        <Animated.View
          style={[
            styles.panel,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              transform: [{ translateX: slideTransform }],
            }
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Payment Accessibility
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={[styles.closeButtonText, { color: colors.accent }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Quick Presets */}
            {renderQuickPresets()}

            {/* Individual Settings */}
            <View style={styles.settingsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Individual Settings
              </Text>

              {renderSettingToggle(
                'highContrast',
                'High Contrast',
                'Increases contrast for better visibility',
                settings.highContrast
              )}

              {renderSettingToggle(
                'reducedMotion',
                'Reduced Motion',
                'Minimizes animations and transitions',
                settings.reducedMotion
              )}

              {renderTextScaleSlider()}

              {renderSettingToggle(
                'simplifiedLanguage',
                'Simplified Language',
                'Uses clearer, simpler language throughout',
                settings.simplifiedLanguage
              )}

              {renderSettingToggle(
                'extraGuidance',
                'Extra Guidance',
                'Provides additional help and instructions',
                settings.extraGuidance
              )}

              {renderSettingToggle(
                'colorBlindSupport',
                'Color Blind Support',
                'Uses patterns and shapes in addition to colors',
                settings.colorBlindSupport
              )}
            </View>

            {/* Preview */}
            {renderPreviewSection()}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },

  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  panel: {
    width: '85%',
    maxWidth: 400,
    height: '100%',
    borderLeftWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },

  headerTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
  },

  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },

  // Quick Presets
  presetsSection: {
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },

  presetTitle: {
    fontSize: typography.headline3.size,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },

  presetDescription: {
    fontSize: typography.caption.size,
    marginBottom: spacing.md,
  },

  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  presetButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.small,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },

  presetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Settings
  settingsSection: {
    paddingVertical: spacing.lg,
  },

  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: '600',
    marginBottom: spacing.md,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },

  settingContent: {
    flex: 1,
    marginRight: spacing.md,
  },

  settingLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },

  settingDescription: {
    fontSize: typography.caption.size,
  },

  // Text Scale Slider
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },

  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: spacing.sm,
  },

  sliderLabel: {
    fontSize: 16,
    fontWeight: '500',
  },

  scaleValue: {
    fontSize: typography.caption.size,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Preview Section
  previewSection: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
  },

  previewTitle: {
    fontSize: typography.headline3.size,
    fontWeight: '600',
    marginBottom: spacing.md,
  },

  previewContent: {
    gap: spacing.md,
  },

  previewText: {
    lineHeight: 24,
  },

  previewPaymentElement: {
    padding: spacing.md,
    borderRadius: borderRadius.small,
  },

  previewPaymentLabel: {
    fontWeight: '600',
    marginBottom: spacing.sm,
  },

  previewInput: {
    borderRadius: borderRadius.small,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },

  previewInputText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  previewCrisisButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.small,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },

  previewCrisisButtonText: {
    fontWeight: '700',
  },
});

export default PaymentAccessibilityOverlay;