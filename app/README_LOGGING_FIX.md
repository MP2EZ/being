# Logging Signature Fix - Quick Start

## TL;DR

Fix 409 TypeScript errors in 30 minutes with automated scripts.

```bash
# 1. Run automated fixes
bash scripts/fix-all-logging.sh

# 2. Verify
npx tsc --noEmit | grep -c TS2554
# Expected: 0-20 errors

# 3. Review remaining (if any)
cat LOGGING_MANUAL_FIXES.md

# 4. Commit
git add src/ scripts/
git commit -m "fix: Update logging signatures to require LogCategory"
```

---

## What Changed?

**Before:**
```typescript
logError('Something failed', error);
logDebug('Debug info', context);
```

**After:**
```typescript
import { LogCategory } from './logging';

logError(LogCategory.SECURITY, 'Something failed', error);
logDebug(LogCategory.SYSTEM, 'Debug info', context);
```

**Why?** Structured logging for better filtering, monitoring, and HIPAA compliance.

---

## Files Created

| File | Purpose |
|------|---------|
| `scripts/fix-all-logging.sh` | **Master script** - Run this first |
| `scripts/fix-logging-security.sh` | Fix security services (200 errors) |
| `scripts/fix-logging-sync.sh` | Fix sync services (72 errors) |
| `scripts/fix-logging-performance.sh` | Fix performance services (87 errors) |
| `scripts/fix-logging-assessment.sh` | Fix assessment components (20 errors) |
| `scripts/fix-logging-accessibility.sh` | Fix accessibility components (15 errors) |
| `scripts/fix-logging-crisis.sh` | Fix crisis services (20 errors) |
| `scripts/fix-logging-system.sh` | Fix system files (15 errors) |
| `LOGGING_MIGRATION_PLAN.md` | **Detailed execution guide** |
| `LOGGING_MANUAL_FIXES.md` | Edge cases and manual patterns |
| `LOGGING_CATEGORY_REFERENCE.md` | Category selection guide |
| `README_LOGGING_FIX.md` | This file |

---

## Step-by-Step

### 1. Baseline Check
```bash
cd /Users/max/Development/active/being/maint-79/app
npx tsc --noEmit 2>&1 | grep -c TS2554
# Should show: 409 errors
```

### 2. Run Automated Fixes
```bash
bash scripts/fix-all-logging.sh
```

**What it does:**
- Adds `LogCategory` imports to all files
- Updates `logError()`, `logDebug()`, `logInfo()` signatures
- Categorizes by domain (SECURITY, SYNC, PERFORMANCE, etc.)
- Shows progress and remaining errors after each category

**Time:** ~5 minutes

### 3. Check Results
```bash
npx tsc --noEmit 2>&1 | grep -c TS2554
```

**If 0 errors:** Skip to Step 5 (Commit)

**If >0 errors:** Continue to Step 4 (Manual Review)

### 4. Manual Review (if needed)
```bash
# See remaining errors
npx tsc --noEmit 2>&1 | grep TS2554

# Review manual fix guide
cat LOGGING_MANUAL_FIXES.md
```

**Common remaining issues:**
- `logPerformance()` calls need duration parameter
- `logSecurity()` calls need severity parameter
- Ambiguous categories need manual classification

### 5. Validation
```bash
# Type check
npx tsc --noEmit

# Build check
npm run build

# Test crisis detection (CRITICAL)
npm test -- --testPathPattern="crisis"
```

### 6. Commit
```bash
git add src/ scripts/ LOGGING_*.md README_LOGGING_FIX.md
git commit -m "fix: Update logging signatures to require LogCategory

- Add LogCategory parameter to all logError/logDebug/logInfo calls
- Categorize by domain: SECURITY, SYNC, PERFORMANCE, ASSESSMENT, etc.
- Fix 409 TypeScript TS2554 signature errors
- Maintain crisis detection logging integrity

Fixes: #MAINT-79"
```

---

## Category Mapping Quick Reference

| Category | Use For | Files |
|----------|---------|-------|
| **SECURITY** | Encryption, auth, PHI protection | `src/services/security/**` |
| **SYNC** | Cloud backup, Supabase, offline | `src/services/supabase/**` |
| **PERFORMANCE** | Timing, memory, optimization | `src/services/performance/**`, `src/hooks/useAssessmentPerformance.ts` |
| **CRISIS** | PHQ/GAD scoring, 988, intervention | `src/services/crisis/**`, crisis components |
| **ASSESSMENT** | Assessment UI, questions, results | `src/components/assessment/**`, `src/flows/assessment/**` |
| **ACCESSIBILITY** | Screen readers, VoiceOver, a11y | `src/components/accessibility/**` |
| **AUTH** | Login, sessions, biometrics | Auth-related components |
| **ANALYTICS** | Usage tracking (anonymized) | `src/services/analytics/**` |
| **SYSTEM** | Navigation, themes, app state | Everything else |

**Detailed guide:** See `LOGGING_CATEGORY_REFERENCE.md`

---

## Troubleshooting

### Script fails with "file not found"
**Cause:** File doesn't exist (may have been moved/deleted)

**Fix:** Remove file from script's `FILES` array

### Import path errors
**Cause:** Relative path incorrect for file location

**Fix:** Adjust import manually:
```typescript
// Services
import { LogCategory } from '../logging';

// Components
import { LogCategory } from '../../../services/logging';
```

### "Expected 2-3 arguments" persists
**Cause:** Special signature (logPerformance, logSecurity)

**Fix:** See `LOGGING_MANUAL_FIXES.md` for patterns

### Double category (e.g., `LogCategory.SECURITY, LogCategory.SECURITY`)
**Cause:** Script ran twice on same file

**Fix:**
```bash
# Rollback file
git checkout -- src/path/to/file.ts

# Re-run specific script
bash scripts/fix-logging-<category>.sh
```

### Crisis tests fail
**Cause:** Crisis logging changed incorrectly

**Fix:**
```bash
# Check crisis files use LogCategory.CRISIS
grep -r "LogCategory\." src/services/crisis/ src/components/crisis/

# Verify PHQ/GAD threshold logging
grep -A 3 "score >= 15\|score >= 20" src/ | grep LogCategory.CRISIS
```

---

## Rollback

If something goes wrong:

```bash
# Rollback all changes
git checkout -- src/ scripts/

# Or rollback specific category
git checkout -- src/services/security/
bash scripts/fix-logging-security.sh  # Re-run
```

---

## Success Criteria

- [ ] 0 TS2554 errors: `npx tsc --noEmit | grep -c TS2554`
- [ ] Build succeeds: `npm run build`
- [ ] Crisis tests pass: `npm test -- --testPathPattern="crisis"`
- [ ] No console.log in production code
- [ ] All files have LogCategory imports
- [ ] Categories match file domains

---

## Time Estimates

| Scenario | Time |
|----------|------|
| **Automated only** (0 manual fixes) | 12 minutes |
| **Typical** (~10 manual fixes) | 30 minutes |
| **Complex** (20+ manual fixes) | 60 minutes |

---

## Support

**Questions?** Review:
- `LOGGING_MIGRATION_PLAN.md` - Detailed execution plan
- `LOGGING_MANUAL_FIXES.md` - Edge cases and patterns
- `LOGGING_CATEGORY_REFERENCE.md` - Category selection guide

**Issues with crisis/security files?** Ping domain experts for review.

---

## Next Steps (after merge)

1. Update linting rules to enforce LogCategory usage
2. Add category usage to logging documentation
3. Monitor Sentry for any logging regressions
4. Update developer onboarding with new patterns

---

**Ready?** Run `bash scripts/fix-all-logging.sh` to start!
