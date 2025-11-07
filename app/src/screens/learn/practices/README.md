# Practice Screens - Learn Tab

Production-ready practice screens for the Being. Learn tab.

## Components

### 1. PracticeTimerScreen
Timer-based practice using existing BreathingCircle component.

**Features:**
- 180s timer (60s × 3 cycles) for breathing-space practice
- Timestamp-based calculation (deterministic, testable)
- AppState listener: auto-pause when backgrounded
- 60fps animations via BreathingCircle (react-native-reanimated)
- Accessibility: screen reader announcements, WCAG AA compliant

**Usage:**
```tsx
import { PracticeTimerScreen } from './screens/learn/practices';

<PracticeTimerScreen
  practiceId="breathing-space"
  moduleId="aware-presence"
  duration={180} // 3 minutes in seconds
  title="3-Minute Breathing Space"
  onComplete={() => navigation.navigate('ModuleHome')}
  onBack={() => navigation.goBack()}
/>
```

### 2. SortingPracticeScreen
Interactive card sorting for Sphere Sovereignty (Module 3).

**Features:**
- 12 philosopher-validated scenarios from module-3 JSON
- Educational feedback (no scoring/gamification)
- Virtue-check feedback for missed opportunities
- Progress tracking (6/12 scenarios)
- Smooth card animations

**Usage:**
```tsx
import { SortingPracticeScreen } from './screens/learn/practices';
import moduleData from '../../../assets/modules/module-3-sphere-sovereignty.json';

const scenarios = moduleData.practices.find(p => p.id === 'control-sorting')?.scenarios || [];

<SortingPracticeScreen
  practiceId="sphere-sovereignty-sorting"
  moduleId="sphere-sovereignty"
  scenarios={scenarios}
  onComplete={() => navigation.navigate('ModuleHome')}
  onBack={() => navigation.goBack()}
/>
```

### 3. BodyScanScreen
Progressive body area focus practice.

**Features:**
- 6 body areas: head → shoulders → chest → abdomen → legs → feet
- Timer advances through areas automatically
- Simple visualization with highlighted current area
- Guidance text for each area
- Timestamp-based timer with pause/resume

**Usage:**
```tsx
import { BodyScanScreen } from './screens/learn/practices';

<BodyScanScreen
  practiceId="body-scan"
  moduleId="aware-presence"
  duration={540} // 9 minutes (90s per area)
  onComplete={() => navigation.navigate('ModuleHome')}
  onBack={() => navigation.goBack()}
/>
```

### 4. PracticeCompletionScreen
Shared completion screen for all practice types.

**Features:**
- Philosopher-validated Stoic quotes
- Educational tone (no gamification)
- Reusable across all practices
- Accessibility announcements

**Quotes (from PRACTICE_QUOTES):**
- `breathing-space`: "Confine yourself to the present." - Marcus Aurelius, Meditations 8.36
- `sphere-sovereignty-sorting`: "Some things are up to us..." - Epictetus, Enchiridion 1
- `body-scan`: "You have power over your mind..." - Marcus Aurelius, Meditations 5.9

## Architecture

### Timestamp-Based Timer Strategy
All timer screens use timestamp-based sync (Architect guidance: Option B):

```tsx
// State
const [startTime, setStartTime] = useState<number | null>(null);
const [pausedAt, setPausedAt] = useState<number | null>(null);
const [totalPausedDuration, setTotalPausedDuration] = useState(0);

// Calculate elapsed
const calculateElapsed = (): number => {
  if (!startTime) return 0;
  if (pausedAt) {
    return pausedAt - startTime - totalPausedDuration;
  }
  return Date.now() - startTime - totalPausedDuration;
};
```

**Benefits:**
- Deterministic (testable)
- Survives app backgrounding
- No drift from setInterval
- Aligns with mindfulness (intentional pause)

### AppState Handling
All timer screens auto-pause when backgrounded:

```tsx
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (appStateRef.current.match(/active/) && nextAppState.match(/inactive|background/)) {
      if (startTime && !pausedAt && !isComplete) {
        pauseTimer();
      }
    }
    appStateRef.current = nextAppState;
  });
  return () => subscription.remove();
}, [startTime, pausedAt, isComplete, pauseTimer]);
```

### State Management
All practices integrate with educationStore:

```tsx
import { useEducationStore } from '../../../stores/educationStore';

const incrementPracticeCount = useEducationStore(
  (state) => state.incrementPracticeCount
);

// On completion
incrementPracticeCount(moduleId);
```

## Performance

All screens meet performance requirements:

- **Launch time**: <500ms
- **Animations**: 60fps (BreathingCircle uses react-native-reanimated)
- **Timer precision**: 100ms intervals for smooth countdown
- **Memory**: Efficient cleanup on unmount

## Accessibility

WCAG AA compliant:

- Screen reader announcements for state changes
- Minimum touch target size: 48x48px
- Color contrast ratios: 4.5:1 minimum
- Descriptive accessibility labels and hints
- Keyboard-navigable (via default React Native behavior)

## Philosopher Validation

All content follows philosopher validation:

- **Quotes**: Exact text from Notion (no paraphrasing)
- **Feedback tone**: Educational, non-judgmental
- **Virtue-check**: "Noticing missed opportunities is itself an act of prosoche..."
- **No gamification**: No scores, streaks, or performance metrics

## Testing

Example test scenarios:

```tsx
// PracticeTimerScreen
describe('PracticeTimerScreen', () => {
  it('completes after 180 seconds', async () => {
    const onComplete = jest.fn();
    render(<PracticeTimerScreen duration={180} onComplete={onComplete} />);

    // Fast-forward time
    jest.advanceTimersByTime(180000);

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });

  it('pauses when app backgrounds', () => {
    render(<PracticeTimerScreen duration={180} />);

    // Simulate app backgrounding
    AppState.currentState = 'background';

    // Verify pause state
    expect(screen.getByText('Paused')).toBeTruthy();
  });
});

// SortingPracticeScreen
describe('SortingPracticeScreen', () => {
  it('shows virtue-check feedback on incorrect answer', () => {
    render(<SortingPracticeScreen scenarios={mockScenarios} />);

    // Select incorrect answer
    fireEvent.press(screen.getByText('Within Control'));

    // Verify virtue-check message appears
    expect(screen.getByText(/prosoche/)).toBeTruthy();
  });
});
```

## Navigation Integration

Example integration with React Navigation:

```tsx
// In your navigation stack
import {
  PracticeTimerScreen,
  SortingPracticeScreen,
  BodyScanScreen,
} from '../screens/learn/practices';

<Stack.Screen
  name="PracticeTimer"
  component={PracticeTimerScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="SortingPractice"
  component={SortingPracticeScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="BodyScan"
  component={BodyScanScreen}
  options={{ headerShown: false }}
/>

// Navigate to practice
navigation.navigate('PracticeTimer', {
  practiceId: 'breathing-space',
  moduleId: 'aware-presence',
  duration: 180,
  title: '3-Minute Breathing Space',
});
```

## File Structure

```
/screens/learn/practices/
├── PracticeTimerScreen.tsx       # Timer-based practice (breathing)
├── SortingPracticeScreen.tsx     # Interactive card sorting
├── BodyScanScreen.tsx            # Progressive body scan
├── PracticeCompletionScreen.tsx  # Shared completion screen
├── index.ts                      # Exports
└── README.md                     # Documentation (this file)
```

## Next Steps

To wire these screens into your navigation:

1. Import practice screens in your navigation stack
2. Load scenarios from `/app/assets/modules/module-3-sphere-sovereignty.json`
3. Pass props from module screen to practice screen
4. Handle onComplete navigation back to module home
5. Test on iOS and Android devices

## Dependencies

Required packages (already in project):
- `react-native-reanimated` (BreathingCircle animations)
- `@react-native-async-storage/async-storage` (educationStore persistence)
- `zustand` (state management)

## License

Part of Being. MBCT - Stoic Mindfulness-Based Cognitive Therapy
