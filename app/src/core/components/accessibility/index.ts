/**
 * Accessibility Components - Unified Export
 *
 * Foundational (WCAG AA radio groups, focus management, screen reader support)
 * plus advanced accessibility (cognitive, motor, sensory, crisis-intervention)
 * providers and testing utilities.
 */

// === FOUNDATIONAL ACCESSIBILITY COMPONENTS ===
export { default as RadioGroup } from './RadioGroup';
export type { RadioOption, RadioGroupProps } from './RadioGroup';

// Import for local use and re-export
import FocusProviderDefault, {
  FocusProvider,
  Focusable,
  SkipLink,
  useFocusManager
} from './FocusManager';
export type { FocusContextValue } from './FocusManager';

// Import advanced components for local use
import { AdvancedAccessibilityProvider } from './advanced';

// Export with original names
export {
  FocusProvider,
  Focusable,
  SkipLink,
  useFocusManager,
  AdvancedAccessibilityProvider
};

// === ADVANCED ACCESSIBILITY COMPONENTS ===
export {
  useAdvancedAccessibilityStatus,
  
  // Advanced Screen Reader Support
  AdvancedScreenReaderProvider,
  useAdvancedScreenReader,
  useTherapeuticAnnouncements,
  LiveRegion,
  
  // Cognitive Accessibility
  CognitiveAccessibilityProvider,
  useCognitiveAccessibility,
  SimplifiedInstruction,
  CognitiveLoadIndicator,
  
  // Motor Accessibility
  MotorAccessibilityProvider,
  useMotorAccessibility,
  AccessiblePressable,
  VoiceControlIndicator,
  SwitchControlHelper,
  OneHandedLayout,
  
  // Sensory Accessibility
  SensoryAccessibilityProvider,
  useSensoryAccessibility,
  AccessibleText,
  VisualAudioIndicator,
  EnhancedFocusRing,
  useColorContrastValidator,
  
  // Crisis Accessibility
  CrisisAccessibilityProvider,
  useCrisisAccessibility,
  UltraCrisisButton,
  
  // Testing and Performance
  AccessibilityTester,
  AccessibilityTestingPanel,
  AccessibilityPerformanceMonitor,
} from './advanced';

export type {
  // Advanced Screen Reader Types
  AnnouncementType,
  AnnouncementPriority,
  AnnouncementConfig,
  AdvancedAnnouncementOptions,
  AdvancedScreenReaderContextValue,
  
  // Cognitive Accessibility Types
  CognitiveConfig,
  CognitiveAccessibilityContextValue,
  
  // Motor Accessibility Types
  MotorAccessibilityConfig,
  MotorAccessibilityContextValue,
  
  // Sensory Accessibility Types
  SensoryAccessibilityConfig,
  ColorScheme,
  SensoryAccessibilityContextValue,
  
  // Crisis Accessibility Types
  CrisisAccessibilityConfig,
  CrisisState,
  CrisisAccessibilityContextValue,
  
  // Testing Types
  AccessibilityTestType,
  AccessibilityTestConfig,
  AccessibilityTestResult,
  AccessibilityIssue,
  AccessibilityReport,
} from './advanced';

// === CONVENIENCE EXPORTS ===
// Re-export foundational components for convenience
export {
  FocusProvider as AccessibilityProvider,
  useFocusManager as useAccessibility,
  AdvancedAccessibilityProvider as ComprehensiveAccessibilityProvider,
};

// === DEFAULT EXPORTS ===
// For basic accessibility needs
export default FocusProviderDefault;

// For comprehensive accessibility (recommended for therapeutic apps)
export { AdvancedAccessibilityProvider as ComprehensiveAccessibility };