/**
 * Cloud Backup consent copy matches the real backup payload (DEBUG-614)
 *
 * The Cloud Backup consent card, shown in Onboarding and ReConsent, told users
 * the backup held "Journal entries (encrypted)", "Mood tracking history" and
 * "Custom reminders", and promised "Access your journal on tablet and phone".
 * `CloudBackupService` has uploaded only two app-setting fields since MAINT-117,
 * so users were asked to consent to processing larger than the real one.
 *
 * This suite pins the relation between the copy and the payload itself, not a
 * comment or the `EXPECTED_SAFE_FIELDS` logging constant:
 *   (a) a real `createBackup()` over a fully populated assessment store; the
 *       plaintext handed to `EncryptionService.encryptData` is flattened to leaf
 *       paths and must equal `PAYLOAD_DISCLOSURE` exactly. A new field, store or
 *       envelope key fails here until the map and the copy are updated together;
 *   (b) `whatWeCollect` is exactly the set of labels that map assigns;
 *   (c) the fields that describe the feature make no journal, mood or
 *       cross-device claim, and `whatWeDontCollect` names what stays local;
 *   (d) the docs describing the same backup do not contradict it;
 *   (e) every matcher still fires on the pre-fix text (DEBUG-390 discipline).
 *
 * Deliberately NOT asserted: backup ops telemetry sent under the same consent
 * (`backup_completed` etc.). Whether the card must list it is a compliance
 * ruling tracked in DEBUG-625.
 */
import * as fs from 'fs';
import * as path from 'path';

jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: { getState: jest.fn() },
}));
jest.mock('@/features/assessment/stores/assessmentStore', () => ({
  useAssessmentStore: { getState: jest.fn(), setState: jest.fn() },
}));
jest.mock('@/core/services/security/EncryptionService', () => ({
  __esModule: true,
  default: {
    encryptData: jest.fn(async () => ({ ciphertext: 'enc', iv: 'iv' })),
    decryptData: jest.fn(),
  },
}));
jest.mock('@/core/services/supabase/SupabaseService', () => ({
  __esModule: true,
  default: {
    saveBackup: jest.fn(async () => true),
    getBackup: jest.fn(),
    trackEvent: jest.fn(async () => undefined),
  },
}));
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(async (_alg: string, data: string) => `CHK_${data}`),
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async () => undefined),
  getItem: jest.fn(async () => null),
}));

import cloudBackupService from '@/core/services/supabase/CloudBackupService';
import EncryptionService from '@/core/services/security/EncryptionService';
import { useConsentStore } from '@/core/stores/consentStore';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { CONSENT_DETAILS } from '@/features/consent/constants/consentDetails';

const REPO_ROOT = path.resolve(__dirname, '../../..');

const ENVELOPE = Symbol('envelope');

/**
 * Every leaf path the backup uploads, and the consent label that discloses it.
 * Envelope keys carry no user data and need no bullet.
 */
const PAYLOAD_DISCLOSURE: Record<string, string | typeof ENVELOPE> = {
  version: ENVELOPE,
  timestamp: ENVELOPE,
  'metadata.platform': ENVELOPE,
  'stores.assessment.autoSaveEnabled': 'Your autosave setting',
  'stores.assessment.lastSyncAt': 'A last-sync timestamp',
};

/** Wellness data that must be named as NOT backed up. */
const MUST_DISCLOSE_AS_LOCAL: ReadonlyArray<[string, RegExp]> = [
  ['journal', /\bjournal/i],
  ['mood', /\bmood/i],
  ['screening responses and scores', /PHQ-9.*GAD-7.*responses.*scores/i],
];

/** Claims the feature-describing fields must not make. */
const JOURNAL_OR_MOOD = /\b(?:journal|mood)/i;
const CROSS_DEVICE =
  /across devices|another device|other devices|new (?:phone|device)|tablet|sync(?:ed)? (?:your data|content)/i;

/** data-privacy-architecture.md: backup destination claims contradicted by the code. */
const PERSONAL_CLOUD_DESTINATION = /iCloud|Google Drive|not our servers/i;
const EXPORT_NOT_SYNC = /user-initiated export, not cloud sync/i;

/** DPIA: implies wellness data leaves the device when backup is enabled. */
const DPIA_WELLNESS_VIA_BACKUP = /does not leave the user's device unless the user opts into (?:encrypted )?backup/i;

function leafPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  );
}

function read(rel: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

const card = CONSENT_DETAILS.cloudSync;

/** The fields that describe what the feature is and does. */
const CLAIM_FIELDS: ReadonlyArray<[string, string]> = [
  ['description', card.description],
  ['whyItHelps', card.details.whyItHelps],
  ['privacyNote', card.details.privacyNote],
  ...card.details.whatWeCollect.map((item, i): [string, string] => [`whatWeCollect[${i}]`, item]),
];

async function captureUploadedPlaintext(): Promise<unknown> {
  (useConsentStore.getState as jest.Mock).mockReturnValue({
    canPerformOperation: jest.fn(() => true),
  });
  // Every sensitive field populated, so the allowlist is exercised, not assumed.
  (useAssessmentStore.getState as jest.Mock).mockReturnValue({
    autoSaveEnabled: true,
    lastSyncAt: 1_700_000_000_000,
    lastSavedAt: 1_700_000_000_000,
    answers: [{ questionId: 'phq9_9', response: 3, timestamp: 1 }],
    currentSession: { id: 's1', type: 'phq9', answers: [] },
    currentQuestionIndex: 4,
    completedAssessments: [{ id: 'a1', type: 'phq9', result: { totalScore: 22 } }],
    currentResult: { totalScore: 22, severity: 'severe', suicidalIdeation: true },
    crisisDetection: { isTriggered: true, primaryTrigger: 'phq9_suicidal_ideation' },
    crisisIntervention: { interventionStarted: true },
    hasRecoverableSession: true,
  });
  const service = cloudBackupService as unknown as { isInitialized: boolean; lastBackupHash: string | null };
  service.isInitialized = true;
  service.lastBackupHash = null;

  const result = await cloudBackupService.createBackup();
  expect(result.success).toBe(true);

  const encryptData = EncryptionService.encryptData as jest.Mock;
  expect(encryptData).toHaveBeenCalledTimes(1);
  return JSON.parse(encryptData.mock.calls[0][0]);
}

describe('DEBUG-614 (a): the uploaded payload is exactly the disclosed field set', () => {
  it('leaf paths of the encrypted plaintext equal PAYLOAD_DISCLOSURE', async () => {
    const payload = await captureUploadedPlaintext();
    expect(leafPaths(payload).sort()).toEqual(Object.keys(PAYLOAD_DISCLOSURE).sort());
  });
});

describe('DEBUG-614 (b): whatWeCollect is exactly the disclosed labels', () => {
  it('matches the non-envelope labels, no more and no fewer', () => {
    const labels = Object.values(PAYLOAD_DISCLOSURE).filter(
      (v): v is string => typeof v === 'string'
    );
    expect(new Set(card.details.whatWeCollect)).toEqual(new Set(labels));
    expect(card.details.whatWeCollect).toHaveLength(labels.length);
  });
});

describe('DEBUG-614 (c): the card makes no claim the backup cannot keep', () => {
  it.each(CLAIM_FIELDS)('%s names no journal or mood data', (_name, text) => {
    expect(text).not.toMatch(JOURNAL_OR_MOOD);
  });

  it.each(CLAIM_FIELDS)('%s makes no cross-device or new-phone claim', (_name, text) => {
    expect(text).not.toMatch(CROSS_DEVICE);
  });

  it.each(MUST_DISCLOSE_AS_LOCAL)('whatWeDontCollect names %s', (_name, re) => {
    expect(card.details.whatWeDontCollect.some((item) => re.test(item))).toBe(true);
  });
});

describe('DEBUG-614 (d): docs describing the backup agree with it', () => {
  it('data-privacy-architecture.md names no personal-cloud destination and no export-only backup', () => {
    const text = read('docs/architecture/data-privacy-architecture.md');
    expect(text.length).toBeGreaterThan(1000);
    expect(text).not.toMatch(PERSONAL_CLOUD_DESTINATION);
    expect(text).not.toMatch(EXPORT_NOT_SYNC);
  });

  it('the DPIA does not imply wellness data leaves the device through backup', () => {
    const text = read('docs/legal/dpia-sensitive-wellness-data.md');
    const analytic = text.slice(text.search(/^## 2\. /m), text.search(/^## 8\. /m));
    expect(analytic.length).toBeGreaterThan(5000);
    expect(analytic).not.toMatch(DPIA_WELLNESS_VIA_BACKUP);
  });

  it('privacy-policy.md §4.2 still says the backup excludes mental-health data', () => {
    const text = read('docs/legal/privacy-policy.md');
    const section = text.slice(text.search(/^### 4\.2 /m), text.search(/^### 4\.3 /m));
    expect(section).toMatch(/does \*\*not\*\* back up your mental-health data/);
    expect(section).toMatch(/journal entries/);
  });
});

describe('DEBUG-614 (e): matcher integrity', () => {
  it('leafPaths flattens nested objects and treats arrays as leaves', () => {
    expect(leafPaths({ a: 1, b: { c: [1, 2], d: { e: null } } }).sort()).toEqual(['a', 'b.c', 'b.d.e']);
  });

  it('the claim matchers fire on the pre-fix card', () => {
    expect(JOURNAL_OR_MOOD.test('Journal entries (encrypted)')).toBe(true);
    expect(JOURNAL_OR_MOOD.test('Mood tracking history')).toBe(true);
    expect(CROSS_DEVICE.test('Securely sync your data across devices')).toBe(true);
    expect(
      CROSS_DEVICE.test(
        'Restore data if you get a new phone. Access your journal on tablet and phone. Automatic backup protection.'
      )
    ).toBe(true);
    expect(CROSS_DEVICE.test('End-to-end encryption. We cannot decrypt or access your synced content.')).toBe(
      true
    );
  });

  it('the doc matchers fire on the pre-fix lines', () => {
    expect(
      PERSONAL_CLOUD_DESTINATION.test(
        "| Cloud backup | Export encrypted local backup to user's cloud (iCloud/Google Drive), not our servers |"
      )
    ).toBe(true);
    expect(EXPORT_NOT_SYNC.test('   - Backup/restore is user-initiated export, not cloud sync')).toBe(true);
    expect(
      DPIA_WELLNESS_VIA_BACKUP.test(
        "Local-first storage is the primary proportionality control: sensitive wellness data does not leave the user's device unless the user opts into encrypted backup."
      )
    ).toBe(true);
  });

  it('MUST_DISCLOSE_AS_LOCAL fires on the intended wording', () => {
    const wording = ['Journal entries', 'Mood check-ins', 'PHQ-9/GAD-7 responses and scores'];
    for (const [, re] of MUST_DISCLOSE_AS_LOCAL) {
      expect(wording.some((w) => re.test(w))).toBe(true);
    }
  });
});
