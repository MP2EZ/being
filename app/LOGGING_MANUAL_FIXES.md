# Logging Signature Manual Fixes

After running automated fixes, review these edge cases:

## Edge Cases Requiring Manual Review

### 1. logPerformance() Calls
**Issue**: `logPerformance()` signature changed to require duration parameter

**Old signature:**
```typescript
logPerformance(message: string, context?: any)
```

**New signature:**
```typescript
logPerformance(operation: string, duration: number, metadata?: {...})
```

**Fix pattern:**
```typescript
// Before:
logPerformance('Assessment render completed');

// After:
const duration = Date.now() - startTime;
logPerformance('Assessment render', duration, {
  category: 'render',
  threshold: 300
});
```

**Files to check:**
- Any files using `logPerformance()` without duration parameter

---

### 2. logSecurity() Calls
**Issue**: `logSecurity()` requires severity parameter

**Old signature:**
```typescript
logSecurity(message: string, context?: any)
```

**New signature:**
```typescript
logSecurity(event: string, severity: 'low'|'medium'|'high'|'critical', context?: {...})
```

**Fix pattern:**
```typescript
// Before:
logSecurity('Auth token validated');

// After:
logSecurity('Auth token validated', 'low', {
  method: 'biometric',
  result: 'success'
});
```

**Severity guidelines:**
- `critical`: Data breach, encryption failure, crisis data exposure
- `high`: Auth bypass, PHI leak potential, token compromise
- `medium`: Failed auth attempts, suspicious patterns
- `low`: Normal security events, successful validations

---

### 3. Ambiguous Categories

Some files may have unclear categories. Use this decision tree:

**Decision Tree:**
```
Does it involve crisis detection/PHQ/GAD scoring?
  → LogCategory.CRISIS

Does it involve encryption/auth/PHI protection?
  → LogCategory.SECURITY

Does it involve timing/performance metrics?
  → LogCategory.PERFORMANCE

Does it involve assessment UI/questions/results?
  → LogCategory.ASSESSMENT

Does it involve Supabase/cloud/offline sync?
  → LogCategory.SYNC

Does it involve screen readers/voice/accessibility?
  → LogCategory.ACCESSIBILITY

Does it involve user analytics (anonymized)?
  → LogCategory.ANALYTICS

Does it involve biometric/login/sessions?
  → LogCategory.AUTH

Everything else (navigation, theme, app lifecycle)?
  → LogCategory.SYSTEM
```

---

### 4. Convenience Function Migration

**OLD convenience functions (no longer available):**
```typescript
logCrisis(message, context)      // ❌ Don't use
logAssessment(event, context)     // ❌ Don't use
logSync(event, context)           // ❌ Don't use
logAccessibility(event, context)  // ❌ Don't use
```

**NEW patterns:**
```typescript
// Use logError/logInfo with explicit category
logError(LogCategory.CRISIS, message, error)
logInfo(LogCategory.ASSESSMENT, event, context)
logDebug(LogCategory.SYNC, event, context)
```

---

### 5. Special Cases: Crisis Detection

**CRITICAL**: Crisis detection logging must use `LogCategory.CRISIS` and preserve all context

**Example:**
```typescript
// PHQ-9 threshold detection
if (score >= 15) {
  logError(LogCategory.CRISIS, 'PHQ-9 moderate risk detected', {
    threshold: 15,
    detectionTime: Date.now() - startTime,
    interventionType: 'modal'
  });
}

// GAD-7 threshold detection
if (gadScore >= 15) {
  logError(LogCategory.CRISIS, 'GAD-7 severe anxiety detected', {
    threshold: 15,
    detectionTime: Date.now() - startTime,
    interventionType: 'redirect'
  });
}
```

---

## Validation Checklist

After all fixes:

- [ ] All TS2554 errors resolved: `npx tsc --noEmit | grep -c TS2554`
- [ ] Crisis detection still works: Check PHQ/GAD threshold logging
- [ ] No console.log() calls in production code
- [ ] LogCategory imports added to all files
- [ ] Performance logging includes duration parameter
- [ ] Security logging includes severity parameter
- [ ] Test compilation: `npm run type-check`
- [ ] Test build: `npm run build`

---

## Quick Reference: Import Paths

```typescript
// Services
import { LogCategory } from '../logging';
import { LogCategory } from '../../logging';

// Components
import { LogCategory } from '../../../services/logging';
import { LogCategory } from '../../services/logging';

// Flows
import { LogCategory } from '../../../services/logging';

// Screens
import { LogCategory } from '../../services/logging';
```

---

## Emergency Rollback

If automated fixes break something:

```bash
# Rollback all changes
git checkout -- src/

# Re-run specific category
bash scripts/fix-logging-<category>.sh

# Or fix individual file manually
```
