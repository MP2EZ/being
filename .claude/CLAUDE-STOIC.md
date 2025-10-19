# Being. Stoic Mindfulness [requires: ~/.claude/CLAUDE.md]

## Requirement
~/.claude/CLAUDE.md

## Agents

### Domain Authorities (Updated for Stoic Pivot)

| Agent | Pri | Function | Triggers | Override |
|-------|-----|----------|----------|----------|
| crisis | !! | safety protocols\|988\|emergency response\|intervention workflows | PHQ≥15\|PHQ≥20\|GAD≥15\|button\|risk | ALL |
| compliance | ! | HIPAA compliance\|privacy law\|regulatory validation\|legal requirements | data\|encrypt\|consent\|network | technical |
| philosopher | ! | Stoic framework validation\|philosophical accuracy\|principle integrity\|virtue ethics | Stoic principles\|Marcus Aurelius\|Epictetus\|Seneca\|dichotomy of control\|virtue | UX |

**Hierarchy:** crisis>compliance>philosopher>technical

**Key Changes from MBCT:**
- ❌ **Removed:** `clinician` agent (MBCT validation no longer needed)
- ✅ **Added:** `philosopher` agent (Stoic framework validation)
- ✅ **Kept:** `crisis` + `compliance` (safety + privacy still critical)

---

### Philosopher Agent Details

**Domain Expertise:**
- Stoic philosophy (Marcus Aurelius, Epictetus, Seneca)
- Virtue ethics (wisdom, courage, justice, temperance)
- Dichotomy of control (sphere sovereignty)
- Stoic contemplative practices
- Integration with neuroscience research

**Validation Responsibilities:**
1. **Philosophical Accuracy**
   - Are Stoic principles represented correctly?
   - Does content align with classical Stoic texts?
   - Are virtues (wisdom, courage, justice, temperance) accurate?
   - Is dichotomy of control applied correctly?

2. **Framework Integrity**
   - Do the 13 principles form coherent system?
   - Is developmental progression (fragmented → integrated) realistic?
   - Are domain applications (work, relationships, adversity) appropriate?
   - Does practice architecture align with Stoic philosophy?

3. **Language & Positioning**
   - Is Stoic terminology used correctly? (e.g., "premeditatio malorum" not "negative visualization")
   - Does framing balance accessibility vs. accuracy?
   - Are quotes attributed correctly?
   - Is neuroscience integration philosophically sound?

4. **Content Quality**
   - Educational modules: Accurate representation of Stoic concepts
   - Check-in prompts: Aligned with Stoic practice
   - Principle explanations: Clear, accurate, actionable
   - Avoid: Pop-Stoicism, oversimplification, misattribution

**Triggers (Auto-invoke philosopher agent):**
- Content mentions: Marcus Aurelius, Epictetus, Seneca, Zeno
- Concepts: dichotomy of control, virtue, prohairesis, preferred indifferents
- Principles: Any of the 13 Stoic Mindfulness principles
- Check-in prompts: Morning intention, virtue practice, evening review
- Educational modules: Stoic philosophy explanations
- Neuroscience integration: Claims about Stoic practices

**Override Authority:**
- Philosopher can override UX decisions that compromise philosophical accuracy
- Example: UX suggests "control what you can" → Philosopher corrects to "dichotomy of control" with proper framing
- Cannot override crisis/compliance/technical (safety > accuracy)

**Non-Negotiables:**
1. ✅ Stoic principles must be philosophically accurate (not pop-philosophy)
2. ✅ Classical sources cited correctly (Meditations, Enchiridion, Letters)
3. ✅ Virtue ethics central (wisdom, courage, justice, temperance)
4. ✅ Dichotomy of control represented properly (not oversimplified)
5. ✅ No conflation with other philosophies (Buddhism, Taoism, etc.)

---

### Intern Boundaries (Updated)

**PROHIBIT:**
- clinical\|crisis\|compliance\|PHI\|therapeutic\|AsyncStorage\|security
- **Stoic philosophy content** (requires philosopher validation)
- **Principle frameworks** (requires philosopher validation)
- **Educational modules** (requires philosopher validation)

**ALLOW:**
- formatting\|imports\|scaffolding(non-philosophical)\|file-org\|config(non-security)
- UI components (buttons, cards, layouts - not content)
- Navigation structure (if not changing philosophical flow)

**ESCALATE:**
- healthcare-terms\|/assessment/\|/crisis/\|/clinical/
- **Stoic terminology** (Marcus Aurelius, virtue, dichotomy of control)
- **/principles/** directory
- **Check-in prompt content**
- **Educational content**

---

### Auto-Triggers (Updated)

**CRITICAL:**
- PHQ≥15\|PHQ≥20\|GAD≥15\|crisis-button\|safety-risk\|emergency-features

**COMPLIANCE:**
- data-encrypt\|storage\|consent\|network\|app-store

**PHILOSOPHICAL:** (NEW)
- Stoic-principles\|virtue-ethics\|Marcus-Aurelius\|Epictetus\|Seneca
- dichotomy-of-control\|prohairesis\|preferred-indifferents
- educational-modules\|principle-content\|check-in-prompts
- developmental-stages\|character-cultivation

---

### Templates (Updated)

**Quick Reference:**

**Being Templates:**
- **B-CRISIS:** Crisis/safety → (crisis+compliance)→main→(crisis+compliance+accessibility)
  - Use for: crisis detection, PHQ/GAD thresholds, 988, safety protocols

- **B-HOTFIX:** Emergency bugs → crisis→main[rapid]→crisis-validate→deploy
  - Use for: urgent safety bugs, <30min rapid response

- **B-DEV:** Being development (Stoic version)
  - Use for: features, **Stoic content**, assessment UI, privacy features
  - Paths:
    - **philosophical** (philosopher) - NEW
    - **assessment** (philosopher→crisis) - UPDATED (was clinician→crisis)
    - **privacy** (compliance+security)
    - **general** (technical)

- **B-DEBUG:** Being debugging
  - Use for: non-emergency bugs with Being domain awareness
  - Domain validation:
    - **philosophical** (philosopher) - NEW
    - **assessment** (philosopher+crisis) - UPDATED (was clinician+crisis)
    - **privacy** (compliance)

**Detailed templates:** ./.claude/templates/being-templates.md

---

### Conflicts (Updated)

**Domain Hierarchy:** crisis>compliance>philosopher (safety-first)

**Examples:**
1. **Philosopher vs. UX:** Philosopher wants accurate Stoic terminology, UX wants simplicity
   - **Resolution:** Philosopher veto for accuracy, but must suggest accessible framing
   - **Example:** "Dichotomy of control" can be introduced as "what's in your power" but must teach proper concept

2. **Crisis vs. Philosopher:** Crisis detection in contemplative app feels inconsistent
   - **Resolution:** Crisis wins (safety > philosophy), but positioning matters
   - **Implementation:** Clear messaging that philosophy doesn't replace professional help

3. **Technical vs. Philosopher:** Developer wants to change principle sequence for UX flow
   - **Resolution:** Architect mediates, philosopher has domain-veto if breaks framework integrity

---

### Handoff Requirements (Updated)

**Domain work:** L3-Complex required | **Technical-only:** L1/L2 acceptable

**Philosophical Work:** Include validation checklist + non-negotiables
- Philosophical accuracy requirements
- Classical source citations
- Framework integrity notes
- Accessibility vs. accuracy trade-offs

**Crisis/Safety:** Include validation checklist + non-negotiables (unchanged)

**Assessment Work:** Include accuracy requirements + crisis/philosopher notes
- PHQ/GAD scoring must remain 100% accurate
- Crisis thresholds non-negotiable (PHQ≥15, PHQ≥20, GAD≥15)
- Wellness framing (not clinical) must not compromise measurement validity

---

### Global Integration

**Domain content (philosophical\|crisis\|compliance)** → B-CRISIS/B-HOTFIX/B-DEV/B-DEBUG

**Technical-only** → Global T-DEV/T-DEBUG/T-BATCH/T-MIGRATE

**Mixed** → B-template + domain validation

**Escalation:** Single→Being.Template→Global+Domain→Architect

---

## Product [!!]

### Config
RN/Expo/TS/Zustand

### Standards (Updated for Stoic)

**Assessment Standards** (unchanged):
- PHQ/GAD: exact-words\|100%-accuracy\|thresholds(PHQ≥15/≥20,GAD≥15)
  - ↳ PHQ≥15=support, PHQ≥20=intervention
- Crisis: 988\|<3s-access\|auto-trigger

**Stoic Standards** (NEW):
- **Philosophical accuracy:** Classical sources\|proper attribution\|no pop-philosophy
- **Virtue ethics:** wisdom\|courage\|justice\|temperance (4 cardinal virtues)
- **Dichotomy of control:** proper framing\|not oversimplified
- **13 Principles:** coherent framework\|developmental progression
- **Practice architecture:** Morning(10-20min)\|Midday(2-5min)\|Evening(5-10min)
- **Neuroscience integration:** Research-backed\|cited properly\|philosophically sound

**Performance** (unchanged):
- Launch<2s | Crisis<200ms | Check-in<500ms | Breath@60fps | Assessment<300ms

**Storage** (unchanged):
- encrypt\|auto-save\|validate\|offline

---

### Performance (unchanged)

Launch<2s | Crisis<200ms | Check-in<500ms | Breath@60fps | Assessment<300ms

---

### Testing (Updated)

**Assessment Testing** (unchanged):
- PHQ(27-combos)\|GAD(21-combos)\|scoring-100%
- Crisis: <3s-all-screens\|988-works\|contacts

**Stoic Content Testing** (NEW):
- **Philosophical accuracy:** Expert review\|classical source verification
- **Principle coherence:** 13 principles form complete system
- **Developmental progression:** Fragmented→Effortful→Fluid→Integrated makes sense
- **Domain applications:** Work\|relationships\|adversity scenarios realistic
- **Check-in prompts:** Aligned with Stoic practice\|actionable\|clear

**Platform Testing** (unchanged):
- iOS=Android\|WCAG-AA\|offline-complete

---

### State [Zustand] (Updated)

**Stores:**
- **user** → profile\|prefs
- **checkIn** → mood[encrypted]\|**virtue_tracking**[NEW]\|**intention**[NEW]
- **assessment** → PHQ/GAD[!!]\|wellness_progress
- **crisis** → contacts[!!]\|988-ready
- **practice** → **principles_completed**[NEW]\|**developmental_stage**[NEW]\|**domain_progress**[NEW]

**Key Data Models** (NEW for Stoic):
```typescript
interface StoicPracticeStore {
  developmental_stage: 'fragmented' | 'effortful' | 'fluid' | 'integrated';
  principles_completed: string[];  // Array of principle IDs
  domain_applications: {
    work: DomainProgress;
    relationships: DomainProgress;
    adversity: DomainProgress;
  };
  virtue_tracking: {
    wisdom: VirtueInstance[];
    courage: VirtueInstance[];
    justice: VirtueInstance[];
    temperance: VirtueInstance[];
  };
}

interface CheckInData {
  // Morning
  intention?: IntentionData;  // What virtue will you practice today?
  gratitude?: GratitudeData;  // 3 specific things
  preparation?: PreparationData;  // What obstacles might arise?

  // Midday
  control_check?: ControlData;  // What's in/out of your control?
  embodiment?: EmbodimentData;  // Body awareness, sensations
  reappraisal?: ReappraisalData;  // Obstacles as opportunities

  // Evening
  review?: ReviewData;  // Did you practice your intention?
  learning?: LearningData;  // Where did you react vs. respond?
  evening_gratitude?: GratitudeData;  // 3 things from today
}
```

---

## Documentation

### Structure & Key Files (Updated)

**Docs:** /docs/{technical,**philosophical**[NEW],security,brand-legal}/ | /scripts/

**Philosophical Guides** (NEW):
- Stoic-Framework-Overview.md
- 13-Principles-Reference.md
- Classical-Sources.md (Marcus Aurelius, Epictetus, Seneca citations)
- Virtue-Ethics-Guide.md
- Developmental-Stages-Explained.md

**Technical Guides** (existing):
- Crisis-Button-Implementation-Guide.md
- TypeScript-Safety-Guide.md
- Widget-Crisis-Button-Integration-Summary.md

**Agent Protocols:** /CONTRIBUTING.md (safety requirements | handoff protocols | **philosophical validation**[NEW])

**PM:** Notion 25da1108c2088077b24be0238a1ddf37

---

### Policies (Updated)

**PROHIBIT:**
- /app/*.md | duplicates | phase-reports
- **Pop-philosophy content** (oversimplified Stoicism)
- **Misattributed quotes** (not from classical sources)

**DELETE:**
- completed-work | old-validations (after-merge)
- **MBCT-specific documentation** (if pivot proceeds)

**REQUIRE PHILOSOPHER REVIEW:**
- All educational modules about Stoic principles
- Check-in prompts (ensure philosophical alignment)
- Principle explanations
- Virtue ethics content
- Developmental stage descriptions

---

## Operations

**Branches:** main(philosopher-validated)\|release(full-review)\|hotfix(crisis-expedited)

**Commands:**
- test:assessment (PHQ/GAD accuracy)
- validate:accessibility (WCAG-AA)
- perf:breathing (60fps requirement)
- perf:crisis (<200ms response)
- **validate:philosophy**[NEW] (philosophical accuracy check)

**Integration:** global-standards + domain-requirements | Domain-veto-power

---

## Transition Notes (MBCT → Stoic)

### Agent Changes

**Removed:**
- ❌ `clinician` agent (MBCT validation)
  - **Why:** No longer doing MBCT-specific therapeutic content
  - **What transfers:** PHQ/GAD scoring validation still needed, but general wellness framing (not clinical)

**Added:**
- ✅ `philosopher` agent (Stoic framework validation)
  - **Why:** Need domain expertise for philosophical accuracy
  - **Scope:** Classical Stoicism, virtue ethics, contemplative practices
  - **Auto-triggers:** Principle content, educational modules, check-in prompts

**Unchanged:**
- ✅ `crisis` agent (safety protocols, 988, emergency response)
  - **Why:** Wellness app still needs crisis detection for severe distress
  - **Integration:** Philosophy doesn't replace professional help messaging

- ✅ `compliance` agent (HIPAA, privacy, legal)
  - **Why:** Still collecting personal wellness data (PHQ/GAD, reflections)
  - **Scope:** Encryption, consent, data handling unchanged

### Content Migration

**Keep (reframe):**
- PHQ-9/GAD-7 assessments (wellness tracking, not clinical diagnosis)
- Crisis detection system (safety feature, not primary value prop)
- Breathing exercises (embodied awareness practice)
- Check-in structure (3x daily: morning/midday/evening)

**Remove:**
- MBCT educational content
- Clinical terminology (decentering, automatic thoughts, rumination)
- 8-week program references
- Therapeutic positioning language

**Add:**
- 13 Stoic Mindfulness principles
- Virtue ethics framework
- Developmental stage progression
- Domain-specific applications
- Neuroscience integration for Stoic practices

---

**Document Version:** 1.0.0 (Stoic Pivot)
**Created:** 2025-10-18
**Replaces:** CLAUDE.md v1.0 (MBCT version)
**Status:** Draft for review

**Usage:** If Stoic pivot proceeds, rename to CLAUDE.md and replace existing configuration.
