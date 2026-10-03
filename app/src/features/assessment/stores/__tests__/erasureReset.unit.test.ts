/**
 * assessmentStore erasure reset — crisis-side pins (DEBUG-671).
 *
 * Account erasure resets this store in memory so the next persist cannot write
 * erased screening history back. Crisis ruling: the reset changes memory and
 * persistence only — no alert, emergency response or crisis telemetry runs from
 * it — and detection after it is exactly as live as on a fresh install (zero
 * false negatives across the erasure boundary). The privacy half is pinned in
 * `__tests__/privacy/accountErasureInMemoryState.privacy.test.ts`.
 */
import { jest } from '@jest/globals';

jest.mock('@/core/services/supabase/SupabaseService', () => {
  const fn = jest.fn();
  return { __esModule: true, default: { trackCrisisDetection: fn }, supabaseService: { trackCrisisDetection: fn } };
});
jest.mock('@/features/crisis/services/crisisAlert', () => ({ showCrisisAlert: jest.fn() }));
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() }, Linking: { openURL: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');

const mockWellnessBlobs: Record<string, unknown> = {};
jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: jest.fn(async (key: string, data: unknown) => {
      mockWellnessBlobs[key] = data;
      return { success: true, operationType: 'store' as const, storageKey: `wellness_async_${key}`, operationTimeMs: 0, dataSize: 0 };
    }),
    retrieveWellnessBlob: jest.fn(async (key: string) => mockWellnessBlobs[key] ?? null),
    deleteWellnessBlob: jest.fn(async (key: string) => {
      delete mockWellnessBlobs[key];
    }),
  },
}));

import { Alert } from 'react-native';
import supabaseService from '@/core/services/supabase/SupabaseService';
import { showCrisisAlert } from '@/features/crisis/services/crisisAlert';
import { registeredErasureResetOwners } from '@/core/services/privacy/erasureResetRegistry';
import { resetAssessmentStoreForErasure, useAssessmentStore } from '../assessmentStore';
import type { AssessmentResponse } from '../../types/index';

const mockTrack = (supabaseService as unknown as { trackCrisisDetection: jest.Mock }).trackCrisisDetection;
const mockShowCrisisAlert = showCrisisAlert as unknown as jest.Mock;
const mockAlert = Alert.alert as unknown as jest.Mock;

const PHQ9_IDS = ['phq9_1', 'phq9_2', 'phq9_3', 'phq9_4', 'phq9_5', 'phq9_6', 'phq9_7', 'phq9_8', 'phq9_9'];

async function runPhq9(responses: number[]): Promise<void> {
  await useAssessmentStore.getState().startAssessment('phq9');
  for (let i = 0; i < PHQ9_IDS.length; i++) {
    await useAssessmentStore.getState().answerQuestion(PHQ9_IDS[i]!, responses[i] as AssessmentResponse);
  }
  await useAssessmentStore.getState().completeAssessment();
}

/** Session A: a severe PHQ-9 with Q9 > 0, so both crisis fields are populated. */
async function seedCrisisSession(): Promise<void> {
  await runPhq9([3, 3, 3, 3, 3, 0, 0, 0, 1]);
  expect(useAssessmentStore.getState().crisisDetection).not.toBeNull();
  expect(useAssessmentStore.getState().crisisIntervention).not.toBeNull();
  expect(useAssessmentStore.getState().completedAssessments.length).toBeGreaterThan(0);
}

beforeEach(async () => {
  for (const key of Object.keys(mockWellnessBlobs)) delete mockWellnessBlobs[key];
  await resetAssessmentStoreForErasure();
  jest.clearAllMocks();
});

it('registers itself for erasure on import', () => {
  expect(registeredErasureResetOwners()).toContain('assessmentStore');
});

it('clears both crisis fields, the session and the history, and keeps every action', async () => {
  await seedCrisisSession();

  await resetAssessmentStoreForErasure();

  const state = useAssessmentStore.getState();
  expect(state.crisisDetection).toBeNull();
  expect(state.crisisIntervention).toBeNull();
  expect(state.currentSession).toBeNull();
  expect(state.completedAssessments).toEqual([]);
  expect(state.answers).toEqual([]);
  for (const action of ['startAssessment', 'answerQuestion', 'completeAssessment', 'handleCrisisDetection'] as const) {
    expect(typeof state[action]).toBe('function');
  }
});

it('runs no alert, emergency response or crisis telemetry itself', async () => {
  await seedCrisisSession();
  jest.clearAllMocks();

  await resetAssessmentStoreForErasure();

  expect(mockShowCrisisAlert).not.toHaveBeenCalled();
  expect(mockAlert).not.toHaveBeenCalled();
  expect(mockTrack).not.toHaveBeenCalled();
});

it('persists the empty state before it resolves', async () => {
  await seedCrisisSession();

  await resetAssessmentStoreForErasure();

  const stored = mockWellnessBlobs['assessment_store'] as { state: { completedAssessments: unknown[] } };
  expect(stored.state.completedAssessments).toEqual([]);
});

describe('zero false negatives across the erasure boundary', () => {
  it('a fresh PHQ-9 with Q9 = 1 after the reset alerts and reports exactly once', async () => {
    await seedCrisisSession();
    await resetAssessmentStoreForErasure();
    jest.clearAllMocks();

    await runPhq9([0, 0, 0, 0, 0, 0, 0, 0, 1]);

    expect(mockShowCrisisAlert).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(useAssessmentStore.getState().crisisDetection?.primaryTrigger).toBe('phq9_suicidal_ideation');
  });

  it('a fresh PHQ-9 totalling 15 after the reset still detects at completion', async () => {
    await seedCrisisSession();
    await resetAssessmentStoreForErasure();
    jest.clearAllMocks();

    await runPhq9([3, 3, 3, 3, 3, 0, 0, 0, 0]);

    expect(useAssessmentStore.getState().crisisDetection?.isTriggered).toBe(true);
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });
});
