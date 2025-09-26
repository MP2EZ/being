/**
 * Clinical Assessment Types - BACKWARD COMPATIBILITY RE-EXPORT MODULE
 *
 * PHASE 4C CLINICAL CONSOLIDATION COMPLETED
 *
 * This module now re-exports all clinical types from the canonical crisis-safety.ts
 * to maintain backward compatibility while centralizing clinical type definitions.
 *
 * MIGRATION NOTICE:
 * - All clinical types consolidated into crisis-safety.ts for single source of truth
 * - Existing imports continue to work (backward compatibility preserved)
 * - Future imports should reference crisis-safety.ts directly
 * - This re-export module will be maintained for compatibility
 *
 * CRITICAL PRESERVATION:
 * - PHQ-9 threshold: ≥20 (exact, life-critical)
 * - GAD-7 threshold: ≥15 (exact, life-critical)
 * - Crisis response: <200ms (exact, performance-critical)
 * - Assessment accuracy: 100% (zero tolerance for errors)
 *
 * @deprecated_imports Use crisis-safety.ts directly for new code
 * @consolidation_result clinical.ts → crisis-safety.ts (single source of truth)
 */

// === RE-EXPORTS FROM CANONICAL CRISIS-SAFETY.TS ===

export type {
  // Assessment Answer Types
  PHQ9Answer,
  GAD7Answer,
  PHQ9Answers,
  GAD7Answers,

  // Score Types
  PHQ9Score,
  GAD7Score,

  // Severity Types
  PHQ9Severity,
  GAD7Severity,

  // Assessment Types
  Assessment,
  AssessmentID,
  CheckInID,
  AssessmentContext,

  // Branded String Types
  ISODateString,
  EncryptedString,
  PlaintextString,

  // Function Types
  CrisisDetectionFunction,

  // Utility Types
  ValidateScore,
  SeverityForType,
  ScoreForType,
  AnswersForType,

  // Interface Types
  ClinicalCalculations,
  AssessmentQuestion,
  AssessmentOption,
  AssessmentValidation,

  // Emergency Contact Types
  EmergencyPhoneNumber,
  CrisisResponseTime,

  // Therapeutic Timing Types
  BreathDuration,
  AnimationFrame,
  TherapeuticTiming
} from './crisis-safety';

export {
  // Crisis Thresholds (IMMUTABLE)
  CRISIS_THRESHOLD_PHQ9,
  CRISIS_THRESHOLD_GAD7,
  SUICIDAL_IDEATION_QUESTION_INDEX,
  SUICIDAL_IDEATION_THRESHOLD,

  // Type Guards
  isPHQ9Assessment,
  isGAD7Assessment,

  // Factory Functions
  createISODateString,
  createAssessmentID,

  // Error Classes
  ClinicalValidationError,
  CrisisDetectionError,

  // Constants
  CLINICAL_CONSTANTS
} from './crisis-safety';

// === BACKWARD COMPATIBILITY WARNING ===

if (process.env.NODE_ENV === 'development') {
  console.warn(
    '[CLINICAL CONSOLIDATION] Importing from clinical.ts detected.\n' +
    'Consider migrating to crisis-safety.ts for new code:\n' +
    'import { PHQ9Score, GAD7Score, Assessment } from "./crisis-safety";\n' +
    'This re-export module maintained for compatibility.'
  );
}