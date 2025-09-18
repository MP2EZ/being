# FullMind Dark Mode Theme System - TypeScript Types

## Overview

This comprehensive TypeScript type system provides clinical-grade dark mode implementation for the FullMind mental health platform. The system is designed with strict type safety, accessibility compliance (WCAG AA/AAA), performance optimization, and clinical safety requirements.

## Key Features

- **Clinical-Grade Safety**: Crisis response constraints, therapeutic color psychology, and MBCT compliance
- **Accessibility First**: WCAG AA/AAA compliant with 7:1 contrast ratios for crisis components
- **Performance Optimized**: <200ms transition times, 60fps animations, memory-efficient caching
- **Developer Experience**: Comprehensive IntelliSense, type guards, and debugging utilities
- **Runtime Safety**: Validation pipelines, error boundaries, and failsafe mechanisms

## Architecture

### Core Type System

```typescript
// Core theme modes and variants
type ThemeMode = 'light' | 'dark' | 'auto';
type ThemeVariant = 'morning' | 'midday' | 'evening';

// Complete theme configuration
interface ThemeConfig {
  mode: ThemeMode;
  variant: ThemeVariant;
  colors: VariantColorSystem;
  accessibility: AccessibilityRequirements;
  clinical: ClinicalThemeRequirements;
  performance: ThemePerformanceConstraints;
}
```

### Color System Architecture

The color system is structured around therapeutic time periods with full dark mode support:

```typescript
// Light and dark palettes for each therapeutic time period
interface VariantColorSystem {
  morning: ThemeColorSystem;  // Energizing (6am-12pm)
  midday: ThemeColorSystem;   // Focused (12pm-6pm)  
  evening: ThemeColorSystem;  // Calming (6pm-6am)
}

interface ThemeColorSystem {
  light: ColorPalette;
  dark: ColorPalette;
  clinical: ClinicalColorRequirements;
}
```

## Usage Examples

### Basic Theme Integration

```typescript
import { useTheme, ThemeMode, ThemeVariant } from '@/types';

function MyComponent() {
  const { 
    mode, 
    variant, 
    colors, 
    setMode, 
    toggleMode,
    clinical 
  } = useTheme();

  return (
    <div style={{ 
      backgroundColor: colors.background,
      color: colors.foreground 
    }}>
      <button onClick={toggleMode}>
        Switch to {mode === 'light' ? 'dark' : 'light'} mode
      </button>
    </div>
  );
}
```

### Clinical Component with Crisis Safety

```typescript
import { CrisisButtonThemeProps, useCrisisTheme } from '@/types';

interface CrisisButtonProps extends CrisisButtonThemeProps {
  onEmergency: () => void;
}

function CrisisButton({ onEmergency, crisisTheme }: CrisisButtonProps) {
  const { isActive, colors, responseTime, activate } = useCrisisTheme();
  
  // Ensure <200ms response time for crisis button
  const handleClick = useCallback(() => {
    const start = performance.now();
    activate().then(() => {
      const duration = performance.now() - start;
      if (duration > 200) {
        console.warn('Crisis response time exceeded 200ms:', duration);
      }
      onEmergency();
    });
  }, [activate, onEmergency]);

  return (
    <button
      onClick={handleClick}
      style={{
        backgroundColor: crisisTheme.background,
        color: crisisTheme.foreground,
        border: `2px solid ${crisisTheme.border}`,
        // 7:1 contrast ratio guaranteed for crisis components
      }}
      aria-label="Emergency crisis support - immediate help"
    >
      Crisis Support (988)
    </button>
  );
}
```

### Theme-Aware Component Factory

```typescript
import { ThemeComponentFactory, FullMindThemeProps } from '@/types';

const withTheme: ThemeComponentFactory<any> = (Component) => {
  return function ThemedComponent(props) {
    const theme = useTheme();
    
    return (
      <Component 
        {...props} 
        theme={theme.config}
        colors={theme.colors}
        clinical={theme.clinical}
      />
    );
  };
};

// Usage
const ThemedButton = withTheme(Button);
const ThemedCard = withTheme(Card);
```

### Performance Monitoring

```typescript
import { useThemePerformance } from '@/types';

function PerformanceMonitor() {
  const { 
    metrics, 
    isOptimal, 
    recommendations,
    measureNow,
    optimize 
  } = useThemePerformance({
    enableAutoOptimization: true,
    performanceThreshold: {
      transition: 200, // 200ms max for therapeutic UX
      render: 16,      // 16ms for 60fps
      memory: 5        // 5MB max
    }
  });

  useEffect(() => {
    if (!isOptimal) {
      console.warn('Theme performance below clinical standards');
      optimize();
    }
  }, [isOptimal, optimize]);

  return (
    <div>
      {metrics && (
        <div>
          <p>Transition Time: {metrics.transitionDuration}ms</p>
          <p>Render Time: {metrics.renderTime}ms</p>
          <p>Memory Usage: {metrics.memoryUsage}MB</p>
        </div>
      )}
      {recommendations.length > 0 && (
        <ul>
          {recommendations.map(rec => <li key={rec}>{rec}</li>)}
        </ul>
      )}
    </div>
  );
}
```

### Accessibility Validation

```typescript
import { useThemeAccessibility, AccessibilityLevel } from '@/types';

function AccessibilityValidator() {
  const { 
    validation, 
    level, 
    violations, 
    score,
    validate,
    fixViolation,
    getContrastRatio 
  } = useThemeAccessibility({
    autoValidate: true,
    includeColorBlindnessCheck: true,
    onViolationDetected: (violation) => {
      console.error('Accessibility violation:', violation);
    }
  });

  // Ensure crisis components meet 7:1 contrast
  const validateCrisisContrast = useCallback(() => {
    const ratio = getContrastRatio('#FF1744', '#000000');
    return ratio >= 7.0;
  }, [getContrastRatio]);

  return (
    <div>
      <h3>Accessibility Score: {score}/100</h3>
      <p>Compliance Level: {level}</p>
      {violations.length > 0 && (
        <div>
          <h4>Violations:</h4>
          {violations.map(violation => (
            <div key={violation}>
              <p>{violation}</p>
              <button onClick={() => fixViolation(violation)}>
                Auto-fix
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## File Structure

```
src/types/
├── theme.ts                 # Core theme type definitions
├── theme-utils.ts           # Utility types and helpers
├── theme-hooks.ts           # React hook type definitions
├── theme-components.ts      # Component integration types
├── theme-README.md          # This documentation
└── index.ts                 # Consolidated exports
```

## Type Categories

### Core Types (`theme.ts`)
- `ThemeMode`, `ThemeVariant` - Basic theme configuration
- `ColorPalette`, `ClinicalColorRequirements` - Color system
- `ThemeConfig`, `ValidatedThemeConfig` - Complete configuration
- `AccessibilityLevel`, `ContrastRequirements` - A11y compliance
- `CrisisResponseConstraints` - Safety requirements

### Utility Types (`theme-utils.ts`)
- Conditional types for theme-dependent styling
- Color manipulation and validation utilities
- Performance optimization patterns
- CSS-in-JS integration helpers
- Brand types for enhanced type safety

### Hook Types (`theme-hooks.ts`)
- `UseThemeReturn` - Main theme hook interface
- `UseThemeColorsReturn` - Lightweight color access
- `UseThemePerformanceReturn` - Performance monitoring
- `UseThemeAccessibilityReturn` - A11y validation
- `UseCrisisThemeReturn` - Crisis-safe theming

### Component Types (`theme-components.ts`)
- `FullMindThemeProps` - Base theme-aware props
- Component-specific theme integration (Button, Card, etc.)
- Clinical component theming (Crisis, Assessment, etc.)
- Layout and section theming

## Clinical Safety Requirements

### Crisis Components
- **Contrast Ratio**: Minimum 7:1 for all crisis elements
- **Response Time**: <200ms for crisis button interactions  
- **Color Safety**: No red backgrounds that could trigger anxiety
- **Focus Management**: Clear, high-contrast focus indicators

### Therapeutic Components
- **Color Psychology**: Calming blues/greens, avoid harsh reds/oranges
- **MBCT Compliance**: Colors support mindfulness practices
- **Breathing Space**: Optimized for 3-minute breathing exercises
- **Assessment Safety**: Neutral colors for PHQ-9/GAD-7 forms

### Performance Requirements
- **Transitions**: <200ms for therapeutic user experience
- **Animations**: 60fps minimum, respect `prefers-reduced-motion`
- **Memory Usage**: <5MB for theme-related code and state
- **Bundle Size**: <15KB for theme system

## Accessibility Standards

### WCAG Compliance
- **Level AA**: Minimum 4.5:1 contrast for normal text
- **Level AAA**: 7:1 contrast for therapeutic content
- **Color Blindness**: Full support for all types
- **Motion**: Respect `prefers-reduced-motion` preference

### Clinical Accessibility
- **Screen Readers**: Full compatibility with VoiceOver/NVDA
- **Keyboard Navigation**: Complete keyboard accessibility
- **Touch Targets**: Minimum 44px for interactive elements
- **Focus Management**: Clear focus rings, logical tab order

## Development Workflow

### 1. Type-First Development
```typescript
// Define component props with theme support first
interface MyComponentProps extends FullMindThemeProps {
  title: string;
  clinical?: boolean;
}

// Implementation follows type definition
function MyComponent({ title, clinical, ...themeProps }: MyComponentProps) {
  // TypeScript ensures all theme props are properly typed
}
```

### 2. Clinical Validation
```typescript
// All clinical components must use clinical validation
const clinicalProps: FullMindClinicalProps = {
  clinicalGrade: true,
  mbctCompliant: true,
  crisisSafeColors: true,
  therapeuticOptimization: true
};
```

### 3. Performance Monitoring
```typescript
// Enable performance monitoring in development
const themeConfig = {
  ...defaultConfig,
  performance: {
    enableMonitoring: process.env.NODE_ENV === 'development',
    strictMode: true
  }
};
```

## Migration Guide

### From Basic Theme to Clinical Grade

1. **Update Component Props**:
```typescript
// Before
interface ButtonProps {
  variant: 'primary' | 'secondary';
}

// After  
interface ButtonProps extends ButtonThemeProps {
  variant: 'primary' | 'secondary' | 'clinical' | 'crisis';
}
```

2. **Add Clinical Validation**:
```typescript
// Add clinical requirements
const clinicalButton: ClinicallyValidatedTheme<ButtonProps> = {
  ...buttonProps,
  __clinicallyValidated: true,
  __validationLevel: 'clinical',
  __safetyProfile: 'therapeutic'
};
```

3. **Performance Optimization**:
```typescript
// Enable memoization for performance
const MemoizedButton = React.memo(Button, (prev, next) => {
  return prev.theme?.version === next.theme?.version;
});
```

## Best Practices

### Type Safety
- Always use branded types for colors (`HexColor`)
- Leverage type guards for runtime validation
- Use conditional types for theme-dependent logic
- Prefer `readonly` arrays and objects for immutability

### Performance
- Use memoized selectors for computed theme values
- Implement proper cache invalidation strategies
- Monitor performance metrics in development
- Lazy load theme configurations when possible

### Clinical Safety
- Validate all clinical components with clinical hooks
- Ensure crisis components meet response time requirements
- Test with screen readers and assistive technologies
- Validate color combinations for accessibility

### Developer Experience
- Use the comprehensive type system for IntelliSense
- Leverage debugging utilities during development  
- Follow the established naming conventions
- Document custom theme extensions

## Testing Considerations

### Type Testing
```typescript
// Test type inference and constraints
expectType<ThemeMode>('light'); // ✅
expectType<ThemeMode>('invalid'); // ❌ TypeScript error
```

### Runtime Testing
```typescript
// Test clinical validation
test('crisis button meets response time requirements', async () => {
  const { result } = renderHook(() => useCrisisTheme());
  await act(async () => {
    const start = performance.now();
    await result.current.activate();
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(200);
  });
});
```

## Future Enhancements

- **Theme Builder UI**: Visual theme configuration tool
- **Advanced Analytics**: Theme usage and performance analytics
- **AI-Powered Optimization**: Automatic theme optimization
- **Multi-Language Support**: RTL and internationalization support
- **Advanced Animations**: Therapeutic micro-interactions

For questions or contributions, please refer to the main project documentation or open an issue in the repository.