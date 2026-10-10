/**
 * Meta-test for scripts/supabase-deploy-drift.js (MAINT-742 / TEST-27).
 *
 * Spawns the real script with --reconcile against mkdtemp fixture trees (never
 * committed), steering it with --functions-dir / --manifest / --migrations-dir
 * or the DRIFT_* env vars. Pins the exit alphabet: 0 clean, 1 drift, 2 COULD NOT
 * DETERMINE. The last block runs the real tree, deliberately: the point of the
 * guard is that the real tree stays clean.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.resolve(__dirname, '..', '..', '..', 'scripts', 'supabase-deploy-drift.js');
const FN_NAMES = ['alpha', 'bravo', 'charlie', 'delta', 'echo'];

let root;

const write = (rel, content) => {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
};

const baseManifest = () => ({
  functions: [...FN_NAMES],
  platformInjected: ['SUPABASE_URL'],
  edgeSecrets: { MY_SECRET: { required: true } },
  tunables: {},
  vaultSecrets: { my_cron_secret: {} },
});

/** Build a clean fixture tree under `root` and return the three paths. */
function buildTree({ fnNames = FN_NAMES, manifest = baseManifest() } = {}) {
  for (const fn of fnNames) {
    write(`supabase/functions/${fn}/index.ts`, "export const url = Deno.env.get('SUPABASE_URL');\n");
  }
  // One real edge-secret read so SECRET STALE is not tripped on the clean tree.
  write('supabase/functions/alpha/secret.ts', "export const s = Deno.env.get('MY_SECRET');\n");
  write(
    'supabase/migrations/001_init.sql',
    "SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'my_cron_secret';\n"
  );
  write('supabase/deploy-manifest.json', JSON.stringify(manifest, null, 2));
  return paths();
}

const paths = () => ({
  functions: path.join(root, 'supabase', 'functions'),
  manifest: path.join(root, 'supabase', 'deploy-manifest.json'),
  migrations: path.join(root, 'supabase', 'migrations'),
});

const cleanEnv = () => {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith('DRIFT_')) delete env[k];
  return env;
};

const flagArgs = (p) => [
  '--functions-dir', p.functions,
  '--manifest', p.manifest,
  '--migrations-dir', p.migrations,
];

const run = (args, env = cleanEnv()) =>
  spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8', env, cwd: root });

const reconcile = (p, extraEnv) => run(['--reconcile', ...flagArgs(p)], extraEnv);
const output = (r) => `${r.stdout}\n${r.stderr}`;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-fixture-'));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('exit 0', () => {
  it('a clean fixture tree with >= 5 functions reconciles', () => {
    const r = reconcile(buildTree());
    expect(output(r)).toMatch(/5 function\(s\), 2 env read\(s\)/);
    expect(output(r)).toMatch(/Manifest reconciled with source/);
    expect(r.status).toBe(0);
  });

  it('a known non-literal env read resolves its path against the tree root, not the real repo', () => {
    const manifest = baseManifest();
    manifest.knownNonLiteralEnvReads = [{ file: 'supabase/functions/_shared/env.ts' }];
    const p = buildTree({ manifest });
    write('supabase/functions/_shared/env.ts', 'export const get = (n: string) => Deno.env.get(n);\n');
    const r = reconcile(p);
    expect(output(r)).toMatch(/5 function\(s\)/);
    expect(output(r)).toMatch(/Manifest reconciled with source/);
    expect(r.status).toBe(0);
  });
});

describe('exit 1: drift', () => {
  it('FUNCTION UNDECLARED: a function dir missing from the manifest', () => {
    const p = buildTree();
    write('supabase/functions/foxtrot/index.ts', 'export {};\n');
    const r = reconcile(p);
    expect(r.status).toBe(1);
    expect(output(r)).toMatch(/FUNCTION UNDECLARED: supabase\/functions\/foxtrot\//);
  });

  it('FUNCTION STALE: the manifest declares a function with no directory', () => {
    const manifest = baseManifest();
    manifest.functions.push('ghost');
    const r = reconcile(buildTree({ manifest }));
    expect(r.status).toBe(1);
    expect(output(r)).toMatch(/FUNCTION STALE: manifest declares "ghost"/);
  });

  it('SECRET STALE: the manifest declares an edge secret nothing reads', () => {
    const manifest = baseManifest();
    manifest.edgeSecrets.NEVER_READ = { required: false };
    const r = reconcile(buildTree({ manifest }));
    expect(r.status).toBe(1);
    expect(output(r)).toMatch(/SECRET STALE: manifest declares edge secret "NEVER_READ"/);
  });

  it('SECRET UNDECLARED: a literal read absent from the manifest', () => {
    const p = buildTree();
    write('supabase/functions/bravo/extra.ts', "export const x = Deno.env.get('BRAND_NEW');\n");
    const r = reconcile(p);
    expect(r.status).toBe(1);
    expect(output(r)).toMatch(/SECRET UNDECLARED: Deno\.env\.get\('BRAND_NEW'\)/);
  });

  it('NON-LITERAL ENV READ: a computed name not exempted in the manifest', () => {
    const p = buildTree();
    write('supabase/functions/bravo/dyn.ts', 'export const g = (n: string) => Deno.env.get(n);\n');
    const r = reconcile(p);
    expect(r.status).toBe(1);
    expect(output(r)).toMatch(/NON-LITERAL ENV READ: supabase\/functions\/bravo\/dyn\.ts/);
  });

  it('NON-LITERAL ENTRY STALE: an exemption for a file with no non-literal read', () => {
    const manifest = baseManifest();
    manifest.knownNonLiteralEnvReads = [{ file: 'supabase/functions/alpha/index.ts' }];
    const r = reconcile(buildTree({ manifest }));
    expect(r.status).toBe(1);
    expect(output(r)).toMatch(/NON-LITERAL ENTRY STALE/);
  });
});

describe('exit 2: COULD NOT DETERMINE', () => {
  it('fewer than 5 function dirs', () => {
    const r = reconcile(buildTree({ fnNames: FN_NAMES.slice(0, 4), manifest: { ...baseManifest(), functions: FN_NAMES.slice(0, 4) } }));
    expect(r.status).toBe(2);
    expect(output(r)).toMatch(/COULD NOT DETERMINE/);
    expect(output(r)).toMatch(/only 4 function dir/);
  });

  it('a malformed (non-JSON) manifest', () => {
    const p = buildTree();
    fs.writeFileSync(p.manifest, '{ not json');
    const r = reconcile(p);
    expect(r.status).toBe(2);
    expect(output(r)).toMatch(/COULD NOT DETERMINE/);
    expect(output(r)).toMatch(/not valid JSON/);
  });

  it('a missing manifest', () => {
    const p = buildTree();
    fs.rmSync(p.manifest);
    const r = reconcile(p);
    expect(r.status).toBe(2);
    expect(output(r)).toMatch(/COULD NOT DETERMINE/);
  });

  it('a manifest missing a required key', () => {
    const manifest = baseManifest();
    delete manifest.vaultSecrets;
    const r = reconcile(buildTree({ manifest }));
    expect(r.status).toBe(2);
    expect(output(r)).toMatch(/missing required key "vaultSecrets"/);
  });

  it('a missing functions dir', () => {
    const p = buildTree();
    const r = reconcile({ ...p, functions: path.join(root, 'no-such-dir') });
    expect(r.status).toBe(2);
    expect(output(r)).toMatch(/COULD NOT DETERMINE/);
  });

  it('an internal error during reconcile is reported as undetermined, not an uncaught crash', () => {
    // A well-keyed manifest whose "functions" is not iterable throws a TypeError
    // inside reconcile().
    const manifest = baseManifest();
    manifest.functions = 5;
    const r = reconcile(buildTree({ manifest }));
    expect(r.status).toBe(2);
    expect(output(r)).toMatch(/COULD NOT DETERMINE/);
  });

  it('no mode prints usage and exits 2', () => {
    const r = run([]);
    expect(r.status).toBe(2);
    expect(output(r)).toMatch(/Usage:/);
  });
});

describe('path configuration precedence: CLI > env > default', () => {
  it('DRIFT_* env vars steer the scan', () => {
    const p = buildTree();
    const r = run(['--reconcile'], {
      ...cleanEnv(),
      DRIFT_FUNCTIONS_DIR: p.functions,
      DRIFT_MANIFEST_PATH: p.manifest,
      DRIFT_MIGRATIONS_DIR: p.migrations,
    });
    expect(output(r)).toMatch(/Manifest reconciled with source/);
    expect(r.status).toBe(0);
  });

  it('a CLI flag beats the matching env var', () => {
    const p = buildTree();
    const r = run(['--reconcile', ...flagArgs(p)], {
      ...cleanEnv(),
      DRIFT_FUNCTIONS_DIR: path.join(root, 'no-such-dir'),
      DRIFT_MANIFEST_PATH: path.join(root, 'no-such-manifest.json'),
      DRIFT_MIGRATIONS_DIR: path.join(root, 'no-such-migrations'),
    });
    expect(r.status).toBe(0);
  });

  it('accepts --flag=value as well as --flag value', () => {
    const p = buildTree();
    const r = run([
      '--reconcile',
      `--functions-dir=${p.functions}`,
      `--manifest=${p.manifest}`,
      `--migrations-dir=${p.migrations}`,
    ]);
    expect(r.status).toBe(0);
  });

  it('a flag may precede --reconcile', () => {
    const p = buildTree();
    const r = run([...flagArgs(p), '--reconcile']);
    expect(r.status).toBe(0);
  });
});

describe('real tree', () => {
  it('--reconcile exits 0', () => {
    const r = spawnSync('node', [SCRIPT, '--reconcile'], { encoding: 'utf8', env: cleanEnv() });
    expect(output(r)).toMatch(/Manifest reconciled with source/);
    expect(r.status).toBe(0);
  });
});
