# Being. Security Foundations

Comprehensive security architecture for the Being. MBCT app, designed specifically for clinical-grade mental health applications with strict data protection requirements.

## Architecture Overview

```
app/src/security/
├── core/
│   └── SecurityFoundations.ts     # Core security utilities and incident handling
├── hooks/
│   └── SecurityMonitoringHooks.ts # React hooks for security monitoring
├── context/
│   └── SecureContextFactory.ts    # Secure React context creation
├── middleware/
│   └── InputValidationMiddleware.ts # Input validation and sanitization
├── index.ts                       # Main exports and API
└── README.md                      # This file
```

## Key Features

### 🔒 Clinical Data Protection
- **AES-256-GCM encryption** for all clinical data
- **Zero-knowledge architecture** ready
- **PII detection** and automatic redaction
- **HIPAA-compliant** logging and audit trails

### 🛡️ Security Monitoring
- **Real-time threat detection**
- **Memory leak prevention**
- **Performance monitoring** with security implications
- **Incident reporting** with sanitized logging

### 🔍 Input Validation
- **Multi-layer validation** pipeline
- **Injection attack prevention**
- **Clinical data format validation**
- **Rate limiting** and abuse detection

### 🧠 Memory Security
- **Automatic cleanup** of sensitive operations
- **Timeout handling** for all async operations
- **Memory pressure monitoring**
- **Safe garbage collection**

## Quick Start

### Basic Security Setup

```typescript
import { BeingSecurityAPI, DataSensitivity } from '../security';

// Initialize security for your component
const { Clinical, Input, Memory } = BeingSecurityAPI;

// Encrypt clinical data
const encryptedData = await Clinical.encrypt(assessmentData, 'phq9_assessment');

// Validate user input
const validation = await Input.validate(userInput, 'user_text', {
  sensitivity: DataSensitivity.PERSONAL,
  operation: 'create',
  source: 'user_input',
  sessionId: 'current_session'
});

// Register memory operation
const operationId = 'my_operation';
Memory.register(operationId, () => {
  // Cleanup logic
});
```

### Using Security Hooks

```typescript
import { useSecurityMonitoring, useClinicalDataSecurity } from '../security';

function MyComponent() {
  // Monitor security in real-time
  const { metrics, isSecure, threats } = useSecurityMonitoring();

  // Secure clinical data operations
  const { encrypt, decrypt, isSecure: dataSecure } = useClinicalDataSecurity();

  // Handle clinical data
  const handleAssessment = async (data) => {
    const encrypted = await encrypt(data, 'assessment_context');
    // Store encrypted data...
  };

  return (
    <div>
      {!isSecure && <SecurityAlert threats={threats} />}
      {/* Your component content */}
    </div>
  );
}
```

### Creating Secure Contexts

```typescript
import { createClinicalAssessmentContext } from '../security';

// Create secure context for clinical assessments
const { Provider, useSecureContext } = createClinicalAssessmentContext(
  null, // default value
  'PHQ9Assessment'
);

function AssessmentProvider({ children }) {
  return (
    <Provider initialValue={null}>
      {children}
    </Provider>
  );
}

function AssessmentComponent() {
  const { data, updateData, isSecure } = useSecureContext();

  const handleResponse = async (response) => {
    await updateData(prev => ({
      ...prev,
      responses: [...(prev?.responses || []), response]
    }));
  };

  return (
    <div>
      {!isSecure && <div>Security validation failed</div>}
      {/* Assessment UI */}
    </div>
  );
}
```

## Security Error Boundaries

Enhanced error boundaries with clinical safety protocols:

```typescript
import { CrisisErrorBoundary, AssessmentErrorBoundary } from '../security';

function App() {
  return (
    <CrisisErrorBoundary>
      <AssessmentErrorBoundary>
        <AssessmentScreen />
      </AssessmentErrorBoundary>
    </CrisisErrorBoundary>
  );
}
```

## Security Configuration

### Data Sensitivity Levels

```typescript
enum DataSensitivity {
  CLINICAL = 'clinical',      // PHQ-9/GAD-7, crisis plans
  PERSONAL = 'personal',      // Check-ins, mood data
  THERAPEUTIC = 'therapeutic', // User preferences, patterns
  SYSTEM = 'system'           // App settings, notifications
}
```

### Validation Rules

```typescript
import { inputValidationMiddleware } from '../security';

// Register custom validation rule
inputValidationMiddleware.registerRule('custom_type', {
  name: 'MyCustomValidation',
  priority: 'high',
  applicableTypes: ['custom_type'],
  validate: async (value, context) => {
    // Your validation logic
    return {
      isValid: true,
      errors: [],
      warnings: [],
      confidence: 1.0,
      processingTime: 0
    };
  }
});
```

## Advanced Usage

### Security Monitoring Dashboard

```typescript
import { useSecurityMonitoring } from '../security';

function SecurityDashboard() {
  const { metrics, incidents, actions } = useSecurityMonitoring({
    enabled: true,
    checkInterval: 5000,
    autoCleanup: true
  });

  const handleClearIncidents = () => {
    actions.clearIncidents();
  };

  const generateReport = async () => {
    const report = await actions.getDetailedReport();
    console.log('Security Report:', report);
  };

  return (
    <div>
      <h3>Security Status: {metrics.incidents.critical === 0 ? '✅ Secure' : '⚠️ Issues'}</h3>
      <p>Total Incidents: {metrics.incidents.total}</p>
      <p>Memory Pressure: {metrics.memory.pressure}</p>
      <p>Encryption Error Rate: {(metrics.encryption.errorRate * 100).toFixed(2)}%</p>

      <button onClick={handleClearIncidents}>Clear Incidents</button>
      <button onClick={generateReport}>Generate Report</button>
    </div>
  );
}
```

### Custom Secure Service

```typescript
import { SecurityFoundations } from '../security';

// Create secure service factory
const createSecureDataService = SecurityFoundations.createSecureService(
  () => new DataService(),
  {
    serviceName: 'DataService',
    timeout: 10000,
    validator: (service) => service.isInitialized(),
    memoryCleanup: (service) => service.cleanup()
  }
);

// Use the service
const dataService = createSecureDataService.create();
```

## Security Best Practices

### 1. Always Validate Input
```typescript
// ❌ Don't do this
const saveData = (data) => {
  storage.save(data);
};

// ✅ Do this
const saveData = async (data) => {
  const validation = await Input.validate(data, 'user_data', context);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }
  const sanitized = Input.sanitize(data, 'user_data', context);
  storage.save(sanitized);
};
```

### 2. Handle Sensitive Data Properly
```typescript
// ❌ Don't do this
console.log('Assessment data:', assessmentData);

// ✅ Do this
if (__DEV__) {
  console.log('Assessment saved (data not logged for security)');
}
```

### 3. Use Secure Contexts for Clinical Data
```typescript
// ❌ Don't do this
const [clinicalData, setClinicalData] = useState(null);

// ✅ Do this
const { Provider } = createClinicalAssessmentContext(null);
// Use secure context with built-in encryption and validation
```

### 4. Register Memory Operations
```typescript
// ❌ Don't do this
const processData = async (data) => {
  const result = await heavyProcessing(data);
  return result;
};

// ✅ Do this
const processData = async (data) => {
  const operationId = 'data_processing_' + Date.now();
  Memory.register(operationId, () => {
    // Cleanup logic
  });

  try {
    const result = await heavyProcessing(data);
    return result;
  } finally {
    Memory.unregister(operationId);
  }
};
```

## Performance Considerations

- **Validation caching**: Repeated validations are cached for performance
- **Rate limiting**: Prevents abuse while maintaining user experience
- **Memory monitoring**: Automatic cleanup prevents memory leaks
- **Async operations**: All security operations use timeouts

## Monitoring and Debugging

### Development Mode
In development mode, additional security utilities are available:

```typescript
import { SecurityDevUtils } from '../security';

if (__DEV__ && SecurityDevUtils) {
  // Test security incident
  SecurityDevUtils.testIncident();

  // Get detailed status
  const status = await SecurityDevUtils.getDetailedStatus();

  // Clear security data
  SecurityDevUtils.clearSecurityData();
}
```

### Production Monitoring
In production, security incidents are logged with sanitized data:

```typescript
// Security incidents are automatically logged
// Check app logs for entries like:
// [SECURITY] INJECTION_ATTEMPT: context_input_validation
// [AUDIT] Context updated: ClinicalAssessment
```

## Clinical Compliance

This security architecture supports:

- **HIPAA Technical Safeguards** (45 CFR 164.312)
- **NIST Cybersecurity Framework**
- **OWASP Mobile Security** best practices
- **Clinical data isolation** and protection
- **Audit logging** for compliance reporting

## Integration with Existing Services

The security foundations integrate seamlessly with:

- **EncryptionService**: Enhanced with security monitoring
- **ErrorBoundary**: Upgraded with secure incident logging
- **SafeImports**: Extended with security-aware factories
- **Store Management**: Secure context patterns for Zustand

## Troubleshooting

### Common Issues

1. **High Memory Pressure**: Use `Memory.cleanup()` to force cleanup
2. **Validation Failures**: Check input against registered rules
3. **Encryption Errors**: Verify EncryptionService initialization
4. **Rate Limiting**: Reduce validation frequency or increase limits

### Debug Information

```typescript
// Get security health
const health = BeingSecurityAPI.Incidents.getHealth();
console.log('Security Health:', health);

// Get memory stats
const memory = BeingSecurityAPI.Memory.stats();
console.log('Memory Stats:', memory);

// Get validation stats
const validation = inputValidationMiddleware.getValidationStats();
console.log('Validation Stats:', validation);
```

## Contributing

When adding new security features:

1. Follow the existing patterns for error handling
2. Always sanitize data before logging
3. Use SecurityFoundations.handleIncident for all security events
4. Add appropriate TypeScript types
5. Include comprehensive validation rules
6. Test with clinical data scenarios

## Security Updates

This security architecture is designed to be:
- **Extensible**: Easy to add new validation rules and security features
- **Maintainable**: Clear separation of concerns and comprehensive documentation
- **Auditable**: Full audit trails and incident logging
- **Compliant**: Meets clinical and regulatory requirements