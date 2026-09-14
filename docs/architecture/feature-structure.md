# Feature Structure Guidelines

This document defines the standard structure and patterns for building features in the Being app.

## Standard Feature Layout

Every feature follows this consistent structure:

```
features/[feature-name]/
├── components/          # UI components specific to this feature
│   ├── [Component].tsx
│   └── index.ts         # OPTIONAL directory barrel, selective (see below)
├── screens/             # Full-screen views (if needed)
│   └── [Screen].tsx
├── services/            # Business logic and data operations
│   └── [Service].ts
├── stores/              # Zustand state management
│   └── [feature]Store.ts
├── types/               # TypeScript type definitions
│   └── [types].ts
├── constants/           # Feature constants (if needed)
│   └── [constants].ts
└── utils/               # Feature-specific utilities (if needed)
    └── [util].ts
```

**There is no feature-level `index.ts`.** MAINT-599 and MAINT-600 removed the last of
them: each sat at zero importers while its `export *` put the whole feature on the
eager module graph of anyone who adopted it (FEAT-376). Import the module you need,
by path — see [Import Guidelines](./import-guidelines.md).

## Example: Crisis Feature

The actual tree, as of MAINT-600:

```
features/crisis/
├── components/
│   ├── CollapsibleCrisisButton.tsx
│   ├── CrisisErrorBoundary.tsx
│   ├── CrisisKeyboardAccessory.tsx
│   ├── CrisisTextInput.tsx
│   ├── RootCrisisBoundary.tsx
│   ├── RootCrisisButton.tsx
│   └── Static988Button.tsx
├── constants/
│   ├── crisisButtonGeometry.ts
│   └── crisisInputAccessory.ts
├── screens/
│   └── CrisisResourcesScreen.tsx
├── services/
│   ├── crisisAlert.ts
│   ├── CrisisSecurityProtocol.ts
│   ├── crisisTapTrace.ts
│   ├── textCrisisDetection.ts
│   └── types/CrisisResources.ts
├── types/
│   └── safety.ts
└── utils/
    ├── navigateToCrisisResources.ts
    └── openCrisisUrl.ts
```

Note what is absent: there is no feature-level `index.ts`, and no `hooks/` or
`stores/` directory. Not every feature uses every directory in the layout above.

## Import Pattern

A feature has no single "public API" file. Import the module you need, by path:

```typescript
// ✅ Good - name the module
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';
import { detectCrisis } from '@/features/crisis/types/safety';
import type { CrisisDetection } from '@/features/crisis/types/safety';

// ❌ Bad - a feature-wide barrel (none exists; this would not resolve)
import { CollapsibleCrisisButton, detectCrisis } from '@/features/crisis'; // doc-import: unresolved-by-design - MAINT-600 deleted this barrel
```

A **directory** barrel is fine where it stays small and selective — re-exporting by
name, never with `export *`:

```typescript
// core/components/accessibility/index.ts
export { default as RadioGroup } from './RadioGroup';
export type { RadioOption, RadioGroupProps } from './RadioGroup';
```

Crisis components have no barrel: import each one by its file path
(`@/features/crisis/components/CollapsibleCrisisButton`). MAINT-603 deleted the
crisis components barrel, which had no runtime importer.

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
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';

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

### Step 2: Create Directory Barrels (optional)

Only where a directory holds several modules that are genuinely imported together.
A barrel is never required, and a **feature-level** `index.ts` is not the house
pattern — see [Import Guidelines](./import-guidelines.md).

```bash
# Selective, re-exported by name — never `export *`
touch src/features/[feature-name]/components/index.ts
```

### Step 3: Update Path Aliases (tsconfig.json)

Usually not needed - `@/features/*` covers all features.

### Step 4: Document the Feature

Create `/docs/features/[feature-name].md`:

````markdown
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
````

### Step 5: Build the Feature

Follow the standard structure, implement functionality, export public API.

## Barrel Export Best Practices

Scope a barrel to a **directory**, never to a whole feature (FEAT-376, MAINT-600).

### ✅ Do:
- Re-export by name, so the eager graph stays readable
- Keep internal utilities private
- Document what's exported and why

### ❌ Don't:
- Use `export *` — it loads everything, internals included
- Add a feature-level `index.ts`
- Export internal implementation details
- Create circular dependencies

## File Naming Conventions

### Components
```
PascalCase: CollapsibleCrisisButton.tsx, RootCrisisBoundary.tsx
```

### Services
```
Match the file name to its primary export:
  CrisisSecurityProtocol.ts (a class), textCrisisDetection.ts (functions)
```

### Stores
```
camelCase: consentStore.ts, bugReportStore.ts
```

### Hooks
```
camelCase: useOverlayBottomInset.ts, useKeyboardOccludesCrisisButton.ts
```

### Types
```
camelCase: safety.ts, scoring.ts
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

### ❌ Cross-Feature Coupling
Don't reach into another feature where an event, a navigation param, or a `core/`
hook would do. Where a cross-feature import is unavoidable, prefer a type-only one.

### ❌ Feature-Specific Types in Global Types
Don't put feature-specific types in `types/`. Keep in feature.

### ❌ Deep Nesting
Avoid deeply nested structures like `features/x/components/y/z/w/`. Keep flat.

## Migration from Old Structure

When moving code from old structure:

1. **Identify the feature**: What domain does this code belong to?
2. **Move related code together**: Components, services, stores, types all together
3. **Update imports**: Change to use `@/features/[feature]/[dir]/[Module]`
4. **Verify with `tsc --noEmit`**: a stale import fails the typecheck, not a grep
5. **Test thoroughly**: Ensure nothing broke

## Questions?

Refer to:
- [Codebase Organization](./codebase-organization.md) - Overall structure
- [Import Guidelines](./import-guidelines.md) - Import patterns
- [Technical Patterns](./technical-patterns.md) - Implementation patterns
