# Being. Complete Renaming Plan

**Generated:** December 17, 2024
**Total Files:** 631
**Total References:** 2,321
**Status:** Implementation Phase

---

## 1. Executive Summary

### Renaming Strategy
- **Visual Representations:** "Being." (with period)
- **Code/Technical:** "being" (lowercase, no period to save characters)
- **Scope:** Complete application, website, intellectual property, and all code references

### Impact Assessment
- **631 files** require updates across the entire codebase
- **2,321 individual references** to be changed
- **Critical safety systems** must be preserved during transition
- **Storage migration** required for existing user data
- **URL scheme changes** will affect deep linking

---

## 2. Critical Safety Considerations

⚠️ **MUST PRESERVE DURING RENAMING:**
- PHQ-9/GAD-7 clinical algorithms and scoring accuracy
- Crisis detection thresholds (PHQ-9 ≥20, GAD-7 ≥15)
- Emergency response flows and 988 hotline integration
- Assessment data integrity and encryption
- Therapeutic timing (3-minute breathing sessions)
- User safety protocols and crisis intervention

⚠️ **HIGH-RISK CHANGES:**
- Storage key migrations (user data loss risk)
- URL scheme changes (deep linking breakage)
- Widget communication protocols
- Crisis flow dependencies

---

## 3. Categorized Changes

### 3.1 Configuration Files (Priority 1 - Foundation)
- `app/app.json`: App name, slug, scheme
- `app/eas.json`: Project ID, slug references
- `app/package.json`: Package name, description
- `app/jest.config.js`: Test configuration names

### 3.2 Storage Keys (Priority 1 - BREAKING CHANGES)
**Current → New:**
- `@fullmind_*` → `@being_*`
- `fullmind_widget_data` → `being_widget_data`
- `fullmind_assessments_*` → `being_assessments_*`
- `fullmind_resumable_session_*` → `being_resumable_session_*`
- `fullmind_session_index` → `being_session_index`

**Migration Required:** Existing user data must be migrated to new keys

### 3.3 URL Schemes (Priority 1 - BREAKING CHANGES)
- `fullmind://` → `being://`
- Deep linking protocol updates
- Widget communication scheme changes
- External integration updates

### 3.4 Component Names (Priority 2 - Refactoring)
- Class/component names: `FullMind*` → `Being*`
- Variable names: `fullmind*` → `being*`
- File renames where applicable
- Import statement updates

### 3.5 Documentation (Priority 3 - Non-Breaking)
- All `.md` files in documentation/
- Code comments and JSDoc
- Test descriptions
- CLAUDE.md configurations
- README files

### 3.6 Assets & Resources (Priority 2 - Visual)
- Logo files and brand assets
- Splash screens and app icons
- Marketing materials
- Font and theme configurations

---

## 4. Implementation Phases

### Phase 1: Documentation & Planning ✅
1. ✅ Create comprehensive renaming document
2. 🔄 Generate detailed file analysis
3. ⏳ Create automated replacement scripts
4. ⏳ Document validation procedures
5. ⏳ Prepare rollback protocols

### Phase 2: Non-Breaking Changes
1. Update all documentation files
2. Update code comments and descriptions
3. Update test descriptions
4. Update internal documentation

### Phase 3: Configuration Updates
1. Update app.json and package.json
2. Update build configurations
3. Update environment variables
4. Update CI/CD pipeline references

### Phase 4: Code Refactoring
1. Update component names
2. Update variable names
3. Update import statements
4. Update type definitions

### Phase 5: Breaking Changes (Critical)
1. Implement storage key migration
2. Update URL scheme handling
3. Update widget configurations
4. Update deep linking handlers

### Phase 6: Assets & Resources
1. Update logo files and branding
2. Update splash screens and icons
3. Update marketing materials
4. Update theme configurations

### Phase 7: Validation & Testing
1. Run full regression test suite
2. Validate crisis flow functionality
3. Verify assessment accuracy
4. Test data migration procedures
5. Perform end-to-end validation

---

## 5. Automated Scripts

### 5.1 Bulk Replacement Script
*[To be generated]*

### 5.2 Validation Script
*[To be generated]*

### 5.3 Rollback Script
*[To be generated]*

---

## 6. Manual Review Checklist

### Critical Safety Validation
- [ ] Crisis detection logic unchanged
- [ ] PHQ-9/GAD-7 scoring algorithms preserved
- [ ] Emergency response flows functional
- [ ] 988 hotline integration working
- [ ] Assessment data integrity maintained

### Technical Validation
- [ ] Storage migration tested with sample data
- [ ] Deep links functioning with new scheme
- [ ] Widget functionality confirmed
- [ ] Component imports resolved
- [ ] Build process successful

### User Experience Validation
- [ ] App branding updated consistently
- [ ] Visual assets display correctly
- [ ] Navigation flows unaffected
- [ ] Performance benchmarks maintained

---

## 7. File-by-File Change Log

*[Detailed analysis to be completed]*

### Configuration Files
- `app/app.json`: [Changes to be documented]
- `app/eas.json`: [Changes to be documented]
- `app/package.json`: [Changes to be documented]

### Source Code Files
*[631 files to be analyzed and documented]*

---

## 8. Risk Assessment

### HIGH RISK (Potential Data Loss/Breaking Changes)
- **Storage Key Migration**: Existing user data could be lost
- **URL Scheme Changes**: Deep linking functionality could break
- **Widget Communication**: External integrations could fail

### MEDIUM RISK (Functionality Issues)
- **Component Renames**: Import errors could occur
- **Build Configuration**: Build process could fail
- **Asset References**: Missing asset errors possible

### LOW RISK (Cosmetic/Documentation)
- **Documentation Updates**: No functional impact
- **Comment Changes**: No runtime impact
- **Test Descriptions**: No functionality impact

---

## 9. Validation Procedures

### Pre-Change Validation
1. Backup current database state
2. Document current functionality
3. Run complete test suite
4. Capture performance baselines

### Post-Change Validation
1. Run automated test suite (100% pass required)
2. Execute manual testing checklist
3. Validate crisis intervention flows
4. Test assessment accuracy
5. Verify data migration success
6. Confirm deep linking functionality

### User Acceptance Testing
1. Beta testing with clinical oversight
2. Performance benchmark comparison
3. User experience validation
4. Safety protocol confirmation

---

## 10. Rollback Plan

### Emergency Rollback Triggers
- Critical functionality broken
- Data integrity compromised
- Safety systems malfunctioning
- Performance severely degraded

### Rollback Procedures
1. **Immediate**: Git revert to last stable commit
2. **Database**: Restore from pre-migration backup
3. **Configuration**: Revert environment variables
4. **Assets**: Restore original branding assets
5. **Testing**: Validate rollback success

### Emergency Contacts
- Technical Lead: [Contact Info]
- Clinical Supervisor: [Contact Info]
- DevOps Engineer: [Contact Info]

---

## 11. Success Criteria

### Technical Success
- [ ] All 631 files successfully updated
- [ ] Zero test failures in regression suite
- [ ] No performance degradation
- [ ] Successful build and deployment

### Clinical Success
- [ ] Crisis detection accuracy maintained
- [ ] Assessment scoring 100% accurate
- [ ] User safety protocols functional
- [ ] Therapeutic effectiveness preserved

### Business Success
- [ ] Brand consistency across all touchpoints
- [ ] User experience seamless
- [ ] No user data loss
- [ ] App store compliance maintained

---

**Next Steps:**
1. Complete detailed file analysis
2. Generate automated scripts
3. Create migration procedures
4. Begin Phase 2 implementation

**Document Version:** 1.0
**Last Updated:** December 17, 2024
**Approved By:** [Pending]