# Import Guidelines

This document defines best practices for imports, path aliases, and dependency management in the Being app.

## Path Aliases

The project uses TypeScript path aliases for clean, maintainable imports.

### Available Aliases

```typescript
// Configured in tsconfig.json
"@/core/*"        → "src/core/*"
"@/features/*"    → "src/features/*"
"@/compliance/*"  → "src/compliance/*"
"@/analytics/*"   → "src/analytics/*"
"@/types/*"       → "src/types/*"
```

### Usage Examples

```typescript
// ✅ Good - use path aliases
import { theme } from '@/core/theme';
import { CrisisButton } from '@/features/crisis';
import { HIPAAComplianceEngine } from '@/compliance';
import { AnalyticsService } from '@/analytics';

// ❌ Bad - relative paths get messy
import { theme } from '../../../core/theme';
import { CrisisButton } from '../../features/crisis/components/CrisisButton';
```

## Import Patterns

### Feature Public API Pattern

Always import from feature barrel exports, never from internal files:

```typescript
// ✅ Good - use public API
import {
  CrisisButton,
  useCrisisDetection,
  type CrisisDetection
} from '@/features/crisis';

// ❌ Bad - reaching into internals
import { CrisisButton } from '@/features/crisis/components/CrisisButton';
import { useCrisisDetection } from '@/features/crisis/hooks/useCrisisDetection';
```

**Why?**
- Public API is documented and stable
- Internal structure can change without breaking imports
- Easier to understand what's public vs. private
- Enables better tree-shaking

### Core Imports

Core modules can be imported from subdirectories:

```typescript
// ✅ Both patterns acceptable
import { theme } from '@/core/theme';
import { colors } from '@/core/theme/colors';

import { logger } from '@/core/services/logging';
import { LoggingService } from '@/core/services/logging/LoggingService';
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
import { logger, LoggingService } from '@/core/services/logging';

// ⚠️  Works but less preferred
import { logger } from '@/core/services/logging/logger';
import { LoggingService } from '@/core/services/logging/LoggingService';
```

### Type Imports

Use type-only imports for better build performance:

```typescript
// ✅ Good - type-only import
import type { CrisisDetection, CrisisSeverity } from '@/features/crisis';
import type { User } from '@/types';

// ⚠️  Works but creates runtime dependency
import { CrisisDetection, CrisisSeverity } from '@/features/crisis';
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
// Features can import from core, compliance, analytics, global types
// ✅ features/crisis/services/CrisisDetection.ts
import { logger } from '@/core/services/logging';
import { HIPAAComplianceEngine } from '@/compliance';
import { trackEvent } from '@/analytics';
import type { SessionData } from '@/types';

// Core can import from other core modules and global types
// ✅ core/services/security/EncryptionService.ts
import { logger } from '@/core/services/logging';
import type { EncryptionConfig } from '@/types/security';

// Compliance can import from core and global types
// ✅ compliance/services/HIPAAComplianceEngine.ts
import { logger } from '@/core/services/logging';
import type { ComplianceEvent } from '@/types';
```

### Forbidden Import Patterns

```typescript
// ❌ Core cannot import from features
// core/services/logging/logger.ts
import { CrisisButton } from '@/features/crisis'; // FORBIDDEN

// ❌ Global types cannot import from features
// types/index.ts
import type { CrisisDetection } from '@/features/crisis'; // FORBIDDEN

// ❌ Features should avoid importing other features directly
// features/assessment/services/scoring.ts
import { CrisisDetection } from '@/features/crisis'; // DISCOURAGED
```

### Cross-Feature Communication

When features need to interact, use these patterns:

#### 1. Shared Events

```typescript
// core/services/events/EventBus.ts
export const eventBus = new EventEmitter();

// features/assessment/services/scoring.ts
import { eventBus } from '@/core/services/events';

eventBus.emit('crisis-detected', {
  severity: 'high',
  source: 'phq9-q9'
});

// features/crisis/hooks/useCrisisDetection.ts
import { eventBus } from '@/core/services/events';

useEffect(() => {
  const handler = (data) => {
    // Handle crisis detection
  };
  eventBus.on('crisis-detected', handler);
  return () => eventBus.off('crisis-detected', handler);
}, []);
```

#### 2. Navigation with Data

```typescript
// features/assessment/components/AssessmentComplete.tsx
import { useNavigation } from '@react-navigation/native';

const navigation = useNavigation();
navigation.navigate('CrisisResources', {
  severity: 'high',
  triggeredBy: 'assessment'
});
```

#### 3. Shared Context

```typescript
// core/providers/AppProvider.tsx
export const AppContext = createContext();

// features/crisis/hooks/useCrisisState.ts
import { useContext } from 'react';
import { AppContext } from '@/core/providers';

const { crisisState } = useContext(AppContext);
```

#### 4. Type-Only Imports (Allowed)

```typescript
// features/assessment/types/assessment.ts
// Type-only imports from other features are OK
import type { CrisisDetection } from '@/features/crisis';

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

**Solution:** Use events or selectors

```typescript
// ✅ Good - use events
// stores/assessmentStore.ts
import { eventBus } from '@/core/services/events';
eventBus.emit('assessment-complete', data);

// stores/crisisStore.ts
import { eventBus } from '@/core/services/events';
eventBus.on('assessment-complete', handler);
```

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

// 3. Compliance/Analytics (if needed)
import { HIPAAComplianceEngine } from '@/compliance';
import { trackEvent } from '@/analytics';

// 4. Feature imports (current feature)
import { CrisisButton } from '../components';
import { useCrisisDetection } from '../hooks';

// 5. Type imports (last)
import type { CrisisDetection } from '../types';
import type { NavigationProp } from '@react-navigation/native';
```

### Blank Lines

Use blank lines to separate groups:

```typescript
import React from 'react';
import { View } from 'react-native';

import { theme } from '@/core/theme';

import { CrisisButton } from '@/features/crisis';

import type { Crisis } from './types';
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

### ❌ Mistake 2: Importing Internals

```typescript
// ❌ Bad
import { CrisisButton } from '@/features/crisis/components/CrisisButton';

// ✅ Good
import { CrisisButton } from '@/features/crisis';
```

### ❌ Mistake 3: Runtime Type Imports

```typescript
// ❌ Bad - creates runtime dependency
import { CrisisType } from '@/features/crisis';

// ✅ Good - type-only import
import type { CrisisType } from '@/features/crisis';
```

### ❌ Mistake 4: Barrel Export Everything

```typescript
// ❌ Bad - exports too much
// features/crisis/index.ts
export * from './components';
export * from './services';
export * from './stores';
// This imports EVERYTHING, including internal utilities

// ✅ Good - export selectively
export {
  CrisisButton,
  CrisisErrorBoundary
} from './components';
export {
  CrisisDetectionEngine,
  detectCrisis
} from './services';
```

## Questions?

Refer to:
- [Feature Structure](./feature-structure.md) - How features are organized
- [Codebase Organization](./codebase-organization.md) - Overall structure
- [Technical Patterns](./technical-patterns.md) - Implementation patterns
