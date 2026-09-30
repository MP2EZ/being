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

**Don't add a feature-level `index.ts`.** MAINT-599, MAINT-600 and MAINT-602 removed the
`export *` ones: each sat at zero importers while it put the whole feature on the eager
module graph of anyone who adopted it (FEAT-376). One survives by design —
`features/consent/index.ts` re-exports by name and has live importers. Import the module
you need, by path — see [Import Guidelines](./import-guidelines.md).

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

### Crisis-safe error boundaries

_Moved here from technical-patterns.md, which MAINT-611 deleted; body as corrected by MAINT-604._

```typescript
// Two crisis-safe tiers; React's nearest boundary wins (DEBUG-341)
import RootCrisisBoundary from '@/features/crisis/components/RootCrisisBoundary';
import RootCrisisButton from '@/features/crisis/components/RootCrisisButton';

// App.tsx wraps <CleanRootNavigator /> in one RootCrisisBoundary. The overlay
// gets its OWN boundary inside the navigator (CleanRootNavigator.tsx):
<RootCrisisBoundary>
  <RootCrisisButton routeName={activeRootRoute ?? initialRoute} />
</RootCrisisBoundary>
```

**Boundaries that exist:**
- `RootCrisisBoundary`: the immediate parent of `CleanRootNavigator`, and separately of
  the crisis overlay. Its fallback is a static 988 screen (`Static988Button`) that depends
  on none of the subsystems most likely to have crashed. No auto-retry: recovery is
  user-initiated, so the 988 control cannot unmount mid-tap.
- `CrisisErrorBoundary`: wraps the assessment flow (`EnhancedAssessmentFlow`) and catches
  its crashes first. Its fallback renders `CollapsibleCrisisButton`, and it retries on a
  timer and on app foreground.

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
```

Shared analytics live in `core/analytics/` and shared types in `core/types/`.

### Discouraged Dependencies

```
⚠️  features/[feature-a] → features/[feature-b]
```

Crisis consumption is the exception: `detectCrisis`, crisis geometry and `CrisisTextInput` are
REQUIRED imports, by their direct `@/features/crisis/…` path, never copied or re-derived.

**When features need to communicate:**
- Navigate with route params (typed by `RootStackParamList` in `core/navigation/CleanRootNavigator.tsx`)
- Use shared hooks from `core/` (`core/hooks/`, `useAnalytics` in `core/analytics/`)
- Read shared state from a `core/stores/` store at the call site
- Import another feature's types type-only (`import type`)

**Example:**
```typescript
// ❌ Don't do this
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';

// ✅ Do this instead
import { useNavigation } from '@react-navigation/native';

// Navigate and pass data
navigation.navigate('AssessmentFlow', {
  assessmentType: 'phq9',
  context: 'standalone',
});
```

### Forbidden Dependencies

```
❌ core/* → features/*
```

Lint-enforced (MAINT-659). The one list of named exceptions, and the crisis leaf modules any
core file may import, are in [import-guidelines.md](./import-guidelines.md#core--features-boundary-lint-enforced-maint-659).

## Domain Authority Features

Some features have special domain authority status and override technical decisions:

### Crisis Feature (Domain Authority: crisis)
- **Priority**: Highest (overrides ALL)
- **Performance**: <200ms detection required
- **Safety**: PHQ-9 ≥15 support resources, PHQ-9 ≥20 and Q9>0 intervention, GAD-7 ≥15
- **Special Rules**:
  - Crisis code must be easily auditable
  - Performance never compromised
  - Security protocols always enforced

### Assessment Feature (Domain Authority: philosopher + crisis)
- **Priority**: Critical (scoring accuracy required)
- **Accuracy**: 100% PHQ-9/GAD-7 scoring
- **Validation**: All 48 scoring combinations tested
- **Special Rules**:
  - Exact wellness screening question wording required
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

### Step 3: Path Aliases (no action)

`@/features/*` covers every feature and `@/core/*` covers infrastructure, so a new
feature needs no alias. Do not add one: MAINT-623 removed nine aliases whose target
directories no longer existed, and `@/*` already resolves anything either would.

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
  crisisAlert.ts (a class), textCrisisDetection.ts (functions)
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
- **Assessment features**: 100% coverage (scoring accuracy)
- **Other features**: 80% coverage minimum

## Anti-Patterns to Avoid

### ❌ Monolithic Features
Don't create a "god feature" that does everything.

### ❌ Shared Utils in Features
Don't put widely-used utilities in a feature. Move to `core/utils/`.

### ❌ Cross-Feature Coupling
Don't reach into another feature where a navigation param, a `core/` hook or a
`core/stores/` store would do. Where a cross-feature import is unavoidable, prefer a
type-only one.

### ❌ Feature-Specific Types in Shared Types
Don't put feature-specific types in `core/types/`. Keep in feature.

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
