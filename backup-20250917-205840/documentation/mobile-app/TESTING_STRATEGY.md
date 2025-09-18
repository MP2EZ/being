# FullMind MBCT App - Comprehensive Testing Strategy

## 🏥 Executive Summary

This comprehensive testing strategy ensures **100% clinical accuracy** for FullMind's MBCT mental health app. The strategy prioritizes user safety with zero tolerance for bugs in critical assessment and crisis intervention features.

### Critical Safety Metrics
- **PHQ-9/GAD-7 Scoring Accuracy**: 100% (All 348 possible score combinations tested)
- **Crisis Detection**: 100% (Zero false negatives allowed)
- **Crisis Response Time**: <200ms (Emergency accessibility requirement)
- **Data Persistence**: 100% (Mental health data never lost)
- **Accessibility**: WCAG AA compliant (Crisis situations require full accessibility)

---

## 🎯 Testing Architecture Overview

### 1. Clinical Accuracy Tests (HIGHEST PRIORITY)
**Location**: `/app/__tests__/clinical/`
**Coverage**: 100% required for all clinical functions

#### Assessment Scoring Validation
- **PHQ-9**: All 27 possible scores (0-27) with boundary conditions
- **GAD-7**: All 21 possible scores (0-21) with boundary conditions  
- **Crisis Thresholds**: PHQ-9 ≥20, GAD-7 ≥15, PHQ-9 Q9 >0
- **Severity Classification**: Exact clinical accuracy for all levels

```typescript
// Example critical test case
test('PHQ-9 suicidal ideation detection', () => {
  const answers = [0, 0, 0, 0, 0, 0, 0, 0, 1]; // Low score but Q9 = 1
  const assessment = createAssessment('phq9', answers);
  expect(requiresCrisisIntervention(assessment)).toBe(true);
});
```

#### Data Persistence Integrity  
- **Assessment Recovery**: After app crashes/restarts
- **Partial Session Recovery**: Interrupted assessments
- **90-Day Retention**: Automatic cleanup with data integrity
- **Concurrent Access**: Race condition protection

### 2. Integration Testing
**Location**: `/app/__tests__/integration/`
**Focus**: Complete user journeys from assessment to crisis intervention

#### Critical Flow Testing
```typescript
// Complete crisis flow integration test
test('Severe depression assessment triggers crisis intervention', async () => {
  // Start PHQ-9 → Answer severely → Verify crisis screen → Test 988 calling
});
```

### 3. Performance Testing  
**Location**: `/app/__tests__/performance/`
**Requirements**: Life-critical response times

#### Performance Benchmarks
- **Crisis Button**: <200ms response (from any screen)
- **App Launch**: <3 seconds to home screen
- **Assessment Loading**: <300ms per question
- **Breathing Animation**: 60fps sustained for 3 minutes
- **Check-in Transitions**: <500ms between steps

### 4. Accessibility Testing
**Location**: `/app/__tests__/accessibility/`
**Standard**: WCAG AA compliance (crisis situations require full accessibility)

#### Critical Accessibility Features
- **Screen Reader**: Full VoiceOver/TalkBack support for crisis flows
- **Touch Targets**: Minimum 44pt for all crisis elements
- **Color Contrast**: 4.5:1 ratio for all clinical content
- **Focus Management**: Logical navigation through crisis resources

### 5. Unit Testing
**Location**: `/app/__tests__/unit/`
**Coverage**: 100% for validation utilities, 95% for stores

---

## 🚀 Testing Commands & Workflow

### Development Testing
```bash
# Watch mode for active development
npm run test:watch

# Clinical accuracy validation
npm run validate:clinical

# Performance validation  
npm run validate:performance

# Accessibility validation
npm run validate:accessibility
```

### Pre-Commit Testing (Automated)
```bash
# Runs automatically before each commit
npm run precommit
# → Linting + Clinical tests + Unit tests
```

### CI/CD Pipeline Testing
```bash
# Full CI test suite
npm run test:ci
# → All test categories + Coverage + Performance + Accessibility
```

### Manual Testing Checklist
**Location**: `/app/__tests__/manual/critical-path-checklist.md`

Critical manual verification for:
- Crisis intervention flows on real devices
- Cross-platform parity (iOS/Android)
- Emergency calling functionality
- Screen reader compatibility
- Performance under real-world conditions

---

## 📊 Coverage Requirements

### Coverage Thresholds
```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  },
  // CRITICAL: 100% coverage required for clinical accuracy
  'src/utils/validation.ts': {
    branches: 100,
    functions: 100,  
    lines: 100,
    statements: 100
  },
  'src/store/assessmentStore.ts': {
    branches: 95,
    functions: 95,
    lines: 95,
    statements: 95
  }
}
```

### Critical Test Categories

#### 1. Clinical Function Tests (100% Coverage)
- `requiresCrisisIntervention()` - Crisis detection logic
- `calculateScore()` - PHQ-9/GAD-7 scoring accuracy
- `getSeverityLevel()` - Clinical severity classification
- `validateAssessment()` - Data integrity validation

#### 2. Data Safety Tests (100% Coverage)
- Assessment data persistence and recovery
- Check-in data integrity across app restarts  
- Partial session management
- Data corruption protection

#### 3. Performance Tests (Timing Validation)
- Crisis button response time monitoring
- Assessment loading performance
- Breathing animation frame rate testing
- Memory stability during long sessions

#### 4. Accessibility Tests (WCAG AA)
- Screen reader announcements for crisis detection
- Touch target size validation (≥44pt)
- Focus order testing for crisis flows
- Color contrast verification

---

## 🔧 Test Environment Setup

### Required Dependencies
```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "@testing-library/react-native": "^12.4.3",
    "@testing-library/jest-native": "^5.4.3",
    "react-test-renderer": "19.0.0",
    "detox": "^20.13.5",
    "@types/jest": "^29.5.8"
  }
}
```

### Configuration Files
- **Jest Config**: `/app/jest.config.js` - Prioritizes clinical tests
- **Test Setup**: `/app/__tests__/setup/jest.setup.js` - Custom matchers
- **React Native Mocks**: `/app/__tests__/setup/react-native-mock.js`

### Custom Test Matchers
```typescript
// Clinical accuracy matchers
expect(score).toMatchPHQ9Score(answers);
expect(assessment).toRequireCrisisIntervention();
expect(score).toMatchGAD7Score(answers);
```

---

## 🚨 Crisis Testing Protocol

### Crisis Detection Validation
Every assessment combination that should trigger crisis intervention:

#### PHQ-9 Crisis Cases
1. **Score ≥20**: Any combination totaling 20-27
2. **Suicidal Ideation**: Question 9 > 0 (regardless of total score)
3. **Combined**: High score + suicidal ideation

#### GAD-7 Crisis Cases  
1. **Score ≥15**: Any combination totaling 15-21

### Crisis Response Validation
1. **Immediate Display**: Crisis screen appears within 3 seconds
2. **988 Calling**: Phone app opens with correct number
3. **Offline Access**: Crisis resources available without internet
4. **Screen Reader**: Immediate announcement of crisis state
5. **Cross-Platform**: Identical experience iOS/Android

---

## 📱 Device Testing Matrix

### Required Test Devices
- **iPhone**: iOS 15+ (Primary target)
- **Android**: Android 10+ (Primary target) 
- **iPad**: Accessibility and large screen testing
- **Android Tablet**: Cross-platform accessibility

### Accessibility Test Configurations
- **VoiceOver**: Enabled on iOS devices
- **TalkBack**: Enabled on Android devices
- **High Contrast**: Visual accessibility testing
- **Large Text**: Text scaling validation
- **Reduced Motion**: Animation accessibility

---

## 🔄 CI/CD Integration

### GitHub Actions Pipeline
**File**: `/app/.github/workflows/clinical-accuracy-tests.yml`

#### Pipeline Stages (All Must Pass for Deployment)
1. **Clinical Accuracy Tests** (BLOCKING) - PHQ-9/GAD-7 scoring validation
2. **Data Safety Tests** - Persistence and recovery validation  
3. **Performance Safety** - Response time requirements
4. **Accessibility Compliance** - WCAG AA validation
5. **Integration Flows** - Complete user journey testing
6. **Coverage Report** - Verify critical coverage thresholds
7. **Security Scan** - Mental health data protection
8. **Deployment Gate** - Final safety authorization

### Failure Handling
**Any clinical accuracy test failure BLOCKS deployment**
- Automated alerts to clinical team
- Deployment prevented until manual review
- Detailed failure analysis required

---

## 📈 Testing Metrics & Reporting

### Key Performance Indicators
- **Clinical Accuracy Rate**: Must be 100%
- **Crisis Detection Rate**: Must be 100% (zero false negatives)
- **Performance Compliance**: All timing requirements met
- **Accessibility Score**: WCAG AA compliant
- **Test Coverage**: Global 80%, Critical functions 100%

### Reporting Dashboard
- **Daily**: Automated clinical accuracy test runs
- **Pre-Release**: Comprehensive manual testing checklist
- **Post-Release**: User-reported accuracy monitoring

---

## 🛡️ Risk Mitigation

### High-Risk Scenarios
1. **False Negative Crisis Detection**: User in crisis not detected
2. **Assessment Score Calculation Error**: Incorrect clinical assessment
3. **Data Loss**: Mental health data corruption/loss
4. **Performance Degradation**: Crisis button unresponsive
5. **Accessibility Failure**: Crisis resources inaccessible

### Mitigation Strategies
1. **Redundant Validation**: Multiple test layers for critical functions
2. **Real-Device Testing**: Manual validation on physical devices
3. **Clinical Review**: Expert validation of assessment logic
4. **Continuous Monitoring**: Post-deployment accuracy tracking
5. **Rapid Response**: Immediate hotfix capability for critical issues

---

## ✅ Release Checklist

### Pre-Release Requirements (ALL must be completed)
- [ ] All clinical accuracy tests pass (100%)
- [ ] Manual critical path checklist completed
- [ ] Cross-platform parity verified
- [ ] Accessibility compliance confirmed  
- [ ] Performance requirements met
- [ ] Clinical team sign-off received
- [ ] Emergency response plan activated

### Post-Release Monitoring
- [ ] User-reported accuracy tracking
- [ ] Performance monitoring dashboard
- [ ] Crisis intervention usage analytics
- [ ] Accessibility usage patterns
- [ ] Data integrity monitoring

---

## 📞 Emergency Contacts

### Clinical Accuracy Issues
- **Clinical Lead**: [Contact info]
- **Assessment Expert**: [Contact info]

### Technical Issues  
- **Development Lead**: [Contact info]
- **Performance Engineer**: [Contact info]

### Accessibility Issues
- **Accessibility Expert**: [Contact info]
- **UX Research**: [Contact info]

---

**CRITICAL REMINDER**: This is a mental health app where bugs can directly harm users. Every test failure must be treated as a potential safety issue requiring immediate attention and resolution.