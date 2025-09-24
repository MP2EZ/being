# Being. Widget Integration Test Suite

## Overview

This comprehensive test suite validates the clinical-grade widget implementation for the Being. MBCT app. The tests ensure privacy compliance, performance requirements, accessibility standards, and reliable functionality for mental health users.

## Test Categories

### 1. Comprehensive Integration Tests (`widget-comprehensive.integration.test.ts`)

**Purpose**: End-to-end validation of widget functionality with clinical accuracy
- Privacy compliance validation (zero clinical data exposure)
- Cross-platform consistency (iOS/Android)
- Real-time data synchronization
- Crisis functionality testing
- Mental health UX validation
- Hook integration testing
- Error recovery and fault tolerance

**Key Requirements Validated**:
- ✅ No PHQ-9/GAD-7 data in widgets
- ✅ Session status accuracy
- ✅ Deep link security
- ✅ Crisis response time < 200ms
- ✅ Widget update latency < 1000ms

### 2. Performance Integration Tests (`widget-performance.integration.test.ts`)

**Purpose**: Clinical-grade performance validation for therapeutic timing
- Widget update performance (< 1000ms)
- Deep link response time (< 500ms) 
- Crisis response time (< 200ms)
- Data generation performance (< 800ms)
- Native bridge latency (< 300ms)
- Sustained load testing
- Memory usage monitoring

**Performance Thresholds**:
```typescript
const THRESHOLDS = {
  WIDGET_UPDATE_MS: 1000,
  DEEP_LINK_RESPONSE_MS: 500,
  CRISIS_RESPONSE_MS: 200,
  DATA_GENERATION_MS: 800,
  NATIVE_BRIDGE_MS: 300,
  MEMORY_USAGE_MB: 50
};
```

### 3. Security Integration Tests (`widget-security.integration.test.ts`)

**Purpose**: HIPAA-aware security validation and threat prevention
- Clinical data privacy protection
- XSS/injection attack prevention
- Deep link security validation
- Data integrity protection
- Input validation and sanitization
- Error information disclosure prevention

**Security Patterns Detected**:
- Clinical data: PHQ-9, GAD-7, assessment scores, diagnoses
- Personal info: SSN, email, phone, emergency contacts
- XSS payloads: Scripts, JavaScript injection, malicious URLs
- Path traversal: Directory navigation attempts

### 4. Accessibility Tests (`widget-accessibility.comprehensive.test.tsx`)

**Purpose**: WCAG AA compliance for mental health users
- Screen reader compatibility
- Motor impairment support
- Cognitive load minimization
- Crisis accessibility during stress
- Touch target compliance (44px minimum)
- Color contrast validation
- Meaningful accessibility labels

**Mental Health User Scenarios**:
- Screen reader users with depression
- Motor impairment users
- Cognitive load sensitivity (anxiety)
- Crisis accessibility during episodes

### 5. End-to-End Tests (`widget-end-to-end.test.ts`)

**Purpose**: Complete user journey validation
- Full day check-in workflow
- Crisis intervention workflow
- Realistic user behavior patterns
- System resilience testing
- App lifecycle integration
- Edge case handling

**User Journey Patterns**:
- Enthusiastic starter (morning complete, others skipped)
- Perfectionist user (multiple session restarts)
- Inconsistent user (long gaps, intensive usage)
- Crisis user (emergency access patterns)

## Test Infrastructure

### Widget Test Infrastructure (`widgetTestInfrastructure.ts`)

**Comprehensive testing utilities**:

1. **MockWidgetNativeBridge**: Realistic native module simulation
2. **WidgetTestDataGenerator**: Test data creation utilities
3. **WidgetDeepLinkTestUtils**: Deep link scenario generation
4. **WidgetPrivacyTestUtils**: Privacy compliance validation
5. **WidgetPerformanceTestUtils**: Performance tracking
6. **WidgetAccessibilityTestUtils**: WCAG compliance validation

## Running Tests

### Individual Test Suites

```bash
# Comprehensive integration tests
npm run test:integration -- widget-comprehensive

# Performance validation
npm run test:performance -- widget-performance

# Security validation
npm run test:security -- widget-security

# Accessibility compliance
npm run test:accessibility -- widget-accessibility.comprehensive

# End-to-end user journeys
npm run test:e2e -- widget-end-to-end
```

### Complete Widget Test Suite

```bash
# Run all widget tests
npm run test -- --testPathPattern=widget

# Run with coverage
npm run test:coverage -- --testPathPattern=widget

# Run with performance monitoring
npm run test:performance -- --testPathPattern=widget --detectOpenHandles
```

### Clinical Validation

```bash
# Clinical accuracy validation
npm run validate:clinical

# HIPAA compliance check
npm run test:security -- widget-security

# Accessibility compliance
npm run validate:accessibility -- --testPathPattern=widget
```

## Test Configuration

### Performance Thresholds

```typescript
const PERFORMANCE_THRESHOLDS = {
  // Widget operations
  WIDGET_UPDATE_MS: 1000,
  DEEP_LINK_RESPONSE_MS: 500,
  DATA_GENERATION_MS: 800,
  
  // Crisis response (critical)
  CRISIS_RESPONSE_MS: 200,
  
  // Native bridge
  NATIVE_BRIDGE_MS: 300,
  PRIVACY_VALIDATION_MS: 100,
  
  // Resource usage
  MEMORY_USAGE_MB: 50,
  CONCURRENT_OPERATIONS: 10,
  SUSTAINED_LOAD_DURATION_MS: 30000
};
```

### Clinical Requirements

**Privacy Protection** (Zero Tolerance):
- No PHQ-9/GAD-7 scores in widget data
- No assessment results or clinical notes
- No personal health information
- No emergency contact details
- No medication or diagnosis information

**Accessibility Standards** (WCAG AA):
- Minimum 44px touch targets
- 4.5:1 color contrast ratio
- Screen reader compatibility
- Keyboard navigation support
- Crisis button accessibility during stress

**Performance Requirements**:
- Crisis response: < 200ms (emergency access)
- Widget updates: < 1000ms (therapeutic flow)
- Deep links: < 500ms (user experience)

## Mock Configuration

### Native Modules

```typescript
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  NativeModules: {
    FullMindWidgets: {
      updateWidgetData: jest.fn(),
      reloadWidgets: jest.fn(),
      performHealthCheck: jest.fn().mockResolvedValue(true)
    }
  }
}));
```

### Store Integration

```typescript
const mockStore = {
  checkIns: [],
  todaysCheckIns: [],
  currentCheckIn: null,
  crisisMode: { isActive: false },
  
  // Clinical data should never reach widgets
  assessmentData: null,
  clinicalData: null,
  personalData: null
};
```

## Validation Reports

### Test Execution Report

Each test suite generates validation reports:

```typescript
interface ValidationReport {
  privacy: { passed: boolean; violations: string[] };
  accessibility: { passed: boolean; violations: string[] };
  performance: { passed: boolean; violations: string[] };
  security: { passed: boolean; violations: string[] };
  overall: boolean;
}
```

### Performance Metrics

```typescript
interface PerformanceMetrics {
  updateLatencyMs: number;
  nativeCallLatencyMs: number;
  dataSerializationMs: number;
  privacyValidationMs: number;
  totalOperationMs: number;
}
```

## Quality Assurance Checklist

### Before Release

- [ ] All widget integration tests pass
- [ ] Performance thresholds met
- [ ] Zero clinical data exposure confirmed
- [ ] Crisis response time < 200ms
- [ ] WCAG AA compliance verified
- [ ] Cross-platform consistency validated
- [ ] Edge cases handled gracefully
- [ ] Security threats mitigated

### Continuous Monitoring

- [ ] Performance regression detection
- [ ] Privacy compliance monitoring
- [ ] Accessibility validation
- [ ] Error rate tracking
- [ ] User journey success rates
- [ ] Crisis access reliability

## Troubleshooting

### Common Issues

1. **Performance Threshold Failures**
   ```bash
   # Check for memory leaks
   npm run test:performance -- --detectOpenHandles
   
   # Profile specific operations
   npm run perf:monitor
   ```

2. **Privacy Violations**
   ```bash
   # Detailed privacy validation
   npm run test:security -- --verbose
   
   # Check data flows
   npm run validate:clinical
   ```

3. **Accessibility Issues**
   ```bash
   # WCAG compliance check
   npm run validate:accessibility -- --verbose
   
   # Screen reader simulation
   npm run test:accessibility -- widget-accessibility
   ```

### Debug Commands

```bash
# Detailed test output
npm run test -- --testPathPattern=widget --verbose

# Watch mode for development
npm run test:watch -- widget

# Coverage analysis
npm run test:coverage -- --testPathPattern=widget --coverageReporters=html
```

## Contributing

### Adding New Widget Tests

1. Follow the test infrastructure patterns
2. Use provided mock utilities
3. Validate clinical requirements
4. Include performance assertions
5. Test accessibility compliance
6. Document edge cases

### Test Standards

- **Clinical Accuracy**: 100% accuracy required for assessment-related functionality
- **Privacy Protection**: Zero tolerance for clinical data exposure
- **Performance**: Meet therapeutic timing requirements
- **Accessibility**: WCAG AA compliance for mental health users
- **Security**: Comprehensive threat protection

### Code Coverage

Maintain > 95% coverage for:
- Widget data generation
- Privacy validation
- Deep link handling
- Crisis functionality
- Native bridge operations

---

**Note**: These tests are designed specifically for mental health applications with clinical-grade requirements. The stringent privacy, performance, and accessibility standards reflect the critical nature of mental health software.