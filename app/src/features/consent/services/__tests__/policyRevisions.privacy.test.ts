/**
 * FEAT-860 — policyRevisions parses the BUNDLED privacy policy.
 *
 * The app stores no policy version of its own (LegalGateConsents.version is the consent
 * schema version), so the policy document is the only source for "what is the latest
 * material change". These tests run against the real generated content, not a fixture,
 * so a wording change to the §10 marker or the header fails here instead of silently
 * emptying the notice.
 */
import { privacyPolicyContent } from '@/features/profile/content/legalContent.generated';
import {
  compareVersions,
  parsePolicyRevisions,
  getPolicyRevisions,
  pendingMaterialVersions,
} from '../policyRevisions';

describe('compareVersions — numeric per part, never string', () => {
  it('orders 1.9 < 1.24 < 1.25 < 1.29', () => {
    const ordered = ['1.9', '1.24', '1.25', '1.29'];
    for (let i = 0; i < ordered.length; i++) {
      for (let j = 0; j < ordered.length; j++) {
        expect(Math.sign(compareVersions(ordered[i], ordered[j]))).toBe(Math.sign(i - j));
      }
    }
  });

  it('is the opposite of a string compare for 1.9 vs 1.24', () => {
    expect('1.9' > '1.24').toBe(true);
    expect(compareVersions('1.9', '1.24')).toBeLessThan(0);
  });

  it('treats a missing part as zero and equal versions as 0', () => {
    expect(compareVersions('1.1', '1.1.0')).toBe(0);
    expect(compareVersions('2', '1.99')).toBeGreaterThan(0);
  });
});

describe('parsePolicyRevisions — real bundled policy', () => {
  const parsed = parsePolicyRevisions(privacyPolicyContent);

  it('reads the header version', () => {
    expect(parsed.headerVersion).toMatch(/^\d+\.\d+$/);
    const header = /\*\*Version:\*\*\s*(\S+)/.exec(privacyPolicyContent);
    expect(parsed.headerVersion).toBe(header?.[1]);
  });

  it('includes the material revisions 1.24, 1.25 and 1.29', () => {
    expect(parsed.materialVersions).toEqual(expect.arrayContaining(['1.24', '1.25', '1.29']));
  });

  it('excludes the non-material revisions 1.26, 1.27 and 1.28', () => {
    for (const v of ['1.26', '1.27', '1.28']) {
      expect(parsed.materialVersions).not.toContain(v);
    }
  });

  it('keeps every material version at or below the header version', () => {
    expect(parsed.headerVersion).not.toBeNull();
    for (const v of parsed.materialVersions) {
      expect(compareVersions(v, parsed.headerVersion as string)).toBeLessThanOrEqual(0);
    }
  });

  it('sorts ascending and names the latest', () => {
    const sorted = [...parsed.materialVersions].sort(compareVersions);
    expect(parsed.materialVersions).toEqual(sorted);
    expect(parsed.latestMaterialVersion).toBe(sorted[sorted.length - 1]);
  });

  it('getPolicyRevisions returns the same parse of the bundled content', () => {
    expect(getPolicyRevisions()).toEqual(parsed);
  });
});

describe('parsePolicyRevisions — shape cases', () => {
  const doc = (body: string, header = '**Version:** 1.3') =>
    `# Privacy Policy\n\n${header}\n\n## 10. Changes to This Policy\n\n**Recent revisions**\n\n${body}\n`;

  it('only counts bullets carrying the material marker', () => {
    const p = parsePolicyRevisions(
      doc(
        [
          '- **v1.3 (X):** note.',
          '- **v1.2 (X) — material change.** note.',
          '- **v1.1 (X):** note.',
        ].join('\n'),
      ),
    );
    expect(p.materialVersions).toEqual(['1.2']);
    expect(p.latestMaterialVersion).toBe('1.2');
  });

  it('returns no material versions and a null latest when none are marked', () => {
    const p = parsePolicyRevisions(doc('- **v1.3 (X):** note.'));
    expect(p.materialVersions).toEqual([]);
    expect(p.latestMaterialVersion).toBeNull();
  });

  it('returns a null header version when the header is absent', () => {
    expect(parsePolicyRevisions('no header here').headerVersion).toBeNull();
  });

  it('ignores the marker outside the revisions list', () => {
    const p = parsePolicyRevisions(
      `**Version:** 1.9\n\nSome prose — material change. in the body\n\n- **v1.8 (X) — material change.** elsewhere`,
    );
    expect(p.materialVersions).toEqual([]);
  });

  it('sorts numerically when the list is out of order', () => {
    const p = parsePolicyRevisions(
      doc(
        [
          '- **v1.9 (X) — material change.** a',
          '- **v1.24 (X) — material change.** b',
          '- **v1.10 (X) — material change.** c',
        ].join('\n'),
        '**Version:** 1.24',
      ),
    );
    expect(p.materialVersions).toEqual(['1.9', '1.10', '1.24']);
  });
});

describe('pendingMaterialVersions — the show predicate over versions', () => {
  const material = ['1.24', '1.25', '1.29'];

  it('absent acknowledgement shows every material version', () => {
    expect(pendingMaterialVersions(null, material)).toEqual(['1.24', '1.25', '1.29']);
  });

  it('an acknowledgement at 1.25 shows only 1.29', () => {
    expect(pendingMaterialVersions('1.25', material)).toEqual(['1.29']);
  });

  it('an acknowledgement at or above the latest material version shows nothing', () => {
    expect(pendingMaterialVersions('1.29', material)).toEqual([]);
    expect(pendingMaterialVersions('1.30', material)).toEqual([]);
  });

  it('a newer header via non-material revisions shows nothing (acknowledged at the header, 1.29 is latest material)', () => {
    // Header 1.31 reached through non-material revisions; the user acknowledged at 1.29.
    expect(pendingMaterialVersions('1.29', material)).toEqual([]);
  });

  it('compares numerically: an acknowledgement at 1.9 is older than 1.24', () => {
    expect(pendingMaterialVersions('1.9', material)).toEqual(['1.24', '1.25', '1.29']);
  });
});
