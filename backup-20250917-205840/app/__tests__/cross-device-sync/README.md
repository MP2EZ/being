# Cross-Device Sync Test Suite

Comprehensive testing framework for FullMind's cross-device synchronization system with focus on crisis safety, performance, and therapeutic continuity.

## Overview

This test suite validates the complete cross-device sync system including:

- **Crisis Response**: <200ms guarantee for emergency situations
- **Therapeutic Continuity**: Session handoff between devices <2 seconds
- **Performance**: Memory usage <50MB, 60fps animations
- **Security**: End-to-end encryption and zero-knowledge architecture
- **Integration**: Complete UI component and store integration

## Test Structure

```
__tests__/cross-device-sync/
├── setup/
│   ├── sync-test-setup.js          # Test environment configuration
│   └── global-teardown.js          # Resource cleanup
├── unit/
│   ├── CrossDeviceSyncAPI.test.ts  # Core API functionality
│   └── SyncStatusIndicator.test.tsx # UI component testing
├── integration/
│   └── sync-workflow.test.ts       # Multi-component workflows
├── e2e/
│   └── complete-user-journey.test.tsx # Full user scenarios
├── performance/
│   └── sync-performance.test.ts    # Performance validation
├── security/
│   └── sync-security.test.ts       # Security and compliance
├── reporters/
│   ├── performance-reporter.js     # Performance monitoring
│   └── security-reporter.js        # Security validation
└── test-runner.config.js           # Test configuration
```

## Quick Start

### Run All Tests
```bash
npm test -- --config=__tests__/cross-device-sync/test-runner.config.js
```

### Run Specific Test Categories
```bash
# Unit tests only (fast)
npm test -- --testNamePattern="Unit Tests"

# Performance tests
npm test -- --testNamePattern="Performance Tests"

# Security validation
npm test -- --testNamePattern="Security Tests"

# E2E complete journey
npm test -- --testNamePattern="E2E Tests"
```

### Run with Performance Monitoring
```bash
npm test -- --config=__tests__/cross-device-sync/test-runner.config.js --reporters=default,__tests__/cross-device-sync/reporters/performance-reporter.js
```

## Critical Test Requirements

### 1. Crisis Safety Testing (100% Coverage Required)

**Response Time Validation**
- Crisis response <200ms during all sync operations
- Emergency button accessibility during sync conflicts
- 988 hotline access independence from sync status
- Crisis data priority during multi-device conflicts

```javascript
// Example crisis test
it('should respond to crisis within 200ms', async () => {
  const crisisData = SyncTestUtils.createCrisisScenario('phq9_threshold');

  const { result, duration } = await SyncTestUtils.measurePerformance(
    () => syncAPI.syncCrisisData(crisisData, 'crisis_plan', 'test_id')
  );

  expect(result.success).toBe(true);
  expect(duration).toBeLessThan(200);
});
```

### 2. Therapeutic Continuity Testing

**Session Handoff Validation**
- Session handoff between devices <2 seconds
- Assessment data 100% accuracy across devices
- MBCT exercise timing preservation during sync
- Progress tracking consistency across all devices

```javascript
// Example session handoff test
it('should hand off session between devices within 2 seconds', async () => {
  const sessionData = { sessionId: 'test', progress: 0.5 };

  // Start on device 1
  await syncAPI.syncTherapeuticData(sessionData, 'session_data', 'test');

  // Handoff to device 2
  const handoffStart = performance.now();
  const handoffData = { ...sessionData, deviceId: 'device2' };
  await syncAPI.syncTherapeuticData(handoffData, 'session_data', 'test');
  const handoffTime = performance.now() - handoffStart;

  expect(handoffTime).toBeLessThan(2000);
});
```

### 3. Performance Testing

**Memory and CPU Validation**
- Memory usage <50MB for all sync operations
- Battery impact <3% per hour during active sync
- Network efficiency >80% compression rates
- Animation performance 60fps maintained

```javascript
// Example performance test
it('should maintain memory usage under 50MB', async () => {
  const startMemory = SyncTestUtils.trackMemoryUsage();

  // Perform extended operations
  for (let i = 0; i < 1000; i++) {
    await syncAPI.syncGeneralData({ test: i }, 'user_profile', `test_${i}`);
  }

  const endMemory = SyncTestUtils.trackMemoryUsage();
  const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;

  expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
});
```

### 4. Security Testing

**Encryption and Privacy Validation**
- End-to-end encryption validation
- Zero-knowledge architecture verification
- Device trust establishment and revocation
- Emergency access audit trail validation

```javascript
// Example security test
it('should encrypt all sensitive data', async () => {
  const sensitiveData = { phq9Score: 18, personalInfo: 'sensitive' };

  await syncAPI.syncCrisisData(sensitiveData, 'assessment', 'test');

  // Verify encryption was applied
  expect(zeroKnowledgeCloudSync.prepareForCloudUpload).toHaveBeenCalledWith(
    sensitiveData,
    expect.objectContaining({
      dataSensitivity: DataSensitivity.CLINICAL
    })
  );
});
```

## Test Utilities

### Performance Measurement
```javascript
const { result, duration } = await SyncTestUtils.measurePerformance(
  () => syncAPI.syncCrisisData(data, 'crisis_plan', 'test'),
  'crisis_sync_test'
);
```

### Crisis Response Validation
```javascript
const validation = SyncTestUtils.validateCrisisResponseTime(duration, 200);
expect(validation.passed).toBe(true);
```

### Memory Tracking
```javascript
const memoryUsage = SyncTestUtils.trackMemoryUsage();
expect(memoryUsage.heapUsed).toBeLessThan(50 * 1024 * 1024);
```

### Network Condition Simulation
```javascript
const conditions = SyncTestUtils.simulateNetworkConditions('poor');
// Test sync under poor network conditions
```

### Device and Conflict Simulation
```javascript
const device = SyncTestUtils.createMockDevice({ platform: 'ios' });
const conflict = SyncTestUtils.createMockConflict({ clinicalRelevant: true });
```

## Custom Jest Matchers

```javascript
// Performance validation
expect(responseTime).toRespondWithinTime(200);

// Sync status validation
expect(status).toHaveValidSyncStatus();

// Crisis access validation
expect(accessFeatures).toMaintainCrisisAccess();

// Security validation
expect(encryptedData).toBeSecurelyEncrypted();
```

## Performance Monitoring

The test suite includes comprehensive performance monitoring:

### Real-time Metrics
- Crisis response times with percentile analysis
- Memory usage tracking with leak detection
- Success rate monitoring across test categories
- Performance regression detection

### Automated Reporting
```bash
# Generate performance report
npm test -- --reporters=performance-reporter

# View report
cat ./test-results/cross-device-sync/performance-report.json
```

### Performance Thresholds
- Crisis response: <200ms (99.9% percentile)
- Sync latency: <500ms (95% percentile)
- Memory usage: <50MB peak
- Success rate: >95%

## Security Validation

### Encryption Testing
- End-to-end encryption for all data types
- Zero-knowledge architecture verification
- Key rotation and device trust validation
- Audit trail completeness

### Compliance Testing
- HIPAA-aware data handling
- Data minimization validation
- Right to deletion testing
- Audit trail integrity

## Test Execution Strategies

### Sequential vs Parallel
- **Unit tests**: Parallel execution for speed
- **Integration tests**: Limited concurrency for stability
- **E2E tests**: Sequential for realistic scenarios
- **Performance tests**: Sequential for accurate measurement

### Crisis-First Testing
Tests are sequenced to prioritize crisis safety validation:
1. Crisis response time tests
2. Emergency access tests
3. Security validation
4. Performance optimization
5. General functionality

## Debugging and Troubleshooting

### Common Issues

**Crisis Response Time Failures**
```bash
# Check WebSocket connection
npm test -- --testNamePattern="WebSocket"

# Validate priority queue
npm test -- --testNamePattern="priority"
```

**Memory Leaks**
```bash
# Run with heap profiling
npm test -- --logHeapUsage --detectLeaks
```

**Security Failures**
```bash
# Validate encryption
npm test -- --testNamePattern="encryption"

# Check audit trail
npm test -- --testNamePattern="audit"
```

### Test Environment Variables
```bash
export SYNC_TEST_CONFIG='{
  "enablePerformanceMonitoring": true,
  "enableSecurityValidation": true,
  "crisisResponseTimeLimit": 200
}'
```

## Coverage Requirements

### Critical Components (95%+ Coverage)
- `CrossDeviceSyncAPI.ts`: Core sync functionality
- `SyncStatusIndicator.tsx`: Real-time status display
- `CrisisSyncBadge.tsx`: Emergency state handling

### Standard Components (85%+ Coverage)
- All sync-related stores and services
- Device management and conflict resolution
- UI components and navigation integration

### Coverage Commands
```bash
# Generate coverage report
npm test -- --coverage

# View detailed coverage
open coverage/lcov-report/index.html
```

## Continuous Integration

### CI/CD Pipeline Integration
```yaml
# Example CI configuration
test-sync:
  name: Cross-Device Sync Tests
  runs-on: ubuntu-latest
  steps:
    - name: Run Sync Tests
      run: npm test -- --config=__tests__/cross-device-sync/test-runner.config.js

    - name: Validate Performance
      run: |
        if [ ! -f "./test-results/cross-device-sync/performance-report.json" ]; then
          echo "Performance report missing"
          exit 1
        fi

    - name: Check Crisis Response Times
      run: |
        node -e "
          const report = require('./test-results/cross-device-sync/performance-report.json');
          const violations = report.violations.filter(v => v.type === 'CRISIS_RESPONSE_TIME_VIOLATION');
          if (violations.length > 0) {
            console.error('Crisis response time violations detected');
            process.exit(1);
          }
        "
```

### Performance Regression Detection
Automated performance regression detection compares current test results with baseline metrics to catch performance degradation early.

## Contributing

### Adding New Tests
1. Follow the existing test structure and naming conventions
2. Include performance monitoring for all sync operations
3. Validate crisis safety requirements where applicable
4. Add security validation for sensitive data operations
5. Update coverage requirements if adding critical functionality

### Test Naming Convention
```javascript
// Good test names
'should sync crisis data within 200ms via WebSocket'
'should hand off MBCT session between devices within 2 seconds'
'should maintain memory usage under 50MB during extended operations'

// Poor test names
'should sync data'
'should work correctly'
'should handle errors'
```

This comprehensive test suite ensures the cross-device sync system meets all critical requirements for crisis safety, therapeutic continuity, performance, and security while providing detailed monitoring and reporting capabilities.