/**
 * Consolidated ESLint Configuration
 * Phase 7A: Unified configuration combining standard and clinical safety rules
 *
 * INFRA-61: PHI-Safe Logging Enforcement
 * - no-console rule set to error for production code
 * - All logging must go through ProductionLogger
 * - Only console.error allowed for emergency/critical issues
 */

module.exports = [
  // Base configuration for all TypeScript files
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      'react': require('eslint-plugin-react'),
      'react-hooks': require('eslint-plugin-react-hooks'),
    },
    rules: {
      // Standard TypeScript Rules (compatible rules only)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      // MAINT-164: catches single-quoted strings containing ${...} template
      // syntax — they don't interpolate, so the literal text ships to logs.
      // 16 instances landed silently in security services before this rule.
      'no-template-curly-in-string': 'error',
      // DEBUG-342: gray[500] is #B8B8B8 — 1.98:1 on white. That is below the AA text
      // bar (4.5:1) AND below the WCAG 1.4.11 non-text bar (3:1), so there is no
      // legal use for it as a colour on any light surface in this app. DEBUG-323
      // fixed the semantic.text.muted token, but 34 sites read the raw ramp value
      // and bypassed the fix entirely — this rule is what stops site 35.
      // The matching test-file override below keeps the theme-contrast regression
      // pin (which must reference gray[500] to assert it fails) legal.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'MemberExpression[computed=true][property.value=500][object.property.name="gray"]',
          message:
            'colorSystem.gray[500] is 1.98:1 on white — fails AA text (4.5:1) and the 1.4.11 non-text bar (3:1). Use semantic.text.muted / semantic.text.secondary. See DEBUG-323, DEBUG-342.',
        },
      ],
      // Remove unsafe rules that don't exist in current version
      // '@typescript-eslint/no-unsafe-any': 'warn',
      // '@typescript-eslint/no-unsafe-assignment': 'warn',
      // '@typescript-eslint/no-unsafe-call': 'warn',
      // '@typescript-eslint/no-unsafe-member-access': 'warn',
      // '@typescript-eslint/no-unsafe-return': 'warn',
      // '@typescript-eslint/prefer-nullish-coalescing': 'error',
      // '@typescript-eslint/prefer-optional-chain': 'error',
      // '@typescript-eslint/no-floating-promises': 'error',
      // '@typescript-eslint/await-thenable': 'error',
      // '@typescript-eslint/switch-exhaustiveness-check': 'error',
      
      // React Rules
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      
      // General Code Quality
      'prefer-const': 'error',
      'no-var': 'error',
      // INFRA-61: Enforce ProductionLogger usage - only console.error allowed
      'no-console': ['error', { allow: ['error'] }],
      'complexity': ['warn', { max: 10 }],
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
  },
  
  // Stricter rules for clinical-critical files
  {
    files: [
      '**/store/assessmentStore.ts',
      '**/utils/validation.ts',
      '**/types/clinical.ts',
      '**/services/security/**/*.ts',
      '**/*crisis*.ts',
      '**/*assessment*.ts',
      // INFRA-151: PostHogProvider is the GPC consumer of the universalOptOut
      // signal — small, console-free, fits cleanly under strict rules. Other
      // compliance-adjacent files (consentStore, AnalyticsService, the privacy
      // settings screen) pre-date this ruleset and have complexity / console
      // patterns that would require separate refactor work to satisfy strict
      // rules. They're linted by the regular config until that cleanup lands.
      '**/analytics/PostHogProvider.tsx',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      // Remove unsafe rules that don't exist in current version
      // '@typescript-eslint/no-unsafe-any': 'error',
      // '@typescript-eslint/no-unsafe-assignment': 'error',
      // '@typescript-eslint/no-unsafe-call': 'error',
      // '@typescript-eslint/no-unsafe-member-access': 'error',
      // '@typescript-eslint/no-unsafe-return': 'error',
      // '@typescript-eslint/no-magic-numbers': [
      //   'error',
      //   {
      //     ignore: [0, 1, 2, 3, 4, 7, 9, 15, 20, 21, 27], // Clinical thresholds
      //     ignoreArrayIndexes: true,
      //     ignoreDefaultValues: true,
      //     ignoreEnums: true,
      //   },
      // ],
      'complexity': ['error', { max: 8 }],
      'max-depth': ['error', { max: 3 }],
      // INFRA-61: Clinical files must use ProductionLogger exclusively
      'no-console': ['error', { allow: ['error'] }],
    },
  },

  // Relaxed rules for test files
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'complexity': 'off',
      'max-depth': 'off',
      // DEBUG-342: the contrast regression pins MUST be able to name gray[500] —
      // asserting that it fails is the whole point of those tests.
      'no-restricted-syntax': 'off',
    },
  },
  
  // Performance-critical components
  {
    files: [
      '**/components/checkin/BreathingCircle*.tsx',
      '**/components/core/CrisisButton.tsx',
      '**/hooks/useCrisisIntervention.ts',
    ],
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      // INFRA-61: Performance components - only error allowed
      'no-console': ['error', { allow: ['error'] }],
    },
  },

  // INFRA-61: Logging service files - allowed to use console for output handlers
  {
    files: [
      '**/services/logging/**/*.ts',
      '**/services/logging/**/*.tsx',
    ],
    rules: {
      // ProductionLogger outputs to console based on environment
      'no-console': ['error', { allow: ['log', 'error', 'warn', 'info'] }],
    },
  },
];