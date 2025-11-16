/**
 * Clean Home Screen - Fresh start implementation
 * Shows three DRD-compliant check-in cards without crypto dependencies
 * Integrated with check-in flow navigation
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, getTheme, spacing } from '@/core/theme/colors';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import { useStoicPracticeStore } from '../../stores/stoicPracticeStore';
import { CollapsibleCrisisButton } from '../../flows/shared/components/CollapsibleCrisisButton';
import AssessmentStatusBadge from '../../components/AssessmentStatusBadge';

type CleanHomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const CleanHomeScreen: React.FC = () => {
  const navigation = useNavigation<CleanHomeScreenNavigationProp>();
  const { isCheckInCompletedToday } = useStoicPracticeStore();
  const currentHour = new Date().getHours();

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
        <View style={styles.cardHeader}>
          <Text style={[
            styles.cardTitle,
            { color: themeColors.primary }
          ]}>
            {title}
          </Text>
          <Text style={styles.durationBadge}>{duration}</Text>
        </View>

        <Text style={styles.cardDescription}>{description}</Text>

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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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

        {/* Check-in Cards */}
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

        {/* Current Period Indicator */}
        <View style={styles.currentPeriodSection}>
          <Text style={styles.currentPeriodText}>
            Current period: <Text style={{
              color: getTheme(currentPeriod).primary,
              fontWeight: '600'
            }}>{currentPeriod}</Text>
          </Text>
        </View>
      </ScrollView>

      {/* Crisis Button Overlay */}
      <CollapsibleCrisisButton testID="crisis-home" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colorSystem.gray[600],
    textAlign: 'center',
  },
  checkInSection: {
    marginBottom: spacing.xl,
  },
  checkInCard: {
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  durationBadge: {
    fontSize: 12,
    color: colorSystem.gray[600],
    backgroundColor: colorSystem.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  startButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  currentPeriodSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  currentPeriodText: {
    fontSize: 14,
    color: colorSystem.gray[600],
  },
});

export default CleanHomeScreen;