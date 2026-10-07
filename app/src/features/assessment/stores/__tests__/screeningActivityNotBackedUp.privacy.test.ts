/**
 * DEBUG-625 AC1 — a screening save must leave no trace in the cloud-backup payload.
 *
 * THE DEFECT. `saveProgress` set `lastSyncAt: Date.now()` on a purely LOCAL encrypted
 * save, despite the name. It is awaited by `startAssessment`, `answerQuestion`,
 * `completeAssessment`, `clearHistory` and `setSessionNote`, so the field was a
 * per-answer PHQ-9/GAD-7 activity clock. It was also one of only two fields in
 * `CloudBackupService`'s backup payload, and `calculateDataHash` hashes exactly that
 * object — so with `autoSaveEnabled` changing almost never, `lastSyncAt` was effectively
 * the sole entropy deciding whether a backup uploaded and emitted a timestamped
 * `backup_completed` row to `analytics_events`, bound to `auth.uid()` and retained 90
 * days. Screening cadence became observable server-side from a feature consented to as
 * "back up a few app settings".
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM THE DEBUG-614 PIN.
 * `cloudBackupConsentCopy.privacy.test.ts` captures the uploaded plaintext, but it MOCKS
 * the assessment store — so it proves the allowlist excludes the field and is structurally
 * blind to the store writing it again. This suite drives the REAL store, so a reinstated
 * write at `assessmentStore.ts` is caught here and nowhere else.
 *
 * Both halves are required: the allowlist could be widened again, or the write could
 * return. Either alone re-opens the channel.
 */

// The store's `EncryptedAssessmentStorage` is a class inside assessmentStore.ts, not a
// module — it reaches storage through SecureStorageService. Stubbed at that seam (the
// shape assessmentStore.notes.test.ts uses) so `saveProgress` actually SUCCEEDS.
//
// This is load-bearing, not setup noise. Real crypto cannot initialise under jest, so an
// unstubbed `saveProgress` throws, its catch runs, and nothing is written — which would
// make "no lastSyncAt after saveProgress" pass because NOTHING was written. That is the
// DEBUG-390 vacuity shape, and the encrypted-write control below is what detects it: if
// the save silently stops working, that control fails and the negative assertions are
// correctly no longer trusted.
const mockWellnessBlobs: Record<string, unknown> = {};
jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: jest.fn(async (key: string, data: unknown) => {
      mockWellnessBlobs[key] = data;
      return {
        success: true,
        operationType: 'store' as const,
        storageKey: `wellness_async_${key}`,
        operationTimeMs: 0,
        dataSize: 0,
      };
    }),
    retrieveWellnessBlob: jest.fn(async (key: string) => mockWellnessBlobs[key] ?? null),
    deleteWellnessBlob: jest.fn(async (key: string) => {
      delete mockWellnessBlobs[key];
    }),
  },
}));

import { useAssessmentStore } from '../assessmentStore';

describe('a screening save writes no sync-shaped timestamp', () => {
  it('the assessment store exposes no lastSyncAt at all', () => {
    expect(useAssessmentStore.getState()).not.toHaveProperty('lastSyncAt');
  });

  it('saveProgress does not introduce one', async () => {
    await useAssessmentStore.getState().saveProgress();

    const state = useAssessmentStore.getState() as Record<string, unknown>;
    expect(state).not.toHaveProperty('lastSyncAt');
  });

  it('saveProgress actually reaches the encrypted blob — the control for the negatives above', async () => {
    // Proves the negative assertions above are not vacuous: if the encrypted save ever
    // stops succeeding under jest, `saveProgress` takes its catch and writes nothing, and
    // "no lastSyncAt" would pass because nothing was written at all. This used to be a
    // `lastSavedAt` check; MAINT-731 removed that field (its only reader, SyncCoordinator,
    // went in MAINT-702), so the control now asserts the write itself. Cleared first, so it
    // tests THIS save rather than one a sibling test left behind.
    delete mockWellnessBlobs['assessment_store'];

    await useAssessmentStore.getState().saveProgress();

    expect(mockWellnessBlobs['assessment_store']).toEqual({
      state: expect.any(Object),
      version: expect.any(Number),
    });
    expect(useAssessmentStore.getState().error).toBeNull();
    expect(useAssessmentStore.getState()).not.toHaveProperty('lastSavedAt');
  });

  /**
   * Matcher integrity (DEBUG-390): `not.toHaveProperty` on a misspelled key passes
   * vacuously. These prove the matcher discriminates.
   */
  it('the property matcher can actually fail', () => {
    expect({ lastSyncAt: 1 }).toHaveProperty('lastSyncAt');
    expect(useAssessmentStore.getState()).toHaveProperty('answers');
    expect(useAssessmentStore.getState()).toHaveProperty('autoSaveEnabled');
  });
});
