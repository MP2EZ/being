/**
 * TypeScript Configuration Validation
 * Validates and enforces strict TypeScript settings for crisis-safe development
 * 
 * STRICT MODE REQUIREMENTS:
 * - strict: true (enables all strict type checking)
 * - noImplicitAny: true (no implicit any types)
 * - strictNullChecks: true (null and undefined safety)
 * - strictFunctionTypes: true (function type safety)
 * - noImplicitReturns: true (all code paths return)
 * - noFallthroughCasesInSwitch: true (switch statement safety)
 * - noUncheckedIndexedAccess: true (array/object access safety)
 * 
 * PERFORMANCE REQUIREMENTS:
 * - Fast type checking (<100ms for incremental)
 * - Memory efficient type analysis
 * - Optimized compilation for crisis scenarios
 */

/**
 * Recommended TypeScript Configuration for Crisis Safety
 */
export const RECOMMENDED_TS_CONFIG = {
  compilerOptions: {
    // Strict Type Checking (ALL REQUIRED)
    strict: true,
    noImplicitAny: true,
    strictNullChecks: true,
    strictFunctionTypes: true,
    strictBindCallApply: true,
    strictPropertyInitialization: true,
    noImplicitThis: true,
    
    // Code Quality (ALL REQUIRED)
    noImplicitReturns: true,
    noFallthroughCasesInSwitch: true,
    noUncheckedIndexedAccess: true,
    exactOptionalPropertyTypes: true,
    
    // Performance Optimizations
    incremental: true,
    skipLibCheck: false, // Keep false for full type safety
    
    // Crisis-specific path mapping
    baseUrl: ".",
    paths: {
      "@/crisis/*": ["src/types/crisis/*"],
      "@/compliance/*": ["src/types/compliance/*"],
      "@/security/*": ["src/types/security/*"],
      "@/performance/*": ["src/types/performance/*"],
      "@/errors/*": ["src/types/errors/*"]
    }
  }
} as const;

/**
 * Critical TypeScript Settings Validation
 */
export const CRITICAL_TS_SETTINGS = {
  CRISIS_CRITICAL: [
    'strict',
    'noImplicitAny',
    'strictNullChecks',
    'noImplicitReturns',
    'noFallthroughCasesInSwitch'
  ],
  FORBIDDEN_SETTINGS: [
    'suppressImplicitAnyIndexErrors',
    'suppressExcessPropertyErrors'
  ]
} as const;