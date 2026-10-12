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
