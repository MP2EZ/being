# Clinical Carousel Components

React Native implementation of the clinical carousel for Being. app, showcasing clinical tools, evidence-based outcomes, and early warning systems with professional-grade presentation and accessibility.

## Overview

The Clinical Carousel is a comprehensive component system designed specifically for mental health applications, featuring:

- **Clinical Assessment Tools**: PHQ-9/GAD-7 previews with interactive examples
- **Evidence-Based Outcomes**: MBCT effectiveness charts and relapse reduction data
- **Early Warning System**: AI-powered pattern recognition and intervention suggestions

## Architecture

### Component Hierarchy

```
ClinicalCarousel (Main)
├── ClinicalToolsPane
│   ├── PHQAssessmentPreview
│   ├── FeatureList
│   └── SecurityBadge
├── MBCTPracticesPane
│   ├── EvidenceChart
│   ├── BreathingExerciseVisual
│   └── ProgramBenefits
└── EarlyWarningPane
    ├── TimelineVisualization
    ├── PatternInsights
    └── TriggerInsights
```

### Core Features

- **useCarousel Hook**: State management with accessibility support
- **Error Boundary**: Graceful degradation for clinical contexts
- **Accessibility**: WCAG AA compliance with screen reader support
- **Performance**: 60fps animations, React.memo optimization
- **Clinical Accuracy**: Type-safe data structures for therapeutic content

## Usage

### Basic Implementation

```tsx
import React from 'react';
import { ClinicalCarousel, clinicalCarouselData } from '@/components/clinical';

export const ClinicalSection = () => {
  return (
    <ClinicalCarousel
      data={clinicalCarouselData}
      autoPlay={true}
      autoPlayInterval={8000}
      showNavigation={true}
      showIndicators={true}
      accessibilityLabel="Clinical Tools and Evidence Carousel"
    />
  );
};
```

### With Error Boundary

```tsx
import React from 'react';
import {
  ClinicalCarousel,
  ClinicalCarouselErrorBoundary,
  clinicalCarouselData
} from '@/components/clinical';

export const SafeClinicalSection = () => {
  return (
    <ClinicalCarouselErrorBoundary>
      <ClinicalCarousel
        data={clinicalCarouselData}
        onSlideChange={(index) => console.log('Slide:', index)}
      />
    </ClinicalCarouselErrorBoundary>
  );
};
```

### Custom Data

```tsx
import { ClinicalCarouselData } from '@/components/clinical';

const customData: ClinicalCarouselData[] = [
  {
    id: 'custom-assessment',
    title: 'Custom Assessment',
    subtitle: 'Tailored for your practice',
    content: {
      headline: 'Custom Clinical Tool',
      description: 'Specialized assessment for specific populations',
      bullets: ['Feature 1', 'Feature 2', 'Feature 3']
    },
    visual: {
      type: 'assessment',
      data: {
        score: 12,
        maxScore: 27,
        severity: 'Moderate',
        assessmentType: 'PHQ-9',
        interpretation: 'Moderate symptoms requiring attention'
      }
    },
    metrics: []
  }
];
```

## Component Props

### ClinicalCarousel

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `ClinicalCarouselData[]` | Required | Carousel content data |
| `autoPlay` | `boolean` | `true` | Enable automatic slide progression |
| `autoPlayInterval` | `number` | `8000` | Milliseconds between slides |
| `showNavigation` | `boolean` | `true` | Show previous/next buttons |
| `showIndicators` | `boolean` | `true` | Show slide indicators |
| `onSlideChange` | `(index: number) => void` | Optional | Slide change callback |
| `accessibilityLabel` | `string` | Optional | Carousel accessibility label |

### useCarousel Hook

```tsx
const {
  currentSlide,
  totalSlides,
  goToSlide,
  nextSlide,
  prevSlide,
  isAutoPlaying,
  pauseAutoPlay,
  resumeAutoPlay
} = useCarousel({
  totalSlides: 3,
  autoPlay: true,
  autoPlayInterval: 8000,
  onSlideChange: (index) => console.log(index),
  respectReducedMotion: true
});
```

## Data Types

### ClinicalCarouselData

```tsx
interface ClinicalCarouselData {
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
```

### Assessment Data

```tsx
interface AssessmentData {
  score: number;
  maxScore: number;
  severity: 'Minimal' | 'Mild' | 'Moderate' | 'Moderately Severe' | 'Severe';
  assessmentType: 'PHQ-9' | 'GAD-7';
  interpretation: string;
  questions?: AssessmentQuestion[];
}
```

## Accessibility Features

### WCAG AA Compliance

- **Color Contrast**: 4.5:1 minimum ratio for all text
- **Touch Targets**: 44px minimum for all interactive elements
- **Keyboard Navigation**: Full keyboard support with proper focus management
- **Screen Readers**: Comprehensive announcements and live regions
- **Reduced Motion**: Respects user motion preferences

### Screen Reader Support

```tsx
// Automatic announcements
AccessibilityInfo.announceForAccessibility(
  `Slide ${index + 1} of ${totalSlides} selected`
);

// Live regions for dynamic content
<View accessibilityLiveRegion="polite">
  {/* Dynamic content */}
</View>
```

## Performance Optimizations

### React.memo Usage

All components are wrapped with `React.memo` for optimal re-rendering:

```tsx
const ClinicalToolsPane = memo(({ data, isActive }) => {
  // Component implementation
});
```

### Animation Performance

- **60fps animations**: Optimized breathing circle and transitions
- **Native driver**: All animations use `useNativeDriver: true`
- **Conditional rendering**: Only active panes render complex animations

### Bundle Size Considerations

- **Tree-shakeable exports**: Import only needed components
- **SVG icons**: Lightweight vector graphics instead of images
- **Lazy loading**: Components render content only when active

## Clinical Validation

### Data Accuracy Requirements

- **PHQ-9/GAD-7**: 100% accurate scoring algorithms
- **Clinical Interpretations**: Validated by licensed clinicians
- **Evidence Citations**: All statistics source-referenced
- **HIPAA Considerations**: Privacy-by-design architecture

### Error Handling

```tsx
<ClinicalCarouselErrorBoundary
  onError={(error, errorInfo) => {
    // Report to monitoring service
    console.error('Clinical error:', error);
  }}
  fallback={<CustomErrorUI />}
>
  <ClinicalCarousel data={data} />
</ClinicalCarouselErrorBoundary>
```

## Testing

### Component Testing

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ClinicalCarousel } from '@/components/clinical';

test('clinical carousel navigation', () => {
  const { getByLabelText } = render(
    <ClinicalCarousel data={testData} />
  );

  const nextButton = getByLabelText('Next clinical pane');
  fireEvent.press(nextButton);

  // Assert slide change
});
```

### Accessibility Testing

```tsx
test('screen reader announcements', async () => {
  const mockAnnounce = jest.fn();
  AccessibilityInfo.announceForAccessibility = mockAnnounce;

  // Test implementation
  expect(mockAnnounce).toHaveBeenCalledWith(
    'Slide 2 of 3 selected'
  );
});
```

## Integration Examples

### Home Screen Integration

```tsx
import { ClinicalCarousel, clinicalCarouselData } from '@/components/clinical';

export const HomeScreen = () => {
  return (
    <ScrollView>
      <View style={styles.clinicalSection}>
        <Text style={styles.sectionTitle}>
          Clinical Tools You Can Trust
        </Text>
        <ClinicalCarousel
          data={clinicalCarouselData}
          autoPlay={true}
        />
      </View>
    </ScrollView>
  );
};
```

### Onboarding Flow

```tsx
export const OnboardingCarousel = () => {
  const [completedSlides, setCompletedSlides] = useState<number[]>([]);

  return (
    <ClinicalCarousel
      data={onboardingData}
      autoPlay={false}
      onSlideChange={(index) => {
        setCompletedSlides(prev => [...prev, index]);
      }}
    />
  );
};
```

## File Structure

```
components/clinical/
├── index.ts                           # Main exports
├── types.ts                          # TypeScript definitions
├── useCarousel.ts                    # Carousel hook
├── ClinicalCarousel.tsx              # Main component
├── ClinicalCarouselErrorBoundary.tsx # Error handling
├── ClinicalCarouselDemo.tsx          # Demo/example
├── clinicalCarouselData.ts           # Sample data
├── panes/
│   ├── ClinicalToolsPane.tsx         # Assessment tools
│   ├── MBCTPracticesPane.tsx         # MBCT outcomes
│   └── EarlyWarningPane.tsx          # Pattern recognition
└── components/
    ├── PHQAssessmentPreview.tsx      # Assessment preview
    ├── EvidenceChart.tsx             # Clinical charts
    ├── TimelineVisualization.tsx     # Timeline graphs
    ├── BreathingExerciseVisual.tsx   # Breathing animation
    ├── PatternInsights.tsx           # AI insights
    ├── ClinicalIcon.tsx              # Icon system
    └── [other components...]
```

## Development Guidelines

### Adding New Panes

1. Create component in `panes/` directory
2. Follow existing naming convention
3. Implement `ClinicalPaneProps` interface
4. Add to carousel pane renderer
5. Include comprehensive accessibility
6. Add error boundary support

### Clinical Content Guidelines

- All therapeutic language must be clinician-validated
- Statistical claims require source citations
- Assessment content must maintain clinical accuracy
- Error states must not disrupt therapeutic workflows

### Performance Requirements

- Carousel transitions: <300ms
- Breathing animations: Consistent 60fps
- Component mounting: <200ms
- Memory usage: Monitor for leaks
- Bundle impact: Track size increases

This implementation provides a production-ready clinical carousel system that meets Being.'s therapeutic standards while maintaining excellent performance and accessibility.