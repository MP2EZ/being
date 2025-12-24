# Being API Design and Architecture Documentation

## Overview

This document details the current local-only API architecture and design patterns for Being's Stoic Mindfulness platform. The system is architected for seamless transition from local-only operation to connected backend integration while maintaining clinical-grade data integrity and therapeutic effectiveness.

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Service Layer Architecture](#service-layer-architecture)
3. [API Design Patterns](#api-design-patterns)
4. [Data Models and Types](#data-models-and-types)
5. [Error Handling Patterns](#error-handling-patterns)
6. [Type-Safe Interfaces](#type-safe-interfaces)
7. [Testing and Mocking Strategies](#testing-and-mocking-strategies)
8. [Clinical Data Integrity](#clinical-data-integrity)
9. [Performance Optimization](#performance-optimization)
10. [Security Patterns](#security-patterns)

## Current Architecture

### Local-First Design Philosophy

Being operates on a **local-first** architecture that prioritizes user data sovereignty, offline functionality, and clinical data integrity. The system is designed to function completely offline while being prepared for future backend integration.

```typescript
// Current architecture overview
App Layer (React Native)
├── State Management (Zustand Stores)
├── Service Layer (Business Logic)
├── Storage Layer (Encrypted AsyncStorage)
└── Type Layer (TypeScript Definitions)
```

### Core Architectural Principles

1. **Local-First Data Ownership**: All user data is stored locally by default
2. **Clinical-Grade Integrity**: 100% accuracy requirements for assessment scoring
3. **Offline-First UX**: Full functionality without network connectivity
4. **Progressive Enhancement**: Prepared for future backend sync capabilities
5. **Zero Data Loss**: Robust session management and data persistence
6. **HIPAA-Ready**: Encryption and privacy by design

## Service Layer Architecture

### Data Access Layer

The service layer provides a consistent API interface that abstracts storage implementation details:

```typescript
// Primary Data Store Interface
export interface DataStoreInterface {
  // User Management
  saveUser(user: UserProfile): Promise<void>;
  getUser(): Promise<UserProfile | null>;
  
  // Check-in Operations
  saveCheckIn(checkIn: CheckIn): Promise<void>;
  getCheckIns(): Promise<CheckIn[]>;
  getTodayCheckIns(): Promise<CheckIn[]>;
  getCheckInsByType(type: CheckInType, days?: number): Promise<CheckIn[]>;
  
  // Assessment Operations (Clinical Data)
  saveAssessment(assessment: Assessment): Promise<void>;
  getAssessments(): Promise<Assessment[]>;
  getAssessmentsByType(type: 'phq9' | 'gad7'): Promise<Assessment[]>;
  getLatestAssessment(type: 'phq9' | 'gad7'): Promise<Assessment | null>;
  
  // Crisis Management
  saveCrisisPlan(plan: CrisisPlan): Promise<void>;
  getCrisisPlan(): Promise<CrisisPlan | null>;
  
  // Session Management
  savePartialCheckIn(checkIn: Partial<CheckIn>): Promise<void>;
  getPartialCheckIn(type: CheckInType): Promise<Partial<CheckIn> | null>;
  clearPartialCheckIn(type: CheckInType): Promise<void>;
}
```

### Current Implementation Stack

```typescript
// Implementation hierarchy (bottom to top)
AsyncStorage (React Native)
    ↓
EncryptedDataStore (AES-256 encryption)
    ↓ 
SecureDataStore (HIPAA-compliant wrapper)
    ↓
Store Services (Business logic layer)
    ↓
Zustand Stores (State management)
    ↓
React Components (UI layer)
```

### Service Layer Components

#### 1. SecureDataStore

Primary data access service with transparent encryption:

```typescript
class SecureDataStore implements DataStoreInterface {
  private async ensureInitialized(): Promise<void>;
  
  // Clinical data with validation
  async saveAssessment(assessment: Assessment): Promise<void> {
    // Validate scoring accuracy (critical for clinical compliance)
    const expectedScore = assessment.answers.reduce((sum, answer) => sum + answer, 0);
    if (assessment.score !== expectedScore) {
      throw new Error(`Assessment scoring error: expected ${expectedScore}, got ${assessment.score}`);
    }
    
    return encryptedDataStore.saveAssessment(assessment);
  }
  
  // Crisis plan with safety defaults
  async saveCrisisPlan(crisisPlan: CrisisPlan): Promise<void> {
    if (!crisisPlan.contacts.crisisLine) {
      crisisPlan.contacts.crisisLine = '988'; // Default crisis line
    }
    
    return encryptedDataStore.saveCrisisPlan(crisisPlan);
  }
}
```

#### 2. EnhancedOfflineQueueService

Manages offline operations with clinical safety:

```typescript
class EnhancedOfflineQueueService {
  async queueAction(
    action: OfflineActionType,
    data: OfflineActionData,
    options: {
      priority?: OfflinePriority;
      clinicalValidation?: boolean;
      conflictResolution?: ConflictResolutionStrategy;
    }
  ): Promise<OfflineOperationResult>;
  
  async processQueue(): Promise<void>;
  async performClinicalValidation(data: OfflineActionData): Promise<ClinicalValidation>;
}
```

#### 3. ResumableSessionService

Handles session continuity for therapeutic flows:

```typescript
class ResumableSessionService {
  async saveSession(session: ResumableSession): Promise<void>;
  async getSession(type: string, subType?: string): Promise<ResumableSession | null>;
  async canResumeSession(session: ResumableSession): boolean;
  async extendSession(sessionId: string, additionalHours: number): Promise<void>;
}
```

## API Design Patterns

### 1. Consistent Error Handling

All service methods follow a consistent error handling pattern:

```typescript
async serviceMethod(params: ServiceParams): Promise<ServiceResult> {
  try {
    await this.ensureInitialized();
    
    // Validate inputs
    if (!this.validateInput(params)) {
      throw new ValidationError('Invalid input parameters');
    }
    
    // Perform operation
    const result = await this.performOperation(params);
    
    // Validate results (especially for clinical data)
    if (this.isClinicalData(result)) {
      await this.validateClinicalIntegrity(result);
    }
    
    return result;
  } catch (error) {
    this.logError(error, 'serviceMethod', params);
    
    if (error instanceof ValidationError) {
      throw error; // Re-throw validation errors
    }
    
    throw new ServiceError(
      'Operation failed',
      error instanceof Error ? error.message : 'Unknown error',
      this.getErrorContext(params)
    );
  }
}
```

### 2. Progressive Data Loading

Services implement progressive loading for large datasets:

```typescript
// Optimized data loading patterns
async getRecentCheckIns(days: number = 7): Promise<CheckIn[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  // Load only recent data to optimize performance
  return this.loadCheckInsAfterDate(cutoffDate);
}

async getCheckInsByType(
  type: CheckInType, 
  days: number = 30
): Promise<CheckIn[]> {
  // Implement efficient filtering at storage level
  return this.loadFilteredCheckIns({ type, days });
}
```

### 3. Atomic Operations

Critical operations use atomic patterns to prevent data corruption:

```typescript
async saveCurrentCheckIn(): Promise<void> {
  // Start transaction-like operation
  const transactionId = this.generateTransactionId();
  
  try {
    // Validate before save
    this.validateCheckInData(this.currentCheckIn);
    
    // Save to local storage atomically
    await this.atomicSave(this.currentCheckIn, transactionId);
    
    // Queue for future sync
    await this.queueForSync(this.currentCheckIn);
    
    // Clear session state only after successful save
    await this.clearSession();
    
    // Commit transaction
    await this.commitTransaction(transactionId);
    
  } catch (error) {
    // Rollback on any failure
    await this.rollbackTransaction(transactionId);
    throw error;
  }
}
```

## Data Models and Types

### Core Data Entities

#### CheckIn Data Model

```typescript
interface CheckIn {
  readonly id: string;
  readonly type: 'morning' | 'midday' | 'evening';
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly skipped: boolean;
  readonly data: CheckInData;
  readonly metadata?: {
    readonly deviceTimezone: string;
    readonly appVersion: string;
    readonly dataVersion: number;
  };
}

interface CheckInData {
  // Morning check-in fields
  readonly bodyAreas?: readonly string[];
  readonly emotions?: readonly string[];
  readonly thoughts?: readonly string[];
  readonly sleepQuality?: number; // 1-5 scale
  readonly energyLevel?: number; // 1-5 scale
  readonly anxietyLevel?: number; // 1-5 scale
  readonly todayValue?: string;
  readonly intention?: string;
  
  // Midday check-in fields
  readonly currentEmotions?: readonly string[];
  readonly breathingCompleted?: boolean;
  readonly pleasantEvent?: string;
  readonly unpleasantEvent?: string;
  readonly currentNeed?: string;
  
  // Evening check-in fields
  readonly dayHighlight?: string;
  readonly dayChallenge?: string;
  readonly dayEmotions?: readonly string[];
  readonly gratitude1?: string;
  readonly gratitude2?: string;
  readonly gratitude3?: string;
  readonly dayLearning?: string;
  readonly tensionAreas?: readonly string[];
  readonly releaseNote?: string;
  readonly sleepIntentions?: readonly string[];
  readonly tomorrowFocus?: string;
  readonly lettingGo?: string;
}
```

#### Assessment Data Model (Clinical Data)

```typescript
interface Assessment {
  readonly id: string;
  readonly type: 'phq9' | 'gad7';
  readonly timestamp: string;
  readonly answers: readonly number[]; // Raw responses (0-3 for each question)
  readonly score: number; // Calculated total score
  readonly severity: AssessmentSeverity;
  readonly crisisDetected: boolean;
  readonly metadata: {
    readonly completionTime: number; // milliseconds
    readonly deviceTimezone: string;
    readonly version: string; // Assessment version for clinical accuracy
    readonly validated: boolean; // Clinical validation flag
  };
}

enum AssessmentSeverity {
  MINIMAL = 'minimal',
  MILD = 'mild', 
  MODERATE = 'moderate',
  MODERATELY_SEVERE = 'moderately_severe',
  SEVERE = 'severe'
}
```

#### CrisisPlan Data Model

```typescript
interface CrisisPlan {
  readonly id: string;
  readonly createdAt: string;
  readonly lastUpdated: string;
  readonly contacts: {
    readonly crisisLine: string; // Default: '988'
    readonly emergencyContact?: {
      readonly name: string;
      readonly phone: string;
      readonly relationship: string;
    };
    readonly therapist?: {
      readonly name: string;
      readonly phone: string;
      readonly availability: string;
    };
  };
  readonly copingStrategies: readonly string[];
  readonly warningSignes: readonly string[];
  readonly safeEnvironment: readonly string[];
  readonly reasons: readonly string[]; // Reasons for living
}
```

### Type-Safe API Responses

```typescript
// Standardized API response wrapper
interface APIResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: APIError;
  readonly metadata: {
    readonly timestamp: string;
    readonly requestId: string;
    readonly executionTime: number;
    readonly offline: boolean;
    readonly cached?: boolean;
  };
}

interface APIError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly clinical: boolean; // Indicates clinical data impact
  readonly retryable: boolean;
}
```

## Error Handling Patterns

### Clinical Error Classification

```typescript
enum ClinicalErrorSeverity {
  LOW = 'low',           // Minor data inconsistencies
  MEDIUM = 'medium',     // Non-critical validation errors
  HIGH = 'high',         // Assessment scoring errors
  CRITICAL = 'critical'  // Crisis detection failures
}

class ClinicalError extends Error {
  constructor(
    message: string,
    public readonly severity: ClinicalErrorSeverity,
    public readonly entityType: string,
    public readonly entityId?: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ClinicalError';
  }
}
```

### Error Recovery Patterns

```typescript
// Graceful degradation for non-critical errors
async loadUserData(): Promise<UserProfile | null> {
  try {
    return await this.secureDataStore.getUser();
  } catch (error) {
    if (error instanceof ClinicalError && error.severity === ClinicalErrorSeverity.CRITICAL) {
      throw error; // Don't degrade critical clinical errors
    }
    
    // Log error and return safe default
    this.errorReporter.report(error, 'loadUserData');
    return this.createDefaultUserProfile();
  }
}

// Retry logic for clinical operations
async saveAssessmentWithRetry(assessment: Assessment): Promise<void> {
  const maxRetries = 3;
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await this.secureDataStore.saveAssessment(assessment);
      return; // Success
    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof ClinicalError) {
        throw error; // Don't retry clinical validation errors
      }
      
      if (attempt < maxRetries) {
        await this.delay(attempt * 1000); // Exponential backoff
      }
    }
  }
  
  throw new ClinicalError(
    'Failed to save assessment after retries',
    ClinicalErrorSeverity.HIGH,
    'assessment',
    assessment.id,
    { originalError: lastError.message, attempts: maxRetries }
  );
}
```

## Type-Safe Interfaces

### Service Interface Contracts

```typescript
// Store interface with clinical validation
interface ClinicalDataStore {
  // Assessment operations with strict typing
  saveAssessment(assessment: Assessment): Promise<void>;
  getLatestAssessment<T extends 'phq9' | 'gad7'>(
    type: T
  ): Promise<T extends 'phq9' ? PHQ9Assessment : GAD7Assessment | null>;
  
  // Crisis operations with safety validation
  saveCrisisPlan(plan: CrisisPlan): Promise<CrisisValidationResult>;
  getCrisisPlan(): Promise<CrisisPlan | null>;
  
  // Check-in operations with therapeutic validation
  saveCheckIn(checkIn: CheckIn): Promise<TherapeuticValidationResult>;
  getCheckInsByType<T extends CheckInType>(
    type: T,
    days?: number
  ): Promise<TypedCheckIn<T>[]>;
}

// Specialized assessment types
interface PHQ9Assessment extends Assessment {
  readonly type: 'phq9';
  readonly answers: readonly [number, number, number, number, number, number, number, number, number]; // Exactly 9 answers
  readonly score: number; // 0-27 range
}

interface GAD7Assessment extends Assessment {
  readonly type: 'gad7';
  readonly answers: readonly [number, number, number, number, number, number, number]; // Exactly 7 answers
  readonly score: number; // 0-21 range
}
```

### Type-Safe Validation Schemas

```typescript
// Runtime validation with TypeScript integration
import { z } from 'zod';

const CheckInDataSchema = z.object({
  // Morning fields
  bodyAreas: z.array(z.string()).optional(),
  emotions: z.array(z.string()).optional(),
  sleepQuality: z.number().min(1).max(5).optional(),
  energyLevel: z.number().min(1).max(5).optional(),
  anxietyLevel: z.number().min(1).max(5).optional(),
  
  // Midday fields
  currentEmotions: z.array(z.string()).optional(),
  breathingCompleted: z.boolean().optional(),
  
  // Evening fields
  dayEmotions: z.array(z.string()).optional(),
  gratitude1: z.string().optional(),
  gratitude2: z.string().optional(),
  gratitude3: z.string().optional(),
}).strict();

const AssessmentSchema = z.object({
  id: z.string(),
  type: z.enum(['phq9', 'gad7']),
  timestamp: z.string().datetime(),
  answers: z.array(z.number().min(0).max(3)),
  score: z.number().min(0),
  severity: z.enum(['minimal', 'mild', 'moderate', 'moderately_severe', 'severe']),
  crisisDetected: z.boolean(),
}).refine(
  (data) => {
    // Validate answer count matches assessment type
    const expectedAnswers = data.type === 'phq9' ? 9 : 7;
    return data.answers.length === expectedAnswers;
  },
  { message: 'Answer count must match assessment type' }
).refine(
  (data) => {
    // Validate calculated score
    const calculatedScore = data.answers.reduce((sum, answer) => sum + answer, 0);
    return data.score === calculatedScore;
  },
  { message: 'Score must equal sum of answers' }
);

// Type inference from schema
type ValidatedCheckInData = z.infer<typeof CheckInDataSchema>;
type ValidatedAssessment = z.infer<typeof AssessmentSchema>;
```

## Testing and Mocking Strategies

### Service Layer Testing

```typescript
// Mock implementations for testing
class MockSecureDataStore implements DataStoreInterface {
  private mockData: {
    users: UserProfile[];
    checkIns: CheckIn[];
    assessments: Assessment[];
    crisisPlans: CrisisPlan[];
  } = {
    users: [],
    checkIns: [],
    assessments: [],
    crisisPlans: []
  };
  
  async saveCheckIn(checkIn: CheckIn): Promise<void> {
    // Simulate async storage delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Validate data integrity
    this.validateCheckInData(checkIn);
    
    // Store in mock data
    this.mockData.checkIns.push(checkIn);
  }
  
  async getCheckIns(): Promise<CheckIn[]> {
    await new Promise(resolve => setTimeout(resolve, 5));
    return [...this.mockData.checkIns];
  }
  
  private validateCheckInData(checkIn: CheckIn): void {
    if (!checkIn.id || !checkIn.type || !checkIn.startedAt) {
      throw new ValidationError('Invalid check-in data structure');
    }
  }
}
```

### Clinical Data Testing

```typescript
// Assessment scoring accuracy tests
describe('Assessment Scoring Validation', () => {
  test('PHQ-9 scoring accuracy', () => {
    const answers = [2, 1, 3, 0, 2, 1, 2, 1, 0]; // Example responses
    const expectedScore = 12;
    
    const assessment = createPHQ9Assessment(answers);
    
    expect(assessment.score).toBe(expectedScore);
    expect(assessment.answers.reduce((sum, answer) => sum + answer, 0)).toBe(expectedScore);
  });
  
  test('Crisis detection thresholds', () => {
    const severeAnswers = [3, 3, 3, 3, 3, 3, 3, 2, 1]; // PHQ-9 score: 26
    const assessment = createPHQ9Assessment(severeAnswers);
    
    expect(assessment.score).toBe(26);
    expect(assessment.severity).toBe(AssessmentSeverity.SEVERE);
    expect(assessment.crisisDetected).toBe(true);
  });
});
```

### Integration Testing Patterns

```typescript
// End-to-end service integration tests
describe('Check-in Flow Integration', () => {
  let checkInStore: ReturnType<typeof useCheckInStore>;
  let mockDataStore: MockSecureDataStore;
  
  beforeEach(() => {
    mockDataStore = new MockSecureDataStore();
    checkInStore = createCheckInStore(mockDataStore);
  });
  
  test('Complete morning check-in flow', async () => {
    // Start check-in
    await checkInStore.startCheckIn('morning');
    expect(checkInStore.currentCheckIn).toBeTruthy();
    expect(checkInStore.currentCheckIn?.type).toBe('morning');
    
    // Update with partial data
    await checkInStore.updateCurrentCheckIn({
      emotions: ['calm', 'hopeful'],
      sleepQuality: 4,
      energyLevel: 3
    });
    
    // Verify partial data
    expect(checkInStore.currentCheckIn?.data.emotions).toContain('calm');
    expect(checkInStore.currentCheckIn?.data.sleepQuality).toBe(4);
    
    // Complete check-in
    await checkInStore.updateCurrentCheckIn({
      anxietyLevel: 2,
      intention: 'Practice mindfulness today'
    });
    
    await checkInStore.saveCurrentCheckIn();
    
    // Verify completion
    expect(checkInStore.currentCheckIn).toBeNull();
    
    const todaysCheckIns = await mockDataStore.getTodayCheckIns();
    expect(todaysCheckIns).toHaveLength(1);
    expect(todaysCheckIns[0].type).toBe('morning');
    expect(todaysCheckIns[0].completed).toBe(true);
  });
});
```

## Clinical Data Integrity

### Validation Pipeline

```typescript
class ClinicalDataValidator {
  static validateAssessment(assessment: Assessment): ClinicalValidationResult {
    const result: ClinicalValidationResult = {
      isValid: true,
      assessmentScoresValid: true,
      crisisThresholdsValid: true,
      therapeuticContinuityPreserved: true,
      dataIntegrityIssues: [],
      recommendations: [],
      validatedAt: new Date().toISOString()
    };
    
    // Validate scoring accuracy
    const calculatedScore = assessment.answers.reduce((sum, answer) => sum + answer, 0);
    if (assessment.score !== calculatedScore) {
      result.isValid = false;
      result.assessmentScoresValid = false;
      result.dataIntegrityIssues.push(
        `Score mismatch: declared ${assessment.score}, calculated ${calculatedScore}`
      );
    }
    
    // Validate crisis thresholds
    const crisisThreshold = assessment.type === 'phq9' ? 20 : 15;
    const shouldDetectCrisis = assessment.score >= crisisThreshold;
    if (assessment.crisisDetected !== shouldDetectCrisis) {
      result.isValid = false;
      result.crisisThresholdsValid = false;
      result.dataIntegrityIssues.push(
        `Crisis detection mismatch: score ${assessment.score}, detected ${assessment.crisisDetected}`
      );
    }
    
    return result;
  }
  
  static validateCheckInContinuity(
    checkIn: CheckIn,
    previousCheckIns: CheckIn[]
  ): TherapeuticValidationResult {
    // Validate therapeutic continuity (daily check-in patterns)
    const today = new Date().toISOString().split('T')[0];
    const todaysCheckIns = previousCheckIns.filter(c => 
      c.completedAt?.startsWith(today) && c.type === checkIn.type
    );
    
    if (todaysCheckIns.length > 0) {
      return {
        isValid: false,
        message: `${checkIn.type} check-in already completed today`,
        preservesTherapeuticFlow: false
      };
    }
    
    return {
      isValid: true,
      message: 'Check-in timing appropriate',
      preservesTherapeuticFlow: true
    };
  }
}
```

### Data Consistency Checks

```typescript
class DataConsistencyService {
  async performIntegrityCheck(): Promise<DataIntegrityResult> {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Check assessment scoring consistency
      const assessments = await this.dataStore.getAssessments();
      for (const assessment of assessments) {
        const validation = ClinicalDataValidator.validateAssessment(assessment);
        if (!validation.isValid) {
          issues.push(`Assessment ${assessment.id}: ${validation.dataIntegrityIssues.join(', ')}`);
        }
      }
      
      // Check check-in data completeness
      const checkIns = await this.dataStore.getCheckIns();
      for (const checkIn of checkIns) {
        if (checkIn.completed && this.isIncompleteData(checkIn)) {
          warnings.push(`CheckIn ${checkIn.id}: marked complete but missing data`);
        }
      }
      
      // Check crisis plan validity
      const crisisPlan = await this.dataStore.getCrisisPlan();
      if (crisisPlan && !crisisPlan.contacts.crisisLine) {
        issues.push('Crisis plan missing emergency contact number');
      }
      
      return {
        isValid: issues.length === 0,
        criticalIssues: issues,
        warnings: warnings,
        checkedAt: new Date().toISOString(),
        dataHealth: this.calculateDataHealth(issues, warnings)
      };
      
    } catch (error) {
      return {
        isValid: false,
        criticalIssues: [`Integrity check failed: ${error}`],
        warnings: [],
        checkedAt: new Date().toISOString(),
        dataHealth: 0
      };
    }
  }
  
  private calculateDataHealth(issues: string[], warnings: string[]): number {
    const totalProblems = issues.length + warnings.length * 0.5;
    return Math.max(0, 1 - (totalProblems / 10)); // 0-1 scale
  }
}
```

## Performance Optimization

### Lazy Loading Patterns

```typescript
class OptimizedDataService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  async getRecentCheckIns(days: number = 7): Promise<CheckIn[]> {
    const cacheKey = `recent_checkins_${days}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.data;
    }
    
    // Load and cache
    const checkIns = await this.dataStore.getRecentCheckIns(days);
    this.cache.set(cacheKey, { data: checkIns, timestamp: Date.now() });
    
    return checkIns;
  }
  
  async getPaginatedCheckIns(
    page: number = 0, 
    pageSize: number = 20
  ): Promise<PaginatedResult<CheckIn>> {
    const offset = page * pageSize;
    
    // Implement pagination at storage level to avoid loading all data
    const { items, total } = await this.dataStore.getPaginatedCheckIns(offset, pageSize);
    
    return {
      items,
      total,
      page,
      pageSize,
      hasMore: offset + pageSize < total
    };
  }
}
```

### Batch Operations

```typescript
class BatchDataService {
  async batchSaveCheckIns(checkIns: CheckIn[]): Promise<BatchResult> {
    const results: { success: CheckIn[]; failed: { checkIn: CheckIn; error: string }[] } = {
      success: [],
      failed: []
    };
    
    // Process in smaller batches to avoid memory issues
    const batchSize = 10;
    for (let i = 0; i < checkIns.length; i += batchSize) {
      const batch = checkIns.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (checkIn) => {
          try {
            await this.dataStore.saveCheckIn(checkIn);
            results.success.push(checkIn);
          } catch (error) {
            results.failed.push({
              checkIn,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        })
      );
      
      // Small delay between batches
      if (i + batchSize < checkIns.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return results;
  }
}
```

## Security Patterns

### Data Encryption Integration

```typescript
class SecureAPIService {
  private encryptionService: EncryptionService;
  
  async saveSecureData<T>(key: string, data: T): Promise<void> {
    try {
      // Validate data before encryption
      this.validateData(data);
      
      // Encrypt sensitive data
      const encryptedData = await this.encryptionService.encrypt(JSON.stringify(data));
      
      // Store with integrity check
      await AsyncStorage.setItem(key, JSON.stringify({
        data: encryptedData,
        checksum: await this.calculateChecksum(data),
        timestamp: new Date().toISOString()
      }));
      
    } catch (error) {
      throw new SecurityError('Failed to save secure data', error);
    }
  }
  
  async getSecureData<T>(key: string): Promise<T | null> {
    try {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return null;
      
      const { data: encryptedData, checksum, timestamp } = JSON.parse(stored);
      
      // Decrypt data
      const decryptedData = await this.encryptionService.decrypt(encryptedData);
      const parsedData = JSON.parse(decryptedData) as T;
      
      // Verify integrity
      const currentChecksum = await this.calculateChecksum(parsedData);
      if (currentChecksum !== checksum) {
        throw new SecurityError('Data integrity check failed');
      }
      
      return parsedData;
      
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new SecurityError('Failed to retrieve secure data', error);
    }
  }
}
```

### Access Control Patterns

```typescript
interface AccessControlService {
  canAccessClinicalData(context: AccessContext): boolean;
  canModifyAssessment(assessmentId: string, context: AccessContext): boolean;
  canViewCrisisPlan(context: AccessContext): boolean;
}

class AccessContext {
  constructor(
    public readonly userId: string,
    public readonly deviceId: string,
    public readonly timestamp: string,
    public readonly permissions: readonly Permission[]
  ) {}
}

enum Permission {
  VIEW_ASSESSMENTS = 'view_assessments',
  MODIFY_ASSESSMENTS = 'modify_assessments',
  VIEW_CRISIS_PLAN = 'view_crisis_plan',
  MODIFY_CRISIS_PLAN = 'modify_crisis_plan',
  EXPORT_DATA = 'export_data'
}
```

---

## Future Backend Integration Preparation

The current API design includes several features that prepare for seamless backend integration:

1. **Sync-Ready Data Models**: All entities include metadata for versioning and conflict resolution
2. **Offline Queue System**: Operations are queued for future sync when backend becomes available
3. **Conflict Resolution Framework**: Built-in patterns for handling data conflicts during sync
4. **Clinical Validation**: Server-compatible validation that can be mirrored on backend
5. **Type-Safe Interfaces**: API contracts that can be extended for REST/GraphQL endpoints

This architecture ensures that when backend integration is implemented, the transition will be seamless and preserve all clinical data integrity requirements while maintaining the excellent offline-first user experience.