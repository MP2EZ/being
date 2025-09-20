/**
 * Clinical Carousel Component Types
 *
 * These types define the data structures for the clinical carousel components,
 * ensuring type safety and clinical accuracy validation.
 */

import { ReactNode } from 'react';

export interface ClinicalCarouselData {
  id: string;
  title: string;
  subtitle: string;
  content: {
    headline: string;
    description: string;
    bullets: string[];
    callToAction?: {
      text: string;
      action: string;
    };
  };
  visual: ClinicalVisualData;
  metrics: ClinicalMetric[];
}

export interface ClinicalVisualData {
  type: 'assessment' | 'chart' | 'integration' | 'timeline';
  data: AssessmentData | ChartData | IntegrationData | TimelineData;
}

export interface AssessmentData {
  score: number;
  maxScore: number;
  severity: 'Minimal' | 'Mild' | 'Moderate' | 'Moderately Severe' | 'Severe';
  assessmentType: 'PHQ-9' | 'GAD-7';
  interpretation: string;
  questions?: AssessmentQuestion[];
}

export interface AssessmentQuestion {
  number: number;
  text: string;
  selectedOption: number;
  options: string[];
}

export interface ChartData {
  chartType: 'bar' | 'line' | 'pie';
  title: string;
  yAxisLabel?: string;
  timeframe?: string;
  dataPoints: DataPoint[];
  highlightValue?: {
    value: string;
    description: string;
  };
}

export interface DataPoint {
  label: string;
  value: number;
  color: string;
}

export interface IntegrationData {
  platforms: Platform[];
  exportFormats: ExportFormat[];
  features: string[];
}

export interface Platform {
  name: string;
  logo: string;
  supported: boolean;
}

export interface ExportFormat {
  type: string;
  description: string;
  icon: string;
}

export interface TimelineData {
  timeframe: string;
  dataPoints: TimelinePoint[];
  zones: MoodZone[];
  annotations?: TimelineAnnotation[];
}

export interface TimelinePoint {
  position: number; // 0-100 percentage
  mood: 'good' | 'moderate' | 'concerning';
  hasWarning?: boolean;
  warningType?: string;
}

export interface MoodZone {
  name: string;
  level: 'good' | 'moderate' | 'concerning';
}

export interface TimelineAnnotation {
  position: number;
  text: string;
  type: 'warning' | 'improvement' | 'pattern';
}

export interface ClinicalMetric {
  value: string;
  label: string;
  description: string;
  source: string;
}

export interface ClinicalInsight {
  icon: ReactNode;
  title: string;
  description: string;
  type: 'early-warning' | 'personalized' | 'intervention';
}

// Hook return types
export interface UseCarouselReturn {
  currentSlide: number;
  totalSlides: number;
  goToSlide: (index: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;
  isAutoPlaying: boolean;
  pauseAutoPlay: () => void;
  resumeAutoPlay: () => void;
}

// Component props interfaces
export interface ClinicalCarouselProps {
  data: ClinicalCarouselData[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showNavigation?: boolean;
  showIndicators?: boolean;
  onSlideChange?: (index: number) => void;
  accessibilityLabel?: string;
}

export interface ClinicalPaneProps {
  data: ClinicalCarouselData;
  isActive: boolean;
}

export interface AssessmentPreviewProps {
  data: AssessmentData;
  title: string;
  subtitle: string;
}

export interface EvidenceChartProps {
  data: ChartData;
  title: string;
}

export interface TimelineVisualizationProps {
  data: TimelineData;
  title: string;
}

export interface FeatureListProps {
  features: string[];
  icon?: ReactNode;
}

export interface InsightCardsProps {
  insights: ClinicalInsight[];
}

// Clinical content validation
export interface ClinicalValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Accessibility requirements
export interface AccessibilityConfig {
  announceSlideChanges: boolean;
  respectsReducedMotion: boolean;
  keyboardNavigation: boolean;
  minimumTouchTarget: number; // 44px minimum for crisis interactions
  colorContrastRatio: number; // 4.5:1 minimum for WCAG AA
}