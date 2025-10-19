# FEAT-45 Design Sprint Plan: Week 1-2
*Stoic Mindfulness Data Model & Architecture Design*

## Overview

**Duration**: 2 weeks (10 working days)
**Goal**: Lock complete architecture before refactoring begins
**Blocker**: Cannot start Phase 2 refactoring without this
**Deliverable**: Architecture document answering "How does Stoic Mindfulness actually work in the app?"

---

## Why This Sprint is BLOCKING

From architect findings:
> "86 files need refactoring - you need to know what you're refactoring TO. Skip this = redo work multiple times = 12 weeks becomes 20+ weeks."

**Without design sprint:**
- Start refactoring `MorningFlowData` interface
- Halfway through, realize Stoic philosophy needs different data structure
- Redo 20+ files
- Repeat 2-3 times
- Timeline explodes to 16-20 weeks

**With design sprint:**
- Design complete Stoic data model upfront (Week 1-2)
- Refactor with confidence (Weeks 3-7)
- Content creation knows exact structure (Weeks 8-11)
- 12-14 week timeline maintained

---

## Week 1: Data Model Design

### Day 1-2: Stoic Practice Data Model

**Goal**: Design `StoicPracticeStore` - the core state for Stoic philosophy tracking

**Questions to Answer**:
1. What data do we capture for Stoic practice progression?
2. How do we track virtue development (wisdom, courage, justice, temperance)?
3. How do we measure developmental stages (fragmented → effortful → fluid → integrated)?
4. What fields are needed for principle progress tracking?

**Deliverables**:

#### 1. StoicPracticeStore Interface

```typescript
interface StoicPracticeStore {
  // Developmental progression
  developmental_stage: 'fragmented' | 'effortful' | 'fluid' | 'integrated';

  // Principle engagement
  principles_completed: string[];  // IDs of 13 principles
  current_principle: string | null;
  principle_progress: Record<string, PrincipleProgress>;

  // Virtue tracking
  virtue_tracking: {
    wisdom: VirtueInstance[];
    courage: VirtueInstance[];
    justice: VirtueInstance[];
    temperance: VirtueInstance[];
  };

  // Domain applications
  domain_applications: {
    work: DomainProgress;
    relationships: DomainProgress;
    adversity: DomainProgress;
  };

  // Daily practice
  daily_streak: number;
  practice_consistency: number; // 0-1 scale
  last_practice_date: Date | null;
}
```

**Key Design Decisions**:
- [ ] What constitutes "principle completion"? (Read educational module? Practice for N days?)
- [ ] How do we measure developmental stage transitions? (Automated vs. self-assessed?)
- [ ] What data structure for virtue instances? (Timestamp + context + domain?)
- [ ] How do domain applications relate to principles? (1:1 or M:N mapping?)

#### 2. Supporting Data Types

```typescript
interface PrincipleProgress {
  principle_id: string;
  started_at: Date;
  completed_at: Date | null;
  practice_days: number;
  comprehension_score: number; // 0-1 scale
  application_instances: number;
}

interface VirtueInstance {
  virtue: 'wisdom' | 'courage' | 'justice' | 'temperance';
  context: string;  // "Remained calm during difficult meeting"
  domain: 'work' | 'relationships' | 'adversity';
  principle_applied: string | null;  // Which principle guided this?
  timestamp: Date;
}

interface DomainProgress {
  domain: 'work' | 'relationships' | 'adversity';
  practice_instances: number;
  principles_applied: string[];
  effectiveness_rating: number; // 0-1 scale
}
```

**Philosopher Review Gate**: Do these data structures align with authentic Stoic practice progression?

---

### Day 3-4: Check-in Response Structures

**Goal**: Define what data we collect in Morning/Midday/Evening check-ins

**Current MBCT Structure** (from analysis):
- Morning: bodyScan, emotions, thoughts, physicalMetrics, values, dream
- Midday: awareness, gathering, expanding (3-Minute Breathing Space)
- Evening: dayReview, pleasantUnpleasant, thoughtPatterns, tomorrowPrep

**New Stoic Structure to Design**:

#### Morning Check-in (Stoic Preparation)
```typescript
interface StoicMorningFlowData {
  // Core Stoic practices
  intention?: IntentionData;           // What virtue will you practice today?
  gratitude?: GratitudeData;           // 3 specific things (Stoic gratitude)
  preparation?: PreparationData;       // Premeditatio malorum (obstacles)

  // Retained from MBCT
  physicalMetrics?: PhysicalMetricsData;  // Energy, sleep, comfort (keep this)

  // Optional Stoic additions
  principle_focus?: PrincipleFocusData;   // Which principle for today?
  dichotomy_reflection?: DichotomyData;   // What's in/out of control today?
}
```

**Design Questions**:
- [ ] How does `intention` differ from MBCT `values`? (Virtue-specific vs. general values?)
- [ ] What makes gratitude "Stoic" vs. general positive psychology?
- [ ] How do we structure `preparation` (premeditatio malorum)?
- [ ] Do we keep body scan? (Stoics valued physical awareness - Marcus Aurelius)
- [ ] How does `principle_focus` integrate with practice progression?

#### Midday Check-in (Stoic Pause)
```typescript
interface StoicMiddayFlowData {
  // Stoic control check
  control_check?: ControlCheckData;    // Dichotomy of control application

  // Embodiment (retain breathing practice)
  embodiment?: EmbodimentData;         // Body awareness (keep 60fps breathing)

  // Stoic reappraisal
  reappraisal?: ReappraisalData;       // Obstacles as opportunities (virtue)

  // Progress check
  intention_progress?: IntentionProgressData;  // How's your morning intention going?
}
```

**Design Questions**:
- [ ] Keep 60-second auto-advance? (Or allow user-paced for Stoic reflection?)
- [ ] How does `control_check` work? (In/out of control binary? Or spectrum?)
- [ ] What's the relationship between `reappraisal` and virtue practice?
- [ ] Does `intention_progress` affect virtue tracking or just self-awareness?

**Performance Constraint**: Breathing circle must remain 60fps, but content can change

#### Evening Check-in (Stoic Review)
```typescript
interface StoicEveningFlowData {
  // Stoic daily examination (prosoche)
  review?: ReviewData;                 // Did you practice your intention?
  learning?: LearningData;             // Where did you react vs. respond?
  gratitude?: GratitudeData;           // 3 things from today

  // Virtue tracking
  virtue_instances?: VirtueInstance[]; // Where did you practice virtue?

  // Preparation for tomorrow
  tomorrow_intention?: IntentionData;  // What will you practice tomorrow?

  // Optional: Stoic meditation
  meditation?: MeditationData;         // Evening Stoic reflection (Marcus Aurelius style)
}
```

**Design Questions**:
- [ ] How does evening `review` differ from MBCT `dayReview`? (Virtue-focused?)
- [ ] Should `virtue_instances` be captured here or auto-detected from other data?
- [ ] Do we keep `pleasantUnpleasant` MBCT pattern? (Maps to preferred/dispreferred indifferents?)
- [ ] How does `learning` capture react/respond distinction (Stoic prohairesis)?

---

### Day 5: Migration Strategy

**Goal**: Document how existing MBCT data (if any users exist) migrates to Stoic structure

**Scenarios**:
1. **No existing users** (pre-launch pivot)
   - Clean slate, no migration needed
   - Just deploy new data models

2. **Beta users exist** (unlikely but possible)
   - Map MBCT fields → Stoic fields where overlap exists
   - Preserve historical data but mark as "MBCT era"
   - New check-ins use Stoic structure

**Field Mapping**:

| MBCT Field | Stoic Equivalent | Migration Strategy |
|------------|------------------|-------------------|
| `values` | `intention` (virtue-based) | Map to closest virtue |
| `thoughts` | `learning` (react vs. respond) | Categorize by helpfulness |
| `emotions` | `embodiment` | Keep intensity scales |
| `bodyScan` | `embodiment` | Direct transfer |
| `physicalMetrics` | `physicalMetrics` | Direct transfer (unchanged) |
| `dayReview` | `review` | Adapt to virtue framing |
| `pleasantUnpleasant` | `preferred/dispreferred` | Conceptual mapping |

**Deliverable**: Migration script pseudocode

---

## Week 2: Flow Architecture & Integration

### Day 6-7: Navigation & Sequence Design

**Goal**: Map user journey through Stoic Mindfulness app

**Questions to Answer**:
1. How do users progress through 13 principles?
2. When do educational modules appear?
3. How do daily check-ins integrate with principle learning?
4. What's the onboarding sequence for new users?

**Deliverables**:

#### 1. Principle Integration Flow

```
Day 1-7: Principle 1 (Present Perception - Foundation)
  ↓
Morning: Introduction to principle → Set intention → Gratitude
Midday: Practice awareness → Apply principle
Evening: Review principle application → Learn from day
  ↓
Educational module unlocks after 3 days of practice
  ↓
Day 8-14: Principle 2 (Dichotomy of Control - Discernment)
  ...
```

**Design Decisions**:
- [ ] Linear progression (Principle 1 → 2 → 3) or user choice?
- [ ] What triggers principle completion? (Time-based? Practice-based?)
- [ ] How do we balance education vs. practice?
- [ ] When do we introduce virtue tracking explicitly?

#### 2. Daily Check-in Navigation

```
CleanHomeScreen
  ↓ (detects time of day)
  ├─ Morning Flow (6 AM - 12 PM)
  │   → Intention → Gratitude → Preparation → Physical Metrics → Principle Focus → Summary
  │
  ├─ Midday Flow (12 PM - 6 PM)
  │   → Control Check → Embodiment (60s breathing) → Reappraisal → Intention Progress
  │
  └─ Evening Flow (6 PM - 12 AM)
      → Review → Virtue Instances → Learning → Gratitude → Tomorrow Preparation
```

**Design Decisions**:
- [ ] Linear screen progression or flexible navigation?
- [ ] Can users skip screens? (MBCT allows, Stoic should too)
- [ ] How do we track partial completions?
- [ ] What's the minimum viable check-in? (Time-constrained users)

#### 3. Onboarding Sequence

```
Welcome → Philosophy Introduction → PHQ-9/GAD-7 Assessment →
Values Selection (4 virtues) → Principle 1 Introduction →
First Morning Flow (guided)
```

**Design Decisions**:
- [ ] How much philosophy upfront? (Risk: too academic, users drop off)
- [ ] Do we keep PHQ-9/GAD-7 in onboarding? (Yes - baseline wellness data)
- [ ] How do we explain "Stoic Mindfulness" positioning?
- [ ] What's the value prop for daily practice?

---

### Day 8: Integration Points Documentation

**Goal**: Map how Stoic flows integrate with existing systems

**Deliverables**:

#### 1. Crisis Detection Integration

**Current**: PHQ-9/GAD-7 assessments trigger crisis detection
**Stoic Version**: Same thresholds, different messaging

**Changes Needed**:
- Update crisis messaging: "Philosophy supports wellness, but professional help needed for crisis"
- Assessment remains unchanged (PHQ-9/GAD-7 exact questions)
- Thresholds unchanged (PHQ≥15, PHQ≥20, GAD≥15)

**Design Decision**:
- [ ] How do we position crisis detection in a "wellness" (not clinical) app?
- [ ] Do we deemphasize PHQ/GAD but still track? (Yes - wellness metrics)

#### 2. Analytics Integration

**New Stoic Metrics**:
- Principle engagement rates
- Virtue practice instances per week
- Developmental stage progression
- Domain application patterns
- Daily check-in consistency

**Design Decision**:
- [ ] What metrics matter for Stoic practice validation?
- [ ] How do we measure "effectiveness" of Stoic Mindfulness?

#### 3. Performance Requirements

**Unchanged**:
- 60fps breathing circle (midday flow)
- <200ms crisis detection
- <500ms check-in screen transitions
- <2s app launch time

**New Considerations**:
- Educational module content loading
- Principle progress calculation performance

---

### Day 9: Architecture Document Drafting

**Goal**: Consolidate all design decisions into comprehensive architecture doc

**Document Structure**:

```markdown
# Stoic Mindfulness Architecture Specification

## 1. Data Models
- StoicPracticeStore complete interface
- Check-in data structures (Morning/Midday/Evening)
- Supporting types (VirtueInstance, PrincipleProgress, etc.)

## 2. User Flows
- Onboarding sequence
- Daily check-in flows
- Principle progression
- Educational module integration

## 3. Integration Points
- Crisis detection (unchanged)
- Assessment system (reframed as wellness)
- Analytics (new Stoic metrics)
- Performance (60fps, <200ms maintained)

## 4. Migration Strategy
- MBCT → Stoic data mapping
- User data preservation
- Fallback for edge cases

## 5. Implementation Sequence
- Week 3-4: Morning flow refactoring
- Week 5-6: Midday + Evening flows
- Week 7: Integration testing
- Week 8-11: Content creation

## 6. Non-Negotiables
- Crisis detection unchanged
- 60fps breathing circle
- Encryption maintained
- PHQ-9/GAD-7 100% accuracy

## 7. Philosopher Review Checklist
- [ ] Stoic principles accurate
- [ ] Virtue ethics properly represented
- [ ] Dichotomy of control not oversimplified
- [ ] Classical source citations correct
```

---

### Day 10: Lock Architecture & Get Approval

**Goal**: Review architecture document, get sign-off, lock for Phase 2

**Tasks**:
1. **Self-review**: Does this answer "How does Stoic Mindfulness work in the app?"
2. **Philosopher agent review**: Stoic accuracy validation
3. **Crisis agent review**: Safety systems preserved
4. **Compliance agent review**: Privacy/encryption unchanged
5. **Performance agent review**: 60fps and <200ms maintained

**Final Deliverable**: `Stoic-Mindfulness-Architecture-v1.0.md` (LOCKED)

**Success Criteria**:
- ✅ All data models defined with field-level detail
- ✅ All integration points documented
- ✅ Migration strategy documented
- ✅ Implementation sequence clear
- ✅ Non-negotiables listed
- ✅ Philosopher review passed
- ✅ Crisis/compliance/performance validation passed

**After Day 10**: Architecture is LOCKED. Phase 2 (refactoring) can begin.

---

## Tools & Resources

### For Design Sprint

**Use Claude Code for**:
- Data model design brainstorming
- TypeScript interface drafting
- Migration script pseudocode
- Architecture document writing
- Edge case identification

**Use Philosopher Agent for**:
- Stoic principle validation
- Virtue ethics accuracy
- Classical source citation checking
- Philosophy vs. pop-psychology boundaries

**Use Architect Agent for**:
- Integration complexity assessment
- Performance impact analysis
- Migration strategy review

### Reference Documents

**Already Created**:
- `MBCT-Architecture-Analysis.md` - Current state documentation
- `Stoic-Mindfulness-Solo-Prototype-Plan.md` - 12-14 week overview
- `Agent-Suite-Changes-MBCT-to-Stoic.md` - Agent configuration changes

**To Create During Sprint**:
- `Stoic-Data-Models.md` - Complete TypeScript interfaces
- `Stoic-User-Flows.md` - Navigation and sequence diagrams
- `Stoic-Mindfulness-Architecture-v1.0.md` - Final locked architecture

---

## Success Metrics for This Sprint

**Week 1 Success**:
- ✅ StoicPracticeStore interface complete
- ✅ Morning/Midday/Evening check-in structures designed
- ✅ Migration strategy documented
- ✅ Philosopher validation on data models

**Week 2 Success**:
- ✅ Navigation flows mapped
- ✅ Integration points documented
- ✅ Architecture document complete
- ✅ All domain agents approved
- ✅ Implementation sequence defined

**Sprint Complete**:
- ✅ Architecture locked
- ✅ Ready to start Phase 2 (refactoring) Week 3
- ✅ No major unknowns remaining
- ✅ Confidence: "We know exactly what we're building"

---

## Risk Mitigation

### Risk 1: Over-design (Spend 3 weeks on design, not 2)
**Mitigation**: Time-box each section. If stuck, note decision as "TBD - will clarify during implementation."

### Risk 2: Under-design (Missing critical details)
**Mitigation**: Use checklist: "Can I refactor `MorningFlowData` interface with this spec?" If no, keep designing.

### Risk 3: Philosopher rejection (Stoic accuracy issues)
**Mitigation**: Involve philosopher agent early (Day 2-3), not at end of Week 2.

### Risk 4: Scope creep (Try to design all 13 principles)
**Mitigation**: MVP scope = 3 principles. Design architecture for 13, but only detail 3 for beta.

---

## Next Steps After This Sprint

**Week 3 Begins**:
1. Architect locked document
2. Start refactoring `/src/types/flows.ts`
3. Update first flow screen (Evening DayReviewScreen - simplest)
4. Systematic progression through 86 files
5. Philosopher review at each milestone

**Design Sprint Output Feeds**:
- Phase 2: Refactoring (Weeks 3-7)
- Phase 3: Content creation (Weeks 8-11)
- Phase 4: Integration testing (Week 12)
- Phase 5: Beta testing (Weeks 13-14)

---

## Appendix: Key Design Questions to Answer

### Data Model Questions
- [ ] What constitutes a "virtue instance" worth tracking?
- [ ] How do we measure developmental stage (self-assessed vs. algorithmic)?
- [ ] What's the minimum data for a valid check-in?
- [ ] How do principles relate to virtues? (1:1 or M:N?)

### User Experience Questions
- [ ] How much philosophy education upfront vs. gradual?
- [ ] Linear principle progression or user choice?
- [ ] What's the time commitment per check-in? (MBCT: 30min morning, 3min midday, 20min evening)
- [ ] How do we balance depth (philosophy) vs. accessibility (busy users)?

### Integration Questions
- [ ] How does crisis detection messaging change for "wellness" positioning?
- [ ] Do we keep PHQ-9/GAD-7 visible or background-only?
- [ ] How do we track "Stoic practice effectiveness"? (What's the equivalent of PHQ/GAD score reduction?)
- [ ] What analytics matter for product-market fit validation?

### Content Questions
- [ ] What's the reading level for educational modules? (8th grade? College?)
- [ ] How much neuroscience integration? (MBCT had research citations)
- [ ] Are check-in prompts open-ended or structured? (Both? Context-dependent?)
- [ ] How do we cite Marcus Aurelius / Epictetus? (Direct quotes? Paraphrases?)

---

**Document Status**: Ready to Execute
**Owner**: You + Claude Code + Philosopher Agent
**Timeline**: 10 working days (2 weeks)
**Blocking**: Yes - Phase 2 cannot start without this
**Output**: Locked architecture document (v1.0)

---

*Next: Execute Week 1 Day 1-2 (StoicPracticeStore design)*
