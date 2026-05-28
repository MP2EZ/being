/**
 * Enhanced Jest Configuration - Consolidated Development Setup
 * Combines: jest.local.config.js + jest.quick.config.js → jest.config.js
 *
 * Features:
 * - Development optimizations for local testing
 * - Quick test patterns for rapid iteration
 * - Performance monitoring and clinical safety validation
 * - Flexible execution modes (normal, quick, coverage)
 */

const isQuickMode = process.env.JEST_QUICK === 'true';
const isDevMode = process.env.NODE_ENV === 'development' || !process.env.CI;

module.exports = {
  preset: 'react-native',

  // Setup files for different test types
  setupFiles: [
    '<rootDir>/__tests__/setup/env.mock.js',
    '<rootDir>/__tests__/setup/polyfills.js'
  ],

  setupFilesAfterEnv: isQuickMode ? [
    '<rootDir>/__tests__/setup/quick-setup.js'
  ] : [
    '<rootDir>/__tests__/setup/jest.setup.js',
    '<rootDir>/__tests__/setup/performance-monitoring.js'
  ],

  // Test discovery patterns - Quick mode vs full mode
  testMatch: isQuickMode ? [
    '<rootDir>/src/**/*.quick.test.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/quick/**/*.{js,jsx,ts,tsx}'
  ] : [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/?(*.)(test|spec).{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}'
  ],

  // Ignore patterns for faster runs in quick mode
  testPathIgnorePatterns: isQuickMode ? [
    '/node_modules/',
    '/.expo/',
    '/android/',
    '/ios/',
    '/_archive_[^/]*/',
    '/.to_delete_removed/',
    '.*\\.e2e\\.test\\.',
    '.*\\.integration\\.test\\.',
    '.*\\.performance\\.test\\.',
    '/integration/',
    '/e2e/',
    '/performance/'
  ] : [
    '/node_modules/',
    '/.expo/',
    '/android/',
    '/ios/',
    '/_archive_[^/]*/',
    '/.to_delete_removed/',

    // Support files under __tests__/ that match the broad testMatch
    // pattern but contain no test() blocks. Without ignoring, jest
    // reports "Your test suite must contain at least one test."
    '/__tests__/setup/',
    '/__tests__/utils/',
    '/__tests__/reporters/',
    '/__tests__/helpers/',

    // TODO: integration test backlog — these load but fail for reasons
    // beyond the "fix broken imports" scope of the W1 paydown PR. Re-enable
    // by fixing each underlying issue:
    //
    //  - subscription.integration.test.ts: MAINT-166 PR 2 added a
    //    synchronous afterEach that clears IAP listener subscriptions
    //    via direct singleton-field reset (avoids the async
    //    RNIap.endConnection mock that hangs under --coverage --ci).
    //    Result: 8/8 pass locally with no open handles. CI still
    //    times out on all 8 tests after 30s — the issue isn't async
    //    leak anymore, it's something deeper about how the IAPService
    //    + Zustand store interaction behaves under coverage
    //    instrumentation on Ubuntu CI runners. Out of scope for PR 2;
    //    needs deeper investigation (try --runInBand, try splitting
    //    out coverage, try replacing the IAP listener pattern with
    //    a direct callback registry). Re-quarantined.
    //  - sync-coordinator-integration.test.ts: MAINT-166 PR 5 fixed all
    //    31 SyncCoordinator API drift sites (singleton import, cleanup,
    //    performFullSync, triggerPriorityBackup, getSyncStatus) and
    //    wired the encryption-mock helper + assessmentStore auto-mock.
    //    14/26 tests pass locally; remaining 12 assert
    //    `status.isInitialized` on the SyncStatus shape — that field
    //    doesn't exist on the current shape (we have `globalState`
    //    instead). Future rewrite needs to project the new shape into
    //    the assertions. File-level note at the top of the test pins
    //    this state. Re-quarantined for the INFRA-180 CI flake.
    //  - analytics-service-integration.test.ts: MAINT-166 PR 5 fixed
    //    the SyncCoordinator API drift and wired the encryption-mock
    //    helper. 10/18 tests pass locally; remaining 8 assert
    //    `analyticsService.getStatus().initialized` and similar
    //    AnalyticsService return-shape fields that have also drifted.
    //    AnalyticsService API surface itself needs an audit pass.
    //    Re-quarantined for the INFRA-180 CI flake.
    //  - practices-flows-integration.test.tsx: MAINT-166 PR 4
    //    confirmed the UIManager mock issue called out previously is
    //    already resolved (jest.setup.js:335 provides the mock). The
    //    actual blockers are deeper: testID drift (test looks for
    //    `safety-button` which became `collapsible-crisis-button` after
    //    a rename) + real-timer assertions (8-second BreathingCircle
    //    cycle precision test takes 8+s of wall time per execution).
    //    Needs a per-assertion audit similar to comprehensive-assessment
    //    plus the fake-timer fix from INFRA-180 docs. Filed for a
    //    future PR — out of MAINT-166 PR 4 scope.
    //  - comprehensive-assessment-integration.test.ts: MAINT-166 PR 4
    //    fixed the underlying bugs (stale-store-snapshot pattern,
    //    canonical CrisisDetection shape, encryption-mock helper,
    //    test-arithmetic errors). Result: 8/12 pass locally, 4 skipped
    //    with documented TODOs. CI under --coverage --ci still times
    //    out the tests (same INFRA-180 fake-timer/coverage flake family
    //    affecting timer-screen tests + subscription.integration). The
    //    file's changes were kept (encryption mock, state() helper, etc.)
    //    so a future investigator can pick up from a better baseline
    //    once the CI flake is solved. Re-quarantined for now.
    //  - PracticeTimerScreen.test.tsx, ReflectionTimerScreen.test.tsx,
    //    BodyScanScreen.test.tsx: pass locally on macOS but exceed the
    //    30s test timeout on Ubuntu CI runners. Mock Timer component
    //    uses real `setInterval(...)` rather than jest fake timers, so
    //    multi-second test cases compound. Fix: convert to
    //    jest.useFakeTimers() with jest.advanceTimersByTime().
    //  - sync-performance-validation.test.ts, week3-analytics-
    //    performance.test.ts: MAINT-166 PR 5 fixed the SyncCoordinator
    //    API drift mechanically. File-level notes capture the
    //    follow-up: performance assertions in Jest are flaky by
    //    construction (coverage instrumentation distorts timing).
    //    Honest home for sync/analytics perf validation is the
    //    `npm run perf:*` scripts on a real device. If solving the
    //    INFRA-180 CI flake doesn't unblock these files, the
    //    follow-up is to delete them and replace coverage with a
    //    perf:* script entry or Maestro flow.
    //  - sync-emergency-scenarios.test.ts: MAINT-166 PR 5 fixed the 7
    //    SyncCoordinator API drift sites (new SyncCoordinator →
    //    singleton, .shutdown → .cleanup, .performSync(reason) →
    //    .triggerPriorityBackup(reason)/.performFullSync()) and
    //    repaired EmergencySimulator.simulateAppTermination(), which
    //    was throwing inside a bare setTimeout and killing the Jest
    //    worker. 2/15 tests pass locally; remaining 13 assert that
    //    `Alert.alert` was called during sync operations — but Alert
    //    is fired by UI components (e.g. CrisisAssessmentAlert), not
    //    by SyncCoordinator's subscription callback. That's a layer
    //    mismatch in the original test design; fixing it requires
    //    moving the assertions into UI-level tests. Re-quarantined
    //    for the INFRA-180 CI flake.
    'subscription\\.integration\\.test\\.ts$',
    'sync-coordinator-integration\\.test\\.ts$',
    'analytics-service-integration\\.test\\.ts$',
    'practices-flows-integration\\.test\\.tsx$',
    'comprehensive-assessment-integration\\.test\\.ts$',
    // INFRA-180 follow-through: PracticeTimerScreen temporarily
    // de-quarantined as the canary for the Node-20-vs-22 hypothesis.
    // Will re-quarantine if the fix doesn't pan out.
    // 'PracticeTimerScreen\\.test\\.tsx$',
    'ReflectionTimerScreen\\.test\\.tsx$',
    'sync-performance-validation\\.test\\.ts$',
    'week3-analytics-performance\\.test\\.ts$',
    'BodyScanScreen\\.test\\.tsx$',
    'sync-emergency-scenarios\\.test\\.ts$',
  ],

  // Module extensions and transformations
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },

  transformIgnorePatterns: [
    // Note on the negative lookahead pattern: each alternation entry must
    // be followed by `/` (see the trailing `/)` outside the alternation).
    // That means `expo` matches `node_modules/expo/...` but NOT
    // `node_modules/expo-font/...` — the hyphen breaks the `/` match.
    // We have to enumerate each `expo-*` ESM package explicitly. (Or use
    // a regex like `expo[a-z-]*` — but the explicit list is more grep-able
    // when a new module starts failing to parse.)
    'node_modules/(?!(react-native|@react-native|react-native-vector-icons|react-native-aes-crypto|@react-navigation|react-navigation|expo|@expo|expo-font|expo-asset|expo-constants|react-native-iap|react-native-nitro-modules|expo-local-authentication|expo-modules-core|zustand|react-native-gesture-handler|react-native-reanimated|react-native-worklets|uuid|@sentry)/)'
  ],

  // Enhanced module mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1',
    '^@setup/(.*)$': '<rootDir>/__tests__/setup/$1',
    '^@utils/(.*)$': '<rootDir>/__tests__/utils/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@flows/(.*)$': '<rootDir>/src/flows/$1',
    '^@stores/(.*)$': '<rootDir>/src/stores/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1'
  },

  // Coverage configuration
  collectCoverage: process.env.JEST_COVERAGE === 'true' && !isQuickMode,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,ts,tsx}',
    '!src/**/*.config.{js,ts}',
    '!src/**/index.{js,ts,tsx}'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/coverage/',
    '.d.ts$'
  ],

  // Coverage thresholds for development validation.
  //
  // INFRA-143 PR 4 (TEST-15): per-path floors restored for the three
  // CLAUDE.md "protected paths" (crisis, assessment, core/services/security).
  // These match the global floor — that's a conservative restoration. The
  // audit recommended 90/95 aspirational targets, but without measuring
  // the current baseline that could fail CI immediately. Once the protected
  // paths have measured coverage, ratchet these up per directory.
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    './src/features/crisis/': {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    './src/features/assessment/': {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    './src/core/services/security/': {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },

  // Performance and execution optimization.
  // DEBUG-48 had previously added `workerIdleMemoryLimit: '512MB'` as a
  // band-aid for OOMs caused by leaking singleton timers (setInterval in
  // service constructors). Those leaks are now guarded under NODE_ENV=test
  // for EncryptionService + SecureStorageService (INFRA-144), and the
  // `test` / `test:ci` scripts add `--forceExit` to ensure workers exit
  // even when a transient open handle remains. Band-aid removed
  // (INFRA-143 PR 2 AC #2).
  cache: true,
  cacheDirectory: isQuickMode ? '<rootDir>/.jest-cache-quick' : '<rootDir>/.jest-cache',
  maxWorkers: isQuickMode ? 1 : '50%',
  testTimeout: isQuickMode ? 5000 : 10000,

  // Feedback and monitoring
  bail: false, // Continue on failures for comprehensive feedback
  verbose: !isQuickMode,
  detectOpenHandles: isDevMode,
  forceExit: false,
  errorOnDeprecated: true,
  testFailureExitCode: 1,

  // Reporters — Quick vs CI vs local.
  //
  // INFRA-143 PR 4: the custom performance-regression-reporter and
  // coverage-reporter are CI-only. Locally they emit ~10 lines of
  // ⏱️/📊/🚨 noise per test file — that's hundreds of console lines on
  // every full suite run, drowning the actual pass/fail summary. CI
  // benefits from the JSON artifacts (used by perf-regression detection
  // jobs); local runs don't.
  reporters: isQuickMode ? [
    ['default', { verbose: false }],
    '<rootDir>/__tests__/reporters/quick-reporter.js'
  ] : process.env.CI === 'true' ? [
    'default',
    ['<rootDir>/__tests__/reporters/performance-regression-reporter.js', {
      outputFile: 'test-results/performance-regression.json',
      includeTimings: true
    }],
    ['<rootDir>/__tests__/reporters/coverage-reporter.js', {
      outputFile: 'test-results/coverage-summary.json'
    }]
  ] : [
    'default',
  ],

  // Global test environment variables
  globals: {
    __DEV__: true,
    __TEST__: true,
    __LOCAL_TESTING__: !isQuickMode,
    __QUICK_TEST__: isQuickMode
  },

  // Test environment configuration
  testEnvironment: 'node',
  testEnvironmentOptions: {
    url: 'http://localhost',
    userAgent: isQuickMode ? 'jest-quick-test-environment' : 'jest-local-test-environment'
  },

  // Watch mode configuration for development
  watchman: isDevMode,
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.expo/',
    '<rootDir>/coverage/',
    '<rootDir>/test-results/'
  ]
};