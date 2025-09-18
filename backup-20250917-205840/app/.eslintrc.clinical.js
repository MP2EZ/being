/**
 * ESLint Configuration for Clinical Code Safety
 * 
 * Enhanced rules to prevent type errors that could affect
 * clinical accuracy and user safety in mental health applications.
 */

module.exports = {
  extends: [
    '@expo/eslint-config',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
  ],
  
  parser: '@typescript-eslint/parser',
  
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
  ],
  
  rules: {
    // CRITICAL: TypeScript Safety for Clinical Code
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/no-unsafe-argument': 'error',
    
    // Prevent Type Assertion Misuse
    '@typescript-eslint/consistent-type-assertions': [
      'error',
      {
        assertionStyle: 'as',
        objectLiteralTypeAssertions: 'never',
      },
    ],
    
    // Require Explicit Return Types for Clinical Functions
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        allowExpressions: false,
        allowTypedFunctionExpressions: false,
        allowHigherOrderFunctions: false,
        allowDirectConstAssertionInArrowFunctions: false,
      },
    ],
    
    // Strict Null Checks
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    
    // Array Safety
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/prefer-readonly-parameter-types': [
      'warn',
      {
        ignoreInferredTypes: true,
      },
    ],
    
    // Promise Handling for Async Operations
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/require-await': 'error',
    
    // Prevent Common Errors
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-shadow': 'error',
    '@typescript-eslint/no-redeclare': 'error',
    
    // Switch Statement Safety
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
    'default-case': 'error',
    
    // Function Safety
    'prefer-const': 'error',
    'no-var': 'error',
    'no-param-reassign': 'error',
    
    // React Specific Rules for Clinical UI
    'react/prop-types': 'off', // Use TypeScript instead
    'react/require-default-props': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
    
    // Clinical Code Specific Rules
    'no-console': [
      'warn',
      {
        allow: ['warn', 'error', 'info'],
      },
    ],
    
    // Prevent Magic Numbers in Clinical Code
    '@typescript-eslint/no-magic-numbers': [
      'warn',
      {
        ignore: [-1, 0, 1, 2, 3], // Allow common values and assessment scores
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
        ignoreEnums: true,
        ignoreNumericLiteralTypes: true,
        ignoreReadonlyClassProperties: true,
      },
    ],
    
    // Complexity Limits for Clinical Functions
    complexity: ['error', { max: 10 }],
    'max-depth': ['error', { max: 4 }],
    'max-lines-per-function': [
      'warn',
      {
        max: 50,
        skipBlankLines: true,
        skipComments: true,
      },
    ],
  },
  
  overrides: [
    // Stricter rules for clinical-specific files
    {
      files: [
        '**/store/assessmentStore.ts',
        '**/utils/validation.ts',
        '**/types/clinical.ts',
        '**/services/security/**/*.ts',
        '**/*crisis*.ts',
        '**/*assessment*.ts',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/no-magic-numbers': [
          'error',
          {
            ignore: [0, 1, 2, 3, 4, 7, 9, 15, 20, 21, 27], // Allow clinical thresholds
            ignoreArrayIndexes: true,
            ignoreDefaultValues: true,
            ignoreEnums: true,
            ignoreNumericLiteralTypes: true,
            ignoreReadonlyClassProperties: true,
          },
        ],
        'complexity': ['error', { max: 8 }],
        'max-depth': ['error', { max: 3 }],
        'no-console': [
          'error',
          {
            allow: ['error'], // Only allow error logging in critical files
          },
        ],
      },
    },
    
    // Relaxed rules for test files
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-magic-numbers': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        'max-lines-per-function': 'off',
      },
    },
    
    // Relaxed rules for type definition files
    {
      files: ['**/*.d.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    
    // Performance-critical files
    {
      files: [
        '**/components/checkin/BreathingCircle*.tsx',
        '**/components/core/CrisisButton.tsx',
        '**/hooks/useCrisisIntervention.ts',
      ],
      rules: {
        '@typescript-eslint/prefer-readonly-parameter-types': 'off', // Performance over immutability
        'react-hooks/exhaustive-deps': 'error',
        'no-console': [
          'error',
          {
            allow: ['error', 'warn'], // Allow performance warnings
          },
        ],
      },
    },
  ],
  
  // Environment configuration
  env: {
    es2022: true,
    node: true,
    'react-native/react-native': true,
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
  
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.expo/',
    'coverage/',
    '*.config.js',
    '*.config.ts',
  ],
};