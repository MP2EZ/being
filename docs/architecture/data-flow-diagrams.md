# FullMind Data Flow Architecture Diagrams

## Document Overview

**Version**: 1.0  
**Status**: Production Implementation (v1.7)  
**Last Updated**: 2025-01-27  
**Architecture Context**: Enhanced architect coordination with document intelligence optimization

## Executive Summary

This document provides comprehensive data flow diagrams for FullMind's clinical-grade MBCT mental health application. Based on our multi-agent coordination analysis and document index optimization, these diagrams illustrate how therapeutic data moves through the system while maintaining privacy, security, and crisis intervention capabilities.

### Key Data Flow Principles
1. **Privacy-First Flows**: All sensitive data remains local with user control
2. **Crisis-Optimized Paths**: Emergency data accessible within <200ms
3. **Offline-First Design**: All flows work without network dependency
4. **Clinical Accuracy**: Assessment data flows maintain 100% scoring integrity
5. **Encryption in Transit**: Sensitive data encrypted throughout local flows

## User Journey Data Flow Diagrams

### 1. Onboarding and Initial Setup Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        New User Onboarding Data Flow                             │
└─────────────────────────────────────────────────────────────────────────────────┘

   App Launch (First Time)
         │
         ▼
   ┌─────────────────┐
   │  Welcome Screen │
   │                 │
   │ • Legal notices │
   │ • Privacy terms │
   │ • App purpose   │
   └─────────────────┘
         │
         ▼ [User Accepts]
   ┌─────────────────┐
   │  Values         │     ┌─────────────────────────────────────┐
   │  Selection      │────▶│ Store to AsyncStorage               │
   │                 │     │                                     │
   │ • 3-5 core      │     │ Key: @fullmind_user_v1              │
   │   values chosen │     │ Data: {                             │
   │ • MBCT-aligned  │     │   selected_values: string[],        │
   └─────────────────┘     │   onboarding_step: 'values_complete'│
         │                 │ }                                   │
         ▼                 └─────────────────────────────────────┘
   ┌─────────────────┐
   │  Initial        │     ┌─────────────────────────────────────┐
   │  Assessment     │────▶│ Encrypt and Store Assessment        │
   │  (PHQ-9/GAD-7)  │     │                                     │
   │                 │     │ 1. Validate responses (9/7 answers) │
   │ • Clinical      │     │ 2. Calculate score (100% accuracy)  │
   │   baseline      │     │ 3. Check crisis thresholds          │
   │ • Crisis check  │     │ 4. Encrypt with AES-256-GCM        │
   └─────────────────┘     │ 5. Store to encrypted key           │
         │                 └─────────────────────────────────────┘
         ▼                               │
   ┌─────────────────┐                   ▼
   │  Crisis         │     ┌─────────────────────────────────────┐
   │  Detection?     │────▶│ If Crisis Detected (PHQ≥20/GAD≥15): │
   │                 │     │                                     │
   │ PHQ-9 ≥20 OR    │     │ 1. Display crisis resources        │
   │ GAD-7 ≥15 OR    │     │ 2. Offer crisis plan creation      │
   │ Suicidal ideation│     │ 3. Provide emergency contacts      │
   └─────────────────┘     │ 4. Log crisis detection event      │
         │                 └─────────────────────────────────────┘
         ▼                               │
   ┌─────────────────┐                   ▼
   │  Notification   │     ┌─────────────────────────────────────┐
   │  Preferences    │────▶│ Store Notification Settings         │
   │                 │     │                                     │
   │ • Morning time  │     │ Update user profile:                │
   │ • Midday time   │     │ {                                   │
   │ • Evening time  │     │   notification_preferences: {       │
   │ • Permission    │     │     morning: "08:00",               │
   └─────────────────┘     │     midday: "13:00",                │
         │                 │     evening: "20:00",               │
         ▼                 │     enabled: boolean                │
   ┌─────────────────┐     │   },                                │
   │  Onboarding     │     │   onboarding_completed: true        │
   │  Complete       │     │ }                                   │
   │                 │     └─────────────────────────────────────┘
   │ • Navigate to   │
   │   main app      │
   │ • Setup complete│
   └─────────────────┘

Data Security Notes:
- User preferences stored unencrypted (non-sensitive)
- Assessment data encrypted with AES-256-GCM
- Crisis detection happens locally before storage
- No network calls during onboarding flow
```

### 2. Daily Check-in Flow (Morning/Midday/Evening)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     Daily MBCT Check-in Data Flow                               │
└─────────────────────────────────────────────────────────────────────────────────┘

Check-in Trigger
(Notification/Manual)
         │
         ▼
   ┌─────────────────┐
   │  Determine      │     ┌─────────────────────────────────────┐
   │  Check-in Type  │────▶│ Time-based Flow Selection           │
   │                 │     │                                     │
   │ Current time:   │     │ if (5-12): Morning Check-in         │
   │ • 5-12: Morning │     │ if (12-18): Midday Reset            │
   │ • 12-18: Midday │     │ if (18-24): Evening Reflection      │
   │ • 18-24: Evening│     │ User can override time detection    │
   └─────────────────┘     └─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              MORNING CHECK-IN FLOW                              │
└─────────────────────────────────────────────────────────────────────────────────┘

   ┌─────────────────┐     ┌─────────────────────────────────────┐
   │ Step 1:         │────▶│ Body Awareness Data Collection      │
   │ Body Awareness  │     │                                     │
   │                 │     │ User selects body areas:            │
   │ • Grid selection│     │ areas = ['head', 'chest', 'arms']   │
   │ • Tension areas │     │ tension_level = slider_value        │
   │ • Mindful scan  │     │ awareness_quality = rating          │
   └─────────────────┘     └─────────────────────────────────────┘
         │                               │
         ▼                               ▼
   ┌─────────────────┐     ┌─────────────────────────────────────┐
   │ Step 2:         │────▶│ Emotional Awareness Data            │
   │ Emotion Check   │     │                                     │
   │                 │     │ selected_emotions = multiselect     │
   │ • Current state │     │ emotion_intensity = slider          │
   │ • Intensity     │     │ acceptance_level = rating           │
   │ • Acceptance    │     │                                     │
   └─────────────────┘     └─────────────────────────────────────┘
         │                               │
         ▼                               ▼
   ┌─────────────────┐     ┌─────────────────────────────────────┐
   │ Step 3:         │────▶│ Thought Pattern Recognition         │
   │ Thought         │     │                                     │
   │ Awareness       │     │ thought_patterns = selected_items   │
   │                 │     │ rumination_level = slider           │
   │ • Pattern ID    │     │ decentering_practiced = boolean     │
   │ • Rumination    │     │                                     │
   │ • Decentering   │     │                                     │
   └─────────────────┘     └─────────────────────────────────────┘
         │                               │
         ▼                               ▼
   ┌─────────────────┐     ┌─────────────────────────────────────┐
   │ Step 4:         │────▶│ Quantitative Mood Metrics          │
   │ Mood Metrics    │     │                                     │
   │                 │     │ sleep_quality = slider_value        │
   │ • Sleep quality │     │ energy_level = slider_value         │
   │ • Energy level  │     │ anxiety_level = slider_value        │
   │ • Anxiety level │     │                                     │
   └─────────────────┘     └─────────────────────────────────────┘
         │                               │
         ▼                               ▼
   ┌─────────────────┐     ┌─────────────────────────────────────┐
   │ Step 5:         │────▶│ Values and Intention Setting        │
   │ Values          │     │                                     │
   │ Intention       │     │ selected_value = from_user_values   │
   │                 │     │ daily_intention = text_input        │
   │ • Core value    │     │ commitment_level = slider           │
   │ • Daily intent  │     │                                     │
   │ • Commitment    │     │                                     │
   └─────────────────┘     └─────────────────────────────────────┘
         │                               │
         ▼                               ▼
   ┌─────────────────┐     ┌─────────────────────────────────────┐
   │ Step 6:         │────▶│ Dream and Sleep Processing          │
   │ Dream Notation  │     │                                     │
   │                 │     │ dream_content = text_area           │
   │ • Dream recall  │     │ dream_emotions = selected_emotions  │
   │ • Emotions      │     │ sleep_observations = notes          │
   │ • Insights      │     │                                     │
   └─────────────────┘     └─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DATA ASSEMBLY AND STORAGE                             │
└─────────────────────────────────────────────────────────────────────────────────┘

   ┌─────────────────┐     ┌─────────────────────────────────────┐
   │ Assemble        │────▶│ Create Morning Check-in Object      │
   │ Check-in Data   │     │                                     │
   │                 │     │ morning_checkin = {                 │
   │ All collected   │     │   id: uuid(),                       │
   │ data combined   │     │   type: 'morning',                  │
   │ into structured │     │   started_at: ISO8601,              │
   │ object          │     │   completed_at: ISO8601,            │
   └─────────────────┘     │   morning_data: {                   │
         │                 │     body_awareness: {...},          │
         ▼                 │     emotional_awareness: {...},     │
   ┌─────────────────┐     │     cognitive_awareness: {...},     │
   │ Validate Data   │     │     mood_metrics: {...},            │
   │                 │     │     values_intention: {...},        │
   │ • Required      │     │     dream_notation: {...}           │
   │   fields present│     │   }                                 │
   │ • Data types    │     │ }                                   │
   │   correct       │     └─────────────────────────────────────┘
   │ • Value ranges  │               │
   └─────────────────┘               ▼
         │               ┌─────────────────────────────────────┐
         ▼               │ Encrypt and Store Check-in          │
   ┌─────────────────┐   │                                     │
   │ Encrypt Data    │──▶│ 1. Serialize to JSON                │
   │                 │   │ 2. Encrypt with AES-256-GCM        │
   │ AES-256-GCM     │   │ 3. Get existing encrypted check-ins│
   │ encryption      │   │ 4. Append new check-in              │
   │ with device key │   │ 5. Apply 90-day retention policy    │
   └─────────────────┘   │ 6. Store to @fullmind_checkins_v1   │
         │               └─────────────────────────────────────┘
         ▼
   ┌─────────────────┐
   │ Success         │
   │ Confirmation    │
   │                 │
   │ • Show progress │
   │ • Haptic feedback│
   │ • Navigate away │
   └─────────────────┘

Performance Requirements:
- Each step transition: <150ms
- Data validation: <50ms  
- Encryption and storage: <200ms
- Total flow completion: 3-5 minutes user time
```

### 3. Assessment Flow (PHQ-9/GAD-7)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Clinical Assessment Data Flow                            │
└─────────────────────────────────────────────────────────────────────────────────┘

Assessment Trigger
(User initiated/Scheduled)
         │
         ▼
   ┌─────────────────┐     ┌─────────────────────────────────────┐
   │ Assessment      │────▶│ Select Assessment Type              │
   │ Type Selection  │     │                                     │
   │                 │     │ Options:                            │
   │ • PHQ-9         │     │ - PHQ-9 (Depression screening)     │
   │ • GAD-7         │     │ - GAD-7 (Anxiety screening)        │
   │ • Both          │     │ - Both assessments                 │
   └─────────────────┘     │ - Quick mood check (simplified)    │
         │                 └─────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               PHQ-9 ASSESSMENT FLOW                             │
└─────────────────────────────────────────────────────────────────────────────────┘

   ┌─────────────────┐     ┌─────────────────────────────────────┐
   │ Initialize      │────▶│ Setup Assessment State              │
   │ PHQ-9           │     │                                     │
   │                 │     │ assessment_state = {                │
   │ • Load questions│     │   type: 'PHQ9',                     │
   │ • Setup state   │     │   responses: Array(9).fill(null),   │
   │ • Start timer   │     │   current_question: 0,              │
   └─────────────────┘     │   started_at: Date.now(),           │
         │                 │   context: 'standalone'             │
         ▼                 │ }                                   │
   ┌─────────────────┐     └─────────────────────────────────────┘
   │ Question 1-9    │               │
   │ Presentation    │               ▼
   │                 │     ┌─────────────────────────────────────┐
   │ For each Q:     │────▶│ Question Response Validation        │
   │ • Display text  │     │                                     │
   │ • 0-3 scale     │     │ For each response:                  │
   │ • Validate      │     │ • Must be 0, 1, 2, or 3           │
   │ • Next/Back     │     │ • Cannot skip questions            │
   └─────────────────┘     │ • Previous responses preserved      │
         │                 │ • Progress indicator updated        │
         ▼                 └─────────────────────────────────────┘
   ┌─────────────────┐               │
   │ Final Question  │               ▼
   │ (Suicidal       │     ┌─────────────────────────────────────┐
   │ Ideation)       │────▶│ Critical Question 9 Processing      │
   │                 │     │                                     │
   │ "Thoughts you   │     │ question_9_response = user_input    │
   │ would be better │     │                                     │
   │ off dead or     │     │ if (question_9_response > 0) {      │
   │ hurting yourself│     │   immediate_crisis_flag = true      │
   └─────────────────┘     │   crisis_intervention_required      │
         │                 │ }                                   │
         ▼                 └─────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SCORING AND ANALYSIS                               │
└─────────────────────────────────────────────────────────────────────────────────┘

   ┌─────────────────┐     ┌─────────────────────────────────────┐
   │ Calculate       │────▶│ PHQ-9 Scoring Algorithm             │
   │ Total Score     │     │                                     │
   │                 │     │ // 100% clinically accurate        │
   │ Sum responses   │     │ total_score = responses.reduce(     │
   │ 0-27 range      │     │   (sum, response) => sum + response,│
   │ Validate sum    │     │   0                                 │
   └─────────────────┘     │ );                                  │
         │                 │                                     │
         ▼                 │ // Validate score range             │
   ┌─────────────────┐     │ if (total_score < 0 || > 27) {      │
   │ Determine       │     │   throw Error('Invalid score');     │
   │ Severity Level  │     │ }                                   │
   │                 │     └─────────────────────────────────────┘
   │ Clinical ranges:│               │
   │ • 0-4: Minimal  │               ▼
   │ • 5-9: Mild     │     ┌─────────────────────────────────────┐
   │ • 10-14: Moderate│────▶│ Severity Classification             │
   │ • 15-19: Mod.Sev│     │                                     │
   │ • 20-27: Severe │     │ switch (total_score) {              │
   └─────────────────┘     │   case 0-4: 'minimal'               │
         │                 │   case 5-9: 'mild'                  │
         ▼                 │   case 10-14: 'moderate'             │
   ┌─────────────────┐     │   case 15-19: 'moderately_severe'   │
   │ Crisis          │     │   case 20-27: 'severe'              │
   │ Detection       │     │ }                                   │
   │                 │     └─────────────────────────────────────┘
   │ Threshold check:│               │
   │ • Score ≥ 20    │               ▼
   │ • Question 9 > 0│     ┌─────────────────────────────────────┐
   └─────────────────┘────▶│ Crisis Detection Logic              │
         │                 │                                     │
         ▼                 │ crisis_detected = (                 │
┌─────────────────────────────────────────────────────────────────────────────────┐│   total_score >= 20 ||          │
│                           CRISIS INTERVENTION BRANCH                            ││   responses[8] > 0               │
└─────────────────────────────────────────────────────────────────────────────────┘│ );                               │
                                   │                 │                                     │
   ┌─────────────────┐              ▼                 │ if (crisis_detected) {           │
   │ Crisis Detected │    ┌─────────────────────────────────────┐│   trigger_crisis_protocols(); │
   │ (Score≥20 OR    │───▶│ Immediate Crisis Response           ││ }                               │
   │ Q9>0)           │    │                                     │└─────────────────────────────────────┘
   │                 │    │ 1. Log crisis detection event      │              │
   │ • Immediate     │    │ 2. Display crisis resources        │              ▼
   │   intervention  │    │ 3. Offer crisis plan access        │┌─────────────────────────────────────┐
   │ • Crisis UI     │    │ 4. Provide emergency contacts      ││ Assessment Result Storage           │
   │ • Emergency     │    │ 5. Show 988 hotline               ││                                     │
   │   contacts      │    │ 6. <200ms response time target     ││ assessment_result = {               │
   └─────────────────┘    │ 7. High-visibility crisis theme    ││   id: uuid(),                       │
         │               └─────────────────────────────────────┘│   type: 'PHQ9',                     │
         ▼                              │              │   completed_at: ISO8601,            │
   ┌─────────────────┐                  ▼              │   responses: number[9],              │
   │ Crisis Plan     │    ┌─────────────────────────────────────┐│   total_score: number,              │
   │ Access          │───▶│ Load Crisis Plan (<200ms target)   ││   severity_level: string,           │
   │                 │    │                                     ││   crisis_detected: boolean,         │
   │ Pre-cached for  │    │ crisis_plan = await                ││   crisis_triggers: string[],        │
   │ emergency speed │    │   getCachedCrisisPlan();            ││   context: 'standalone'             │
   └─────────────────┘    │                                     ││ }                                   │
         │               │ if (!crisis_plan) {                 │└─────────────────────────────────────┘
         ▼               │   prompt_crisis_plan_creation();     │              │
   ┌─────────────────┐    │ }                                   │              ▼
   │ Emergency       │    └─────────────────────────────────────┘┌─────────────────────────────────────┐
   │ Contacts        │                  │              │ Encrypt and Store Assessment       │
   │                 │                  ▼              │                                     │
   │ • Phone numbers │    ┌─────────────────────────────────────┐│ 1. Validate assessment completeness │
   │ • One-tap call  │───▶│ Present Emergency Options           ││ 2. Serialize assessment object      │
   │ • 988 hotline   │    │                                     ││ 3. Encrypt with AES-256-GCM        │
   └─────────────────┘    │ • Crisis plan review               ││ 4. Update assessment history        │
                         │ • Emergency contact calling         ││ 5. Store to encrypted key           │
                         │ • 988 national hotline             ││ 6. Log storage completion           │
                         │ • Breathing exercises               │└─────────────────────────────────────┘
                         │ • Safety planning                   │
                         └─────────────────────────────────────┘

Data Flow Security:
- All assessment responses encrypted before storage
- Crisis detection happens before encryption
- Emergency contact access optimized for speed
- No network dependency for crisis intervention
- Complete audit trail of crisis events
```

## Crisis Intervention Data Flow

### Emergency Response Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          CRISIS INTERVENTION DATA FLOW                          │
└─────────────────────────────────────────────────────────────────────────────────┘

Crisis Trigger
(Assessment/Manual/External)
         │
         ▼
   ┌─────────────────┐     ┌─────────────────────────────────────┐
   │ Crisis          │────▶│ Crisis Event Detection              │
   │ Detection       │     │                                     │
   │                 │     │ Triggers:                           │
   │ Multiple entry  │     │ • PHQ-9 ≥ 20 OR Question 9 > 0     │
   │ points:         │     │ • GAD-7 ≥ 15                        │
   │ • Assessment    │     │ • Manual crisis button press       │
   │ • Crisis button │     │ • External emergency trigger       │
   │ • Manual        │     │                                     │
   └─────────────────┘     └─────────────────────────────────────┘
         │                               │
         ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CRISIS RESPONSE PROTOCOL                           │
└─────────────────────────────────────────────────────────────────────────────────┘

   ┌─────────────────┐     ┌─────────────────────────────────────┐
   │ Log Crisis      │────▶│ Crisis Event Logging                │
   │ Event           │     │                                     │
   │                 │     │ crisis_event = {                    │
   │ Immediate       │     │   id: uuid(),                       │
   │ audit trail     │     │   timestamp: Date.now(),            │
   │ for review      │     │   trigger_type: 'assessment_phq9',  │
   └─────────────────┘     │   trigger_details: {...},           │
         │                 │   response_time: null, // To track  │
         ▼                 │   user_actions: [],                 │
   ┌─────────────────┐     │   resolved: false                   │
   │ Performance     │     │ }                                   │
   │ Timer Start     │     └─────────────────────────────────────┘
   │                 │               │
   │ <200ms target   │               ▼
   │ for emergency   │     ┌─────────────────────────────────────┐
   │ response        │────▶│ Parallel Data Loading               │
   └─────────────────┘     │                                     │
         │                 │ Promise.all([                       │
         ▼                 │   loadCrisisPlan(),    // Pre-cached│
┌─────────────────────────────────────────────────────────────────────────────────┐│   loadEmergencyContacts(),       │
│                        EMERGENCY DATA ACCESS                                    ││   loadCopingStrategies(),        │
└─────────────────────────────────────────────────────────────────────────────────┘│   loadSafetyPlan()               │
                                   │                 │ ])                               │
   ┌─────────────────┐              ▼                 └─────────────────────────────────────┘
   │ Crisis Plan     │    ┌─────────────────────────────────────┐              │
   │ Quick Access    │───▶│ Emergency Decryption (<200ms)      │              ▼
   │                 │    │                                     │┌─────────────────────────────────────┐
   │ Pre-cached      │    │ // Use pre-warmed decryption keys  ││ Crisis UI Activation                │
   │ decryption keys │    │ crisis_plan = await                ││                                     │
   │ for speed       │    │   emergencyDecrypt(encrypted_plan);││ 1. Switch to high-contrast theme   │
   └─────────────────┘    │                                     ││ 2. Show emergency action buttons    │
         │               │ // Performance monitoring            ││ 3. Display crisis plan summary     │
         ▼               │ response_time = Date.now()-start     ││ 4. Provide one-tap calling         │
   ┌─────────────────┐    │ logCrisisAccessTime(response_time)  ││ 5. Show breathing/grounding tools   │
   │ Emergency       │    └─────────────────────────────────────┘│ 6. Enable easy navigation back     │
   │ Contacts        │              │              └─────────────────────────────────────┘
   │                 │              ▼                            │
   │ • Contact list  │    ┌─────────────────────────────────────┐              ▼
   │ • Phone numbers │───▶│ Contact Integration Preparation     │┌─────────────────────────────────────┐
   │ • Priority order│    │                                     ││ User Interaction Options            │
   └─────────────────┘    │ For each emergency contact:         ││                                     │
         │               │   contact_uri = `tel:${phone}`       ││ Present crisis intervention menu:   │
         ▼               │   validate_callable = await          ││                                     │
   ┌─────────────────┐    │     Linking.canOpenURL(contact_uri) ││ ┌─────────────────────────────────┐ │
   │ Safety          │    │                                     ││ │ View My Crisis Plan             │ │
   │ Strategies      │    │ // Prepare for instant dialing     ││ │ • Warning signs checklist       │ │
   │                 │    │ // No delays during emergency      ││ │ • Coping strategies list        │ │
   │ • Coping tools  │    └─────────────────────────────────────┘│ │ • Safety measures               │ │
   │ • Breathing     │              │              │ └─────────────────────────────────┘ │
   │ • Grounding     │              ▼              │                                     │
   │ • Resources     │    ┌─────────────────────────────────────┐│ ┌─────────────────────────────────┐ │
   └─────────────────┘───▶│ Crisis Resource Assembly            ││ │ Call Emergency Contact          │ │
         │               │                                     ││ │ • Priority-ordered list         │ │
         ▼               │ crisis_resources = {                 ││ │ • One-tap dialing               │ │
┌─────────────────────────────────────────────────────────────────────────────────┐│ │ • Call history tracking         │ │
│                         CRISIS INTERVENTION MENU                               ││ └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘│                                     │
                                   │                 │   crisis_plan: crisis_plan,     │ │ ┌─────────────────────────────────┐ │
   ┌─────────────────┐              ▼                 │   emergency_contacts: contacts,  │ │ │ Call 988 Crisis Hotline        │ │
   │ Crisis Menu     │    ┌─────────────────────────────────────┐│   coping_strategies: strategies, │ │ │ • National suicide prevention   │ │
   │ Presentation    │───▶│ High-Priority Action Display        ││   safety_plan: plan,             │ │ │ • 24/7 availability             │ │
   │                 │    │                                     ││   breathing_exercises: exercises, │ │ │ • Crisis counselor access       │ │
   │ • Large buttons │    │ Crisis intervention priorities:     ││   grounding_tools: tools          │ │ └─────────────────────────────────┘ │
   │ • High contrast │    │                                     ││ };                               │ │                                     │
   │ • Clear actions │    │ 1. Immediate safety (contacts)     │└─────────────────────────────────────┘│ ┌─────────────────────────────────┐ │
   │ • Fast access   │    │ 2. Crisis plan review              │              │   │ Breathing & Grounding Tools    │ │
   └─────────────────┘    │ 3. Professional help (988)         │              ▼   │ • 4-7-8 breathing pattern       │ │
         │               │ 4. Coping strategies                │┌─────────────────────────────────────┐│ │ • 5-4-3-2-1 grounding exercise  │ │
         ▼               │ 5. Grounding exercises              ││ User Action Tracking                ││ │ • Progressive muscle relaxation │ │
┌─────────────────────────────────────────────────────────────────────────────────┐│                                     ││ └─────────────────────────────────┘ │
│                              USER ACTION TRACKING                               ││ Track all user crisis actions:     │└─────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────────────┘│                                     │
                                   │                 │ crisis_event.user_actions.push({│
   ┌─────────────────┐              ▼                 │   action: action_type,           │
   │ Action          │    ┌─────────────────────────────────────┐│   timestamp: Date.now(),         │
   │ Monitoring      │───▶│ Crisis Resolution Tracking          ││   details: action_details        │
   │                 │    │                                     ││ });                               │
   │ Track user      │    │ Monitor crisis resolution:          │└─────────────────────────────────────┘
   │ engagement with │    │                                     │              │
   │ crisis tools    │    │ • Contact calling initiated         │              ▼
   └─────────────────┘    │ • Crisis plan reviewed              │┌─────────────────────────────────────┐
         │               │ • Breathing exercise completed       ││ Crisis Resolution Detection         │
         ▼               │ • Safety plan accessed              ││                                     │
   ┌─────────────────┐    │ • Help resources viewed             ││ Detect when crisis is resolving:    │
   │ Resolution      │    │                                     ││                                     │
   │ Detection       │    │ Auto-resolve triggers:              ││ • User returns to normal flow       │
   │                 │    │ • User exits crisis mode            ││ • Accesses non-crisis features      │
   │ Determine when  │    │ • Accesses regular app features     ││ • Time elapsed (30+ minutes)       │
   │ crisis has      │    │ • Completes post-crisis check-in    ││ • Completes follow-up assessment    │
   │ been addressed  │    └─────────────────────────────────────┘│                                     │
   └─────────────────┘              │              │ Update crisis_event:            │
                                   ▼              │   resolved: true,               │
   ┌─────────────────┐    ┌─────────────────────────────────────┐│   resolution_time: Date.now(),      │
   │ Follow-up       │───▶│ Post-Crisis Data Collection         ││   resolution_method: method_used    │
   │ Assessment      │    │                                     │└─────────────────────────────────────┘
   │                 │    │ Optional follow-up assessment:      │
   │ Check user      │    │                                     │
   │ status after    │    │ • Brief mood check                  │
   │ crisis          │    │ • Safety confirmation               │
   │ intervention    │    │ • Resource effectiveness rating    │
   └─────────────────┘    │ • Crisis plan update needs         │
                         └─────────────────────────────────────┘

Data Flow Security:
- Crisis events logged immediately for audit
- All emergency data pre-cached for speed
- No network dependency for crisis intervention
- Complete user action tracking for analysis
- Automatic resolution detection and follow-up
```

## Data Encryption and Export Flow

### Secure Export Process

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DATA EXPORT AND BACKUP FLOW                          │
└─────────────────────────────────────────────────────────────────────────────────┘

Export Trigger
(User Request/Scheduled Backup)
         │
         ▼
   ┌─────────────────┐     ┌─────────────────────────────────────┐
   │ Export Type     │────▶│ User Export Preferences             │
   │ Selection       │     │                                     │
   │                 │     │ export_options = {                  │
   │ Options:        │     │   include_assessments: boolean,     │
   │ • Basic data    │     │   include_crisis_plan: boolean,     │
   │ • Clinical data │     │   include_checkin_history: boolean, │
   │ • Complete      │     │   format: 'PDF' | 'CSV' | 'JSON',  │
   │ • For therapist │     │   time_range: '30d' | '90d' | 'all' │
   └─────────────────┘     │ }                                   │
         │                 └─────────────────────────────────────┘
         ▼                               │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DATA COLLECTION PHASE                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

   ┌─────────────────┐     ┌─────────────────────────────────────┐
   │ Decrypt         │────▶│ Secure Data Decryption              │
   │ Clinical Data   │     │                                     │
   │                 │     │ // Only if user explicitly approves │
   │ User must       │     │ if (include_assessments) {          │
   │ explicitly      │     │   assessments = await               │
   │ approve access  │     │     decryptAssessments(user_key);   │
   │ to sensitive    │     │ }                                   │
   │ information     │     │                                     │
   └─────────────────┘     │ if (include_crisis_plan) {          │
         │                 │   crisis_plan = await               │
         ▼                 │     decryptCrisisPlan(user_key);    │
   ┌─────────────────┐     │ }                                   │
   │ Gather          │     └─────────────────────────────────────┘
   │ Non-Sensitive   │               │
   │ Data            │               ▼
   │                 │     ┌─────────────────────────────────────┐
   │ • User profile  │────▶│ Assemble Export Dataset             │
   │ • Preferences   │     │                                     │
   │ • App settings  │     │ export_data = {                     │
   │ • Usage stats   │     │   metadata: {                       │
   └─────────────────┘     │     export_timestamp: ISO8601,      │
         │                 │     app_version: version,            │
         ▼                 │     export_type: type,              │
   ┌─────────────────┐     │     includes_sensitive: boolean,    │
   │ Process         │     │     retention_notice: string        │
   │ Check-in        │     │   },                                │
   │ History         │     │   user_profile: profile_data,       │
   │                 │     │   checkin_summary: summary_stats,   │
   │ • Decrypt if    │     │   mood_trends: calculated_trends,   │
   │   needed        │     │   assessments: clinical_data,       │
   │ • Filter by     │     │   crisis_plan: safety_data,         │
   │   date range    │     │   audit_trail: export_log           │
   │ • Calculate     │     │ }                                   │
   │   trends        │     └─────────────────────────────────────┘
   └─────────────────┘               │
         │                           ▼
         ▼               ┌─────────────────────────────────────┐
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            FORMAT GENERATION                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

   ┌─────────────────┐     ┌─────────────────────────────────────┐
   │ Generate        │────▶│ JSON Format (Technical/Backup)      │
   │ JSON Export     │     │                                     │
   │                 │     │ // Complete data structure          │
   │ Complete        │     │ json_export = JSON.stringify(       │
   │ technical       │     │   export_data,                      │
   │ backup format   │     │   null,                            │
   └─────────────────┘     │   2  // Pretty formatting           │
         │                 │ );                                  │
         ▼                 └─────────────────────────────────────┘
   ┌─────────────────┐               │
   │ Generate        │               ▼
   │ CSV Export      │     ┌─────────────────────────────────────┐
   │                 │────▶│ CSV Format (Analysis/Research)      │
   │ Tabular data    │     │                                     │
   │ for analysis    │     │ // Flatten data for spreadsheets    │
   │ in spreadsheet  │     │ csv_rows = [                        │
   │ applications    │     │   ['Date', 'Mood', 'Anxiety', ...], │
   └─────────────────┘     │   ...checkin_data.map(formatCSVRow),│
         │                 │   ...assessment_data.map(formatRow) │
         ▼                 │ ];                                  │
   ┌─────────────────┐     │                                     │
   │ Generate        │     │ csv_content = csv_rows              │
   │ PDF Report      │     │   .map(row => row.join(','))        │
   │                 │     │   .join('\n');                      │
   │ Clinical        │     └─────────────────────────────────────┘
   │ summary for     │               │
   │ sharing with    │               ▼
   │ healthcare      │     ┌─────────────────────────────────────┐
   │ providers       │────▶│ PDF Format (Clinical/Professional)  │
   └─────────────────┘     │                                     │
         │                 │ // Professional healthcare format   │
         ▼                 │ pdf_content = await generatePDF({   │
┌─────────────────────────────────────────────────────────────────────────────────┐│   title: 'FullMind Health Summary',│
│                              SECURE DELIVERY                                    ││   patient_info: user_profile,      │
└─────────────────────────────────────────────────────────────────────────────────┘│   assessment_history: assessments, │
                                   │                 │   mood_trends: trends,           │
   ┌─────────────────┐              ▼                 │   crisis_plan: plan,             │
   │ Package         │    ┌─────────────────────────────────────┐│   recommendations: clinical_notes│
   │ Export Files    │───▶│ Create Export Package               ││ });                               │
   │                 │    │                                     │└─────────────────────────────────────┘
   │ Multiple        │    │ export_package = {                  │              │
   │ formats for     │    │   json: json_export,                │              ▼
   │ different       │    │   csv: csv_content,                 │┌─────────────────────────────────────┐
   │ use cases       │    │   pdf: pdf_buffer,                  ││ Export Security and Audit           │
   └─────────────────┘    │   manifest: {                       ││                                     │
         │               │     created_at: timestamp,           ││ audit_entry = {                     │
         ▼               │     formats: ['json', 'csv', 'pdf'], ││   export_id: uuid(),                │
   ┌─────────────────┐    │     sensitive_data: boolean,        ││   timestamp: ISO8601,               │
   │ User Device     │    │     size_bytes: total_size,         ││   user_id: user.id,                 │
   │ Storage         │    │     checksum: calculate_hash()      ││   export_type: type,                │
   │                 │    │   }                                 ││   formats_generated: formats,       │
   │ Save to:        │    │ }                                   ││   sensitive_data_included: boolean, │
   │ • Documents dir │    └─────────────────────────────────────┘│   file_sizes: size_info,            │
   │ • Share via OS  │              │              │   disposal_required: false,      │
   │ • Email attach  │              ▼              │   shared_externally: false       │
   │ • Cloud save    │    ┌─────────────────────────────────────┐│ };                                  │
   └─────────────────┘───▶│ Deliver to User                     │└─────────────────────────────────────┘
                         │                                     │              │
                         │ // Use native sharing capabilities   │              ▼
                         │ await Share.shareAsync({             │┌─────────────────────────────────────┐
                         │   url: export_package.files,         ││ Export Cleanup                      │
                         │   mimeType: 'application/zip',       ││                                     │
                         │   dialogTitle: 'Export FullMind Data'││ // Secure cleanup of temporary files │
                         │ });                                  ││ await secureDeleteTempFiles(        │
                         │                                     ││   temp_export_files                 │
                         │ // Log successful export              ││ );                                  │
                         │ await logExportCompletion(           ││                                     │
                         │   audit_entry                        ││ // Clear decrypted data from memory │
                         │ );                                   ││ clearSensitiveDataFromMemory();     │
                         └─────────────────────────────────────┘│                                     │
                                                               │ // Update user export history       │
                                                               │ await updateExportHistory(audit);   │
                                                               └─────────────────────────────────────┘

Export Security Features:
- User explicit consent for sensitive data
- Complete audit trail of all exports
- Secure cleanup of temporary files
- No cloud storage without user control
- Multiple formats for different use cases
```

### Emergency Access Patterns

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        EMERGENCY ACCESS DATA PATTERNS                           │
└─────────────────────────────────────────────────────────────────────────────────┘

Emergency Scenario
(Poor connectivity/Low battery/Stress)
         │
         ▼
   ┌─────────────────┐     ┌─────────────────────────────────────┐
   │ Pre-cached      │────▶│ Emergency Data Pre-loading          │
   │ Emergency Data  │     │                                     │
   │                 │     │ // Loaded at app startup            │
   │ Always          │     │ emergency_cache = {                 │
   │ available       │     │   crisis_plan_exists: boolean,      │
   │ regardless of   │     │   contact_count: number,            │
   │ device state    │     │   last_update: timestamp,           │
   └─────────────────┘     │   quick_dial_ready: boolean         │
         │                 │ };                                  │
         ▼                 └─────────────────────────────────────┘
   ┌─────────────────┐               │
   │ Crisis Button   │               ▼
   │ Always Visible  │     ┌─────────────────────────────────────┐
   │                 │────▶│ High-Availability Access Pattern    │
   │ • Header of     │     │                                     │
   │   every screen  │     │ // Multiple access paths            │
   │ • <3 taps from  │     │ crisis_access_paths = [             │
   │   any location  │     │   'header_button',                  │
   │ • Large touch   │     │   'shake_gesture',                  │
   │   target        │     │   'voice_command',                  │
   └─────────────────┘     │   'widget_shortcut'                 │
         │                 │ ];                                  │
         ▼                 └─────────────────────────────────────┘
   ┌─────────────────┐               │
   │ Instant Crisis  │               ▼
   │ UI Activation   │     ┌─────────────────────────────────────┐
   │                 │────▶│ Emergency UI Transformation         │
   │ • High contrast │     │                                     │
   │ • Large buttons │     │ // Instant UI changes for crisis    │
   │ • Clear actions │     │ await Promise.all([                 │
   │ • Reduced       │     │   switchToCrisisTheme(),            │
   │   cognitive     │     │   enlargeButtonTargets(),           │
   │   load          │     │   simplifyNavigation(),             │
   └─────────────────┘     │   enableEmergencyMode()             │
                          │ ]);                                  │
                          └─────────────────────────────────────┘

Emergency Performance:
- <200ms crisis detection to UI response
- Pre-cached contact information for instant access  
- Offline operation during network outages
- Large touch targets for stress/motor impairment
- High contrast themes for visibility during crisis
```

## Related Architecture Documentation

### Core Architecture References
- **ADR-001**: Local-First Storage Architecture - Foundation for all data flows
- **ADR-002**: Crisis Detection Thresholds - Emergency response trigger logic
- **ADR-003**: Offline-First Design - Network-independent data flow architecture
- **System Design Document**: Complete component and data architecture

### Implementation Documentation
- **TRD v2.0**: React Native technical implementation specifications
- **Clinical Validation Report**: Assessment scoring accuracy and crisis detection validation
- **Security Implementation Guide**: Encryption standards and key management for data flows

### Performance and Quality
- **Performance Benchmarking Report**: Response time validation for all critical data flows
- **User Experience Testing**: Real-world validation of therapeutic data flow patterns
- **Accessibility Compliance**: WCAG AA compliance for crisis and emergency data flows

---

*These comprehensive data flow diagrams establish the complete information architecture for a clinical-grade mental health application that prioritizes user safety, data privacy, and therapeutic effectiveness through carefully designed data movement patterns that work reliably offline and provide immediate crisis intervention capabilities.*