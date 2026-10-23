/**
 * exportArtifactSweeper (DEBUG-645) — keeps the plaintext data export from
 * outliving the account.
 *
 * ExportDataScreen writes the full portability envelope to the app cache as
 * plaintext JSON, or a readable summary as an unencrypted PDF (FEAT-806), hands it
 * to the share sheet, then deletes it when the share settles. A process killed between the write and that point never runs the
 * delete, and `clearAllWellnessData` walks storage keys rather than the
 * filesystem — so account deletion sweeps here as well.
 *
 * The writer and this sweeper share ONE filename definition (`exportFileName` /
 * `EXPORT_FILE_PATTERN`), so a format change cannot silently blind the sweep.
 *
 * The PDF has a second resting place. expo-print renders into its own directory
 * before the screen moves the file under its export name, so a process killed
 * between the two leaves the render at `<cache>/Print/<UUID>.pdf` — verified in
 * the expo-print 56.0.4 tarball for both platforms (ExpoPrintToFile.swift:100,
 * FileUtils.kt:57). That directory belongs to expo-print alone, so every PDF in
 * it is swept.
 *
 * A sibling of audioArtifactSweeper.ts, deliberately not a generalisation of
 * it: that module's patterns are narrow on purpose because the cache is shared
 * with image caches, RN bundles and other features' files, and it already
 * declines to touch export files. Same shape here — list, match an anchored
 * name, delete, never throw.
 */
import { Directory, Paths } from 'expo-file-system';

export type ExportFileExtension = 'json' | 'pdf';

/** `being-export-YYYY-MM-DD.json` / `.pdf` — the only names the exporter writes. */
export const EXPORT_FILE_PATTERN = /^being-export-\d{4}-\d{2}-\d{2}\.(json|pdf)$/;

export function exportFileName(
  date: Date = new Date(),
  ext: ExportFileExtension = 'json',
): string {
  return `being-export-${date.toISOString().slice(0, 10)}.${ext}`;
}

/** expo-print's output directory under the app cache, on both platforms. */
export const PRINT_OUTPUT_DIRECTORY = 'Print';
const PRINT_OUTPUT_PATTERN = /\.pdf$/i;

interface SweepableFile {
  name: string;
  delete: () => void;
}

function sweep(list: () => unknown[], pattern: RegExp): number {
  let entries: unknown[];
  try {
    entries = list();
  } catch {
    return 0;
  }
  let removed = 0;
  for (const entry of entries) {
    const file = entry as SweepableFile;
    if (typeof file?.name !== 'string' || !pattern.test(file.name)) continue;
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

/**
 * Deletes every export file in the app cache, and every render left in
 * expo-print's output directory. Never throws: it runs inside the
 * account-deletion sequence, where a throw would report an already-completed
 * server erasure as a failure. Returns the number of files removed.
 */
export function sweepExportArtifacts(): number {
  const removed = sweep(() => Paths.cache.list(), EXPORT_FILE_PATTERN);
  return (
    removed +
    sweep(() => {
      const printOutput = new Directory(Paths.cache, PRINT_OUTPUT_DIRECTORY);
      return printOutput.exists ? printOutput.list() : [];
    }, PRINT_OUTPUT_PATTERN)
  );
}
