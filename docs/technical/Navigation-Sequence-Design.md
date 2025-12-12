# Navigation & Sequence Design: Stoic Mindfulness User Journey
*Design Sprint Week 1, Day 6-7 | Status: Draft | FEAT-45*

---

## Document Purpose

This document defines the user journey through Being's Stoic Mindfulness app, including principle progression, educational module timing, daily check-in flows, and onboarding sequences. It answers the critical question: **How do users move from "Day 1 beginner" to "5-year integrated practitioner"?**

**Related Documents**:
- `Stoic-Data-Models.md` - StoicPracticeStore (tracks progression)
- `Stoic-Checkin-Structures.md` - Daily flow data structures
- `Stoic Mindfullness Framework.md` - 12 principles philosophical basis

---

## Design Principles for Navigation

### 1. User Agency (Prohairesis)

**Stoic Principle**: Users exercise moral agency over their development path.

**Implementation**:
- ✅ Algorithm **suggests**, user **decides**
- ✅ Users can choose which principle to focus on (not forced linear)
- ✅ Users can revisit completed principles
- ✅ Users can skip ahead if they feel ready (with gentle guidance)

**Anti-Pattern**: ❌ "You must complete Principle 1 before unlocking Principle 2" (too gamified, undermines autonomy)

---

### 2. Developmental Realism

**Stoic Principle**: Virtue development takes years, not weeks.

**Implementation**:
- ✅ 12 principles span **1-3 years** for fragmented → effortful transition
- ✅ No "complete all 12 in 30 days" pressure
- ✅ Principles are **revisited cyclically**, not "one and done"
- ✅ Developmental stages are **suggestive**, not algorithmic gates

**Anti-Pattern**: ❌ "Complete 1 principle per week!" (unrealistic, creates performative learning)

---

### 3. Daily Practice Primary

**Stoic Principle**: Transformation comes from daily contemplative practice (Principle 9), not just knowledge acquisition.

**Implementation**:
- ✅ Morning/Midday/Evening check-ins are **core experience**
- ✅ Educational modules are **supporting resources**, not prerequisites
- ✅ Users practice principles **before** they "complete" educational modules
- ✅ Practice generates questions that modules answer (inverted learning)

**Anti-Pattern**: ❌ "Watch educational video, then practice" (knowledge-first doesn't stick)

---

## Principle Progression Model

### Option A: Guided Sequential (Recommended)

**Structure**: App suggests principle order but allows user override.

```
User starts → Principle 1 suggested (Foundation: Present Perception)
  ↓
User practices Principle 1 for ~1-2 weeks
  ↓
App detects practice frequency + self-assessment
  ↓
App suggests Principle 2 (Foundation: Metacognitive Space)
  ↓
User can:
  - Accept suggestion (most common)
  - Continue with Principle 1 (needs more practice)
  - Jump to Principle 4 (feels ready for Sphere Sovereignty)
  ↓
Cycle continues through all 12 principles
  ↓
After all 12 encountered, user enters "Deepening" phase:
  - Revisit principles as needed
  - Focus on domains (work, relationships, adversity)
  - Practice becomes more fluid
```

**Why This Works**:
- Provides structure for beginners (most users)
- Preserves user agency (can override)
- Aligns with developmental stages (fragmented needs guidance)
- Follows philosophical progression (Foundation → Discernment → Regulation → Practice → Ethics)

---

### Option B: Full User Choice (Alternative)

**Structure**: All 12 principles available from Day 1, user chooses.

```
User starts → Sees all 12 principles
  ↓
User reads descriptions, chooses one that resonates
  ↓
User practices chosen principle
  ↓
User chooses next principle when ready
```

**Why This Could Work**:
- Maximum user agency (prohairesis)
- Allows users to start where they need most (e.g., adversity → jump to Principle 5: Intention Over Outcome)

**Why This Might Not Work**:
- Overwhelming for beginners (12 choices on Day 1)
- Risk of skipping foundational principles (Present Perception, Metacognitive Space)
- Less developmental coherence

---

### Recommended: Option A with Option B elements

**Hybrid Model**:
- **Default**: Guided sequential (Option A)
- **Advanced mode**: Full choice (Option B) - unlocked after completing first 3 principles OR user with existing contemplative practice can choose at onboarding

**Rationale**: Meets beginners where they are (need structure) while honoring advanced users' autonomy.

---

## Principle Completion Criteria

### What Does "Complete" Mean?

**Stoic Philosophy**: Principles are never truly "complete" - virtue is practiced for life.

**Pragmatic UX**: Need some marker of "I've engaged with this enough to move on."

**Recommendation**: Multi-signal, non-gatekeeping approach.

```typescript
interface PrincipleCompletionSignals {
  // Practice-based signals
  practice_days: number;              // User practiced ≥ 7 days (1 week minimum)
  application_instances: number;      // User applied ≥ 3 times in daily check-ins

  // Depth signals (from Stoic-Data-Models.md)
  comprehension_depth: 'intellectual' | 'experiential' | 'embodied';
  integration_stage: 'learning' | 'conscious_application' | 'effortful_spontaneity' | 'fluid_embodiment';

  // Educational engagement
  module_completed: boolean;          // User completed educational module

  // Self-assessment (PRIMARY signal - preserves prohairesis)
  self_assessed_mastery: number;      // 1-10: User feels ready to move on
  user_chose_to_advance: boolean;     // Did user explicitly decide "I'm ready"?
}
```

**Completion Decision Logic**:
```
IF (
  practice_days >= 7 AND
  application_instances >= 3 AND
  self_assessed_mastery >= 6 AND
  user_chose_to_advance === true
) THEN {
  Mark principle as "Engaged" (not "Completed")
  Suggest next principle
  Keep current principle available for revisiting
}
```

**Key**: "Engaged" not "Completed" - language matters. Principles are lifelong practices, not checkboxes.

---

## Educational Module Timing

### Module Structure

Each of the 12 principles has an educational module with:
- **Philosophical basis**: Classical sources (Epictetus, Marcus Aurelius, Seneca)
- **Neuroscience integration**: Why this practice changes your brain
- **Practice guidance**: How to apply in daily life
- **Examples**: Work, relationships, adversity scenarios

**Estimated Time**: 10-15 minutes per module (reading + reflection)

### When Do Modules Appear?

**Anti-Pattern (Knowledge-First)**:
```
❌ User starts → Watch educational video → Practice
```
**Problem**: Knowledge without experience doesn't stick.

**Recommended (Practice-First)**:
```
✅ User starts → Brief introduction (2 min) → Practice → Educational module (after 3 days)
```

**Rationale**:
1. **Day 1**: User gets brief intro to Principle 1 (Present Perception) - 2 minutes, just enough to start practicing
2. **Days 2-3**: User practices in morning/midday/evening check-ins without module
3. **Day 4**: User has questions from practice experience → Educational module appears → Answers questions user already has
4. **Days 5-7**: User continues practicing with deeper understanding

**This is inverted classroom**: Experience first, knowledge second. Research shows higher retention.

### Module Unlock Logic

```typescript
function shouldUnlockModule(principle: string, user: User): boolean {
  const progress = user.stoicPracticeStore.principle_progress[principle];

  // Unlock if user has practiced 3+ days OR explicitly requests
  return (
    progress.practice_days >= 3 ||
    progress.user_requested_module === true
  );
}
```

**User Control**: "I want to read about this now" button available from Day 1 (preserves agency).

---

## Daily Check-In Navigation Flows

### Morning Flow: Stoic Preparation

**Estimated Time**: 10-20 minutes (user-paced, no timer)

**Screen Sequence**:

```
1. Welcome Screen
   ├─ "Good morning, [name]"
   ├─ Time of day detection (6 AM - 12 PM)
   ├─ Current principle reminder (optional, can dismiss)
   └─ CTA: "Start Morning Practice"
        ↓
2. Gratitude Screen
   ├─ "What are 3 things you're grateful for today?"
   ├─ 3 text inputs
   ├─ Optional: Impermanence reflection toggle (for each item)
   │   └─ If toggled: "How does knowing this is impermanent affect your appreciation?"
   └─ Navigation: Can skip this screen, progress bar shows 1/5
        ↓
3. Intention Setting Screen
   ├─ "Which virtue will you practice today?"
   ├─ 4 buttons: Wisdom | Courage | Justice | Temperance
   ├─ "In which area of life?" → Work | Relationships | Adversity
   ├─ "What specifically will you do?" → Text input
   ├─ Dichotomy of control:
   │   ├─ "What's in your control?" → Text input
   │   └─ "What's outside your control?" → Text input
   └─ Navigation: This screen is core (encouraged but not required)
        ↓
4. Preparation Screen (Premeditatio Malorum)
   ├─ "What obstacles might arise today?" (Optional - can skip)
   ├─ Safety check: If user GAD-7 ≥15 → Show gentler prompt OR offer skip
   ├─ Max 2 obstacles (UI enforces)
   ├─ For each obstacle:
   │   ├─ Description
   │   ├─ How likely? (likely/possible/unlikely)
   │   ├─ Which virtue will help you respond?
   │   ├─ What's your response plan?
   │   ├─ What's in/out of your control?
   │   └─ Compassionate view: "Even if this goes badly, I'll cope because..."
   ├─ Compassion-first: Shows self-compassion prompt BEFORE obstacles
   └─ Time-boxing: If user spends >120s, gentle nudge to move on
        ↓
5. Physical Metrics Screen
   ├─ "How are you feeling physically?"
   ├─ 3 sliders (1-10):
   │   ├─ Energy level
   │   ├─ Sleep quality (last night)
   │   └─ Physical comfort
   ├─ Optional notes field
   └─ Navigation: Quick screen, can skip
        ↓
6. Principle Focus Screen (if user is working on a principle)
   ├─ "You're practicing Principle 4: Sphere Sovereignty"
   ├─ Brief reminder (1 sentence)
   ├─ "How will you practice this today?"
   ├─ Text input
   └─ Navigation: Only shown if user has active principle
        ↓
7. Summary Screen
   ├─ "Your morning intention: [virtue] in [domain]"
   ├─ "Remember: [what you control]"
   ├─ Optional: "Read more about [principle]" button (educational module)
   └─ CTA: "Begin your day"
```

**Navigation Controls**:
- ✅ Back button on all screens (can revise answers)
- ✅ Skip button on optional screens (gratitude, preparation, physical metrics)
- ✅ Progress indicator (e.g., "3 of 5")
- ✅ Save partial progress (can exit mid-flow and resume)
- ❌ NO timer (user-paced contemplation)

---

### Midday Flow: Stoic Pause

**Estimated Time**: 2-5 minutes (includes 60s breathing)

**Screen Sequence**:

```
1. Midday Check-In Welcome
   ├─ "Time for a mindful pause"
   ├─ Current time (e.g., "It's 2:15 PM")
   └─ CTA: "Start 3-Minute Pause"
        ↓
2. Current Situation Screen
   ├─ "What's happening right now?"
   ├─ Text input (brief description)
   └─ Navigation: Quick capture, no deep reflection yet
        ↓
3. Control Check Screen
   ├─ "What's in your power right now?"
   ├─ List current situation aspects
   ├─ For each: Classify as:
   │   ├─ Fully in my control
   │   ├─ I can influence
   │   └─ Not in my control
   ├─ "Am I trying to control the uncontrollable?" → Yes/No
   └─ If yes: "What can you let go of?"
        ↓
4. Embodiment Screen (60-Second Breathing)
   ├─ Breathing circle animation (60fps performance critical)
   ├─ Before: "Rate your tension/energy/emotion" (1-10 sliders)
   ├─ 60-second guided breathing (auto-advances)
   ├─ After: "Rate your tension/energy/emotion" (1-10 sliders)
   └─ "Did this help?" → Yes/No
        ↓
5. Reappraisal Screen (if obstacle detected in situation)
   ├─ "Current challenge: [user's situation]"
   ├─ "Initial reaction: [how did you feel?]"
   ├─ "Which virtue does this call for?" → Wisdom/Courage/Justice/Temperance
   ├─ "How can you respond with [virtue]?" → Text input
   ├─ "Is this outcome a preferred indifferent?" → Yes/No (with explanation)
   └─ "Emotional shift after reframing: [-5 to +5]"
        ↓
6. Intention Progress Screen
   ├─ "Morning intention: [user's intention]"
   ├─ "Have you practiced this yet today?" → Yes/No
   ├─ If yes: "How did it go?" → Text + effectiveness rating (1-10)
   ├─ If no: "When might you practice this?" → Text
   ├─ "Do you recommit to this intention?" → Yes/No
   └─ CTA: "Return to your day with presence"
```

**Timing**: Total ~3 minutes (180 seconds like MBCT 3-Minute Breathing Space, but Stoic content)

---

### Evening Flow: Stoic Review

**Estimated Time**: 5-10 minutes (user-paced)

**Screen Sequence**:

```
1. Evening Review Welcome
   ├─ "Time to reflect on your day"
   ├─ "Remember: This is for learning, not judgment"
   └─ CTA: "Begin Evening Examination"
        ↓
2. Morning Intention Review
   ├─ "This morning you intended: [intention]"
   ├─ "Did you practice this?" → Yes/No
   ├─ If yes: "How did it go?" → Text input
   └─ Navigation: Quick follow-up to morning
        ↓
3. Day Quality Screen
   ├─ "How was your day in terms of virtue practice?" (not outcomes)
   ├─ Slider 1-10
   ├─ Reminder: "We're rating your character practice, not what happened"
   └─ Example: "Bad outcomes but virtuous responses = high rating"
        ↓
4. Virtue Moments Screen
   ├─ "Where did you practice virtue today?"
   ├─ Add virtue instances (0-5, no pressure to fill all)
   ├─ For each:
   │   ├─ Which virtue? → Wisdom/Courage/Justice/Temperance
   │   ├─ What happened? → Text
   │   ├─ Domain? → Work/Relationships/Adversity
   │   ├─ Was this planned or spontaneous?
   │   ├─ Dichotomy of control reflection:
   │   │   ├─ What was in your control?
   │   │   ├─ What wasn't?
   │   │   └─ Did you confuse the two?
   │   ├─ Which principle did you use?
   │   ├─ Effectiveness (1-10)
   │   └─ What did you learn?
   └─ UX: Examples provided, easy to add multiple
        ↓
5. Virtue Challenges Screen (BALANCED EXAMINATION)
   ├─ "Where did you fall short today?"
   ├─ Add virtue challenges (0-5, matching virtue moments emphasis)
   ├─ For each:
   │   ├─ What happened? → Text
   │   ├─ Which virtue did you violate? → Wisdom/Courage/Justice/Temperance
   │   ├─ What could you have done instead?
   │   ├─ What triggered this?
   │   ├─ What will you practice tomorrow?
   │   └─ REQUIRED: Self-compassion → "I'm learning. This is hard. I'm making progress."
   └─ Compassionate framing throughout
        ↓
6. Learning Screen (React vs. Respond)
   ├─ "Reactive moments" (automatic, unconsidered)
   │   ├─ What triggered you?
   │   ├─ How did you react automatically?
   │   ├─ What was the outcome?
   │   └─ What would a wiser response have been?
   ├─ "Responsive moments" (paused, considered)
   │   ├─ What triggered you?
   │   ├─ Did you notice a pause before responding?
   │   ├─ Which virtue guided you?
   │   ├─ How did you respond?
   │   └─ What made this pause possible?
   └─ Pattern recognition: "What patterns do you notice?"
        ↓
7. Seneca's Questions Screen
   ├─ "What vice did I resist today?" → Text
   ├─ "What habit did I improve?" → Text
   ├─ "How am I better today?" → Text
   └─ Classical Stoic examination (Seneca On Anger 3.36)
        ↓
8. Principle Coverage Check (Newly added from philosopher refinement)
   ├─ "Intention over outcome: Were you attached to results today?"
   │   ├─ Situation description
   │   ├─ Did you stay process-focused? → Yes/No
   │   └─ Learning
   ├─ "How did you show up for others?" (Relational Presence)
   │   └─ Text input
   ├─ "How did you contribute to the common good?" (Interconnected Action)
   │   └─ Text input
   └─ Purpose: Ensures Principles 5, 10, 12 get explicit attention
        ↓
9. Gratitude Screen
   ├─ "What are 3 things you're grateful for from today?"
   ├─ Same structure as morning (3 items, optional impermanence)
   └─ Closing practice (bookend with morning)
        ↓
10. Tomorrow Intention Screen
    ├─ "What virtue will you practice tomorrow?"
    ├─ Same structure as morning intention
    └─ Creates continuity (evening → morning)
         ↓
11. Self-Compassion Screen (REQUIRED)
    ├─ "I'm human. I made progress and I struggled. Both are okay."
    ├─ User's own self-compassion statement → Text
    └─ Prevents harsh Stoicism, ensures kindness
         ↓
12. Summary Screen
    ├─ "You practiced virtue [X] times today"
    ├─ "You learned from [Y] challenges"
    ├─ "Tomorrow you'll practice [virtue]"
    ├─ Optional: "Write in journal" (Marcus Aurelius-style extended reflection)
    └─ CTA: "Rest well"
```

**Navigation Controls**:
- ✅ All screens skippable (no forced deep reflection if user is tired)
- ✅ Save partial progress
- ✅ Back button to revise
- ✅ "Quick review" mode (skips to Seneca's questions + gratitude)

---

## Onboarding Sequence for New Users

### First-Time User Experience

**Goal**: Get users practicing on Day 1, not overwhelmed with philosophy.

**Sequence**:

```
1. Welcome Screen
   ├─ "Welcome to Being"
   ├─ "Build wisdom, courage, justice, and temperance through daily practice"
   └─ CTA: "Get Started"
        ↓
2. Philosophy Introduction (Brief)
   ├─ "Being blends:"
   │   ├─ Classical Stoicism (Marcus Aurelius, Epictetus, Seneca)
   │   ├─ Mindfulness practice
   │   └─ Neuroscience insights
   ├─ "You'll practice daily, guided by 12 principles"
   ├─ "This takes years, not weeks. That's okay."
   └─ CTA: "I understand"
        ↓
3. PHQ-9/GAD-7 Assessment (UNCHANGED from MBCT)
   ├─ "First, let's understand your current wellbeing"
   ├─ PHQ-9 (9 questions)
   ├─ GAD-7 (7 questions)
   ├─ Crisis detection: PHQ≥20, GAD≥15, Q9>0 → Crisis intervention
   └─ Results stored, inform anxiety safeguards (e.g., premeditatio opt-out)
        ↓
4. Values Selection (Adapted for Virtues)
   ├─ "The four cardinal virtues guide Stoic practice:"
   ├─ Show 4 virtues with definitions:
   │   ├─ Wisdom: Sound judgment, understanding what matters
   │   ├─ Courage: Acting rightly despite fear
   │   ├─ Justice: Fairness, contributing to common good
   │   └─ Temperance: Self-control, moderation
   ├─ "Which resonates most right now?" → User selects 1
   └─ This informs first principle suggestion
        ↓
5. Principle 1 Introduction (Very Brief)
   ├─ "You'll start with Principle 1: Present Perception"
   ├─ "This is about being fully aware of the present moment"
   ├─ "You'll practice this in your morning check-in"
   ├─ Educational module available: "Learn more" (optional)
   └─ CTA: "Start First Morning Practice"
        ↓
6. First Morning Flow (Guided)
   ├─ Same as regular morning flow
   ├─ Extra tooltips/help text
   ├─ Can't skip screens (show full experience)
   ├─ After completion: "You just completed your first Stoic practice!"
   └─ Celebration without gamification
        ↓
7. Notification Preferences
   ├─ "When should we remind you?"
   ├─ Morning check-in time (default 7 AM)
   ├─ Midday check-in time (default 2 PM)
   ├─ Evening check-in time (default 8 PM)
   └─ Can customize or turn off
        ↓
8. Onboarding Complete
   ├─ "You're ready"
   ├─ "Practice daily. Be patient with yourself."
   ├─ "Virtue develops over years, not weeks."
   └─ Enter main app
```

**Total Time**: 20-30 minutes (mostly PHQ-9/GAD-7 assessment)

**Key Decisions**:
- ✅ Assessment FIRST (crisis detection, informs safeguards)
- ✅ Virtue introduction (contextualizes practice)
- ✅ Practice on Day 1 (don't delay with excessive education)
- ✅ Set realistic timeline expectations ("years, not weeks")

---

## Integration with Developmental Stages

### How Stages Affect Navigation

```typescript
interface NavigationByStage {
  stage: DevelopmentalStage;
  ui_adaptations: string[];
  suggested_focus: string;
}
```

**Fragmented Stage (1-6 months)**:
- **UI**: More guidance, tooltips, examples
- **Principles**: Suggested sequence (Foundation 1-3 first)
- **Educational modules**: Offered after 3 days practice
- **Check-in prompts**: More explicit ("What virtue did you practice?" with examples)

**Effortful Stage (6-18 months)**:
- **UI**: Less scaffolding, assumes familiarity
- **Principles**: User can choose, suggestions still offered
- **Educational modules**: Available on-demand
- **Check-in prompts**: More open-ended

**Fluid Stage (2-5 years)**:
- **UI**: Minimal guidance
- **Principles**: Full autonomy, revisit as needed
- **Educational modules**: Optional deep dives
- **Check-in prompts**: Reflective questions, not fill-in-the-blank

**Integrated Stage (5+ years)**:
- **UI**: Clean, minimal
- **Principles**: Practice is automatic, tracking is for reflection not instruction
- **Educational modules**: Advanced topics, classical source deep dives
- **Check-in prompts**: Open journal-style (Marcus Aurelius Meditations mode)

**Stage Transition**:
```
App never forces transition.
App suggests: "Based on your practice, you might be ready for [next stage]. What do you think?"
User decides: Accept suggestion | Stay at current stage | Explore next stage
```

---

## Home Screen Navigation

### Clean Home Design

**Home Screen Structure** (time-of-day aware):

```
┌────────────────────────────────────┐
│  Being                             │
│                                    │
│  Good morning, Max                 │
│  Wednesday, October 19, 2025       │
│                                    │
│  ╭──────────────────────────────╮  │
│  │  Morning Practice              │
│  │  ⏱ ~15 minutes                │
│  │  [Start Morning Check-In]      │
│  ╰──────────────────────────────╯  │
│                                    │
│  Current Practice:                 │
│  Principle 4: Sphere Sovereignty   │
│  Day 5 of practice                 │
│  [Learn More] [Change Principle]   │
│                                    │
│  ───────────────────────────────   │
│                                    │
│  Recent Practice:                  │
│  • Morning check-in (today)        │
│  • Evening review (yesterday)      │
│  • Midday pause (yesterday)        │
│                                    │
│  ───────────────────────────────   │
│                                    │
│  [View Progress] [Educational]     │
│  [Settings] [Crisis Support]       │
│                                    │
└────────────────────────────────────┘
```

**Time-of-Day Logic**:
- **6 AM - 12 PM**: "Good morning" + Morning Practice button prominent
- **12 PM - 6 PM**: "Good afternoon" + Midday Pause button prominent
- **6 PM - 12 AM**: "Good evening" + Evening Review button prominent
- **12 AM - 6 AM**: "Rest well" + Tomorrow's morning practice preview

**Navigation Tabs** (bottom of screen):
```
┌─────┬─────┬─────┬─────┬─────┐
│Home │Check│Learn│Track│ You │
│ 🏠  │ ✓  │ 📚 │ 📊 │ 👤 │
└─────┴─────┴─────┴─────┴─────┘
```

1. **Home**: Current practice, quick access to check-ins
2. **Check-In**: Manual access to Morning/Midday/Evening flows (if user missed scheduled time)
3. **Learn**: Educational modules library (12 principles + resources)
4. **Track**: Progress visualization (NOT gamified - reflective)
5. **You**: Profile, settings, crisis resources, support

---

## Progress Visualization (Non-Gamified)

### Principles Dashboard

**Anti-Pattern**: ❌ "You've completed 6/12 principles! Keep going!" (Gamified, implies "completion")

**Recommended**: ✅ Reflective visualization

```
Principle Engagement:

Foundation
├─ 1. Present Perception        [Practiced 14 days | Last: Oct 15]
├─ 2. Metacognitive Space        [Practiced 10 days | Last: Oct 18]
└─ 3. Radical Acceptance         [Practiced 7 days  | Last: Oct 19] ← Current focus

Discernment
├─ 4. Sphere Sovereignty         [Not yet practiced]
└─ 5. Intention Over Outcome     [Not yet practiced]

Regulation
├─ 6. Virtuous Reappraisal       [Not yet practiced]
└─ 7. Embodied Awareness         [Practiced 14 days | Parallel with #1-3]

Practice
├─ 8. Negative Visualization     [Not yet practiced]
└─ 9. Contemplative Praxis       [Practiced 19 days | Daily check-ins]

Ethics
├─ 10. Interconnected Action     [Not yet practiced]
├─ 11. Character Cultivation     [Practiced 19 days | Evening virtue tracking]
└─ 12. Relational Presence       [Not yet practiced]
```

**Key**:
- "Practiced X days" not "Completed ✓"
- Last practice date visible
- Multiple principles can be active simultaneously
- Some principles (7, 9, 11) are practiced implicitly through daily check-ins

---

### Virtue Tracking Dashboard

**Anti-Pattern**: ❌ Bar chart showing "Wisdom: 47 | Courage: 23 | Justice: 31 | Temperance: 19" (Competitive, gamified)

**Recommended**: ✅ Contextual reflection

```
Virtue Practice Patterns:

This week you practiced:
• Wisdom primarily in work situations
• Courage when facing difficult conversations
• Justice in relationships with family
• Temperance when managing stress

Your reflections show:
• You're growing in noticing pauses before reacting (Principle 2)
• Challenges with Principle 4 (Sphere Sovereignty) in work domain
• Strength in relational presence (Principle 12)

Areas you're exploring:
• How to practice justice in adversity (identified Oct 17)
• Building courage for uncomfortable but necessary actions

No aggregate counts. No "leaderboards". Just patterns for reflection.
```

---

## Educational Module Library

### Structure

**12 Modules** (one per principle) + supplementary resources

**Each Module Contains**:
1. **Classical Source** (3-5 min read)
   - Epictetus quote or passage
   - Marcus Aurelius Meditations excerpt
   - Seneca letter excerpt
   - Modern translation + original context

2. **Philosophical Explanation** (5-7 min read)
   - What does this principle mean?
   - Why do Stoics emphasize this?
   - How does it integrate with other principles?

3. **Neuroscience Integration** (3-5 min read)
   - What brain changes occur with this practice?
   - Research citations (e.g., prefrontal cortex, amygdala regulation)
   - Why does this work psychologically?

4. **Practice Guidance** (5 min read)
   - How to apply in daily life
   - Work domain examples
   - Relationship domain examples
   - Adversity domain examples

5. **Reflective Questions** (self-paced)
   - "Where have you noticed this principle already?"
   - "What makes this practice challenging for you?"
   - "How might this principle help with [user's identified challenge]?"

**Total Time Per Module**: 15-25 minutes (reading + reflection)

**Access**:
- Unlocks after 3 days practice OR user requests
- Always available for revisiting
- No forced viewing (user agency)

---

## Crisis Integration Throughout Navigation

### Crisis Button Accessibility

**Requirement**: <3 seconds from ANY screen

**Implementation**:
- Persistent crisis button (top-right, all screens)
- During assessment: If PHQ≥20 or GAD≥15 or Q9>0 → Immediate intervention flow
- During check-ins: Linguistic markers trigger gentle check ("Are you in crisis?")
- Settings: Crisis resources always accessible

**Crisis Flow**:
```
User taps crisis button (or triggers via assessment)
  ↓
"We're here to help. Are you in immediate danger?"
  ├─ Yes → 988 Suicide & Crisis Lifeline (immediate call)
  └─ No → Crisis plan review
       ├─ View your crisis plan
       ├─ Contact your support person
       ├─ Call 988
       └─ Breathing exercise (immediate grounding)
```

**Non-Disruption**: Crisis support doesn't disrupt Stoic practice. Philosophy doesn't replace professional help when crisis arises.

---

## Summary: Navigation Philosophy

**Guided but Autonomous**: App suggests paths, user decides.
**Practice-First**: Experience before knowledge.
**Non-Gamified**: Reflection not competition.
**Developmental**: UI adapts to user's stage (fragmented → integrated).
**Crisis-Aware**: Safety always <3s away.
**Stoic Authenticity**: Principles are lifelong practices, not checkboxes.

---

**Status**: Draft - Ready for Review
**Next Action**: Day 8 (Integration Points Documentation)
**Estimated Completion**: 40% of design sprint (Days 1-7 of 10)