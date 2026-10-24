/**
 * DataExportService — portable wellness-data export (FEAT-267).
 *
 * Gathers on-device wellness data (decrypted client-side), wraps it in a
 * disclosure envelope, and serializes to portable JSON for the user's CCPA/
 * TDPSA/GDPR Art. 20 data-portability right. These tests pin the required
 * envelope fields, the regulatory framing, and — critically — the exclusions
 * (no master key, no raw ciphertext, no device-identity anchor).
 */

import { gatherExportData, serializeExport } from '../DataExportService';
import SecureStorageService from '@/core/services/security/SecureStorageService';
import * as SecureStore from 'expo-secure-store';
import { useConsentStore } from '@/core/stores/consentStore';
import { logError } from '@/core/services/logging';
import { resetSearchIndexForErasure } from '@/features/journal/services/journalSearchIndex';
import { buildVerifiedSubscriptionRecord } from '@/core/services/subscription/verifiedSubscriptionRecord';

jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: { retrieveWellnessBlob: jest.fn(), listWellnessBlobKeys: jest.fn() },
}));

jest.mock('@/core/services/logging', () => ({
  ...jest.requireActual('@/core/services/logging'),
  logError: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
}));

jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: { getState: jest.fn() },
}));

const mockRetrieveBlob = SecureStorageService.retrieveWellnessBlob as jest.Mock;
const mockListKeys = SecureStorageService.listWellnessBlobKeys as jest.Mock;
const mockGetItem = SecureStore.getItemAsync as jest.Mock;
const mockExportConsent = jest.fn();

describe('DataExportService — gatherExportData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSearchIndexForErasure(); // the index keeps a module-level cache (FEAT-530)
    mockListKeys.mockResolvedValue([]); // no search index shard on disk unless a test says so
    (useConsentStore.getState as jest.Mock).mockReturnValue({
      exportConsentRecords: mockExportConsent,
    });
    mockExportConsent.mockResolvedValue({ currentConsent: null, history: [], exportedAt: 0 });
  });

  it('produces the required disclosure envelope fields', async () => {
    mockRetrieveBlob.mockResolvedValue(null);
    mockGetItem.mockResolvedValue(null);

    const envelope = await gatherExportData();

    expect(envelope.schemaVersion).toBe('1');
    expect(envelope.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO-8601
    expect(envelope.exportedBy).toMatch(/Being/i);
    // CCPA/GDPR right-to-know: must disclose that server blobs are encrypted + excluded.
    expect(envelope.dataScope.toLowerCase()).toContain('encrypt');
    expect(envelope.regulatoryBasis).toMatch(/CCPA|TDPSA|GDPR/);
  });

  it('does NOT cite HIPAA and uses wellness-data terminology', async () => {
    mockRetrieveBlob.mockResolvedValue(null);
    mockGetItem.mockResolvedValue(null);

    const json = serializeExport(await gatherExportData());

    expect(json).not.toMatch(/HIPAA/i);
    expect(json).not.toMatch(/\bPHI\b/);
  });

  it('gathers assessment, practices, subscription, and consent sections', async () => {
    mockRetrieveBlob.mockResolvedValue({ completedAssessments: [{ type: 'phq9', score: 4 }] });
    mockGetItem.mockImplementation(async (key: string) => {
      if (key === 'stoic_practice_state') return JSON.stringify({ currentStreak: 7 });
      if (key === 'subscription_secure_v1') return JSON.stringify({ status: 'trial' });
      return null;
    });
    mockExportConsent.mockResolvedValue({ currentConsent: { version: '2' }, history: [], exportedAt: 123 });

    const envelope = await gatherExportData();

    expect(envelope.wellness.assessments).toEqual({ completedAssessments: [{ type: 'phq9', score: 4 }] });
    expect(envelope.wellness.practices).toEqual({ currentStreak: 7 });
    expect(envelope.wellness.subscription).toEqual({ status: 'trial' });
    expect(envelope.consent.currentConsent).toEqual({ version: '2' });
    // Assessment store must be read via the AES-256-GCM blob path with legacy fallback.
    expect(mockRetrieveBlob).toHaveBeenCalledWith(
      'assessment_store',
      'assessment_store_encrypted',
      expect.objectContaining({ legacyFormat: 'plaintext_json' }),
    );
  });

  // DEBUG-708 (compliance R3): the export is a raw passthrough, so the record the store
  // writes is what the user receives. Built through the real builder, it states no payment
  // fact the server did not verify: each such field is present and null, never invented.
  it.each([false, true])('a verified-purchase record exports no unverified payment fact (trial: %s)', async (isTrialPeriod) => {
    const record = buildVerifiedSubscriptionRecord({
      existing: null,
      newId: () => 'sub-export',
      newUserId: () => 'anonymous_export',
      platform: 'apple',
      platformSubscriptionId: 'verified-export',
      interval: 'yearly',
      isTrialPeriod,
      expiresDate: 1_800_000_000_000,
      now: 1_790_000_000_000,
    });
    mockRetrieveBlob.mockResolvedValue(null);
    mockGetItem.mockImplementation(async (key: string) =>
      key === 'subscription_secure_v1' ? JSON.stringify(record) : null,
    );

    const exported = (await gatherExportData()).wellness.subscription;

    for (const field of ['priceUsd', 'currency', 'subscriptionStartDate', 'lastPaymentDate', 'trialStartDate', 'receiptData']) {
      expect(exported).toHaveProperty(field, null);
    }
    expect(exported).toHaveProperty('subscriptionEndDate', 1_800_000_000_000);
    expect(exported).toHaveProperty('status', isTrialPeriod ? 'trial' : 'active');
  });

  it('is null-safe: a missing/empty store yields a null section and never throws', async () => {
    mockRetrieveBlob.mockResolvedValue(null);
    mockGetItem.mockResolvedValue(null);

    const envelope = await gatherExportData();

    expect(envelope.wellness.assessments).toBeNull();
    expect(envelope.wellness.practices).toBeNull();
    expect(envelope.wellness.subscription).toBeNull();
  });

  it('tolerates a corrupt plain-JSON store without throwing the whole export', async () => {
    mockRetrieveBlob.mockResolvedValue(null);
    mockGetItem.mockResolvedValue('}{ not json');

    const envelope = await gatherExportData();

    expect(envelope.wellness.practices).toBeNull();
  });

  it('never includes the master key or device-identity anchor in the output', async () => {
    mockRetrieveBlob.mockResolvedValue({ ok: true });
    mockGetItem.mockResolvedValue(null);

    const json = serializeExport(await gatherExportData());

    expect(json).not.toMatch(/auth_device_id/);
    expect(json).not.toMatch(/master[_-]?key/i);
  });
});

describe('DataExportService — wellness.journalSearchIndex (FEAT-530)', () => {
  const rowsBlob = (rows: unknown) => ({ rows });

  beforeEach(() => {
    jest.clearAllMocks();
    resetSearchIndexForErasure();
    (useConsentStore.getState as jest.Mock).mockReturnValue({
      exportConsentRecords: mockExportConsent,
    });
    mockExportConsent.mockResolvedValue({ currentConsent: null, history: [], exportedAt: 0 });
    mockGetItem.mockResolvedValue(null);
    mockListKeys.mockResolvedValue([]);
    mockRetrieveBlob.mockResolvedValue(null);
  });

  it('is null when search was never built', async () => {
    const envelope = await gatherExportData();
    expect(envelope.wellness.journalSearchIndex).toBeNull();
    expect('journalSearchIndex' in envelope.wellness).toBe(true); // present, as null
  });

  it('is [] when built over an empty journal', async () => {
    mockListKeys.mockResolvedValue(['voice_journal_search_0']);
    mockRetrieveBlob.mockImplementation(async (key: string) =>
      key === 'voice_journal_search_0' ? rowsBlob([]) : null
    );

    const envelope = await gatherExportData();

    expect(envelope.wellness.journalSearchIndex).toEqual([]);
  });

  it('carries one { entryId, terms } row per entry when built', async () => {
    mockListKeys.mockResolvedValue(['voice_journal_search_0']);
    mockRetrieveBlob.mockImplementation(async (key: string) =>
      key === 'voice_journal_search_0'
        ? rowsBlob([
            { entryId: 'a', terms: ['alpha', 'beta'] },
            { entryId: 'b', terms: ['gamma'] },
          ])
        : null
    );

    const envelope = await gatherExportData();

    expect(envelope.wellness.journalSearchIndex).toEqual([
      { entryId: 'a', terms: ['alpha', 'beta'] },
      { entryId: 'b', terms: ['gamma'] },
    ]);
    const exported = JSON.parse(serializeExport(envelope)).wellness.journalSearchIndex;
    for (const row of exported) expect(Object.keys(row)).toEqual(['entryId', 'terms']);
  });

  it('is independently null-safe: an unreadable index omits that section only', async () => {
    mockRetrieveBlob.mockImplementation(async (key: string) => {
      if (key === 'voice_journal_search_0') throw new Error('shard-0 payload 262145 > 262144');
      return null;
    });
    mockListKeys.mockResolvedValue(['voice_journal_search_0']);
    mockGetItem.mockImplementation(async (key: string) =>
      key === 'stoic_practice_state' ? JSON.stringify({ currentStreak: 7 }) : null
    );

    const envelope = await gatherExportData();

    expect(envelope.wellness.journalSearchIndex).toBeNull();
    expect(envelope.wellness.practices).toEqual({ currentStreak: 7 });
    expect(envelope.wellness.journalEntries).toEqual([]);
  });

  it('logs a category and a fixed string, never the underlying Error', async () => {
    mockListKeys.mockResolvedValue(['voice_journal_search_0']);
    mockRetrieveBlob.mockImplementation(async (key: string) => {
      if (key === 'voice_journal_search_0') throw new Error('shard-0 payload 262145 > 262144');
      return null;
    });

    await gatherExportData();

    const searchCalls = (logError as jest.Mock).mock.calls.filter(([, message]) =>
      /search index/i.test(String(message))
    );
    expect(searchCalls.length).toBeGreaterThan(0);
    for (const call of searchCalls) {
      expect(call).toHaveLength(2); // category + message: no Error argument
      expect(JSON.stringify(call)).not.toMatch(/262145|payload/);
    }
  });
});

describe('DataExportService — serializeExport', () => {
  it('emits valid, indented, round-trippable JSON', async () => {
    (useConsentStore.getState as jest.Mock).mockReturnValue({
      exportConsentRecords: jest.fn().mockResolvedValue({ currentConsent: null, history: [], exportedAt: 0 }),
    });
    (SecureStorageService.retrieveWellnessBlob as jest.Mock).mockResolvedValue(null);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const envelope = await gatherExportData();
    const json = serializeExport(envelope);

    expect(json).toContain('\n'); // pretty-printed
    expect(() => JSON.parse(json)).not.toThrow();
    expect(JSON.parse(json).schemaVersion).toBe('1');
  });
});
