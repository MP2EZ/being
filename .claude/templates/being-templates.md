# Being Templates - Source of Truth

**Purpose**: Detailed workflow definitions for Being. MBCT development with domain authority validation

**Usage**: Claude reads these templates on-demand when executing workflows. CLAUDE.md contains quick reference only.

**CRITICAL**: This file includes the validation matrix which is mandatory for safety-critical work.

---

## Templates

### **B-CRISIS: Crisis/Safety Features** [LIFE-SAFETY CRITICAL]

**Pattern**:
```
(crisis+compliance)-plan → main → (crisis+compliance+accessibility)-validate → [deploy?]
```

**When to use**: Crisis detection, safety plans, emergency features, 988 integration, PHQ/GAD thresholds

**Non-negotiable requirements**:
- Crisis detection <200ms (measured)
- All crisis data encrypted at rest
- Audit log created for all events
- 988 accessible in <3 taps
- Screen reader compatible (WCAG AA minimum)
- No false negatives on thresholds

**Examples**:
- "Update crisis button behavior" → (crisis+compliance) plan → main (<200ms) → (crisis+compliance+accessibility)-validate
- "PHQ-9 threshold from ≥20 to ≥15" → (crisis+compliance) → main → (crisis+compliance+accessibility)-validate → deploy

---

### **B-HOTFIX: Safety Bug Hotfixes** [EMERGENCY RESPONSE]

**Pattern**:
```
crisis-assess → main[rapid] → crisis-validate → deploy-immediately
```

**When to use**: Emergency bugs affecting crisis/assessment/safety features

**Emergency constraints**:
- <30min time to fix
- Minimal, focused change (no refactoring)
- No scope creep
- Immediate deployment after validation

**Examples**:
- "Crisis button not responding" → crisis assesses (URGENT) → main fixes (rapid) → crisis validates → deploy
- "Assessment scoring crash" → crisis → main (rapid) → crisis → deploy

---

### **B-DEV: Being Development** [DOMAIN-AWARE]

**When to use**: Features, components, refactoring in Being context (everything except B-CRISIS and B-HOTFIX)

**Decision framework**:
```
Analyze work type, then route to appropriate path:

1. Therapeutic content (MBCT exercises, mindfulness, guided practices)?
   → clinician-review → main → (clinician+accessibility)-validate + [performance-validate if 60fps required]
   Examples: New breathing exercise, body scan, check-in flow updates
   Note: Performance required for animations (60fps), accessibility required for all therapeutic UI

2. Assessment features (PHQ-9/GAD-7 scoring, UI, calculations)?
   → clinician-review → main → (clinician(DSM-5)+crisis(thresholds)+accessibility(UI))-validate
   Examples: Add GAD-7 follow-up questions, update severity labels
   Note: Clinician validates clinical accuracy, crisis validates thresholds, accessibility validates UI

3. Privacy/PHI features (data export, payment, HIPAA compliance)?
   → (compliance+security)-review → main → (compliance+security)-validate
   Examples: Export user data, subscription flow, data retention
   Note: Compliance validates HIPAA/legal requirements, security validates encryption/secure storage

4. General Being feature (progress charts, UI improvements, non-PHI)?
   → [domain-review?] → main → [domain-validate?]
   Examples: Mood trends chart, enhanced export (non-PHI), analytics
   Optional domain review based on proximity to therapeutic/crisis/PHI areas

5. Simple feature with no domain concerns?
   → main
```

**Examples by path**:

*Therapeutic path*:
- "Add gratitude exercise" → clinician-review (MBCT?) → main → (clinician+accessibility)-validate
- "Breathing with animation" → clinician → architect (60fps) → main → (clinician+accessibility+performance(60fps))-validate 

*Assessment path*:
- "Update PHQ-9 severity labels" → clinician (DSM-5 correct?) → main → clinician-validate + crisis-validate (thresholds) + accessibility-validate
- "Add GAD-7 trend display" → clinician-review → main → clinician-validate + crisis-validate + accessibility-validate

*Privacy path*:
- "Export journal for therapist" → (compliance(PHI? HIPAA?)+security) → main (encrypt) → (compliance+security)-validate
- "Subscription flow" → (compliance+security) → main → (compliance(PCI+HIPAA)+security(encryption))-validate

*General path*:
- "Progress insights chart" → main → clinician-review (therapeutic presentation?)
- "Enhanced UI animations" → main → [optional clinician check]

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
  → clinician-validate fix

Bug affected assessment features?
  → (clinician+crisis)-validate

Bug affected privacy/data handling?
  → compliance-validate

General bug?
  → Optional domain check
```

**Examples**:

*With investigation*:
- "Breathing animation stutters" → performance-investigate → main (fix) → (clinician(still therapeutic?)+performance(60fps?))-validate
- "Mood data sometimes lost" → state-investigate → main (fix) → compliance-check (data integrity?)

*Without investigation (root cause clear)*:
- "Button color too dark in check-in" → main (fix CSS) → clinician-review (still therapeutic?)
- "Text alignment broken on small screens" → main (fix layout) → accessibility-validate

*Assessment bugs*:
- "GAD-7 score off by 1" → main (fix calculation) → (clinician(DSM-5?)+crisis(thresholds?))-validate
- "PHQ-9 questions in wrong order" → main (reorder) → clinician-validate

**Difference from B-HOTFIX**:
- B-HOTFIX: URGENT (<30min), safety-critical, rapid deployment
- B-DEBUG: Standard timeline, investigation allowed, regular deployment

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

| Work Type | Clinician | Crisis | Compliance | Security | Performance | Accessibility |
|-----------|-----------|--------|------------|----------|-------------|---------------|
| **B-CRISIS features** | ⚪ optional | ✅ required | ✅ required | ⚪ optional | 🟡 <200ms | ✅ required |
| **Assessment UI** | ✅ required (DSM-5) | ✅ required (thresholds) | ⚪ optional | ⚪ optional | ⚪ optional | ✅ required |
| **Therapeutic content** | ✅ required (MBCT) | ⚪ optional | ⚪ optional | ⚪ optional | 🟡 if animation (60fps) | ✅ required |
| **Privacy/PHI features** | ⚪ optional | ⚪ optional | ✅ required (HIPAA) | ✅ required (encryption) | ⚪ optional | 🟡 if UI |
| **General UI features** | ⚪ optional | ⚪ optional | ⚪ optional | ⚪ optional | ⚪ optional | ✅ required |
| **Backend-only** | ⚪ optional | ⚪ optional | ⚪ optional | ⚪ optional | ⚪ optional | ⚪ not needed |

### Validator Responsibilities

**Clinician** (MBCT/DSM-5 accuracy):
- Validates MBCT therapeutic accuracy
- Validates DSM-5 assessment wording
- Validates therapeutic UX appropriateness

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
