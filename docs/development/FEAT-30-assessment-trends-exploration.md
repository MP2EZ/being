# FEAT-30 "Assessment Trends" — Codebase Exploration Report

**Status**: Planning phase  
**Date**: 2026-05-29  
**Scope**: Visual trend charts of PHQ-9/GAD-7 scores over time in Being React Native app

---

## Executive Summary

The Being app has **substantial existing infrastructure** for assessment storage, scoring, and visualization. A **trends feature is partially complete** — historical data is retained, and a basic wellness trends component exists but is minimal. The main gaps are:
- Limited trend visualization (only last 6 data points shown as dots)
- No interactive/detailed charts
- No charting library in dependencies
- No data export/PDF capability

---

## 1. Assessment Results Storage & Data Shape

### Store Location
**File**: `app/src/features/assessment/stores/assessmentStore.ts`

### Key Data Structures

#### AssessmentSession (Top-level history record)
```typescript
export interface AssessmentSession {
  id: string;                              // Timestamped ID
  type: AssessmentType;                    // 'phq9' | 'gad7'
  progress: AssessmentProgress;
  result?: PHQ9Result | GAD7Result;        // Only if completed
  context: AssessmentContext;              // 'standalone' | 'onboarding' | 'checkin'
}
```

#### AssessmentProgress (Metadata & answers)
```typescript
export interface AssessmentProgress {
  type: AssessmentType;
  currentQuestionIndex: number;
  totalQuestions: number;
  startedAt: number;                       // UNIX timestamp (ms) — KEY FOR TRENDS
  answers: AssessmentAnswer[];
  isComplete: boolean;
}
```

#### PHQ-9 Result
```typescript
export interface PHQ9Result {
  totalScore: number;                      // 0-27
  severity: 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';
  isCrisis: boolean;                       // totalScore >= 20 OR suicidalIdeation
  suicidalIdeation: boolean;               // PHQ-9 question 9 response > 0
  completedAt: number;                     // Timestamp (ms)
  answers: AssessmentAnswer[];             // All 9 Q/A pairs
}
```

#### GAD-7 Result
```typescript
export interface GAD7Result {
  totalScore: number;                      // 0-21
  severity: 'minimal' | 'mild' | 'moderate' | 'severe';
  isCrisis: boolean;                       // totalScore >= 15
  completedAt: number;                     // Timestamp (ms)
  answers: AssessmentAnswer[];             // All 7 Q/A pairs
}
```

### Store State: History Retention
```typescript
completedAssessments: AssessmentSession[];              // UNBOUNDED — all history
getAssessmentHistory(type?: AssessmentType): AssessmentSession[];
getLastResult(type: AssessmentType): PHQ9Result | GAD7Result | null;
```

**Key insight**: The `completedAssessments` array is **never pruned** — assessment store persists full history indefinitely to encrypted storage.

---

## 2. Encryption at Rest

### Architecture (INFRA-144)
Assessment data is encrypted with **AES-256-GCM** in a hybrid model:

```
Ciphertext Layer:     AsyncStorage (React Native persistent storage)
  └─ Key: `assessment_async_assessment_store_blob`
  └─ Value: Binary AES-256-GCM ciphertext
  └─ Max: 256KB per blob

Master Key Layer:     Platform Keychain
  ├─ iOS: Keychain (hardware-backed, biometric-enabled)
  ├─ Android: EncryptedSharedPreferences
  └─ Accessed via: expo-secure-store
```

### Code Flow
1. **Saving**: `SecureStorageService.storeWellnessBlob(blobKey, data, 'level_2_assessment_data')`
   - Encrypts data to ciphertext
   - Stores ciphertext in AsyncStorage
   - Master key held in Keychain

2. **Loading**: `SecureStorageService.retrieveWellnessBlob(blobKey, legacyKey, options)`
   - Retrieves ciphertext from AsyncStorage
   - Decrypts using master key from Keychain
   - Returns plaintext object

### Sensitivity Level
Assessment data is classified as `'level_2_assessment_data'`:
- High sensitivity (level 1 = crisis, level 2 = assessment, level 5 = general)
- **Never plaintext on disk**
- Automatic decryption on retrieval
- Access logged to audit trail
- 3-year retention (clinical liability protection)

**Migration note**: Legacy plaintext JSON (pre-INFRA-144) is migrated on first read via SecureStore fallback.

---

## 3. Scoring & Threshold Logic

### Scoring Service
**Location**: `assessmentStore.ts`, lines 188–263  
**Class**: `ClinicalScoringService`

#### PHQ-9 Scoring (0–27 scale)
```typescript
static calculatePHQ9Score(answers: AssessmentAnswer[]): PHQ9Result {
  const totalScore = answers.reduce((sum, a) => sum + a.response, 0);
  // Sum of 9 answers, each 0–3
  
  const severity = this.getPHQ9Severity(totalScore);
  // minimal: 0–4
  // mild: 5–9
  // moderate: 10–14
  // moderately_severe: 15–19
  // severe: 20–27
  
  const suicidalAnswer = phqAnswers.find(a => a.questionId === 'phq9_9');
  const suicidalIdeation = suicidalAnswer?.response > 0;
  
  const isCrisis = totalScore >= 20 || suicidalIdeation;  // Crisis at ≥20 OR Q9>0
  
  return { totalScore, severity, isCrisis, suicidalIdeation, completedAt, answers };
}
```

#### GAD-7 Scoring (0–21 scale)
```typescript
static calculateGAD7Score(answers: AssessmentAnswer[]): GAD7Result {
  const totalScore = answers.reduce((sum, a) => sum + a.response, 0);
  // Sum of 7 answers, each 0–3
  
  const severity = this.getGAD7Severity(totalScore);
  // minimal: 0–4
  // mild: 5–9
  // moderate: 10–14
  // severe: 15–21
  
  const isCrisis = totalScore >= 15;  // Crisis at ≥15
  
  return { totalScore, severity, isCrisis, completedAt, answers };
}
```

### Crisis Thresholds
**Location**: `app/src/features/assessment/types/index.ts`

```typescript
export const CRISIS_THRESHOLDS = {
  PHQ9_MODERATE_SEVERE_THRESHOLD: 15,   // Support floor (show guidance)
  PHQ9_SEVERE_THRESHOLD: 20,            // Intervention floor (alert + resources)
  PHQ9_CRISIS_SCORE: 15,                // Used for isCrisis boolean
  GAD7_CRISIS_SCORE: 15,                // Used for isCrisis boolean
  PHQ9_SUICIDAL_QUESTION_ID: 'phq9_9',  // Special handling for Q9
};
```

**Note**: Divergence in naming — "CRISIS_SCORE" (15) vs "SEVERE_THRESHOLD" (20). Both are pinned by test `/features/crisis/types/__tests__/crisis-thresholds.test.ts`.

### Validation
All scoring validated by Zod schemas in `/types/schemas.ts` with 100% accuracy enforcement:
- Severity matches score ranges
- Total score matches sum of answers
- Suicidal ideation flag matches Q9 response
- Crisis flag matches thresholds

---

## 4. Existing Result & History Display Screens

### Current: AssessmentResults.tsx
**Location**: `app/src/features/assessment/components/AssessmentResults.tsx` (682 lines)

**Features**:
- ✅ Single result display (score, severity, interpretation)
- ✅ Color-coded severity (minimal → severe)
- ✅ Therapeutic guidance based on score
- ✅ Professional resources for moderate+ scores
- ✅ Crisis banner + links (988, text 741741) for ≥15
- ✅ Summary grid (score, severity, date, question count)

**Limitations**:
- ❌ Shows only current result, no history
- ❌ No comparison to previous attempts
- ❌ No trend arrow or statistics
- ❌ No "view history" link

---

## 5. Existing: WellnessScreeningTrends Component (FEAT-28)

### Location
`app/src/features/insights/components/WellnessScreeningTrends.tsx` (402 lines)

### What It Does
Displays PHQ-9 & GAD-7 trends in the Insights Dashboard. **Integrated into FEAT-28 (basic insights).**

### Current Visualization
```
┌─ Wellness Screening Trends ──────────────────────┐
│ [Disclaimer: wellness screening, not diagnosis] │
├──────────────────────────────────────────────────┤
│ Mood Wellness Screening (PHQ-9)                  │
│                                          [Score] │
│ ●  ●  ●  ●  ●  ●  (last 6 assessments)          │
│ Most recent: moderately severe (Jan 15)         │
├──────────────────────────────────────────────────┤
│ Stress Wellness Screening (GAD-7)                │
│                                        [Score]   │
│ ●  ●  ●  ●  (last 4 assessments)                │
│ Most recent: moderate (Jan 10)                   │
└──────────────────────────────────────────────────┘
```

### Implementation Details
- **Data source**: `completedAssessments` from assessment store
- **Transformation** (InsightsScreen.tsx, lines 127–150):
  ```typescript
  const { phq9History, gad7History } = useMemo(() => {
    const phq9: { score: number; date: Date; severity: string }[] = [];
    const gad7: { score: number; date: Date; severity: string }[] = [];
    
    for (const session of completedAssessments) {
      if (!session.result) continue;
      const date = new Date(session.progress.startedAt);
      
      if (session.type === 'phq9') {
        phq9.push({
          score: session.result.totalScore,
          date,
          severity: session.result.severity,
        });
      } else if (session.type === 'gad7') {
        gad7.push({
          score: session.result.totalScore,
          date,
          severity: session.result.severity,
        });
      }
    }
    return { phq9History: phq9, gad7History: gad7 };
  }, [completedAssessments]);
  ```

### Current Limitations
1. **Hardcoded last 6** (line 161): `const displayHistory = history.slice(-6);`
2. **Static dots** — height = score, width = evenly spaced
3. **No interactivity** — tap anywhere does nothing
4. **No trend analysis** — no "improving/declining" text
5. **No date filtering** — always shows last N, not date range
6. **No statistics** — no min/max/avg/median shown

### Visualization Code
Manual SVG-like calculation (lines 184–188):
```typescript
const points = displayHistory.map((point, index) => {
  const x = padding + (index / Math.max(displayHistory.length - 1, 1)) * plotWidth;
  const y = padding + plotHeight - (point.score / maxScore) * plotHeight;
  return { x, y, score: point.score, date: point.date };
});
```

Each dot is a `View` with `marginBottom` set to position it vertically.

---

## 6. Charting & Visualization Infrastructure

### Charting Library Situation
**Status**: ❌ **No dedicated charting library installed**

**Available in dependencies**:
- ✅ `react-native-svg` (15.15.4) — SVG rendering
- ✅ `react-native-reanimated` (4.3.1) — Animations & gestures
- ❌ NO `react-native-chart-kit`
- ❌ NO `victory-native`
- ❌ NO `recharts` (web-only anyway)
- ❌ NO D3

### Existing Manual Visualizations
1. **WellnessScreeningTrends** — SVG-like dots
2. **PrincipleEngagementChart** (FEAT-45) — Flexbox bars + percentages
3. **DotCalendar** — CSS Grid-like colored dots

### Export/PDF Capability
**Status**: ❌ **None implemented**

- No `react-native-pdf` or PDF generation library
- No "Share" or "Export" buttons in insights/assessment screens
- Compliance modules (DataProtectionEngine, ConsentManager) handle GDPR data export but don't generate user-facing reports

---

## 7. Summary: What Exists vs. Missing

### ✅ What's Already Built

| Component | File | Status |
|-----------|------|--------|
| **History storage** | `assessmentStore.ts` | Full — unbounded `completedAssessments` array |
| **Timestamps** | `AssessmentProgress.startedAt` | Precise — UNIX ms, one per session |
| **Scoring** | `ClinicalScoringService` | 100% accurate, clinically validated |
| **Crisis thresholds** | `CRISIS_THRESHOLDS` | Pinned by test (PHQ ≥15 support, ≥20 intervention; GAD ≥15) |
| **Basic trends viz** | `WellnessScreeningTrends.tsx` | Partial — last 6 dots, no interaction |
| **Encryption** | `SecureStorageService` | AES-256-GCM, master key in Keychain |
| **Severity mapping** | Store + Zod schemas | Validated, clinically correct |
| **Results screen** | `AssessmentResults.tsx` | Shows single result, guidance, resources |

### ❌ What's Missing for FEAT-30

| Capability | Gap | Blocker |
|-----------|-----|---------|
| **Full history display** | Last 6 only | Need to show all assessments |
| **Interactive charts** | Static dots | Tap-to-detail, zoom, date filtering |
| **Trend analysis** | No computation | Can't say "improving" vs "stable" vs "worsening" |
| **Charting library** | None installed | Will need to add or use SVG primitives |
| **Statistics** | No min/max/avg | Can't show "your average is X" |
| **Date range filter** | No UI | Need week/month/all toggle |
| **Export/PDF** | Not built | Users can't share or print |

---

## 8. Data Available for Trends

The full assessment history lives in:

```typescript
useAssessmentStore() → completedAssessments: AssessmentSession[]
  ├─ PHQ-9 sessions
  │  ├─ id: string
  │  ├─ type: 'phq9'
  │  ├─ progress.startedAt: number (UNIX ms)
  │  └─ result
  │     ├─ totalScore: 0–27
  │     ├─ severity: 'minimal' | ... | 'severe'
  │     ├─ isCrisis: boolean
  │     ├─ suicidalIdeation: boolean
  │     └─ completedAt: number
  │
  └─ GAD-7 sessions
     ├─ id: string
     ├─ type: 'gad7'
     ├─ progress.startedAt: number (UNIX ms)
     └─ result
        ├─ totalScore: 0–21
        ├─ severity: 'minimal' | ... | 'severe'
        ├─ isCrisis: boolean
        └─ completedAt: number
```

**Ready for use**: All data is available; trends feature just needs to visualize it.

---

## 9. File Paths (Relative to `/app/src`)

```
features/assessment/
├── stores/assessmentStore.ts
│   ├─ useAssessmentStore() hook
│   ├─ ClinicalScoringService (lines 188–263)
│   └─ EncryptedAssessmentStorage (lines 104–179)
├── types/
│   ├─ index.ts (AssessmentSession, PHQ9Result, GAD7Result, CRISIS_THRESHOLDS)
│   ├─ scoring.ts (ScoreTrend, ScoreComparison types already defined!)
│   └─ schemas.ts (Zod validation, 100% accuracy)
└── components/
    └─ AssessmentResults.tsx (single result display)

features/insights/
├── screens/InsightsScreen.tsx (aggregates & transforms data)
└── components/
    ├─ WellnessScreeningTrends.tsx (CURRENT TRENDS — last 6 dots)
    ├─ PrincipleEngagementChart.tsx (Stoic principle bars)
    └─ DotCalendar.tsx (check-in calendar)

core/services/security/
└─ SecureStorageService.ts (AES-256-GCM encryption)

core/theme/
└─ index.ts (colorSystem, spacing, typography — reusable design tokens)
```

---

## 10. Recommendations for FEAT-30

### Phase 1: Enhance Existing Visualization (Low Risk, 1–2 days)
✅ Extend `WellnessScreeningTrends.tsx`:
- Remove hardcoded `slice(-6)` → show all history
- Add **time range tabs**: "Week", "Month", "All"
- Add **statistics**: "Min: X, Max: Y, Average: Z"
- Add **trend indicator**: ↑ (improved), ↓ (worsened), → (stable)

**No new dependencies needed.**

### Phase 2: Interactive Charts (Medium Effort, 3–5 days)
✅ Build enhanced component (e.g., `AdvancedAssessmentTrends.tsx`):
- Line or bar chart (using SVG + react-native-svg, or add `react-native-chart-kit`)
- **Tap-to-detail**: Tap a point → show modal with full result
- **Scrollable history**: Users can see 6+ months in one view
- **Threshold lines**: Show ≥15 (support) and ≥20 (intervention) zones

### Phase 3: Advanced (Optional, 2–3 days each)
- **CSV/PDF Export**: Format trends as table, save to device
- **Side-by-side view**: Compare PHQ-9 & GAD-7 on same timeline
- **Seasonal patterns**: Show which months tend to have higher scores
- **Predictive text**: "Based on recent pattern, expect..."

### Testing Strategy
- **Unit tests**: Trend calculation (improving/stable/declining logic)
- **Snapshot tests**: Chart renders correctly
- **Clinical accuracy**: Spot-check 5–10 calculated trends manually
- **Performance**: Test with 100+ assessments (no lag)
- **Accessibility**: Keyboard nav, screen reader support for charts

---

## 11. Clinical & Compliance Notes

### Required Compliance Labels (Non-Negotiable)
From legal review (hardcoded in `WellnessScreeningTrends.tsx`):

```
- PHQ-9 label: "Mood Wellness Screening (PHQ-9)" [NOT "Depression"]
- GAD-7 label: "Stress Wellness Screening (GAD-7)" [NOT "Anxiety"]
- Section title: "Wellness Screening Trends"
- Disclaimer: MUST appear ABOVE charts, non-dismissible
- Crisis ref: "Call or text 988" — must be linked
- Legal: "These are wellness screening tools for personal awareness,
          not clinical assessments or diagnoses"
```

### Scoring Accuracy (100% Required)
- ✅ All calculations tested in `/clinical/assessment-accuracy/comprehensive-scoring-validation.test.ts`
- ✅ Crisis thresholds pinned by `/features/crisis/types/__tests__/crisis-thresholds.test.ts`
- ⚠️ Changing thresholds will break tests — verify with clinical team first

### Data Retention & Privacy
- **Storage tier**: `level_2_assessment_data` (high sensitivity)
- **Encryption**: AES-256-GCM (master key in Keychain)
- **Retention**: 3 years (clinical liability)
- **Audit trail**: All access logged
- **No PII**: Only timestamps + scores, no name/email with results

---

## Conclusion

**FEAT-30 has strong foundations.**

The Being app **already stores all data needed** for robust trends:
- ✅ Full history (unbounded `completedAssessments` array)
- ✅ Precise timestamps (UNIX ms, `progress.startedAt`)
- ✅ Clinically accurate scores (ClinicalScoringService, 100% validated)
- ✅ Encrypted at rest (AES-256-GCM in AsyncStorage + Keychain)
- ✅ Basic visualization exists (WellnessScreeningTrends, but minimal)

**FEAT-30 needs to add:**
1. Enhanced visualization (show full history, not last 6)
2. Interactive elements (time range filter, tap-to-detail)
3. Trend analysis (improving/declining/stable indicators)
4. Statistics (min/max/avg/median)
5. Optional: Export (CSV/PDF)

**No major refactoring required.** Work incrementally on the visualization layer; the data & scoring layer is production-ready and heavily tested.

**Recommended approach**: Start with Phase 1 (extend existing component), then gauge user feedback before investing in charting libraries or advanced features.
