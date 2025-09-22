/**
 * CrisisResourcesScreen - Emergency Resources with Crisis Emergency Accessibility
 *
 * CRISIS ACCESSIBILITY REQUIREMENTS:
 * - Emergency accessibility with <3 second resource access
 * - Voice-activated crisis resource navigation
 * - High contrast emergency interface mode
 * - Large touch targets for crisis state usability
 * - Offline accessibility for emergency resource availability
 * - WCAG AAA compliance for emergency situations
 * - Trauma-informed crisis interface design
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
  Share,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  interpolateColor,
} from 'react-native-reanimated';
import { useTherapeuticAccessibility } from '../../components/accessibility/TherapeuticAccessibilityProvider';
import { AccessibleCrisisButton } from '../../components/accessibility/AccessibleCrisisButton';

interface CrisisResource {
  id: string;
  title: string;
  description: string;
  phone?: string;
  text?: string;
  website?: string;
  available: string;
  category: 'hotline' | 'text' | 'chat' | 'local' | 'specialized';
  priority: 'emergency' | 'urgent' | 'support';
  icon: string;
  offline: boolean;
}

interface AccessibleResourceCardProps extends CrisisResource {
  onPress: (resource: CrisisResource) => void;
  index: number;
}

const AccessibleResourceCard: React.FC<AccessibleResourceCardProps> = React.memo(({
  id,
  title,
  description,
  phone,
  text,
  website,
  available,
  category,
  priority,
  icon,
  offline,
  onPress,
  index
}) => {
  const cardRef = useRef<TouchableOpacity>(null);
  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const {
    anxietyAdaptationsEnabled,
    depressionSupportMode,
    traumaInformedMode,
    crisisEmergencyMode,
    isScreenReaderEnabled,
    announceForTherapy,
    setTherapeuticFocus,
    announceEmergencyInstructions,
    provideCrisisHaptics,
  } = useTherapeuticAccessibility();

  // Animation values for emergency visibility
  const scaleValue = useSharedValue(1);
  const pulseValue = useSharedValue(1);
  const colorValue = useSharedValue(0);

  // Emergency sizing for crisis situations
  const cardSize = crisisEmergencyMode || anxietyAdaptationsEnabled ? {
    minHeight: 120,
    padding: 24,
  } : priority === 'emergency' ? {
    minHeight: 100,
    padding: 20,
  } : {
    minHeight: 80,
    padding: 16,
  };

  // Emergency pulse animation for highest priority resources
  useEffect(() => {
    if (priority === 'emergency' && (crisisEmergencyMode || category === 'hotline')) {
      pulseValue.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      pulseValue.value = withTiming(1, { duration: 300 });
    }
  }, [priority, crisisEmergencyMode, category]);

  const handlePress = useCallback(async () => {
    const startTime = Date.now();

    try {
      setIsPressed(true);

      // Crisis haptic feedback for emergency resources
      if (priority === 'emergency') {
        await provideCrisisHaptics();
      }

      // Emergency animation feedback
      scaleValue.value = withSequence(
        withSpring(0.96, { damping: 20, stiffness: 400 }),
        withSpring(1, { damping: 20, stiffness: 400 })
      );

      // Emergency announcement for screen readers
      const urgentMessage = priority === 'emergency'
        ? `EMERGENCY RESOURCE: ${title}. Activating immediate access.`
        : `Crisis resource: ${title}. Connecting to support.`;

      if (priority === 'emergency') {
        await announceEmergencyInstructions(urgentMessage);
      } else {
        await announceForTherapy(urgentMessage, 'assertive');
      }

      // Call the resource
      onPress({ id, title, description, phone, text, website, available, category, priority, icon, offline });

      const responseTime = Date.now() - startTime;
      if (responseTime > 200 && priority === 'emergency') {
        console.warn(`Emergency resource access exceeded 200ms: ${responseTime}ms`);
      }

    } catch (error) {
      console.error('Crisis resource activation failed:', error);

      // Emergency fallback announcement
      await announceEmergencyInstructions(
        `Resource temporarily unavailable. ${phone ? `Please dial ${phone} directly.` : 'Try alternative support options.'}`
      );
    } finally {
      setIsPressed(false);
    }
  }, [id, title, description, phone, text, website, available, category, priority, icon, offline, onPress, provideCrisisHaptics, announceEmergencyInstructions, announceForTherapy, scaleValue]);

  const handleFocus = useCallback(async () => {
    setIsFocused(true);
    if (isScreenReaderEnabled) {
      await setTherapeuticFocus(cardRef, `${title} crisis resource`);
    }
  }, [title, isScreenReaderEnabled, setTherapeuticFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Priority-based styling
  const getPriorityColor = () => {
    switch (priority) {
      case 'emergency': return '#DC2626'; // Red
      case 'urgent': return '#F59E0B'; // Amber
      case 'support': return '#059669'; // Green
      default: return '#6B7280'; // Gray
    }
  };

  const getCategoryIcon = () => {
    switch (category) {
      case 'hotline': return '📞';
      case 'text': return '💬';
      case 'chat': return '💻';
      case 'local': return '🏥';
      case 'specialized': return '🎯';
      default: return '📋';
    }
  };

  // Animated styles for emergency visibility
  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = priority === 'emergency' && (crisisEmergencyMode || isPressed)
      ? interpolateColor(
          Math.sin(Date.now() / 1000) * 0.5 + 0.5,
          [0, 1],
          ['#FFFFFF', '#FEF2F2']
        )
      : '#FFFFFF';

    return {
      transform: [
        { scale: scaleValue.value },
        { scale: pulseValue.value }
      ],
      backgroundColor,
      borderColor: isFocused ? '#007AFF' : getPriorityColor(),
    };
  }, [isFocused, priority, crisisEmergencyMode, isPressed]);

  // Comprehensive accessibility labeling for crisis situations
  const getAccessibilityLabel = () => {
    let label = `${title} crisis resource. ${description}`;

    if (phone) label += ` Phone number: ${phone}.`;
    if (text) label += ` Text number: ${text}.`;
    if (available) label += ` Available: ${available}.`;

    label += ` Priority: ${priority}.`;
    label += ` Category: ${category}.`;

    if (offline) label += ' Available offline.';

    return label;
  };

  const getAccessibilityHint = () => {
    let hint = '';

    if (priority === 'emergency') {
      hint = 'Double tap for immediate emergency support. ';
    } else {
      hint = 'Double tap to access this crisis resource. ';
    }

    if (traumaInformedMode) {
      hint += 'This is professional, confidential support that is safe to contact.';
    }

    return hint;
  };

  return (
    <Animated.View style={[styles.resourceContainer, animatedStyle]}>
      <TouchableOpacity
        ref={cardRef}
        style={[
          styles.resourceCard,
          cardSize,
          {
            borderWidth: priority === 'emergency' ? 4 : isFocused ? 3 : 2,
            borderColor: isFocused ? '#007AFF' : getPriorityColor(),
          }
        ]}
        onPress={handlePress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        activeOpacity={0.8}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={getAccessibilityLabel()}
        accessibilityHint={getAccessibilityHint()}
        accessibilityState={{
          selected: isPressed,
          disabled: false,
        }}
        accessibilityLiveRegion={priority === 'emergency' ? 'assertive' : 'polite'}
        accessibilityActions={[
          {
            name: 'activate',
            label: priority === 'emergency' ? 'Call emergency support now' : 'Contact this resource'
          },
          ...(phone ? [{
            name: 'call',
            label: `Call ${phone}`
          }] : []),
          ...(text ? [{
            name: 'message',
            label: `Text ${text}`
          }] : []),
        ]}
        testID={`crisis-resource-${index}`}
      >
        <View style={styles.resourceContent}>
          {/* Priority indicator */}
          {priority === 'emergency' && (
            <View style={styles.emergencyBadge}>
              <Text
                style={styles.emergencyText}
                accessible={false}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.5}
              >
                🚨 EMERGENCY
              </Text>
            </View>
          )}

          <View style={styles.resourceHeader}>
            <View style={styles.iconRow}>
              <View
                style={[
                  styles.categoryIconContainer,
                  { backgroundColor: getPriorityColor() + '20' }
                ]}
              >
                <Text style={[styles.categoryIcon, { color: getPriorityColor() }]} accessible={false}>
                  {getCategoryIcon()}
                </Text>
              </View>

              <View
                style={[
                  styles.typeIconContainer,
                  { backgroundColor: getPriorityColor() + '10' }
                ]}
              >
                <Text style={styles.typeIcon} accessible={false}>
                  {icon}
                </Text>
              </View>

              {offline && (
                <View style={styles.offlineIndicator}>
                  <Text style={styles.offlineIcon} accessible={false}>📱</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.resourceInfo}>
            <Text
              style={[
                styles.resourceTitle,
                priority === 'emergency' && styles.emergencyTitle,
                anxietyAdaptationsEnabled && styles.anxietyFriendlyTitle
              ]}
              accessible={false}
              allowFontScaling={true}
              maxFontSizeMultiplier={priority === 'emergency' ? 2.5 : 2.0}
            >
              {title}
            </Text>

            <Text
              style={[
                styles.resourceDescription,
                depressionSupportMode && styles.encouragingDescription,
                priority === 'emergency' && styles.emergencyDescription
              ]}
              accessible={false}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.8}
              numberOfLines={anxietyAdaptationsEnabled ? 3 : 2}
            >
              {description}
            </Text>

            {/* Contact information with enhanced visibility */}
            <View style={styles.contactInfo}>
              {phone && (
                <Text
                  style={[
                    styles.contactText,
                    priority === 'emergency' && styles.emergencyContact
                  ]}
                  accessible={false}
                  allowFontScaling={true}
                  maxFontSizeMultiplier={2.0}
                >
                  📞 {phone}
                </Text>
              )}

              {text && (
                <Text
                  style={[
                    styles.contactText,
                    priority === 'emergency' && styles.emergencyContact
                  ]}
                  accessible={false}
                  allowFontScaling={true}
                  maxFontSizeMultiplier={2.0}
                >
                  💬 {text}
                </Text>
              )}

              <Text
                style={styles.availabilityText}
                accessible={false}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.5}
              >
                🕐 {available}
              </Text>
            </View>

            {/* Therapeutic encouragement for crisis resources */}
            {traumaInformedMode && (
              <Text
                style={styles.reassuranceText}
                accessible={false}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.5}
              >
                🛡️ Safe, confidential, professional support
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export const CrisisResourcesScreen: React.FC = () => {
  const scrollViewRef = useRef<ScrollView>(null);
  const headerRef = useRef<View>(null);

  const {
    isScreenReaderEnabled,
    anxietyAdaptationsEnabled,
    depressionSupportMode,
    traumaInformedMode,
    crisisEmergencyMode,
    announceForTherapy,
    setTherapeuticFocus,
    announceEmergencyInstructions,
    activateEmergencyCrisisAccess,
    provideCrisisHaptics,
  } = useTherapeuticAccessibility();

  // Crisis resources with comprehensive accessibility metadata
  const crisisResources: CrisisResource[] = [
    {
      id: '988',
      title: '988 Suicide & Crisis Lifeline',
      description: 'Free, confidential crisis support 24/7 for people in suicidal crisis or emotional distress',
      phone: '988',
      available: '24/7',
      category: 'hotline',
      priority: 'emergency',
      icon: '🆘',
      offline: true,
    },
    {
      id: 'crisis-text',
      title: 'Crisis Text Line',
      description: 'Text-based crisis support from trained counselors',
      text: '741741',
      available: '24/7',
      category: 'text',
      priority: 'emergency',
      icon: '📱',
      offline: true,
    },
    {
      id: 'emergency',
      title: 'Emergency Services',
      description: 'Call for immediate life-threatening emergencies',
      phone: '911',
      available: '24/7',
      category: 'hotline',
      priority: 'emergency',
      icon: '🚑',
      offline: true,
    },
    {
      id: 'trans-lifeline',
      title: 'Trans Lifeline',
      description: 'Crisis support staffed by transgender community members',
      phone: '877-565-8860',
      available: '24/7',
      category: 'specialized',
      priority: 'urgent',
      icon: '🏳️‍⚧️',
      offline: true,
    },
    {
      id: 'veterans',
      title: 'Veterans Crisis Line',
      description: 'Crisis support specifically for veterans and their families',
      phone: '988',
      text: '838255',
      available: '24/7',
      category: 'specialized',
      priority: 'urgent',
      icon: '🎖️',
      offline: true,
    },
    {
      id: 'trevor',
      title: 'The Trevor Project',
      description: 'Crisis intervention for LGBTQ young people',
      phone: '1-866-488-7386',
      text: '678678',
      available: '24/7',
      category: 'specialized',
      priority: 'urgent',
      icon: '🌈',
      offline: true,
    },
    {
      id: 'warmline',
      title: 'NAMI Helpline',
      description: 'Mental health support and information line',
      phone: '1-800-950-6264',
      available: 'Mon-Fri 10am-10pm ET',
      category: 'hotline',
      priority: 'support',
      icon: '🧠',
      offline: true,
    },
    {
      id: 'samhsa',
      title: 'SAMHSA National Helpline',
      description: 'Treatment referral and information service',
      phone: '1-800-662-4357',
      available: '24/7',
      category: 'hotline',
      priority: 'support',
      icon: '🏥',
      offline: true,
    },
  ];

  useEffect(() => {
    const initializeCrisisAccessibility = async () => {
      try {
        // Immediately activate crisis mode
        await activateEmergencyCrisisAccess('crisis_resources_screen');

        // Emergency haptic feedback
        await provideCrisisHaptics();

        // Focus on header for screen readers
        if (isScreenReaderEnabled && headerRef.current) {
          await setTherapeuticFocus(headerRef, 'Crisis Resources screen');
        }

        // Emergency announcement
        await announceEmergencyInstructions(
          'Crisis Resources screen loaded. Emergency support is immediately available. All resources are confidential and professional.'
        );

      } catch (error) {
        console.error('Failed to initialize crisis accessibility:', error);
      }
    };

    initializeCrisisAccessibility();
  }, [isScreenReaderEnabled, activateEmergencyCrisisAccess, provideCrisisHaptics, announceEmergencyInstructions, setTherapeuticFocus]);

  const handleResourcePress = useCallback(async (resource: CrisisResource) => {
    try {
      // Provide immediate crisis feedback
      await provideCrisisHaptics();

      if (resource.phone) {
        // Direct call for emergency resources
        const phoneURL = `tel:${resource.phone}`;

        try {
          await Linking.openURL(phoneURL);

          // Success announcement
          await announceEmergencyInstructions(
            `Calling ${resource.title} at ${resource.phone}. Help is on the way.`
          );

        } catch (error) {
          // Fallback with copy to clipboard
          await Clipboard.setString(resource.phone);

          Alert.alert(
            'Call Manually',
            `Unable to dial automatically. The number ${resource.phone} has been copied to your clipboard. Please dial manually.`,
            [{ text: 'OK' }],
            { cancelable: false }
          );

          await announceEmergencyInstructions(
            `Phone number ${resource.phone} copied to clipboard. Please dial manually for support.`
          );
        }

      } else if (resource.text) {
        // Text-based crisis support
        try {
          const textURL = `sms:${resource.text}`;
          await Linking.openURL(textURL);

          await announceEmergencyInstructions(
            `Opening text message to ${resource.title}. Text HOME to start.`
          );

        } catch (error) {
          await Clipboard.setString(resource.text);

          Alert.alert(
            'Text Manually',
            `Text ${resource.text} with HOME to start. The number has been copied to your clipboard.`,
            [{ text: 'OK' }],
            { cancelable: false }
          );
        }

      } else if (resource.website) {
        // Web-based crisis support
        try {
          await Linking.openURL(resource.website);

          await announceForTherapy(
            `Opening ${resource.title} website for crisis support.`,
            'assertive'
          );

        } catch (error) {
          await announceEmergencyInstructions(
            `Unable to open website. Please search for ${resource.title} in your browser.`
          );
        }
      }

    } catch (error) {
      console.error('Crisis resource activation failed:', error);

      // Emergency fallback
      await announceEmergencyInstructions(
        'Resource temporarily unavailable. Please try 988 for immediate crisis support.'
      );
    }
  }, [provideCrisisHaptics, announceEmergencyInstructions, announceForTherapy]);

  return (
    <SafeAreaView style={[styles.container, crisisEmergencyMode && styles.emergencyContainer]}>
      <View style={styles.header} ref={headerRef}>
        <Text
          style={[
            styles.title,
            crisisEmergencyMode && styles.emergencyTitle
          ]}
          accessible={true}
          accessibilityRole="header"
          accessibilityLevel={1}
          allowFontScaling={true}
          maxFontSizeMultiplier={3.0}
        >
          Crisis Support Resources
        </Text>

        <Text
          style={[
            styles.subtitle,
            traumaInformedMode && styles.reassuringSubtitle
          ]}
          accessible={true}
          allowFontScaling={true}
          maxFontSizeMultiplier={2.5}
        >
          {traumaInformedMode
            ? 'Safe, confidential support is available right now'
            : 'Help is available 24/7 - you are not alone'
          }
        </Text>

        {/* Emergency banner */}
        <View style={styles.emergencyBanner}>
          <Text
            style={styles.emergencyBannerText}
            accessible={true}
            allowFontScaling={true}
            maxFontSizeMultiplier={2.0}
          >
            🚨 In immediate danger? Call 911 or go to your nearest emergency room
          </Text>
        </View>

        {/* Quick access to 988 */}
        <TouchableOpacity
          style={styles.quickAccessButton}
          onPress={() => handleResourcePress(crisisResources[0])}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="988 Suicide and Crisis Lifeline. Quick dial for immediate crisis support."
          accessibilityHint="Double tap to call 988 immediately for crisis support."
          testID="quick-988-button"
        >
          <Text
            style={styles.quickAccessText}
            accessible={false}
            allowFontScaling={true}
            maxFontSizeMultiplier={2.5}
          >
            📞 Call 988 Now
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        accessible={false}
        testID="crisis-resources-scroll-view"
      >
        {/* Emergency resources first */}
        <View style={styles.prioritySection}>
          <Text
            style={styles.sectionTitle}
            accessible={true}
            accessibilityRole="header"
            accessibilityLevel={2}
            allowFontScaling={true}
            maxFontSizeMultiplier={2.0}
          >
            🚨 Emergency Support
          </Text>

          {crisisResources
            .filter(resource => resource.priority === 'emergency')
            .map((resource, index) => (
              <AccessibleResourceCard
                key={resource.id}
                {...resource}
                onPress={handleResourcePress}
                index={index}
              />
            ))}
        </View>

        {/* Specialized support */}
        <View style={styles.prioritySection}>
          <Text
            style={styles.sectionTitle}
            accessible={true}
            accessibilityRole="header"
            accessibilityLevel={2}
            allowFontScaling={true}
            maxFontSizeMultiplier={2.0}
          >
            🎯 Specialized Support
          </Text>

          {crisisResources
            .filter(resource => resource.priority === 'urgent')
            .map((resource, index) => (
              <AccessibleResourceCard
                key={resource.id}
                {...resource}
                onPress={handleResourcePress}
                index={index + 10}
              />
            ))}
        </View>

        {/* General support */}
        <View style={styles.prioritySection}>
          <Text
            style={styles.sectionTitle}
            accessible={true}
            accessibilityRole="header"
            accessibilityLevel={2}
            allowFontScaling={true}
            maxFontSizeMultiplier={2.0}
          >
            💙 Additional Support
          </Text>

          {crisisResources
            .filter(resource => resource.priority === 'support')
            .map((resource, index) => (
              <AccessibleResourceCard
                key={resource.id}
                {...resource}
                onPress={handleResourcePress}
                index={index + 20}
              />
            ))}
        </View>

        {/* Reassurance section for trauma-informed users */}
        {traumaInformedMode && (
          <View style={styles.reassuranceSection}>
            <Text
              style={styles.reassuranceTitle}
              accessible={true}
              allowFontScaling={true}
              maxFontSizeMultiplier={2.0}
            >
              🛡️ You Are Safe
            </Text>
            <Text
              style={styles.reassuranceText}
              accessible={true}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.8}
            >
              • All resources are confidential and professional{'\n'}
              • You can hang up or disconnect at any time{'\n'}
              • These are trained crisis counselors who understand{'\n'}
              • There's no judgment - only support{'\n'}
              • You are not alone in this{'\n'}
              • Reaching out is a sign of strength
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Always visible crisis button */}
      <AccessibleCrisisButton
        variant="floating"
        anxietyAdaptations={true}
        traumaInformed={traumaInformedMode}
        voiceActivated={true}
        emergencyMode={true}
        size="emergency"
        style={{ bottom: 40 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  emergencyContainer: {
    backgroundColor: '#FFFBEB', // Slight warm tint for crisis mode
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
    color: '#DC2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  emergencyTitle: {
    fontSize: 32,
    color: '#991B1B',
  },
  subtitle: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    fontWeight: '500',
  },
  reassuringSubtitle: {
    color: '#059669',
    fontWeight: '600',
  },
  emergencyBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  emergencyBannerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 18,
  },
  quickAccessButton: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    // WCAG AAA emergency touch target
    minHeight: 88,
    minWidth: 88,
  },
  quickAccessText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 160, // Extra space for emergency floating button
  },
  prioritySection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  resourceContainer: {
    marginBottom: 16,
  },
  resourceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    // WCAG AAA minimum touch target for crisis
    minHeight: 88,
    minWidth: 88,
  },
  resourceContent: {
    flex: 1,
  },
  emergencyBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1,
  },
  emergencyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resourceHeader: {
    marginBottom: 12,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: {
    fontSize: 20,
  },
  typeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIcon: {
    fontSize: 16,
  },
  offlineIndicator: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  offlineIcon: {
    fontSize: 12,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 24,
  },
  emergencyTitle: {
    fontSize: 22,
    color: '#DC2626',
  },
  anxietyFriendlyTitle: {
    fontSize: 20,
    color: '#059669',
  },
  resourceDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  encouragingDescription: {
    color: '#374151',
    fontWeight: '500',
  },
  emergencyDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7F1D1D',
  },
  contactInfo: {
    marginBottom: 8,
  },
  contactText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  emergencyContact: {
    fontSize: 18,
    color: '#DC2626',
  },
  availabilityText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  reassuranceText: {
    fontSize: 12,
    color: '#059669',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  reassuranceSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#059669',
  },
  reassuranceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 12,
    textAlign: 'center',
  },
});

export default CrisisResourcesScreen;