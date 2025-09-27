/**
 * Therapeutic Accessibility Provider - Mental Health WCAG AA+ Implementation
 *
 * THERAPEUTIC ACCESSIBILITY REQUIREMENTS:
 * - Crisis emergency access <3 seconds via voice/screen reader
 * - Anxiety-aware interface adaptations (larger targets, calming interactions)
 * - Depression-friendly design (high contrast, encouraging feedback)
 * - Trauma-informed interactions (predictable, safe, non-startling)
 * - Cognitive accessibility for impaired executive function
 * - Voice control integration for motor accessibility
 *
 * PERFORMANCE REQUIREMENTS:
 * - Voice command recognition <500ms for crisis features
 * - Screen reader announcements <1 second response time
 * - Crisis button accessibility focus <200ms
 * - Haptic therapeutic feedback patterns for breathing guidance
 */

import React, { createContext, useContext, useCallback, useRef, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  UIManager,
  Platform,
  Alert,
  Linking,
  Appearance,
  Vibration,
  DeviceEventEmitter,
} from 'react-native';
import { useCrisisStore } from '../../store/crisisStore';
import { useTheme } from '../../hooks/useTheme';

interface TherapeuticAccessibilityState {
  // Core Accessibility States
  isScreenReaderEnabled: boolean;
  isHighContrastEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isVoiceControlEnabled: boolean;
  preferredFontSize: number;

  // Mental Health Specific States
  anxietyAdaptationsEnabled: boolean;
  depressionSupportMode: boolean;
  crisisEmergencyMode: boolean;
  traumaInformedMode: boolean;
  cognitiveAccessibilityLevel: 'standard' | 'enhanced' | 'maximum';

  // Therapeutic Interaction States
  breathingGuidanceActive: boolean;
  therapySessionActive: boolean;
  assessmentInProgress: boolean;
  crisisInterventionActive: boolean;
}

interface TherapeuticAccessibilityActions {
  // Crisis Emergency Accessibility
  activateEmergencyCrisisAccess: (trigger: string) => Promise<void>;
  announceEmergencyInstructions: (message: string) => Promise<void>;
  enableCrisisVoiceCommands: () => Promise<void>;

  // Mental Health Adaptations
  enableAnxietyAdaptations: (severity: 'mild' | 'moderate' | 'severe') => Promise<void>;
  activateDepressionSupport: (level: 'standard' | 'enhanced') => Promise<void>;
  enableTraumaInformedMode: () => Promise<void>;

  // Therapeutic Guidance
  provideTharapeuticFeedback: (type: 'encouraging' | 'guiding' | 'celebrating') => Promise<void>;
  announceBreathingGuidance: (phase: 'inhale' | 'hold' | 'exhale', duration: number) => Promise<void>;
  provideAssessmentGuidance: (question: number, total: number, content: string) => Promise<void>;

  // Screen Reader Optimization
  announceForTherapy: (message: string, priority?: 'polite' | 'assertive' | 'emergency') => Promise<void>;
  setTherapeuticFocus: (component: React.RefObject<any>, context?: string) => Promise<void>;

  // Voice Control Integration
  enableTherapeuticVoiceCommands: () => Promise<void>;
  processVoiceCommand: (command: string) => Promise<boolean>;

  // Haptic Therapeutic Feedback
  provideBreathingHaptics: (type: 'inhale' | 'exhale' | 'hold') => Promise<void>;
  provideCrisisHaptics: () => Promise<void>;
  provideSuccessHaptics: () => Promise<void>;
}

interface TherapeuticAccessibilityContextType extends TherapeuticAccessibilityState, TherapeuticAccessibilityActions {}

const TherapeuticAccessibilityContext = createContext<TherapeuticAccessibilityContextType | null>(null);

export const useTherapeuticAccessibility = (): TherapeuticAccessibilityContextType => {
  const context = useContext(TherapeuticAccessibilityContext);
  if (!context) {
    throw new Error('useTherapeuticAccessibility must be used within TherapeuticAccessibilityProvider');
  }
  return context;
};

interface TherapeuticAccessibilityProviderProps {
  children: React.ReactNode;
}

export const TherapeuticAccessibilityProvider: React.FC<TherapeuticAccessibilityProviderProps> = ({ children }) => {
  const { colorSystem } = useTheme();
  const crisisStore = useCrisisStore();

  // Therapeutic Accessibility State
  const [accessibilityState, setAccessibilityState] = useState<TherapeuticAccessibilityState>({
    // Core States
    isScreenReaderEnabled: false,
    isHighContrastEnabled: false,
    isReduceMotionEnabled: false,
    isVoiceControlEnabled: false,
    preferredFontSize: 16,

    // Mental Health States
    anxietyAdaptationsEnabled: false,
    depressionSupportMode: false,
    crisisEmergencyMode: false,
    traumaInformedMode: false,
    cognitiveAccessibilityLevel: 'standard',

    // Therapeutic States
    breathingGuidanceActive: false,
    therapySessionActive: false,
    assessmentInProgress: false,
    crisisInterventionActive: false,
  });

  // Performance tracking for accessibility
  const performanceRef = useRef({
    lastAnnouncementTime: 0,
    focusChangeTime: 0,
    crisisActivationTime: 0,
    voiceCommandTime: 0,
    hapticFeedbackTime: 0,
  });

  // Voice command patterns for therapeutic contexts
  const voiceCommands = useRef({
    crisis: ['emergency help', 'crisis support', 'need help', 'call 988'],
    breathing: ['start breathing', 'breathing exercise', 'calm down', 'breathe'],
    assessment: ['next question', 'previous question', 'skip question'],
    navigation: ['go back', 'go home', 'open menu'],
  });

  // Initialize therapeutic accessibility state
  useEffect(() => {
    const initializeTherapeuticAccessibility = async () => {
      try {
        const [
          screenReaderEnabled,
          reduceMotionEnabled,
        ] = await Promise.all([
          AccessibilityInfo.isScreenReaderEnabled(),
          AccessibilityInfo.isReduceMotionEnabled(),
        ]);

        const colorScheme = Appearance.getColorScheme();
        const highContrastEnabled = colorScheme === 'dark';

        setAccessibilityState(prev => ({
          ...prev,
          isScreenReaderEnabled: screenReaderEnabled,
          isHighContrastEnabled: highContrastEnabled,
          isReduceMotionEnabled: reduceMotionEnabled,
          // Enable anxiety adaptations by default for mental health app
          anxietyAdaptationsEnabled: true,
          // Enable trauma-informed mode by default for safety
          traumaInformedMode: true,
        }));

        // Auto-enable voice control for accessibility
        if (screenReaderEnabled) {
          await enableTherapeuticVoiceCommands();
        }

      } catch (error) {
        console.error('Failed to initialize therapeutic accessibility:', error);
      }
    };

    initializeTherapeuticAccessibility();

    // Listen for accessibility changes
    const screenReaderListener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      async (isEnabled) => {
        setAccessibilityState(prev => ({ ...prev, isScreenReaderEnabled: isEnabled }));
        if (isEnabled) {
          await enableTherapeuticVoiceCommands();
        }
      }
    );

    const reduceMotionListener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isEnabled) => {
        setAccessibilityState(prev => ({ ...prev, isReduceMotionEnabled: isEnabled }));
      }
    );

    const colorSchemeListener = Appearance.addChangeListener(({ colorScheme }) => {
      setAccessibilityState(prev => ({
        ...prev,
        isHighContrastEnabled: colorScheme === 'dark',
      }));
    });

    return () => {
      screenReaderListener?.remove();
      reduceMotionListener?.remove();
      colorSchemeListener?.remove();
    };
  }, []);

  // Crisis Emergency Accessibility
  const activateEmergencyCrisisAccess = useCallback(async (trigger: string): Promise<void> => {
    const startTime = Date.now();

    try {
      setAccessibilityState(prev => ({
        ...prev,
        crisisEmergencyMode: true,
        crisisInterventionActive: true,
        anxietyAdaptationsEnabled: true,
        cognitiveAccessibilityLevel: 'maximum',
      }));

      // Immediate crisis haptic feedback
      await provideCrisisHaptics();

      // Priority emergency announcement
      await announceForTherapy(
        'CRISIS MODE ACTIVATED. Emergency support is now prioritized. You can call 988 at any time by saying "emergency help" or tapping the crisis button.',
        'emergency'
      );

      // Enable emergency voice commands
      await enableCrisisVoiceCommands();

      const responseTime = Date.now() - startTime;
      performanceRef.current.crisisActivationTime = Date.now();

      if (responseTime > 200) {
        console.warn(`Crisis accessibility activation exceeded 200ms: ${responseTime}ms`);
      }

    } catch (error) {
      console.error('Crisis accessibility activation failed:', error);

      // Fallback emergency announcement
      await announceForTherapy(
        'Emergency crisis support is available. Call 988 for immediate help.',
        'emergency'
      );
    }
  }, []);

  const announceEmergencyInstructions = useCallback(async (message: string): Promise<void> => {
    try {
      // Format message for crisis situations
      const emergencyMessage = `IMPORTANT SAFETY INFORMATION: ${message}`;

      await announceForTherapy(emergencyMessage, 'emergency');

      // Provide additional haptic feedback for emergency messages
      await provideCrisisHaptics();

    } catch (error) {
      console.error('Emergency instruction announcement failed:', error);
    }
  }, []);

  const enableCrisisVoiceCommands = useCallback(async (): Promise<void> => {
    try {
      setAccessibilityState(prev => ({
        ...prev,
        isVoiceControlEnabled: true,
      }));

      // Register crisis voice command listener
      const voiceListener = DeviceEventEmitter.addListener('VoiceCommand', async (command: string) => {
        const processed = await processVoiceCommand(command);
        if (processed) {
          await announceForTherapy('Voice command recognized', 'polite');
        }
      });

      return () => voiceListener.remove();
    } catch (error) {
      console.error('Failed to enable crisis voice commands:', error);
    }
  }, []);

  // Mental Health Adaptations
  const enableAnxietyAdaptations = useCallback(async (severity: 'mild' | 'moderate' | 'severe'): Promise<void> => {
    setAccessibilityState(prev => ({
      ...prev,
      anxietyAdaptationsEnabled: true,
      cognitiveAccessibilityLevel: severity === 'severe' ? 'maximum' : 'enhanced',
    }));

    await announceForTherapy(
      'Anxiety support adaptations enabled. Interface will use larger buttons, calmer interactions, and reduced cognitive load.',
      'polite'
    );
  }, []);

  const activateDepressionSupport = useCallback(async (level: 'standard' | 'enhanced'): Promise<void> => {
    setAccessibilityState(prev => ({
      ...prev,
      depressionSupportMode: true,
      cognitiveAccessibilityLevel: level === 'enhanced' ? 'maximum' : 'enhanced',
    }));

    await announceForTherapy(
      'Depression support mode enabled. Interface will provide encouraging feedback and clear, simple navigation.',
      'polite'
    );
  }, []);

  const enableTraumaInformedMode = useCallback(async (): Promise<void> => {
    setAccessibilityState(prev => ({
      ...prev,
      traumaInformedMode: true,
    }));

    await announceForTherapy(
      'Trauma-informed mode enabled. Interface will be predictable and safe, with no surprising changes.',
      'polite'
    );
  }, []);

  // Therapeutic Guidance
  const provideTharapeuticFeedback = useCallback(async (type: 'encouraging' | 'guiding' | 'celebrating'): Promise<void> => {
    const messages = {
      encouraging: 'You\'re doing great. Take your time and be gentle with yourself.',
      guiding: 'Here\'s the next step. Remember, this is your journey at your own pace.',
      celebrating: 'Wonderful progress! You should feel proud of taking care of your mental health.',
    };

    await announceForTherapy(messages[type], 'polite');

    if (type === 'celebrating') {
      await provideSuccessHaptics();
    }
  }, []);

  const announceBreathingGuidance = useCallback(async (phase: 'inhale' | 'hold' | 'exhale', duration: number): Promise<void> => {
    const instructions = {
      inhale: `Breathe in slowly for ${duration} seconds`,
      hold: `Hold your breath gently for ${duration} seconds`,
      exhale: `Breathe out slowly for ${duration} seconds`,
    };

    await announceForTherapy(instructions[phase], 'polite');
    await provideBreathingHaptics(phase);
  }, []);

  const provideAssessmentGuidance = useCallback(async (question: number, total: number, content: string): Promise<void> => {
    const guidance = `Assessment question ${question} of ${total}. ${content}. Take your time to consider your answer. There's no pressure to rush.`;
    await announceForTherapy(guidance, 'polite');
  }, []);

  // Screen Reader Optimization for Therapy
  const announceForTherapy = useCallback(async (
    message: string,
    priority: 'polite' | 'assertive' | 'emergency' = 'polite'
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      if (accessibilityState.isScreenReaderEnabled) {
        // Format message for therapeutic context
        let therapeuticMessage = message;

        // Add calming prefixes for anxiety support
        if (accessibilityState.anxietyAdaptationsEnabled && priority !== 'emergency') {
          therapeuticMessage = `Gently: ${message}`;
        }

        // Add encouraging suffixes for depression support
        if (accessibilityState.depressionSupportMode && priority !== 'emergency') {
          therapeuticMessage += ' You\'re taking positive steps for your wellbeing.';
        }

        // Use emergency priority for crisis situations
        const isUrgent = priority === 'emergency' || accessibilityState.crisisEmergencyMode;

        if (isUrgent) {
          AccessibilityInfo.announceForAccessibility(therapeuticMessage);
        } else {
          // Therapeutic pacing to prevent overwhelming users
          const timeSinceLastAnnouncement = startTime - performanceRef.current.lastAnnouncementTime;
          if (timeSinceLastAnnouncement < 2000) { // Longer delay for mental health context
            await new Promise(resolve => setTimeout(resolve, 2000 - timeSinceLastAnnouncement));
          }
          AccessibilityInfo.announceForAccessibility(therapeuticMessage);
        }
      }

      const responseTime = Date.now() - startTime;
      performanceRef.current.lastAnnouncementTime = Date.now();

      if (responseTime > 1000) {
        console.warn(`Therapeutic screen reader announcement exceeded 1s: ${responseTime}ms`);
      }

    } catch (error) {
      console.error('Therapeutic screen reader announcement failed:', error);
    }
  }, [accessibilityState.isScreenReaderEnabled, accessibilityState.anxietyAdaptationsEnabled,
      accessibilityState.depressionSupportMode, accessibilityState.crisisEmergencyMode]);

  const setTherapeuticFocus = useCallback(async (component: React.RefObject<any>, context?: string): Promise<void> => {
    const startTime = Date.now();

    try {
      if (component.current && accessibilityState.isScreenReaderEnabled) {
        const reactTag = findNodeHandle(component.current);
        if (reactTag) {
          if (Platform.OS === 'android') {
            UIManager.sendAccessibilityEvent(reactTag, UIManager.AccessibilityEventTypes.typeViewFocused);
          } else {
            AccessibilityInfo.setAccessibilityFocus(reactTag);
          }

          // Announce focus context for therapeutic guidance
          if (context) {
            await announceForTherapy(`Focus moved to ${context}`, 'polite');
          }
        }
      }

      const responseTime = Date.now() - startTime;
      performanceRef.current.focusChangeTime = Date.now();

      if (responseTime > 200) {
        console.warn(`Therapeutic accessibility focus change exceeded 200ms: ${responseTime}ms`);
      }

    } catch (error) {
      console.error('Failed to set therapeutic accessibility focus:', error);
    }
  }, [accessibilityState.isScreenReaderEnabled]);

  // Voice Control Integration
  const enableTherapeuticVoiceCommands = useCallback(async (): Promise<void> => {
    try {
      setAccessibilityState(prev => ({
        ...prev,
        isVoiceControlEnabled: true,
      }));

      await announceForTherapy(
        'Voice commands enabled. You can say "emergency help" for crisis support, "start breathing" for breathing exercises, or "go back" to navigate.',
        'polite'
      );
    } catch (error) {
      console.error('Failed to enable therapeutic voice commands:', error);
    }
  }, []);

  const processVoiceCommand = useCallback(async (command: string): Promise<boolean> => {
    const startTime = Date.now();
    const lowerCommand = command.toLowerCase();

    try {
      // Crisis commands (highest priority)
      if (voiceCommands.current.crisis.some(cmd => lowerCommand.includes(cmd))) {
        await activateEmergencyCrisisAccess('voice_command');
        try {
          await Linking.openURL('tel:988');
        } catch (error) {
          await announceEmergencyInstructions('Please dial 988 directly for crisis support');
        }
        return true;
      }

      // Breathing commands
      if (voiceCommands.current.breathing.some(cmd => lowerCommand.includes(cmd))) {
        setAccessibilityState(prev => ({ ...prev, breathingGuidanceActive: true }));
        await announceForTherapy('Starting breathing exercise. Find a comfortable position and follow the guidance.', 'polite');
        return true;
      }

      // Assessment commands
      if (accessibilityState.assessmentInProgress) {
        if (lowerCommand.includes('next question')) {
          await announceForTherapy('Moving to next question', 'polite');
          return true;
        }
        if (lowerCommand.includes('previous question')) {
          await announceForTherapy('Going back to previous question', 'polite');
          return true;
        }
      }

      const responseTime = Date.now() - startTime;
      performanceRef.current.voiceCommandTime = Date.now();

      if (responseTime > 500) {
        console.warn(`Voice command processing exceeded 500ms: ${responseTime}ms`);
      }

      return false;
    } catch (error) {
      console.error('Voice command processing failed:', error);
      return false;
    }
  }, [accessibilityState.assessmentInProgress]);

  // Haptic Therapeutic Feedback
  const provideBreathingHaptics = useCallback(async (type: 'inhale' | 'exhale' | 'hold'): Promise<void> => {
    const startTime = Date.now();

    try {
      if (Platform.OS === 'ios') {
        // iOS haptic patterns for breathing
        const patterns = {
          inhale: [0, 100, 50, 100, 50, 100], // Gentle rising pattern
          hold: [0, 200], // Single gentle pulse
          exhale: [0, 150, 100, 100, 100, 50], // Gentle falling pattern
        };
        Vibration.vibrate(patterns[type]);
      } else {
        // Android simplified patterns
        const durations = {
          inhale: 300,
          hold: 200,
          exhale: 400,
        };
        Vibration.vibrate(durations[type]);
      }

      const responseTime = Date.now() - startTime;
      performanceRef.current.hapticFeedbackTime = Date.now();

      if (responseTime > 100) {
        console.warn(`Haptic feedback exceeded 100ms: ${responseTime}ms`);
      }
    } catch (error) {
      console.error('Breathing haptic feedback failed:', error);
    }
  }, []);

  const provideCrisisHaptics = useCallback(async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios') {
        // Strong, attention-getting pattern for crisis
        Vibration.vibrate([0, 300, 100, 300, 100, 300]);
      } else {
        // Android strong vibration for crisis
        Vibration.vibrate(600);
      }
    } catch (error) {
      console.error('Crisis haptic feedback failed:', error);
    }
  }, []);

  const provideSuccessHaptics = useCallback(async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios') {
        // Celebratory pattern
        Vibration.vibrate([0, 50, 50, 100, 50, 150]);
      } else {
        // Android success pattern
        Vibration.vibrate(200);
      }
    } catch (error) {
      console.error('Success haptic feedback failed:', error);
    }
  }, []);

  const contextValue: TherapeuticAccessibilityContextType = {
    // State
    ...accessibilityState,

    // Actions
    activateEmergencyCrisisAccess,
    announceEmergencyInstructions,
    enableCrisisVoiceCommands,
    enableAnxietyAdaptations,
    activateDepressionSupport,
    enableTraumaInformedMode,
    provideTharapeuticFeedback,
    announceBreathingGuidance,
    provideAssessmentGuidance,
    announceForTherapy,
    setTherapeuticFocus,
    enableTherapeuticVoiceCommands,
    processVoiceCommand,
    provideBreathingHaptics,
    provideCrisisHaptics,
    provideSuccessHaptics,
  };

  return (
    <TherapeuticAccessibilityContext.Provider value={contextValue}>
      {children}
    </TherapeuticAccessibilityContext.Provider>
  );
};

export default TherapeuticAccessibilityProvider;