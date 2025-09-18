# Comprehensive Offline Scenario Testing

This testing suite addresses the critical gaps identified by the crisis and clinician agents, ensuring clinical-grade reliability for the FullMind MBCT app's offline functionality.

## Overview

The offline testing framework provides comprehensive validation of:

1. **Crisis Safety Testing** - Real-time crisis detection, widget accessibility, emergency protocols
2. **Therapeutic Messaging Validation** - MBCT compliance, mindfulness integration, therapeutic language
3. **Performance & Reliability** - Extended offline operation, memory management, system resilience
4. **Complete Integration** - End-to-end user journeys, multi-service coordination, data integrity

## Test Architecture

### Core Test Files

```
__tests__/offline/
├── comprehensive-offline-scenarios.test.ts     # Main offline scenarios & crisis safety
├── README.md                                   # This documentation
__tests__/clinical/
├── therapeutic-messaging-offline.test.ts      # MBCT compliance & therapeutic language
__tests__/crisis/
├── offline-crisis-management.test.ts          # Crisis-specific offline testing
__tests__/performance/
├── offline-performance-reliability.test.ts    # Performance & reliability validation
__tests__/integration/
├── complete-offline-integration.test.ts       # End-to-end integration testing
```

### Test Categories

#### 1. Critical Safety Tests
- **Real-time Crisis Detection**: Validates immediate detection of crisis indicators during partial assessments
- **Widget Crisis Access**: Ensures crisis button visibility and accessibility across all widget states
- **Crisis Data Recovery**: Tests crisis data preservation during network interruptions and app crashes
- **Emergency Access Performance**: Validates <200ms response times for crisis interventions

#### 2. Therapeutic Compliance Tests
- **MBCT Language Validation**: Ensures all offline messaging follows MBCT therapeutic principles
- **Mindfulness Integration**: Tests mindfulness prompts during network transitions and technical challenges
- **Session Continuity**: Validates therapeutic flow preservation during interruptions
- **User Autonomy**: Tests gentle guidance and user-directed interaction patterns

#### 3. Performance & Reliability Tests
- **Extended Offline Operation**: Validates 2+ hour offline performance with regular operations
- **Memory Optimization**: Tests large queue handling and memory-efficient batch processing
- **Crisis Responsiveness**: Ensures crisis response times maintained under system load
- **Service Resilience**: Validates recovery from various failure scenarios

#### 4. Integration Tests
- **Complete User Journeys**: End-to-end validation of morning routines, assessments, therapeutic sessions
- **Multi-Service Coordination**: Tests coordination between asset cache, queue, and session services
- **Conflict Resolution**: Validates data consistency during multi-device sync scenarios
- **Cross-Service Health**: Monitors service health during complex offline workflows

## Running Tests

### Individual Test Suites

```bash
# Run all offline tests
npm run test:offline

# Specific offline test categories
npm run test:offline-scenarios      # Main comprehensive scenarios
npm run test:offline-crisis        # Crisis management specific tests
npm run test:offline-therapeutic   # Therapeutic messaging validation
npm run test:offline-performance   # Performance and reliability tests
npm run test:offline-integration   # Complete integration testing
```

### Validation Commands

```bash
# Complete offline validation
npm run validate:offline-complete

# Clinical-specific offline validation
npm run validate:offline-clinical

# Performance-specific offline validation
npm run validate:offline-performance

# Crisis-specific offline validation
npm run validate:offline-crisis
```

### Performance Monitoring

```bash
# Offline performance benchmarks
npm run perf:offline

# Crisis response performance
npm run crisis:offline
```

## Critical Performance Thresholds

The tests validate these clinical-grade performance requirements:

| Operation | Threshold | Description |
|-----------|-----------|-------------|
| Crisis Detection | < 200ms (p95) | Real-time crisis detection during assessments |
| Emergency Access | < 200ms (p95) | Crisis button and 988 dialing accessibility |
| Offline Save | < 500ms (p95) | Assessment and check-in data persistence |
| Queue Operations | < 100ms (p95) | Standard offline queue operations |
| Data Integrity | < 1000ms (p95) | Data consistency validation |
| Session Resume | < 500ms (p95) | Therapeutic session resumption |
| Sync Operations | < 2000ms (p95) | Online/offline data synchronization |

## Test Scenarios Addressed

### Crisis Agent Gap Resolution

✅ **Real-time crisis monitoring** during partial PHQ-9/GAD-7 completion
✅ **Widget crisis button visibility** across all widget states and configurations
✅ **Crisis data recovery mechanisms** for app crashes, network loss, device restart
✅ **Post-crisis follow-up protocols** with appropriate timing and therapeutic content
✅ **Emergency access performance** under system stress and memory pressure

### Clinician Agent Gap Resolution  

✅ **Therapeutic language validation** with MBCT pattern matching and anxiety-pattern avoidance
✅ **Mindfulness integration** during network events and technology challenges
✅ **Technology decentering** opportunities that transform technical issues into mindfulness practices
✅ **Session continuity** preservation with therapeutic bridging during interruptions
✅ **User autonomy** support with gentle guidance patterns

### Performance Requirements

✅ **Extended offline operation** with performance monitoring over 2+ hour periods
✅ **Memory optimization** for large offline queues (2000+ operations)
✅ **Crisis responsiveness** maintained under high background load (1000+ operations)
✅ **Service resilience** across storage errors, memory exhaustion, queue overflow
✅ **Data consistency** validation across concurrent operations and failure scenarios

### Integration Coverage

✅ **Complete user journeys** from morning check-in through crisis intervention
✅ **Multi-service coordination** between asset cache, queue, sessions, and network services
✅ **Cross-platform compatibility** with consistent performance across iOS/Android
✅ **Conflict resolution** for multi-device sync scenarios with various resolution strategies
✅ **Service health monitoring** during complex offline workflows

## Test Data Generators

The test suite includes sophisticated data generators for realistic scenarios:

### Crisis Scenarios
- PHQ-9 Q9 suicidal ideation detection
- Progressive crisis threshold escalation
- Offline crisis button activation
- Multi-severity crisis management

### User Journey Scenarios
- Complete morning routine (profile, check-in, assessment, breathing)
- Crisis escalation during assessment
- Therapeutic session with network transitions
- Multi-device synchronization conflicts

### Performance Scenarios
- Steady, burst, crisis, and mixed load patterns
- Memory pressure simulation (low, medium, high, critical)
- Extended offline operation with realistic timing
- Concurrent operation stress testing

## Validation Framework

### MBCT Compliance Validation
```typescript
// Example: Therapeutic message validation
const validation = TherapeuticLanguageValidator.validateMBCTCompliance(message);
expect(validation.compliant).toBe(true);
expect(validation.mbctElements).toContain('present_moment');
expect(validation.nonCompliantElements).toHaveLength(0);
```

### Crisis Detection Validation
```typescript
// Example: Crisis threshold detection
expect(result.clinicalValidation?.isCrisisRelated).toBe(true);
expect(result.clinicalValidation?.crisisLevel).toBe('severe');
expect(result.clinicalValidation?.requiresImmediateSync).toBe(true);
```

### Performance Validation
```typescript
// Example: Performance threshold validation
const validation = performanceMonitor.validatePerformanceThresholds(thresholds);
expect(validation.passed).toBe(true);
expect(crisisDetectionTime).toBeLessThan(200);
```

## Continuous Integration

### Required Validations
All offline tests must pass before deployment:

1. **Crisis Safety Validation**: All crisis scenarios must demonstrate proper detection and response
2. **Therapeutic Compliance**: All messaging must meet MBCT standards with >60% compliance score
3. **Performance Benchmarks**: All operations must meet clinical-grade timing requirements
4. **Data Integrity**: 100% data preservation across all failure scenarios
5. **Integration Health**: All services must maintain 'healthy' or 'degraded' status (never 'critical' or 'failed')

### Test Coverage Requirements
- **Crisis Scenarios**: 100% coverage of identified crisis patterns
- **Therapeutic Messages**: 100% validation of offline user-facing messaging
- **Performance Edge Cases**: Coverage of memory pressure, queue overflow, extended operation
- **Integration Paths**: Coverage of all service interaction patterns

## Debugging and Monitoring

### Test Debugging
```bash
# Run with detailed logging
npm run test:offline-scenarios -- --verbose --no-coverage

# Run specific test pattern
npm run test:offline -- --testNamePattern="crisis detection"

# Debug performance issues
npm run perf:offline -- --detectOpenHandles --forceExit
```

### Real-World Simulation
The tests simulate realistic conditions:
- **Network Quality Variations**: Excellent, Good, Fair, Poor, Offline
- **Memory Pressure**: From low (10 ops) to critical (1000+ ops)  
- **Concurrent Load**: Up to 200 simultaneous operations
- **Extended Duration**: Up to 2+ hours of continuous offline operation
- **Failure Scenarios**: App crashes, storage errors, queue overflow, service degradation

## Success Criteria

### Clinical Safety
- ✅ 100% crisis detection accuracy during offline operation
- ✅ <200ms emergency access response time under all conditions
- ✅ Zero data loss for crisis-related information
- ✅ 100% therapeutic appropriateness for all user-facing messaging

### Performance Standards  
- ✅ <2 seconds app launch time in offline mode
- ✅ <500ms session resumption time after interruption
- ✅ <1000ms sync operation completion time
- ✅ <50MB memory usage increase during extended offline operation

### Therapeutic Effectiveness
- ✅ 100% MBCT principle alignment in offline features
- ✅ Zero anxiety-inducing technical messaging
- ✅ Seamless therapeutic continuity across network state transitions
- ✅ Enhanced mindfulness integration with technology interactions

This comprehensive testing framework ensures that the FullMind MBCT app maintains clinical-grade reliability and therapeutic effectiveness even during extended offline operation, addressing all critical gaps identified by the crisis and clinician validation processes.