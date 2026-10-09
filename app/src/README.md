# Being App - Source Architecture

This file is the *decision guide*: where a new file belongs, and how to import it.
It deliberately does not restate the directory tree — see
[Codebase Organization → Directory Structure](../../docs/architecture/codebase-organization.md#directory-structure),
which is the single source for the tree. Two copies drift; one does not.

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
- **Types:** Session, subscription, practice identity — anything cross-cutting
- **Stores:** Subscription, settings, consent (used across features)
- **Components:** Shared UI primitives, navigation
- **Constants:** App-wide configuration

**Examples:**
```
core/analytics/PHIFilter.ts                 # Event allow-list used app-wide
core/types/session.ts                       # Session types used everywhere
core/stores/subscriptionStore.ts            # Subscription state for entire app
```

#### ✅ Belongs in `features/{name}/`

- **Screens:** Feature-specific UI screens
- **Components:** Feature-specific components
- **Types:** Domain models (e.g., education, stoic, flows)
- **Stores:** Feature-specific state (e.g., educationStore, stoicPracticeStore)
- **Services:** Feature-specific business logic

**Examples:**
```
features/learn/types/education.ts                # Education types only used in learn
features/practices/stores/stoicPracticeStore.ts  # Practice state
features/crisis/services/textCrisisDetection.ts  # Crisis-specific logic
```

## Where Tests Go

There are **two test roots**, and both are live. A `src`-scoped search cannot answer
"is this suite dead?" — see CLAUDE.md → Known Gotchas (INFRA-84).

#### App-wide suites → `app/__tests__/`

Grouped by concern (`unit`, `integration`, `performance`, `clinical`, `safety`,
`privacy`, `security`, `compliance`, …). The `package.json` scripts glob these
directories **by name**, so a suite here runs in `precommit` while staying invisible
to a `grep` over `app/src`.

```
app/__tests__/performance/assessment-performance.test.ts
app/__tests__/integration/crisis-resources-integration.test.ts
app/__tests__/compliance/consumer-privacy-posture.test.ts
```

#### Unit tests → co-located `__tests__/` beside the code

54 such directories exist under `app/src/`.

```
app/src/core/services/security/__tests__/    # Unit tests for security services
app/src/features/learn/__tests__/            # Unit tests for the learn feature
```

## Import Path Conventions

### ✅ Use Path Aliases (Preferred)

```typescript
// Infrastructure
import { useAnalytics } from '@/core/analytics';
import { EncryptionService } from '@/core/services/security/EncryptionService';
import type { SessionMetadata } from '@/core/types/session';

// Features
import { useEducationStore } from '@/features/learn/stores/educationStore';
import type { ModuleId } from '@/features/learn/types/education';
import type { CardinalVirtue } from '@/features/practices/types/stoic';
```

Import the **file**, not the directory, unless that directory actually has an
`index.ts`. `core/services/security/` does not, so `@/core/services/security`
alone does not resolve.

### ❌ Avoid Relative Imports

```typescript
// ❌ Don't do this
import { useAnalytics } from '../../../core/analytics';
import { ModuleId } from '../../../../features/learn/types/education';
```

### Path Alias Reference

Two aliases, plus the `@/*` catch-all they are subsumed by:

- `@/core/*` - Infrastructure (services, analytics, types, stores)
- `@/features/*` - Feature code

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

**Previous structure** (DEPRECATED as of 2025-11-15 — none of these directories
still exist):

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

- **Directory tree:** [`docs/architecture/codebase-organization.md`](../../docs/architecture/codebase-organization.md#directory-structure)
- **Import rules:** [`docs/architecture/import-guidelines.md`](../../docs/architecture/import-guidelines.md)
- **Architecture Deep Dive:** [`docs/architecture/`](../../docs/architecture/)
- **Stoic Mindfulness Framework:** [`docs/product/stoic-mindfulness/`](../../docs/product/stoic-mindfulness/INDEX.md)
- **Security & Compliance:** [`docs/security/`](../../docs/security/)

## Questions?

**"Where should my new file go?"**
→ Use the decision tree above

**"Should I use relative or path alias imports?"**
→ Always use path aliases (`@/core/*`, `@/features/*`)

**"Is this infrastructure or feature-specific?"**
→ If multiple features use it → `core/`
→ If only one feature uses it → `features/{name}/`

**"Where do tests go?"**
→ App-wide suites → `app/__tests__/<concern>/`
→ Unit tests → Co-located with code (`__tests__/`)

---

**Last major reorganization:** Commit `688ffd1` (2025-11-15)
- Moved analytics to core
- Split types by ownership
- Deleted 1,350 lines of dead code
- 67 files changed, 0 TypeScript errors
