/**
 * Payment Sync Resilience Test Sequencer
 *
 * Custom test sequencer for optimal resilience test execution:
 * - Runs performance tests first to establish baselines
 * - Isolates memory-intensive tests
 * - Prioritizes crisis scenarios
 * - Sequences stress tests to avoid interference
 */

const DefaultSequencer = require('@jest/test-sequencer').default;

class ResilienceTestSequencer extends DefaultSequencer {
  /**
   * Sort test files for optimal resilience testing
   */
  sort(tests) {
    // Define test priority order
    const testPriorities = {
      // Performance baselines first
      'performance/payment-sync-performance.test.ts': 1,

      // Security tests next (establish security baselines)
      'security/payment-sync-security.test.ts': 2,

      // Therapeutic continuity (core functionality)
      'therapeutic-continuity/therapeutic-continuity.test.ts': 3,

      // Integration tests (comprehensive scenarios)
      'integration/payment-sync-resilience-integration.test.ts': 4,

      // Failure scenarios last (most disruptive)
      'failure-scenarios/payment-sync-failure-scenarios.test.ts': 5
    };

    // Sort by priority, then by file size (smaller first for faster feedback)
    return tests.sort((testA, testB) => {
      const pathA = testA.path;
      const pathB = testB.path;

      // Extract relative path for priority matching
      const relativePathA = pathA.split('payment-sync-resilience/')[1] || pathA;
      const relativePathB = pathB.split('payment-sync-resilience/')[1] || pathB;

      const priorityA = testPriorities[relativePathA] || 999;
      const priorityB = testPriorities[relativePathB] || 999;

      // Sort by priority first
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Then by file size (smaller first for faster feedback)
      const sizeA = testA.context?.hasteFS?.getSize?.(pathA) || 0;
      const sizeB = testB.context?.hasteFS?.getSize?.(pathB) || 0;

      return sizeA - sizeB;
    });
  }

  /**
   * Determine if tests should run in band (sequentially)
   * Memory-intensive and stress tests should run sequentially
   */
  shouldRunInBand(tests, { watch, watchAll } = {}) {
    // Run in band for stress tests and memory monitoring
    const hasStressTests = tests.some(test =>
      test.path.includes('performance') ||
      test.path.includes('failure-scenarios')
    );

    // Run in band if:
    // 1. Watch mode (for better feedback)
    // 2. Stress tests present (to avoid memory conflicts)
    // 3. Small number of tests (overhead not worth parallelization)
    return watchAll || watch || hasStressTests || tests.length < 3;
  }
}

module.exports = ResilienceTestSequencer;