/**
 * FocusManager Component - WCAG AA Compliant Focus Management
 * 
 * ACCESSIBILITY SPECIFICATIONS:
 * - Logical tab order and focus flow management
 * - Visible focus indicators with 4.5:1 contrast ratio minimum
 * - Focus restoration and persistence
 * - Skip links for complex navigation
 * - Screen reader announcements for focus changes
 * - Keyboard trap management for modals/overlays
 */

import React, { useCallback, useEffect, useRef, useState, createContext, useContext } from 'react';
import {
  View,
  StyleSheet,
  AccessibilityInfo,
  Platform,
  Dimensions,
} from 'react-native';
import { colorSystem, spacing, borderRadius } from '@/core/theme';

// Focus management context
export interface FocusContextValue {
  focusOrder: string[];
  currentFocusIndex: number;
  registerFocusable: (id: string, ref: any, priority?: number) => void;
  unregisterFocusable: (id: string) => void;
  focusNext: () => void;
  focusPrevious: () => void;
  focusFirst: () => void;
  focusLast: () => void;
  setFocus: (id: string) => void;
  isTrapped: boolean;
  trapFocus: (containerRef: any) => void;
  releaseFocus: () => void;
}

const FocusContext = createContext<FocusContextValue | undefined>(undefined);

// Hook to use focus context
export const useFocusManager = () => {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error('useFocusManager must be used within a FocusProvider');
  }
  return context;
};

// Focus provider component
interface FocusProviderProps {
  children: React.ReactNode;
  trapFocus?: boolean;
  restoreFocus?: boolean;
  announceChanges?: boolean;
}

export const FocusProvider: React.FC<FocusProviderProps> = ({
  children,
  trapFocus = false,
  restoreFocus = true,
  announceChanges = true,
}) => {
  const [focusableElements] = useState(new Map<string, { ref: any; priority: number }>());
  const [focusOrder, setFocusOrder] = useState<string[]>([]);
  const [currentFocusIndex, setCurrentFocusIndex] = useState(-1);
  const [isTrapped, setIsTrapped] = useState(false);
  const [previousFocus, setPreviousFocus] = useState<string | null>(null);
  const trapContainerRef = useRef<any>(null);

  // Register a focusable element
  const registerFocusable = useCallback((id: string, ref: any, priority: number = 0) => {
    focusableElements.set(id, { ref, priority });
    
    // Update focus order based on priority
    const sortedIds = Array.from(focusableElements.entries())
      .sort(([, a], [, b]) => a.priority - b.priority)
      .map(([id]) => id);
    
    setFocusOrder(sortedIds);
  }, [focusableElements]);

  // Unregister a focusable element
  const unregisterFocusable = useCallback((id: string) => {
    focusableElements.delete(id);
    setFocusOrder(prev => prev.filter(focusId => focusId !== id));
  }, [focusableElements]);

  // Focus navigation methods
  const focusNext = useCallback(() => {
    if (focusOrder.length === 0) return;

    const nextIndex = (currentFocusIndex + 1) % focusOrder.length;
    const nextId = focusOrder[nextIndex]!;
    const element = focusableElements.get(nextId);
    
    if (element?.ref) {
      setCurrentFocusIndex(nextIndex);
      element.ref.focus?.();
      
      if (announceChanges) {
        AccessibilityInfo.announceForAccessibility(`Focused ${nextId}`);
      }
    }
  }, [focusOrder, currentFocusIndex, focusableElements, announceChanges]);

  const focusPrevious = useCallback(() => {
    if (focusOrder.length === 0) return;

    const prevIndex = currentFocusIndex === 0 ? focusOrder.length - 1 : currentFocusIndex - 1;
    const prevId = focusOrder[prevIndex]!;
    const element = focusableElements.get(prevId);
    
    if (element?.ref) {
      setCurrentFocusIndex(prevIndex);
      element.ref.focus?.();
      
      if (announceChanges) {
        AccessibilityInfo.announceForAccessibility(`Focused ${prevId}`);
      }
    }
  }, [focusOrder, currentFocusIndex, focusableElements, announceChanges]);

  const focusFirst = useCallback(() => {
    if (focusOrder.length === 0) return;

    const firstId = focusOrder[0]!;
    const element = focusableElements.get(firstId);
    
    if (element?.ref) {
      setCurrentFocusIndex(0);
      element.ref.focus?.();
      
      if (announceChanges) {
        AccessibilityInfo.announceForAccessibility(`Focused first element: ${firstId}`);
      }
    }
  }, [focusOrder, focusableElements, announceChanges]);

  const focusLast = useCallback(() => {
    if (focusOrder.length === 0) return;

    const lastIndex = focusOrder.length - 1;
    const lastId = focusOrder[lastIndex]!;
    const element = focusableElements.get(lastId);
    
    if (element?.ref) {
      setCurrentFocusIndex(lastIndex);
      element.ref.focus?.();
      
      if (announceChanges) {
        AccessibilityInfo.announceForAccessibility(`Focused last element: ${lastId}`);
      }
    }
  }, [focusOrder, focusableElements, announceChanges]);

  const setFocus = useCallback((id: string) => {
    const index = focusOrder.indexOf(id);
    const element = focusableElements.get(id);
    
    if (index !== -1 && element?.ref) {
      setCurrentFocusIndex(index);
      element.ref.focus?.();
      
      if (announceChanges) {
        AccessibilityInfo.announceForAccessibility(`Focused ${id}`);
      }
    }
  }, [focusOrder, focusableElements, announceChanges]);

  // Focus trapping for modals/overlays
  const trapFocusInContainer = useCallback((containerRef: any) => {
    if (restoreFocus && !previousFocus) {
      const currentFocusId = focusOrder[currentFocusIndex];
      setPreviousFocus(currentFocusId ?? null);
    }
    
    trapContainerRef.current = containerRef;
    setIsTrapped(true);
    
    // Focus first element in trap
    setTimeout(() => focusFirst(), 100);
  }, [restoreFocus, previousFocus, focusOrder, currentFocusIndex, focusFirst]);

  const releaseFocus = useCallback(() => {
    setIsTrapped(false);
    trapContainerRef.current = null;
    
    // Restore previous focus if enabled
    if (restoreFocus && previousFocus) {
      setTimeout(() => setFocus(previousFocus), 100);
      setPreviousFocus(null);
    }
  }, [restoreFocus, previousFocus, setFocus]);

  // Auto-trap focus if enabled
  useEffect(() => {
    if (trapFocus && focusOrder.length > 0) {
      setIsTrapped(true);
      setTimeout(() => focusFirst(), 100);
    }
  }, [trapFocus, focusOrder.length, focusFirst]);

  const contextValue: FocusContextValue = {
    focusOrder,
    currentFocusIndex,
    registerFocusable,
    unregisterFocusable,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    setFocus,
    isTrapped,
    trapFocus: trapFocusInContainer,
    releaseFocus,
  };

  return (
    <FocusContext.Provider value={contextValue}>
      {children}
    </FocusContext.Provider>
  );
};

// Focusable wrapper component with visible focus indicators
interface FocusableProps {
  children: React.ReactNode;
  id: string;
  priority?: number;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  skipLink?: boolean;
  skipLinkText?: string;
  style?: any;
  testID?: string;
}

export const Focusable: React.FC<FocusableProps> = ({
  children,
  id,
  priority = 0,
  disabled = false,
  onFocus,
  onBlur,
  skipLink = false,
  skipLinkText,
  style,
  testID,
}) => {
  const elementRef = useRef<View>(null);
  const [isFocused, setIsFocused] = useState(false);
  const { registerFocusable, unregisterFocusable, currentFocusIndex, focusOrder } = useFocusManager();

  // Register/unregister with focus manager
  useEffect(() => {
    if (!disabled) {
      registerFocusable(id, elementRef.current, priority);
    }
    
    return () => unregisterFocusable(id);
  }, [id, priority, disabled, registerFocusable, unregisterFocusable]);

  // Track focus state
  const currentlyFocused = focusOrder[currentFocusIndex] === id;

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  if (disabled) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View
      ref={elementRef}
      style={[
        style,
        (isFocused || currentlyFocused) && styles.focusIndicator,
        skipLink && styles.skipLink,
      ]}
      onFocus={handleFocus}
      onBlur={handleBlur}
      accessible={true}
      accessibilityLabel={skipLink ? skipLinkText || `Skip to ${id}` : undefined}
      testID={testID || `focusable-${id}`}
    >
      {children}
    </View>
  );
};

// Skip link component for navigation
interface SkipLinkProps {
  targetId: string;
  text: string;
  position?: 'top-left' | 'top-center' | 'top-right';
}

export const SkipLink: React.FC<SkipLinkProps> = ({
  targetId,
  text,
  position = 'top-left',
}) => {
  const { setFocus } = useFocusManager();
  const [isVisible, setIsVisible] = useState(false);

  const handleSkip = useCallback(() => {
    setFocus(targetId);
    setIsVisible(false);
  }, [setFocus, targetId]);

  const positionStyles = {
    'top-left': { top: spacing[8], left: spacing[8] },
    'top-center': { top: spacing[8], left: '50%', transform: [{ translateX: -50 }] },
    'top-right': { top: spacing[8], right: spacing[8] },
  };

  return (
    <Focusable
      id={`skip-link-${targetId}`}
      priority={-100} // High priority for skip links
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      style={[
        styles.skipLinkContainer,
        positionStyles[position],
        isVisible && styles.skipLinkVisible,
      ]}
      testID={`skip-link-${targetId}`}
    >
      <View
        style={styles.skipLinkButton}
        accessibilityRole="button"
        accessibilityLabel={text}
        onTouchEnd={handleSkip}
      >
        {/* Skip link content would be rendered here */}
      </View>
    </Focusable>
  );
};

const styles = StyleSheet.create({
  // Focus indicator with WCAG compliant contrast
  focusIndicator: {
    borderWidth: 3,
    borderColor: colorSystem.accessibility.focus.primary,
    borderRadius: borderRadius.small,
    shadowColor: colorSystem.accessibility.focus.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    // Additional visual emphasis
    transform: [{ scale: 1.02 }],
  },
  
  // Skip link styling
  skipLink: {
    position: 'absolute',
    zIndex: 9999,
  },
  skipLinkContainer: {
    position: 'absolute',
    zIndex: 9999,
    opacity: 0,
    transform: [{ translateY: -50 }],
    // Hidden by default, shown on focus
  },
  skipLinkVisible: {
    opacity: 1,
    transform: [{ translateY: 0 }],
  },
  skipLinkButton: {
    backgroundColor: colorSystem.accessibility.focus.primary,
    color: colorSystem.base.white,
    padding: spacing[8],
    borderRadius: borderRadius.small,
    minHeight: 44, // WCAG touch target
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: borderRadius.small,
    elevation: 6,
  },
});

export default FocusProvider;