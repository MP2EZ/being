# Assessment Types - DRD-FLOW-005 Complete Type Safety

## Overview

This module provides comprehensive TypeScript type definitions for the DRD-FLOW-005 assessment system with complete type safety, crisis detection thresholds (PHQ≥20, GAD≥15), and 100% accurate scoring calculations.

## Architecture

```
types/
├── index.ts                 # Main exports and legacy types
├── components/
│   └── props.ts            # Enhanced component prop interfaces
├── store/
│   └── actions.ts          # Comprehensive store action types
├── navigation/
│   └── params.ts           # Navigation parameter types
├── crisis/
│   └── safety.ts           # Crisis intervention safety types
└── utils/
    └── scoring.ts          # Scoring calculation utility types
```

## Key Features

### 🔒 Crisis Safety Constraints
- **PHQ-9 Crisis Threshold**: Score ≥20 (immutable)
- **GAD-7 Crisis Threshold**: Score ≥15 (immutable)
- **Suicidal Ideation**: PHQ-9 Question 9 > 0 (immediate trigger)
- **Response Time**: Crisis intervention must display <200ms

### 📊 Clinical Accuracy
- 100% accurate scoring algorithms based on clinical standards
- Exact PHQ-9 implementation (Kroenke et al., 2001)
- Exact GAD-7 implementation (Spitzer et al., 2006)
- Comprehensive validation and error handling

### 🎯 Type Safety
- Strict TypeScript typing eliminates runtime errors
- Comprehensive prop interfaces for all components
- Store action types with crisis safety validation
- Navigation parameters with route guards

### ⚡ Performance Requirements
- Assessment rendering: <100ms
- Answer selection: <50ms
- Crisis intervention display: <200ms
- Scoring calculations: <50ms

## Usage Examples

### Component Props

```typescript
import { AssessmentQuestionProps, CrisisSafetyConstraints } from './types';

// Enhanced question component with strict typing
const AssessmentQuestion: React.FC<AssessmentQuestionProps> = ({
  question,
  currentAnswer,
  onAnswer,
  currentStep,
  totalSteps,
  // ... other props with full type safety
}) => {
  // Implementation with complete type safety
};
```

### Store Actions

```typescript
import { 
  AssessmentStoreActions, 
  TriggerCrisisInterventionAction,
  CRISIS_SAFETY_THRESHOLDS 
} from './types';

// Store with comprehensive action typing
const useAssessmentStore = create<AssessmentStoreState & AssessmentStoreActions>((set, get) => ({
  // Crisis intervention with safety constraints
  triggerCrisisIntervention: async (detection: CrisisDetection) => {
    // Must respond within 200ms
    const startTime = Date.now();
    
    // Type-safe crisis handling
    if (detection.detectionResponseTimeMs > CRISIS_SAFETY_THRESHOLDS.MAX_CRISIS_RESPONSE_TIME_MS) {
      throw new Error('Crisis response time exceeded safety threshold');
    }
    
    // Implementation...
  }
}));
```

### Navigation with Crisis Safety

```typescript
import { AssessmentStackParamList, isCrisisNavigationParams } from './types';

// Type-safe navigation with crisis checking
const AssessmentNavigator = () => {
  const navigation = useNavigation<NavigationProp<AssessmentStackParamList>>();
  
  const navigateToResults = (result: PHQ9Result | GAD7Result) => {
    // Crisis detection with type safety
    if (result.isCrisis) {
      navigation.navigate('CrisisIntervention', {
        detection: /* crisis detection object */,
        triggeringResult: result,
        sessionId: 'session_id',
        canDismiss: false
      });
    } else {
      navigation.navigate('AssessmentResults', {
        type: result.type,
        result,
        context: 'standalone'
      });
    }
  };
};
```

### Scoring with Clinical Validation

```typescript
import { 
  PHQ9ScoringFunction, 
  GAD7ScoringFunction,
  validateCrisisDetection,
  detectCrisis 
} from './types';

// Type-safe scoring implementation
const scorePHQ9: PHQ9ScoringFunction = (answers) => {
  // 100% accurate clinical algorithm
  const totalScore = answers.reduce((sum, answer) => sum + answer.response, 0);
  
  // Clinical severity determination
  const severity = calculatePHQ9Severity(totalScore);
  
  // Suicidal ideation check (Question 9)
  const q9Answer = answers.find(a => a.questionId === 'phq9_9');
  const suicidalIdeation = q9Answer?.response > 0;
  
  // Crisis detection
  const isCrisis = totalScore >= 20 || suicidalIdeation;
  
  return {
    totalScore,
    severity,
    isCrisis,
    suicidalIdeation,
    // ... complete result with validation
  };
};
```

## Clinical Standards

### PHQ-9 (Patient Health Questionnaire-9)
- **Source**: Kroenke, K., Spitzer, R. L., & Williams, J. B. (2001)
- **Questions**: 9 items measuring depression symptoms
- **Scoring**: 0-3 scale, total 0-27
- **Crisis Threshold**: ≥20 (severe depression)
- **Suicidal Ideation**: Question 9 > 0

### GAD-7 (Generalized Anxiety Disorder 7-item)
- **Source**: Spitzer, R. L., Kroenke, K., Williams, J. B., & Löwe, B. (2006)
- **Questions**: 7 items measuring anxiety symptoms  
- **Scoring**: 0-3 scale, total 0-21
- **Crisis Threshold**: ≥15 (severe anxiety)

### Severity Interpretations

#### PHQ-9 Severity Levels
- **Minimal**: 0-4
- **Mild**: 5-9  
- **Moderate**: 10-14
- **Moderately Severe**: 15-19
- **Severe**: 20-27 (Crisis threshold)

#### GAD-7 Severity Levels
- **Minimal**: 0-4
- **Mild**: 5-9
- **Moderate**: 10-14  
- **Severe**: 15-21 (Crisis threshold)

## Crisis Safety Protocol

### Immediate Triggers
1. **PHQ-9 Score ≥20**: Severe depression requiring intervention
2. **GAD-7 Score ≥15**: Severe anxiety requiring intervention  
3. **PHQ-9 Question 9 > 0**: Any suicidal ideation (immediate)

### Response Requirements
- **Detection Time**: <50ms after score calculation
- **Display Time**: <200ms from detection to intervention screen
- **No Dismissal**: Crisis intervention cannot be bypassed
- **988 Access**: Direct access to 988 Suicide & Crisis Lifeline

### Safety Validation
All crisis detection must pass `validateCrisisDetection()`:
- Response time verification
- Threshold validation  
- Algorithm accuracy check
- Safety constraint compliance

## Performance Guarantees

### Rendering Performance
- **Question Display**: <100ms
- **Answer Selection**: <50ms
- **Progress Updates**: <25ms
- **Navigation**: <500ms

### Calculation Performance  
- **Score Calculation**: <50ms
- **Crisis Detection**: <25ms
- **Validation**: <25ms
- **Results Generation**: <100ms

### Memory Usage
- **Scoring Engine**: <1MB
- **Type Definitions**: <100KB
- **Question Data**: <50KB
- **Session Storage**: <500KB

## Integration with Onboarding

This type system is designed for reusability in DRD-FLOW-001 onboarding:

```typescript
// Shared types across flows
import { AssessmentSession, PHQ9Result, GAD7Result } from '@/flows/assessment/types';

// Onboarding context support
const onboardingAssessment: AssessmentSession = {
  id: 'onboarding_session',
  type: 'phq9',
  progress: { /* ... */ },
  context: 'onboarding' // Type-safe context
};
```

## Development Guidelines

### Type Safety Rules
1. **No `any` types** in assessment system
2. **Strict null checks** for all crisis-related code
3. **Exhaustive switch statements** for assessment types
4. **Runtime validation** for all external data

### Crisis Safety Rules
1. **Immutable thresholds** - Never modify crisis score thresholds
2. **Response time validation** - All crisis responses must be <200ms
3. **Comprehensive testing** - 100% coverage for crisis detection
4. **Clinical accuracy** - Exact implementation of validated algorithms

### Performance Rules
1. **Memoization** for expensive calculations
2. **Lazy loading** for non-critical components
3. **Bundle optimization** for assessment modules
4. **Memory profiling** for session management

## Testing

### Required Tests
- **Scoring Accuracy**: 100% accuracy for all score combinations
- **Crisis Detection**: All threshold conditions and edge cases
- **Type Safety**: Compilation without errors/warnings
- **Performance**: All timing requirements met

### Test Coverage
- **PHQ-9**: 27 score combinations + suicidal ideation variants
- **GAD-7**: 21 score combinations + severity edge cases
- **Crisis**: All trigger conditions and response times
- **Navigation**: All route parameters and guards

## Migration Notes

### From Legacy Types
Legacy types are maintained for backward compatibility but marked for deprecation:

```typescript
// ❌ Legacy (deprecated)
import { AssessmentQuestionProps } from './types/index';

// ✅ Enhanced (recommended)  
import { AssessmentQuestionProps } from './types/components/props';
```

### Breaking Changes
- Enhanced prop interfaces require additional properties
- Store actions now return Promises for async operations
- Navigation params include additional safety validation
- Crisis detection requires user ID and response time tracking

## Support

For questions about clinical accuracy, crisis safety requirements, or type system implementation, refer to:

- **Clinical Validation**: `/docs/clinical/` 
- **Crisis Safety**: `/docs/security/crisis-safety.md`
- **Type System**: `/docs/technical/typescript-patterns.md`
- **Performance**: `/docs/technical/performance-requirements.md`