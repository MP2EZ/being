/**
 * Account erasure resets in-memory store state (DEBUG-671).
 *
 * `deleteAccountAndWipe` wiped disk but left every Zustand store holding its
 * pre-erasure state. The next persist after re-onboarding wrote that state back:
 * `stoicPracticeStore`'s 500ms debounce re-wrote erased check-ins, engagements and
 * reflections, and `assessmentStore`'s zustand `persist` re-wrote the whole PHQ-9 /
 * GAD-7 history on the first `set()`.
 *
 * The fix is a registry each store joins at module scope; the service runs it
 * after the server delete and immediately before the wipe. DEBUG-697 added the
 * entitlement cache, whose writers spread memory into `subscription_secure_v1`.
 * This suite drives the
 * real service, registry, stores and SecureStorageService over in-memory disks,
 * and asserts on what is ON DISK afterwards — proof of absence, not proof of a
 * call. Only the server delete, the analytics reset and the export sweep are
 * faked: the first is the network, and the other two are best-effort steps with
 * their own suites.
 *
 * Encryption is a pass-through, so a survivor would be readable plaintext rather
 * than hidden behind ciphertext (same reasoning as journalErasure.privacy.test.ts).
 *
 * `.privacy.` so the `Safety + privacy gates` CI job runs it (INFRA-368).
 */

const mockAsync = new Map<string, string>();
const mockSecure = new Map<string, string>();
/** When set, a SecureStore write to this key is held open until `release()`. */
const mockHold: { key: string | null; release: (() => void) | null } = { key: null, release: null };

jest.mock('@react-native-async-storage/async-storage', () => {
  const api = {
    getItem: jest.fn(async (k: string) => mockAsync.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      mockAsync.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      mockAsync.delete(k);
    }),
    getAllKeys: jest.fn(async () => [...mockAsync.keys()]),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((k) => mockAsync.delete(k));
    }),
  };
  return { __esModule: true, default: api, ...api };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockSecure.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    if (mockHold.key === k) {
      // Models a Keychain write that LANDS after whatever runs while it is pending.
      await new Promise<void>((resolve) => {
        mockHold.release = resolve;
      });
    }
    mockSecure.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockSecure.delete(k);
  }),
}));

jest.mock('@/core/services/supabase/SupabaseService', () => ({
  __esModule: true,
  default: { deleteAccount: jest.fn() },
}));

jest.mock('@/core/analytics/analyticsIdentityReset', () => ({
  resetAnalyticsIdentity: jest.fn(),
}));

jest.mock('@/core/services/privacy/exportArtifactSweeper', () => ({
  sweepExportArtifacts: jest.fn(() => 0),
}));

// DEBUG-697: the platform, so a receipt verification can be held open across a deletion.
jest.mock('@/core/services/subscription/IAPService', () => ({
  IAPService: {
    getPlatform: jest.fn(() => 'apple'),
    verifyReceipt: jest.fn(),
    finishTransaction: jest.fn(async () => undefined),
    restorePurchases: jest.fn(async () => []),
  },
}));

import supabaseService from '@/core/services/supabase/SupabaseService';
import SecureStorageService, {
  ACCOUNT_DELETION_ATTESTATION_KEY,
  WELLNESS_SECURE_STORE_KEYS,
} from '@/core/services/security/SecureStorageService';
import { deleteAccountAndWipe } from '@/core/services/privacy/AccountDeletionService';
import { registeredErasureResetOwners } from '@/core/services/privacy/erasureResetRegistry';
import { useConsentStore } from '@/core/stores/consentStore';
import { SESSION_STORAGE_KEYS } from '@/core/types/session';
import {
  flushStoicPracticePersist,
  useStoicPracticeStore,
} from '@/features/practices/stores/stoicPracticeStore';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { useEducationStore } from '@/features/learn/stores/educationStore';
import { useSubscriptionStore } from '@/core/stores/subscriptionStore';
import { CRISIS_FEATURES, DEFAULT_SUBSCRIPTION_CONFIG, calculateFeatureAccess } from '@/core/types/subscription';
import { IAPService } from '@/core/services/subscription/IAPService';
import { seedWellnessWriteConsent } from '../helpers/wellnessWriteConsent';

const STOIC_KEY = 'stoic_practice_state';
const ASSESSMENT_KEY = 'wellness_async_assessment_store';
const mockDeleteAccount = supabaseService.deleteAccount as jest.Mock;

const stoic = () => useStoicPracticeStore.getState();
const stoicOnDisk = () =>
  JSON.parse(mockSecure.get(STOIC_KEY)!) as {
    checkInCompletions: { type: string }[];
    principleEngagements: unknown[];
    weeklyReflections: unknown[];
  };
type AssessmentBlob = { completedAssessments: unknown[]; currentSession: unknown };
/** Two writers share the key: zustand `persist` wraps in `{ state }`, `saveProgress` does not. */
const assessmentOnDisk = (): AssessmentBlob => {
  const { data } = JSON.parse(mockAsync.get(ASSESSMENT_KEY)!) as { data: AssessmentBlob | { state: AssessmentBlob } };
  return 'state' in data ? data.state : data;
};

const PRIOR_ASSESSMENT = {
  id: 'phq9_prior',
  type: 'phq9',
  context: 'standalone',
  progress: {
    type: 'phq9',
    currentQuestionIndex: 9,
    totalQuestions: 9,
    startedAt: 1,
    answers: [],
    isComplete: true,
  },
};

/** Lets the deletion run as far as it can get without the held write landing. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

// ── DEBUG-697: the entitlement cache ──────────
const SUBSCRIPTION_KEY = 'subscription_secure_v1';
const PRIOR_SUBSCRIPTION = {
  id: 'sub_prior',
  userId: 'anonymous_prior',
  platform: 'apple',
  platformSubscriptionId: 'orig_tx_prior',
  status: 'active',
  tier: 'standard',
  interval: 'monthly',
  priceUsd: 7.99,
  currency: 'USD',
  trialStartDate: null,
  trialEndDate: null,
  subscriptionStartDate: 1,
  subscriptionEndDate: null,
  gracePeriodEnd: null,
  lastReceiptVerified: 1,
  receiptData: 'receipt_prior',
  lastPaymentDate: 1,
  paymentFailureCount: 0,
  crisisAccessEnabled: true,
  createdAt: 1,
  updatedAt: 1,
};
const sub = () => useSubscriptionStore.getState();
const mockVerifyReceipt = IAPService.verifyReceipt as jest.Mock;
const mockFinishTransaction = IAPService.finishTransaction as jest.Mock;
const mockRestorePurchases = IAPService.restorePurchases as jest.Mock;

async function seedPreErasureState(): Promise<void> {
  seedWellnessWriteConsent('granted');
  await stoic().markCheckInComplete('daily');
  await stoic().recordPrincipleEngagement('aware_presence', 'daily', 'applied');
  await stoic().addWeeklyReflection('written before deletion');
  await flushStoicPracticePersist();
  await useAssessmentStore.setState({ completedAssessments: [PRIOR_ASSESSMENT as never] });
  useEducationStore.getState().dismissInsightTip('principle-engagement-beginner');
  // Through the store's own writer, so the fixture is what the app would have on disk.
  useSubscriptionStore.setState({
    subscription: PRIOR_SUBSCRIPTION as never,
    featureAccess: calculateFeatureAccess('active'),
  });
  await sub().updateSubscriptionStatus('active');
}

beforeEach(async () => {
  await flushStoicPracticePersist();
  mockAsync.clear();
  mockSecure.clear();
  mockHold.key = null;
  mockHold.release = null;
  jest.clearAllMocks();
  mockDeleteAccount.mockResolvedValue(true);
  useStoicPracticeStore.setState({ checkInCompletions: [], principleEngagements: [], weeklyReflections: [] });
  await useAssessmentStore.setState({ completedAssessments: [], currentSession: null });
  useSubscriptionStore.setState({
    subscription: null,
    featureAccess: null,
    isLoading: false,
    isVerifyingReceipt: false,
    error: null,
  });

  const svc = SecureStorageService as unknown as {
    encryptionService: {
      initialize: () => Promise<void>;
      encryptData: (d: unknown) => Promise<unknown>;
      decryptData: (p: unknown) => Promise<unknown>;
    };
  };
  svc.encryptionService.initialize = jest.fn(async () => undefined);
  svc.encryptionService.encryptData = jest.fn(async (data: unknown) => ({ __passthrough: true, data }));
  svc.encryptionService.decryptData = jest.fn(async (pkg: unknown) => (pkg as { data: unknown }).data);
});

describe('the fixture is live', () => {
  it('pre-erasure state reaches both disks before the deletion runs', async () => {
    await seedPreErasureState();
    expect(stoicOnDisk().checkInCompletions).toHaveLength(1);
    expect(stoicOnDisk().weeklyReflections).toHaveLength(1);
    expect(assessmentOnDisk().completedAssessments).toHaveLength(1);
    expect(mockSecure.get(SUBSCRIPTION_KEY)).toContain('receipt_prior');
  });
});

describe('stoicPracticeStore', () => {
  it('a debounce pending at deletion never writes the erased state back', async () => {
    await seedPreErasureState();
    await stoic().markCheckInComplete('morning'); // armed, not yet flushed

    await expect(deleteAccountAndWipe({ posthog: null })).resolves.toEqual({ ok: true });
    await flushStoicPracticePersist();

    expect(mockSecure.has(STOIC_KEY)).toBe(false);
    expect(stoic().checkInCompletions).toEqual([]);
    expect(stoic().principleEngagements).toEqual([]);
    expect(stoic().weeklyReflections).toEqual([]);
  });

  it('a write already in flight lands before the wipe, never after it', async () => {
    await seedPreErasureState();
    await stoic().markCheckInComplete('morning');
    mockHold.key = STOIC_KEY;
    const flushing = flushStoicPracticePersist();
    await settle();
    expect(mockHold.release).not.toBeNull(); // the write really is held open

    const deleting = deleteAccountAndWipe({ posthog: null });
    await settle();
    mockHold.release!();
    await expect(deleting).resolves.toEqual({ ok: true });
    await flushing;

    expect(mockSecure.has(STOIC_KEY)).toBe(false);
  });

  it('a mutation after deletion persists only itself', async () => {
    await seedPreErasureState();
    await deleteAccountAndWipe({ posthog: null });

    seedWellnessWriteConsent('granted');
    await stoic().markCheckInComplete('evening');
    await flushStoicPracticePersist();

    expect(stoicOnDisk().checkInCompletions.map((c) => c.type)).toEqual(['evening']);
    expect(stoicOnDisk().principleEngagements).toEqual([]);
    expect(stoicOnDisk().weeklyReflections).toEqual([]);
  });
});

describe('assessmentStore', () => {
  it('the first persist after deletion carries no erased history', async () => {
    await seedPreErasureState();
    await deleteAccountAndWipe({ posthog: null });

    await useAssessmentStore.getState().startAssessment('phq9');

    expect(useAssessmentStore.getState().completedAssessments).toEqual([]);
    if (mockAsync.has(ASSESSMENT_KEY)) {
      expect(assessmentOnDisk().completedAssessments).toEqual([]);
    }
    // Positive control: the post-erasure session itself did persist.
    expect(assessmentOnDisk().currentSession).not.toBeNull();
  });

  it('keeps its actions after the reset', async () => {
    await seedPreErasureState();
    await deleteAccountAndWipe({ posthog: null });
    expect(typeof useAssessmentStore.getState().startAssessment).toBe('function');
    expect(typeof useAssessmentStore.getState().handleCrisisDetection).toBe('function');
  });
});

describe('educationStore', () => {
  it('drops in-memory Learn progress', async () => {
    await seedPreErasureState();
    expect(useEducationStore.getState().dismissedInsightTips).toHaveLength(1);
    await deleteAccountAndWipe({ posthog: null });
    expect(useEducationStore.getState().dismissedInsightTips).toEqual([]);
    expect(useEducationStore.getState().currentModule).toBeNull();
  });
});

describe('a failed server delete touches nothing local', () => {
  it('keeps memory, the pending write and both disks', async () => {
    await seedPreErasureState();
    await stoic().markCheckInComplete('morning');
    const leftover = { id: 'detect_prior', isTriggered: true } as never;
    useAssessmentStore.setState({ crisisDetection: leftover });
    mockDeleteAccount.mockResolvedValue(false);

    await expect(deleteAccountAndWipe({ posthog: null })).resolves.toEqual({ ok: false, retryable: true });
    await flushStoicPracticePersist();

    expect(stoic().checkInCompletions).toHaveLength(2);
    expect(stoicOnDisk().checkInCompletions).toHaveLength(2);
    expect(useAssessmentStore.getState().completedAssessments).toHaveLength(1);
    expect(assessmentOnDisk().completedAssessments).toHaveLength(1);
    expect(useEducationStore.getState().dismissedInsightTips).toHaveLength(1);
    expect(useAssessmentStore.getState().crisisDetection).toBe(leftover);
    expect(sub().subscription?.id).toBe('sub_prior');
    expect(mockSecure.get(SUBSCRIPTION_KEY)).toContain('sub_prior');
  });
});

describe('subscriptionStore (DEBUG-697)', () => {
  it('drops entitlement to the fresh-install state and keeps the always-available features on', async () => {
    await seedPreErasureState();
    expect(sub().checkFeatureAccess('assessments')).toBe(true); // control: the fixture is entitled

    await deleteAccountAndWipe({ posthog: null });

    expect(sub().subscription).toBeNull();
    expect(sub().featureAccess).toBeNull();
    expect(sub().isSubscriptionActive()).toBe(false);
    expect(sub().isTrialActive()).toBe(false);
    for (const feature of CRISIS_FEATURES) {
      expect(sub().checkFeatureAccess(feature)).toBe(true);
    }
    expect(sub().checkFeatureAccess('assessments')).toBe(false);
    expect(sub().getCrisisAccessStatus()).toBe(true);
    expect(typeof sub().createTrial).toBe('function');
  });

  it('the spreading writers after deletion write nothing back', async () => {
    await seedPreErasureState();
    await deleteAccountAndWipe({ posthog: null });

    // All three spread the in-memory record. (Restore no longer goes through
    // updateSubscriptionStatus — DEBUG-720; it is pinned in its own cases below.)
    await sub().updateSubscriptionStatus('active');
    await sub().enterGracePeriod();
    await sub().exitGracePeriod();

    expect(mockSecure.has(SUBSCRIPTION_KEY)).toBe(false);
    expect(sub().subscription).toBeNull();
  });

  it('a write already in flight lands before the wipe, never after it', async () => {
    await seedPreErasureState();
    mockHold.key = SUBSCRIPTION_KEY;
    const updating = sub().updateSubscriptionStatus('grace');
    await settle();
    expect(mockHold.release).not.toBeNull(); // the write really is held open

    const deleting = deleteAccountAndWipe({ posthog: null });
    await settle();
    mockHold.release!();
    await expect(deleting).resolves.toEqual({ ok: true });
    await updating;

    expect(mockSecure.has(SUBSCRIPTION_KEY)).toBe(false);
    expect(sub().subscription).toBeNull();
  });

  it('a purchase whose verification straddles deletion writes nothing and is not acknowledged', async () => {
    await seedPreErasureState();
    let resolveVerify: ((v: unknown) => void) | null = null;
    mockVerifyReceipt.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveVerify = resolve;
        }),
    );
    const purchasing = sub().processVerifiedPurchase(
      { transactionReceipt: 'receipt_inflight', orderId: 'order_inflight' },
      'monthly',
    );
    await settle();
    expect(resolveVerify).not.toBeNull(); // verification really is pending

    await expect(deleteAccountAndWipe({ posthog: null })).resolves.toEqual({ ok: true });
    resolveVerify!({ valid: true, subscriptionId: 'sub_inflight', expiresDate: null });
    await purchasing;

    expect(mockSecure.has(SUBSCRIPTION_KEY)).toBe(false);
    expect(sub().subscription).toBeNull();
    // Founder ruling: left unacknowledged so the platform re-emits it at next launch.
    expect(mockFinishTransaction).not.toHaveBeenCalled();
  });

  // DEBUG-720: restore builds its record through processVerifiedPurchase, so the
  // DEBUG-697 guard covers it. A verification held open across a deletion must
  // write nothing and acknowledge nothing; one that starts after it builds a
  // fresh record from the verification, never from erased memory.
  it('a restore whose verification straddles deletion writes nothing and is not acknowledged', async () => {
    await seedPreErasureState();
    mockFinishTransaction.mockClear();
    mockRestorePurchases.mockResolvedValueOnce([
      {
        productId: DEFAULT_SUBSCRIPTION_CONFIG.products.apple.yearly,
        transactionReceipt: 'receipt_restore_inflight',
        orderId: 'order_restore_inflight',
      },
    ]);
    let resolveVerify: ((v: unknown) => void) | null = null;
    mockVerifyReceipt.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveVerify = resolve;
        }),
    );
    const restoring = sub().restorePurchases();
    await settle();
    expect(resolveVerify).not.toBeNull(); // verification really is pending

    await expect(deleteAccountAndWipe({ posthog: null })).resolves.toEqual({ ok: true });
    resolveVerify!({ valid: true, subscriptionId: 'sub_restore_inflight', expiresDate: null });

    await expect(restoring).resolves.toEqual({ found: 1, restored: 0 });
    expect(mockSecure.has(SUBSCRIPTION_KEY)).toBe(false);
    expect(sub().subscription).toBeNull();
    expect(mockFinishTransaction).not.toHaveBeenCalled();
  });

  it('a restore after deletion persists only a fresh record', async () => {
    await seedPreErasureState();
    await deleteAccountAndWipe({ posthog: null });
    mockRestorePurchases.mockResolvedValueOnce([
      {
        productId: DEFAULT_SUBSCRIPTION_CONFIG.products.apple.monthly,
        transactionReceipt: 'receipt_restore_after',
        orderId: 'order_restore_after',
      },
    ]);
    mockVerifyReceipt.mockResolvedValueOnce({ valid: true, subscriptionId: 'sub_restore_after', expiresDate: null });

    await expect(sub().restorePurchases()).resolves.toEqual({ found: 1, restored: 1 });

    const onDisk = JSON.parse(mockSecure.get(SUBSCRIPTION_KEY)!) as typeof PRIOR_SUBSCRIPTION;
    expect(onDisk.id).not.toBe('sub_prior');
    expect(onDisk.platformSubscriptionId).toBe('sub_restore_after');
    expect(onDisk.status).toBe('active');
  });

  it('a trial started after deletion persists only a fresh record', async () => {
    await seedPreErasureState();
    await deleteAccountAndWipe({ posthog: null });

    await sub().createTrial();

    const onDisk = JSON.parse(mockSecure.get(SUBSCRIPTION_KEY)!) as typeof PRIOR_SUBSCRIPTION;
    expect(onDisk.id).not.toBe('sub_prior');
    expect(onDisk.receiptData).toBeNull();
    expect(onDisk.platformSubscriptionId).toBe('');
    expect(onDisk.status).toBe('trial');
  });
});

describe('what erasure must not reset', () => {
  it('leaves consent state and the deletion attestation in place', async () => {
    await seedPreErasureState();
    const consentBefore = useConsentStore.getState().consentStatus;

    await deleteAccountAndWipe({ posthog: null });

    expect(useConsentStore.getState().consentStatus).toBe(consentBefore);
    expect(mockSecure.has(ACCOUNT_DELETION_ATTESTATION_KEY)).toBe(true);
  });

  it('registers exactly the four in-memory owners', () => {
    expect(registeredErasureResetOwners().sort()).toEqual([
      'assessmentStore',
      'educationStore',
      'stoicPracticeStore',
      'subscriptionStore',
    ]);
  });
});

describe('the SecureStore erasure manifest', () => {
  it('names every SessionStorageService key, including the daily loop', () => {
    for (const key of Object.values(SESSION_STORAGE_KEYS)) {
      expect(WELLNESS_SECURE_STORE_KEYS).toContain(key);
    }
    // Positive control: the loop's key is a session key, so the loop above covers it.
    expect(Object.values(SESSION_STORAGE_KEYS)).toContain('stoic_session_daily_loop');
  });
});
