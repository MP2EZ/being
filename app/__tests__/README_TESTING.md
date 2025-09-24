# FullMind Testing Suite

## Overview

Comprehensive testing strategy for FullMind's clinical-grade mental health MBCT app, focusing on **P1-TECH-001 (SQLite Migration)** and **P1-FUNC-002 (Calendar Integration)** features.

## Critical Testing Requirements

### Clinical Safety Standards
- **100% accuracy**: PHQ-9/GAD-7 scoring preservation
- **Crisis access**: <200ms response time during all operations
- **Zero tolerance**: No clinical data loss during migrations
- **Privacy compliance**: HIPAA-compliant calendar integration
- **Performance targets**: Migration <5min, calendar ops <1s

## Test Suite Structure

```
__tests__/
├── clinical/                    # Clinical accuracy and safety
│   ├── sqlite-migration-clinical.test.ts
│   ├── calendar-privacy-clinical.test.ts
│   ├── assessment-scoring.test.ts
│   ├── data-persistence.test.ts
│   └── session-clinical-accuracy.test.ts
├── integration/                 # Feature integration testing
│   ├── calendar-integration-comprehensive.test.ts
│   ├── assessment-flow.test.tsx
│   └── resumable-session-flow.test.tsx
├── performance/                 # Performance and timing validation
│   ├── sqlite-migration-performance.test.ts
│   ├── feature-coordination-performance.test.ts
│   ├── critical-timing.test.ts
│   ├── session-performance.test.ts
│   └── BreathingCirclePerformance.test.ts
├── unit/                       # Unit testing
│   ├── validation.test.ts
│   ├── checkInStore-enhanced.test.ts
│   ├── ResumableSessionService.test.ts
│   └── session-security.test.ts
├── accessibility/              # WCAG compliance
│   ├── wcag-compliance.test.tsx
│   └── session-accessibility.test.tsx
└── services/storage/           # Storage layer testing
    ├── EncryptionService.test.ts
    ├── SecureDataStore.test.ts
    └── EncryptionIntegration.test.ts
```

## Running Tests

### Quick Commands

```bash
# Run all tests
npm test

# Clinical accuracy (critical for safety)
npm run test:clinical

# Performance validation (critical for user experience)
npm run test:performance

# Privacy compliance (critical for HIPAA)
npm run test:privacy

# Full integration suite
npm run test:integration

# Watch mode for development
npm run test:watch
```

### Specialized Test Commands

```bash
# SQLite migration testing
npm run test -- sqlite-migration

# Calendar integration testing  
npm run test -- calendar-integration

# Crisis access timing validation
npm run test -- critical-timing

# Assessment scoring accuracy
npm run test -- assessment-scoring

# Accessibility compliance
npm run test -- wcag-compliance
```

## Key Test Files

### Critical Safety Tests

#### `clinical/sqlite-migration-clinical.test.ts`
- **Purpose**: Validates clinical data integrity during SQLite migration
- **Critical Tests**: 
  - 100% PHQ-9/GAD-7 scoring accuracy preservation
  - Crisis threshold validation post-migration
  - Zero clinical data loss verification
  - Advanced analytics accuracy validation

```typescript
test('100% accuracy: PHQ-9 scoring preserved across migration', async () => {
  const phq9Original = originalAssessments.filter(a => a.type === 'phq9');
  // ... validation that all scores are preserved exactly
  expect(migratedRequiresCrisis).toBe(originalRequiresCrisis);
});
```

#### `clinical/calendar-privacy-clinical.test.ts`
- **Purpose**: HIPAA-compliant calendar integration testing
- **Critical Tests**:
  - PHI detection and sanitization
  - Cross-app data leakage prevention
  - Privacy compliance monitoring
  - Crisis period privacy protection

```typescript
test('ZERO PHI exposure: Event content sanitization', async () => {
  const phiContent = 'PHQ-9 score: 15/27 - depression assessment';
  const sanitized = await calendarIntegrationService.sanitizeEventContent(phiContent);
  expect(sanitized.title).not.toMatch(/PHQ-?9|score|\d+\/\d+/gi);
});
```

#### `performance/feature-coordination-performance.test.ts`  
- **Purpose**: Validates performance during concurrent feature operations
- **Critical Tests**:
  - Crisis access <200ms during migration + calendar setup
  - Resource management during coordination
  - Error isolation between features
  - Memory usage coordination

```typescript
test('Crisis access <200ms during migration + calendar setup', async () => {
  // Start concurrent operations
  const operations = Promise.all([migration, calendarSetup]);
  
  // Test crisis access every 3 seconds
  const accessTime = await testCrisisAccess();
  expect(accessTime).toBeLessThan(200);
});
```

### Integration Tests

#### `integration/calendar-integration-comprehensive.test.ts`
- Cross-platform permission handling
- Therapeutic timing compliance
- Privacy level enforcement
- Fallback strategy validation

#### `integration/assessment-flow.test.tsx`
- End-to-end assessment completion
- Crisis detection workflows
- Data persistence validation
- User experience flows

### Performance Tests

#### `performance/critical-timing.test.ts`
- Crisis button <200ms response
- App launch <3 seconds
- Breathing animation 60fps
- Assessment loading <300ms

#### `performance/sqlite-migration-performance.test.ts`
- Migration completion <5 minutes
- Memory usage <180MB peak
- 10x query performance improvement
- Concurrent access handling

## Test Data Management

### Clinical Test Data
All test data uses realistic but anonymized clinical scenarios:

```typescript
// Example PHQ-9 test cases covering all severity levels
const phq9TestCases = [
  { answers: [3,3,3,3,3,3,2,1,0], expectedScore: 20, severity: 'severe', crisis: true },
  { answers: [0,0,0,0,0,0,0,0,1], expectedScore: 1, severity: 'minimal', crisis: true },
  // ... comprehensive boundary testing
];
```

### Privacy Test Patterns
PHI detection testing uses comprehensive patterns:

```typescript
const phiPatterns = [
  'PHQ-9 score: 24/27',
  'Call Dr. Smith at 555-123-4567',
  'Patient ID: 123456',
  'Severe depression, suicidal ideation present'
];
```

## Quality Gates

### Pre-Deployment Checklist
- [ ] Clinical accuracy: 100% assessment scoring preserved
- [ ] Crisis access: <200ms response time validated
- [ ] Data integrity: Zero data loss confirmed  
- [ ] Privacy compliance: No PHI exposure detected
- [ ] Performance: All timing requirements met
- [ ] Coordination: Feature interaction validated
- [ ] Error recovery: Rollback/fallback tested
- [ ] Accessibility: WCAG AA compliance maintained

### Continuous Integration
Tests run automatically on:
- Every commit (clinical accuracy subset)
- Pull requests (full integration suite)
- Before deployments (complete test suite + manual validation)
- Scheduled runs (privacy compliance auditing)

## Mock Strategy

### Calendar Integration Mocking
```typescript
// Mock expo-calendar for controlled testing
jest.mock('expo-calendar');
mockedCalendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
```

### Database Mocking  
```typescript
// Use in-memory SQLite for fast, isolated testing
const testDB = SQLite.openDatabase(':memory:');
```

### Performance Monitoring
```typescript
// Mock performance APIs for consistent testing
const mockPerformance = () => ({
  mark: jest.fn(),
  measure: jest.fn(() => measureTime)
});
```

## Debugging and Troubleshooting

### Common Issues

1. **Test Database Conflicts**
   ```bash
   # Clear test databases
   npm run test:clean-db
   ```

2. **Calendar Mock Issues**  
   ```bash
   # Reset calendar mocks
   npm run test:reset-mocks
   ```

3. **Performance Test Inconsistency**
   ```bash
   # Run with consistent environment
   npm run test:performance -- --runInBand
   ```

### Debug Logging
Enable detailed test logging:
```bash
DEBUG=fullmind:* npm test
```

## Contributing to Tests

### Adding New Tests
1. Follow naming convention: `feature-aspect.test.ts`
2. Include performance benchmarks for critical paths
3. Add privacy validation for any data handling
4. Ensure accessibility coverage for UI components

### Test Categories
- **Clinical**: Direct impact on therapeutic outcomes
- **Performance**: User experience and system responsiveness  
- **Privacy**: HIPAA compliance and data protection
- **Integration**: Feature interaction and coordination
- **Accessibility**: WCAG compliance and inclusive design

### Review Criteria
- Clinical accuracy maintained
- Privacy protection verified
- Performance requirements met
- Error handling comprehensive
- Code coverage >90% for critical paths

## Monitoring and Alerts

### Test Health Dashboard
- Daily test suite execution status
- Performance trend monitoring
- Clinical accuracy validation history
- Privacy compliance audit results

### Alert Conditions
- Any clinical accuracy test failure (immediate)
- Crisis access timing degradation (immediate)  
- Privacy compliance violations (immediate)
- Performance regression >10% (warning)
- Test coverage drop below 85% (warning)

## Resources

- [FullMind Testing Strategy](../TESTING_STRATEGY_COMPREHENSIVE.md)
- [Clinical Validation Requirements](../../docs/clinical/clinical-requirements.md)
- [Privacy Implementation Guide](../../docs/security/privacy-implementation.md)
- [Performance Benchmarks](../../docs/architecture/performance-targets.md)