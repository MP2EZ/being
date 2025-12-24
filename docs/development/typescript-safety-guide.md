# TypeScript Safety Guide for Being

## Overview

This guide outlines the enhanced TypeScript implementation designed to ensure **clinical accuracy** and **user safety** in the Being mental health application. Type errors in mental health applications are not just bugs – they can be life-threatening failures in crisis situations.

## 🚨 Critical Safety Standards

### Zero Tolerance for Type Errors

The following areas require **100% type safety** with zero tolerance for any type errors:

- **PHQ-9/GAD-7 Scoring Algorithms** - Incorrect calculations could misclassify mental health severity
- **Crisis Detection Logic** - Failed crisis detection could prevent life-saving interventions
- **Emergency Contact Systems** - Type errors could block access to emergency services
- **Data Encryption/Decryption** - Data corruption could compromise user privacy
- **Therapeutic Timing** - Incorrect breathing exercise timing affects clinical effectiveness

### Clinical Accuracy Requirements

```typescript
// ✅ CORRECT: Type-safe clinical calculations
const calculatePHQ9Score = (answers: PHQ9Answers): PHQ9Score => {
  return answers.reduce((sum, answer) => sum + answer, 0);
};

// ❌ INCORRECT: Unsafe calculations that could cause clinical errors
const calculateScore = (answers: any[]): number => {
  return answers.reduce((sum, answer) => sum + answer, 0);
};
```

## 📋 TypeScript Configuration

### Enhanced tsconfig.json

Our TypeScript configuration enforces the strictest possible type checking:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "strictNullChecks": true,
    "useUnknownInCatchVariables": true,
    "allowUnreachableCode": false,
    "forceConsistentCasingInFileNames": true
  }
}
```

## 🏥 Clinical Type System

### Assessment Types with Discriminated Unions

```typescript
// Exact answer validation - only valid clinical responses
export type PHQ9Answer = 0 | 1 | 2 | 3;
export type GAD7Answer = 0 | 1 | 2 | 3;

// Exact answer arrays - prevent incorrect question counts
export type PHQ9Answers = readonly [
  PHQ9Answer, PHQ9Answer, PHQ9Answer,  // Questions 1-3
  PHQ9Answer, PHQ9Answer, PHQ9Answer,  // Questions 4-6
  PHQ9Answer, PHQ9Answer, PHQ9Answer   // Questions 7-9 (9 is suicidal ideation)
];

// Score types - prevent invalid calculations
export type PHQ9Score = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27;

// Crisis thresholds - literal types prevent accidental changes
export const CRISIS_THRESHOLD_PHQ9 = 20 as const;
export const CRISIS_THRESHOLD_GAD7 = 15 as const;
```

### Type-Safe Assessment Interface

```typescript
export type Assessment = 
  | {
      readonly type: 'phq9';
      readonly answers: PHQ9Answers;
      readonly score: PHQ9Score;
      readonly severity: PHQ9Severity;
      readonly id: AssessmentID;
      readonly completedAt: ISODateString;
      readonly context: AssessmentContext;
      readonly requiresCrisisIntervention: boolean;
    }
  | {
      readonly type: 'gad7';
      readonly answers: GAD7Answers;
      readonly score: GAD7Score;
      readonly severity: GAD7Severity;
      readonly id: AssessmentID;
      readonly completedAt: ISODateString;
      readonly context: AssessmentContext;
      readonly requiresCrisisIntervention: boolean;
    };
```

## 🔐 Security Types

### Branded Types for Data Protection

```typescript
// Prevent mixing encrypted and plaintext data
type Brand<K, T> = K & { __brand: T };

export type EncryptedData<T> = Brand<string, 'EncryptedData'> & {
  readonly __dataType: T;
};

export type PlaintextData<T> = Brand<T, 'PlaintextData'>;

// Data sensitivity classification
export enum DataSensitivity {
  CLINICAL = 'clinical',     // PHQ-9/GAD-7 answers, suicidal ideation
  PERSONAL = 'personal',     // Check-in emotional data, crisis plans  
  THERAPEUTIC = 'therapeutic', // User values, preferences, patterns
  SYSTEM = 'system'          // App settings, notification preferences
}
```

## 🛡️ Runtime Validation with Zod

### Schema-Based Validation

We use Zod schemas for runtime validation to complement compile-time checking:

```typescript
// PHQ-9 answer validation
export const PHQ9AnswersSchema = z.tuple([
  z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  // ... exact 9 answers
]);

// Assessment validation with business rules
export const PHQ9AssessmentSchema = z.object({
  type: z.literal('phq9'),
  answers: PHQ9AnswersSchema,
  score: PHQ9ScoreSchema,
  severity: PHQ9SeveritySchema,
  // ...
}).refine((assessment) => {
  // Validate that score matches answers
  const calculatedScore = assessment.answers.reduce((sum, answer) => sum + answer, 0);
  return assessment.score === calculatedScore;
}, {
  message: 'PHQ-9 score must equal sum of answers',
  path: ['score'],
});
```

## 🚨 Crisis Detection Types

### Type-Safe Crisis Logic

```typescript
// Crisis detection with type guards
export const requiresCrisisIntervention = (assessment: Assessment): boolean => {
  if (assessment.type === 'phq9') {
    // TypeScript knows this is PHQ-9 specific
    const hasHighScore = assessment.score >= CRISIS_THRESHOLD_PHQ9;
    const hasSuicidalThoughts = assessment.answers[SUICIDAL_IDEATION_QUESTION_INDEX] >= SUICIDAL_IDEATION_THRESHOLD;
    return hasHighScore || hasSuicidalThoughts;
  }
  
  if (assessment.type === 'gad7') {
    // TypeScript knows this is GAD-7 specific
    return assessment.score >= CRISIS_THRESHOLD_GAD7;
  }
  
  return false;
};

// Emergency response types
export type EmergencyPhoneNumber = '988' | '741741'; // Only verified crisis lines
export type CrisisResponseTime = Brand<number, 'CrisisResponseTime'>; // Must be < 200ms
```

## ⚡ Performance-Critical Types

### Therapeutic Timing Safety

```typescript
// Exact timing for therapeutic effectiveness
export type BreathDuration = 60000; // Exactly 60 seconds in milliseconds
export type AnimationFrame = 16.67; // 60fps frame timing
export type TherapeuticTiming = Brand<number, 'TherapeuticTiming'>;

// Performance constraints for crisis response
export const NAVIGATION_CONSTANTS = {
  PERFORMANCE: {
    CRISIS_ROUTE_MAX_TIME_MS: 200,    // Crisis navigation must be < 200ms
    STANDARD_ROUTE_MAX_TIME_MS: 500,  // Standard navigation
    EMERGENCY_TIMEOUT_MS: 3000,       // Emergency fallback timeout
  },
} as const;
```

## 🧪 Validation and Testing

### Type Validation Scripts

Run these scripts to ensure clinical accuracy:

```bash
# Complete TypeScript validation
npm run validate:types

# Clinical accuracy validation (includes runtime testing)
npm run validate:clinical-complete

# Strict type checking
npm run typecheck:strict

# Clinical code linting
npm run lint:clinical
```

### Validation Script Features

The `validate-types.ts` script performs:

- **Clinical Type Safety** - Tests PHQ-9/GAD-7 answer validation
- **Crisis Detection Logic** - Validates crisis intervention triggers
- **Type Guards** - Tests discriminated union type safety
- **ID Generation** - Validates format constraints
- **Constants Validation** - Ensures clinical thresholds are correct

## 📝 Development Guidelines

### Type-Safe Coding Practices

1. **Use Branded Types** for sensitive data:
   ```typescript
   // Good
   const encryptData = (data: PlaintextData<Assessment>) => { /* ... */ };
   
   // Bad
   const encryptData = (data: any) => { /* ... */ };
   ```

2. **Leverage Discriminated Unions** for assessment types:
   ```typescript
   // Good
   if (assessment.type === 'phq9') {
     // TypeScript knows this is PHQ-9
     const suicidalIdeation = assessment.answers[8]; // Index 8 = Question 9
   }
   
   // Bad
   const suicidalIdeation = (assessment as any).answers[8];
   ```

3. **Use Type Guards** for runtime safety:
   ```typescript
   // Good
   if (isPHQ9Assessment(assessment)) {
     // Safe to access PHQ-9 specific properties
   }
   
   // Bad
   if (assessment.type === 'phq9') {
     // No runtime guarantee
   }
   ```

4. **Prefer `readonly` for clinical data**:
   ```typescript
   // Good
   interface Assessment {
     readonly answers: readonly PHQ9Answers;
     readonly score: PHQ9Score;
   }
   
   // Bad
   interface Assessment {
     answers: number[];
     score: number;
   }
   ```

### ESLint Clinical Rules

Our enhanced ESLint configuration includes special rules for clinical code:

- `@typescript-eslint/no-explicit-any: 'error'` - No `any` types allowed
- `@typescript-eslint/explicit-function-return-type: 'error'` - All functions must specify return types
- `@typescript-eslint/switch-exhaustiveness-check: 'error'` - All switch cases must be handled
- `@typescript-eslint/no-magic-numbers: 'error'` - No magic numbers (except clinical thresholds)

## 🚑 Emergency Procedures

### Type Error Response Protocol

If type errors are discovered in production:

1. **Immediate Assessment** - Determine if error affects clinical accuracy or user safety
2. **Emergency Response** - For safety-critical errors, implement emergency hotfix
3. **Validation** - Run complete type validation suite after fix
4. **Clinical Review** - Have clinical domain expert review any assessment-related changes

### Crisis-Related Type Failures

For type errors affecting crisis detection:

1. **Immediate Hotline Availability** - Ensure 988 crisis line is always accessible
2. **Fallback Protocols** - Implement safe defaults for failed crisis detection
3. **Manual Override** - Provide manual crisis button access regardless of assessment scores
4. **Audit Trail** - Log all crisis detection events for clinical review

## 📊 Monitoring and Metrics

### Type Safety Metrics

Track these metrics for clinical safety:

- **Type Error Rate** - Target: 0 errors in clinical code paths
- **Crisis Detection Accuracy** - Target: 100% for known positive cases
- **Assessment Calculation Accuracy** - Target: 100% match with manual calculations
- **Runtime Validation Pass Rate** - Target: >99.9% for valid clinical data

### Monitoring Dashboard

```typescript
interface TypeSafetyMetrics {
  typeErrorCount: number;
  clinicalAccuracyRate: number;
  crisisDetectionAccuracy: number;
  assessmentCalculationErrors: number;
  runtimeValidationFailures: number;
  lastValidationRun: Date;
}
```

## 🔄 Migration and Updates

### Safe Type System Updates

When updating type definitions:

1. **Clinical Approval Required** for assessment-related types
2. **Backward Compatibility** for existing data
3. **Gradual Migration** with runtime validation
4. **Comprehensive Testing** including edge cases
5. **Clinical Validation** before production deployment

### Version Control for Types

```typescript
// Version clinical types for safe migrations
interface ClinicalTypes_v1 {
  version: '1.0.0';
  phq9Score: PHQ9Score_v1;
  gad7Score: GAD7Score_v1;
}

interface ClinicalTypes_v2 {
  version: '2.0.0';
  phq9Score: PHQ9Score_v2;
  gad7Score: GAD7Score_v2;
  migrationFrom: ClinicalTypes_v1;
}
```

## 🎯 Success Criteria

### Implementation Complete When:

- [x] **TypeScript Configuration** - Strictest possible settings enabled
- [x] **Clinical Types** - Complete type safety for PHQ-9/GAD-7
- [x] **Security Types** - Encrypted vs plaintext data cannot be mixed
- [x] **Runtime Validation** - Zod schemas validate all clinical data
- [x] **Crisis Detection** - Type-safe crisis intervention logic
- [x] **Navigation Safety** - Type-safe crisis route navigation
- [x] **Validation Scripts** - Comprehensive type testing
- [x] **ESLint Rules** - Clinical-specific linting configuration
- [x] **Documentation** - Complete safety guidelines

### Ongoing Maintenance:

- **Daily**: Run `npm run typecheck:strict` before commits
- **Weekly**: Run `npm run validate:clinical-complete` 
- **Monthly**: Review type safety metrics and update documentation
- **Quarterly**: Clinical review of all assessment-related type definitions

---

## ⚠️ Critical Reminders

1. **Type errors in mental health applications can be life-threatening**
2. **Always validate clinical calculations at both compile-time and runtime**
3. **Crisis detection logic must be 100% type-safe**
4. **Emergency contact systems cannot fail due to type errors**
5. **Data encryption types prevent accidental plaintext storage**

**Remember: User safety depends on type safety. When in doubt, choose the stricter type definition.**