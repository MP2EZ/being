/**
 * Onboarding Screen
 * 5-screen onboarding flow (welcome, stoicIntro, notifications, privacy, celebration)
 * Provides user consent (via consentStore), notification preferences, and crisis resources
 * Crisis button integration on every screen (<3s access)
 */


import { logSecurity, logPerformance, logError, LogCategory } from '@/core/services/logging';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Alert,
  AccessibilityInfo,
  Platform,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import { useAnalytics } from '@/core/analytics';
import NotificationTimePicker from '@/core/components/NotificationTimePicker';
import BrainIcon from '@/core/components/shared/BrainIcon';
import { useConsentStore, ConsentPreferences, getLegalGateConsents } from '@/core/stores/consentStore';
import { ConsentToggleCard } from '@/features/consent';
import { colorSystem, spacing, borderRadius, typography, semantic } from '@/core/theme';
import { PRINCIPLES } from '@/features/practices/shared/constants/principles';

// Local colors for onboarding (flat access for convenience in this large file)
const localColors = {
  // Base colors
  white: colorSystem.base.white,
  black: colorSystem.base.black,
  midnightBlue: colorSystem.base.midnightBlue,
  // Gray scale
  gray100: colorSystem.gray[100],
  gray200: colorSystem.gray[200],
  gray300: colorSystem.gray[300],
  gray400: colorSystem.gray[400],
  gray700: colorSystem.gray[700],
  // Theme colors
  morningPrimary: colorSystem.themes.morning.primary,
  eveningPrimary: colorSystem.themes.evening.primary,
  // Aliases for onboarding-specific naming
  crisisRed: colorSystem.status.error,
  focusBlue: colorSystem.accessibility.focus.primary,
  successGreen: colorSystem.status.success,
  warningAmber: colorSystem.status.warning,
};

// WCAG-AA accessibility constants
const ACCESSIBILITY = {
  // Touch target minimum sizes (iOS Human Interface Guidelines)
  MIN_TOUCH_TARGET: 44,
  // Focus indicator minimum contrast ratio (WCAG 2.1 AA)
  MIN_FOCUS_CONTRAST: 3.0,
  // Text scaling support (WCAG 2.1 AA)
  MAX_TEXT_SCALE: 2.0,
  // Live region politeness levels
  LIVE_REGION: {
    POLITE: 'polite' as const,
    ASSERTIVE: 'assertive' as const,
  },
  // Timeout accommodations (20x base time for cognitive accessibility)
  ASSESSMENT_TIMEOUT_MS: 20 * 60 * 1000, // 20 minutes per assessment
} as const;

// NOTE: PHQ9_QUESTIONS and GAD7_QUESTIONS now imported from shared assessment types
// This eliminates duplication and ensures clinical accuracy across the app

// Therapeutic Values (15 evidence-based values) with Privacy compliance

// TypeScript strict mode interfaces and types
type Screen = 'welcome' | 'stoicIntro' | 'notifications' | 'privacy' | 'celebration';

// Data Retention and Minimization (used by NotificationTime)
type RetentionPeriod = '30_days' | '90_days' | '1_year' | '7_years' | 'indefinite';
type DataMinimizationStatus = 'necessary' | 'optional' | 'excessive' | 'prohibited';

// FEAT-298 slice 5: ONE reminder for ONE daily ritual. The three time-of-day periods are
// retired with the three flows. (These values are still component-local and are neither
// persisted nor scheduled — there is no reminder scheduling in the app; see AppSettings.
// Collapsing them is about not PROMISING three reminders for one practice.)
interface NotificationTime {
  period: 'daily';
  time: string;
  enabled: boolean;
  dataMinimization: DataMinimizationStatus;
  retentionPeriod: RetentionPeriod;
}


// NOTE: Question and Answer interfaces removed - assessments now handled by EnhancedAssessmentFlow

// Component props interface for embedded mode support
interface OnboardingScreenProps {
  onComplete?: (destination?: 'home' | 'practice') => void;
  isEmbedded?: boolean;
}

// Crisis detection result interface
interface CrisisDetectionResult {
  isCrisis: boolean;
  reason: 'phq_total' | 'gad_total' | 'suicidal_ideation' | 'none';
  score?: number;
  // Privacy: Crisis events require special audit trail
  emergencyOverride: boolean; // Crisis can override privacy restrictions
  auditRequired: boolean;
}

// Consent category details (plain language, reused from ConsentManagementScreen)
const CONSENT_DETAILS = {
  analytics: {
    title: 'Analytics',
    description: 'Help us improve the app by understanding how it\'s used',
    details: {
      whatWeCollect: [
        'Which features you use (e.g., "Daily Check-in completed")',
        'How long you spend in the app',
        'Device type (iPhone, Android, etc.)',
      ],
      whatWeDontCollect: [
        'Your journal entries, mood ratings, or assessment scores',
        'Any personally identifiable information',
        'Location data',
      ],
      whyItHelps: 'Understanding usage patterns helps us improve features you care about and fix confusing flows.',
      privacyNote: 'Data retention: 90 days, then automatically deleted. Anonymized before storage.',
    },
  },
  crashReports: {
    title: 'Crash Reports',
    description: 'Automatically report errors to fix bugs faster',
    details: {
      whatWeCollect: [
        'Technical error logs (which code failed)',
        'Device info (OS version, app version)',
        'What screen you were on when the crash occurred',
      ],
      whatWeDontCollect: [
        'Your personal data (mood, journal, assessments)',
        'Identifiable information',
      ],
      whyItHelps: 'Crashes disrupt your practice. Automatic reports help us detect and fix issues before they affect more people.',
      privacyNote: 'All crash reports are encrypted and anonymized.',
    },
  },
  cloudSync: {
    title: 'Cloud Backup',
    description: 'Securely sync your data across devices',
    details: {
      whatWeCollect: [
        'App preferences and settings',
        'Journal entries (encrypted)',
        'Mood tracking history',
        'Custom reminders',
      ],
      whatWeDontCollect: [
        'PHQ-9/GAD-7 assessment raw scores (local only for privacy)',
        'Crisis contact information (device-specific)',
      ],
      whyItHelps: 'Restore data if you get a new phone. Access your journal on tablet and phone. Automatic backup protection.',
      privacyNote: 'End-to-end encryption. We cannot decrypt or access your synced content.',
    },
  },
  research: {
    title: 'Research Participation',
    description: 'Help improve mental health care (fully anonymous)',
    details: {
      whatWeCollect: [
        'Aggregated mood trends (e.g., "60% of users report improvement")',
        'Feature effectiveness data (which practices help most)',
        'Anonymized usage patterns',
      ],
      whatWeDontCollect: [
        'Individual responses or identifiable data',
        'Data shared with third parties for advertising',
        'Anything that could identify you',
      ],
      whyItHelps: 'Research helps us validate that Stoic practices are effective, publish findings to help more people, and secure funding to keep the app accessible.',
      privacyNote: 'Fully anonymized. Aggregated with 1,000+ other users. You can opt out anytime.',
    },
  },
};

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete, isEmbedded = false }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const {
    trackScreenView,
    trackOnboardingStarted,
    trackOnboardingStepCompleted,
    trackOnboardingCompleted,
  } = useAnalytics();

  // Primary state (following ExercisesScreen pattern)
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [notificationTimes, setNotificationTimes] = useState<NotificationTime[]>([
    { period: 'daily', time: '09:00', enabled: true, dataMinimization: 'necessary', retentionPeriod: '90_days' },
  ]);
  const [completionDestination, setCompletionDestination] = useState<'home' | 'practice'>('home');

  // Granular consent preferences (FEAT-90: all default to false for privacy)
  const [consentPreferences, setConsentPreferences] = useState<ConsentPreferences>({
    analyticsEnabled: false,
    crashReportsEnabled: false,
    cloudSyncEnabled: false,
    researchEnabled: false,
    mentalHealthProcessingConsent: false,
  });

  // Get consent store functions
  const { grantConsent, getStoredAgeVerification } = useConsentStore();

  // Time picker state management
  const [showTimePicker, setShowTimePicker] = useState<'daily' | null>(null);
  const [tempTimePickerValue, setTempTimePickerValue] = useState<Date>(new Date());

  // ACCESSIBILITY STATE MANAGEMENT
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState<boolean>(false);
  const [announceText, setAnnounceText] = useState<string>('');
  const [lastAnnouncementTime, setLastAnnouncementTime] = useState<number>(0);
  const [focusedElementId, setFocusedElementId] = useState<string | null>(null);

  // Refs for programmatic focus management
  const scrollViewRef = useRef<ScrollView>(null);
  const primaryButtonRef = useRef<View>(null);
  const crisisButtonRef = useRef<View>(null);
  const currentQuestionRef = useRef<View>(null);

  // Track screen view and onboarding start for analytics (FEAT-137)
  useFocusEffect(
    useCallback(() => {
      trackScreenView('OnboardingScreen');
      // Track onboarding started only on the welcome screen (first entry)
      if (currentScreen === 'welcome') {
        trackOnboardingStarted();
      }
    }, [trackScreenView, trackOnboardingStarted, currentScreen])
  );

  // Screen reader detection and announcement management
  useEffect(() => {
    const checkScreenReader = async () => {
      try {
        const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
        setIsScreenReaderEnabled(screenReaderEnabled);
      } catch (error) {
        if (__DEV__) {
          logSecurity('[Accessibility] Failed to detect screen reader:', 'medium', { error });
        }
      }
    };

    checkScreenReader();

    // Listen for screen reader state changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled: boolean) => {
        setIsScreenReaderEnabled(enabled);
        if (enabled) {
          announceToScreenReader('Screen reader accessibility features enabled');
        }
      }
    );

    return () => {
      subscription?.remove();
    };
  }, []);


  // Screen reader announcement helper
  const announceToScreenReader = (text: string, politeness: 'polite' | 'assertive' = 'polite'): void => {
    if (!isScreenReaderEnabled) return;

    // Prevent duplicate rapid announcements
    const now = Date.now();
    if (now - lastAnnouncementTime < 1000 && announceText === text) {
      return;
    }

    setAnnounceText(text);
    setLastAnnouncementTime(now);

    // Use AccessibilityInfo for immediate announcement
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(text);
    }
  };

  // Focus management for keyboard navigation
  const manageFocus = (elementId: string, ref?: React.RefObject<any>): void => {
    setFocusedElementId(elementId);

    // Announce focus change to screen reader
    if (isScreenReaderEnabled) {
      const elementLabels: Record<string, string> = {
        'crisis-button': 'Crisis support button focused',
        'primary-button': 'Continue button focused',
        'back-button': 'Back button focused',
        'question': 'Assessment question focused',
        'option': 'Response option focused',
        'value-card': 'Therapeutic value focused',
      };

      const label = elementLabels[elementId] || 'Element focused';
      announceToScreenReader(label, 'polite');
    }

    // Scroll element into view if ref provided
    if (ref?.current && scrollViewRef.current) {
      ref.current.measureLayout(
        scrollViewRef.current,
        (x: number, y: number) => {
          scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
        },
        () => {
          // Measurement failed, fallback to basic scroll
          if (__DEV__) {
            logSecurity('[Accessibility] Failed to measure element for scroll', 'low');
          }
        }
      );
    }
  };

  // Progress announcement for screen readers
  const announceProgress = (): void => {
    if (!isScreenReaderEnabled) return;

    const progress = getProgressPercentage();
    const progressText = `Onboarding progress: ${progress}% complete.`;
    announceToScreenReader(progressText);
  };

  // NOTE: Assessment handler functions removed (~236 lines):
  // - validateAssessmentAnswer() - now handled by EnhancedAssessmentFlow
  // - checkCrisisConditions() - now handled by EnhancedAssessmentFlow
  // - resetAssessmentState() - no longer needed
  // - handleAssessmentAnswer() - now handled by EnhancedAssessmentFlow modal
  // - showCrisisAlert() - now handled by EnhancedAssessmentFlow
  // - handleCrisisButtonPress() - not used (the root-level crisis overlay handles crisis access)
  // Assessments now presented via AssessmentFlow modal (see navigateNext welcome case)

  const validateNotificationTimes = (times: NotificationTime[]): boolean => {
    // FEAT-298 slice 5: was `times.length === 3`, which blocked Continue the moment the
    // three time-of-day reminders collapsed to one daily reminder.
    return times.length > 0 && times.every(t => t.period === 'daily');
  };

  // State reset/cleanup functions (following ExercisesScreen pattern)

  const resetOnboardingState = (): void => {
    setCurrentScreen('welcome');
    setNotificationTimes([
      { period: 'daily', time: '09:00', enabled: true, dataMinimization: 'necessary', retentionPeriod: '90_days' },
    ]);
  };

  // State debugging helpers (development only)
  const getStateDebugInfo = (): object | null => {
    if (__DEV__) {
      return {
        currentScreen,
        notificationSettings: notificationTimes.map(n => `${n.period}:${n.enabled}`),
        progressPercentage: getProgressPercentage(),
      };
    }
    return null;
  };

  // Log state changes in development (following ExercisesScreen safety pattern)
  const logStateChange = (action: string, data?: any): void => {
    if (__DEV__) {
      logPerformance(`[OnboardingState] ${action}`, data || getStateDebugInfo());
    }
  };

  const getProgressPercentage = (): number => {
    const screenOrder: Screen[] = ['welcome', 'stoicIntro', 'notifications', 'privacy', 'celebration'];
    const currentIndex = screenOrder.indexOf(currentScreen);
    return Math.round((currentIndex / (screenOrder.length - 1)) * 100);
  };

  const navigateNext = (): void => {
    logStateChange('navigateNext', { from: currentScreen });

    // Announce screen transitions to screen reader
    const screenTransitions: Record<Screen, string> = {
      'welcome': 'Starting mental health assessments.',
      'stoicIntro': 'Introduction complete. Setting up notification preferences.',
      'notifications': 'Notifications configured. Reviewing privacy and consent information.',
      'privacy': 'Setup complete! Welcome to your mindful journey.',
      'celebration': 'Onboarding finished. Redirecting to main application.',
    };

    switch (currentScreen) {
      case 'welcome':
        // Navigate to PHQ-9 assessment modal
        navigation.navigate('AssessmentFlow', {
          assessmentType: 'phq9',
          context: 'onboarding',
          allowSkip: true,
          onComplete: (result) => {
            console.log('✅ PHQ-9 onboarding completed:', result);
            // Modal already dismissed by CleanRootNavigator, just open GAD-7
            setTimeout(() => {
              navigation.navigate('AssessmentFlow', {
                assessmentType: 'gad7',
                context: 'onboarding',
                allowSkip: true,
                onComplete: (result) => {
                  console.log('✅ GAD-7 onboarding completed:', result);
                  // Modal already dismissed, continue to Stoic intro
                  setCurrentScreen('stoicIntro');
                  logStateChange('navigateNext:assessments->stoicIntro');
                  trackOnboardingStepCompleted(1); // Track step completion (FEAT-137)
                  announceToScreenReader('Assessments complete. Learning about Stoic Mindfulness.');
                },
                onSkip: () => {
                  // Modal already dismissed, continue to Stoic intro
                  setCurrentScreen('stoicIntro');
                  logStateChange('navigateNext:gad7-skipped->stoicIntro');
                  trackOnboardingStepCompleted(1); // Track step completion (FEAT-137)
                },
              });
            }, 50);
          },
          onSkip: () => {
            // PHQ-9 skipped, modal already dismissed, go to GAD-7
            setTimeout(() => {
              navigation.navigate('AssessmentFlow', {
                assessmentType: 'gad7',
                context: 'onboarding',
                allowSkip: true,
                onComplete: (result) => {
                  console.log('✅ GAD-7 onboarding completed:', result);
                  // Modal already dismissed, continue to Stoic intro
                  setCurrentScreen('stoicIntro');
                  logStateChange('navigateNext:gad7->stoicIntro');
                  trackOnboardingStepCompleted(1); // Track step completion (FEAT-137)
                },
                onSkip: () => {
                  // Modal already dismissed, continue to Stoic intro
                  setCurrentScreen('stoicIntro');
                  logStateChange('navigateNext:assessments-skipped->stoicIntro');
                  trackOnboardingStepCompleted(1); // Track step completion (FEAT-137)
                },
              });
            }, 50);
          },
        });
        logStateChange('navigateNext:welcome->assessments');
        announceToScreenReader(screenTransitions.welcome);
        break;

      case 'stoicIntro':
        // No validation needed - educational screen only
        setCurrentScreen('notifications');
        logStateChange('navigateNext:stoicIntro->notifications');
        trackOnboardingStepCompleted(2); // Track step completion (FEAT-137)

        // Accessibility: Announce transition
        announceToScreenReader(screenTransitions.stoicIntro);
        announceProgress();
        break;

      case 'notifications':
        // Validate notification settings
        if (!validateNotificationTimes(notificationTimes)) {
          logStateChange('navigateNext:notifications:invalid');

          // Accessibility: Announce validation error
          announceToScreenReader('Please configure your notification preferences before continuing.', 'assertive');
          return;
        }
        setCurrentScreen('privacy');
        logStateChange('navigateNext:notifications->privacy');
        trackOnboardingStepCompleted(3); // Track step completion (FEAT-137)

        // Accessibility: Announce transition
        announceToScreenReader(screenTransitions.notifications);
        announceProgress();
        break;

      case 'privacy':
        // No validation needed - granular consent toggles are optional
        // ToS consent was already given in CombinedLegalGateScreen
        setCurrentScreen('celebration');
        logStateChange('navigateNext:privacy->celebration');
        trackOnboardingStepCompleted(4); // Track step completion (FEAT-137)

        // Accessibility: Announce transition
        announceToScreenReader(screenTransitions.privacy);
        announceProgress();
        break;

      case 'celebration':
        // Complete onboarding with state persistence
        logStateChange('navigateNext:celebration:complete', getStateDebugInfo());
        trackOnboardingCompleted(); // Track onboarding completion (FEAT-137)

        // Accessibility: Announce completion
        announceToScreenReader(screenTransitions.celebration);

        if (isEmbedded && onComplete) {
          // Call completion handler for embedded mode with destination
          onComplete(completionDestination);
        } else {
          // Show alert for standalone mode
          Alert.alert('Welcome to Being.', 'Your mindful journey begins now.');
        }
        break;
    }
  };

  const navigateBack = (): void => {
    logStateChange('navigateBack', { from: currentScreen });

    switch (currentScreen) {
      case 'stoicIntro':
        setCurrentScreen('welcome');
        logStateChange('navigateBack:stoicIntro->welcome');
        break;
      case 'notifications':
        setCurrentScreen('stoicIntro');
        logStateChange('navigateBack:notifications->stoicIntro');
        break;
      case 'privacy':
        setCurrentScreen('notifications');
        logStateChange('navigateBack:privacy->notifications');
        break;
      case 'celebration':
        setCurrentScreen('privacy');
        logStateChange('navigateBack:celebration->privacy');
        break;
    }
  };


  // Enhanced notification time handler with validation
  const handleNotificationToggle = (index: number): void => {
    if (index < 0 || index >= notificationTimes.length) {
      logStateChange('handleNotificationToggle:invalid_index', { index });
      return;
    }

    const updated = [...notificationTimes];
    updated[index]!.enabled = !updated[index]!.enabled;
    setNotificationTimes(updated);

    logStateChange('handleNotificationToggle', {
      period: updated[index]!.period,
      enabled: updated[index]!.enabled,
      enabledCount: updated.filter(n => n.enabled).length
    });
  };

  // Time picker handlers
  const handleOpenTimePicker = (period: 'daily'): void => {
    const notification = notificationTimes.find(n => n.period === period);
    if (!notification) return;

    // Parse current time string (e.g., "09:00") into a Date object
    const [hours, minutes] = notification.time.split(':').map(Number);
    const timeDate = new Date();
    timeDate.setHours(hours ?? 0, minutes ?? 0, 0, 0);

    setTempTimePickerValue(timeDate);
    setShowTimePicker(period);

    logStateChange('handleOpenTimePicker', { period, currentTime: notification.time });
  };

  const handleTimePickerConfirm = (selectedTime: Date): void => {
    if (!showTimePicker) return;

    // Convert Date to time string (e.g., "09:00")
    const hours = selectedTime.getHours().toString().padStart(2, '0');
    const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    // Update notification time
    const updated = notificationTimes.map(n =>
      n.period === showTimePicker
        ? { ...n, time: timeString }
        : n
    );
    setNotificationTimes(updated);

    logStateChange('handleTimePickerConfirm', {
      period: showTimePicker,
      newTime: timeString,
    });

    // Close picker
    setShowTimePicker(null);

    // Announce change for screen readers
    if (isScreenReaderEnabled) {
      setAnnounceText(`${showTimePicker} notification time changed to ${selectedTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`);
    }
  };

  const handleTimePickerCancel = (): void => {
    setShowTimePicker(null);
    logStateChange('handleTimePickerCancel', { period: showTimePicker });
  };

  // Celebration screen button handlers for destination-aware navigation
  const handleStartMorningPractice = (): void => {
    logStateChange('handleStartMorningPractice', { currentScreen });
    setCompletionDestination('practice');
    navigateNext();
  };

  const handleExploreApp = (): void => {
    logStateChange('handleExploreApp', { currentScreen });
    setCompletionDestination('home');
    navigateNext();
  };

  // State persistence helpers (following ExercisesScreen pattern)
  const getOnboardingSnapshot = (): object => {
    return {
      currentScreen,
      notificationTimes,
      timestamp: Date.now(),
    };
  };

  const validateOnboardingState = (): boolean => {
    const isValid = {
      screen: ['welcome', 'stoicIntro', 'notifications', 'privacy', 'celebration'].includes(currentScreen),
      notifications: validateNotificationTimes(notificationTimes),
    };

    const hasErrors = Object.values(isValid).some(v => !v);
    if (hasErrors && __DEV__) {
      logSecurity('[OnboardingState] Validation errors:', 'low', { validationErrors: isValid });
    }

    return !hasErrors;
  };

  // Render Functions (7 screens) - all typed with JSX.Element return

  const renderWelcome = (): React.ReactElement => (
    // INFRA-181: dropped `accessible={true}` from the SafeAreaView — on iOS,
    // it collapsed the entire screen into one a11y element and hid the inner
    // "Begin Your Practice" Pressable from VoiceOver AND Maestro. The header
    // Text below provides the screen-level announcement.
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        accessible={false}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Live region for announcements */}
        <View
          accessible={true}
          accessibilityRole="alert"
          accessibilityLiveRegion={ACCESSIBILITY.LIVE_REGION.POLITE}
          style={{ position: 'absolute', left: -10000 }}
        >
          <Text>{announceText}</Text>
        </View>

        {/* Crisis button removed from Welcome screen - only on assessment screens for safety */}

        <View
          style={styles.header}
          accessible={true}
          accessibilityRole="header"
        >
          <View
            accessible={true}
            accessibilityLabel="Being logo"
            accessibilityRole="image"
            style={styles.welcomeIconContainer}
          >
            <BrainIcon color={localColors.midnightBlue} size={80} />
          </View>
          <Text
            style={styles.title}
            accessible={true}
            accessibilityRole="header"
            allowFontScaling={true}
            maxFontSizeMultiplier={ACCESSIBILITY.MAX_TEXT_SCALE}
          >
            Welcome to Your Mindfulness Journey
          </Text>
          <Text
            style={styles.subtitle}
            accessible={true}
            accessibilityRole="text"
            allowFontScaling={true}
            maxFontSizeMultiplier={ACCESSIBILITY.MAX_TEXT_SCALE}
          >
            Daily mindfulness practice enriched by Stoic philosophy
          </Text>
        </View>

        <View
          style={styles.section}
          accessible={true}
          accessibilityRole="text"
        >
          <View
            style={styles.featureList}
            accessible={true}
            accessibilityRole="list"
            accessibilityLabel="Being features"
          >
            <Text
              style={styles.featureText}
              accessible={true}
              accessibilityRole="text"
              allowFontScaling={true}
              maxFontSizeMultiplier={ACCESSIBILITY.MAX_TEXT_SCALE}
            >
              ✓ Daily mindfulness practice with meaning
            </Text>
            <Text
              style={styles.featureText}
              accessible={true}
              accessibilityRole="text"
              allowFontScaling={true}
              maxFontSizeMultiplier={ACCESSIBILITY.MAX_TEXT_SCALE}
            >
              ✓ Enriched by Stoic philosophy
            </Text>
            <Text
              style={styles.featureText}
              accessible={true}
              accessibilityRole="text"
              allowFontScaling={true}
              maxFontSizeMultiplier={ACCESSIBILITY.MAX_TEXT_SCALE}
            >
              ✓ Mental wellness with depth
            </Text>
          </View>
        </View>

        <Pressable
          ref={primaryButtonRef}
          style={[styles.primaryButton, styles.accessibleTouchTarget]}
          onPress={() => {
            manageFocus('primary-button', primaryButtonRef);
            navigateNext();
          }}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Begin Your Practice"
          accessibilityHint="Double tap to start the wellness check-in and onboarding process"
          accessibilityState={{ disabled: false }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text
            style={styles.primaryButtonText}
            accessible={false}
            allowFontScaling={true}
            maxFontSizeMultiplier={ACCESSIBILITY.MAX_TEXT_SCALE}
          >
            Begin Your Practice
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );

  // NOTE: renderPhq9() and renderGad7() removed (~436 lines)
  // Assessments now handled by EnhancedAssessmentFlow modal

  const renderStoicIntro = (): React.ReactElement => (
    // INFRA-181: same fix as renderWelcome — collapsing the screen as one
    // a11y element hides interior buttons from VoiceOver and Maestro.
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        accessible={false}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Stoic Mindfulness</Text>
          <Text style={styles.subtitle}>
            Ancient wisdom meets modern mindfulness for mental wellbeing
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.bodyText}>
            Stoic Mindfulness combines present-moment awareness with classical Stoic philosophy from Marcus Aurelius, Epictetus, and Seneca.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Five Core Principles</Text>

          {/* FEAT-268: principle copy single-sourced from the canonical constant (short form). */}
          {PRINCIPLES.map((principle, index) => (
            <View key={principle.key} style={styles.principleCard}>
              <Text style={styles.principleTitle}>{`${index + 1}. ${principle.title}`}</Text>
              <Text style={styles.principleDescription}>{principle.shortDescription}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Four Cardinal Virtues</Text>
          <Text style={styles.bodyText}>
            These universal virtues guide character development:
          </Text>
          
          <Text style={styles.bulletText}>• Wisdom - Sound judgment and understanding</Text>
          <Text style={styles.bulletText}>• Courage - Facing challenges with strength</Text>
          <Text style={styles.bulletText}>• Justice - Fairness toward yourself and others</Text>
          <Text style={styles.bulletText}>• Temperance - Self-control and balance</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.bodyText}>
            Throughout your journey, you'll practice these principles and reflect on moments of virtue in your daily life.
          </Text>
        </View>

        <View style={styles.navigationContainer}>
          <Pressable
            style={[styles.backButton, styles.accessibleTouchTarget]}
            onPress={() => {
              announceToScreenReader('Going back to anxiety assessment');
              navigateBack();
            }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Pressable
            ref={primaryButtonRef}
            style={[styles.primaryButton, styles.accessibleTouchTarget]}
            onPress={() => {
              announceToScreenReader('Continuing to notification settings');
              navigateNext();
            }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            accessibilityHint="Double tap to continue to notification settings"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  const renderNotifications = (): React.ReactElement => (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Crisis button removed from Notifications screen - only on assessment screens for safety */}

        <View style={styles.header}>
          <Text style={styles.title}>Mindfulness Practice Reminders</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.bodyText}>
            Set reminders for your daily mindfulness practice.
          </Text>
        </View>

        <View style={styles.notificationContainer}>
          {notificationTimes.map((notification: NotificationTime, index: number) => {
            // Format time for display (convert "09:00" to "9:00 AM")
            const [hours = 0, minutes = 0] = notification.time.split(':').map(Number);
            const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;

            return (
              <View key={notification.period} style={styles.notificationRow}>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationPeriod}>
                    {notification.period.charAt(0).toUpperCase() + notification.period.slice(1)}
                  </Text>
                  <Pressable
                    onPress={() => handleOpenTimePicker(notification.period)}
                    style={styles.timeButton}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`${notification.period} notification time, ${formattedTime}`}
                    accessibilityHint="Double tap to change time"
                    disabled={!notification.enabled}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[
                      styles.notificationTime,
                      !notification.enabled && styles.notificationTimeDisabled
                    ]}>
                      {formattedTime}
                    </Text>
                  </Pressable>
                </View>
                <Pressable
                  style={[
                    styles.toggleButton,
                    notification.enabled && styles.toggleButtonEnabled
                  ]}
                  onPress={() => handleNotificationToggle(index)}
                  accessible={true}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: notification.enabled }}
                  accessibilityLabel={`${notification.period} notifications ${notification.enabled ? 'enabled' : 'disabled'}`}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    notification.enabled && styles.toggleButtonTextEnabled
                  ]}>
                    {notification.enabled ? 'On' : 'Off'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* Time Picker Modal */}
        {showTimePicker && (
          <NotificationTimePicker
            visible={true}
            value={tempTimePickerValue}
            period={showTimePicker}
            onConfirm={handleTimePickerConfirm}
            onCancel={handleTimePickerCancel}
          />
        )}

        <View style={styles.section}>
          <Pressable
            style={[styles.secondaryButton, styles.accessibleTouchTarget]}
            onPress={() => {
              // Skip to next screen
              navigateNext();
            }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Set up later"
            accessibilityHint="Skip reminder setup and continue to the next step"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.secondaryButtonText}>
              Set up later
            </Text>
          </Pressable>
        </View>

        <View style={styles.navigationContainer}>
          <Pressable style={styles.backButton} onPress={navigateBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={navigateNext}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Handler for granular consent toggles
  const handleConsentPreferenceToggle = (key: keyof ConsentPreferences, value: boolean) => {
    setConsentPreferences(prev => ({ ...prev, [key]: value }));
    logStateChange('handleConsentPreferenceToggle', { key, value });
  };

  /**
   * Read the legal-gate consents, retrying once (DEBUG-382).
   *
   * Transient SecureStore failures dominate this call's failure modes, and
   * reconstructing on the first miss would discard a value a second read would
   * have returned truthfully. The `.catch` is defensive: `getLegalGateConsents`
   * swallows internally today, but it is not this call site's job to depend on
   * that — a future change there must not silently reintroduce an unhandled
   * rejection here.
   */
  const readLegalGateConsentsWithRetry = async () => {
    const first = await getLegalGateConsents().catch(() => null);
    if (first) return first;
    return await getLegalGateConsents().catch(() => null);
  };

  // Save consent preferences when leaving privacy screen
  const handlePrivacyContinue = async () => {
    try {
      // Get stored age verification (from CombinedLegalGateScreen)
      const ageVerification = await getStoredAgeVerification();

      // Read back the four legal-gate consents (recorded on CombinedLegalGateScreen)
      // so the GDPR Art. 9 explicit-consent flag lands in the granted ConsentRecord.
      //
      // DEBUG-382: this read is retried once, and a persistent failure is
      // RECONSTRUCTED rather than defaulted. `getLegalGateConsents` returns null
      // for both "no record" and "the read or JSON.parse threw" (its catch is
      // bare), so the previous `?? false` silently recorded a user who had
      // TICKED the mandatory Art. 9 box as having REFUSED it — in the record
      // used as lawful-basis evidence, with no log and no trace.
      const legalGate = await readLegalGateConsentsWithRetry();

      // Reaching this screen is itself evidence the consent was given:
      // CombinedLegalGateScreen requires all four ticks to advance. So an
      // unreadable record is reconstructed from that enforced precondition, not
      // guessed. Recording `false` would manufacture a refusal the user never
      // made — and, once FEAT-318's write gate ships, a silent permanent lockout,
      // since that gate blocks exactly `valid` + `canProcessMentalHealthData:false`
      // and no UI exists to grant it.
      //
      // The precondition is pinned by CombinedLegalGateScreen.consentInvariant.test.tsx.
      // FEAT-318 Slice 2 plans to unbundle that tick; when it does, that suite
      // fails ON PURPOSE and this reconstruction must be revisited rather than
      // silently outliving its justification.
      const mentalHealthProcessingConsent =
        legalGate?.mentalHealthProcessingConsent ?? true;

      if (!legalGate) {
        logSecurity(
          'legal-gate consents unreadable at onboarding — Art. 9 flag reconstructed from the enforced gate invariant',
          'high',
          {
            component: 'OnboardingScreen',
            action: 'handlePrivacyContinue',
            result: 'failure',
            reconstructed: true,
            reconstructedValue: mentalHealthProcessingConsent,
          },
        );
      }

      const mergedPreferences: ConsentPreferences = {
        ...consentPreferences,
        mentalHealthProcessingConsent,
      };

      if (ageVerification) {
        await grantConsent(mergedPreferences, ageVerification);
        logStateChange('handlePrivacyContinue', { consentPreferences: mergedPreferences });
      } else {
        // This shouldn't happen if flow is correct, but log it
        logError(LogCategory.SECURITY, 'No age verification found during consent save');
      }

      navigateNext();
    } catch (error) {
      logError(LogCategory.SECURITY, 'Failed to save consent preferences', error instanceof Error ? error : undefined);
      // Still proceed - consent is optional
      navigateNext();
    }
  };

  const renderPrivacy = (): React.ReactElement => (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Crisis button removed from Privacy screen - only on assessment screens for safety */}

        <View style={styles.header}>
          <Text style={styles.title}>Privacy Settings</Text>
          <Text style={styles.subtitle}>
            Choose what to share (all optional)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.bodyText}>
            Your data stays on your device by default. These optional features enhance your experience but are not required.
          </Text>
        </View>

        {/* Privacy Principles - always visible */}
        <View style={[styles.consentSection, { marginBottom: spacing[24] }]}>
          <Text style={styles.featureText}>
            ✓ Your data is encrypted and secure
          </Text>
          <Text style={styles.featureText}>
            ✓ We never sell your information
          </Text>
          <Text style={styles.featureText}>
            ✓ Crisis support is always available
          </Text>
        </View>

        {/* Granular Consent Toggles (FEAT-90) */}
        <View style={styles.consentContainer}>
          <ConsentToggleCard
            title={CONSENT_DETAILS.analytics.title}
            description={CONSENT_DETAILS.analytics.description}
            details={CONSENT_DETAILS.analytics.details}
            value={consentPreferences.analyticsEnabled}
            onValueChange={(value) => handleConsentPreferenceToggle('analyticsEnabled', value)}
            testID="consent-analytics"
          />

          <ConsentToggleCard
            title={CONSENT_DETAILS.crashReports.title}
            description={CONSENT_DETAILS.crashReports.description}
            details={CONSENT_DETAILS.crashReports.details}
            value={consentPreferences.crashReportsEnabled}
            onValueChange={(value) => handleConsentPreferenceToggle('crashReportsEnabled', value)}
            testID="consent-crash-reports"
          />

          <ConsentToggleCard
            title={CONSENT_DETAILS.cloudSync.title}
            description={CONSENT_DETAILS.cloudSync.description}
            details={CONSENT_DETAILS.cloudSync.details}
            value={consentPreferences.cloudSyncEnabled}
            onValueChange={(value) => handleConsentPreferenceToggle('cloudSyncEnabled', value)}
            testID="consent-cloud-sync"
          />

          <ConsentToggleCard
            title={CONSENT_DETAILS.research.title}
            description={CONSENT_DETAILS.research.description}
            details={CONSENT_DETAILS.research.details}
            value={consentPreferences.researchEnabled}
            onValueChange={(value) => handleConsentPreferenceToggle('researchEnabled', value)}
            testID="consent-research"
          />
        </View>

        {/* Emergency Disclaimer */}
        <View style={[styles.consentSection, { marginTop: spacing[24] }]}>
          <Text style={[styles.bodyText, { fontSize: typography.bodySmall.size, fontStyle: 'italic' }]}>
            ⚠️ In a life-threatening emergency, call 911. For mental health crisis, call 988 Suicide & Crisis Lifeline.
          </Text>
        </View>

        <View style={styles.navigationContainer}>
          <Pressable style={styles.backButton} onPress={navigateBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Pressable
            style={styles.primaryButton}
            onPress={handlePrivacyContinue}
            accessibilityLabel="Continue"
            accessibilityHint="Save your privacy preferences and continue to the next screen"
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  const renderCelebration = (): React.ReactElement => (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Crisis button removed from Celebration screen - only on assessment screens for safety */}

        <View style={styles.header}>
          <Text style={styles.celebrationIcon}>🎉</Text>
          <Text style={styles.title}>Your Mindfulness Journey Begins</Text>
          <Text style={styles.subtitle}>
            Welcome to mindfulness enriched by Stoic philosophy—ancient wisdom from Marcus Aurelius, Epictetus, and Seneca that deepens your practice
          </Text>
        </View>

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Your Setup:</Text>

          {/* Assessment status will be shown on home screen via AssessmentStatusBadge */}

          <View style={styles.summarySection}>
            <Text style={styles.summaryLabel}>Reminders</Text>
            <Text style={styles.summaryValue}>
              ✓ {notificationTimes.filter(n => n.enabled).length > 0
                ? 'Daily practice reminder'
                : 'No reminder set'}
            </Text>
          </View>

          <View style={styles.summarySection}>
            <Text style={styles.summaryLabel}>Privacy Settings</Text>
            {consentPreferences.analyticsEnabled && (
              <Text style={styles.summaryValue}>✓ Analytics enabled</Text>
            )}
            {consentPreferences.crashReportsEnabled && (
              <Text style={styles.summaryValue}>✓ Crash reports enabled</Text>
            )}
            {consentPreferences.cloudSyncEnabled && (
              <Text style={styles.summaryValue}>✓ Cloud backup enabled</Text>
            )}
            {consentPreferences.researchEnabled && (
              <Text style={styles.summaryValue}>✓ Research participation enabled</Text>
            )}
            {!consentPreferences.analyticsEnabled &&
             !consentPreferences.crashReportsEnabled &&
             !consentPreferences.cloudSyncEnabled &&
             !consentPreferences.researchEnabled && (
              <Text style={styles.summaryValue}>✓ Privacy-first (all optional features off)</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Pressable style={styles.primaryButton} onPress={handleStartMorningPractice}>
            <Text style={styles.primaryButtonText}>Start Morning Practice</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, styles.accessibleTouchTarget, { marginTop: spacing[16] }]}
            onPress={handleExploreApp}
            testID="onboarding-explore-app"
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Explore App"
            accessibilityHint="Browse the app features before starting"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.secondaryButtonText}>Explore App</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // State validation check (development safety)
  if (__DEV__ && !validateOnboardingState()) {
    logStateChange('render:invalid_state', getStateDebugInfo());
  }

  // Screen routing (copying ExercisesScreen pattern) with state inspector
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'welcome': return renderWelcome();
      case 'stoicIntro': return renderStoicIntro();
      case 'notifications': return renderNotifications();
      case 'privacy': return renderPrivacy();
      case 'celebration': return renderCelebration();
      default:
        logStateChange('render:unknown_screen', { currentScreen });
        return renderWelcome(); // Fallback to welcome
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {renderCurrentScreen()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: localColors.white,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[24],
    paddingBottom: spacing[32],
  },
  // Crisis Button - Always at top
  crisisButtonContainer: {
    alignItems: 'flex-end',
    marginBottom: spacing[16],
  },
  header: {
    marginBottom: spacing[32],
    alignItems: 'center',
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: localColors.black,
    marginBottom: spacing[8],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  welcomeIcon: {
    fontSize: 48,
    marginBottom: spacing[16],
  },
  welcomeIconContainer: {
    marginBottom: spacing[16],
  },
  celebrationIcon: {
    fontSize: 48,
    marginBottom: spacing[16],
  },
  section: {
    marginBottom: spacing[32],
  },
  bodyText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 22,
    marginBottom: spacing[16],
  },
  sectionTitle: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.black,
    marginBottom: spacing[16],
  },
  principleCard: {
    backgroundColor: localColors.gray100,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginBottom: spacing[16],
    borderLeftWidth: 3,
    borderLeftColor: localColors.midnightBlue,
  },
  principleTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.black,
    marginBottom: spacing[8],
  },
  principleDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 20,
  },
  bulletText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 22,
    marginBottom: spacing[8],
  },
  featureList: {
    marginTop: spacing[16],
  },
  featureText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 22,
    marginBottom: spacing[8],
  },
  // Progress Bar
  progressContainer: {
    alignItems: 'center',
    marginBottom: spacing[24],
  },
  progressText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: semantic.text.secondary,
    marginBottom: spacing[8],
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: localColors.gray200,
    borderRadius: borderRadius.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: localColors.morningPrimary,
    borderRadius: borderRadius.xs,
  },
  // Assessment Questions
  questionContainer: {
    marginBottom: spacing[32],
  },
  questionIntro: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 22,
    marginBottom: spacing[16],
    textAlign: 'center',
  },
  questionText: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.medium,
    color: localColors.black,
    lineHeight: 28,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: spacing[16],
  },
  optionButton: {
    backgroundColor: localColors.gray100,
    borderWidth: 1,
    borderColor: localColors.gray300,
    borderRadius: borderRadius.large,
    padding: spacing[24],
    alignItems: 'center',
  },
  optionText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: localColors.black,
  },
  // Values Selection
  selectionCount: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: localColors.midnightBlue,
    textAlign: 'center',
  },
  valuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    marginBottom: spacing[32],
  },
  valueCard: {
    backgroundColor: localColors.gray100,
    borderWidth: 1,
    borderColor: localColors.gray300,
    borderRadius: borderRadius.large,
    padding: spacing[24],
  },
  valueCardSelected: {
    backgroundColor: localColors.morningPrimary,
    borderColor: localColors.morningPrimary,
  },
  valueCardDisabled: {
    backgroundColor: localColors.gray200,
    borderColor: localColors.gray300,
    opacity: 0.6,
  },
  valueLabel: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.black,
    marginBottom: spacing[8],
  },
  valueLabelSelected: {
    color: localColors.white,
  },
  valueDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 18,
  },
  valueDescriptionSelected: {
    color: localColors.white,
  },
  // Compact pill/chip styles for values
  valuePill: {
    backgroundColor: localColors.white,
    borderWidth: 1.5,
    borderColor: localColors.gray300,
    borderRadius: borderRadius.xxl,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    marginRight: spacing[8],
    marginBottom: spacing[8],
  },
  valuePillSelected: {
    backgroundColor: localColors.morningPrimary,
    borderColor: localColors.morningPrimary,
  },
  valuePillDisabled: {
    backgroundColor: localColors.gray100,
    borderColor: localColors.gray200,
    opacity: 0.5,
  },
  valuePillText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: localColors.midnightBlue,
  },
  valuePillTextSelected: {
    color: localColors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  // Notifications
  notificationContainer: {
    marginBottom: spacing[32],
    gap: spacing[16],
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: localColors.gray100,
    borderRadius: borderRadius.large,
    padding: spacing[24],
  },
  notificationInfo: {
    flex: 1,
  },
  notificationPeriod: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.black,
    marginBottom: spacing[8],
  },
  notificationTime: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
  },
  timeButton: {
    // Pressable wrapper for time display
    minHeight: ACCESSIBILITY.MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  notificationTimeDisabled: {
    color: localColors.gray400,
    opacity: 0.6,
  },
  toggleButton: {
    backgroundColor: localColors.gray300,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    minWidth: 60,
    alignItems: 'center',
  },
  toggleButtonEnabled: {
    backgroundColor: localColors.eveningPrimary,
  },
  toggleButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.secondary,
  },
  toggleButtonTextEnabled: {
    color: localColors.white,
  },
  // Privacy/Consent
  consentContainer: {
    marginBottom: spacing[32],
  },
  consentSection: {
    marginBottom: spacing[24],
  },
  consentTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.black,
    marginBottom: spacing[8],
  },
  consentText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 22,
  },
  consentCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: localColors.gray100,
    borderRadius: borderRadius.large,
    padding: spacing[24],
    marginTop: spacing[24],
  },
  consentCheckboxChecked: {
    backgroundColor: localColors.eveningPrimary,
  },
  consentCheckboxText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: localColors.black,
    flex: 1,
  },
  consentCheckboxTextChecked: {
    color: localColors.white,
  },
  // Celebration Summary
  summaryContainer: {
    backgroundColor: localColors.gray100,
    borderRadius: borderRadius.large,
    padding: spacing[24],
    marginBottom: spacing[32],
  },
  summaryTitle: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.black,
    marginBottom: spacing[24],
  },
  summarySection: {
    marginBottom: spacing[16],
  },
  summaryLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.black,
    marginBottom: spacing[8],
  },
  summaryValue: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 22,
  },
  // Navigation Buttons
  navigationContainer: {
    flexDirection: 'row',
    gap: spacing[16],
  },
  primaryButton: {
    backgroundColor: localColors.morningPrimary,
    borderRadius: borderRadius.large,
    padding: spacing[24],
    alignItems: 'center',
    flex: 1,
  },
  primaryButtonDisabled: {
    backgroundColor: localColors.gray400,
  },
  primaryButtonText: {
    color: localColors.white,
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
  },
  secondaryButton: {
    backgroundColor: localColors.gray200,
    borderRadius: borderRadius.large,
    padding: spacing[24],
    alignItems: 'center',
    marginTop: spacing[16],
  },
  secondaryButtonText: {
    color: localColors.black,
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
  },
  backButton: {
    backgroundColor: localColors.gray200,
    borderRadius: borderRadius.large,
    padding: spacing[24],
    alignItems: 'center',
    minWidth: 100,
  },
  backButtonText: {
    color: localColors.black,
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
  },
  // WCAG-AA ACCESSIBILITY STYLES
  // Minimum touch target size (44pt minimum per iOS/WCAG guidelines)
  accessibleTouchTarget: {
    minHeight: ACCESSIBILITY.MIN_TOUCH_TARGET,
    minWidth: ACCESSIBILITY.MIN_TOUCH_TARGET,
  },
  // Focus indicators for keyboard navigation
  focusedElement: {
    borderWidth: 2,
    borderColor: localColors.focusBlue,
    borderRadius: borderRadius.small,
  },
  // Selected option styles for radio buttons
  optionButtonSelected: {
    backgroundColor: localColors.morningPrimary,
    borderColor: localColors.morningPrimary,
  },
  optionTextSelected: {
    color: localColors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  // Assessment controls for cognitive accessibility
  assessmentControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing[16],
    paddingHorizontal: spacing[24],
  },
  // High contrast mode styles (automatically applied by system)
  highContrastText: {
    color: localColors.black,
    backgroundColor: localColors.white,
    borderWidth: 1,
    borderColor: localColors.gray700,
  },
  // Screen reader specific styles
  screenReaderOnly: {
    position: 'absolute',
    left: -10000,
    width: 1,
    height: 1,
    overflow: 'hidden',
  },
  // Cognitive accessibility indicators
  requiredField: {
    borderLeftWidth: 4,
    borderLeftColor: localColors.warningAmber,
    paddingLeft: spacing[8],
  },
  validationError: {
    borderWidth: 2,
    borderColor: localColors.crisisRed,
    backgroundColor: '#FEF2F2', // Light red background
  },
  validationSuccess: {
    borderWidth: 2,
    borderColor: localColors.successGreen,
    backgroundColor: '#F0FDF4', // Light green background
  },
});

export default OnboardingScreen;