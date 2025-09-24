# New Architecture Dependency Risk Assessment Matrix

## Risk Classification System

### Risk Levels
- 🟢 **LOW (90%+ success)**: Basic React Native patterns, minimal dependencies
- 🟡 **MEDIUM (70-90% success)**: Standard navigation/state, established patterns
- 🟠 **HIGH (40-70% success)**: Animation libraries, native dependencies
- 🔴 **CRITICAL (20-40% success)**: Complex integrations, experimental features

### Severity Impact
- **BLOCKER**: Prevents app from building/running
- **DEGRADED**: App runs but with reduced functionality
- **WARNING**: App works but with console errors/warnings

## Tier 1: Core Infrastructure (Add First) 🟢

### TypeScript Types & Utilities
| Component | Risk | Dependencies | Estimated Time | Failure Impact |
|-----------|------|--------------|----------------|----------------|
| `/src/types/core.ts` | 🟢 LOW | TypeScript only | 2 min | BLOCKER if TS misconfigured |
| `/src/utils/timeHelpers.ts` | 🟢 LOW | Date/Time JS | 3 min | DEGRADED |
| `/src/utils/validation.ts` | 🟢 LOW | Basic JS validation | 3 min | DEGRADED |
| `/src/types/navigation.ts` | 🟡 MEDIUM | React Navigation types | 5 min | BLOCKER for navigation |

**Total Tier 1 Time: 10-15 minutes**

### Basic Components (No Animations)
| Component | Risk | Dependencies | Known Issues | Success Rate |
|-----------|------|--------------|--------------|--------------|
| `/src/components/core/Typography.tsx` | 🟢 LOW | React Native Text | None | 95% |
| `/src/components/core/Screen.tsx` | 🟢 LOW | React Native View | None | 95% |
| `/src/components/core/Card.tsx` | 🟡 MEDIUM | May use reanimated | **Contains reanimated** | 70% |
| `/src/components/core/Button.tsx` | 🟡 MEDIUM | May use reanimated | **Contains reanimated** | 70% |

**CRITICAL DISCOVERY**: Core components already use reanimated - higher risk than expected!

## Tier 2: Navigation & State Management 🟡

### Navigation Components
| Component | Risk | Dependencies | Property Conflicts | Mitigation |
|-----------|------|--------------|-------------------|------------|
| `@react-navigation/native` | 🟡 MEDIUM | React context | Screen property descriptors | Use latest v7.x |
| `@react-navigation/stack` | 🟡 MEDIUM | Native gestures | Navigation state properties | Test incremental |
| `@react-navigation/bottom-tabs` | 🟡 MEDIUM | Tab bar configuration | Tab property management | Simple config first |
| `/src/navigation/RootNavigator.tsx` | 🟡 MEDIUM | All navigation deps | Complex screen tree | Build progressively |

**Estimated Time: 45-60 minutes**

### State Management
| Store File | Risk | Dependencies | Property Risks | Test Strategy |
|------------|------|--------------|----------------|---------------|
| `/src/store/userStore.simple.ts` | 🟢 LOW | Basic zustand | None | Direct import test |
| `/src/store/userStore.ts` | 🟡 MEDIUM | Zustand + persistence | AsyncStorage descriptors | Test without persistence first |
| `/src/store/checkInStore.ts` | 🟡 MEDIUM | Zustand + validation | Data validation properties | Minimal state first |
| `/src/store/assessmentStore.ts` | 🟠 HIGH | Complex clinical logic | Clinical type properties | Defer to Tier 4 |

**Estimated Time: 30-45 minutes**

## Tier 3: Animation & Interactive (High Risk) 🟠

### React Native Reanimated Components (HIGHEST RISK)
| Component | Risk | Reanimated Usage | Property Conflicts | Alternative |
|-----------|------|------------------|-------------------|-------------|
| `/src/components/checkin/BreathingCircle.tsx` | 🔴 CRITICAL | Worklets + shared values | **Worklet property descriptors** | Use RN Animated |
| `/src/components/checkin/BreathingCircle.optimized.tsx` | 🔴 CRITICAL | Advanced worklets | **Performance worklet conflicts** | Simplify animation |
| `/src/components/checkin/EmotionGrid.tsx` | 🟠 HIGH | Gesture + animation | Touch property descriptors | Basic TouchableOpacity |
| `/src/components/core/Button.tsx` | 🟠 HIGH | Press animations | Button state descriptors | Remove animations |
| `/src/components/core/Card.tsx` | 🟠 HIGH | Transition animations | Card property animations | Static cards |

**Expected Failure Rate: 60-80%**
**Estimated Time: 2-4 hours (including alternatives)**

### Chart & Visualization Components
| Component | Risk | Dependencies | Known Issues | Alternative |
|-----------|------|--------------|--------------|-------------|
| `react-native-chart-kit` | 🟠 HIGH | SVG + native | **SVG property conflicts** | Simple View-based charts |
| `/src/components/clinical/components/EvidenceChart.tsx` | 🟠 HIGH | Chart kit | Chart rendering properties | Text-based data |

**Expected Failure Rate: 40-60%**
**Estimated Time: 1-2 hours**

## Tier 4: Complex Integrations (Critical Risk) 🔴

### Clinical & Assessment Components
| Component | Risk | Dependencies | Complexity | Critical Issues |
|-----------|------|--------------|------------|-----------------|
| `/src/screens/assessment/PHQ9Screen.tsx` | 🔴 CRITICAL | Complex state + validation | Clinical accuracy required | **Type safety conflicts** |
| `/src/screens/assessment/GAD7Screen.tsx` | 🔴 CRITICAL | Clinical algorithms | Scoring precision required | **Validation property conflicts** |
| `/src/services/CrisisDetectionService.ts` | 🔴 CRITICAL | Real-time monitoring | Background processing | **Service property management** |
| `/src/store/integrations/` | 🔴 CRITICAL | Multi-store coordination | Complex state management | **Cross-store property conflicts** |

**Expected Failure Rate: 60-80%**
**Estimated Time: 4-8 hours**

### Advanced Store Integrations
| Store Integration | Risk | Dependencies | Property Conflicts | Impact |
|-------------------|------|--------------|-------------------|--------|
| `ReactiveStateManager` | 🔴 CRITICAL | Complex zustand patterns | **State subscription descriptors** | Core functionality |
| `SyncOrchestrationService` | 🔴 CRITICAL | Multi-service coordination | **Service property management** | Data integrity |
| `EnhancedOfflineQueueService` | 🔴 CRITICAL | AsyncStorage + networking | **Queue property descriptors** | Offline mode |

## Critical Failure Prediction Matrix

### Most Likely Failure Points (in order):

#### 1. React Native Reanimated (80% probability of failure)
```typescript
// Specific failure pattern expected:
import { BreathingCircle } from './src/components/checkin/BreathingCircle';
// Error: "[runtime not ready]: TypeError: property is not configurable"
// Cause: Worklet property descriptor conflicts with New Architecture
```

**Immediate Mitigation**:
- Use React Native Animated API instead
- Update to Reanimated 4.2.0+ with New Architecture fixes
- Simplify animations to basic transitions

#### 2. Complex Zustand Store Persistence (60% probability)
```typescript
// Specific failure pattern expected:
import { useUserStore } from './src/store/userStore'; // with persistence
// Error: Property descriptor conflicts in AsyncStorage integration
// Cause: Persistence middleware property conflicts
```

**Immediate Mitigation**:
- Use basic stores without persistence initially
- Implement custom persistence without middleware
- Defer complex state management

#### 3. React Navigation Screen Configuration (40% probability)
```typescript
// Specific failure pattern expected:
import { RootNavigator } from './src/navigation/RootNavigator';
// Error: Screen configuration property conflicts
// Cause: Complex screen tree property management
```

**Immediate Mitigation**:
- Start with single screen navigator
- Build navigation tree incrementally
- Use simple screen configurations

#### 4. Chart Rendering with SVG (30% probability)
```typescript
// Specific failure pattern expected:
import { LineChart } from 'react-native-chart-kit';
// Error: SVG property conflicts with New Architecture
// Cause: SVG native property management
```

**Immediate Mitigation**:
- Use View-based simple charts
- Defer complex visualizations
- Text-based data presentation

## Quick Decision Tree

### When Property Descriptor Error Occurs:

```
Property Descriptor Error Detected
├── Is it Reanimated-related?
│   ├── YES → Use RN Animated alternative (HIGH PRIORITY)
│   └── NO → Continue investigation
├── Is it Store/Persistence-related?
│   ├── YES → Use basic stores without persistence
│   └── NO → Continue investigation
├── Is it Navigation-related?
│   ├── YES → Simplify navigation structure
│   └── NO → Continue investigation
└── Is it Chart/SVG-related?
    ├── YES → Use View-based alternatives
    └── NO → Deep component analysis needed
```

## Success Probability by Phase

### Phase Success Rates
```yaml
Tier 1 (Core Infrastructure): 85-95% success rate
Tier 2 (Navigation/State): 70-85% success rate
Tier 3 (Animation/Charts): 40-60% success rate
Tier 4 (Complex Integration): 20-40% success rate
```

### Overall Project Success Scenarios
```yaml
Optimistic (30% probability): All tiers successful with minor fixes
Realistic (50% probability): Tiers 1-2 successful, Tier 3 needs alternatives, Tier 4 simplified
Pessimistic (20% probability): Only Tier 1 successful, major rework needed
```

### Time Investment vs. Success Probability
```yaml
2 hours investment: 85% chance of Tier 1-2 working
4 hours investment: 60% chance of Tier 1-3 working
8 hours investment: 40% chance of full app working
12+ hours investment: Diminishing returns, consider architectural changes
```

## Recommended Implementation Strategy

### Phase 1: High-Success Foundation (2 hours)
1. Focus on Tier 1 + Tier 2 without animations
2. Establish working navigation and basic state
3. Create solid foundation for core functionality

### Phase 2: Animation Alternatives (2-3 hours)
1. Replace reanimated with React Native Animated where possible
2. Implement simplified animations
3. Defer complex animations to post-launch

### Phase 3: Complex Features (4+ hours)
1. Address Tier 4 components systematically
2. Implement alternatives for failing components
3. Maintain clinical accuracy while simplifying implementation

This risk matrix should guide prioritization and help predict where debugging time should be concentrated.