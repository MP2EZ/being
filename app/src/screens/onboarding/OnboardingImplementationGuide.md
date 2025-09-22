# Therapeutic Onboarding Flow - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the Therapeutic Onboarding Flow in the Being. MBCT app, ensuring clinical safety, MBCT compliance, and seamless integration with existing infrastructure.

## Implementation Phases

### Phase 1: Core Infrastructure Setup (Priority 1 - Critical)

#### 1.1 Type Integration
```bash
# Types already added to src/types.ts
# Verify integration with existing assessment and user stores
npm run type-check
```

#### 1.2 Crisis Integration Points
**Required Updates to Crisis Management:**

```typescript
// Update crisis detection service to handle onboarding context
interface OnboardingCrisisContext {
  isOnboarding: true;
  stepId: string;
  assessmentType?: 'phq9' | 'gad7';
  hasEmergencyContacts: boolean;
  userConsentLevel: 'basic' | 'full';
}

// Add to CrisisDetectionService
export const detectOnboardingCrisis = async (
  context: OnboardingCrisisContext,
  assessmentData: any
): Promise<CrisisDetectionResult> => {
  // Enhanced crisis detection for onboarding users
  // More sensitive triggers during vulnerable onboarding period
  // Ensure emergency contacts are prompted if not set
};
```

#### 1.3 Assessment Store Integration
**Required Updates:**

```typescript
// Add onboarding context to assessment store
interface AssessmentStore {
  // Existing methods...

  // New onboarding-specific methods
  startOnboardingAssessment: (type: 'phq9' | 'gad7') => void;
  handleOnboardingCrisis: (context: OnboardingCrisisContext) => void;
  getOnboardingBaselineResults: () => { phq9?: Assessment; gad7?: Assessment };
}
```

### Phase 2: Component Integration (Priority 1 - Critical)

#### 2.1 Replace Existing Onboarding Placeholder

```typescript
// Update navigation to use new onboarding flow
// In your navigation stack:

import { TherapeuticOnboardingFlow } from '../screens/onboarding/TherapeuticOnboardingFlow';

// Replace OnboardingPlaceholder with TherapeuticOnboardingFlow
const OnboardingStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="TherapeuticOnboarding"
      component={TherapeuticOnboardingFlow}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);
```

#### 2.2 User Store Integration

```typescript
// Add onboarding data to user profile
interface UserProfile {
  // Existing fields...

  onboardingData?: OnboardingData;
  onboardingProgress?: OnboardingProgress;
  baselineAssessments?: {
    phq9?: Assessment;
    gad7?: Assessment;
    completedAt?: string;
  };
}

// Update UserStore actions
const updateOnboardingData = (data: Partial<OnboardingData>) => {
  // Encrypt and store onboarding data
  // Update user profile with completion status
};
```

### Phase 3: Clinical Safety Implementation (Priority 1 - Critical)

#### 3.1 Crisis Button Integration

**Verify Crisis Button Performance:**
```typescript
// Test crisis button response time during onboarding
describe('Crisis Button Onboarding Performance', () => {
  it('should respond in <200ms during onboarding', async () => {
    const startTime = performance.now();
    await crisisButton.press();
    const responseTime = performance.now() - startTime;
    expect(responseTime).toBeLessThan(200);
  });
});
```

#### 3.2 Assessment Crisis Detection

**Enhanced Crisis Detection for Onboarding:**
```typescript
// Modify assessment store to handle onboarding crisis detection
const handleOnboardingAssessmentCrisis = async (
  assessmentType: 'phq9' | 'gad7',
  answers: number[],
  questionIndex: number
) => {
  // More sensitive crisis detection during onboarding
  // Immediate intervention for suicidal ideation (PHQ-9 Q9)
  // Enhanced safety messaging for new users
  // Prompt for emergency contacts if not set
};
```

#### 3.3 Emergency Contact Integration

**Required Data Flow:**
```typescript
// Emergency contacts from onboarding -> crisis plan
const integrateEmergencyContacts = (
  onboardingContacts: OnboardingEmergencyContact[]
): EmergencyContact[] => {
  return onboardingContacts.map(contact => ({
    id: generateId(),
    name: contact.name,
    relationship: contact.relationship,
    phone: contact.phone,
    isPrimary: contact.isPrimary
  }));
};
```

### Phase 4: MBCT Practice Integration (Priority 2)

#### 4.1 Breathing Practice Component

**Component Integration:**
```typescript
// Integrate BreathingPracticeIntro with onboarding step 6
import { BreathingPracticeIntro } from '../../components/onboarding/BreathingPracticeIntro';

// In PracticeIntroductionStep component:
const [showBreathingPractice, setShowBreathingPractice] = useState(false);

// Replace placeholder with actual component
{showBreathingPractice && (
  <BreathingPracticeIntro
    onComplete={() => {
      setPracticeData({ ...practiceData, hasCompletedBreathing: true });
      setShowBreathingPractice(false);
    }}
    onSkip={() => setShowBreathingPractice(false)}
  />
)}
```

#### 4.2 MBCT Content Validation

**Clinical Review Required:**
- Verify all MBCT terminology accuracy
- Confirm breathing practice instructions align with clinical standards
- Validate therapeutic language throughout flow
- Ensure non-judgmental, self-compassionate messaging

### Phase 5: Data Persistence and Security (Priority 1 - Critical)

#### 5.1 Encrypted Storage Implementation

```typescript
// Onboarding data encryption
const encryptedOnboardingStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const encryptedData = await AsyncStorage.getItem(name);
    if (!encryptedData) return null;

    const decrypted = await encryptionService.decryptData(
      JSON.parse(encryptedData),
      DataSensitivity.CLINICAL  // Highest security for onboarding data
    );
    return JSON.stringify(decrypted);
  },

  setItem: async (name: string, value: string): Promise<void> => {
    const data = JSON.parse(value);
    const encrypted = await encryptionService.encryptData(
      data,
      DataSensitivity.CLINICAL
    );
    await AsyncStorage.setItem(name, JSON.stringify(encrypted));
  }
};
```

#### 5.2 Data Flow Integration

**Onboarding Completion Handler:**
```typescript
const completeOnboarding = async (onboardingData: OnboardingData) => {
  try {
    // 1. Save baseline assessments to assessment store
    if (onboardingData.baselineAssessments.phq9) {
      await saveAssessment(onboardingData.baselineAssessments.phq9);
    }
    if (onboardingData.baselineAssessments.gad7) {
      await saveAssessment(onboardingData.baselineAssessments.gad7);
    }

    // 2. Create crisis plan with emergency contacts
    if (onboardingData.emergencyContacts.length > 0) {
      await createCrisisPlan({
        emergencyContacts: integrateEmergencyContacts(onboardingData.emergencyContacts),
        // ... other crisis plan data
      });
    }

    // 3. Update user profile with therapeutic preferences
    await updateProfile({
      onboardingCompleted: true,
      onboardingData,
      preferences: {
        ...onboardingData.therapeuticPreferences,
        haptics: onboardingData.mbctIntroduction.practicePreferences.hapticFeedback
      },
      notifications: {
        enabled: onboardingData.therapeuticPreferences.notifications.enabled,
        // Map time preferences to notification schedule
        morning: onboardingData.therapeuticPreferences.timeOfDay.includes('morning') ? '08:00' : null,
        midday: onboardingData.therapeuticPreferences.timeOfDay.includes('midday') ? '13:00' : null,
        evening: onboardingData.therapeuticPreferences.timeOfDay.includes('evening') ? '20:00' : null
      }
    });

    // 4. Initialize personalized content based on baseline assessments
    await initializePersonalizedContent(onboardingData);

  } catch (error) {
    console.error('Failed to complete onboarding:', error);
    // Handle graceful degradation
  }
};
```

### Phase 6: Accessibility and User Experience (Priority 2)

#### 6.1 Accessibility Validation

**Required Testing:**
```bash
# Screen reader compatibility testing
npm run test:accessibility

# Crisis button accessibility under stress
npm run test:crisis-accessibility

# Keyboard navigation testing
npm run test:keyboard-navigation
```

#### 6.2 Performance Optimization

**Critical Performance Metrics:**
- Onboarding step transitions: <500ms
- Crisis button response: <200ms
- Assessment loading: <300ms
- Breathing practice animation: 60fps

```typescript
// Performance monitoring for onboarding
const monitorOnboardingPerformance = () => {
  const startTime = performance.now();

  return {
    measureStepTransition: () => {
      const time = performance.now() - startTime;
      if (time > 500) {
        console.warn('Onboarding step transition too slow:', time);
      }
    }
  };
};
```

### Phase 7: Testing and Validation (Priority 1 - Critical)

#### 7.1 Clinical Accuracy Testing

```typescript
// Test suite for onboarding clinical accuracy
describe('Onboarding Clinical Accuracy', () => {
  describe('Crisis Detection', () => {
    it('should detect PHQ-9 suicidal ideation immediately', async () => {
      // Test Q9 response ≥1 triggers immediate intervention
    });

    it('should detect severe depression/anxiety thresholds', async () => {
      // Test PHQ-9 ≥20, GAD-7 ≥15 trigger enhanced safety
    });
  });

  describe('MBCT Content', () => {
    it('should use accurate MBCT terminology', () => {
      // Validate clinical accuracy of all content
    });

    it('should maintain therapeutic language standards', () => {
      // Test non-judgmental, empowering language
    });
  });

  describe('Data Security', () => {
    it('should encrypt all onboarding data', async () => {
      // Test encryption of sensitive onboarding information
    });
  });
});
```

#### 7.2 User Journey Testing

```typescript
// End-to-end onboarding flow testing
describe('Complete Onboarding Journey', () => {
  it('should complete full onboarding flow safely', async () => {
    // Test entire onboarding process
    // Verify crisis safety at each step
    // Confirm data persistence and encryption
    // Validate smooth transition to main app
  });

  it('should handle crisis scenarios appropriately', async () => {
    // Test crisis detection and intervention
    // Verify immediate resource access
    // Confirm enhanced safety for at-risk users
  });
});
```

## Deployment Considerations

### Pre-Deployment Checklist

#### Clinical Safety ✅
- [ ] Crisis detection functioning correctly
- [ ] Emergency resources up-to-date and accessible
- [ ] Assessment scoring 100% accurate
- [ ] Crisis button <200ms response time
- [ ] Professional care messaging clear and prominent

#### MBCT Compliance ✅
- [ ] All therapeutic content clinically reviewed
- [ ] MBCT terminology accurate and appropriate
- [ ] Non-judgmental language throughout
- [ ] Self-compassion messaging integrated
- [ ] Evidence-based practice references accurate

#### Data Security ✅
- [ ] All onboarding data encrypted at rest
- [ ] No sensitive data transmitted over network
- [ ] User consent clearly obtained and documented
- [ ] Data deletion capabilities implemented

#### User Experience ✅
- [ ] Accessibility compliance (WCAG AA)
- [ ] Performance metrics met
- [ ] Error handling graceful
- [ ] User control and autonomy preserved

### Post-Deployment Monitoring

#### Key Metrics to Track
- Onboarding completion rates by step
- Crisis detection accuracy and response times
- User feedback on therapeutic content
- Assessment data quality and completeness
- Emergency contact setup rates

#### Clinical Quality Assurance
- Monthly crisis resource verification
- Quarterly MBCT content accuracy review
- Ongoing therapeutic language assessment
- User safety feedback monitoring

## Support and Maintenance

### Ongoing Clinical Updates
- Crisis hotline information updates as needed
- MBCT content revisions based on latest research
- Therapeutic language improvements from user feedback
- Assessment scoring algorithm validation

### Technical Maintenance
- Performance monitoring and optimization
- Security vulnerability assessments
- Accessibility compliance verification
- Data encryption algorithm updates

## Conclusion

This implementation guide provides a comprehensive roadmap for integrating the Therapeutic Onboarding Flow into the Being. MBCT app while maintaining the highest standards of clinical safety, therapeutic effectiveness, and user experience. Each phase builds on the previous foundation, ensuring a robust and clinically appropriate onboarding experience for users beginning their MBCT journey.