# Webhook Integration Component Library

## Overview

The FullMind webhook integration component library provides crisis-safe, accessible payment UI components designed specifically for mental health applications. All components implement WCAG AA accessibility standards, therapeutic messaging patterns, and crisis intervention protocols.

## Design Principles

### Mental Health-First Design
- **Therapeutic Messaging**: All payment-related communications use anxiety-reducing, supportive language
- **Crisis Safety**: Payment issues never interfere with access to mental health resources
- **Stress Reduction**: UI patterns minimize financial stress and payment anxiety
- **Hope-Oriented**: Components emphasize solutions and continued care access

### Accessibility Standards
- **WCAG AA Compliance**: All components meet or exceed accessibility guidelines
- **Screen Reader Optimized**: Full compatibility with VoiceOver and TalkBack
- **High Contrast Support**: 4.5:1 minimum contrast ratios
- **Touch Target Compliance**: Minimum 44px touch targets for all interactive elements
- **Cognitive Accessibility**: Clear, simple interfaces appropriate for mental health users

### Crisis Integration
- **Emergency Access**: Quick access to crisis resources from all payment components
- **Response Time Compliance**: <200ms response times for crisis-related actions
- **Therapeutic Continuity**: Payment state never blocks therapeutic features
- **Grace Period Support**: Mental health-aware grace period management

## Core Components

### CrisisSafePaymentStatus

A comprehensive payment status component that provides therapeutic messaging and crisis-safe payment state display.

#### Interface
```typescript
interface CrisisSafePaymentStatusProps {
  // Payment state
  subscriptionStatus: SubscriptionStatus;
  gracePeriodStatus?: GracePeriodStatus | null;
  emergencyAccess?: EmergencyAccessState | null;

  // Crisis configuration
  crisisMode?: boolean;
  therapeuticMessaging?: boolean;
  showEmergencyAccess?: boolean;

  // Event handlers
  onEmergencyAccess?: () => void;
  onCrisisSupport?: () => void;
  onPaymentUpdate?: () => void;
  onGracePeriodExtend?: () => void;

  // Customization
  theme?: 'morning' | 'midday' | 'evening';
  showProgress?: boolean;
  compactMode?: boolean;

  // Accessibility
  accessibilityLabel?: string;
  accessibilityHint?: string;
}
```

#### Usage Example
```typescript
import { CrisisSafePaymentStatus } from '../components/payment/CrisisSafePaymentStatus';

function PaymentScreen() {
  const { subscriptionStatus, gracePeriodStatus } = usePaymentStore();
  const { activateEmergencyAccess } = useCrisisSafePayment();

  return (
    <CrisisSafePaymentStatus
      subscriptionStatus={subscriptionStatus}
      gracePeriodStatus={gracePeriodStatus}
      therapeuticMessaging={true}
      showEmergencyAccess={true}
      onEmergencyAccess={() => activateEmergencyAccess('user_request')}
      onCrisisSupport={() => navigation.navigate('CrisisSupport')}
      onPaymentUpdate={() => navigation.navigate('UpdatePayment')}
      theme="morning"
      showProgress={true}
      accessibilityLabel="Payment status with crisis support options"
    />
  );
}
```

#### Component Features
- **Status Display**: Clear, therapeutic messaging for all subscription states
- **Crisis Access**: Always-visible crisis support options
- **Grace Period Awareness**: Mental health-appropriate grace period messaging
- **Emergency Bypass**: Quick activation of emergency access when needed
- **Progress Indicators**: Supportive progress tracking for payment resolution

#### Visual States

**Active Subscription**
```typescript
// Green theme with supportive messaging
<StatusCard variant="success" theme="morning">
  <Icon name="check-circle" color="success" />
  <Title>Your Journey Continues</Title>
  <Description>
    Your subscription is active. Focus on your wellbeing - everything else is taken care of.
  </Description>
  <AccessRow>
    <FeatureAccess feature="mindfulness" enabled={true} />
    <FeatureAccess feature="crisis_support" enabled={true} />
    <FeatureAccess feature="progress_tracking" enabled={true} />
  </AccessRow>
</StatusCard>
```

**Grace Period**
```typescript
// Calm, supportive messaging with no pressure
<StatusCard variant="grace_period" theme="midday">
  <Icon name="heart" color="supportive" />
  <Title>Your Wellbeing Comes First</Title>
  <Description>
    While we work through the payment situation, all your therapeutic tools remain available.
    Take your time - there's no pressure.
  </Description>
  <GracePeriodProgress
    remainingDays={gracePeriodStatus?.remainingDays || 0}
    showCountdown={false}
    therapeuticMessaging={true}
  />
  <ActionRow>
    <Button variant="secondary" onPress={onPaymentUpdate}>
      Update Payment (Optional)
    </Button>
    <Button variant="crisis" onPress={onCrisisSupport}>
      Crisis Support
    </Button>
  </ActionRow>
</StatusCard>
```

**Crisis Mode**
```typescript
// High contrast, clear emergency access
<StatusCard variant="crisis" theme="crisis" highContrast={true}>
  <Icon name="shield" color="crisis" size="large" />
  <Title>Emergency Access Active</Title>
  <Description>
    All mental health features are immediately available. Your safety is our priority.
  </Description>
  <EmergencyActions>
    <Button variant="emergency" size="large" onPress={onEmergencyAccess}>
      Crisis Hotline (988)
    </Button>
    <Button variant="emergency" onPress={onCrisisSupport}>
      Emergency Resources
    </Button>
  </EmergencyActions>
</StatusCard>
```

### GracePeriodNotification

A mental health-aware notification component for grace period management with therapeutic messaging patterns.

#### Interface
```typescript
interface GracePeriodNotificationProps {
  // Grace period data
  gracePeriodStatus: GracePeriodStatus;

  // Display configuration
  showRemainingDays?: boolean;
  showProgressBar?: boolean;
  therapeuticMessaging?: boolean;
  anxietyReducingLanguage?: boolean;

  // Actions
  onExtendGracePeriod?: () => void;
  onUpdatePayment?: () => void;
  onCrisisSupport?: () => void;
  onDismiss?: () => void;

  // Customization
  variant?: 'card' | 'banner' | 'modal';
  urgency?: 'low' | 'medium' | 'high';
  showIcon?: boolean;

  // Accessibility
  announceChanges?: boolean;
  reducedMotion?: boolean;
}
```

#### Usage Example
```typescript
import { GracePeriodNotification } from '../components/payment/GracePeriodNotification';

function HomeScreen() {
  const { gracePeriodStatus } = usePaymentStore();
  const { extendGracePeriod } = useCrisisSafePayment();

  if (!gracePeriodStatus?.active) return null;

  return (
    <GracePeriodNotification
      gracePeriodStatus={gracePeriodStatus}
      showRemainingDays={true}
      therapeuticMessaging={true}
      anxietyReducingLanguage={true}
      onExtendGracePeriod={() => extendGracePeriod('financial_difficulty')}
      onUpdatePayment={() => navigation.navigate('UpdatePayment')}
      onCrisisSupport={() => navigation.navigate('CrisisSupport')}
      variant="card"
      urgency="low"
      announceChanges={true}
      reducedMotion={false}
    />
  );
}
```

#### Component Features
- **Anxiety-Reducing Language**: Careful word choice to minimize payment stress
- **No Pressure Messaging**: Emphasizes optional nature of payment updates
- **Resource Highlighting**: Always mentions available crisis support
- **Progress Visualization**: Gentle progress indicators without countdown pressure
- **Flexible Display**: Card, banner, or modal presentations

#### Therapeutic Messaging Patterns

**Early Grace Period (Days 5-7)**
```typescript
const earlyGracePeriodMessage = {
  title: "Your Journey Continues",
  message: `
    Hi friend, we want you to know that your mental health journey is our priority.
    While we work through the payment situation, your access to all therapeutic
    features remains completely available.

    ✓ All mindfulness exercises available
    ✓ Crisis support always accessible
    ✓ Progress tracking continues
    ✓ No interruption to your care

    Take your time - there's no pressure. Your wellbeing comes first.
  `,
  tone: 'supportive',
  urgency: 'none'
};
```

**Mid Grace Period (Days 2-4)**
```typescript
const midGracePeriodMessage = {
  title: "Continuing Your Support",
  message: `
    Your therapeutic access remains fully available. We're here to support you
    in whatever way feels right for your situation.

    If you'd like to update your payment method, you can do so at any time.
    If you're experiencing financial difficulty, please know that your mental
    health care access is protected.

    Crisis support: Always available 24/7
    Your progress: Safely preserved
    Your care: Uninterrupted
  `,
  tone: 'understanding',
  urgency: 'low'
};
```

**Final Grace Period Days**
```typescript
const finalGracePeriodMessage = {
  title: "Your Wellbeing Remains Protected",
  message: `
    Your access to crisis support and essential mental health tools will always
    be preserved. We're committed to maintaining your safety and therapeutic
    continuity regardless of payment status.

    Available options:
    • Continue with current access level
    • Update payment method if desired
    • Contact support for assistance
    • Access crisis resources anytime

    Your mental health journey continues with our support.
  `,
  tone: 'reassuring',
  urgency: 'gentle'
};
```

### EmergencyAccessCard

A high-visibility component for emergency crisis access with quick action buttons and clear resource presentation.

#### Interface
```typescript
interface EmergencyAccessCardProps {
  // Emergency access state
  emergencyAccess: EmergencyAccessState;
  crisisContext?: CrisisDetectionResult;

  // Emergency actions
  onHotlineAccess?: () => void;
  onEmergencyContacts?: () => void;
  onSafetyPlan?: () => void;
  onCrisisAssessment?: () => void;

  // Display configuration
  showHotlineButton?: boolean;
  showEmergencyContacts?: boolean;
  showSafetyPlan?: boolean;
  compactMode?: boolean;

  // Customization
  variant?: 'minimal' | 'standard' | 'comprehensive';
  urgency?: 'standard' | 'high' | 'critical';

  // Accessibility
  highContrast?: boolean;
  largeText?: boolean;
  quickAccess?: boolean;
}
```

#### Usage Example
```typescript
import { EmergencyAccessCard } from '../components/payment/EmergencyAccessCard';

function CrisisSupportScreen() {
  const { emergencyAccess, crisisContext } = useCrisisSafePayment();

  return (
    <ScrollView>
      <EmergencyAccessCard
        emergencyAccess={emergencyAccess}
        crisisContext={crisisContext}
        onHotlineAccess={() => callCrisisHotline('988')}
        onEmergencyContacts={() => showEmergencyContacts()}
        onSafetyPlan={() => navigation.navigate('SafetyPlan')}
        onCrisisAssessment={() => navigation.navigate('CrisisAssessment')}
        showHotlineButton={true}
        showEmergencyContacts={true}
        showSafetyPlan={true}
        variant="comprehensive"
        urgency="high"
        highContrast={true}
        largeText={true}
        quickAccess={true}
      />
    </ScrollView>
  );
}
```

#### Component Features
- **One-Touch Crisis Access**: 988 hotline access in single tap
- **Emergency Contact Integration**: Quick access to personal emergency contacts
- **Safety Plan Access**: Immediate access to user-defined safety plans
- **High Contrast Mode**: Enhanced visibility during crisis situations
- **Large Touch Targets**: Easier interaction during high-stress situations

#### Visual Design

**Comprehensive Variant**
```typescript
<EmergencyCard variant="comprehensive" urgency="high">
  <Header>
    <Icon name="shield-heart" size="large" color="crisis" />
    <Title>Emergency Support Available</Title>
    <Subtitle>Your safety is our priority. All resources are immediately accessible.</Subtitle>
  </Header>

  <EmergencyActions>
    <CrisisButton
      size="large"
      variant="primary"
      icon="phone"
      onPress={onHotlineAccess}
      accessibilityLabel="Call 988 Crisis Hotline immediately"
    >
      Crisis Hotline (988)
    </CrisisButton>

    <CrisisButton
      size="large"
      variant="secondary"
      icon="contacts"
      onPress={onEmergencyContacts}
    >
      Emergency Contacts
    </CrisisButton>

    <CrisisButton
      size="large"
      variant="secondary"
      icon="document"
      onPress={onSafetyPlan}
    >
      My Safety Plan
    </CrisisButton>
  </EmergencyActions>

  <QuickResources>
    <ResourceLink href="988lifeline.org/chat">Text with Crisis Counselor</ResourceLink>
    <ResourceLink onPress={onCrisisAssessment}>Crisis Assessment</ResourceLink>
  </QuickResources>
</EmergencyCard>
```

### PaymentErrorRecovery

A therapeutic error handling component that provides supportive recovery options during payment processing failures.

#### Interface
```typescript
interface PaymentErrorRecoveryProps {
  // Error information
  error: PaymentError;
  retryAttempts: number;
  maxRetryAttempts: number;

  // Recovery actions
  onRetry?: () => Promise<void>;
  onEmergencyAccess?: () => void;
  onSupportContact?: () => void;
  onCrisisSupport?: () => void;

  // Configuration
  showRetryButton?: boolean;
  showEmergencyAccess?: boolean;
  therapeuticMessaging?: boolean;
  anxietyReduction?: boolean;

  // Customization
  variant?: 'gentle' | 'supportive' | 'solution-focused';
  theme?: 'morning' | 'midday' | 'evening';

  // Accessibility
  announceError?: boolean;
  focusManagement?: boolean;
}
```

#### Usage Example
```typescript
import { PaymentErrorRecovery } from '../components/payment/PaymentErrorRecovery';

function PaymentUpdateScreen() {
  const { error, retryPayment } = usePaymentStore();
  const [retryAttempts, setRetryAttempts] = useState(0);

  if (!error) return null;

  return (
    <PaymentErrorRecovery
      error={error}
      retryAttempts={retryAttempts}
      maxRetryAttempts={3}
      onRetry={async () => {
        setRetryAttempts(prev => prev + 1);
        await retryPayment();
      }}
      onEmergencyAccess={() => activateEmergencyAccess('payment_error')}
      onSupportContact={() => navigation.navigate('Support')}
      onCrisisSupport={() => navigation.navigate('CrisisSupport')}
      showRetryButton={retryAttempts < 3}
      showEmergencyAccess={true}
      therapeuticMessaging={true}
      anxietyReduction={true}
      variant="supportive"
      theme="midday"
      announceError={true}
      focusManagement={true}
    />
  );
}
```

#### Therapeutic Error Messages

**Card Declined**
```typescript
const cardDeclinedMessage = {
  title: "Let's Try Another Approach",
  message: `
    Your card wasn't accepted this time - this happens sometimes and it's completely normal.

    Your mental health access continues uninterrupted while we sort this out together.

    What you can try:
    • Use a different payment method
    • Contact your bank to verify the transaction
    • Try again in a few minutes
    • Continue using all therapeutic features

    Remember: Your wellbeing comes first, and all crisis support remains available.
  `,
  tone: 'reassuring',
  actionOriented: true,
  crisisAccessEmphasized: true
};
```

**Network Error**
```typescript
const networkErrorMessage = {
  title: "Connection Issue - You're Still Supported",
  message: `
    We're having trouble connecting right now, but don't worry - this doesn't affect
    your access to mental health resources.

    Your therapeutic tools remain fully available:
    ✓ Mindfulness exercises
    ✓ Crisis support (always accessible)
    ✓ Progress tracking
    ✓ Safety plans

    We'll try connecting again automatically, or you can try again when convenient.
  `,
  tone: 'calm',
  continuityEmphasized: true
};
```

### SubscriptionGracePeriod

A comprehensive grace period management component with therapeutic messaging and stress-free payment options.

#### Interface
```typescript
interface SubscriptionGracePeriodProps {
  // Grace period state
  gracePeriodStatus: GracePeriodStatus;
  subscriptionPlan: SubscriptionPlan;

  // Display configuration
  showTimeRemaining?: boolean;
  showFeatureAccess?: boolean;
  showPaymentOptions?: boolean;
  therapeuticMessaging?: boolean;

  // Actions
  onExtendGracePeriod?: () => Promise<void>;
  onUpdatePaymentMethod?: () => void;
  onContactSupport?: () => void;
  onCrisisSupport?: () => void;

  // Customization
  layout?: 'card' | 'fullscreen' | 'modal';
  emphasis?: 'continuity' | 'options' | 'support';
  theme?: 'morning' | 'midday' | 'evening';

  // Accessibility
  screenReaderOptimized?: boolean;
  reducedMotion?: boolean;
  highContrast?: boolean;
}
```

#### Usage Example
```typescript
import { SubscriptionGracePeriod } from '../components/payment/SubscriptionGracePeriod';

function GracePeriodScreen() {
  const { gracePeriodStatus, subscriptionPlan } = usePaymentStore();
  const { extendGracePeriod } = useCrisisSafePayment();

  return (
    <SubscriptionGracePeriod
      gracePeriodStatus={gracePeriodStatus}
      subscriptionPlan={subscriptionPlan}
      showTimeRemaining={true}
      showFeatureAccess={true}
      showPaymentOptions={true}
      therapeuticMessaging={true}
      onExtendGracePeriod={() => extendGracePeriod('need_more_time')}
      onUpdatePaymentMethod={() => navigation.navigate('PaymentMethod')}
      onContactSupport={() => navigation.navigate('Support')}
      onCrisisSupport={() => navigation.navigate('CrisisSupport')}
      layout="fullscreen"
      emphasis="continuity"
      theme="morning"
      screenReaderOptimized={true}
      reducedMotion={false}
      highContrast={false}
    />
  );
}
```

## Shared UI Components

### CrisisButton

A standardized crisis access button used throughout the payment interface.

```typescript
interface CrisisButtonProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'emergency';
  icon?: string;
  onPress: () => void;
  children: React.ReactNode;
  accessibilityLabel?: string;
  highContrast?: boolean;
  quickAccess?: boolean;
}

// Usage
<CrisisButton
  size="large"
  variant="emergency"
  icon="phone"
  onPress={() => callCrisisHotline('988')}
  accessibilityLabel="Call 988 Crisis Hotline immediately"
  highContrast={true}
  quickAccess={true}
>
  Crisis Hotline (988)
</CrisisButton>
```

### TherapeuticMessage

A message component with mental health-appropriate styling and messaging patterns.

```typescript
interface TherapeuticMessageProps {
  title: string;
  message: string;
  tone?: 'supportive' | 'reassuring' | 'gentle' | 'hopeful';
  urgency?: 'none' | 'low' | 'medium' | 'high';
  showIcon?: boolean;
  icon?: string;
  theme?: 'morning' | 'midday' | 'evening';
  accessibilityAnnounce?: boolean;
}

// Usage
<TherapeuticMessage
  title="Your Journey Continues"
  message="While we work through the payment situation, your access to all therapeutic features remains completely available."
  tone="supportive"
  urgency="none"
  showIcon={true}
  icon="heart"
  theme="morning"
  accessibilityAnnounce={true}
/>
```

### FeatureAccessIndicator

Visual indicator showing which features remain available during different payment states.

```typescript
interface FeatureAccessIndicatorProps {
  features: Array<{
    name: string;
    enabled: boolean;
    icon: string;
    description: string;
  }>;
  layout?: 'grid' | 'list' | 'compact';
  showDescriptions?: boolean;
  theme?: 'morning' | 'midday' | 'evening';
}

// Usage
<FeatureAccessIndicator
  features={[
    { name: 'Mindfulness', enabled: true, icon: 'leaf', description: 'All meditation exercises' },
    { name: 'Crisis Support', enabled: true, icon: 'shield', description: '24/7 emergency access' },
    { name: 'Progress Tracking', enabled: true, icon: 'chart', description: 'Your journey data' }
  ]}
  layout="grid"
  showDescriptions={true}
  theme="morning"
/>
```

## Accessibility Implementation

### Screen Reader Support

All components implement comprehensive screen reader support:

```typescript
// Example accessibility implementation
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Activate emergency crisis support"
  accessibilityHint="Opens immediate access to crisis resources including 988 hotline"
  accessibilityState={{
    disabled: false,
    busy: isLoading
  }}
  onPress={onEmergencyAccess}
>
  <Text accessibilityLabel="Emergency Support Button">
    Crisis Support
  </Text>
</Pressable>
```

### Keyboard Navigation

Components support full keyboard navigation:

```typescript
// Focus management implementation
const focusRef = useRef<View>(null);

useEffect(() => {
  if (crisisMode && focusRef.current) {
    // Focus crisis button immediately in crisis mode
    AccessibilityInfo.setAccessibilityFocus(focusRef.current);
  }
}, [crisisMode]);

return (
  <View ref={focusRef} accessible={true}>
    <CrisisButton onPress={onCrisisSupport}>
      Crisis Support
    </CrisisButton>
  </View>
);
```

### Color Contrast

All components meet WCAG AA contrast requirements:

```typescript
// Color system with contrast validation
const colors = {
  crisis: {
    background: '#8B0000', // Dark red
    text: '#FFFFFF',       // White text (7:1 contrast)
    border: '#FF4444'      // Light red accent
  },
  supportive: {
    background: '#2D5016', // Dark green
    text: '#FFFFFF',       // White text (8:1 contrast)
    border: '#4A7C59'      // Medium green accent
  },
  gracePeriod: {
    background: '#1F4E79', // Dark blue
    text: '#FFFFFF',       // White text (7.5:1 contrast)
    border: '#40B5AD'      // Teal accent
  }
};
```

### Reduced Motion Support

Components respect user motion preferences:

```typescript
// Animation with reduced motion support
const animationConfig = {
  duration: reducedMotion ? 0 : 300,
  useNativeDriver: true,
  easing: reducedMotion ? Easing.linear : Easing.bezier(0.25, 0.46, 0.45, 0.94)
};

Animated.timing(fadeAnim, {
  toValue: 1,
  ...animationConfig
}).start();
```

## Theming System

### Color Themes

The component library supports three therapeutic themes:

```typescript
interface TherapeuticTheme {
  primary: string;
  success: string;
  warning: string;
  crisis: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
}

const themes = {
  morning: {
    primary: '#FF9F43',
    success: '#E8863A',
    warning: '#FFC107',
    crisis: '#DC3545',
    background: '#FFF9F5',
    surface: '#FFFFFF',
    text: '#2D2D2D',
    textSecondary: '#666666',
    border: '#E0E0E0'
  },
  midday: {
    primary: '#40B5AD',
    success: '#2C8A82',
    warning: '#FFC107',
    crisis: '#DC3545',
    background: '#F5FFFE',
    surface: '#FFFFFF',
    text: '#2D2D2D',
    textSecondary: '#666666',
    border: '#E0E0E0'
  },
  evening: {
    primary: '#4A7C59',
    success: '#2D5016',
    warning: '#FFB300',
    crisis: '#E53935',
    background: '#F8FBF9',
    surface: '#FFFFFF',
    text: '#2D2D2D',
    textSecondary: '#666666',
    border: '#E0E0E0'
  }
};
```

### Typography Scale

Mental health-appropriate typography with high readability:

```typescript
const typography = {
  title: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    fontFamily: 'System'
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
    fontFamily: 'System'
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    fontFamily: 'System'
  },
  caption: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    fontFamily: 'System'
  },
  crisis: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    fontFamily: 'System'
  }
};
```

## Testing Components

### Accessibility Testing

```typescript
import { render, screen } from '@testing-library/react-native';
import { CrisisSafePaymentStatus } from '../CrisisSafePaymentStatus';

test('crisis button is accessible', async () => {
  render(
    <CrisisSafePaymentStatus
      subscriptionStatus="grace_period"
      showEmergencyAccess={true}
      onCrisisSupport={jest.fn()}
    />
  );

  const crisisButton = screen.getByLabelText(/crisis support/i);
  expect(crisisButton).toHaveAccessibilityRole('button');
  expect(crisisButton).toHaveAccessibilityState({ disabled: false });
});
```

### Crisis Response Testing

```typescript
test('emergency access activates within response time limit', async () => {
  const onEmergencyAccess = jest.fn();
  const startTime = Date.now();

  render(
    <CrisisSafePaymentStatus
      crisisMode={true}
      onEmergencyAccess={onEmergencyAccess}
    />
  );

  const emergencyButton = screen.getByRole('button', { name: /emergency access/i });
  fireEvent.press(emergencyButton);

  const responseTime = Date.now() - startTime;
  expect(responseTime).toBeLessThan(200); // Crisis response time limit
  expect(onEmergencyAccess).toHaveBeenCalled();
});
```

### Therapeutic Messaging Testing

```typescript
test('grace period uses anxiety-reducing language', () => {
  render(
    <GracePeriodNotification
      gracePeriodStatus={{
        active: true,
        remainingDays: 5,
        reason: 'payment_issue'
      }}
      therapeuticMessaging={true}
      anxietyReducingLanguage={true}
    />
  );

  // Should avoid pressure language
  expect(screen.queryByText(/urgent/i)).toBeNull();
  expect(screen.queryByText(/immediately/i)).toBeNull();
  expect(screen.queryByText(/expired/i)).toBeNull();

  // Should include supportive language
  expect(screen.getByText(/your wellbeing/i)).toBeTruthy();
  expect(screen.getByText(/take your time/i)).toBeTruthy();
  expect(screen.getByText(/no pressure/i)).toBeTruthy();
});
```

## Implementation Guide

### Setting Up Components

```typescript
// 1. Install dependencies
npm install @react-native-async-storage/async-storage
npm install react-native-vector-icons
npm install @react-native-community/hooks

// 2. Import and configure
import { PaymentThemeProvider } from '../providers/PaymentThemeProvider';
import { CrisisSafetyProvider } from '../providers/CrisisSafetyProvider';

function App() {
  return (
    <PaymentThemeProvider theme="morning">
      <CrisisSafetyProvider>
        <YourPaymentScreens />
      </CrisisSafetyProvider>
    </PaymentThemeProvider>
  );
}
```

### Custom Component Development

```typescript
// Creating a custom payment component
import { useTheme } from '../hooks/useTheme';
import { useCrisisSafety } from '../hooks/useCrisisSafety';

function CustomPaymentComponent() {
  const theme = useTheme();
  const { crisisMode, activateEmergencyAccess } = useCrisisSafety();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.text, { color: theme.text }]}>
        Payment Status
      </Text>

      {crisisMode && (
        <TouchableOpacity
          onPress={activateEmergencyAccess}
          style={[styles.crisisButton, { backgroundColor: theme.crisis }]}
          accessibilityRole="button"
          accessibilityLabel="Activate emergency crisis support"
        >
          <Text style={styles.crisisButtonText}>Emergency Support</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

## Component Library Checklist

### WCAG AA Compliance ✅
- [x] Color contrast ratios ≥ 4.5:1
- [x] Touch targets ≥ 44px
- [x] Screen reader compatibility
- [x] Keyboard navigation support
- [x] Focus management
- [x] Reduced motion support

### Crisis Safety Integration ✅
- [x] <200ms emergency access response
- [x] Always-visible crisis support options
- [x] Emergency bypass capabilities
- [x] Therapeutic continuity preservation
- [x] 988 hotline integration

### Mental Health UX ✅
- [x] Anxiety-reducing language patterns
- [x] Supportive messaging tone
- [x] Stress minimization design
- [x] Hope-oriented content
- [x] Pressure-free interactions

### Technical Implementation ✅
- [x] TypeScript interface definitions
- [x] React Native compatibility
- [x] Performance optimization
- [x] Memory efficiency
- [x] Error boundary protection

This component library provides a complete set of crisis-safe, accessible payment UI components specifically designed for mental health applications, ensuring that payment processes never interfere with therapeutic access or user safety.