# FullMind System Architecture Design

## Document Overview

**Version**: 1.0  
**Status**: Production Architecture (v1.7 Implementation)  
**Last Updated**: 2025-01-27  
**Architecture Coordinator**: Enhanced Architect Agent with Document Intelligence  

## Executive Summary

FullMind is a clinical-grade React Native mental health application delivering comprehensive MBCT (Mindfulness-Based Cognitive Therapy) practices through an offline-first, privacy-preserving architecture. This document provides complete system design based on document index analysis of 15+ project specifications and multi-agent coordination insights.

### Key Architectural Achievements
- **100% offline functionality** with crisis intervention response <200ms
- **Clinical-grade accuracy** with validated PHQ-9/GAD-7 assessments
- **Privacy-first design** with AES-256 encryption and local data control
- **Performance optimized** for mental health therapeutic flows
- **Scalable foundation** with clear migration paths for enhanced features

### Architecture Principles
1. **Safety First**: Crisis intervention never depends on network connectivity
2. **Privacy by Design**: User maintains complete control over mental health data
3. **Clinical Integrity**: Evidence-based practices with 100% assessment accuracy
4. **Therapeutic Performance**: Optimized for mental health user experience
5. **Future-Ready**: Clear migration paths for enhanced collaborative features

## System Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FullMind Mobile App                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        Presentation Layer                               │   │
│  │                                                                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │   │
│  │  │   Morning    │  │    Midday    │  │   Evening    │  │    Crisis    │ │   │
│  │  │  Check-in    │  │    Reset     │  │  Reflection  │  │  Intervention │ │   │
│  │  │     Flows    │  │    Flows     │  │    Flows     │  │    Flows     │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │   │
│  │                                                                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │   │
│  │  │  Assessment  │  │   Profile    │  │   Settings   │  │   Export     │ │   │
│  │  │    Flows     │  │     Flows    │  │    Flows     │  │    Flows     │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        Navigation Layer                                 │   │
│  │                                                                         │   │
│  │  ┌──────────────────┐              ┌──────────────────────────────────┐ │   │
│  │  │  React Navigation │              │         Crisis Navigation         │ │   │
│  │  │                  │              │        (Always Accessible)        │ │   │
│  │  │  • Tab Navigator │              │  • Emergency Contact Access       │ │   │
│  │  │  • Stack Navigator│              │  • Crisis Plan Quick Access       │ │   │
│  │  │  • Modal Screens │              │  • 988 Hotline Integration        │ │   │
│  │  └──────────────────┘              └──────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      Component Library                                  │   │
│  │                                                                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │   │
│  │  │    Button    │  │    Slider    │  │  MultiSelect │  │   TextArea   │ │   │
│  │  │   Component  │  │   Component  │  │   Component  │  │   Component  │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │   │
│  │                                                                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │   │
│  │  │    Theme     │  │  Accessibility│  │    Haptic    │  │   Animation  │ │   │
│  │  │   System     │  │   Components  │  │   Feedback   │  │  Components  │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       Business Logic Layer                              │   │
│  │                                                                         │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │   │
│  │  │  Check-in Logic  │  │ Assessment Logic │  │   Crisis Detection   │   │   │
│  │  │                  │  │                  │  │       Logic          │   │   │
│  │  │ • MBCT Practices │  │ • PHQ-9 Scoring  │  │ • Threshold Analysis │   │   │
│  │  │ • Progress Track │  │ • GAD-7 Scoring  │  │ • Intervention Logic │   │   │
│  │  │ • Mood Analytics │  │ • Severity Calc  │  │ • Emergency Protocols│   │   │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────────┘   │   │
│  │                                                                         │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │   │
│  │  │  Export Logic    │  │   Theme Logic    │  │  Notification Logic  │   │   │
│  │  │                  │  │                  │  │                      │   │   │
│  │  │ • PDF Generation │  │ • Dynamic Themes │  │ • Schedule Reminders │   │   │
│  │  │ • CSV Export     │  │ • Time-based UI  │  │ • Crisis Alerts      │   │   │
│  │  │ • Data Packaging │  │ • Accessibility  │  │ • Practice Prompts   │   │   │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      State Management Layer                             │   │
│  │                                                                         │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │   │
│  │  │   User Store     │  │ Check-in Store   │  │   Assessment Store   │   │   │
│  │  │  (Zustand)       │  │   (Zustand)      │  │     (Zustand)        │   │   │
│  │  │                  │  │                  │  │                      │   │   │
│  │  │ • User Profile   │  │ • Daily Entries  │  │ • PHQ-9 History      │   │   │
│  │  │ • Preferences    │  │ • Mood Tracking  │  │ • GAD-7 History      │   │   │
│  │  │ • Settings       │  │ • Progress Data  │  │ • Score Analysis     │   │   │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────────┘   │   │
│  │                                                                         │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │   │
│  │  │   Crisis Store   │  │   Theme Store    │  │   Session Store      │   │   │
│  │  │   (Zustand)      │  │   (Zustand)      │  │    (Zustand)         │   │   │
│  │  │                  │  │                  │  │                      │   │   │
│  │  │ • Crisis Plan    │  │ • Current Theme  │  │ • Active Sessions    │   │   │
│  │  │ • Emergency Data │  │ • Time-based UI  │  │ • Navigation State   │   │   │
│  │  │ • Contact Info   │  │ • Accessibility  │  │ • Temporary Data     │   │   │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       Data Layer                                        │   │
│  │                                                                         │   │
│  │  ┌──────────────────┐              ┌──────────────────────────────────┐   │   │
│  │  │  Encryption      │              │        AsyncStorage              │   │   │
│  │  │   Service        │              │     (Persistent Storage)         │   │   │
│  │  │                  │              │                                  │   │   │
│  │  │ • AES-256-GCM    │◄─────────────┤ • User Data (Non-sensitive)     │   │   │
│  │  │ • Key Management │              │ • Encrypted Assessment Data     │   │   │
│  │  │ • Crisis Access  │              │ • Encrypted Crisis Plans        │   │   │
│  │  └──────────────────┘              │ • Encrypted Check-in History    │   │   │
│  │                                    └──────────────────────────────────┘   │   │
│  │                                                                         │   │
│  │  ┌──────────────────┐              ┌──────────────────────────────────┐   │   │
│  │  │  Export Service  │              │      Device Integration          │   │   │
│  │  │                  │              │                                  │   │   │
│  │  │ • PDF Generation │              │ • Document Directory Backup     │   │   │
│  │  │ • CSV Export     │◄─────────────┤ • Share API Integration         │   │   │
│  │  │ • JSON Backup    │              │ • Contact App Integration        │   │   │
│  │  │ • HIPAA Audit    │              │ • Notification Scheduling       │   │   │
│  │  └──────────────────┘              └──────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Architecture Stack Summary

```typescript
interface FullMindArchitecture {
  platform: 'React Native 0.73 + Expo SDK 50';
  language: 'TypeScript 5.3 (strict mode)';
  
  presentation: {
    navigation: 'React Navigation 6.1';
    styling: 'StyleSheet with dynamic theming';
    animations: 'Reanimated 3 + Gesture Handler';
    accessibility: 'WCAG AA compliant';
  };
  
  state_management: {
    global_state: 'Zustand 4.5 with persistence';
    local_state: 'React hooks with TypeScript';
    form_state: 'React Hook Form with validation';
  };
  
  data_layer: {
    primary_storage: 'AsyncStorage with AES-256 encryption';
    structure: 'JSON with strict TypeScript interfaces';
    backup: 'Local document directory + export';
    migration_path: 'SQLite ready for Phase 2';
  };
  
  native_features: {
    notifications: 'Expo Notifications';
    haptics: 'Expo Haptics with therapeutic patterns';
    sharing: 'Expo Sharing + Document Picker';
    contact_integration: 'Native contact picker';
  };
  
  security: {
    encryption: 'AES-256-GCM for sensitive data';
    key_management: 'Device-based key derivation';
    audit_trail: 'Comprehensive action logging';
    privacy: 'Complete offline operation';
  };
}
```

## Component Architecture

### Design System Foundation

Based on our document index analysis of the Design Library v1.1, FullMind uses a comprehensive component system optimized for mental health user experience:

```typescript
// Core Component Architecture
interface ComponentSystem {
  foundation: {
    theme_system: DynamicThemeProvider;
    color_system: TherapeuticColorPalette;
    typography: AccessibleTypeScale;
    spacing: ConsistentSpacingScale;
  };
  
  interactive: {
    buttons: TherapeuticButtonVariants;
    inputs: ValidatedInputComponents;
    sliders: AccessibleSliderComponents;
    selections: MultiSelectComponents;
  };
  
  feedback: {
    haptics: TherapeuticHapticPatterns;
    animations: MindfulAnimationLibrary;
    notifications: ClinicallyAppropriateFeedback;
  };
  
  specialized: {
    crisis: EmergencyAccessComponents;
    assessment: ClinicalFormComponents;
    mindfulness: MBCTExerciseComponents;
    progress: InsightVisualizationComponents;
  };
}
```

### Component Hierarchy

**1. Foundation Components**
```typescript
// Theme System with Therapeutic Color Psychology
interface TherapeuticThemeSystem {
  themes: {
    morning: {
      primary: '#FF9F43';     // Warm orange for energy
      secondary: '#FFF3E0';   // Light background
      accent: '#E8863A';      // Deeper accent
    };
    midday: {
      primary: '#40B5AD';     // Calming teal for reset
      secondary: '#E0F2F1';   // Cool background
      accent: '#2C8A82';      // Deeper teal
    };
    evening: {
      primary: '#4A7C59';     // Grounding green for reflection
      secondary: '#E8F5E8';   // Soft green background
      accent: '#2D5016';      // Deep forest green
    };
  };
  
  accessibility: {
    high_contrast: boolean;
    font_scaling: 'system' | 'large' | 'extra-large';
    reduced_motion: boolean;
    color_blind_support: boolean;
  };
}

// Therapeutic Color Implementation
class TherapeuticColorService {
  getTimeBasedTheme(hour: number): Theme {
    if (hour >= 5 && hour < 12) return themes.morning;
    if (hour >= 12 && hour < 18) return themes.midday;
    return themes.evening;
  }
  
  // Crisis mode overrides with high-visibility colors
  getCrisisTheme(): Theme {
    return {
      primary: '#D32F2F',     // High-visibility red for crisis
      background: '#FFFFFF',  // Maximum contrast
      text: '#000000',        // Highest readability
    };
  }
}
```

**2. Interactive Components**
```typescript
// Button Component with Therapeutic UX
interface TherapeuticButtonProps {
  variant: 'primary' | 'secondary' | 'crisis' | 'subtle';
  size: 'small' | 'medium' | 'large' | 'crisis';
  haptic?: 'light' | 'medium' | 'heavy' | 'therapeutic';
  disabled?: boolean;
  loading?: boolean;
  accessibility_label: string;
  therapeutic_context?: 'assessment' | 'crisis' | 'mindfulness' | 'progress';
}

class TherapeuticButton extends React.Component<TherapeuticButtonProps> {
  handlePress = async () => {
    // Haptic feedback for therapeutic reinforcement
    if (this.props.haptic && Platform.OS === 'ios') {
      await this.triggerTherapeuticHaptic(this.props.haptic);
    }
    
    // Crisis button special handling
    if (this.props.variant === 'crisis') {
      await this.logCrisisButtonAccess();
      this.props.onPress();
      return;
    }
    
    this.props.onPress();
  };
  
  private async triggerTherapeuticHaptic(type: string): Promise<void> {
    // Therapeutic haptic patterns based on MBCT principles
    const patterns = {
      light: Haptics.ImpactFeedbackStyle.Light,      // Gentle confirmation
      therapeutic: Haptics.ImpactFeedbackStyle.Medium, // Mindful awareness
      crisis: Haptics.ImpactFeedbackStyle.Heavy      // Emergency attention
    };
    
    await Haptics.impactAsync(patterns[type]);
  }
}
```

**3. Assessment Components**
```typescript
// Clinical Assessment Form Components
interface ClinicalAssessmentProps {
  assessment_type: 'PHQ9' | 'GAD7';
  questions: AssessmentQuestion[];
  on_completion: (results: AssessmentResults) => void;
  accessibility_mode: boolean;
}

class ClinicalAssessmentForm extends React.Component<ClinicalAssessmentProps> {
  state = {
    responses: Array(this.props.questions.length).fill(null),
    current_question: 0,
    start_time: Date.now()
  };
  
  // Ensure 100% accurate scoring (ADR-002 requirement)
  calculateScore = (): number => {
    const valid_responses = this.state.responses.filter(r => r !== null);
    
    if (valid_responses.length !== this.props.questions.length) {
      throw new Error('Incomplete assessment - all questions required for accurate scoring');
    }
    
    return valid_responses.reduce((sum, response) => sum + response, 0);
  };
  
  // Crisis detection integration
  checkForCrisisIndicators = (score: number): CrisisDetection => {
    if (this.props.assessment_type === 'PHQ9') {
      // Suicidal ideation check (Question 9)
      const suicidal_ideation = this.state.responses[8];
      if (suicidal_ideation > 0 || score >= 20) {
        return { level: 'IMMEDIATE', triggers: ['SUICIDAL_IDEATION', 'SEVERE_DEPRESSION'] };
      }
    }
    
    if (this.props.assessment_type === 'GAD7' && score >= 15) {
      return { level: 'IMMEDIATE', triggers: ['SEVERE_ANXIETY'] };
    }
    
    return { level: 'STANDARD', triggers: [] };
  };
}
```

**4. Crisis Components**
```typescript
// Emergency Access Components
interface CrisisComponentProps {
  crisis_plan: CrisisPlan;
  emergency_contacts: EmergencyContact[];
  accessibility_priority: boolean; // Crisis components prioritize accessibility
}

class CrisisAccessComponent extends React.Component<CrisisComponentProps> {
  // Crisis button must be accessible within 3 taps from any screen
  renderCrisisButton = (): React.ReactNode => {
    return (
      <TouchableOpacity
        style={[styles.crisis_button, styles.high_visibility]}
        onPress={this.activateCrisisProtocol}
        accessibilityLabel="Emergency crisis support - double tap for immediate help"
        accessibilityRole="button"
        testID="crisis-button-global"
      >
        <Icon name="emergency" size={24} color="#FFFFFF" />
        <Text style={styles.crisis_text}>Crisis Support</Text>
      </TouchableOpacity>
    );
  };
  
  // <200ms response time requirement (ADR-002)
  activateCrisisProtocol = async (): Promise<void> => {
    const start_time = Date.now();
    
    // Pre-loaded crisis data for speed
    const crisis_plan = await this.getCachedCrisisPlan();
    const emergency_contacts = await this.getCachedEmergencyContacts();
    
    // Present crisis intervention options
    this.setState({
      crisis_mode_active: true,
      crisis_plan: crisis_plan,
      emergency_contacts: emergency_contacts
    });
    
    // Log response time for monitoring
    const response_time = Date.now() - start_time;
    await this.logCrisisResponseTime(response_time);
    
    // Activate crisis-specific UI changes
    await this.switchToCrisisTheme();
  };
  
  // Emergency contact integration
  callEmergencyContact = async (contact: EmergencyContact): Promise<void> => {
    const phone_url = `tel:${contact.phone}`;
    
    if (await Linking.canOpenURL(phone_url)) {
      await Linking.openURL(phone_url);
      await this.logEmergencyContactUsed(contact.id);
    } else {
      // Fallback: Copy number to clipboard
      await Clipboard.setString(contact.phone);
      Alert.alert('Phone number copied', `${contact.phone} copied to clipboard`);
    }
  };
}
```

## Data Architecture

### Local-First Data Model

Based on ADR-001 (Local-First Storage), FullMind uses a comprehensive local data architecture with encryption for sensitive mental health information:

```typescript
// Complete Data Schema
interface FullMindDataSchema {
  // Non-encrypted user preferences
  user_profile: {
    id: string;
    created_at: ISO8601DateTime;
    onboarding_completed: boolean;
    selected_values: string[]; // Core MBCT values
    notification_preferences: NotificationSettings;
    accessibility_preferences: AccessibilitySettings;
    theme_preferences: ThemeSettings;
    app_version: string;
    last_active: ISO8601DateTime;
  };
  
  // Encrypted clinical data (AES-256-GCM)
  clinical_data: EncryptedData<{
    assessments: Assessment[];
    crisis_plans: CrisisPlan[];
    sensitive_notes: Note[];
  }>;
  
  // Encrypted check-in data  
  checkin_data: EncryptedData<{
    daily_checkins: CheckIn[];
    mood_tracking: MoodEntry[];
    progress_metrics: ProgressData[];
  }>;
  
  // Emergency access data (optimized for <200ms access)
  emergency_cache: {
    crisis_plan_hash: string;
    emergency_contact_count: number;
    last_crisis_update: ISO8601DateTime;
    quick_access_enabled: boolean;
  };
}
```

### Data Models with Clinical Validation

**1. Assessment Data Models**
```typescript
// PHQ-9 Assessment with 100% clinical accuracy
interface PHQ9Assessment {
  id: string;
  completed_at: ISO8601DateTime;
  questions: [
    { text: "Little interest or pleasure in doing things", response: 0 | 1 | 2 | 3 },
    { text: "Feeling down, depressed, or hopeless", response: 0 | 1 | 2 | 3 },
    { text: "Trouble falling/staying asleep or sleeping too much", response: 0 | 1 | 2 | 3 },
    { text: "Feeling tired or having little energy", response: 0 | 1 | 2 | 3 },
    { text: "Poor appetite or overeating", response: 0 | 1 | 2 | 3 },
    { text: "Feeling bad about yourself or that you are a failure", response: 0 | 1 | 2 | 3 },
    { text: "Trouble concentrating on things", response: 0 | 1 | 2 | 3 },
    { text: "Moving or speaking slowly or being restless", response: 0 | 1 | 2 | 3 },
    { text: "Thoughts that you would be better off dead or hurting yourself", response: 0 | 1 | 2 | 3 }
  ];
  total_score: number; // 0-27, calculated with 100% accuracy
  severity_level: 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';
  crisis_detected: boolean;
  crisis_triggers: CrisisTrigger[];
  context: 'onboarding' | 'standalone' | 'crisis_followup';
}

// Scoring service with clinical validation
class PHQ9ScoringService {
  // Validated against clinical standards (Clinical Validation Report)
  calculateScore(responses: number[]): number {
    if (responses.length !== 9) {
      throw new Error('PHQ-9 requires exactly 9 responses');
    }
    
    if (responses.some(r => r < 0 || r > 3)) {
      throw new Error('PHQ-9 responses must be 0-3 scale');
    }
    
    return responses.reduce((sum, response) => sum + response, 0);
  }
  
  // Clinical severity determination
  getSeverityLevel(score: number): PHQ9Severity {
    if (score >= 0 && score <= 4) return 'minimal';
    if (score >= 5 && score <= 9) return 'mild';
    if (score >= 10 && score <= 14) return 'moderate';
    if (score >= 15 && score <= 19) return 'moderately_severe';
    if (score >= 20 && score <= 27) return 'severe';
    
    throw new Error(`Invalid PHQ-9 score: ${score}`);
  }
  
  // Crisis detection (ADR-002 thresholds)
  detectCrisis(assessment: PHQ9Assessment): CrisisDetection {
    const suicidal_ideation = assessment.questions[8].response;
    const total_score = assessment.total_score;
    
    if (suicidal_ideation > 0 || total_score >= 20) {
      return {
        level: 'IMMEDIATE',
        triggers: [
          suicidal_ideation > 0 ? 'SUICIDAL_IDEATION' : null,
          total_score >= 20 ? 'SEVERE_DEPRESSION' : null
        ].filter(Boolean),
        required_interventions: ['CRISIS_PLAN_ACCESS', 'EMERGENCY_CONTACTS', 'HOTLINE_988']
      };
    }
    
    return { level: 'STANDARD', triggers: [], required_interventions: [] };
  }
}
```

**2. MBCT Check-in Data Models**
```typescript
// Complete MBCT daily practice data structure
interface MBCTCheckInData {
  id: string;
  type: 'morning' | 'midday' | 'evening';
  started_at: ISO8601DateTime;
  completed_at?: ISO8601DateTime;
  skipped: boolean;
  completion_duration_seconds?: number;
  
  // Morning MBCT practice data
  morning_data?: {
    body_awareness: {
      selected_areas: BodyArea[];
      tension_level: number; // 1-10 scale
      awareness_quality: number; // 1-5 scale
    };
    emotional_awareness: {
      current_emotions: Emotion[];
      emotion_intensity: number; // 1-10 scale
      emotional_acceptance: number; // 1-5 scale
    };
    cognitive_awareness: {
      thought_patterns: ThoughtPattern[];
      rumination_level: number; // 1-10 scale
      decentering_practice: boolean;
    };
    intention_setting: {
      selected_value: string;
      daily_intention: string;
      commitment_level: number; // 1-5 scale
    };
    sleep_quality: number; // 1-10 scale
    energy_level: number; // 1-10 scale
    anxiety_level: number; // 1-10 scale
  };
  
  // Midday breathing space data
  midday_data?: {
    initial_state: {
      current_emotions: Emotion[];
      body_tension_areas: BodyArea[];
      stress_level: number; // 1-10 scale
    };
    breathing_practice: {
      completed: boolean;
      breath_count: number;
      focus_quality: number; // 1-5 scale
      interruptions: number;
    };
    awareness_expansion: {
      pleasant_event?: string;
      unpleasant_event?: string;
      identified_need?: string;
      approach_mode_activated: boolean;
    };
  };
  
  // Evening reflection data
  evening_data?: {
    day_review: {
      overall_mood: number; // 1-10 scale
      energy_management: number; // 1-10 scale
      values_alignment: number; // 1-10 scale
    };
    event_processing: {
      pleasant_events: string[];
      unpleasant_events: string[];
      learning_insights: string;
    };
    cognitive_patterns: {
      identified_patterns: ThoughtPattern[];
      automatic_thoughts: string[];
      mindful_responses: string[];
    };
    future_orientation: {
      tomorrow_intention: string;
      tomorrow_reminder: string;
      hope_level: number; // 1-5 scale
    };
  };
}
```

**3. Crisis Management Data Models**
```typescript
// Comprehensive crisis planning data structure
interface CrisisPlanData {
  id: string;
  created_at: ISO8601DateTime;
  last_updated: ISO8601DateTime;
  is_active: boolean;
  
  // Early warning system
  warning_signs: {
    emotional_signs: string[];
    behavioral_signs: string[];
    physical_signs: string[];
    cognitive_signs: string[];
    social_signs: string[];
  };
  
  // Coping strategies (evidence-based)
  coping_strategies: {
    immediate_strategies: string[];
    breathing_techniques: string[];
    grounding_exercises: string[];
    mindfulness_practices: string[];
    physical_activities: string[];
  };
  
  // Support network
  support_network: {
    emergency_contacts: EmergencyContact[];
    professional_contacts: ProfessionalContact[];
    crisis_hotlines: CrisisHotline[];
    trusted_friends: TrustedContact[];
  };
  
  // Safety planning
  safety_measures: {
    means_restriction: string[];
    safe_environment_tips: string[];
    recovery_reminders: string[];
    reasons_for_living: string[];
  };
  
  // Crisis plan effectiveness tracking
  usage_tracking: {
    last_accessed: ISO8601DateTime;
    access_count: number;
    effectiveness_rating?: number; // 1-5 scale
    user_feedback?: string;
  };
}

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  priority: number; // 1 = highest priority
  available_hours?: string;
  notes?: string;
  last_contacted?: ISO8601DateTime;
}
```

### Data Encryption Architecture

```typescript
// AES-256-GCM Encryption Implementation
class ClinicalDataEncryption {
  private encryption_key: CryptoKey;
  private crisis_access_key: CryptoKey; // Cached for <200ms access
  
  // Initialize encryption with device-based key derivation
  async initializeEncryption(): Promise<void> {
    const device_salt = await this.getOrCreateDeviceSalt();
    const user_entropy = await this.getUserEntropySource();
    
    this.encryption_key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: device_salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      user_entropy,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    // Pre-generate crisis access key for emergency speed
    this.crisis_access_key = await this.deriveCrisisKey();
  }
  
  // Encrypt sensitive assessment data
  async encryptAssessment(assessment: Assessment): Promise<EncryptedAssessment> {
    const assessment_json = JSON.stringify(assessment);
    const encoded_data = new TextEncoder().encode(assessment_json);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted_data = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      this.encryption_key,
      encoded_data
    );
    
    return {
      encrypted_data: Array.from(new Uint8Array(encrypted_data)),
      iv: Array.from(iv),
      timestamp: new Date().toISOString(),
      data_type: 'assessment',
      checksum: await this.generateChecksum(assessment_json)
    };
  }
  
  // Emergency decryption for crisis access (<200ms target)
  async emergencyDecryptCrisisPlan(encrypted_data: EncryptedData): Promise<CrisisPlan> {
    const start_time = Date.now();
    
    const encrypted_buffer = new Uint8Array(encrypted_data.encrypted_data);
    const iv = new Uint8Array(encrypted_data.iv);
    
    const decrypted_data = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      this.crisis_access_key, // Pre-cached for speed
      encrypted_buffer
    );
    
    const decrypted_json = new TextDecoder().decode(decrypted_data);
    const crisis_plan = JSON.parse(decrypted_json);
    
    const decrypt_time = Date.now() - start_time;
    await this.logCrisisAccessTime(decrypt_time);
    
    return crisis_plan;
  }
}
```

### Data Persistence Patterns

```typescript
// AsyncStorage wrapper with encryption integration
class SecureAsyncStorage {
  private encryption_service: ClinicalDataEncryption;
  private storage_keys = {
    USER_PROFILE: '@fullmind_user_v1',
    ASSESSMENTS: '@fullmind_assessments_encrypted_v1',
    CHECKINS: '@fullmind_checkins_encrypted_v1',
    CRISIS_PLAN: '@fullmind_crisis_encrypted_v1',
    EMERGENCY_CACHE: '@fullmind_emergency_cache_v1'
  };
  
  // Save encrypted clinical data
  async saveAssessment(assessment: Assessment): Promise<void> {
    try {
      const encrypted_assessment = await this.encryption_service.encryptAssessment(assessment);
      
      // Get existing assessments
      const existing_assessments = await this.getAssessments();
      existing_assessments.push(encrypted_assessment);
      
      // Maintain 90-day retention for performance
      const ninety_days_ago = new Date();
      ninety_days_ago.setDate(ninety_days_ago.getDate() - 90);
      
      const filtered_assessments = existing_assessments.filter(a => 
        new Date(a.timestamp) > ninety_days_ago
      );
      
      await AsyncStorage.setItem(
        this.storage_keys.ASSESSMENTS,
        JSON.stringify(filtered_assessments)
      );
      
      // Update emergency cache if crisis detected
      const crisis_detection = await this.checkAssessmentForCrisis(assessment);
      if (crisis_detection.level !== 'STANDARD') {
        await this.updateEmergencyCache(crisis_detection);
      }
      
    } catch (error) {
      throw new Error(`Failed to save assessment: ${error.message}`);
    }
  }
  
  // Quick access patterns for crisis scenarios
  async getCrisisPlanQuickAccess(): Promise<CrisisPlan> {
    const start_time = Date.now();
    
    // Try emergency cache first
    const cache_data = await AsyncStorage.getItem(this.storage_keys.EMERGENCY_CACHE);
    if (cache_data) {
      const cache = JSON.parse(cache_data);
      if (cache.crisis_plan_cached) {
        const access_time = Date.now() - start_time;
        await this.logEmergencyAccessTime(access_time, 'cache');
        return cache.crisis_plan;
      }
    }
    
    // Fallback to encrypted storage
    const encrypted_crisis = await AsyncStorage.getItem(this.storage_keys.CRISIS_PLAN);
    if (!encrypted_crisis) {
      throw new Error('No crisis plan found - user should be prompted to create one');
    }
    
    const crisis_plan = await this.encryption_service.emergencyDecryptCrisisPlan(
      JSON.parse(encrypted_crisis)
    );
    
    const total_time = Date.now() - start_time;
    await this.logEmergencyAccessTime(total_time, 'encrypted');
    
    return crisis_plan;
  }
  
  // Data export for clinical sharing or backup
  async exportAllData(include_sensitive: boolean = false): Promise<ExportPackage> {
    const user_profile = await this.getUserProfile();
    const checkins = await this.getCheckInHistory();
    
    let assessments = null;
    let crisis_plan = null;
    
    if (include_sensitive) {
      assessments = await this.getDecryptedAssessments();
      crisis_plan = await this.getDecryptedCrisisPlan();
    }
    
    const export_data = {
      export_metadata: {
        timestamp: new Date().toISOString(),
        app_version: await this.getAppVersion(),
        includes_sensitive_data: include_sensitive,
        export_reason: 'user_initiated',
        data_retention_notice: 'User maintains full control of exported data'
      },
      user_profile: user_profile,
      checkin_history: checkins,
      assessments: assessments,
      crisis_plan: crisis_plan,
      audit_trail: await this.getExportAuditTrail()
    };
    
    return {
      json: JSON.stringify(export_data, null, 2),
      csv: await this.generateCSVSummary(export_data),
      pdf: await this.generateClinicalReport(export_data)
    };
  }
}
```

## Performance Architecture

### Mental Health UX Performance Requirements

Based on our performance analysis for therapeutic applications, FullMind maintains strict performance benchmarks:

```typescript
// Performance Requirements for Mental Health UX
interface PerformanceTargets {
  crisis_intervention: {
    emergency_button_response: '<200ms';
    crisis_plan_access: '<500ms';
    emergency_contact_dial: '<300ms';
    hotline_integration: '<200ms';
  };
  
  therapeutic_flows: {
    check_in_start: '<300ms';
    assessment_question_transitions: '<150ms';
    mindfulness_audio_start: '<400ms';
    haptic_feedback_delay: '<50ms';
  };
  
  app_lifecycle: {
    cold_start: '<3s';
    warm_start: '<1s';
    background_to_foreground: '<500ms';
    data_save_operations: '<200ms';
  };
  
  memory_efficiency: {
    baseline_memory: '<100MB';
    during_check_in: '<150MB';
    peak_usage: '<200MB';
    memory_leak_tolerance: '0MB/hour';
  };
}
```

### Performance Optimization Strategies

**1. Crisis-Optimized Performance**
```typescript
class CrisisPerformanceOptimization {
  // Pre-load crisis data for instant access
  async preloadCrisisData(): Promise<void> {
    // Cache unencrypted crisis plan hash for instant verification
    const crisis_plan = await this.getCrisisPlan();
    if (crisis_plan) {
      this.crisis_cache = {
        plan_exists: true,
        emergency_contact_count: crisis_plan.support_network.emergency_contacts.length,
        last_update: crisis_plan.last_updated,
        quick_access_data: await this.prepareCrisisQuickAccess(crisis_plan)
      };
    }
  }
  
  // Background pre-warming for crisis scenarios
  async backgroundWarmCrisisServices(): Promise<void> {
    // Pre-initialize encryption keys
    await this.encryption_service.warmCrisisDecryptionKey();
    
    // Pre-validate emergency contact numbers
    await this.validateEmergencyContacts();
    
    // Pre-test haptic capabilities
    if (Platform.OS === 'ios') {
      await Haptics.prepareAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }
}
```

**2. Memory-Efficient Data Management**
```typescript
class MemoryEfficientDataService {
  // Lazy loading for non-critical historical data
  async getCheckInHistory(
    days: number = 7,
    load_details: boolean = false
  ): Promise<CheckIn[]> {
    
    // Always load summary data (fast)
    const summary_data = await this.getCheckInSummaries(days);
    
    if (!load_details) {
      return summary_data;
    }
    
    // Load full details only when needed
    const detailed_data = await Promise.all(
      summary_data.map(async (summary) => {
        return await this.getCheckInDetails(summary.id);
      })
    );
    
    return detailed_data;
  }
  
  // Automatic memory cleanup for long-running sessions
  async performMemoryCleanup(): Promise<void> {
    // Clear old cached data
    this.clearExpiredCache();
    
    // Garbage collect large objects
    if (global.gc) {
      global.gc();
    }
    
    // Re-optimize data structures
    await this.optimizeInMemoryStructures();
  }
}
```

**3. Therapeutic Animation Performance**
```typescript
class TherapeuticAnimationOptimization {
  // Smooth 60fps animations for mindfulness practices
  createBreathingAnimation(): Animated.Value {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(this.breathScale, {
          toValue: 1.2,
          duration: 4000, // 4 second inhale
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true // GPU acceleration
        }),
        Animated.timing(this.breathScale, {
          toValue: 1.0,
          duration: 4000, // 4 second exhale
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true
        })
      ])
    );
  }
  
  // Hardware-accelerated mood visualization
  createMoodVisualization(mood_data: MoodEntry[]): React.Component {
    return (
      <Animated.View
        style={[
          styles.mood_chart,
          {
            transform: [
              { scale: this.mood_scale },
              { rotate: this.mood_rotation }
            ]
          }
        ]}
      >
        {/* Use react-native-svg for complex visualizations */}
        <Svg width="100%" height="200">
          {mood_data.map((entry, index) => (
            <AnimatedCircle
              key={entry.id}
              cx={this.getMoodX(index)}
              cy={this.getMoodY(entry.value)}
              r={this.getMoodRadius(entry.intensity)}
              fill={this.getMoodColor(entry.emotion)}
            />
          ))}
        </Svg>
      </Animated.View>
    );
  }
}
```

### Performance Monitoring

```typescript
class PerformanceMonitoringService {
  // Real-time performance tracking
  async trackOperationPerformance(
    operation: string,
    execution_function: () => Promise<any>
  ): Promise<any> {
    const start_time = Date.now();
    const start_memory = await this.getCurrentMemoryUsage();
    
    try {
      const result = await execution_function();
      
      const end_time = Date.now();
      const end_memory = await this.getCurrentMemoryUsage();
      
      await this.logPerformanceMetric({
        operation: operation,
        duration_ms: end_time - start_time,
        memory_delta: end_memory - start_memory,
        success: true,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      const end_time = Date.now();
      
      await this.logPerformanceMetric({
        operation: operation,
        duration_ms: end_time - start_time,
        memory_delta: 0,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  // Performance alerting for critical thresholds
  async checkPerformanceThresholds(): Promise<PerformanceAlert[]> {
    const alerts = [];
    
    // Crisis response time monitoring
    const crisis_times = await this.getCrisisResponseTimes(24); // Last 24 hours
    const avg_crisis_time = this.calculateAverage(crisis_times);
    
    if (avg_crisis_time > 200) {
      alerts.push({
        type: 'CRITICAL',
        message: 'Crisis response time exceeding 200ms target',
        current_value: avg_crisis_time,
        target_value: 200,
        action_required: 'Immediate optimization needed'
      });
    }
    
    // Memory usage monitoring
    const current_memory = await this.getCurrentMemoryUsage();
    if (current_memory > 150 * 1024 * 1024) { // 150MB
      alerts.push({
        type: 'WARNING',
        message: 'Memory usage approaching limits',
        current_value: current_memory,
        target_value: 150 * 1024 * 1024,
        action_required: 'Memory cleanup recommended'
      });
    }
    
    return alerts;
  }
}
```

## Scalability and Future Architecture

### Phase 2 Migration Architecture

Based on ADR-001 and ADR-003, FullMind has clear migration paths for enhanced features:

```typescript
// Phase 2 Architecture Evolution
interface Phase2Architecture {
  data_layer_migration: {
    from: 'AsyncStorage with encryption';
    to: 'SQLite with encryption + optional sync';
    trigger: 'User reaches 1000+ check-ins OR requests advanced insights';
    benefits: ['Complex querying', 'Pattern analysis', 'Multi-device sync'];
  };
  
  sync_capabilities: {
    model: 'End-to-end encrypted, user-controlled';
    features: ['Multi-device access', 'Therapist collaboration', 'Family crisis sharing'];
    privacy: 'Zero-knowledge server architecture';
  };
  
  ai_enhancements: {
    local_processing: 'On-device ML for pattern recognition';
    cloud_processing: 'Optional advanced analytics with user consent';
    therapeutic_ai: 'Personalized MBCT practice recommendations';
  };
}
```

### Microservices Evolution Path

```typescript
// Future backend architecture (Phase 3+)
interface FutureBackendArchitecture {
  authentication_service: {
    purpose: 'User identity and device management';
    privacy: 'Zero-knowledge authentication';
    features: ['Multi-device keys', 'Recovery options', 'Family sharing'];
  };
  
  sync_service: {
    purpose: 'Encrypted data synchronization';
    encryption: 'Client-side only, server stores encrypted blobs';
    features: ['Conflict resolution', 'Selective sync', 'Version control'];
  };
  
  insights_service: {
    purpose: 'Advanced pattern analysis and AI recommendations';
    privacy: 'Opt-in with anonymized data processing';
    features: ['Trend analysis', 'Predictive insights', 'Personalized interventions'];
  };
  
  collaboration_service: {
    purpose: 'Therapist and family crisis sharing';
    security: 'End-to-end encrypted with granular permissions';
    features: ['Therapist portals', 'Crisis plan sharing', 'Progress reports'];
  };
}
```

### Technology Evolution Monitoring

```typescript
// Future technology integration opportunities
interface TechnologyEvolution {
  ai_advancements: {
    on_device_ml: 'TensorFlow Lite for local pattern recognition';
    large_language_models: 'Local LLMs for therapeutic conversation';
    computer_vision: 'Mood detection from user selfies (opt-in)';
  };
  
  platform_capabilities: {
    apple_health_integration: 'Sleep and activity correlation with mood';
    google_fit_integration: 'Android health data integration';
    wearable_devices: 'Heart rate variability for stress detection';
  };
  
  emerging_standards: {
    fhir_compliance: 'Healthcare data interoperability';
    web3_health_data: 'User-owned health records';
    quantum_encryption: 'Future-proof data protection';
  };
}
```

## Related Architecture Documents

### Core Architecture Decisions
- **ADR-001**: Local-First Storage Architecture - Foundation for offline-first design
- **ADR-002**: Crisis Detection Thresholds - Evidence-based safety protocols
- **ADR-003**: Offline-First Design - Comprehensive offline architecture with sync strategy

### Implementation References
- **TRD v2.0**: React Native technical implementation details
- **Design Library v1.1**: Component system and therapeutic UX patterns
- **Clinical Validation Report**: Assessment accuracy and crisis detection validation

### Security and Compliance
- **Security Implementation Guide**: AES-256 encryption and key management
- **Privacy Impact Assessment**: Mental health data protection analysis
- **HIPAA Compliance Review**: Healthcare regulatory compliance architecture

### Performance and Quality
- **Performance Benchmarking Report**: Response time validation and optimization
- **Accessibility Compliance Guide**: WCAG AA implementation for mental health users
- **User Testing Results**: Real-world validation of architectural decisions

---

*This comprehensive system design document establishes the complete architecture for a clinical-grade mental health application that prioritizes user safety, privacy, and therapeutic effectiveness while maintaining the flexibility for future enhancements and collaborative features.*