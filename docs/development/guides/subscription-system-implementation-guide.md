# Subscription System Implementation Guide

## Quick Reference for In-App Purchase Subscription Integration

### Key Concepts

**🚨 CRITICAL**: Crisis features are **ALWAYS ACCESSIBLE** regardless of subscription status (legal requirement).

**Architecture**: Trial (28 days) → Purchase → Receipt Verification → Active Subscription → Feature Access

**Performance Targets**:
- Feature access checks: <100ms
- Receipt verification: <2s
- Purchase flow: <60s
- Crisis access: ~0ms (hardcoded, no lookup)

### Core Components

```typescript
// Store: Subscription state management
useSubscriptionStore()
  .checkFeatureAccess('checkIns')         // Check feature access
  .getCrisisAccessStatus()                 // Always returns true
  .createTrial()                           // Create 28-day trial
  .isSubscriptionActive()                  // Check if subscription active

// Service: IAP integration
IAPService
  .initialize()                            // Initialize IAP
  .purchaseSubscription('monthly')         // Purchase flow
  .verifyReceipt(receipt, 'apple')        // Verify receipt
  .restorePurchases()                      // Restore purchases

// Component: Feature gating
<FeatureGate feature="checkIns">
  <CheckInComponent />
</FeatureGate>
```

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Implementation Guide](#implementation-guide)
3. [Crisis Access Guarantee](#crisis-access-guarantee)
4. [Security Considerations](#security-considerations)
5. [Testing Strategy](#testing-strategy)
6. [Integration Steps](#integration-steps)
7. [Deployment Checklist](#deployment-checklist)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUBSCRIPTION SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │   React Native   │───▶│  Zustand Store   │                  │
│  │   Components     │◀───│  (State Mgmt)    │                  │
│  └──────────────────┘    └──────────────────┘                  │
│           │                       │                              │
│           ▼                       ▼                              │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │   FeatureGate    │    │   IAPService     │                  │
│  │   Component      │    │   (expo-iap)     │                  │
│  └──────────────────┘    └──────────────────┘                  │
│                                   │                              │
│                                   ▼                              │
│                          ┌──────────────────┐                   │
│                          │ Apple/Google IAP │                   │
│                          │   Stores         │                   │
│                          └──────────────────┘                   │
│                                   │                              │
│                                   ▼                              │
│                          ┌──────────────────┐                   │
│                          │ Supabase Edge    │                   │
│                          │ Functions        │                   │
│                          │ - verify-apple   │                   │
│                          │ - verify-google  │                   │
│                          │ - webhook        │                   │
│                          └──────────────────┘                   │
│                                   │                              │
│                                   ▼                              │
│                          ┌──────────────────┐                   │
│                          │ Supabase DB      │                   │
│                          │ - subscriptions  │                   │
│                          │ - events         │                   │
│                          └──────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

**Trial Creation**:
```
User → createTrial() → Store → SecureStore → UI Update
```

**Purchase Flow**:
```
User Tap → IAPService.purchaseSubscription()
  → Apple/Google Store → Purchase Listener
  → IAPService.verifyReceipt() → Supabase Edge Function
  → Store Update → Feature Access Update → UI Refresh
```

**Feature Access Check**:
```
Component → FeatureGate → useSubscriptionStore.checkFeatureAccess()
  → Crisis? → Return TRUE (hardcoded)
  → Non-Crisis? → Check featureAccess map → Return boolean
```

---

## Implementation Guide

### 1. Type Definitions

**File**: `/app/src/types/subscription.ts`

```typescript
/**
 * SUBSCRIPTION TYPES
 * Complete type definitions for subscription system
 */

export type SubscriptionStatus =
  | 'trial'      // 28-day free trial
  | 'active'     // Paid subscription active
  | 'grace'      // Payment failed, in grace period
  | 'expired'    // Subscription ended
  | 'canceled';  // User canceled

export type SubscriptionTier = 'standard';  // Future: 'premium', 'family'
export type SubscriptionInterval = 'monthly' | 'yearly';
export type Platform = 'apple' | 'google' | 'none';

export interface Subscription {
  // Identity
  id: string;
  userId: string;
  platform: Platform;
  platformSubscriptionId: string;

  // Status
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  interval: SubscriptionInterval;

  // Pricing
  priceUsd: number;
  currency: string;

  // Trial
  trialStartDate: number | null;
  trialEndDate: number | null;

  // Subscription
  subscriptionStartDate: number | null;
  subscriptionEndDate: number | null;
  gracePeriodEnd: number | null;

  // Receipt
  lastReceiptVerified: number | null;
  receiptData: string | null;

  // Payment
  lastPaymentDate: number | null;
  paymentFailureCount: number;

  // 🚨 CRITICAL: Crisis access (always true)
  crisisAccessEnabled: true;

  // Metadata
  createdAt: number;
  updatedAt: number;
}

export interface FeatureAccess {
  // Crisis features (ALWAYS true)
  crisisButton: true;
  crisisContacts: true;
  safetyPlan: true;
  nineEightEightAccess: true;

  // Non-crisis features (gated by subscription)
  checkIns: boolean;
  breathingExercises: boolean;
  therapeuticContent: boolean;
  progressInsights: boolean;
  assessments: boolean;
}

/**
 * Calculate feature access based on subscription status
 */
export function calculateFeatureAccess(status: SubscriptionStatus): FeatureAccess {
  const hasAccess = ['trial', 'active', 'grace'].includes(status);

  return {
    // Crisis features ALWAYS accessible
    crisisButton: true,
    crisisContacts: true,
    safetyPlan: true,
    nineEightEightAccess: true,

    // Non-crisis features gated
    checkIns: hasAccess,
    breathingExercises: hasAccess,
    therapeuticContent: hasAccess,
    progressInsights: hasAccess,
    assessments: hasAccess,
  };
}
```

### 2. Subscription Store

**File**: `/app/src/stores/subscriptionStore.ts`

```typescript
/**
 * SUBSCRIPTION STORE
 * Zustand store for subscription state management
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Subscription, FeatureAccess, calculateFeatureAccess } from '../types/subscription';

interface SubscriptionStore {
  // State
  subscription: Subscription | null;
  featureAccess: FeatureAccess | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  createTrial: () => Promise<void>;
  updateSubscription: (subscription: Subscription) => Promise<void>;
  loadSubscription: () => Promise<void>;
  clearSubscription: () => Promise<void>;

  // Queries
  checkFeatureAccess: (feature: keyof FeatureAccess) => boolean;
  getCrisisAccessStatus: () => true;  // Always returns true
  isTrialActive: () => boolean;
  isSubscriptionActive: () => boolean;
  getTrialDaysRemaining: () => number | null;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  // Initial state
  subscription: null,
  featureAccess: null,
  isLoading: false,
  error: null,

  // Create 28-day trial
  createTrial: async () => {
    const now = Date.now();
    const trialEndDate = now + 28 * 24 * 60 * 60 * 1000; // 28 days

    const trial: Subscription = {
      id: `trial-${now}`,
      userId: 'current-user-id', // Replace with actual user ID
      platform: 'none',
      platformSubscriptionId: '',
      status: 'trial',
      tier: 'standard',
      interval: 'monthly',
      priceUsd: 0,
      currency: 'USD',
      trialStartDate: now,
      trialEndDate,
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      gracePeriodEnd: null,
      lastReceiptVerified: null,
      receiptData: null,
      lastPaymentDate: null,
      paymentFailureCount: 0,
      crisisAccessEnabled: true,
      createdAt: now,
      updatedAt: now,
    };

    // Save to SecureStore
    await SecureStore.setItemAsync('subscription', JSON.stringify(trial));

    // Update state
    const featureAccess = calculateFeatureAccess('trial');
    set({ subscription: trial, featureAccess });
  },

  // Update subscription
  updateSubscription: async (subscription: Subscription) => {
    await SecureStore.setItemAsync('subscription', JSON.stringify(subscription));
    const featureAccess = calculateFeatureAccess(subscription.status);
    set({ subscription, featureAccess });
  },

  // Load subscription from storage
  loadSubscription: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await SecureStore.getItemAsync('subscription');
      if (data) {
        const subscription = JSON.parse(data) as Subscription;
        const featureAccess = calculateFeatureAccess(subscription.status);
        set({ subscription, featureAccess, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ error: 'Failed to load subscription', isLoading: false });
    }
  },

  // Clear subscription
  clearSubscription: async () => {
    await SecureStore.deleteItemAsync('subscription');
    set({ subscription: null, featureAccess: null });
  },

  // 🚨 CRITICAL: Check feature access
  checkFeatureAccess: (feature: keyof FeatureAccess) => {
    // Crisis features ALWAYS accessible (hardcoded)
    const crisisFeatures: Array<keyof FeatureAccess> = [
      'crisisButton',
      'crisisContacts',
      'safetyPlan',
      'nineEightEightAccess',
    ];

    if (crisisFeatures.includes(feature)) {
      return true;  // ALWAYS return true for crisis features
    }

    // Non-crisis features: check featureAccess map
    const { featureAccess } = get();
    return featureAccess?.[feature] ?? false;
  },

  // 🚨 CRITICAL: Always returns true
  getCrisisAccessStatus: (): true => {
    return true;  // Hardcoded to return literal true
  },

  // Check if trial is active
  isTrialActive: () => {
    const { subscription } = get();
    if (!subscription || subscription.status !== 'trial') {
      return false;
    }
    if (!subscription.trialEndDate) {
      return false;
    }
    return Date.now() < subscription.trialEndDate;
  },

  // Check if subscription is active
  isSubscriptionActive: () => {
    const { subscription } = get();
    return subscription?.status === 'active';
  },

  // Get trial days remaining
  getTrialDaysRemaining: () => {
    const { subscription } = get();
    if (!subscription || subscription.status !== 'trial' || !subscription.trialEndDate) {
      return null;
    }
    const msRemaining = subscription.trialEndDate - Date.now();
    const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
    return Math.max(0, daysRemaining);
  },
}));
```

### 3. IAP Service

**File**: `/app/src/services/subscription/IAPService.ts`

```typescript
/**
 * IAP SERVICE
 * In-App Purchase integration with Apple/Google
 */

import * as InAppPurchases from 'expo-in-app-purchases';
import { Platform } from 'react-native';
import { supabaseService } from '../supabase/SupabaseService';

class IAPServiceImpl {
  private isInitialized = false;
  private products: InAppPurchases.IAPItemDetails[] = [];

  // Product IDs
  private readonly PRODUCT_IDS = {
    monthly: 'com.being.subscription.monthly',
    yearly: 'com.being.subscription.yearly',
  };

  /**
   * Initialize IAP service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('IAP service already initialized');
      return;
    }

    try {
      // Connect to store
      await InAppPurchases.connectAsync();

      // Set up purchase listener
      InAppPurchases.setPurchaseListener(this.handlePurchase.bind(this));

      // Load products
      const productIds = Object.values(this.PRODUCT_IDS);
      const { responseCode, results } = await InAppPurchases.getProductsAsync(productIds);

      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        this.products = results || [];
        console.log(`✅ IAP initialized with ${this.products.length} products`);
      } else {
        throw new Error(`Failed to load products: ${responseCode}`);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('IAP initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get all available products
   */
  getProducts(): InAppPurchases.IAPItemDetails[] {
    return this.products;
  }

  /**
   * Get product by interval
   */
  getProduct(interval: 'monthly' | 'yearly'): InAppPurchases.IAPItemDetails | undefined {
    const productId = this.PRODUCT_IDS[interval];
    return this.products.find(p => p.productId === productId);
  }

  /**
   * Purchase subscription
   */
  async purchaseSubscription(interval: 'monthly' | 'yearly'): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('IAP service not initialized');
    }

    const productId = this.PRODUCT_IDS[interval];
    const startTime = performance.now();

    try {
      await InAppPurchases.purchaseItemAsync(productId);
      const endTime = performance.now();
      console.log(`✅ Purchase initiated in ${(endTime - startTime).toFixed(0)}ms`);
    } catch (error) {
      console.error('Purchase failed:', error);
      throw error;
    }
  }

  /**
   * Handle purchase updates
   */
  private async handlePurchase({ responseCode, results }: InAppPurchases.InAppPurchaseResult): Promise<void> {
    if (responseCode === InAppPurchases.IAPResponseCode.OK) {
      for (const purchase of results || []) {
        console.log('Purchase received:', purchase.productId);

        // Verify receipt
        const platform = Platform.OS === 'ios' ? 'apple' : 'google';
        const receiptData = purchase.transactionReceipt || '';
        const purchaseToken = (purchase as any).purchaseToken;

        const verification = await this.verifyReceipt(receiptData, platform, purchaseToken);

        if (verification.valid) {
          console.log('✅ Receipt verified:', verification.subscriptionId);
          // Update subscription store (handled by caller)
        } else {
          console.error('❌ Receipt verification failed:', verification.error);
        }
      }
    }
  }

  /**
   * Verify receipt with Supabase Edge Function
   */
  async verifyReceipt(
    receiptData: string,
    platform: 'apple' | 'google',
    purchaseToken?: string
  ): Promise<{ valid: boolean; subscriptionId?: string; expiresDate?: string; error?: string }> {
    const startTime = performance.now();

    try {
      const endpoint = platform === 'apple'
        ? '/functions/v1/verify-apple-receipt'
        : '/functions/v1/verify-google-receipt';

      const supabaseUrl = supabaseService.getStatus().isInitialized
        ? process.env.EXPO_PUBLIC_SUPABASE_URL
        : '';

      const body = platform === 'apple'
        ? { receiptData }
        : { productId: receiptData, purchaseToken };

      const response = await fetch(`${supabaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const endTime = performance.now();
      console.log(`Receipt verification: ${(endTime - startTime).toFixed(0)}ms`);

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status}`);
      }

      const result = await response.json();
      return {
        valid: result.valid,
        subscriptionId: result.subscriptionId,
        expiresDate: result.expiresDate,
      };
    } catch (error) {
      console.error('Receipt verification error:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Restore purchases
   */
  async restorePurchases(): Promise<InAppPurchases.InAppPurchase[]> {
    if (!this.isInitialized) {
      throw new Error('IAP service not initialized');
    }

    try {
      const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();

      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        console.log(`✅ Found ${results?.length || 0} previous purchases`);
        return results || [];
      }

      return [];
    } catch (error) {
      console.error('Restore purchases failed:', error);
      throw error;
    }
  }

  /**
   * Check if IAP is available
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  /**
   * Get current platform
   */
  getPlatform(): 'apple' | 'google' | 'none' {
    if (Platform.OS === 'ios') return 'apple';
    if (Platform.OS === 'android') return 'google';
    return 'none';
  }
}

export const IAPService = new IAPServiceImpl();
```

### 4. Feature Gate Component

**File**: `/app/src/components/subscription/FeatureGate.tsx`

See existing implementation at `/app/src/components/subscription/FeatureGate.tsx` (174 lines).

**Usage**:
```tsx
import FeatureGate, { useFeatureAccess } from './FeatureGate';

// Component wrapping
<FeatureGate feature="checkIns" onUpgrade={() => navigate('Subscription')}>
  <CheckInComponent />
</FeatureGate>

// Hook usage
function MyComponent() {
  const hasCheckInsAccess = useFeatureAccess('checkIns');

  return hasCheckInsAccess ? <FullFeature /> : <LimitedFeature />;
}

// HOC usage
const GatedProgressInsights = withFeatureGate(
  ProgressInsightsComponent,
  'progressInsights',
  () => navigate('Subscription')
);
```

---

## Crisis Access Guarantee

### 🚨 CRITICAL LEGAL REQUIREMENT

**Crisis features MUST be accessible at ALL times**, regardless of subscription status, payment failures, network issues, or any other conditions.

### Implementation Requirements

1. **Hardcoded Access**
   ```typescript
   getCrisisAccessStatus: (): true => {
     return true;  // Literal true, not conditional
   }
   ```

2. **Feature Check Priority**
   ```typescript
   checkFeatureAccess: (feature: keyof FeatureAccess) => {
     // Crisis features checked FIRST
     const crisisFeatures = ['crisisButton', 'crisisContacts', 'safetyPlan', 'nineEightEightAccess'];

     if (crisisFeatures.includes(feature)) {
       return true;  // ALWAYS true
     }

     // Non-crisis features checked second
     return featureAccess?.[feature] ?? false;
   }
   ```

3. **Type Safety**
   ```typescript
   interface FeatureAccess {
     // Crisis features typed as literal true
     crisisButton: true;
     crisisContacts: true;
     safetyPlan: true;
     nineEightEightAccess: true;

     // Non-crisis features as boolean
     checkIns: boolean;
     breathingExercises: boolean;
   }
   ```

4. **Database Schema**
   ```sql
   -- Crisis access is always true in database
   CREATE TABLE subscriptions (
     crisis_access_enabled BOOLEAN NOT NULL DEFAULT TRUE,
     CHECK (crisis_access_enabled = TRUE)  -- Enforce at DB level
   );
   ```

### Validation Checklist

- [ ] `getCrisisAccessStatus()` returns literal `true` (not conditional)
- [ ] Crisis feature checks bypass all subscription logic
- [ ] Type definitions enforce `crisis_access: true`
- [ ] Database constraints enforce `crisis_access_enabled = TRUE`
- [ ] Tests verify crisis access in all states (no subscription, expired, etc.)
- [ ] No network dependencies for crisis access checks
- [ ] No performance degradation for crisis feature checks

---

## Security Considerations

### Receipt Verification

**CRITICAL**: All receipt verification MUST occur server-side.

```typescript
// ❌ NEVER do this (client-side verification)
const isValid = verifyReceiptLocally(receiptData);

// ✅ ALWAYS do this (server-side verification)
const result = await fetch('/functions/v1/verify-apple-receipt', {
  method: 'POST',
  body: JSON.stringify({ receiptData }),
});
```

### Subscription Data as PHI

Subscription metadata is treated as Protected Health Information (PHI):

1. **Storage**: Encrypted in SecureStore
2. **Transmission**: HTTPS only
3. **Database**: Row Level Security (RLS) enforced
4. **Logging**: No PHI in logs

```typescript
// ❌ NEVER log subscription details
console.log('Subscription:', subscription);

// ✅ Log generic events only
console.log('Subscription status updated');
```

### Platform Security

**Apple StoreKit 2**:
- Uses App Store Server API for verification
- JWT tokens validated server-side
- Receipt data encrypted in transit

**Google Play Billing**:
- Uses Google Play Developer API
- OAuth 2.0 service account authentication
- Purchase tokens validated server-side

---

## Testing Strategy

### Unit Tests

1. **subscriptionStore.test.ts** (389 lines)
   - Crisis access guarantee (CRITICAL)
   - Feature access by status
   - Trial management
   - Performance validation

2. **IAPService.test.ts** (344 lines)
   - Service initialization
   - Purchase flow
   - Receipt verification
   - Platform detection

3. **FeatureGate.test.tsx** (267 lines)
   - Component rendering
   - Crisis feature gating
   - Upgrade prompts
   - Hook functionality

### Integration Tests

4. **subscription.integration.test.ts** (500+ lines)
   - Full lifecycle flow
   - State transitions
   - Platform-specific flows
   - Error handling

### Running Tests

```bash
# Run all subscription tests
npm test -- subscription

# Run specific test file
npm test -- subscriptionStore.test.ts

# Run with coverage
npm test -- --coverage subscription

# Watch mode
npm test -- --watch subscription
```

### Performance Benchmarks

```bash
# Feature access performance
npm run perf:subscription:feature-access

# Receipt verification performance
npm run perf:subscription:verification

# Full purchase flow performance
npm run perf:subscription:purchase-flow
```

---

## Integration Steps

### 1. Environment Setup

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Apple App Store Connect
APPLE_APP_STORE_CONNECT_API_KEY=your-api-key
APPLE_APP_STORE_CONNECT_ISSUER_ID=your-issuer-id

# Google Play Console
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY=your-service-account.json
```

### 2. Initialize IAP Service

```typescript
// app/_layout.tsx or App.tsx
import { IAPService } from './src/services/subscription/IAPService';
import { useSubscriptionStore } from './src/stores/subscriptionStore';

export default function App() {
  useEffect(() => {
    async function initializeSubscription() {
      // Load subscription from storage
      await useSubscriptionStore.getState().loadSubscription();

      // Initialize IAP service
      if (IAPService.isAvailable()) {
        await IAPService.initialize();
      }
    }

    initializeSubscription();
  }, []);

  return <YourApp />;
}
```

### 3. Add Subscription Screens

```typescript
// app/(tabs)/subscription.tsx
import { PurchaseOptionsScreen } from '@/components/subscription';

export default function SubscriptionScreen() {
  return <PurchaseOptionsScreen />;
}
```

### 4. Add Feature Gates

```typescript
// Wrap features with FeatureGate
import FeatureGate from '@/components/subscription/FeatureGate';

function CheckInScreen() {
  return (
    <FeatureGate
      feature="checkIns"
      onUpgrade={() => router.push('/subscription')}
    >
      <CheckInComponent />
    </FeatureGate>
  );
}
```

### 5. Wire Up Navigation

```typescript
// Example: Add subscription link to settings
<TouchableOpacity onPress={() => router.push('/subscription')}>
  <Text>Manage Subscription</Text>
</TouchableOpacity>
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Environment variables configured (Supabase URLs, API keys)
- [ ] Product IDs configured in App Store Connect / Google Play Console
- [ ] Edge Functions deployed to Supabase
- [ ] Database migrations applied
- [ ] RLS policies verified
- [ ] Webhook endpoints configured

### App Store / Play Store Configuration

**Apple App Store Connect**:
- [ ] Subscription products created (monthly, yearly)
- [ ] Pricing configured for all regions
- [ ] Free trial configured (28 days)
- [ ] Auto-renewable subscription enabled
- [ ] Server-to-Server notifications configured

**Google Play Console**:
- [ ] Subscription products created
- [ ] Pricing configured
- [ ] Free trial configured (28 days)
- [ ] Real-time developer notifications configured

### Testing

- [ ] All unit tests pass (`npm test`)
- [ ] Integration tests pass
- [ ] Performance benchmarks meet targets
- [ ] Manual testing on iOS device (StoreKit sandbox)
- [ ] Manual testing on Android device (Play Billing test mode)
- [ ] Receipt verification working
- [ ] Restore purchases working
- [ ] Crisis access verified in all states

### Security Validation

- [ ] Receipt verification server-side only
- [ ] No PHI in logs
- [ ] SecureStore encryption working
- [ ] Database RLS policies active
- [ ] HTTPS enforced
- [ ] Webhook signatures validated

### Crisis Compliance

- [ ] `getCrisisAccessStatus()` returns literal `true`
- [ ] Crisis features accessible with no subscription
- [ ] Crisis features accessible with expired subscription
- [ ] Crisis features accessible during network failures
- [ ] Type definitions enforce crisis access
- [ ] Database constraints enforce crisis access

### Performance Validation

- [ ] Feature access checks <100ms
- [ ] Receipt verification <2s
- [ ] Purchase flow <60s
- [ ] Crisis access ~0ms
- [ ] No blocking operations on UI thread

### Monitoring

- [ ] Purchase events logged to analytics
- [ ] Receipt verification failures monitored
- [ ] Subscription status changes tracked
- [ ] Performance metrics collected
- [ ] Error rates monitored

---

## Troubleshooting

### Common Issues

**"IAP service not initialized"**
- Ensure `IAPService.initialize()` is called on app start
- Check if IAP is available: `IAPService.isAvailable()`

**"Receipt verification failed"**
- Verify Supabase Edge Functions are deployed
- Check environment variables are set
- Ensure network connectivity
- Verify Apple/Google API keys are valid

**"Purchase not completing"**
- Check purchase listener is set up
- Verify product IDs match App Store/Play Store
- Check StoreKit/Billing sandbox mode
- Ensure device has payment method configured

**"Feature gate not working"**
- Verify subscription store is loaded: `loadSubscription()`
- Check feature access calculation: `calculateFeatureAccess()`
- Ensure `FeatureGate` component is using correct feature key

**"Crisis features not accessible"**
- **🚨 CRITICAL**: This should NEVER happen
- Verify `getCrisisAccessStatus()` returns literal `true`
- Check crisis feature checks in `checkFeatureAccess()`
- Review type definitions for crisis features
- File urgent bug report

---

## Additional Resources

- **Supabase Edge Functions**: `/supabase/functions/README.md`
- **Database Schema**: `/supabase/migrations/`
- **Test Suite**: `/app/src/**/__tests__/`
- **Type Definitions**: `/app/src/types/subscription.ts`

## Support

For questions or issues:
1. Check test files for implementation examples
2. Review Supabase Edge Function logs
3. Check App Store Connect / Play Console for IAP issues
4. File GitHub issue with reproduction steps
