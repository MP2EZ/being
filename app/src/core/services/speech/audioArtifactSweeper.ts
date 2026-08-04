/**
 * audioArtifactSweeper — removes raw audio left in the app cache
 * (FEAT-283 Slice A, AC #3)
 *
 * THE GAP THIS CLOSES
 *
 * Raw audio of a spoken mental-health reflection is the most sensitive artifact
 * this feature can produce, and it is the one piece NOT covered by any existing
 * control. `clearAllWellnessData` enumerates AsyncStorage keys, so a file
 * sitting in the app cache directory is invisible to account erasure: it would
 * survive a user deleting their account entirely.
 *
 * DEFENCE IN DEPTH, IN ORDER OF STRENGTH
 *
 * 1. Do not write audio at all. `expo-speech-recognition` only creates an
 *    output file when `recordingOptions.persist` is true; on iOS the file
 *    writer is never constructed otherwise, and buffers go straight to the
 *    recognizer. `onDeviceSpeechGuard` therefore never passes
 *    `recordingOptions`, and a static pin fails the build if `persist: true`
 *    ever appears. This is the real control — a file that is never created
 *    cannot leak.
 *
 * 2. This sweeper, for the cases (1) cannot reach:
 *      - Android's `ExpoAudioRecorder` writes a scratch `temp_<uuid>.pcm` into
 *        the cache in continuous mode EVEN WHEN `persist` is false.
 *      - A crash, kill, or backgrounding mid-recording can strand a partial
 *        file that no `finally` block ever ran for.
 *
 * WHY NAME-MATCHING RATHER THAN A DEDICATED SUBDIRECTORY
 *
 * A dedicated directory would be tidier, but the files are named and placed by
 * the STT library, not by us — we do not choose their location. Matching the
 * library's own naming (`recording_*.wav`, `temp_*.pcm`) is what actually
 * intercepts them. The patterns are deliberately narrow: the cache is shared
 * with image caches, export temp files, and RN bundles, and deleting another
 * feature's files would be a bug with no error message.
 *
 * This module never throws. It runs at app launch and after every capture, so
 * a failure here must not be able to break app start or the save path.
 */

import { Paths } from 'expo-file-system';

/**
 * Maximum plausible age of an in-flight recording artifact.
 *
 * Short on purpose: a legitimate capture session finishes in well under five
 * minutes, so anything older is stranded rather than active. The cost of being
 * wrong in the "too aggressive" direction is a lost in-progress recording; the
 * cost in the other direction is raw audio persisting indefinitely.
 */
export const AUDIO_ARTIFACT_TTL_MS = 5 * 60 * 1000;

/**
 * Filenames produced by `expo-speech-recognition`.
 *
 * iOS  — `recording_<uuid>.wav` (ExpoSpeechRecognizer writes WAV only, despite
 *        the type docs mentioning .caf).
 * Android — `recording_<timestamp>.wav` output, plus `temp_<uuid>.pcm` scratch
 *        from ExpoAudioRecorder.
 *
 * Anchored at both ends so `recording.log` or `my_recording_notes.wav` are not
 * swept.
 */
const AUDIO_ARTIFACT_PATTERNS: readonly RegExp[] = [
  /^recording_[A-Za-z0-9-]+\.wav$/,
  /^temp_[A-Za-z0-9-]+\.pcm$/,
];

interface SweepableFile {
  name: string;
  modificationTime?: number | null;
  delete: () => void;
}

function isAudioArtifact(name: string): boolean {
  return AUDIO_ARTIFACT_PATTERNS.some((pattern) => pattern.test(name));
}

/**
 * Normalise a platform modification time to milliseconds.
 *
 * Filesystem backends report seconds on some platforms and milliseconds on
 * others, and guessing wrong is silently destructive in both directions:
 * reading seconds as ms dates every file to 1970 and would delete an in-flight
 * recording, while reading ms as seconds dates it to the far future and would
 * sweep nothing at all. Any value below ~2001-in-ms is treated as seconds.
 */
function toMillis(value: number): number {
  const SECONDS_THRESHOLD = 1e12;
  return value < SECONDS_THRESHOLD ? value * 1000 : value;
}

function sweep(shouldDelete: (file: SweepableFile) => boolean): number {
  let removed = 0;

  let entries: unknown[];
  try {
    entries = Paths.cache.list();
  } catch {
    // An unreadable cache directory is not actionable here.
    return 0;
  }

  for (const entry of entries) {
    const file = entry as SweepableFile;
    if (typeof file?.name !== 'string' || !isAudioArtifact(file.name)) {
      continue;
    }
    if (typeof file.delete !== 'function' || !shouldDelete(file)) {
      continue;
    }

    try {
      file.delete();
      removed += 1;
    } catch {
      // A locked or already-removed file is not worth failing app start over.
    }
  }

  return removed;
}

/**
 * Remove audio artifacts older than the TTL. Safe to call at app launch.
 *
 * A file whose modification time cannot be established is deleted: an artifact
 * of unknown age is still raw audio, and leaving it is the worse outcome. The
 * narrow name patterns are what make that safe.
 */
export function sweepStaleAudioArtifacts(now: number = Date.now()): number {
  return sweep((file) => {
    const modified = file.modificationTime;
    if (typeof modified !== 'number' || Number.isNaN(modified)) {
      return true;
    }
    return now - toMillis(modified) > AUDIO_ARTIFACT_TTL_MS;
  });
}

/**
 * Remove every audio artifact regardless of age.
 *
 * Called in a `finally` after transcription, so it runs whether transcription
 * succeeded, failed, or threw. "Discarded immediately post-transcription" means
 * now — not after a grace period, and not on the happy path only.
 */
export function sweepAllAudioArtifacts(): number {
  return sweep(() => true);
}
