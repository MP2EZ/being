/**
 * Being. Website - Component Type Definitions
 * Clinical-grade component interfaces with strict type safety
 */

import { ReactNode, ComponentProps, HTMLAttributes } from 'react';

// Forward declare types to avoid circular imports
export interface BaseComponentProps {
  readonly className?: string;
  readonly children?: ReactNode;
  readonly 'data-testid'?: string;
}

export type ThemeVariant = 'morning' | 'midday' | 'evening';

export interface ClinicalFeature {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly clinicalEvidence: string;
  readonly mbctCompliant: boolean;
  readonly accessibilityLevel: 'AA' | 'AAA';
}

export interface TherapeuticContent {
  readonly id: string;
  readonly type: 'assessment' | 'exercise' | 'educational' | 'crisis';
  readonly title: string;
  readonly description: string;
  readonly duration?: number; // in minutes
  readonly clinicalValidation: {
    readonly validated: boolean;
    readonly validatedBy: string;
    readonly validatedAt: Date;
  };
}

export interface CrisisResource {
  readonly id: string;
  readonly type: 'hotline' | 'text' | 'chat' | 'emergency';
  readonly name: string;
  readonly contact: string;
  readonly availability: string;
  readonly region: string;
}

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================

export interface HeaderProps extends BaseComponentProps {
  readonly currentTheme?: ThemeVariant;
  readonly sticky?: boolean;
  readonly showNavigation?: boolean;
  readonly ctaVariant?: 'download' | 'waitlist' | 'both' | 'none';
}

export interface FooterProps extends BaseComponentProps {
  readonly variant?: 'default' | 'minimal' | 'clinical';
  readonly showNewsletter?: boolean;
  readonly showSocial?: boolean;
  readonly showCrisisResources?: boolean;
}

export interface NavigationProps extends BaseComponentProps {
  readonly items: NavigationItem[];
  readonly orientation?: 'horizontal' | 'vertical';
  readonly variant?: 'primary' | 'secondary' | 'mobile';
  readonly activeSection?: string;
  readonly onNavigate?: (href: string) => void;
}

export interface NavigationItem {
  readonly label: string;
  readonly href: string;
  readonly description?: string;
  readonly icon?: ReactNode;
  readonly badge?: string;
  readonly external?: boolean;
  readonly clinicalRequired?: boolean;
}

// ============================================================================
// HERO & LANDING SECTIONS
// ============================================================================

export interface HeroSectionProps extends BaseComponentProps {
  readonly variant?: 'default' | 'clinical' | 'therapist';
  readonly theme: ThemeVariant;
  readonly headline: {
    readonly primary: string;
    readonly secondary?: string;
    readonly emphasis?: string;
  };
  readonly description: string;
  readonly ctaButtons: CTAButtonConfig[];
  readonly featuredImage?: {
    readonly src: string;
    readonly alt: string;
    readonly priority?: boolean;
  };
  readonly socialProof?: SocialProofData;
}

export interface CTAButtonConfig {
  readonly label: string;
  readonly variant: 'primary' | 'secondary' | 'outline' | 'clinical';
  readonly action: 'download' | 'waitlist' | 'contact' | 'demo' | 'external';
  readonly href?: string;
  readonly external?: boolean;
  readonly analytics?: string;
  readonly clinicalGate?: boolean;
}

export interface SocialProofData {
  readonly userCount?: number;
  readonly therapistCount?: number;
  readonly clinicalTrials?: number;
  readonly testimonials?: TestimonialPreview[];
}

export interface TestimonialPreview {
  readonly id: string;
  readonly quote: string;
  readonly author: {
    readonly name: string;
    readonly title: string;
    readonly credentials?: string;
    readonly avatar?: string;
  };
  readonly clinicalValidated: boolean;
}

// ============================================================================
// FEATURE SHOWCASE COMPONENTS
// ============================================================================

export interface FeatureSectionProps extends BaseComponentProps {
  readonly title: string;
  readonly description?: string;
  readonly features: ClinicalFeature[];
  readonly layout?: 'grid' | 'cards' | 'list' | 'showcase';
  readonly theme: ThemeVariant;
  readonly showClinicalBadges?: boolean;
  readonly expandable?: boolean;
}

export interface FeatureCardProps extends BaseComponentProps {
  readonly feature: ClinicalFeature;
  readonly variant?: 'default' | 'clinical' | 'compact';
  readonly interactive?: boolean;
  readonly showEvidence?: boolean;
  readonly onLearnMore?: (featureId: string) => void;
}

export interface ClinicalValidationBadgeProps extends BaseComponentProps {
  readonly level: 'validated' | 'evidence-based' | 'research-backed';
  readonly details?: string;
  readonly showTooltip?: boolean;
}

export interface AccessibilityBadgeProps extends BaseComponentProps {
  readonly level: 'AA' | 'AAA';
  readonly features: string[];
  readonly showDetails?: boolean;
}

// ============================================================================
// ASSESSMENT & CLINICAL COMPONENTS
// ============================================================================

export interface AssessmentPreviewProps extends BaseComponentProps {
  readonly assessmentType: 'PHQ9' | 'GAD7';
  readonly showQuestions?: boolean;
  readonly showScoring?: boolean;
  readonly interactive?: boolean;
  readonly clinicalContext?: boolean;
  readonly onStartAssessment?: () => void;
}

export interface ClinicalEvidenceProps extends BaseComponentProps {
  readonly studies: ClinicalStudy[];
  readonly layout?: 'cards' | 'list' | 'detailed';
  readonly showMetrics?: boolean;
  readonly expandable?: boolean;
}

export interface ClinicalStudy {
  readonly id: string;
  readonly title: string;
  readonly authors: string[];
  readonly journal: string;
  readonly year: number;
  readonly doi?: string;
  readonly abstract: string;
  readonly relevance: string;
  readonly keyFindings: string[];
  readonly sampleSize: number;
  readonly methodology: string;
}

export interface TherapeuticContentProps extends BaseComponentProps {
  readonly content: TherapeuticContent[];
  readonly preview?: boolean;
  readonly clinicalNotes?: boolean;
  readonly accessibilityInfo?: boolean;
  readonly onContentSelect?: (contentId: string) => void;
}

// ============================================================================
// CRISIS & SAFETY COMPONENTS
// ============================================================================

export interface CrisisSafetyBannerProps extends BaseComponentProps {
  readonly priority?: 'low' | 'medium' | 'high';
  readonly resources: CrisisResource[];
  readonly dismissible?: boolean;
  readonly sticky?: boolean;
  readonly emergencyAccess?: boolean;
}

export interface EmergencyContactProps extends BaseComponentProps {
  readonly type: 'banner' | 'modal' | 'sidebar';
  readonly showHotlines?: boolean;
  readonly showChat?: boolean;
  readonly showEmergency?: boolean;
  readonly accessibilityOptimized?: boolean;
}

export interface SafetyProtocolProps extends BaseComponentProps {
  readonly protocols: SafetyProtocol[];
  readonly userFacing?: boolean;
  readonly clinicalContext?: boolean;
}

export interface SafetyProtocol {
  readonly id: string;
  readonly trigger: string;
  readonly response: string;
  readonly escalation: string[];
  readonly timeframe: string;
  readonly resources: CrisisResource[];
}

// ============================================================================
// DOWNLOAD & APP INTEGRATION COMPONENTS
// ============================================================================

export interface AppDownloadProps extends BaseComponentProps {
  readonly variant?: 'hero' | 'section' | 'widget';
  readonly platform?: 'both' | 'ios' | 'android';
  readonly showQRCode?: boolean;
  readonly showPreview?: boolean;
  readonly trackingEnabled?: boolean;
  readonly customCTA?: string;
}

export interface PlatformDetectionProps extends BaseComponentProps {
  readonly showDetectedPlatform?: boolean;
  readonly fallbackPlatform?: 'ios' | 'android';
  readonly customMessages?: {
    readonly ios?: string;
    readonly android?: string;
    readonly desktop?: string;
  };
}

export interface AppPreviewProps extends BaseComponentProps {
  readonly screens: AppScreenPreview[];
  readonly interactive?: boolean;
  readonly theme: ThemeVariant;
  readonly showFeatures?: boolean;
  readonly autoPlay?: boolean;
}

export interface AppScreenPreview {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly image: {
    readonly src: string;
    readonly alt: string;
    readonly width: number;
    readonly height: number;
  };
  readonly feature?: string;
  readonly clinicalNote?: string;
}

// ============================================================================
// THERAPIST & PROFESSIONAL COMPONENTS
// ============================================================================

export interface TherapistPortalProps extends BaseComponentProps {
  readonly variant?: 'landing' | 'signup' | 'features';
  readonly showBenefits?: boolean;
  readonly showPricing?: boolean;
  readonly showTestimonials?: boolean;
  readonly clinicalFocus?: boolean;
}

export interface ProfessionalBenefitsProps extends BaseComponentProps {
  readonly benefits: ProfessionalBenefit[];
  readonly layout?: 'grid' | 'list' | 'cards';
  readonly showMetrics?: boolean;
  readonly clinicalEvidence?: boolean;
}

export interface ProfessionalBenefit {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly metrics?: {
    readonly value: string;
    readonly label: string;
    readonly source?: string;
  };
  readonly clinicalEvidence?: string;
  readonly icon?: ReactNode;
}

export interface TherapistSignupProps extends BaseComponentProps {
  readonly variant?: 'form' | 'wizard' | 'modal';
  readonly showVerification?: boolean;
  readonly showBenefits?: boolean;
  readonly onComplete?: (data: TherapistRegistrationData) => void;
}

export interface TherapistRegistrationData {
  readonly personalInfo: {
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
    readonly phone: string;
  };
  readonly credentials: {
    readonly license: string;
    readonly licenseState: string;
    readonly specialties: string[];
    readonly yearsExperience: number;
  };
  readonly practice: {
    readonly type: string;
    readonly name: string;
    readonly size: string;
  };
  readonly interests: string[];
}

// ============================================================================
// TESTIMONIAL & SOCIAL PROOF COMPONENTS
// ============================================================================

export interface TestimonialSectionProps extends BaseComponentProps {
  readonly testimonials: Testimonial[];
  readonly variant?: 'carousel' | 'grid' | 'featured';
  readonly showClinicalValidation?: boolean;
  readonly autoRotate?: boolean;
  readonly filterBy?: 'all' | 'users' | 'therapists' | 'researchers';
}

export interface Testimonial {
  readonly id: string;
  readonly type: 'user' | 'therapist' | 'researcher' | 'clinical';
  readonly quote: string;
  readonly author: {
    readonly name: string;
    readonly title?: string;
    readonly credentials?: string;
    readonly location?: string;
    readonly avatar?: string;
  };
  readonly context?: {
    readonly duration: string;
    readonly outcome?: string;
    readonly metrics?: Record<string, string>;
  };
  readonly clinicalValidation: {
    readonly validated: boolean;
    readonly reviewer?: string;
    readonly validatedAt?: string;
  };
  readonly featured: boolean;
}

export interface SocialProofMetricsProps extends BaseComponentProps {
  readonly metrics: SocialMetric[];
  readonly animated?: boolean;
  readonly showSources?: boolean;
  readonly clinicalFocus?: boolean;
}

export interface SocialMetric {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly description?: string;
  readonly source?: string;
  readonly clinicalValidated?: boolean;
  readonly trend?: 'up' | 'down' | 'stable';
  readonly icon?: ReactNode;
}

// ============================================================================
// FORM COMPONENTS
// ============================================================================

export interface ContactFormProps extends BaseComponentProps {
  readonly variant?: 'default' | 'clinical' | 'therapist';
  readonly showPriority?: boolean;
  readonly showUserType?: boolean;
  readonly onSubmit?: (data: ContactFormData) => Promise<void>;
  readonly onSuccess?: () => void;
  readonly onError?: (error: string) => void;
}

export interface ContactFormData {
  readonly name: string;
  readonly email: string;
  readonly userType: 'individual' | 'therapist' | 'organization' | 'press';
  readonly priority: 'low' | 'medium' | 'high' | 'urgent';
  readonly subject: string;
  readonly message: string;
  readonly clinicalContext?: boolean;
  readonly consentToContact: boolean;
}

export interface WaitlistFormProps extends BaseComponentProps {
  readonly variant?: 'minimal' | 'detailed';
  readonly showBenefits?: boolean;
  readonly showPosition?: boolean;
  readonly onJoin?: (data: WaitlistFormData) => Promise<void>;
}

export interface WaitlistFormData {
  readonly email: string;
  readonly userType: 'individual' | 'therapist';
  readonly interests: string[];
  readonly urgency: 'low' | 'medium' | 'high';
  readonly referralSource?: string;
  readonly notificationPreferences: {
    readonly productUpdates: boolean;
    readonly clinicalNews: boolean;
    readonly earlyAccess: boolean;
  };
}

export interface NewsletterSignupProps extends BaseComponentProps {
  readonly variant?: 'inline' | 'modal' | 'sidebar';
  readonly showInterests?: boolean;
  readonly clinicalFocus?: boolean;
  readonly onSubscribe?: (data: NewsletterData) => Promise<void>;
}

export interface NewsletterData {
  readonly email: string;
  readonly interests: ('product-updates' | 'research' | 'clinical-news' | 'community')[];
  readonly frequency: 'weekly' | 'biweekly' | 'monthly';
  readonly clinicalContent: boolean;
}

// ============================================================================
// MEDIA & CONTENT COMPONENTS
// ============================================================================

export interface VideoPlayerProps extends BaseComponentProps {
  readonly src: string;
  readonly poster?: string;
  readonly title: string;
  readonly description?: string;
  readonly autoPlay?: boolean;
  readonly controls?: boolean;
  readonly accessibility?: {
    readonly captions?: boolean;
    readonly transcript?: boolean;
    readonly audioDescription?: boolean;
  };
  readonly clinicalContext?: boolean;
}

export interface ImageGalleryProps extends BaseComponentProps {
  readonly images: GalleryImage[];
  readonly layout?: 'grid' | 'masonry' | 'carousel';
  readonly showCaptions?: boolean;
  readonly showThumbnails?: boolean;
  readonly accessibility?: {
    readonly altText: boolean;
    readonly keyboardNavigation: boolean;
    readonly screenReaderOptimized: boolean;
  };
}

export interface GalleryImage {
  readonly id: string;
  readonly src: string;
  readonly alt: string;
  readonly title?: string;
  readonly caption?: string;
  readonly clinicalContext?: string;
  readonly width: number;
  readonly height: number;
}

export interface ContentBlockProps extends BaseComponentProps {
  readonly title?: string;
  readonly content: string | ReactNode;
  readonly variant?: 'default' | 'clinical' | 'highlighted';
  readonly expandable?: boolean;
  readonly clinicalValidation?: boolean;
  readonly accessibilityLevel?: 'AA' | 'AAA';
}

// ============================================================================
// PERFORMANCE & ANALYTICS COMPONENTS
// ============================================================================

export interface PerformanceMonitorProps extends BaseComponentProps {
  readonly metrics: PerformanceMetric[];
  readonly showRealTime?: boolean;
  readonly clinicalGrade?: boolean;
  readonly onThresholdExceeded?: (metric: string, value: number) => void;
}

export interface PerformanceMetric {
  readonly name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP';
  readonly value: number;
  readonly threshold: number;
  readonly status: 'good' | 'needs-improvement' | 'poor';
  readonly timestamp: Date;
}

export interface AnalyticsProviderProps extends BaseComponentProps {
  readonly trackingId?: string;
  readonly enabled?: boolean;
  readonly respectDNT?: boolean;
  readonly clinicalCompliant?: boolean;
  readonly consentRequired?: boolean;
}

// ============================================================================
// ACCESSIBILITY COMPONENTS
// ============================================================================

export interface SkipNavigationProps extends BaseComponentProps {
  readonly links: SkipLink[];
  readonly showOnFocus?: boolean;
  readonly clinicalPriority?: boolean;
}

export interface SkipLink {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ScreenReaderAnnouncementProps extends BaseComponentProps {
  readonly message: string;
  readonly priority?: 'polite' | 'assertive';
  readonly clinicalContext?: boolean;
}

export interface FocusManagementProps extends BaseComponentProps {
  readonly trapFocus?: boolean;
  readonly returnFocus?: boolean;
  readonly restoreFocus?: boolean;
  readonly clinicalWorkflow?: boolean;
}

// ============================================================================
// ERROR & LOADING STATES
// ============================================================================

export interface ErrorBoundaryProps extends BaseComponentProps {
  readonly fallback?: ReactNode;
  readonly onError?: (error: Error, errorInfo: any) => void;
  readonly clinicalContext?: boolean;
  readonly showDetails?: boolean;
  readonly reportingEnabled?: boolean;
}

export interface LoadingStateProps extends BaseComponentProps {
  readonly variant?: 'spinner' | 'skeleton' | 'pulse' | 'clinical';
  readonly size?: 'sm' | 'md' | 'lg';
  readonly message?: string;
  readonly progress?: number;
  readonly clinical?: boolean;
}

export interface OfflineBannerProps extends BaseComponentProps {
  readonly persistent?: boolean;
  readonly showRetry?: boolean;
  readonly clinicalMessage?: string;
  readonly onRetry?: () => void;
}

// ============================================================================
// TYPE UTILITY HELPERS
// ============================================================================

export type ComponentWithTheme<T> = T & {
  readonly theme: ThemeVariant;
};

export type ClinicalComponent<T> = T & {
  readonly clinicalValidation: boolean;
  readonly accessibilityLevel: 'AA' | 'AAA';
  readonly clinicalContext?: boolean;
};

export type InteractiveComponent<T> = T & {
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly onClick?: () => void;
  readonly onFocus?: () => void;
  readonly onBlur?: () => void;
};

export type FormComponent<T> = T & {
  readonly required?: boolean;
  readonly error?: string;
  readonly helperText?: string;
  readonly validation?: boolean;
};

// Component prop extractors for better type inference
export type ExtractProps<T> = T extends React.ComponentType<infer P> ? P : never;
export type OmitChildren<T> = Omit<T, 'children'>;
export type RequireChildren<T> = T & { readonly children: ReactNode };

// Strict component interfaces for clinical safety
export type ClinicallyValidatedProps<T> = T & {
  readonly __clinicallyValidated: true;
  readonly validatedBy: string;
  readonly validatedAt: Date;
};

export type AccessibilityCompliantProps<T> = T & {
  readonly __accessibilityCompliant: 'AA' | 'AAA';
  readonly accessibilityFeatures: string[];
  readonly testedWith: string[];
};