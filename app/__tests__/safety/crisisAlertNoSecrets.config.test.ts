/**
 * Committed-secret static pin for the Supabase deploy surface (INFRA-219).
 *
 * The crisis-detection alerting cron (migration 20260607000000_crisis_alert_cron.sql)
 * and its edge function reference the CRON_SECRET, Resend key, and notification target
 * BY NAME from Supabase Vault / Edge secrets — never as literals. This test mechanically
 * enforces that: it greps every committed migration + edge-function source for secret
 * shapes (Resend keys, Supabase JWT/service-role keys, Slack/Discord webhook URLs — a
 * webhook URL with an embedded token IS a secret) and fails the commit if any are found.
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

/** Secret shapes that must never appear in a committed migration / function. */
const SECRET_PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: 'Resend API key (re_…)', re: /\bre_[A-Za-z0-9]{16,}\b/ },
  { name: 'Supabase/JWT key (eyJ….…)', re: /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'Supabase secret token (sb_secret_… / sbp_…)', re: /\b(sb_secret_[A-Za-z0-9]{8,}|sbp_[A-Za-z0-9]{20,})\b/ },
  { name: 'Slack webhook URL (with token)', re: /hooks\.slack\.com\/services\/[A-Z0-9]/ },
  { name: 'Discord webhook URL (with token)', re: /discord(?:app)?\.com\/api\/webhooks\/\d/ },
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
});
