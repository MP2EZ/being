import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useSimpleUserStore } from '../../store/simpleUserStore';
import { useTherapeuticAccessibility } from '../../components/accessibility/TherapeuticAccessibilityProvider';
import { AccessibleCrisisButton } from '../../components/accessibility/AccessibleCrisisButton';

interface AccessiblePreferenceItemProps {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon: string;
  category: 'therapeutic' | 'accessibility' | 'privacy' | 'crisis';
  index: number;
}

const AccessiblePreferenceItem: React.FC<AccessiblePreferenceItemProps> = React.memo(({
  title,
  description,
  value,
  onValueChange,
  icon,
  category,
  index
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

  // Animation for therapeutic feedback
  const scaleValue = useSharedValue(1);

  const handleToggle = useCallback(async (newValue: boolean) => {
    try {
      // Therapeutic animation feedback
      scaleValue.value = withSequence(
        withSpring(0.98, { damping: 20, stiffness: 400 }),
        withSpring(1, { damping: 20, stiffness: 400 })
      );

      // Update preference
      onValueChange(newValue);

      // Therapeutic announcement
      const action = newValue ? 'enabled' : 'disabled';
      const encouragement = depressionSupportMode
        ? `Great choice! ${title} has been ${action}. You're taking control of your experience.`
        : `${title} has been ${action}.`;

      await announceForTherapy(encouragement, 'polite');

      if (newValue && depressionSupportMode) {
        await provideTharapeuticFeedback('encouraging');
      }

    } catch (error) {
      console.error('Preference toggle failed:', error);
    }
  }, [title, depressionSupportMode, onValueChange, scaleValue, announceForTherapy, provideTharapeuticFeedback]);

  const handleFocus = useCallback(async () => {
    setIsFocused(true);
    if (isScreenReaderEnabled) {
      await setTherapeuticFocus(itemRef, `${title} preference`);
    }
  }, [title, isScreenReaderEnabled, setTherapeuticFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Enhanced sizing for accessibility
  const itemSize = anxietyAdaptationsEnabled ? {
    minHeight: 80,
    padding: 20,
  } : {
    minHeight: 64,
    padding: 16,
  };

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }],
      borderColor: isFocused ? '#007AFF' : '#E5E7EB',
    };
  }, [isFocused]);

  // Category color coding for visual hierarchy
  const getCategoryColor = () => {
    switch (category) {
      case 'therapeutic': return '#059669'; // Green
      case 'accessibility': return '#3B82F6'; // Blue
      case 'privacy': return '#7C3AED'; // Purple
      case 'crisis': return '#DC2626'; // Red
      default: return '#6B7280'; // Gray
    }
  };

  const accessibilityLabel = `${title}. ${description} Currently ${value ? 'enabled' : 'disabled'}.`;
  const accessibilityHint = traumaInformedMode
    ? 'Double tap to toggle this setting. This is a safe preference change you can undo at any time.'
    : 'Double tap to toggle this preference.';

  return (
    <Animated.View style={[styles.preferenceContainer, animatedStyle]}>
      <Pressable
        ref={itemRef}
        style={({ pressed }) => [
          styles.preferenceItem,
          itemSize,
          {
            borderWidth: isFocused ? 3 : 1,
            borderColor: isFocused ? '#007AFF' : '#E5E7EB',
            opacity: pressed ? 0.8 : 1,
            backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : '#FFFFFF',
          }
        ]}
        onPress={() => handleToggle(!value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        accessible={true}
        accessibilityRole="switch"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{
          checked: value,
          disabled: false,
        }}
        testID={`preference-item-${index}`}
      >
        <View style={styles.preferenceContent}>
          <View style={styles.preferenceHeader}>
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

            <View style={styles.preferenceInfo}>
              <Text
                style={[
                  styles.preferenceTitle,
                  anxietyAdaptationsEnabled && styles.anxietyFriendlyTitle
                ]}
                accessible={false}
                allowFontScaling={true}
                maxFontSizeMultiplier={2.0}
              >
                {title}
              </Text>

              <Text
                style={[
                  styles.preferenceDescription,
                  depressionSupportMode && styles.encouragingDescription
                ]}
                accessible={false}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.8}
              >
                {description}
              </Text>
            </View>

            <Switch
              value={value}
              onValueChange={handleToggle}
              accessible={false}
              importantForAccessibility="no"
              trackColor={{
                false: '#F3F4F6',
                true: getCategoryColor() + '40'
              }}
              thumbColor={value ? getCategoryColor() : '#9CA3AF'}
              ios_backgroundColor="#F3F4F6"
              style={{
                transform: Platform.OS === 'ios' ? [] : [{ scaleX: 1.2 }, { scaleY: 1.2 }]
              }}
            />
          </View>

          {/* Status indicator for screen readers */}
          {value && (
            <View style={styles.activeIndicator}>
              <Text
                style={[styles.activeText, { color: getCategoryColor() }]}
                accessible={false}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.5}
              >
                ✓ Active
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
});

export const ProfileScreen: React.FC = () => {
  const scrollViewRef = useRef<ScrollView>(null);
  const headerRef = useRef<View>(null);
  const { user } = useSimpleUserStore();

  const {
    isScreenReaderEnabled,
    anxietyAdaptationsEnabled,
    depressionSupportMode,
    traumaInformedMode,
    crisisEmergencyMode,
    isHighContrastEnabled,
    isVoiceControlEnabled,
    announceForTherapy,
    setTherapeuticFocus,
    provideTharapeuticFeedback,
    enableAnxietyAdaptations,
    activateDepressionSupport,
    enableTraumaInformedMode,
  } = useTherapeuticAccessibility();

  // Local state for preferences
  const [preferences, setPreferences] = useState({
    // Therapeutic preferences
    anxietySupport: anxietyAdaptationsEnabled,
    depressionSupport: depressionSupportMode,
    traumaInformed: traumaInformedMode,
    therapeuticFeedback: true,

    // Accessibility preferences
    voiceControl: isVoiceControlEnabled,
    largeText: false,
    highContrast: isHighContrastEnabled,
    reduceMotion: false,

    // Privacy preferences
    dataSharing: false,
    analyticsOptOut: true,
    offlineMode: true,

    // Crisis preferences
    emergencyContacts: false,
    crisisAlerts: true,
    quickCrisisAccess: true,
  });

  const preferenceCategories = [
    {
      title: 'Therapeutic Support',
      preferences: [
        {
          key: 'anxietySupport',
          title: 'Anxiety Adaptations',
          description: 'Larger buttons, calming interactions, and reduced cognitive load',
          icon: '🫧',
          category: 'therapeutic' as const,
        },
        {
          key: 'depressionSupport',
          title: 'Depression Support',
          description: 'Encouraging feedback and simplified navigation patterns',
          icon: '💙',
          category: 'therapeutic' as const,
        },
        {
          key: 'traumaInformed',
          title: 'Trauma-Informed Mode',
          description: 'Predictable, safe interactions without surprising changes',
          icon: '🛡️',
          category: 'therapeutic' as const,
        },
        {
          key: 'therapeuticFeedback',
          title: 'Therapeutic Feedback',
          description: 'Encouraging messages and celebration of progress',
          icon: '✨',
          category: 'therapeutic' as const,
        },
      ],
    },
    {
      title: 'Accessibility',
      preferences: [
        {
          key: 'voiceControl',
          title: 'Voice Commands',
          description: 'Enable voice navigation and crisis support activation',
          icon: '🎤',
          category: 'accessibility' as const,
        },
        {
          key: 'largeText',
          title: 'Large Text',
          description: 'Increase text size for better readability',
          icon: '🔤',
          category: 'accessibility' as const,
        },
        {
          key: 'highContrast',
          title: 'High Contrast',
          description: 'Enhanced visual contrast for better visibility',
          icon: '🔆',
          category: 'accessibility' as const,
        },
      ],
    },
    {
      title: 'Crisis Support',
      preferences: [
        {
          key: 'quickCrisisAccess',
          title: 'Quick Crisis Access',
          description: 'Emergency support button always visible',
          icon: '🚨',
          category: 'crisis' as const,
        },
        {
          key: 'crisisAlerts',
          title: 'Crisis Detection',
          description: 'Automatic support when assessment scores indicate crisis',
          icon: '🔔',
          category: 'crisis' as const,
        },
      ],
    },
  ];

  useEffect(() => {
    const initializeProfileAccessibility = async () => {
      try {
        // Focus on header for screen readers
        if (isScreenReaderEnabled && headerRef.current) {
          await setTherapeuticFocus(headerRef, 'Profile and Preferences screen');
        }

        // Welcome announcement
        const welcomeMessage = `Welcome to your profile, ${user?.name || 'user'}. Here you can customize your therapeutic experience and accessibility preferences.`;
        await announceForTherapy(welcomeMessage, 'polite');

        // Update preferences from accessibility context
        setPreferences(prev => ({
          ...prev,
          anxietySupport: anxietyAdaptationsEnabled,
          depressionSupport: depressionSupportMode,
          traumaInformed: traumaInformedMode,
          voiceControl: isVoiceControlEnabled,
          highContrast: isHighContrastEnabled,
        }));

      } catch (error) {
        console.error('Failed to initialize profile accessibility:', error);
      }
    };

    initializeProfileAccessibility();
  }, [isScreenReaderEnabled, user?.name, anxietyAdaptationsEnabled, depressionSupportMode, traumaInformedMode]);

  const handlePreferenceChange = useCallback(async (key: string, value: boolean) => {
    try {
      setPreferences(prev => ({ ...prev, [key]: value }));

      // Apply therapeutic accessibility changes
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
      }

      // Provide encouraging feedback for any positive change
      if (value && depressionSupportMode) {
        await provideTharapeuticFeedback('celebrating');
      }

    } catch (error) {
      console.error('Preference change failed:', error);
    }
  }, [enableAnxietyAdaptations, activateDepressionSupport, enableTraumaInformedMode, depressionSupportMode, provideTharapeuticFeedback]);

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
          Profile & Preferences
        </Text>

        {/* User info card with accessibility */}
        <View style={styles.userCard}>
          <Text
            style={styles.userName}
            accessible={true}
            allowFontScaling={true}
            maxFontSizeMultiplier={2.0}
          >
            {user?.name || 'Welcome'}
          </Text>

          <Text
            style={styles.userStatus}
            accessible={true}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.8}
          >
            {user?.completedOnboarding
              ? 'Ready to practice mindfulness'
              : 'Getting started with Being.'
            }
          </Text>

          {depressionSupportMode && (
            <Text
              style={styles.encouragementBadge}
              accessible={true}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.5}
            >
              ✨ You're taking positive steps for your mental health
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        accessible={false}
        testID="profile-scroll-view"
      >
        {preferenceCategories.map((category, categoryIndex) => (
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

            {category.preferences.map((pref, prefIndex) => (
              <AccessiblePreferenceItem
                key={pref.key}
                title={pref.title}
                description={pref.description}
                value={preferences[pref.key as keyof typeof preferences] as boolean}
                onValueChange={(value) => handlePreferenceChange(pref.key, value)}
                icon={pref.icon}
                category={pref.category}
                index={categoryIndex * 10 + prefIndex}
              />
            ))}
          </View>
        ))}

        {/* Crisis mode indicator */}
        {crisisEmergencyMode && (
          <View style={styles.crisisIndicator}>
            <Text
              style={styles.crisisText}
              accessible={true}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.8}
            >
              🚨 Crisis Emergency Mode Active
            </Text>
            <Text
              style={styles.crisisDescription}
              accessible={true}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.5}
            >
              Enhanced accessibility and immediate support features are enabled
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Crisis support always accessible */}
      <AccessibleCrisisButton
        variant="floating"
        anxietyAdaptations={anxietyAdaptationsEnabled}
        traumaInformed={traumaInformedMode}
        voiceActivated={preferences.voiceControl}
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
    marginBottom: 16,
    textAlign: 'center',
  },
  encouragingTitle: {
    color: '#2563EB',
  },
  userCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  userStatus: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  encouragementBadge: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
    textAlign: 'center',
    fontStyle: 'italic',
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
  preferenceContainer: {
    marginBottom: 12,
  },
  preferenceItem: {
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
    minHeight: 56,
    minWidth: 44,
  },
  preferenceContent: {
    flex: 1,
  },
  preferenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 20,
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 16,
  },
  preferenceTitle: {
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
  preferenceDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  encouragingDescription: {
    color: '#374151',
    fontWeight: '500',
  },
  activeIndicator: {
    alignItems: 'center',
    marginTop: 4,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  crisisIndicator: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#DC2626',
    alignItems: 'center',
  },
  crisisText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  crisisDescription: {
    fontSize: 14,
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 18,
  },
});