/**
 * Advanced Accessibility Components - Unified Export
 * 
 * WEEK 3 ACCESSIBILITY ENHANCEMENT SUITE:
 * Comprehensive accessibility support for diverse user needs while maintaining
 * therapeutic effectiveness and crisis safety requirements.
 * 
 * PERFORMANCE TARGETS:
 * - Crisis response: <200ms (accessibility overhead <50ms)
 * - Assessment loading: <300ms
 * - Screen reader responsiveness: <100ms
 * - Memory overhead: <10MB
 * 
 * COMPLIANCE LEVELS:
 * - WCAG 2.1 AA: Full compliance
 * - WCAG 2.1 AAA: Target for critical therapeutic content
 * - Crisis accessibility: Custom standards exceeding WCAG
 */

// Advanced Screen Reader Support
export {
  default as AdvancedScreenReaderProvider,
  useAdvancedScreenReader,
  useTherapeuticAnnouncements,
  LiveRegion,
} from './AdvancedScreenReader';
export type {
  AnnouncementType,
  AnnouncementPriority,
  AnnouncementConfig,
  AdvancedAnnouncementOptions,
  AdvancedScreenReaderContextValue,
} from './AdvancedScreenReader';

// Cognitive Accessibility
export {
  default as CognitiveAccessibilityProvider,
  useCognitiveAccessibility,
  SimplifiedInstruction,
  CognitiveLoadIndicator,
} from './CognitiveAccessibility';
export type {
  CognitiveConfig,
  CognitiveAccessibilityContextValue,
} from './CognitiveAccessibility';

// Motor Accessibility
export {
  default as MotorAccessibilityProvider,
  useMotorAccessibility,
  AccessiblePressable,
  VoiceControlIndicator,
  SwitchControlHelper,
  OneHandedLayout,
} from './MotorAccessibility';
export type {
  MotorAccessibilityConfig,
  MotorAccessibilityContextValue,
} from './MotorAccessibility';

// Sensory Accessibility
export {
  default as SensoryAccessibilityProvider,
  useSensoryAccessibility,
  AccessibleText,
  VisualAudioIndicator,
  EnhancedFocusRing,
  useColorContrastValidator,
} from './SensoryAccessibility';
export type {
  SensoryAccessibilityConfig,
  ColorScheme,
  SensoryAccessibilityContextValue,
} from './SensoryAccessibility';

// Crisis Intervention Accessibility
export {
  default as CrisisAccessibilityProvider,
  useCrisisAccessibility,
  UltraCrisisButton,
} from './CrisisAccessibility';
export type {
  CrisisAccessibilityConfig,
  CrisisState,
  CrisisAccessibilityContextValue,
} from './CrisisAccessibility';

// Accessibility Testing Framework
export {
  default as AccessibilityTester,
  AccessibilityTestingPanel,
} from './AccessibilityTesting';
export type {
  AccessibilityTestType,
  AccessibilityTestConfig,
  AccessibilityTestResult,
  AccessibilityIssue,
  AccessibilityReport,
} from './AccessibilityTesting';

// Performance Optimizations
export { default as AccessibilityPerformanceMonitor, PerformanceMonitorUI } from './AccessibilityPerformance';

// Unified Provider for all advanced accessibility features
export { AdvancedAccessibilityProvider } from './UnifiedProvider';