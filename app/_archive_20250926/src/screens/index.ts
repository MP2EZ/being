/**
 * Screens Index - All application screens
 * Organized by category for easy navigation and imports
 */

// Home and Main Screens
export { default as HomeScreen } from './home/HomeScreen';
export { default as CheckInFlowScreen } from './home/CheckInFlowScreen';

// Standalone Core Journey Screens (Stage 4)
export * from './standalone';

// Authentication Screens
export { default as AuthenticationScreen } from './auth/AuthenticationScreen';
export { default as SignInScreen } from './auth/SignInScreen';
export { default as SignUpScreen } from './auth/SignUpScreen';
export { default as ForgotPasswordScreen } from './auth/ForgotPasswordScreen';

// Assessment Screens
export { default as AssessmentFlowScreen } from './assessment/AssessmentFlowScreen';
export { default as AssessmentResultsScreen } from './assessment/AssessmentResultsScreen';

// Crisis and Safety Screens
export { default as CrisisPlanScreen } from './crisis/CrisisPlanScreen';

// Profile and Settings Screens
export { default as ProfileScreen } from './profile/ProfileScreen';

// Payment and Subscription Screens
export { default as SubscriptionScreen } from './payment/SubscriptionScreen';
export { default as PaymentMethodScreen } from './payment/PaymentMethodScreen';
export { default as BillingHistoryScreen } from './payment/BillingHistoryScreen';
export { default as PaymentSettingsScreen } from './payment/PaymentSettingsScreen';

// Demo and Development Screens
export { default as SubscriptionIntegrationDemo } from './demo/SubscriptionIntegrationDemo';

// Onboarding Screens
export { default as OnboardingPlaceholder } from './onboarding/OnboardingPlaceholder';

// Simple Navigation Screens (Legacy)
export * from './simple';