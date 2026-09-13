/**
 * INFRA-395 — the e2e-sim flag declaration.
 *
 * `isFeatureEnabled` is `FLAGS[name] === true` (`featureFlags.ts`), so an ABSENT
 * flag and one deliberately set `false` are indistinguishable at runtime. An
 * omission therefore cannot be caught by behaviour, by a test of behaviour, or
 * by anything failing — only by reading the declaration and comparing it to the
 * flag union.
 *
 * That is not hypothetical. `practice_haptics` was missing from the `e2e-sim`
 * profile entirely, and the same class of drift had accumulated unnoticed in the
 * EAS-stored `production` environment: ten entries gating nothing (including
 * eight MAINT-213 deleted and two retired `daily_loop` preview flags) while five
 * real flags were absent. Both were silent for months.
 *
 * These specs pin the half that lives in the repo. The EAS environment is
 * server-side and no test can reach it — keeping the two in step is a manual
 * step at flip time, which is exactly why it drifted.
 */

import fs from 'fs';
import path from 'path';

const easJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'eas.json'), 'utf8')
);
const flags: string = easJson.build['e2e-sim'].env.EXPO_PUBLIC_FEATURE_FLAGS;

describe('e2e-sim declares its flags explicitly', () => {
  it('reads a non-empty flag string (proves the fixture resolved)', () => {
    // Without this, every assertion below would pass vacuously against undefined.
    expect(typeof flags).toBe('string');
    expect(flags.length).toBeGreaterThan(0);
  });

  it('declares practice_haptics explicitly rather than by omission', () => {
    expect(flags).toContain('practice_haptics:');
  });

  it('keeps the Maestro gate build dark for practice_haptics', () => {
    // The e2e-sim string is FLOW-driven, not production-mirroring — it already
    // runs voice_journal:true against production's false. The trigger to enable
    // a flag here is a safety-tagged flow that needs it, and no current flow
    // enters PracticeTimerScreen / ReflectionTimerScreen / BodyScanScreen.
    expect(flags).toContain('practice_haptics:false');
  });

  it('carries no haptic_trace entry — the flag was removed, not just disabled', () => {
    // A production bundle strips console.* twice (babel transform-remove-console
    // plus metro drop_console), so a console-based diagnostic cannot survive a
    // Release build under any flag. Leaving a dead key here would recreate
    // exactly the decorative-entry problem these specs exist to prevent.
    expect(flags).not.toContain('haptic_trace');
  });

  it('declares every key as an explicit key:value pair', () => {
    // Guards the shape itself: a bare key with no colon parses to undefined and
    // silently resolves false, which is the omission failure wearing a disguise.
    const pairs = flags.split(',');
    expect(pairs.length).toBeGreaterThan(0);
    for (const pair of pairs) {
      expect(pair).toMatch(/^[a-z_]+:(true|false)$/);
    }
  });
});
