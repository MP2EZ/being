/**
 * Assessment Feature - Public API
 *
 * Domain Authority: philosopher + crisis (CLINICAL)
 * Clinical Accuracy Requirement: 100% PHQ-9/GAD-7 scoring
 * Validation: All 48 scoring combinations (27 PHQ-9 + 21 GAD-7)
 *
 * This feature manages PHQ-9 and GAD-7 clinical assessments with
 * exact scoring algorithms and crisis threshold detection.
 */

// Public Components
export * from './components';

// Public Stores
export * from './stores';

// Public Types
export * from './types';

// No `./hooks` re-export: the directory held only `useAssessmentPerformance`,
// which MAINT-398 deleted along with the parallel crisis scorer it drove.
