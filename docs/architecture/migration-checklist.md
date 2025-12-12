# Codebase Reorganization Migration Checklist

Track progress of the comprehensive codebase reorganization to feature-based architecture.

## Migration Status

**Start Date:** 2025-01-15
**Target Completion:** 2025-02-05
**Current Phase:** Phase 0 - Preparation

---

## Phase -1: Safety Checkpoint ✅

- [x] Verify clean git status
- [x] Commit current state
- [x] Create backup branch (`backup/pre-reorganization-20251115`)
- [x] **Commit:** `e5ead31` - "chore: snapshot before codebase reorganization"

**Rollback Point:** `git reset --hard e5ead31`

---

## Phase 0: Preparation 🔄

- [x] Move `docs/architecture.md` → `docs/architecture/technical-patterns.md`
- [x] Create `/docs/architecture/README.md`
- [x] Create `/docs/architecture/codebase-organization.md`
- [x] Create `/docs/architecture/feature-structure.md`
- [x] Create `/docs/architecture/import-guidelines.md`
- [x] Create `/docs/architecture/migration-checklist.md`
- [ ] Update `tsconfig.json` with new path aliases
- [ ] Create `scripts/validate-migration.sh`
- [ ] Test documentation links
- [ ] **Commit:** "chore: prepare for codebase reorganization"

---

## Phase 1: Core Infrastructure ⏳

- [ ] Create `/src/core/` directory structure
- [ ] Move `theme/` → `core/theme/`
- [ ] Move `constants/colors.ts` → `core/theme/colors.ts`
- [ ] Move `constants/devMode.ts` → `core/constants/`
- [ ] Move `utils/errorSanitization.ts` → `core/utils/`
- [ ] Move `contexts/SimpleThemeContext.tsx` → `core/providers/ThemeProvider.tsx`
- [ ] Move `navigation/*` → `core/navigation/`
- [ ] Update all imports to use `@/core/*`
- [ ] Run type check: `npx tsc --noEmit`
- [ ] Run tests: `npm test`
- [ ] **Commit:** "refactor: migrate core infrastructure"

---

## Phase 2: Crisis Domain ⚠️ CRITICAL ⏳

- [ ] Create `/src/features/crisis/` structure
- [ ] Move `services/crisis/*` → `features/crisis/services/`
- [ ] Move `services/security/crisis/*` → `features/crisis/services/`
- [ ] Move `components/crisis/*` → `features/crisis/components/`
- [ ] Move `components/accessibility/advanced/CrisisAccessibility.tsx` → `features/crisis/components/`
- [ ] Move `screens/crisis/*` → `features/crisis/screens/`
- [ ] Move `stores/crisisPlanStore.ts` → `features/crisis/stores/`
- [ ] Move `flows/assessment/types/crisis/*` → `features/crisis/types/`
- [ ] Move `flows/shared/components/CollapsibleCrisisButton.tsx` → `features/crisis/components/`
- [ ] Create barrel exports (`index.ts` files)
- [ ] Update all crisis imports to use `@/features/crisis`
- [ ] Run crisis tests: `npm run test:crisis`
- [ ] Run performance tests: `npm run test:performance -- --testPathPattern=crisis`
- [ ] Verify <200ms crisis detection
- [ ] Manual test: Crisis button on all screens
- [ ] **Commit:** "refactor: consolidate crisis domain into single feature"

---

## Phase 3: Assessment Domain ⚠️ CLINICAL ⏳

- [ ] Create `/src/features/assessment/` structure
- [ ] Move `flows/assessment/*` → `features/assessment/`
- [ ] Move `components/assessment/*` → `features/assessment/components/`
- [ ] Move `components/AssessmentStatusBadge.tsx` → `features/assessment/components/`
- [ ] Move `hooks/useAssessmentPerformance.ts` → `features/assessment/hooks/`
- [ ] Create barrel exports
- [ ] Update all assessment imports
- [ ] Run clinical tests: `npm run test:clinical`
- [ ] Verify PHQ-9 scoring (27 combinations)
- [ ] Verify GAD-7 scoring (21 combinations)
- [ ] Verify crisis thresholds (PHQ≥15, ≥20, GAD≥15)
- [ ] Manual test: Complete PHQ-9 and GAD-7 assessments
- [ ] **Commit:** "refactor: consolidate assessment domain"

---

## Phase 4: Daily Practices ⏳

- [ ] Create `/src/features/daily-practices/` structure
- [ ] Move `flows/morning/*` → `features/daily-practices/morning/`
- [ ] Move `flows/midday/*` → `features/daily-practices/midday/`
- [ ] Move `flows/evening/*` → `features/daily-practices/evening/`
- [ ] Move `flows/shared/*` → `features/daily-practices/shared/`
- [ ] Move `services/premeditationSafetyService.ts` → `features/daily-practices/services/`
- [ ] Update navigation references
- [ ] Run integration tests: `npm run test:integration -- --testPathPattern=checkin`
- [ ] Manual test: Complete morning, midday, evening flows
- [ ] **Commit:** "refactor: consolidate daily practices feature"

---

## Phase 5: Learning Feature ⏳

- [ ] Create `/src/features/learning/` structure
- [ ] Move `screens/learn/*` → `features/learning/`
- [ ] Move `services/moduleContent.ts` → `features/learning/services/`
- [ ] Move `stores/educationStore.ts` → `features/learning/stores/`
- [ ] Move `stores/stoicPracticeStore.ts` → `features/learning/stores/`
- [ ] Move `types/education.ts` → `features/learning/types/`
- [ ] Move `types/stoic.ts` → `features/learning/types/`
- [ ] Run tests: `npm run test:unit -- --testPathPattern=learn`
- [ ] Manual test: Navigate learn tab, complete a practice
- [ ] **Commit:** "refactor: consolidate learning feature"

---

## Phase 6: Remaining Features ⏳

- [ ] Create `features/profile/`
- [ ] Create `features/subscription/`
- [ ] Create `features/sync/`
- [ ] Create `features/insights/`
- [ ] Create `features/home/`
- [ ] Create `features/onboarding/`
- [ ] Move profile screens, components, stores
- [ ] Move subscription components, services, stores, types
- [ ] Move sync components, services, hooks
- [ ] Move insights screens
- [ ] Move home screens
- [ ] Move onboarding screens, types
- [ ] Run per-feature tests
- [ ] **Commit:** "refactor: migrate remaining features"

---

## Phase 7: Cross-Cutting Concerns ⏳

- [ ] Create `/src/compliance/` structure
- [ ] Create `/src/analytics/` structure
- [ ] Move `services/compliance/*` → `compliance/services/`
- [ ] Move `types/compliance/*` → `compliance/types/`
- [ ] Move `services/analytics/*` → `analytics/services/`
- [ ] Run tests: `npm run test:unit -- --testPathPattern=compliance`
- [ ] **Commit:** "refactor: migrate cross-cutting concerns"

---

## Phase 8: Core Services ⏳

- [ ] Move `services/logging/` → `core/services/logging/`
- [ ] Move `services/monitoring/` → `core/services/monitoring/`
- [ ] Move `services/performance/` → `core/services/performance/`
- [ ] Move `services/resilience/` → `core/services/resilience/`
- [ ] Move `services/security/` → `core/services/security/`
- [ ] Move `services/session/` → `core/services/session/`
- [ ] Move `services/deployment/` → `core/services/deployment/`
- [ ] Run full test suite
- [ ] **Commit:** "refactor: migrate core services"

---

## Phase 9: Core Components ⏳

- [ ] Move `components/accessibility/*` → `core/components/accessibility/`
- [ ] Move `components/shared/*` → `core/components/shared/`
- [ ] Move `components/monitoring/*` → `core/components/monitoring/`
- [ ] Move `components/ErrorBoundary.tsx` → `core/components/feedback/`
- [ ] Move `components/CelebrationToast.tsx` → `core/components/feedback/`
- [ ] Run component tests
- [ ] **Commit:** "refactor: migrate core components"

---

## Phase 10: Cleanup & Finalization ⏳

- [ ] Remove old directories:
  - [ ] `rm -rf src/components`
  - [ ] `rm -rf src/screens`
  - [ ] `rm -rf src/services`
  - [ ] `rm -rf src/stores`
  - [ ] `rm -rf src/flows`
- [ ] Remove old path aliases from `tsconfig.json`
- [ ] Create all feature barrel exports
- [ ] Run final validation:
  - [ ] `npm run type-check`
  - [ ] `npm run test:all`
  - [ ] `npm run test:clinical`
  - [ ] `npm run test:performance`
  - [ ] `npm run lint`
- [ ] Manual testing checklist:
  - [ ] Crisis button accessible from all screens
  - [ ] PHQ-9 assessment scores correctly
  - [ ] GAD-7 assessment scores correctly
  - [ ] Crisis thresholds trigger correctly
  - [ ] Morning check-in completes
  - [ ] Evening check-in completes
  - [ ] Stoic practice completes
  - [ ] Offline mode works
  - [ ] Cloud sync works
- [ ] Update `/CONTRIBUTING.md`
- [ ] Create per-feature documentation
- [ ] **Final Commit:** "refactor: complete codebase reorganization to feature-based architecture"

---

## Success Criteria

- [x] Safety checkpoint created
- [ ] All 10 phases completed
- [ ] All tests passing (100%)
- [ ] No TypeScript errors
- [ ] Performance maintained:
  - [ ] Crisis <200ms
  - [ ] Assessment <300ms
  - [ ] Launch <2s
- [ ] Clinical accuracy validated:
  - [ ] PHQ-9: 27 combinations
  - [ ] GAD-7: 21 combinations
  - [ ] Thresholds correct
- [ ] No circular dependencies
- [ ] Documentation complete
- [ ] Git history clean with checkpoints

---

## Rollback Procedures

### Full Rollback (to pre-reorganization)
```bash
git reset --hard e5ead31
# Or use backup branch
git reset --hard backup/pre-reorganization-20251115
```

### Phase-Specific Rollback
```bash
# Rollback to previous phase
git log --oneline | grep "refactor:"  # Find phase commit
git reset --hard [commit-hash]
```

### Partial Rollback (keep some phases)
```bash
# Rollback specific files
git checkout [commit-hash] -- path/to/file
```

---

## Issues & Notes

### Issues Encountered

_Document any issues encountered during migration and their resolutions_

### Performance Impact

**Before:**
- _Baseline metrics to be recorded_

**After:**
- _Post-migration metrics to be recorded_

### Developer Feedback

_Collect feedback from team on new structure_
