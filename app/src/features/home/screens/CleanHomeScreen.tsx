/**
 * Clean Home Screen - Fresh start implementation
 * Shows three DRD-compliant check-in cards without crypto dependencies
 * Integrated with check-in flow navigation
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, getTheme, spacing } from '@/core/theme/colors';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import { useSettingsStore, useAccessibilitySettings } from '@/core/stores/settingsStore';
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';
import AssessmentStatusBadge from '@/features/assessment/components/AssessmentStatusBadge';
import { IntroOverlay } from '../components/IntroOverlay';

// 30 minutes in milliseconds
const INTRO_THRESHOLD_MS = 30 * 60 * 1000;

type CleanHomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const CleanHomeScreen: React.FC = () => {
  const navigation = useNavigation<CleanHomeScreenNavigationProp>();
  const { isCheckInCompletedToday } = useStoicPracticeStore();
  const accessibilitySettings = useAccessibilitySettings();
  const getLastActiveTimestamp = useSettingsStore((state) => state.getLastActiveTimestamp);
  const currentHour = new Date().getHours();

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

  const handleCheckInPress = (type: 'morning' | 'midday' | 'evening') => {
    switch (type) {
      case 'morning':
        // Navigate to Morning Flow (6-screen body scan & awareness)
        navigation.navigate('MorningFlow');
        break;
      case 'midday':
        // Navigate to 3-Minute Breathing Space
        navigation.navigate('MiddayFlow');
        break;
      case 'evening':
        // Navigate to Evening Flow (4-screen reflection & preparation)
        navigation.navigate('EveningFlow');
        break;
    }
  };

  const CheckInCard: React.FC<{
    type: 'morning' | 'midday' | 'evening';
    title: string;
    description: string;
    duration: string;
  }> = ({ type, title, description, duration }) => {
    const isCurrent = type === currentPeriod;
    const themeColors = getTheme(type);
    const isImplemented = true; // All flows are now implemented
    const isCompleted = isCheckInCompletedToday(type);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.checkInCard,
          {
            backgroundColor: themeColors.background,
            borderColor: isCurrent ? themeColors.primary : colorSystem.gray[200],
            borderWidth: isCurrent ? 2 : 1,
            opacity: pressed ? 0.9 : (!isImplemented ? 0.6 : isCompleted ? 0.5 : 1),
          }
        ]}
        onPress={() => handleCheckInPress(type)}
        disabled={!isImplemented}
        accessibilityRole="button"
        accessibilityLabel={`${title} check-in`}
        accessibilityHint={isImplemented
          ? isCompleted
            ? `${title} check-in completed today. Tap to do again.`
            : `Start your ${type} mindfulness check-in, estimated ${duration}`
          : `${title} check-in coming soon`
        }
        accessibilityState={{ disabled: !isImplemented }}
      >
        <View>
          <View style={styles.cardHeader}>
            <Text style={[
              styles.cardTitle,
              { color: themeColors.primary }
            ]}>
              {title}
            </Text>
            <Text style={styles.durationBadge}>{duration}</Text>
          </View>
          <Text style={styles.cardDescription} numberOfLines={2}>{description}</Text>
        </View>

        <View style={[
          styles.startButton,
          {
            backgroundColor: isImplemented
              ? themeColors.primary
              : colorSystem.gray[400]
          }
        ]}>
          <Text style={styles.startButtonText}>
            {!isImplemented
              ? 'Coming Soon'
              : isCompleted
                ? 'Complete'
                : 'Start'}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>Being.</Text>
          <Text style={styles.greeting}>{getGreeting()}</Text>
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
          />

          <CheckInCard
            type="midday"
            title="Midday Reset"
            description="Take a moment to reconnect with the present and reset your energy."
            duration="3 min"
          />

          <CheckInCard
            type="evening"
            title="Evening Reflection"
            description="Reflect on your day and prepare your mind for restful sleep."
            duration="5-6 min"
          />
        </View>
      </View>

      {/* Crisis Button Overlay */}
      <CollapsibleCrisisButton testID="crisis-home" />

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
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colorSystem.base.midnightBlue,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colorSystem.gray[600],
    textAlign: 'center',
    marginBottom: 10,
  },
  checkInSection: {
    flex: 1,
    marginTop: 12,
  },
  checkInCard: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: 35,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: '600',
  },
  durationBadge: {
    fontSize: 11,
    color: colorSystem.gray[600],
    backgroundColor: colorSystem.gray[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 14,
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
  startButton: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default CleanHomeScreen;