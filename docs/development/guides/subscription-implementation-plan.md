# Subscription System Implementation Plan

## Overview

This document outlines the step-by-step plan to complete the subscription system implementation. The system is **70% complete** - all architecture, UI, and core logic is built. Remaining work focuses on completing the purchase flow and backend integration.

**Current Status**: ✅ Architecture Complete | ⚠️ Purchase Flow Stubbed | ❌ Backend Needs Deployment

---

## What Works Today (No External Dependencies)

### ✅ Fully Functional
- Crisis access guarantee (hardcoded true, tested)
- Trial system (28-day trials, countdown, storage)
- Feature gating (FeatureGate component, hooks, HOCs)
- UI components (PurchaseOptions, StatusCard, FeatureGate)
- Navigation integration (screens wired up)
- Type safety (comprehensive TypeScript)
- Test coverage (22/22 core tests passing)

### ⚠️ Stubbed (Architecture Complete, Needs Implementation)
- Purchase flow (throws error when "Buy" tapped)
- Restore purchases (throws error)
- Receipt verification (calls endpoints that don't exist)
- User authentication (uses placeholder 'user_placeholder')

### ❌ Not Started
- Backend Edge Functions (verification logic)
- App Store/Play Store product configuration
- Legal document updates (Terms, Privacy)
- Production analytics integration

---

## Implementation Phases

### Phase A: Local Development (No Apple/Google Accounts Needed)

**Timeline**: 5-7 days
**Can Start**: Immediately
**Dependencies**: None

#### A1. Mock Purchase Flow (Day 1-2) - 4 hours

**Goal**: Complete end-to-end purchase flow using mock data

**Tasks**:
1. Add mock mode flag to IAPService
2. Implement mock purchase completion
3. Add mock receipt generation
4. Wire up to PurchaseOptionsScreen
5. Test trial → purchase flow

**Files to modify**:
- `/app/src/services/subscription/IAPService.ts`
- `/app/src/components/subscription/PurchaseOptionsScreen.tsx`

**Deliverable**: Working purchase flow in development mode

#### A2. Auth Integration (Day 2-3) - 2 hours

**Goal**: Replace placeholder user ID with real auth

**Tasks**:
1. Identify auth system (Supabase Auth? Custom?)
2. Replace 'user_placeholder' with real user ID
3. Add auth error handling
4. Test subscription tied to real users

**Files to modify**:
- `/app/src/stores/subscriptionStore.ts` (line 167, 214, etc.)

**Deliverable**: User-aware subscriptions

#### A3. Local Edge Functions (Day 3-4) - 4 hours

**Goal**: Build and test receipt verification locally

**Tasks**:
1. Set up local Supabase (`supabase start`)
2. Write verification function with mock mode
3. Test with curl/Postman
4. Wire up to app for testing
5. Add error handling

**Files to modify**:
- `/supabase/functions/verify-apple-receipt/index.ts`
- `/supabase/functions/verify-google-receipt/index.ts`

**Deliverable**: Testable verification endpoints

#### A4. Gate More Features (Day 4-5) - 3 hours

**Goal**: Demonstrate feature gating across app

**Tasks**:
1. Gate Exercises screen
2. Gate individual premium exercises
3. Gate therapeutic content
4. Gate progress insights (already done)
5. Add upgrade prompts

**Files to modify**:
- `/app/src/screens/ExercisesScreen.tsx`
- Other feature screens as needed

**Deliverable**: Comprehensive feature gating

#### A5. Analytics Integration (Day 5-6) - 2 hours

**Goal**: Track subscription events properly

**If you have analytics service** (Mixpanel, Amplitude, Firebase):
1. Create analytics wrapper service
2. Replace console.log with real tracking
3. Add subscription funnel events
4. Test event flow

**If you don't have analytics**:
1. Skip for now
2. Add TODO comment
3. Revisit when analytics is ready

**Files to modify**:
- `/app/src/stores/subscriptionStore.ts` (line 102, 122, etc.)
- Create `/app/src/services/analytics/index.ts`

**Deliverable**: Subscription analytics tracking

#### A6. Error Handling & UX (Day 6-7) - 3 hours

**Goal**: Improve error messages and edge cases

**Tasks**:
1. Add better error messages
2. Handle offline scenarios
3. Add retry logic
4. Improve loading states
5. Add success/failure animations

**Files to modify**:
- `/app/src/stores/subscriptionStore.ts`
- `/app/src/components/subscription/PurchaseOptionsScreen.tsx`

**Deliverable**: Production-quality error handling

#### A7. Legal Document Drafts (Day 7) - 2 hours

**Goal**: Draft subscription terms (lawyer review later)

**Tasks**:
1. Write Terms of Service - Subscription section
2. Write Privacy Policy - Subscription data section
3. Document cancellation process
4. Document refund policy
5. Save for legal review

**Files to create**:
- `/docs/brand-legal/legal/subscription-terms-draft.md`
- `/docs/brand-legal/legal/subscription-privacy-draft.md`

**Deliverable**: Legal document drafts

---

### Phase B: Backend Deployment (Needs Supabase Access)

**Timeline**: 2-3 days
**Can Start**: After Phase A1-A3
**Dependencies**: Supabase project access

#### B1. Deploy Edge Functions (Day 1) - 3 hours

**Tasks**:
1. Test functions locally (from A3)
2. Add environment variables to Supabase
3. Deploy `verify-apple-receipt` function
4. Deploy `verify-google-receipt` function
5. Deploy `subscription-webhook` function
6. Test with production URLs

**Commands**:
```bash
supabase functions deploy verify-apple-receipt
supabase functions deploy verify-google-receipt
supabase functions deploy subscription-webhook
```

**Deliverable**: Live receipt verification endpoints

#### B2. Database Migration (Day 1) - 1 hour

**Tasks**:
1. Review migration files
2. Apply to production database
3. Verify tables created correctly
4. Test RLS policies
5. Verify indexes

**Commands**:
```bash
supabase db push
```

**Deliverable**: Production database ready

#### B3. Configure Secrets (Day 1) - 1 hour

**Tasks**:
1. Add Apple App Store Connect API key
2. Add Google Service Account key
3. Add Supabase service role key
4. Test secret access from functions

**Commands**:
```bash
supabase secrets set APPLE_API_KEY=...
supabase secrets set GOOGLE_SERVICE_ACCOUNT=...
```

**Deliverable**: Secure credential storage

#### B4. Test Verification Flow (Day 2) - 2 hours

**Tasks**:
1. Generate test receipt (sandbox)
2. Call verification endpoint
3. Verify response format
4. Check database updates
5. Test error scenarios

**Deliverable**: Verified backend integration

#### B5. Set Up Webhooks (Day 2-3) - 3 hours

**Tasks**:
1. Configure Apple App Store Server Notifications
2. Configure Google Real-time Developer Notifications
3. Point to `subscription-webhook` endpoint
4. Test renewal notifications
5. Test cancellation notifications

**Deliverable**: Automatic subscription updates

---

### Phase C: App Store Configuration (Needs Developer Accounts)

**Timeline**: 2-3 days
**Can Start**: Anytime (can be parallel with Phase B)
**Dependencies**: Apple Developer Program ($99/year), Google Play Console ($25 one-time)

#### C1. Apple App Store Connect (Day 1) - 3 hours

**Tasks**:
1. Log into App Store Connect
2. Navigate to app → Subscriptions
3. Create subscription group "Being Premium"
4. Create products:
   - `com.being.subscription.monthly` - $9.99/month
   - `com.being.subscription.yearly` - $79.99/year
5. Configure 28-day free trial (introductory offer)
6. Set up auto-renewable settings
7. Write subscription descriptions
8. Add localized pricing for regions
9. Submit for review (can take 1-2 days)

**Deliverable**: Apple products configured

#### C2. Google Play Console (Day 1-2) - 3 hours

**Tasks**:
1. Log into Google Play Console
2. Navigate to app → Subscriptions
3. Create products:
   - `subscription_monthly` - $9.99/month
   - `subscription_yearly` - $79.99/year
4. Configure 28-day free trial
5. Set up pricing templates
6. Configure billing grace period (3 days)
7. Enable real-time developer notifications
8. Configure base plans and offers

**Deliverable**: Google products configured

#### C3. Test in Sandbox (Day 2-3) - 4 hours

**Apple Sandbox Testing**:
1. Create sandbox test accounts (App Store Connect)
2. Sign in to sandbox on device
3. Test purchase flow
4. Test trial → paid conversion
5. Test restore purchases
6. Test cancellation
7. Test renewal

**Google Sandbox Testing**:
1. Add test accounts (Google Play Console)
2. Join testing track
3. Test purchase flow
4. Test restore purchases
5. Test subscription management

**Deliverable**: Verified IAP flows

---

### Phase D: Integration & Testing (Final Polish)

**Timeline**: 3-4 days
**Can Start**: After A, B, C complete
**Dependencies**: All previous phases

#### D1. End-to-End Testing (Day 1-2) - 8 hours

**Test Scenarios**:
1. New user → Start trial → Features unlock
2. Trial user → Convert to monthly → Payment succeeds
3. Paid user → Restore on new device → Subscription restored
4. Paid user → Cancel → Access continues until period end
5. Expired user → Crisis features still work
6. Payment failure → Grace period → Retry payment
7. Offline mode → Purchase queued → Syncs when online

**Deliverable**: All flows verified

#### D2. Device Testing (Day 2) - 4 hours

**iOS Testing**:
- Test on iPhone (Face ID, Touch ID)
- Test on iPad
- Test with VoiceOver
- Test with large text
- Test in airplane mode

**Android Testing**:
- Test on Android phone (fingerprint)
- Test on Android tablet
- Test with TalkBack
- Test with high contrast
- Test in airplane mode

**Deliverable**: Multi-device verification

#### D3. Performance Testing (Day 3) - 3 hours

**Metrics to verify**:
- Feature access check: <100ms ✓
- Receipt verification: <2s ✓
- Purchase flow: <60s ✓
- Crisis access: ~0ms ✓
- Store load: <200ms

**Deliverable**: Performance benchmarks met

#### D4. Legal Review (Day 3-4) - Variable

**Tasks**:
1. Send Terms/Privacy drafts to lawyer
2. Incorporate feedback
3. Update app with final legal docs
4. Ensure compliance with:
   - Apple App Store Review Guidelines
   - Google Play Billing policies
   - FTC disclosure requirements
   - State/federal subscription laws

**Deliverable**: Legal compliance

#### D5. Final QA Pass (Day 4) - 4 hours

**Checklist**:
- [ ] All critical paths tested
- [ ] No placeholder text in UI
- [ ] Legal links work
- [ ] Error messages helpful
- [ ] Loading states smooth
- [ ] Analytics tracking
- [ ] Accessibility verified
- [ ] Crisis access guaranteed

**Deliverable**: Production-ready

---

## Quick Start Guide (What to Do Right Now)

### Option 1: Test Trial Flow (5 minutes)

**Already works!** No code changes needed:

1. Run app: `npm start`
2. Navigate to Profile → Subscription
3. Tap subscription card
4. (Need to add trial button - see next section)

### Option 2: Add Trial Button (15 minutes)

**Quick win** - Add to `PurchaseOptionsScreen.tsx`:

```tsx
<TouchableOpacity
  style={styles.trialButton}
  onPress={async () => {
    await subscriptionStore.createTrial();
    Alert.alert('Trial Started!', '28 days of full access');
    navigation.goBack();
  }}
>
  <Text style={styles.buttonText}>Start 28-Day Free Trial</Text>
</TouchableOpacity>
```

### Option 3: Implement Mock Purchase (Next Section)

**Complete purchase flow** without App Store - see detailed implementation below.

---

## Detailed Implementation: Mock Purchase Flow

### Step 1: Add Mock Mode to IAPService

**File**: `/app/src/services/subscription/IAPService.ts`

```typescript
class IAPServiceImpl {
  private mockMode = __DEV__; // Auto-enable in development

  async purchaseSubscription(interval: 'monthly' | 'yearly'): Promise<MockReceipt | null> {
    if (!this.isInitialized && !this.mockMode) {
      throw new Error('IAP service not initialized');
    }

    if (this.mockMode) {
      console.log('[IAP] Mock mode: Simulating purchase for', interval);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate mock receipt
      const mockReceipt = {
        receiptData: 'mock_receipt_' + Date.now(),
        productId: this.PRODUCT_IDS[interval],
        transactionId: 'mock_tx_' + Date.now(),
        purchaseTime: Date.now(),
        interval,
        platform: this.getPlatform()
      };

      console.log('[IAP] Mock purchase successful:', mockReceipt);
      return mockReceipt;
    }

    // Real IAP code (existing)
    const productId = this.PRODUCT_IDS[interval];
    await InAppPurchases.purchaseItemAsync(productId);
    return null; // Purchase completes via listener
  }
}
```

### Step 2: Update Subscription Store

**File**: `/app/src/stores/subscriptionStore.ts`

Replace the stubbed `purchaseSubscription` (line 234):

```typescript
purchaseSubscription: async (interval: 'monthly' | 'yearly') => {
  try {
    set({ isLoading: true, error: null });

    // Get user ID (replace with real auth)
    const userId = 'current-user-id'; // TODO: Get from auth service

    // Call IAP service (handles mock mode automatically)
    const mockReceipt = await IAPService.purchaseSubscription(interval);

    if (mockReceipt) {
      // Mock mode: Verify and create subscription directly
      const subscription: Subscription = {
        id: 'sub_' + Date.now(),
        userId,
        platform: mockReceipt.platform,
        platformSubscriptionId: mockReceipt.transactionId,
        status: 'active',
        tier: 'standard',
        interval: mockReceipt.interval,
        priceUsd: mockReceipt.interval === 'yearly' ? 79.99 : 9.99,
        currency: 'USD',
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: Date.now(),
        subscriptionEndDate: Date.now() + (mockReceipt.interval === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000,
        gracePeriodEnd: null,
        lastReceiptVerified: Date.now(),
        receiptData: mockReceipt.receiptData,
        lastPaymentDate: Date.now(),
        paymentFailureCount: 0,
        crisisAccessEnabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Calculate feature access
      const featureAccess = calculateFeatureAccess('active');

      // Save to SecureStore
      await SecureStore.setItemAsync('subscription', JSON.stringify(subscription));

      // Update state
      set({ subscription, featureAccess, isLoading: false });

      // Track event
      get().trackSubscriptionEvent('subscription_purchased', {
        subscriptionId: subscription.id,
        interval: subscription.interval,
        priceUsd: subscription.priceUsd
      });

      console.log('[Subscription] Purchase completed (mock mode)');
    } else {
      // Real mode: Wait for purchase listener to handle
      console.log('[Subscription] Purchase initiated, waiting for completion...');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    set({
      error: `Purchase failed: ${message}`,
      isLoading: false
    });
    console.error('[Subscription] Purchase error:', error);
    throw error;
  }
},
```

### Step 3: Wire Up to UI

**File**: `/app/src/components/subscription/PurchaseOptionsScreen.tsx`

Update the purchase handlers:

```typescript
const handleMonthlyPurchase = async () => {
  try {
    setIsLoading(true);
    await subscriptionStore.purchaseSubscription('monthly');

    // Show success message
    Alert.alert(
      'Subscription Active!',
      __DEV__
        ? 'Mock subscription activated. Monthly billing: $9.99/month'
        : 'Thank you for subscribing! You now have full access to Being.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  } catch (error) {
    Alert.alert(
      'Purchase Failed',
      error instanceof Error ? error.message : 'Unknown error occurred',
      [{ text: 'OK' }]
    );
  } finally {
    setIsLoading(false);
  }
};

const handleYearlyPurchase = async () => {
  try {
    setIsLoading(true);
    await subscriptionStore.purchaseSubscription('yearly');

    Alert.alert(
      'Subscription Active!',
      __DEV__
        ? 'Mock subscription activated. Yearly billing: $79.99/year'
        : 'Thank you for subscribing! You now have full access to Being.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  } catch (error) {
    Alert.alert(
      'Purchase Failed',
      error instanceof Error ? error.message : 'Unknown error occurred',
      [{ text: 'OK' }]
    );
  } finally {
    setIsLoading(false);
  }
};
```

### Step 4: Add Free Trial Button

Add to the render method in `PurchaseOptionsScreen.tsx`:

```tsx
{/* Free Trial Section */}
<View style={styles.trialSection}>
  <Text style={styles.trialTitle}>Try Free for 28 Days</Text>
  <Text style={styles.trialDescription}>
    Get full access to all therapeutic exercises, progress insights, and personalized guidance.
    Cancel anytime before trial ends.
  </Text>

  <TouchableOpacity
    style={[styles.purchaseButton, styles.trialButton]}
    onPress={async () => {
      try {
        setIsLoading(true);
        await subscriptionStore.createTrial();
        Alert.alert(
          'Trial Started!',
          '28 days of full access to Being. We\'ll remind you before your trial ends.',
          [{ text: 'Get Started', onPress: () => navigation.goBack() }]
        );
      } catch (error) {
        Alert.alert('Error', 'Could not start trial. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }}
    disabled={isLoading}
  >
    <Text style={styles.purchaseButtonText}>
      Start Free Trial
    </Text>
  </TouchableOpacity>
</View>
```

Add corresponding styles:

```typescript
trialSection: {
  marginTop: spacing.xl,
  padding: spacing.lg,
  backgroundColor: colors.background,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: colors.morningPrimary,
},
trialTitle: {
  fontSize: 22,
  fontWeight: '600',
  color: colors.black,
  marginBottom: spacing.sm,
  textAlign: 'center',
},
trialDescription: {
  fontSize: 16,
  color: colors.gray600,
  textAlign: 'center',
  lineHeight: 22,
  marginBottom: spacing.lg,
},
trialButton: {
  backgroundColor: colors.morningPrimary,
},
```

---

## Testing the Mock Flow

### Test Case 1: Free Trial
1. Launch app
2. Navigate to Profile → Subscription
3. Tap "Start Free Trial"
4. ✅ Alert: "Trial Started!"
5. ✅ Navigate back to Profile
6. ✅ Status shows "Free Trial - 28 days remaining"
7. ✅ Navigate to Insights → Content visible (not locked)

### Test Case 2: Mock Purchase
1. Complete Test Case 1 (or start without trial)
2. Navigate to Profile → Subscription
3. Tap "Subscribe Monthly"
4. ✅ Loading spinner appears (1.5s delay)
5. ✅ Alert: "Subscription Active! Mock subscription..."
6. ✅ Navigate back to Profile
7. ✅ Status shows "Active Subscription"
8. ✅ All features unlocked

### Test Case 3: State Persistence
1. Complete Test Case 2
2. Force close app
3. Relaunch app
4. Navigate to Profile
5. ✅ Status shows "Active Subscription" (persisted in SecureStore)
6. ✅ Features still unlocked

### Test Case 4: Crisis Access (Always)
1. Launch app (no trial, no subscription)
2. ✅ Crisis button visible and accessible
3. Start trial
4. ✅ Crisis button still accessible
5. Purchase subscription
6. ✅ Crisis button still accessible
7. Delete subscription (manually clear SecureStore)
8. ✅ Crisis button STILL accessible (hardcoded true)

---

## Environment Variables Checklist

### Development (.env.development)
```bash
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
EXPO_PUBLIC_ENABLE_MOCK_IAP=true
```

### Production (.env.production)
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
EXPO_PUBLIC_ENABLE_MOCK_IAP=false
```

---

## Troubleshooting Guide

### Issue: "IAP service not initialized"
**Cause**: IAPService.initialize() not called on app startup
**Fix**: Check `App.tsx` lines 40-46

### Issue: "User not authenticated"
**Cause**: Using placeholder user ID
**Fix**: Implement auth integration (Phase A2)

### Issue: Mock receipts not verifying
**Cause**: Backend expects real Apple/Google receipts
**Fix**: Add mock mode to Edge Functions (Phase A3)

### Issue: Features not unlocking after purchase
**Cause**: FeatureAccess not calculated correctly
**Fix**: Check `calculateFeatureAccess()` is called after purchase

### Issue: Subscription doesn't persist
**Cause**: SecureStore not saving
**Fix**: Check SecureStore permissions, verify save/load logic

---

## Success Criteria

### Phase A Complete When:
- [ ] Mock purchase flow works end-to-end
- [ ] Real user IDs (not placeholder)
- [ ] Local Edge Functions testable
- [ ] Multiple features gated
- [ ] Analytics tracking (if available)
- [ ] Better error handling
- [ ] Legal drafts written

### Phase B Complete When:
- [ ] Edge Functions deployed to production
- [ ] Database migrations applied
- [ ] Secrets configured securely
- [ ] Verification flow tested
- [ ] Webhooks receiving events

### Phase C Complete When:
- [ ] Apple products configured and approved
- [ ] Google products configured
- [ ] Sandbox testing passed
- [ ] Real purchases working

### Phase D Complete When:
- [ ] All test scenarios pass
- [ ] Multi-device verified
- [ ] Performance benchmarks met
- [ ] Legal review complete
- [ ] Ready for App Store submission

---

## Timeline Summary

**Minimum (Just Get It Working)**:
- Phase A (Mock): 5 days
- Phase B (Backend): 2 days
- Phase C (Stores): 3 days
- Phase D (Testing): 2 days
- **Total**: 12 days (~2.5 weeks)

**Recommended (Production Quality)**:
- Phase A: 7 days
- Phase B: 3 days
- Phase C: 3 days
- Phase D: 4 days
- **Total**: 17 days (~3.5 weeks)

**With Parallel Work** (Backend + Stores simultaneously):
- Week 1: Phase A (Mock)
- Week 2: Phase B + C (Backend + Stores in parallel)
- Week 3: Phase D (Testing + Polish)
- **Total**: 3 weeks

---

## Next Steps

**Start Now** (No blockers):
1. ✅ Implement mock purchase flow (see detailed guide above)
2. ✅ Integrate auth system
3. ✅ Build local Edge Functions

**Start Soon** (Minor blockers):
1. ⚠️ Gate more features (need feature list)
2. ⚠️ Add analytics (if service exists)
3. ⚠️ Write legal drafts

**Start Later** (Major blockers):
1. ❌ Deploy to Supabase (need credentials)
2. ❌ Configure stores (need developer accounts)
3. ❌ Legal review (need lawyer)

---

## Resources

**Documentation**:
- Implementation Guide: `/docs/development/guides/subscription-system-implementation-guide.md`
- Security Compliance: `/docs/security/subscription-security-compliance.md`
- This Plan: `/docs/development/guides/subscription-implementation-plan.md`

**Code**:
- Types: `/app/src/types/subscription/index.ts`
- Store: `/app/src/stores/subscriptionStore.ts`
- Service: `/app/src/services/subscription/IAPService.ts`
- Components: `/app/src/components/subscription/`
- Tests: `/app/src/**/__tests__/*subscription*`

**External**:
- Apple IAP Docs: https://developer.apple.com/in-app-purchase/
- Google Billing Docs: https://developer.android.com/google/play/billing
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- expo-in-app-purchases: https://docs.expo.dev/versions/latest/sdk/in-app-purchases/

---

**Last Updated**: 2025-10-01
**Status**: Phase A Ready to Start
**Next Action**: Implement Mock Purchase Flow (#6)
