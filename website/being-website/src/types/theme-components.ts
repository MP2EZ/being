/**
 * Being. Website - Theme Component Integration Types
 * TypeScript interfaces for theme-aware component integration
 * 
 * Features:
 * - Clinical-grade component theming
 * - Dark mode component support
 * - Accessibility-compliant styling
 * - Performance-optimized component patterns
 * - Crisis-safe component theming
 */

import type { ComponentProps, ReactNode } from 'react';
import type {
  ThemeMode,
  ThemeVariant,
  ColorPalette,
  ClinicalColorRequirements,
  AccessibilityLevel,
  ThemeConfig,
  HexColor,
} from './theme';

// Import from existing components type file for base props
import type { BaseComponentProps } from './components';

// ============================================================================
// CORE COMPONENT THEME INTEGRATION
// ============================================================================

/**
 * Theme-aware props base interface
 */
export interface ThemeAwareProps {
  readonly theme?: {
    readonly mode?: ThemeMode;
    readonly variant?: ThemeVariant;
    readonly forceColors?: Partial<ColorPalette>;
    readonly disableTransitions?: boolean;
    readonly accessibilityLevel?: AccessibilityLevel;
  };
}

/**
 * Clinical component theme integration
 */
export interface ClinicalThemeProps extends ThemeAwareProps {
  readonly clinicalGrade: boolean;
  readonly crisisMode?: boolean;
  readonly therapeuticOptimization?: boolean;
  readonly emergencyOverrides?: {
    readonly backgroundColor: string;
    readonly textColor: string;
    readonly borderColor: string;
  };
}

/**
 * Performance-optimized theme props
 */
export interface PerformanceThemeProps extends ThemeAwareProps {
  readonly enableMemoization?: boolean;
  readonly disableTransitions?: boolean;
  readonly useStaticColors?: boolean;
  readonly preloadStyles?: boolean;
}

/**
 * Enhanced theme-aware props for Being. components
 */
export interface BeingThemeProps extends ThemeAwareProps {
  readonly themeMode?: ThemeMode;
  readonly themeVariant?: ThemeVariant;
  readonly clinicalGrade?: boolean;
  readonly crisisMode?: boolean;
  readonly accessibilityLevel?: AccessibilityLevel;
  readonly therapeuticOptimization?: boolean;
  readonly colorOverrides?: Partial<ColorPalette>;
  readonly disableThemeTransitions?: boolean;
}

/**
 * Clinical component theme requirements for Being.
 */
export interface BeingClinicalProps extends ClinicalThemeProps {
  readonly mbctCompliant?: boolean;
  readonly phq9Optimized?: boolean;
  readonly gad7Optimized?: boolean;
  readonly crisisSafeColors?: boolean;
  readonly therapeuticTiming?: boolean;
  readonly breathingSpaceSupport?: boolean;
}

/**
 * Performance-aware theme props for Being.
 */
export interface Being.PerformanceProps extends PerformanceThemeProps {
  readonly clinicalFramerate?: boolean; // 60fps for therapeutic components
  readonly crisisResponseTime?: boolean; // <200ms response requirement
  readonly memoryOptimized?: boolean;
  readonly bundleOptimized?: boolean;
  readonly prefersPerformance?: boolean;
}

// ============================================================================
// LAYOUT COMPONENT THEMES
// ============================================================================

/**
 * Header component theme integration
 */
export interface HeaderThemeProps extends BeingThemeProps {
  readonly stickyTheme?: {
    readonly background: HexColor;
    readonly foreground: HexColor;
    readonly border: HexColor;
    readonly backdropBlur?: boolean;
  };
  readonly navigationTheme?: {
    readonly active: HexColor;
    readonly hover: HexColor;
    readonly focus: HexColor;
  };
  readonly ctaTheme?: {
    readonly primary: HexColor;
    readonly secondary: HexColor;
    readonly clinical: HexColor;
  };
}

/**
 * Footer component theme integration
 */
export interface FooterThemeProps extends BeingThemeProps {
  readonly variant?: 'default' | 'minimal' | 'clinical';
  readonly crisisResourcesTheme?: {
    readonly emergency: HexColor;
    readonly hotline: HexColor;
    readonly text: HexColor;
  };
  readonly newsletterTheme?: {
    readonly background: HexColor;
    readonly accent: HexColor;
  };
}

/**
 * Navigation component theme integration
 */
export interface NavigationThemeProps extends BeingThemeProps {
  readonly orientation?: 'horizontal' | 'vertical';
  readonly activeIndicator?: {
    readonly color: HexColor;
    readonly style: 'underline' | 'background' | 'border';
    readonly animation?: boolean;
  };
  readonly focusRing?: {
    readonly color: HexColor;
    readonly width: number;
    readonly offset: number;
  };
}

// ============================================================================
// CONTENT SECTION THEMES
// ============================================================================

/**
 * Hero section theme integration
 */
export interface HeroThemeProps extends BeingThemeProps {
  readonly backgroundGradient?: {
    readonly from: HexColor;
    readonly to: HexColor;
    readonly direction?: string;
  };
  readonly headlineTheme?: {
    readonly primary: HexColor;
    readonly secondary: HexColor;
    readonly emphasis: HexColor;
  };
  readonly ctaButtonTheme?: {
    readonly primary: { bg: HexColor; fg: HexColor };
    readonly secondary: { bg: HexColor; fg: HexColor };
    readonly clinical: { bg: HexColor; fg: HexColor };
  };
  readonly socialProofTheme?: {
    readonly background: HexColor;
    readonly text: HexColor;
    readonly accent: HexColor;
  };
}

/**
 * Features section theme integration
 */
export interface FeaturesThemeProps extends BeingThemeProps {
  readonly featureCardTheme?: {
    readonly background: HexColor;
    readonly border: HexColor;
    readonly hover: {
      readonly background: HexColor;
      readonly border: HexColor;
      readonly elevation?: number;
    };
  };
  readonly clinicalBadgeTheme?: {
    readonly validated: HexColor;
    readonly evidenceBased: HexColor;
    readonly researchBacked: HexColor;
  };
  readonly iconTheme?: {
    readonly primary: HexColor;
    readonly secondary: HexColor;
    readonly clinical: HexColor;
  };
}

/**
 * Clinical section theme integration
 */
export interface ClinicalThemeProps extends BeingThemeProps {
  readonly evidenceTheme?: {
    readonly studyCard: { bg: HexColor; border: HexColor };
    readonly metrics: HexColor;
    readonly citations: HexColor;
  };
  readonly validationTheme?: {
    readonly approved: HexColor;
    readonly pending: HexColor;
    readonly warning: HexColor;
  };
  readonly mbctTheme?: {
    readonly practice: HexColor;
    readonly meditation: HexColor;
    readonly awareness: HexColor;
  };
}

/**
 * Trust indicators theme integration
 */
export interface TrustIndicatorsThemeProps extends BeingThemeProps {
  readonly certificationTheme?: {
    readonly hipaa: HexColor;
    readonly clinical: HexColor;
    readonly security: HexColor;
  };
  readonly testimonialTheme?: {
    readonly quote: HexColor;
    readonly author: HexColor;
    readonly credentials: HexColor;
  };
  readonly metricsTheme?: {
    readonly value: HexColor;
    readonly label: HexColor;
    readonly trend: HexColor;
  };
}

// ============================================================================
// UI COMPONENT THEMES
// ============================================================================

/**
 * Button component theme integration
 */
export interface ButtonThemeProps extends BeingThemeProps {
  readonly variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'clinical' | 'crisis';
  readonly size?: 'sm' | 'md' | 'lg' | 'xl';
  readonly buttonTheme?: {
    readonly background: HexColor;
    readonly foreground: HexColor;
    readonly border: HexColor;
    readonly hover: { bg: HexColor; fg: HexColor };
    readonly active: { bg: HexColor; fg: HexColor };
    readonly disabled: { bg: HexColor; fg: HexColor };
    readonly focus: { ring: HexColor; ringOffset: number };
  };
  readonly loadingTheme?: {
    readonly spinner: HexColor;
    readonly background: HexColor;
  };
}

/**
 * Card component theme integration
 */
export interface CardThemeProps extends BeingThemeProps {
  readonly cardVariant?: 'default' | 'clinical' | 'feature' | 'testimonial';
  readonly cardTheme?: {
    readonly background: HexColor;
    readonly foreground: HexColor;
    readonly border: HexColor;
    readonly shadow: string;
    readonly hover?: {
      readonly background: HexColor;
      readonly border: HexColor;
      readonly shadow: string;
      readonly transform?: string;
    };
  };
  readonly headerTheme?: {
    readonly background: HexColor;
    readonly border: HexColor;
    readonly text: HexColor;
  };
}

/**
 * Modal component theme integration
 */
export interface ModalThemeProps extends BeingThemeProps {
  readonly modalVariant?: 'default' | 'clinical' | 'crisis';
  readonly overlayTheme?: {
    readonly background: string; // RGBA for transparency
    readonly backdropBlur?: boolean;
  };
  readonly contentTheme?: {
    readonly background: HexColor;
    readonly border: HexColor;
    readonly shadow: string;
    readonly borderRadius?: number;
  };
  readonly closeButtonTheme?: {
    readonly color: HexColor;
    readonly hoverColor: HexColor;
    readonly focusRing: HexColor;
  };
}

/**
 * Input component theme integration
 */
export interface InputThemeProps extends BeingThemeProps {
  readonly inputVariant?: 'default' | 'clinical' | 'assessment';
  readonly inputTheme?: {
    readonly background: HexColor;
    readonly foreground: HexColor;
    readonly border: HexColor;
    readonly placeholder: HexColor;
    readonly focus: {
      readonly border: HexColor;
      readonly ring: HexColor;
      readonly ringOffset: number;
    };
    readonly error: {
      readonly border: HexColor;
      readonly text: HexColor;
      readonly background: HexColor;
    };
    readonly success: {
      readonly border: HexColor;
      readonly text: HexColor;
    };
  };
  readonly labelTheme?: {
    readonly color: HexColor;
    readonly required: HexColor;
  };
}

// ============================================================================
// SPECIALIZED CLINICAL COMPONENTS
// ============================================================================

/**
 * Crisis button theme integration
 */
export interface CrisisButtonThemeProps extends BeingClinicalProps {
  readonly crisisTheme: {
    readonly background: HexColor;
    readonly foreground: HexColor;
    readonly border: HexColor;
    readonly shadow: string;
    readonly pulse?: {
      readonly color: HexColor;
      readonly duration: number;
    };
    readonly hover: {
      readonly background: HexColor;
      readonly transform?: string;
    };
    readonly active: {
      readonly background: HexColor;
      readonly scale?: number;
    };
    readonly focus: {
      readonly ring: HexColor;
      readonly ringWidth: number;
    };
  };
  readonly emergencyMode?: {
    readonly highContrast: boolean;
    readonly largerText: boolean;
    readonly strongerBorder: boolean;
  };
  readonly accessibilityEnhancements?: {
    readonly screenReaderText: string;
    readonly keyboardShortcut?: string;
    readonly voiceActivation?: boolean;
  };
}

/**
 * Assessment component theme integration
 */
export interface AssessmentThemeProps extends BeingClinicalProps {
  readonly assessmentType?: 'PHQ9' | 'GAD7' | 'custom';
  readonly assessmentTheme?: {
    readonly questionBackground: HexColor;
    readonly questionBorder: HexColor;
    readonly answerBackground: HexColor;
    readonly answerHover: HexColor;
    readonly answerSelected: HexColor;
    readonly progressBar: {
      readonly background: HexColor;
      readonly fill: HexColor;
      readonly text: HexColor;
    };
    readonly scoring: {
      readonly minimal: HexColor;
      readonly mild: HexColor;
      readonly moderate: HexColor;
      readonly severe: HexColor;
      readonly crisis: HexColor;
    };
  };
  readonly clinicalIndicators?: {
    readonly validated: HexColor;
    readonly caution: HexColor;
    readonly referral: HexColor;
  };
}

/**
 * Breathing space component theme integration
 */
export interface BreathingSpaceThemeProps extends BeingClinicalProps {
  readonly breathingTheme?: {
    readonly circleBackground: HexColor;
    readonly circleBorder: HexColor;
    readonly circleActive: HexColor;
    readonly textCalm: HexColor;
    readonly textFocus: HexColor;
    readonly textGentle: HexColor;
    readonly timerBackground: HexColor;
    readonly timerText: HexColor;
    readonly progressRing: HexColor;
  };
  readonly phaseThemes?: {
    readonly awareness: { primary: HexColor; secondary: HexColor };
    readonly gathering: { primary: HexColor; secondary: HexColor };
    readonly widening: { primary: HexColor; secondary: HexColor };
  };
  readonly animationTheme?: {
    readonly inhaleColor: HexColor;
    readonly exhaleColor: HexColor;
    readonly pauseColor: HexColor;
    readonly duration: number;
    readonly easing: string;
  };
}

// ============================================================================
// PERFORMANCE & ACCESSIBILITY COMPONENT THEMES
// ============================================================================

/**
 * Performance dashboard theme integration
 */
export interface PerformanceDashboardThemeProps extends Being.PerformanceProps {
  readonly metricsTheme?: {
    readonly good: HexColor;
    readonly needsImprovement: HexColor;
    readonly poor: HexColor;
    readonly background: HexColor;
    readonly border: HexColor;
  };
  readonly chartTheme?: {
    readonly line: HexColor;
    readonly area: HexColor;
    readonly grid: HexColor;
    readonly labels: HexColor;
  };
  readonly alertTheme?: {
    readonly warning: HexColor;
    readonly critical: HexColor;
    readonly info: HexColor;
  };
}

/**
 * Loading component theme integration
 */
export interface LoadingThemeProps extends BeingThemeProps {
  readonly loadingVariant?: 'spinner' | 'skeleton' | 'pulse' | 'clinical';
  readonly loadingTheme?: {
    readonly primary: HexColor;
    readonly secondary: HexColor;
    readonly background: HexColor;
    readonly shimmer?: HexColor;
  };
  readonly clinicalLoading?: {
    readonly therapeutic: boolean;
    readonly calming: boolean;
    readonly progressIndicator: boolean;
  };
}

/**
 * Error boundary theme integration
 */
export interface ErrorBoundaryThemeProps extends BeingThemeProps {
  readonly errorTheme?: {
    readonly background: HexColor;
    readonly foreground: HexColor;
    readonly border: HexColor;
    readonly accent: HexColor;
  };
  readonly clinicalError?: {
    readonly safeMode: boolean;
    readonly contactSupport: boolean;
    readonly preserveData: boolean;
  };
  readonly recoveryTheme?: {
    readonly button: { bg: HexColor; fg: HexColor };
    readonly link: HexColor;
    readonly message: HexColor;
  };
}

// ============================================================================
// ACCESSIBILITY COMPONENT THEMES
// ============================================================================

/**
 * Skip links theme integration
 */
export interface SkipLinksThemeProps extends BeingThemeProps {
  readonly skipLinkTheme?: {
    readonly background: HexColor;
    readonly foreground: HexColor;
    readonly border: HexColor;
    readonly focus: {
      readonly background: HexColor;
      readonly foreground: HexColor;
      readonly ring: HexColor;
    };
  };
  readonly positioning?: {
    readonly top: number;
    readonly left: number;
    readonly zIndex: number;
  };
}

/**
 * Screen reader announcement theme
 */
export interface ScreenReaderThemeProps extends BeingThemeProps {
  readonly announcementLevel?: 'polite' | 'assertive';
  readonly visualIndicator?: {
    readonly enabled: boolean;
    readonly color: HexColor;
    readonly position: 'top' | 'bottom' | 'inline';
  };
}

// ============================================================================
// DOWNLOAD & INTEGRATION COMPONENT THEMES
// ============================================================================

/**
 * Download buttons theme integration
 */
export interface DownloadButtonsThemeProps extends BeingThemeProps {
  readonly platformTheme?: {
    readonly ios: { bg: HexColor; fg: HexColor };
    readonly android: { bg: HexColor; fg: HexColor };
    readonly universal: { bg: HexColor; fg: HexColor };
  };
  readonly qrCodeTheme?: {
    readonly background: HexColor;
    readonly foreground: HexColor;
    readonly border: HexColor;
  };
  readonly previewTheme?: {
    readonly background: HexColor;
    readonly border: HexColor;
    readonly shadow: string;
  };
}

/**
 * Phone mockup theme integration
 */
export interface PhoneMockupThemeProps extends BeingThemeProps {
  readonly deviceTheme?: {
    readonly frame: HexColor;
    readonly screen: HexColor;
    readonly reflection: boolean;
    readonly shadow: string;
  };
  readonly appPreviewTheme?: {
    readonly background: HexColor;
    readonly statusBar: HexColor;
    readonly homeIndicator: HexColor;
  };
}

// ============================================================================
// TYPOGRAPHY COMPONENT THEMES
// ============================================================================

/**
 * Typography component theme integration
 */
export interface TypographyThemeProps extends BeingThemeProps {
  readonly typographyVariant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'caption' | 'clinical';
  readonly textTheme?: {
    readonly color: HexColor;
    readonly emphasis: HexColor;
    readonly muted: HexColor;
    readonly link: HexColor;
    readonly linkHover: HexColor;
  };
  readonly clinicalText?: {
    readonly validated: HexColor;
    readonly warning: HexColor;
    readonly therapeutic: HexColor;
  };
}

// ============================================================================
// COMPOUND COMPONENT THEME TYPES
// ============================================================================

/**
 * Section wrapper theme props
 */
export interface SectionThemeProps extends BeingThemeProps {
  readonly sectionVariant?: 'hero' | 'features' | 'clinical' | 'testimonials' | 'pricing';
  readonly backgroundTheme?: {
    readonly type: 'solid' | 'gradient' | 'pattern';
    readonly primary: HexColor;
    readonly secondary?: HexColor;
    readonly opacity?: number;
  };
  readonly spacingTheme?: {
    readonly padding: number;
    readonly margin: number;
    readonly responsive: boolean;
  };
}

/**
 * Container theme props
 */
export interface ContainerThemeProps extends BeingThemeProps {
  readonly containerVariant?: 'full' | 'contained' | 'clinical';
  readonly maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  readonly containerTheme?: {
    readonly background: HexColor;
    readonly border: HexColor;
    readonly shadow: string;
    readonly borderRadius: number;
  };
}

// ============================================================================
// THEME PROVIDER COMPONENT TYPES
// ============================================================================

/**
 * Theme provider component props
 */
export interface ThemeProviderComponentProps extends BaseComponentProps {
  readonly config?: Partial<ThemeConfig>;
  readonly defaultMode?: ThemeMode;
  readonly defaultVariant?: ThemeVariant;
  readonly enablePersistence?: boolean;
  readonly enablePerformanceMonitoring?: boolean;
  readonly enableAccessibilityValidation?: boolean;
  readonly enableClinicalValidation?: boolean;
  readonly onThemeChange?: (mode: ThemeMode, variant: ThemeVariant) => void;
  readonly onError?: (error: Error) => void;
  readonly children: ReactNode;
}

// ============================================================================
// UTILITY TYPES FOR COMPONENT INTEGRATION
// ============================================================================

/**
 * Extract theme props from component props
 */
export type ExtractThemeProps<T> = Pick<T, {
  [K in keyof T]: K extends `${string}Theme${string}` ? K : never;
}[keyof T]>;

/**
 * Merge component props with theme props
 */
export type WithThemeProps<T> = T & BeingThemeProps;

/**
 * Make all theme props optional
 */
export type OptionalThemeProps<T> = {
  [K in keyof T]?: T[K];
};

/**
 * Require specific theme props
 */
export type RequireThemeProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Component factory type for theme-aware components
 */
export type ThemeComponentFactory<TProps> = (
  Component: React.ComponentType<TProps>
) => React.ComponentType<TProps & BeingThemeProps>;

// ============================================================================
// EXPORTS
// ============================================================================

// Types are exported via interface/type declarations above