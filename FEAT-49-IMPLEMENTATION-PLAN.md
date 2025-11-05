# FEAT-49: Educational Modules Implementation Plan

**Status**: Ready for Implementation
**Effort**: XL (5 weeks per Notion)
**Validation**: ✅ Philosopher (9.5/10), ✅ UX Design Complete

---

## Completed Work

### Phase 1: Discovery & Validation ✅
- [x] Read all 5 principle documentation files
- [x] Philosopher agent validation (9.5/10 philosophical integrity rating)
- [x] UX agent comprehensive design specification
- [x] Worktree setup (feat-49)
- [x] Dependencies installed

### Philosopher Validation Summary
**Rating**: 9.5/10 Philosophical Integrity
**Status**: ✅ Approved for implementation

**Key Findings**:
- Classical Stoic accuracy preserved
- Virtue ethics framework authentic
- Dichotomy of control properly emphasized
- Integration with mindfulness philosophically sound
- Module 3 (Sphere Sovereignty) correctly identified as most critical

**Module Structure Validated**:
1. Aware Presence (Foundation)
2. Radical Acceptance (Working with what is)
3. Sphere Sovereignty (MOST CRITICAL - Dichotomy of Control)
4. Virtuous Response (Character & Virtue)
5. Interconnected Living (Ethics & Community)

### UX Design Summary
**Architecture**: Open-access with guided path
**Navigation**: New "Learn" tab in bottom navigation
**Module Structure**: 3 tabs per module (Overview, Practice, Reflect)

**Key Features**:
- Interactive sorting practice (Module 3)
- Practice timers (breathing, body scan - 60fps required)
- Journal integration (encrypted reflections)
- Developmental stage tracking (Fragmented → Effortful → Fluid → Integrated)
- Safety opt-outs (negative visualization for GAD ≥15)

---

## Implementation Phases

### Phase 2: Core Infrastructure (Week 1)

#### 2.1 Module Content Files
Create JSON content files in `app/assets/modules/`:
- `module-1-aware-presence.json`
- `module-2-radical-acceptance.json`
- `module-3-sphere-sovereignty.json`
- `module-4-virtuous-response.json`
- `module-5-interconnected-living.json`

**Content Structure**:
```json
{
  "id": "aware-presence",
  "title": "Aware Presence",
  "number": 1,
  "tag": "FOUNDATION",
  "description": "Learn to observe your thoughts and emotions without judgment.",
  "estimatedMinutes": 15,
  "classicalQuote": {
    "text": "The primary indication...",
    "author": "Seneca"
  },
  "whatItIs": {
    "summary": "Be fully here now...",
    "concepts": [
      {
        "title": "Present Perception",
        "content": "...",
        "learnMore": "..."
      }
    ]
  },
  "whyItMatters": "...",
  "practices": [
    {
      "id": "breathing-space",
      "title": "3-Minute Breathing Space",
      "description": "...",
      "duration": 180,
      "type": "guided-timer"
    }
  ],
  "commonObstacles": [
    {
      "question": "I can't stop my thoughts",
      "response": "...",
      "tip": "..."
    }
  ],
  "reflectionPrompt": "...",
  "developmentalStages": [...]
}
```

**Source**: Extract from docs/product/stoic-mindfulness/principles/*.md

#### 2.2 TypeScript Types
Create `app/src/types/education.ts`:
```typescript
export type ModuleId = 'aware-presence' | 'radical-acceptance' | 'sphere-sovereignty' | 'virtuous-response' | 'interconnected-living';
export type ModuleStatus = 'not_started' | 'in_progress' | 'completed';
export type DevelopmentalStage = 'fragmented' | 'effortful' | 'fluid' | 'integrated' | null;
export type PracticeType = 'guided-timer' | 'sorting' | 'reflection';

export interface ModuleContent {
  id: ModuleId;
  title: string;
  number: number;
  tag: string;
  description: string;
  estimatedMinutes: number;
  classicalQuote: {
    text: string;
    author: string;
  };
  whatItIs: {
    summary: string;
    concepts: Concept[];
  };
  whyItMatters: string;
  practices: Practice[];
  commonObstacles: Obstacle[];
  reflectionPrompt: string;
  developmentalStages: Stage[];
}

export interface ModuleProgress {
  status: ModuleStatus;
  lastAccessedAt: Date;
  completedSections: string[];
  developmentalStage: DevelopmentalStage;
  practiceCount: number;
  reflectionResponses: string[]; // Journal entry IDs
  optOutFlags: string[]; // e.g., ['negative-visualization']
}

// ... more interfaces
```

#### 2.3 Zustand Store
Create `app/src/stores/educationStore.ts`:
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encrypt, decrypt } from '../services/encryption';

interface EducationState {
  modules: Record<ModuleId, ModuleProgress>;
  currentModule: ModuleId | null;
  recommendedNext: ModuleId | null;

  // Actions
  setModuleStatus: (moduleId: ModuleId, status: ModuleStatus) => void;
  completeSection: (moduleId: ModuleId, sectionId: string) => void;
  incrementPracticeCount: (moduleId: ModuleId) => void;
  setDevelopmentalStage: (moduleId: ModuleId, stage: DevelopmentalStage) => void;
  saveReflection: (moduleId: ModuleId, journalEntryId: string) => void;
  addOptOut: (moduleId: ModuleId, flag: string) => void;
  getModuleProgress: (moduleId: ModuleId) => ModuleProgress;
  getRecommendedModule: () => ModuleId | null;
}

export const useEducationStore = create<EducationState>()(
  persist(
    (set, get) => ({
      modules: {
        'aware-presence': { status: 'not_started', ... },
        // ... initialize all 5 modules
      },
      currentModule: null,
      recommendedNext: 'aware-presence', // Default for new users

      // Implement actions...
    }),
    {
      name: '@education:state',
      storage: createJSONStorage(() => AsyncStorage),
      // Encrypt sensitive data
    }
  )
);
```

### Phase 3: Navigation & Screens (Week 2)

#### 3.1 Add "Learn" Tab to Navigation
Update `app/src/navigation/CleanTabNavigator.tsx`:
- Add 5th tab: "Learn" with book/graduation cap icon
- Import LearnScreen
- Update tab bar layout (5 icons)

#### 3.2 Learn Screen (Module Directory)
Create `app/src/screens/learn/LearnScreen.tsx`:
- Header with subtitle
- Scrollable list of 5 module cards
- Module card component showing:
  - Number, title, tag
  - Description (2 lines)
  - Progress bar (dots + percentage)
  - Metadata (practice count, estimated time)
- Recommendation card (conditional)

#### 3.3 Module Detail Screen
Create `app/src/screens/learn/ModuleDetailScreen.tsx`:
- Tab navigator (Overview, Practice, Reflect)
- Shared navigation bar
- Sticky footer CTA

**3.3.1 Overview Tab**
Create `app/src/screens/learn/tabs/OverviewTab.tsx`:
- Hero section with classical quote
- What It Is (expandable accordions)
- Why It Matters
- Developmental Stages timeline

**3.3.2 Practice Tab**
Create `app/src/screens/learn/tabs/PracticeTab.tsx`:
- Practice card list
- Tap → Launch practice session

**3.3.3 Reflect Tab**
Create `app/src/screens/learn/tabs/ReflectTab.tsx`:
- Common Obstacles (expandable FAQ)
- Reflection Prompt
- Journal entry field (encrypted)

### Phase 4: Interactive Practices (Week 3)

#### 4.1 Practice Timer Screen
Create `app/src/screens/learn/practices/PracticeTimerScreen.tsx`:
- Full-screen immersive experience
- Animated breathing circle (60fps requirement)
- Timer countdown (exact: 180s for breathing space)
- Pause/play controls
- Post-practice mood check

**Performance Requirements**:
- 60fps animations (react-native-reanimated)
- Exact timing (60s breathing × 3 cycles = 180s)
- Background support (timer continues if user switches apps)

#### 4.2 Sorting Practice Screen (Module 3)
Create `app/src/screens/learn/practices/SortingPracticeScreen.tsx`:
- Swipeable scenario cards OR button controls
- 12 scenarios (stored in module content)
- Feedback screen with explanation
- Educational focus (no scoring displayed)

**Scenarios** (from Module 3 content):
1. Colleague takes credit for your idea
2. Traffic cutoff
3. Anxiety about medical test
4. Friend doesn't reply
... (12 total)

#### 4.3 Journal Integration
- Save reflections to existing journal store
- Tag with module ID: `#aware-presence-module`
- Encrypt via standard Being encryption
- Display in Journal tab (filterable by module tag)

### Phase 5: Components & Styling (Week 4)

#### 5.1 Reusable Components
Create in `app/src/components/learn/`:
- `ModuleCard.tsx` - Directory card with progress
- `SectionAccordion.tsx` - Expandable content
- `ClassicalQuote.tsx` - Bordered, italic quote
- `PracticeCard.tsx` - Practice exercise card
- `CalloutBox.tsx` - Practical examples, warnings
- `ProgressDots.tsx` - Dot-based progress indicator
- `DevelopmentalStageTimeline.tsx` - Vertical timeline
- `ReflectionJournal.tsx` - Encrypted journal field
- `SortingCard.tsx` - Swipeable scenario card

#### 5.2 Styling & Design System
- Typography scale (per UX spec)
- Color system integration (existing colorSystem)
- Spacing (existing spacing constants)
- Accessibility (touch targets 44×44pt minimum)

### Phase 6: Safety & Personalization (Week 5)

#### 6.1 Negative Visualization Opt-Out
- Check GAD-7 score from assessmentStore
- Auto-hide negative visualization practice if GAD ≥15
- Show alternative: gratitude practice
- Content warning modal with opt-in

#### 6.2 Recommendation Logic
Create `app/src/services/educationRecommendations.ts`:
```typescript
export function getRecommendedModule(
  mood: string[],
  phq9Score: number,
  gad7Score: number,
  completedModules: ModuleId[]
): ModuleId | null {
  // Mood: "anxious" frequently → Module 3 (Sphere Sovereignty)
  // Mood: "sad" frequently → Module 2 (Radical Acceptance)
  // PHQ-9 ≥10 → Module 1 (Aware Presence)
  // GAD-7 ≥10 → Module 3 (Sphere Sovereignty)
  // First-time user → Module 1
  // Completed 1-2 modules → Module 3 (most essential)
}
```

#### 6.3 Progress Tracking
- Update Profile screen widget: "Learning Progress"
- Learn tab header stats
- Mark complete logic (user-determined)

### Phase 7: Testing & Validation

#### 7.1 Unit Tests
- Recommendation algorithm
- Sorting practice logic
- Developmental stage persistence
- Opt-out flag enforcement

#### 7.2 Integration Tests
- Module completion flow
- Journal integration
- Progress syncing across tabs

#### 7.3 Domain Validation
- **Philosopher**: Review JSON content files for accuracy
- **UX**: Verify interaction patterns support mindful learning
- **Accessibility**: WCAG AA compliance audit

---

## File Structure

```
app/
├── assets/
│   └── modules/
│       ├── module-1-aware-presence.json
│       ├── module-2-radical-acceptance.json
│       ├── module-3-sphere-sovereignty.json
│       ├── module-4-virtuous-response.json
│       └── module-5-interconnected-living.json
├── src/
│   ├── components/
│   │   └── learn/
│   │       ├── ModuleCard.tsx
│   │       ├── SectionAccordion.tsx
│   │       ├── ClassicalQuote.tsx
│   │       ├── PracticeCard.tsx
│   │       ├── CalloutBox.tsx
│   │       ├── ProgressDots.tsx
│   │       ├── DevelopmentalStageTimeline.tsx
│   │       ├── ReflectionJournal.tsx
│   │       └── SortingCard.tsx
│   ├── navigation/
│   │   └── CleanTabNavigator.tsx [UPDATE: add Learn tab]
│   ├── screens/
│   │   └── learn/
│   │       ├── LearnScreen.tsx
│   │       ├── ModuleDetailScreen.tsx
│   │       ├── tabs/
│   │       │   ├── OverviewTab.tsx
│   │       │   ├── PracticeTab.tsx
│   │       │   └── ReflectTab.tsx
│   │       └── practices/
│   │           ├── PracticeTimerScreen.tsx
│   │           └── SortingPracticeScreen.tsx
│   ├── services/
│   │   └── educationRecommendations.ts
│   ├── stores/
│   │   └── educationStore.ts
│   └── types/
│       └── education.ts
```

---

## Non-Negotiables (from Philosopher & UX)

### Philosophical Integrity
- ✅ Module 3 (Sphere Sovereignty) must be longest and most emphasized
- ✅ Dichotomy of control not oversimplified (layered depth required)
- ✅ Classical quotes visually distinct and properly attributed
- ✅ Four cardinal virtues only (wisdom, courage, justice, temperance)
- ✅ Developmental stages: realistic timeframes (years, not weeks)

### UX Requirements
- ✅ All modules unlocked (no forced progression, respects user agency)
- ✅ No gamification (no points, streaks, badges, accuracy scores)
- ✅ Learning-focused progress (not performance metrics)
- ✅ 60fps animations (breathing circle, sorting swipe)
- ✅ Exact timing (180s breathing space, per Being standards)

### Safety Requirements
- ✅ Negative visualization opt-out for GAD ≥15
- ✅ Content warnings for difficult themes
- ✅ Crisis button accessible <3s from all screens
- ✅ Encrypted storage for reflections

### Accessibility Requirements
- ✅ WCAG AA compliance (contrast ≥4.5:1, touch targets 44×44pt)
- ✅ Screen reader support (VoiceOver, TalkBack)
- ✅ Reduced motion support (iOS accessibility settings)
- ✅ Plain language (Flesch-Kincaid Grade 8-10)

---

## Next Steps

1. **Extract Module Content** (Week 1, Day 1-2)
   - Convert principle .md files to JSON
   - Philosopher validation of extracted content

2. **Build Core Infrastructure** (Week 1, Day 3-5)
   - Create types, store, navigation

3. **Implement Screens** (Week 2)
   - Learn screen, Module detail, tabs

4. **Interactive Practices** (Week 3)
   - Timers, sorting, journal integration

5. **Components & Polish** (Week 4)
   - Reusable components, styling, accessibility

6. **Safety & Testing** (Week 5)
   - Opt-outs, recommendations, validation

---

## Validation Checkpoints

### After Phase 2 (Infrastructure)
- [ ] Philosopher reviews JSON content files for philosophical accuracy

### After Phase 3 (Navigation & Screens)
- [ ] UX reviews screen implementations
- [ ] Philosopher validates Module 3 emphasis in UI

### After Phase 4 (Interactive Practices)
- [ ] Performance testing (60fps animations verified)
- [ ] Timing accuracy (180s breathing verified)

### After Phase 5 (Components & Styling)
- [ ] Accessibility audit (WCAG AA compliance)
- [ ] Screen reader testing

### After Phase 6 (Safety & Personalization)
- [ ] Philosopher final validation (all content + UX)
- [ ] UX final validation (interaction patterns)
- [ ] Accessibility final validation

---

## Known Complexity Areas

1. **Module 3 (Sphere Sovereignty)** - Most critical, longest content, unique sorting practice
2. **60fps Animations** - Breathing circle requires react-native-reanimated
3. **Content Extraction** - Converting 5 comprehensive .md files to structured JSON while preserving depth
4. **Journal Integration** - Encrypted reflections with module tagging
5. **Recommendation Logic** - Personalized suggestions based on mood, assessment scores

---

## Success Criteria

**User Experience**:
- ✅ Users can access all 5 modules from Learn tab
- ✅ Long-form content readable on mobile (tabs + accordions reduce fatigue)
- ✅ Interactive practices engage users
- ✅ Progress feels growth-oriented, not performative

**Philosophical Integrity**:
- ✅ Module 3 emphasis clear
- ✅ Dichotomy of control not oversimplified
- ✅ Classical quotes distinct and attributed
- ✅ Developmental stages encourage growth without pressure

**Technical**:
- ✅ 60fps animations
- ✅ <500ms module load time
- ✅ Offline-complete (all content bundled)
- ✅ Encrypted storage

**Therapeutic**:
- ✅ Calm, contemplative UX (no rushed interactions)
- ✅ Anxiety-sensitive content (opt-outs work)
- ✅ Crisis access maintained
- ✅ Supports mindfulness practice

---

**Status**: ✅ Planning Complete, Ready for Implementation
**Next**: Begin Phase 2 (Core Infrastructure) - Module content extraction
