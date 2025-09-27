# DRD: Being. - Design Requirements Document

## Mobile App UX/UI Specifications - Production Implementation

---

## Document Metadata

```yaml
document:
  type: DRD
  version: 1.3.0
  status: PRODUCTION-ALIGNED
  created: 2025-08-28
  updated: 2025-09-03
  product: Being.
  references: [Design Library v1.1.0]
  platform: iOS/Android Mobile
  domain: Mental Health UX Design
  
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

### DRD-FLOW-001: Therapeutic Onboarding

**Implements**: PRD-ONBOARD-001  
**Status**: IMPLEMENTED ✅

```yaml
screens: 7 total
flow:
  1_welcome: 
    - Animated BrainIcon (60% fill)
    - Feature pills display
    - Single CTA: "Begin Journey"
    
  2_phq9_assessment:
    - Dynamic question display
    - 9 questions, radio selection
    - Previous/Next navigation
    - Skip option available
    
  3_gad7_assessment:
    - 7 questions format
    - Identical UI to PHQ-9
    - Skip option available
    
  4_values_selection:
    - 15 values grid (2 columns)
    - Requires 3-5 selections
    - Live counter display
    - Theme rotation on selection
    
  5_notifications:
    - Three time pickers (Morning/Midday/Evening)
    - Visual theme coding per check-in
    - Master toggle for all notifications
    - "Set up later" option
    
  6_privacy_consent:
    - Four privacy principles
    - Required checkbox consent
    - No skip option (legal requirement)
    
  7_celebration:
    - Success animation
    - Selected values display
    - Two CTAs: Start morning or explore

features:
  - Skip available on screens 2-5
  - Progress dots throughout
  - Risk level calculation stored
  - Values persist to all flows
```

### DRD-FLOW-002: Morning Check-In

**Implements**: PRD-MORNING-001  
**Theme**: `morning` throughout  

```yaml
screens: 6 total
time_estimate: 5-7 minutes

flow:
  1_body_scan:
    instruction: "Notice Your Body"
    component: Body area grid (2x5)
    areas: [Head, Neck, Shoulders, Chest, Upper Back, 
            Lower Back, Stomach, Hips, Legs, Feet]
    interaction: Toggle selection
    
  2_emotion_recognition:
    instruction: "What Emotions Are Here?"
    component: Emotion grid (2x4)
    emotions: [Joy, Sadness, Anxiety, Calm, 
               Anger, Gratitude, Fear, Hope]
    selection: Multiple allowed
    
  3_thought_observation:
    instruction: "What Thoughts Are Visiting?"
    component: Floating thought bubbles
    thoughts:
      - "I have so much to do"
      - "What if I fail?"
      - "I'm not good enough"
      - "Today will be difficult"
    interaction: Tap to acknowledge (fade effect)
    
  4_physical_metrics:
    instruction: "How Are You Feeling?"
    sliders:
      - Sleep Quality (1-10, default: 7)
      - Energy Level (1-10, default: 6)
      - Anxiety Level (1-10, default: 4)
    display: Visual fill bars with values
    
  5_values_intention:
    instruction: "What Matters Most Today?"
    components:
      - Single value selection (6 options)
      - Intention textarea
    prompt: "Today I will..."
    
  6_dream_journal: # Renamed from abstract concept
    instruction: "Dream Journal"
    component: Large textarea
    prompt: "Describe any dreams you remember..."
    info_box: Educational note about patterns
    
completion:
  button: "Complete Morning Check-in"
  theme: morning-success
```

### DRD-FLOW-003: Midday Reset

**Implements**: MBCT 3-Minute Breathing Space  
**Theme**: `midday` throughout  

```yaml
screens: 3 total
time_estimate: 3 minutes exact

flow:
  1_awareness:
    duration: 1_minute
    instruction: "What's here right now?"
    component: Emotion selection grid
    emotions: [Stressed, Calm, Tired, Focused, Anxious, Content]
    selection: Multiple allowed
    
  2_gathering:
    duration: 1_minute
    instruction: "Focus on your breath"
    component: Animated breathing circle
    animation: 8-second breathe cycle
    text: "Follow the circle as it expands and contracts"
    
  3_expanding:
    duration: 1_minute
    instruction: "Widen your awareness"
    components:
      pleasant_event:
        input: Single text field
        prompt: "One pleasant thing today"
        
      unpleasant_event:
        input: Single text field
        prompt: "One difficult thing today"
        
      needs_check:
        grid: [Rest, Movement, Connection, Focus, Compassion, Space]
        selection: Single choice
        
completion:
  button: "Complete Midday Reset"
  theme: midday-success
  
```

### DRD-FLOW-004: Evening Reflection

**Implements**: PRD-EVENING-001  
**Theme**: `evening` throughout  

```yaml
screens: 4 total
time_estimate: 5-6 minutes

flow:
  1_day_review:
    instruction: "How Was Your Day?"
    sliders:
      - Overall Mood (1-10, default: 7)
      - Energy Management (1-10, default: 6)
      - Values Alignment (1-10, default: 8)
    display: Theme-colored fill bars
    
  2_pleasant_unpleasant:
    instruction: "Notice Without Judging"
    pleasant_section:
      prompt: "What brought joy today?"
      inputs: 2 text fields
      
    unpleasant_section:
      prompt: "What was difficult?"
      inputs: 2 text fields
      
    learning:
      prompt: "What did you learn?"
      input: Textarea
      
  3_thought_patterns:
    instruction: "Did Any Patterns Visit Today?"
    patterns: [Catastrophizing, All-or-Nothing, Mind Reading,
               Should Statements, Personalization, Overgeneralization]
    selection: Multiple allowed
    
  4_tomorrow_prep:
    instruction: "Prepare for Tomorrow"
    components:
      reminder:
        prompt: "One thing to remember"
        input: Textarea
        
      intention:
        prompt: "Tomorrow's intention"
        options: [Rest Well, Be Gentle, Stay Present, Trust Yourself]
        selection: Single choice
        
completion:
  button: "Complete Evening Reflection"
  theme: evening-success
```

### DRD-FLOW-005: Standalone Assessments

**Implements**: Clinical screening tools  
**Access**: Exercises → Mental Health Assessments  

```yaml
feature: Mental Health Assessments
location: exercises_menu

assessments:
  phq9:
    title: "PHQ-9 Depression Scale"
    questions: 9
    scoring: 0-27 scale
    severity_levels:
      - 0-4: Minimal
      - 5-9: Mild
      - 10-14: Moderate
      - 15-19: Moderately Severe
      - 20-27: Severe
      
  gad7:
    title: "GAD-7 Anxiety Scale"
    questions: 7
    scoring: 0-21 scale
    severity_levels:
      - 0-4: Minimal
      - 5-9: Mild
      - 10-14: Moderate
      - 15-21: Severe

features:
  - Question-by-question navigation
  - Previous/Next buttons
  - Progress tracking
  - History storage (last 5 results)
  - Results visualization
  - Last taken date display
  
disclaimer: "Self-assessment tools, not diagnostic instruments"
```

### DRD-FLOW-006: Crisis Plan Builder

**Implements**: Safety planning  
**Access**: SOS button (header) or Profile → Settings  

```yaml
feature: Crisis Prevention Plan
theme: error/warning colors

components:
  warning_signs:
    display: List with red accent border
    examples:
      - Isolating from others
      - Sleep disruption
      - Negative self-talk increases
    action: Add custom signs
    
  coping_strategies:
    display: Bulleted list
    defaults:
      - Take 10 deep breaths
      - Call support person
      - Grounding techniques (5-4-3-2-1)
      - Go for a walk
      
  emergency_contacts:
    fields:
      - Therapist (name + number)
      - Crisis Line (988 default)
      - Trusted Friend (name + number)
      
persistence: Local storage
access: Always available via SOS button
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
      - SOS button (always visible except onboarding)
      
sos_button:
  style: Red background (#E8A5A5)
  position: Header right
  access: All screens except onboarding
  action: Opens Crisis Plan
```

---

## Implementation Rationale

### MBCT Alignment Validation

**Pleasant/Unpleasant Events Dual Implementation**:
- **Midday**: Present-moment anchoring, interrupts rumination
- **Evening**: Comprehensive review with learning integration
- **Benefit**: Different cognitive functions, builds awareness habit
- **Not duplicative**: Serves distinct therapeutic purposes

---

## Progressive Disclosure Strategy (v1.7)

```yaml
immediate_access:
  - All check-in flows
  - Basic exercises
  - Crisis plan
  - Assessments
  
week_1:
  suggested_focus: Morning check-in only
  skip_available: Yes for all optional steps
  
week_2:
  add: Midday reset
  frequency: 1-2 times to start
  
week_3:
  add: Evening reflection
  frequency: 3-4 times per week
  
week_4_plus:
  full_engagement: All three check-ins
  insights_unlock: Pattern recognition active
  
customization_options:
  - Notification times
  - Skip patterns remembered
  - Preferred check-ins tracked
```

---

## Technical Implementation Notes

### State Management

```javascript
// Assessment state persistence
const assessmentState = {
  phq9: {
    answers: Array(9).fill(null),
    currentQuestion: 0,
    history: [] // Last 5 results
  },
  gad7: {
    answers: Array(7).fill(null),
    currentQuestion: 0,
    history: []
  }
};

// Values persistence across flows
const userValues = {
  selected: ['Connection', 'Growth', 'Compassion'],
  morning_focus: null,
  evening_alignment: 0
};
```

### Theme Application

```javascript
// Consistent theme application per flow
const flowThemes = {
  morning: ['#FF9F43', '#E8863A'],
  midday: ['#40B5AD', '#2C8A82'],
  evening: ['#4A7C59', '#2D5016']
};

// Component receives theme context
<Button theme="morning" variant="success">
  Complete Morning Check-in
</Button>
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
potential_enhancements:
  - Micro-dose options for midday
  - Gratitude practice (optional module)
  - Weekly insights dashboard
  - Export assessment history
  - Therapist sharing capability
  
maintained_simplicity:
  - Core flows remain streamlined
  - Optional features clearly marked
  - Progressive disclosure respected
```