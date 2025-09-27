/**
 * Payment Accessibility Provider - Comprehensive WCAG AA Implementation
 *
 * ACCESSIBILITY REQUIREMENTS:
 * - WCAG 2.1 AA compliance for all payment interactions
 * - Crisis safety features accessible within 3 seconds
 * - Screen reader optimization for therapeutic content
 * - High contrast mode support for payment anxiety
 * - Cognitive accessibility for financial stress
 *
 * PERFORMANCE REQUIREMENTS:
 * - Screen reader announcements complete within 1 second
 * - Crisis button response <200ms including accessibility features
 * - Keyboard navigation between elements <100ms
 * - Voice control recognition <500ms for crisis features
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
} from 'react-native';
import { useCrisisPaymentSafety } from '../../store';

interface AccessibilityState {
  isScreenReaderEnabled: boolean;
  isHighContrastEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isVoiceControlEnabled: boolean;
  preferredFontSize: number;
  crisisAccessibilityMode: boolean;
}

interface AccessibilityActions {
  // Screen Reader Support
  announceForScreenReader: (message: string, priority?: 'polite' | 'assertive') => Promise<void>;
  setAccessibilityFocus: (component: React.RefObject<any>) => Promise<void>;

  // Crisis Accessibility
  activateCrisisAccessibility: (reason: string) => Promise<void>;
  announcePaymentError: (error: string, isRecoverable: boolean) => Promise<void>;

  // Form Accessibility
  announceFormProgress: (current: number, total: number) => Promise<void>;
  provideFormGuidance: (fieldName: string, errorMessage?: string) => Promise<void>;

  // Visual Accessibility
  getContrastRatio: (foreground: string, background: string) => number;
  ensureMinimumContrast: (color: string, background: string, minRatio?: number) => string;

  // Cognitive Accessibility
  simplifyPaymentLanguage: (message: string) => string;
  provideStepByStepGuidance: (step: number, totalSteps: number, instruction: string) => void;
}

interface PaymentAccessibilityContextType extends AccessibilityState, AccessibilityActions {}

const PaymentAccessibilityContext = createContext<PaymentAccessibilityContextType | null>(null);

export const usePaymentAccessibility = (): PaymentAccessibilityContextType => {
  const context = useContext(PaymentAccessibilityContext);
  if (!context) {
    throw new Error('usePaymentAccessibility must be used within PaymentAccessibilityProvider');
  }
  return context;
};

interface PaymentAccessibilityProviderProps {
  children: React.ReactNode;
}

export const PaymentAccessibilityProvider: React.FC<PaymentAccessibilityProviderProps> = ({ children }) => {
  const { crisisMode, enableCrisisMode } = useCrisisPaymentSafety();

  // Accessibility State
  const [accessibilityState, setAccessibilityState] = useState<AccessibilityState>({
    isScreenReaderEnabled: false,
    isHighContrastEnabled: false,
    isReduceMotionEnabled: false,
    isVoiceControlEnabled: false,
    preferredFontSize: 16,
    crisisAccessibilityMode: false,
  });

  // Performance tracking
  const performanceRef = useRef({
    lastAnnouncementTime: 0,
    focusChangeTime: 0,
    crisisActivationTime: 0,
  });

  // Initialize accessibility state
  useEffect(() => {
    const initializeAccessibility = async () => {
      try {
        const [
          screenReaderEnabled,
          reduceMotionEnabled,
        ] = await Promise.all([
          AccessibilityInfo.isScreenReaderEnabled(),
          AccessibilityInfo.isReduceMotionEnabled(),
        ]);

        const colorScheme = Appearance.getColorScheme();
        const highContrastEnabled = colorScheme === 'dark'; // Simplified detection

        setAccessibilityState(prev => ({
          ...prev,
          isScreenReaderEnabled: screenReaderEnabled,
          isHighContrastEnabled: highContrastEnabled,
          isReduceMotionEnabled: reduceMotionEnabled,
          crisisAccessibilityMode: crisisMode,
        }));

      } catch (error) {
        console.error('Failed to initialize accessibility state:', error);
      }
    };

    initializeAccessibility();

    // Listen for accessibility changes
    const screenReaderListener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (isEnabled) => {
        setAccessibilityState(prev => ({
          ...prev,
          isScreenReaderEnabled: isEnabled,
        }));
      }
    );

    const reduceMotionListener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isEnabled) => {
        setAccessibilityState(prev => ({
          ...prev,
          isReduceMotionEnabled: isEnabled,
        }));
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

  // Update crisis accessibility mode
  useEffect(() => {
    setAccessibilityState(prev => ({
      ...prev,
      crisisAccessibilityMode: crisisMode,
    }));
  }, [crisisMode]);

  // Screen Reader Support
  const announceForScreenReader = useCallback(async (
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      if (accessibilityState.isScreenReaderEnabled) {
        // Use assertive for crisis messages
        const isUrgent = priority === 'assertive' || accessibilityState.crisisAccessibilityMode;

        if (isUrgent) {
          AccessibilityInfo.announceForAccessibility(message);
        } else {
          // Polite announcements with delay to prevent overlap
          const timeSinceLastAnnouncement = startTime - performanceRef.current.lastAnnouncementTime;
          if (timeSinceLastAnnouncement < 1000) {
            await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastAnnouncement));
          }
          AccessibilityInfo.announceForAccessibility(message);
        }
      }

      const responseTime = Date.now() - startTime;
      performanceRef.current.lastAnnouncementTime = Date.now();

      if (responseTime > 1000) {
        console.warn(`Screen reader announcement exceeded 1s: ${responseTime}ms`);
      }

    } catch (error) {
      console.error('Screen reader announcement failed:', error);
    }
  }, [accessibilityState.isScreenReaderEnabled, accessibilityState.crisisAccessibilityMode]);

  const setAccessibilityFocus = useCallback(async (component: React.RefObject<any>): Promise<void> => {
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
        }
      }

      const responseTime = Date.now() - startTime;
      performanceRef.current.focusChangeTime = Date.now();

      if (responseTime > 200) {
        console.warn(`Accessibility focus change exceeded 200ms: ${responseTime}ms`);
      }

    } catch (error) {
      console.error('Failed to set accessibility focus:', error);
    }
  }, [accessibilityState.isScreenReaderEnabled]);

  // Crisis Accessibility
  const activateCrisisAccessibility = useCallback(async (reason: string): Promise<void> => {
    const startTime = Date.now();

    try {
      await enableCrisisMode(reason);

      setAccessibilityState(prev => ({
        ...prev,
        crisisAccessibilityMode: true,
      }));

      // Priority announcement for crisis activation
      await announceForScreenReader(
        'Crisis accessibility mode activated. All therapeutic features are now freely available. Emergency support is prioritized.',
        'assertive'
      );

      const responseTime = Date.now() - startTime;
      performanceRef.current.crisisActivationTime = Date.now();

      if (responseTime > 200) {
        console.warn(`Crisis accessibility activation exceeded 200ms: ${responseTime}ms`);
      }

    } catch (error) {
      console.error('Crisis accessibility activation failed:', error);

      // Fallback announcement
      await announceForScreenReader(
        'Crisis support is available. Call 988 for immediate assistance.',
        'assertive'
      );
    }
  }, [enableCrisisMode, announceForScreenReader]);

  const announcePaymentError = useCallback(async (error: string, isRecoverable: boolean): Promise<void> => {
    const therapeuticMessage = simplifyPaymentLanguage(
      isRecoverable
        ? `Payment issue detected: ${error}. This can be resolved. Take your time and remember - your worth isn't tied to payment status.`
        : `Payment challenge encountered: ${error}. Crisis support is available if this is causing stress.`
    );

    await announceForScreenReader(therapeuticMessage, isRecoverable ? 'polite' : 'assertive');
  }, [announceForScreenReader]);

  // Form Accessibility
  const announceFormProgress = useCallback(async (current: number, total: number): Promise<void> => {
    const progressMessage = `Payment form progress: Step ${current} of ${total}. Take your time - there's no pressure to rush.`;
    await announceForScreenReader(progressMessage);
  }, [announceForScreenReader]);

  const provideFormGuidance = useCallback(async (fieldName: string, errorMessage?: string): Promise<void> => {
    let guidance = `${fieldName} field selected.`;

    if (errorMessage) {
      guidance += ` ${simplifyPaymentLanguage(errorMessage)} This is easily correctable.`;
    } else {
      guidance += ' Enter your information when ready.';
    }

    await announceForScreenReader(guidance);
  }, [announceForScreenReader]);

  // Visual Accessibility
  const getContrastRatio = useCallback((foreground: string, background: string): number => {
    // Simplified contrast calculation
    const getLuminance = (color: string): number => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);

      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }, []);

  const ensureMinimumContrast = useCallback((
    color: string,
    background: string,
    minRatio: number = 4.5
  ): string => {
    const currentRatio = getContrastRatio(color, background);

    if (currentRatio >= minRatio) {
      return color;
    }

    // For crisis elements, use high contrast colors
    if (accessibilityState.crisisAccessibilityMode || minRatio >= 7.0) {
      return background === '#FFFFFF' ? '#000000' : '#FFFFFF';
    }

    // Otherwise, darken or lighten as needed
    return background === '#FFFFFF' ? '#1C1C1C' : '#FFFFFF';
  }, [getContrastRatio, accessibilityState.crisisAccessibilityMode]);

  // Cognitive Accessibility
  const simplifyPaymentLanguage = useCallback((message: string): string => {
    const simplifications: Record<string, string> = {
      'authentication': 'verification',
      'insufficient funds': 'not enough money available',
      'transaction declined': 'payment not accepted',
      'processing error': 'temporary issue',
      'invalid card': 'card information needs correction',
      'expired': 'card date needs updating',
      'authorization failed': 'bank security check needed',
    };

    let simplified = message;
    Object.entries(simplifications).forEach(([complex, simple]) => {
      simplified = simplified.replace(new RegExp(complex, 'gi'), simple);
    });

    return simplified;
  }, []);

  const provideStepByStepGuidance = useCallback((
    step: number,
    totalSteps: number,
    instruction: string
  ): void => {
    const guidance = `Step ${step} of ${totalSteps}: ${instruction}. Remember, you can take breaks anytime and crisis support is always available.`;
    announceForScreenReader(guidance);
  }, [announceForScreenReader]);

  const contextValue: PaymentAccessibilityContextType = {
    // State
    ...accessibilityState,

    // Actions
    announceForScreenReader,
    setAccessibilityFocus,
    activateCrisisAccessibility,
    announcePaymentError,
    announceFormProgress,
    provideFormGuidance,
    getContrastRatio,
    ensureMinimumContrast,
    simplifyPaymentLanguage,
    provideStepByStepGuidance,
  };

  return (
    <PaymentAccessibilityContext.Provider value={contextValue}>
      {children}
    </PaymentAccessibilityContext.Provider>
  );
};

export default PaymentAccessibilityProvider;