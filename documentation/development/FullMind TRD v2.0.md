# TRD: FullMind - Technical Requirements Document v2.0

## React Native Implementation for Production App Stores

---

## Document Metadata

```yaml
document:
  type: TRD
  version: 2.0.0
  status: FINAL
  created: 2025-01-21
  product: FullMind
  platform: React Native (iOS/Android)
  implements: [PRD v1.2, DRD v1.3, Prototype v1.7, Design Library v1.1]
  
context:
  development_machine: Mac
  target_timeline: 8 weeks to app stores
  priority: Trust and authenticity for mental health
  approach: Simple foundation with upgrade paths
```

---

## Executive Summary

### Strategic Direction

**Mission**: Build a trustworthy, native mental health app that delivers comprehensive MBCT practice through React Native, achieving app store presence in 8 weeks while maintaining clinical integrity.

**Core Principle**: Start simple, stay faithful to proven prototype, build upgrade paths.

### Critical Decisions

1. **React Native over PWA**: Mental health apps require native credibility
2. **AsyncStorage over SQLite initially**: Simplicity for MVP, upgrade path clear
3. **Direct component port**: Your prototype UI is already validated
4. **No backend Phase 1**: Complete privacy, faster development
5. **Expo managed workflow**: Rapid iteration, easy deployment

### Success Metrics

- **Week 8**: Live in TestFlight and Play Store Beta
- **Day 30 Retention**: >40% (native baseline)
- **Check-in Completion**: >85% for started sessions
- **Assessment Accuracy**: 100% scoring correctness
- **Crisis Access**: <3 seconds from any screen

---

## Architecture Overview

### Technology Stack - Simplified & Focused

```yaml
core_stack:
  framework: React Native 0.73.0
  platform: Expo SDK 50
  language: TypeScript 5.3
  state: Zustand 4.5
  navigation: React Navigation 6.1
  
data_layer:
  primary: AsyncStorage (MVP)
  structure: JSON arrays in memory
  future: SQLite migration path ready
  export: JSON/CSV via expo-sharing
  
ui_implementation:
  components: Direct port from Design Library v1.1
  animations: React Native Reanimated 3
  gestures: React Native Gesture Handler 2
  styling: StyleSheet with theme system
  
native_features:
  notifications: expo-notifications
  biometrics: expo-local-authentication (Phase 2)
  haptics: expo-haptics
  sharing: expo-sharing
  
development:
  testing: Expo Go + physical devices
  building: EAS Build
  updates: EAS Update (CodePush alternative)
  monitoring: Sentry React Native
```

### System Architecture

```
┌─────────────────────────────────────────────┐
│            React Native App                 │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Screens/Flows  │  │   Components    │ │
│  │                 │  │  (from Design   │ │
│  │  - Onboarding   │  │   Library v1.1) │ │
│  │  - Check-ins    │  │                 │ │
│  │  - Assessments  │  │  - Button       │ │
│  │  - Crisis       │  │  - Slider       │ │
│  └────────┬────────┘  │  - MultiSelect  │ │
│           │            │  - TextArea     │ │
│  ┌────────▼────────┐  └─────────────────┘ │
│  │  Zustand Stores │                       │
│  │                 │                       │
│  │  - userStore    │                       │
│  │  - checkInStore │                       │
│  │  - assessmentStore                      │
│  └────────┬────────┘                       │
│           │                                │
│  ┌────────▼────────┐                       │
│  │  AsyncStorage   │                       │
│  │                 │                       │
│  │  Simple JSON    │                       │
│  │  persistence    │                       │
│  └─────────────────┘                       │
└─────────────────────────────────────────────┘
```

---

## Data Models & Storage Strategy

### Phase 1: Simple AsyncStorage Implementation

```typescript
// Core data models (stored as JSON)
interface AppData {
  user: UserProfile;
  checkIns: CheckIn[];
  assessments: Assessment[];
  crisisPlan: CrisisPlan | null;
  // Current session (not persisted)
  currentCheckIn?: Partial<CheckIn>;
}

interface UserProfile {
  id: string;
  createdAt: string; // ISO date
  onboardingCompleted: boolean;
  values: string[]; // 3-5 selected
  notifications: {
    enabled: boolean;
    morning: string; // "08:00"
    midday: string;  // "13:00"
    evening: string; // "20:00"
  };
  preferences: {
    haptics: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
  lastSyncDate?: string; // Future
  clinicalProfile?: {
    phq9Baseline?: number;
    gad7Baseline?: number;
    riskLevel?: 'minimal' | 'mild' | 'moderate' | 'severe';
  };
}

interface CheckIn {
  id: string;
  type: 'morning' | 'midday' | 'evening';
  startedAt: string;
  completedAt?: string;
  skipped: boolean;
  // Exactly matching prototype structure
  data: {
    // Morning specific
    bodyAreas?: string[];
    emotions?: string[];
    thoughts?: string[];
    sleepQuality?: number;
    energyLevel?: number;
    anxietyLevel?: number;
    todayValue?: string;
    intention?: string;
    dreams?: string;
    
    // Midday specific
    currentEmotions?: string[];
    breathingCompleted?: boolean;
    pleasantEvent?: string;
    unpleasantEvent?: string;
    currentNeed?: string;
    
    // Evening specific
    overallMood?: number;
    energyManagement?: number;
    valuesAlignment?: number;
    pleasantEvents?: string[];
    unpleasantEvents?: string[];
    learnings?: string;
    thoughtPatterns?: string[];
    tomorrowReminder?: string;
    tomorrowIntention?: string;
  };
}

interface Assessment {
  id: string;
  type: 'phq9' | 'gad7';
  completedAt: string;
  answers: number[]; // [0,1,2,3,...]
  score: number;
  severity: 'minimal' | 'mild' | 'moderate' | 'moderately severe' | 'severe';
  context: 'onboarding' | 'standalone' | 'clinical';
}

interface CrisisPlan {
  id: string;
  updatedAt: string;
  warningSigns: string[];
  copingStrategies: string[];
  contacts: {
    therapist?: { name: string; phone: string; };
    crisisLine: string; // Default "988"
    trustedFriends: Array<{ name: string; phone: string; }>;
  };
  safetyMeasures: string[];
  isActive: boolean;
}
```

### Storage Implementation

```typescript
// Simple AsyncStorage wrapper
import AsyncStorage from '@react-native-async-storage/async-storage';

class DataStore {
  private readonly KEYS = {
    USER: '@fullmind_user',
    CHECKINS: '@fullmind_checkins',
    ASSESSMENTS: '@fullmind_assessments',
    CRISIS_PLAN: '@fullmind_crisis'
  };

  async saveUser(user: UserProfile): Promise<void> {
    await AsyncStorage.setItem(this.KEYS.USER, JSON.stringify(user));
  }

  async getUser(): Promise<UserProfile | null> {
    const data = await AsyncStorage.getItem(this.KEYS.USER);
    return data ? JSON.parse(data) : null;
  }

  async saveCheckIn(checkIn: CheckIn): Promise<void> {
    const existing = await this.getCheckIns();
    existing.push(checkIn);
    // Keep last 90 days only for performance
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const filtered = existing.filter(c => 
      new Date(c.completedAt || c.startedAt) > cutoff
    );
    await AsyncStorage.setItem(this.KEYS.CHECKINS, JSON.stringify(filtered));
  }

  async getCheckIns(): Promise<CheckIn[]> {
    const data = await AsyncStorage.getItem(this.KEYS.CHECKINS);
    return data ? JSON.parse(data) : [];
  }

  // Query methods (in-memory filtering)
  async getRecentCheckIns(days: number = 7): Promise<CheckIn[]> {
    const all = await this.getCheckIns();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return all.filter(c => new Date(c.completedAt || c.startedAt) > cutoff);
  }

  async getTodayCheckIns(): Promise<CheckIn[]> {
    const all = await this.getCheckIns();
    const today = new Date().toDateString();
    return all.filter(c => 
      new Date(c.completedAt || c.startedAt).toDateString() === today
    );
  }

  // Export functionality
  async exportData(): Promise<string> {
    const user = await this.getUser();
    const checkIns = await this.getCheckIns();
    const assessments = await this.getAssessments();
    const crisisPlan = await this.getCrisisPlan();
    
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      version: '1.0',
      user,
      checkIns,
      assessments,
      crisisPlan
    }, null, 2);
  }
}

export const dataStore = new DataStore();
```

---

## Component Migration Strategy

### From Design Library v1.1 to React Native

```typescript
// Example: Button Component Migration

// Original (Web/React)
export const Button = ({ 
  children, variant = 'primary', onClick, disabled = false, 
  style = {}, theme = null, fullWidth = true 
}) => {
  let bgColor = theme ? colorSystem.themes[theme].primary : colorSystem.status.info;
  // ... web implementation
};

// React Native Implementation
import { TouchableOpacity, Text, StyleSheet, View, Platform } from 'react-native';
import Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'success';
  onPress?: () => void;
  disabled?: boolean;
  theme?: 'morning' | 'midday' | 'evening' | null;
  fullWidth?: boolean;
  loading?: boolean;
  haptic?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  onPress,
  disabled = false,
  theme = null,
  fullWidth = true,
  loading = false,
  haptic = true
}) => {
  const { colorSystem } = useTheme();
  
  const handlePress = async () => {
    if (disabled || loading) return;
    
    if (haptic && Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    onPress?.();
  };

  const backgroundColor = disabled 
    ? colorSystem.gray[300]
    : theme 
      ? colorSystem.themes[theme].primary 
      : colorSystem.status.info;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={styles.text}>{children}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});
```

### Component Migration Checklist

| Component | Web → Native Changes | Priority | Week |
|-----------|---------------------|----------|------|
| Button | TouchableOpacity, Haptics | P0 | 1 |
| Slider | Native slider with custom style | P0 | 1 |
| MultiSelect | FlatList grid implementation | P0 | 1 |
| TextArea | TextInput multiline | P0 | 1 |
| Card | View with shadow | P0 | 1 |
| BrainIcon | SVG → react-native-svg | P0 | 2 |
| ProgressBar | Animated.View | P1 | 2 |
| BottomNav | React Navigation tabs | P0 | 2 |
| ThoughtBubbles | Animated.View with gestures | P1 | 3 |
| BreathingCircle | Reanimated 3 | P1 | 3 |

---

## Implementation Roadmap

### Week 1-2: Foundation & Components

```yaml
tasks:
  setup:
    - Initialize Expo project with TypeScript
    - Configure React Navigation (tabs + stacks)
    - Setup Zustand stores
    - Implement AsyncStorage data layer
    
  components:
    - Port Design Library core components
    - Create theme system
    - Build navigation structure
    - Implement BrainIcon with react-native-svg
    
  deliverables:
    - Working app shell
    - All basic components functional
    - Navigation between screens
    - Data persistence verified

validation:
  - Components match Design Library exactly
  - Theme switching works
  - Data survives app restart
  - Runs on iOS Simulator and Android Emulator
```

### Week 3-4: Check-in Flows

```yaml
morning_checkin:
  screens: 6
  components:
    - Body area grid (exact layout)
    - Emotion selector
    - Thought bubbles (animated)
    - Sliders with visual feedback
    - Value selector
    - Dream journal textarea
    
midday_reset:
  screens: 3
  components:
    - Emotion quick select
    - Breathing animation (Reanimated)
    - Pleasant/unpleasant inputs
    - Need selector
    
evening_reflection:
  screens: 4
  components:
    - Day review sliders
    - Event logging
    - Pattern recognition
    - Tomorrow prep

validation:
  - Each flow completable in target time
  - All data saves correctly
  - Skip functionality works
  - Animations smooth at 60fps
```

### Week 5-6: Clinical Features & Assessments

```yaml
assessments:
  phq9:
    - 9 questions with radio buttons
    - Score calculation (verified against clinical spec)
    - Severity categorization
    - History tracking (last 5)
    
  gad7:
    - 7 questions implementation
    - Identical UI to PHQ-9
    - Results visualization
    - Export capability
    
crisis_plan:
    - Warning signs list (editable)
    - Coping strategies
    - Emergency contacts with tel: links
    - SOS button in header (always visible)
    
compliance:
    - Scoring algorithms double-checked
    - Data encrypted at rest
    - Export includes disclaimer
```

### Week 7: Polish & Performance

```yaml
polish:
  animations:
    - Screen transitions
    - Micro-interactions
    - Loading states
    - Success feedback
    
  performance:
    - Image optimization
    - Lazy loading screens
    - Memory profiling
    - Battery usage check
    
  accessibility:
    - VoiceOver testing (iOS)
    - TalkBack testing (Android)
    - Font scaling support
    - Color contrast verification
```

### Week 8: App Store Preparation

```yaml
ios_requirements:
  - App icon (1024x1024)
  - Screenshots (6.5", 5.5" devices)
  - Privacy policy URL
  - App description with MBCT keywords
  - TestFlight build submission
  
android_requirements:
  - Feature graphic (1024x500)
  - Screenshots (phone, tablet)
  - Short & long descriptions
  - Content rating questionnaire
  - Play Console beta release
  
both_platforms:
  - Age rating (12+ for mental health)
  - Medical disclaimer
  - Data safety disclosures
  - Support contact information
```

---

## Navigation Architecture

```typescript
// Navigation structure matching prototype exactly
const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Onboarding Flow (first launch only) */}
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        
        {/* Main App */}
        <Stack.Screen name="Main" component={MainTabNavigator} />
        
        {/* Modal Screens */}
        <Stack.Screen 
          name="CrisisPlan" 
          component={CrisisPlanScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: styles.tabBar,
        headerRight: () => <SOSButton />, // Always visible
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <DiamondIcon color={focused ? colors.morning.primary : colors.gray[600]} />
          ),
        }}
      />
      <Tab.Screen 
        name="Exercises" 
        component={ExercisesNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <StarIcon color={focused ? colors.morning.primary : colors.gray[600]} />
          ),
        }}
      />
      <Tab.Screen 
        name="Insights" 
        component={InsightsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TriangleIcon color={focused ? colors.evening.primary : colors.gray[600]} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <BrainIcon color={focused ? colors.midnightBlue : colors.gray[600]} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
```

---

## Native Features Implementation

### Local Notifications

```typescript
import * as Notifications from 'expo-notifications';

class NotificationService {
  async setupDailyReminders(times: { morning: string; midday: string; evening: string }) {
    // Cancel existing
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Morning notification
    const [morningHour, morningMinute] = times.morning.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Morning Check-in",
        body: "Start your day with awareness",
        data: { type: 'morning' },
      },
      trigger: {
        hour: morningHour,
        minute: morningMinute,
        repeats: true,
      },
    });
    
    // Similar for midday and evening...
  }
  
  async requestPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }
}
```

### Biometric Authentication (Phase 2)

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

class BiometricService {
  async authenticate(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return true; // Skip if not available
    
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) return true; // Skip if not setup
    
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access FullMind',
      fallbackLabel: 'Use Passcode',
    });
    
    return result.success;
  }
}
```

---

## Testing Strategy

### Testing Pyramid

```yaml
unit_tests: 60%
  tools: Jest, React Native Testing Library
  coverage:
    - Assessment scoring algorithms (100% required)
    - Data transformations
    - Date/time utilities
    - State management logic

integration_tests: 30%
  tools: Jest with mocked AsyncStorage
  coverage:
    - Complete check-in flows
    - Data persistence
    - Navigation flows
    - Export functionality

e2e_tests: 10%
  tools: Detox
  coverage:
    - Onboarding completion
    - Morning check-in full flow
    - Crisis plan access
    - Assessment completion

manual_testing:
  devices:
    - iPhone 15 Pro (latest)
    - iPhone 12 (common)
    - iPhone SE (small screen)
    - Pixel 7 (latest Android)
    - Samsung Galaxy S21 (common)
  
  test_cases:
    - Fresh install flow
    - Daily usage simulation
    - Offline mode
    - Notification handling
    - Data export/import
```

### Critical Test Cases

```typescript
// Example: PHQ-9 Scoring Test (MUST PASS)
describe('PHQ-9 Assessment', () => {
  it('calculates score correctly', () => {
    const answers = [2, 3, 1, 2, 0, 1, 2, 1, 0]; // Total: 12
    const score = calculatePHQ9Score(answers);
    expect(score).toBe(12);
  });
  
  it('categorizes severity correctly', () => {
    expect(getPHQ9Severity(4)).toBe('minimal');
    expect(getPHQ9Severity(9)).toBe('mild');
    expect(getPHQ9Severity(14)).toBe('moderate');
    expect(getPHQ9Severity(19)).toBe('moderately severe');
    expect(getPHQ9Severity(20)).toBe('severe');
  });
  
  it('handles incomplete assessments', () => {
    const answers = [2, 3, null, 2, 0, 1, 2, 1, 0];
    expect(() => calculatePHQ9Score(answers)).toThrow('Incomplete assessment');
  });
});
```

---

## Performance Optimization

### Target Metrics

```yaml
app_launch:
  cold_start: < 3 seconds
  warm_start: < 1 second
  
screen_transitions:
  navigation: < 200ms
  modal_presentation: < 300ms
  
interactions:
  button_tap: < 100ms
  slider_drag: 60fps
  animation: 60fps
  
data_operations:
  save_checkin: < 100ms
  load_history: < 500ms
  export_data: < 2 seconds
  
memory:
  baseline: < 100MB
  during_checkin: < 150MB
  
battery:
  background_drain: < 1% per hour
  active_use: < 10% per hour
```

### Optimization Techniques

```typescript
// Lazy loading screens
const MorningCheckIn = lazy(() => import('./flows/MorningCheckIn'));
const Assessments = lazy(() => import('./screens/Assessments'));

// Memoization for expensive renders
const CheckInHistory = memo(({ checkIns }: { checkIns: CheckIn[] }) => {
  const grouped = useMemo(() => 
    groupCheckInsByWeek(checkIns), [checkIns]
  );
  
  return (
    <FlatList
      data={grouped}
      renderItem={renderWeek}
      keyExtractor={item => item.weekStart}
      windowSize={5} // Optimize memory
    />
  );
});

// Image optimization
const OptimizedImage = ({ source, ...props }) => {
  return (
    <FastImage
      source={source}
      resizeMode={FastImage.resizeMode.contain}
      {...props}
    />
  );
};
```

---

## Future Technical Opportunities

### Phase 2: Enhanced Features (Months 3-6)

```yaml
data_enhancements:
  sqlite_migration:
    rationale: Better querying for insights
    effort: 1 week
    benefit: 10x query performance
    
  encryption:
    library: expo-crypto
    scope: Assessment and crisis data
    compliance: HIPAA-ready
    
  cloud_sync:
    approach: End-to-end encrypted
    service: AWS Amplify or Supabase
    trigger: User opt-in only

platform_integrations:
  apple_health:
    metrics: Sleep, heart rate, activity
    correlation: Mood patterns with physical data
    library: react-native-health
    
  google_fit:
    similar_metrics: Android equivalent
    library: react-native-google-fit
    
  wearables:
    apple_watch: Breathing exercises
    fitbit: Sleep tracking
    garmin: Stress scores

ai_enhancements:
  on_device_ml:
    library: TensorFlow Lite
    models:
      - Pattern detection
      - Trigger prediction
      - Personalized insights
    privacy: All processing local
    
  natural_language:
    journal_analysis: Sentiment trends
    thought_patterns: Automatic categorization
    implementation: expo-ml-kit

clinical_features:
  provider_portal:
    architecture: Separate React web app
    data_sharing: Encrypted exports
    features:
      - Patient progress dashboard
      - Assessment history
      - Compliance tracking
      
  teletherapy:
    integration: Zoom SDK or custom WebRTC
    features:
      - In-app sessions
      - Screen sharing for exercises
      - Session notes integration
      
  research_mode:
    anonymous_data: Opt-in contribution
    university_partnerships: Clinical trials
    irb_compliance: Built-in consent flows
```

### Phase 3: Platform Expansion (Year 2)

```yaml
additional_platforms:
  ipad_optimization:
    layout: Split screen for exercises
    pencil_support: Journaling with handwriting
    multitasking: Picture-in-picture meditation
    
  android_tablet:
    similar_optimizations: As iPad
    chrome_os: Full keyboard support
    
  apple_watch:
    standalone_app: Quick check-ins
    complications: Mood tracking
    breathing_app: Integration
    
  web_deployment:
    react_native_web: Same codebase
    use_cases:
      - Therapist demonstration
      - Corporate wellness portals
      - Academic access
      
  desktop_apps:
    electron_wrapper: Mac/Windows
    features:
      - Larger journaling space
      - Multi-window support
      - Keyboard shortcuts
```

### Phase 4: Advanced Architecture (Year 2+)

```yaml
microservices_backend:
  api_gateway: GraphQL with Apollo
  services:
    - User service (auth, profiles)
    - Clinical service (assessments, plans)
    - Analytics service (insights)
    - Integration service (third-party)
    
  benefits:
    - Scalability for millions of users
    - Feature flag deployment
    - A/B testing capability
    - Multi-tenancy for organizations

federated_learning:
  concept: Train models across devices
  privacy: Data never leaves device
  benefits:
    - Personalized predictions
    - Population insights
    - Clinical research data
    
blockchain_integration:
  use_case: Verified clinical records
  implementation: Hyperledger Fabric
  benefits:
    - Portable health records
    - Insurance verification
    - Research participation proof

white_label_platform:
  architecture: Config-driven theming
  customers:
    - Hospital systems
    - Insurance companies
    - Corporate wellness
    - Universities
    
  features:
    - Custom branding
    - Organization-specific exercises
    - Integrated reporting
    - SAML/SSO authentication
```

### Technical Debt Management

```yaml
regular_maintenance:
  dependency_updates:
    schedule: Monthly
    tool: Renovate bot
    testing: Automated regression
    
  performance_monitoring:
    tool: Sentry Performance
    alerts: >10% degradation
    reviews: Weekly
    
  code_quality:
    linting: ESLint strict mode
    formatting: Prettier
    typing: TypeScript strict
    coverage: Maintain >80%
    
  refactoring_opportunities:
    quarter_1: Component optimization
    quarter_2: State management review
    quarter_3: Navigation upgrade
    quarter_4: Data layer evolution
```

---

## Risk Mitigation

### Technical Risks & Mitigations

```yaml
app_store_rejection:
  risk: Medical claims without disclaimer
  mitigation:
    - Clear disclaimer on first launch
    - "Not a replacement for therapy" messaging
    - Age rating 12+
    - Privacy policy comprehensive
    
  risk: Insufficient testing
  mitigation:
    - TestFlight beta with 100+ users
    - Crash-free rate >99.5%
    - Performance metrics documented
    
data_loss:
  risk: AsyncStorage corruption
  mitigation:
    - Daily auto-export reminder
    - Multiple storage keys
    - Backup to documents directory
    - Cloud sync in Phase 2
    
performance_degradation:
  risk: Growing data slows app
  mitigation:
    - 90-day data window
    - Pagination for history
    - Lazy loading
    - SQLite migration path
    
platform_specific_bugs:
  risk: iOS/Android differences
  mitigation:
    - Platform-specific testing
    - Conditional code minimal
    - Regular device testing
    - User feedback channel
```

---

## Success Metrics & KPIs

### Launch Metrics (Week 8)

```yaml
technical:
  - App size < 50MB
  - Cold start < 3s
  - Crash-free rate > 99%
  - All flows completable
  
distribution:
  - TestFlight live with 100 testers
  - Play Store beta with 100 testers
  - 5-star average in beta feedback
  
quality:
  - 0 critical bugs
  - < 5 minor bugs
  - Accessibility validated
```

### Growth Metrics (Month 1-3)

```yaml
adoption:
  - 1,000 downloads month 1
  - 5,000 downloads month 3
  - 40% day-30 retention
  - 4.5+ app store rating
  
engagement:
  - 70% complete onboarding
  - 60% daily active users
  - 2.5 check-ins per day average
  - 85% completion rate for started check-ins
  
clinical:
  - 100% assessment accuracy
  - 40% create crisis plan
  - 30% use export feature
  - 20% share with therapist
```

---

## Development Tools & Setup

### Required Development Environment

```bash
# System requirements
- macOS 12+ (for iOS development)
- Xcode 15+
- Android Studio Hedgehog
- Node.js 18+
- Git

# Initial setup
npm install -g expo-cli eas-cli
expo init fullmind --template expo-template-blank-typescript
cd fullmind

# Core dependencies
expo install expo-notifications expo-sharing expo-haptics
expo install @react-native-async-storage/async-storage
expo install react-native-reanimated react-native-gesture-handler
expo install react-native-safe-area-context react-native-screens
npm install zustand react-navigation @react-navigation/native
npm install @react-navigation/stack @react-navigation/bottom-tabs

# Development dependencies
npm install -D @types/react @types/react-native
npm install -D jest @testing-library/react-native
npm install -D eslint prettier eslint-config-universe
```

### Project Structure

```
fullmind/
├── app.json                 # Expo configuration
├── eas.json                 # EAS Build configuration
├── babel.config.js
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
├── App.tsx                  # Entry point
├── src/
│   ├── navigation/         # Navigation setup
│   │   ├── RootNavigator.tsx
│   │   ├── MainTabs.tsx
│   │   └── OnboardingStack.tsx
│   ├── screens/           # Screen components
│   │   ├── home/
│   │   ├── checkins/
│   │   ├── exercises/
│   │   ├── insights/
│   │   └── profile/
│   ├── flows/            # Multi-step flows
│   │   ├── MorningCheckIn/
│   │   ├── MiddayReset/
│   │   └── EveningReflection/
│   ├── components/       # Reusable components
│   │   ├── core/        # Button, Card, etc.
│   │   ├── forms/       # Inputs, Sliders
│   │   └── themed/      # Theme-aware components
│   ├── store/           # Zustand stores
│   │   ├── userStore.ts
│   │   ├── checkInStore.ts
│   │   └── assessmentStore.ts
│   ├── services/        # Business logic
│   │   ├── storage/
│   │   ├── notifications/
│   │   └── export/
│   ├── hooks/          # Custom hooks
│   ├── utils/          # Helpers
│   ├── constants/      # Colors, themes
│   └── types/          # TypeScript types
├── assets/             # Images, fonts
└── __tests__/         # Test files
```

---

## Deployment Strategy

### Beta Testing Phase

```yaml
week_8_beta:
  ios:
    platform: TestFlight
    users: 100 invites
    groups:
      - Internal team (10)
      - Clinical advisors (10)
      - MBCT practitioners (20)
      - Target users (60)
      
  android:
    platform: Play Console Beta
    tracks:
      - Internal testing (10)
      - Closed beta (100)
    
  feedback_collection:
    - In-app feedback button
    - Weekly surveys
    - Crash reporting
    - Usage analytics (anonymous)

success_criteria:
  - Crash rate < 1%
  - Daily active > 60%
  - Check-in completion > 80%
  - Average rating > 4.0
```

### Production Launch Strategy

```yaml
month_3_launch:
  soft_launch:
    regions: [Canada, Australia, UK]
    duration: 2 weeks
    monitoring: Daily metrics review
    
  global_launch:
    app_store_optimization:
      - Keywords: MBCT, mindfulness, CBT, mental health
      - Screenshots: Check-in flows, assessments
      - Video: 30-second overview
      
  marketing:
    - Therapist outreach program
    - MBCT community engagement
    - Mental health blog coverage
    - Academic partnerships
```

---

## Appendix A: Quick Reference Commands

```bash
# Development
expo start                    # Start dev server
expo start --ios             # Open iOS simulator
expo start --android         # Open Android emulator
expo start --web            # Open web browser

# Building
eas build --platform ios     # Build for iOS
eas build --platform android # Build for Android
eas build --platform all    # Build for both

# Testing
npm test                     # Run tests
npm run test:coverage       # Coverage report
npx detox test              # E2E tests

# Deployment
eas submit --platform ios   # Submit to App Store
eas submit --platform android # Submit to Play Store

# Updates (post-launch)
eas update --branch production # OTA update
```

---

## Appendix B: Clinical Accuracy Checklist

- [ ] PHQ-9 scoring algorithm verified
- [ ] GAD-7 scoring algorithm verified
- [ ] Severity levels match clinical standards
- [ ] Assessment questions exact wording preserved
- [ ] Crisis hotline number (988) verified
- [ ] Medical disclaimer present
- [ ] Data export includes timestamps
- [ ] Privacy policy comprehensive
- [ ] Age rating appropriate (12+)
- [ ] Therapist integration tested

---

## Summary

This TRD v2.0 provides a complete technical roadmap for building FullMind as a native React Native application that will:

1. **Launch in app stores within 8 weeks**
2. **Maintain clinical accuracy and user trust**
3. **Start simple with AsyncStorage, upgrade to SQLite when needed**
4. **Preserve your validated prototype design exactly**
5. **Build on a foundation that can scale to millions of users**

The architecture prioritizes immediate deployment while building in clear upgrade paths for every future enhancement. By choosing React Native over PWA, FullMind will have the authenticity and trust required for a mental health application from day one.

**Next Immediate Steps**:
1. Run `npx create-expo-app fullmind --template typescript`
2. Port Button, Slider, and MultiSelect components
3. Implement basic navigation structure
4. Begin morning check-in flow

**Critical Success Factor**: Ship to app stores in 8 weeks with perfect clinical accuracy.