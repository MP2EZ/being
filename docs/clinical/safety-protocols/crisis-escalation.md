# Crisis Escalation Protocols

## Overview

This document defines the clinical crisis escalation protocols for the FullMind mental health application. These protocols ensure appropriate and immediate response to users experiencing mental health crises, based on validated clinical assessment thresholds and evidence-based intervention strategies.

## Clinical Crisis Thresholds

### PHQ-9 Depression Assessment Thresholds

#### Automatic Crisis Detection
- **Severe Depression Score**: PHQ-9 ≥ 20 (automatic crisis intervention)
- **Suicidal Ideation**: Question 9 score ≥ 1 (any suicidal thoughts)
- **Combined Risk**: PHQ-9 ≥ 15 + GAD-7 ≥ 10 (dual presentation)

#### Clinical Severity Levels
```
PHQ-9 Score Ranges:
0-4   : Minimal depression (no intervention)
5-9   : Mild depression (monitoring recommended)
10-14 : Moderate depression (therapeutic support)
15-19 : Moderately severe depression (clinical attention)
20-27 : Severe depression (CRISIS INTERVENTION REQUIRED)
```

#### Suicidal Ideation Assessment (PHQ-9 Question 9)
```
"Thoughts that you would be better off dead or of hurting yourself in some way"

Score 0: "Not at all" (no intervention)
Score 1: "Several days" (IMMEDIATE CRISIS PROTOCOL)
Score 2: "More than half the days" (IMMEDIATE CRISIS PROTOCOL)
Score 3: "Nearly every day" (IMMEDIATE CRISIS PROTOCOL)
```

### GAD-7 Anxiety Assessment Thresholds

#### Automatic Crisis Detection
- **Severe Anxiety Score**: GAD-7 ≥ 15 (automatic crisis intervention)
- **Panic Disorder Risk**: GAD-7 ≥ 18 (heightened intervention)
- **Functional Impairment**: Combined with high functional impairment scores

#### Clinical Severity Levels
```
GAD-7 Score Ranges:
0-4  : Minimal anxiety (no intervention)
5-9  : Mild anxiety (monitoring recommended)
10-14: Moderate anxiety (therapeutic support)
15-21: Severe anxiety (CRISIS INTERVENTION REQUIRED)
```

## Crisis Detection Algorithm

### Automatic Crisis Triggers

#### Level 1: Immediate Crisis (Automatic Activation)
```typescript
// Crisis detection logic from assessmentStore.ts
const requiresCrisisIntervention = (assessment: Assessment): boolean => {
  if (assessment.type === 'phq9') {
    const hasHighScore = assessment.score >= 20;  // CRISIS_THRESHOLD_PHQ9
    const hasSuicidalThoughts = assessment.answers[8] >= 1;  // Question 9, 0-based index
    return hasHighScore || hasSuicidalThoughts;
  }
  
  if (assessment.type === 'gad7') {
    return assessment.score >= 15;  // CRISIS_THRESHOLD_GAD7
  }
  
  return false;
};
```

#### Level 2: High Risk (Enhanced Monitoring)
- PHQ-9 score 15-19 with concerning check-in patterns
- GAD-7 score 12-14 with functional impairment indicators
- Multiple consecutive moderate-severe assessments (3+ in 14 days)
- Deteriorating trend in mood tracking data

#### Level 3: Moderate Risk (Therapeutic Intervention)
- PHQ-9 score 10-14 consistently over 2+ weeks
- GAD-7 score 10-11 with sleep or concentration impacts
- User-initiated crisis resource access
- Significant decline in daily check-in completion

### Crisis Button Functionality

#### Immediate Actions Upon Crisis Button Press
1. **Response Time Target**: < 3 seconds from tap to crisis screen
2. **Automatic Resource Display**: 988 hotline prominently featured
3. **One-Touch Calling**: Direct dial to 988 without confirmation delays
4. **Alternative Resources**: Text and chat options for accessibility
5. **Emergency Contacts**: User-defined contacts automatically notified (with consent)

#### Crisis Button Accessibility Features
- **Large Touch Target**: Minimum 88px touch area (exceeds 44px standard)
- **High Contrast**: 7:1 contrast ratio for visibility during distress
- **Voice Activation**: "Crisis help" voice command available
- **Screen Reader**: Full VoiceOver/TalkBack compatibility
- **Motor Accessibility**: Single-tap activation, no gestures required

## Safety Plan Activation Procedures

### Immediate Safety Plan Elements

#### 1. Automatic Crisis Resource Provision
```
PRIMARY RESOURCES (< 3 second access):
✓ 988 Suicide & Crisis Lifeline (one-touch calling)
✓ Crisis Text Line (HOME to 741741)
✓ Emergency Services (911 for life-threatening situations)
✓ User's Emergency Contacts (with consent)
```

#### 2. Immediate Coping Strategies Display
```
CRISIS COPING STRATEGIES (immediately visible):
✓ 5-4-3-2-1 Grounding Technique
✓ Deep Breathing Instructions (4-4-6 pattern)
✓ Cold Water/Ice Application
✓ Physical Movement Suggestions
```

#### 3. Safety Reminders and Affirmations
```
SAFETY MESSAGES (therapeutic language):
✓ "This feeling is temporary and will pass"
✓ "You have survived difficult times before"
✓ "Reaching out for help is a sign of strength"
✓ "You deserve support and care"
```

### Personalized Safety Plan Components

#### User-Defined Elements (Created During Onboarding)
- **Personal Warning Signs**: Early indicators of crisis
- **Coping Strategies**: Personalized list of effective techniques
- **Support Network**: Emergency contacts with relationship context
- **Professional Support**: Therapist/psychiatrist contact information
- **Safe Environment**: Instructions for creating immediate safety

#### Safety Plan Storage and Access
- **Encrypted Storage**: AES-256 encryption for all safety plan data
- **Offline Access**: Available without internet connection
- **Quick Access**: Single tap from any screen in app
- **Privacy Control**: User controls who can access their safety plan

## Professional Intervention Triggers

### Clinical Assessment-Based Triggers

#### Mandatory Professional Referral Criteria
1. **PHQ-9 ≥ 20**: Severe depression requiring clinical evaluation
2. **Any Suicidal Ideation**: PHQ-9 Question 9 score ≥ 1
3. **GAD-7 ≥ 15**: Severe anxiety potentially requiring medication
4. **Rapid Deterioration**: 5+ point increase in assessment scores within 7 days
5. **Functional Impairment**: Combined high scores with inability to complete daily activities

#### Professional Resource Integration
- **988 Crisis Lifeline**: Primary resource for immediate crisis intervention
- **Crisis Text Line**: Alternative communication for users who prefer text
- **Local Crisis Services**: Geolocation-based emergency mental health services
- **Emergency Services**: 911 for life-threatening situations
- **Telehealth Integration**: Future phase - direct connection to crisis counselors

### Intervention Response Protocols

#### Level 1: Immediate Professional Intervention
**Triggered by**: PHQ-9 ≥ 20, any suicidal ideation, or crisis button activation

**Response Protocol**:
1. **Immediate Resource Display** (< 3 seconds)
   - 988 hotline with one-touch calling
   - Crisis text line information
   - Emergency contacts notification (with consent)

2. **Safety Assessment** (integrated into crisis screen)
   - Simple yes/no questions about immediate safety
   - Location of means of self-harm
   - Availability of support persons

3. **Professional Resource Connection** (< 60 seconds)
   - Direct connection to 988 counselor
   - Alternative crisis resources if 988 unavailable
   - Emergency services if life-threatening situation

#### Level 2: Enhanced Clinical Support
**Triggered by**: PHQ-9 15-19, GAD-7 12-14, or deteriorating trends

**Response Protocol**:
1. **Enhanced Monitoring** (immediate)
   - Daily check-in prompts
   - Simplified assessment frequency increase
   - Mood tracking reminders

2. **Professional Resource Information** (within crisis screen)
   - Local therapist directory
   - Telehealth platform information
   - Community mental health resources

3. **Follow-up Protocols** (24-48 hours)
   - In-app check-in prompts
   - Optional progress sharing with emergency contacts
   - Resource utilization tracking

#### Level 3: Preventive Support
**Triggered by**: PHQ-9 10-14, GAD-7 8-11, or concerning patterns

**Response Protocol**:
1. **Therapeutic Content Delivery**
   - MBCT exercises matched to current mood state
   - Personalized coping strategy reminders
   - Values-based activity suggestions

2. **Community Resource Information**
   - Support group information
   - Community mental health resources
   - Peer support platform options

3. **Proactive Check-ins**
   - Weekly assessment recommendations
   - Mood trend notifications
   - Progress celebration and encouragement

## Crisis Communication Protocols

### Therapeutic Language Standards

#### Crisis Communication Principles
- **Non-judgmental**: Avoid language that implies blame or weakness
- **Hope-focused**: Emphasize temporary nature of crisis and possibility of recovery
- **Strengths-based**: Acknowledge user's courage in seeking help
- **Clear and Simple**: Use plain language accessible during crisis states
- **Culturally Sensitive**: Respect diverse backgrounds and experiences

#### Sample Crisis Communications

**Assessment-Triggered Crisis Message**:
```
"Your responses indicate you're experiencing significant distress. 
This takes courage to acknowledge. Help is available right now.

You are not alone. Professional crisis counselors are standing by 
to provide immediate support."
```

**Crisis Button Activation Message**:
```
"You've taken an important step by reaching out for help. 
That shows strength, not weakness.

Crisis support is available immediately. You deserve care and support."
```

### Emergency Contact Communication

#### Consent Management for Crisis Communications
- **Explicit Consent**: Required before contacting emergency contacts
- **Granular Control**: User chooses which contacts for different crisis levels
- **Consent Renewal**: Annual confirmation of emergency contact preferences
- **Crisis Override**: Life-threatening situations may override consent preferences

#### Emergency Contact Notification Templates

**High-Risk Assessment Notification**:
```
Subject: Mental Health Check-in - Support Requested

[Emergency Contact Name],

[User Name] has completed a mental health assessment that indicates 
they could benefit from additional support. They have chosen to 
include you in their support network.

This is not an emergency, but your care and support would be valuable.

They are receiving appropriate crisis resources through the app, 
including access to professional crisis counselors.

Crisis resources available:
- 988 Suicide & Crisis Lifeline (24/7, free, confidential)
- Crisis Text Line: Text HOME to 741741

Please reach out to [User Name] when you're able.
```

**Crisis Button Activation Notification**:
```
Subject: Immediate Support Requested - [User Name]

[Emergency Contact Name],

[User Name] has indicated they need immediate support and has 
specifically chosen to include you in their crisis response.

Please contact them as soon as possible. If you believe they are 
in immediate physical danger, call 911.

They have access to professional crisis support:
- 988 Suicide & Crisis Lifeline: Available now
- Local emergency services: 911 if immediate danger

Your support and care make a difference.
```

## Quality Assurance and Monitoring

### Crisis Detection Accuracy Metrics

#### Key Performance Indicators
- **Sensitivity**: 98%+ detection rate for clinical crisis levels
- **Specificity**: <5% false positive rate to prevent crisis fatigue
- **Response Time**: <3 seconds from trigger to resource display
- **User Satisfaction**: >85% report crisis response was helpful
- **Professional Validation**: Monthly clinical review of crisis detection accuracy

#### Continuous Monitoring Systems
- **Real-time Dashboard**: Crisis detection events and response times
- **Weekly Reports**: Crisis intervention utilization and outcomes
- **Monthly Analysis**: False positive/negative analysis with clinical review
- **Quarterly Audit**: Complete crisis protocol effectiveness assessment

### Clinical Validation Process

#### Weekly Clinical Review
- **Assessment Accuracy**: Review sample of crisis-level assessments
- **Response Appropriateness**: Validate intervention recommendations
- **Resource Effectiveness**: Evaluate user engagement with crisis resources
- **Process Improvements**: Identify and implement protocol enhancements

#### Monthly Professional Consultation
- **External Clinical Review**: Independent mental health professional evaluation
- **Crisis Service Coordination**: Feedback from 988 and local crisis services
- **Best Practice Updates**: Integration of latest crisis intervention research
- **Staff Training Updates**: Ensure all staff current on crisis protocols

## Compliance and Legal Considerations

### Regulatory Compliance
- **Crisis Standards**: Adherence to national crisis intervention guidelines
- **Professional Standards**: Alignment with APA and NASW crisis intervention principles
- **Privacy Protection**: HIPAA-aware crisis response procedures
- **Consent Management**: Clear user control over crisis response preferences

### Documentation Requirements
- **Crisis Events**: Anonymized logging of all crisis detection and response
- **Response Times**: Detailed metrics on crisis intervention speed
- **Resource Utilization**: User engagement with crisis resources
- **Outcome Tracking**: Follow-up on crisis intervention effectiveness

### Legal Protections
- **Duty of Care**: Clear boundaries of app responsibility vs. professional care
- **Emergency Override**: Legal framework for emergency contact notification
- **Data Protection**: Secure handling of crisis-related user data
- **Professional Referral**: Clear handoff protocols to licensed professionals

---

**Document Control**
- **Version**: 1.0
- **Last Updated**: 2024-09-10
- **Next Review**: 2024-11-10 (Monthly)
- **Clinical Reviewer**: [Clinical Director]
- **Technical Reviewer**: [CTO]
- **Legal Approval**: [Legal Counsel]