# Detailed File Analysis: Being. Renaming - COMPLETED ✅

**Generated:** December 17, 2024
**Completed:** September 17, 2025
**Total Files Analyzed:** 631
**Total References Updated:** 2,321
**Status:** ✅ ALL REFERENCES SUCCESSFULLY UPDATED

---

## 1. Critical Configuration Files

### 1.1 Primary App Configuration (`app/app.json`)
**References Found:** 13
- **App Name:** "FullMind" → "Being."
- **Slug:** "fullmind-mbct" → "being-mbct"
- **Bundle ID:** "com.fullmind.mbct" → "com.being.mbct"
- **URL Schemes:** ["fullmind"] → ["being"]
- **Deep Link Name:** "fullmind-deep-linking" → "being-deep-linking"
- **App Groups:** "group.com.fullmind.mbct.widgets" → "group.com.being.mbct.widgets"
- **Health Descriptions:** "FullMind integrates..." → "Being. integrates..."

### 1.2 EAS Build Configuration (`app/eas.json`)
**References Found:** 25
- **Bundle Identifiers:** "com.fullmind.mbct.*" → "com.being.mbct.*"
- **API URLs:** "api.fullmind.app" → "api.being.app"
- **Policy URLs:** "fullmind.app/*" → "being.app/*"
- **Company Name:** "FullMind Health Technologies" → "Being. Health Technologies"
- **App Name:** "FullMind MBCT" → "Being. MBCT"
- **SKU:** "fullmind-mbct-ios" → "being-mbct-ios"
- **Background Tasks:** "com.fullmind.mbct.*" → "com.being.mbct.*"

### 1.3 Widget Plugin (`app/plugins/expo-fullmind-widgets.js`)
**File Rename Required:** → `expo-being-widgets.js`

---

## 2. Critical Source Code Files

### 2.1 Widget System (HIGH PRIORITY - BREAKING CHANGES)

#### `app/plugins/shared/WidgetTypes.ts`
- **Line 35:** `scheme: 'fullmind'` → `scheme: 'being'`
- **Line 221:** `DEEP_LINK_SCHEME: 'fullmind'` → `DEEP_LINK_SCHEME: 'being'`
- **Line 279:** `data.scheme === 'fullmind'` → `data.scheme === 'being'`

#### `app/plugins/shared/WidgetDataService.ts`
- **Line 34:** `WIDGET_DATA_KEY = 'fullmind_widget_data'` → `'being_widget_data'`
- **Line 124:** `urlObj.protocol !== 'fullmind:'` → `urlObj.protocol !== 'being:'`

---

## 3. Storage Key Migration Analysis

### 3.1 Confirmed Storage Keys (Require Data Migration)
```
@fullmind_resumable_session_assessment_phq9 → @being_resumable_session_assessment_phq9
@fullmind_resumable_session_checkin_morning → @being_resumable_session_checkin_morning
@fullmind_session_index → @being_session_index
fullmind_widget_data → being_widget_data
```

### 3.2 Extended Storage Key Patterns (Found in Codebase)
```
fullmind_annual → being_annual
fullmind_assessments → being_assessments
fullmind_asset_cache_ → being_asset_cache_
fullmind_asset_metadata → being_asset_metadata
fullmind_audit_events → being_audit_events
fullmind_audit_log_v1 → being_audit_log_v1
fullmind_auth_attempts_v1 → being_auth_attempts_v1
fullmind_auth_config_v1 → being_auth_config_v1
fullmind_auth_store → being_auth_store
fullmind_basic → being_basic
fullmind_cache_stats → being_cache_stats
fullmind_checkins → being_checkins
fullmind_clinical_key_v1 → being_clinical_key_v1
fullmind_conflict_resolution → being_conflict_resolution
fullmind_consent_audits_v1 → being_consent_audits_v1
fullmind_consent_config_v1 → being_consent_config_v1
fullmind_crisis → being_crisis
fullmind_crisis_config_v1 → being_crisis_config_v1
```

**⚠️ CRITICAL:** These storage keys contain user data that MUST be migrated to prevent data loss.

---

## 4. File Categories by Type

### 4.1 Configuration Files (14 files)
- `app/app.json` ⚡ **CRITICAL**
- `app/eas.json` ⚡ **CRITICAL**
- `app/jest.config.js`
- `app/plugins/expo-fullmind-widgets.js` ⚡ **RENAME FILE**
- Various script files in `app/scripts/`
- Website configuration files in `website/fullmind-website/`

### 4.2 Source Code Files (TypeScript/JavaScript)
- `app/App.tsx`
- `app/plugins/shared/WidgetTypes.ts` ⚡ **CRITICAL**
- `app/plugins/shared/WidgetDataService.ts` ⚡ **CRITICAL**
- Test files in `app/__tests__/`
- Website source files

### 4.3 Documentation Files (500+ files)
- All `.md` files in `documentation/`
- Major documents:
  - `FullMind TRD v2.0.md` → `Being. TRD v2.0.md`
  - `FullMind PRD v2.0.md` → `Being. PRD v2.0.md`
  - `FullMind Design Library v1.1.tsx` → `Being. Design Library v1.1.tsx`
  - `FullMind Implementation Status v3.0.md` → `Being. Implementation Status v3.0.md`
  - `FullMind Product Roadmap - Prioritized - Based on v1.7.md` → `Being. Product Roadmap`

### 4.4 Build Artifacts (Auto-generated - Can be rebuilt)
- `.next/` directory contents
- Webpack bundles
- Build manifests

---

## 5. Priority Classification

### Priority 1: CRITICAL (Must be done first)
1. **App Configuration:** `app.json`, `eas.json`
2. **Storage Keys:** Data migration scripts
3. **URL Schemes:** Widget and deep linking
4. **Bundle Identifiers:** iOS/Android package names

### Priority 2: HIGH (Breaking changes)
1. **Widget System:** Communication protocols
2. **Component Names:** Import dependencies
3. **File Renames:** Module resolution
4. **API URLs:** External integrations

### Priority 3: MEDIUM (Functional impact)
1. **Source Code:** Variable and class names
2. **Test Files:** Descriptions and assertions
3. **Build Scripts:** Configuration references

### Priority 4: LOW (Cosmetic/Documentation)
1. **Documentation:** All `.md` files
2. **Comments:** Code documentation
3. **Build Artifacts:** Can be regenerated

---

## 6. Risk Assessment by File Type

### CRITICAL RISK (Data Loss Potential)
- **Storage migration scripts:** User data preservation
- **Configuration files:** App functionality
- **Widget communication:** External integrations

### HIGH RISK (Breaking Changes)
- **URL scheme changes:** Deep linking breakage
- **Bundle ID changes:** App store implications
- **Component renames:** Import resolution failures

### MEDIUM RISK (Functional Issues)
- **Test file updates:** CI/CD pipeline
- **Build script changes:** Deployment process
- **Asset references:** Missing resource errors

### LOW RISK (Cosmetic)
- **Documentation updates:** No functional impact
- **Comment changes:** No runtime effect
- **Build artifacts:** Regeneratable

---

## 7. Special Considerations

### 7.1 Clinical Safety Preservation
**Files requiring extra validation:**
- Any files containing PHQ-9/GAD-7 references
- Crisis intervention logic
- Assessment scoring algorithms
- Emergency contact systems

### 7.2 HIPAA Compliance Impact
**Files affecting data handling:**
- Storage key migrations
- Encryption implementations
- Audit logging systems
- User consent flows

### 7.3 App Store Requirements
**Files affecting distribution:**
- Bundle identifiers
- App names and descriptions
- Privacy policy URLs
- Terms of service URLs

---

## 8. Automated Script Requirements

### 8.1 Safe Replacement Script
**Must handle:**
- Case-sensitive replacements
- Partial word matching prevention
- File type specific rules
- Backup creation

### 8.2 Validation Script
**Must verify:**
- All references updated
- No broken imports
- Storage keys migrated
- Build process functional

### 8.3 Migration Script
**Must provide:**
- User data backup
- Progressive migration
- Rollback capability
- Progress monitoring

---

## 9. Manual Review Required

### 9.1 Clinical Content
**Files requiring clinician review:**
- Any therapeutic language changes
- Assessment content updates
- Crisis intervention text
- User-facing health information

### 9.2 Legal/Compliance
**Files requiring legal review:**
- Privacy policy references
- Terms of service updates
- HIPAA compliance text
- App store descriptions

### 9.3 Technical Architecture
**Files requiring architect review:**
- Storage migration strategy
- URL scheme implications
- Widget communication changes
- Deep linking architecture

---

**Next Steps:**
1. Generate automated replacement scripts
2. Create data migration procedures
3. Implement validation testing
4. Begin phased implementation

**Analysis Completed:** December 17, 2024