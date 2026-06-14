/**
 * CONSUMER PRIVACY COMPLIANCE POSTURE
 *
 * Asserts Being's ACTUAL regulatory posture at the wellness-data layer, per the
 * source of truth `docs/legal/regulatory-applicability.md`:
 *
 * - Being is NOT a HIPAA covered entity and NOT an FDA medical device. PHQ-9 /
 *   GAD-7 are wellness screening tools, not clinical/diagnostic assessments.
 * - Regulations that DO apply: FTC Act §5 (no deceptive practices), FTC Health
 *   Breach Notification Rule, state privacy laws (CCPA/CPRA, TDPSA, VCDPA, CPA,
 *   CTDPA), GDPR. Security is a VOLUNTARY best practice (AES-256-GCM at rest).
 *
 * This suite replaced a stale "HIPAA AND REGULATORY COMPLIANCE TESTING SUITE"
 * that asserted HIPAA/PHI/FDA/professional-liability contracts the product
 * explicitly disclaims (compliance planning pass, 2026-06-14). Behavioral
 * coverage of scoring, thresholds, and crisis detection lives in
 * `__tests__/clinical/**` and `crisis-thresholds.test.ts`; account-erasure with
 * master-key destruction lives in `AccountDeletionService.unit.test.ts`; export
 * terminology lives in `DataExportService.unit.test.ts`. This file covers only
 * the wellness-data privacy posture not asserted elsewhere.
 */

import { useAssessmentStore } from '../../src/features/assessment/stores/assessmentStore';
import { PHQ9Result, GAD7Result } from '../../src/features/assessment/types/index';
import { generateAnswersForScore, waitForStoreUpdate, resetAssessmentStore } from '../utils/AssessmentTestUtils';
import * as SecureStore from 'expo-secure-store';
import SecureStorageService from '@/core/services/security/SecureStorageService';

// Mirror the established assessment-store test harness (see
// comprehensive-scoring-validation.test.ts): the store persists wellness data
// via SecureStorageService (AES-256-GCM ciphertext), so we mock at that boundary.
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: jest.fn().mockResolvedValue({ success: true, operationType: 'store', storageKey: '', operationTimeMs: 0, dataSize: 0 }),
    retrieveWellnessBlob: jest.fn().mockResolvedValue(null),
    deleteWellnessBlob: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn() },
}));

const PHQ9_QUESTIONS = ['phq9_1', 'phq9_2', 'phq9_3', 'phq9_4', 'phq9_5', 'phq9_6', 'phq9_7', 'phq9_8', 'phq9_9'];
const GAD7_QUESTIONS = ['gad7_1', 'gad7_2', 'gad7_3', 'gad7_4', 'gad7_5', 'gad7_6', 'gad7_7'];

const storeBlob = SecureStorageService.storeWellnessBlob as jest.Mock;

/**
 * Drive the store through a full assessment using the same flow as the clinical
 * suites, and return the produced result. A non-zero score that fills only the
 * leading questions keeps Q9 = 0 (no crisis path needed for a privacy test).
 */
async function runAssessment(type: 'phq9' | 'gad7', score: number) {
  const questions = type === 'phq9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;
  const answers = generateAnswersForScore(score, type);

  await useAssessmentStore.getState().startAssessment(type, 'compliance_posture');
  await waitForStoreUpdate();

  const s = useAssessmentStore.getState();
  for (let i = 0; i < questions.length; i++) {
    await s.answerQuestion(questions[i], answers[i]);
  }
  await s.completeAssessment();
  await waitForStoreUpdate();

  return useAssessmentStore.getState().currentResult;
}

describe('Consumer Privacy Compliance Posture (FTC / state privacy / GDPR — NOT HIPAA)', () => {
  beforeEach(async () => {
    resetAssessmentStore();
    await useAssessmentStore.getState().clearHistory();
    useAssessmentStore.getState().enableAutoSave();
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetAssessmentStore();
  });

  it('persists wellness data through the AES-256 encryption service, not plaintext keystore (voluntary AES-256 standard)', async () => {
    await runAssessment('phq9', 6);

    // Wellness data is routed through the encrypted-blob service at the
    // assessment sensitivity tier, never written as plaintext.
    expect(storeBlob).toHaveBeenCalled();
    const [blobKey, data, sensitivity] = storeBlob.mock.calls[storeBlob.mock.calls.length - 1];
    expect(blobKey).toBe('assessment_store');
    expect(sensitivity).toBe('level_2_assessment_data');
    expect(typeof data).toBe('object');

    // The pre-INFRA-144 anti-pattern (plaintext JSON in the OS keychain under
    // 'assessment_store_encrypted') must never recur.
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith('assessment_store_encrypted', expect.anything());
  });

  it('clearHistory erases completed assessments from the persisted wellness blob (CCPA / TDPSA / GDPR erasure right)', async () => {
    await runAssessment('phq9', 6);
    expect(useAssessmentStore.getState().completedAssessments.length).toBeGreaterThan(0);

    storeBlob.mockClear();
    await useAssessmentStore.getState().clearHistory();
    await waitForStoreUpdate();

    // Erased in memory…
    expect(useAssessmentStore.getState().completedAssessments).toEqual([]);

    // …and erased in the persisted (encrypted) blob. The store writes via two
    // shapes — the zustand persist middleware wraps the snapshot as
    // { state: {...}, version }, while saveProgress() writes a flat payload — so
    // read completedAssessments from whichever the call used.
    const histories = storeBlob.mock.calls
      .map((c) => c[1] as any)
      .map((d) => (d && typeof d === 'object' ? (d.completedAssessments ?? d.state?.completedAssessments) : undefined))
      .filter((h) => Array.isArray(h));
    expect(histories.length).toBeGreaterThan(0);
    for (const h of histories) expect(h).toEqual([]);
  });

  it('assessment results use wellness terminology — no HIPAA/PHI/diagnosis/clinical fields (FTC §5 no deceptive claims)', async () => {
    const phq = (await runAssessment('phq9', 6)) as PHQ9Result;
    const gad = (await runAssessment('gad7', 6)) as GAD7Result;

    // No field, value, or key may make a regulatory claim the product disclaims.
    const serialized = JSON.stringify([phq, gad]).toLowerCase();
    for (const forbidden of ['phi', 'hipaa', 'diagnosis', 'patient', 'clinical', 'medical_record', 'fda', 'protected health']) {
      expect(serialized).not.toContain(forbidden);
    }

    // Result shape uses wellness-screening vocabulary.
    expect(typeof phq.totalScore).toBe('number');
    expect(typeof phq.severity).toBe('string');
    expect(typeof phq.completedAt).toBe('number');
    expect(typeof phq.suicidalIdeation).toBe('boolean');
    expect(typeof gad.totalScore).toBe('number');
    expect(typeof gad.severity).toBe('string');
  });
});
