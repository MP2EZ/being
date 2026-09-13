/**
 * Cron-bearer trust-domain separation — source pin (INFRA-379).
 *
 * WHAT THIS EXISTS TO CATCH. Supabase Edge secrets are PROJECT-WIDE; there is no
 * per-function scoping. So which env var a function names IS its trust domain — the only
 * mechanism available. Three functions authenticate a pg_cron caller via `x-cron-secret`:
 *
 *   crisis-detection-alerting  ─┐ same crisis trust domain, deliberately share
 *   crisis-liveness-probe      ─┘ `CRON_SECRET` (== Vault `crisis_alert_cron_secret`)
 *   grace-period-automation    ─── ops domain, own `GRACE_PERIOD_CRON_SECRET`
 *
 * Before INFRA-379 all three read `CRON_SECRET`, while
 * `20260616000000_grace_period_automation_cron.sql` simultaneously instructed the operator
 * that Vault `grace_period_cron_secret` must be DISTINCT from `crisis_alert_cron_secret`
 * *and* equal to what the function reads. Both cannot hold for one shared name, so the
 * documented separation was unachievable: an operator following the migration literally
 * 401s every tick, and an operator "fixing" that by pointing both at one value puts the
 * crisis and ops pipelines behind a single bearer — where an ops-side rotation silently
 * breaks crisis paging.
 *
 * WHY A SOURCE PIN AND NOT A BEHAVIOURAL TEST. The dangerous half of this is console state
 * (two Vault rows holding the same value), which no test in this repo can observe. What a
 * test CAN hold is the half that makes the separation expressible at all: the names in the
 * code. Renaming grace-period-automation back to `CRON_SECRET` re-creates the trap in a way
 * that reads as harmless cleanup — one identifier, and the two domains are welded together
 * again with nothing red anywhere.
 *
 * DEBUG-390 discipline. These assertions match SOURCE, and this codebase deliberately names
 * anti-patterns in prose to warn the next reader off them — including, extensively, in the
 * very files pinned here. Comments are therefore stripped before matching, the regexes are
 * quote-bounded so `GRACE_PERIOD_CRON_SECRET` cannot satisfy a bare `CRON_SECRET` match, and
 * the last test proves the matchers still fire (comment-stripping plus a narrow regex is
 * exactly the combination that can silently match nothing at all and go green forever).
 */

import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';

/** Strip block and line comments so prose that *names* a secret cannot satisfy a match. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** Quote-bounded: `CRON_SECRET` must not be satisfied by `GRACE_PERIOD_CRON_SECRET`. */
function readsEnv(source: string, name: string): boolean {
  return new RegExp(`Deno\\.env\\.get\\(\\s*['"]${name}['"]\\s*\\)`).test(source);
}

async function loadStripped(relativePath: string): Promise<string> {
  const raw = await Deno.readTextFile(new URL(relativePath, import.meta.url));
  const stripped = stripComments(raw);
  // A path typo or a moved file would otherwise make every `not-contains` assertion below
  // pass vacuously against an empty string.
  assert(
    stripped.length > 500,
    `${relativePath}: stripped source is implausibly short (${stripped.length} chars) — ` +
      'the file moved, or stripComments over-matched. Fix before trusting the assertions.',
  );
  return stripped;
}

const GRACE = '../grace-period-automation/index.ts';
const ALERTER = '../crisis-detection-alerting/index.ts';
const PROBE = '../crisis-liveness-probe/index.ts';

Deno.test('grace-period-automation reads its OWN ops-domain cron bearer', async () => {
  const source = await loadStripped(GRACE);
  assert(
    readsEnv(source, 'GRACE_PERIOD_CRON_SECRET'),
    'grace-period-automation must authenticate against GRACE_PERIOD_CRON_SECRET. Both ends ' +
      'move together: the edge secret AND Vault `grace_period_cron_secret`.',
  );
});

Deno.test('grace-period-automation does NOT read the shared crisis bearer', async () => {
  const source = await loadStripped(GRACE);
  assertEquals(
    readsEnv(source, 'CRON_SECRET'),
    false,
    'grace-period-automation must not read CRON_SECRET — that is the crisis pipeline\'s ' +
      'bearer, and Edge secrets are project-wide, so sharing the name collapses the two ' +
      'trust domains into one rotatable value. See the header of this file.',
  );
});

Deno.test('the crisis pair still shares CRON_SECRET — same domain, by design', async () => {
  // The separation is only meaningful as a pair of facts. Pinning solely the grace-period
  // side would stay green if someone "separated" the crisis functions from each other too,
  // which is a different (and unwanted) change: the probe exists to guarantee the alerter
  // has something to read, so they are one domain on purpose.
  for (const path of [ALERTER, PROBE]) {
    const source = await loadStripped(path);
    assert(
      readsEnv(source, 'CRON_SECRET'),
      `${path} must keep reading CRON_SECRET (crisis trust domain).`,
    );
    assertEquals(
      readsEnv(source, 'GRACE_PERIOD_CRON_SECRET'),
      false,
      `${path} must never read the ops-domain bearer.`,
    );
  }
});

Deno.test('the matchers can still go red', () => {
  // Guards the DEBUG-390 failure mode: a stripped-source assertion whose regex quietly
  // matches nothing is indistinguishable from a passing one.
  assert(readsEnv(`const s = Deno.env.get('CRON_SECRET');`, 'CRON_SECRET'));
  assert(readsEnv(`const s = Deno.env.get("CRON_SECRET");`, 'CRON_SECRET'));

  // The exact regression this file exists to catch must be detected, not just tolerated.
  assertEquals(
    readsEnv(`const s = Deno.env.get('GRACE_PERIOD_CRON_SECRET');`, 'CRON_SECRET'),
    false,
    'quote-bounding is load-bearing: a substring match would make the grace-period name ' +
      'satisfy the crisis-bearer check and the pin would never fire.',
  );

  // And comment-stripping must actually remove the prose that names these secrets.
  assertEquals(
    readsEnv(stripComments(`// do not use Deno.env.get('CRON_SECRET') here\nconst x = 1;`), 'CRON_SECRET'),
    false,
  );
  assertEquals(
    readsEnv(stripComments(`/* never Deno.env.get('CRON_SECRET') */\nconst x = 1;`), 'CRON_SECRET'),
    false,
  );
});
