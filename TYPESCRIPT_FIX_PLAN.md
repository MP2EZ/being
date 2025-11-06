# MAINT-79: TypeScript Error Fix Plan
**Total Errors**: 1,791
**Estimated Effort**: 36-51 hours
**Approach**: Phased systematic fixes with domain validation
**Status**: Created 2025-11-05

---

## Executive Summary

### Scope Discovery
- **Originally Reported**: 29 errors in `src/types/index.ts`
- **Actual Scope**: 1,791 errors across 200+ files
- **Root Cause**: Strict TypeScript configuration (appropriate for safety-critical mental health app)

### Strict Settings Enabled
```json
{
  "exactOptionalPropertyTypes": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "useUnknownInCatchVariables": true,
  "strict": true
}
```

### Safety-Critical Impact
**Blocked features until fixed**:
- Crisis detection (PHQ≥15/≥20, GAD≥15) - missing `CrisisDetection` types
- Assessment scoring (PHQ-9/GAD-7) - missing exports
- PHI encryption - type mismatches in `EncryptionService`
- HIPAA compliance - missing `PHIClassification` values

---

## Error Breakdown by Category

| Category | Count | % | Criticality | Phase |
|----------|-------|---|-------------|-------|
| Argument Type Mismatches (TS2345) | 543 | 30.3% | HIGH | 1, 3 |
| Logging Service Signatures (TS2554) | 409 | 22.8% | MEDIUM | 2 |
| Missing Type Definitions (TS2304) | 266 | 14.9% | HIGH | 1 |
| Unknown Type Errors (TS18046) | 88 | 4.9% | MEDIUM | 3 |
| Missing Properties (TS2353) | 68 | 3.8% | MEDIUM | 3 |
| Invalid React Native Props | 56 | 3.1% | MEDIUM | 2 |
| Property Not Found (TS2339) | 52 | 2.9% | MEDIUM | 4 |
| exactOptionalPropertyTypes (TS2375) | 45 | 2.5% | MEDIUM | 2 |
| Undefined Handling (TS18048) | 45 | 2.5% | HIGH | 3 |
| Type Assignment (TS2322) | 43 | 2.4% | MEDIUM | 3 |
| Module Import Errors (TS2307) | 31 | 1.7% | HIGH | 1 |
| Missing Exports (TS2614) | 10 | 0.6% | HIGH | 1 |
| Other Errors | 135 | 7.5% | VARIES | 4 |

---

## Phase 1: Critical Safety Types (8-12 hours)
**Priority**: CRITICAL
**Domain Validation**: crisis + compliance + philosopher
**Goal**: Unblock compilation and safety-critical features

### 1.1 Missing Crisis Types (src/types/index.ts)
**Errors**: 29 in index.ts, ~73 in crisis files
**File**: `app/src/types/index.ts:250-364`

**Missing Types to Export**:
```typescript
// Crisis & Safety (lines 250-262)
export type { CrisisDetection } from '../flows/assessment/types/crisis/safety';
export type { CrisisIntervention } from '../flows/assessment/types/crisis/safety';
export type { CrisisButtonProps } from '../components/crisis/CrisisButton';
export type { CrisisStoreState } from '../stores/crisisStore';

// Compliance & Privacy (lines 274-286)
export type { HIPAAConsent } from './compliance/hipaa';
export type { PHIClassification } from './compliance/hipaa';
export type { ConsentManagementProps } from '../components/compliance/ConsentManagement';
export type { ComplianceStoreState } from '../stores/complianceStore';
export type { HIPAAAuditLog } from './compliance/hipaa';

// Security (lines 295-307)
export type { AuthenticationSession } from '../services/security/auth';
export type { EncryptionKey } from '../services/security/encryption';
export type { SecurityEvent } from '../services/security/monitoring';
export type { SecurityAuthProps } from '../components/security/Auth';
export type { SecurityStoreState } from '../stores/securityStore';

// Performance (lines 316-323)
export type { PerformanceConstraint } from '../services/performance/constraints';
export type { PerformanceMetric } from '../services/performance/metrics';
export type { PerformanceTimingCategory } from '../services/performance/timing';

// Error Handling (lines 337-346)
export type { EnhancedError } from '../utils/errors';
export type { ErrorRecoveryStrategy } from '../utils/errors';
export type { ErrorContext } from '../utils/errors';
export type { sanitizeForUser } from '../utils/errorSanitization';

// Components & Stores (lines 355-364)
export type { BaseComponentProps } from '../components/common/BaseComponent';
export type { ComponentTheme } from '../theme/types';
export type { StoreConfig } from '../stores/types';
export type { StoreActions } from '../stores/types';
```

**Action Steps**:
1. ✅ Identify source files for each missing type
2. ✅ Verify types exist in source files (or create if missing)
3. ✅ Add export statements to index.ts
4. ✅ Verify no circular dependencies
5. ✅ Run typecheck to verify exports work

**Domain Validation**:
- **crisis agent**: Verify `CrisisDetection`, `CrisisIntervention` maintain PHQ≥15/≥20, GAD≥15 thresholds
- **compliance agent**: Verify `HIPAAConsent`, `PHIClassification` maintain HIPAA compliance
- **philosopher agent**: Verify assessment types maintain scoring accuracy

**Safety Checks**:
- [ ] PHQ-9 scoring still 100% accurate
- [ ] GAD-7 scoring still 100% accurate
- [ ] Crisis thresholds unchanged (PHQ≥15/≥20, GAD≥15)
- [ ] PHI classification complete

---

### 1.2 PHI Classification Missing Values
**Errors**: 11
**File**: `app/src/types/compliance/hipaa.ts`

**Issue**: `"therapeutic_preference"` not in `PHIClassification` union type

**Current PHIClassification**:
```typescript
export type PHIClassification =
  | "demographics"
  | "assessment_data"
  | "crisis_data"
  | "health_data"
  | "contact_information"
  | "authentication_data";
```

**Add**:
```typescript
export type PHIClassification =
  | "demographics"
  | "assessment_data"
  | "crisis_data"
  | "health_data"
  | "contact_information"
  | "authentication_data"
  | "therapeutic_preference";  // NEW
```

**Domain Validation**:
- **compliance agent**: Verify `therapeutic_preference` is correctly classified as PHI under HIPAA
- Confirm encryption requirements
- Update audit logging if needed

---

### 1.3 Assessment Component Exports
**Errors**: ~100
**Files**: `app/src/components/assessment/*`

**Missing Exports**:
```typescript
// AssessmentIntegrationExample.tsx
export type { ResponseMetadata };
export type { PerformanceMetrics };

// Assessment types
export type { PHQ9Result };
export type { GAD7Result };
```

**Action Steps**:
1. ✅ Add exports to component files
2. ✅ Update index.ts imports
3. ✅ Verify assessment scoring logic unchanged

**Domain Validation**:
- **philosopher agent**: Verify PHQ-9/GAD-7 scoring remains 100% accurate
- **crisis agent**: Verify crisis detection thresholds unchanged

---

### 1.4 Module Import Errors
**Errors**: 31
**Files**: Various

**Common Issues**:
```typescript
// Missing exports
export type { AdvancedScreenReaderContextValue } from './AdvancedScreenReader';
export type { FocusContextValue } from './FocusManager';
export type { useAdvancedAccessibilityStatus } from './advanced';
```

**Action Steps**:
1. ✅ Add missing exports to source files
2. ✅ Update consuming files to import correctly
3. ✅ Verify no circular dependencies

---

### Phase 1 Completion Criteria
- [ ] All 29 types exported from `src/types/index.ts`
- [ ] `therapeutic_preference` added to `PHIClassification`
- [ ] Assessment component exports complete
- [ ] Module imports resolved
- [ ] `npm run typecheck` shows **<1,500 errors** (fixing ~300)
- [ ] Domain validation complete (crisis + compliance + philosopher)
- [ ] Safety regression tests pass

**Checkpoint**: Run `npm run typecheck 2>&1 | grep "^src/" | wc -l` after Phase 1

---

## Phase 2: Systematic Patterns (10-14 hours)
**Priority**: MEDIUM
**Domain Validation**: accessibility (for React Native props)
**Goal**: Fix repeating patterns with automation

### 2.1 Logging Service Signature Migration (409 errors)
**Pattern**: Logging functions now require `LogCategory` as first parameter

**Error Pattern**:
```
TS2554: Expected 2-3 arguments, but got 1
```

**Files Affected** (~50 files):
- `src/services/security/*` (200+ errors)
- `src/services/supabase/*` (100+ errors)
- `src/stores/*` (50+ errors)
- `src/components/*` (50+ errors)

**Before → After Examples**:
```typescript
// Pattern 1: logError
logError('Crisis detection failed:', error);
→ logError(LogCategory.CRISIS, 'Crisis detection failed:', error);

// Pattern 2: logPerformance
logPerformance('Assessment complete');
→ logPerformance('Assessment complete', durationMs, { category: 'computation' });

// Pattern 3: logInfo
logInfo('User logged in');
→ logInfo(LogCategory.AUTH, 'User logged in');

// Pattern 4: logWarning
logWarning('Low battery');
→ logWarning(LogCategory.SYSTEM, 'Low battery');
```

**LogCategory Mapping**:
```typescript
// Crisis-related logs
CrisisSecurityProtocol.ts → LogCategory.CRISIS
crisisPlanStore.ts → LogCategory.CRISIS

// Assessment logs
AssessmentIntegrationExample.tsx → LogCategory.ASSESSMENT
assessmentStore.ts → LogCategory.ASSESSMENT

// Security logs
SecurityMonitoringService.ts → LogCategory.SECURITY
EncryptionService.ts → LogCategory.SECURITY
IncidentResponseService.ts → LogCategory.SECURITY

// Compliance logs
SupabaseService.ts → LogCategory.DATA
SyncCoordinator.ts → LogCategory.SYNC

// System logs
Default fallback → LogCategory.SYSTEM
```

**Automation Script**:
```bash
#!/bin/bash
# File: fix-logging-signatures.sh

# Crisis logs
find app/src -name "*crisis*" -o -name "*Crisis*" | xargs sed -i '' \
  -e 's/logError(\("[^"]*"\)/logError(LogCategory.CRISIS, \1/g' \
  -e 's/logInfo(\("[^"]*"\)/logInfo(LogCategory.CRISIS, \1/g'

# Assessment logs
find app/src -name "*assessment*" -o -name "*Assessment*" | xargs sed -i '' \
  -e 's/logError(\("[^"]*"\)/logError(LogCategory.ASSESSMENT, \1/g'

# Security logs
find app/src/services/security -type f | xargs sed -i '' \
  -e 's/logError(\("[^"]*"\)/logError(LogCategory.SECURITY, \1/g'

# ... etc
```

**Action Steps**:
1. ✅ Create automation script for common patterns
2. ✅ Run script on categorized files
3. ✅ Manually fix remaining errors
4. ✅ Verify logging still works correctly
5. ✅ Check no logs lost

**Manual Review Required**:
- Crisis logging (verify correct category)
- Security incident logging (may need severity parameter)
- Performance logging (requires duration parameter)

---

### 2.2 Invalid React Native Accessibility Props (56 errors)
**Pattern**: Using ARIA-style props not supported by React Native

**Files Affected**:
- `app/src/components/accessibility/AccessibleInput.tsx`
- `app/src/components/accessibility/RadioGroup.tsx`
- `app/src/components/accessibility/advanced/*.tsx`

**Invalid Props to Remove**:
```typescript
// AccessibleInput.tsx (line 121)
❌ accessibilityRequired={required}
   // React Native doesn't support this prop - remove entirely

// RadioGroup.tsx (line 314)
❌ accessibilityLevel={2}
✅ accessibilityRole="header"
   // Use role instead of level

// RadioGroup.tsx (line 343)
❌ accessibilityDescribedBy={errorId}
✅ accessibilityHint={errorMessage}
   // Use hint instead of describedBy

❌ accessibilityLabelledBy={labelId}
   // Remove - not supported on mobile

// Pressable components
❌ onKeyPress={(event) => ...}
   // Remove - mobile doesn't have keyboard events
```

**Action Steps**:
1. ✅ Remove all `accessibilityRequired` props
2. ✅ Replace `accessibilityLevel` with `accessibilityRole="header"`
3. ✅ Replace `accessibilityDescribedBy` with `accessibilityHint`
4. ✅ Remove `accessibilityLabelledBy`
5. ✅ Remove `onKeyPress` from Pressable
6. ✅ Test screen reader functionality after changes

**Domain Validation**:
- **accessibility agent**: Review all prop removals
- Verify screen reader still works correctly
- Test WCAG AA compliance maintained
- Verify crisis button still accessible (<3 taps)

**Safety Checks**:
- [ ] Crisis button still accessible
- [ ] Assessment UI still navigable
- [ ] Screen reader announces correctly

---

### 2.3 exactOptionalPropertyTypes Violations (45 errors)
**Pattern**: Optional props must explicitly include `| undefined`

**Files Affected**: Component prop interfaces across codebase

**Before → After**:
```typescript
// Before (ERROR)
interface Props {
  onSkip?: () => void;
  currentAnswer?: AssessmentResponse;
  error?: string;
}

// After (FIXED)
interface Props {
  onSkip?: (() => void) | undefined;
  currentAnswer?: AssessmentResponse | undefined;
  error?: string | undefined;
}
```

**Action Steps**:
1. ✅ Find all optional props in component interfaces
2. ✅ Add `| undefined` to each optional prop type
3. ✅ Verify no breaking changes to component usage

**Automation Pattern**:
```bash
# Find interfaces with optional props
grep -r "?" app/src --include="*.tsx" --include="*.ts" | grep "interface"
```

---

### Phase 2 Completion Criteria
- [ ] All 409 logging signature errors fixed
- [ ] All 56 invalid React Native props removed
- [ ] All 45 exactOptionalPropertyTypes violations fixed
- [ ] `npm run typecheck` shows **<1,000 errors** (fixing ~500)
- [ ] Accessibility validation complete
- [ ] Logging still works correctly

**Checkpoint**: Run `npm run typecheck 2>&1 | grep "^src/" | wc -l` after Phase 2

---

## Phase 3: Type Safety Improvements (8-12 hours)
**Priority**: MEDIUM
**Domain Validation**: None required (technical fixes)
**Goal**: Add proper type guards and null checks

### 3.1 Undefined Handling (90 errors)
**Pattern**: `string | undefined` not assignable to `string`

**Error Example**:
```
TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'
```

**Files Affected**:
- `app/src/utils/errorSanitization.ts:131`
- `app/src/components/accessibility/FocusManager.tsx` (multiple)
- `app/src/theme/accessibility.ts` (multiple)

**Before → After**:
```typescript
// Before (ERROR)
const id = element.id;  // string | undefined
someFunction(id);       // Expects string

// After (FIXED)
const id = element.id;
if (!id) {
  throw new Error('Element ID is required');
}
someFunction(id);  // Now definitely string

// OR use optional chaining
const result = element.id ? someFunction(element.id) : defaultValue;

// OR use nullish coalescing
const id = element.id ?? 'default-id';
someFunction(id);
```

**Common Patterns**:
```typescript
// Pattern 1: Array indexing (noUncheckedIndexedAccess)
const item = array[0];  // T | undefined
// Fix:
const item = array[0];
if (!item) throw new Error('Array is empty');

// Pattern 2: Optional property access
const value = obj.optionalProp;  // string | undefined
// Fix:
if (!obj.optionalProp) return;
const value = obj.optionalProp;  // Now string

// Pattern 3: String parsing
const r = parseInt(hex.slice(0, 2), 16);  // number, but hex might be too short
// Fix:
if (hex.length < 6) throw new Error('Invalid hex color');
const r = parseInt(hex.slice(0, 2), 16);
```

**Action Steps**:
1. ✅ Identify all undefined handling errors
2. ✅ Add type guards (if checks) before usage
3. ✅ Use optional chaining where appropriate
4. ✅ Add nullish coalescing for defaults
5. ✅ Verify no runtime behavior changes

**Safety-Critical Files** (extra care):
- `app/src/flows/assessment/*` (assessment scoring)
- `app/src/stores/crisisStore.ts` (crisis detection)
- `app/src/services/security/*` (encryption)

---

### 3.2 Unknown Type in Catch Blocks (88 errors)
**Pattern**: `useUnknownInCatchVariables: true` requires explicit typing

**Error Example**:
```
TS18046: 'error' is possibly 'undefined'
```

**Before → After**:
```typescript
// Before (ERROR)
try {
  await somethingDangerous();
} catch (error) {
  console.log(error.message);  // ERROR: 'error' is unknown
}

// After (FIXED)
try {
  await somethingDangerous();
} catch (error: unknown) {
  const err = error instanceof Error
    ? error
    : new Error(String(error));
  logError(LogCategory.SYSTEM, err.message, err);
}
```

**Standard Error Handler**:
```typescript
function handleError(error: unknown, category: LogCategory, context: string): Error {
  if (error instanceof Error) {
    logError(category, `${context}: ${error.message}`, error);
    return error;
  }

  const err = new Error(`${context}: ${String(error)}`);
  logError(category, err.message, err);
  return err;
}

// Usage
try {
  await dangerousOperation();
} catch (error: unknown) {
  throw handleError(error, LogCategory.SYSTEM, 'Operation failed');
}
```

**Action Steps**:
1. ✅ Find all catch blocks
2. ✅ Add `error: unknown` typing
3. ✅ Add error type guards
4. ✅ Use standard error handler pattern
5. ✅ Verify error logging still works

---

### 3.3 Argument Type Mismatches (543 errors)
**Pattern**: Various type mismatches

**Common Issues**:
```typescript
// Issue 1: Wrong severity type
logPerformance(operation, metrics, 'critical');  // ERROR
→ logPerformance(operation, metrics, { severity: 'critical' as const });

// Issue 2: Number vs string
const userId = localStorage.get('userId');  // string | null
saveUser(userId);  // Expects number
→ const userId = localStorage.get('userId');
  if (!userId) throw new Error('No user ID');
  saveUser(parseInt(userId, 10));

// Issue 3: Unknown union narrowing
function processSeverity(s: unknown) {
  logError(LogCategory.SYSTEM, 'Error', s);  // ERROR: unknown not assignable to severity
}
→ const validSeverities = ['low', 'medium', 'high', 'critical'] as const;
  type Severity = typeof validSeverities[number];
  function isSeverity(s: unknown): s is Severity {
    return typeof s === 'string' && validSeverities.includes(s as Severity);
  }
  if (!isSeverity(s)) throw new Error('Invalid severity');
  logError(LogCategory.SYSTEM, 'Error', s);
```

**Action Steps**:
1. ✅ Categorize argument type errors
2. ✅ Fix each category systematically
3. ✅ Add type guards where needed
4. ✅ Verify no runtime changes

---

### 3.4 Missing Properties (68 errors)
**Pattern**: Property doesn't exist on type

**Common Issues**:
```typescript
// Issue: Accessing property not in type definition
store.persistState();  // ERROR: Property 'persistState' does not exist

// Fix: Add to type definition
interface EducationState {
  // ... existing properties
  persistState: () => Promise<void>;
}
```

**Action Steps**:
1. ✅ Identify missing properties
2. ✅ Add to type definitions
3. ✅ Verify properties actually exist at runtime

---

### Phase 3 Completion Criteria
- [ ] All 90 undefined handling errors fixed
- [ ] All 88 unknown type catch blocks fixed
- [ ] All 543 argument type mismatches resolved
- [ ] All 68 missing properties added
- [ ] `npm run typecheck` shows **<200 errors** (fixing ~800)
- [ ] No runtime behavior changes
- [ ] Error handling still works correctly

**Checkpoint**: Run `npm run typecheck 2>&1 | grep "^src/" | wc -l` after Phase 3

---

## Phase 4: Remaining Fixes (10-13 hours)
**Priority**: LOW-MEDIUM
**Domain Validation**: security (for security service fixes)
**Goal**: Complete all remaining errors

### 4.1 Override Modifiers (6 errors)
**Pattern**: `noImplicitOverride: true` requires explicit `override` keyword

**Files**:
- `app/src/components/crisis/CrisisErrorBoundary.tsx` (4 errors)
- `app/src/components/common/ErrorBoundary.tsx` (2 errors)

**Before → After**:
```typescript
// Before (ERROR)
class CrisisErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // ...
  }
}

// After (FIXED)
class CrisisErrorBoundary extends React.Component {
  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // ...
  }
}
```

**Action Steps**:
1. ✅ Add `override` to `componentDidCatch`
2. ✅ Add `override` to `getDerivedStateFromError`
3. ✅ Verify error boundaries still work

**Effort**: 15 minutes

---

### 4.2 JSX Namespace (11 errors)
**Pattern**: Missing JSX type definitions

**Fix**:
```typescript
// Add to files with JSX errors
import React from 'react';

// OR verify @types/react is installed
npm list @types/react
```

**Action Steps**:
1. ✅ Add React imports where missing
2. ✅ Verify @types/react version
3. ✅ Check tsconfig.json jsx setting

**Effort**: 30 minutes

---

### 4.3 Security Service Type Fixes (200+ errors)
**Files**:
- `app/src/services/security/IncidentResponseService.ts` (115 errors)
- `app/src/services/security/SecurityMonitoringService.ts` (89 errors)
- `app/src/services/security/crisis/CrisisSecurityProtocol.ts` (73 errors)
- `app/src/services/security/EncryptionService.ts` (67 errors)

**Common Patterns**:
- Logging signature errors (covered in Phase 2)
- Type mismatches for severity levels
- Undefined handling for security events
- PHI encryption type issues

**Domain Validation**:
- **security agent**: Review all encryption changes
- **compliance agent**: Verify PHI handling unchanged
- Verify no security vulnerabilities introduced

**Action Steps**:
1. ✅ Fix logging signatures (from Phase 2 patterns)
2. ✅ Fix severity type mismatches
3. ✅ Add undefined checks for security events
4. ✅ Fix PHI encryption types
5. ✅ Security agent review

**Safety Checks**:
- [ ] Encryption still uses AES-256
- [ ] PHI still encrypted at rest
- [ ] Security events still logged
- [ ] No data leaks introduced

---

### 4.4 Store Type Fixes (50+ errors)
**Files**:
- `app/src/stores/crisisPlanStore.ts` (30+ errors)
- `app/src/stores/educationStore.ts` (20+ errors)
- `app/src/stores/valuesStore.ts` (10+ errors)

**Common Issues**:
- Missing `persistState` methods in type definitions
- exactOptionalPropertyTypes violations
- LogCategory property access errors (`LogCategory.Crisis` → `LogCategory.CRISIS`)

**Before → After**:
```typescript
// Issue 1: Wrong LogCategory property
logError('Failed', { category: LogCategory.Crisis });
→ logError(LogCategory.CRISIS, 'Failed');

// Issue 2: Missing method in type
interface EducationState {
  // Add:
  persistState: () => Promise<void>;
}

// Issue 3: Optional property spreading
const update = {
  valueId?: newId,  // ERROR with exactOptionalPropertyTypes
};
→ const update = {
  ...(newId ? { valueId: newId } : {}),
};
```

**Action Steps**:
1. ✅ Fix LogCategory property names (Crisis → CRISIS)
2. ✅ Add missing methods to type definitions
3. ✅ Fix optional property patterns
4. ✅ Verify store state management unchanged

---

### 4.5 Supabase Service Fixes (100+ errors)
**Files**:
- `app/src/services/supabase/SyncCoordinator.ts` (94 errors)
- `app/src/services/supabase/SupabaseService.ts` (40+ errors)

**Common Issues**:
- Logging signature errors
- Environment variable access (TS4111)
- Type mismatches for severity
- Undefined handling for optional operations

**Environment Variable Fix**:
```typescript
// Before (ERROR)
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
// TS4111: Property must be accessed with bracket notation

// After (FIXED)
const url = process.env['EXPO_PUBLIC_SUPABASE_URL'];
```

**Action Steps**:
1. ✅ Fix logging signatures
2. ✅ Fix environment variable access
3. ✅ Add undefined checks for sync operations
4. ✅ Verify data sync still works

---

### 4.6 Remaining Property Access Errors (52 errors)
**Pattern**: Property doesn't exist on type

**Common Issues**:
```typescript
// Issue: Color property doesn't exist
const color = theme.colors.teal;  // ERROR: 'teal' doesn't exist
→ const color = theme.colors.primary;  // Use defined color

// Issue: Property access on possibly undefined
const value = result.data.field;  // ERROR: 'data' is possibly undefined
→ if (!result.data) throw new Error('No data');
  const value = result.data.field;
```

**Action Steps**:
1. ✅ Fix color property references
2. ✅ Add undefined checks before property access
3. ✅ Update type definitions if properties missing

---

### Phase 4 Completion Criteria
- [ ] All 6 override modifier errors fixed
- [ ] All 11 JSX namespace errors fixed
- [ ] All 200+ security service errors fixed
- [ ] All 50+ store errors fixed
- [ ] All 100+ Supabase errors fixed
- [ ] All 52 property access errors fixed
- [ ] `npm run typecheck` shows **0 errors** ✅
- [ ] Security agent validation complete
- [ ] All stores still work correctly

**Final Checkpoint**: Run `npm run typecheck` → should show **0 errors**

---

## Domain Validation Requirements

### When to Involve Each Agent

**crisis agent** - REQUIRED for:
- [ ] Phase 1.1: Crisis type exports (`CrisisDetection`, `CrisisIntervention`)
- [ ] Phase 1.3: Assessment component exports (PHQ-9/GAD-7)
- [ ] Phase 2.1: Crisis logging signature changes
- [ ] Phase 4.3: Crisis security protocol fixes
- [ ] Phase 4.4: Crisis plan store fixes
- **Validates**: PHQ≥15/≥20, GAD≥15 thresholds, crisis detection timing (<200ms), 988 access

**compliance agent** - REQUIRED for:
- [ ] Phase 1.1: HIPAA type exports (`HIPAAConsent`, `PHIClassification`)
- [ ] Phase 1.2: PHI classification additions
- [ ] Phase 4.3: PHI encryption type fixes
- [ ] Phase 4.4: Compliance store fixes
- **Validates**: HIPAA compliance, PHI handling, encryption, consent management, audit logging

**philosopher agent** - REQUIRED for:
- [ ] Phase 1.3: Assessment scoring type changes
- [ ] Any changes to educational content types
- **Validates**: PHQ-9/GAD-7 100% scoring accuracy, assessment integrity

**security agent** - REQUIRED for:
- [ ] Phase 4.3: Security service fixes (200+ errors)
- [ ] Phase 4.3: Encryption service fixes
- [ ] Phase 4.3: Incident response fixes
- **Validates**: Encryption strength (AES-256), secure storage, no data leaks, vulnerability prevention

**accessibility agent** - REQUIRED for:
- [ ] Phase 2.2: React Native accessibility prop removals
- **Validates**: Screen reader compatibility (WCAG AA), crisis button accessibility (<3 taps), keyboard navigation

---

## Testing Checkpoints

### After Phase 1 (Critical Safety Types)
```bash
# Type check
npm run typecheck  # Should show <1,500 errors

# Crisis detection test
npm run test -- __tests__/crisis/detection.test.ts --verbose

# Assessment scoring test
npm run test -- __tests__/assessment/scoring.test.ts --verbose

# PHI encryption test
npm run test:encryption
```

**Manual Testing**:
- [ ] Crisis button accessible (<3 taps from any screen)
- [ ] PHQ-9 scoring calculates correctly (test with known answers)
- [ ] GAD-7 scoring calculates correctly (test with known answers)
- [ ] Crisis thresholds trigger correctly (PHQ≥15, PHQ≥20, GAD≥15)

---

### After Phase 2 (Systematic Patterns)
```bash
# Type check
npm run typecheck  # Should show <1,000 errors

# Logging test
npm run test -- __tests__/services/logging.test.ts --verbose

# Accessibility test
npm run test -- __tests__/accessibility/screen-reader.test.ts --verbose
```

**Manual Testing**:
- [ ] Logs still appear in console
- [ ] Log categories correct (crisis logs show CRISIS category)
- [ ] Screen reader announces correctly
- [ ] Crisis button still accessible

---

### After Phase 3 (Type Safety)
```bash
# Type check
npm run typecheck  # Should show <200 errors

# Error handling test
npm run test -- __tests__/utils/errors.test.ts --verbose

# Full test suite
npm test -- --passWithNoTests --verbose
```

**Manual Testing**:
- [ ] Error boundaries still catch errors
- [ ] Error messages still user-friendly
- [ ] No unexpected crashes

---

### After Phase 4 (Completion)
```bash
# Final type check
npm run typecheck  # Should show 0 errors ✅

# Full test suite
npm test -- --passWithNoTests --verbose

# Integration tests
npm run test:integration -- --passWithNoTests

# Clinical validation
npm run test:clinical -- --passWithNoTests

# Performance tests
npm run perf:crisis  # <200ms
npm run perf:breathing  # 60fps
```

**Manual Testing - Full Regression**:
- [ ] Crisis button (<3s access from all screens)
- [ ] PHQ-9 scoring (all 27 combinations)
- [ ] GAD-7 scoring (all 21 combinations)
- [ ] Crisis threshold detection (PHQ≥15, PHQ≥20, GAD≥15)
- [ ] 988 integration works
- [ ] Data encryption at rest
- [ ] Offline mode works
- [ ] Screen reader compatibility (WCAG AA)
- [ ] Breathing exercise (60s × 3 = 180s exact)

---

## Progress Tracking

### Phase 1: Critical Safety Types
- [ ] 1.1 Missing crisis types exported (29 types)
- [ ] 1.2 PHI classification updated
- [ ] 1.3 Assessment component exports added
- [ ] 1.4 Module imports resolved
- [ ] Domain validation: crisis ✓ | compliance ✓ | philosopher ✓
- [ ] Testing checkpoint passed
- [ ] Typecheck: _____ errors remaining (target: <1,500)

### Phase 2: Systematic Patterns
- [ ] 2.1 Logging signatures migrated (409 fixes)
- [ ] 2.2 React Native props fixed (56 fixes)
- [ ] 2.3 exactOptionalPropertyTypes fixed (45 fixes)
- [ ] Domain validation: accessibility ✓
- [ ] Testing checkpoint passed
- [ ] Typecheck: _____ errors remaining (target: <1,000)

### Phase 3: Type Safety
- [ ] 3.1 Undefined handling (90 fixes)
- [ ] 3.2 Unknown catch blocks (88 fixes)
- [ ] 3.3 Argument type mismatches (543 fixes)
- [ ] 3.4 Missing properties (68 fixes)
- [ ] Testing checkpoint passed
- [ ] Typecheck: _____ errors remaining (target: <200)

### Phase 4: Remaining Fixes
- [ ] 4.1 Override modifiers (6 fixes)
- [ ] 4.2 JSX namespace (11 fixes)
- [ ] 4.3 Security services (200+ fixes)
- [ ] 4.4 Store fixes (50+ fixes)
- [ ] 4.5 Supabase fixes (100+ fixes)
- [ ] 4.6 Property access (52 fixes)
- [ ] Domain validation: security ✓
- [ ] Testing checkpoint passed
- [ ] Typecheck: **0 errors** ✅

### Final Validation
- [ ] All domain agents validated
- [ ] Full regression test suite passed
- [ ] Manual testing complete
- [ ] Documentation updated
- [ ] Commit created
- [ ] Notion updated to "Testing"

---

## Safety-Critical Reminders

### NON-NEGOTIABLE Requirements
1. **PHQ-9 scoring must remain 100% accurate** - verify with all 27 combinations
2. **GAD-7 scoring must remain 100% accurate** - verify with all 21 combinations
3. **Crisis thresholds unchanged**: PHQ≥15 (support), PHQ≥20 (intervention), GAD≥15 (support)
4. **Crisis button accessible in <3 taps** from any screen
5. **Crisis detection <200ms** (measured)
6. **All PHI encrypted at rest** (AES-256)
7. **WCAG AA compliance** maintained
8. **Breathing timer exact**: 60s × 3 = 180s

### Before Any Commit
- [ ] Run `npm run typecheck` → 0 errors
- [ ] Run `npm test -- --passWithNoTests`
- [ ] Test crisis button manually
- [ ] Test PHQ-9/GAD-7 scoring manually
- [ ] Verify no console errors

### If Something Breaks
1. **STOP** - Do not proceed to next phase
2. Identify what broke (testing, compilation, runtime)
3. Revert last changes if needed
4. Get domain agent validation
5. Fix and re-test before continuing

---

## Quick Reference

### Run Typecheck
```bash
npm run typecheck
npm run typecheck 2>&1 | grep "^src/" | wc -l  # Count errors
```

### Run Tests
```bash
npm test -- --passWithNoTests --verbose
npm run test:clinical -- --passWithNoTests
npm run test:integration -- --passWithNoTests
npm run test:encryption
```

### Performance Tests
```bash
npm run perf:crisis  # Target: <200ms
npm run perf:breathing  # Target: 60fps
```

### Git Commands
```bash
git status
git add .
git commit -m "fix: MAINT-79 Phase N - [description]"
```

### Domain Agent Validation
See `.claude/templates/being-templates.md` → B-DEV template → Privacy Path

---

## File Locations

**This Plan**: `/Users/max/Development/active/being/maint-79/TYPESCRIPT_FIX_PLAN.md`
**Being Templates**: `/Users/max/Development/active/being/.claude/templates/being-templates.md`
**Types Index**: `/Users/max/Development/active/being/maint-79/app/src/types/index.ts`
**HIPAA Types**: `/Users/max/Development/active/being/maint-79/app/src/types/compliance/hipaa.ts`

---

## Estimated Timeline

| Phase | Estimated Hours | Actual Hours | Notes |
|-------|----------------|--------------|-------|
| Phase 1 | 8-12 | ___ | Critical safety types |
| Phase 2 | 10-14 | ___ | Systematic patterns |
| Phase 3 | 8-12 | ___ | Type safety |
| Phase 4 | 10-13 | ___ | Remaining fixes |
| Testing | 8-10 | ___ | Validation & regression |
| **Total** | **36-51** | **___** | |

**Started**: 2025-11-05
**Target Completion**: TBD
**Status**: Phase 1 - Ready to begin

---

*Last Updated: 2025-11-05*
*Work Item: MAINT-79*
*Branch: chore/maint-79-fix-existing-typescript-errors*
*Worktree: /Users/max/Development/active/being/maint-79*
