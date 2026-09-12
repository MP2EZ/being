/**
 * Device-only Maestro flows are UNAVAILABLE — mechanical pin (DEBUG-589)
 *
 * No Maestro version can execute a flow on a physical iPhone. Measured 2026-09-07 on
 * iPhone 16e / iOS 26.6 / Xcode 26.0.1 / team KN6FDLG98K, across 2.0.0, 2.1.0, 2.2.0,
 * 2.4.0, 2.5.1, 2.6.0, 2.6.1, 2.7.0, 2.8.0, 2.9.0 and 2.10.0 — two failure modes, no
 * survivor:
 *   >= 2.2.0  the shipped driver project declares a MaestroDriverLib framework target and
 *             the MaestroDriverLib/ directory is shipped in ZERO releases; the build dies
 *             in ~8s with no JUnit report. 2.10.0 is current latest, so upgrading cannot
 *             fix it.
 *   <= 2.1.0  the driver builds and the runner installs, but the XCUITest runner never
 *             becomes ready within a 300s MAESTRO_DRIVER_STARTUP_TIMEOUT.
 * The hardware is healthy — the runner launches by hand via `devicectl`. Simulator flows
 * are unaffected: they use a prebuilt driver and never compile.
 *
 * THIS SUITE ASSERTS ONLY THAT THE NOTICE IS PRESENT, BOUNDED, AND STILL TRUE. It asserts
 * nothing that implies the gate is healthy — the device gate is not healthy, and a pin
 * that could be read as coverage would recreate the hazard it exists to close.
 *
 * DEBUG-390 INVERTS HERE — read this before "fixing" the matching below. The house rule is
 * that source-string assertions must STRIP comments first, because this codebase names
 * anti-patterns in prose. That rule does not apply to this suite: the marker IS a comment,
 * in a YAML file whose entire header is comments. Stripping would delete the thing under
 * test and every assertion would pass vacuously. Matching is deliberately on RAW source,
 * and the vacuity controls below are what stand in for the stripping rule's protection.
 * The ONE exception is the DEBUG-590 step pin on the SIM flow, which does strip: that
 * flow's header names the ids it asserts, so it is ordinary source, not a notice.
 *
 * Compensating follow-ups (crisis ruling, DEBUG-589):
 *   DEBUG-590  done — the keyboard-accessory REACHABILITY contract runs in the sim suite as
 *              crisis-keyboard-reachability.yaml (authored by DEBUG-506). The device flow
 *              records it as MIGRATED, and the block below pins that the record is still
 *              true. Its hardware residual stays unavailable.
 *   INFRA-591  attended manual device checklist for both contracts, release-gated.
 *   INFRA-592  assert the GENERATED Info.plist keeps tel/sms after plugin composition —
 *              the one dial residual the surviving jest pin cannot reach, since it reads
 *              app.json and iOS is CNG (INFRA-280).
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

const MAESTRO_DIR = path.join(__dirname, '..', '..', '.maestro');

/** Versions measured dead on 2026-09-07. A version outside this set invalidates the notice. */
const RECORDED_DEAD_VERSIONS = [
  '2.0.0', '2.1.0', '2.2.0', '2.4.0', '2.5.1',
  '2.6.0', '2.6.1', '2.7.0', '2.8.0', '2.9.0', '2.10.0',
];

const DEVICE_ONLY_FLOWS = ['crisis-988-dial.yaml', 'crisis-keyboard-accessory.yaml'];

/**
 * Structured, not prose. A reworded sentence must not be able to make the record vanish
 * while the condition it describes still holds.
 */
const MARKER =
  /^#\s*e2e-device-unavailable:\s*DEBUG-589\s+measured=(\d{4}-\d{2}-\d{2})\s+dead-versions=([0-9.]+)\.\.([0-9.]+)\s*$/m;

/**
 * DEBUG-590. The accessory's reachability half migrated to a sim flow; the record names it
 * structurally so the pin can follow it to that file and check the claim there.
 */
const MIGRATED_MARKER =
  /^#\s*e2e-sim-half:\s*MIGRATED\s+flow=([a-z0-9-]+\.yaml)\s+by=(DEBUG-\d+)\s*$/m;

/**
 * What makes the sim flow a reachability pin rather than a false green, in order. The
 * button assertion before the tap is the load-bearing one: the accessory bar renders always
 * but collapsed, so only its BUTTON proves the occlusion predicate fired.
 */
const REACHABILITY_STEPS: ReadonlyArray<readonly [string, string]> = [
  ['assertVisible', 'UIKeyboardLayoutStar Preview'],
  ['assertVisible', 'crisis-keyboard-accessory-button'],
  ['tapOn', 'crisis-keyboard-accessory-button'],
  ['assertVisible', 'crisis-resources-screen'],
];
const ALL_STEPS = REACHABILITY_STEPS.map(([verb, id]) => `${verb} ${id}`);

/**
 * INFRA-594. The accessory's ATTACH is measured on a SECOND runtime surface.
 *
 * `journal-crisis-scan.yaml` raises a keyboard over a `CrisisTextInput` whose input is
 * unmounted by `setPhase('saved'|'idle')` — the `prepareForRecycle` dead-`__weak`-ref shape
 * `CrisisTextInput.tsx:12-21` names as the reason the accessory is a component rather than a
 * JSX convention. The DailyLoop site cannot exercise that lifecycle, so this is a different
 * site rather than a duplicate.
 *
 * IT IS NOT A REACHABILITY PIN, and must never be folded into one. It never taps the button
 * and reaches no destination, so it cannot join REACHABILITY_STEPS, and it cannot join the
 * structured MIGRATED marker — that accepts exactly one flow and then demands all four
 * reachability steps of whatever it names.
 */
const ATTACH_SITE_FLOW = 'journal-crisis-scan.yaml';
const ACCESSORY_BUTTON_ASSERT = /-\s*assertVisible:\s*id:\s*"crisis-keyboard-accessory-button"/;
const KEYBOARD_DISMISSAL = /-\s*tapOn:\s*id:\s*"journal-review-header"/;

/**
 * Structured, for the reason MARKER is: the device flow's header ALREADY names
 * `journal-crisis-scan.yaml` in prose, as the counter-example proving a software keyboard
 * rises on the gate simulator. A pin that merely looked for the filename would therefore be
 * satisfied by text that predates this site existing — green before the work was done.
 * Separate key from `e2e-sim-half`, which stays a one-flow reachability record.
 */
const ATTACH_SITE_MARKER =
  /^#\s*e2e-attach-site:\s*([a-z0-9-]+\.yaml)\s+by=(INFRA-\d+)\s*$/m;

function readFlow(name: string): string {
  return fs.readFileSync(path.join(MAESTRO_DIR, name), 'utf8');
}

function stripYamlComments(src: string): string {
  return src.replace(/^\s*#.*$/gm, '');
}

/**
 * The steps found IN ORDER, not necessarily adjacent — another step may sit between two of
 * them. Returns the matched prefix, so a failure names the first missing step.
 */
function stepsInOrder(src: string): string[] {
  const found: string[] = [];
  let from = 0;
  for (const [verb, id] of REACHABILITY_STEPS) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`-\\s*${verb}:\\s*id:\\s*"${escaped}"`, 'g');
    re.lastIndex = from;
    const m = re.exec(src);
    if (!m) break;
    found.push(`${verb} ${id}`);
    from = re.lastIndex;
  }
  return found;
}

/**
 * The segment of `journal-crisis-scan.yaml` between its LAST keyboard-up assertion and the
 * Save tap that follows — i.e. the DEBUG-480 block, the only one that taps Save with the
 * keyboard still up. Comments are stripped: this is ordinary source, not a notice.
 *
 * Anchored on the LAST keyboard assertion deliberately. A plain ordered-prefix match would be
 * satisfied by the button assertion sitting in either keyboard-DOWN block above, which pins a
 * different contract on a surface that dismisses the keyboard before saving.
 */
function keyboardUpSaveBlock(src: string): string | null {
  const body = stripYamlComments(src);
  const kb = [...body.matchAll(/-\s*assertVisible:\s*id:\s*"UIKeyboardLayoutStar Preview"/g)];
  if (kb.length === 0) return null;
  const last = kb[kb.length - 1];
  const after = body.slice((last.index as number) + last[0].length);
  const save = after.search(/-\s*tapOn:\s*id:\s*"journal-save-button"/);
  if (save === -1) return null;
  return after.slice(0, save);
}

describe('DEBUG-589 — the device-unavailability notice', () => {
  describe('vacuity controls (these guard every assertion below)', () => {
    it('the marker regex fires against a known-GOOD literal', () => {
      expect(
        MARKER.test('# e2e-device-unavailable: DEBUG-589 measured=2026-09-07 dead-versions=2.0.0..2.10.0'),
      ).toBe(true);
    });

    it('the marker regex does NOT fire against a near-miss literal', () => {
      // Prose that mentions the concept must not satisfy a pin about the record existing.
      expect(MARKER.test('# device flows are unavailable, see DEBUG-589')).toBe(false);
      expect(MARKER.test('# e2e-device-unavailable: DEBUG-589')).toBe(false);
    });

    it.each(DEVICE_ONLY_FLOWS)('%s is a real, non-trivial file', (name) => {
      // A rename or a move must go RED here rather than silently satisfying nothing.
      expect(readFlow(name).length).toBeGreaterThan(1000);
    });
  });

  describe.each(DEVICE_ONLY_FLOWS)('%s', (name) => {
    it('carries the structured unavailability marker', () => {
      expect(readFlow(name)).toMatch(MARKER);
    });

    it('the marker carries its measured bounds and they match the recorded set', () => {
      const m = MARKER.exec(readFlow(name));
      expect(m).not.toBeNull();
      const [, measured, low, high] = m as RegExpExecArray;
      expect(measured).toBe('2026-09-07');
      expect(low).toBe(RECORDED_DEAD_VERSIONS[0]);
      expect(high).toBe(RECORDED_DEAD_VERSIONS[RECORDED_DEAD_VERSIONS.length - 1]);
    });

    it('states the unavailability unhedged, and names the hardware as healthy', () => {
      const src = readFlow(name);
      expect(src).toMatch(/No Maestro version can\s*\n?#?\s*execute any flow on a physical iPhone|No Maestro version can execute any flow on a physical iPhone/);
      expect(src).toMatch(/HARDWARE IS (?:HEALTHY|NOT THE PROBLEM)/);
    });

    it('is not deleted, renamed or skipped — the flow body still exists', () => {
      const src = readFlow(name);
      expect(src).toMatch(/^appId:\s*fyi\.being\.app$/m);
      expect(src).toMatch(/^\s*-\s+safety-device-only\s*$/m);
    });
  });

  it('crisis-988-dial rebuts the PRIMARY/SUPPLEMENTARY reading rather than leaning on it', () => {
    // The pre-existing header calls the jest pin PRIMARY and this flow SUPPLEMENTARY.
    // Post-DEBUG-589 that phrasing reads as reassurance that nothing was lost, so the
    // notice must say in the same breath that it is not subsumption.
    const src = readFlow('crisis-988-dial.yaml');
    expect(src).toMatch(/do NOT mean the dial path was verified/i);
    expect(src).toMatch(/do not cover runtime\s*\n?#?\s*behaviour on hardware|not cover runtime behaviour on hardware/i);
  });

  describe('DEBUG-590 — crisis-keyboard-accessory records its reachability half as MIGRATED', () => {
    // Pins that the RECORD is still true — a sim flow in the default suite owns this
    // contract — not that the device gate is healthy. What only hardware can reach stays
    // unavailable (DEBUG-589) and is INFRA-591's to compensate, not the sim flow's.
    function migratedTo(): RegExpExecArray | null {
      return MIGRATED_MARKER.exec(readFlow('crisis-keyboard-accessory.yaml'));
    }

    describe('vacuity controls', () => {
      it('the MIGRATED marker regex fires on a known-GOOD literal and not on prose', () => {
        expect(
          MIGRATED_MARKER.test('# e2e-sim-half: MIGRATED flow=crisis-keyboard-reachability.yaml by=DEBUG-506'),
        ).toBe(true);
        expect(
          MIGRATED_MARKER.test('# the reachability half migrated to crisis-keyboard-reachability.yaml'),
        ).toBe(false);
      });

      it('the step matcher accepts the steps in order with another step between them', () => {
        const literal = [
          '- assertVisible:', '    id: "UIKeyboardLayoutStar Preview"',
          '- assertVisible:', '    id: "crisis-keyboard-accessory-button"',
          '- assertNotVisible:', '    id: "daily-loop-support-line"',
          '- tapOn:', '    id: "crisis-keyboard-accessory-button"',
          '- assertVisible:', '    id: "crisis-resources-screen"',
        ].join('\n');
        expect(stepsInOrder(literal)).toEqual(ALL_STEPS);
      });

      it('the step matcher REJECTS a tap that precedes the button being asserted visible', () => {
        const reordered = [
          '- assertVisible:', '    id: "UIKeyboardLayoutStar Preview"',
          '- tapOn:', '    id: "crisis-keyboard-accessory-button"',
          '- assertVisible:', '    id: "crisis-keyboard-accessory-button"',
          '- assertVisible:', '    id: "crisis-resources-screen"',
        ].join('\n');
        expect(stepsInOrder(reordered)).not.toEqual(ALL_STEPS);
      });

      it('a step disabled by commenting its verb line reads as present raw, and absent stripped', () => {
        const disabled = [
          '- assertVisible:', '    id: "UIKeyboardLayoutStar Preview"',
          '#- assertVisible:', '    id: "crisis-keyboard-accessory-button"',
          '- tapOn:', '    id: "crisis-keyboard-accessory-button"',
          '- assertVisible:', '    id: "crisis-resources-screen"',
        ].join('\n');
        expect(stepsInOrder(disabled)).toEqual(ALL_STEPS);
        expect(stepsInOrder(stripYamlComments(disabled))).not.toEqual(ALL_STEPS);
      });
    });

    it('carries the structured MIGRATED marker, attributed to DEBUG-506', () => {
      const m = migratedTo();
      expect(m).not.toBeNull();
      expect((m as RegExpExecArray)[2]).toBe('DEBUG-506');
    });

    it('no longer carries the superseded not-yet-migrated record', () => {
      // Raw source, like the notice: the header IS comments. A header holding both statuses
      // at once is the contradiction this item exists to remove.
      const src = readFlow('crisis-keyboard-accessory.yaml');
      expect(src).not.toMatch(/NOT YET MIGRATED/);
      expect(src).not.toMatch(/UNTIL DEBUG-590 LANDS/);
    });

    it('says in the same breath that MIGRATED is not verification of the hardware path', () => {
      // Same job as the dial's rebuttal above: a migration record must not read as
      // reassurance that nothing on hardware was lost.
      expect(readFlow('crisis-keyboard-accessory.yaml')).toMatch(
        /MIGRATED does NOT mean the hardware path was verified/,
      );
    });

    it('names a sim flow that exists and runs in the DEFAULT suite (exact `- safety` tag)', () => {
      const m = migratedTo();
      expect(m).not.toBeNull();
      const src = readFlow((m as RegExpExecArray)[1]);
      expect(src.length).toBeGreaterThan(1000);
      expect(src).toMatch(/^\s*-\s+safety\s*$/m);
      expect(src).not.toMatch(/^\s*-\s+safety-device-only\s*$/m);
    });

    it('the named sim flow still asserts the four load-bearing steps, in order', () => {
      const m = migratedTo();
      expect(m).not.toBeNull();
      const body = stripYamlComments(readFlow((m as RegExpExecArray)[1]));
      expect(body.trim().length).toBeGreaterThan(500); // stripping must not leave nothing
      expect(stepsInOrder(body)).toEqual(ALL_STEPS);
    });
  });

  describe('INFRA-594 — journal-crisis-scan pins the accessory ATTACH on a second surface', () => {
    describe('vacuity controls', () => {
      const KEYBOARD_UP = ['- assertVisible:', '    id: "UIKeyboardLayoutStar Preview"'];
      const BUTTON = ['- assertVisible:', '    id: "crisis-keyboard-accessory-button"'];
      const DISMISS = ['- tapOn:', '    id: "journal-review-header"'];
      const SAVE = ['- tapOn:', '    id: "journal-save-button"'];

      it('the extractor returns the keyboard-up block, not the whole file and not nothing', () => {
        const block = keyboardUpSaveBlock([...KEYBOARD_UP, ...BUTTON, ...SAVE].join('\n'));
        expect(block).not.toBeNull();
        expect(block as string).toMatch(ACCESSORY_BUTTON_ASSERT);
        // Bounded: the Save tap that closes the block is NOT inside it.
        expect(block as string).not.toMatch(/journal-save-button/);
      });

      it('returns null rather than a false pass when the anchors are absent', () => {
        expect(keyboardUpSaveBlock([...BUTTON, ...SAVE].join('\n'))).toBeNull();
        expect(keyboardUpSaveBlock([...KEYBOARD_UP, ...BUTTON].join('\n'))).toBeNull();
      });

      it('REJECTS a button assertion that sits in a keyboard-DOWN block instead', () => {
        // Block 1 dismisses the keyboard before saving, so a button assertion there proves
        // nothing about the keyboard-up surface. The last-anchor rule is what catches it.
        const twoBlocks = [
          ...KEYBOARD_UP, ...BUTTON, ...DISMISS, ...SAVE,
          ...KEYBOARD_UP, ...SAVE,
        ].join('\n');
        expect(keyboardUpSaveBlock(twoBlocks)).not.toMatch(ACCESSORY_BUTTON_ASSERT);
      });

      it('surfaces a dismissal placed between the keyboard assertion and the Save tap', () => {
        const withDismissal = [...KEYBOARD_UP, ...BUTTON, ...DISMISS, ...SAVE].join('\n');
        expect(keyboardUpSaveBlock(withDismissal)).toMatch(KEYBOARD_DISMISSAL);
      });

      it('the attach-site marker fires on a known-GOOD literal and NOT on prose naming the file', () => {
        expect(
          ATTACH_SITE_MARKER.test('# e2e-attach-site: journal-crisis-scan.yaml by=INFRA-594'),
        ).toBe(true);
        // This is the exact sentence already in the device flow's header. It must not satisfy
        // the record, or the pin is green before the second site exists.
        expect(
          ATTACH_SITE_MARKER.test('# `journal-crisis-scan.yaml` runs in the default suite'),
        ).toBe(false);
      });
    });

    it('asserts the accessory BUTTON with the keyboard up, before the Save tap', () => {
      // The bar renders always but collapsed (height 0, opacity 0, no-hide-descendants), so
      // only the BUTTON proves the occlusion predicate fired. It must precede the tap:
      // handleSave's setPhase('saved') unmounts the CrisisTextInput, so the node is gone
      // afterwards by design.
      const block = keyboardUpSaveBlock(readFlow(ATTACH_SITE_FLOW));
      expect(block).not.toBeNull();
      expect(block as string).toMatch(ACCESSORY_BUTTON_ASSERT);
    });

    it('adds no dismissal and no scroll to that block — the pre-forbidden repairs', () => {
      // DEBUG-480's block proves Save is reachable with the keyboard UP. A dismissal or a
      // scroll before the tap converts that into a strictly weaker contract.
      const block = keyboardUpSaveBlock(readFlow(ATTACH_SITE_FLOW)) as string;
      expect(block).not.toBeNull();
      expect(block).not.toMatch(KEYBOARD_DISMISSAL);
      expect(block).not.toMatch(/scrollUntilVisible/);
    });

    it('matches the button by id, never by text', () => {
      // CrisisKeyboardAccessory's accessibilityLabel is "I need support", deliberately
      // identical to the root FAB's — and this flow asserts crisis-button-root visible a few
      // lines earlier. A text matcher could be satisfied by the root button alone.
      const block = keyboardUpSaveBlock(readFlow(ATTACH_SITE_FLOW)) as string;
      expect(block).not.toMatch(/text:\s*".*I need support.*"/);
    });

    it('is recorded on the device flow as a second site, without widening the marker', () => {
      const src = readFlow('crisis-keyboard-accessory.yaml');

      const attach = ATTACH_SITE_MARKER.exec(src);
      expect(attach).not.toBeNull();
      expect((attach as RegExpExecArray)[1]).toBe(ATTACH_SITE_FLOW);

      // The reachability marker still names exactly ONE flow, and not this one: it demands
      // all four reachability steps of whatever it names, which an attach-only site lacks.
      const m = MIGRATED_MARKER.exec(src);
      expect(m).not.toBeNull();
      expect((m as RegExpExecArray)[1]).toBe('crisis-keyboard-reachability.yaml');
    });

    it('the named attach site is a real flow that runs in the DEFAULT suite', () => {
      const src = readFlow(ATTACH_SITE_FLOW);
      expect(src.length).toBeGreaterThan(1000);
      expect(src).toMatch(/^\s*-\s+safety\s*$/m);
      expect(src).not.toMatch(/^\s*-\s+safety-device-only\s*$/m);
    });
  });

  it('the set of safety-device-only flows is EXACTLY the two that were ruled on', () => {
    // Without this, a third device-only flow inherits the unavailability silently, with
    // nobody ruling on it.
    const tagged = fs
      .readdirSync(MAESTRO_DIR)
      .filter((f) => f.endsWith('.yaml'))
      .filter((f) => /^\s*-\s+safety-device-only\s*$/m.test(readFlow(f)))
      .sort();
    expect(tagged).toEqual([...DEVICE_ONLY_FLOWS].sort());
  });

  describe('drift arm — the notice must not outlive the condition', () => {
    // CI is 100% ubuntu-latest and has no maestro, so this arm is skipped there. The skip
    // is asserted to be DELIBERATE (maestro genuinely absent) rather than the invocation
    // being broken, which is the failure mode a bare try/catch would hide.
    let installed: string | null = null;
    let resolutionFailed = false;

    try {
      const out = execFileSync('maestro', ['--version'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const line = out.split('\n').map((l) => l.trim()).filter((l) => /^\d+\.\d+\.\d+$/.test(l)).pop();
      if (line) installed = line;
      else resolutionFailed = true;
    } catch {
      installed = null;
    }

    it('either resolved a version or maestro is genuinely absent — never a broken invocation', () => {
      expect(resolutionFailed).toBe(false);
    });

    it('any installed maestro is inside the recorded-dead set', () => {
      if (installed === null) {
        // Deliberate skip: no maestro on PATH (CI). Every other assertion still ran.
        return;
      }
      expect(RECORDED_DEAD_VERSIONS).toContain(installed);
    });
  });
});
