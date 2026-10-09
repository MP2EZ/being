/**
 * exportArtifactSweeper (DEBUG-645) — keeps the plaintext data export from
 * outliving the account.
 *
 * ExportDataScreen writes the full portability envelope to the app cache as
 * plaintext JSON and hands it to the share sheet, then deletes it when the share
 * settles. A process killed between the write and that point never runs the
 * delete, and `clearAllWellnessData` walks storage keys rather than the
 * filesystem — so account deletion sweeps here as well.
 *
 * The writer and this sweeper share ONE filename definition (`exportFileName` /
 * `EXPORT_FILE_PATTERN`), so a format change cannot silently blind the sweep.
 *
 * A sibling of audioArtifactSweeper.ts, deliberately not a generalisation of
 * it: that module's patterns are narrow on purpose because the cache is shared
 * with image caches, RN bundles and other features' files, and it already
 * declines to touch export files. Same shape here — list, match an anchored
 * name, delete, never throw.
 */
import { Paths } from 'expo-file-system';

/** `being-export-YYYY-MM-DD.json` — the only name the exporter writes. */
export const EXPORT_FILE_PATTERN = /^being-export-\d{4}-\d{2}-\d{2}\.json$/;

export function exportFileName(date: Date = new Date()): string {
  return `being-export-${date.toISOString().slice(0, 10)}.json`;
}

interface SweepableFile {
  name: string;
  delete: () => void;
}

/**
 * Deletes every export file in the app cache. Never throws: it runs inside the
 * account-deletion sequence, where a throw would report an already-completed
 * server erasure as a failure. Returns the number of files removed.
 */
export function sweepExportArtifacts(): number {
  let entries: unknown[];
  try {
    entries = Paths.cache.list();
  } catch {
    return 0;
  }
  let removed = 0;
  for (const entry of entries) {
    const file = entry as SweepableFile;
    if (typeof file?.name !== 'string' || !EXPORT_FILE_PATTERN.test(file.name)) continue;
    if (typeof file.delete !== 'function') continue;
    try {
      file.delete();
      removed += 1;
    } catch {
      // Locked or already removed — the next sweep retries; never fail erasure over it.
    }
  }
  return removed;
}
