/**
 * Committed-secret static pin for the Supabase deploy surface (INFRA-219).
 *
 * Despite the file name, this pin is DOMAIN-AGNOSTIC and always has been: it matches secret
 * SHAPES over the whole `supabase/` tree, so it covers the crisis pipeline (INFRA-219,
 * INFRA-264) and the subscription/ops pipeline (INFRA-282, INFRA-296) equally. A new edge
 * function is protected the moment its file exists — no new pattern, no registration. Do
 * not add a parallel "opsAlertNoSecrets" test; extend this one.
 *
 * The crisis-detection alerting cron (migration 20260607000000_crisis_alert_cron.sql)
 * and its edge function reference the CRON_SECRET, Resend key, and notification target
 * BY NAME from Supabase Vault / Edge secrets — never as literals. This test mechanically
 * enforces that: it greps every committed migration + edge-function source for secret
 * shapes (Resend keys, Supabase JWT/service-role keys, Slack/Discord webhook URLs — a
 * webhook URL with an embedded token IS a secret) and fails the commit if any are found.
 * It also scans the two operator runbooks (see SCANNED_DOCS).
 *
 * Runs in `npm run precommit` via `test:safety` on every machine in <100ms — the same
 * mechanical-pin pattern as lsApplicationQueriesSchemes.config.test.ts (INFRA-184). If a
 * future change pastes a real secret into a migration or function, this fails BEFORE the
 * secret is committed. It does NOT print the matched value (that would re-leak it into CI
 * logs) — only the file and which pattern matched.
 */

import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_ROOT = path.resolve(__dirname, '../../../supabase');
const REPO_ROOT = path.resolve(__dirname, '../../..');

/**
 * Operator runbooks are scanned too (INFRA-296). They are the likeliest place a real
 * capability URL gets pasted, because they are the documents that tell a human to go
 * fetch one — §3's setup checklist literally instructs "copy its ping URL", and the
 * natural next move when writing up a completed setup is to paste what you used. The
 * regexes stay shape-based and require a token, so both runbooks can (and do) name
 * `hc-ping.com` and `healthchecks.io` in prose and in `<uuid>` placeholders without
 * matching.
 */
const SCANNED_DOCS = [
  'docs/development/post-launch-monitoring-runbook.md',
  'docs/development/crisis-analytics-runbook.md',
].map((rel) => path.join(REPO_ROOT, rel));

/** Secret shapes that must never appear in a committed migration / function. */
const SECRET_PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: 'Resend API key (re_…)', re: /\bre_[A-Za-z0-9]{16,}\b/ },
  { name: 'Supabase/JWT key (eyJ….…)', re: /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'Supabase secret token (sb_secret_… / sbp_…)', re: /\b(sb_secret_[A-Za-z0-9]{8,}|sbp_[A-Za-z0-9]{20,})\b/ },
  { name: 'Slack webhook URL (with token)', re: /hooks\.slack\.com\/services\/[A-Z0-9]/ },
  { name: 'Discord webhook URL (with token)', re: /discord(?:app)?\.com\/api\/webhooks\/\d/ },
  // INFRA-264: a healthchecks.io ping/check URL is a CAPABILITY URL (anyone holding it can
  // ping the check) → the URL WITH its token path segment is a secret. The bare hostname
  // MUST stay match-free so setup docs/comments can name `hc-ping.com` without a token.
  // Standard form: hc-ping.com/<8-4-4-4-12 uuid> (strict uuid shape avoids matching a
  // hc-ping.com/docs-style path). Self-hosted/slug form: healthchecks.io/ping/<token>.
  {
    name: 'healthchecks.io ping URL (hc-ping.com/<uuid>)',
    re: /hc-ping\.com\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/,
  },
  {
    name: 'healthchecks.io ping URL (healthchecks.io/ping/<token>)',
    re: /healthchecks\.io\/ping\/[0-9a-fA-F-]{8,}/,
  },
];

function collectFiles(dir: string, predicate: (f: string) => boolean): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}

describe('Supabase deploy surface carries no committed secrets (INFRA-219)', () => {
  const files = [
    ...collectFiles(path.join(SUPABASE_ROOT, 'migrations'), (f) => f.endsWith('.sql')),
    ...collectFiles(path.join(SUPABASE_ROOT, 'functions'), (f) => f.endsWith('.ts')),
    path.join(SUPABASE_ROOT, 'config.toml'),
    ...SCANNED_DOCS,
  ].filter((f) => fs.existsSync(f));

  it('finds migration + function files to scan (guards against a broken path)', () => {
    // If this drops to zero the test is silently vacuous — fail loudly instead.
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [path.relative(SUPABASE_ROOT, f), f]))(
    'no secret literal in %s',
    (_rel, full) => {
      const contents = fs.readFileSync(full as string, 'utf8');
      const hits = SECRET_PATTERNS.filter((p) => p.re.test(contents)).map((p) => p.name);
      // Report which pattern matched, never the matched value.
      expect(hits).toEqual([]);
    },
  );

  // Anti-rot self-check (INFRA-264): an absence-only scan is trivially satisfied by a
  // BROKEN regex. Prove the healthchecks.io patterns actually match a populated capability
  // URL (so a future edit can't silently make them vacuous) AND do NOT match a bare
  // hostname (so setup docs can name the host without a token). The samples below use a
  // SYNTHETIC, obviously-fake UUID (aaaaaaaa-…) and live ONLY in this test — never under
  // supabase/, so the scan above can never trip on them.
  describe('healthchecks.io secret pattern is non-vacuous (INFRA-264)', () => {
    const hcPing = SECRET_PATTERNS.find((p) => p.name.includes('hc-ping.com'))!;
    const hcSelfHosted = SECRET_PATTERNS.find((p) => p.name.includes('healthchecks.io/ping'))!;
    const SYNTHETIC_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'; // not a real check token

    it('both healthchecks.io patterns are registered', () => {
      expect(hcPing).toBeDefined();
      expect(hcSelfHosted).toBeDefined();
    });

    it('matches a populated hc-ping.com capability URL', () => {
      expect(hcPing.re.test(`https://hc-ping.com/${SYNTHETIC_UUID}`)).toBe(true);
    });

    it('matches a populated healthchecks.io/ping capability URL', () => {
      expect(hcSelfHosted.re.test(`https://healthchecks.io/ping/${SYNTHETIC_UUID}`)).toBe(true);
    });

    it('does NOT match a bare hostname (setup docs/comments stay allowed)', () => {
      expect(hcPing.re.test('set CRISIS_HEALTHCHECK_PING_URL to your hc-ping.com URL')).toBe(false);
      expect(hcSelfHosted.re.test('see healthchecks.io for setup')).toBe(false);
    });
  });
});
