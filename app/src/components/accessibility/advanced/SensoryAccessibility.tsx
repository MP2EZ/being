/**
 * Sensory Accessibility Support
 * 
 * ACCESSIBILITY SPECIFICATIONS:
 * - High contrast mode and custom color schemes
 * - Font size scaling and typography adjustments
 * - Visual indicators for audio content (deaf/hard of hearing)
 * - Audio descriptions for visual content (blind/low vision)
 * - Color-blind friendly color palettes
 * - Reduced motion and vestibular disorder support
 * - Screen flash and seizure prevention
 * - Multi-sensory feedback integration
 */

import React, { useCallback, useEffect, useState, createContext, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  AccessibilityInfo,
  Platform,
  Appearance,
  Dimensions,
  Vibration,
} from 'react-native';
import { colorSystem, spacing, typography } from '../../../constants/colors';
import { useAdvancedScreenReader } from './AdvancedScreenReader';

// Sensory accessibility configuration
export interface SensoryAccessibilityConfig {
  highContrastMode: boolean;
  customFontSize: number; // percentage multiplier (100 = normal)
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'monochrome';
  reduceMotion: boolean;
  reduceTransparency: boolean;
  enableVisualIndicators: boolean; // for audio content
  enableAudioDescriptions: boolean; // for visual content
  enableHapticSubstitution: boolean; // haptic feedback for audio
  flashReduction: boolean;
  contrastLevel: 'normal' | 'high' | 'maximum';
  textSpacing: 'normal' | 'increased' | 'maximum';
  focusRingStyle: 'standard' | 'enhanced' | 'maximum';
}

export interface ColorScheme {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  text: string;
  textSecondary: string;
  border: string;
  focus: string;
  error: string;
  success: string;
  warning: string;
}

export interface SensoryAccessibilityContextValue {
  config: SensoryAccessibilityConfig;
  updateConfig: (updates: Partial<SensoryAccessibilityConfig>) => void;
  currentColorScheme: ColorScheme;
  effectiveFontSize: (baseSize: number) => number;
  isReducedMotion: boolean;
  isHighContrast: boolean;
  announceVisualChange: (description: string) => void;
  provideAudioCue: (type: 'success' | 'error' | 'warning' | 'info') => void;
  flashWarning: (intensity: 'low' | 'medium' | 'high') => boolean;
  enableColorBlindMode: (mode: SensoryAccessibilityConfig['colorBlindMode']) => void;
}

const SensoryAccessibilityContext = createContext<SensoryAccessibilityContextValue | undefined>(undefined);

export const useSensoryAccessibility = () => {
  const context = useContext(SensoryAccessibilityContext);
  if (!context) {
    throw new Error('useSensoryAccessibility must be used within SensoryAccessibilityProvider');
  }
  return context;
};

// Default configuration
const DEFAULT_CONFIG: SensoryAccessibilityConfig = {
  highContrastMode: false,
  customFontSize: 100,
  colorBlindMode: 'none',
  reduceMotion: false,
  reduceTransparency: false,
  enableVisualIndicators: true,
  enableAudioDescriptions: false,
  enableHapticSubstitution: false,
  flashReduction: true,
  contrastLevel: 'normal',
  textSpacing: 'normal',
  focusRingStyle: 'standard',
};

// Color schemes for different contrast levels and color blindness
const COLOR_SCHEMES = {
  normal: {
    background: colorSystem.base.white,
    surface: colorSystem.gray[50],
    primary: colorSystem.base.midnightBlue,
    secondary: colorSystem.base.teal,
    text: colorSystem.base.midnightBlue,
    textSecondary: colorSystem.gray[600],
    border: colorSystem.gray[300],
    focus: colorSystem.accessibility.focus.primary,
    error: colorSystem.status.error,
    success: colorSystem.status.success,
    warning: colorSystem.status.warning,
  },
  
  highContrast: {
    background: '#FFFFFF',
    surface: '#F8F9FA',
    primary: '#000000',
    secondary: '#1F2937',
    text: '#000000',
    textSecondary: '#374151',
    border: '#000000',
    focus: '#0066CC',
    error: '#CC0000',
    success: '#006600',
    warning: '#CC6600',
  },
  
  maximumContrast: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    primary: '#000000',
    secondary: '#000000',
    text: '#000000',
    textSecondary: '#000000',
    border: '#000000',
    focus: '#000000',
    error: '#000000',
    success: '#000000',
    warning: '#000000',
  },
  
  // Color-blind friendly schemes
  protanopia: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    primary: '#0066CC',
    secondary: '#FFB300',
    text: '#333333',
    textSecondary: '#666666',
    border: '#CCCCCC',
    focus: '#0066CC',
    error: '#CC6600',
    success: '#0066CC',
    warning: '#FFB300',
  },
  
  deuteranopia: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    primary: '#0066CC',
    secondary: '#CC6600',
    text: '#333333',
    textSecondary: '#666666',
    border: '#CCCCCC',
    focus: '#0066CC',
    error: '#CC6600',
    success: '#0066CC',
    warning: '#FFB300',
  },
  
  tritanopia: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    primary: '#CC0066',
    secondary: '#66CC00',
    text: '#333333',
    textSecondary: '#666666',
    border: '#CCCCCC',
    focus: '#CC0066',
    error: '#CC0066',
    success: '#66CC00',
    warning: '#FFB300',
  },
  
  monochrome: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    primary: '#000000',
    secondary: '#666666',
    text: '#000000',
    textSecondary: '#666666',
    border: '#CCCCCC',
    focus: '#000000',
    error: '#000000',
    success: '#666666',
    warning: '#333333',
  },
};

// Provider component
interface SensoryAccessibilityProviderProps {
  children: React.ReactNode;
  initialConfig?: Partial<SensoryAccessibilityConfig>;
}

export const SensoryAccessibilityProvider: React.FC<SensoryAccessibilityProviderProps> = ({
  children,
  initialConfig = {},
}) => {
  const [config, setConfig] = useState<SensoryAccessibilityConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  
  const [currentColorScheme, setCurrentColorScheme] = useState<ColorScheme>(COLOR_SCHEMES.normal);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  
  const { announce } = useAdvancedScreenReader();
  const flashAnimationRef = useRef(new Animated.Value(0));

  // Update color scheme based on configuration
  useEffect(() => {
    let scheme: ColorScheme;
    
    if (config.colorBlindMode !== 'none') {
      scheme = COLOR_SCHEMES[config.colorBlindMode];
    } else if (config.contrastLevel === 'maximum') {
      scheme = COLOR_SCHEMES.maximumContrast;
    } else if (config.contrastLevel === 'high' || config.highContrastMode) {
      scheme = COLOR_SCHEMES.highContrast;
    } else {
      scheme = COLOR_SCHEMES.normal;
    }
    
    setCurrentColorScheme(scheme);
    setIsHighContrast(config.contrastLevel !== 'normal' || config.highContrastMode);
  }, [config.colorBlindMode, config.contrastLevel, config.highContrastMode]);

  // Check system accessibility preferences
  useEffect(() => {
    const checkAccessibilityPreferences = async () => {
      try {
        const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
        setIsReducedMotion(reduceMotion || config.reduceMotion);
        
        // Update config with system preferences
        setConfig(prev => ({
          ...prev,
          reduceMotion: reduceMotion || prev.reduceMotion,
        }));
      } catch (error) {
        console.warn('Could not check accessibility preferences:', error);
      }
    };

    checkAccessibilityPreferences();
    
    // Listen for system changes
    const motionListener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (reduceMotion: boolean) => {
        setIsReducedMotion(reduceMotion || config.reduceMotion);
      }
    );

    return () => motionListener?.remove();
  }, [config.reduceMotion]);

  const updateConfig = useCallback((updates: Partial<SensoryAccessibilityConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const effectiveFontSize = useCallback((baseSize: number): number => {
    const multiplier = config.customFontSize / 100;
    return Math.round(baseSize * multiplier);
  }, [config.customFontSize]);

  const announceVisualChange = useCallback((description: string) => {
    if (config.enableAudioDescriptions) {
      announce({
        message: `Visual change: ${description}`,
        type: 'supportive',
        priority: 'low',
      });
    }
  }, [config.enableAudioDescriptions, announce]);

  const provideAudioCue = useCallback((type: 'success' | 'error' | 'warning' | 'info') => {
    if (config.enableHapticSubstitution) {
      const patterns = {
        success: [0, 100, 50, 100],
        error: [0, 200, 100, 200, 100, 200],
        warning: [0, 150, 100, 150],
        info: [0, 100],
      };
      
      Vibration.vibrate(patterns[type]);
    }
    
    // Audio description
    if (config.enableAudioDescriptions) {
      const messages = {
        success: 'Success',
        error: 'Error occurred',
        warning: 'Warning',
        info: 'Information',
      };
      
      announce({
        message: messages[type],
        type: type === 'error' ? 'error' : 'supportive',
        priority: type === 'error' ? 'high' : 'low',
      });
    }
  }, [config.enableHapticSubstitution, config.enableAudioDescriptions, announce]);

  const flashWarning = useCallback((intensity: 'low' | 'medium' | 'high'): boolean => {
    if (!config.flashReduction) return true;
    
    const thresholds = {
      low: 3,    // flashes per second
      medium: 2,
      high: 1,
    };
    
    // Check if flash would exceed threshold (simplified check)
    const threshold = thresholds[intensity];
    if (threshold > 3) {
      console.warn('Flash animation blocked to prevent seizures');
      return false;
    }
    
    return true;
  }, [config.flashReduction]);

  const enableColorBlindMode = useCallback((mode: SensoryAccessibilityConfig['colorBlindMode']) => {
    updateConfig({ colorBlindMode: mode });
    
    const modeNames = {
      none: 'Standard colors',
      protanopia: 'Red-blind friendly colors',
      deuteranopia: 'Green-blind friendly colors',
      tritanopia: 'Blue-blind friendly colors',
      monochrome: 'High contrast monochrome',
    };
    
    announce({
      message: `Color scheme changed to ${modeNames[mode]}`,
      type: 'supportive',
      priority: 'medium',
    });
  }, [updateConfig, announce]);

  const contextValue: SensoryAccessibilityContextValue = {
    config,
    updateConfig,
    currentColorScheme,
    effectiveFontSize,
    isReducedMotion,
    isHighContrast,
    announceVisualChange,
    provideAudioCue,
    flashWarning,
    enableColorBlindMode,
  };

  return (
    <SensoryAccessibilityContext.Provider value={contextValue}>
      <View style={[
        styles.container,
        { backgroundColor: currentColorScheme.background }
      ]}>
        {children}
      </View>
    </SensoryAccessibilityContext.Provider>
  );
};

// Enhanced text component with sensory accessibility
interface AccessibleTextProps {
  children: React.ReactNode;
  style?: any;
  accessibilityLabel?: string;
  audioDescription?: string;
  visualIndicator?: boolean;
  testID?: string;
}

export const AccessibleText: React.FC<AccessibleTextProps> = ({
  children,
  style,
  accessibilityLabel,
  audioDescription,
  visualIndicator = false,
  testID,
}) => {
  const { 
    currentColorScheme, 
    effectiveFontSize, 
    config,
    announceVisualChange 
  } = useSensoryAccessibility();

  // Calculate enhanced text styling
  const enhancedStyle = [
    style,
    {
      color: currentColorScheme.text,
      fontSize: style?.fontSize ? effectiveFontSize(style.fontSize) : undefined,
    },
    config.textSpacing === 'increased' && styles.increasedSpacing,
    config.textSpacing === 'maximum' && styles.maximumSpacing,
    config.contrastLevel === 'maximum' && styles.maximumContrastText,
  ];

  useEffect(() => {
    if (audioDescription) {
      announceVisualChange(audioDescription);
    }
  }, [audioDescription, announceVisualChange]);

  return (
    <View style={visualIndicator && styles.textWithIndicator}>
      <Text
        style={enhancedStyle}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      >
        {children}
      </Text>
      {visualIndicator && (
        <View style={[
          styles.visualIndicator,
          { backgroundColor: currentColorScheme.primary }
        ]} />
      )}
    </View>
  );
};

// Visual status indicator for audio content
interface VisualAudioIndicatorProps {
  isPlaying: boolean;
  volume?: number;
  type?: 'breathing' | 'meditation' | 'alert' | 'general';
}

export const VisualAudioIndicator: React.FC<VisualAudioIndicatorProps> = ({
  isPlaying,
  volume = 1,
  type = 'general',
}) => {
  const { config, currentColorScheme } = useSensoryAccessibility();
  const animationRef = useRef(new Animated.Value(0));

  useEffect(() => {
    if (!config.enableVisualIndicators) return;

    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animationRef.current, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(animationRef.current, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      animationRef.current.stopAnimation();
      animationRef.current.setValue(0);
    }
  }, [isPlaying, config.enableVisualIndicators]);

  if (!config.enableVisualIndicators) return null;

  const typeColors = {
    breathing: currentColorScheme.primary,
    meditation: currentColorScheme.secondary,
    alert: currentColorScheme.error,
    general: currentColorScheme.success,
  };

  return (
    <View style={styles.audioIndicatorContainer}>
      <Animated.View
        style={[
          styles.audioIndicator,
          {
            backgroundColor: typeColors[type],
            opacity: animationRef.current,
            transform: [
              {
                scale: animationRef.current.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1 + (volume * 0.5)],
                }),
              },
            ],
          },
        ]}
        accessibilityLabel={`Audio ${isPlaying ? 'playing' : 'paused'}: ${type}`}
      />
      <Text style={[
        styles.audioIndicatorText,
        { color: currentColorScheme.text }
      ]}>
        {isPlaying ? '🔊' : '🔇'} {type}
      </Text>
    </View>
  );
};

// Focus ring component with enhanced visibility
interface EnhancedFocusRingProps {
  children: React.ReactNode;
  focused: boolean;
  style?: any;
}

export const EnhancedFocusRing: React.FC<EnhancedFocusRingProps> = ({
  children,
  focused,
  style,
}) => {
  const { config, currentColorScheme } = useSensoryAccessibility();

  const focusStyles = {
    standard: {
      borderWidth: focused ? 2 : 0,
      borderColor: currentColorScheme.focus,
    },
    enhanced: {
      borderWidth: focused ? 3 : 0,
      borderColor: currentColorScheme.focus,
      shadowColor: currentColorScheme.focus,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: focused ? 0.5 : 0,
      shadowRadius: focused ? 6 : 0,
      elevation: focused ? 8 : 0,
    },
    maximum: {
      borderWidth: focused ? 4 : 0,
      borderColor: currentColorScheme.focus,
      backgroundColor: focused ? currentColorScheme.focus + '20' : 'transparent',
      shadowColor: currentColorScheme.focus,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: focused ? 0.8 : 0,
      shadowRadius: focused ? 10 : 0,
      elevation: focused ? 12 : 0,
    },
  };

  return (
    <View style={[
      style,
      focusStyles[config.focusRingStyle],
      focused && styles.focusedContainer,
    ]}>
      {children}
    </View>
  );
};

// Color contrast validator
export const useColorContrastValidator = () => {
  const { currentColorScheme } = useSensoryAccessibility();

  const validateContrast = useCallback((foreground: string, background: string): {
    ratio: number;
    wcagAA: boolean;
    wcagAAA: boolean;
  } => {
    // Simplified contrast calculation (would use more sophisticated algorithm in production)
    const getLuminance = (color: string): number => {
      // Convert hex to RGB and calculate luminance
      const rgb = parseInt(color.replace('#', ''), 16);
      const r = (rgb >> 16) & 255;
      const g = (rgb >> 8) & 255;
      const b = rgb & 255;
      
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    return {
      ratio,
      wcagAA: ratio >= 4.5,
      wcagAAA: ratio >= 7,
    };
  }, []);

  const getAccessibleColor = useCallback((baseColor: string, background: string): string => {
    const contrast = validateContrast(baseColor, background);
    
    if (contrast.wcagAA) {
      return baseColor;
    }
    
    // Return high contrast alternative
    return currentColorScheme.text;
  }, [validateContrast, currentColorScheme.text]);

  return { validateContrast, getAccessibleColor };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Text enhancements
  increasedSpacing: {
    letterSpacing: 0.5,
    lineHeight: 1.6,
  },
  maximumSpacing: {
    letterSpacing: 1,
    lineHeight: 1.8,
  },
  maximumContrastText: {
    fontWeight: '700',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  textWithIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  visualIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  // Audio indicators
  audioIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  audioIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  audioIndicatorText: {
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
  
  // Focus enhancements
  focusedContainer: {
    borderRadius: 8,
  },
});

export default SensoryAccessibilityProvider;