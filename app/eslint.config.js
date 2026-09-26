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
      // MAINT-437 — react-native's SafeAreaView is deprecated AND iOS-only: on Android it
      // renders a plain View applying zero insets, and SDK 56 makes edge-to-edge mandatory
      // and non-disableable. So a regression here is a silent Android layout defect, not
      // just a deprecation warning.
      //
      // SCOPE, and why it is not widened. This block is `src/**/*.{ts,tsx}`, which covers
      // all 8 migrated source sites. It does NOT reach co-located tests in practice:
      // tsconfig excludes `*.test.*`, so `parserOptions.project` fails to parse them and no
      // rule runs. The MAINT-659 core block at the end of this file redefines this rule for
      // src/core and re-reads these `paths` from here. It does NOT cover `app/__tests__`,
      // and that gap is RECORDED rather than closed, for two reasons:
      //   1. `no-restricted-imports` structurally cannot see the shape that actually lived
      //      there — `SafeAreaView: RN.SafeAreaView` is an object property in a jest.mock
      //      factory, not an import node — so widening the glob would not have caught it.
      //   2. Widening via the `lint` script would be INERT in CI anyway:
      //      scripts/lint-baseline.js hardcodes `eslint src --ext .ts,.tsx`, and ci.yml
      //      runs `lint:baseline`, never `lint`.
      // `scripts/check-safe-area-imports.js` owns both test roots and `.js`, and runs in
      // CI via `test:scripts`. The two guards are complementary, not redundant.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['SafeAreaView'],
              message:
                "MAINT-437: react-native's SafeAreaView is deprecated and iOS-only (a no-op View on Android). Import SafeAreaView from 'react-native-safe-area-context' and pass an explicit `edges` prop with a rationale comment. The curated react-native jest mock no longer exports it, so this also fails at render time under jest.",
            },
          ],
        },
      ],
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

// ── MAINT-659: core/ must not import features/ ──────────────────────────────────────
//
// Appended rather than declared above the array so no line in the blocks above moves:
// source comments cite this file by line number.
//
// CORE_FEATURE_IMPORT_EXCEPTIONS is THE list — the only place in the repo that names
// which core files may import from features/. docs/architecture/import-guidelines.md
// points here rather than repeating it. It is a LAYERING list, not a crisis ruling:
// crisis status is decided by the Protected Paths table in .claude/CLAUDE.md and by
// INFRA-531's /b-close import detector, and neither list is edited to satisfy the other.
// If a file drops off because its crisis import vanished, do not just delete the entry:
// find where the consumption went (a helper extracted out of a consumer is invisible to
// INFRA-531). `__tests__/scripts/eslint-core-features-boundary.test.js` fails on an
// entry whose file no longer exists or no longer imports from features.
const CORE_FEATURE_IMPORT_EXCEPTIONS = [
  // A — composition root: the navigators mount every feature's screens.
  'src/core/navigation/CleanRootNavigator.tsx',
  'src/core/navigation/CleanTabNavigator.tsx',
  // B — single-source copy: WELLNESS_LABELS is compliance-pinned (MAINT-615).
  'src/core/components/ThresholdEducationModal.tsx',
  // C — recorded layering debt. Each is a real inversion, left in place because moving
  // it touches gated code. Delete the entry in the change that moves the file.
  'src/core/utils/timeOfDay.ts', // type-only DailyLoopMode (home, dailyloop)
  'src/core/services/guidanceContent.ts', // type-only; sole consumer is features/guidance
  'src/core/services/moduleContent.ts', // type-only; consumers are learn, practices
  'src/core/services/passagesContent.ts', // sole consumer is features/library
  'src/core/services/supabase/CloudBackupService.ts', // reads assessmentStore
  'src/core/services/supabase/SyncCoordinator.ts', // reads assessmentStore
  'src/core/services/privacy/DataExportService.ts', // reads journalEntryStore
  'src/core/config/e2eSeed.ts', // seeds stoicPracticeStore; Protected Path
  'src/core/components/subscription/PurchaseOptionsScreen.tsx', // profile's SubMenuHeader
];

// The leaf allowance: specifiers ANY core file may import, excepted or not. They are
// INFRA-531's three anchors plus CrisisTextInput, and they are exactly what the crisis
// guards prescribe as the fix — DEBUG-506's keyboard-accessory guard names
// CrisisTextInput, DEBUG-406's modal-occlusion guard points at crisisButtonGeometry. A
// boundary that errored on the prescribed fix would make a literal copy or a lazy import
// the cheaper route, which is the harm. Only the `@/features/...` spelling is allowed,
// because that is the spelling INFRA-531 anchors on.
const CORE_FEATURE_LEAF_ALLOWANCE = [
  'crisis/constants/[\\w-]+(?:/[\\w-]+)*',
  'crisis/types/safety',
  'assessment/types/scoring',
  'crisis/components/CrisisTextInput',
];

const CORE_FEATURES_MESSAGE =
  'MAINT-659: core/ must not import features/. For a genuine layering exception, add a reviewed entry to CORE_FEATURE_IMPORT_EXCEPTIONS in eslint.config.js — never an eslint-disable. Crisis values and components: import them statically by their direct @/features/crisis/... path. Never copy them as literals (DEBUG-586), move them into core or re-export them through core (INFRA-531), reach them by a relative path, or load them with require()/import()/React.lazy.';

const CORE_FEATURES_REEXPORT_MESSAGE =
  'MAINT-659 [re-export]: core must never re-export from features/, leaf modules included. One core re-export hides every later consumer from INFRA-531, which keys on the import line in each consumer. Import from the feature module directly at each call site.';

// esquery cannot take a `/` inside a regex literal, so the separator is \x2F.
const FEATURES_SEGMENT_RE = '/(^|\\x2F)features(\\x2F|$)/';

const CORE_FEATURES_SYNTAX = [
  {
    // no-restricted-imports only sees import/export declarations.
    selector: `CallExpression[callee.name="require"][arguments.0.value=${FEATURES_SEGMENT_RE}]`,
    message: CORE_FEATURES_MESSAGE,
  },
  {
    selector: `ImportExpression[source.value=${FEATURES_SEGMENT_RE}]`,
    message: CORE_FEATURES_MESSAGE,
  },
  {
    // Applies to leaf modules too.
    selector: `ExportNamedDeclaration[source.value=${FEATURES_SEGMENT_RE}]`,
    message: CORE_FEATURES_REEXPORT_MESSAGE,
  },
  {
    selector: `ExportAllDeclaration[source.value=${FEATURES_SEGMENT_RE}]`,
    message: CORE_FEATURES_REEXPORT_MESSAGE,
  },
];

// Flat config REPLACES a rule's options per matching object, so this block must carry
// MAINT-437's SafeAreaView `paths` and DEBUG-342's gray[500] selector or every core file
// silently loses them. They are READ from the base block, not copied, so they cannot drift.
const baseBlock = module.exports.find((c) => c.files && c.files[0] === 'src/**/*.{ts,tsx}');
const [, baseRestrictedImports] = baseBlock.rules['no-restricted-imports'];
const [, ...baseRestrictedSyntax] = baseBlock.rules['no-restricted-syntax'];

// `ignores` sits INSIDE this object on purpose: excepted files and tests simply do not
// match it and keep the base block's options. A standalone `{ ignores }` object would be
// a GLOBAL ignore (no rule at all), and an exception object setting the rule 'off' would
// drop MAINT-437 with it. Appended last; no block above sets either rule for src/core.
module.exports.push({
  name: 'being/core-features-boundary',
  files: ['src/core/**/*.{ts,tsx}'],
  ignores: [
    ...CORE_FEATURE_IMPORT_EXCEPTIONS,
    'src/core/**/__tests__/**',
    'src/core/**/*.test.{ts,tsx}',
    'src/core/**/*.spec.{ts,tsx}',
  ],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        ...baseRestrictedImports,
        patterns: [
          {
            // @/features and everything under it, except the leaf allowance.
            regex: `^@/features(?:$|/(?!(?:${CORE_FEATURE_LEAF_ALLOWANCE.join('|')})$))`,
            caseSensitive: true,
            message: CORE_FEATURES_MESSAGE,
          },
          {
            // Every other spelling of a path into features/: relative, baseUrl
            // (`src/features`), or an alias that walks back out (`@/core/../features`).
            // The allowance never applies — INFRA-531 cannot see these spellings.
            regex: '^(?:\\.{1,2}/|src/|@/(?!features(?:/|$)))(?:[^/]+/)*features(?:/|$)',
            caseSensitive: true,
            message: CORE_FEATURES_MESSAGE,
          },
        ],
      },
    ],
    'no-restricted-syntax': ['error', ...baseRestrictedSyntax, ...CORE_FEATURES_SYNTAX],
  },
});
