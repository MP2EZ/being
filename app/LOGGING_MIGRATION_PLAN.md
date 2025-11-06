# TypeScript Logging Migration - Execution Plan

## Overview
Fix 409 TypeScript TS2554 errors from logging service signature changes.

**Error Pattern:** `Expected 2-3 arguments, but got 1`

**Root Cause:** Logging functions now require `LogCategory` as first parameter:
```typescript
// OLD:
logError('message', error)

// NEW:
logError(LogCategory.SECURITY, 'message', error)
```

---

## Error Distribution

| Category | Files | Errors | Time | Impact |
|----------|-------|--------|------|---------|
| Security | 7 | ~200 | 15m | HIGH - Data protection |
| Sync | 6 | ~72 | 5m | MEDIUM - Cloud backup |
| Performance | 9 | ~87 | 5m | MEDIUM - Monitoring |
| Assessment | 6 | ~20 | 3m | HIGH - Clinical accuracy |
| Accessibility | 9 | ~15 | 3m | MEDIUM - A11y compliance |
| Crisis | 9 | ~20 | 3m | CRITICAL - Safety |
| System/Misc | 17 | ~15 | 3m | LOW - General logging |

**Total:** 42 files, 409 errors, ~37 minutes automated

---

## Execution Steps

### Step 1: Backup & Baseline (1 min)
```bash
# Create backup branch
git checkout -b fix/logging-signatures-backup
git push -u origin fix/logging-signatures-backup

# Record baseline
npx tsc --noEmit 2>&1 | grep -c TS2554
# Should show: 409
```

### Step 2: Run Automated Fixes (5 min)
```bash
cd /Users/max/Development/active/being/maint-79/app

# Make scripts executable and run master script
chmod +x scripts/fix-all-logging.sh
bash scripts/fix-all-logging.sh
```

**What it does:**
1. Fixes Security services → `LogCategory.SECURITY` (~200 errors)
2. Fixes Sync services → `LogCategory.SYNC` (~72 errors)
3. Fixes Performance services → `LogCategory.PERFORMANCE` (~87 errors)
4. Fixes Assessment components → `LogCategory.ASSESSMENT` (~20 errors)
5. Fixes Accessibility → `LogCategory.ACCESSIBILITY` (~15 errors)
6. Fixes System files → `LogCategory.SYSTEM` (~15 errors)
7. Fixes Crisis services → `LogCategory.CRISIS` (~20 errors) **LAST for safety**

**Progress tracking:**
- Script shows remaining errors after each category
- Final count displayed at end

### Step 3: Verify Automated Fixes (2 min)
```bash
# Check remaining errors
npx tsc --noEmit 2>&1 | grep TS2554 | wc -l

# Expected: 0-20 errors (edge cases)

# If 0 errors:
echo "✅ All fixed! Skip to Step 5"

# If >0 errors:
echo "⚠️  Manual fixes needed - proceed to Step 4"
npx tsc --noEmit 2>&1 | grep TS2554 > remaining-errors.txt
```

### Step 4: Manual Fixes (10-30 min, if needed)

Review `LOGGING_MANUAL_FIXES.md` for:

**Common remaining issues:**

1. **logPerformance() calls without duration:**
   ```typescript
   // Find:
   grep -r "logPerformance(" src/ | grep -v "duration"

   // Fix: Add duration parameter
   const startTime = Date.now();
   // ... operation ...
   logPerformance('operation', Date.now() - startTime, { category: 'render' });
   ```

2. **logSecurity() calls without severity:**
   ```typescript
   // Find:
   grep -r "logSecurity(" src/ | grep -v "severity"

   // Fix: Add severity level
   logSecurity('event', 'low', { result: 'success' });
   ```

3. **Ambiguous categories:**
   - Use decision tree in `LOGGING_MANUAL_FIXES.md`
   - Check file path for context hints
   - Review surrounding code logic

### Step 5: Validation (5 min)

```bash
# 1. Type check
npx tsc --noEmit
# Expected: 0 TS2554 errors

# 2. Build check
npm run build
# Expected: Success

# 3. Test critical paths
npm test -- --testPathPattern="crisis|assessment"
# Expected: All crisis detection tests pass

# 4. Verify imports
grep -r "import.*LogCategory" src/ | wc -l
# Expected: ~42-50 files with imports

# 5. Check for double-fixes (shouldn't happen)
grep -r "LogCategory.SECURITY, LogCategory" src/
# Expected: Empty output
```

### Step 6: Safety Checks (3 min)

**Critical validations:**

```bash
# 1. Crisis detection logging intact
grep -A 3 "score >= 15\|score >= 20\|gadScore >= 15" src/ | grep -i logerror
# Expected: All use LogCategory.CRISIS

# 2. No console.log in production
grep -r "console\.log\|console\.error" src/services src/flows src/components | grep -v "// DEV:"
# Expected: Empty or only debug/dev comments

# 3. Security events have proper severity
grep -r "logSecurity.*'critical'" src/services/security
# Expected: Only for severe events (encryption failure, breach, etc.)
```

### Step 7: Commit & Test (5 min)

```bash
# Stage changes
git add src/ scripts/

# Commit with clear message
git commit -m "fix: Update logging signatures to require LogCategory

- Add LogCategory parameter to all logError/logDebug/logInfo calls
- Categorize by domain: SECURITY, SYNC, PERFORMANCE, ASSESSMENT, etc.
- Fix 409 TypeScript TS2554 signature errors
- Maintain crisis detection logging integrity
- Add imports for LogCategory across 42 files

Automated via category-specific scripts, manual review for edge cases.

Fixes: #MAINT-79
Category: TypeScript, Logging, Safety"

# Push to branch
git push origin fix/logging-signatures-backup

# Run CI/CD tests (if available)
npm run test:ci
```

---

## Rollback Plan

If issues arise:

```bash
# Option 1: Rollback specific category
git checkout HEAD -- src/services/security/
bash scripts/fix-logging-security.sh  # Re-run with fixes

# Option 2: Full rollback
git reset --hard HEAD~1

# Option 3: Emergency revert
git revert HEAD
```

---

## Success Criteria

- [ ] **0 TS2554 errors:** `npx tsc --noEmit | grep -c TS2554` returns 0
- [ ] **Build succeeds:** `npm run build` completes without errors
- [ ] **Crisis detection intact:** PHQ/GAD logging uses `LogCategory.CRISIS`
- [ ] **No console.log:** Production code uses structured logging only
- [ ] **Type safety maintained:** All logging calls type-check correctly
- [ ] **Performance preserved:** No regression in logging performance
- [ ] **Tests pass:** All existing tests pass, especially crisis detection

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Break crisis detection | Low | Critical | Test PHQ/GAD thresholds after fixes |
| Wrong category assigned | Medium | Low | Manual review of ambiguous cases |
| Import path errors | Low | Low | Script handles relative paths |
| Performance regression | Very Low | Low | Logging is already optimized |
| Double-fix (category twice) | Very Low | Medium | Regex patterns are exclusive |

**Overall Risk:** LOW - Automated regex fixes are safe and reversible

---

## Time Estimates

| Phase | Optimistic | Realistic | Pessimistic |
|-------|-----------|-----------|-------------|
| Setup & Baseline | 1m | 2m | 5m |
| Automated Fixes | 3m | 5m | 10m |
| Verification | 2m | 5m | 10m |
| Manual Fixes | 0m | 10m | 30m |
| Validation | 3m | 5m | 10m |
| Commit & Test | 3m | 5m | 10m |
| **TOTAL** | **12m** | **32m** | **75m** |

**Expected:** 30-40 minutes with ~10 manual fixes

---

## Post-Migration

After successful migration:

1. **Update documentation:**
   - Add LogCategory usage to logging docs
   - Update onboarding guide with new patterns

2. **Create linting rule (future):**
   ```javascript
   // ESLint rule to enforce LogCategory parameter
   "no-restricted-syntax": ["error", {
     "selector": "CallExpression[callee.name=/^log(Error|Debug|Info)$/]:not([arguments.0.object.name='LogCategory'])",
     "message": "Logging functions must include LogCategory as first parameter"
   }]
   ```

3. **Monitor for regressions:**
   - Check Sentry/error logs for missing context
   - Verify crisis detection metrics unchanged
   - Monitor logging performance metrics

---

## Support

**Questions?** Review:
- `LOGGING_MANUAL_FIXES.md` - Edge cases and patterns
- `src/services/logging/index.ts` - New signatures and examples
- `src/services/logging/ProductionLogger.ts` - Implementation details

**Issues?** Check:
1. Import path correct for file location
2. LogCategory value matches file domain
3. All parameters provided (category, message, optional context/error)
4. No double-fixes (grep for duplicate categories)

**Emergency?** Rollback and ping @crisis or @compliance for crisis/security files.
