/**
 * Integration Tests - Feature Flag Cost Control
 *
 * Tests for cost monitoring, budget controls, and automatic feature
 * limiting to ensure sustainable cloud operations within budget
 */

import { useFeatureFlagStore } from '../../src/store/featureFlagStore';
import { DEFAULT_FEATURE_FLAGS, FEATURE_FLAG_CONSTANTS } from '../../src/types/feature-flags';

// Mock cost monitoring service
const mockCostService = {
  getCurrentCosts: jest.fn(),
  getProjectedCosts: jest.fn(),
  getOptimizationRecommendations: jest.fn(),
  trackFeatureUsage: jest.fn(),
  calculateCostImpact: jest.fn(),
  getBudgetStatus: jest.fn(),
  alertBudgetThreshold: jest.fn()
};

jest.mock('../../src/services/cloud/CostMonitoring', () => ({
  costMonitoringService: mockCostService
}));

// Mock cloud monitoring
jest.mock('../../src/services/cloud/CloudMonitoring', () => ({
  cloudMonitoringService: {
    reportEmergencyDisable: jest.fn().mockResolvedValue(undefined),
    reportCostAlert: jest.fn().mockResolvedValue(undefined),
    reportBudgetExceeded: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock secure storage
jest.mock('../../src/services/storage/SecureDataStore', () => ({
  secureDataStore: {
    getFeatureFlags: jest.fn().mockResolvedValue({}),
    getUserConsents: jest.fn().mockResolvedValue({}),
    getUserEligibility: jest.fn().mockResolvedValue(null),
    saveFeatureFlags: jest.fn().mockResolvedValue(undefined),
    saveUserConsents: jest.fn().mockResolvedValue(undefined),
    validateEncryption: jest.fn().mockResolvedValue(true)
  }
}));

// Mock crisis protection
jest.mock('../../src/services/CrisisProtectionService', () => ({
  crisisProtectionService: {
    isInCrisisMode: jest.fn().mockReturnValue(false),
    measureResponseTime: jest.fn().mockResolvedValue(150),
    testFeatureResponse: jest.fn().mockResolvedValue(180)
  }
}));

describe('Integration Tests: Feature Flag Cost Control', () => {
  let featureFlagStore: ReturnType<typeof useFeatureFlagStore.getState>;

  beforeEach(async () => {
    featureFlagStore = useFeatureFlagStore.getState();

    // Reset to initial state
    useFeatureFlagStore.setState({
      flags: { ...DEFAULT_FEATURE_FLAGS },
      userConsents: {},
      rolloutPercentages: {},
      userEligibility: null,
      costStatus: {
        currentSpend: 0,
        budgetRemaining: 1.0,
        projectedMonthlySpend: 0,
        featureCosts: {},
        limitedFeatures: [],
        recommendations: [],
        breakEvenUsers: 75,
        costEfficiency: 1.0
      },
      isLoading: false,
      isUpdating: false,
      error: null
    });

    // Set up default cost service responses
    mockCostService.getCurrentCosts.mockResolvedValue({
      total: 5.50,
      budgetRemaining: 0.75,
      byFeature: {
        CLOUD_SYNC_ENABLED: 2.00,
        ANALYTICS_ENABLED: 0.50,
        THERAPIST_PORTAL_ENABLED: 3.00,
        AI_INSIGHTS_ENABLED: 0.0
      },
      limitedFeatures: [],
      recommendations: [],
      efficiency: 0.85
    });

    mockCostService.getProjectedCosts.mockResolvedValue({
      monthly: 15.0,
      breakEvenUsers: 65,
      confidence: 0.8
    });

    mockCostService.getOptimizationRecommendations.mockResolvedValue([]);

    await featureFlagStore.initializeFlags();
    jest.clearAllMocks();
  });

  describe('1. Budget Monitoring and Alerts', () => {
    test('Normal budget usage tracking', async () => {
      const costStatus = await featureFlagStore.checkCostLimits();

      expect(costStatus.currentSpend).toBe(5.50);
      expect(costStatus.budgetRemaining).toBe(0.75);
      expect(costStatus.projectedMonthlySpend).toBe(15.0);
      expect(costStatus.breakEvenUsers).toBe(65);
      expect(costStatus.costEfficiency).toBe(0.85);
    });

    test('Budget warning threshold (75%) triggers alerts', async () => {
      // Mock budget at 75% usage
      mockCostService.getCurrentCosts.mockResolvedValue({
        total: 75.0,
        budgetRemaining: 0.25, // 25% remaining
        byFeature: {
          CLOUD_SYNC_ENABLED: 30.0,
          ANALYTICS_ENABLED: 15.0,
          THERAPIST_PORTAL_ENABLED: 30.0
        },
        limitedFeatures: [],
        recommendations: [
          'Consider limiting AI Insights usage',
          'Optimize cloud sync frequency'
        ],
        efficiency: 0.6
      });

      const costStatus = await featureFlagStore.checkCostLimits();

      expect(costStatus.budgetRemaining).toBe(0.25);
      expect(costStatus.recommendations.length).toBeGreaterThan(0);
      expect(featureFlagStore.healthStatus.costWithinLimits).toBe(true); // Still within limits
    });

    test('Budget limit threshold (85%) starts feature limiting', async () => {
      // Mock budget at 85% usage
      mockCostService.getCurrentCosts.mockResolvedValue({
        total: 85.0,
        budgetRemaining: 0.15, // 15% remaining
        byFeature: {
          CLOUD_SYNC_ENABLED: 35.0,
          ANALYTICS_ENABLED: 20.0,
          THERAPIST_PORTAL_ENABLED: 20.0,
          AI_INSIGHTS_ENABLED: 10.0
        },
        limitedFeatures: ['AI_INSIGHTS_ENABLED'],
        recommendations: [
          'Disable AI Insights immediately',
          'Reduce therapist portal usage'
        ],
        efficiency: 0.5
      });

      await featureFlagStore.checkCostLimits();

      // Should automatically limit expensive features
      expect(featureFlagStore.costStatus.limitedFeatures).toContain('AI_INSIGHTS_ENABLED');
    });

    test('Budget hard stop (100%) disables non-critical features', async () => {
      // Mock budget exceeded
      mockCostService.getCurrentCosts.mockResolvedValue({
        total: 105.0,
        budgetRemaining: -0.05, // 5% over budget
        byFeature: {
          CLOUD_SYNC_ENABLED: 40.0,
          ANALYTICS_ENABLED: 25.0,
          THERAPIST_PORTAL_ENABLED: 25.0,
          AI_INSIGHTS_ENABLED: 15.0
        },
        limitedFeatures: ['AI_INSIGHTS_ENABLED', 'THERAPIST_PORTAL_ENABLED'],
        recommendations: [
          'Emergency: Disable all non-critical features',
          'Contact support for budget increase'
        ],
        efficiency: 0.3
      });

      await featureFlagStore.disableExpensiveFeatures();

      // Should disable expensive features that can be disabled in crisis
      const expensiveFeatures = Object.entries(featureFlagStore.metadata)
        .filter(([_, metadata]) =>
          (metadata.costImpact === 'high' || metadata.costImpact === 'variable') &&
          metadata.canDisableInCrisis
        )
        .map(([key, _]) => key);

      expensiveFeatures.forEach(feature => {
        expect(featureFlagStore.flags[feature as keyof typeof featureFlagStore.flags]).toBe(false);
      });
    });
  });

  describe('2. Automatic Feature Limiting', () => {
    test('High-cost features disabled when budget low', async () => {
      // Enable expensive features first
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          AI_INSIGHTS_ENABLED: true,
          THERAPIST_PORTAL_ENABLED: true,
          CROSS_DEVICE_SYNC_ENABLED: true
        }
      });

      // Simulate low budget
      useFeatureFlagStore.setState({
        costStatus: {
          currentSpend: 90,
          budgetRemaining: 0.1, // 10% remaining
          projectedMonthlySpend: 200,
          featureCosts: {
            AI_INSIGHTS_ENABLED: 25.0,
            THERAPIST_PORTAL_ENABLED: 30.0,
            CROSS_DEVICE_SYNC_ENABLED: 20.0
          },
          limitedFeatures: [],
          recommendations: [],
          breakEvenUsers: 150,
          costEfficiency: 0.4
        }
      });

      await featureFlagStore.disableExpensiveFeatures();

      // High-cost variable features should be disabled
      expect(featureFlagStore.flags.AI_INSIGHTS_ENABLED).toBe(false);

      // Medium-cost features that can be disabled should be disabled
      if (featureFlagStore.metadata.THERAPIST_PORTAL_ENABLED.canDisableInCrisis) {
        expect(featureFlagStore.flags.THERAPIST_PORTAL_ENABLED).toBe(false);
      }
    });

    test('Crisis-protected features remain enabled despite cost', async () => {
      // Enable all features
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          EMERGENCY_CONTACTS_CLOUD: true,
          PUSH_NOTIFICATIONS_ENABLED: true,
          AI_INSIGHTS_ENABLED: true,
          THERAPIST_PORTAL_ENABLED: true
        }
      });

      // Simulate budget exceeded
      useFeatureFlagStore.setState({
        costStatus: {
          currentSpend: 120,
          budgetRemaining: -0.2, // 20% over budget
          projectedMonthlySpend: 300,
          featureCosts: {},
          limitedFeatures: [],
          recommendations: [],
          breakEvenUsers: 200,
          costEfficiency: 0.2
        }
      });

      await featureFlagStore.disableExpensiveFeatures();

      // Crisis-protected features should remain enabled
      expect(featureFlagStore.flags.EMERGENCY_CONTACTS_CLOUD).toBe(true);
      expect(featureFlagStore.flags.PUSH_NOTIFICATIONS_ENABLED).toBe(true);

      // Expensive features should be disabled
      expect(featureFlagStore.flags.AI_INSIGHTS_ENABLED).toBe(false);
    });

    test('Feature limiting preserves core functionality', async () => {
      // Enable core and premium features
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          ANALYTICS_ENABLED: true,
          BACKUP_RESTORE_ENABLED: true,
          AI_INSIGHTS_ENABLED: true
        }
      });

      // Simulate cost pressures
      await featureFlagStore.disableExpensiveFeatures();

      // Core sync should remain if it's not too expensive
      const cloudSyncMetadata = featureFlagStore.metadata.CLOUD_SYNC_ENABLED;
      if (cloudSyncMetadata.costImpact === 'low' || cloudSyncMetadata.costImpact === 'medium') {
        expect(featureFlagStore.flags.CLOUD_SYNC_ENABLED).toBe(true);
      }

      // Analytics (low cost) should remain
      expect(featureFlagStore.flags.ANALYTICS_ENABLED).toBe(true);
    });
  });

  describe('3. Cost Projections and Accuracy', () => {
    test('Monthly cost projections are reasonable', async () => {
      // Enable various features to generate costs
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          ANALYTICS_ENABLED: true,
          PUSH_NOTIFICATIONS_ENABLED: true
        }
      });

      const costStatus = await featureFlagStore.checkCostLimits();

      // Projections should be reasonable
      expect(costStatus.projectedMonthlySpend).toBeGreaterThan(0);
      expect(costStatus.projectedMonthlySpend).toBeLessThan(1000); // Sanity check

      // Break-even users should be realistic
      expect(costStatus.breakEvenUsers).toBeGreaterThan(50);
      expect(costStatus.breakEvenUsers).toBeLessThan(100);

      // Cost efficiency should be reasonable
      expect(costStatus.costEfficiency).toBeGreaterThan(0);
      expect(costStatus.costEfficiency).toBeLessThanOrEqual(1);
    });

    test('Cost projections update with feature changes', async () => {
      // Start with minimal features
      const initialCostStatus = await featureFlagStore.checkCostLimits();

      // Enable expensive features
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          AI_INSIGHTS_ENABLED: true,
          THERAPIST_PORTAL_ENABLED: true,
          CROSS_DEVICE_SYNC_ENABLED: true
        }
      });

      // Mock higher costs
      mockCostService.getCurrentCosts.mockResolvedValue({
        total: 25.0,
        budgetRemaining: 0.5,
        byFeature: {
          AI_INSIGHTS_ENABLED: 15.0,
          THERAPIST_PORTAL_ENABLED: 7.0,
          CROSS_DEVICE_SYNC_ENABLED: 3.0
        },
        limitedFeatures: [],
        recommendations: [],
        efficiency: 0.6
      });

      mockCostService.getProjectedCosts.mockResolvedValue({
        monthly: 75.0,
        breakEvenUsers: 90
      });

      const updatedCostStatus = await featureFlagStore.checkCostLimits();

      expect(updatedCostStatus.projectedMonthlySpend).toBeGreaterThan(initialCostStatus.projectedMonthlySpend);
      expect(updatedCostStatus.breakEvenUsers).toBeGreaterThan(initialCostStatus.breakEvenUsers);
    });

    test('Cost accuracy with user scaling', async () => {
      const userScenarios = [
        { users: 25, expectedCostMultiplier: 0.5 },
        { users: 50, expectedCostMultiplier: 1.0 },
        { users: 100, expectedCostMultiplier: 2.0 },
        { users: 200, expectedCostMultiplier: 4.0 }
      ];

      for (const scenario of userScenarios) {
        mockCostService.getProjectedCosts.mockResolvedValue({
          monthly: 20.0 * scenario.expectedCostMultiplier,
          breakEvenUsers: scenario.users,
          basedOnUsers: scenario.users
        });

        const costStatus = await featureFlagStore.checkCostLimits();

        expect(costStatus.projectedMonthlySpend).toBe(20.0 * scenario.expectedCostMultiplier);
        expect(costStatus.breakEvenUsers).toBe(scenario.users);
      }
    });
  });

  describe('4. Cost Transparency for Users', () => {
    test('Feature cost impact clearly defined', () => {
      Object.entries(featureFlagStore.metadata).forEach(([key, metadata]) => {
        expect(['none', 'low', 'medium', 'high', 'variable']).toContain(metadata.costImpact);
        expect(metadata.displayName).toBeTruthy();
        expect(metadata.description).toBeTruthy();
      });
    });

    test('Real-time cost tracking per feature', async () => {
      // Enable features with known costs
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          ANALYTICS_ENABLED: true,
          THERAPIST_PORTAL_ENABLED: true
        }
      });

      const costStatus = await featureFlagStore.checkCostLimits();

      // Should have per-feature cost breakdown
      expect(costStatus.featureCosts.CLOUD_SYNC_ENABLED).toBeDefined();
      expect(costStatus.featureCosts.ANALYTICS_ENABLED).toBeDefined();
      expect(costStatus.featureCosts.THERAPIST_PORTAL_ENABLED).toBeDefined();

      // Costs should be reasonable
      expect(costStatus.featureCosts.ANALYTICS_ENABLED).toBeLessThan(5.0); // Low cost
      expect(costStatus.featureCosts.CLOUD_SYNC_ENABLED).toBeLessThan(10.0); // Medium cost
    });

    test('Budget remaining clearly communicated', async () => {
      const scenarios = [
        { remaining: 0.9, status: 'healthy' },
        { remaining: 0.5, status: 'healthy' },
        { remaining: 0.2, status: 'warning' },
        { remaining: 0.05, status: 'critical' }
      ];

      for (const scenario of scenarios) {
        mockCostService.getCurrentCosts.mockResolvedValue({
          total: (1 - scenario.remaining) * 100,
          budgetRemaining: scenario.remaining,
          byFeature: {},
          limitedFeatures: [],
          recommendations: [],
          efficiency: scenario.remaining
        });

        const costStatus = await featureFlagStore.checkCostLimits();

        expect(costStatus.budgetRemaining).toBe(scenario.remaining);

        // Health status should reflect budget state
        const healthStatus = await featureFlagStore.getHealthStatus();
        if (scenario.remaining <= 0.1) {
          expect(healthStatus.overall).toBe('critical');
        } else if (scenario.remaining <= 0.25) {
          expect(healthStatus.overall).toBe('warning');
        }
      }
    });
  });

  describe('5. Cost Optimization', () => {
    test('Automatic cost optimization recommendations', async () => {
      mockCostService.getOptimizationRecommendations.mockResolvedValue([
        {
          id: 'opt-1',
          type: 'disable',
          feature: 'AI_INSIGHTS_ENABLED',
          potentialSavings: 15.0,
          automated: true,
          description: 'Disable AI insights during low usage'
        },
        {
          id: 'opt-2',
          type: 'optimize',
          feature: 'CLOUD_SYNC_ENABLED',
          potentialSavings: 5.0,
          automated: true,
          description: 'Reduce sync frequency'
        }
      ]);

      await featureFlagStore.optimizeCosts();

      expect(mockCostService.getOptimizationRecommendations).toHaveBeenCalled();
    });

    test('Cost efficiency metrics tracking', async () => {
      const scenarios = [
        { spend: 10, users: 50, expectedEfficiency: 0.8 },
        { spend: 20, users: 60, expectedEfficiency: 0.6 },
        { spend: 50, users: 70, expectedEfficiency: 0.4 }
      ];

      for (const scenario of scenarios) {
        mockCostService.getCurrentCosts.mockResolvedValue({
          total: scenario.spend,
          budgetRemaining: 1 - (scenario.spend / 100),
          byFeature: {},
          limitedFeatures: [],
          recommendations: [],
          efficiency: scenario.expectedEfficiency
        });

        const costStatus = await featureFlagStore.checkCostLimits();

        expect(costStatus.costEfficiency).toBe(scenario.expectedEfficiency);
      }
    });

    test('Feature usage vs cost optimization', async () => {
      // Mock features with different usage patterns
      const usageStats = {
        ANALYTICS_ENABLED: { usage: 0.8, cost: 2.0 }, // High usage, low cost - good
        AI_INSIGHTS_ENABLED: { usage: 0.2, cost: 15.0 }, // Low usage, high cost - bad
        CLOUD_SYNC_ENABLED: { usage: 0.9, cost: 5.0 } // High usage, medium cost - okay
      };

      mockCostService.getOptimizationRecommendations.mockResolvedValue([
        {
          id: 'usage-opt-1',
          type: 'disable',
          feature: 'AI_INSIGHTS_ENABLED',
          potentialSavings: 15.0,
          automated: false,
          description: 'Low usage vs high cost - consider disabling',
          impact: 'low'
        }
      ]);

      await featureFlagStore.optimizeCosts();

      // Should recommend disabling low-usage, high-cost features
      expect(mockCostService.getOptimizationRecommendations).toHaveBeenCalled();
    });
  });

  describe('6. Emergency Cost Controls', () => {
    test('Emergency budget stop disables all non-critical features', async () => {
      // Enable all features
      const allEnabled = Object.keys(DEFAULT_FEATURE_FLAGS).reduce((acc, key) => {
        acc[key as keyof typeof DEFAULT_FEATURE_FLAGS] = true;
        return acc;
      }, {} as typeof DEFAULT_FEATURE_FLAGS);

      useFeatureFlagStore.setState({ flags: allEnabled });

      // Simulate budget emergency (way over budget)
      mockCostService.getCurrentCosts.mockResolvedValue({
        total: 500.0,
        budgetRemaining: -4.0, // 400% over budget
        byFeature: {},
        limitedFeatures: Object.keys(DEFAULT_FEATURE_FLAGS).filter(key =>
          featureFlagStore.metadata[key as keyof typeof featureFlagStore.metadata]?.canDisableInCrisis
        ) as any,
        recommendations: ['EMERGENCY: Disable all non-critical features'],
        efficiency: 0.1
      });

      await featureFlagStore.disableExpensiveFeatures();

      // Crisis-safe features should remain
      expect(featureFlagStore.flags.EMERGENCY_CONTACTS_CLOUD).toBe(true);
      expect(featureFlagStore.flags.PUSH_NOTIFICATIONS_ENABLED).toBe(true);

      // All disableable features should be off
      Object.entries(featureFlagStore.metadata).forEach(([key, metadata]) => {
        if (metadata.canDisableInCrisis) {
          expect(featureFlagStore.flags[key as keyof typeof featureFlagStore.flags]).toBe(false);
        }
      });
    });

    test('Budget alerts and escalation', async () => {
      const { cloudMonitoringService } = require('../../src/services/cloud/CloudMonitoring');

      // Mock critical budget situation
      mockCostService.getCurrentCosts.mockResolvedValue({
        total: 95.0,
        budgetRemaining: 0.05, // 5% remaining
        byFeature: {},
        limitedFeatures: [],
        recommendations: ['URGENT: Budget almost exhausted'],
        efficiency: 0.3
      });

      await featureFlagStore.checkCostLimits();

      // Should trigger alerts (mocked)
      expect(cloudMonitoringService.reportCostAlert).toHaveBeenCalled();
    });

    test('Cost-limited feature evaluation', () => {
      // Set up cost limitations
      useFeatureFlagStore.setState({
        costStatus: {
          ...featureFlagStore.costStatus,
          limitedFeatures: ['AI_INSIGHTS_ENABLED', 'THERAPIST_PORTAL_ENABLED']
        }
      });

      // Cost-limited features should evaluate to false
      expect(featureFlagStore.evaluateFlag('AI_INSIGHTS_ENABLED')).toBe(false);
      expect(featureFlagStore.evaluateFlag('THERAPIST_PORTAL_ENABLED')).toBe(false);

      // Non-limited features should work normally
      expect(featureFlagStore.evaluateFlag('ANALYTICS_ENABLED')).toBe(false); // Default off
    });
  });

  describe('7. Performance Under Cost Pressure', () => {
    test('Cost checking performance', async () => {
      const iterations = 50;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await featureFlagStore.checkCostLimits();
      }

      const endTime = performance.now();
      const averageTime = (endTime - startTime) / iterations;

      // Cost checking should be reasonably fast
      expect(averageTime).toBeLessThan(50); // 50ms average
    });

    test('Feature evaluation with cost checks', () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        featureFlagStore.evaluateFlag('CLOUD_SYNC_ENABLED');
        featureFlagStore.evaluateFlag('ANALYTICS_ENABLED');
        featureFlagStore.evaluateFlag('AI_INSIGHTS_ENABLED');
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should be very fast even with cost checks
      expect(totalTime).toBeLessThan(100); // 100ms for 3000 evaluations
    });

    test('Memory usage during cost monitoring', () => {
      const initialHeap = (performance as any).memory?.usedJSHeapSize || 0;

      // Simulate heavy cost monitoring
      for (let i = 0; i < 100; i++) {
        featureFlagStore.evaluateFlag('AI_INSIGHTS_ENABLED');
        // Simulate cost data access
        const costStatus = featureFlagStore.costStatus;
        expect(costStatus).toBeDefined();
      }

      const finalHeap = (performance as any).memory?.usedJSHeapSize || 0;
      const heapGrowth = finalHeap - initialHeap;

      // Memory growth should be minimal
      if (initialHeap > 0) {
        expect(heapGrowth).toBeLessThan(256 * 1024); // 256KB max growth
      }
    });
  });

  describe('8. Cost Control Edge Cases', () => {
    test('Handling negative budget scenarios', async () => {
      mockCostService.getCurrentCosts.mockResolvedValue({
        total: 150.0,
        budgetRemaining: -0.5, // 50% over budget
        byFeature: {},
        limitedFeatures: [],
        recommendations: [],
        efficiency: 0.2
      });

      const costStatus = await featureFlagStore.checkCostLimits();

      expect(costStatus.budgetRemaining).toBe(-0.5);
      expect(costStatus.currentSpend).toBe(150.0);

      // Should trigger emergency cost controls
      await featureFlagStore.disableExpensiveFeatures();
    });

    test('Cost service failures handled gracefully', async () => {
      mockCostService.getCurrentCosts.mockRejectedValue(new Error('Cost service unavailable'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await featureFlagStore.checkCostLimits();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      // Should log error but not crash
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('Rapid cost changes handled correctly', async () => {
      const costChanges = [
        { spend: 10, remaining: 0.9 },
        { spend: 50, remaining: 0.5 },
        { spend: 85, remaining: 0.15 },
        { spend: 95, remaining: 0.05 }
      ];

      for (const change of costChanges) {
        mockCostService.getCurrentCosts.mockResolvedValue({
          total: change.spend,
          budgetRemaining: change.remaining,
          byFeature: {},
          limitedFeatures: [],
          recommendations: [],
          efficiency: change.remaining
        });

        await featureFlagStore.checkCostLimits();

        expect(featureFlagStore.costStatus.currentSpend).toBe(change.spend);
        expect(featureFlagStore.costStatus.budgetRemaining).toBe(change.remaining);
      }
    });
  });
});