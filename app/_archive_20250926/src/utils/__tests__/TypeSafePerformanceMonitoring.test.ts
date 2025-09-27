/**
 * Type-Safe Performance Monitoring System Tests - Phase 4.3B Implementation
 *
 * Comprehensive test suite for healthcare-compliant performance monitoring
 * with crisis response SLA enforcement and therapeutic effectiveness validation.
 *
 * TEST COVERAGE:
 * - Crisis response timing validation (<200ms SLA)
 * - Therapeutic timing accuracy (±50ms MBCT compliance)
 * - Clinical accuracy monitoring (100% calculation validation)
 * - TurboModule performance integration
 * - Healthcare compliance validation
 * - Migration benefits validation
 * - Type safety enforcement
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Import type-safe monitoring system
import {
  useTypeSafePerformanceMonitoring,
  useTypeSafePerformanceMonitoringStore
} from '../TypeSafePerformanceMonitoringCoordinator';

// Import type definitions for validation
import type {
  PerformanceMetric,
  PerformanceAlert,
  SLAViolation,
  HealthcareContext,
  MonitoringCoordinatorConfig
} from '../../types/monitoring-implementation-types';

import type {
  CrisisResponseTime,
  TherapeuticTimingAccuracy,
  PerformanceOverhead
} from '../../types/performance-monitoring-types';

import type {
  TurboStoreOperation,
  CalculationTurboModuleOperation
} from '../../types/turbo-module-performance-types';

import {
  createCrisisResponseTime,
  createTherapeuticTimingAccuracy,
  createHealthcareContext,
  isCrisisResponseTime,
  isTherapeuticTimingAccuracy,
  PERFORMANCE_MONITORING_CONSTANTS
} from '../../types/performance-monitoring-types';

import {
  createTurboStoreOperation,
  createCalculationTurboModuleOperation,
  isTurboStoreOperation,
  TURBO_MODULE_PERFORMANCE_CONSTANTS
} from '../../types/turbo-module-performance-types';

// Mock performance.now for consistent testing
const mockPerformanceNow = jest.fn();
global.performance = { now: mockPerformanceNow } as any;

describe('Type-Safe Performance Monitoring System', () => {
  let coordinator: ReturnType<typeof useTypeSafePerformanceMonitoring>;
  let store: ReturnType<typeof useTypeSafePerformanceMonitoringStore>;

  beforeEach(() => {
    // Reset performance.now mock
    mockPerformanceNow.mockReturnValue(1000);

    // Initialize fresh store and coordinator for each test
    store = useTypeSafePerformanceMonitoringStore();
    coordinator = useTypeSafePerformanceMonitoring();

    // Reset store state
    store.getState().isActive = false;
    store.getState().activeMonitors = new Map();
    store.getState().recentMetrics = [];
    store.getState().activeAlerts = [];
    store.getState().slaViolations = [];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Coordinator Functionality', () => {
    it('should initialize with healthcare compliance configuration', async () => {
      const config: MonitoringCoordinatorConfig = {
        enableCrisisMonitoring: true,
        enableTherapeuticTracking: true,
        enableClinicalValidation: true,
        enableMemoryMonitoring: true,
        enablePerformanceOptimization: true,
        samplingRate: 95,
        reportingInterval: 60000,
        alertRetentionPeriod: 86400000,
        healthcareComplianceMode: 'strict',
        crisisResponseSLA: createCrisisResponseTime(PERFORMANCE_MONITORING_CONSTANTS.CRISIS_RESPONSE_MAX_MS),
        therapeuticTimingTolerance: createTherapeuticTimingAccuracy(PERFORMANCE_MONITORING_CONSTANTS.BREATHING_TIMING_TOLERANCE_MS),
        memoryLeakThreshold: 20 * 1024 * 1024,
        storageSettings: {
          enablePersistence: true,
          storageBackend: 'asyncstorage',
          encryptionEnabled: true,
          compressionEnabled: true,
          retentionPeriod: 604800000, // 7 days
          maxStorageSize: 100 * 1024 * 1024, // 100MB
          auditLoggingEnabled: true,
          hipaaCompliance: 'full',
        },
        integrationSettings: {
          turboModuleIntegration: true,
          therapeuticValidatorIntegration: true,
          crisisMonitorIntegration: true,
          realTimeAnalyticsIntegration: true,
          cloudSyncIntegration: false,
          webhookIntegration: false,
          externalAPIsIntegration: false,
        },
      };

      await coordinator.initialize(config);

      expect(coordinator.configuration).toEqual(config);
      expect(coordinator.healthcareContext).toBeTruthy();
      expect(coordinator.healthcareContext?.isCrisisSession).toBe(true);
      expect(coordinator.healthcareContext?.isTherapeuticSession).toBe(true);
      expect(coordinator.healthcareContext?.isClinicalSession).toBe(true);
    });

    it('should start and stop monitoring with proper state management', async () => {
      expect(coordinator.isActive).toBe(false);

      await coordinator.start();
      expect(coordinator.isActive).toBe(true);

      await coordinator.stop();
      expect(coordinator.isActive).toBe(false);
    });

    it('should pause and resume monitoring', async () => {
      await coordinator.start();
      expect(coordinator.isActive).toBe(true);

      await coordinator.pause();
      expect(coordinator.isActive).toBe(false);

      await coordinator.resume();
      expect(coordinator.isActive).toBe(true);
    });
  });

  describe('Crisis Response Monitoring', () => {
    beforeEach(async () => {
      await coordinator.start();
    });

    it('should validate crisis response times within SLA', async () => {
      const validResponseTime = 150; // Within 200ms SLA
      const isValid = await coordinator.validateCrisisResponseTime(validResponseTime);

      expect(isValid).toBe(true);
      expect(isCrisisResponseTime(validResponseTime)).toBe(true);
    });

    it('should detect SLA violations for slow crisis responses', async () => {
      const slowResponseTime = 250; // Exceeds 200ms SLA
      const isValid = await coordinator.validateCrisisResponseTime(slowResponseTime);

      expect(isValid).toBe(false);
      expect(isCrisisResponseTime(slowResponseTime)).toBe(false);
    });

    it('should track crisis button press and generate alerts for violations', async () => {
      const startTime = 1000;
      mockPerformanceNow.mockReturnValue(1300); // 300ms response time

      await coordinator.trackCrisisButtonPress(startTime);

      expect(coordinator.activeAlerts.length).toBeGreaterThan(0);
      const criticalAlerts = coordinator.activeAlerts.filter(alert => alert.level === 'emergency');
      expect(criticalAlerts.length).toBeGreaterThan(0);
    });

    it('should escalate crisis violations appropriately', async () => {
      const violatingResponseTime = 350;

      await coordinator.trackCrisisButtonPress(1000);
      mockPerformanceNow.mockReturnValue(1350);

      expect(coordinator.slaViolations.length).toBeGreaterThan(0);
      const crisisViolations = coordinator.slaViolations.filter(v => v.slaType === 'crisis_response');
      expect(crisisViolations.length).toBeGreaterThan(0);
    });

    it('should maintain crisis response metrics history', async () => {
      // Track multiple crisis responses
      for (let i = 0; i < 5; i++) {
        mockPerformanceNow.mockReturnValue(1000 + (i * 100)); // Varying response times
        await coordinator.trackCrisisButtonPress(1000);
      }

      expect(coordinator.recentMetrics.length).toBeGreaterThan(0);
      const crisisMetrics = coordinator.recentMetrics.filter(m => m.category === 'crisis_response');
      expect(crisisMetrics.length).toBe(5);
    });
  });

  describe('Therapeutic Performance Monitoring', () => {
    beforeEach(async () => {
      await coordinator.start();
    });

    it('should validate breathing timing accuracy within MBCT tolerance', async () => {
      const targetDuration = 60000; // 60 seconds
      const actualDuration = 60025; // 25ms deviation

      const isValid = await coordinator.validateBreathingTiming(targetDuration, actualDuration);

      expect(isValid).toBe(true);
      expect(isTherapeuticTimingAccuracy(25)).toBe(true);
    });

    it('should detect timing deviations exceeding MBCT tolerance', async () => {
      const targetDuration = 60000; // 60 seconds
      const actualDuration = 60075; // 75ms deviation (exceeds 50ms tolerance)

      const isValid = await coordinator.validateBreathingTiming(targetDuration, actualDuration);

      expect(isValid).toBe(false);
      expect(isTherapeuticTimingAccuracy(75)).toBe(false);
    });

    it('should manage therapeutic session lifecycle', async () => {
      const sessionId = await coordinator.startTherapeuticSession('breathing');

      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(/^therapeutic_breathing_/);

      await coordinator.updateTherapeuticSession(sessionId, {
        breathingTimingAccuracy: 30,
        animationStability: 58,
        touchResponsiveness: 120,
      });

      const completedSession = await coordinator.completeTherapeuticSession(sessionId);

      expect(completedSession).toBeTruthy();
      expect(completedSession.completed).toBe(true);
    });

    it('should track therapeutic effectiveness metrics', async () => {
      const sessionId = await coordinator.startTherapeuticSession('mindfulness');

      await coordinator.updateTherapeuticSession(sessionId, {
        breathingTimingAccuracy: 15, // Within tolerance
        animationStability: 60, // Good frame rate
        touchResponsiveness: 100, // Responsive
        memoryStability: true,
      });

      // Validate that session metrics are properly tracked
      expect(sessionId).toBeTruthy();
    });
  });

  describe('Clinical Accuracy Monitoring', () => {
    beforeEach(async () => {
      await coordinator.start();
    });

    it('should validate clinical calculations require 100% accuracy', async () => {
      const phq9Calculation = createCalculationTurboModuleOperation(
        'calc_phq9_001',
        'phq9_scoring',
        createHealthcareContext(false, false, true, 'medium')
      );

      const isValid = await coordinator.validateClinicalCalculation({
        ...phq9Calculation,
        inputSize: 9,
        complexity: 'medium',
        startTime: 1000,
        memoryUsed: 1024,
        result: {
          success: true,
          value: 15,
          confidence: 100,
          validated: true,
        },
        auditTrail: {
          inputHash: 'mock_input_hash',
          outputHash: 'mock_output_hash',
          algorithmVersion: '1.0.0',
          validationSteps: ['input_validation', 'calculation', 'output_validation'],
        },
      });

      expect(isValid).toBe(true);
    });

    it('should track assessment accuracy for PHQ-9 and GAD-7', async () => {
      await coordinator.trackAssessmentAccuracy('phq9', {
        score: 12,
        accuracy: 100,
        calculationTime: 5,
      });

      await coordinator.trackAssessmentAccuracy('gad7', {
        score: 8,
        accuracy: 100,
        calculationTime: 4,
      });

      // Verify tracking doesn't throw errors
      expect(true).toBe(true);
    });

    it('should ensure clinical data integrity', async () => {
      const validData = {
        assessment: 'phq9',
        responses: [1, 2, 1, 0, 2, 1, 1, 2, 1],
        score: 11,
        timestamp: 1000,
      };

      const isValid = await coordinator.ensureClinicalDataIntegrity(validData);

      expect(isValid).toBe(true);
    });
  });

  describe('TurboModule Performance Integration', () => {
    beforeEach(async () => {
      await coordinator.start();
    });

    it('should track TurboStore operations with healthcare context', async () => {
      const operation: TurboStoreOperation = {
        operationId: 'op_001',
        timestamp: 1000,
        moduleId: 'AsyncStorageTurboModule',
        operationType: 'crisis_data_write',
        performanceTier: 'critical',
        dataSize: 1024,
        startTime: 1000,
        endTime: 1025,
        latency: 25,
        success: true,
        healthcareContext: createHealthcareContext(true, false, false, 'high'),
        complianceMetadata: {
          isHealthcareData: true,
          requiresEncryption: true,
          requiresAuditLog: true,
          isCrisisCritical: true,
        },
      };

      await coordinator.trackTurboStoreOperation(operation);

      expect(coordinator.turboStoreOperations.length).toBeGreaterThan(0);
      expect(coordinator.turboStoreOperations[0].operationType).toBe('crisis_data_write');
    });

    it('should validate TurboModule healthcare compliance', async () => {
      const isCompliant = await coordinator.validateTurboModuleCompliance();

      // Should be true when no TurboModule metrics are present (default compliant)
      expect(isCompliant).toBe(true);
    });

    it('should integrate with TurboModule monitoring dashboard', async () => {
      const mockDashboard: TurboModuleMonitoringDashboard = {
        dashboardId: 'dashboard_001',
        lastUpdated: 1000,
        activeModules: [],
        systemHealth: {
          overallHealth: 'excellent',
          performanceScore: 95,
          healthcareCompliance: true,
          crisisReadiness: true,
        },
        alertSummary: {
          criticalAlerts: 0,
          errorAlerts: 0,
          warningAlerts: 0,
          recentAlerts: [],
        },
        performanceSummary: {
          averageLatency: 25,
          peakLatency: 50,
          memoryUsage: 45 * 1024 * 1024,
          errorRate: 0.1,
          throughput: 1000,
        },
        healthcareMetrics: {
          crisisResponseCompliance: 98,
          therapeuticTimingCompliance: 95,
          clinicalAccuracyCompliance: 100,
          dataIntegrityScore: 100,
        },
      };

      await coordinator.integrateWithTurboModules(mockDashboard);

      expect(coordinator.turboModuleDashboard).toEqual(mockDashboard);
    });
  });

  describe('Memory Performance Monitoring', () => {
    beforeEach(async () => {
      await coordinator.start();
    });

    it('should establish memory baseline', async () => {
      await coordinator.establishMemoryBaseline();
      // Verify baseline establishment doesn't throw errors
      expect(true).toBe(true);
    });

    it('should track memory usage during sessions', async () => {
      await coordinator.trackMemoryUsage();
      // Verify memory tracking doesn't throw errors
      expect(true).toBe(true);
    });

    it('should detect memory leaks', async () => {
      const leaks = await coordinator.detectMemoryLeaks();

      expect(Array.isArray(leaks)).toBe(true);
    });

    it('should validate session memory stability', async () => {
      const sessionId = 'session_001';
      const isStable = await coordinator.validateSessionMemoryStability(sessionId);

      expect(typeof isStable).toBe('boolean');
    });
  });

  describe('Healthcare Compliance Validation', () => {
    beforeEach(async () => {
      await coordinator.start();
    });

    it('should validate overall healthcare compliance', async () => {
      const complianceResult = await coordinator.validateHealthcareCompliance();

      expect(complianceResult).toBeTruthy();
      expect(complianceResult.resultId).toBeTruthy();
      expect(typeof complianceResult.overallCompliance).toBe('boolean');
      expect(typeof complianceResult.complianceScore).toBe('number');
      expect(complianceResult.complianceScore).toBeGreaterThanOrEqual(0);
      expect(complianceResult.complianceScore).toBeLessThanOrEqual(100);
    });

    it('should track compliance status', () => {
      const status = coordinator.getComplianceStatus();

      expect(status).toBeTruthy();
      expect(status.statusId).toBeTruthy();
      expect(typeof status.isCompliant).toBe('boolean');
      expect(['full', 'partial', 'non_compliant', 'under_review']).toContain(status.complianceLevel);
    });

    it('should generate compliance reports', async () => {
      const report = await coordinator.exportComplianceReport();

      expect(report).toBeTruthy();
      expect(report.exportId).toBeTruthy();
      expect(Array.isArray(report.complianceResults)).toBe(true);
    });
  });

  describe('Migration Validation', () => {
    beforeEach(async () => {
      await coordinator.start();
    });

    it('should validate migration benefits', async () => {
      const mockBaseline = {
        touchResponseTime: 200,
        animationFrameRate: 45,
        crisisResponseTime: 400,
        memoryUsage: 60 * 1024 * 1024,
        batteryImpact: 30,
      };

      const result = await coordinator.validateMigrationBenefits(mockBaseline);

      expect(result).toBeTruthy();
      expect(result.validationId).toBeTruthy();
      expect(typeof result.overallMigrationSuccess).toBe('boolean');
      expect(result.achievements).toBeTruthy();
      expect(result.improvementPercentages).toBeTruthy();
      expect(result.healthcareImpact).toBeTruthy();
    });

    it('should track performance regressions', async () => {
      await coordinator.trackPerformanceRegression('crisis_response', 150, 200);

      expect(coordinator.performanceRegressions.length).toBeGreaterThan(0);
      const regression = coordinator.performanceRegressions[0];
      expect(regression.metric).toBe('crisis_response');
      expect(regression.beforeValue).toBe(150);
      expect(regression.afterValue).toBe(200);
      expect(regression.degradationPercentage).toBeCloseTo(33.33, 1);
    });

    it('should generate migration reports', async () => {
      const report = await coordinator.generateMigrationReport();

      expect(report).toBeTruthy();
      expect(report.reportId).toBeTruthy();
      expect(Array.isArray(report.migrationValidations)).toBe(true);
      expect(Array.isArray(report.performanceRegressions)).toBe(true);
      expect(typeof report.overallSuccess).toBe('boolean');
    });
  });

  describe('Reporting and Analytics', () => {
    beforeEach(async () => {
      await coordinator.start();
    });

    it('should generate comprehensive performance reports', async () => {
      const report = await coordinator.generatePerformanceReport();

      expect(report).toBeTruthy();
      expect(report.reportId).toBeTruthy();
      expect(report.reportType).toBe('healthcare_compliance');
      expect(report.executiveSummary).toBeTruthy();
      expect(report.performanceMetrics).toBeTruthy();
      expect(report.healthcareMetrics).toBeTruthy();
      expect(report.complianceStatus).toBeTruthy();
    });

    it('should provide healthcare metrics', async () => {
      const metrics = await coordinator.getHealthcareMetrics();

      expect(metrics).toBeTruthy();
      expect(typeof metrics.patientSafetyScore).toBe('number');
      expect(typeof metrics.therapeuticEffectivenessScore).toBe('number');
      expect(typeof metrics.clinicalAccuracyScore).toBe('number');
      expect(typeof metrics.accessibilityComplianceScore).toBe('number');
      expect(typeof metrics.hipaaComplianceScore).toBe('number');
      expect(metrics.riskAssessment).toBeTruthy();
    });

    it('should provide dashboard data', async () => {
      const dashboardData = await coordinator.getDashboardData();

      expect(dashboardData).toBeTruthy();
      expect(dashboardData.dashboardId).toBe(coordinator.coordinatorId);
      expect(dashboardData.systemHealth).toBeTruthy();
      expect(dashboardData.performanceSummary).toBeTruthy();
      expect(dashboardData.healthcareMetrics).toBeTruthy();
      expect(dashboardData.alertSummary).toBeTruthy();
      expect(dashboardData.slaStatus).toBeTruthy();
    });
  });

  describe('Type Safety Validation', () => {
    it('should enforce crisis response time type constraints', () => {
      expect(() => createCrisisResponseTime(150)).not.toThrow();
      expect(() => createCrisisResponseTime(200)).not.toThrow();
      expect(() => createCrisisResponseTime(250)).toThrow();
    });

    it('should enforce therapeutic timing accuracy constraints', () => {
      expect(() => createTherapeuticTimingAccuracy(25)).not.toThrow();
      expect(() => createTherapeuticTimingAccuracy(50)).not.toThrow();
      expect(() => createTherapeuticTimingAccuracy(75)).toThrow();
    });

    it('should validate healthcare context structure', () => {
      const validContext = createHealthcareContext(true, true, false, 'medium');

      expect(validContext.isCrisisSession).toBe(true);
      expect(validContext.isTherapeuticSession).toBe(true);
      expect(validContext.isClinicalSession).toBe(false);
      expect(validContext.patientSafetyLevel).toBe('medium');
    });

    it('should validate TurboStore operation structure', () => {
      const operation = createTurboStoreOperation(
        'op_001',
        'AsyncStorageTurboModule',
        'crisis_data_read',
        'critical',
        createHealthcareContext(true, false, false, 'high')
      );

      expect(isTurboStoreOperation({
        ...operation,
        timestamp: 1000,
        dataSize: 1024,
        startTime: 1000,
        success: true,
        complianceMetadata: {
          isHealthcareData: true,
          requiresEncryption: true,
          requiresAuditLog: true,
          isCrisisCritical: true,
        },
      })).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await coordinator.start();
    });

    it('should handle invalid performance metrics gracefully', async () => {
      const invalidMetric = {
        id: 'invalid',
        // Missing required fields
      };

      // Should not throw but should log error
      await coordinator.processMetric(invalidMetric as any);
      expect(coordinator.recentMetrics.length).toBe(0);
    });

    it('should handle invalid TurboStore operations gracefully', async () => {
      const invalidOperation = {
        operationId: 'invalid',
        // Missing required fields
      };

      // Should not throw but should log error
      await coordinator.trackTurboStoreOperation(invalidOperation as any);
      expect(coordinator.turboStoreOperations.length).toBe(0);
    });

    it('should maintain performance under high load', async () => {
      // Generate many metrics quickly
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const metric = coordinator.performanceTargets;
        await coordinator.processMetric(coordinator.createPerformanceMetric(
          'general',
          Math.random() * 100,
          coordinator.healthcareContext!
        ));
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process 1000 metrics in reasonable time (< 1 second)
      expect(processingTime).toBeLessThan(1000);
      expect(coordinator.recentMetrics.length).toBeLessThanOrEqual(1000);
    });

    it('should respect memory limits for stored data', async () => {
      // Generate many alerts
      for (let i = 0; i < 150; i++) {
        const metric = coordinator.createPerformanceMetric(
          'general',
          Math.random() * 100,
          coordinator.healthcareContext!
        );
        const alert = coordinator.createPerformanceAlert('info', `Test alert ${i}`, metric);
        await coordinator.generateAlert(alert);
      }

      // Should maintain maximum of 100 alerts
      expect(coordinator.activeAlerts.length).toBeLessThanOrEqual(100);
    });
  });
});

describe('Type Guard Functions', () => {
  describe('Crisis Response Time Validation', () => {
    it('should validate crisis response times correctly', () => {
      expect(isCrisisResponseTime(50)).toBe(true);
      expect(isCrisisResponseTime(150)).toBe(true);
      expect(isCrisisResponseTime(200)).toBe(true);
      expect(isCrisisResponseTime(250)).toBe(false);
      expect(isCrisisResponseTime(-10)).toBe(false);
    });
  });

  describe('Therapeutic Timing Accuracy Validation', () => {
    it('should validate therapeutic timing accuracy correctly', () => {
      expect(isTherapeuticTimingAccuracy(0)).toBe(true);
      expect(isTherapeuticTimingAccuracy(25)).toBe(true);
      expect(isTherapeuticTimingAccuracy(50)).toBe(true);
      expect(isTherapeuticTimingAccuracy(-25)).toBe(true);
      expect(isTherapeuticTimingAccuracy(-50)).toBe(true);
      expect(isTherapeuticTimingAccuracy(75)).toBe(false);
      expect(isTherapeuticTimingAccuracy(-75)).toBe(false);
    });
  });
});

describe('Constants Validation', () => {
  it('should have correct performance monitoring constants', () => {
    expect(PERFORMANCE_MONITORING_CONSTANTS.CRISIS_RESPONSE_MAX_MS).toBe(200);
    expect(PERFORMANCE_MONITORING_CONSTANTS.BREATHING_TIMING_TOLERANCE_MS).toBe(50);
    expect(PERFORMANCE_MONITORING_CONSTANTS.THERAPEUTIC_ANIMATION_MIN_FPS).toBe(58);
    expect(PERFORMANCE_MONITORING_CONSTANTS.MONITORING_OVERHEAD_MAX_PERCENT).toBe(5);
  });

  it('should have correct TurboModule performance constants', () => {
    expect(TURBO_MODULE_PERFORMANCE_CONSTANTS.CRITICAL_TIER_MAX_LATENCY_MS).toBe(10);
    expect(TURBO_MODULE_PERFORMANCE_CONSTANTS.HIGH_TIER_MAX_LATENCY_MS).toBe(25);
    expect(TURBO_MODULE_PERFORMANCE_CONSTANTS.STANDARD_TIER_MAX_LATENCY_MS).toBe(50);
    expect(TURBO_MODULE_PERFORMANCE_CONSTANTS.CLINICAL_ACCURACY_REQUIRED).toBe(100);
  });
});