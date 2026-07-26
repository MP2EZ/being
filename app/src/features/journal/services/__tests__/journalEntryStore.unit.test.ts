/**
 * journalEntryStore — unit specs (FEAT-283 Slice A, AC #2)
 *
 * Storage-shape specs. The erasure guarantee is proven separately, by
 * enumeration, in `journalErasure.privacy.test.ts` — asserting here that a
 * delete function was called would prove nothing about whether the key is
 * actually swept.
 */

jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: jest.fn(),
    retrieveWellnessBlob: jest.fn(),
    deleteWellnessBlob: jest.fn(),
  },
}));

import SecureStorageService from '@/core/services/security/SecureStorageService';

import {
  MAX_ENTRY_CHARS,
  deleteAllEntries,
  deleteEntry,
  getEntry,
  listEntryMetadata,
  saveEntry,
} from '../journalEntryStore';

const mockStore = SecureStorageService as unknown as {
  storeWellnessBlob: jest.Mock;
  retrieveWellnessBlob: jest.Mock;
  deleteWellnessBlob: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.storeWellnessBlob.mockResolvedValue({ success: true });
  mockStore.retrieveWellnessBlob.mockResolvedValue(null);
  mockStore.deleteWellnessBlob.mockResolvedValue(undefined);
});

describe('saveEntry — encryption path', () => {
  it('persists through storeWellnessBlob, never a bare AsyncStorage write', async () => {
    // The whole point of routing through SecureStorageService: it owns key
    // prefixing, AES-256-GCM, and the master-key lifecycle. A bare
    // AsyncStorage.setItem here would be unencrypted wellness data that the
    // erasure sweep also would not find.
    await saveEntry({ text: 'today i went back over the day' });

    expect(mockStore.storeWellnessBlob).toHaveBeenCalled();
  });

  it('classifies entries at the assessment sensitivity level', async () => {
    await saveEntry({ text: 'a reflection' });

    const [, , sensitivity] = mockStore.storeWellnessBlob.mock.calls.find(
      ([key]) => typeof key === 'string' && key.startsWith('voice_journal_entry_')
    )!;
    expect(sensitivity).toBe('level_2_assessment_data');
  });

  it('does NOT pass a wellness_async_ prefix itself', async () => {
    // storeWellnessBlob prepends WELLNESS_ASYNC_PREFIX internally. Prefixing
    // here too would produce `wellness_async_wellness_async_…` — still swept,
    // but a confusing key that suggests the caller is managing the prefix.
    await saveEntry({ text: 'a reflection' });

    for (const [key] of mockStore.storeWellnessBlob.mock.calls) {
      expect(key).not.toContain('wellness_async_');
    }
  });

  it('writes the entry and updates the index', async () => {
    await saveEntry({ text: 'a reflection' });

    const keys = mockStore.storeWellnessBlob.mock.calls.map(([k]) => k);
    expect(keys.some((k: string) => k.startsWith('voice_journal_entry_'))).toBe(true);
    expect(keys).toContain('voice_journal_index');
  });

  it('keeps entry text out of the index', async () => {
    // The index is read to list entries. Keeping content out of it means a
    // list view never decrypts entry bodies it is not showing, and limits the
    // blast radius of any future index leak.
    await saveEntry({ text: 'something private about my day' });

    const indexCall = mockStore.storeWellnessBlob.mock.calls.find(
      ([key]) => key === 'voice_journal_index'
    )!;
    expect(JSON.stringify(indexCall[1])).not.toContain('something private');
  });

  it('round-trips text losslessly, including unicode and newlines', async () => {
    const text = 'line one\nline two — em dash, “smart quotes”, café, 🙂';
    let stored: { text?: string } | undefined;
    mockStore.storeWellnessBlob.mockImplementation(async (key: string, data: unknown) => {
      if (key.startsWith('voice_journal_entry_')) {
        stored = data as { text?: string };
      }
      return { success: true };
    });

    await saveEntry({ text });

    expect(stored?.text).toBe(text);
  });
});

describe('saveEntry — validation', () => {
  it('refuses an empty or whitespace-only entry', async () => {
    expect(await saveEntry({ text: '' })).toEqual({ saved: false, reason: 'empty' });
    expect(await saveEntry({ text: '   \n ' })).toEqual({ saved: false, reason: 'empty' });
    expect(mockStore.storeWellnessBlob).not.toHaveBeenCalled();
  });

  it('refuses an entry over the length cap', async () => {
    const result = await saveEntry({ text: 'x'.repeat(MAX_ENTRY_CHARS + 1) });

    expect(result).toEqual({ saved: false, reason: 'too_long' });
    expect(mockStore.storeWellnessBlob).not.toHaveBeenCalled();
  });

  it('accepts an entry exactly at the cap', async () => {
    const result = await saveEntry({ text: 'x'.repeat(MAX_ENTRY_CHARS) });
    expect(result.saved).toBe(true);
  });

  it('caps well below the 256KB ciphertext ceiling', async () => {
    // MAX_WELLNESS_PAYLOAD_SIZE is 256KB and storeWellnessBlob throws above it.
    // The cap exists so that limit is never reached mid-save — a save that
    // throws after the user has spoken loses the reflection.
    expect(MAX_ENTRY_CHARS).toBeLessThanOrEqual(20000);
  });

  it('reports failure rather than throwing when the write fails', async () => {
    mockStore.storeWellnessBlob.mockResolvedValue({ success: false, error: 'disk full' });

    const result = await saveEntry({ text: 'a reflection' });

    expect(result).toEqual({ saved: false, reason: 'storage_failed' });
  });
});

describe('getEntry / listEntryMetadata', () => {
  it('returns null for an unknown id', async () => {
    expect(await getEntry('nope')).toBeNull();
  });

  it('returns an empty list when nothing has been saved', async () => {
    expect(await listEntryMetadata()).toEqual([]);
  });

  it('returns metadata newest-first', async () => {
    mockStore.retrieveWellnessBlob.mockResolvedValue([
      { id: 'a', createdAt: 100, updatedAt: 100 },
      { id: 'b', createdAt: 300, updatedAt: 300 },
      { id: 'c', createdAt: 200, updatedAt: 200 },
    ]);

    expect((await listEntryMetadata()).map((m) => m.id)).toEqual(['b', 'c', 'a']);
  });

  it('survives a corrupt index rather than throwing into the UI', async () => {
    mockStore.retrieveWellnessBlob.mockResolvedValue({ not: 'an array' });
    expect(await listEntryMetadata()).toEqual([]);
  });
});

describe('deleteEntry / deleteAllEntries', () => {
  it('removes the entry blob and its index row', async () => {
    mockStore.retrieveWellnessBlob.mockResolvedValue([
      { id: 'a', createdAt: 1, updatedAt: 1 },
      { id: 'b', createdAt: 2, updatedAt: 2 },
    ]);

    await deleteEntry('a');

    expect(mockStore.deleteWellnessBlob).toHaveBeenCalledWith('voice_journal_entry_a');
    const indexCall = mockStore.storeWellnessBlob.mock.calls.find(
      ([key]) => key === 'voice_journal_index'
    )!;
    expect((indexCall[1] as { id: string }[]).map((m) => m.id)).toEqual(['b']);
  });

  it('deletes every entry blob AND the index', async () => {
    mockStore.retrieveWellnessBlob.mockResolvedValue([
      { id: 'a', createdAt: 1, updatedAt: 1 },
      { id: 'b', createdAt: 2, updatedAt: 2 },
    ]);

    await deleteAllEntries();

    expect(mockStore.deleteWellnessBlob).toHaveBeenCalledWith('voice_journal_entry_a');
    expect(mockStore.deleteWellnessBlob).toHaveBeenCalledWith('voice_journal_entry_b');
    // Leaving the index behind would strand rows pointing at deleted blobs.
    expect(mockStore.deleteWellnessBlob).toHaveBeenCalledWith('voice_journal_index');
  });

  it('still clears the index when an entry delete fails', async () => {
    // Partial failure must not leave the index claiming entries exist.
    mockStore.retrieveWellnessBlob.mockResolvedValue([{ id: 'a', createdAt: 1, updatedAt: 1 }]);
    mockStore.deleteWellnessBlob.mockImplementation(async (key: string) => {
      if (key === 'voice_journal_entry_a') throw new Error('boom');
    });

    await expect(deleteAllEntries()).resolves.not.toThrow();
    expect(mockStore.deleteWellnessBlob).toHaveBeenCalledWith('voice_journal_index');
  });
});
