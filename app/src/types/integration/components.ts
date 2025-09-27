/**
 * Component Integration Types - Type-Safe React Native Components
 * Comprehensive prop interfaces for all crisis, compliance, and security components
 * 
 * INTEGRATION REQUIREMENTS:
 * - Type-safe component props with strict validation
 * - Performance-constrained render cycles (<16ms for 60fps)
 * - Crisis-aware component state management
 * - Accessibility-compliant prop interfaces
 * - HIPAA-compliant data handling in components
 * - Real-time state synchronization types
 * 
 * PERFORMANCE CONSTRAINTS:
 * - Component render: <16ms for 60fps
 * - State updates: <5ms for crisis components
 * - Event handlers: <1ms response time
 * - Memory usage: <10MB per component tree
 */

import { ReactNode, ComponentType } from 'react';
import { ViewStyle, TextStyle, ImageStyle, Animated } from 'react-native';
import { 
  CrisisDetection, 
  CrisisIntervention, 
  CrisisSeverityLevel,
  CrisisActionType,
  CrisisResource 
} from '../../flows/assessment/types/crisis/safety';
import { 
  HIPAAConsent, 
  ConsentStatus, 
  PHIClassification,
  DataProcessingPurpose 
} from '../compliance/hipaa';
import { 
  AuthenticationSession, 
  SecurityEvent, 
  BiometricType,
  AuthFactorStrength 
} from '../security/encryption';
import { 
  AssessmentType, 
  PHQ9Result, 
  GAD7Result, 
  AssessmentProgress 
} from '../../flows/assessment/types';

/**
 * Base Component Props
 */
export interface BaseComponentProps {
  /** Component accessibility label */
  accessibilityLabel?: string;
  /** Component accessibility hint */
  accessibilityHint?: string;
  /** Component accessibility role */
  accessibilityRole?: string;
  /** Component test ID for testing */
  testID?: string;
  /** Component style */
  style?: ViewStyle | TextStyle | ImageStyle;
  /** Component theme context */
  theme?: ComponentTheme;
  /** Performance monitoring enabled */
  performanceMonitoring?: boolean;
  /** Crisis context awareness */
  crisisContext?: CrisisComponentContext;
  /** HIPAA compliance context */
  hipaaContext?: HIPAAComponentContext;
  /** Security context */
  securityContext?: SecurityComponentContext;
}

/**
 * Component Theme
 */
export interface ComponentTheme {
  /** Theme mode */
  mode: 'light' | 'dark' | 'high_contrast' | 'crisis';
  /** Color palette */
  colors: ComponentColorPalette;
  /** Typography scale */
  typography: ComponentTypography;
  /** Spacing scale */
  spacing: ComponentSpacing;
  /** Animation settings */
  animations: ComponentAnimations;
  /** Accessibility enhancements */
  accessibility: ComponentAccessibility;
}

/**
 * Component Color Palette
 */
export interface ComponentColorPalette {
  /** Primary brand colors */
  primary: string;
  primaryLight: string;
  primaryDark: string;
  /** Secondary colors */
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  /** Background colors */
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  /** Text colors */
  text: string;
  textSecondary: string;
  textInverse: string;
  /** Status colors */
  success: string;
  warning: string;
  error: string;
  info: string;
  /** Crisis-specific colors */
  crisis: {
    moderate: string;
    high: string;
    critical: string;
    emergency: string;
  };
  /** HIPAA compliance colors */
  compliance: {
    compliant: string;
    warning: string;
    violation: string;
  };
  /** Security status colors */
  security: {
    secure: string;
    risk: string;
    threat: string;
  };
}

/**
 * Component Typography
 */
export interface ComponentTypography {
  /** Font families */
  fontFamily: {
    regular: string;
    medium: string;
    bold: string;
    monospace: string;
  };
  /** Font sizes */
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  /** Line heights */
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
  /** Letter spacing */
  letterSpacing: {
    tight: number;
    normal: number;
    wide: number;
  };
}

/**
 * Component Spacing
 */
export interface ComponentSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

/**
 * Component Animations
 */
export interface ComponentAnimations {
  /** Animation durations */
  duration: {
    fast: number;
    normal: number;
    slow: number;
  };
  /** Easing functions */
  easing: {
    linear: any;
    ease: any;
    easeIn: any;
    easeOut: any;
    easeInOut: any;
  };
  /** Crisis animation overrides */
  crisisOverrides: {
    reducedMotion: boolean;
    fasterTransitions: boolean;
  };
}

/**
 * Component Accessibility
 */
export interface ComponentAccessibility {
  /** Minimum touch target size */
  minTouchTarget: number;
  /** Color contrast ratios */
  contrastRatios: {
    normal: number;
    large: number;
    enhanced: number;
  };
  /** Screen reader optimizations */
  screenReader: {
    enabled: boolean;
    verboseDescriptions: boolean;
    skipRedundantInfo: boolean;
  };
  /** Motor accessibility */
  motor: {
    largerTargets: boolean;
    reduceGestures: boolean;
    alternativeInputs: boolean;
  };
}

/**
 * Crisis Component Context
 */
export interface CrisisComponentContext {
  /** Current crisis state */
  crisisActive: boolean;
  /** Crisis detection data */
  crisisDetection?: CrisisDetection;
  /** Crisis intervention state */
  intervention?: CrisisIntervention;
  /** Crisis response requirements */
  responseRequirements: {
    maxResponseTimeMs: number;
    requiresImmediateAction: boolean;
    escalationRequired: boolean;
  };
  /** Crisis accessibility enhancements */
  accessibilityEnhancements: {
    highContrastMode: boolean;
    largerText: boolean;
    reducedMotion: boolean;
    simplifiedInterface: boolean;
  };
}

/**
 * HIPAA Component Context
 */
export interface HIPAAComponentContext {
  /** PHI data types in component */
  phiTypes: PHIClassification[];
  /** Required consents for component */
  requiredConsents: ConsentStatus[];
  /** Data processing purposes */
  processingPurposes: DataProcessingPurpose[];
  /** Audit requirements */
  auditRequired: boolean;
  /** Encryption requirements */
  encryptionRequired: boolean;
  /** Access control level */
  accessLevel: 'public' | 'authenticated' | 'authorized' | 'restricted';
}

/**
 * Security Component Context
 */
export interface SecurityComponentContext {
  /** Authentication requirements */
  authRequired: boolean;
  /** Required authentication strength */
  requiredAuthStrength: AuthFactorStrength;
  /** Biometric requirements */
  biometricRequired: boolean;
  /** Session validation required */
  sessionValidationRequired: boolean;
  /** Security monitoring level */
  monitoringLevel: 'none' | 'basic' | 'enhanced' | 'real_time';
  /** Threat assessment */
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Crisis Button Component Props
 */
export interface CrisisButtonProps extends BaseComponentProps {
  /** Button variant */
  variant: 'primary' | 'secondary' | 'emergency' | 'minimal';
  /** Button size */
  size: 'small' | 'medium' | 'large' | 'full_width';
  /** Button state */
  state: 'enabled' | 'disabled' | 'loading' | 'success' | 'error';
  /** Crisis detection data */
  crisisDetection?: CrisisDetection;
  /** Emergency contact preference */
  emergencyContact: '988' | 'emergency_services' | 'personal_contact' | 'crisis_hotline';
  /** Button press handler */
  onPress: (contactMethod: string) => Promise<void>;
  /** Long press handler for additional options */
  onLongPress?: () => void;
  /** Loading state handler */
  onLoadingStateChange?: (loading: boolean) => void;
  /** Error state handler */
  onError?: (error: Error) => void;
  /** Performance tracking */
  performanceTracking: {
    trackResponseTime: boolean;
    maxResponseTimeMs: number;
    onPerformanceViolation?: (timeMs: number) => void;
  };
  /** Accessibility enhancements */
  accessibilityEnhancements: {
    hapticFeedback: boolean;
    voiceGuidance: boolean;
    highContrastMode: boolean;
    largerHitArea: boolean;
  };
  /** Animation preferences */
  animations: {
    pressAnimation: boolean;
    pulseAnimation: boolean;
    reduceMotion: boolean;
  };
}

/**
 * Default Component Settings
 */
export const DEFAULT_COMPONENT_SETTINGS = {
  /** Default performance constraints */
  PERFORMANCE_CONSTRAINTS: {
    MAX_RENDER_TIME_MS: 16,
    MAX_STATE_UPDATE_TIME_MS: 5,
    MAX_MEMORY_USAGE_MB: 10,
    TARGET_FPS: 60
  },
  /** Default accessibility settings */
  ACCESSIBILITY_SETTINGS: {
    MIN_TOUCH_TARGET: 44,
    CONTRAST_RATIO_NORMAL: 4.5,
    CONTRAST_RATIO_LARGE: 3.0,
    CONTRAST_RATIO_ENHANCED: 7.0
  },
  /** Crisis response requirements */
  CRISIS_REQUIREMENTS: {
    MAX_RESPONSE_TIME_MS: 200,
    MAX_BUTTON_RESPONSE_TIME_MS: 100,
    EMERGENCY_CONTACT_TIMEOUT_MS: 5000
  }
} as const;