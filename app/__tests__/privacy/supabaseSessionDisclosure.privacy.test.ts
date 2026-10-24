/**
 * DEBUG-850: Supabase Auth stores the latest connection's IP address and user agent against the
 * anonymous account identifier (`auth.sessions.ip` / `user_agent`, rewritten on every refresh).
 * The privacy policy said the identifier "contains no ... personal information", called the
 * crisis-detection event "PII-free" and "nothing that identifies you", and the DPIA and LIA rested
 * re-identification on "the absence of quasi-identifiers" — but `analytics_events.user_id` joins
 * `auth.sessions.ip` / `user_agent` in one step.
 *
 * Pinned here: every published non-identifiability claim is gone, the policy and the California
 * notice say what is stored, and the DPIA / LIA no longer rest on the absent quasi-identifiers.
 * Each matcher is proven against the text it replaced (DEBUG-390), so a pass means the claim is
 * absent, not that the matcher never fires.
 *
 * MAINT-865: INFRA-851's hourly job now clears `auth.sessions.ip` / `user_agent` (verified on the
 * hosted project 2026-10-24), so the policy, the California notice, the DPIA and the LIA bound the
 * IP address and user agent to "deleted within a day of each connection". The last-connection
 * time is NOT narrowed: the scrub leaves the session timestamps alone, so it is still kept until
 * the random account ID is deleted. Pinned here: the old all-fields "kept until … deleted" wording
 * is gone, the new bound is present on every surface, and the last-connection time keeps its own.
 *
 * INFRA-861: the crisis-detection event no longer carries the random account ID. The §3 "linked"
 * assertion is inverted on purpose; its own claims are pinned in crisisDelinkClaims.privacy.test.ts.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const read = (rel: string) =>
  fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/<!--[\s\S]*?-->/g, '');

const policy = read('docs/legal/privacy-policy.md');
const california = read('docs/legal/california-privacy.md');
const dpia = read('docs/legal/dpia-sensitive-wellness-data.md');
const lia = read('docs/legal/lia-crisis-telemetry.md');

const between = (text: string, from: string, to: string) => {
  const start = text.indexOf(from);
  if (start < 0) return '';
  const end = text.indexOf(to, start + from.length);
  return text.slice(start, end < 0 ? undefined : end);
};
const lineStarting = (text: string, prefix: string) => {
  const start = text.indexOf(prefix);
  return start < 0 ? '' : text.slice(start, text.indexOf('\n', start));
};

const NON_IDENTIFYING =
  /PII-free|nothing that identifies you|no identifying information|or other personal information/i;
const AGGREGATE_RECORD = /\baggregate\b[^.\n]*(record|event)|(record|event)[^.\n]*\baggregate\b/i;
const SENTRY_STYLE_NOT_STORED = /IP address itself is not stored/;
const QUASI_ID_RELIANCE = /managed by[^.]*the absence of quasi-identifiers/;
const NOT_ACHIEVABLE = /re-identification remains not realistically achievable/;
const CA_IDENTIFIERS_NO = /^\| \*\*Identifiers\*\* \|[^|]*\| No\b/m;
// MAINT-865: the IP address (or a "They" standing for all connection records) kept until the
// identifier is deleted. Scoped to one sentence and to that subject, so the last-connection
// sentence, which keeps the "until … deleted" bound, does not trip it.
// `(?:[^.]|\.\d)` stays inside one sentence but crosses a section number such as "§4.1".
const IP_KEPT_UNTIL_DELETED =
  /\b(They|IP address)\b(?:[^.]|\.\d)*\bkept until\b(?:[^.]|\.\d)*\b(identifier|account)\b(?:[^.]|\.\d)*\bdeleted\b/;
const CA_IP_UNTIL_DELETED = /IP address[^|]*\|\s*Until the identifier is deleted/;
const ORPHAN_KEEPS_RECORDS = /stays on our servers with its connection records/;
const IP_WITHIN_A_DAY =
  /IP address and (the )?(device and app details|user agent)(?:[^.]|\.\d)*deleted within a day of each connection/i;
const LAST_CONNECTION_KEPT =
  /(last-connection time|time the app last connected)(?:[^.]|\.\d)*kept until the (random account ID|identifier) is deleted/i;

// The text this item replaced, kept so every matcher above is proven to fire.
const PRE_FIX = {
  identifier:
    'This identifier is a randomly generated value — it contains **no** email address, name, phone number, or other personal information, and you are never asked to sign in.',
  safetyEvent:
    'Being also records an aggregate, PII-free crisis-detection event to our own first-party secure storage (Supabase).',
  analyticsNote: 'That event contains no raw scores and no identifying information — only aggregate category labels.',
  retention: '- **Crisis Detection Events:** An aggregate, PII-free record of when a crisis threshold was detected',
  caIdentifiers: '| **Identifiers** | Email address, username | No (v1 operates anonymously; no account creation) |',
  quasi:
    'Re-identification is therefore managed by severity-bucketing, the absence of quasi-identifiers, first-party RLS isolation, and the fact that `auth.uid()` is non-enumerable.',
  achievable: 'On that corrected basis re-identification remains not realistically achievable.',
  // MAINT-865: the retention wording INFRA-851's scrub made untrue.
  s41Kept:
    'They are kept until the identifier is deleted, and the identifier and its connection records are removed when you delete your account or data in the app (§7.4).',
  s41Orphan:
    'If you delete or reinstall the app without first deleting your account, the old identifier stays on our servers with its connection records, and nothing deletes it automatically today.',
  s73:
    '- **Connection Records:** The IP address, device and app details and last-connection time Supabase keeps against your random account ID (§4.1) are kept until the identifier is deleted.',
  caRow:
    '| Connection records (IP address, device and app details and last-connection time kept against your random account ID; see Privacy Policy §4.1) | Until the identifier is deleted; request logs that include the IP address are kept for 1 day on our current plan |',
  // What MAINT-865 keeps: the last-connection sentence must NOT trip the IP matcher.
  lastConnection: 'The time the app last connected is kept until the identifier is deleted.',
};

describe('Supabase session disclosure (DEBUG-850)', () => {
  it('every matcher fires on the text it replaced', () => {
    expect(PRE_FIX.identifier).toMatch(NON_IDENTIFYING);
    expect(PRE_FIX.safetyEvent).toMatch(NON_IDENTIFYING);
    expect(PRE_FIX.safetyEvent).toMatch(AGGREGATE_RECORD);
    expect(PRE_FIX.analyticsNote).toMatch(NON_IDENTIFYING);
    expect(PRE_FIX.retention).toMatch(NON_IDENTIFYING);
    expect(PRE_FIX.retention).toMatch(AGGREGATE_RECORD);
    expect(PRE_FIX.caIdentifiers).toMatch(CA_IDENTIFIERS_NO);
    expect(PRE_FIX.quasi).toMatch(QUASI_ID_RELIANCE);
    expect(PRE_FIX.achievable).toMatch(NOT_ACHIEVABLE);
    expect(PRE_FIX.s41Kept).toMatch(IP_KEPT_UNTIL_DELETED);
    expect(PRE_FIX.s73).toMatch(IP_KEPT_UNTIL_DELETED);
    expect(PRE_FIX.s41Orphan).toMatch(ORPHAN_KEEPS_RECORDS);
    expect(PRE_FIX.caRow).toMatch(CA_IP_UNTIL_DELETED);
    expect(PRE_FIX.lastConnection).not.toMatch(IP_KEPT_UNTIL_DELETED);
    expect(PRE_FIX.lastConnection).toMatch(LAST_CONNECTION_KEPT);
  });

  describe('privacy policy', () => {
    const s22 = between(policy, '### 2.2 Automatically Collected Information', '### 2.3');
    const s3 = between(policy, '## 3. How We Use Your Information', '## 4.');
    const s41 = between(policy, '### 4.1 Local-First Architecture', '### 4.2');
    const s52 = between(policy, '### 5.2 Analytics', '### 5.3');
    const s7 = between(policy, '## 7. Data Retention', '## 8.');
    const supabase = lineStarting(policy, '- **[Supabase]');

    it('slices are live', () => {
      for (const s of [s22, s3, s41, s52, s7, supabase]) expect(s.length).toBeGreaterThan(40);
      expect(s3).toMatch(/Safety Features/);
      expect(s41).toMatch(/random account ID/);
    });

    it('makes no non-identifiability claim about the identifier or the safety event', () => {
      for (const s of [s3, s41, s52, s7]) expect(s).not.toMatch(NON_IDENTIFYING);
      expect(s3).not.toMatch(AGGREGATE_RECORD);
      expect(s7).not.toMatch(AGGREGATE_RECORD);
    });

    it('§4.1 says what Supabase records against the identifier and for how long', () => {
      expect(s41).toMatch(/IP address/);
      expect(s41).toMatch(/user agent/i);
      // MAINT-865: the IP address and user agent are bounded; the last-connection time is not.
      expect(s41).toMatch(IP_WITHIN_A_DAY);
      expect(s41).not.toMatch(IP_KEPT_UNTIL_DELETED);
      expect(s41).toMatch(LAST_CONNECTION_KEPT);
      // An identifier left behind by a reinstall: say nothing deletes it today, promise no bound.
      expect(s41).toMatch(/reinstall/i);
      expect(s41).toMatch(/nothing deletes/i);
      expect(s41).not.toMatch(ORPHAN_KEEPS_RECORDS);
    });

    it('§2.2, §5.1 and §7.3 bound the IP address and user agent, and §7.3 keeps the last-connection time', () => {
      const connection22 = lineStarting(s22, '- **Connection Records:**');
      const connection73 = lineStarting(s7, '- **Connection Records:**');
      for (const line of [connection22, connection73]) expect(line).toMatch(/Connection Records/); // liveness
      for (const line of [connection22, supabase, connection73]) {
        expect(line).toMatch(IP_WITHIN_A_DAY);
        expect(line).not.toMatch(IP_KEPT_UNTIL_DELETED);
      }
      expect(connection73).toMatch(LAST_CONNECTION_KEPT);
      expect(connection73).toMatch(/nothing deletes/i);
    });

    it('§3 does not describe the identifier\'s IP address as unbounded', () => {
      const safety = lineStarting(s3, '- **Safety Features:**');
      expect(safety).toMatch(/Safety Features/); // liveness
      expect(safety).toMatch(/IP address(?:[^.]|\.\d)*within a day/);
    });

    it('§2.2 lists the connection records in their own bullet, outside the Crash Reports gate', () => {
      const technical = lineStarting(s22, '- **Technical Data:**');
      expect(technical).toMatch(/Crash reports/); // liveness: the slice is the gated bullet
      expect(technical).not.toMatch(/IP address/);
      expect(s22.replace(technical, '')).toMatch(/IP address/);
    });

    it('§5.1 Supabase entry says IP address and user agent ARE stored, and the request-log window', () => {
      expect(supabase).toMatch(/IP address/);
      expect(supabase).toMatch(/user agent/i);
      expect(supabase).not.toMatch(SENTRY_STYLE_NOT_STORED);
      expect(supabase).toMatch(/request logs[^.]*for 1 day/i);
    });

    // INFRA-861 inverts this deliberately: the event is now stored WITHOUT the random account ID.
    // The NON_IDENTIFYING / AGGREGATE_RECORD bans above stay: request logs still hold the sending
    // IP address for a day, so "nothing that identifies you" would still be untrue.
    it('§3 says the safety event is stored without the random account ID (INFRA-861)', () => {
      const safety = lineStarting(s3, '- **Safety Features:**');
      expect(safety).toMatch(/Safety Features/); // liveness
      expect(safety).toMatch(/stored \*\*without\*\* your random account ID/);
      expect(safety).not.toMatch(/stored with your random account ID|linked to you/);
    });

    it('§7 keeps the true statement that tapping through to a crisis line is not recorded', () => {
      expect(s7).toMatch(/not whether you tapped through to 988/);
    });
  });

  describe('California notice', () => {
    it('lists identifiers as collected and drops the PII-free retention label', () => {
      const row = lineStarting(california, '| **Identifiers** |');
      expect(row).toMatch(/Identifiers/); // liveness
      expect(row).not.toMatch(CA_IDENTIFIERS_NO);
      expect(row).toMatch(/IP address/);
      expect(california).not.toMatch(NON_IDENTIFYING);
    });

    it('splits the connection-records retention: IP address within a day, last-connection time until deletion', () => {
      const row = lineStarting(california, '| Connection records');
      expect(row).toMatch(/Connection records/); // liveness
      expect(row).not.toMatch(CA_IP_UNTIL_DELETED);
      expect(row).toMatch(IP_WITHIN_A_DAY);
      expect(row).toMatch(LAST_CONNECTION_KEPT);
      expect(row).toMatch(/request logs[^|]*1 day/i);
    });
  });

  describe('DPIA and LIA', () => {
    const scenario1 = lineStarting(dpia, '**Scenario 1');

    it('Scenario 1 no longer rests on absent quasi-identifiers and names the session join', () => {
      expect(scenario1).toMatch(/Scenario 1/); // liveness
      expect(scenario1).not.toMatch(QUASI_ID_RELIANCE);
      expect(scenario1).not.toMatch(NOT_ACHIEVABLE);
      expect(scenario1).toMatch(/auth\.sessions/);
    });

    it('the purposes table and control 13 no longer call the payload PII-free', () => {
      expect(lineStarting(dpia, '| Crisis-detection telemetry —')).not.toMatch(NON_IDENTIFYING);
      expect(lineStarting(dpia, '| 13 |')).not.toMatch(NON_IDENTIFYING);
    });

    it('the LIA is re-versioned and no longer rests on absent quasi-identifiers', () => {
      const version = lia.match(/\*\*Version:\*\* (\d+)\.(\d+)/);
      expect(version).not.toBeNull();
      const [major, minor] = [Number(version![1]), Number(version![2])];
      expect(major > 1 || minor >= 3).toBe(true);
      expect(lia).not.toMatch(QUASI_ID_RELIANCE);
      expect(lia).not.toMatch(/The payload carries no information usable to identify/);
      expect(lia).toMatch(/auth\.sessions/);
    });

    it('MAINT-865: the DPIA records the scrub as a control, says nothing alerts on it, and updates the residuals', () => {
      const control = lineStarting(dpia, '| 23 |');
      expect(control).toMatch(/auth-session-ip-scrub/);
      expect(control).toMatch(/INFRA-870/);
      expect(control).toMatch(/no alert|nothing pages/i);
      const status = lineStarting(dpia, '10. **Status.**');
      expect(status).toMatch(/Status/); // liveness
      expect(status).not.toMatch(/INFRA-851 and INFRA-848 should land/);
      expect(status).toMatch(/INFRA-851/);
      expect(lineStarting(dpia, '9. **Tripwires.**')).toMatch(/scrub/i);
    });

    it('MAINT-865: the LIA is re-versioned and records the INFRA-851 review without discharging INFRA-848', () => {
      const version = lia.match(/\*\*Version:\*\* (\d+)\.(\d+)/);
      expect(version).not.toBeNull();
      const [major, minor] = [Number(version![1]), Number(version![2])];
      expect(major > 1 || minor >= 5).toBe(true);
      const review = lineStarting(lia, '**Review performed — session IP minimisation (INFRA-851');
      expect(review).toMatch(/reaffirmed/);
      expect(review).toMatch(/INFRA-848/);
    });
  });
});
