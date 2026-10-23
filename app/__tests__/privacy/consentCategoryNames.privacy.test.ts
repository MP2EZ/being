/**
 * One user-facing name per consent category (MAINT-819)
 *
 * A user must be able to tell that the switch in Privacy & Data, the card they agreed to
 * in onboarding, the screens behind it and the privacy policy all name the same consent.
 * Compliance ruled the names (MAINT-819 AC1, recorded in the item):
 *
 *   analytics → "Usage Analytics"   the most recent compliance-reviewed name (policy v1.20)
 *   crash     → "Crash Reports"     already consistent
 *   backup    → "Settings Backup"   MAINT-169's choice; "Cloud Backup" in a wellness app
 *                                   reads as "my wellness history is backed up", which the
 *                                   feature does not do (FTC §5 net impression)
 *   research  → "Research Participation"  already consistent
 *
 * RULED below is the only place the names are literal, so a silent rename on any surface
 * fails here. DEBUG-390: source is comment-stripped and every slice is asserted live before
 * a negative runs against it.
 */
import * as fs from 'fs';
import * as path from 'path';
import { CONSENT_DETAILS } from '@/features/consent/constants/consentDetails';

const ROOT = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const RULED = {
  analytics: 'Usage Analytics',
  crashReports: 'Crash Reports',
  cloudSync: 'Settings Backup',
  research: 'Research Participation',
} as const;

/** The losing name, as a feature name. Code identifiers (CloudBackupScreen) never match. */
const STALE = /\bcloud backup\b/i;

const FILES = {
  privacyData: 'app/src/features/profile/screens/PrivacyDataScreen.tsx',
  navigator: 'app/src/features/profile/ProfileStackNavigator.tsx',
  backupSettings: 'app/src/core/components/settings/CloudBackupSettings.tsx',
  consentBlocked: 'app/src/features/consent/screens/ConsentBlockedScreen.tsx',
  consentDetails: 'app/src/features/consent/constants/consentDetails.ts',
  onboarding: 'app/src/features/onboarding/screens/OnboardingScreen.tsx',
  policy: 'docs/legal/privacy-policy.md',
};

/**
 * Recorded exemptions. Each is asserted still live, so a stale exemption goes red rather
 * than silently excusing nothing.
 */
const EXEMPT = [
  {
    surface: 'privacy policy "### 5.2 Analytics" heading',
    rationale: 'A processing-topic heading covering the app opt-in AND the website banner; the in-app control name appears in its body.',
    live: () => /^### 5\.2 Analytics$/m.test(read(FILES.policy)),
  },
  {
    surface: 'the CloudBackup route name, CloudBackupScreen/CloudBackupSettings/CloudBackupService, the cloudSync key and testIDs',
    rationale: 'Code identifiers, not names a user sees; renaming them reaches the persisted consent schema.',
    live: () => /name="CloudBackup"/.test(stripComments(read(FILES.navigator))),
  },
  {
    surface: 'lowercase "settings backup" / "cloud backup" prose in california-privacy.md and multi-state-privacy.md',
    rationale: 'Founder decision at batch approval: generic prose in those docs is out of scope here.',
    live: () => fs.existsSync(path.join(ROOT, 'docs/legal/california-privacy.md')),
  },
];

describe('MAINT-819 — consent category names agree across surfaces', () => {
  it.each(Object.entries(RULED))('CONSENT_DETAILS.%s.title is the ruled name', (category, name) => {
    expect(CONSENT_DETAILS[category as keyof typeof RULED].title).toBe(name);
  });

  describe('Privacy & Data', () => {
    const screen = stripComments(read(FILES.privacyData));

    it.each(Object.values(RULED))('renders the "%s" row under its ruled label', (name) => {
      expect(screen).toContain(`label="${name}"`);
    });

    it('the Manage row names the ruled backup name, visibly and to a screen reader', () => {
      const manage = `Manage ${RULED.cloudSync}`;
      expect(screen).toContain(`accessibilityLabel="${manage}"`);
      expect(screen).toMatch(new RegExp(`settingLabel\\}>${manage}<`));
    });

    it('carries no "cloud backup" feature name', () => {
      expect(screen).toMatch(/Settings Backup/); // liveness
      expect(screen).not.toMatch(STALE);
    });
  });

  it('the CloudBackup route header uses the ruled name', () => {
    const nav = stripComments(read(FILES.navigator));
    const m = nav.match(/name="CloudBackup"[^>]*title:\s*'([^']+)'/);
    expect(m).not.toBeNull();
    expect(m![1]).toBe(RULED.cloudSync);
  });

  it('the backup settings screen titles itself with the ruled name and never says "cloud backup"', () => {
    const settings = stripComments(read(FILES.backupSettings));
    expect(settings).toContain(`<Text style={styles.title}>${RULED.cloudSync}</Text>`);
    expect(settings).not.toMatch(STALE);
  });

  it.each(Object.values(RULED))('the onboarding summary confirms "%s" by its ruled name', (name) => {
    expect(stripComments(read(FILES.onboarding))).toContain(`>✓ ${name} enabled<`);
  });

  it.each([FILES.consentBlocked, FILES.consentDetails, FILES.onboarding])('%s carries no "cloud backup" feature name', (rel) => {
    const text = stripComments(read(rel));
    expect(text.length).toBeGreaterThan(500); // liveness: the stripper left a real file
    expect(text).not.toMatch(STALE);
  });

  describe('privacy policy', () => {
    const policy = read(FILES.policy);
    const body = policy.slice(0, policy.indexOf('## 10.'));
    const section = (from: string, to: string) => body.slice(body.indexOf(from), body.indexOf(to));

    it('§4.2 heading uses the ruled backup name', () => {
      expect(body).toMatch(new RegExp(`^### 4\\.2 Optional ${RULED.cloudSync}$`, 'm'));
    });

    it('§2.2 names the analytics and crash controls by their ruled names', () => {
      const s22 = section('### 2.2', '### 2.3');
      expect(s22).toMatch(/Usage Data/); // liveness
      expect(s22).toContain(`*${RULED.analytics}*`);
      expect(s22).toContain(`*${RULED.crashReports}*`);
      expect(s22).not.toMatch(/\*Analytics\*/);
    });

    it('§5.2 points at the ruled in-app control', () => {
      expect(section('### 5.2 Analytics', '#### Marketing website')).toContain(
        `Privacy & Data > ${RULED.analytics}`,
      );
    });

    it('the header Version equals the newest §10 revision row', () => {
      const header = policy.match(/^\*\*Version:\*\*\s*([\d.]+)/m);
      const newest = policy.slice(policy.indexOf('## 10.')).match(/^- \*\*v([\d.]+) \(/m);
      expect(header).not.toBeNull();
      expect(newest).not.toBeNull();
      expect(header![1]).toBe(newest![1]);
    });
  });

  it.each(EXEMPT)('exemption still live: $surface', (e) => {
    expect(e.rationale.length).toBeGreaterThan(20);
    expect(e.live()).toBe(true);
  });
});

describe('matcher integrity (DEBUG-390)', () => {
  it('STALE fires on the pre-fix strings and not on code identifiers', () => {
    expect(STALE.test("const CONSENT_OFF_TITLE = 'Cloud Backup Is Off';")).toBe(true);
    expect(STALE.test('<Text style={styles.settingLabel}>Manage Cloud Backup</Text>')).toBe(true);
    expect(STALE.test('import CloudBackupScreen from "./CloudBackupScreen";')).toBe(false);
    expect(STALE.test("navigation.navigate('CloudBackup')")).toBe(false);
  });

  it('stripComments removes a comment that names the stale name', () => {
    expect(STALE.test(stripComments('// was "Cloud Backup" before MAINT-819'))).toBe(false);
  });

  it('the version check catches a mismatched pair', () => {
    const doc = '**Version:** 1.23\n\n## 10. Changes\n\n- **v1.22 (October 18, 2026):** x';
    const header = doc.match(/^\*\*Version:\*\*\s*([\d.]+)/m)![1];
    const newest = doc.slice(doc.indexOf('## 10.')).match(/^- \*\*v([\d.]+) \(/m)![1];
    expect(header).not.toBe(newest);
  });
});
