/**
 * DataExportService (FEAT-267) — assembles a portable, human-readable JSON copy
 * of the user's on-device wellness data for their CCPA / TDPSA / VCDPA / CPA /
 * CTDPA / GDPR Art. 20 data-portability right.
 *
 * Scope: ON-DEVICE data, decrypted client-side. Server-stored rows are AES-256-
 * GCM client-encrypted blobs recoverable only via this app + the device key, so
 * the meaningful export is the decrypted on-device copy — the envelope discloses
 * this explicitly (CCPA right-to-know / GDPR Art. 15).
 *
 * Exclusions (by construction — never read into the envelope): the AES master
 * key, raw ciphertext, and `auth_device_id` (a device-identity anchor, not
 * wellness content). UNGATED, like erasure — a data-subject right is not
 * consent-dependent.
 */

import SecureStorageService from '@/core/services/security/SecureStorageService';
import { gatherJournalEntriesForExport } from '@/features/journal/services/journalEntryStore';
import * as SecureStore from 'expo-secure-store';
import { useConsentStore } from '@/core/stores/consentStore';
import { logError, LogCategory } from '@/core/services/logging';

/** SecureStore keys holding plain-JSON wellness data (Keychain-encrypted only). */
const PRACTICE_STATE_KEY = 'stoic_practice_state';
const SUBSCRIPTION_KEY = 'subscription_secure_v1';

export interface ExportEnvelope {
  exportedAt: string; // ISO-8601
  schemaVersion: '1';
  exportedBy: string;
  dataScope: string;
  regulatoryBasis: string;
  wellness: {
    assessments: unknown | null;
    practices: unknown | null;
    subscription: unknown | null;
    /**
     * FEAT-283: voice journal entries, decrypted. Named "journalEntries" rather
     * than "reflections" so the export matches the privacy policy's own
     * terminology — the surface is called Reflections in the UI, but the legal
     * and portability vocabulary stays "journal entries".
     */
    journalEntries: unknown | null;
  };
  consent: {
    currentConsent: unknown | null;
    history: unknown[];
    exportedAt: number;
  };
}

/** Read + JSON.parse a plain-JSON SecureStore key, null-safe on miss/corruption. */
async function readPlainJson(key: string): Promise<unknown | null> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    logError(
      LogCategory.SYSTEM,
      `[DataExport] failed to read/parse ${key} (omitting from export)`,
      error instanceof Error ? error : new Error(String(error)),
    );
    return null;
  }
}

/**
 * Gather every on-device wellness store into the disclosure envelope. Each store
 * is independently null-safe: a missing or unreadable store yields a null
 * section rather than failing the whole export.
 */
export async function gatherExportData(): Promise<ExportEnvelope> {
  // Assessment history: AES-256-GCM blob (AsyncStorage) with legacy SecureStore
  // plaintext fallback — read via the same path the app uses to load it.
  let assessments: unknown | null = null;
  try {
    assessments = await SecureStorageService.retrieveWellnessBlob(
      'assessment_store',
      'assessment_store_encrypted',
      { legacyFormat: 'plaintext_json', sensitivityLevel: 'level_2_assessment_data' },
    );
  } catch (error) {
    logError(
      LogCategory.SYSTEM,
      '[DataExport] failed to read assessment store (omitting from export)',
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  // FEAT-283: voice journal entries. Each entry is its own AES-256-GCM blob
  // under the `wellness_async_` prefix, with a metadata-only index listing
  // them, so the export walks the index and decrypts each entry in turn.
  // Independently null-safe like every other section: an unreadable journal
  // must not fail the whole disclosure.
  let journalEntries: unknown | null = null;
  try {
    journalEntries = await gatherJournalEntriesForExport();
  } catch (error) {
    logError(
      LogCategory.SYSTEM,
      '[DataExport] failed to read voice journal (omitting from export)',
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  const practices = await readPlainJson(PRACTICE_STATE_KEY);
  const subscription = await readPlainJson(SUBSCRIPTION_KEY);
  const consent = await useConsentStore.getState().exportConsentRecords();

  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: '1',
    exportedBy: 'Being wellness app — Palouse Labs LLC',
    dataScope:
      'On-device wellness data, decrypted on this device. Server-stored cloud-backup ' +
      'blobs are AES-256-GCM client-encrypted and are not included — they are recoverable ' +
      'only via this app with the original device key.',
    regulatoryBasis:
      'Exported pursuant to your data-portability and right-to-know rights under CCPA, ' +
      'TDPSA, VCDPA, CPA, CTDPA, and GDPR Art. 20.',
    wellness: { assessments: assessments ?? null, practices, subscription, journalEntries },
    consent,
  };
}

/** Serialize the envelope to portable, indented JSON. */
export function serializeExport(envelope: ExportEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}
