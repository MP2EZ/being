# Import Guidelines

This document defines best practices for imports, path aliases, and dependency management in the Being app.

## Path Aliases

The project uses TypeScript path aliases for clean, maintainable imports.

### Available Aliases

```typescript
// Configured in tsconfig.json
"@/core/*"        → "src/core/*"
"@/features/*"    → "src/features/*"
```

### Usage Examples

```typescript
// ✅ Good - use path aliases
import { theme } from '@/core/theme';
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';
import { useAnalytics } from '@/core/analytics';

// ❌ Bad - relative paths get messy
import { theme } from '../../../core/theme';
import { CollapsibleCrisisButton } from '../../features/crisis/components/CollapsibleCrisisButton';
```

## Import Patterns

### Feature Import Pattern

Import the module you actually need, by path. **Feature-wide barrels
(`features/<name>/index.ts`) are not the house pattern.** MAINT-599, MAINT-600 and
MAINT-602 removed the `export *` ones; `features/consent/index.ts` is kept because it
re-exports by name and has live importers. ~92 of the crisis feature's ~94 import sites
already resolve a file directly.

```typescript
// ✅ Good - name the module you need
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';
import { detectCrisis } from '@/features/crisis/types/safety';
import type { CrisisDetection } from '@/features/crisis/types/safety';

// ❌ Bad - a feature-wide barrel
import { CollapsibleCrisisButton, detectCrisis } from '@/features/crisis'; // doc-import: unresolved-by-design - MAINT-600 deleted this barrel
```

**Why (FEAT-376):**
- A feature barrel's `export *` puts the whole feature on the eager module graph of
  every importer, safety paths included — the barrel, not the route, becomes what
  makes code reachable.
- A feature-wide barrel invites an *incomplete* public API. The crisis barrel omitted
  `constants/` and `utils/`, which hold `crisisButtonGeometry` and
  `crisisInputAccessory` — the exact specifiers the safety tooling anchors on. An
  audit surface that excludes the safety-bearing modules is worse than none.
- The path is documentation: `@/features/crisis/types/safety` says what
  `@/features/crisis` hides.

**Directory-level barrels are still fine** where they stay small and selective.
`@/core/components/accessibility` re-exports by name rather than with `export *`.
Crisis components have no barrel; import each by its file path.

### Core Imports

Core modules can be imported from subdirectories:

```typescript
// ✅ Both patterns acceptable
import { theme } from '@/core/theme';
import { colors } from '@/core/theme/colors';

import { logger } from '@/core/services/logging';
import { ProductionLogger } from '@/core/services/logging/ProductionLogger';
```

### Cryptographic ID Generation

**IMPORTANT:** Never use `Math.random()` for generating IDs, session tokens, or any identifier that could be security-sensitive. Use the cryptographic utilities instead:

```typescript
// ✅ Good - cryptographically secure ID generation
import {
  generateUUID,           // Standard UUID v4
  generateTimestampedId,  // Sortable: prefix_timestamp_random
  generateSessionId,      // Session: session_date_random
  generateComponentId,    // React keys: prefix-random
  generateRandomString,   // Raw crypto random string
  generateInternalId      // Internal: timestamp_random
} from '@/core/utils/id';

// Usage examples
const id = generateUUID();                    // "550e8400-e29b-41d4-a716-446655440000"
const eventId = generateTimestampedId('evt'); // "evt_1703702400000_a1b2c3d4e"
const sessionId = generateSessionId();        // "session_2024-12-27_x9y8z7w6v"
const radioId = generateComponentId('radio'); // "radio-m3n4o5p6q"

// ❌ Bad - Math.random() is NOT cryptographically secure
const insecureId = `id_${Math.random().toString(36).substr(2, 9)}`; // NEVER DO THIS
```

**Why cryptographic IDs matter:**
- `Math.random()` is predictable and can be exploited
- Secure IDs prevent enumeration attacks
- Required for HIPAA-adjacent data handling
- Consistent ID format across the codebase

**Prefer barrel exports when available:**
```typescript
// ✅ Better - use barrel
import { logger, ProductionLogger } from '@/core/services/logging';

// ⚠️  Works but less preferred
import { logger, ProductionLogger } from '@/core/services/logging/ProductionLogger';
```

### Type Imports

Use type-only imports for better build performance:

```typescript
// ✅ Good - type-only import
import type { CrisisDetection, CrisisSeverityLevel } from '@/features/crisis/types/safety';
import type { SessionMetadata } from '@/core/types/session';

// ⚠️  Works but creates runtime dependency
import { CrisisDetection, CrisisSeverityLevel } from '@/features/crisis/types/safety';
```

### React Native Imports

```typescript
// ✅ Good - specific imports
import { View, Text, TouchableOpacity } from 'react-native';

// ❌ Bad - namespace import (larger bundle)
import * as RN from 'react-native';
```

## Dependency Rules

### Allowed Import Patterns

```typescript
// Features can import from core
// ✅ features/<name>/...
import { logger } from '@/core/services/logging';
import { useAnalytics } from '@/core/analytics';
import type { SessionMetadata } from '@/core/types/session';

// Core can import from other core modules
// ✅ core/services/security/...
import { logger } from '@/core/services/logging';
```

### Forbidden Import Patterns

```typescript
// ❌ Core cannot import from features — type-only imports included
// core/<name>.ts
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore'; // FORBIDDEN
import type { ModuleId } from '@/features/learn/types/education'; // FORBIDDEN

// ⚠️ Features should avoid importing other features' stores and screens directly
// features/<a>/...
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore'; // DISCOURAGED

// ✅ REQUIRED — crisis consumption is the exception to the caution above
// features/assessment/stores/assessmentStore.ts
import { detectCrisis } from '@/features/crisis/types/safety';
```

`detectCrisis()` in `@/features/crisis/types/safety` is the single source of truth for the
PHQ-9/GAD-7 crisis thresholds and trigger taxonomy (DEBUG-229 / MAINT-226 Decision E), and it
is where the score-path zero-false-negative contract lives. Code that decides whether a user
is offered crisis support MUST import it by that exact module path. Never re-derive PHQ-9 ≥15
support, ≥20 intervention, Q9 >0 at any total, or GAD-7 ≥15 as literals — a store's own copy
was the DEBUG-229 bug. Never reach it through a barrel, a relative path or a re-export: it is
one of the specifiers `/b-close`'s INFRA-531 import detector anchors on. One known literal copy
exists, `SyncCoordinator.classifyAssessmentCrisis`; it sets backup priority only and is not the
detection path. The same rule covers crisis geometry (`@/features/crisis/constants/…`) and
`CrisisTextInput`: consume them by direct path, never by copying their values.

### Core → features boundary (lint-enforced, MAINT-659)

`core/` must not import from `features/`. The `being/core-features-boundary` block in
`app/eslint.config.js` enforces it, and `CORE_FEATURE_IMPORT_EXCEPTIONS` in that file is the
**only** list of core files allowed to cross it. The architecture docs point here and never
repeat file names. The exceptions fall into three classes:

- **Composition root** — the navigators, which mount every feature's screens.
- **Single-source copy** — a core component rendering compliance-pinned feature copy.
- **Recorded layering debt** — real inversions left in place because moving them touches
  gated code. Delete the entry in the change that moves the file.

**The leaf allowance.** Any core file may import four crisis modules without an entry:
`@/features/crisis/constants/…`, `@/features/crisis/types/safety`,
`@/features/assessment/types/scoring` and `@/features/crisis/components/CrisisTextInput`.
They are what the crisis guards prescribe as the fix, so the boundary must never make a
literal copy or a lazy import the cheaper route.

**Never** satisfy the rule by:
- copying crisis values into `core/` as literals (DEBUG-586);
- moving `crisisButtonGeometry.ts` or `crisisInputAccessory.ts` into `core/`, or re-exporting
  them through a core module — either blinds INFRA-531, which keys on the import line in each
  consumer;
- reaching a feature by a relative or `src/` path, or loading it with `require()`, `import()`
  or `React.lazy` — the lint block rejects all of these;
- an `eslint-disable` comment, or `npm run lint:baseline -- --update`. An exception is a
  reviewed entry in the list; `__tests__/scripts/eslint-core-features-boundary.test.js` pins
  the list, the leaf paths, and a hard zero over every other core file.

### Cross-Feature Communication

When features need to interact, use these patterns:

#### 1. Navigation with Data

```typescript
// features/assessment/components/AssessmentComplete.tsx
import { useNavigation } from '@react-navigation/native';

const navigation = useNavigation();
navigation.navigate('CrisisResources', {
  severity: 'high',
  triggeredBy: 'assessment'
});
```

#### 2. Type-Only Imports (Allowed)

```typescript
// features/assessment/types/assessment.ts
// Type-only imports from other features are OK
import type { CrisisDetection } from '@/features/crisis/types/safety';

export interface AssessmentResult {
  crisis?: CrisisDetection;  // Using the type
}
```

## Avoiding Circular Dependencies

### What Are Circular Dependencies?

```
File A imports File B
File B imports File C
File C imports File A  ← Circular!
```

### Detection

```bash
# Install madge
npm install -g madge

# Check for circular dependencies
madge --circular src/
```

### Common Causes & Solutions

#### Cause 1: Mutual Component Imports

```typescript
// ❌ Bad - circular
// components/A.tsx
import { ComponentB } from './B';

// components/B.tsx
import { ComponentA } from './A';
```

**Solution:** Extract shared logic to a third file

```typescript
// ✅ Good
// components/shared.ts
export const sharedLogic = () => {};

// components/A.tsx
import { sharedLogic } from './shared';

// components/B.tsx
import { sharedLogic } from './shared';
```

#### Cause 2: Store Circular References

```typescript
// ❌ Bad - stores importing each other
// stores/assessmentStore.ts
import { crisisStore } from './crisisStore';

// stores/crisisStore.ts
import { assessmentStore } from './assessmentStore';
```

**Solution:** Don't import one store from another. Read both where they are consumed —
the hook or component that needs the two values subscribes to each store.

#### Cause 3: Type Circular References

```typescript
// ❌ Bad - types importing each other
// types/assessment.ts
import { Crisis } from './crisis';

// types/crisis.ts
import { Assessment } from './assessment';
```

**Solution:** Create shared types file

```typescript
// ✅ Good - shared types
// types/shared.ts
export interface Crisis { /*...*/ }
export interface Assessment { /*...*/ }

// types/assessment.ts
import type { Crisis } from './shared';

// types/crisis.ts
import type { Assessment } from './shared';
```

## Import Organization

### Order of Imports

Organize imports in this order:

```typescript
// 1. External dependencies
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// 2. Core imports
import { theme } from '@/core/theme';
import { logger } from '@/core/services/logging';
import { useAnalytics } from '@/core/analytics';

// 3. Feature imports (current feature)
import { CollapsibleCrisisButton } from '../components/CollapsibleCrisisButton';
import { openCrisisUrl } from '../utils/openCrisisUrl';

// 4. Type imports (last)
import type { CrisisDetection } from '../types/safety';
import type { NavigationProp } from '@react-navigation/native';
```

### Blank Lines

Use blank lines to separate groups:

```typescript
import React from 'react';
import { View } from 'react-native';

import { theme } from '@/core/theme';

import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';

import type { CrisisDetection } from './types/safety';
```

## Auto-Import Configuration

Configure VS Code to use path aliases:

```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "javascript.preferences.importModuleSpecifier": "non-relative"
}
```

## ESLint Rules

The only import rules actually enforced live in `app/eslint.config.js`: MAINT-437's
SafeAreaView ban and the [core → features boundary](#core--features-boundary-lint-enforced-maint-659).
The configuration below is illustrative and is **not** configured (`eslint-plugin-import` is
not a dependency).

Enforce import patterns with ESLint:

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // Enforce type-only imports
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports' }
    ],

    // Prevent circular dependencies
    'import/no-cycle': 'error',

    // Enforce import order
    'import/order': [
      'error',
      {
        'groups': [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'pathGroups': [
          {
            'pattern': '@/core/**',
            'group': 'internal',
            'position': 'before'
          },
          {
            'pattern': '@/features/**',
            'group': 'internal',
            'position': 'after'
          }
        ],
        'newlines-between': 'always'
      }
    ]
  }
};
```

## Migration Tips

### Updating Imports After Move

When moving files during reorganization:

```bash
# Use find/replace for bulk updates
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  's|from ".*\/crisis\/|from "@/features/crisis/|g' {} +
```

### Verifying Imports

After migration phase:

```bash
# 1. Type check
npx tsc --noEmit

# 2. Check for circular deps
madge --circular src/

# 3. Run tests
npm test
```

## Common Mistakes

### ❌ Mistake 1: Relative Paths in Features

```typescript
// ❌ Bad
import { logger } from '../../../core/services/logging';

// ✅ Good
import { logger } from '@/core/services/logging';
```

### ❌ Mistake 2: Importing a Feature-Wide Barrel

```typescript
// ❌ Bad - loads the whole feature eagerly (FEAT-376)
import { CollapsibleCrisisButton } from '@/features/crisis'; // doc-import: unresolved-by-design - MAINT-600 deleted this barrel

// ✅ Good - name the module
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';
```

### ❌ Mistake 3: Runtime Type Imports

```typescript
// ❌ Bad - creates runtime dependency
import { CrisisTriggerType } from '@/features/crisis/types/safety';

// ✅ Good - type-only import
import type { CrisisTriggerType } from '@/features/crisis/types/safety';
```

### ❌ Mistake 4: Barrel Export Everything

`export *` puts every module the barrel names onto the eager graph of every importer
(FEAT-376). This is what retired the feature-wide barrels: MAINT-600 deleted
`features/crisis/index.ts` after it sat at zero importers while re-exporting four
sub-barrels — and omitting `constants/` and `utils/` entirely.

```typescript
// ❌ Bad - exports too much
// features/<name>/index.ts
export * from './components';
export * from './services';
// This loads EVERYTHING, including internal utilities

// ✅ Good - a directory barrel, selective and by name
// core/components/accessibility/index.ts
export { default as RadioGroup } from './RadioGroup';
export type { RadioOption, RadioGroupProps } from './RadioGroup';
```

## Questions?

Refer to:
- [Feature Structure](./feature-structure.md) - How features are organized
- [Codebase Organization](./codebase-organization.md) - Overall structure
