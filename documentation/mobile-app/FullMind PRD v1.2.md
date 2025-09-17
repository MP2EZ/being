# PRD: FullMind - Comprehensive MBCT Companion App

---

## Document Metadata

```yaml
document:
  type: PRD
  version: 1.2.0
  status: PRODUCTION-ALIGNED
  created: 2025-08-28
  updated: 2025-09-03
  product: FullMind
  platform: iOS/Android Mobile
  domain: Mental Health & MBCT
  positioning: "Complete MBCT practice for real life"
  
changes_from_v1.1:
  - Maintained MBCT-comprehensive positioning
  - Documented optimization (not simplification)
  - Added implemented features (assessments, crisis plan)
  - Updated metrics for optimized flows
  - Added Phase 2 weekly exercises roadmap
```

---

## Executive Summary

**Problem**: Individuals needing MBCT (Mindfulness-Based Cognitive Therapy) lack accessible, evidence-based daily support. Traditional 8-week MBCT programs require 2-hour weekly sessions plus 45-minute daily homework—unsustainable for most people's lives.

**Solution**: FullMind delivers comprehensive MBCT practice through optimized daily touchpoints totaling 15 minutes. All essential MBCT techniques are preserved while adapting format for self-guided daily use. This is the first app to offer complete MBCT protocol coverage in a sustainable daily format.

**Unique Value**: Clinical authenticity with practical sustainability—every core MBCT intervention, engineered for real-world daily practice.

**Current Status**: v1.7 prototype complete with all essential daily practices, assessments, and crisis support.

---

## Product Positioning

### Primary Positioning

```yaml
tagline: "Complete MBCT practice for real life"

elevator_pitch: |
  FullMind is the first mobile app to deliver comprehensive 
  MBCT interventions through optimized daily practices. 
  Every essential technique from the clinical protocol, 
  reimagined for 15-minute daily engagement.

key_differentiators:
  clinical_authenticity:
    - All core MBCT components included
    - Evidence-based sequencing maintained
    - Therapeutic mechanisms preserved
    
  practical_optimization:
    - 8-week course condensed to daily cycles
    - 45-minute practices optimized to 5-minute flows
    - Self-guided vs therapist-dependent
    
  comprehensive_coverage:
    - Morning body awareness practices
    - Midday breathing space interventions
    - Evening cognitive processing
    - Crisis prevention planning
    - Clinical assessments integrated
```

### NOT Positioning As

```yaml
avoid_terms:
  - "Simplified MBCT" (implies less effective)
  - "MBCT-inspired" (suggests loose interpretation)
  - "Basic mindfulness" (undervalues clinical foundation)
  - "Meditation app" (too generic, misses MBCT specificity)
  - "Therapy replacement" (maintains ethical boundaries)
```

---

## Core Requirements

### PRD-MORNING-002: Optimized Morning Practice

```yaml
epic: Daily MBCT Practices
story: As a user, I want comprehensive morning MBCT practice in 5 minutes
positioning: "Full MBCT morning protocol, optimized for daily sustainability"
priority: P0
effort: L
value: CRITICAL
status: IMPLEMENTED ✅

mbct_components:
  body_scan: Step 1 - Foundation of mindfulness
  emotion_recognition: Step 2 - Affect awareness
  thought_observation: Step 3 - Decentering practice
  metrics: Step 4 - Mood monitoring
  values_intention: Step 5 - Being mode activation
  dream_notation: Step 6 - Subconscious processing

optimization_rationale:
  from: 45-minute body scan + journaling
  to: 5-minute comprehensive practice
  preserved: All key therapeutic mechanisms
  
flow_steps: 6 optimized steps
completion_time: 3-5 minutes

acceptance_criteria:
  - All MBCT morning elements present
  - 85% completion rate achieved
  - Decentering mechanism functional
  - Values integration active

metrics:
  - 85% daily completion (up from 75%)
  - 4.5/5 therapeutic value rating
  - 3-5 minute average completion
```

### PRD-MIDDAY-001: 3-Minute Breathing Space

```yaml
epic: MBCT Signature Interventions
story: As a user, I need the classic MBCT breathing space exactly as designed
positioning: "Authentic 3-minute breathing space, multiple daily opportunities"
priority: P0
effort: M
value: CRITICAL
status: IMPLEMENTED ✅

mbct_authenticity:
  step_1_awareness: "What's here now?" (1 minute)
  step_2_gathering: "Coming to the breath" (1 minute)
  step_3_expanding: "Expanding awareness" (1 minute)
  
components:
  awareness:
    - Quick emotion check
    - Body tension notice
    
  gathering:
    - Animated breath guide
    - 10-breath anchor
    
  expanding:
    - Pleasant event recognition
    - Unpleasant event acknowledgment
    - Needs identification

therapeutic_function:
  - Interrupts automatic pilot
  - Breaks rumination cycles
  - Activates approach vs avoidance
  - Creates pause for choice

acceptance_criteria:
  - Exactly 3-minute structure
  - All three stages present
  - Pleasant/unpleasant balance
  - Can complete multiple daily

metrics:
  - 70% daily completion
  - 2.5 average uses per day
  - 90% report rumination interruption
```

### PRD-EVENING-002: Optimized Evening Processing

```yaml
epic: Daily MBCT Practices
story: As a user, I want complete MBCT evening practice without fatigue
positioning: "Full cognitive and emotional processing, sustainably designed"
priority: P0
effort: L
value: CRITICAL
status: IMPLEMENTED ✅

mbct_components:
  day_review: Non-judgmental observation
  pleasant_unpleasant: Classic MBCT homework
  thought_patterns: Cognitive awareness training
  tomorrow_prep: Approach mode activation

optimization_from_8_steps_to_4:
  preserved:
    - Pleasant/unpleasant events
    - Cognitive pattern recognition
    - Values reflection
    - Non-judgmental stance
    
  consolidated:
    - Wins into pleasant events
    - Gratitude into general positives
    - Multiple values checks into single slider
    
  future_optional:
    - Detailed gratitude practice
    - Wellness habit tracking
    - Extended journaling

completion_time: 4-5 minutes

metrics:
  - 70% completion rate (up from 65%)
  - 4.6/5 value rating
  - 85% report increased awareness
```

### PRD-ASSESS-001: Integrated Clinical Assessments

```yaml
epic: Clinical Screening Tools
story: As a user, I can track my mental health with validated instruments
positioning: "Hospital-grade assessments for personal tracking"
priority: P0
effort: M
value: HIGH
status: IMPLEMENTED ✅

assessments:
  phq9:
    name: PHQ-9 Depression Scale
    questions: 9
    validity: Clinical standard
    frequency: Weekly recommended
    
  gad7:
    name: GAD-7 Anxiety Scale  
    questions: 7
    validity: Clinical standard
    frequency: Weekly recommended

features:
  - Question-by-question flow
  - History tracking (last 5)
  - Severity interpretation
  - Progress visualization
  - Standalone or onboarding

integration:
    - Accessible from Exercises
    - Optional weekly reminders
    - Exportable for therapy

metrics:
  - 60% monthly completion
  - 80% find tracking valuable
  - 40% share with therapist
```

### PRD-CRISIS-001: Comprehensive Crisis Support

```yaml
epic: Safety Features
story: As a user, I have 24/7 access to my crisis prevention plan
positioning: "Professional-grade crisis planning, always accessible"
priority: P0
effort: M
value: CRITICAL
status: IMPLEMENTED ✅

components:
  warning_signs:
    - Customizable triggers list
    - Early warning system
    - Pattern recognition
    
  coping_strategies:
    - Evidence-based techniques
    - Personalized effectiveness
    - Quick access options
    
  support_network:
    - Emergency contacts
    - Therapist information
    - Crisis hotlines (988)
    
  safety_planning:
    - Means restriction reminders
    - Safe environment tips
    - Recovery strategies

access_points:
  - SOS button (header, always visible)
  - Profile → Settings → Crisis Plan
  - Automated prompt at risk indicators

metrics:
  - 40% create crisis plan
  - 100% SOS button visibility
  - <3 taps to emergency contact
```

---

## Feature Roadmap

### Phase 1: Daily Practice Foundation (COMPLETE ✅)

```yaml
status: IMPLEMENTED in v1.7
features:
  - Optimized daily MBCT practices (Morning/Midday/Evening)
  - Clinical assessments (PHQ-9, GAD-7)
  - Crisis support system
  - Values-based personalization
  - Basic progress tracking
  
achievement: "Complete MBCT daily protocol in sustainable format"
```

### Phase 2: Weekly Depth Practices (Q1 2025)

```yaml
status: PLANNED
positioning: "Add traditional depth to daily practice"

weekly_exercises:
  body_scan_extended:
    duration: 20-45 minutes
    options: [guided_audio, self_paced]
    frequency: Weekly recommendation
    
  sitting_meditation:
    duration: 20-40 minutes
    progressions: [breath, body, sounds, thoughts, choice-less]
    guidance: Progressive difficulty
    
  mindful_movement:
    duration: 30 minutes
    types: [yoga, walking, stretching]
    instruction: Video guidance
    
  cognitive_exercises:
    pleasant_events_calendar:
      format: Weekly review with patterns
      insights: Automated analysis
      
    thought_record_7column:
      traditional: Full CBT thought record
      guidance: Step-by-step completion
      
    values_clarification:
      exercises: [card_sort, life_compass, obituary]
      duration: 30-60 minutes each

inquiry_practices:
  weekly_themes:
    week_1: "Autopilot awareness"
    week_2: "Dealing with barriers"
    week_3: "Mindfulness of breath and body"
    week_4: "Staying present"
    week_5: "Allowing and letting be"
    week_6: "Thoughts are not facts"
    week_7: "How can I best take care of myself?"
    week_8: "Maintaining and extending"
    
  reflection_prompts:
    format: Deep journaling exercises
    frequency: 2-3 per week
    time: 15-30 minutes

group_features:
  weekly_challenges:
    anonymous: Privacy preserved
    themes: MBCT-aligned
    duration: 7-day cycles
    
  practice_partners:
    opt_in: User controlled
    matching: By timezone and goals
    interaction: Encouragement only

metrics:
  - 40% engage weekly exercises
  - 60% complete one monthly
  - 85% report deeper insight
```

### Phase 3: Therapeutic Integration (Q2 2025)

```yaml
status: FUTURE
positioning: "Bridge self-practice with professional care"

therapist_collaboration:
  report_generation:
    - Assessment history
    - Pattern analysis
    - Crisis plan review
    - Progress summary
    
  homework_integration:
    - Therapist assigns specific practices
    - Completion tracking
    - Notes sharing
    
  session_preparation:
    - Pre-session check-in
    - Topic identification
    - Goal setting

advanced_insights:
  ml_pattern_detection:
    - Trigger identification
    - Prediction modeling
    - Personalized interventions
    
  correlation_analysis:
    - Sleep/mood/anxiety relationships
    - Values/wellbeing alignment
    - Practice effectiveness

community_support:
  moderated_groups:
    - Topic-specific (anxiety, depression, stress)
    - MBCT-graduate groups
    - Peer support circles
    
  expert_content:
    - Weekly MBCT teacher videos
    - Live Q&A sessions
    - Guided group meditations

metrics:
  - 30% therapist integration
  - 50% use advanced insights
  - 25% join community features
```

### Phase 4: Complete MBCT Curriculum (Q3-Q4 2025)

```yaml
status: VISION
positioning: "Full 8-week MBCT course, self-paced"

structured_program:
  8_week_course:
    format: Self-paced with weekly unlocks
    content: Full MBCT protocol
    support: AI guidance + optional groups
    certification: Completion certificate
    
  refresher_courses:
    format: 4-week boosters
    timing: Quarterly offerings
    focus: Specific skills reinforcement
    
  specialty_tracks:
    MBCT_for_anxiety: Adapted protocol
    MBCT_for_chronic_pain: Body focus
    MBCT_for_addiction: Craving management

measurement:
  validated_scales:
    - FFMQ (Five Facet Mindfulness)
    - MAAS (Mindful Attention Awareness)
    - RRS (Rumination Response Scale)
    
  outcome_tracking:
    - Relapse prevention rates
    - Quality of life measures
    - Functional improvement
```

---

## Success Metrics

### North Star Metric
**Sustainable Daily MBCT Practice**: % of users completing at least one MBCT practice daily for 30+ days

### Key Metrics

```yaml
engagement:
  daily_active_users: 70% (up from 60%)
  streak_median: 21 days (up from 14)
  practices_per_day: 2.5 average
  
completion_rates:
  morning: 85% (optimized from 75%)
  midday: 70% (new metric)
  evening: 70% (optimized from 65%)
  weekly_exercise: 40% (Phase 2)
  
therapeutic_value:
  mbct_authenticity: 95% therapist approval
  rumination_reduction: 60% report decrease
  awareness_increase: 80% report improvement
  crisis_plan_created: 40% of users
  
clinical_outcomes:
  phq9_improvement: 30% reduction at 30 days
  gad7_improvement: 25% reduction at 30 days
  relapse_prevention: 40% reduction (Phase 4)
  
retention:
  d7: 85%
  d30: 75%
  d90: 60%
  annual: 40%
```

---

## Technical Requirements

```yaml
platform_requirements:
  ios_minimum: 14.0
  android_minimum: API 26 (8.0)
  
data_architecture:
  storage: Local first, optional sync
  privacy: HIPAA compliant capable
  export: PDF/CSV for clinical use
  
performance:
  load_time: <3 seconds
  animation: 60fps
  offline: Full functionality
  size: <100MB initial
  
accessibility:
  wcag: AA compliance minimum
  voice: Full voice-over support
  scaling: 200% text support
  motor: Large touch targets
```

---

## Competitive Positioning

```yaml
vs_headspace_calm:
  our_advantage: "Clinical MBCT protocol, not generic meditation"
  their_advantage: "Broader content library"
  
vs_sanvello_youper:
  our_advantage: "Complete MBCT practices, not just mood tracking"
  their_advantage: "Insurance coverage"
  
vs_traditional_therapy:
  our_advantage: "24/7 availability, daily practice"
  their_limitation: "Not a replacement, complement"
  
unique_position: "Only app with complete MBCT protocol optimized for daily life"
```

---

## Implementation References

```yaml
design_docs:
  - DRD v1.3: Production-aligned specifications
  - Design Library v1.1: Component system
  - Prototype v1.7: Working implementation
  
status_tracking:
  implemented: 
    - Core daily practices (optimized)
    - Clinical assessments
    - Crisis support
    - Values integration
    
  upcoming:
    - Weekly depth practices
    - Pattern insights
    - Therapist integration
    
  future:
    - Full 8-week course
    - Community features
    - Advanced ML insights
```

---

## Product Principles

### Optimization, Not Reduction

```yaml
principle: "Every MBCT element preserved, format optimized"

examples:
  body_scan:
    traditional: 45 minutes lying down
    optimized: 2 minutes, areas selection
    preserved: Awareness, non-judgment
    
  thought_records:
    traditional: 7-column worksheet
    optimized: Quick pattern selection
    preserved: Recognition, not rumination
    
  breathing_space:
    traditional: 3 minutes exact
    optimized: No change needed - perfect as designed
```

### Progressive Depth

```yaml
principle: "Start with daily habits, add depth progressively"

progression:
  week_1: Daily practices only
  week_2-3: Add midday resets
  week_4+: Evening reflections
  month_2: Weekly exercises unlock
  month_3: Full curriculum available
```

### Clinical Integrity

```yaml
principle: "Never compromise therapeutic mechanisms for convenience"

non_negotiables:
  - Body awareness before cognitive work
  - Pleasant AND unpleasant balance
  - Non-judgmental framing throughout
  - Decentering practices maintained
  - Values integration preserved
```

---

## Summary

FullMind v1.2 delivers **comprehensive MBCT practice** through optimized daily interventions. Every essential therapeutic mechanism is preserved while adapting format for sustainable daily engagement. The app provides complete protocol coverage today with a roadmap to add traditional depth practices, making it the most complete MBCT companion available.

**Key Achievement**: First app to successfully translate the full MBCT protocol into sustainable daily practice without losing therapeutic integrity.

**Future Vision**: Complete MBCT ecosystem from daily practices to full 8-week courses, bridging self-care and clinical care.
