# FullMind MBCT App Configuration

## Project Context
Mobile app delivering clinical-grade MBCT practices
- Version: v1.7 prototype complete
- Target: App stores in 8 weeks
- Stack: React Native, Expo, TypeScript, Zustand

## Specialized Agent Configuration

### Domain-Specific Agents (USE PROACTIVELY)

**clinician**: Validates therapeutic content, check-in flows, and clinical language for MBCT compliance and effectiveness
- Trigger: Any changes to PHQ-9/GAD-7 content, therapeutic language, or assessment flows
- Validation: MBCT compliance, clinical terminology accuracy, therapeutic effectiveness
- Required for: Assessment screens, crisis detection, mood tracking language

**compliance**: Ensures regulatory compliance, privacy protection, and legal adherence for mental health data handling
- Trigger: Data collection features, privacy policies, user consent flows
- Validation: HIPAA compliance (where applicable), data protection, healthcare app regulations
- Required for: AsyncStorage data handling, user data collection, app store compliance

**crisis**: Validates crisis intervention protocols, safety detection mechanisms, and emergency response workflows
- Trigger: PHQ-9/GAD-7 crisis thresholds, emergency contact features, safety protocols
- Validation: Crisis detection accuracy, response time requirements, safety protocols
- Required for: Assessment scoring, crisis button functionality, emergency workflows

**accessibility**: Comprehensive accessibility assessment and inclusive design for mental health users
- Trigger: UI components, navigation flows, interactive elements
- Validation: WCAG AA compliance, screen reader compatibility, inclusive design
- Required for: All user-facing components, especially crisis and assessment flows

### When to Use Specialized Agents
- **Before implementing**: Any assessment, crisis, or therapeutic content
- **During development**: Regular validation of clinical accuracy and compliance
- **Before deployment**: Comprehensive accessibility and compliance review

## Critical Requirements

⚠️ NEVER MODIFY WITHOUT APPROVAL:
- PHQ-9/GAD-7 exact clinical wording
- Scoring algorithms (100% accuracy required)
- Crisis hotline: 988
- 3-minute breathing timing (exactly 60s per step)

### Clinical Accuracy Standards
- **Assessment Scoring**: Zero tolerance for calculation errors in PHQ-9/GAD-7
- **Crisis Detection**: Automatic triggering at clinical thresholds (PHQ-9 ≥20, GAD-7 ≥15)
- **Therapeutic Language**: MBCT-compliant terminology only, validated by clinician agent
- **Data Validation**: 100% accuracy on mood tracking algorithms and check-in flows
- **Response Times**: Crisis button accessible in <3 seconds from any screen

### Compliance & Privacy Standards
- **Data Encryption**: AsyncStorage must encrypt all sensitive mood and assessment data
- **Network Restrictions**: No personal/health data transmitted over network in Phase 1
- **User Consent**: Clear opt-in for all data collection with granular controls
- **Crisis Protocols**: Emergency contact integration without logging personal data
- **HIPAA Awareness**: Design patterns that support future HIPAA compliance

## Performance Baselines for Mental Health UX

### Critical Performance Requirements
- **Breathing Circle Animation**: Consistent 60fps during 3-minute sessions
- **Check-in Flow Transitions**: <500ms between steps to maintain therapeutic flow
- **Crisis Button Response**: <200ms from tap to crisis screen display
- **App Launch Time**: <2 seconds to home screen for immediate access
- **Assessment Loading**: <300ms to load PHQ-9/GAD-7 screens

### Memory & Storage
- **AsyncStorage Efficiency**: Optimized for frequent mood data writes
- **Bundle Size Awareness**: Monitor impact of therapeutic content on app size
- **Background Processing**: Maintain breathing timer accuracy during backgrounding

## Healthcare-Specific Testing Requirements

### Clinical Accuracy Testing (100% Coverage Required)
```yaml
Assessment Flows:
  - PHQ-9: All 27 possible score combinations validated
  - GAD-7: All 21 possible score combinations validated  
  - Crisis Detection: Automatic triggering at thresholds
  - Score Persistence: Accurate storage and retrieval from AsyncStorage

Crisis Management:
  - Emergency Button: <3 second access from every screen
  - Hotline Integration: 988 calling functionality
  - Crisis Plan: User-defined safety plan creation and access
  
Therapeutic Accuracy:
  - Breathing Timing: Exactly 60s per step (180s total)
  - Check-in Completeness: All required fields captured
  - Progress Tracking: Accurate mood trend calculations
```

### Cross-Platform Parity Testing
- **iOS/Android UX**: Identical user experience and therapeutic effectiveness
- **Device Compatibility**: Testing across screen sizes for accessibility
- **Performance Consistency**: Same response times across platforms

### Accessibility Compliance (WCAG AA)
- **Screen Reader**: Full compatibility with VoiceOver/TalkBack
- **Color Contrast**: 4.5:1 minimum for all therapeutic content
- **Touch Targets**: Minimum 44px for crisis and assessment interactions
- **Focus Management**: Logical tab order through all flows

## State Management Patterns (Zustand)

### Health Data Stores Organization
```typescript
// Separate stores for different data sensitivity levels
userStore: Profile, preferences, non-clinical settings
checkInStore: Daily mood data, check-in responses  
assessmentStore: PHQ-9/GAD-7 scores, clinical data
crisisStore: Emergency contacts, safety plans
```

### Data Persistence Patterns
- **Automatic Save**: All mood data persisted immediately after collection
- **Encryption**: Sensitive assessment data encrypted before AsyncStorage
- **Backup Strategy**: Local backup of critical crisis information
- **Data Integrity**: Validation on read/write operations

### Error Handling for Clinical Flows
- **Assessment Errors**: Graceful handling without data loss
- **Crisis Flow Errors**: Fallback to emergency protocols
- **Storage Errors**: User notification with retry mechanisms
- **Network Errors**: Full offline mode functionality

## App Store & Deployment Standards

### Healthcare App Compliance
- **App Store Guidelines**: Mental health app specific requirements
- **Medical Device Considerations**: Ensure app doesn't qualify as medical device
- **Age Restrictions**: Appropriate ratings for mental health content
- **Content Warnings**: Clear disclosure of mental health focus

### Beta Testing Protocols
- **TestFlight/Play Beta**: Gradual rollout with clinical oversight
- **Feedback Collection**: Structured feedback on therapeutic effectiveness
- **Crisis Testing**: Real-world validation of emergency protocols
- **User Research**: MBCT practitioners and mental health professionals

### Version Control for Clinical Accuracy
```yaml
Critical Changes Require:
  - Clinician agent validation
  - Compliance agent review  
  - Crisis agent testing
  - Full regression testing of assessment flows

Branch Protection:
  - Main branch: Requires clinical accuracy validation
  - Release branches: Full accessibility and compliance review
  - Hotfix branches: Expedited but still validated
```

## Component Themes
```typescript
themes: {
  morning: { primary: '#FF9F43', success: '#E8863A' },
  midday: { primary: '#40B5AD', success: '#2C8A82' },
  evening: { primary: '#4A7C59', success: '#2D5016' }
}
```

## Current Sprint Focus
- [ ] Port remaining components from Design Library v1.1
- [ ] Implement offline mode with AsyncStorage encryption
- [ ] Widget for quick morning check-in
- [ ] Crisis button accessibility improvements
- [ ] PHQ-9/GAD-7 scoring validation testing

## File References
- Prototype: FullMind Design Prototype v1.7.html
- Design: FullMind Design Library v1.1.tsx, FullMind DRD v1.3.md
- Requirements: FullMind PRD v1.2.md
- Technical: FullMind TRD v2.0.md
- User Journeys: FullMind User Journey Flows & Persona Analysis.md
- Feature Roadmap: FullMind Product Roadmap - Prioritized - Based on v1.7.md

## Development Commands
```bash
# Clinical accuracy validation
npm run test:clinical          # Run assessment scoring tests
npm run validate:accessibility # Check WCAG compliance
npm run lint:clinical         # Validate therapeutic language

# Performance monitoring  
npm run perf:breathing        # Test breathing circle performance
npm run perf:crisis          # Validate crisis button response time
```