# Feature Structure Guidelines

This document defines the standard structure and patterns for building features in the Being app.

## Standard Feature Layout

Every feature follows this consistent structure:

```
features/[feature-name]/
├── components/          # UI components specific to this feature
│   ├── [Component].tsx
│   └── index.ts        # Barrel export
├── screens/             # Full-screen views (if needed)
│   ├── [Screen].tsx
│   └── index.ts
├── services/            # Business logic and data operations
│   ├── [Service].ts
│   └── index.ts
├── stores/              # Zustand state management
│   ├── [feature]Store.ts
│   └── index.ts
├── types/               # TypeScript type definitions
│   ├── [types].ts
│   └── index.ts
├── hooks/               # React hooks (if needed)
│   ├── use[Hook].ts
│   └── index.ts
├── utils/               # Feature-specific utilities (if needed)
│   └── index.ts
└── index.ts             # Public API - exports what other features can use
```

## Example: Crisis Feature

```
features/crisis/
├── components/
│   ├── CrisisButton.tsx
│   ├── CrisisErrorBoundary.tsx
│   ├── CrisisAccessibility.tsx
│   └── index.ts
├── screens/
│   ├── CrisisResourcesScreen.tsx
│   ├── CrisisPlanScreen.tsx
│   └── index.ts
├── services/
│   ├── CrisisDetectionEngine.ts
│   ├── CrisisInterventionWorkflow.ts
│   ├── SuicidalIdeationProtocol.ts
│   └── index.ts
├── stores/
│   ├── crisisPlanStore.ts
│   └── index.ts
├── types/
│   ├── crisis.ts
│   ├── safety.ts
│   └── index.ts
├── hooks/
│   ├── useCrisisDetection.ts
│   └── index.ts
└── index.ts
```

## Public API Pattern

Each feature exports its public API through `index.ts`:

```typescript
// features/crisis/index.ts

// Public components
export { CrisisButton, CrisisErrorBoundary } from './components';

// Public screens
export { CrisisResourcesScreen, CrisisPlanScreen } from './screens';

// Public services
export { CrisisDetectionEngine, detectCrisis } from './services';

// Public hooks
export { useCrisisDetection } from './hooks';

// Public types
export type {
  CrisisDetection,
  CrisisSeverity,
  CrisisPlan
} from './types';

// Public store
export { useCrisisPlanStore } from './stores';
```

**Import from other features:**
```typescript
// ✅ Good - use public API
import { CrisisButton, useCrisisDetection } from '@/features/crisis';

// ❌ Bad - don't reach into internals
import { CrisisButton } from '@/features/crisis/components/CrisisButton';
```

## Feature Dependencies

### Allowed Dependencies

```
✅ features/[any] → core/*
✅ features/[any] → compliance/*
✅ features/[any] → analytics/*
✅ features/[any] → types/* (global types only)
```

### Discouraged Dependencies

```
⚠️  features/[feature-a] → features/[feature-b]
```

**When features need to communicate:**
- Use events (EventEmitter pattern)
- Use React Context from core/
- Use shared hooks from core/
- Emit analytics events
- Use navigation to pass data

**Example:**
```typescript
// ❌ Don't do this
import { assessmentStore } from '@/features/assessment';

// ✅ Do this instead
import { useNavigation } from '@react-navigation/native';

// Navigate and pass data
navigation.navigate('AssessmentFlow', {
  triggeredBy: 'crisis-detection'
});
```

### Forbidden Dependencies

```
❌ core/* → features/*
❌ types/* → features/*
```

## Domain Authority Features

Some features have special domain authority status and override technical decisions:

### Crisis Feature (Domain Authority: crisis)
- **Priority**: Highest (overrides ALL)
- **Performance**: <200ms detection required
- **Safety**: PHQ≥20, GAD≥15, Q9>0 detection
- **Special Rules**:
  - Crisis code must be easily auditable
  - Performance never compromised
  - Security protocols always enforced

### Assessment Feature (Domain Authority: philosopher + crisis)
- **Priority**: Critical (clinical accuracy required)
- **Accuracy**: 100% PHQ-9/GAD-7 scoring
- **Validation**: All 48 scoring combinations tested
- **Special Rules**:
  - Exact clinical wording required
  - Scoring algorithms locked down
  - Compliance validation required

### Learning Feature (Domain Authority: philosopher)
- **Priority**: High (philosophical accuracy)
- **Content**: Stoic Mindfulness principles
- **Validation**: Philosopher agent review
- **Special Rules**:
  - Classical source citations required
  - Philosophical integrity maintained

## Creating a New Feature

### Step 1: Create Directory Structure

```bash
mkdir -p src/features/[feature-name]/{components,screens,services,stores,types,hooks}
```

### Step 2: Create Barrel Exports

```bash
# Create index.ts in each directory
touch src/features/[feature-name]/components/index.ts
touch src/features/[feature-name]/services/index.ts
touch src/features/[feature-name]/stores/index.ts
touch src/features/[feature-name]/types/index.ts
touch src/features/[feature-name]/index.ts  # Main export
```

### Step 3: Update Path Aliases (tsconfig.json)

Usually not needed - `@/features/*` covers all features.

### Step 4: Document the Feature

Create `/docs/features/[feature-name].md`:

```markdown
# [Feature Name]

## Domain Authority
[crisis | compliance | philosopher | none]

## Responsibility
What this feature owns and manages.

## Public API
```typescript
// List exported types, components, hooks, services
```

## Dependencies
- Core: [what from core]
- Features: [what from other features, if any]
- Compliance: [what compliance requirements]

## Performance Requirements
[If any specific requirements]

## Testing Strategy
[How to test this feature]
```

### Step 5: Build the Feature

Follow the standard structure, implement functionality, export public API.

## Barrel Export Best Practices

### ✅ Do:
- Export only public-facing APIs
- Keep internal utilities private
- Use named exports (not default)
- Document what's exported and why

### ❌ Don't:
- Export everything
- Use default exports (use named exports)
- Export internal implementation details
- Create circular dependencies

## File Naming Conventions

### Components
```
PascalCase: CrisisButton.tsx, AssessmentQuestion.tsx
```

### Services
```
PascalCase: CrisisDetectionEngine.ts, AnalyticsService.ts
```

### Stores
```
camelCase: crisisPlanStore.ts, assessmentStore.ts
```

### Hooks
```
camelCase: useCrisisDetection.ts, useAssessmentPerformance.ts
```

### Types
```
camelCase: crisis.ts, assessment.ts, safety.ts
```

## Size Guidelines

### Keep Features Focused

A feature should be:
- **Cohesive**: Related functionality grouped together
- **Bounded**: Clear boundaries and responsibilities
- **Sized Right**: Not too large (>50 files) or too small (1-2 files)

### When to Split a Feature

Consider splitting when:
- Feature has >50 files
- Multiple distinct sub-domains
- Different domain authorities apply
- Different performance requirements

### When to Merge Features

Consider merging when:
- Features always used together
- Tight coupling between features
- Same domain authority
- Combined <30 files

## Testing

### Feature-Level Tests

Each feature should have:

```
features/[feature-name]/
└── __tests__/
    ├── components/
    │   └── [Component].test.tsx
    ├── services/
    │   └── [Service].test.ts
    ├── stores/
    │   └── [Store].test.ts
    └── integration/
        └── [feature]-flow.test.tsx
```

### Test Coverage Requirements

- **Crisis features**: 100% coverage (safety-critical)
- **Assessment features**: 100% coverage (clinical accuracy)
- **Other features**: 80% coverage minimum

## Anti-Patterns to Avoid

### ❌ Monolithic Features
Don't create a "god feature" that does everything.

### ❌ Shared Utils in Features
Don't put widely-used utilities in a feature. Move to `core/utils/`.

### ❌ Cross-Feature Direct Imports
Don't import directly from another feature's internals.

### ❌ Feature-Specific Types in Global Types
Don't put feature-specific types in `types/`. Keep in feature.

### ❌ Deep Nesting
Avoid deeply nested structures like `features/x/components/y/z/w/`. Keep flat.

## Migration from Old Structure

When moving code from old structure:

1. **Identify the feature**: What domain does this code belong to?
2. **Move related code together**: Components, services, stores, types all together
3. **Update imports**: Change to use `@/features/[feature]`
4. **Create barrel exports**: Export public API
5. **Test thoroughly**: Ensure nothing broke

## Questions?

Refer to:
- [Codebase Organization](./codebase-organization.md) - Overall structure
- [Import Guidelines](./import-guidelines.md) - Import patterns
- [Technical Patterns](./technical-patterns.md) - Implementation patterns
