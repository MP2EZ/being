/**
 * The crisis keyboard accessory guard, re-cut for inverted polarity (DEBUG-506).
 *
 * WHY THE VACUITY CASES MOVED. Under DEBUG-450's polarity the guard passed by finding
 * every <TextInput> wired, so its dangerous failure was a matcher that read a prose
 * mention as wiring — a false PASS. Under inversion the guard passes by finding NOTHING,
 * so the dangerous failure is a matcher that finds nothing because it is broken. A
 * comment mention now produces a false FAIL, which is the safe direction; a silent
 * zero-file sweep produces a false pass, which is not. Every "does it still fire" case
 * below therefore has an inverted twin asserting the sweep was not empty.
 *
 * This suite shares the script's detection logic deliberately: it runs in `precommit`,
 * where the CI job at `ci.yml:495` does not, and --no-verify is permitted on hotfix/*.
 * Neither is redundant.
 */

import {
  ALLOWLIST,
  COMPOSITE,
  findAccessoryIdSites,
  findTextInputSites,
  runGuard,
  stripComments,
} from '../../scripts/check-crisis-keyboard-accessory-guard';

describe('DEBUG-506 crisis keyboard accessory guard', () => {
  describe('the real tree', () => {
    it('renders no bare <TextInput> outside the composite', () => {
      expect(runGuard().bare).toEqual([]);
    });

    it('names inputAccessoryViewID nowhere but the composite', () => {
      // A second wiring path is how the shared id — and the first-match collision that
      // leaves every input but one uncovered — returns.
      expect(runGuard().strayIds).toEqual([]);
    });

    it('carries no allowlist entry whose file no longer renders a <TextInput>', () => {
      expect(runGuard().stale).toEqual([]);
    });

    it('actually walked the tree — an inverted guard passes by finding nothing', () => {
      // THE load-bearing vacuity check under this polarity. A broken walk reports a
      // clean tree in exactly the same words as a clean tree.
      expect(runGuard().scanned).toBeGreaterThan(100);
    });

    it('still sees the composite itself, so the walk reaches the file it exempts', () => {
      // If the walk stopped reaching COMPOSITE, rule 2 would pass for the wrong reason.
      const src = require('fs').readFileSync(
        require('path').join(__dirname, '../../', COMPOSITE),
        'utf8',
      );
      expect(findTextInputSites(src).length).toBeGreaterThan(0);
      expect(findAccessoryIdSites(src).length).toBeGreaterThan(0);
    });
  });

  describe('the detector fires on known-bad source', () => {
    it('flags a bare <TextInput>', () => {
      expect(findTextInputSites('<TextInput value={v} />')).toHaveLength(1);
    });

    it('does NOT flag <CrisisTextInput>, which is the whole point of the conversion', () => {
      // The lookahead anchors on `<` + `TextInput`. If this ever regressed, every
      // converted site would fail and the guard would be red on a correct tree.
      expect(findTextInputSites('<CrisisTextInput value={v} />')).toHaveLength(0);
    });

    it('flags a MIXED file — one converted site does not excuse the other', () => {
      // Replaces DEBUG-450's ".map() factory, second input unwired" case. That shape is
      // subsumed a fortiori under inversion, but only if a mixed file still fails.
      const src = `
        <CrisisTextInput testID="a" />
        <View><TextInput testID="b" /></View>
      `;
      expect(findTextInputSites(src)).toHaveLength(1);
    });

    it('flags a stray inputAccessoryViewID', () => {
      expect(findAccessoryIdSites('<Foo inputAccessoryViewID="x" />')).toHaveLength(1);
    });

    it('flags a stray crisisAccessoryProps() call — the OTHER wiring path', () => {
      // Matching only the raw prop would be vacuous: the composite itself uses the helper
      // and never writes the prop literally, so rule 2 would hold over a tree where a call
      // site had started calling the helper directly.
      expect(findAccessoryIdSites('<Foo {...crisisAccessoryProps(id)} />')).toHaveLength(1);
    });

    it('does not treat a mention in a COMMENT as a site', () => {
      // Under inversion this is a false-FAIL guard, not a false-pass one — but the repo
      // names both identifiers in prose constantly, including in the guard's own header.
      expect(findTextInputSites('// never render a bare <TextInput> here\n')).toHaveLength(0);
      expect(findAccessoryIdSites('/* crisisAccessoryProps() is owned by the composite */')).toHaveLength(0);
    });
  });

  describe('stripComments', () => {
    it('preserves line structure so reported line numbers stay true', () => {
      const src = 'a\n/* x\ny */\nb\n';
      expect(stripComments(src).split('\n')).toHaveLength(src.split('\n').length);
    });

    it('leaves enough source to scan — a total blanking would be vacuous', () => {
      // Pairs with the comment case above: comment-stripping plus a narrow matcher is
      // exactly the combination that can silently match nothing at all.
      const src = 'const a = 1; // note\n<TextInput />\n';
      const stripped = stripComments(src);
      expect(stripped.trim().length).toBeGreaterThan(10);
      expect(findTextInputSites(stripped)).toHaveLength(1);
    });
  });

  it('exposes an allowlist that is an object (the audit trail, possibly empty)', () => {
    expect(typeof ALLOWLIST).toBe('object');
    expect(ALLOWLIST).not.toBeNull();
  });
});
