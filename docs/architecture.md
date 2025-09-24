# Being. MBCT App - Architectural Foundation

## Overview

This document describes the core architectural foundation for the Being. MBCT app, designed to enable stable concurrent development while maintaining clinical safety standards.

## Architecture Principles

### 1. Clinical Safety First
- **Error boundaries** at every critical level with crisis-safe fallbacks
- **Therapeutic continuity** maintained even during technical failures
- **Crisis button** access preserved at all times (< 200ms response)
- **Offline-first** design for continuous access to safety resources

### 2. Concurrent Development Safety
- **Factory patterns** prevent property descriptor errors
- **Provider-based architecture** enables safe component isolation
- **Safe import patterns** eliminate module initialization conflicts
- **Context isolation** prevents cross-component interference

### 3. Performance Requirements
- **App launch**: < 2 seconds cold start
- **Crisis response**: < 200ms button to screen
- **Assessment transitions**: < 300ms between steps
- **Breathing timer accuracy**: ±50ms for 60-second cycles
- **Check-in flow**: < 500ms between therapeutic steps

## Core Architecture Components

### 1. Error Boundary System

```typescript
// Comprehensive error handling with clinical safety
<ErrorBoundary context="crisis" enableCrisisFallback={true}>
  <CrisisButton />
</ErrorBoundary>
```

**Features:**
- Context-aware error classification (crisis, assessment, therapeutic, navigation)
- Automatic crisis resource access when errors occur in critical paths
- Local error logging without external dependencies
- Graceful degradation with therapeutic continuity

**Specialized Boundaries:**
- `CrisisErrorBoundary`: Never blocks crisis access
- `AssessmentErrorBoundary`: Preserves assessment data during errors
- `TherapeuticErrorBoundary`: Maintains session state
- `NavigationErrorBoundary`: Provides navigation fallbacks

### 2. Provider Architecture

```typescript
// Hierarchical provider system with error isolation
<AppProviders config={config}>
  <FeatureFlagProvider>
    <ThemeProvider>
      <AppStateProvider>
        <PerformanceProvider>
          <NavigationContainer>
            {/* App content */}
          </NavigationContainer>
        </PerformanceProvider>
      </AppStateProvider>
    </ThemeProvider>
  </FeatureFlagProvider>
</AppProviders>
```

**Provider Hierarchy:**
1. **AppProviders**: Root provider with initialization management
2. **FeatureFlagProvider**: Feature flag system with clinical safety
3. **ThemeProvider**: Therapeutic theme system with time-of-day awareness
4. **AppStateProvider**: Global app state with session management
5. **PerformanceProvider**: Real-time performance monitoring

### 3. Safe Import Patterns

```typescript
// Factory-based service creation
const serviceFactory = createSafeService(
  () => new MyService(),
  (service) => service.isValid(),
  'MyService'
);

// Safe component imports
const SafeComponent = createSafeComponent(
  () => import('./MyComponent'),
  FallbackComponent,
  'MyComponent'
);

// Safe context creation
const { Provider, useContext } = createSafeContext(
  defaultValue,
  'MyContext'
);
```

**Safe Patterns:**
- **Factory functions** over direct instantiation
- **Lazy loading** with error boundaries
- **Defensive property access** with fallbacks
- **Timeout handling** for async operations
- **Validation** at every import boundary

### 4. Context System

#### Feature Flag Context
```typescript
const { isEnabled, requestAccess } = useFeatureFlags();

// Crisis-safe feature access
const { isEnabled, isCrisisCritical } = useCrisisSafeFeature('EMERGENCY_CONTACTS');
```

#### Theme Context
```typescript
const { currentTheme, setTheme } = useTheme();

// Therapeutic theme management
const { isTherapeuticMode, switchToTherapeuticMode } = useTherapeuticTheme();
```

#### App State Context
```typescript
const { currentSession, startSession } = useTherapeuticSession();
const { isCrisisMode, enableCrisisMode } = useCrisisState();
```

#### Performance Context
```typescript
const { measureTherapeuticAction, timingRequirements } = useTherapeuticTiming();
```

## Development Patterns

### 1. Safe Component Development

```typescript
// Component with error boundary
const MyComponent: React.FC<Props> = ({ children }) => (
  <TherapeuticErrorBoundary>
    <div>
      {/* Component content */}
    </div>
  </TherapeuticErrorBoundary>
);

// With performance measurement
const MyComponent: React.FC<Props> = () => {
  const { measureTherapeuticAction } = useTherapeuticTiming();

  useEffect(() => {
    const endMeasurement = measureTherapeuticAction('component_render');
    return endMeasurement;
  }, []);

  return <div>{/* Content */}</div>;
};
```

### 2. Safe Store Integration

```typescript
// Using existing stores with safe patterns
const MyComponent: React.FC = () => {
  const { initializeUser } = useSimpleUserStore();
  const { isCrisisMode } = useCrisisState();

  // Safe store access with error handling
  const userData = safeGet(userStore, 'userData', defaultUserData);
};
```

### 3. Crisis-Safe Development

```typescript
// Always ensure crisis access
const CrisisAwareComponent: React.FC = () => {
  const { isCrisisMode } = useCrisisState();
  const { isEnabled } = useCrisisSafeFeature('EMERGENCY_CONTACTS');

  if (isCrisisMode) {
    return <CrisisInterface />;
  }

  return <RegularInterface />;
};
```

## Concurrent Development Guidelines

### 1. Agent Coordination Patterns

```typescript
// Pattern: Parallel Development
// Multiple agents can work on different contexts simultaneously
{
  agent1: "react" → TherapeuticErrorBoundary,
  agent2: "typescript" → type definitions,
  agent3: "accessibility" → WCAG compliance,
  agent4: "test" → component testing
}

// Pattern: Provider Isolation
// Agents can develop provider-specific functionality
{
  agent1: "feature-flags" → FeatureFlagContext,
  agent2: "theme" → ThemeContext,
  agent3: "performance" → PerformanceContext
}
```

### 2. Safe Development Boundaries

```typescript
// Each agent works within safe boundaries
const AgentBoundary: React.FC<{ agentContext: string }> = ({ children }) => (
  <ErrorBoundary context={agentContext as any}>
    {children}
  </ErrorBoundary>
);
```

### 3. Integration Points

```typescript
// Safe integration between agent work
const IntegratedComponent: React.FC = () => {
  const theme = useTheme(); // Agent 1 work
  const performance = usePerformance(); // Agent 2 work
  const features = useFeatureFlags(); // Agent 3 work

  // Safe integration with error handling
  return (
    <div style={safeGet(theme, 'currentTheme.colors', defaultColors)}>
      {/* Integrated functionality */}
    </div>
  );
};
```

## Testing Strategy

### 1. Provider Testing

```typescript
// Test providers in isolation
const TestWrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
  <MinimalProviders>
    {children}
  </MinimalProviders>
);

// Test with crisis scenarios
const CrisisTestWrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
  <CrisisSafeProviders>
    {children}
  </CrisisSafeProviders>
);
```

### 2. Error Boundary Testing

```typescript
// Test error boundary fallbacks
test('shows crisis fallback during crisis context error', () => {
  const ThrowError = () => {
    throw new Error('Crisis system error');
  };

  render(
    <CrisisErrorBoundary>
      <ThrowError />
    </CrisisErrorBoundary>
  );

  expect(screen.getByText('Crisis Hotline: 988')).toBeInTheDocument();
});
```

### 3. Performance Testing

```typescript
// Test therapeutic timing requirements
test('crisis button responds within 200ms', async () => {
  const { measureCrisisResponse } = useTherapeuticTiming();
  const responseTime = await measureCrisisResponse();

  expect(responseTime).toBeLessThan(200);
});
```

## Migration Strategy

### 1. Incremental Provider Adoption

1. **Phase 1**: Wrap existing App.tsx with AppProviders
2. **Phase 2**: Convert existing stores to use safe patterns
3. **Phase 3**: Add error boundaries to critical paths
4. **Phase 4**: Integrate performance monitoring
5. **Phase 5**: Full provider-based architecture

### 2. Backward Compatibility

```typescript
// Maintain existing store access patterns
export const useSimpleUserStore = createSafeStore(
  () => originalUserStore,
  'SimpleUserStore'
);

// Provide fallbacks for non-provider usage
export const useFeatureFlags = () => {
  try {
    return useFeatureFlagContext();
  } catch {
    return fallbackFeatureFlags;
  }
};
```

## Security Considerations

### 1. Crisis Safety
- Error boundaries never prevent crisis button access
- Crisis resources available even during system failures
- Emergency contact access preserved in all error states

### 2. Data Protection
- Safe property access prevents data exposure through errors
- Context isolation prevents cross-component data leaks
- Error logging excludes sensitive therapeutic data

### 3. Performance Security
- Performance monitoring doesn't log personal data
- Timing measurements exclude content-based information
- Resource usage monitoring maintains user privacy

## Production Readiness

### 1. Performance Monitoring
- Real-time therapeutic timing validation
- Automatic performance degradation alerts
- Battery usage optimization for therapeutic apps

### 2. Error Recovery
- Graceful degradation without therapeutic disruption
- Automatic retry mechanisms for non-critical errors
- Crisis-safe fallback modes

### 3. Deployment Safety
- Provider configuration validation
- Safe feature flag rollout patterns
- Emergency disable mechanisms for problematic features

## Future Enhancements

### 1. Advanced Error Recovery
- Automatic component recovery after errors
- Smart fallback selection based on user state
- Predictive error prevention

### 2. Enhanced Performance
- Adaptive performance based on device capabilities
- Predictive resource allocation for therapeutic flows
- Intelligent battery optimization

### 3. Developer Experience
- Enhanced debugging tools for provider states
- Visual provider dependency mapping
- Automated error boundary testing

---

## Quick Start for Developers

### 1. New Component Development
```typescript
// Use the provider template
import { useTheme, usePerformance } from '../contexts';

const MyComponent: React.FC = () => {
  const theme = useTheme();
  const { measureTherapeuticAction } = usePerformance();

  return (
    <TherapeuticErrorBoundary>
      {/* Your component */}
    </TherapeuticErrorBoundary>
  );
};
```

### 2. New Feature Integration
```typescript
// Check feature flags safely
const { isEnabled } = useFeatureFlags();

if (isEnabled('MY_NEW_FEATURE')) {
  return <NewFeatureComponent />;
}

return <ExistingComponent />;
```

### 3. Crisis-Critical Development
```typescript
// Always use crisis-safe patterns
const { isCrisisMode } = useCrisisState();
const { isEnabled } = useCrisisSafeFeature('EMERGENCY_FEATURE');

// Crisis features are always available
if (isCrisisMode || isEnabled) {
  return <CrisisSafeComponent />;
}
```

This architectural foundation provides the stable base needed for safe concurrent development while maintaining the clinical safety standards required for the Being. MBCT app.