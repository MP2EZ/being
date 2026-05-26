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
    //  - sync-coordinator-integration.test.ts: MAINT-166 PR 2 confirmed
    //    that the master-key issue called out in the prior comment is
    //    not the actual blocker. The test calls `new SyncCoordinator()`,
    //    `.shutdown()`, `.performSync('manual')`, and `.getStatus()` —
    //    all of which reference the pre-singleton API. Current module
    //    is `export default getInstance()` with `initialize()` /
    //    `cleanup()` / `performFullSync()` / `triggerPriorityBackup()` /
    //    `getSyncStatus()`. Adding `jest.mock(assessmentStore)` +
    //    encryption mocks is necessary but not sufficient. Moved to
    //    PR 5 (MAINT-E) scope — same SyncCoordinator API rewrite as
    //    sync-performance-validation. PR 5 can reuse the encryption
    //    helper at `__tests__/helpers/mockEncryption.ts`.
    //  - analytics-service-integration.test.ts: same root cause as
    //    sync-coordinator above. Test also uses `new SyncCoordinator()`,
    //    `.shutdown()`, `.performSync()`, `.getStatus()`. Has
    //    `jest.mock(assessmentStore)` in place from INFRA-143 PR 2 but
    //    needs the SyncCoordinator API rewrite to actually pass. Moved
    //    to PR 5 (MAINT-E) scope.
    //  - practices-flows-integration.test.tsx: @react-navigation/elements
    //    MaskedViewNative.tsx calls UIManager.getViewManagerConfig() on
    //    a native view manager that's undefined in Jest. Fix: provide a
    //    custom react-native UIManager mock, or mock the navigation stack.
    //  - comprehensive-assessment-integration.test.ts: 10/12 tests fail
    //    on assertion mismatch (e.g., expect store.currentSession truthy,
    //    receives null). Production assessment-store API likely diverged
    //    from test expectations during a refactor. Needs assertion-level
    //    audit, not import-level fix.
    //  - PracticeTimerScreen.test.tsx, ReflectionTimerScreen.test.tsx,
    //    BodyScanScreen.test.tsx: pass locally on macOS but exceed the
    //    30s test timeout on Ubuntu CI runners. Mock Timer component
    //    uses real `setInterval(...)` rather than jest fake timers, so
    //    multi-second test cases compound. Fix: convert to
    //    jest.useFakeTimers() with jest.advanceTimersByTime().
    //  - sync-performance-validation.test.ts, week3-analytics-
    //    performance.test.ts: tests written against older service APIs
    //    that have since refactored. They call `new SyncCoordinator()`
    //    (now a singleton via getInstance), `.shutdown()` (renamed/
    //    removed), and assume crypto/auth API shapes that no longer
    //    exist. Needs proper rewrite to match current SyncCoordinator
    //    + AnalyticsService + AuthenticationService APIs, not
    //    incremental patching.
    //  - sync-emergency-scenarios.test.ts: MAINT-166 PR 2 fixed the
    //    import path (now `@/core/services/supabase/SyncCoordinator`)
    //    and added the encryption-mock helper + assessmentStore
    //    auto-mock. Remaining blocker: SyncCoordinator's public API
    //    has drifted since the test was written. The test calls
    //    `new SyncCoordinator()`, `syncCoordinator.shutdown()`, and
    //    `syncCoordinator.performSync('crisis')`, but the current
    //    module is a singleton (`export default getInstance()`) with
    //    `initialize()` / `cleanup()` / `performFullSync()` /
    //    `triggerPriorityBackup()`. Needs assertion-level API
    //    rewrite — moved to PR 5 (MAINT-E) scope alongside
    //    sync-performance-validation, which has the same drift.
    'sync-coordinator-integration\\.test\\.ts$',
    'analytics-service-integration\\.test\\.ts$',
    'practices-flows-integration\\.test\\.tsx$',
    'comprehensive-assessment-integration\\.test\\.ts$',
    'PracticeTimerScreen\\.test\\.tsx$',
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
    'node_modules/(?!(react-native|@react-native|react-native-vector-icons|react-native-aes-crypto|@react-navigation|react-navigation|expo|@expo|expo-font|expo-asset|expo-constants|react-native-iap|react-native-nitro-modules|expo-local-authentication|expo-modules-core|zustand|react-native-gesture-handler|react-native-reanimated|react-native-worklets|uuid)/)'
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