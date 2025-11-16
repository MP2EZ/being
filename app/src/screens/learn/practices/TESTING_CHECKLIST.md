# Practice Screens Testing Checklist
**FEAT-81**: Interactive Practice Screens - Quality Assurance

## Pre-Testing Setup

```bash
# 1. Install dependencies
cd app && npm install

# 2. Run TypeScript type check
npm run typecheck

# 3. Start development server
npm start

# 4. Run on iOS simulator or Android emulator
```

---

## Critical Bug Fixes (Items 6, 9, 10)

### ✅ Test 1: Timer Pause/Resume Functionality
**Issue**: Timer jumps ahead when resumed (Items 6, 10)

**Test Steps**:
1. Navigate to: Learn → Any Module → Body Scan Practice
2. Tap "Begin Practice"
3. Wait until timer shows 4:30 remaining
4. Tap "Pause"
5. Wait 15 seconds (real time)
6. Tap "Resume"

**Expected**: Timer resumes at 4:30 (not 4:15 or earlier)
**Files**: `Timer.tsx:102-124`

---

### ✅ Test 2: Breathing Circle Animation
**Issue**: Circle remains static when practice starts (Item 9)

**Test Steps**:
1. Navigate to: Learn → Module 1 → 3-Minute Breathing Space
2. Observe static teal circle
3. Tap "Begin Practice"

**Expected**: Circle immediately begins smooth 4s expand/4s contract animation
**Files**: `BreathingCircle.tsx:147-152`

---

## Body Scan Refinements (Items 1-7)

### ✅ Test 3: Current Focus Card Removal
**Issue**: Redundant "Current Focus" card above area list (Item 1)

**Test Steps**:
1. Navigate to: Learn → Module 1 → Body Scan Practice
2. Observe screen layout before starting

**Expected**:
- NO "Current Focus:" card visible
- Only the progressive body area list
**Files**: `ProgressiveBodyScanList.tsx:38-53` (removed)

---

### ✅ Test 4: Body Part Naming
**Issue**: "Legs & Thighs" is anatomically redundant (Item 2)

**Test Steps**:
1. Navigate to: Learn → Module 1 → Body Scan Practice
2. Check body area list

**Expected**: Shows "Upper Legs & Lower Legs" (not "Legs & Thighs")
**Files**: `BodyAreaGrid.tsx:33`, `BodyScanScreen.tsx:65`

---

### ✅ Test 5: Progress Indicators
**Issue**: Radio buttons unnecessary (Item 3)

**Test Steps**:
1. Navigate to: Learn → Module 1 → Body Scan Practice
2. Tap "Begin Practice"
3. Observe area list as practice progresses

**Expected**:
- Completed areas: Green with ✓ checkmark
- Current area: Purple highlight, NO dot indicator
- Upcoming areas: Plain text, NO gray dot
**Files**: `ProgressiveBodyScanList.tsx:62-66`

---

### ✅ Test 6: Purple Theme Consistency
**Issue**: Teal colors instead of purple (Item 4)

**Test Steps**:
1. Navigate to: Learn → Module 1 → Body Scan Practice
2. Check all UI elements

**Expected**: All accents use purple (#9B7EBD):
- Timer progress bar: purple
- "Begin Practice" button: purple
- Current area highlight: purple
- Border accents: purple
- NO teal (#40B5AD) anywhere

**Files**: `colors.ts:30-35`, `Timer.tsx:27,42`, `BodyScanScreen.tsx:216`

---

### ✅ Test 7: Duration Reduction
**Issue**: 8 minutes too long (Item 5)

**Test Steps**:
1. Navigate to: Learn → Module 1 → Body Scan Practice
2. Check timer display before starting

**Expected**: Shows "5:00" (not "8:00" or "9:00")
**Files**: `PracticeTab.tsx:70`

---

### ✅ Test 8: Instructions Fade Effect
**Issue**: Instructions should fade after start (Item 7)

**Test Steps**:
1. Navigate to: Learn → Module 1 → Body Scan Practice
2. Read instructions (visible before start)
3. Tap "Begin Practice"
4. Start timer

**Expected**:
- Instructions visible for 2 seconds
- Smooth 1-second fade out
- Instructions completely hidden by 3 seconds
- Reappear if you pause/restart

**Files**: `BodyScanScreen.tsx:99-115,210-227`

---

## Breathing Space Instructions (Item 8)

### ✅ Test 9: Breathing Practice Instructions Fade
**Issue**: Instructions should fade like body scan (Item 8)

**Test Steps**:
1. Navigate to: Learn → Module 1 → 3-Minute Breathing Space
2. Read instructions
3. Tap "Begin Practice"

**Expected**:
- "Find a comfortable position..." visible initially
- Fades out after 2 seconds
- Smooth 1-second animation
- Purple breathing circle remains

**Files**: `PracticeTimerScreen.tsx:65-81,161-178`

---

## Wrong Component Usage (Items 11, 14-20)

### ✅ Test 10: Resistance Body Check (Guided)
**Issue**: Shows breathing circle instead of guided body scan (Item 11)

**Test Steps**:
1. Navigate to: Learn → Module 2 → Resistance Body Check
2. Start practice

**Expected**:
- NO breathing circle
- Guidance card: "Current Focus: Head & Neck"
- "Next Area" button (user-controlled)
- Progress: "1 of 6"
- Resistance-focused prompts

**Files**: `GuidedBodyScanScreen.tsx`, `PracticeTab.tsx:85-92`

---

### ✅ Test 11-17: Virtue Practices (Reflection)
**Issue**: Show breathing circle instead of reflection space (Items 14-20)

**Test Practices** (all should use ReflectionTimerScreen):
- Virtue Practice: Wisdom (Item 14)
- Virtue Practice: Justice (Item 15)
- Virtue Practice: Courage (Item 16)
- Virtue Practice: Temperance (Item 17)
- Value Alignment Check (Item 18)
- Intention Review (Item 19)
- Gratitude Reflection (Item 20)

**Test Steps** (for each):
1. Navigate to practice
2. Start practice

**Expected**:
- NO breathing circle
- Meditation icon (🧘) as visual anchor
- Reflection prompt card (fades after 3s)
- "Begin Practice" button
- Timer with pause/resume
- Calm contemplation space

**Files**: `ReflectionTimerScreen.tsx`, `PracticeTab.tsx:74-83`

---

## UI Standardization (Items 12, 13, 21)

### ✅ Test 12: Practice List Card Borders
**Issue**: Weird offset border on practice cards (Item 21)

**Test Steps**:
1. Navigate to: Learn → Any Module → Practice Tab
2. Observe practice card styling

**Expected**:
- Clean 3px purple left-accent border
- NO shadow offset
- NO gray border
- White background
- Consistent with prompt/guidance cards

**Files**: `PracticeTab.tsx:280-287`

---

### ✅ Test 13: Back Button Consistency
**Issue**: All back buttons should be upper-left (Item 13)

**Test Steps**:
1. Check ALL practice screens:
   - PracticeTimerScreen
   - ReflectionTimerScreen
   - BodyScanScreen
   - GuidedBodyScanScreen
   - SortingPracticeScreen

**Expected**: All have identical back button:
- Position: Upper-left in header
- Icon: ← (left arrow)
- Size: 40x40pt touch target
- Color: Purple (#9B7EBD)

**Files**: All practice screen files (consistent)

---

## Distinct Exercise Types (Item 22)

### ✅ Test 14: Exercise Type Differentiation
**Issue**: Exercises should look distinct based on type (Item 22)

**Test Steps**:
1. Try one practice of each type:
   - **Breathing**: 3-Minute Breathing Space → animated circle
   - **Reflection**: Virtue Practice → meditation icon, prompt, no circle
   - **Body Scan (timed)**: Body Scan Practice → auto-advancing areas
   - **Body Scan (guided)**: Resistance Body Check → manual "Next" button
   - **Sorting**: Control vs Influence → card sorting UI

**Expected**: Each type has visually distinct UI appropriate to its purpose
**Documentation**: `DESIGN_PATTERNS.md`

---

## Component Integration Tests

### ✅ Test 15: Timer Component (Shared)
**Screens Using**: All except SortingPracticeScreen, GuidedBodyScanScreen

**Test**:
1. Start any timed practice
2. Verify:
   - Purple progress bar fills smoothly
   - Time counts down correctly (mm:ss format)
   - Pause/Resume works
   - Completion triggers correctly

**Files**: `Timer.tsx`

---

### ✅ Test 16: BreathingCircle Component
**Screens Using**: PracticeTimerScreen only

**Test**:
1. Start breathing practice
2. Verify:
   - 60fps smooth animation
   - 4s expand, 4s contract rhythm
   - Purple theme (#9B7EBD)
   - Stops when paused
   - Resumes when unpaused

**Files**: `BreathingCircle.tsx`

---

### ✅ Test 17: ProgressiveBodyScanList Component
**Screens Using**: BodyScanScreen, GuidedBodyScanScreen

**Test**:
1. Start body scan (either type)
2. Verify:
   - 6 areas listed
   - Current area highlighted in purple
   - Completed areas show green checkmark
   - Smooth transitions
   - Accessible labels

**Files**: `ProgressiveBodyScanList.tsx`

---

### ✅ Test 18: PracticeCompletionScreen
**Screens Using**: All practice screens

**Test**:
1. Complete any practice
2. Verify:
   - Philosopher-validated Stoic quote appears
   - Quote attribution (Marcus Aurelius, etc.)
   - "Continue" and "Return" buttons
   - Purple theme
   - Increments practice count

**Files**: `PracticeCompletionScreen.tsx`

---

## Navigation & Routing Tests

### ✅ Test 19: Practice Type Routing
**Test Practice Types**:
```typescript
'guided-timer' → PracticeTimerScreen
'reflection' → ReflectionTimerScreen
'body-scan' → BodyScanScreen
'guided-body-scan' → GuidedBodyScanScreen
'sorting' → SortingPracticeScreen
```

**Test Steps**:
1. Create test practice for each type
2. Verify correct screen loads
3. Check props are passed correctly

**Files**: `PracticeTab.tsx:41-93`, `CleanRootNavigator.tsx:205-301`

---

### ✅ Test 20: Navigation Gestures
**Test Steps**:
1. Start any practice
2. Try to swipe down to dismiss

**Expected**: Swipe gesture DISABLED during practice (prevents accidental exit)
**Files**: `CleanRootNavigator.tsx` (gestureEnabled: false)

---

## TypeScript & Type Safety

### ✅ Test 21: Type Compilation
```bash
npm run typecheck
```

**Expected**: No TypeScript errors in:
- `education.ts` (PracticeType includes all 5 types)
- `CleanRootNavigator.tsx` (RootStackParamList complete)
- All practice screen props

**Files**: `education.ts:29`, `CleanRootNavigator.tsx:36-70`

---

## Accessibility Tests

### ✅ Test 22: Screen Reader Support
**Test Steps** (iOS VoiceOver or Android TalkBack):
1. Enable screen reader
2. Navigate through practice
3. Verify:
   - All buttons have labels
   - Timer announces time remaining
   - Area changes announced
   - Instructions are readable
   - Completion is announced

**Expected**: Full accessibility compliance (WCAG AA)

---

### ✅ Test 23: Touch Target Sizes
**Test Steps**:
1. Check all interactive elements
2. Measure touch targets

**Expected**: All buttons ≥44x44pt (WCAG AA minimum)
**Files**: All styles (minHeight/minWidth: 44)

---

### ✅ Test 24: Color Contrast
**Test Steps**:
1. Check text on purple backgrounds
2. Check purple on white
3. Use contrast checker tool

**Expected**:
- Purple (#9B7EBD) on white: sufficient contrast for accent/UI
- All text meets WCAG AA (4.5:1 minimum)

**Files**: `colors.ts`

---

## Performance Tests

### ✅ Test 25: Breathing Circle Performance
**Test Steps**:
1. Start breathing practice
2. Open React DevTools Profiler
3. Record 30 seconds

**Expected**:
- Consistent 60fps
- No dropped frames
- No memory leaks
- Smooth on low-end devices

**Files**: `BreathingCircle.tsx` (useNativeDriver: true)

---

### ✅ Test 26: Fade Animation Performance
**Test Steps**:
1. Start practice with instructions
2. Watch fade animation

**Expected**:
- Smooth 1-second fade
- No jank or stutter
- Native driver optimized

**Files**: All screens using Animated.timing with useNativeDriver

---

## Edge Cases & Error Handling

### ✅ Test 27: Practice with Missing Quote
**Test Steps**:
1. Create practice with invalid practiceId
2. Complete practice

**Expected**: Throws clear error: "Missing quote for practiceId: xxx"
**Files**: All completion screen handlers

---

### ✅ Test 28: Background/Foreground Transitions
**Test Steps**:
1. Start timed practice
2. Background app (home button)
3. Wait 30 seconds
4. Return to app

**Expected**:
- Timer maintains correct time (deterministic)
- Animations restart correctly
- No crash or freeze

**Files**: `Timer.tsx` (timestamp-based, not interval-based)

---

### ✅ Test 29: Rapid Navigation
**Test Steps**:
1. Start practice
2. Immediately tap back
3. Start again
4. Repeat 5x quickly

**Expected**:
- No crashes
- Clean state reset each time
- Animations cancel/restart properly

**Files**: All useEffect cleanup functions

---

## Platform-Specific Tests

### ✅ Test 30: iOS Testing
- [ ] iPhone SE (small screen)
- [ ] iPhone 14 Pro (notch)
- [ ] iPad (tablet layout)
- [ ] iOS VoiceOver
- [ ] Dark mode (if supported)

---

### ✅ Test 31: Android Testing
- [ ] Small screen (5.5")
- [ ] Large screen (6.7")
- [ ] Android TalkBack
- [ ] Different Android versions (11+)

---

## Regression Testing

### ✅ Test 32: Existing Practices Still Work
**Test Steps**:
1. Test practices that were NOT changed:
   - Morning check-in body scan (different screen)
   - Sorting practices in Module 3
   - Any practices outside Learn module

**Expected**: No regressions, all still functional

---

## Final Checklist

Before marking FEAT-81 complete:

- [ ] All 22 user feedback items addressed
- [ ] TypeScript compiles without errors
- [ ] All practice types route correctly
- [ ] Purple theme consistent everywhere
- [ ] Animations smooth (60fps)
- [ ] Accessibility tested
- [ ] iOS & Android tested
- [ ] Edge cases handled
- [ ] Documentation complete
- [ ] Code reviewed

---

## Bug Reporting Template

If you find issues:

```markdown
**Test**: [Test number and name]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Steps**: [How to reproduce]
**Screen**: [Which practice screen]
**Platform**: [iOS/Android version]
**Files**: [Relevant files if known]
```

---

## Automated Testing Commands

```bash
# TypeScript type checking
npm run typecheck

# Unit tests (if available)
npm test

# Performance profiling
npm run perf:breathing  # If script exists
npm run perf:crisis     # Verify no regressions
```

---

**Test Coverage**: 22/22 user feedback items + 10 integration tests + 7 edge cases = **39 total test scenarios**

**Estimated Testing Time**:
- Critical bugs: 15 minutes
- Body scan refinements: 20 minutes
- Component integration: 30 minutes
- Navigation & routing: 15 minutes
- Accessibility: 20 minutes
- Platform-specific: 30 minutes per platform
**Total**: ~2.5 hours thorough testing

---

**Last Updated**: 2025-11-14 (FEAT-81 completion)
**Maintained by**: QA Team
**Questions?**: See DESIGN_PATTERNS.md for component selection guidance
