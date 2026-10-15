/**
 * Analytics and Research consent copy (DEBUG-788)
 *
 * The Analytics card said "Anonymized before storage", listed "Any personally identifiable
 * information" and "Location data" as not collected, and promised 90-day deletion. Verified
 * against PostHog project 111221 on 2026-10-14: every app event carries a device-persistent
 * distinct_id (personal information under CCPA §1798.140 and GDPR Art. 4(1)), the project's
 * GeoIP transformation adds city and country to every event, and app events 98 days old were
 * still stored. The Research card described collection that does not exist: nothing outside
 * consentStore.ts consumes the research grant.
 *
 * Each claim is coupled to the code that makes it true where code decides it. Two facts live
 * only in the PostHog dashboard (IP discarded; GeoIP on) and are recorded with a date in the
 * DPIA instead — a jest pin cannot see them.
 *
 * The anonymity matcher is scoped per card and per row, never global: the cloudSync card's
 * OPERATIONAL_TELEMETRY_DISCLOSURE legitimately uses the defined term "anonymous account
 * identifier" (privacy-policy §4.1).
 */
import * as fs from 'fs';
import * as path from 'path';
import { CONSENT_DETAILS } from '@/features/consent/constants/consentDetails';

const ROOT = path.resolve(__dirname, '../../..');
const APP = path.join(ROOT, 'app');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const textOf = (c: (typeof CONSENT_DETAILS)[keyof typeof CONSENT_DETAILS]) =>
  [
    c.title,
    c.description,
    ...c.details.whatWeCollect,
    ...c.details.whatWeDontCollect,
    c.details.whyItHelps,
    c.details.privacyNote,
  ].join('\n');
const analytics = CONSENT_DETAILS.analytics;
const research = CONSENT_DETAILS.research;

const ANONYMITY = /anonymi[sz]|\banonymous\b/i;
const BLANKET_NOT_IDENTIFIABLE =
  /identifiable information|anything that could identify you|\bno personal\b|not identifiable/i;
const INSTALL_ID = /random identifier created for this installation/i;
const RETENTION_CLAIM = /\b\d+\s*days?\b|automatically deleted/i;

/** Every .ts/.tsx under app/src, excluding tests, comments stripped. */
function srcFiles(): Array<{ rel: string; text: string }> {
  const out: Array<{ rel: string; text: string }> = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== '__tests__' && e.name !== 'node_modules') walk(p);
      } else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) {
        out.push({ rel: path.relative(APP, p), text: stripComments(fs.readFileSync(p, 'utf8')) });
      }
    }
  };
  walk(path.join(APP, 'src'));
  return out;
}

// The text this item replaced, kept so every matcher is proven to fire.
const PRE_FIX = {
  analyticsPrivacyNote: 'Data retention: 90 days, then automatically deleted. Anonymized before storage.',
  analyticsDont: 'Any personally identifiable information',
  researchDescription: 'Help improve mental health care (fully anonymous)',
  researchDont: 'Anything that could identify you',
  screenLabel: 'Anonymous Usage Analytics',
  policyUsage: '- **Usage Data:** App usage patterns, feature engagement (anonymized)',
};

describe('Analytics and Research consent copy (DEBUG-788)', () => {
  it('(integrity) every matcher fires on the pre-fix text', () => {
    expect(PRE_FIX.analyticsPrivacyNote).toMatch(ANONYMITY);
    expect(PRE_FIX.analyticsPrivacyNote).toMatch(RETENTION_CLAIM);
    expect(PRE_FIX.analyticsDont).toMatch(BLANKET_NOT_IDENTIFIABLE);
    expect(PRE_FIX.researchDescription).toMatch(ANONYMITY);
    expect(PRE_FIX.researchDont).toMatch(BLANKET_NOT_IDENTIFIABLE);
    expect(PRE_FIX.screenLabel).toMatch(ANONYMITY);
    expect(PRE_FIX.policyUsage).toMatch(ANONYMITY);
  });

  describe('Analytics card', () => {
    const text = textOf(analytics);
    const collected = analytics.details.whatWeCollect.join('\n');
    const notCollected = analytics.details.whatWeDontCollect.join('\n');

    it('claims neither anonymity nor blanket non-identifiability', () => {
      expect(text).not.toMatch(ANONYMITY);
      expect(text).not.toMatch(BLANKET_NOT_IDENTIFIABLE);
    });

    it('discloses the installation identifier, and claims it is unlinked only while no identify() exists', () => {
      expect(collected).toMatch(INSTALL_ID);
      const linkers = srcFiles().filter(({ text: t }) =>
        /\.identify\(|\.alias\(|personProfiles\s*:\s*['"]always['"]/.test(t)
      );
      expect(linkers.map((f) => f.rel)).toEqual([]);
      expect(analytics.details.privacyNote).toMatch(/not linked to your account/i);
    });

    it('discloses language and time zone while the SDK still sends them', () => {
      const sdk = fs.readFileSync(
        path.join(APP, 'node_modules/posthog-react-native/dist/native-deps.js'),
        'utf8'
      );
      expect(sdk).toMatch(/\$timezone/);
      expect(sdk).toMatch(/\$locale/);
      expect(collected).toMatch(/language/i);
      expect(collected).toMatch(/time zone/i);
    });

    it('discloses approximate location and never lists location as not collected', () => {
      // The GeoIP transformation is dashboard config (verified on, 2026-10-14). Until a fresh
      // event is verified free of $geoip_*, approximate location must be disclosed.
      expect(collected).toMatch(/approximate location/i);
      expect(notCollected).not.toMatch(/^location data$/im);
      expect(notCollected).toMatch(/precise \(GPS\) location/i);
    });

    it('discloses that opening support resources and screenings is recorded, never the answers', () => {
      expect(collected).toMatch(/support resources/i);
      expect(collected).toMatch(/never your answers/i);
      expect(notCollected).toMatch(/PHQ-9\/GAD-7 responses and scores/);
    });

    it('makes no retention promise the app does not enforce', () => {
      expect(text).not.toMatch(RETENTION_CLAIM);
    });

    it('never implies this toggle controls safety-event recording', () => {
      expect(text).not.toMatch(/crisis (detection|recording|event)|safety (event|recording)/i);
    });
  });

  describe('Research card', () => {
    const text = textOf(research);

    it('claims neither anonymity nor collection that does not exist', () => {
      expect(text).not.toMatch(ANONYMITY);
      expect(text).not.toMatch(BLANKET_NOT_IDENTIFIABLE);
      expect(text).not.toMatch(/mood trends|feature effectiveness|1,000\+|publish|funding/i);
    });

    it('canary: while no code consumes the research grant, the card says nothing is collected', () => {
      const consumers = srcFiles().filter(
        ({ rel, text: t }) =>
          !rel.endsWith(path.join('stores', 'consentStore.ts')) &&
          /canPerformOperation\(\s*['"]research['"]\s*\)|canParticipateInResearch/.test(t)
      );
      // A research data path landing here means: re-derive this card and bump CONSENT_VERSION.
      expect(consumers.map((f) => f.rel)).toEqual([]);
      expect(research.details.whatWeCollect.join('\n')).toMatch(/^Nothing\b/);
      expect(research.description).toMatch(/nothing is collected/i);
      expect(research.details.privacyNote).toMatch(/ask .*again/i);
    });
  });

  describe('Privacy & Data screen rows', () => {
    const screen = stripComments(read('app/src/features/profile/screens/PrivacyDataScreen.tsx'));
    const row = (label: string) => {
      const i = screen.indexOf(label);
      return i < 0 ? '' : screen.slice(i, screen.indexOf('</View>', i));
    };

    it('renames the analytics row and describes it without anonymity claims', () => {
      expect(screen).not.toContain(PRE_FIX.screenLabel);
      const analyticsRow = row('Usage Analytics');
      expect(analyticsRow).toMatch(/Usage Analytics/); // liveness: the slice is the row
      expect(analyticsRow).not.toMatch(ANONYMITY);
      expect(analyticsRow).not.toMatch(/NO personal/);
      expect(analyticsRow).not.toMatch(/Being\. by/); // typo fixed
    });

    it('renders the research description from the single copy', () => {
      expect(screen).not.toMatch(/fully anonymous/);
      expect(screen).toMatch(/CONSENT_DETAILS\.research\.description/);
    });
  });

  describe('privacy policy agrees with the cards', () => {
    const policy = read('docs/legal/privacy-policy.md');
    const section = (from: string, to: string) => policy.slice(policy.indexOf(from), policy.indexOf(to));

    it('§2.2 names the identifier and drops "(anonymized)"', () => {
      const s22 = section('### 2.2 Automatically Collected Information', '### 2.3');
      expect(s22).toMatch(/Usage Data/); // liveness
      expect(s22).not.toMatch(/\(anonymized\)/);
      expect(s22).toMatch(/identifier/i);
    });

    it('§3 no longer says usage patterns are anonymized', () => {
      expect(section('## 3. How We Use Your Information', '## 4.')).not.toMatch(/anonymized usage/i);
    });

    it('§5.2 discloses the identifier, approximate location and the renamed control', () => {
      const s52 = section('### 5.2 Analytics', '#### Marketing website');
      expect(s52).toMatch(/Mobile app/); // liveness
      expect(s52).toMatch(/identifier/i);
      expect(s52).toMatch(/approximate location/i);
      expect(s52).toMatch(/Privacy & Data > Usage Analytics/);
    });
  });
});
