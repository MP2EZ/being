# Accessibility Implementation Guide - Webhook UI Components
*Developer Reference for Maintaining WCAG AA Compliance in Mental Health Payment Systems*

**Generated**: 2025-01-27
**Target Audience**: React Native developers, accessibility engineers, mental health app developers
**Context**: FullMind MBCT app payment system accessibility maintenance

---

## Quick Reference

### 🚨 **Critical Accessibility Requirements**

```typescript
// Required accessibility props for all payment components
interface RequiredAccessibilityProps {
  readonly accessibilityLabel: string; // ALWAYS required
  readonly testID: string; // Required for testing
  readonly accessibilityRole?: 'button' | 'text' | 'image' | 'header';
  readonly accessibilityState?: {
    readonly disabled?: boolean;
    readonly selected?: boolean;
    readonly busy?: boolean;
  };
}

// Crisis safety requirements
interface CrisisSafetyProps {
  readonly maxResponseTimeMs?: number; // Default: 200ms
  readonly onPerformanceViolation?: (duration: number, operation: string) => void;
  readonly crisisMode?: boolean; // Activates crisis accessibility patterns
}
```

### 🎯 **Touch Target Requirements**

```typescript
// WCAG AA minimum touch targets
const TOUCH_TARGETS = {
  minimum: 44,     // WCAG AA requirement
  recommended: 48, // Mobile optimized
  crisis: 56,      // Emergency scenarios
  payment: 72      // Important payment actions
};

// StyleSheet example
const styles = StyleSheet.create({
  paymentButton: {
    minHeight: 72, // ✅ Exceeds WCAG AA requirement
    minWidth: 72,
    padding: spacing.md,
  }
});
```

### 🎨 **Color Contrast Requirements**

```typescript
// WCAG AA contrast ratios (from color system)
const CONTRAST_REQUIREMENTS = {
  normalText: 4.5,    // 4.5:1 minimum
  largeText: 3.0,     // 3:1 for 18pt+ text
  uiComponents: 3.0,  // 3:1 for UI elements
  crisis: 7.0,        // 7:1 for emergency elements
};
```

---

## Component Implementation Patterns

### 1. PaymentStatusIndicator Implementation

#### ✅ **Complete Accessibility Implementation**

```typescript
interface PaymentStatusIndicatorProps {
  // Required accessibility props
  readonly accessibilityLabel: string;
  readonly testID: string;

  // Optional but recommended
  readonly accessibilityHint?: string;
  readonly accessibilityRole?: 'button' | 'text';
  readonly accessibilityState?: {
    readonly disabled?: boolean;
    readonly selected?: boolean;
    readonly busy?: boolean;
  };

  // Crisis safety
  readonly crisisMode?: boolean;
  readonly maxResponseTimeMs?: number;
  readonly onPerformanceViolation?: (duration: number, operation: string) => void;
}

export const PaymentStatusIndicator: React.FC<PaymentStatusIndicatorProps> = ({
  accessibilityLabel,
  testID,
  ...props
}) => {
  // ✅ Dynamic accessibility label with therapeutic context
  const enhancedAccessibilityLabel = useMemo(() => {
    return `${statusInfo.title}. ${statusInfo.subtitle}${
      statusInfo.therapeutic ? '. Your therapeutic access is protected.' : ''
    }`;
  }, [statusInfo]);

  // ✅ Performance monitoring for crisis safety
  const handlePress = async () => {
    const startTime = Date.now();
    await onPress();

    const duration = Date.now() - startTime;
    if (duration > maxResponseTimeMs && onPerformanceViolation) {
      onPerformanceViolation(duration, 'payment-status-press');
    }
  };

  // ✅ Proper touch target sizing
  const styles = StyleSheet.create({
    container: {
      minHeight: 72, // Exceeds WCAG AA 44px requirement
      padding: spacing.md,
    }
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      accessible={true}
      accessibilityRole={isClickable ? 'button' : 'text'}
      accessibilityLabel={enhancedAccessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      testID={testID}
    >
      {/* Component content */}
    </TouchableOpacity>
  );
};
```

#### 🎯 **Key Implementation Points**

1. **Required Props Enforcement**:
   ```typescript
   // TypeScript enforces accessibility requirements
   readonly accessibilityLabel: string; // NOT optional
   readonly testID: string; // Required for testing
   ```

2. **Dynamic Label Generation**:
   ```typescript
   // Labels adapt to current state and include therapeutic context
   const accessibilityLabel = `${statusInfo.title}. ${statusInfo.subtitle}${
     statusInfo.therapeutic ? '. Your therapeutic access is protected.' : ''
   }`;
   ```

3. **Performance Monitoring**:
   ```typescript
   // Crisis safety requires <200ms response times
   const duration = Date.now() - startTime;
   if (duration > maxResponseTimeMs && onPerformanceViolation) {
     onPerformanceViolation(duration, 'payment-status-press');
   }
   ```

### 2. Modal Accessibility Implementation (PaymentErrorModal)

#### ✅ **Complete Modal Accessibility**

```typescript
export const PaymentErrorModal: React.FC<PaymentErrorModalProps> = ({
  visible,
  onClose,
  accessibilityLabel,
  accessibilityViewIsModal = true,
  onAccessibilityEscape,
  ...props
}) => {
  // ✅ Focus management
  const modalRef = useRef<View>(null);

  useEffect(() => {
    if (visible) {
      // Set initial focus to modal
      AccessibilityInfo.setAccessibilityFocus(modalRef.current);
    }
  }, [visible]);

  // ✅ Escape handling
  const handleModalClose = () => {
    onClose();
    // Restore focus to trigger element if needed
    onAccessibilityEscape?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleModalClose}
      accessible={true}
      accessibilityViewIsModal={accessibilityViewIsModal}
      accessibilityLabel={accessibilityLabel}
    >
      <SafeAreaView style={styles.container}>
        <View ref={modalRef} accessible={true} accessibilityRole="dialog">
          {/* Modal content with proper focus order */}

          {/* Close button first in focus order */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleModalClose}
            accessibilityLabel="Close payment error dialog"
            accessibilityRole="button"
          >
            <Text>Close</Text>
          </TouchableOpacity>

          {/* Error content with proper heading hierarchy */}
          <View accessibilityRole="header">
            <Text style={styles.errorTitle}>Payment Issue</Text>
          </View>

          {/* Solution buttons with proper labeling */}
          {solutions.map((solution) => (
            <TouchableOpacity
              key={solution.id}
              style={styles.solutionButton}
              onPress={solution.action}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${solution.title}. ${solution.description}`}
            >
              <Text>{solution.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </Modal>
  );
};
```

#### 🎯 **Modal Accessibility Checklist**

- ✅ **Focus Management**: Initial focus set to modal content
- ✅ **Escape Routes**: Multiple ways to close modal (close button, back gesture)
- ✅ **Focus Trapping**: Focus contained within modal when open
- ✅ **Screen Reader Announcements**: Modal purpose announced when opened
- ✅ **Keyboard Navigation**: All interactive elements accessible via keyboard

### 3. Real-time Updates (WebhookLoadingStates)

#### ✅ **Live Region Implementation**

```typescript
export const WebhookLoadingStates: React.FC<WebhookLoadingStatesProps> = ({
  accessibilityLabel,
  accessibilityLiveRegion = 'polite',
  announceUpdates = true,
  ...props
}) => {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    type: 'idle',
    message: ''
  });

  // ✅ Live region for real-time updates
  useEffect(() => {
    if (announceUpdates && processingState.message) {
      AccessibilityInfo.announceForAccessibility(
        `${processingState.message}. ${processingState.subMessage || ''}`
      );
    }
  }, [processingState, announceUpdates]);

  return (
    <View
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion={accessibilityLiveRegion}
      accessibilityRole="status"
    >
      {/* Processing content with therapeutic messaging */}
      <Text style={styles.primaryMessage}>
        {processingState.message}
      </Text>

      {processingState.therapeutic && (
        <Text style={styles.therapeuticBadge}>
          🛡️ Therapeutic access protected
        </Text>
      )}
    </View>
  );
};
```

#### 🎯 **Live Region Best Practices**

1. **Appropriate Announcement Levels**:
   ```typescript
   // Use 'polite' for non-urgent updates
   accessibilityLiveRegion="polite"

   // Use 'assertive' only for urgent/error states
   accessibilityLiveRegion="assertive"
   ```

2. **Therapeutic Context in Announcements**:
   ```typescript
   // Include reassuring context in all announcements
   const announcement = `${processingState.message}. Your therapeutic access continues safely.`;
   AccessibilityInfo.announceForAccessibility(announcement);
   ```

---

## Therapeutic Messaging Patterns

### 🛡️ **Crisis-Safe Error Messages**

```typescript
// ❌ Anxiety-inducing messaging
const badErrorMessage = {
  title: "Payment Failed",
  message: "Your subscription has been cancelled. Access denied.",
  action: "Pay immediately to restore access"
};

// ✅ Therapeutic messaging
const therapeuticErrorMessage = {
  title: "Payment Attention Needed",
  message: "Your mindful practice continues safely while we resolve this.",
  therapeuticContext: "Your therapeutic access is protected.",
  action: "Resolve when ready"
};
```

### 💚 **Grace Period Messaging**

```typescript
// Example therapeutic grace period messaging
const getGracePeriodMessage = (daysRemaining: number) => {
  if (daysRemaining <= 1) {
    return {
      title: "Final Day of Therapeutic Continuity",
      message: "Your mindful practice continues today. Please resolve payment when ready.",
      therapeutic: "Your wellbeing remains our priority. Take time to breathe and address this mindfully."
    };
  }

  return {
    title: "Therapeutic Continuity Active",
    message: `${daysRemaining} days of uninterrupted access while resolving payment.`,
    therapeutic: "Your mindful journey continues safely. No rush - address payment when ready."
  };
};
```

### 🧠 **Cognitive Load Reduction**

```typescript
// ✅ Progressive disclosure for complex information
const [showDetails, setShowDetails] = useState(false);

return (
  <View>
    {/* Simple summary first */}
    <Text accessibilityRole="header">
      Your Practice Continues Safely
    </Text>

    {/* Expandable details */}
    <TouchableOpacity
      onPress={() => setShowDetails(!showDetails)}
      accessibilityLabel={`${showDetails ? 'Hide' : 'Show'} detailed information`}
      accessibilityState={{ expanded: showDetails }}
    >
      <Text>Learn more</Text>
    </TouchableOpacity>

    {showDetails && (
      <View>
        {/* Detailed information */}
      </View>
    )}
  </View>
);
```

---

## Performance and Crisis Safety

### ⚡ **Response Time Monitoring**

```typescript
// Performance monitoring for crisis safety
const usePerformanceMonitoring = (threshold: number = 200) => {
  const trackPerformance = useCallback(async (operation: string, action: () => Promise<void>) => {
    const startTime = Date.now();

    try {
      await action();
    } finally {
      const duration = Date.now() - startTime;

      if (duration > threshold) {
        // Log performance violation
        console.warn(`Performance violation: ${operation} took ${duration}ms (threshold: ${threshold}ms)`);

        // Report to analytics
        analytics.track('accessibility_performance_violation', {
          operation,
          duration,
          threshold,
          timestamp: new Date().toISOString()
        });
      }
    }
  }, [threshold]);

  return { trackPerformance };
};

// Usage in components
const { trackPerformance } = usePerformanceMonitoring(200);

const handleCrisisButton = () => {
  trackPerformance('crisis_button_press', async () => {
    // Crisis button logic
    await navigateToCrisisSupport();
  });
};
```

### 🛡️ **Crisis Mode Activation**

```typescript
// Crisis mode affects all accessibility features
const useCrisisMode = () => {
  const [crisisMode, setCrisisMode] = useState(false);

  const activateCrisisMode = useCallback(() => {
    setCrisisMode(true);

    // Enhance accessibility for crisis
    setAccessibilitySettings({
      highContrast: true,
      reducedMotion: true,
      largerTouchTargets: true,
      prioritizedAnnouncements: true
    });

    // Reduce performance thresholds
    setPerformanceThresholds({
      navigation: 100, // Faster navigation required
      crisis: 50,      // Emergency actions even faster
      general: 150     // All interactions faster
    });
  }, []);

  return { crisisMode, activateCrisisMode };
};
```

---

## Testing and Validation

### 🧪 **Automated Accessibility Tests**

```typescript
// Jest test example for accessibility compliance
describe('PaymentStatusIndicator Accessibility', () => {
  it('should have required accessibility props', () => {
    const { getByRole } = render(
      <PaymentStatusIndicator
        accessibilityLabel="Premium subscription active"
        testID="payment-status"
      />
    );

    const statusIndicator = getByRole('button');
    expect(statusIndicator).toHaveAccessibilityLabel(/premium subscription active/i);
    expect(statusIndicator).toHaveAccessibilityRole('button');
  });

  it('should meet touch target size requirements', () => {
    const { getByTestId } = render(
      <PaymentStatusIndicator
        accessibilityLabel="Status"
        testID="payment-status"
      />
    );

    const element = getByTestId('payment-status');
    const styles = StyleSheet.flatten(element.props.style);

    expect(styles.minHeight).toBeGreaterThanOrEqual(44);
    expect(styles.minWidth).toBeGreaterThanOrEqual(44);
  });

  it('should handle crisis mode performance requirements', async () => {
    const mockPerformanceViolation = jest.fn();

    const { getByTestId } = render(
      <PaymentStatusIndicator
        accessibilityLabel="Status"
        testID="payment-status"
        crisisMode={true}
        maxResponseTimeMs={100}
        onPerformanceViolation={mockPerformanceViolation}
        onPress={() => new Promise(resolve => setTimeout(resolve, 150))}
      />
    );

    await fireEvent.press(getByTestId('payment-status'));

    expect(mockPerformanceViolation).toHaveBeenCalledWith(
      expect.any(Number),
      'payment-status-press'
    );
  });
});
```

### 📱 **Manual Testing Checklist**

#### Screen Reader Testing
- [ ] Navigate entire payment flow with VoiceOver (iOS)
- [ ] Navigate entire payment flow with TalkBack (Android)
- [ ] Verify all interactive elements are announced
- [ ] Confirm therapeutic messaging is communicated appropriately
- [ ] Test crisis scenario navigation with screen reader

#### Keyboard Navigation Testing
- [ ] Complete payment flow using only keyboard
- [ ] Verify logical tab order through all components
- [ ] Test modal focus trapping and restoration
- [ ] Confirm crisis button accessible via keyboard

#### Touch Target Testing
- [ ] Verify all interactive elements meet 44px minimum
- [ ] Test with various screen sizes and orientations
- [ ] Confirm touch targets work with external pointing devices
- [ ] Validate crisis elements have enhanced touch targets (48px+)

#### Crisis Safety Testing
- [ ] Test response times under various load conditions
- [ ] Verify crisis button accessibility from all payment states
- [ ] Confirm therapeutic messaging appears in all error states
- [ ] Test grace period activation and messaging

---

## Development Workflow Integration

### 🔧 **Pre-Commit Accessibility Validation**

```json
// package.json scripts
{
  "scripts": {
    "accessibility:test": "jest --testPathPattern=accessibility",
    "accessibility:lint": "eslint --ext .tsx,.ts --config .eslintrc.accessibility.js src/",
    "accessibility:validate": "npm run accessibility:test && npm run accessibility:lint",
    "pre-commit": "npm run accessibility:validate && npm run test"
  }
}
```

### 📋 **Component Checklist**

```typescript
// Component accessibility checklist template
const ACCESSIBILITY_CHECKLIST = {
  required: [
    'accessibilityLabel prop defined and required',
    'testID prop defined and required',
    'Touch targets minimum 44px',
    'Color contrast minimum 4.5:1',
    'Keyboard navigation support',
    'Screen reader compatibility'
  ],
  mentalHealth: [
    'Therapeutic messaging patterns',
    'Crisis safety considerations',
    'Cognitive load assessment',
    'Financial anxiety reduction',
    'Emergency access preservation'
  ],
  testing: [
    'Automated accessibility tests',
    'Screen reader manual testing',
    'Keyboard navigation validation',
    'Crisis scenario testing',
    'Performance validation'
  ]
};
```

### 🎯 **TypeScript Enforcement**

```typescript
// Type-level accessibility enforcement
type AccessibleComponent<T> = T & {
  readonly accessibilityLabel: string; // REQUIRED
  readonly testID: string; // REQUIRED
};

// Utility type for mental health components
type MentalHealthAccessible<T> = AccessibleComponent<T> & {
  readonly crisisMode?: boolean;
  readonly therapeuticMessaging?: boolean;
  readonly cognitiveAccessibility?: boolean;
};

// Usage enforcement
interface PaymentComponentProps extends MentalHealthAccessible<ViewProps> {
  // Component-specific props
}
```

---

## Common Accessibility Issues and Solutions

### ❌ **Common Mistakes to Avoid**

1. **Missing Required Props**:
   ```typescript
   // ❌ BAD: Optional accessibility label
   interface BadProps {
     accessibilityLabel?: string;
   }

   // ✅ GOOD: Required accessibility label
   interface GoodProps {
     accessibilityLabel: string;
   }
   ```

2. **Inadequate Touch Targets**:
   ```typescript
   // ❌ BAD: Too small touch target
   const styles = StyleSheet.create({
     button: {
       width: 20,
       height: 20, // Too small!
     }
   });

   // ✅ GOOD: Adequate touch target
   const styles = StyleSheet.create({
     button: {
       minWidth: 44,
       minHeight: 44, // WCAG compliant
     }
   });
   ```

3. **Non-Therapeutic Error Messages**:
   ```typescript
   // ❌ BAD: Anxiety-inducing
   const errorMessage = "Payment FAILED! Access DENIED!";

   // ✅ GOOD: Therapeutic and reassuring
   const errorMessage = "Payment attention needed. Your mindful practice continues safely.";
   ```

### ✅ **Solutions and Best Practices**

1. **TypeScript Enforcement**:
   ```typescript
   // Enforce accessibility props at compile time
   interface RequiredAccessibilityProps {
     readonly accessibilityLabel: string; // Not optional!
     readonly testID: string;
   }
   ```

2. **Consistent Color System**:
   ```typescript
   // Use centralized color system with guaranteed contrast
   import { colorSystem } from '../constants/colors';

   const textStyle = {
     color: colorSystem.base.black, // 4.5:1 contrast guaranteed
     backgroundColor: colorSystem.base.white
   };
   ```

3. **Performance Monitoring**:
   ```typescript
   // Monitor and alert on performance violations
   const usePerformanceAlert = (threshold: number) => {
     return useCallback((duration: number, operation: string) => {
       if (duration > threshold) {
         // Alert development team
         console.warn(`Accessibility performance violation: ${operation}`);
         // Track in analytics
         analytics.track('accessibility_violation', { duration, operation });
       }
     }, [threshold]);
   };
   ```

---

## Continuous Improvement

### 📊 **Accessibility Metrics Tracking**

```typescript
// Track accessibility feature usage and effectiveness
const accessibilityAnalytics = {
  trackScreenReaderUsage: (component: string, action: string) => {
    analytics.track('screen_reader_interaction', {
      component,
      action,
      timestamp: new Date().toISOString()
    });
  },

  trackCrisisAccess: (responseTime: number, success: boolean) => {
    analytics.track('crisis_access_attempt', {
      responseTime,
      success,
      threshold: 200,
      timestamp: new Date().toISOString()
    });
  },

  trackAccessibilityError: (error: string, component: string) => {
    analytics.track('accessibility_error', {
      error,
      component,
      timestamp: new Date().toISOString()
    });
  }
};
```

### 🔄 **User Feedback Integration**

```typescript
// Collect accessibility feedback from users
const useAccessibilityFeedback = () => {
  const submitFeedback = useCallback(async (feedback: {
    component: string;
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    suggestion?: string;
  }) => {
    try {
      await api.post('/accessibility-feedback', {
        ...feedback,
        userAgent: Platform.OS,
        screenReaderEnabled: await AccessibilityInfo.isScreenReaderEnabled(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to submit accessibility feedback:', error);
    }
  }, []);

  return { submitFeedback };
};
```

### 🎯 **Regular Accessibility Audits**

```typescript
// Automated accessibility audit scheduling
const scheduleAccessibilityAudit = () => {
  return {
    weekly: [
      'Run automated accessibility test suite',
      'Check for new WCAG guidelines',
      'Review user feedback and analytics'
    ],
    monthly: [
      'Manual screen reader testing',
      'Crisis scenario validation',
      'Community feedback review'
    ],
    quarterly: [
      'Expert accessibility review',
      'Mental health advocate feedback',
      'Compliance certification update'
    ]
  };
};
```

---

## Resources and References

### 📚 **WCAG 2.1 Resources**
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Native Accessibility API](https://reactnative.dev/docs/accessibility)
- [iOS VoiceOver Testing Guide](https://developer.apple.com/accessibility/ios/)
- [Android TalkBack Testing Guide](https://developer.android.com/guide/topics/ui/accessibility/testing)

### 🧠 **Mental Health Accessibility**
- [Mental Health App Design Guidelines](https://www.nimh.nih.gov/health/topics/technology-and-the-future-of-mental-health-treatment)
- [Crisis Intervention Accessibility](https://www.samhsa.gov/find-help/national-helpline)
- [MBCT Accessibility Considerations](https://www.mbct.com/)

### 🛠️ **Development Tools**
- [axe-core React Native](https://github.com/dequelabs/axe-core-npm)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Flipper Accessibility Plugin](https://fbflipper.com/)

---

**This implementation guide ensures that all webhook UI components maintain WCAG 2.1 AA compliance while providing therapeutic, crisis-safe user experiences for mental health applications.**