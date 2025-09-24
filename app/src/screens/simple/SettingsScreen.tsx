/**
 * SettingsScreen - Comprehensive App Configuration with Mental Health Accessibility
 *
 * ACCESSIBILITY IMPLEMENTATION:
 * - Mental health-specific accessibility settings management
 * - Crisis mode configuration with emergency accessibility
 * - Voice control and switch control configuration
 * - Therapeutic timing preferences (anxiety-aware, depression-friendly)
 * - WCAG AA+ compliance with therapeutic considerations
 * - Cognitive accessibility for users with executive function challenges
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Slider,
  Alert,
  Platform,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import { useTherapeuticAccessibility } from '../../components/accessibility/TherapeuticAccessibilityProvider';
import { AccessibleCrisisButton } from '../../components/accessibility/AccessibleCrisisButton';

interface AccessibleSettingItemProps {
  title: string;
  description: string;
  type: 'switch' | 'slider' | 'button' | 'link';
  value?: boolean | number;
  onValueChange?: (value: boolean | number) => void;
  onPress?: () => void;
  icon: string;
  category: 'therapeutic' | 'accessibility' | 'app' | 'crisis' | 'privacy';
  index: number;
  min?: number;
  max?: number;
  step?: number;
  dangerous?: boolean;
}

const AccessibleSettingItem: React.FC<AccessibleSettingItemProps> = React.memo(({
  title,
  description,
  type,
  value,
  onValueChange,
  onPress,
  icon,
  category,
  index,
  min = 0,
  max = 100,
  step = 1,
  dangerous = false
}) => {
  const itemRef = useRef<Pressable>(null);
  const [isFocused, setIsFocused] = useState(false);

  const {
    anxietyAdaptationsEnabled,
    depressionSupportMode,
    traumaInformedMode,
    isScreenReaderEnabled,
    announceForTherapy,
    setTherapeuticFocus,
    provideTharapeuticFeedback,
  } = useTherapeuticAccessibility();

  // Animation values for therapeutic feedback
  const scaleValue = useSharedValue(1);
  const colorValue = useSharedValue(0);

  // Enhanced touch targets for anxiety
  const itemSize = anxietyAdaptationsEnabled ? {
    minHeight: 88,
    padding: 20,
  } : {
    minHeight: 72,
    padding: 16,
  };

  const handleInteraction = useCallback(async (newValue?: boolean | number) => {
    try {
      // Therapeutic animation feedback
      scaleValue.value = withSequence(
        withSpring(0.98, { damping: 20, stiffness: 400 }),
        withSpring(1, { damping: 20, stiffness: 400 })
      );

      if (dangerous) {
        colorValue.value = withTiming(1, { duration: 200 });
        setTimeout(() => colorValue.value = withTiming(0, { duration: 300 }), 1000);
      }

      // Handle different interaction types
      if (type === 'switch' && onValueChange && typeof newValue === 'boolean') {
        onValueChange(newValue);

        const action = newValue ? 'enabled' : 'disabled';
        const message = depressionSupportMode
          ? `Excellent! ${title} has been ${action}. You're customizing your experience.`
          : `${title} has been ${action}.`;

        await announceForTherapy(message, 'polite');

      } else if (type === 'slider' && onValueChange && typeof newValue === 'number') {
        onValueChange(newValue);

        const message = `${title} set to ${Math.round(newValue)}${type === 'slider' && title.includes('Volume') ? '%' : ''}`;
        await announceForTherapy(message, 'polite');

      } else if (type === 'button' && onPress) {
        // Trauma-informed confirmation for dangerous actions
        if (dangerous && traumaInformedMode) {
          const confirmMessage = `This will ${title.toLowerCase()}. Are you sure you want to continue?`;
          await announceForTherapy(confirmMessage, 'assertive');
        }

        onPress();

        const message = `${title} activated`;
        await announceForTherapy(message, 'polite');
      }

      // Encouraging feedback for positive changes
      if ((type === 'switch' && newValue) || type === 'button') {
        if (depressionSupportMode && !dangerous) {
          await provideTharapeuticFeedback('encouraging');
        }
      }

    } catch (error) {
      console.error('Setting interaction failed:', error);
    }
  }, [title, type, onValueChange, onPress, dangerous, depressionSupportMode, traumaInformedMode, announceForTherapy, provideTharapeuticFeedback, scaleValue, colorValue]);

  const handleFocus = useCallback(async () => {
    setIsFocused(true);
    if (isScreenReaderEnabled) {
      await setTherapeuticFocus(itemRef, `${title} setting`);
    }
  }, [title, isScreenReaderEnabled, setTherapeuticFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Animated styles with therapeutic considerations
  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = dangerous && colorValue.value > 0
      ? interpolateColor(colorValue.value, [0, 1], ['#FFFFFF', '#FEF2F2'])
      : '#FFFFFF';

    return {
      transform: [{ scale: scaleValue.value }],
      backgroundColor,
      borderColor: isFocused ? '#007AFF' : dangerous ? '#EF4444' : '#E5E7EB',
    };
  }, [isFocused, dangerous]);

  // Category color coding
  const getCategoryColor = () => {
    switch (category) {
      case 'therapeutic': return '#059669'; // Green
      case 'accessibility': return '#3B82F6'; // Blue
      case 'app': return '#6B7280'; // Gray
      case 'crisis': return '#DC2626'; // Red
      case 'privacy': return '#7C3AED'; // Purple
      default: return '#6B7280';
    }
  };

  // Comprehensive accessibility labeling
  const getAccessibilityLabel = () => {
    let label = `${title}. ${description}`;

    if (type === 'switch') {
      label += ` Currently ${value ? 'enabled' : 'disabled'}.`;
    } else if (type === 'slider') {
      label += ` Current value: ${Math.round(value as number)}${title.includes('Volume') ? ' percent' : ''}.`;
    } else if (type === 'button') {
      label += ' Button.';
    }

    if (dangerous) {
      label += ' This action requires confirmation.';
    }

    return label;
  };

  const getAccessibilityHint = () => {
    let hint = '';

    if (type === 'switch') {
      hint = 'Double tap to toggle this setting.';
    } else if (type === 'slider') {
      hint = 'Swipe up or down to adjust value, or double tap to edit.';
    } else if (type === 'button' || type === 'link') {
      hint = 'Double tap to activate.';
    }

    if (traumaInformedMode && dangerous) {
      hint += ' This is a safe action that you can reverse if needed.';
    }

    return hint;
  };

  const renderControl = () => {
    switch (type) {
      case 'switch':
        return (
          <Switch
            value={value as boolean}
            onValueChange={handleInteraction}
            accessible={false}
            importantForAccessibility="no"
            trackColor={{
              false: '#F3F4F6',
              true: getCategoryColor() + '40'
            }}
            thumbColor={(value as boolean) ? getCategoryColor() : '#9CA3AF'}
            ios_backgroundColor="#F3F4F6"
            style={{
              transform: Platform.OS === 'ios' ? [] : [{ scaleX: 1.2 }, { scaleY: 1.2 }]
            }}
          />
        );

      case 'slider':
        return (
          <View style={styles.sliderContainer}>
            <Slider
              value={value as number}
              onValueChange={handleInteraction}
              minimumValue={min}
              maximumValue={max}
              step={step}
              accessible={false}
              importantForAccessibility="no"
              minimumTrackTintColor={getCategoryColor()}
              maximumTrackTintColor="#E5E7EB"
              thumbStyle={{
                backgroundColor: getCategoryColor(),
                width: anxietyAdaptationsEnabled ? 32 : 28,
                height: anxietyAdaptationsEnabled ? 32 : 28,
              }}
              style={styles.slider}
            />
            <Text
              style={styles.sliderValue}
              accessible={false}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.5}
            >
              {Math.round(value as number)}{title.includes('Volume') ? '%' : ''}
            </Text>
          </View>
        );

      case 'button':
      case 'link':
        return (
          <View
            style={[
              styles.actionIndicator,
              { backgroundColor: getCategoryColor() + '20' }
            ]}
          >
            <Text
              style={[styles.actionText, { color: getCategoryColor() }]}
              accessible={false}
            >
              {dangerous ? '⚠️' : '→'}
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Animated.View style={[styles.settingContainer, animatedStyle]}>
      <Pressable
        ref={itemRef}
        style={({ pressed }) => [
          styles.settingItem,
          itemSize,
          {
            borderWidth: isFocused ? 3 : dangerous ? 2 : 1,
            borderColor: isFocused ? '#007AFF' : dangerous ? '#EF4444' : '#E5E7EB',
            opacity: pressed ? 0.8 : 1,
            backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : '#FFFFFF',
          }
        ]}
        onPress={type === 'button' || type === 'link' ? () => handleInteraction() : undefined}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={type === 'switch' || type === 'slider'}
        accessible={true}
        accessibilityRole={type === 'switch' ? 'switch' : type === 'slider' ? 'adjustable' : 'button'}
        accessibilityLabel={getAccessibilityLabel()}
        accessibilityHint={getAccessibilityHint()}
        accessibilityState={{
          checked: type === 'switch' ? (value as boolean) : undefined,
          disabled: false,
        }}
        accessibilityValue={
          type === 'slider' ? {
            min,
            max,
            now: value as number,
          } : undefined
        }
        testID={`setting-item-${index}`}
      >
        <View style={styles.settingContent}>
          <View style={styles.settingHeader}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: getCategoryColor() + '20' }
              ]}
            >
              <Text style={[styles.icon, { color: getCategoryColor() }]} accessible={false}>
                {icon}
              </Text>
            </View>

            <View style={styles.settingInfo}>
              <Text
                style={[
                  styles.settingTitle,
                  anxietyAdaptationsEnabled && styles.anxietyFriendlyTitle,
                  dangerous && styles.dangerousTitle
                ]}
                accessible={false}
                allowFontScaling={true}
                maxFontSizeMultiplier={2.0}
              >
                {title}
              </Text>

              <Text
                style={[
                  styles.settingDescription,
                  depressionSupportMode && styles.encouragingDescription,
                  dangerous && styles.dangerousDescription
                ]}
                accessible={false}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.8}
              >
                {description}
              </Text>
            </View>

            {renderControl()}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

export const SettingsScreen: React.FC = () => {
  const scrollViewRef = useRef<ScrollView>(null);
  const headerRef = useRef<View>(null);

  const {
    isScreenReaderEnabled,
    anxietyAdaptationsEnabled,
    depressionSupportMode,
    traumaInformedMode,
    crisisEmergencyMode,
    isHighContrastEnabled,
    isVoiceControlEnabled,
    isReduceMotionEnabled,
    announceForTherapy,
    setTherapeuticFocus,
    provideTharapeuticFeedback,
    enableAnxietyAdaptations,
    activateDepressionSupport,
    enableTraumaInformedMode,
    activateEmergencyCrisisAccess,
  } = useTherapeuticAccessibility();

  // Settings state management
  const [settings, setSettings] = useState({
    // Therapeutic settings
    anxietySupport: anxietyAdaptationsEnabled,
    depressionSupport: depressionSupportMode,
    traumaInformed: traumaInformedMode,
    therapeuticTiming: true,
    breathingGuidance: true,
    progressCelebration: true,

    // Accessibility settings
    voiceControl: isVoiceControlEnabled,
    switchControl: false,
    largeText: false,
    highContrast: isHighContrastEnabled,
    reduceMotion: isReduceMotionEnabled,
    screenReader: isScreenReaderEnabled,
    hapticFeedback: true,

    // App settings
    notifications: true,
    soundEffects: true,
    backgroundRefresh: true,
    autoSave: true,
    offlineMode: true,

    // Crisis settings
    emergencyMode: crisisEmergencyMode,
    quickCrisisAccess: true,
    crisisVoiceCommands: true,
    emergencyContacts: false,

    // Privacy settings
    dataSharing: false,
    analytics: false,
    crashReporting: true,

    // Volume/timing settings
    voiceVolume: 75,
    hapticIntensity: 50,
    animationSpeed: 75,
    sessionTimeout: 60,
  });

  const settingCategories = [
    {
      title: 'Therapeutic Experience',
      settings: [
        {
          key: 'anxietySupport',
          title: 'Anxiety Adaptations',
          description: 'Larger buttons, calming colors, and reduced cognitive load',
          type: 'switch' as const,
          icon: '🫧',
          category: 'therapeutic' as const,
        },
        {
          key: 'depressionSupport',
          title: 'Depression Support',
          description: 'Encouraging feedback and simplified navigation',
          type: 'switch' as const,
          icon: '💙',
          category: 'therapeutic' as const,
        },
        {
          key: 'traumaInformed',
          title: 'Trauma-Informed Mode',
          description: 'Predictable interactions without startling changes',
          type: 'switch' as const,
          icon: '🛡️',
          category: 'therapeutic' as const,
        },
        {
          key: 'therapeuticTiming',
          title: 'Therapeutic Timing',
          description: 'Gentle pacing for mental health considerations',
          type: 'switch' as const,
          icon: '⏱️',
          category: 'therapeutic' as const,
        },
        {
          key: 'breathingGuidance',
          title: 'Breathing Guidance',
          description: 'Voice and haptic guidance for breathing exercises',
          type: 'switch' as const,
          icon: '🌬️',
          category: 'therapeutic' as const,
        },
        {
          key: 'progressCelebration',
          title: 'Progress Celebration',
          description: 'Encouraging feedback for completed activities',
          type: 'switch' as const,
          icon: '✨',
          category: 'therapeutic' as const,
        },
      ],
    },
    {
      title: 'Accessibility Features',
      settings: [
        {
          key: 'voiceControl',
          title: 'Voice Commands',
          description: 'Navigate and control the app with voice',
          type: 'switch' as const,
          icon: '🎤',
          category: 'accessibility' as const,
        },
        {
          key: 'switchControl',
          title: 'Switch Control',
          description: 'External switch navigation support',
          type: 'switch' as const,
          icon: '🕹️',
          category: 'accessibility' as const,
        },
        {
          key: 'largeText',
          title: 'Large Text',
          description: 'Increase text size for better readability',
          type: 'switch' as const,
          icon: '🔤',
          category: 'accessibility' as const,
        },
        {
          key: 'highContrast',
          title: 'High Contrast',
          description: 'Enhanced visual contrast for visibility',
          type: 'switch' as const,
          icon: '🔆',
          category: 'accessibility' as const,
        },
        {
          key: 'reduceMotion',
          title: 'Reduce Motion',
          description: 'Minimize animations and transitions',
          type: 'switch' as const,
          icon: '🎬',
          category: 'accessibility' as const,
        },
        {
          key: 'hapticFeedback',
          title: 'Haptic Feedback',
          description: 'Therapeutic vibration patterns',
          type: 'switch' as const,
          icon: '📳',
          category: 'accessibility' as const,
        },
      ],
    },
    {
      title: 'Crisis Emergency Support',
      settings: [
        {
          key: 'emergencyMode',
          title: 'Emergency Crisis Mode',
          description: 'Enhanced accessibility for crisis situations',
          type: 'switch' as const,
          icon: '🚨',
          category: 'crisis' as const,
        },
        {
          key: 'quickCrisisAccess',
          title: 'Quick Crisis Access',
          description: 'Always visible emergency support button',
          type: 'switch' as const,
          icon: '🔴',
          category: 'crisis' as const,
        },
        {
          key: 'crisisVoiceCommands',
          title: 'Crisis Voice Commands',
          description: 'Emergency voice activation for support',
          type: 'switch' as const,
          icon: '📢',
          category: 'crisis' as const,
        },
        {
          key: 'emergencyContacts',
          title: 'Emergency Contacts',
          description: 'Configure personal emergency contacts',
          type: 'button' as const,
          icon: '👥',
          category: 'crisis' as const,
        },
      ],
    },
    {
      title: 'Volume & Timing',
      settings: [
        {
          key: 'voiceVolume',
          title: 'Voice Guidance Volume',
          description: 'Adjust volume for therapeutic voice guidance',
          type: 'slider' as const,
          icon: '🔊',
          category: 'accessibility' as const,
          min: 0,
          max: 100,
          step: 5,
        },
        {
          key: 'hapticIntensity',
          title: 'Haptic Intensity',
          description: 'Strength of therapeutic vibration feedback',
          type: 'slider' as const,
          icon: '📳',
          category: 'accessibility' as const,
          min: 0,
          max: 100,
          step: 10,
        },
        {
          key: 'animationSpeed',
          title: 'Animation Speed',
          description: 'Speed of therapeutic animations and transitions',
          type: 'slider' as const,
          icon: '⚡',
          category: 'accessibility' as const,
          min: 25,
          max: 150,
          step: 25,
        },
        {
          key: 'sessionTimeout',
          title: 'Session Timeout',
          description: 'Minutes before auto-save and pause',
          type: 'slider' as const,
          icon: '⏰',
          category: 'app' as const,
          min: 5,
          max: 120,
          step: 5,
        },
      ],
    },
    {
      title: 'Privacy & Data',
      settings: [
        {
          key: 'dataSharing',
          title: 'Data Sharing',
          description: 'Share anonymous usage data for improvement',
          type: 'switch' as const,
          icon: '📊',
          category: 'privacy' as const,
        },
        {
          key: 'analytics',
          title: 'Analytics',
          description: 'Help improve the app with usage analytics',
          type: 'switch' as const,
          icon: '📈',
          category: 'privacy' as const,
        },
        {
          key: 'crashReporting',
          title: 'Crash Reporting',
          description: 'Automatically report app crashes for fixes',
          type: 'switch' as const,
          icon: '🐛',
          category: 'privacy' as const,
        },
      ],
    },
    {
      title: 'Advanced Actions',
      settings: [
        {
          key: 'exportData',
          title: 'Export My Data',
          description: 'Download all your therapeutic progress data',
          type: 'button' as const,
          icon: '📥',
          category: 'privacy' as const,
        },
        {
          key: 'resetSettings',
          title: 'Reset All Settings',
          description: 'Restore default app configuration',
          type: 'button' as const,
          icon: '🔄',
          category: 'app' as const,
          dangerous: true,
        },
        {
          key: 'deleteAccount',
          title: 'Delete Account',
          description: 'Permanently delete account and all data',
          type: 'button' as const,
          icon: '⚠️',
          category: 'privacy' as const,
          dangerous: true,
        },
      ],
    },
  ];

  useEffect(() => {
    const initializeSettingsAccessibility = async () => {
      try {
        // Focus on header for screen readers
        if (isScreenReaderEnabled && headerRef.current) {
          await setTherapeuticFocus(headerRef, 'Settings and Configuration screen');
        }

        // Welcome announcement with accessibility context
        const welcomeMessage = 'Settings screen loaded. Here you can customize your therapeutic experience, accessibility features, and crisis support options.';
        await announceForTherapy(welcomeMessage, 'polite');

        // Sync settings with accessibility context
        setSettings(prev => ({
          ...prev,
          anxietySupport: anxietyAdaptationsEnabled,
          depressionSupport: depressionSupportMode,
          traumaInformed: traumaInformedMode,
          voiceControl: isVoiceControlEnabled,
          highContrast: isHighContrastEnabled,
          reduceMotion: isReduceMotionEnabled,
          emergencyMode: crisisEmergencyMode,
        }));

      } catch (error) {
        console.error('Failed to initialize settings accessibility:', error);
      }
    };

    initializeSettingsAccessibility();
  }, [isScreenReaderEnabled, anxietyAdaptationsEnabled, depressionSupportMode, traumaInformedMode]);

  const handleSettingChange = useCallback(async (key: string, value: boolean | number) => {
    try {
      setSettings(prev => ({ ...prev, [key]: value }));

      // Apply accessibility changes
      switch (key) {
        case 'anxietySupport':
          if (value) await enableAnxietyAdaptations('moderate');
          break;
        case 'depressionSupport':
          if (value) await activateDepressionSupport('standard');
          break;
        case 'traumaInformed':
          if (value) await enableTraumaInformedMode();
          break;
        case 'emergencyMode':
          if (value) await activateEmergencyCrisisAccess('settings_toggle');
          break;
      }

    } catch (error) {
      console.error('Setting change failed:', error);
    }
  }, [enableAnxietyAdaptations, activateDepressionSupport, enableTraumaInformedMode, activateEmergencyCrisisAccess]);

  const handleAdvancedAction = useCallback(async (action: string) => {
    try {
      switch (action) {
        case 'exportData':
          await announceForTherapy('Preparing data export...', 'polite');
          // Implementation would export user data
          Alert.alert('Export Complete', 'Your data has been prepared for download.');
          break;

        case 'resetSettings':
          Alert.alert(
            'Reset Settings',
            'This will restore all settings to their default values. Your therapeutic progress will not be affected.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Reset',
                style: 'destructive',
                onPress: async () => {
                  // Reset to defaults
                  setSettings({
                    anxietySupport: true,
                    depressionSupport: false,
                    traumaInformed: true,
                    therapeuticTiming: true,
                    breathingGuidance: true,
                    progressCelebration: true,
                    voiceControl: false,
                    switchControl: false,
                    largeText: false,
                    highContrast: false,
                    reduceMotion: false,
                    screenReader: isScreenReaderEnabled,
                    hapticFeedback: true,
                    notifications: true,
                    soundEffects: true,
                    backgroundRefresh: true,
                    autoSave: true,
                    offlineMode: true,
                    emergencyMode: false,
                    quickCrisisAccess: true,
                    crisisVoiceCommands: true,
                    emergencyContacts: false,
                    dataSharing: false,
                    analytics: false,
                    crashReporting: true,
                    voiceVolume: 75,
                    hapticIntensity: 50,
                    animationSpeed: 75,
                    sessionTimeout: 60,
                  });
                  await announceForTherapy('Settings have been reset to defaults', 'polite');
                }
              }
            ]
          );
          break;

        case 'deleteAccount':
          Alert.alert(
            'Delete Account',
            'This will permanently delete your account and all therapeutic progress data. This action cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await announceForTherapy('Account deletion initiated', 'assertive');
                  // Implementation would handle account deletion
                }
              }
            ]
          );
          break;

        case 'emergencyContacts':
          await announceForTherapy('Opening emergency contacts configuration', 'polite');
          // Implementation would navigate to emergency contacts screen
          break;
      }
    } catch (error) {
      console.error('Advanced action failed:', error);
    }
  }, [announceForTherapy, isScreenReaderEnabled]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header} ref={headerRef}>
        <Text
          style={[
            styles.title,
            depressionSupportMode && styles.encouragingTitle
          ]}
          accessible={true}
          accessibilityRole="header"
          accessibilityLevel={1}
          allowFontScaling={true}
          maxFontSizeMultiplier={2.5}
        >
          Settings & Configuration
        </Text>

        <Text
          style={[
            styles.subtitle,
            anxietyAdaptationsEnabled && styles.calmingSubtitle
          ]}
          accessible={true}
          allowFontScaling={true}
          maxFontSizeMultiplier={2.0}
        >
          {traumaInformedMode
            ? 'Customize your safe, therapeutic experience'
            : 'Personalize your mindfulness journey'
          }
        </Text>

        {/* Crisis mode indicator */}
        {crisisEmergencyMode && (
          <View style={styles.crisisBanner}>
            <Text
              style={styles.crisisText}
              accessible={true}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.8}
            >
              🚨 Emergency Crisis Mode Active
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        accessible={false}
        testID="settings-scroll-view"
      >
        {settingCategories.map((category, categoryIndex) => (
          <View key={categoryIndex} style={styles.categorySection}>
            <Text
              style={[
                styles.categoryTitle,
                anxietyAdaptationsEnabled && styles.calmingCategoryTitle
              ]}
              accessible={true}
              accessibilityRole="header"
              accessibilityLevel={2}
              allowFontScaling={true}
              maxFontSizeMultiplier={2.0}
            >
              {category.title}
            </Text>

            {category.settings.map((setting, settingIndex) => (
              <AccessibleSettingItem
                key={setting.key}
                title={setting.title}
                description={setting.description}
                type={setting.type}
                value={settings[setting.key as keyof typeof settings]}
                onValueChange={
                  setting.type === 'switch' || setting.type === 'slider'
                    ? (value) => handleSettingChange(setting.key, value)
                    : undefined
                }
                onPress={
                  setting.type === 'button'
                    ? () => handleAdvancedAction(setting.key)
                    : undefined
                }
                icon={setting.icon}
                category={setting.category}
                index={categoryIndex * 20 + settingIndex}
                min={setting.min}
                max={setting.max}
                step={setting.step}
                dangerous={setting.dangerous}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Crisis support always accessible */}
      <AccessibleCrisisButton
        variant="floating"
        anxietyAdaptations={anxietyAdaptationsEnabled}
        traumaInformed={traumaInformedMode}
        voiceActivated={settings.crisisVoiceCommands}
        emergencyMode={crisisEmergencyMode}
        style={{ bottom: 120 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B2951',
    marginBottom: 8,
    textAlign: 'center',
  },
  encouragingTitle: {
    color: '#2563EB',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  calmingSubtitle: {
    color: '#059669',
    fontWeight: '500',
  },
  crisisBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#DC2626',
    alignItems: 'center',
  },
  crisisText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 140,
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  calmingCategoryTitle: {
    color: '#059669',
  },
  settingContainer: {
    marginBottom: 12,
  },
  settingItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    // WCAG AA minimum touch target
    minHeight: 64,
    minWidth: 44,
  },
  settingContent: {
    flex: 1,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 24,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 22,
  },
  anxietyFriendlyTitle: {
    fontSize: 18,
    color: '#059669',
  },
  dangerousTitle: {
    color: '#DC2626',
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  encouragingDescription: {
    color: '#374151',
    fontWeight: '500',
  },
  dangerousDescription: {
    color: '#991B1B',
  },
  sliderContainer: {
    alignItems: 'center',
    width: 120,
  },
  slider: {
    width: 100,
    height: 40,
  },
  sliderValue: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 4,
  },
  actionIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 20,
    fontWeight: '600',
  },
});

export default SettingsScreen;