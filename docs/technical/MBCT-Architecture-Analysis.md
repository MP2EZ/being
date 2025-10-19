# MBCT Architecture Analysis: Complete Codebase Map
*Generated: 2025-10-19 | For: FEAT-45 Stoic Mindfulness Pivot*

## Executive Summary

The Being app is a **production-ready clinical-grade React Native application** delivering **MBCT-based daily check-in flows** (morning, midday, evening). After comprehensive exploration of **169 TypeScript files** across 12 major domains, the architecture reveals:

**Key Finding**: MBCT is **modular but tightly integrated** with the app's core systems. The refactor from MBCT → Stoic Mindfulness is significant but manageable, with clear separation between:
- **Therapeutic content layer** (flow screens, prompts, exercises) - HIGH impact changes
- **Data model layer** (interfaces, stores) - MEDIUM impact changes
- **Integration layer** (crisis detection, persistence, navigation) - LOW-MEDIUM impact changes

**Refactoring Complexity**: **MEDIUM-HIGH** (not trivial)
- ~40 files need philosophical content changes
- ~20 files need data model updates
- ~25 files need integration adjustments
- ~84 files are orthogonal (security, compliance, performance)

---

## 1. Data Models (TypeScript Interfaces)

### Core Flow Data Models (`/src/types/flows.ts`)

The app uses **three distinct check-in types** with specific data structures:

#### Morning Flow Data (`MorningFlowData`)
```typescript
{
  bodyScan?: BodyAreaData[];              // Physical sensations (10 body areas)
  emotions?: EmotionData[];               // Emotional states (intensity 1-10)
  thoughts?: ThoughtData[];               // Thought patterns (helpful/unhelpful/neutral)
  physicalMetrics?: PhysicalMetricsData;  // Energy, sleep, comfort (1-10 scales)
  values?: ValuesData[];                  // Personal values & intentions
  dream?: DreamData;                      // Dream content & significance
}
```

**MBCT Specifics**:
- Body scan: Present-moment awareness, non-judgmental observation
- Emotions: Emotional regulation training
- Thoughts: Cognitive distortion identification
- Physical metrics: Replaces anxiety scale per clinical safety

#### Midday Flow Data (`MiddayFlowData`)
```typescript
{
  awareness?: AwarenessData;      // Present moment + body awareness + emotional state
  gathering?: GatheringData;      // Focus/clarity/intention (1-10 scales)
  expanding?: ExpandingData;      // Perspective, gratitude, connection
}
```

**MBCT Specifics**: 3-Minute Breathing Space intervention
- 60 seconds per screen (180 seconds total, exact)
- Mindful awareness practice
- Emotional expansion exercises

#### Evening Flow Data (`EveningFlowData`)
```typescript
{
  dayReview?: DayReviewData;              // Highlights, challenges, learnings
  pleasantUnpleasant?: PleasantUnpleasantData;  // Event categorization + coping
  thoughtPatterns?: ThoughtPatternsData;  // Thought frequency & helpfulness
  tomorrowPrep?: TomorrowPrepData;        // Intentions, priorities, self-care
}
```

**MBCT Specifics**:
- Reflection on daily experiences
- Emotional awareness through gratitude
- Preparation for next day mindfulness

### Supporting Data Models

All supporting models are located in `/src/types/flows.ts` lines 38-133:
- `BodyAreaData` (area, sensation, intensity 1-10)
- `EmotionData` (emotion, intensity, trigger)
- `ThoughtData` (thought, category, intensity, response)
- `PhysicalMetricsData` (energy, sleep, comfort)
- `ValuesData` (value, intention, priority)
- `FlowProgress` (tracking step progress)

---

## 2. State Management (Zustand Stores)

### Assessment Store (`/src/flows/assessment/stores/assessmentStore.ts`)

**Purpose**: Clinical-grade PHQ-9/GAD-7 assessment management with crisis detection

**Key Features**:
- 100% accurate scoring validation (PHQ-9: 0-27, GAD-7: 0-21)
- Crisis thresholds: PHQ-9 ≥20 (intervention), GAD-7 ≥15 (crisis)
- Real-time suicidal ideation detection (PHQ-9 Q9 > 0)
- Auto-save with encrypted storage
- Session recovery for interrupted assessments
- <200ms crisis response guarantee

**State Interface** (lines 334-357):
```typescript
{
  currentSession: AssessmentSession | null;
  currentQuestionIndex: number;
  answers: AssessmentAnswer[];
  completedAssessments: AssessmentSession[];
  currentResult: PHQ9Result | GAD7Result | null;
  crisisDetection: CrisisDetection | null;
  crisisIntervention: CrisisIntervention | null;
  autoSaveEnabled: boolean;
}
```

**Integration**: Assessment store communicates with:
- Crisis detection engine (triggers emergency response)
- Logging service (audit trail)
- Secure storage (encrypted persistence)

### Crisis Plan Store (`/src/stores/crisisPlanStore.ts`)

**Purpose**: Safety planning intervention based on Stanley-Brown model

**Data Structure** (PersonalizedCrisisPlan):
- Warning signs (personal observations + triggers)
- Internal coping strategies (with effectiveness ratings)
- Social contacts & distraction activities
- Professional contacts (therapist, psychiatrist, etc.)
- Emergency contacts (988, 911, crisis centers)
- Reasons for living
- Environment safety modifications

**Key Feature**: User consent + encryption required, no cloud sync without explicit consent

### Subscription Store (`/src/stores/subscriptionStore.ts`)

**Purpose**: IAP (In-App Purchase) subscription + feature access control

**Critical**: Crisis features are **HARDCODED to always be accessible** (line 419-421)

---

## 3. UI Components (Screens/Components) - MBCT Flow Hierarchy

### Morning Flow (6 screens, ~30 min)
Located: `/src/flows/morning/screens/`

| Screen | MBCT Purpose | Data Type | Duration |
|--------|-------------|-----------|----------|
| BodyScanScreen | Present-moment body awareness | BodyAreaData[] | ~5 min |
| EmotionRecognitionScreen | Emotional recognition & labeling | EmotionData[] | ~5 min |
| ThoughtObservationScreen | Thought pattern identification | ThoughtData[] | ~5 min |
| PhysicalMetricsScreen | Health baseline (energy, sleep, comfort) | PhysicalMetricsData | ~3 min |
| ValuesIntentionScreen | Values clarification + daily intention | ValuesData[] | ~5 min |
| DreamJournalScreen | Dream processing & emotional content | DreamData | ~2 min |

**Navigation**: Stack-based, linear progression with progress bar

### Midday Flow (3 screens, 180 seconds EXACT)
Located: `/src/flows/midday/screens/`

**MBCT Context**: 3-Minute Breathing Space (Segal et al. mindfulness intervention)

| Screen | Purpose | Duration | Auto-advance |
|--------|---------|----------|--------------|
| AwarenessScreen | Body scan in present moment | 60s | Yes |
| GatheringScreen | Breathing & anchor focus | 60s | Yes |
| ExpandingScreen | Expand awareness to whole body/space | 60s | Yes |

**Critical**: 60-second timing is clinically validated - cannot be changed without philosopher review

### Evening Flow (4 screens, ~20 min)
Located: `/src/flows/evening/screens/`

| Screen | MBCT Purpose | Data Type |
|--------|-------------|-----------|
| DayReviewScreen | Day highlights/challenges/learnings | DayReviewData |
| PleasantUnpleasantScreen | Event categorization + emotional response | PleasantUnpleasantData |
| ThoughtPatternsScreen | Thought frequency patterns | ThoughtPatternsData |
| TomorrowPrepScreen | Sleep preparation + intentions | TomorrowPrepData |

**Safety Feature**: Crisis support button always visible in header

### Shared Components (`/src/flows/shared/components/`)

| Component | Purpose | Usage |
|-----------|---------|-------|
| BreathingCircle | 60fps breathing animation for midday flow | Midday (critical for 60fps) |
| BodyAreaGrid | Body area selection UI | Morning flow |
| EmotionGrid | Emotion/feeling selection | Multiple flows |
| ThoughtBubbles | Thought display with categorization | Morning, Evening |
| ThoughtPatternGrid | Pattern frequency selection | Evening |
| Timer | Session countdown timer | Midday flow |
| SafetyButton | Crisis resource access | All flows (header) |
| FlowProgress | Progress tracking UI | All flows |
| NeedsGrid | Needs/values selection | Evening flow |

---

## 4. Persistence Layer (Supabase Integration)

### Supabase Service (`/src/services/supabase/SupabaseService.ts`)

**Architecture**:
- Anonymous authentication (no PII)
- Encrypted blob storage only (no PHI on server)
- Circuit breaker pattern for resilience
- Offline queue for failed syncs

**Data Flow**:
```
Local State (Zustand)
  ↓
Secure Storage (expo-secure-store)
  ↓
Cloud Backup (Supabase - encrypted blobs only)
```

**Check-in Data Handling**:
- Flow data collected locally → encrypted → stored in SecureStore
- Optional cloud backup via `CloudBackupService.ts`
- No automatic Supabase sync without user consent
- Analytics events (no PHI) sent separately

### Key Storage Keys:
- `@being/supabase/user_id` - Anonymous session ID
- `@being/supabase/offline_queue` - Failed sync queue
- Assessment store: `assessment_store_encrypted` (SecureStore)
- Crisis plan: `@crisis_plan_secure_v1` (SecureStore)

---

## 5. Integration Points - Where Flows Touch Other Systems

### 5.1 Crisis Integration (CRITICAL - MUST PRESERVE)

**Assessment → Crisis**:
1. User completes PHQ-9 assessment
2. `ClinicalScoringService.calculatePHQ9Score()` calculates result
3. If PHQ-9 ≥20 OR suicidal ideation detected:
   - `CrisisDetectionService.detectCrisis()` creates detection record
   - `CrisisDetectionService.triggerEmergencyResponse()` shows alert
   - Direct links: 988 (call), 741741 (SMS), 911 (emergency)

**Flow Data → Crisis** (INDIRECT):
- Physical metrics in morning flow tracked for risk patterns
- Thought patterns tracked for severity escalation
- No automatic crisis trigger from daily flows (must use assessment)

**Trigger Points**:
- PHQ≥15: Support recommended
- PHQ≥20: Intervention required
- GAD≥15: Crisis threshold
- Suicidal ideation: Immediate intervention (any response >0)

### 5.2 Assessment Integration

**Location**: `/src/flows/assessment/` (separate from daily flows)

**Trigger Points**:
- Onboarding screen shows PHQ-9/GAD-7
- Manual assessment from menu
- Can be triggered by daily flow if thresholds suggest need

**Assessment Flow**:
1. Introduction screen
2. Question sequence (9 for PHQ-9, 7 for GAD-7)
3. Progress tracking
4. Results + crisis detection
5. Auto-referral to CrisisResourcesScreen if triggered

### 5.3 Navigation Integration

**RootStackParamList** (`/src/navigation/CleanRootNavigator.tsx`):
```typescript
{
  Main: undefined;                    // Tab-based home
  MorningFlow: undefined;             // Modal flow
  MiddayFlow: undefined;              // Modal flow
  EveningFlow: undefined;             // Modal flow
  CrisisResources: {...};             // Crisis screen
  CrisisPlan: undefined;              // Safety planning
  Subscription: undefined;            // IAP UI
}
```

**Flow Trigger**: `CleanHomeScreen.tsx` (lines 36-53)
- Detects current time period
- Shows context-appropriate cards
- Navigates to `MorningFlow` | `MiddayFlow` | `EveningFlow`

### 5.4 Performance Integration

**Optimizations**:
- BreathingCircle: 60fps validation for midday flow
- Flow screens: Lazy loading
- Assessment store: Auto-save debounced to 1000ms
- Crisis detection: <200ms guaranteed response

**Monitoring**:
- `AssessmentFlowOptimizer.ts` - Assessment performance
- `CrisisPerformanceOptimizer.ts` - Crisis path performance
- `PerformanceMonitor.ts` - General monitoring

---

## 6. File Inventory Summary

**Total: 169 TypeScript/TSX files analyzed**

### By Refactoring Impact:

**HIGH IMPACT (Direct Changes): ~40 files**
- 13 flow screens (morning/midday/evening)
- 17 shared components
- 8 type definition files
- 2 navigation files

**MEDIUM IMPACT (Integration/Data): ~25 files**
- State stores (3 files)
- Services layer (partial)
- Assessment integration
- Analytics updates

**LOW IMPACT (Preserve As-Is): ~84 files**
- Security services (9 files)
- Compliance services (5 files)
- Crisis services (11 files - NO CHANGES)
- Performance services (8 files)
- Supabase/persistence (8 files)
- Tests (12+ files - update for new content)

---

## 7. Technical Constraints & Non-Negotiables

### MUST NOT CHANGE (Crisis Safety)
1. **Crisis detection thresholds**
   - PHQ-9 ≥20 = intervention
   - GAD-7 ≥15 = crisis
   - Suicidal ideation = Q9 > 0

2. **Crisis response time**
   - <200ms detection required
   - <3 second emergency access
   - 988/741741/911 links must work

3. **Breathing circle**
   - 60fps animation performance
   - 60-second exact duration for midday flow
   - Cannot be modified without performance validation

4. **Encryption**
   - AES-256 for clinical data
   - SecureStore for local storage
   - No unencrypted PHI transmission

5. **Data persistence**
   - Assessment data auto-saves after each answer
   - Crisis plan user-owned and encrypted
   - Session recovery capability required

### PHILOSOPHY REVIEW GATES
1. **All content changes** must pass philosopher validation
2. **Stoic principles accuracy** critical for credibility
3. **Virtue ethics alignment** required for all therapeutic language
4. **Marcus Aurelius/Epictetus references** must be accurate

---

## 8. Recommended Refactoring Sequence

### Phase 1: Foundation (Weeks 1-2) - CURRENT PHASE
1. ✅ Architecture analysis complete
2. **Design new Stoic data model**
   - New fields for virtue tracking
   - Dichotomy of control mappings
   - Stoic philosophy assessment
3. **Create Stoic types** (`/src/types/stoic.ts`)
4. **Lock architecture** before coding

### Phase 2: Content Migration (Weeks 3-7)
1. **Replace flow content** (morning, midday, evening)
2. **Update components** (shared components)
3. **Migrate data models** (extend FlowData interfaces)

### Phase 3: Integration (Weeks 8-11)
1. **Update navigation labels**
2. **Integrate new analytics**
3. **Update onboarding**

### Phase 4: Validation (Weeks 12-14)
1. **Philosopher validation**
2. **Crisis system validation**
3. **Testing & QA**

---

## 9. Data Flow Diagram

```
Being App Flow Architecture

┌─────────────────────────────────────┐
│   CleanHomeScreen (Home Tab)         │
│   - Detects current period           │
│   - Shows 3 check-in cards           │
└────┬────────────────┬────────────┬───┘
     │                │            │
     ├─Morning        ├─Midday     └─Evening
     │ (~30 min)      │ (3 min)      (~20 min)
     │                │
     ▼                ▼              ▼
┌──────────┐     ┌──────────┐  ┌──────────┐
│MorningFlow│    │MiddayFlow│  │Evening   │
│Navigator  │    │Navigator │  │Navigator │
└─────┬────┘    └────┬─────┘  └───┬──────┘
      │              │            │
   [6 screens]   [3 screens]   [4 screens]
      │              │            │
      ▼              ▼            ▼
   MorningFlowData  MiddayFlowData EveningFlowData
      │              │            │
      └──────────────┴────────────┘
             │
             ▼
    ┌─────────────────────┐
    │ Session Data        │
    │ collected locally   │
    └────┬────────────────┘
         │
         ├─→ [Zustand Store]
         │
         ├─→ [SecureStore - local encryption]
         │
         ├─→ [Optional: Cloud Backup via Supabase]
         │
         └─→ [Analytics Service - no PHI]


Assessment Integration (Triggered separately):
    CleanHomeScreen → AssessmentFlow
                         │
                         ▼
                    PHQ-9 or GAD-7
                         │
                    ┌────┴─────┐
                    │           │
                Score<Crisis  Score≥Crisis
                    │           │
                    │           ▼
                    │      CrisisDetection
                    │      ↓
                    │      CrisisResourcesScreen
                    │      (988, 741741, 911)
                    │
                    └──→ CrisisIntervention
                         Engine
```

---

## 10. Key Findings for Design Sprint

### What Transfers Easily (100%)
- ✅ Backend infrastructure (Supabase, auth, encryption)
- ✅ Crisis detection system (PHQ/GAD thresholds)
- ✅ Performance architecture (60fps, <200ms)
- ✅ Security & compliance (HIPAA, encryption)
- ✅ Subscription system (IAP)

### What Needs Refactoring (60-75%)
- ⚠️ Flow screens (13 files - MBCT → Stoic content)
- ⚠️ Shared components (17 files - therapeutic language)
- ⚠️ Data models (extend for Stoic fields)
- ⚠️ Navigation labels (screen titles)

### What Stays Unchanged
- 🔒 Crisis services (11 files)
- 🔒 Security services (9 files)
- 🔒 Compliance services (5 files)
- 🔒 Performance monitoring (8 files)

---

## Conclusion

**Architect's 86-file estimate was accurate.** We've identified:
- **38 core flow files** (screens + components + types)
- **~25 integration files** (state, services, analytics)
- **~20 supporting files** (navigation, tests, documentation)

**Refactoring is MEDIUM-HIGH complexity but achievable** because:
1. ✅ Content layer is modular (MBCT prompts → Stoic prompts)
2. ✅ Data models are extensible (add Stoic fields)
3. ✅ Crisis layer is isolated (preserve unchanged)
4. ✅ Architecture is well-documented

**Critical success factor**: Lock Stoic data model design in Week 1-2 before touching any code.

---

*Document created: 2025-10-19*
*Next: Design Sprint Plan*
*Phase: Week 1-2 Technical Design*
