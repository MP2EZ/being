/**
 * audioArtifactSweeper — unit specs (FEAT-283 Slice A, AC #3)
 *
 * Raw audio of someone's spoken mental-health reflection is the most sensitive
 * artifact this feature can produce, and unlike the transcript it is NOT
 * covered by any existing control: the erasure sweep enumerates AsyncStorage
 * keys, so a file in the app cache directory is invisible to it.
 *
 * The primary control is that no audio file is written at all — see the
 * `persist` pin in `onDeviceSpeechGuard.unit.test.ts`. This sweeper is the
 * backstop for the cases that control cannot reach:
 *   - Android's `ExpoAudioRecorder` writes a scratch PCM file to the cache in
 *     continuous mode even when `persist` is false.
 *   - A crash or kill mid-recording can strand a partially-written file.
 */

const mockFiles: {
  name: string;
  modificationTime: number | null;
  deleted: boolean;
  exists: boolean;
}[] = [];

jest.mock('expo-file-system', () => ({
  Paths: {
    get cache() {
      return {
        list: () =>
          mockFiles
            .filter((f) => !f.deleted)
            .map((f) => ({
              name: f.name,
              exists: f.exists,
              modificationTime: f.modificationTime,
              delete: () => {
                f.deleted = true;
              },
            })),
      };
    },
  },
}));

import {
  AUDIO_ARTIFACT_TTL_MS,
  sweepAllAudioArtifacts,
  sweepStaleAudioArtifacts,
} from '../audioArtifactSweeper';

const NOW = 1_700_000_000_000;

function addFile(
  name: string,
  ageMs = 0,
  opts: { exists?: boolean; modificationTime?: number | null } = {}
) {
  mockFiles.push({
    name,
    modificationTime:
      opts.modificationTime !== undefined ? opts.modificationTime : NOW - ageMs,
    deleted: false,
    exists: opts.exists ?? true,
  });
}

const wasDeleted = (name: string) =>
  mockFiles.find((f) => f.name === name)?.deleted === true;

beforeEach(() => {
  mockFiles.length = 0;
});

describe('sweepStaleAudioArtifacts', () => {
  it('deletes a stranded recording older than the TTL', () => {
    addFile('recording_abc123.wav', AUDIO_ARTIFACT_TTL_MS + 1000);

    const swept = sweepStaleAudioArtifacts(NOW);

    expect(swept).toBe(1);
    expect(wasDeleted('recording_abc123.wav')).toBe(true);
  });

  it('leaves a recording from an in-flight session alone', () => {
    // A capture in progress must not have its file yanked mid-write.
    addFile('recording_inflight.wav', 1000);

    expect(sweepStaleAudioArtifacts(NOW)).toBe(0);
    expect(wasDeleted('recording_inflight.wav')).toBe(false);
  });

  it("sweeps Android's scratch PCM file", () => {
    // ExpoAudioRecorder writes temp_<uuid>.pcm to the cache in continuous mode
    // even when persist is false — the one path the persist pin cannot close.
    addFile('temp_9f8c-4d21.pcm', AUDIO_ARTIFACT_TTL_MS + 1);

    expect(sweepStaleAudioArtifacts(NOW)).toBe(1);
    expect(wasDeleted('temp_9f8c-4d21.pcm')).toBe(true);
  });

  it('never touches files it does not own', () => {
    // The cache is shared. Deleting another feature's files would be a bug
    // with no error message — image caches, export temp files, RN bundles.
    addFile('export-2026-07-25.json', AUDIO_ARTIFACT_TTL_MS + 1);
    addFile('ExponentAsset-abc.png', AUDIO_ARTIFACT_TTL_MS + 1);
    addFile('recording.log', AUDIO_ARTIFACT_TTL_MS + 1);

    expect(sweepStaleAudioArtifacts(NOW)).toBe(0);
    expect(wasDeleted('export-2026-07-25.json')).toBe(false);
    expect(wasDeleted('ExponentAsset-abc.png')).toBe(false);
    expect(wasDeleted('recording.log')).toBe(false);
  });

  it('treats a second-precision modification time correctly', () => {
    // Platform timestamps arrive in seconds on some backends and milliseconds
    // on others. Misreading seconds as ms would date every file to 1970 and
    // delete an in-flight recording; misreading ms as seconds would date it to
    // the far future and never sweep anything.
    addFile('recording_seconds.wav', 0, {
      modificationTime: (NOW - AUDIO_ARTIFACT_TTL_MS - 5000) / 1000,
    });

    expect(sweepStaleAudioArtifacts(NOW)).toBe(1);
    expect(wasDeleted('recording_seconds.wav')).toBe(true);
  });

  it('deletes a file with an unknown modification time', () => {
    // Fail toward deletion: an artifact whose age cannot be established is
    // still raw audio, and leaving it is the worse outcome. The narrow name
    // pattern is what makes this safe.
    addFile('recording_unknown.wav', 0, { modificationTime: null });

    expect(sweepStaleAudioArtifacts(NOW)).toBe(1);
  });

  it('never throws into the caller when a delete fails', () => {
    // Runs at launch and after every capture — it must never be able to break
    // app start or the save path.
    addFile('recording_locked.wav', AUDIO_ARTIFACT_TTL_MS + 1);
    const entry = mockFiles[0];
    Object.defineProperty(entry, 'deleted', {
      get: () => false,
      set: () => {
        throw new Error('EBUSY');
      },
    });

    expect(() => sweepStaleAudioArtifacts(NOW)).not.toThrow();
  });

  it('survives an unreadable cache directory', () => {
    const { Paths } = jest.requireMock('expo-file-system');
    const spy = jest.spyOn(Paths, 'cache', 'get').mockImplementation(() => {
      throw new Error('cache unavailable');
    });

    expect(() => sweepStaleAudioArtifacts(NOW)).not.toThrow();
    expect(sweepStaleAudioArtifacts(NOW)).toBe(0);

    spy.mockRestore();
  });
});

describe('sweepAllAudioArtifacts', () => {
  it('ignores the TTL and removes artifacts immediately', () => {
    // Called in a finally after transcription: "discarded immediately post
    // transcription" means now, not after a grace period.
    addFile('recording_justnow.wav', 0);

    expect(sweepAllAudioArtifacts()).toBe(1);
    expect(wasDeleted('recording_justnow.wav')).toBe(true);
  });

  it('still leaves other features files alone', () => {
    addFile('export-2026-07-25.json', 0);

    expect(sweepAllAudioArtifacts()).toBe(0);
    expect(wasDeleted('export-2026-07-25.json')).toBe(false);
  });
});

describe('TTL sizing', () => {
  it('is short — a capture session should never outlive it', () => {
    expect(AUDIO_ARTIFACT_TTL_MS).toBeLessThanOrEqual(5 * 60 * 1000);
  });
});
