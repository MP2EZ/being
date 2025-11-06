# Logging Category Reference Guide

Quick reference for which `LogCategory` to use in different files.

## Category Mapping by File Path

### LogCategory.SECURITY
**When:** Encryption, authentication, PHI protection, security monitoring

**Files:**
- `src/services/security/**/*` (all security services)
- `src/services/security/crisis/CrisisSecurityProtocol.ts`

**Examples:**
```typescript
logError(LogCategory.SECURITY, 'Encryption failed', error);
logDebug(LogCategory.SECURITY, 'Token validated', { method: 'biometric' });
logSecurity('Auth bypass attempt', 'critical', { userId: hash(id) });
```

---

### LogCategory.SYNC
**When:** Cloud backup, Supabase operations, offline sync, network operations

**Files:**
- `src/services/supabase/**/*` (all Supabase/sync services)
- `src/components/sync/SyncStatusIndicator.tsx`
- `src/components/settings/CloudBackupSettings.tsx`

**Examples:**
```typescript
logError(LogCategory.SYNC, 'Sync failed', error);
logInfo(LogCategory.SYNC, 'Backup completed', { size: bytes, duration: ms });
logSync('Upload started', { direction: 'upload', size: 1024 });
```

---

### LogCategory.PERFORMANCE
**When:** Performance monitoring, timing, memory, rendering, optimization

**Files:**
- `src/services/performance/**/*` (all performance services)
- `src/hooks/useAssessmentPerformance.ts`

**Examples:**
```typescript
logError(LogCategory.PERFORMANCE, 'Render timeout', error);
logPerformance('Assessment render', duration, { threshold: 300, category: 'render' });
logDebug(LogCategory.PERFORMANCE, 'Memory usage', { mb: 150 });
```

---

### LogCategory.CRISIS
**When:** Crisis detection, PHQ-9/GAD-7 scoring, 988 integration, intervention workflows

**Files:**
- `src/services/crisis/**/*` (all crisis services)
- `src/components/crisis/CrisisErrorBoundary.tsx`
- `src/flows/shared/components/CollapsibleCrisisButton.tsx`
- `src/flows/shared/components/SafetyButton.tsx`
- `src/screens/crisis/**/*`
- Any file handling PHQ >= 15/20 or GAD >= 15

**Examples:**
```typescript
logError(LogCategory.CRISIS, 'PHQ-9 threshold exceeded', { threshold: 15 });
logCrisis('988 button activated', { detectionTime: 50, severity: 'critical' });
logInfo(LogCategory.CRISIS, 'Crisis plan updated', { contactCount: 3 });
```

**CRITICAL:** Never log PHI - use sanitized context only!

---

### LogCategory.ASSESSMENT
**When:** Assessment UI, questions, scoring (non-crisis), results display, flow

**Files:**
- `src/components/assessment/**/*`
- `src/flows/assessment/**/*`
- Assessment-related components and stores

**Examples:**
```typescript
logError(LogCategory.ASSESSMENT, 'Question render failed', error);
logAssessment('Assessment completed', { type: 'PHQ-9', questionCount: 9 });
logDebug(LogCategory.ASSESSMENT, 'Answer recorded', { questionIndex: 5 });
```

---

### LogCategory.ACCESSIBILITY
**When:** Screen readers, VoiceOver, high contrast, accessibility features

**Files:**
- `src/components/accessibility/**/*`
- Any file implementing WCAG features

**Examples:**
```typescript
logError(LogCategory.ACCESSIBILITY, 'Screen reader announcement failed', error);
logAccessibility('VoiceOver enabled', { feature: 'voiceOver', action: 'enabled' });
logInfo(LogCategory.ACCESSIBILITY, 'High contrast activated');
```

---

### LogCategory.AUTH
**When:** Biometric auth, login, sessions, token management (not security events)

**Files:**
- Auth-related UI components
- Login/logout flows
- Session management (non-security aspects)

**Examples:**
```typescript
logError(LogCategory.AUTH, 'Biometric auth failed', error);
logAuth('Login successful', { method: 'biometric', duration: 1200 });
logInfo(LogCategory.AUTH, 'Session refreshed');
```

**Note:** Security aspects of auth use `LogCategory.SECURITY`

---

### LogCategory.ANALYTICS
**When:** User analytics, anonymized metrics, usage tracking

**Files:**
- `src/services/analytics/**/*`
- Analytics-related components

**Examples:**
```typescript
logError(LogCategory.ANALYTICS, 'Analytics submission failed', error);
logAnalytics('Feature used', { category: 'check-in', result: 'success' });
logInfo(LogCategory.ANALYTICS, 'Session started');
```

**CRITICAL:** Never log PHI - anonymize all user data!

---

### LogCategory.SYSTEM
**When:** App lifecycle, navigation, themes, general app state, error boundaries

**Files:**
- `src/contexts/**/*`
- `src/screens/**/*` (non-crisis, non-assessment)
- `src/navigation/**/*`
- `src/components/ErrorBoundary.tsx`
- `src/components/monitoring/**/*`
- `src/services/logging/**/*`
- `src/services/deployment/**/*`
- `src/services/resilience/**/*`
- `src/services/monitoring/**/*` (general monitoring)
- `src/services/compliance/**/*` (HIPAA compliance)

**Examples:**
```typescript
logError(LogCategory.SYSTEM, 'Navigation failed', error);
logSystem('App backgrounded', { state: 'background', duration: 5000 });
logInfo(LogCategory.SYSTEM, 'Theme changed', { theme: 'dark' });
```

---

## Decision Tree

Not sure which category? Follow this tree:

```
START
│
├─ Is it about crisis detection, PHQ/GAD scores, or 988?
│  → LogCategory.CRISIS
│
├─ Is it about encryption, auth security, or PHI protection?
│  → LogCategory.SECURITY
│
├─ Is it about performance metrics, timing, or memory?
│  → LogCategory.PERFORMANCE
│
├─ Is it about assessment UI, questions, or results (non-crisis)?
│  → LogCategory.ASSESSMENT
│
├─ Is it about cloud sync, Supabase, or offline operations?
│  → LogCategory.SYNC
│
├─ Is it about screen readers, VoiceOver, or accessibility?
│  → LogCategory.ACCESSIBILITY
│
├─ Is it about user login, biometric auth, or sessions?
│  → LogCategory.AUTH
│
├─ Is it about anonymized analytics or usage metrics?
│  → LogCategory.ANALYTICS
│
└─ Everything else (navigation, themes, app state, etc.)
   → LogCategory.SYSTEM
```

---

## Special Cases

### Crisis-Related Assessment Logging
**Question:** Assessment file has crisis threshold logic - which category?

**Answer:** Use BOTH categories where appropriate:
```typescript
// General assessment logging
logInfo(LogCategory.ASSESSMENT, 'Assessment started', { type: 'PHQ-9' });

// Crisis threshold detection
if (score >= 15) {
  logError(LogCategory.CRISIS, 'PHQ-9 threshold exceeded', { threshold: 15 });
}
```

### Security vs System
**Question:** Error boundary caught an error - SECURITY or SYSTEM?

**Answer:**
- Generic error boundaries → `LogCategory.SYSTEM`
- Crisis-specific error boundaries → `LogCategory.CRISIS`
- Security-related errors (auth, encryption) → `LogCategory.SECURITY`

### Performance vs Crisis
**Question:** Crisis button performance monitoring - PERFORMANCE or CRISIS?

**Answer:** Context determines:
```typescript
// Performance monitoring of crisis feature
logPerformance('Crisis button render', duration, { category: 'render' });

// Crisis detection event
logError(LogCategory.CRISIS, 'Crisis button activated', { detectionTime: 50 });
```

---

## Import Patterns by Directory

```typescript
// Services (same directory)
import { LogCategory } from '../logging';

// Services (subdirectory)
import { LogCategory } from '../../logging';

// Components
import { LogCategory } from '../../../services/logging';
import { LogCategory } from '../../services/logging';

// Flows
import { LogCategory } from '../../../services/logging';

// Screens
import { LogCategory } from '../../services/logging';

// Hooks
import { LogCategory } from '../../services/logging';
```

**Tip:** Let TypeScript auto-import suggest the correct path.

---

## Quick Validation

After categorizing, verify:

1. **Does this category match the file's primary purpose?**
   - Yes → Correct
   - No → Re-evaluate using decision tree

2. **Would filtering logs by this category be useful?**
   - Yes → Correct category
   - No → Consider LogCategory.SYSTEM

3. **Does this align with monitoring needs?**
   - Security alerts → SECURITY
   - Performance dashboards → PERFORMANCE
   - Crisis monitoring → CRISIS
   - General debugging → SYSTEM

---

## Category Priority (for conflicts)

When a file legitimately spans multiple categories:

1. **CRISIS** - Highest priority (safety-critical)
2. **SECURITY** - High priority (PHI protection)
3. **ASSESSMENT** - Clinical accuracy
4. **PERFORMANCE** - User experience
5. **SYNC** - Data integrity
6. **ACCESSIBILITY** - Inclusive design
7. **AUTH** - User access
8. **ANALYTICS** - Product insights
9. **SYSTEM** - Default/fallback

**Example:** A file that does crisis assessment rendering:
- Use `LogCategory.CRISIS` for threshold detection
- Use `LogCategory.ASSESSMENT` for question rendering
- Use `LogCategory.PERFORMANCE` for timing metrics

---

## Anti-Patterns

**DON'T:**
```typescript
// ❌ Wrong category
logError(LogCategory.SYSTEM, 'Encryption failed', error);  // Should be SECURITY

// ❌ Too specific (no such category)
logError(LogCategory.PHQ9, 'Score calculated');  // Use ASSESSMENT or CRISIS

// ❌ Missing category
logError('Something failed', error);  // Missing LogCategory parameter
```

**DO:**
```typescript
// ✅ Correct category
logError(LogCategory.SECURITY, 'Encryption failed', error);

// ✅ Use existing categories
logError(LogCategory.ASSESSMENT, 'Score calculated', { type: 'PHQ-9' });

// ✅ Always include category
logError(LogCategory.SYSTEM, 'Something failed', error);
```

---

## Testing Categories

To verify your categorization:

```bash
# Count categories by type
grep -r "LogCategory\." src/ | cut -d. -f2 | cut -d, -f1 | sort | uniq -c

# Expected distribution:
#   ~200 SECURITY
#   ~100 PERFORMANCE
#    ~80 SYNC
#    ~40 CRISIS
#    ~30 ASSESSMENT
#    ~20 ACCESSIBILITY
#    ~20 SYSTEM
#    ~10 AUTH
#    ~10 ANALYTICS
```

---

## Questions?

- **Unsure which category?** → Default to `LogCategory.SYSTEM`
- **Multiple categories apply?** → Use primary purpose of file
- **New domain needed?** → Review with architect before adding
- **Edge case?** → Document in `LOGGING_MANUAL_FIXES.md`
