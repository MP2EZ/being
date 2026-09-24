/**
 * exportArtifactSweeper — erasure coverage for the plaintext data export (DEBUG-645).
 *
 * ExportDataScreen writes the full portability envelope to the app cache as
 * plaintext JSON and hands it to the share sheet. `clearAllWellnessData` walks
 * storage keys, never the filesystem, so before DEBUG-645 a complete unencrypted
 * copy of the user's wellness data survived account deletion.
 *
 * The screen now deletes the file when the share settles. A process killed
 * between the write and that point skips the delete entirely, so account
 * deletion also sweeps the cache — through this module, and only for files the
 * exporter itself names.
 *
 * Pinned here:
 *   - the writer and the sweeper share ONE filename definition, so a format
 *     change cannot silently blind the sweep;
 *   - the sweep removes export files and nothing else in the shared cache
 *     (audio artifacts, image caches, near-miss names);
 *   - it never throws: it runs inside the account-deletion sequence, where a
 *     throw would report an already-completed server erasure as a failure.
 */

const mockFiles: { name: string; deleted: boolean; failDelete?: boolean }[] = [];
let mockListThrows = false;

jest.mock('expo-file-system', () => ({
  Paths: {
    get cache() {
      return {
        list: () => {
          if (mockListThrows) throw new Error('cache unreadable');
          return mockFiles
            .filter((f) => !f.deleted)
            .map((f) => ({
              name: f.name,
              delete: () => {
                if (f.failDelete) throw new Error('locked');
                f.deleted = true;
              },
            }));
        },
      };
    },
  },
}));

import {
  EXPORT_FILE_PATTERN,
  exportFileName,
  sweepExportArtifacts,
} from '../exportArtifactSweeper';

function add(name: string, opts: { failDelete?: boolean } = {}): void {
  mockFiles.push({ name, deleted: false, ...opts });
}
const remaining = (): string[] => mockFiles.filter((f) => !f.deleted).map((f) => f.name);

beforeEach(() => {
  mockFiles.length = 0;
  mockListThrows = false;
});

describe('DEBUG-645: one filename definition for writer and sweeper', () => {
  it('exportFileName produces the YYYY-MM-DD form the screen writes', () => {
    expect(exportFileName(new Date('2026-09-23T15:04:05Z'))).toBe('being-export-2026-09-23.json');
  });

  it('the sweep pattern matches every name the writer can produce', () => {
    for (const iso of ['2026-01-01T00:00:00Z', '2026-12-31T23:59:59Z', '2031-06-15T12:00:00Z']) {
      expect(EXPORT_FILE_PATTERN.test(exportFileName(new Date(iso)))).toBe(true);
    }
  });
});

describe('DEBUG-645: sweepExportArtifacts', () => {
  it('removes every export file and reports the count', () => {
    add('being-export-2026-09-20.json');
    add('being-export-2026-09-23.json');
    expect(sweepExportArtifacts()).toBe(2);
    expect(remaining()).toEqual([]);
  });

  it('leaves every other file in the shared cache alone', () => {
    const others = [
      'recording_ab12.wav',
      'temp_ab12.pcm',
      'image-cache-123.jpg',
      'being-export.json',
      'being-export-2026-09-23.json.bak',
      'being-export-2026-9-23.json',
      'my-being-export-2026-09-23.json',
    ];
    others.forEach((n) => add(n));
    add('being-export-2026-09-23.json');
    expect(sweepExportArtifacts()).toBe(1);
    expect(remaining()).toEqual(others);
  });

  it('never throws on an unreadable cache', () => {
    mockListThrows = true;
    expect(() => sweepExportArtifacts()).not.toThrow();
    expect(sweepExportArtifacts()).toBe(0);
  });

  it('never throws on a file it cannot delete, and still removes the rest', () => {
    add('being-export-2026-09-20.json', { failDelete: true });
    add('being-export-2026-09-23.json');
    expect(() => sweepExportArtifacts()).not.toThrow();
    expect(remaining()).toEqual(['being-export-2026-09-20.json']);
  });

  it('returns 0 on an empty cache', () => {
    expect(sweepExportArtifacts()).toBe(0);
  });
});
