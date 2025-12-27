# MAINT-132: DRY Investigation - Learn & Check-in Flow Components

**Date**: 2025-12-27
**Status**: Investigation Complete
**Work Item**: MAINT-132 - DRY: Investigate generalizing Learn-tab practice components for cross-flow reuse

---

## Executive Summary

This investigation analyzed the current state of shared components across:
1. **Learn-tab practices** (`src/features/learn/practices/shared/`)
2. **Check-in flows** (`src/features/practices/{morning,midday,evening}/`)
3. **Flow-level shared components** (`src/features/practices/shared/`)

### Key Finding

The Learn-tab has a **well-designed DRY architecture** that is NOT directly applicable to check-in flows due to **fundamental design differences**. However, several **targeted opportunities** exist for improving code reuse.

---

## Current State Analysis

### 1. Learn-Tab Shared Components (`src/features/learn/practices/shared/`)

**Highly DRY - Phase 2 Migration Complete**

| Component | Purpose | Current Usage | Cross-Flow Reusability |
|-----------|---------|---------------|------------------------|
| `PracticeScreenLayout` | SafeAreaView + header + scroll | 3 Learn screens | ❌ Not applicable |
| `PracticeScreenHeader` | Back button + title + progress | 3 Learn screens | ❌ Not applicable |
| `PracticeToggleButton` | Begin/Pause/Resume button | 3 Learn screens | ⚠️ Limited |
| `PracticeInstructions` | Fade-in/out instructions | 3 Learn screens | ⚠️ Limited |
| `useTimerPractice` | Timer state management | 3 Learn screens | ⚠️ Limited |
| `usePracticeCompletion` | Completion flow + quotes | 3 Learn screens | ❌ Not applicable |
| `useInstructionsFade` | Animation logic | 3 Learn screens | ⚠️ Limited |
| `sharedPracticeStyles` | Common styles | 3 Learn screens | ❌ Not applicable |
| `practiceCommon.ts` | Barrel exports | 3 Learn screens | ❌ Not applicable |

### 2. Flow-Level Shared Components (`src/features/practices/shared/`)

**Already Shared Across Flows**

| Component | Purpose | Usage | Notes |
|-----------|---------|-------|-------|
| `Timer` | Countdown with pause/resume | Morning, Midday, Evening | ✅ Well-designed, themeable |
| `BreathingCircle` | 60fps breathing animation | Morning, Midday, Evening, Learn | ✅ Configurable pattern |
| `FlowProgressIndicator` | Progress bar in header | Morning, Midday, Evening | ✅ Extracted in INFRA-135 |
| `ResumeSessionModal` | Session resumption | Morning, Midday, Evening | ✅ Shared (FEAT-23) |
| `FlowProgress` | Step progress display | Placeholder | ❌ Unfinished |
| `BodyAreaGrid` | Body scan areas | Learn, Morning | ✅ Working |
| `ProgressiveBodyScanList` | Guided body scan | Learn | ✅ Learn-specific |

### 3. Check-in Flow Screens Analysis

**Morning Flow** (6 screens):
- GratitudeScreen, IntentionScreen, PreparationScreen, PrincipleFocusScreen, PhysicalGroundingScreen, MorningCompletionScreen

**Midday Flow** (4 screens):
- PauseAcknowledgeScreen, RealityCheckScreen, VirtueResponseScreen, CompassionateCloseScreen

**Evening Flow** (6 screens):
- BreathingScreen, GratitudeScreen, VirtueReflectionScreen, SelfCompassionScreen, TomorrowScreen, SleepTransitionScreen

---

## Why Learn Components Can't Generalize to Check-in Flows

### Fundamental Design Differences

| Aspect | Learn-Tab Practices | Check-in Flows |
|--------|---------------------|----------------|
| **Purpose** | Educational, standalone | Reflective journaling, flow-based |
| **Navigation** | Screen → Completion | Screen → Screen → ... → Completion |
| **Data Model** | Single completion event | Multi-field per-screen data |
| **Timer Use** | Always present, central | Optional (some screens have timers) |
| **Layout** | Standardized (timer + button) | Highly varied (inputs, cards, selections) |
| **State** | Local (timer + completion) | Cross-screen persistence (session resumption) |
| **Header** | Custom (progress counter) | Flow navigator header |
| **Theming** | "learn" theme only | morning/midday/evening themes |

### Specific Component Analysis

#### `PracticeScreenLayout`
- **Learn**: Wraps all practice screens with consistent SafeAreaView + header + scroll
- **Check-in**: Each screen has unique layout needs (KeyboardAvoidingView, fixed buttons, etc.)
- **Verdict**: ❌ Not reusable - layouts are fundamentally different

#### `PracticeToggleButton`
- **Learn**: Begin/Pause/Resume for timer-based practices
- **Check-in**: Only 2-3 screens use timers (BreathingScreen, PauseAcknowledgeScreen)
- **Verdict**: ⚠️ Could be used, but check-in flows use `Timer` component's built-in controls

#### `usePracticeCompletion`
- **Learn**: Tracks completion, shows quote, increments practice count
- **Check-in**: Multi-screen flow, completion handled by navigator
- **Verdict**: ❌ Not applicable - different completion paradigm

---

## Identified DRY Opportunities

### HIGH Priority - Immediate Value

#### 1. **Screen Pattern Styles** - New Shared Stylesheet
**Problem**: Check-in screens duplicate ~50-80 lines of similar styles each
**Opportunity**: Extract common check-in screen patterns

```typescript
// Proposed: src/features/practices/shared/styles/flowScreenStyles.ts
export const flowScreenStyles = StyleSheet.create({
  // Container patterns
  screenContainer: { flex: 1, backgroundColor: colorSystem.base.white },
  scrollView: { flex: 1 },
  contentContainer: { padding: spacing[20], paddingBottom: spacing[40] },

  // Header patterns
  screenHeader: { marginBottom: spacing[24] },
  screenTitle: { fontSize: typography.headline2.size, fontWeight: 'bold', marginBottom: spacing[8] },
  screenSubtitle: { fontSize: typography.bodyRegular.size, color: colorSystem.gray[600] },

  // Input section patterns
  inputSection: { marginBottom: spacing[24] },
  inputLabel: { fontSize: typography.bodyLarge.size, fontWeight: '600', marginBottom: spacing[8] },
  inputHelper: { fontSize: typography.bodySmall.size, color: colorSystem.gray[600], marginBottom: spacing[12] },
  textInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: borderRadius.medium, padding: spacing[12], minHeight: 80 },

  // Quote section patterns
  quoteSection: { padding: spacing[16], backgroundColor: '#f9f9f9', borderRadius: borderRadius.medium, borderLeftWidth: 4 },
  quoteText: { fontSize: typography.bodySmall.size, fontStyle: 'italic', color: colorSystem.gray[600], lineHeight: 20 },

  // Continue button patterns
  continueButton: { padding: spacing[16], borderRadius: borderRadius.medium, alignItems: 'center', marginTop: spacing[12] },
  continueButtonDisabled: { backgroundColor: colorSystem.gray[300] },
  continueButtonText: { fontSize: typography.bodyLarge.size, fontWeight: '600', color: colorSystem.base.white },
});
```

**Estimated Impact**: ~400-500 lines saved across 16 screens

#### 2. **Back Button Component** - Simple Extraction
**Problem**: 8+ screens have identical back button implementation
**Opportunity**: Create `FlowBackButton` component

```typescript
// Proposed: src/features/practices/shared/components/FlowBackButton.tsx
interface FlowBackButtonProps {
  onPress: () => void;
  flowType: 'morning' | 'midday' | 'evening';
  testID?: string;
}

export const FlowBackButton: React.FC<FlowBackButtonProps> = ({ onPress, flowType, testID }) => (
  <TouchableOpacity
    style={styles.backButton}
    onPress={onPress}
    testID={testID}
    accessibilityLabel="Go back"
  >
    <Text style={[styles.backButtonText, { color: getTheme(flowType).primary }]}>← Back</Text>
  </TouchableOpacity>
);
```

**Estimated Impact**: ~80 lines saved, improved consistency

#### 3. **Education Toggle Component** - Pattern Extraction
**Problem**: Multiple screens have collapsible education/Stoic wisdom sections
**Opportunity**: Create `EducationToggle` component

**Screens using this pattern**:
- GratitudeScreen (Morning)
- IntentionScreen (Morning)

```typescript
// Proposed: src/features/practices/shared/components/EducationToggle.tsx
interface EducationToggleProps {
  title: string;
  content: string;
  flowType: 'morning' | 'midday' | 'evening';
  testID?: string;
}
```

**Estimated Impact**: ~100 lines saved, consistent education pattern

### MEDIUM Priority - Good Value

#### 4. **Themed Continue Button** - Generalization
**Problem**: Every screen has a continue button with flow-specific theming
**Opportunity**: Create `FlowContinueButton` that accepts theme and disabled state

```typescript
// Proposed enhancement to AccessibleButton or new FlowContinueButton
interface FlowContinueButtonProps {
  onPress: () => void;
  disabled?: boolean;
  flowType: 'morning' | 'midday' | 'evening';
  label?: string; // Default: "Continue"
  testID?: string;
}
```

**Note**: `AccessibleButton` exists but doesn't handle flow theming well

#### 5. **Input Section Pattern** - Compound Component
**Problem**: Many screens have label + helper text + TextInput pattern
**Opportunity**: Create `FlowInputSection` compound component

```typescript
// Proposed: src/features/practices/shared/components/FlowInputSection.tsx
interface FlowInputSectionProps {
  label: string;
  helperText?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  flowType: 'morning' | 'midday' | 'evening';
  testID?: string;
}
```

### LOW Priority - Nice to Have

#### 6. **Quote Section Component**
**Problem**: Multiple screens show Stoic quotes with consistent styling
**Opportunity**: Create `StoicQuote` component

#### 7. **Screen Header Component**
**Problem**: Title + subtitle + helper text pattern repeated
**Opportunity**: Create `FlowScreenHeader` component

---

## NOT Recommended for Generalization

### 1. Learn-tab `PracticeScreenLayout`
- Check-in flows have unique layout needs per screen
- Would require too many props to be useful
- Current screen-specific layouts are appropriate

### 2. Learn-tab `usePracticeCompletion`
- Check-in flows don't show quotes after each screen
- Flow completion is handled at navigator level
- Different tracking needs (session vs. practice count)

### 3. Learn-tab `PracticeInstructions` fade behavior
- Only 2-3 check-in screens have instructions that should fade
- Those screens already use Timer's built-in features
- Overkill for current needs

### 4. Moving Learn components to flow-level shared
- Learn-tab DRY is optimized for its use case
- Generalizing would make it less optimal for Learn tab
- Keep them separate, extract only what's truly shared

---

## Implementation Recommendations

### Phase 1: Quick Wins (S effort)
1. Extract `flowScreenStyles.ts` shared stylesheet
2. Create `FlowBackButton` component
3. Update 2-3 screens as proof of concept

### Phase 2: Patterns (M effort)
1. Create `EducationToggle` component
2. Create `FlowContinueButton` with theming
3. Migrate remaining screens

### Phase 3: Compound Components (M-L effort)
1. Create `FlowInputSection` component
2. Create `FlowScreenHeader` component
3. Create `StoicQuote` component

---

## File Location Recommendations

```
src/features/practices/shared/
├── components/
│   ├── BreathingCircle.tsx          # Existing
│   ├── Timer.tsx                     # Existing
│   ├── FlowProgressIndicator.tsx     # Existing
│   ├── ResumeSessionModal.tsx        # Existing
│   ├── FlowBackButton.tsx            # NEW
│   ├── FlowContinueButton.tsx        # NEW
│   ├── EducationToggle.tsx           # NEW
│   ├── FlowInputSection.tsx          # NEW
│   ├── FlowScreenHeader.tsx          # NEW
│   ├── StoicQuote.tsx                # NEW
│   └── index.ts                      # Updated
├── styles/
│   └── flowScreenStyles.ts           # NEW
└── hooks/
    ├── useFlowSessionResumption.ts   # Existing
    └── index.ts                      # Existing
```

---

## Conclusion

The Learn-tab shared components represent a **mature DRY architecture** specifically designed for timer-based educational practices. They should **NOT** be generalized for check-in flows because:

1. Different paradigms (standalone practice vs. multi-screen journey)
2. Different data models (completion event vs. session persistence)
3. Different UI patterns (timer-centric vs. input-centric)

Instead, the check-in flows would benefit from:
1. **Shared styles** for consistent patterns
2. **Small, focused components** (back button, continue button, input section)
3. **Keeping layout flexibility** at the screen level

The existing `Timer` and `BreathingCircle` components are already shared appropriately and don't need changes.

---

## Related Work Items

- **MAINT-78**: Timer DRY refactoring (completed) - established pattern
- **INFRA-135**: FlowProgressIndicator extraction (completed)
- **FEAT-23**: Session resumption (completed) - shared hook
- **Potential new**: MAINT-XXX: Extract flow screen shared styles
- **Potential new**: MAINT-XXX: Create FlowBackButton component
