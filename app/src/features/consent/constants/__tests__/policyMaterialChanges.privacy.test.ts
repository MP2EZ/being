/**
 * FEAT-860 — the one-line summaries must cover the material revisions exactly.
 *
 * A material revision with no summary would render a bullet with no text; a summary for
 * a version that is not material would tell users about a change the policy does not
 * call material. Both directions are pinned against the parsed bundled policy.
 */
import { privacyPolicyContent } from '@/features/profile/content/legalContent.generated';
import { parsePolicyRevisions } from '../../services/policyRevisions';
import { POLICY_MATERIAL_CHANGE_SUMMARIES } from '../policyMaterialChanges';

describe('POLICY_MATERIAL_CHANGE_SUMMARIES', () => {
  const material = parsePolicyRevisions(privacyPolicyContent).materialVersions;
  const keys = Object.keys(POLICY_MATERIAL_CHANGE_SUMMARIES);

  it('has a key for every parsed material version', () => {
    expect(material.length).toBeGreaterThan(0);
    for (const v of material) expect(keys).toContain(v);
  });

  it('has no key that is not a parsed material version', () => {
    for (const k of keys) expect(material).toContain(k);
  });

  it('gives each version a single non-empty sentence', () => {
    for (const k of keys) {
      const s = POLICY_MATERIAL_CHANGE_SUMMARIES[k];
      expect(s.trim().length).toBeGreaterThan(20);
      expect(s).not.toMatch(/\n/);
      expect(s.trim()).toMatch(/[.]$/);
    }
  });
});
