/**
 * Clean Home Screen - Fresh start implementation
 * Shows three DRD-compliant check-in cards without crypto dependencies
 * Integrated with check-in flow navigation
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, getTheme, spacing, borderRadius, typography } from '@/core/theme';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import { useSettingsStore, useAccessibilitySettings } from '@/core/stores/settingsStore';
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';
import AssessmentStatusBadge from '@/features/assessment/components/AssessmentStatusBadge';
import { IntroOverlay } from '../components/IntroOverlay';
import { useAnalytics } from '@/core/analytics';

// 30 minutes in milliseconds
const INTRO_THRESHOLD_MS = 30 * 60 * 1000;

type CleanHomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;
type FlowType = 'morning' | 'midday' | 'evening';

// PERF-04: hoisted out of CleanHomeScreen's render — defining components inside
// a function component creates a NEW component type on every render, forcing
// React to unmount/remount the entire subtree (loses state, fires effects).
interface CheckInCardProps {
  type: FlowType;
  title: string;
  description: string;
  duration: string;
  isCurrent: boolean;
  isCompleted: boolean;
  onPress: (type: FlowType) => void;
}

const CheckInCard: React.FC<CheckInCardProps> = ({
  type,
  title,
  description,
  duration,
  isCurrent,
  isCompleted,
  onPress,
}) => {
  const themeColors = getTheme(type);
  const handlePress = useCallback(() => onPress(type), [onPress, type]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.checkInCard,
        {
          backgroundColor: themeColors.background,
          // WCAG AA: gray[400] for 3:1 contrast ratio on borders
          borderColor: isCurrent ? themeColors.primary : colorSystem.gray[400],
          borderWidth: isCurrent ? 2 : 1,
          opacity: pressed ? 0.9 : isCompleted ? 0.5 : 1,
        }
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${title} check-in, ${duration}${isCompleted ? ', completed today' : ''}`}
      accessibilityHint={
        isCompleted
          ? 'Tap to start this check-in again'
          : `Start your ${type} mindfulness check-in`
      }
    >
      <View>
        <View style={styles.cardHeader}>
          <Text
            style={[styles.cardTitle, { color: themeColors.primary }]}
            accessibilityRole="header"
            accessibilityLevel={3}
          >
            {title}
          </Text>
          <Text style={styles.durationBadge} importantForAccessibility="no">
            {duration}
          </Text>
        </View>
        <Text style={styles.cardDescription} numberOfLines={2}>{description}</Text>
      </View>

      <View style={[styles.startButton, { backgroundColor: themeColors.primary }]}>
        <Text style={styles.startButtonText}>{isCompleted ? 'Complete' : 'Start'}</Text>
      </View>
    </Pressable>
  );
};

const CleanHomeScreen: React.FC = () => {
  const navigation = useNavigation<CleanHomeScreenNavigationProp>();
  // PERF-03: selector instead of whole-store destructure — subscribe only to
  // this single function reference.
  const isCheckInCompletedToday = useStoicPracticeStore((s) => s.isCheckInCompletedToday);
  const accessibilitySettings = useAccessibilitySettings();
  const getLastActiveTimestamp = useSettingsStore((state) => state.getLastActiveTimestamp);
  const currentHour = new Date().getHours();
  const { trackScreenView } = useAnalytics();

  // Track screen view for analytics (FEAT-40)
  // useFocusEffect tracks on every focus, not just mount (handles consent timing)
  useFocusEffect(
    useCallback(() => {
      trackScreenView('HomeScreen');
    }, [trackScreenView])
  );

  // Determine if intro animation should show
  const shouldShowIntroInitially = useMemo(() => {
    // Skip animation if reduced motion is enabled
    if (accessibilitySettings?.reducedMotion) {
      return false;
    }

    const lastActive = getLastActiveTimestamp();

    // First launch (no timestamp) - show intro
    if (lastActive === null) {
      return true;
    }

    // Check if 30+ minutes have passed
    const timeSinceActive = Date.now() - lastActive;
    return timeSinceActive > INTRO_THRESHOLD_MS;
  }, [accessibilitySettings?.reducedMotion, getLastActiveTimestamp]);

  const [showIntro, setShowIntro] = useState(shouldShowIntroInitially);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const getGreeting = () => {
    if (currentHour < 12) return 'Good morning';
    if (currentHour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getCurrentPeriod = (): 'morning' | 'midday' | 'evening' => {
    if (currentHour < 12) return 'morning';
    if (currentHour < 17) return 'midday';
    return 'evening';
  };

  const currentPeriod = getCurrentPeriod();

  const handleCheckInPress = useCallback((type: FlowType) => {
    switch (type) {
      case 'morning':
        navigation.navigate('MorningFlow');
        break;
      case 'midday':
        navigation.navigate('MiddayFlow');
        break;
      case 'evening':
        navigation.navigate('EveningFlow');
        break;
    }
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} testID="home-screen">
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={styles.appTitle}
            accessibilityRole="header"
            accessibilityLevel={1}
          >
            Being
          </Text>
          <Text
            style={styles.greeting}
            accessibilityRole="header"
            accessibilityLevel={2}
          >
            {getGreeting()}
          </Text>
          <Text style={styles.subtitle}>
            Take a moment for mindful awareness
          </Text>
        </View>

        {/* Assessment Status Badge */}
        <AssessmentStatusBadge />

        {/* Check-in Cards - flex to fill remaining space */}
        <View style={styles.checkInSection}>
          <CheckInCard
            type="morning"
            title="Morning Awareness"
            description="Start your day with mindful awareness of your body, emotions, and intentions."
            duration="5-7 min"
            isCurrent={currentPeriod === 'morning'}
            isCompleted={isCheckInCompletedToday('morning')}
            onPress={handleCheckInPress}
          />

          <CheckInCard
            type="midday"
            title="Midday Reset"
            description="Take a moment to reconnect with the present through mindful awareness."
            duration="3 min"
            isCurrent={currentPeriod === 'midday'}
            isCompleted={isCheckInCompletedToday('midday')}
            onPress={handleCheckInPress}
          />

          <CheckInCard
            type="evening"
            title="Evening Reflection"
            description="Reflect on your day with gratitude and intention. Release what's done and rest peacefully."
            duration="5-6 min"
            isCurrent={currentPeriod === 'evening'}
            isCompleted={isCheckInCompletedToday('evening')}
            onPress={handleCheckInPress}
          />
        </View>
      </View>

      {/* Crisis Button Overlay */}
      <CollapsibleCrisisButton
        mode="standard"
        onNavigate={() => navigation.navigate('CrisisResources')}
        testID="crisis-home"
      />

      {/* Intro Animation Overlay */}
      {showIntro && (
        <IntroOverlay
          onComplete={handleIntroComplete}
          greeting={getGreeting()}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[24],
  },
  header: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  appTitle: {
    fontSize: typography.display2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.midnightBlue,
    marginBottom: spacing[4],
  },
  greeting: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: borderRadius.xs,
  },
  subtitle: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    marginBottom: spacing[12],
  },
  checkInSection: {
    flex: 1,
    marginTop: spacing[12],
  },
  checkInCard: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: spacing[16],
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[20], // Extra to optically balance with title line-height
    borderRadius: borderRadius.large,
    marginBottom: spacing[16],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: borderRadius.xs,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  cardTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
  },
  durationBadge: {
    fontSize: typography.micro.size,
    color: colorSystem.gray[600],
    backgroundColor: colorSystem.gray[100],
    paddingHorizontal: borderRadius.medium,
    paddingVertical: borderRadius.xs,
    borderRadius: borderRadius.medium,
    fontWeight: typography.fontWeight.medium,
  },
  cardDescription: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    lineHeight: typography.title.size,
    marginBottom: spacing[12], // Space before button
  },
  startButton: {
    paddingVertical: spacing[12],
    borderRadius: spacing[12],
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default CleanHomeScreen;