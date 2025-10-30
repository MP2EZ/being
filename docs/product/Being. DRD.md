# DRD: Being. - Design Requirements Document

## Mobile App UX/UI Specifications - Stoic Mindfulness Implementation

---

## Document Metadata

```yaml
document:
  type: DRD
  version: 2.0.0
  status: STOIC-MINDFULNESS-ALIGNED
  created: 2025-08-28
  updated: 2025-10-23
  product: Being.
  references: [Design Library v1.1.0, PRD v3.0.0, Stoic Mindfulness Framework]
  platform: iOS/Android Mobile
  domain: Mindfulness & Wellness UX Design
  positioning: "Mindfulness-first mental wellness app grounded in Stoic philosophy"

changes_from_v1.3.0_MBCT_TO_STOIC_MINDFULNESS:
  - MAJOR REDESIGN: MBCT clinical therapy flows → Stoic Mindfulness wellness practices
  - Positioning shift: Mental health/therapeutic → Mindfulness with philosophical depth
  - Morning flow: Body scan/emotion tracking → Gratitude/Intention/Preparation with Stoic wisdom
  - Midday flow: MBCT 3-Minute Breathing Space → Control/Embodiment/Reappraisal with Stoic reframing
  - Evening flow: Therapeutic reflection (4 screens) → Stoic Mindfulness reflection (8 practices)
  - Assessments: Clinical screening → Optional wellness check-ins (Settings, not Exercises menu)
  - Crisis: Always-visible SOS → Proportional resources in Settings (<3s access maintained)
  - Language: Therapeutic/clinical → Mindfulness practice/wellness throughout

preserved_from_v1.3.0:
  - Design system integration (color themes, typography)
  - Navigation architecture (bottom nav, header patterns)
  - Accessibility standards (WCAG 2.1 AA, 60fps, offline-first)
  - Progressive disclosure strategy (week-by-week introduction)
  - Technical performance requirements

```

---

## Design System Integration

### Complete Design Library Reference

**Primary Reference**: Being. Design Library v1.1.0

All component specifications, color systems, typography, and interactive elements are maintained in the design library. This DRD documents actual implementation patterns and user flows as realized in Prototype v1.7.

**Implementation Themes**:
```javascript
// Three distinct check-in themes
themes: {
  morning: { primary: '#FF9F43', success: '#E8863A' },
  midday: { primary: '#40B5AD', success: '#2C8A82' },
  evening: { primary: '#4A7C59', success: '#2D5016' }
}
```

---

## Core User Flows

### DRD-FLOW-001: Mindfulness Journey Onboarding

**Implements**: PRD v3.0.0 Onboarding
**Status**: REDESIGN FOR STOIC MINDFULNESS

```yaml
screens: 7 total
positioning: Mindfulness-first with Stoic philosophical grounding
flow:
  1_welcome:
    - Animated BrainIcon (60% fill)
    - Feature pills display (updated messaging):
      - "Daily mindfulness practice with meaning"
      - "Grounded in Stoic wisdom"
      - "Mental wellness with depth"
    - Single CTA: "Begin Your Practice"

  2_wellness_check_phq9:
    - Title: "Wellness Check-In (Optional)"
    - Subtitle: "Help us support your mindfulness journey"
    - 9 questions, radio selection
    - Previous/Next navigation
    - Prominent skip option: "I'll do this later"
    - Disclaimer: "For wellness awareness, not diagnosis"

  3_wellness_check_gad7:
    - Title: "Wellness Check-In Continued (Optional)"
    - 7 questions format
    - Identical UI to PHQ-9
    - Prominent skip option
    - Same disclaimer

  4_values_selection:
    - Title: "What Matters to You?"
    - 15 values grid (2 columns)
    - Values can map to Stoic principles OR remain generic
    - Requires 3-5 selections
    - Live counter display
    - Theme rotation on selection
    - Context: "These guide your mindfulness practice"

  5_practice_reminders:
    - Title: "Mindfulness Practice Reminders"
    - Three time pickers (Morning/Midday/Evening)
    - Visual theme coding per practice window
    - Copy: "When would you like to practice mindfulness?"
    - Master toggle for all reminders
    - "Set up later" option

  6_privacy_consent:
    - Title: "Privacy & Wellness Data"
    - Four privacy principles (mental wellness app context)
    - Required checkbox consent
    - No skip option (legal requirement)
    - Emphasize: No data sold, encryption, user control

  7_celebration:
    - Title: "Your Mindfulness Journey Begins"
    - Success animation
    - Selected values display
    - Two CTAs:
      - Primary: "Start Morning Practice"
      - Secondary: "Explore App"
    - Intro text: "Welcome to mindfulness grounded in Stoic wisdom"

features:
  - Skip available on screens 2-5 (wellness checks fully optional)
  - Progress dots throughout
  - Wellness scores stored (proportional monitoring, not clinical assessment)
  - Values persist to all mindfulness practices
  - Positioning clear: Mindfulness app with philosophical depth (not therapy)
```

### DRD-FLOW-002: Morning Stoic Mindfulness Practice

**Implements**: PRD v3.0.0 Morning Flow
**Theme**: `morning` throughout (#FF9F43)
**Status**: PRODUCTION-READY (FEAT-45)

```yaml
screens: 5 total
time_estimate: 8-12 minutes (adjustable)
quick_version: 5 minutes available

flow:
  1_gratitude_practice:
    title: "Morning Gratitude"
    instruction: "Start with Mindful Awareness"
    components:
      breathing_guide:
        - Brief mindful breathing (30 seconds)
        - Visual breathing circle animation
        - "Center yourself in the present moment"

      gratitude_prompts:
        - "What's within your control to appreciate today?"
        - Stoic grounding: Marcus Aurelius morning practice (Meditations 2:1)
        - 2-3 gratitude items (simple, specific)

      ui:
        - Clean text inputs
        - Optional skip: "I'll practice this later"
        - Educational note (collapsible): "Why Stoic gratitude?"

  2_intention_setting:
    title: "Daily Intention"
    instruction: "How Will You Show Up Today?"
    components:
      mindfulness_checkin:
        - Brief pause: "Notice your current state"
        - No tracking required, just awareness

      stoic_virtue_lens:
        - "How do you want to show up today?" (not outcome-focused)
        - Optional virtue selection: Wisdom, Courage, Justice, Temperance
        - Practical, not preachy tone

      intention_input:
        - Textarea: "Today I will..."
        - Examples: "practice patience", "listen deeply", "stay present"
        - Context: Mindfulness awareness + Stoic values

  3_preparation_practice:
    title: "Mindful Preparation"
    instruction: "Visualize Your Day with Clarity"
    components:
      mindful_visualization:
        - "Picture your day ahead calmly"
        - Brief guided visualization (optional audio)

      stoic_obstacle_preparation:
        - "What challenges might you face?"
        - Max 2 obstacles (prevents catastrophizing)
        - Realistic preparation, not anxiety-inducing
        - Premeditatio malorum (skillfully applied)

      dichotomy_of_control:
        - "What's in your control today?"
        - "What's outside your control?"
        - Simple distinction exercise
        - Empowering, not limiting

      safety:
        - Hidden when GAD≥15 (preventive blocking)
        - Max 2 obstacles (time-boxed)
        - Opt-out always available

  4_principle_focus:
    title: "Stoic Wisdom for Today"
    instruction: "Optional Deepening"
    components:
      principle_introduction:
        - Brief intro to one of 12 Stoic Mindfulness principles
        - Rotating weekly or user-selected
        - "How this enhances your mindfulness practice"

      daily_application:
        - Simple suggestion: "Try this today..."
        - Practical, concrete example
        - Enriches practice, not required

      ui:
        - Fully optional (clear skip: "Not today")
        - Educational but not overwhelming
        - 1-2 minute read maximum

  5_physical_grounding:
    title: "Ground in Your Body"
    instruction: "Complete Your Morning Practice"
    components:
      body_awareness:
        - Brief body scan OR mindful breathing (user choice)
        - 1-2 minutes
        - Physical awareness practice

      transition:
        - "Transition to your day with presence"
        - Gentle completion
        - No metrics required

completion:
  button: "Complete Morning Practice"
  theme: morning-success (#E8863A)
  summary:
    - Practice completed
    - Optional: Today's intention displayed
    - Optional: Principle reminder

features:
  - All Stoic content optional and skippable
  - Mindfulness core, philosophy enriching
  - Offline-first (full functionality)
  - WCAG 2.1 AA accessible
  - Progress tracking (completion rates, streaks)
  - Quick version (5 min): Gratitude → Intention → Physical only
```

### DRD-FLOW-003: Midday Stoic Mindfulness Reset

**Implements**: PRD v3.0.0 Midday Flow
**Theme**: `midday` throughout (#40B5AD)
**Status**: REDESIGN FOR STOIC MINDFULNESS

```yaml
screens: 4 total
time_estimate: 3-7 minutes (highly flexible)
interruptible: Can pause/resume without losing place

flow:
  1_control_practice:
    title: "Pause & Center"
    instruction: "Mindful Reset with Stoic Clarity"
    components:
      mindful_breathing:
        - "Take a mindful breath to pause"
        - Breathing circle animation (30-60 seconds)
        - "Center in the present moment"

      stoic_dichotomy:
        - "What's in your control right now?"
        - "What's outside your control?"
        - Simple text inputs or selection
        - Gentle redirect to what you can influence
        - Empowering, not restrictive

      ui:
        - Fast access: <3 taps from any screen
        - Interruption-friendly (save state automatically)
        - Clean, calming interface

  2_embodiment_practice:
    title: "Ground in Your Body"
    instruction: "Release Tension Mindfully"
    components:
      body_scan:
        - Brief body scan (1-2 minutes)
        - Notice tension without judgment
        - "Where are you holding stress?"

      tension_release:
        - Gentle breathing into tense areas
        - Progressive relaxation (optional guided)
        - Return to present moment awareness

      ui:
        - Can be done anywhere (desk, car, bathroom break)
        - No tracking required, just practice
        - Calming visuals, minimal text

  3_reappraisal_practice:
    title: "Reframe with Stoic Wisdom"
    instruction: "Mindful Observation & Perspective"
    components:
      current_challenge:
        - "What's challenging you right now?" (optional input)
        - Mindful observation without reactive judgment
        - Brief acknowledgment

      stoic_reframing:
        - "What can I learn from this?"
        - "How can this help me grow?"
        - "What's the opportunity here?"
        - NOT toxic positivity - realistic perspective shift
        - Practical, not preachy

      ui:
        - Optional skip if no challenge present
        - Genuine reframing, not forced
        - Examples provided for guidance

  4_affirmation_practice:
    title: "Self-Compassion & Return"
    instruction: "Complete Your Reset"
    components:
      mindful_selfcompassion:
        - Brief self-compassion pause
        - "You're doing your best"
        - Stoic self-kindness framework

      stoic_affirmation:
        - Grounded affirmation (capability within your control)
        - NOT generic cheerleading
        - "I can choose my response"
        - "I have what I need"

      return_to_activity:
        - "Return to your day with calm presence"
        - Gentle transition
        - No metrics required

completion:
  button: "Complete Midday Reset"
  theme: midday-success (#2C8A82)
  access:
    - <3 seconds from crisis button
    - Works during high stress
    - Simple, calming, not cognitively demanding
    - No internet required

features:
  - Highly flexible duration (3-7 min, user-paced)
  - Can interrupt and resume seamlessly
  - Offline functionality
  - Crisis-accessible (<3s from any screen)
  - Stoic reframing optional (can practice just breathing)
```

### DRD-FLOW-004: Evening Stoic Mindfulness Reflection

**Implements**: PRD v3.0.0 Evening Flow
**Theme**: `evening` throughout (#4A7C59)
**Status**: REDESIGN FOR STOIC MINDFULNESS

```yaml
screens: 8 total
time_estimate: 10-15 minutes (adjustable, can save progress)
adaptive: Shorter version for exhaustion, fuller version for energy

flow:
  1_virtue_reflection:
    title: "Mindful Reflection"
    instruction: "Settle Into Your Evening Practice"
    components:
      mindful_breathing:
        - Breathing to settle into reflection
        - "Notice your day without judgment"
        - Transition from day to reflection

      stoic_examination:
        - "Where did I show up well today?" (not harsh judgment)
        - "Where could I grow?"
        - Growth-oriented, self-compassionate lens
        - Virtue-focused examination

      ui:
        - Simple text inputs (optional)
        - Self-compassionate tone throughout
        - Not perfectionist critique

  2_seneca_questions:
    title: "Deeper Reflection"
    instruction: "Optional Stoic Examination"
    components:
      classical_questions:
        - "What bad habit did I curb today?" (Seneca, Letters 28)
        - "What impulse did I resist?"
        - "How am I better today?"
        - Stoic daily examination practice

      ui:
        - OPTIONAL: Clear skip available
        - For users seeking deeper reflection
        - Not required for practice completion
        - 2-3 minute investment

  3_celebration_practice:
    title: "Celebrate Your Efforts"
    instruction: "Mindful Acknowledgment"
    components:
      effort_recognition:
        - Acknowledge efforts (not just outcomes)
        - "What did you attempt today?"
        - Stoic gratitude for what's in your control

      learning_celebration:
        - Celebrate attempts, learning, showing up
        - Genuinely uplifting tone
        - Not forced positivity

      ui:
        - Simple selections or text inputs
        - Authentic acknowledgment
        - Self-compassionate framing

  4_gratitude_practice:
    title: "Evening Gratitude"
    instruction: "Mindful Gratitude for Today"
    components:
      daily_gratitude:
        - "What moments are you grateful for?"
        - 2-3 specific moments (not generic)

      stoic_framework:
        - "What's in your control to appreciate?"
        - Stoic gratitude: Choices, effort, character
        - Ground in present awareness

      ui:
        - Simple, genuine prompts
        - Accessible language
        - Brief practice (2-3 minutes)

  5_tomorrow_practice:
    title: "Prepare for Tomorrow"
    instruction: "Mindful Visualization & Intention"
    components:
      mindful_visualization:
        - "Picture tomorrow calmly"
        - Gentle visualization (1-2 minutes)

      stoic_intention:
        - "What's your intention for tomorrow?"
        - Brief intention statement
        - Focus on what's in your control

      letting_go:
        - "What can you let go of tonight?"
        - Release what's not in your control
        - Peaceful transition to rest

      ui:
        - Brief, transition-oriented
        - Calming visuals
        - Sleep-compatible design

  6_lessons_practice:
    title: "Learning from Today"
    instruction: "Optional Growth Reflection"
    components:
      daily_lessons:
        - "What did today teach you?" (optional)
        - "How can you apply Stoic wisdom tomorrow?"
        - Growth-oriented learning mindset

      ui:
        - OPTIONAL: Clear skip available
        - For users seeking deeper reflection
        - Not required for completion
        - Brief (2-3 minutes)

  7_selfcompassion_practice:
    title: "Self-Compassion"
    instruction: "End with Kindness"
    components:
      mindful_selfkindness:
        - Brief self-compassion pause
        - "You're learning. This is hard."
        - Stoic self-compassion framework (oikeiôsis)

      release_judgment:
        - Release harsh self-judgment
        - Necessary for growth, not weakness
        - Genuinely compassionate tone

      ui:
        - Required practice (prevents harsh Stoicism)
        - Cannot be skipped
        - Brief (1-2 minutes)
        - Grounded in Stoic philosophy

  8_sleep_transition:
    title: "Transition to Rest"
    instruction: "Complete Your Evening Practice"
    components:
      sleep_breathing:
        - Mindful breathing for sleep
        - Progressive relaxation
        - Release day's tensions

      transition:
        - "Rest well. Tomorrow is a new practice."
        - Gentle completion
        - Return to home or sleep

      ui:
        - Calming design (no blue light spikes)
        - Sleep-compatible visuals
        - Peaceful conclusion

completion:
  button: "Complete Evening Reflection"
  theme: evening-success (#2D5016)
  summary:
    - Practice completed
    - Optional: Tomorrow's intention displayed
    - Daily streak updated

features:
  - Total time: 10-15 minutes (flexible)
  - Can pause/resume across multiple sessions
  - Offline-first with encrypted storage of reflections
  - Optional journaling integration
  - Adaptive: Shorter version when exhausted
  - Self-compassion practice REQUIRED (cannot skip)
  - Seneca's Questions and Lessons OPTIONAL
  - Sleep-compatible design (calming, low stimulation)
```

### DRD-FLOW-005: Wellness Check-Ins

**Implements**: PRD v3.0.0 Mental Wellness Monitoring
**Access**: Settings → Wellness & Safety → Wellness Check-Ins
**Status**: REPOSITIONED FOR WELLNESS APP

```yaml
feature: Optional Wellness Check-Ins
location: settings_menu (NOT exercises - less prominent)
positioning: Proportional mental wellness monitoring (not clinical screening)

check_ins:
  phq9:
    title: "Wellness Check-In: Mood & Energy"
    subtitle: "Optional self-reflection for wellness awareness"
    questions: 9 (PHQ-9 validated questions preserved)
    scoring: 0-27 scale
    wellness_levels:
      - 0-4: Feeling Well
      - 5-9: Some Challenges
      - 10-14: Notable Difficulties
      - 15-19: Significant Struggles
      - 20-27: Crisis Support Recommended

    context:
      - "This helps us support your mindfulness practice"
      - NOT framed as depression diagnosis
      - Wellness self-awareness tool

  gad7:
    title: "Wellness Check-In: Stress & Calm"
    subtitle: "Optional reflection on stress levels"
    questions: 7 (GAD-7 validated questions preserved)
    scoring: 0-21 scale
    wellness_levels:
      - 0-4: Calm & Centered
      - 5-9: Some Stress
      - 10-14: Notable Stress
      - 15-21: High Stress - Support Recommended

    context:
      - "Track your stress as part of wellness practice"
      - NOT framed as anxiety diagnosis
      - Mindfulness practice support tool

features:
  - Fully OPTIONAL (not required for app usage)
  - Question-by-question navigation (Previous/Next)
  - Progress tracking throughout
  - History storage (last 5 results, encrypted)
  - Results visualization with wellness context
  - Last taken date display
  - Gentle encouragement to retake monthly
  - Crisis resources surfaced when PHQ≥20, GAD≥15, Q9>0

safety_integration:
  - PHQ≥15: Wellness support resources offered
  - PHQ≥20: Crisis resources prominently displayed
  - GAD≥15: Stress management practices suggested
  - Q9>0: Immediate crisis resources + 988 access
  - Preventive blocking: Certain practices softened for high scores

disclaimers:
  primary: "Self-assessment tool for wellness awareness, not for diagnosis or treatment"
  context: "Being is a mindfulness wellness app, not a therapy or medical service"
  encouragement: "For clinical concerns, please consult a healthcare professional"

ui_changes_from_clinical:
  - Title: "Mental Health Assessments" → "Wellness Check-Ins"
  - Location: Exercises menu → Settings (less prominent)
  - Tone: Clinical screening → Wellness self-reflection
  - Results: Severity levels → Wellness awareness levels
  - Follow-up: Crisis intervention → Wellness resources + crisis support
```

### DRD-FLOW-006: Crisis Resources

**Implements**: PRD v3.0.0 Proportional Safety & Support
**Access**: Settings → Wellness & Safety → Crisis Resources
**Status**: REPOSITIONED FOR WELLNESS APP

```yaml
feature: Wellness & Safety Resources
positioning: Proportional safety (present but unobtrusive)
theme: Calming colors (evening-primary #4A7C59) with clear action colors
access_time: <3 seconds from any screen
disclaimer: "Being is a mindfulness wellness app, not a crisis intervention service"

sections:
  1_immediate_support:
    title: "If You Need Help Right Now"
    display: Prominent but calm (not alarm-styled)
    components:
      988_button:
        label: "988 Suicide & Crisis Lifeline"
        action: Direct call to 988
        style: Primary action button (calm green, not red)
        accessibility: VoiceOver priority

      crisis_text:
        label: "Text HOME to 741741"
        subtitle: "Crisis Text Line"
        action: Opens Messages app with pre-filled text

      emergency_call:
        label: "Call 911"
        condition: "Life-threatening emergency"
        style: Secondary action

  2_my_support_contacts:
    title: "My Support Network"
    subtitle: "People I can reach out to when I'm struggling"
    display: Editable list with gentle colors
    fields:
      - label: "Trusted Friend or Family"
        placeholder: "Name + Phone"
        action: Quick call or text
      - label: "Therapist or Counselor"
        placeholder: "Name + Phone (optional)"
      - label: "Another Support Person"
        placeholder: "Name + Phone (optional)"
    empty_state: "You can add people who support you"
    tone: Encouraging, not prescriptive

  3_coping_practices:
    title: "Coping Practices"
    subtitle: "Mindful techniques that can help when you're overwhelmed"
    display: Expandable cards with instructions
    practices:
      - name: "60-Second Breathing"
        description: "Mindful breathing to calm your nervous system"
        action: Launches breathing exercise

      - name: "5-4-3-2-1 Grounding"
        description: "Notice: 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste"
        expandable: Detailed instructions

      - name: "Mindful Movement"
        description: "Go for a walk, stretch, or move your body gently"

      - name: "Reach Out"
        description: "Call or text someone from your support network"
        action: Quick access to support contacts

    customization: Users can add their own coping practices
    tone: Practical, self-compassionate

  4_when_to_seek_help:
    title: "When to Seek Professional Support"
    display: Informational card (not alarming)
    content:
      - "Feeling overwhelmed for more than 2 weeks"
      - "Difficulty doing daily activities"
      - "Thoughts of self-harm"
      - "Significant changes in sleep, appetite, or energy"
    cta: "These are signs you might benefit from professional support"
    resources:
      - "Find a therapist: psychologytoday.com"
      - "SAMHSA National Helpline: 1-800-662-4357"

navigation:
  primary_path: Settings → Wellness & Safety (first item) → Crisis Resources
  quick_access: "<3 seconds from any screen via Settings quick-tap"
  home_screen_hint: Settings icon subtle badge (optional) "Resources available"

persistence:
  location: Encrypted local storage
  fields_saved:
    - Support contacts
    - Custom coping practices
  sync: Not synced to cloud (privacy)

accessibility:
  voiceover: "Crisis resources. Immediate support, your support network, and coping practices."
  quick_actions: 988 call accessible via VoiceOver gesture
  color_contrast: WCAG AA compliance
  font_scaling: Supports up to 200%

safety_notes:
  - NOT always-visible SOS button (proportional to wellness app)
  - Maintained <3s access requirement (safety compliance)
  - Calm presentation (reduces crisis-reinforcing UI)
  - Clear pathways to professional help
  - Integrates mindfulness practices (breathing, grounding)

integration_with_wellness_checkins:
  phq_scores:
    15-19: Gentle suggestion: "You might find our crisis resources helpful"
    20+: Clear guidance: "Please review our crisis resources and consider professional support"
  gad_scores:
    15+: Gentle suggestion: "Resources for managing overwhelming anxiety"
  q9_positive:
    action: Immediate clear guidance to crisis resources + 988
    screen: Crisis intervention screen (DRD-FLOW-007)
```

---

## Navigation Architecture

### Bottom Navigation

```yaml
nav_items: 4 total
structure:
  1_home:
    icon: Diamond (rotated square)
    color_active: morning-primary (#FF9F43)
    color_inactive: soft-black (#1C1C1C)
    
  2_exercises:
    icon: Star
    color_active: morning-primary (#FF9F43)
    color_inactive: soft-black (#1C1C1C)
    
  3_insights:
    icon: Triangle
    color_active: evening-primary (#4A7C59)
    color_inactive: soft-black (#1C1C1C)
    
  4_profile:
    icon: Brain (60% fill)
    color_active: midnight-blue (#1B2951)
    color_inactive: soft-black (#1C1C1C)

```

### Header Elements

```yaml
header:
  height: 56px
  elements:
    left: Back button (hidden on home/welcome)
    center: Screen title
    right:
      - Skip button (onboarding 2-5 only)
      - Menu icon (context-specific actions, optional)

navigation_philosophy:
  - Mindfulness-first: Calm, uncluttered headers
  - Proportional safety: Crisis resources in Settings (<3s access maintained)
  - No always-visible alarm elements (wellness app, not crisis therapy)
  - Settings always accessible from bottom nav for quick resource access
```

---

## Implementation Rationale

### Stoic Mindfulness Synthesis Framework

**Design Philosophy: Mindfulness-First with Philosophical Enrichment**

**Core Equation**:
```
Aware Wisdom = Metacognitive Awareness (mindfulness) × Philosophical Discernment (Stoicism)
```

**Why This Synthesis Works**:

1. **Mindfulness as Foundation**
   - Present-moment awareness practices (breathing, body scan, gratitude)
   - Accessible to all users regardless of philosophical interest
   - Evidence-based for mental wellness and stress reduction
   - Familiar to target market ($5.3B mindfulness app users)

2. **Stoic Philosophy as Enrichment**
   - Provides *meaning* to mindfulness practice (not just technique)
   - Dichotomy of control: Empowers agency, reduces rumination
   - Virtue framework: Guides values-aligned living
   - Classical wisdom: Depth beyond generic wellness platitudes

3. **Progressive Integration**
   - Week 1-2: Mindfulness core only (gratitude, breathing, body awareness)
   - Week 3-4: Gentle Stoic introduction (optional principle focus)
   - Week 5+: Deeper philosophical practices (Seneca's Questions, virtue reflection)
   - Always optional: Users can practice pure mindfulness or integrate philosophy

**Key Design Decisions**:

**Morning Flow Rationale** (Gratitude → Intention → Preparation → Principle → Physical):
- Gratitude first: Positive priming with Stoic "what's in your control to appreciate?"
- Intention before obstacles: Values-grounded, prevents anxious catastrophizing
- Preparation practice: Hidden when GAD≥15 (safety-first design)
- Principle focus: OPTIONAL deepening (skip always available)
- Physical grounding: Body awareness closes practice (embodied mindfulness)

**Midday Flow Rationale** (Control → Embodiment → Reappraisal → Affirmation):
- Control practice: Dichotomy of control interrupt pattern (Stoic clarity)
- Embodiment: Body-based stress release (mindfulness regulation)
- Reappraisal: Stoic reframing (not toxic positivity - realistic perspective)
- Affirmation: Grounded self-compassion (capability-focused, not cheerleading)

**Evening Flow Rationale** (8 practices with 2 optional):
- Virtue Reflection: Growth-oriented self-examination (not harsh judgment)
- Seneca's Questions: OPTIONAL classical examination for deeper practitioners
- Celebration: Acknowledge effort (Stoic gratitude for what's controllable)
- Gratitude: End-of-day appreciation practice
- Tomorrow: Intention-setting with letting go (dichotomy of control)
- Lessons: OPTIONAL learning reflection for growth mindset
- Self-Compassion: REQUIRED (prevents harsh Stoicism, ensures psychological safety)
- Sleep Transition: Mindful release into rest

**Safety-First Philosophy Integration**:
- Preparation practice hidden when GAD≥15 (prevents anxiety amplification)
- Max 2 obstacles (time-boxed, prevents catastrophizing)
- Self-compassion REQUIRED in evening (non-negotiable psychological safety)
- Crisis resources present but proportional (wellness app, not crisis app)
- Stoic content always optional (enrichment, not requirement)

**Why Not Pure MBCT or Pure Stoicism**:
- Pure MBCT: Clinical therapy framework (limits market to mental health treatment seekers)
- Pure Stoicism: Philosophy education (risks intellectual inaccessibility, lacks embodied practice)
- Synthesis: Accessible mindfulness + meaningful wisdom = mass market mental wellness with depth

---

## Progressive Disclosure Strategy (v2.0)

**Philosophy**: Gradual introduction of Stoic Mindfulness synthesis to prevent overwhelm and build sustainable practice habits.

```yaml
immediate_access:
  - All three mindfulness flows (morning, midday, evening)
  - Breathing exercises
  - Crisis resources (Settings → Wellness & Safety)
  - Wellness check-ins (optional, in Settings)

week_1_2_mindfulness_foundation:
  suggested_focus: Morning practice only
  content_exposure:
    - Core mindfulness: Gratitude, breathing, body awareness
    - Minimal Stoic content: Gentle "what's in your control?" framing
    - Principle Focus: Available but easily skipped
  frequency: 5-7 mornings per week (habit formation)
  philosophy_depth: 10-20% (primarily mindfulness practice)

week_3_4_expansion_with_stoic_introduction:
  add: Midday reset (1-2x per week to start)
  content_exposure:
    - Dichotomy of control practice introduced
    - Stoic reframing in midday flow
    - Optional principle focus in morning (can skip)
  frequency: Morning daily + Midday 1-2x
  philosophy_depth: 20-30% (optional Stoic enrichment available)

week_5_plus_full_stoic_mindfulness:
  add: Evening reflection (3-4x per week)
  content_exposure:
    - Seneca's Questions available (optional)
    - Virtue reflection introduced
    - Lessons practice available (optional)
    - Full 12 Stoic Mindfulness principles rotating
  frequency: Morning daily + Midday 2-3x + Evening 3-5x
  philosophy_depth: 30-50% (users self-select depth via optional practices)
  insights_unlock: Pattern recognition, streak tracking, progress insights

adaptive_disclosure:
  high_gad_scores:
    - Preparation practice auto-hidden (GAD≥15)
    - Emphasis on embodiment and breathing
    - Stoic content softened (less cognitive load)

  high_phq_scores:
    - Self-compassion practice emphasized
    - Celebration practice highlighted
    - Crisis resources gently surfaced

  philosophy_enthusiasts:
    - Seneca's Questions highlighted
    - Lessons practice encouraged
    - Additional Stoic principles unlocked

  mindfulness_purists:
    - All Stoic content remains optional
    - Can practice pure mindfulness indefinitely
    - No pressure to engage philosophy

customization_options:
  - Notification times per flow
  - Skip patterns remembered (if user always skips Principle Focus, adapt)
  - Preferred flow depth tracked (quick vs full versions)
  - Philosophy preference (more/less Stoic content)

onboarding_positioning:
  - Week 1: "Start with morning mindfulness"
  - Week 3: "Ready to add midday resets?"
  - Week 5: "Deepen with evening reflection"
  - Always: "Practice at your own pace"
```

---

## Technical Implementation Notes

### State Management (Zustand Stores)

```typescript
// Stoic Practice Store (app/src/stores/stoicPracticeStore.ts)
interface StoicPracticeState {
  // Morning practice data
  morningPractice: {
    gratitude: string[];
    intention: string;
    selectedVirtue?: 'wisdom' | 'courage' | 'justice' | 'temperance';
    obstacles: string[]; // max 2
    controlAwareness: { inControl: string[]; outsideControl: string[] };
    currentPrinciple: number; // 0-11 (12 principles rotating)
  };

  // Midday practice data
  middayReset: {
    controlCheck: { inControl: string; outsideControl: string };
    currentChallenge?: string;
    reframing?: string;
  };

  // Evening practice data
  eveningReflection: {
    virtueReflection: { strength: string; growth: string };
    senecaAnswers?: string[]; // optional
    celebration: string[];
    gratitude: string[];
    tomorrowIntention: string;
    lettingGo: string;
    lessons?: string; // optional
    selfCompassion: string; // required
  };

  // Wellness monitoring (optional)
  wellnessCheckins: {
    phq9: {
      answers: number[];
      score: number;
      lastTaken: Date;
      history: Array<{ score: number; date: Date }>; // last 5
    };
    gad7: {
      answers: number[];
      score: number;
      lastTaken: Date;
      history: Array<{ score: number; date: Date }>;
    };
  };

  // User values & preferences
  values: {
    selected: string[]; // 3-5 values from onboarding
    stoicAlignment: boolean; // maps to virtues or remains generic
  };

  // Progressive disclosure tracking
  onboarding: {
    weeksSinceStart: number;
    flowsUnlocked: ('morning' | 'midday' | 'evening')[];
    philosophyDepthPreference: 'minimal' | 'moderate' | 'deep';
  };

  // Practice history & streaks
  completionTracking: {
    morningStreak: number;
    middayCount: number;
    eveningStreak: number;
    lastPracticeDate: Date;
  };
}

// Crisis Resources Store (app/src/stores/crisisResourcesStore.ts)
interface CrisisResourcesState {
  supportContacts: Array<{
    name: string;
    phone: string;
    relationship: 'friend' | 'family' | 'therapist' | 'other';
  }>;
  customCopingPractices: Array<{
    name: string;
    description: string;
  }>;
}
```

### Theme Application

```typescript
// Consistent theme application per flow
const flowThemes = {
  morning: {
    primary: '#FF9F43',
    success: '#E8863A',
    background: '#FFF9F0'
  },
  midday: {
    primary: '#40B5AD',
    success: '#2C8A82',
    background: '#F0F9F8'
  },
  evening: {
    primary: '#4A7C59',
    success: '#2D5016',
    background: '#F0F4F2'
  }
};

// Component receives theme context
<Button theme="morning" variant="success">
  Complete Morning Practice
</Button>
```

### Stoic Content Management

```typescript
// 12 Stoic Mindfulness Principles (rotating weekly or user-selected)
const stoicPrinciples = [
  {
    id: 1,
    name: 'Dichotomy of Control',
    description: 'Focus on what you can influence, release what you cannot',
    practices: ['morning-preparation', 'midday-control', 'evening-lettinggo']
  },
  {
    id: 2,
    name: 'Virtue as the Highest Good',
    description: 'Character over outcomes, values over results',
    practices: ['morning-intention', 'evening-virtue']
  },
  // ... 10 more principles
];

// Adaptive philosophy delivery
const getPhilosophyDepth = (userPreference: string, weeksSinceStart: number) => {
  if (weeksSinceStart < 2) return 'minimal'; // pure mindfulness
  if (userPreference === 'minimal') return 'minimal';
  if (weeksSinceStart < 4) return 'moderate';
  return userPreference; // 'deep' available after week 5
};
```

### Safety-First Feature Flags

```typescript
// Dynamic content adaptation based on wellness scores
const shouldHidePreparationPractice = (gadScore: number) => {
  return gadScore >= 15; // hide anxiety-triggering obstacle prep
};

const shouldEmphasizeSelfCompassion = (phqScore: number) => {
  return phqScore >= 15; // emphasize for moderate+ depression
};

const shouldSurfaceCrisisResources = (
  phqScore: number,
  gadScore: number,
  q9Positive: boolean
) => {
  return phqScore >= 20 || gadScore >= 15 || q9Positive;
};
```

---

## Accessibility & Performance

```yaml
accessibility:
  - Touch targets: 44x44pt minimum
  - Contrast ratios: WCAG AA compliant
  - Text scaling: Up to 200%
  - Screen reader: Semantic HTML structure
  
performance:
  - Load time: <3 seconds
  - Animation: 60fps target
  - Local storage: All user data
  - Offline capable: Full functionality
```

---

## Future Considerations

```yaml
potential_enhancements_v2.1_plus:
  stoic_content_expansion:
    - Additional Stoic exercises library (View from Above, memento mori)
    - Classical text excerpts (Marcus Aurelius, Epictetus, Seneca)
    - Weekly Stoic principle deep-dives (educational modules)
    - Virtue tracking dashboard (optional for philosophy enthusiasts)

  mindfulness_practice_expansion:
    - Extended body scan options (10-20 min guided)
    - Loving-kindness meditation (self-compassion deepening)
    - Mindful movement practices (yoga, walking meditation)
    - Sound bath / ambient soundscapes for practices

  insights_and_analytics:
    - Weekly practice summary (completions, streaks, patterns)
    - Virtue alignment tracking (for those mapping values to virtues)
    - Wellness trends visualization (PHQ/GAD over time)
    - Philosophy depth tracking (engagement with Stoic content)

  community_and_sharing:
    - Export practice journal (privacy-preserving)
    - Share progress with accountability partner
    - Wellness check-in history export (for therapist sharing)
    - Anonymous community practice challenges (optional)

  advanced_personalization:
    - Custom practice sequences (user-designed flows)
    - Voice-guided practices (accessibility + convenience)
    - Practice reminders with adaptive timing (ML-based)
    - Philosophy depth auto-adjustment (based on engagement)

maintained_design_principles:
  - Mindfulness-first positioning (never philosophy-first)
  - All Stoic content remains optional (no forced philosophy)
  - Core flows stay streamlined (8-15 min max)
  - Progressive disclosure respected (no overwhelm)
  - Proportional safety (wellness app, not crisis therapy)
  - Offline-first architecture preserved
  - Privacy-first data handling (encrypted, local-first)
  - WCAG 2.1 AA accessibility maintained
```