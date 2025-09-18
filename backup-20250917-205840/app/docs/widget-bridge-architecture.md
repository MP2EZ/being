# Widget Bridge Architecture - FullMind MBCT App

## Overview

The Widget Bridge is a comprehensive TypeScript integration layer that connects the FullMind React Native app with native iOS and Android widgets while maintaining clinical-grade privacy and therapeutic effectiveness standards.

## Architecture Components

### 1. Core Services Layer

#### WidgetDataService (`src/services/WidgetDataService.ts`)
- **Purpose**: Privacy-preserving data bridge coordinator
- **Responsibilities**:
  - Generate safe widget data from app state
  - Apply clinical-grade privacy filtering  
  - Handle widget update coordination
  - Process deep link navigation
  - Performance monitoring and error handling

#### WidgetNativeBridgeService (`src/services/WidgetNativeBridge.ts`)
- **Purpose**: Native module communication orchestrator
- **Responsibilities**:
  - Initialize and manage native bridge connections
  - Platform-specific data storage (iOS App Groups, Android SharedPreferences)
  - Widget update triggering (WidgetKit/AppWidget)
  - Health monitoring and error recovery
  - Performance tracking and optimization

#### WidgetIntegrationCoordinator (`src/services/WidgetIntegrationCoordinator.ts`)
- **Purpose**: Master coordinator for all widget functionality
- **Responsibilities**:
  - Initialize complete widget integration system
  - Coordinate between all widget components
  - Monitor system health and performance
  - Handle error recovery and fallback scenarios
  - Manage deep link processing queue

### 2. Store Integration Layer

#### Enhanced CheckInStore (`src/store/checkInStore.ts`)
- **New Methods**:
  - `markWidgetUpdateNeeded()`: Flag widget data for refresh
  - `markWidgetUpdated()`: Track successful widget updates
  - `getWidgetUpdateStatus()`: Get current widget sync state

#### WidgetStoreIntegration (`src/store/widgetIntegration.ts`)
- **Purpose**: Real-time store-to-widget synchronization
- **Features**:
  - Automatic widget updates on check-in state changes
  - Progress tracking and session monitoring
  - Crisis mode detection and priority handling
  - Event-driven architecture with subscription management

### 3. React Hook Layer

#### useWidgetIntegration (`src/hooks/useWidgetIntegration.ts`)
- **Variants**:
  - `useSimpleWidgetIntegration()`: Standard production use
  - `useMinimalWidgetIntegration()`: Performance-optimized
  - `useCrisisAwareWidgetIntegration()`: Enhanced safety monitoring
  - `useTestableWidgetIntegration()`: Development and testing

### 4. Type Safety System

#### Comprehensive Type Definitions (`src/types/widget.ts`)
- **Privacy Types**: Compile-time clinical data prevention
- **Bridge Types**: Native module interface definitions
- **Configuration Types**: Widget behavior customization
- **Error Types**: Structured error handling
- **Performance Types**: Metrics and monitoring

#### Privacy Protection Types
```typescript
// Ensures no clinical data can accidentally be included
export type SafeForWidget<T> = T extends 
  | { phq9: any } 
  | { gad7: any }
  | { assessment: any }
  | { score: any }
  | { suicidal: any }
  ? never 
  : T;

// Widget data must be safe and readonly
export type WidgetSafeData<T> = DeepReadonly<SafeForWidget<T>>;
```

### 5. Testing Infrastructure

#### Comprehensive Test Utilities (`src/utils/widgetTestUtils.ts`)
- **Mock Generation**: Realistic widget data for testing
- **Privacy Validation**: Clinical data leak detection
- **Performance Testing**: Latency and throughput measurement
- **Deep Link Simulation**: URL generation and validation
- **Native Bridge Mocking**: Complete native module simulation

## Privacy and Security Architecture

### Clinical Data Protection

1. **Compile-Time Safety**:
   ```typescript
   // This will not compile - prevents accidents
   const unsafeData: WidgetSafeData<{ phq9Score: number }> = widgetData; // Error!
   ```

2. **Runtime Validation**:
   - Pattern matching for clinical terms
   - Personal information detection
   - Data size limit enforcement
   - Encryption hash verification

3. **Multi-Layer Filtering**:
   - Store → Service → Native Bridge
   - Each layer validates data independently
   - Fail-safe approach with privacy-first defaults

### Security Measures

- **Deep Link Validation**: URL scheme and parameter verification
- **Native Bridge Authentication**: Module availability and health checks
- **Data Integrity**: Encryption hashes and tampering detection
- **Error Boundary Isolation**: Component failures don't expose data

## Performance Architecture

### Update Optimization

1. **Intelligent Throttling**:
   - 1-minute minimum intervals for standard updates
   - Priority-based throttle bypassing for crisis scenarios
   - Batch operations to prevent widget spam

2. **Performance Monitoring**:
   ```typescript
   interface WidgetPerformanceMetrics {
     updateLatencyMs: number;
     nativeCallLatencyMs: number;
     dataSerializationMs: number;
     privacyValidationMs: number;
     totalOperationMs: number;
   }
   ```

3. **Lazy Loading and Caching**:
   - Native bridge initialized on demand
   - Widget data cached with TTL
   - Background health monitoring

## Integration Patterns

### 1. App Startup Integration
```typescript
// In App.tsx or main component
import { WidgetIntegrationUtils } from './src/services/widgets';

export default function App() {
  useEffect(() => {
    WidgetIntegrationUtils.initializeForApp();
    
    return () => {
      WidgetIntegrationUtils.cleanup();
    };
  }, []);
  
  // ... rest of app
}
```

### 2. Component Integration
```typescript
// In check-in components
import { useSimpleWidgetIntegration } from './src/services/widgets';

export function CheckInScreen() {
  const {
    widgetData,
    isUpdating,
    error,
    updateWidgetData
  } = useSimpleWidgetIntegration();
  
  // Widget automatically updates when check-in completes
  // Error handling and loading states managed automatically
}
```

### 3. Deep Link Handling
```typescript
// In navigation setup
import { WidgetIntegrationUtils } from './src/services/widgets';

// Handle deep links from widgets
Linking.addEventListener('url', (event) => {
  WidgetIntegrationUtils.handleDeepLink(event.url);
});
```

## Clinical Compliance Features

### MBCT Therapeutic Standards
- Session progress tracking without clinical content exposure
- Crisis detection and priority routing
- Time estimation for therapeutic planning
- Completion status for habit formation

### HIPAA Awareness
- No personal health information (PHI) in widget data
- Encrypted local storage with secure cleanup
- Audit trail for data access and updates
- Compliance validation in CI/CD pipeline

## Error Handling Strategy

### Three-Tier Error Recovery

1. **Component Level**: Graceful degradation with fallback UI
2. **Service Level**: Retry logic with exponential backoff
3. **System Level**: Health monitoring with auto-recovery

### Error Types and Handling
```typescript
export type WidgetErrorCode =
  | 'NATIVE_MODULE_NOT_AVAILABLE'    // Fallback to local storage
  | 'PRIVACY_VIOLATION'              // Block operation, log violation
  | 'INVALID_DATA_FORMAT'            // Regenerate data
  | 'NAVIGATION_FAILED'              // Navigate to safe fallback
  | 'UPDATE_THROTTLED'               // Queue for next interval
  | 'STORAGE_FAILED'                 // Use backup storage method
  | 'DEEP_LINK_INVALID'              // Navigate to home
  | 'CRISIS_NAVIGATION_FAILED';      // Emergency fallback
```

## Deployment Integration

### Native Module Requirements

#### iOS (WidgetKit)
- App Groups configuration for data sharing
- Widget extension with Swift/Objective-C bridge
- Info.plist entries for deep link handling

#### Android (AppWidget)
- Widget provider class with update handling
- Broadcast receiver for widget lifecycle
- Manifest entries for widget registration

### Build Configuration
```json
{
  "expo": {
    "plugins": [
      "./plugins/expo-fullmind-widgets.js"
    ]
  }
}
```

## Monitoring and Analytics

### Health Monitoring
- Native bridge availability and response times
- Widget update success/failure rates
- Privacy validation metrics
- Deep link processing statistics

### Performance Tracking
- Update latency (target: <1000ms)
- Memory usage during operations
- Battery impact assessment
- Error recovery success rates

### Privacy Auditing
- Automated scans for clinical data patterns
- Manual review checkpoints in CI/CD
- Compliance violation alerts
- Regular security assessments

## Development Workflow

### Testing Strategy
1. **Unit Tests**: Individual component functionality
2. **Integration Tests**: End-to-end widget flows
3. **Privacy Tests**: Clinical data leak prevention
4. **Performance Tests**: Latency and resource usage
5. **Manual Tests**: Real device widget functionality

### Code Quality Gates
- TypeScript strict mode enforcement
- Privacy violation prevention (compile + runtime)
- Performance threshold validation
- Clinical accuracy verification

## Future Enhancements

### Planned Features
- Widget customization (size, appearance)
- Advanced analytics and insights
- Multi-language support for widgets
- Enhanced accessibility features

### Scalability Considerations
- Support for additional widget types
- Cross-platform widget framework
- Cloud synchronization integration
- Advanced personalization algorithms

## Conclusion

The Widget Bridge Architecture provides a robust, secure, and performant foundation for native widget integration in the FullMind MBCT app. By prioritizing clinical-grade privacy protection, therapeutic effectiveness, and user safety, this implementation ensures that widgets enhance the therapeutic experience without compromising sensitive mental health data.

The architecture's modular design, comprehensive testing, and multi-layer error handling make it production-ready for deployment to app stores while maintaining the high standards required for mental health applications.