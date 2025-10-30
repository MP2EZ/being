# Integration Points Documentation
*Design Sprint Day 8 | FEAT-45 Stoic Mindfulness Pivot*

## Overview

**Purpose**: Define how Stoic Mindfulness data structures and flows integrate with Being's existing systems (crisis detection, analytics, state management, performance monitoring, and storage).

**Audience**: Phase 2 implementation team

**Status**: Draft - Ready for Review

**Key Principle**: Stoic Mindfulness changes the *content layer* (philosophical prompts, data structures) but **preserves all safety-critical infrastructure** (crisis detection, encryption, performance guarantees).

---

## Table of Contents

1. [Crisis Detection Integration](#1-crisis-detection-integration)
2. [Analytics Integration](#2-analytics-integration)
3. [State Management Integration](#3-state-management-integration)
4. [Performance Requirements](#4-performance-requirements)
5. [Assessment System Integration](#5-assessment-system-integration)
6. [Navigation Integration](#6-navigation-integration)
7. [Storage & Persistence Integration](#7-storage--persistence-integration)
8. [Agent Domain Integration](#8-agent-domain-integration)
9. [Testing & Validation Integration](#9-testing--validation-integration)
10. [Migration Considerations](#10-migration-considerations)

---

## 1. Crisis Detection Integration

**Status**: ⚠️ **CRITICAL - ZERO CHANGES ALLOWED** ⚠️

### 1.1 Existing Crisis System (Preserve 100%)

**Components That Must NOT Change**:
- `CrisisDetectionService.ts` - Detection algorithms
- `ClinicalScoringService.ts` - PHQ-9/GAD-7 scoring
- `CrisisAnalyticsService.ts` - Crisis event tracking
- `CrisisResourcesScreen.tsx` - Emergency resources UI
- `CrisisPlanStore.ts` - Safety planning state

**Thresholds (Unchanged)**:
```typescript
// EXACT VALUES - DO NOT MODIFY
const CRISIS_THRESHOLDS = {
  PHQ9_SUPPORT: 15,        // Recommend support
  PHQ9_INTERVENTION: 20,   // Require intervention
  GAD7_CRISIS: 15,         // Crisis threshold
  SUICIDAL_IDEATION: 1,    // Any Q9 response >0
};
```

**Performance Requirements (Unchanged)**:
- Crisis detection: <200ms from scoring to alert
- Emergency resource access: <3 seconds from any screen
- 988/741741/911 links: Must work offline

### 1.2 Stoic Mindfulness Integration Points

**Where Stoic Flows Touch Crisis System**:

#### A. Assessment Integration (No Change)
```typescript
// PHQ-9/GAD-7 assessments remain IDENTICAL
// Location: /src/flows/assessment/
// Integration: AssessmentStore → ClinicalScoringService → CrisisDetectionService

// Stoic change: Context/messaging only
// BEFORE (MBCT): "Track your mental health progress with validated assessments"
// AFTER (Stoic): "Monitor your wellness as you practice Stoic Mindfulness"

// Scoring & detection logic: UNCHANGED
```

#### B. Crisis Access From Check-in Flows
```typescript
// All three daily flows maintain crisis access
interface StoicFlowScreenHeader {
  // Crisis button always visible (top-right corner)
  showCrisisButton: true;  // REQUIRED - cannot be false

  // Quick access to:
  // 1. Crisis Resources Screen (988, 741741, 911)
  // 2. Personal Crisis Plan (if created)
  // 3. Emergency contacts
}

// Implementation location: /src/flows/shared/components/FlowHeader.tsx
// Change: None - preserve existing SafetyButton component
```

#### C. Premeditatio Malorum Safety Integration (NEW)
```typescript
// Morning flow "Preparation" screen (premeditatio malorum) needs safeguards
// Negative visualization could trigger distress in vulnerable users

interface PremeditationSafetyCheck {
  // Check user's recent assessment scores
  recentPHQ9Score: number | null;
  recentGAD7Score: number | null;

  // Safety decision logic
  allowPremeditatio: boolean;  // false if PHQ≥15 OR GAD≥15
  timeSpentSeconds: number;    // Flag if >120s (rumination risk)
  anxietyDetected: boolean;    // Linguistic markers

  // Intervention options
  optOutOffered: boolean;      // REQUIRED for GAD≥15 users
  alternativeOffered: string;  // "Focus on gratitude instead?"
}

// Integration with existing crisis system:
// - If anxiety_detected === true AND time_spent > 120s:
//   - Offer opt-out
//   - Log analytics event (no PHI)
//   - Suggest gratitude practice instead
//
// - If user has active crisis plan:
//   - Check for similar triggers in warning signs
//   - Offer internal coping strategies from crisis plan
```

**Validation Checklist**:
- [ ] Crisis detection thresholds unchanged (PHQ≥15/20, GAD≥15, Q9>0)
- [ ] <200ms detection response time maintained
- [ ] <3s emergency access from all screens
- [ ] SafetyButton component preserved in all flow headers
- [ ] Premeditatio safeguards tested with GAD≥15 users
- [ ] Crisis plan integration documented

---

## 2. Analytics Integration

**Status**: 🔄 **MEDIUM CHANGES - NEW METRICS + PRESERVE PRIVACY**

### 2.1 Existing Analytics System (Preserve Privacy Architecture)

**Current Architecture** (from `AnalyticsService.ts`):
- **Zero PHI**: Severity buckets only (no raw scores)
- **Daily session rotation**: Prevents user tracking
- **Differential privacy**: ε=0.1, k-anonymity (k≥5)
- **Performance**: <10ms per event, <200ms crisis events
- **Memory**: <1MB per user per month

**Privacy Guarantees to Preserve**:
```typescript
// MUST MAINTAIN for Stoic analytics
interface AnalyticsPrivacyRequirements {
  noPHI: true;              // No raw PHQ/GAD scores
  severityBucketsOnly: true; // "moderate", "severe", not "18"
  noUserTracking: true;      // Daily session rotation
  differentialPrivacy: 0.1;  // Epsilon value
  kAnonymity: 5;            // Minimum group size
}
```

### 2.2 New Stoic Mindfulness Metrics

#### A. Principle Engagement Metrics
```typescript
interface PrincipleEngagementEvent {
  eventType: 'principle_engagement';
  timestamp: number;

  // Principle tracking (NO PHI)
  principleId: string;  // "principle_1" (anonymized)
  engagementType: 'practice' | 'module_read' | 'reflection';
  practiceDays: number; // Bucketed: <7, 7-14, 15-30, >30

  // Developmental stage (NO PHI)
  developmentalStage: 'fragmented' | 'effortful' | 'fluid' | 'integrated';
  stageTransition: boolean; // Did user advance?

  // Privacy-preserving context
  sessionId: string;  // Daily rotation
  userId: null;       // Never stored
}

// Analytics queries supported:
// - Which principles have highest engagement?
// - What's typical practice duration per principle?
// - What's the stage transition timeline?
// - Where do users drop off?
```

#### B. Virtue Practice Metrics
```typescript
interface VirtuePracticeEvent {
  eventType: 'virtue_practice';
  timestamp: number;

  // Virtue tracking (NO PHI)
  virtue: 'wisdom' | 'courage' | 'justice' | 'temperance';
  practiceDomain: 'work' | 'relationships' | 'adversity';
  practiceType: 'intention' | 'instance' | 'challenge';

  // Frequency buckets (NO EXACT COUNTS)
  weeklyFrequency: '<3' | '3-7' | '7-14' | '>14';

  // Privacy protection
  sessionId: string;
  userId: null;
}

// Analytics queries supported:
// - Which virtues are practiced most frequently?
// - Which domains see most practice?
// - What's the balance of intentions vs. instances vs. challenges?
```

#### C. Stoic Flow Completion Metrics
```typescript
interface StoicFlowCompletionEvent {
  eventType: 'flow_completion';
  timestamp: number;

  // Flow details (NO PHI)
  flowType: 'morning' | 'midday' | 'evening';
  flowVersion: string;  // 'stoic_v1'

  // Completion patterns (BUCKETED)
  timeSpentSeconds: '<300' | '300-900' | '900-1800' | '>1800';
  screensCompleted: number;  // Out of total screens
  screensSkipped: string[];  // Which screens skipped?

  // Practice consistency (NO PHI)
  consecutiveDays: '<7' | '7-30' | '30-90' | '>90';

  // Privacy protection
  sessionId: string;
  userId: null;
}

// Analytics queries supported:
// - What's average completion time per flow?
// - Which screens are most frequently skipped?
// - What's retention after 7/30/90 days?
```

#### D. Educational Module Engagement
```typescript
interface EducationalModuleEvent {
  eventType: 'module_engagement';
  timestamp: number;

  // Module details (NO PHI)
  moduleId: string;  // "principle_1_foundation"
  moduleType: 'principle' | 'virtue' | 'practice';

  // Engagement metrics (BUCKETED)
  timeSpent: '<5min' | '5-15min' | '15-30min' | '>30min';
  completionPercentage: '<25%' | '25-75%' | '75-100%';

  // Learning effectiveness (NO PHI)
  practiceAfterModule: boolean;  // Did user practice principle after reading?
  daysToComplete: '<3' | '3-7' | '7-14' | '>14';

  // Privacy protection
  sessionId: string;
  userId: null;
}
```

### 2.3 Analytics Integration Architecture

**Data Flow**:
```
Stoic Flow Completion
    ↓
StoicPracticeStore (local state)
    ↓
AnalyticsService.trackEvent()
    ↓
AnalyticsPrivacyEngine.validatePrivacyProtection()
    ↓ (if valid)
Local Analytics Queue (AsyncStorage)
    ↓ (batched upload)
Privacy-Preserving Analytics Backend
```

**Code Integration Points**:
```typescript
// Location: /src/services/analytics/AnalyticsService.ts
// Add new event types to existing privacy-preserving infrastructure

class AnalyticsService {
  // NEW METHODS for Stoic metrics
  async trackPrincipleEngagement(data: PrincipleEngagementEvent): Promise<void> {
    // Validate privacy protection (NO PHI)
    const isValid = await this.privacyEngine.validatePrivacyProtection(data);
    if (!isValid) {
      logSecurity('⚠️ Privacy violation in principle engagement event');
      return;
    }

    // Track with existing infrastructure
    await this.trackEvent(data);
  }

  async trackVirtuePractice(data: VirtuePracticeEvent): Promise<void> {
    // Same privacy validation flow
    // Reuse existing batching/encryption/transmission
  }

  // PRESERVE EXISTING methods
  async trackAssessmentCompletion(data: AssessmentEvent): Promise<void> {
    // Unchanged - MBCT and Stoic both use PHQ-9/GAD-7
  }

  async trackCrisisIntervention(data: CrisisEvent): Promise<void> {
    // Unchanged - Crisis system identical
  }
}
```

**Performance Requirements**:
- Event processing: <10ms per event (unchanged)
- Crisis events: <200ms total (unchanged)
- Memory: <1MB per user per month (unchanged)
- Network: Batched uploads (unchanged)

**Validation Checklist**:
- [ ] No PHI in any Stoic analytics events
- [ ] Severity buckets used instead of exact counts
- [ ] Daily session rotation maintained
- [ ] Differential privacy (ε=0.1) applied to all aggregates
- [ ] k-anonymity (k≥5) enforced for all reports
- [ ] <10ms event processing maintained
- [ ] <1MB memory limit maintained

---

## 3. State Management Integration

**Status**: 🟡 **MEDIUM CHANGES - NEW STORE + PRESERVE PATTERNS**

### 3.1 Existing Zustand Store Architecture

**Current Stores**:
```
/src/stores/
  ├─ crisisPlanStore.ts       // Safety planning (PRESERVE)
  └─ subscriptionStore.ts     // IAP + feature access (PRESERVE)

/src/flows/assessment/stores/
  └─ assessmentStore.ts       // PHQ-9/GAD-7 (PRESERVE)
```

**Store Patterns to Maintain**:
```typescript
// Pattern: Encrypted persistence + auto-save
interface StorePattern {
  // 1. Local state (Zustand)
  state: T;

  // 2. Encrypted persistence (SecureStore)
  persistKey: string;  // e.g., "@stoic_practice_store_v1"

  // 3. Auto-save debounced (1000ms)
  autoSave: boolean;

  // 4. Session recovery
  loadFromStorage: () => Promise<void>;

  // 5. Clear on logout
  clearStore: () => void;
}
```

### 3.2 New StoicPracticeStore

**Location**: `/src/stores/stoicPracticeStore.ts` (NEW FILE)

**Complete Interface**:
```typescript
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface StoicPracticeStore {
  // ──────────────────────────────────────
  // DEVELOPMENTAL PROGRESSION
  // ──────────────────────────────────────
  developmentalStage: 'fragmented' | 'effortful' | 'fluid' | 'integrated';
  stageStartDate: Date | null;
  stagePracticeDays: number;

  // Stage transition criteria (tracked automatically)
  stageMetrics: {
    consistencyScore: number;      // 0-1 scale (7+ day streaks)
    integrationDepth: number;      // 0-1 scale (cross-domain application)
    autonomyLevel: number;         // 0-1 scale (self-initiated practice)
    reflectionQuality: number;     // 0-1 scale (depth of learning entries)
  };

  // ──────────────────────────────────────
  // PRINCIPLE PROGRESSION
  // ──────────────────────────────────────
  currentPrinciple: string | null;  // "principle_1" or null
  principlesEngaged: string[];      // NOT "completed" - user decides mastery

  // Principle progress tracking
  principleProgress: Record<string, {
    principleId: string;
    startedAt: Date;
    practiceDays: number;
    applicationInstances: number;
    comprehensionDepth: 'intellectual' | 'experiential' | 'embodied';
    integrationStage: 'learning' | 'conscious_application' | 'effortful_spontaneity' | 'fluid_embodiment';
    moduleCompleted: boolean;
    selfAssessedMastery: number;  // 1-10 scale (user decides)
    userChoseToAdvance: boolean;
  }>;

  // ──────────────────────────────────────
  // VIRTUE TRACKING
  // ──────────────────────────────────────
  virtueTracking: {
    wisdom: VirtueInstance[];
    courage: VirtueInstance[];
    justice: VirtueInstance[];
    temperance: VirtueInstance[];
  };

  // Virtue challenges (balanced with instances)
  virtueChallenges: {
    wisdom: VirtueChallenge[];
    courage: VirtueChallenge[];
    justice: VirtueChallenge[];
    temperance: VirtueChallenge[];
  };

  // ──────────────────────────────────────
  // DOMAIN APPLICATIONS
  // ──────────────────────────────────────
  domainApplications: {
    work: DomainProgress;
    relationships: DomainProgress;
    adversity: DomainProgress;
  };

  // ──────────────────────────────────────
  // DAILY PRACTICE TRACKING
  // ──────────────────────────────────────
  dailyStreak: number;
  practiceConsistency: number;  // 0-1 scale (rolling 30-day window)
  lastPracticeDate: Date | null;

  // Flow completion tracking
  flowCompletions: {
    morning: number;
    midday: number;
    evening: number;
  };

  // ──────────────────────────────────────
  // EDUCATIONAL MODULE PROGRESS
  // ──────────────────────────────────────
  modulesUnlocked: string[];    // Which modules user can access
  modulesCompleted: string[];   // Which modules user finished
  moduleProgress: Record<string, {
    moduleId: string;
    startedAt: Date;
    completedAt: Date | null;
    timeSpentSeconds: number;
    sectionsCompleted: number;
    totalSections: number;
  }>;

  // ──────────────────────────────────────
  // STORE ACTIONS (Zustand Methods)
  // ──────────────────────────────────────

  // Principle progression
  recordPrinciplePractice: (principleId: string) => void;
  advanceToNextPrinciple: () => void;
  markPrincipleEngaged: (principleId: string) => void;

  // Virtue tracking
  recordVirtueInstance: (virtue: CardinalVirtue, instance: VirtueInstance) => void;
  recordVirtueChallenge: (virtue: CardinalVirtue, challenge: VirtueChallenge) => void;

  // Developmental stage
  checkStageTransition: () => Promise<void>;
  advanceStage: (newStage: DevelopmentalStage) => void;

  // Daily practice
  recordFlowCompletion: (flowType: 'morning' | 'midday' | 'evening') => void;
  updatePracticeStreak: () => void;

  // Educational modules
  unlockModule: (moduleId: string) => void;
  recordModuleProgress: (moduleId: string, progress: ModuleProgress) => void;

  // Persistence
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
  clearStore: () => void;
}

// Supporting interfaces
interface VirtueInstance {
  id: string;
  virtue: 'wisdom' | 'courage' | 'justice' | 'temperance';
  context: string;
  domain: 'work' | 'relationships' | 'adversity';
  principleApplied: string | null;
  timestamp: Date;
}

interface VirtueChallenge {
  id: string;
  situation: string;
  virtueViolated: 'wisdom' | 'courage' | 'justice' | 'temperance';
  whatICouldHaveDone: string;
  triggerIdentified: string | null;
  whatWillIPractice: string;
  selfCompassion: string;  // REQUIRED
  timestamp: Date;
}

interface DomainProgress {
  domain: 'work' | 'relationships' | 'adversity';
  practiceInstances: number;
  principlesApplied: string[];
  lastPracticeDate: Date | null;
}
```

**Implementation Pattern**:
```typescript
// Create Zustand store with persistence
export const useStoicPracticeStore = create<StoicPracticeStore>((set, get) => ({
  // Initial state
  developmentalStage: 'fragmented',
  stageStartDate: new Date(),
  stagePracticeDays: 0,
  // ... (all other state)

  // Actions
  recordPrinciplePractice: (principleId: string) => {
    set((state) => {
      const progress = state.principleProgress[principleId] || createNewProgress(principleId);
      progress.practiceDays += 1;
      progress.applicationInstances += 1;

      return {
        principleProgress: {
          ...state.principleProgress,
          [principleId]: progress,
        },
      };
    });

    // Auto-save to SecureStore (debounced)
    get().saveToStorage();
  },

  // Persistence methods
  loadFromStorage: async () => {
    try {
      const stored = await SecureStore.getItemAsync('@stoic_practice_store_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        set(parsed);
      }
    } catch (error) {
      logSecurity('Failed to load stoic practice store', error);
    }
  },

  saveToStorage: debounce(async () => {
    try {
      const state = get();
      await SecureStore.setItemAsync(
        '@stoic_practice_store_v1',
        JSON.stringify(state)
      );
    } catch (error) {
      logSecurity('Failed to save stoic practice store', error);
    }
  }, 1000),

  clearStore: () => {
    set(getInitialState());
    SecureStore.deleteItemAsync('@stoic_practice_store_v1');
  },
}));
```

### 3.3 Integration with Existing Stores

**Store Dependencies**:
```typescript
// StoicPracticeStore reads from (but doesn't modify):
// 1. AssessmentStore - check recent PHQ/GAD scores for premeditatio safety
// 2. CrisisPlanStore - check warning signs before negative visualization

// Example: Premeditatio safety check
const checkPremeditationSafety = () => {
  const assessmentStore = useAssessmentStore.getState();
  const lastResult = assessmentStore.currentResult;

  // Block premeditatio if recent crisis scores
  if (lastResult?.type === 'PHQ9' && lastResult.score >= 15) {
    return {
      allowPremeditatio: false,
      reason: 'Recent distress detected - focus on gratitude instead',
    };
  }

  if (lastResult?.type === 'GAD7' && lastResult.score >= 15) {
    return {
      allowPremeditatio: false,
      reason: 'Anxiety detected - gentle preparation recommended',
    };
  }

  return { allowPremeditatio: true };
};
```

**Store Initialization**:
```typescript
// On app launch (App.tsx or similar):
useEffect(() => {
  // Load all stores from encrypted storage
  const loadStores = async () => {
    await useAssessmentStore.getState().loadFromStorage();
    await useCrisisPlanStore.getState().loadFromStorage();
    await useStoicPracticeStore.getState().loadFromStorage();  // NEW
  };

  loadStores();
}, []);
```

**Validation Checklist**:
- [ ] StoicPracticeStore follows existing Zustand patterns
- [ ] Encrypted persistence with SecureStore
- [ ] Auto-save debounced to 1000ms
- [ ] Session recovery implemented
- [ ] Clear on logout implemented
- [ ] No circular dependencies with other stores
- [ ] Performance: <50ms state updates

---

## 4. Performance Requirements

**Status**: ⚠️ **CRITICAL - EXACT BENCHMARKS MUST BE MET**

### 4.1 Existing Performance Guarantees (Unchanged)

**Crisis Path**:
```typescript
// EXACT REQUIREMENTS - DO NOT RELAX
const PERFORMANCE_REQUIREMENTS = {
  // Crisis detection
  CRISIS_DETECTION_MAX_MS: 200,  // From scoring to alert
  CRISIS_SCREEN_ACCESS_MAX_MS: 3000,  // From any screen to resources

  // Breathing circle (midday flow)
  BREATHING_CIRCLE_FPS: 60,  // Must maintain 60fps
  BREATHING_DURATION_MS: 60000,  // Exactly 60 seconds

  // Flow transitions
  SCREEN_TRANSITION_MAX_MS: 500,  // Between flow screens

  // App launch
  APP_LAUNCH_MAX_MS: 2000,  // Cold start to interactive

  // Assessment auto-save
  ASSESSMENT_AUTOSAVE_DEBOUNCE_MS: 1000,
};
```

**Validation Process** (from existing tests):
```typescript
// Location: /app/__tests__/performance/
// Existing test files to update:
// - breathing-circle-performance.test.ts
// - crisis-performance.test.ts
// - flow-transition-performance.test.ts

// Example test to preserve:
describe('Crisis Performance', () => {
  it('detects crisis in <200ms', async () => {
    const start = performance.now();
    await ClinicalScoringService.calculatePHQ9Score(crisisAnswers);
    const end = performance.now();

    expect(end - start).toBeLessThan(200);
  });
});
```

### 4.2 New Stoic Performance Considerations

#### A. StoicPracticeStore State Updates
```typescript
// NEW REQUIREMENT: State updates must be <50ms
interface StoicPerformanceRequirements {
  // Principle recording
  RECORD_PRINCIPLE_PRACTICE_MAX_MS: 50,

  // Virtue tracking
  RECORD_VIRTUE_INSTANCE_MAX_MS: 50,

  // Stage transition check (complex calculation)
  CHECK_STAGE_TRANSITION_MAX_MS: 100,

  // Flow completion recording
  RECORD_FLOW_COMPLETION_MAX_MS: 50,

  // Educational module progress
  UPDATE_MODULE_PROGRESS_MAX_MS: 50,
}

// Implementation strategy:
// - Debounce expensive calculations (stage transition)
// - Offload analytics to background thread
// - Use memoization for derived state
```

#### B. Educational Module Loading
```typescript
// NEW REQUIREMENT: Module content must load quickly
interface ModuleLoadingPerformance {
  // Module screen initial render
  MODULE_INITIAL_RENDER_MAX_MS: 500,

  // Module content parsing (markdown → UI)
  MODULE_CONTENT_PARSE_MAX_MS: 300,

  // Module progress persistence
  MODULE_PROGRESS_SAVE_MAX_MS: 100,
}

// Implementation strategy:
// - Lazy load module content (not all 12 principles upfront)
// - Cache parsed content in memory
// - Use virtualized lists for long content
```

#### C. Principle Progress Calculations
```typescript
// MEDIUM COMPLEXITY: Developmental stage calculation
// - Reads 30+ days of practice data
// - Calculates 4 metrics (consistency, integration, autonomy, reflection)
// - Must complete in <100ms

interface StageCalculationOptimization {
  // Optimization strategies:
  caching: 'Memoize last calculation, only recalculate on new data',
  debouncing: 'Check stage transition max once per day',
  indexing: 'Pre-compute rolling windows for 7/30/90 day metrics',
  backgroundProcessing: 'Use React Native Worker thread for heavy calculations',
}

// Example memoized calculation:
const calculateStageMetrics = memoize(
  (practiceData: PracticeData[], cacheKey: string) => {
    // Heavy calculation here
    return {
      consistencyScore: calculateConsistency(practiceData),
      integrationDepth: calculateIntegration(practiceData),
      autonomyLevel: calculateAutonomy(practiceData),
      reflectionQuality: calculateReflection(practiceData),
    };
  },
  // Cache key: Date string (recalculate once per day)
  (practiceData, cacheKey) => cacheKey
);
```

### 4.3 Monitoring & Validation

**New Performance Tests to Add**:
```typescript
// Location: /app/__tests__/performance/stoic-performance.test.ts (NEW FILE)

describe('Stoic Performance', () => {
  describe('Store Operations', () => {
    it('records principle practice in <50ms', async () => {
      const store = useStoicPracticeStore.getState();
      const start = performance.now();
      store.recordPrinciplePractice('principle_1');
      const end = performance.now();

      expect(end - start).toBeLessThan(50);
    });

    it('records virtue instance in <50ms', async () => {
      // Similar test
    });

    it('checks stage transition in <100ms', async () => {
      // Test complex calculation
    });
  });

  describe('Educational Modules', () => {
    it('loads module in <500ms', async () => {
      // Test module screen render
    });

    it('parses module content in <300ms', async () => {
      // Test markdown parsing
    });
  });

  describe('Breathing Circle', () => {
    it('maintains 60fps during Stoic midday flow', async () => {
      // PRESERVE EXISTING TEST - no changes to breathing circle
      // Just run with new Stoic content to verify no regression
    });
  });
});
```

**Performance Monitoring Integration**:
```typescript
// Location: /src/services/performance/PerformanceMonitor.ts
// Add new metrics for Stoic operations

class PerformanceMonitor {
  // EXISTING METHODS (preserve)
  async measureCrisisPerformance(): Promise<CrisisMetrics> { /* ... */ }
  async measureBreathingCirclePerformance(): Promise<BreathingMetrics> { /* ... */ }

  // NEW METHODS for Stoic monitoring
  async measureStoicStorePerformance(): Promise<StoicStoreMetrics> {
    return {
      principleRecordingMs: await this.measure(() => recordPrinciple()),
      virtueRecordingMs: await this.measure(() => recordVirtue()),
      stageTransitionMs: await this.measure(() => checkStageTransition()),
      flowCompletionMs: await this.measure(() => recordFlowCompletion()),
    };
  }

  async measureModuleLoadingPerformance(): Promise<ModuleMetrics> {
    return {
      initialRenderMs: await this.measure(() => renderModule()),
      contentParseMs: await this.measure(() => parseMarkdown()),
      progressSaveMs: await this.measure(() => saveProgress()),
    };
  }
}
```

**Validation Checklist**:
- [ ] Crisis detection <200ms maintained (no regression)
- [ ] Breathing circle 60fps maintained (no regression)
- [ ] Screen transitions <500ms maintained (no regression)
- [ ] Stoic store updates <50ms for simple operations
- [ ] Stoic store updates <100ms for complex calculations
- [ ] Module loading <500ms initial render
- [ ] Module content parsing <300ms
- [ ] Performance tests added for all new operations
- [ ] PerformanceMonitor updated with Stoic metrics

---

## 5. Assessment System Integration

**Status**: 🟡 **MINIMAL CHANGES - MESSAGING ONLY**

### 5.1 Existing Assessment System (Preserve Core)

**Components That Stay Unchanged**:
- `ClinicalScoringService.ts` - PHQ-9/GAD-7 scoring algorithms
- `assessmentStore.ts` - Assessment state management
- Assessment questions (EXACT wording, order, response options)
- Crisis thresholds (PHQ≥15/20, GAD≥15, Q9>0)

**What Changes**: Contextual messaging only

### 5.2 Stoic Mindfulness Messaging Integration

#### A. Assessment Introduction Screen
```typescript
// Location: /src/flows/assessment/screens/AssessmentIntroScreen.tsx

// BEFORE (MBCT):
const mbctIntro = {
  title: "Mental Health Check-In",
  description: "Track your mental health progress with validated clinical assessments. " +
               "These standardized questionnaires (PHQ-9 for depression, GAD-7 for anxiety) " +
               "help you and your healthcare provider monitor your wellbeing.",
  frequency: "We recommend completing assessments weekly to track changes over time.",
};

// AFTER (Stoic):
const stoicIntro = {
  title: "Wellness Assessment",
  description: "Monitor your wellness as you practice Stoic Mindfulness. " +
               "These validated questionnaires (PHQ-9 for mood, GAD-7 for anxiety) " +
               "help you understand your starting point and track your progress.",
  frequency: "Complete these assessments weekly to observe how Stoic practice affects your wellbeing.",
  clarification: "⚠️ Important: Stoic Mindfulness supports wellness but is not a substitute for " +
                 "professional mental health treatment. These assessments help you know when " +
                 "additional support may be helpful.",
};
```

#### B. Results Screen Messaging
```typescript
// Location: /src/flows/assessment/screens/AssessmentResultsScreen.tsx

// BEFORE (MBCT - Clinical framing):
const mbctResults = {
  lowSeverity: "Your scores suggest minimal symptoms. Continue practicing mindfulness.",
  moderateSeverity: "Your scores suggest moderate symptoms. MBCT may be helpful alongside professional support.",
  highSeverity: "Your scores suggest significant distress. Professional treatment is recommended.",
};

// AFTER (Stoic - Wellness framing):
const stoicResults = {
  lowSeverity: "Your scores suggest you're experiencing wellness. Stoic practice can help maintain this.",
  moderateSeverity: "Your scores suggest moderate distress. Stoic practice can complement professional support, " +
                    "but is not a substitute for treatment.",
  highSeverity: "Your scores suggest significant distress. Please seek professional support immediately. " +
                "Stoic philosophy is a wellness practice, not a mental health treatment.",
};
```

#### C. Integration with Premeditatio Malorum
```typescript
// NEW: Assessment scores inform practice safety

interface PremeditationSafetyLogic {
  // Read most recent assessment scores
  getMostRecentScores: () => {
    phq9: number | null;
    gad7: number | null;
    assessmentDate: Date | null;
  };

  // Safety decision
  shouldAllowPremeditatio: (scores: AssessmentScores) => {
    // Block negative visualization if:
    // - PHQ-9 ≥15 (moderate depression)
    // - GAD-7 ≥15 (severe anxiety)
    // - No recent assessment (>30 days)

    if (scores.phq9 >= 15) {
      return {
        allowed: false,
        reason: 'Recent distress detected',
        alternative: 'Focus on gratitude practice instead',
        offerAssessment: true,
      };
    }

    if (scores.gad7 >= 15) {
      return {
        allowed: false,
        reason: 'Anxiety detected',
        alternative: 'Try gentle intention-setting instead',
        offerAssessment: true,
      };
    }

    if (!scores.assessmentDate || daysSince(scores.assessmentDate) > 30) {
      return {
        allowed: true,  // Don't block, but offer assessment
        warning: 'Consider taking a wellness assessment to personalize your practice',
        offerAssessment: true,
      };
    }

    return { allowed: true };
  };
}

// Implementation location: /src/services/stoic/PremeditationSafetyService.ts (NEW)
```

### 5.3 Assessment Trigger Points

**Existing Triggers** (preserve):
- Onboarding (first app launch)
- Manual assessment from menu
- Weekly reminder notification

**New Triggers** (add):
```typescript
// Trigger assessment from Stoic flows if:
interface StoicAssessmentTriggers {
  // 1. User reports high distress in check-in
  eveningReviewDistress: {
    trigger: 'dayQualityRating < 3 for 3+ consecutive days',
    message: 'You\'ve reported difficulty for several days. A brief assessment can help us personalize your practice.',
  },

  // 2. Premeditatio anxiety detection
  premeditationAnxiety: {
    trigger: 'anxietyDetected === true in morning preparation',
    message: 'We noticed some anxiety during preparation. A quick assessment can help tailor your practice.',
  },

  // 3. Long gap since last assessment
  assessmentGap: {
    trigger: 'daysSinceLastAssessment > 30',
    message: 'It\'s been a while since your last wellness check. A brief assessment helps us support you better.',
  },

  // 4. Developmental stage transition
  stageTransition: {
    trigger: 'developmentalStage advanced (e.g., fragmented → effortful)',
    message: 'Congratulations on progressing! A wellness assessment can show how Stoic practice is supporting you.',
  },
}
```

**Validation Checklist**:
- [ ] PHQ-9/GAD-7 questions unchanged (exact wording)
- [ ] Scoring algorithms unchanged (no modifications)
- [ ] Crisis thresholds unchanged (PHQ≥15/20, GAD≥15, Q9>0)
- [ ] Introduction/results messaging updated to wellness framing
- [ ] Premeditatio safety logic integrated with assessment scores
- [ ] New trigger points implemented
- [ ] Assessment frequency recommendations updated
- [ ] Clinical disclaimers prominent in all assessment screens

---

## 6. Navigation Integration

**Status**: 🟢 **LOW CHANGES - LABELING + NEW SCREENS**

### 6.1 Existing Navigation Structure (Preserve)

**Root Navigator** (`/src/navigation/CleanRootNavigator.tsx`):
```typescript
// Stack structure stays the same
type RootStackParamList = {
  Main: undefined;                // Tab navigator (home, profile, etc.)
  MorningFlow: undefined;         // Morning check-in modal
  MiddayFlow: undefined;          // Midday check-in modal
  EveningFlow: undefined;         // Evening check-in modal
  CrisisResources: { ... };       // Crisis screen (PRESERVE)
  CrisisPlan: undefined;          // Safety planning (PRESERVE)
  Subscription: undefined;        // IAP screen (PRESERVE)
  // Assessment flows (PRESERVE)
  AssessmentIntro: undefined;
  PHQ9Assessment: undefined;
  GAD7Assessment: undefined;
  AssessmentResults: undefined;
};
```

### 6.2 New Navigation Items for Stoic Mindfulness

**Add to RootStackParamList**:
```typescript
type RootStackParamList = {
  // ... (existing routes preserved)

  // NEW STOIC SCREENS
  EducationalModule: {
    moduleId: string;
    principleId: string;
  };

  PrincipleOverview: {
    principleId: string;
  };

  VirtueTracker: {
    virtue?: CardinalVirtue;  // Optional filter
  };

  DevelopmentalStageInfo: undefined;

  StoicPracticeProgress: undefined;  // Progress/stats screen
};
```

**Tab Navigator Updates**:
```typescript
// Location: /src/navigation/MainTabNavigator.tsx

// BEFORE (MBCT):
const mbctTabs = {
  Home: 'Home',
  Insights: 'Insights',  // MBCT progress/analytics
  Resources: 'Resources',
  Profile: 'Profile',
};

// AFTER (Stoic):
const stoicTabs = {
  Home: 'Home',           // Unchanged - still shows check-in cards
  Practice: 'Practice',   // RENAMED from "Insights" - shows Stoic progress
  Learn: 'Learn',         // NEW - educational modules (replaces "Resources")
  Profile: 'Profile',     // Unchanged
};
```

### 6.3 Flow Navigation Updates

**Morning Flow Screens** (from Navigation-Sequence-Design.md):
```typescript
// Location: /src/flows/morning/MorningFlowNavigator.tsx

// BEFORE (MBCT - 6 screens):
type MorningFlowParamList = {
  BodyScan: undefined;
  EmotionRecognition: undefined;
  ThoughtObservation: undefined;
  PhysicalMetrics: undefined;
  ValuesIntention: undefined;
  DreamJournal: undefined;
};

// AFTER (Stoic - 7 screens):
type MorningFlowParamList = {
  MorningWelcome: undefined;          // NEW - brief welcome
  Gratitude: undefined;               // RENAMED from GratitudeScreen
  IntentionSetting: undefined;        // RENAMED from ValuesIntention
  Preparation: undefined;             // NEW - premeditatio malorum
  PhysicalMetrics: undefined;         // UNCHANGED - keep body awareness
  PrincipleFocus: undefined;          // NEW - current principle prompt
  MorningSummary: undefined;          // NEW - summary screen
};
```

**Midday Flow Screens**:
```typescript
// Location: /src/flows/midday/MiddayFlowNavigator.tsx

// BEFORE (MBCT - 3 screens, 60s each):
type MiddayFlowParamList = {
  Awareness: undefined;     // Body scan + present moment
  Gathering: undefined;     // Breathing + focus
  Expanding: undefined;     // Expand awareness
};

// AFTER (Stoic - 6 screens, variable duration):
type MiddayFlowParamList = {
  MiddayWelcome: undefined;         // NEW - brief check-in
  CurrentSituation: undefined;      // NEW - what's happening now?
  ControlCheck: undefined;          // NEW - dichotomy of control
  Embodiment: undefined;            // RENAMED from Gathering - 60s breathing (PRESERVE)
  Reappraisal: undefined;           // NEW - obstacle → opportunity
  IntentionProgress: undefined;     // NEW - morning intention check
};

// CRITICAL: Embodiment screen MUST maintain 60fps breathing circle
```

**Evening Flow Screens**:
```typescript
// Location: /src/flows/evening/EveningFlowNavigator.tsx

// BEFORE (MBCT - 4 screens):
type EveningFlowParamList = {
  DayReview: undefined;
  PleasantUnpleasant: undefined;
  ThoughtPatterns: undefined;
  TomorrowPrep: undefined;
};

// AFTER (Stoic - 12 screens):
type EveningFlowParamList = {
  EveningWelcome: undefined;                // NEW
  MorningIntentionReview: undefined;        // NEW - did you practice?
  DayQuality: undefined;                    // RENAMED from DayReview
  VirtueMoments: undefined;                 // NEW - where did you succeed?
  VirtueChallenges: undefined;              // NEW - where did you struggle?
  Learning: undefined;                      // NEW - react vs. respond moments
  SenecaQuestions: undefined;               // NEW - 3 reflections
  PrincipleCoverageCheck: undefined;        // NEW - under-represented principles
  EveningGratitude: undefined;              // RENAMED
  TomorrowIntention: undefined;             // RENAMED from TomorrowPrep
  SelfCompassion: undefined;                // NEW - REQUIRED screen
  EveningSummary: undefined;                // NEW
};
```

### 6.4 Deep Linking Integration

**Add Deep Links for Stoic Features**:
```typescript
// Location: /src/navigation/linking-configuration.ts

const linkingConfig = {
  // EXISTING (preserve)
  'being://crisis': { screen: 'CrisisResources' },
  'being://crisis-plan': { screen: 'CrisisPlan' },
  'being://assessment': { screen: 'AssessmentIntro' },

  // NEW (add)
  'being://principle/:principleId': { screen: 'PrincipleOverview' },
  'being://module/:moduleId': { screen: 'EducationalModule' },
  'being://practice': { screen: 'StoicPracticeProgress' },
  'being://virtue/:virtue': { screen: 'VirtueTracker' },
};
```

**Validation Checklist**:
- [ ] Existing routes preserved (Main, Crisis, Assessment)
- [ ] New Stoic screens added to RootStackParamList
- [ ] Tab navigator updated (Insights → Practice, Resources → Learn)
- [ ] Morning flow navigator updated (7 screens)
- [ ] Midday flow navigator updated (6 screens)
- [ ] Evening flow navigator updated (12 screens)
- [ ] Deep linking configured for new screens
- [ ] Back button behavior correct (modal dismiss)
- [ ] Crisis access maintained from all screens

---

## 7. Storage & Persistence Integration

**Status**: 🟡 **MEDIUM CHANGES - NEW DATA + PRESERVE ENCRYPTION**

### 7.1 Existing Storage Architecture (Preserve)

**Storage Layers**:
```
1. SecureStore (expo-secure-store)
   - PHI/sensitive data (encrypted at rest)
   - Keys: assessment_store, crisis_plan, user_id

2. AsyncStorage (@react-native-async-storage/async-storage)
   - Non-sensitive data (settings, preferences, analytics queue)
   - Keys: @being/supabase/*, @settings/*, @analytics/*

3. Supabase (optional cloud backup)
   - Encrypted blobs only
   - User consent required
   - No PHI on server
```

**Encryption Standards** (MUST PRESERVE):
```typescript
interface EncryptionRequirements {
  algorithm: 'AES-256';
  keyStorage: 'Device secure enclave (iOS) or Keystore (Android)';
  atRest: true;      // All PHI encrypted on device
  inTransit: true;   // TLS 1.3 for network transmission
  cloudBackup: 'Encrypted blobs only with user consent';
}
```

### 7.2 New Stoic Data Persistence

**SecureStore Keys** (add):
```typescript
// NEW ENCRYPTED KEYS for Stoic data
const SECURE_STORE_KEYS = {
  // EXISTING (preserve)
  ASSESSMENT_STORE: 'assessment_store_encrypted',
  CRISIS_PLAN: '@crisis_plan_secure_v1',
  USER_ID: '@being/supabase/user_id',

  // NEW (add)
  STOIC_PRACTICE_STORE: '@stoic_practice_store_v1',  // Main Stoic state
  VIRTUE_TRACKING: '@virtue_tracking_encrypted_v1',  // Virtue instances/challenges
  EDUCATIONAL_PROGRESS: '@educational_progress_v1',  // Module completion
};
```

**Data Structures to Persist**:
```typescript
// 1. StoicPracticeStore (ENCRYPTED - contains personal reflections)
interface StoicPracticeStorePersistedState {
  // Full store state (see Section 3.2)
  // Size estimate: 50-200KB per user
  // Encryption: Required (personal reflections = PHI-adjacent)
}

// 2. Virtue Tracking (ENCRYPTED - contains personal situations)
interface VirtueTrackingPersistedState {
  virtueInstances: VirtueInstance[];     // 100-500 entries typical
  virtueChallenges: VirtueChallenge[];   // 50-200 entries typical
  // Size estimate: 100-500KB per user
  // Encryption: Required (personal situations = PHI-adjacent)
}

// 3. Educational Progress (NOT ENCRYPTED - no sensitive data)
interface EducationalProgressPersistedState {
  modulesUnlocked: string[];
  modulesCompleted: string[];
  moduleProgress: Record<string, ModuleProgress>;
  // Size estimate: 10-50KB per user
  // Encryption: Optional (no PHI)
}
```

### 7.3 Cloud Backup Integration (Supabase)

**Backup Strategy**:
```typescript
// Location: /src/services/supabase/CloudBackupService.ts

// EXISTING backup for MBCT data (preserve)
interface MBCTBackupData {
  assessments: EncryptedBlob;
  crisisPlan: EncryptedBlob;
  flowHistory: EncryptedBlob;
}

// NEW backup for Stoic data (add)
interface StoicBackupData {
  stoicPracticeStore: EncryptedBlob;  // Full store state
  virtueTracking: EncryptedBlob;      // All virtue data
  educationalProgress: EncryptedBlob; // Module progress
  backupTimestamp: Date;
  backupVersion: 'stoic_v1';
}

// Backup frequency: Same as MBCT
// - Automatic: Daily (if consent granted)
// - Manual: On-demand from settings
// - On logout: Optional backup before clear
```

**Encryption Before Upload**:
```typescript
// PRESERVE EXISTING encryption pattern
const backupStoicData = async (): Promise<void> => {
  // 1. Get current state
  const stoicStore = useStoicPracticeStore.getState();
  const virtueData = extractVirtueTracking(stoicStore);
  const educationalData = extractEducationalProgress(stoicStore);

  // 2. Encrypt each blob separately
  const encryptedStorehis = await EncryptionService.encrypt(
    JSON.stringify(stoicStore),
    await getEncryptionKey()
  );

  const encryptedVirtues = await EncryptionService.encrypt(
    JSON.stringify(virtueData),
    await getEncryptionKey()
  );

  const encryptedEducation = await EncryptionService.encrypt(
    JSON.stringify(educationalData),
    await getEncryptionKey()
  );

  // 3. Upload to Supabase (if consent granted)
  if (await hasCloudBackupConsent()) {
    await SupabaseService.uploadBackup({
      stoicPracticeStore: encryptedStore,
      virtueTracking: encryptedVirtues,
      educationalProgress: encryptedEducation,
      backupTimestamp: new Date(),
      backupVersion: 'stoic_v1',
    });
  }
};
```

### 7.4 Storage Size Management

**Estimated Storage Requirements**:
```typescript
// Per user, after 90 days of practice:
const STORAGE_SIZE_ESTIMATES = {
  // EXISTING (MBCT)
  assessmentStore: '10-50KB',
  crisisPlan: '5-20KB',
  mbctFlowHistory: '100-500KB',

  // NEW (Stoic)
  stoicPracticeStore: '50-200KB',
  virtueTracking: '100-500KB',
  educationalProgress: '10-50KB',

  // TOTAL
  totalPerUser: '275KB - 1.32MB',

  // Limits
  secureStoreLimit: '2MB (iOS), 100KB per key (Android)',
  asyncStorageLimit: '6MB recommended',
  supabaseLimit: '50MB per user (generous)',
};
```

**Cleanup Strategy**:
```typescript
// Location: /src/services/storage/StorageCleanupService.ts (NEW)

interface StorageCleanupPolicy {
  // Virtue tracking: Keep last 90 days
  virtueInstancesRetention: {
    maxDays: 90,
    cleanupStrategy: 'Archive to cloud, delete local',
    cleanupFrequency: 'Weekly',
  },

  // Educational progress: Keep forever (small size)
  educationalProgressRetention: {
    maxDays: null,  // Never delete
  },

  // Flow completions: Keep last 180 days detailed, aggregate beyond
  flowCompletionsRetention: {
    maxDaysDetailed: 180,
    aggregationStrategy: 'Daily counts only',
  },
}

// Implement automatic cleanup
const cleanupOldData = async (): Promise<void> => {
  const store = useStoicPracticeStore.getState();

  // 1. Archive old virtue instances to cloud
  const oldVirtues = filterByAge(store.virtueTracking, 90);
  await archiveToCloud(oldVirtues);

  // 2. Remove archived instances from local state
  const recentVirtues = filterByAge(store.virtueTracking, 90, 'keep_recent');
  store.updateVirtueTracking(recentVirtues);

  // 3. Aggregate old flow completions
  const oldCompletions = filterByAge(store.flowCompletions, 180);
  const aggregated = aggregateByDay(oldCompletions);
  store.updateFlowCompletions(aggregated);
};
```

### 7.5 Migration Storage Considerations

**Data Migration Storage Impact**:
```typescript
// If migrating from MBCT to Stoic (Scenario 2 - unlikely):
interface MigrationStorageImpact {
  // Temporary storage during migration
  temporaryStorageNeeded: '2x current data (double storage)',
  migrationDuration: '1-5 minutes',

  // Post-migration cleanup
  mbctDataHandling: 'Archive to cloud, delete local after 30 days',
  stoicDataCreated: 'New stores initialized',

  // Rollback capability
  rollbackWindowDays: 30,
  rollbackStorageNeeded: 'Keep MBCT data for 30 days',
}
```

**Validation Checklist**:
- [ ] StoicPracticeStore encrypted in SecureStore
- [ ] Virtue tracking encrypted in SecureStore
- [ ] Educational progress in AsyncStorage (no encryption needed)
- [ ] Cloud backup encryption preserved (AES-256)
- [ ] Cloud backup consent flow unchanged
- [ ] Storage size estimates validated (<2MB per user)
- [ ] Cleanup policy implemented (90-day retention)
- [ ] Migration storage impact documented
- [ ] Rollback capability maintained (30 days)

---

## 8. Agent Domain Integration

**Status**: 🟢 **LOW CHANGES - VALIDATION GATES**

### 8.1 Existing Agent Architecture (Preserve)

**Domain Agents** (from `.claude/agents/`):
```
/Users/max/Development/active/being/.claude/agents/
  ├─ crisis.md          // Safety protocols (PRESERVE 100%)
  ├─ compliance.md      // HIPAA/privacy (PRESERVE 100%)
  └─ philosopher.md     // Stoic validation (ACTIVE for FEAT-45)
```

**Agent Hierarchy** (from CLAUDE.md):
```
Domain Authority: crisis > compliance > philosopher > technical

Override Powers:
- Crisis: Overrides ALL (safety first)
- Compliance: Overrides technical (legal requirements)
- Philosopher: Overrides UX (philosophical accuracy)
```

### 8.2 Philosopher Agent Integration (Active)

**Role in Stoic Mindfulness**:
```yaml
# From philosopher.md

triggers:
  - Stoic principles validation
  - Virtue ethics accuracy check
  - Classical source citations (Marcus Aurelius, Epictetus, Seneca)
  - Dichotomy of control framing
  - Premeditatio malorum safety review
  - Educational module content review

non_negotiables:
  - Classical accuracy (must align with Stoics)
  - Four cardinal virtues only (no modern additions)
  - Dichotomy of control properly framed (not oversimplified)
  - Prohairesis preserved (user exercises agency)
  - Preferred indifferents correct (externals preferred but not essential)
  - Clinical safety (practices safe for vulnerable users)

override_authority:
  - Can override UX for philosophical accuracy
  - Cannot override crisis agent (safety > philosophy)
  - Cannot override compliance agent (legal > philosophy)
```

**Validation Gates for Implementation**:
```typescript
// Philosopher agent reviews at these checkpoints:

interface PhilosopherValidationGates {
  // 1. Data model validation (COMPLETED - Days 1-4)
  dataModels: {
    status: 'APPROVED (9.5/10)',
    date: '2025-10-19',
    rating: 9.5,
    criticalIssues: 'ALL RESOLVED',
  },

  // 2. Flow content validation (PENDING - Phase 2)
  flowContent: {
    morning: 'PENDING',
    midday: 'PENDING',
    evening: 'PENDING',
    screens: [
      'Intention prompts',
      'Gratitude instructions',
      'Premeditatio malorum guidance',
      'Control check questions',
      'Virtue moment prompts',
      'Seneca reflection questions',
    ],
  },

  // 3. Educational module validation (PENDING - Phase 3)
  educationalModules: {
    principles: 'PENDING (all 12)',
    virtues: 'PENDING (all 4)',
    practices: 'PENDING',
    citations: 'PENDING (Marcus Aurelius, Epictetus, Seneca)',
  },

  // 4. User-facing language validation (PENDING - Phase 2-3)
  userLanguage: {
    onboarding: 'PENDING',
    flowInstructions: 'PENDING',
    assessmentFraming: 'PENDING',
    progressTracking: 'PENDING',
  },
}
```

### 8.3 Crisis Agent Integration (Preserved)

**Non-Negotiable Requirements**:
```yaml
# From crisis.md

triggers:
  - PHQ-9 ≥15 (support recommended)
  - PHQ-9 ≥20 (intervention required)
  - GAD-7 ≥15 (crisis threshold)
  - Q9 > 0 (suicidal ideation)
  - Crisis button pressed
  - Premeditatio anxiety detection (NEW for Stoic)

response_requirements:
  - <200ms detection
  - <3s resource access
  - 988/741741/911 always available
  - Offline functionality maintained

integration_with_stoic:
  - Premeditatio malorum safety check (NEW)
  - Assessment score integration (EXISTING)
  - Crisis button in all flows (EXISTING)
  - Warning signs in crisis plan (EXISTING)
```

**New Crisis Integration Point**:
```typescript
// Premeditatio malorum triggers crisis safety check
// Location: /src/flows/morning/screens/PreparationScreen.tsx (NEW)

const PreparationScreen = () => {
  const checkCrisisSafety = () => {
    // 1. Check recent assessment scores
    const assessmentStore = useAssessmentStore();
    const lastPHQ9 = assessmentStore.getMostRecentPHQ9();
    const lastGAD7 = assessmentStore.getMostRecentGAD7();

    // 2. Block premeditatio if crisis scores
    if (lastPHQ9?.score >= 15 || lastGAD7?.score >= 15) {
      return {
        allowed: false,
        message: 'Let\'s focus on gratitude today instead',
        offerCrisisResources: true,
      };
    }

    // 3. Monitor for anxiety during practice
    // (Linguistic analysis, time spent >120s, opt-out offered)
  };
};
```

### 8.4 Compliance Agent Integration (Preserved)

**HIPAA/Privacy Requirements** (unchanged):
```yaml
# From compliance.md

triggers:
  - Data encryption changes
  - Storage modifications
  - Network transmission changes
  - User consent flows
  - Analytics event definitions (NEW for Stoic metrics)

non_negotiables:
  - AES-256 encryption for PHI
  - No unencrypted PHI transmission
  - User consent for cloud backup
  - No PHI in analytics events
  - Differential privacy (ε=0.1)
  - k-anonymity (k≥5)

integration_with_stoic:
  - Virtue tracking encrypted (personal situations = PHI-adjacent)
  - Educational progress NOT encrypted (no PHI)
  - Stoic analytics validated (no raw scores/names/dates)
  - Cloud backup consent unchanged
```

**Validation Gates for Compliance**:
```typescript
interface ComplianceValidationGates {
  // 1. Storage encryption (REQUIRED for Phase 2)
  storageEncryption: {
    stoicPracticeStore: 'MUST use SecureStore (AES-256)',
    virtueTracking: 'MUST use SecureStore (personal data)',
    educationalProgress: 'AsyncStorage OK (no PHI)',
  },

  // 2. Analytics privacy (REQUIRED for Phase 2)
  analyticsPrivacy: {
    principleEngagement: 'VALIDATED (no PHI)',
    virtuePractice: 'VALIDATED (no PHI)',
    flowCompletion: 'VALIDATED (no PHI)',
    educationalModule: 'VALIDATED (no PHI)',
  },

  // 3. Cloud backup consent (REQUIRED for Phase 2)
  cloudBackupConsent: {
    newStoicData: 'MUST require user consent',
    consentFlow: 'PRESERVE existing flow',
    encryptionBeforeUpload: 'REQUIRED (AES-256)',
  },
}
```

### 8.5 Agent Handoff Protocols

**L3-Complex Handoffs** (for domain-critical work):
```typescript
// When implementing Stoic features requiring domain validation:

interface L3ComplexHandoff {
  // Required sections
  domainRequirements: {
    philosophical: string[];  // Stoic accuracy requirements
    clinical: string[];       // Safety requirements
    regulatory: string[];     // HIPAA/privacy requirements
  },

  technicalContext: {
    filesModified: string[];
    integrationPoints: string[];
    performanceImpact: string;
  },

  validationSteps: {
    philosopherReview: boolean;
    crisisReview: boolean;
    complianceReview: boolean;
  },

  nonNegotiables: {
    mustPreserve: string[];   // Crisis thresholds, encryption, etc.
    mustValidate: string[];   // Stoic accuracy, safety, privacy
    mustTest: string[];       // Performance, crisis, privacy
  },
}

// Example: Morning flow premeditatio screen
const premeditationHandoff: L3ComplexHandoff = {
  domainRequirements: {
    philosophical: [
      'Premeditatio malorum must align with Stoic practice (Seneca, Marcus Aurelius)',
      'Cannot be catastrophizing or rumination',
      'Must preserve user agency (prohairesis)',
    ],
    clinical: [
      'Must not trigger distress in vulnerable users',
      'Safety checks for GAD ≥15 users required',
      'Opt-out pathway mandatory',
      'Time-boxing to prevent rumination (<120s)',
    ],
    regulatory: [
      'Personal obstacles are PHI-adjacent (encrypt)',
      'No cloud sync without consent',
      'Analytics must not contain specific obstacles',
    ],
  },

  technicalContext: {
    filesModified: [
      '/src/flows/morning/screens/PreparationScreen.tsx',
      '/src/services/stoic/PremeditationSafetyService.ts',
      '/src/stores/stoicPracticeStore.ts',
    ],
    integrationPoints: [
      'AssessmentStore (read recent scores)',
      'CrisisPlanStore (check warning signs)',
      'AnalyticsService (track safety interventions)',
    ],
    performanceImpact: 'Safety check <50ms',
  },

  validationSteps: {
    philosopherReview: true,  // Validate Stoic accuracy
    crisisReview: true,       // Validate safety for vulnerable users
    complianceReview: true,   // Validate encryption/privacy
  },

  nonNegotiables: {
    mustPreserve: [
      'Crisis detection thresholds (PHQ≥15/20, GAD≥15)',
      '<200ms crisis response time',
      'AES-256 encryption for personal reflections',
    ],
    mustValidate: [
      'Stoic accuracy (not pop psychology)',
      'Safety for GAD≥15 users',
      'Privacy protection (no PHI in analytics)',
    ],
    mustTest: [
      'Safety intervention works (GAD≥15 blocks premeditatio)',
      'Opt-out pathway functional',
      'Time-boxing triggers at 120s',
      'Analytics events validated (no PHI)',
    ],
  },
};
```

**Validation Checklist**:
- [ ] Philosopher agent invoked for all Stoic content changes
- [ ] Crisis agent consulted for premeditatio safety design
- [ ] Compliance agent validates encryption/analytics
- [ ] Agent hierarchy respected (crisis > compliance > philosopher)
- [ ] L3-Complex handoffs used for domain-critical work
- [ ] All validation gates defined for Phase 2/3
- [ ] Non-negotiables documented for each agent

---

## 9. Testing & Validation Integration

**Status**: 🟡 **MEDIUM CHANGES - NEW TESTS + PRESERVE CRITICAL**

### 9.1 Existing Test Suites (Preserve)

**Test Structure** (`/app/__tests__/`):
```
/app/__tests__/
  ├─ clinical/          // PHQ-9/GAD-7 scoring (PRESERVE 100%)
  ├─ crisis/            // Crisis detection (PRESERVE 100%)
  ├─ performance/       // 60fps, <200ms (PRESERVE 100%)
  ├─ security/          // Encryption (PRESERVE 100%)
  ├─ compliance/        // HIPAA/privacy (PRESERVE 100%)
  ├─ integration/       // System integration (UPDATE)
  └─ unit/              // Component tests (UPDATE)
```

**Critical Tests That Must Pass** (no regression):
```typescript
// 1. Clinical scoring accuracy
describe('PHQ-9 Scoring', () => {
  it('calculates all 27 possible scores correctly', () => {
    // MUST PASS - unchanged
  });

  it('detects suicidal ideation (Q9 > 0)', () => {
    // MUST PASS - unchanged
  });
});

// 2. Crisis performance
describe('Crisis Detection Performance', () => {
  it('detects crisis in <200ms', () => {
    // MUST PASS - unchanged
  });

  it('shows crisis resources in <3s', () => {
    // MUST PASS - unchanged
  });
});

// 3. Breathing circle performance
describe('Breathing Circle', () => {
  it('maintains 60fps for 60 seconds', () => {
    // MUST PASS - unchanged (but run with Stoic midday flow)
  });
});

// 4. Encryption validation
describe('Storage Encryption', () => {
  it('encrypts all PHI with AES-256', () => {
    // MUST PASS - updated to include Stoic data
  });
});
```

### 9.2 New Stoic Test Suites

#### A. Stoic Store Tests
```typescript
// Location: /app/__tests__/unit/stoic-practice-store.test.ts (NEW)

describe('StoicPracticeStore', () => {
  describe('Principle Progression', () => {
    it('records principle practice correctly', () => {
      const store = useStoicPracticeStore.getState();
      store.recordPrinciplePractice('principle_1');

      expect(store.principleProgress['principle_1'].practiceDays).toBe(1);
      expect(store.principleProgress['principle_1'].applicationInstances).toBe(1);
    });

    it('tracks principle engagement over 7 days', () => {
      // Test guided progression model
    });

    it('allows user to choose when to advance principle', () => {
      // Test prohairesis preservation
    });
  });

  describe('Virtue Tracking', () => {
    it('records virtue instance with all required fields', () => {
      const store = useStoicPracticeStore.getState();
      const instance: VirtueInstance = {
        id: uuid(),
        virtue: 'wisdom',
        context: 'Paused before reacting',
        domain: 'work',
        principleApplied: 'principle_2',
        timestamp: new Date(),
      };

      store.recordVirtueInstance('wisdom', instance);
      expect(store.virtueTracking.wisdom).toContainEqual(instance);
    });

    it('records virtue challenge with required self-compassion', () => {
      // Test balanced examination (Critical Issue #2)
    });

    it('prevents virtue tracking without self-compassion field', () => {
      // Validate non-negotiable requirement
    });
  });

  describe('Developmental Stage', () => {
    it('calculates stage metrics correctly', () => {
      // Test 4 metrics: consistency, integration, autonomy, reflection
    });

    it('suggests stage transition after meeting criteria', () => {
      // User must still choose to advance
    });

    it('preserves prohairesis (user decides stage advancement)', () => {
      // Algorithm suggests, user decides
    });
  });

  describe('Domain Applications', () => {
    it('tracks practice across work/relationships/adversity', () => {
      // Test domain progress tracking
    });

    it('maps virtues to domains correctly', () => {
      // Test M:N relationship
    });
  });

  describe('Performance', () => {
    it('records principle practice in <50ms', async () => {
      const start = performance.now();
      store.recordPrinciplePractice('principle_1');
      const end = performance.now();

      expect(end - start).toBeLessThan(50);
    });

    it('checks stage transition in <100ms', async () => {
      // Test complex calculation performance
    });
  });

  describe('Persistence', () => {
    it('saves to SecureStore correctly', async () => {
      await store.saveToStorage();
      const stored = await SecureStore.getItemAsync('@stoic_practice_store_v1');
      expect(stored).toBeTruthy();
    });

    it('loads from SecureStore correctly', async () => {
      await store.loadFromStorage();
      expect(store.developmentalStage).toBeDefined();
    });

    it('encrypts personal reflections', async () => {
      // Validate AES-256 encryption
    });
  });
});
```

#### B. Premeditatio Safety Tests
```typescript
// Location: /app/__tests__/clinical/premeditatio-safety.test.ts (NEW)

describe('Premeditatio Malorum Safety', () => {
  describe('Safety Checks', () => {
    it('blocks premeditatio for users with PHQ-9 ≥15', () => {
      const mockAssessment = { type: 'PHQ9', score: 18 };
      const safety = checkPremeditationSafety(mockAssessment);

      expect(safety.allowed).toBe(false);
      expect(safety.alternative).toContain('gratitude');
    });

    it('blocks premeditatio for users with GAD-7 ≥15', () => {
      const mockAssessment = { type: 'GAD7', score: 17 };
      const safety = checkPremeditationSafety(mockAssessment);

      expect(safety.allowed).toBe(false);
      expect(safety.alternative).toBeTruthy();
    });

    it('allows premeditatio for users with low scores', () => {
      const mockAssessment = { type: 'PHQ9', score: 8 };
      const safety = checkPremeditationSafety(mockAssessment);

      expect(safety.allowed).toBe(true);
    });
  });

  describe('Anxiety Detection', () => {
    it('detects anxiety markers in obstacle text', () => {
      const anxiousText = 'What if everything goes wrong? I'm terrified this will be a disaster.';
      const detected = detectAnxietyMarkers(anxiousText);

      expect(detected).toBe(true);
    });

    it('offers opt-out when anxiety detected', () => {
      // Test intervention pathway
    });
  });

  describe('Time-Boxing', () => {
    it('flags rumination if >120 seconds spent', () => {
      const timeSpent = 135000; // 135 seconds
      const flagged = shouldFlagRumination(timeSpent);

      expect(flagged).toBe(true);
    });

    it('offers alternative practice after time-boxing trigger', () => {
      // Test intervention pathway
    });
  });

  describe('Philosopher Validation', () => {
    it('aligns with classical Stoic practice (Seneca, Marcus Aurelius)', () => {
      // Requires philosopher agent review - manual validation
      // This is a documentation test, not automated
    });

    it('is not catastrophizing or rumination', () => {
      // Validate through linguistic analysis + time limits
    });
  });
});
```

#### C. Stoic Analytics Privacy Tests
```typescript
// Location: /app/__tests__/compliance/stoic-analytics-privacy.test.ts (NEW)

describe('Stoic Analytics Privacy', () => {
  describe('Principle Engagement Events', () => {
    it('contains no PHI', async () => {
      const event: PrincipleEngagementEvent = {
        eventType: 'principle_engagement',
        timestamp: Date.now(),
        principleId: 'principle_1',
        engagementType: 'practice',
        practiceDays: 7,
        developmentalStage: 'fragmented',
        stageTransition: false,
        sessionId: uuid(),
        userId: null,
      };

      const isValid = await AnalyticsPrivacyEngine.validatePrivacyProtection(event);
      expect(isValid).toBe(true);
    });

    it('uses bucketed practice days (not exact counts)', () => {
      const event = createPrincipleEvent({ practiceDays: 8 });
      expect(event.practiceDays).toBe('7-14'); // Bucketed
    });
  });

  describe('Virtue Practice Events', () => {
    it('contains no personal context', () => {
      const event: VirtuePracticeEvent = {
        eventType: 'virtue_practice',
        timestamp: Date.now(),
        virtue: 'wisdom',
        practiceDomain: 'work',
        practiceType: 'instance',
        weeklyFrequency: '3-7',
        sessionId: uuid(),
        userId: null,
      };

      // Should NOT contain:
      expect(event).not.toHaveProperty('context');
      expect(event).not.toHaveProperty('situation');
      expect(event).not.toHaveProperty('userName');
    });
  });

  describe('Differential Privacy', () => {
    it('applies Laplace noise (ε=0.1)', async () => {
      const severityBuckets = { moderate: 10, severe: 5 };
      const noised = await AnalyticsPrivacyEngine.applyDifferentialPrivacy(severityBuckets);

      // Buckets should be slightly different (noised)
      expect(noised.moderate).not.toBe(10);
      expect(Math.abs(noised.moderate - 10)).toBeLessThan(5); // Reasonable noise
    });
  });

  describe('k-Anonymity', () => {
    it('enforces k≥5 for group queries', async () => {
      const smallGroup = [createEvent(), createEvent()]; // Only 2 events
      const enforced = await AnalyticsPrivacyEngine.enforceKAnonymity(smallGroup);

      expect(enforced).toEqual([]); // Filtered out (k<5)
    });
  });
});
```

#### D. Stoic Flow Integration Tests
```typescript
// Location: /app/__tests__/integration/stoic-flow-integration.test.ts (NEW)

describe('Stoic Flow Integration', () => {
  describe('Morning Flow', () => {
    it('completes full morning flow with Stoic data', async () => {
      // Navigate through all 7 screens
      // Verify StoicMorningFlowData populated
    });

    it('integrates with AssessmentStore for premeditatio safety', async () => {
      // Mock high PHQ-9 score
      // Verify premeditatio blocked
      // Verify gratitude alternative offered
    });

    it('records principle practice after completion', async () => {
      // Complete morning flow
      // Verify StoicPracticeStore updated
    });
  });

  describe('Midday Flow', () => {
    it('maintains 60fps breathing circle with Stoic content', async () => {
      // CRITICAL: No performance regression
      // Run with new Stoic prompts (control check, reappraisal)
      expect(breathingCircleFPS).toBeGreaterThanOrEqual(60);
    });

    it('tracks intention progress from morning', async () => {
      // Complete morning flow with intention
      // Start midday flow
      // Verify intention shown in progress screen
    });
  });

  describe('Evening Flow', () => {
    it('requires self-compassion screen completion', async () => {
      // Navigate evening flow
      // Skip self-compassion screen
      // Verify cannot complete flow (REQUIRED screen)
    });

    it('balances virtue instances + challenges (Seneca examination)', async () => {
      // Record both successes and struggles
      // Verify balanced tracking (not performative)
    });
  });

  describe('Cross-Flow Integration', () => {
    it('maintains context across morning → midday → evening', async () => {
      // Morning intention → Midday progress check → Evening review
      // Verify data flows correctly
    });

    it('updates developmental stage based on practice patterns', async () => {
      // Simulate 30 days of consistent practice
      // Verify stage transition suggestion
    });
  });
});
```

#### E. Educational Module Tests
```typescript
// Location: /app/__tests__/integration/educational-module.test.ts (NEW)

describe('Educational Modules', () => {
  describe('Module Unlocking', () => {
    it('unlocks module after 3 days of practice', () => {
      // Simulate 3 days of principle practice
      // Verify module unlocked
    });

    it('allows user to request module earlier', () => {
      // Test prohairesis (user agency)
      // User can always request module, even on Day 1
    });
  });

  describe('Module Content', () => {
    it('loads module in <500ms', async () => {
      const start = performance.now();
      await loadModule('principle_1');
      const end = performance.now();

      expect(end - start).toBeLessThan(500);
    });

    it('parses markdown content in <300ms', async () => {
      // Test content rendering performance
    });
  });

  describe('Module Progress', () => {
    it('tracks time spent per module', () => {
      // Test module engagement tracking
    });

    it('records module completion', () => {
      // Verify progress persisted to store
    });
  });

  describe('Philosopher Validation', () => {
    it('contains accurate classical citations', () => {
      // MANUAL: Philosopher agent review required
      // Marcus Aurelius, Epictetus, Seneca quotes accurate
    });

    it('aligns with authentic Stoic philosophy', () => {
      // MANUAL: Philosopher agent review required
      // Not pop psychology or self-help
    });
  });
});
```

### 9.3 Test Execution Strategy

**CI/CD Integration**:
```yaml
# Location: .github/workflows/stoic-tests.yml (NEW)

name: Stoic Mindfulness Tests

on: [push, pull_request]

jobs:
  critical-tests:
    name: Critical Tests (Must Pass)
    runs-on: ubuntu-latest
    steps:
      - name: Run clinical tests
        run: npm run test:clinical -- --passWithNoTests
        # PHQ-9/GAD-7 scoring MUST pass

      - name: Run crisis performance tests
        run: npm run test:crisis -- --passWithNoTests
        # <200ms detection MUST pass

      - name: Run encryption tests
        run: npm run test:encryption -- --passWithNoTests
        # AES-256 encryption MUST pass

  stoic-tests:
    name: Stoic Feature Tests
    runs-on: ubuntu-latest
    needs: critical-tests  # Only run if critical tests pass
    steps:
      - name: Run Stoic store tests
        run: npm run test:stoic-store -- --passWithNoTests

      - name: Run premeditatio safety tests
        run: npm run test:premeditatio -- --passWithNoTests

      - name: Run Stoic analytics privacy tests
        run: npm run test:stoic-analytics -- --passWithNoTests

      - name: Run Stoic flow integration tests
        run: npm run test:stoic-integration -- --passWithNoTests

  performance-tests:
    name: Performance Validation
    runs-on: ubuntu-latest
    needs: stoic-tests
    steps:
      - name: Breathing circle performance
        run: npm run test:breathing-performance -- --passWithNoTests
        # 60fps MUST be maintained

      - name: Stoic store performance
        run: npm run test:stoic-performance -- --passWithNoTests
        # <50ms state updates
```

**Manual Validation Checklist**:
```typescript
// For features requiring domain expert review:

interface ManualValidationChecklist {
  philosopherReview: {
    dataModels: '✅ COMPLETED (9.5/10)',
    flowContent: '⏳ PENDING Phase 2',
    educationalModules: '⏳ PENDING Phase 3',
    classicalCitations: '⏳ PENDING Phase 3',
  },

  crisisReview: {
    premeditationSafety: '⏳ PENDING Phase 2',
    assessmentIntegration: '⏳ PENDING Phase 2',
    emergencyAccessPreserved: '✅ DESIGN VALIDATED',
  },

  complianceReview: {
    storageEncryption: '⏳ PENDING Phase 2',
    analyticsPrivacy: '⏳ PENDING Phase 2',
    cloudBackupConsent: '✅ DESIGN VALIDATED',
  },

  accessibilityReview: {
    screenReaderSupport: '⏳ PENDING Phase 2',
    wcagCompliance: '⏳ PENDING Phase 2',
    cognitiveAccessibility: '⏳ PENDING Phase 2',
  },
}
```

**Validation Checklist**:
- [ ] All critical tests passing (clinical, crisis, encryption)
- [ ] New Stoic store tests created and passing
- [ ] Premeditatio safety tests created and passing
- [ ] Stoic analytics privacy tests created and passing
- [ ] Stoic flow integration tests created and passing
- [ ] Educational module tests created
- [ ] Performance tests updated (no regression)
- [ ] CI/CD pipeline configured for Stoic tests
- [ ] Manual validation checklist defined for domain experts
- [ ] Philosopher review gates defined for Phase 2/3

---

## 10. Migration Considerations

**Status**: ✅ **COMPLETE - SCENARIO 1 CONFIRMED**

### 10.1 Migration Scenario

**Confirmed**: Scenario 1 (No Users - Clean Deployment)

From `MBCT-to-Stoic-Migration-Strategy.md`:
```
Production User Count: 0 users, 0 check-ins
Migration Required: NO
Deployment Strategy: Clean slate
```

**Integration Impact**: No migration code needed, but architecture documented for future reference.

### 10.2 Future Migration Considerations (Reference Only)

**If future users need migration (unlikely)**:
```typescript
// Location: /src/services/migration/MBCTToStoicMigration.ts (REFERENCE ONLY)

// Field mapping examples:
interface MigrationFieldMapping {
  // MBCT → Stoic
  values: 'Map to intention (virtue-based)',
  bodyScan: 'Direct transfer (keep body awareness)',
  physicalMetrics: 'Direct transfer (unchanged)',
  emotions: 'Map to embodiment data',
  thoughts: 'Map to learning (react vs. respond)',
  dayReview: 'Map to review (virtue-focused)',
  pleasantUnpleasant: 'Map to preferred/dispreferred indifferents',
}

// Migration would preserve:
// - All assessment history (PHQ-9/GAD-7)
// - All crisis plan data
// - All subscription/IAP data
// - MBCT flow history (archived, not deleted)
```

**Integration Points for Future Migration**:
```typescript
// If migration ever needed:
interface FutureMigrationIntegration {
  storage: {
    mbctData: 'Archive to cloud, keep local for 30 days',
    stoicData: 'Initialize new stores',
    rollbackWindow: '30 days',
  },

  analytics: {
    mbctEvents: 'Continue tracking separately',
    stoicEvents: 'Start new event stream',
    userJourneyTracking: 'Track MBCT→Stoic transition',
  },

  userExperience: {
    migrationNotification: 'Explain change proactively',
    onboardingRefresh: 'Re-introduce Stoic concepts',
    optionalTutorial: 'Walkthrough of new features',
  },
}
```

**Validation Checklist**:
- [ ] Scenario 1 confirmed (0 users, clean deployment)
- [ ] Migration documentation complete (reference only)
- [ ] Future migration architecture documented
- [ ] No migration code needed for Phase 2
- [ ] Rollback capability documented (30-day window)

---

## Conclusion

This Integration Points Documentation defines how Stoic Mindfulness data structures and flows integrate with Being's existing systems. Key principles:

1. **Safety First**: Crisis detection, performance guarantees, and encryption are sacrosanct
2. **Domain Authority**: Philosopher, crisis, and compliance agents have validation gates
3. **Privacy-Preserving**: All analytics maintain differential privacy and k-anonymity
4. **Performance-Conscious**: All new operations have defined performance requirements
5. **Migration-Aware**: Clean deployment for FEAT-45, but future migration path documented

**Next Steps**:
1. Day 9: Draft comprehensive architecture document
2. Day 10: Lock architecture with domain agent approval
3. Phase 2: Begin refactoring with integration points as guide

**Status**: Draft - Ready for Review
**Last Updated**: 2025-10-19
**Owner**: FEAT-45 Implementation Team
**Validators**: Philosopher, Crisis, Compliance, Performance Agents
