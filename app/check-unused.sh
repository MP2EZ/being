#!/bin/bash

# Files to check (excluding App.tsx, navigation files, and other known entry points)
files=(
  # Components
  "src/components/accessibility/AccessibleButton.tsx"
  "src/components/accessibility/AccessibleInput.tsx"
  "src/components/accessibility/FocusManager.tsx"
  "src/components/accessibility/RadioGroup.tsx"
  "src/components/accessibility/advanced/AccessibilityPerformance.tsx"
  "src/components/accessibility/advanced/AccessibilityTesting.tsx"
  "src/components/accessibility/advanced/AdvancedScreenReader.tsx"
  "src/components/accessibility/advanced/CognitiveAccessibility.tsx"
  "src/components/accessibility/advanced/CrisisAccessibility.tsx"
  "src/components/accessibility/advanced/MotorAccessibility.tsx"
  "src/components/accessibility/advanced/SensoryAccessibility.tsx"
  "src/components/accessibility/advanced/UnifiedProvider.tsx"
  "src/components/assessment/AssessmentIntegrationExample.tsx"
  "src/components/assessment/EnhancedAssessmentFlow.tsx"
  "src/components/assessment/EnhancedAssessmentQuestion.tsx"
  "src/components/AssessmentStatusBadge.tsx"
  "src/components/CelebrationToast.tsx"
  "src/components/crisis/CrisisErrorBoundary.tsx"
  "src/components/ErrorBoundary.tsx"
  "src/components/monitoring/ProductionDashboard.tsx"
  "src/components/NotificationTimePicker.tsx"
  "src/components/settings/CloudBackupSettings.tsx"
  "src/components/shared/BrainIcon.tsx"
  "src/components/subscription/FeatureGate.tsx"
  "src/components/subscription/PurchaseOptionsScreen.tsx"
  "src/components/subscription/SubscriptionStatusCard.tsx"
  "src/components/sync/SyncStatusIndicator.tsx"
  "src/components/ThresholdEducationModal.tsx"

  # Constants
  "src/constants/colors.ts"
  "src/constants/devMode.ts"
  "src/constants/therapeuticValues.ts"

  # Contexts
  "src/contexts/SimpleThemeContext.tsx"

  # Flow components
  "src/flows/assessment/components/AssessmentIntroduction.tsx"
  "src/flows/assessment/components/AssessmentProgress.tsx"
  "src/flows/assessment/components/AssessmentResults.tsx"
  "src/flows/shared/components/BodyAreaGrid.tsx"
  "src/flows/shared/components/BreathingCircle.tsx"
  "src/flows/shared/components/CollapsibleCrisisButton.tsx"
  "src/flows/shared/components/DreamJournal.tsx"
  "src/flows/shared/components/EmotionGrid.tsx"
  "src/flows/shared/components/EveningValueSlider.tsx"
  "src/flows/shared/components/FlowProgress.tsx"
  "src/flows/shared/components/NeedsGrid.tsx"
  "src/flows/shared/components/ResumeSessionModal.tsx"
  "src/flows/shared/components/SafetyButton.tsx"
  "src/flows/shared/components/ThoughtBubbles.tsx"
  "src/flows/shared/components/ThoughtPatternGrid.tsx"
  "src/flows/shared/components/Timer.tsx"
  "src/flows/shared/components/ValueSlider.tsx"

  # Hooks
  "src/hooks/useAssessmentPerformance.ts"

  # Screens
  "src/screens/AccountSettingsScreen.tsx"
  "src/screens/AppSettingsScreen.tsx"
  "src/screens/crisis/CrisisPlanScreen.tsx"
  "src/screens/crisis/CrisisResourcesScreen.tsx"
  "src/screens/ExercisesScreen.tsx"
  "src/screens/home/CleanHomeScreen.tsx"
  "src/screens/InsightsScreen.tsx"
  "src/screens/learn/LearnScreen.tsx"
  "src/screens/learn/ModuleDetailScreen.tsx"
  "src/screens/learn/tabs/OverviewTab.tsx"
  "src/screens/learn/tabs/PracticeTab.tsx"
  "src/screens/learn/tabs/ReflectTab.tsx"
  "src/screens/OnboardingScreen.tsx"
  "src/screens/ProfileScreen.tsx"
  "src/screens/VirtueDashboardScreen.tsx"

  # Services
  "src/services/analytics/AnalyticsService.ts"
  "src/services/compliance/HIPAAAssessmentIntegration.ts"
  "src/services/compliance/HIPAABreachResponseEngine.ts"
  "src/services/compliance/HIPAAComplianceEngine.ts"
  "src/services/compliance/HIPAAConsentManager.ts"
  "src/services/compliance/HIPAADataMinimization.ts"
  "src/services/crisis/CrisisAnalyticsService.ts"
  "src/services/crisis/CrisisDataManagement.ts"
  "src/services/crisis/CrisisDataMigration.ts"
  "src/services/crisis/CrisisDetectionEngine.ts"
  "src/services/crisis/CrisisIntegrationOrchestrator.ts"
  "src/services/crisis/CrisisInterventionWorkflow.ts"
  "src/services/crisis/CrisisMetricsReporting.ts"
  "src/services/crisis/CrisisPerformanceMonitor.ts"
  "src/services/crisis/PostCrisisSupportService.ts"
  "src/services/crisis/SuicidalIdeationProtocol.ts"
  "src/services/deployment/DeploymentService.ts"
  "src/services/deployment/rollback-validation.ts"
  "src/services/logging/ConsoleReplacementGuide.ts"
  "src/services/logging/ProductionLogger.ts"
  "src/services/logging/SecurityValidation.ts"
  "src/services/moduleContent.ts"
  "src/services/monitoring/CrisisMonitoringService.ts"
  "src/services/monitoring/ErrorMonitoringService.ts"
  "src/services/performance/AssessmentFlowOptimizer.ts"
  "src/services/performance/BundleOptimizer.ts"
  "src/services/performance/CrisisPerformanceOptimizer.ts"
  "src/services/performance/MemoryOptimizer.ts"
  "src/services/performance/PerformanceMonitor.ts"
  "src/services/performance/PerformanceValidator.ts"
  "src/services/performance/RenderingOptimizer.ts"
  "src/services/performance/ZustandStoreOptimizer.ts"
  "src/services/premeditationSafetyService.ts"
  "src/services/resilience/CircuitBreakerService.ts"
  "src/services/security/AuthenticationService.ts"
  "src/services/security/certificate-pinning.ts"
  "src/services/security/crisis/CrisisSecurityProtocol.ts"
  "src/services/security/EncryptionService.ts"
  "src/services/security/IncidentResponseService.ts"
  "src/services/security/NetworkSecurityService.ts"
  "src/services/security/SecureStorageService.ts"
  "src/services/security/SecurityMonitoringService.ts"
  "src/services/session/SessionStorageService.ts"
  "src/services/subscription/IAPService.ts"
  "src/services/supabase/CloudBackupService.ts"
  "src/services/supabase/ErrorHandler.ts"
  "src/services/supabase/hooks/useCloudSync.ts"
  "src/services/supabase/SupabaseService.ts"
  "src/services/supabase/SyncCoordinator.ts"

  # Stores
  "src/stores/crisisPlanStore.ts"
  "src/stores/educationStore.ts"
  "src/stores/settingsStore.ts"
  "src/stores/stoicPracticeStore.ts"
  "src/stores/subscriptionStore.ts"
  "src/stores/valuesStore.ts"

  # Types
  "src/types/compliance/hipaa.ts"
  "src/types/education.ts"
  "src/types/errors/recovery.ts"
  "src/types/flows.ts"
  "src/types/integration/components.ts"
  "src/types/integration/store.ts"
  "src/types/onboarding-core.ts"
  "src/types/performance/constraints.ts"
  "src/types/security/encryption.ts"
  "src/types/session.ts"
  "src/types/stoic.ts"
  "src/types/validation/typescript-config.ts"

  # Utils
  "src/utils/errorSanitization.ts"

  # Theme
  "src/theme/accessibility.ts"
)

echo "Checking for unused files..."
echo ""

unused_files=()

for file in "${files[@]}"; do
  # Extract the filename without extension for searching
  filename=$(basename "$file" | sed 's/\.[^.]*$//')

  # Search for imports of this file (excluding the file itself, test files)
  count=$(rg -l "from ['\"].*/$filename['\"]|from ['\"].*${filename}\.(ts|tsx)['\"]" /Users/max/Development/active/being/maint-79/app/src \
    --type-not json \
    --glob '!**/*.test.ts' \
    --glob '!**/*.test.tsx' \
    --glob "!$file" \
    2>/dev/null | wc -l)

  if [ "$count" -eq 0 ]; then
    unused_files+=("$file")
  fi
done

echo "Found ${#unused_files[@]} potentially unused files:"
echo ""

for file in "${unused_files[@]}"; do
  echo "$file"
done
