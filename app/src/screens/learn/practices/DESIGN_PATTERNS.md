# Practice Exercise Design Patterns

**FEAT-81**: Interactive Practice Screens - Design System Documentation

## Overview

Being's Learn module supports 5 distinct practice screen types, each optimized for specific pedagogical goals. This guide helps determine which screen to use for new practices.

---

## Decision Tree

```
Is the practice interactive sorting/categorization?
├─ YES → SortingPracticeScreen
└─ NO → Does it involve breathing awareness?
    ├─ YES → PracticeTimerScreen (Guided Breathing)
    └─ NO → Does it involve body awareness?
        ├─ YES → Is it timed or self-paced?
        │   ├─ Timed (auto-advancing) → BodyScanScreen
        │   └─ Self-paced (user-controlled) → GuidedBodyScanScreen
        └─ NO → ReflectionTimerScreen (Contemplation/Writing)
```

---

## Screen Types

### 1. PracticeTimerScreen
**Use for**: Breathing-focused practices with visual guidance

**Characteristics**:
- Animated BreathingCircle component (60fps)
- Timer with pause/resume
- 4-4 breathing pattern (default)
- No output required from user
- Purple learn theme

**Components Reused**:
- `BreathingCircle` (shared/components)
- `Timer` (shared/components)
- `PracticeCompletionScreen`

**Example Practices**:
- 3-Minute Breathing Space
- Body & Breath Connection
- Grounding Breath Practice

**Practice Type**: `'guided-timer'`

**Key Props**:
```typescript
{
  practiceId: string;
  moduleId: ModuleId;
  duration: number;        // Seconds (default: 180)
  title: string;
}
```

---

### 2. ReflectionTimerScreen
**Use for**: Contemplation, journaling prompts, virtue practice exercises

**Characteristics**:
- NO breathing circle (contemplation space)
- Reflection prompt card (fades after 3s)
- Meditation icon (🧘) for visual anchor
- Timer with pause/resume
- No text input required (mental reflection)
- Purple learn theme

**Components Reused**:
- `Timer` (shared/components)
- `PracticeCompletionScreen`

**Example Practices**:
- Virtue Practice: Wisdom
- Virtue Practice: Justice
- Virtue Practice: Courage
- Virtue Practice: Temperance
- Daily Philosophical Reflection
- Value Alignment Check
- Gratitude Contemplation

**Practice Type**: `'reflection'`

**Key Props**:
```typescript
{
  practiceId: string;
  moduleId: ModuleId;
  duration: number;        // Seconds (default: 300)
  title: string;
  prompt?: string;         // Reflection question/prompt
}
```

**Design Rationale**: Reflection ≠ breathing. Users need calm space to think, not animated visuals. The 3-second prompt fade gives time to read, then clears the screen for mental focus.

---

### 3. BodyScanScreen
**Use for**: Timed, auto-advancing body awareness practices

**Characteristics**:
- ProgressiveBodyScanList component
- Auto-advances through 6 body areas
- Timer-based progression (duration / area count)
- Real-time guidance for current area
- Instructions fade after 2s
- Purple learn theme
- 5-minute default duration

**Components Reused**:
- `ProgressiveBodyScanList` (shared/components)
- `Timer` (shared/components)
- `PracticeCompletionScreen`

**Body Areas** (6 total):
1. Head & Neck
2. Shoulders & Chest
3. Upper Back & Lower Back
4. Abdomen & Hips
5. Upper Legs & Lower Legs
6. Feet

**Example Practices**:
- Progressive Body Scan
- Relaxation Body Scan

**Practice Type**: `'body-scan'`

**Key Props**:
```typescript
{
  practiceId: string;
  moduleId: ModuleId;
  duration: number;        // Total seconds (default: 300 = 5min)
}
```

**Design Rationale**: Therapeutic body scans benefit from gentle time pressure to prevent rumination. Auto-advancement ensures complete practice coverage without user decision fatigue.

---

### 4. GuidedBodyScanScreen
**Use for**: Self-paced body awareness, resistance/tension checks

**Characteristics**:
- ProgressiveBodyScanList component
- USER-controlled advancement ("Next Area" button)
- Resistance/tension-focused guidance
- No timer (complete at own pace)
- Current area guidance card
- Progress indicator (e.g., "2 of 6")
- Purple learn theme

**Components Reused**:
- `ProgressiveBodyScanList` (shared/components)
- `PracticeCompletionScreen`

**Example Practices**:
- Resistance Body Check
- Tension Awareness Scan
- Self-Compassion Body Scan

**Practice Type**: `'guided-body-scan'`

**Key Props**:
```typescript
{
  practiceId: string;
  moduleId: ModuleId;
  title: string;
}
```

**Design Rationale**: Checking for resistance/tension requires honest self-assessment without time pressure. Users advance when genuinely ready, promoting authenticity over speed.

---

### 5. SortingPracticeScreen
**Use for**: Interactive categorization exercises (Module 3: Sphere of Sovereignty)

**Characteristics**:
- Card-based scenarios
- Swipe or tap to categorize
- Immediate feedback
- Educational explanations
- Progress tracking
- Purple learn theme

**Example Practices**:
- Control vs. Influence Sorting (Module 3)

**Practice Type**: `'sorting'`

**Key Props**:
```typescript
{
  practiceId: string;
  moduleId: ModuleId;
  scenarios: SortingScenario[];
}
```

---

## Design Principles

### 1. **DRY Architecture**
All screens reuse shared components (`Timer`, `ProgressiveBodyScanList`, `PracticeCompletionScreen`) to maintain consistency and reduce code duplication.

### 2. **Calm, Elegant Minimalism**
- Clean 3px purple left-accent borders (no shadows)
- Ample whitespace
- Instructions fade after start (2-3s)
- No unnecessary UI elements during practice
- Consistent back button placement (upper-left)

### 3. **Purple Learn Theme**
All practice screens use `colorSystem.navigation.learn` (#9B7EBD) for:
- Buttons
- Progress indicators
- Accent borders
- Active states

Theme consistency reinforces that all practices belong to the Learn section.

### 4. **Accessibility First**
- WCAG AA compliance
- Screen reader announcements
- 44pt minimum touch targets
- High contrast text
- Pause/resume capability for all timed practices

### 5. **Philosopher-Validated Content**
- Stoic quotes on completion (Marcus Aurelius, Epictetus, Seneca)
- Non-judgmental language ("notice" not "relax")
- Educational tone (no gamification)

---

## Fade Animation Pattern

All practice screens use consistent instruction fade behavior:

```typescript
// Animated value
const instructionsOpacity = useRef(new Animated.Value(1)).current;

// Fade logic
useEffect(() => {
  if (isTimerActive && elapsedTime === 0) {
    const fadeTimeout = setTimeout(() => {
      Animated.timing(instructionsOpacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }, 2000); // 2-3s delay

    return () => clearTimeout(fadeTimeout);
  } else if (!isTimerActive && elapsedTime === 0) {
    instructionsOpacity.setValue(1);
  }
}, [isTimerActive, elapsedTime, instructionsOpacity]);
```

**Rationale**: Instructions visible on load give context. Fading after start clears visual clutter, allowing focus on the practice itself.

---

## Adding New Practice Types

### Step 1: Determine Screen Type
Use decision tree above. If none fit, consider:
- Is it similar enough to reuse an existing screen?
- Or does it need a new screen type?

### Step 2: Update TypeScript Types
```typescript
// src/types/education.ts
export type PracticeType =
  | 'guided-timer'
  | 'sorting'
  | 'reflection'
  | 'body-scan'
  | 'guided-body-scan'
  | 'your-new-type'; // Add here
```

### Step 3: Register Navigation Route
```typescript
// src/navigation/CleanRootNavigator.tsx

// 1. Import component
import { YourNewScreen } from '../screens/learn/practices';

// 2. Add to RootStackParamList
export type RootStackParamList = {
  // ...
  YourNewScreen: {
    practiceId: string;
    moduleId: ModuleId;
    // ... your props
  };
};

// 3. Add Stack.Screen
<Stack.Screen
  name="YourNewScreen"
  options={{
    headerShown: false,
    presentation: 'modal',
    gestureEnabled: false,
  }}
>
  {({ navigation, route }) => (
    <YourNewScreen
      {...route.params}
      onComplete={() => navigation.goBack()}
      onBack={() => navigation.goBack()}
    />
  )}
</Stack.Screen>
```

### Step 4: Add Routing Logic
```typescript
// src/screens/learn/tabs/PracticeTab.tsx

// In handlePracticePress switch statement:
case 'your-new-type':
  navigation.navigate('YourNewScreen', {
    practiceId: practice.id,
    moduleId,
    // ... your params
  });
  break;

// In getPracticeTypeLabel:
case 'your-new-type':
  return 'Your Display Label';

// In getPracticeIcon:
case 'your-new-type':
  return '🎯'; // Your emoji
```

### Step 5: Export Component
```typescript
// src/screens/learn/practices/index.ts
export { default as YourNewScreen } from './YourNewScreen';
```

---

## Testing Checklist

See `TESTING_CHECKLIST.md` for comprehensive testing procedures.

---

## Related Documentation

- **Component Specs**: `README.md`
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`
- **Testing Guide**: `TESTING_CHECKLIST.md` (you're about to see this!)
- **Shared Components**: `/src/flows/shared/components/`

---

**Last Updated**: 2025-11-14 (FEAT-81 completion)
**Maintained by**: Development Team
**Questions?**: See CONTRIBUTING.md for validation protocols
