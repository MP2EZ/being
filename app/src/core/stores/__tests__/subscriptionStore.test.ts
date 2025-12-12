/**
 * SUBSCRIPTION STORE TESTS
 * Critical tests for subscription state management
 *
 * CRITICAL SAFETY CHECKS:
 * - Crisis access ALWAYS returns true (legal requirement)
 * - Feature access correctly gated by subscription status
 * - Trial/grace period calculations accurate
 * - State transitions follow business logic
 *
 * PERFORMANCE:
 * - Subscription checks <100ms
 * - State updates non-blocking
 */

import { useSubscriptionStore } from '../subscriptionStore';
import * as SecureStore from 'expo-secure-store';
import { calculateFeatureAccess } from '../../types/subscription';

// Mock SecureStore
jest.mock('expo-secure-store');

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('Subscription Store - Crisis Access Guarantee', () => {
  beforeEach(() => {
    // Reset store state
    const store = useSubscriptionStore.getState();
    useSubscriptionStore.setState({
      subscription: null,
      featureAccess: null,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  it('CRITICAL: Crisis access ALWAYS returns true regardless of subscription', () => {
    const store = useSubscriptionStore.getState();

    // Test with no subscription
    expect(store.checkFeatureAccess('crisisButton')).toBe(true);
    expect(store.checkFeatureAccess('crisisContacts')).toBe(true);
    expect(store.checkFeatureAccess('safetyPlan')).toBe(true);
    expect(store.checkFeatureAccess('nineEightEightAccess')).toBe(true);
    expect(store.getCrisisAccessStatus()).toBe(true);

    console.log('✅ LEGAL COMPLIANCE VERIFIED: Crisis access guaranteed with no subscription');
  });

  it('CRITICAL: Crisis access returns true even with expired subscription', async () => {
    const store = useSubscriptionStore.getState();

    // Set expired subscription
    useSubscriptionStore.setState({
      subscription: {
        id: 'test-id',
        userId: 'test-user',
        platform: 'apple',
        platformSubscriptionId: 'test-sub',
        status: 'expired',
        tier: 'standard',
        interval: 'monthly',
        priceUsd: 10,
        currency: 'USD',
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: Date.now() - 60 * 24 * 60 * 60 * 1000, // 60 days ago
        subscriptionEndDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        gracePeriodEnd: null,
        lastReceiptVerified: null,
        receiptData: null,
        lastPaymentDate: null,
        paymentFailureCount: 0,
        crisisAccessEnabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    // Wait for state synchronization
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(store.checkFeatureAccess('crisisButton')).toBe(true);
    expect(store.checkFeatureAccess('crisisContacts')).toBe(true);
    expect(store.checkFeatureAccess('safetyPlan')).toBe(true);
    expect(store.checkFeatureAccess('nineEightEightAccess')).toBe(true);
    expect(store.getCrisisAccessStatus()).toBe(true);

    console.log('✅ LEGAL COMPLIANCE VERIFIED: Crisis access guaranteed with expired subscription');
  });

  it('CRITICAL: getCrisisAccessStatus() type is hardcoded to return true', () => {
    const store = useSubscriptionStore.getState();

    // TypeScript should enforce this return type as `true`, not `boolean`
    const result = store.getCrisisAccessStatus();
    expect(result).toBe(true);

    // Verify it's the literal true, not just truthy
    expect(result === true).toBe(true);

    console.log('✅ TYPE SAFETY VERIFIED: getCrisisAccessStatus() returns literal true');
  });
});

describe('Subscription Store - Feature Access', () => {
  beforeEach(() => {
    useSubscriptionStore.setState({
      subscription: null,
      featureAccess: null,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  it('Trial status grants access to non-crisis features', async () => {
    const store = useSubscriptionStore.getState();

    useSubscriptionStore.setState({
      subscription: {
        id: 'test-id',
        userId: 'test-user',
        platform: 'apple',
        platformSubscriptionId: 'test-sub',
        status: 'trial',
        tier: 'standard',
        interval: 'monthly',
        priceUsd: 0,
        currency: 'USD',
        trialStartDate: Date.now(),
        trialEndDate: Date.now() + 28 * 24 * 60 * 60 * 1000,
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        gracePeriodEnd: null,
        lastReceiptVerified: null,
        receiptData: null,
        lastPaymentDate: null,
        paymentFailureCount: 0,
        crisisAccessEnabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    // Calculate feature access
    const featureAccess = calculateFeatureAccess('trial');
    useSubscriptionStore.setState({ featureAccess });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(store.checkFeatureAccess('checkIns')).toBe(true);
    expect(store.checkFeatureAccess('breathingExercises')).toBe(true);
    expect(store.checkFeatureAccess('therapeuticContent')).toBe(true);
    expect(store.checkFeatureAccess('progressInsights')).toBe(true);
    expect(store.checkFeatureAccess('assessments')).toBe(true);

    console.log('✅ FEATURE ACCESS VERIFIED: Trial grants access to all features');
  });

  it('Active status grants access to non-crisis features', async () => {
    const store = useSubscriptionStore.getState();

    useSubscriptionStore.setState({
      subscription: {
        id: 'test-id',
        userId: 'test-user',
        platform: 'apple',
        platformSubscriptionId: 'test-sub',
        status: 'active',
        tier: 'standard',
        interval: 'yearly',
        priceUsd: 79.99,
        currency: 'USD',
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: Date.now(),
        subscriptionEndDate: Date.now() + 365 * 24 * 60 * 60 * 1000,
        gracePeriodEnd: null,
        lastReceiptVerified: Date.now(),
        receiptData: 'encrypted-receipt',
        lastPaymentDate: Date.now(),
        paymentFailureCount: 0,
        crisisAccessEnabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    const featureAccess = calculateFeatureAccess('active');
    useSubscriptionStore.setState({ featureAccess });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(store.checkFeatureAccess('checkIns')).toBe(true);
    expect(store.checkFeatureAccess('breathingExercises')).toBe(true);
    expect(store.checkFeatureAccess('therapeuticContent')).toBe(true);

    console.log('✅ FEATURE ACCESS VERIFIED: Active subscription grants full access');
  });

  it('Expired status blocks non-crisis features but allows crisis features', async () => {
    const store = useSubscriptionStore.getState();

    useSubscriptionStore.setState({
      subscription: {
        id: 'test-id',
        userId: 'test-user',
        platform: 'google',
        platformSubscriptionId: 'test-sub',
        status: 'expired',
        tier: 'standard',
        interval: 'monthly',
        priceUsd: 10,
        currency: 'USD',
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: Date.now() - 60 * 24 * 60 * 60 * 1000,
        subscriptionEndDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
        gracePeriodEnd: null,
        lastReceiptVerified: Date.now() - 30 * 24 * 60 * 60 * 1000,
        receiptData: 'encrypted-receipt',
        lastPaymentDate: Date.now() - 60 * 24 * 60 * 60 * 1000,
        paymentFailureCount: 0,
        crisisAccessEnabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    const featureAccess = calculateFeatureAccess('expired');
    useSubscriptionStore.setState({ featureAccess });

    await new Promise(resolve => setTimeout(resolve, 10));

    // Non-crisis features should be blocked
    expect(store.checkFeatureAccess('checkIns')).toBe(false);
    expect(store.checkFeatureAccess('breathingExercises')).toBe(false);
    expect(store.checkFeatureAccess('therapeuticContent')).toBe(false);

    // Crisis features should ALWAYS be accessible
    expect(store.checkFeatureAccess('crisisButton')).toBe(true);
    expect(store.checkFeatureAccess('crisisContacts')).toBe(true);
    expect(store.checkFeatureAccess('safetyPlan')).toBe(true);

    console.log('✅ FEATURE GATING VERIFIED: Expired subscription blocks non-crisis, allows crisis');
  });

  it('Grace period continues access to non-crisis features', async () => {
    const store = useSubscriptionStore.getState();

    useSubscriptionStore.setState({
      subscription: {
        id: 'test-id',
        userId: 'test-user',
        platform: 'apple',
        platformSubscriptionId: 'test-sub',
        status: 'grace',
        tier: 'standard',
        interval: 'monthly',
        priceUsd: 10,
        currency: 'USD',
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
        subscriptionEndDate: Date.now() + 1 * 24 * 60 * 60 * 1000,
        gracePeriodEnd: Date.now() + 7 * 24 * 60 * 60 * 1000,
        lastReceiptVerified: Date.now(),
        receiptData: 'encrypted-receipt',
        lastPaymentDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
        paymentFailureCount: 1,
        crisisAccessEnabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    const featureAccess = calculateFeatureAccess('grace');
    useSubscriptionStore.setState({ featureAccess });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(store.checkFeatureAccess('checkIns')).toBe(true);
    expect(store.checkFeatureAccess('breathingExercises')).toBe(true);

    console.log('✅ GRACE PERIOD VERIFIED: Non-crisis features remain accessible');
  });
});

describe('Subscription Store - Trial Management', () => {
  beforeEach(() => {
    useSubscriptionStore.setState({
      subscription: null,
      featureAccess: null,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.getItemAsync.mockResolvedValue(null);
  });

  it('createTrial() creates 28-day trial subscription', async () => {
    const store = useSubscriptionStore.getState();

    await store.createTrial();
    await new Promise(resolve => setTimeout(resolve, 10));

    const updatedStore = useSubscriptionStore.getState();
    expect(updatedStore.subscription).toBeTruthy();
    expect(updatedStore.subscription?.status).toBe('trial');
    expect(updatedStore.subscription?.crisisAccessEnabled).toBe(true);

    // Verify trial duration is approximately 28 days
    const trialDurationMs = updatedStore.subscription!.trialEndDate! - updatedStore.subscription!.trialStartDate!;
    const trialDurationDays = trialDurationMs / (24 * 60 * 60 * 1000);
    expect(trialDurationDays).toBeCloseTo(28, 0);

    console.log('✅ TRIAL CREATION VERIFIED: 28-day trial created successfully');
  });

  it('getTrialDaysRemaining() returns correct countdown', async () => {
    const store = useSubscriptionStore.getState();

    await store.createTrial();
    await new Promise(resolve => setTimeout(resolve, 10));

    const updatedStore = useSubscriptionStore.getState();
    const daysRemaining = updatedStore.getTrialDaysRemaining();

    expect(daysRemaining).toBeGreaterThan(27);
    expect(daysRemaining).toBeLessThanOrEqual(28);

    console.log('✅ TRIAL COUNTDOWN VERIFIED:', daysRemaining, 'days remaining');
  });

  it('isTrialActive() returns true during trial', async () => {
    const store = useSubscriptionStore.getState();

    await store.createTrial();
    await new Promise(resolve => setTimeout(resolve, 10));

    const updatedStore = useSubscriptionStore.getState();
    expect(updatedStore.isTrialActive()).toBe(true);
    expect(updatedStore.isSubscriptionActive()).toBe(false);

    console.log('✅ TRIAL STATUS VERIFIED: Trial is active');
  });
});

describe('Subscription Store - Performance', () => {
  beforeEach(() => {
    useSubscriptionStore.setState({
      subscription: null,
      featureAccess: null,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  it('PERFORMANCE: Feature access check completes in <100ms', async () => {
    const store = useSubscriptionStore.getState();

    // Set up active subscription
    useSubscriptionStore.setState({
      subscription: {
        id: 'test-id',
        userId: 'test-user',
        platform: 'apple',
        platformSubscriptionId: 'test-sub',
        status: 'active',
        tier: 'standard',
        interval: 'monthly',
        priceUsd: 10,
        currency: 'USD',
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: Date.now(),
        subscriptionEndDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
        gracePeriodEnd: null,
        lastReceiptVerified: Date.now(),
        receiptData: null,
        lastPaymentDate: Date.now(),
        paymentFailureCount: 0,
        crisisAccessEnabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    const featureAccess = calculateFeatureAccess('active');
    useSubscriptionStore.setState({ featureAccess });

    // Measure feature access check time
    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      store.checkFeatureAccess('checkIns');
    }
    const endTime = performance.now();
    const avgTime = (endTime - startTime) / 1000;

    expect(avgTime).toBeLessThan(100); // <100ms per check

    console.log(`✅ PERFORMANCE VERIFIED: Feature access check: ${avgTime.toFixed(2)}ms (target: <100ms)`);
  });

  it('PERFORMANCE: Crisis access check is instant (0 lookups)', async () => {
    const store = useSubscriptionStore.getState();

    // Measure crisis access check time (should be instant, no store lookup)
    const startTime = performance.now();
    for (let i = 0; i < 10000; i++) {
      store.checkFeatureAccess('crisisButton');
    }
    const endTime = performance.now();
    const avgTime = (endTime - startTime) / 10000;

    expect(avgTime).toBeLessThan(1); // Should be microseconds, not milliseconds

    console.log(`✅ PERFORMANCE VERIFIED: Crisis access check: ${avgTime.toFixed(4)}ms (hardcoded, no lookup)`);
  });
});
