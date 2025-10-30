# FEAT-6 MVP: Profile Tab UI

**Status**: Testing (MVP Complete)
**Branch**: `feat-6`
**Notion**: [FEAT-6: MVP - Profile Tab UI (Values, Settings, Account Shell)](https://notion.so/277a1108c20880dbb5c4f94228c11930)
**V2 Work Item**: [FEAT-57: Profile Tab V2 (Production-Ready)](https://notion.so/29ca1108c20881c38c50ffb7bb7ce807)

---

## Overview

FEAT-6 MVP delivers a **fully functional profile UI** with therapeutic values management and app settings, using **single-user development mode** for testing and UX validation. This MVP allows parallel development while waiting for authentication (FEAT-16) and data export (FEAT-29) infrastructure.

### MVP Scope (Complete ✅)
- ✅ **ValuesScreen**: Full CRUD for 3-5 MBCT therapeutic values (encrypted SecureStore)
- ✅ **AppSettingsScreen**: Notifications, privacy, accessibility settings (AsyncStorage)
- ✅ **AccountSettingsScreen**: UI shell with disabled auth features and clear V2 messaging
- ✅ **Single-User Development Mode**: `dev-user-001` constant for testable functionality
- ✅ **PHI-Safe Error Handling**: Sanitized error messages, no PHI leakage
- ✅ **Dev Mode UI Indicators**: Clear warnings that features require V2
- ✅ **Privacy-First Defaults**: Analytics opt-out, data minimization

### V2 Scope (Blocked - See FEAT-57)
- ⏸️ Multi-user authentication (FEAT-16)
- ⏸️ Client-side PDF data export (FEAT-29)
- ⏸️ Logout flow (FEAT-58)
- ⏸️ Account deletion with 30-day grace period (FEAT-59)
- ⏸️ PHI audit trail (INFRA-60)
- ⏸️ PHI-safe error logging service (INFRA-61)
- ⏸️ Operational security monitoring (INFRA-62)

---

## Validation Summary

**Compliance Agent**: 7.5/10 (MVP), 9/10 (V2)
**Security Agent**: 6.5/10 (MVP), 9/10 (V2)
**Product Agent**: Applied scoring to all 6 V2 work items

### MVP Limitations ⚠️
- **Single user only** - No multi-user data isolation
- **NOT HIPAA compliant** - Internal testing only
- **No production use** - Development mode required
- **No authentication** - All auth features disabled
- **No data export** - Requires FEAT-29

---

## Architecture

### New Files Created

#### **Development Mode**
- `src/constants/devMode.ts` - Single-user mode constants and utilities
  - `IS_DEV_MODE = true` - Dev mode flag
  - `DEV_USER_ID = 'dev-user-001'` - Placeholder user ID
  - `getCurrentUserId()` - Returns dev user ID (V2: real auth service)
  - `getCurrentUserEmail()` - Returns dev email
  - `getUserCreatedAt()` - Returns dev creation date

#### **Error Handling**
- `src/utils/errorSanitization.ts` - PHI-safe error handling
  - `sanitizeErrorMessage()` - Strip PHI from error messages
  - `createUserFriendlyError()` - Safe user-facing messages
  - `sanitizeError()` - Full error object sanitization
  - `logError()` - Safe error logging (dev only)
  - `getErrorMessage()` - Helper for components

- `src/components/ErrorBoundary.tsx` - React error boundary
  - Catch unhandled React errors
  - PHI-safe error UI
  - Automatic error logging

#### **Screens**
- `src/screens/ValuesScreen.tsx` - Therapeutic values CRUD
  - 3-5 value selection (MBCT-aligned)
  - Edit mode with validation
  - Encrypted storage (SecureStore)
  - Live validation feedback

- `src/screens/AppSettingsScreen.tsx` - App preferences
  - Notifications (check-ins, breathing, values reflection)
  - Privacy (analytics opt-in/out, default: opt-out)
  - Accessibility (text size, reduced motion, high contrast)
  - AsyncStorage (non-sensitive data)

- `src/screens/AccountSettingsScreen.tsx` - Account management UI shell
  - Account info display (dev user email, creation date)
  - Disabled destructive actions (change password, logout, delete account)
  - Clear V2 feature messaging with FEAT numbers
  - Export data placeholder (blocked by FEAT-29)

### Modified Files

#### **Stores**
- `src/stores/valuesStore.ts`
  - Replaced local `getCurrentUserId()` with import from `devMode.ts`
  - Updated comments to reference FEAT-16 for V2

- `src/stores/settingsStore.ts`
  - Replaced local `getCurrentUserId()` with import from `devMode.ts`
  - Updated comments to reference FEAT-16 for V2

#### **Screens**
- `src/screens/ProfileScreen.simple.tsx`
  - Added dev mode banner at top (⚠️ Development Mode - Single User Only)
  - Integrated ValuesScreen, AppSettingsScreen, AccountSettingsScreen
  - Added "Personalization" section with Values card

- `src/screens/OnboardingScreen.simple.tsx`
  - Integrated valuesStore to save selected values on completion
  - Values now persist from onboarding to profile

---

## Testing Instructions

### Prerequisites
1. Set `IS_DEV_MODE = true` in `src/constants/devMode.ts` (default)
2. Run app on simulator or device
3. Navigate to Profile tab

### Test Scenarios

#### ✅ **Values Management**
1. Navigate to "Your Therapeutic Values" from profile menu
2. Tap "Edit Values"
3. Select 3-5 values from the list
4. Tap "Save Changes"
5. **Expected**: Values saved, toast confirmation, return to view mode
6. **Verify**: Values persist across app restarts (SecureStore)

#### ✅ **App Settings**
1. Navigate to "App Settings" from profile menu
2. Toggle notification settings (check-in reminders, breathing, reflection)
3. Toggle privacy settings (analytics opt-in/out)
4. Change accessibility settings (text size, reduced motion, high contrast)
5. **Expected**: All settings save immediately, persist across restarts (AsyncStorage)

#### ✅ **Account Settings (Disabled Features)**
1. Navigate to "Account Settings" from profile menu
2. **Verify**: Dev user email displayed (`dev-user@being.local`)
3. **Verify**: "Development Mode" warning visible
4. Tap "Change Password" → **Expected**: Alert explaining feature requires FEAT-16
5. Tap "Logout" → **Expected**: Alert explaining feature requires FEAT-58
6. Tap "Export Your Data" → **Expected**: Alert explaining feature requires FEAT-29
7. **Verify**: Delete Account section is disabled with V2 messaging

#### ✅ **Dev Mode Indicators**
1. Open Profile tab
2. **Verify**: Yellow dev mode banner at top
3. **Expected**: "⚠️ Development Mode - Single User Only"
4. **Expected**: Subtitle listing blocked features (FEAT-16, FEAT-29, FEAT-58, FEAT-59)

#### ✅ **Error Handling**
1. (Simulate error by clearing SecureStore and accessing values)
2. **Expected**: User-friendly error message (no PHI)
3. **Expected**: Error logged to console (sanitized)
4. **Expected**: No stack traces or user data in alert

### Accessibility Testing
- [ ] Screen reader support (VoiceOver/TalkBack)
- [ ] WCAG AA contrast ratios
- [ ] Keyboard navigation
- [ ] Focus management
- [ ] Text size adaptation

---

## MVP Acceptance Criteria

### ✅ Functional Requirements
- [x] All screens render without crashes
- [x] Values CRUD works (create, read, update, delete)
- [x] Settings persist across app restarts
- [x] No PHI exposed in error messages
- [x] Clear dev mode indicators visible
- [x] UX/accessibility testable by internal team

### ✅ Security Requirements
- [x] Values encrypted (SecureStore)
- [x] Settings non-encrypted (AsyncStorage, non-sensitive)
- [x] Error messages sanitized
- [x] No user IDs, emails, or tokens in logs
- [x] Destructive actions disabled (logout, delete)

### ⚠️ Known Limitations (By Design)
- [ ] Multi-user data isolation (requires FEAT-16)
- [ ] HIPAA compliance (requires V2)
- [ ] Data export (requires FEAT-29)
- [ ] Audit trail (requires INFRA-60)
- [ ] Production error logging (requires INFRA-61)
- [ ] Security monitoring (requires INFRA-62)

---

## V2 Roadmap

### Phase 1: Critical Infrastructure (Parallel, 2-5 weeks)
**Priority**: INFRA-61 (74.53) > INFRA-60 (44.72)

1. **INFRA-61: PHI-Safe Error Logging** (Priority 74.53, M effort, 2-3 weeks)
   - Current logging = HIPAA risk
   - PHI sanitization rules
   - Sentry integration
   - Rate limiting

2. **INFRA-60: PHI Audit Trail** (Priority 44.72, L effort, 3-5 weeks)
   - HIPAA §164.312(b) compliance
   - Encrypted audit log
   - Timestamped PHI access tracking
   - Retention policy

### Phase 2: Auth-Dependent Features (Sequential after FEAT-16)
**Blocker**: FEAT-16 (Priority 2.46, XXL effort)

3. **FEAT-58: Logout Flow** (Priority 51.2, S effort, 1-2 weeks)
   - Clear auth tokens
   - Wipe SecureStore sensitive data
   - Navigate to login screen
   - Confirmation dialog

4. **FEAT-59: Account Deletion** (Priority 30.0, M effort, 2-3 weeks)
   - 30-day soft delete with recovery
   - Hard delete after grace period
   - App store compliance validation
   - Pre-deletion data export prompt

### Phase 3: Production Hardening
5. **INFRA-62: Security Monitoring** (Priority 32.0, M effort, 2-3 weeks)
   - SecureStore tampering detection
   - Unauthorized access alerts
   - Data integrity validation
   - Performance monitoring (non-PHI)

6. **FEAT-57: Profile Tab V2** (Priority 34.94, XL effort, 5-8 weeks)
   - Integration of all blockers
   - Full HIPAA compliance testing
   - Production deployment

**Total V2 Timeline**: 15-20 days after all blockers ship
**V2 Compliance**: 9/10
**V2 Security**: 9/10

---

## Files Changed Summary

### Created (7 files)
- `src/constants/devMode.ts`
- `src/utils/errorSanitization.ts`
- `src/components/ErrorBoundary.tsx`
- `src/screens/ValuesScreen.tsx`
- `src/screens/AppSettingsScreen.tsx`
- `src/screens/AccountSettingsScreen.tsx`
- `FEAT-6-MVP-README.md` (this file)

### Modified (4 files)
- `src/stores/valuesStore.ts`
- `src/stores/settingsStore.ts`
- `src/screens/ProfileScreen.simple.tsx`
- `src/screens/OnboardingScreen.simple.tsx`

---

## Next Steps

### Immediate (This Week)
1. ✅ Complete MVP implementation
2. ⏳ Internal UX/accessibility testing
3. ⏳ Gather feedback for V2 refinements
4. ⏳ Update FEAT-6 status to "Done" in Notion

### Short-term (Next Sprint)
1. Create 6 V2 blocker work items ✅ (Already created)
2. Prioritize INFRA-61 (PHI-Safe Error Logging) - highest priority blocker
3. Plan FEAT-16 (authentication) implementation
4. Design FEAT-29 client-side PDF export

### Medium-term (Next Quarter)
1. Ship FEAT-16 (authentication)
2. Implement INFRA-60 + INFRA-61 in parallel
3. Ship FEAT-58 (logout) + FEAT-59 (account deletion)
4. Integrate FEAT-57 (Profile V2) with full compliance

---

## Questions & Support

**Product Manager**: See Notion database for work item details
**Compliance Questions**: Compliance agent validated (see Notion comment)
**Security Questions**: Security agent validated (see Notion comment)
**Technical Questions**: Review code comments and TODOs marked with FEAT numbers

**Notion Work Items**:
- FEAT-6 (MVP): https://notion.so/277a1108c20880dbb5c4f94228c11930
- FEAT-57 (V2): https://notion.so/29ca1108c20881c38c50ffb7bb7ce807
- FEAT-58 (Logout): https://notion.so/29ca1108c20881d1bfa0f90ae091460f
- FEAT-59 (Delete): https://notion.so/29ca1108c20881d5848af0e8fcb0f2b6
- INFRA-60 (Audit): https://notion.so/29ca1108c20881a080a6d2e198cb5174
- INFRA-61 (Logging): https://notion.so/29ca1108c2088185a84acd18981476c0
- INFRA-62 (Monitor): https://notion.so/29ca1108c208818abe19dac52dbdf5d7

---

**Last Updated**: October 30, 2025
**Contributors**: Claude Code (compliance + security + product agents)
**Git Branch**: `feat-6`
