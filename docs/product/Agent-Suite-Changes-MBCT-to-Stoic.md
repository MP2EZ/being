# Agent Suite Changes: MBCT → Stoic Mindfulness Pivot

```yaml
document:
  type: Agent Configuration Guide
  version: 1.0.0
  created: 2025-10-18
  purpose: Document agent suite updates for Stoic pivot

changes:
  removed: clinician (MBCT validation)
  added: philosopher (Stoic framework validation)
  kept: crisis + compliance (safety + privacy)
```

---

## Executive Summary

**If you pivot from MBCT to Stoic Mindfulness, your agent suite needs ONE critical change:**

- ❌ **Remove:** `clinician` agent (MBCT therapeutic content validation)
- ✅ **Add:** `philosopher` agent (Stoic framework validation)
- ✅ **Keep:** `crisis` + `compliance` agents (safety and privacy still critical)

**File to update:** `/Users/max/Development/active/being/.claude/CLAUDE-STOIC.md` (rename to `CLAUDE.md` if pivot proceeds)

---

## Agent Comparison

### Current (MBCT) Agent Suite

| Agent | Priority | Domain | Triggers | Override |
|-------|----------|--------|----------|----------|
| **crisis** | !! | Safety protocols, 988, emergency response | PHQ≥15/20, GAD≥15, crisis button | ALL |
| **compliance** | ! | HIPAA, privacy law, regulatory | Data encryption, consent, network | technical |
| **clinician** | ! | MBCT validation, therapeutic content, PHQ/GAD scoring | MBCT exercises, mood tracking, PHQ/GAD | UX |

**Hierarchy:** crisis > compliance > clinician > technical

---

### Proposed (Stoic) Agent Suite

| Agent | Priority | Domain | Triggers | Override |
|-------|----------|--------|----------|----------|
| **crisis** | !! | Safety protocols, 988, emergency response | PHQ≥15/20, GAD≥15, crisis button | ALL |
| **compliance** | ! | HIPAA, privacy law, regulatory | Data encryption, consent, network | technical |
| **philosopher** | ! | Stoic framework, philosophical accuracy, virtue ethics | Stoic principles, Marcus Aurelius, Epictetus, virtue, dichotomy of control | UX |

**Hierarchy:** crisis > compliance > philosopher > technical

---

## What Changed and Why

### ❌ Removed: `clinician` Agent

**Why remove:**
- No longer doing MBCT-specific therapeutic content
- Not positioning as clinical mental health treatment
- Don't need validation against MBCT protocol (Segal/Williams/Teasdale 2013)

**What it was responsible for:**
- MBCT fidelity validation (8-week protocol adherence)
- Therapeutic language accuracy ("decentering," "automatic thoughts," "rumination")
- PHQ-9/GAD-7 clinical interpretation
- MBCT exercise validation (body scan, 3-minute breathing space)

**What transfers to other agents:**
- **PHQ-9/GAD-7 scoring accuracy** → Still validated, but as wellness metrics (not clinical diagnosis)
- **Crisis thresholds** → `crisis` agent still validates PHQ≥15/20, GAD≥15 triggers
- **Safety protocols** → `crisis` agent unchanged

**What goes away:**
- MBCT-specific content validation
- Therapeutic positioning requirements
- Clinical language enforcement

---

### ✅ Added: `philosopher` Agent

**Why add:**
- Need domain expertise for Stoic philosophy accuracy
- Classical Stoicism has specific concepts that must be represented correctly
- Virtue ethics framework requires philosophical validation
- Risk: Pop-philosophy/oversimplification damages credibility

**What it's responsible for:**

**1. Philosophical Accuracy**
- Are Stoic principles correct? (e.g., dichotomy of control explained properly)
- Are classical sources cited correctly? (Marcus Aurelius' Meditations, Epictetus' Enchiridion)
- Is virtue ethics accurate? (wisdom, courage, justice, temperance)
- Are Stoic practices authentic? (not pop-philosophy)

**2. Framework Integrity**
- Do the 13 principles form a coherent system?
- Is developmental progression realistic? (fragmented → effortful → fluid → integrated)
- Are domain applications appropriate? (work, relationships, adversity)
- Does practice architecture align with Stoic philosophy?

**3. Language & Positioning**
- Is Stoic terminology used correctly?
  - Example: "premeditatio malorum" (not "negative visualization")
  - Example: "dichotomy of control" (not just "control what you can")
- Does framing balance accessibility vs. accuracy?
- Are quotes attributed correctly to classical sources?

**4. Content Quality**
- Educational modules: Accurate Stoic concepts
- Check-in prompts: Aligned with Stoic practice
- Principle explanations: Clear, accurate, actionable
- Neuroscience integration: Philosophically sound

**Auto-Triggers:**
```
Trigger philosopher agent when content mentions:
- Philosophers: Marcus Aurelius, Epictetus, Seneca, Zeno
- Concepts: dichotomy of control, virtue, prohairesis, preferred indifferents
- Principles: Any of the 13 Stoic Mindfulness principles
- Practices: Morning intention, virtue practice, evening review
- Educational modules about Stoic philosophy
- Neuroscience claims about Stoic practices
```

**Non-Negotiables:**
1. ✅ Stoic principles must be philosophically accurate (not pop-philosophy)
2. ✅ Classical sources cited correctly (Meditations, Enchiridion, Letters from a Stoic)
3. ✅ Virtue ethics central (wisdom, courage, justice, temperance)
4. ✅ Dichotomy of control represented properly (not oversimplified to "control what you can")
5. ✅ No conflation with other philosophies (Buddhism, Taoism, modern self-help)

**Override Authority:**
- Can override UX decisions that compromise philosophical accuracy
- Example: UX wants simple "control what you can" → Philosopher insists on proper "dichotomy of control" framing with accessible explanation
- Cannot override crisis/compliance/technical (safety > accuracy)

---

### ✅ Kept: `crisis` Agent

**Why keep:**
- Wellness app users can still experience mental health crises
- Philosophy doesn't replace professional help when severe distress arises
- Legal/ethical requirement to have crisis pathways

**What changes:**
- **Positioning:** Not a crisis app, but has safety awareness
- **Messaging:** "Stoic practice supports wellness, but we recognize philosophy doesn't replace professional help when crisis arises"
- **Integration:** Crisis detection stays but isn't emphasized in marketing

**What stays the same:**
- PHQ≥20 → immediate intervention
- PHQ≥15 → elevated support
- GAD≥15 → anxiety concern
- 988 hotline integration
- <3s access from all screens
- <200ms response time

---

### ✅ Kept: `compliance` Agent

**Why keep:**
- Still collecting personal wellness data (PHQ/GAD scores, reflections, daily check-ins)
- Privacy-first positioning still important (maybe more for wellness than clinical)
- Encryption, consent, data handling unchanged

**What changes:**
- **Framing:** Wellness data (not clinical PHI)
- **Messaging:** Personal growth reflections require privacy
- **Positioning:** Table stakes for premium wellness apps

**What stays the same:**
- End-to-end encryption
- HIPAA-compliant infrastructure (even if not technically required for wellness)
- Privacy-first analytics
- Audit trail
- User consent flows

---

## Updated Intern Boundaries

### MBCT Version (Old)

```
PROHIBIT: clinical|crisis|compliance|PHI|MBCT|PHQ-9|GAD-7|therapeutic|AsyncStorage|security
```

### Stoic Version (New)

```
PROHIBIT:
  - clinical|crisis|compliance|PHI|therapeutic|AsyncStorage|security (unchanged)
  - Stoic philosophy content (requires philosopher validation)
  - Principle frameworks (requires philosopher validation)
  - Educational modules (requires philosopher validation)

ALLOW:
  - formatting|imports|scaffolding(non-philosophical)|file-org|config(non-security)
  - UI components (buttons, cards, layouts - not content)

ESCALATE:
  - healthcare-terms|/assessment/|/crisis/|/clinical/ (unchanged)
  - Stoic terminology (Marcus Aurelius, virtue, dichotomy of control) - NEW
  - /principles/ directory - NEW
  - Check-in prompt content - NEW
  - Educational content - NEW
```

**Key change:** Intern can't touch philosophical content (like it couldn't touch clinical content before).

---

## Updated Auto-Triggers

### MBCT Version (Old)

```
CRITICAL: PHQ≥15|PHQ≥20|GAD≥15|crisis-button|safety-risk|emergency-features
COMPLIANCE: data-encrypt|storage|consent|network|app-store
CLINICAL: assessment-content|MBCT-exercises|scoring|therapeutic-language
```

### Stoic Version (New)

```
CRITICAL: PHQ≥15|PHQ≥20|GAD≥15|crisis-button|safety-risk|emergency-features (unchanged)

COMPLIANCE: data-encrypt|storage|consent|network|app-store (unchanged)

PHILOSOPHICAL: (NEW - replaces CLINICAL)
  - Stoic-principles|virtue-ethics|Marcus-Aurelius|Epictetus|Seneca
  - dichotomy-of-control|prohairesis|preferred-indifferents
  - educational-modules|principle-content|check-in-prompts
  - developmental-stages|character-cultivation
```

---

## Updated Product Standards

### Assessment Standards (Unchanged)

```
PHQ/GAD: exact-words|100%-accuracy|thresholds(PHQ≥15/≥20,GAD≥15)
  ↳ PHQ≥15=support, PHQ≥20=intervention
Crisis: 988|<3s-access|auto-trigger
```

**Key change:** Reframe as "wellness tracking" not "clinical symptom monitoring"

---

### Stoic Standards (NEW)

```
Philosophical accuracy: Classical sources|proper attribution|no pop-philosophy
Virtue ethics: wisdom|courage|justice|temperance (4 cardinal virtues)
Dichotomy of control: proper framing|not oversimplified
13 Principles: coherent framework|developmental progression
Practice architecture: Morning(10-20min)|Midday(2-5min)|Evening(5-10min)
Neuroscience integration: Research-backed|cited properly|philosophically sound
```

---

## Updated Testing Requirements

### MBCT Version (Old)

```
Clinical: PHQ(27-combos)|GAD(21-combos)|scoring-100%
Crisis: <3s-all-screens|988-works|contacts
Therapeutic: 60s-exact|mood-algorithms|progress
```

### Stoic Version (New)

```
Assessment: PHQ(27-combos)|GAD(21-combos)|scoring-100% (unchanged)
Crisis: <3s-all-screens|988-works|contacts (unchanged)

Philosophical: (NEW - replaces Therapeutic)
  - Philosophical accuracy: Expert review|classical source verification
  - Principle coherence: 13 principles form complete system
  - Developmental progression: Fragmented→Effortful→Fluid→Integrated realistic
  - Domain applications: Work|relationships|adversity scenarios accurate
  - Check-in prompts: Aligned with Stoic practice|actionable|clear
```

---

## Updated State Management

### New Data Models for Stoic

```typescript
// NEW: Stoic practice tracking
interface StoicPracticeStore {
  developmental_stage: 'fragmented' | 'effortful' | 'fluid' | 'integrated';
  principles_completed: string[];
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

// UPDATED: Check-in data structure
interface CheckInData {
  // Morning
  intention?: IntentionData;  // What virtue will you practice?
  gratitude?: GratitudeData;  // 3 specific things
  preparation?: PreparationData;  // What obstacles might arise?

  // Midday
  control_check?: ControlData;  // What's in/out of your control?
  embodiment?: EmbodimentData;  // Body awareness
  reappraisal?: ReappraisalData;  // Obstacles as opportunities

  // Evening
  review?: ReviewData;  // Did you practice your intention?
  learning?: LearningData;  // Where did you react vs. respond?
  evening_gratitude?: GratitudeData;  // 3 things from today
}

// REMOVED: MBCT-specific data
// ❌ thoughts?: ThoughtData[]  // "automatic thoughts"
// ❌ emotions?: EmotionData[]
// ❌ bodyScan?: BodyAreaData[]
// ❌ rumination?: RuminationData
```

**Philosopher agent validates:** These data models align with Stoic practice architecture.

---

## Conflict Resolution (Updated)

### MBCT Conflicts (Old)

**Clinician vs. UX:**
- Clinician wants clinical accuracy ("decentering")
- UX wants accessibility ("stepping back from thoughts")
- Resolution: Clinician veto but must suggest accessible framing

**Crisis vs. Clinician:**
- Disagreement about PHQ/GAD thresholds
- Resolution: Crisis wins (safety first)

---

### Stoic Conflicts (New)

**Philosopher vs. UX:**
- Philosopher wants accurate Stoic terminology ("dichotomy of control")
- UX wants simplicity ("control what you can")
- Resolution: Philosopher veto but must suggest accessible framing
- Example: Introduce as "what's in your power" but teach proper concept

**Crisis vs. Philosopher:**
- Crisis detection in contemplative app feels inconsistent
- Philosopher says philosophy is about acceptance, not crisis intervention
- Resolution: Crisis wins (safety > philosophy)
- Implementation: Clear messaging that philosophy doesn't replace professional help

**Technical vs. Philosopher:**
- Developer wants to change principle sequence for UX flow
- Philosopher says it breaks framework integrity
- Resolution: Architect mediates, philosopher has domain-veto if breaks coherence

---

## Migration Checklist

**If you decide to proceed with Stoic pivot:**

### 1. Update Agent Configuration

```bash
# Rename the Stoic config to active config
cd /Users/max/Development/active/being/.claude
mv CLAUDE.md CLAUDE-MBCT-backup.md
mv CLAUDE-STOIC.md CLAUDE.md
```

### 2. Update Documentation Structure

**Create new directories:**
```bash
mkdir -p docs/philosophical
```

**Add Stoic guides:**
- `Stoic-Framework-Overview.md`
- `13-Principles-Reference.md`
- `Classical-Sources.md` (citation guide)
- `Virtue-Ethics-Guide.md`
- `Developmental-Stages-Explained.md`

**Archive MBCT guides:**
```bash
mkdir -p docs/archived/mbct
mv docs/clinical/MBCT-*.md docs/archived/mbct/
```

### 3. Update Testing Commands

**Add to package.json:**
```json
{
  "scripts": {
    "validate:philosophy": "node scripts/validate-philosophical-accuracy.js",
    "test:principles": "jest --testPathPattern=principles",
    "test:virtue-tracking": "jest --testPathPattern=virtue"
  }
}
```

### 4. Update CONTRIBUTING.md

**Add philosopher review requirements:**
- All principle content requires philosopher agent review
- Educational modules need classical source citations
- Check-in prompts must align with Stoic practice
- Virtue ethics framework changes need L3-Complex handoff

### 5. Team Communication (if applicable)

**Notify anyone working on Being. about:**
- `clinician` agent removed, use `philosopher` instead
- MBCT → Stoic terminology changes
- New validation requirements for philosophical content
- Updated auto-triggers (philosophical terms)

---

## Side-by-Side Comparison

| Aspect | MBCT (Current) | Stoic (Proposed) |
|--------|---------------|------------------|
| **Primary Domain Agent** | `clinician` | `philosopher` |
| **Domain Expertise** | MBCT protocol, therapeutic content | Classical Stoicism, virtue ethics |
| **Content Validation** | MBCT fidelity, clinical language | Philosophical accuracy, classical sources |
| **Key Concepts** | Decentering, automatic thoughts, rumination | Dichotomy of control, virtue, prohairesis |
| **Educational Sources** | Segal/Williams/Teasdale 2013 | Marcus Aurelius, Epictetus, Seneca |
| **Practice Framework** | 8-week MBCT protocol | 13 principles + developmental stages |
| **Measurement** | PHQ/GAD clinical tracking | PHQ/GAD wellness tracking |
| **Auto-Triggers** | MBCT-exercises, therapeutic-language | Stoic-principles, virtue-ethics |
| **Safety Agents** | crisis + compliance (unchanged) | crisis + compliance (unchanged) |

---

## Recommendation

**If you pivot to Stoic:**

1. ✅ **Activate CLAUDE-STOIC.md** (rename to CLAUDE.md)
2. ✅ **Use `philosopher` agent** for all Stoic content work
3. ✅ **Keep crisis + compliance** agents active (safety/privacy unchanged)
4. ✅ **Archive clinician** agent configuration (keep for reference if you pivot back)

**If you stay with MBCT:**

1. ✅ **Keep current CLAUDE.md** (clinician + crisis + compliance)
2. ✅ **Delete CLAUDE-STOIC.md** (not needed)
3. ✅ **No agent changes required**

**If you want to test hybrid:**

1. ✅ **Add `philosopher` agent** (keep clinician too)
2. ✅ **Use both** for content that blends MBCT + Stoic
3. ✅ **Conflict resolution:** clinician > philosopher for clinical, philosopher > clinician for wisdom content

---

**Document Status:** Ready for implementation
**Next Action:** Decide Stoic pivot → activate CLAUDE-STOIC.md
**Files Changed:** 1 file to rename if pivot proceeds
**Complexity:** Low (agent config is just documentation for Claude Code)

---

*Agent suite updates are configuration-only. No code changes needed. Just tells Claude Code which domain expert to invoke for content validation.*
