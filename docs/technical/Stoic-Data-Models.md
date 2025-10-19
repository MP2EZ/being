# Stoic Mindfulness Data Models
*Design Sprint Week 1, Day 1-2 Deliverable*

**Status**: Philosopher-Validated (Refinements Incorporated)
**Created**: 2025-10-19
**Reviewed**: 2025-10-19 (Philosopher Agent)
**Purpose**: Define complete TypeScript interfaces for Stoic Mindfulness practice tracking

---

## Overview

This document defines the data models needed to track Stoic Mindfulness practice in the Being. app. These models replace the MBCT-focused data structures and enable tracking of:

1. **Developmental progression** (fragmented → effortful → fluid → integrated)
2. **Principle engagement** (12 principles with practice tracking)
3. **Virtue development** (wisdom, courage, justice, temperance)
4. **Domain applications** (work, relationships, adversity)
5. **Daily practice** (check-ins, consistency, streaks)

---

## 1. Core Practice Store

### StoicPracticeStore

The central state management interface for Stoic practice data.

```typescript
interface StoicPracticeStore {
  // ──────────────────────────────────────────────────────────
  // Developmental Progression
  // ──────────────────────────────────────────────────────────
  developmental_stage: DevelopmentalStage;
  stage_started_at: Date;
  stage_assessment_history: StageAssessment[];

  // ──────────────────────────────────────────────────────────
  // Principle Engagement (12 Principles)
  // ──────────────────────────────────────────────────────────
  principles_completed: string[];        // IDs of completed principles (1-12)
  current_principle: string | null;      // Active principle ID
  principle_progress: Record<string, PrincipleProgress>;

  // ──────────────────────────────────────────────────────────
  // Virtue Tracking (Four Cardinal Virtues)
  // ──────────────────────────────────────────────────────────
  virtue_tracking: {
    wisdom: VirtueInstance[];
    courage: VirtueInstance[];
    justice: VirtueInstance[];
    temperance: VirtueInstance[];
  };
  virtue_summary: VirtueSummary;  // Aggregated stats

  // ──────────────────────────────────────────────────────────
  // Domain Applications (Three Life Domains)
  // ──────────────────────────────────────────────────────────
  domain_applications: {
    work: DomainProgress;
    relationships: DomainProgress;
    adversity: DomainProgress;
  };

  // ──────────────────────────────────────────────────────────
  // Daily Practice
  // ──────────────────────────────────────────────────────────
  daily_streak: number;
  longest_streak: number;
  practice_consistency: number;         // 0-1 scale (7-day rolling avg)
  last_practice_date: Date | null;
  total_practice_days: number;

  // ──────────────────────────────────────────────────────────
  // Principle 8: Negative Visualization (Premeditatio Malorum)
  // ──────────────────────────────────────────────────────────
  negative_visualization_practice: {
    last_practiced: Date | null;
    frequency_per_week: number;
    contemplations: NegativeVisualization[];
  };

  // ──────────────────────────────────────────────────────────
  // Metadata
  // ──────────────────────────────────────────────────────────
  started_at: Date;
  last_updated: Date;
  version: string;                      // Data model version
}
```

---

## 2. Supporting Types

### Developmental Stages

Based on Stoic Mindfulness Framework - 4 stages of practice mastery.

```typescript
type DevelopmentalStage =
  | 'fragmented'   // 1-6 months: Inconsistent, effortful, often reactive
  | 'effortful'    // 6-18 months: Regular practice, still requires conscious effort
  | 'fluid'        // 2-5 years: Spontaneous application, occasional lapses under stress
  | 'integrated';  // 5+ years: Seamless embodiment, wisdom accessible under pressure

interface StageAssessment {
  stage: DevelopmentalStage;
  assessed_at: Date;
  assessment_method: 'self' | 'algorithmic' | 'milestone';

  // Quantitative metrics (inform, don't decide)
  criteria_met: string[];  // Which criteria triggered stage suggestion

  // Qualitative indicators (Philosopher refinement)
  qualitative_indicators: {
    spontaneity: number;           // 0-1: Principles arise without effort?
    consistency: number;            // 0-1: Stable under pressure?
    embodiment: number;             // 0-1: Lived vs intellectual?
    integration: number;            // 0-1: Principles work together?
  };

  // User reflection (Stoic self-examination)
  self_reflection: string | null;  // User's own stage assessment
  notes?: string;
}
```

**Design Decision - Developmental Stage Transitions (Philosopher-Refined):**
- **Primary method**: Algorithmic **suggestions**, not deterministic gates (user exercises prohairesis)
- **Self-assessment**: Monthly check-in allows user to reflect on stage (Stoic self-examination)
- **Qualitative indicators**: Spontaneity, consistency, embodiment, integration (depth > metrics)
- **User agency**: System provides data and suggestions; user decides advancement
- **No regression**: Stages don't go backwards (consistent with framework - skills persist even if practice lapses)
- **Rationale**: Epictetus teaches self-knowledge (γνῶθι σεαυτόν) - user judges own development

---

### Principle Progress

Tracks engagement with each of the **12 Stoic Mindfulness principles**.

```typescript
interface PrincipleProgress {
  principle_id: string;                  // '01-present-perception', '02-metacognitive-space', etc.
  principle_name: string;                // 'Present Perception', 'Metacognitive Space'
  category: PrincipleCategory;

  // Progression tracking
  started_at: Date;
  completed_at: Date | null;
  is_active: boolean;                    // Currently practicing this principle

  // Practice metrics (signals, not gates)
  practice_days: number;                 // Days actively practiced
  application_instances: number;         // Times explicitly applied (from check-ins)
  comprehension_score: number;           // 0-1 scale (from module quiz/reflection)

  // Qualitative depth (Philosopher refinement)
  comprehension_depth: 'intellectual' | 'experiential' | 'embodied';
  integration_stage: 'learning' | 'conscious_application' | 'effortful_spontaneity' | 'fluid_embodiment';
  integration_progress: number;          // 0-1 scale (gradual, not boolean)

  // Self-assessment (user judges readiness)
  self_assessed_mastery: number;         // 0-1 scale from monthly reflection

  // Educational module
  module_started: boolean;
  module_completed: boolean;
  module_completion_date: Date | null;
}

type PrincipleCategory =
  | 'foundation'    // Principles 1-3: Present Perception, Metacognitive Space, Radical Acceptance
  | 'discernment'   // Principles 4-5: Sphere Sovereignty, Intention Over Outcome
  | 'regulation'    // Principles 6-7: Virtuous Reappraisal, Embodied Awareness
  | 'practice'      // Principles 8-9: Negative Visualization with Compassion, Contemplative Praxis
  | 'ethics';       // Principles 10-12: Interconnected Action, Character Cultivation, Relational Presence
```

**Design Decision - Principle Completion (Philosopher-Refined):**
- **Multi-dimensional readiness**: Not boolean "complete" - tracks depth (intellectual → experiential → embodied)
- **Integration stages**: Learning → Conscious Application → Effortful Spontaneity → Fluid Embodiment
- **User agency**: System suggests readiness; user decides when to advance (Stoic prohairesis)
- **Metrics inform**: practice_days, application_instances provide data, not deterministic gates
- **Self-assessment primary**: User judges own mastery (Epictetus: "examine yourself")
- **Rationale**: Stoic principle internalization is qualitative, not quantitative checkbox

---

### Virtue Instances

Tracks specific moments where user practiced one of the four cardinal virtues.

```typescript
interface VirtueInstance {
  id: string;
  virtue: CardinalVirtue;

  // Context
  context: string;                       // User's description: "Remained calm during difficult meeting"
  domain: PracticeDomain;
  situation_type: SituationType;

  // Stoic dichotomy of control (Philosopher refinement)
  focused_on: 'internal' | 'external' | 'both';
  stoic_reflection: {
    what_was_in_my_control: string;
    what_was_outside_my_control: string;
    did_i_confuse_the_two: boolean;
  } | null;

  // Practice linkage
  principle_applied: string | null;      // Which principle guided this? (e.g., 'sphere-sovereignty')
  was_planned: boolean;                  // Morning intention vs. spontaneous response

  // Reflection
  effectiveness_rating: number;          // 1-5: How well did virtue serve you?
  learning: string | null;               // What did you learn from this?

  // Metadata
  timestamp: Date;
  check_in_type: 'morning' | 'midday' | 'evening';
}

type CardinalVirtue = 'wisdom' | 'courage' | 'justice' | 'temperance';

type PracticeDomain = 'work' | 'relationships' | 'adversity';

type SituationType =
  | 'challenge'       // Obstacle or difficulty
  | 'opportunity'     // Chance to practice virtue
  | 'conflict'        // Interpersonal tension
  | 'uncertainty'     // Unclear or ambiguous situation
  | 'success'         // Positive outcome to respond to skillfully
  | 'failure';        // Setback or disappointment
```

**Design Decision - Virtue Instance Data Structure (Philosopher-Refined):**
- **Rich context**: Not just "practiced courage" - full description + domain + situation type
- **Dichotomy of control embedded**: Surfaces internal/external confusion (Epictetus, Enchiridion 1)
- **Stoic reflection prompts**: "What was in/out of my control? Did I confuse them?"
- **Linkage to principles**: Connects virtue practice to specific Stoic principles (especially Principle 4)
- **Planned vs. spontaneous**: Tracks whether this was morning intention or spontaneous application
- **Learning capture**: Evening reflection captures what was learned
- **Effectiveness rating**: Not all virtue applications go well - track what works
- **Rationale**: Virtue = **how** you relate to indifferents, not **which** indifferents you pursue

---

### Virtue Summary

Aggregated statistics for virtue development (calculated, not stored per instance).

```typescript
interface VirtueSummary {
  // Per-virtue totals
  wisdom_instances: number;
  courage_instances: number;
  justice_instances: number;
  temperance_instances: number;

  // Contextual distribution (Philosopher refinement - not forced balance)
  virtue_distribution: {
    primary_context: PracticeDomain;        // Where user practices most
    domain_virtue_patterns: Record<PracticeDomain, CardinalVirtue[]>; // Which virtues in which domains
  };

  // Effectiveness matters more than frequency
  avg_effectiveness: Record<CardinalVirtue, number>;  // 1-5 average rating per virtue

  // User-identified growth areas (not algorithmic pressure)
  areas_for_development: CardinalVirtue[];  // User chooses, not algorithm

  // Trends
  last_30_days: Record<CardinalVirtue, number>;
  instances_this_week: number;

  // Updated
  calculated_at: Date;
}
```

---

### Domain Progress

Tracks Stoic practice application across three life domains.

```typescript
interface DomainProgress {
  domain: PracticeDomain;

  // Practice volume
  practice_instances: number;            // Total virtue instances in this domain
  last_practice_date: Date | null;

  // Principle application
  principles_applied: string[];          // Which principles used in this domain
  most_applied_principle: string | null;

  // Effectiveness
  effectiveness_rating: number;          // 0-1 average across all instances
  improvement_trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';

  // Specific challenges
  common_situations: string[];           // Most frequent situation types
  areas_for_growth: string[];            // User-identified or algorithm-suggested
}
```

**Design Decision - Domain Applications Relationship:**
- **M:N mapping**: Principles can apply to multiple domains, domains use multiple principles
- **No forced mapping**: User may practice in work 80% of time (that's fine - real life isn't balanced)
- **Trend tracking**: Surface if domain is improving/declining to guide focus
- **Common situations**: Help identify patterns ("you often face uncertainty at work")

---

## 3. Key Design Decisions

### Decision 1: Developmental Stage Measurement

**Question**: How do we measure developmental stage transitions?

**Answer**: Algorithmic with milestone gates

**Implementation**:
```typescript
function assessDevelopmentalStage(store: StoicPracticeStore): DevelopmentalStage {
  const {
    total_practice_days,
    daily_streak,
    longest_streak,
    principles_completed,
    virtue_tracking
  } = store;

  // Count total virtue instances
  const totalVirtueInstances = Object.values(virtue_tracking)
    .flat()
    .length;

  // INTEGRATED (5+ years of sustained practice)
  if (
    total_practice_days >= 1825 &&  // 5 years
    principles_completed.length >= 12 &&  // All 12 principles
    longest_streak >= 180 &&
    totalVirtueInstances >= 1000
  ) {
    return 'integrated';
  }

  // FLUID (2-5 years, spontaneous application)
  if (
    total_practice_days >= 730 &&   // 2 years
    principles_completed.length >= 9 &&   // 9 of 12 principles
    longest_streak >= 90 &&
    totalVirtueInstances >= 300
  ) {
    return 'fluid';
  }

  // EFFORTFUL (6-18 months, regular practice)
  if (
    total_practice_days >= 180 &&   // 6 months
    principles_completed.length >= 5 &&   // 5 of 12 principles
    longest_streak >= 30 &&
    totalVirtueInstances >= 50
  ) {
    return 'effortful';
  }

  // FRAGMENTED (default - 1-6 months)
  return 'fragmented';
}
```

**Rationale**:
- Objective, consistent, no gaming the system
- Self-assessment available but doesn't override algorithm
- Milestone gates ensure genuine practice depth
- Framework's timeframes (1-6mo, 6-18mo, 2-5yr, 5+yr) inform thresholds

---

### Decision 2: Principle Completion Criteria

**Question**: What constitutes "principle completion"?

**Answer**: 7 days practice + module completion + 3 applications

**Criteria**:
```typescript
function isPrincipleComplete(progress: PrincipleProgress): boolean {
  return (
    progress.practice_days >= 7 &&
    progress.module_completed &&
    progress.application_instances >= 3 &&
    progress.comprehension_score >= 0.7  // 70% on module reflection
  );
}
```

**Rationale**:
- **7 days**: Minimum to internalize concept (aligns with onboarding "first week" in framework)
- **Module completion**: Ensures comprehension of principle
- **3 applications**: Requires putting into practice, not just reading
- **70% comprehension**: Validates understanding (not perfectionism)

---

### Decision 3: Virtue Instance Minimum Threshold

**Question**: What constitutes a "virtue instance" worth tracking?

**Answer**: Explicit user entry during check-ins (quality > quantity)

**Criteria**:
- **User-initiated**: Not auto-detected (avoids false positives)
- **Context-rich**: Requires description + domain + situation type
- **Reflection-based**: Captured during evening check-in review
- **Optional effectiveness rating**: Encourages honest assessment

**Anti-patterns to avoid**:
- ❌ Auto-logging ("You completed a check-in = wisdom!")
- ❌ Gamification ("You practiced 10 virtues this week!")
- ❌ Pressure to log ("Enter at least 1 virtue instance per day")

**Why**: Stoic practice is about quality of attention, not quantity of actions. Framework emphasizes genuine transformation over performance.

---

### Decision 4: Data Retention & Privacy

**Question**: How long do we keep virtue instances and principle progress?

**Answer**: Indefinite retention with encryption, user control

**Policy**:
```typescript
interface DataRetentionPolicy {
  virtue_instances: 'indefinite';        // Full history (encrypted)
  principle_progress: 'indefinite';      // All progress retained
  check_in_data: 'indefinite';           // Daily check-ins kept
  calculated_summaries: '90_days';       // Rolling aggregates

  user_control: {
    can_delete_individual_instances: true;
    can_export_all_data: true;
    can_delete_all_data: true;           // Right to be forgotten
  };
}
```

**Rationale**:
- **Long-term practice**: Stoic development is years-long journey (need historical data)
- **Progress visibility**: Users should see growth over time
- **Privacy**: All virtue instances encrypted (contain personal reflections)
- **Compliance**: Export and deletion comply with GDPR/CCPA

---

## 4. Philosopher Review Checklist

**Before finalizing this data model, validate:**

- [ ] **Developmental stages** align with authentic Stoic progression (not artificial gamification)
- [ ] **Four cardinal virtues** only (wisdom, courage, justice, temperance - no modern additions)
- [ ] **Principle categories** match framework structure (foundation → discernment → regulation → practice → ethics)
- [ ] **12 principles** correctly represented (not 13)
- [ ] **Virtue instances** encourage genuine reflection, not performative logging
- [ ] **Domain applications** reflect real Stoic practice (work, relationships, adversity)
- [ ] **Practice metrics** measure depth, not just frequency
- [ ] **No oversimplification** of Stoic concepts (e.g., dichotomy of control properly nuanced as "sphere sovereignty")
- [ ] **Data structure** enables tracking the full Stoic Mindfulness framework (12 principles integrated)

---

## 5. Next Steps

**After Philosopher Review:**

1. **Finalize types** based on feedback
2. **Create TypeScript type definitions** file: `/src/types/stoic.ts`
3. **Design check-in data structures** (Day 3-4): Morning/Midday/Evening
4. **Document migration strategy** (Day 5): MBCT → Stoic data mapping
5. **Lock architecture** (Day 10): Ready for Phase 2 refactoring

---

## Appendix: 12 Principles Structure

For reference - the full principle organization from framework:

**Foundation: Awareness and Acceptance (1-3)**:
1. Present Perception
2. Metacognitive Space
3. Radical Acceptance

**Discernment: The Dichotomy of Control (4-5)**:
4. Sphere Sovereignty
5. Intention Over Outcome

**Regulation: Emotions and Responses (6-7)**:
6. Virtuous Reappraisal
7. Embodied Awareness

**Practice: Daily Implementation (8-9)**:
8. Negative Visualization with Compassion
9. Contemplative Praxis

**Ethics: Living Well (10-12)**:
10. Interconnected Action
11. Character Cultivation
12. Relational Presence

---

**Document Status**: Draft - Awaiting Philosopher Agent Review
**Owner**: Max + Claude Code + Philosopher Agent
**Next**: Day 3-4 Check-in Response Structures
