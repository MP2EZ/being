# Being. Website - TypeScript Type Definitions

## Overview

This directory contains comprehensive TypeScript type definitions for the Being. website, designed to provide clinical-grade type safety and seamless integration with the React Native app ecosystem.

## Type Categories

### 1. Core Website Types (`index.ts`)
- **SiteConfig**: Website configuration and navigation
- **ClinicalFeature**: MBCT-compliant feature definitions
- **TherapeuticContent**: Validated therapeutic content types
- **PerformanceMetrics**: Core Web Vitals and UX metrics
- **AccessibilityFeature**: WCAG compliance specifications
- **SEOData**: Search engine optimization types

### 2. Component Types (`components.ts`)
Comprehensive type definitions for all website components with clinical validation:

#### Layout Components
- `HeaderProps`, `FooterProps`, `NavigationProps`
- Theme-aware, accessibility-compliant navigation

#### Hero & Landing
- `HeroSectionProps`, `CTAButtonConfig`, `SocialProofData`
- Therapeutic UX patterns and clinical validation

#### Feature Showcase
- `FeatureSectionProps`, `FeatureCardProps`, `ClinicalValidationBadgeProps`
- MBCT compliance and evidence-based features

#### Assessment Components
- `AssessmentPreviewProps`, `ClinicalEvidenceProps`
- PHQ-9/GAD-7 integration and clinical studies

#### Crisis & Safety
- `CrisisSafetyBannerProps`, `EmergencyContactProps`, `SafetyProtocolProps`
- Emergency response and crisis intervention

#### App Integration
- `AppDownloadProps`, `PlatformDetectionProps`, `AppPreviewProps`
- Seamless mobile app integration

#### Professional Features
- `TherapistPortalProps`, `ProfessionalBenefitsProps`
- Therapist onboarding and professional tools

#### Forms & Validation
- `ContactFormProps`, `WaitlistFormProps`, `NewsletterSignupProps`
- Clinical-grade form validation and data handling

### 3. App Integration (`integration.ts`, `app-bridge.ts`)
Types for seamless website-to-app integration:

#### Bridge Communication
- `AppBridgeMessage`, `AppBridgeResponse`
- Real-time communication between platforms

#### User Progress Sync
- `UserProgressSync`, `OnboardingStatus`, `ClinicalProfile`
- Cross-platform user state management

#### Assessment Integration
- `AssessmentHistory`, `AssessmentTrend`, `ClinicalInsight`
- Mental health assessment continuity

#### Crisis Integration
- `CrisisProtocolSync`, `SafetyPlan`, `EmergencyContact`
- Safety protocol synchronization

#### Therapist Portal
- `TherapistPatientSync`, `PatientSummary`, `TherapistPermissions`
- Professional oversight and patient monitoring

### 4. Performance Monitoring (`performance.ts`)
Clinical-grade performance monitoring with mental health UX requirements:

#### Core Web Vitals
- `WebVitalsMetrics`, `PerformanceThresholds`
- LCP, FID, CLS monitoring with clinical requirements

#### Clinical Performance
- `ClinicalPerformanceRequirements`, `TherapeuticUXMetrics`
- Crisis button response times, assessment flow optimization

#### Error Monitoring
- `ErrorMetrics`, `ClinicalError`, `JSError`
- Clinical flow error tracking and recovery

#### Resource Optimization
- `ResourceLoadingMetrics`, `CriticalResourcesStatus`
- Therapeutic content and emergency resource loading

### 5. Validation & Safety (`validation.ts`)
Comprehensive validation system for clinical data safety:

#### Validation Framework
- `ValidationSchema`, `ValidationResult`, `ClinicalValidationRequirement`
- Multi-layer validation with clinical oversight

#### Form Validation
- `FormValidationConfig`, `FormValidationState`
- Real-time validation with accessibility support

#### Data Transformation
- `DataTransformer`, `TransformationPipeline`
- Safe data processing with clinical audit trails

#### Type Safety Utilities
- Branded types: `EmailAddress`, `PhoneNumber`, `AssessmentScore`
- Clinical type guards and runtime validation

#### Clinical Validation
- `ClinicalValidator`, `RiskAssessment`, `TherapeuticValidationResult`
- MBCT compliance and clinical safety validation

## Key Features

### Clinical Safety
- **Strict Type Safety**: Zero-tolerance for runtime errors in clinical contexts
- **Crisis Detection**: Automatic type checking for crisis-threshold assessments
- **Clinical Validation**: Required validation for all therapeutic content
- **Audit Trails**: Complete tracking of clinical data transformations

### Accessibility Compliance
- **WCAG AA/AAA Types**: Enforced accessibility standards
- **Screen Reader Support**: Optimized type definitions for assistive technology
- **Keyboard Navigation**: Complete keyboard accessibility type coverage
- **Color Contrast**: Type-enforced contrast requirements

### Performance Requirements
- **Clinical Thresholds**: Crisis button <200ms, assessment navigation <300ms
- **Real-time Monitoring**: Continuous performance tracking
- **Error Recovery**: Graceful degradation with clinical safety preserved
- **Offline Capability**: Type-safe offline functionality

### Integration Safety
- **App Bridge Types**: Type-safe communication with React Native app
- **Data Synchronization**: Conflict resolution with clinical precedence
- **Version Compatibility**: Automatic version checking and migration
- **Cross-platform State**: Shared state types across web and mobile

## Usage Patterns

### Component Development
```typescript
import { FeatureCardProps, ClinicalFeature } from '@/types';

const FeatureCard: React.FC<FeatureCardProps> = ({ 
  feature, 
  variant = 'default',
  showEvidence = true 
}) => {
  // Type-safe component implementation
};
```

### Clinical Validation
```typescript
import { ValidationSchema, ClinicalValidator } from '@/types';

const assessmentSchema: ValidationSchema<AssessmentData> = {
  fields: [
    { 
      field: 'score', 
      type: 'number', 
      required: true,
      clinicalSensitive: true 
    }
  ],
  clinicalValidation: { required: true, riskAssessment: true }
};
```

### App Integration
```typescript
import { AppBridgeMessage, UserProgressSync } from '@/types';

const syncProgress = async (message: AppBridgeMessage) => {
  if (message.action === 'SYNC_PROGRESS') {
    // Type-safe progress synchronization
  }
};
```

### Performance Monitoring
```typescript
import { WebVitalsMetrics, ClinicalPerformanceRequirements } from '@/types';

const monitorClinicalPerformance = (metrics: WebVitalsMetrics) => {
  if (metrics.fid > CLINICAL_THRESHOLDS.CRISIS_BUTTON_MAX_RESPONSE) {
    // Alert: Crisis button response too slow
  }
};
```

## Type Safety Guarantees

### Runtime Safety
- **Type Guards**: Comprehensive runtime type checking
- **Branded Types**: Prevent mixing of similar but distinct values
- **Clinical Validation**: Required validation for sensitive data
- **Error Recovery**: Type-safe error handling and fallbacks

### Development Safety
- **Strict Mode**: All types require explicit typing
- **No Any Types**: Zero tolerance for `any` types in clinical contexts
- **Immutability**: All clinical data marked as `readonly`
- **Exhaustive Checking**: Union types require handling all cases

### Clinical Safety
- **Crisis Detection**: Automatic flagging of high-risk data
- **Validation Requirements**: Mandatory validation for clinical content
- **Audit Compliance**: Complete type coverage for audit requirements
- **Professional Oversight**: Types requiring clinical professional review

## Integration with Being. App

The type definitions are designed to mirror and extend the React Native app's type system:

- **Shared Core Types**: Common types imported from app ecosystem
- **Bridge Compatibility**: Seamless data exchange between platforms
- **Version Synchronization**: Automatic compatibility checking
- **Clinical Continuity**: Consistent clinical data handling across platforms

## Performance Considerations

- **Tree Shaking**: Types are exported for optimal bundling
- **Compile-time Safety**: Maximum safety with zero runtime overhead
- **Development Experience**: Rich IntelliSense and error reporting
- **Build Optimization**: Types support aggressive optimization

## Future Extensibility

The type system is designed for easy extension:

- **Modular Structure**: Easy to add new type categories
- **Backward Compatibility**: Versioned types for smooth upgrades
- **Clinical Extensions**: Framework for adding clinical specializations
- **Integration Points**: Clear interfaces for third-party integrations

## Best Practices

1. **Always Import Types**: Use explicit type imports
2. **Validate Clinical Data**: Always validate data with clinical implications
3. **Handle Errors Gracefully**: Use type-safe error handling
4. **Test Type Guards**: Verify runtime type checking
5. **Document Clinical Impact**: Note clinical implications in type definitions

## Support

For questions about type usage or clinical validation requirements, consult the clinical and technical documentation in the main Being. repository.