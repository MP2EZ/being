/**
 * Crisis Feature - Public API
 *
 * Domain Authority: crisis (CRITICAL)
 * Performance Requirement: <200ms detection
 * Safety Critical: PHQ≥20, GAD≥15, Q9>0 detection
 *
 * This feature consolidates all crisis-related functionality into a single,
 * auditable location for safety and performance optimization.
 */

// Re-export all public APIs
export * from './services';
export * from './components';
export * from './screens';
export * from './types';
