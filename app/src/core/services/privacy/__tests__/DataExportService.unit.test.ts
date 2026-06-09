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

jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: { retrieveWellnessBlob: jest.fn() },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
}));

jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: { getState: jest.fn() },
}));

const mockRetrieveBlob = SecureStorageService.retrieveWellnessBlob as jest.Mock;
const mockGetItem = SecureStore.getItemAsync as jest.Mock;
const mockExportConsent = jest.fn();

describe('DataExportService — gatherExportData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
