/**
 * Advanced Screen Reader Support - Enhanced ARIA and Announcements
 * 
 * ACCESSIBILITY SPECIFICATIONS:
 * - Live regions for dynamic content updates
 * - Complex ARIA landmarks and navigation
 * - Context-aware announcements for therapeutic content
 * - Crisis intervention screen reader optimizations
 * - Assessment progress announcements with therapeutic language
 * - Multi-modal feedback integration
 */


import { logSecurity, logPerformance, logError, LogCategory } from '../../../services/logging';
import React, { useCallback, useEffect, useRef, useState, createContext, useContext } from 'react';
import {
  View,
  AccessibilityInfo,
  Platform,
  AppState,
  Vibration,
} from 'react-native';

// Enhanced announcement types for therapeutic context
export type AnnouncementType = 
  | 'navigation' 
  | 'progress' 
  | 'completion' 
  | 'crisis' 
  | 'therapeutic' 
  | 'assessment' 
  | 'error' 
  | 'success' 
  | 'gentle'
  | 'urgent'
  | 'supportive';

export type AnnouncementPriority = 'low' | 'medium' | 'high' | 'critical';

export interface AnnouncementConfig {
  type: AnnouncementType;
  priority: AnnouncementPriority;
  delay?: number;
  repeat?: boolean;
  gentleMode?: boolean;
  hapticFeedback?: boolean;
  context?: string;
}

export interface AdvancedAnnouncementOptions extends AnnouncementConfig {
  message: string;
  fallbackMessage?: string;
  progressInfo?: {
    current: number;
    total: number;
    stepName?: string;
  };
  therapeuticContext?: {
    mood?: string;
    timeOfDay?: 'morning' | 'midday' | 'evening';
    isBreathingExercise?: boolean;
    isCrisisIntervention?: boolean;
  };
}

// Context for advanced screen reader management
interface AdvancedScreenReaderContextValue {
  announce: (options: AdvancedAnnouncementOptions) => void;
  announceProgress: (current: number, total: number, context?: string) => void;
  announceCrisis: (message: string, urgency?: 'immediate' | 'gentle') => void;
  announceTherapeutic: (message: string, mood?: string) => void;
  setGentleMode: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  isGentleMode: boolean;
  isReducedMotion: boolean;
  currentRegion: string | null;
  setCurrentRegion: (region: string | null) => void;
}

const AdvancedScreenReaderContext = createContext<AdvancedScreenReaderContextValue | undefined>(undefined);

export const useAdvancedScreenReader = () => {
  const context = useContext(AdvancedScreenReaderContext);
  if (!context) {
    throw new Error('useAdvancedScreenReader must be used within AdvancedScreenReaderProvider');
  }
  return context;
};

// Provider component
interface AdvancedScreenReaderProviderProps {
  children: React.ReactNode;
  therapeuticMode?: boolean;
  crisisMode?: boolean;
}

export const AdvancedScreenReaderProvider: React.FC<AdvancedScreenReaderProviderProps> = ({
  children,
  therapeuticMode = true,
  crisisMode = false,
}) => {
  const [isGentleMode, setIsGentleModeState] = useState(therapeuticMode);
  const [isReducedMotion, setIsReducedMotionState] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<string | null>(null);
  const [announcementQueue, setAnnouncementQueue] = useState<AdvancedAnnouncementOptions[]>([]);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  
  const processingRef = useRef(false);
  const lastAnnouncementRef = useRef<string>('');
  const therapeuticContextRef = useRef<any>({});

  // Check screen reader status
  useEffect(() => {
    const checkScreenReader = async () => {
      try {
        const enabled = await AccessibilityInfo.isScreenReaderEnabled();
        setIsScreenReaderEnabled(enabled);
      } catch (error) {
        logSecurity('Could not check screen reader status:', error);
      }
    };

    checkScreenReader();
    
    const listener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled: boolean) => {
        setIsScreenReaderEnabled(enabled);
        if (enabled && therapeuticMode) {
          // Welcome announcement for therapeutic apps
          setTimeout(() => {
            announce({
              message: 'Welcome to your mindfulness companion. Screen reader optimizations are active.',
              type: 'therapeutic',
              priority: 'medium',
              gentleMode: true,
            });
          }, 1000);
        }
      }
    );

    return () => listener?.remove();
  }, [therapeuticMode]);

  // Check for reduced motion preference
  useEffect(() => {
    const checkReducedMotion = async () => {
      try {
        const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
        setIsReducedMotionState(reduceMotion || false);
      } catch (error) {
        logSecurity('Could not check reduced motion preference:', error);
      }
    };

    checkReducedMotion();

    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (reduceMotion: boolean) => {
        setIsReducedMotionState(reduceMotion);
      }
    );

    return () => listener?.remove();
  }, []);

  // Process announcement queue
  useEffect(() => {
    if (announcementQueue.length === 0 || processingRef.current) return;

    const processQueue = async () => {
      processingRef.current = true;
      
      while (announcementQueue.length > 0) {
        const announcement = announcementQueue[0];
        await processAnnouncement(announcement);
        setAnnouncementQueue(prev => prev.slice(1));
        
        // Delay between announcements to prevent overwhelming
        if (announcementQueue.length > 1) {
          await new Promise(resolve => setTimeout(resolve, announcement.delay || 500));
        }
      }
      
      processingRef.current = false;
    };

    processQueue();
  }, [announcementQueue]);

  // Process individual announcement with therapeutic considerations
  const processAnnouncement = async (options: AdvancedAnnouncementOptions) => {
    const {
      message,
      fallbackMessage,
      type,
      priority,
      gentleMode,
      hapticFeedback,
      therapeuticContext,
      progressInfo,
    } = options;

    // Skip if same message was just announced (prevent spam)
    if (lastAnnouncementRef.current === message && priority !== 'critical') {
      return;
    }

    // Build contextual message
    let enhancedMessage = message;
    
    // Add therapeutic context
    if (therapeuticContext) {
      const { mood, timeOfDay, isBreathingExercise, isCrisisIntervention } = therapeuticContext;
      
      if (isCrisisIntervention) {
        enhancedMessage = `Crisis support. ${enhancedMessage}`;
      } else if (isBreathingExercise) {
        enhancedMessage = `Breathing exercise. ${enhancedMessage}`;
      } else if (mood) {
        enhancedMessage = `${enhancedMessage} Current mood context: ${mood}.`;
      }
      
      if (timeOfDay && isGentleMode) {
        const greetings = {
          morning: 'Good morning. ',
          midday: 'Good afternoon. ',
          evening: 'Good evening. ',
        };
        enhancedMessage = greetings[timeOfDay] + enhancedMessage;
      }
    }

    // Add progress information
    if (progressInfo) {
      const { current, total, stepName } = progressInfo;
      const progressText = stepName 
        ? `Step ${current} of ${total}: ${stepName}. ${enhancedMessage}`
        : `Progress: ${current} of ${total} complete. ${enhancedMessage}`;
      enhancedMessage = progressText;
    }

    // Apply gentle mode modifications
    if ((gentleMode || isGentleMode) && type !== 'crisis') {
      enhancedMessage = enhancedMessage
        .replace(/!/g, '.') // Replace exclamation marks
        .replace(/\b(ERROR|FAILED|WRONG)\b/gi, 'needs attention') // Soften harsh words
        .replace(/\b(URGENT|CRITICAL)\b/gi, 'important'); // Soften urgency
    }

    // Haptic feedback for important announcements
    if (hapticFeedback && (priority === 'high' || priority === 'critical')) {
      if (Platform.OS === 'ios') {
        // Use appropriate haptic patterns
        if (type === 'crisis') {
          Vibration.vibrate([0, 200, 100, 200]); // Alert pattern
        } else if (type === 'success') {
          Vibration.vibrate([0, 100]); // Success pattern
        } else if (type === 'error') {
          Vibration.vibrate([0, 300, 100, 300, 100, 300]); // Error pattern
        }
      } else {
        // Android vibration
        Vibration.vibrate(type === 'crisis' ? 500 : 200);
      }
    }

    // Announce to screen reader
    try {
      await AccessibilityInfo.announceForAccessibility(enhancedMessage);
      lastAnnouncementRef.current = message;
      
      // Store therapeutic context for continuity
      if (therapeuticContext) {
        therapeuticContextRef.current = { ...therapeuticContext };
      }
    } catch (error) {
      logSecurity('Failed to announce message:', error);
      
      // Try fallback message if provided
      if (fallbackMessage) {
        try {
          await AccessibilityInfo.announceForAccessibility(fallbackMessage);
        } catch (fallbackError) {
          logSecurity('Failed to announce fallback message:', fallbackError);
        }
      }
    }
  };

  // Main announce function
  const announce = useCallback((options: AdvancedAnnouncementOptions) => {
    if (!isScreenReaderEnabled) return;

    // Crisis announcements get immediate priority
    if (options.priority === 'critical' || options.type === 'crisis') {
      setAnnouncementQueue(prev => [options, ...prev]);
    } else {
      setAnnouncementQueue(prev => [...prev, options]);
    }
  }, [isScreenReaderEnabled]);

  // Specialized announcement functions
  const announceProgress = useCallback((current: number, total: number, context?: string) => {
    const percentage = Math.round((current / total) * 100);
    announce({
      message: context || `${percentage}% complete`,
      type: 'progress',
      priority: 'low',
      progressInfo: { current, total },
      gentleMode: true,
    });
  }, [announce]);

  const announceCrisis = useCallback((message: string, urgency: 'immediate' | 'gentle' = 'immediate') => {
    announce({
      message,
      type: 'crisis',
      priority: 'critical',
      delay: urgency === 'immediate' ? 0 : 500,
      hapticFeedback: true,
      therapeuticContext: {
        isCrisisIntervention: true,
      },
    });
  }, [announce]);

  const announceTherapeutic = useCallback((message: string, mood?: string) => {
    const currentHour = new Date().getHours();
    const timeOfDay = currentHour < 12 ? 'morning' : currentHour < 17 ? 'midday' : 'evening';

    announce({
      message,
      type: 'therapeutic',
      priority: 'medium',
      gentleMode: true,
      therapeuticContext: {
        ...(mood !== undefined && { mood }),
        timeOfDay,
      },
    });
  }, [announce]);

  const setGentleMode = useCallback((enabled: boolean) => {
    setIsGentleModeState(enabled);
    if (enabled) {
      announce({
        message: 'Gentle mode enabled. Announcements will use calmer language.',
        type: 'supportive',
        priority: 'low',
        gentleMode: true,
      });
    }
  }, [announce]);

  const setReducedMotion = useCallback((enabled: boolean) => {
    setIsReducedMotionState(enabled);
  }, []);

  const contextValue: AdvancedScreenReaderContextValue = {
    announce,
    announceProgress,
    announceCrisis,
    announceTherapeutic,
    setGentleMode,
    setReducedMotion,
    isGentleMode,
    isReducedMotion,
    currentRegion,
    setCurrentRegion,
  };

  return (
    <AdvancedScreenReaderContext.Provider value={contextValue}>
      {children}
    </AdvancedScreenReaderContext.Provider>
  );
};

// Live region component for dynamic content
interface LiveRegionProps {
  children: React.ReactNode;
  politeness?: 'off' | 'polite' | 'assertive';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  label?: string;
  style?: any;
  testID?: string;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  children,
  politeness = 'polite',
  atomic = false,
  relevant = 'all',
  label,
  style,
  testID,
}) => {
  const { setCurrentRegion } = useAdvancedScreenReader();

  useEffect(() => {
    if (label) {
      setCurrentRegion(label);
      return () => setCurrentRegion(null);
    }
  }, [label, setCurrentRegion]);

  return (
    <View
      style={style}
      accessibilityLiveRegion={politeness}
      accessibilityLabel={label}
      testID={testID}
      // Additional ARIA-like properties for React Native
      accessible={true}
      importantForAccessibility="yes"
    >
      {children}
    </View>
  );
};

// Therapeutic announcement hook for components
export const useTherapeuticAnnouncements = () => {
  const { announceTherapeutic, isGentleMode } = useAdvancedScreenReader();

  const announceBreathingStep = useCallback((step: string, isInhale: boolean) => {
    const message = isGentleMode 
      ? `Gently ${isInhale ? 'breathe in' : 'breathe out'}. ${step}`
      : `${isInhale ? 'Inhale' : 'Exhale'}. ${step}`;
    
    announceTherapeutic(message);
  }, [announceTherapeutic, isGentleMode]);

  const announceMoodEntry = useCallback((mood: string, context?: string) => {
    const message = context 
      ? `Mood recorded: ${mood}. ${context}`
      : `Thank you for sharing. Your mood has been recorded as ${mood}.`;
    
    announceTherapeutic(message, mood);
  }, [announceTherapeutic]);

  const announceAssessmentCompletion = useCallback((score: number, type: 'PHQ9' | 'GAD7') => {
    const assessmentName = type === 'PHQ9' ? 'depression screening' : 'anxiety screening';
    const message = isGentleMode
      ? `Your ${assessmentName} is complete. Thank you for taking time for your wellbeing.`
      : `${assessmentName} completed with score ${score}.`;
    
    announceTherapeutic(message);
  }, [announceTherapeutic, isGentleMode]);

  return {
    announceBreathingStep,
    announceMoodEntry,
    announceAssessmentCompletion,
  };
};

export default AdvancedScreenReaderProvider;