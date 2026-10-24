/**
 * FEAT-807: the record behind "Last export prepared" on the export and account-deletion
 * screens.
 *
 * One overwritten record, never a history: the latest export's day, its format, and the
 * scope that format actually exported. Never the preview selection, which shapes the count
 * preview only (JSON is always the all-time copy, the PDF always `PDF_SCOPE`). No counts,
 * data bounds, filename, URI or share target.
 *
 * It means "prepared", not "delivered": `Sharing.shareAsync` resolves on cancel too.
 *
 * Stored as an encrypted wellness blob, so `clearAllWellnessData`'s `wellness_async_` sweep
 * erases it with the account. The key is a module constant passed bare to both calls, so
 * `erasureSurvivorManifest.privacy.test.ts` resolves the site; it is deliberately NOT a
 * manifest survivor. Nothing here reaches analytics, Sentry or a log message.
 */
import SecureStorageService from '@/core/services/security/SecureStorageService';
import { logError, LogCategory } from '@/core/services/logging';
import type { ExportDataCategory, ExportRangePreset } from '@/features/data-export/types';

export type LastExportFormat = 'json' | 'pdf';

export interface LastExportScope {
  preset: ExportRangePreset;
  categories: ExportDataCategory[];
}

export interface LastExportRecord {
  preparedAt: number;
  format: LastExportFormat;
  scope: LastExportScope;
}

const LAST_EXPORT_RECORD_KEY = 'last_export_record_v1';

/** Never rejects: the caller fires it without awaiting, after the share resolves. */
export const writeLastExportRecord = async (
  format: LastExportFormat,
  scope: LastExportScope,
): Promise<LastExportRecord | null> => {
  const record: LastExportRecord = {
    preparedAt: Date.now(),
    format,
    scope: { preset: scope.preset, categories: [...scope.categories] },
  };
  try {
    const result = await SecureStorageService.storeWellnessBlob(
      LAST_EXPORT_RECORD_KEY,
      record,
      'level_5_general_data',
    );
    if (result.success) return record;
  } catch {
    // Fall through to the content-free log below.
  }
  logError(LogCategory.SYSTEM, '[LastExportRecord] write failed');
  return null;
};

const isRecord = (value: unknown): value is LastExportRecord => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<LastExportRecord>;
  return (
    typeof v.preparedAt === 'number' &&
    Number.isFinite(v.preparedAt) &&
    (v.format === 'json' || v.format === 'pdf')
  );
};

/** Null when absent, malformed or unreadable. Never rejects. */
export const readLastExportRecord = async (): Promise<LastExportRecord | null> => {
  try {
    const value = await SecureStorageService.retrieveWellnessBlob<unknown>(LAST_EXPORT_RECORD_KEY);
    if (value === null) return null;
    if (isRecord(value)) return value;
  } catch {
    // Fall through to the content-free log below.
  }
  logError(LogCategory.SYSTEM, '[LastExportRecord] read failed');
  return null;
};

/** The day only, matching ExportDataScreen's preview dates. */
export const formatLastExportDate = (ms: number): string =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** AC3 copy, as corrected at batch approval 2026-10-24 ("the range it covered"). */
export const lastExportPreparedCopy = (preparedAt: number): string =>
  `Last export prepared: ${formatLastExportDate(preparedAt)}. Being keeps only this date, ` +
  "the format and the range it covered — not the file, and not on Being's servers.";
