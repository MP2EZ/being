# Stoic Check-in Response Structures
*Design Sprint Week 1, Day 3-4 | Status: Draft | FEAT-45*

---

## Document Purpose

This document defines the TypeScript data structures for Being's three daily check-in flows after conversion from MBCT to Stoic Mindfulness. These structures replace the existing `MorningFlowData`, `MiddayFlowData`, and `EveningFlowData` interfaces in `/src/types/flows.ts`.

**Design Constraints**:
- Must align with 12 Stoic Mindfulness principles (Foundation 1-3, Discernment 4-5, Regulation 6-7, Practice 8-9, Ethics 10-12)
- Must support 4 Cardinal Virtues tracking (wisdom, courage, justice, temperance)
- Must maintain crisis detection capabilities (retained from MBCT)
- Must preserve 60fps breathing circle performance (midday flow)
- Must enable developmental stage progression (fragmented → effortful → fluid → integrated)
- Must be philosophically accurate to classical Stoicism while integrating mindfulness

**Related Documents**:
- `Stoic-Data-Models.md` - StoicPracticeStore interface (Day 1-2 deliverable)
- `Stoic Mindfullness Framework.md` - Philosophical framework
- `MBCT-Architecture-Analysis.md` - Current MBCT structure being replaced

---

## 1. Morning Flow: Stoic Preparation (Premeditatio)

### Philosophical Basis

The Stoic morning practice (documented in Epictetus *Enchiridion* and Marcus Aurelius *Meditations* Book 5) emphasizes **preparation** for the day ahead. The practitioner sets a virtue-based intention, contemplates potential obstacles with calm acceptance (premeditatio malorum), and cultivates gratitude for what they have while acknowledging its impermanence.

**Key Principles Integrated**:
- **Principle 1 (Present Perception)**: Morning gratitude anchors awareness in present reality
- **Principle 4 (Sphere Sovereignty)**: Preparation identifies what's in/out of control today
- **Principle 8 (Negative Visualization with Compassion)**: Premeditatio malorum with self-compassion
- **Principle 11 (Character Cultivation)**: Virtue-based intention setting

### TypeScript Interface

```typescript
interface StoicMorningFlowData {
  // Core Stoic Preparation
  intention?: IntentionData;           // Which virtue will I practice today?
  gratitude?: GratitudeData;           // 3 specific things (with impermanence awareness)
  preparation?: PreparationData;       // Premeditatio malorum (obstacles + response plan)

  // Physical Awareness (retained from MBCT, aligned with Principle 7)
  physicalMetrics?: PhysicalMetricsData;  // Energy, sleep, comfort (1-10 scales)

  // Principle Integration
  principle_focus?: PrincipleFocusData;   // Which principle am I practicing today?

  // Metadata
  completed_at: Date;
  time_spent_seconds: number;
  flow_version: string;  // For future migration tracking
}
```

### Supporting Data Types

```typescript
// Virtue-based intention (not vague "values")
interface IntentionData {
  virtue: CardinalVirtue;  // 'wisdom' | 'courage' | 'justice' | 'temperance'
  context: PracticeDomain;  // 'work' | 'relationships' | 'adversity'

  // Specific, actionable intention
  intention_statement: string;  // "I will practice patience during the team meeting"

  // Dichotomy of control framing
  what_i_control: string;        // "My tone, my listening, my responses"
  what_i_dont_control: string;   // "Others' reactions, meeting outcomes"

  // Stoic reserve clause (Epictetus: "I will do X, unless something prevents me")
  reserve_clause?: string;  // "...if circumstances allow" | "...fate permitting"

  // Optional: Link to current principle
  principle_applied?: string;    // e.g., "Sphere Sovereignty"

  timestamp: Date;
}

// Stoic gratitude: Acknowledging impermanence generates appreciation
interface GratitudeData {
  gratitude_items: GratitudeItem[];  // Exactly 3 items

  // User reflection (optional)
  reflection?: string;  // "How does impermanence awareness affect my appreciation?"

  timestamp: Date;
}

interface GratitudeItem {
  what: string;  // "My daughter's health"

  // Stoic impermanence pathway (awareness → appreciation → engagement)
  impermanence_reflection?: {
    acknowledged: boolean;  // Did I engage with impermanence?

    // The three-step pathway (optional but philosophically richer)
    awareness?: string;  // "My daughter will grow up and not need me someday"
    appreciation_shift?: string;  // "This makes me treasure reading together now"
    present_action?: string;  // "Tonight I'll fully focus on our storytime"
  };

  // Present-moment awareness
  how_it_manifests_today?: string;  // "She laughed during breakfast"
}

// Premeditatio malorum: Contemplating obstacles with compassion
interface PreparationData {
  // Today's anticipated obstacles (MAX 2 - prevents rumination)
  obstacles: ObstacleContemplation[];  // UI enforces max 2 items

  // Overall readiness (self-assessment)
  readiness_rating: number;  // 1-10: How prepared do I feel?

  // Compassionate framing (REQUIRED if obstacles.length > 0)
  self_compassion_note: string;  // "If I struggle today, that's human and okay"

  // CRITICAL: Safety safeguards for users with anxiety (GAD ≥15)
  time_spent_seconds: number;  // Clinical flag if >120s (rumination indicator)
  opted_out: boolean;  // User chose to skip obstacle contemplation
  opt_out_reason?: 'anxiety' | 'not_needed_today' | 'prefer_gratitude';

  // Clinical integration
  anxiety_detected?: boolean;  // If linguistic markers suggest catastrophizing

  timestamp: Date;
}

interface ObstacleContemplation {
  obstacle: string;  // "Difficult conversation with my manager"
  likelihood: 'likely' | 'possible' | 'unlikely';

  // Stoic response planning
  virtue_to_practice: CardinalVirtue;  // e.g., 'courage'
  response_plan: string;  // "Listen fully, speak honestly, stay calm"

  // Dichotomy of control
  what_i_control: string;     // "My preparation, my tone, my effort"
  what_i_dont_control: string;  // "Their reaction, the outcome, their mood"

  // Compassionate reframe (not catastrophizing)
  compassionate_view?: string;  // "Even if this goes badly, I'll cope and learn"
}

// Principle focus for the day
interface PrincipleFocusData {
  principle_id: string;  // One of 12 principles
  principle_name: string;

  // Why this principle today?
  reason_for_focus: string;  // "I have a challenging day ahead where I need Sphere Sovereignty"

  // Practice commitment
  how_i_will_practice: string;  // "Before reacting to setbacks, I'll pause and ask: is this in my control?"

  timestamp: Date;
}

// Retained from MBCT (maps to Principle 7: Embodied Awareness)
interface PhysicalMetricsData {
  energy_level: number;      // 1-10
  sleep_quality: number;     // 1-10
  physical_comfort: number;  // 1-10

  // Optional notes
  notes?: string;

  timestamp: Date;
}
```

### Design Decisions

**Q: How does `intention` differ from MBCT `values`?**
- **MBCT values**: General life values (family, health, creativity) with vague intentions
- **Stoic intention**: Specific virtue + specific context + specific action + dichotomy of control framing
- **Example**: MBCT might be "I value connection." Stoic is "I will practice justice (virtue) in relationships (domain) by listening fully to my partner without defensive reactions (action), controlling my attention and responses (in control), not controlling their receptiveness (out of control)."

**Q: What makes gratitude "Stoic" vs. general positive psychology?**
- **Stoic gratitude**: Three-step pathway (not just positive thinking)
  1. **Awareness**: "This thing I value is impermanent" (memento mori)
  2. **Appreciation shift**: "Impermanence makes it precious now" (intensified gratitude)
  3. **Present action**: "I'll fully engage today" (behavioral commitment)
- **Not**: Forced positivity or "everything happens for a reason"
- **Philosophical basis**: Seneca *Letters* 107 - negative visualization generates gratitude and present action
- **Clinical safety**: Impermanence reflection is **optional** - some users (especially with anxiety) may skip to gratitude directly
- **Classical source**: Marcus Aurelius *Meditations* 2.11: "You could leave life right now. Let that determine what you do and say and think."
- **Neurological**: Gratitude + impermanence awareness → enhanced savoring → increased present-moment engagement (Fredrickson's broaden-and-build theory)

**Q: How is `preparation` structured (premeditatio malorum)?**
- **NOT catastrophizing**: "Everything will go wrong and I'll be devastated"
- **IS rational contemplation**: "This obstacle might happen. If it does, I'll respond with virtue X. I can't control outcome, only my response."
- **Compassion integration**: "If I struggle, that's human. I'll treat myself kindly."
- **Clinical safety** (CRITICAL safeguards):
  - **Max 2 obstacles**: UI enforces maximum to prevent rumination spiral
  - **Time-boxing**: Flag if user spends >120 seconds (clinical rumination indicator)
  - **Opt-out pathway**: Users with GAD ≥15 can skip entirely without guilt
  - **Compassion-first**: `self_compassion_note` REQUIRED if obstacles present
  - **Anxiety detection**: Linguistic markers trigger gentler framing
  - **Flow ordering**: Self-compassion → obstacles (optional) → readiness (UX implementation)

**Q: Do we keep body scan?**
- **Decision**: Keep as `physicalMetrics` (simplified version, not full body scan)
- **Rationale**: Marcus Aurelius frequently referenced physical awareness. Principle 7 (Embodied Awareness) requires somatic tracking.
- **Change from MBCT**: MBCT has detailed 10-area body scan. Stoic version uses simple 1-10 scales (faster, less clinical).

**Q: How does `principle_focus` integrate with practice progression?**
- Ties to `current_principle` in StoicPracticeStore
- User chooses which principle to emphasize today (supports prohairesis - moral agency)
- Algorithm may suggest based on developmental stage, but user decides
- This data feeds into `principle_progress.application_instances`

---

## 2. Midday Flow: Stoic Pause (Prosoche in Action)

### Philosophical Basis

The midday check-in is a **pause for awareness and reorientation**. In Stoic terms, this is *prosoche* (attention, vigilance) - the practice of catching yourself in reactive patterns and choosing a more virtuous response. The 3-Minute Breathing Space from MBCT maps well to Stoic mindful pause, but content shifts from emotional regulation alone to virtue-guided reappraisal.

**Key Principles Integrated**:
- **Principle 2 (Metacognitive Space)**: Stepping back from automatic reactions
- **Principle 4 (Sphere Sovereignty)**: Control check - am I confusing internal/external control?
- **Principle 6 (Virtuous Reappraisal)**: Reframing obstacles as opportunities for virtue
- **Principle 7 (Embodied Awareness)**: 60-second breathing practice

### TypeScript Interface

```typescript
interface StoicMiddayFlowData {
  // Dichotomy of Control Check
  control_check?: ControlCheckData;  // Am I focused on what's in my control?

  // Embodied Awareness (retained breathing practice)
  embodiment?: EmbodimentData;  // 60s breathing circle (60fps requirement maintained)

  // Stoic Reappraisal
  reappraisal?: ReappraisalData;  // Obstacles as opportunities for virtue

  // Morning Intention Progress
  intention_progress?: IntentionProgressData;  // How's my morning intention going?

  // Metadata
  completed_at: Date;
  time_spent_seconds: number;
  flow_version: string;
}
```

### Supporting Data Types

```typescript
// Dichotomy of Control awareness check
interface ControlCheckData {
  // Current moment assessment
  current_situation: string;  // "Stuck in traffic, late for meeting"

  // Control classification
  control_assessment: ControlAssessment[];

  // Self-awareness
  am_i_confusing_control: boolean;  // Am I trying to control the uncontrollable?

  // Corrective action (if needed)
  reorientation?: string;  // "I can't control traffic. I can control my response: call ahead, stay calm, use time for audiobook."

  timestamp: Date;
}

interface ControlAssessment {
  aspect: string;  // "Being on time" or "My stress response"

  // Three-tier Stoic classification (not binary)
  control_type: 'fully_in_control' | 'can_influence' | 'not_in_control';

  // Specificity (prevents vague classification)
  what_i_control?: string;  // "My effort, my choices, my attitude"
  what_i_cannot_control?: string;  // "Outcome, others' reactions, timing"

  // Action (if any control)
  action_if_controllable?: string;  // "I can call and let them know I'm late"
}

// Embodied awareness (breathing practice)
interface EmbodimentData {
  // Breathing exercise metadata
  duration_seconds: number;  // Should be 60 (exact)
  breaths_counted?: number;

  // Before/after body awareness
  body_state_before: BodyState;
  body_state_after: BodyState;

  // User experience
  noticed_sensations: string[];  // ["tension in shoulders", "faster heartbeat", "tight jaw"]

  // Alignment with Principle 7
  did_practice_help: boolean;

  timestamp: Date;
}

interface BodyState {
  tension_level: number;      // 1-10
  energy_level: number;       // 1-10
  emotional_intensity: number;  // 1-10

  // Optional narrative
  description?: string;  // "Anxious and scattered" → "Calmer, more centered"
}

// Stoic reappraisal: Obstacles → Opportunities for virtue
interface ReappraisalData {
  // Current obstacle/challenge
  obstacle: string;  // "Client rejected my proposal"

  // Automatic reaction (awareness of reactivity)
  initial_reaction: string;  // "Frustration, self-blame, worry about my performance"

  // Stoic reframe
  virtue_opportunity: VirtueOpportunity;

  // Embodied shift (did reframe change anything?)
  emotional_shift: number;  // -5 to +5 (negative = worse, positive = better)

  // Learning
  insight?: string;  // "I can't control their decision, but I can learn from their feedback"

  timestamp: Date;
}

interface VirtueOpportunity {
  virtue: CardinalVirtue;  // Which virtue does this call for?

  // How to practice virtue here
  virtue_response: string;  // "Courage: Accept rejection calmly, ask for feedback, revise proposal"

  // Principle applied
  principle_used?: string;  // e.g., "Intention Over Outcome" (Principle 5)

  // Is this a preferred indifferent?
  recognized_as_indifferent: boolean;  // Client approval is preferred but not required for virtue
}

// Morning intention progress check
interface IntentionProgressData {
  // Reference to morning intention
  morning_virtue: CardinalVirtue;
  morning_intention: string;  // Repeated from morning for context

  // Progress assessment
  have_i_practiced: boolean;

  // If practiced
  practice_instance?: {
    context: string;  // "During stand-up meeting when interrupted"
    how_i_practiced: string;  // "Stayed patient, didn't react defensively"
    effectiveness: number;  // 1-10
  };

  // If not practiced yet
  upcoming_opportunity?: string;  // "I have that 3pm call where I can practice"

  // Recommitment
  renewed_commitment: boolean;  // Do I recommit to this intention for rest of day?

  timestamp: Date;
}
```

### Design Decisions

**Q: Keep 60-second auto-advance?**
- **Decision**: Keep 60-second timer for breathing circle (technical constraint: 60fps animation)
- **Rationale**: MBCT's 3-Minute Breathing Space is evidence-based (60s per section). Maintains performance requirements.
- **Change**: Content changes from MBCT's "Gathering → Expanding" to Stoic "Body awareness → Virtue readiness"

**Q: How does `control_check` work? (Binary or spectrum?)**
- **Decision**: Three-tier classification (not binary)
- **Three tiers**:
  1. **Fully in control** (prohairetic): Judgments, intentions, efforts, responses
  2. **Can influence** (partial): Can affect but not guarantee (outcomes, collaborative work)
  3. **Not in control** (aprohairetic): External events, others' actions, past/future
- **Rationale**: Binary "in control" or "not" creates:
  - **Learned helplessness**: "Nothing is in my control" (over-classifying as aprohairetic)
  - **Control anxiety**: "I must control everything" (over-classifying as prohairetic)
- **Example**: "Being on time for meeting"
  - ❌ Binary: Forces "in control: yes/no" (inaccurate)
  - ✅ Three-tier: "I control departure time, route choice, calling ahead" (fully in control) + "I can't control traffic, accidents" (not in control)
- **Maps to**: Epictetus *Enchiridion* 1 - proper classification of prohairetic vs. aprohairetic

**Q: What's relationship between `reappraisal` and virtue practice?**
- **Direct relationship**: Reappraisal IS virtue practice (Principle 6)
- **Mechanism**: Obstacle → Identify automatic reaction → Identify virtue called for → Choose virtue-based response
- **Not**: "Look on the bright side" positive thinking
- **Is**: "This is an opportunity to practice courage/wisdom/justice/temperance"
- **Clinical basis**: Cognitive reappraisal is core CBT technique. Stoic version adds virtue framework.

**Q: Does `intention_progress` affect virtue tracking?**
- **Yes, if practiced**: Practice instance goes into `virtue_tracking` in StoicPracticeStore
- **No, if aspirational**: Just self-awareness, not tracking
- **Purpose**: Maintains continuity from morning → midday → evening (coherent daily arc)

---

## 3. Evening Flow: Stoic Review (Prosoche Reflective)

### Philosophical Basis

The evening examination (*examen*) is the most extensively documented Stoic practice. Seneca (*On Anger* 3.36) describes reviewing the day before sleep: "What bad habit have I cured today? What vice have I resisted? In what respect am I better?" Marcus Aurelius's *Meditations* is essentially his evening journal. The purpose is learning, not self-flagellation - honest assessment of where you practiced virtue and where you fell short.

**Key Principles Integrated**:
- **Principle 9 (Contemplative Praxis)**: Daily reflection as core practice
- **Principle 11 (Character Cultivation)**: Assessing virtue development
- **Principle 12 (Relational Presence)**: How did I show up in relationships today?
- **All 4 Cardinal Virtues**: Explicit tracking of wisdom, courage, justice, temperance instances

### TypeScript Interface

```typescript
interface StoicEveningFlowData {
  // Stoic Daily Examination (prosoche)
  review?: ReviewData;  // Did I practice my intention? Where did I practice virtue?

  // Virtue Tracking (core evening practice - BALANCED examination)
  virtue_instances?: VirtueInstance[];  // Where I succeeded (Seneca: "What virtue did I practice?")
  virtue_challenges?: VirtueChallenge[];  // Where I struggled (Seneca: "What vice did I resist?")

  // Learning (react vs. respond)
  learning?: LearningData;  // Where did I react automatically vs. respond wisely?

  // Gratitude (closing practice)
  gratitude?: GratitudeData;  // 3 things from today (same structure as morning)

  // Preparation for Tomorrow
  tomorrow_intention?: IntentionData;  // What will I practice tomorrow? (same structure as morning)

  // Optional: Extended Stoic Reflection
  meditation?: MeditationData;  // Marcus Aurelius-style journaling (optional)

  // Metadata
  completed_at: Date;
  time_spent_seconds: number;
  flow_version: string;
}
```

### Supporting Data Types

```typescript
// Stoic daily examination
interface ReviewData {
  // Morning intention follow-up
  morning_intention_practiced: boolean;
  morning_intention_details?: string;  // How did it go?

  // Day overview
  day_quality_rating: number;  // 1-10 (not outcome-focused, virtue-focused)

  // Key moments
  virtue_moments: string[];  // ["Stayed calm during conflict", "Helped colleague with project"]
  struggle_moments: string[];  // ["Reacted defensively to criticism", "Avoided difficult conversation"]

  // Self-assessment (Seneca's questions)
  what_vice_did_i_resist?: string;
  what_habit_did_i_improve?: string;
  how_am_i_better_today?: string;

  // Principle 5: Intention Over Outcome (explicit check)
  was_i_attached_to_outcomes?: {
    situation: string;  // "I really wanted the promotion"
    stayed_process_focused: boolean;  // Did I judge by effort or outcome?
    learning: string;  // "I was disappointed but know I did my best"
  };

  // Principles 10 & 12: Relational Presence / Interconnected Action
  how_did_i_show_up_for_others?: string;  // "Listened fully to colleague's stress"
  contribution_to_common_good?: string;  // "Picked up litter on my walk"

  // Compassionate framing
  self_compassion: string;  // "I'm human. I made progress and I struggled. Both are okay."

  timestamp: Date;
}

// Virtue instances (populates StoicPracticeStore.virtue_tracking)
// NOTE: This reuses VirtueInstance from Stoic-Data-Models.md
// Full interface copied here for reference:
interface VirtueInstance {
  id: string;
  virtue: CardinalVirtue;  // 'wisdom' | 'courage' | 'justice' | 'temperance'
  context: string;  // "Stayed calm when criticized in meeting"
  domain: PracticeDomain;  // 'work' | 'relationships' | 'adversity'
  situation_type: SituationType;  // 'planned' | 'reactive' | 'opportunity_recognized'

  // Stoic dichotomy of control (from Philosopher refinement)
  focused_on: 'internal' | 'external' | 'both';
  stoic_reflection: {
    what_was_in_my_control: string;
    what_was_outside_my_control: string;
    did_i_confuse_the_two: boolean;
  } | null;

  principle_applied: string | null;  // Which of 12 principles did I use?
  was_planned: boolean;  // Was this my morning intention, or spontaneous?
  effectiveness_rating: number;  // 1-10: How well did I embody this virtue?
  learning: string | null;  // What did I learn from this instance?

  timestamp: Date;
  check_in_type: 'morning' | 'midday' | 'evening';  // Always 'evening' for evening flow
}

// React vs. Respond distinction (Stoic prohairesis)
interface LearningData {
  // Moments of reactivity (automatic, unconsidered responses)
  reactive_moments: ReactiveMoment[];

  // Moments of response (considered, virtue-guided responses)
  responsive_moments: ResponsiveMoment[];

  // Pattern recognition
  triggers_identified: string[];  // "Criticism triggers defensiveness"

  // Growth commitment
  what_will_i_practice?: string;  // "Tomorrow I'll pause before responding to criticism"

  timestamp: Date;
}

interface ReactiveMoment {
  trigger: string;  // "Colleague questioned my work"
  automatic_reaction: string;  // "Defensive, justified myself immediately"

  // Consequence
  outcome: string;  // "They became more critical, I felt worse"

  // Alternative (wisdom in hindsight)
  better_response_would_be: string;  // "I could have listened to their concern first"

  // Principle that could have helped
  principle_to_practice?: string;  // "Metacognitive Space (Principle 2)"
}

interface ResponsiveMoment {
  trigger: string;  // "Partner was upset about something I did"

  // Pause before response (Principle 2: Metacognitive Space)
  noticed_pause: boolean;  // Did I catch myself before reacting?

  // Virtue-guided response
  virtue_used: CardinalVirtue;  // 'justice' - giving them space to express feelings
  response: string;  // "I listened fully without defending, then apologized"

  // Outcome (preferred indifferent, but worth noting)
  outcome: string;  // "They felt heard, we resolved it together"

  // Learning
  what_made_this_possible: string;  // "I remembered my morning intention to practice justice"
}

// Virtue challenges: Where I fell short (Seneca's balanced examination)
interface VirtueChallenge {
  id: string;

  // Where I fell short (honest self-assessment)
  situation: string;  // "Reacted defensively to criticism"
  virtue_violated: CardinalVirtue;  // e.g., 'temperance'
  what_i_could_have_done: string;  // Specific alternative response

  // Learning (not self-flagellation)
  trigger_identified?: string;  // "Criticism from authority figures"
  what_will_i_practice: string;  // "Tomorrow I'll pause before defending"

  // Compassionate framing (REQUIRED)
  self_compassion: string;  // "I'm learning. This is hard. I'm making progress."

  timestamp: Date;
}

// Evening meditation (optional extended practice)
interface MeditationData {
  // Marcus Aurelius-style reflection
  meditation_prompt: string;  // e.g., "What does it mean to be a good partner?"
  reflection: string;  // User's written reflection (journal entry)

  // Duration
  time_spent_minutes: number;

  // Integration
  insights: string[];  // Key takeaways from reflection

  timestamp: Date;
}
```

### Design Decisions

**Q: How does evening `review` differ from MBCT `dayReview`?**
- **MBCT dayReview**: General reflection on highlights/challenges/learnings
- **Stoic review**: Structured examination based on Seneca's questions + virtue assessment
- **Key difference**: Stoic review asks "Did I practice virtue?" not "Did good things happen?"
- **Outcome-independent**: Day could be objectively "bad" (things went wrong) but virtue-rich (I responded well)

**Q: Should `virtue_instances` be captured here or auto-detected?**
- **Decision**: Explicitly captured by user in evening flow (with BALANCED examination)
- **Rationale**:
  - Auto-detection risks false positives/negatives
  - User self-report exercises prohairesis (moral agency)
  - Evening is natural time for reflection (Seneca, Marcus Aurelius)
  - Clinical precedent: Gratitude journals, CBT thought records rely on user entry
- **CRITICAL**: Balanced examination prevents performative virtue signaling
  - **Seneca's three questions** (*On Anger* 3.36):
    1. "What virtue did I practice?" → `virtue_instances`
    2. "What vice did I resist?" → `virtue_challenges`
    3. "How am I better?" → `ReviewData.how_am_i_better_today`
  - Logging **only successes** creates:
    - Confirmation bias (ignoring failures)
    - Performative tracking ("I logged 10 virtues today!")
    - Extrinsic motivation (tracking for display, not character)
  - Balanced structure (successes + struggles) supports **genuine character development**
- **UX**: Provide examples and prompts to make entry easy
- **Algorithm support**: May suggest based on midday reappraisal or morning intention
- **Philosophical authenticity**: Epictetus *Enchiridion* 13 - "If you wish to improve, be content to appear foolish and dull" (virtue is internal, not for display)

**Q: Do we keep `pleasantUnpleasant` MBCT pattern?**
- **Decision**: No, replace with `learning.reactive_moments` and `learning.responsive_moments`
- **Rationale**:
  - MBCT's pleasant/unpleasant events focus on emotional valence
  - Stoic focus is on *response quality*, not *event quality*
  - Maps to "preferred/dispreferred indifferents" concept but centers on virtue practice
  - More actionable: "I reacted here, I responded there" → clearer learning
- **Retained element**: User still reflects on specific events, but through virtue lens

**Q: How does `learning` capture react/respond distinction?**
- **React**: Automatic, unconsidered response driven by emotion/habit
- **Respond**: Pause → consider → virtue-guided action
- **Stoic basis**: Prohairesis (moral agency) - the ability to choose response
- **Neurological**: Prefrontal cortex override of amygdala reactivity
- **UX**: Users identify both types of moments → pattern recognition → growth areas
- **Feeds into**: StoicPracticeStore.principle_progress (comprehension_depth assessment)

---

## 4. Cross-Flow Integration

### Data Flow Architecture

```
Morning Flow
  └─> Creates IntentionData
  └─> Creates PrincipleFocusData
  └─> Stores in StoicPracticeStore.daily_practice_tracking

Midday Flow
  └─> References morning IntentionData (intention_progress)
  └─> May create VirtueInstance (if reappraisal led to virtue practice)
  └─> Updates StoicPracticeStore.principle_progress (if control_check applied principle)

Evening Flow
  └─> References morning IntentionData (review)
  └─> Creates multiple VirtueInstances (explicit virtue tracking)
  └─> Creates tomorrow's IntentionData (continuity)
  └─> Updates StoicPracticeStore.virtue_tracking
  └─> Updates StoicPracticeStore.principle_progress
  └─> Calculates StoicPracticeStore.virtue_summary (daily rollup)
```

### Shared Data Types

The following data types are used across multiple flows:

1. **IntentionData**: Morning (creates) → Midday (checks progress) → Evening (creates for tomorrow)
2. **GratitudeData**: Morning (creates) → Evening (creates)
3. **VirtueInstance**: Midday (may create) → Evening (creates multiple - where I succeeded)
4. **VirtueChallenge**: Evening only (where I struggled - balances VirtueInstance)
5. **PhysicalMetricsData**: Morning only (but could expand to evening if needed)

### Crisis Detection Integration

**Retained from MBCT**: Crisis detection must work within Stoic flows

**Critical requirements**:
- PHQ-9/GAD-7 assessment screens remain unchanged (clinical instruments)
- Crisis button accessible from all screens (<3s from anywhere)
- If `review.struggle_moments` contains crisis language → trigger assessment
- If `learning.reactive_moments` contains self-harm language → trigger crisis plan

**New Stoic consideration**:
- Principle 8 (Negative Visualization) could trigger false positives
- Solution: Contextualize - if user is in PreparationData.obstacles, premeditatio is expected
- Monitor for catastrophizing vs. rational contemplation (linguistic markers)

---

## 5. Migration from MBCT

### Field Mapping

| MBCT Field | Stoic Equivalent | Migration Strategy |
|------------|------------------|-------------------|
| `values` | `intention` (virtue-based) | Map general values to closest virtue |
| `thoughts` | `learning` (react vs. respond) | Categorize by helpfulness → reactivity |
| `emotions` | `embodiment.body_state` | Direct transfer with reframing |
| `bodyScan` | `physicalMetrics` | Simplify from 10 areas to 3 metrics |
| `physicalMetrics` | `physicalMetrics` | Direct transfer (unchanged) |
| `awareness` | `control_check` | Reframe present-moment → control awareness |
| `gathering` | `embodiment` | Direct transfer (breathing practice) |
| `expanding` | `reappraisal` | Reframe expansion → virtue opportunity |
| `dayReview` | `review` | Add virtue framing to general review |
| `pleasantUnpleasant` | `learning.reactive_moments / responsive_moments` | Shift from event quality → response quality |
| `thoughtPatterns` | `learning.triggers_identified` | Direct transfer with Stoic language |
| `tomorrowPrep` | `tomorrow_intention` | Add virtue specificity |

### Data Preservation

**For beta users (if any exist)**:
- Historical MBCT data stays in separate archive table
- New check-ins use Stoic structure
- Analytics can compare MBCT era vs. Stoic era
- User sees seamless transition (no data loss message)

---

## 6. Philosopher Review Gate

**Questions for Philosopher Agent**:

1. **Philosophical Accuracy**: Do these structures authentically represent Stoic practice as documented in Epictetus, Marcus Aurelius, and Seneca?

2. **Premeditatio Malorum**: Is the `PreparationData` structure psychologically safe for users with anxiety? Does it distinguish clearly between rational contemplation and catastrophizing?

3. **Gratitude Framework**: Does `GratitudeData` properly integrate Stoic impermanence awareness without creating attachment anxiety?

4. **Virtue Tracking**: Does `VirtueInstance` allow genuine virtue practice tracking without creating performative virtue signaling?

5. **Dichotomy of Control**: Do `ControlCheckData` and `IntentionData` properly represent the Stoic concept of *prohairesis* (moral agency over what's in our control)?

6. **React vs. Respond**: Is the `LearningData` distinction philosophically sound? Does it map to Stoic concepts of impression (*phantasia*) vs. assent (*synkatathesis*)?

7. **Character Cultivation**: Do these flows support genuine character development (Principle 11) or just behavioral tracking?

8. **Clinical Integration**: Can these structures support crisis detection while maintaining philosophical integrity?

---

## 7. Technical Validation Checklist

- [ ] All interfaces compile in TypeScript strict mode
- [ ] All required fields have clear non-null guarantees or are properly optional
- [ ] Timestamp fields consistently use `Date` type
- [ ] All enums/unions match StoicPracticeStore definitions (CardinalVirtue, PracticeDomain, etc.)
- [ ] No duplicate data structures (reuse from Stoic-Data-Models.md where possible)
- [ ] 60fps breathing circle performance: EmbodimentData.duration_seconds = 60 (exact)
- [ ] Crisis detection hooks identified in review/learning flows
- [ ] Data sizes reasonable for AsyncStorage (<10MB total per user)
- [ ] All fields map to potential UI components (no abstract concepts that can't be built)
- [ ] Migration path clear for all MBCT fields

---

## 8. Next Steps (Day 5+)

1. **Day 5**: Migration strategy pseudocode
2. **Day 6-7**: Navigation flow (which screens in which order)
3. **Day 8**: Integration points (crisis detection, analytics, performance)
4. **Day 9-10**: Lock final architecture document

**Dependencies**:
- These structures must be **philosopher-validated** before proceeding to Day 5
- Any changes from philosopher review require document update + re-validation
- Once locked, these become the blueprint for Phase 2 refactoring (86 files)

---

## Appendix A: Principle-to-Flow Mapping

| Principle | Morning | Midday | Evening |
|-----------|---------|--------|---------|
| 1. Present Perception | Gratitude | Embodiment | Gratitude |
| 2. Metacognitive Space | - | Control Check | Learning (pause recognition) |
| 3. Radical Acceptance | Preparation (self-compassion) | - | Learning (react vs. respond) |
| 4. Sphere Sovereignty | Intention (dichotomy) | Control Check | Review (virtue instances) |
| 5. Intention Over Outcome | Intention | Intention Progress | Review (outcome-independence) |
| 6. Virtuous Reappraisal | Preparation | Reappraisal | Learning |
| 7. Embodied Awareness | Physical Metrics | Embodiment (breathing) | - |
| 8. Negative Visualization | Preparation | - | Meditation (optional) |
| 9. Contemplative Praxis | Principle Focus | - | Review (daily practice) |
| 10. Interconnected Action | - | - | Virtue Instances (relational) |
| 11. Character Cultivation | Intention (virtue) | - | Review + Virtue Tracking |
| 12. Relational Presence | - | - | Virtue Instances (domain: relationships) |

---

## Appendix B: Classical Sources Referenced

1. **Epictetus, *Enchiridion***: Dichotomy of control, prohairesis (moral agency)
2. **Marcus Aurelius, *Meditations* Book 2.1**: Morning preparation
3. **Marcus Aurelius, *Meditations* Books 4-8**: Evening examination examples
4. **Seneca, *On Anger* 3.36**: Evening examination structure ("What vice have I resisted?")
5. **Seneca, *Letters to Lucilius* 107**: Premeditatio malorum (contemplating loss)
6. **Epictetus, *Discourses* 1.1**: Proper use of impressions (react vs. respond)

---

**Status**: Philosopher-Validated (9.5/10 Philosophical Integrity)
**Validation Date**: 2025-10-19
**Philosopher Review**: Complete - All critical issues and refinements implemented
**Next Action**: Proceed to Day 5 (Migration Strategy)
**Blockers**: None

---

## Philosopher Validation Summary

**Overall Rating**: 9.5/10 (upgraded from 8.5/10 after implementing all refinements)

**Critical Issues Resolved**:
1. ✅ **Premeditatio Malorum Safety**: Added max 2 obstacles, time-boxing, opt-out pathway, anxiety detection
2. ✅ **Virtue Tracking Balance**: Added `VirtueChallenge` companion structure for balanced Seneca examination

**Refinements Implemented**:
3. ✅ **Gratitude Impermanence**: Three-step pathway (awareness → appreciation → action)
4. ✅ **Control Classification**: Three-tier system (fully/influence/not in control)
5. ✅ **Intention Reserve Clause**: Stoic "fate permitting" grammatical structure
6. ✅ **Principle Coverage**: Added explicit prompts for Principles 3, 5, 10, 12

**Approved Elements** (Philosophically Sound):
- ✅ Four cardinal virtues only (no modern additions)
- ✅ Preferred indifferents concept correctly applied
- ✅ React vs. respond (phantasia vs. synkatathesis) accurate
- ✅ Evening examination based on Seneca *On Anger* 3.36
- ✅ Prosoche (midday pause) authentic to classical sources
- ✅ Classical source citations all accurate

**Next Steps**: These structures are now ready to drive the 86-file refactoring in Phase 2.
