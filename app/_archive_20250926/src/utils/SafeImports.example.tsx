/**
 * SafeImports Enhanced Usage Examples
 *
 * Demonstrates how to use the enhanced SafeImports with New Architecture compatibility
 * and therapeutic safety features for Being. MBCT App
 */

import React, { ReactNode } from 'react';
import { View, Text, Button } from 'react-native';
import {
  createSafeContext,
  createSafeContextEnhanced,
  createTherapeuticContext,
  createCrisisContext,
  detectNewArchitecture,
  SafeContextStatusType,
  FallbackStrategy,
  type SafeContextConfig,
  type PerformanceMetrics
} from './SafeImports';

// ============================================================================
// Example 1: Backwards Compatible Usage (Existing Code)
// ============================================================================

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  therapeuticReminders: boolean;
}

// This works exactly as before - no changes needed for existing code
const UserSettingsContext = createSafeContext<UserSettings>(
  {
    theme: 'system',
    notifications: true,
    therapeuticReminders: true
  },
  'UserSettings'
);

// Usage remains the same
const UserSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = React.useState<UserSettings>({
    theme: 'light',
    notifications: true,
    therapeuticReminders: true
  });

  return (
    <UserSettingsContext.Provider value={settings}>
      {children}
    </UserSettingsContext.Provider>
  );
};

// ============================================================================
// Example 2: Enhanced Context with Performance Monitoring
// ============================================================================

interface AppState {
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
}

const appStateConfig: SafeContextConfig<AppState> = {
  defaultValue: {
    isLoading: false,
    error: null,
    lastSync: null
  },
  contextName: 'AppState',
  enablePerformanceTracking: true,
  maxRenderTime: 16, // 60fps requirement
  warnOnSlowRender: true,
  enableTurboModuleOptimization: true,
  enableFabricOptimization: true,
  preventPropertyDescriptorConflicts: true,
  onPerformanceWarning: (metrics: PerformanceMetrics) => {
    console.warn('App state render performance warning:', metrics);
  }
};

const AppStateContext = createSafeContextEnhanced(appStateConfig);

// Enhanced Provider with performance monitoring
const AppStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appState, setAppState] = React.useState<AppState>({
    isLoading: false,
    error: null,
    lastSync: new Date()
  });

  return (
    <AppStateContext.Provider value={appState}>
      {children}
    </AppStateContext.Provider>
  );
};

// Usage with enhanced features
const AppStateDisplay: React.FC = () => {
  const appState = AppStateContext.useContext();
  const status = AppStateContext.useContextWithStatus();
  const optimizedAppState = AppStateContext.useContextOptimized(); // New Architecture optimized

  return (
    <View>
      <Text>App Status: {status.status}</Text>
      <Text>Performance: {status.performance.averageRenderTime.toFixed(2)}ms</Text>
      <Text>Healthy: {status.isHealthy ? 'Yes' : 'No'}</Text>
      <Text>Loading: {appState.isLoading ? 'Yes' : 'No'}</Text>
    </View>
  );
};

// ============================================================================
// Example 3: Therapeutic Context for MBCT Features
// ============================================================================

interface TherapeuticSession {
  sessionId: string;
  startTime: Date;
  currentExercise: string;
  mindfulnessLevel: number; // 1-10
  breathingPattern: 'inhale' | 'hold' | 'exhale' | 'pause';
}

// Pre-configured for therapeutic safety and performance
const TherapeuticSessionContext = createTherapeuticContext<TherapeuticSession>(
  {
    sessionId: '',
    startTime: new Date(),
    currentExercise: 'breathing',
    mindfulnessLevel: 5,
    breathingPattern: 'pause'
  },
  'TherapeuticSession',
  {
    // Additional therapeutic-specific config
    validator: (session) => {
      return session.mindfulnessLevel >= 1 && session.mindfulnessLevel <= 10;
    },
    sanitizer: (session) => ({
      ...session,
      mindfulnessLevel: Math.max(1, Math.min(10, session.mindfulnessLevel))
    }),
    onPerformanceWarning: (metrics) => {
      console.warn('Therapeutic session performance issue:', metrics);
      // Could trigger fallback to simpler breathing animation
    }
  }
);

// Therapeutic Provider with strict performance requirements
const TherapeuticSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = React.useState<TherapeuticSession>({
    sessionId: 'session-' + Date.now(),
    startTime: new Date(),
    currentExercise: 'breathing-circle',
    mindfulnessLevel: 7,
    breathingPattern: 'inhale'
  });

  return (
    <TherapeuticSessionContext.Provider value={session}>
      {children}
    </TherapeuticSessionContext.Provider>
  );
};

// Usage with therapeutic safety monitoring
const BreathingExercise: React.FC = () => {
  const session = TherapeuticSessionContext.useContext();
  const sessionStatus = TherapeuticSessionContext.useContextWithStatus();

  // Monitor therapeutic performance
  React.useEffect(() => {
    if (sessionStatus.status === SafeContextStatusType.PERFORMANCE_WARNING) {
      console.log('Switching to performance-optimized breathing animation');
    }
  }, [sessionStatus.status]);

  return (
    <View>
      <Text>Current Exercise: {session.currentExercise}</Text>
      <Text>Breathing: {session.breathingPattern}</Text>
      <Text>Mindfulness Level: {session.mindfulnessLevel}/10</Text>
      <Text>Session Health: {sessionStatus.isHealthy ? '✓' : '⚠️'}</Text>
    </View>
  );
};

// ============================================================================
// Example 4: Crisis Context for Emergency Situations
// ============================================================================

interface CrisisState {
  isActive: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggeredAt: Date | null;
  interventionType: 'breathing' | 'grounding' | 'emergency-contact' | 'hotline';
  emergencyContactReady: boolean;
}

// Pre-configured for crisis response with ultra-fast performance
const CrisisContext = createCrisisContext<CrisisState>(
  {
    isActive: false,
    severity: 'low',
    triggeredAt: null,
    interventionType: 'breathing',
    emergencyContactReady: false
  },
  'CrisisState',
  {
    // Crisis-specific configuration
    validator: (state) => {
      // Validate crisis state is coherent
      return !state.isActive || (state.isActive && state.triggeredAt !== null);
    },
    onError: (error) => {
      console.error('CRITICAL: Crisis context error:', error);
      // Could trigger fallback emergency protocols
    },
    onRetry: (attempt, maxRetries) => {
      console.log(`Crisis context retry ${attempt}/${maxRetries}`);
    }
  }
);

// Crisis Provider with emergency error handling
const CrisisProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [crisisState, setCrisisState] = React.useState<CrisisState>({
    isActive: false,
    severity: 'low',
    triggeredAt: null,
    interventionType: 'breathing',
    emergencyContactReady: true
  });

  // Crisis detection logic would go here
  const triggerCrisis = (severity: CrisisState['severity']) => {
    setCrisisState({
      isActive: true,
      severity,
      triggeredAt: new Date(),
      interventionType: severity === 'critical' ? 'emergency-contact' : 'breathing',
      emergencyContactReady: true
    });
  };

  return (
    <CrisisContext.Provider value={crisisState}>
      {children}
    </CrisisContext.Provider>
  );
};

// Usage with crisis response monitoring
const CrisisButton: React.FC = () => {
  const crisisState = CrisisContext.useContext();
  const crisisStatus = CrisisContext.useContextWithStatus();

  // Monitor crisis response performance (must be <8ms)
  React.useEffect(() => {
    if (crisisStatus.performance.renderTime > 8) {
      console.warn('CRITICAL: Crisis button render too slow:', crisisStatus.performance.renderTime);
    }
  }, [crisisStatus.performance.renderTime]);

  return (
    <View style={{
      backgroundColor: crisisState.isActive ? '#FF0000' : '#FF6B6B',
      padding: 20,
      borderRadius: 8
    }}>
      <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
        {crisisState.isActive ? 'Crisis Active' : 'Crisis Support'}
      </Text>
      <Text style={{ color: 'white' }}>
        Status: {crisisStatus.status}
      </Text>
      <Text style={{ color: 'white', fontSize: 12 }}>
        Performance: {crisisStatus.performance.renderTime.toFixed(1)}ms
      </Text>
    </View>
  );
};

// ============================================================================
// Example 5: New Architecture Detection and Optimization
// ============================================================================

const ArchitectureOptimizationExample: React.FC = () => {
  const [architecture, setArchitecture] = React.useState(detectNewArchitecture());

  React.useEffect(() => {
    const arch = detectNewArchitecture();
    setArchitecture(arch);

    console.log('React Native Architecture:', arch);

    if (arch.version === 'new-architecture') {
      console.log('✓ New Architecture detected - enabling optimizations');
    } else if (arch.version === 'partial-new-architecture') {
      console.log('⚠️ Partial New Architecture - some optimizations available');
    } else {
      console.log('ℹ️ Legacy architecture - using fallback patterns');
    }
  }, []);

  return (
    <View>
      <Text>Architecture Version: {architecture.version}</Text>
      <Text>TurboModules: {architecture.hasTurboModules ? '✓' : '✗'}</Text>
      <Text>Fabric: {architecture.hasFabric ? '✓' : '✗'}</Text>
      <Text>Property Descriptor Support: {architecture.hasPropertyDescriptorSupport ? '✓' : '✗'}</Text>
    </View>
  );
};

// ============================================================================
// Complete Example App Using All Features
// ============================================================================

const ExampleApp: React.FC = () => {
  return (
    <UserSettingsProvider>
      <AppStateProvider>
        <TherapeuticSessionProvider>
          <CrisisProvider>
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
                Being. MBCT App - Enhanced SafeImports Demo
              </Text>

              <ArchitectureOptimizationExample />

              <View style={{ marginVertical: 20 }}>
                <AppStateDisplay />
              </View>

              <View style={{ marginVertical: 20 }}>
                <BreathingExercise />
              </View>

              <View style={{ marginVertical: 20 }}>
                <CrisisButton />
              </View>
            </View>
          </CrisisProvider>
        </TherapeuticSessionProvider>
      </AppStateProvider>
    </UserSettingsProvider>
  );
};

export default ExampleApp;