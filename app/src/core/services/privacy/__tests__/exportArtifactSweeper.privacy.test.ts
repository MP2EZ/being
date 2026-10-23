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
 *
 * FEAT-806 widened it to the PDF export: the screen's own `being-export-*.pdf`,
 * plus expo-print's render output, which lands in `<cache>/Print/<UUID>.pdf`
 * before the screen moves it. A process killed between the render and the move
 * strands it there, under a name the export pattern cannot see.
 */

type MockFile = { name: string; deleted: boolean; failDelete?: boolean };
const mockFiles: MockFile[] = [];
const mockPrintFiles: MockFile[] = [];
let mockListThrows = false;
const mockPrintDir = { exists: false, listThrows: false };

const mockEntries = (files: MockFile[]) =>
  files
    .filter((f) => !f.deleted)
    .map((f) => ({
      name: f.name,
      delete: () => {
        if (f.failDelete) throw new Error('locked');
        f.deleted = true;
      },
    }));

jest.mock('expo-file-system', () => ({
  Paths: {
    get cache() {
      return {
        list: () => {
          if (mockListThrows) throw new Error('cache unreadable');
          return mockEntries(mockFiles);
        },
      };
    },
  },
  Directory: jest.fn().mockImplementation((_parent: unknown, name: string) => ({
    name,
    get exists() {
      return name === 'Print' && mockPrintDir.exists;
    },
    list: () => {
      if (name !== 'Print') throw new Error(`unexpected directory ${name}`);
      if (mockPrintDir.listThrows) throw new Error('print dir unreadable');
      return mockEntries(mockPrintFiles);
    },
  })),
}));

import {
  EXPORT_FILE_PATTERN,
  exportFileName,
  sweepExportArtifacts,
} from '../exportArtifactSweeper';

function add(name: string, opts: { failDelete?: boolean } = {}): void {
  mockFiles.push({ name, deleted: false, ...opts });
}
function addPrint(name: string, opts: { failDelete?: boolean } = {}): void {
  mockPrintDir.exists = true;
  mockPrintFiles.push({ name, deleted: false, ...opts });
}
const remaining = (): string[] => mockFiles.filter((f) => !f.deleted).map((f) => f.name);
const remainingPrint = (): string[] =>
  mockPrintFiles.filter((f) => !f.deleted).map((f) => f.name);

beforeEach(() => {
  mockFiles.length = 0;
  mockPrintFiles.length = 0;
  mockListThrows = false;
  mockPrintDir.exists = false;
  mockPrintDir.listThrows = false;
});

describe('DEBUG-645: one filename definition for writer and sweeper', () => {
  it('exportFileName produces the YYYY-MM-DD form the screen writes', () => {
    expect(exportFileName(new Date('2026-09-23T15:04:05Z'))).toBe('being-export-2026-09-23.json');
  });

  it('the sweep pattern matches every name the writer can produce', () => {
    for (const iso of ['2026-01-01T00:00:00Z', '2026-12-31T23:59:59Z', '2031-06-15T12:00:00Z']) {
      for (const ext of ['json', 'pdf'] as const) {
        expect(EXPORT_FILE_PATTERN.test(exportFileName(new Date(iso), ext))).toBe(true);
      }
    }
  });

  it('FEAT-806: the PDF name differs from the JSON name only by extension', () => {
    const date = new Date('2026-09-23T15:04:05Z');
    expect(exportFileName(date, 'pdf')).toBe('being-export-2026-09-23.pdf');
    expect(exportFileName(date)).toBe('being-export-2026-09-23.json');
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

describe('FEAT-806: sweepExportArtifacts covers the PDF export', () => {
  const PRINT_UUID = '3F2504E0-4F89-41D3-9A0C-0305E82C3301.pdf';

  it("removes the screen's own PDF export alongside the JSON one", () => {
    add('being-export-2026-09-23.json');
    add('being-export-2026-09-23.pdf');
    expect(sweepExportArtifacts()).toBe(2);
    expect(remaining()).toEqual([]);
  });

  it('leaves PDFs in the shared cache root alone unless the exporter named them', () => {
    const others = ['being-export-2026-09-23.pdf.bak', 'invoice.pdf', 'being-export.pdf'];
    others.forEach((n) => add(n));
    expect(sweepExportArtifacts()).toBe(0);
    expect(remaining()).toEqual(others);
  });

  it("removes a render stranded in expo-print's output directory", () => {
    addPrint(PRINT_UUID);
    addPrint('9B2C1A40-0000-4000-8000-000000000000.PDF');
    expect(sweepExportArtifacts()).toBe(2);
    expect(remainingPrint()).toEqual([]);
  });

  it('leaves non-PDF files in that directory alone', () => {
    addPrint('notes.txt');
    addPrint(PRINT_UUID);
    expect(sweepExportArtifacts()).toBe(1);
    expect(remainingPrint()).toEqual(['notes.txt']);
  });

  it('returns 0 when the output directory was never created', () => {
    expect(sweepExportArtifacts()).toBe(0);
  });

  it('never throws on an unreadable output directory, and still sweeps the cache root', () => {
    add('being-export-2026-09-23.pdf');
    addPrint(PRINT_UUID);
    mockPrintDir.listThrows = true;
    expect(() => sweepExportArtifacts()).not.toThrow();
    expect(remaining()).toEqual([]);
  });

  it('never throws on a render it cannot delete, and still removes the rest', () => {
    addPrint(PRINT_UUID, { failDelete: true });
    addPrint('9B2C1A40-0000-4000-8000-000000000000.pdf');
    expect(() => sweepExportArtifacts()).not.toThrow();
    expect(remainingPrint()).toEqual([PRINT_UUID]);
  });

  it('still sweeps the output directory when the cache root is unreadable', () => {
    mockListThrows = true;
    addPrint(PRINT_UUID);
    expect(sweepExportArtifacts()).toBe(1);
  });
});
