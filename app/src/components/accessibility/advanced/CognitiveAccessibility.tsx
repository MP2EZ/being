/**
 * Cognitive Accessibility Enhancements
 * 
 * ACCESSIBILITY SPECIFICATIONS:
 * - Simplified language and clear instructions
 * - Consistent navigation patterns and predictable interactions
 * - Memory aids and progress indicators
 * - Attention management and focus guidance
 * - Error prevention and recovery assistance
 * - Cognitive load reduction strategies
 * - ADHD and autism-friendly design patterns
 */

import React, { useCallback, useEffect, useState, createContext, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { colorSystem, spacing, typography } from '../../../constants/colors';
import { useAdvancedScreenReader } from './AdvancedScreenReader';

// Cognitive accessibility configuration
export interface CognitiveConfig {
  simplifyLanguage: boolean;
  showProgressIndicators: boolean;
  enableMemoryAids: boolean;
  reduceAnimations: boolean;
  provideClearInstructions: boolean;
  enableFocusGuides: boolean;
  autoSaveProgress: boolean;
  showTimeEstimates: boolean;
  enableBreakReminders: boolean;
  useSimpleNavigation: boolean;
}

export interface CognitiveAccessibilityContextValue {
  config: CognitiveConfig;
  updateConfig: (updates: Partial<CognitiveConfig>) => void;
  isSimplifiedMode: boolean;
  setSimplifiedMode: (enabled: boolean) => void;
  announceInstruction: (instruction: string, type?: 'action' | 'guidance' | 'reminder') => void;
  showMemoryAid: (content: string, duration?: number) => void;
  startFocusGuidance: (steps: string[]) => void;
  requestBreak: () => void;
  cognitiveLoad: 'low' | 'medium' | 'high';
  setCognitiveLoad: (load: 'low' | 'medium' | 'high') => void;
}

const CognitiveAccessibilityContext = createContext<CognitiveAccessibilityContextValue | undefined>(undefined);

export const useCognitiveAccessibility = () => {
  const context = useContext(CognitiveAccessibilityContext);
  if (!context) {
    throw new Error('useCognitiveAccessibility must be used within CognitiveAccessibilityProvider');
  }
  return context;
};

// Default cognitive accessibility configuration
const DEFAULT_CONFIG: CognitiveConfig = {
  simplifyLanguage: false,
  showProgressIndicators: true,
  enableMemoryAids: true,
  reduceAnimations: false,
  provideClearInstructions: true,
  enableFocusGuides: true,
  autoSaveProgress: true,
  showTimeEstimates: true,
  enableBreakReminders: false,
  useSimpleNavigation: false,
};

// Provider component
interface CognitiveAccessibilityProviderProps {
  children: React.ReactNode;
  initialConfig?: Partial<CognitiveConfig>;
  therapeuticMode?: boolean;
}

export const CognitiveAccessibilityProvider: React.FC<CognitiveAccessibilityProviderProps> = ({
  children,
  initialConfig = {},
  therapeuticMode = true,
}) => {
  const [config, setConfig] = useState<CognitiveConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
    // Enable more features in therapeutic mode
    ...(therapeuticMode && {
      simplifyLanguage: true,
      enableBreakReminders: true,
      showTimeEstimates: true,
    }),
  });
  
  const [isSimplifiedMode, setIsSimplifiedModeState] = useState(config.simplifyLanguage);
  const [cognitiveLoad, setCognitiveLoadState] = useState<'low' | 'medium' | 'high'>('medium');
  const [memoryAid, setMemoryAid] = useState<string | null>(null);
  const [focusSteps, setFocusSteps] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  const { announceTherapeutic } = useAdvancedScreenReader();
  const memoryAidTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const breakReminderTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const updateConfig = useCallback((updates: Partial<CognitiveConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const setSimplifiedMode = useCallback((enabled: boolean) => {
    setIsSimplifiedModeState(enabled);
    updateConfig({ simplifyLanguage: enabled });
    
    announceTherapeutic(
      enabled 
        ? 'Simple language mode enabled. Instructions will be clearer and shorter.'
        : 'Standard language mode enabled.'
    );
  }, [updateConfig, announceTherapeutic]);

  const setCognitiveLoad = useCallback((load: 'low' | 'medium' | 'high') => {
    setCognitiveLoadState(load);
    
    // Automatically adjust settings based on cognitive load
    if (load === 'high') {
      updateConfig({
        simplifyLanguage: true,
        enableBreakReminders: true,
        reduceAnimations: true,
        showProgressIndicators: true,
      });
    } else if (load === 'low') {
      updateConfig({
        reduceAnimations: false,
        enableBreakReminders: false,
      });
    }
  }, [updateConfig]);

  const announceInstruction = useCallback((
    instruction: string, 
    type: 'action' | 'guidance' | 'reminder' = 'action'
  ) => {
    let processedInstruction = instruction;
    
    if (config.simplifyLanguage) {
      // Simplify language patterns
      processedInstruction = processedInstruction
        .replace(/\b(utilize|implement|facilitate)\b/gi, 'use')
        .replace(/\b(commence|initiate)\b/gi, 'start')
        .replace(/\b(terminate|conclude)\b/gi, 'end')
        .replace(/\b(subsequently|thereafter)\b/gi, 'then')
        .replace(/\b(prior to|previous to)\b/gi, 'before')
        .replace(/\b(in order to)\b/gi, 'to')
        .replace(/\b(at this point in time)\b/gi, 'now')
        .replace(/\b(in the event that)\b/gi, 'if');
    }
    
    // Add type-specific prefixes for context
    const prefixes = {
      action: config.simplifyLanguage ? 'Next: ' : 'Please ',
      guidance: config.simplifyLanguage ? 'Tip: ' : 'Guidance: ',
      reminder: config.simplifyLanguage ? 'Remember: ' : 'Reminder: ',
    };
    
    const finalInstruction = prefixes[type] + processedInstruction;
    announceTherapeutic(finalInstruction);
  }, [config.simplifyLanguage, announceTherapeutic]);

  const showMemoryAid = useCallback((content: string, duration: number = 5000) => {
    if (!config.enableMemoryAids) return;
    
    setMemoryAid(content);
    
    if (memoryAidTimeoutRef.current) {
      clearTimeout(memoryAidTimeoutRef.current);
    }
    
    memoryAidTimeoutRef.current = setTimeout(() => {
      setMemoryAid(null);
    }, duration);
  }, [config.enableMemoryAids]);

  const startFocusGuidance = useCallback((steps: string[]) => {
    if (!config.enableFocusGuides) return;
    
    setFocusSteps(steps);
    setCurrentStepIndex(0);
    
    if (steps.length > 0) {
      announceInstruction(steps[0]!, 'guidance');
    }
  }, [config.enableFocusGuides, announceInstruction]);

  const requestBreak = useCallback(() => {
    announceTherapeutic(
      config.simplifyLanguage
        ? 'Take a break when you need one. Your wellbeing comes first.'
        : 'Consider taking a brief break to rest and recharge.'
    );
  }, [config.simplifyLanguage, announceTherapeutic]);

  // Break reminder system
  useEffect(() => {
    if (!config.enableBreakReminders) return;
    
    const reminderInterval = 10 * 60 * 1000; // 10 minutes
    
    breakReminderTimeoutRef.current = setTimeout(() => {
      requestBreak();
      
      // Set up recurring reminders
      const recurring = setInterval(requestBreak, reminderInterval);
      return () => clearInterval(recurring);
    }, reminderInterval);
    
    return () => {
      if (breakReminderTimeoutRef.current) {
        clearTimeout(breakReminderTimeoutRef.current);
      }
    };
  }, [config.enableBreakReminders, requestBreak]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (memoryAidTimeoutRef.current) {
        clearTimeout(memoryAidTimeoutRef.current);
      }
      if (breakReminderTimeoutRef.current) {
        clearTimeout(breakReminderTimeoutRef.current);
      }
    };
  }, []);

  const contextValue: CognitiveAccessibilityContextValue = {
    config,
    updateConfig,
    isSimplifiedMode,
    setSimplifiedMode,
    announceInstruction,
    showMemoryAid,
    startFocusGuidance,
    requestBreak,
    cognitiveLoad,
    setCognitiveLoad,
  };

  return (
    <CognitiveAccessibilityContext.Provider value={contextValue}>
      {children}
      {/* Memory aid overlay */}
      {memoryAid && <MemoryAidOverlay content={memoryAid} />}
      {/* Focus guidance overlay */}
      {focusSteps.length > 0 && (
        <FocusGuidanceOverlay 
          steps={focusSteps} 
          currentIndex={currentStepIndex}
          onStepComplete={() => setCurrentStepIndex(prev => prev + 1)}
          onComplete={() => setFocusSteps([])}
        />
      )}
    </CognitiveAccessibilityContext.Provider>
  );
};

// Memory aid overlay component
interface MemoryAidOverlayProps {
  content: string;
}

const MemoryAidOverlay: React.FC<MemoryAidOverlayProps> = ({ content }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { config } = useCognitiveAccessibility();

  useEffect(() => {
    if (config.reduceAnimations) {
      fadeAnim.setValue(1);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (config.reduceAnimations) {
        fadeAnim.setValue(0);
      } else {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    };
  }, [fadeAnim, config.reduceAnimations]);

  return (
    <Animated.View style={[styles.memoryAidOverlay, { opacity: fadeAnim }]}>
      <View style={styles.memoryAidContent}>
        <Text style={styles.memoryAidText} accessibilityRole="alert">
          {content}
        </Text>
      </View>
    </Animated.View>
  );
};

// Focus guidance overlay component
interface FocusGuidanceOverlayProps {
  steps: string[];
  currentIndex: number;
  onStepComplete: () => void;
  onComplete: () => void;
}

const FocusGuidanceOverlay: React.FC<FocusGuidanceOverlayProps> = ({
  steps,
  currentIndex,
  onStepComplete,
  onComplete,
}) => {
  const { config, announceInstruction } = useCognitiveAccessibility();
  const currentStep = steps[currentIndex];

  useEffect(() => {
    if (currentStep) {
      announceInstruction(currentStep, 'guidance');
    } else if (currentIndex >= steps.length) {
      announceInstruction('Focus guidance complete. Well done!', 'guidance');
      onComplete();
    }
  }, [currentStep, currentIndex, steps.length, announceInstruction, onComplete]);

  if (!currentStep) return null;

  return (
    <View style={styles.focusGuidanceOverlay}>
      <View style={styles.focusGuidanceContent}>
        <Text style={styles.focusGuidanceTitle}>
          Step {currentIndex + 1} of {steps.length}
        </Text>
        <Text style={styles.focusGuidanceText}>
          {currentStep}
        </Text>
        {config.showProgressIndicators && (
          <View style={styles.progressContainer}>
            <View 
              style={[
                styles.progressBar,
                { width: `${((currentIndex + 1) / steps.length) * 100}%` }
              ]} 
            />
          </View>
        )}
      </View>
    </View>
  );
};

// Simplified instruction component
interface SimplifiedInstructionProps {
  children: React.ReactNode;
  complex?: boolean;
  timeEstimate?: string;
  importance?: 'low' | 'medium' | 'high';
  style?: any;
}

export const SimplifiedInstruction: React.FC<SimplifiedInstructionProps> = ({
  children,
  complex = false,
  timeEstimate,
  importance = 'medium',
  style,
}) => {
  const { isSimplifiedMode, config } = useCognitiveAccessibility();
  
  const importanceColors = {
    low: colorSystem.gray[600],
    medium: colorSystem.base.midnightBlue,
    high: colorSystem.status.warning,
  };

  return (
    <View style={[styles.instructionContainer, style]}>
      {config.showTimeEstimates && timeEstimate && (
        <Text style={styles.timeEstimate}>
          {isSimplifiedMode ? `Takes: ${timeEstimate}` : `Estimated time: ${timeEstimate}`}
        </Text>
      )}
      <Text 
        style={[
          styles.instructionText,
          { color: importanceColors[importance] },
          complex && !isSimplifiedMode && styles.complexInstruction,
        ]}
        accessibilityRole="text"
        accessibilityLabel={typeof children === 'string' ? children : undefined}
      >
        {children}
      </Text>
    </View>
  );
};

// Cognitive load indicator component
export const CognitiveLoadIndicator: React.FC = () => {
  const { cognitiveLoad } = useCognitiveAccessibility();
  
  const loadColors = {
    low: colorSystem.status.success,
    medium: colorSystem.status.warning,
    high: colorSystem.status.error,
  };
  
  const loadLabels = {
    low: 'Light',
    medium: 'Moderate', 
    high: 'Heavy',
  };

  return (
    <View style={styles.loadIndicator}>
      <View 
        style={[
          styles.loadIndicatorDot,
          { backgroundColor: loadColors[cognitiveLoad] }
        ]}
      />
      <Text 
        style={[
          styles.loadIndicatorText,
          { color: loadColors[cognitiveLoad] }
        ]}
        accessibilityLabel={`Cognitive load: ${loadLabels[cognitiveLoad]}`}
      >
        {loadLabels[cognitiveLoad]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Memory aid styling
  memoryAidOverlay: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
  },
  memoryAidContent: {
    backgroundColor: colorSystem.accessibility.notification.background,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.accessibility.notification.border,
    padding: spacing.md,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memoryAidText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.bodyRegular.weight,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.bodyRegular.size * 1.4,
  },
  
  // Focus guidance styling
  focusGuidanceOverlay: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
  },
  focusGuidanceContent: {
    backgroundColor: colorSystem.base.white,
    borderWidth: 2,
    borderColor: colorSystem.accessibility.focus.primary,
    padding: spacing.lg,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  focusGuidanceTitle: {
    fontSize: typography.bodySmall.size,
    fontWeight: '600',
    color: colorSystem.accessibility.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  focusGuidanceText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.bodyLarge.weight,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.bodyLarge.size * 1.3,
    marginBottom: spacing.md,
  },
  progressContainer: {
    height: 4,
    backgroundColor: colorSystem.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colorSystem.accessibility.focus.primary,
    borderRadius: 2,
  },
  
  // Instruction styling
  instructionContainer: {
    marginVertical: spacing.sm,
  },
  timeEstimate: {
    fontSize: typography.caption.size,
    fontWeight: typography.caption.weight,
    color: colorSystem.accessibility.text.tertiary,
    marginBottom: spacing.xs,
  },
  instructionText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.bodyRegular.weight,
    lineHeight: typography.bodyRegular.size * 1.4,
  },
  complexInstruction: {
    fontSize: typography.bodySmall.size,
    lineHeight: typography.bodySmall.size * 1.5,
  },
  
  // Cognitive load indicator
  loadIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  loadIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  loadIndicatorText: {
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
});

export default CognitiveAccessibilityProvider;