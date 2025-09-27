/**
 * Mental Health Accessibility Hook - Context-aware accessibility for therapeutic apps
 * 
 * Provides specialized accessibility features for mental health applications:
 * - Crisis-aware navigation and timing
 * - Cognitive load management for anxiety/depression
 * - Therapeutic flow preservation during accessibility interactions
 * - Emergency access prioritization
 * 
 * WCAG 2.1 AA Compliance Focus:
 * - 2.2.1 Timing Adjustable: User control over therapeutic timing
 * - 3.3.2 Labels/Instructions: Clear guidance for vulnerable users
 * - 3.3.3 Error Suggestion: Accessible recovery with plain language
 * - 4.1.3 Status Messages: Crisis and progress announcements
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { useCrisisIntervention } from './useCrisisIntervention';
import { crisisIntegrationCoordinator } from '../services/coordination/CrisisIntegrationCoordinator';

export interface MentalHealthAccessibilityConfig {
  // Crisis Context Awareness
  crisisMode: boolean;
  crisisLevel: 'low' | 'medium' | 'high' | 'critical';
  emergencyAccessRequired: boolean;
  
  // Cognitive Accessibility
  cognitiveLoadLevel: 'minimal' | 'reduced' | 'standard' | 'enhanced';
  simplifiedLanguage: boolean;
  extendedTimingRequired: boolean;
  reducedAnimations: boolean;
  
  // Therapeutic Context
  therapeuticPhase: 'initial' | 'building' | 'maintenance' | 'intensive';
  currentFlow: 'morning' | 'midday' | 'evening' | 'assessment' | 'crisis';
  userStressLevel: 'low' | 'medium' | 'high';
  
  // Accessibility Preferences
  screenReaderActive: boolean;
  voiceOverEnabled: boolean;
  talkBackEnabled: boolean;
  highContrastMode: boolean;
  largeTextMode: boolean;
}

export interface AccessibilityAnnouncement {
  message: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  interruption: boolean;
  context: 'progress' | 'error' | 'crisis' | 'completion' | 'navigation';
  delay?: number; // milliseconds
}

export interface TimingControlState {
  userCanAdjustTiming: boolean;
  currentExtension: number; // seconds
  maxExtensionAllowed: number; // seconds
  timingPaused: boolean;
  pauseReason: 'user_request' | 'crisis_intervention' | 'accessibility_need' | 'system_recovery';
}

export interface CognitiveSupport {
  simplifiedInstructions: boolean;
  stepByStepGuidance: boolean;
  progressIndicators: boolean;
  safetyReminders: boolean;
  plainLanguageMode: boolean;
  reducedChoiceComplexity: boolean;
}

export interface MentalHealthA11yState {
  config: MentalHealthAccessibilityConfig;
  timing: TimingControlState;
  cognitive: CognitiveSupport;
  announcements: AccessibilityAnnouncement[];
  isInitialized: boolean;
}

export interface EmergencyAccessibilityOverride {
  activated: boolean;
  timestamp: string;
  reason: string;
  overrides: {
    skipComplexNavigations: boolean;
    directCrisisAccess: boolean;
    simplifiedInterface: boolean;
    extendedTimeouts: boolean;
  };
  restoreCallback: () => void;
}

/**
 * Mental Health Accessibility Hook
 */
export function useMentalHealthAccessibility() {
  const [state, setState] = useState<MentalHealthA11yState>({
    config: {
      crisisMode: false,
      crisisLevel: 'low',
      emergencyAccessRequired: false,
      cognitiveLoadLevel: 'standard',
      simplifiedLanguage: false,
      extendedTimingRequired: false,
      reducedAnimations: false,
      therapeuticPhase: 'maintenance',
      currentFlow: 'morning',
      userStressLevel: 'low',
      screenReaderActive: false,
      voiceOverEnabled: false,
      talkBackEnabled: false,
      highContrastMode: false,
      largeTextMode: false
    },
    timing: {
      userCanAdjustTiming: true,
      currentExtension: 0,
      maxExtensionAllowed: 300, // 5 minutes
      timingPaused: false,
      pauseReason: 'user_request'
    },
    cognitive: {
      simplifiedInstructions: false,
      stepByStepGuidance: true,
      progressIndicators: true,
      safetyReminders: true,
      plainLanguageMode: false,
      reducedChoiceComplexity: false
    },
    announcements: [],
    isInitialized: false
  });

  const { crisisState, isCrisisActive } = useCrisisIntervention();
  const [emergencyOverride, setEmergencyOverride] = useState<EmergencyAccessibilityOverride | null>(null);
  const announcementQueue = useRef<AccessibilityAnnouncement[]>([]);
  const timingExtensionRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize accessibility state
  useEffect(() => {
    initializeAccessibility();
  }, []);

  // Monitor crisis state changes
  useEffect(() => {
    updateCrisisContext(isCrisisActive, crisisState);
  }, [isCrisisActive, crisisState]);

  // Monitor screen reader state
  useEffect(() => {
    let isSubscribed = true;

    const checkScreenReader = async () => {
      try {
        const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
        const reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();

        if (isSubscribed) {
          setState(prev => ({
            ...prev,
            config: {
              ...prev.config,
              screenReaderActive: screenReaderEnabled,
              voiceOverEnabled: Platform.OS === 'ios' && screenReaderEnabled,
              talkBackEnabled: Platform.OS === 'android' && screenReaderEnabled,
              reducedAnimations: reduceMotionEnabled
            }
          }));
        }
      } catch (error) {
        console.error('Failed to check accessibility settings:', error);
      }
    };

    checkScreenReader();

    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      checkScreenReader
    );

    return () => {
      isSubscribed = false;
      subscription?.remove();
    };
  }, []);

  const initializeAccessibility = useCallback(async () => {
    try {
      // Get initial accessibility state
      const [screenReader, reduceMotion] = await Promise.all([
        AccessibilityInfo.isScreenReaderEnabled(),
        AccessibilityInfo.isReduceMotionEnabled()
      ]);

      // Initialize cognitive support based on therapeutic context
      const cognitiveSupport = determineCognitiveSupport('initial', 'low');

      setState(prev => ({
        ...prev,
        config: {
          ...prev.config,
          screenReaderActive: screenReader,
          voiceOverEnabled: Platform.OS === 'ios' && screenReader,
          talkBackEnabled: Platform.OS === 'android' && screenReader,
          reducedAnimations: reduceMotion,
          cognitiveLoadLevel: screenReader ? 'reduced' : 'standard',
          simplifiedLanguage: screenReader
        },
        cognitive: cognitiveSupport,
        isInitialized: true
      }));

      console.log('Mental health accessibility initialized');
    } catch (error) {
      console.error('Accessibility initialization failed:', error);
      // Initialize in safe mode
      setState(prev => ({
        ...prev,
        cognitive: {
          simplifiedInstructions: true,
          stepByStepGuidance: true,
          progressIndicators: true,
          safetyReminders: true,
          plainLanguageMode: true,
          reducedChoiceComplexity: true
        },
        isInitialized: true
      }));
    }
  }, []);

  const updateCrisisContext = useCallback((
    isActive: boolean,
    crisis: any
  ) => {
    if (isActive && !emergencyOverride) {
      // Activate emergency accessibility mode
      const override: EmergencyAccessibilityOverride = {
        activated: true,
        timestamp: new Date().toISOString(),
        reason: 'Crisis intervention activated',
        overrides: {
          skipComplexNavigations: true,
          directCrisisAccess: true,
          simplifiedInterface: true,
          extendedTimeouts: true
        },
        restoreCallback: () => setEmergencyOverride(null)
      };

      setEmergencyOverride(override);
      
      // Immediate accessibility adjustments for crisis
      setState(prev => ({
        ...prev,
        config: {
          ...prev.config,
          crisisMode: true,
          crisisLevel: 'critical',
          emergencyAccessRequired: true,
          cognitiveLoadLevel: 'minimal',
          simplifiedLanguage: true,
          extendedTimingRequired: true
        },
        timing: {
          ...prev.timing,
          userCanAdjustTiming: true,
          maxExtensionAllowed: 600, // 10 minutes during crisis
          timingPaused: false
        },
        cognitive: {
          simplifiedInstructions: true,
          stepByStepGuidance: true,
          progressIndicators: true,
          safetyReminders: true,
          plainLanguageMode: true,
          reducedChoiceComplexity: true
        }
      }));

      // Announce crisis mode activation
      announceToUser({
        message: 'Emergency support mode activated. Take your time, you are safe.',
        priority: 'emergency',
        interruption: true,
        context: 'crisis'
      });
    } else if (!isActive && emergencyOverride) {
      // Restore normal accessibility mode
      setEmergencyOverride(null);
      
      setState(prev => ({
        ...prev,
        config: {
          ...prev.config,
          crisisMode: false,
          crisisLevel: 'low',
          emergencyAccessRequired: false,
          cognitiveLoadLevel: prev.config.screenReaderActive ? 'reduced' : 'standard',
          simplifiedLanguage: prev.config.screenReaderActive,
          extendedTimingRequired: false
        },
        timing: {
          ...prev.timing,
          maxExtensionAllowed: 300, // Return to 5 minutes
          timingPaused: false,
          currentExtension: 0
        }
      }));
    }
  }, [emergencyOverride]);

  /**
   * WCAG 2.2.1 - Allow users to extend time limits
   */
  const requestTimingExtension = useCallback((
    additionalSeconds: number,
    reason: string = 'user_request'
  ): boolean => {
    const currentState = state.timing;
    const newTotal = currentState.currentExtension + additionalSeconds;

    if (newTotal <= currentState.maxExtensionAllowed) {
      setState(prev => ({
        ...prev,
        timing: {
          ...prev.timing,
          currentExtension: newTotal
        }
      }));

      // Clear existing timeout
      if (timingExtensionRef.current) {
        clearTimeout(timingExtensionRef.current);
      }

      // Set new timeout
      timingExtensionRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          timing: {
            ...prev.timing,
            currentExtension: 0
          }
        }));
      }, additionalSeconds * 1000);

      announceToUser({
        message: `Time extended by ${Math.floor(additionalSeconds / 60)} minutes. Take your time.`,
        priority: 'medium',
        interruption: false,
        context: 'progress'
      });

      return true;
    }

    return false;
  }, [state.timing]);

  /**
   * WCAG 2.2.1 - Pause timing for accessibility needs
   */
  const pauseTiming = useCallback((
    reason: TimingControlState['pauseReason'] = 'user_request'
  ) => {
    setState(prev => ({
      ...prev,
      timing: {
        ...prev.timing,
        timingPaused: true,
        pauseReason: reason
      }
    }));

    if (timingExtensionRef.current) {
      clearTimeout(timingExtensionRef.current);
      timingExtensionRef.current = null;
    }

    const reasonMessages = {
      'user_request': 'Timing paused. Resume when ready.',
      'crisis_intervention': 'Timing paused for your safety. Take all the time you need.',
      'accessibility_need': 'Timing paused for accessibility support.',
      'system_recovery': 'Timing paused while system recovers.'
    };

    announceToUser({
      message: reasonMessages[reason],
      priority: reason === 'crisis_intervention' ? 'emergency' : 'medium',
      interruption: false,
      context: reason === 'crisis_intervention' ? 'crisis' : 'progress'
    });
  }, []);

  /**
   * Resume paused timing
   */
  const resumeTiming = useCallback(() => {
    setState(prev => ({
      ...prev,
      timing: {
        ...prev.timing,
        timingPaused: false
      }
    }));

    announceToUser({
      message: 'Timing resumed.',
      priority: 'low',
      interruption: false,
      context: 'progress'
    });
  }, []);

  /**
   * WCAG 4.1.3 - Announce status messages to assistive technology
   */
  const announceToUser = useCallback((announcement: AccessibilityAnnouncement) => {
    // Add to announcement queue
    announcementQueue.current.push(announcement);
    
    setState(prev => ({
      ...prev,
      announcements: [...prev.announcements, announcement]
    }));

    // Process announcement based on priority and context
    const processAnnouncement = () => {
      const liveRegion = announcement.interruption ? 'assertive' : 'polite';
      const prefix = announcement.context === 'crisis' ? 'URGENT: ' :
                    announcement.context === 'error' ? 'Error: ' :
                    announcement.priority === 'emergency' ? 'Important: ' : '';

      const message = `${prefix}${announcement.message}`;
      
      AccessibilityInfo.announceForAccessibility(message);
    };

    if (announcement.delay) {
      setTimeout(processAnnouncement, announcement.delay);
    } else {
      processAnnouncement();
    }

    // Clean up old announcements
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        announcements: prev.announcements.filter(a => a !== announcement)
      }));
    }, 10000); // Remove after 10 seconds
  }, []);

  /**
   * Update therapeutic context for accessibility adjustments
   */
  const updateTherapeuticContext = useCallback((
    phase: MentalHealthAccessibilityConfig['therapeuticPhase'],
    flow: MentalHealthAccessibilityConfig['currentFlow'],
    stressLevel: MentalHealthAccessibilityConfig['userStressLevel'] = 'low'
  ) => {
    const cognitiveSupport = determineCognitiveSupport(phase, stressLevel);
    
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        therapeuticPhase: phase,
        currentFlow: flow,
        userStressLevel: stressLevel,
        cognitiveLoadLevel: stressLevel === 'high' ? 'minimal' :
                           stressLevel === 'medium' ? 'reduced' : 
                           prev.config.cognitiveLoadLevel
      },
      cognitive: cognitiveSupport
    }));
  }, []);

  /**
   * Generate cognitive accessibility instructions
   */
  const generateAccessibleInstructions = useCallback((
    originalText: string,
    context: 'navigation' | 'form' | 'action' | 'error' | 'crisis'
  ): string => {
    if (!state.cognitive.simplifiedInstructions && !state.config.simplifiedLanguage) {
      return originalText;
    }

    // Apply plain language transformations
    let simplified = originalText
      .replace(/utilize/g, 'use')
      .replace(/commence/g, 'start')
      .replace(/terminate/g, 'end')
      .replace(/facilitate/g, 'help')
      .replace(/subsequently/g, 'then')
      .replace(/alternatively/g, 'or')
      .replace(/approximately/g, 'about');

    // Context-specific simplification
    if (context === 'crisis') {
      simplified = `HELP AVAILABLE: ${simplified}`;
    } else if (context === 'error') {
      simplified = `What happened: ${simplified}`;
    }

    // Add step indicators for complex instructions
    if (state.cognitive.stepByStepGuidance && simplified.includes('.')) {
      const steps = simplified.split('.').filter(s => s.trim());
      if (steps.length > 1) {
        simplified = steps
          .map((step, index) => `Step ${index + 1}: ${step.trim()}`)
          .join('. ') + '.';
      }
    }

    return simplified;
  }, [state.cognitive, state.config]);

  /**
   * Handle migration progress announcements
   */
  const announceMigrationProgress = useCallback((progress: {
    stage: string;
    progress: number;
    estimatedTimeRemaining: number;
  }) => {
    const stageMessages = {
      'preparing': 'Getting ready to upgrade your data',
      'data_migration': `Moving your data safely - ${progress.progress}% complete`,
      'validation': 'Checking everything is working correctly',
      'complete': 'Data upgrade complete successfully',
      'error': 'Something went wrong, but your data is safe'
    };

    const message = stageMessages[progress.stage as keyof typeof stageMessages] || 
                   `Progress update: ${progress.stage}`;

    announceToUser({
      message,
      priority: progress.stage === 'error' ? 'high' : 'medium',
      interruption: false,
      context: 'progress'
    });
  }, [announceToUser]);

  /**
   * Handle error recovery with accessibility support
   */
  const announceErrorRecovery = useCallback((error: {
    message: string;
    recoveryOptions: string[];
    canRetry: boolean;
  }) => {
    const simplifiedError = generateAccessibleInstructions(
      error.message,
      'error'
    );

    announceToUser({
      message: simplifiedError,
      priority: 'high',
      interruption: true,
      context: 'error'
    });

    // Announce recovery options
    if (error.recoveryOptions.length > 0) {
      setTimeout(() => {
        const options = error.recoveryOptions.join(', or ');
        announceToUser({
          message: `You can: ${options}`,
          priority: 'medium',
          interruption: false,
          context: 'navigation'
        });
      }, 1500);
    }
  }, [announceToUser, generateAccessibleInstructions]);

  // Helper function to determine cognitive support needs
  const determineCognitiveSupport = (
    phase: MentalHealthAccessibilityConfig['therapeuticPhase'],
    stressLevel: MentalHealthAccessibilityConfig['userStressLevel']
  ): CognitiveSupport => {
    const needsHighSupport = phase === 'initial' || stressLevel === 'high';
    const needsMediumSupport = phase === 'building' || stressLevel === 'medium';

    return {
      simplifiedInstructions: needsHighSupport || state.config.screenReaderActive,
      stepByStepGuidance: needsHighSupport || needsMediumSupport,
      progressIndicators: true,
      safetyReminders: needsHighSupport,
      plainLanguageMode: needsHighSupport || state.config.screenReaderActive,
      reducedChoiceComplexity: needsHighSupport
    };
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timingExtensionRef.current) {
        clearTimeout(timingExtensionRef.current);
      }
    };
  }, []);

  return {
    // State
    accessibility: state,
    emergencyOverride,
    isInitialized: state.isInitialized,

    // Timing Control (WCAG 2.2.1)
    requestTimingExtension,
    pauseTiming,
    resumeTiming,
    canExtendTiming: state.timing.userCanAdjustTiming,
    currentExtension: state.timing.currentExtension,
    maxExtension: state.timing.maxExtensionAllowed,
    isTimingPaused: state.timing.timingPaused,

    // Announcements (WCAG 4.1.3)
    announceToUser,
    announceMigrationProgress,
    announceErrorRecovery,

    // Content Generation
    generateAccessibleInstructions,
    
    // Context Updates
    updateTherapeuticContext,

    // Crisis Integration
    crisisMode: state.config.crisisMode,
    emergencyAccessRequired: state.config.emergencyAccessRequired,
    
    // Cognitive Support
    cognitiveSupport: state.cognitive,
    simplifiedLanguage: state.config.simplifiedLanguage,
    reducedAnimations: state.config.reducedAnimations,

    // Screen Reader Support
    screenReaderActive: state.config.screenReaderActive,
    voiceOverEnabled: state.config.voiceOverEnabled,
    talkBackEnabled: state.config.talkBackEnabled
  };
}

export default useMentalHealthAccessibility;