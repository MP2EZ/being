/**
 * Clinical Carousel Components Export
 *
 * Exports all clinical carousel components and utilities for React Native
 * implementation of Being. clinical tools presentation.
 */

// Main Components
export { default as ClinicalCarousel } from './ClinicalCarousel';
export { default as ClinicalCarouselErrorBoundary } from './ClinicalCarouselErrorBoundary';
export { default as ClinicalCarouselDemo } from './ClinicalCarouselDemo';
export { useCarousel } from './useCarousel';

// Sample Data
export { clinicalCarouselData, mockClinicalMetrics, mockFeatureFlags } from './clinicalCarouselData';

// Pane Components
export { ClinicalToolsPane } from './panes/ClinicalToolsPane';
export { MBCTPracticesPane } from './panes/MBCTPracticesPane';
export { EarlyWarningPane } from './panes/EarlyWarningPane';

// Sub-Components
export { PHQAssessmentPreview } from './components/PHQAssessmentPreview';
export { EvidenceChart } from './components/EvidenceChart';
export { TimelineVisualization } from './components/TimelineVisualization';
export { BreathingExerciseVisual } from './components/BreathingExerciseVisual';
export { ProgramBenefits } from './components/ProgramBenefits';
export { PatternInsights } from './components/PatternInsights';
export { TriggerInsights } from './components/TriggerInsights';
export { FeatureList } from './components/FeatureList';
export { SecurityBadge } from './components/SecurityBadge';
export { ClinicalIcon } from './components/ClinicalIcon';

// Types
export type {
  ClinicalCarouselData,
  ClinicalCarouselProps,
  ClinicalPaneProps,
  AssessmentData,
  ChartData,
  TimelineData,
  IntegrationData,
  ClinicalMetric,
  ClinicalInsight,
  UseCarouselReturn,
  ClinicalValidation,
  AccessibilityConfig
} from './types';