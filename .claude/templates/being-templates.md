# Being Templates - Source of Truth

**Purpose**: Detailed workflow definitions for Being. MBCT development with domain authority validation

**Usage**: Claude reads these templates on-demand when executing workflows. CLAUDE.md contains quick reference only.

**CRITICAL**: This file includes the validation matrix which is mandatory for safety-critical work.

---

## Templates

### **B-CRISIS: Crisis/Safety Features** [LIFE-SAFETY CRITICAL]

**Pattern**:
```
(crisis+compliance)-plan → main → (crisis+compliance+accessibility+[ux if UI])-validate → Testing → Done (user runs /b-close)
```

**When to use**: Crisis detection, safety plans, emergency features, 988 integration, PHQ/GAD thresholds

**Non-negotiable requirements**:
- Crisis detection <200ms (measured)
- All crisis data encrypted at rest
- Audit log created for all events
- 988 accessible in <3 taps
- Screen reader compatible (WCAG AA minimum)
- No false negatives on thresholds

**Workflow**:
1. Agent validation complete → Update Notion to "Testing"
2. User verifies in real environment (device testing, threshold validation)
3. User runs `/b-close [WORK_ITEM_ID]` when satisfied → merges to development, updates to "Done"

**Examples**:
- "Update crisis button behavior" → (crisis+compliance) plan → main (<200ms) → (crisis+compliance+ux+accessibility)-validate → Testing → user runs `/b-close`
- "PHQ-9 threshold from ≥20 to ≥15" → (crisis+compliance) → main → (crisis+compliance+accessibility)-validate → Testing → user runs `/b-close` → deploy

---

### **B-HOTFIX: Safety Bug Hotfixes** [EMERGENCY RESPONSE]

**Pattern** (two paths):
```
Path A (True emergency): crisis-assess → main[rapid] → crisis-validate → deploy-immediately → user runs /b-close → Done
Path B (Urgent but can test): crisis-assess → main[rapid] → crisis-validate → Testing → quick-test → user runs /b-close → deploy
```

**When to use**: Emergency bugs affecting crisis/assessment/safety features

**Emergency constraints**:
- <30min time to fix
- Minimal, focused change (no refactoring)
- No scope creep
- Immediate deployment after validation (Path A) or quick test (Path B)

**Path decision**:
- **Path A**: User actively affected, system down, safety risk NOW → Skip "Testing", deploy immediately, then user runs `/b-close` to mark "Done"
- **Path B**: Urgent but not actively breaking, can do 2-min verification → Update to "Testing", quick test, then user runs `/b-close` → deploy

**Examples**:
- "Crisis button not responding NOW" → Path A: crisis → main (rapid) → crisis validates → deploy → user runs `/b-close`
- "Assessment scoring crash (no active users)" → Path B: crisis → main (rapid) → crisis validates → Testing → quick test → user runs `/b-close` → deploy

---

### **B-DEV: Being Development** [DOMAIN-AWARE]

**When to use**: Features, components, refactoring in Being context (everything except B-CRISIS and B-HOTFIX)

**Decision framework**:
```
Analyze work type, then route to appropriate path:

1. Therapeutic content (MBCT exercises, mindfulness, guided practices)?
   → clinician-review → ux-design → main → (clinician+ux+accessibility)-validate + [performance-validate if 60fps required]
   → Testing → user tests → user runs /b-close
   Examples: New breathing exercise, body scan, check-in flow updates
   Note: UX designs interaction, clinician validates therapeutic accuracy, accessibility validates WCAG, performance required for animations (60fps)

2. Assessment features (PHQ-9/GAD-7 scoring, UI, calculations)?
   → clinician-review → ux-design → main → (clinician(DSM-5)+ux(interaction)+crisis(thresholds)+accessibility(UI))-validate
   → Testing → user tests → user runs /b-close
   Examples: Add GAD-7 follow-up questions, update severity labels
   Note: UX designs interaction, clinician validates clinical accuracy, crisis validates thresholds, accessibility validates UI

3. Privacy/PHI features (data export, payment, HIPAA compliance)?
   → (compliance+security)-review → [ux-design if UI] → main → (compliance+security+[ux if UI]+[accessibility if UI])-validate
   → Testing → user tests → user runs /b-close
   Examples: Export user data, subscription flow, data retention
   Note: Compliance validates HIPAA/legal requirements, security validates encryption/secure storage, UX required if UI involved

4. General Being feature (progress charts, UI improvements, non-PHI)?
   UI features:
   → [domain-review?] → ux-design → main → (ux+accessibility)-validate
   → Testing → user tests → user runs /b-close
   Backend-only:
   → [domain-review?] → main → [domain-validate?]
   → Testing → user tests → user runs /b-close
   Examples: Mood trends chart (UI), enhanced export (UI), analytics dashboard (UI), API improvements (backend-only)
   Note: UX+accessibility required for all UI features; optional domain review based on proximity to therapeutic/crisis/PHI areas

5. Simple technical feature with no domain or UI concerns?
   → main → Testing → user tests → user runs /b-close
```

**Examples by path**:

*Therapeutic path*:
- "Add gratitude exercise" → clinician-review (MBCT?) → ux-design → main → (clinician+ux+accessibility)-validate → Testing → user runs `/b-close`
- "Breathing with animation" → clinician → ux-design → architect (60fps) → main → (clinician+ux+accessibility+performance(60fps))-validate → Testing → user runs `/b-close`

*Assessment path*:
- "Update PHQ-9 severity labels" → clinician (DSM-5 correct?) → ux-design → main → clinician-validate + ux-validate + crisis-validate (thresholds) + accessibility-validate → Testing → user runs `/b-close`
- "Add GAD-7 trend display" → clinician-review → ux-design → main → clinician-validate + ux-validate + crisis-validate + accessibility-validate → Testing → user runs `/b-close`

*Privacy path*:
- "Export journal for therapist" → (compliance(PHI? HIPAA?)+security) → ux-design → main (encrypt) → (compliance+security+ux+accessibility)-validate → Testing → user runs `/b-close`
- "Subscription flow" → (compliance+security) → ux-design → main → (compliance(PCI+HIPAA)+security(encryption)+ux+accessibility)-validate → Testing → user runs `/b-close`
- "Automated data retention (backend)" → (compliance+security) → main → (compliance+security)-validate → Testing → user runs `/b-close` (no UI, no UX needed)

*General path*:
- "Progress insights chart" → ux-design → main → (ux+accessibility)-validate → [optional clinician-review (therapeutic presentation?)] → Testing → user runs `/b-close`
- "Enhanced UI animations" → ux-design → main → (ux+accessibility)-validate → [optional clinician check] → Testing → user runs `/b-close`
- "API performance optimization" → main → Testing → user runs `/b-close` (backend-only, no UX needed)

---

### **B-DEBUG: Being Debugging** [DOMAIN-AWARE]

**When to use**: Non-emergency bugs in Being context

**Decision framework**:
```
Investigation phase:
Is root cause clear?
  → YES: Fix directly
  → NO: Invoke specialist-investigate
      - Performance issue → performance-investigate
      - Security concern → security-investigate
      - Type confusion → typescript-investigate
      - State bug → state-investigate

Domain validation phase (after fix):
Bug affected therapeutic content/UX?
  → (clinician+ux+accessibility)-validate fix → Testing → user verifies → user runs /b-close

Bug affected assessment features?
  → (clinician+crisis+ux+accessibility)-validate → Testing → user verifies → user runs /b-close

Bug affected privacy/data handling?
  → (compliance+[ux+accessibility if UI])-validate → Testing → user verifies → user runs /b-close

Bug affected UI/interactions?
  → (ux+accessibility)-validate → Testing → user verifies → user runs /b-close

Backend-only bug?
  → Optional domain check → Testing → user verifies → user runs /b-close
```

**Examples**:

*With investigation*:
- "Breathing animation stutters" → performance-investigate → main (fix) → (clinician(still therapeutic?)+ux+performance(60fps?)+accessibility)-validate → Testing → user runs `/b-close`
- "Mood data sometimes lost" → state-investigate → main (fix) → compliance-check (data integrity?) → Testing → user runs `/b-close`

*Without investigation (root cause clear)*:
- "Button color too dark in check-in" → main (fix CSS) → (clinician+ux+accessibility)-validate (still therapeutic?) → Testing → user runs `/b-close`
- "Text alignment broken on small screens" → main (fix layout) → (ux+accessibility)-validate → Testing → user runs `/b-close`

*Assessment bugs*:
- "GAD-7 score off by 1" → main (fix calculation) → (clinician(DSM-5?)+crisis(thresholds?))-validate → Testing → user runs `/b-close` (backend-only, no UX)
- "PHQ-9 questions in wrong order" → main (reorder) → (clinician+ux+accessibility)-validate → Testing → user runs `/b-close`

*UI bugs*:
- "Modal dismiss gesture broken" → main (fix gesture) → (ux+accessibility)-validate → Testing → user runs `/b-close`
- "Navigation animation janky" → main (fix animation) → (ux+accessibility)-validate → Testing → user runs `/b-close`

**Difference from B-HOTFIX**:
- B-HOTFIX: URGENT (<30min), safety-critical, Path A skips "Testing" for true emergencies, Path B includes quick test
- B-DEBUG: Standard timeline, investigation allowed, always includes "Testing" status for user verification

---

## Decision Trees

### Which Being Template?

```
Is this safety-critical or urgent?
├─ Crisis detection/thresholds → B-CRISIS
└─ Emergency bug → B-HOTFIX

Is this building or fixing (non-emergency)?
├─ Building → B-DEV
│   ├─ Therapeutic content → therapeutic path
│   ├─ Assessment features → assessment path
│   ├─ Privacy/PHI → privacy path
│   └─ General feature → general path
│
└─ Fixing → B-DEBUG
    ├─ Investigate if needed → specialist-investigate
    ├─ Fix bug → main
    └─ Domain validate based on affected area
```

---

## Validation Matrix

### When Each Validator is Required

**Understanding the Matrix**:
- ✅ **Required** - Validator must check, failure blocks deployment
- 🟡 **Conditional** - Required only if specific conditions met
- ⚪ **Optional** - Beneficial but not required

| Work Type | Clinician | UX | Crisis | Compliance | Security | Performance | Accessibility |
|-----------|-----------|-----|--------|------------|----------|-------------|---------------|
| **B-CRISIS features** | ⚪ optional | 🟡 if UI | ✅ required | ✅ required | ⚪ optional | 🟡 <200ms | ✅ required |
| **Assessment UI** | ✅ required (DSM-5) | ✅ required | ✅ required (thresholds) | ⚪ optional | ⚪ optional | ⚪ optional | ✅ required |
| **Therapeutic content** | ✅ required (MBCT) | ✅ required | ⚪ optional | ⚪ optional | ⚪ optional | 🟡 if animation (60fps) | ✅ required |
| **Privacy/PHI features** | ⚪ optional | 🟡 if UI | ⚪ optional | ✅ required (HIPAA) | ✅ required (encryption) | ⚪ optional | 🟡 if UI |
| **General UI features** | ⚪ optional | ✅ required | ⚪ optional | ⚪ optional | ⚪ optional | ⚪ optional | ✅ required |
| **Backend-only** | ⚪ optional | ⚪ not needed | ⚪ optional | ⚪ optional | ⚪ optional | ⚪ optional | ⚪ not needed |

### Validator Responsibilities

**Clinician** (MBCT/DSM-5 accuracy):
- Validates MBCT therapeutic accuracy
- Validates DSM-5 assessment wording
- Validates therapeutic UX appropriateness

**UX** (User experience design):
- Validates interaction patterns appropriate for therapeutic context
- Validates user flows support mindfulness (not rushed/anxious)
- Validates design consistency with mental health best practices
- Validates touch targets, gestures, navigation for mobile
- Collaborates with clinician on therapeutic integrity

**Crisis** (Safety thresholds):
- Validates PHQ≥15, GAD≥15 thresholds
- Validates Q9>0 immediate intervention
- Validates 988 access (<3 taps)
- Validates crisis detection timing (<200ms)

**Compliance** (Legal/regulatory):
- Validates HIPAA compliance
- Validates consent management
- Validates data retention policies
- Validates PCI DSS (payment)

**Security** (Technical safety):
- Validates encryption strength (AES-256)
- Validates secure storage (SecureStore)
- Validates no data leaks
- Validates vulnerability prevention

**Performance** (Timing requirements):
- Crisis features: <200ms (always measured)
- Breathing/animations: 60fps (always measured)
- User interactive: <100ms (when specified)

**Accessibility** (Universal access):
- Screen reader compatibility (WCAG AA)
- Keyboard navigation
- Color contrast
- Focus management
- **CRITICAL**: Life-safety features must be accessible

---

*Last updated: 2025-09-30*
*File location: ~/Development/active/fullmind/.claude/templates/being-templates.md*
