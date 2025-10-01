# Type Definition Organization Plan

## Current State Analysis

### Well-Organized Areas ✅
- **Crisis types**: `/types/compliance/hipaa.ts`
- **Security types**: `/types/security/encryption.ts`
- **Performance types**: `/types/performance/constraints.ts`
- **Error types**: `/types/errors/recovery.ts`
- **Integration types**: `/types/integration/` (components.ts, store.ts)
- **Main index**: `/types/index.ts` (581 lines - manageable)

### Areas Needing Improvement ⚠️

#### 1. **onboarding-core.ts** (832 lines - TOO LARGE)
**Issue**: Monolithic file containing multiple unrelated type groups
**Impact**: Difficult to navigate, poor discoverability, tight coupling

**Recommended Split**:
```
/types/onboarding/
├── user-profile.ts       # User profile and preferences types
├── journey.ts            # Onboarding journey and flow types
├── validation.ts         # Onboarding validation types
├── progress.ts           # Progress tracking types
└── index.ts              # Re-exports for backward compatibility
```

#### 2. **flows.ts** (166 lines - MODERATE)
**Status**: Acceptable size but could benefit from categorization
**Recommendation**: Monitor for growth; consider splitting if exceeds 250 lines

## Migration Plan

### Phase 1: Create New Structure (1-2 hours)
1. Create `/types/onboarding/` directory
2. Analyze onboarding-core.ts and identify logical groupings
3. Create individual files with focused type definitions
4. Add JSDoc documentation to each new file

### Phase 2: Migrate Types (2-3 hours)
1. Move types to new files maintaining exact signatures
2. Update imports in new index.ts
3. Add deprecation warnings to onboarding-core.ts
4. Test TypeScript compilation

### Phase 3: Update Imports (1-2 hours)
1. Find all imports of onboarding-core.ts types
2. Update to use new modular structure
3. Run full TypeScript check
4. Run test suite

### Phase 4: Deprecate Old File (1 hour)
1. Add 2-sprint deprecation period
2. Remove onboarding-core.ts after migration period
3. Update main types/index.ts
4. Final TypeScript verification

## Performance Monitoring Export Audit

### Finding
**NO dual export pattern found** in `/services/performance/index.ts`

**Current State**:
- Only `PerformanceMonitor` is exported (line 25)
- No `performanceMonitor` (lowercase) export exists
- No migration needed

**Conclusion**: Story 4 appears to be **already complete** or was mischaracterized in the original work item.

## Best Practices Going Forward

### File Size Guidelines
- **Ideal**: <200 lines per type file
- **Acceptable**: 200-300 lines
- **Review needed**: 300-500 lines
- **Must split**: >500 lines

### Organization Principles
1. **Single Responsibility**: One domain per file
2. **Logical Grouping**: Related types together
3. **Clear Naming**: File names match content
4. **Consistent Exports**: Use barrel exports (index.ts)
5. **Documentation**: JSDoc for all public types

### Type File Structure
```typescript
/**
 * File: user-profile.ts
 * Purpose: User profile and preferences types
 * Related: onboarding/journey.ts, integration/store.ts
 */

// =============================================================================
// PUBLIC TYPES
// =============================================================================

export type UserProfile = {
  // ...
};

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type PartialUserProfile = Partial<UserProfile>;

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_USER_PROFILE: UserProfile = {
  // ...
};
```

## Implementation Timeline

| Phase | Duration | Priority |
|-------|----------|----------|
| Phase 1: Structure | 1-2 hours | P2 |
| Phase 2: Migration | 2-3 hours | P2 |
| Phase 3: Update Imports | 1-2 hours | P2 |
| Phase 4: Deprecate | 1 hour | P2 |
| **Total** | **5-8 hours** | **P2** |

## Success Criteria

- ✅ All type files <500 lines
- ✅ onboarding-core.ts split into 4-5 focused files
- ✅ No TypeScript compilation errors
- ✅ All tests passing
- ✅ Improved type discoverability
- ✅ Documentation updated

## Notes

- This is **technical debt cleanup**, not critical path
- Can be done incrementally over 2-3 sprints
- Low risk - backward compatibility maintained via barrel exports
- High value - improved developer experience and maintainability
