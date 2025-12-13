# Security Audit User Stories
**Generated:** 2025-12-10
**Source:** Comprehensive security, privacy, and crisis safety audit

---

## Critical (Blocking Production)

### SEC-01: Backend Authentication Implementation
**As a** user
**I need** real backend authentication
**So that** my account cannot be accessed by anyone entering any credentials

- **Audit:** Security - Authentication bypass
- **File:** `AuthenticationService.ts:766-831`
- **Issue:** Simulated auth accepts ANY username/password
- **CVSS:** 9.8

---

### SEC-02: Backend API Implementation
**As a** user
**I need** the app to connect to real API endpoints
**So that** my data is properly stored and retrieved

- **Audit:** Security - No backend API
- **File:** `NetworkSecurityService.ts:43-45`
- **Issue:** Hardcoded placeholder URLs

---

### SEC-03: Server-Side JWT Generation
**As a** user
**I need** JWT tokens generated server-side
**So that** my session cannot be forged by attackers

- **Audit:** Security - JWT forgery
- **File:** `AuthenticationService.ts:1032-1089`
- **Issue:** Client-side token generation with SHA-256 instead of HMAC
- **CVSS:** 9.1

---

### PRV-01: User Data Export
**As a** user
**I need** to export all my data (assessments, mood, practices)
**So that** I can exercise my data portability rights (CCPA/GDPR)

- **Audit:** Privacy - Data export missing
- **Risk:** Legal non-compliance

---

### PRV-02: iOS Privacy Manifest Update
**As a** user
**I need** the iOS app to declare health data collection in PrivacyInfo.xcprivacy
**So that** the app can be approved for App Store

- **Audit:** Privacy - iOS manifest incomplete
- **File:** `ios/Being/PrivacyInfo.xcprivacy:43-44`
- **Issue:** `NSPrivacyCollectedDataTypes: []` but app collects health data

---

### PRV-03: Android Data Safety Manifest
**As a** user
**I need** the Android app to have data safety declarations
**So that** the app can be approved for Google Play

- **Audit:** Privacy - Android manifest missing
- **Risk:** Google Play non-compliance

---

## High Priority

### SEC-04: Certificate Pinning
**As a** user
**I need** certificate pinning enabled
**So that** my data cannot be intercepted by man-in-the-middle attacks

- **Audit:** Security - Certificate pinning not implemented
- **File:** `NetworkSecurityService.ts:1181-1194`
- **Issue:** Configured but placeholder pins only
- **CVSS:** 8.1

---

### SEC-05: Input Validation
**As a** user
**I need** input validation on assessment forms
**So that** malicious input cannot compromise the app

- **Audit:** Security - Input validation
- **Recommendation:** Implement Zod schemas for PHQ-9/GAD-7

---

### SEC-06: Supabase Row-Level Security Verification
**As a** developer
**I need** Supabase Row-Level Security policies verified
**So that** users cannot access each other's data

- **Audit:** Security - RLS policies

---

### PRV-04: Cloud Backup PHI Filtering
**As a** user
**I need** cloud backup to explicitly filter PHI (raw PHQ/GAD scores)
**So that** only non-sensitive data is synced

- **Audit:** Privacy - Backup transparency
- **File:** `CloudBackupService.ts:400-415`

---

### PRV-05: Third-Party Service Disclosure
**As a** user
**I need** the privacy policy to disclose Supabase as a third-party service
**So that** I understand where my data goes

- **Audit:** Privacy - Third-party disclosure
- **File:** `docs/brand-legal/legal/privacy-policy.md`

---

### CRS-01: Production Performance Monitoring
**As an** operator
**I need** production performance monitoring with alerts
**So that** I know if crisis response times degrade below 200ms

- **Audit:** Crisis - Performance monitoring
- **Requirement:** <200ms crisis detection response

---

### CRS-02: 3-Second Access E2E Tests
**As a** developer
**I need** automated E2E tests measuring crisis button access time
**So that** I can validate the 3-second requirement

- **Audit:** Crisis - Empirical validation
- **Requirement:** Crisis accessible within 3 seconds from any screen

---

## Medium Priority

### SEC-07: Remove Security Service Logging
**As a** developer
**I need** console.log statements removed from security services
**So that** sensitive operations aren't logged

- **Audit:** Security - Logging
- **Issue:** 131 console.log statements in security services

---

### SEC-08: Deep Link Validation
**As a** user
**I need** deep links validated and sanitized
**So that** malicious URLs cannot compromise the app

- **Audit:** Security - Deep link vulnerabilities

---

### SEC-09: JavaScript Bundle Obfuscation
**As a** user
**I need** JavaScript bundle obfuscated in production builds
**So that** source code is harder to reverse engineer

- **Audit:** Security - Code protection

---

### SEC-10: Git History Secret Audit
**As a** developer
**I need** .env files verified not in git history
**So that** no secrets are accidentally committed

- **Audit:** Security - Environment security
- **Command:** `git log --all --full-history -- "*.env*"`

---

### PRV-06: Automated Data Retention Cleanup
**As a** user
**I need** automated data retention cleanup
**So that** my old check-in data is deleted per the 90-day policy

- **Audit:** Privacy - Retention enforcement
- **Issue:** Policy promises 90-day retention but no automated cleanup

---

### PRV-07: Storage Location UI Indicators
**As a** user
**I need** UI indicators showing where my data is stored (local vs cloud)
**So that** I understand my privacy

- **Audit:** Privacy - Storage visibility

---

### CRS-03: Delete Legacy Crisis Screens
**As a** developer
**I need** legacy CrisisResourcesScreen and CrisisPlanScreen deleted
**So that** the codebase is maintainable

- **Audit:** Crisis - Cleanup
- **Files to delete:**
  - `src/features/crisis/screens/CrisisResourcesScreen.tsx`
  - `src/features/crisis/screens/CrisisPlanScreen.tsx`
- **Files to update:**
  - `src/core/navigation/CleanRootNavigator.tsx`
  - `src/features/crisis/screens/index.ts`

---

### CRS-04: Offline Crisis Indicator
**As a** user
**I need** an offline indicator on crisis resources
**So that** I know they work without internet

- **Audit:** Crisis - Offline access
- **Location:** ProfileScreen crisis resources section

---

### CRS-05: Practice Flow Crisis Button Verification
**As a** developer
**I need** CollapsibleCrisisButton verified on all practice flow screens
**So that** crisis access is universal

- **Audit:** Crisis - Coverage verification
- **Screens to check:** MorningFlow, MiddayFlow, EveningFlow, practice screens

---

## Low Priority

### CRS-06: Enhanced 988 Visibility
**As a** user
**I need** "988" explicitly shown on the crisis button
**So that** I know it connects to the crisis lifeline

- **Audit:** Crisis - 988 visibility
- **Current:** Button says "I need support"
- **Proposed:** Show "988" or "Crisis Line"

---

### CRS-07: Crisis Analytics Dashboard
**As a** developer
**I need** a crisis analytics dashboard
**So that** I can monitor detection frequency and performance trends

- **Audit:** Crisis - Analytics

---

### PRV-08: Per-Assessment Deletion
**As a** user
**I need** to delete individual assessments
**So that** I have granular control over my data

- **Audit:** Privacy - Granular deletion

---

## Summary

| Priority | Count | Stories |
|----------|-------|---------|
| Critical | 6 | SEC-01, SEC-02, SEC-03, PRV-01, PRV-02, PRV-03 |
| High | 7 | SEC-04, SEC-05, SEC-06, PRV-04, PRV-05, CRS-01, CRS-02 |
| Medium | 9 | SEC-07-10, PRV-06-07, CRS-03-05 |
| Low | 3 | CRS-06, CRS-07, PRV-08 |

**Total: 25 user stories**

---

## Backlog Comparison

### Already in Backlog (7 stories across 5 backlog items)

| Audit Story | Existing Backlog Item | Status | Notes |
|-------------|----------------------|--------|-------|
| SEC-01, SEC-02, SEC-03 | **FEAT-16**: account / login feature | Not started | Covers auth bypass, backend API, JWT |
| PRV-01 | **FEAT-29**: Export & Sharing + **FEAT-33**: Enhanced Export Options | Blocked | Covers data portability |
| SEC-04 | **MAINT-68**: Implement SSL certificate pinning for Supabase endpoints | Blocked | Covers certificate pinning |
| CRS-01 | **INFRA-62**: Operational Security Monitoring | Not started | Covers performance monitoring |
| SEC-07 | **INFRA-61**: PHI-Safe Error Logging Service | Blocked | Covers all 148 console.log removals (includes 131 in security services) |

> **Note:** INFRA-60 (PHI Audit Trail System) covers audit *log* retention (7 years for HIPAA), NOT user *data* retention (90 days per privacy policy). PRV-06 requires a new story.

### New Stories to Add (18 stories)

#### Critical - App Store Compliance
| Story | Description | Type |
|-------|-------------|------|
| PRV-02 | iOS Privacy Manifest Update (PrivacyInfo.xcprivacy) | INFRA |
| PRV-03 | Android Data Safety Manifest | INFRA |

#### High Priority - Security Hardening
| Story | Description | Type |
|-------|-------------|------|
| SEC-05 | Input Validation (Zod schemas for PHQ-9/GAD-7) | MAINT |
| SEC-06 | Supabase Row-Level Security Verification | MAINT |
| PRV-04 | Cloud Backup PHI Filtering | MAINT |
| PRV-05 | Third-Party Service Disclosure (Supabase) | MAINT |
| CRS-02 | 3-Second Access E2E Tests | MAINT |

#### Medium Priority - Security & Privacy
| Story | Description | Type |
|-------|-------------|------|
| SEC-08 | Deep Link Validation | MAINT |
| SEC-09 | JavaScript Bundle Obfuscation | INFRA |
| SEC-10 | Git History Secret Audit | MAINT |
| PRV-06 | Automated Data Retention Cleanup (90-day policy enforcement) | MAINT |
| PRV-07 | Storage Location UI Indicators | FEAT |
| CRS-03 | Delete Legacy Crisis Screens | MAINT |
| CRS-04 | Offline Crisis Indicator | FEAT |
| CRS-05 | Practice Flow Crisis Button Verification | MAINT |

#### Low Priority - Enhancements
| Story | Description | Type |
|-------|-------------|------|
| CRS-06 | Enhanced 988 Visibility | FEAT |
| CRS-07 | Crisis Analytics Dashboard | FEAT |
| PRV-08 | Per-Assessment Deletion | FEAT |

### Summary

| Category | Already in Backlog | New to Add |
|----------|-------------------|------------|
| Critical | 4 stories (SEC-01/02/03 via FEAT-16, PRV-01 via FEAT-29/33) | 2 |
| High | 2 stories (SEC-04 via MAINT-68, CRS-01 via INFRA-62) | 5 |
| Medium | 1 story (SEC-07 via INFRA-61) | 8 |
| Low | 0 | 3 |
| **Total** | **7 stories** | **18 stories** |

> **Note:** SEC-01, SEC-02, SEC-03 are 3 separate stories but covered by single backlog item FEAT-16.
>
> **Correction (2025-12-10):** INFRA-60 (PHI Audit Trail) does not cover PRV-06 (Data Retention Cleanup).
> These address different concerns: audit log retention (7yr HIPAA) vs user data retention (90-day privacy policy).

---

## Detailed Work Items for Notion (b-create format)

### Critical - App Store Compliance

---

#### INFRA - iOS Privacy Manifest Update (PRV-02)

**User Story**:
As a user downloading the app from the App Store, I need the iOS app to accurately declare its health data collection in the privacy manifest so that Apple approves the app and I can trust the privacy disclosures are accurate.

**Acceptance Criteria**:
- `NSPrivacyCollectedDataTypes` in `PrivacyInfo.xcprivacy` includes health data category
- Privacy nutrition labels match actual data collection (mood, assessments, practices)
- App Store Connect privacy declarations align with manifest
- Passes Apple's automated privacy manifest validation
- Documentation updated with data collection justifications

**Technical Notes**:
- File: `ios/Being/PrivacyInfo.xcprivacy:43-44`
- Current: `NSPrivacyCollectedDataTypes: []` (empty but app collects health data)
- Apple requires: Health & Fitness data category declaration
- Reference: Apple's Required Reason APIs documentation
- Must declare: PHQ-9/GAD-7 responses, mood data, practice completion

**AGENTS REQUIRED**: compliance

**Dimension Scores**:
- Impact: 5 - App Store rejection blocks all iOS distribution
- Value: 4 - Users benefit from accurate privacy disclosures
- Strategic Fit: 5 - Required for launch, aligns with privacy-first mission
- Urgency: 5 - Blocking App Store submission
- Effort: S - Configuration update with documentation
- Risk: 2 - Low technical risk, clear Apple requirements

---

#### INFRA - Android Data Safety Manifest (PRV-03)

**User Story**:
As a user downloading the app from Google Play, I need the Android app to have accurate data safety declarations so that Google approves the app and I understand how my health data is handled.

**Acceptance Criteria**:
- Data safety section completed in Google Play Console
- Declarations match actual data collection (mood, assessments, practices)
- Data handling practices accurately described (encryption, retention, sharing)
- Passes Google Play's data safety review
- Privacy policy URL linked and accessible

**Technical Notes**:
- No manifest file currently exists for Android data safety
- Google Play Console configuration required
- Must declare: Health info collection, data encryption, no third-party sharing
- Reference: Google Play Data Safety documentation
- Coordinate with iOS manifest for consistency

**AGENTS REQUIRED**: compliance

**Dimension Scores**:
- Impact: 5 - Google Play rejection blocks all Android distribution
- Value: 4 - Users benefit from accurate privacy disclosures
- Strategic Fit: 5 - Required for launch, aligns with privacy-first mission
- Urgency: 5 - Blocking Google Play submission
- Effort: S - Console configuration with documentation
- Risk: 2 - Low technical risk, clear Google requirements

---

### High Priority - Security Hardening

---

#### MAINT - Input Validation with Zod Schemas (SEC-05)

**User Story**:
As a user completing PHQ-9/GAD-7 assessments, I need my input to be validated against strict schemas so that malicious or malformed input cannot compromise the app or corrupt my assessment data.

**Acceptance Criteria**:
- Zod schemas defined for PHQ-9 (9 questions, 0-3 range each)
- Zod schemas defined for GAD-7 (7 questions, 0-3 range each)
- All assessment form submissions validated before processing
- Invalid input rejected with user-friendly error messages
- Validation runs client-side and matches clinical requirements
- 100% test coverage for edge cases (null, undefined, out-of-range, non-numeric)

**Technical Notes**:
- PHQ-9: 9 items × 0-3 scale = 0-27 total score
- GAD-7: 7 items × 0-3 scale = 0-21 total score
- Crisis thresholds: PHQ≥15 (support), PHQ≥20 (intervention), GAD≥15
- Consider Zod's `.refine()` for cross-field validation
- Integrate with existing assessment store

**AGENTS REQUIRED**: security, crisis

**Dimension Scores**:
- Impact: 4 - Prevents data corruption affecting clinical validity
- Value: 5 - Protects assessment integrity critical for crisis detection
- Strategic Fit: 5 - Clinical accuracy is mission-critical
- Urgency: 3 - Important but not blocking launch
- Effort: S - Schema definition and integration
- Risk: 2 - Well-understood implementation pattern

---

#### MAINT - Supabase Row-Level Security Verification (SEC-06)

**User Story**:
As a developer deploying to production, I need Supabase Row-Level Security policies verified so that users cannot access each other's sensitive health data through API manipulation.

**Acceptance Criteria**:
- RLS policies documented for all tables containing user data
- Policies verified: users can only read/write their own records
- Test cases demonstrate policy enforcement (cross-user access blocked)
- No tables with disabled RLS that contain user data
- Security review checklist completed and documented

**Technical Notes**:
- Tables to verify: check_ins, assessments, crisis_plans, user_profiles
- Test method: Attempt cross-user queries with different auth tokens
- Document policy syntax for each table
- Consider automated RLS testing in CI/CD

**AGENTS REQUIRED**: security, compliance

**Dimension Scores**:
- Impact: 5 - Data breach prevention, regulatory compliance
- Value: 5 - Protects user privacy and health data
- Strategic Fit: 5 - Privacy-first is core to mission
- Urgency: 4 - Must verify before production launch
- Effort: M - Requires thorough audit and testing
- Risk: 4 - High risk if misconfigured, complex to verify

---

#### MAINT - Cloud Backup PHI Filtering (PRV-04)

**User Story**:
As a user with cloud backup enabled, I need raw PHQ/GAD scores filtered from backup data so that only non-sensitive aggregated data is synced to the cloud, protecting my most sensitive health information.

**Acceptance Criteria**:
- Raw PHQ-9 individual question responses excluded from backup
- Raw GAD-7 individual question responses excluded from backup
- Only aggregated/anonymized trends synced (if any)
- Backup data structure documented with PHI exclusions
- User informed about what is/isn't backed up in settings UI
- Compliance agent validates PHI filtering implementation

**Technical Notes**:
- File: `CloudBackupService.ts:400-415`
- Current: Unclear what PHI is filtered
- Define explicit allowlist of backup-safe fields
- Consider: mood trends (ok) vs raw scores (PHI)
- Document decision rationale for compliance

**AGENTS REQUIRED**: compliance, security

**Dimension Scores**:
- Impact: 4 - Reduces data breach exposure
- Value: 5 - Protects most sensitive health data
- Strategic Fit: 5 - Privacy-first mission alignment
- Urgency: 3 - Important for production security
- Effort: M - Requires careful data flow analysis
- Risk: 4 - High risk if PHI leaks to backup

---

#### MAINT - Third-Party Service Disclosure (PRV-05)

**User Story**:
As a user reading the privacy policy, I need Supabase disclosed as a third-party service so that I understand where my data is stored and can make informed consent decisions.

**Acceptance Criteria**:
- Privacy policy updated to list Supabase as data processor
- Supabase's role clearly explained (database, authentication, storage)
- Data location disclosed (Supabase region/jurisdiction)
- Link to Supabase's own privacy policy/security practices
- Any other third-party services also disclosed (if applicable)

**Technical Notes**:
- File: `docs/brand-legal/legal/privacy-policy.md`
- Supabase is SOC 2 Type II certified
- Data residency: verify US region configuration
- Consider: any analytics, crash reporting, or other services

**AGENTS REQUIRED**: compliance

**Dimension Scores**:
- Impact: 3 - Legal compliance and user trust
- Value: 4 - Users deserve transparency about data handling
- Strategic Fit: 4 - Aligns with privacy-first values
- Urgency: 3 - Should be done before production launch
- Effort: XS - Documentation update only
- Risk: 1 - Low risk, straightforward update

---

#### MAINT - 3-Second Crisis Access E2E Tests (CRS-02)

**User Story**:
As a developer maintaining crisis safety, I need automated E2E tests measuring crisis button access time so that I can continuously validate the 3-second requirement and catch regressions.

**Acceptance Criteria**:
- E2E test suite covers crisis access from all major screens
- Tests measure actual navigation time to crisis resources
- Tests fail if any path exceeds 3 seconds
- Tests run in CI/CD pipeline on every PR
- Coverage includes: Home, Check-in, Assessment, Profile, Practice flows
- Results logged for trend analysis

**Technical Notes**:
- Requirement: Crisis accessible within 3 seconds from any screen
- Use Detox or Maestro for E2E testing
- Measure from screen render to crisis button tap to crisis resource visible
- Consider network latency simulation
- Document test scenarios and expected paths

**AGENTS REQUIRED**: crisis, performance

**Dimension Scores**:
- Impact: 4 - Ensures crisis safety requirement maintained
- Value: 5 - Critical for user safety in crisis
- Strategic Fit: 5 - Crisis safety is highest priority
- Urgency: 3 - Important for quality assurance
- Effort: M - E2E test infrastructure and scenarios
- Risk: 3 - Test flakiness common in E2E, need robust setup

---

### Medium Priority - Security & Privacy

---

#### MAINT - Deep Link Validation (SEC-08)

**User Story**:
As a user clicking links to the app, I need deep links validated and sanitized so that malicious URLs cannot compromise the app or trick me into unsafe actions.

**Acceptance Criteria**:
- All deep link parameters validated against allowlist
- Malformed URLs rejected gracefully (no crashes)
- No arbitrary navigation via deep link parameters
- SQL injection / XSS patterns blocked
- Deep link handler logs suspicious attempts
- Unit tests cover malicious input scenarios

**Technical Notes**:
- Review Expo deep linking configuration
- Validate: scheme, host, path, query parameters
- Sanitize before using in navigation or API calls
- Consider rate limiting for abuse prevention

**AGENTS REQUIRED**: security

**Dimension Scores**:
- Impact: 3 - Prevents potential attack vector
- Value: 4 - Protects users from phishing/manipulation
- Strategic Fit: 3 - Security hygiene
- Urgency: 2 - Not immediately critical
- Effort: S - Validation logic implementation
- Risk: 3 - Attack surface analysis needed

---

#### INFRA - JavaScript Bundle Obfuscation (SEC-09)

**User Story**:
As a security-conscious organization, I need the JavaScript bundle obfuscated in production builds so that source code is harder to reverse engineer and intellectual property is protected.

**Acceptance Criteria**:
- Production builds use Metro bundler minification
- Consider additional obfuscation tools (e.g., javascript-obfuscator)
- Source maps excluded from production bundles
- Bundle size impact measured and acceptable
- Build process documented

**Technical Notes**:
- Metro bundler provides basic minification
- Additional obfuscation increases bundle size
- Trade-off: security vs bundle size vs debugging
- Hermes bytecode provides some obfuscation naturally

**AGENTS REQUIRED**: security, performance

**Dimension Scores**:
- Impact: 2 - Defense in depth, not primary security
- Value: 2 - Limited direct user benefit
- Strategic Fit: 2 - Nice to have, not core mission
- Urgency: 1 - Can be deferred post-launch
- Effort: S - Build configuration changes
- Risk: 2 - May complicate debugging

---

#### MAINT - Git History Secret Audit (SEC-10)

**User Story**:
As a developer, I need .env files verified not present in git history so that no secrets are accidentally exposed through repository access.

**Acceptance Criteria**:
- `git log --all --full-history -- "*.env*"` returns no results
- If secrets found, git history cleaned (BFG or filter-branch)
- Pre-commit hooks prevent future .env commits
- .gitignore updated to cover all secret file patterns
- Documentation on secret management practices

**Technical Notes**:
- Command: `git log --all --full-history -- "*.env*"`
- Also check: `*.key`, `*.pem`, `credentials.*`, `secrets.*`
- BFG Repo-Cleaner for history cleaning
- Consider: git-secrets or gitleaks for automated scanning

**AGENTS REQUIRED**: security

**Dimension Scores**:
- Impact: 4 - Prevents credential exposure
- Value: 3 - Indirect user protection
- Strategic Fit: 3 - Security best practice
- Urgency: 3 - Should verify before any public repo access
- Effort: S - Audit and potential cleanup
- Risk: 3 - History rewriting if secrets found

---

#### MAINT - Automated Data Retention Cleanup (PRV-06)

**User Story**:
As a user, I need automated cleanup of my old check-in data so that the privacy policy's 90-day retention promise is actually enforced and my historical data doesn't accumulate indefinitely.

**Acceptance Criteria**:
- Automated job deletes check-in data older than 90 days
- User optionally notified before deletion (setting)
- User can export data before deletion window
- Audit log entry created for each deletion batch
- Retention policy configurable per data type
- Cleanup runs reliably (scheduled job or on-app-open)

**Technical Notes**:
- Privacy policy promises 90-day retention but no automated cleanup exists
- Different from INFRA-60 (audit log retention = 7 years for HIPAA)
- Consider: local cleanup vs server-side cleanup
- User preference: opt-in notifications before deletion
- Coordinate with data export feature (PRV-01/FEAT-29)

**AGENTS REQUIRED**: compliance, security

**Dimension Scores**:
- Impact: 3 - Enforces privacy commitments
- Value: 4 - Respects user privacy expectations
- Strategic Fit: 4 - Privacy-first mission alignment
- Urgency: 2 - Not blocking launch, but needed for policy compliance
- Effort: M - Scheduled job implementation with edge cases
- Risk: 3 - Data deletion must be carefully implemented

---

#### FEAT - Storage Location UI Indicators (PRV-07)

**User Story**:
As a user managing my data, I need UI indicators showing where my data is stored (local vs cloud) so that I understand my privacy posture and can make informed decisions about sync settings.

**Acceptance Criteria**:
- Settings screen shows storage location per data type
- Visual indicator: local-only vs cloud-synced
- Indicator updates when sync settings change
- Tooltip/info explaining each storage mode
- Accessible (screen reader support)

**Technical Notes**:
- Location: Settings or Profile screen
- Data types: check-ins, assessments, crisis contacts, preferences
- Design: icons or badges (device, cloud, both)
- Consider: storage size indicators

**AGENTS REQUIRED**: (none - general UX)

**Dimension Scores**:
- Impact: 2 - Transparency feature
- Value: 3 - Helps users understand privacy
- Strategic Fit: 3 - Aligns with privacy-first values
- Urgency: 1 - Enhancement, not critical
- Effort: S - UI implementation
- Risk: 1 - Low risk feature

---

#### MAINT - Delete Legacy Crisis Screens (CRS-03)

**User Story**:
As a developer maintaining the codebase, I need legacy CrisisResourcesScreen and CrisisPlanScreen deleted so that the codebase is maintainable and there's no confusion about which crisis UI is active.

**Acceptance Criteria**:
- `src/features/crisis/screens/CrisisResourcesScreen.tsx` deleted
- `src/features/crisis/screens/CrisisPlanScreen.tsx` deleted
- Navigation references removed from `CleanRootNavigator.tsx`
- Exports removed from `src/features/crisis/screens/index.ts`
- No runtime errors after deletion
- App builds and tests pass

**Technical Notes**:
- Confirmed legacy: These screens are registered but never navigated to
- Crisis resources now displayed inline in ProfileScreen
- Grep confirmed no navigation calls to these screens
- Safe to delete with navigation cleanup

**AGENTS REQUIRED**: crisis

**Dimension Scores**:
- Impact: 2 - Code maintainability
- Value: 2 - Indirect benefit through cleaner codebase
- Strategic Fit: 2 - Technical hygiene
- Urgency: 1 - Not urgent, cleanup task
- Effort: XS - Delete files and update imports
- Risk: 1 - Low risk with proper testing

---

#### FEAT - Offline Crisis Indicator (CRS-04)

**User Story**:
As a user without internet access, I need an offline indicator on crisis resources so that I know they work without internet and can confidently use them in emergencies.

**Acceptance Criteria**:
- Visual indicator showing "Available Offline" on crisis resources
- Indicator shown on ProfileScreen crisis resources section
- 988 and Crisis Text Line marked as always available
- Find Treatment may show "requires internet" if applicable
- Indicator uses accessibility-friendly design

**Technical Notes**:
- Location: ProfileScreen crisis resources section
- 988 (call) works offline if phone has signal
- Crisis Text Line (text) works offline if phone has signal
- Find Treatment (web) requires internet
- Design: badge, icon, or subtle label

**AGENTS REQUIRED**: crisis, accessibility

**Dimension Scores**:
- Impact: 3 - Improves crisis resource confidence
- Value: 4 - Reassures users in emergencies
- Strategic Fit: 4 - Crisis safety enhancement
- Urgency: 2 - Enhancement, not critical
- Effort: XS - UI label addition
- Risk: 1 - Low risk feature

---

#### MAINT - Practice Flow Crisis Button Verification (CRS-05)

**User Story**:
As a developer ensuring crisis safety, I need CollapsibleCrisisButton verified on all practice flow screens so that crisis access is universal and users are never more than 3 seconds from help.

**Acceptance Criteria**:
- CollapsibleCrisisButton present on all MorningFlow screens
- CollapsibleCrisisButton present on all MiddayFlow screens
- CollapsibleCrisisButton present on all EveningFlow screens
- CollapsibleCrisisButton present on all standalone practice screens
- Documentation listing all screens with crisis button status
- Automated test verifying crisis button presence

**Technical Notes**:
- Audit all screens in: `/flows/morning/`, `/flows/midday/`, `/flows/evening/`
- Check practice screens: breathing, meditation, body scan, etc.
- CollapsibleCrisisButton is the standard component
- Some screens may use alternative crisis access patterns

**AGENTS REQUIRED**: crisis

**Dimension Scores**:
- Impact: 4 - Ensures consistent crisis access
- Value: 5 - Critical for user safety
- Strategic Fit: 5 - Crisis safety is highest priority
- Urgency: 3 - Should verify before launch
- Effort: S - Audit and documentation
- Risk: 2 - Verification task, low implementation risk

---

### Low Priority - Enhancements

---

#### FEAT - Enhanced 988 Visibility (CRS-06)

**User Story**:
As a user in crisis, I need "988" explicitly shown on the crisis button so that I immediately recognize it connects to the national crisis lifeline and know exactly what help I'll receive.

**Acceptance Criteria**:
- Crisis button displays "988" number visibly
- Alternative: "988 Crisis Line" or "Call 988"
- Maintains current "I need support" messaging context
- A/B testable if desired
- Accessible (contrast, screen reader)

**Technical Notes**:
- Current: Button says "I need support"
- 988 is national suicide prevention lifeline
- Consider design: "988" badge, subtitle, or integrated text
- Research: Does explicit "988" increase or decrease usage?

**AGENTS REQUIRED**: crisis, accessibility

**Dimension Scores**:
- Impact: 3 - May improve crisis resource recognition
- Value: 4 - Helps users understand available help
- Strategic Fit: 4 - Aligns with crisis safety mission
- Urgency: 1 - Enhancement, not critical
- Effort: XS - Text/design update
- Risk: 2 - May need user research on messaging

---

#### FEAT - Crisis Analytics Dashboard (CRS-07)

**User Story**:
As a developer monitoring app safety, I need a crisis analytics dashboard so that I can monitor detection frequency and performance trends to ensure the system is working correctly.

**Acceptance Criteria**:
- Dashboard shows crisis detection events over time
- Performance metrics: detection latency, button access time
- Trend visualization: daily/weekly/monthly
- Alerting for anomalies (spike in detections, latency increase)
- Privacy-safe: no individual user data, only aggregates

**Technical Notes**:
- Data source: anonymized crisis event logs
- Metrics: detection count, p50/p95 latency, access time
- Consider: Supabase analytics or separate monitoring service
- Privacy: aggregate only, no PII in dashboard

**AGENTS REQUIRED**: crisis, performance

**Dimension Scores**:
- Impact: 3 - Operational visibility
- Value: 3 - Indirect user benefit through better monitoring
- Strategic Fit: 3 - Supports safety mission
- Urgency: 1 - Post-launch enhancement
- Effort: L - Dashboard infrastructure
- Risk: 3 - Privacy considerations in implementation

---

#### FEAT - Per-Assessment Deletion (PRV-08)

**User Story**:
As a user managing my data, I need to delete individual assessments so that I have granular control over my data and can remove specific entries I no longer want stored.

**Acceptance Criteria**:
- Individual PHQ-9 assessments can be deleted
- Individual GAD-7 assessments can be deleted
- Confirmation dialog before deletion
- Deletion reflected in local storage and cloud (if synced)
- Assessment history updates after deletion
- Undo option (brief window) considered

**Technical Notes**:
- Current: Only bulk data deletion available
- Consider: soft delete vs hard delete
- Impact on trends/analytics if assessment deleted
- Coordinate with data export feature

**AGENTS REQUIRED**: compliance

**Dimension Scores**:
- Impact: 2 - Granular privacy control
- Value: 3 - User empowerment over data
- Strategic Fit: 3 - Aligns with privacy-first values
- Urgency: 1 - Enhancement, not critical for launch
- Effort: M - UI and data management logic
- Risk: 2 - Data integrity considerations
