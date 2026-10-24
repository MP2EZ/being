/**
 * INFRA-861 — the crisis-detection event is stored without the random account ID.
 *
 * `supabase/migrations/20261024000000_infra861_crisis_delink.sql` makes the table remove
 * `user_id` and `session_id` from every crisis row, truncate `created_at` to the UTC day and
 * rebuild `properties` from five keys. The app sends the row without a user token and the crisis
 * path no longer creates the random account ID. Pre-change rows are deleted, and server retention
 * is 90 days from receipt.
 *
 * Pinned here, against every surface that described the old shape:
 *   - the policy no longer says the event is linked to the random account ID, created by it, or
 *     deleted with it, and no longer lists it among 3-year server data;
 *   - it does say what replaced that: no account or session identifier, the 1-day request-log IP,
 *     the no-re-identification commitment, no deletion on request, 90 days from arrival;
 *   - none of those sentences calls the event anonymous, unlinkable, PII-free or "nothing that
 *     identifies you": the request logs still hold the sending IP address, so the allowed claim is
 *     "no account or session identifier" and nothing broader;
 *   - the California notice, the FEAT-860 summaries, the LIA, the DPIA, regulatory-applicability
 *     gap 5, the manifest / App Store docs and the delete-account hint say the same.
 *
 * DEBUG-390: each matcher is proven against the text it replaced, comments are stripped before
 * matching, and every slice has a liveness assertion that fires on the slice itself.
 */
import * as fs from 'fs';
import * as path from 'path';
import { POLICY_MATERIAL_CHANGE_SUMMARIES } from '@/features/consent/constants/policyMaterialChanges';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const raw = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
const stripHtmlComments = (t: string) => t.replace(/<!--[\s\S]*?-->/g, '');
const stripCodeComments = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const doc = (rel: string) => stripHtmlComments(raw(rel));

const policy = doc('docs/legal/privacy-policy.md');
const california = doc('docs/legal/california-privacy.md');
const lia = doc('docs/legal/lia-crisis-telemetry.md');
const dpia = doc('docs/legal/dpia-sensitive-wellness-data.md');
const regulatory = doc('docs/legal/regulatory-applicability.md');
const manifestDoc = doc('docs/security/ios-privacy-manifest.md');
const appStoreDoc = doc('docs/product/app-store-connect-metadata.md');
const deleteScreen = stripCodeComments(raw('app/src/features/profile/screens/DeleteAccountScreen.tsx'));

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
const version = (text: string, re: RegExp): [number, number] => {
  const m = text.match(re);
  if (!m) return [0, 0];
  return [Number(m[1]), Number(m[2])];
};
const atLeast = ([maj, min]: [number, number], [wMaj, wMin]: [number, number]) =>
  maj > wMaj || (maj === wMaj && min >= wMin);

// The event described as tied to the identifier.
const LINKED =
  /(stored|linked) (with|to) your random account ID|so it is linked to you|linked to you rather than|therefore linked to you|\(linked to your random account ID/i;
// Account deletion described as reaching the event.
const DELETE_REACHES_EVENT =
  /Deleting your account(?:[^.]|\.\d)*deletes the event|deletes every record tied to it \([^)]*crisis-detection events/i;
// The event described as what creates the identifier.
const MINTED_BY_CRISIS =
  /the first time a crisis-detection event is recorded|when a crisis-detection event \(§3\) is recorded/i;
// The server event described as kept 3 years.
const SERVER_THREE_YEARS =
  /Crisis Detection Events[^\n]*deletes them 3 years|Crisis detection events[^|\n]*\|\s*3 years|crisis-detection event[^.\n]*kept for 3 years|Crisis Detection Event described in §7\.2 is still recorded and kept for 3 years/i;
// Labels the event may never carry: request logs still hold the sending IP address.
const BANNED_LABEL =
  /\banonymous\b|\bunlinkable\b|PII-free|nothing that identifies you|\banonymi[sz]ed\b|\bde-?identified\b/i;

// The text this item replaced, kept so every matcher above is proven to fire.
const PRE_FIX = {
  safety:
    'It is, however, stored with your random account ID (Section 4.1), which our database provider associates with your device\'s most recent IP address and device and app details, so the event is linked to you rather than anonymous. Deleting your account (Section 7.4) deletes the event.',
  analyticsNote:
    'That event contains no raw scores and no answers — only the category labels listed in §3 — but it is stored with your random account ID (§4.1), so it is linked to you.',
  cascade:
    'it erases your random account ID (§4.1), which automatically and permanently deletes every record tied to it (any settings backup, subscription records, crisis-detection events, and the connection records described in §4.1).',
  mint41:
    'it is created the first time one is needed — when a crisis-detection event (§3) is recorded, when you use the optional settings backup (§4.2), or when you make or restore a purchase.',
  mint22:
    '- **Connection Records:** Once the app has created your random account ID (Section 4.1) — the first time a crisis-detection event is recorded, you use the settings backup, or you make or restore a purchase —',
  retention72:
    'Crisis Detection Events are the only crisis-related records held on our servers; an automated daily job (`analytics-retention-prune`) deletes them 3 years after they are recorded.',
  unfinished73:
    'If one of those answers led Being to show you crisis support resources, the Crisis Detection Event described in §7.2 is still recorded and kept for 3 years; it does not contain your answers.',
  caRow:
    '| Crisis detection events (linked to your random account ID; not opt-in; see Privacy Policy §7.2) | 3 years on our servers |',
  caSpi:
    'The one exception is the crisis-detection event (Privacy Policy §3), which records that a screening threshold was met, without your answers or scores, and is linked to your random account ID',
  summary125:
    'The policy now says your random account ID is not anonymous: it is stored with your IP address and device details, and with crisis-detection events, which are therefore linked to you.',
  userIdSource:
    'The random account ID (Supabase `auth.uid()`), created the first time a crisis-detection event is recorded, the settings backup is used, or a purchase is made or restored.',
  deleteHint: 'accessibilityHint="Permanently erases your account and wellness data. This cannot be undone."',
  bannedSamples: [
    'an aggregate, PII-free crisis-detection event',
    'it contains nothing that identifies you',
    'the event is anonymous',
    'crisis rows are de-identified',
  ],
};

const OLD_HINT = /erases your account and wellness data/;

describe('INFRA-861 — crisis-detection event stored without the random account ID', () => {
  describe('matcher integrity (DEBUG-390)', () => {
    it('every matcher fires on the text it replaced', () => {
      expect(PRE_FIX.safety).toMatch(LINKED);
      expect(PRE_FIX.safety).toMatch(DELETE_REACHES_EVENT);
      expect(PRE_FIX.analyticsNote).toMatch(LINKED);
      expect(PRE_FIX.cascade).toMatch(DELETE_REACHES_EVENT);
      expect(PRE_FIX.mint41).toMatch(MINTED_BY_CRISIS);
      expect(PRE_FIX.mint22).toMatch(MINTED_BY_CRISIS);
      expect(PRE_FIX.retention72).toMatch(SERVER_THREE_YEARS);
      expect(PRE_FIX.unfinished73).toMatch(SERVER_THREE_YEARS);
      expect(PRE_FIX.caRow).toMatch(SERVER_THREE_YEARS);
      expect(PRE_FIX.caRow).toMatch(LINKED);
      expect(PRE_FIX.caSpi).toMatch(/is linked to your random account ID/);
      expect(PRE_FIX.summary125).toMatch(LINKED);
      expect(PRE_FIX.userIdSource).toMatch(MINTED_BY_CRISIS);
      expect(PRE_FIX.deleteHint).toMatch(OLD_HINT);
      for (const sample of PRE_FIX.bannedSamples) expect(sample).toMatch(BANNED_LABEL);
    });

    it('the allowed claim does not trip the banned-label matcher', () => {
      expect('stored without your random account ID or any session identifier').not.toMatch(BANNED_LABEL);
      expect('stored without your random account ID or any session identifier').not.toMatch(LINKED);
    });

    it('the code-comment stripper keeps string literals with a URL', () => {
      expect(stripCodeComments("const u = 'https://being.fyi'; // note")).toBe("const u = 'https://being.fyi'; ");
    });
  });

  describe('privacy policy', () => {
    const s22 = between(policy, '### 2.2 Automatically Collected Information', '### 2.3');
    const s3 = between(policy, '## 3. How We Use Your Information', '## 4.');
    const safety = lineStarting(s3, '- **Safety Features:**');
    const s41 = between(policy, '### 4.1 Local-First Architecture', '### 4.2');
    const s52 = between(policy, '### 5.2 Analytics', '### 5.3');
    const analyticsNote = lineStarting(s52, '**Note on crisis-safety recording:**');
    const s72 = between(policy, '### 7.2 Crisis-Related Data', '### 7.3');
    const s73 = between(policy, '### 7.3 Other Data', '### 7.4');
    const crisis73 = lineStarting(s73, '- **Crisis Detection Events:**');
    const s74 = between(policy, '### 7.4 Your Right to Delete', '## 8.');
    const crisis74 = lineStarting(s74, 'Deletion does not reach crisis-detection events');
    const v133 = lineStarting(policy, '- **v1.33 ');

    it('slices are live', () => {
      expect(s22).toMatch(/Connection Records/);
      expect(safety).toMatch(/Safety Features/);
      expect(s41).toMatch(/random account ID/);
      expect(analyticsNote).toMatch(/crisis-safety recording/);
      expect(s72).toMatch(/High-Severity Assessments/);
      expect(crisis73).toMatch(/Crisis Detection Events/);
      expect(crisis74).toMatch(/crisis-detection events/);
      expect(v133).toMatch(/v1\.33/);
    });

    it('is at version 1.33 or later', () => {
      expect(atLeast(version(policy, /\*\*Version:\*\* (\d+)\.(\d+)/), [1, 33])).toBe(true);
    });

    it('no longer ties the event to the random account ID or to account deletion', () => {
      for (const s of [safety, analyticsNote, s72, s73, s74]) {
        expect(s).not.toMatch(LINKED);
        expect(s).not.toMatch(DELETE_REACHES_EVENT);
      }
    });

    it('§2.2 and §4.1 no longer say a crisis-detection event creates the random account ID', () => {
      expect(s22).not.toMatch(MINTED_BY_CRISIS);
      expect(s41).not.toMatch(MINTED_BY_CRISIS);
      expect(s41).toMatch(/Recording a crisis-detection event \(§3\) does not create it/);
    });

    it('§3 states what replaced the link: no identifier, the request-log IP, the commitment, no deletion, 90 days', () => {
      expect(safety).toMatch(/stored \*\*without\*\* your random account ID(?:[^.]|\.\d)*without any session identifier/);
      expect(safety).toMatch(/request logs still record the IP address of the connection that sent it/);
      expect(safety).toMatch(/will not try to work out whose they are/);
      expect(safety).toMatch(/will not link them to other data we hold/);
      expect(safety).toMatch(/cannot delete it on request/);
      expect(safety).toMatch(/deleted automatically 90 days after it reaches our servers/);
    });

    it('§7.2 no longer lists the server event among 3-year data; §7.3 lists it at 90 days from arrival', () => {
      expect(s72).not.toMatch(/- \*\*Crisis Detection Events:\*\*/);
      for (const s of [s72, s73]) expect(s).not.toMatch(SERVER_THREE_YEARS);
      expect(crisis73).toMatch(/90 days after it arrives/);
      expect(crisis73).toMatch(/the 90 days run from arrival/);
      expect(crisis73).toMatch(/not whether you tapped through to 988/);
    });

    it('§7.4 says the event cannot be deleted on request and that pre-change events were deleted', () => {
      expect(crisis74).toMatch(/cannot delete them on request/);
      expect(crisis74).toMatch(/before version 1\.33[^.]*were stored with the random account ID; we deleted all of them/);
    });

    it('no crisis-event sentence carries a banned label', () => {
      for (const s of [safety, analyticsNote, crisis73, crisis74, v133]) expect(s).not.toMatch(BANNED_LABEL);
    });

    it('§10 marks v1.33 as a material change', () => {
      expect(v133).toMatch(/— material change\./);
    });
  });

  describe('California notice', () => {
    const row = lineStarting(california, '| Crisis detection events');
    const spi = lineStarting(california, '- PHQ-9 / GAD-7 responses, mood check-ins');
    const rightToDelete = between(california, '### Right to Delete', '### Right to Correct');

    it('slices are live', () => {
      expect(row).toMatch(/Crisis detection events/);
      expect(spi).toMatch(/crisis-detection event/);
      expect(rightToDelete).toMatch(/Right to Delete/);
    });

    it('is at version 1.7 or later', () => {
      expect(atLeast(version(california, /\*\*Version:\*\* (\d+)\.(\d+)/), [1, 7])).toBe(true);
    });

    it('drops the linked wording and the 3-year server retention', () => {
      for (const s of [row, spi]) expect(s).not.toMatch(LINKED);
      expect(spi).not.toMatch(/is linked to your random account ID/);
      expect(row).not.toMatch(SERVER_THREE_YEARS);
      expect(row).toMatch(/90 days on our servers/);
    });

    it('Right to Delete carries the no-re-identification commitment and the deletion limit', () => {
      expect(rightToDelete).toMatch(/will not attempt to re-identify it/);
      expect(rightToDelete).toMatch(/cannot delete them on request/);
      for (const s of [row, spi, rightToDelete]) expect(s).not.toMatch(BANNED_LABEL);
    });
  });

  describe('FEAT-860 material-change summaries', () => {
    it('1.25 no longer says crisis-detection events are linked to you', () => {
      expect(POLICY_MATERIAL_CHANGE_SUMMARIES['1.25']).toMatch(/random account ID/); // liveness
      expect(POLICY_MATERIAL_CHANGE_SUMMARIES['1.25']).not.toMatch(LINKED);
    });

    it('1.33 states the change without a banned label', () => {
      const line = POLICY_MATERIAL_CHANGE_SUMMARIES['1.33'];
      expect(line).toMatch(/without your random account ID/);
      expect(line).not.toMatch(BANNED_LABEL);
    });
  });

  describe('LIA, DPIA and regulatory-applicability', () => {
    // Only the text INFRA-861 added: older amendments on the same line keep their history.
    const infra861Segments = (text: string) =>
      text
        .split('\n')
        .filter((l) => l.includes('INFRA-861'))
        .map((l) => l.slice(l.indexOf('INFRA-861')));

    it('the LIA is at 1.6 or later, records the de-link and the counsel questions', () => {
      expect(atLeast(version(lia, /\*\*Version:\*\* (\d+)\.(\d+)/), [1, 6])).toBe(true);
      expect(lia).toMatch(/Superseded in part \(INFRA-861/);
      expect(lia).toMatch(/Review performed — de-link from the account identity \(INFRA-861/);
      expect(lia).toMatch(/Open for counsel, not closed here/);
    });

    it('the DPIA is at 2.67 or later with an INFRA-861 change-log row and control 24', () => {
      expect(atLeast(version(dpia, /\| Version \| (\d+)\.(\d+) \|/), [2, 67])).toBe(true);
      expect(dpia).toMatch(/^\| 2\.67 \| [^|]+ \| [^|]+ \| INFRA-861/m);
      expect(dpia).toMatch(/^\| 24 \| \*\*Crisis rows carry no account or session identifier/m);
    });

    it('INFRA-861 text in the LIA and DPIA never calls the row anonymous or unlinkable', () => {
      const segments = [...infra861Segments(lia), ...infra861Segments(dpia)];
      expect(segments.length).toBeGreaterThan(5); // liveness
      for (const seg of segments) {
        expect(seg).not.toMatch(/\bunlinkable\b|PII-free|nothing that identifies you|\b(is|are) anonymous\b/i);
      }
    });

    it('gap 5 is closed in the data model pending counsel, and §2a still records no compliance', () => {
      const gap5 = lineStarting(regulatory, '5. The Supabase Crisis Detection Event');
      expect(gap5).toMatch(/crisis_detected/); // liveness
      expect(gap5).toMatch(/Closed in the data model v1\.5 \(INFRA-861[^)]*\), pending counsel/);
      expect(gap5).toMatch(/Open for counsel, not closed by us/);
      expect(lineStarting(regulatory, '**Status: APPLIES.')).toMatch(/still does not record compliance/);
    });
  });

  describe('manifest and App Store docs; delete-account hint', () => {
    it('the UserID source no longer says a crisis-detection event creates the ID', () => {
      const manifestRow = lineStarting(manifestDoc, '| `NSPrivacyCollectedDataTypeUserID`');
      const appStoreRow = lineStarting(appStoreDoc, '| Source | The random account ID');
      for (const r of [manifestRow, appStoreRow]) {
        expect(r).toMatch(/random account ID/); // liveness
        expect(r).not.toMatch(MINTED_BY_CRISIS);
      }
    });

    it('the delete-account hint promises only on-device wellness data', () => {
      expect(deleteScreen).toMatch(/accessibilityHint="Permanently erases your account and on-device wellness data\./);
      expect(deleteScreen).not.toMatch(OLD_HINT);
    });
  });
});
