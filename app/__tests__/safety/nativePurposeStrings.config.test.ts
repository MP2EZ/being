/**
 * Native purpose-string static-config pin (retro item #1)
 *
 * Companion to `speechRecognitionPermissions.config.test.ts` and
 * `lsApplicationQueriesSchemes.config.test.ts`, and deliberately the inverse of
 * both. Those enumerate the keys someone knew to write down. This one DERIVES
 * the requirement from what is actually compiled into the binary, because the
 * failure it exists to catch is precisely the key nobody knew to add.
 *
 * WHY DERIVED AND NOT ENUMERATED
 *
 * App Store Connect rejected v1.2.0 with ITMS-90683 for a missing
 * `NSPhotoLibraryUsageDescription`. Nothing in the repo changed to cause it:
 * `app/package.json` still declared `expo-file-system: ~56.0.7`, but the
 * lockfile's RESOLVED version moved 56.0.7 -> 56.0.9, and 56.0.9 added
 * `ios/Legacy/FileSystemHelpers.swift`, which calls `PHPhotoLibrary`. Apple
 * requires the purpose string whenever the symbol is linked, used or not.
 *
 * An enumerated list cannot catch that class of change by construction — the
 * new requirement arrives from a transitive source with no diff to review. So
 * this scans the autolinked native sources and fails closed on any
 * purpose-string API that is present but undeclared.
 *
 * WHAT IT PINS
 *
 * 1. Every purpose-string-requiring API symbol found in a module's `ios/`
 *    sources has a matching non-empty key in `app.json`'s `ios.infoPlist`,
 *    unless that (key, module) pair is explicitly exempted below with a reason.
 * 2. The scan itself still works — see the two self-tests. A source-shape
 *    assertion that silently matches nothing is worse than no assertion, since
 *    it reads as a pass forever.
 *
 * WHAT IT DOES NOT PIN
 *
 * Whether Apple will accept the binary. Apple's static analysis is not
 * published and is stricter for some frameworks than others; this asserts the
 * declaration exists, not that the review passes. It also cannot see symbols
 * reached only through a prebuilt `.xcframework` with no source in the package.
 *
 * iOS is CNG (INFRA-280), so `app.json` is the sole source of the generated
 * `Info.plist` — asserting against `app.json` is asserting against the artifact.
 */

import * as fs from 'fs';
import * as path from 'path';

const appJson = require('../../app.json');

const NODE_MODULES = path.resolve(__dirname, '../../node_modules');

/**
 * Apple purpose-string keys and the API symbols that require them. Patterns are
 * matched against native source text, so they name TYPES, not prose.
 */
const PURPOSE_STRING_APIS: ReadonlyArray<{
  key: string;
  pattern: RegExp;
}> = [
  { key: 'NSPhotoLibraryUsageDescription', pattern: /\b(PHPhotoLibrary|PHAssetCreationRequest|UIImagePickerController)\b/ },
  { key: 'NSCameraUsageDescription', pattern: /\bAVCaptureDevice\b/ },
  { key: 'NSMicrophoneUsageDescription', pattern: /\b(AVAudioRecorder|requestRecordPermission)\b/ },
  { key: 'NSSpeechRecognitionUsageDescription', pattern: /\bSFSpeechRecognizer\b/ },
  { key: 'NSLocationWhenInUseUsageDescription', pattern: /\bCLLocationManager\b/ },
  { key: 'NSContactsUsageDescription', pattern: /\bCNContactStore\b/ },
  { key: 'NSCalendarsUsageDescription', pattern: /\bEKEventStore\b/ },
  { key: 'NSRemindersUsageDescription', pattern: /\bEKReminder\b/ },
  { key: 'NSFaceIDUsageDescription', pattern: /\bLAContext\b/ },
  { key: 'NSBluetoothAlwaysUsageDescription', pattern: /\bCBCentralManager\b/ },
  { key: 'NSMotionUsageDescription', pattern: /\b(CMPedometer|CMMotionActivityManager|CMSensorRecorder)\b/ },
  { key: 'NSHealthShareUsageDescription', pattern: /\bHKHealthStore\b/ },
  { key: 'NSAppleMusicUsageDescription', pattern: /\bMPMediaLibrary\b/ },
];

/**
 * Explicitly accepted (key, module) pairs. Each needs a reason that says why
 * the symbol cannot reach a user-visible permission prompt. Adding a row here
 * is a deliberate, reviewable act — which is the point.
 */
const EXEMPTIONS: ReadonlyArray<{
  key: string;
  module: string;
  reason: string;
}> = [
  {
    key: 'NSMotionUsageDescription',
    module: 'expo-sensors',
    reason:
      'Only useBugReportShake.ts consumes expo-sensors, via Accelerometer (CMMotionManager), ' +
      'which iOS does not gate behind a purpose string. The CMPedometer reference lives in ' +
      'PedometerModule.swift, which no app code reaches. Revisit if anything imports Pedometer.',
  },
];

/** Native source files belonging to a package's own `ios/` directory. */
function collectNativeSources(): Array<{ module: string; file: string }> {
  const out: Array<{ module: string; file: string }> = [];

  const packageDirs: Array<{ module: string; dir: string }> = [];
  for (const entry of fs.readdirSync(NODE_MODULES, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('@')) {
      const scopeDir = path.join(NODE_MODULES, entry.name);
      for (const scoped of fs.readdirSync(scopeDir, { withFileTypes: true })) {
        if (scoped.isDirectory()) {
          packageDirs.push({ module: `${entry.name}/${scoped.name}`, dir: path.join(scopeDir, scoped.name) });
        }
      }
    } else if (!entry.name.startsWith('.')) {
      packageDirs.push({ module: entry.name, dir: path.join(NODE_MODULES, entry.name) });
    }
  }

  const walk = (module: string, dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(module, full);
      } else if (/\.(swift|m|mm)$/.test(e.name)) {
        out.push({ module, file: full });
      }
    }
  };

  for (const { module, dir } of packageDirs) {
    const iosDir = path.join(dir, 'ios');
    if (fs.existsSync(iosDir)) walk(module, iosDir);
  }
  return out;
}

const SOURCES = collectNativeSources();

/** key -> modules that reference it, excluding exempted pairs. */
function offendersByKey(): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>();
  for (const { module, file } of SOURCES) {
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const { key, pattern } of PURPOSE_STRING_APIS) {
      if (!pattern.test(text)) continue;
      const exempt = EXEMPTIONS.some((x) => x.key === key && x.module === module);
      if (exempt) continue;
      if (!found.has(key)) found.set(key, new Set());
      found.get(key)!.add(module);
    }
  }
  return found;
}

describe('Native purpose strings — scan integrity', () => {
  it('found a non-trivial set of native sources to scan', () => {
    // Guards the silent-no-op failure mode: if autolinking, hoisting, or the
    // directory layout changes such that nothing is scanned, every assertion
    // below would pass vacuously and go on passing forever.
    expect(SOURCES.length).toBeGreaterThan(200);
  });

  it('still matches a known-bad source string', () => {
    const known = 'let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)';
    const photo = PURPOSE_STRING_APIS.find((a) => a.key === 'NSPhotoLibraryUsageDescription');
    expect(photo).toBeDefined();
    expect(photo!.pattern.test(known)).toBe(true);
  });

  it('every exemption names a module that still ships native sources', () => {
    // A stale exemption silently widens the gate. If the module is gone, the
    // row must go with it.
    const modules = new Set(SOURCES.map((s) => s.module));
    for (const x of EXEMPTIONS) {
      expect({ exemption: x.module, present: modules.has(x.module) }).toEqual({
        exemption: x.module,
        present: true,
      });
    }
  });
});

describe('Native purpose strings — iOS infoPlist contract', () => {
  const infoPlist = appJson?.expo?.ios?.infoPlist ?? {};
  const offenders = offendersByKey();

  it('declares a purpose string for every linked API that requires one', () => {
    const missing = [...offenders.entries()]
      .filter(([key]) => typeof infoPlist[key] !== 'string' || infoPlist[key].length === 0)
      .map(([key, modules]) => `${key} (required by: ${[...modules].sort().join(', ')})`)
      .sort();

    // Named rather than counted: the failure message IS the fix instruction.
    expect(missing).toEqual([]);
  });

  it.each(
    [...offenders.keys()].sort().map((key) => [key, [...(offenders.get(key) ?? [])].sort().join(', ')]),
  )('%s is declared (required by %s)', (key) => {
    expect(typeof infoPlist[key as string]).toBe('string');
    expect((infoPlist[key as string] as string).length).toBeGreaterThan(0);
  });
});
