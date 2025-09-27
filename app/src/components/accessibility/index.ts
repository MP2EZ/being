/**
 * Accessibility Components - Unified Export
 * 
 * WEEK 3 ENHANCED ACCESSIBILITY SYSTEM:
 * Comprehensive accessibility support for diverse user needs while maintaining
 * therapeutic effectiveness and crisis safety requirements.
 * 
 * FOUNDATIONAL COMPONENTS (Week 2):
 * - WCAG AA compliant radio groups with proper ARIA semantics
 * - Focus management and keyboard navigation
 * - Visible focus indicators with proper contrast ratios
 * - Screen reader support and announcements
 * 
 * ADVANCED FEATURES (Week 3):
 * - Advanced screen reader support with therapeutic context
 * - Cognitive accessibility for users with cognitive impairments
 * - Motor accessibility for users with limited mobility
 * - Sensory accessibility for hearing/vision impairments
 * - Crisis intervention accessibility with <200ms response
 * - Automated accessibility testing and validation
 * - Performance optimization maintaining crisis readiness
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