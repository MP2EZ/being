/**
 * INFRA-486 — a flow declares WHICH viewport its assertions certify, as machine-readable
 * data rather than prose.
 *
 * WHY THIS EXISTS
 * ===============
 * INFRA-478 made the gate RECORD its device. Nothing made it say whether that device was
 * the one a given flow's assertions actually depend on. The two are not the same question:
 * measured on one commit, iPhone 16 Pro / 402x874 gave 8/8 PASS and iPhone SE 3 / 375x667
 * gave 5/8 — but only some flows are layout-sensitive, and forcing the whole suite to
 * certify the small viewport makes the gate expensive to satisfy, which is the pressure
 * that produces `--skip-e2e`. So the declaration is PER FLOW.
 *
 * WARN-ONLY, AND THAT IS THE POINT OF THE PIN BELOW. This lands the DATA only. Turning a
 * non-certifying run into a verdict (and a b-close refusal) is INFRA-493, deliberately
 * sequenced after the 375x667 measurement so a refusal is never armed over unmeasured or
 * known-red flows. The negative pins here fail a change that arms it early.
 *
 * FAILS CLOSED. A flow with no declaration is treated as declaring the smallest supported
 * viewport, so a newly added flow is flagged on a large device rather than silently
 * certified everywhere. The coverage pin at the bottom is what keeps that from being
 * theoretical.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_APP = path.resolve(__dirname, '..', '..');
const HELPER = path.join(REPO_APP, 'scripts', 'e2e-sim-device.sh');
const MAESTRO_DIR = path.join(REPO_APP, '.maestro');

/** Source the helper and run one expression; returns status + trimmed streams. */
function sh(expr) {
  const res = spawnSync('/bin/bash', ['-c', `. "${HELPER}"; ${expr}`], { encoding: 'utf8' });
  return {
    status: res.status,
    stdout: (res.stdout || '').trim(),
    stderr: (res.stderr || '').trim(),
  };
}

/** Write a throwaway flow file carrying `header`, run `fn` against it, clean up. */
function withFlow(header, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-cert-'));
  const f = path.join(dir, 'probe.yaml');
  fs.writeFileSync(f, `${header}appId: fyi.being.app\ntags:\n  - safety\n---\n- launchApp\n`);
  try {
    return fn(f);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const certifies = f => sh(`e2e_flow_certifies "${f}"`);

describe('e2e_flow_certifies — reading the declaration', () => {
  it('reads a declared viewport', () => {
    withFlow('# e2e-certifies: 375x667\n', f => {
      expect(certifies(f).stdout).toBe('375x667');
    });
  });

  it('reads `any` for a flow whose contract is viewport-independent', () => {
    withFlow('# e2e-certifies: any\n', f => {
      expect(certifies(f).stdout).toBe('any');
    });
  });

  it('tolerates whitespace around the key and the value', () => {
    withFlow('#   e2e-certifies:    402x874   \n', f => {
      expect(certifies(f).stdout).toBe('402x874');
    });
  });

  it('takes only the FIRST declaration, so a stray later mention cannot override it', () => {
    withFlow('# e2e-certifies: 375x667\n# e2e-certifies: any\n', f => {
      expect(certifies(f).stdout).toBe('375x667');
    });
  });

  it('FAILS CLOSED on a flow with no declaration — assumes the smallest viewport', () => {
    withFlow('', f => {
      expect(certifies(f).stdout).toBe('375x667');
    });
  });

  it('FAILS CLOSED on an unreadable path rather than reporting `any`', () => {
    expect(sh('e2e_flow_certifies "/no/such/flow.yaml"').stdout).toBe('375x667');
  });

  it('honours E2E_SMALLEST_SUPPORTED_VIEWPORT when the fail-closed default is taken', () => {
    withFlow('', f => {
      const r = sh(`E2E_SMALLEST_SUPPORTED_VIEWPORT=320x568; e2e_flow_certifies "${f}"`);
      expect(r.stdout).toBe('320x568');
    });
  });
});

describe('e2e_flow_certification_note — the label', () => {
  const note = (declared, ran) => sh(`e2e_flow_certification_note "${declared}" "${ran}"`).stdout;

  it('says it certifies when the declaration matches the device it ran on', () => {
    expect(note('375x667', '375x667')).toBe('certifies 375x667');
  });

  it('says it does NOT certify when the viewports differ, naming both', () => {
    expect(note('375x667', '402x874')).toBe('declares 375x667, ran 402x874 — does not certify');
  });

  it('treats an underivable viewport as non-certifying, not as a pass', () => {
    // "we could not derive it" and "it was wrong" are the same quality of evidence.
    expect(note('375x667', 'unknown')).toMatch(/does not certify/);
  });

  it('reports a viewport-independent flow as such on any device', () => {
    expect(note('any', '402x874')).toBe('viewport-independent');
    expect(note('any', 'unknown')).toBe('viewport-independent');
  });
});

describe('WARN-ONLY is structural — neither function can refuse', () => {
  // The load-bearing negative pins. INFRA-493 may turn a non-certifying run into a verdict,
  // but it must do so deliberately and after the measurement — a change that arms a refusal
  // here fails in CI rather than in an operator's close.
  it('e2e_flow_certifies exits 0 even for a missing file', () => {
    expect(sh('e2e_flow_certifies "/no/such/flow.yaml"').status).toBe(0);
  });

  it('e2e_flow_certification_note exits 0 on the non-certifying path', () => {
    expect(sh('e2e_flow_certification_note "375x667" "402x874"').status).toBe(0);
  });

  it('e2e_flow_certification_note exits 0 on the underivable path', () => {
    expect(sh('e2e_flow_certification_note "375x667" "unknown"').status).toBe(0);
  });
});

describe('coverage — every sim-runnable safety flow declares a viewport', () => {
  /** The same selection e2e-safety.sh globs: non-underscore files tagged exactly `safety`. */
  const safetyFlows = fs
    .readdirSync(MAESTRO_DIR)
    .filter(n => n.endsWith('.yaml') && !n.startsWith('_'))
    .filter(n => /^[ \t]*-[ \t]+safety[ \t]*$/m.test(fs.readFileSync(path.join(MAESTRO_DIR, n), 'utf8')));

  it('finds the sim-runnable safety flows (guards against the matcher silently matching nothing)', () => {
    // Not pinned to a count — the runner globs by tag, so a count here would rot on every
    // added flow. Pinned to non-empty plus a known member, which is what makes the
    // per-flow assertion below meaningful rather than vacuously true over an empty list.
    expect(safetyFlows.length).toBeGreaterThan(0);
    expect(safetyFlows).toContain('crisis-button-reachability.yaml');
  });

  test.each(safetyFlows)('%s declares e2e-certifies', name => {
    const src = fs.readFileSync(path.join(MAESTRO_DIR, name), 'utf8');
    const m = src.match(/^#[ \t]*e2e-certifies:[ \t]*(\S+)[ \t]*$/m);
    expect(m).not.toBeNull();
    expect(m[1]).toMatch(/^(any|\d+x\d+)$/);
  });
});
