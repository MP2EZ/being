/**
 * Crash Reports consent copy matches what crash reporting sends (DEBUG-779)
 *
 * The Crash Reports card, shown in Onboarding and ReConsent, said "All crash reports are
 * encrypted and anonymized" and listed "Identifiable information" under what is not collected.
 * Since DEBUG-776 the consented Sentry client also runs release-health session tracking, and a
 * session carries a per-install identifier (`did`). privacy-policy §5.1 discloses it; the card
 * and §2.2 ("no personal info included") contradicted it.
 *
 * Pinned here:
 *   (a) no field of the card claims anonymity or blanket non-identifiability;
 *   (b) while the consented client tracks sessions, the card discloses session diagnostics and
 *       the installation identifier — coupled to the code, comments stripped (DEBUG-390);
 *   (c) "encrypted" appears only as encryption in transit;
 *   (d) the policy agrees: §5.1 still names the identifier and §2.2 no longer says the
 *       diagnostics carry no personal info;
 *   (e) every matcher still fires on the pre-fix text.
 */
import * as fs from 'fs';
import * as path from 'path';
import { CONSENT_DETAILS } from '@/features/consent/constants/consentDetails';

const ROOT = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const card = CONSENT_DETAILS.crashReports;
const cardText = [
  card.title,
  card.description,
  ...card.details.whatWeCollect,
  ...card.details.whatWeDontCollect,
  card.details.whyItHelps,
  card.details.privacyNote,
].join('\n');

const ANONYMITY = /anonymi[sz]|\banonymous\b/i;
const BLANKET_NOT_IDENTIFIABLE = /\bidentifiable information\b|\bnot identifiable\b|\bno personal info/i;
const SESSION = /session/i;
const INSTALL_ID = /identifier created for this installation|installation identifier/i;
const ENCRYPTED = /encrypt/i;
const IN_TRANSIT = /encrypted connection|in transit/i;

// The text this item replaced, kept so every matcher above is proven to fire.
const PRE_FIX_CARD = [
  'Identifiable information',
  'All crash reports are encrypted and anonymized.',
].join('\n');
const PRE_FIX_POLICY_2_2 =
  '- **Technical Data:** Crash reports and app-stability diagnostics (no personal info included), collected only if you turn on *Crash Reports*';

describe('Crash Reports consent copy (DEBUG-779)', () => {
  it('(e) every matcher fires on the pre-fix text', () => {
    expect(PRE_FIX_CARD).toMatch(ANONYMITY);
    expect(PRE_FIX_CARD).toMatch(BLANKET_NOT_IDENTIFIABLE);
    expect(PRE_FIX_POLICY_2_2).toMatch(BLANKET_NOT_IDENTIFIABLE);
    expect('All crash reports are encrypted and anonymized.').toMatch(ENCRYPTED);
    expect('All crash reports are encrypted and anonymized.').not.toMatch(IN_TRANSIT);
  });

  it('(a) the card claims neither anonymity nor blanket non-identifiability', () => {
    expect(cardText).not.toMatch(ANONYMITY);
    expect(cardText).not.toMatch(BLANKET_NOT_IDENTIFIABLE);
  });

  it('(b) while the consented client tracks sessions, the card discloses them and the identifier', () => {
    const reporter = stripComments(read('app/src/core/services/logging/ExternalErrorReporter.ts'));
    // Canary: the stripped source still holds the consented client's session flag. If this
    // goes false, sessions moved — re-derive the disclosure rather than deleting the pin.
    expect(reporter).toMatch(/enableAutoSessionTracking:\s*true/);

    const collected = card.details.whatWeCollect.join('\n');
    expect(collected).toMatch(SESSION);
    expect(collected).toMatch(INSTALL_ID);
  });

  it('(c) "encrypted" appears only as encryption in transit', () => {
    for (const line of cardText.split('\n')) {
      if (ENCRYPTED.test(line)) expect(line).toMatch(IN_TRANSIT);
    }
  });

  it('(c) the card never implies it covers bug reports the user sends', () => {
    expect(card.details.privacyNote).not.toMatch(/everything sent to sentry|all reports/i);
  });

  it('(d) the privacy policy agrees with the card', () => {
    const policy = read('docs/legal/privacy-policy.md');
    const section = (from: string, to: string) => policy.slice(policy.indexOf(from), policy.indexOf(to));

    const s51 = section('### 5.1 Service Providers', '### 5.2');
    expect(s51.length).toBeGreaterThan(0);
    expect(s51).toMatch(/random identifier generated per app installation/);

    const s22 = section('### 2.2 Automatically Collected Information', '### 2.3');
    expect(s22.length).toBeGreaterThan(0);
    expect(s22).toMatch(/Crash reports/);
    expect(s22).not.toMatch(BLANKET_NOT_IDENTIFIABLE);
  });
});

/**
 * DEBUG-787 — the crisis error screen's privacy bullet makes the same kind of claim as the
 * card, so it is held to the same matchers. The boundary itself sends nothing to the external
 * reporter (its reportError only logs locally); the identifier travels with Crash Reports
 * sessions while that toggle is on. The bullet is static so the crisis fallback reads no
 * consent state — the canary below forces it to be re-derived if the boundary is ever wired
 * to the reporter.
 */
describe('CrisisErrorBoundary privacy bullet (DEBUG-787)', () => {
  const PRE_FIX_BULLET = '• No personal information is shared in error reports';
  const boundary = stripComments(read('app/src/features/crisis/components/CrisisErrorBoundary.tsx'));
  const start = boundary.indexOf('Your Safety & Privacy');
  const slice = start < 0 ? '' : boundary.slice(start, boundary.indexOf('</Text>', boundary.indexOf('<Text', start)));

  it('(e) the matchers fire on the pre-fix bullet', () => {
    expect(PRE_FIX_BULLET).toMatch(BLANKET_NOT_IDENTIFIABLE);
  });

  it('slices the Safety & Privacy block (liveness)', () => {
    expect(slice).toMatch(/Crisis support remains fully accessible/);
  });

  it('claims neither anonymity nor blanket non-identifiability', () => {
    expect(slice).not.toMatch(BLANKET_NOT_IDENTIFIABLE);
    expect(slice).not.toMatch(ANONYMITY);
    expect(slice).not.toMatch(/no personal information/i);
  });

  it('ties crash reports to the setting, discloses the identifier, and names what is excluded', () => {
    expect(slice).toMatch(/crash reports/i);
    expect(slice).toMatch(/only if you turned them on/i);
    expect(slice).toMatch(/random installation identifier/i);
    expect(slice).toMatch(/check-in answers/i);
    expect(slice).toMatch(/journal/i);
  });

  it('canary: the boundary does not send to the external reporter', () => {
    expect(boundary).toMatch(/reportError/); // liveness: the stripped source is the boundary
    expect(boundary).not.toMatch(/externalErrorReporter|reportExternalError|captureException|ErrorTrackingService\.reportError/);
  });
});

/**
 * Native crash events carry the installation identifier too (DEBUG-786)
 *
 * sentry-cocoa 8.58.0 `SentryClient.m` `setUserIdIfNoUserSet:` writes the installation id to
 * `user.id` on every event with no user set, native crashes and app hangs included; the app
 * never sets a user and RN's native `beforeSend` does not strip it. §5.1 attached the identifier
 * to session records only. With *Crash Reports* on, a bug report also carries it: RN's
 * DeviceContext integration copies the native user in, and `scrubFeedbackEvent` keeps `id`.
 */
// The clause holding the identifier: bounded by the preceding ';' or '.', so the session
// parenthetical's "crash status" cannot satisfy the crash check.
const ID_CLAUSE = /[^.;]*random identifier generated per app installation[^.]*\./;
const CRASH = /crash/i;
const NOTHING_ELSE = /Nothing else is collected/i;

const PRE_FIX_5_1_ID =
  'Sentry also receives standard app-session diagnostics (session start/end, app version, crash status) used to measure app stability across releases; these session records include a random identifier generated per app installation by our mobile framework.';
const PRE_FIX_BUG_REPORT =
  '**Bug reports you send:** if you choose to send a bug report from within the app, the message you type, the general area of the app you were in, and basic technical details such as the app version are sent to Sentry when you tap Send. Nothing else is collected with it.';

const sentryBullet = () => {
  const policy = read('docs/legal/privacy-policy.md');
  const start = policy.indexOf('- **[Sentry]');
  expect(start).toBeGreaterThan(-1);
  return policy.slice(start, policy.indexOf('\n', start));
};
const idSentence = (text: string) => text.match(ID_CLAUSE)?.[0] ?? '';
const bugReportPart = (text: string) => text.slice(text.indexOf('**Bug reports you send:**'));

describe('Crash reports carry the installation identifier (DEBUG-786)', () => {
  it('every matcher fires on the pre-fix text', () => {
    // The pre-fix text names "crash" only in the session parenthetical, outside the clause.
    expect(PRE_FIX_5_1_ID).toMatch(CRASH);
    expect(idSentence(PRE_FIX_5_1_ID)).toMatch(/session records include/);
    expect(idSentence(PRE_FIX_5_1_ID)).not.toMatch(CRASH);
    expect(bugReportPart(PRE_FIX_BUG_REPORT)).toMatch(NOTHING_ELSE);
  });

  it('§5.1 attaches the identifier to crash reports, not only session records', () => {
    const sentence = idSentence(sentryBullet());
    expect(sentence).toMatch(/random identifier generated per app installation/);
    expect(sentence).toMatch(CRASH);
  });

  it('§5.1 says Sentry does not store the IP address (org setting, hand-verified — DPIA 2.43)', () => {
    expect(sentryBullet()).toMatch(/not store[^.]*IP address|IP address[^.]*not stored/);
  });

  it('§5.1 does not say a bug report carries nothing else', () => {
    const bug = bugReportPart(sentryBullet());
    expect(bug).toMatch(/Bug reports you send/);
    expect(bug).not.toMatch(NOTHING_ELSE);
    expect(bug).toMatch(/Crash Reports\*? is on[^.]*installation identifier/);
  });
});
