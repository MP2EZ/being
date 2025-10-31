# FEAT-6: Profile Tab Enhancements - Architecture

**Status**: Architectural Foundation Complete
**Date**: 2025-10-09
**Approach**: Option A - Structural foundation with TODO markers

---

## Overview

This document describes the architectural foundation for FEAT-6: profile tab enhancements. The implementation follows **Option A**: creating comprehensive architectural structure with TODO markers, allowing testing of the foundation while documenting open questions that need resolution.

---

## What's Been Built

### 1. Therapeutic Values System

**File**: `app/src/constants/therapeuticValues.ts`

- ✅ Extracted 15 MBCT-aligned therapeutic values from existing onboarding
- ✅ Shared constants for consistency between onboarding and profile
- ✅ Validation functions (min 3, max 5 values)
- ✅ HIPAA-compliant PHI classification

**Decision**: Used existing onboarding values (MBCT therapeutic qualities like "compassion", "mindfulness") rather than ACT life domains to maintain consistency.

### 2. Values Store (Zustand + SecureStore)

**File**: `app/src/stores/valuesStore.ts`

- ✅ Encrypted storage for therapeutic values (SecureStore)
- ✅ CRUD operations: load, save, add, remove, update
- ✅ Validation: min/max selection, valid IDs
- ✅ Performance target: <300ms load time
- ✅ Convenience hooks for common queries

**TODO Markers**:
- [ ] Integration with onboarding completion
- [ ] User ID management (AuthenticationService)
- [ ] Optional reflection prompts on edit
- [ ] Alignment self-assessment ratings (1-5)

### 3. Settings Store (Zustand + AsyncStorage)

**File**: `app/src/stores/settingsStore.ts`

- ✅ Non-encrypted storage for app preferences (AsyncStorage)
- ✅ Notification settings (check-in reminders, breathing, values prompts)
- ✅ Privacy settings (analytics opt-in/out)
- ✅ Accessibility settings (text size, reduced motion, high contrast)
- ✅ Default values (privacy-first: analytics opt-out by default)

**TODO Markers**:
- [ ] Notification system integration (scheduling)
- [ ] Analytics integration point
- [ ] Global accessibility feature control
- [ ] HIPAA compliance validation for privacy settings

---

## What Needs to Be Built

### Phase 1: Core Screens (Next Priority)

#### A. ValuesScreen Component
**Purpose**: Display and edit user's selected therapeutic values

**Structure**:
```
ValuesScreen.tsx
├─ Load values from valuesStore
├─ Display selected values (3-5) with descriptions
├─ Add button (if < 5 values)
├─ Remove button for each value (if > 3 values)
└─ Optional: Importance ratings, reflection prompts
```

**TODO**:
- [ ] Create screen component
- [ ] Integrate with valuesStore hooks
- [ ] Design value card UI (consistent with Being design system)
- [ ] Add value selection modal (from THERAPEUTIC_VALUES list)
- [ ] Optional: Reflection prompt modal on edit
- [ ] Accessibility: WCAG AA compliance, screen reader support

#### B. AccountSettingsScreen Component
**Purpose**: Account management (login info, logout, deletion)

**Structure**:
```
AccountSettingsScreen.tsx
├─ Account info section (email, creation date)
├─ Logout button with confirmation
├─ Delete account flow with typed confirmation
└─ TODO: Authentication integration
```

**TODO**:
- [ ] Create screen component
- [ ] Integrate with AuthenticationService (when available)
- [ ] Implement app store compliant account deletion flow
- [ ] Add data export option (compliance requirement?)
- [ ] Accessibility: Confirmation dialogs, clear warnings

#### C. AppSettingsScreen Component
**Purpose**: App preferences (notifications, privacy, accessibility)

**Structure**:
```
AppSettingsScreen.tsx
├─ Notification preferences section
│  ├─ Check-in reminders toggle + time picker
│  ├─ Breathing reminders toggle
│  └─ Values reflection prompts toggle
├─ Privacy preferences section
│  └─ Analytics opt-in/out toggle
├─ Accessibility preferences section
│  ├─ Text size selector
│  ├─ Reduced motion toggle
│  └─ High contrast toggle
└─ App info (version, build)
```

**TODO**:
- [ ] Create screen component
- [ ] Integrate with settingsStore hooks
- [ ] Connect notification toggles to scheduling system
- [ ] Connect accessibility settings to global app state
- [ ] Accessibility: All toggles keyboard accessible, clear labels

### Phase 2: ProfileScreen Integration

**File**: `app/src/screens/ProfileScreen.simple.tsx`

**Current State**: Has placeholder screens for "account" and "privacy"

**TODO**:
- [ ] Replace `renderPlaceholder` for "account" with `<AccountSettingsScreen />`
- [ ] Replace `renderPlaceholder` for "privacy" with `<AppSettingsScreen />`
- [ ] Add new "values" screen option
- [ ] Update navigation: "Your Profile" | "Your Values" | "Your Settings"
- [ ] Initialize stores on mount (loadValues, loadSettings)

---

## Open Questions (From Product/Clinician Agents)

### Critical (Blockers)

1. **Authentication Integration**
   - Q: Is user authentication (login/logout) already implemented?
   - Q: How to get current user ID? (AuthenticationService.getCurrentUser()?)
   - Impact: valuesStore and settingsStore use placeholder user IDs

2. **Onboarding Integration**
   - Q: Does onboarding currently save values to valuesStore?
   - Q: Where/when should `valuesStore.saveValues()` be called?
   - Impact: Values selected in onboarding may not persist to profile

3. **App Store Compliance**
   - Q: What specific account deletion flow is required?
   - Q: Immediate deletion vs. request-based deletion?
   - Q: Is data export required before deletion?
   - Impact: Account deletion implementation details

### Important (Design Decisions)

4. **Notification System**
   - Q: How to schedule notifications? (expo-notifications?)
   - Q: What notification permissions flow?
   - Impact: Notification toggles won't actually schedule anything yet

5. **Analytics Integration**
   - Q: Where does analytics opt-in/out integrate?
   - Q: What analytics system? (expo-analytics, custom?)
   - Impact: Privacy toggle won't affect analytics yet

6. **Values Features**
   - Q: Should we include importance ratings (1-5)?
   - Q: Should we include alignment self-assessment (1-5)?
   - Q: Should we show reflection prompts on edit?
   - Impact: Simplified vs. full ACT values clarification interface

### Compliance (Need Validation)

7. **HIPAA Privacy Settings**
   - Q: Are there specific privacy settings required by HIPAA?
   - Q: Beyond analytics opt-out, what else is needed?
   - Validator: Compliance agent

8. **Encrypted Storage**
   - Q: Is SecureStore encryption sufficient for values?
   - Q: Any additional security measures needed?
   - Validator: Security agent

---

## Domain Validation Status

### Clinician Agent ✅
**Status**: Complete (via product/clinician review during `/b-work`)

**Validations**:
- ✅ MBCT therapeutic values approach validated
- ✅ Values editing is therapeutically appropriate (no cooldowns/restrictions)
- ✅ NO gamification, adherence scores, or shame-inducing metrics
- ✅ Optional reflection prompts recommended (not required)
- ✅ Therapeutic qualities (compassion, mindfulness) vs. ACT domains decision documented

### Compliance Agent ⏳
**Status**: Pending

**Needs Validation**:
- [ ] Account deletion flow (app store compliance)
- [ ] Privacy settings requirements (HIPAA)
- [ ] Data export requirements
- [ ] Consent management for analytics opt-in/out

### Security Agent ⏳
**Status**: Pending

**Needs Validation**:
- [ ] SecureStore encryption for values (AES-256 sufficient?)
- [ ] Account deletion security (data actually deleted?)
- [ ] No data leaks in logout flow

---

## Implementation Roadmap

### Immediate (Ready to Build)

1. **ValuesScreen** - All dependencies ready
   - valuesStore complete
   - THERAPEUTIC_VALUES complete
   - Only needs UI implementation

2. **AppSettingsScreen** - Core functionality ready
   - settingsStore complete
   - Can build toggles/selectors
   - Integration with notification/analytics systems can be added later

### Blocked (Need Answers)

3. **AccountSettingsScreen** - Blocked on auth
   - Need AuthenticationService integration
   - Need account deletion flow specification
   - Can build UI shell, but actions won't work

4. **Onboarding Integration** - Blocked on implementation details
   - Where to call `valuesStore.saveValues()`?
   - OnboardingScreen.simple.tsx line ~1050 (after celebration)?

### Follow-up (After Initial Implementation)

5. **Enhanced Values Features**
   - Importance ratings (1-5)
   - Alignment self-assessment (1-5)
   - Reflection prompts modal

6. **Notification Scheduling**
   - expo-notifications integration
   - Permission flow
   - Background task scheduling

7. **Analytics Integration**
   - Connect privacy toggle to analytics system
   - Ensure HIPAA-compliant analytics

---

## Testing Plan

### Unit Tests Needed

- [ ] `valuesStore`: CRUD operations, validation, encryption
- [ ] `settingsStore`: Preferences management, defaults
- [ ] `therapeuticValues`: Validation functions

### Integration Tests Needed

- [ ] Onboarding → valuesStore persistence
- [ ] ProfileScreen → ValuesScreen navigation
- [ ] Settings changes → global app state updates

### Accessibility Tests Needed

- [ ] Screen reader compatibility (WCAG AA)
- [ ] Keyboard navigation
- [ ] Color contrast
- [ ] Focus management

---

## Performance Targets

From requirements and Being standards:

- **Values load**: <300ms (target from product requirements)
- **Settings load**: <100ms (non-encrypted, should be fast)
- **Profile screen render**: <500ms (from Being standards)
- **60fps scrolling**: All screens (especially values list)

---

## File Structure

```
app/src/
├── constants/
│   └── therapeuticValues.ts          ✅ Complete
├── stores/
│   ├── valuesStore.ts                 ✅ Complete (with TODOs)
│   └── settingsStore.ts               ✅ Complete (with TODOs)
├── screens/
│   ├── ProfileScreen.simple.tsx       🟡 Needs integration
│   ├── ValuesScreen.tsx               ❌ Not built
│   ├── AccountSettingsScreen.tsx      ❌ Not built
│   └── AppSettingsScreen.tsx          ❌ Not built
└── types/
    └── compliance/
        └── hipaa.ts                   ✅ Exists (referenced by valuesStore)
```

---

## Next Steps

1. **Answer Open Questions** (user/product team)
   - Authentication status and integration approach
   - Account deletion flow specification
   - Onboarding integration point

2. **Build Core Screens** (development)
   - ValuesScreen (ready to build)
   - AppSettingsScreen (ready to build)
   - AccountSettingsScreen (can build UI shell)

3. **Domain Validation** (agents)
   - Compliance review (account deletion, privacy settings)
   - Security review (encryption, logout flow)

4. **Integration & Testing**
   - Onboarding → valuesStore integration
   - Notification system integration
   - Accessibility testing

---

## Notes

- **Architecture Choice**: Went with Option A (foundation + TODOs) to allow structural testing while open questions are resolved
- **Values Consistency**: Used existing onboarding MBCT values (not ACT domains) for consistency
- **Privacy-First Defaults**: Analytics opt-out by default, check-in reminders opt-in by default
- **Performance Conscious**: Encrypted storage for PHI only, AsyncStorage for preferences
- **Domain Awareness**: Clear TODO markers for compliance/clinical validation needs

---

**Generated via**: `/b-work FEAT-6` with product + clinician agent review
**Template**: B-DEV (Being Development) - General path with domain validation
**Agents Used**: product, clinician (in parallel during planning)
**Next Command**: User tests foundation, answers open questions, then `/b-close FEAT-6` when satisfied
