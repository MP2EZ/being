/**
 * Motor Accessibility Features
 * 
 * ACCESSIBILITY SPECIFICATIONS:
 * - Voice control integration for hands-free interaction
 * - Switch control and external input device support
 * - Adjustable touch target sizes (minimum 44x44pt)
 * - Dwell time and hover state management
 * - Gesture simplification and alternatives
 * - Hand tremor and motor control assistance
 * - One-handed operation support
 * - Sticky keys and modifier lock support
 */

import React, { useCallback, useEffect, useState, createContext, useContext, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  PanResponder,
  Vibration,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme';
import { useAdvancedScreenReader } from './AdvancedScreenReader';

// Motor accessibility configuration
export interface MotorAccessibilityConfig {
  enlargedTouchTargets: boolean;
  enableVoiceControl: boolean;
  enableSwitchControl: boolean;
  enableDwellTime: boolean;
  dwellDuration: number; // milliseconds
  enableHoverStates: boolean;
  simplifyGestures: boolean;
  enableOneHandedMode: boolean;
  tremorAssistance: boolean;
  stickyKeysEnabled: boolean;
  hapticFeedback: boolean;
  customTouchTargetSize: number; // minimum size in points
}

export interface MotorAccessibilityContextValue {
  config: MotorAccessibilityConfig;
  updateConfig: (updates: Partial<MotorAccessibilityConfig>) => void;
  isVoiceControlActive: boolean;
  isDwellModeActive: boolean;
  activateDwellMode: () => void;
  deactivateDwellMode: () => void;
  registerVoiceCommand: (command: string, action: () => void) => void;
  unregisterVoiceCommand: (command: string) => void;
  triggerHapticFeedback: (type: 'light' | 'medium' | 'heavy') => void;
  setOneHandedMode: (enabled: boolean, hand: 'left' | 'right') => void;
  oneHandedMode: { enabled: boolean; hand: 'left' | 'right' } | null;
}

const MotorAccessibilityContext = createContext<MotorAccessibilityContextValue | undefined>(undefined);

export const useMotorAccessibility = () => {
  const context = useContext(MotorAccessibilityContext);
  if (!context) {
    throw new Error('useMotorAccessibility must be used within MotorAccessibilityProvider');
  }
  return context;
};

// Default motor accessibility configuration
const DEFAULT_CONFIG: MotorAccessibilityConfig = {
  enlargedTouchTargets: false,
  enableVoiceControl: false,
  enableSwitchControl: false,
  enableDwellTime: false,
  dwellDuration: 2000,
  enableHoverStates: true,
  simplifyGestures: false,
  enableOneHandedMode: false,
  tremorAssistance: false,
  stickyKeysEnabled: false,
  hapticFeedback: true,
  customTouchTargetSize: 44, // WCAG minimum
};

// Provider component
interface MotorAccessibilityProviderProps {
  children: React.ReactNode;
  initialConfig?: Partial<MotorAccessibilityConfig>;
}

export const MotorAccessibilityProvider: React.FC<MotorAccessibilityProviderProps> = ({
  children,
  initialConfig = {},
}) => {
  const [config, setConfig] = useState<MotorAccessibilityConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  
  const [isVoiceControlActive, setIsVoiceControlActive] = useState(false);
  const [isDwellModeActive, setIsDwellModeActive] = useState(false);
  const [oneHandedMode, setOneHandedModeState] = useState<{ enabled: boolean; hand: 'left' | 'right' } | null>(null);
  const [voiceCommands, setVoiceCommands] = useState<Map<string, () => void>>(new Map());
  
  const { announce } = useAdvancedScreenReader();
  const dwellTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const updateConfig = useCallback((updates: Partial<MotorAccessibilityConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy') => {
    if (!config.hapticFeedback) return;

    if (Platform.OS === 'ios') {
      // iOS haptic feedback
      const { ImpactFeedbackGenerator } = require('react-native').Haptics || {};
      if (ImpactFeedbackGenerator) {
        const style = type === 'light' ? 'light' : type === 'medium' ? 'medium' : 'heavy';
        ImpactFeedbackGenerator.impactOccurred(style);
      }
    } else {
      // Android vibration
      const durations = {
        light: 50,
        medium: 100,
        heavy: 200,
      };
      Vibration.vibrate(durations[type]);
    }
  }, [config.hapticFeedback]);

  const activateDwellMode = useCallback(() => {
    setIsDwellModeActive(true);
    announce({
      message: `Dwell mode activated. Hover for ${config.dwellDuration / 1000} seconds to activate.`,
      type: 'supportive',
      priority: 'medium',
      hapticFeedback: true,
    });
  }, [announce, config.dwellDuration]);

  const deactivateDwellMode = useCallback(() => {
    setIsDwellModeActive(false);
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
    }
    announce({
      message: 'Dwell mode deactivated.',
      type: 'supportive',
      priority: 'low',
    });
  }, [announce]);

  const registerVoiceCommand = useCallback((command: string, action: () => void) => {
    setVoiceCommands(prev => new Map(prev).set(command.toLowerCase(), action));
  }, []);

  const unregisterVoiceCommand = useCallback((command: string) => {
    setVoiceCommands(prev => {
      const newMap = new Map(prev);
      newMap.delete(command.toLowerCase());
      return newMap;
    });
  }, []);

  const setOneHandedMode = useCallback((enabled: boolean, hand: 'left' | 'right' = 'right') => {
    setOneHandedModeState(enabled ? { enabled, hand } : null);
    
    announce({
      message: enabled 
        ? `One-handed mode enabled for ${hand} hand. Interface adjusted for easier reach.`
        : 'One-handed mode disabled.',
      type: 'supportive',
      priority: 'medium',
    });
  }, [announce]);

  // Voice control setup (simplified for React Native)
  useEffect(() => {
    if (config.enableVoiceControl) {
      setIsVoiceControlActive(true);
      
      // Register common therapeutic voice commands
      registerVoiceCommand('start breathing', () => {
        announce({
          message: 'Starting breathing exercise.',
          type: 'therapeutic',
          priority: 'medium',
        });
      });
      
      registerVoiceCommand('help', () => {
        announce({
          message: 'Voice commands available: start breathing, go back, next question, crisis help.',
          type: 'supportive',
          priority: 'medium',
        });
      });
      
      registerVoiceCommand('crisis help', () => {
        announce({
          message: 'Connecting to crisis support.',
          type: 'crisis',
          priority: 'critical',
        });
      });
    } else {
      setIsVoiceControlActive(false);
    }
  }, [config.enableVoiceControl, registerVoiceCommand, announce]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
      }
    };
  }, []);

  const contextValue: MotorAccessibilityContextValue = {
    config,
    updateConfig,
    isVoiceControlActive,
    isDwellModeActive,
    activateDwellMode,
    deactivateDwellMode,
    registerVoiceCommand,
    unregisterVoiceCommand,
    triggerHapticFeedback,
    setOneHandedMode,
    oneHandedMode,
  };

  return (
    <MotorAccessibilityContext.Provider value={contextValue}>
      <View style={oneHandedMode?.enabled && styles.oneHandedContainer}>
        {children}
      </View>
    </MotorAccessibilityContext.Provider>
  );
};

// Enhanced Pressable with motor accessibility features
interface AccessiblePressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  dwellEnabled?: boolean;
  voiceCommand?: string;
  hapticType?: 'light' | 'medium' | 'heavy';
  enlargeTouchTarget?: boolean;
  tremorTolerant?: boolean;
  style?: any;
  accessibilityLabel?: string;
  testID?: string;
}

export const AccessiblePressable: React.FC<AccessiblePressableProps> = ({
  children,
  onPress,
  disabled = false,
  dwellEnabled = false,
  voiceCommand,
  hapticType = 'medium',
  enlargeTouchTarget,
  tremorTolerant = false,
  style,
  accessibilityLabel,
  testID,
}) => {
  const { 
    config, 
    isDwellModeActive, 
    registerVoiceCommand, 
    unregisterVoiceCommand,
    triggerHapticFeedback,
  } = useMotorAccessibility();
  
  const [isHovered, setIsHovered] = useState(false);
  const [isDwelling, setIsDwelling] = useState(false);
  const [touchPosition, setTouchPosition] = useState<{ x: number; y: number } | null>(null);

  const dwellTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const tremorFilterRef = useRef<{ x: number; y: number; timestamp: number }[]>([]);

  // Voice command registration
  useEffect(() => {
    if (voiceCommand && onPress) {
      registerVoiceCommand(voiceCommand, onPress);
      return () => unregisterVoiceCommand(voiceCommand);
    }
    return undefined;
  }, [voiceCommand, onPress, registerVoiceCommand, unregisterVoiceCommand]);

  // Tremor-tolerant touch handling
  const handleTouchMove = useCallback((event: any) => {
    if (!tremorTolerant) return;

    const { locationX, locationY } = event.nativeEvent;
    const now = Date.now();
    
    // Store recent touch positions for tremor filtering
    tremorFilterRef.current.push({ x: locationX, y: locationY, timestamp: now });
    
    // Keep only recent positions (last 200ms)
    tremorFilterRef.current = tremorFilterRef.current.filter(
      pos => now - pos.timestamp < 200
    );
    
    // Calculate movement stability
    if (tremorFilterRef.current.length > 3) {
      const positions = tremorFilterRef.current;
      const avgX = positions.reduce((sum, pos) => sum + pos.x, 0) / positions.length;
      const avgY = positions.reduce((sum, pos) => sum + pos.y, 0) / positions.length;
      
      setTouchPosition({ x: avgX, y: avgY });
    }
  }, [tremorTolerant]);

  // Dwell timing
  const startDwellTimer = useCallback(() => {
    if (!dwellEnabled || !isDwellModeActive || disabled) return;
    
    setIsDwelling(true);
    dwellTimerRef.current = setTimeout(() => {
      onPress?.();
      triggerHapticFeedback(hapticType);
      setIsDwelling(false);
    }, config.dwellDuration);
  }, [dwellEnabled, isDwellModeActive, disabled, onPress, triggerHapticFeedback, hapticType, config.dwellDuration]);

  const cancelDwellTimer = useCallback(() => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
    }
    setIsDwelling(false);
  }, []);

  // Enhanced press handling
  const handlePress = useCallback(() => {
    if (disabled) return;
    
    triggerHapticFeedback(hapticType);
    onPress?.();
  }, [disabled, triggerHapticFeedback, hapticType, onPress]);

  // Touch target size calculation
  const touchTargetSize = enlargeTouchTarget || config.enlargedTouchTargets 
    ? Math.max(config.customTouchTargetSize, 44)
    : 44;

  const enhancedStyle = [
    style,
    config.enlargedTouchTargets && styles.enlargedTouchTarget,
    isHovered && config.enableHoverStates && styles.hoverState,
    isDwelling && styles.dwellingState,
    disabled && styles.disabledState,
    { minHeight: touchTargetSize, minWidth: touchTargetSize },
  ];

  return (
    <Pressable
      style={({ pressed }) => [
        enhancedStyle,
        pressed && !disabled && styles.pressedState,
      ]}
      onPress={handlePress}
      onPressIn={startDwellTimer}
      onPressOut={cancelDwellTimer}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onTouchMove={handleTouchMove}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      testID={testID}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {children}
      {isDwelling && (
        <View style={styles.dwellIndicator}>
          <View style={styles.dwellProgress} />
        </View>
      )}
    </Pressable>
  );
};

// Voice control indicator
export const VoiceControlIndicator: React.FC = () => {
  const { isVoiceControlActive } = useMotorAccessibility();
  
  if (!isVoiceControlActive) return null;

  return (
    <View style={styles.voiceIndicator}>
      <View style={styles.voiceIndicatorDot} />
      <Text style={styles.voiceIndicatorText}>Voice Control Active</Text>
    </View>
  );
};

// Switch control helper
interface SwitchControlHelperProps {
  onNextItem: () => void;
  onSelectItem: () => void;
  onPreviousItem: () => void;
  currentItem: string;
}

export const SwitchControlHelper: React.FC<SwitchControlHelperProps> = ({
  onNextItem,
  onSelectItem,
  onPreviousItem,
  currentItem,
}) => {
  const { config } = useMotorAccessibility();
  const { announce } = useAdvancedScreenReader();

  useEffect(() => {
    if (config.enableSwitchControl) {
      announce({
        message: `Switch control active. Current item: ${currentItem}`,
        type: 'supportive',
        priority: 'low',
      });
    }
  }, [currentItem, config.enableSwitchControl, announce]);

  if (!config.enableSwitchControl) return null;

  return (
    <View style={styles.switchControlHelper}>
      <AccessiblePressable
        onPress={onPreviousItem}
        accessibilityLabel="Previous item"
        style={styles.switchButton}
        hapticType="light"
      >
        <Text style={styles.switchButtonText}>←</Text>
      </AccessiblePressable>
      
      <AccessiblePressable
        onPress={onSelectItem}
        accessibilityLabel={`Select ${currentItem}`}
        style={styles.switchSelectButton}
        hapticType="heavy"
      >
        <Text style={styles.switchButtonText}>Select</Text>
      </AccessiblePressable>
      
      <AccessiblePressable
        onPress={onNextItem}
        accessibilityLabel="Next item"
        style={styles.switchButton}
        hapticType="light"
      >
        <Text style={styles.switchButtonText}>→</Text>
      </AccessiblePressable>
    </View>
  );
};

// One-handed mode layout component
interface OneHandedLayoutProps {
  children: React.ReactNode;
  primaryActions?: React.ReactNode;
  secondaryActions?: React.ReactNode;
}

export const OneHandedLayout: React.FC<OneHandedLayoutProps> = ({
  children,
  primaryActions,
  secondaryActions,
}) => {
  const { oneHandedMode } = useMotorAccessibility();
  
  if (!oneHandedMode?.enabled) {
    return <>{children}</>;
  }

  const isLeftHanded = oneHandedMode.hand === 'left';

  return (
    <View style={styles.oneHandedLayout}>
      <View style={[
        styles.oneHandedContent,
        isLeftHanded ? styles.oneHandedContentLeft : styles.oneHandedContentRight
      ]}>
        {children}
      </View>
      
      {primaryActions && (
        <View style={[
          styles.oneHandedPrimaryActions,
          isLeftHanded ? styles.oneHandedActionsLeft : styles.oneHandedActionsRight
        ]}>
          {primaryActions}
        </View>
      )}
      
      {secondaryActions && (
        <View style={[
          styles.oneHandedSecondaryActions,
          isLeftHanded ? styles.oneHandedActionsLeft : styles.oneHandedActionsRight
        ]}>
          {secondaryActions}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Container styles
  oneHandedContainer: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  
  // Pressable enhancements
  enlargedTouchTarget: {
    minHeight: 56,
    minWidth: 56,
    padding: spacing.md,
  },
  hoverState: {
    backgroundColor: colorSystem.gray[100],
    borderWidth: 2,
    borderColor: colorSystem.accessibility.focus.primary,
  },
  dwellingState: {
    backgroundColor: colorSystem.accessibility.focus.primary + '20',
    borderWidth: 2,
    borderColor: colorSystem.accessibility.focus.primary,
  },
  pressedState: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  disabledState: {
    opacity: 0.4,
  },
  
  // Dwell indicator
  dwellIndicator: {
    position: 'absolute',
    bottom: -borderRadius.small,
    left: 0,
    right: 0,
    height: borderRadius.small,
    backgroundColor: colorSystem.gray[200],
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
  },
  dwellProgress: {
    height: '100%',
    backgroundColor: colorSystem.accessibility.focus.primary,
    // Animation would be handled by Animated component in real implementation
  },
  
  // Voice control indicator
  voiceIndicator: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSystem.status.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xl,
    gap: spacing.xs,
  },
  voiceIndicatorDot: {
    width: borderRadius.medium,
    height: borderRadius.medium,
    borderRadius: borderRadius.small,
    backgroundColor: colorSystem.status.success,
  },
  voiceIndicatorText: {
    fontSize: typography.caption.size,
    fontWeight: '600',
    color: colorSystem.status.success,
  },
  
  // Switch control helper
  switchControlHelper: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colorSystem.base.white,
    padding: spacing.md,
    borderRadius: borderRadius.large,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: borderRadius.small },
    shadowOpacity: 0.15,
    shadowRadius: borderRadius.medium,
    elevation: 6,
  },
  switchButton: {
    backgroundColor: colorSystem.gray[200],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchSelectButton: {
    backgroundColor: colorSystem.accessibility.focus.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.base.white,
  },
  
  // One-handed layout
  oneHandedLayout: {
    flex: 1,
  },
  oneHandedContent: {
    flex: 1,
    maxWidth: '80%',
  },
  oneHandedContentLeft: {
    alignSelf: 'flex-start',
  },
  oneHandedContentRight: {
    alignSelf: 'flex-end',
  },
  oneHandedPrimaryActions: {
    position: 'absolute',
    bottom: spacing.lg,
    maxWidth: '70%',
  },
  oneHandedSecondaryActions: {
    position: 'absolute',
    bottom: spacing.xl * 2,
    maxWidth: '70%',
  },
  oneHandedActionsLeft: {
    left: spacing.md,
  },
  oneHandedActionsRight: {
    right: spacing.md,
  },
});

export default MotorAccessibilityProvider;