# Being App - Source Architecture

Last Updated: 2025-11-15 (Commit `688ffd1`)

## Directory Structure

```
src/
├── __tests__/          # Integration/regression tests (app-wide only)
├── core/               # Infrastructure (cross-cutting concerns)
│   ├── analytics/      # Privacy-preserving analytics
│   ├── services/       # Security, sync, session, logging
│   ├── stores/         # Subscription, settings
│   ├── types/          # Infrastructure types
│   ├── providers/      # Theme, context providers
│   ├── navigation/     # Root navigation
│   └── constants/      # Shared constants
├── features/           # Domain features (business logic)
│   ├── learn/          # Educational modules
│   ├── practices/      # Morning/midday/evening practices
│   ├── crisis/         # Crisis intervention
│   ├── assessment/     # PHQ-9/GAD-7 assessments
│   └── insights/       # Virtue dashboard
└── App.tsx             # Entry point
```

## Organization Rules

### Core vs Features Decision Tree

**Ask: "Is this used by multiple features?"**
- ✅ **Yes** → `core/`
- ❌ **No** → `features/{feature-name}/`

**Ask: "Is this infrastructure or domain logic?"**
- ✅ **Infrastructure** (analytics, security, networking, cross-cutting types) → `core/`
- ❌ **Domain Logic** (business rules, UI, feature-specific types) → `features/`

### File Placement Guide

#### ✅ Belongs in `core/`

- **Services:** Security, authentication, networking, logging, analytics
- **Types:** Security, compliance, session, subscription, errors, integration
- **Stores:** Subscription, settings (used across features)
- **Components:** Shared UI primitives, navigation
- **Constants:** App-wide configuration

**Examples:**
```
core/analytics/AnalyticsService.ts    # Used by crisis, assessment, settings
core/types/security/encryption.ts     # Security types used everywhere
core/stores/subscriptionStore.ts      # Subscription state for entire app
```

#### ✅ Belongs in `features/{name}/`

- **Screens:** Feature-specific UI screens
- **Components:** Feature-specific components
- **Types:** Domain models (e.g., education, stoic, flows)
- **Stores:** Feature-specific state (e.g., educationStore, stoicPracticeStore)
- **Services:** Feature-specific business logic

**Examples:**
```
features/learn/types/education.ts           # Education types only used in learn
features/practices/stores/stoicPracticeStore.ts  # Practice state
features/crisis/services/CrisisDetectionEngine.ts # Crisis-specific logic
```

#### ✅ Belongs in `src/__tests__/`

**Only app-wide integration/regression tests:**
```
__tests__/performance/week4-comprehensive-performance-regression.test.ts
__tests__/integration/analytics-service-integration.test.ts
__tests__/compliance/week3-analytics-hipaa-compliance.test.ts
```

**Unit tests co-located with code:**
```
core/services/__tests__/         # Unit tests for core services
features/learn/__tests__/        # Unit tests for learn feature
```

## Import Path Conventions

### ✅ Use Path Aliases (Preferred)

```typescript
// Infrastructure
import { AnalyticsService } from '@/core/analytics';
import { EncryptionService } from '@/core/services/security';
import type { SessionMetadata } from '@/core/types/session';

// Features
import { useEducationStore } from '@/features/learn/stores/educationStore';
import type { ModuleId } from '@/features/learn/types/education';
import type { CardinalVirtue } from '@/features/practices/types/stoic';
```

### ❌ Avoid Relative Imports

```typescript
// ❌ Don't do this
import { AnalyticsService } from '../../../core/analytics';
import { ModuleId } from '../../../../types/education';
```

### Path Alias Reference

- `@/core/*` - Infrastructure (services, analytics, types, stores)
- `@/features/*` - Feature code
- `@/types/*` - **DEPRECATED** (use `@/core/types/*` or `@/features/*/types/*`)
- `@/analytics/*` - **DEPRECATED** (use `@/core/analytics/*`)

## Adding New Code

### New Infrastructure Service

```bash
src/core/services/my-service/
├── MyService.ts
├── index.ts
└── __tests__/
    └── MyService.test.ts
```

```typescript
// Export from index.ts
export { MyService } from './MyService';
export type { MyServiceConfig } from './MyService';

// Import in other files
import { MyService } from '@/core/services/my-service';
```

### New Feature

```bash
src/features/my-feature/
├── screens/              # UI screens
├── components/           # Feature-specific components
├── stores/               # Feature state management
├── types/                # Feature-specific types
├── services/             # Feature business logic
└── __tests__/            # Unit tests
```

### New Type Definition

**Is it infrastructure or feature-specific?**

```typescript
// Infrastructure → core/types/
src/core/types/my-domain/
├── index.ts
└── models.ts

// Feature-specific → features/*/types/
src/features/my-feature/types/
├── index.ts
└── models.ts
```

## Common Mistakes & Fixes

### ❌ Mistake: Feature types in core

```typescript
// ❌ Wrong
src/core/types/education.ts  // Education is feature-specific

// ✅ Correct
src/features/learn/types/education.ts
```

### ❌ Mistake: Infrastructure in features

```typescript
// ❌ Wrong
src/features/learn/analytics/  // Analytics used by multiple features

// ✅ Correct
src/core/analytics/
```

### ❌ Mistake: Relative imports

```typescript
// ❌ Wrong
import { ModuleId } from '../../../types/education';

// ✅ Correct
import type { ModuleId } from '@/features/learn/types/education';
```

## Migration History

**Previous structure** (DEPRECATED as of 2025-11-15):

```
src/analytics/          → Moved to core/analytics/
src/types/              → Split to core/types/ and features/*/types/
src/constants/          → Deleted (therapeutic values deprecated)
src/stores/             → Split to core/stores/ and features/*/stores/
```

**See commit `688ffd1` for complete reorganization.**

## Architecture Philosophy

**Why feature-based?**
- **Scalability:** Each feature is self-contained
- **Discoverability:** Related code lives together
- **Clarity:** Clear boundary between infrastructure and domain

**Why co-locate types?**
- **Maintainability:** Types live near their consumers
- **Ownership:** Clear which feature owns which types
- **Refactoring:** Easier to move/rename features

## Related Documentation

- **Contribution Workflow:** `/CONTRIBUTING.md`
- **Architecture Deep Dive:** `/docs/architecture/` (if exists)
- **Stoic Mindfulness Framework:** `/docs/philosophical/`
- **Security & Compliance:** `/docs/security/`

## Questions?

**"Where should my new file go?"**
→ Use the decision tree above

**"Should I use relative or path alias imports?"**
→ Always use path aliases (`@/core/*`, `@/features/*`)

**"Is this infrastructure or feature-specific?"**
→ If multiple features use it → `core/`
→ If only one feature uses it → `features/{name}/`

**"Where do integration tests go?"**
→ App-wide tests → `src/__tests__/`
→ Unit tests → Co-located with code (`*/tests/`)

---

**Last major reorganization:** Commit `688ffd1` (2025-11-15)
- Moved analytics to core
- Split types by ownership
- Deleted 1,350 lines of dead code
- 67 files changed, 0 TypeScript errors
