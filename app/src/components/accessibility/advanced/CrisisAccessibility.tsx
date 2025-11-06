/**
 * Crisis Intervention Accessibility Enhancements
 * 
 * ACCESSIBILITY SPECIFICATIONS:
 * - Ultra-fast crisis button access (<3 taps, <200ms response)
 * - Emergency voice activation and hands-free operation
 * - High-visibility crisis mode with maximum contrast
 * - Calm navigation patterns during crisis intervention
 * - Stress-aware interface adaptations
 * - Emergency contact accessibility optimization
 * - Crisis de-escalation through accessible design
 * - Multi-modal crisis support (audio, visual, haptic)
 */


import { logSecurity, logPerformance, logError, LogCategory } from '../../../services/logging';
import React, { useCallback, useEffect, useState, createContext, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Vibration,
  Platform,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { colorSystem, spacing, typography } from '../../../constants/colors';
import { useAdvancedScreenReader } from './AdvancedScreenReader';
import { useSensoryAccessibility } from './SensoryAccessibility';
import { useMotorAccessibility, AccessiblePressable } from './MotorAccessibility';

// Crisis accessibility configuration
export interface CrisisAccessibilityConfig {
  enableVoiceActivation: boolean;
  crisisHotkeys: string[];
  autoHighContrast: boolean;
  calmingAnimations: boolean;
  emergencyVibration: boolean;
  crisisAnnouncements: boolean;
  simplifiedNavigation: boolean;
  stressDetection: boolean;
  rapidContactAccess: boolean;
  voiceGuidance: boolean;
  multimodalFeedback: boolean;
}

export interface CrisisState {
  isActive: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timeStarted: Date | null;
  interventionStep: number;
  contactsAccessed: string[];
  userResponseLevel: 'responsive' | 'limited' | 'non-responsive';
}

export interface CrisisAccessibilityContextValue {
  config: CrisisAccessibilityConfig;
  updateConfig: (updates: Partial<CrisisAccessibilityConfig>) => void;
  crisisState: CrisisState;
  activateCrisisMode: (severity?: CrisisState['severity']) => void;
  deactivateCrisisMode: () => void;
  escalateCrisis: () => void;
  de_escalateCrisis: () => void;
  triggerEmergencyContact: (contactId: string) => void;
  announceEmergencyAction: (action: string) => void;
  startVoiceGuidance: () => void;
  stopVoiceGuidance: () => void;
  setCalmingMode: (enabled: boolean) => void;
  isCalmingMode: boolean;
}

const CrisisAccessibilityContext = createContext<CrisisAccessibilityContextValue | undefined>(undefined);

export const useCrisisAccessibility = () => {
  const context = useContext(CrisisAccessibilityContext);
  if (!context) {
    throw new Error('useCrisisAccessibility must be used within CrisisAccessibilityProvider');
  }
  return context;
};

// Default configuration optimized for crisis scenarios
const DEFAULT_CONFIG: CrisisAccessibilityConfig = {
  enableVoiceActivation: true,
  crisisHotkeys: ['crisis help', 'emergency', 'help me', 'call 988'],
  autoHighContrast: true,
  calmingAnimations: true,
  emergencyVibration: true,
  crisisAnnouncements: true,
  simplifiedNavigation: true,
  stressDetection: false,
  rapidContactAccess: true,
  voiceGuidance: true,
  multimodalFeedback: true,
};

// Provider component
interface CrisisAccessibilityProviderProps {
  children: React.ReactNode;
  initialConfig?: Partial<CrisisAccessibilityConfig>;
  emergencyContacts?: Array<{
    id: string;
    name: string;
    phone: string;
    type: 'hotline' | 'personal' | 'professional';
  }>;
}

export const CrisisAccessibilityProvider: React.FC<CrisisAccessibilityProviderProps> = ({
  children,
  initialConfig = {},
  emergencyContacts = [],
}) => {
  const [config, setConfig] = useState<CrisisAccessibilityConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  
  const [crisisState, setCrisisState] = useState<CrisisState>({
    isActive: false,
    severity: 'low',
    timeStarted: null,
    interventionStep: 0,
    contactsAccessed: [],
    userResponseLevel: 'responsive',
  });
  
  const [isCalmingMode, setIsCalmingModeState] = useState(false);
  const [voiceGuidanceActive, setVoiceGuidanceActive] = useState(false);
  
  const { announceCrisis, announceTherapeutic } = useAdvancedScreenReader();
  const { updateConfig: updateSensoryConfig, provideAudioCue } = useSensoryAccessibility();
  const { registerVoiceCommand, unregisterVoiceCommand, triggerHapticFeedback } = useMotorAccessibility();
  
  const calmingAnimationRef = useRef(new Animated.Value(0));
  const urgencyAnimationRef = useRef(new Animated.Value(0));
  const voiceGuidanceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Crisis mode activation
  const activateCrisisMode = useCallback((severity: CrisisState['severity'] = 'medium') => {
    const startTime = performance.now();
    
    setCrisisState({
      isActive: true,
      severity,
      timeStarted: new Date(),
      interventionStep: 0,
      contactsAccessed: [],
      userResponseLevel: 'responsive',
    });

    // Auto-activate accessibility enhancements
    if (config.autoHighContrast) {
      updateSensoryConfig({
        contrastLevel: 'maximum',
        customFontSize: 120, // Larger text for crisis
        flashReduction: true,
      });
    }

    // Emergency announcement
    if (config.crisisAnnouncements) {
      const urgencyMessages = {
        low: 'Crisis support activated. You are not alone.',
        medium: 'Crisis intervention active. Help is available immediately.',
        high: 'Emergency support activated. Connecting you to immediate help.',
        critical: 'Critical crisis mode. Emergency services being contacted.',
      };
      
      announceCrisis(urgencyMessages[severity], severity === 'critical' ? 'immediate' : 'gentle');
    }

    // Emergency vibration pattern
    if (config.emergencyVibration) {
      const patterns = {
        low: [0, 200],
        medium: [0, 200, 100, 200],
        high: [0, 300, 100, 300, 100, 300],
        critical: [0, 500, 200, 500, 200, 500, 200, 500],
      };
      Vibration.vibrate(patterns[severity]);
    }

    // Start voice guidance if enabled
    if (config.voiceGuidance) {
      setTimeout(() => startVoiceGuidance(), 1000);
    }

    // Performance monitoring - crisis mode must activate quickly
    const activationTime = performance.now() - startTime;
    if (activationTime > 200) {
      logSecurity(`⚠️ Crisis mode activation took ${activationTime}ms (target: <200ms)`, 'medium', {
        component: 'CrisisAccessibility',
        actualTime: activationTime,
        target: 200
      });
    }

    // Audio cue
    provideAudioCue('error'); // Use error pattern for urgency
  }, [
    config.autoHighContrast,
    config.crisisAnnouncements,
    config.emergencyVibration,
    config.voiceGuidance,
    updateSensoryConfig,
    announceCrisis,
    provideAudioCue,
  ]);

  const deactivateCrisisMode = useCallback(() => {
    setCrisisState(prev => ({
      ...prev,
      isActive: false,
      timeStarted: null,
    }));

    // Reset accessibility enhancements
    updateSensoryConfig({
      contrastLevel: 'normal',
      customFontSize: 100,
    });

    // Stop voice guidance
    stopVoiceGuidance();

    // Calming announcement
    announceTherapeutic('Crisis mode deactivated. You are safe now.', 'calmer');
    
    // Success audio cue
    provideAudioCue('success');
  }, [updateSensoryConfig, announceTherapeutic, provideAudioCue]);

  const escalateCrisis = useCallback(() => {
    setCrisisState(prev => {
      const severityLevels = ['low', 'medium', 'high', 'critical'] as const;
      const currentIndex = severityLevels.indexOf(prev.severity);
      const newSeverity = severityLevels[Math.min(currentIndex + 1, severityLevels.length - 1)];
      
      if (newSeverity === 'critical') {
        // Automatically connect to emergency services
        triggerEmergencyContact('988');
      }
      
      return { ...prev, severity: newSeverity };
    });
  }, []);

  const de_escalateCrisis = useCallback(() => {
    setCrisisState(prev => {
      const severityLevels = ['low', 'medium', 'high', 'critical'] as const;
      const currentIndex = severityLevels.indexOf(prev.severity);
      const newSeverity = severityLevels[Math.max(currentIndex - 1, 0)];
      
      return { ...prev, severity: newSeverity };
    });
    
    // Start calming mode
    setCalmingMode(true);
  }, []);

  const triggerEmergencyContact = useCallback((contactId: string) => {
    const contact = emergencyContacts.find(c => c.id === contactId);
    
    if (contact) {
      // Track contact access
      setCrisisState(prev => ({
        ...prev,
        contactsAccessed: [...prev.contactsAccessed, contactId],
      }));

      // Announce action
      announceEmergencyAction(`Calling ${contact.name}`);
      
      // Initiate call
      const phoneUrl = `tel:${contact.phone}`;
      Linking.canOpenURL(phoneUrl).then(supported => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Cannot make call', `Please dial ${contact.phone} manually`);
        }
      });
    } else if (contactId === '988') {
      // Direct 988 crisis line
      announceEmergencyAction('Connecting to 988 Crisis Lifeline');
      Linking.openURL('tel:988');
    }
  }, [emergencyContacts]);

  const announceEmergencyAction = useCallback((action: string) => {
    announceCrisis(`Emergency action: ${action}`, 'immediate');
    triggerHapticFeedback('heavy');
  }, [announceCrisis, triggerHapticFeedback]);

  const startVoiceGuidance = useCallback(() => {
    if (!config.voiceGuidance) return;
    
    setVoiceGuidanceActive(true);
    
    const guidanceSteps = [
      'Take a slow, deep breath with me',
      'You are safe right now',
      'Help is available immediately',
      'Focus on breathing slowly',
      'You are not alone',
    ];
    
    let stepIndex = 0;
    
    const announceGuidanceStep = () => {
      if (stepIndex < guidanceSteps.length && voiceGuidanceActive) {
        announceTherapeutic(guidanceSteps[stepIndex], 'calming');
        stepIndex++;
        
        voiceGuidanceTimeoutRef.current = setTimeout(announceGuidanceStep, 8000);
      }
    };
    
    // Start guidance after initial announcement
    voiceGuidanceTimeoutRef.current = setTimeout(announceGuidanceStep, 2000);
  }, [config.voiceGuidance, announceTherapeutic, voiceGuidanceActive]);

  const stopVoiceGuidance = useCallback(() => {
    setVoiceGuidanceActive(false);
    
    if (voiceGuidanceTimeoutRef.current) {
      clearTimeout(voiceGuidanceTimeoutRef.current);
    }
  }, []);

  const setCalmingMode = useCallback((enabled: boolean) => {
    setIsCalmingModeState(enabled);
    
    if (enabled && config.calmingAnimations) {
      // Start gentle breathing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(calmingAnimationRef.current, {
            toValue: 1,
            duration: 4000, // 4 second inhale
            useNativeDriver: true,
          }),
          Animated.timing(calmingAnimationRef.current, {
            toValue: 0,
            duration: 6000, // 6 second exhale
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      calmingAnimationRef.current.stopAnimation();
    }
  }, [config.calmingAnimations]);

  // Register crisis voice commands
  useEffect(() => {
    if (config.enableVoiceActivation) {
      config.crisisHotkeys.forEach(command => {
        registerVoiceCommand(command, () => activateCrisisMode('high'));
      });
      
      // Additional crisis commands
      registerVoiceCommand('call 988', () => triggerEmergencyContact('988'));
      registerVoiceCommand('breathing exercise', () => setCalmingMode(true));
      registerVoiceCommand('stop crisis mode', deactivateCrisisMode);
    }
    
    return () => {
      if (config.enableVoiceActivation) {
        config.crisisHotkeys.forEach(command => {
          unregisterVoiceCommand(command);
        });
        unregisterVoiceCommand('call 988');
        unregisterVoiceCommand('breathing exercise');
        unregisterVoiceCommand('stop crisis mode');
      }
    };
  }, [
    config.enableVoiceActivation,
    config.crisisHotkeys,
    registerVoiceCommand,
    unregisterVoiceCommand,
    activateCrisisMode,
    triggerEmergencyContact,
    setCalmingMode,
    deactivateCrisisMode,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (voiceGuidanceTimeoutRef.current) {
        clearTimeout(voiceGuidanceTimeoutRef.current);
      }
    };
  }, []);

  const updateConfig = useCallback((updates: Partial<CrisisAccessibilityConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const contextValue: CrisisAccessibilityContextValue = {
    config,
    updateConfig,
    crisisState,
    activateCrisisMode,
    deactivateCrisisMode,
    escalateCrisis,
    de_escalateCrisis,
    triggerEmergencyContact,
    announceEmergencyAction,
    startVoiceGuidance,
    stopVoiceGuidance,
    setCalmingMode,
    isCalmingMode,
  };

  return (
    <CrisisAccessibilityContext.Provider value={contextValue}>
      <View style={[
        styles.container,
        crisisState.isActive && styles.crisisActiveContainer,
        isCalmingMode && styles.calmingContainer,
      ]}>
        {children}
        {/* Crisis mode overlay */}
        {crisisState.isActive && (
          <CrisisOverlay 
            severity={crisisState.severity}
            onEscalate={escalateCrisis}
            onDeEscalate={de_escalateCrisis}
            onEmergencyContact={triggerEmergencyContact}
          />
        )}
        {/* Calming animation overlay */}
        {isCalmingMode && (
          <CalmingAnimationOverlay 
            animationValue={calmingAnimationRef.current}
          />
        )}
      </View>
    </CrisisAccessibilityContext.Provider>
  );
};

// Crisis mode overlay with ultra-accessible emergency controls
interface CrisisOverlayProps {
  severity: CrisisState['severity'];
  onEscalate: () => void;
  onDeEscalate: () => void;
  onEmergencyContact: (contactId: string) => void;
}

const CrisisOverlay: React.FC<CrisisOverlayProps> = ({
  severity,
  onEscalate,
  onDeEscalate,
  onEmergencyContact,
}) => {
  const severityColors = {
    low: '#FFB300',
    medium: '#FF6600',
    high: '#FF0000',
    critical: '#990000',
  };

  return (
    <View style={[
      styles.crisisOverlay,
      { backgroundColor: severityColors[severity] + '20' }
    ]}>
      <View style={styles.crisisControls}>
        <Text style={styles.crisisTitle}>
          Crisis Support Active
        </Text>
        
        {/* Ultra-large emergency button */}
        <AccessiblePressable
          onPress={() => onEmergencyContact('988')}
          style={styles.emergencyButton}
          enlargeTouchTarget={true}
          hapticType="heavy"
          voiceCommand="call 988"
          accessibilityLabel="Call 988 Crisis Lifeline immediately"
        >
          <Text style={styles.emergencyButtonText}>
            CALL 988
          </Text>
          <Text style={styles.emergencyButtonSubtext}>
            Crisis Lifeline
          </Text>
        </AccessiblePressable>
        
        {/* Secondary actions */}
        <View style={styles.secondaryActions}>
          <AccessiblePressable
            onPress={onDeEscalate}
            style={styles.secondaryButton}
            accessibilityLabel="I'm feeling a bit better"
            hapticType="medium"
          >
            <Text style={styles.secondaryButtonText}>
              Feeling Better
            </Text>
          </AccessiblePressable>
          
          <AccessiblePressable
            onPress={onEscalate}
            style={[styles.secondaryButton, styles.escalateButton]}
            accessibilityLabel="I need more immediate help"
            hapticType="heavy"
          >
            <Text style={styles.secondaryButtonText}>
              Need More Help
            </Text>
          </AccessiblePressable>
        </View>
      </View>
    </View>
  );
};

// Calming animation overlay for de-escalation
interface CalmingAnimationOverlayProps {
  animationValue: Animated.Value;
}

const CalmingAnimationOverlay: React.FC<CalmingAnimationOverlayProps> = ({
  animationValue,
}) => {
  return (
    <View style={styles.calmingOverlay}>
      <Animated.View
        style={[
          styles.breathingCircle,
          {
            transform: [
              {
                scale: animationValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.3],
                }),
              },
            ],
            opacity: animationValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.8],
            }),
          },
        ]}
      />
      <Text style={styles.breathingText}>
        Breathe with the circle
      </Text>
    </View>
  );
};

// Ultra-accessible crisis button for placement anywhere in the app
interface CrisisButtonProps {
  position?: 'floating' | 'inline';
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export const UltraCrisisButton: React.FC<CrisisButtonProps> = ({
  position = 'floating',
  size = 'medium',
  style,
}) => {
  const { activateCrisisMode } = useCrisisAccessibility();
  
  const sizeStyles = {
    small: { width: 60, height: 60 },
    medium: { width: 80, height: 80 },
    large: { width: 100, height: 100 },
  };

  const positionStyles = position === 'floating' ? styles.floatingButton : {};

  return (
    <AccessiblePressable
      onPress={() => activateCrisisMode('medium')}
      style={[
        styles.crisisButton,
        sizeStyles[size],
        positionStyles,
        style,
      ]}
      enlargeTouchTarget={true}
      hapticType="heavy"
      voiceCommand="crisis help"
      accessibilityLabel="Emergency crisis support - tap for immediate help"
      accessibilityRole="button"
      accessibilityHint="Activates crisis intervention mode with immediate access to help"
    >
      <Text style={styles.crisisButtonText}>
        SOS
      </Text>
    </AccessiblePressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  crisisActiveContainer: {
    // Crisis mode visual indicators
  },
  calmingContainer: {
    // Calming mode visual adjustments
  },
  
  // Crisis overlay
  crisisOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    zIndex: 9999,
  },
  crisisControls: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
    minWidth: 300,
  },
  crisisTitle: {
    fontSize: typography.headline2.size,
    fontWeight: '700',
    color: colorSystem.status.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  
  // Emergency button (ultra-accessible)
  emergencyButton: {
    backgroundColor: colorSystem.status.error,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl * 1.5,
    borderRadius: 16,
    minHeight: 100,
    minWidth: 200,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colorSystem.status.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 12,
    marginBottom: spacing.lg,
  },
  emergencyButtonText: {
    fontSize: 32,
    fontWeight: '900',
    color: colorSystem.base.white,
    textAlign: 'center',
  },
  emergencyButtonSubtext: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.base.white,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  
  // Secondary actions
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryButton: {
    backgroundColor: colorSystem.gray[600],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    minHeight: 60,
    justifyContent: 'center',
    flex: 1,
  },
  escalateButton: {
    backgroundColor: colorSystem.status.warning,
  },
  secondaryButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.base.white,
    textAlign: 'center',
  },
  
  // Calming overlay
  calmingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(64, 181, 173, 0.1)',
    zIndex: 1000,
  },
  breathingCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colorSystem.base.teal,
    marginBottom: spacing.lg,
  },
  breathingText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    color: colorSystem.base.teal,
    textAlign: 'center',
  },
  
  // Crisis button
  crisisButton: {
    backgroundColor: colorSystem.status.error,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colorSystem.status.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 12,
  },
  floatingButton: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    zIndex: 1000,
  },
  crisisButtonText: {
    fontSize: typography.headline3.size,
    fontWeight: '900',
    color: colorSystem.base.white,
  },
});

export default CrisisAccessibilityProvider;